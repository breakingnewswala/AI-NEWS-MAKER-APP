import { createHmac, createHash, timingSafeEqual } from "crypto";
import { GoogleGenAI } from "@google/genai";

/**
 * WhatsApp Cloud API webhook foundation.
 * Secrets are supplied only through server runtime environment variables.
 * Firestore collections used here are server-side only:
 * whatsapp_webhook_events, whatsapp_messages, whatsapp_conversations,
 * whatsapp_knowledge_base, whatsapp_subscribers.
 */
export function registerWhatsAppIntegration(app: any, centralDb: any) {
  const webhookPath = "/api/whatsapp/webhook";

  const safeEqual = (a: string, b: string) => {
    const left = Buffer.from(String(a || ""));
    const right = Buffer.from(String(b || ""));
    return left.length === right.length && timingSafeEqual(left, right);
  };

  const sha256 = (value: string) =>
    createHash("sha256").update(value).digest("hex");

  const verifySignature = (req: any) => {
    const appSecret = process.env.META_APP_SECRET;
    const signature = String(req.headers["x-hub-signature-256"] || "");
    const rawBody = String(req.rawBody || "");
    if (!appSecret || !signature.startsWith("sha256=") || !rawBody) return false;
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
    return safeEqual(signature, expected);
  };

  const sendWhatsAppText = async (to: string, body: string) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1474022642460639";
    const version = process.env.WHATSAPP_GRAPH_API_VERSION;
    if (!token || !phoneNumberId || !version) {
      throw new Error("WhatsApp Cloud API credentials are not configured");
    }
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
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
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = (result as any)?.error?.message || `WhatsApp API request failed (${response.status})`;
      throw new Error(error);
    }
    return result;
  };

  const getKnowledgeContext = async () => {
    if (!centralDb?.useFirestore) return "";
    const result = await centralDb.listDocs("whatsapp_knowledge_base", 100);
    if (!result?.success || !Array.isArray(result.documents)) return "";
    return result.documents
      .filter((item: any) => item && item.isActive !== false && item.status !== "disabled")
      .map((item: any) => {
        const title = String(item.title || item.question || "").trim();
        const content = String(item.content || item.answer || item.description || "").trim();
        return title && content ? `प्रश्न/विषय: ${title}\nउत्तर/जानकारी: ${content}` : content || title;
      })
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 14000);
  };

  const generateSupportReply = async (userMessage: string) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.WHATSAPP_GEMINI_MODEL;
    if (!apiKey || !model) return null;

    const knowledge = await getKnowledgeContext();
    if (!knowledge) return null;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: [
        "आप BREAKING NEWS WALA / AI NEWS MAKER के ग्राहक सहायता सहायक हैं। केवल नीचे दिए गए आधिकारिक ज्ञान-आधार से उत्तर दें। कोई तथ्य, मूल्य, सुविधा, स्थिति, समय-सीमा या नीति न गढ़ें। यदि उत्तर ज्ञान-आधार में नहीं है, तो बिल्कुल HUMAN_HANDOFF लिखें। उत्तर शुद्ध, सरल हिंदी में 2-5 वाक्यों का हो। पासवर्ड, OTP, भुगतान कार्ड, API token या गोपनीय जानकारी कभी न माँगें। ग्राहक की ओर से भुगतान, रिफंड, खाता परिवर्तन या कोई संवेदनशील कार्रवाई स्वयं न करें।",
        "आधिकारिक ज्ञान-आधार:\n" + knowledge,
        "ग्राहक का संदेश:\n" + userMessage,
      ].join("\n\n"),
    });
    const answer = String(response.text || "").trim();
    if (!answer || answer.includes("HUMAN_HANDOFF")) return null;
    return answer.slice(0, 3500);
  };

  const processInboundMessage = async (message: any) => {
    const waId = String(message.from || "").trim();
    const messageId = String(message.id || "").trim();
    if (!waId || !messageId || !centralDb?.useFirestore) return;

    const textBody = message.type === "text" ? String(message.text?.body || "").trim() : "";
    const messageDocId = sha256(messageId);
    const conversationId = sha256(waId);
    const now = Date.now();

    await centralDb.writeDoc("whatsapp_messages", messageDocId, {
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

    await centralDb.writeDoc("whatsapp_conversations", conversationId, {
      waId,
      channel: "whatsapp",
      lastInboundAt: now,
      lastMessagePreview: textBody.slice(0, 180) || `[${message.type || "message"}]`,
      status: "open",
      updatedAt: now,
    });

    if (textBody.toUpperCase() === "STOP" || textBody.toUpperCase() === "UNSUBSCRIBE") {
      await centralDb.writeDoc("whatsapp_subscribers", conversationId, {
        waId,
        newsAlertsConsent: false,
        newsAlertsOptedOutAt: now,
        updatedAt: now,
      });
      const optOutReply = "आपकी WhatsApp समाचार सूचनाएँ बंद कर दी गई हैं। ग्राहक सहायता के लिए आप हमें संदेश भेज सकते हैं।";
      const sent = await sendWhatsAppText(waId, optOutReply);
      await centralDb.writeDoc("whatsapp_messages", sha256(String(sent?.messages?.[0]?.id || `out-${messageId}`)), {
        conversationId, waId, direction: "outbound", text: optOutReply, timestamp: now, status: "sent",
      });
      return;
    }

    const wantsHuman = /\b(agent|human|person|support)\b|मानव|व्यक्ति|प्रतिनिधि|कस्टमर केयर|सहायता टीम/i.test(textBody);
    if (wantsHuman) {
      await centralDb.writeDoc("whatsapp_conversations", conversationId, {
        waId, status: "human_requested", humanHandoff: true, handoffRequestedAt: now, updatedAt: now,
      });
      const handoffReply = "आपका अनुरोध हमारी सहायता टीम को भेज दिया गया है। कृपया यहीं प्रतीक्षा करें, टीम का सदस्य आपसे संपर्क करेगा।";
      const sent = await sendWhatsAppText(waId, handoffReply);
      await centralDb.writeDoc("whatsapp_messages", sha256(String(sent?.messages?.[0]?.id || `out-${messageId}`)), {
        conversationId, waId, direction: "outbound", text: handoffReply, timestamp: now, status: "sent",
      });
      return;
    }

    if (process.env.WHATSAPP_AI_ENABLED !== "true" || !textBody) return;

    let reply: string | null = null;
    try {
      reply = await generateSupportReply(textBody);
    } catch (error: any) {
      console.error("[WhatsApp] Gemini support response failed:", String(error?.message || error).slice(0, 240));
    }
    if (!reply) {
      await centralDb.writeDoc("whatsapp_conversations", conversationId, {
        waId, status: "human_requested", humanHandoff: true, handoffReason: "knowledge_gap", updatedAt: Date.now(),
      });
      reply = "आपका प्रश्न हमें मिल गया है, लेकिन इसकी पुष्टि हमारे उपलब्ध सहायता-ज्ञान से नहीं हो पा रही है। हमने इसे सहायता टीम के लिए चिन्हित कर दिया है।";
    }

    const sent = await sendWhatsAppText(waId, reply);
    await centralDb.writeDoc("whatsapp_messages", sha256(String(sent?.messages?.[0]?.id || `out-${messageId}`)), {
      conversationId, waId, direction: "outbound", text: reply, timestamp: Date.now(), status: "sent",
    });
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

  app.post(webhookPath, async (req: any, res: any) => {
    if (!verifySignature(req)) return res.sendStatus(401);
    if (req.body?.object !== "whatsapp_business_account") return res.sendStatus(404);

    const messages: any[] = [];
    for (const entry of req.body?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const message of change?.value?.messages || []) messages.push(message);
      }
    }

    // Persist webhook deliveries before acknowledging Meta; deduplicate by WhatsApp message ID.
    for (const message of messages) {
      const messageId = String(message?.id || "");
      if (!messageId) continue;
      const eventId = sha256(messageId);
      const existing = await centralDb?.readDoc?.("whatsapp_webhook_events", eventId);
      if (existing?.success && existing.data?.status === "processed") continue;
      if (existing?.success && existing.data?.status === "processing" && Date.now() - Number(existing.data?.receivedAt || 0) < 5 * 60 * 1000) continue;
      const saved = await centralDb?.writeDoc?.("whatsapp_webhook_events", eventId, {
        messageId, status: "processing", receivedAt: Date.now(),
      });
      if (!saved?.success) return res.sendStatus(500);
    }

    res.sendStatus(200);
    for (const message of messages) {
      const messageId = String(message?.id || "");
      if (!messageId) continue;
      void processInboundMessage(message).then(async () => {
        if (centralDb?.useFirestore) {
          await centralDb.writeDoc("whatsapp_webhook_events", sha256(messageId), {
            messageId, status: "processed", processedAt: Date.now(),
          });
        }
      }).catch(async (error: any) => {
        console.error("[WhatsApp] Inbound processing failed:", String(error?.message || error).slice(0, 240));
        const messageId = String(message?.id || "");
        if (messageId && centralDb?.useFirestore) {
          await centralDb.writeDoc("whatsapp_webhook_events", sha256(messageId), {
            messageId, status: "failed", failedAt: Date.now(),
          }).catch(() => undefined);
        }
      });
    }
  });
}
