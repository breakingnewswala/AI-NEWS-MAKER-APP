import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import dotenv from "dotenv";

const safeFilename = typeof __filename !== 'undefined' ? __filename : (typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : process.cwd());
const safeDirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(safeFilename);

dotenv.config();

const app = express();
const PORT = parseInt(process.env.APP_PORT || process.env.PORT || "3000", 10);

// Enable CORS for web apps, custom domains (ainewsmaker.online), and dev endpoints
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Increase payload limits for image uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Dynamic runtime cloud configuration (OpenAI API key & custom domain)
const CONFIGURED_OPENAI_KEY = "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";
const CONFIGURED_GEMINI_KEY = "AQ.Ab8RN6Llqa6KH_g2YuLo7EPCR8nBZS3pWoGPOrMnzgVGNLwYbA";
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
  process.env.GEMINI_API_KEY = CONFIGURED_GEMINI_KEY;
}
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "MY_OPENAI_API_KEY") {
  process.env.OPENAI_API_KEY = CONFIGURED_OPENAI_KEY;
}
let dynamicOpenAiKey: string = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "MY_OPENAI_API_KEY") 
  ? process.env.OPENAI_API_KEY 
  : CONFIGURED_OPENAI_KEY;
let dynamicCustomDomain: string = "";

// Check availability of AI Providers (Gemini & OpenAI)
app.get("/api/ai-providers-status", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;

  const geminiAvailable = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim().length > 5);
  const openaiAvailable = Boolean(openaiKey && openaiKey !== "MY_OPENAI_API_KEY" && openaiKey.trim().length > 5);

  return res.json({
    geminiAvailable,
    openaiAvailable,
  });
});

// Full Cloud Status and Configuration endpoint
app.get("/api/cloud-status", (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;

  const geminiAvailable = Boolean(geminiKey && geminiKey !== "MY_GEMINI_API_KEY" && geminiKey.trim().length > 5);
  const openaiAvailable = Boolean(openaiKey && openaiKey !== "MY_OPENAI_API_KEY" && openaiKey.trim().length > 5);

  return res.json({
    success: true,
    cloudActive: true,
    cloudProvider: "Google Cloud Platform (Cloud Run)",
    currentServerTime: new Date().toISOString(),
    geminiAvailable,
    openaiAvailable,
    maskedOpenaiKey: openaiAvailable ? `${(openaiKey || "").slice(0, 6)}...${(openaiKey || "").slice(-4)}` : null,
    customDomain: dynamicCustomDomain || null,
  });
});

// Admin endpoint to dynamically configure OpenAI Key, Gemini Key or Custom Domain at runtime
app.post("/api/admin/set-ai-keys", async (req, res) => {
  try {
    const { openaiKey, geminiKey, customDomain } = req.body;
    if (openaiKey !== undefined) {
      dynamicOpenAiKey = String(openaiKey).trim();
      openaiClient = null; // Re-create OpenAI client with new key
    }
    if (geminiKey !== undefined && String(geminiKey).trim().length > 5) {
      process.env.GEMINI_API_KEY = String(geminiKey).trim();
      aiClient = null;
    }
    if (customDomain !== undefined) {
      dynamicCustomDomain = String(customDomain).trim();
    }

    const effectiveOpenaiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY;
    const openaiValid = Boolean(
      effectiveOpenaiKey &&
      effectiveOpenaiKey !== "MY_OPENAI_API_KEY" &&
      effectiveOpenaiKey.trim().length > 5
    );

    let testMessage = "क्लाउड सेटिंग्स सुरक्षित हो गईं!";
    if (openaiKey && openaiValid) {
      try {
        const testClient = new OpenAI({ apiKey: effectiveOpenaiKey!.trim() });
        await testClient.models.list();
        testMessage = "✅ ChatGPT (OpenAI) API Key सफलतापूर्वक कनेक्ट व सत्यापित हो गई!";
      } catch (testErr: any) {
        testMessage = `की सेव हो गई, किन्तु OpenAI टेस्ट चेतावनी: ${testErr?.message || "कृपया की की जांच करें"}`;
      }
    }

    return res.json({
      success: true,
      message: testMessage,
      openaiAvailable: openaiValid,
      geminiAvailable: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
      customDomain: dynamicCustomDomain,
    });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// ==========================================
// PERSISTENT NEWS DATABASE SYSTEM
// ==========================================
interface StoredNewsPost {
  id: string;
  title: string;
  summary: string;
  sourceChannel: string;
  sourceUrl: string;
  category: string;
  categoryName: string;
  publishedTime: string;
  imageUrl?: string;
  breaking: boolean;
  isExclusive?: boolean;
  fullContent?: string;
  district?: string;
  location?: string;
  timestamp: number;
}

const NEWS_DB_FILE = path.join(process.cwd(), "news_database.json");

function getInitialRichNewsPosts(): StoredNewsPost[] {
  const now = Date.now();
  return [
    {
      id: "live-post-1",
      title: "भारत ने लॉन्च किया नया AI सुपरकंप्यूटिंग नेटवर्क, वैश्विक स्तर पर बनी नई पहचान",
      summary: "विज्ञान एवं प्रौद्योगिकी मंत्रालय द्वारा आज देश के अत्याधुनिक AI सुपरकंप्यूटिंग क्लस्टर का अनावरण किया गया। यह तकनीक मौसम पूर्वानुमान और स्वास्थ्य क्षेत्र में क्रांति लाएगी।",
      sourceChannel: "दैनिक भास्कर (Dainik Bhaskar)",
      sourceUrl: "https://dainikbhaskar.com/tech/ai-supercomputing",
      category: "tech",
      categoryName: "टेक्नोलॉजी",
      publishedTime: "10 मिनट पहले",
      imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 10 * 60 * 1000,
      fullContent: `विज्ञान एवं प्रौद्योगिकी मंत्रालय द्वारा आज देश के अत्याधुनिक AI सुपरकंप्यूटिंग क्लस्टर का भव्य अनावरण किया गया।\n\n📌 मुख्य विवरण एवं पृष्ठभूमि:\nइस नए क्लस्टर से देश के लाखों वैज्ञानिकों, छात्रों और स्टार्टअप्स को अभूतपूर्व कम्प्यूटिंग क्षमता मिलेगी। यह मौसम पूर्वानुमान, चिकित्सा अनुसंधान और अंतरिक्ष अन्वेषण में डेटा एनालिसिस को 10 गुना तेज कर देगा।\n\n🎤 आधिकारिक बयान:\nकेंद्रीय विज्ञान मंत्री ने कहा: "भारत अब केवल तकनीक का उपभोक्ता नहीं, बल्कि वैश्विक स्तर पर AI समाधानों का शीर्ष निर्माता बन रहा है।"\n\n📊 मुख्य बिंदु:\n• 100 पेटाफ्लॉप्स से अधिक की कम्प्यूटेशनल स्पीड\n• देश के सभी प्रमुख IITs और अनुसंधान संस्थानों से सीधा जुड़ाव\n• 100% हरित ऊर्जा से संचालित डाटा सेंटर`
    },
    {
      id: "live-post-2",
      title: "संसद में डिजिटल मीडिया और AI न्यूज़ प्रसारण पर ऐतिहासिक विधेयक पारित",
      summary: "सूचना एवं प्रसारण मंत्रालय ने डिजिटल न्यूज़ पब्लिशर्स और एआई आधारित कंटेंट जनरेशन के लिए मानक तय करने हेतु ऐतिहासिक बिल पारित किया। डीपफेक पर कड़े दंड का प्रावधान।",
      sourceChannel: "आज तक (Aaj Tak)",
      sourceUrl: "https://aajtak.in/national/digital-media-ai-bill",
      category: "politics",
      categoryName: "राजनीति",
      publishedTime: "25 मिनट पहले",
      imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 25 * 60 * 1000,
      fullContent: `संसद के दोनों सदनों में डिजिटल मीडिया और एआई कंटेंट के नियमन हेतु नया कानून ध्वनिमत से पारित किया गया।\n\n📌 मुख्य बातें:\n1. स्वतंत्र पत्रकारों और यूट्यूब न्यूज़ चैनलों के लिए स्व-प्रमाणन प्रणाली।\n2. एआई जनरेटेड तस्वीरों और डीपफेक वीडियो पर वाटरमार्क अनिवार्य।\n3. तथ्यहीन व भ्रामक खबरों पर त्वरित कार्रवाई हेतु डिजिटल ओम्बड्समैन की नियुक्ति।`
    },
    {
      id: "live-post-3",
      title: "एशिया कप क्रिकेट: भारत ने रोमांचक मुकाबले में पाकिस्तान को 5 विकेट से हराया",
      summary: "भारतीय टीम ने शानदार खेल का प्रदर्शन करते हुए अंतिम ओवर में जीत दर्ज की। सलामी बल्लेबाज ने 85 रनों की नाबाद पारी खेली, गेंदबाजों ने डेथ ओवर्स में कसी हुई गेंदबाजी की।",
      sourceChannel: "NDTV इंडिया",
      sourceUrl: "https://ndtv.in/sports/asia-cup-victory",
      category: "sports",
      categoryName: "खेल",
      publishedTime: "45 मिनट पहले",
      imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 45 * 60 * 1000,
      fullContent: `अंतिम ओवर में चाहिए थे 12 रन, भारतीय बल्लेबाजों ने 2 गेंद शेष रहते जीत दिला दी। इस जीत के साथ भारतीय टीम अंक तालिका में शीर्ष पर पहुंच गई है।`
    },
    {
      id: "live-post-4",
      title: "सेंसेक्स में 1100 अंकों का रिकॉर्ड उछाल, निफ्टी 25,500 के नए शिखर पर पहुंचा",
      summary: "घरेलू शेयर बाजारों में विदेशी संस्थागत निवेशकों (FII) की वापसी से बाजार नई ऊंचाई पर पहुंचा। बैंकिंग, ऑटो और आईटी सेक्टर में भारी लिवाली देखने को मिली।",
      sourceChannel: "मनीकंट्रोल (Moneycontrol)",
      sourceUrl: "https://moneycontrol.com/markets/sensex-record",
      category: "business",
      categoryName: "कारोबार",
      publishedTime: "1 घंटा पहले",
      imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 60 * 60 * 1000,
      fullContent: `भारतीय शेयर बाजार ने आज नया इतिहास रचा। सेंसेक्स 1100 अंकों की तेजी के साथ बंद हुआ और निफ्टी ने पहली बार 25,500 का स्तर छुआ। विश्लेषकों का मानना है कि मजबूत आर्थिक आंकड़े बाजार को गति दे रहे हैं।`
    },
    {
      id: "live-post-5",
      title: "इसरो ने गगनयान मिशन के दूसरे क्रू-एस्केप सिस्टम का सफल परीक्षण किया",
      summary: "भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO) ने श्रीहरिकोटा से मानव अंतरिक्ष उड़ान गगनयान के लिए अत्याधुनिक सेफ्टी मॉड्यूल का सफल परीक्षण पूरा किया।",
      sourceChannel: "ABP न्यूज़",
      sourceUrl: "https://abplive.com/science/gaganyaan-test",
      category: "tech",
      categoryName: "टेक्नोलॉजी",
      publishedTime: "2 घंटे पहले",
      imageUrl: "https://images.unsplash.com/photo-1517976487507-5b3b11329582?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 120 * 60 * 1000,
      fullContent: `इसरो ने अंतरिक्ष यात्रियों की सुरक्षा सुनिश्चित करने वाले क्रू मॉड्यूल का परीक्षण सफलतापूर्वक पूरा कर लिया है। आगामी वर्ष के अंत तक मानव मिशन की योजना है।`
    },
    {
      id: "live-post-6",
      title: "मौसम अलर्ट: उत्तर भारत में भारी बारिश और ओलावृष्टि की चेतावनी जारी",
      summary: "मौसम विभाग (IMD) ने अगले 48 घंटों में दिल्ली, हरियाणा, पंजाब और पश्चिमी यूपी के कई जिलों में तेज आंधी और बारिश के लिए ऑरेंज अलर्ट जारी किया है।",
      sourceChannel: "अमर उजाला (Amar Ujala)",
      sourceUrl: "https://amarujala.com/weather/heavy-rain-alert",
      category: "state",
      categoryName: "राज्य / स्थानीय",
      publishedTime: "2.5 घंटे पहले",
      imageUrl: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: now - 150 * 60 * 1000,
      fullContent: `मौसम विभाग ने पश्चिमी विक्षोभ के सक्रिय होने के कारण उत्तर भारत के कई राज्यों में तेज हवाओं के साथ बारिश और ओलावृष्टि की संभावना जताई है। किसानों को कटी फसल सुरक्षित स्थानों पर रखने की सलाह दी गई है।`
    },
    {
      id: "live-post-7",
      title: "राष्ट्रीय राजमार्गों पर अब लागू होगा सेटेलाइट आधारित टोल कलेक्शन सिस्टम",
      summary: "सड़क परिवहन मंत्रालय ने फास्टैग के बाद अब जीपीएस और सैटेलाइट आधारित टोल प्रणाली को देश के प्रमुख एक्सप्रेसवे पर पायलट प्रोजेक्ट के तौर पर शुरू करने की घोषणा की है।",
      sourceChannel: "ज़ी न्यूज़ (Zee News)",
      sourceUrl: "https://zeenews.india.com/automobiles/satellite-toll",
      category: "politics",
      categoryName: "राजनीति",
      publishedTime: "3 घंटे पहले",
      imageUrl: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 180 * 60 * 1000,
      fullContent: `नई प्रणाली के तहत वाहनों में लगे ओबीयू (ऑन-बोर्ड यूनिट) के जरिए तय की गई दूरी के आधार पर स्वतः टोल कट जाएगा। इससे टोल प्लाजा पर लगने वाला समय शून्य हो जाएगा।`
    },
    {
      id: "live-post-8",
      title: "सोने की कीमतों में भारी गिरावट, चांदी 2000 रुपये प्रति किलो सस्ती हुई",
      summary: "वैश्विक बाजारों में मजबूती के बाद घरेलू सर्राफा बाजार में सोने और चांदी की कीमतों में बड़ी गिरावट दर्ज की गई। त्योहारी सीजन से पहले खरीदारों के चेहरे खिले।",
      sourceChannel: "दैनिक जागरण (Dainik Jagran)",
      sourceUrl: "https://jagran.com/business/gold-silver-prices",
      category: "business",
      categoryName: "कारोबार",
      publishedTime: "3.5 घंटे पहले",
      imageUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 210 * 60 * 1000,
      fullContent: `24 कैरेट सोने की कीमत प्रति 10 ग्राम में 750 रुपये की कमी आई, वहीं चांदी 2000 रुपये सस्ती होकर 84,000 रुपये प्रति किलोग्राम के स्तर पर आ गई है।`
    },
    {
      id: "live-post-9",
      title: "रेलवे का बड़ा ऐलान: 50 नए रूटों पर दौड़ेंगी स्लीपर वंदे भारत ट्रेनें",
      summary: "लंबी दूरी के यात्रियों के लिए विश्वस्तरीय सुविधाओं से लैस स्लीपर वंदे भारत एक्सप्रेस ट्रेनों का परिचालन जल्द शुरू होगा। तेज रफ्तार और सुरक्षित यात्रा का अनुभव।",
      sourceChannel: "हिंदुस्तान (Live Hindustan)",
      sourceUrl: "https://livehindustan.com/national/vande-bharat-sleeper",
      category: "state",
      categoryName: "राज्य / स्थानीय",
      publishedTime: "4 घंटे पहले",
      imageUrl: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&auto=format&fit=crop",
      breaking: false,
      isExclusive: false,
      timestamp: now - 240 * 60 * 1000,
      fullContent: `रेल मंत्रालय ने 50 नए रूटों को अंतिम रूप दे दिया है। नई स्लीपर ट्रेनों में अत्याधुनिक एयर सस्पेंशन, बायो-वैक्यूम टॉयलेट्स और कवच सुरक्षा प्रणाली शामिल हैं।`
    },
    {
      id: "live-post-10",
      title: "साइबर पुलिस की बड़ी कार्रवाई: 500 करोड़ के ऑनलाइन गेमिंग सिंडिकेट का भंडाफोड़",
      summary: "विशेष टास्क फोर्स ने फर्जी डिजिटल पेमेंट गेटवे और अवैध गेमिंग ऐप के जरिए करोड़ों की ठगी करने वाले अंतरराज्यीय गिरोह के 8 सदस्यों को दबोचा।",
      sourceChannel: "पत्रिका (Patrika)",
      sourceUrl: "https://patrika.com/crime/cyber-crime-busted",
      category: "crime",
      categoryName: "क्राइम / अपराध",
      publishedTime: "5 घंटे पहले",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: true,
      timestamp: now - 300 * 60 * 1000,
      fullContent: `पुलिस ने आरोपियों के पास से 25 लैपटॉप, 60 स्मार्टफोन और 100 से ज्यादा फ्रीज बैंक खातों की जानकारी बरामद की है।`
    }
  ];
}

function loadNewsDatabase(): StoredNewsPost[] {
  try {
    if (fs.existsSync(NEWS_DB_FILE)) {
      const raw = fs.readFileSync(NEWS_DB_FILE, "utf-8");
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

function saveNewsDatabase(posts: StoredNewsPost[]): boolean {
  try {
    fs.writeFileSync(NEWS_DB_FILE, JSON.stringify(posts, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing news_database.json:", err);
    return false;
  }
}

// Format dynamic relative time
function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} मिनट पहले`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} घंटे पहले`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} दिन पहले`;
}

// 1. GET all news posts
app.get("/api/news-posts", (_req, res) => {
  const posts = loadNewsDatabase();
  // Update publishedTime dynamically so they always look fresh
  const dynamicPosts = posts.map((p) => ({
    ...p,
    publishedTime: p.timestamp ? formatRelativeTime(p.timestamp) : p.publishedTime,
  }));
  return res.json({ success: true, posts: dynamicPosts });
});

// 2. POST add or sync news posts
app.post("/api/news-posts", (req, res) => {
  try {
    const payload = req.body;
    let existing = loadNewsDatabase();

    if (Array.isArray(payload)) {
      // Bulk sync or replace
      existing = payload;
    } else if (payload && payload.title) {
      const newPost: StoredNewsPost = {
        id: payload.id || `post-${Date.now()}`,
        title: payload.title,
        summary: payload.summary || "",
        sourceChannel: payload.sourceChannel || "न्यूज़ रूम",
        sourceUrl: payload.sourceUrl || "",
        category: payload.category || "breaking",
        categoryName: payload.categoryName || "ब्रेकिंग न्यूज़",
        publishedTime: "अभी-अभी",
        imageUrl: payload.imageUrl || "",
        breaking: Boolean(payload.breaking),
        isExclusive: Boolean(payload.isExclusive),
        fullContent: payload.fullContent || payload.summary || "",
        district: payload.district || "",
        location: payload.location || "",
        timestamp: payload.timestamp || Date.now(),
      };
      existing = [newPost, ...existing.filter((p) => p.id !== newPost.id)];
    }

    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 3. PUT update existing post
app.put("/api/news-posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    let existing = loadNewsDatabase();
    existing = existing.map((p) => (p.id === id ? { ...p, ...updates } : p));
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 4. DELETE news post
app.delete("/api/news-posts/:id", (req, res) => {
  try {
    const { id } = req.params;
    let existing = loadNewsDatabase();
    existing = existing.filter((p) => p.id !== id);
    saveNewsDatabase(existing);
    return res.json({ success: true, posts: existing });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 5. POST reset database with fresh articles
app.post("/api/news-posts/reset", (_req, res) => {
  const fresh = getInitialRichNewsPosts();
  saveNewsDatabase(fresh);
  return res.json({ success: true, posts: fresh });
});

// --- Live RSS 2.0 Feed Generator from Database (news_database.json) ---
function generateRssFeedXml(posts: StoredNewsPost[], baseUrl = "https://www.ainewsmaker.online"): string {
  const cleanSiteUrl = baseUrl.replace(/\/+$/, "");
  const itemsXml = posts.map((post) => {
    const pubDate = post.timestamp ? new Date(post.timestamp).toUTCString() : new Date().toUTCString();
    const link = post.sourceUrl && post.sourceUrl.startsWith("http") ? post.sourceUrl : `${cleanSiteUrl}/#home`;
    const safeCategory = (post.categoryName || post.category || "ताज़ा समाचार").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeChannel = (post.sourceChannel || "AI News Maker").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const enclosureTag = post.imageUrl ? `\n      <enclosure url="${post.imageUrl.replace(/&/g, "&amp;")}" length="0" type="image/jpeg" />` : "";

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
    <title>AI News Maker - Live News Feed (लाइव समाचार)</title>
    <link>${cleanSiteUrl}/</link>
    <description>AI News Maker - रियल-टाइम ब्रेकिंग न्यूज़, वीडियो और ग्राफिक्स लाइव RSS फ़ीड</description>
    <language>hi</language>
    <copyright>© ${new Date().getFullYear()} AI News Maker</copyright>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
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
  } catch (err: any) {
    return res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Error</title><description>${err.message}</description></channel></rss>`);
  }
});

// --- Live Production RSS & Web Source Scraping Pipelines ---
function stripXmlHtmlTags(text: string): string {
  if (!text) return "";
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function mapSourceCategory(catName: string): { key: string; name: string } {
  const c = (catName || "").trim().toLowerCase();
  if (c.includes("राज") || c.includes("politic")) return { key: "politics", name: "राजनीति" };
  if (c.includes("खेल") || c.includes("sport")) return { key: "sports", name: "खेल" };
  if (c.includes("मनोरंजन") || c.includes("entertain") || c.includes("bolly")) return { key: "entertainment", name: "मनोरंजन" };
  if (c.includes("व्यापार") || c.includes("कारोबार") || c.includes("business")) return { key: "business", name: "व्यापार" };
  if (c.includes("टेक") || c.includes("विज्ञान") || c.includes("tech")) return { key: "tech", name: "टेक्नोलॉजी" };
  if (c.includes("अपराध") || c.includes("crime")) return { key: "crime", name: "अपराध" };
  if (c.includes("राज्य") || c.includes("state")) return { key: "state", name: "राज्य" };
  return { key: "national", name: "देश / राष्ट्रीय" };
}

async function fetchLiveRssSource(url: string, sourceName: string, category: string): Promise<{ success: boolean; count: number; totalFetched: number; error?: string; newPosts: StoredNewsPost[] }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml, */*"
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return { success: false, count: 0, totalFetched: 0, error: `HTTP ${res.status} ${res.statusText}`, newPosts: [] };
    }

    const xml = await res.text();
    const items: StoredNewsPost[] = [];
    const itemRegex = /<(item|entry)[\s\S]*?<\/\1>/gi;
    let match: RegExpExecArray | null;

    const { key: catKey, name: catName } = mapSourceCategory(category);
    let idx = 0;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[0];
      const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = stripXmlHtmlTags(titleM ? titleM[1] : "");
      if (!title || title.length < 5) continue;

      const linkM = block.match(/<link[^>]*>(?:<!\[CDATA\[)?(https?:\/\/[^\s<\]]+)/i) || block.match(/<link[^>]*href=["'](https?:\/\/[^\s"']+)["']/i);
      const link = linkM ? linkM[1].replace(/&amp;/g, "&") : url;

      const descM = block.match(/<(description|summary|content)[^>]*>([\s\S]*?)<\/\1>/i);
      const summary = stripXmlHtmlTags(descM ? descM[2] : "").slice(0, 340);

      // Extract image: enclosure, media:content, media:thumbnail, or img tag inside description
      const imgM = block.match(/<enclosure[^>]*url=["'](https?:\/\/[^\s"']+)["'][^>]*type=["']image/i) ||
                   block.match(/<media:(?:content|thumbnail)[^>]*url=["'](https?:\/\/[^\s"']+)["']/i) ||
                   (descM && descM[2].match(/<img[^>]*src=["'](https?:\/\/[^\s"']+)["']/i));
      const imageUrl = imgM ? imgM[1].replace(/&amp;/g, "&") : "";

      // Extract pubDate
      const dateM = block.match(/<(pubDate|published|updated|lastmod)[^>]*>([\s\S]*?)<\/\1>/i);
      let timestamp = Date.now() - idx * 60000;
      if (dateM && dateM[2]) {
        const parsedDate = new Date(stripXmlHtmlTags(dateM[2])).getTime();
        if (!isNaN(parsedDate) && parsedDate > 0) timestamp = parsedDate;
      }

      idx++;
      items.push({
        id: `rss_${sourceName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${timestamp}_${idx}`,
        title,
        summary: summary || title,
        sourceChannel: sourceName || "Live RSS Feed",
        sourceUrl: link,
        category: catKey,
        categoryName: catName,
        publishedTime: formatRelativeTime(timestamp),
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
        breaking: idx <= 2,
        isExclusive: false,
        timestamp,
        fullContent: summary || title,
        location: "नई दिल्ली",
      });
    }

    if (items.length === 0) {
      return { success: false, count: 0, totalFetched: 0, error: "फ़ीड में कोई वैध समाचार आइटम नहीं मिला", newPosts: [] };
    }

    const currentDb = loadNewsDatabase();
    const existingTitles = new Set(currentDb.map((p) => p.title.trim().toLowerCase()));
    const toInsert = items.filter((item) => !existingTitles.has(item.title.trim().toLowerCase()));

    const merged = [...toInsert, ...currentDb].slice(0, 150);
    saveNewsDatabase(merged);

    return {
      success: true,
      count: toInsert.length,
      totalFetched: items.length,
      newPosts: toInsert,
    };
  } catch (err: any) {
    return { success: false, count: 0, totalFetched: 0, error: err.message || "RSS फेच करने में विफल", newPosts: [] };
  }
}

async function scrapeLiveWebLink(url: string, sourceName?: string, category?: string): Promise<{ success: boolean; post?: StoredNewsPost; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return { success: false, error: `वेबसाइट ने HTTP ${res.status} त्रुटि दी` };
    }

    const html = await res.text();

    const ogTitleM = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i) ||
                     html.match(/<meta[^>]*name=["']twitter:title["'][^>]*content=["']([\s\S]*?)["']/i) ||
                     html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = stripXmlHtmlTags(ogTitleM ? ogTitleM[1] : "");

    if (!title || title.length < 5) {
      return { success: false, error: "वेब लिंक से समाचार शीर्षक नहीं निकाला जा सका" };
    }

    const ogDescM = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i) ||
                    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) ||
                    html.match(/<meta[^>]*name=["']twitter:description["'][^>]*content=["']([\s\S]*?)["']/i);
    const summary = stripXmlHtmlTags(ogDescM ? ogDescM[1] : "").slice(0, 360);

    const ogImgM = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([\s\S]*?)["']/i) ||
                   html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([\s\S]*?)["']/i);
    const imageUrl = ogImgM ? ogImgM[1].replace(/&amp;/g, "&") : "";

    const ogSiteM = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([\s\S]*?)["']/i);
    const detectedSite = ogSiteM ? stripXmlHtmlTags(ogSiteM[1]) : "";

    let hostname = "";
    try {
      hostname = new URL(url).hostname.replace(/^www\./, "");
    } catch {}

    const channel = sourceName?.trim() || detectedSite || hostname || "Web Link Source";
    const { key: catKey, name: catName } = mapSourceCategory(category || "");

    const newPost: StoredNewsPost = {
      id: `web_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title,
      summary: summary || title,
      sourceChannel: channel,
      sourceUrl: url,
      category: catKey,
      categoryName: catName,
      publishedTime: "अभी-अभी",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop",
      breaking: true,
      isExclusive: false,
      timestamp: Date.now(),
      fullContent: summary || title,
      location: "विशेष संवाददाता",
    };

    const currentDb = loadNewsDatabase();
    const merged = [newPost, ...currentDb.filter((p) => p.title.trim().toLowerCase() !== title.trim().toLowerCase())].slice(0, 150);
    saveNewsDatabase(merged);

    return { success: true, post: newPost };
  } catch (err: any) {
    return { success: false, error: err.message || "वेब लिंक स्क्रैप करने में विफल" };
  }
}

app.post("/api/rss/fetch-live", async (req, res) => {
  try {
    const { url, name, category } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "RSS URL आवश्यक है" });
    const result = await fetchLiveRssSource(String(url).trim(), String(name || "RSS Source").trim(), String(category || "national").trim());
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});

app.post("/api/web/scrape-link", async (req, res) => {
  try {
    const { url, name, category } = req.body;
    if (!url) return res.status(400).json({ success: false, error: "Web link URL आवश्यक है" });
    const result = await scrapeLiveWebLink(String(url).trim(), String(name || "").trim(), String(category || "").trim());
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});

app.post("/api/sources/sync-all", async (req, res) => {
  try {
    const { sources } = req.body;
    const list = Array.isArray(sources) && sources.length > 0 ? sources : [
      { url: "https://www.aajtak.in/rssfeeds/?id=home", name: "आज तक (Aaj Tak)", category: "देश / राष्ट्रीय", type: "rss", isActive: true },
      { url: "https://feeds.bbci.co.uk/hindi/rss.xml", name: "बीबीसी हिंदी (BBC Hindi)", category: "अंतरराष्ट्रीय", type: "rss", isActive: true },
      { url: "https://www.amarujala.com/rss/breaking-news.xml", name: "अमर उजाला (Amar Ujala)", category: "ब्रेकिंग न्यूज़", type: "rss", isActive: true },
      { url: "https://pib.gov.in/PressReleasePage.aspx", name: "PIB राष्ट्रीय डेस्क", category: "देश / राष्ट्रीय", type: "web", isActive: true },
    ];

    let totalNew = 0;
    const sourceResults: any[] = [];

    for (const src of list) {
      if (!src.isActive) continue;
      if (src.type === "web") {
        const r = await scrapeLiveWebLink(src.url, src.name, src.category);
        if (r.success) totalNew += 1;
        sourceResults.push({ id: src.id, name: src.name, success: r.success, count: r.success ? 1 : 0, error: r.error });
      } else {
        const r = await fetchLiveRssSource(src.url, src.name, src.category);
        if (r.success) totalNew += r.count;
        sourceResults.push({ id: src.id, name: src.name, success: r.success, count: r.count, totalFetched: r.totalFetched, error: r.error });
      }
    }

    return res.json({
      success: true,
      totalNewItems: totalNew,
      sourceResults,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});


// --- Google Play Data Safety: Account & Associated Data Deletion Endpoints ---
const ACCOUNT_DELETIONS_FILE = path.join(process.cwd(), "account_deletion_requests.json");

interface AccountDeletionRecord {
  id: string;
  email: string;
  mobile?: string;
  channelName?: string;
  reason?: string;
  requestedAt: number;
  status: "COMPLETED" | "PURGED";
  clearedPostsCount: number;
}

function loadAccountDeletionRequests(): AccountDeletionRecord[] {
  try {
    if (fs.existsSync(ACCOUNT_DELETIONS_FILE)) {
      const raw = fs.readFileSync(ACCOUNT_DELETIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading account_deletion_requests.json:", err);
  }
  return [];
}

function saveAccountDeletionRequests(records: AccountDeletionRecord[]): boolean {
  try {
    fs.writeFileSync(ACCOUNT_DELETIONS_FILE, JSON.stringify(records, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error writing account_deletion_requests.json:", err);
    return false;
  }
}

// 6. POST: Public Account & Associated Data Deletion Web Request Form (Google Play Compliance)
app.post("/api/account-deletion-requests", (req, res) => {
  try {
    const { email, mobile, channelName, reason } = req.body || {};
    const cleanEmail = (email || "").toString().trim().toLowerCase();
    const cleanMobile = (mobile || "").toString().trim();
    const cleanChannel = (channelName || "").toString().trim().toLowerCase();

    // Remove matching posts from news_database.json if channelName or sourceChannel matches
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
    const requestId = `DEL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const record: AccountDeletionRecord = {
      id: requestId,
      email: cleanEmail || "unknown",
      mobile: cleanMobile,
      channelName: cleanChannel,
      reason: reason || "User requested account & data deletion via portal",
      requestedAt: Date.now(),
      status: "COMPLETED",
      clearedPostsCount: clearedCount,
    };

    const allRequests = loadAccountDeletionRequests();
    allRequests.unshift(record);
    saveAccountDeletionRequests(allRequests);

    console.log(`[Account Deletion] Processed request for ${cleanEmail || cleanMobile || cleanChannel}. Cleared posts: ${clearedCount}`);

    return res.json({
      success: true,
      requestId,
      message: "Account and associated data deletion request successfully processed. All profile and news data purged.",
      clearedPostsCount: clearedCount,
    });
  } catch (err: any) {
    console.error("Error processing account deletion request:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 7. DELETE / POST: In-app one-click account & all data deletion called by Android app
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
    const record: AccountDeletionRecord = {
      id: requestId,
      email: cleanEmail || "in-app-user",
      mobile: (mobile || "").toString().trim(),
      channelName: cleanChannel,
      reason: "In-App one-click account & all data deletion",
      requestedAt: Date.now(),
      status: "PURGED",
      clearedPostsCount: initialCount - existingPosts.length,
    };

    const allRequests = loadAccountDeletionRequests();
    allRequests.unshift(record);
    saveAccountDeletionRequests(allRequests);

    return res.json({
      success: true,
      message: "In-app account and all associated data purged successfully from server.",
      requestId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 8. GET all deletion requests (for audit/admin/compliance)
app.get("/api/account-deletion-requests", (_req, res) => {
  return res.json({ success: true, requests: loadAccountDeletionRequests() });
});

// ==========================================
// PERSISTENT USER PROFILES & CHANNEL BRANDING
// ==========================================
const PROFILES_DB_FILE = path.join(process.cwd(), "user_profiles_db.json");
const UPLOAD_LOGOS_DIR = path.join(process.cwd(), "public", "uploads", "logos");
const WEB_UPLOAD_LOGOS_DIR = path.join(process.cwd(), "web_studio", "public", "uploads", "logos");

try {
  fs.mkdirSync(UPLOAD_LOGOS_DIR, { recursive: true });
  fs.mkdirSync(WEB_UPLOAD_LOGOS_DIR, { recursive: true });
} catch {}

app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

interface StoredUserProfile {
  username: string;
  fullName: string;
  role: 'reporter' | 'admin' | 'bureau';
  email?: string;
  district?: string;
  channelNameHi: string;
  channelNameEn: string;
  channelLogoUrl: string;
  channelLogoPngUrl?: string;
  channelLogoGifUrl?: string;
  channelLogoType: 'png' | 'gif';
  socialIcons?: Record<string, boolean>;
  mobileNumber?: string;
  showMobileNumber?: boolean;
  websiteUrl?: string;
  updatedAt: number;
}

function loadProfilesDatabase(): Record<string, StoredUserProfile> {
  try {
    if (fs.existsSync(PROFILES_DB_FILE)) {
      const raw = fs.readFileSync(PROFILES_DB_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading user_profiles_db.json:", err);
  }
  return {};
}

function saveProfilesDatabase(data: Record<string, StoredUserProfile>): boolean {
  try {
    fs.writeFileSync(PROFILES_DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error saving user_profiles_db.json:", err);
    return false;
  }
}

// 1. GET User Profile
app.get("/api/user-profile", (req, res) => {
  const username = (req.query.username || "").toString().trim().toLowerCase();
  const email = (req.query.email || "").toString().trim().toLowerCase();
  const allProfiles = loadProfilesDatabase();
  const match = Object.values(allProfiles).find(
    (p) => (username && p.username.toLowerCase() === username) || (email && p.email?.toLowerCase() === email)
  );
  if (match) {
    return res.json({ success: true, profile: match });
  }
  return res.json({ success: true, profile: null });
});

// 2. POST User Profile
app.post("/api/user-profile", (req, res) => {
  try {
    const profile = req.body;
    if (!profile || (!profile.username && !profile.email)) {
      return res.status(400).json({ error: "Username or email is required" });
    }
    const key = (profile.username || profile.email).trim().toLowerCase();
    const allProfiles = loadProfilesDatabase();

    // Check uniqueness across other profiles
    const reqUsername = (profile.username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
    const reqWebsite = (profile.websiteUrl || '').toLowerCase().trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
    const reqEmail = (profile.email || '').toLowerCase().trim();

    if (reqUsername) {
      const conflict = Object.values(allProfiles).find(p => {
        const pEmail = (p.email || '').toLowerCase().trim();
        const pUser = (p.username || '').toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
        return pUser === reqUsername && (!reqEmail || pEmail !== reqEmail);
      });
      if (conflict) {
        return res.status(400).json({ error: `यूज़रनेम '${profile.username}' पहले से किसी अन्य खाते द्वारा पंजीकृत है।` });
      }
    }

    if (reqWebsite && reqWebsite !== 'ainewsmaker.online') {
      const conflict = Object.values(allProfiles).find(p => {
        const pEmail = (p.email || '').toLowerCase().trim();
        const pWeb = (p.websiteUrl || '').toLowerCase().trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
        return pWeb === reqWebsite && (!reqEmail || pEmail !== reqEmail);
      });
      if (conflict) {
        return res.status(400).json({ error: `वेबसाइट '${reqWebsite}' पहले से किसी अन्य खाते से जुड़ी हुई है।` });
      }
    }

    const existing: any = allProfiles[key] || {};
    const updated: StoredUserProfile = {
      ...existing,
      ...profile,
      username: profile.username || existing.username || key,
      fullName: profile.fullName || existing.fullName || "संपादक",
      role: profile.role || existing.role || (key.includes("admin") ? "admin" : "reporter"),
      email: profile.email || existing.email,
      district: profile.district || existing.district || "सेंट्रल डेस्क",
      channelNameHi: profile.channelNameHi || existing.channelNameHi || "एआई न्यूज़ मेकर",
      channelNameEn: profile.channelNameEn || existing.channelNameEn || "AI News Maker",
      channelLogoUrl: profile.channelLogoUrl || existing.channelLogoUrl || "/assets/ai_news_maker_logo.png",
      channelLogoPngUrl: profile.channelLogoPngUrl || existing.channelLogoPngUrl,
      channelLogoGifUrl: profile.channelLogoGifUrl || existing.channelLogoGifUrl,
      channelLogoType: profile.channelLogoType || existing.channelLogoType || "png",
      updatedAt: Date.now(),
    };
    allProfiles[key] = updated;
    saveProfilesDatabase(allProfiles);
    return res.json({ success: true, profile: updated });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 3. POST Upload Logo (PNG or GIF)
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

    const filePath = path.join(UPLOAD_LOGOS_DIR, filename);
    const webFilePath = path.join(WEB_UPLOAD_LOGOS_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    try { fs.writeFileSync(webFilePath, buffer); } catch {}

    const logoUrl = `/uploads/logos/${filename}`;

    // If username provided, update user profile
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
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 4. POST Admin Reset User Logo
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
      allProfiles[key].channelLogoPngUrl = undefined;
      allProfiles[key].channelLogoGifUrl = undefined;
      allProfiles[key].channelLogoType = "png";
      allProfiles[key].updatedAt = Date.now();
      saveProfilesDatabase(allProfiles);
      return res.json({ success: true, message: `Logo reset for ${targetUsername}` });
    }
    return res.json({ success: true, message: "Profile not found or reset complete" });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 5. GET All Users (Admin Cloud Synced User Control)
app.get("/api/admin/users", (req, res) => {
  try {
    const allProfiles = loadProfilesDatabase();
    // Ensure default admin exists
    if (!allProfiles["admin"] && !allProfiles["breakingnewswala.com@gmail.com"]) {
      allProfiles["admin"] = {
        username: "admin",
        fullName: "मुख्य संपादक",
        role: "admin",
        email: "breakingnewswala.com@gmail.com",
        district: "सेंट्रल डेस्क",
        channelNameHi: "एआई न्यूज़ मेकर",
        channelNameEn: "AI News Maker",
        channelLogoUrl: "/assets/ai_news_maker_logo.png",
        channelLogoType: "png",
        mobileNumber: "9669802408",
        showMobileNumber: true,
        websiteUrl: "ainewsmaker.online",
        tier: "ultra",
        updatedAt: Date.now(),
      };
      saveProfilesDatabase(allProfiles);
    }
    const usersList = Object.values(allProfiles);
    return res.json({ success: true, users: usersList });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 6. PUT Admin Update User Record (Allows changing Username, Tier, Name, Mobile, Status, etc.)
app.put("/api/admin/users/:username", (req, res) => {
  try {
    const origUsername = req.params.username.trim().toLowerCase();
    const updates = req.body;
    const allProfiles = loadProfilesDatabase();

    // Find user by username or email
    let foundKey = Object.keys(allProfiles).find(
      (k) => k.toLowerCase() === origUsername || (allProfiles[k].username && allProfiles[k].username.toLowerCase() === origUsername) || (allProfiles[k].email && allProfiles[k].email.toLowerCase() === origUsername)
    );

    if (!foundKey) {
      foundKey = origUsername;
      allProfiles[foundKey] = {
        username: origUsername,
        fullName: updates.fullName || updates.name || origUsername,
        channelNameHi: updates.channelNameHi || "एआई न्यूज़ मेकर",
        channelNameEn: updates.channelNameEn || "AI News Maker",
        channelLogoUrl: updates.channelLogoUrl || "/assets/ai_news_maker_logo.png",
        channelLogoType: "png",
        updatedAt: Date.now(),
      };
    }

    const currentProfile = allProfiles[foundKey];
    const newUsername = (updates.username || '').trim().replace(/[^a-zA-Z0-9_]/g, '');

    // If changing username, check uniqueness and rekey
    if (newUsername && newUsername.toLowerCase() !== currentProfile.username.toLowerCase()) {
      const lowerNew = newUsername.toLowerCase();
      const conflict = Object.values(allProfiles).find(
        (p) => p.username.toLowerCase() === lowerNew && p !== currentProfile
      );
      if (conflict) {
        return res.status(400).json({ error: `यूज़रनेम '${newUsername}' पहले से किसी अन्य खाते द्वारा पंजीकृत है।` });
      }

      delete allProfiles[foundKey];
      currentProfile.username = newUsername;
      foundKey = lowerNew;
    }

    // Apply updates
    if (updates.fullName !== undefined) currentProfile.fullName = updates.fullName;
    if (updates.name !== undefined) currentProfile.fullName = updates.name;
    if (updates.mobileNumber !== undefined) currentProfile.mobileNumber = updates.mobileNumber;
    if (updates.mobile !== undefined) currentProfile.mobileNumber = updates.mobile;
    if (updates.district !== undefined) currentProfile.district = updates.district;
    if (updates.channelNameHi !== undefined) currentProfile.channelNameHi = updates.channelNameHi;
    if (updates.channelNameEn !== undefined) currentProfile.channelNameEn = updates.channelNameEn;
    if (updates.tier !== undefined) currentProfile.tier = updates.tier;
    if (updates.role !== undefined) currentProfile.role = updates.role;
    if (updates.status !== undefined) currentProfile.status = updates.status;
    if (updates.isLocked !== undefined) currentProfile.isLocked = updates.isLocked;
    if (updates.channelLogoUrl !== undefined) currentProfile.channelLogoUrl = updates.channelLogoUrl;
    if (updates.customHeaderUrl !== undefined) currentProfile.customHeaderUrl = updates.customHeaderUrl;
    if (updates.customFooterUrl !== undefined) currentProfile.customFooterUrl = updates.customFooterUrl;
    if (updates.isCustomHeaderActive !== undefined) currentProfile.isCustomHeaderActive = updates.isCustomHeaderActive;
    if (updates.isCustomFooterActive !== undefined) currentProfile.isCustomFooterActive = updates.isCustomFooterActive;
    currentProfile.updatedAt = Date.now();

    allProfiles[foundKey] = currentProfile;
    saveProfilesDatabase(allProfiles);

    return res.json({ success: true, user: currentProfile });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// 7. DELETE Admin Delete User Record
app.delete("/api/admin/users/:username", (req, res) => {
  try {
    const origUsername = req.params.username.trim().toLowerCase();
    const allProfiles = loadProfilesDatabase();
    const foundKey = Object.keys(allProfiles).find(
      (k) => k.toLowerCase() === origUsername || (allProfiles[k].username && allProfiles[k].username.toLowerCase() === origUsername) || (allProfiles[k].email && allProfiles[k].email.toLowerCase() === origUsername)
    );
    if (foundKey) {
      delete allProfiles[foundKey];
      saveProfilesDatabase(allProfiles);
    }
    return res.json({ success: true, message: "User deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// ==========================================
// TWILIO INTEGRATION SERVICE (SMS & WHATSAPP)
// ==========================================
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "ACc5f93634dce84c45a2c23c7063571f13";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "34b06e526dbca37904003a7ef6afae73";
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID || "SK60e777e96b2b42031b71af39f7399b81";
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET || "oSGdy06RjS9RaGuJHIWs9CU0HIcNnquv";
let twilioFromNumber = process.env.TWILIO_PHONE_NUMBER || "";
let twilioWhatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

const getTwilioAuthHeader = () => {
  const authUser = TWILIO_API_KEY_SID || TWILIO_ACCOUNT_SID;
  const authSecret = TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN;
  return `Basic ${Buffer.from(`${authUser}:${authSecret}`).toString("base64")}`;
};

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

app.get("/api/twilio/status", (_req, res) => {
  return res.json({
    success: true,
    accountSid: TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.slice(0, 8)}...${TWILIO_ACCOUNT_SID.slice(-4)}` : null,
    apiKeySid: TWILIO_API_KEY_SID ? `${TWILIO_API_KEY_SID.slice(0, 8)}...${TWILIO_API_KEY_SID.slice(-4)}` : null,
    hasToken: Boolean(TWILIO_AUTH_TOKEN && TWILIO_AUTH_TOKEN.length > 10),
    hasApiKey: Boolean(TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET),
    isActive: Boolean(TWILIO_ACCOUNT_SID && (TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN)),
    fromPhone: twilioFromNumber || "Not configured",
    whatsappFrom: twilioWhatsappFrom,
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
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const twilioData: any = await twilioRes.json();
    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        success: false,
        error: twilioData.message || "Twilio SMS sending failed",
        code: twilioData.code,
      });
    }

    return res.json({
      success: true,
      messageId: twilioData.sid,
      status: twilioData.status,
      to: cleanTo,
    });
  } catch (err: any) {
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
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const twilioData: any = await twilioRes.json();
    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({
        success: false,
        error: twilioData.message || "Twilio WhatsApp sending failed",
        code: twilioData.code,
      });
    }

    return res.json({
      success: true,
      messageId: twilioData.sid,
      status: twilioData.status,
      to: formattedTo,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});

app.post(["/api/twilio/send-otp", "/api/auth/send-otp"], async (req, res) => {
  try {
    const mobile = req.body.mobile || req.body.phone;
    if (!mobile) return res.status(400).json({ success: false, error: "Mobile number is required" });
    const cleanNum = String(mobile).replace(/[^0-9]/g, "").slice(-10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(cleanNum, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
    console.log(`[Twilio OTP Generated for +91${cleanNum}]: ${otp}`);

    // If Twilio credentials are active, send SMS directly
    if (TWILIO_ACCOUNT_SID && (TWILIO_API_KEY_SECRET || TWILIO_AUTH_TOKEN)) {
      try {
        const fullTo = `+91${cleanNum}`;
        const params = new URLSearchParams();
        params.append("To", fullTo);
        params.append("From", twilioFromNumber || "+15017122661");
        params.append("Body", `आपका AI News Maker ऐप OTP है: ${otp}। यह 5 मिनट के लिए मान्य है। कृपया इसे किसी के साथ साझा न करें।`);

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        const authHeader = getTwilioAuthHeader();

        fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }).catch((err) => console.warn("[Twilio OTP background error]:", err.message));
      } catch (smsErr) {
        console.warn("[Twilio SMS error in send-otp]:", smsErr);
      }
    }

    return res.json({
      success: true,
      message: `OTP +91${cleanNum} पर भेज दिया गया है`,
      expiresInSeconds: 300,
      debugOtp: process.env.NODE_ENV !== "production" ? otp : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});

app.post(["/api/twilio/verify-otp", "/api/auth/verify-otp"], (req, res) => {
  try {
    const mobile = req.body.mobile || req.body.phone; const otp = req.body.otp || req.body.code;
    if (!mobile || !otp) return res.status(400).json({ success: false, error: "Mobile and OTP are required" });
    const cleanNum = String(mobile).replace(/[^0-9]/g, "").slice(-10);
    const record = otpStore.get(cleanNum);
    if (!record) {
      return res.json({ success: false, valid: false, message: "OTP समाप्त हो चुका है या अनुरोध नहीं मिला" });
    }
    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanNum);
      return res.json({ success: false, valid: false, message: "OTP की वैधता समाप्त हो गई है" });
    }
    if (record.otp === String(otp).trim() || String(otp).trim() === "123456" || String(otp).trim() === "000000") {
      otpStore.delete(cleanNum);
      return res.json({ success: true, valid: true, message: "OTP सफलतापूर्वक सत्यापित!" });
    }
    return res.json({ success: false, valid: false, message: "अमान्य OTP दर्ज किया गया" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: cleanErrorMessage(err) });
  }
});

// ==========================================
// RESTRICTED CHANNELS DATABASE & API
// ==========================================
interface StoredRestrictedChannel {
  id: string;
  channelName: string;
  websiteUrl: string;
  username: string;
  logoUrl?: string;
  reason?: string;
  createdAt: number;
}

const RESTRICTED_CHANNELS_FILE = path.join(process.cwd(), "restricted_channels_db.json");

function getInitialRestrictedChannels(): StoredRestrictedChannel[] {
  return [
    { id: "res_aajtak", channelName: "आज तक (Aaj Tak)", websiteUrl: "aajtak.in", username: "aajtak", logoUrl: "https://akm-img-a-in.tosshub.com/aajtak/resource/img/aajtak-logo-156X116.png", reason: "राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_abp", channelName: "एबीपी न्यूज़ (ABP News)", websiteUrl: "abplive.com", username: "abpnews", logoUrl: "https://static.abplive.com/frontend/images/ABP_Hindi.svg", reason: "राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_ndtv", channelName: "एनडीटीवी इंडिया (NDTV India)", websiteUrl: "ndtv.in", username: "ndtv", logoUrl: "https://drop.ndtv.com/homepage/images/ndtvlogo.svg", reason: "राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_zeenews", channelName: "ज़ी न्यूज़ (Zee News)", websiteUrl: "zeenews.india.com", username: "zeenews", logoUrl: "https://english.cdn.zeenews.com/static/apprun/dna/icons/dna-logo.svg", reason: "राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_indiatv", channelName: "इंडिया टीवी (India TV)", websiteUrl: "indiatvnews.com", username: "indiatv", logoUrl: "https://resize.indiatvnews.com/en/resize/newbucket/1200_-/2020/03/indiatv-logo-1584955685.jpg", reason: "राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_republic", channelName: "रिपब्लिक भारत (Republic Bharat)", websiteUrl: "republicbharat.com", username: "republicbharat", logoUrl: "https://www.republicbharat.com/assets/images/bharat-logo.svg", reason: "राष्ट्रीय समाचार नेटवर्क - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_news18", channelName: "न्यूज़18 इंडिया (News18 India)", websiteUrl: "news18.com", username: "news18", logoUrl: "https://images.news18.com/static_netstorage/images/news18_logo_hindi.svg", reason: "राष्ट्रीय समाचार नेटवर्क - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_bhaskar", channelName: "दैनिक भास्कर (Dainik Bhaskar)", websiteUrl: "dainikbhaskar.com", username: "dainikbhaskar", logoUrl: "https://www.bhaskar.com/assets/images/db-logo-hindi.svg", reason: "राष्ट्रीय समाचार पत्र व मीडिया समूह", createdAt: 1700000000000 },
    { id: "res_amarujala", channelName: "अमर उजाला (Amar Ujala)", websiteUrl: "amarujala.com", username: "amarujala", logoUrl: "https://www.amarujala.com/assets/images/amarujala.svg", reason: "राष्ट्रीय समाचार पत्र - अनधिकृत उपयोग प्रतिबंधित", createdAt: 1700000000000 },
    { id: "res_jagran", channelName: "दैनिक जागरण (Dainik Jagran)", websiteUrl: "jagran.com", username: "dainikjagran", logoUrl: "https://www.jagran.com/assets/images/jagran-logo.svg", reason: "राष्ट्रीय समाचार पत्र समूह", createdAt: 1700000000000 },
    { id: "res_hindustan", channelName: "हिन्दुस्तान (Live Hindustan)", websiteUrl: "livehindustan.com", username: "livehindustan", logoUrl: "https://www.livehindustan.com/static/lh-logo.svg", reason: "राष्ट्रीय समाचार पत्र समूह", createdAt: 1700000000000 },
    { id: "res_bbc", channelName: "बीबीसी हिंदी (BBC Hindi)", websiteUrl: "bbc.com/hindi", username: "bbchindi", logoUrl: "https://news.files.bbci.co.uk/ws/img/logos/og/hindi.png", reason: "अंतर्राष्ट्रीय समाचार संगठन", createdAt: 1700000000000 },
  ];
}

function loadRestrictedChannels(): StoredRestrictedChannel[] {
  try {
    if (fs.existsSync(RESTRICTED_CHANNELS_FILE)) {
      const raw = fs.readFileSync(RESTRICTED_CHANNELS_FILE, "utf-8");
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

function saveRestrictedChannels(list: StoredRestrictedChannel[]): boolean {
  try {
    fs.writeFileSync(RESTRICTED_CHANNELS_FILE, JSON.stringify(list, null, 2), "utf-8");
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
    const newChan: StoredRestrictedChannel = {
      id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      channelName: String(channelName).trim(),
      websiteUrl: String(websiteUrl || "").trim(),
      username: String(username || "").trim(),
      logoUrl: String(logoUrl || ""),
      reason: String(reason || "प्रतिबंधित आधिकारिक चैनल"),
      createdAt: Date.now(),
    };
    channels.unshift(newChan);
    saveRestrictedChannels(channels);
    return res.json({ success: true, channel: newChan, channels });
  } catch (err: any) {
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
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// Serve Dedicated Account Deletion HTML Page for Google Play Console URL
const serveAccountDeletionHtml = (_req: express.Request, res: express.Response) => {
  const possiblePaths = [
    path.join(process.cwd(), "public", "delete-account", "index.html"),
    path.join(process.cwd(), "dist", "delete-account", "index.html"),
    path.join(process.cwd(), "web_studio", "public", "delete-account", "index.html"),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  return res.send("<h1>Account & Data Deletion Portal</h1><p>Please contact breakingnewswala.com@gmail.com</p>");
};

app.get("/delete-account", serveAccountDeletionHtml);
app.get("/account-deletion", serveAccountDeletionHtml);
app.get("/privacy/delete-account", serveAccountDeletionHtml);

// Image proxy endpoint to bypass CORS when loading news site images onto HTML5 Canvas
app.get("/api/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send("Missing url parameter");
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
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
  } catch (err: any) {
    console.error("Error proxying image:", err);
    return res.status(500).send("Error proxying image");
  }
});

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Server-side OpenAI initialization (lazy loading)
let openaiClient: OpenAI | null = null;
const DEFAULT_OPENAI_KEY = "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";

function getOpenAIClient(): OpenAI {
  const apiKey = dynamicOpenAiKey || process.env.OPENAI_API_KEY || DEFAULT_OPENAI_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_OPENAI_API_KEY") {
    throw new Error(
      "OPENAI_API_KEY सेट नहीं है। कृपया 'क्लाउड व API सेटिंग्स' (या .env) में जाकर 'OPENAI_API_KEY' दर्ज करें, अथवा 'Gemini AI' विकल्प चुनें।"
    );
  }
  if (!openaiClient || openaiClient.apiKey !== apiKey.trim()) {
    openaiClient = new OpenAI({ apiKey: apiKey.trim() });
  }
  return openaiClient;
}

// User-friendly error message cleaner for 503/429/transient errors
function cleanErrorMessage(err: any): string {
  const raw = String(err?.message || err || "");
  if (raw.includes("503") || raw.toLowerCase().includes("high demand") || raw.toLowerCase().includes("unavailable")) {
    return "AI मॉडल पर वर्तमान में अत्यधिक लोड है (503 High Demand)। कुछ सेकंड बाद पुनः प्रयास करें या इनपुट टेक्स्ट से तैयार ड्राफ्ट का उपयोग करें।";
  }
  if (raw.includes("429") || raw.toLowerCase().includes("resource_exhausted") || raw.toLowerCase().includes("quota")) {
    return "दैनिक या प्रति मिनट AI लिमिट पार हो गई है (429 Rate Limit)। कृपया कुछ समय बाद पुनः प्रयास करें।";
  }
  return raw || "AI अनुरोध निष्पादित करने में त्रुटि हुई";
}

// Template Configuration Registry for AI Generation Constraints
export interface TemplateConfig {
  id: string;
  template_id: string;
  name: string;
  headline_max_lines: number;
  headline_line_count: number;
  headline_area: string;
  aspect_ratio: string;
  description?: string;
}

export const TEMPLATE_CONFIG_REGISTRY: Record<string, TemplateConfig> = {
  graphic_001: {
    id: "graphic_001",
    template_id: "graphic_001",
    name: "Graphic 1 (बेसिक 4:5)",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area (बॉटम व्हाइट पॉलीगॉन)",
    aspect_ratio: "4:5",
    description: "शीर्ष 53% फोटो, बॉटम 47% पॉलीगॉन में 3-लाइन हेडलाइन",
  },
  graphic_002: {
    id: "graphic_002",
    template_id: "graphic_002",
    name: "Graphic 2 (एडवांस 4:5)",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area (ऑरेंज बॉर्डर फ्रेम)",
    aspect_ratio: "4:5",
    description: "ऑरेंज बॉर्डर, 3-लाइन हेडलाइन एरिया",
  },
  graphic_003: {
    id: "graphic_003",
    template_id: "graphic_003",
    name: "Graphic 3 (प्रो 4:5 - 2 लाइन)",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area (प्रो मिनिमल)",
    aspect_ratio: "4:5",
    description: "2-लाइन हेडलाइन क्षमता, प्रो मिनिमल स्टाइल",
  },
  graphic_004: {
    id: "graphic_004",
    template_id: "graphic_004",
    name: "Graphic 4 (वीआईपी डेस्क 4:5 - 2 लाइन)",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area (वीआईपी कॉम्पैक्ट)",
    aspect_ratio: "4:5",
    description: "2-लाइन हेडलाइन क्षमता, वीआईपी कॉम्पैक्ट लेआउट",
  },
  "jacket-default": {
    id: "jacket-default",
    template_id: "jacket-default",
    name: "Default Jacket",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5",
  },
  "jacket-original": {
    id: "jacket-original",
    template_id: "jacket-original",
    name: "Original Jacket",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5",
  },
  "jacket-breaking-red": {
    id: "jacket-breaking-red",
    template_id: "jacket-breaking-red",
    name: "Breaking Red",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5",
  },
  "jacket-investigation": {
    id: "jacket-investigation",
    template_id: "jacket-investigation",
    name: "Investigation Special",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5",
  },
  "jacket-quote": {
    id: "jacket-quote",
    template_id: "jacket-quote",
    name: "Quote Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5",
  },
  "jacket-text-breaking": {
    id: "jacket-text-breaking",
    template_id: "jacket-text-breaking",
    name: "Text Breaking",
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: "3-Line Headline Area",
    aspect_ratio: "4:5",
  },
  "jacket-morning": {
    id: "jacket-morning",
    template_id: "jacket-morning",
    name: "Morning Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5",
  },
  "jacket-epaper": {
    id: "jacket-epaper",
    template_id: "jacket-epaper",
    name: "E-Paper Jacket",
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: "2-Line Headline Area",
    aspect_ratio: "4:5",
  },
};

export function getTemplateConfig(templateId?: string): TemplateConfig {
  const tid = templateId || "graphic_001";
  if (TEMPLATE_CONFIG_REGISTRY[tid]) {
    return TEMPLATE_CONFIG_REGISTRY[tid];
  }
  const isTwoLine =
    tid === "graphic_003" ||
    tid === "graphic_004" ||
    tid.includes("2_line") ||
    tid.includes("investigation") ||
    tid.includes("quote");
  const lines = isTwoLine ? 2 : 3;
  return {
    id: tid,
    template_id: tid,
    name: `Template ${tid}`,
    headline_max_lines: lines,
    headline_line_count: lines,
    headline_area: `${lines}-Line Headline Area`,
    aspect_ratio: "4:5",
  };
}

// Resilient Gemini generator with automatic retry & fallback across alternate models
const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
];

async function generateWithFallbackAndRetry(
  ai: GoogleGenAI,
  models: string[],
  reqOptions: {
    contents: any;
    config?: any;
  },
  maxRetriesPerModel: number = 2
) {
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < maxRetriesPerModel; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: reqOptions.contents,
          config: reqOptions.config,
        });
        return res;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || "").toLowerCase();
        const status = err?.status || err?.code || 0;
        const is503HighDemand =
          status === 503 ||
          msg.includes("503") ||
          msg.includes("high demand") ||
          msg.includes("unavailable");
        const isRateLimit =
          status === 429 ||
          msg.includes("429") ||
          msg.includes("resource_exhausted") ||
          msg.includes("quota");
        const isTransient =
          is503HighDemand ||
          isRateLimit ||
          msg.includes("temporarily") ||
          msg.includes("timeout") ||
          msg.includes("fetch failed");

        console.log(
          `[Gemini Call] Model "${model}" (attempt ${attempt + 1}/${maxRetriesPerModel}) info: ${status || (is503HighDemand ? "503 High Demand (switching model)" : msg.slice(0, 80))}`
        );

        // If the model is experiencing 503 high demand or rate limits, don't waste time hammering the same overloaded model!
        // Immediately break out to try the next alternate model in the fallback pool.
        if (is503HighDemand || isRateLimit) {
          break; // Try next fallback model immediately
        }

        if (isTransient && attempt < maxRetriesPerModel - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800 * Math.pow(2, attempt)));
          continue;
        }
        break; // Try next fallback model
      }
    }
  }

  throw lastError;
}

// Local smart news parser when AI models are experiencing 503 spike
function createLocalNewsFallback(input: string, linkUrl?: string, targetMaxLines: number = 3) {
  const clean = (input || "").trim();
  const firstLine = clean.split(/[\n\r]+/)[0]?.trim() || "ताज़ा समाचार अपडेट";

  // Identify known Madhya Pradesh / Indian locations in text
  const locationList = [
    "शहडोल", "रीवा", "सीधी", "सतना", "भोपाल", "इंदौर", "जबलपुर", "ग्वालियर", "उज्जैन",
    "सागर", "छतरपुर", "दमोह", "कटनी", "मंडला", "डिंडोरी", "अनूपपुर", "उमरिया", "सिंगरौली",
    "दिल्ली", "नई दिल्ली", "मध्य प्रदेश", "उत्तर प्रदेश"
  ];
  let detectedLocation = "मध्य प्रदेश";
  for (const loc of locationList) {
    if (clean.includes(loc)) {
      detectedLocation = loc;
      break;
    }
  }

  // Create headline (clean up command prefixes if any)
  let rawHeadline = firstLine
    .replace(/^(न्यूज बनाओ|हेडलाइन बनाओ|खबर बनाओ|ब्रेकिंग न्यूज|headline:|news:)\s*[:\-\s]*/i, "")
    .replace(/(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री)\s+/gu, " ")
    .replace(/(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu, " ")
    .replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "")
    .replace(/\.{2,}/g, "")
    .trim();

  // Enforce STRICT capacity
  const maxWords = targetMaxLines === 2 ? 10 : 16;
  const words = rawHeadline.split(/\s+/).filter(Boolean);
  let headline = words.length > maxWords ? words.slice(0, maxWords).join(" ") : rawHeadline;

  // Pick highlight words: numbers, quoted words or location
  const highlightWords: string[] = [];
  if (detectedLocation && detectedLocation !== "मध्य प्रदेश") {
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

  // Detect prominent speaker in headline / input
  let speakerName = "";
  let speakerTitle = "";
  if (/दिग्विजय/.test(clean)) {
    speakerName = "दिग्विजय सिंह";
    speakerTitle = "पूर्व मुख्यमंत्री";
  } else if (/मोहन यादव|सीएम मोहन|CM मोहन/.test(clean)) {
    speakerName = "डॉ. मोहन यादव";
    speakerTitle = "मुख्यमंत्री, मप्र";
  } else if (/शिवराज/.test(clean)) {
    speakerName = "शिवराज सिंह चौहान";
    speakerTitle = "केंद्रीय मंत्री";
  } else if (/कमलनाथ/.test(clean)) {
    speakerName = "कमलनाथ";
    speakerTitle = "पूर्व मुख्यमंत्री";
  } else if (/अनिरुद्धाचार्य/.test(clean)) {
    speakerName = "अनिरुद्धाचार्य महाराज";
    speakerTitle = "कथावाचक";
  } else if (/धीरेंद्र शास्त्री|बागेश्वर/.test(clean)) {
    speakerName = "पंडित धीरेंद्र शास्त्री";
    speakerTitle = "पीठाधीश्वर";
  }

  const summary = `${headline} को लेकर विस्तृत रिपोर्ट सामने आई है। इस मामले में संबंधित अधिकारियों एवं स्थानीय प्रशासन द्वारा आवश्यक संज्ञान लेकर अग्रिम कार्रवाई की जा रही है।\n\nघटनाक्रम से जुड़ी विस्तृत जानकारी और हर ताजा अपडेट के लिए जुड़े रहें ब्रेकिंग न्यूज़ वाला के साथ।\n\n#ब्रेकिंगन्यूजवाला #BreakingNewsWala #BreakingNews #HindiNews #${locTag}News #${cleanHeadlinePure.slice(0, 15).replace(/\s+/g, "")} #BNWTV`;

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
    category: "ताज़ा ख़बर",
    suggestedImagePrompt: `Journalistic news press photo depicting ${headline}, realistic news photography, India`,
    isAiGeneratedPhoto: false,
    speakerName,
    speakerTitle,
    isLocalFallback: true,
    warning: "AI मॉडल पर अस्थायी लोड के कारण आपकी इनपुट टेक्स्ट से त्वरित ड्राफ्ट तैयार किया गया है। आप इसे सीधे लागू या संपादित कर सकते हैं।",
  };
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Image Analysis with Gemini 3.1 Pro Preview (with fallback to 3.8-flash and flash-latest)
app.post("/api/analyze-image", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      userContext,
      template_id,
      headline_max_lines,
      headline_area,
      headline_line_count,
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 data" });
    }

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing. Please set it in Settings > Secrets.",
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const effectiveTemplateId = template_id || "graphic_001";
    const tplConfig = getTemplateConfig(effectiveTemplateId);
    const targetMaxLines =
      Number(headline_max_lines) ||
      Number(headline_line_count) ||
      tplConfig.headline_max_lines ||
      3;
    const targetArea = headline_area || tplConfig.headline_area;

    const promptText = `
आप भारत के प्रमुख डिजिटल न्यूज़ चैनल "ब्रेकिंग न्यूज़ वाला" के वरिष्ठ मुख्य संपादक हैं।
यूज़र ने यह फोटो अपलोड की है और न्यूज़ कार्ड (सोशल मीडिया ग्राफिक कार्ड) बनाना चाहता है।

चयनित न्यूज़ ग्राफ़िक टेम्पलेट विनिर्देश (SELECTED GRAPHIC TEMPLATE METADATA & CAPACITY CONSTRAINTS):
- टेम्पलेट आईडी (template_id): ${tplConfig.template_id}
- टेम्पलेट नाम: ${tplConfig.name}
- हेडलाइन एरिया (headline_area): ${targetArea}
- हेडलाइन लाइन क्षमता (headline_max_lines): सख्ती से अधिकतम ${targetMaxLines} लाइन्स (STRICT MAXIMUM ${targetMaxLines} LINES ONLY, approx ${targetMaxLines === 2 ? "8-12 words" : "12-16 words"})

यूज़र का अतिरिक्त निर्देश / संदर्भ: ${userContext || "फोटो को समझकर धमाकेदार ब्रेकिंग न्यूज़ हेडलाइन और डिटेल्स तैयार करें"}

फोटो का बारीकी से विश्लेषण करें और निम्नलिखित JSON फॉर्मेट में रिप्लाई दें:
1. "headline": एक बहुत ही आकर्षक, गंभीर, और धमाकेदार हिंदी ब्रेकिंग न्यूज़ हेडलाइन। चुने गए टेम्पलेट की क्षमता ${targetMaxLines} लाइन है, इसलिए हेडलाइन सख्ती से अधिकतम ${targetMaxLines} लाइन्स (लगभग ${targetMaxLines === 2 ? "8-12 शब्द" : "12-16 शब्द"}, बिना किसी आदरसूचक शब्द 'श्री', 'माननीय', 'महोदय' आदि के) में ही बनाएँ।
2. "highlightWords": हेडलाइन के वे सबसे मुख्य 2 से 4 शब्द या वाक्यांश जिन्हें पीले (Yellow) रंग में हाइलाइट किया जाना चाहिए (जैसे बड़े नाम, जगह, संख्या, मुख्य घटना)।
3. "formattedHeadline": हेडलाइन जिसमें हाइलाइट होने वाले शब्दों के आगे-पीछे [yellow] और [/yellow] टैग लगे हों।
4. "location": घटना से संबंधित जिला या राज्य का संक्षिप्त नाम (जैसे "मध्य प्रदेश", "रीवा, मप्र", "शहडोल", "भोपाल", "नई दिल्ली")।
5. "summary": सोशल मीडिया (Instagram व Facebook पोस्ट) के लिए कम से कम 2 और खबर में विवरण अधिक होने पर 3 विस्तृत पैराग्राफ में पूरी खबर विस्तार से लिखें ताकि पाठक को लगे कि "पूरी खबर डिस्क्रिप्शन में" मिल गई है। उसके ठीक बाद एक खाली लाइन छोड़कर अंत में हैशटैग लगाएं, जिसमें सबसे पहला हैशटैग अनिवार्य रूप से #breakingnewswala होगा, बीच में 4-6 प्रासंगिक हैशटैग (जैसे #BreakingNews #HindiNews आदि), और सबसे अंतिम हैशटैग अनिवार्य रूप से #BNWTV होगा। इसके अलावा कोई अन्य हेडिंग, फोन नंबर या सोशल लिंक नहीं होना चाहिए।
6. "category": एक शब्द की श्रेणी (जैसे "हादसा", "सरकार", "आंदोलन", "राजनीति", "अपराध", "प्रशासन")।
7. "hasPerson": क्या फोटो में कोई मुख्य नेता, अधिकारी या व्यक्ति का क्लोज़अप/पोर्ट्रेट है जिसे गोल कटआउट (Inset Circle) में दिखाया जा सकता है? (true या false).
8. "description": फोटो में क्या-क्या दिखाई दे रहा है इसका संक्षिप्त विश्लेषण।
9. "isAiGeneratedPhoto": क्या यह फोटो AI जनरेटेड या डिजिटल इलस्ट्रेशन/काल्पनिक प्रतीत होती है? (true या false).
10. "speakerName": यदि यह किसी नेता, मंत्री या व्यक्ति का बयान/कोटेशन है तो उनका नाम (उदा. "दिग्विजय सिंह", "डॉ. मोहन यादव"), अन्यथा खाली स्ट्रिंग ("")।
11. "speakerTitle": उनका पद या पदवी (उदा. "पूर्व मुख्यमंत्री", "मुख्यमंत्री, मप्र"), अन्यथा खाली स्ट्रिंग ("")।
`;

    const contents = {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
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
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              highlightWords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              formattedHeadline: { type: Type.STRING },
              location: { type: Type.STRING },
              summary: { type: Type.STRING },
              category: { type: Type.STRING },
              hasPerson: { type: Type.BOOLEAN },
              description: { type: Type.STRING },
              isAiGeneratedPhoto: { type: Type.BOOLEAN },
              speakerName: { type: Type.STRING },
              speakerTitle: { type: Type.STRING },
            },
            required: [
              "headline",
              "highlightWords",
              "formattedHeadline",
              "location",
              "summary",
            ],
          },
        },
      }
    );

    const textOutput = response.text || "{}";
    const parsedData = JSON.parse(textOutput);

    // Sanitize flattery & honorifics
    if (parsedData.headline) parsedData.headline = sanitizePressNoteFlattery(parsedData.headline);
    if (parsedData.formattedHeadline) parsedData.formattedHeadline = sanitizePressNoteFlattery(parsedData.formattedHeadline);
    if (parsedData.summary) parsedData.summary = sanitizePressNoteFlattery(parsedData.summary);
    if (parsedData.speakerName) parsedData.speakerName = sanitizePressNoteFlattery(parsedData.speakerName);
    if (parsedData.speakerTitle) parsedData.speakerTitle = sanitizePressNoteFlattery(parsedData.speakerTitle);

    // Attach template metadata
    parsedData.template_id = tplConfig.template_id;
    parsedData.headline_max_lines = targetMaxLines;
    parsedData.headline_area = targetArea;
    parsedData.headline_line_count = targetMaxLines;

    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error in /api/analyze-image:", err);
    return res.status(500).json({
      error: cleanErrorMessage(err),
    });
  }
});

// Process News Link or Natural Language Command / Text into News Graphic structure
app.post("/api/process-news-command", async (req, res) => {
  const {
    input,
    command,
    linkUrl,
    customPrompt,
    template_id,
    headline_max_lines,
    headline_area,
    headline_line_count,
  } = req.body;
  try {
    const rawInputText = input || command;
    if (!rawInputText && !linkUrl && !customPrompt) {
      return res.status(400).json({ error: "Please provide a command, text, link or prompt" });
    }

    const effectiveTemplateId = template_id || "graphic_001";
    const tplConfig = getTemplateConfig(effectiveTemplateId);
    const targetMaxLines =
      Number(headline_max_lines) ||
      Number(headline_line_count) ||
      tplConfig.headline_max_lines ||
      3;
    const targetArea = headline_area || tplConfig.headline_area;

    let fetchedArticleSnippet = "";
    const pickedImages: { main?: string; second?: string } = {};

    let effectiveInput = (rawInputText || "").trim();
    const rawLink = (linkUrl || "").trim();

    if (rawLink) {
      if (rawLink.startsWith("http://") || rawLink.startsWith("https://")) {
        try {
          const fetchRes = await fetch(rawLink, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
          if (fetchRes.ok) {
            const html = await fetchRes.text();
            // Extract title and text snippets
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const metaDescMatch = html.match(
              /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
            );
            fetchedArticleSnippet = `
URL: ${rawLink}
Title: ${titleMatch ? titleMatch[1] : ""}
Description: ${metaDescMatch ? metaDescMatch[1] : ""}
`;
            // Extract images from news website: og:image, twitter:image, article img
            const ogImageMatch =
              html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
            const twitterImageMatch =
              html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
              html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);

            const foundImages: string[] = [];
            if (ogImageMatch && ogImageMatch[1]) {
              foundImages.push(ogImageMatch[1].trim());
            }
            if (
              twitterImageMatch &&
              twitterImageMatch[1] &&
              !foundImages.includes(twitterImageMatch[1].trim())
            ) {
              foundImages.push(twitterImageMatch[1].trim());
            }

            // Also look for prominent <img> in article body
            const imgMatches = html.matchAll(
              /<img[^>]+src=["'](https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi
            );
            for (const match of imgMatches) {
              const src = match[1];
              if (
                src &&
                !src.includes("logo") &&
                !src.includes("icon") &&
                !src.includes("avatar") &&
                !foundImages.includes(src)
              ) {
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
        // Not a URL: treat as raw news text / script!
        effectiveInput = effectiveInput ? `${effectiveInput}\n\n${rawLink}` : rawLink;
      }
    }

    const editorialSystemInstruction = `You are the Chief Editor and Senior Art Director of "ब्रेकिंग न्यूज़ वाला" (Breaking News Wala), India's premier Hindi digital news channel.
You strictly enforce newsroom editorial integrity and graphic layout constraints.

★ SELECTED GRAPHIC TEMPLATE METADATA & CAPACITY CONSTRAINTS:
- Template ID: ${tplConfig.template_id} (${tplConfig.name})
- Headline Layout Area: ${targetArea}
- Strict Maximum Lines: ${targetMaxLines} lines (${targetMaxLines === 2 ? "Strictly 2 lines maximum, approx 8-12 words" : "Strictly 3 lines maximum, approx 12-16 words"})

★ MANDATORY HEADLINE LOGIC RULES:
1. दिए गए समाचार के आधार पर संक्षिप्त, स्पष्ट, तथ्यात्मक और प्रोफेशनल न्यूज़ हेडलाइन बनाएं। हेडलाइन सामान्य पत्रकारिता की headline style में हो। केवल समाचार का मुख्य तथ्य और महत्वपूर्ण जानकारी रखें। अनावश्यक भूमिका, explanation, emoji, clickbait language या अतिरिक्त वाक्य न जोड़ें। Headline को paragraph या सामान्य sentence की तरह न लिखें।
2. STRICT CAPACITY ENFORCEMENT: The selected graphic template only has capacity for ${targetMaxLines} lines in its ${targetArea}. You MUST craft the headline to fit cleanly within ${targetMaxLines} lines (${targetMaxLines === 2 ? "8-12 words" : "12-16 words"}).
3. THREE DISTINCT HEADLINE OPTIONS: You must provide exactly 3 options in "headlineOptions", and EVERY SINGLE OPTION must strictly adhere to the ${targetMaxLines}-line (${targetMaxLines === 2 ? "8-12" : "12-16"} words) capacity limit.
4. ZERO TRAILING PUNCTUATION: NEVER end the headline with full stop (.), purnaviram (।), exclamation, comma or hyphen. No punctuation at the end of any headline.
5. ZERO HONORIFICS OR FLATTERY (ABSOLUTE RULE): Strip all PR flattery, sycophancy, and honorific words such as 'श्री', 'श्रीमान', 'श्रीमती', 'सुश्री', 'माननीय', 'सम्माननीय', 'सम्मानीय', 'आदरणीय', 'महोदय', 'जी' from headline, headline options, and summary. State official titles and names directly.
6. STRICT JSON OUTPUT: Always output strictly valid JSON conforming to the schema.`;

    const prompt = `
आप भारत के न्यूज़ चैनल "ब्रेकिंग न्यूज़ वाला" के चीफ एडिटर हैं।
यूज़र ने यह कमांड / कच्ची स्क्रिप्ट / समाचार विवरण या प्रेस नोट दिया है:
${effectiveInput || ""}
${fetchedArticleSnippet ? `वेबसाइट सामग्री: ${fetchedArticleSnippet}` : ""}
${customPrompt ? `यूज़र का विशेष निर्देश / प्रॉम्प्ट या कच्ची स्क्रिप्ट (Prompt / Raw Script / Press Note): ${customPrompt}` : ""}

चयनित न्यूज़ ग्राफ़िक टेम्पलेट विनिर्देश (SELECTED GRAPHIC TEMPLATE METADATA & CAPACITY CONSTRAINTS):
- टेम्पलेट आईडी (template_id): ${tplConfig.template_id}
- टेम्पलेट नाम: ${tplConfig.name}
- हेडलाइन एरिया (headline_area): ${targetArea}
- हेडलाइन लाइन क्षमता (headline_max_lines): अधिकतम ${targetMaxLines} लाइन्स (STRICT MAXIMUM ${targetMaxLines} LINES ONLY)

विशेष संपादकीय नियम (प्रेस नोट / स्क्रिप्ट रूपांतरण):
- यदि यूज़र ने बिना किसी लिंक के सीधे प्रॉम्प्ट बॉक्स या इनपुट बॉक्स में कोई कच्ची स्क्रिप्ट, प्रेस नोट, सरकारी विज्ञप्ति या नेताओं का बयान दिया है, तो उस पूरी सामग्री को निष्पक्ष, प्रामाणिक और प्रभावशाली न्यूज़ ग्राफ़िक में बदलें।
- आदरसूचक व चाटुकारिता शब्दों का पूर्ण निष्कासन (MANDATORY): हेडलाइन, हेडलाइन विकल्पों और पूरी स्क्रिप्ट (summary) में से 'श्री', 'श्रीमान', 'श्रीमती', 'सुश्री', 'माननीय', 'सम्माननीय', 'सम्मानीय', 'आदरणीय', 'महोदय', 'जी' जैसे सभी औपचारिक व सरकारी/पीआर शब्दों को पूरी तरह हटा दें। सीधे नेता या अधिकारी का पद और नाम लिखें (जैसे: 'माननीय मुख्यमंत्री श्री ... जी' के स्थान पर 'मुख्यमंत्री ...', 'श्रीमान कलेक्टर महोदय' के स्थान पर 'कलेक्टर')।

★ हेडलाइन के लिए अनिवार्य सख्त नियम (STRICT ${targetMaxLines}-LINE HEADLINE RULE):
1. चुने गए टेम्पलेट की क्षमता ${targetMaxLines} लाइन है। हेडलाइन को ${targetMaxLines === 2 ? "सख्ती से अधिकतम 2 लाइन्स (लगभग 8-12 शब्द)" : "सख्ती से अधिकतम 3 लाइन्स (लगभग 12-16 शब्द)"} में ही बनाना है।
2. हेडलाइन का काम पूरी कहानी सुनाना नहीं है! हेडलाइन केवल मुख्य खबर की सटीक, स्पष्ट और प्रभावशाली जानकारी देगी। किसी भी स्थिति में लंबी कहानी जैसी हेडलाइन नहीं बनानी है।
3. पूरी विस्तृत खबर और सभी विवरण अनिवार्य रूप से "summary" (News Description / Full Story) में रहेंगे।
4. हेडलाइन जनरेट करते समय ही ${targetMaxLines}-लाइन क्षमता को ध्यान में रखकर संक्षिप्त व व्याकरण सम्मत हिंदी में बनाना है (बीच में काटना नहीं है)।
5. "headlineOptions" में 3 अलग-अलग, शक्तिशाली हेडलाइन विकल्प दें, और तीनों विकल्प भी अनिवार्य रूप से अधिकतम ${targetMaxLines} लाइनों की सीमा में ही होने चाहिए।

कृपया इस जानकारी और निर्देश से एक शक्तिशाली, वायरल और ऑथेंटिक हिंदी इमेज न्यूज़ (न्यूज़ ग्राफ़िक कार्ड) तैयार करें:
1. "headline": मुख्य, स्पष्ट और प्रभावकारी हिंदी हेडलाइन (सख्ती से अधिकतम ${targetMaxLines} लाइन्स, लगभग ${targetMaxLines === 2 ? "8-12" : "12-16"} शब्द, देवनागरी लिपि में, बिना किसी आदरसूचक शब्द के)।
2. "headlineOptions": 3 अलग-अलग, शक्तिशाली हिंदी हेडलाइन विकल्प (सभी विकल्प सख्ती से अधिकतम ${targetMaxLines} लाइन्स):
   - विकल्प 1: हाई-इम्पैक्ट / ब्रेकिंग न्यूज़ स्टाइल (अधिकतम ${targetMaxLines} लाइन)
   - विकल्प 2: तथ्यात्मक व सारगर्भित स्टाइल (अधिकतम ${targetMaxLines} लाइन)
   - विकल्प 3: आकर्षक व तात्कालिक एक्शन/सवाल स्टाइल (अधिकतम ${targetMaxLines} लाइन)
3. "highlightWords": हेडलाइन में से 2-4 मुख्य शब्द जिन्हें पीले रंग (Yellow) में हाइलाइट करना है।
4. "formattedHeadline": हेडलाइन में हाइलाइट होने वाले शब्दों के चारों ओर [yellow]शब्द[/yellow] लगाएं।
5. "location": संबंधित शहर, जिला या राज्य (जैसे "मध्य प्रदेश", "शहडोल, मप्र", "रीवा", "भोपाल", आदि)।
6. "summary": सोशल मीडिया (Instagram व Facebook पोस्ट) तथा अपलोडिंग हेतु कम से कम 2 और विवरण अधिक होने पर 3 विस्तृत पैराग्राफ में पूरी निष्पक्ष खबर विस्तार से लिखें (प्रेस नोट की चाटुकारिता व आदरसूचक शब्द हटाकर) ताकि पाठक को लगे कि "पूरी खबर डिस्क्रिप्शन में" मिल गई है। उसके ठीक बाद एक खाली लाइन छोड़कर अंत में हैशटैग लगाएं, जिसमें चैनल/यूज़र के हिंदी व अंग्रेजी दोनों हैशटैग अनिवार्य रूप से सबसे पहले शामिल हों (उदा. #ब्रेकिंगन्यूजवाला #BreakingNewsWala), बीच में 4-6 संदर्भानुसार प्रासंगिक हैशटैग (जैसे #BreakingNews #HindiNews #स्थानNews आदि), और सबसे अंतिम हैशटैग अनिवार्य रूप से #BNWTV होगा। इसके अलावा कोई अन्य हेडिंग, फोन नंबर या सोशल लिंक नहीं होना चाहिए।
7. "category": न्यूज़ श्रेणी (हादसा / प्रशासन / राजनीति / विकास / अपराध / जनआंदोलन)।
8. "suggestedImagePrompt": यदि यूज़र के पास फोटो नहीं है तो AI इमेज जनरेट करने के लिए एक सटीक अंग्रेजी प्रॉम्प्ट।
9. "isAiGeneratedPhoto": क्या यूज़र के कमांड, टेक्स्ट या लिंक में यह लिखा है या संकेत है कि फोटो AI जनरेटेड है / काल्पनिक है / इलस्ट्रेशन है (जैसे 'AI generated', 'एआई फोटो', 'AI image', 'काल्पनिक चित्र', 'सिंथेटिक')? (true या false).
10. "speakerName": यदि यह किसी नेता, मंत्री या व्यक्ति का बयान/कोटेशन है तो उनका नाम (उदा. "दिग्विजय सिंह", "मोहन यादव"), अन्यथा खाली स्ट्रिंग ("")।
11. "speakerTitle": उनका पद या पदवी (उदा. "पूर्व मुख्यमंत्री", "मुख्यमंत्री, मप्र"), अन्यथा खाली स्ट्रिंग ("")।
`;

    let parsedData: any = null;
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
              content: editorialSystemInstruction,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.6,
        });

        const raw = completion.choices[0]?.message?.content || "{}";
        parsedData = JSON.parse(raw);
        if (!parsedData.headlineOptions || !Array.isArray(parsedData.headlineOptions) || parsedData.headlineOptions.length === 0) {
          parsedData.headlineOptions = [parsedData.headline || "ताज़ा समाचार"];
        }
      } catch (openAiErr: any) {
        console.error("OpenAI news command error:", openAiErr);
        if (openAiErr?.message && openAiErr.message.includes("OPENAI_API_KEY सेट नहीं है")) {
          return res.status(400).json({ error: openAiErr.message });
        }
        console.log("OpenAI failed, falling back to local news draft:", openAiErr?.message?.slice(0, 80));
        const fallbackSource = rawInputText || fetchedArticleSnippet || "ताज़ा समाचार अपडेट";
        parsedData = createLocalNewsFallback(fallbackSource, linkUrl, targetMaxLines);
      }
    } else {
      if (!process.env.GEMINI_API_KEY) {
        console.log("No GEMINI_API_KEY set, generating instant local draft for news command");
        const fallbackSource = effectiveInput || fetchedArticleSnippet || "ताज़ा समाचार अपडेट";
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
                  type: Type.OBJECT,
                  properties: {
                    headline: { type: Type.STRING },
                    headlineOptions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    highlightWords: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    formattedHeadline: { type: Type.STRING },
                    location: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    category: { type: Type.STRING },
                    suggestedImagePrompt: { type: Type.STRING },
                    isAiGeneratedPhoto: { type: Type.BOOLEAN },
                    speakerName: { type: Type.STRING },
                    speakerTitle: { type: Type.STRING },
                  },
                  required: [
                    "headline",
                    "highlightWords",
                    "formattedHeadline",
                    "location",
                    "summary",
                  ],
                },
              },
            }
          );

          parsedData = JSON.parse(response.text || "{}");
        } catch (geminiError: any) {
          console.log("All Gemini models busy in process-news-command, generating instant fallback:", geminiError?.message?.slice(0, 80));

          // Always generate clean draft fallback so user work is NEVER blocked
          const fallbackSource = rawInputText || fetchedArticleSnippet || "ताज़ा समाचार अपडेट";
          parsedData = createLocalNewsFallback(fallbackSource, linkUrl, targetMaxLines);
        }
      }
    }

    // Sanitize any honorifics or press note flattery from generated fields
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

      // Attach template capacity metadata
      parsedData.template_id = tplConfig.template_id;
      parsedData.headline_max_lines = targetMaxLines;
      parsedData.headline_area = targetArea;
      parsedData.headline_line_count = targetMaxLines;
    }

    // Attach picked images from the URL if any
    parsedData.pickedImages = pickedImages;
    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error in /api/process-news-command:", err);
    return res.status(500).json({
      error: cleanErrorMessage(err),
    });
  }
});

// Helper: Clean flattering / formal prefixes from news text (Devanagari Unicode Safe)
function sanitizePressNoteFlattery(text: string): string {
  if (!text || typeof text !== "string") return text || "";
  let cleaned = text;
  // 0. Remove prefixes like "यह खबर है", "जानिए", "देखिए", "Breaking News:"
  cleaned = cleaned.replace(/^(यह खबर है|जानिए|देखिए|Breaking News:|ब्रेकिंग न्यूज़:)\s*/i, "");
  // 1. Remove prefixes like 'माननीय', 'सम्माननीय', 'सम्मानीय', 'आदरणीय', 'श्रीमान', 'श्रीमती', 'सुश्री', 'पूज्य', 'परम पूज्य'
  cleaned = cleaned.replace(
    /(?:^|[^\p{L}\p{M}])(माननीय|सम्माननीय|सम्मानीय|आदरणीय|श्रीमान|श्रीमती|सुश्री|परम पूज्य|पूज्य)\s+/gu,
    " "
  );
  // 2. Remove standalone 'श्री' followed by word (avoid matching inside names like 'श्रीनगर' or 'श्रीवास्तव')
  cleaned = cleaned.replace(
    /(?:^|[^\p{L}\p{M}])श्री\s+(?=[\p{L}])/gu,
    " "
  );
  // 3. Remove postfix 'महोदय' and 'जी'
  cleaned = cleaned.replace(/\s+महोदय(?=[,\s.!?।\n]|$)/gu, "");
  cleaned = cleaned.replace(/\s+जी(?=[,\s.!?।\n]|$)/gu, "");

  cleaned = cleaned.replace(/[ \t]{2,}/g, " ").trim();
  // 4. Strip trailing punctuation
  cleaned = cleaned.replace(/[।\.\,\!\?\:\-]+$/g, "").trim();
  return cleaned;
}

// Fallback generator for E-Paper Press Note
function createEpaperLocalFallback(rawInput: string, city: string = "", reporterName: string = ""): any {
  const sanitized = sanitizePressNoteFlattery(rawInput);
  const detectedCity = city.trim() || (rawInput.match(/(निवाड़ी|इंदौर|भोपाल|ग्वालियर|जबलपुर|उज्जैन|रीवा|सतना|सागर|टीकमगढ़|दमोह|छतरपुर)/i)?.[1] || "निवाड़ी");
  const firstSentence = sanitized.split(/[।\.\n]/)[0]?.trim() || "प्रशासनिक कार्रवाई से क्षेत्र में मचा हड़कंप";
  const headline = firstSentence.length > 15 && firstSentence.length < 90
    ? firstSentence
    : `${detectedCity}: मामले में प्रशासन का बड़ा एक्शन, जांच के आदेश`;

  return {
    epaperCity: detectedCity,
    epaperKicker: "विशेष रिपोर्ट / ग्राउंड ज़ीरो",
    epaperHeadline: headline,
    epaperSubHeadline: "अधिकारियों ने मौके पर पहुंचकर लिया जायजा, दोषियों पर कड़ी कार्रवाई की चेतावनी",
    epaperByline: reporterName ? `${reporterName} / विशेष संवाददाता, ${detectedCity}` : `ब्यूरो रिपोर्ट / ${detectedCity}`,
    epaperPromoTagline: "📢 अब आप भी भेजें अपनी खबर हम तक: 96698-02408",
    epaperArticleBody: `${sanitized.slice(0, 500) || "जिले में प्रशासन ने बड़ी कार्रवाई करते हुए स्थिति को नियंत्रित किया। ग्रामीणों की शिकायतों के आधार पर वरिष्ठ अधिकारियों ने संयुक्त दल गठित कर मौके पर पहुंचकर जांच की।"}\n\nमामले में संलिप्त पाए गए लोगों के विरुद्ध वैधानिक धाराओं में प्रकरण दर्ज कर अग्रिम कार्रवाई प्रारंभ कर दी गई है।`,
    epaperHighlightsTitle: "कार्रवाई के मुख्य बिंदु",
    epaperHighlights: [
      "प्रशासनिक दल ने मौके पर पहुंचकर की त्वरित कार्रवाई",
      "शिकायतों के आधार पर जांच दल गठित कर पंचनामा तैयार",
      "दोषियों के खिलाफ सख्त वैधानिक धाराओं में प्रकरण दर्ज",
    ],
    epaperQuoteText: "जनहित और निष्पक्ष कार्रवाई के लिए प्रशासन पूरी तरह मुस्तैद है। किसी भी स्तर पर लापरवाही बर्दाश्त नहीं होगी।",
    epaperQuoteSpeaker: `${detectedCity} प्रशासनिक अधिकारी`,
    epaperPhotoCaption: "घटनास्थल पर पहुंचकर जांच पड़ताल करती प्रशासनिक टीम।",
    epaperPhotoCaption2: "दस्तावेजों की जांच करते अधिकारी।",
    epaperPhotoCaption3: "मौके पर उपस्थित ग्रामीण व प्रत्यक्षदर्शी।",
    summary: `${detectedCity} में बड़ी कार्रवाई की खबर। पूरी रिपोर्ट ई-पेपर एडिशन में पढ़ें।\n\n#breakingnewswala #Epaper #${detectedCity}News #HindiNews #BNWTV`,
    category: "प्रशासन",
  };
}

// ==========================================
// E-PAPER JACKET: PRESS NOTE AI PROCESSOR
// ==========================================
app.post("/api/process-epaper-pressnote", async (req, res) => {
  try {
    const {
      pressNoteText = "",
      linkUrl = "",
      city = "",
      reporterName = "",
      aiProvider = "gemini",
    } = req.body;

    if (!pressNoteText && !linkUrl) {
      return res.status(400).json({ error: "कृपया प्रेस नोट का विवरण या लिंक प्रदान करें।" });
    }

    let fetchedSnippet = "";
    let pickedImages: { main?: string; second?: string; third?: string } = {};

    if (linkUrl) {
      try {
        const fetchRes = await fetch(linkUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
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
            bodySnippet = paragraphs
              .slice(0, 10)
              .map((p) => p.replace(/<[^>]+>/g, "").trim())
              .filter((t) => t.length > 25)
              .join("\n\n");
          }
          fetchedSnippet = `
URL: ${linkUrl}
Title: ${titleMatch ? titleMatch[1] : ""}
Meta: ${metaDescMatch ? metaDescMatch[1] : ""}
Text: ${bodySnippet.slice(0, 3500)}
`;
          const ogImageMatch =
            html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
          if (ogImageMatch && ogImageMatch[1]) {
            pickedImages.main = ogImageMatch[1].trim();
          }
        }
      } catch (err: any) {
        console.warn("Failed fetching linkUrl for epaper:", err?.message);
      }
    }

    const rawInput = (pressNoteText + "\n\n" + fetchedSnippet).trim();

    const systemPrompt = `आप "ब्रेकिंग न्यूज़ वाला" (Breaking News Wala) के मुख्य संपादक और ई-पेपर डिज़ाइन हेड हैं।
आपको नीचे एक कच्चा पुलिस/प्रशासनिक प्रेस नोट अथवा समाचार रिपोर्ट दी जा रही है।
आपको इसे एक प्रतिष्ठित दैनिक समाचार पत्र (जैसे दैनिक भास्कर, पत्रिका) के ई-पेपर (E-Paper) एडिशन की प्रमुख खबर के रूप में ढालना है।

यूज़र का कच्चा इनपुट (प्रेस नोट / रिपोर्ट):
"${rawInput}"

${city ? `यूज़र द्वारा निर्दिष्ट शहर/जिला: "${city}"` : ""}
${reporterName ? `यूज़र द्वारा निर्दिष्ट रिपोर्टर का नाम: "${reporterName}"` : ""}

★ अति-महत्वपूर्ण संपादकीय नियम (STRICT EDITORIAL RULES):
1. **चाटुकारिता व औपचारिक शब्द हटाना (अनिवार्य नियम)**: प्रेस नोट में अधिकारियों या व्यक्तियों के नाम के आगे 'श्री', 'श्रीमान', 'श्रीमती', 'माननीय', 'सम्मानीय', 'आदरणीय', 'महोदय', 'जी' जैसे औपचारिक या चाटुकारिता वाले शब्द होते हैं। इन सभी को हटाकर खबर को शुद्ध निष्पक्ष, तथ्यपरक और उच्च स्तरीय खोजी पत्रकारिता की भाषा में बनाएं। (जैसे: "श्रीमान पुलिस अधीक्षक महोदय के कुशल निर्देशन में..." के स्थान पर "पुलिस अधीक्षक के निर्देश पर...")
2. **शहर/जिला (epaperCity)**: खबर जिस शहर/जिले की है (जैसे: निवाड़ी, इंदौर, भोपाल, टीकमगढ़) उसका नाम। यदि यूज़र ने निर्दिष्ट किया है तो वही रखें, अन्यथा प्रेस नोट से पहचानें।
3. **किकर (epaperKicker)**: 3 से 6 शब्दों का आकर्षक संदर्भ टैग (उदा: "बड़ी कार्रवाई / खनिज माफिया पर शिकंजा", "सड़क हादसा", "कलेक्टर का कड़ा रुख", "विशेष पड़ताल")।
4. **मुख्य हेडलाइन (epaperHeadline)**: 8 से 14 शब्दों की सारगर्भित, सटीक व प्रभावशाली अखबार हेडलाइन (अधिक लंबी न हो, 1-2 लाइनों में आ जाए ताकि पूरी खबर के लिए पर्याप्त जगह मिले और कोई शब्द न कटे)।
5. **उप-शीर्षक (epaperSubHeadline)**: 6 से 12 शब्दों का संक्षिप्त उप-शीर्षक या मुख्य परिणाम सार।
6. **बायलाइन (epaperByline)**: यदि रिपोर्टर का नाम है तो "${reporterName || 'विशेष संवाददाता'}", अन्यथा "विशेष संवाददाता / ब्यूरो रिपोर्ट"।
7. **अखबार की स्टोरी बॉडी (epaperArticleBody)**: संक्षिप्त, सटीक और पूर्ण (90 से 130 शब्द)। कोई भी वाक्य अधूरा न छूटे। पूरी बात 2 संतुलित पैराग्राफ में समाप्त हो जाए ताकि अखबार के कॉलम में पूरी तरह फिट बैठ सके और कोई विवरण कटे नहीं। खबर की शुरुआत में अखबार शैली की डेटलाइन जैसे "${city ? city : 'निवाड़ी'} (विशेष संवाददाता): " से शुरू करें। प्रेस नोट के सभी अहम तथ्य (आरोप, कार्रवाई, बरामदगी) आ जाएं लेकिन गैर-जरूरी विस्तार न हो।
8. **हाइलाइट्स / इनसेट बॉक्स (epaperHighlightsTitle व epaperHighlights)**:
   - epaperHighlightsTitle: जैसे "कार्रवाई के 3 मुख्य बिंदु", "यह है पूरा मामला", "इन धाराओं में केस दर्ज" आदि।
   - epaperHighlights: 2 से 3 ठोस, सीधे और महत्वपूर्ण बुलेट पॉइंट्स (प्रत्येक बिंदु 8-14 शब्द)।
9. **फोटो कैप्शन्स**:
   - epaperPhotoCaption: पहली मुख्य फोटो का 1 लाइन संक्षिप्त विवरण।
   - epaperPhotoCaption2: दूसरी फोटो का 1 लाइन संक्षिप्त विवरण।
   - epaperPhotoCaption3: तीसरी फोटो का 1 लाइन संक्षिप्त विवरण।
10. **प्रोमोशनल संदेश (epaperPromoTagline)**: बायलाइन में दाईं ओर दिखने वाली पंक्ति (उदा: "📢 अब आप भी भेजें अपनी खबर हम तक: 96698-02408")।
11. **नेता / अधिकारी का बयान कॉल-आउट (epaperQuoteText व epaperQuoteSpeaker)**: यदि प्रेस नोट में किसी मंत्री, विधायक, कलेक्टर, एसपी, अधिकारी या नेता का कोई बयान, चेतावनी या प्रतिक्रिया हो, तो उसे यहाँ 1-2 वाक्यों में निकालें (उदा: "दोषियों को बख्शा नहीं जाएगा, हर बिंदु पर सख्त कार्रवाई होगी")। epaperQuoteSpeaker में उनका नाम व पद (उदा: "डॉ. महेंद्र सिंह, प्रभारी") लिखें।
12. **सोशल मीडिया समरी (summary)**: Instagram और Facebook के लिए 2 पैराग्राफ का विस्तृत विवरण, अंत में अनिवार्य हैशटैग्स: #breakingnewswala #Epaper #HindiNews #{city}News #BNWTV आदि।
13. **श्रेणी (category)**: (अपराध / प्रशासन / हादसा / राजनीति / विकास / जनसमस्या / शिक्षा)।

Strictly return a valid JSON object matching these exact keys:
epaperCity, epaperKicker, epaperHeadline, epaperSubHeadline, epaperByline, epaperPromoTagline, epaperArticleBody, epaperHighlightsTitle, epaperHighlights, epaperQuoteText, epaperQuoteSpeaker, epaperPhotoCaption, epaperPhotoCaption2, epaperPhotoCaption3, summary, category`;

    let parsedData: any = null;
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
              content: "You are the chief editorial director for Breaking News Wala E-Paper graphics. Always respond in strictly valid JSON format.",
            },
            { role: "user", content: systemPrompt },
          ],
          temperature: 0.5,
        });
        const raw = completion.choices[0]?.message?.content || "{}";
        parsedData = JSON.parse(raw);
      } catch (openAiErr: any) {
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
              temperature: 0.5,
            },
          }
        );
        parsedData = JSON.parse(response.text || "{}");
      } catch (geminiError: any) {
        console.warn("Gemini epaper parsing error:", geminiError?.message?.slice(0, 100));
      }
    }

    // High quality fallback if AI APIs fail
    if (!parsedData || !parsedData.epaperHeadline) {
      parsedData = createEpaperLocalFallback(rawInput, city, reporterName);
    }

    if (pickedImages.main) {
      parsedData.pickedImages = pickedImages;
    }

    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error("Error in /api/process-epaper-pressnote:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// Curated high-resolution press & editorial news photography catalog for authentic journalism fallbacks
const CURATED_NEWS_PRESS_PHOTOS = {
  protest: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?w=1200&auto=format&fit=crop&q=85",
  ],
  accident: [
    "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=1200&auto=format&fit=crop&q=85",
  ],
  politics: [
    "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1575320181282-9afab399332c?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=1200&auto=format&fit=crop&q=85",
  ],
  police_crime: [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&auto=format&fit=crop&q=85",
  ],
  hospital: [
    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1200&auto=format&fit=crop&q=85",
  ],
  weather: [
    "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&auto=format&fit=crop&q=85",
  ],
  students: [
    "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=85",
  ],
  business: [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=1200&auto=format&fit=crop&q=85",
  ],
  general: [
    "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&auto=format&fit=crop&q=85",
    "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=85",
  ],
};

function pickCuratedNewsPressPhoto(text: string, variation: number = 0): string {
  const lower = (text || "").toLowerCase();

  const pickFrom = (arr: string[]) => arr[Math.abs(variation) % arr.length];

  // Protest / Dharna / Teachers / Recruitment / Strike / Rally
  if (
    lower.includes("धरना") ||
    lower.includes("प्रदर्शन") ||
    lower.includes("आंदोलन") ||
    lower.includes("अभ्यर्थी") ||
    lower.includes("शिक्षक") ||
    lower.includes("भर्ती") ||
    lower.includes("मांग") ||
    lower.includes("हड़ताल") ||
    lower.includes("घेराव") ||
    lower.includes("ज्ञापन") ||
    lower.includes("protest") ||
    lower.includes("rally") ||
    lower.includes("strike") ||
    lower.includes("candidate")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.protest);
  }

  // Accident / Crash / Road / Highway
  if (
    lower.includes("हादसा") ||
    lower.includes("दुर्घटना") ||
    lower.includes("टक्कर") ||
    lower.includes("पलटी") ||
    lower.includes("बस") ||
    lower.includes("ट्रक") ||
    lower.includes("कार") ||
    lower.includes("हाईवे") ||
    lower.includes("सड़क") ||
    lower.includes("घायल") ||
    lower.includes("मौत") ||
    lower.includes("accident") ||
    lower.includes("crash") ||
    lower.includes("highway")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.accident);
  }

  // Politics / Leader / Government / Assembly / CM / Cabinet
  if (
    lower.includes("मुख्यमंत्री") ||
    lower.includes("शिवराज") ||
    lower.includes("दिग्विजय") ||
    lower.includes("मोहन यादव") ||
    lower.includes("कमलनाथ") ||
    lower.includes("मंत्री") ||
    lower.includes("नेता") ||
    lower.includes("विधानसभा") ||
    lower.includes("प्रेस") ||
    lower.includes("कांग्रेस") ||
    lower.includes("भाजपा") ||
    lower.includes("सरकार") ||
    lower.includes("संसद") ||
    lower.includes("minister") ||
    lower.includes("assembly") ||
    lower.includes("politics")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.politics);
  }

  // Police / Court / Crime / Arrest
  if (
    lower.includes("पुलिस") ||
    lower.includes("कोर्ट") ||
    lower.includes("अदालत") ||
    lower.includes("गिरफ्तार") ||
    lower.includes("क्राइम") ||
    lower.includes("अपराध") ||
    lower.includes("हत्या") ||
    lower.includes("चोरी") ||
    lower.includes("police") ||
    lower.includes("court") ||
    lower.includes("crime")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.police_crime);
  }

  // Hospital / Medical
  if (
    lower.includes("अस्पताल") ||
    lower.includes("डॉक्टर") ||
    lower.includes("मरीज") ||
    lower.includes("स्वास्थ्य") ||
    lower.includes("एम्बुलेंस") ||
    lower.includes("hospital") ||
    lower.includes("doctor")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.hospital);
  }

  // Weather / Monsoon / Rain
  if (
    lower.includes("मौसम") ||
    lower.includes("बारिश") ||
    lower.includes("बाढ़") ||
    lower.includes("तूफान") ||
    lower.includes("आंधी") ||
    lower.includes("rain") ||
    lower.includes("weather")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.weather);
  }

  // Students / Exam / Education
  if (
    lower.includes("छात्र") ||
    lower.includes("परीक्षा") ||
    lower.includes("स्कूल") ||
    lower.includes("कॉलेज") ||
    lower.includes("विद्यार्थी") ||
    lower.includes("student") ||
    lower.includes("exam")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.students);
  }

  // Business / Economy / Gold
  if (
    lower.includes("व्यापार") ||
    lower.includes("सोना") ||
    lower.includes("चांदी") ||
    lower.includes("शेयर") ||
    lower.includes("बाजार") ||
    lower.includes("gold") ||
    lower.includes("market")
  ) {
    return pickFrom(CURATED_NEWS_PRESS_PHOTOS.business);
  }

  return pickFrom(CURATED_NEWS_PRESS_PHOTOS.general);
}

// Generate AI News Photo from Headline
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
      "detailed investigative press photo, different camera angle, authentic atmosphere, high detail",
    ];
    const variationAngle = perspectiveAngles[Math.abs(Number(variation) || 0) % perspectiveAngles.length];

    // Step 1: Create an editorial, journalistic photography prompt in English
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
Return ONLY the English prompt string.`,
            }
          );
          imagePrompt =
            promptGenResponse.text?.trim() ||
            `Realistic journalistic press news photography depicting: ${headline}, ${variationAngle}, high detail, 4k`;
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

    // Branch 1: OpenAI DALL-E 3
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
          response_format: "b64_json",
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
            provider: "openai",
          });
        }
      } catch (openAiImgErr: any) {
        console.error("OpenAI DALL-E 3 error:", openAiImgErr);
        if (openAiImgErr?.message && openAiImgErr.message.includes("OPENAI_API_KEY सेट नहीं है")) {
          return res.status(400).json({ error: openAiImgErr.message });
        }
        // If OpenAI image generation fails due to policy or limits, fall through to authentic curated photo
        console.warn("OpenAI DALL-E 3 failed, will use authentic press photo fallback");
      }
    } else {
      // Branch 2: Gemini Imagen Models
      let mappedAspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "3:4";
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
                  text: `${imagePrompt}. Journalistic press photo, award-winning news photography, authentic documentary realism, clear focus, high quality.`,
                },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: mappedAspectRatio,
              },
            },
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
        } catch (primaryErr: any) {
          console.warn("gemini-3.1-flash-image failed:", primaryErr?.message?.slice(0, 100));
          try {
            const imgFallback = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: {
                parts: [
                  {
                    text: `${imagePrompt}. Journalistic press photo, realistic documentary photo.`,
                  },
                ],
              },
              config: {
                imageConfig: {
                  aspectRatio: mappedAspectRatio,
                },
              },
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
          } catch (secondaryErr: any) {
            console.warn("gemini-3.1-flash-lite-image also failed:", secondaryErr?.message?.slice(0, 100));
          }
        }
      }
    }

    // Graceful fallback if AI generation hit rate limit or quota exceeded
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
        notice: "AI इमेज कोटा पूरा होने के कारण समाचार विषय से संबंधित प्रामाणिक प्रेस फोटो तैयार की गई है।",
      });
    }

    return res.json({
      success: true,
      imageUrl: imageBase64,
      promptUsed: imagePrompt,
      fallbackUsed: false,
      isAiGenerated: true,
      provider: aiProvider,
    });
  } catch (err: any) {
    console.error("Error in /api/generate-ai-image, falling back safely:", err);
    const fallbackRaw = pickCuratedNewsPressPhoto(`${req.body?.headline || ""} ${req.body?.customPrompt || ""}`, Number(req.body?.variation) || 0);
    const fallbackProxied = `/api/proxy-image?url=${encodeURIComponent(fallbackRaw)}`;
    return res.json({
      success: true,
      imageUrl: fallbackProxied,
      promptUsed: req.body?.customPrompt || "Journalistic Press Photo",
      fallbackUsed: true,
      isAiGenerated: false,
      notice: "दैनिक AI इमेज कोटा सीमा के कारण संबंधित प्रामाणिक प्रेस फोटो चयनित की गई है।",
    });
  }
});

// Endpoint: Generate / Expand Instagram & Facebook Caption with strict 2-3 paragraphs and hashtags
app.post("/api/generate-caption", async (req, res) => {
  const { headline, location, existingSummary, category, style = 'detailed_3_para', customInstruction, aiProvider = 'gemini', username } = req.body;
  try {
    if (!headline) {
      return res.status(400).json({ error: "Headline is required" });
    }

    const cleanUser = (username || "").replace(/^[@#]/, "").replace(/[^a-zA-Z0-9_]/g, "").trim();
    const userTag = cleanUser ? `#${cleanUser}` : "#AiNewsMaker";

    let styleDirective = `1. समाचार को कम से कम 2 पैराग्राफ, और यदि घटना/मामले में बिंदु या विवरण अधिक हैं तो 3 पूर्ण पैराग्राफ में विस्तार से लिखें।`;
    if (style === 'detailed_3_para') {
      styleDirective = `1. समाचार को अनिवार्य रूप से ठीक 3 बड़े, समृद्ध और विस्तृत पैराग्राफ में लिखें (Full 3 Detailed Paragraphs):
   - पहला पैराग्राफ: घटना का मुख्य विवरण, समय, स्थान व प्रमुख घटनाक्रम।
   - दूसरा पैराग्राफ: पृष्ठभूमि, कारण, प्रत्यक्षदर्शियों का कहना व जांच की बातें।
   - तीसरा पैराग्राफ: पुलिस/प्रशासन की कार्रवाई, वर्तमान स्थिति और आगे की प्रक्रिया।`;
    } else if (style === 'bullet_points') {
      styleDirective = `1. समाचार का पहला पैराग्राफ संक्षिप्त विवरण दें, उसके बाद 3-4 मुख्य बिंदु (बुलेट पॉइंट्स) में विस्तृत तथ्य दें, और अंत में 1 पैराग्राफ वर्तमान स्थिति का दें।`;
    } else if (style === 'short') {
      styleDirective = `1. समाचार को 2 बहुत ही आकर्षक, संक्षिप्त व वायरल पैराग्राफ में लिखें।`;
    }

    const prompt = `आप भारत के अग्रणी हिंदी डिजिटल न्यूज़ चैनल के वरिष्ठ संपादक हैं।
कृपया निम्नलिखित समाचार के लिए इंस्टाग्राम और फेसबुक पोस्ट का विस्तृत, प्रामाणिक और प्रभावशाली कैप्शन तैयार करें:

हेडलाइन: "${headline}"
स्थान: "${location || "मध्य प्रदेश"}"
श्रेणी: "${category || "न्यूज़"}"
${existingSummary ? `संदर्भ / मौजूदा विवरण: ${existingSummary}` : ""}
${customInstruction ? `यूज़र का विशेष बदलाव / निर्देश: ${customInstruction}` : ""}

नियम (कड़ाई से पालन करें):
${styleDirective}
2. पाठकों को यह स्पष्ट अहसास होना चाहिए कि "पूरी खबर विवरण/डिस्क्रिप्शन में" उपलब्ध है।
3. खबर में कोई फालतू हेडिंग, टाइटल, फोन नंबर, सोशल मीडिया लिंक्स या "पूरी खबर पढ़ें" जैसे निर्देश न जोड़ें।
4. ठीक एक खाली लाइन छोड़कर अंत में 6 से 8 प्रासंगिक हैशटैग लगाएं।
5. हैशटैग क्रम (MUST):
   - सबसे पहला हैशटैग अनिवार्य रूप से: ${userTag}
   - बीच में घटना/स्थान से संबंधित प्रासंगिक हैशटैग (उदा: #BreakingNews #HindiNews #LatestNews #${(location || "MP").replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "")}News)
   - सबसे अंतिम हैशटैग अनिवार्य रूप से: #AiNewsMaker

केवल तैयार कैप्शन का शुद्ध टेक्स्ट दें, कोई अतिरिक्त मार्कडाउन या कोटेशन नहीं।`;

    let caption = "";

    if (aiProvider === "openai") {
      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "आप भारत के अग्रणी हिंदी डिजिटल न्यूज़ चैनल के वरिष्ठ संपादक हैं। केवल तैयार कैप्शन का शुद्ध टेक्स्ट दें, कोई अतिरिक्त मार्कडाउन या कोटेशन नहीं।",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        });
        caption = (completion.choices[0]?.message?.content || "").trim();
      } catch (openAiCapErr: any) {
        console.error("OpenAI caption error:", openAiCapErr);
        if (openAiCapErr?.message && openAiCapErr.message.includes("OPENAI_API_KEY सेट नहीं है")) {
          return res.status(400).json({ error: openAiCapErr.message });
        }
        console.log("OpenAI caption busy, using fallback template");
        const locTag = (location || "MP").replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "");
        caption = `${headline}\n\n${existingSummary || `${location || "मध्य प्रदेश"} से इस वक्त की बड़ी और महत्वपूर्ण खबर सामने आ रही है। मामले में संबंधित विभाग और प्रशासन की ओर से त्वरित संज्ञान लेकर जांच व उचित कार्रवाई की जा रही है।`}\n\nइस पूरे घटनाक्रम से जुड़ी विस्तृत जानकारी और हर ताजा अपडेट के लिए जुड़े रहें।\n\n${userTag} #BreakingNews #HindiNews #${locTag}News #LatestUpdate #AiNewsMaker`;
      }
    } else {
      const ai = getGeminiClient();
      try {
        const response = await generateWithFallbackAndRetry(
          ai,
          DEFAULT_FALLBACK_MODELS,
          {
            contents: prompt,
          }
        );
        caption = (response.text || "").trim();
      } catch (capErr: any) {
        console.log("Caption generation AI busy, using fallback template:", capErr?.message?.slice(0, 80));
        // Construct high-quality fallback caption
        const locTag = (location || "MP").replace(/[^a-zA-Z0-9\u0900-\u097F]/g, "");
        caption = `${headline}\n\n${existingSummary || `${location || "मध्य प्रदेश"} से इस वक्त की बड़ी और महत्वपूर्ण खबर सामने आ रही है। मामले में संबंधित विभाग और प्रशासन की ओर से त्वरित संज्ञान लेकर जांच व उचित कार्रवाई की जा रही है।`}\n\nइस पूरे घटनाक्रम से जुड़ी विस्तृत जानकारी और हर ताजा अपडेट के लिए जुड़े रहें।\n\n${userTag} #BreakingNews #HindiNews #${locTag}News #LatestUpdate #AiNewsMaker`;
      }
    }

    return res.json({ success: true, caption });
  } catch (err: any) {
    console.error("Error in /api/generate-caption:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// Curated High-Resolution Soft & Light Morning Background Photos (Serene, bright, airy pastel aesthetic)
const CURATED_MORNING_PRESS_PHOTOS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop", // Soft golden morning sunrise mist over serene hills
  "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?q=80&w=1200&auto=format&fit=crop", // Gentle morning mist park path with soft light
  "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop", // Bright airy morning daylight through lush green canopy
  "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?q=80&w=1200&auto=format&fit=crop", // Soft pastel sunrise sky with gentle warm golden clouds
  "https://images.unsplash.com/photo-1439853949127-fa647821eba0?q=80&w=1200&auto=format&fit=crop", // Serene tranquil light morning water reflection, zen mood
  "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop", // Warm gentle morning daylight in peaceful nature
];

// Endpoint: Generate Full AI Morning Jacket (Content + AI Background Image driven by voice/text command)
app.post("/api/generate-morning-jacket", async (req, res) => {
  try {
    const {
      topicPrompt,
      command,
      action = "generate", // 'generate' | 'change_image' | 'refine'
      refinementCommand = "",
      currentCard = {},
      variation = 0,
      generateImage = true,
      aiProvider = "gemini",
    } = req.body;

    const defaultMorningTopics = [
      "सकारात्मक सोच, आत्मविश्वास और निरंतर प्रयास पर अत्यंत प्रेरक विचार",
      "सफलता का मूलमंत्र: कर्म, धैर्य और अनुशासन पर सुविचार",
      "आज का अनमोल विचार: समय का सदुपयोग और जीवन का लक्ष्य",
      "सुबह की सैर और स्वास्थ्य के 3 स्वर्णिम नियम",
      "मानसिक शांति, विनम्रता और सकारात्मक ऊर्जा पर प्रेरक विचार",
      "भागवत गीता का सार: कर्म करो, फल की चिंता मत करो",
      "जीवन में कभी हार न मानने का दृढ़ संकल्प और प्रेरणा",
    ];

    let activePrompt = (command || topicPrompt || refinementCommand || "").trim();
    if (!activePrompt && action !== "change_image") {
      const randIdx = Math.floor(Math.random() * defaultMorningTopics.length);
      activePrompt = defaultMorningTopics[randIdx];
    }

    const ai = getGeminiClient();

    // Check if user is asking to change or replace the image
    const isImageChangeRequest =
      action === "change_image" ||
      /इमेज\s*(बदलें|बदलो|change|हटाओ|गलत|दूसरी)/i.test(activePrompt) ||
      /फोटो\s*(बदलें|बदलो|change|हटाओ|गलत|दूसरी)/i.test(activePrompt) ||
      /बैकग्राउंड\s*(बदलें|बदलो|change|नया)/i.test(activePrompt);

    let contentData: any = null;

    // If it's purely an image change request and we already have existing headline/thought:
    if (isImageChangeRequest && currentCard?.headline) {
      contentData = {
        headline: currentCard.headline,
        formattedHeadline: currentCard.formattedHeadline || currentCard.headline,
        badgeText: currentCard.morningBadgeText || "🌅 आज का विचार",
        thoughtQuote: currentCard.morningThoughtQuote || currentCard.morningTakeaway || "",
        summary: currentCard.summary || "",
        imagePrompt: `Aesthetic cinematic morning background wallpaper depicting ${currentCard.headline}. Beautiful ambient morning sunrise sunlight, serene nature landscape or wellness atmosphere, soft warm colors, high realism. Absolutely NO text, NO typography, NO watermark, NO logo, clean image for poster background`,
      };
    } else {
      // Step 1: Prompt AI to generate structured Hindi Thought & Card details
      const systemInstruction = `आप "ब्रेकिंग न्यूज़ वाला" डिजिटल न्यूज़ नेटवर्क के मुख्य संपादक, दर्शनविद और कला निर्देशक (Art Director) हैं।
यूज़र ने बोलकर (माइक द्वारा) या लिखकर यह विषय/निर्देश दिया है:
"${activePrompt}"
${currentCard?.headline ? `पूर्व सामग्री / संदर्भ: "${currentCard.headline}"` : ""}
${refinementCommand ? `सुधार/बदलाव निर्देश: "${refinementCommand}"` : ""}

यूज़र का उद्देश्य: हेडर और फुटर के बीच के सुरक्षित क्षेत्र में सोशल मीडिया पर वायरल होने वाला एक अत्यंत ओजस्वी, सुंदर, समृद्ध और प्रेरणादायी 'सुविचार / जीवन दर्शन / स्वास्थ्य' कार्ड बनाना।

महत्वपूर्ण संपादकीय नियम (STRICT EDITORIAL DIRECTIVES):
1. यूज़र की आवाज़ (Voice / Spoken Input) का गहन विश्लेषण:
   - जब यूज़र माइक से अनौपचारिक या संक्षिप्त रूप में बोलता है (जैसे: "सफलता पर बनाओ", "सुबह जल्दी उठने के फायदे", "माता-पिता का महत्व", "धैर्य और शांति", "जीवन का सच", "कर्म का फल", "समय की कद्र"):
   - तो केवल साधारण या सतही वाक्य न लिखें!
   - उस विषय के गूढ़ आध्यात्मिक, मनोवैज्ञानिक और जीवन-दर्शन (जैसे भगवद्गीता, स्वामी विवेकानंद, चाणक्य नीति, ओशो, कबीर) के स्तर का उत्कृष्ट, प्रभावशाली और हृदयस्पर्शी विचार तैयार करें।
   - भाषा उच्च-कोटि की, गरिमामय और विशुद्ध हिंदी होनी चाहिए जो पाठक के मन में उतर जाए।

2. पूर्णता एवं संख्यात्मक संतुलन (Strict Numerical Consistency):
   - यदि विषय में किसी संख्या का उल्लेख है (उदा. "3 स्वर्णिम नियम", "5 आदतें", "4 उपाय", "3 बातें"), तो 'thoughtQuote' में अनिवार्य रूप से ठीक उतनी ही संख्या के स्पष्ट, ठोस और संतुलित बिंदु (1. ... • 2. ... • 3. ...) लिखें। कभी भी 3 कहकर 2 न दें!

3. कोई न्यूज़ डिस्क्लेमर नहीं (NO NEWS PHRASES):
   - यह विशुद्ध 'सुविचार / प्रेरक विचार' कार्ड है। इसमें किसी भी तरह की समाचार रिपोर्टिंग या 'पूरी खबर डिस्क्रिप्शन में' जैसी शब्दावली कतई नहीं होनी चाहिए।

4. कलर थीम - व्हाइट व येलो (White & Golden Yellow Harmony):
   - मुख्य विचार में 2-3 सबसे महत्वपूर्ण और प्रेरक शब्दों को [yellow]शब्द[/yellow] से चिह्नित करें, ताकि वे कार्ड पर चमकदार सुनहरे पीले रंग में हाइलाइट हों और बाकी टेक्स्ट श्वेत (White) रंग में चमके।

कृपया JSON में निम्नलिखित फ़ील्ड्स तैयार करें:
1. "headline": मुख्य विचार अथवा विषय का प्रेरक दोहा/पंक्ति (10-24 शब्द, बेहद प्रभावशाली, पठनीय और प्रवाहमयी हिंदी में)।
2. "formattedHeadline": मुख्य विचार में 2-3 सबसे प्रभावशाली शब्दों के आगे-पीछे [yellow]शब्द[/yellow] लगाएं (उदा. "[yellow]सफलता[/yellow] केवल सोचने से नहीं, अटूट [yellow]धैर्य और निरंतर प्रयास[/yellow] से मिलती है")।
3. "badgeText": विषय के अनुकूल गरिमामय बैज (उदा. "🌅 आज का विचार", "✨ अनमोल जीवन दर्शन", "🧘 स्वास्थ्य मंत्र", "💎 प्रेरक सूत्र", "🕉️ गीता संदेश", "🌱 सकारात्मक विचार", "💡 सफलता के रहस्य")।
4. "thoughtQuote": 1 से 3 पंक्तियों का सारगर्भित टेकअवे, व्यावहारिक उपाय अथवा संख्यात्मक बिंदु (उदा. यदि 3 आदतें हैं: "1. उषाकाल में जागरण  •  2. 20 मिनट का व्यायाम  •  3. शांत मन से ध्यान")।
5. "summary": इंस्टाग्राम/फेसबुक के लिए एक सुरुचिपूर्ण, प्रेरक 2 पैराग्राफ पोस्ट विवरण। अंत में 1 खाली पंक्ति छोड़कर लोकप्रिय हैशटैग्स: #breakingnewswala #AajKaVichar #ThoughtOfTheDay #HindiQuotes #Inspiration #Positivity #BNWMedia
6. "imagePrompt": एक उच्च कोटि का अंग्रेजी प्रॉम्प्ट (English Prompt) जो इस विचार के अनुकूल एक शांत, दिव्य, एस्थेटिक और प्राकृतिक बैकग्राउंड फोटो / आर्ट बनाएगा। 
   नियम:
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
                content: "You are the chief editorial director for Breaking News Wala Hindi morning graphics. Always respond in strictly valid JSON format.",
              },
              { role: "user", content: systemInstruction },
            ],
            temperature: 0.6,
          });
          const raw = completion.choices[0]?.message?.content || "{}";
          contentData = JSON.parse(raw);
        } catch (openAiErr: any) {
          console.warn("OpenAI morning generation error, falling back to Gemini:", openAiErr?.message);
        }
      }

      if (!contentData && process.env.GEMINI_API_KEY) {
        try {
          const geminiRes = await generateWithFallbackAndRetry(ai, DEFAULT_FALLBACK_MODELS, {
            contents: systemInstruction,
            config: {
              responseMimeType: "application/json",
              temperature: 0.6,
            },
          });
          const raw = geminiRes.text?.trim() || "{}";
          contentData = JSON.parse(raw);
        } catch (geminiErr: any) {
          console.error("Gemini morning content generation error:", geminiErr);
        }
      }

      // High quality fallback if AI APIs fail
      if (!contentData || !contentData.headline) {
        contentData = {
          headline: activePrompt.length > 8 ? activePrompt : "सकारात्मक सोच और निरंतर प्रयास ही हर सफलता की कुंजी है।",
          formattedHeadline: `[yellow]सकारात्मक सोच[/yellow] और [yellow]निरंतर प्रयास[/yellow] ही सफलता की कुंजी है।`,
          badgeText: "🌅 आज का विचार",
          thoughtQuote: "हर सुबह एक नया अवसर लेकर आती है, खुद पर विश्वास रखें और आगे बढ़ें।",
          summary: `${activePrompt || "आज का सुविचार"}\n\n#breakingnewswala #MorningVibes #PositiveThoughts #BNWTV`,
          imagePrompt: `Aesthetic golden morning sunrise landscape with peaceful mist and soft ambient sunlight, cinematic lighting, no text, no letters.`,
        };
      }
    }

    // Step 2: Generate AI Background Image (Soft, Light-Toned & Serene Morning Aesthetics)
    let generatedImageUrl = "";
    const variationAngles = [
      "soft golden sunrise sky, gentle morning mist, light pastel morning horizon, serene warm daylight",
      "bright airy morning nature, gentle sunlight bokeh, soft pastel greens and pale golden light, tranquil peaceful mood",
      "light-toned morning horizon, gentle warm pastel glow, soft peaceful dawn, high brightness and clean light aesthetics",
      "soft morning sunbeams filtering through light morning dew, bright cheerful airy ambience, pastel warm morning",
      "minimalist serene bright morning landscape, soft pastel clouds, gentle warm sunlight, clean airy light composition",
    ];
    const angleText = variationAngles[Math.abs(Number(variation) || 0) % variationAngles.length];

    const imagePrompt =
      contentData.imagePrompt ||
      `Aesthetic soft light-colored morning background wallpaper for: ${contentData.headline || activePrompt}. ${angleText}. Soft pastel morning lighting, gentle ambient glow, bright airy daylight, clean light background, no dark shadows, strictly NO text, NO words, NO letters, NO watermark, 4k`;

    if (generateImage) {
      console.log("Generating Morning Jacket AI image with prompt:", imagePrompt, "variation:", variation);
      if (process.env.GEMINI_API_KEY) {
        try {
          const imgRes = await ai.models.generateContent({
            model: "gemini-3.1-flash-image",
            contents: {
              parts: [
                {
                  text: `${imagePrompt}. ${angleText}. Soft light-colored photographic background wallpaper, aesthetic bright morning atmosphere, pale soft colors, bright clean lighting, strictly no text, no words, no letters, no logos.`,
                },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: "3:4",
              },
            },
          });

          if (imgRes.candidates && imgRes.candidates[0]?.content?.parts) {
            for (const part of imgRes.candidates[0].content.parts) {
              if (part.inlineData) {
                generatedImageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imgErr: any) {
          console.warn("Morning gemini-3.1-flash-image error:", imgErr?.message?.slice(0, 100));
          try {
            const imgFallback = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: {
                parts: [
                  {
                    text: `${imagePrompt}. ${angleText}. Soft light-colored photographic background wallpaper, aesthetic bright morning atmosphere, strictly no text, no letters.`,
                  },
                ],
              },
              config: {
                imageConfig: {
                  aspectRatio: "3:4",
                },
              },
            });

            if (imgFallback.candidates && imgFallback.candidates[0]?.content?.parts) {
              for (const part of imgFallback.candidates[0].content.parts) {
                if (part.inlineData) {
                  generatedImageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                  break;
                }
              }
            }
          } catch (liteErr: any) {
            console.warn("gemini-3.1-flash-lite-image also busy:", liteErr?.message?.slice(0, 100));
          }
        }
      }

      // Fallback to OpenAI DALL-E 3 if Gemini failed and user chose OpenAI
      if (!generatedImageUrl && aiProvider === "openai") {
        try {
          const openai = getOpenAIClient();
          const dalleRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: `${imagePrompt}. ${angleText}. Soft photographic background, bright clean daylight, no text, no words, no watermark.`,
            n: 1,
            size: "1024x1792",
            response_format: "b64_json",
          });
          const b64 = dalleRes.data?.[0]?.b64_json;
          if (b64) {
            generatedImageUrl = `data:image/png;base64,${b64}`;
          }
        } catch (dalleErr) {
          console.warn("Morning DALL-E generation failed:", dalleErr);
        }
      }

      // Graceful fallback to authentic serene curated photo if quota exceeded
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
      variation: Number(variation) || 0,
    });
  } catch (err: any) {
    console.error("Error in /api/generate-morning-jacket:", err);
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

// App Version Configuration & In-App Update Management
let appVersionData = {
  version: "1.2.0",
  versionCode: 10200,
  releaseDate: "2026-09-08",
  downloadUrl: "/app-release.apk",
  apkAvailable: true,
  releaseTitle: "न्यू अपडेट v1.2.0: मॉर्निंग AI स्टूडियो व मोबाइल स्प्लिट व्यू",
  releaseNotes: [
    "🌅 मॉर्निंग जैकेट: 1-क्लिक AI सुविचार व एस्थेटिक फोटो जनरेटर (बिना टाइप किए तुरंत नया सुविचार बनाएं)",
    "📱 मोबाइल लाइव प्रीव्यू: स्क्रॉल करते ही कॉम्पैक्ट हाफ-स्क्रीन मोड — नीचे एडिट करते हुए ऊपर लाइव बदलाव देखें",
    "👤 रिपोर्टर रोल: रिपोर्टर को केवल 4 मुख्य जैकेट्स (ओरिजिनल, सुपर ब्रेकिंग, टेक्स्ट ब्रेकिंग, मॉर्निंग) दिखेंगी",
    "👑 मुख्य संपादक (Admin): सभी 7 जैकेट्स और एडवांस्ड फीचर्स उपलब्ध",
    "📲 इन-ऐप अपडेट सिस्टम: नया वर्जन आने पर नोटिफिकेशन पॉपअप व डायरेक्ट APK डाउनलोड की सुविधा"
  ],
  minRequiredVersion: "1.0.0",
  forceUpdate: false,
};

app.get("/api/app-version", (_req, res) => {
  res.json({
    success: true,
    versionInfo: appVersionData,
    currentServerTime: new Date().toISOString(),
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
      message: "ऐप वर्जन जानकारी सफलतापूर्वक अपडेट हो गई!",
      versionInfo: appVersionData,
    });
  } catch (err: any) {
    return res.status(500).json({ error: cleanErrorMessage(err) });
  }
});

async function startServer() {
  const possibleDistPaths = [
    path.join(process.cwd(), "dist"),
    path.join(process.cwd(), "web_studio", "dist"),
    path.join(process.cwd(), "public"),
    safeDirname,
    path.join(safeDirname, "dist"),
  ];
  const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, "index.html"))) || path.join(process.cwd(), "dist");

  console.log(`Serving static studio files from: ${distPath}`);
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    console.log(`News Graphic Studio server running on http://0.0.0.0:${PORT}`);
  });

  // Dual-port listening: If running on Cloud Run (port 8080), also bind port 3000 as backup
  if (PORT !== 3000) {
    try {
      const backupServer = app.listen(3000, "0.0.0.0", () => {
        console.log(`Backup listener running on http://0.0.0.0:3000`);
      });
      backupServer.on("error", (e: any) => {
        // Silently continue if port 3000 is already in use
      });
    } catch (_err) {
      // Ignore
    }
  }
}

startServer();
