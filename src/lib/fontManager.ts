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
    id: 'sarala',
    name: 'Sarala (सिंपल व बोल्ड)',
    family: '"Sarala", sans-serif',
    previewHindi: 'सीधा जनता से संवाद',
    badge: 'सिंपल',
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
  const cleanName = name.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '') || 'CustomFont';
  const familyName = `CustomFont_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) throw new Error('Failed to read font file');

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
    reader.onerror = () => reject(new Error('File reading error'));
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
    name: `${f.name} (कस्टम फॉन्ट)`,
    family: f.family,
    previewHindi: 'कस्टम फ़ॉन्ट हेडलाइन',
    badge: '👤 एडमिन अपलोड',
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
  return t === 'ultra' || t === 'vip desk' || t === 'vip_desk' || t === 'vip';
}

/**
 * Package-based headline font access system.
 * System is prepared for exact per-package font mapping to be provided in next instruction.
 * Without inventing arbitrary mappings now, this architecture isolates access per package.
 */
export function getHeadlineFontsForPackage(userTier?: string | null, isAdmin: boolean = false): HeadlineFontOption[] {
  const allFonts = getAllHeadlineFonts();
  if (isAdmin) return allFonts;

  // Custom fonts are strictly accessible only to VIP DESK users
  const isVipDesk = canUserUploadCustomFont(userTier, isAdmin);
  if (!isVipDesk) {
    return allFonts.filter((f) => !f.isCustom);
  }
  return allFonts;
}

/**
 * Package Font Mapping structure.
 * Ready for future mapping instructions without inventing arbitrary assignments.
 */
export const PACKAGE_FONT_MAPPING: Record<FontPackageTier, string[]> = {
  BASIC: [],
  ADVANCE: [],
  PRO: [],
  'VIP DESK': [],
};
