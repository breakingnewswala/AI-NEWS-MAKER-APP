// AI NEWS MAKER — Statement / Bayanbaazi Curated Background Library
// High-fidelity background presets for quote & bayaan frames

export interface StatementBackgroundPreset {
  id: string;
  name: string;
  nameHi: string;
  category: 'crimson' | 'royal_blue' | 'black_gold' | 'charcoal' | 'editorial';
  backgroundStyle: string; // CSS background gradient or color
  previewGradient: string;
  accentColor: string;
  textColor: string;
  order: number;
}

export const STATEMENT_BACKGROUND_PRESETS: StatementBackgroundPreset[] = [
  {
    id: 'bg_crimson_editorial',
    name: 'Deep Crimson Editorial',
    nameHi: 'डीप क्रिमसन रेड (गहरा लाल)',
    category: 'crimson',
    backgroundStyle: 'radial-gradient(circle at 75% 30%, #DC2626 0%, #991B1B 45%, #450A0A 100%)',
    previewGradient: 'from-red-600 via-red-900 to-red-950',
    accentColor: '#FBBF24',
    textColor: '#FFFFFF',
    order: 1,
  },
  {
    id: 'bg_dark_maroon',
    name: 'Dark Maroon Vignette',
    nameHi: 'डार्क मरून विगनेट',
    category: 'crimson',
    backgroundStyle: 'radial-gradient(circle at 50% 40%, #831843 0%, #4C0519 60%, #1A0007 100%)',
    previewGradient: 'from-pink-800 via-rose-950 to-black',
    accentColor: '#F59E0B',
    textColor: '#FFFFFF',
    order: 2,
  },
  {
    id: 'bg_royal_blue_studio',
    name: 'Royal Blue Studio',
    nameHi: 'रॉयल ब्लू स्टूडियो (गहरा नीला)',
    category: 'royal_blue',
    backgroundStyle: 'radial-gradient(circle at 70% 30%, #1D4ED8 0%, #1E3A8A 50%, #030712 100%)',
    previewGradient: 'from-blue-700 via-blue-900 to-slate-950',
    accentColor: '#FDE047',
    textColor: '#FFFFFF',
    order: 3,
  },
  {
    id: 'bg_midnight_navy',
    name: 'Midnight Navy Depth',
    nameHi: 'मिडनाइट नेवी ब्लू',
    category: 'royal_blue',
    backgroundStyle: 'linear-gradient(135deg, #0B192C 0%, #1E3E62 50%, #000000 100%)',
    previewGradient: 'from-slate-900 via-blue-950 to-black',
    accentColor: '#38BDF8',
    textColor: '#FFFFFF',
    order: 4,
  },
  {
    id: 'bg_black_editorial_gold',
    name: 'Black Obsidian Gold',
    nameHi: 'ब्लैक ऑब्सिडियन गोल्ड',
    category: 'black_gold',
    backgroundStyle: 'radial-gradient(circle at 60% 25%, #1E293B 0%, #0F172A 50%, #020617 100%)',
    previewGradient: 'from-slate-800 via-slate-900 to-black',
    accentColor: '#F59E0B',
    textColor: '#FFFFFF',
    order: 5,
  },
  {
    id: 'bg_pure_charcoal',
    name: 'Charcoal Minimalist',
    nameHi: 'चारकोल मिनिमलिस्ट (ग्रे-ब्लैक)',
    category: 'charcoal',
    backgroundStyle: 'linear-gradient(180deg, #1E293B 0%, #111827 60%, #030712 100%)',
    previewGradient: 'from-slate-800 via-gray-900 to-black',
    accentColor: '#EF4444',
    textColor: '#FFFFFF',
    order: 6,
  },
  {
    id: 'bg_premium_amber_gold',
    name: 'Premium Amber Gold',
    nameHi: 'प्रीमियम एम्बर गोल्ड',
    category: 'black_gold',
    backgroundStyle: 'radial-gradient(circle at 80% 30%, #78350F 0%, #451A03 55%, #0C0A09 100%)',
    previewGradient: 'from-amber-800 via-stone-900 to-black',
    accentColor: '#FEF08A',
    textColor: '#FFFFFF',
    order: 7,
  },
  {
    id: 'bg_dark_rust_saffron',
    name: 'Dark Rust Saffron',
    nameHi: 'डार्क रस्ट केसरिया (सफ्रॉन)',
    category: 'editorial',
    backgroundStyle: 'radial-gradient(circle at 75% 35%, #9A3412 0%, #7C2D12 45%, #1C1917 100%)',
    previewGradient: 'from-orange-800 via-amber-950 to-stone-950',
    accentColor: '#FDE047',
    textColor: '#FFFFFF',
    order: 8,
  },
  {
    id: 'bg_cyber_teal_night',
    name: 'Cyber Teal Night',
    nameHi: 'साइबर टील नाइट (हरा-नीला)',
    category: 'editorial',
    backgroundStyle: 'radial-gradient(circle at 70% 30%, #115E59 0%, #042F2E 50%, #020617 100%)',
    previewGradient: 'from-teal-800 via-teal-950 to-black',
    accentColor: '#5EEAD4',
    textColor: '#FFFFFF',
    order: 9,
  },
  {
    id: 'bg_studio_violet',
    name: 'Studio Violet Regal',
    nameHi: 'स्टूडियो वॉयलेट रीगल',
    category: 'editorial',
    backgroundStyle: 'radial-gradient(circle at 75% 30%, #581C87 0%, #3B0764 55%, #090014 100%)',
    previewGradient: 'from-purple-900 via-purple-950 to-black',
    accentColor: '#E9D5FF',
    textColor: '#FFFFFF',
    order: 10,
  },
  {
    id: 'bg_deep_emerald',
    name: 'Deep Emerald Press',
    nameHi: 'डीप एमराल्ड प्रेस (गहरा हरा)',
    category: 'editorial',
    backgroundStyle: 'radial-gradient(circle at 70% 30%, #064E3B 0%, #022C22 55%, #000000 100%)',
    previewGradient: 'from-emerald-900 via-emerald-950 to-black',
    accentColor: '#A7F3D0',
    textColor: '#FFFFFF',
    order: 11,
  },
  {
    id: 'bg_dual_newsroom_mesh',
    name: 'Dual Newsroom Red-Navy',
    nameHi: 'रेड-नेवी ड्यूल न्यूज़रूम',
    category: 'editorial',
    backgroundStyle: 'linear-gradient(135deg, #7F1D1D 0%, #1E1B4B 50%, #030712 100%)',
    previewGradient: 'from-red-900 via-indigo-950 to-black',
    accentColor: '#FBBF24',
    textColor: '#FFFFFF',
    order: 12,
  },
];
