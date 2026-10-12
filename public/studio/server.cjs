var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_openai = __toESM(require("openai"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
var dynamicOpenAiKey = process.env.OPENAI_API_KEY || "";
var dynamicCustomDomain = "";
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
function getOpenAIClient() {
  const apiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
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
var DEFAULT_FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash"
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
function createLocalNewsFallback(input, linkUrl) {
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
  let headline = firstLine.replace(/^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|ब्रेकिंग न्यूज|headline:|news:)\s*[:\-\s]*/i, "").trim();
  if (headline.length > 95) {
    headline = headline.slice(0, 92) + "...";
  }
  const words = headline.split(/\s+/);
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

#breakingnewswala #BreakingNews #HindiNews #${locTag}News #${cleanHeadlinePure.slice(0, 15).replace(/\s+/g, "")} #BNWTV`;
  return {
    headline,
    headlineOptions: [
      headline,
      `${detectedLocation}: ${headline}`,
      `\u092C\u0921\u093C\u0940 \u0916\u092C\u0930: ${headline}`
    ],
    highlightWords,
    formattedHeadline,
    location: detectedLocation,
    summary,
    category: "\u0924\u093E\u091C\u093C\u093E \u0916\u093C\u092C\u0930",
    suggestedImagePrompt: `Journalistic news press photo depicting ${headline}, realistic news photography, India`,
    isAiGeneratedPhoto: false,
    speakerName,
    speakerTitle,
    isLocalFallback: true,
    warning: "AI \u092E\u0949\u0921\u0932 \u092A\u0930 \u0905\u0938\u094D\u0925\u093E\u092F\u0940 \u0932\u094B\u0921 \u0915\u0947 \u0915\u093E\u0930\u0923 \u0906\u092A\u0915\u0940 \u0907\u0928\u092A\u0941\u091F \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u0938\u0947 \u0924\u094D\u0935\u0930\u093F\u0924 \u0921\u094D\u0930\u093E\u092B\u094D\u091F \u0924\u0948\u092F\u093E\u0930 \u0915\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u0906\u092A \u0907\u0938\u0947 \u0938\u0940\u0927\u0947 \u0932\u093E\u0917\u0942 \u092F\u093E \u0938\u0902\u092A\u093E\u0926\u093F\u0924 \u0915\u0930 \u0938\u0915\u0924\u0947 \u0939\u0948\u0902\u0964"
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
    const { imageBase64, mimeType = "image/jpeg", userContext } = req.body;
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
    const promptText = `
\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u092A\u094D\u0930\u092E\u0941\u0916 \u0921\u093F\u091C\u093F\u091F\u0932 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" \u0915\u0947 \u0935\u0930\u093F\u0937\u094D\u0920 \u092E\u0941\u0916\u094D\u092F \u0938\u0902\u092A\u093E\u0926\u0915 \u0939\u0948\u0902\u0964
\u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092F\u0939 \u092B\u094B\u091F\u094B \u0905\u092A\u0932\u094B\u0921 \u0915\u0940 \u0939\u0948 \u0914\u0930 \u0928\u094D\u092F\u0942\u091C\u093C \u0915\u093E\u0930\u094D\u0921 (\u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0915\u093E\u0930\u094D\u0921) \u092C\u0928\u093E\u0928\u093E \u091A\u093E\u0939\u0924\u093E \u0939\u0948\u0964

\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0905\u0924\u093F\u0930\u093F\u0915\u094D\u0924 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 / \u0938\u0902\u0926\u0930\u094D\u092D: ${userContext || "\u092B\u094B\u091F\u094B \u0915\u094B \u0938\u092E\u091D\u0915\u0930 \u0927\u092E\u093E\u0915\u0947\u0926\u093E\u0930 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0914\u0930 \u0921\u093F\u091F\u0947\u0932\u094D\u0938 \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902"}

\u092B\u094B\u091F\u094B \u0915\u093E \u092C\u093E\u0930\u0940\u0915\u0940 \u0938\u0947 \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923 \u0915\u0930\u0947\u0902 \u0914\u0930 \u0928\u093F\u092E\u094D\u0928\u0932\u093F\u0916\u093F\u0924 JSON \u092B\u0949\u0930\u094D\u092E\u0947\u091F \u092E\u0947\u0902 \u0930\u093F\u092A\u094D\u0932\u093E\u0908 \u0926\u0947\u0902:
1. "headline": \u090F\u0915 \u092C\u0939\u0941\u0924 \u0939\u0940 \u0906\u0915\u0930\u094D\u0937\u0915, \u0917\u0902\u092D\u0940\u0930, \u0914\u0930 \u0927\u092E\u093E\u0915\u0947\u0926\u093E\u0930 \u0939\u093F\u0902\u0926\u0940 \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (\u0932\u0917\u092D\u0917 12-25 \u0936\u092C\u094D\u0926, \u091C\u0948\u0938\u0947 "\u0930\u0940\u0935\u093E-\u0938\u0940\u0927\u0940 \u0939\u093E\u0908\u0935\u0947 \u092A\u0930 \u0926\u0930\u094D\u0926\u0928\u093E\u0915 \u0938\u0921\u093C\u0915 \u0939\u093E\u0926\u0938\u093E: \u092C\u0938 \u0914\u0930 \u092C\u0932\u094D\u0915\u0930 \u092D\u093F\u0921\u093C\u0947; CM \u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935 \u0928\u0947 \u091C\u0924\u093E\u092F\u093E \u0926\u0941\u0916, \u092E\u0941\u0906\u0935\u091C\u0947 \u0915\u093E \u0910\u0932\u093E\u0928")\u0964
2. "highlightWords": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0915\u0947 \u0935\u0947 \u0938\u092C\u0938\u0947 \u092E\u0941\u0916\u094D\u092F 2 \u0938\u0947 4 \u0936\u092C\u094D\u0926 \u092F\u093E \u0935\u093E\u0915\u094D\u092F\u093E\u0902\u0936 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u092A\u0940\u0932\u0947 (Yellow) \u0930\u0902\u0917 \u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0915\u093F\u092F\u093E \u091C\u093E\u0928\u093E \u091A\u093E\u0939\u093F\u090F (\u091C\u0948\u0938\u0947 \u092C\u0921\u093C\u0947 \u0928\u093E\u092E, \u091C\u0917\u0939, \u0938\u0902\u0916\u094D\u092F\u093E, \u092E\u0941\u0916\u094D\u092F \u0918\u091F\u0928\u093E: "\u0930\u0940\u0935\u093E-\u0938\u0940\u0927\u0940 \u0939\u093E\u0908\u0935\u0947", "CM \u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935", "\u092E\u0941\u0906\u0935\u091C\u0947")\u0964
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
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    console.error("Error in /api/analyze-image:", err);
    return res.status(500).json({
      error: cleanErrorMessage(err)
    });
  }
});
app.post("/api/process-news-command", async (req, res) => {
  const { input, linkUrl, customPrompt } = req.body;
  try {
    if (!input && !linkUrl && !customPrompt) {
      return res.status(400).json({ error: "Please provide a command, text, link or prompt" });
    }
    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please set it in Settings > Secrets."
      });
    }
    let fetchedArticleSnippet = "";
    const pickedImages = {};
    let effectiveInput = (input || "").trim();
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
    const prompt = `
\u0906\u092A \u092D\u093E\u0930\u0924 \u0915\u0947 \u0928\u094D\u092F\u0942\u091C\u093C \u091A\u0948\u0928\u0932 "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" \u0915\u0947 \u091A\u0940\u092B \u090F\u0921\u093F\u091F\u0930 \u0939\u0948\u0902\u0964
\u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092F\u0939 \u0915\u092E\u093E\u0902\u0921 / \u0915\u091A\u094D\u091A\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F / \u0938\u092E\u093E\u091A\u093E\u0930 \u0935\u093F\u0935\u0930\u0923 \u092F\u093E \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0926\u093F\u092F\u093E \u0939\u0948:
${effectiveInput || ""}
${fetchedArticleSnippet ? `\u0935\u0947\u092C\u0938\u093E\u0907\u091F \u0938\u093E\u092E\u0917\u094D\u0930\u0940: ${fetchedArticleSnippet}` : ""}
${customPrompt ? `\u092F\u0942\u091C\u093C\u0930 \u0915\u093E \u0935\u093F\u0936\u0947\u0937 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 / \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F \u092F\u093E \u0915\u091A\u094D\u091A\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F (Prompt / Raw Script / Press Note): ${customPrompt}` : ""}

\u0935\u093F\u0936\u0947\u0937 \u0938\u0902\u092A\u093E\u0926\u0915\u0940\u092F \u0928\u093F\u092F\u092E (\u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F / \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F \u0930\u0942\u092A\u093E\u0902\u0924\u0930\u0923):
- \u092F\u0926\u093F \u092F\u0942\u091C\u093C\u0930 \u0928\u0947 \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0932\u093F\u0902\u0915 \u0915\u0947 \u0938\u0940\u0927\u0947 \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F \u092C\u0949\u0915\u094D\u0938 \u092F\u093E \u0907\u0928\u092A\u0941\u091F \u092C\u0949\u0915\u094D\u0938 \u092E\u0947\u0902 \u0915\u094B\u0908 \u0915\u091A\u094D\u091A\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F, \u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F, \u0938\u0930\u0915\u093E\u0930\u0940 \u0935\u093F\u091C\u094D\u091E\u092A\u094D\u0924\u093F \u092F\u093E \u0928\u0947\u0924\u093E\u0913\u0902 \u0915\u093E \u092C\u092F\u093E\u0928 \u0926\u093F\u092F\u093E \u0939\u0948, \u0924\u094B \u0909\u0938 \u092A\u0942\u0930\u0940 \u0938\u093E\u092E\u0917\u094D\u0930\u0940 \u0915\u094B \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937, \u092A\u094D\u0930\u093E\u092E\u093E\u0923\u093F\u0915 \u0914\u0930 \u092A\u094D\u0930\u092D\u093E\u0935\u0936\u093E\u0932\u0940 \u0928\u094D\u092F\u0942\u091C\u093C \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u092E\u0947\u0902 \u092C\u0926\u0932\u0947\u0902\u0964
- \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0935 \u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u093E \u092A\u0942\u0930\u094D\u0923 \u0928\u093F\u0937\u094D\u0915\u093E\u0938\u0928 (MANDATORY): \u0939\u0947\u0921\u0932\u093E\u0907\u0928, \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A\u094B\u0902 \u0914\u0930 \u092A\u0942\u0930\u0940 \u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u091F (summary) \u092E\u0947\u0902 \u0938\u0947 '\u0936\u094D\u0930\u0940', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928', '\u0936\u094D\u0930\u0940\u092E\u0924\u0940', '\u0938\u0941\u0936\u094D\u0930\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0940\u092F', '\u0906\u0926\u0930\u0923\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F', '\u091C\u0940' \u091C\u0948\u0938\u0947 \u0938\u092D\u0940 \u0914\u092A\u091A\u093E\u0930\u093F\u0915 \u0935 \u0938\u0930\u0915\u093E\u0930\u0940/\u092A\u0940\u0906\u0930 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u094B \u092A\u0942\u0930\u0940 \u0924\u0930\u0939 \u0939\u091F\u093E \u0926\u0947\u0902\u0964 \u0938\u0940\u0927\u0947 \u0928\u0947\u0924\u093E \u092F\u093E \u0905\u0927\u093F\u0915\u093E\u0930\u0940 \u0915\u093E \u092A\u0926 \u0914\u0930 \u0928\u093E\u092E \u0932\u093F\u0916\u0947\u0902 (\u091C\u0948\u0938\u0947: '\u092E\u093E\u0928\u0928\u0940\u092F \u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940 \u0936\u094D\u0930\u0940 ... \u091C\u0940' \u0915\u0947 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 '\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940 ...', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928 \u0915\u0932\u0947\u0915\u094D\u091F\u0930 \u092E\u0939\u094B\u0926\u092F' \u0915\u0947 \u0938\u094D\u0925\u093E\u0928 \u092A\u0930 '\u0915\u0932\u0947\u0915\u094D\u091F\u0930')\u0964

\u0915\u0943\u092A\u092F\u093E \u0907\u0938 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0914\u0930 \u0928\u093F\u0930\u094D\u0926\u0947\u0936 \u0938\u0947 \u090F\u0915 \u0936\u0915\u094D\u0924\u093F\u0936\u093E\u0932\u0940, \u0935\u093E\u092F\u0930\u0932 \u0914\u0930 \u0911\u0925\u0947\u0902\u091F\u093F\u0915 \u0939\u093F\u0902\u0926\u0940 \u0907\u092E\u0947\u091C \u0928\u094D\u092F\u0942\u091C\u093C (\u0928\u094D\u092F\u0942\u091C\u093C \u0917\u094D\u0930\u093E\u092B\u093F\u0915 \u0915\u093E\u0930\u094D\u0921) \u0924\u0948\u092F\u093E\u0930 \u0915\u0930\u0947\u0902:
1. "headline": \u092E\u0941\u0916\u094D\u092F, \u0938\u094D\u092A\u0937\u094D\u091F \u0914\u0930 \u092A\u094D\u0930\u092D\u093E\u0935\u0915\u093E\u0930\u0940 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 (\u0932\u0917\u092D\u0917 12-22 \u0936\u092C\u094D\u0926, \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940 \u0932\u093F\u092A\u093F \u092E\u0947\u0902, \u092C\u093F\u0928\u093E \u0915\u093F\u0938\u0940 \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0936\u092C\u094D\u0926 \u0915\u0947)\u0964
2. "headlineOptions": 3 \u0905\u0932\u0917-\u0905\u0932\u0917, \u0936\u0915\u094D\u0924\u093F\u0936\u093E\u0932\u0940 \u0939\u093F\u0902\u0926\u0940 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u0935\u093F\u0915\u0932\u094D\u092A \u0924\u093E\u0915\u093F \u090F\u0921\u093F\u091F\u0930 \u0938\u092C\u0938\u0947 \u0938\u091F\u0940\u0915 \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u091A\u0941\u0928 \u0938\u0915\u0947\u0902:
   - \u0935\u093F\u0915\u0932\u094D\u092A 1: \u0939\u093E\u0908-\u0907\u092E\u094D\u092A\u0948\u0915\u094D\u091F / \u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0938\u094D\u091F\u093E\u0907\u0932
   - \u0935\u093F\u0915\u0932\u094D\u092A 2: \u0924\u0925\u094D\u092F\u093E\u0924\u094D\u092E\u0915 \u0935 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u091C\u093E\u0928\u0915\u093E\u0930\u0940 \u0938\u094D\u091F\u093E\u0907\u0932
   - \u0935\u093F\u0915\u0932\u094D\u092A 3: \u0906\u0915\u0930\u094D\u0937\u0915 \u0935 \u0924\u093E\u0924\u094D\u0915\u093E\u0932\u093F\u0915 \u090F\u0915\u094D\u0936\u0928/\u0938\u0935\u093E\u0932 \u0938\u094D\u091F\u093E\u0907\u0932
3. "highlightWords": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u0938\u0947 2-4 \u092E\u0941\u0916\u094D\u092F \u0936\u092C\u094D\u0926 \u091C\u093F\u0928\u094D\u0939\u0947\u0902 \u092A\u0940\u0932\u0947 \u0930\u0902\u0917 (Yellow) \u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0915\u0930\u0928\u093E \u0939\u0948\u0964
4. "formattedHeadline": \u0939\u0947\u0921\u0932\u093E\u0907\u0928 \u092E\u0947\u0902 \u0939\u093E\u0907\u0932\u093E\u0907\u091F \u0939\u094B\u0928\u0947 \u0935\u093E\u0932\u0947 \u0936\u092C\u094D\u0926\u094B\u0902 \u0915\u0947 \u091A\u093E\u0930\u094B\u0902 \u0913\u0930 [yellow]\u0936\u092C\u094D\u0926[/yellow] \u0932\u0917\u093E\u090F\u0902\u0964
5. "location": \u0938\u0902\u092C\u0902\u0927\u093F\u0924 \u0936\u0939\u0930, \u091C\u093F\u0932\u093E \u092F\u093E \u0930\u093E\u091C\u094D\u092F (\u091C\u0948\u0938\u0947 "\u092E\u0927\u094D\u092F \u092A\u094D\u0930\u0926\u0947\u0936", "\u0936\u0939\u0921\u094B\u0932, \u092E\u092A\u094D\u0930", "\u0930\u0940\u0935\u093E", "\u092D\u094B\u092A\u093E\u0932", \u0906\u0926\u093F)\u0964
6. "summary": \u0938\u094B\u0936\u0932 \u092E\u0940\u0921\u093F\u092F\u093E (Instagram \u0935 Facebook \u092A\u094B\u0938\u094D\u091F) \u0924\u0925\u093E \u0905\u092A\u0932\u094B\u0921\u093F\u0902\u0917 \u0939\u0947\u0924\u0941 \u0915\u092E \u0938\u0947 \u0915\u092E 2 \u0914\u0930 \u0935\u093F\u0935\u0930\u0923 \u0905\u0927\u093F\u0915 \u0939\u094B\u0928\u0947 \u092A\u0930 3 \u0935\u093F\u0938\u094D\u0924\u0943\u0924 \u092A\u0948\u0930\u093E\u0917\u094D\u0930\u093E\u092B \u092E\u0947\u0902 \u092A\u0942\u0930\u0940 \u0928\u093F\u0937\u094D\u092A\u0915\u094D\u0937 \u0916\u092C\u0930 \u0935\u093F\u0938\u094D\u0924\u093E\u0930 \u0938\u0947 \u0932\u093F\u0916\u0947\u0902 (\u092A\u094D\u0930\u0947\u0938 \u0928\u094B\u091F \u0915\u0940 \u091A\u093E\u091F\u0941\u0915\u093E\u0930\u093F\u0924\u093E \u0935 \u0906\u0926\u0930\u0938\u0942\u091A\u0915 \u0936\u092C\u094D\u0926 \u0939\u091F\u093E\u0915\u0930) \u0924\u093E\u0915\u093F \u092A\u093E\u0920\u0915 \u0915\u094B \u0932\u0917\u0947 \u0915\u093F "\u092A\u0942\u0930\u0940 \u0916\u092C\u0930 \u0921\u093F\u0938\u094D\u0915\u094D\u0930\u093F\u092A\u094D\u0936\u0928 \u092E\u0947\u0902" \u092E\u093F\u0932 \u0917\u0908 \u0939\u0948\u0964 \u0909\u0938\u0915\u0947 \u0920\u0940\u0915 \u092C\u093E\u0926 \u090F\u0915 \u0916\u093E\u0932\u0940 \u0932\u093E\u0907\u0928 \u091B\u094B\u0921\u093C\u0915\u0930 \u0905\u0902\u0924 \u092E\u0947\u0902 \u0939\u0948\u0936\u091F\u0948\u0917 \u0932\u0917\u093E\u090F\u0902, \u091C\u093F\u0938\u092E\u0947\u0902 \u0938\u092C\u0938\u0947 \u092A\u0939\u0932\u093E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 #breakingnewswala \u0939\u094B\u0917\u093E, \u092C\u0940\u091A \u092E\u0947\u0902 4-6 \u092A\u094D\u0930\u093E\u0938\u0902\u0917\u093F\u0915 \u0939\u0948\u0936\u091F\u0948\u0917 (\u091C\u0948\u0938\u0947 #BreakingNews #HindiNews \u0906\u0926\u093F), \u0914\u0930 \u0938\u092C\u0938\u0947 \u0905\u0902\u0924\u093F\u092E \u0939\u0948\u0936\u091F\u0948\u0917 \u0905\u0928\u093F\u0935\u093E\u0930\u094D\u092F \u0930\u0942\u092A \u0938\u0947 #BNWTV \u0939\u094B\u0917\u093E\u0964 \u0907\u0938\u0915\u0947 \u0905\u0932\u093E\u0935\u093E \u0915\u094B\u0908 \u0905\u0928\u094D\u092F \u0939\u0947\u0921\u093F\u0902\u0917, \u092B\u094B\u0928 \u0928\u0902\u092C\u0930 \u092F\u093E \u0938\u094B\u0936\u0932 \u0932\u093F\u0902\u0915 \u0928\u0939\u0940\u0902 \u0939\u094B\u0928\u093E \u091A\u093E\u0939\u093F\u090F\u0964
7. "category": \u0928\u094D\u092F\u0942\u091C\u093C \u0936\u094D\u0930\u0947\u0923\u0940 (\u0939\u093E\u0926\u0938\u093E / \u092A\u094D\u0930\u0936\u093E\u0938\u0928 / \u0930\u093E\u091C\u0928\u0940\u0924\u093F / \u0935\u093F\u0915\u093E\u0938 / \u0905\u092A\u0930\u093E\u0927 / \u091C\u0928\u0906\u0902\u0926\u094B\u0932\u0928)\u0964
8. "suggestedImagePrompt": \u092F\u0926\u093F \u092F\u0942\u091C\u093C\u0930 \u0915\u0947 \u092A\u093E\u0938 \u092B\u094B\u091F\u094B \u0928\u0939\u0940\u0902 \u0939\u0948 \u0924\u094B AI \u0907\u092E\u0947\u091C \u091C\u0928\u0930\u0947\u091F \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093F\u090F \u090F\u0915 \u0938\u091F\u0940\u0915 \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u0940 \u092A\u094D\u0930\u0949\u092E\u094D\u092A\u094D\u091F\u0964
9. "isAiGeneratedPhoto": \u0915\u094D\u092F\u093E \u092F\u0942\u091C\u093C\u0930 \u0915\u0947 \u0915\u092E\u093E\u0902\u0921, \u091F\u0947\u0915\u094D\u0938\u094D\u091F \u092F\u093E \u0932\u093F\u0902\u0915 \u092E\u0947\u0902 \u092F\u0939 \u0932\u093F\u0916\u093E \u0939\u0948 \u092F\u093E \u0938\u0902\u0915\u0947\u0924 \u0939\u0948 \u0915\u093F \u092B\u094B\u091F\u094B AI \u091C\u0928\u0930\u0947\u091F\u0947\u0921 \u0939\u0948 / \u0915\u093E\u0932\u094D\u092A\u0928\u093F\u0915 \u0939\u0948 / \u0907\u0932\u0938\u094D\u091F\u094D\u0930\u0947\u0936\u0928 \u0939\u0948 (\u091C\u0948\u0938\u0947 'AI generated', '\u090F\u0906\u0908 \u092B\u094B\u091F\u094B', 'AI image', '\u0915\u093E\u0932\u094D\u092A\u0928\u093F\u0915 \u091A\u093F\u0924\u094D\u0930', '\u0938\u093F\u0902\u0925\u0947\u091F\u093F\u0915')? (true \u092F\u093E false).
10. "speakerName": \u092F\u0926\u093F \u092F\u0939 \u0915\u093F\u0938\u0940 \u0928\u0947\u0924\u093E, \u092E\u0902\u0924\u094D\u0930\u0940 \u092F\u093E \u0935\u094D\u092F\u0915\u094D\u0924\u093F \u0915\u093E \u092C\u092F\u093E\u0928/\u0915\u094B\u091F\u0947\u0936\u0928 \u0939\u0948 \u0924\u094B \u0909\u0928\u0915\u093E \u0928\u093E\u092E (\u0909\u0926\u093E. "\u0926\u093F\u0917\u094D\u0935\u093F\u091C\u092F \u0938\u093F\u0902\u0939", "\u092E\u094B\u0939\u0928 \u092F\u093E\u0926\u0935"), \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
11. "speakerTitle": \u0909\u0928\u0915\u093E \u092A\u0926 \u092F\u093E \u092A\u0926\u0935\u0940 (\u0909\u0926\u093E. "\u092A\u0942\u0930\u094D\u0935 \u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940", "\u092E\u0941\u0916\u094D\u092F\u092E\u0902\u0924\u094D\u0930\u0940, \u092E\u092A\u094D\u0930"), \u0905\u0928\u094D\u092F\u0925\u093E \u0916\u093E\u0932\u0940 \u0938\u094D\u091F\u094D\u0930\u093F\u0902\u0917 ("")\u0964
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
              content: `You are the chief editor of "\u092C\u094D\u0930\u0947\u0915\u093F\u0902\u0917 \u0928\u094D\u092F\u0942\u091C\u093C \u0935\u093E\u0932\u093E" (Breaking News Wala), a premier Indian digital news channel. Always respond in strictly valid JSON format with keys: headline, headlineOptions (array of 3 strings), highlightWords (array of strings), formattedHeadline, location, summary, category, suggestedImagePrompt, isAiGeneratedPhoto (boolean), speakerName, speakerTitle. Stripping all honorifics ('\u0936\u094D\u0930\u0940', '\u0936\u094D\u0930\u0940\u092E\u093E\u0928', '\u0936\u094D\u0930\u0940\u092E\u0924\u0940', '\u092E\u093E\u0928\u0928\u0940\u092F', '\u0938\u092E\u094D\u092E\u093E\u0928\u0940\u092F', '\u0906\u0926\u0930\u0923\u0940\u092F', '\u092E\u0939\u094B\u0926\u092F', '\u091C\u0940') is strictly mandatory.`
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
        const fallbackSource = input || fetchedArticleSnippet || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
        parsedData = createLocalNewsFallback(fallbackSource, linkUrl);
      }
    } else {
      try {
        const response = await generateWithFallbackAndRetry(
          ai,
          DEFAULT_FALLBACK_MODELS,
          {
            contents: prompt,
            config: {
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
        console.log("All Gemini models busy in process-news-command, generating instant fallback:", geminiError?.message?.slice(0, 80));
        const fallbackSource = input || fetchedArticleSnippet || "\u0924\u093E\u091C\u093C\u093E \u0938\u092E\u093E\u091A\u093E\u0930 \u0905\u092A\u0921\u0947\u091F";
        parsedData = createLocalNewsFallback(fallbackSource, linkUrl);
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
  return cleaned.replace(/[ \t]{2,}/g, " ").trim();
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
    import_path.default.join(process.cwd(), "web_studio", "dist"),
    import_path.default.join(process.cwd(), "dist"),
    __dirname,
    import_path.default.join(__dirname, "dist")
  ];
  const distPath = possibleDistPaths.find((p) => import_fs.default.existsSync(import_path.default.join(p, "index.html"))) || import_path.default.join(process.cwd(), "dist");
  if (process.env.NODE_ENV === "development" && import_fs.default.existsSync(import_path.default.join(process.cwd(), "index.html"))) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log(`Serving static studio files from: ${distPath}`);
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`News Graphic Studio server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
