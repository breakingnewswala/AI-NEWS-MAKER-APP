export interface NewsFeedPost {
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
  content?: string;
  fullContent?: string;
  district?: string;
  location?: string;
  timestamp: number;
  imageSource?: 'source' | 'default' | 'manual';
  manualThumbnailUrl?: string;
  additionalPhotos?: string[];
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  isBonus?: boolean;
  rewardCoins?: number;
  coinValue?: number;
  coinCost?: number;
  restrictedPlans?: string[];
}

export interface VideoFeedItem {
  id: string;
  title: string;
  caption?: string;
  aspectRatio?: '9:16' | '16:9' | '4:3' | '1:1' | '4:5';
  createdAt?: number; // timestamp in ms for 4-day auto-deletion system
  duration: string;
  channel: string;
  views: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  isBonus?: boolean;
  rewardCoins?: number;
  coinValue?: number;
  coinCost?: number;
  restrictedPlans?: string[];
  headlineVariants?: string[];
  cropRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
    aspectRatio: '4:5';
  };
  isOnly4_5?: boolean;
  isFullVisibilityAvailable?: boolean;
  compatibleFrameIds?: string[];
  sourceDimensions?: {
    width: number;
    height: number;
  };
  location?: string;
  audioMix?: {
    originalVolume?: number;
    bgmVolume?: number;
    voiceoverVolume?: number;
    bgmUrl?: string;
    bgmTrack?: string;
    voiceoverUrl?: string;
    hasCustomAudio?: boolean;
    [key: string]: any;
  };
}

// Persistent Content: Videos & News are preserved across deployments
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
export const FOUR_DAYS_MS = SEVEN_DAYS_MS; // Backwards compatibility alias

export function filterActiveVideos(videos: VideoFeedItem[]): VideoFeedItem[] {
  return (videos || []).filter((v) => v && v.id);
}

export function filterActiveNews(posts: NewsFeedPost[]): NewsFeedPost[] {
  return (posts || []).filter((p) => p && p.id);
}

export interface EPaperEditionData {
  id: string;
  editionName: string;
  dateStr: string;
  totalPages: number;
  pages: {
    pageNumber: number;
    title: string;
    subtitle: string;
    leadStory: {
      headline: string;
      summary: string;
      columnContent: string[];
      imageUrl?: string;
    };
    secondaryStories: {
      headline: string;
      brief: string;
    }[];
    adBox?: {
      title: string;
      phone: string;
      text: string;
    };
  }[];
}

export const INITIAL_CATEGORIES = [
  { id: 'all', name: 'सभी (All)' },
  { id: 'breaking', name: '⚡ ब्रेकिंग न्यूज़' },
  { id: 'politics', name: '🏛️ राजनीति' },
  { id: 'tech', name: '💻 टेक्नोलॉजी' },
  { id: 'business', name: '📈 कारोबार' },
  { id: 'sports', name: '🏏 खेल' },
  { id: 'entertainment', name: '🎬 मनोरंजन' },
  { id: 'crime', name: '🚨 क्राइम / अपराध' },
  { id: 'state', name: '📍 राज्य / स्थानीय' },
];

// Production feed starts empty so dummy seed cards are never shown as real news
export const INITIAL_NEWS_POSTS: NewsFeedPost[] = [
  {
    "id": "rss-src_aajtak_live-J-CkpuClguCk",
    "title": "'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
    "summary": "राहुल गांधी ने आरोप लगाया कि गृह मंत्री दूसरे राज्यों से दिल्ली आ रहे लोगों को रोकने की कोशिश कर रहे हैं. उन्होंने कहा कि यह वोट के अधिकार और संविधान को बचाने की लड़ाई है, जिसमें पूरा विपक्ष एकजुट है.",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/india/delhi/story/rahul-gandhi-public-impeachment-gyanesh-kumar-ramlila-maidan-rally-india-bloc-ntc-mnrd-dskc-2684209-2026-10-30?utm_source=rssfeed",
    "category": "breaking",
    "categoryName": "ब्रेकिंग न्यूज़",
    "publishedTime": "1 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": true,
    "isExclusive": true,
    "timestamp": 1793349785594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
      "बड़ा अपडेट: 'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
      "ताज़ा समाचार: 'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
      "विशेष रिपोर्ट: 'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
      "अहम खबर: 'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप"
    ],
    "approvedHeadlines": [
      "'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
      "बड़ा अपडेट: 'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
      "ताज़ा समाचार: 'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप"
    ],
    "approvedHeadline": "'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप",
    "captionDetailed": "'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप\n\nराहुल गांधी ने आरोप लगाया कि गृह मंत्री दूसरे राज्यों से दिल्ली आ रहे लोगों को रोकने की कोशिश कर रहे हैं. उन्होंने कहा कि यह वोट के अधिकार और संविधान को बचाने की लड़ाई है, जिसमें पूरा विपक्ष एकजुट है.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• 'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप।\n• राहुल गांधी ने आरोप लगाया कि गृह मंत्री दूसरे राज्यों से दिल्ली आ रहे लोगों को रोकने की कोशिश कर रहे।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "'दूसरे राज्यों से आ रहे लोगों को रोका जा रहा', रामलीला ग्राउंड की रैली को लेकर राहुल गांधी का बड़ा आरोप #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-4KSm4KS_4KS1",
    "title": "दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
    "summary": "दिवाली से पहले हीरो मोटोकॉर्प ने अपना नया स्कूटर लॉन्च किया है. वैसे ये स्कूटर पहले से आ रहे डेस्टिनी 110 का खास वेरिएंट है. कंपनी डेस्टिनी 110 क्लासिक एडिशन को लॉन्च किया है, जो नियो रेट्रो लुक पर फोकस करता है. स्कूटर म",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/auto/news/story/hero-destini-110-classique-edition-launch-price-features-specifications-auam-dskc-2684202-2026-10-30?utm_source=rssfeed",
    "category": "state",
    "categoryName": "राज्य",
    "publishedTime": "2 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793346185594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
      "बड़ा अपडेट: दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
      "ताज़ा समाचार: दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
      "विशेष रिपोर्ट: दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
      "अहम खबर: दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर"
    ],
    "approvedHeadlines": [
      "दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
      "बड़ा अपडेट: दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
      "ताज़ा समाचार: दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर"
    ],
    "approvedHeadline": "दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर",
    "captionDetailed": "दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर\n\nदिवाली से पहले हीरो मोटोकॉर्प ने अपना नया स्कूटर लॉन्च किया है. वैसे ये स्कूटर पहले से आ रहे डेस्टिनी 110 का खास वेरिएंट है. कंपनी डेस्टिनी 110 क्लासिक एडिशन को लॉन्च किया है, जो नियो रेट्रो लुक पर फोकस करता है. स्कूटर में मैकेनिकली कोई बदलाव नहीं किया गया है. स्कूटर दो नए डुअल कलर ऑप्शन में मिलेगा. आइए जानते हैं इसकी खास बातें.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर।\n• दिवाली से पहले हीरो मोटोकॉर्प ने अपना नया स्कूटर लॉन्च किया है. वैसे ये स्कूटर पहले से आ रहे डेस्टिन।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "दिवाली से पहले HERO का धमाका, लॉन्च किया 76,400 रुपये का स्कूटर #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-J-Ckl-CkvuCk",
    "title": "'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
    "summary": "'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/health/story/healthwealth-summit-devi-chitralekha-cow-ghee-milk-benefits-edmm-dskc-2684120-2026-10-30?utm_source=rssfeed",
    "category": "national",
    "categoryName": "देश / राष्ट्रीय",
    "publishedTime": "3 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793342585594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
      "बड़ा अपडेट: 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
      "ताज़ा समाचार: 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
      "विशेष रिपोर्ट: 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
      "अहम खबर: 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा"
    ],
    "approvedHeadlines": [
      "'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
      "बड़ा अपडेट: 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
      "ताज़ा समाचार: 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा"
    ],
    "approvedHeadline": "'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा",
    "captionDetailed": "'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा\n\n'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा।\n• 'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "'गाय का घी-दूध हर मर्ज का इलाज!' देवी चित्रलेखा का ये दावा #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-4KS44KWB4KS5",
    "title": "सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
    "summary": "Places to Visit in Rajasthan: अगर आप नवंबर में कहीं घूमने का प्लान बना रहे हैं तो राजस्थान आपके लिए बेस्ट ऑप्शन हो सकता है. इस दौरान यहां न तो ज्यादा गर्मी होती है और न ही कड़ाके की ठंड. ऐसे में आप आराम से यहां के ऐतिहास",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/travel/story/places-to-visit-in-rajasthan-in-november-jaipur-pushkar-udaipur-jaisalmer-jodhpur-bikaner-bundi-forts-deserts-lakes-culture-tmovx-dskc-2679098-2026-10-30?utm_source=rssfeed",
    "category": "breaking",
    "categoryName": "ब्रेकिंग न्यूज़",
    "publishedTime": "4 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": true,
    "isExclusive": false,
    "timestamp": 1793338985594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
      "बड़ा अपडेट: सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
      "ताज़ा समाचार: सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
      "विशेष रिपोर्ट: सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
      "अहम खबर: सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें"
    ],
    "approvedHeadlines": [
      "सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
      "बड़ा अपडेट: सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
      "ताज़ा समाचार: सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें"
    ],
    "approvedHeadline": "सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें",
    "captionDetailed": "सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें\n\nPlaces to Visit in Rajasthan: अगर आप नवंबर में कहीं घूमने का प्लान बना रहे हैं तो राजस्थान आपके लिए बेस्ट ऑप्शन हो सकता है. इस दौरान यहां न तो ज्यादा गर्मी होती है और न ही कड़ाके की ठंड. ऐसे में आप आराम से यहां के ऐतिहासिक किले, खूबसूरत महल, झीलें, रेगिस्तान और पहाड़ों को घूमकर देख सकते हैं.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें।\n• Places to Visit in Rajasthan: अगर आप नवंबर में कहीं घूमने का प्लान बना रहे हैं तो राजस्थान आपके लिए ।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "सुहावना मौसम और शाही मिजाज! नवंबर में घूमें राजस्थान की ये 10 जगहें #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-J-CkruClh-Ck",
    "title": "'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
    "summary": "सोशल मीडिया पर एक पोस्ट वायरल हो रहा है, जिसमें एक शख्स ने लेट हो रही ट्रेन को लेकर रेलवे से मदद मांगी है.",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/trending/story/train-delay-student-exam-emergency-post-viral-tedu-dskc-2684183-2026-10-30?utm_source=rssfeed",
    "category": "national",
    "categoryName": "देश / राष्ट्रीय",
    "publishedTime": "5 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793335385594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
      "बड़ा अपडेट: 'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
      "ताज़ा समाचार: 'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
      "विशेष रिपोर्ट: 'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
      "अहम खबर: 'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस"
    ],
    "approvedHeadlines": [
      "'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
      "बड़ा अपडेट: 'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
      "ताज़ा समाचार: 'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस"
    ],
    "approvedHeadline": "'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस",
    "captionDetailed": "'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस\n\nसोशल मीडिया पर एक पोस्ट वायरल हो रहा है, जिसमें एक शख्स ने लेट हो रही ट्रेन को लेकर रेलवे से मदद मांगी है.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• 'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस।\n• सोशल मीडिया पर एक पोस्ट वायरल हो रहा है, जिसमें एक शख्स ने लेट हो रही ट्रेन को लेकर रेलवे से मदद मां।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "'मेरा एग्जाम है, ट्रेन लेट है, क्लियर करवा दो...' वायरल पोस्ट पर छिड़ी बहस #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-4KSc4KSsIOCk",
    "title": "जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
    "summary": "अजय देवगन अपने बेटे युग के साथ अजमेर शरीफ दरगाह पहुंचे थे. यहां फैंस की भारी भीड़ ने उन्हें घेर लिया. वायरल हो रहे पुराने वीडियो में अजय बेटे को बचाते और भीड़ की धक्का-मुक्की पर नाराज होते नजर आ रहे हैं.",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/entertainment/bollywood-news/story/ajay-devgn-mobbed-at-ajmer-sharif-dargah-visit-son-yug-old-viral-video-tmova-dskc-2684175-2026-10-30?utm_source=rssfeed",
    "category": "state",
    "categoryName": "राज्य",
    "publishedTime": "6 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793331785594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
      "बड़ा अपडेट: जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
      "ताज़ा समाचार: जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
      "विशेष रिपोर्ट: जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
      "अहम खबर: जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video"
    ],
    "approvedHeadlines": [
      "जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
      "बड़ा अपडेट: जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
      "ताज़ा समाचार: जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video"
    ],
    "approvedHeadline": "जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video",
    "captionDetailed": "जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video\n\nअजय देवगन अपने बेटे युग के साथ अजमेर शरीफ दरगाह पहुंचे थे. यहां फैंस की भारी भीड़ ने उन्हें घेर लिया. वायरल हो रहे पुराने वीडियो में अजय बेटे को बचाते और भीड़ की धक्का-मुक्की पर नाराज होते नजर आ रहे हैं.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video।\n• अजय देवगन अपने बेटे युग के साथ अजमेर शरीफ दरगाह पहुंचे थे. यहां फैंस की भारी भीड़ ने उन्हें घेर लिया।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "जब बेटे युग संग अजमेर शरीफ की दरगाह में फंसे थे अजय देवगन, Video #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-J-CkruCli-Ck",
    "title": "'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
    "summary": "उत्तर प्रदेश बीजेपी की प्रदेश कार्यसमिति की बैठक को केंद्रीय गृह मंत्री अमित शाह ने संबोधित किया. उन्होंने कहा कि नरेंद्र मोदी तीन बार प्रधानमंत्री बन चुके हैं और चौथी बार भी बनेंगे. शाह ने गंगोत्री से गंगा सागर तक भगवा ",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/elections/assembly-chunav/story/amit-shah-lucknow-bjp-meeting-modi-fourth-term-2027-up-assembly-election-ntc-aktw-rpti-2684192-2026-10-30?utm_source=rssfeed",
    "category": "breaking",
    "categoryName": "ब्रेकिंग न्यूज़",
    "publishedTime": "7 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": true,
    "isExclusive": false,
    "timestamp": 1793328185594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
      "बड़ा अपडेट: 'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
      "ताज़ा समाचार: 'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
      "विशेष रिपोर्ट: 'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
      "अहम खबर: 'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह"
    ],
    "approvedHeadlines": [
      "'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
      "बड़ा अपडेट: 'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
      "ताज़ा समाचार: 'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह"
    ],
    "approvedHeadline": "'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह",
    "captionDetailed": "'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह\n\nउत्तर प्रदेश बीजेपी की प्रदेश कार्यसमिति की बैठक को केंद्रीय गृह मंत्री अमित शाह ने संबोधित किया. उन्होंने कहा कि नरेंद्र मोदी तीन बार प्रधानमंत्री बन चुके हैं और चौथी बार भी बनेंगे. शाह ने गंगोत्री से गंगा सागर तक भगवा दिखाई देने की बात कही.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• 'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह।\n• उत्तर प्रदेश बीजेपी की प्रदेश कार्यसमिति की बैठक को केंद्रीय गृह मंत्री अमित शाह ने संबोधित किया. उन।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "'मोदी जी तीन बार PM बने और चौथी बार भी बनेंगे', लखनऊ में बोले अमित शाह #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-4KSX4KWB4KSc",
    "title": "गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
    "summary": "साबरमती से वाराणसी के बीच दो नई ट्रेनों की शुरुआत की गई है. पीएम मोदी ने हरी झंडी दिखाकर इन दो ट्रेनों की शुरुआत की है. ये ट्रेनें तीन राज्‍यों को एकसाथ जोड़ेंगी.",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/business/utility/story/gujarat-rajasthan-varanasi-pm-modi-gifts-2-new-trains-tutd-dskc-2684205-2026-10-30?utm_source=rssfeed",
    "category": "state",
    "categoryName": "राज्य",
    "publishedTime": "8 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793324585594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
      "बड़ा अपडेट: गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
      "ताज़ा समाचार: गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
      "विशेष रिपोर्ट: गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
      "अहम खबर: गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात"
    ],
    "approvedHeadlines": [
      "गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
      "बड़ा अपडेट: गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
      "ताज़ा समाचार: गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात"
    ],
    "approvedHeadline": "गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात",
    "captionDetailed": "गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात\n\nसाबरमती से वाराणसी के बीच दो नई ट्रेनों की शुरुआत की गई है. पीएम मोदी ने हरी झंडी दिखाकर इन दो ट्रेनों की शुरुआत की है. ये ट्रेनें तीन राज्‍यों को एकसाथ जोड़ेंगी.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात।\n• साबरमती से वाराणसी के बीच दो नई ट्रेनों की शुरुआत की गई है. पीएम मोदी ने हरी झंडी दिखाकर इन दो ट्रेन।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "गुजरात, राजस्‍थान से काशी तक... PM मोदी ने दी 2 नई ट्रेनों की सौगात #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-TElWRTog4KSs",
    "title": "LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
    "summary": "India vs New Zealand 4th T20I Live Score: ऑकलैंड के ईडन पार्क में भारत और न्यूजीलैंड की टीम्स आमने-सामने हैं. श्रेयस अय्यर की अगुवाई वाली भारतीय टीम पहले ही सीरीज कब्जा चुकी है. अब उसका लक्ष्य सीरीज में न्यूजीलैंड का सूप",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/sports/cricket/story/ind-vs-nz-live-score-4th-t20-india-new-zealand-match-auckland-vaibhav-sooryavanshi-tspoa-dskc-2683677-2026-10-30?utm_source=rssfeed",
    "category": "national",
    "categoryName": "देश / राष्ट्रीय",
    "publishedTime": "9 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793320985594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
      "बड़ा अपडेट: LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
      "ताज़ा समाचार: LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
      "विशेष रिपोर्ट: LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
      "अहम खबर: LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी"
    ],
    "approvedHeadlines": [
      "LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
      "बड़ा अपडेट: LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
      "ताज़ा समाचार: LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी"
    ],
    "approvedHeadline": "LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी",
    "captionDetailed": "LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी\n\nIndia vs New Zealand 4th T20I Live Score: ऑकलैंड के ईडन पार्क में भारत और न्यूजीलैंड की टीम्स आमने-सामने हैं. श्रेयस अय्यर की अगुवाई वाली भारतीय टीम पहले ही सीरीज कब्जा चुकी है. अब उसका लक्ष्य सीरीज में न्यूजीलैंड का सूपड़ा साफ करने पर है.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी।\n• India vs New Zealand 4th T20I Live Score: ऑकलैंड के ईडन पार्क में भारत और न्यूजीलैंड की टीम्स आमने-स।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "LIVE: ब्रेसवेल लौटे, फिलिप्स शतक के करीब, कीवियों की रफ्तार जारी #BreakingNews #AINewsMaker"
  },
  {
    "id": "rss-src_aajtak_live-J-CkueCkvuCk",
    "title": "'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
    "summary": "सुप्रीम कोर्ट के फैसले के बाद अनंत सिंह ने कहा कि वह 1 दिसंबर को सरेंडर करेंगे और उन्हें न्यायालय से राहत की उम्मीद है. उन्होंने नीरज कुमार पर फंसाने का आरोप लगाते हुए कहा कि अब वह नीतीश कुमार और ललन सिंह से नहीं मिलेंगे",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/bihar/story/anant-singh-surrender-december-1-supreme-court-order-neeraj-kumar-ntc-mnrd-smsr-2684198-2026-10-30?utm_source=rssfeed",
    "category": "breaking",
    "categoryName": "ब्रेकिंग न्यूज़",
    "publishedTime": "10 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": true,
    "isExclusive": false,
    "timestamp": 1793317385594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
      "बड़ा अपडेट: 'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
      "ताज़ा समाचार: 'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
      "विशेष रिपोर्ट: 'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
      "अहम खबर: 'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन"
    ],
    "approvedHeadlines": [
      "'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
      "बड़ा अपडेट: 'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
      "ताज़ा समाचार: 'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन"
    ],
    "approvedHeadline": "'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन",
    "captionDetailed": "'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन\n\nसुप्रीम कोर्ट के फैसले के बाद अनंत सिंह ने कहा कि वह 1 दिसंबर को सरेंडर करेंगे और उन्हें न्यायालय से राहत की उम्मीद है. उन्होंने नीरज कुमार पर फंसाने का आरोप लगाते हुए कहा कि अब वह नीतीश कुमार और ललन सिंह से नहीं मिलेंगे.\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• 'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन।\n• सुप्रीम कोर्ट के फैसले के बाद अनंत सिंह ने कहा कि वह 1 दिसंबर को सरेंडर करेंगे और उन्हें न्यायालय से।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "'हां, सरेंडर कर देंगे', सुप्रीम कोर्ट से झटके के बाद अनंत सिंह का पहला रिएक्शन #BreakingNews #AINewsMaker"
  },
  {
    "id": "editorial-seed-4KS44KWB4KSq",
    "title": "सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
    "summary": "सुप्रीम कोर्ट ने चुनाव आयोग से स्थिति स्पष्ट करने को कहा है कि जो नागरिक पहले से वोटर सूची में दर्ज हैं, उनसे नए सिरे से सत्यापन की प्रक्रिया में असुविधा न हो।",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/",
    "category": "breaking",
    "categoryName": "ब्रेकिंग न्यूज़",
    "publishedTime": "11 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop",
    "breaking": true,
    "isExclusive": false,
    "timestamp": 1793313785594,
    "location": "नई दिल्ली",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
      "बड़ा अपडेट: सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
      "ताज़ा समाचार: सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
      "विशेष रिपोर्ट: सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
      "अहम खबर: सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?"
    ],
    "approvedHeadlines": [
      "सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
      "बड़ा अपडेट: सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
      "ताज़ा समाचार: सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?"
    ],
    "approvedHeadline": "सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?",
    "captionDetailed": "सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?\n\nसुप्रीम कोर्ट ने चुनाव आयोग से स्थिति स्पष्ट करने को कहा है कि जो नागरिक पहले से वोटर सूची में दर्ज हैं, उनसे नए सिरे से सत्यापन की प्रक्रिया में असुविधा न हो।\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा?।\n• सुप्रीम कोर्ट ने चुनाव आयोग से स्थिति स्पष्ट करने को कहा है कि जो नागरिक पहले से वोटर सूची में दर्ज ।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "सुप्रीम कोर्ट का चुनाव आयोग से सवाल: पहले से वोटर रहे लोगों से दोबारा फॉर्म 6 क्यों भरवाया जा रहा? #BreakingNews #AINewsMaker"
  },
  {
    "id": "editorial-seed-4KSu4KSn4KWN",
    "title": "मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
    "summary": "मध्य प्रदेश कैबिनेट की महत्वपूर्ण बैठक में राज्य के आधारभूत ढांचे, सिंचाई परियोजनाओं और युवा रोजगार से जुड़े पांच बड़े प्रस्तावों पर आधिकारिक मुहर लगाई गई।",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/",
    "category": "state",
    "categoryName": "मध्य प्रदेश",
    "publishedTime": "12 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793310185594,
    "location": "भोपाल",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
      "बड़ा अपडेट: मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
      "ताज़ा समाचार: मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
      "विशेष रिपोर्ट: मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
      "अहम खबर: मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी"
    ],
    "approvedHeadlines": [
      "मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
      "बड़ा अपडेट: मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
      "ताज़ा समाचार: मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी"
    ],
    "approvedHeadline": "मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी",
    "captionDetailed": "मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी\n\nमध्य प्रदेश कैबिनेट की महत्वपूर्ण बैठक में राज्य के आधारभूत ढांचे, सिंचाई परियोजनाओं और युवा रोजगार से जुड़े पांच बड़े प्रस्तावों पर आधिकारिक मुहर लगाई गई।\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी।\n• मध्य प्रदेश कैबिनेट की महत्वपूर्ण बैठक में राज्य के आधारभूत ढांचे, सिंचाई परियोजनाओं और युवा रोजगार ।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "मध्य प्रदेश में विकास को नई रफ्तार: कैबिनेट बैठक में 5 महत्वपूर्ण प्रस्तावों को मिली मंजूरी #BreakingNews #AINewsMaker"
  },
  {
    "id": "editorial-seed-4KSt4KS-4KSw",
    "title": "भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
    "summary": "डिजिटल मीडिया और ऑटोमेशन के दौर में हिंदी न्यूज़ मेकर्स के लिए आधुनिक ग्राफिक टूल्स और वीडियो प्रोडक्शन प्लेटफॉर्म तेजी से लोकप्रिय हो रहे हैं।",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/",
    "category": "national",
    "categoryName": "देश / राष्ट्रीय",
    "publishedTime": "13 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793306585594,
    "location": "विशेष डेस्क",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
      "बड़ा अपडेट: भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
      "ताज़ा समाचार: भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
      "विशेष रिपोर्ट: भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
      "अहम खबर: भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर"
    ],
    "approvedHeadlines": [
      "भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
      "बड़ा अपडेट: भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
      "ताज़ा समाचार: भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर"
    ],
    "approvedHeadline": "भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर",
    "captionDetailed": "भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर\n\nडिजिटल मीडिया और ऑटोमेशन के दौर में हिंदी न्यूज़ मेकर्स के लिए आधुनिक ग्राफिक टूल्स और वीडियो प्रोडक्शन प्लेटफॉर्म तेजी से लोकप्रिय हो रहे हैं।\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर।\n• डिजिटल मीडिया और ऑटोमेशन के दौर में हिंदी न्यूज़ मेकर्स के लिए आधुनिक ग्राफिक टूल्स और वीडियो प्रोडक।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "भारत में डिजिटल न्यूज़ और AI टूल्स का विस्तार, पत्रकारों के लिए बने नए अवसर #BreakingNews #AINewsMaker"
  },
  {
    "id": "editorial-seed-4KSu4KWM4KS4",
    "title": "मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
    "summary": "भारतीय मौसम विज्ञान विभाग के अनुसार आगामी दिनों में उत्तर भारत के मैदानी इलाकों में ठंड का असर बढ़ेगा। सुबह के समय हल्की धुंध रहने की संभावना है।",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/",
    "category": "national",
    "categoryName": "देश / राष्ट्रीय",
    "publishedTime": "14 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793302985594,
    "location": "नई दिल्ली",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
      "बड़ा अपडेट: मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
      "ताज़ा समाचार: मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
      "विशेष रिपोर्ट: मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
      "अहम खबर: मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी"
    ],
    "approvedHeadlines": [
      "मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
      "बड़ा अपडेट: मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
      "ताज़ा समाचार: मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी"
    ],
    "approvedHeadline": "मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी",
    "captionDetailed": "मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी\n\nभारतीय मौसम विज्ञान विभाग के अनुसार आगामी दिनों में उत्तर भारत के मैदानी इलाकों में ठंड का असर बढ़ेगा। सुबह के समय हल्की धुंध रहने की संभावना है।\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी।\n• भारतीय मौसम विज्ञान विभाग के अनुसार आगामी दिनों में उत्तर भारत के मैदानी इलाकों में ठंड का असर बढ़ेग।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "मौसम विभाग का नया पूर्वानुमान: उत्तर भारत के कई राज्यों में तापमान में गिरावट जारी #BreakingNews #AINewsMaker"
  },
  {
    "id": "editorial-seed-4KS24KWH4KSv",
    "title": "शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
    "summary": "वैश्विक बाजारों से मिले मजबूत संकेतों के चलते भारतीय शेयर बाजार में तेजी दर्ज की गई। बैंकिंग और आईटी सेक्टर में अच्छी खरीदारी देखी गई।",
    "sourceChannel": "आज तक (Aaj Tak)",
    "sourceUrl": "https://www.aajtak.in/",
    "category": "business",
    "categoryName": "कारोबार व व्यापार",
    "publishedTime": "15 घंटे पहले",
    "imageUrl": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
    "breaking": false,
    "isExclusive": false,
    "timestamp": 1793299385594,
    "location": "मुंबई",
    "status": "APPROVED",
    "isApproved": true,
    "isPrePublished": true,
    "headlineOptions": [
      "शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
      "बड़ा अपडेट: शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
      "ताज़ा समाचार: शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
      "विशेष रिपोर्ट: शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
      "अहम खबर: शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र"
    ],
    "approvedHeadlines": [
      "शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
      "बड़ा अपडेट: शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
      "ताज़ा समाचार: शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र"
    ],
    "approvedHeadline": "शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र",
    "captionDetailed": "शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र\n\nवैश्विक बाजारों से मिले मजबूत संकेतों के चलते भारतीय शेयर बाजार में तेजी दर्ज की गई। बैंकिंग और आईटी सेक्टर में अच्छी खरीदारी देखी गई।\n\n#BreakingNews #HindiNews #AINewsMaker",
    "captionBullets": "• शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र।\n• वैश्विक बाजारों से मिले मजबूत संकेतों के चलते भारतीय शेयर बाजार में तेजी दर्ज की गई। बैंकिंग और आईटी।\n\n#BreakingNews #AINewsMaker",
    "captionShort": "शेयर बाजार में मजबूती: सेंसेक्स और निफ्टी में बढ़त के साथ खुला कारोबारी सत्र #BreakingNews #AINewsMaker"
  }
];

export const SAMPLE_TEMPLATE_PRESETS: NewsFeedPost[] = [
  {
    id: 'live-post-1',
    title: 'भारत ने लॉन्च किया नया AI सुपरकंप्यूटिंग नेटवर्क, वैश्विक स्तर पर बनी नई पहचान',
    summary: 'विज्ञान एवं प्रौद्योगिकी मंत्रालय द्वारा आज देश के अत्याधुनिक AI सुपरकंप्यूटिंग क्लस्टर का अनावरण किया गया। यह तकनीक मौसम पूर्वानुमान और स्वास्थ्य क्षेत्र में क्रांति लाएगी।',
    sourceChannel: 'दैनिक भास्कर (Dainik Bhaskar)',
    sourceUrl: 'https://dainikbhaskar.com/tech/ai-supercomputing',
    category: 'tech',
    categoryName: 'टेक्नोलॉजी',
    publishedTime: '10 मिनट पहले',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
    breaking: true,
    isExclusive: true,
    timestamp: Date.now() - 10 * 60 * 1000,
    fullContent: `विज्ञान एवं प्रौद्योगिकी मंत्रालय द्वारा आज देश के अत्याधुनिक AI सुपरकंप्यूटिंग क्लस्टर का भव्य अनावरण किया गया। 

📌 मुख्य विवरण एवं पृष्ठभूमि:
इस नए क्लस्टर से देश के लाखों वैज्ञानिकों, छात्रों और स्टार्टअप्स को अभूतपूर्व कम्प्यूटिंग क्षमता मिलेगी। यह मौसम पूर्वानुमान, चिकित्सा अनुसंधान और अंतरिक्ष अन्वेषण में डेटा एनालिसिस को 10 गुना तेज कर देगा।

🎤 आधिकारिक बयान:
केंद्रीय विज्ञान मंत्री ने कहा: "भारत अब केवल तकनीक का उपभोक्ता नहीं, बल्कि वैश्विक स्तर पर AI समाधानों का शीर्ष निर्माता बन रहा है।"

📊 मुख्य बिंदु:
• 100 पेटाफ्लॉप्स से अधिक की कम्प्यूटेशनल स्पीड
• देश के सभी प्रमुख IITs और अनुसंधान संस्थानों से सीधा जुड़ाव
• 100% हरित ऊर्जा से संचालित डाटा सेंटर`
  },
  {
    id: 'live-post-2',
    title: 'संसद में डिजिटल मीडिया और AI न्यूज़ प्रसारण पर ऐतिहासिक विधेयक पारित',
    summary: 'सूचना एवं प्रसारण मंत्रालय ने डिजिटल न्यूज़ पब्लिशर्स और एआई आधारित कंटेंट जनरेशन के लिए मानक तय करने हेतु ऐतिहासिक बिल पारित किया। डीपफेक पर कड़े दंड का प्रावधान।',
    sourceChannel: 'आज तक (Aaj Tak)',
    sourceUrl: 'https://aajtak.in/national/digital-media-ai-bill',
    category: 'politics',
    categoryName: 'राजनीति',
    publishedTime: '25 मिनट पहले',
    imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop',
    breaking: true,
    isExclusive: false,
    timestamp: Date.now() - 25 * 60 * 1000,
    fullContent: `संसद के दोनों सदनों में डिजिटल मीडिया और एआई कंटेंट के नियमन हेतु नया कानून ध्वनिमत से पारित किया गया।

📌 मुख्य बातें:
1. स्वतंत्र पत्रकारों और यूट्यूब न्यूज़ चैनलों के लिए स्व-प्रमाणन प्रणाली।
2. एआई जनरेटेड तस्वीरों और डीपफेक वीडियो पर वाटरमार्क अनिवार्य।
3. तथ्यहीन व भ्रामक खबरों पर त्वरित कार्रवाई हेतु डिजिटल ओम्बड्समैन की नियुक्ति।`
  },
  {
    id: 'live-post-3',
    title: 'एशिया कप क्रिकेट: भारत ने रोमांचक मुकाबले में पाकिस्तान को 5 विकेट से हराया',
    summary: 'भारतीय टीम ने शानदार खेल का प्रदर्शन करते हुए अंतिम ओवर में जीत दर्ज की। सलामी बल्लेबाज ने 85 रनों की नाबाद पारी खेली, गेंदबाजों ने डेथ ओवर्स में कसी हुई गेंदबाजी की।',
    sourceChannel: 'NDTV इंडिया',
    sourceUrl: 'https://ndtv.in/sports/asia-cup-victory',
    category: 'sports',
    categoryName: 'खेल',
    publishedTime: '45 मिनट पहले',
    imageUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop',
    breaking: true,
    isExclusive: true,
    timestamp: Date.now() - 45 * 60 * 1000,
    fullContent: `अंतिम ओवर में चाहिए थे 12 रन, भारतीय बल्लेबाजों ने 2 गेंद शेष रहते जीत दिला दी। इस जीत के साथ भारतीय टीम अंक तालिका में शीर्ष पर पहुंच गई है।`
  },
  {
    id: 'live-post-4',
    title: 'सेंसेक्स में 1100 अंकों का रिकॉर्ड उछाल, निफ्टी 25,500 के नए शिखर पर पहुंचा',
    summary: 'घरेलू शेयर बाजारों में विदेशी संस्थागत निवेशकों (FII) की वापसी से बाजार नई ऊंचाई पर पहुंचा। बैंकिंग, ऑटो और आईटी सेक्टर में भारी लिवाली देखने को मिली।',
    sourceChannel: 'मनीकंट्रोल (Moneycontrol)',
    sourceUrl: 'https://moneycontrol.com/markets/sensex-record',
    category: 'business',
    categoryName: 'कारोबार',
    publishedTime: '1 घंटा पहले',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
    breaking: false,
    isExclusive: false,
    timestamp: Date.now() - 60 * 60 * 1000,
    fullContent: `भारतीय शेयर बाजार ने आज नया इतिहास रचा। सेंसेक्स 1100 अंकों की तेजी के साथ बंद हुआ और निफ्टी ने पहली बार 25,500 का स्तर छुआ। विश्लेषकों का मानना है कि मजबूत आर्थिक आंकड़े बाजार को गति दे रहे हैं।`
  },
  {
    id: 'live-post-5',
    title: 'इसरो ने गगनयान मिशन के दूसरे क्रू-एस्केप सिस्टम का सफल परीक्षण किया',
    summary: 'भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO) ने श्रीहरिकोटा से मानव अंतरिक्ष उड़ान गगनयान के लिए अत्याधुनिक सेफ्टी मॉड्यूल का सफल परीक्षण पूरा किया।',
    sourceChannel: 'ABP न्यूज़',
    sourceUrl: 'https://abplive.com/science/gaganyaan-test',
    category: 'tech',
    categoryName: 'टेक्नोलॉजी',
    publishedTime: '2 घंटे पहले',
    imageUrl: 'https://images.unsplash.com/photo-1517976487507-5b3b11329582?w=800&auto=format&fit=crop',
    breaking: true,
    isExclusive: false,
    timestamp: Date.now() - 120 * 60 * 1000,
    fullContent: `इसरो ने अंतरिक्ष यात्रियों की सुरक्षा सुनिश्चित करने वाले क्रू मॉड्यूल का परीक्षण सफलतापूर्वक पूरा कर लिया है। आगामी वर्ष के अंत तक मानव मिशन की योजना है।`
  },
  {
    id: 'live-post-6',
    title: 'मौसम अलर्ट: उत्तर भारत में भारी बारिश और ओलावृष्टि की चेतावनी जारी',
    summary: 'मौसम विभाग (IMD) ने अगले 48 घंटों में दिल्ली, हरियाणा, पंजाब और पश्चिमी यूपी के कई जिलों में तेज आंधी और बारिश के लिए ऑरेंज अलर्ट जारी किया है।',
    sourceChannel: 'दैनिक जागरण (Dainik Jagran)',
    sourceUrl: 'https://jagran.com/weather/heavy-rain-alert',
    category: 'state',
    categoryName: 'राज्य / स्थानीय',
    publishedTime: '2.5 घंटे पहले',
    imageUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&auto=format&fit=crop',
    breaking: true,
    isExclusive: false,
    timestamp: Date.now() - 150 * 60 * 1000,
    fullContent: `मौसम विभाग ने पश्चिमी विक्षोभ के सक्रिय होने के कारण उत्तर भारत के कई राज्यों में तेज हवाओं के साथ बारिश और ओलावृष्टि की संभावना जताई है। किसानों को कटी फसल सुरक्षित स्थानों पर रखने की सलाह दी गई है।`
  },
  {
    id: 'live-post-7',
    title: 'राष्ट्रीय राजमार्गों पर अब लागू होगा सेटेलाइट आधारित टोल कलेक्शन सिस्टम',
    summary: 'सड़क परिवहन मंत्रालय ने फास्टैग के बाद अब जीपीएस और सैटेलाइट आधारित टोल प्रणाली को देश के प्रमुख एक्सप्रेसवे पर पायलट प्रोजेक्ट के तौर पर शुरू करने की घोषणा की है।',
    sourceChannel: 'ज़ी न्यूज़ (Zee News)',
    sourceUrl: 'https://zeenews.india.com/automobiles/satellite-toll',
    category: 'politics',
    categoryName: 'राजनीति',
    publishedTime: '3 घंटे पहले',
    imageUrl: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?w=800&auto=format&fit=crop',
    breaking: false,
    isExclusive: false,
    timestamp: Date.now() - 180 * 60 * 1000,
    fullContent: `नई प्रणाली के तहत वाहनों में लगे ओबीयू (ऑन-बोर्ड यूनिट) के जरिए तय की गई दूरी के आधार पर स्वतः टोल कट जाएगा। इससे टोल प्लाजा पर लगने वाला समय शून्य हो जाएगा।`
  },
  {
    id: 'live-post-8',
    title: 'सोने की कीमतों में भारी गिरावट, चांदी 2000 रुपये प्रति किलो सस्ती हुई',
    summary: 'वैश्विक बाजारों में मजबूती के बाद घरेलू सर्राफा बाजार में सोने और चांदी की कीमतों में बड़ी गिरावट दर्ज की गई। त्योहारी सीजन से पहले खरीदारों के चेहरे खिले।',
    sourceChannel: 'दैनिक जागरण (Dainik Jagran)',
    sourceUrl: 'https://jagran.com/business/gold-silver-prices',
    category: 'business',
    categoryName: 'कारोबार',
    publishedTime: '3.5 घंटे पहले',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop',
    breaking: false,
    isExclusive: false,
    timestamp: Date.now() - 210 * 60 * 1000,
    fullContent: `24 कैरेट सोने की कीमत प्रति 10 ग्राम में 750 रुपये की कमी आई, वहीं चांदी 2000 रुपये सस्ती होकर 84,000 रुपये प्रति किलोग्राम के स्तर पर आ गई है।`
  },
  {
    id: 'live-post-9',
    title: 'रेलवे का बड़ा ऐलान: 50 नए रूटों पर दौड़ेंगी स्लीपर वंदे भारत ट्रेनें',
    summary: 'लंबी दूरी के यात्रियों के लिए विश्वस्तरीय सुविधाओं से लैस स्लीपर वंदे भारत एक्सप्रेस ट्रेनों का परिचालन जल्द शुरू होगा। तेज रफ्तार और सुरक्षित यात्रा का अनुभव।',
    sourceChannel: 'हिंदुस्तान (Live Hindustan)',
    sourceUrl: 'https://livehindustan.com/national/vande-bharat-sleeper',
    category: 'state',
    categoryName: 'राज्य / स्थानीय',
    publishedTime: '4 घंटे पहले',
    imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&auto=format&fit=crop',
    breaking: false,
    isExclusive: false,
    timestamp: Date.now() - 240 * 60 * 1000,
    fullContent: `रेल मंत्रालय ने 50 नए रूटों को अंतिम रूप दे दिया है। नई स्लीपर ट्रेनों में अत्याधुनिक एयर सस्पेंशन, बायो-वैक्यूम टॉयलेट्स और कवच सुरक्षा प्रणाली शामिल हैं।`
  },
  {
    id: 'live-post-10',
    title: 'साइबर पुलिस की बड़ी कार्रवाई: 500 करोड़ के ऑनलाइन गेमिंग सिंडिकेट का भंडाफोड़',
    summary: 'विशेष टास्क फोर्स ने फर्जी डिजिटल पेमेंट गेटवे और अवैध गेमिंग ऐप के जरिए करोड़ों की ठगी करने वाले अंतरराज्यीय गिरोह के 8 सदस्यों को दबोचा।',
    sourceChannel: 'पत्रिका (Patrika)',
    sourceUrl: 'https://patrika.com/crime/cyber-crime-busted',
    category: 'crime',
    categoryName: 'क्राइम / अपराध',
    publishedTime: '5 घंटे पहले',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop',
    breaking: true,
    isExclusive: true,
    timestamp: Date.now() - 300 * 60 * 1000,
    fullContent: `पुलिस ने आरोपियों के पास से 25 लैपटॉप, 60 स्मार्टफोन और 100 से ज्यादा फ्रीज बैंक खातों की जानकारी बरामद की है।`
  }
];

// Production videos feed: Only real published videos from backend database
export const INITIAL_VIDEOS: VideoFeedItem[] = [];

export const INITIAL_EPAPER_DATA: EPaperEditionData = {
  id: 'ed-national',
  editionName: 'राष्ट्रीय संस्करण (National Edition)',
  dateStr: '15 सितम्बर, 2026 • मंगलवार',
  totalPages: 6,
  pages: [
    {
      pageNumber: 1,
      title: 'मुख्य पृष्ठ (Front Page)',
      subtitle: 'देश और दुनिया की शीर्ष खबरें',
      leadStory: {
        headline: 'डिजिटल मीडिया एवं AI न्यूज़ पर संसद में ऐतिहासिक नीति पारित',
        summary: 'सूचना एवं प्रसारण मंत्रालय ने देश के डिजिटल मीडिया और एआई कंटेंट के लिए वैश्विक स्तर का कानूनी ढांचा तैयार किया। स्वतंत्र पत्रकारों के अधिकारों का संरक्षण और फर्जी खबरों पर नकेल।',
        columnContent: [
          'संसद के दोनों सदनों ने आज भारी बहुमत से डिजिटल मीडिया एवं कृत्रिम बुद्धिमत्ता नियमन विधेयक पारित कर दिया। यह विधेयक देश के लाखों स्वतंत्र डिजिटल पत्रकारों और कंटेंट क्रिएटर्स को कानूनी मान्यता और सुरक्षा प्रदान करता है।',
          'विधेयक के अनुसार, यूट्यूब, फेसबुक और वेबसाइटों पर पत्रकारिता करने वाले संवाददाताओं को जिला स्तर पर प्रेस मान्यता देने की नई सरल प्रक्रिया शुरू की जाएगी। साथ ही डीपफेक और भ्रामक प्रचार करने वालों पर 25 लाख रुपये तक का जुर्माना लगाने का कड़ा प्रावधान भी किया गया है।',
          'सूचना प्रसारण मंत्री ने कहा कि डिजिटल युग में भारत का यह कानून दुनिया के लिए मॉडल बनेगा। प्रेस क्लब ऑफ इंडिया और विभिन्न मीडिया संगठनों ने इस निर्णय का स्वागत किया है।'
        ],
        imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop'
      },
      secondaryStories: [
        {
          headline: 'सेंसेक्स में 1100 अंकों की छलांग, रिकॉर्ड ऊंचाई पर',
          brief: 'शेयर बाजारों में विदेशी निवेशकों की भारी खरीदारी से निफ्टी 25,500 के पार पहुंच गया। अर्थव्यवस्था के सभी क्षेत्रों में उत्साह।'
        },
        {
          headline: 'गगनयान के क्रू मॉड्यूल का दूसरा सफल परीक्षण',
          brief: 'इसरो ने श्रीहरिकोटा से आपातकालीन बचाव प्रणाली का सफल परीक्षण किया। अंतरिक्ष यात्रियों की सुरक्षा मजबूत।'
        },
        {
          headline: 'एशिया कप: भारत ने रोमांचक मैच में पाकिस्तान को 5 विकेट से हराया',
          brief: 'अंतिम ओवर तक खिंचे मैच में भारतीय बल्लेबाजों ने धैर्य बनाए रखा और यादगार जीत हासिल की।'
        }
      ],
      adBox: {
        title: 'स्थान रिक्त है - विज्ञापन हेतु संपर्क करें',
        phone: '+91 96698 02408',
        text: 'अपने व्यापार और संस्थान के प्रचार हेतु आज ही ई-पेपर में विज्ञापन बुक करें। न्यूनतम दर पर लाखों पाठकों तक पहुंच।'
      }
    },
    {
      pageNumber: 2,
      title: 'देश - प्रदेश (National & States)',
      subtitle: 'राज्यों के प्रमुख विकास व प्रशासनिक फैसले',
      leadStory: {
        headline: 'रेलवे नेटवर्क का 100% विद्युतीकरण पूर्ण, 50 नई वंदे भारत का ऐलान',
        summary: 'भारतीय रेल ने सभी प्रमुख ब्रॉडगेज लाइनों पर विद्युतीकरण का ऐतिहासिक लक्ष्य हासिल किया। कार्बन उत्सर्जन में भारी कमी आएगी।',
        columnContent: [
          'भारतीय रेलवे ने पर्यावरण अनुकूल यात्रा की दिशा में बड़ी उपलब्धि हासिल की है। अब देश के सभी राज्यों में प्रमुख रेल नेटवर्क 100 प्रतिशत विद्युतीकृत हो चुका है।',
          'इसके साथ ही रेलवे बोर्ड ने आगामी त्यौहारों से पूर्व 50 नई स्लीपर और चेयर कार वंदे भारत ट्रेनों के परिचालन की समय सारिणी जारी कर दी है। इन ट्रेनों में कवच 4.0 सुरक्षा प्रणाली लगाई गई है।'
        ],
        imageUrl: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&auto=format&fit=crop'
      },
      secondaryStories: [
        {
          headline: 'पीएम किसान सम्मान निधि की 18वीं किस्त इस माह होगी जारी',
          brief: 'कृषि मंत्रालय ने पुष्टि की कि 9 करोड़ किसानों के खातों में 2000-2000 रुपये सीधे डीबीटी से भेजे जाएंगे।'
        },
        {
          headline: 'उत्तर भारत में मौसम का मिजाज बदला, हल्की बारिश की संभावना',
          brief: 'पश्चिमी विक्षोभ के चलते पंजाब, हरियाणा और दिल्ली में अगले 48 घंटे में ठंडक बढ़ने का अनुमान।'
        }
      ]
    },
    {
      pageNumber: 3,
      title: 'संपादकीय एवं विचार (Editorial)',
      subtitle: 'गंभीर विश्लेषण और समसामयिक मुद्दों पर विशेषज्ञों की राय',
      leadStory: {
        headline: 'संपादकीय: आधुनिक भारत में डिजिटल पत्रकारिता की नई दिशा',
        summary: 'सोशल मीडिया और एआई के युग में सत्यनिष्ठा और त्वरित रिपोर्टिंग के बीच संतुलन साधना हर पत्रकार की सबसे बड़ी जिम्मेदारी है।',
        columnContent: [
          'जब सूचना सेकंडों में करोड़ों लोगों तक पहुंचती है, तब पत्रकारिता की जिम्मेदारी कई गुना बढ़ जाती है। आज हर नागरिक एक रिपोर्टर है, लेकिन प्रामाणिकता ही मुख्य कसौटी है।',
          'एआई न्यूज़ मेकर जैसे आधुनिक टूल्स संवाददाताओं को सशक्त बनाते हैं ताकि वे गुणवत्तापूर्ण और आकर्षक विजुअल न्यूज़ चंद पलों में अपने पाठकों तक पहुंचा सकें।'
        ]
      },
      secondaryStories: [
        {
          headline: 'स्तंभ: आर्टिफिशियल इंटेलिजेंस - वरदान या चुनौती?',
          brief: 'तकनीक से रोजगार खत्म नहीं होंगे, बल्कि उत्पादकता और नवाचार के नए अवसर खुलेंगे।'
        }
      ]
    }
  ]
};
