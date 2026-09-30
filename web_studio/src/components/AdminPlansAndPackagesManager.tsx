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
} from 'lucide-react';
import {
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
  PLAN_KEY_MAP,
} from '../lib/userPlanManager';

interface AdminPlansAndPackagesManagerProps {
  currentUser?: any;
  onPlanChanged?: () => void;
}

export const AdminPlansAndPackagesManager: React.FC<AdminPlansAndPackagesManagerProps> = ({
  currentUser,
  onPlanChanged,
}) => {
  // Sub-tabs: 'plans', 'promocodes', 'users'
  const [subTab, setSubTab] = useState<'plans' | 'promocodes' | 'users'>('promocodes');

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

  // Reload data on events
  useEffect(() => {
    const handlePlansUpdated = () => setPlans(getPlansCatalog());
    const handlePromoUpdated = () => setPromoCodes(getPromoCodes());
    window.addEventListener('ai_news_plans_updated', handlePlansUpdated);
    window.addEventListener('ai_news_promo_codes_changed', handlePromoUpdated);
    return () => {
      window.removeEventListener('ai_news_plans_updated', handlePlansUpdated);
      window.removeEventListener('ai_news_promo_codes_changed', handlePromoUpdated);
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

      {/* Sub-Tabs: Plans Catalog | Promo Codes | Assigned Users */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('promocodes')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'promocodes'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>1. प्रोमो कोड सिस्टम (Promo Codes & Activation)</span>
          <span className="px-1.5 py-0.2 bg-slate-950/40 text-[10px] font-mono rounded">
            {promoCodes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('plans')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'plans'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>2. चारों प्लान्स प्रबंधन (4 Subscription Plans)</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('users')}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            subTab === 'users'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. प्लान यूज़र्स सूची (Assigned Users)</span>
          <span className="px-1.5 py-0.2 bg-slate-950/40 text-[10px] font-mono rounded">
            {planUsers.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: PROMO CODES SYSTEM & MANUAL PAYMENT ACTIVATION WORKFLOW       */}
      {/* ========================================================================= */}
      {subTab === 'promocodes' && (
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
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PLANS CATALOG (BASIC, ADVANCE, PRO, VIP DESK)                 */}
      {/* ========================================================================= */}
      {subTab === 'plans' && (
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
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: ASSIGNED PLAN USERS & MANUAL ASSIGNMENT                       */}
      {/* ========================================================================= */}
      {subTab === 'users' && (
        <div className="space-y-6">
          {/* Manual Assignment Form */}
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

          {/* Assigned Users Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">सक्रिय यूज़र्स व उनके प्लान्स ({planUsers.length})</h3>
            </div>

            {planUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                फिलहाल कोई मैन्युअल असाइनमेंट रिकॉर्ड नहीं है। प्रोमो कोड रिडीम करने पर यूज़र्स यहाँ स्वतः जुड़ेंगे।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/50">
                      <th className="p-3">यूज़र (User)</th>
                      <th className="p-3">सक्रिय प्लान (Active Plan)</th>
                      <th className="p-3">एक्टिवेशन माध्यम</th>
                      <th className="p-3">शुरुआत तिथि</th>
                      <th className="p-3">एक्सपायरी तिथि</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {planUsers.map((u) => (
                      <tr key={u.userId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white">{u.email}</td>
                        <td className="p-3">{getTierBadge(u.tier)}</td>
                        <td className="p-3 text-slate-300 font-mono text-[11px]">{u.activatedVia}</td>
                        <td className="p-3 text-slate-400">{new Date(u.activatedAt).toLocaleDateString('hi-IN')}</td>
                        <td className="p-3 text-amber-400 font-bold">
                          {new Date(u.expiresAt).toLocaleDateString('hi-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
