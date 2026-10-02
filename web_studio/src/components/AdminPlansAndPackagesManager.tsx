import React, { useState, useEffect } from 'react';
import {
  Package,
  Ticket,
  Users,
  Plus,
  Copy,
  Check,
  Trash2,
  Power,
  Search,
  Sparkles,
  ShieldCheck,
  Crown,
  Zap,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit2,
  Save,
  X,
  CreditCard,
  Lock,
  Unlock,
  Layers,
  Upload,
  Globe,
  Phone,
  Image,
  Sliders,
  Rss,
  Link2,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  Key,
  Send,
  Hash,
  ChevronDown,
  FolderTree,
  PlusCircle,
} from 'lucide-react';
import {
  syncCloudUsers,
  adminUpdateCloudUser,
  adminDeleteCloudUser,
  UserPlanTier,
  PlanKeyName,
  PlanFeatureDetail,
  PromoCodeItem,
  PlanUserRecord,
  getPlansCatalog,
  savePlansCatalog,
  getPromoCodes,
  createPromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  getPlanUsers,
  assignPlanToUserManually,
  adminUpdateUserRecord,
  assignCustomHeaderFooterToUser,
  PLAN_KEY_MAP,
  LogoChangeRequest,
  getLogoChangeRequests,
  approveLogoChangeRequest,
  rejectLogoChangeRequest,
} from '../lib/userPlanManager';
import {
  AdminRssSource,
  getAdminRssSources,
  addAdminRssSource,
  toggleAdminRssSource,
  deleteAdminRssSource,
  syncAllSourcesLive,
} from '../lib/rssSourceManager';
import { AdminTemplatePlanManager } from './AdminTemplatePlanManager';
import {
  RestrictedChannel,
  getRestrictedChannels,
  addRestrictedChannel,
  deleteRestrictedChannel,
} from '../lib/restrictedChannelsManager';
interface AdminPlansAndPackagesManagerProps {
  currentUser?: any;
  onPlanChanged?: () => void;
  onOpenStudio?: () => void;
  renderProfileContent?: () => React.ReactNode;
  categories?: any[];
  onAddCategory?: (category: any) => void;
  onDeleteCategory?: (id: string) => void;
}

export const AdminPlansAndPackagesManager: React.FC<AdminPlansAndPackagesManagerProps> = ({
  currentUser,
  onPlanChanged,
  onOpenStudio,
  renderProfileContent,
  categories,
  onAddCategory,
  onDeleteCategory,
}) => {
  // Sub-tabs: 'plans', 'promocodes', 'users', 'rss', 'restricted'
  const [subTab, setSubTab] = useState<'profile' | 'plans' | 'templates' | 'promocodes' | 'users' | 'rss' | 'web' | 'restricted' | ''>('plans');

  // Restricted Channels Management State
  const [restrictedList, setRestrictedList] = useState<RestrictedChannel[]>(() => getRestrictedChannels());
  const [restrictedSearch, setRestrictedSearch] = useState<string>('');
  const [newRestrictedName, setNewRestrictedName] = useState<string>('');
  const [newRestrictedWebsite, setNewRestrictedWebsite] = useState<string>('');
  const [newRestrictedUsername, setNewRestrictedUsername] = useState<string>('');
  const [newRestrictedLogo, setNewRestrictedLogo] = useState<string>('');
  const [newRestrictedReason, setNewRestrictedReason] = useState<string>('');
  const [restrictedMsg, setRestrictedMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cloud user sync on mount
  useEffect(() => {
    syncCloudUsers().then((synced) => {
      if (Array.isArray(synced) && synced.length > 0) {
        setPlanUsers(synced);
      }
    });
  }, []);

  // Edit User State
  const [editingUser, setEditingUser] = useState<PlanUserRecord | null>(null);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editFullName, setEditFullName] = useState<string>('');
  const [editMobile, setEditMobile] = useState<string>('');
  const [editChannelName, setEditChannelName] = useState<string>('');
  const [editTier, setEditTier] = useState<UserPlanTier>('basic');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editIsLocked, setEditIsLocked] = useState<boolean>(true);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [editUserMsg, setEditUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEditUser = (u: PlanUserRecord) => {
    setEditingUser(u);
    setEditUsername(u.userId || u.email.split('@')[0]);
    setEditFullName(u.name || '');
    setEditMobile(u.mobile || '');
    setEditChannelName(u.channelName || '');
    setEditTier(u.tier || 'basic');
    setEditStatus((u as any).status || 'active');
    setEditIsLocked(u.isLocked !== undefined ? u.isLocked : true);
    setEditUserMsg(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    setEditUserMsg(null);
    try {
      const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!cleanUsername) {
        setEditUserMsg({ type: 'error', text: 'कृपया वैध यूज़रनेम दर्ज करें।' });
        setIsSavingUser(false);
        return;
      }
      const res = await adminUpdateCloudUser(editingUser.userId || editingUser.email, {
        username: cleanUsername,
        name: editFullName.trim(),
        mobile: editMobile.trim(),
        channelName: editChannelName.trim(),
        tier: editTier,
        isLocked: editIsLocked,
        status: editStatus,
      } as any);

      if (!res.success && res.error) {
        setEditUserMsg({ type: 'error', text: res.error });
        setIsSavingUser(false);
        return;
      }

      const refreshed = await syncCloudUsers();
      setPlanUsers(refreshed);
      setEditUserMsg({ type: 'success', text: 'यूज़र ' + cleanUsername + ' का डेटा सफलतापूर्वक अपडेट हो गया!' });
      setTimeout(() => {
        setEditingUser(null);
      }, 1200);
    } catch (err: any) {
      setEditUserMsg({ type: 'error', text: err.message || 'यूज़र अपडेट करने में त्रुटि हुई' });
    } finally {
      setIsSavingUser(false);
    }
  };

  // RSS Categories State
  const [rssCategories, setRssCategories] = useState<string[]>(() => {
    const defaults = ['देश / राष्ट्रीय', 'मध्य प्रदेश', 'उत्तर प्रदेश', 'बिहार', 'राजस्थान', 'विदेश', 'व्यापार', 'खेल', 'मनोरंजन'];
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('ai_news_rss_categories_list');
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return defaults;
    }
  });
  const [newRssCatInput, setNewRssCatInput] = useState<string>('');

  const handleAddRssCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newRssCatInput.trim();
    if (!cat) return;
    if (!rssCategories.includes(cat)) {
      const updated = [...rssCategories, cat];
      setRssCategories(updated);
      localStorage.setItem('ai_news_rss_categories_list', JSON.stringify(updated));
      if (onAddCategory) onAddCategory(cat);
    }
    setNewRssCatInput('');
  };

  const handleDeleteRssCategory = (catToDelete: string) => {
    if (rssCategories.length <= 1) return;
    const updated = rssCategories.filter(c => c !== catToDelete);
    setRssCategories(updated);
    localStorage.setItem('ai_news_rss_categories_list', JSON.stringify(updated));
  };

  // Web Categories State
  const [webCategories, setWebCategories] = useState<string[]>(() => {
    const defaults = ['देश / राष्ट्रीय', 'राज्य समाचार', 'व्यापार', 'टेक्नोलॉजी', 'खेल', 'विशेष रिपोर्ट'];
    if (typeof window === 'undefined') return defaults;
    try {
      const saved = localStorage.getItem('ai_news_web_categories_list');
      return saved ? JSON.parse(saved) : defaults;
    } catch {
      return defaults;
    }
  });
  const [newWebCatInput, setNewWebCatInput] = useState<string>('');

  const handleAddWebCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newWebCatInput.trim();
    if (!cat) return;
    if (!webCategories.includes(cat)) {
      const updated = [...webCategories, cat];
      setWebCategories(updated);
      localStorage.setItem('ai_news_web_categories_list', JSON.stringify(updated));
      if (onAddCategory) onAddCategory(cat);
    }
    setNewWebCatInput('');
  };

  const handleDeleteWebCategory = (catToDelete: string) => {
    if (webCategories.length <= 1) return;
    const updated = webCategories.filter(c => c !== catToDelete);
    setWebCategories(updated);
    localStorage.setItem('ai_news_web_categories_list', JSON.stringify(updated));
  };

  // Logo Change Requests State
  const [logoRequests, setLogoRequests] = useState<LogoChangeRequest[]>(() => getLogoChangeRequests());
  const [logoReqMsg, setLogoReqMsg] = useState<string>('');

  // RSS & Web Link Sources State
  const [rssSources, setRssSources] = useState<AdminRssSource[]>(() => getAdminRssSources());
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newSourceType, setNewSourceType] = useState<'rss' | 'web'>('rss');
  const [newSourceCategory, setNewSourceCategory] = useState<string>('देश');
  const [rssMsg, setRssMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncingRss, setIsSyncingRss] = useState<boolean>(false);

  // Plans Catalog State
  const [plans, setPlans] = useState<PlanFeatureDetail[]>(() => getPlansCatalog());
  const [editingPlanId, setEditingPlanId] = useState<UserPlanTier | null>(null);
  const [editPriceNum, setEditPriceNum] = useState<number>(0);
  const [editDurationDays, setEditDurationDays] = useState<number>(30);
  const [editMaxGraphics, setEditMaxGraphics] = useState<number>(25);
  const [planSaveSuccess, setPlanSaveSuccess] = useState<string>('');

  // Promo Codes State
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>(() => getPromoCodes());
  const [newPromoPlan, setNewPromoPlan] = useState<UserPlanTier>('professional');
  const [newPromoCodeStr, setNewPromoCodeStr] = useState<string>('');
  const [newPromoUsageType, setNewPromoUsageType] = useState<'one_time' | 'unlimited'>('one_time');
  const [newPromoDurationDays, setNewPromoDurationDays] = useState<number>(30);
  const [newPromoNotes, setNewPromoNotes] = useState<string>('');
  const [promoMsg, setPromoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Search & Filters for Promo Codes
  const [promoSearch, setPromoSearch] = useState<string>('');
  const [promoPlanFilter, setPromoPlanFilter] = useState<string>('all');
  const [promoStatusFilter, setPromoStatusFilter] = useState<string>('all');

  // Plan Users State
  const [planUsers, setPlanUsers] = useState<PlanUserRecord[]>(() => getPlanUsers());
  const [manualUserEmail, setManualUserEmail] = useState<string>('');
  const [manualUserTier, setManualUserTier] = useState<UserPlanTier>('professional');
  const [manualDuration, setManualDuration] = useState<number>(30);
  const [manualAssignMsg, setManualAssignMsg] = useState<string>('');

  const [userSearch, setUserSearch] = useState<string>('');

  // Custom Header & Footer Assignment State (PRO & VIP DESK)
  const [assignUserEmail, setAssignUserEmail] = useState<string>('');
  const [assignHeaderUrl, setAssignHeaderUrl] = useState<string>('');
  const [assignFooterUrl, setAssignFooterUrl] = useState<string>('');
  const [assignCustomActive, setAssignCustomActive] = useState<boolean>(true);
  const [assignCustomMsg, setAssignCustomMsg] = useState<string>('');

  // Editing branding modal for a specific user
  const [editingBrandingUser, setEditingBrandingUser] = useState<PlanUserRecord | null>(null);
  const [editBrandNameHi, setEditBrandNameHi] = useState<string>('');
  const [editBrandNameEn, setEditBrandNameEn] = useState<string>('');
  const [editBrandWebsite, setEditBrandWebsite] = useState<string>('');
  const [editBrandMobile, setEditBrandMobile] = useState<string>('');
  const [editBrandLogoUrl, setEditBrandLogoUrl] = useState<string>('');
  const [editBrandSocials, setEditBrandSocials] = useState<Record<string, boolean>>({
    youtube: true,
    facebook: true,
    instagram: true,
    twitter: false,
    telegram: false,
    whatsapp: true,
  });
  const [editBrandMsg, setEditBrandMsg] = useState<string>('');

  // Reload data on events
  useEffect(() => {
    const handlePlansUpdated = () => setPlans(getPlansCatalog());
    const handlePromoUpdated = () => setPromoCodes(getPromoCodes());
    const handleUsersUpdated = () => setPlanUsers(getPlanUsers());
    window.addEventListener('ai_news_plans_updated', handlePlansUpdated);
    window.addEventListener('ai_news_promo_codes_changed', handlePromoUpdated);
    window.addEventListener('ai_news_plan_users_changed', handleUsersUpdated);
    return () => {
      window.removeEventListener('ai_news_plans_updated', handlePlansUpdated);
      window.removeEventListener('ai_news_promo_codes_changed', handlePromoUpdated);
      window.removeEventListener('ai_news_plan_users_changed', handleUsersUpdated);
    };
  }, []);

  // Quick Auto-Generator for unique promo code string
  const handleAutoGenerateCode = (tier: UserPlanTier) => {
    const prefixMap: Record<UserPlanTier, string> = {
      basic: 'BASIC',
      advanced: 'ADV',
      professional: 'PRO',
      ultra: 'VIP',
    };
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    const generated = `${prefixMap[tier]}-${year}-${randomSuffix}`;
    setNewPromoCodeStr(generated);
  };

  // Create Promo Code
  const handleCreatePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoMsg(null);

    let codeToUse = newPromoCodeStr.trim().toUpperCase();
    if (!codeToUse) {
      handleAutoGenerateCode(newPromoPlan);
      const prefixMap: Record<UserPlanTier, string> = {
        basic: 'BASIC',
        advanced: 'ADV',
        professional: 'PRO',
        ultra: 'VIP',
      };
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      codeToUse = `${prefixMap[newPromoPlan]}-${new Date().getFullYear()}-${randomSuffix}`;
    }

    const res = createPromoCode({
      code: codeToUse,
      planId: newPromoPlan,
      usageType: newPromoUsageType,
      durationDays: newPromoDurationDays,
      notes: newPromoNotes.trim() || undefined,
    });

    if (res.success) {
      setPromoCodes(getPromoCodes());
      setNewPromoCodeStr('');
      setNewPromoNotes('');
      setPromoMsg({ type: 'success', text: res.message });
      setTimeout(() => setPromoMsg(null), 5000);
    } else {
      setPromoMsg({ type: 'error', text: res.message });
    }
  };

  // Delete Promo Code
  const handleDeleteCode = (id: string, code: string) => {
    if (confirm(`क्या आप प्रोमो कोड "${code}" को हटाना चाहते हैं?`)) {
      deletePromoCode(id);
      setPromoCodes(getPromoCodes());
    }
  };

  // Toggle Active/Disabled for Promo Code
  const handleToggleCode = (id: string) => {
    togglePromoCodeStatus(id);
    setPromoCodes(getPromoCodes());
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Start editing a plan
  const handleStartEditPlan = (plan: PlanFeatureDetail) => {
    setEditingPlanId(plan.id);
    setEditPriceNum(plan.priceNum);
    setEditDurationDays(plan.durationDays);
    setEditMaxGraphics(plan.maxGraphicsPerDay);
  };

  // Save edited plan
  const handleSavePlan = (planId: UserPlanTier) => {
    const updated = plans.map((p) => {
      if (p.id === planId) {
        return {
          ...p,
          priceNum: editPriceNum,
          priceDisplay: editPriceNum === 0 ? '₹0' : `₹${editPriceNum.toLocaleString('en-IN')}`,
          durationDays: editDurationDays,
          validityLabel: `${editDurationDays} दिन`,
          maxGraphicsPerDay: editMaxGraphics,
        };
      }
      return p;
    });
    setPlans(updated);
    savePlansCatalog(updated);
    setEditingPlanId(null);
    setPlanSaveSuccess(`✅ ${PLAN_KEY_MAP[planId]} प्लान की जानकारी सफलतापूर्वक अपडेट हो गई!`);
    setTimeout(() => setPlanSaveSuccess(''), 4000);
    if (onPlanChanged) onPlanChanged();
  };

  // Toggle Plan Active / Inactive
  const handleTogglePlanActive = (planId: UserPlanTier) => {
    const updated = plans.map((p) => (p.id === planId ? { ...p, isActive: !p.isActive } : p));
    setPlans(updated);
    savePlansCatalog(updated);
    if (onPlanChanged) onPlanChanged();
  };

  // Manual User Assignment
  const handleManualUserAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUserEmail.trim()) return;
    assignPlanToUserManually(manualUserEmail.trim(), manualUserTier, manualDuration);
    setPlanUsers(getPlanUsers());
    setManualAssignMsg(`✅ ${manualUserEmail.trim()} को ${PLAN_KEY_MAP[manualUserTier]} प्लान (${manualDuration} दिन) असाइन कर दिया गया!`);
    setManualUserEmail('');
    setTimeout(() => setManualAssignMsg(''), 5000);
  };

  // Select User for Custom Header / Footer
  const handleSelectUserForCustomHF = (email: string) => {
    setAssignUserEmail(email);
    setAssignCustomMsg('');
    const user = planUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setAssignHeaderUrl(user.assignedHeaderUrl || '');
      setAssignFooterUrl(user.assignedFooterUrl || '');
      setAssignCustomActive(user.assignedCustomActive !== undefined ? user.assignedCustomActive : true);
    } else {
      setAssignHeaderUrl('');
      setAssignFooterUrl('');
      setAssignCustomActive(true);
    }
  };

  // Custom Header/Footer assignment submit
  const handleAssignCustomHeaderFooter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserEmail.trim()) {
      setAssignCustomMsg('❌ कृपया सूची से यूज़र चुनें!');
      return;
    }
    const success = assignCustomHeaderFooterToUser(assignUserEmail.trim(), {
      headerUrl: assignHeaderUrl.trim(),
      footerUrl: assignFooterUrl.trim(),
      active: assignCustomActive,
    });
    if (success) {
      setPlanUsers(getPlanUsers());
      setAssignCustomMsg(`✅ ${assignUserEmail.trim()} के लिए Custom Header/Footer सफलतापूर्वक असाइन व अपडेट हो गया!`);
      setTimeout(() => setAssignCustomMsg(''), 5000);
    } else {
      setAssignCustomMsg('❌ यूज़र रिकॉर्ड नहीं मिला!');
    }
  };

  // Handle image upload to DataURL for header/footer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'header' | 'footer' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'header') setAssignHeaderUrl(dataUrl);
      else if (target === 'footer') setAssignFooterUrl(dataUrl);
      else if (target === 'logo') setEditBrandLogoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Branding Editor Handlers
  const handleOpenBrandingEditor = (user: PlanUserRecord) => {
    setEditingBrandingUser(user);
    setEditBrandNameHi(user.channelName || '');
    setEditBrandNameEn(user.channelName || '');
    setEditBrandWebsite(user.websiteUrl || '');
    setEditBrandMobile(user.mobile || '');
    setEditBrandLogoUrl(user.channelLogoUrl || '');
    setEditBrandSocials(
      user.socialIcons || {
        youtube: true,
        facebook: true,
        instagram: true,
        twitter: false,
        telegram: false,
        whatsapp: true,
      }
    );
    setEditBrandMsg('');
  };

  const handleSaveUserBranding = () => {
    if (!editingBrandingUser) return;
    adminUpdateUserRecord(editingBrandingUser.email, {
      channelName: editBrandNameHi || editBrandNameEn,
      websiteUrl: editBrandWebsite,
      mobile: editBrandMobile,
      channelLogoUrl: editBrandLogoUrl,
      socialIcons: editBrandSocials,
    });
    setPlanUsers(getPlanUsers());
    setEditBrandMsg('✅ यूज़र ब्रांडिंग विवरण सफलतापूर्वक सुरक्षित हो गया!');
    setTimeout(() => {
      setEditingBrandingUser(null);
      setEditBrandMsg('');
    }, 1500);
  };

  // Filtered Promo Codes
  const filteredPromoCodes = promoCodes.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(promoSearch.toLowerCase()) ||
      (c.usedByEmail && c.usedByEmail.toLowerCase().includes(promoSearch.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(promoSearch.toLowerCase()));
    const matchesPlan = promoPlanFilter === 'all' || c.planId === promoPlanFilter;
    const matchesStatus =
      promoStatusFilter === 'all' ||
      (promoStatusFilter === 'unused' && c.status === 'unused') ||
      (promoStatusFilter === 'used' && c.status === 'used') ||
      (promoStatusFilter === 'disabled' && (c.status === 'disabled' || !c.isActive));
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getTierBadge = (tier: UserPlanTier) => {
    switch (tier) {
      case 'basic':
        return <span className="px-2 py-0.5 bg-slate-700 text-slate-200 text-xs font-black rounded">BASIC</span>;
      case 'advanced':
        return <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-black rounded">ADVANCE</span>;
      case 'professional':
        return <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-xs font-black rounded">PRO</span>;
      case 'ultra':
        return <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-black rounded shadow-xs shadow-purple-500/50">VIP DESK</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Clarification & Architecture Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 border-2 border-purple-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-purple-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  प्लान्स, पैकेज व प्रोमो कोड सिस्टम (Plans & Packages)
                </h2>
                <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                4 वास्तविक प्लान्स (BASIC, ADVANCE, PRO, VIP DESK), सिंगल-यूज़ प्रोमो कोड्स एवं पेमेंट एक्टिवेशन का मास्टर कंट्रोल।
              </p>
            </div>
          </div>

          {/* Quick Distinction Pills */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 bg-purple-900/60 text-purple-200 border border-purple-500/40 rounded-lg">
              🎯 Modes ≠ Plans ≠ Promo Codes
            </span>
            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-lg">
              🎟️ Single-Use Promo Code
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6 SYSTEMATIC NUMBERED EXPANDABLE / TAPPABLE ADMIN CONTROL BOXES         */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 6 ACCORDION IN-PLACE ADMIN CONTROL BOXES (EXPANDS DIRECTLY UNDER BOX)    */}
      {/* ========================================================================= */}
      <div className="space-y-3.5">

        {/* ========================================================================= */}
        {/* STEP 1: प्रोफाइल व चैनल विवरण (PROFILE & BRANDING)                        */}
        {/* ========================================================================= */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'profile' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'profile' ? '' : 'profile')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'profile' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                <span>1</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  1. प्रोफाइल व चैनल विवरण
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  चैनल लोगो, नाम, प्राइमरी नंबर, कस्टम हेडर/फुटर (PRO/VIP) व प्रोमो कोड रिडीम
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                चैनल प्रोफाइल
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'profile' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'profile' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              {renderProfileContent ? renderProfileContent() : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  प्रोफाइल लोड हो रही है...
                </div>
              )}
            </div>
          )}
        </div>


        {/* STEP 2: PLANS */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'plans' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'plans' ? '' : 'plans')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'plans' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <span>2</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  2. प्लान्स
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  4 वास्तविक प्लान्स (BASIC, ADVANCE, PRO, VIP DESK)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${plans.length} प्लान्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'plans' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'plans' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {planSaveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{planSaveSuccess}</span>
            </div>
          )}

          {/* Cards Grid for the 4 Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isEditing = editingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between transition-all ${
                    plan.id === 'ultra'
                      ? 'border-purple-500/80 shadow-purple-950/40 ring-1 ring-purple-500/40'
                      : plan.id === 'professional'
                      ? 'border-amber-500/60 shadow-amber-950/30'
                      : plan.id === 'advanced'
                      ? 'border-blue-500/60'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name & Active Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {plan.id === 'ultra' ? (
                          <Crown className="w-5 h-5 text-purple-400" />
                        ) : plan.id === 'professional' ? (
                          <Zap className="w-5 h-5 text-amber-400" />
                        ) : plan.id === 'advanced' ? (
                          <Star className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="font-black text-base text-white">{plan.planKey}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePlanActive(plan.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition cursor-pointer ${
                          plan.isActive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-red-950 text-red-300 border border-red-600'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{plan.tagline}</p>

                    {/* Price & Duration */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">मूल्य (₹)</label>
                            <input
                              type="number"
                              value={editPriceNum}
                              onChange={(e) => setEditPriceNum(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-amber-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">वैधता (दिन)</label>
                            <input
                              type="number"
                              value={editDurationDays}
                              onChange={(e) => setEditDurationDays(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">ग्राफ़िक्स सीमा/दिन</label>
                            <input
                              type="number"
                              value={editMaxGraphics}
                              onChange={(e) => setEditMaxGraphics(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSavePlan(plan.id)}
                              className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>सेव</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPlanId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700 cursor-pointer"
                            >
                              रद्द
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="text-xl font-black text-white font-mono">{plan.priceDisplay}</span>
                            <span className="text-[10px] text-slate-400 ml-1">/ {plan.validityLabel}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartEditPlan(plan)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="एडिट करें"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-300">
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>वॉटरमार्क:</span>
                        <span className={plan.hasWatermark ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {plan.hasWatermark ? 'हाँ (रहेगा)' : 'नहीं (No Watermark)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>क्वालिटी:</span>
                        <span className="text-white font-bold">{plan.graphicExportResolution}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>वीडियो स्टूडियो:</span>
                        <span className={plan.hasVideoStudio ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {plan.hasVideoStudio ? 'सक्रिय (Unlocked)' : 'लॉक्ड'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>VIP DESK फ्रेम्स:</span>
                        <span className={plan.hasVipDeskFrames ? 'text-purple-400 font-bold' : 'text-slate-500'}>
                          {plan.hasVipDeskFrames ? 'विशेष (VIP Only)' : 'लॉक्ड'}
                        </span>
                      </div>

                      <div className="pt-2 space-y-1 text-[11px] text-slate-300">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <div key={i} className="line-clamp-1">
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats / Action */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      दैनिक सीमा: {plan.maxGraphicsPerDay >= 9999 ? 'असीमित' : `${plan.maxGraphicsPerDay} ग्राफिक`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEditPlan(plan)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      कस्टमाइज़ करें
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
            </div>
          )}
        </div>


        {/* ========================================================================= */}
        {/* STEP 3: टेम्पलेट प्लान मैनेजर (TEMPLATE PLAN MANAGER)                     */}
        {/* ========================================================================= */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'templates' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'templates' ? '' : 'templates')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'templates' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <span>3</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  3. टेम्पलेट प्लान मैनेजर
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  ग्राफिक व वीडियो टेम्पलेट्स के एक्सेस टियर (BASIC, ADVANCE, PRO, VIP DESK)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                ADMIN
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'templates' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'templates' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              <AdminTemplatePlanManager isAdmin={true} onOpenStudioWithTemplate={onOpenStudio} />
            </div>
          )}
        </div>


        {/* STEP 4: PROMOCODES */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'promocodes' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'promocodes' ? '' : 'promocodes')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'promocodes' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <span>4</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  4. प्रोमो कोड्स
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  सिंगल-यूज़ प्रोमो कोड जनरेशन व एक्टिवेशन
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${promoCodes.length} कोड्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'promocodes' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'promocodes' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {/* Manual Payment Workflow Guide */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 block">
                  मैन्युअल पेमेंट → प्रोमो कोड → प्लान एक्टिवेशन वर्कफ़्लो:
                </span>
                <span>
                  ग्राहक से ऑफ़लाइन/UPI पेमेंट लेने के बाद, यहाँ उस प्लान का <strong>Single-Use प्रोमो कोड</strong> बनाएं और ग्राहक को दें। ग्राहक द्वारा रिडीम करते ही प्लान तुरंत एक्टिव हो जाएगा और कोड 'USED' हो जाएगा।
                </span>
              </div>
            </div>
          </div>

          {/* Form to Create New Promo Code */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">नया प्रोमो कोड बनाएं (Create Promo Code)</h3>
              </div>
              <span className="text-xs text-slate-400">एक समय में केवल 1 प्लान एक्टिवेट होगा</span>
            </div>

            {promoMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                  promoMsg.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300'
                    : 'bg-red-950/80 border border-red-500 text-red-300'
                }`}
              >
                {promoMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{promoMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreatePromoCode} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Which Plan? */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    1. कौन सा प्लान एक्टिवेट होगा? *
                  </label>
                  <select
                    value={newPromoPlan}
                    onChange={(e) => {
                      const selected = e.target.value as UserPlanTier;
                      setNewPromoPlan(selected);
                      handleAutoGenerateCode(selected);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500 font-bold cursor-pointer"
                  >
                    <option value="basic">BASIC (बेसिक)</option>
                    <option value="advanced">ADVANCE (एडवांस)</option>
                    <option value="professional">PRO (प्रो)</option>
                    <option value="ultra">VIP DESK (वीआईपी डेस्क)</option>
                  </select>
                </div>

                {/* 2. Custom or Auto Promo Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      2. प्रोमो कोड (Code String) *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode(newPromoPlan)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>ऑटो जनरेट</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newPromoCodeStr}
                    onChange={(e) => setNewPromoCodeStr(e.target.value.toUpperCase())}
                    placeholder="उदा. PRO-RIT2026-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-amber-400 uppercase tracking-wider focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                {/* 3. Usage Type: Single-Use (One-time) vs Unlimited */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    3. उपयोग प्रकार (Usage Type) *
                  </label>
                  <select
                    value={newPromoUsageType}
                    onChange={(e) => setNewPromoUsageType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="one_time">One Time Use (एक बार उपयोग — Default)</option>
                    <option value="unlimited">Multiple / Unlimited (कई यूज़र्स हेतु)</option>
                  </select>
                </div>

                {/* 4. Validity / Duration in Days */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    4. प्लान वैधता (Validity)
                  </label>
                  <select
                    value={newPromoDurationDays}
                    onChange={(e) => setNewPromoDurationDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value={7}>7 दिन (फ्री ट्रायल)</option>
                    <option value={30}>30 दिन (1 माह)</option>
                    <option value={90}>90 दिन (3 माह)</option>
                    <option value={180}>180 दिन (6 माह)</option>
                    <option value={365}>365 दिन (1 वर्ष)</option>
                    <option value={9999}>आजीवन (Lifetime Access)</option>
                  </select>
                </div>
              </div>

              {/* Notes / Payment Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  नोट्स / पेमेंट संदर्भ (उदा. "Customer Ramesh ₹999 PhonePe")
                </label>
                <input
                  type="text"
                  value={newPromoNotes}
                  onChange={(e) => setNewPromoNotes(e.target.value)}
                  placeholder="ऑफ़लाइन पेमेंट या ग्राहक का नाम दर्ज करें"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>प्रोमो कोड सुरक्षित करें (Save Promo Code)</span>
                </button>
              </div>
            </form>
          </div>

          {/* Search, Filter & Promo Codes List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">सक्रिय प्रोमो कोड सूची ({filteredPromoCodes.length})</h3>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={promoSearch}
                    onChange={(e) => setPromoSearch(e.target.value)}
                    placeholder="खोजें..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <select
                  value={promoPlanFilter}
                  onChange={(e) => setPromoPlanFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">सभी प्लान्स</option>
                  <option value="basic">BASIC</option>
                  <option value="advanced">ADVANCE</option>
                  <option value="professional">PRO</option>
                  <option value="ultra">VIP DESK</option>
                </select>

                <select
                  value={promoStatusFilter}
                  onChange={(e) => setPromoStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">सभी स्टेटस</option>
                  <option value="unused">Unused (सक्रिय)</option>
                  <option value="used">Used (इस्तेमाल हुआ)</option>
                  <option value="disabled">Disabled (निष्क्रिय)</option>
                </select>
              </div>
            </div>

            {/* Table of Promo Codes */}
            {filteredPromoCodes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                कोई प्रोमो कोड नहीं मिला। ऊपर दिए गए फ़ॉर्म से नया प्रोमो कोड बनाएं।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/50">
                      <th className="p-3">प्रोमो कोड (Promo Code)</th>
                      <th className="p-3">प्लान (Plan)</th>
                      <th className="p-3">उपयोग (Usage)</th>
                      <th className="p-3">स्टेटस (Status)</th>
                      <th className="p-3">उपयोगकर्ता (Used By)</th>
                      <th className="p-3">वैधता (Validity)</th>
                      <th className="p-3 text-right">एक्शन (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredPromoCodes.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Promo Code & Copy */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-amber-300 tracking-wider">
                              {item.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition"
                              title="कोड कॉपी करें"
                            >
                              {copiedCode === item.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {item.notes && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">{item.notes}</span>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="p-3">{getTierBadge(item.planId)}</td>

                        {/* Usage Type */}
                        <td className="p-3 text-slate-300">
                          {item.usageType === 'one_time' ? (
                            <span className="text-[11px] text-sky-400 font-bold">One-Time (एक बार)</span>
                          ) : (
                            <span className="text-[11px] text-purple-400 font-bold">Unlimited (असीमित)</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {item.status === 'used' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-950 border border-purple-600 text-purple-300 text-[10px] font-black rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-purple-400" />
                              <span>USED / REDEEMED</span>
                            </span>
                          ) : item.isActive && item.status === 'unused' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-black rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>UNUSED (सक्रिय)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950 border border-red-600 text-red-300 text-[10px] font-black rounded-md">
                              <XCircle className="w-3 h-3 text-red-400" />
                              <span>DISABLED</span>
                            </span>
                          )}
                        </td>

                        {/* Used By */}
                        <td className="p-3">
                          {item.usedByEmail ? (
                            <div>
                              <span className="font-bold text-slate-200 block truncate max-w-[150px]">
                                {item.usedByEmail}
                              </span>
                              {item.usedAt && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(item.usedAt).toLocaleDateString('hi-IN')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">— उपलब्ध —</span>
                          )}
                        </td>

                        {/* Validity */}
                        <td className="p-3 text-slate-300 font-bold">
                          {item.durationDays >= 9999 ? 'आजीवन' : `${item.durationDays} दिन`}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleCode(item.id)}
                              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                item.isActive
                                  ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-950'
                                  : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                              }`}
                              title={item.isActive ? 'कोड निष्क्रिय करें' : 'कोड सक्रिय करें'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCode(item.id, item.code)}
                              className="p-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-950/60 text-xs transition cursor-pointer"
                              title="हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
            </div>
          )}
        </div>


        {/* STEP 5: USERS */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'users' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'users' ? '' : 'users')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'users' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <span>5</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  5. यूज़र्स
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  पंजीकृत यूज़र्स, टियर व कस्टम हेडर/फुटर
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${planUsers.length} यूज़र्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'users' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'users' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {/* 0. LOGO CHANGE REQUESTS MANAGEMENT CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                    <span>लोगो बदलने के अनुरोध (Logo Change Requests)</span>
                    {logoRequests.filter((r) => r.status === 'pending').length > 0 && (
                      <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full animate-pulse">
                        {logoRequests.filter((r) => r.status === 'pending').length} नए
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-amber-200">
                    यूज़र्स द्वारा चैनल लोगो बदलने हेतु सबमिट की गई रिक्वेस्ट। एडमिन द्वारा स्वीकृत (Approve) करने पर संबंधित यूज़र का प्रोफाइल अनलॉक हो जाएगा।
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[11px] font-black rounded-lg">
                🔐 ONE-TIME SETUP UNLOCK
              </span>
            </div>

            {logoReqMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{logoReqMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoReqMsg('')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {logoRequests.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                वर्तमान में कोई लोगो बदलने का अनुरोध प्राप्त नहीं हुआ है। जब कोई यूज़र प्रोफाइल से अनुरोध करेगा, वह यहाँ प्रदर्शित होगा।
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">यूज़र विवरण</th>
                      <th className="p-3">चैनल नाम</th>
                      <th className="p-3">अनुरोध का कारण</th>
                      <th className="p-3">दिनांक</th>
                      <th className="p-3">स्थिति (Status)</th>
                      <th className="p-3 text-right">कार्रवाई (Action)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {logoRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white font-mono">{req.userEmail}</div>
                        </td>
                        <td className="p-3 font-semibold text-amber-300">
                          {req.channelName || '—'}
                        </td>
                        <td className="p-3 text-slate-300 max-w-xs">
                          {req.reason || 'लोगो बदलने की अनुमति चाहिए'}
                        </td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleDateString('hi-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black">
                              ⏳ लंबित (Pending)
                            </span>
                          ) : req.status === 'approved' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black">
                              ✓ स्वीकृत (Unlocked)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[10px] font-black">
                              ✕ अस्वीकृत (Rejected)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  approveLogoChangeRequest(req.id);
                                  setLogoRequests(getLogoChangeRequests());
                                  setPlanUsers(getPlanUsers());
                                  setLogoReqMsg(`यूज़र ${req.userEmail} का लोगो परिवर्तन अनुरोध स्वीकृत! उनका प्रोफाइल अनलॉक कर दिया गया है।`);
                                  if (onPlanChanged) onPlanChanged();
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg shadow flex items-center gap-1 cursor-pointer transition active:scale-95"
                                title="स्वीकृत करें (यूज़र को अनलॉक करें)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>स्वीकृत करें</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  rejectLogoChangeRequest(req.id);
                                  setLogoRequests(getLogoChangeRequests());
                                  setLogoReqMsg(`यूज़र ${req.userEmail} का अनुरोध अस्वीकृत कर दिया गया।`);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-200 font-bold text-[11px] rounded-lg cursor-pointer transition"
                                title="अस्वीकृत करें"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>अस्वीकृत</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">
                              {req.status === 'approved' ? 'अनलॉक पूर्ण' : 'कार्रवाई पूर्ण'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 1. SINGLE MANAGEMENT BOX: CUSTOM HEADER / FOOTER */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 border-2 border-purple-500/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">
                    CUSTOM HEADER / FOOTER
                  </h3>
                  <p className="text-xs text-purple-200">
                    Database के यूज़र को कस्टम हेडर व फुटर असाइन करें (PRO व VIP DESK हेतु विशेष सुविधा)
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-900/60 text-purple-300 border border-purple-500/40 text-[11px] font-black rounded-lg">
                PRO & VIP DESK EXCLUSIVE
              </span>
            </div>

            {assignCustomMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{assignCustomMsg}</span>
              </div>
            )}

            <form onSubmit={handleAssignCustomHeaderFooter} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. User Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>1. User (डेटाबेस यूज़र चुनें) *</span>
                    <span className="text-[10px] text-amber-400 font-mono">कुल {planUsers.length}</span>
                  </label>
                  <select
                    value={assignUserEmail}
                    onChange={(e) => handleSelectUserForCustomHF(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-purple-400 cursor-pointer font-bold"
                    required
                  >
                    <option value="">-- यूज़र चुनें (Select User) --</option>
                    <optgroup label="पात्र यूज़र्स (Eligible PRO & VIP DESK Users)">
                      {planUsers
                        .filter((u) => u.tier === 'professional' || u.tier === 'ultra' || u.role === 'admin')
                        .map((u) => {
                          const tierLabel = u.tier === 'ultra' ? 'VIP DESK' : u.tier === 'professional' ? 'PRO' : u.tier.toUpperCase();
                          return (
                            <option key={u.userId} value={u.email}>
                              ⭐ {u.name ? `${u.name} (${u.email})` : u.email} — [{tierLabel}]
                            </option>
                          );
                        })}
                    </optgroup>
                    <optgroup label="अन्य यूज़र्स (Other Users)">
                      {planUsers
                        .filter((u) => u.tier !== 'professional' && u.tier !== 'ultra' && u.role !== 'admin')
                        .map((u) => (
                          <option key={u.userId} value={u.email}>
                            {u.name ? `${u.name} (${u.email})` : u.email} — [{u.tier.toUpperCase()}]
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  {assignUserEmail && (
                    <div className="mt-1.5 text-[11px] text-purple-300 flex items-center gap-1.5">
                      <span>चयनित:</span>
                      <span className="font-bold text-white truncate max-w-[200px]">{assignUserEmail}</span>
                    </div>
                  )}
                </div>

                {/* 2. Header File / URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>2. Custom Header (PNG)</span>
                    {assignHeaderUrl && (
                      <button
                        type="button"
                        onClick={() => setAssignHeaderUrl('')}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        हटाएँ
                      </button>
                    )}
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={assignHeaderUrl}
                      onChange={(e) => setAssignHeaderUrl(e.target.value)}
                      placeholder="Header Image URL या फ़ाइल चुनें..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-400"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition">
                        <Upload className="w-3.5 h-3.5 text-purple-400" />
                        <span>हेडर इमेज अपलोड करें</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => handleFileUpload(e, 'header')}
                          className="hidden"
                        />
                      </label>
                      {assignHeaderUrl && (
                        <div className="w-9 h-7 rounded border border-purple-500/50 overflow-hidden bg-slate-950 shrink-0">
                          <img src={assignHeaderUrl} alt="Header Preview" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Footer File / URL */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 flex items-center justify-between">
                    <span>3. Custom Footer (PNG)</span>
                    {assignFooterUrl && (
                      <button
                        type="button"
                        onClick={() => setAssignFooterUrl('')}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        हटाएँ
                      </button>
                    )}
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={assignFooterUrl}
                      onChange={(e) => setAssignFooterUrl(e.target.value)}
                      placeholder="Footer Image URL या फ़ाइल चुनें..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-purple-400"
                    />
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition">
                        <Upload className="w-3.5 h-3.5 text-purple-400" />
                        <span>फुटर इमेज अपलोड करें</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => handleFileUpload(e, 'footer')}
                          className="hidden"
                        />
                      </label>
                      {assignFooterUrl && (
                        <div className="w-9 h-7 rounded border border-purple-500/50 overflow-hidden bg-slate-950 shrink-0">
                          <img src={assignFooterUrl} alt="Footer Preview" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Controls: Active / Inactive Switch & Assign Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-purple-500/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300">स्थिति (Status):</span>
                  <button
                    type="button"
                    onClick={() => setAssignCustomActive(!assignCustomActive)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition flex items-center gap-2 cursor-pointer ${
                      assignCustomActive
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-900/30'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Power className={`w-3.5 h-3.5 ${assignCustomActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{assignCustomActive ? 'Active (सक्रिय)' : 'Inactive (निष्क्रिय)'}</span>
                  </button>
                  <span className="text-[11px] text-slate-400">
                    {assignCustomActive
                      ? 'यह हेडर/फुटर केवल चयनित यूज़र के App और Web में लागू होगा।'
                      : 'निष्क्रिय होने पर सामान्य हेडर/फुटर दिखेंगे।'}
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Assign (कस्टम हेडर/फुटर असाइन करें)</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2. Manual Plan Assignment Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">यूज़र को मैन्युअल प्लान असाइन करें (Assign Plan to User)</h3>
            </div>

            {manualAssignMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{manualAssignMsg}</span>
              </div>
            )}

            <form onSubmit={handleManualUserAssign} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">यूज़र ईमेल / मोबाइल *</label>
                <input
                  type="text"
                  value={manualUserEmail}
                  onChange={(e) => setManualUserEmail(e.target.value)}
                  placeholder="उदा. reporter@breakingnews.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">प्लान चुनें *</label>
                <select
                  value={manualUserTier}
                  onChange={(e) => setManualUserTier(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500 cursor-pointer font-bold"
                >
                  <option value="basic">BASIC</option>
                  <option value="advanced">ADVANCE</option>
                  <option value="professional">PRO</option>
                  <option value="ultra">VIP DESK</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">वैधता (दिन)</label>
                <input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>प्लान लागू करें</span>
                </button>
              </div>
            </form>
          </div>

          {/* 3. ADMIN USER CONTROL: ALL REGISTERED USERS DATABASE RECORDS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>ADMIN USER CONTROL: पंजीकृत यूज़र्स व डेटाबेस रिकॉर्ड्स</span>
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-xs font-black rounded-full">
                    {planUsers.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  हर यूज़र का रिकॉर्ड (User Name, Channel Name, Email, Profile/Branding, Current Plan)। Profile/Branding डिफ़ॉल्ट में LOCK रहती है, Admin यहाँ से अनलॉक कर सकता है।
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="यूज़र / ईमेल / चैनल खोजें..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {planUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                फिलहाल कोई यूज़र रिकॉर्ड नहीं है। यूज़र्स के लॉगिन करने पर वे यहाँ स्वतः दिखेंगे।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/50">
                      <th className="p-3">User & Account Info</th>
                      <th className="p-3">Channel Name & Logo</th>
                      <th className="p-3">Profile / Branding Info</th>
                      <th className="p-3">Current Plan</th>
                      <th className="p-3">Profile Lock Status</th>
                      <th className="p-3">कस्टम H/F स्थिति</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {planUsers
                      .filter((u) => {
                        if (!userSearch.trim()) return true;
                        const s = userSearch.toLowerCase();
                        return (
                          u.email.toLowerCase().includes(s) ||
                          (u.name && u.name.toLowerCase().includes(s)) ||
                          (u.channelName && u.channelName.toLowerCase().includes(s)) ||
                          (u.mobile && u.mobile.includes(s))
                        );
                      })
                      .map((u) => (
                        <tr key={u.userId} className="hover:bg-slate-800/40 transition-colors">
                          {/* User & Account */}
                          <td className="p-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.name || u.email.split('@')[0]}</span>
                              {u.role === 'admin' && (
                                <span className="px-1.5 py-0.2 bg-red-600/80 text-white text-[9px] font-black rounded uppercase">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                            {u.mobile && (
                              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">📞 {u.mobile}</div>
                            )}
                          </td>

                          {/* Channel & Logo */}
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                                {u.channelLogoUrl ? (
                                  <img
                                    src={u.channelLogoUrl}
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <span className="text-[9px] font-mono text-slate-500 font-bold text-center leading-tight">
                                    लोगो नहीं<br />(BLANK)
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-200 truncate max-w-[130px]">
                                  {u.channelName || 'चैनल नाम नहीं'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {u.channelLogoUrl ? (u.channelLogoUrl.includes('.gif') ? 'GIF Logo' : 'PNG Logo') : 'डिफ़ॉल्ट ब्लैंक'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Profile / Branding Info */}
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="text-[11px] text-slate-300 truncate max-w-[150px]">
                                🌐 {u.websiteUrl || <span className="text-slate-500">वेबसाइट नहीं</span>}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                📱 {u.mobile || <span className="text-slate-500">नंबर नहीं</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenBrandingEditor(u)}
                                className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>ब्रांडिंग संपादित करें</span>
                              </button>
                            </div>
                          </td>

                          {/* Current Plan */}
                          <td className="p-3">
                            <div className="space-y-1.5">
                              <div>{getTierBadge(u.tier)}</div>
                              <select
                                value={u.tier}
                                onChange={(e) => {
                                  const newTier = e.target.value as UserPlanTier;
                                  adminUpdateUserRecord(u.email, { tier: newTier });
                                  setPlanUsers(getPlanUsers());
                                }}
                                className="bg-slate-950 border border-slate-700 text-white rounded-lg px-1.5 py-0.5 text-[11px] font-bold cursor-pointer hover:border-amber-400 focus:outline-hidden"
                              >
                                <option value="basic">BASIC</option>
                                <option value="advanced">ADVANCE</option>
                                <option value="professional">PRO</option>
                                <option value="ultra">VIP DESK</option>
                              </select>
                              <div className="text-[10px] text-slate-400">
                                वैध: {new Date(u.expiresAt).toLocaleDateString('hi-IN')}
                              </div>
                            </div>
                          </td>

                          {/* Profile Lock Status (Admin Unlock Control) */}
                          <td className="p-3">
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const newLockState = !u.isLocked;
                                  adminUpdateUserRecord(u.email, { isLocked: newLockState });
                                  setPlanUsers(getPlanUsers());
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                  u.isLocked !== false
                                    ? 'bg-amber-950/60 border-amber-600/80 text-amber-300 hover:bg-amber-900/60'
                                    : 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900/60'
                                }`}
                                title={
                                  u.isLocked !== false
                                    ? 'क्लिक करके इस विशिष्ट यूज़र को अनलॉक करें'
                                    : 'क्लिक करके इस विशिष्ट यूज़र को सुरक्षित लॉक करें'
                                }
                              >
                                {u.isLocked !== false ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                <span>{u.isLocked !== false ? '🔒 लॉक्ड (डिफ़ॉल्ट)' : '🔓 अनलॉक्ड'}</span>
                              </button>
                              <div className="text-[9px] text-slate-400">
                                {u.isLocked !== false ? 'एडिट प्रतिबंधित' : 'यूज़र एडिट कर सकता है'}
                              </div>
                            </div>
                          </td>

                          {/* Custom H/F Assignment Status */}
                          <td className="p-3">
                            {u.assignedCustomActive && (u.assignedHeaderUrl || u.assignedFooterUrl) ? (
                              <span className="px-2 py-0.5 bg-purple-950 border border-purple-500 text-purple-300 rounded text-[10px] font-bold">
                                ✨ असाइन्ड (Active)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">डिफ़ॉल्ट</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. MODAL: EDIT USER BRANDING BY ADMIN */}
          {editingBrandingUser && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-amber-400" />
                      <span>यूज़र ब्रांडिंग विवरण संपादित करें</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {editingBrandingUser.name || editingBrandingUser.email} ({editingBrandingUser.email})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBrandingUser(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editBrandMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold">
                    {editBrandMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">चैनल नाम (Channel Name)</label>
                    <input
                      type="text"
                      value={editBrandNameHi}
                      onChange={(e) => setEditBrandNameHi(e.target.value)}
                      placeholder="उदा. ब्रेकिंग न्यूज़ 24"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">वेबसाइट URL (Website)</label>
                    <input
                      type="text"
                      value={editBrandWebsite}
                      onChange={(e) => setEditBrandWebsite(e.target.value)}
                      placeholder="उदा. www.breakingnews24.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">संपर्क / व्हाट्सऐप नंबर (Mobile)</label>
                    <input
                      type="text"
                      value={editBrandMobile}
                      onChange={(e) => setEditBrandMobile(e.target.value)}
                      placeholder="उदा. 9876543210"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">चैनल लोगो (PNG/GIF URL या अपलोड)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editBrandLogoUrl}
                        onChange={(e) => setEditBrandLogoUrl(e.target.value)}
                        placeholder="Logo image URL..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                      />
                      <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>अपलोड</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                          className="hidden"
                        />
                      </label>
                      {editBrandLogoUrl && (
                        <div className="w-8 h-8 rounded border border-slate-700 overflow-hidden bg-slate-950 shrink-0">
                          <img src={editBrandLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">सोशल आइकन्स (Social Icons)</label>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-200">
                      {['youtube', 'facebook', 'instagram', 'twitter', 'telegram', 'whatsapp'].map((s) => (
                        <label key={s} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-slate-700">
                          <input
                            type="checkbox"
                            checked={!!editBrandSocials[s]}
                            onChange={(e) =>
                              setEditBrandSocials({ ...editBrandSocials, [s]: e.target.checked })
                            }
                            className="rounded text-amber-500"
                          />
                          <span className="capitalize">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingBrandingUser(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUserBranding}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    <span>विवरण सुरक्षित करें</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
            </div>
          )}
        </div>


          {/* EDIT USER MODAL (ADMIN POWER: CHANGE USERNAME, PLAN, PHONE, LOCK) */}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black">
                      <Edit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        यूज़र विवरण संपादित करें (Admin Edit)
                      </h3>
                      <p className="text-xs text-amber-300">
                        यूज़रनेम, नाम, मोबाइल, प्लान व प्रोफाइल लॉक स्थिति बदलें
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editUserMsg && (
                  <div className={editUserMsg.type === 'success' ? 'p-3 rounded-xl border text-xs font-bold flex items-center gap-2 bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'p-3 rounded-xl border text-xs font-bold flex items-center gap-2 bg-rose-950/80 border-rose-500 text-rose-300'}>
                    {editUserMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{editUserMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
                  {/* 1. Username - Specially Requested by User */}
                  <div>
                    <label className="block text-slate-200 font-bold mb-1 flex items-center justify-between">
                      <span>1. यूज़रनेम (Username / User ID) *</span>
                      <span className="text-[10px] text-amber-400 font-normal">⚠️ केवल अक्षर, अंक व अंडरस्कोर</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-bold">@</span>
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="उदा. ainewsmaker"
                        className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      एडमिन के रूप में आप यूज़र का यूज़रनेम बदल सकते हैं। यह परिवर्तन तुरंत क्लाउड सर्वर पर सिंक होगा।
                    </p>
                  </div>

                  {/* 2. Full Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">2. पूरा नाम (Full Name) *</label>
                      <input
                        type="text"
                        required
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">ईमेल (Email ID - संदर्भ)</label>
                      <input
                        type="text"
                        disabled
                        value={editingUser.email}
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* 3. Mobile Number & Channel Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">3. मोबाइल नंबर (Mobile) *</label>
                      <input
                        type="tel"
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        placeholder="10 अंकों का मोबाइल"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">4. चैनल का नाम (Channel)</label>
                      <input
                        type="text"
                        value={editChannelName}
                        onChange={(e) => setEditChannelName(e.target.value)}
                        placeholder="चैनल का नाम"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* 4. Plan Tier & Account Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">5. प्लान / टियर (Plan Tier) *</label>
                      <select
                        value={editTier}
                        onChange={(e) => setEditTier(e.target.value as UserPlanTier)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden font-bold"
                      >
                        <option value="basic">बेसिक (BASIC - ₹0)</option>
                        <option value="advance">एडवांस (ADVANCE - ₹499)</option>
                        <option value="professional">प्रो (PRO - ₹999)</option>
                        <option value="ultra">वीआईपी डेस्क (VIP DESK - ₹1,999)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">6. प्रोफाइल लॉक (Profile Lock) *</label>
                      <select
                        value={editIsLocked ? 'locked' : 'unlocked'}
                        onChange={(e) => setEditIsLocked(e.target.value === 'locked')}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden"
                      >
                        <option value="locked">🔒 लॉक (Locked - नो चेंज)</option>
                        <option value="unlocked">🔓 अनलॉक (Unlocked - एडिट अनुमति)</option>
                      </select>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingUser ? 'सेव हो रहा है...' : 'बदलाव सुरक्षित करें'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


        {/* STEP 6: RSS */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'rss' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'rss' ? '' : 'rss')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'rss' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <span>6</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  6. RSS लिंक्स
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  लाइव प्रोडक्शन RSS XML फ़ीड लिंक्स
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${rssSources.filter(s => s.type === "rss").length} RSS लिंक्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'rss' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'rss' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/40 border-2 border-red-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-red-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30">
                  <Rss className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">
                    6. RSS लिंक्स प्रबंधन (Live Production RSS Feeds)
                  </h3>
                  <p className="text-xs text-slate-300">
                    विभिन्न न्यूज़ चैनलों की लाइव RSS 2.0 XML Feeds जोड़ें। लाइव फेच सीधे प्रोडक्शन सर्वर से वास्तविक समाचार लाएगा।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSyncingRss}
                  onClick={async () => {
                    setIsSyncingRss(true);
                    try {
                      const res = await syncAllSourcesLive();
                      setRssSources(getAdminRssSources());
                      setRssMsg({
                        type: res.success ? 'success' : 'error',
                        text: res.success ? `लाइव RSS स्रोतों से ${res.totalNewItems || 0} नए समाचार अपडेट हुए।` : (res.error || 'सिंक त्रुटि'),
                      });
                    } catch (e: any) {
                      setRssMsg({ type: 'error', text: 'RSS सिंक में त्रुटि: ' + e.message });
                    } finally {
                      setIsSyncingRss(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRss ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRss ? 'लाइव सिंक जारी...' : 'लाइव RSS सिंक करें'}</span>
                </button>
              </div>
            </div>

            {/* Notification message */}
            {rssMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                  rssMsg.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {rssMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{rssMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRssMsg(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Flow Banner */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="font-bold text-amber-400">लाइव RSS डेटा प्रवाह (Live RSS Flow):</span>
              <div className="flex items-center gap-1.5 font-mono text-slate-200">
                <span className="px-2 py-0.5 bg-red-950/80 border border-red-600/60 rounded text-red-300 font-bold">1. LIVE RSS SOURCE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-600/60 rounded text-amber-300 font-bold">2. PRODUCTION FETCH</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-blue-950/80 border border-blue-600/60 rounded text-blue-300 font-bold">3. XML PARSING</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-600/60 rounded text-emerald-300 font-bold">4. DATABASE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-600/60 rounded text-purple-300 font-bold">5. HOME FEED</span>
              </div>
            </div>

                        {/* RSS Category Management Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">RSS श्रेणियां (RSS Categories)</span>
                </div>
                <span className="text-[10px] text-slate-400">{rssCategories.length} श्रेणियां उपलब्ध</span>
              </div>

              <form onSubmit={handleAddRssCategory} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newRssCatInput}
                  onChange={(e) => setNewRssCatInput(e.target.value)}
                  placeholder="नई RSS श्रेणी का नाम (उदा. मध्य प्रदेश, क्राइम, टेक...)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ नई RSS श्रेणी जोड़ें</span>
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-1">
                {rssCategories.map((cat) => (
                  <span
                    key={cat}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-bold text-slate-200 flex items-center gap-1.5"
                  >
                    <span>{cat}</span>
                    {rssCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRssCategory(cat)}
                        className="text-slate-500 hover:text-red-400 transition cursor-pointer"
                        title="श्रेणी हटाएं"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>

            {/* Add New RSS Source Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSourceUrl.trim()) {
                  setRssMsg({ type: 'error', text: 'कृपया वैध RSS Feed XML URL दर्ज करें।' });
                  return;
                }
                addAdminRssSource(newSourceName, newSourceUrl, 'rss', newSourceCategory);
                setRssSources(getAdminRssSources());
                setNewSourceName('');
                setNewSourceUrl('');
                setRssMsg({ type: 'success', text: `नया RSS स्रोत "${newSourceName || 'RSS Source'}" सफलतापूर्वक जोड़ दिया गया है!` });
              }}
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4"
            >
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>नया लाइव RSS Feed स्रोत जोड़ें</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">चैनल / स्रोत का नाम *</label>
                  <input
                    type="text"
                    required
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="उदा. आज तक लाइव RSS"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">RSS Feed XML URL *</label>
                  <input
                    type="url"
                    required
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://feed.aajtak.in/rss/topstories.xml"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">डिफ़ॉल्ट श्रेणी (Category)</label>
                  <select
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-hidden"
                  >
                    <option value="देश">देश (National)</option>
                    <option value="मध्य प्रदेश">मध्य प्रदेश</option>
                    <option value="उत्तर प्रदेश">उत्तर प्रदेश</option>
                    <option value="बिहार">बिहार</option>
                    <option value="राजस्थान">राजस्थान</option>
                    <option value="विदेश">विदेश (International)</option>
                    <option value="व्यापार">व्यापार (Business)</option>
                    <option value="खेल">खेल (Sports)</option>
                    <option value="मनोरंजन">मनोरंजन (Cinema)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>RSS स्रोत जोड़ें</span>
              </button>
            </form>
          </div>

          {/* RSS Sources List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Rss className="w-4 h-4 text-orange-400" />
              <span>सक्रिय RSS 2.0 फ़ीड्स सूची ({rssSources.filter(s => s.type === 'rss').length})</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">चैनल नाम</th>
                    <th className="p-3">श्रेणी</th>
                    <th className="p-3">RSS XML URL</th>
                    <th className="p-3 text-center">स्थिति</th>
                    <th className="p-3 text-right">एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {rssSources.filter(s => s.type === 'rss').map((s) => (
                    <tr key={s.id} className="hover:bg-slate-850/50">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Rss className="w-3.5 h-3.5 text-orange-400" />
                        <span>{s.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-800 text-amber-300 rounded font-bold text-[10px]">
                          {s.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {s.url}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            toggleAdminRssSource(s.id);
                            setRssSources(getAdminRssSources());
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-black cursor-pointer ${
                            s.isActive !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.isActive !== false ? 'सक्रिय (Active)' : 'निष्क्रिय (Off)'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`क्या आप स्रोत "${s.name}" हटाना चाहते हैं?`)) {
                              deleteAdminRssSource(s.id);
                              setRssSources(getAdminRssSources());
                            }
                          }}
                          className="px-2 py-1 text-red-400 hover:bg-red-950/50 rounded cursor-pointer"
                        >
                          हटाएँ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
            </div>
          )}
        </div>


        {/* STEP 7: WEB */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'web' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'web' ? '' : 'web')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'web' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <span>7</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  7. वेब लिंक्स
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  लाइव वेब आर्टिकल स्क्रैपिंग लिंक्स
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${rssSources.filter(s => s.type === "web").length} वेब लिंक्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'web' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'web' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border-2 border-cyan-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">
                    7. वेब लिंक्स प्रबंधन (Live Web Scraping Sources)
                  </h3>
                  <p className="text-xs text-slate-300">
                    वेबसाइट एवं आर्टिकल वेब लिंक्स जोड़ें। बैकएंड प्रोडक्शन स्क्रैपर लाइव आर्टिकल टेक्स्ट व फोटो एक्सट्रैक्ट करके डेटाबेस में सुरक्षित करता है।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSyncingRss}
                  onClick={async () => {
                    setIsSyncingRss(true);
                    try {
                      const res = await syncAllSourcesLive();
                      setRssSources(getAdminRssSources());
                      setRssMsg({
                        type: res.success ? 'success' : 'error',
                        text: res.success ? `लाइव वेब स्रोतों से ${res.totalNewItems || 0} नए समाचार स्क्रैप हुए।` : (res.error || 'स्क्रैप त्रुटि'),
                      });
                    } catch (e: any) {
                      setRssMsg({ type: 'error', text: 'वेब स्क्रैप में त्रुटि: ' + e.message });
                    } finally {
                      setIsSyncingRss(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 border border-cyan-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRss ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRss ? 'लाइव स्क्रैप जारी...' : 'लाइव वेब स्क्रैप करें'}</span>
                </button>
              </div>
            </div>

            {/* Flow Banner */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="font-bold text-cyan-400">लाइव वेब स्क्रैपिंग डेटा प्रवाह (Live Web Scraping Flow):</span>
              <div className="flex items-center gap-1.5 font-mono text-slate-200">
                <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-600/60 rounded text-cyan-300 font-bold">1. LIVE WEB SOURCE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-blue-950/80 border border-blue-600/60 rounded text-blue-300 font-bold">2. SCRAPE & PARSE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-600/60 rounded text-emerald-300 font-bold">3. DATABASE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-600/60 rounded text-purple-300 font-bold">4. HOME FEED</span>
              </div>
            </div>

            {/* Add New Web Source Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSourceUrl.trim()) {
                  setRssMsg({ type: 'error', text: 'कृपया वैध वेब आर्टिकल लिंक दर्ज करें।' });
                  return;
                }
                addAdminRssSource(newSourceName, newSourceUrl, 'web', newSourceCategory);
                setRssSources(getAdminRssSources());
                setNewSourceName('');
                setNewSourceUrl('');
                setRssMsg({ type: 'success', text: `नया वेब लिंक "${newSourceName || 'Web Source'}" सफलतापूर्वक जोड़ दिया गया है!` });
              }}
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4"
            >
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>नया लाइव वेब लिंक स्रोत जोड़ें</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">वेबसाइट / न्यूज़ पोर्टल का नाम *</label>
                  <input
                    type="text"
                    required
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    placeholder="उदा. पीआईबी प्रेस रिलीज़"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">वेबसाइट / आर्टिकल URL *</label>
                  <input
                    type="url"
                    required
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://pib.gov.in/PressReleasePage.aspx?PRID=..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">श्रेणी (Category)</label>
                  <select
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-hidden"
                  >
                    <option value="देश">देश (National)</option>
                    <option value="मध्य प्रदेश">मध्य प्रदेश</option>
                    <option value="उत्तर प्रदेश">उत्तर प्रदेश</option>
                    <option value="बिहार">बिहार</option>
                    <option value="राजस्थान">राजस्थान</option>
                    <option value="विदेश">विदेश (International)</option>
                    <option value="व्यापार">व्यापार (Business)</option>
                    <option value="खेल">खेल (Sports)</option>
                    <option value="मनोरंजन">मनोरंजन (Cinema)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>वेब लिंक जोड़ें</span>
              </button>
            </form>
          </div>

          {/* Web Sources List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>सक्रिय वेब स्क्रैपिंग लिंक्स सूची ({rssSources.filter(s => s.type === 'web').length})</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">पोर्टल / आर्टिकल नाम</th>
                    <th className="p-3">श्रेणी</th>
                    <th className="p-3">वेब URL</th>
                    <th className="p-3 text-center">स्थिति</th>
                    <th className="p-3 text-right">एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {rssSources.filter(s => s.type === 'web').map((s) => (
                    <tr key={s.id} className="hover:bg-slate-850/50">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{s.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-800 text-cyan-300 rounded font-bold text-[10px]">
                          {s.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {s.url}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            toggleAdminRssSource(s.id);
                            setRssSources(getAdminRssSources());
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-black cursor-pointer ${
                            s.isActive !== false ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.isActive !== false ? 'सक्रिय (Active)' : 'निष्क्रिय (Off)'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`क्या आप वेब लिंक "${s.name}" हटाना चाहते हैं?`)) {
                              deleteAdminRssSource(s.id);
                              setRssSources(getAdminRssSources());
                            }
                          }}
                          className="px-2 py-1 text-red-400 hover:bg-red-950/50 rounded cursor-pointer"
                        >
                          हटाएँ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
            </div>
          )}
        </div>


        {/* STEP 8: RESTRICTED */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'restricted' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'restricted' ? '' : 'restricted')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'restricted' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <span>8</span>
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  8. प्रतिबंधित चैनल सुरक्षा सूची
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  राष्ट्रीय न्यूज़ ब्रांड्स सुरक्षा सूची व लोगो अनुमति
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${restrictedList.length} चैनल्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'restricted' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'restricted' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {/* Top Explanation Banner */}
          <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/80 border-2 border-red-500/60 rounded-2xl p-4 sm:p-5 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-white font-black shadow-lg shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      प्रतिबंधित चैनल सुरक्षा सूची
                    </h3>
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                      ब्रांड सुरक्षा
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    बड़े राष्ट्रीय मीडिया नेटवर्क्स (आज तक, एबीपी न्यूज़, एनडीटीवी, ज़ी न्यूज़ आदि) के नाम, वेबसाइट व लोगो अनधिकृत उपयोग से सुरक्षित हैं। कोई भी यूज़र इन चैनलों के नाम, वेबसाइट या यूज़रनेम से खाता नहीं बना सकता।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-red-300 bg-red-950/60 px-3 py-1.5 rounded-xl border border-red-500/40">
                <span>सुरक्षित चैनल्स: {restrictedList.length}</span>
              </div>
            </div>
          </div>

          {/* Feedback Message */}
          {restrictedMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                restrictedMsg.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-500/80 text-emerald-300'
                  : 'bg-red-950/80 border border-red-500/80 text-red-300'
              }`}
            >
              {restrictedMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{restrictedMsg.text}</span>
            </div>
          )}

          {/* Add New Restricted Channel Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-300 border-b border-slate-800 pb-2.5">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>नया चैनल प्रतिबंधित सूची में जोड़ें</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newRestrictedName.trim()) {
                  setRestrictedMsg({ type: 'error', text: 'कृपया चैनल का नाम दर्ज करें' });
                  return;
                }
                if (!newRestrictedWebsite.trim() && !newRestrictedUsername.trim()) {
                  setRestrictedMsg({ type: 'error', text: 'कृपया वेबसाइट या यूज़रनेम दर्ज करें' });
                  return;
                }
                const added = addRestrictedChannel({
                  channelName: newRestrictedName.trim(),
                  websiteUrl: newRestrictedWebsite.trim(),
                  username: newRestrictedUsername.trim() || newRestrictedName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16),
                  logoUrl: newRestrictedLogo.trim() || undefined,
                  reason: newRestrictedReason.trim() || 'राष्ट्रीय/आधिकारिक समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित',
                });
                setRestrictedList(getRestrictedChannels());
                setNewRestrictedName('');
                setNewRestrictedWebsite('');
                setNewRestrictedUsername('');
                setNewRestrictedLogo('');
                setNewRestrictedReason('');
                setRestrictedMsg({
                  type: 'success',
                  text: `✅ चैनल "${added.channelName}" सफलतापूर्वक प्रतिबंधित सूची में जोड़ दिया गया।`,
                });
                setTimeout(() => setRestrictedMsg(null), 5000);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  1. चैनल का नाम *
                </label>
                <input
                  type="text"
                  required
                  value={newRestrictedName}
                  onChange={(e) => setNewRestrictedName(e.target.value)}
                  placeholder="उदा. आज तक (Aaj Tak)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  2. वेबसाइट का पता (डोमेन) *
                </label>
                <input
                  type="text"
                  value={newRestrictedWebsite}
                  onChange={(e) => setNewRestrictedWebsite(e.target.value)}
                  placeholder="उदा. aajtak.in (बिना https:// के)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  3. यूज़रनेम
                </label>
                <input
                  type="text"
                  value={newRestrictedUsername}
                  onChange={(e) => setNewRestrictedUsername(e.target.value)}
                  placeholder="उदा. aajtak"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  4. चैनल लोगो (फोटो चुनें या URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="restricted-logo-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setNewRestrictedLogo(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="restricted-logo-file"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition active:scale-95 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>📁 फोटो चुनें</span>
                  </label>
                  <input
                    type="text"
                    value={newRestrictedLogo}
                    onChange={(e) => setNewRestrictedLogo(e.target.value)}
                    placeholder="या लोगो इमेज लिंक पेस्ट करें..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                  {newRestrictedLogo && (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-400/50 bg-black shrink-0 flex items-center justify-center">
                      <img src={newRestrictedLogo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  5. प्रतिबंध का कारण
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRestrictedReason}
                    onChange={(e) => setNewRestrictedReason(e.target.value)}
                    placeholder="उदा. राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>सूची में जोड़ें</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Search & Channels Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-3 p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={restrictedSearch}
                  onChange={(e) => setRestrictedSearch(e.target.value)}
                  placeholder="चैनल नाम, वेबसाइट या यूज़रनेम खोजें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <span className="text-xs text-slate-400 font-semibold self-center">
                कुल प्रतिबंधित ब्रांड्स: {restrictedList.length}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">लोगो</th>
                    <th className="p-3">चैनल का नाम</th>
                    <th className="p-3">वेबसाइट</th>
                    <th className="p-3">यूज़रनेम</th>
                    <th className="p-3">कारण / सुरक्षा</th>
                    <th className="p-3 text-right">कार्रवाई</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {restrictedList
                    .filter((c) => {
                      if (!restrictedSearch) return true;
                      const q = restrictedSearch.toLowerCase();
                      return (
                        c.channelName.toLowerCase().includes(q) ||
                        c.websiteUrl.toLowerCase().includes(q) ||
                        c.username.toLowerCase().includes(q) ||
                        (c.reason && c.reason.toLowerCase().includes(q))
                      );
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3 whitespace-nowrap">
                          {item.logoUrl ? (
                            <img
                              src={item.logoUrl}
                              alt={item.channelName}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-0.5 border border-slate-800"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-[10px] font-black flex items-center justify-center">
                              🛡️
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-bold text-white text-xs">{item.channelName}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-blue-300">
                          {item.websiteUrl}
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-amber-300">
                          @{item.username}
                        </td>
                        <td className="p-3 text-[11px] text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30 text-[10px] font-bold">
                            {item.reason || 'प्रतिबंधित चैनल'}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`क्या आप चैनल "${item.channelName}" को प्रतिबंधित सूची से हटाना चाहते हैं?`)) {
                                deleteRestrictedChannel(item.id);
                                setRestrictedList(getRestrictedChannels());
                                setRestrictedMsg({
                                  type: 'success',
                                  text: `चैनल "${item.channelName}" को प्रतिबंधित सूची से हटा दिया गया।`,
                                });
                              }
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600 rounded-lg transition cursor-pointer"
                            title="प्रतिबंध हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
            </div>
          )}
        </div>


      </div>
    </div>
  );
};
