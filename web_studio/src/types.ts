export type CardLayout =
  | 'single'
  | 'double' // 50-50 Up & Down (आधी ऊपर, आधी नीचे)
  | 'split-v' // 35-65 Up & Down (35% ऊपर, 65% नीचे)
  | 'double-h' // 50-50 Left & Right
  | 'grid-3' // 2 Top, 1 Bottom Wide
  | 'grid-3-bottom' // 1 Top Wide, 2 Bottom
  | 'grid-4' // 4 Photos (2 Top, 2 Bottom 2x2 Grid)
  | 'full'
  | 'inset-circle'
  | 'split-h';
export type AspectRatio = '4:5' | '1:1' | '9:16';
export type FrameDesign =
  | 'graphic_001'
  | 'graphic_002'
  | 'graphic_003'
  | 'graphic_004'
  | `graphic_${string}`
  | 'jacket-default'
  | 'jacket-original'
  | 'jacket-breaking-red'
  | 'jacket-investigation'
  | 'jacket-quote'
  | 'jacket-text-breaking'
  | 'jacket-morning'
  | 'jacket-epaper'
  | 'custom-png';

export interface TemplateConfig {
  id: string;
  template_id: string;
  name: string;
  headline_max_lines: number;
  headline_line_count: number;
  headline_area: string;
  aspect_ratio: '4:5' | '1:1' | '9:16' | '16:9';
  description?: string;
  plan_category?: string;
  has_description_cta?: boolean;
}

export type TextBreakingBadgeStyle =
  | 'breaking-3d-en' // 3D Bold Red (BREAKING / NEWS) - like ABP sample
  | 'breaking-3d-hi' // 3D बोल्ड रेड (ब्रेकिंग / न्यूज़)
  | 'breaking-ribbon' // 3D रेड रिबन बैज
  | 'breaking-gold' // ⚡ बड़ी ख़बर / BIG BREAKING
  | 'breaking-duotone' // रेड & ब्लैक ड्यूल टोन
  | 'breaking-exclusive' // एक्सक्लूसिव ब्रेकिंग
  | 'breaking-flat-red' // फ्लैट आधुनिक रेड (कम 3D, साफ़ व स्पष्ट - Flat Clean Red)
  | 'breaking-solid-bar' // सॉलिड रेड पट्टी बैज (Sleek Solid Crimson Plate)
  | 'breaking-simple-hi'; // सिंपल हिंदी बोल्ड (साफ़ पठनीय - Clean Hindi Bold)

export interface NewsCardImages {
  main: string;
  second?: string;
  third?: string;
  fourth?: string;
  insetCircle?: string;
}

export interface ImageCropSettings {
  x: number; // 0 to 100 percentage (0 = Left, 50 = Center, 100 = Right)
  y: number; // 0 to 100 percentage (0 = Top, 50 = Center, 100 = Bottom)
  zoom: number; // 1.0 to 2.5
}

export interface NewsCardImagePositions {
  main?: ImageCropSettings;
  second?: ImageCropSettings;
  third?: ImageCropSettings;
  fourth?: ImageCropSettings;
  insetCircle?: ImageCropSettings;
}

export interface MorningCardItem {
  title: string;
  text: string;
}

export interface EPaperAdSettings {
  showAd: boolean; // विज्ञापन बॉक्स ऑन / ऑफ
  placement: 'auto_fill' | 'right_column' | 'bottom_strip' | 'movable'; // प्लेसमेंट मोड
  type: 'template' | 'image'; // अखबार वर्गीकृत टेम्पलेट या अपलोड की गई कस्टम इमेज
  imageUrl?: string; // अपलोड किया गया बैनर / ऐड ग्राफ़िक
  templateType?: 'classified' | 'wishes' | 'commercial' | 'notice'; // शुभकामनाएं, व्यावसायिक, रिक्त स्थान अपील
  title?: string; // मुख्य शीर्षक (उदा. 'स्थान रिक्त है - विज्ञापन हेतु संपर्क करें')
  subtitle?: string; // उप-शीर्षक (उदा. 'दैनिक समाचार पत्र ई-संस्करण')
  phone?: string; // संपर्क नंबर (उदा. '96698-02408')
  sponsorName?: string; // सौजन्य / प्रायोजक (उदा. 'शुभचिंतक परिवार')
  // Movable & Resizable Coordinates (in percentages 0-100)
  x: number; // Left coordinate % (default: 54%)
  y: number; // Top coordinate % (default: 48%)
  width: number; // Width % (default: 44%)
  height: number; // Height % (default: 32%)
  // Internal Image Crop & Zoom
  crop: {
    x: number; // 0 to 100
    y: number; // 0 to 100
    zoom: number; // 1 to 3
  };
}

export interface NewsCardData {
  id?: string;
  title?: string;
  date?: string;
  photoUrl?: string;
  headline: string;
  formattedHeadline: string;
  highlightWords: string[];
  location: string;
  summary: string;
  category: string;
  
  // Branding ("जैकेट" elements)
  brandName: string;
  brandTagline: string;
  brandLogoType: 'default' | 'custom';
  customLogoUrl?: string;
  customLogoPngUrl?: string; // Dedicated PNG logo
  customLogoGifUrl?: string; // Dedicated GIF animated logo
  logoScale?: number; // Scaling percentage of brand logo (0.5 to 2.0, default 1.0)
  customHeaderPng?: string; // Uploaded header PNG (IMAGE NEWS.png)
  headersByDesign?: Partial<Record<FrameDesign, string>>; // Separate header graphic per frame template
  customFooterPng?: string; // Uploaded footer PNG (Footer.png)
  footersByDesign?: Partial<Record<FrameDesign, string>>; // Separate footer graphic per frame template
  customFrameOverlayPng?: string; // Full overlay PNG
  customArrowPng?: string; // Custom pointer arrow PNG (ARROW.png)
  frameDesign?: FrameDesign; // Multiple frame styles
  lockHeader?: boolean; // Lock header PNG to prevent accidental changes
  lockFooter?: boolean; // Lock footer PNG to prevent accidental changes
  hideDefaultHeaderInCustomFrame?: boolean; // When custom-png is active, hide default header if user desires
  hideDefaultFooterInCustomFrame?: boolean; // When custom-png is active, hide default footer if user desires
  customBreakingRibbonPng?: string; // Uploaded or custom Breaking News ribbon PNG
  showBreakingRibbon?: boolean; // Show or hide Super Breaking ribbon (default true)
  breakingRibbonOffsetY?: number; // Vertical offset of ribbon (-60px to +60px, default 0)
  breakingRibbonScale?: number; // Scaling percentage of ribbon (55% to 95%, default 70%)
  
  // Template specific attributes
  speakerName?: string; // For jacket-quote (बयान देने वाले का नाम)
  speakerTitle?: string; // For jacket-quote (पद / पदवी)
  breakingUrgencyBadge?: string; // For jacket-breaking-red (e.g. ⚡ सुपर ब्रेकिंग)
  investigationCaseNumber?: string; // For jacket-investigation (e.g. पड़ताल / एक्सक्लूसिव)
  showSuperBreakingWatermark?: boolean; // एक्सक्लूसिव वॉटरमार्क (BREAKING NEWS WALA)
  breakingWatermarkText?: string; // e.g. 'BREAKING NEWS WALA'
  breakingWatermarkOpacity?: number; // default 0.15
  breakingWatermarkColor?: 'white' | 'black'; // 'white' or 'black'
  
  // Universal Watermark (Text or PNG Image Tiling)
  showWatermark?: boolean; // Global or E-Paper watermark toggle
  watermarkGlobalMode?: 'ON' | 'OFF' | 'SYMBOLIC_PHOTO' | 'AI_GENERATED'; // Master Instruction 4 options
  photoWatermarkTag?: string; // 'प्रतीकात्मक फोटो' or 'AI GENERATED IMAGE'
  watermarkType?: 'text' | 'image'; // Text watermark or uploaded PNG logo watermark
  watermarkText?: string; // e.g. 'BREAKING NEWS WALA'
  watermarkImage?: string; // Uploaded PNG logo for watermark
  watermarkOpacity?: number; // 0.04 to 0.30 (default 0.10)
  watermarkColor?: 'black' | 'white' | 'red'; // Default black for white paper, white for dark themes
  watermarkScale?: number; // Size for tiled logo or font size for text
  
  // Text Breaking Jacket specific attributes
  textBreakingStyle?: TextBreakingBadgeStyle; // For jacket-text-breaking (default: 'breaking-3d-en')
  textBreakingCustomTitle?: string; // Custom title text override (default: BREAKING NEWS)
  textBreakingTitleSize?: 'sm' | 'md' | 'lg'; // Font size: sm (छोटा), md (मध्यम), lg (बड़ा)
  textBreakingBgStyle?: 'light-geo' | 'pure-white' | 'dark-news' | 'custom-image'; // Background style
  textBreakingCustomBgUrl?: string; // Custom uploaded background image for text breaking
  
  // Graphic 4 specific attributes
  additionalInfo?: string; // Sub-headline / Additional Information below main headline (Max 2 lines)
  graphic004StampText?: string; // Rubber stamp highlight text (e.g. 'गिरफ्तार', 'अलर्ट', 'बड़ी खबर', 'EXPOSED')
  showGraphic004Stamp?: boolean; // Toggle rubber stamp on/off (default: true)
  secondaryPhoto?: string; // Optional 2nd photo for side-by-side collage
  
  // Morning Jacket specific attributes
  morningCategory?: 'health' | 'quote' | 'knowledge' | 'positive';
  morningSubIntro?: string; // Sub-headline intro (2-3 lines)
  morningSectionTitle?: string; // e.g. 'सुबह 20 मिनट वॉक करने के फायदे'
  morningThoughtQuote?: string; // Inspirational thought or elaboration
  morningBadgeText?: string; // e.g. '🌅 आज का विचार' or '🍃 स्वास्थ्य मंत्र'
  morningSubQuoteFontSize?: number; // Font size for sub-quote / explanation (default 14)
  morningPoints?: string[]; // Balanced bullet points or rules
  morningCards?: MorningCardItem[]; // 3 to 5 tip cards
  morningTakeaway?: string; // Bottom takeaway text
  morningNote?: string; // Bottom note / disclaimer pill
  morningBgStyle?: 'light-mesh' | 'sunrise' | 'green-nature' | 'pure-white' | 'custom-image';
  morningCustomBgUrl?: string;
  morningCardTheme?: 'maroon' | 'forest-green' | 'teal-ocean' | 'royal-amber' | 'clean-dark';
  morningShowQuotes?: boolean; // Show quotation marks around headline
  morningVariationIndex?: number; // Variation counter for regenerating images
  
  // Morning Jacket Design Styling & Space Filling
  morningDesignStyle?:
    | 'frosted-obsidian' // क्लासिक ऑब्सिडियन (डीप ब्लैक ग्लास + वार्म गोल्ड ट्रिम)
    | 'royal-gold' // रॉयल गोल्डन बॉर्डर (डबल लाइन + कोनों पर नक्काशीदार ऑर्नमेंट्स)
    | 'spiritual-divine' // दिव्य भगवा / एम्बर (सूर्योदय आभामंडल + भगवा-स्वर्ण ट्रिम)
    | 'editorial-ivory' // आइवरी व्हाइट (सॉफ्ट आइवरी ग्लास बैकग्राउंड + डार्क चारकोल व रूबी टेक्स्ट)
    | 'emerald-zen' // एमराल्ड ग्रीन व गोल्ड (गहरा हरा बैकग्राउंड + फ्लोटिंग कोट्स)
    | 'cinematic-text'; // सिनेमाई फ्लोटिंग (बिना कार्ड बॉक्स के, फुल विगनेट पर बड़ा टेक्स्ट)
  morningBoxWidth?: 'standard' | 'wide' | 'expanded'; // 89%, 93%, 97%
  morningBoxHeightMode?: 'auto' | 'expanded' | 'fill-safe-area'; // कार्ड का फैलाव: स्वतः, बड़ा (70%), या हेडर-फुटर स्पेस फिल (84%)
  morningTextAlignment?: 'center' | 'justify' | 'left';
  
  // E-Paper Jacket specific attributes
  epaperKicker?: string; // किकर / संदर्भ पट्टी (e.g. 'विशेष रिपोर्ट' या 'बड़ी कार्रवाई')
  epaperHeadline?: string; // मुख्य समाचार पत्र हेडलाइन
  epaperSubHeadline?: string; // उप-शीर्षक (1-2 lines)
  epaperCity?: string; // शहर / जिला (e.g. 'निवाड़ी' या 'इंदौर')
  epaperByline?: string; // रिपोर्टर / ब्यूरो (e.g. 'फारूक अली / विशेष संवाददाता, निवाड़ी')
  epaperPromoTagline?: string; // प्रमोशनल लाइन / कॉल-टू-एक्शन (e.g. '📢 अब आप भी भेजें अपनी खबर हम तक: 96698-02408')
  epaperArticleBody?: string; // मुख्य खबर का बॉडी टेक्स्ट (2 कॉलम में विभाजित)
  epaperHighlightsTitle?: string; // साइड हाइलाइट बॉक्स शीर्षक (e.g. 'अहम बिंदु' या 'यह है पूरा मामला')
  epaperHighlights?: string[]; // साइड बॉक्स के बुलेट बिंदु
  epaperPhotoCaption?: string; // फोटो 1 कैप्शन
  epaperPhotoCaption2?: string; // फोटो 2 कैप्शन
  epaperPhotoCaption3?: string; // फोटो 3 कैप्शन
  epaperPhotoCount?: number; // 0, 1, 2, or 3
  epaperPhotoLayout?:
    | '1_top' // क्लासिक: शीर्ष पर 1 संतुलित फोटो
    | '1_thumb_left' // कॉम्पैक्ट: लेफ्ट में छोटी फोटो (अधिकतम टेक्स्ट स्पेस)
    | '1_below_highlights' // राइट साइड: बिंदु के ठीक नीचे 1 फोटो (लेफ्ट में फुल स्टोरी)
    | '2_side' // 2 फोटो आमने-सामने
    | '3_split' // 3 फोटो मैगजीन ग्रिड (1 बड़ी + 2 छोटी)
    | '1_top_2_bottom' // 1 ऊपर + 2 नीचे (फुटर के ऊपर)
    | '2_column_bottom' // स्टोरी शीर्ष पर + 2 फोटो फुटर के ऊपर
    | '0_none'; // 0 फोटो (केवल विस्तृत टेक्स्ट)
  epaperPhotoHeightMode?: 'compact' | 'normal' | 'tall' | 'extra-tall'; // Adjust photo vertical space to fill canvas
  epaperRawPressNote?: string; // रिपोर्टर द्वारा डाला गया रॉ प्रेस नोट / लिंक
  epaperLayoutVariant?: 'standard' | 'stacked' | 'box-accent';
  epaperFontSize?: number; // 14-26 (default 19-21)
  epaperTheme?: 'pure-white' | 'subtle-cream';
  epaperFontFamily?: 'serif-traditional' | 'serif-martel' | 'sans-modern' | 'baloo'; // Authentic newspaper serif vs modern
  epaperDropCap?: boolean; // Authentic newspaper drop-cap on first letter
  
  // E-Paper story column options (दो कॉलम प्रवाहित खबर / प्रमुख बिंदु / बयान कॉल-आउट)
  epaperStoryLayout?:
    | '2_equal_cols' // 2 समान कॉलम: दोनों फोटो के नीचे प्रवाहित खबर (Full 2-Column Story, perfectly justified)
    | 'story_with_highlights' // बाएं मुख्य खबर + दाएं प्रमुख बिंदु (Classic Left Story + Right Highlights)
    | '2_cols_with_quote' // 2 कॉलम खबर + नेता/अधिकारी का बयान कॉल-आउट
    | '2_cols_with_highlights'; // 2 कॉलम खबर + दूसरे कॉलम में नीचे प्रमुख बिंदु

  // E-Paper Quote Callout (नेता / अधिकारी का बयान)
  epaperQuoteText?: string; // नेता / अधिकारी का बयान (Quote text)
  epaperQuoteSpeaker?: string; // बयान देने वाले का नाम व पद (e.g. 'डॉ. महेंद्र सिंह, प्रदेश प्रभारी')
  epaperShowQuote?: boolean; // बयान बॉक्स दिखाएं या नहीं

  // E-Paper Column Balancing & Secondary Box Story
  epaperBalanceColumns?: boolean; // दोनों कॉलम में बराबर लाइनें विभाजित करें (Auto-balance)
  epaperSecondaryStoryTitle?: string; // संबंधित खबर / बॉक्स खबर शीर्षक (e.g. 'संबंधित खबर' या 'पृष्ठभूमि')
  epaperSecondaryStoryBody?: string; // संबंधित खबर का विवरण (कॉलम 2 को भरने हेतु)

  // E-Paper Advertisement (विज्ञापन 1 व विज्ञापन 2 - ऑटो फिल + मूवेबल)
  epaperAd?: EPaperAdSettings;
  epaperSecondAd?: EPaperAdSettings;

  // E-Paper Photo Styling
  epaperPhotoBorderStyle?: 'newspaper-double' | 'clean-border' | 'rounded-shadow';
  
  // Badges
  showLocation?: boolean;
  calloutTag: string;
  showCallout: boolean;
  newsUpdateBadge: string;
  showNewsUpdateBadge: boolean;
  showAiGenerated?: boolean;
  aiGeneratedText?: string;
  photoDisclaimerType?: 'none' | 'ai' | 'representative'; // Disclaimers: None, AI Generated, or प्रतीकात्मक फोटो
  representativePhotoText?: string; // Default: 'प्रतीकात्मक फोटो'
  
  // Contact & Social
  socialHandle: string;
  whatsappNumber: string;
  websiteUrl?: string; // Direct domain without https:// or www (e.g. ainewsmaker.online)
  showMobileNumber?: boolean; // Toggle phone number visibility on graphics
  channelNameHi?: string;
  channelNameEn?: string;
  channelLogoType?: 'png' | 'gif';
  activeSocialIcons?: string[]; // Active social media icons to show on footer: ['youtube', 'facebook', 'instagram', 'twitter', 'telegram', 'whatsapp']
  
  // Layout & Styling
  layout: CardLayout;
  images: NewsCardImages;
  imagePositions?: NewsCardImagePositions;
  insetPosition: { x: number; y: number }; // percentage coordinates
  aspectRatio: AspectRatio;
  headlineFontSize: number;
  headlineAlign?: 'justify' | 'center' | 'left';
  headlineFontFamily?: string; // e.g. 'Baloo 2', 'Noto Sans Devanagari', 'Poppins', etc.
  highlightColor: string; // default "#FFDE00"
  darkOverlayOpacity: number; // 0 to 1
  showDate?: boolean; // default true: display 270° rotated date on right edge
  dateStr?: string; // Hindi formatted date (e.g. '5 सितम्बर 2026, शनिवार')

  // Master Branding & Footer Customization
  showMasterBranding?: boolean; // Toggle master branding (header logo + footer bar)
  footerBgColor?: string; // Manual footer strip background color (e.g. '#FFFFFF', '#FFE600', '#DC2626', etc.)
  footerTextColor?: string; // Text color on footer (auto-calculated from contrast if empty)
  footerIconStyle?: 'color' | 'dark' | 'neutral'; // 'color' = official brand colors, 'dark' = sleek black, 'neutral' = clean monochrome
  footerStyle?: 'single-line' | 'standard'; // Strict single-line horizontal layout

  // Advanced Graphic Tools
  customTextOverlays?: CustomTextOverlay[]; // Floating text badges / custom font texts
  imageFilters?: ImageFilterSettings; // Photo filters & color grading
}

export interface CustomTextOverlay {
  id: string;
  text: string;
  fontFamily: string; // e.g. 'Baloo 2', 'Noto Sans Devanagari', 'Rozha One', etc.
  color: string; // Hex color code
  backgroundColor?: string; // Background pill color or 'transparent'
  fontSize: number; // Font size in px (14 - 72)
  isBold?: boolean;
  x: number; // Left coordinate % (0 - 100)
  y: number; // Top coordinate % (0 - 100)
}

export type ImageFilterPreset =
  | 'none'
  | 'vibrant'
  | 'dramatic'
  | 'warm'
  | 'cool'
  | 'cinematic'
  | 'bw'
  | 'sepia'
  | 'crt_news';

export interface ImageFilterSettings {
  preset: ImageFilterPreset;
  brightness: number; // 50 to 150 (default 100)
  contrast: number; // 50 to 200 (default 100)
  saturate: number; // 0 to 200 (default 100)
  sepia: number; // 0 to 100 (default 0)
  grayscale: number; // 0 to 100 (default 0)
}

export interface AIAnalysisResult {
  headline: string;
  headlineOptions?: string[];
  highlightWords: string[];
  formattedHeadline: string;
  location: string;
  summary: string;
  anchorScript?: string; // Structured TV anchor script
  categories?: string[]; // Structured category tags
  tags?: string[]; // Social hashtags
  category?: string;
  hasPerson?: boolean;
  description?: string;
  isAiGeneratedPhoto?: boolean;
  pickedImages?: {
    main?: string;
    second?: string;
  };
  suggestedImagePrompt?: string;
  speakerName?: string;
  speakerTitle?: string;
  isLocalFallback?: boolean;
  quotaNotice?: string;
}

export interface NewsDraft {
  id: string;
  title: string;
  headline: string;
  category: string;
  location: string;
  summary: string;
  anchorScript?: string;
  tags?: string[];
  cardData: NewsCardData;
  thumbnailUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChannelProfile {
<<<<<<< HEAD
  fullName: string;
=======
  fullName?: string;
  district?: string;
  isLocked?: boolean;
  tier?: string;
  email?: string;
>>>>>>> 7bc5501 (feat(studio): complete mobile graphic studio specification updates, primary nav sync, 4:5 ratio enforcement, draft auto-save and push)
  channelNameHi: string;
  channelNameEn: string;
  channelLogoUrl: string;
  channelLogoPngUrl?: string; // Explicit PNG Channel Logo
  channelLogoGifUrl?: string; // Explicit GIF Channel Logo
  channelLogoType: 'png' | 'gif';
  socialIcons: {
    youtube?: boolean;
    facebook?: boolean;
    instagram?: boolean;
    twitter?: boolean;
    telegram?: boolean;
    whatsapp?: boolean;
  };
  username: string; // derived from English Channel Name
  mobileNumber: string;
  showMobileNumber: boolean; // visible on card or not
  websiteUrl: string; // direct without https:// or www
  highlightColor?: string; // Default word highlight color (e.g. '#FFE600', '#EF4444', etc.)
  footerBgColor?: string; // Default footer strip background color
  footerTextColor?: string; // Default footer text color
  footerIconStyle?: 'color' | 'dark' | 'neutral'; // Default footer icon style
  showMasterBranding?: boolean; // Default master branding visibility
  headlineFontFamily?: string; // Default headline font family
}
