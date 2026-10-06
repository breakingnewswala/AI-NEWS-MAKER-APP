// AI News Maker App - User Tier & Plan Management

export type UserPlanTier = 'basic' | 'advanced' | 'professional' | 'ultra';

export type PlanKeyName = 'BASIC' | 'ADVANCE' | 'PRO' | 'VIP DESK';

export interface UserSubscriptionInfo {
  tier: UserPlanTier;
  planName: PlanKeyName;
  trialStartedAt: number;
  trialEndsAt: number;
  isTrialActive: boolean;
  daysRemaining: number;
  primaryMobile?: string;
  isMobileLocked: boolean;
  activatedAt?: number;
  expiresAt?: number;
  activatedViaPromoCode?: string;
}

export interface PlanFeatureDetail {
  id: UserPlanTier;
  planKey: PlanKeyName;
  nameHi: string;
  nameEn: string;
  priceDisplay: string;
  priceNum: number;
  durationDays: number;
  validityLabel: string;
  period: string;
  badge?: string;
  tagline: string;
  hasWatermark: boolean;
  features: string[];
  graphicExportResolution: '720p' | '1080p' | '4K';
  maxGraphicsPerDay: number; // 9999 for unlimited
  hasVideoStudio: boolean;
  hasAiTools: boolean;
  hasVipDeskFrames: boolean;
  isActive: boolean;
  popular?: boolean;
}

export const PLAN_KEY_MAP: Record<UserPlanTier, PlanKeyName> = {
  basic: 'BASIC',
  advanced: 'ADVANCE',
  professional: 'PRO',
  ultra: 'VIP DESK',
};

export const DEFAULT_PLAN_DETAILS: PlanFeatureDetail[] = [
  {
    id: 'basic',
    planKey: 'BASIC',
    nameHi: 'बेसिक (BASIC)',
    nameEn: 'BASIC',
    priceDisplay: '₹0',
    priceNum: 0,
    durationDays: 7,
    validityLabel: '7 दिन फ्री ट्रायल',
    period: '7 दिन निःशुल्क',
    badge: 'प्रारंभिक / ट्रायल',
    tagline: '7 दिन का निःशुल्क ट्रायल — सभी बेसिक फीचर्स देखें व बनाएं',
    hasWatermark: true,
    graphicExportResolution: '720p',
    maxGraphicsPerDay: 5,
    hasVideoStudio: false,
    hasAiTools: false,
    hasVipDeskFrames: false,
    isActive: true,
    features: [
      '✅ 7 दिन का पूर्ण फ्री ट्रायल',
      '✅ बेसिक न्यूज़ टेम्पलेट्स व स्टाइल्स',
      '✅ लाइव कार्ड प्रीव्यू व लेआउट कस्टमाइज़ेशन',
      '⚠️ ग्राफिक पर "AI News Maker App" वॉटरमार्क रहेगा',
      '⚠️ सीमित 720p एक्सपोर्ट (5 ग्राफिक प्रतिदिन)',
    ],
  },
  {
    id: 'advanced',
    planKey: 'ADVANCE',
    nameHi: 'एडवांस (ADVANCE)',
    nameEn: 'ADVANCE',
    priceDisplay: '₹499',
    priceNum: 499,
    durationDays: 30,
    validityLabel: '30 दिन (प्रति माह)',
    period: 'प्रति माह',
    badge: 'सबसे लोकप्रिय',
    popular: true,
    tagline: 'वॉटरमार्क रहित फुल एचडी डिजिटल न्यूज़ कार्ड क्रिएटर',
    hasWatermark: false,
    graphicExportResolution: '1080p',
    maxGraphicsPerDay: 25,
    hasVideoStudio: false,
    hasAiTools: true,
    hasVipDeskFrames: false,
    isActive: true,
    features: [
      '🚫 वॉटरमार्क पूरी तरह से हटाया जाएगा (No Watermark)',
      '⚡ 1080p Full HD अल्ट्रा-शार्प डाउनलोड',
      '✨ कस्टम चैनल लोगो, हेडर व वॉटरमार्क नियंत्रण',
      '🤖 ChatGPT (GPT-4o-mini) हेडलाइन व समरी टूल्स',
      '🎨 सभी सोशल मीडिया साइज़ (1:1, 4:5, 9:16, 16:9)',
      '⚡ प्राथमिकता आधारित त्वरित रेंडरिंग (25 ग्राफिक प्रतिदिन)',
    ],
  },
  {
    id: 'professional',
    planKey: 'PRO',
    nameHi: 'प्रो (PRO)',
    nameEn: 'PRO',
    priceDisplay: '₹999',
    priceNum: 999,
    durationDays: 30,
    validityLabel: '30 दिन (प्रति माह)',
    period: 'प्रति माह',
    badge: 'पत्रकार व चैनल चॉइस',
    tagline: 'ग्राफिक + फुल वीडियो डिज़ाइन स्टूडियो (रील्स व टीवी जैकेट)',
    hasWatermark: false,
    graphicExportResolution: '1080p',
    maxGraphicsPerDay: 100,
    hasVideoStudio: true,
    hasAiTools: true,
    hasVipDeskFrames: false,
    isActive: true,
    features: [
      '🚫 100% वॉटरमार्क रहित (No Watermark)',
      '🎬 फुल वीडियो स्टूडियो (9:16 रील्स/शॉर्ट्स व 16:9 टीवी जैकेट)',
      '🔊 लाइव न्यूज़ ब्रेकिंग ऑडियो स्टिंग्स व साउंड इफेक्ट्स',
      '📺 लाइव न्यूज़ टिकर व हेडलाइन स्क्रोलर',
      '📍 विशेष जिला / ब्यूरो डेस्क बैज व प्रेस कार्ड',
      '⚡ एडवांस के सभी फीचर्स शामिल (100 ग्राफिक प्रतिदिन)',
    ],
  },
  {
    id: 'ultra',
    planKey: 'VIP DESK',
    nameHi: 'वीआईपी डेस्क (VIP DESK)',
    nameEn: 'VIP DESK',
    priceDisplay: '₹1,999',
    priceNum: 1999,
    durationDays: 30,
    validityLabel: '30 दिन (प्रति माह)',
    period: 'प्रति माह',
    badge: 'असीमित पावर',
    tagline: 'मल्टी-रिपोर्टर नेटवर्क, 4K एक्सपोर्ट व ऑटो RSS पब्लिशर',
    hasWatermark: false,
    graphicExportResolution: '4K',
    maxGraphicsPerDay: 9999,
    hasVideoStudio: true,
    hasAiTools: true,
    hasVipDeskFrames: true,
    isActive: true,
    features: [
      '🚫 100% वॉटरमार्क रहित (No Watermark)',
      '👑 अनलिमिटेड 4K अल्ट्रा एचडी एक्सपोर्ट',
      '⭐ VIP DESK विशेष प्रीमियम फ्रेम्स (Graphic 4, VIP Jackets)',
      '👥 मल्टी-रिपोर्टर व सब-एडिटर टीम अकाउंट्स',
      '🎯 कस्टम डेडिकेटेड चैनल टेम्पलेट व ग्राफिक सपोर्ट',
      '⭐ 24x7 वीआईपी व्हाट्सएप व फोन सपोर्ट',
    ],
  },
];

export const PLAN_DETAILS: PlanFeatureDetail[] = DEFAULT_PLAN_DETAILS;

// Storage keys
const STORAGE_KEY_TIER = 'ai_news_maker_user_tier';
const STORAGE_KEY_TRIAL_START = 'ai_news_maker_trial_start';
const STORAGE_KEY_PRIMARY_MOBILE = 'user_primary_mobile';
const STORAGE_KEY_PLANS_CONFIG = 'ai_news_maker_plans_catalog_v2';
const STORAGE_KEY_PROMO_CODES = 'ai_news_maker_promo_codes_v2';
const STORAGE_KEY_ASSIGNED_USERS = 'ai_news_maker_plan_users_v2';
const STORAGE_KEY_ADMIN_VIEW_MODE = 'ai_news_maker_admin_system_mode'; // 'admin' | 'test'
const STORAGE_KEY_ADMIN_TEST_PLAN = 'ai_news_maker_admin_test_plan_tier'; // 'basic' | 'advanced' | 'professional' | 'ultra'

// ==========================================
// 1. PLANS CATALOG MANAGEMENT (FOR ADMIN)
// ==========================================
export function getPlansCatalog(): PlanFeatureDetail[] {
  if (typeof window === 'undefined') return DEFAULT_PLAN_DETAILS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PLANS_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= 4) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading plans catalog:', e);
  }
  return DEFAULT_PLAN_DETAILS;
}

export function savePlansCatalog(plans: PlanFeatureDetail[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PLANS_CONFIG, JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent('ai_news_plans_updated'));
  } catch (e) {
    console.warn('Error saving plans catalog:', e);
  }
}

export function getPlanDetail(tier: UserPlanTier): PlanFeatureDetail {
  const catalog = getPlansCatalog();
  return catalog.find((p) => p.id === tier) || DEFAULT_PLAN_DETAILS[0];
}

// ==========================================
// 2. PROMO CODE SYSTEM (SINGLE-USE & PLAN-SPECIFIC)
// ==========================================
export interface PromoCodeItem {
  id: string;
  code: string;
  planId: UserPlanTier;
  planName: PlanKeyName;
  usageType: 'one_time' | 'unlimited';
  status: 'unused' | 'used' | 'expired' | 'disabled';
  usedByEmail?: string;
  usedByMobile?: string;
  usedAt?: number;
  createdAt: number;
  expiresAt?: number;
  durationDays: number;
  isActive: boolean;
  notes?: string;
}

// Default initial sample promo codes for demonstration
const INITIAL_PROMO_CODES: PromoCodeItem[] = [
  {
    id: 'promo-basic-sample',
    code: 'BASIC2026',
    planId: 'basic',
    planName: 'BASIC',
    usageType: 'one_time',
    status: 'unused',
    createdAt: Date.now() - 3600000,
    durationDays: 7,
    isActive: true,
    notes: 'बेसिक सैंपल कोड',
  },
  {
    id: 'promo-adv-sample',
    code: 'ADVANCE2026',
    planId: 'advanced',
    planName: 'ADVANCE',
    usageType: 'one_time',
    status: 'unused',
    createdAt: Date.now() - 3600000,
    durationDays: 30,
    isActive: true,
    notes: 'एडवांस सैंपल कोड',
  },
  {
    id: 'promo-pro-sample',
    code: 'PRO2026',
    planId: 'professional',
    planName: 'PRO',
    usageType: 'one_time',
    status: 'unused',
    createdAt: Date.now() - 3600000,
    durationDays: 30,
    isActive: true,
    notes: 'प्रो सैंपल कोड',
  },
  {
    id: 'promo-vip-sample',
    code: 'VIP2026',
    planId: 'ultra',
    planName: 'VIP DESK',
    usageType: 'one_time',
    status: 'unused',
    createdAt: Date.now() - 3600000,
    durationDays: 30,
    isActive: true,
    notes: 'वीआईपी डेस्क सैंपल कोड',
  },
];

export function getPromoCodes(): PromoCodeItem[] {
  if (typeof window === 'undefined') return INITIAL_PROMO_CODES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PROMO_CODES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading promo codes:', e);
  }
  return INITIAL_PROMO_CODES;
}

export function savePromoCodes(codes: PromoCodeItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROMO_CODES, JSON.stringify(codes));
    window.dispatchEvent(new CustomEvent('ai_news_promo_codes_changed'));
  } catch (e) {
    console.warn('Error saving promo codes:', e);
  }
}

export function createPromoCode(params: {
  code: string;
  planId: UserPlanTier;
  usageType?: 'one_time' | 'unlimited';
  durationDays?: number;
  expiresAt?: number;
  notes?: string;
}): { success: boolean; message: string; promoCode?: PromoCodeItem } {
  const cleanCode = params.code.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanCode || cleanCode.length < 3) {
    return { success: false, message: 'प्रोमो कोड कम से कम 3 अक्षरों का होना चाहिए।' };
  }

  const existingCodes = getPromoCodes();
  if (existingCodes.some((c) => c.code === cleanCode)) {
    return { success: false, message: `प्रोमो कोड "${cleanCode}" पहले से मौजूद है!` };
  }

  const planDetail = getPlanDetail(params.planId);
  const newPromo: PromoCodeItem = {
    id: `promo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: cleanCode,
    planId: params.planId,
    planName: planDetail.planKey,
    usageType: params.usageType || 'one_time',
    status: 'unused',
    createdAt: Date.now(),
    expiresAt: params.expiresAt,
    durationDays: params.durationDays || planDetail.durationDays || 30,
    isActive: true,
    notes: params.notes,
  };

  const updated = [newPromo, ...existingCodes];
  savePromoCodes(updated);
  return { success: true, message: `प्रोमो कोड "${cleanCode}" सफलतापूर्वक बनाया गया!`, promoCode: newPromo };
}

export function deletePromoCode(promoId: string): boolean {
  const existing = getPromoCodes();
  const filtered = existing.filter((c) => c.id !== promoId);
  savePromoCodes(filtered);
  return true;
}

export function togglePromoCodeStatus(promoId: string): boolean {
  const existing = getPromoCodes();
  const updated = existing.map((c) => {
    if (c.id === promoId) {
      const newActive = !c.isActive;
      return {
        ...c,
        isActive: newActive,
        status: !newActive ? ('disabled' as const) : c.usedAt ? ('used' as const) : ('unused' as const),
      };
    }
    return c;
  });
  savePromoCodes(updated);
  return true;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  activatedPlan?: UserPlanTier;
  planName?: PlanKeyName;
}

/**
 * Validates and redeems a promo code for the user:
 * 1. Code exists?
 * 2. Active?
 * 3. Already used? -> "This promo code has already been used."
 * 4. Expired?
 * 5. Activates selected plan and immediately marks code as USED.
 */
export function redeemPromoCode(codeStr: string, userInfo?: any): RedeemResult {
  const cleanCode = codeStr.trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanCode) {
    return { success: false, message: 'कृपया प्रोमो कोड दर्ज करें।' };
  }

  const promoCodes = getPromoCodes();
  const targetIndex = promoCodes.findIndex((c) => c.code === cleanCode);

  if (targetIndex === -1) {
    return { success: false, message: 'अमान्य प्रोमो कोड! यह कोड सिस्टम में मौजूद नहीं है।' };
  }

  const targetCode = promoCodes[targetIndex];

  if (!targetCode.isActive || targetCode.status === 'disabled') {
    return { success: false, message: 'यह प्रोमो कोड वर्तमान में निष्क्रिय (Disabled) है।' };
  }

  if (targetCode.status === 'used' || targetCode.usedAt) {
    return {
      success: false,
      message: 'This promo code has already been used. (यह प्रोमो कोड पहले ही उपयोग किया जा चुका है!)',
    };
  }

  if (targetCode.expiresAt && targetCode.expiresAt < Date.now()) {
    return { success: false, message: 'यह प्रोमो कोड समाप्त (Expired) हो चुका है।' };
  }

  // Activate the linked Plan for the user!
  const userIdentifier = userInfo?.email || userInfo?.username || userInfo?.mobile || 'User';
  const duration = targetCode.durationDays || 30;
  const now = Date.now();
  const expiryTime = now + duration * 24 * 60 * 60 * 1000;

  // Update User Subscription in LocalStorage
  setUserPlanTier(targetCode.planId);
  if (typeof window !== 'undefined') {
    localStorage.setItem('ai_news_maker_plan_activated_at', now.toString());
    localStorage.setItem('ai_news_maker_plan_expires_at', expiryTime.toString());
    localStorage.setItem('ai_news_maker_plan_promo_used', cleanCode);
  }

  // Mark promo code as USED
  const updatedPromo: PromoCodeItem = {
    ...targetCode,
    status: 'used',
    usedByEmail: userIdentifier,
    usedAt: now,
  };

  promoCodes[targetIndex] = updatedPromo;
  savePromoCodes([...promoCodes]);

  // Record in Plan Users list
  recordUserPlanAssignment({
    userId: userInfo?.id || `user-${Date.now()}`,
    email: userIdentifier,
    mobile: userInfo?.mobileNumber || '',
    channelName: userInfo?.channelNameHi || userInfo?.channelNameEn || '',
    tier: targetCode.planId,
    planName: targetCode.planName,
    activatedAt: now,
    expiresAt: expiryTime,
    activatedVia: cleanCode,
  });

  // Dispatch global event for instant UI update across all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('ai_news_user_plan_updated', {
        detail: {
          tier: targetCode.planId,
          planName: targetCode.planName,
          code: cleanCode,
        },
      })
    );
  }

  return {
    success: true,
    message: `Promo Code Applied Successfully! Your ${targetCode.planName} Plan is now active. (${targetCode.planName} प्लान सफलतापूर्वक एक्टिवेट हो गया है)`,
    activatedPlan: targetCode.planId,
    planName: targetCode.planName,
  };
}

// ==========================================
// 3. PLAN USERS TRACKING & MANUAL ASSIGNMENT
// ==========================================
export interface PlanUserRecord {
  userId: string;
  email: string;
  name?: string;

  mobile?: string;
  channelName?: string;
  tier: UserPlanTier;
  planName: PlanKeyName;
  activatedAt: number;
  expiresAt: number;
  activatedVia: string;
  isLocked?: boolean;
  isProfileLocked?: boolean;
  websiteUrl?: string;
  channelLogoUrl?: string;
  socialIcons?: Record<string, boolean>;

}

export function getPlanUsers(): PlanUserRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ASSIGNED_USERS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading plan users:', e);
  }
  return [];
}

export function recordUserPlanAssignment(record: PlanUserRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPlanUsers();
    const filtered = existing.filter((u) => u.email !== record.email);
    const updated = [record, ...filtered];
    localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Error saving plan user:', e);
  }
}

export function assignPlanToUserManually(userEmail: string, tier: UserPlanTier, durationDays: number = 30): void {
  const planDetail = getPlanDetail(tier);
  const now = Date.now();
  const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;
  recordUserPlanAssignment({
    userId: `user-${Date.now()}`,
    email: userEmail.trim(),
    tier,
    planName: planDetail.planKey,
    activatedAt: now,
    expiresAt,
    activatedVia: 'Admin Manual Assignment',
  });
}

export function adminUpdateUserRecord(
  email: string,
  updates: Partial<PlanUserRecord> & { isLocked?: boolean }
): void {
  if (typeof window === 'undefined') return;
  try {
    const users = getPlanUsers();
    const cleanEmail = email.toLowerCase().trim();
    const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (idx >= 0) {
      const current = users[idx];
      const newTier = updates.tier || current.tier;
      const planDetail = getPlanDetail(newTier);
      users[idx] = {
        ...current,
        ...updates,
        tier: newTier,
        planName: planDetail.planKey,
      };
      if (updates.isLocked !== undefined) {
        users[idx].isProfileLocked = updates.isLocked;
        if (updates.isLocked) {
          localStorage.setItem(`channel_profile_locked_${cleanEmail}`, 'true');
        } else {
          localStorage.removeItem(`channel_profile_locked_${cleanEmail}`);
          let unlocked: string[] = [];
          try {
            const raw = localStorage.getItem('unlocked_channel_profiles');
            if (raw) unlocked = JSON.parse(raw);
          } catch {}
          if (!unlocked.includes(cleanEmail)) {
            unlocked.push(cleanEmail);
            localStorage.setItem('unlocked_channel_profiles', JSON.stringify(unlocked));
          }
        }
      }
      localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(users));
      window.dispatchEvent(new Event('ai_news_plan_users_changed'));
    }
  } catch (e) {
    console.warn('Error in adminUpdateUserRecord:', e);
  }
}

export function assignCustomHeaderFooterToUser(
  userEmail: string,
  data: { active: boolean; headerUrl?: string; footerUrl?: string }
): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cleanEmail = userEmail.toLowerCase().trim();
    if (!cleanEmail) return false;
    localStorage.setItem(`user_custom_hf_${cleanEmail}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('custom_header_footer_assigned', { detail: { email: cleanEmail, data } }));
    return true;
  } catch (e) {
    console.warn('Error in assignCustomHeaderFooterToUser:', e);
    return false;
  }
}

// ==========================================
// 4. USER SUBSCRIPTION RETRIEVAL
// ==========================================
export function getUserSubscription(): UserSubscriptionInfo {
  if (typeof window === 'undefined') {
    return {
      tier: 'basic',
      planName: 'BASIC',
      trialStartedAt: Date.now(),
      trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isTrialActive: true,
      daysRemaining: 7,
      isMobileLocked: false,
    };
  }

  let storedTier = (localStorage.getItem(STORAGE_KEY_TIER) as UserPlanTier) || 'basic';
  let startStr = localStorage.getItem(STORAGE_KEY_TRIAL_START);
  let startTime = startStr ? parseInt(startStr, 10) : 0;

  if (!startTime || isNaN(startTime)) {
    startTime = Date.now();
    localStorage.setItem(STORAGE_KEY_TRIAL_START, startTime.toString());
  }

  const planDetail = getPlanDetail(storedTier);
  const expiresAtStr = localStorage.getItem('ai_news_maker_plan_expires_at');
  let expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;

  if (!expiresAt) {
    expiresAt = startTime + (planDetail.durationDays || 7) * 24 * 60 * 60 * 1000;
  }

  const now = Date.now();
  const msRemaining = Math.max(0, expiresAt - now);
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  const isTrialActive = msRemaining > 0 && (localStorage.getItem('ai_news_maker_is_trial') === 'true' || storedTier === 'ultra');

  // If trial has expired, revert to basic or assigned plan as per Rule 33
  if (msRemaining === 0 && localStorage.getItem('ai_news_maker_is_trial') === 'true') {
    storedTier = 'basic';
    localStorage.setItem(STORAGE_KEY_TIER, 'basic');
    localStorage.removeItem('ai_news_maker_is_trial');
  }

  const primaryMobile = localStorage.getItem(STORAGE_KEY_PRIMARY_MOBILE) || '';
  const isMobileLocked = !!primaryMobile.trim();
  const promoUsed = localStorage.getItem('ai_news_maker_plan_promo_used') || undefined;

  return {
    tier: storedTier,
    planName: PLAN_KEY_MAP[storedTier] || 'BASIC',
    trialStartedAt: startTime,
    trialEndsAt: expiresAt,
    isTrialActive,
    daysRemaining,
    primaryMobile: primaryMobile.trim() || undefined,
    isMobileLocked,
    expiresAt,
    activatedViaPromoCode: promoUsed,
  };
}

export function setUserPlanTier(newTier: UserPlanTier): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TIER, newTier);
    window.dispatchEvent(new CustomEvent('ai_news_user_plan_updated', { detail: { tier: newTier } }));
  }
}

// ==========================================
// 5. MODES SYSTEM (SEPARATED ARCHITECTURE)
// Mode != Plan != Promo Code
// MODES:
// - USER MODE (Normal user experience)
// - ADMIN MODE (Complete admin control panel)
// - TEST MODE (Admin only - preview experience of BASIC, ADVANCE, PRO, VIP DESK)
// ==========================================
export type AdminSystemMode = 'admin' | 'test';

export function getAdminSystemMode(): AdminSystemMode {
  if (typeof window === 'undefined') return 'admin';
  const mode = localStorage.getItem(STORAGE_KEY_ADMIN_VIEW_MODE);
  return mode === 'test' ? 'test' : 'admin';
}

export function setAdminSystemMode(mode: AdminSystemMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ADMIN_VIEW_MODE, mode);
    window.dispatchEvent(new CustomEvent('ai_news_admin_view_mode_changed', { detail: mode }));
  }
}

// Backward compatibility aliases
export function getAdminViewAsMode(): 'admin' | 'user' {
  return getAdminSystemMode() === 'test' ? 'user' : 'admin';
}

export function setAdminViewAsMode(mode: 'admin' | 'user'): void {
  setAdminSystemMode(mode === 'user' ? 'test' : 'admin');
}

export function getAdminTestMode(): boolean {
  return getAdminSystemMode() === 'test';
}

export function setAdminTestMode(enabled: boolean): void {
  setAdminSystemMode(enabled ? 'test' : 'admin');
}

// Test Plan Selector (which plan Admin wants to preview in Test Mode)
export function getAdminTestPlanTier(): UserPlanTier {
  if (typeof window === 'undefined') return 'basic';
  const tier = (localStorage.getItem(STORAGE_KEY_ADMIN_TEST_PLAN) as UserPlanTier) || 'basic';
  return ['basic', 'advanced', 'professional', 'ultra'].includes(tier) ? tier : 'basic';
}

export function setAdminTestPlanTier(tier: UserPlanTier): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_ADMIN_TEST_PLAN, tier);
    window.dispatchEvent(new CustomEvent('ai_news_admin_test_plan_changed', { detail: tier }));
  }
}

/**
 * Returns the effective tier that governs feature permissions and UI behavior:
 * - If Admin is in TEST MODE: returns the selected test plan (BASIC, ADVANCE, PRO, VIP DESK).
 * - Otherwise: returns the user's actual subscription tier.
 */
export function getEffectiveUserTier(currentUser?: any): UserPlanTier {
  const isAdmin = isUserAdmin(currentUser);
  if (isAdmin && getAdminSystemMode() === 'test') {
    return getAdminTestPlanTier();
  }
  return getUserSubscription().tier;
}

export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  const email = (user.email || user.username || '').toLowerCase();
  const role = (user.role || '').toLowerCase();
  return (
    role === 'admin' ||
    email === 'admin' ||
    email === 'breakingnewswala.com@gmail.com' ||
    email.includes('admin') ||
    email.includes('editor')
  );
}

/**
 * Returns true only if the user is an authenticated Admin AND currently in ADMIN MODE.
 * If in TEST MODE, this returns false so the admin experiences the exact constraints of the tested plan.
 */
export function isEffectiveAdmin(user: any): boolean {
  if (!isUserAdmin(user)) return false;
  return getAdminSystemMode() === 'admin';
}

// Watermark check: Basic tier has watermark
export function shouldShowAppWatermark(currentUser?: any): boolean {
  const effectiveTier = getEffectiveUserTier(currentUser);
  return effectiveTier === 'basic';
}

export const TIER_LEVELS: Record<UserPlanTier, number> = {
  basic: 1,
  advanced: 2,
  professional: 3,
  ultra: 4,
};

export function isTierSufficient(userTier: UserPlanTier, requiredTier?: UserPlanTier): boolean {
  if (!requiredTier || requiredTier === 'basic') return true;
  const userLevel = TIER_LEVELS[userTier] || 1;
  const reqLevel = TIER_LEVELS[requiredTier] || 1;
  return userLevel >= reqLevel;
}

// Lock Primary Mobile Number (Permanent, non-editable)
export function savePrimaryMobileNumber(phone: string): boolean {
  if (typeof window === 'undefined') return false;
  const existing = localStorage.getItem(STORAGE_KEY_PRIMARY_MOBILE);
  if (existing && existing.trim()) {
    return false;
  }
  const clean = phone.trim().replace(/[^0-9]/g, '');
  if (clean.length >= 10) {
    localStorage.setItem(STORAGE_KEY_PRIMARY_MOBILE, clean);
    return true;
  }
  return false;
}

// Activate 7-Day Free Trial (Trial Plan = VIP DESK as per MASTER SPECIFICATION Rule 32)
export function activateFreeTrial(): UserSubscriptionInfo {
  if (typeof window !== 'undefined') {
    const now = Date.now();
    const expiry = now + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY_TIER, 'ultra');
    localStorage.setItem('ai_news_maker_is_trial', 'true');
    localStorage.setItem(STORAGE_KEY_TRIAL_START, now.toString());
    localStorage.setItem('ai_news_maker_plan_expires_at', expiry.toString());
  }
  return getUserSubscription();
}

export interface CustomHeaderFooterAssignment {
  active: boolean;
  headerUrl?: string;
  footerUrl?: string;
}

export function getAssignedCustomHeaderFooter(userEmail?: string): CustomHeaderFooterAssignment | null {
  if (typeof window === 'undefined') return null;
  try {
    const email = userEmail || (() => {
      try {
        const saved = localStorage.getItem('reporter_auth_session');
        if (saved) {
          const user = JSON.parse(saved);
          return user?.email || '';
        }
      } catch {}
      return '';
    })();

    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      const saved = localStorage.getItem(`user_custom_hf_${cleanEmail}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    }

    const globalSaved = localStorage.getItem('global_custom_header_footer');
    if (globalSaved) {
      const parsedGlobal = JSON.parse(globalSaved);
      if (parsedGlobal && typeof parsedGlobal === 'object') {
        return parsedGlobal;
      }
    }
  } catch {}
  return null;
}

// Channel Profile Lock Check
export function isChannelProfileLocked(user?: any): boolean {
  if (typeof window === 'undefined') return false;
  if (!user) return false;
  if (isEffectiveAdmin(user)) return false;
  try {
    const userEmail = (user.email || '').toLowerCase().trim();
    if (!userEmail) return false;

    // Check if user is in unlocked list
    const unlockedListRaw = localStorage.getItem('unlocked_channel_profiles');
    if (unlockedListRaw) {
      const unlockedList = JSON.parse(unlockedListRaw);
      if (Array.isArray(unlockedList) && unlockedList.includes(userEmail)) {
        return false;
      }
    }

    const explicitLock = localStorage.getItem(`channel_profile_locked_${userEmail}`);
    if (explicitLock === 'true') return true;
    if (explicitLock === 'false') return false;

    const generalLock = localStorage.getItem('is_channel_profile_locked');
    if (generalLock === 'true') return true;

    const savedProfile = localStorage.getItem('user_channel_profile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      if (profile && (profile.channelLogoUrl || profile.channelNameHi)) {
        return true;
      }
    }
  } catch {}
  return false;
}

// Account Uniqueness Validation
export interface AccountUniquenessInput {
  username?: string;
  websiteUrl?: string;
  channelName?: string;
  currentEmail?: string;
}

export function checkAccountUniqueness(input: AccountUniquenessInput): { valid: boolean; error?: string } {
  const cleanChannel = (input.channelName || '').trim().toLowerCase();
  const cleanUsername = (input.username || '').trim().toLowerCase().replace(/^@/, '');

  const reservedNames = ['admin', 'official', 'breakingnewswala', 'ainewsmaker', 'superadmin'];
  if (reservedNames.includes(cleanChannel) || reservedNames.includes(cleanUsername)) {
    return { valid: false, error: 'यह नाम सिस्टम द्वारा आरक्षित है।' };
  }

  try {
    const users = getPlanUsers();
    for (const u of users) {
      if (input.currentEmail && u.email.toLowerCase() === input.currentEmail.toLowerCase()) {
        continue;
      }
      if (cleanChannel && u.channelName && u.channelName.toLowerCase() === cleanChannel) {
        return { valid: false, error: 'यह चैनल नाम किसी अन्य सदस्य द्वारा पहले से पंजीकृत है।' };
      }
    }
  } catch {}

  return { valid: true };
}

// Register or Update User
export function registerOrUpdateUser(userData: {
  name: string;
  email: string;
  channelName?: string;
  channelLogoUrl?: string;
  mobile?: string;
  isLocked?: boolean;
  username?: string;
  tier?: UserPlanTier;
  role?: string;

}): void {
  if (typeof window === 'undefined') return;
  try {
    const users = getPlanUsers();
    const cleanEmail = userData.email.toLowerCase().trim();
    const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        email: cleanEmail,
        name: userData.name || users[idx].name,
        channelName: userData.channelName || users[idx].channelName,
        channelLogoUrl: userData.channelLogoUrl || users[idx].channelLogoUrl,
        mobile: userData.mobile || users[idx].mobile,
        isProfileLocked: userData.isLocked !== undefined ? userData.isLocked : users[idx].isProfileLocked,
      };
    } else {
      users.push({
        userId: `user-${Date.now()}`,
        email: cleanEmail,
        name: userData.name,
        tier: 'basic',
        planName: 'BASIC',
        channelName: userData.channelName,
        channelLogoUrl: userData.channelLogoUrl,
        mobile: userData.mobile,
        isProfileLocked: userData.isLocked !== undefined ? userData.isLocked : true,
        activatedAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        activatedVia: 'Profile Registration',
      });
    }
    localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(users));
    window.dispatchEvent(new Event('ai_news_plan_users_changed'));
  } catch (e) {
    console.warn('Error in registerOrUpdateUser:', e);
  }
}

// Logo Change Requests Management
export interface LogoChangeRequest {
  id: string;
  userEmail: string;
  channelName: string;
  currentLogoUrl?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export function getLogoChangeRequests(): LogoChangeRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('logo_change_requests');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function submitLogoChangeRequest(
  userEmail: string,
  channelName: string,
  currentLogoUrl: string | undefined,
  reason: string
): LogoChangeRequest {
  const reqs = getLogoChangeRequests();
  const newReq: LogoChangeRequest = {
    id: `req_${Date.now()}`,
    userEmail: userEmail.toLowerCase().trim(),
    channelName,
    currentLogoUrl,
    reason,
    status: 'pending',
    createdAt: Date.now(),
  };
  reqs.unshift(newReq);
  if (typeof window !== 'undefined') {
    localStorage.setItem('logo_change_requests', JSON.stringify(reqs));
    window.dispatchEvent(new Event('ai_news_logo_requests_updated'));
  }
  return newReq;
}

export function getUserLogoChangeRequestStatus(userEmail: string): 'none' | 'pending' | 'approved' | 'rejected' {
  if (!userEmail) return 'none';
  const reqs = getLogoChangeRequests();
  const clean = userEmail.toLowerCase().trim();
  const userReq = reqs.find((r) => r.userEmail === clean);
  return userReq ? userReq.status : 'none';
}

export function approveLogoChangeRequest(requestId: string): void {
  const reqs = getLogoChangeRequests();
  const req = reqs.find((r) => r.id === requestId);
  if (req) {
    req.status = 'approved';
    if (typeof window !== 'undefined') {
      localStorage.setItem('logo_change_requests', JSON.stringify(reqs));

      const cleanEmail = req.userEmail.toLowerCase().trim();
      localStorage.removeItem(`channel_profile_locked_${cleanEmail}`);
      localStorage.removeItem('is_channel_profile_locked');

      let unlocked: string[] = [];
      try {
        const raw = localStorage.getItem('unlocked_channel_profiles');
        if (raw) unlocked = JSON.parse(raw);
      } catch {}
      if (!unlocked.includes(cleanEmail)) {
        unlocked.push(cleanEmail);
        localStorage.setItem('unlocked_channel_profiles', JSON.stringify(unlocked));
      }

      try {
        const users = getPlanUsers();
        const u = users.find((x) => x.email.toLowerCase() === cleanEmail);
        if (u) {
          u.isProfileLocked = false;
          localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(users));
        }
      } catch {}

      window.dispatchEvent(new Event('ai_news_logo_requests_updated'));
      window.dispatchEvent(new Event('ai_news_channel_profile_unlocked'));
      window.dispatchEvent(new Event('ai_news_plan_users_changed'));
    }
  }
}

// Cloud Users Sync & Admin Operations
export async function syncCloudUsers(): Promise<PlanUserRecord[]> {
  try {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(data.users));
        return data.users;
      }
    }
  } catch {}
  return getPlanUsers();
}

export async function adminUpdateCloudUser(
  userId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates }),
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch {}
  adminUpdateUserRecord(userId, updates);
  return { success: true };
}

export async function adminDeleteCloudUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return { success: true };
}

export function rejectLogoChangeRequest(requestId: string): void {
  const reqs = getLogoChangeRequests();
  const req = reqs.find((r) => r.id === requestId);
  if (req) {
    req.status = 'rejected';
    if (typeof window !== 'undefined') {
      localStorage.setItem('logo_change_requests', JSON.stringify(reqs));
      window.dispatchEvent(new Event('ai_news_logo_requests_updated'));
    }
  }
}


