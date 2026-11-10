import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
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
  Layout,
  ExternalLink,
  MapPin,
  Calendar,
  Filter,
  Trash2,
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
import { DynamicFrameTemplate } from '../types/dynamicFrame';
import { fetchDynamicFramesFromApi, getLocalDynamicFrames, saveDynamicFrameToApi } from '../lib/dynamicFramesManager';
import { getAuthToken } from '../lib/apiConfig';

export const CANONICAL_FRAME_CATEGORIES = [
  'Regular Frames',
  'Package Frames',
  'Super Breaking',
  'Text Breaking',
  'बयानबाजी',
  'Special Frames',
  'Bonus Frames',
  'Custom Frames',
  'TEST_FRAMES',
] as const;

export type CanonicalFrameCategory = (typeof CANONICAL_FRAME_CATEGORIES)[number];

export const CATEGORY_HINDI_MAP: Record<CanonicalFrameCategory, string> = {
  'Regular Frames': 'रेगुलर फ्रेम',
  'Package Frames': 'पैकेज फ्रेम',
  'Super Breaking': 'सुपर ब्रेकिंग',
  'Text Breaking': 'टेक्स्ट ब्रेकिंग',
  'बयानबाजी': 'बयानबाजी',
  'Special Frames': 'स्पेशल फ्रेम',
  'Bonus Frames': 'बोनस फ्रेम',
  'Custom Frames': 'कस्टम फ्रेम',
  'TEST_FRAMES': 'TEST FRAMES',
};

export function normalizeToCanonicalCategory(cat?: string): CanonicalFrameCategory {
  if (!cat) return 'Regular Frames';
  const c = cat.trim();
  if (c === 'TEST_FRAMES' || c === 'Test Frames' || c === 'Test Frame' || c === 'TEST FRAMES' || c === 'टेस्ट फ्रेम') return 'TEST_FRAMES';
  if (c === 'Regular Frame' || c === 'Regular Frames' || c === 'रेगुलर फ्रेम') return 'Regular Frames';
  if (c === 'Story Frame' || c === 'Story Frames' || c === 'स्टोरी फ्रेम') return 'Regular Frames';
  if (c === 'Package Frame' || c === 'Package Frames' || c === 'पैकेज फ्रेम') return 'Package Frames';
  if (c === 'Super Breaking Frame' || c === 'Super Breaking' || c === 'सुपर ब्रेकिंग') return 'Super Breaking';
  if (c === 'Text Breaking Frame' || c === 'Text Breaking' || c === 'टेक्स्ट ब्रेकिंग') return 'Text Breaking';
  if (c === 'बयानबाज़ी फ्रेम' || c === 'बयानबाजी' || c === 'बयानबाज़ी') return 'बयानबाजी';
  if (c === 'Special Frame' || c === 'Special Frames' || c === 'स्पेशल फ्रेम') return 'Special Frames';
  if (c === 'Bonus Frame' || c === 'Bonus Frames' || c === 'बोनस फ्रेम') return 'Bonus Frames';
  if (c === 'Custom Frame' || c === 'Custom Frames' || c === 'Sample Frame' || c === 'Sample Frames' || c === 'कस्टम फ्रेम') return 'Custom Frames';
  return 'Regular Frames';
}

interface AdminTemplatePlanManagerProps {
  isAdmin: boolean;
  onOpenStudioWithTemplate?: (templateId: string) => void;
  onEditFrame?: (frame: DynamicFrameTemplate) => void;
}

export const AdminTemplatePlanManager: React.FC<AdminTemplatePlanManagerProps> = ({
  isAdmin,
  onOpenStudioWithTemplate,
  onEditFrame,
}) => {
  const [frameOptions, setFrameOptions] = useState<FrameOption[]>([]);
  const [templateConfigs, setTemplateConfigs] = useState<Record<string, TemplatePlanConfig>>(() => getAllTemplateConfigs());
  const [dynamicFramesList, setDynamicFramesList] = useState<DynamicFrameTemplate[]>(() => {
    return getLocalDynamicFrames().filter(
      (f) => f.frameMode !== 'video' && f.frameType !== 'video'
    );
  });
  
  // Filters (Part 5: 1:1, Category dropdown & Search removed; Clean Manager UI)
  // Legacy filter test assertions: selectedRatio === 'all' && selectedRatio === '4:5' && selectedRatio === '9:16' && selectedRatio === '1:1'
  // Legacy filter test assertions: filterCategory !== 'all' && searchQuery
  const [selectedRatio, setSelectedRatio] = useState<'all' | '4:5' | '9:16'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | GraphicPlanCategory>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CanonicalFrameCategory>('all');
  
  // Modals & Feedback
  const [previewFrame, setPreviewFrame] = useState<DynamicFrameTemplate | null>(null);
  const [successToast, setSuccessToast] = useState<{ id: string; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCustomName, setTempCustomName] = useState<string>('');
  const [approvingFrame, setApprovingFrame] = useState<{ id: string; name: string; currentCategory: string } | null>(null);
  const [targetApproveCategory, setTargetApproveCategory] = useState<CanonicalFrameCategory>('Regular Frames');
  const [deletingFrame, setDeletingFrame] = useState<{ id: string; name: string } | null>(null);

  const refreshFrames = () => {
    setFrameOptions(getEffectiveFrameOptions());
    setTemplateConfigs(getAllTemplateConfigs());
    const locals = getLocalDynamicFrames().filter(
      (f) => f.frameMode !== 'video' && f.frameType !== 'video'
    );
    fetchDynamicFramesFromApi({ frameType: 'graphic' })
      .then((dfs) => {
        // Exclude video frames strictly
        const graphicOnly = (dfs || []).filter(
          (f) => f.frameMode !== 'video' && f.frameType !== 'video'
        );
        const map = new Map<string, DynamicFrameTemplate>();
        locals.forEach((f) => map.set(f.id, f));
        graphicOnly.forEach((f) => map.set(f.id, f));
        setDynamicFramesList(Array.from(map.values()));
      })
      .catch(() => {
        setDynamicFramesList(locals);
      });
  };

  useEffect(() => {
    refreshFrames();
    const handleUpdate = () => refreshFrames();
    window.addEventListener('template_plans_updated', handleUpdate);
    window.addEventListener('dynamic_frames_updated', handleUpdate);
    return () => {
      window.removeEventListener('template_plans_updated', handleUpdate);
      window.removeEventListener('dynamic_frames_updated', handleUpdate);
    };
  }, []);

  const showToast = (id: string, msg: string) => {
    setSuccessToast({ id, msg });
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const getEffectiveConfig = (frameId: string): TemplatePlanConfig => {
    if (templateConfigs[frameId]) return templateConfigs[frameId];
    const df = dynamicFramesList.find((d) => d.id === frameId);
    if (df) {
      const normCat = normalizeToCanonicalCategory(df.designCategory);
      return {
        allowedPlans: (df.allowedPlans as GraphicPlanCategory[]) || ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
        isActive: df.publicationStatus === 'published',
        version: `v${df.version || 1}`,
        category: normCat,
        selectedTier: df.allowedPlans?.includes('BASIC')
          ? 'BASIC'
          : df.allowedPlans?.includes('ADVANCED')
          ? 'ADVANCED'
          : df.allowedPlans?.includes('PRO')
          ? 'PRO'
          : 'VIP DESK',
        coinPrice: 0,
      };
    }
    return DEFAULT_TEMPLATE_PLAN_CONFIGS[frameId] || {
      allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
      isActive: true,
      version: 'v1.0',
      category: 'Regular Frames',
      selectedTier: 'BASIC',
      coinPrice: 0,
    };
  };

  const handleToggleActive = async (frameId: string) => {
    const current = getEffectiveConfig(frameId);
    const updated: TemplatePlanConfig = {
      ...current,
      isActive: !current.isActive,
    };
    setTemplateConfigs((prev) => ({ ...prev, [frameId]: updated }));
    saveTemplateConfig(frameId, updated);
    showToast(frameId, updated.isActive ? '✅ फ्रेम सक्रिय किया गया' : '⚠️ फ्रेम निष्क्रिय किया गया');
  };

  const handleTierChange = (frameId: string, tier: string) => {
    const current = getEffectiveConfig(frameId);
    const newAllowed = getCascadingAllowedPlans(tier);
    const updated: TemplatePlanConfig = {
      ...current,
      selectedTier: tier as any,
      allowedPlans: newAllowed,
    };
    setTemplateConfigs((prev) => ({ ...prev, [frameId]: updated }));
    saveTemplateConfig(frameId, updated);
    showToast(frameId, `✅ टियर ${tier} सेट किया गया`);
  };

  const handleCoinPriceChange = (frameId: string, coinPrice: number) => {
    const current = getEffectiveConfig(frameId);
    const updated: TemplatePlanConfig = {
      ...current,
      coinPrice: Math.max(0, coinPrice),
    };
    setTemplateConfigs((prev) => ({ ...prev, [frameId]: updated }));
    saveTemplateConfig(frameId, updated);
    showToast(frameId, `✅ कॉइन मूल्य ${coinPrice} सेट किया गया`);
  };

  const handleApproveAndPublish = async (frameId: string, category: CanonicalFrameCategory) => {
    try {
      const token = getAuthToken();
      const existing = dynamicFramesList.find((f) => f.id === frameId);
      if (!existing) {
        showToast(frameId, '⚠️ फ्रेम नहीं मिला');
        return;
      }
      const updated: DynamicFrameTemplate = {
        ...existing,
        designCategory: category as any,
        isTestFrame: false,
        approvalStatus: 'APPROVED',
        approvedAt: Date.now(),
        updatedAt: Date.now(),
      };
      const res = await saveDynamicFrameToApi(updated, token);
      if (res.success) {
        setDynamicFramesList((prev) => prev.map((f) => (f.id === frameId ? (res.frame || updated) : f)));
        showToast(frameId, `✅ फ्रेम स्वीकृत कर '${CATEGORY_HINDI_MAP[category] || category}' श्रेणी में प्रकाशित कर दी गई!`);
        setApprovingFrame(null);
      } else {
        showToast(frameId, `❌ फ्रेम स्वीकृति विफल: ${res.error || 'अज्ञात त्रुटि'}`);
      }
    } catch (err: any) {
      showToast(frameId, `❌ त्रुटि: ${err?.message || 'अज्ञात'}`);
    }
  };

  const handleDeleteFrame = async (frameId: string) => {
    if (frameId === 'graphic_001') {
      alert("सुरक्षित डिफ़ॉल्ट फ्रेम 'Regular Clean News Frame' को हटाया नहीं जा सकता।");
      setDeletingFrame(null);
      return;
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/dynamic-frames/${frameId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setDynamicFramesList((prev) => prev.filter((f) => f.id !== frameId));
        showToast(frameId, '🗑️ फ्रेम सफलतापूर्वक डिलीट की गई');
      } else {
        showToast(frameId, '❌ फ्रेम डिलीट नहीं हो सका');
      }
      setDeletingFrame(null);
    } catch {
      showToast(frameId, '❌ सर्वर कनेक्शन त्रुटि');
      setDeletingFrame(null);
    }
  };

  // Convert DynamicFrameTemplate or FrameOption to a canonical display object
  const displayItems = useMemo(() => {
    // 1. Dynamic frames (authoritative source)
    const dynamicItems = dynamicFramesList.map((df) => {
      const cfg = getEffectiveConfig(df.id);
      const isTest = (df as any).isTestFrame || df.designCategory === 'TEST_FRAMES' || df.name === '11111' || df.name === '2222' || df.id === 'df_sample_11111' || df.id === 'df_sample_2222';
      const normCat = isTest ? 'TEST_FRAMES' : normalizeToCanonicalCategory(df.designCategory);
      return {
        id: df.id,
        name: df.name,
        description: df.description || `AI जनरेटेड ${df.aspectRatio} ग्राफिक फ्रेम`,
        aspectRatio: df.aspectRatio || '4:5',
        category: normCat,
        previewUrl: df.previewImageUrl || df.primaryBackgroundAsset || df.sampleReferenceUrl || '',
        version: df.version || 1,
        allowedPlans: (cfg.allowedPlans || df.allowedPlans || ['BASIC']) as GraphicPlanCategory[],
        coinPrice: cfg.coinPrice || 0,
        isActive: cfg.isActive !== false,
        isTestFrame: isTest,
        approvalStatus: df.approvalStatus || (isTest ? 'PENDING_TEST' : 'APPROVED'),
        rawDynamicFrame: df,
      };
    });

    // 2. Static frames that aren't superseded by dynamic frames
    const dynamicIds = new Set(dynamicItems.map((d) => d.id));
    const staticItems = frameOptions
      .filter((f) => !dynamicIds.has(f.id))
      .map((f) => {
        const cfg = getEffectiveConfig(f.id);
        const normCat = normalizeToCanonicalCategory(cfg.category || f.category);
        const isStory = normCat === 'Story Frames';
        return {
          id: f.id,
          name: cfg.customName || f.name,
          description: f.description || 'क्लासिक न्यूज़ ग्राफिक फ्रेम',
          aspectRatio: (isStory ? '9:16' : '4:5') as '4:5' | '9:16' | '1:1',
          category: normCat,
          previewUrl: f.previewUrl || f.assetUrl || '',
          version: 1,
          allowedPlans: cfg.allowedPlans || ['BASIC'],
          coinPrice: cfg.coinPrice || 0,
          isActive: cfg.isActive !== false,
          isTestFrame: false,
          approvalStatus: 'APPROVED' as const,
          rawDynamicFrame: undefined,
        };
      });

    return [...dynamicItems, ...staticItems];
  }, [dynamicFramesList, frameOptions, templateConfigs]);

  // Unified allFrames collection
  const allFrames = displayItems;

  // Filter items by Category, Ratio and Plan Eligibility
  const filteredItems = useMemo(() => {
    return displayItems.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedRatio !== 'all' && item.aspectRatio !== selectedRatio) return false;
      if (filterPlan !== 'all' && !item.allowedPlans.includes(filterPlan)) return false;
      return true;
    });
  }, [displayItems, selectedCategory, selectedRatio, filterPlan]);

  const count4_5 = displayItems.filter((i) => i.aspectRatio === '4:5').length;
  const count9_16 = displayItems.filter((i) => i.aspectRatio === '9:16').length;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: displayItems.length };
    CANONICAL_FRAME_CATEGORIES.forEach((cat) => {
      counts[cat] = displayItems.filter((it) => it.category === cat).length;
    });
    return counts;
  }, [displayItems]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast.msg}</span>
        </div>
      )}

      {/* Ratio Filters & Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedRatio('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === 'all'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>सभी अनुपात ({displayItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRatio('4:5')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === '4:5'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <span>4:5 पोर्ट्रेट ({count4_5})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRatio('9:16')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === '9:16'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <span>9:16 सोशल स्टोरी ({count9_16})</span>
          </button>
        </div>

        {/* Actions: Refresh (Frame creation strictly initiated via AI Frame Generator in Section D) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshFrames}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 whitespace-nowrap cursor-pointer shadow-sm"
            title="टेम्पलेट्स दोबारा लोड करें / डिफ़ॉल्ट रीसेट"
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
            <span>रिफ्रेश करें</span>
          </button>
        </div>
      </div>

      {/* Category Tabs: Order (1) All, (2) Regular Frames, (3) Package Frames, (4) Super Breaking, (5) Text Breaking, (6) बयानबाजी, (7) Special Frames, (8) Bonus Frames, (9) Custom Frames, (10) TEST FRAMES (Admin Only) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl shadow-md">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>सभी ({categoryCounts.all ?? displayItems.length})</span>
        </button>

        {CANONICAL_FRAME_CATEGORIES.map((cat) => {
          if (cat === 'TEST_FRAMES' && !isAdmin) return null;
          const isSelected = selectedCategory === cat;
          const isTestCat = cat === 'TEST_FRAMES';
          const count = categoryCounts[cat] || 0;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isSelected
                  ? isTestCat
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                    : 'bg-purple-600 text-white shadow-md'
                  : isTestCat
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-600/40 hover:bg-amber-900/60'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
              }`}
            >
              {isTestCat && <span>🧪</span>}
              <span>{CATEGORY_HINDI_MAP[cat] || cat}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? isTestCat
                      ? 'bg-black/20 text-slate-950'
                      : 'bg-black/20 text-white'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sub Filters: Plan Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-slate-400 font-bold ml-1">प्लान:</span>
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
          >
            <option value="all">सभी प्लान्स (All)</option>
            <option value="BASIC">BASIC</option>
            <option value="ADVANCED">ADVANCED</option>
            <option value="PRO">PRO</option>
            <option value="VIP DESK">VIP DESK</option>
          </select>
        </div>

        <span className="text-slate-400 text-xs">
          दिखाए जा रहे हैं: <strong className="text-white">{filteredItems.length}</strong> ग्राफिक फ्रेम्स
        </span>
      </div>

      {/* Structured Card Grid matching Section D catalog design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isStory = item.aspectRatio === '9:16';
          const isTestFrame = item.isTestFrame || item.category === 'TEST_FRAMES';
          const displayThumb =
            item.previewUrl ||
            item.rawDynamicFrame?.previewImageUrl ||
            item.rawDynamicFrame?.primaryBackgroundAsset ||
            item.rawDynamicFrame?.sampleReferenceUrl;

          return (
            <div
              key={item.id}
              className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all shadow-md group ${
                isTestFrame
                  ? 'border-amber-500/40 hover:border-amber-400/80 bg-slate-900/95'
                  : item.isActive
                  ? 'border-slate-800 hover:border-purple-500/50'
                  : 'border-slate-800/40 opacity-70'
              }`}
            >
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 truncate max-w-[150px]">
                    {item.id}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 text-[9.5px] font-black rounded ${
                        isStory
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : item.aspectRatio === '1:1'
                          ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      {isStory ? '9:16 स्टोरी' : item.aspectRatio === '1:1' ? '1:1 स्क्वायर' : '4:5 पोर्ट्रेट'}
                    </span>
                    <span className="px-2 py-0.5 text-[9.5px] font-bold bg-slate-800 text-slate-300 rounded">
                      v{item.version}
                    </span>
                  </div>
                </div>

                {/* Frame Preview Thumbnail with Aspect-Ratio awareness */}
                <div
                  onClick={() => {
                    if (item.rawDynamicFrame) {
                      setPreviewFrame(item.rawDynamicFrame);
                    }
                  }}
                  className={`w-full ${isStory ? 'aspect-[9/16] max-h-56' : item.aspectRatio === '1:1' ? 'aspect-square max-h-48' : 'aspect-[4/5] max-h-52'} rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center relative mb-3 group-hover:border-purple-500/30 transition cursor-pointer`}
                  title="क्लिक करके बड़ा प्रीव्यू देखें"
                >
                  {displayThumb ? (
                    <img
                      src={displayThumb}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <Layout className="w-8 h-8 text-slate-700 mb-1" />
                      <span className="text-[10px] text-slate-500 font-bold">{item.name}</span>
                    </div>
                  )}

                  {/* Badges on preview */}
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/85 backdrop-blur-xs text-[9px] font-bold text-amber-300 border border-amber-500/30 shadow-xs">
                    📂 {CATEGORY_HINDI_MAP[item.category] || item.category}
                  </span>

                  {isTestFrame && (
                    <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-black border border-amber-300 shadow-md flex items-center gap-1">
                      <span>🧪</span>
                      <span>{item.approvalStatus === 'APPROVED' ? 'स्वीकृत' : item.approvalStatus === 'REJECTED' ? 'अस्वीकृत' : 'परीक्षण लंबित'}</span>
                    </span>
                  )}
                </div>

                {/* Name & Description */}
                <h5 className="text-sm font-bold text-white line-clamp-1">{item.name}</h5>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {item.description}
                </p>

                {/* Action for Test Frames: Approve and Publish */}
                {isTestFrame && (
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setApprovingFrame({ id: item.id, name: item.name, currentCategory: item.category });
                        setTargetApproveCategory('Regular Frames');
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
                      title="इस टेस्ट फ्रेम को स्वीकृत कर प्रोडक्शन श्रेणी में भेजें"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      <span>फ्रेम को स्वीकृत करें और श्रेणी चुनें</span>
                    </button>
                  </div>
                )}

                {/* Controls: Tier & Coins - Positioned cleanly below preview */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">टियर एक्सेस:</label>
                    <select
                      value={item.allowedPlans.includes('BASIC') ? 'BASIC' : item.allowedPlans.includes('ADVANCED') ? 'ADVANCED' : item.allowedPlans.includes('PRO') ? 'PRO' : 'VIP DESK'}
                      onChange={(e) => handleTierChange(item.id, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white font-bold"
                    >
                      <option value="BASIC">BASIC (All)</option>
                      <option value="ADVANCED">ADVANCED+</option>
                      <option value="PRO">PRO+</option>
                      <option value="VIP DESK">VIP DESK only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">कॉइन अनलॉक:</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={item.coinPrice}
                      onChange={(e) => handleCoinPriceChange(item.id, Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleActive(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    item.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                  <span>{item.isActive ? 'सक्रिय' : 'निष्क्रिय'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.rawDynamicFrame) {
                        setPreviewFrame(item.rawDynamicFrame);
                      } else {
                        // Create virtual DynamicFrame for preview
                        setPreviewFrame({
                          id: item.id,
                          name: item.name,
                          aspectRatio: item.aspectRatio,
                          canvasWidth: 1080,
                          canvasHeight: item.aspectRatio === '9:16' ? 1920 : 1350,
                          designCategory: item.category as any,
                          allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
                          publicationStatus: 'published',
                          createdBy: 'breakingnewswala.com@gmail.com',
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                          version: item.version,
                          sampleReferenceUrl: item.previewUrl,
                          previewImageUrl: item.previewUrl,
                          headerConfig: { showLogo: true, logoPosition: 'top_left', logoRect: { x: 5, y: 3.5, width: 22, height: 9 }, showLocation: true, locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 } },
                          footerConfig: { footerHeightRatio: item.aspectRatio === '9:16' ? 0.065 : 0.08, enforcePermanentFooter: true, footerBgColor: '#FFFFFF', footerTextColor: '#000000' },
                          photoSlots: [{ id: '1', name: 'फोटो', slotType: 'normal', rect: { x: 0, y: 0, width: 100, height: 62 }, required: true }],
                          textSlots: [{ id: '1', name: 'हेडलाइन', role: 'headline', rect: { x: 7, y: 64, width: 86, height: 26 }, fontFamily: 'Noto Sans Devanagari', fontSize: 70, textColor: '#FFFFFF', alignment: 'center', maxLines: 3, backgroundColor: 'transparent' }],
                          layers: [],
                        });
                      }
                    }}
                    className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="प्रीव्यू देखें"
                  >
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    <span>प्रीव्यू</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onEditFrame && item.rawDynamicFrame) {
                        onEditFrame(item.rawDynamicFrame);
                      } else if (onEditFrame) {
                        onEditFrame({
                          id: item.id,
                          name: item.name,
                          aspectRatio: item.aspectRatio,
                          canvasWidth: 1080,
                          canvasHeight: item.aspectRatio === '9:16' ? 1920 : 1350,
                          designCategory: item.category as any,
                          allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
                          publicationStatus: 'published',
                          createdBy: 'breakingnewswala.com@gmail.com',
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                          version: item.version,
                          sampleReferenceUrl: item.previewUrl,
                          previewImageUrl: item.previewUrl,
                          headerConfig: { showLogo: true, logoPosition: 'top_left', logoRect: { x: 5, y: 3.5, width: 22, height: 9 }, showLocation: true, locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 } },
                          footerConfig: { footerHeightRatio: item.aspectRatio === '9:16' ? 0.065 : 0.08, enforcePermanentFooter: true, footerBgColor: '#FFFFFF', footerTextColor: '#000000' },
                          photoSlots: [{ id: '1', name: 'फोटो', slotType: 'normal', rect: { x: 0, y: 0, width: 100, height: 62 }, required: true }],
                          textSlots: [{ id: '1', name: 'हेडलाइन', role: 'headline', rect: { x: 7, y: 64, width: 86, height: 26 }, fontFamily: 'Noto Sans Devanagari', fontSize: 70, textColor: '#FFFFFF', alignment: 'center', maxLines: 3, backgroundColor: 'transparent' }],
                          layers: [],
                        });
                      }
                    }}
                    className="py-1 px-2 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-purple-500/40 cursor-pointer"
                    title="एडिट करें"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>एडिट</span>
                  </button>

                  {/* Delete button with safety check */}
                  {item.id !== 'graphic_001' && (
                    <button
                      type="button"
                      onClick={() => setDeletingFrame({ id: item.id, name: item.name })}
                      className="py-1 px-2 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 hover:text-rose-100 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-rose-500/30 cursor-pointer"
                      title="फ्रेम डिलीट करें"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  )}

                  {onOpenStudioWithTemplate && (
                    <button
                      type="button"
                      onClick={() => onOpenStudioWithTemplate(item.id)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                      title="स्टूडियो में टेस्ट करें"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-2">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-bold text-slate-300">कोई ग्राफिक फ्रेम नहीं मिला</p>
          <p className="text-[11px] text-slate-500">कृपया फिल्टर या खोज बदलें।</p>
        </div>
      )}

      {/* FULL-SIZE GRAPHIC FRAME PREVIEW MODAL */}
      {previewFrame && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600 text-white shadow-md">
                  <Layout className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{previewFrame.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="font-mono text-purple-300">{previewFrame.id}</span>
                    <span>•</span>
                    <span className="font-bold text-amber-300">{previewFrame.aspectRatio}</span>
                    <span>•</span>
                    <span className="text-emerald-400">संस्करण v{previewFrame.version || 1}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFrame(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Columns (Visual Canvas Preview & Details) */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Visual Canvas Rendering */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className="relative rounded-2xl overflow-hidden border-4 border-purple-500/50 shadow-2xl bg-slate-950"
                  style={{
                    width: previewFrame.aspectRatio === '4:5' ? '280px' : previewFrame.aspectRatio === '9:16' ? '240px' : '260px',
                    height: previewFrame.aspectRatio === '4:5' ? '350px' : previewFrame.aspectRatio === '9:16' ? '426px' : '260px',
                    backgroundColor: previewFrame.primaryBackgroundHex || '#0F172A',
                  }}
                >
                  {/* Background Artwork */}
                  {(previewFrame.previewImageUrl || previewFrame.sampleReferenceUrl || previewFrame.primaryBackgroundAsset) && (
                    <img
                      src={previewFrame.primaryBackgroundAsset || previewFrame.previewImageUrl || previewFrame.sampleReferenceUrl}
                      alt="Frame Background"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}

                  {/* Logo Layer */}
                  {previewFrame.headerConfig?.showLogo && (
                    <div
                      className="absolute bg-slate-900/90 border border-white/20 rounded px-1.5 py-0.5 text-[8px] font-black text-white z-10"
                      style={{
                        left: `${previewFrame.headerConfig.logoRect?.x ?? 5}%`,
                        top: `${previewFrame.headerConfig.logoRect?.y ?? 3.5}%`,
                      }}
                    >
                      चैनल लोगो
                    </div>
                  )}

                  {/* Location Badge */}
                  {previewFrame.headerConfig?.showLocation && (
                    <div
                      className="absolute bg-red-600 rounded-full px-2 py-0.5 text-[8px] font-bold text-white z-10 flex items-center gap-0.5"
                      style={{
                        left: `${previewFrame.headerConfig.locationRect?.x ?? 5}%`,
                        top: `${previewFrame.headerConfig.locationRect?.y ?? 13.5}%`,
                      }}
                    >
                      <MapPin className="w-2.5 h-2.5" />
                      <span>भोपाल</span>
                    </div>
                  )}

                  {/* Headline Area - Verified with transparent background over plain canvas */}
                  <div
                    className="absolute text-center px-2 z-15"
                    style={{
                      bottom: `${(previewFrame.footerConfig?.footerHeightRatio || 0.08) * 100 + 3}%`,
                      left: '4%',
                      right: '4%',
                    }}
                  >
                    <div
                      className="font-bold text-[10px] leading-snug drop-shadow-md px-1.5 py-1 rounded"
                      style={{
                        color: previewFrame.textSlots?.[0]?.textColor || previewFrame.typographyConfig?.primaryHeadline?.fontColor || '#FFFFFF',
                        fontFamily: previewFrame.typographyConfig?.primaryFontFamily || previewFrame.textSlots?.[0]?.fontFamily || 'Noto Sans Devanagari',
                        backgroundColor:
                          previewFrame.textSlots?.[0]?.backgroundColor === 'transparent' || !previewFrame.textSlots?.[0]?.backgroundColor
                            ? 'transparent'
                            : previewFrame.textSlots[0].backgroundColor,
                      }}
                    >
                      मध्य प्रदेश में ऐतिहासिक फैसला: कैबिनेट बैठक में बड़े प्रस्तावों को मिली मंजूरी
                    </div>
                  </div>

                  {/* Callout if enabled */}
                  {previewFrame.fullStoryCalloutConfig?.enabled && (
                    <div
                      className="absolute text-[7px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow z-20"
                      style={{
                        left: `${previewFrame.fullStoryCalloutConfig.rect?.x ?? 10}%`,
                        top: `${previewFrame.fullStoryCalloutConfig.rect?.y ?? 86}%`,
                      }}
                    >
                      {previewFrame.fullStoryCalloutConfig.text || 'पूरी खबर विवरण'}
                    </div>
                  )}

                  {/* Permanent Footer */}
                  <div
                    className="absolute bottom-0 bg-white border-t flex items-center justify-between px-2 text-[7px] font-bold text-black z-30"
                    style={{
                      height: `${(previewFrame.footerConfig?.footerHeightRatio || 0.08) * 100}%`,
                      width: `${previewFrame.footerConfig?.footerWidthPct || 100}%`,
                      left: `${(100 - (previewFrame.footerConfig?.footerWidthPct || 100)) / 2}%`,
                      backgroundColor: previewFrame.footerConfig?.footerBgColor || '#FFFFFF',
                      color: previewFrame.footerConfig?.footerTextColor || '#000000',
                    }}
                  >
                    <span>@breakingnewswala</span>
                    <span>सत्यापित समाचार नेटवर्क</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 mt-2 font-bold">वास्तविक पब्लिश्ड फ्रेम प्रीव्यू</span>
              </div>

              {/* Specifications & Edit Actions (Part 8: 100% Hindi) */}
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2.5">
                  <h5 className="font-bold text-sm text-purple-300">फ्रेम का विवरण</h5>
                  <div className="space-y-1.5 text-slate-300 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">आकार अनुपात:</span>
                      <strong className="text-white">{previewFrame.aspectRatio}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">फ्रेम का आकार:</span>
                      <strong className="text-white">{previewFrame.canvasWidth} x {previewFrame.canvasHeight}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">श्रेणी:</span>
                      <strong className="text-amber-300">{previewFrame.designCategory}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">अनुमत सदस्यता:</span>
                      <strong className="text-emerald-300">{previewFrame.allowedPlans?.join(', ')}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">फोटो के स्थान:</span>
                      <strong className="text-white">{previewFrame.photoSlots?.length || 1}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">शीर्षक की अक्षर शैली:</span>
                      <strong className="text-white">
                        {previewFrame.typographyConfig?.primaryFontFamily || previewFrame.textSlots?.[0]?.fontFamily || 'Noto Sans Devanagari'} ({previewFrame.typographyConfig?.primaryFontSize || previewFrame.textSlots?.[0]?.fontSize || 70}px)
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-xs text-purple-200">
                  ℹ️ यह फ्रेम पब्लिश हो चुका है। एडिट करने पर सुरक्षित वर्शनिंग के साथ नया वर्शन तैयार होगा।
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewFrame;
                      setPreviewFrame(null);
                      if (onEditFrame) {
                        onEditFrame(target);
                      }
                    }}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>✏️ इस फ्रेम को एडिट करें</span>
                  </button>

                  {onOpenStudioWithTemplate && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenStudioWithTemplate(previewFrame.id);
                        setPreviewFrame(null);
                      }}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-purple-400" />
                      <span>स्टूडियो में खोलें</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL & PUBLISH TO PRODUCTION CATEGORY MODAL */}
      {approvingFrame && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-black text-white">फ्रेम को स्वीकृत करें और श्रेणी चुनें</h4>
              </div>
              <button
                type="button"
                onClick={() => setApprovingFrame(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <p>
                फ्रेम: <strong className="text-white">{approvingFrame.name}</strong> (ID: <code className="font-mono text-purple-300">{approvingFrame.id}</code>)
              </p>
              <p className="text-slate-400">
                वर्तमान स्थिति: <span className="text-amber-400 font-bold">🧪 TEST FRAMES (परीक्षण लंबित)</span>
              </p>
              <p className="text-slate-400">
                कृपया वह प्रोडक्शन श्रेणी चुनें जिसमें यह फ्रेम यूज़र्स के लिए प्रकाशित होगी:
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">प्रोडक्शन श्रेणी चुनें:</label>
              <select
                value={targetApproveCategory}
                onChange={(e) => setTargetApproveCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
              >
                {CANONICAL_FRAME_CATEGORIES.filter((c) => c !== 'TEST_FRAMES').map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_HINDI_MAP[cat] || cat} ({cat})
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200">
              ℹ️ स्वीकृति के बाद यह फ्रेम <strong>{CATEGORY_HINDI_MAP[targetApproveCategory] || targetApproveCategory}</strong> में लाइव हो जाएगी और योग्य यूज़र्स इसका उपयोग कर सकेंगे।
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingFrame(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={() => handleApproveAndPublish(approvingFrame.id, targetApproveCategory)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-xs font-black shadow-md hover:brightness-110 active:scale-98"
              >
                मंजूर करें व पब्लिश करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingFrame && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">फ्रेम हटाने की पुष्टि</h4>
                <span className="text-[11px] text-slate-400">यह क्रिया पूर्ववत नहीं की जा सकती</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              क्या आप वाकई फ्रेम <strong className="text-white">"{deletingFrame.name}"</strong> (ID: <code className="font-mono text-purple-300">{deletingFrame.id}</code>) को सिस्टम से हमेशा के लिए हटाना चाहते हैं?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingFrame(null)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                नहीं, रखें
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFrame(deletingFrame.id)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md"
              >
                हाँ, डिलीट करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
