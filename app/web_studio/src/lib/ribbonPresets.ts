export interface RibbonPreset {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
}

export const BUILTIN_RIBBONS: RibbonPreset[] = [
  {
    id: 'speed-blue-red',
    name: 'BREAKING NEWS (रॉयल ब्लू + रेड)',
    url: '/assets/breaking_news_ribbon.svg',
  },
  {
    id: 'yellow-fire-red',
    name: 'EXCLUSIVE NEWS (एक्सक्लूसिव न्यूज़)',
    url: '/assets/ribbon_yellow_fire_red.svg',
  },
  {
    id: 'golden-sun-black',
    name: 'BIG BREAKING (बिग ब्रेकिंग)',
    url: '/assets/ribbon_golden_sun_black.svg',
  },
  {
    id: 'pure-yellow-black',
    name: 'ताज़ा ख़बर (TAZA KHABAR)',
    url: '/assets/ribbon_pure_yellow_black.svg',
  },
  {
    id: 'tricolor-gold',
    name: 'बड़ी ख़बर (BADI KHABAR)',
    url: '/assets/ribbon_tricolor_gold.svg',
  },
  {
    id: 'flash-amber-red',
    name: 'महा ब्रेकिंग (MAHA BREAKING)',
    url: '/assets/ribbon_flash_amber_red.svg',
  },
  {
    id: 'charcoal-3d-red',
    name: 'SPECIAL REPORT (विशेष रिपोर्ट)',
    url: '/assets/ribbon_3d_charcoal_red.svg',
  },
  {
    id: 'crimson-gold',
    name: 'एक्सक्लूसिव (EXCLUSIVE GOLD)',
    url: '/assets/ribbon_crimson_gold.svg',
  },
  {
    id: 'vibrant-red-white',
    name: 'सुपर ब्रेकिंग (SUPER BREAKING)',
    url: '/assets/ribbon_vibrant_red_white.svg',
  },
  {
    id: 'live-update',
    name: '🔴 LIVE UPDATE (लाइव अपडेट)',
    url: '/assets/ribbon_live_update.svg',
  },
  {
    id: 'ground-report',
    name: 'ग्राउंड रिपोर्ट (GROUND REPORT)',
    url: '/assets/ribbon_ground_report.svg',
  },
  {
    id: 'viral-sach',
    name: 'वायरल सच (VIRAL SACH)',
    url: '/assets/ribbon_viral_sach.svg',
  },
  {
    id: 'fact-check',
    name: 'सच का खुलासा / पड़ताल (FACT CHECK)',
    url: '/assets/ribbon_fact_check.svg',
  },
  {
    id: 'big-story',
    name: 'देश की बड़ी बात (BIG STORY)',
    url: '/assets/ribbon_big_story.svg',
  },
  {
    id: 'cyber-neon',
    name: 'टॉप न्यूज़ (TOP NEWS)',
    url: '/assets/ribbon_cyber_neon.svg',
  },
];

const STORAGE_KEY = 'breaking_news_saved_ribbons_v1';

export function loadSavedCustomRibbons(): RibbonPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => ({ ...item, isCustom: true }));
    }
  } catch (err) {
    console.error('Failed to load saved ribbons', err);
  }
  return [];
}

export function saveCustomRibbon(name: string, dataUrl: string): RibbonPreset[] {
  try {
    const current = loadSavedCustomRibbons();
    const newRibbon: RibbonPreset = {
      id: `custom-ribbon-${Date.now()}`,
      name: name.trim() || `कस्टम रिबन ${current.length + 1}`,
      url: dataUrl,
      isCustom: true,
    };
    const updated = [newRibbon, ...current];
    // Keep max 10 custom ribbons to prevent localStorage quota issues
    const capped = updated.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    return capped;
  } catch (err) {
    console.error('Failed to save custom ribbon', err);
    return loadSavedCustomRibbons();
  }
}

export function deleteCustomRibbon(id: string): RibbonPreset[] {
  try {
    const current = loadSavedCustomRibbons();
    const filtered = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.error('Failed to delete custom ribbon', err);
    return loadSavedCustomRibbons();
  }
}
