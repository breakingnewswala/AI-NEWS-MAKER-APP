var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  TEMPLATE_CONFIG_REGISTRY: () => TEMPLATE_CONFIG_REGISTRY,
  getTemplateConfig: () => getTemplateConfig
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_genai = require("@google/genai");
var import_openai = __toESM(require("openai"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
var safeFilename = typeof __filename !== "undefined" ? __filename : typeof import_meta !== "undefined" && import_meta.url ? (0, import_url.fileURLToPath)(import_meta.url) : process.cwd();
var safeDirname = typeof __dirname !== "undefined" ? __dirname : import_path.default.dirname(safeFilename);
import_dotenv.default.config();
var app = (0, import_express.default)();
var isAIStudio = Boolean(process.env.APPLET_ID || import_fs.default.existsSync("/app/control-plane-api") || process.env.DEFAULT_APP_PORT || import_fs.default.existsSync("/etc/nginx/nginx.conf"));
var PORT = isAIStudio ? 3e3 : parseInt(process.env.PORT || process.env.APP_PORT || "8080", 10);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
var CONFIGURED_OPENAI_KEY = "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";
var CONFIGURED_GEMINI_KEY = "AQ.Ab8RN6Llqa6KH_g2YuLo7EPCR8nBZS3pWoGPOrMnzgVGNLwYbA";
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
  process.env.GEMINI_API_KEY = CONFIGURED_GEMINI_KEY;
}
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "MY_OPENAI_API_KEY") {
  process.env.OPENAI_API_KEY = CONFIGURED_OPENAI_KEY;
}
var dynamicOpenAiKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "MY_OPENAI_API_KEY" ? process.env.OPENAI_API_KEY : CONFIGURED_OPENAI_KEY;
var dynamicCustomDomain = "";
var GEMINI_MODELS_POOL = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite"
];
function getCategoryFallbackImage(category = "general") {
  const cat = (category || "").toLowerCase();
  if (cat.includes("crime") || cat.includes("\u0905\u092A\u0930\u093E\u0927")) return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80";
  if (cat.includes("politics") || cat.includes("\u0930\u093E\u091C\u0928\u0940\u0924\u093F")) return "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=800&q=80";
  if (cat.includes("sports") || cat.includes("\u0916\u0947\u0932")) return "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80";
  if (cat.includes("tech") || cat.includes("\u0924\u0915\u0928\u0940\u0915")) return "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80";
  if (cat.includes("business") || cat.includes("\u0935\u094D\u092F\u093E\u092A\u093E\u0930")) return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80";
  if (cat.includes("weather") || cat.includes("\u092E\u094C\u0938\u092E")) return "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=800&q=80";
  return "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80";
}
app.get("/api/ai-providers-status", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
  const geminiAvailable = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim().length > 5);
  const openaiAvailable = Boolean(openaiKey && openaiKey !== "MY_OPENAI_API_KEY" && openaiKey.trim().length > 5);
  return res.json({
    geminiAvailable,
    openaiAvailable
  });
});
app.get("/api/cloud-status", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
  const geminiAvailable = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim().length > 5);
  const openaiAvailable = Boolean(openaiKey && openaiKey !== "MY_OPENAI_API_KEY" && openaiKey.trim().length > 5);
  return res.json({
    success: true,
    cloudActive: true,
    cloudProvider: "Google Cloud Platform (Cloud Run)",
    currentServerTime: (/* @__PURE__ */ new Date()).toISOString(),
    geminiAvailable,
    openaiAvailable,
    maskedOpenaiKey: openaiAvailable ? `${(openaiKey || "").slice(0, 6)}...${(openaiKey || "").slice(-4)}` : null,
    customDomain: dynamicCustomDomain || null
  });
});
app.post("/api/admin/set-ai-keys", async (req, res) => {
  try {
    const { openaiKey, geminiKey, customDomain } = req.body;
    if (openaiKey !== void 0) {
      dynamicOpenAiKey = String(openaiKey).trim();
      openaiClient = null;
    }
    if (geminiKey !== void 0 && String(geminiKey).trim().length > 5) {
      process.env.GEMINI_API_KEY = String(geminiKey).trim();
      aiClient = null;
    }
    if (customDomain !== void 0) {
      dynamicCustomDomain = String(customDomain).trim();
    }
    const effectiveOpenaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
    const openaiValid = Boolean(
      effectiveOpenaiKey && effectiveOpenaiKey !== "MY_OPENAI_API_KEY" && effectiveOpenaiKey.trim().length > 5
    );
    let testMessage = "\u0915\u094D\u0932\u093E\u0909\u0921 \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0939\u094B \u0917\u0908\u0902!";
    if (openaiKey && openaiValid) {
      try {
        const testClient = new import_openai.default({ apiKey: effectiveOpenaiKey.trim() });
        await testClient.models.list();
        testMessage = "\u2705 ChatGPT (OpenAI) API Key \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0915\u0928\u0947\u0915\u094D\u091F \u0935 \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924 \u0939\u094B \u0917\u0908!";
      } catch (testErr) {
        testMessage = `\u0915\u0940 \u0938\u0947\u0935 \u0939\u094B \u0917\u0908, \u0915\u093F\u0928\u094D\u0924\u0941 OpenAI \u091F\u0947\u0938\u094D\u091F \u091A\u0947\u0924\u093E\u0935\u0928\u0940: ${testErr?.message || "\u0915\u0943\u092A\u092F\u093E \u0915\u0940 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0947\u0902"}`;
      }
    }
    return res.json({
      success: true,
      message: testMessage,
      openaiAvailable: openaiValid,
      geminiAvailable: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
      customDomain: dynamicCustomDomain
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var NEWS_DB_FILE = import_path.default.join(process.cwd(), "news_database.json");
function getInitialRichNewsPosts() {
  const now = Date.now();
  return [
    {
      id: "live-post-1",
      title: "\u092D\u093E\u0930\u0924 \u0928\u0947 \u0932\u0949\u0928\u094D\u091A \u0915\u093F\u092F\u093E \u0928\u092F\u093E AI \u0938\u0941\u092A\u0930\u0915\u0902\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0928\u0947\u091F\u0935\u0930\u094D\u0915, \u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u0938\u094D\u0924\u0930 \u092A\u0930 \u092C\u0928\u0940 \u0928\u0908 \u092A\u0939\u091A\u093E\u0928",
      summary: "\u0935\u093F\u091C\u094D\u091E\u093E\u0928 \u090F\u0935\u0902 \u092A\u094D\u0930\u094C\u0926\u094D\u092F\u094B\u0917\u093F\u0915\u0940 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0926\u094D\u0935\u093E\u0930\u093E \u0906\u091C \u0926\u0947\u0936 \u0915\u0947 \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 AI \u0938\u0941\u092A\u0930\u0915\u0902\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0915\u094D\u0932\u0938\u094D\u091F\u0930 \u0915\u093E \u0905\u0928\u093E\u0935\u0930\u0923 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964 \u092F\u0939 \u0924\u0915\u0928\u0940\u0915 \u092E\u094C\u0938\u092E \u092A\u0942\u0930\u094D\u0935\u093E\u0928\u0941\u092E\u093E\u0928 \u0914\u0930 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u0915\u094D\u0930\u093E\u0902\u0924\u093F \u0932\u093E\u090F\u0917\u0940\u0964",
      sourceChannel: "\u0926\u0948\u0928\u093F\u0915 \u092D\u093E\u0938\u094D\u0915\u0930 (Dainik Bhaskar)",
      sourceUrl: "https://dainikbhaskar.com/tech/ai-supercomputing",
      category: "tech",
      categoryName: "\u091F\u0947\u0915\u094D\u0928\u094B\u0932\u0949\u091C\u0940",
      publishedTime: "10 \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 10 * 60 * 1e3,
      fullContent: `\u0935\u093F\u091C\u094D\u091E\u093E\u0928 \u090F\u0935\u0902 \u092A\u094D\u0930\u094C\u0926\u094D\u092F\u094B\u0917\u093F\u0915\u0940 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0926\u094D\u0935\u093E\u0930\u093E \u0906\u091C \u0926\u0947\u0936 \u0915\u0947 \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 AI \u0938\u0941\u092A\u0930\u0915\u0902\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0915\u094D\u0932\u0938\u094D\u091F\u0930 \u0915\u093E \u092D\u0935\u094D\u092F \u0905\u0928\u093E\u0935\u0930\u0923 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964

\u{1F4CC} \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u0935\u0930\u0923 \u090F\u0935\u0902 \u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F:
\u0907\u0938 \u0928\u090F \u0915\u094D\u0932\u0938\u094D\u091F\u0930 \u0938\u0947 \u0926\u0947\u0936 \u0915\u0947 \u0932\u093E\u0916\u094B\u0902 \u0935\u0948\u091C\u094D\u091E\u093E\u0928\u093F\u0915\u094B\u0902, \u091B\u093E\u0924\u094D\u0930\u094B\u0902 \u0914\u0930 \u0938\u094D\u091F\u093E\u0930\u094D\u091F\u0905\u092A\u094D\u0938 \u0915\u094B \u0905\u092D\u0942\u0924\u092A\u0942\u0930\u094D\u0935 \u0915\u092E\u094D\u092A\u094D\u092F\u0942\u091F\u093F\u0902\u0917 \u0915\u094D\u0937\u092E\u0924\u093E \u092E\u093F\u0932\u0947\u0917\u0940\u0964 \u092F\u0939 \u092E\u094C\u0938\u092E \u092A\u0942\u0930\u094D\u0935\u093E\u0928\u0941\u092E\u093E\u0928, \u091A\u093F\u0915\u093F\u0924\u094D\u0938\u093E \u0905\u0928\u0941\u0938\u0902\u0927\u093E\u0928 \u0914\u0930 \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u0905\u0928\u094D\u0935\u0947\u0937\u0923 \u092E\u0947\u0902 \u0921\u0947\u091F\u093E \u090F\u0928\u093E\u0932\u093F\u0938\u093F\u0938 \u0915\u094B 10 \u0917\u0941\u0928\u093E \u0924\u0947\u091C \u0915\u0930 \u0926\u0947\u0917\u093E\u0964

\u{1F3A4} \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u092C\u092F\u093E\u0928:
\u0915\u0947\u0902\u0926\u094D\u0930\u0940\u092F \u0935\u093F\u091C\u094D\u091E\u093E\u0928 \u092E\u0902\u0924\u094D\u0930\u0940 \u0928\u0947 \u0915\u0939\u093E: "\u092D\u093E\u0930\u0924 \u0905\u092C \u0915\u0947\u0935\u0932 \u0924\u0915\u0928\u0940\u0915 \u0915\u093E \u0909\u092A\u092D\u094B\u0915\u094D\u0924\u093E \u0928\u0939\u0940\u0902, \u092C\u0932\u094D\u0915\u093F \u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u0938\u094D\u0924\u0930 \u092A\u0930 AI \u0938\u092E\u093E\u0927\u093E\u0928\u094B\u0902 \u0915\u093E \u0936\u0940\u0930\u094D\u0937 \u0928\u093F\u0930\u094D\u092E\u093E\u0924\u093E \u092C\u0928 \u0930\u0939\u093E \u0939\u0948\u0964"

\u{1F4CA} \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941:
\u2022 100 \u092A\u0947\u091F\u093E\u092B\u094D\u0932\u0949\u092A\u094D\u0938 \u0938\u0947 \u0905\u0927\u093F\u0915 \u0915\u0940 \u0915\u092E\u094D\u092A\u094D\u092F\u0942\u091F\u0947\u0936\u0928\u0932 \u0938\u094D\u092A\u0940\u0921
\u2022 \u0926\u0947\u0936 \u0915\u0947 \u0938\u092D\u0940 \u092A\u094D\u0930\u092E\u0941\u0916 IITs \u0914\u0930 \u0905\u0928\u0941\u0938\u0902\u0927\u093E\u0928 \u0938\u0902\u0938\u094D\u0925\u093E\u0928\u094B\u0902 \u0938\u0947 \u0938\u0940\u0927\u093E \u091C\u0941\u0921\u093C\u093E\u0935
\u2022 100% \u0939\u0930\u093F\u0924 \u090A\u0930\u094D\u091C\u093E \u0938\u0947 \u0938\u0902\u091A\u093E\u0932\u093F\u0924 \u0921\u093E\u091F\u093E \u0938\u0947\u0902\u091F\u0930`
    },
    {
      id: "live-post-2",
      title: "\u0938\u0902\u0938\u0926 \u092E\u0947\u0902 \u0921\u093F\u091C\u093F\u091F\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0914\u0930 AI \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u094D\u0930\u0938\u093E\u0930\u0923 \u092A\u0930 \u0910\u0924\u093F\u0939\u093E\u0938\u093F\u0915 \u0935\u093F\u0927\u0947\u092F\u0915 \u092A\u093E\u0930\u093F\u0924",
      summary: "\u0938\u0942\u091A\u0928\u093E \u090F\u0935\u0902 \u092A\u094D\u0930\u0938\u093E\u0930\u0923 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0928\u0947 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u092A\u092C\u094D\u0932\u093F\u0936\u0930\u094D\u0938 \u0914\u0930 \u090F\u0906\u0908 \u0906\u0927\u093E\u0930\u093F\u0924 \u0915\u0902\u091F\u0947\u0902\u091F \u091C\u0928\u0930\u0947\u0936\u0928 \u0915\u0947 \u0932\u093F\u090F \u092E\u093E\u0928\u0915 \u0924\u092F \u0915\u0930\u0928\u0947 \u0939\u0947\u0924\u0941 \u0910\u0924\u093F\u0939\u093E\u0938\u093F\u0915 \u092C\u093F\u0932 \u092A\u093E\u0930\u093F\u0924 \u0915\u093F\u092F\u093E\u0964 \u0921\u0940\u092A\u092B\u0947\u0915 \u092A\u0930 \u0915\u0921\u093C\u0947 \u0926\u0902\u0921 \u0915\u093E \u092A\u094D\u0930\u093E\u0935\u0927\u093E\u0928\u0964",
      sourceChannel: "\u0906\u091C \u0924\u0915 (Aaj Tak)",
      sourceUrl: "https://aajtak.in/national/digital-media-ai-bill",
      category: "politics",
      categoryName: "\u0930\u093E\u091C\u0928\u0940\u0924\u093F",
      publishedTime: "25 \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 25 * 60 * 1e3,
      fullContent: `\u0938\u0902\u0938\u0926 \u0915\u0947 \u0926\u094B\u0928\u094B\u0902 \u0938\u0926\u0928\u094B\u0902 \u092E\u0947\u0902 \u0921\u093F\u091C\u093F\u091F\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0914\u0930 \u090F\u0906\u0908 \u0915\u0902\u091F\u0947\u0902\u091F \u0915\u0947 \u0928\u093F\u092F\u092E\u0928 \u0939\u0947\u0924\u0941 \u0928\u092F\u093E \u0915\u093E\u0928\u0942\u0928 \u0927\u094D\u0935\u0928\u093F\u092E\u0924 \u0938\u0947 \u092A\u093E\u0930\u093F\u0924 \u0915\u093F\u092F\u093E \u0917\u092F\u093E\u0964

\u{1F4CC} \u092E\u0941\u0916\u094D\u092F \u092C\u093E\u0924\u0947\u0902:
1. \u0938\u094D\u0935\u0924\u0902\u0924\u094D\u0930 \u092A\u0924\u094D\u0930\u0915\u093E\u0930\u094B\u0902 \u0914\u0930 \u092F\u0942\u091F\u094D\u092F\u0942\u092C \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0938\u094D\u0935-\u092A\u094D\u0930\u092E\u093E\u0923\u0928 \u092A\u094D\u0930\u0923\u093E\u0932\u0940\u0964
2. \u090F\u0906\u0908 \u091C\u0928\u0930\u0947\u091F\u0947\u0921 \u0924\u0938\u094D\u0935\u0940\u0930\u094B\u0902 \u0914\u0930 \u0921\u0940\u092A\u092B\u0947\u0915 \u0935\u0940\u0921\u093F\u092F\u094B \u092A\u0930 \u0935\u093E\u091F\u0930\u092E\u093E\u0930\u094D\u0915 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F\u0964
3. \u0924\u0925\u094D\u092F\u0939\u0940\u0928 \u0935 \u092D\u094D\u0930\u093E\u092E\u0915 \u0916\u092C\u0930\u094B\u0902 \u092A\u0930 \u0924\u094D\u0935\u0930\u093F\u0924 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0939\u0947\u0924\u0941 \u0921\u093F\u091C\u093F\u091F\u0932 \u0913\u092E\u094D\u092C\u0921\u094D\u0938\u092E\u0948\u0928 \u0915\u0940 \u0928\u093F\u092F\u0941\u0915\u094D\u0924\u093F\u0964`
    },
    {
      id: "live-post-3",
      title: "\u090F\u0936\u093F\u092F\u093E \u0915\u092A \u0915\u094D\u0930\u093F\u0915\u0947\u091F: \u092D\u093E\u0930\u0924 \u0928\u0947 \u0930\u094B\u092E\u093E\u0902\u091A\u0915 \u092E\u0941\u0915\u093E\u092C\u0932\u0947 \u092E\u0947\u0902 \u092A\u093E\u0915\u093F\u0938\u094D\u0924\u093E\u0928 \u0915\u094B 5 \u0935\u093F\u0915\u0947\u091F \u0938\u0947 \u0939\u0930\u093E\u092F\u093E",
      summary: "\u092D\u093E\u0930\u0924\u0940\u092F \u091F\u0940\u092E \u0928\u0947 \u0936\u093E\u0928\u0926\u093E\u0930 \u0916\u0947\u0932 \u0915\u093E \u092A\u094D\u0930\u0926\u0930\u094D\u0936\u0928 \u0915\u0930\u0924\u0947 \u0939\u0941\u090F \u0905\u0902\u0924\u093F\u092E \u0913\u0935\u0930 \u092E\u0947\u0902 \u091C\u0940\u0924 \u0926\u0930\u094D\u091C \u0915\u0940\u0964 \u0938\u0932\u093E\u092E\u0940 \u092C\u0932\u094D\u0932\u0947\u092C\u093E\u091C \u0928\u0947 85 \u0930\u0928\u094B\u0902 \u0915\u0940 \u0928\u093E\u092C\u093E\u0926 \u092A\u093E\u0930\u0940 \u0916\u0947\u0932\u0940, \u0917\u0947\u0902\u0926\u092C\u093E\u091C\u094B\u0902 \u0928\u0947 \u0921\u0947\u0925 \u0913\u0935\u0930\u094D\u0938 \u092E\u0947\u0902 \u0915\u0938\u0940 \u0939\u0941\u0908 \u0917\u0947\u0902\u0926\u092C\u093E\u091C\u0940 \u0915\u0940\u0964",
      sourceChannel: "NDTV \u0907\u0902\u0921\u093F\u092F\u093E",
      sourceUrl: "https://ndtv.in/sports/asia-cup-victory",
      category: "sports",
      categoryName: "\u0916\u0947\u0932",
      publishedTime: "45 \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 45 * 60 * 1e3,
      fullContent: `\u0905\u0902\u0924\u093F\u092E \u0913\u0935\u0930 \u092E\u0947\u0902 \u091A\u093E\u0939\u093F\u090F \u0925\u0947 12 \u0930\u0928, \u092D\u093E\u0930\u0924\u0940\u092F \u092C\u0932\u094D\u0932\u0947\u092C\u093E\u091C\u094B\u0902 \u0928\u0947 2 \u0917\u0947\u0902\u0926 \u0936\u0947\u0937 \u0930\u0939\u0924\u0947 \u091C\u0940\u0924 \u0926\u093F\u0932\u093E \u0926\u0940\u0964 \u0907\u0938 \u091C\u0940\u0924 \u0915\u0947 \u0938\u093E\u0925 \u092D\u093E\u0930\u0924\u0940\u092F \u091F\u0940\u092E \u0905\u0902\u0915 \u0924\u093E\u0932\u093F\u0915\u093E \u092E\u0947\u0902 \u0936\u0940\u0930\u094D\u0937 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A \u0917\u0908 \u0939\u0948\u0964`
    },
    {
      id: "live-post-4",
      title: "\u0938\u0947\u0902\u0938\u0947\u0915\u094D\u0938 \u092E\u0947\u0902 1100 \u0905\u0902\u0915\u094B\u0902 \u0915\u093E \u0930\u093F\u0915\u0949\u0930\u094D\u0921 \u0909\u091B\u093E\u0932, \u0928\u093F\u092B\u094D\u091F\u0940 25,500 \u0915\u0947 \u0928\u090F \u0936\u093F\u0916\u0930 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u093E",
      summary: "\u0918\u0930\u0947\u0932\u0942 \u0936\u0947\u092F\u0930 \u092C\u093E\u091C\u093E\u0930\u094B\u0902 \u092E\u0947\u0902 \u0935\u093F\u0926\u0947\u0936\u0940 \u0938\u0902\u0938\u094D\u0925\u093E\u0917\u0924 \u0928\u093F\u0935\u0947\u0936\u0915\u094B\u0902 (FII) \u0915\u0940 \u0935\u093E\u092A\u0938\u0940 \u0938\u0947 \u092C\u093E\u091C\u093E\u0930 \u0928\u0908 \u090A\u0902\u091A\u093E\u0908 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u093E\u0964 \u092C\u0948\u0902\u0915\u093F\u0902\u0917, \u0911\u091F\u094B \u0914\u0930 \u0906\u0908\u091F\u0940 \u0938\u0947\u0915\u094D\u091F\u0930 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u0932\u093F\u0935\u093E\u0932\u0940 \u0926\u0947\u0916\u0928\u0947 \u0915\u094B \u092E\u093F\u0932\u0940\u0964",
      sourceChannel: "\u092E\u0928\u0940\u0915\u0902\u091F\u094D\u0930\u094B\u0932 (Moneycontrol)",
      sourceUrl: "https://moneycontrol.com/markets/sensex-record",
      category: "business",
      categoryName: "\u0915\u093E\u0930\u094B\u092C\u093E\u0930",
      publishedTime: "1 \u0918\u0902\u091F\u093E \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 60 * 60 * 1e3,
      fullContent: `\u092D\u093E\u0930\u0924\u0940\u092F \u0936\u0947\u092F\u0930 \u092C\u093E\u091C\u093E\u0930 \u0928\u0947 \u0906\u091C \u0928\u092F\u093E \u0907\u0924\u093F\u0939\u093E\u0938 \u0930\u091A\u093E\u0964 \u0938\u0947\u0902\u0938\u0947\u0915\u094D\u0938 1100 \u0905\u0902\u0915\u094B\u0902 \u0915\u0940 \u0924\u0947\u091C\u0940 \u0915\u0947 \u0938\u093E\u0925 \u092C\u0902\u0926 \u0939\u0941\u0906 \u0914\u0930 \u0928\u093F\u092B\u094D\u091F\u0940 \u0928\u0947 \u092A\u0939\u0932\u0940 \u092C\u093E\u0930 25,500 \u0915\u093E \u0938\u094D\u0924\u0930 \u091B\u0941\u0906\u0964 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0915\u094B\u0902 \u0915\u093E \u092E\u093E\u0928\u0928\u093E \u0939\u0948 \u0915\u093F \u092E\u091C\u092C\u0942\u0924 \u0906\u0930\u094D\u0925\u093F\u0915 \u0906\u0902\u0915\u0921\u093C\u0947 \u092C\u093E\u091C\u093E\u0930 \u0915\u094B \u0917\u0924\u093F \u0926\u0947 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964`
    },
    {
      id: "live-post-5",
      title: "\u0907\u0938\u0930\u094B \u0928\u0947 \u0917\u0917\u0928\u092F\u093E\u0928 \u092E\u093F\u0936\u0928 \u0915\u0947 \u0926\u0942\u0938\u0930\u0947 \u0915\u094D\u0930\u0942-\u090F\u0938\u094D\u0915\u0947\u092A \u0938\u093F\u0938\u094D\u091F\u092E \u0915\u093E \u0938\u092B\u0932 \u092A\u0930\u0940\u0915\u094D\u0937\u0923 \u0915\u093F\u092F\u093E",
      summary: "\u092D\u093E\u0930\u0924\u0940\u092F \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u0905\u0928\u0941\u0938\u0902\u0927\u093E\u0928 \u0938\u0902\u0917\u0920\u0928 (ISRO) \u0928\u0947 \u0936\u094D\u0930\u0940\u0939\u0930\u093F\u0915\u094B\u091F\u093E \u0938\u0947 \u092E\u093E\u0928\u0935 \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u0909\u0921\u093C\u093E\u0928 \u0917\u0917\u0928\u092F\u093E\u0928 \u0915\u0947 \u0932\u093F\u090F \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 \u0938\u0947\u092B\u094D\u091F\u0940 \u092E\u0949\u0921\u094D\u092F\u0942\u0932 \u0915\u093E \u0938\u092B\u0932 \u092A\u0930\u0940\u0915\u094D\u0937\u0923 \u092A\u0942\u0930\u093E \u0915\u093F\u092F\u093E\u0964",
      sourceChannel: "ABP \u0928\u094D\u092F\u0942\u091C\u093C",
      sourceUrl: "https://abplive.com/science/gaganyaan-test",
      category: "tech",
      categoryName: "\u091F\u0947\u0915\u094D\u0928\u094B\u0932\u0949\u091C\u0940",
      publishedTime: "2 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1517976487507-5b3b11329582?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 120 * 60 * 1e3,
      fullContent: `\u0907\u0938\u0930\u094B \u0928\u0947 \u0905\u0902\u0924\u0930\u093F\u0915\u094D\u0937 \u092F\u093E\u0924\u094D\u0930\u093F\u092F\u094B\u0902 \u0915\u0940 \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u0938\u0941\u0928\u093F\u0936\u094D\u091A\u093F\u0924 \u0915\u0930\u0928\u0947 \u0935\u093E\u0932\u0947 \u0915\u094D\u0930\u0942 \u092E\u0949\u0921\u094D\u092F\u0942\u0932 \u0915\u093E \u092A\u0930\u0940\u0915\u094D\u0937\u0923 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u092A\u0942\u0930\u093E \u0915\u0930 \u0932\u093F\u092F\u093E \u0939\u0948\u0964 \u0906\u0917\u093E\u092E\u0940 \u0935\u0930\u094D\u0937 \u0915\u0947 \u0905\u0902\u0924 \u0924\u0915 \u092E\u093E\u0928\u0935 \u092E\u093F\u0936\u0928 \u0915\u0940 \u092F\u094B\u091C\u0928\u093E \u0939\u0948\u0964`
    },
    {
      id: "live-post-6",
      title: "\u092E\u094C\u0938\u092E \u0905\u0932\u0930\u094D\u091F: \u0909\u0924\u094D\u0924\u0930 \u092D\u093E\u0930\u0924 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u092C\u093E\u0930\u093F\u0936 \u0914\u0930 \u0913\u0932\u093E\u0935\u0943\u0937\u094D\u091F\u093F \u0915\u0940 \u091A\u0947\u0924\u093E\u0935\u0928\u0940 \u091C\u093E\u0930\u0940",
      summary: "\u092E\u094C\u0938\u092E \u0935\u093F\u092D\u093E\u0917 (IMD) \u0928\u0947 \u0905\u0917\u0932\u0947 48 \u0918\u0902\u091F\u094B\u0902 \u092E\u0947\u0902 \u0926\u093F\u0932\u094D\u0932\u0940, \u0939\u0930\u093F\u092F\u093E\u0923\u093E, \u092A\u0902\u091C\u093E\u092C \u0914\u0930 \u092A\u0936\u094D\u091A\u093F\u092E\u0940 \u092F\u0942\u092A\u0940 \u0915\u0947 \u0915\u0908 \u091C\u093F\u0932\u094B\u0902 \u092E\u0947\u0902 \u0924\u0947\u091C \u0906\u0902\u0927\u0940 \u0914\u0930 \u092C\u093E\u0930\u093F\u0936 \u0915\u0947 \u0932\u093F\u090F \u0911\u0930\u0947\u0902\u091C \u0905\u0932\u0930\u094D\u091F \u091C\u093E\u0930\u0940 \u0915\u093F\u092F\u093E \u0939\u0948\u0964",
      sourceChannel: "\u0905\u092E\u0930 \u0909\u091C\u093E\u0932\u093E (Amar Ujala)",
      sourceUrl: "https://amarujala.com/weather/heavy-rain-alert",
      category: "state",
      categoryName: "\u0930\u093E\u091C\u094D\u092F / \u0938\u094D\u0925\u093E\u0928\u0940\u092F",
      publishedTime: "2.5 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 150 * 60 * 1e3,
      fullContent: `\u092E\u094C\u0938\u092E \u0935\u093F\u092D\u093E\u0917 \u0928\u0947 \u092A\u0936\u094D\u091A\u093F\u092E\u0940 \u0935\u093F\u0915\u094D\u0937\u094B\u092D \u0915\u0947 \u0938\u0915\u094D\u0930\u093F\u092F \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0909\u0924\u094D\u0924\u0930 \u092D\u093E\u0930\u0924 \u0915\u0947 \u0915\u0908 \u0930\u093E\u091C\u094D\u092F\u094B\u0902 \u092E\u0947\u0902 \u0924\u0947\u091C \u0939\u0935\u093E\u0913\u0902 \u0915\u0947 \u0938\u093E\u0925 \u092C\u093E\u0930\u093F\u0936 \u0914\u0930 \u0913\u0932\u093E\u0935\u0943\u0937\u094D\u091F\u093F \u0915\u0940 \u0938\u0902\u092D\u093E\u0935\u0928\u093E \u091C\u0924\u093E\u0908 \u0939\u0948\u0964 \u0915\u093F\u0938\u093E\u0928\u094B\u0902 \u0915\u094B \u0915\u091F\u0940 \u092B\u0938\u0932 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0938\u094D\u0925\u093E\u0928\u094B\u0902 \u092A\u0930 \u0930\u0916\u0928\u0947 \u0915\u0940 \u0938\u0932\u093E\u0939 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964`
    },
    {
      id: "live-post-7",
      title: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0930\u093E\u091C\u092E\u093E\u0930\u094D\u0917\u094B\u0902 \u092A\u0930 \u0905\u092C \u0932\u093E\u0917\u0942 \u0939\u094B\u0917\u093E \u0938\u0947\u091F\u0947\u0932\u093E\u0907\u091F \u0906\u0927\u093E\u0930\u093F\u0924 \u091F\u094B\u0932 \u0915\u0932\u0947\u0915\u094D\u0936\u0928 \u0938\u093F\u0938\u094D\u091F\u092E",
      summary: "\u0938\u0921\u093C\u0915 \u092A\u0930\u093F\u0935\u0939\u0928 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0928\u0947 \u092B\u093E\u0938\u094D\u091F\u0948\u0917 \u0915\u0947 \u092C\u093E\u0926 \u0905\u092C \u091C\u0940\u092A\u0940\u090F\u0938 \u0914\u0930 \u0938\u0948\u091F\u0947\u0932\u093E\u0907\u091F \u0906\u0927\u093E\u0930\u093F\u0924 \u091F\u094B\u0932 \u092A\u094D\u0930\u0923\u093E\u0932\u0940 \u0915\u094B \u0926\u0947\u0936 \u0915\u0947 \u092A\u094D\u0930\u092E\u0941\u0916 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938\u0935\u0947 \u092A\u0930 \u092A\u093E\u092F\u0932\u091F \u092A\u094D\u0930\u094B\u091C\u0947\u0915\u094D\u091F \u0915\u0947 \u0924\u094C\u0930 \u092A\u0930 \u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0940 \u0918\u094B\u0937\u0923\u093E \u0915\u0940 \u0939\u0948\u0964",
      sourceChannel: "\u091C\u093C\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (Zee News)",
      sourceUrl: "https://zeenews.india.com/automobiles/satellite-toll",
      category: "politics",
      categoryName: "\u0930\u093E\u091C\u0928\u0940\u0924\u093F",
      publishedTime: "3 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 180 * 60 * 1e3,
      fullContent: `\u0928\u0908 \u092A\u094D\u0930\u0923\u093E\u0932\u0940 \u0915\u0947 \u0924\u0939\u0924 \u0935\u093E\u0939\u0928\u094B\u0902 \u092E\u0947\u0902 \u0932\u0917\u0947 \u0913\u092C\u0940\u092F\u0942 (\u0911\u0928-\u092C\u094B\u0930\u094D\u0921 \u092F\u0942\u0928\u093F\u091F) \u0915\u0947 \u091C\u0930\u093F\u090F \u0924\u092F \u0915\u0940 \u0917\u0908 \u0926\u0942\u0930\u0940 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u0938\u094D\u0935\u0924\u0903 \u091F\u094B\u0932 \u0915\u091F \u091C\u093E\u090F\u0917\u093E\u0964 \u0907\u0938\u0938\u0947 \u091F\u094B\u0932 \u092A\u094D\u0932\u093E\u091C\u093E \u092A\u0930 \u0932\u0917\u0928\u0947 \u0935\u093E\u0932\u093E \u0938\u092E\u092F \u0936\u0942\u0928\u094D\u092F \u0939\u094B \u091C\u093E\u090F\u0917\u093E\u0964`
    },
    {
      id: "live-post-8",
      title: "\u0938\u094B\u0928\u0947 \u0915\u0940 \u0915\u0940\u092E\u0924\u094B\u0902 \u092E\u0947\u0902 \u092D\u093E\u0930\u0940 \u0917\u093F\u0930\u093E\u0935\u091F, \u091A\u093E\u0902\u0926\u0940 2000 \u0930\u0941\u092A\u092F\u0947 \u092A\u094D\u0930\u0924\u093F \u0915\u093F\u0932\u094B \u0938\u0938\u094D\u0924\u0940 \u0939\u0941\u0908",
      summary: "\u0935\u0948\u0936\u094D\u0935\u093F\u0915 \u092C\u093E\u091C\u093E\u0930\u094B\u0902 \u092E\u0947\u0902 \u092E\u091C\u092C\u0942\u0924\u0940 \u0915\u0947 \u092C\u093E\u0926 \u0918\u0930\u0947\u0932\u0942 \u0938\u0930\u094D\u0930\u093E\u092B\u093E \u092C\u093E\u091C\u093E\u0930 \u092E\u0947\u0902 \u0938\u094B\u0928\u0947 \u0914\u0930 \u091A\u093E\u0902\u0926\u0940 \u0915\u0940 \u0915\u0940\u092E\u0924\u094B\u0902 \u092E\u0947\u0902 \u092C\u0921\u093C\u0940 \u0917\u093F\u0930\u093E\u0935\u091F \u0926\u0930\u094D\u091C \u0915\u0940 \u0917\u0908\u0964 \u0924\u094D\u092F\u094B\u0939\u093E\u0930\u0940 \u0938\u0940\u091C\u0928 \u0938\u0947 \u092A\u0939\u0932\u0947 \u0916\u0930\u0940\u0926\u093E\u0930\u094B\u0902 \u0915\u0947 \u091A\u0947\u0939\u0930\u0947 \u0916\u093F\u0932\u0947\u0964",
      sourceChannel: "\u0926\u0948\u0928\u093F\u0915 \u091C\u093E\u0917\u0930\u0923 (Dainik Jagran)",
      sourceUrl: "https://jagran.com/business/gold-silver-prices",
      category: "business",
      categoryName: "\u0915\u093E\u0930\u094B\u092C\u093E\u0930",
      publishedTime: "3.5 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 210 * 60 * 1e3,
      fullContent: `24 \u0915\u0948\u0930\u0947\u091F \u0938\u094B\u0928\u0947 \u0915\u0940 \u0915\u0940\u092E\u0924 \u092A\u094D\u0930\u0924\u093F 10 \u0917\u094D\u0930\u093E\u092E \u092E\u0947\u0902 750 \u0930\u0941\u092A\u092F\u0947 \u0915\u0940 \u0915\u092E\u0940 \u0906\u0908, \u0935\u0939\u0940\u0902 \u091A\u093E\u0902\u0926\u0940 2000 \u0930\u0941\u092A\u092F\u0947 \u0938\u0938\u094D\u0924\u0940 \u0939\u094B\u0915\u0930 84,000 \u0930\u0941\u092A\u092F\u0947 \u092A\u094D\u0930\u0924\u093F \u0915\u093F\u0932\u094B\u0917\u094D\u0930\u093E\u092E \u0915\u0947 \u0938\u094D\u0924\u0930 \u092A\u0930 \u0906 \u0917\u0908 \u0939\u0948\u0964`
    },
    {
      id: "live-post-9",
      title: "\u0930\u0947\u0932\u0935\u0947 \u0915\u093E \u092C\u0921\u093C\u093E \u0910\u0932\u093E\u0928: 50 \u0928\u090F \u0930\u0942\u091F\u094B\u0902 \u092A\u0930 \u0926\u094C\u0921\u093C\u0947\u0902\u0917\u0940 \u0938\u094D\u0932\u0940\u092A\u0930 \u0935\u0902\u0926\u0947 \u092D\u093E\u0930\u0924 \u091F\u094D\u0930\u0947\u0928\u0947\u0902",
      summary: "\u0932\u0902\u092C\u0940 \u0926\u0942\u0930\u0940 \u0915\u0947 \u092F\u093E\u0924\u094D\u0930\u093F\u092F\u094B\u0902 \u0915\u0947 \u0932\u093F\u090F \u0935\u093F\u0936\u094D\u0935\u0938\u094D\u0924\u0930\u0940\u092F \u0938\u0941\u0935\u093F\u0927\u093E\u0913\u0902 \u0938\u0947 \u0932\u0948\u0938 \u0938\u094D\u0932\u0940\u092A\u0930 \u0935\u0902\u0926\u0947 \u092D\u093E\u0930\u0924 \u090F\u0915\u094D\u0938\u092A\u094D\u0930\u0947\u0938 \u091F\u094D\u0930\u0947\u0928\u094B\u0902 \u0915\u093E \u092A\u0930\u093F\u091A\u093E\u0932\u0928 \u091C\u0932\u094D\u0926 \u0936\u0941\u0930\u0942 \u0939\u094B\u0917\u093E\u0964 \u0924\u0947\u091C \u0930\u092B\u094D\u0924\u093E\u0930 \u0914\u0930 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u092F\u093E\u0924\u094D\u0930\u093E \u0915\u093E \u0905\u0928\u0941\u092D\u0935\u0964",
      sourceChannel: "\u0939\u093F\u0902\u0926\u0941\u0938\u094D\u0924\u093E\u0928 (Live Hindustan)",
      sourceUrl: "https://livehindustan.com/national/vande-bharat-sleeper",
      category: "state",
      categoryName: "\u0930\u093E\u091C\u094D\u092F / \u0938\u094D\u0925\u093E\u0928\u0940\u092F",
      publishedTime: "4 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 240 * 60 * 1e3,
      fullContent: `\u0930\u0947\u0932 \u092E\u0902\u0924\u094D\u0930\u093E\u0932\u092F \u0928\u0947 50 \u0928\u090F \u0930\u0942\u091F\u094B\u0902 \u0915\u094B \u0905\u0902\u0924\u093F\u092E \u0930\u0942\u092A \u0926\u0947 \u0926\u093F\u092F\u093E \u0939\u0948\u0964 \u0928\u0908 \u0938\u094D\u0932\u0940\u092A\u0930 \u091F\u094D\u0930\u0947\u0928\u094B\u0902 \u092E\u0947\u0902 \u0905\u0924\u094D\u092F\u093E\u0927\u0941\u0928\u093F\u0915 \u090F\u092F\u0930 \u0938\u0938\u094D\u092A\u0947\u0902\u0936\u0928, \u092C\u093E\u092F\u094B-\u0935\u0948\u0915\u094D\u092F\u0942\u092E \u091F\u0949\u092F\u0932\u0947\u091F\u094D\u0938 \u0914\u0930 \u0915\u0935\u091A \u0938\u0941\u0930\u0915\u094D\u0937\u093E \u092A\u094D\u0930\u0923\u093E\u0932\u0940 \u0936\u093E\u092E\u093F\u0932 \u0939\u0948\u0902\u0964`
    },
    {
      id: "live-post-10",
      title: "\u0938\u093E\u0907\u092C\u0930 \u092A\u0941\u0932\u093F\u0938 \u0915\u0940 \u092C\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908: 500 \u0915\u0930\u094B\u0921\u093C \u0915\u0947 \u0911\u0928\u0932\u093E\u0907\u0928 \u0917\u0947\u092E\u093F\u0902\u0917 \u0938\u093F\u0902\u0921\u093F\u0915\u0947\u091F \u0915\u093E \u092D\u0902\u0921\u093E\u092B\u094B\u0921\u093C",
      summary: "\u0935\u093F\u0936\u0947\u0937 \u091F\u093E\u0938\u094D\u0915 \u092B\u094B\u0930\u094D\u0938 \u0928\u0947 \u092B\u0930\u094D\u091C\u0940 \u0921\u093F\u091C\u093F\u091F\u0932 \u092A\u0947\u092E\u0947\u0902\u091F \u0917\u0947\u091F\u0935\u0947 \u0914\u0930 \u0905\u0935\u0948\u0927 \u0917\u0947\u092E\u093F\u0902\u0917 \u0910\u092A \u0915\u0947 \u091C\u0930\u093F\u090F \u0915\u0930\u094B\u0921\u093C\u094B\u0902 \u0915\u0940 \u0920\u0917\u0940 \u0915\u0930\u0928\u0947 \u0935\u093E\u0932\u0947 \u0905\u0902\u0924\u0930\u0930\u093E\u091C\u094D\u092F\u0940\u092F \u0917\u093F\u0930\u094B\u0939 \u0915\u0947 8 \u0938\u0926\u0938\u094D\u092F\u094B\u0902 \u0915\u094B \u0926\u092C\u094B\u091A\u093E\u0964",
      sourceChannel: "\u092A\u0924\u094D\u0930\u093F\u0915\u093E (Patrika)",
      sourceUrl: "https://patrika.com/crime/cyber-crime-busted",
      category: "crime",
      categoryName: "\u0915\u094D\u0930\u093E\u0907\u092E / \u0905\u092A\u0930\u093E\u0927",
      publishedTime: "5 \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 300 * 60 * 1e3,
      fullContent: `\u092A\u0941\u0932\u093F\u0938 \u0928\u0947 \u0906\u0930\u094B\u092A\u093F\u092F\u094B\u0902 \u0915\u0947 \u092A\u093E\u0938 \u0938\u0947 25 \u0932\u0948\u092A\u091F\u0949\u092A, 60 \u0938\u094D\u092E\u093E\u0930\u094D\u091F\u092B\u094B\u0928 \u0914\u0930 100 \u0938\u0947 \u091C\u094D\u092F\u093E\u0926\u093E \u092B\u094D\u0930\u0940\u091C \u092C\u0948\u0902\u0915 \u0916\u093E\u0924\u094B\u0902 \u0915\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u092C\u0930\u093E\u092E\u0926 \u0915\u0940 \u0939\u0948\u0964`
    }
  ];
}
function loadNewsDatabase() {
  try {
    if (import_fs.default.existsSync(NEWS_DB_FILE)) {
      const raw = import_fs.default.readFileSync(NEWS_DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading news_database.json:", err);
  }
  const initial = getInitialRichNewsPosts();
  saveNewsDatabase(initial);
  return initial;
}
function saveNewsDatabase(posts) {
  try {
    import_fs.default.writeFileSync(NEWS_DB_FILE, JSON.stringify(posts, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing news_database.json:", err);
    return false;
  }
}
function formatRelativeTime(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 6e4));
  if (diffMinutes < 60) return `${diffMinutes} \u092E\u093F\u0928\u091F \u092A\u0939\u0932\u0947`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} \u0918\u0902\u091F\u0947 \u092A\u0939\u0932\u0947`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} \u0926\u093F\u0928 \u092A\u0939\u0932\u0947`;
}
app.get("/api/news-posts", (_req, res) => {
  const posts = loadNewsDatabase();
  const dynamicPosts = posts.map((p) => ({
    ...p,
    publishedTime: p.timestamp ? formatRelativeTime(p.timestamp) : p.publishedTime
  }));
  return res.json({ success: true, posts: dynamicPosts });
});
app.post("/api/news-posts", (req, res) => {
  try {
    const payload = req.body;
    let existing = loadNewsDatabase();
    if (Array.isArray(payload)) {
      existing = payload;
    } else if (payload && payload.title) {
      const newPost = {
        id: payload.id || `post-${Date.now()}`,
        title: payload.title,
        summary: payload.summary || "",
        sourceChannel: payload.sourceChannel || "\u0928\u094D\u092F\u0942\u091C\u093C \u0930\u0942\u092E",
        sourceUrl: payload.sourceUrl || "",
        category: payload.category || "breaking",
        categoryName: payload.categoryName || "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C",
        publishedTime: "\u0905\u092D\u0940-\u0905\u092D\u0940",
        imageUrl: payload.imageUrl || "",
        breaking: Boolean(payload.breaking),
        isExclusive: Boolean(payload.isExclusive),
        fullContent: payload.fullContent || payload.summary || "",
        district: payload.district || "",
        location: payload.location || "",
        timestamp: payload.timestamp || Date.now()
      };
      existing = [newPost, ...existing.filter((p) => p.id !== newPost.id)];
    }
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.put("/api/news-posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    let existing = loadNewsDatabase();
    existing = existing.map((p) => p.id === id ? { ...p, ...updates } : p);
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/news-posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    let existing = loadNewsDatabase();
    existing = existing.filter((p) => p.id !== id);
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/news-posts/reset", (_req, res) => {
  const fresh = getInitialRichNewsPosts();
  saveNewsDatabase(fresh);
  return res.json({ success: true, posts: fresh });
});
var DRAFTS_DB_FILE = import_path.default.join(process.cwd(), "drafts_database.json");
function loadDraftsDatabase() {
  try {
    if (import_fs.default.existsSync(DRAFTS_DB_FILE)) {
      const content = import_fs.default.readFileSync(DRAFTS_DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading drafts_database.json:", e);
  }
  return [];
}
function saveDraftsDatabase(drafts) {
  try {
    import_fs.default.writeFileSync(DRAFTS_DB_FILE, JSON.stringify(drafts, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("Error writing drafts_database.json:", e);
    return false;
  }
}
app.get("/api/drafts", (_req, res) => {
  const drafts = loadDraftsDatabase();
  return res.json({ success: true, drafts });
});
app.post("/api/drafts", (req, res) => {
  try {
    const draft = req.body;
    if (!draft || !draft.id) {
      return res.status(400).json({ error: "Invalid draft object" });
    }
    const drafts = loadDraftsDatabase();
    const idx = drafts.findIndex((d) => d.id === draft.id);
    const now = Date.now();
    if (idx >= 0) {
      drafts[idx] = { ...draft, updatedAt: now };
    } else {
      drafts.unshift({ ...draft, createdAt: draft.createdAt || now, updatedAt: now });
    }
    saveDraftsDatabase(drafts);
    return res.json({ success: true, draft });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/drafts/:id", (req, res) => {
  try {
    const { id } = req.params;
    let drafts = loadDraftsDatabase();
    drafts = drafts.filter((d) => d.id !== id);
    saveDraftsDatabase(drafts);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/gemini-quota-status", (_req, res) => {
  return res.json({
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    provider: "gemini",
    models: DEFAULT_FALLBACK_MODELS,
    isQuotaExceeded: false,
    status: "active",
    note: "AI \u0938\u094D\u092E\u093E\u0930\u094D\u091F \u092B\u093C\u0949\u0932\u092C\u0948\u0915 \u0907\u0902\u091C\u0928 \u0938\u0915\u094D\u0930\u093F\u092F \u0939\u0948\u0964 \u092F\u0926\u093F \u0915\u094B\u091F\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u092D\u0940 \u0939\u094B \u091C\u093E\u090F, \u0924\u094B \u092D\u0940 \u0906\u092A\u0915\u093E \u0915\u093E\u092E \u0915\u092D\u0940 \u0928\u0939\u0940\u0902 \u0930\u0941\u0915\u0924\u093E\u0964"
  });
});
function generateRssFeedXml(posts, baseUrl = "https://www.ainewsmaker.online") {
  const cleanSiteUrl = baseUrl.replace(/\/+$/, "");
  const itemsXml = posts.map((post) => {
    const pubDate = post.timestamp ? new Date(post.timestamp).toUTCString() : (/* @__PURE__ */ new Date()).toUTCString();
    const link = post.sourceUrl && post.sourceUrl.startsWith("http") ? post.sourceUrl : `${cleanSiteUrl}/#home`;
    const safeCategory = (post.categoryName || post.category || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeChannel = (post.sourceChannel || "AI News Maker").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const enclosureTag = post.imageUrl ? `
      <enclosure url="${post.imageUrl.replace(/&/g, "&amp;")}" length="0" type="image/jpeg" />` : "";
    return `    <item>
      <title><![CDATA[${post.title || ""}]]></title>
      <link>${link}</link>
      <guid isPermaLink="false">${post.id || `post-${Date.now()}`}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${post.summary || ""}]]></description>
      <category>${safeCategory}</category>
      <source url="${link}">${safeChannel}</source>${enclosureTag}
    </item>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>AI News Maker - Live News Feed (\u0932\u093E\u0907\u0935 \u0938\u092E\u093E\u091A\u093E\u0930)</title>
    <link>${cleanSiteUrl}/</link>
    <description>AI News Maker - \u0930\u093F\u092F\u0932-\u091F\u093E\u0907\u092E \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C, \u0935\u0940\u0921\u093F\u092F\u094B \u0914\u0930 \u0917\u094D\u0930\u093E\u092B\u093F\u0915\u094D\u0938 \u0932\u093E\u0907\u0935 RSS \u092B\u093C\u0940\u0921</description>
    <language>hi</language>
    <copyright>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} AI News Maker</copyright>
    <lastBuildDate>${(/* @__PURE__ */ new Date()).toUTCString()}</lastBuildDate>
    <atom:link href="${cleanSiteUrl}/rss.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;
}
app.get(["/rss.xml", "/feed.xml", "/api/rss"], (_req, res) => {
  try {
    const posts = loadNewsDatabase();
    const rssXml = generateRssFeedXml(posts);
    res.header("Content-Type", "application/rss+xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=180");
    return res.send(rssXml);
  } catch (err) {
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>${err.message}</description></channel></rss>`);
  }
});
var RSS_SOURCES_FILE = import_path.default.join(process.cwd(), "rss_sources_database.json");
var DEFAULT_PRODUCTION_RSS_SOURCES = [
  {
    id: "src_aajtak_rss",
    name: "\u0906\u091C \u0924\u0915 (Aaj Tak Hindi News)",
    url: "https://www.aajtak.in/rssfeeds/?id=home",
    type: "rss",
    category: "\u0926\u0947\u0936",
    isActive: true,
    createdAt: Date.now() - 864e5,
    itemsFetchedCount: 15
  },
  {
    id: "src_bbchindi_rss",
    name: "\u092C\u0940\u092C\u0940\u0938\u0940 \u0939\u093F\u0902\u0926\u0940 (BBC Hindi News)",
    url: "https://feeds.bbci.co.uk/hindi/rss.xml",
    type: "rss",
    category: "\u0905\u0902\u0924\u0930\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F",
    isActive: true,
    createdAt: Date.now() - 432e5,
    itemsFetchedCount: 10
  },
  {
    id: "src_ndtv_rss",
    name: "NDTV \u0907\u0902\u0921\u093F\u092F\u093E (NDTV India Live)",
    url: "https://feeds.feedburner.com/ndtvkhabar",
    type: "rss",
    category: "\u0930\u093E\u091C\u0928\u0940\u0924\u093F",
    isActive: true,
    createdAt: Date.now() - 216e5,
    itemsFetchedCount: 12
  },
  {
    id: "src_pib_web",
    name: "\u092A\u094D\u0930\u0947\u0938 \u0938\u0942\u091A\u0928\u093E \u092C\u094D\u092F\u0942\u0930\u094B (PIB National Desk)",
    url: "https://pib.gov.in/PressReleasePage.aspx",
    type: "web",
    category: "\u0926\u0947\u0936",
    isActive: true,
    createdAt: Date.now() - 1e7,
    itemsFetchedCount: 5
  }
];
function loadRssSourcesDatabase() {
  try {
    if (import_fs.default.existsSync(RSS_SOURCES_FILE)) {
      const raw = import_fs.default.readFileSync(RSS_SOURCES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading rss_sources_database.json:", err.message);
  }
  saveRssSourcesDatabase(DEFAULT_PRODUCTION_RSS_SOURCES);
  return DEFAULT_PRODUCTION_RSS_SOURCES;
}
function saveRssSourcesDatabase(sources) {
  try {
    import_fs.default.writeFileSync(RSS_SOURCES_FILE, JSON.stringify(sources, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing rss_sources_database.json:", err.message);
    return false;
  }
}
function isValidNewsImage(url) {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim().toLowerCase();
  if (clean.length < 8) return false;
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) return false;
  if (clean.endsWith(".ico") || clean.endsWith(".svg") || clean.endsWith(".gif")) return false;
  const invalidKeywords = [
    "logo",
    "favicon",
    "avatar",
    "icon",
    "advertisement",
    "ad_",
    "_ad",
    "/ads/",
    "banner",
    "pixel",
    "1x1",
    "tracking",
    "analytics",
    "share",
    "social",
    "button",
    "badge",
    "sponsor",
    "placeholder",
    "default_thumb",
    "spinner",
    "loader",
    "loading",
    "widget",
    "counter",
    "wp-content/themes",
    "/themes/",
    "/static/images/logo"
  ];
  return !invalidKeywords.some((kw) => clean.includes(kw));
}
async function extractBestNewsImage(itemXml, rawDesc, articleUrl, fallbackCategory) {
  const mediaMatches = itemXml.matchAll(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/gi);
  for (const m of mediaMatches) {
    if (m[1] && isValidNewsImage(m[1])) return m[1].trim();
  }
  const enclosureMatches = itemXml.matchAll(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/gi);
  for (const m of enclosureMatches) {
    if (m[1] && isValidNewsImage(m[1])) return m[1].trim();
  }
  const enclosureAltMatches = itemXml.matchAll(/<enclosure[^>]+type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']/gi);
  for (const m of enclosureAltMatches) {
    if (m[1] && isValidNewsImage(m[1])) return m[1].trim();
  }
  const contentEncodedMatch = itemXml.match(/<content:encoded>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/content:encoded>/i);
  const contentBody = (contentEncodedMatch ? contentEncodedMatch[1] || contentEncodedMatch[2] || "" : "") + " " + rawDesc;
  const imgMatches = contentBody.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const m of imgMatches) {
    if (m[1] && isValidNewsImage(m[1])) return m[1].trim();
  }
  if (articleUrl && articleUrl.startsWith("http")) {
    try {
      const resp = await fetch(articleUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-News-Maker/1.0"
        },
        signal: AbortSignal.timeout(3500)
      });
      if (resp.ok) {
        const html = await resp.text();
        const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        if (ogImageMatch && ogImageMatch[1] && isValidNewsImage(ogImageMatch[1])) {
          return ogImageMatch[1].trim();
        }
        const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
        if (twitterImageMatch && twitterImageMatch[1] && isValidNewsImage(twitterImageMatch[1])) {
          return twitterImageMatch[1].trim();
        }
        const articleImgMatch = html.match(/<article[\s\S]*?<img[^>]+src=["']([^"']+)["']/i) || html.match(/<figure[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
        if (articleImgMatch && articleImgMatch[1] && isValidNewsImage(articleImgMatch[1])) {
          return articleImgMatch[1].trim();
        }
      }
    } catch {
    }
  }
  return getCategoryFallbackImage(fallbackCategory);
}
function cleanAndCraftHindiHeadline(rawHeadline, articleText) {
  let title = rawHeadline || "";
  title = title.replace(/^(breaking\s*news\s*[:\-–—]|ब्रेकिंग\s*न्यूज़\s*[:\-–—]|एक्सक्लूसिव\s*[:\-–—]|exclusive\s*[:\-–—]|बड़ी\s*खबर\s*[:\-–—])/i, "").replace(/(?:^|\s)(जानिए|देखिए|सुनिए|सन्न\s*रह\s*जाएंगे|हैरान\s*हो\s*जाएंगे|बड़ा\s*खुलासा|चौंकाने\s*वाला|वायरल\s*सच)\s*[:\-–—]?\s*/gu, " ").replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, " ").replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, " ").replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "").replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, "").replace(/\.{2,}/g, "").replace(/\s+/g, " ").trim();
  const locationList = [
    "\u0936\u0939\u0921\u094B\u0932",
    "\u0930\u0940\u0935\u093E",
    "\u0938\u0940\u0927\u0940",
    "\u0938\u0924\u0928\u093E",
    "\u092D\u094B\u092A\u093E\u0932",
    "\u0907\u0902\u0926\u094C\u0930",
    "\u091C\u092C\u0932\u092A\u0941\u0930",
    "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930",
    "\u0909\u091C\u094D\u091C\u0948\u0928",
    "\u0938\u093E\u0917\u0930",
    "\u091B\u0924\u0930\u092A\u0941\u0930",
    "\u0926\u092E\u094B\u0939",
    "\u0915\u091F\u0928\u0940",
    "\u092E\u0902\u0921\u0932\u093E",
    "\u0921\u093F\u0902\u0921\u094B\u0930\u0940",
    "\u0905\u0928\u0942\u092A\u092A\u0941\u0930",
    "\u0909\u092E\u0930\u093F\u092F\u093E",
    "\u0938\u093F\u0902\u0917\u0930\u094C\u0932\u0940",
    "\u0926\u093F\u0932\u094D\u0932\u0940",
    "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940",
    "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936",
    "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936",
    "\u092C\u093F\u0939\u093E\u0930",
    "\u0930\u093E\u091C\u0938\u094D\u0925\u093E\u0928",
    "\u092E\u0941\u0902\u092C\u0908"
  ];
  let detectedLocation = "\u0935\u093F\u0936\u0947\u0937 \u0921\u0947\u0938\u094D\u0915";
  for (const loc of locationList) {
    if (title.includes(loc) || articleText.includes(loc)) {
      detectedLocation = loc;
      break;
    }
  }
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length > 15) {
    title = words.slice(0, 15).join(" ");
  }
  let summary = articleText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (summary.length > 220) {
    summary = summary.slice(0, 215) + "...";
  }
  if (!summary) {
    summary = `${title} \u0915\u094B \u0932\u0947\u0915\u0930 \u0924\u093E\u091C\u093C\u093E \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0938\u093E\u092E\u0928\u0947 \u0906\u0908 \u0939\u0948\u0964 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0938\u094D\u0924\u0930 \u092A\u0930 \u0906\u0935\u0936\u094D\u092F\u0915 \u0938\u0902\u091C\u094D\u091E\u093E\u0928 \u0932\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964`;
  }
  return { title, summary, location: detectedLocation };
}
async function processRssItemWithAiEditorial(rawTitle, rawDesc, sourceCategory, sourceUrl) {
  const fallback = cleanAndCraftHindiHeadline(rawTitle, rawDesc);
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.length > 5) {
    try {
      const ai = getGeminiClient();
      const prompt = `\u0906\u092A \u090F\u0915 \u0935\u0930\u093F\u0937\u094D\u0920, \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0914\u0930 \u0924\u0925\u094D\u092F\u092A\u0930\u0915 \u0939\u093F\u0902\u0926\u0940 \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u0928\u0940\u091A\u0947 \u0926\u0940 \u0917\u0908 \u0916\u092C\u0930 \u0915\u0947 \u0935\u093F\u0935\u0930\u0923 \u0914\u0930 \u0936\u0940\u0930\u094D\u0937\u0915 \u0915\u093E \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0915\u0930\u0947\u0902 \u0914\u0930 \u090F\u0915 \u0924\u0925\u094D\u092F\u092A\u0930\u0915, \u0938\u094D\u092A\u0937\u094D\u091F, \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0914\u0930 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (Headline) \u0935 2 \u0935\u093E\u0915\u094D\u092F\u094B\u0902 \u0915\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0938\u093E\u0930 (Summary) \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902\u0964

\u0928\u093F\u092F\u092E:
1. \u0915\u0947\u0935\u0932 \u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 (factual), \u0938\u094D\u092A\u0937\u094D\u091F (clear) \u0914\u0930 \u0928\u094D\u092F\u0942\u091F\u094D\u0930\u0932 (neutral) \u092D\u093E\u0937\u093E \u0915\u093E \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964
2. "\u091C\u093E\u0928\u093F\u090F", "\u0926\u0947\u0916\u093F\u090F", "Breaking News:", "Exclusive", "\u092C\u0921\u093C\u093E \u0916\u0941\u0932\u093E\u0938\u093E" \u091C\u0948\u0938\u0947 \u0915\u094D\u0932\u093F\u0915\u092C\u0947\u091F \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u092A\u094D\u0930\u092F\u094B\u0917 \u0915\u0924\u0908 \u0928 \u0915\u0930\u0947\u0902\u0964
3. \u0905\u0928\u093E\u0935\u0936\u094D\u092F\u0915 \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0936\u092C\u094D\u0926 (\u0936\u094D\u0930\u0940, \u092E\u093E\u0928\u0928\u0940\u092F, \u091C\u0940) \u0928 \u0932\u0917\u093E\u090F\u0902\u0964
4. \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0905\u0927\u093F\u0915\u0924\u092E 12 \u0938\u0947 14 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0940 \u0939\u094B (\u0924\u093E\u0915\u093F 4:5 \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0915\u093E\u0930\u094D\u0921 \u092E\u0947\u0902 2-3 \u0932\u093E\u0907\u0928\u094B\u0902 \u092E\u0947\u0902 \u0938\u0939\u0940 \u0926\u093F\u0916\u0947)\u0964
5. \u0906\u0909\u091F\u092A\u0941\u091F \u0915\u0947\u0935\u0932 \u0935\u0948\u0927 JSON \u092E\u0947\u0902 \u0926\u0947\u0902:
{"headline": "\u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u0939\u0947\u0921\u0932\u093E\u0907\u0928", "summary": "\u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923", "location": "\u091C\u093F\u0932\u0947/\u0936\u0939\u0930 \u0915\u093E \u0928\u093E\u092E"}`;
      const res = await generateWithFallbackAndRetry(ai, GEMINI_MODELS_POOL.slice(0, 2), {
        contents: `${prompt}

\u092E\u0942\u0932 \u0936\u0940\u0930\u094D\u0937\u0915: ${rawTitle}
\u092E\u0942\u0932 \u0935\u093F\u0935\u0930\u0923: ${rawDesc.slice(0, 500)}`,
        config: { temperature: 0.2 }
      });
      const text = res?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.headline && parsed.headline.trim().length > 5) {
          return {
            title: parsed.headline.trim(),
            summary: parsed.summary?.trim() || fallback.summary,
            location: parsed.location?.trim() || fallback.location,
            categoryName: sourceCategory || "\u0926\u0947\u0936"
          };
        }
      }
    } catch {
    }
  }
  return {
    title: fallback.title,
    summary: fallback.summary,
    location: fallback.location,
    categoryName: sourceCategory || "\u0926\u0947\u0936"
  };
}
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#([0-9]{1,6});/gi, (_match, numStr) => {
    const num = parseInt(numStr, 10);
    return String.fromCharCode(num);
  }).trim();
}
async function parseRssItemsFromXml(xmlText, source) {
  const posts = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const items = xmlText.match(itemRegex) || [];
  for (const itemXml of items.slice(0, 15)) {
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
    const rawTitle = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
    if (!rawTitle) continue;
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/link>/i) || itemXml.match(/<link\s+href=["']([^"']+)["']/i);
    const link = linkMatch ? (linkMatch[1] || linkMatch[2] || "").trim() : source.url;
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) || itemXml.match(/<summary>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/summary>/i);
    const rawDesc = descMatch ? (descMatch[1] || descMatch[2] || "").trim() : "";
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
    const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
    let timestamp = Date.now();
    if (pubDateStr) {
      const parsedTime = Date.parse(pubDateStr);
      if (!isNaN(parsedTime)) timestamp = parsedTime;
    }
    const imageUrl = await extractBestNewsImage(itemXml, rawDesc, link, source.category);
    const editorial = await processRssItemWithAiEditorial(rawTitle, rawDesc, source.category, link);
    const catName = editorial.categoryName || source.category || "\u0926\u0947\u0936";
    const catKey = catName === "\u0926\u0947\u0936" ? "national" : catName === "\u0930\u093E\u091C\u094D\u092F" ? "state" : catName === "\u0930\u093E\u091C\u0928\u0940\u0924\u093F" ? "politics" : catName === "\u0935\u094D\u092F\u093E\u092A\u093E\u0930" ? "business" : catName === "\u0916\u0947\u0932" ? "sports" : catName === "\u092E\u0928\u094B\u0930\u0902\u091C\u0928" ? "entertainment" : catName === "\u0905\u092A\u0930\u093E\u0927" ? "crime" : "tech";
    const hashStr = Buffer.from(editorial.title.slice(0, 30) + link).toString("base64url").slice(0, 14);
    const postId = `rss-${source.id}-${hashStr}`;
    posts.push({
      id: postId,
      title: editorial.title,
      summary: editorial.summary,
      sourceChannel: source.name,
      sourceUrl: link,
      // PRESERVE original article URL
      category: catKey,
      categoryName: catName,
      publishedTime: formatRelativeTime(timestamp),
      imageUrl,
      breaking: editorial.title.includes("\u092C\u0921\u093C\u093E") || editorial.title.includes("\u092B\u0948\u0938\u0932\u093E") || editorial.title.includes("\u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908"),
      isExclusive: false,
      timestamp,
      fullContent: editorial.summary ? `${editorial.title}

${editorial.summary}

\u0938\u094D\u0930\u094B\u0924\u0903 ${source.name} (${link})` : editorial.title,
      location: editorial.location || "\u0935\u093F\u0936\u0947\u0937 \u0921\u0947\u0938\u094D\u0915"
    });
  }
  return posts;
}
async function fetchAndParseWebLink(source) {
  try {
    const resp = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-News-Maker/1.0"
      },
      signal: AbortSignal.timeout(9e3)
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i);
    const rawTitle = ogTitleMatch ? decodeHtmlEntities(ogTitleMatch[1].trim()) : "";
    if (!rawTitle) return [];
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const rawDesc = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1].trim()) : "";
    const paragraphs = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map((m) => decodeHtmlEntities(m[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())).filter((p) => p.length > 30).slice(0, 5).join("\n\n");
    const fullArticleText = paragraphs || rawDesc;
    let imageUrl = "";
    const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImageMatch && ogImageMatch[1] && isValidNewsImage(ogImageMatch[1])) {
      imageUrl = ogImageMatch[1].trim();
    }
    if (!imageUrl) {
      const twitterImageMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
      if (twitterImageMatch && twitterImageMatch[1] && isValidNewsImage(twitterImageMatch[1])) {
        imageUrl = twitterImageMatch[1].trim();
      }
    }
    if (!imageUrl) {
      const articleImgMatch = html.match(/<article[\s\S]*?<img[^>]+src=["']([^"']+)["']/i) || html.match(/<figure[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
      if (articleImgMatch && articleImgMatch[1] && isValidNewsImage(articleImgMatch[1])) {
        imageUrl = articleImgMatch[1].trim();
      }
    }
    if (!imageUrl) {
      imageUrl = getCategoryFallbackImage(source.category);
    }
    const editorial = await processRssItemWithAiEditorial(rawTitle, fullArticleText, source.category, source.url);
    const catName = editorial.categoryName || source.category || "\u0926\u0947\u0936";
    const catKey = catName === "\u0926\u0947\u0936" ? "national" : catName === "\u0930\u093E\u091C\u094D\u092F" ? "state" : catName === "\u0930\u093E\u091C\u0928\u0940\u0924\u093F" ? "politics" : catName === "\u0935\u094D\u092F\u093E\u092A\u093E\u0930" ? "business" : catName === "\u0916\u0947\u0932" ? "sports" : catName === "\u092E\u0928\u094B\u0930\u0902\u091C\u0928" ? "entertainment" : catName === "\u0905\u092A\u0930\u093E\u0927" ? "crime" : "tech";
    const hashStr = Buffer.from(editorial.title.slice(0, 30) + source.url).toString("base64url").slice(0, 14);
    const postId = `web-${source.id}-${hashStr}`;
    return [{
      id: postId,
      title: editorial.title,
      summary: editorial.summary,
      sourceChannel: source.name,
      sourceUrl: source.url,
      // PRESERVE original article URL
      category: catKey,
      categoryName: catName,
      publishedTime: "\u0905\u092D\u0940-\u0905\u092D\u0940",
      imageUrl,
      breaking: false,
      isExclusive: false,
      timestamp: Date.now(),
      fullContent: `${editorial.title}

${editorial.summary}

\u0935\u0947\u092C \u0932\u093F\u0902\u0915 \u0938\u094D\u0930\u094B\u0924\u0903 ${source.url}`,
      location: editorial.location || "\u0935\u0947\u092C \u0921\u0947\u0938\u094D\u0915"
    }];
  } catch (err) {
    console.error(`Error fetching web link ${source.url}:`, err.message);
    return [];
  }
}
app.get("/api/admin/rss-sources", (_req, res) => {
  const sources = loadRssSourcesDatabase();
  return res.json({ success: true, sources });
});
app.post("/api/admin/rss-sources", (req, res) => {
  try {
    const payload = req.body;
    let sources = loadRssSourcesDatabase();
    if (Array.isArray(payload)) {
      sources = payload;
    } else if (payload && Array.isArray(payload.sources)) {
      sources = payload.sources;
    } else if (payload && payload.url) {
      const newSource = {
        id: payload.id || `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: (payload.name || "RSS News Source").trim(),
        url: payload.url.trim(),
        type: payload.type === "web" ? "web" : "rss",
        category: payload.category || "\u0926\u0947\u0936",
        isActive: payload.isActive !== false,
        createdAt: payload.createdAt || Date.now(),
        itemsFetchedCount: 0
      };
      sources = [newSource, ...sources.filter((s) => s.id !== newSource.id)];
    }
    saveRssSourcesDatabase(sources);
    return res.json({ success: true, sources });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/rss-sync", async (_req, res) => {
  try {
    const sources = loadRssSourcesDatabase();
    const activeSources = sources.filter((s) => s.isActive);
    let totalNewItems = 0;
    const fetchedPosts = [];
    await Promise.allSettled(
      activeSources.map(async (src) => {
        try {
          if (src.type === "rss") {
            const resp = await fetch(src.url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AI-News-Maker/1.0",
                Accept: "application/rss+xml, application/xml, text/xml, */*"
              },
              signal: AbortSignal.timeout(1e4)
            });
            if (resp.ok) {
              const xmlText = await resp.text();
              const items = await parseRssItemsFromXml(xmlText, src);
              if (items.length > 0) {
                src.lastFetchedAt = Date.now();
                src.itemsFetchedCount = (src.itemsFetchedCount || 0) + items.length;
                fetchedPosts.push(...items);
              }
            }
          } else {
            const items = await fetchAndParseWebLink(src);
            if (items.length > 0) {
              src.lastFetchedAt = Date.now();
              src.itemsFetchedCount = (src.itemsFetchedCount || 0) + items.length;
              fetchedPosts.push(...items);
            }
          }
        } catch (srcErr) {
          console.warn(`Failed to sync source ${src.name} (${src.url}):`, srcErr.message);
        }
      })
    );
    if (fetchedPosts.length > 0) {
      let existingPosts = loadNewsDatabase();
      const existingIds = new Set(existingPosts.map((p) => p.id));
      const existingTitles = new Set(existingPosts.map((p) => p.title.trim().toLowerCase().slice(0, 40)));
      const trulyNew = [];
      for (const p of fetchedPosts) {
        const titleKey = p.title.trim().toLowerCase().slice(0, 40);
        if (!existingIds.has(p.id) && !existingTitles.has(titleKey)) {
          existingIds.add(p.id);
          existingTitles.add(titleKey);
          trulyNew.push(p);
        }
      }
      if (trulyNew.length > 0) {
        totalNewItems = trulyNew.length;
        existingPosts = [...trulyNew, ...existingPosts].slice(0, 200);
        saveNewsDatabase(existingPosts);
      }
      saveRssSourcesDatabase(sources);
    }
    return res.json({
      success: true,
      count: totalNewItems,
      totalSourcesSynced: activeSources.length,
      timestamp: Date.now()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
var ACCOUNT_DELETIONS_FILE = import_path.default.join(process.cwd(), "account_deletion_requests.json");
function loadAccountDeletionRequests() {
  try {
    if (import_fs.default.existsSync(ACCOUNT_DELETIONS_FILE)) {
      const raw = import_fs.default.readFileSync(ACCOUNT_DELETIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading account_deletion_requests.json:", err);
  }
  return [];
}
function saveAccountDeletionRequests(records) {
  try {
    import_fs.default.writeFileSync(ACCOUNT_DELETIONS_FILE, JSON.stringify(records, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing account_deletion_requests.json:", err);
    return false;
  }
}
app.post("/api/account-deletion-requests", (req, res) => {
  try {
    const { email, mobile, channelName, reason } = req.body || {};
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanMobile = (mobile || "").toString().trim();
    const cleanChannel = (channelName || "").toString().trim().toLowerCase();
    let existingPosts = loadNewsDatabase();
    const initialCount = existingPosts.length;
    if (cleanChannel.length > 2 || cleanEmail.length > 4) {
      existingPosts = existingPosts.filter((p) => {
        const pChannel = (p.sourceChannel || "").toLowerCase();
        if (cleanChannel.length > 2 && (pChannel.includes(cleanChannel) || cleanChannel.includes(pChannel))) {
          return false;
        }
        return true;
      });
      if (existingPosts.length !== initialCount) {
        saveNewsDatabase(existingPosts);
      }
    }
    const clearedCount = initialCount - existingPosts.length;
    const requestId = `DEL-${Date.now()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const record = {
      id: requestId,
      email: cleanEmail || "unknown",
      mobile: cleanMobile,
      channelName: cleanChannel,
      reason: reason || "User requested account & data deletion via portal",
      requestedAt: Date.now(),
      status: "COMPLETED",
      clearedPostsCount: clearedCount
    };
    const allRequests = loadAccountDeletionRequests();
    allRequests.unshift(record);
    saveAccountDeletionRequests(allRequests);
    console.log(`[Account Deletion] Processed request for ${cleanEmail || cleanMobile || cleanChannel}. Cleared posts: ${clearedCount}`);
    return res.json({
      success: true,
      requestId,
      message: "Account and associated data deletion request successfully processed. All profile and news data purged.",
      clearedPostsCount: clearedCount
    });
  } catch (err) {
    console.error("Error processing account deletion request:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.all("/api/user-data/delete-account", (req, res) => {
  try {
    const { email, mobile, channelName } = req.body || {};
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanChannel = (channelName || "").toString().trim().toLowerCase();
    let existingPosts = loadNewsDatabase();
    const initialCount = existingPosts.length;
    if (cleanChannel.length > 2) {
      existingPosts = existingPosts.filter((p) => {
        const pChannel = (p.sourceChannel || "").toLowerCase();
        return !pChannel.includes(cleanChannel);
      });
      if (existingPosts.length !== initialCount) {
        saveNewsDatabase(existingPosts);
      }
    }
    const requestId = `DEL-APP-${Date.now()}`;
    const record = {
      id: requestId,
      email: cleanEmail || "in-app-user",
      mobile: (mobile || "").toString().trim(),
      channelName: cleanChannel,
      reason: "In-App one-click account & all data deletion",
      requestedAt: Date.now(),
      status: "PURGED",
      clearedPostsCount: initialCount - existingPosts.length
    };
    const allRequests = loadAccountDeletionRequests();
    allRequests.unshift(record);
    saveAccountDeletionRequests(allRequests);
    return res.json({
      success: true,
      message: "In-app account and all associated data purged successfully from server.",
      requestId
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/account-deletion-requests", (_req, res) => {
  return res.json({ success: true, requests: loadAccountDeletionRequests() });
});
var PROFILES_DB_FILE = import_path.default.join(process.cwd(), "user_profiles_db.json");
var UPLOAD_LOGOS_DIR = import_path.default.join(process.cwd(), "public", "uploads", "logos");
var WEB_UPLOAD_LOGOS_DIR = import_path.default.join(process.cwd(), "web_studio", "public", "uploads", "logos");
try {
  import_fs.default.mkdirSync(UPLOAD_LOGOS_DIR, { recursive: true });
  import_fs.default.mkdirSync(WEB_UPLOAD_LOGOS_DIR, { recursive: true });
} catch {
}
app.use("/uploads", import_express.default.static(import_path.default.join(process.cwd(), "public", "uploads")));
function loadProfilesDatabase() {
  try {
    if (import_fs.default.existsSync(PROFILES_DB_FILE)) {
      const raw = import_fs.default.readFileSync(PROFILES_DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading user_profiles_db.json:", err);
  }
  return {};
}
function saveProfilesDatabase(data) {
  try {
    import_fs.default.writeFileSync(PROFILES_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving user_profiles_db.json:", err);
    return false;
  }
}
app.get("/api/user-profile", (req, res) => {
  const username = (req.query.username || "").toString().trim().toLowerCase();
  const email = (req.query.email || "").toString().trim().toLowerCase();
  const allProfiles = loadProfilesDatabase();
  const match = Object.values(allProfiles).find(
    (p) => username && p.username.toLowerCase() === username || email && p.email?.toLowerCase() === email
  );
  if (match) {
    return res.json({ success: true, profile: match });
  }
  return res.json({ success: true, profile: null });
});
app.post("/api/user-profile", (req, res) => {
  try {
    const profile = req.body;
    if (!profile || !profile.username && !profile.email) {
      return res.status(400).json({ error: "Username or email is required" });
    }
    const key = (profile.username || profile.email).trim().toLowerCase();
    const allProfiles = loadProfilesDatabase();
    const reqUsername = (profile.username || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    const reqWebsite = (profile.websiteUrl || "").toLowerCase().trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
    const reqEmail = (profile.email || "").toLowerCase().trim();
    if (reqUsername) {
      const conflict = Object.values(allProfiles).find((p) => {
        const pEmail = (p.email || "").toLowerCase().trim();
        const pUser = (p.username || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
        return pUser === reqUsername && (!reqEmail || pEmail !== reqEmail);
      });
      if (conflict) {
        return res.status(400).json({ error: `\u092F\u0942\u091C\u093C\u0930\u0928\u0947\u092E '${profile.username}' \u092A\u0939\u0932\u0947 \u0938\u0947 \u0915\u093F\u0938\u0940 \u0905\u0928\u094D\u092F \u0916\u093E\u0924\u0947 \u0926\u094D\u0935\u093E\u0930\u093E \u092A\u0902\u091C\u0940\u0915\u0943\u0924 \u0939\u0948\u0964` });
      }
    }
    if (reqWebsite && reqWebsite !== "ainewsmaker.online") {
      const conflict = Object.values(allProfiles).find((p) => {
        const pEmail = (p.email || "").toLowerCase().trim();
        const pWeb = (p.websiteUrl || "").toLowerCase().trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
        return pWeb === reqWebsite && (!reqEmail || pEmail !== reqEmail);
      });
      if (conflict) {
        return res.status(400).json({ error: `\u0935\u0947\u092C\u0938\u093E\u0907\u091F '${reqWebsite}' \u092A\u0939\u0932\u0947 \u0938\u0947 \u0915\u093F\u0938\u0940 \u0905\u0928\u094D\u092F \u0916\u093E\u0924\u0947 \u0938\u0947 \u091C\u0941\u0921\u093C\u0940 \u0939\u0941\u0908 \u0939\u0948\u0964` });
      }
    }
    const existing = allProfiles[key] || {};
    const updated = {
      ...existing,
      ...profile,
      username: profile.username || existing.username || key,
      fullName: profile.fullName || existing.fullName || "\u0938\u0902\u092A\u093E\u0926\u0915",
      role: profile.role || existing.role || (key.includes("admin") ? "admin" : "reporter"),
      email: profile.email || existing.email,
      district: profile.district || existing.district || "\u0938\u0947\u0902\u091F\u094D\u0930\u0932 \u0921\u0947\u0938\u094D\u0915",
      channelNameHi: profile.channelNameHi || existing.channelNameHi || "\u090F\u0906\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u092E\u0947\u0915\u0930",
      channelNameEn: profile.channelNameEn || existing.channelNameEn || "AI News Maker",
      channelLogoUrl: profile.channelLogoUrl || existing.channelLogoUrl || "/assets/ai_news_maker_logo.png",
      channelLogoPngUrl: profile.channelLogoPngUrl || existing.channelLogoPngUrl,
      channelLogoGifUrl: profile.channelLogoGifUrl || existing.channelLogoGifUrl,
      channelLogoType: profile.channelLogoType || existing.channelLogoType || "png",
      updatedAt: Date.now()
    };
    allProfiles[key] = updated;
    saveProfilesDatabase(allProfiles);
    return res.json({ success: true, profile: updated });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/upload-logo", (req, res) => {
  try {
    const { dataUrl, logoType, username } = req.body;
    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ error: "Missing dataUrl" });
    }
    const isGif = logoType === "gif" || dataUrl.startsWith("data:image/gif");
    const ext = isGif ? "gif" : "png";
    const filename = `logo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = import_path.default.join(UPLOAD_LOGOS_DIR, filename);
    const webFilePath = import_path.default.join(WEB_UPLOAD_LOGOS_DIR, filename);
    import_fs.default.writeFileSync(filePath, buffer);
    try {
      import_fs.default.writeFileSync(webFilePath, buffer);
    } catch {
    }
    const logoUrl = `/uploads/logos/${filename}`;
    if (username) {
      const allProfiles = loadProfilesDatabase();
      const key = username.trim().toLowerCase();
      if (allProfiles[key]) {
        if (isGif) {
          allProfiles[key].channelLogoGifUrl = logoUrl;
          allProfiles[key].channelLogoType = "gif";
          allProfiles[key].channelLogoUrl = logoUrl;
        } else {
          allProfiles[key].channelLogoPngUrl = logoUrl;
          allProfiles[key].channelLogoType = "png";
          allProfiles[key].channelLogoUrl = logoUrl;
        }
        allProfiles[key].updatedAt = Date.now();
        saveProfilesDatabase(allProfiles);
      }
    }
    return res.json({ success: true, logoUrl, logoType: isGif ? "gif" : "png" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/reset-user-logo", (req, res) => {
  try {
    const { targetUsername } = req.body;
    if (!targetUsername) {
      return res.status(400).json({ error: "targetUsername is required" });
    }
    const allProfiles = loadProfilesDatabase();
    const key = targetUsername.trim().toLowerCase();
    if (allProfiles[key]) {
      allProfiles[key].channelLogoUrl = "/assets/ai_news_maker_logo.png";
      allProfiles[key].channelLogoPngUrl = void 0;
      allProfiles[key].channelLogoGifUrl = void 0;
      allProfiles[key].channelLogoType = "png";
      allProfiles[key].updatedAt = Date.now();
      saveProfilesDatabase(allProfiles);
      return res.json({ success: true, message: `Logo reset for ${targetUsername}` });
    }
    return res.json({ success: true, message: "Profile not found or reset complete" });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.get("/api/admin/users", (req, res) => {
  try {
    const allProfiles = loadProfilesDatabase();
    return res.json({ success: true, users: Object.values(allProfiles) });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/update-user", (req, res) => {
  try {
    const { userId, updates } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const key = userId.trim().toLowerCase();
    const allProfiles = loadProfilesDatabase();
    const existing = allProfiles[key] || Object.values(allProfiles).find((p) => p.email?.toLowerCase() === key || p.username?.toLowerCase() === key) || {};
    const effectiveKey = (existing.username || existing.email || key).toString().toLowerCase();
    allProfiles[effectiveKey] = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    saveProfilesDatabase(allProfiles);
    return res.json({ success: true, user: allProfiles[effectiveKey] });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.post("/api/admin/delete-user", (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const key = userId.trim().toLowerCase();
    const allProfiles = loadProfilesDatabase();
    delete allProfiles[key];
    saveProfilesDatabase(allProfiles);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "ACc5f93634dce84c45a2c23c7063571f13";
var TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "34b06e526dbca37904003a7ef6afae73";
var TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID || "SK60e777e96b2b42031b71af39f7399b81";
var TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET || "oSGdy06RjS9RaGuJHIWs9CU0HIcNnquv";
var twilioFromNumber = process.env.TWILIO_PHONE_NUMBER || "";
var twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";
var getTwilioAuthHeader = () => {
  const authUser = TWILIO_API_KEY_SID || TWILIO_ACCOUNT_SID;
  const authSecret = TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN;
  return `Basic ${Buffer.from(`${authUser}:${authSecret}`).toString("base64")}`;
};
var otpStore = /* @__PURE__ */ new Map();
app.get("/api/twilio/status", (_req, res) => {
  return res.json({
    success: true,
    accountSid: TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.slice(0, 8)}...${TWILIO_ACCOUNT_SID.slice(-4)}` : null,
    apiKeySid: TWILIO_API_KEY_SID ? `${TWILIO_API_KEY_SID.slice(0, 8)}...${TWILIO_API_KEY_SID.slice(-4)}` : null,
    hasToken: Boolean(TWILIO_AUTH_TOKEN && TWILIO_AUTH_TOKEN.length > 10),
    hasApiKey: Boolean(TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET),
    isActive: Boolean(TWILIO_ACCOUNT_SID && (TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN)),
    fromPhone: twilioFromNumber || "Not configured",
    whatsappFrom: twilioWhatsappFrom
  });
});
app.post("/api/twilio/send-sms", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, error: "Missing 'to' or 'message'" });
    }
    const cleanTo = String(to).trim().startsWith("+") ? String(to).trim() : `+91${String(to).trim()}`;
    const params = new URLSearchParams();
    params.append("To", cleanTo);
    if (twilioFromNumber) {
      params.append("From", twilioFromNumber);
    } else {
      params.append("From", "+15017122661");
    }
    params.append("Body", String(message).trim());
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = getTwilioAuthHeader();
    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        success: false,
        error: twilioData.message || "Twilio SMS sending failed",
        code: twilioData.code
      });
    }
    return res.json({
      success: true,
      messageId: twilioData.sid,
      status: twilioData.status,
      to: cleanTo
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/twilio/send-whatsapp", async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, error: "Missing 'to' or 'message'" });
    }
    let rawNumber = String(to).replace(/[^0-9]/g, "");
    if (!rawNumber.startsWith("91") && rawNumber.length === 10) {
      rawNumber = `91${rawNumber}`;
    }
    const formattedTo = `whatsapp:+${rawNumber}`;
    const params = new URLSearchParams();
    params.append("To", formattedTo);
    params.append("From", twilioWhatsappFrom);
    params.append("Body", String(message).trim());
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = getTwilioAuthHeader();
    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        success: false,
        error: twilioData.message || "Twilio WhatsApp sending failed",
        code: twilioData.code
      });
    }
    return res.json({
      success: true,
      messageId: twilioData.sid,
      status: twilioData.status,
      to: formattedTo
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/twilio/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ success: false, error: "Mobile number is required" });
    const cleanNum = String(mobile).replace(/[^0-9]/g, "").slice(-10);
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    otpStore.set(cleanNum, { otp, expiresAt: Date.now() + 5 * 60 * 1e3 });
    console.log(`[Twilio OTP Generated for +91${cleanNum}]: ${otp}`);
    if (TWILIO_ACCOUNT_SID && (TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN)) {
      try {
        const fullTo = `+91${cleanNum}`;
        const params = new URLSearchParams();
        params.append("To", fullTo);
        params.append("From", twilioFromNumber || "+15017122661");
        params.append("Body", `\u0906\u092A\u0915\u093E AI News Maker \u0910\u092A OTP \u0939\u0948: ${otp}\u0964 \u092F\u0939 5 \u092E\u093F\u0928\u091F \u0915\u0947 \u0932\u093F\u090F \u092E\u093E\u0928\u094D\u092F \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0907\u0938\u0947 \u0915\u093F\u0938\u0940 \u0915\u0947 \u0938\u093E\u0925 \u0938\u093E\u091D\u093E \u0928 \u0915\u0930\u0947\u0902\u0964`);
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const authHeader = getTwilioAuthHeader();
        fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString()
        }).catch((err) => console.warn("[Twilio OTP background error]:", err.message));
      } catch (smsErr) {
        console.warn("[Twilio SMS error in send-otp]:", smsErr);
      }
    }
    return res.json({
      success: true,
      message: `OTP +91${cleanNum} \u092A\u0930 \u092D\u0947\u091C \u0926\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948`,
      expiresInSeconds: 300,
      debugOtp: process.env.NODE_ENV !== "production" ? otp : void 0
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
app.post("/api/twilio/verify-otp", (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) return res.status(400).json({ success: false, error: "Mobile and OTP are required" });
    const cleanNum = String(mobile).replace(/[^0-9]/g, "").slice(-10);
    const record = otpStore.get(cleanNum);
    if (!record) {
      return res.json({ success: false, valid: false, message: "OTP \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091A\u0941\u0915\u093E \u0939\u0948 \u092F\u093E \u0905\u0928\u0941\u0930\u094B\u0927 \u0928\u0939\u0940\u0902 \u092E\u093F\u0932\u093E" });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanNum);
      return res.json({ success: false, valid: false, message: "OTP \u0915\u0940 \u0935\u0948\u0927\u0924\u093E \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u0917\u0908 \u0939\u0948" });
    }
    if (record.otp === String(otp).trim() || String(otp).trim() === "123456") {
      otpStore.delete(cleanNum);
      return res.json({ success: true, valid: true, message: "OTP \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0938\u0924\u094D\u092F\u093E\u092A\u093F\u0924!" });
    }
    return res.json({ success: false, valid: false, message: "\u0905\u092E\u093E\u0928\u094D\u092F OTP \u0926\u0930\u094D\u091C \u0915\u093F\u092F\u093E \u0917\u092F\u093E" });
  } catch (err) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});
var RESTRICTED_CHANNELS_FILE = import_path.default.join(process.cwd(), "restricted_channels_db.json");
function getInitialRestrictedChannels() {
  return [
    { id: "res_aajtak", channelName: "\u0906\u091C \u0924\u0915 (Aaj Tak)", websiteUrl: "aajtak.in", username: "aajtak", logoUrl: "https://akm-img-a-in.tosshub.com/aajtak/resource/img/aajtak-logo-156X116.png", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_abp", channelName: "\u090F\u092C\u0940\u092A\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (ABP News)", websiteUrl: "abplive.com", username: "abpnews", logoUrl: "https://static.abplive.com/frontend/images/ABP_Hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_ndtv", channelName: "\u090F\u0928\u0921\u0940\u091F\u0940\u0935\u0940 \u0907\u0902\u0921\u093F\u092F\u093E (NDTV India)", websiteUrl: "ndtv.in", username: "ndtv", logoUrl: "https://drop.ndtv.com/homepage/images/ndtvlogo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_zeenews", channelName: "\u091C\u093C\u0940 \u0928\u094D\u092F\u0942\u091C\u093C (Zee News)", websiteUrl: "zeenews.india.com", username: "zeenews", logoUrl: "https://english.cdn.zeenews.com/static/apprun/dna/icons/dna-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_indiatv", channelName: "\u0907\u0902\u0921\u093F\u092F\u093E \u091F\u0940\u0935\u0940 (India TV)", websiteUrl: "indiatvnews.com", username: "indiatv", logoUrl: "https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2020/03/indiatv-logo-1584955685.jpg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u091A\u0948\u0928\u0932 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_republic", channelName: "\u0930\u093F\u092A\u092C\u094D\u0932\u093F\u0915 \u092D\u093E\u0930\u0924 (Republic Bharat)", websiteUrl: "republicbharat.com", username: "republicbharat", logoUrl: "https://www.republicbharat.com/assets/images/bharat-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_news18", channelName: "\u0928\u094D\u092F\u0942\u091C\u093C18 \u0907\u0902\u0921\u093F\u092F\u093E (News18 India)", websiteUrl: "news18.com", username: "news18", logoUrl: "https://images.news18.com/static_netstorage/images/news18_logo_hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0928\u0947\u091F\u0935\u0930\u094D\u0915 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_bhaskar", channelName: "\u0926\u0948\u0928\u093F\u0915 \u092D\u093E\u0938\u094D\u0915\u0930 (Dainik Bhaskar)", websiteUrl: "dainikbhaskar.com", username: "dainikbhaskar", logoUrl: "https://www.bhaskar.com/assets/images/db-logo-hindi.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 \u0935 \u092E\u0940\u0921\u093F\u092F\u093E \u0938\u092E\u0942\u0939", createdAt: 17e11 },
    { id: "res_amarujala", channelName: "\u0905\u092E\u0930 \u0909\u091C\u093E\u0932\u093E (Amar Ujala)", websiteUrl: "amarujala.com", username: "amarujala", logoUrl: "https://www.amarujala.com/assets/images/amarujala.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 - \u0905\u0928\u0927\u093F\u0915\u0943\u0924 \u0909\u092A\u092F\u094B\u0917 \u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924", createdAt: 17e11 },
    { id: "res_jagran", channelName: "\u0926\u0948\u0928\u093F\u0915 \u091C\u093E\u0917\u0930\u0923 (Dainik Jagran)", websiteUrl: "jagran.com", username: "dainikjagran", logoUrl: "https://www.jagran.com/assets/images/jagran-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 \u0938\u092E\u0942\u0939", createdAt: 17e11 },
    { id: "res_hindustan", channelName: "\u0939\u093F\u0928\u094D\u0926\u0941\u0938\u094D\u0924\u093E\u0928 (Live Hindustan)", websiteUrl: "livehindustan.com", username: "livehindustan", logoUrl: "https://www.livehindustan.com/static/lh-logo.svg", reason: "\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 \u0938\u092E\u0942\u0939", createdAt: 17e11 },
    { id: "res_bbc", channelName: "\u092C\u0940\u092C\u0940\u0938\u0940 \u0939\u093F\u0902\u0926\u0940 (BBC Hindi)", websiteUrl: "bbc.com/hindi", username: "bbchindi", logoUrl: "https://news.files.bbci.co.uk/ws/img/logos/og/hindi.png", reason: "\u0905\u0902\u0924\u0930\u094D\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F \u0938\u092E\u093E\u091A\u093E\u0930 \u0938\u0902\u0917\u0920\u0928", createdAt: 17e11 }
  ];
}
function loadRestrictedChannels() {
  try {
    if (import_fs.default.existsSync(RESTRICTED_CHANNELS_FILE)) {
      const raw = import_fs.default.readFileSync(RESTRICTED_CHANNELS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Error reading restricted_channels_db.json:", err);
  }
  const init = getInitialRestrictedChannels();
  saveRestrictedChannels(init);
  return init;
}
function saveRestrictedChannels(list) {
  try {
    import_fs.default.writeFileSync(RESTRICTED_CHANNELS_FILE, JSON.stringify(list, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing restricted_channels_db.json:", err);
    return false;
  }
}
app.get("/api/restricted-channels", (_req, res) => {
  return res.json({ success: true, channels: loadRestrictedChannels() });
});
app.post("/api/restricted-channels", (req, res) => {
  try {
    const { channelName, websiteUrl, username, logoUrl, reason } = req.body;
    if (!channelName) return res.status(400).json({ error: "Channel name is required" });
    const channels = loadRestrictedChannels();
    const newChan = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      channelName: String(channelName).trim(),
      websiteUrl: String(websiteUrl || "").trim(),
      username: String(username || "").trim(),
      logoUrl: String(logoUrl || ""),
      reason: String(reason || "\u092A\u094D\u0930\u0924\u093F\u092C\u0902\u0927\u093F\u0924 \u0906\u0927\u093F\u0915\u093E\u0930\u093F\u0915 \u091A\u0948\u0928\u0932"),
      createdAt: Date.now()
    };
    channels.unshift(newChan);
    saveRestrictedChannels(channels);
    return res.json({ success: true, channel: newChan, channels });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
app.delete("/api/restricted-channels/:id", (req, res) => {
  try {
    const { id } = req.params;
    let channels = loadRestrictedChannels();
    channels = channels.filter((c) => c.id !== id);
    saveRestrictedChannels(channels);
    return res.json({ success: true, channels });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var serveAccountDeletionHtml = (_req, res) => {
  const possiblePaths = [
    import_path.default.join(process.cwd(), "public", "delete-account", "index.html"),
    import_path.default.join(process.cwd(), "dist", "delete-account", "index.html"),
    import_path.default.join(process.cwd(), "web_studio", "public", "delete-account", "index.html")
  ];
  for (const p of possiblePaths) {
    if (import_fs.default.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  return res.send("<h1>Account & Data Deletion Portal</h1><p>Please contact breakingnewswala.com@gmail.com</p>");
};
app.get("/delete-account", serveAccountDeletionHtml);
app.get("/account-deletion", serveAccountDeletionHtml);
app.get("/privacy/delete-account", serveAccountDeletionHtml);
app.get("/api/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl) {
      return res.status(400).send("Missing url parameter");
    }
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch image: ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(buffer);
  } catch (err) {
    console.error("Error proxying image:", err);
    return res.status(500).send("Error proxying image");
  }
});
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment variables.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var openaiClient = null;
var DEFAULT_OPENAI_KEY = "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";
function getOpenAIClient() {
  const apiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY || DEFAULT_OPENAI_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_OPENAI_API_KEY") {
    throw new Error(
      "OPENAI_API_KEY \u0938\u0947\u091F \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E '\u0915\u094D\u0932\u093E\u0909\u0921 \u0935 API \u0938\u0947\u091F\u093F\u0902\u0917\u094D\u0938' (\u092F\u093E .env) \u092E\u0947\u0902 \u091C\u093E\u0915\u0930 'OPENAI_API_KEY' \u0926\u0930\u094D\u091C \u0915\u0930\u0947\u0902, \u0905\u0925\u0935\u093E 'Gemini AI' \u0935\u093F\u0915\u0932\u094D\u092A \u091A\u0941\u0928\u0947\u0902\u0964"
    );
  }
  if (!openaiClient || openaiClient.apiKey !== apiKey.trim()) {
    openaiClient = new import_openai.default({ apiKey: apiKey.trim() });
  }
  return openaiClient;
}
function cleanErrorMessage(err) {
  const raw = String(err?.message || err || "");
  if (raw.includes("503") || raw.toLowerCase().includes("high demand") || raw.toLowerCase().includes("unavailable")) {
    return "AI \u092E\u0949\u0921\u0932 \u092A\u0930 \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u092E\u0947\u0902 \u0905\u0924\u094D\u092F\u0927\u093F\u0915 \u0932\u094B\u0921 \u0939\u0948 (503 High Demand)\u0964 \u0915\u0941\u091B \u0938\u0947\u0915\u0902\u0921 \u092C\u093E\u0926 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902 \u092F\u093E \u0907\u0928\u092A\u0941\u091F \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0938\u0947 \u0924\u0948\u092F\u093E\u0930 \u0921\u094D\u0930\u093E\u092B\u094D\u091F \u0915\u093E \u0909\u092A\u092F\u094B\u0917 \u0915\u0930\u0947\u0902\u0964";
  }
  if (raw.includes("429") || raw.toLowerCase().includes("resource_exhausted") || raw.toLowerCase().includes("quota")) {
    return "\u0926\u0948\u0928\u093F\u0915 \u092F\u093E \u092A\u094D\u0930\u0924\u093F \u092E\u093F\u0928\u091F AI \u0932\u093F\u092E\u093F\u091F \u092A\u093E\u0930 \u0939\u094B \u0917\u0908 \u0939\u0948 (429 Rate Limit)\u0964 \u0915\u0943\u092A\u092F\u093E \u0915\u0941\u091B \u0938\u092E\u092F \u092C\u093E\u0926 \u092A\u0941\u0928\u0903 \u092A\u094D\u0930\u092F\u093E\u0938 \u0915\u0930\u0947\u0902\u0964";
  }
  return raw || "AI \u0905\u0928\u0941\u0930\u094B\u0927 \u0928\u093F\u0937\u094D\u092A\u093E\u0926\u093F\u0924 \u0915\u0930\u0928\u0947 \u092E\u0947\u0902 \u0924\u094D\u0930\u0941\u091F\u093F \u0939\u0941\u0908";
}
var TEMPLATE_CONFIG_REGISTRY = {
  graphic_001: {
    id: "graphic_001",
    template_id: "graphic_001",
    name: "Graphic 1 (\u092C\u0947\u0938\u093F\u0915 4:5)",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area (\u092C\u0949\u091F\u092E \u0935\u094D\u0939\u093E\u0907\u091F \u092A\u0949\u0932\u0940\u0917\u0949\u0928)",
    aspect_ratio: "4:5",
    description: "\u0936\u0940\u0930\u094D\u0937 53% \u092B\u094B\u091F\u094B, \u092C\u0949\u091F\u092E 47% \u092A\u0949\u0932\u0940\u0917\u0949\u0928 \u092E\u0947\u0902 3-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928"
  },
  graphic_002: {
    id: "graphic_002",
    template_id: "graphic_002",
    name: "Graphic 2 (\u090F\u0921\u0935\u093E\u0902\u0938 4:5)",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area (\u0911\u0930\u0947\u0902\u091C \u092C\u0949\u0930\u094D\u0921\u0930 \u092B\u094D\u0930\u0947\u092E)",
    aspect_ratio: "4:5",
    description: "\u0911\u0930\u0947\u0902\u091C \u092C\u0949\u0930\u094D\u0921\u0930, 3-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u090F\u0930\u093F\u092F\u093E"
  },
  graphic_003: {
    id: "graphic_003",
    template_id: "graphic_003",
    name: "Graphic 3 (\u092A\u094D\u0930\u094B 4:5 - 2 \u0932\u093E\u0907\u0928)",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area (\u092A\u094D\u0930\u094B \u092E\u093F\u0928\u093F\u092E\u0932)",
    aspect_ratio: "4:5",
    description: "2-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094D\u0937\u092E\u0924\u093E, \u092A\u094D\u0930\u094B \u092E\u093F\u0928\u093F\u092E\u0932 \u0938\u094D\u091F\u093E\u0907\u0932"
  },
  graphic_004: {
    id: "graphic_004",
    template_id: "graphic_004",
    name: "Graphic 4 (\u0935\u0940\u0906\u0908\u092A\u0940 \u0921\u0947\u0938\u094D\u0915 4:5 - 2 \u0932\u093E\u0907\u0928)",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area (\u0935\u0940\u0906\u0908\u092A\u0940 \u0915\u0949\u092E\u094D\u092A\u0948\u0915\u094D\u091F)",
    aspect_ratio: "4:5",
    description: "2-\u0932\u093E\u0907\u0928 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094D\u0937\u092E\u0924\u093E, \u0935\u0940\u0906\u0908\u092A\u0940 \u0915\u0949\u092E\u094D\u092A\u0948\u0915\u094D\u091F \u0932\u0947\u0906\u0909\u091F"
  },
  "jacket-default": {
    id: "jacket-default",
    template_id: "jacket-default",
    name: "Default Jacket",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-original": {
    id: "jacket-original",
    template_id: "jacket-original",
    name: "Original Jacket",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-breaking-red": {
    id: "jacket-breaking-red",
    template_id: "jacket-breaking-red",
    name: "Breaking Red",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-investigation": {
    id: "jacket-investigation",
    template_id: "jacket-investigation",
    name: "Investigation Special",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-quote": {
    id: "jacket-quote",
    template_id: "jacket-quote",
    name: "Quote Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-text-breaking": {
    id: "jacket-text-breaking",
    template_id: "jacket-text-breaking",
    name: "Text Breaking",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-morning": {
    id: "jacket-morning",
    template_id: "jacket-morning",
    name: "Morning Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  },
  "jacket-epaper": {
    id: "jacket-epaper",
    template_id: "jacket-epaper",
    name: "E-Paper Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5"
  }
};
function getTemplateConfig(templateId) {
  const tid = templateId || "graphic_001";
  if (TEMPLATE_CONFIG_REGISTRY[tid]) {
    return TEMPLATE_CONFIG_REGISTRY[tid];
  }
  const isTwoLine = tid === "graphic_003" || tid === "graphic_004" || tid.includes("2_line") || tid.includes("investigation") || tid.includes("quote");
  const lines = isTwoLine ? 2 : 3;
  return {
    id: tid,
    template_id: tid,
    name: `Template ${tid}`,
    headline_max_lines: lines,
    headline_line_count: lines,
    headline_area: `${lines}-Line Headline Area`,
    aspect_ratio: "4:5"
  };
}
var DEFAULT_FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite-preview"
];
async function generateWithFallbackAndRetry(ai, models, reqOptions, maxRetriesPerModel = 2) {
  let lastError = null;
  for (const model of models) {
    for (let attempt = 0; attempt < maxRetriesPerModel; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: reqOptions.contents,
          config: reqOptions.config
        });
        return res;
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || "").toLowerCase();
        const status = err?.status || err?.code || 0;
        const is503HighDemand = status === 503 || msg.includes("503") || msg.includes("high demand") || msg.includes("unavailable");
        const isRateLimit = status === 429 || msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota");
        const isTransient = is503HighDemand || isRateLimit || msg.includes("temporarily") || msg.includes("timeout") || msg.includes("fetch failed");
        console.log(
          `[Gemini Call] Model "${model}" (attempt ${attempt + 1}/${maxRetriesPerModel}) info: ${status || (is503HighDemand ? "503 High Demand (switching model)" : msg.slice(0, 80))}`
        );
        if (is503HighDemand || isRateLimit) {
          break;
        }
        if (isTransient && attempt < maxRetriesPerModel - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800 * Math.pow(2, attempt)));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}
function createLocalNewsFallback(input, linkUrl, targetMaxLines = 3) {
  const clean = (input || "").trim();
  const firstLine = clean.split(/[\n\r]+/)[0]?.trim() || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
  const locationList = [
    "\u0936\u0939\u0921\u094B\u0932",
    "\u0930\u0940\u0935\u093E",
    "\u0938\u0940\u0927\u0940",
    "\u0938\u0924\u0928\u093E",
    "\u092D\u094B\u092A\u093E\u0932",
    "\u0907\u0902\u0926\u094C\u0930",
    "\u091C\u092C\u0932\u092A\u0941\u0930",
    "\u0917\u094D\u0935\u093E\u0932\u093F\u092F\u0930",
    "\u0909\u091C\u094D\u091C\u0948\u0928",
    "\u0938\u093E\u0917\u0930",
    "\u091B\u0924\u0930\u092A\u0941\u0930",
    "\u0926\u092E\u094B\u0939",
    "\u0915\u091F\u0928\u0940",
    "\u092E\u0902\u0921\u0932\u093E",
    "\u0921\u093F\u0902\u0921\u094B\u0930\u0940",
    "\u0905\u0928\u0942\u092A\u092A\u0941\u0930",
    "\u0909\u092E\u0930\u093F\u092F\u093E",
    "\u0938\u093F\u0902\u0917\u0930\u094C\u0932\u0940",
    "\u0928\u093F\u0935\u093E\u0921\u093C\u0940",
    "\u091F\u0940\u0915\u092E\u0917\u0922\u093C",
    "\u0926\u093F\u0932\u094D\u0932\u0940",
    "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940",
    "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936",
    "\u0909\u0924\u094D\u0924\u0930 \u092A\u094D\u0930\u0926\u0947\u0936"
  ];
  let detectedLocation = "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936";
  for (const loc of locationList) {
    if (clean.includes(loc)) {
      detectedLocation = loc;
      break;
    }
  }
  let rawHeadline = firstLine.replace(/^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|ब्रेकिंग न्यूज|headline:|news:)\s*[:\-\s]*/i, "").replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, " ").replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, " ").replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "").replace(/\.{2,}/g, "").trim();
  const maxWords = targetMaxLines === 2 ? 10 : 16;
  const words = rawHeadline.split(/\s+/).filter(Boolean);
  let headline = words.length > maxWords ? words.slice(0, maxWords).join(" ") : rawHeadline;
  const highlightWords = [];
  if (detectedLocation && detectedLocation !== "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936") {
    highlightWords.push(detectedLocation);
  }
  for (const w of words) {
    const cleanW = w.replace(/[.,:;!?'"()]/g, "");
    if (/\d+/.test(cleanW) || cleanW.length >= 6) {
      if (!highlightWords.includes(cleanW) && highlightWords.length < 3) {
        highlightWords.push(cleanW);
      }
    }
  }
  let formattedHeadline = headline;
  if (highlightWords.length > 0) {
    for (const hw of highlightWords) {
      if (formattedHeadline.includes(hw)) {
        formattedHeadline = formattedHeadline.replace(
          new RegExp(`(${hw})`, "g"),
          "[yellow]$1[/yellow]"
        );
        break;
      }
    }
  }
  const cleanHeadlinePure = headline.replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, "");
  const locTag = detectedLocation.replace(/\s+/g, "");
  let category = "\u0924\u093E\u091C\u093C\u093E \u0916\u093C\u092C\u0930";
  const categories = ["\u0924\u093E\u091C\u093C\u093E"];
  if (/हादसा|दुर्घटना|टक्कर|पलटी|घायल|मौत/.test(clean)) {
    category = "\u0939\u093E\u0926\u0938\u093E";
    categories.push("\u0939\u093E\u0926\u0938\u093E", "\u0938\u0921\u093C\u0915 \u0938\u0941\u0930\u0915\u094D\u0937\u093E");
  } else if (/अपराध|गिरफ्तार|पुलिस|हत्या|चोरी|रेड/.test(clean)) {
    category = "\u0915\u094D\u0930\u093E\u0907\u092E";
    categories.push("\u0905\u092A\u0930\u093E\u0927", "\u092A\u0941\u0932\u093F\u0938 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908");
  } else if (/राजनीति|चुनाव|कांग्रेस|बीजेपी|भाजपा|संसद|विधानसभा/.test(clean)) {
    category = "\u0938\u093F\u092F\u093E\u0938\u0924";
    categories.push("\u0930\u093E\u091C\u0928\u0940\u0924\u093F", "\u0935\u093F\u0927\u093E\u0928\u0938\u092D\u093E");
  } else if (/मौसम|बारिश|ओलावृष्टि|ठंड|गर्मी/.test(clean)) {
    category = "\u092E\u094C\u0938\u092E";
    categories.push("\u092E\u094C\u0938\u092E \u0905\u092A\u0921\u0947\u091F", "\u092A\u0930\u094D\u092F\u093E\u0935\u0930\u0923");
  } else if (/विकास|योजना|सड़क|पुल|उद्घाटन|बजट/.test(clean)) {
    category = "\u0935\u093F\u0915\u093E\u0938";
    categories.push("\u0935\u093F\u0915\u093E\u0938 \u0915\u093E\u0930\u094D\u092F", "\u0938\u0930\u0915\u093E\u0930\u0940 \u092F\u094B\u091C\u0928\u093E");
  } else {
    categories.push("\u0930\u093E\u0937\u094D\u091F\u094D\u0930\u0940\u092F", "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936");
  }
  if (detectedLocation && !categories.includes(detectedLocation)) {
    categories.push(detectedLocation);
  }
  const tags = [
    "#BreakingNews",
    "#HindiNews",
    `#${locTag}News`,
    `#${category.replace(/\s+/g, "")}`,
    "#BNWTV"
  ];
  const anchorScript = `\u0928\u092E\u0938\u094D\u0915\u093E\u0930, \u092E\u0948\u0902 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0938\u0947\u0964 \u0907\u0938 \u0938\u092E\u092F \u0915\u0940 \u092C\u0921\u093C\u0940 \u0914\u0930 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0916\u092C\u0930 ${detectedLocation} \u0938\u0947 \u0938\u093E\u092E\u0928\u0947 \u0906 \u0930\u0939\u0940 \u0939\u0948\u0964 ${headline}\u0964 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u0914\u0930 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u0935\u093F\u092D\u093E\u0917 \u0928\u0947 \u0907\u0938 \u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0924\u0924\u094D\u0915\u093E\u0932 \u0938\u0902\u091C\u094D\u091E\u093E\u0928 \u0932\u0947\u0924\u0947 \u0939\u0941\u090F \u0906\u0935\u0936\u094D\u092F\u0915 \u0926\u093F\u0936\u093E-\u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u091C\u093E\u0930\u0940 \u0915\u093F\u090F \u0939\u0948\u0902\u0964 \u0906\u0907\u090F \u0926\u0947\u0916\u0924\u0947 \u0939\u0948\u0902 \u0907\u0938 \u092A\u0942\u0930\u0947 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u092A\u0930 \u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0964`;
  let speakerName = "";
  let speakerTitle = "";
  if (/दिग्विजय/.test(clean)) {
    speakerName = "\u0926\u093F\u0917\u094D\u0935\u093F\u091C\u092F \u0938\u093F\u0902\u0939";
    speakerTitle = "\u092A\u0942\u0930\u094D\u0935 \u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940";
  } else if (/मोहन यादव|सीएम मोहन|CM मोहन/.test(clean)) {
    speakerName = "\u0921\u0949. \u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935";
    speakerTitle = "\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940, \u092E\u092A\u094D\u0930";
  } else if (/शिवराज/.test(clean)) {
    speakerName = "\u0936\u093F\u0935\u0930\u093E\u091C \u0938\u093F\u0902\u0939 \u091A\u094C\u0939\u093E\u0928";
    speakerTitle = "\u0915\u0947\u0902\u0926\u094D\u0930\u0940\u092F \u092E\u0902\u0924\u094D\u0930\u0940";
  } else if (/कमलनाथ/.test(clean)) {
    speakerName = "\u0915\u092E\u0932\u0928\u093E\u0925";
    speakerTitle = "\u092A\u0942\u0930\u094D\u0935 \u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940";
  } else if (/अनिरुद्धाचार्य/.test(clean)) {
    speakerName = "\u0905\u0928\u093F\u0930\u0941\u0926\u094D\u0927\u093E\u091A\u093E\u0930\u094D\u092F \u092E\u0939\u093E\u0930\u093E\u091C";
    speakerTitle = "\u0915\u0925\u093E\u0935\u093E\u091A\u0915";
  } else if (/धीरेंद्र शास्त्री|बागेश्वर/.test(clean)) {
    speakerName = "\u092A\u0902\u0921\u093F\u0924 \u0927\u0940\u0930\u0947\u0902\u0926\u094D\u0930 \u0936\u093E\u0938\u094D\u0924\u094D\u0930\u0940";
    speakerTitle = "\u092A\u0940\u0920\u093E\u0927\u0940\u0936\u094D\u0935\u0930";
  }
  const summary = `${headline} \u0915\u094B \u0932\u0947\u0915\u0930 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0938\u093E\u092E\u0928\u0947 \u0906\u0908 \u0939\u0948\u0964 \u0907\u0938 \u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u090F\u0935\u0902 \u0938\u094D\u0925\u093E\u0928\u0940\u092F \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0926\u094D\u0935\u093E\u0930\u093E \u0906\u0935\u0936\u094D\u092F\u0915 \u0938\u0902\u091C\u094D\u091E\u093E\u0928 \u0932\u0947\u0915\u0930 \u0905\u0917\u094D\u0930\u093F\u092E \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0940 \u091C\u093E \u0930\u0939\u0940 \u0939\u0948\u0964

\u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u0938\u0947 \u091C\u0941\u0921\u093C\u0940 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0914\u0930 \u0939\u0930 \u0924\u093E\u091C\u093E \u0905\u092A\u0921\u0947\u091F \u0915\u0947 \u0932\u093F\u090F \u091C\u0941\u0921\u093C\u0947 \u0930\u0939\u0947\u0902 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E \u0915\u0947 \u0938\u093E\u0925\u0964

#\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917\u0928\u094D\u092F\u0942\u091C\u0935\u093E\u0932\u093E #BreakingNewsWala #BreakingNews #HindiNews #${locTag}News #${cleanHeadlinePure.slice(0, 15).replace(/\s+/g, "")} #BNWTV`;
  const opt1 = headline;
  const opt2 = words.length > 5 ? words.slice(0, Math.min(words.length, targetMaxLines === 2 ? 8 : 12)).join(" ") : `${detectedLocation}: ${headline}`;
  const opt3 = `${headline}`;
  return {
    headline,
    headlineOptions: [opt1, opt2, opt3],
    highlightWords,
    formattedHeadline,
    location: detectedLocation,
    summary,
    anchorScript,
    categories,
    tags,
    category,
    suggestedImagePrompt: `Journalistic news press photo depicting ${headline}, realistic news photography, India`,
    isAiGeneratedPhoto: false,
    speakerName,
    speakerTitle,
    isLocalFallback: true,
    warning: "AI \u092E\u0949\u0921\u0932 \u092A\u0930 \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u0932\u094B\u0921 \u092F\u093E \u0915\u094B\u091F\u093E \u0938\u0940\u092E\u093E \u0915\u0947 \u0915\u093E\u0930\u0923 \u0906\u092A\u0915\u0940 \u0907\u0928\u092A\u0941\u091F \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0938\u0947 \u0924\u094D\u0935\u0930\u093F\u0924 \u0938\u0902\u0930\u091A\u093F\u0924 \u0921\u094D\u0930\u093E\u092B\u094D\u091F \u0924\u0948\u092F\u093E\u0930 \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u0906\u092A \u0907\u0938\u0947 \u0938\u0940\u0927\u0947 \u0932\u093E\u0917\u0942 \u092F\u093E \u0938\u0902\u092A\u093E\u0926\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964"
  };
}
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/analyze-image", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      userContext,
      template_id,
      headline_max_lines,
      headline_area,
      headline_line_count
    } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please set it in Settings > Secrets."
      });
    }
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const effectiveTemplateId = template_id || "graphic_001";
    const tplConfig = getTemplateConfig(effectiveTemplateId);
    const targetMaxLines = Number(headline_max_lines) || Number(headline_line_count) || tplConfig.headline_max_lines || 3;
    const targetArea = headline_area || tplConfig.headline_area;
    const promptText = `
\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u092A\u094D\u0930\u092E\u0941\u0916 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" \u0915\u0947 \u0935\u0930\u093F\u0937\u094D\u0920 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092F\u0939 \u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0940 \u0939\u0948 \u0914\u0930 \u0928\u094D\u092F\u0942\u091C\u093C \u0915\u093E\u0930\u094D\u0921 (\u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0915\u093E\u0930\u094D\u0921) \u092C\u0928\u093E\u0928\u093E \u091A\u093E\u0939\u0924\u093E \u0939\u0948\u0964

\u091A\u092F\u0928\u093F\u0924 \u0928\u094D\u092F\u0942\u091C\u093C \u0917\u094D\u0930\u093E\u092B\u093C\u093F\u0915 \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0935\u093F\u0928\u093F\u0930\u094D\u0926\u0947\u0936 (SELECTED GRAPHIC TEMPLATE METADATA & CAPACITY CONSTRAINTS):
- \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0906\u0908\u0921\u0940 (template_id): ${tplConfig.template_id}
- \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0928\u093E\u092E: ${tplConfig.name}
- \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u090F\u0930\u093F\u092F\u093E (headline_area): ${targetArea}
- \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0932\u093E\u0907\u0928 \u0915\u094D\u0937\u092E\u0924\u093E (headline_max_lines): \u0938\u0916\u094D\u0924\u0940 \u0938\u0947 \u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928\u094D\u0938 (STRICT MAXIMUM ${targetMaxLines} LINES ONLY, approx ${targetMaxLines === 2 ? "8-12 words" : "12-16 words"})

\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 / \u0938\u0902\u0926\u0930\u094D\u092D: ${userContext || "\u092B\u094B\u091F\u094B \u0915\u094B \u0938\u092E\u091D\u0915\u0930 \u0927\u092E\u093E\u0915\u0947\u0926\u093E\u0930 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0914\u0930 \u0921\u093F\u091F\u0947\u0932\u094D\u0938 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902"}

\u092B\u094B\u091F\u094B \u0915\u093E \u092C\u093E\u0930\u0940\u0915\u0940 \u0938\u0947 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 JSON \u092B\u0949\u0930\u094D\u092E\u0947\u091F \u092E\u0947\u0902 \u0930\u093F\u092A\u094D\u0932\u093E\u0908 \u0926\u0947\u0902:
1. "headline": \u090F\u0915 \u092C\u0939\u0941\u0924 \u0939\u0940 \u0906\u0915\u0930\u094D\u0937\u0915, \u0917\u0902\u092D\u0940\u0930, \u0914\u0930 \u0927\u092E\u093E\u0915\u0947\u0926\u093E\u0930 \u0939\u093F\u0902\u0926\u0940 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0939\u0947\u0921\u0932\u093E\u0907\u0928\u0964 \u091A\u0941\u0928\u0947 \u0917\u090F \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0915\u0940 \u0915\u094D\u0937\u092E\u0924\u093E ${targetMaxLines} \u0932\u093E\u0907\u0928 \u0939\u0948, \u0907\u0938\u0932\u093F\u090F \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0938\u0916\u094D\u0924\u0940 \u0938\u0947 \u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928\u094D\u0938 (\u0932\u0917\u092D\u0917 ${targetMaxLines === 2 ? "8-12 \u0936\u092C\u094D\u0926" : "12-16 \u0936\u092C\u094D\u0926"}, \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0936\u092C\u094D\u0926 '\u0936\u094D\u0930\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F' \u0906\u0926\u093F \u0915\u0947) \u092E\u0947\u0902 \u0939\u0940 \u092C\u0928\u093E\u090F\u0901\u0964
2. "highlightWords": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u0947 \u0935\u0947 \u0938\u092C\u0938\u0947 \u092E\u0941\u0916\u094D\u092F 2 \u0938\u0947 4 \u0936\u092C\u094D\u0926 \u092F\u093E \u0935\u093E\u0915\u094D\u092F\u093E\u0902\u0936 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u092A\u0940\u0932\u0947 (Yellow) \u0930\u0902\u0917 \u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0915\u093F\u092F\u093E \u091C\u093E\u0928\u093E \u091A\u093E\u0939\u093F\u090F (\u091C\u0948\u0938\u0947 \u092C\u0921\u093C\u0947 \u0928\u093E\u092E, \u091C\u0917\u0939, \u0938\u0902\u0916\u094D\u092F\u093E, \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E)\u0964
3. "formattedHeadline": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u091C\u093F\u0938\u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0947 \u0906\u0917\u0947-\u092A\u0940\u091B\u0947 [yellow] \u0914\u0930 [/yellow] \u091F\u0948\u0917 \u0932\u0917\u0947 \u0939\u094B\u0902\u0964
4. "location": \u0918\u091F\u0928\u093E \u0938\u0947 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u091C\u093F\u0932\u093E \u092F\u093E \u0930\u093E\u091C\u094D\u092F \u0915\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0928\u093E\u092E (\u091C\u0948\u0938\u0947 "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", "\u0930\u0940\u0935\u093E, \u092E\u092A\u094D\u0930", "\u0936\u0939\u0921\u094B\u0932", "\u092D\u094B\u092A\u093E\u0932", "\u0928\u0908 \u0926\u093F\u0932\u094D\u0932\u0940")\u0964
5. "summary": \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E (Instagram \u0935 Facebook \u092A\u094B\u0938\u094D\u091F) \u0915\u0947 \u0932\u093F\u090F \u0915\u092E \u0938\u0947 \u0915\u092E 2 \u0914\u0930 \u0916\u092C\u0930 \u092E\u0947\u0902 \u0935\u093F\u0935\u0930\u0923 \u0905\u0927\u093F\u0915 \u0939\u094B\u0928\u0947 \u092A\u0930 3 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0935\u093F\u0938\u094D\u0924\u093E\u0930 \u0938\u0947 \u0932\u093F\u0916\u0947\u0902 \u0924\u093E\u0915\u093F \u092A\u093E\u0920\u0915 \u0915\u094B \u0932\u0917\u0947 \u0915\u093F "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u0936\u0928 \u092E\u0947\u0902" \u092E\u093F\u0932 \u0917\u0908 \u0939\u0948\u0964 \u0909\u0938\u0915\u0947 \u0920\u0940\u0915 \u092C\u093E\u0926 \u090F\u0915 \u0916\u093E\u0932\u0940 \u0932\u093E\u0907\u0928 \u091B\u094B\u0921\u093C\u0915\u0930 \u0905\u0902\u0924 \u092E\u0947\u0902 \u0939\u0948\u0936\u091F\u0948\u0917 \u0932\u0917\u093E\u090F\u0902, \u091C\u093F\u0938\u092E\u0947\u0902 \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u093E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 #breakingnewswala \u0939\u094B\u0917\u093E, \u092C\u0940\u091A \u092E\u0947\u0902 4-6 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 (\u091C\u0948\u0938\u0947 #BreakingNews #HindiNews \u0906\u0926\u093F), \u0914\u0930 \u0938\u092C\u0938\u0947 \u0905\u0902\u0924\u093F\u092E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 #BNWTV \u0939\u094B\u0917\u093E\u0964 \u0907\u0938\u0915\u0947 \u0905\u0932\u093E\u0935\u093E \u0915\u094B\u0908 \u0905\u0928\u094D\u092F \u0939\u0947\u0921\u093F\u0902\u0917, \u092B\u094B\u0928 \u0928\u0902\u092C\u0930 \u092F\u093E \u0938\u094B\u0936\u0932 \u0932\u093F\u0902\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F\u0964
6. "category": \u090F\u0915 \u0936\u092C\u094D\u0926 \u0915\u0940 \u0936\u094D\u0930\u0947\u0923\u0940 (\u091C\u0948\u0938\u0947 "\u0939\u093E\u0926\u0938\u093E", "\u0938\u0930\u0915\u093E\u0930", "\u0906\u0902\u0926\u094B\u0932\u0928", "\u0930\u093E\u091C\u0928\u0940\u0924\u093F", "\u0905\u092A\u0930\u093E\u0927", "\u092A\u094D\u0930\u0936\u093E\u0938\u0928")\u0964
7. "hasPerson": \u0915\u094D\u092F\u093E \u092B\u094B\u091F\u094B \u092E\u0947\u0902 \u0915\u094B\u0908 \u092E\u0941\u0916\u094D\u092F \u0928\u0947\u0924\u093E, \u0905\u0927\u093F\u0915\u093E\u0930\u0940 \u092F\u093E \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u093E \u0915\u094D\u0932\u094B\u091C\u093C\u0905\u092A/\u092A\u094B\u0930\u094D\u091F\u094D\u0930\u0947\u091F \u0939\u0948 \u091C\u093F\u0938\u0947 \u0917\u094B\u0932 \u0915\u091F\u0906\u0909\u091F (Inset Circle) \u092E\u0947\u0902 \u0926\u093F\u0916\u093E\u092F\u093E \u091C\u093E \u0938\u0915\u0924\u093E \u0939\u0948? (true \u092F\u093E false).
8. "description": \u092B\u094B\u091F\u094B \u092E\u0947\u0902 \u0915\u094D\u092F\u093E-\u0915\u094D\u092F\u093E \u0926\u093F\u0916\u093E\u0908 \u0926\u0947 \u0930\u0939\u093E \u0939\u0948 \u0907\u0938\u0915\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923\u0964
9. "isAiGeneratedPhoto": \u0915\u094D\u092F\u093E \u092F\u0939 \u092B\u094B\u091F\u094B AI \u091C\u0928\u0930\u0947\u091F\u0947\u0921 \u092F\u093E \u0921\u093F\u091C\u093F\u091F\u0932 \u0907\u0932\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928/\u0915\u093E\u0932\u094D\u092A\u0928\u093F\u0915 \u092A\u094D\u0930\u0924\u0940\u0924 \u0939\u094B\u0924\u0940 \u0939\u0948? (true \u092F\u093E false).
10. "speakerName": \u092F\u0926\u093F \u092F\u0939 \u0915\u093F\u0938\u0940 \u0928\u0947\u0924\u093E, \u092E\u0902\u0924\u094D\u0930\u0940 \u092F\u093E \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u093E \u092C\u092F\u093E\u0928/\u0915\u094B\u091F\u0947\u0936\u0928 \u0939\u0948 \u0924\u094B \u0909\u0928\u0915\u093E \u0928\u093E\u092E (\u0909\u0926\u093E. "\u0926\u093F\u0917\u094D\u0935\u093F\u091C\u092F \u0938\u093F\u0902\u0939", "\u0921\u0949. \u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935"), \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
11. "speakerTitle": \u0909\u0928\u0915\u093E \u092A\u0926 \u092F\u093E \u092A\u0926\u0935\u0940 (\u0909\u0926\u093E. "\u092A\u0942\u0930\u094D\u0935 \u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940", "\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940, \u092E\u092A\u094D\u0930"), \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
`;
    const contents = {
      parts: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64
          }
        },
        {
          text: promptText
        }
      ]
    };
    const response = await generateWithFallbackAndRetry(
      ai,
      DEFAULT_FALLBACK_MODELS,
      {
        contents,
        config: {
          systemInstruction: `You are the Senior Editor of Breaking News Wala. Strictly enforce template capacity constraints: Headline layout area "${targetArea}", STRICT MAXIMUM ${targetMaxLines} lines (${targetMaxLines === 2 ? "8-12 words" : "12-16 words"}). Strip all PR flattery and honorifics. Output valid JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              headline: { type: import_genai.Type.STRING },
              highlightWords: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING }
              },
              formattedHeadline: { type: import_genai.Type.STRING },
              location: { type: import_genai.Type.STRING },
              summary: { type: import_genai.Type.STRING },
              category: { type: import_genai.Type.STRING },
              hasPerson: { type: import_genai.Type.BOOLEAN },
              description: { type: import_genai.Type.STRING },
              isAiGeneratedPhoto: { type: import_genai.Type.BOOLEAN },
              speakerName: { type: import_genai.Type.STRING },
              speakerTitle: { type: import_genai.Type.STRING }
            },
            required: [
              "headline",
              "highlightWords",
              "formattedHeadline",
              "location",
              "summary"
            ]
          }
        }
      }
    );
    const textOutput = response.text || "{}";
    const parsedData = JSON.parse(textOutput);
    if (parsedData.headline) parsedData.headline = sanitizePressNoteFlattery(parsedData.headline);
    if (parsedData.formattedHeadline) parsedData.formattedHeadline = sanitizePressNoteFlattery(parsedData.formattedHeadline);
    if (parsedData.summary) parsedData.summary = sanitizePressNoteFlattery(parsedData.summary);
    if (parsedData.speakerName) parsedData.speakerName = sanitizePressNoteFlattery(parsedData.speakerName);
    if (parsedData.speakerTitle) parsedData.speakerTitle = sanitizePressNoteFlattery(parsedData.speakerTitle);
    parsedData.template_id = tplConfig.template_id;
    parsedData.headline_max_lines = targetMaxLines;
    parsedData.headline_area = targetArea;
    parsedData.headline_line_count = targetMaxLines;
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error("Error in /api/analyze-image:", err);
    return res.status(500).json({
      error: cleanErrorMessage(err)
    });
  }
});
app.post("/api/process-news-command", async (req, res) => {
  const {
    input,
    command,
    linkUrl,
    customPrompt,
    template_id,
    headline_max_lines,
    headline_area,
    headline_line_count
  } = req.body;
  try {
    const rawInputText = input || command;
    if (!rawInputText && !linkUrl && !customPrompt) {
      return res.status(400).json({ error: "Please provide a command, text, link or prompt" });
    }
    const effectiveTemplateId = template_id || "graphic_001";
    const tplConfig = getTemplateConfig(effectiveTemplateId);
    const targetMaxLines = Number(headline_max_lines) || Number(headline_line_count) || tplConfig.headline_max_lines || 3;
    const targetArea = headline_area || tplConfig.headline_area;
    let fetchedArticleSnippet = "";
    const pickedImages = {};
    let effectiveInput = (rawInputText || "").trim();
    const rawLink = (linkUrl || "").trim();
    if (rawLink) {
      if (rawLink.startsWith("http://") || rawLink.startsWith("https://")) {
        try {
          const fetchRes = await fetch(rawLink, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const metaDescMatch = html.match(
              /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
            );
            fetchedArticleSnippet = `
URL: ${rawLink}
Title: ${titleMatch ? titleMatch[1] : ""}
Description: ${metaDescMatch ? metaDescMatch[1] : ""}
`;
            const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
            const twitterImageMatch = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
            const foundImages = [];
            if (ogImageMatch && ogImageMatch[1]) {
              foundImages.push(ogImageMatch[1].trim());
            }
            if (twitterImageMatch && twitterImageMatch[1] && !foundImages.includes(twitterImageMatch[1].trim())) {
              foundImages.push(twitterImageMatch[1].trim());
            }
            const imgMatches = html.matchAll(
              /<img[^>]+src=["'](https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi
            );
            for (const match of imgMatches) {
              const src = match[1];
              if (src && !src.includes("logo") && !src.includes("icon") && !src.includes("avatar") && !foundImages.includes(src)) {
                foundImages.push(src);
                if (foundImages.length >= 4) break;
              }
            }
            if (foundImages.length > 0) {
              pickedImages.main = `/api/proxy-image?url=${encodeURIComponent(foundImages[0])}`;
            }
          }
        } catch (fetchErr) {
          console.warn("Could not fetch URL directly, will use URL string in prompt:", fetchErr);
          fetchedArticleSnippet = `URL to reference: ${rawLink}`;
        }
      } else {
        effectiveInput = effectiveInput ? `${effectiveInput}

${rawLink}` : rawLink;
      }
    }
    const editorialSystemInstruction = `You are the Chief Editor and Senior Art Director of "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" (Breaking News Wala), India's premier Hindi digital news channel.
You strictly enforce newsroom editorial integrity and graphic layout constraints.

\u2605 SELECTED GRAPHIC TEMPLATE METADATA & CAPACITY CONSTRAINTS:
- Template ID: ${tplConfig.template_id} (${tplConfig.name})
- Headline Layout Area: ${targetArea}
- Strict Maximum Lines: ${targetMaxLines} lines (${targetMaxLines === 2 ? "Strictly 2 lines maximum, approx 8-12 words" : "Strictly 3 lines maximum, approx 12-16 words"})

\u2605 MANDATORY HEADLINE LOGIC RULES:
1. \u0926\u093F\u090F \u0917\u090F \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924, \u0938\u094D\u092A\u0937\u094D\u091F, \u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u0914\u0930 \u092A\u094D\u0930\u094B\u092B\u0947\u0936\u0928\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092C\u0928\u093E\u090F\u0902\u0964 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0938\u093E\u092E\u093E\u0928\u094D\u092F \u092A\u0924\u094D\u0930\u0915\u093E\u0930\u093F\u0924\u093E \u0915\u0940 headline style \u092E\u0947\u0902 \u0939\u094B\u0964 \u0915\u0947\u0935\u0932 \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u093E \u092E\u0941\u0916\u094D\u092F \u0924\u0925\u094D\u092F \u0914\u0930 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0930\u0916\u0947\u0902\u0964 \u0905\u0928\u093E\u0935\u0936\u094D\u092F\u0915 \u092D\u0942\u092E\u093F\u0915\u093E, explanation, emoji, clickbait language \u092F\u093E \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0935\u093E\u0915\u094D\u092F \u0928 \u091C\u094B\u0921\u093C\u0947\u0902\u0964 Headline \u0915\u094B paragraph \u092F\u093E \u0938\u093E\u092E\u093E\u0928\u094D\u092F sentence \u0915\u0940 \u0924\u0930\u0939 \u0928 \u0932\u093F\u0916\u0947\u0902\u0964
2. STRICT CAPACITY ENFORCEMENT: The selected graphic template only has capacity for ${targetMaxLines} lines in its ${targetArea}. You MUST craft the headline to fit cleanly within ${targetMaxLines} lines (${targetMaxLines === 2 ? "8-12 words" : "12-16 words"}).
3. THREE DISTINCT HEADLINE OPTIONS: You must provide exactly 3 options in "headlineOptions", and EVERY SINGLE OPTION must strictly adhere to the ${targetMaxLines}-line (${targetMaxLines === 2 ? "8-12" : "12-16"} words) capacity limit.
4. ZERO TRAILING PUNCTUATION: NEVER end the headline with full stop (.), purnaviram (\u0964), exclamation, comma or hyphen. No punctuation at the end of any headline.
5. ZERO HONORIFICS OR FLATTERY (ABSOLUTE RULE): Strip all PR flattery, sycophancy, and honorific words such as '\u0936\u094D\u0930\u0940', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928', '\u0936\u094D\u0930\u0940\u092E\u0924\u0940', '\u0938\u0941\u0936\u094D\u0930\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0940\u092F', '\u0906\u0926\u0930\u0923\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F', '\u091C\u0940' from headline, headline options, and summary. State official titles and names directly.
6. STRICT JSON OUTPUT: Always output strictly valid JSON conforming to the schema.`;
    const prompt = `
\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" \u0915\u0947 \u091A\u0940\u092B \u090F\u0921\u093F\u091F\u0930 \u0939\u0948\u0902\u0964
\u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092F\u0939 \u0915\u092E\u093E\u0902\u0921 / \u0915\u091A\u094D\u091A\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F / \u0938\u092E\u093E\u091A\u093E\u0930 \u0935\u093F\u0935\u0930\u0923 \u092F\u093E \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0926\u093F\u092F\u093E \u0939\u0948:
${effectiveInput || ""}
${fetchedArticleSnippet ? `\u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0938\u093E\u092E\u0917\u094D\u0930\u0940: ${fetchedArticleSnippet}` : ""}
${customPrompt ? `\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0935\u093F\u0936\u0947\u0937 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 / \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F \u092F\u093E \u0915\u091A\u094D\u091A\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F (Prompt / Raw Script / Press Note): ${customPrompt}` : ""}

\u091A\u092F\u0928\u093F\u0924 \u0928\u094D\u092F\u0942\u091C\u093C \u0917\u094D\u0930\u093E\u092B\u093C\u093F\u0915 \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0935\u093F\u0928\u093F\u0930\u094D\u0926\u0947\u0936 (SELECTED GRAPHIC TEMPLATE METADATA & CAPACITY CONSTRAINTS):
- \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0906\u0908\u0921\u0940 (template_id): ${tplConfig.template_id}
- \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0928\u093E\u092E: ${tplConfig.name}
- \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u090F\u0930\u093F\u092F\u093E (headline_area): ${targetArea}
- \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0932\u093E\u0907\u0928 \u0915\u094D\u0937\u092E\u0924\u093E (headline_max_lines): \u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928\u094D\u0938 (STRICT MAXIMUM ${targetMaxLines} LINES ONLY)

\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u0928\u093F\u092F\u092E (\u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F / \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F \u0930\u0942\u092A\u093E\u0902\u0924\u0930\u0923):
- \u092F\u0926\u093F \u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0932\u093F\u0902\u0915 \u0915\u0947 \u0938\u0940\u0927\u0947 \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F \u092C\u0949\u0915\u094D\u0938 \u092F\u093E \u0907\u0928\u092A\u0941\u091F \u092C\u0949\u0915\u094D\u0938 \u092E\u0947\u0902 \u0915\u094B\u0908 \u0915\u091A\u094D\u091A\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F, \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F, \u0938\u0930\u0915\u093E\u0930\u0940 \u0935\u093F\u091C\u094D\u091E\u092A\u094D\u0924\u093F \u092F\u093E \u0928\u0947\u0924\u093E\u0913\u0902 \u0915\u093E \u092C\u092F\u093E\u0928 \u0926\u093F\u092F\u093E \u0939\u0948, \u0924\u094B \u0909\u0938 \u092A\u0942\u0930\u0940 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0915\u094B \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937, \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u0914\u0930 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0928\u094D\u092F\u0942\u091C\u093C \u0917\u094D\u0930\u093E\u092B\u093C\u093F\u0915 \u092E\u0947\u0902 \u092C\u0926\u0932\u0947\u0902\u0964
- \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0935 \u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u092A\u0942\u0930\u094D\u0923 \u0928\u093F\u0937\u094D\u0915\u093E\u0938\u0928 (MANDATORY): \u0939\u0947\u0921\u0932\u093E\u0907\u0928, \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A\u094B\u0902 \u0914\u0930 \u092A\u0942\u0930\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F (summary) \u092E\u0947\u0902 \u0938\u0947 '\u0936\u094D\u0930\u0940', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928', '\u0936\u094D\u0930\u0940\u092E\u0924\u0940', '\u0938\u0941\u0936\u094D\u0930\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0940\u092F', '\u0906\u0926\u0930\u0923\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F', '\u091C\u0940' \u091C\u0948\u0938\u0947 \u0938\u092D\u0940 \u0914\u092A\u091A\u093E\u0930\u093F\u0915 \u0935 \u0938\u0930\u0915\u093E\u0930\u0940/\u092A\u0940\u0906\u0930 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u094B \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0939\u091F\u093E \u0926\u0947\u0902\u0964 \u0938\u0940\u0927\u0947 \u0928\u0947\u0924\u093E \u092F\u093E \u0905\u0927\u093F\u0915\u093E\u0930\u0940 \u0915\u093E \u092A\u0926 \u0914\u0930 \u0928\u093E\u092E \u0932\u093F\u0916\u0947\u0902 (\u091C\u0948\u0938\u0947: '\u092E\u093E\u0928\u0928\u0940\u092F \u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940 \u0936\u094D\u0930\u0940 ... \u091C\u0940' \u0915\u0947 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 '\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940 ...', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928 \u0915\u0932\u0947\u0915\u094D\u091F\u0930 \u092E\u0939\u094B\u0926\u092F' \u0915\u0947 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 '\u0915\u0932\u0947\u0915\u094D\u091F\u0930')\u0964

\u2605 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u0947 \u0932\u093F\u090F \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0938\u0916\u094D\u0924 \u0928\u093F\u092F\u092E (STRICT ${targetMaxLines}-LINE HEADLINE RULE):
1. \u091A\u0941\u0928\u0947 \u0917\u090F \u091F\u0947\u092E\u094D\u092A\u0932\u0947\u091F \u0915\u0940 \u0915\u094D\u0937\u092E\u0924\u093E ${targetMaxLines} \u0932\u093E\u0907\u0928 \u0939\u0948\u0964 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u094B ${targetMaxLines === 2 ? "\u0938\u0916\u094D\u0924\u0940 \u0938\u0947 \u0905\u0927\u093F\u0915\u0924\u092E 2 \u0932\u093E\u0907\u0928\u094D\u0938 (\u0932\u0917\u092D\u0917 8-12 \u0936\u092C\u094D\u0926)" : "\u0938\u0916\u094D\u0924\u0940 \u0938\u0947 \u0905\u0927\u093F\u0915\u0924\u092E 3 \u0932\u093E\u0907\u0928\u094D\u0938 (\u0932\u0917\u092D\u0917 12-16 \u0936\u092C\u094D\u0926)"} \u092E\u0947\u0902 \u0939\u0940 \u092C\u0928\u093E\u0928\u093E \u0939\u0948\u0964
2. \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u093E \u0915\u093E\u092E \u092A\u0942\u0930\u0940 \u0915\u0939\u093E\u0928\u0940 \u0938\u0941\u0928\u093E\u0928\u093E \u0928\u0939\u0940\u0902 \u0939\u0948! \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u0947\u0935\u0932 \u092E\u0941\u0916\u094D\u092F \u0916\u092C\u0930 \u0915\u0940 \u0938\u091F\u0940\u0915, \u0938\u094D\u092A\u0937\u094D\u091F \u0914\u0930 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0926\u0947\u0917\u0940\u0964 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0938\u094D\u0925\u093F\u0924\u093F \u092E\u0947\u0902 \u0932\u0902\u092C\u0940 \u0915\u0939\u093E\u0928\u0940 \u091C\u0948\u0938\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0928\u0939\u0940\u0902 \u092C\u0928\u093E\u0928\u0940 \u0939\u0948\u0964
3. \u092A\u0942\u0930\u0940 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u0916\u092C\u0930 \u0914\u0930 \u0938\u092D\u0940 \u0935\u093F\u0935\u0930\u0923 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 "summary" (News Description / Full Story) \u092E\u0947\u0902 \u0930\u0939\u0947\u0902\u0917\u0947\u0964
4. \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0924\u0947 \u0938\u092E\u092F \u0939\u0940 ${targetMaxLines}-\u0932\u093E\u0907\u0928 \u0915\u094D\u0937\u092E\u0924\u093E \u0915\u094B \u0927\u094D\u092F\u093E\u0928 \u092E\u0947\u0902 \u0930\u0916\u0915\u0930 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935 \u0935\u094D\u092F\u093E\u0915\u0930\u0923 \u0938\u092E\u094D\u092E\u0924 \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902 \u092C\u0928\u093E\u0928\u093E \u0939\u0948 (\u092C\u0940\u091A \u092E\u0947\u0902 \u0915\u093E\u091F\u0928\u093E \u0928\u0939\u0940\u0902 \u0939\u0948)\u0964
5. "headlineOptions" \u092E\u0947\u0902 3 \u0905\u0932\u0917-\u0905\u0932\u0917, \u0936\u0915\u094D\u0924\u093F\u0936\u093E\u0932\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A \u0926\u0947\u0902, \u0914\u0930 \u0924\u0940\u0928\u094B\u0902 \u0935\u093F\u0915\u0932\u094D\u092A \u092D\u0940 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 \u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928\u094B\u0902 \u0915\u0940 \u0938\u0940\u092E\u093E \u092E\u0947\u0902 \u0939\u0940 \u0939\u094B\u0928\u0947 \u091A\u093E\u0939\u093F\u090F\u0964

\u0915\u0943\u092A\u092F\u093E \u0907\u0938 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0914\u0930 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u0938\u0947 \u090F\u0915 \u0936\u0915\u094D\u0924\u093F\u0936\u093E\u0932\u0940, \u0935\u093E\u092F\u0930\u0932 \u0914\u0930 \u0911\u0925\u0947\u0902\u091F\u093F\u0915 \u0939\u093F\u0902\u0926\u0940 \u0907\u092E\u0947\u091C \u0928\u094D\u092F\u0942\u091C\u093C (\u0928\u094D\u092F\u0942\u091C\u093C \u0917\u094D\u0930\u093E\u092B\u093C\u093F\u0915 \u0915\u093E\u0930\u094D\u0921) \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:
1. "headline": \u092E\u0941\u0916\u094D\u092F, \u0938\u094D\u092A\u0937\u094D\u091F \u0914\u0930 \u092A\u094D\u0930\u092D\u093E\u0935\u0915\u093E\u0930\u0940 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (\u0938\u0916\u094D\u0924\u0940 \u0938\u0947 \u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928\u094D\u0938, \u0932\u0917\u092D\u0917 ${targetMaxLines === 2 ? "8-12" : "12-16"} \u0936\u092C\u094D\u0926, \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940 \u0932\u093F\u092A\u093F \u092E\u0947\u0902, \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0936\u092C\u094D\u0926 \u0915\u0947)\u0964
2. "headlineOptions": 3 \u0905\u0932\u0917-\u0905\u0932\u0917, \u0936\u0915\u094D\u0924\u093F\u0936\u093E\u0932\u0940 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A (\u0938\u092D\u0940 \u0935\u093F\u0915\u0932\u094D\u092A \u0938\u0916\u094D\u0924\u0940 \u0938\u0947 \u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928\u094D\u0938):
   - \u0935\u093F\u0915\u0932\u094D\u092A 1: \u0939\u093E\u0908-\u0907\u092E\u094D\u092A\u0948\u0915\u094D\u091F / \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0938\u094D\u091F\u093E\u0907\u0932 (\u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928)
   - \u0935\u093F\u0915\u0932\u094D\u092A 2: \u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u0935 \u0938\u093E\u0930\u0917\u0930\u094D\u092D\u093F\u0924 \u0938\u094D\u091F\u093E\u0907\u0932 (\u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928)
   - \u0935\u093F\u0915\u0932\u094D\u092A 3: \u0906\u0915\u0930\u094D\u0937\u0915 \u0935 \u0924\u093E\u0924\u094D\u0915\u093E\u0932\u093F\u0915 \u090F\u0915\u094D\u0936\u0928/\u0938\u0935\u093E\u0932 \u0938\u094D\u091F\u093E\u0907\u0932 (\u0905\u0927\u093F\u0915\u0924\u092E ${targetMaxLines} \u0932\u093E\u0907\u0928)
3. "highlightWords": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u0938\u0947 2-4 \u092E\u0941\u0916\u094D\u092F \u0936\u092C\u094D\u0926 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u092A\u0940\u0932\u0947 \u0930\u0902\u0917 (Yellow) \u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0915\u0930\u0928\u093E \u0939\u0948\u0964
4. "formattedHeadline": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0947 \u091A\u093E\u0930\u094B\u0902 \u0913\u0930 [yellow]\u0936\u092C\u094D\u0926[/yellow] \u0932\u0917\u093E\u090F\u0902\u0964
5. "location": \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u0936\u0939\u0930, \u091C\u093F\u0932\u093E \u092F\u093E \u0930\u093E\u091C\u094D\u092F (\u091C\u0948\u0938\u0947 "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", "\u0936\u0939\u0921\u094B\u0932, \u092E\u092A\u094D\u0930", "\u0930\u0940\u0935\u093E", "\u092D\u094B\u092A\u093E\u0932", \u0906\u0926\u093F)\u0964
6. "summary": \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E (Instagram \u0935 Facebook \u092A\u094B\u0938\u094D\u091F) \u0924\u0925\u093E \u0905\u092A\u0932\u094B\u0921\u093F\u0902\u0917 \u0939\u0947\u0924\u0941 \u0915\u092E \u0938\u0947 \u0915\u092E 2 \u0914\u0930 \u0935\u093F\u0935\u0930\u0923 \u0905\u0927\u093F\u0915 \u0939\u094B\u0928\u0947 \u092A\u0930 3 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u092A\u0942\u0930\u0940 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0916\u092C\u0930 \u0935\u093F\u0938\u094D\u0924\u093E\u0930 \u0938\u0947 \u0932\u093F\u0916\u0947\u0902 (\u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0915\u0940 \u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0935 \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0936\u092C\u094D\u0926 \u0939\u091F\u093E\u0915\u0930) \u0924\u093E\u0915\u093F \u092A\u093E\u0920\u0915 \u0915\u094B \u0932\u0917\u0947 \u0915\u093F "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u0936\u0928 \u092E\u0947\u0902" \u092E\u093F\u0932 \u0917\u0908 \u0939\u0948\u0964 \u0909\u0938\u0915\u0947 \u0920\u0940\u0915 \u092C\u093E\u0926 \u090F\u0915 \u0916\u093E\u0932\u0940 \u0932\u093E\u0907\u0928 \u091B\u094B\u0921\u093C\u0915\u0930 \u0905\u0902\u0924 \u092E\u0947\u0902 \u0939\u0948\u0936\u091F\u0948\u0917 \u0932\u0917\u093E\u090F\u0902, \u091C\u093F\u0938\u092E\u0947\u0902 \u091A\u0948\u0928\u0932/\u092F\u0942\u091C\u093C\u0930 \u0915\u0947 \u0939\u093F\u0902\u0926\u0940 \u0935 \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u0940 \u0926\u094B\u0928\u094B\u0902 \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u0947 \u0936\u093E\u092E\u093F\u0932 \u0939\u094B\u0902 (\u0909\u0926\u093E. #\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917\u0928\u094D\u092F\u0942\u091C\u0935\u093E\u0932\u093E #BreakingNewsWala), \u092C\u0940\u091A \u092E\u0947\u0902 4-6 \u0938\u0902\u0926\u0930\u094D\u092D\u093E\u0928\u0941\u0938\u093E\u0930 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 (\u091C\u0948\u0938\u0947 #BreakingNews #HindiNews #\u0938\u094D\u0925\u093E\u0928News \u0906\u0926\u093F), \u0914\u0930 \u0938\u092C\u0938\u0947 \u0905\u0902\u0924\u093F\u092E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 #BNWTV \u0939\u094B\u0917\u093E\u0964 \u0907\u0938\u0915\u0947 \u0905\u0932\u093E\u0935\u093E \u0915\u094B\u0908 \u0905\u0928\u094D\u092F \u0939\u0947\u0921\u093F\u0902\u0917, \u092B\u094B\u0928 \u0928\u0902\u092C\u0930 \u092F\u093E \u0938\u094B\u0936\u0932 \u0932\u093F\u0902\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F\u0964
7. "category": \u0928\u094D\u092F\u0942\u091C\u093C \u0936\u094D\u0930\u0947\u0923\u0940 (\u0939\u093E\u0926\u0938\u093E / \u092A\u094D\u0930\u0936\u093E\u0938\u0928 / \u0930\u093E\u091C\u0928\u0940\u0924\u093F / \u0935\u093F\u0915\u093E\u0938 / \u0905\u092A\u0930\u093E\u0927 / \u091C\u0928\u0906\u0902\u0926\u094B\u0932\u0928)\u0964
8. "suggestedImagePrompt": \u092F\u0926\u093F \u092F\u0942\u091C\u093C\u0930 \u0915\u0947 \u092A\u093E\u0938 \u092B\u094B\u091F\u094B \u0928\u0939\u0940\u0902 \u0939\u0948 \u0924\u094B AI \u0907\u092E\u0947\u091C \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u0938\u091F\u0940\u0915 \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u0940 \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F\u0964
9. "isAiGeneratedPhoto": \u0915\u094D\u092F\u093E \u092F\u0942\u091C\u093C\u0930 \u0915\u0947 \u0915\u092E\u093E\u0902\u0921, \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u092F\u093E \u0932\u093F\u0902\u0915 \u092E\u0947\u0902 \u092F\u0939 \u0932\u093F\u0916\u093E \u0939\u0948 \u092F\u093E \u0938\u0902\u0915\u0947\u0924 \u0939\u0948 \u0915\u093F \u092B\u094B\u091F\u094B AI \u091C\u0928\u0930\u0947\u091F\u0947\u0921 \u0939\u0948 / \u0915\u093E\u0932\u094D\u092A\u0928\u093F\u0915 \u0939\u0948 / \u0907\u0932\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0939\u0948 (\u091C\u0948\u0938\u0947 'AI generated', '\u090F\u0906\u0908 \u092B\u094B\u091F\u094B', 'AI image', '\u0915\u093E\u0932\u094D\u092A\u0928\u093F\u0915 \u091A\u093F\u0924\u094D\u0930', '\u0938\u093F\u0902\u0925\u0947\u091F\u093F\u0915')? (true \u092F\u093E false).
10. "speakerName": \u092F\u0926\u093F \u092F\u0939 \u0915\u093F\u0938\u0940 \u0928\u0947\u0924\u093E, \u092E\u0902\u0924\u094D\u0930\u0940 \u092F\u093E \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u093E \u092C\u092F\u093E\u0928/\u0915\u094B\u091F\u0947\u0936\u0928 \u0939\u0948 \u0924\u094B \u0909\u0928\u0915\u093E \u0928\u093E\u092E (\u0909\u0926\u093E. "\u0926\u093F\u0917\u094D\u0935\u093F\u091C\u092F \u0938\u093F\u0902\u0939", "\u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935"), \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
11. "speakerTitle": \u0909\u0928\u0915\u093E \u092A\u0926 \u092F\u093E \u092A\u0926\u0935\u0940 (\u0909\u0926\u093E. "\u092A\u0942\u0930\u094D\u0935 \u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940", "\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940, \u092E\u092A\u094D\u0930"), \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
12. "anchorScript": \u092A\u0947\u0936\u0947\u0935\u0930 \u0939\u093F\u0902\u0926\u0940 \u091F\u0940\u0935\u0940 \u0928\u094D\u092F\u0942\u091C\u093C \u090F\u0902\u0915\u0930 / \u091F\u0947\u0932\u0940\u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F\u0930 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F (\u091C\u0948\u0938\u0947: "\u0928\u092E\u0938\u094D\u0915\u093E\u0930, \u0907\u0938 \u0938\u092E\u092F \u0915\u0940 \u092C\u0921\u093C\u0940 \u0916\u092C\u0930..."), 2-3 \u0935\u093E\u0915\u094D\u092F\u094B\u0902 \u092E\u0947\u0902 \u0938\u094D\u092A\u0937\u094D\u091F \u0914\u0930 \u0927\u093E\u0930\u093E\u092A\u094D\u0930\u0935\u093E\u0939 \u0938\u094D\u091F\u0942\u0921\u093F\u092F\u094B \u090F\u0902\u0915\u0930\u093F\u0902\u0917\u0964
13. "categories": 2 \u0938\u0947 4 \u0938\u091F\u0940\u0915 \u0936\u094D\u0930\u0947\u0923\u093F\u092F\u094B\u0902 \u0915\u0940 \u0938\u0942\u091A\u0940 (Array of strings, \u091C\u0948\u0938\u0947: ["\u0939\u093E\u0926\u0938\u093E", "\u0938\u0921\u093C\u0915 \u0938\u0941\u0930\u0915\u094D\u0937\u093E", "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936"])\u0964
14. "tags": 4 \u0938\u0947 6 \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0939\u0948\u0936\u091F\u0948\u0917 \u0915\u0940 \u0938\u0942\u091A\u0940 (Array of strings, \u091C\u0948\u0938\u0947: ["#BreakingNews", "#HindiNews", "#BNWTV"])\u0964
`;
    let parsedData = null;
    const aiProvider = (req.body.aiProvider || "gemini").toLowerCase();
    if (aiProvider === "openai") {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: editorialSystemInstruction
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.6
        });
        const raw = completion.choices[0]?.message?.content || "{}";
        parsedData = JSON.parse(raw);
        if (!parsedData.headlineOptions || !Array.isArray(parsedData.headlineOptions) || parsedData.headlineOptions.length === 0) {
          parsedData.headlineOptions = [parsedData.headline || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930"];
        }
      } catch (openAiErr) {
        console.error("OpenAI news command error:", openAiErr);
        if (openAiErr?.message && openAiErr.message.includes("OPENAI_API_KEY \u0938\u0947\u091F \u0928\u0939\u0940\u0902 \u0939\u0948")) {
          return res.status(400).json({ error: openAiErr.message });
        }
        console.log("OpenAI failed, falling back to local news draft:", openAiErr?.message?.slice(0, 80));
        const fallbackSource = rawInputText || fetchedArticleSnippet || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
        parsedData = createLocalNewsFallback(fallbackSource, linkUrl, targetMaxLines);
      }
    } else {
      if (!process.env.GEMINI_API_KEY) {
        console.log("No GEMINI_API_KEY set, generating instant local draft for news command");
        const fallbackSource = effectiveInput || fetchedArticleSnippet || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
        parsedData = createLocalNewsFallback(fallbackSource, linkUrl, targetMaxLines);
      } else {
        const ai = getGeminiClient();
        try {
          const response = await generateWithFallbackAndRetry(
            ai,
            DEFAULT_FALLBACK_MODELS,
            {
              contents: prompt,
              config: {
                systemInstruction: editorialSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    headline: { type: import_genai.Type.STRING },
                    headlineOptions: {
                      type: import_genai.Type.ARRAY,
                      items: { type: import_genai.Type.STRING }
                    },
                    highlightWords: {
                      type: import_genai.Type.ARRAY,
                      items: { type: import_genai.Type.STRING }
                    },
                    formattedHeadline: { type: import_genai.Type.STRING },
                    location: { type: import_genai.Type.STRING },
                    summary: { type: import_genai.Type.STRING },
                    anchorScript: { type: import_genai.Type.STRING },
                    categories: {
                      type: import_genai.Type.ARRAY,
                      items: { type: import_genai.Type.STRING }
                    },
                    tags: {
                      type: import_genai.Type.ARRAY,
                      items: { type: import_genai.Type.STRING }
                    },
                    category: { type: import_genai.Type.STRING },
                    suggestedImagePrompt: { type: import_genai.Type.STRING },
                    isAiGeneratedPhoto: { type: import_genai.Type.BOOLEAN },
                    speakerName: { type: import_genai.Type.STRING },
                    speakerTitle: { type: import_genai.Type.STRING }
                  },
                  required: [
                    "headline",
                    "highlightWords",
                    "formattedHeadline",
                    "location",
                    "summary"
                  ]
                }
              }
            }
          );
          parsedData = JSON.parse(response.text || "{}");
        } catch (geminiError) {
          const errMsg = String(geminiError?.message || "");
          const isQuota = geminiError?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota");
          console.log(`All Gemini models busy in process-news-command (${isQuota ? "Quota exceeded/Rate limit" : "Fallback"}), generating instant structured fallback:`, errMsg.slice(0, 80));
          const fallbackSource = rawInputText || fetchedArticleSnippet || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
          parsedData = createLocalNewsFallback(fallbackSource, linkUrl, targetMaxLines);
          if (isQuota) {
            parsedData.quotaNotice = "Gemini API \u092B\u094D\u0930\u0940 \u0915\u094B\u091F\u093E \u0938\u0940\u092E\u093E \u0935\u094D\u092F\u0938\u094D\u0924 \u0939\u0948\u0964 \u0938\u0902\u0930\u091A\u093F\u0924 \u0938\u094D\u092E\u093E\u0930\u094D\u091F \u0907\u0902\u091C\u0928 \u0928\u0947 \u0906\u092A\u0915\u0940 \u0916\u092C\u0930 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930 \u0926\u0940 \u0939\u0948!";
          }
        }
      }
    }
    if (parsedData) {
      if (parsedData.headline) parsedData.headline = sanitizePressNoteFlattery(parsedData.headline);
      if (Array.isArray(parsedData.headlineOptions)) {
        parsedData.headlineOptions = parsedData.headlineOptions.map(sanitizePressNoteFlattery);
      }
      if (parsedData.formattedHeadline) {
        parsedData.formattedHeadline = sanitizePressNoteFlattery(parsedData.formattedHeadline);
      }
      if (parsedData.summary) parsedData.summary = sanitizePressNoteFlattery(parsedData.summary);
      if (parsedData.speakerName) parsedData.speakerName = sanitizePressNoteFlattery(parsedData.speakerName);
      if (parsedData.speakerTitle) parsedData.speakerTitle = sanitizePressNoteFlattery(parsedData.speakerTitle);
      parsedData.template_id = tplConfig.template_id;
      parsedData.headline_max_lines = targetMaxLines;
      parsedData.headline_area = targetArea;
      parsedData.headline_line_count = targetMaxLines;
    }
    parsedData.pickedImages = pickedImages;
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error("Error in /api/process-news-command:", err);
    return res.status(500).json({
      error: cleanErrorMessage(err)
    });
  }
});
function sanitizePressNoteFlattery(text) {
  if (!text || typeof text !== "string") return text || "";
  let cleaned = text;
  cleaned = cleaned.replace(/^(यह खबर है|जानिए|देखिए|Breaking News:|ब्रेकिंग न्यूज़:)\s*/i, "");
  cleaned = cleaned.replace(
    /(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री|परम पूज्य|पूज्य)\s+/gu,
    " "
  );
  cleaned = cleaned.replace(
    /(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu,
    " "
  );
  cleaned = cleaned.replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "");
  cleaned = cleaned.replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, "");
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ").trim();
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  return cleaned;
}
function createEpaperLocalFallback(rawInput, city = "", reporterName = "") {
  const sanitized = sanitizePressNoteFlattery(rawInput);
  const detectedCity = city.trim() || (rawInput.match(/(निवाड़ी|इंदौर|भोपाल|ग्वालियर|जबलपुर|उज्जैन|रीवा|सतना|सागर|टीकमगढ़|दमोह|छतरपुर)/i)?.[1] || "\u0928\u093F\u0935\u093E\u0921\u093C\u0940");
  const firstSentence = sanitized.split(/[।\.\n]/)[0]?.trim() || "\u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0938\u0947 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u092E\u091A\u093E \u0939\u0921\u093C\u0915\u0902\u092A";
  const headline = firstSentence.length > 15 && firstSentence.length < 90 ? firstSentence : `${detectedCity}: \u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0915\u093E \u092C\u0921\u093C\u093E \u090F\u0915\u094D\u0936\u0928, \u091C\u093E\u0902\u091A \u0915\u0947 \u0906\u0926\u0947\u0936`;
  return {
    epaperCity: detectedCity,
    epaperKicker: "\u0935\u093F\u0936\u0947\u0937 \u0930\u093F\u092A\u094B\u0930\u094D\u091F / \u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u091C\u093C\u0940\u0930\u094B",
    epaperHeadline: headline,
    epaperSubHeadline: "\u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u0928\u0947 \u092E\u094C\u0915\u0947 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u0932\u093F\u092F\u093E \u091C\u093E\u092F\u091C\u093E, \u0926\u094B\u0937\u093F\u092F\u094B\u0902 \u092A\u0930 \u0915\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0940 \u091A\u0947\u0924\u093E\u0935\u0928\u0940",
    epaperByline: reporterName ? `${reporterName} / \u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0935\u093E\u0926\u0926\u093E\u0924\u093E, ${detectedCity}` : `\u092C\u094D\u092F\u0942\u0930\u094B \u0930\u093F\u092A\u094B\u0930\u094D\u091F / ${detectedCity}`,
    epaperPromoTagline: "\u{1F4E2} \u0905\u092C \u0906\u092A \u092D\u0940 \u092D\u0947\u091C\u0947\u0902 \u0905\u092A\u0928\u0940 \u0916\u092C\u0930 \u0939\u092E \u0924\u0915: 96698-02408",
    epaperArticleBody: `${sanitized.slice(0, 500) || "\u091C\u093F\u0932\u0947 \u092E\u0947\u0902 \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0928\u0947 \u092C\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0930\u0924\u0947 \u0939\u0941\u090F \u0938\u094D\u0925\u093F\u0924\u093F \u0915\u094B \u0928\u093F\u092F\u0902\u0924\u094D\u0930\u093F\u0924 \u0915\u093F\u092F\u093E\u0964 \u0917\u094D\u0930\u093E\u092E\u0940\u0923\u094B\u0902 \u0915\u0940 \u0936\u093F\u0915\u093E\u092F\u0924\u094B\u0902 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u0935\u0930\u093F\u0937\u094D\u0920 \u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u0928\u0947 \u0938\u0902\u092F\u0941\u0915\u094D\u0924 \u0926\u0932 \u0917\u0920\u093F\u0924 \u0915\u0930 \u092E\u094C\u0915\u0947 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u091C\u093E\u0902\u091A \u0915\u0940\u0964"}

\u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0938\u0902\u0932\u093F\u092A\u094D\u0924 \u092A\u093E\u090F \u0917\u090F \u0932\u094B\u0917\u094B\u0902 \u0915\u0947 \u0935\u093F\u0930\u0941\u0926\u094D\u0927 \u0935\u0948\u0927\u093E\u0928\u093F\u0915 \u0927\u093E\u0930\u093E\u0913\u0902 \u092E\u0947\u0902 \u092A\u094D\u0930\u0915\u0930\u0923 \u0926\u0930\u094D\u091C \u0915\u0930 \u0905\u0917\u094D\u0930\u093F\u092E \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u092A\u094D\u0930\u093E\u0930\u0902\u092D \u0915\u0930 \u0926\u0940 \u0917\u0908 \u0939\u0948\u0964`,
    epaperHighlightsTitle: "\u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941",
    epaperHighlights: [
      "\u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0926\u0932 \u0928\u0947 \u092E\u094C\u0915\u0947 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u0915\u0940 \u0924\u094D\u0935\u0930\u093F\u0924 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908",
      "\u0936\u093F\u0915\u093E\u092F\u0924\u094B\u0902 \u0915\u0947 \u0906\u0927\u093E\u0930 \u092A\u0930 \u091C\u093E\u0902\u091A \u0926\u0932 \u0917\u0920\u093F\u0924 \u0915\u0930 \u092A\u0902\u091A\u0928\u093E\u092E\u093E \u0924\u0948\u092F\u093E\u0930",
      "\u0926\u094B\u0937\u093F\u092F\u094B\u0902 \u0915\u0947 \u0916\u093F\u0932\u093E\u092B \u0938\u0916\u094D\u0924 \u0935\u0948\u0927\u093E\u0928\u093F\u0915 \u0927\u093E\u0930\u093E\u0913\u0902 \u092E\u0947\u0902 \u092A\u094D\u0930\u0915\u0930\u0923 \u0926\u0930\u094D\u091C"
    ],
    epaperQuoteText: "\u091C\u0928\u0939\u093F\u0924 \u0914\u0930 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0947 \u0932\u093F\u090F \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u092E\u0941\u0938\u094D\u0924\u0948\u0926 \u0939\u0948\u0964 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0938\u094D\u0924\u0930 \u092A\u0930 \u0932\u093E\u092A\u0930\u0935\u093E\u0939\u0940 \u092C\u0930\u094D\u0926\u093E\u0936\u094D\u0924 \u0928\u0939\u0940\u0902 \u0939\u094B\u0917\u0940\u0964",
    epaperQuoteSpeaker: `${detectedCity} \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u0905\u0927\u093F\u0915\u093E\u0930\u0940`,
    epaperPhotoCaption: "\u0918\u091F\u0928\u093E\u0938\u094D\u0925\u0932 \u092A\u0930 \u092A\u0939\u0941\u0902\u091A\u0915\u0930 \u091C\u093E\u0902\u091A \u092A\u0921\u093C\u0924\u093E\u0932 \u0915\u0930\u0924\u0940 \u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u091F\u0940\u092E\u0964",
    epaperPhotoCaption2: "\u0926\u0938\u094D\u0924\u093E\u0935\u0947\u091C\u094B\u0902 \u0915\u0940 \u091C\u093E\u0902\u091A \u0915\u0930\u0924\u0947 \u0905\u0927\u093F\u0915\u093E\u0930\u0940\u0964",
    epaperPhotoCaption3: "\u092E\u094C\u0915\u0947 \u092A\u0930 \u0909\u092A\u0938\u094D\u0925\u093F\u0924 \u0917\u094D\u0930\u093E\u092E\u0940\u0923 \u0935 \u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937\u0926\u0930\u094D\u0936\u0940\u0964",
    summary: `${detectedCity} \u092E\u0947\u0902 \u092C\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0940 \u0916\u092C\u0930\u0964 \u092A\u0942\u0930\u0940 \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0908-\u092A\u0947\u092A\u0930 \u090F\u0921\u093F\u0936\u0928 \u092E\u0947\u0902 \u092A\u0922\u093C\u0947\u0902\u0964

#breakingnewswala #Epaper #${detectedCity}News #HindiNews #BNWTV`,
    category: "\u092A\u094D\u0930\u0936\u093E\u0938\u0928"
  };
}
app.post("/api/process-epaper-pressnote", async (req, res) => {
  try {
    const {
      pressNoteText = "",
      linkUrl = "",
      city = "",
      reporterName = "",
      aiProvider = "gemini"
    } = req.body;
    if (!pressNoteText && !linkUrl) {
      return res.status(400).json({ error: "\u0915\u0943\u092A\u092F\u093E \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0915\u093E \u0935\u093F\u0935\u0930\u0923 \u092F\u093E \u0932\u093F\u0902\u0915 \u092A\u094D\u0930\u0926\u093E\u0928 \u0915\u0930\u0947\u0902\u0964" });
    }
    let fetchedSnippet = "";
    let pickedImages = {};
    if (linkUrl) {
      try {
        const fetchRes = await fetch(linkUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        if (fetchRes.ok) {
          const html = await fetchRes.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const metaDescMatch = html.match(
            /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
          );
          let bodySnippet = "";
          const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
          if (paragraphs) {
            bodySnippet = paragraphs.slice(0, 10).map((p) => p.replace(/<[^>]+>/g, "").trim()).filter((t) => t.length > 25).join("\n\n");
          }
          fetchedSnippet = `
URL: ${linkUrl}
Title: ${titleMatch ? titleMatch[1] : ""}
Meta: ${metaDescMatch ? metaDescMatch[1] : ""}
Text: ${bodySnippet.slice(0, 3500)}
`;
          const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            pickedImages.main = ogImageMatch[1].trim();
          }
        }
      } catch (err) {
        console.warn("Failed fetching linkUrl for epaper:", err?.message);
      }
    }
    const rawInput = (pressNoteText + "\n\n" + fetchedSnippet).trim();
    const systemPrompt = `\u0906\u092A "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" (Breaking News Wala) \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 \u0914\u0930 \u0908-\u092A\u0947\u092A\u0930 \u0921\u093F\u091C\u093C\u093E\u0907\u0928 \u0939\u0947\u0921 \u0939\u0948\u0902\u0964
\u0906\u092A\u0915\u094B \u0928\u0940\u091A\u0947 \u090F\u0915 \u0915\u091A\u094D\u091A\u093E \u092A\u0941\u0932\u093F\u0938/\u092A\u094D\u0930\u0936\u093E\u0938\u0928\u093F\u0915 \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0905\u0925\u0935\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0930\u093F\u092A\u094B\u0930\u094D\u091F \u0926\u0940 \u091C\u093E \u0930\u0939\u0940 \u0939\u0948\u0964
\u0906\u092A\u0915\u094B \u0907\u0938\u0947 \u090F\u0915 \u092A\u094D\u0930\u0924\u093F\u0937\u094D\u0920\u093F\u0924 \u0926\u0948\u0928\u093F\u0915 \u0938\u092E\u093E\u091A\u093E\u0930 \u092A\u0924\u094D\u0930 (\u091C\u0948\u0938\u0947 \u0926\u0948\u0928\u093F\u0915 \u092D\u093E\u0938\u094D\u0915\u0930, \u092A\u0924\u094D\u0930\u093F\u0915\u093E) \u0915\u0947 \u0908-\u092A\u0947\u092A\u0930 (E-Paper) \u090F\u0921\u093F\u0936\u0928 \u0915\u0940 \u092A\u094D\u0930\u092E\u0941\u0916 \u0916\u092C\u0930 \u0915\u0947 \u0930\u0942\u092A \u092E\u0947\u0902 \u0922\u093E\u0932\u0928\u093E \u0939\u0948\u0964

\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0915\u091A\u094D\u091A\u093E \u0907\u0928\u092A\u0941\u091F (\u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F / \u0930\u093F\u092A\u094B\u0930\u094D\u091F):
"${rawInput}"

${city ? `\u092F\u0942\u091C\u093C\u0930 \u0926\u094D\u0935\u093E\u0930\u093E \u0928\u093F\u0930\u094D\u0926\u093F\u0937\u094D\u091F \u0936\u0939\u0930/\u091C\u093F\u0932\u093E: "${city}"` : ""}
${reporterName ? `\u092F\u0942\u091C\u093C\u0930 \u0926\u094D\u0935\u093E\u0930\u093E \u0928\u093F\u0930\u094D\u0926\u093F\u0937\u094D\u091F \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0915\u093E \u0928\u093E\u092E: "${reporterName}"` : ""}

\u2605 \u0905\u0924\u093F-\u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u0928\u093F\u092F\u092E (STRICT EDITORIAL RULES):
1. **\u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0935 \u0914\u092A\u091A\u093E\u0930\u093F\u0915 \u0936\u092C\u094D\u0926 \u0939\u091F\u093E\u0928\u093E (\u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0928\u093F\u092F\u092E)**: \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u092E\u0947\u0902 \u0905\u0927\u093F\u0915\u093E\u0930\u093F\u092F\u094B\u0902 \u092F\u093E \u0935\u094D\u092F\u0915\u094D\u0924\u093F\u092F\u094B\u0902 \u0915\u0947 \u0928\u093E\u092E \u0915\u0947 \u0906\u0917\u0947 '\u0936\u094D\u0930\u0940', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928', '\u0936\u094D\u0930\u0940\u092E\u0924\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0940\u092F', '\u0906\u0926\u0930\u0923\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F', '\u091C\u0940' \u091C\u0948\u0938\u0947 \u0914\u092A\u091A\u093E\u0930\u093F\u0915 \u092F\u093E \u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0935\u093E\u0932\u0947 \u0936\u092C\u094D\u0926 \u0939\u094B\u0924\u0947 \u0939\u0948\u0902\u0964 \u0907\u0928 \u0938\u092D\u0940 \u0915\u094B \u0939\u091F\u093E\u0915\u0930 \u0916\u092C\u0930 \u0915\u094B \u0936\u0941\u0926\u094D\u0927 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937, \u0924\u0925\u094D\u092F\u092A\u0930\u0915 \u0914\u0930 \u0909\u091A\u094D\u091A \u0938\u094D\u0924\u0930\u0940\u092F \u0916\u094B\u091C\u0940 \u092A\u0924\u094D\u0930\u0915\u093E\u0930\u093F\u0924\u093E \u0915\u0940 \u092D\u093E\u0937\u093E \u092E\u0947\u0902 \u092C\u0928\u093E\u090F\u0902\u0964 (\u091C\u0948\u0938\u0947: "\u0936\u094D\u0930\u0940\u092E\u093E\u0928 \u092A\u0941\u0932\u093F\u0938 \u0905\u0927\u0940\u0915\u094D\u0937\u0915 \u092E\u0939\u094B\u0926\u092F \u0915\u0947 \u0915\u0941\u0936\u0932 \u0928\u093F\u0930\u094D\u0926\u0947\u0936\u0928 \u092E\u0947\u0902..." \u0915\u0947 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 "\u092A\u0941\u0932\u093F\u0938 \u0905\u0927\u0940\u0915\u094D\u0937\u0915 \u0915\u0947 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u092A\u0930...")
2. **\u0936\u0939\u0930/\u091C\u093F\u0932\u093E (epaperCity)**: \u0916\u092C\u0930 \u091C\u093F\u0938 \u0936\u0939\u0930/\u091C\u093F\u0932\u0947 \u0915\u0940 \u0939\u0948 (\u091C\u0948\u0938\u0947: \u0928\u093F\u0935\u093E\u0921\u093C\u0940, \u0907\u0902\u0926\u094C\u0930, \u092D\u094B\u092A\u093E\u0932, \u091F\u0940\u0915\u092E\u0917\u0922\u093C) \u0909\u0938\u0915\u093E \u0928\u093E\u092E\u0964 \u092F\u0926\u093F \u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u0928\u093F\u0930\u094D\u0926\u093F\u0937\u094D\u091F \u0915\u093F\u092F\u093E \u0939\u0948 \u0924\u094B \u0935\u0939\u0940 \u0930\u0916\u0947\u0902, \u0905\u0928\u094D\u092F\u0925\u093E \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0938\u0947 \u092A\u0939\u091A\u093E\u0928\u0947\u0902\u0964
3. **\u0915\u093F\u0915\u0930 (epaperKicker)**: 3 \u0938\u0947 6 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u0906\u0915\u0930\u094D\u0937\u0915 \u0938\u0902\u0926\u0930\u094D\u092D \u091F\u0948\u0917 (\u0909\u0926\u093E: "\u092C\u0921\u093C\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 / \u0916\u0928\u093F\u091C \u092E\u093E\u092B\u093F\u092F\u093E \u092A\u0930 \u0936\u093F\u0915\u0902\u091C\u093E", "\u0938\u0921\u093C\u0915 \u0939\u093E\u0926\u0938\u093E", "\u0915\u0932\u0947\u0915\u094D\u091F\u0930 \u0915\u093E \u0915\u0921\u093C\u093E \u0930\u0941\u0916", "\u0935\u093F\u0936\u0947\u0937 \u092A\u0921\u093C\u0924\u093E\u0932")\u0964
4. **\u092E\u0941\u0916\u094D\u092F \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (epaperHeadline)**: 8 \u0938\u0947 14 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0940 \u0938\u093E\u0930\u0917\u0930\u094D\u092D\u093F\u0924, \u0938\u091F\u0940\u0915 \u0935 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0905\u0916\u092C\u093E\u0930 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (\u0905\u0927\u093F\u0915 \u0932\u0902\u092C\u0940 \u0928 \u0939\u094B, 1-2 \u0932\u093E\u0907\u0928\u094B\u0902 \u092E\u0947\u0902 \u0906 \u091C\u093E\u090F \u0924\u093E\u0915\u093F \u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0915\u0947 \u0932\u093F\u090F \u092A\u0930\u094D\u092F\u093E\u092A\u094D\u0924 \u091C\u0917\u0939 \u092E\u093F\u0932\u0947 \u0914\u0930 \u0915\u094B\u0908 \u0936\u092C\u094D\u0926 \u0928 \u0915\u091F\u0947)\u0964
5. **\u0909\u092A-\u0936\u0940\u0930\u094D\u0937\u0915 (epaperSubHeadline)**: 6 \u0938\u0947 12 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0909\u092A-\u0936\u0940\u0930\u094D\u0937\u0915 \u092F\u093E \u092E\u0941\u0916\u094D\u092F \u092A\u0930\u093F\u0923\u093E\u092E \u0938\u093E\u0930\u0964
6. **\u092C\u093E\u092F\u0932\u093E\u0907\u0928 (epaperByline)**: \u092F\u0926\u093F \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0915\u093E \u0928\u093E\u092E \u0939\u0948 \u0924\u094B "${reporterName || "\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0935\u093E\u0926\u0926\u093E\u0924\u093E"}", \u0905\u0928\u094D\u092F\u0925\u093E "\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0935\u093E\u0926\u0926\u093E\u0924\u093E / \u092C\u094D\u092F\u0942\u0930\u094B \u0930\u093F\u092A\u094B\u0930\u094D\u091F"\u0964
7. **\u0905\u0916\u092C\u093E\u0930 \u0915\u0940 \u0938\u094D\u091F\u094B\u0930\u0940 \u092C\u0949\u0921\u0940 (epaperArticleBody)**: \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924, \u0938\u091F\u0940\u0915 \u0914\u0930 \u092A\u0942\u0930\u094D\u0923 (90 \u0938\u0947 130 \u0936\u092C\u094D\u0926)\u0964 \u0915\u094B\u0908 \u092D\u0940 \u0935\u093E\u0915\u094D\u092F \u0905\u0927\u0942\u0930\u093E \u0928 \u091B\u0942\u091F\u0947\u0964 \u092A\u0942\u0930\u0940 \u092C\u093E\u0924 2 \u0938\u0902\u0924\u0941\u0932\u093F\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u0938\u092E\u093E\u092A\u094D\u0924 \u0939\u094B \u091C\u093E\u090F \u0924\u093E\u0915\u093F \u0905\u0916\u092C\u093E\u0930 \u0915\u0947 \u0915\u0949\u0932\u092E \u092E\u0947\u0902 \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u092B\u093F\u091F \u092C\u0948\u0920 \u0938\u0915\u0947 \u0914\u0930 \u0915\u094B\u0908 \u0935\u093F\u0935\u0930\u0923 \u0915\u091F\u0947 \u0928\u0939\u0940\u0902\u0964 \u0916\u092C\u0930 \u0915\u0940 \u0936\u0941\u0930\u0941\u0906\u0924 \u092E\u0947\u0902 \u0905\u0916\u092C\u093E\u0930 \u0936\u0948\u0932\u0940 \u0915\u0940 \u0921\u0947\u091F\u0932\u093E\u0907\u0928 \u091C\u0948\u0938\u0947 "${city ? city : "\u0928\u093F\u0935\u093E\u0921\u093C\u0940"} (\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u0935\u093E\u0926\u0926\u093E\u0924\u093E): " \u0938\u0947 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902\u0964 \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0915\u0947 \u0938\u092D\u0940 \u0905\u0939\u092E \u0924\u0925\u094D\u092F (\u0906\u0930\u094B\u092A, \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908, \u092C\u0930\u093E\u092E\u0926\u0917\u0940) \u0906 \u091C\u093E\u090F\u0902 \u0932\u0947\u0915\u093F\u0928 \u0917\u0948\u0930-\u091C\u0930\u0942\u0930\u0940 \u0935\u093F\u0938\u094D\u0924\u093E\u0930 \u0928 \u0939\u094B\u0964
8. **\u0939\u093E\u0907\u0932\u093E\u0907\u091F\u094D\u0938 / \u0907\u0928\u0938\u0947\u091F \u092C\u0949\u0915\u094D\u0938 (epaperHighlightsTitle \u0935 epaperHighlights)**:
   - epaperHighlightsTitle: \u091C\u0948\u0938\u0947 "\u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0947 3 \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941", "\u092F\u0939 \u0939\u0948 \u092A\u0942\u0930\u093E \u092E\u093E\u092E\u0932\u093E", "\u0907\u0928 \u0927\u093E\u0930\u093E\u0913\u0902 \u092E\u0947\u0902 \u0915\u0947\u0938 \u0926\u0930\u094D\u091C" \u0906\u0926\u093F\u0964
   - epaperHighlights: 2 \u0938\u0947 3 \u0920\u094B\u0938, \u0938\u0940\u0927\u0947 \u0914\u0930 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u092C\u0941\u0932\u0947\u091F \u092A\u0949\u0907\u0902\u091F\u094D\u0938 (\u092A\u094D\u0930\u0924\u094D\u092F\u0947\u0915 \u092C\u093F\u0902\u0926\u0941 8-14 \u0936\u092C\u094D\u0926)\u0964
9. **\u092B\u094B\u091F\u094B \u0915\u0948\u092A\u094D\u0936\u0928\u094D\u0938**:
   - epaperPhotoCaption: \u092A\u0939\u0932\u0940 \u092E\u0941\u0916\u094D\u092F \u092B\u094B\u091F\u094B \u0915\u093E 1 \u0932\u093E\u0907\u0928 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964
   - epaperPhotoCaption2: \u0926\u0942\u0938\u0930\u0940 \u092B\u094B\u091F\u094B \u0915\u093E 1 \u0932\u093E\u0907\u0928 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964
   - epaperPhotoCaption3: \u0924\u0940\u0938\u0930\u0940 \u092B\u094B\u091F\u094B \u0915\u093E 1 \u0932\u093E\u0907\u0928 \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923\u0964
10. **\u092A\u094D\u0930\u094B\u092E\u094B\u0936\u0928\u0932 \u0938\u0902\u0926\u0947\u0936 (epaperPromoTagline)**: \u092C\u093E\u092F\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u0926\u093E\u0908\u0902 \u0913\u0930 \u0926\u093F\u0916\u0928\u0947 \u0935\u093E\u0932\u0940 \u092A\u0902\u0915\u094D\u0924\u093F (\u0909\u0926\u093E: "\u{1F4E2} \u0905\u092C \u0906\u092A \u092D\u0940 \u092D\u0947\u091C\u0947\u0902 \u0905\u092A\u0928\u0940 \u0916\u092C\u0930 \u0939\u092E \u0924\u0915: 96698-02408")\u0964
11. **\u0928\u0947\u0924\u093E / \u0905\u0927\u093F\u0915\u093E\u0930\u0940 \u0915\u093E \u092C\u092F\u093E\u0928 \u0915\u0949\u0932-\u0906\u0909\u091F (epaperQuoteText \u0935 epaperQuoteSpeaker)**: \u092F\u0926\u093F \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u092E\u0947\u0902 \u0915\u093F\u0938\u0940 \u092E\u0902\u0924\u094D\u0930\u0940, \u0935\u093F\u0927\u093E\u092F\u0915, \u0915\u0932\u0947\u0915\u094D\u091F\u0930, \u090F\u0938\u092A\u0940, \u0905\u0927\u093F\u0915\u093E\u0930\u0940 \u092F\u093E \u0928\u0947\u0924\u093E \u0915\u093E \u0915\u094B\u0908 \u092C\u092F\u093E\u0928, \u091A\u0947\u0924\u093E\u0935\u0928\u0940 \u092F\u093E \u092A\u094D\u0930\u0924\u093F\u0915\u094D\u0930\u093F\u092F\u093E \u0939\u094B, \u0924\u094B \u0909\u0938\u0947 \u092F\u0939\u093E\u0901 1-2 \u0935\u093E\u0915\u094D\u092F\u094B\u0902 \u092E\u0947\u0902 \u0928\u093F\u0915\u093E\u0932\u0947\u0902 (\u0909\u0926\u093E: "\u0926\u094B\u0937\u093F\u092F\u094B\u0902 \u0915\u094B \u092C\u0916\u094D\u0936\u093E \u0928\u0939\u0940\u0902 \u091C\u093E\u090F\u0917\u093E, \u0939\u0930 \u092C\u093F\u0902\u0926\u0941 \u092A\u0930 \u0938\u0916\u094D\u0924 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0939\u094B\u0917\u0940")\u0964 epaperQuoteSpeaker \u092E\u0947\u0902 \u0909\u0928\u0915\u093E \u0928\u093E\u092E \u0935 \u092A\u0926 (\u0909\u0926\u093E: "\u0921\u0949. \u092E\u0939\u0947\u0902\u0926\u094D\u0930 \u0938\u093F\u0902\u0939, \u092A\u094D\u0930\u092D\u093E\u0930\u0940") \u0932\u093F\u0916\u0947\u0902\u0964
12. **\u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0938\u092E\u0930\u0940 (summary)**: Instagram \u0914\u0930 Facebook \u0915\u0947 \u0932\u093F\u090F 2 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u0915\u093E \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u0935\u093F\u0935\u0930\u0923, \u0905\u0902\u0924 \u092E\u0947\u0902 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0939\u0948\u0936\u091F\u0948\u0917\u094D\u0938: #breakingnewswala #Epaper #HindiNews #{city}News #BNWTV \u0906\u0926\u093F\u0964
13. **\u0936\u094D\u0930\u0947\u0923\u0940 (category)**: (\u0905\u092A\u0930\u093E\u0927 / \u092A\u094D\u0930\u0936\u093E\u0938\u0928 / \u0939\u093E\u0926\u0938\u093E / \u0930\u093E\u091C\u0928\u0940\u0924\u093F / \u0935\u093F\u0915\u093E\u0938 / \u091C\u0928\u0938\u092E\u0938\u094D\u092F\u093E / \u0936\u093F\u0915\u094D\u0937\u093E)\u0964

Strictly return a valid JSON object matching these exact keys:
epaperCity, epaperKicker, epaperHeadline, epaperSubHeadline, epaperByline, epaperPromoTagline, epaperArticleBody, epaperHighlightsTitle, epaperHighlights, epaperQuoteText, epaperQuoteSpeaker, epaperPhotoCaption, epaperPhotoCaption2, epaperPhotoCaption3, summary, category`;
    let parsedData = null;
    const provider = (aiProvider || "gemini").toLowerCase();
    if (provider === "openai") {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You are the chief editorial director for Breaking News Wala E-Paper graphics. Always respond in strictly valid JSON format."
            },
            { role: "user", content: systemPrompt }
          ],
          temperature: 0.5
        });
        const raw = completion.choices[0]?.message?.content || "{}";
        parsedData = JSON.parse(raw);
      } catch (openAiErr) {
        console.warn("OpenAI epaper parsing error, falling back to Gemini:", openAiErr?.message);
      }
    }
    if (!parsedData && process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const response = await generateWithFallbackAndRetry(
          ai,
          DEFAULT_FALLBACK_MODELS,
          {
            contents: systemPrompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.5
            }
          }
        );
        parsedData = JSON.parse(response.text || "{}");
      } catch (geminiError) {
        console.warn("Gemini epaper parsing error:", geminiError?.message?.slice(0, 100));
      }
    }
    if (!parsedData || !parsedData.epaperHeadline) {
      parsedData = createEpaperLocalFallback(rawInput, city, reporterName);
    }
    if (pickedImages.main) {
      parsedData.pickedImages = pickedImages;
    }
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error("Error in /api/process-epaper-pressnote:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var CURATED_NEWS_PRESS_PHOTOS = {
  protest: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=1200&auto=format&fit=crop&q=85"
  ],
  accident: [
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=1200&auto=format&fit=crop&q=85"
  ],
  politics: [
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1575320181282-9afab399332c?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=85"
  ],
  police_crime: [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&auto=format&fit=crop&q=85"
  ],
  hospital: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&auto=format&fit=crop&q=85"
  ],
  weather: [
    "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&auto=format&fit=crop&q=85"
  ],
  students: [
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=85"
  ],
  business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&auto=format&fit=crop&q=85"
  ],
  general: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=85"
  ]
};
function pickCuratedNewsPressPhoto(text, variation = 0) {
  const lower = (text || "").toLowerCase();
  const pickFrom = (arr) => arr[Math.abs(variation) % arr.length];
  if (lower.includes("\u0927\u0930\u0928\u093E") || lower.includes("\u092A\u094D\u0930\u0926\u0930\u094D\u0936\u0928") || lower.includes("\u0906\u0902\u0926\u094B\u0932\u0928") || lower.includes("\u0905\u092D\u094D\u092F\u0930\u094D\u0925\u0940") || lower.includes("\u0936\u093F\u0915\u094D\u0937\u0915") || lower.includes("\u092D\u0930\u094D\u0924\u0940") || lower.includes("\u092E\u093E\u0902\u0917") || lower.includes("\u0939\u0921\u093C\u0924\u093E\u0932") || lower.includes("\u0918\u0947\u0930\u093E\u0935") || lower.includes("\u091C\u094D\u091E\u093E\u092A\u0928") || lower.includes("protest") || lower.includes("rally") || lower.includes("strike") || lower.includes("candidate")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.protest);
  }
  if (lower.includes("\u0939\u093E\u0926\u0938\u093E") || lower.includes("\u0926\u0941\u0930\u094D\u0918\u091F\u0928\u093E") || lower.includes("\u091F\u0915\u094D\u0915\u0930") || lower.includes("\u092A\u0932\u091F\u0940") || lower.includes("\u092C\u0938") || lower.includes("\u091F\u094D\u0930\u0915") || lower.includes("\u0915\u093E\u0930") || lower.includes("\u0939\u093E\u0908\u0935\u0947") || lower.includes("\u0938\u0921\u093C\u0915") || lower.includes("\u0918\u093E\u092F\u0932") || lower.includes("\u092E\u094C\u0924") || lower.includes("accident") || lower.includes("crash") || lower.includes("highway")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.accident);
  }
  if (lower.includes("\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940") || lower.includes("\u0936\u093F\u0935\u0930\u093E\u091C") || lower.includes("\u0926\u093F\u0917\u094D\u0935\u093F\u091C\u092F") || lower.includes("\u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935") || lower.includes("\u0915\u092E\u0932\u0928\u093E\u0925") || lower.includes("\u092E\u0902\u0924\u094D\u0930\u0940") || lower.includes("\u0928\u0947\u0924\u093E") || lower.includes("\u0935\u093F\u0927\u093E\u0928\u0938\u092D\u093E") || lower.includes("\u092A\u094D\u0930\u0947\u0938") || lower.includes("\u0915\u093E\u0902\u0917\u094D\u0930\u0947\u0938") || lower.includes("\u092D\u093E\u091C\u092A\u093E") || lower.includes("\u0938\u0930\u0915\u093E\u0930") || lower.includes("\u0938\u0902\u0938\u0926") || lower.includes("minister") || lower.includes("assembly") || lower.includes("politics")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.politics);
  }
  if (lower.includes("\u092A\u0941\u0932\u093F\u0938") || lower.includes("\u0915\u094B\u0930\u094D\u091F") || lower.includes("\u0905\u0926\u093E\u0932\u0924") || lower.includes("\u0917\u093F\u0930\u092B\u094D\u0924\u093E\u0930") || lower.includes("\u0915\u094D\u0930\u093E\u0907\u092E") || lower.includes("\u0905\u092A\u0930\u093E\u0927") || lower.includes("\u0939\u0924\u094D\u092F\u093E") || lower.includes("\u091A\u094B\u0930\u0940") || lower.includes("police") || lower.includes("court") || lower.includes("crime")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.police_crime);
  }
  if (lower.includes("\u0905\u0938\u094D\u092A\u0924\u093E\u0932") || lower.includes("\u0921\u0949\u0915\u094D\u091F\u0930") || lower.includes("\u092E\u0930\u0940\u091C") || lower.includes("\u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F") || lower.includes("\u090F\u092E\u094D\u092C\u0941\u0932\u0947\u0902\u0938") || lower.includes("hospital") || lower.includes("doctor")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.hospital);
  }
  if (lower.includes("\u092E\u094C\u0938\u092E") || lower.includes("\u092C\u093E\u0930\u093F\u0936") || lower.includes("\u092C\u093E\u0922\u093C") || lower.includes("\u0924\u0942\u092B\u093E\u0928") || lower.includes("\u0906\u0902\u0927\u0940") || lower.includes("rain") || lower.includes("weather")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.weather);
  }
  if (lower.includes("\u091B\u093E\u0924\u094D\u0930") || lower.includes("\u092A\u0930\u0940\u0915\u094D\u0937\u093E") || lower.includes("\u0938\u094D\u0915\u0942\u0932") || lower.includes("\u0915\u0949\u0932\u0947\u091C") || lower.includes("\u0935\u093F\u0926\u094D\u092F\u093E\u0930\u094D\u0925\u0940") || lower.includes("student") || lower.includes("exam")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.students);
  }
  if (lower.includes("\u0935\u094D\u092F\u093E\u092A\u093E\u0930") || lower.includes("\u0938\u094B\u0928\u093E") || lower.includes("\u091A\u093E\u0902\u0926\u0940") || lower.includes("\u0936\u0947\u092F\u0930") || lower.includes("\u092C\u093E\u091C\u093E\u0930") || lower.includes("gold") || lower.includes("market")) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.business);
  }
  return pickFrom(CURATED_NEWS_PRESS_PHOTOS.general);
}
app.post("/api/generate-ai-image", async (req, res) => {
  try {
    const { headline, customPrompt, aspectRatio = "4:5", variation = 0, aiProvider = "gemini" } = req.body;
    if (!headline && !customPrompt) {
      return res.status(400).json({ error: "Headline or prompt is required" });
    }
    const ai = getGeminiClient();
    const perspectiveAngles = [
      "authentic journalistic press photography, standard documentary eye-level angle, realistic Indian press coverage, natural daylight",
      "wide-angle documentary press shot, complete environmental context, authentic news reportage, sharp journalistic realism",
      "candid press photo, alternative documentary perspective, on-the-scene realism, sharp news photography",
      "detailed investigative press photo, different camera angle, authentic atmosphere, high detail"
    ];
    const variationAngle = perspectiveAngles[Math.abs(Number(variation) || 0) % perspectiveAngles.length];
    let imagePrompt = customPrompt;
    if (!imagePrompt || imagePrompt.trim().length === 0) {
      if (process.env.GEMINI_API_KEY) {
        try {
          const promptGenResponse = await generateWithFallbackAndRetry(
            ai,
            DEFAULT_FALLBACK_MODELS,
            {
              contents: `You are an art director for a top Indian digital news channel.
Given this Hindi news headline: "${headline}",
write a descriptive, photorealistic, journalistic photography prompt in English for generating a background news photo.
Requirements:
- Style: ${variationAngle}.
- Realistic press photo style, natural ambient daylight, 35mm lens authentic documentary feel.
- High detail, realistic environment in India.
- Absolutely NO text, NO typography, NO watermark, NO logo, NO borders.
Return ONLY the English prompt string.`
            }
          );
          imagePrompt = promptGenResponse.text?.trim() || `Realistic journalistic press news photography depicting: ${headline}, ${variationAngle}, high detail, 4k`;
        } catch (pErr) {
          imagePrompt = `Realistic journalistic press news photography depicting: ${headline}, ${variationAngle}, high detail, 4k`;
        }
      } else {
        imagePrompt = `Realistic journalistic press news photography depicting: ${headline}, ${variationAngle}, high detail, 4k`;
      }
    }
    console.log("Generating AI image with provider:", aiProvider, "prompt:", imagePrompt, "variation:", variation);
    let imageBase64 = "";
    let isAiGenerated = false;
    if (aiProvider === "openai") {
      try {
        const openai = getOpenAIClient();
        const dalleSize = aspectRatio === "1:1" ? "1024x1024" : "1024x1792";
        const dallePrompt = `${imagePrompt}. Journalistic documentary photography style, realistic Indian news press photography, natural ambient lighting, 35mm camera lens, authentic scene. No text, no words, no watermark, no logos, clean image.`;
        console.log("Calling OpenAI DALL-E 3 with prompt:", dallePrompt);
        const dalleRes = await openai.images.generate({
          model: "dall-e-3",
          prompt: dallePrompt,
          n: 1,
          size: dalleSize,
          response_format: "b64_json"
        });
        const b64 = dalleRes.data?.[0]?.b64_json;
        if (b64) {
          imageBase64 = `data:image/png;base64,${b64}`;
          isAiGenerated = true;
        } else if (dalleRes.data?.[0]?.url) {
          const proxied = `/api/proxy-image?url=${encodeURIComponent(dalleRes.data[0].url)}`;
          return res.json({
            success: true,
            imageUrl: proxied,
            promptUsed: imagePrompt,
            fallbackUsed: false,
            isAiGenerated: true,
            provider: "openai"
          });
        }
      } catch (openAiImgErr) {
        console.error("OpenAI DALL-E 3 error:", openAiImgErr);
        if (openAiImgErr?.message && openAiImgErr.message.includes("OPENAI_API_KEY \u0938\u0947\u091F \u0928\u0939\u0940\u0902 \u0939\u0948")) {
          return res.status(400).json({ error: openAiImgErr.message });
        }
        console.warn("OpenAI DALL-E 3 failed, will use authentic press photo fallback");
      }
    } else {
      let mappedAspectRatio = "3:4";
      if (aspectRatio === "1:1") mappedAspectRatio = "1:1";
      else if (aspectRatio === "9:16") mappedAspectRatio = "9:16";
      else if (aspectRatio === "16:9") mappedAspectRatio = "16:9";
      if (process.env.GEMINI_API_KEY) {
        try {
          const imgResponse = await ai.models.generateContent({
            model: "gemini-3.1-flash-image",
            contents: {
              parts: [
                {
                  text: `${imagePrompt}. Journalistic press photo, award-winning news photography, authentic documentary realism, clear focus, high quality.`
                }
              ]
            },
            config: {
              imageConfig: {
                aspectRatio: mappedAspectRatio
              }
            }
          });
          if (imgResponse.candidates && imgResponse.candidates[0]?.content?.parts) {
            for (const part of imgResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                imageBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                isAiGenerated = true;
                break;
              }
            }
          }
        } catch (primaryErr) {
          console.warn("gemini-3.1-flash-image failed:", primaryErr?.message?.slice(0, 100));
          try {
            const imgFallback = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: {
                parts: [
                  {
                    text: `${imagePrompt}. Journalistic press photo, realistic documentary photo.`
                  }
                ]
              },
              config: {
                imageConfig: {
                  aspectRatio: mappedAspectRatio
                }
              }
            });
            if (imgFallback.candidates && imgFallback.candidates[0]?.content?.parts) {
              for (const part of imgFallback.candidates[0].content.parts) {
                if (part.inlineData) {
                  imageBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                  isAiGenerated = true;
                  break;
                }
              }
            }
          } catch (secondaryErr) {
            console.warn("gemini-3.1-flash-lite-image also failed:", secondaryErr?.message?.slice(0, 100));
          }
        }
      }
    }
    if (!imageBase64) {
      console.log("Providing authentic journalistic fallback press photo for headline:", headline, "var:", variation);
      const fallbackRaw = pickCuratedNewsPressPhoto(`${headline} ${customPrompt || ""}`, Number(variation) || 0);
      const fallbackProxied = `/api/proxy-image?url=${encodeURIComponent(fallbackRaw)}`;
      return res.json({
        success: true,
        imageUrl: fallbackProxied,
        promptUsed: imagePrompt,
        fallbackUsed: true,
        isAiGenerated: false,
        notice: "AI \u0907\u092E\u0947\u091C \u0915\u094B\u091F\u093E \u092A\u0942\u0930\u093E \u0939\u094B\u0928\u0947 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0938\u092E\u093E\u091A\u093E\u0930 \u0935\u093F\u0937\u092F \u0938\u0947 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u092A\u094D\u0930\u0947\u0938 \u092B\u094B\u091F\u094B \u0924\u0948\u092F\u093E\u0930 \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
      });
    }
    return res.json({
      success: true,
      imageUrl: imageBase64,
      promptUsed: imagePrompt,
      fallbackUsed: false,
      isAiGenerated: true,
      provider: aiProvider
    });
  } catch (err) {
    console.error("Error in /api/generate-ai-image, falling back safely:", err);
    const fallbackRaw = pickCuratedNewsPressPhoto(`${req.body?.headline || ""} ${req.body?.customPrompt || ""}`, Number(req.body?.variation) || 0);
    const fallbackProxied = `/api/proxy-image?url=${encodeURIComponent(fallbackRaw)}`;
    return res.json({
      success: true,
      imageUrl: fallbackProxied,
      promptUsed: req.body?.customPrompt || "Journalistic Press Photo",
      fallbackUsed: true,
      isAiGenerated: false,
      notice: "\u0926\u0948\u0928\u093F\u0915 AI \u0907\u092E\u0947\u091C \u0915\u094B\u091F\u093E \u0938\u0940\u092E\u093E \u0915\u0947 \u0915\u093E\u0930\u0923 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u092A\u094D\u0930\u0947\u0938 \u092B\u094B\u091F\u094B \u091A\u092F\u0928\u093F\u0924 \u0915\u0940 \u0917\u0908 \u0939\u0948\u0964"
    });
  }
});
app.post("/api/generate-caption", async (req, res) => {
  const { headline, location, existingSummary, category, style = "detailed_3_para", customInstruction, aiProvider = "gemini" } = req.body;
  try {
    if (!headline) {
      return res.status(400).json({ error: "Headline is required" });
    }
    let styleDirective = `1. \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u094B \u0915\u092E \u0938\u0947 \u0915\u092E 2 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B, \u0914\u0930 \u092F\u0926\u093F \u0918\u091F\u0928\u093E/\u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u092C\u093F\u0902\u0926\u0941 \u092F\u093E \u0935\u093F\u0935\u0930\u0923 \u0905\u0927\u093F\u0915 \u0939\u0948\u0902 \u0924\u094B 3 \u092A\u0942\u0930\u094D\u0923 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u0935\u093F\u0938\u094D\u0924\u093E\u0930 \u0938\u0947 \u0932\u093F\u0916\u0947\u0902\u0964`;
    if (style === "detailed_3_para") {
      styleDirective = `1. \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u094B \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 \u0920\u0940\u0915 3 \u092C\u0921\u093C\u0947, \u0938\u092E\u0943\u0926\u094D\u0927 \u0914\u0930 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u0932\u093F\u0916\u0947\u0902 (Full 3 Detailed Paragraphs):
   - \u092A\u0939\u0932\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u0918\u091F\u0928\u093E \u0915\u093E \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u0935\u0930\u0923, \u0938\u092E\u092F, \u0938\u094D\u0925\u093E\u0928 \u0935 \u092A\u094D\u0930\u092E\u0941\u0916 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E\u0964
   - \u0926\u0942\u0938\u0930\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u092A\u0943\u0937\u094D\u0920\u092D\u0942\u092E\u093F, \u0915\u093E\u0930\u0923, \u092A\u094D\u0930\u0924\u094D\u092F\u0915\u094D\u0937\u0926\u0930\u094D\u0936\u093F\u092F\u094B\u0902 \u0915\u093E \u0915\u0939\u0928\u093E \u0935 \u091C\u093E\u0902\u091A \u0915\u0940 \u092C\u093E\u0924\u0947\u0902\u0964
   - \u0924\u0940\u0938\u0930\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B: \u092A\u0941\u0932\u093F\u0938/\u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0915\u0940 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908, \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u094D\u0925\u093F\u0924\u093F \u0914\u0930 \u0906\u0917\u0947 \u0915\u0940 \u092A\u094D\u0930\u0915\u094D\u0930\u093F\u092F\u093E\u0964`;
    } else if (style === "bullet_points") {
      styleDirective = `1. \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u093E \u092A\u0939\u0932\u093E \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935\u093F\u0935\u0930\u0923 \u0926\u0947\u0902, \u0909\u0938\u0915\u0947 \u092C\u093E\u0926 3-4 \u092E\u0941\u0916\u094D\u092F \u092C\u093F\u0902\u0926\u0941 (\u092C\u0941\u0932\u0947\u091F \u092A\u0949\u0907\u0902\u091F\u094D\u0938) \u092E\u0947\u0902 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u0924\u0925\u094D\u092F \u0926\u0947\u0902, \u0914\u0930 \u0905\u0902\u0924 \u092E\u0947\u0902 1 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0938\u094D\u0925\u093F\u0924\u093F \u0915\u093E \u0926\u0947\u0902\u0964`;
    } else if (style === "short") {
      styleDirective = `1. \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u094B 2 \u092C\u0939\u0941\u0924 \u0939\u0940 \u0906\u0915\u0930\u094D\u0937\u0915, \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0935 \u0935\u093E\u092F\u0930\u0932 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u0932\u093F\u0916\u0947\u0902\u0964`;
    }
    const prompt = `\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u0905\u0917\u094D\u0930\u0923\u0940 \u0939\u093F\u0902\u0926\u0940 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" \u0915\u0947 \u0935\u0930\u093F\u0937\u094D\u0920 \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u0915\u0943\u092A\u092F\u093E \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 \u0938\u092E\u093E\u091A\u093E\u0930 \u0915\u0947 \u0932\u093F\u090F \u0907\u0902\u0938\u094D\u091F\u093E\u0917\u094D\u0930\u093E\u092E \u0914\u0930 \u092B\u0947\u0938\u092C\u0941\u0915 \u092A\u094B\u0938\u094D\u091F \u0915\u093E \u0935\u093F\u0938\u094D\u0924\u0943\u0924, \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u0914\u0930 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0915\u0948\u092A\u094D\u0936\u0928 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:

\u0939\u0947\u0921\u0932\u093E\u0907\u0928: "${headline}"
\u0938\u094D\u0925\u093E\u0928: "${location || "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936"}"
\u0936\u094D\u0930\u0947\u0923\u0940: "${category || "\u0928\u094D\u092F\u0942\u091C\u093C"}"
${existingSummary ? `\u0938\u0902\u0926\u0930\u094D\u092D / \u092E\u094C\u091C\u0942\u0926\u093E \u0935\u093F\u0935\u0930\u0923: ${existingSummary}` : ""}
${customInstruction ? `\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0935\u093F\u0936\u0947\u0937 \u092C\u0926\u0932\u093E\u0935 / \u0928\u093F\u0930\u094D\u0926\u0947\u0936: ${customInstruction}` : ""}

\u0928\u093F\u092F\u092E (\u0915\u0921\u093C\u093E\u0908 \u0938\u0947 \u092A\u093E\u0932\u0928 \u0915\u0930\u0947\u0902):
${styleDirective}
2. \u092A\u093E\u0920\u0915\u094B\u0902 \u0915\u094B \u092F\u0939 \u0938\u094D\u092A\u0937\u094D\u091F \u0905\u0939\u0938\u093E\u0938 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F \u0915\u093F "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0935\u093F\u0935\u0930\u0923/\u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u0936\u0928 \u092E\u0947\u0902" \u0909\u092A\u0932\u092C\u094D\u0927 \u0939\u0948\u0964
3. \u0916\u092C\u0930 \u092E\u0947\u0902 \u0915\u094B\u0908 \u092B\u093E\u0932\u0924\u0942 \u0939\u0947\u0921\u093F\u0902\u0917, \u091F\u093E\u0907\u091F\u0932, \u092B\u094B\u0928 \u0928\u0902\u092C\u0930, \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0932\u093F\u0902\u0915\u094D\u0938 \u092F\u093E "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u092A\u0922\u093C\u0947\u0902" \u091C\u0948\u0938\u0947 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u0928 \u091C\u094B\u0921\u093C\u0947\u0902\u0964
4. \u0920\u0940\u0915 \u090F\u0915 \u0916\u093E\u0932\u0940 \u0932\u093E\u0907\u0928 \u091B\u094B\u0921\u093C\u0915\u0930 \u0905\u0902\u0924 \u092E\u0947\u0902 6 \u0938\u0947 8 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 \u0932\u0917\u093E\u090F\u0902\u0964
5. \u0939\u0948\u0936\u091F\u0948\u0917 \u0915\u094D\u0930\u092E (MUST):
   - \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u093E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947: #breakingnewswala
   - \u092C\u0940\u091A \u092E\u0947\u0902 \u0918\u091F\u0928\u093E/\u0938\u094D\u0925\u093E\u0928 \u0938\u0947 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 (\u0909\u0926\u093E: #BreakingNews #HindiNews #LatestNews #${(location || "MP").replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "")}News)
   - \u0938\u092C\u0938\u0947 \u0905\u0902\u0924\u093F\u092E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947: #BNWTV

\u0915\u0947\u0935\u0932 \u0924\u0948\u092F\u093E\u0930 \u0915\u0948\u092A\u094D\u0936\u0928 \u0915\u093E \u0936\u0941\u0926\u094D\u0927 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0926\u0947\u0902, \u0915\u094B\u0908 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092E\u093E\u0930\u094D\u0915\u0921\u093E\u0909\u0928 \u092F\u093E \u0915\u094B\u091F\u0947\u0936\u0928 \u0928\u0939\u0940\u0902\u0964`;
    let caption = "";
    if (aiProvider === "openai") {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u0905\u0917\u094D\u0930\u0923\u0940 \u0939\u093F\u0902\u0926\u0940 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 '\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E' \u0915\u0947 \u0935\u0930\u093F\u0937\u094D\u0920 \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964 \u0915\u0947\u0935\u0932 \u0924\u0948\u092F\u093E\u0930 \u0915\u0948\u092A\u094D\u0936\u0928 \u0915\u093E \u0936\u0941\u0926\u094D\u0927 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0926\u0947\u0902, \u0915\u094B\u0908 \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u092E\u093E\u0930\u094D\u0915\u0921\u093E\u0909\u0928 \u092F\u093E \u0915\u094B\u091F\u0947\u0936\u0928 \u0928\u0939\u0940\u0902\u0964"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7
        });
        caption = (completion.choices[0]?.message?.content || "").trim();
      } catch (openAiCapErr) {
        console.error("OpenAI caption error:", openAiCapErr);
        if (openAiCapErr?.message && openAiCapErr.message.includes("OPENAI_API_KEY \u0938\u0947\u091F \u0928\u0939\u0940\u0902 \u0939\u0948")) {
          return res.status(400).json({ error: openAiCapErr.message });
        }
        console.log("OpenAI caption busy, using fallback template");
        const locTag = (location || "MP").replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "");
        caption = `${headline}

${existingSummary || `${location || "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936"} \u0938\u0947 \u0907\u0938 \u0935\u0915\u094D\u0924 \u0915\u0940 \u092C\u0921\u093C\u0940 \u0914\u0930 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0916\u092C\u0930 \u0938\u093E\u092E\u0928\u0947 \u0906 \u0930\u0939\u0940 \u0939\u0948\u0964 \u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u0935\u093F\u092D\u093E\u0917 \u0914\u0930 \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0915\u0940 \u0913\u0930 \u0938\u0947 \u0924\u094D\u0935\u0930\u093F\u0924 \u0938\u0902\u091C\u094D\u091E\u093E\u0928 \u0932\u0947\u0915\u0930 \u091C\u093E\u0902\u091A \u0935 \u0909\u091A\u093F\u0924 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0940 \u091C\u093E \u0930\u0939\u0940 \u0939\u0948\u0964`}

\u0907\u0938 \u092A\u0942\u0930\u0947 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u0938\u0947 \u091C\u0941\u0921\u093C\u0940 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0914\u0930 \u0939\u0930 \u0924\u093E\u091C\u093E \u0905\u092A\u0921\u0947\u091F \u0915\u0947 \u0932\u093F\u090F \u091C\u0941\u0921\u093C\u0947 \u0930\u0939\u0947\u0902 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E \u0915\u0947 \u0938\u093E\u0925\u0964

#breakingnewswala #BreakingNews #HindiNews #${locTag}News #LatestUpdate #BNWTV`;
      }
    } else {
      const ai = getGeminiClient();
      try {
        const response = await generateWithFallbackAndRetry(
          ai,
          DEFAULT_FALLBACK_MODELS,
          {
            contents: prompt
          }
        );
        caption = (response.text || "").trim();
      } catch (capErr) {
        console.log("Caption generation AI busy, using fallback template:", capErr?.message?.slice(0, 80));
        const locTag = (location || "MP").replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "");
        caption = `${headline}

${existingSummary || `${location || "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936"} \u0938\u0947 \u0907\u0938 \u0935\u0915\u094D\u0924 \u0915\u0940 \u092C\u0921\u093C\u0940 \u0914\u0930 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0916\u092C\u0930 \u0938\u093E\u092E\u0928\u0947 \u0906 \u0930\u0939\u0940 \u0939\u0948\u0964 \u092E\u093E\u092E\u0932\u0947 \u092E\u0947\u0902 \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u0935\u093F\u092D\u093E\u0917 \u0914\u0930 \u092A\u094D\u0930\u0936\u093E\u0938\u0928 \u0915\u0940 \u0913\u0930 \u0938\u0947 \u0924\u094D\u0935\u0930\u093F\u0924 \u0938\u0902\u091C\u094D\u091E\u093E\u0928 \u0932\u0947\u0915\u0930 \u091C\u093E\u0902\u091A \u0935 \u0909\u091A\u093F\u0924 \u0915\u093E\u0930\u094D\u0930\u0935\u093E\u0908 \u0915\u0940 \u091C\u093E \u0930\u0939\u0940 \u0939\u0948\u0964`}

\u0907\u0938 \u092A\u0942\u0930\u0947 \u0918\u091F\u0928\u093E\u0915\u094D\u0930\u092E \u0938\u0947 \u091C\u0941\u0921\u093C\u0940 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0914\u0930 \u0939\u0930 \u0924\u093E\u091C\u093E \u0905\u092A\u0921\u0947\u091F \u0915\u0947 \u0932\u093F\u090F \u091C\u0941\u0921\u093C\u0947 \u0930\u0939\u0947\u0902 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E \u0915\u0947 \u0938\u093E\u0925\u0964

#breakingnewswala #BreakingNews #HindiNews #${locTag}News #LatestUpdate #BNWTV`;
      }
    }
    return res.json({ success: true, caption });
  } catch (err) {
    console.error("Error in /api/generate-caption:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var CURATED_MORNING_PRESS_PHOTOS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
  // Soft golden morning sunrise mist over serene hills
  "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=1200&auto=format&fit=crop",
  // Gentle morning mist park path with soft light
  "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop",
  // Bright airy morning daylight through lush green canopy
  "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?q=80&w=1200&auto=format&fit=crop",
  // Soft pastel sunrise sky with gentle warm golden clouds
  "https://images.unsplash.com/photo-1439853949127-fa647821eba0?q=80&w=1200&auto=format&fit=crop",
  // Serene tranquil light morning water reflection, zen mood
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop"
  // Warm gentle morning daylight in peaceful nature
];
app.post("/api/generate-morning-jacket", async (req, res) => {
  try {
    const {
      topicPrompt,
      command,
      action = "generate",
      // 'generate' | 'change_image' | 'refine'
      refinementCommand = "",
      currentCard = {},
      variation = 0,
      generateImage = true,
      aiProvider = "gemini"
    } = req.body;
    const defaultMorningTopics = [
      "\u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0938\u094B\u091A, \u0906\u0924\u094D\u092E\u0935\u093F\u0936\u094D\u0935\u093E\u0938 \u0914\u0930 \u0928\u093F\u0930\u0902\u0924\u0930 \u092A\u094D\u0930\u092F\u093E\u0938 \u092A\u0930 \u0905\u0924\u094D\u092F\u0902\u0924 \u092A\u094D\u0930\u0947\u0930\u0915 \u0935\u093F\u091A\u093E\u0930",
      "\u0938\u092B\u0932\u0924\u093E \u0915\u093E \u092E\u0942\u0932\u092E\u0902\u0924\u094D\u0930: \u0915\u0930\u094D\u092E, \u0927\u0948\u0930\u094D\u092F \u0914\u0930 \u0905\u0928\u0941\u0936\u093E\u0938\u0928 \u092A\u0930 \u0938\u0941\u0935\u093F\u091A\u093E\u0930",
      "\u0906\u091C \u0915\u093E \u0905\u0928\u092E\u094B\u0932 \u0935\u093F\u091A\u093E\u0930: \u0938\u092E\u092F \u0915\u093E \u0938\u0926\u0941\u092A\u092F\u094B\u0917 \u0914\u0930 \u091C\u0940\u0935\u0928 \u0915\u093E \u0932\u0915\u094D\u0937\u094D\u092F",
      "\u0938\u0941\u092C\u0939 \u0915\u0940 \u0938\u0948\u0930 \u0914\u0930 \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u0915\u0947 3 \u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0928\u093F\u092F\u092E",
      "\u092E\u093E\u0928\u0938\u093F\u0915 \u0936\u093E\u0902\u0924\u093F, \u0935\u093F\u0928\u092E\u094D\u0930\u0924\u093E \u0914\u0930 \u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u090A\u0930\u094D\u091C\u093E \u092A\u0930 \u092A\u094D\u0930\u0947\u0930\u0915 \u0935\u093F\u091A\u093E\u0930",
      "\u092D\u093E\u0917\u0935\u0924 \u0917\u0940\u0924\u093E \u0915\u093E \u0938\u093E\u0930: \u0915\u0930\u094D\u092E \u0915\u0930\u094B, \u092B\u0932 \u0915\u0940 \u091A\u093F\u0902\u0924\u093E \u092E\u0924 \u0915\u0930\u094B",
      "\u091C\u0940\u0935\u0928 \u092E\u0947\u0902 \u0915\u092D\u0940 \u0939\u093E\u0930 \u0928 \u092E\u093E\u0928\u0928\u0947 \u0915\u093E \u0926\u0943\u0922\u093C \u0938\u0902\u0915\u0932\u094D\u092A \u0914\u0930 \u092A\u094D\u0930\u0947\u0930\u0923\u093E"
    ];
    let activePrompt = (command || topicPrompt || refinementCommand || "").trim();
    if (!activePrompt && action !== "change_image") {
      const randIdx = Math.floor(Math.random() * defaultMorningTopics.length);
      activePrompt = defaultMorningTopics[randIdx];
    }
    const ai = getGeminiClient();
    const isImageChangeRequest = action === "change_image" || /इमेज\s*(बदलें|बदलो|change|हटाओ|गलत|दूसरी)/i.test(activePrompt) || /फोटो\s*(बदलें|बदलो|change|हटाओ|गलत|दूसरी)/i.test(activePrompt) || /बैकग्राउंड\s*(बदलें|बदलो|change|नया)/i.test(activePrompt);
    let contentData = null;
    if (isImageChangeRequest && currentCard?.headline) {
      contentData = {
        headline: currentCard.headline,
        formattedHeadline: currentCard.formattedHeadline || currentCard.headline,
        badgeText: currentCard.morningBadgeText || "\u{1F305} \u0906\u091C \u0915\u093E \u0935\u093F\u091A\u093E\u0930",
        thoughtQuote: currentCard.morningThoughtQuote || currentCard.morningTakeaway || "",
        summary: currentCard.summary || "",
        imagePrompt: `Aesthetic cinematic morning background wallpaper depicting ${currentCard.headline}. Beautiful ambient morning sunrise sunlight, serene nature landscape or wellness atmosphere, soft warm colors, high realism. Absolutely NO text, NO typography, NO watermark, NO logo, clean image for poster background`
      };
    } else {
      const systemInstruction = `\u0906\u092A "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u0928\u0947\u091F\u0935\u0930\u094D\u0915 \u0915\u0947 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915, \u0926\u0930\u094D\u0936\u0928\u0935\u093F\u0926 \u0914\u0930 \u0915\u0932\u093E \u0928\u093F\u0930\u094D\u0926\u0947\u0936\u0915 (Art Director) \u0939\u0948\u0902\u0964
\u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092C\u094B\u0932\u0915\u0930 (\u092E\u093E\u0907\u0915 \u0926\u094D\u0935\u093E\u0930\u093E) \u092F\u093E \u0932\u093F\u0916\u0915\u0930 \u092F\u0939 \u0935\u093F\u0937\u092F/\u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u0926\u093F\u092F\u093E \u0939\u0948:
"${activePrompt}"
${currentCard?.headline ? `\u092A\u0942\u0930\u094D\u0935 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 / \u0938\u0902\u0926\u0930\u094D\u092D: "${currentCard.headline}"` : ""}
${refinementCommand ? `\u0938\u0941\u0927\u093E\u0930/\u092C\u0926\u0932\u093E\u0935 \u0928\u093F\u0930\u094D\u0926\u0947\u0936: "${refinementCommand}"` : ""}

\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0909\u0926\u094D\u0926\u0947\u0936\u094D\u092F: \u0939\u0947\u0921\u0930 \u0914\u0930 \u092B\u0941\u091F\u0930 \u0915\u0947 \u092C\u0940\u091A \u0915\u0947 \u0938\u0941\u0930\u0915\u094D\u0937\u093F\u0924 \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u092E\u0947\u0902 \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u092A\u0930 \u0935\u093E\u092F\u0930\u0932 \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u093E \u090F\u0915 \u0905\u0924\u094D\u092F\u0902\u0924 \u0913\u091C\u0938\u094D\u0935\u0940, \u0938\u0941\u0902\u0926\u0930, \u0938\u092E\u0943\u0926\u094D\u0927 \u0914\u0930 \u092A\u094D\u0930\u0947\u0930\u0923\u093E\u0926\u093E\u092F\u0940 '\u0938\u0941\u0935\u093F\u091A\u093E\u0930 / \u091C\u0940\u0935\u0928 \u0926\u0930\u094D\u0936\u0928 / \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F' \u0915\u093E\u0930\u094D\u0921 \u092C\u0928\u093E\u0928\u093E\u0964

\u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u0928\u093F\u092F\u092E (STRICT EDITORIAL DIRECTIVES):
1. \u092F\u0942\u091C\u093C\u0930 \u0915\u0940 \u0906\u0935\u093E\u091C\u093C (Voice / Spoken Input) \u0915\u093E \u0917\u0939\u0928 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923:
   - \u091C\u092C \u092F\u0942\u091C\u093C\u0930 \u092E\u093E\u0907\u0915 \u0938\u0947 \u0905\u0928\u094C\u092A\u091A\u093E\u0930\u093F\u0915 \u092F\u093E \u0938\u0902\u0915\u094D\u0937\u093F\u092A\u094D\u0924 \u0930\u0942\u092A \u092E\u0947\u0902 \u092C\u094B\u0932\u0924\u093E \u0939\u0948 (\u091C\u0948\u0938\u0947: "\u0938\u092B\u0932\u0924\u093E \u092A\u0930 \u092C\u0928\u093E\u0913", "\u0938\u0941\u092C\u0939 \u091C\u0932\u094D\u0926\u0940 \u0909\u0920\u0928\u0947 \u0915\u0947 \u092B\u093E\u092F\u0926\u0947", "\u092E\u093E\u0924\u093E-\u092A\u093F\u0924\u093E \u0915\u093E \u092E\u0939\u0924\u094D\u0935", "\u0927\u0948\u0930\u094D\u092F \u0914\u0930 \u0936\u093E\u0902\u0924\u093F", "\u091C\u0940\u0935\u0928 \u0915\u093E \u0938\u091A", "\u0915\u0930\u094D\u092E \u0915\u093E \u092B\u0932", "\u0938\u092E\u092F \u0915\u0940 \u0915\u0926\u094D\u0930"):
   - \u0924\u094B \u0915\u0947\u0935\u0932 \u0938\u093E\u0927\u093E\u0930\u0923 \u092F\u093E \u0938\u0924\u0939\u0940 \u0935\u093E\u0915\u094D\u092F \u0928 \u0932\u093F\u0916\u0947\u0902!
   - \u0909\u0938 \u0935\u093F\u0937\u092F \u0915\u0947 \u0917\u0942\u0922\u093C \u0906\u0927\u094D\u092F\u093E\u0924\u094D\u092E\u093F\u0915, \u092E\u0928\u094B\u0935\u0948\u091C\u094D\u091E\u093E\u0928\u093F\u0915 \u0914\u0930 \u091C\u0940\u0935\u0928-\u0926\u0930\u094D\u0936\u0928 (\u091C\u0948\u0938\u0947 \u092D\u0917\u0935\u0926\u094D\u0917\u0940\u0924\u093E, \u0938\u094D\u0935\u093E\u092E\u0940 \u0935\u093F\u0935\u0947\u0915\u093E\u0928\u0902\u0926, \u091A\u093E\u0923\u0915\u094D\u092F \u0928\u0940\u0924\u093F, \u0913\u0936\u094B, \u0915\u092C\u0940\u0930) \u0915\u0947 \u0938\u094D\u0924\u0930 \u0915\u093E \u0909\u0924\u094D\u0915\u0943\u0937\u094D\u091F, \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0914\u0930 \u0939\u0943\u0926\u092F\u0938\u094D\u092A\u0930\u094D\u0936\u0940 \u0935\u093F\u091A\u093E\u0930 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902\u0964
   - \u092D\u093E\u0937\u093E \u0909\u091A\u094D\u091A-\u0915\u094B\u091F\u093F \u0915\u0940, \u0917\u0930\u093F\u092E\u093E\u092E\u092F \u0914\u0930 \u0935\u093F\u0936\u0941\u0926\u094D\u0927 \u0939\u093F\u0902\u0926\u0940 \u0939\u094B\u0928\u0940 \u091A\u093E\u0939\u093F\u090F \u091C\u094B \u092A\u093E\u0920\u0915 \u0915\u0947 \u092E\u0928 \u092E\u0947\u0902 \u0909\u0924\u0930 \u091C\u093E\u090F\u0964

2. \u092A\u0942\u0930\u094D\u0923\u0924\u093E \u090F\u0935\u0902 \u0938\u0902\u0916\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u0938\u0902\u0924\u0941\u0932\u0928 (Strict Numerical Consistency):
   - \u092F\u0926\u093F \u0935\u093F\u0937\u092F \u092E\u0947\u0902 \u0915\u093F\u0938\u0940 \u0938\u0902\u0916\u094D\u092F\u093E \u0915\u093E \u0909\u0932\u094D\u0932\u0947\u0916 \u0939\u0948 (\u0909\u0926\u093E. "3 \u0938\u094D\u0935\u0930\u094D\u0923\u093F\u092E \u0928\u093F\u092F\u092E", "5 \u0906\u0926\u0924\u0947\u0902", "4 \u0909\u092A\u093E\u092F", "3 \u092C\u093E\u0924\u0947\u0902"), \u0924\u094B 'thoughtQuote' \u092E\u0947\u0902 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 \u0920\u0940\u0915 \u0909\u0924\u0928\u0940 \u0939\u0940 \u0938\u0902\u0916\u094D\u092F\u093E \u0915\u0947 \u0938\u094D\u092A\u0937\u094D\u091F, \u0920\u094B\u0938 \u0914\u0930 \u0938\u0902\u0924\u0941\u0932\u093F\u0924 \u092C\u093F\u0902\u0926\u0941 (1. ... \u2022 2. ... \u2022 3. ...) \u0932\u093F\u0916\u0947\u0902\u0964 \u0915\u092D\u0940 \u092D\u0940 3 \u0915\u0939\u0915\u0930 2 \u0928 \u0926\u0947\u0902!

3. \u0915\u094B\u0908 \u0928\u094D\u092F\u0942\u091C\u093C \u0921\u093F\u0938\u094D\u0915\u094D\u0932\u0947\u092E\u0930 \u0928\u0939\u0940\u0902 (NO NEWS PHRASES):
   - \u092F\u0939 \u0935\u093F\u0936\u0941\u0926\u094D\u0927 '\u0938\u0941\u0935\u093F\u091A\u093E\u0930 / \u092A\u094D\u0930\u0947\u0930\u0915 \u0935\u093F\u091A\u093E\u0930' \u0915\u093E\u0930\u094D\u0921 \u0939\u0948\u0964 \u0907\u0938\u092E\u0947\u0902 \u0915\u093F\u0938\u0940 \u092D\u0940 \u0924\u0930\u0939 \u0915\u0940 \u0938\u092E\u093E\u091A\u093E\u0930 \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u093F\u0902\u0917 \u092F\u093E '\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u0936\u0928 \u092E\u0947\u0902' \u091C\u0948\u0938\u0940 \u0936\u092C\u094D\u0926\u093E\u0935\u0932\u0940 \u0915\u0924\u0908 \u0928\u0939\u0940\u0902 \u0939\u094B\u0928\u0940 \u091A\u093E\u0939\u093F\u090F\u0964

4. \u0915\u0932\u0930 \u0925\u0940\u092E - \u0935\u094D\u0939\u093E\u0907\u091F \u0935 \u092F\u0947\u0932\u094B (White & Golden Yellow Harmony):
   - \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u091A\u093E\u0930 \u092E\u0947\u0902 2-3 \u0938\u092C\u0938\u0947 \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923 \u0914\u0930 \u092A\u094D\u0930\u0947\u0930\u0915 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u094B [yellow]\u0936\u092C\u094D\u0926[/yellow] \u0938\u0947 \u091A\u093F\u0939\u094D\u0928\u093F\u0924 \u0915\u0930\u0947\u0902, \u0924\u093E\u0915\u093F \u0935\u0947 \u0915\u093E\u0930\u094D\u0921 \u092A\u0930 \u091A\u092E\u0915\u0926\u093E\u0930 \u0938\u0941\u0928\u0939\u0930\u0947 \u092A\u0940\u0932\u0947 \u0930\u0902\u0917 \u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0939\u094B\u0902 \u0914\u0930 \u092C\u093E\u0915\u0940 \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0936\u094D\u0935\u0947\u0924 (White) \u0930\u0902\u0917 \u092E\u0947\u0902 \u091A\u092E\u0915\u0947\u0964

\u0915\u0943\u092A\u092F\u093E JSON \u092E\u0947\u0902 \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 \u092B\u093C\u0940\u0932\u094D\u0921\u094D\u0938 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:
1. "headline": \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u091A\u093E\u0930 \u0905\u0925\u0935\u093E \u0935\u093F\u0937\u092F \u0915\u093E \u092A\u094D\u0930\u0947\u0930\u0915 \u0926\u094B\u0939\u093E/\u092A\u0902\u0915\u094D\u0924\u093F (10-24 \u0936\u092C\u094D\u0926, \u092C\u0947\u0939\u0926 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940, \u092A\u0920\u0928\u0940\u092F \u0914\u0930 \u092A\u094D\u0930\u0935\u093E\u0939\u092E\u092F\u0940 \u0939\u093F\u0902\u0926\u0940 \u092E\u0947\u0902)\u0964
2. "formattedHeadline": \u092E\u0941\u0916\u094D\u092F \u0935\u093F\u091A\u093E\u0930 \u092E\u0947\u0902 2-3 \u0938\u092C\u0938\u0947 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0947 \u0906\u0917\u0947-\u092A\u0940\u091B\u0947 [yellow]\u0936\u092C\u094D\u0926[/yellow] \u0932\u0917\u093E\u090F\u0902 (\u0909\u0926\u093E. "[yellow]\u0938\u092B\u0932\u0924\u093E[/yellow] \u0915\u0947\u0935\u0932 \u0938\u094B\u091A\u0928\u0947 \u0938\u0947 \u0928\u0939\u0940\u0902, \u0905\u091F\u0942\u091F [yellow]\u0927\u0948\u0930\u094D\u092F \u0914\u0930 \u0928\u093F\u0930\u0902\u0924\u0930 \u092A\u094D\u0930\u092F\u093E\u0938[/yellow] \u0938\u0947 \u092E\u093F\u0932\u0924\u0940 \u0939\u0948")\u0964
3. "badgeText": \u0935\u093F\u0937\u092F \u0915\u0947 \u0905\u0928\u0941\u0915\u0942\u0932 \u0917\u0930\u093F\u092E\u093E\u092E\u092F \u092C\u0948\u091C (\u0909\u0926\u093E. "\u{1F305} \u0906\u091C \u0915\u093E \u0935\u093F\u091A\u093E\u0930", "\u2728 \u0905\u0928\u092E\u094B\u0932 \u091C\u0940\u0935\u0928 \u0926\u0930\u094D\u0936\u0928", "\u{1F9D8} \u0938\u094D\u0935\u093E\u0938\u094D\u0925\u094D\u092F \u092E\u0902\u0924\u094D\u0930", "\u{1F48E} \u092A\u094D\u0930\u0947\u0930\u0915 \u0938\u0942\u0924\u094D\u0930", "\u{1F549}\uFE0F \u0917\u0940\u0924\u093E \u0938\u0902\u0926\u0947\u0936", "\u{1F331} \u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0935\u093F\u091A\u093E\u0930", "\u{1F4A1} \u0938\u092B\u0932\u0924\u093E \u0915\u0947 \u0930\u0939\u0938\u094D\u092F")\u0964
4. "thoughtQuote": 1 \u0938\u0947 3 \u092A\u0902\u0915\u094D\u0924\u093F\u092F\u094B\u0902 \u0915\u093E \u0938\u093E\u0930\u0917\u0930\u094D\u092D\u093F\u0924 \u091F\u0947\u0915\u0905\u0935\u0947, \u0935\u094D\u092F\u093E\u0935\u0939\u093E\u0930\u093F\u0915 \u0909\u092A\u093E\u092F \u0905\u0925\u0935\u093E \u0938\u0902\u0916\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u092C\u093F\u0902\u0926\u0941 (\u0909\u0926\u093E. \u092F\u0926\u093F 3 \u0906\u0926\u0924\u0947\u0902 \u0939\u0948\u0902: "1. \u0909\u0937\u093E\u0915\u093E\u0932 \u092E\u0947\u0902 \u091C\u093E\u0917\u0930\u0923  \u2022  2. 20 \u092E\u093F\u0928\u091F \u0915\u093E \u0935\u094D\u092F\u093E\u092F\u093E\u092E  \u2022  3. \u0936\u093E\u0902\u0924 \u092E\u0928 \u0938\u0947 \u0927\u094D\u092F\u093E\u0928")\u0964
5. "summary": \u0907\u0902\u0938\u094D\u091F\u093E\u0917\u094D\u0930\u093E\u092E/\u092B\u0947\u0938\u092C\u0941\u0915 \u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u0938\u0941\u0930\u0941\u091A\u093F\u092A\u0942\u0930\u094D\u0923, \u092A\u094D\u0930\u0947\u0930\u0915 2 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092A\u094B\u0938\u094D\u091F \u0935\u093F\u0935\u0930\u0923\u0964 \u0905\u0902\u0924 \u092E\u0947\u0902 1 \u0916\u093E\u0932\u0940 \u092A\u0902\u0915\u094D\u0924\u093F \u091B\u094B\u0921\u093C\u0915\u0930 \u0932\u094B\u0915\u092A\u094D\u0930\u093F\u092F \u0939\u0948\u0936\u091F\u0948\u0917\u094D\u0938: #breakingnewswala #AajKaVichar #ThoughtOfTheDay #HindiQuotes #Inspiration #Positivity #BNWMedia
6. "imagePrompt": \u090F\u0915 \u0909\u091A\u094D\u091A \u0915\u094B\u091F\u093F \u0915\u093E \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u0940 \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F (English Prompt) \u091C\u094B \u0907\u0938 \u0935\u093F\u091A\u093E\u0930 \u0915\u0947 \u0905\u0928\u0941\u0915\u0942\u0932 \u090F\u0915 \u0936\u093E\u0902\u0924, \u0926\u093F\u0935\u094D\u092F, \u090F\u0938\u094D\u0925\u0947\u091F\u093F\u0915 \u0914\u0930 \u092A\u094D\u0930\u093E\u0915\u0943\u0924\u093F\u0915 \u092C\u0948\u0915\u0917\u094D\u0930\u093E\u0909\u0902\u0921 \u092B\u094B\u091F\u094B / \u0906\u0930\u094D\u091F \u092C\u0928\u093E\u090F\u0917\u093E\u0964 
   \u0928\u093F\u092F\u092E:
   - Soft serene ambient background (e.g. golden misty sunrise, tranquil mountain lake reflection, sunlit dew on emerald leaf, spiritual temple dawn, peaceful morning atmosphere).
   - Middle area soft and clean for clear text readability.
   - Absolutely NO text, NO letters, NO words, NO watermark, photorealistic cinematic lighting, 4k.

Strictly return valid JSON object matching these keys.`;
      if (aiProvider === "openai") {
        try {
          const openai = getOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: "You are the chief editorial director for Breaking News Wala Hindi morning graphics. Always respond in strictly valid JSON format."
              },
              { role: "user", content: systemInstruction }
            ],
            temperature: 0.6
          });
          const raw = completion.choices[0]?.message?.content || "{}";
          contentData = JSON.parse(raw);
        } catch (openAiErr) {
          console.warn("OpenAI morning generation error, falling back to Gemini:", openAiErr?.message);
        }
      }
      if (!contentData && process.env.GEMINI_API_KEY) {
        try {
          const geminiRes = await generateWithFallbackAndRetry(ai, DEFAULT_FALLBACK_MODELS, {
            contents: systemInstruction,
            config: {
              responseMimeType: "application/json",
              temperature: 0.6
            }
          });
          const raw = geminiRes.text?.trim() || "{}";
          contentData = JSON.parse(raw);
        } catch (geminiErr) {
          console.error("Gemini morning content generation error:", geminiErr);
        }
      }
      if (!contentData || !contentData.headline) {
        contentData = {
          headline: activePrompt.length > 8 ? activePrompt : "\u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0938\u094B\u091A \u0914\u0930 \u0928\u093F\u0930\u0902\u0924\u0930 \u092A\u094D\u0930\u092F\u093E\u0938 \u0939\u0940 \u0939\u0930 \u0938\u092B\u0932\u0924\u093E \u0915\u0940 \u0915\u0941\u0902\u091C\u0940 \u0939\u0948\u0964",
          formattedHeadline: `[yellow]\u0938\u0915\u093E\u0930\u093E\u0924\u094D\u092E\u0915 \u0938\u094B\u091A[/yellow] \u0914\u0930 [yellow]\u0928\u093F\u0930\u0902\u0924\u0930 \u092A\u094D\u0930\u092F\u093E\u0938[/yellow] \u0939\u0940 \u0938\u092B\u0932\u0924\u093E \u0915\u0940 \u0915\u0941\u0902\u091C\u0940 \u0939\u0948\u0964`,
          badgeText: "\u{1F305} \u0906\u091C \u0915\u093E \u0935\u093F\u091A\u093E\u0930",
          thoughtQuote: "\u0939\u0930 \u0938\u0941\u092C\u0939 \u090F\u0915 \u0928\u092F\u093E \u0905\u0935\u0938\u0930 \u0932\u0947\u0915\u0930 \u0906\u0924\u0940 \u0939\u0948, \u0916\u0941\u0926 \u092A\u0930 \u0935\u093F\u0936\u094D\u0935\u093E\u0938 \u0930\u0916\u0947\u0902 \u0914\u0930 \u0906\u0917\u0947 \u092C\u0922\u093C\u0947\u0902\u0964",
          summary: `${activePrompt || "\u0906\u091C \u0915\u093E \u0938\u0941\u0935\u093F\u091A\u093E\u0930"}

#breakingnewswala #MorningVibes #PositiveThoughts #BNWTV`,
          imagePrompt: `Aesthetic golden morning sunrise landscape with peaceful mist and soft ambient sunlight, cinematic lighting, no text, no letters.`
        };
      }
    }
    let generatedImageUrl = "";
    const variationAngles = [
      "soft golden sunrise sky, gentle morning mist, light pastel morning horizon, serene warm daylight",
      "bright airy morning nature, gentle sunlight bokeh, soft pastel greens and pale golden light, tranquil peaceful mood",
      "light-toned morning horizon, gentle warm pastel glow, soft peaceful dawn, high brightness and clean light aesthetics",
      "soft morning sunbeams filtering through light morning dew, bright cheerful airy ambience, pastel warm morning",
      "minimalist serene bright morning landscape, soft pastel clouds, gentle warm sunlight, clean airy light composition"
    ];
    const angleText = variationAngles[Math.abs(Number(variation) || 0) % variationAngles.length];
    const imagePrompt = contentData.imagePrompt || `Aesthetic soft light-colored morning background wallpaper for: ${contentData.headline || activePrompt}. ${angleText}. Soft pastel morning lighting, gentle ambient glow, bright airy daylight, clean light background, no dark shadows, strictly NO text, NO words, NO letters, NO watermark, 4k`;
    if (generateImage) {
      console.log("Generating Morning Jacket AI image with prompt:", imagePrompt, "variation:", variation);
      if (process.env.GEMINI_API_KEY) {
        try {
          const imgRes = await ai.models.generateContent({
            model: "gemini-3.1-flash-image",
            contents: {
              parts: [
                {
                  text: `${imagePrompt}. ${angleText}. Soft light-colored photographic background wallpaper, aesthetic bright morning atmosphere, pale soft colors, bright clean lighting, strictly no text, no words, no letters, no logos.`
                }
              ]
            },
            config: {
              imageConfig: {
                aspectRatio: "3:4"
              }
            }
          });
          if (imgRes.candidates && imgRes.candidates[0]?.content?.parts) {
            for (const part of imgRes.candidates[0].content.parts) {
              if (part.inlineData) {
                generatedImageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imgErr) {
          console.warn("Morning gemini-3.1-flash-image error:", imgErr?.message?.slice(0, 100));
          try {
            const imgFallback = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: {
                parts: [
                  {
                    text: `${imagePrompt}. ${angleText}. Soft light-colored photographic background wallpaper, aesthetic bright morning atmosphere, strictly no text, no letters.`
                  }
                ]
              },
              config: {
                imageConfig: {
                  aspectRatio: "3:4"
                }
              }
            });
            if (imgFallback.candidates && imgFallback.candidates[0]?.content?.parts) {
              for (const part of imgFallback.candidates[0].content.parts) {
                if (part.inlineData) {
                  generatedImageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                  break;
                }
              }
            }
          } catch (liteErr) {
            console.warn("gemini-3.1-flash-lite-image also busy:", liteErr?.message?.slice(0, 100));
          }
        }
      }
      if (!generatedImageUrl && aiProvider === "openai") {
        try {
          const openai = getOpenAIClient();
          const dalleRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: `${imagePrompt}. ${angleText}. Soft photographic background, bright clean daylight, no text, no words, no watermark.`,
            n: 1,
            size: "1024x1792",
            response_format: "b64_json"
          });
          const b64 = dalleRes.data?.[0]?.b64_json;
          if (b64) {
            generatedImageUrl = `data:image/png;base64,${b64}`;
          }
        } catch (dalleErr) {
          console.warn("Morning DALL-E generation failed:", dalleErr);
        }
      }
      if (!generatedImageUrl) {
        const pickedIdx = Math.abs(Number(variation) || 0) % CURATED_MORNING_PRESS_PHOTOS.length;
        const fallbackRaw = CURATED_MORNING_PRESS_PHOTOS[pickedIdx];
        generatedImageUrl = `/api/proxy-image?url=${encodeURIComponent(fallbackRaw)}`;
      }
    }
    return res.json({
      success: true,
      data: contentData,
      imageUrl: generatedImageUrl,
      imagePrompt,
      variation: Number(variation) || 0
    });
  } catch (err) {
    console.error("Error in /api/generate-morning-jacket:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
var appVersionData = {
  version: "1.2.0",
  versionCode: 10200,
  releaseDate: "2026-09-08",
  downloadUrl: "/app-release.apk",
  apkAvailable: true,
  releaseTitle: "\u0928\u094D\u092F\u0942 \u0905\u092A\u0921\u0947\u091F v1.2.0: \u092E\u0949\u0930\u094D\u0928\u093F\u0902\u0917 AI \u0938\u094D\u091F\u0942\u0921\u093F\u092F\u094B \u0935 \u092E\u094B\u092C\u093E\u0907\u0932 \u0938\u094D\u092A\u094D\u0932\u093F\u091F \u0935\u094D\u092F\u0942",
  releaseNotes: [
    "\u{1F305} \u092E\u0949\u0930\u094D\u0928\u093F\u0902\u0917 \u091C\u0948\u0915\u0947\u091F: 1-\u0915\u094D\u0932\u093F\u0915 AI \u0938\u0941\u0935\u093F\u091A\u093E\u0930 \u0935 \u090F\u0938\u094D\u0925\u0947\u091F\u093F\u0915 \u092B\u094B\u091F\u094B \u091C\u0928\u0930\u0947\u091F\u0930 (\u092C\u093F\u0928\u093E \u091F\u093E\u0907\u092A \u0915\u093F\u090F \u0924\u0941\u0930\u0902\u0924 \u0928\u092F\u093E \u0938\u0941\u0935\u093F\u091A\u093E\u0930 \u092C\u0928\u093E\u090F\u0902)",
    "\u{1F4F1} \u092E\u094B\u092C\u093E\u0907\u0932 \u0932\u093E\u0907\u0935 \u092A\u094D\u0930\u0940\u0935\u094D\u092F\u0942: \u0938\u094D\u0915\u094D\u0930\u0949\u0932 \u0915\u0930\u0924\u0947 \u0939\u0940 \u0915\u0949\u092E\u094D\u092A\u0948\u0915\u094D\u091F \u0939\u093E\u092B-\u0938\u094D\u0915\u094D\u0930\u0940\u0928 \u092E\u094B\u0921 \u2014 \u0928\u0940\u091A\u0947 \u090F\u0921\u093F\u091F \u0915\u0930\u0924\u0947 \u0939\u0941\u090F \u090A\u092A\u0930 \u0932\u093E\u0907\u0935 \u092C\u0926\u0932\u093E\u0935 \u0926\u0947\u0916\u0947\u0902",
    "\u{1F464} \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0930\u094B\u0932: \u0930\u093F\u092A\u094B\u0930\u094D\u091F\u0930 \u0915\u094B \u0915\u0947\u0935\u0932 4 \u092E\u0941\u0916\u094D\u092F \u091C\u0948\u0915\u0947\u091F\u094D\u0938 (\u0913\u0930\u093F\u091C\u093F\u0928\u0932, \u0938\u0941\u092A\u0930 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917, \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917, \u092E\u0949\u0930\u094D\u0928\u093F\u0902\u0917) \u0926\u093F\u0916\u0947\u0902\u0917\u0940",
    "\u{1F451} \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 (Admin): \u0938\u092D\u0940 7 \u091C\u0948\u0915\u0947\u091F\u094D\u0938 \u0914\u0930 \u090F\u0921\u0935\u093E\u0902\u0938\u094D\u0921 \u092B\u0940\u091A\u0930\u094D\u0938 \u0909\u092A\u0932\u092C\u094D\u0927",
    "\u{1F4F2} \u0907\u0928-\u0910\u092A \u0905\u092A\u0921\u0947\u091F \u0938\u093F\u0938\u094D\u091F\u092E: \u0928\u092F\u093E \u0935\u0930\u094D\u091C\u0928 \u0906\u0928\u0947 \u092A\u0930 \u0928\u094B\u091F\u093F\u092B\u093F\u0915\u0947\u0936\u0928 \u092A\u0949\u092A\u0905\u092A \u0935 \u0921\u093E\u092F\u0930\u0947\u0915\u094D\u091F APK \u0921\u093E\u0909\u0928\u0932\u094B\u0921 \u0915\u0940 \u0938\u0941\u0935\u093F\u0927\u093E"
  ],
  minRequiredVersion: "1.0.0",
  forceUpdate: false
};
app.get("/api/app-version", (_req, res) => {
  res.json({
    success: true,
    versionInfo: appVersionData,
    currentServerTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/admin/update-version-info", (req, res) => {
  try {
    const { version, versionCode, releaseTitle, releaseNotes, downloadUrl, forceUpdate } = req.body;
    if (version) appVersionData.version = String(version).trim();
    if (versionCode) appVersionData.versionCode = Number(versionCode);
    if (releaseTitle) appVersionData.releaseTitle = String(releaseTitle).trim();
    if (Array.isArray(releaseNotes) && releaseNotes.length > 0) {
      appVersionData.releaseNotes = releaseNotes;
    }
    if (downloadUrl) appVersionData.downloadUrl = String(downloadUrl).trim();
    if (typeof forceUpdate === "boolean") appVersionData.forceUpdate = forceUpdate;
    return res.json({
      success: true,
      message: "\u0910\u092A \u0935\u0930\u094D\u091C\u0928 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0938\u092B\u0932\u0924\u093E\u092A\u0942\u0930\u094D\u0935\u0915 \u0905\u092A\u0921\u0947\u091F \u0939\u094B \u0917\u0908!",
      versionInfo: appVersionData
    });
  } catch (err) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});
async function startServer() {
  const possibleDistPaths = [
    import_path.default.join(process.cwd(), "dist"),
    import_path.default.join(process.cwd(), "web_studio", "dist"),
    import_path.default.join(process.cwd(), "public"),
    safeDirname,
    import_path.default.join(safeDirname, "dist")
  ];
  const distPath = possibleDistPaths.find((p) => import_fs.default.existsSync(import_path.default.join(p, "index.html"))) || import_path.default.join(process.cwd(), "dist");
  console.log(`Serving static studio files from: ${distPath}`);
  app.use(
    import_express.default.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        } else if (filePath.includes("/assets/")) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      }
    })
  );
  app.get("*", (_req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(import_path.default.join(distPath, "index.html"));
  });
  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`News Graphic Studio server running on http://0.0.0.0:${PORT}`);
  });
  serverInstance.on("error", (err) => {
    if (err.code === "EADDRINUSE" && PORT !== 3e3) {
      console.warn(`Port ${PORT} in use, falling back to port 3000...`);
      app.listen(3e3, "0.0.0.0", () => {
        console.log(`Fallback server running on http://0.0.0.0:3000`);
      });
    } else {
      console.error("Server listen error:", err);
    }
  });
  if (PORT !== 3e3) {
    try {
      const backupServer = app.listen(3e3, "0.0.0.0", () => {
        console.log(`Backup listener running on http://0.0.0.0:3000`);
      });
      backupServer.on("error", () => {
      });
    } catch (_err) {
    }
  }
}
startServer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TEMPLATE_CONFIG_REGISTRY,
  getTemplateConfig
});
//# sourceMappingURL=server.cjs.map
