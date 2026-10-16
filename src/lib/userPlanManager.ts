// AI News Maker App - User Tier & Plan Management
import { getApiUrl } from './apiConfig';

export type UserPlanTier = 'basic' | 'advanced' | 'professional' | 'ultra';

export type PlanKeyName = 'BASIC' | 'ADVANCE' | 'PRO' | 'VIP DESK';
export const SUPER_ADMIN_EMAILS = [
  'admin.ainewsmaker@gmail.com',
  'breakingnewswala.com@gmail.com',
];

export function isUserSuperAdmin(userOrEmail?: any): boolean {
  if (!userOrEmail) return false;
  if (typeof userOrEmail === 'string') {
    const clean = userOrEmail.replace(/\s+/g, '').toLowerCase().trim();
    return clean === 'superadmin' || clean === 'master_admin_001' || SUPER_ADMIN_EMAILS.includes(clean);
  }
  const email = (userOrEmail.email || '').replace(/\s+/g, '').toLowerCase().trim();
  const username = (userOrEmail.username || '').replace(/\s+/g, '').toLowerCase().trim();
  const uid = (userOrEmail.uid || userOrEmail.userId || '').replace(/\s+/g, '').toLowerCase().trim();
  const role = (userOrEmail.role || '').toLowerCase().trim();
  return role === 'superadmin' || SUPER_ADMIN_EMAILS.includes(email) || username === 'superadmin' || uid === 'master_admin_001';
}


export function isEffectiveSuperAdmin(user?: any): boolean {
  if (!user) {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ai_news_user') || localStorage.getItem('user_profile') || localStorage.getItem('reporter_auth_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          return isUserSuperAdmin(parsed);
        }
      } catch {}
    }
    return false;
  }
  return isUserSuperAdmin(user);
}


export interface UserSubscriptionInfo {
  tier: UserPlanTier;
  planName: PlanKeyName;
  trialStartedAt: number;
  trialEndsAt: number;
  isTrialActive: boolean;
  daysRemaining: number;
  planKey?: PlanKeyName;
  hoursRemaining?: number;
  minutesRemaining?: number;
  hasActivePaidPlan?: boolean;
  isTrialExpired?: boolean;
  isBlocked?: boolean;
  blockedAt?: number | null;
  blockedBy?: string | null;
  isLocked?: boolean;
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
  username?: string;
  role?: 'superadmin' | 'admin' | 'reporter' | 'user';
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
  assignedHeaderUrl?: string;
  assignedFooterUrl?: string;
  assignedCustomActive?: boolean;
  socialIcons?: Record<string, boolean>;
  isBlocked?: boolean;
  blockedAt?: number | null;
  blockedBy?: string | null;
  unblockedAt?: number | null;
  unblockedBy?: string | null;
  createdAt?: number;
  trialStartedAt?: number;
  trialEndsAt?: number;
  isTrialActive?: boolean;
  isTrialExpired?: boolean;
  daysRemaining?: number;
  hoursRemaining?: number;
  minutesRemaining?: number;
  hasActivePaidPlan?: boolean;
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
    
    // Auto-sync to Google Sheet in real time
    import('./googleSheetsUserSync').then(({ syncUsersToGoogleSheet }) => {
      syncUsersToGoogleSheet(updated).catch(() => {});
    }).catch(() => {});
  } catch (e) {
    console.warn('Error saving plan user:', e);
  }
}

export function assignPlanToUserManually(
  userEmail: string,
  tier: UserPlanTier,
  durationDays: number = 30,
  activatedVia: string = 'Admin Manual Assignment'
): void {
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
    activatedVia,
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
export function getUserSubscription(targetEmail?: string): UserSubscriptionInfo {
  if (typeof window === 'undefined') {
    return {
      tier: 'basic',
      planName: 'BASIC',
      trialStartedAt: Date.now(),
      trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      isTrialActive: true,
      daysRemaining: 7,
      isMobileLocked: false,
      isBlocked: false,
    };
  }

  // Resolve current active user email
  const activeEmail = (targetEmail || (() => {
    try {
      const sess = localStorage.getItem('reporter_auth_session');
      if (sess) {
        const u = JSON.parse(sess);
        return u?.email || '';
      }
    } catch {}
    return '';
  })()).toLowerCase().trim();

  const planUsers = getPlanUsers();
  const matchedUser = planUsers.find(u =>
    (activeEmail && u.email && u.email.toLowerCase().trim() === activeEmail) ||
    (activeEmail && u.email && u.email.toLowerCase().replace(/\s+/g, '') === activeEmail.replace(/\s+/g, ''))
  );

  const isBlocked = Boolean(
    matchedUser?.isBlocked ||
    (activeEmail && localStorage.getItem(`user_blocked_${activeEmail}`) === 'true')
  );

  let storedTier = (matchedUser?.tier || localStorage.getItem(STORAGE_KEY_TIER) as UserPlanTier) || 'basic';
  const now = Date.now();

  let startTime = matchedUser?.trialStartedAt || (() => {
    const startStr = localStorage.getItem(STORAGE_KEY_TRIAL_START);
    const parsed = startStr ? parseInt(startStr, 10) : 0;
    return parsed && !isNaN(parsed) ? parsed : (matchedUser?.createdAt || now);
  })();

  const planDetail = getPlanDetail(storedTier);
  let expiresAt = matchedUser?.trialEndsAt || (() => {
    const expiresAtStr = localStorage.getItem('ai_news_maker_plan_expires_at');
    const parsed = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
    return parsed && !isNaN(parsed) ? parsed : (startTime + (planDetail.durationDays || 7) * 24 * 60 * 60 * 1000);
  })();

  const msRemaining = Math.max(0, expiresAt - now);
  const isExpired = msRemaining <= 0;
  const daysRemaining = isExpired ? 0 : Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  const hoursRemaining = isExpired ? 0 : Math.floor((msRemaining % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutesRemaining = isExpired ? 0 : Math.floor((msRemaining % (3600 * 1000)) / (60 * 1000));

  const hasPaidPlan = storedTier !== 'basic';
  const isTrialActive = !isExpired && (storedTier === 'basic' || storedTier === 'ultra');

  const primaryMobile = matchedUser?.mobile || localStorage.getItem(STORAGE_KEY_PRIMARY_MOBILE) || '';
  const isMobileLocked = Boolean(primaryMobile.trim());
  const promoUsed = localStorage.getItem('ai_news_maker_plan_promo_used') || undefined;

  return {
    tier: storedTier,
    planName: matchedUser?.planName || PLAN_KEY_MAP[storedTier] || 'BASIC',
    trialStartedAt: startTime,
    trialEndsAt: expiresAt,
    isTrialActive,
    isTrialExpired: isExpired && storedTier === 'basic',
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    hasActivePaidPlan: hasPaidPlan,
    isBlocked,
    blockedAt: matchedUser?.blockedAt,
    blockedBy: matchedUser?.blockedBy,
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
  if (isUserSuperAdmin(user)) return true;
  const role = (user.role || "").toLowerCase().trim();
  if (role === "admin" || role === "superadmin") return true;
  
  if (typeof window !== "undefined") {
    try {
      const email = (user.email || user.username || "").toLowerCase().trim();
      if (email) {
        const users = getPlanUsers();
        const matched = users.find((u) => u.email.toLowerCase().trim() === email);
        if (matched && (matched.role === "admin" || matched.role === "superadmin")) {
          return true;
        }
      }
    } catch {}
  }
  return false;
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

export function canAccessTemplateManager(currentUser?: any): boolean {
  if (isUserAdmin(currentUser)) return true;
  const sub = getUserSubscription();
  return isTierSufficient(sub.tier, 'professional');
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
    const existingStart = localStorage.getItem(STORAGE_KEY_TRIAL_START);
    const existingExpiry = localStorage.getItem('ai_news_maker_plan_expires_at');
    if (!existingStart || !existingExpiry) {
      const now = Date.now();
      const expiry = now + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY_TIER, 'ultra');
      localStorage.setItem('ai_news_maker_is_trial', 'true');
      localStorage.setItem(STORAGE_KEY_TRIAL_START, now.toString());
      localStorage.setItem('ai_news_maker_plan_expires_at', expiry.toString());
    }
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

export function checkAccountUniqueness(input: {
  channelName?: string;
  username?: string;
  websiteUrl?: string;
  currentEmail?: string;
}): { valid: boolean; error?: string } {
  const cleanEmail = (input.currentEmail || '').trim().toLowerCase();
  const isPrivileged =
    cleanEmail === 'admin.ainewsmaker@gmail.com' ||
    cleanEmail === 'admin@breakingnewswala.com' ||
    cleanEmail === 'breakingnewswala.com@gmail.com' ||
    cleanEmail.includes('admin') ||
    cleanEmail.includes('superadmin') ||
    cleanEmail.includes('breakingnews');

  const cleanChannel = (input.channelName || '').trim().toLowerCase();
  const cleanUsername = (input.username || '').trim().toLowerCase().replace(/^@/, '');

  const reservedNames = ['admin', 'official', 'breakingnewswala', 'ainewsmaker', 'superadmin'];
  if (!isPrivileged && (reservedNames.includes(cleanChannel) || reservedNames.includes(cleanUsername))) {
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
  fullName?: string;
  email: string;
  channelName?: string;
  channelNameHi?: string;
  channelNameEn?: string;
  channelLogoUrl?: string;
  channelLogoPngUrl?: string;
  channelLogoGifUrl?: string;
  channelLogoType?: 'png' | 'gif';
  mobile?: string;
  mobileNumber?: string;
  websiteUrl?: string;
  district?: string;
  socialIcons?: any;
  isLocked?: boolean;
  username?: string;
  tier?: UserPlanTier;
  role?: 'superadmin' | 'admin' | 'reporter' | 'user' | string;
  userId?: string;
  uid?: string;
  profileIncomplete?: boolean;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const users = getPlanUsers();
    const cleanEmail = userData.email.toLowerCase().trim();
    const isSuper = isUserSuperAdmin(cleanEmail);
    const assignedRole = (isSuper ? 'superadmin' : (userData.role || 'user')) as any;
    const idx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    const effectiveName = userData.fullName || userData.name;
    const effectiveMobile = userData.mobile || userData.mobileNumber || '';
    const effectiveChannelName = userData.channelName || userData.channelNameHi || '';

    let updatedRecord: PlanUserRecord;
    const rawUser = userData.username ? userData.username.replace(/^@+/, '').trim() : '';
    const cleanUsername = rawUser
      ? rawUser
      : (effectiveName ? effectiveName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) : `user_${Date.now().toString().slice(-4)}`);

    if (idx >= 0) {
      updatedRecord = {
        ...users[idx],
        email: cleanEmail,
        name: effectiveName || users[idx].name,
        username: rawUser || users[idx].username || cleanUsername,
        role: users[idx].role || assignedRole,
        channelName: effectiveChannelName || users[idx].channelName,
        channelLogoUrl: userData.channelLogoUrl !== undefined ? userData.channelLogoUrl : users[idx].channelLogoUrl,
        mobile: effectiveMobile || users[idx].mobile,
        isProfileLocked: userData.isLocked !== undefined ? userData.isLocked : users[idx].isProfileLocked,
      };
      users[idx] = updatedRecord;
    } else {
      updatedRecord = {
        userId: userData.userId || userData.uid || `user-${Date.now()}`,
        email: cleanEmail,
        name: effectiveName,
        username: cleanUsername,
        role: assignedRole,
        tier: isSuper ? 'ultra' : (userData.tier || 'basic'),
        planName: isSuper ? 'VIP DESK' : 'BASIC',
        channelName: effectiveChannelName,
        channelLogoUrl: userData.channelLogoUrl || '',
        mobile: effectiveMobile,
        isProfileLocked: userData.isLocked !== undefined ? userData.isLocked : true,
        activatedAt: Date.now(),
        expiresAt: Date.now() + (isSuper ? 3650 : 7) * 24 * 60 * 60 * 1000,
        activatedVia: isSuper ? 'Super Admin Preset' : 'Profile Registration',
      };
      users.push(updatedRecord);
    }
    localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(users));
    window.dispatchEvent(new Event('ai_news_plan_users_changed'));

    // Full Payload for Authoritative Backend Sync
    const syncPayload = {
      ...updatedRecord,
      fullName: effectiveName,
      username: updatedRecord.username,
      channelNameHi: effectiveChannelName,
      channelNameEn: userData.channelNameEn || '',
      channelLogoPngUrl: userData.channelLogoPngUrl || (userData.channelLogoType !== 'gif' ? userData.channelLogoUrl : ''),
      channelLogoGifUrl: userData.channelLogoGifUrl || (userData.channelLogoType === 'gif' ? userData.channelLogoUrl : ''),
      channelLogoType: userData.channelLogoType || 'png',
      websiteUrl: userData.websiteUrl || '',
      district: userData.district || '',
      socialIcons: userData.socialIcons,
    };

    fetch(getApiUrl('/api/users/sync'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    }).then(async (res) => {
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.users)) {
          localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(json.users));
          window.dispatchEvent(new Event('ai_news_plan_users_changed'));
        }
      }
    }).catch(() => {});

    // Also register in admin DB endpoint
    fetch(getApiUrl('/api/admin/register-user'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedRecord),
    }).catch(() => {});

    // Sync profile document as well
    fetch(getApiUrl('/api/user-profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncPayload),
    }).catch(() => {});

    import('./googleSheetsUserSync').then(({ syncUsersToGoogleSheet }) => {
      syncUsersToGoogleSheet(users).catch(() => {});
    }).catch(() => {});
  } catch (e) {
    console.warn('Error in registerOrUpdateUser:', e);
  }
}

// Logo Change Requests Management
export interface LogoChangeRequest {
  id: string;
  userEmail: string;
  userName?: string;
  username?: string;
  channelName: string;
  currentLogoUrl?: string;
  newLogoUrl?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  requestType?: 'logo' | 'gif';
  adminNotes?: string;
}

export function getLogoChangeRequests(): LogoChangeRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('logo_change_requests');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export async function fetchLogoChangeRequests(userEmail?: string): Promise<LogoChangeRequest[]> {
  try {
    const url = userEmail
      ? getApiUrl(`/api/logo-change-requests?email=${encodeURIComponent(userEmail.trim())}`)
      : getApiUrl('/api/logo-change-requests');
    const res = await fetch(url, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.requests)) {
        if (typeof window !== 'undefined') {
          // If admin (fetching all), update localStorage
          if (!userEmail) {
            localStorage.setItem('logo_change_requests', JSON.stringify(data.requests));
          } else {
            // Merge into local cache
            const existing = getLogoChangeRequests();
            const merged = [...data.requests, ...existing.filter((e) => !data.requests.some((r: any) => r.id === e.id))];
            localStorage.setItem('logo_change_requests', JSON.stringify(merged));
          }
          window.dispatchEvent(new Event('ai_news_logo_requests_updated'));
        }
        return data.requests;
      }
    }
  } catch (err) {
    console.warn('fetchLogoChangeRequests error:', err);
  }
  return getLogoChangeRequests();
}

export async function submitLogoChangeRequest(
  userEmail: string,
  channelName: string,
  currentLogoUrl: string | undefined,
  reason: string,
  newLogoUrl?: string,
  userName?: string,
  username?: string,
  requestType: 'logo' | 'gif' = 'logo'
): Promise<LogoChangeRequest> {
  const cleanEmail = userEmail.toLowerCase().trim();
  const reqs = getLogoChangeRequests();
  const newReq: LogoChangeRequest = {
    id: `req_${Date.now()}`,
    userEmail: cleanEmail,
    userName,
    username,
    channelName,
    currentLogoUrl,
    newLogoUrl,
    reason: reason.trim(),
    status: 'pending',
    createdAt: Date.now(),
    requestType,
  };

  // Immediate optimistic update to local cache
  const updatedReqs = [newReq, ...reqs.filter((r) => r.id !== newReq.id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem('logo_change_requests', JSON.stringify(updatedReqs));
    window.dispatchEvent(new Event('ai_news_logo_requests_updated'));
  }

  // Authoritative Backend API Sync
  try {
    const res = await fetch(getApiUrl('/api/logo-change-requests'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: cleanEmail,
        channelName,
        currentLogoUrl,
        reason: reason.trim(),
        newLogoUrl,
        userName,
        username,
        requestType,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.request) {
        const serverReq = data.request;
        const finalReqs = [serverReq, ...updatedReqs.filter((r) => r.id !== newReq.id && r.id !== serverReq.id)];
        if (typeof window !== 'undefined') {
          localStorage.setItem('logo_change_requests', JSON.stringify(finalReqs));
          window.dispatchEvent(new Event('ai_news_logo_requests_updated'));
        }
        return serverReq;
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }
  } catch (err: any) {
    console.warn('submitLogoChangeRequest server sync notice:', err.message);
  }

  return newReq;
}

export function getUserLogoChangeRequestStatus(userEmail: string, requestType: 'logo' | 'gif' = 'logo'): 'none' | 'pending' | 'approved' | 'rejected' {
  if (!userEmail) return 'none';
  const reqs = getLogoChangeRequests();
  const clean = userEmail.toLowerCase().trim();
  const userReq = reqs.find((r) => r.userEmail === clean && (r.requestType || 'logo') === requestType);
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

      // When admin approves, sync approved logo or GIF
      if (req.newLogoUrl) {
        try {
          const userProfKey = `user_profile_${cleanEmail}`;
          let prof: any = {};
          const existingRaw = localStorage.getItem(userProfKey);
          if (existingRaw) prof = JSON.parse(existingRaw);

          if (req.requestType === 'gif') {
            prof.channelLogoGifUrl = req.newLogoUrl;
            prof.channelLogoType = 'gif';
          } else {
            prof.channelLogoUrl = req.newLogoUrl;
            prof.channelLogoPngUrl = req.newLogoUrl;
            prof.channelLogoType = 'png';
          }
          localStorage.setItem(userProfKey, JSON.stringify(prof));

          // Also update active session profile if it matches the current user
          const activeProfRaw = localStorage.getItem('user_channel_profile');
          if (activeProfRaw) {
            const activeProf = JSON.parse(activeProfRaw);
            if (req.requestType === 'gif') {
              activeProf.channelLogoGifUrl = req.newLogoUrl;
              activeProf.channelLogoType = 'gif';
            } else {
              activeProf.channelLogoUrl = req.newLogoUrl;
              activeProf.channelLogoPngUrl = req.newLogoUrl;
              activeProf.channelLogoType = 'png';
            }
            localStorage.setItem('user_channel_profile', JSON.stringify(activeProf));
          }
        } catch (e) {
          console.warn('Error applying approved logo/gif:', e);
        }
      }

      try {
        const users = getPlanUsers();
        const u = users.find((x) => x.email.toLowerCase() === cleanEmail);
        if (u) {
          u.isProfileLocked = false;
          localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(users));
        }
      } catch {}

      // Call authoritative backend API
      try {
        fetch(getApiUrl(`/api/logo-change-requests/${encodeURIComponent(requestId)}/approve`), {
          method: 'POST',
        }).catch((err) => console.warn('Backend approveLogoChangeRequest notice:', err));
      } catch {}

      window.dispatchEvent(new Event('channel_profile_updated'));
      window.dispatchEvent(new Event('ai_news_logo_requests_updated'));
      window.dispatchEvent(new Event('ai_news_channel_profile_unlocked'));
      window.dispatchEvent(new Event('ai_news_plan_users_changed'));
    }
  }
}

// Cloud Users Sync & Admin Operations
export async function syncCloudUsers(): Promise<PlanUserRecord[]> {
  try {
    const res = await fetch(getApiUrl('/api/admin/users'));
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(data.users));
        window.dispatchEvent(new Event('ai_news_plan_users_changed'));
        return data.users;
      }
    }
  } catch (err) {
    console.warn('syncCloudUsers error:', err);
  }
  return getPlanUsers();
}

export async function blockUserAuthoritative(
  userEmailOrId: string,
  blockedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/admin/block-user'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: userEmailOrId, userId: userEmailOrId, blockedBy: blockedBy || 'Admin' }),
    });
    const json = await res.json();
    if (json.success) {
      await syncCloudUsers();
      window.dispatchEvent(new Event('ai_news_plan_users_changed'));
      return { success: true };
    }
    return { success: false, error: json.error || 'उपयोगकर्ता को ब्लॉक करने में त्रुटि' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function unblockUserAuthoritative(
  userEmailOrId: string,
  unblockedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/admin/unblock-user'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: userEmailOrId, userId: userEmailOrId, unblockedBy: unblockedBy || 'Admin' }),
    });
    const json = await res.json();
    if (json.success) {
      await syncCloudUsers();
      window.dispatchEvent(new Event('ai_news_plan_users_changed'));
      return { success: true };
    }
    return { success: false, error: json.error || 'उपयोगकर्ता को अनब्लॉक करने में त्रुटि' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adminUpdateCloudUser(
  userId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(getApiUrl('/api/admin/update-user'), {
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
    const res = await fetch(getApiUrl('/api/admin/delete-user'), {
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
    try {
      fetch(getApiUrl(`/api/logo-change-requests/${encodeURIComponent(requestId)}/reject`), {
        method: 'POST',
      }).catch((err) => console.warn('Backend rejectLogoChangeRequest notice:', err));
    } catch {}
  }
}

export function adminDeleteUserRecord(emailOrUserId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const users = getPlanUsers();
    const clean = emailOrUserId.toLowerCase().trim();
    const filtered = users.filter(
      (u) => u.email.toLowerCase().trim() !== clean && u.userId?.toLowerCase().trim() !== clean
    );
    localStorage.setItem(STORAGE_KEY_ASSIGNED_USERS, JSON.stringify(filtered));
    window.dispatchEvent(new Event('ai_news_plan_users_changed'));
    return true;
  } catch (e) {
    console.warn('Error deleting user record:', e);
    return false;
  }
}

export async function fetchAuthoritativeSubscription(email?: string): Promise<UserSubscriptionInfo> {
  const current = getUserSubscription(email);
  if (!email) return current;
  try {
    const res = await fetch(`/api/user-subscription?email=${encodeURIComponent(email)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.subscription) {
        const sub = data.subscription;
        const cleanEmail = email.toLowerCase().trim();
        if (sub.isBlocked) {
          localStorage.setItem(`user_blocked_${cleanEmail}`, 'true');
          window.dispatchEvent(new CustomEvent('user_account_blocked', { detail: sub }));
        } else {
          localStorage.removeItem(`user_blocked_${cleanEmail}`);
        }
        return sub;
      }
    }
  } catch {}
  return current;
}

export function isUserActionAllowed(
  user?: any | null,
  subscription?: UserSubscriptionInfo | null
): { allowed: boolean; reason?: string } {
  if (!user) return { allowed: true };
  if (isUserAdmin(user) || isUserSuperAdmin(user.email || '')) {
    return { allowed: true };
  }
  const sub = subscription || getUserSubscription(user?.email);
  if (sub.isBlocked) {
    return { allowed: false, reason: 'आपका खाता व्यवस्थापक (Admin) द्वारा ब्लॉक कर दिया गया है। सहायता डेस्क से संपर्क करें।' };
  }
  if (sub.tier === 'basic' && (sub.isTrialExpired || (sub.daysRemaining !== undefined && sub.daysRemaining <= 0))) {
    return { allowed: false, reason: 'आपका 7-दिवसीय फ्री ट्रायल समाप्त हो चुका है। कृपया आगे उपयोग के लिए प्लान चुनें।' };
  }
  if (sub.isLocked) {
    return { allowed: false, reason: 'आपका खाता लॉक है।' };
  }
  return { allowed: true };
}
