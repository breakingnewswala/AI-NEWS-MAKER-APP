// AI News Maker App - Video Templates & Frame Registry
// Defines geometry, safe zones, tier permissions and rendering parameters for custom video frames across 9:16, 1:1, 4:3, 4:5

export interface VideoFrameDefinition {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  badge: string;
  canvasRatio: '9:16' | '4:5' | '1:1' | '4:3';
  supportedModes: ('full_9_16' | 'core_4_5' | 'native_4_5' | 'standard')[];
  headline: {
    maxLines: number;
    area: 'top' | 'bottom' | 'middle';
    fontSizeDefault: number;
    color: string;
    backgroundStyle: 'crimson_gradient' | 'floating_red_banner' | 'lower_third_dark';
  };
  logo: {
    position: 'top-left' | 'top-right' | 'sub-strip-right';
    boxStyle: 'yellow_red_border' | 'transparent';
  };
  location: {
    position: 'top-left' | 'top-right' | 'sub-strip-left';
    badgeStyle: 'white_blue_pin' | 'white_red_pin';
  };
  videoWindow: {
    aspectRatio: '9:16' | '4:5' | '1:1' | '4:3';
    mode: 'full' | 'window';
    // Normalized coordinates (0 to 1) relative to canvas
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  footer: {
    visible: boolean;
    style: 'yellow_social_strip' | 'dark_pill_strip' | 'none';
  };
  topBar?: {
    visible: boolean;
    style: 'white_social_pill' | 'none';
  };
  tierEligibility?: 'BASIC' | 'ADVANCE' | 'PRO' | 'VIP DESK';
  coinPrice?: number;
  isActive: boolean;
  isCustom?: boolean;
}

export const VIDEO_FRAME_DEFINITIONS: VideoFrameDefinition[] = [
  // ==========================================
  // 9:16 FRAMES
  // ==========================================
  {
    id: 'frame-custom-3line-4-5',
    name: 'Frame 1: 3-Line Headline / 4:5 Video Window',
    nameHi: 'फ्रेम 1: तीन-लाइन हेडलाइन + 4:5 वीडियो विंडो',
    description: 'शीर्ष पर गहरा लाल हेडर, 3-लाइन हेडलाइन, लोकेशन व लोगो स्ट्रिप, बीच में 4:5 मुख्य वीडियो विंडो एवं नीचे पीला सोशल फुटर',
    badge: '★ लोकप्रिय 4:5',
    canvasRatio: '9:16',
    supportedModes: ['core_4_5', 'native_4_5'],
    headline: {
      maxLines: 3,
      area: 'top',
      fontSizeDefault: 32,
      color: '#ffffff',
      backgroundStyle: 'crimson_gradient',
    },
    logo: {
      position: 'sub-strip-right',
      boxStyle: 'transparent',
    },
    location: {
      position: 'sub-strip-left',
      badgeStyle: 'white_blue_pin',
    },
    videoWindow: {
      aspectRatio: '4:5',
      mode: 'window',
      top: 0.23, // ~23% from top (below headline + sub strip)
      bottom: 0.93, // ~93% from top (above yellow footer)
      left: 0,
      right: 1,
    },
    footer: {
      visible: true,
      style: 'yellow_social_strip',
    },
    tierEligibility: 'BASIC',
    coinPrice: 0,
    isActive: true,
  },
  {
    id: 'frame-custom-full-9-16',
    name: 'Frame 2: Full 9:16 Video Visibility',
    nameHi: 'फ्रेम 2: पूर्ण 9:16 वीडियो विजिबिलिटी (रील्स)',
    description: 'पूरी 9:16 वीडियो स्क्रीन पर दिखेगी, ऊपर सोशल मीडिया बार, लोगो व लोकेशन पिल्स और नीचे फ्लोटिंग रेड हेडलाइन बैनर',
    badge: '★ फुल 9:16 रील्स',
    canvasRatio: '9:16',
    supportedModes: ['full_9_16'],
    headline: {
      maxLines: 2,
      area: 'bottom',
      fontSizeDefault: 30,
      color: '#ffffff',
      backgroundStyle: 'floating_red_banner',
    },
    logo: {
      position: 'top-left',
      boxStyle: 'transparent',
    },
    location: {
      position: 'top-right',
      badgeStyle: 'white_red_pin',
    },
    videoWindow: {
      aspectRatio: '9:16',
      mode: 'full',
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    },
    footer: {
      visible: false,
      style: 'none',
    },
    topBar: {
      visible: true,
      style: 'white_social_pill',
    },
    tierEligibility: 'ADVANCE',
    coinPrice: 20,
    isActive: true,
  },
  {
    id: 'frame-classic-lower-third',
    name: 'Frame 3: Classic News Lower-Third',
    nameHi: 'फ्रेम 3: क्लासिक न्यूज़ लोअर-थर्ड जैकेट',
    description: 'शीर्ष पर लाइव वॉटरमार्क व एक्सक्लूसिव टैग, नीचे लोकेशन स्ट्रिप, रेड हेडलाइन व डार्क सोशल फुटर',
    badge: 'क्लासिक',
    canvasRatio: '9:16',
    supportedModes: ['full_9_16', 'core_4_5', 'standard'],
    headline: {
      maxLines: 2,
      area: 'bottom',
      fontSizeDefault: 28,
      color: '#ffffff',
      backgroundStyle: 'lower_third_dark',
    },
    logo: {
      position: 'top-left',
      boxStyle: 'transparent',
    },
    location: {
      position: 'top-left',
      badgeStyle: 'white_blue_pin',
    },
    videoWindow: {
      aspectRatio: '9:16',
      mode: 'full',
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    },
    footer: {
      visible: true,
      style: 'dark_pill_strip',
    },
    tierEligibility: 'BASIC',
    coinPrice: 0,
    isActive: true,
  },

  // ==========================================
  // 1:1 SQUARE FRAMES
  // ==========================================
  {
    id: 'frame-square-news-1-1',
    name: '1:1 Square News Feed Frame',
    nameHi: '1:1 स्क्वायर न्यूज़ फीड फ्रेम',
    description: '1:1 स्क्वायर वीडियो के लिए मॉडर्न न्यूज़कास्ट जैकेट, ऊपर लाइव हेडर, नीचे हेडलाइन स्ट्रिप व सोशल मीडिया फुटर',
    badge: 'स्क्वायर 1:1',
    canvasRatio: '1:1',
    supportedModes: ['standard'],
    headline: {
      maxLines: 2,
      area: 'bottom',
      fontSizeDefault: 28,
      color: '#ffffff',
      backgroundStyle: 'lower_third_dark',
    },
    logo: {
      position: 'top-left',
      boxStyle: 'transparent',
    },
    location: {
      position: 'top-left',
      badgeStyle: 'white_blue_pin',
    },
    videoWindow: {
      aspectRatio: '1:1',
      mode: 'full',
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    },
    footer: {
      visible: true,
      style: 'dark_pill_strip',
    },
    tierEligibility: 'BASIC',
    coinPrice: 0,
    isActive: true,
  },
  {
    id: 'frame-square-minimal-1-1',
    name: '1:1 Minimal Breaking News Frame',
    nameHi: '1:1 मिनिमल ब्रेकिंग न्यूज़ फ्रेम',
    description: '1:1 सोशल पोस्ट के लिए फ्लोटिंग रेड बैनर व पारदर्शी चैनल लोगो',
    badge: '1:1 मिनिमल',
    canvasRatio: '1:1',
    supportedModes: ['standard'],
    headline: {
      maxLines: 2,
      area: 'bottom',
      fontSizeDefault: 26,
      color: '#ffffff',
      backgroundStyle: 'floating_red_banner',
    },
    logo: {
      position: 'top-left',
      boxStyle: 'transparent',
    },
    location: {
      position: 'top-right',
      badgeStyle: 'white_red_pin',
    },
    videoWindow: {
      aspectRatio: '1:1',
      mode: 'full',
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    },
    footer: {
      visible: false,
      style: 'none',
    },
    tierEligibility: 'ADVANCE',
    coinPrice: 25,
    isActive: true,
  },

  // ==========================================
  // 4:3 CLASSIC TV FRAMES
  // ==========================================
  {
    id: 'frame-broadcast-tv-4-3',
    name: '4:3 Classic TV Broadcast Frame',
    nameHi: '4:3 क्लासिक टीवी बुलेटिन फ्रेम',
    description: 'ट्रेडिशनल 4:3 टीवी स्क्रीन बुलेटिन स्टाइल, नीचे ब्रेकिंग न्यूज़ स्ट्रिप व रनिंग टिकर',
    badge: '4:3 टीवी',
    canvasRatio: '4:3',
    supportedModes: ['standard'],
    headline: {
      maxLines: 2,
      area: 'bottom',
      fontSizeDefault: 26,
      color: '#ffffff',
      backgroundStyle: 'lower_third_dark',
    },
    logo: {
      position: 'top-left',
      boxStyle: 'transparent',
    },
    location: {
      position: 'top-left',
      badgeStyle: 'white_blue_pin',
    },
    videoWindow: {
      aspectRatio: '4:3',
      mode: 'full',
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    },
    footer: {
      visible: true,
      style: 'dark_pill_strip',
    },
    tierEligibility: 'BASIC',
    coinPrice: 0,
    isActive: true,
  },
  {
    id: 'frame-special-report-4-3',
    name: '4:3 Special Reporter Frame',
    nameHi: '4:3 स्पेशल रिपोर्टर फ्रेम',
    description: '4:3 टीवी स्क्रीन के लिए स्पेशल रिपोर्टर जैकेट, गोल्डन लाइव स्ट्रिप व लोकेशन बॉक्स',
    badge: '4:3 स्पेशल',
    canvasRatio: '4:3',
    supportedModes: ['standard'],
    headline: {
      maxLines: 2,
      area: 'bottom',
      fontSizeDefault: 26,
      color: '#ffffff',
      backgroundStyle: 'crimson_gradient',
    },
    logo: {
      position: 'top-left',
      boxStyle: 'transparent',
    },
    location: {
      position: 'top-left',
      badgeStyle: 'white_blue_pin',
    },
    videoWindow: {
      aspectRatio: '4:3',
      mode: 'full',
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    },
    footer: {
      visible: true,
      style: 'yellow_social_strip',
    },
    tierEligibility: 'PRO',
    coinPrice: 50,
    isActive: true,
  },

  // ==========================================
  // 4:5 PORTRAIT FEED FRAMES
  // ==========================================
  {
    id: 'frame-portrait-feed-4-5',
    name: '4:5 Portrait Social Feed Frame',
    nameHi: '4:5 पोर्ट्रेट सोशल फीड फ्रेम',
    description: 'सोशल मीडिया 4:5 पोर्ट्रेट वीडियो के लिए शीर्ष पर 3-लाइन हेडलाइन और नीचे सोशल फ़ुटर',
    badge: '★ 4:5 पोर्ट्रेट',
    canvasRatio: '4:5',
    supportedModes: ['core_4_5', 'native_4_5'],
    headline: {
      maxLines: 3,
      area: 'top',
      fontSizeDefault: 30,
      color: '#ffffff',
      backgroundStyle: 'crimson_gradient',
    },
    logo: {
      position: 'sub-strip-right',
      boxStyle: 'transparent',
    },
    location: {
      position: 'sub-strip-left',
      badgeStyle: 'white_blue_pin',
    },
    videoWindow: {
      aspectRatio: '4:5',
      mode: 'window',
      top: 0.22,
      bottom: 0.92,
      left: 0,
      right: 1,
    },
    footer: {
      visible: true,
      style: 'yellow_social_strip',
    },
    tierEligibility: 'BASIC',
    coinPrice: 0,
    isActive: true,
  },
  {
    id: 'frame-breaking-portrait-4-5',
    name: '4:5 Breaking News Portrait Frame',
    nameHi: '4:5 ब्रेकिंग न्यूज़ पोर्ट्रेट फ्रेम',
    description: '4:5 वीडियो स्पेस के लिए गहरा लाल लोअर-थर्ड, 2-लाइन हेडलाइन, लोकेशन पिन व लाइव वॉटरमार्क',
    badge: '4:5 ब्रेकिंग',
    canvasRatio: '4:5',
    supportedModes: ['native_4_5', 'standard'],
    headline: {
      maxLines: 2,
      area: 'bottom',
      fontSizeDefault: 28,
      color: '#ffffff',
      backgroundStyle: 'lower_third_dark',
    },
    logo: {
      position: 'top-left',
      boxStyle: 'transparent',
    },
    location: {
      position: 'top-left',
      badgeStyle: 'white_blue_pin',
    },
    videoWindow: {
      aspectRatio: '4:5',
      mode: 'full',
      top: 0,
      bottom: 1,
      left: 0,
      right: 1,
    },
    footer: {
      visible: true,
      style: 'dark_pill_strip',
    },
    tierEligibility: 'ADVANCE',
    coinPrice: 30,
    isActive: true,
  },
];

export function getVideoFrameDefinition(id: string): VideoFrameDefinition {
  const found = VIDEO_FRAME_DEFINITIONS.find((f) => f.id === id);
  return found || VIDEO_FRAME_DEFINITIONS[0];
}

export function getAllVideoFrames(ratio?: string): VideoFrameDefinition[] {
  if (!ratio || ratio === 'all') return VIDEO_FRAME_DEFINITIONS;
  return VIDEO_FRAME_DEFINITIONS.filter((f) => f.canvasRatio === ratio);
}

export function getCompatibleFrames(options: {
  aspectRatio: string;
  isOnly4_5?: boolean;
  hasCoreCrop?: boolean;
}): VideoFrameDefinition[] {
  const { aspectRatio, isOnly4_5, hasCoreCrop } = options;

  if (isOnly4_5 || aspectRatio === '4:5') {
    return VIDEO_FRAME_DEFINITIONS.filter(
      (f) => (f.canvasRatio === '4:5' || f.canvasRatio === '9:16') &&
             (f.supportedModes.includes('core_4_5') || f.supportedModes.includes('native_4_5'))
    );
  }

  if (aspectRatio === '9:16') {
    if (hasCoreCrop) {
      // Both Frame 1 and Frame 2 / Frame 3 in 9:16 are compatible!
      return VIDEO_FRAME_DEFINITIONS.filter((f) => f.canvasRatio === '9:16');
    }
    // Only full 9:16 visibility frames
    return VIDEO_FRAME_DEFINITIONS.filter(
      (f) => f.canvasRatio === '9:16' && f.supportedModes.includes('full_9_16')
    );
  }

  if (aspectRatio === '1:1') {
    return VIDEO_FRAME_DEFINITIONS.filter((f) => f.canvasRatio === '1:1');
  }

  if (aspectRatio === '4:3') {
    return VIDEO_FRAME_DEFINITIONS.filter((f) => f.canvasRatio === '4:3');
  }

  return VIDEO_FRAME_DEFINITIONS;
}
