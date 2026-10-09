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
  fullContent?: string;
  district?: string;
  location?: string;
  timestamp: number;
  imageSource?: 'source' | 'default' | 'manual';
  manualThumbnailUrl?: string;
  additionalPhotos?: string[];
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
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
  thumbnailUrl: string;
  category: string;
}

// 4-Day Auto Delete Rule: Videos older than 4 days (96 hours) are automatically removed
export const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

export function filterActiveVideos(videos: VideoFeedItem[]): VideoFeedItem[] {
  const now = Date.now();
  return videos.filter((v) => {
    if (!v.createdAt) return true;
    return now - v.createdAt < FOUR_DAYS_MS;
  });
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

export const INITIAL_NEWS_POSTS: NewsFeedPost[] = [
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
    sourceChannel: 'अमर उजाला (Amar Ujala)',
    sourceUrl: 'https://amarujala.com/weather/heavy-rain-alert',
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

export const INITIAL_VIDEOS: VideoFeedItem[] = [
  {
    id: 'vid-1',
    title: 'संसद लाइव: नए डिजिटल मीडिया व AI न्यूज़ पॉलिसी पर विशेष चर्चा',
    caption: 'संसद के विशेष सत्र में आज देश के डिजिटल पत्रकारों और कंटेंट क्रिएटर्स के अधिकारों की सुरक्षा और प्रेस गाइडलाइन्स पर ऐतिहासिक बहस हुई।',
    aspectRatio: '16:9',
    createdAt: Date.now() - 3600 * 1000 * 4,
    duration: '02:15',
    channel: 'संसद टीवी (Sansad TV)',
    views: '24K देखा गया',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop',
    category: 'politics'
  },
  {
    id: 'vid-2',
    title: 'इसरो का नया मिशन: अंतरिक्ष में भारत की ऐतिहासिक छलांग का वीडियो',
    caption: 'इसरो ने नए गगनयान क्रू एस्केप सिस्टम का सफल परीक्षण किया। भारत का मानव अंतरिक्ष उड़ान मिशन अगले साल लॉन्च होगा।',
    aspectRatio: '9:16',
    createdAt: Date.now() - 3600 * 1000 * 12,
    duration: '01:30',
    channel: 'साइंस डेस्क (ISRO Tech)',
    views: '89K देखा गया',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517976487507-5b3b11329582?w=800&auto=format&fit=crop',
    category: 'tech'
  },
  {
    id: 'vid-3',
    title: 'ग्राउंड रिपोर्ट: दिल्ली-एनसीआर में विंटर एक्शन प्लान और एंटी-स्मॉग गन का असर',
    caption: 'प्रदूषण नियंत्रण के लिए राजधानी में 200 से अधिक मोबाइल एंटी-स्मॉग गन तैनात, निर्माण कार्यों पर सख्त निगरानी जारी।',
    aspectRatio: '16:9',
    createdAt: Date.now() - 3600 * 1000 * 20,
    duration: '03:45',
    channel: 'ग्राउंड रिपोर्टर (BNW TV)',
    views: '15K देखा गया',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
    category: 'state'
  },
  {
    id: 'vid-4',
    title: 'शेयर बाजार में बंपर तेजी: विशेषज्ञों से जानिए किन सेक्टर्स में करें निवेश',
    caption: 'सेंसेक्स में 800 अंकों की ऐतिहासिक बढ़त, आईटी और बैंकिंग सेक्टर में रिकॉर्ड खरीदारी से निवेशकों में भारी उत्साह।',
    aspectRatio: '1:1',
    createdAt: Date.now() - 3600 * 1000 * 28,
    duration: '04:10',
    channel: 'मार्केट इनसाइट्स (Money)',
    views: '42K देखा गया',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop',
    category: 'business'
  },
  {
    id: 'vid-5',
    title: 'विशेष रिपोर्ट: डिजिटल स्टूडियो और आधुनिक मीडिया टेक्नोलॉजी का प्रभाव',
    caption: 'नई दिल्ली स्थित मीडिया कॉन्क्लेव में आधुनिक AI टूल्स और ऑटोमेशन पर देश भर के शीर्ष पत्रकारों का विशेष सत्र।',
    aspectRatio: '4:3',
    createdAt: Date.now() - 3600 * 1000 * 32,
    duration: '02:40',
    channel: 'मीडिया वार्ता (Media News)',
    views: '31K देखा गया',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop',
    category: 'tech'
  }
];

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
