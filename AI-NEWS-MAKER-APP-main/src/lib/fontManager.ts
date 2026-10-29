// Unicode-compatible Hindi/Devanagari Font System for Headline Customization
// Supports 12+ pre-installed Google Unicode fonts + Admin Custom Font Upload

export interface HeadlineFontOption {
  id: string;
  name: string;
  family: string;
  previewHindi: string;
  badge?: string;
  isCustom?: boolean;
}

export const BUILTIN_HEADLINE_FONTS: HeadlineFontOption[] = [
  {
    id: 'baloo-2',
    name: 'Baloo 2 (डिफ़ॉल्ट बोल्ड)',
    family: '"Baloo 2", sans-serif',
    previewHindi: 'ताज़ा बड़ी खबर',
    badge: '★ डिफ़ॉल्ट',
  },
  {
    id: 'noto-sans-devanagari',
    name: 'Noto Sans Devanagari (गूगल क्लीन)',
    family: '"Noto Sans Devanagari", sans-serif',
    previewHindi: 'मुख्य समाचार बुलेटिन',
    badge: 'क्लीन',
  },
  {
    id: 'poppins',
    name: 'Poppins (स्टाइलिश आधुनिक)',
    family: '"Poppins", sans-serif',
    previewHindi: 'स्पेशल रिपोर्ट अलर्ट',
    badge: 'मॉडर्न',
  },
  {
    id: 'rozha-one',
    name: 'Rozha One (क्लासिक हैवी हेडलाइन)',
    family: '"Rozha One", serif',
    previewHindi: 'सनसनीखेज खुलासा',
    badge: 'बोल्ड हेडलाइन',
  },
  {
    id: 'mukta',
    name: 'Mukta (स्पष्ट व पठनीय)',
    family: '"Mukta", sans-serif',
    previewHindi: 'विश्वसनीय तेज़ खबर',
    badge: 'पठनीय',
  },
  {
    id: 'hind',
    name: 'Hind (पारंपरिक अखबार)',
    family: '"Hind", sans-serif',
    previewHindi: 'दैनिक प्रमुख हलचल',
    badge: 'न्यूज़पेपर',
  },
  {
    id: 'rajdhani',
    name: 'Rajdhani (कड़क व कॉम्पैक्ट)',
    family: '"Rajdhani", sans-serif',
    previewHindi: 'सुपर फास्ट अपडेट',
    badge: 'कड़क',
  },
  {
    id: 'kalam',
    name: 'Kalam (आकर्षक प्रभाव)',
    family: '"Kalam", cursive',
    previewHindi: 'विशेष विचार संवाद',
    badge: 'आकर्षक',
  },
  {
    id: 'tiro-devanagari',
    name: 'Tiro Devanagari (संपादकीय सेरिफ)',
    family: '"Tiro Devanagari Hindi", serif',
    previewHindi: 'संपादकीय विश्लेषण',
    badge: 'संपादकीय',
  },
  {
    id: 'gotu',
    name: 'Gotu (संतुलित राउंडेड)',
    family: '"Gotu", sans-serif',
    previewHindi: 'पब्लिक आवाज़ एक्सप्रेस',
    badge: 'राउंडेड',
  },
  {
    id: 'yatra-one',
    name: 'Yatra One (क्लासिक हेरिटेज)',
    family: '"Yatra One", cursive',
    previewHindi: 'ऐतिहासिक घोषणा',
    badge: 'हेरिटेज',
  },
  {
    id: 'khand',
    name: 'Khand (खंड - कड़क बोल्ड)',
    family: '"Khand", sans-serif',
    previewHindi: 'अखंड समाचार बुलेटिन',
    badge: 'कड़क',
  },
  {
    id: 'sahitya',
    name: 'Sahitya (साहित्य - क्लासिक)',
    family: '"Sahitya", serif',
    previewHindi: 'साहित्यिक व गंभीर रिपोर्ट',
    badge: 'क्लासिक',
  },
  {
    id: 'anek-devanagari',
    name: 'Anek Devanagari (अनेक - आधुनिक)',
    family: '"Anek Devanagari", sans-serif',
    previewHindi: 'आधुनिक स्पष्ट डिज़ाइन',
    badge: 'मॉडर्न',
  },
  {
    id: 'martel',
    name: 'Martel (मार्तेल - संपादकीय)',
    family: '"Martel", serif',
    previewHindi: 'संपादकीय विशेष रिपोर्ट',
    badge: 'संपादकीय',
  },
];

const CUSTOM_FONTS_STORAGE_KEY = 'custom_uploaded_fonts';

export interface CustomUploadedFont {
  id: string;
  name: string;
  family: string;
  dataUrl: string;
}

export function getCustomUploadedFonts(): CustomUploadedFont[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_FONTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Failed to load custom uploaded fonts', e);
    return [];
  }
}

export async function registerCustomFont(name: string, file: File): Promise<CustomUploadedFont> {
  const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
  const ext = (file.name || '').substring((file.name || '').lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error('अमान्य फ़ॉन्ट फ़ाइल! केवल .ttf, .otf, .woff या .woff2 फ़ाइलें समर्थित हैं।');
  }

  const maxSizeBytes = 15 * 1024 * 1024; // 15MB
  if (file.size > maxSizeBytes) {
    throw new Error('फ़ॉन्ट फ़ाइल का आकार 15MB से अधिक नहीं होना चाहिए।');
  }

  const cleanName = name.trim().replace(/[^a-zA-Z0-9_\-\s\u0900-\u097F]/g, '') || 'CustomFont';
  const familyName = `CustomFont_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) throw new Error('फ़ॉन्ट फ़ाइल पढ़ने में विफल');

        // Dynamically load font into document using FontFace API
        if (typeof FontFace !== 'undefined') {
          const font = new FontFace(familyName, `url(${dataUrl})`);
          await font.load();
          document.fonts.add(font);
        }

        const newCustomFont: CustomUploadedFont = {
          id: `custom-${Date.now()}`,
          name: cleanName,
          family: `"${familyName}", sans-serif`,
          dataUrl,
        };

        const existing = getCustomUploadedFonts();
        const updated = [...existing, newCustomFont];
        localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(updated));

        resolve(newCustomFont);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('फ़ाइल पढ़ने में त्रुटि'));
    reader.readAsDataURL(file);
  });
}

export function initCustomUploadedFonts() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const list = getCustomUploadedFonts();
  list.forEach(async (f) => {
    try {
      const familyClean = f.family.replace(/"/g, '').split(',')[0].trim();
      if (typeof FontFace !== 'undefined') {
        const font = new FontFace(familyClean, `url(${f.dataUrl})`);
        await font.load();
        document.fonts.add(font);
      }
    } catch (e) {
      console.warn('Could not load custom font into document', f.name, e);
    }
  });
}

export function getAllHeadlineFonts(): HeadlineFontOption[] {
  const custom = getCustomUploadedFonts().map((f) => ({
    id: f.id,
    name: `${f.name} (कस्टम फ़ॉन्ट)`,
    family: f.family,
    previewHindi: 'कस्टम फ़ॉन्ट हेडलाइन',
    badge: '👤 कस्टम',
    isCustom: true,
  }));
  return [...BUILTIN_HEADLINE_FONTS, ...custom];
}

export type FontPackageTier = 'BASIC' | 'ADVANCE' | 'PRO' | 'VIP DESK';

/**
 * Checks whether user can upload custom fonts.
 * Strictly VIP DESK (and Admin) only!
 * BASIC users: false
 * ADVANCE users: false
 * PRO users: false
 * VIP DESK users: true
 */
export function canUserUploadCustomFont(userTier?: string | null, isAdmin: boolean = false): boolean {
  if (isAdmin) return true;
  const t = (userTier || '').toLowerCase().trim();
  return t === 'ultra' || t === 'vip desk' || t === 'vip_desk' || t === 'vip' || t === 'vip_dash' || t === 'vip-dash';
}

/**
 * Checks whether a specific font is allowed for the user's tier.
 * BASIC: Hind only
 * ADVANCE: Hind, Khand, Sahitya, Baloo 2, Anek Devanagari (5 fonts)
 * PRO: Hind, Khand, Sahitya, Baloo 2, Anek Devanagari + Noto Sans, Poppins, Rozha One, Mukta, Rajdhani (10 fonts)
 * VIP DESK: All Unicode fonts + custom uploaded fonts
 */
export function isFontAllowedForTier(
  fontIdOrName: string,
  userTier?: string | null,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  const t = (userTier || '').toLowerCase().trim();
  const isVip = t === 'ultra' || t === 'vip desk' || t === 'vip_desk' || t === 'vip' || t === 'vip_dash' || t === 'vip-dash';
  if (isVip) return true;

  const clean = (fontIdOrName || '').trim().toLowerCase().replace(/['"_\-]/g, ' ');
  if (!clean) return true;

  // Custom fonts are strictly VIP Desk only
  if (clean.includes('custom') || fontIdOrName.startsWith('custom-')) {
    return isVip;
  }

  const isHind = clean.includes('hind') && !clean.includes('tiro');
  const isBaloo = clean.includes('baloo');
  const isKhand = clean.includes('khand');
  const isSahitya = clean.includes('sahitya');
  const isAnek = clean.includes('anek');

  // Basic tier: ONLY Hind
  if (!t || t === 'basic') {
    return isHind;
  }

  // Advanced tier: Hind, Khand, Sahitya, Baloo, Anek Devanagari
  const isAdvanceFont = isHind || isBaloo || isKhand || isSahitya || isAnek;
  if (t === 'advanced' || t === 'advance') {
    return isAdvanceFont;
  }

  // Pro tier: the 5 above + Noto Sans, Poppins, Rozha One, Mukta, Rajdhani (total 10)
  const isNotoSans = clean.includes('noto sans');
  const isPoppins = clean.includes('poppins');
  const isRozha = clean.includes('rozha');
  const isMukta = clean.includes('mukta');
  const isRajdhani = clean.includes('rajdhani');
  const isProFont = isAdvanceFont || isNotoSans || isPoppins || isRozha || isMukta || isRajdhani;

  if (t === 'professional' || t === 'pro') {
    return isProFont;
  }

  return isHind;
}

/**
 * Returns required plan tier name for a font.
 */
export function getTierForFont(fontIdOrName: string): 'BASIC' | 'ADVANCE' | 'PRO' | 'VIP DESK' {
  const clean = (fontIdOrName || '').trim().toLowerCase().replace(/['"_\-]/g, ' ');
  if (clean.includes('custom') || fontIdOrName.startsWith('custom-')) return 'VIP DESK';
  if (clean.includes('hind') && !clean.includes('tiro')) return 'BASIC';
  if (clean.includes('baloo') || clean.includes('khand') || clean.includes('sahitya') || clean.includes('anek')) return 'ADVANCE';
  if (clean.includes('noto sans') || clean.includes('poppins') || clean.includes('rozha') || clean.includes('mukta') || clean.includes('rajdhani')) return 'PRO';
  return 'VIP DESK';
}

/**
 * Package Font Mapping structure.
 */
export const PACKAGE_FONT_MAPPING: Record<FontPackageTier, string[]> = {
  BASIC: ['Hind', 'hind'],
  ADVANCE: [
    'Hind', 'hind',
    'Khand', 'khand',
    'Sahitya', 'sahitya',
    'Baloo 2', 'baloo-2', 'baloo',
    'Anek Devanagari', 'anek-devanagari', 'anek',
  ],
  PRO: [
    'Hind', 'hind',
    'Khand', 'khand',
    'Sahitya', 'sahitya',
    'Baloo 2', 'baloo-2', 'baloo',
    'Anek Devanagari', 'anek-devanagari', 'anek',
    'Noto Sans Devanagari', 'noto-sans-devanagari', 'noto sans',
    'Poppins', 'poppins',
    'Rozha One', 'rozha-one', 'rozha',
    'Mukta', 'mukta',
    'Rajdhani', 'rajdhani',
  ],
  'VIP DESK': [
    'Hind', 'hind',
    'Khand', 'khand',
    'Sahitya', 'sahitya',
    'Baloo 2', 'baloo-2', 'baloo',
    'Anek Devanagari', 'anek-devanagari', 'anek',
    'Noto Sans Devanagari', 'noto-sans-devanagari', 'noto sans',
    'Poppins', 'poppins',
    'Rozha One', 'rozha-one', 'rozha',
    'Mukta', 'mukta',
    'Rajdhani', 'rajdhani',
    'Tiro Devanagari Hindi', 'tiro-devanagari',
    'Kalam', 'kalam',
    'Gotu', 'gotu',
    'Yatra One', 'yatra-one',
    'Martel', 'martel',
  ],
};

export function getHeadlineFontsForPackage(userTier?: string | null, isAdmin: boolean = false): HeadlineFontOption[] {
  const allFonts = getAllHeadlineFonts();
  if (isAdmin) return allFonts;

  const t = (userTier || '').toLowerCase().trim();
  let tierKey: FontPackageTier = 'BASIC';
  if (t === 'ultra' || t === 'vip desk' || t === 'vip_desk' || t === 'vip' || t === 'vip_dash' || t === 'vip-dash') {
    tierKey = 'VIP DESK';
  } else if (t === 'professional' || t === 'pro') {
    tierKey = 'PRO';
  } else if (t === 'advanced' || t === 'advance') {
    tierKey = 'ADVANCE';
  }

  const isVipDesk = canUserUploadCustomFont(userTier, isAdmin);

  return allFonts.filter((f) => {
    if (f.isCustom) return isVipDesk;
    return isFontAllowedForTier(f.id, userTier, isAdmin);
  });
}
