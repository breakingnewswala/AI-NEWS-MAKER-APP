import { createHmac, createHash, timingSafeEqual } from "crypto";
import { GoogleGenAI } from "@google/genai";
import { CloudTasksClient } from "@google-cloud/tasks";
import { OAuth2Client } from "google-auth-library";

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
      throw new Error(`WHATSAPP_API_ERROR: ${errorMsg}`);
    }

    console.log(`[WhatsApp:Outbound] WhatsApp API response received: messageId=${result?.messages?.[0]?.id || "unknown"}`);
    return result;
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

  const taskClient = new CloudTasksClient();
  const taskOidcVerifier = new OAuth2Client();
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
    if (!config) throw new Error("WhatsApp Cloud Tasks configuration is incomplete");
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
}
