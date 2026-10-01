// AI News Graphic Template System - Registry & Access Control
// Strictly 4:5 Ratio, Modular & Independent Graphic Templates

export type GraphicPlanCategory = 'BASIC' | 'ADVANCED' | 'PRO' | 'VIP DESK';

export interface TemplateConfig {
  id: string;
  template_id: string;
  name: string;
  headline_max_lines: number; // e.g. 2 or 3
  headline_line_count: number; // strictly matches headline_max_lines
  headline_area: string; // e.g. "3-Line Headline Area (बॉटम पॉलीगॉन)"
  aspect_ratio: '4:5' | '1:1' | '9:16' | '16:9';
  description?: string;
  plan_category?: GraphicPlanCategory;
  has_description_cta?: boolean;
}

export interface GraphicTemplateDefinition {
  graphicNumber: number; // 1, 2, 3...
  id: string; // 'graphic_001', 'graphic_002', 'graphic_003'...
  name: string; // 'Graphic 1', 'Graphic 2', etc.
  titleHi: string; // e.g. 'Graphic 1 (क्लीन 4:5 फोटो न्यूज़)'
  subtitle: string;
  planCategory: GraphicPlanCategory;
  aspectRatio: '4:5'; // STRICTLY 4:5 aspect ratio
  headlineMaxLines: number; // e.g. 2 or 3
  headline_max_lines: number; // Metadata for AI capacity constraint
  headline_area: string; // Metadata for AI area injection
  headline_line_count: number; // Strictly 2 or 3
  hasDescriptionCTA: boolean;
  descriptionCTAText?: string; // Strictly single-line: "पूरी खबर डिस्क्रिप्शन में"
  descriptionCTAPosition?: 'above_footer' | 'below_headline' | 'on_photo' | 'bottom_bar' | string;
  dateFormat?: 'rotated_270' | 'horizontal_pill' | 'badge' | 'none';
  locationStyle?: 'top_left_box' | 'top_strip' | 'headline_tag' | 'pill' | 'none';
  logoPlacement?: 'top_right_box' | 'top_center' | 'top_left' | 'footer';
  photoLayout?: 'top_half' | 'full_bleed' | 'split_35_65' | 'bottom_half' | string;
  footerType?: 'fixed_yellow' | 'dark_minimal' | 'custom_bar' | 'none';
  description: string;
  tags?: string[];
}

/**
 * Plan Hierarchy weights:
 * BASIC = 1
 * ADVANCED = 2
 * PRO = 3
 * VIP DESK = 4
 */
export const PLAN_WEIGHTS: Record<GraphicPlanCategory, number> = {
  BASIC: 1,
  ADVANCED: 2,
  PRO: 3,
  'VIP DESK': 4,
};

/**
 * Normalizes user subscription tier string into standard GraphicPlanCategory
 */
export function normalizeUserPlanTier(tier?: string | null): GraphicPlanCategory {
  if (!tier) return 'BASIC';
  const t = tier.trim().toLowerCase();
  if (t === 'ultra' || t === 'vip' || t === 'vip desk' || t === 'vip_desk') return 'VIP DESK';
  if (t === 'professional' || t === 'pro') return 'PRO';
  if (t === 'advanced') return 'ADVANCED';
  return 'BASIC';
}

export interface TemplatePlanConfig {
  allowedPlans: GraphicPlanCategory[];
  isActive: boolean;
  version: string;
}

export const GRAPHIC_1_DEFINITION: GraphicTemplateDefinition = {
  graphicNumber: 1,
  id: 'graphic_001',
  name: 'Graphic 1',
  titleHi: 'Graphic 1 (बेसिक 4:5 न्यूज़ जैकेट)',
  subtitle: 'बेसिक प्लान: 4:5 पोर्ट्रेट, 270° रोटेटेड डेट, लोकेशन व लोगो बॉक्स, पूरी खबर डिस्क्रिप्शन में CTA, फिक्स्ड येलो फुटर',
  planCategory: 'BASIC',
  aspectRatio: '4:5',
  headlineMaxLines: 3,
  headline_max_lines: 3,
  headline_line_count: 3,
  headline_area: '3-Line Headline Area (बॉटम व्हाइट पॉलीगॉन)',
  hasDescriptionCTA: true,
  descriptionCTAText: 'पूरी खबर डिस्क्रिप्शन में',
  descriptionCTAPosition: 'below_headline',
  dateFormat: 'rotated_270',
  locationStyle: 'top_left_box',
  logoPlacement: 'top_right_box',
  photoLayout: 'top_half',
  footerType: 'fixed_yellow',
  description: 'Graphic 1 (BASIC PLAN): शीर्ष 53% न्यूज़ फोटो, टॉप-लेफ्ट लोकेशन बॉक्स (रेड बॉर्डर), टॉप-राइट लोगो बॉक्स (#FFE600), लेफ्ट 270° रोटेटेड डेट, बॉटम 47% व्हाइट पॉलीगॉन एरिया में 3-लाइन हेडलाइन, "पूरी खबर डिस्क्रिप्शन में" रेड पिल CTA और बॉटम फिक्स्ड येलो सोशल फुटर।',
  tags: ['basic', '4:5', 'photo-news', 'fixed-footer', 'graphic-1'],
};

export const GRAPHIC_2_DEFINITION: GraphicTemplateDefinition = {
  graphicNumber: 2,
  id: 'graphic_002',
  name: 'Graphic 2',
  titleHi: 'Graphic 2 (एडवांस 4:5 न्यूज़ जैकेट)',
  subtitle: 'एडवांस प्लान: 4:5 पोर्ट्रेट, आउटर ऑरेंज बॉर्डर, 3-लाइन हेडलाइन, कमेंट बॉक्स CTA, फिक्स्ड येलो फुटर',
  planCategory: 'ADVANCED',
  aspectRatio: '4:5',
  headlineMaxLines: 3,
  headline_max_lines: 3,
  headline_line_count: 3,
  headline_area: '3-Line Headline Area (ऑरेंज बॉर्डर फ्रेम)',
  hasDescriptionCTA: true,
  descriptionCTAText: 'पूरी खबर कमेंट बॉक्स में',
  descriptionCTAPosition: 'below_headline',
  dateFormat: 'none',
  locationStyle: 'top_left_box',
  logoPlacement: 'top_right_box',
  photoLayout: 'top_half',
  footerType: 'fixed_yellow',
  description: 'Graphic 2 (ADVANCED PLAN): आउटर ऑरेंज बॉर्डर, 3-लाइन हेडलाइन एरिया, कमेंट बॉक्स CTA और फिक्स्ड सोशल फुटर।',
  tags: ['advanced', '4:5', 'photo-news', 'graphic-2'],
};

export const GRAPHIC_3_DEFINITION: GraphicTemplateDefinition = {
  graphicNumber: 3,
  id: 'graphic_003',
  name: 'Graphic 3',
  titleHi: 'Graphic 3 (प्रो 4:5 न्यूज़ जैकेट - 2 लाइन हेडलाइन)',
  subtitle: 'प्रो प्लान: 4:5 पोर्ट्रेट, 2-लाइन हेडलाइन एरिया, मॉडर्न मिनिमल डिज़ाइन',
  planCategory: 'PRO',
  aspectRatio: '4:5',
  headlineMaxLines: 2,
  headline_max_lines: 2,
  headline_line_count: 2,
  headline_area: '2-Line Headline Area (प्रो मिनिमल)',
  hasDescriptionCTA: true,
  descriptionCTAText: 'पूरी खबर डिस्क्रिप्शन में',
  descriptionCTAPosition: 'below_headline',
  dateFormat: 'horizontal_pill',
  locationStyle: 'top_left_box',
  logoPlacement: 'top_right_box',
  photoLayout: 'top_half',
  footerType: 'dark_minimal',
  description: 'Graphic 3 (PRO PLAN): 2-लाइन हेडलाइन क्षमता, मॉडर्न मिनिमल स्टाइल, हाई-इम्पैक्ट विज़ुअल।',
  tags: ['pro', '4:5', '2-line-headline', 'graphic-3'],
};

export const GRAPHIC_4_DEFINITION: GraphicTemplateDefinition = {
  graphicNumber: 4,
  id: 'graphic_004',
  name: 'Graphic 4',
  titleHi: 'Graphic 4 (वीआईपी डेस्क 4:5 जैकेट - 2 लाइन हेडलाइन)',
  subtitle: 'वीआईपी डेस्क: 4:5 पोर्ट्रेट, 2-लाइन हेडलाइन एरिया, अल्टीमेट फिनिश',
  planCategory: 'VIP DESK',
  aspectRatio: '4:5',
  headlineMaxLines: 2,
  headline_max_lines: 2,
  headline_line_count: 2,
  headline_area: '2-Line Headline Area (वीआईपी कॉम्पैक्ट)',
  hasDescriptionCTA: false,
  dateFormat: 'badge',
  locationStyle: 'headline_tag',
  logoPlacement: 'top_center',
  photoLayout: 'split_35_65',
  footerType: 'custom_bar',
  description: 'Graphic 4 (VIP DESK): 2-लाइन हेडलाइन, कॉम्पैक्ट फोटो लेआउट, कस्टम ब्रांडिंग।',
  tags: ['vip', '4:5', '2-line-headline', 'graphic-4'],
};

export interface TemplateHeadlineConfig {
  template_id: string;
  headline_line_count: number;
  headline_max_lines: number;
  headline_area: string;
}

export const TEMPLATE_CONFIG_REGISTRY: Record<string, TemplateConfig> = {
  graphic_001: {
    id: 'graphic_001',
    template_id: 'graphic_001',
    name: 'Graphic 1',
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: '3-Line Headline Area (बॉटम व्हाइट पॉलीगॉन)',
    aspect_ratio: '4:5',
    description: 'बेसिक 4:5 न्यूज़ जैकेट - 3 लाइन हेडलाइन क्षमता',
    plan_category: 'BASIC',
    has_description_cta: true,
  },
  graphic_002: {
    id: 'graphic_002',
    template_id: 'graphic_002',
    name: 'Graphic 2',
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: '3-Line Headline Area (ऑरेंज बॉर्डर फ्रेम)',
    aspect_ratio: '4:5',
    description: 'एडवांस 4:5 न्यूज़ जैकेट - 3 लाइन हेडलाइन क्षमता',
    plan_category: 'ADVANCED',
    has_description_cta: true,
  },
  graphic_003: {
    id: 'graphic_003',
    template_id: 'graphic_003',
    name: 'Graphic 3',
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: '2-Line Headline Area (प्रो मिनिमल)',
    aspect_ratio: '4:5',
    description: 'प्रो 4:5 न्यूज़ जैकेट - 2 लाइन हेडलाइन क्षमता',
    plan_category: 'PRO',
    has_description_cta: true,
  },
  graphic_004: {
    id: 'graphic_004',
    template_id: 'graphic_004',
    name: 'Graphic 4',
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: '2-Line Headline Area (वीआईपी कॉम्पैक्ट)',
    aspect_ratio: '4:5',
    description: 'वीआईपी डेस्क 4:5 जैकेट - 2 लाइन हेडलाइन क्षमता',
    plan_category: 'VIP DESK',
    has_description_cta: false,
  },
  'jacket-default': {
    id: 'jacket-default',
    template_id: 'jacket-default',
    name: 'Default Frame',
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: '3-Line Headline Area',
    aspect_ratio: '4:5',
    description: 'डिफ़ॉल्ट 4:5 न्यूज़ जैकेट',
  },
  'jacket-original': {
    id: 'jacket-original',
    template_id: 'jacket-original',
    name: 'Original Jacket',
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: '3-Line Headline Area',
    aspect_ratio: '4:5',
  },
  'jacket-breaking-red': {
    id: 'jacket-breaking-red',
    template_id: 'jacket-breaking-red',
    name: 'Breaking Red',
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: '3-Line Headline Area',
    aspect_ratio: '4:5',
  },
  'jacket-investigation': {
    id: 'jacket-investigation',
    template_id: 'jacket-investigation',
    name: 'Investigation Special',
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: '2-Line Headline Area',
    aspect_ratio: '4:5',
  },
  'jacket-quote': {
    id: 'jacket-quote',
    template_id: 'jacket-quote',
    name: 'Quote Jacket',
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: '2-Line Headline Area',
    aspect_ratio: '4:5',
  },
  'jacket-text-breaking': {
    id: 'jacket-text-breaking',
    template_id: 'jacket-text-breaking',
    name: 'Text Breaking',
    headline_max_lines: 3,
    headline_line_count: 3,
    headline_area: '3-Line Headline Area',
    aspect_ratio: '4:5',
  },
  'jacket-morning': {
    id: 'jacket-morning',
    template_id: 'jacket-morning',
    name: 'Morning Jacket',
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: '2-Line Headline Area',
    aspect_ratio: '4:5',
  },
  'jacket-epaper': {
    id: 'jacket-epaper',
    template_id: 'jacket-epaper',
    name: 'E-Paper Jacket',
    headline_max_lines: 2,
    headline_line_count: 2,
    headline_area: '2-Line Headline Area',
    aspect_ratio: '4:5',
  },
};

export function getGraphicTemplateConfig(templateId?: string): TemplateConfig {
  const tid = templateId || 'graphic_001';
  if (TEMPLATE_CONFIG_REGISTRY[tid]) {
    return TEMPLATE_CONFIG_REGISTRY[tid];
  }
  const tpl = getGraphicTemplate(tid);
  if (tpl) {
    return {
      id: tpl.id,
      template_id: tpl.id,
      name: tpl.name,
      headline_max_lines: tpl.headline_max_lines || tpl.headlineMaxLines || 3,
      headline_line_count: tpl.headline_line_count || tpl.headlineMaxLines || 3,
      headline_area: tpl.headline_area || `${tpl.headlineMaxLines}-Line Headline Area`,
      aspect_ratio: tpl.aspectRatio,
      description: tpl.description,
      plan_category: tpl.planCategory,
      has_description_cta: tpl.hasDescriptionCTA,
    };
  }
  const isTwoLine = tid === 'graphic_003' || tid === 'graphic_004' || tid.includes('2_line') || tid.includes('investigation') || tid.includes('quote');
  const lines = isTwoLine ? 2 : 3;
  return {
    id: tid,
    template_id: tid,
    name: `Template ${tid}`,
    headline_max_lines: lines,
    headline_line_count: lines,
    headline_area: `${lines}-Line Headline Area`,
    aspect_ratio: '4:5',
  };
}

export function getTemplateHeadlineConfig(templateId?: string): TemplateConfig & TemplateHeadlineConfig {
  return getGraphicTemplateConfig(templateId);
}

export const DEFAULT_TEMPLATE_PLAN_CONFIGS: Record<string, TemplatePlanConfig> = {
  graphic_001: {
    allowedPlans: ['BASIC'],
    isActive: true,
    version: 'v1.0',
  },
  graphic_002: {
    allowedPlans: ['ADVANCED'],
    isActive: true,
    version: 'v1.0',
  },
  graphic_003: {
    allowedPlans: ['PRO'],
    isActive: true,
    version: 'v1.0',
  },
  graphic_004: {
    allowedPlans: ['VIP DESK'],
    isActive: true,
    version: 'v1.0',
  },
};

const STORAGE_KEY_TEMPLATE_CONFIGS = 'admin_template_configs_v3';

export function getAllTemplateConfigs(): Record<string, TemplatePlanConfig> {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATE_PLAN_CONFIGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATE_CONFIGS);
    if (!raw) return DEFAULT_TEMPLATE_PLAN_CONFIGS;
    return { ...DEFAULT_TEMPLATE_PLAN_CONFIGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_TEMPLATE_PLAN_CONFIGS;
  }
}

export function getTemplateConfig(templateId: string): TemplatePlanConfig {
  const configs = getAllTemplateConfigs();
  return (
    configs[templateId] ||
    DEFAULT_TEMPLATE_PLAN_CONFIGS[templateId] || {
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
      version: 'v1.0',
    }
  );
}

export function saveTemplateConfig(templateId: string, update: Partial<TemplatePlanConfig>): void {
  if (typeof window === 'undefined') return;
  try {
    const configs = getAllTemplateConfigs();
    const current = configs[templateId] || DEFAULT_TEMPLATE_PLAN_CONFIGS[templateId] || {
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
      version: 'v1.0',
    };
    configs[templateId] = { ...current, ...update };
    localStorage.setItem(STORAGE_KEY_TEMPLATE_CONFIGS, JSON.stringify(configs));
    window.dispatchEvent(new CustomEvent('template_plans_updated', { detail: { templateId, config: configs[templateId] } }));
  } catch (e) {
    console.error('Failed to save template config', e);
  }
}

/**
 * Checks whether a template is visible and accessible for a user's active plan.
 * - Admin: sees all approved templates (regardless of user plan)
 * - User: sees strictly and only the templates allowed for their active plan!
 *   BASIC: only BASIC PACKAGE FRAMES
 *   ADVANCE: only ADVANCE PACKAGE FRAMES
 *   PRO: PRO PACKAGE FRAMES + CUSTOM FRAMES
 *   VIP DESK: VIP DESK PACKAGE FRAMES + CUSTOM FRAMES
 */
export function isTemplateAvailableForUserPlan(
  templateId: string,
  userPlanTier: string | null | undefined,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  if (templateId === 'custom-png') {
    const userCat = normalizeUserPlanTier(userPlanTier);
    return userCat === 'PRO' || userCat === 'VIP DESK';
  }
  const config = getTemplateConfig(templateId);
  if (!config.isActive) return false;
  const userCat = normalizeUserPlanTier(userPlanTier);
  return config.allowedPlans.includes(userCat);
}

/**
 * Access Control:
 * - BASIC user: Unlocked BASIC; Locked ADVANCED, PRO, VIP DESK
 * - ADVANCED user: Unlocked BASIC, ADVANCED; Locked PRO, VIP DESK
 * - PRO user: Unlocked BASIC, ADVANCED, PRO; Locked VIP DESK
 * - VIP DESK user or Admin: All Unlocked
 */
export function isTemplateCategoryUnlocked(
  userPlanTier: string | null | undefined,
  templateCategory: GraphicPlanCategory,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  const userCategory = normalizeUserPlanTier(userPlanTier);
  const userWeight = PLAN_WEIGHTS[userCategory] || 1;
  const templateWeight = PLAN_WEIGHTS[templateCategory] || 1;
  return userWeight >= templateWeight;
}

/**
 * Standard Placeholder Constants as required:
 * - Logo: "YOUR LOGO" / "यहाँ आपका लोगो रहेगा"
 * - Location: "LOCATION" / "यहाँ लोकेशन आएगी"
 * - Photo: "YOUR PHOTO" / "यहाँ आपकी फोटो रहेगी"
 * - Headline: "YOUR HEADLINE" / "यहाँ आपकी हेडलाइन आएगी"
 * - CTA: "पूरी खबर डिस्क्रिप्शन में" (Single-line)
 */
export const TEMPLATE_PLACEHOLDERS = {
  logo: {
    en: 'YOUR LOGO',
    hi: 'यहाँ आपका लोगो रहेगा',
  },
  location: {
    en: 'LOCATION',
    hi: 'यहाँ लोकेशन आएगी',
  },
  photo: {
    en: 'YOUR PHOTO',
    hi: 'यहाँ आपकी फोटो रहेगी',
  },
  headline: {
    en: 'YOUR HEADLINE',
    hi: 'यहाँ आपकी हेडलाइन आएगी',
  },
  descriptionCTA: 'पूरी खबर डिस्क्रिप्शन में', // Single-line strictly
  fixedFooterNotice: {
    en: 'FIXED FOOTER',
    hi: 'यह हमेशा समान रहेगा',
  },
} as const;

/**
 * Registered Graphic Templates
 * All old mock templates deleted as instructed.
 * Ready for user to supply Graphic 1, Graphic 2, Graphic 3... sample images.
 */
export const GRAPHIC_TEMPLATES: GraphicTemplateDefinition[] = [
  GRAPHIC_1_DEFINITION,
  GRAPHIC_2_DEFINITION,
  GRAPHIC_3_DEFINITION,
  GRAPHIC_4_DEFINITION,
];

export function registerGraphicTemplate(tpl: GraphicTemplateDefinition): void {
  const idx = GRAPHIC_TEMPLATES.findIndex((t) => t.id === tpl.id || t.graphicNumber === tpl.graphicNumber);
  if (idx >= 0) {
    GRAPHIC_TEMPLATES[idx] = tpl;
  } else {
    GRAPHIC_TEMPLATES.push(tpl);
  }
}

export function clearAllGraphicTemplates(): void {
  GRAPHIC_TEMPLATES.length = 0;
}

/**
 * Helper to fetch a registered graphic template by ID
 */
export function getGraphicTemplate(id: string): GraphicTemplateDefinition | undefined {
  const t = GRAPHIC_TEMPLATES.find((item) => item.id === id);
  if (!t) return undefined;
  const currentPlan = getAdminAssignedPlan(t.id, t.planCategory);
  return { ...t, planCategory: currentPlan };
}

/**
 * Helper to format graphic template ID from number
 */
export function formatGraphicId(num: number): string {
  return `graphic_${String(num).padStart(3, '0')}`;
}

/**
 * Conversion helpers between GraphicPlanCategory and UserPlanTier
 */
export function categoryToPlanTier(cat: GraphicPlanCategory): 'basic' | 'advanced' | 'professional' | 'ultra' {
  switch (cat) {
    case 'BASIC':
      return 'basic';
    case 'ADVANCED':
      return 'advanced';
    case 'PRO':
      return 'professional';
    case 'VIP DESK':
      return 'ultra';
    default:
      return 'basic';
  }
}

export function planTierToCategory(tier: string | null | undefined): GraphicPlanCategory {
  switch (tier?.toLowerCase()) {
    case 'advanced':
      return 'ADVANCED';
    case 'professional':
    case 'pro':
      return 'PRO';
    case 'ultra':
    case 'vip':
    case 'vip desk':
    case 'vip_desk':
      return 'VIP DESK';
    case 'basic':
    default:
      return 'BASIC';
  }
}

const STORAGE_KEY_ADMIN_PLANS = 'admin_template_plans_v1';

/**
 * Reads all admin-assigned template plans from localStorage
 */
export function getAllAdminAssignedPlans(): Record<string, GraphicPlanCategory> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_PLANS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse admin template plans', e);
    return {};
  }
}

/**
 * Get effective plan category for a template (Admin overridden or default)
 */
export function getAdminAssignedPlan(templateId: string, defaultCategory: GraphicPlanCategory): GraphicPlanCategory {
  const map = getAllAdminAssignedPlans();
  return map[templateId] || defaultCategory;
}

/**
 * Save an admin-assigned plan category for a template
 */
export function setAdminAssignedPlan(templateId: string, category: GraphicPlanCategory): void {
  if (typeof window === 'undefined') return;
  try {
    const map = getAllAdminAssignedPlans();
    map[templateId] = category;
    localStorage.setItem(STORAGE_KEY_ADMIN_PLANS, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('template_plans_updated', { detail: { templateId, category } }));
  } catch (e) {
    console.error('Failed to save admin template plan', e);
  }
}

/**
 * Reset all admin-assigned plans to system defaults
 */
export function resetAdminAssignedPlans(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_ADMIN_PLANS);
    window.dispatchEvent(new CustomEvent('template_plans_updated'));
  } catch (e) {
    console.error('Failed to reset admin template plans', e);
  }
}
