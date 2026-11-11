import fs from "fs";
import path from "path";
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

const sha256 = (value: string) => createHash("sha256").update(String(value || "")).digest("hex");

// Phase 1B In-memory caches for live inbox fast access and offline resilience
export const conversationCache = new Map<string, any>();
export const messageCache = new Map<string, any>();
export const replyIdempotencyCache = new Map<string, number>();

// ============================================================================
// WHATSAPP AI FLOW BUILDER & FAQ MANAGER — MODELS & PERSISTENCE
// ============================================================================

export interface FlowOption {
  id: string;
  label: string;
  keyword?: string;
  nextNodeId?: string;
}

export interface FlowCondition {
  field?: string;
  operator: "contains" | "equals" | "matches_regex";
  value: string;
  nextNodeId: string;
}

export interface FlowNode {
  id: string;
  type:
    | "message"
    | "question"
    | "option"
    | "condition"
    | "ai_response"
    | "faq"
    | "human_handoff"
    | "end";
  title: string;
  config: {
    text?: string;
    options?: FlowOption[];
    conditions?: FlowCondition[];
    defaultNextNodeId?: string;
    faqCategory?: string;
    faqSearchQuery?: string;
    aiPromptContext?: string;
    handoffReason?: string;
  };
  position?: { x: number; y: number };
}

export interface WhatsAppFlow {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: "draft" | "published" | "inactive";
  isActive: boolean;
  trigger: {
    type: "first_message" | "keyword" | "faq_match" | "all_inbound";
    keywords?: string[];
    exactMatch?: boolean;
  };
  startNodeId: string;
  nodes: FlowNode[];
  createdAt: number;
  updatedAt: number;
  createdByName?: string;
  createdByEmail?: string;
}

export interface WhatsAppFAQ {
  id: string;
  category: string;
  question: string;
  questionHi?: string;
  questionEn?: string;
  answer: string;
  answerHi?: string;
  answerEn?: string;
  alternativeKeywords: string[];
  keywords?: string[];
  isActive: boolean;
  status?: "draft" | "published" | "inactive";
  priority?: number;
  usageCount?: number;
  lastUsedAt?: number;
  lastMatchedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface FlowSession {
  sessionId: string;
  waId: string;
  conversationId: string;
  flowId: string;
  currentNodeId: string;
  stepCount: number;
  variables: Record<string, any>;
  lastInteractionAt: number;
  status: "active" | "completed" | "handed_off" | "terminated";
}

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string;
  text: string;
  category: string;
}

export interface WhatsAppAutomationSettings {
  flowAutomationEnabled?: boolean;
  geminiModel: string;
  aiModel?: string;
  fallbackReply: string;
  defaultHandoffMessage?: string;
  handoffKeywords: string[];
  sessionTimeoutMinutes?: number;
  businessHoursEnabled: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  outOfHoursReply?: string;
  updatedAt?: number;
}

// In-memory runtime caches for fast processing
export const flowCache = new Map<string, WhatsAppFlow>();
export const faqCache = new Map<string, WhatsAppFAQ>();
export const flowSessionCache = new Map<string, FlowSession>();
export const quickReplyCache = new Map<string, QuickReply>();
export const templateCache = new Map<string, any>();
export const userNewsSessionCache = new Map<string, any>();

const WHATSAPP_FLOWS_FILE = path.join(process.cwd(), "whatsapp_flows_db.json");
const WHATSAPP_FAQS_FILE = path.join(process.cwd(), "whatsapp_faqs_db.json");
const WHATSAPP_FLOW_SESSIONS_FILE = path.join(process.cwd(), "whatsapp_flow_sessions_db.json");
const WHATSAPP_QUICK_REPLIES_FILE = path.join(process.cwd(), "whatsapp_quick_replies_db.json");
const WHATSAPP_SETTINGS_FILE = path.join(process.cwd(), "whatsapp_automation_settings.json");
const WHATSAPP_TEMPLATES_FILE = path.join(process.cwd(), "whatsapp_templates_db.json");
const WHATSAPP_NEWS_SESSIONS_FILE = path.join(process.cwd(), "whatsapp_news_sessions_db.json");

export const DEFAULT_SEEDED_TEMPLATES: Record<string, any> = {
  news_broadcast_v1: {
    id: "tpl_news_broadcast_v1",
    name: "news_broadcast_v1",
    category: "MARKETING",
    language: "hi",
    status: "MOCK_APPROVED",
    components: [
      {
        type: "HEADER",
        format: "IMAGE",
        example: { header_handle: ["https://ainewsmaker.online/og-image.jpg"] },
      },
      {
        type: "BODY",
        text: "🚨 *{{1}}*\n\n{{2}}\n\n✨ अपनी पसंदीदा न्यूज़ का ग्राफिक तुरंत तैयार करें।",
        example: { body_text: [["मध्य प्रदेश में भारी बारिश का अलर्ट", "मौसम विभाग ने 15 जिलों में भारी बारिश की चेतावनी जारी की है।"]] },
      },
      {
        type: "FOOTER",
        text: "AI News Maker - आधिकारिक समाचार सेवा",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "इस खबर से ग्राफिक बनाएं",
            url: "https://ainewsmaker.online/studio{{1}}",
            example: ["?newsId=sample_123"],
          },
        ],
      },
    ],
    last_updated_time: 1731300000000,
    createdAt: 1731300000000,
  },
  profile_otp: {
    id: "tpl_profile_otp",
    name: "profile_otp",
    category: "AUTHENTICATION",
    language: "en_US",
    status: "APPROVED",
    components: [
      {
        type: "BODY",
        text: "🔐 *AI NEWS MAKER - WhatsApp सत्यापन OTP*\n\nआपका 6-अंकों का वेरिफिकेशन कोड है: *{{1}}*\n\nयह कोड {{2}} मिनट के लिए वैध है। सुरक्षा कारणों से यह OTP किसी के साथ साझा न करें।\n\n— AI News Maker (ainewsmaker.online)",
        example: { body_text: [["482910", "5"]] },
      },
    ],
    last_updated_time: 1731300000000,
    createdAt: 1731300000000,
  },
  breaking_news_alert: {
    id: "tpl_breaking_news_alert",
    name: "breaking_news_alert",
    category: "MARKETING",
    language: "hi",
    status: "APPROVED",
    components: [
      {
        type: "HEADER",
        format: "IMAGE",
        example: { header_handle: ["https://ainewsmaker.online/og-image.jpg"] },
      },
      {
        type: "BODY",
        text: "🔴 *ब्रेकिंग न्यूज़*\n\n🚨 *{{1}}*\n\n{{2}}\n\n✨ 1-क्लिक में सोशल मीडिया ग्राफिक बनाएं।",
        example: { body_text: [["विशेष समाचार बुलेटिन", "लाइव अपडेट प्राप्त करें।"]] },
      },
      {
        type: "FOOTER",
        text: "AI News Maker (ब्रेकिंग न्यूज़ वाला)",
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "URL",
            text: "इस खबर से ग्राफिक बनाएं",
            url: "https://ainewsmaker.online/studio{{1}}",
            example: ["?newsId=breaking_sample"],
          },
        ],
      },
    ],
    last_updated_time: 1731300000000,
    createdAt: 1731300000000,
  },
};

export const DEFAULT_SEEDED_FLOWS: WhatsAppFlow[] = [
  {
    id: "flow_welcome_menu",
    name: "मुख्य मेनू और स्वागत फ्लो (Welcome & Main Menu)",
    description: "नए ग्राहकों एवं हाय/हेलो पर मुख्य सहायता मेनू प्रस्तुत करता है।",
    version: 1,
    status: "published",
    isActive: true,
    trigger: {
      type: "first_message",
      keywords: ["hi", "hello", "hey", "नमस्ते", "namaste", "menu", "मेनू", "start", "मदद", "सहायता"],
      exactMatch: false,
    },
    startNodeId: "node_welcome",
    nodes: [
      {
        id: "node_welcome",
        type: "message",
        title: "स्वागत संदेश",
        config: {
          text: "🙏 *नमस्कार! AI News Maker (BREAKING NEWS WALA) में आपका स्वागत है।*\n\nहम पत्रकारों और डिजिटल मीडिया के लिए भारत का अग्रणी AI-पावर्ड न्यूज़ स्टूडियो हैं।",
          defaultNextNodeId: "node_menu_options",
        },
        position: { x: 100, y: 100 },
      },
      {
        id: "node_menu_options",
        type: "option",
        title: "मुख्य मेनू विकल्प",
        config: {
          text: "कृपया नीचे दिए गए विकल्पों में से कोई एक संख्या लिखकर भेजें:\n\n1️⃣ *AI News Maker क्या है?*\n2️⃣ *मुख्य सेवाएँ एवं फीचर्स*\n3️⃣ *ग्राफिक कैसे बनाएँ?*\n4️⃣ *वीडियो रील्स कैसे बनाएँ?*\n5️⃣ *प्लान एवं मूल्य (Pricing)*\n6️⃣ *सहायता प्रतिनिधि से बात करें (Live Agent)*",
          options: [
            { id: "opt_1", label: "1. AI News Maker क्या है?", keyword: "1", nextNodeId: "node_what_is" },
            { id: "opt_2", label: "2. मुख्य सेवाएँ एवं फीचर्स", keyword: "2", nextNodeId: "node_services" },
            { id: "opt_3", label: "3. ग्राफिक कैसे बनाएँ?", keyword: "3", nextNodeId: "node_graphic_guide" },
            { id: "opt_4", label: "4. वीडियो रील्स कैसे बनाएँ?", keyword: "4", nextNodeId: "node_video_guide" },
            { id: "opt_5", label: "5. प्लान एवं मूल्य", keyword: "5", nextNodeId: "node_plans" },
            { id: "opt_6", label: "6. सहायता प्रतिनिधि", keyword: "6", nextNodeId: "node_handoff" },
          ],
          defaultNextNodeId: "node_faq_fallback",
        },
        position: { x: 100, y: 250 },
      },
      {
        id: "node_what_is",
        type: "message",
        title: "AI News Maker परिचय",
        config: {
          text: "📰 *AI News Maker (BREAKING NEWS WALA) क्या है?*\n\nयह पत्रकारों, सोशल मीडिया क्रिएटर्स और न्यूज़ चैनलों के लिए विशेष AI स्टूडियो है। केवल खबर का टेक्स्ट पेस्ट करके टीवी स्टाइल 50+ फ्रेम्स में 4:5 एवं 9:16 ग्राफिक्स और HD वीडियो 1 मिनट में तैयार करें।\n\n🌐 वेबसाइट: https://ainewsmaker.online",
          defaultNextNodeId: "node_end",
        },
        position: { x: -200, y: 450 },
      },
      {
        id: "node_services",
        type: "message",
        title: "मुख्य सेवाएँ",
        config: {
          text: "⚡ *मुख्य सेवाएँ:*\n1. 50+ टीवी स्टाइल न्यूज़ फ्रेम्स\n2. AI हेडलाइन और बुलेटिन जनरेटर\n3. वॉइसओवर और म्यूजिक के साथ वीडियो रील्स\n4. e-Paper सोशल मीडिया कार्ड्स\n5. कस्टम चैनल लोगो और फॉन्ट्स\n\n🌐 देखें: https://ainewsmaker.online/#features",
          defaultNextNodeId: "node_end",
        },
        position: { x: -50, y: 450 },
      },
      {
        id: "node_graphic_guide",
        type: "message",
        title: "ग्राफिक गाइड",
        config: {
          text: "🎨 *ग्राफिक कैसे बनाएँ:*\n1. https://ainewsmaker.online पर लॉगिन करें।\n2. 'स्टूडियो' टैब खोलें।\n3. खबर का टेक्स्ट दर्ज करें, AI हेडलाइन चुनें।\n4. मनपसंद फ्रेम चुनकर 'डाउनलोड' पर क्लिक करें।",
          defaultNextNodeId: "node_end",
        },
        position: { x: 100, y: 450 },
      },
      {
        id: "node_video_guide",
        type: "message",
        title: "वीडियो गाइड",
        config: {
          text: "🎬 *वीडियो रील्स कैसे बनाएँ:*\n1. स्टूडियो में 'वीडियो स्टूडियो' चुनें।\n2. खबर का विवरण डालें और AI वॉइसओवर जनरेट करें।\n3. 9:16 या 4:5 रेश्यो में रेंडर पर क्लिक करें।\n4. 30 सेकंड में HD वीडियो तैयार!",
          defaultNextNodeId: "node_end",
        },
        position: { x: 250, y: 450 },
      },
      {
        id: "node_plans",
        type: "message",
        title: "प्लान और कॉइन्स",
        config: {
          text: "💳 *प्लान और रिचार्ज:*\n- *Basic Desk*: शुरुआती पत्रकारों के लिए मानक फ्रेम्स और 50 कार्ड्स दैनिक।\n- *VIP Desk*: असीमित AI हेडलाइन रीजनरेशन, कस्टम फॉन्ट और 4K वीडियो सपोर्ट।\n\n🌐 वॉलेट रिचार्ज: https://ainewsmaker.online/#plans",
          defaultNextNodeId: "node_end",
        },
        position: { x: 400, y: 450 },
      },
      {
        id: "node_faq_fallback",
        type: "faq",
        title: "FAQ मिलान या AI उत्तर",
        config: {
          defaultNextNodeId: "node_end",
        },
        position: { x: 550, y: 450 },
      },
      {
        id: "node_handoff",
        type: "human_handoff",
        title: "मानव सहायता ट्रांसफर",
        config: {
          text: "नमस्ते! आपका अनुरोध हमारी सहायता टीम को भेज दिया गया है। हमारे प्रतिनिधि जल्द ही आपसे यहाँ संपर्क करेंगे।",
          handoffReason: "user_selected_human",
        },
        position: { x: 700, y: 450 },
      },
      {
        id: "node_end",
        type: "end",
        title: "फ्लो समाप्त",
        config: {
          text: "किसी अन्य सहायता के लिए आप कभी भी संदेश लिख सकते हैं या मेनू देखने के लिए 'MENU' लिखें।",
        },
        position: { x: 200, y: 650 },
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdByName: "Master Admin",
  },
  {
    id: "flow_account_support",
    name: "अकाउंट और लॉगिन सहायता (Account & Login Support)",
    description: "लॉगिन, पासवर्ड या ब्लॉक खाता संबंधी सहायता प्रदान करता है।",
    version: 1,
    status: "published",
    isActive: true,
    trigger: {
      type: "keyword",
      keywords: ["login", "लॉगिन", "पासवर्ड", "password", "अकाउंट", "खाता", "ब्लॉक", "blocked"],
      exactMatch: false,
    },
    startNodeId: "node_account_q",
    nodes: [
      {
        id: "node_account_q",
        type: "question",
        title: "समस्या का प्रकार",
        config: {
          text: "🔐 *अकाउंट सहायता केंद्र*\n\nआपकी समस्या किस प्रकार की है? कृपया विकल्प नंबर लिखकर भेजें:\n1️⃣ पासवर्ड भूल गए या रीसेट करना है\n2️⃣ खाता ब्लॉक (Account Blocked) संदेश आ रहा है\n3️⃣ Google लॉगिन में समस्या\n4️⃣ सहायता प्रतिनिधि से सीधे बात करनी है",
          defaultNextNodeId: "node_account_cond",
        },
        position: { x: 100, y: 100 },
      },
      {
        id: "node_account_cond",
        type: "condition",
        title: "शर्त एवं शाखा",
        config: {
          conditions: [
            { operator: "contains", value: "1", nextNodeId: "node_pw_reset" },
            { operator: "contains", value: "2", nextNodeId: "node_blocked_info" },
            { operator: "contains", value: "3", nextNodeId: "node_google_login" },
            { operator: "contains", value: "4", nextNodeId: "node_handoff_agent" },
          ],
          defaultNextNodeId: "node_handoff_agent",
        },
        position: { x: 100, y: 250 },
      },
      {
        id: "node_pw_reset",
        type: "message",
        title: "पासवर्ड रीसेट विधि",
        config: {
          text: "🔑 *पासवर्ड रीसेट करने की विधि:*\n1. https://ainewsmaker.online खोलें।\n2. 'लॉगिन' बटन पर क्लिक करें।\n3. 'पासवर्ड भूल गए?' (Forgot Password) लिंक पर क्लिक करके अपना पंजीकृत ईमेल दर्ज करें।\n4. आपके ईमेल पर रीसेट लिंक प्राप्त होगा।",
          defaultNextNodeId: "node_acc_end",
        },
        position: { x: -100, y: 400 },
      },
      {
        id: "node_blocked_info",
        type: "message",
        title: "ब्लॉक खाता प्रक्रिया",
        config: {
          text: "⚠️ *खाता ब्लॉक स्थिति:*\nसुरक्षा कारणों अथवा नियमों के उल्लंघन के कारण ब्लॉक किए गए खातों की समीक्षा व्यवस्थापक द्वारा की जाती है। कृपया अपना पंजीकृत ईमेल और मोबाइल नंबर यहाँ भेजें ताकि हमारी अनुपालन टीम आपके मामले की जाँच कर सके।",
          defaultNextNodeId: "node_handoff_agent",
        },
        position: { x: 100, y: 400 },
      },
      {
        id: "node_google_login",
        type: "message",
        title: "Google लॉगिन सहायता",
        config: {
          text: "🌐 *Google लॉगिन सहायता:*\nकृपया सुनिश्चित करें कि आप उसी Google खाते से 'Continue with Google' कर रहे हैं जिससे आपने पहली बार खाता बनाया था। ब्राउज़र का कैश (Cache) साफ़ करके पुनः प्रयास करें।",
          defaultNextNodeId: "node_acc_end",
        },
        position: { x: 300, y: 400 },
      },
      {
        id: "node_handoff_agent",
        type: "human_handoff",
        title: "प्रतिनिधि को सौंपें",
        config: {
          text: "नमस्ते! हमने आपकी अकाउंट संबंधी समस्या सहायता प्रतिनिधि को अग्रेषित कर दी है। कृपया अपने पंजीकृत ईमेल का उल्लेख यहाँ कर दें।",
          handoffReason: "account_support_handoff",
        },
        position: { x: 500, y: 400 },
      },
      {
        id: "node_acc_end",
        type: "end",
        title: "समाप्त",
        config: {
          text: "AI News Maker सहायता केंद्र से जुड़ने के लिए धन्यवाद।",
        },
        position: { x: 200, y: 600 },
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdByName: "Master Admin",
  },
];

export const DEFAULT_SEEDED_FAQS: WhatsAppFAQ[] = [
  {
    id: "faq_account_login",
    category: "Account Support",
    question: "मेरा अकाउंट लॉगिन नहीं हो रहा है।",
    questionEn: "My account is not logging in.",
    answer: "कृपया अपना पंजीकृत ईमेल और लॉगिन विवरण जाँचें। यदि आप पासवर्ड भूल गए हैं, तो लॉगिन स्क्रीन पर 'पासवर्ड रीसेट' लिंक का उपयोग करें। यदि आपका खाता ब्लॉक किया गया है, तो कृपया 'AGENT' लिखकर सहायता केंद्र से संपर्क करें।",
    answerEn: "Please verify your registered email and credentials. Use 'Forgot Password' on the login screen if needed. If your account is blocked, text AGENT to contact human support.",
    alternativeKeywords: ["Login Problem", "अकाउंट नहीं खुल रहा", "लॉगिन समस्या", "पासवर्ड समस्या", "पासवर्ड भूल गया", "login issue", "login help", "forgot password", "reset password", "password"],
    isActive: true,
    priority: 1,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "faq_what_is",
    category: "General Info",
    question: "AI News Maker क्या है?",
    questionEn: "What is AI News Maker?",
    answer: "AI News Maker भारत का पहला विशेष AI-पावर्ड डिजिटल न्यूज़ स्टूडियो है, जिसे पत्रकारों, न्यूज़ पोर्टल्स और सोशल मीडिया क्रिएटर्स के लिए डिज़ाइन किया गया है। इसके माध्यम से आप बिना किसी ग्राफिक डिज़ाइनर के केवल 7 चरणों में ब्रेकिंग न्यूज़, टीवी स्टाइल न्यूज़ ग्राफिक्स, AI हेडलाइंस, वॉइसओवर और HD वीडियो रील्स तैयार कर सकते हैं।\n\n🌐 वेबसाइट: https://ainewsmaker.online",
    answerEn: "AI News Maker is India's leading AI news graphic and video studio tailored for journalists, reporters, and media creators to create TV-style news cards and video reels in 7 easy steps.",
    alternativeKeywords: ["what is ai news maker", "ai news maker kya hai", "क्या है", "परिचय", "सॉफ्टवेयर क्या है", "about"],
    isActive: true,
    priority: 2,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "faq_services",
    category: "Features & Tools",
    question: "AI News Maker की मुख्य सेवाएँ क्या हैं?",
    questionEn: "What are the main services and features of AI News Maker?",
    answer: "⚡ मुख्य सेवाएँ:\n1. 7-Step Quick News Maker: टीवी चैनल जैसे 50+ रेडी-टू-यूज़ न्यूज़ फ्रेम्स।\n2. AI हेडलाइन व बुलेटिन जेनरेटर: खबरों के लिए आकर्षक और वायरल हेडलाइंस।\n3. AI वीडियो स्टूडियो व रील्स: ऑटो वॉइसओवर व डायनामिक एनिमेशन के साथ वीडियो न्यूज़।\n4. e-Paper & सोशल मीडिया पोस्ट: Facebook, Instagram, Twitter और WhatsApp के लिए परफेक्ट साइज।\n5. कस्टम चैनल ब्रांडिंग: आपका चैनल लोगो, नाम, फॉन्ट और कलर्स।\n\n🌐 अधिक जानकारी: https://ainewsmaker.online/#features",
    answerEn: "Main services: 50+ TV-style news frames, AI headline generation, video reels with auto-voiceover, e-paper cards, and custom channel branding.",
    alternativeKeywords: ["सेवाएँ", "सुविधाएँ", "services", "features", "सुविधाएं", "टूल्स"],
    isActive: true,
    priority: 3,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "faq_pricing",
    category: "Billing & Plans",
    question: "प्लान और कॉइन्स की कीमत क्या है?",
    questionEn: "What are the pricing and plans?",
    answer: "💳 AI News Maker दो मुख्य श्रेणियों में उपलब्ध है:\n- *Basic Desk*: शुरुआती संवाददाताओं के लिए 50 कार्ड्स दैनिक व मानक फ्रेम्स।\n- *VIP Desk*: वरिष्ठ संपादकों के लिए अनलिमिटेड AI हेडलाइन रीजनरेशन, कस्टम फॉन्ट अपलोड, 4K रेंडरिंग और प्राथमिकता सपोर्ट।\n\n🌐 प्लान विवरण एवं तत्काल रिचार्ज: https://ainewsmaker.online/#plans",
    answerEn: "We offer Basic Desk for daily reporting and VIP Desk with unlimited AI headline regeneration, custom fonts, 4K video rendering, and priority support.",
    alternativeKeywords: ["plans", "pricing", "मूल्य", "रेट", "कॉइन्स", "coins", "कीमत", "योजना", "प्लान", "plan", "सब्सक्रिप्शन", "subscription", "दाम"],
    isActive: true,
    priority: 4,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "faq_how_to_graphic",
    category: "Studio Help",
    question: "न्यूज़ ग्राफिक कैसे बनाएँ?",
    questionEn: "How to make a news graphic?",
    answer: "🎨 AI News Maker पर ग्राफिक कैसे बनाएँ:\n1. https://ainewsmaker.online पर जाएँ और लॉगिन करें।\n2. 'स्टूडियो' टैब पर क्लिक करें।\n3. अपनी खबर का मुख्य विवरण और स्थान दर्ज करें।\n4. AI जनरेटेड हेडलाइंस में से उपयुक्त शीर्षक चुनें।\n5. मनपसंद न्यूज़ फ्रेम और तस्वीर चुनें।\n6. 'ग्राफिक डाउनलोड' पर क्लिक करें और HD इमेज सेकंडों में प्राप्त करें।",
    answerEn: "To make a graphic: login at ainewsmaker.online, open Studio tab, enter news text, choose an AI headline and frame, then download your graphic.",
    alternativeKeywords: ["graphic kaise banaye", "how to make graphic", "ग्राफिक कैसे बनाएँ", "फोटो कैसे बनाएँ", "कार्ड कैसे बनाएँ"],
    isActive: true,
    priority: 5,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "faq_human_support",
    category: "Human Support",
    question: "कस्टमर केयर या मानव एजेंट से कैसे संपर्क करें?",
    questionEn: "How to connect with a human support agent?",
    answer: "👤 आप कभी भी इस चैट में *'AGENT'* या *'प्रतिनिधि'* लिखकर भेज सकते हैं। हमारे सपोर्ट एग्जीक्यूटिव तुरंत आपसे लाइव चैट पर जुड़ जाएँगे। सहायता का समय: सुबह 9:00 से रात 10:00 तक।",
    answerEn: "Type AGENT or HUMAN in this chat anytime to directly connect with our customer support executives.",
    alternativeKeywords: ["agent", "human", "support", "कस्टमर केयर", "प्रतिनिधि", "बात करनी है", "सहायता टीम", "कस्टमर सपोर्ट"],
    isActive: true,
    priority: 6,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const DEFAULT_SEEDED_QUICK_REPLIES: QuickReply[] = [
  {
    id: "qr_welcome",
    title: "स्वागत संदेश",
    shortcut: "/welcome",
    category: "General",
    text: "🙏 नमस्कार! AI News Maker में आपका स्वागत है। बताइए, हम आपकी क्या सहायता कर सकते हैं?",
  },
  {
    id: "qr_plans",
    title: "प्लान्स व रिचार्ज जानकारी",
    shortcut: "/plans",
    category: "Billing",
    text: "💳 हमारे सभी प्लान्स और कॉइन पैकेजेस की जानकारी https://ainewsmaker.online/#plans पर उपलब्ध है। आप सीधे UPI द्वारा रिचार्ज कर सकते हैं।",
  },
  {
    id: "qr_reset",
    title: "पासवर्ड रीसेट लिंक",
    shortcut: "/reset",
    category: "Account",
    text: "🔑 कृपया लॉगिन स्क्रीन पर 'पासवर्ड भूल गए?' पर क्लिक करके अपना ईमेल दर्ज करें। रीसेट लिंक आपके इनबॉक्स में प्राप्त होगी।",
  },
  {
    id: "qr_hold",
    title: "जाँच हेतु प्रतीक्षा",
    shortcut: "/hold",
    category: "Support",
    text: "⏳ कृपया थोड़ा समय दें, हम आपके खाते और विवरण की पुष्टि कर रहे हैं।",
  },
  {
    id: "qr_bye",
    title: "धन्यवाद व समापन",
    shortcut: "/bye",
    category: "General",
    text: "🙏 AI News Maker से संपर्क करने के लिए धन्यवाद! यदि आपको पुनः सहायता की आवश्यकता हो तो कभी भी संदेश भेज सकते हैं।",
  },
];

export const DEFAULT_AUTOMATION_SETTINGS: WhatsAppAutomationSettings = {
  flowAutomationEnabled: true,
  geminiModel: "gemini-3.5-flash",
  aiModel: "gemini-3.5-flash",
  fallbackReply: "नमस्ते! आपका संदेश हमें मिल गया है। हमारे सहायता प्रतिनिधि जल्द ही आपसे यहाँ संपर्क करेंगे।",
  defaultHandoffMessage: "नमस्ते! आपका संदेश हमें मिल गया है। हमारे सहायता प्रतिनिधि जल्द ही आपसे यहाँ संपर्क करेंगे।",
  handoffKeywords: ["agent", "human", "support", "person", "executive", "मानव", "व्यक्ति", "प्रतिनिधि", "कस्टमर केयर", "सहायता टीम", "कस्टमर सपोर्ट", "बात करनी है"],
  sessionTimeoutMinutes: 30,
  businessHoursEnabled: false,
  businessHoursStart: "09:00",
  businessHoursEnd: "22:00",
  outOfHoursReply: "नमस्ते! हमारे सहायता केंद्र का कार्य समय समाप्त हो गया है। हमारी टीम कार्य समय में आपके संदेश का उत्तर देगी।",
};

export function loadFlowsDatabase(): WhatsAppFlow[] {
  try {
    if (fs.existsSync(WHATSAPP_FLOWS_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_FLOWS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err: any) {
    console.error("[WhatsApp:Flows] Error reading flows file:", err.message);
  }
  saveFlowsDatabase(DEFAULT_SEEDED_FLOWS);
  return DEFAULT_SEEDED_FLOWS;
}

export function saveFlowsDatabase(flows: WhatsAppFlow[], centralDb?: any): boolean {
  try {
    fs.writeFileSync(WHATSAPP_FLOWS_FILE, JSON.stringify(flows, null, 2), "utf-8");
    for (const f of flows) {
      flowCache.set(f.id, f);
      if (centralDb?.useFirestore) {
        centralDb.writeDoc("whatsapp_flows", f.id, f).catch(() => {});
      }
    }
    return true;
  } catch (err: any) {
    console.error("[WhatsApp:Flows] Error writing flows file:", err.message);
    return false;
  }
}

export function loadFaqsDatabase(): WhatsAppFAQ[] {
  try {
    if (fs.existsSync(WHATSAPP_FAQS_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_FAQS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err: any) {
    console.error("[WhatsApp:FAQs] Error reading faqs file:", err.message);
  }
  saveFaqsDatabase(DEFAULT_SEEDED_FAQS);
  return DEFAULT_SEEDED_FAQS;
}

export function saveFaqsDatabase(faqs: WhatsAppFAQ[], centralDb?: any): boolean {
  try {
    fs.writeFileSync(WHATSAPP_FAQS_FILE, JSON.stringify(faqs, null, 2), "utf-8");
    for (const f of faqs) {
      faqCache.set(f.id, f);
      if (centralDb?.useFirestore) {
        centralDb.writeDoc("whatsapp_faqs", f.id, f).catch(() => {});
        if (f.isActive) {
          centralDb.writeDoc("whatsapp_knowledge_base", `faq_${f.id}`, {
            title: f.question,
            content: f.answer,
            category: f.category,
            isActive: true,
            updatedAt: Date.now(),
          }).catch(() => {});
        }
      }
    }
    return true;
  } catch (err: any) {
    console.error("[WhatsApp:FAQs] Error writing faqs file:", err.message);
    return false;
  }
}

export function loadFlowSessionsDatabase(): Record<string, FlowSession> {
  try {
    if (fs.existsSync(WHATSAPP_FLOW_SESSIONS_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_FLOW_SESSIONS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return {};
}

export function saveFlowSessionsDatabase(sessions: Record<string, FlowSession>, centralDb?: any): boolean {
  try {
    fs.writeFileSync(WHATSAPP_FLOW_SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
    for (const [k, s] of Object.entries(sessions)) {
      flowSessionCache.set(k, s);
      if (centralDb?.useFirestore) {
        centralDb.writeDoc("whatsapp_flow_sessions", k, s).catch(() => {});
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function getActiveFlowSession(conversationId: string): FlowSession | null {
  if (flowSessionCache.has(conversationId)) {
    return flowSessionCache.get(conversationId) || null;
  }
  const all = loadFlowSessionsDatabase();
  const session = all[conversationId];
  if (session) {
    flowSessionCache.set(conversationId, session);
    return session;
  }
  return null;
}

export function saveFlowSession(session: FlowSession, centralDb?: any): void {
  flowSessionCache.set(session.conversationId, session);
  const all = loadFlowSessionsDatabase();
  all[session.conversationId] = session;
  saveFlowSessionsDatabase(all, centralDb);
}

export function clearFlowSession(conversationId: string, centralDb?: any): void {
  flowSessionCache.delete(conversationId);
  const all = loadFlowSessionsDatabase();
  delete all[conversationId];
  saveFlowSessionsDatabase(all, centralDb);
  if (centralDb?.useFirestore && typeof centralDb.deleteDoc === "function") {
    centralDb.deleteDoc("whatsapp_flow_sessions", conversationId).catch(() => {});
  }
}

export function loadQuickRepliesDatabase(): QuickReply[] {
  try {
    if (fs.existsSync(WHATSAPP_QUICK_REPLIES_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_QUICK_REPLIES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  saveQuickRepliesDatabase(DEFAULT_SEEDED_QUICK_REPLIES);
  return DEFAULT_SEEDED_QUICK_REPLIES;
}

export function saveQuickRepliesDatabase(replies: QuickReply[], centralDb?: any): boolean {
  try {
    fs.writeFileSync(WHATSAPP_QUICK_REPLIES_FILE, JSON.stringify(replies, null, 2), "utf-8");
    for (const r of replies) {
      quickReplyCache.set(r.id, r);
      if (centralDb?.useFirestore) {
        centralDb.writeDoc("whatsapp_quick_replies", r.id, r).catch(() => {});
      }
    }
    return true;
  } catch {
    return false;
  }
}

export function loadAutomationSettings(): WhatsAppAutomationSettings {
  try {
    if (fs.existsSync(WHATSAPP_SETTINGS_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_SETTINGS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return DEFAULT_AUTOMATION_SETTINGS;
}

export function saveAutomationSettings(settings: WhatsAppAutomationSettings, centralDb?: any): boolean {
  try {
    fs.writeFileSync(WHATSAPP_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    if (centralDb?.useFirestore) {
      centralDb.writeDoc("system_config", "whatsapp_automation_settings", settings).catch(() => {});
    }
    return true;
  } catch {
    return false;
  }
}

export function loadTemplatesDatabase(centralDb?: any): Record<string, any> {
  const result: Record<string, any> = { ...DEFAULT_SEEDED_TEMPLATES };
  try {
    if (fs.existsSync(WHATSAPP_TEMPLATES_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_TEMPLATES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.assign(result, parsed);
      }
    }
  } catch (err: any) {
    console.error("[WhatsApp:Templates] Error reading templates file:", err?.message || err);
  }
  return result;
}

export function saveTemplatesDatabase(templates: Record<string, any>, centralDb?: any): boolean {
  try {
    fs.writeFileSync(WHATSAPP_TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
    if (centralDb?.useFirestore && typeof centralDb.writeDoc === "function") {
      for (const [id, t] of Object.entries(templates)) {
        centralDb.writeDoc("whatsapp_templates", id, t).catch(() => {});
      }
    }
    return true;
  } catch (err: any) {
    console.error("[WhatsApp:Templates] Error saving templates file:", err?.message || err);
    return false;
  }
}

export function loadNewsSessionsDatabase(centralDb?: any): Record<string, any> {
  const result: Record<string, any> = {};
  try {
    if (fs.existsSync(WHATSAPP_NEWS_SESSIONS_FILE)) {
      const raw = fs.readFileSync(WHATSAPP_NEWS_SESSIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        Object.assign(result, parsed);
      }
    }
  } catch (err: any) {
    console.error("[WhatsApp:NewsSessions] Error reading news sessions file:", err?.message || err);
  }
  return result;
}

export function saveNewsSessionsDatabase(sessions: Record<string, any>, centralDb?: any): boolean {
  try {
    fs.writeFileSync(WHATSAPP_NEWS_SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
    if (centralDb?.useFirestore && typeof centralDb.writeDoc === "function") {
      for (const [waId, s] of Object.entries(sessions)) {
        centralDb.writeDoc("whatsapp_news_sessions", waId, s).catch(() => {});
      }
    }
    return true;
  } catch (err: any) {
    console.error("[WhatsApp:NewsSessions] Error saving news sessions file:", err?.message || err);
    return false;
  }
}

export function getActivePublishedFlows(): WhatsAppFlow[] {
  const all = loadFlowsDatabase();
  return all.filter((f) => f && f.status === "published" && f.isActive !== false);
}

export function getFlowById(id: string): WhatsAppFlow | null {
  const all = loadFlowsDatabase();
  return all.find((f) => f.id === id) || null;
}

export function getActiveFaqs(): WhatsAppFAQ[] {
  const all = loadFaqsDatabase();
  return all.filter((f) => f && f.isActive !== false);
}

export function getFaqById(id: string): WhatsAppFAQ | null {
  const all = loadFaqsDatabase();
  return all.find((f) => f.id === id) || null;
}

export function incrementFaqUsage(id: string, centralDb?: any): void {
  const all = loadFaqsDatabase();
  const faq = all.find((f) => f.id === id);
  if (faq) {
    faq.usageCount = Number(faq.usageCount || 0) + 1;
    faq.lastUsedAt = Date.now();
    saveFaqsDatabase(all, centralDb);
  }
}

// ============================================================================
// WHATSAPP MATCHING ENGINES (FLOW TRIGGER & FAQ MATCHER)
// ============================================================================

export function matchFAQ(queryText: string, faqs: WhatsAppFAQ[]): { faq: WhatsAppFAQ; score: number } | null {
  const cleanQuery = (queryText || "").toLowerCase().trim();
  if (!cleanQuery) return null;

  const normalizedQuery = cleanQuery.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?]/g, " ").replace(/\s+/g, " ").trim();
  const queryTokens = normalizedQuery.split(" ").filter((t) => t.length > 1);

  let bestMatch: WhatsAppFAQ | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    if (faq.isActive === false) continue;

    // 1. Direct alternative keyword match
    const keywordsList = (faq.alternativeKeywords || faq.keywords || []);
    for (const kw of keywordsList) {
      const cleanKw = (kw || "").toLowerCase().trim();
      if (!cleanKw) continue;
      if (cleanQuery === cleanKw || normalizedQuery === cleanKw) {
        return { faq, score: 100 };
      }
      if (normalizedQuery.includes(cleanKw) || cleanKw.includes(normalizedQuery)) {
        const score = 80 + Math.min(20, (cleanKw.length / Math.max(normalizedQuery.length, 1)) * 20);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = faq;
        }
      }
    }

    // 2. Question text similarity via token overlap
    const qStr = (faq.question || faq.questionHi || "").toLowerCase();
    const normQ = qStr.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?]/g, " ").replace(/\s+/g, " ").trim();
    const qTokens = normQ.split(" ").filter((t) => t.length > 1);
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (qTokens.includes(token)) matchedTokens++;
    }
    const tokenScore = queryTokens.length > 0 ? (matchedTokens / queryTokens.length) * 70 : 0;
    if (tokenScore > bestScore && tokenScore >= 40) {
      bestScore = tokenScore;
      bestMatch = faq;
    }

    // 3. English question match
    if (faq.questionEn) {
      const normQEn = faq.questionEn.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?]/g, " ").replace(/\s+/g, " ").trim();
      if (normalizedQuery.includes(normQEn) || normQEn.includes(normalizedQuery)) {
        if (75 > bestScore) {
          bestScore = 75;
          bestMatch = faq;
        }
      }
    }
  }

  if (bestMatch && bestScore >= 45) {
    return { faq: bestMatch, score: Math.round(bestScore) };
  }
  return null;
}

export function matchFlowTrigger(
  messageText: string,
  isFirstMessage: boolean,
  flows: WhatsAppFlow[]
): WhatsAppFlow | null {
  const cleanText = (messageText || "").toLowerCase().trim();
  const normalizedText = cleanText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()।?]/g, " ").replace(/\s+/g, " ").trim();

  // 1. Keyword triggers on active published flows
  for (const flow of flows) {
    if (flow.status !== "published" || !flow.isActive) continue;
    if (flow.trigger?.type === "keyword" && Array.isArray(flow.trigger.keywords)) {
      for (const kw of flow.trigger.keywords) {
        const cleanKw = (kw || "").toLowerCase().trim();
        if (!cleanKw) continue;
        if (flow.trigger.exactMatch) {
          if (cleanText === cleanKw || normalizedText === cleanKw) return flow;
        } else {
          if (cleanText.includes(cleanKw) || cleanKw.includes(cleanText)) return flow;
        }
      }
    }
  }

  // 2. First message trigger
  if (isFirstMessage) {
    const firstMsgFlow = flows.find(
      (f) => f.status === "published" && f.isActive && f.trigger?.type === "first_message"
    );
    if (firstMsgFlow) return firstMsgFlow;
  }

  // 3. Fallback / all_inbound trigger
  const catchAllFlow = flows.find(
    (f) => f.status === "published" && f.isActive && f.trigger?.type === "all_inbound"
  );
  if (catchAllFlow) return catchAllFlow;

  return null;
}

export async function executeFlowNodes(
  flowOrId: WhatsAppFlow | string,
  startNodeIdOrSession: string | FlowSession,
  userInputOrCentralDb?: string | any,
  sessionOrDb?: FlowSession | any,
  centralDbOrAi?: any,
  generateSupportReplyFn?: (query: string) => Promise<{ reply: string | null; reason?: string }>
): Promise<{
  outboundMessages: string[];
  nextSession: FlowSession;
  isPaused: boolean;
  isHandoff: boolean;
  handoffReason?: string;
  isCompleted: boolean;
}> {
  // 1. Resolve flow
  let flow: WhatsAppFlow | undefined;
  if (typeof flowOrId === "string") {
    const flows = loadFlowsDatabase();
    flow = flows.find((f) => f.id === flowOrId);
  } else {
    flow = flowOrId;
  }

  // 2. Resolve polymorphic arguments
  let session: FlowSession;
  let userInput: string = "";
  let centralDb: any;
  let aiFn: ((query: string) => Promise<{ reply: string | null; reason?: string }>) | undefined;
  let currentNodeId = "";

  if (typeof startNodeIdOrSession === "string") {
    // Called as: executeFlowNodes(flowId, startNodeId, userInput, session, centralDb, aiFn)
    currentNodeId = startNodeIdOrSession;
    userInput = typeof userInputOrCentralDb === "string" ? userInputOrCentralDb : "";
    session = sessionOrDb || {
      conversationId: `sim_${Date.now()}`,
      flowId: flow?.id || "",
      currentNodeId,
      variables: {},
      startedAt: Date.now(),
      lastInteractionAt: Date.now(),
      status: "active",
    };
    centralDb = centralDbOrAi;
    aiFn = generateSupportReplyFn;
  } else {
    // Called as: executeFlowNodes(flow, session, userInput, centralDb, aiFn)
    session = startNodeIdOrSession;
    currentNodeId = session.currentNodeId || (flow?.nodes && flow.nodes[0] ? flow.nodes[0].id : "");
    userInput = typeof userInputOrCentralDb === "string" ? userInputOrCentralDb : "";
    centralDb = sessionOrDb;
    aiFn = centralDbOrAi;
  }

  const outboundMessages: string[] = [];

  if (!flow || !Array.isArray(flow.nodes) || flow.nodes.length === 0) {
    return {
      outboundMessages,
      nextSession: { ...session, status: "completed" },
      isPaused: false,
      isHandoff: false,
      isCompleted: true,
    };
  }

  const nodesMap = new Map<string, FlowNode>();
  for (const n of flow.nodes) nodesMap.set(n.id, n);

  let isPaused = false;
  let isHandoff = false;
  let handoffReason = "";
  let isCompleted = false;

  let current = nodesMap.get(currentNodeId);
  if (!current) {
    return {
      outboundMessages,
      nextSession: { ...session, status: "completed" },
      isPaused: false,
      isHandoff: false,
      isCompleted: true,
    };
  }

  // If there is user input and current node was paused waiting for answer:
  if (userInput && (current.type === "question" || current.type === "option" || current.type === "condition")) {
    session.variables[current.id] = userInput;
    session.variables.last_input = userInput;
    session.stepCount++;

    if (current.type === "option") {
      const cleanInput = userInput.trim().toLowerCase();
      let matchedNextId = current.config?.defaultNextNodeId;
      for (const opt of current.config?.options || []) {
        const kw = (opt.keyword || "").trim().toLowerCase();
        const lbl = (opt.label || "").trim().toLowerCase();
        if (cleanInput === kw || cleanInput.includes(kw) || cleanInput.includes(lbl)) {
          matchedNextId = opt.nextNodeId;
          break;
        }
      }
      currentNodeId = matchedNextId || current.config?.defaultNextNodeId || "";
    } else if (current.type === "condition") {
      let matchedNextId = current.config?.defaultNextNodeId;
      for (const cond of current.config?.conditions || []) {
        const val = (cond.value || "").toLowerCase().trim();
        const cleanInput = userInput.toLowerCase().trim();
        let matched = false;
        if (cond.operator === "equals") matched = cleanInput === val;
        else if (cond.operator === "contains") matched = cleanInput.includes(val);
        else if (cond.operator === "matches_regex") {
          try {
            matched = new RegExp(val, "i").test(cleanInput);
          } catch {}
        }
        if (matched) {
          matchedNextId = cond.nextNodeId;
          break;
        }
      }
      currentNodeId = matchedNextId || current.config?.defaultNextNodeId || "";
    } else {
      currentNodeId = current.config?.defaultNextNodeId || "";
    }
  }

  // Execute sequence of nodes until pause or termination
  let iterations = 0;
  while (currentNodeId && iterations < 15) {
    iterations++;
    const node = nodesMap.get(currentNodeId);
    if (!node) {
      isCompleted = true;
      break;
    }

    if (node.type === "message") {
      if (node.config?.text) outboundMessages.push(node.config.text);
      currentNodeId = node.config?.defaultNextNodeId || "";
    } else if (node.type === "question") {
      if (node.config?.text) outboundMessages.push(node.config.text);
      isPaused = true;
      session.currentNodeId = node.id;
      break;
    } else if (node.type === "option") {
      let msg = node.config?.text || "कृपया एक विकल्प चुनें:";
      outboundMessages.push(msg);
      isPaused = true;
      session.currentNodeId = node.id;
      break;
    } else if (node.type === "condition") {
      const lastInput = String(userInput || session.variables.last_input || "").toLowerCase().trim();
      let matchedNext = node.config?.defaultNextNodeId || "";
      for (const cond of node.config?.conditions || []) {
        const val = (cond.value || "").toLowerCase().trim();
        let matched = false;
        if (cond.operator === "equals") matched = lastInput === val;
        else if (cond.operator === "contains") matched = lastInput.includes(val);
        else if (cond.operator === "matches_regex") {
          try {
            matched = new RegExp(val, "i").test(lastInput);
          } catch {}
        }
        if (matched) {
          matchedNext = cond.nextNodeId;
          break;
        }
      }
      currentNodeId = matchedNext;
    } else if (node.type === "ai_response") {
      if (generateSupportReplyFn) {
        const query = userInput || session.variables.last_input || "नमस्ते";
        const aiRes = await generateSupportReplyFn(query);
        if (aiRes.reply) {
          outboundMessages.push(aiRes.reply);
        } else if (aiRes.reason === "knowledge_gap") {
          isHandoff = true;
          handoffReason = "ai_knowledge_gap";
          outboundMessages.push("नमस्ते! आपके सवाल के सटीक उत्तर के लिए हम आपको सहायता प्रतिनिधि से जोड़ रहे हैं।");
          break;
        }
      }
      currentNodeId = node.config?.defaultNextNodeId || "";
    } else if (node.type === "faq") {
      const allFaqs = loadFaqsDatabase();
      const match = matchFAQ(userInput || String(session.variables.last_input || ""), allFaqs);
      if (match) {
        outboundMessages.push(match.faq.answer);
      } else if (node.config?.text) {
        outboundMessages.push(node.config.text);
      }
      currentNodeId = node.config?.defaultNextNodeId || "";
    } else if (node.type === "human_handoff") {
      isHandoff = true;
      handoffReason = node.config?.handoffReason || "flow_handoff_node";
      const handoffText = node.config?.text || "नमस्ते! आपकी बातचीत हमारे सहायता प्रतिनिधि को सौंप दी गई है।";
      outboundMessages.push(handoffText);
      isCompleted = true;
      break;
    } else if (node.type === "end") {
      if (node.config?.text) outboundMessages.push(node.config.text);
      isCompleted = true;
      break;
    } else {
      currentNodeId = node.config?.defaultNextNodeId || "";
    }
  }

  const nextSession: FlowSession = {
    ...session,
    currentNodeId: isPaused ? session.currentNodeId : (isCompleted ? "" : currentNodeId),
    lastInteractionAt: Date.now(),
    status: isHandoff ? "handed_off" : (isCompleted ? "completed" : "active"),
  };

  return {
    outboundMessages,
    nextSession,
    isPaused,
    isHandoff,
    handoffReason,
    isCompleted,
  };
}

/**
 * Phase 1B.1 Issue 2 Remediation: Explicit Meta WhatsApp Message State Machine.
 * Valid state transitions:
 *   pending   -> sent, failed
 *   sent      -> delivered, failed
 *   delivered -> read (strictly terminal against failed, sent, or pending)
 *   read      -> terminal (strictly terminal against failed, delivered, sent, or pending)
 *   failed    -> terminal (strictly terminal against any other status)
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["sent", "failed"],
  sent: ["delivered", "failed"],
  delivered: ["read"],
  read: [],
  failed: [],
};

export const isValidStatusTransition = (currentStatus: string, incomingStatus: string): boolean => {
  const current = String(currentStatus || "pending").toLowerCase().trim();
  const incoming = String(incomingStatus || "").toLowerCase().trim();
  if (current === incoming) return false; // Duplicate callback
  const allowed = VALID_STATUS_TRANSITIONS[current];
  return Array.isArray(allowed) && allowed.includes(incoming);
};

export const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
};

/**
 * Phase 1B.1 / 1B.2 Hardened: Acquires an atomic dispatch reservation for an AI message.
 * Coordinates human takeover and AI dispatch through a transaction-safe state transition.
 * Verifies that the conversation is in 'ai' mode and has not been taken over by an operator.
 * Safely handles expired reservations by allowing a new worker to reclaim the lease.
 */
export const acquireAiDispatchReservation = async (
  conversationId: string,
  centralDb: any
): Promise<{ acquired: boolean; reservationId?: string; reason?: string }> => {
  const now = Date.now();
  const reservationId = randomUUID();
  const leaseDurationMs = 15000; // 15-second reservation lease

  // 1. Transactional reservation if Firestore transaction is available
  if (centralDb?.useFirestore && typeof centralDb.beginTransaction === "function") {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let tx: any = null;
      try {
        const attemptNow = Date.now();
        tx = await centralDb.beginTransaction();
        if (tx?.success && tx.transaction) {
          const current = await centralDb._readDocInTransaction("whatsapp_conversations", conversationId, tx.transaction);
          const data = current?.data || {};
          const handlingMode = data.handlingMode || "ai";

          if (handlingMode === "human" || handlingMode === "waiting_human") {
            await centralDb.rollbackTransaction(tx.transaction);
            return { acquired: false, reason: `conversation_in_${handlingMode}_mode` };
          }

          // Check if an active non-expired reservation exists from another worker
          const existingReservation = data.aiDispatchReservation;
          if (existingReservation && Number(existingReservation.expiresAt || 0) > attemptNow) {
            await centralDb.rollbackTransaction(tx.transaction);
            return { acquired: false, reason: "active_reservation_conflict" };
          }

          if (existingReservation && Number(existingReservation.expiresAt || 0) <= attemptNow) {
            console.log(`[WhatsApp:Reservation] Reclaiming expired AI dispatch reservation ${existingReservation.reservationId} (expired ${attemptNow - Number(existingReservation.expiresAt)}ms ago) on ${conversationId}`);
          }

          const newReservation = {
            reservationId,
            reservedAt: attemptNow,
            expiresAt: attemptNow + leaseDurationMs,
          };

          const updatedData = {
            ...data,
            aiDispatchReservation: newReservation,
            conversationVersion: Number(data.conversationVersion || 0) + 1,
            updatedAt: attemptNow,
          };

          const fields: any = {};
          for (const [key, value] of Object.entries(updatedData)) {
            if (value !== undefined) fields[key] = centralDb._toFirestoreField(value);
          }
          const name = `projects/${centralDb.projectId}/databases/${centralDb.databaseId}/documents/whatsapp_conversations/${conversationId}`;
          const write: any = { update: { name, fields } };
          if (current.updateTime) {
            write.currentDocument = { updateTime: current.updateTime };
          }
          const committed = await centralDb.commitTransaction(tx.transaction, [write]);
          if (committed?.success) {
            conversationCache.set(conversationId, updatedData);
            return { acquired: true, reservationId };
          } else {
            if (attempt < maxRetries - 1) {
              const jitter = Math.floor(Math.random() * 50);
              await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
              continue;
            }
            return { acquired: false, reason: "transaction_conflict" };
          }
        }
      } catch (txErr: any) {
        if (tx?.transaction) {
          await centralDb.rollbackTransaction(tx.transaction).catch(() => {});
        }
        if (attempt < maxRetries - 1) {
          const jitter = Math.floor(Math.random() * 50);
          await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + jitter));
          continue;
        }
        return { acquired: false, reason: "transaction_error" };
      }
    }
  }

  // 2. Direct Firestore read/write fallback or in-memory cache check (used only when transactions are unsupported)
  let convDoc: any = null;
  if (centralDb?.readDoc) {
    try {
      const cRes = await centralDb.readDoc("whatsapp_conversations", conversationId);
      if (cRes?.success && cRes.data) convDoc = cRes.data;
    } catch {}
  }
  if (!convDoc && conversationCache.has(conversationId)) {
    convDoc = conversationCache.get(conversationId);
  }

  const currentMode = convDoc?.handlingMode || "ai";
  if (currentMode === "human" || currentMode === "waiting_human") {
    return { acquired: false, reason: `conversation_in_${currentMode}_mode` };
  }

  const existingRes = convDoc?.aiDispatchReservation;
  if (existingRes && Number(existingRes.expiresAt || 0) > now) {
    return { acquired: false, reason: "active_reservation_conflict" };
  }

  if (existingRes && Number(existingRes.expiresAt || 0) <= now) {
    console.log(`[WhatsApp:Reservation] Reclaiming expired AI dispatch reservation ${existingRes.reservationId} (expired ${now - Number(existingRes.expiresAt)}ms ago) on ${conversationId}`);
  }

  const reservation = {
    reservationId,
    reservedAt: now,
    expiresAt: now + leaseDurationMs,
  };

  const updated = {
    ...convDoc,
    aiDispatchReservation: reservation,
    conversationVersion: Number(convDoc?.conversationVersion || 0) + 1,
    updatedAt: now,
  };

  if (centralDb?.writeDoc) {
    await centralDb.writeDoc("whatsapp_conversations", conversationId, updated).catch(() => {});
  }
  conversationCache.set(conversationId, updated);
  return { acquired: true, reservationId };
};

/**
 * Phase 1B.1 / 1B.2 Hardened: Releases an acquired AI dispatch reservation.
 * Verifies reservation ownership: cannot clear another worker's newer reservation.
 */
export const releaseAiDispatchReservation = async (
  conversationId: string,
  reservationId: string,
  centralDb: any
): Promise<{ released: boolean; reason?: string }> => {
  if (!reservationId) {
    return { released: false, reason: "missing_reservation_id" };
  }

  // 1. Transactional release if Firestore transaction is available
  if (centralDb?.useFirestore && typeof centralDb.beginTransaction === "function") {
    let tx: any = null;
    try {
      tx = await centralDb.beginTransaction();
      if (tx?.success && tx.transaction) {
        const current = await centralDb._readDocInTransaction("whatsapp_conversations", conversationId, tx.transaction);
        const data = current?.data || {};
        const currentRes = data.aiDispatchReservation;

        if (!currentRes) {
          await centralDb.rollbackTransaction(tx.transaction);
          return { released: false, reason: "no_active_reservation" };
        }

        if (currentRes.reservationId !== reservationId) {
          console.warn(`[WhatsApp:Reservation] Refusing to release reservation: worker ${reservationId} tried to release newer/different reservation ${currentRes.reservationId}`);
          await centralDb.rollbackTransaction(tx.transaction);
          return { released: false, reason: "reservation_id_mismatch" };
        }

        const updatedData = {
          ...data,
          aiDispatchReservation: null,
          updatedAt: Date.now(),
        };

        const fields: any = {};
        for (const [key, value] of Object.entries(updatedData)) {
          if (value !== undefined) fields[key] = centralDb._toFirestoreField(value);
        }
        const name = `projects/${centralDb.projectId}/databases/${centralDb.databaseId}/documents/whatsapp_conversations/${conversationId}`;
        const write: any = { update: { name, fields } };
        if (current.updateTime) {
          write.currentDocument = { updateTime: current.updateTime };
        }
        const committed = await centralDb.commitTransaction(tx.transaction, [write]);
        if (committed?.success) {
          conversationCache.set(conversationId, updatedData);
          return { released: true };
        }
      }
    } catch (txErr: any) {
      if (tx?.transaction) {
        await centralDb.rollbackTransaction(tx.transaction).catch(() => {});
      }
      console.warn("[WhatsApp:Reservation] Transactional release failed, falling back to direct check:", txErr?.message || txErr);
    }
  }

  // 2. Direct Firestore fallback
  let convDoc: any = null;
  if (centralDb?.readDoc) {
    try {
      const cRes = await centralDb.readDoc("whatsapp_conversations", conversationId);
      if (cRes?.success && cRes.data) convDoc = cRes.data;
    } catch {}
  }
  if (!convDoc && conversationCache.has(conversationId)) {
    convDoc = conversationCache.get(conversationId);
  }

  const currentRes = convDoc?.aiDispatchReservation;
  if (!currentRes) {
    return { released: false, reason: "no_active_reservation" };
  }

  if (currentRes.reservationId !== reservationId) {
    console.warn(`[WhatsApp:Reservation] Refusing to release reservation: worker ${reservationId} tried to release newer/different reservation ${currentRes.reservationId}`);
    return { released: false, reason: "reservation_id_mismatch" };
  }

  const updated = {
    ...convDoc,
    aiDispatchReservation: null,
    updatedAt: Date.now(),
  };
  if (centralDb?.writeDoc) {
    await centralDb.writeDoc("whatsapp_conversations", conversationId, updated).catch(() => {});
  }
  conversationCache.set(conversationId, updated);
  return { released: true };
};

/**
 * Phase 1B: Records a persistent audit event for WhatsApp conversation actions
 * (e.g. mode changes, operator assignment, operator replies).
 */
export const recordAuditEvent = async (
  centralDb: any,
  event: {
    conversationId: string;
    eventType: string;
    previousValue?: any;
    newValue?: any;
    actorId: string;
    actorType: "customer" | "operator" | "system";
    metadata?: any;
  }
) => {
  const auditId = `audit_${Date.now()}_${randomBytes(4).toString("hex")}`;
  const record = {
    auditId,
    timestamp: Date.now(),
    ...event,
  };
  if (centralDb?.writeDoc) {
    await centralDb.writeDoc("whatsapp_audit_events", auditId, record).catch(() => {});
  }
  return record;
};

/**
 * Phase 1B: Processes Meta WhatsApp delivery status webhook callbacks
 * (sent, delivered, read, failed). Enforces idempotent updates, explicit state machine transitions,
 * and strictly prevents regression of delivered or read states from late/duplicate callbacks.
 */
export const processDeliveryStatus = async (
  statusUpdate: any,
  centralDb: any,
  requireWriteFn?: (col: string, id: string, data: any) => Promise<any>
) => {
  const metaMessageId = String(statusUpdate?.id || "").trim();
  const rawStatus = String(statusUpdate?.status || "").toLowerCase().trim();
  if (!metaMessageId || !rawStatus) {
    return { success: false, reason: "missing_id_or_status" };
  }

  const validStatuses = ["sent", "delivered", "read", "failed"];
  if (!validStatuses.includes(rawStatus)) {
    return { success: false, reason: "unsupported_status" };
  }

  const statusTimestamp = Number(statusUpdate.timestamp || Math.floor(Date.now() / 1000)) * 1000;
  const docId = sha256(metaMessageId);
  const eventDedupeId = sha256(`status_${metaMessageId}_${rawStatus}`);

  // 1. Idempotency check via whatsapp_webhook_events
  if (centralDb?.readDoc) {
    try {
      const existingEvent = await centralDb.readDoc("whatsapp_webhook_events", eventDedupeId);
      if (existingEvent?.success && existingEvent.data?.status === "processed") {
        return { success: true, duplicate: true, metaMessageId, status: rawStatus };
      }
    } catch {}
  }

  // 2. Fetch existing message record
  let existingMsg: any = null;
  let actualDocId = docId;
  if (centralDb?.readDoc) {
    try {
      const mRes = await centralDb.readDoc("whatsapp_messages", docId);
      if (mRes?.success && mRes.data) {
        existingMsg = mRes.data;
      }
    } catch {}
  }

  if (!existingMsg && messageCache.has(docId)) {
    existingMsg = messageCache.get(docId);
  }

  if (!existingMsg) {
    for (const [k, v] of messageCache.entries()) {
      if (v.metaMessageId === metaMessageId || v.messageId === metaMessageId) {
        existingMsg = v;
        actualDocId = k;
        break;
      }
    }
  }

  if (!existingMsg) {
    console.log(`[WhatsApp:Status] Unknown messageId ${metaMessageId} received with status ${rawStatus}; recording event safely`);
    if (centralDb?.writeDoc) {
      await centralDb.writeDoc("whatsapp_webhook_events", eventDedupeId, {
        metaMessageId,
        status: "processed",
        messageNotFound: true,
        rawStatus,
        receivedAt: Date.now(),
      }).catch(() => {});
    }
    return { success: true, messageFound: false, metaMessageId, status: rawStatus };
  }

  // 3. Phase 1B.1 Issue 2 Remediation: Explicit State Machine Transition Validation
  const currentStatus = String(existingMsg.status || "pending").toLowerCase().trim();

  // 3a. Duplicate callback detection
  if (currentStatus === rawStatus) {
    console.log(`[WhatsApp:Status] Duplicate status callback ignored for ${metaMessageId}: already in status '${currentStatus}'`);
    if (centralDb?.writeDoc) {
      await centralDb.writeDoc("whatsapp_webhook_events", eventDedupeId, {
        metaMessageId,
        status: "processed",
        ignoredReason: "duplicate_status_callback",
        receivedAt: Date.now(),
      }).catch(() => {});
    }
    return { success: true, duplicate: true, currentStatus, incomingStatus: rawStatus };
  }

  // 3b. State machine validation (Preserves delivered and read from late failed/sent callbacks)
  const isTransitionValid = isValidStatusTransition(currentStatus, rawStatus);
  if (!isTransitionValid) {
    console.log(`[WhatsApp:Status] Invalid status transition rejected for ${metaMessageId}: '${currentStatus}' -> '${rawStatus}' (terminal or regression prevented)`);
    if (centralDb?.writeDoc) {
      await centralDb.writeDoc("whatsapp_webhook_events", eventDedupeId, {
        metaMessageId,
        status: "processed",
        ignoredReason: `invalid_transition_${currentStatus}_to_${rawStatus}`,
        receivedAt: Date.now(),
      }).catch(() => {});
    }
    return {
      success: true,
      ignored: true,
      reason: "invalid_transition_prevented",
      currentStatus,
      incomingStatus: rawStatus,
    };
  }

  // 4. Update message record
  const writeFn = requireWriteFn || ((col: string, id: string, data: any) => centralDb.writeDoc(col, id, data));
  const updatedMsg = {
    ...existingMsg,
    status: rawStatus,
    statusTimestamp,
    deliveryStatusUpdatedAt: Date.now(),
  };

  if (rawStatus === "failed") {
    updatedMsg.failureDetails = statusUpdate.errors || statusUpdate.error || [{ message: "Delivery failed" }];
  }

  await writeFn("whatsapp_messages", actualDocId, updatedMsg);
  messageCache.set(actualDocId, updatedMsg);

  // 5. Update parent conversation document if available
  const conversationId = existingMsg.conversationId;
  if (conversationId && centralDb) {
    try {
      const convRes = await centralDb.readDoc("whatsapp_conversations", conversationId);
      const convData = convRes?.success && convRes.data ? convRes.data : {};
      const updatedConv = {
        ...convData,
        lastMessageStatus: rawStatus,
        updatedAt: Date.now(),
      };
      await writeFn("whatsapp_conversations", conversationId, updatedConv).catch(() => {});
      if (conversationCache.has(conversationId)) {
        conversationCache.set(conversationId, { ...conversationCache.get(conversationId), ...updatedConv });
      }
    } catch (err: any) {
      console.warn("[WhatsApp:Status] Error updating conversation status:", err?.message || err);
    }
  }

  // 6. Record deduplication event in whatsapp_webhook_events
  if (centralDb?.writeDoc) {
    await centralDb.writeDoc("whatsapp_webhook_events", eventDedupeId, {
      metaMessageId,
      status: "processed",
      appliedStatus: rawStatus,
      processedAt: Date.now(),
    }).catch(() => {});
  }

  console.log(`[WhatsApp:Status] Message ${metaMessageId} status transitioned: ${currentStatus} -> ${rawStatus}`);
  return { success: true, updated: true, metaMessageId, previousStatus: currentStatus, newStatus: rawStatus };
};

/**
 * Task B & C: Canonical international phone normalization.
 * Normalizes numbers with country codes into standard E.164 without leading '+'.
 * Examples: '9876543210', '+91' -> '919876543210', '+1 555-706-1955' -> '15557061955'.
 */
export const normalizeToWaId = (rawPhone: string, defaultCountryCode: string = "+91"): string => {
  let cleaned = String(rawPhone || "").trim().replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  const defCC = String(defaultCountryCode || "+91").replace(/\D/g, "") || "91";

  // Standard 10-digit number
  if (/^\d{10}$/.test(cleaned)) {
    return `${defCC}${cleaned}`;
  }
  // Leading 0 on 10-digit Indian number (e.g. 09876543210)
  if (cleaned.startsWith("0") && /^\d{11}$/.test(cleaned) && defCC === "91") {
    return `91${cleaned.slice(1)}`;
  }
  return cleaned;
};

/**
 * Task B & Remediation 1A.1: Synchronizes WhatsApp STOP/UNSUBSCRIBE across both whatsapp_subscribers AND matching users collection records.
 * Reconciles legacy subscriber document IDs (both canonical E.164 SHA-256 and legacy candidate hashes),
 * revokes consent across all matching subscriber documents without leaving orphaned opt-ins,
 * and updates matching users collection records using country-aware normalized phone matching.
 * Idempotent, safe, and updates centralDb cache.
 */
export const syncWhatsAppOptOut = async (waId: string, reason: string = "inbound_whatsapp_stop", centralDb: any) => {
  const normWaId = normalizeToWaId(waId);
  if (!normWaId) return { success: false, reason: "empty_waid" };
  const canonicalDocId = createHash("sha256").update(normWaId).digest("hex");
  const now = Date.now();

  const subData = {
    waId: normWaId,
    newsAlertsConsent: false,
    whatsappBreakingNewsConsent: false,
    whatsappProductUpdatesConsent: false,
    whatsappMarketingConsent: false,
    whatsappMarketingConsentRevokedAt: now,
    newsAlertsOptedOutAt: now,
    optOutReason: reason,
    updatedAt: now,
  };

  // 1. Identify all legacy and canonical subscriber document IDs
  const targetDocIds = new Set<string>();
  targetDocIds.add(canonicalDocId);

  // Generate candidate legacy document IDs that might have been stored
  const candidateLegacyIds = new Set<string>();
  const rawTrimmed = String(waId || "").trim();
  if (rawTrimmed) {
    candidateLegacyIds.add(createHash("sha256").update(rawTrimmed).digest("hex"));
  }
  const cleanDigits = rawTrimmed.replace(/\D/g, "");
  if (cleanDigits) {
    candidateLegacyIds.add(createHash("sha256").update(cleanDigits).digest("hex"));
  }
  if (normWaId.startsWith("91") && normWaId.length === 12) {
    const clean10 = normWaId.slice(2);
    candidateLegacyIds.add(createHash("sha256").update(clean10).digest("hex"));
    candidateLegacyIds.add(createHash("sha256").update(`+91${clean10}`).digest("hex"));
    candidateLegacyIds.add(createHash("sha256").update(`+91 ${clean10}`).digest("hex"));
    candidateLegacyIds.add(createHash("sha256").update(`+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}`).digest("hex"));
    candidateLegacyIds.add(createHash("sha256").update(`0${clean10}`).digest("hex"));
  }

  // Scan existing subscriber documents if centralDb can list them
  if (centralDb?.listDocs) {
    try {
      const subRes = await centralDb.listDocs("whatsapp_subscribers", 1000);
      for (const s of subRes?.documents || []) {
        if (!s || !s.id) continue;
        const sWa = s.waId || s.phone || s.normalizedPhone || "";
        const sNorm = sWa ? normalizeToWaId(sWa) : "";
        if (candidateLegacyIds.has(s.id) || (sNorm && sNorm === normWaId)) {
          targetDocIds.add(s.id);
        }
      }
    } catch (listErr: any) {
      console.warn("[WhatsApp:Consent] Warning scanning whatsapp_subscribers:", listErr?.message || listErr);
    }
  } else if (centralDb?.readDoc) {
    // Probe candidate legacy IDs
    for (const candId of candidateLegacyIds) {
      try {
        const candRes = await centralDb.readDoc("whatsapp_subscribers", candId);
        if (candRes?.success && candRes?.data) {
          targetDocIds.add(candId);
        }
      } catch {}
    }
  }

  // Revoke consent across ALL identified subscriber documents (canonical + legacy)
  const updatedDocIds: string[] = [];
  if (centralDb?.writeDoc) {
    for (const docId of targetDocIds) {
      await centralDb.writeDoc("whatsapp_subscribers", docId, subData).catch((err: any) => {
        console.error(`[WhatsApp:Consent] Error writing to whatsapp_subscribers doc (${docId}):`, err?.message || err);
      });
      updatedDocIds.push(docId);
    }
  }

  // 2. Identify and update all matching user accounts in Firestore & cache
  const updatedUserEmails: string[] = [];
  try {
    const userDocs = centralDb?.cache?.users
      ? Array.from(centralDb.cache.users.values())
      : (await centralDb?.listDocs("users", 500))?.documents || [];

    for (const u of userDocs) {
      if (!u || !u.email) continue;
      const uEmail = u.email.toLowerCase().trim();

      // Check verified WhatsApp ID match
      const isDirectWaMatch = Boolean(u.linkedWhatsAppWaId && normalizeToWaId(u.linkedWhatsAppWaId) === normWaId);

      // Check verified primary / whatsapp / mobile number match with country code awareness
      const uCountry = u.countryCode || "+91";
      const uWaNorm = normalizeToWaId(u.whatsappNumber || "", uCountry);
      const uPrimaryNorm = normalizeToWaId(u.primaryNumber || u.mobileNumber || u.primaryPhone || u.mobile || "", uCountry);
      const isPhoneMatch = Boolean((uWaNorm && uWaNorm === normWaId) || (uPrimaryNorm && uPrimaryNorm === normWaId));

      if (isDirectWaMatch || isPhoneMatch) {
        const userUpdates = {
          ...u,
          whatsappBreakingNewsConsent: false,
          newsAlertsConsent: false,
          whatsappProductUpdatesConsent: false,
          whatsappMarketingConsent: false,
          whatsappMarketingConsentRevokedAt: now,
          whatsappOptedOutAt: now,
          whatsappOptOutReason: reason,
          updatedAt: now,
        };

        if (centralDb?.writeDoc) {
          await centralDb.writeDoc("users", uEmail, userUpdates).catch(() => {});
        }
        if (centralDb?.cache?.users) {
          centralDb.cache.users.set(uEmail, userUpdates);
        }
        updatedUserEmails.push(uEmail);
      }
    }
  } catch (err: any) {
    console.error("[WhatsApp:Consent] Error syncing user record for opt-out:", err?.message || err);
  }

  console.log(`[WhatsApp:Consent] Opt-out synced for waId ${maskWaId(normWaId)}. Sub docs updated: [${updatedDocIds.join(", ")}]. Users updated: [${updatedUserEmails.map(maskWaId).join(", ")}]`);
  return { success: true, conversationId: canonicalDocId, normWaId, targetDocIds: updatedDocIds, updatedUserEmails };
};

/**
 * Task C: Atomically checks and claims a WhatsApp phone number for an account.
 * Prevents duplicate WhatsApp phone number ownership across multiple user accounts.
 * Returns { conflict: true, existingEmail, errorCode: "PHONE_ALREADY_LINKED" } if already linked to another active account.
 */
export const claimVerifiedPhoneNumber = async (cleanPhone: string, countryCode: string, email: string, centralDb: any) => {
  const normWaId = normalizeToWaId(cleanPhone, countryCode);
  const targetEmail = String(email || "").toLowerCase().trim();
  if (!normWaId || !targetEmail) return { success: false, error: "Invalid phone or email" };

  const registryDocId = `phone_${normWaId}`;
  const now = Date.now();

  // 1. In-memory pre-check against existing verified users
  if (centralDb?.cache?.users) {
    for (const [existingEmail, u] of centralDb.cache.users.entries()) {
      if (existingEmail.toLowerCase() === targetEmail) continue;
      const isVerified = Boolean(u.whatsappVerified || u.primaryMobileVerified || (u.whatsappLinkStatus === "linked" && u.linkedWhatsAppWaId));
      if (!isVerified) continue;
      const uCountry = u.countryCode || "+91";
      const uNorm = normalizeToWaId(u.whatsappNumber || u.primaryNumber || u.mobileNumber || u.primaryPhone || "", uCountry);
      const uLinkedWaId = u.linkedWhatsAppWaId ? normalizeToWaId(u.linkedWhatsAppWaId) : "";
      if ((uNorm && uNorm === normWaId) || (uLinkedWaId && uLinkedWaId === normWaId)) {
        return {
          conflict: true,
          existingEmail,
          errorCode: "PHONE_ALREADY_LINKED",
          reason: "cache_verified_user_conflict"
        };
      }
    }
  }

  // 2. Transactional claim on whatsapp_phone_registry if Firestore is enabled
  if (centralDb?.useFirestore && typeof centralDb.beginTransaction === "function") {
    const tx = await centralDb.beginTransaction();
    if (tx?.success && tx.transaction) {
      try {
        const existingReg = await centralDb._readDocInTransaction("whatsapp_phone_registry", registryDocId, tx.transaction);
        if (existingReg?.success && existingReg.data && existingReg.data.status === "active") {
          const ownerEmail = (existingReg.data.verifiedEmail || "").toLowerCase().trim();
          if (ownerEmail && ownerEmail !== targetEmail) {
            await centralDb.rollbackTransaction(tx.transaction);
            return {
              conflict: true,
              existingEmail: ownerEmail,
              errorCode: "PHONE_ALREADY_LINKED",
              reason: "registry_conflict"
            };
          }
        }

        // Write atomic ownership in transaction
        const record = {
          normalizedPhone: normWaId,
          cleanPhone,
          countryCode: countryCode.startsWith("+") ? countryCode : `+${countryCode}`,
          verifiedEmail: targetEmail,
          verifiedAt: now,
          status: "active",
          updatedAt: now,
        };
        const fields: any = {};
        for (const [key, value] of Object.entries(record)) {
          fields[key] = centralDb._toFirestoreField(value);
        }
        const name = `projects/${centralDb.projectId}/databases/${centralDb.databaseId}/documents/whatsapp_phone_registry/${registryDocId}`;
        const write: any = { update: { name, fields } };
        write.currentDocument = (existingReg && existingReg.updateTime)
          ? { updateTime: existingReg.updateTime }
          : { exists: false };

        const committed = await centralDb.commitTransaction(tx.transaction, [write]);
        if (!committed?.success) {
          throw new Error("Could not commit phone registry transaction");
        }
        return { success: true, normalizedPhone: normWaId };
      } catch (err: any) {
        await centralDb.rollbackTransaction(tx.transaction).catch(() => {});
        throw err;
      }
    }
  }

  // Fallback for local / non-transactional mode
  const localDoc = {
    normalizedPhone: normWaId,
    cleanPhone,
    countryCode,
    verifiedEmail: targetEmail,
    verifiedAt: now,
    status: "active",
    updatedAt: now,
  };
  if (centralDb?.writeDoc) {
    await centralDb.writeDoc("whatsapp_phone_registry", registryDocId, localDoc).catch(() => {});
  }
  return { success: true, normalizedPhone: normWaId };
};

/**
 * Task C & Remediation 1A.1: Releases a WhatsApp phone number from whatsapp_phone_registry upon account unlinking.
 * Verifies that the registry entry is actually owned by the requesting email before releasing.
 * Prevents unauthorized release or overwriting of another user's registry claim.
 */
export const releaseVerifiedPhoneNumber = async (cleanPhone: string, countryCode: string, email: string, centralDb: any) => {
  const normWaId = normalizeToWaId(cleanPhone, countryCode);
  const targetEmail = String(email || "").toLowerCase().trim();
  if (!normWaId || !targetEmail) return { success: false, reason: "invalid_phone_or_email" };
  const registryDocId = `phone_${normWaId}`;
  const now = Date.now();

  // Guard: Only release if the registry entry belongs to targetEmail or is already unlinked/not found
  if (centralDb?.readDoc) {
    try {
      const existingReg = await centralDb.readDoc("whatsapp_phone_registry", registryDocId);
      if (existingReg?.success && existingReg?.data) {
        const currentOwner = (existingReg.data.verifiedEmail || "").toLowerCase().trim();
        const currentStatus = existingReg.data.status || "active";
        if (currentOwner && currentOwner !== targetEmail && currentStatus === "active") {
          console.warn(`[WhatsApp:Registry] Security: Refusing to release phone ${maskWaId(normWaId)} owned by ${maskWaId(currentOwner)} on behalf of different user ${maskWaId(targetEmail)}`);
          return {
            success: false,
            conflict: true,
            reason: "owner_mismatch",
            existingOwner: currentOwner,
          };
        }
      }
    } catch (checkErr: any) {
      console.warn("[WhatsApp:Registry] Warning checking existing registry owner before release:", checkErr?.message || checkErr);
    }
  }

  const record = {
    normalizedPhone: normWaId,
    cleanPhone,
    countryCode: countryCode.startsWith("+") ? countryCode : `+${countryCode}`,
    verifiedEmail: null,
    unlinkedByEmail: targetEmail,
    unlinkedAt: now,
    status: "unlinked",
    updatedAt: now,
  };

  if (centralDb?.writeDoc) {
    await centralDb.writeDoc("whatsapp_phone_registry", registryDocId, record).catch((err: any) => {
      console.warn("[WhatsApp:Registry] Error releasing phone registry doc:", err?.message || err);
    });
  }
  console.log(`[WhatsApp:Registry] Released phone ${maskWaId(normWaId)} from account ${maskWaId(targetEmail)}`);
  return { success: true, normalizedPhone: normWaId };
};

export function registerWhatsAppIntegration(
  app: any,
  centralDb: any,
  options?: {
    requireAdminMiddleware?: any;
    requireAuthMiddleware?: any;
    requireMasterAdminMiddleware?: any;
    getNewsDatabase?: () => any[];
    getApprovedEditorialDatabase?: () => any;
    getUsersDatabase?: () => any[];
    getProfilesDatabase?: () => any;
    getDynamicFramesDatabase?: () => any[];
    getAssetLibrariesDatabase?: () => any[];
    getCloudStorage?: () => any;
  }
) {
  const webhookPath = "/api/whatsapp/webhook";

  // Task A: Fallback admin guard if not injected via options
  const requireAdmin = options?.requireAdminMiddleware || ((req: any, res: any, next: any) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        success: false,
        error: "प्रमाणीकरण आवश्यक है (401 Unauthorized): कृपया वैध टोकन के साथ लॉगिन करें।",
      });
    }
    const role = (authUser.role || "").toLowerCase();
    const email = (authUser.email || "").toLowerCase();
    const isMaster = email === "breakingnewswala.com@gmail.com" || email === "breakingnewsvala.com@gmail.com";
    if (role !== "admin" && role !== "superadmin" && !isMaster) {
      return res.status(403).json({
        success: false,
        error: "अनधिकृत (403 Forbidden): इस कार्य के लिए व्यवस्थापक (Admin) अधिकार आवश्यक हैं।",
      });
    }
    next();
  });

  const requireMasterAdmin = options?.requireMasterAdminMiddleware || ((req: any, res: any, next: any) => {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        success: false,
        error: "प्रमाणीकरण आवश्यक है (401 Unauthorized): कृपया वैध टोकन के साथ लॉगिन करें।",
      });
    }
    const role = (authUser.role || "").toLowerCase();
    const email = (authUser.email || "").toLowerCase().trim();
    const isMaster = email === "breakingnewswala.com@gmail.com" || email === "breakingnewsvala.com@gmail.com";
    if (role !== "superadmin" && !isMaster) {
      return res.status(403).json({
        success: false,
        error: "अनधिकृत (403 Forbidden): इस कार्य के लिए मास्टर व्यवस्थापक (Master Admin) अधिकार आवश्यक हैं।",
      });
    }
    next();
  });

  const getCleanDigits10 = (raw: string) => {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.slice(-10);
  };

  const findUserByWaId = (waId: string) => {
    const cleanTarget = getCleanDigits10(waId);
    if (!cleanTarget || cleanTarget.length < 10) return null;

    if (centralDb?.cache?.users) {
      for (const u of centralDb.cache.users.values()) {
        const uPhone = getCleanDigits10(u.whatsappNumber || u.primaryPhone || u.mobileNumber || u.mobile || u.phone);
        if (uPhone && uPhone === cleanTarget) return u;
      }
    }

    if (options?.getUsersDatabase) {
      try {
        const list = options.getUsersDatabase();
        if (Array.isArray(list)) {
          for (const u of list) {
            const uPhone = getCleanDigits10(u.whatsappNumber || u.primaryPhone || u.mobileNumber || u.mobile || u.phone);
            if (uPhone && uPhone === cleanTarget) return u;
          }
        }
      } catch {}
    }

    return null;
  };

  const isUserVipDesk = (user: any, waId?: string) => {
    let resolvedUser = user;
    if (!resolvedUser && waId) {
      resolvedUser = findUserByWaId(waId);
    }
    if (!resolvedUser) return false;

    const role = (resolvedUser.role || "").toLowerCase().trim();
    const email = (resolvedUser.email || "").toLowerCase().trim();
    const tier = (resolvedUser.tier || "").toLowerCase().trim();
    const planName = (resolvedUser.planName || "").toUpperCase().trim();
    const isVipDeskRole = role === "vip_desk" || resolvedUser.isVipDesk === true || resolvedUser.vipDeskAccess === true;

    // Master admins always have system management access
    if (
      role === "admin" ||
      role === "superadmin" ||
      email === "breakingnewswala.com@gmail.com" ||
      email === "breakingnewsvala.com@gmail.com" ||
      email === "admin.ainewsmaker@gmail.com"
    ) {
      return true;
    }

    // Active VIP Desk role or exclusive VIP plan tier (Pro-only accounts without VIP role are excluded)
    if (isVipDeskRole || tier === "ultra" || tier === "vip" || planName.includes("VIP")) {
      return true;
    }

    if (options?.getProfilesDatabase) {
      try {
        const profiles = options.getProfilesDatabase();
        const prof = profiles[email] || profiles[resolvedUser.id] || profiles[resolvedUser.userId];
        if (prof) {
          const pRole = (prof.role || "").toLowerCase().trim();
          const pTier = (prof.tier || "").toLowerCase().trim();
          const pPlan = (prof.planName || "").toUpperCase().trim();
          const pIsVip = pRole === "vip_desk" || prof.isVipDesk === true || prof.vipDeskAccess === true;
          if (pIsVip || pTier === "ultra" || pTier === "vip" || pPlan.includes("VIP")) {
            return true;
          }
        }
      } catch {}
    }

    return false;
  };

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
    const signature = String(req?.headers?.["x-hub-signature-256"] || "").trim();

    // Phase 1B.2 Fail-Closed Cryptographic Security:
    // 1. Raw body MUST be present as an original unparsed string or Buffer.
    // 2. Reject immediately if rawBody is missing, undefined, null, or empty.
    // 3. NEVER fall back to JSON.stringify(req.body).
    if (!req || !("rawBody" in req) || req.rawBody === undefined || req.rawBody === null) {
      console.warn("[WhatsApp:Inbound] Webhook signature rejected: raw request body is missing or unavailable");
      return false;
    }

    const rawBody = typeof req.rawBody === "string" ? req.rawBody : Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : "";
    if (rawBody.length === 0) {
      console.warn("[WhatsApp:Inbound] Webhook signature rejected: raw request body is empty");
      return false;
    }

    if (!appSecret || !signature.startsWith("sha256=")) {
      console.warn("[WhatsApp:Inbound] Webhook signature rejected: invalid signature format or app secret missing");
      return false;
    }

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
      return { messaging_product: "whatsapp", contacts: [{ input: to, wa_id: to }], messages: [{ id: `wamid.test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }] };
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

  const uploadWhatsAppMedia = async (fileBuffer: Buffer, mimeType: string = "image/jpeg", filename: string = "graphic.jpg") => {
    const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "1474022642460639").trim();
    const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();

    if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    if (!phoneNumberId) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");

    if (process.env.NODE_ENV === "test" || token.startsWith("test_")) {
      console.log(`[WhatsApp:Outbound:TestMode] Mock media upload (${mimeType}, ${fileBuffer.length} bytes)`);
      return { id: `media_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
    }

    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", mimeType);
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append("file", blob, filename);

    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !(result as any)?.id) {
      const errMsg = (result as any)?.error?.message || `WhatsApp Media upload failed (HTTP ${response.status})`;
      throw new Error(`WHATSAPP_MEDIA_UPLOAD_ERROR: ${errMsg}`);
    }
    return result;
  };

  const sendWhatsAppImage = async (to: string, imageUrl: string, caption?: string) => {
    const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "1474022642460639").trim();
    const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
    const maskedTo = maskWaId(to);

    if (!token) throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    if (!phoneNumberId) throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");

    if (process.env.NODE_ENV === "test" || token.startsWith("test_")) {
      console.log(`[WhatsApp:Outbound:TestMode] Mock image send to ${maskedTo}`);
      return { messaging_product: "whatsapp", contacts: [{ input: to, wa_id: to }], messages: [{ id: `wamid.test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }] };
    }

    const isMediaId = !imageUrl.startsWith("http://") && !imageUrl.startsWith("https://");
    const imageObj: any = isMediaId ? { id: imageUrl } : { link: imageUrl };
    if (caption) imageObj.caption = String(caption).slice(0, 1024);

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: imageObj,
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
    if (!response.ok) {
      const errorMsg = (result as any)?.error?.message || `WhatsApp API request failed (${response.status})`;
      throw new Error(`WHATSAPP_API_ERROR: ${errorMsg}`);
    }
    return result;
  };

  const sendWhatsAppNewsBroadcast = async (
    to: string,
    options: {
      headline: string;
      summary?: string;
      imageUrl?: string;
      newsId?: string;
      studioUrl?: string;
      isBreaking?: boolean;
      customMessage?: string;
    }
  ) => {
    const newsTemplate = (process.env.WHATSAPP_NEWS_TEMPLATE || "").trim();
    const newsTemplateLang = (process.env.WHATSAPP_NEWS_TEMPLATE_LANG || "hi").trim();
    const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
    const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || "1474022642460639").trim();
    const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();
    const maskedTo = maskWaId(to);

    const { headline, summary = "", imageUrl = "", newsId = "", studioUrl = "", isBreaking = false, customMessage = "" } = options;
    const resolvedUrl = studioUrl || (newsId ? `https://ainewsmaker.online/studio?newsId=${encodeURIComponent(newsId)}` : "https://ainewsmaker.online/studio");

    // 1. If Meta-Approved News Template is configured, dispatch official interactive URL Button Template message
    if (newsTemplate && token && phoneNumberId) {
      try {
        const templatePayload: any = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: newsTemplate,
            language: { code: newsTemplateLang },
            components: [
              ...(imageUrl ? [{
                type: "header",
                parameters: [{ type: "image", image: { link: imageUrl } }]
              }] : []),
              {
                type: "body",
                parameters: [
                  { type: "text", text: (headline || "").slice(0, 120) },
                  { type: "text", text: (summary || headline || "").slice(0, 500) }
                ]
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  { type: "text", text: newsId ? `?newsId=${encodeURIComponent(newsId)}` : "" }
                ]
              }
            ]
          }
        };

        if (process.env.NODE_ENV === "test" || token.startsWith("test_")) {
          console.log(`[WhatsApp:NewsBroadcast:TestMode] Mock template message dispatched via interactive URL button to ${maskedTo}`);
          return {
            method: "meta_template_url_button",
            templateName: newsTemplate,
            result: { messaging_product: "whatsapp", contacts: [{ input: to, wa_id: to }], messages: [{ id: `wamid.tpl_${Date.now()}` }] },
          };
        }

        const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(templatePayload),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result?.messages?.[0]?.id) {
          console.log(`[WhatsApp:NewsBroadcast] Template message dispatched via interactive URL button to ${maskedTo}`);
          return { method: "meta_template_url_button", templateName: newsTemplate, result };
        }
        console.warn(`[WhatsApp:NewsBroadcast] Template ${newsTemplate} rejected (${response.status}):`, JSON.stringify(result));
      } catch (err: any) {
        console.warn(`[WhatsApp:NewsBroadcast] Template send exception:`, err?.message);
      }
    }

    // 2. Free-form / Active session message fallback with structured rich caption & clickable ordinary text link
    let caption = "";
    if (isBreaking) caption += `🔴 *ब्रेकिंग न्यूज़ — तुरंत ग्राफिक बनाएं*\n\n`;
    if (headline) caption += `🚨 *${headline.trim()}*\n\n`;
    if (summary) caption += `${summary.trim()}\n\n`;
    if (customMessage) caption += `${customMessage.trim()}\n\n`;
    caption += `✨ *इस खबर से ग्राफिक बनाएं (वेबसाइट लिंक):*\n${resolvedUrl}\n\n`;
    caption += `_AI News Maker (ब्रेकिंग न्यूज़ वाला) - आधिकारिक समाचार सेवा_\n_नोटिफिकेशन रोकने के लिए STOP लिखें_`;

    if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
      try {
        const imgRes = await sendWhatsAppImage(to, imageUrl, caption.slice(0, 1024));
        return { method: "fallback_media_text_url", result: imgRes };
      } catch {
        const txtRes = await sendWhatsAppText(to, caption);
        return { method: "fallback_text_only_url", result: txtRes };
      }
    }
    const txtRes = await sendWhatsAppText(to, caption);
    return { method: "fallback_text_only_url", result: txtRes };
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

    // Attempt sending via Meta Authentication Templates (supports Body-only, Copy-code button, URL button)
    const candidateTemplates = Array.from(new Set([templateName, "profile_otp", "auth_otp", "otp_verification", "verification_code"])).filter(Boolean);
    const candidateLangs = Array.from(new Set([templateLang, "en_US", "en", "hi"])).filter(Boolean);

    let lastError: any = null;

    for (const tName of candidateTemplates) {
      for (const tLang of candidateLangs) {
        // Variation 0: Approved Meta 'profile_otp' template (5 body parameters + 1 URL button parameter)
        if (tName === "profile_otp") {
          try {
            const payloadProfileOtp: any = {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to,
              type: "template",
              template: {
                name: "profile_otp",
                language: { code: tLang || "en_US" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: String(otpCode) },
                      { type: "text", text: "verification" },
                      { type: "text", text: `${validityMinutes} minutes` },
                      { type: "text", text: "+919669802408" },
                      { type: "text", text: "+919669802408" }
                    ]
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

            const resProfile = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payloadProfileOtp),
            });

            const resultProfile = await resProfile.json().catch(() => ({}));
            if (resProfile.ok && resultProfile?.messages?.[0]?.id) {
              console.log(`[WhatsApp:OTP] Template OTP sent successfully via 'profile_otp' (${tLang}): id=${resultProfile.messages[0].id}`);
              return resultProfile;
            }
            lastError = resultProfile?.error || resultProfile;
          } catch (err: any) {
            lastError = err;
          }
        }

        // Variation 1: Body-only parameter (Most compatible for custom approved templates)
        try {
          const payloadBodyOnly: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "template",
            template: {
              name: tName,
              language: { code: tLang },
              components: [
                {
                  type: "body",
                  parameters: [{ type: "text", text: String(otpCode) }]
                }
              ]
            }
          };

          const res1 = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadBodyOnly),
          });

          const result1 = await res1.json().catch(() => ({}));
          if (res1.ok && result1?.messages?.[0]?.id) {
            console.log(`[WhatsApp:OTP] Template OTP sent successfully via '${tName}' (${tLang}) [body-only]: id=${result1.messages[0].id}`);
            return result1;
          }
          lastError = result1?.error || result1;
        } catch (err: any) {
          lastError = err;
        }

        // Variation 2: Copy-Code Button parameter (Official Meta Authentication template schema)
        try {
          const payloadCopyCode: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "template",
            template: {
              name: tName,
              language: { code: tLang },
              components: [
                {
                  type: "body",
                  parameters: [{ type: "text", text: String(otpCode) }]
                },
                {
                  type: "button",
                  sub_type: "copy_code",
                  index: "0",
                  parameters: [{ type: "coupon_code", text: String(otpCode) }]
                }
              ]
            }
          };

          const res2 = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadCopyCode),
          });

          const result2 = await res2.json().catch(() => ({}));
          if (res2.ok && result2?.messages?.[0]?.id) {
            console.log(`[WhatsApp:OTP] Template OTP sent successfully via '${tName}' (${tLang}) [copy_code]: id=${result2.messages[0].id}`);
            return result2;
          }
          lastError = result2?.error || result2;
        } catch (err: any) {
          lastError = err;
        }

        // Variation 3: URL Button parameter
        try {
          const payloadUrlBtn: any = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "template",
            template: {
              name: tName,
              language: { code: tLang },
              components: [
                {
                  type: "body",
                  parameters: [{ type: "text", text: String(otpCode) }]
                },
                {
                  type: "button",
                  sub_type: "url",
                  index: "0",
                  parameters: [{ type: "text", text: String(otpCode) }]
                }
              ]
            }
          };

          const res3 = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payloadUrlBtn),
          });

          const result3 = await res3.json().catch(() => ({}));
          if (res3.ok && result3?.messages?.[0]?.id) {
            console.log(`[WhatsApp:OTP] Template OTP sent successfully via '${tName}' (${tLang}) [url_button]: id=${result3.messages[0].id}`);
            return result3;
          }
          lastError = result3?.error || result3;
        } catch (err: any) {
          lastError = err;
        }
      }
    }

    console.warn(`[WhatsApp:OTP] All Meta template attempts failed for ${maskedTo}. Last error:`, JSON.stringify(lastError));

    // Fallback to direct session text message if session exists
    try {
      console.log("[WhatsApp:OTP] Attempting direct formatted text message as final fallback...");
      return await sendWhatsAppText(to, fallbackTextMessage);
    } catch (sessionErr: any) {
      console.error("[WhatsApp:OTP] Session fallback text failed:", sessionErr?.message);
      throw new Error(`WhatsApp OTP प्रेषण विफल: Meta टेम्पलेट स्वीकृत नहीं हुआ (${lastError?.message || 'अमान्य टेम्पलेट कॉन्फ़िगरेशन'})`);
    }
  };

  const getKnowledgeContext = async (): Promise<{ context: string; count: number; errorCategory?: string }> => {
    const docs: Array<{ title: string; content: string }> = [];

    // 1. Ingest active FAQs from local/cached FAQ database
    try {
      const activeFaqs = loadFaqsDatabase(centralDb).filter((f) => f.isActive && f.status === "published");
      for (const faq of activeFaqs) {
        const title = faq.questionHi || faq.questionEn;
        const kwStr = Array.isArray(faq.keywords) && faq.keywords.length > 0 ? ` (कीवर्ड्स: ${faq.keywords.join(", ")})` : "";
        const content = `${faq.answerHi || faq.answerEn}${kwStr}`;
        if (title && content) docs.push({ title, content });
      }
    } catch (e: any) {
      console.warn("[WhatsApp:KnowledgeBase] Warning reading local FAQs database:", e?.message || e);
    }

    // 2. Ingest documents from Firestore whatsapp_knowledge_base if available
    if (centralDb?.useFirestore) {
      console.log(`[WhatsApp:KnowledgeBase] Firestore database ID verified: ${centralDb.databaseId || "default"}`);
      console.log("[WhatsApp:KnowledgeBase] Knowledge Base query started on collection: whatsapp_knowledge_base");
      try {
        const result = await centralDb.listDocs("whatsapp_knowledge_base", 100);
        if (result?.success && Array.isArray(result.documents)) {
          const activeDocs = result.documents.filter((item: any) => item && item.isActive !== false && item.status !== "disabled");
          for (const item of activeDocs) {
            const title = String(item.title || item.question || "").trim();
            const content = String(item.content || item.answer || item.description || "").trim();
            if (title || content) docs.push({ title, content });
          }
        }
      } catch (err: any) {
        console.error("[WhatsApp:KnowledgeBase] KNOWLEDGE_BASE_READ_ERROR:", String(err?.message || err).slice(0, 200));
      }
    }

    if (docs.length === 0) {
      console.warn("[WhatsApp:KnowledgeBase] KNOWLEDGE_BASE_EMPTY: No active FAQ documents found in knowledge base");
      return { context: "", count: 0, errorCategory: "KNOWLEDGE_BASE_EMPTY" };
    }

    const context = docs
      .map((item) => {
        const title = item.title.trim();
        const content = item.content.trim();
        return title && content ? `प्रश्न/विषय: ${title}\nउत्तर/जानकारी: ${content}` : content || title;
      })
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 14000);

    console.log(`[WhatsApp:KnowledgeBase] Knowledge context generated (${context.length} chars from ${docs.length} active entries)`);
    return { context, count: docs.length };
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

    const incomingRecord = {
      messageId,
      metaMessageId: messageId,
      conversationId,
      waId,
      direction: "inbound",
      messageType: String(message.type || "unknown"),
      text: textBody,
      timestamp: Number(message.timestamp || Math.floor(now / 1000)) * 1000,
      createdAt: now,
      status: "received",
      senderType: "customer",
      senderId: waId,
    };
    await requireWrite("whatsapp_messages", messageDocId, incomingRecord);
    messageCache.set(messageDocId, incomingRecord);

    // Read existing conversation state to preserve handlingMode, operator assignment, and audit data
    let existingConv: any = null;
    try {
      const convRes = await centralDb.readDoc("whatsapp_conversations", conversationId);
      if (convRes?.success && convRes.data) {
        existingConv = convRes.data;
      }
    } catch {}
    if (!existingConv && conversationCache.has(conversationId)) {
      existingConv = conversationCache.get(conversationId);
    }

    const currentHandlingMode = existingConv?.handlingMode || "ai";
    const currentUnread = Number(existingConv?.unreadCount || 0) + 1;

    const convUpdates = {
      ...existingConv,
      conversationId,
      waId,
      customerPhone: waId,
      channel: "whatsapp",
      lastInboundAt: now,
      lastMessagePreview: textBody.slice(0, 180) || `[${message.type || "message"}]`,
      lastMessageDirection: "inbound",
      lastMessageAt: now,
      lastMessageStatus: "received",
      unreadCount: currentUnread,
      status: existingConv?.status === "closed" ? "open" : (existingConv?.status || "open"),
      handlingMode: currentHandlingMode,
      updatedAt: now,
    };

    await requireWrite("whatsapp_conversations", conversationId, convUpdates);
    conversationCache.set(conversationId, convUpdates);

    if (textBody.toUpperCase() === "STOP" || textBody.toUpperCase() === "UNSUBSCRIBE") {
      console.log(`[WhatsApp:Inbound] STOP/UNSUBSCRIBE received from ${maskedWa}`);
      // Task B: Atomically sync opt-out to both whatsapp_subscribers AND matching users collection records
      await syncWhatsAppOptOut(waId, "inbound_whatsapp_stop", centralDb);
      const optOutReply = "आपकी WhatsApp समाचार सूचनाएँ बंद कर दी गई हैं। ग्राहक सहायता के लिए आप हमें संदेश भेज सकते हैं।";
      const sent = await sendWhatsAppText(waId, optOutReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      const outRecord = {
        messageId: outMsgId,
        metaMessageId: outMsgId,
        conversationId,
        waId,
        direction: "outbound",
        senderType: "system",
        text: optOutReply,
        timestamp: now,
        status: "sent",
      };
      await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord);
      messageCache.set(sha256(outMsgId), outRecord);
      console.log(`[WhatsApp:Outbound] Outbound Firestore record saved: ${outMsgId}`);
      return;
    }

    const wantsHuman = /\b(agent|human|person|support|representative|executive|live\s*agent)\b|मानव|व्यक्ति|प्रतिनिधि|कस्टमर केयर|सहायता टीम|कस्टमर सपोर्ट|बात करनी है|सहायता चाहिए|एजेंट/i.test(textBody);
    if (wantsHuman) {
      console.log(`[WhatsApp:Inbound] Human handoff triggered by customer ${maskedWa}`);
      const handoffConvUpdates = {
        ...convUpdates,
        handlingMode: "waiting_human",
        status: "human_requested",
        humanHandoff: true,
        handoffRequestedAt: now,
        handoffReason: "user_request",
        modeUpdatedAt: now,
        modeUpdatedBy: "customer",
        updatedAt: now,
      };
      await requireWrite("whatsapp_conversations", conversationId, handoffConvUpdates);
      conversationCache.set(conversationId, handoffConvUpdates);

      await recordAuditEvent(centralDb, {
        conversationId,
        eventType: "conversation_mode_changed",
        previousValue: currentHandlingMode,
        newValue: "waiting_human",
        actorId: waId,
        actorType: "customer",
        metadata: { trigger: "user_keyword", text: textBody.slice(0, 60) },
      });

      const handoffReply = "नमस्ते! आपका अनुरोध हमारी सहायता टीम को भेज दिया गया है। हमारे प्रतिनिधि जल्द ही आपसे यहाँ संपर्क करेंगे।";
      const sent = await sendWhatsAppText(waId, handoffReply);
      const outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);
      const outRecord = {
        messageId: outMsgId,
        metaMessageId: outMsgId,
        conversationId,
        waId,
        direction: "outbound",
        senderType: "system",
        text: handoffReply,
        timestamp: now,
        status: "sent",
      };
      await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord);
      messageCache.set(sha256(outMsgId), outRecord);
      console.log(`[WhatsApp:Outbound] Outbound handoff acknowledgement saved: ${outMsgId}`);
      return;
    }

    // MANDATORY PHASE 1B SAFETY GUARD: Check active handling mode directly from Firestore.
    // While in 'human' mode, the AI must NOT generate or send automatic replies.
    // While in 'waiting_human' mode, the AI is suppressed while customer awaits human pickup.
    const activeConvRes = await centralDb.readDoc("whatsapp_conversations", conversationId);
    const activeHandlingMode = activeConvRes?.data?.handlingMode || currentHandlingMode;

    if (activeHandlingMode === "human") {
      console.log(`[WhatsApp:Handoff] AI reply suppressed: conversation ${conversationId} is currently handled by human operator (${activeConvRes?.data?.assignedOperatorName || activeConvRes?.data?.assignedOperatorId || "unassigned"}). Inbound message recorded for live inbox.`);
      return;
    }

    if (activeHandlingMode === "waiting_human") {
      console.log(`[WhatsApp:Handoff] AI reply suppressed: conversation ${conversationId} is in 'waiting_human' mode awaiting operator pickup. Inbound message recorded for live inbox.`);
      return;
    }

    // =========================================================================
    // VIP DESK WHATSAPP NEWSROOM ASSISTANT & EXTENSIBLE COMMANDS
    // =========================================================================
    let userNewsSession = userNewsSessionCache.get(waId);
    if (!userNewsSession) {
      const allNewsSessions = loadNewsSessionsDatabase(centralDb);
      if (allNewsSessions[waId]) {
        userNewsSession = allNewsSessions[waId];
        userNewsSessionCache.set(waId, userNewsSession);
      }
    }

    const isNewsCommand = /^\s*(?:टॉप\s*(?:5|10)?\s*खबरें?|आज\s*की\s*खबरें?|मध्य\s*प्रदेश\s*की\s*खबरें?|ताजा\s*खबरें?|top\s*(?:5|10)?\s*news|today\s*news|news|खबरें?)\s*$/i.test(textBody);
    const numericChoiceMatch = textBody.match(/^\s*(?:खबर\s*नंबर\s*|number\s*|#\s*)?([1-9]|10)\s*$/i);
    const hasActiveNewsSession = Boolean(userNewsSession && Array.isArray(userNewsSession.items) && userNewsSession.items.length > 0);
    const isGraphicCommand = /^\s*(?:इस\s*खबर\s*का\s*)?(?:ग्राफिक\s*बनाओ|graphic|फोटो\s*बनाओ|कार्ड\s*बनाओ)\s*$/i.test(textBody);
    const isHeadlineCommand = /^\s*(?:इस\s*खबर\s*की\s*)?(?:हेडलाइन\s*बनाओ|शीर्षक\s*बनाओ|headline)\s*$/i.test(textBody);
    const isCaptionCommand = /^\s*(?:इस\s*खबर\s*का\s*)?(?:कैप्शन\s*बनाओ|caption)\s*$/i.test(textBody);
    const isScriptCommand = /^\s*(?:इस\s*खबर\s*की\s*)?(?:वीडियो\s*स्क्रिप्ट\s*बनाओ|स्क्रिप्ट\s*बनाओ|video\s*script|script)\s*$/i.test(textBody);

    const isVipCommandDetected =
      isNewsCommand ||
      isGraphicCommand ||
      isHeadlineCommand ||
      isCaptionCommand ||
      isScriptCommand ||
      (hasActiveNewsSession && Boolean(numericChoiceMatch));

    if (isVipCommandDetected) {
      console.log(`[WhatsApp:VIPDesk] Command detected from ${maskedWa}: "${textBody}"`);
      const senderUser = findUserByWaId(waId);
      const isVip = isUserVipDesk(senderUser, waId);

      if (!isVip) {
        console.log(`[WhatsApp:VIPDesk] User ${maskedWa} is not VIP Desk. Sending polite restriction.`);
        const nonVipNotice = `🌟 *AI News Maker — VIP Desk विशेष सेवा*\n\nनमस्ते! यह AI Newsroom Assistant सुविधा केवल हमारे *VIP Desk* सब्सक्राइबर्स के लिए उपलब्ध है।\n\nVIP Desk के साथ आपको मिलता है:\n• WhatsApp पर तुरंत ताज़ा और ब्रेकिंग खबरें\n• 1-क्लिक में न्यूज़ ग्राफिक और सोशल मीडिया पोस्ट\n• AI हेडलाइन और 30-सेकंड वीडियो स्क्रिप्ट जनरेशन\n\n👉 आज ही VIP Desk में अपग्रेड करने के लिए यहाँ क्लिक करें:\nhttps://ainewsmaker.online/plans\n\nसहायता के लिए 'एजेंट' लिखकर भेजें।`;

        const sent = await sendWhatsAppText(waId, nonVipNotice);
        const outMsgId = String(sent?.messages?.[0]?.id || `vip-restrict-${now}`);
        const outRecord = {
          messageId: outMsgId,
          metaMessageId: outMsgId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "vip_newsroom_assistant",
          text: nonVipNotice,
          timestamp: now,
          status: "sent",
        };
        await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord).catch(() => {});
        messageCache.set(sha256(outMsgId), outRecord);
        return;
      }

      // --- VIP COMMAND 1: TOP NEWS QUERY ---
      if (isNewsCommand) {
        const targetCount = /10/.test(textBody) ? 10 : 5;
        let allPosts: any[] = [];
        if (options?.getNewsDatabase) {
          try {
            allPosts = options.getNewsDatabase();
          } catch {}
        }
        if ((!allPosts || allPosts.length === 0) && centralDb?.cache?.news) {
          allPosts = Array.from(centralDb.cache.news.values());
        }

        let filtered = (allPosts || []).filter((p: any) => p && p.title && !p.deleted && p.id !== "[object Object]");
        const isMpRequested = /मध्य\s*प्रदेश|mp/i.test(textBody);
        if (isMpRequested) {
          const mpPosts = filtered.filter((p: any) =>
            /मध्य\s*प्रदेश|भोपाल|इंदौर|ग्वालियर|जबलपुर|उज्जैन|रीवा|सतना|सीधी|mp/i.test(`${p.title} ${p.summary || ""} ${p.location || ""}`)
          );
          if (mpPosts.length > 0) filtered = mpPosts;
        }

        filtered.sort((a: any, b: any) => {
          if (a.isBreaking && !b.isBreaking) return -1;
          if (!a.isBreaking && b.isBreaking) return 1;
          return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
        });

        const selectedPosts = filtered.slice(0, targetCount);
        if (selectedPosts.length === 0) {
          const noNewsMsg = "वर्तमान में कोई ताज़ा समाचार उपलब्ध नहीं है। कृपया थोड़ी देर बाद पुनः प्रयास करें।";
          await sendWhatsAppText(waId, noNewsMsg);
          return;
        }

        const items = selectedPosts.map((p: any, idx: number) => ({
          index: idx + 1,
          id: String(p.id),
          title: String(p.title || "").trim(),
          summary: String(p.summary || p.content || "").slice(0, 300).trim(),
          imageUrl: String(p.thumbnailUrl || p.imageUrl || p.mediaUrl || "").trim(),
          category: String(p.category || "ताज़ा खबर").trim(),
          location: String(p.location || "").trim(),
        }));

        const sessionData = {
          waId,
          userEmail: senderUser?.email || "",
          items,
          selectedItem: null,
          createdAt: now,
          updatedAt: now,
        };
        userNewsSessionCache.set(waId, sessionData);
        saveNewsSessionsDatabase({ ...loadNewsSessionsDatabase(centralDb), [waId]: sessionData }, centralDb);

        const regionLabel = isMpRequested ? " (मध्य प्रदेश)" : "";
        const listMessage = `📰 *आज की टॉप ${items.length} खबरें${regionLabel} — AI News Maker VIP Desk*:\n\n` +
          items.map((it: any) => `${it.index}️⃣ *${it.title}*`).join("\n\n") +
          `\n\n👉 किसी भी खबर का तुरंत ग्राफिक बनाने के लिए बस उसका नंबर (जैसे *1* या *2*) भेजें!`;

        const sent = await sendWhatsAppText(waId, listMessage);
        const outMsgId = String(sent?.messages?.[0]?.id || `vip-news-${now}`);
        const outRecord = {
          messageId: outMsgId,
          metaMessageId: outMsgId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "vip_newsroom_assistant",
          text: listMessage,
          timestamp: now,
          status: "sent",
        };
        await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord).catch(() => {});
        messageCache.set(sha256(outMsgId), outRecord);
        return;
      }

      // --- VIP COMMAND 2: NUMERIC SELECTION OR GRAPHIC GENERATION ---
      if ((hasActiveNewsSession && numericChoiceMatch) || isGraphicCommand) {
        let chosenItem: any = null;
        if (numericChoiceMatch) {
          const chosenIndex = parseInt(numericChoiceMatch[1], 10);
          chosenItem = userNewsSession?.items?.[chosenIndex - 1] || null;
          if (!chosenItem) {
            const rangeMsg = `माफ़ कीजिए, क्रमांक ${chosenIndex} की कोई खबर नहीं मिली। कृपया 1 से ${userNewsSession?.items?.length || 5} तक का नंबर चुनें।`;
            await sendWhatsAppText(waId, rangeMsg);
            return;
          }
        } else if (isGraphicCommand) {
          chosenItem = userNewsSession?.selectedItem || userNewsSession?.items?.[0] || null;
          if (!chosenItem) {
            const noSelMsg = "कृपया पहले 'टॉप 5 खबरें' लिखकर समाचार सूची प्राप्त करें और फिर उसका नंबर भेजें।";
            await sendWhatsAppText(waId, noSelMsg);
            return;
          }
        }

        userNewsSession.selectedItem = chosenItem;
        userNewsSession.updatedAt = now;
        userNewsSessionCache.set(waId, userNewsSession);
        saveNewsSessionsDatabase({ ...loadNewsSessionsDatabase(centralDb), [waId]: userNewsSession }, centralDb);

        const ackMsg = `⏳ आपकी चुनी गई खबर *'${chosenItem.title}'* का ग्राफिक तैयार किया जा रहा है...`;
        const sentAck = await sendWhatsAppText(waId, ackMsg);
        const outAckId = String(sentAck?.messages?.[0]?.id || `vip-ack-${now}`);
        await requireWrite("whatsapp_messages", sha256(outAckId), {
          messageId: outAckId,
          metaMessageId: outAckId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "vip_newsroom_assistant",
          text: ackMsg,
          timestamp: now,
          status: "sent",
        }).catch(() => {});

        const resolvedUrl = chosenItem.imageUrl && (chosenItem.imageUrl.startsWith("http://") || chosenItem.imageUrl.startsWith("https://"))
          ? chosenItem.imageUrl
          : "https://ainewsmaker.online/og-image.jpg";

        const graphicCaption = `🚨 *${chosenItem.title}*\n\n${chosenItem.summary ? `${chosenItem.summary}\n\n` : ""}🎨 *इस ग्राफिक को स्टूडियो में कस्टमाइज़ करें:*\nhttps://ainewsmaker.online/studio?newsId=${encodeURIComponent(chosenItem.id)}\n\n✨ _AI News Maker (ब्रेकिंग न्यूज़ वाला) - VIP Desk_`;

        try {
          const sentImg = await sendWhatsAppImage(waId, resolvedUrl, graphicCaption.slice(0, 1024));
          const outImgId = String(sentImg?.messages?.[0]?.id || `vip-img-${now}`);
          await requireWrite("whatsapp_messages", sha256(outImgId), {
            messageId: outImgId,
            metaMessageId: outImgId,
            conversationId,
            waId,
            direction: "outbound",
            senderType: "vip_newsroom_assistant",
            text: graphicCaption,
            mediaUrl: resolvedUrl,
            timestamp: now,
            status: "sent",
          }).catch(() => {});
        } catch (imgErr: any) {
          console.warn("[WhatsApp:VIPDesk] sendWhatsAppImage fallback to text:", imgErr?.message || imgErr);
          const sentTxt = await sendWhatsAppText(waId, graphicCaption);
          const outTxtId = String(sentTxt?.messages?.[0]?.id || `vip-img-fb-${now}`);
          await requireWrite("whatsapp_messages", sha256(outTxtId), {
            messageId: outTxtId,
            metaMessageId: outTxtId,
            conversationId,
            waId,
            direction: "outbound",
            senderType: "vip_newsroom_assistant",
            text: graphicCaption,
            timestamp: now,
            status: "sent",
          }).catch(() => {});
        }

        if (senderUser && senderUser.coins !== undefined && Number(senderUser.coins) > 0) {
          senderUser.coins = Math.max(0, Number(senderUser.coins) - 1);
          if (centralDb?.writeDoc) {
            centralDb.writeDoc("users", senderUser.email || senderUser.id, senderUser).catch(() => {});
          }
        }

        await recordAuditEvent(centralDb, {
          conversationId,
          eventType: "vip_news_graphic_generated",
          previousValue: null,
          newValue: chosenItem.id,
          actorId: waId,
          actorType: "customer",
          metadata: { newsId: chosenItem.id, title: chosenItem.title },
        });
        return;
      }

      // --- VIP COMMAND 3: AI HEADLINE GENERATION ---
      if (isHeadlineCommand) {
        const targetItem = userNewsSession?.selectedItem || userNewsSession?.items?.[0] || null;
        if (!targetItem) {
          await sendWhatsAppText(waId, "कृपया पहले किसी खबर का नंबर चुनें (उदा. 1 या 2) या 'टॉप 5 खबरें' लिखकर भेजें।");
          return;
        }

        const apiKey = (process.env.GEMINI_API_KEY || process.env["GEMINI_API-KEY"] || "").trim();
        const configuredModel = (process.env.WHATSAPP_GEMINI_MODEL || "gemini-3.5-flash").trim();
        const model = (configuredModel === "gemini-2.5-flash" || configuredModel === "gemini-2.0-flash") ? "gemini-3.5-flash" : configuredModel;
        let headlines = "";

        if (apiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const resp = await ai.models.generateContent({
              model,
              contents: [
                "आप AI NEWS MAKER (ब्रेकिंग न्यूज़ वाला) के मुख्य समाचार संपादक हैं। नीचे दी गई खबर के लिए 3 आकर्षक, प्रभावशाली और संतुलित हेडलाइन विकल्प शुद्ध हिंदी में तैयार करें। प्रत्येक हेडलाइन एक अलग शैली (जैसे: ब्रेकिंग, तथ्यात्मक, विश्लेषणात्मक) में हो। केवल 3 हेडलाइन की नंबरयुक्त सूची दें।",
                `शीर्षक: ${targetItem.title}\nविवरण: ${targetItem.summary || targetItem.title}`,
              ].join("\n\n"),
            });
            headlines = String(resp.text || "").trim();
          } catch (err: any) {
            console.warn("[WhatsApp:VIPDesk] Headline Gemini exception:", err?.message);
          }
        }

        if (!headlines) {
          headlines = `1️⃣ 🚨 ब्रेकिंग: ${targetItem.title}\n2️⃣ 📢 बड़ा अपडेट: ${targetItem.title}\n3️⃣ 🔍 विशेष रिपोर्ट: ${targetItem.title}`;
        }

        const reply = `✍️ *समाचार हेडलाइन विकल्प (AI News Editor)*:\n\n${headlines}\n\n🎨 *स्टूडियो में एडिट करें:*\nhttps://ainewsmaker.online/studio?newsId=${encodeURIComponent(targetItem.id)}`;
        const sentH = await sendWhatsAppText(waId, reply);
        const outHId = String(sentH?.messages?.[0]?.id || `vip-h-${now}`);
        await requireWrite("whatsapp_messages", sha256(outHId), {
          messageId: outHId,
          metaMessageId: outHId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "vip_newsroom_assistant",
          text: reply,
          timestamp: now,
          status: "sent",
        }).catch(() => {});
        return;
      }

      // --- VIP COMMAND 4: AI CAPTION GENERATION ---
      if (isCaptionCommand) {
        const targetItem = userNewsSession?.selectedItem || userNewsSession?.items?.[0] || null;
        if (!targetItem) {
          await sendWhatsAppText(waId, "कृपया पहले किसी खबर का नंबर चुनें (उदा. 1 या 2) या 'टॉप 5 खबरें' लिखकर भेजें।");
          return;
        }

        const apiKey = (process.env.GEMINI_API_KEY || process.env["GEMINI_API-KEY"] || "").trim();
        const configuredModel = (process.env.WHATSAPP_GEMINI_MODEL || "gemini-3.5-flash").trim();
        const model = (configuredModel === "gemini-2.5-flash" || configuredModel === "gemini-2.0-flash") ? "gemini-3.5-flash" : configuredModel;
        let socialCaption = "";

        if (apiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const resp = await ai.models.generateContent({
              model,
              contents: [
                "आप AI News Maker के सोशल मीडिया मैनेजर हैं। इस खबर के लिए WhatsApp, Facebook और Instagram के लिए 1 आकर्षक सोशल मीडिया कैप्शन तैयार करें जिसमें उपयुक्त इमोजी और 4-5 प्रासंगिक हैशटैग (#) शामिल हों।",
                `शीर्षक: ${targetItem.title}\nविवरण: ${targetItem.summary || targetItem.title}`,
              ].join("\n\n"),
            });
            socialCaption = String(resp.text || "").trim();
          } catch (err: any) {
            console.warn("[WhatsApp:VIPDesk] Caption Gemini exception:", err?.message);
          }
        }

        if (!socialCaption) {
          socialCaption = `🚨 ${targetItem.title}\n\n${targetItem.summary || ""}\n\n#BreakingNews #HindiNews #AINewsMaker #LatestUpdates`;
        }

        const reply = `📱 *सोशल मीडिया कैप्शन (Facebook/Instagram/WhatsApp)*:\n\n${socialCaption}\n\n🎨 *स्टूडियो में पोस्ट बनाएं:*\nhttps://ainewsmaker.online/studio?newsId=${encodeURIComponent(targetItem.id)}`;
        const sentC = await sendWhatsAppText(waId, reply);
        const outCId = String(sentC?.messages?.[0]?.id || `vip-cap-${now}`);
        await requireWrite("whatsapp_messages", sha256(outCId), {
          messageId: outCId,
          metaMessageId: outCId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "vip_newsroom_assistant",
          text: reply,
          timestamp: now,
          status: "sent",
        }).catch(() => {});
        return;
      }

      // --- VIP COMMAND 5: VIDEO SCRIPT GENERATION ---
      if (isScriptCommand) {
        const targetItem = userNewsSession?.selectedItem || userNewsSession?.items?.[0] || null;
        if (!targetItem) {
          await sendWhatsAppText(waId, "कृपया पहले किसी खबर का नंबर चुनें (उदा. 1 या 2) या 'टॉप 5 खबरें' लिखकर भेजें।");
          return;
        }

        const apiKey = (process.env.GEMINI_API_KEY || process.env["GEMINI_API-KEY"] || "").trim();
        const configuredModel = (process.env.WHATSAPP_GEMINI_MODEL || "gemini-3.5-flash").trim();
        const model = (configuredModel === "gemini-2.5-flash" || configuredModel === "gemini-2.0-flash") ? "gemini-3.5-flash" : configuredModel;
        let videoScript = "";

        if (apiKey) {
          try {
            const ai = new GoogleGenAI({ apiKey });
            const resp = await ai.models.generateContent({
              model,
              contents: [
                "आप AI News Maker के न्यूज़ एंकर हैं। इस खबर के लिए 30 सेकंड की टीवी/यूट्यूब न्यूज़ एंकर वीडियो स्क्रिप्ट तैयार करें। इसमें [ओपनिंग], [मुख्य खबर], और [क्लोजिंग] स्पष्ट रूप से चिह्नित हों।",
                `शीर्षक: ${targetItem.title}\nविवरण: ${targetItem.summary || targetItem.title}`,
              ].join("\n\n"),
            });
            videoScript = String(resp.text || "").trim();
          } catch (err: any) {
            console.warn("[WhatsApp:VIPDesk] Video script Gemini exception:", err?.message);
          }
        }

        if (!videoScript) {
          videoScript = `[ओपनिंग]\nनमस्कार, मैं हूँ AI News Maker और इस वक्त की बड़ी खबर...\n\n[मुख्य खबर]\n${targetItem.title}। ${targetItem.summary || ""}\n\n[क्लोजिंग]\nअधिक अपडेट्स के लिए जुड़े रहिए Breaking News Wala के साथ।`;
        }

        const reply = `🎬 *30-सेकंड न्यूज़ एंकर वीडियो स्क्रिप्ट*:\n\n${videoScript}\n\n🎨 *वीडियो स्टूडियो में खोलें:*\nhttps://ainewsmaker.online/studio?newsId=${encodeURIComponent(targetItem.id)}`;
        const sentS = await sendWhatsAppText(waId, reply);
        const outSId = String(sentS?.messages?.[0]?.id || `vip-scr-${now}`);
        await requireWrite("whatsapp_messages", sha256(outSId), {
          messageId: outSId,
          metaMessageId: outSId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "vip_newsroom_assistant",
          text: reply,
          timestamp: now,
          status: "sent",
        }).catch(() => {});
        return;
      }
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

    // --- 1. ACTIVE FLOW SESSION HANDLER ---
    // If this conversation has an active paused flow waiting for user input, advance it
    let activeSession = flowSessionCache.get(conversationId);
    if (!activeSession) {
      const allSessions = loadFlowSessionsDatabase(centralDb);
      if (allSessions[conversationId]) {
        activeSession = allSessions[conversationId];
        flowSessionCache.set(conversationId, activeSession);
      }
    }

    if (activeSession && activeSession.status === "active" && activeSession.currentNodeId) {
      console.log(`[WhatsApp:Flow] Advancing active flow session for ${maskedWa}: flow=${activeSession.flowId}, node=${activeSession.currentNodeId}`);
      const flowExecResult = await executeFlowNodes(
        activeSession.flowId,
        activeSession.currentNodeId,
        textBody,
        activeSession,
        centralDb,
        generateSupportReply
      );

      // Send outbound messages generated by flow
      for (const msg of flowExecResult.outboundMessages) {
        const sent = await sendWhatsAppText(waId, msg);
        const outMsgId = String(sent?.messages?.[0]?.id || `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        const outRecord = {
          messageId: outMsgId,
          metaMessageId: outMsgId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "flow_automation",
          text: msg,
          timestamp: Date.now(),
          status: "sent",
        };
        await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord).catch(() => {});
        messageCache.set(sha256(outMsgId), outRecord);
      }

      // Handle handoff if requested by flow
      if (flowExecResult.isHandoff) {
        console.log(`[WhatsApp:Flow] Human handoff triggered by flow node for ${maskedWa}`);
        const handoffUpdates = {
          ...convUpdates,
          handlingMode: "waiting_human",
          status: "human_requested",
          humanHandoff: true,
          handoffRequestedAt: Date.now(),
          handoffReason: flowExecResult.handoffReason || "flow_handoff_node",
          modeUpdatedAt: Date.now(),
          modeUpdatedBy: "flow_automation",
          updatedAt: Date.now(),
        };
        await requireWrite("whatsapp_conversations", conversationId, handoffUpdates).catch(() => {});
        conversationCache.set(conversationId, handoffUpdates);

        await recordAuditEvent(centralDb, {
          conversationId,
          eventType: "conversation_mode_changed",
          previousValue: currentHandlingMode,
          newValue: "waiting_human",
          actorId: "flow_automation",
          actorType: "system",
          metadata: { flowId: activeSession.flowId, reason: flowExecResult.handoffReason },
        });
      }

      // Persist updated session
      const allSessions = loadFlowSessionsDatabase(centralDb);
      allSessions[conversationId] = flowExecResult.nextSession;
      saveFlowSessionsDatabase(allSessions, centralDb);
      flowSessionCache.set(conversationId, flowExecResult.nextSession);
      return;
    }

    // --- 2. FLOW TRIGGER MATCHER ---
    // Match inbound message against published flows
    const isFirstMessage = !existingConv || Number(existingConv.unreadCount || 0) <= 1;
    const allFlows = loadFlowsDatabase(centralDb);
    const matchedFlow = matchFlowTrigger(textBody, isFirstMessage, allFlows);

    if (matchedFlow && Array.isArray(matchedFlow.nodes) && matchedFlow.nodes.length > 0) {
      console.log(`[WhatsApp:Flow] Trigger matched for ${maskedWa}: flow="${matchedFlow.name}" (${matchedFlow.id})`);
      const startNodeId = matchedFlow.nodes[0].id;
      const initialSession: FlowSession = {
        conversationId,
        flowId: matchedFlow.id,
        currentNodeId: startNodeId,
        variables: { initial_input: textBody },
        startedAt: now,
        lastInteractionAt: now,
        status: "active",
      };

      const flowExecResult = await executeFlowNodes(
        matchedFlow.id,
        startNodeId,
        textBody,
        initialSession,
        centralDb,
        generateSupportReply
      );

      for (const msg of flowExecResult.outboundMessages) {
        const sent = await sendWhatsAppText(waId, msg);
        const outMsgId = String(sent?.messages?.[0]?.id || `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        const outRecord = {
          messageId: outMsgId,
          metaMessageId: outMsgId,
          conversationId,
          waId,
          direction: "outbound",
          senderType: "flow_automation",
          text: msg,
          timestamp: Date.now(),
          status: "sent",
        };
        await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord).catch(() => {});
        messageCache.set(sha256(outMsgId), outRecord);
      }

      if (flowExecResult.isHandoff) {
        const handoffUpdates = {
          ...convUpdates,
          handlingMode: "waiting_human",
          status: "human_requested",
          humanHandoff: true,
          handoffRequestedAt: Date.now(),
          handoffReason: flowExecResult.handoffReason || "flow_handoff_node",
          modeUpdatedAt: Date.now(),
          modeUpdatedBy: "flow_automation",
          updatedAt: Date.now(),
        };
        await requireWrite("whatsapp_conversations", conversationId, handoffUpdates).catch(() => {});
        conversationCache.set(conversationId, handoffUpdates);
      }

      const allSessions = loadFlowSessionsDatabase(centralDb);
      allSessions[conversationId] = flowExecResult.nextSession;
      saveFlowSessionsDatabase(allSessions, centralDb);
      flowSessionCache.set(conversationId, flowExecResult.nextSession);
      return;
    }

    // --- 3. DYNAMIC FAQ MATCHER ---
    const allFaqs = loadFaqsDatabase(centralDb);
    const matchedFaq = matchFAQ(textBody, allFaqs);

    if (matchedFaq && matchedFaq.faq) {
      console.log(`[WhatsApp:FAQ] FAQ matched for ${maskedWa}: "${matchedFaq.faq.questionHi || matchedFaq.faq.questionEn}" (score: ${matchedFaq.score})`);
      const answerText = matchedFaq.faq.answerHi || matchedFaq.faq.answerEn;
      const sent = await sendWhatsAppText(waId, answerText);
      const outMsgId = String(sent?.messages?.[0]?.id || `faq-${Date.now()}`);
      const outRecord = {
        messageId: outMsgId,
        metaMessageId: outMsgId,
        conversationId,
        waId,
        direction: "outbound",
        senderType: "faq_automation",
        text: answerText,
        timestamp: Date.now(),
        status: "sent",
      };
      await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord).catch(() => {});
      messageCache.set(sha256(outMsgId), outRecord);

      // Increment usage count on matched FAQ
      try {
        matchedFaq.faq.usageCount = Number(matchedFaq.faq.usageCount || 0) + 1;
        matchedFaq.faq.lastMatchedAt = Date.now();
        const faqIdx = allFaqs.findIndex((f) => f.id === matchedFaq.faq.id);
        if (faqIdx !== -1) {
          allFaqs[faqIdx] = matchedFaq.faq;
          saveFaqsDatabase(allFaqs, centralDb);
        }
      } catch (err: any) {
        console.warn("[WhatsApp:FAQ] Error incrementing FAQ usage:", err?.message || err);
      }
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
        
        // Task C: Anti-overwriting & Uniqueness Claim
        const claimResult = await claimVerifiedPhoneNumber(waId, "+91", targetEmail, centralDb);
        if (claimResult?.conflict) {
          console.warn(`[WhatsApp:Link] waId ${maskedWa} is already linked to another account.`);
          const conflictReply = `⚠️ यह WhatsApp नंबर पहले से किसी अन्य AI NEWS MAKER अकाउंट से लिंक है।\n\nएक WhatsApp नंबर को एक समय में केवल एक ही अकाउंट से जोड़ा जा सकता है। कृपया पहले उस अकाउंट से इसे अनलिंक करें।`;
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
      let kgConvData: any = {};
      try {
        const kgRes = await centralDb.readDoc("whatsapp_conversations", conversationId);
        if (kgRes?.success && kgRes.data) kgConvData = kgRes.data;
      } catch {}
      const kgUpdates = {
        ...kgConvData,
        waId,
        handlingMode: "waiting_human",
        status: "human_requested",
        humanHandoff: true,
        handoffReason,
        modeUpdatedAt: Date.now(),
        modeUpdatedBy: "system_ai_gap",
        updatedAt: Date.now(),
      };
      await requireWrite("whatsapp_conversations", conversationId, kgUpdates);
      conversationCache.set(conversationId, kgUpdates);

      await recordAuditEvent(centralDb, {
        conversationId,
        eventType: "conversation_mode_changed",
        previousValue: kgConvData.handlingMode || "ai",
        newValue: "waiting_human",
        actorId: "system",
        actorType: "system",
        metadata: { reason: handoffReason },
      });

      if (handoffReason === "knowledge_gap") {
        reply = "आपका प्रश्न हमें मिल गया है, लेकिन इसकी पुष्टि हमारे उपलब्ध सहायता-ज्ञान से नहीं हो पा रही है। हमने इसे सहायता टीम के लिए चिन्हित कर दिया है।";
      } else {
        reply = "नमस्ते! आपका संदेश हमें मिल गया है। हमारी सहायता टीम जल्द ही आपसे यहाँ संपर्क करेगी।";
      }
    }

    // PHASE 1B.1 ISSUE 1 REMEDIATION: Transaction-safe AI Dispatch Reservation
    // Coordinates human takeover and AI dispatch through an atomic state transition.
    const reservation = await acquireAiDispatchReservation(conversationId, centralDb);
    if (!reservation.acquired) {
      console.log(`[WhatsApp:Handoff] Aborting AI response dispatch: could not acquire dispatch reservation (${reservation.reason}). Operator takeover has priority.`);
      return;
    }

    let sent: any = null;
    let outMsgId = `out-${messageId}`;
    try {
      // Micro-check immediately prior to network call: verify reservation was not revoked by takeover and is unexpired
      let latestConv = conversationCache.get(conversationId);
      if (centralDb?.readDoc) {
        try {
          const lRes = await centralDb.readDoc("whatsapp_conversations", conversationId);
          if (lRes?.success && lRes.data) latestConv = lRes.data;
        } catch {}
      }
      const curReservation = latestConv?.aiDispatchReservation;
      if (
        latestConv?.handlingMode === "human" ||
        !curReservation ||
        curReservation.reservationId !== reservation.reservationId ||
        Number(curReservation.expiresAt || 0) <= Date.now()
      ) {
        console.log(`[WhatsApp:Handoff] Aborting AI response dispatch: reservation was revoked, expired, or superseded by human operator takeover.`);
        return;
      }

      sent = await sendWhatsAppText(waId, reply);
      outMsgId = String(sent?.messages?.[0]?.id || `out-${messageId}`);

      const outRecord = {
        messageId: outMsgId,
        metaMessageId: outMsgId,
        conversationId,
        waId,
        direction: "outbound",
        senderType: aiResult.reply ? "ai_bot" : "system",
        text: reply,
        timestamp: Date.now(),
        status: "sent",
      };
      await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord);
      messageCache.set(sha256(outMsgId), outRecord);
      console.log(`[WhatsApp:Outbound] Outbound Firestore record saved: ${outMsgId}`);
    } finally {
      // Release reservation after dispatch attempt
      await releaseAiDispatchReservation(conversationId, reservation.reservationId, centralDb).catch(() => {});
    }
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
    if (!centralDb?.useFirestore) return res.sendStatus(503);

    // 1. Process Meta Delivery Status Callbacks (PART 6)
    const statuses: any[] = [];
    for (const entry of req.body?.entry || []) {
      for (const change of entry?.changes || []) {
        for (const status of change?.value?.statuses || []) statuses.push(status);
      }
    }

    if (statuses.length > 0) {
      console.log(`[WhatsApp:Webhook] Received ${statuses.length} delivery status update(s)`);
      for (const st of statuses) {
        try {
          await processDeliveryStatus(st, centralDb, requireWrite);
        } catch (stErr: any) {
          console.error("[WhatsApp:Webhook] Error processing delivery status:", stErr?.message || stErr);
        }
      }
    }

    // 2. Process Inbound Messages
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
        
        if (errMsg.includes("Authentication Error") || errMsg.includes("WHATSAPP_API_ERROR") || errMsg.includes("401") || errMsg.includes("190") || errMsg.includes("not configured") || errMsg.includes("CONFIG_MISSING")) {
          const isConfigMissing = errMsg.includes("not configured") || errMsg.includes("CONFIG_MISSING");
          return res.status(503).json({
            success: false,
            error: isConfigMissing
              ? "व्हाट्सएप्प सेवा कॉन्फ़िगरेशन अनुपलब्ध है (WHATSAPP_ACCESS_TOKEN is not configured). कृपया एडमिन से संपर्क करें।"
              : "व्हाट्सएप्प क्लाउड API ऑथेंटिकेशन त्रुटि (Meta Access Token Expired). कृपया एडमिन से संपर्क करें।",
            errorCode: isConfigMissing ? "WHATSAPP_CONFIG_MISSING" : "WHATSAPP_TOKEN_EXPIRED",
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
      if (!record && (centralDb?.useFirestore || centralDb?.readDoc)) {
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

      // Task C: Duplicate WhatsApp Phone Number Ownership Prevention & Atomic Claim
      const countryCode = record.countryCode || "+91";
      if (email) {
        const claimResult = await claimVerifiedPhoneNumber(cleanPhone, countryCode, email, centralDb);
        if (claimResult?.conflict) {
          console.warn(`[WhatsApp:OTP:Conflict] Phone ${maskWaId(cleanPhone)} is already linked to another active account.`);
          return res.status(409).json({
            success: false,
            error: "यह WhatsApp नंबर पहले से किसी अन्य अकाउंट से जुड़ा हुआ है। कृपया सही अकाउंट से लॉगिन करें।",
            errorCode: "PHONE_ALREADY_LINKED",
          });
        }
      }

      // Task 4 Remediation: Verify user profile write success; safely rollback registry claim if write fails
      if (email && (centralDb?.useFirestore || centralDb?.writeDoc)) {
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
            countryCode: countryCode.startsWith("+") ? countryCode : `+${countryCode}`,
            updatedAt: now
          };
          const writeRes = await centralDb.writeDoc("users", email, updatedUser);
          if (writeRes && writeRes.success === false) {
            throw new Error(writeRes.error || "writeDoc failed");
          }
          if (centralDb.cache?.users) {
            centralDb.cache.users.set(email, updatedUser);
          }
          console.log(`[WhatsApp:OTP] User ${email} verified and updated with primaryNumber: ${cleanPhone}`);
        } catch (uErr: any) {
          console.error(`[WhatsApp:OTP:PartialFailure] Failed to write user profile for ${maskWaId(email)}. Rolling back registry claim:`, uErr?.message || uErr);
          // Safe compensation: Release registry claim ONLY for this email
          await releaseVerifiedPhoneNumber(cleanPhone, countryCode, email, centralDb);
          // Reset OTP record status to pending so immediate retry is possible
          record.status = "pending";
          otpVerificationCache.set(verificationId, record);
          if (centralDb?.useFirestore) {
            await centralDb.writeDoc("whatsapp_otp_verifications", verificationId, record).catch(() => undefined);
          }
          return res.status(500).json({
            success: false,
            errorCode: "USER_PROFILE_UPDATE_FAILED",
            error: "उपयोगकर्ता प्रोफ़ाइल सहेजने में त्रुटि हुई। फ़ोन नंबर लिंक नहीं किया जा सका। कृपया पुनः प्रयास करें।",
          });
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

  // --- ADMIN WHATSAPP NOTIFICATION CENTER CAMPAIGN ENDPOINT (Task A & Task B) ---
  app.post("/api/admin/whatsapp/campaign", requireAdmin, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const adminEmail = (authUser?.email || "").toLowerCase().trim();
      const adminRole = (authUser?.role || "").toLowerCase().trim();

      if (!adminEmail) {
        return res.status(401).json({
          success: false,
          error: "प्रमाणीकरण आवश्यक है (401 Unauthorized): मान्य व्यवस्थापक टोकन आवश्यक है।",
        });
      }

      console.log(`[WhatsApp:Campaign:Auth] Authorized admin ${adminEmail} (role=${adminRole}) initiating campaign`);

      const {
        targetAudience = "all",
        targetUserEmails = [],
        customNumbers = [],
        category = "Breaking News",
        headline = "",
        summary = "",
        articleUrl = "",
        newsId = "",
        imageUrl = "",
        thumbnailUrl = "",
        customMessage = "",
        testPhone = "",
      } = req.body;

      const resolvedImage = (imageUrl || thumbnailUrl || "").trim();
      let resolvedStudioUrl = (articleUrl || "").trim();
      if (!resolvedStudioUrl && newsId) {
        resolvedStudioUrl = `https://ainewsmaker.online/studio?newsId=${encodeURIComponent(newsId)}`;
      }

      const now = Date.now();
      const campaignId = `camp_${now}_${Math.random().toString(36).slice(2, 7)}`;

      let finalMessage = "";
      const isBreaking = req.body?.isBreaking === true || category === "Breaking News";
      if (isBreaking) {
        finalMessage += `🔴 *ब्रेकिंग न्यूज़ — तुरंत ग्राफिक बनाएं*\n\n`;
      }
      if (headline) finalMessage += `🚨 *${headline.trim()}*\n\n`;
      if (summary) finalMessage += `${summary.trim()}\n\n`;
      if (customMessage) finalMessage += `${customMessage.trim()}\n\n`;
      if (resolvedStudioUrl) {
        finalMessage += `✨ *इस खबर से ग्राफिक बनाएं:*\n${resolvedStudioUrl}\n\n`;
      }
      finalMessage += `_AI News Maker (ब्रेकिंग न्यूज़ वाला) - आधिकारिक समाचार सेवा_\n_नोटिफिकेशन रोकने के लिए STOP लिखें_`;

      // Test Mode
      if (testPhone) {
        const testWaId = normalizeToWaId(testPhone);
        const testSent = await sendWhatsAppNewsBroadcast(testWaId, {
          headline,
          summary,
          imageUrl: resolvedImage,
          newsId,
          studioUrl: resolvedStudioUrl,
          isBreaking,
          customMessage,
        });
        return res.json({
          success: true,
          testMode: true,
          deliveredTo: testWaId,
          dispatchMethod: testSent.method,
          metaResponse: testSent.result,
        });
      }

      // Resolve Recipients with Strict Opt-Out Verification (Task B)
      const recipientNumbers = new Set<string>();

      // Prefetch all opted-out subscribers to prevent sending to unsubscribed users
      const optedOutWaIds = new Set<string>();
      try {
        if (centralDb?.listDocs) {
          const subRes = await centralDb.listDocs("whatsapp_subscribers", 1000);
          for (const s of subRes?.documents || []) {
            if (s && (s.newsAlertsConsent === false || s.whatsappBreakingNewsConsent === false)) {
              if (s.waId) optedOutWaIds.add(normalizeToWaId(s.waId));
            }
          }
        }
      } catch (subErr: any) {
        console.warn("[WhatsApp:Campaign] Could not prefetch opted-out subscribers:", subErr?.message || subErr);
      }

      if (targetAudience === "custom" && Array.isArray(customNumbers)) {
        for (const num of customNumbers) {
          const normWa = normalizeToWaId(num);
          if (normWa && normWa.length >= 10) {
            if (optedOutWaIds.has(normWa)) {
              console.log(`[WhatsApp:Campaign] Skipping custom number due to active opt-out: ${maskWaId(normWa)}`);
              continue;
            }
            recipientNumbers.add(normWa);
          }
        }
      } else {
        const usersList: any[] = centralDb?.cache?.users
          ? Array.from(centralDb.cache.users.values())
          : (await centralDb?.listDocs("users", 500))?.documents || [];

        for (const u of usersList) {
          if (!u) continue;
          const uEmail = (u.email || "").toLowerCase().trim();
          const uTier = (u.tier || "basic").toLowerCase().trim();
          const rawPhone = u.whatsappNumber || u.primaryNumber || u.mobileNumber || u.primaryPhone || u.mobile || "";
          const uCountry = u.countryCode || "+91";
          const normWa = normalizeToWaId(rawPhone, uCountry);

          if (!normWa || normWa.length < 10) continue;

          if (targetAudience === "selected") {
            if (!targetUserEmails.includes(uEmail)) continue;
          } else if (targetAudience !== "all") {
            if (targetAudience === "vip" && uTier !== "ultra" && uTier !== "vip") continue;
            else if (targetAudience !== "vip" && uTier !== targetAudience) continue;
          }

          // Strict consent check: user doc flags AND pre-fetched subscriber opt-outs
          if (category === "Breaking News" && u.whatsappBreakingNewsConsent === false) continue;
          if (u.newsAlertsConsent === false) continue;
          if (optedOutWaIds.has(normWa)) {
            console.log(`[WhatsApp:Campaign] Skipping opted-out user (${maskWaId(uEmail)}): ${maskWaId(normWa)}`);
            continue;
          }

          // Strict Marketing Consent Enforcement:
          // Marketing, Promotional, and Offers campaigns REQUIRE explicit whatsappMarketingConsent === true
          const isMarketing = (category === "Marketing" || category === "Promotional" || category === "Offers" || req.body.isMarketing === true || req.body.type === "marketing");
          if (isMarketing) {
            if (u.whatsappMarketingConsent !== true) {
              console.log(`[WhatsApp:Campaign] Skipping user without marketing consent (${maskWaId(uEmail)}): ${maskWaId(normWa)}`);
              continue;
            }
            if (u.whatsappMarketingConsentPhone) {
              const consentPhoneNorm = u.whatsappMarketingConsentPhone.toString().replace(/\D/g, '').slice(-10);
              const targetPhoneNorm = normWa.toString().replace(/\D/g, '').slice(-10);
              if (consentPhoneNorm !== targetPhoneNorm) {
                console.log(`[WhatsApp:Campaign] Skipping user whose marketing consent phone (${maskWaId(consentPhoneNorm)}) does not match recipient phone (${maskWaId(targetPhoneNorm)})`);
                continue;
              }
            }
          }

          recipientNumbers.add(normWa);
        }
      }

      const recipientsList = Array.from(recipientNumbers);
      console.log(`[WhatsApp:Campaign] Starting campaign '${campaignId}' to ${recipientsList.length} recipients`);

      let successfulDeliveries = 0;
      let failedDeliveries = 0;
      const failedRecipients: { phone: string; error: string }[] = [];

      for (const phone of recipientsList) {
        try {
          const sentResult = await sendWhatsAppNewsBroadcast(phone, {
            headline,
            summary,
            imageUrl: resolvedImage,
            newsId,
            studioUrl: resolvedStudioUrl,
            isBreaking,
            customMessage,
          });
          const sent = sentResult.result;
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
              dispatchMethod: sentResult.method,
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

  // ============================================================================
  // PHASE 1B: LIVE INBOX, HUMAN SUPPORT & DELIVERY STATUS ADMIN APIS
  // ============================================================================

  const enrichCustomerData = async (waId: string) => {
    let customer: any = {
      phone: waId,
      isLinked: false,
      fullName: "",
      name: "",
      email: "",
      channelName: "",
      planName: "FREE",
      tier: "free",
      hasActivePaidPlan: false,
      remainingToday: 10,
      coinBalance: 0,
    };

    if (!waId) return customer;
    const cleanWa10 = waId.replace(/\D/g, "").slice(-10);

    // 1. Check in-memory user cache
    if (centralDb?.cache?.users) {
      for (const u of centralDb.cache.users.values()) {
        const uWa = (u.linkedWhatsAppWaId || u.whatsappNumber || u.primaryPhone || u.mobile || "").replace(/\D/g, "").slice(-10);
        if (uWa && cleanWa10 && uWa === cleanWa10) {
          customer = {
            phone: waId,
            isLinked: Boolean(u.whatsappVerified || (u.whatsappLinkStatus === "linked" && u.linkedWhatsAppWaId)),
            fullName: u.fullName || u.name || "संपादक",
            name: u.name || u.fullName || "संपादक",
            email: u.email || "",
            channelName: u.channelNameHi || u.channelName || "",
            planName: u.planName || "BASIC",
            tier: u.tier || "basic",
            hasActivePaidPlan: Boolean(u.hasActivePaidPlan),
            remainingToday: 10,
            coinBalance: 0,
          };
          break;
        }
      }
    }

    // 2. Check phone registry if not matched in cache
    if (!customer.email && centralDb?.readDoc) {
      try {
        const regRes = await centralDb.readDoc("whatsapp_phone_registry", `phone_${waId}`);
        if (regRes?.success && regRes.data?.verifiedEmail) {
          const ownerEmail = regRes.data.verifiedEmail.toLowerCase().trim();
          customer.email = ownerEmail;
          customer.isLinked = true;
          const uRes = await centralDb.readDoc("users", ownerEmail);
          if (uRes?.success && uRes.data) {
            customer.fullName = uRes.data.fullName || uRes.data.name || "";
            customer.name = customer.fullName;
            customer.channelName = uRes.data.channelNameHi || uRes.data.channelName || "";
            customer.planName = uRes.data.planName || "BASIC";
            customer.tier = uRes.data.tier || "basic";
            customer.hasActivePaidPlan = Boolean(uRes.data.hasActivePaidPlan);
          }
        }
      } catch {}
    }

    // 3. Compute remaining downloads if user has an email
    if (customer.email && centralDb?.readDoc) {
      try {
        const isSuper = customer.tier === "superadmin" || customer.tier === "admin";
        let maxAllowed = 10;
        if (isSuper || customer.tier === "ultra" || customer.tier === "vip") maxAllowed = 99999;
        else if (customer.tier === "professional" || customer.tier === "pro") maxAllowed = 50;
        else if (customer.tier === "advanced" || customer.tier === "advance") maxAllowed = 25;

        const todayStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        const dRes = await centralDb.readDoc("daily_graphic_downloads", `${customer.email}_${todayStr}`);
        const count = dRes?.success && dRes.data ? Number(dRes.data.count || 0) : 0;
        customer.remainingToday = Math.max(0, maxAllowed - count);
        customer.downloadsToday = count;
        customer.maxAllowed = maxAllowed;
      } catch {}

      try {
        const wRes = await centralDb.readDoc("wallets", customer.email);
        if (wRes?.success && wRes.data) {
          customer.coinBalance = Number(wRes.data.coinBalance || 0);
        }
      } catch {}
    }

    return customer;
  };

  /**
   * GET /api/admin/whatsapp/conversations
   * Retrieves conversation list for the Live Inbox with filters, search, and customer enrichment.
   */
  app.get("/api/admin/whatsapp/conversations", requireAdmin, async (req: any, res: any) => {
    try {
      const filter = String(req.query.filter || "all").toLowerCase().trim();
      const search = String(req.query.search || "").toLowerCase().trim();
      const operatorFilter = String(req.query.operatorId || "").trim();
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || "100"), 10)));

      // 1. Fetch conversations from Firestore or cache
      const convMap = new Map<string, any>();

      // Populate from in-memory cache
      for (const [id, conv] of conversationCache.entries()) {
        convMap.set(id, { ...conv, conversationId: id, id });
      }

      // Fetch from Firestore
      if (centralDb?.listDocs) {
        try {
          const listRes = await centralDb.listDocs("whatsapp_conversations", 300);
          if (listRes?.success && Array.isArray(listRes.documents)) {
            for (const doc of listRes.documents) {
              const id = doc.conversationId || doc.id || doc.docId;
              if (id) {
                const merged = { ...doc, conversationId: id, id, ...(convMap.get(id) || {}) };
                convMap.set(id, merged);
                conversationCache.set(id, merged);
              }
            }
          }
        } catch (dbErr: any) {
          console.warn("[WhatsApp:AdminInbox] listDocs warning:", dbErr?.message || dbErr);
        }
      }

      let allConversations = Array.from(convMap.values());

      // 2. Enrich with customer details
      const enrichedConversations = await Promise.all(
        allConversations.map(async (conv) => {
          const phone = conv.waId || conv.customerPhone || "";
          const customer = await enrichCustomerData(phone);
          return {
            ...conv,
            conversationId: conv.conversationId || conv.id,
            customerPhone: phone,
            customerName: customer.fullName || customer.name || conv.customerName || maskWaId(phone),
            customerEmail: customer.email || conv.customerEmail || "",
            handlingMode: conv.handlingMode || "ai",
            unreadCount: Number(conv.unreadCount || 0),
            status: conv.status || "open",
            lastMessagePreview: conv.lastMessagePreview || "",
            lastMessageAt: Number(conv.lastMessageAt || conv.lastInboundAt || conv.updatedAt || 0),
            lastMessageStatus: conv.lastMessageStatus || "sent",
            lastMessageDirection: conv.lastMessageDirection || "inbound",
            assignedOperatorId: conv.assignedOperatorId || null,
            assignedOperatorName: conv.assignedOperatorName || null,
            customer,
          };
        })
      );

      // 3. Apply Filters
      let filtered = enrichedConversations.filter((c) => {
        // Mode/status filters
        if (filter === "unread" && c.unreadCount <= 0) return false;
        if (filter === "unassigned" && Boolean(c.assignedOperatorId)) return false;
        if (filter === "ai" && c.handlingMode !== "ai") return false;
        if (filter === "human" && c.handlingMode !== "human") return false;
        if (filter === "waiting_human" && c.handlingMode !== "waiting_human") return false;
        if (filter === "closed" && c.status !== "closed") return false;
        if (filter !== "closed" && c.status === "closed" && filter !== "all") return false;

        // Operator filter
        if (operatorFilter && c.assignedOperatorId !== operatorFilter) return false;

        // Search filter (phone, name, email, preview)
        if (search) {
          const textMatch =
            (c.customerPhone || "").toLowerCase().includes(search) ||
            (c.customerName || "").toLowerCase().includes(search) ||
            (c.customerEmail || "").toLowerCase().includes(search) ||
            (c.lastMessagePreview || "").toLowerCase().includes(search);
          if (!textMatch) return false;
        }

        return true;
      });

      // 4. Sort descending by last activity timestamp
      filtered.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

      return res.json({
        success: true,
        count: filtered.length,
        filter,
        conversations: filtered.slice(0, limit),
      });
    } catch (err: any) {
      console.error("[WhatsApp:AdminInbox] Error listing conversations:", err?.message || err);
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * GET /api/admin/whatsapp/conversations/:id
   * Retrieves single conversation details with rich customer info.
   */
  app.get("/api/admin/whatsapp/conversations/:id", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });

      let convDoc: any = null;
      if (centralDb?.readDoc) {
        const cRes = await centralDb.readDoc("whatsapp_conversations", convId);
        if (cRes?.success && cRes.data) convDoc = cRes.data;
      }
      if (!convDoc && conversationCache.has(convId)) {
        convDoc = conversationCache.get(convId);
      }

      if (!convDoc) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      const phone = convDoc.waId || convDoc.customerPhone || "";
      const customer = await enrichCustomerData(phone);

      const conversation = {
        ...convDoc,
        conversationId: convId,
        customerPhone: phone,
        customerName: customer.fullName || customer.name || convDoc.customerName || maskWaId(phone),
        customerEmail: customer.email || "",
        handlingMode: convDoc.handlingMode || "ai",
        unreadCount: Number(convDoc.unreadCount || 0),
        status: convDoc.status || "open",
        customer,
      };

      return res.json({ success: true, conversation });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * GET /api/admin/whatsapp/conversations/:id/messages
   * Retrieves chronological message history for a conversation.
   */
  app.get("/api/admin/whatsapp/conversations/:id/messages", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });

      const limit = Math.min(300, Math.max(1, parseInt(String(req.query.limit || "100"), 10)));
      const msgsMap = new Map<string, any>();

      // 1. Gather messages from memory cache
      for (const [id, msg] of messageCache.entries()) {
        if (msg.conversationId === convId) {
          msgsMap.set(id, { ...msg, id });
        }
      }

      // 2. Gather from Firestore
      if (centralDb?.listDocs) {
        try {
          const listRes = await centralDb.listDocs("whatsapp_messages", 400);
          if (listRes?.success && Array.isArray(listRes.documents)) {
            for (const doc of listRes.documents) {
              if (doc.conversationId === convId) {
                const id = doc.messageId || doc.id || doc.docId || sha256(String(doc.metaMessageId || Date.now()));
                const merged = { ...doc, id, ...(msgsMap.get(id) || {}) };
                msgsMap.set(id, merged);
                messageCache.set(id, merged);
              }
            }
          }
        } catch (dbErr: any) {
          console.warn("[WhatsApp:AdminInbox] Messages listDocs warning:", dbErr?.message || dbErr);
        }
      }

      const messages = Array.from(msgsMap.values());
      // Sort chronological ascending (oldest first, latest last)
      messages.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));

      return res.json({
        success: true,
        conversationId: convId,
        count: messages.length,
        messages: messages.slice(-limit),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * POST /api/admin/whatsapp/conversations/:id/mode
   * Changes conversation handling mode: 'ai' | 'human' | 'waiting_human'.
   * Records audit event and updates Firestore persistently.
   */
  app.post("/api/admin/whatsapp/conversations/:id/mode", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      const newMode = String(req.body?.mode || "").toLowerCase().trim();

      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });
      if (!["ai", "human", "waiting_human"].includes(newMode)) {
        return res.status(400).json({
          success: false,
          error: "अमान्य हैंडलिंग मोड। केवल 'ai', 'human' अथवा 'waiting_human' मान्य हैं।"
        });
      }

      let convDoc: any = null;
      if (centralDb?.readDoc) {
        const cRes = await centralDb.readDoc("whatsapp_conversations", convId);
        if (cRes?.success && cRes.data) convDoc = cRes.data;
      }
      if (!convDoc && conversationCache.has(convId)) {
        convDoc = conversationCache.get(convId);
      }

      if (!convDoc) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      const previousMode = convDoc.handlingMode || "ai";
      const now = Date.now();
      const actorEmail = req.user?.email || "admin";

      // Phase 1B.2 Hardening: Detect whether an AI dispatch reservation is active (in-flight)
      const existingRes = convDoc.aiDispatchReservation;
      const isAiInFlight = Boolean(existingRes && Number(existingRes.expiresAt || 0) > now);

      const updatedConv = {
        ...convDoc,
        handlingMode: newMode,
        aiDispatchReservation: newMode === "human" ? null : convDoc.aiDispatchReservation,
        operatorTakeoverAt: newMode === "human" ? now : convDoc.operatorTakeoverAt,
        conversationVersion: Number(convDoc.conversationVersion || 0) + 1,
        modeUpdatedAt: now,
        modeUpdatedBy: actorEmail,
        status: newMode === "waiting_human" ? "human_requested" : convDoc.status || "open",
        updatedAt: now,
      };

      await requireWrite("whatsapp_conversations", convId, updatedConv);
      conversationCache.set(convId, updatedConv);

      await recordAuditEvent(centralDb, {
        conversationId: convId,
        eventType: "conversation_mode_changed",
        previousValue: previousMode,
        newValue: newMode,
        actorId: actorEmail,
        actorType: "operator",
        metadata: {
          reason: req.body?.reason || "manual_operator_switch",
          aiWasInFlight: isAiInFlight,
          revokedReservationId: isAiInFlight && newMode === "human" ? existingRes?.reservationId : null,
        },
      });

      console.log(`[WhatsApp:Handoff] Conversation ${convId} mode transitioned: ${previousMode} -> ${newMode} by ${actorEmail}${isAiInFlight ? " (AI dispatch was in-flight)" : ""}`);
      return res.json({
        success: true,
        conversationId: convId,
        previousMode,
        newMode,
        modeUpdatedAt: now,
        aiDispatchInFlight: isAiInFlight,
        warning: isAiInFlight ? "ai_dispatch_in_flight" : undefined,
        warningMessage: isAiInFlight ? "चेतावनी: एक स्वचालित AI संदेश पहले से प्रेषण प्रक्रिया में (in-flight) था। ऑपरेटर टेकओवर प्रभावी हो चुका है, किंतु यदि पूर्ववर्ती संदेश Meta सॉकेट पर जा चुका है, तो वह निरस्त नहीं हो सकेगा।" : undefined,
      });
    } catch (err: any) {
      console.error("[WhatsApp:Handoff] Error updating mode:", err?.message || err);
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * POST /api/admin/whatsapp/conversations/:id/assign
   * Assigns an operator to the conversation.
   * Automatically transitions handlingMode to 'human' on operator acceptance.
   * Includes optimistic concurrency protection via expectedOperatorId.
   */
  app.post("/api/admin/whatsapp/conversations/:id/assign", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });

      const actorEmail = req.user?.email || "admin";
      const operatorId = String(req.body?.operatorId || req.user?.userId || actorEmail).trim();
      const operatorName = String(req.body?.operatorName || req.user?.name || req.user?.fullName || actorEmail).trim();
      const operatorEmail = String(req.body?.operatorEmail || actorEmail).trim();
      const expectedOperatorId = req.body?.expectedOperatorId;

      let convDoc: any = null;
      if (centralDb?.readDoc) {
        const cRes = await centralDb.readDoc("whatsapp_conversations", convId);
        if (cRes?.success && cRes.data) convDoc = cRes.data;
      }
      if (!convDoc && conversationCache.has(convId)) {
        convDoc = conversationCache.get(convId);
      }

      if (!convDoc) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      // Optimistic Concurrency Protection: prevent silent overwriting if already assigned to someone else
      if (expectedOperatorId !== undefined && convDoc.assignedOperatorId && convDoc.assignedOperatorId !== expectedOperatorId) {
        return res.status(409).json({
          success: false,
          errorCode: "CONCURRENT_ASSIGNMENT_CONFLICT",
          error: `यह वार्तालाप पहले ही ${convDoc.assignedOperatorName || convDoc.assignedOperatorId} को असाइन किया जा चुका है।`,
          currentOperatorId: convDoc.assignedOperatorId,
          currentOperatorName: convDoc.assignedOperatorName,
        });
      }

      const previousOperatorId = convDoc.assignedOperatorId || null;
      const previousMode = convDoc.handlingMode || "ai";
      const now = Date.now();

      // Phase 1B.2 Hardening: Detect whether an AI dispatch reservation is active (in-flight)
      const existingRes = convDoc.aiDispatchReservation;
      const isAiInFlight = Boolean(existingRes && Number(existingRes.expiresAt || 0) > now);

      const updatedConv = {
        ...convDoc,
        assignedOperatorId: operatorId,
        assignedOperatorName: operatorName,
        assignedOperatorEmail: operatorEmail,
        assignedAt: now,
        assignedBy: actorEmail,
        // Auto transition to human mode on operator assignment
        handlingMode: "human",
        aiDispatchReservation: null, // Revokes any pending AI dispatch reservation
        operatorTakeoverAt: now,
        conversationVersion: Number(convDoc.conversationVersion || 0) + 1,
        modeUpdatedAt: now,
        modeUpdatedBy: actorEmail,
        updatedAt: now,
      };

      await requireWrite("whatsapp_conversations", convId, updatedConv);
      conversationCache.set(convId, updatedConv);

      await recordAuditEvent(centralDb, {
        conversationId: convId,
        eventType: "operator_assigned",
        previousValue: previousOperatorId,
        newValue: operatorId,
        actorId: actorEmail,
        actorType: "operator",
        metadata: {
          operatorName,
          operatorEmail,
          aiWasInFlight: isAiInFlight,
          revokedReservationId: isAiInFlight ? existingRes?.reservationId : null,
        },
      });

      console.log(`[WhatsApp:Handoff] Conversation ${convId} assigned to ${operatorName} (${operatorId})${isAiInFlight ? " (AI dispatch was in-flight)" : ""}`);
      return res.json({
        success: true,
        conversationId: convId,
        assignedOperatorId: operatorId,
        assignedOperatorName: operatorName,
        handlingMode: "human",
        aiDispatchInFlight: isAiInFlight,
        warning: isAiInFlight ? "ai_dispatch_in_flight" : undefined,
        warningMessage: isAiInFlight ? "चेतावनी: वार्तालाप ऑपरेटर को असाइन कर दिया गया है, किंतु एक पूर्ववर्ती AI संदेश प्रेषण प्रक्रिया (in-flight) में था।" : undefined,
      });
    } catch (err: any) {
      console.error("[WhatsApp:Handoff] Error assigning operator:", err?.message || err);
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * POST /api/admin/whatsapp/conversations/:id/unassign
   * Unassigns the current operator from the conversation.
   */
  app.post("/api/admin/whatsapp/conversations/:id/unassign", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });

      let convDoc: any = null;
      if (centralDb?.readDoc) {
        const cRes = await centralDb.readDoc("whatsapp_conversations", convId);
        if (cRes?.success && cRes.data) convDoc = cRes.data;
      }
      if (!convDoc && conversationCache.has(convId)) {
        convDoc = conversationCache.get(convId);
      }

      if (!convDoc) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      const previousOperatorId = convDoc.assignedOperatorId || null;
      const previousOperatorName = convDoc.assignedOperatorName || null;
      const now = Date.now();
      const actorEmail = req.user?.email || "admin";

      const updatedConv = {
        ...convDoc,
        assignedOperatorId: null,
        assignedOperatorName: null,
        assignedOperatorEmail: null,
        unassignedAt: now,
        unassignedBy: actorEmail,
        updatedAt: now,
      };

      await requireWrite("whatsapp_conversations", convId, updatedConv);
      conversationCache.set(convId, updatedConv);

      await recordAuditEvent(centralDb, {
        conversationId: convId,
        eventType: "operator_unassigned",
        previousValue: previousOperatorId,
        newValue: null,
        actorId: actorEmail,
        actorType: "operator",
        metadata: { previousOperatorName },
      });

      console.log(`[WhatsApp:Handoff] Conversation ${convId} unassigned by ${actorEmail}`);
      return res.json({
        success: true,
        conversationId: convId,
        previousOperatorId,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * POST /api/admin/whatsapp/conversations/:id/reply
   * Sends an operator message via official Meta WhatsApp Graph API.
   * Enforces Meta 24-hour customer service window, message size limits,
   * idempotency protection, and maintains conversation in human mode.
   */
  app.post("/api/admin/whatsapp/conversations/:id/reply", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      const text = String(req.body?.text || "").trim();
      const idempotencyKey = String(req.body?.idempotencyKey || "").trim();

      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });
      if (!text || text.length > 4096) {
        return res.status(400).json({
          success: false,
          error: "संदेश खाली नहीं हो सकता और अधिकतम 4096 अक्षरों का होना चाहिए।"
        });
      }

      // Idempotency check: prevent accidental duplicate sends
      if (idempotencyKey) {
        const lastSent = replyIdempotencyCache.get(idempotencyKey);
        if (lastSent && Date.now() - lastSent < 600000) {
          // Within 10 minutes duplicate key
          return res.status(409).json({
            success: false,
            errorCode: "DUPLICATE_REQUEST",
            error: "यह संदेश पहले ही भेजा जा चुका है (Duplicate request detected).",
          });
        }
        replyIdempotencyCache.set(idempotencyKey, Date.now());
      }

      // Fetch conversation document
      let convDoc: any = null;
      if (centralDb?.readDoc) {
        const cRes = await centralDb.readDoc("whatsapp_conversations", convId);
        if (cRes?.success && cRes.data) convDoc = cRes.data;
      }
      if (!convDoc && conversationCache.has(convId)) {
        convDoc = conversationCache.get(convId);
      }

      if (!convDoc) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      const recipientWaId = convDoc.waId || convDoc.customerPhone;
      if (!recipientWaId) {
        return res.status(400).json({ success: false, error: "वैध ग्राहक फ़ोन नंबर उपलब्ध नहीं है।" });
      }

      // Meta 24-Hour Customer Care Window Compliance
      const lastInboundAt = Number(convDoc.lastInboundAt || 0);
      const windowMs = 24 * 60 * 60 * 1000; // 24 hours
      const timeSinceInbound = Date.now() - lastInboundAt;
      const isWithinWindow = lastInboundAt > 0 && timeSinceInbound <= windowMs;

      if (!isWithinWindow) {
        console.warn(`[WhatsApp:OperatorReply] Reply blocked: outside 24h window for ${maskWaId(recipientWaId)} (last inbound: ${lastInboundAt})`);
        return res.status(403).json({
          success: false,
          errorCode: "OUTSIDE_24H_WINDOW",
          error: "24 घंटे की ग्राहक सेवा विंडो समाप्त हो चुकी है। Meta नीति के अनुसार केवल स्वीकृत टेम्पलेट संदेश ही भेजा जा सकता है।",
          lastInboundAt,
          hoursElapsed: Math.round(timeSinceInbound / (3600 * 1000) * 10) / 10,
        });
      }

      // Dispatch message via Meta WhatsApp API
      const operatorEmail = req.user?.email || "operator";
      const operatorName = req.user?.name || req.user?.fullName || operatorEmail;
      console.log(`[WhatsApp:OperatorReply] Operator ${operatorEmail} sending reply to ${maskWaId(recipientWaId)}: "${text.slice(0, 40)}..."`);

      // Phase 1B.2 Hardening: Detect whether an AI dispatch reservation was active (in-flight) prior to operator reply
      const existingRes = convDoc.aiDispatchReservation;
      const isAiInFlight = Boolean(existingRes && Number(existingRes.expiresAt || 0) > Date.now());

      const sent = await sendWhatsAppText(recipientWaId, text);
      const outMsgId = String(sent?.messages?.[0]?.id || `operator-${Date.now()}-${randomBytes(4).toString("hex")}`);
      const now = Date.now();

      // Save outbound message record
      const outRecord = {
        messageId: outMsgId,
        metaMessageId: outMsgId,
        conversationId: convId,
        waId: recipientWaId,
        direction: "outbound",
        messageType: "text",
        text,
        timestamp: now,
        status: "sent",
        senderType: "human_operator",
        senderId: operatorEmail,
        senderName: operatorName,
        idempotencyKey: idempotencyKey || null,
        createdAt: now,
      };

      await requireWrite("whatsapp_messages", sha256(outMsgId), outRecord);
      messageCache.set(sha256(outMsgId), outRecord);

      // Update parent conversation
      const updatedConv = {
        ...convDoc,
        lastMessagePreview: text.slice(0, 180),
        lastMessageDirection: "outbound",
        lastMessageAt: now,
        lastMessageStatus: "sent",
        unreadCount: 0, // Reset unread count as operator has replied
        handlingMode: "human", // Remains in human mode until explicitly switched
        aiDispatchReservation: null, // Revokes any AI dispatch reservation
        operatorTakeoverAt: now,
        conversationVersion: Number(convDoc.conversationVersion || 0) + 1,
        updatedAt: now,
      };

      await requireWrite("whatsapp_conversations", convId, updatedConv);
      conversationCache.set(convId, updatedConv);

      await recordAuditEvent(centralDb, {
        conversationId: convId,
        eventType: "operator_reply_sent",
        newValue: outMsgId,
        actorId: operatorEmail,
        actorType: "operator",
        metadata: { textLength: text.length, messageId: outMsgId, aiWasInFlight: isAiInFlight },
      });

      console.log(`[WhatsApp:OperatorReply] Message ${outMsgId} successfully sent and recorded${isAiInFlight ? " (AI dispatch was in-flight prior to reply)" : ""}`);
      return res.json({
        success: true,
        messageId: outMsgId,
        status: "sent",
        timestamp: now,
        aiDispatchInFlight: isAiInFlight,
        warning: isAiInFlight ? "ai_dispatch_in_flight" : undefined,
        warningMessage: isAiInFlight ? "चेतावनी: ऑपरेटर उत्तर प्रेषित किया गया, किंतु पूर्ववर्ती AI संदेश नेटवर्क प्रेषण (in-flight) में था।" : undefined,
      });
    } catch (err: any) {
      console.error("[WhatsApp:OperatorReply] Error sending reply:", err?.message || err);
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * POST /api/admin/whatsapp/conversations/:id/mark-read
   * Marks a conversation as read (resets unreadCount to 0).
   */
  app.post("/api/admin/whatsapp/conversations/:id/mark-read", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });

      let convDoc: any = null;
      if (centralDb?.readDoc) {
        const cRes = await centralDb.readDoc("whatsapp_conversations", convId);
        if (cRes?.success && cRes.data) convDoc = cRes.data;
      }
      if (!convDoc && conversationCache.has(convId)) {
        convDoc = conversationCache.get(convId);
      }

      if (!convDoc) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      const updatedConv = {
        ...convDoc,
        unreadCount: 0,
        readAt: Date.now(),
        readBy: req.user?.email || "admin",
        updatedAt: Date.now(),
      };

      await requireWrite("whatsapp_conversations", convId, updatedConv);
      conversationCache.set(convId, updatedConv);

      return res.json({ success: true, conversationId: convId, unreadCount: 0 });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * POST /api/admin/whatsapp/conversations/:id/close
   * Closes a conversation.
   */
  app.post("/api/admin/whatsapp/conversations/:id/close", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });

      let convDoc: any = null;
      if (centralDb?.readDoc) {
        const cRes = await centralDb.readDoc("whatsapp_conversations", convId);
        if (cRes?.success && cRes.data) convDoc = cRes.data;
      }
      if (!convDoc && conversationCache.has(convId)) {
        convDoc = conversationCache.get(convId);
      }

      if (!convDoc) {
        return res.status(404).json({ success: false, error: "Conversation not found" });
      }

      const now = Date.now();
      const actorEmail = req.user?.email || "admin";
      const updatedConv = {
        ...convDoc,
        status: "resolved",
        handlingMode: "ai",
        assignedOperatorId: null,
        assignedOperatorName: null,
        closedAt: now,
        closedBy: actorEmail,
        resolvedAt: now,
        resolvedBy: actorEmail,
        reactivatedToAiAt: now,
        conversationVersion: Number(convDoc.conversationVersion || 0) + 1,
        updatedAt: now,
      };

      await requireWrite("whatsapp_conversations", convId, updatedConv);
      conversationCache.set(convId, updatedConv);

      await recordAuditEvent(centralDb, {
        conversationId: convId,
        eventType: "conversation_closed_and_reactivated_to_ai",
        previousValue: `${convDoc.status || "open"}:${convDoc.handlingMode || "human"}`,
        newValue: "resolved:ai",
        actorId: actorEmail,
        actorType: "operator",
      });

      return res.json({ success: true, conversationId: convId, status: "resolved", handlingMode: "ai" });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * POST /api/admin/whatsapp/operator/logout
   * Handles safe operator sign-out:
   * Prevents abrupt abandonment to AI while unassigned conversations wait for team pickup.
   * By default requeues active conversations to 'waiting_human' unassigned.
   * If autoReturnToAiOnLogout is explicitly requested, transitions them to 'ai'.
   */
  app.post("/api/admin/whatsapp/operator/logout", requireAdmin, async (req: any, res: any) => {
    try {
      const actorEmail = req.user?.email || "admin";
      const operatorId = String(req.body?.operatorId || actorEmail).trim().toLowerCase();
      const autoReturnToAiOnLogout = Boolean(req.body?.autoReturnToAiOnLogout === true);
      const now = Date.now();

      let convList: any[] = [];
      if (centralDb?.listDocs) {
        try {
          const listRes = await centralDb.listDocs("whatsapp_conversations", 500);
          convList = listRes?.documents || [];
        } catch {}
      }
      if (convList.length === 0 && conversationCache.size > 0) {
        convList = Array.from(conversationCache.values());
      }

      let transitionedCount = 0;
      const targetMode = autoReturnToAiOnLogout ? "ai" : "waiting_human";

      for (const conv of convList) {
        if (!conv) continue;
        const convOp = String(conv.assignedOperatorId || conv.assignedOperatorEmail || "").toLowerCase().trim();
        const isOpen = conv.status !== "closed" && conv.status !== "resolved";

        if (isOpen && (convOp === operatorId || convOp === actorEmail)) {
          const updatedConv = {
            ...conv,
            handlingMode: targetMode,
            status: autoReturnToAiOnLogout ? conv.status : "human_requested",
            assignedOperatorId: null,
            assignedOperatorName: null,
            operatorLoggedOutAt: now,
            conversationVersion: Number(conv.conversationVersion || 0) + 1,
            updatedAt: now,
            ...(autoReturnToAiOnLogout ? { reactivatedToAiAt: now } : {}),
          };

          const convId = conv.conversationId || conv.id;
          if (convId) {
            await requireWrite("whatsapp_conversations", convId, updatedConv).catch(() => {});
            conversationCache.set(convId, updatedConv);
            transitionedCount++;

            await recordAuditEvent(centralDb, {
              conversationId: convId,
              eventType: autoReturnToAiOnLogout ? "operator_logout_auto_ai_reactivated" : "operator_logout_requeued_to_waiting_human",
              previousValue: `operator:${operatorId}`,
              newValue: `mode:${targetMode}`,
              actorId: actorEmail,
              actorType: "operator",
            });
          }
        }
      }

      return res.json({
        success: true,
        operatorId,
        transitionedCount,
        mode: targetMode,
        autoReturnToAiOnLogout,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
    }
  });

  /**
   * GET /api/admin/whatsapp/conversations/:id/audit-events
   * Retrieves audit log trail for a conversation.
   */
  app.get("/api/admin/whatsapp/conversations/:id/audit-events", requireAdmin, async (req: any, res: any) => {
    try {
      const convId = String(req.params.id || "").trim();
      if (!convId) return res.status(400).json({ success: false, error: "Missing conversation ID" });

      const events: any[] = [];
      if (centralDb?.listDocs) {
        const aRes = await centralDb.listDocs("whatsapp_audit_events", 200);
        if (aRes?.success && Array.isArray(aRes.documents)) {
          for (const ev of aRes.documents) {
            if (ev.conversationId === convId) {
              events.push(ev);
            }
          }
        }
      }

      events.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
      return res.json({ success: true, conversationId: convId, count: events.length, events });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: String(err?.message || err) });
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

  // =========================================================================
  // WHATSAPP AI COMMAND CENTER: FLOW BUILDER ADMIN APIS
  // =========================================================================

  app.get("/api/admin/whatsapp/flows", requireAdmin, async (_req: any, res: any) => {
    try {
      const flows = loadFlowsDatabase(centralDb);
      return res.json({ success: true, flows });
    } catch (err: any) {
      console.error("[WhatsApp:FlowAdmin] Error fetching flows:", err);
      return res.status(500).json({ success: false, error: err?.message || "Failed to load flows" });
    }
  });

  app.get("/api/admin/whatsapp/flows/:id", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const flows = loadFlowsDatabase(centralDb);
      const flow = flows.find((f) => f.id === id);
      if (!flow) return res.status(404).json({ success: false, error: "Flow not found" });
      return res.json({ success: true, flow });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to get flow" });
    }
  });

  app.post("/api/admin/whatsapp/flows", requireAdmin, async (req: any, res: any) => {
    try {
      const payload = req.body || {};
      if (!payload.name) {
        return res.status(400).json({ success: false, error: "Flow name is required" });
      }
      const flows = loadFlowsDatabase(centralDb);
      const id = payload.id || `flow_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const now = Date.now();
      const newFlow: WhatsAppFlow = {
        id,
        name: payload.name.trim(),
        description: (payload.description || "").trim(),
        version: payload.version || "1.0",
        status: payload.status || "draft",
        trigger: payload.trigger || { type: "keyword", keywords: [] },
        nodes: Array.isArray(payload.nodes) ? payload.nodes : [],
        createdAt: now,
        updatedAt: now,
      };

      const existingIdx = flows.findIndex((f) => f.id === id);
      if (existingIdx !== -1) {
        flows[existingIdx] = newFlow;
      } else {
        flows.push(newFlow);
      }
      saveFlowsDatabase(flows, centralDb);
      return res.json({ success: true, flow: newFlow });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to save flow" });
    }
  });

  app.put("/api/admin/whatsapp/flows/:id", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const flows = loadFlowsDatabase(centralDb);
      const idx = flows.findIndex((f) => f.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: "Flow not found" });

      const updated: WhatsAppFlow = {
        ...flows[idx],
        ...req.body,
        id,
        updatedAt: Date.now(),
      };
      flows[idx] = updated;
      saveFlowsDatabase(flows, centralDb);
      return res.json({ success: true, flow: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to update flow" });
    }
  });

  app.post("/api/admin/whatsapp/flows/:id/duplicate", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const flows = loadFlowsDatabase(centralDb);
      const flow = flows.find((f) => f.id === id);
      if (!flow) return res.status(404).json({ success: false, error: "Flow not found" });

      const duplicatedId = `${flow.id}_copy_${Date.now().toString(36)}`;
      const duplicated: WhatsAppFlow = {
        ...flow,
        id: duplicatedId,
        name: `${flow.name} (कॉपी)`,
        status: "draft",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      flows.push(duplicated);
      saveFlowsDatabase(flows, centralDb);
      return res.json({ success: true, flow: duplicated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to duplicate flow" });
    }
  });

  app.delete("/api/admin/whatsapp/flows/:id", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const flows = loadFlowsDatabase(centralDb);
      const filtered = flows.filter((f) => f.id !== id);
      saveFlowsDatabase(filtered, centralDb);
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to delete flow" });
    }
  });

  app.post("/api/admin/whatsapp/flows/:id/status", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};
      if (!["draft", "published", "inactive"].includes(status)) {
        return res.status(400).json({ success: false, error: "Invalid status value ('draft' | 'published' | 'inactive')" });
      }
      const flows = loadFlowsDatabase(centralDb);
      const flow = flows.find((f) => f.id === id);
      if (!flow) return res.status(404).json({ success: false, error: "Flow not found" });
      flow.status = status;
      flow.updatedAt = Date.now();
      saveFlowsDatabase(flows, centralDb);
      return res.json({ success: true, flow });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to change flow status" });
    }
  });

  app.post("/api/admin/whatsapp/flows/:id/test", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { input = "नमस्ते", sessionState, startNodeId } = req.body || {};
      const flows = loadFlowsDatabase(centralDb);
      const flow = flows.find((f) => f.id === id);
      if (!flow) return res.status(404).json({ success: false, error: "Flow not found" });

      const start = startNodeId || (flow.nodes && flow.nodes[0] ? flow.nodes[0].id : "");
      const session: FlowSession = sessionState || {
        conversationId: `sim_${Date.now()}`,
        flowId: id,
        currentNodeId: start,
        variables: {},
        startedAt: Date.now(),
        lastInteractionAt: Date.now(),
        status: "active",
      };

      const result = await executeFlowNodes(
        id,
        start,
        String(input),
        session,
        centralDb,
        generateSupportReply
      );

      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Flow test failed" });
    }
  });

  // =========================================================================
  // WHATSAPP AI COMMAND CENTER: FAQ MANAGER ADMIN APIS
  // =========================================================================

  app.get("/api/admin/whatsapp/faqs", requireAdmin, async (req: any, res: any) => {
    try {
      const { search = "", category = "" } = req.query || {};
      let faqs = loadFaqsDatabase(centralDb);
      if (category) {
        faqs = faqs.filter((f) => f.category === category);
      }
      if (search) {
        const s = String(search).toLowerCase();
        faqs = faqs.filter(
          (f) =>
            (f.questionHi && f.questionHi.toLowerCase().includes(s)) ||
            (f.questionEn && f.questionEn.toLowerCase().includes(s)) ||
            (f.answerHi && f.answerHi.toLowerCase().includes(s)) ||
            (f.answerEn && f.answerEn.toLowerCase().includes(s)) ||
            (Array.isArray(f.keywords) && f.keywords.some((k) => k.toLowerCase().includes(s)))
        );
      }
      return res.json({ success: true, faqs });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to load FAQs" });
    }
  });

  app.get("/api/admin/whatsapp/faqs/categories", requireAdmin, async (_req: any, res: any) => {
    try {
      const faqs = loadFaqsDatabase(centralDb);
      const categories = Array.from(new Set(faqs.map((f) => f.category || "सामान्य"))).filter(Boolean);
      return res.json({ success: true, categories });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to get FAQ categories" });
    }
  });

  app.post("/api/admin/whatsapp/faqs", requireAdmin, async (req: any, res: any) => {
    try {
      const payload = req.body || {};
      if (!payload.questionHi && !payload.questionEn) {
        return res.status(400).json({ success: false, error: "Question (Hindi or English) is required" });
      }
      if (!payload.answerHi && !payload.answerEn) {
        return res.status(400).json({ success: false, error: "Answer (Hindi or English) is required" });
      }

      const faqs = loadFaqsDatabase(centralDb);
      const id = payload.id || `faq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const now = Date.now();
      const newFaq: WhatsAppFAQ = {
        id,
        category: payload.category || "सामान्य",
        questionHi: (payload.questionHi || "").trim(),
        questionEn: (payload.questionEn || "").trim(),
        answerHi: (payload.answerHi || "").trim(),
        answerEn: (payload.answerEn || "").trim(),
        keywords: Array.isArray(payload.keywords) ? payload.keywords : [],
        isActive: payload.isActive !== false,
        status: payload.status || "published",
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      faqs.push(newFaq);
      saveFaqsDatabase(faqs, centralDb);
      return res.json({ success: true, faq: newFaq });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to save FAQ" });
    }
  });

  app.put("/api/admin/whatsapp/faqs/:id", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const faqs = loadFaqsDatabase(centralDb);
      const idx = faqs.findIndex((f) => f.id === id);
      if (idx === -1) return res.status(404).json({ success: false, error: "FAQ not found" });

      const updated: WhatsAppFAQ = {
        ...faqs[idx],
        ...req.body,
        id,
        updatedAt: Date.now(),
      };
      faqs[idx] = updated;
      saveFaqsDatabase(faqs, centralDb);
      return res.json({ success: true, faq: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to update FAQ" });
    }
  });

  app.delete("/api/admin/whatsapp/faqs/:id", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const faqs = loadFaqsDatabase(centralDb);
      const filtered = faqs.filter((f) => f.id !== id);
      saveFaqsDatabase(filtered, centralDb);
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to delete FAQ" });
    }
  });

  app.post("/api/admin/whatsapp/faqs/:id/status", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status, isActive } = req.body || {};
      const faqs = loadFaqsDatabase(centralDb);
      const faq = faqs.find((f) => f.id === id);
      if (!faq) return res.status(404).json({ success: false, error: "FAQ not found" });

      if (status) faq.status = status;
      if (typeof isActive === "boolean") faq.isActive = isActive;
      faq.updatedAt = Date.now();
      saveFaqsDatabase(faqs, centralDb);
      return res.json({ success: true, faq });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to update FAQ status" });
    }
  });

  app.post("/api/admin/whatsapp/faqs/test-match", requireAdmin, async (req: any, res: any) => {
    try {
      const { query } = req.body || {};
      if (!query) return res.status(400).json({ success: false, error: "Query string is required" });
      const faqs = loadFaqsDatabase(centralDb);
      const match = matchFAQ(String(query), faqs);
      return res.json({ success: true, query, match });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "FAQ match test failed" });
    }
  });

  // =========================================================================
  // WHATSAPP AI COMMAND CENTER: QUICK REPLIES ADMIN APIS
  // =========================================================================

  app.get("/api/admin/whatsapp/quick-replies", requireAdmin, async (_req: any, res: any) => {
    try {
      const replies = loadQuickRepliesDatabase(centralDb);
      return res.json({ success: true, quickReplies: replies });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to load quick replies" });
    }
  });

  app.post("/api/admin/whatsapp/quick-replies", requireAdmin, async (req: any, res: any) => {
    try {
      const payload = req.body || {};
      if (!payload.title || !payload.text) {
        return res.status(400).json({ success: false, error: "Title and text are required" });
      }
      const replies = loadQuickRepliesDatabase(centralDb);
      const id = payload.id || `qr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const newQr: QuickReply = {
        id,
        title: payload.title.trim(),
        text: payload.text.trim(),
        shortcut: (payload.shortcut || "").trim(),
        category: payload.category || "सामान्य",
        createdAt: Date.now(),
      };
      const existingIdx = replies.findIndex((r) => r.id === id);
      if (existingIdx !== -1) {
        replies[existingIdx] = newQr;
      } else {
        replies.push(newQr);
      }
      saveQuickRepliesDatabase(replies, centralDb);
      return res.json({ success: true, quickReply: newQr });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to save quick reply" });
    }
  });

  app.delete("/api/admin/whatsapp/quick-replies/:id", requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const replies = loadQuickRepliesDatabase(centralDb);
      const filtered = replies.filter((r) => r.id !== id);
      saveQuickRepliesDatabase(filtered, centralDb);
      return res.json({ success: true, deletedId: id });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to delete quick reply" });
    }
  });

  // =========================================================================
  // WHATSAPP AI COMMAND CENTER: AUTOMATION SETTINGS ADMIN APIS
  // =========================================================================

  app.get("/api/admin/whatsapp/settings", requireAdmin, async (_req: any, res: any) => {
    try {
      const settings = loadAutomationSettings(centralDb);
      return res.json({
        success: true,
        settings,
        metaStatus: {
          configured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
          phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
          displayNumber: process.env.WHATSAPP_DISPLAY_NUMBER || process.env.WHATSAPP_PHONE_NUMBER || "+1 555-706-1955",
        },
        vapidStatus: {
          configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
          publicKey: process.env.VAPID_PUBLIC_KEY ? `${process.env.VAPID_PUBLIC_KEY.slice(0, 16)}...` : "NOT_CONFIGURED",
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to load settings" });
    }
  });

  app.post("/api/admin/whatsapp/settings", requireAdmin, async (req: any, res: any) => {
    try {
      const current = loadAutomationSettings(centralDb);
      const updated: WhatsAppAutomationSettings = {
        ...current,
        ...req.body,
        updatedAt: Date.now(),
      };
      saveAutomationSettings(updated, centralDb);
      return res.json({ success: true, settings: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to save settings" });
    }
  });

  // =========================================================================
  // WHATSAPP MESSAGE TEMPLATE MANAGER APIS (Meta Graph API Integration)
  // =========================================================================

  /**
   * GET /api/admin/whatsapp/templates
   * Retrieves all message templates, syncing live status with Meta Graph API if credentials are configured.
   */
  app.get("/api/admin/whatsapp/templates", requireAdmin, async (_req: any, res: any) => {
    try {
      const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
      const wabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "1136242015583003").trim();
      const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();

      const localTemplates = loadTemplatesDatabase(centralDb);
      let syncedWithMeta = false;
      let metaError: string | null = null;

      if (token && wabaId && !token.startsWith("test_") && process.env.NODE_ENV !== "test") {
        try {
          const metaResp = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=100`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const metaData = await metaResp.json().catch(() => ({}));
          if (metaResp.ok && Array.isArray(metaData?.data)) {
            syncedWithMeta = true;
            for (const item of metaData.data) {
              const name = String(item.name || "").trim();
              if (name) {
                localTemplates[name] = {
                  ...(localTemplates[name] || {}),
                  id: item.id || localTemplates[name]?.id,
                  name,
                  status: item.status || "APPROVED",
                  category: item.category || localTemplates[name]?.category || "MARKETING",
                  language: item.language || localTemplates[name]?.language || "hi",
                  components: item.components || localTemplates[name]?.components || [],
                  last_updated_time: Date.now(),
                };
              }
            }
            saveTemplatesDatabase(localTemplates, centralDb);
          } else {
            metaError = metaData?.error?.message || `Meta Graph API returned HTTP ${metaResp.status}`;
          }
        } catch (fetchErr: any) {
          metaError = String(fetchErr?.message || fetchErr);
        }
      }

      const templatesList = Object.values(localTemplates).sort((a: any, b: any) =>
        (Number(b.last_updated_time) || 0) - (Number(a.last_updated_time) || 0)
      );

      return res.json({
        success: true,
        templates: templatesList,
        syncedWithMeta,
        metaError: metaError || undefined,
        wabaId,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to load templates" });
    }
  });

  /**
   * POST /api/admin/whatsapp/templates
   * Submits a new message template to Meta Graph API and stores it in database.
   */
  app.post("/api/admin/whatsapp/templates", requireAdmin, async (req: any, res: any) => {
    try {
      const payload = req.body || {};
      const rawName = String(payload.name || "").trim().toLowerCase();
      if (!rawName || !/^[a-z0-9_]+$/.test(rawName)) {
        return res.status(400).json({
          success: false,
          error: "अमान्य टेम्प्लेट नाम: केवल छोटे अक्षर (a-z), अंक (0-9) और अंडरस्कोर (_) मान्य हैं।",
        });
      }

      const category = (payload.category || "MARKETING").toUpperCase();
      const language = (payload.language || "hi").trim();
      const bodyText = String(payload.bodyText || payload.text || "").trim();
      if (!bodyText) {
        return res.status(400).json({
          success: false,
          error: "टेम्प्लेट बॉडी टेक्स्ट आवश्यक है।",
        });
      }

      const headerType = (payload.headerType || "NONE").toUpperCase();
      const headerText = String(payload.headerText || "").trim();
      const headerSampleUrl = String(payload.headerSampleUrl || payload.imageUrl || "https://ainewsmaker.online/og-image.jpg").trim();
      const footerText = String(payload.footerText || "").trim();
      const buttonType = (payload.buttonType || "NONE").toUpperCase();
      const buttonLabel = String(payload.buttonLabel || payload.buttonText || "").trim();
      const buttonUrl = String(payload.buttonUrl || "").trim();
      const bodySamples = Array.isArray(payload.bodySamples) ? payload.bodySamples : (payload.bodySample ? [payload.bodySample] : []);

      // Build Meta-compliant components array
      const components: any[] = [];

      if (headerType === "IMAGE") {
        components.push({
          type: "HEADER",
          format: "IMAGE",
          example: { header_handle: [headerSampleUrl] },
        });
      } else if (headerType === "TEXT" && headerText) {
        components.push({
          type: "HEADER",
          format: "TEXT",
          text: headerText,
        });
      }

      const bodyComponent: any = {
        type: "BODY",
        text: bodyText,
      };
      if (bodySamples.length > 0) {
        bodyComponent.example = { body_text: [bodySamples] };
      }
      components.push(bodyComponent);

      if (footerText) {
        components.push({
          type: "FOOTER",
          text: footerText,
        });
      }

      if (buttonType === "URL" && buttonLabel && buttonUrl) {
        const buttonObj: any = {
          type: "URL",
          text: buttonLabel,
          url: buttonUrl,
        };
        if (buttonUrl.includes("{{1}}")) {
          buttonObj.example = ["?newsId=sample_news_123"];
        }
        components.push({
          type: "BUTTONS",
          buttons: [buttonObj],
        });
      }

      const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
      const wabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "1136242015583003").trim();
      const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();

      let metaStatus = "PENDING";
      let metaTemplateId = `tpl_${rawName}_${Date.now()}`;

      if (token && wabaId && !token.startsWith("test_") && process.env.NODE_ENV !== "test") {
        const metaPayload = {
          name: rawName,
          category,
          language,
          components,
        };

        const metaResp = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(metaPayload),
        });

        const metaResult = await metaResp.json().catch(() => ({}));
        if (!metaResp.ok) {
          const errMsg = metaResult?.error?.message || `Meta Graph API error (HTTP ${metaResp.status})`;
          return res.status(400).json({
            success: false,
            error: `Meta Template Submission Error: ${errMsg}`,
            metaError: metaResult,
          });
        }

        if (metaResult?.id) metaTemplateId = metaResult.id;
        if (metaResult?.status) metaStatus = metaResult.status;
      } else {
        // Offline development / test mode without a real Meta API response:
        // Must NEVER be falsely marked as genuine APPROVED. Explicitly labeled MOCK_APPROVED / SIMULATED.
        metaStatus = process.env.NODE_ENV === "test" ? "MOCK_APPROVED" : "SIMULATED";
      }

      const now = Date.now();
      const templateDoc = {
        id: metaTemplateId,
        name: rawName,
        category,
        language,
        status: metaStatus,
        headerType,
        headerText: headerType === "TEXT" ? headerText : undefined,
        headerSampleUrl: headerType === "IMAGE" ? headerSampleUrl : undefined,
        bodyText,
        bodySamples,
        footerText: footerText || undefined,
        buttonType,
        buttonLabel: buttonType === "URL" ? buttonLabel : undefined,
        buttonUrl: buttonType === "URL" ? buttonUrl : undefined,
        components,
        createdAt: now,
        last_updated_time: now,
        createdBy: req.user?.email || "admin",
      };

      const localTemplates = loadTemplatesDatabase(centralDb);
      localTemplates[rawName] = templateDoc;
      saveTemplatesDatabase(localTemplates, centralDb);
      templateCache.set(rawName, templateDoc);

      return res.json({
        success: true,
        template: templateDoc,
        message: "टेम्प्लेट सफलतापूर्वक Meta WhatsApp API में जमा कर दिया गया है।",
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to create template" });
    }
  });

  /**
   * DELETE /api/admin/whatsapp/templates/:name
   * Deletes a template from Meta Graph API and local database.
   */
  app.delete("/api/admin/whatsapp/templates/:name", requireAdmin, async (req: any, res: any) => {
    try {
      const name = String(req.params.name || "").trim().toLowerCase();
      if (!name) return res.status(400).json({ success: false, error: "Template name is required" });

      const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
      const wabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "1136242015583003").trim();
      const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();

      if (token && wabaId && !token.startsWith("test_") && process.env.NODE_ENV !== "test") {
        try {
          await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (delErr: any) {
          console.warn("[WhatsApp:Templates] Meta delete warning:", delErr?.message);
        }
      }

      const localTemplates = loadTemplatesDatabase(centralDb);
      delete localTemplates[name];
      saveTemplatesDatabase(localTemplates, centralDb);
      templateCache.delete(name);

      if (centralDb?.useFirestore && typeof centralDb.deleteDoc === "function") {
        centralDb.deleteDoc("whatsapp_templates", name).catch(() => {});
      }

      return res.json({ success: true, deletedName: name });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to delete template" });
    }
  });

  /**
   * POST /api/admin/whatsapp/templates/sync
   * Forces a live sync of template statuses from Meta Graph API.
   */
  app.post("/api/admin/whatsapp/templates/sync", requireAdmin, async (_req: any, res: any) => {
    try {
      const token = (process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
      const wabaId = (process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || "1136242015583003").trim();
      const version = (process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0").trim();

      const localTemplates = loadTemplatesDatabase(centralDb);
      let syncCount = 0;

      if (token && wabaId && !token.startsWith("test_") && process.env.NODE_ENV !== "test") {
        const metaResp = await fetch(`https://graph.facebook.com/${version}/${wabaId}/message_templates?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const metaData = await metaResp.json().catch(() => ({}));
        if (metaResp.ok && Array.isArray(metaData?.data)) {
          for (const item of metaData.data) {
            const name = String(item.name || "").trim();
            if (name) {
              localTemplates[name] = {
                ...(localTemplates[name] || {}),
                id: item.id || localTemplates[name]?.id,
                name,
                status: item.status || "APPROVED",
                category: item.category || localTemplates[name]?.category || "MARKETING",
                language: item.language || localTemplates[name]?.language || "hi",
                components: item.components || localTemplates[name]?.components || [],
                last_updated_time: Date.now(),
              };
              syncCount++;
            }
          }
          saveTemplatesDatabase(localTemplates, centralDb);
        }
      }

      return res.json({
        success: true,
        syncedCount: syncCount,
        templates: Object.values(localTemplates),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || "Failed to sync templates" });
    }
  });

  /**
   * GET /api/whatsapp/news/render-graphic
   * Canonical Graphic Studio Frame (graphic_001) renderer for VIP WhatsApp messages.
   * Uses approved editorial database, user branding, channel logo, and Studio layout.
   */
  app.get("/api/whatsapp/news/render-graphic", async (req: any, res: any) => {
    try {
      const newsId = String(req.query.newsId || "").trim();
      const phone = String(req.query.phone || req.query.waId || "").trim();
      const email = String(req.query.email || "").trim().toLowerCase();

      let targetPost: any = null;
      if (newsId && options?.getNewsDatabase) {
        try {
          const allNews = options.getNewsDatabase();
          if (Array.isArray(allNews)) {
            targetPost = allNews.find((p: any) => p && String(p.id) === newsId);
          }
        } catch {}
      }
      if (!targetPost && newsId && options?.getApprovedEditorialDatabase) {
        try {
          const editorial = options.getApprovedEditorialDatabase();
          if (editorial && editorial[newsId]) targetPost = editorial[newsId];
        } catch {}
      }

      let userProfile: any = null;
      if (options?.getProfilesDatabase) {
        try {
          const profiles = options.getProfilesDatabase();
          if (profiles) {
            if (email && profiles[email]) userProfile = profiles[email];
            if (!userProfile && phone) {
              const cleanP = getCleanDigits10(phone);
              userProfile = Object.values(profiles).find((pr: any) => pr && getCleanDigits10(pr.mobileNumber || pr.whatsappNumber || "") === cleanP);
            }
          }
        } catch {}
      }

      let dynamicFrame: any = null;
      const requestedFrameId = String(req.query.frameId || userProfile?.frameDesign || "").trim();
      if (requestedFrameId && options?.getDynamicFramesDatabase) {
        try {
          const frames = options.getDynamicFramesDatabase();
          if (Array.isArray(frames)) {
            dynamicFrame = frames.find((f: any) => f && f.id === requestedFrameId);
          }
        } catch {}
      }

      const primaryColor = dynamicFrame?.theme?.primaryColor || dynamicFrame?.primaryColor || "#b91c1c";
      const secondaryColor = dynamicFrame?.theme?.secondaryColor || dynamicFrame?.secondaryColor || "#dc2626";
      const accentColor = dynamicFrame?.theme?.accentColor || dynamicFrame?.accentColor || "#f59e0b";

      const headline = String(targetPost?.title || req.query.headline || "AI News Maker — ताज़ा खबर").slice(0, 140);
      const category = String(targetPost?.category || req.query.category || "ब्रेकिंग न्यूज़").slice(0, 30);
      const brand = String(userProfile?.channelNameHi || userProfile?.channelNameEn || req.query.brand || "AI NEWS MAKER").slice(0, 40);
      const logoUrl = String(userProfile?.channelLogoUrl || userProfile?.channelLogoPngUrl || req.query.logoUrl || "https://ainewsmaker.online/assets/breaking_news_wala_logo.png").trim();
      const leadPhoto = String(targetPost?.thumbnailUrl || targetPost?.imageUrl || req.query.imageUrl || "https://ainewsmaker.online/og-image.jpg").trim();
      const location = String(targetPost?.location || userProfile?.location || userProfile?.district || req.query.location || "").slice(0, 30);

      // Escape XML characters in text fields
      const escapeXml = (str: string) => str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });

      const safeHeadline = escapeXml(headline);
      const safeCategory = escapeXml(category);
      const safeBrand = escapeXml(brand);
      const safeLocation = escapeXml(location);
      const safePhoto = escapeXml(leadPhoto);
      const safeLogo = escapeXml(logoUrl);

      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="50%" stop-color="${secondaryColor}" />
      <stop offset="100%" stop-color="${primaryColor}" />
    </linearGradient>
    <linearGradient id="goldAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accentColor}" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="1080" height="1080" fill="url(#bg)" />

  <!-- Canonical Studio Header (graphic_001) -->
  <rect x="0" y="0" width="1080" height="110" fill="url(#headerGrad)" />
  <image href="${safeLogo}" x="30" y="15" width="80" height="80" preserveAspectRatio="xMidYMid meet" />
  <text x="130" y="65" fill="#ffffff" font-family="'Noto Sans Devanagari', 'Mukta', sans-serif" font-size="34" font-weight="900" filter="url(#shadow)">${safeBrand}</text>
  <rect x="850" y="30" width="200" height="50" rx="8" fill="#020617" stroke="${accentColor}" stroke-width="2" />
  <text x="950" y="62" fill="${accentColor}" font-family="'Noto Sans Devanagari', sans-serif" font-size="20" font-weight="bold" text-anchor="middle">LIVE NEWS</text>

  <!-- Editorial Lead Photo (Aspect Ratio 16:9 in Frame) -->
  <rect x="30" y="125" width="1020" height="570" rx="16" fill="#1e293b" />
  <image href="${safePhoto}" x="30" y="125" width="1020" height="570" preserveAspectRatio="xMidYMid slice" clip-path="inset(0 round 16px)" />

  <!-- Breaking Banner Ribbon & Location Pill -->
  <rect x="50" y="145" width="240" height="55" rx="8" fill="${secondaryColor}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)" />
  <text x="170" y="180" fill="#ffffff" font-family="'Noto Sans Devanagari', sans-serif" font-size="24" font-weight="900" text-anchor="middle">🚨 ${safeCategory}</text>
  ${safeLocation ? `<rect x="310" y="145" width="200" height="55" rx="8" fill="#020617" opacity="0.9" stroke="${accentColor}" stroke-width="1.5" />
  <text x="410" y="180" fill="#fef08a" font-family="'Noto Sans Devanagari', sans-serif" font-size="22" font-weight="bold" text-anchor="middle">📍 ${safeLocation}</text>` : ''}

  <!-- Graphic Studio Headline Card (graphic_001 Bottom Polygon) -->
  <rect x="30" y="710" width="1020" height="255" rx="16" fill="#ffffff" filter="url(#shadow)" />
  <polygon points="30,710 120,710 80,750 30,750" fill="${secondaryColor}" />
  <foreignObject x="60" y="725" width="960" height="225">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Noto Sans Devanagari', 'Mukta', sans-serif; font-size: 38px; font-weight: 900; line-height: 1.35; color: #020617; text-align: left; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">
      ${safeHeadline}
    </div>
  </foreignObject>

  <!-- Studio Custom Footer Strip -->
  <rect x="0" y="985" width="1080" height="95" fill="#020617" />
  <line x1="0" y1="985" x2="1080" y2="985" stroke="${accentColor}" stroke-width="3" />
  <text x="50" y="1040" fill="#94a3b8" font-family="'Noto Sans Devanagari', sans-serif" font-size="22" font-weight="600">AI News Maker Studio • Breaking News Wala</text>
  <text x="1030" y="1040" fill="${accentColor}" font-family="'Noto Sans Devanagari', sans-serif" font-size="24" font-weight="bold" text-anchor="end">🎨 ainewsmaker.online</text>
</svg>`;

      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(svg);
    } catch (err: any) {
      return res.status(500).send("Error rendering graphic");
    }
  });

  return {
    sendWhatsAppText,
    sendWhatsAppImage,
    uploadWhatsAppMedia,
    sendWhatsAppNewsBroadcast,
  };
}
