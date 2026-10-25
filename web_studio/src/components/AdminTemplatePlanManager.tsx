import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Lock,
  Crown,
  Search,
  Check,
  Zap,
  Eye,
  ToggleLeft,
  ToggleRight,
  Edit2,
  Save,
  X,
  Coins,
  Plus,
  Folder,
  Layers,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import {
  GraphicPlanCategory,
  getAllTemplateConfigs,
  getTemplateConfig,
  saveTemplateConfig,
  TemplatePlanConfig,
  DEFAULT_TEMPLATE_PLAN_CONFIGS,
  FRAME_CATEGORIES,
  FrameCategory,
  getCascadingAllowedPlans,
} from '../lib/graphicTemplatesRegistry';
import { getEffectiveFrameOptions, FrameOption } from '../lib/HeaderDesigns';

interface AdminTemplatePlanManagerProps {
  isAdmin: boolean;
  onOpenStudioWithTemplate?: (templateId: string) => void;
}

export const AdminTemplatePlanManager: React.FC<AdminTemplatePlanManagerProps> = ({
  isAdmin,
  onOpenStudioWithTemplate,
}) => {
  const [frameOptions, setFrameOptions] = useState<FrameOption[]>([]);
  const [templateConfigs, setTemplateConfigs] = useState<Record<string, TemplatePlanConfig>>(() => getAllTemplateConfigs());
  const [filterPlan, setFilterPlan] = useState<'all' | GraphicPlanCategory>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<{ id: string; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCustomName, setTempCustomName] = useState<string>('');

  // New Frame Creation Drawer State
  const [isAddingFrame, setIsAddingFrame] = useState(false);
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameCategory, setNewFrameCategory] = useState<FrameCategory>('Regular Frame');
  const [newFrameTier, setNewFrameTier] = useState<string>('BASIC');
  const [newFrameCoinPrice, setNewFrameCoinPrice] = useState<number>(0);
  const [newFrameAssetUrl, setNewFrameAssetUrl] = useState('');
  const [newFrameHeadlineArea, setNewFrameHeadlineArea] = useState('3-Line Headline Area (बॉटम व्हाईट पॉलीगॉन)');
  const [isCreatingFrame, setIsCreatingFrame] = useState(false);
  const [createError, setCreateError] = useState('');

  const refreshFrames = () => {
    setFrameOptions(getEffectiveFrameOptions());
    setTemplateConfigs(getAllTemplateConfigs());
  };

  useEffect(() => {
    refreshFrames();

    const handleUpdate = () => {
      refreshFrames();
    };

    window.addEventListener('template_plans_updated', handleUpdate);
    return () => {
      window.removeEventListener('template_plans_updated', handleUpdate);
    };
  }, []);

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setTempCustomName(currentName);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = tempCustomName.trim();
    if (!trimmed) {
      alert('कृपया टेम्पलेट का नाम खाली न छोड़ें।');
      return;
    }
    saveTemplateConfig(id, { customName: trimmed });
    setEditingId(null);
    refreshFrames();
    setSuccessToast({
      id,
      msg: `टेम्पलेट का नाम बदलकर "${trimmed}" कर दिया गया है।`,
    });
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setTempCustomName('');
  };

  // Cascading tier change handler
  const handleSelectedTierChange = (templateId: string, tier: string) => {
    const cascadingPlans = getCascadingAllowedPlans(tier);
    saveTemplateConfig(templateId, {
      selectedTier: tier,
      allowedPlans: cascadingPlans,
    });
    refreshFrames();
    setSuccessToast({
      id: templateId,
      msg: `टियर बदला: ${tier} -> अनुमत प्लान्स: ${cascadingPlans.join(', ')}`,
    });
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // Category change handler
  const handleCategoryChange = (templateId: string, category: FrameCategory) => {
    saveTemplateConfig(templateId, { category });
    refreshFrames();
    setSuccessToast({
      id: templateId,
      msg: `कैटेगरी बदली: "${category}"`,
    });
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // Coin price change handler
  const handleCoinPriceChange = (templateId: string, coinPrice: number) => {
    const price = Math.max(0, Number(coinPrice) || 0);
    saveTemplateConfig(templateId, { coinPrice: price });
    refreshFrames();
    setSuccessToast({
      id: templateId,
      msg: price > 0 ? `कॉइन अनलॉक मूल्य सेट: ${price} कॉइन्स/दिन` : 'फ्रेम निःशुल्क/पैकेज आधारित सेट',
    });
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleTogglePlan = (templateId: string, plan: GraphicPlanCategory) => {
    const current = templateConfigs[templateId] || DEFAULT_TEMPLATE_PLAN_CONFIGS[templateId] || {
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
      version: 'v1.0',
    };
    const exists = current.allowedPlans.includes(plan);
    const updatedPlans = exists
      ? current.allowedPlans.filter((p) => p !== plan)
      : [...current.allowedPlans, plan];

    if (updatedPlans.length === 0) {
      alert('कम से कम एक प्लान चुनना अनिवार्य है।');
      return;
    }

    saveTemplateConfig(templateId, { allowedPlans: updatedPlans });
    refreshFrames();
    setSuccessToast({
      id: templateId,
      msg: `प्लान एक्सेस अपडेट: ${updatedPlans.join(', ')}`,
    });
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleToggleActive = (templateId: string) => {
    const current = templateConfigs[templateId] || DEFAULT_TEMPLATE_PLAN_CONFIGS[templateId] || {
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
      version: 'v1.0',
    };
    const nextState = !current.isActive;
    saveTemplateConfig(templateId, { isActive: nextState });
    refreshFrames();
    setSuccessToast({
      id: templateId,
      msg: nextState ? 'टेम्पलेट सक्रिय (Active) किया गया' : 'टेम्पलेट निष्क्रिय (Inactive) किया गया',
    });
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleResetDefaults = () => {
    if (window.confirm('क्या आप सभी टेम्पलेट्स की सेटिंग्स को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?')) {
      localStorage.removeItem('admin_template_configs_v3');
      window.dispatchEvent(new CustomEvent('template_plans_updated'));
      refreshFrames();
      setSuccessToast({ id: 'सभी टेम्पलेट्स', msg: 'डिफ़ॉल्ट सेटिंग्स बहाल की गईं' });
      setTimeout(() => setSuccessToast(null), 2500);
    }
  };

  // Create / Upload new frame
  const handleCreateFrame = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newFrameName.trim()) {
      setCreateError('कृपया फ्रेम का नाम दर्ज करें');
      return;
    }

    setIsCreatingFrame(true);
    try {
      const res = await fetch('/api/admin/create-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFrameName.trim(),
          category: newFrameCategory,
          selectedTier: newFrameTier,
          coinPrice: Number(newFrameCoinPrice) || 0,
          assetUrl: newFrameAssetUrl.trim(),
          previewUrl: newFrameAssetUrl.trim(),
          headlineArea: newFrameHeadlineArea,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAddingFrame(false);
        setNewFrameName('');
        setNewFrameAssetUrl('');
        setNewFrameCoinPrice(0);
        refreshFrames();
        setSuccessToast({
          id: data.frameId || 'New Frame',
          msg: `नई फ्रेम "${newFrameName}" सफलतापूर्वक बनाई गई!`,
        });
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        setCreateError(data.error || 'फ्रेम बनाने में त्रुटि हुई');
      }
    } catch (err: any) {
      setCreateError(err.message || 'सर्वर से कनेक्ट करने में त्रुटि');
    } finally {
      setIsCreatingFrame(false);
    }
  };

  const filteredFrames = frameOptions.filter((f) => {
    const cfg = templateConfigs[f.id] || DEFAULT_TEMPLATE_PLAN_CONFIGS[f.id] || {
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
      version: 'v1.0',
    };
    const matchesPlan = filterPlan === 'all' || cfg.allowedPlans.includes(filterPlan);
    const frameCat = cfg.category || 'Regular Frame';
    const matchesCategory = filterCategory === 'all' || frameCat === filterCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      frameCat.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlan && matchesCategory && matchesSearch;
  });

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h4 className="text-base font-bold text-white">एडमिन अधिकार आवश्यक है</h4>
        <p className="text-xs mt-1">Admin Tier Access Control केवल सुपर एडमिन के लिए उपलब्ध है।</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 flex items-center justify-center text-slate-950 font-black shadow-lg shrink-0">
            <ShieldCheck className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Admin Tier Access Control</span>
              </h3>
              <span className="px-2 py-0.5 bg-red-600/30 border border-red-500/50 text-red-300 text-[10px] font-bold rounded">
                8 श्रेणियाँ व कैस्केडिंग टियर
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              फ्रेम्स का 8 श्रेणियों में विभाजन, पैकेज टियर एक्सेस कंट्रोल (Basic, Advance, Pro, VIP Desk) और कॉइन-आधारित दैनिक अनलॉक प्रबंधित करें।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsAddingFrame(!isAddingFrame)}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ नई फ्रेम जोड़ें</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            title="सभी बदलाव रीसेट करें"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>डिफ़ॉल्ट रीसेट</span>
          </button>
        </div>
      </div>

      {/* Floating Success Notice */}
      {successToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              सफलतापूर्वक अपडेट: <strong>{successToast.id}</strong> — {successToast.msg}
            </span>
          </div>
          <span className="text-[10px] bg-emerald-900/60 px-2 py-0.5 rounded text-emerald-300 font-mono">
            लाइव सिंक
          </span>
        </div>
      )}

      {/* Add New Frame Drawer */}
      {isAddingFrame && (
        <form onSubmit={handleCreateFrame} className="p-5 bg-slate-950/90 border border-amber-500/40 rounded-2xl space-y-4 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>नई फ्रेम बनाएं / अपलोड करें (Template Manager)</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsAddingFrame(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              ✕
            </button>
          </div>

          {createError && (
            <div className="p-2.5 bg-red-950/80 border border-red-500/60 text-red-200 text-xs rounded-xl font-bold">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">फ्रेम का नाम *</label>
              <input
                type="text"
                value={newFrameName}
                onChange={(e) => setNewFrameName(e.target.value)}
                placeholder="उदा. Super Fast Breaking Ribbon"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">कैटेगरी असाइन करें * (8 श्रेणियाँ)</label>
              <select
                value={newFrameCategory}
                onChange={(e) => setNewFrameCategory(e.target.value as FrameCategory)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400"
              >
                {FRAME_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                कैस्केडिंग टियर असाइनमेंट *
              </label>
              <select
                value={newFrameTier}
                onChange={(e) => setNewFrameTier(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400"
              >
                <option value="BASIC">Basic (Basic, Advance, Pro, VIP Desk)</option>
                <option value="ADVANCED">Advance (Advance, Pro, VIP Desk)</option>
                <option value="PRO">Pro (Pro, VIP Desk)</option>
                <option value="VIP DESK">VIP Desk (VIP Desk only)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                दैनिक कॉइन अनलॉक मूल्य (0 = केवल पैकेज)
              </label>
              <div className="relative">
                <Coins className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={newFrameCoinPrice}
                  onChange={(e) => setNewFrameCoinPrice(Number(e.target.value))}
                  placeholder="उदा. 50"
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                फ्रेम एसेट इमेज URL / पाथ
              </label>
              <input
                type="text"
                value={newFrameAssetUrl}
                onChange={(e) => setNewFrameAssetUrl(e.target.value)}
                placeholder="https://... या /assets/frames/frame.png"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddingFrame(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              disabled={isCreatingFrame}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition disabled:opacity-50"
            >
              {isCreatingFrame ? 'सेव हो रहा है...' : '✓ फ्रेम सुरक्षित करें'}
            </button>
          </div>
        </form>
      )}

      {/* Plan & Category Filter Bar */}
      <div className="space-y-3">
        {/* Category Pills (All 8 Categories) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            श्रेणी:
          </span>
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-amber-400 text-slate-950 font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            सभी श्रेणियाँ ({frameOptions.length})
          </button>
          {FRAME_CATEGORIES.map((cat) => {
            const count = frameOptions.filter((f) => {
              const cfg = templateConfigs[f.id] || DEFAULT_TEMPLATE_PLAN_CONFIGS[f.id];
              return (cfg?.category || 'Regular Frame') === cat;
            }).length;
            const isSelected = filterCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Plan Filter Tabs and Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'सभी प्लान्स' },
              { id: 'BASIC', label: 'Basic' },
              { id: 'ADVANCED', label: 'Advance' },
              { id: 'PRO', label: 'Pro' },
              { id: 'VIP DESK', label: 'VIP Desk' },
            ].map((tab) => {
              const isActive = filterPlan === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterPlan(tab.id as any)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="फ्रेम या श्रेणी खोजें..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Frame List with Admin Tier Access Control */}
      <div className="space-y-4">
        {filteredFrames.map((frame, index) => {
          const cfg = templateConfigs[frame.id] || DEFAULT_TEMPLATE_PLAN_CONFIGS[frame.id] || {
            allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
            isActive: true,
            version: 'v1.0',
            category: 'Regular Frame',
            selectedTier: 'BASIC',
            coinPrice: 0,
          };

          const displayName = cfg.customName || frame.name;
          const assignedCategory = (cfg.category || 'Regular Frame') as FrameCategory;
          const currentTier = cfg.selectedTier || (cfg.allowedPlans.includes('BASIC') ? 'BASIC' : cfg.allowedPlans.includes('ADVANCED') ? 'ADVANCED' : cfg.allowedPlans.includes('PRO') ? 'PRO' : 'VIP DESK');
          const currentCoinPrice = cfg.coinPrice || 0;

          return (
            <div
              key={frame.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 ${
                cfg.isActive
                  ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/50 opacity-60'
              }`}
            >
              {/* Header row: ID, Name with inline Rename, Category Badge, Active Toggle, Preview */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-amber-400 px-2.5 py-0.5 bg-amber-400/10 rounded-lg border border-amber-400/20">
                    {frame.id}
                  </span>

                  {editingId === frame.id ? (
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-400/80 rounded-xl p-1 shadow-md">
                      <input
                        type="text"
                        value={tempCustomName}
                        onChange={(e) => setTempCustomName(e.target.value)}
                        placeholder="टेम्पलेट का नया नाम..."
                        className="px-2.5 py-1 bg-slate-950 text-white text-xs font-bold rounded-lg border border-slate-700 focus:outline-hidden focus:border-amber-400 min-w-[180px]"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(frame.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(frame.id)}
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg flex items-center gap-1 cursor-pointer transition active:scale-95"
                        title="नाम सुरक्षित करें"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>सेव</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition"
                        title="रद्द करें"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                        <span>फ्रेम #{index + 1}: {displayName}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleStartRename(frame.id, displayName)}
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg cursor-pointer transition"
                        title="टेम्पलेट का नाम बदलें (Rename Frame)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    📂 {assignedCategory}
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    4:5 पोर्ट्रेट
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Active / Inactive Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(frame.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      cfg.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}
                  >
                    {cfg.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-red-400" />}
                    <span>{cfg.isActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}</span>
                  </button>

                  {/* Preview Button */}
                  {onOpenStudioWithTemplate && (
                    <button
                      type="button"
                      onClick={() => onOpenStudioWithTemplate(frame.id)}
                      className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow flex items-center gap-1 cursor-pointer transition active:scale-95"
                      title="स्टूडियो में प्रीव्यू देखें"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>प्रीव्यू</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Controls Grid: Category, Cascading Tier, Coin Price */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80">
                {/* Category Selection */}
                <div>
                  <label className="text-[11px] font-black text-amber-300 uppercase tracking-wide block mb-1">
                    श्रेणी (Category Assignment):
                  </label>
                  <select
                    value={assignedCategory}
                    onChange={(e) => handleCategoryChange(frame.id, e.target.value as FrameCategory)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-amber-400"
                  >
                    {FRAME_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cascading Tier Selection */}
                <div>
                  <label className="text-[11px] font-black text-amber-300 uppercase tracking-wide block mb-1">
                    टियर एक्सेस (Cascading Tier):
                  </label>
                  <select
                    value={currentTier}
                    onChange={(e) => handleSelectedTierChange(frame.id, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-amber-400"
                  >
                    <option value="BASIC">Basic (Basic, Advance, Pro, VIP Desk)</option>
                    <option value="ADVANCED">Advance (Advance, Pro, VIP Desk)</option>
                    <option value="PRO">Pro (Pro, VIP Desk)</option>
                    <option value="VIP DESK">VIP Desk (VIP Desk only)</option>
                  </select>
                </div>

                {/* Coin Price Configuration */}
                <div>
                  <label className="text-[11px] font-black text-amber-300 uppercase tracking-wide block mb-1">
                    दैनिक कॉइन अनलॉक (Asia/Kolkata):
                  </label>
                  <div className="relative">
                    <Coins className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={currentCoinPrice}
                      onChange={(e) => handleCoinPriceChange(frame.id, Number(e.target.value))}
                      placeholder="0 (अनलॉक नहीं)"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {currentCoinPrice > 0 ? `${currentCoinPrice} कॉइन्स में आज 11:59 PM तक अनलॉक` : '0 = केवल पैकेज आधारित'}
                  </span>
                </div>
              </div>

              {/* Multi-Plan Fine Tuning Checkbox Row */}
              <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] font-bold text-slate-400">
                  सक्रिय अनुमत प्लान्स (Allowed Plans):
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {(['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'] as GraphicPlanCategory[]).map((plan) => {
                    const isChecked = cfg.allowedPlans.includes(plan);
                    const label = plan === 'BASIC' ? 'Basic' : plan === 'ADVANCED' ? 'Advance' : plan === 'PRO' ? 'Pro' : 'VIP Desk';

                    return (
                      <label
                        key={plan}
                        onClick={(e) => {
                          e.preventDefault();
                          handleTogglePlan(frame.id, plan);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none border ${
                          isChecked
                            ? plan === 'BASIC'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                              : plan === 'ADVANCED'
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
                              : plan === 'PRO'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                            : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded flex items-center justify-center border text-[8px] ${
                          isChecked
                            ? 'bg-amber-400 border-amber-400 text-slate-950 font-black'
                            : 'border-slate-600 bg-transparent'
                        }`}>
                          {isChecked && '✓'}
                        </span>
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {filteredFrames.length === 0 && (
          <div className="p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/80 text-slate-500 text-xs">
            कोई टेम्पलेट नहीं मिला।
          </div>
        )}
      </div>
    </div>
  );
};
