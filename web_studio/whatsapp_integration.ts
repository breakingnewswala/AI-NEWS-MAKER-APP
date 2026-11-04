import { createHmac, createHash, timingSafeEqual, randomBytes, randomUUID } from "crypto";
import { GoogleGenAI } from "@google/genai";
// Lazy-loaded GCP Cloud Tasks and Auth clients for resilience across dev, test, and container environments
let CloudTasksClientClass: any = null;
try {
  CloudTasksClientClass = require("@google-cloud/tasks")?.CloudTasksClient || null;
} catch {}

let OAuth2ClientClass: any = null;
try {
  OAuth2ClientClass = require("google-auth-library")?.OAuth2Client || null;
} catch {}

/**
 * WhatsApp Cloud API webhook foundation.
 * Secrets are supplied only through server runtime environment variables.
 * Firestore collections used here are server-side only:
 * whatsapp_webhook_events, whatsapp_messages, whatsapp_conversations,
 * whatsapp_knowledge_base, whatsapp_subscribers, whatsapp_link_requests, users.
 */

export const maskWaId = (id: string): string => {
  const str = String(id || "").trim();
  if (!str) return "[unknown]";
  if (str.length <= 4) return str;
  return `...${str.slice(-4)}`;
};

// Rate limiter store: Map<cleanPhone, { lastSent: number, countInHour: number, hourStart: number }>
const otpRateLimits = new Map<string, { lastSent: number; countInHour: number; hourStart: number }>();
// In-memory verification cache for fast lookup and dev fallback
const otpVerificationCache = new Map<string, any>();

export function registerWhatsAppIntegration(app: any, centralDb: any) {
  const webhookPath = "/api/whatsapp/webhook";

  const safeEqual = (a: string, b: string) => {
    const left = Buffer.from(String(a || ""));
    const right = Buffer.from(String(b || ""));
    return left.length === right.length && timingSafeEqual(left, right);
  };

  const sha256 = (value: string) =>
    createHash("sha256").update(value).digest("hex");

  const requireWrite = async (collection: string, docId: string, data: any) => {
    const result = await centralDb.writeDoc(collection, docId, data);
    if (!result?.success) {
      throw new Error(`Firestore write failed for ${collection}/${docId} (${result?.statusCode || "unknown"})`);
    }
    return result;
  };

  // Atomically claim an inbound event so concurrent Cloud Tasks retries
  // cannot process the same WhatsApp message at the same time.
  const claimInboundEvent = async (eventId: string, messageId: string) => {
    const tx = await centralDb.beginTransaction();
    if (!tx?.success || !tx.transaction) throw new Error("Could not start Firestore transaction");
    try {
      const current = await centralDb._readDocInTransaction("whatsapp_webhook_events", eventId, tx.transaction);
      if (!current?.success) throw new Error("Could not read WhatsApp event in transaction");
      const now = Date.now();
      if (current.data?.status === "processed") {
        await centralDb.rollbackTransaction(tx.transaction);
        return "processed";
      }
      if (current.data?.status === "processing" && Number(current.data?.leaseUntil || 0) > now) {
        await centralDb.rollbackTransaction(tx.transaction);
        return "busy";
      }
      const record = {
        messageId,
        status: "processing",
        processingAt: now,
        leaseUntil: now + 5 * 60 * 1000,
      };
      const fields: any = {};
      for (const [key, value] of Object.entries(record)) fields[key] = centralDb._toFirestoreField(value);
      const name = `projects/${centralDb.projectId}/databases/${centralDb.databaseId}/documents/whatsapp_webhook_events/${eventId}`;
      const write: any = { update: { name, fields } };
      write.currentDocument = current.updateTime
        ? { updateTime: current.updateTime }
        : { exists: false };
      const committed = await centralDb.commitTransaction(tx.transaction, [write]);
      if (!committed?.success) throw new Error("Could not claim WhatsApp event transactionally");
      return "claimed";
    } catch (error) {
      await centralDb.rollbackTransaction(tx.transaction);
      throw error;
    }
  };

  const verifySignature = (req: any) => {
    const appSecret = process.env.META_APP_SECRET;
    const signature = String(req.headers["x-hub-signature-256"] || "");
    const rawBody = String(req.rawBody || "");
    if (!appSecret || !signature.startsWith("sha256=") || !rawBody) return false;
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
    return safeEqual(signature, expected);
  };

  const sendWhatsAppText = async (to: string, body: string) => {
    const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "1474022642460639").trim();
    const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
    const maskedTo = maskWaId(to);

    if (!token) {
      console.error("[WhatsApp:Outbound] CONFIG_MISSING: WHATSAPP_ACCESS_TOKEN is not configured in server environment");
      throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    }
    if (!phoneNumberId) {
      console.error("[WhatsApp:Outbound] CONFIG_MISSING: WHATSAPP_PHONE_NUMBER_ID is not configured");
      throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
    }

    if (process.env.NODE_ENV === "test" || token.startsWith("test_")) {
      console.log(`[WhatsApp:Outbound:TestMode] Mock send to ${maskedTo}`);
      return { messaging_product: "whatsapp", contacts: [{ input: to, wa_id: to }], messages: [{ id: `wamid.test_${Date.now()}` }] };
    }
    console.log(`[WhatsApp:Outbound] WhatsApp outbound request started to ${maskedTo} via Graph API ${version}`);
    let response: any;
    try {
      response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: String(body).slice(0, 4000) },
        }),
      });
    } catch (networkErr: any) {
      console.error("[WhatsApp:Outbound] WHATSAPP_API_ERROR: Network request failed:", String(networkErr?.message || networkErr).slice(0, 200));
      throw networkErr;
    }

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = (result as any)?.error?.message || `WhatsApp API request failed (${response.status})`;
      console.error(`[WhatsApp:Outbound] WHATSAPP_API_ERROR: HTTP ${response.status} - ${errorMsg}`);
      if (response.status === 401 || (result as any)?.error?.code === 190) {
        console.error(`[WhatsApp:Outbound] CRITICAL_AUTH_FAILURE: Meta Access Token is expired or invalid (Code 190). Update Secret Manager WHATSAPP_ACCESS_TOKEN with a permanent System User Token.`);
      }
      throw new Error(`WHATSAPP_API_ERROR: ${errorMsg}`);
    }

    console.log(`[WhatsApp:Outbound] WhatsApp API response received: messageId=${result?.messages?.[0]?.id || "unknown"}`);
    return result;
  };

  const sendWhatsAppOtpMessage = async (to: string, otpCode: string, validityMinutes: number = 5) => {
    const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "1474022642460639").trim();
    const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
    const templateName = (process.env.WHATSAPP_OTP_TEMPLATE || "profile_otp").trim();
    const templateLang = (process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en_US").trim();
    const maskedTo = maskWaId(to);

    const fallbackTextMessage = `🔐 *AI NEWS MAKER - WhatsApp सत्यापन OTP*\n\nआपका 6-अंकों का वेरिफिकेशन कोड है: *${otpCode}*\n\nयह कोड ${validityMinutes} मिनट के लिए वैध है। सुरक्षा कारणों से यह OTP किसी के साथ साझा न करें।\n\n— AI News Maker (ainewsmaker.online)`;

    if (!token || !phoneNumberId) {
      console.warn("[WhatsApp:OTP] Credentials missing, delegating to sendWhatsAppText to log config missing error");
      return await sendWhatsAppText(to, fallbackTextMessage);
    }

    // Attempt sending via Meta Authentication Template 'profile_otp'
    try {
      console.log(`[WhatsApp:OTP] Attempting to send OTP via Meta template '${templateName}' (${templateLang}) to ${maskedTo}`);
      const payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLang },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: String(otpCode) },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                { type: "text", text: String(otpCode) }
              ]
            }
          ]
        }
      };

      const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (response.ok && result?.messages?.[0]?.id) {
        console.log(`[WhatsApp:OTP] Template OTP sent successfully via '${templateName}': id=${result.messages[0].id}`);
        return result;
      }

      console.warn(`[WhatsApp:OTP] Meta Template '${templateName}' request returned HTTP ${response.status}:`, JSON.stringify(result?.error || result));
      if (response.status === 401 || (result as any)?.error?.code === 190) {
        return await sendWhatsAppText(to, fallbackTextMessage);
      }
      console.log("[WhatsApp:OTP] Gracefully falling back to direct formatted text message...");
    } catch (templateErr: any) {
      console.warn("[WhatsApp:OTP] Template send threw exception:", templateErr?.message, "- falling back to direct text");
    }

    return await sendWhatsAppText(to, fallbackTextMessage);
  };

  const getKnowledgeContext = async (): Promise<{ context: string; count: number; errorCategory?: string }> => {
    if (!centralDb?.useFirestore) {
      console.warn("[WhatsApp:KnowledgeBase] FIRESTORE_CONNECTION_ERROR: Firestore is disabled on centralDb");
      return { context: "", count: 0, errorCategory: "FIRESTORE_CONNECTION_ERROR" };
    }
    console.log(`[WhatsApp:KnowledgeBase] Firestore database ID verified: ${centralDb.databaseId || "default"}`);
    console.log("[WhatsApp:KnowledgeBase] Knowledge Base query started on collection: whatsapp_knowledge_base");

    let result: any;
    try {
      result = await centralDb.listDocs("whatsapp_knowledge_base", 100);
    } catch (err: any) {
      console.error("[WhatsApp:KnowledgeBase] KNOWLEDGE_BASE_READ_ERROR:", String(err?.message || err).slice(0, 200));
      return { context: "", count: 0, errorCategory: "KNOWLEDGE_BASE_READ_ERROR" };
    }

    if (!result?.success || !Array.isArray(result.documents)) {
      console.warn("[WhatsApp:KnowledgeBase] KNOWLEDGE_BASE_READ_ERROR: listDocs returned failure or non-array");
      return { context: "", count: 0, errorCategory: "KNOWLEDGE_BASE_READ_ERROR" };
    }

    console.log(`[WhatsApp:KnowledgeBase] Knowledge Base documents retrieved: ${result.documents.length}`);
    const activeDocs = result.documents.filter((item: any) => item && item.isActive !== false && item.status !== "disabled");
    console.log(`[WhatsApp:KnowledgeBase] Number of active FAQ documents: ${activeDocs.length}`);
    if (activeDocs.length === 0) {
      console.warn("[WhatsApp:KnowledgeBase] KNOWLEDGE_BASE_EMPTY: No active FAQ documents found in whatsapp_knowledge_base");
      return { context: "", count: 0, errorCategory: "KNOWLEDGE_BASE_EMPTY" };
    }

    const context = activeDocs
      .map((item: any) => {
        const title = String(item.title || item.question || "").trim();
        const content = String(item.content || item.answer || item.description || "").trim();
        return title && content ? `प्रश्न/विषय: ${title}\nउत्तर/जानकारी: ${content}` : content || title;
      })
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 14000);

    console.log(`[WhatsApp:KnowledgeBase] Knowledge context generated (${context.length} chars)`);
    return { context, count: activeDocs.length };
  };

  const generateSupportReply = async (userMessage: string): Promise<{ reply: string | null; reason?: string; errorCategory?: string }> => {
    // Check both standard GEMINI_API_KEY and hyphenated GEMINI_API-KEY from Cloud Run secrets
    const apiKey = (process.env.GEMINI_API_KEY || process.env["GEMINI_API-KEY"] || "").trim();
    // Default to gemini-3.5-flash which is active, supported, and free of 404/deprecation errors
    const configuredModel = (process.env.WHATSAPP_GEMINI_MODEL || "gemini-3.5-flash").trim();
    // Normalize deprecated 2.5 models to 3.5-flash to prevent 404 ApiErrors
    const model = (configuredModel === "gemini-2.5-flash" || configuredModel === "gemini-2.0-flash") ? "gemini-3.5-flash" : configuredModel;

    if (!apiKey) {
      console.warn("[WhatsApp:Gemini] CONFIG_MISSING: Neither GEMINI_API_KEY nor GEMINI_API-KEY is set");
      return { reply: null, reason: "gemini_key_missing", errorCategory: "CONFIG_MISSING" };
    }
    if (!model) {
      console.warn("[WhatsApp:Gemini] CONFIG_MISSING: WHATSAPP_GEMINI_MODEL is not configured");
      return { reply: null, reason: "gemini_model_missing", errorCategory: "CONFIG_MISSING" };
    }

    const { context: knowledge, errorCategory: kbErr } = await getKnowledgeContext();
    if (kbErr || !knowledge) {
      return { reply: null, reason: kbErr === "KNOWLEDGE_BASE_EMPTY" ? "knowledge_gap" : "kb_read_error", errorCategory: kbErr || "KNOWLEDGE_BASE_EMPTY" };
    }

    console.log(`[WhatsApp:Gemini] Gemini API request started with model: ${model}`);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: [
          "आप BREAKING NEWS WALA / AI NEWS MAKER के ग्राहक सहायता सहायक हैं। केवल नीचे दिए गए आधिकारिक ज्ञान-आधार से उत्तर दें। कोई तथ्य, मूल्य, सुविधा, स्थिति, समय-सीमा या नीति न गढ़ें। यदि उत्तर ज्ञान-आधार में नहीं है, तो बिल्कुल HUMAN_HANDOFF लिखें। उत्तर शुद्ध, सरल हिंदी में 2-5 वाक्यों का हो। पासवर्ड, OTP, भुगतान कार्ड, API token या गोपनीय जानकारी कभी न माँगें। ग्राहक की ओर से भुगतान, रिफंड, खाता परिवर्तन या कोई संवेदनशील कार्रवाई स्वयं न करें।",
          "आधिकारिक ज्ञान-आधार:\n" + knowledge,
          "ग्राहक का संदेश:\n" + userMessage,
        ].join("\n\n"),
      });

      console.log("[WhatsApp:Gemini] Gemini API response received");
      const answer = String(response.text || "").trim();
      if (!answer) {
        console.warn("[WhatsApp:Gemini] GEMINI_EMPTY_RESPONSE: Model returned empty text");
        return { reply: null, reason: "gemini_empty_response", errorCategory: "GEMINI_EMPTY_RESPONSE" };
      }
      if (answer.includes("HUMAN_HANDOFF")) {
        console.log("[WhatsApp:Gemini] Human handoff triggered: model signaled question outside knowledge base");
        return { reply: null, reason: "knowledge_gap" };
      }
      console.log(`[WhatsApp:Gemini] AI reply generated (${answer.length} chars)`);
      return { reply: answer.slice(0, 3500) };
    } catch (error: any) {
      const errMsg = String(error?.message || error);
      console.error("[WhatsApp:Gemini] GEMINI_API_ERROR:", errMsg.slice(0, 200));
      if (knowledge && knowledge.length > 20) {
        console.log("[WhatsApp:Gemini] Falling back to direct Knowledge Base match");
        return { reply: `AI News Maker सहायता केंद्र से जानकारी:\n\n${knowledge.slice(0, 1000)}` };
      }
      return { reply: null, reason: "gemini_api_error", errorCategory: "GEMINI_API_ERROR" };
    }
  };

  const processInboundMessage = async (message: any) => {
    const waId = String(message.from || "").trim();
    const messageId = String(message.id || "").trim();
    if (!waId || !messageId) {
      console.warn("[WhatsApp:Inbound] CONFIG_MISSING: Inbound message missing from or id");
      return;
    }
    if (!centralDb?.useFirestore) {
      console.error("[WhatsApp:Inbound] FIRESTORE_CONNECTION_ERROR: Central Firestore is unavailable");
      throw new Error("FIRESTORE_CONNECTION_ERROR: Central Firestore is unavailable");
    }

    const maskedWa = maskWaId(waId);
    console.log(`[WhatsApp:Inbound] Inbound message received: id=${messageId}, from=${maskedWa}, type=${message.type || "unknown"}`);
    const textBody = message.type === "text" ? String(message.text?.body || "").trim() : "";
    const messageDocId = sha256(messageId);
    const conversationId = sha256(waId);
    const now = Date.now();

    await requireWrite("whatsapp_messages", messageDocId, {
      messageId,
      conversationId,
      waId,
      direction: "inbound",
      messageType: String(message.type || "unknown"),
      text: textBody,
      timestamp: Number(message.timestamp || Math.floor(now / 1000)) * 1000,
      createdAt: now,
      status: "received",
    });

    await requireWrite("whatsapp_conversations", conversationId, {
      waId,
      channel: "whatsapp",
      lastInboundAt: now,
      lastMessagePreview: textBody.slice(0, 180) || `[${message.type || "message"}]`,
      status: "open",
      updatedAt: now,
    });

    if (textBody.toUpperCase() === "STOP" || textBody.toUpperCase() === "UNSUBSCRIBE") {
      console.log(`[WhatsApp:Inbound] STOP/UNSUBSCRIBE received from ${maskedWa}`);
      await requireWrite("whatsapp_subscribers", conversationId, {
        waId,
        newsAlertsConsent: false,
        newsAlertsOptedOutAt: now,
        updatedAt: now,
      });
      const optOutReply = "आपकी WhatsApp समाचार सूचनाएँ बंद कर दी गई हैं। ग्राहक सहायता के लिए आप हमें संदेश भेज सकते हैं।";
      const sent = await sendWhatsAppText(waId, optOutReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: optOutReply, timestamp: now, status: "sent",
      });
      console.log(`[WhatsApp:Outbound] Outbound Firestore record saved: ${outMsgId}`);
      return;
    }

    const wantsHuman = /\b(agent|human|person|support)\b|मानव|व्यक्ति|प्रतिनिधि|कस्टमर केयर|सहायता टीम/i.test(textBody);
    if (wantsHuman) {
      console.log("[WhatsApp:Inbound] Human handoff triggered, with exact reason: user_request");
      await requireWrite("whatsapp_conversations", conversationId, {
        waId, status: "human_requested", humanHandoff: true, handoffRequestedAt: now, handoffReason: "user_request", updatedAt: now,
      });
      const handoffReply = "आपका अनुरोध हमारी सहायता टीम को भेज दिया गया है। कृपया यहीं प्रतीक्षा करें, टीम का सदस्य आपसे संपर्क करेगा।";
      const sent = await sendWhatsAppText(waId, handoffReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: handoffReply, timestamp: now, status: "sent",
      });
      console.log(`[WhatsApp:Outbound] Outbound Firestore record saved: ${outMsgId}`);
      return;
    }

    // --- USER CONSENT & ONBOARDING PREFERENCE HANDLER ---
    const isConsent1 = /^\s*1\s*$/i.test(textBody) || /फीचर्स|अपडेट|feature|update/i.test(textBody);
    const isConsent2 = /^\s*2\s*$/i.test(textBody) || /ब्रेकिंग|समाचार|breaking|news alert/i.test(textBody);
    const isConsent3 = /^\s*3\s*$/i.test(textBody) || /प्रोफाइल|अकाउंट|profile|account/i.test(textBody);
    const isConsentAll = /^\s*(सभी|all|yes|हाँ|हा|ok)\s*$/i.test(textBody);

    if (isConsent1 || isConsent2 || isConsent3 || isConsentAll) {
      console.log(`[WhatsApp:Consent] User preference selected from ${maskedWa}: ${textBody}`);
      const updates: any = {
        waId,
        updatedAt: now,
        whatsappConsentAt: now,
        whatsappConsentSource: "whatsapp_chat",
      };

      if (isConsentAll) {
        updates.whatsappProductUpdatesConsent = true;
        updates.whatsappBreakingNewsConsent = true;
        updates.whatsappProfileAssistanceEnabled = true;
        updates.newsAlertsConsent = true;
      } else {
        if (isConsent1) updates.whatsappProductUpdatesConsent = true;
        if (isConsent2) {
          updates.whatsappBreakingNewsConsent = true;
          updates.newsAlertsConsent = true;
        }
        if (isConsent3) updates.whatsappProfileAssistanceEnabled = true;
      }

      await requireWrite("whatsapp_subscribers", conversationId, updates).catch(() => {});

      if (centralDb?.cache?.users) {
        for (const [em, u] of centralDb.cache.users.entries()) {
          const uWa = (u.whatsappNumber || u.primaryPhone || u.mobileNumber || "").replace(/\D/g, "").slice(-10);
          const curWa = waId.replace(/\D/g, "").slice(-10);
          if (uWa && curWa && uWa === curWa) {
            await centralDb.writeDoc("users", em, { ...u, ...updates }).catch(() => {});
          }
        }
      }

      const prefAckReply = isConsentAll
        ? "✅ धन्यवाद! आपकी सभी प्राथमिकताएँ (फीचर्स, ब्रेकिंग न्यूज़, प्रोफाइल सहायता) सफलतापूर्वक सक्रिय कर दी गई हैं। आप किसी भी समय 'STOP' लिखकर इन्हें बंद कर सकते हैं।"
        : `✅ धन्यवाद! आपकी प्राथमिकता (${isConsent1 ? "फीचर्स अपडेट " : ""}${isConsent2 ? "ब्रेकिंग न्यूज़ " : ""}${isConsent3 ? "प्रोफाइल सहायता " : ""}) सफलतापूर्वक दर्ज कर ली गई है।`;

      const sent = await sendWhatsAppText(waId, prefAckReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `pref-ack-${now}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: prefAckReply, timestamp: now, status: "sent",
      }).catch(() => {});
      return;
    }

    // --- GREETING AND INSTANT WELCOME HANDLER ---
    const isGreeting = /^\s*(hi|hello|hey|namaste|namaskar|नमस्ते|नमस्कार|हैलो|हाय|हॅलो)\s*$/i.test(textBody);
    if (isGreeting) {
      console.log(`[WhatsApp:Inbound] Greeting received from ${maskedWa}`);
      const greetingReply = `🙏 *नमस्कार! AI News Maker (BREAKING NEWS WALA) में आपका स्वागत है।*

हम पत्रकारों और डिजिटल मीडिया के लिए भारत का अग्रणी AI-पावर्ड न्यूज़ ग्राफिक व वीडियो स्टूडियो हैं।

बताइए, हम आपकी क्या सहायता कर सकते हैं? आप निम्न में से कोई भी विषय लिख सकते हैं:
1️⃣ *AI News Maker क्या है?*
2️⃣ *इसकी सेवाएँ क्या हैं?*
3️⃣ *ग्राफिक कैसे बनाएँ?*
4️⃣ *वीडियो कैसे बनाएँ?*
5️⃣ *मेरा प्लान* (प्लान व वैधता)
6️⃣ *कोटा* (आज के शेष ग्राफिक)
7️⃣ *वॉलेट* (कॉइन्स बैलेंस)
8️⃣ *अकाउंट* (प्रोफाइल विवरण)

🌐 वेबसाइट: https://ainewsmaker.online`;

      const sent = await sendWhatsAppText(waId, greetingReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: greetingReply, timestamp: now, status: "sent",
      });
      return;
    }

    // --- DIRECT FAQ PRE-MATCHER ---
    const isWhatIsNewsMaker = /क्या है|what is ai news maker|ai news maker kya hai/i.test(textBody);
    const isServicesQuery = /सेवाएँ|सुविधाएँ|services|features|सुविधाएं/i.test(textBody);
    const isHowToGraphic = /ग्राफिक कैसे|graphic kaise|how to make graphic/i.test(textBody);
    const isHowToVideo = /वीडियो कैसे|video kaise|how to make video/i.test(textBody);

    if (isWhatIsNewsMaker && !isServicesQuery) {
      console.log(`[WhatsApp:Inbound] FAQ 'what is news maker' matched from ${maskedWa}`);
      const faqReply = `📰 *AI News Maker (BREAKING NEWS WALA) क्या है?*

AI News Maker भारत का पहला विशेष AI-पावर्ड डिजिटल न्यूज़ स्टूडियो है, जिसे पत्रकारों, न्यूज़ पोर्टल्स, सोशल मीडिया क्रिएटर्स और मीडिया हाउसों के लिए डिज़ाइन किया गया है।

इसके माध्यम से आप बिना किसी ग्राफिक डिज़ाइनर के केवल 7 चरणों में ब्रेकिंग न्यूज़, टीवी स्टाइल न्यूज़ ग्राफिक्स, AI हेडलाइंस, वॉइसओवर और 4K/HD वीडियो न्यूज़ रील्स तैयार कर सकते हैं।

🌐 वेबसाइट: https://ainewsmaker.online`;

      const sent = await sendWhatsAppText(waId, faqReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: faqReply, timestamp: now, status: "sent",
      });
      return;
    }

    if (isServicesQuery) {
      console.log(`[WhatsApp:Inbound] FAQ 'services' matched from ${maskedWa}`);
      const servicesReply = `⚡ *AI News Maker की मुख्य सेवाएँ:*

1. *7-Step Quick News Maker*: टीवी चैनल जैसे 50+ रेडी-टू-यूज़ न्यूज़ फ्रेम्स।
2. *AI हेडलाइन व बुलेटिन जेनरेटर*: खबरों के लिए आकर्षक और वायरल हेडलाइंस।
3. *AI वीडियो स्टूडियो व रील्स*: ऑटो वॉइसओवर व डायनामिक एनिमेशन के साथ वीडियो न्यूज़।
4. *e-Paper & सोशल मीडिया पोस्ट*: Facebook, Instagram, Twitter और WhatsApp के लिए परफेक्ट साइज।
5. *कस्टम चैनल ब्रांडिंग*: आपका चैनल लोगो, नाम, फॉन्ट और कलर्स।

🌐 अधिक जानकारी: https://ainewsmaker.online/#features`;

      const sent = await sendWhatsAppText(waId, servicesReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: servicesReply, timestamp: now, status: "sent",
      });
      return;
    }

    if (isHowToGraphic) {
      console.log(`[WhatsApp:Inbound] FAQ 'how to graphic' matched from ${maskedWa}`);
      const graphicReply = `🎨 *AI News Maker पर ग्राफिक कैसे बनाएँ:*

1. https://ainewsmaker.online पर जाएँ और लॉगिन करें।
2. 'स्टूडियो' टैब पर क्लिक करें।
3. 50+ टीवी फ्रेम्स में से अपना पसंदीदा टेम्पलेट चुनें।
4. खबर की हेडलाइन और मुख्य विवरण दर्ज करें (या AI हेडलाइन का उपयोग करें)।
5. अपनी इमेज अपलोड करें और क्रॉप करें।
6. 'डाउनलोड' पर क्लिक करें — आपका HD न्यूज़ ग्राफिक तुरंत तैयार!`;

      const sent = await sendWhatsAppText(waId, graphicReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: graphicReply, timestamp: now, status: "sent",
      });
      return;
    }

    if (isHowToVideo) {
      console.log(`[WhatsApp:Inbound] FAQ 'how to video' matched from ${maskedWa}`);
      const videoReply = `🎬 *AI News Maker पर वीडियो कैसे बनाएँ:*

1. https://ainewsmaker.online पर 'वीडियो एंड रील्स' सेक्शन में जाएँ।
2. अपनी खबर का टेक्स्ट पेस्ट करें।
3. AI वॉइसओवर (हिंदी आवाज़) चुनें।
4. न्यूज़ विजुअल्स / इमेज जोड़ें।
5. 'वीडियो जनरेट करें' पर क्लिक करें — आपकी टीवी-स्टाइल न्यूज़ रील तैयार!

_नोट: वीडियो स्टूडियो एडवांस, प्रो और वीआईपी डेस्क प्लान में उपलब्ध है।_`;

      const sent = await sendWhatsAppText(waId, videoReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: videoReply, timestamp: now, status: "sent",
      });
      return;
    }

    // --- TASK 1: ONE-TIME 6-DIGIT WHATSAPP ACCOUNT LINKING HANDLER ---
    const codeMatch = textBody.match(/^\s*(\d{6})\s*$/);
    if (codeMatch) {
      const code = codeMatch[1];
      console.log(`[WhatsApp:Link] 6-digit linking code candidate received from ${maskedWa}`);
      
      let matchedRequest: any = null;
      let matchedReqId = "";
      
      try {
        const linkReqsRes = await centralDb.listDocs("whatsapp_link_requests", 100);
        const docs = linkReqsRes?.documents || [];
        for (const doc of docs) {
          if (doc.status === "pending" && doc.expiresAt && doc.expiresAt > now) {
            const candidateHash = createHash("sha256").update(code + (doc.salt || "")).digest("hex");
            if (candidateHash === doc.codeHash) {
              matchedRequest = doc;
              matchedReqId = doc.id || doc.docId;
              break;
            }
          }
        }
      } catch (err: any) {
        console.error("[WhatsApp:Link] Error reading link requests:", err.message);
      }

      if (matchedRequest) {
        const targetEmail = (matchedRequest.email || "").toLowerCase().trim();
        
        // Anti-overwriting: Check if waId is already linked to another active account
        let conflictUser: any = null;
        for (const u of centralDb.cache.users.values()) {
          const uEmail = (u.email || "").toLowerCase().trim();
          if (u.linkedWhatsAppWaId === waId && u.whatsappLinkStatus === "linked" && uEmail !== targetEmail) {
            conflictUser = u;
            break;
          }
        }

        if (conflictUser) {
          console.warn(`[WhatsApp:Link] waId ${maskedWa} is already linked to ${conflictUser.email}`);
          const conflictReply = `⚠️ यह WhatsApp नंबर पहले से किसी अन्य AI NEWS MAKER अकाउंट (${maskWaId(conflictUser.email)}) से लिंक है।\n\nएक WhatsApp नंबर को एक समय में केवल एक ही अकाउंट से जोड़ा जा सकता है। कृपया पहले उस अकाउंट से इसे अनलिंक करें।`;
          const sent = await sendWhatsAppText(waId, conflictReply);
          const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
          await requireWrite("whatsapp_messages", sha256(outMsgId), {
            conversationId, waId, direction: "outbound", text: conflictReply, timestamp: Date.now(), status: "sent",
          });
          return;
        }

        // Mark link request as verified
        await requireWrite("whatsapp_link_requests", matchedReqId, {
          ...matchedRequest,
          status: "verified",
          verifiedAt: now,
          verifiedWaId: waId,
        });

        // Update user profile in Firestore
        const existingUserDoc = await centralDb.readDoc("users", targetEmail);
        const uData = existingUserDoc?.data || {};
        const updatedUser = {
          ...uData,
          email: targetEmail,
          linkedWhatsAppWaId: waId,
          whatsappVerified: true,
          whatsappVerifiedAt: now,
          whatsappLinkStatus: "linked",
          whatsappNumber: waId,
          updatedAt: now,
        };
        await requireWrite("users", targetEmail, updatedUser);

        // Update cache
        if (centralDb.cache?.users) {
          centralDb.cache.users.set(targetEmail, updatedUser);
        }

        console.log(`[WhatsApp:Link] Successfully linked waId ${maskedWa} to account ${targetEmail}`);

        const linkSuccessReply = `🎉 *बधाई हो! आपका WhatsApp अकाउंट लिंक हो गया है।*

• अकाउंट ईमेल: *${targetEmail}*
• WhatsApp नंबर: *${maskWaId(waId)}*
• स्थिति: *सत्यापित (Verified) ✅*

अब आप कभी भी यहाँ निम्नलिखित लिखकर अपनी जानकारी सीधे प्राप्त कर सकते हैं:
• *'मेरा प्लान'* - वर्तमान प्लान व वैधता
• *'कोटा'* - आज के शेष ग्राफिक डाउनलोड
• *'वॉलेट'* - कॉइन्स बैलेंस
• *'अकाउंट'* - प्रोफाइल व चैनल विवरण`;

        const sent = await sendWhatsAppText(waId, linkSuccessReply);
        const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
        await requireWrite("whatsapp_messages", sha256(outMsgId), {
          conversationId, waId, direction: "outbound", text: linkSuccessReply, timestamp: Date.now(), status: "sent",
        });
        return;
      } else {
        // Invalid or expired code
        console.warn(`[WhatsApp:Link] Code candidate invalid or expired from ${maskedWa}`);
        const invalidReply = `⚠️ *अमान्य अथवा समाप्त हो चुका लिंकिंग कोड*

आपका दर्ज किया गया 6-अंकों का कोड अमान्य है या उसकी 10 मिनट की वैधता समाप्त हो चुकी है।

कृपया https://ainewsmaker.online पर प्रोफाइल सेक्शन में जाकर नया 6-अंकों का कोड जनरेट करें।`;
        const sent = await sendWhatsAppText(waId, invalidReply);
        const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
        await requireWrite("whatsapp_messages", sha256(outMsgId), {
          conversationId, waId, direction: "outbound", text: invalidReply, timestamp: Date.now(), status: "sent",
        });
        return;
      }
    }

    // --- TASK 4: DETERMINISTIC PRIVATE ACCOUNT & QUOTA HANDLER ---
    const isPlanQuery = /\b(plan|membership|subscription)\b|मेरा प्लान|प्लान क्या है|प्लान विवरण|सब्सक्रिप्शन|मेंबरशिप/i.test(textBody);
    const isQuotaQuery = /\b(quota|limit|download|downloads)\b|कोटा|दैनिक सीमा|कितने ग्राफिक|शेष ग्राफिक|आज कितने|डाउनलोड सीमा/i.test(textBody);
    const isWalletQuery = /\b(wallet|coins|coin|balance)\b|वॉलेट|कॉइन्स|पॉइंट्स|बैलेंस|सिक्के/i.test(textBody);
    const isAccountQuery = /\b(account|profile|status)\b|मेरा अकाउंट|my account|अकाउंट विवरण|मेरी प्रोफाइल|प्रोफाइल विवरण|खाता विवरण|स्टेटस/i.test(textBody);

    if (isPlanQuery || isQuotaQuery || isWalletQuery || isAccountQuery) {
      console.log(`[WhatsApp:AccountQuery] Private info query matched from ${maskedWa}: text="${textBody.slice(0, 40)}"`);

      // Find user linked to waId
      let linkedUser: any = null;
      for (const u of centralDb.cache.users.values()) {
        if (u.linkedWhatsAppWaId === waId && u.whatsappLinkStatus === "linked") {
          linkedUser = u;
          break;
        }
      }

      if (!linkedUser) {
        try {
          const uRes = await centralDb.listDocs("users", 100);
          for (const u of uRes?.documents || []) {
            if (u.linkedWhatsAppWaId === waId && u.whatsappLinkStatus === "linked") {
              linkedUser = u;
              break;
            }
          }
        } catch {}
      }

      if (!linkedUser) {
        console.log(`[WhatsApp:AccountQuery] waId ${maskedWa} is not linked to any account; sending unlinked guidance`);
        const unlinkedReply = `🔒 *अकाउंट लिंक नहीं है*

आपका यह WhatsApp नंबर किसी AI NEWS MAKER अकाउंट से लिंक नहीं है।

निजी अकाउंट, प्लान व दैनिक कोटा देखने के लिए:
1. https://ainewsmaker.online पर लॉगिन करें।
2. 'प्रोफाइल' सेक्शन में 'WhatsApp अकाउंट लिंक करें' पर जाएं।
3. प्राप्त 6-अंकों का कोड यहाँ भेजें।

_सामान्य सहायता व जानकारी के लिए आप अपना प्रश्न पूछ सकते हैं।_`;

        const sent = await sendWhatsAppText(waId, unlinkedReply);
        const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
        await requireWrite("whatsapp_messages", sha256(outMsgId), {
          conversationId, waId, direction: "outbound", text: unlinkedReply, timestamp: Date.now(), status: "sent",
        });
        return;
      }

      // User is verified and linked! Fetch authoritative real-time data
      const userEmail = (linkedUser.email || "").toLowerCase().trim();
      const planName = linkedUser.planName || "BASIC";
      const tier = (linkedUser.tier || "basic").toLowerCase();
      const isPaid = Boolean(linkedUser.hasActivePaidPlan);
      const isSuper = linkedUser.role === "superadmin" || linkedUser.role === "admin";

      // 1. Quota determination
      let maxAllowed = 10;
      if (isSuper) {
        maxAllowed = 99999;
      } else if (tier === "ultra" || tier === "vip" || tier === "vip_desk") {
        maxAllowed = 99999;
      } else if (tier === "professional" || tier === "pro") {
        maxAllowed = 50;
      } else if (tier === "advanced" || tier === "advance") {
        maxAllowed = 25;
      } else {
        maxAllowed = 10;
      }

      const todayStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const dailyDocId = `${userEmail}_${todayStr}`;
      let downloadsToday = 0;
      try {
        const dRes = await centralDb.readDoc("daily_graphic_downloads", dailyDocId);
        if (dRes?.success && dRes.data) {
          downloadsToday = Number(dRes.data.count || 0);
        }
      } catch {}
      const remainingToday = Math.max(0, maxAllowed - downloadsToday);

      // 2. Wallet balance
      let coinBalance = 0;
      let pendingCoins = 0;
      try {
        const wRes = await centralDb.readDoc("wallets", userEmail);
        if (wRes?.success && wRes.data) {
          coinBalance = Number(wRes.data.coinBalance || 0);
          pendingCoins = Number(wRes.data.pendingCoins || 0);
        }
      } catch {}

      // 3. Expiry and features
      const formatExpiryHindi = (ms?: number) => {
        if (!ms || isNaN(ms)) return "उपलब्ध नहीं";
        try {
          return new Date(ms).toLocaleDateString("hi-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } catch {
          return "सक्रिय";
        }
      };

      const expiryStr = linkedUser.expiresAt
        ? formatExpiryHindi(linkedUser.expiresAt)
        : (isPaid ? "वार्षिक प्लान सक्रिय" : "7 दिन फ्री ट्रायल");

      const hasVideoStudio = isSuper || tier === "advanced" || tier === "professional" || tier === "ultra" || tier === "vip";
      const videoStatus = hasVideoStudio
        ? "सक्रिय (वीडियो बनाने की सुविधा उपलब्ध ✅)"
        : "अनुपलब्ध ❌ (केवल एडवांस/प्रो/वीआईपी डेस्क में)";

      let replyText = "";
      if (isQuotaQuery && !isAccountQuery) {
        replyText = `📊 *आज का दैनिक ग्राफिक कोटा:*

• प्लान: *${planName}*
• दैनिक डाउनलोड सीमा: *${maxAllowed >= 9999 ? "असीमित (Unlimited)" : `${maxAllowed} ग्राफिक / दिन`}*
• आज डाउनलोड हुए: *${downloadsToday} ग्राफिक*
• *आज के शेष ग्राफिक: ${maxAllowed >= 9999 ? "असीमित" : `${remainingToday} ग्राफिक बाकी`}*
• कोटा रीसेट समय: *रात 12:00 AM (IST)*`;
      } else if (isPlanQuery && !isAccountQuery) {
        replyText = `📋 *आपका मेंबरशिप प्लान विवरण:*

• वर्तमान प्लान: *${planName}* (${isPaid ? "सक्रिय पेड प्लान" : "ट्रायल"})
• वैधता समाप्ति: *${expiryStr}*
• दैनिक डाउनलोड सीमा: *${maxAllowed >= 9999 ? "असीमित" : `${maxAllowed} ग्राफिक / दिन`}*
• वीडियो स्टूडियो: *${videoStatus}*
• अपग्रेड व रिन्यू: https://ainewsmaker.online/#plans`;
      } else if (isWalletQuery && !isAccountQuery) {
        replyText = `💰 *आपका वॉलेट व रिवॉर्ड कॉइन्स:*

• उपलब्ध बैलेंस: *${coinBalance} Coins*
• पेंडिंग क्लेम: *${pendingCoins} Coins*

_कॉइन्स का उपयोग नए प्रीमियम टेम्पलेट्स अनलॉक करने के लिए किया जा सकता है।_`;
      } else {
        // Account summary
        replyText = `👤 *AI NEWS MAKER अकाउंट विवरण:*

• नाम: *${linkedUser.fullName || linkedUser.name || "संपादक"}*
• चैनल: *${linkedUser.channelNameHi || linkedUser.channelName || "सेट नहीं"}*
• रजिस्टर्ड ईमेल: *${userEmail}*
• वर्तमान प्लान: *${planName}* (${isPaid ? "सक्रिय" : "ट्रायल"})
• आज के शेष ग्राफिक: *${maxAllowed >= 9999 ? "असीमित" : `${remainingToday} / ${maxAllowed} बाकी`}*
• वॉलेट कॉइन्स: *${coinBalance} Coins*
• WhatsApp स्थिति: *सत्यापित व लिंक ✅*`;
      }

      console.log(`[WhatsApp:AccountQuery] Sending deterministic reply to ${maskedWa}`);
      const sent = await sendWhatsAppText(waId, replyText);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId, waId, direction: "outbound", text: replyText, timestamp: Date.now(), status: "sent",
      });
      return;
    }

    if (process.env.WHATSAPP_AI_ENABLED !== "true") {
      console.log("[WhatsApp:Inbound] WHATSAPP_AI_ENABLED is not 'true'; skipping AI reply");
      return;
    }
    if (!textBody) {
      console.log("[WhatsApp:Inbound] Message has no text body; skipping AI reply");
      return;
    }

    const aiResult = await generateSupportReply(textBody);
    let reply = aiResult.reply;
    if (!reply) {
      const handoffReason = aiResult.reason || "knowledge_gap";
      console.log(`[WhatsApp:Inbound] Human handoff triggered, with exact reason: ${handoffReason}`);
      await requireWrite("whatsapp_conversations", conversationId, {
        waId, status: "human_requested", humanHandoff: true, handoffReason, updatedAt: Date.now(),
      });
      if (handoffReason === "knowledge_gap") {
        reply = "आपका प्रश्न हमें मिल गया है, लेकिन इसकी पुष्टि हमारे उपलब्ध सहायता-ज्ञान से नहीं हो पा रही है। हमने इसे सहायता टीम के लिए चिन्हित कर दिया है।";
      } else {
        reply = "नमस्ते! आपका संदेश हमें मिल गया है। हमारी सहायता टीम जल्द ही आपसे यहाँ संपर्क करेगी।";
      }
    }

    const sent = await sendWhatsAppText(waId, reply);
    const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
    await requireWrite("whatsapp_messages", sha256(outMsgId), {
      conversationId, waId, direction: "outbound", text: reply, timestamp: Date.now(), status: "sent",
    });
    console.log(`[WhatsApp:Outbound] Outbound Firestore record saved: ${outMsgId}`);
  };

  app.get(webhookPath, (req: any, res: any) => {
    const mode = String(req.query["hub.mode"] || "");
    const token = String(req.query["hub.verify_token"] || "");
    const challenge = String(req.query["hub.challenge"] || "");
    const expected = process.env.META_WEBHOOK_VERIFY_TOKEN || "";
    if (!expected) return res.status(503).send("Webhook verification is not configured");
    if (mode === "subscribe" && safeEqual(token, expected)) return res.status(200).send(challenge);
    return res.sendStatus(403);
  });

  let taskClient: any = null;
  try {
    if (CloudTasksClientClass) taskClient = new CloudTasksClientClass();
  } catch {}
  let taskOidcVerifier: any = null;
  try {
    if (OAuth2ClientClass) taskOidcVerifier = new OAuth2ClientClass();
  } catch {}
  const taskPath = "/api/whatsapp/tasks/process";

  const getTaskConfig = () => {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || centralDb?.projectId || "";
    const location = process.env.WHATSAPP_TASK_QUEUE_LOCATION || "";
    const queue = process.env.WHATSAPP_TASK_QUEUE || "";
    const serviceAccountEmail = process.env.WHATSAPP_TASK_SERVICE_ACCOUNT || "";
    const baseUrl = String(process.env.WHATSAPP_TASK_BASE_URL || "").replace(/\/$/, "");
    const url = baseUrl ? baseUrl + taskPath : "";
    const audience = process.env.WHATSAPP_TASK_AUDIENCE || url;
    if (!projectId || !location || !queue || !serviceAccountEmail || !url || !audience) return null;
    return { projectId, location, queue, serviceAccountEmail, url, audience };
  };

  const enqueueMessage = async (message: any) => {
    const config = getTaskConfig();
    if (!config || !taskClient) {
      // In-process fallback when Cloud Tasks is unconfigured or unavailable
      setImmediate(() => {
        processInboundMessage(message).catch((err: any) => {
          console.error("[WhatsApp:Inbound] In-process fallback error:", err?.message || err);
        });
      });
      return;
    }
    const messageId = String(message?.id || "");
    const parent = taskClient.queuePath(config.projectId, config.location, config.queue);
    const taskName = taskClient.taskPath(config.projectId, config.location, config.queue, "wa-" + sha256(messageId).slice(0, 32));
    try {
      await taskClient.createTask({
        parent,
        task: {
          name: taskName,
          dispatchDeadline: { seconds: 300 },
          httpRequest: {
            httpMethod: "POST",
            url: config.url,
            headers: { "Content-Type": "application/json" },
            body: Buffer.from(JSON.stringify({ messageId, message })).toString("base64"),
            oidcToken: {
              serviceAccountEmail: config.serviceAccountEmail,
              audience: config.audience,
            },
          },
        },
      });
    } catch (error: any) {
      // A deterministic task name makes concurrent Meta retries idempotent.
      if (Number(error?.code) !== 6 && Number(error?.code) !== 409 && error?.code !== "ALREADY_EXISTS") throw error;
    }
  };

  const verifyTaskRequest = async (req: any) => {
    const config = getTaskConfig();
    if (!config) return false;
    const authorization = String(req.headers.authorization || "");
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return false;
    try {
      const ticket = await taskOidcVerifier.verifyIdToken({ idToken: match[1], audience: config.audience });
      const payload = ticket.getPayload();
      return Boolean(payload?.email_verified && payload.email === config.serviceAccountEmail);
    } catch {
      return false;
    }
  };

  app.post(taskPath, async (req: any, res: any) => {
    console.log("[WhatsApp:TaskAuth] Task processor invocation received");
    if (!(await verifyTaskRequest(req))) {
      console.warn("[WhatsApp:TaskAuth] Unauthorized task request: OIDC verification failed");
      return res.sendStatus(401);
    }
    console.log("[WhatsApp:TaskAuth] Cloud Task authenticated successfully");

    const message = req.body?.message;
    const messageId = String(req.body?.messageId || "");
    if (!message || !messageId || String(message.id || "") !== messageId) return res.sendStatus(400);
    if (!centralDb?.useFirestore) return res.sendStatus(503);

    const eventId = sha256(messageId);
    console.log(`[WhatsApp:Tasks] Cloud Task processing started for event ${eventId.slice(0, 10)}... (messageId=${messageId})`);
    try {
      const claim = await claimInboundEvent(eventId, messageId);
      if (claim === "processed") {
        console.log(`[WhatsApp:Tasks] Event ${eventId.slice(0, 10)} already processed; skipping duplicate`);
        return res.sendStatus(200);
      }
      if (claim === "busy") {
        console.log(`[WhatsApp:Tasks] Event ${eventId.slice(0, 10)} currently leased; returning 503 for backoff`);
        return res.sendStatus(503);
      }
      await processInboundMessage(message);
      await requireWrite("whatsapp_webhook_events", eventId, {
        messageId, status: "processed", processedAt: Date.now(),
      });
      console.log(`[WhatsApp:Tasks] Cloud Task processing completed successfully for event ${eventId.slice(0, 10)}`);
      return res.sendStatus(200);
    } catch (error: any) {
      const errMsg = String(error?.message || error);
      console.error("[WhatsApp:Tasks] Durable task processing failed:", errMsg.slice(0, 240));
      await centralDb.writeDoc("whatsapp_webhook_events", eventId, {
        messageId, status: "retryable", lastErrorAt: Date.now(), lastError: errMsg.slice(0, 200),
      }).catch(() => undefined);
      return res.sendStatus(500);
    }
  });

  app.post(webhookPath, async (req: any, res: any) => {
    if (!verifySignature(req)) {
      console.warn("[WhatsApp:Inbound] Webhook signature verification failed");
      return res.sendStatus(401);
    }
    console.log("[WhatsApp:Inbound] Webhook signature verified successfully");
    if (req.body?.object !== "whatsapp_business_account") return res.sendStatus(404);
    if (!centralDb?.useFirestore || !getTaskConfig()) return res.sendStatus(503);

    const messages: any[] = [];
    for (const entry of req.body?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const message of change?.value?.messages || []) messages.push(message);
      }
    }

    try {
      for (const message of messages) {
        const messageId = String(message?.id || "");
        if (!messageId) continue;
        const eventId = sha256(messageId);
        const existing = await centralDb.readDoc("whatsapp_webhook_events", eventId);
        if (existing?.success && existing.data?.status === "processed") continue;
        if (existing?.success && (existing.data?.status === "queued" || existing.data?.status === "processing")) continue;

        // Persist before enqueueing. If enqueue fails, return 503 so Meta retries.
        await requireWrite("whatsapp_webhook_events", eventId, {
          messageId, status: "enqueueing", receivedAt: Number(message.timestamp || Math.floor(Date.now() / 1000)) * 1000,
        });
        await enqueueMessage(message);
        console.log(`[WhatsApp:Inbound] Cloud Task enqueued for message: ${messageId}`);
      }
      return res.sendStatus(200);
    } catch (error: any) {
      console.error("[WhatsApp:Inbound] Could not enqueue inbound webhook:", String(error?.message || error).slice(0, 240));
      return res.sendStatus(503);
    }
  });

  // --- WHATSAPP OTP VERIFICATION ENDPOINTS ---
  app.post("/api/auth/send-whatsapp-otp", async (req: any, res: any) => {
    try {
      const rawPhone = String(req.body?.phone || "").trim();
      const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
      const countryCode = String(req.body?.countryCode || "+91").trim();
      const purpose = String(req.body?.purpose || "signup").trim();
      const email = String(req.body?.email || "").toLowerCase().trim();

      if (!cleanPhone || cleanPhone.length !== 10) {
        return res.status(400).json({
          success: false,
          error: "कृपया वैध 10-अंकों का मोबाइल नंबर दर्ज करें।"
        });
      }

      const now = Date.now();
      const rateData = otpRateLimits.get(cleanPhone) || { lastSent: 0, countInHour: 0, hourStart: now };
      if (now - rateData.hourStart > 3600000) {
        rateData.countInHour = 0;
        rateData.hourStart = now;
      }
      if (now - rateData.lastSent < 60000) {
        const waitSec = Math.ceil((60000 - (now - rateData.lastSent)) / 1000);
        return res.status(429).json({
          success: false,
          error: `कृपया पुनः OTP भेजने से पहले ${waitSec} सेकंड प्रतीक्षा करें।`,
          cooldownSeconds: waitSec
        });
      }
      if (rateData.countInHour >= 5) {
        return res.status(429).json({
          success: false,
          error: "इस नंबर पर प्रति घंटे की अधिकतम OTP सीमा (5 बार) समाप्त हो चुकी है। कृपया 1 घंटे बाद प्रयास करें।"
        });
      }

      // Generate cryptographically random 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const salt = randomBytes(16).toString("hex");
      const codeHash = createHash("sha256").update(otp + salt + cleanPhone).digest("hex");
      const verificationId = randomUUID();
      const expiresAt = now + (5 * 60 * 1000); // 5 minutes

      const otpDoc = {
        verificationId,
        phone: cleanPhone,
        countryCode: countryCode.startsWith("+") ? countryCode : `+${countryCode}`,
        fullPhone: `91${cleanPhone}`,
        codeHash,
        salt,
        expiresAt,
        attempts: 0,
        maxAttempts: 3,
        status: "pending",
        purpose,
        email,
        createdAt: now,
      };

      otpVerificationCache.set(verificationId, otpDoc);

      if (centralDb?.useFirestore) {
        await centralDb.writeDoc("whatsapp_otp_verifications", verificationId, otpDoc).catch((err: any) => {
          console.warn("[WhatsApp:OTP] Firestore write warning:", err.message);
        });
      }

      const destinationWaId = `91${cleanPhone}`;
      const otpMessage = `🔐 *AI NEWS MAKER - WhatsApp सत्यापन OTP*\n\nआपका 6-अंकों का वेरिफिकेशन कोड है: *${otp}*\n\nयह कोड 5 मिनट के लिए वैध है। सुरक्षा कारणों से यह OTP किसी के साथ साझा न करें।\n\n— AI News Maker (ainewsmaker.online)`;

      try {
        await sendWhatsAppOtpMessage(destinationWaId, otp, 5);
        console.log(`[WhatsApp:OTP] OTP sent successfully to ${maskWaId(destinationWaId)}`);
        
        rateData.lastSent = now;
        rateData.countInHour += 1;
        otpRateLimits.set(cleanPhone, rateData);

        return res.json({
          success: true,
          verificationId,
          phone: cleanPhone,
          expiresAt,
          cooldownSeconds: 60,
          message: "आपके WhatsApp पर 6-अंकों का OTP भेज दिया गया है।"
        });
      } catch (sendErr: any) {
        const errMsg = String(sendErr?.message || sendErr);
        console.error(`[WhatsApp:OTP] Failed to send OTP to ${maskWaId(destinationWaId)}:`, errMsg);
        
        if (errMsg.includes("Authentication Error") || errMsg.includes("WHATSAPP_API_ERROR") || errMsg.includes("401") || errMsg.includes("190")) {
          return res.status(503).json({
            success: false,
            error: "व्हाट्सएप्प क्लाउड API ऑथेंटिकेशन त्रुटि (Meta Access Token Expired). कृपया एडमिन से संपर्क करें।",
            errorCode: "WHATSAPP_TOKEN_EXPIRED",
            verificationId
          });
        }

        return res.status(500).json({
          success: false,
          error: `WhatsApp OTP भेजने में त्रुटि: ${errMsg.slice(0, 100)}`
        });
      }
    } catch (err: any) {
      console.error("[WhatsApp:OTP] Unhandled error in send-whatsapp-otp:", err);
      return res.status(500).json({
        success: false,
        error: "सर्वर पर OTP भेजने में आंतरिक समस्या आई।"
      });
    }
  });

  app.post("/api/auth/verify-whatsapp-otp", async (req: any, res: any) => {
    try {
      const verificationId = String(req.body?.verificationId || "").trim();
      const rawPhone = String(req.body?.phone || "").trim();
      const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
      const otp = String(req.body?.otp || "").trim();
      const email = String(req.body?.email || "").toLowerCase().trim();

      if (!verificationId || !cleanPhone || !otp) {
        return res.status(400).json({
          success: false,
          error: "verificationId, phone और OTP अनिवार्य हैं।"
        });
      }

      if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          error: "कृपया सही 6-अंकों का OTP दर्ज करें।"
        });
      }

      let record = otpVerificationCache.get(verificationId);
      if (!record && centralDb?.useFirestore) {
        const fsDoc = await centralDb.readDoc("whatsapp_otp_verifications", verificationId);
        if (fsDoc?.success && fsDoc?.data) {
          record = fsDoc.data;
        }
      }

      if (!record) {
        return res.status(404).json({
          success: false,
          error: "अमान्य अथवा समाप्त हो चुका वेरिफिकेशन अनुरोध। कृपया नया OTP मंगाएँ।"
        });
      }

      if (record.status === "verified") {
        return res.status(400).json({
          success: false,
          error: "यह OTP पहले ही उपयोग किया जा चुका है।"
        });
      }

      if (record.phone !== cleanPhone) {
        return res.status(400).json({
          success: false,
          error: "यह OTP दर्ज किए गए नंबर से मेल नहीं खाता।"
        });
      }

      const now = Date.now();
      if (now > record.expiresAt) {
        record.status = "expired";
        otpVerificationCache.set(verificationId, record);
        if (centralDb?.useFirestore) {
          await centralDb.writeDoc("whatsapp_otp_verifications", verificationId, record).catch(() => undefined);
        }
        return res.status(400).json({
          success: false,
          error: "OTP की वैधता (5 मिनट) समाप्त हो चुकी है। कृपया नया OTP मंगाएँ।"
        });
      }

      if (record.attempts >= record.maxAttempts) {
        record.status = "max_attempts_exceeded";
        otpVerificationCache.set(verificationId, record);
        if (centralDb?.useFirestore) {
          await centralDb.writeDoc("whatsapp_otp_verifications", verificationId, record).catch(() => undefined);
        }
        return res.status(400).json({
          success: false,
          error: "अधिकतम गलत प्रयास सीमा (3 बार) समाप्त हो चुकी है। कृपया नया OTP मंगाएँ।"
        });
      }

      const candidateHash = createHash("sha256").update(otp + record.salt + cleanPhone).digest("hex");
      const isMatch = candidateHash === record.codeHash;

      if (!isMatch) {
        record.attempts += 1;
        otpVerificationCache.set(verificationId, record);
        if (centralDb?.useFirestore) {
          await centralDb.writeDoc("whatsapp_otp_verifications", verificationId, record).catch(() => undefined);
        }
        const remaining = record.maxAttempts - record.attempts;
        return res.status(400).json({
          success: false,
          error: remaining > 0 ? `गलत OTP दर्ज किया गया है। शेष प्रयास: ${remaining}` : "अधिकतम गलत प्रयास सीमा समाप्त हो गई है। कृपया नया OTP मंगाएँ।",
          remainingAttempts: Math.max(0, remaining)
        });
      }

      record.status = "verified";
      record.verifiedAt = now;
      otpVerificationCache.set(verificationId, record);
      if (centralDb?.useFirestore) {
        await centralDb.writeDoc("whatsapp_otp_verifications", verificationId, record).catch(() => undefined);
      }

      const verificationToken = createHash("sha256").update(`${verificationId}:${cleanPhone}:${record.salt}:${now}`).digest("hex");

      if (email && centralDb?.useFirestore) {
        try {
          const userDocRes = await centralDb.readDoc("users", email);
          const uData = userDocRes?.data || {};
          const updatedUser = {
            ...uData,
            email,
            primaryNumber: cleanPhone,
            whatsappNumber: cleanPhone,
            whatsappVerified: true,
            whatsappVerifiedAt: now,
            whatsappVerificationMethod: "whatsapp_otp",
            countryCode: "+91",
            updatedAt: now
          };
          await centralDb.writeDoc("users", email, updatedUser);
          if (centralDb.cache?.users) {
            centralDb.cache.users.set(email, updatedUser);
          }
          console.log(`[WhatsApp:OTP] User ${email} verified and updated with primaryNumber: ${cleanPhone}`);
        } catch (uErr: any) {
          console.warn(`[WhatsApp:OTP] Warning updating user record for ${email}:`, uErr.message);
        }
      }

      // Automatically dispatch First-Time Onboarding Preferences Message to verified WhatsApp
      try {
        const recipientWaId = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const onboardingPrefMsg = `🙏 *नमस्कार! AI News Maker में आपका स्वागत है।*

क्या आप हमारे WhatsApp AI Assistant के माध्यम से निम्न सुविधाएँ प्राप्त करना चाहेंगे?

1️⃣ *AI News Maker के नए फीचर्स और लेटेस्ट अपडेट*
2️⃣ *ताज़ा ब्रेकिंग न्यूज़ और महत्वपूर्ण समाचार*
3️⃣ *अपनी प्रोफाइल और अकाउंट से जुड़ी जानकारी*
4️⃣ *AI News Maker के उपयोग और सुविधाओं में सहायता*

👉 *उत्तर दें:* अपनी पसंद का नंबर लिखें (उदा. *1*, *2*, *3*, *4* या सभी हेतु *सभी* / *ALL*)।
(नोट: आप किसी भी समय 'STOP' लिखकर सूचनाएँ बंद कर सकते हैं)`;

        sendWhatsAppText(recipientWaId, onboardingPrefMsg).then(async (sent) => {
          const outMsgId = String(sent?.messages?.[0]?.id || `onb-pref-${now}`);
          await requireWrite("whatsapp_messages", sha256(outMsgId), {
            conversationId: sha256(recipientWaId),
            waId: recipientWaId,
            direction: "outbound",
            text: onboardingPrefMsg,
            timestamp: now,
            status: "sent",
          }).catch(() => {});
        }).catch((err) => {
          console.warn("[WhatsApp:Onboarding] Failed to send onboarding pref message:", err.message);
        });
      } catch (onbErr: any) {
        console.warn("[WhatsApp:Onboarding] Non-fatal dispatch error:", onbErr.message);
      }

      return res.json({
        success: true,
        verified: true,
        phone: cleanPhone,
        verificationToken,
        verifiedAt: now,
        message: "✅ WhatsApp नंबर सफलतापूर्वक सत्यापित हो गया है।"
      });
    } catch (err: any) {
      console.error("[WhatsApp:OTP] Unhandled error in verify-whatsapp-otp:", err);
      return res.status(500).json({
        success: false,
        error: "सर्वर पर OTP सत्यापन में आंतरिक समस्या आई।"
      });
    }
  });

  // --- ONBOARDING WELCOME MESSAGE ENDPOINT ---
  app.post("/api/whatsapp/onboarding/welcome", async (req: any, res: any) => {
    try {
      const rawPhone = String(req.body?.phone || req.body?.mobileNumber || "").trim();
      const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
      const email = String(req.body?.email || "").toLowerCase().trim();
      const userName = String(req.body?.name || req.body?.fullName || "संपादक").trim();

      if (!cleanPhone) {
        return res.status(400).json({ error: "Phone number required" });
      }

      const recipientWaId = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const conversationId = sha256(recipientWaId);
      const now = Date.now();

      // Check if welcome message was already sent to avoid duplicate welcome messages on logins
      if (email && centralDb?.useFirestore) {
        const uRes = await centralDb.readDoc("users", email);
        if (uRes?.data?.whatsappWelcomeSentAt || uRes?.data?.whatsappOnboardingStatus === "completed") {
          return res.json({ success: true, message: "Welcome message already sent previously." });
        }
      }

      const welcomeMsg = `🙏 *नमस्कार ${userName}!*

आपकी *AI News Maker* प्रोफ़ाइल सफलतापूर्वक तैयार हो गई है। 🎉

अब आप हमारे WhatsApp AI Assistant के माध्यम से:
✨ AI News Maker की सुविधाओं की जानकारी प्राप्त कर सकते हैं।
📊 अपनी प्रोफाइल, प्लान और कोटा से जुड़ी जानकारी पूछ सकते हैं।
🛠️ न्यूज़ ग्राफिक व वीडियो निर्माण में सहायता प्राप्त कर सकते हैं।
⚡ ताज़ा अपडेट और ब्रेकिंग न्यूज़ अलर्ट प्राप्त कर सकते हैं।

AI News Maker परिवार में आपका हार्दिक स्वागत है!
🌐 वेबसाइट: https://ainewsmaker.online`;

      const sent = await sendWhatsAppText(recipientWaId, welcomeMsg);
      const outMsgId = String(sent?.messages?.[0]?.id || `onb-wel-${now}`);
      await requireWrite("whatsapp_messages", sha256(outMsgId), {
        conversationId,
        waId: recipientWaId,
        direction: "outbound",
        text: welcomeMsg,
        timestamp: now,
        status: "sent",
      }).catch(() => {});

      if (email && centralDb?.useFirestore) {
        await centralDb.writeDoc("users", email, {
          whatsappWelcomeSentAt: now,
          whatsappOnboardingStatus: "completed",
          updatedAt: now,
        }).catch(() => {});
      }

      return res.json({ success: true, message: "Welcome message dispatched successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) });
    }
  });

  // --- ADMIN WHATSAPP NOTIFICATION CENTER CAMPAIGN ENDPOINT ---
  app.post("/api/admin/whatsapp/campaign", async (req: any, res: any) => {
    try {
      const adminEmail = (req.headers["x-admin-email"] || req.headers["x-user-email"] || "").toString().toLowerCase().trim();
      const adminRole = (req.headers["x-user-role"] || "").toString().toLowerCase().trim();
      const isAuthAdmin = adminEmail === 'admin.ainewsmaker@gmail.com' || adminEmail === 'breakingnewswala.com@gmail.com' || adminRole === "superadmin" || adminRole === "admin" || adminEmail.includes("admin") || adminEmail.includes("breakingnewswala");

      if (!isAuthAdmin) {
        return res.status(403).json({ error: "अनधिकृत: केवल अधिकृत एडमिन ही व्हाट्सएप नोटिफिकेशन कैंपेन चला सकते हैं।" });
      }

      const {
        targetAudience = "all",
        targetUserEmails = [],
        customNumbers = [],
        category = "Breaking News",
        headline = "",
        summary = "",
        articleUrl = "",
        customMessage = "",
        testPhone = "",
      } = req.body;

      const now = Date.now();
      const campaignId = `camp_${now}_${Math.random().toString(36).slice(2, 7)}`;

      let finalMessage = "";
      if (headline) finalMessage += `🚨 *${headline.trim()}*\n\n`;
      if (summary) finalMessage += `${summary.trim()}\n\n`;
      if (customMessage) finalMessage += `${customMessage.trim()}\n\n`;
      if (articleUrl) finalMessage += `🔗 पूरी खबर पढ़ें: ${articleUrl.trim()}\n\n`;
      finalMessage += `_AI News Maker (ब्रेकिंग न्यूज़ वाला) - आधिकारिक समाचार सेवा_\n_नोटिफिकेशन रोकने के लिए STOP लिखें_`;

      // Test Mode
      if (testPhone) {
        const cleanTest = String(testPhone).replace(/\D/g, "").slice(-10);
        const testWaId = cleanTest.length === 10 ? `91${cleanTest}` : cleanTest;
        const testSent = await sendWhatsAppText(testWaId, `[TEST PREVIEW]\n\n${finalMessage}`);
        return res.json({
          success: true,
          testMode: true,
          deliveredTo: testWaId,
          metaResponse: testSent,
        });
      }

      // Resolve Recipients
      const recipientNumbers = new Set<string>();

      if (targetAudience === "custom" && Array.isArray(customNumbers)) {
        for (const num of customNumbers) {
          const clean = String(num || "").replace(/\D/g, "").slice(-10);
          if (clean.length === 10) recipientNumbers.add(`91${clean}`);
        }
      } else {
        const usersList: any[] = centralDb?.cache?.users
          ? Array.from(centralDb.cache.users.values())
          : [];

        for (const u of usersList) {
          const uEmail = (u.email || "").toLowerCase().trim();
          const uTier = (u.tier || "basic").toLowerCase().trim();
          const uPhone = (u.whatsappNumber || u.primaryPhone || u.mobileNumber || u.mobile || "").replace(/\D/g, "").slice(-10);

          if (!uPhone || uPhone.length !== 10) continue;

          if (targetAudience === "selected") {
            if (!targetUserEmails.includes(uEmail)) continue;
          } else if (targetAudience !== "all") {
            if (targetAudience === "vip" && uTier !== "ultra" && uTier !== "vip") continue;
            else if (targetAudience !== "vip" && uTier !== targetAudience) continue;
          }

          if (category === "Breaking News" && u.whatsappBreakingNewsConsent === false) continue;
          if (u.newsAlertsConsent === false) continue;

          recipientNumbers.add(`91${uPhone}`);
        }
      }

      const recipientsList = Array.from(recipientNumbers);
      console.log(`[WhatsApp:Campaign] Starting campaign '${campaignId}' to ${recipientsList.length} recipients`);

      let successfulDeliveries = 0;
      let failedDeliveries = 0;
      const failedRecipients: { phone: string; error: string }[] = [];

      for (const phone of recipientsList) {
        try {
          const sent = await sendWhatsAppText(phone, finalMessage);
          if (sent && (sent.messages || sent.contacts)) {
            successfulDeliveries++;
            const outMsgId = String(sent?.messages?.[0]?.id || `camp-out-${Date.now()}`);
            await requireWrite("whatsapp_messages", sha256(outMsgId), {
              conversationId: sha256(phone),
              waId: phone,
              direction: "outbound",
              text: finalMessage,
              timestamp: Date.now(),
              status: "sent",
              campaignId,
            }).catch(() => {});
          } else {
            failedDeliveries++;
            failedRecipients.push({ phone, error: sent?.error?.message || "Delivery rejected" });
          }
        } catch (mErr: any) {
          failedDeliveries++;
          failedRecipients.push({ phone, error: mErr.message || "Network error" });
        }
        await new Promise((r) => setTimeout(r, 60));
      }

      const campaignRecord = {
        campaignId,
        category,
        targetAudience,
        totalRecipients: recipientsList.length,
        successfulDeliveries,
        failedDeliveries,
        failedRecipients: failedRecipients.slice(0, 50),
        messagePreview: finalMessage.slice(0, 200),
        createdBy: adminEmail || "admin",
        createdAt: now,
        sentAt: Date.now(),
        status: "completed",
      };

      if (centralDb?.useFirestore) {
        await centralDb.writeDoc("whatsapp_campaigns", campaignId, campaignRecord).catch(() => {});
      }

      console.log(`[WhatsApp:Campaign] Finished '${campaignId}': ${successfulDeliveries} sent, ${failedDeliveries} failed`);
      return res.json({
        success: true,
        campaignId,
        totalRecipients: recipientsList.length,
        successfulDeliveries,
        failedDeliveries,
        failedRecipients,
      });
    } catch (err: any) {
      console.error("[WhatsApp:Campaign] Campaign failure:", err);
      return res.status(500).json({ error: String(err?.message || err) });
    }
  });

  app.get("/api/whatsapp/diagnostic", async (req: any, res: any) => {
    const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "1474022642460639").trim();
    const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
    const officialSenderNumber = (process.env.WHATSAPP_PHONE_NUMBER || process.env.WHATSAPP_DISPLAY_NUMBER || "+1 555-706-1955").trim();
    const wabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "1136242015583003").trim();
    const otpTemplate = (process.env.WHATSAPP_OTP_TEMPLATE || "profile_otp").trim();
    const otpTemplateLang = (process.env.WHATSAPP_OTP_TEMPLATE_LANG || "en_US").trim();
    const hasAppSecret = Boolean((process.env.META_APP_SECRET || "").trim());
    const hasVerifyToken = Boolean((process.env.META_WEBHOOK_VERIFY_TOKEN || "").trim());
    const hasGeminiKey = Boolean((process.env.GEMINI_API_KEY || "").trim());

    let metaApiStatus: any = { ok: false };
    if (token) {
      try {
        const resp = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}?access_token=${token}`);
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          metaApiStatus = { ok: true, id: data.id, verified_name: data.verified_name, display_phone_number: data.display_phone_number };
        } else {
          metaApiStatus = { ok: false, status: resp.status, error: data?.error?.message, type: data?.error?.type, code: data?.error?.code, subcode: data?.error?.error_subcode };
        }
      } catch (e: any) {
        metaApiStatus = { ok: false, error: e.message };
      }
    } else {
      metaApiStatus = { ok: false, error: "WHATSAPP_ACCESS_TOKEN is empty" };
    }

    let kbCount = 0;
    if (centralDb?.useFirestore) {
      try {
        const kbDocs = await centralDb.listDocs("whatsapp_knowledge_base", 50);
        kbCount = (kbDocs?.documents || []).length;
      } catch {}
    }

    res.json({
      timestamp: new Date().toISOString(),
      officialSender: {
        number: officialSenderNumber,
        phoneNumberId,
        wabaId,
        otpTemplate,
        otpTemplateLang
      },
      environment: {
        hasAccessToken: Boolean(token),
        tokenPrefix: token ? `${token.slice(0, 15)}...` : "NONE",
        phoneNumberId,
        wabaId,
        version,
        hasAppSecret,
        hasVerifyToken,
        hasGeminiKey,
        firestoreConnected: Boolean(centralDb?.useFirestore),
        knowledgeBaseCount: kbCount
      },
      metaApiStatus
    });
  });
}
