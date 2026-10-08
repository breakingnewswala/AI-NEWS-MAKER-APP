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
} from 'lucide-react';
import {
  GraphicPlanCategory,
  getAllTemplateConfigs,
  getTemplateConfig,
  saveTemplateConfig,
  TemplatePlanConfig,
  DEFAULT_TEMPLATE_PLAN_CONFIGS,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<{ id: string; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCustomName, setTempCustomName] = useState<string>('');

  const refreshFrames = () => {
    setFrameOptions(getEffectiveFrameOptions());
    setTemplateConfigs(getAllTemplateConfigs());
  };

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

    // Ensure at least one plan remains checked
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
    if (window.confirm('क्या आप सभी 4 अनुमोदित टेम्पलेट्स के प्लान मैपिंग को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?')) {
      localStorage.removeItem('admin_template_configs_v2');
      window.dispatchEvent(new CustomEvent('template_plans_updated'));
      refreshFrames();
      setSuccessToast({ id: 'सभी टेम्पलेट्स', msg: 'डिफ़ॉल्ट सेटिंग्स बहाल की गईं' });
      setTimeout(() => setSuccessToast(null), 2500);
    }
  };

  const filteredFrames = frameOptions.filter((f) => {
    const cfg = templateConfigs[f.id] || DEFAULT_TEMPLATE_PLAN_CONFIGS[f.id] || {
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
      version: 'v1.0',
    };
    const matchesPlan = filterPlan === 'all' || cfg.allowedPlans.includes(filterPlan);
    const matchesSearch =
      searchQuery.trim() === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPlan && matchesSearch;
  });

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h4 className="text-base font-bold text-white">एडमिन अधिकार आवश्यक है</h4>
        <p className="text-xs mt-1">टेम्पलेट प्लान मैनेजमेंट केवल सुपर एडमिन के लिए उपलब्ध है।</p>
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
                <span>4 अनुमोदित टेम्पलेट्स — प्लान मैपिंग</span>
              </h3>
              <span className="px-2 py-0.5 bg-red-600/30 border border-red-500/50 text-red-300 text-[10px] font-bold rounded">
                एडमिन नियंत्रण
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              प्रत्येक अनुमोदित टेम्पलेट को एक या एक से अधिक प्लान्स (BASIC / ADVANCE / PRO / VIP DESK) में असाइन करें।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="self-start sm:self-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          title="सभी बदलाव रीसेट करें"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>डिफ़ॉल्ट रीसेट</span>
        </button>
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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'] as GraphicPlanCategory[]).map((plan) => {
          const count = frameOptions.filter((f) => {
            const cfg = templateConfigs[f.id] || DEFAULT_TEMPLATE_PLAN_CONFIGS[f.id];
            return cfg && cfg.allowedPlans.includes(plan) && cfg.isActive;
          }).length;
          const label = plan === 'BASIC' ? 'Basic' : plan === 'ADVANCED' ? 'Advance' : plan === 'PRO' ? 'Pro' : 'VIP';
          const colorClass =
            plan === 'BASIC'
              ? 'border-emerald-500/30 text-emerald-400'
              : plan === 'ADVANCED'
              ? 'border-blue-500/30 text-blue-400'
              : plan === 'PRO'
              ? 'border-purple-500/30 text-purple-400'
              : 'border-amber-500/30 text-amber-400';

          return (
            <div key={plan} className={`bg-slate-950/70 border rounded-xl p-3 flex items-center justify-between ${colorClass}`}>
              <div>
                <div className="text-[10px] font-bold uppercase">{label} Plan</div>
                <div className="text-lg font-black text-white">{count} टेम्पलेट्स</div>
              </div>
              <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full font-bold">सक्रिय</span>
            </div>
          );
        })}
      </div>

      {/* Search and Plan Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Plan Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'सभी (All)', count: frameOptions.length },
            { id: 'BASIC', label: 'Basic' },
            { id: 'ADVANCED', label: 'Advance' },
            { id: 'PRO', label: 'Pro' },
            { id: 'VIP DESK', label: 'VIP' },
          ].map((tab) => {
            const isActive = filterPlan === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterPlan(tab.id as any)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 font-black scale-105'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="टेम्पलेट खोजें..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
          />
        </div>
      </div>

      {/* 4 Approved Templates List with Multi-Plan Selection & Renaming */}
      <div className="space-y-4">
        {filteredFrames.map((frame) => {
          const cfg = templateConfigs[frame.id] || DEFAULT_TEMPLATE_PLAN_CONFIGS[frame.id] || {
            allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
            isActive: true,
            version: 'v1.0',
          };

          const displayName = cfg.customName || frame.name;

          return (
            <div
              key={frame.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 ${
                cfg.isActive
                  ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
                  : 'bg-slate-950/40 border-slate-800/50 opacity-60'
              }`}
            >
              {/* Header row: ID, Name with inline Rename, Version, Active Toggle */}
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
                        <span>{displayName}</span>
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

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {cfg.version || 'v1.0'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    अनुपात: 4:5
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

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed">
                {frame.description}
              </p>

              {/* Multi-Plan Checkbox Row: Available For (Basic, Advance, Pro, VIP) */}
              <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wide">
                  Available For (उपलब्ध प्लान्स):
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {(['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'] as GraphicPlanCategory[]).map((plan) => {
                    const isChecked = cfg.allowedPlans.includes(plan);
                    const label = plan === 'BASIC' ? 'Basic' : plan === 'ADVANCED' ? 'Advance' : plan === 'PRO' ? 'Pro' : 'VIP';

                    return (
                      <label
                        key={plan}
                        onClick={(e) => {
                          e.preventDefault();
                          handleTogglePlan(frame.id, plan);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer select-none border ${
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
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
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
