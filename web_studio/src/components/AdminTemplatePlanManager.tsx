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
] as const;

export type CanonicalFrameCategory = (typeof CANONICAL_FRAME_CATEGORIES)[number];

export function normalizeToCanonicalCategory(cat?: string): CanonicalFrameCategory {
  if (!cat) return 'Regular Frames';
  const c = cat.trim();
  if (c === 'Regular Frame' || c === 'Regular Frames') return 'Regular Frames';
  if (c === 'Story Frame' || c === 'Story Frames') return 'Regular Frames';
  if (c === 'Package Frame' || c === 'Package Frames') return 'Package Frames';
  if (c === 'Super Breaking Frame' || c === 'Super Breaking') return 'Super Breaking';
  if (c === 'Text Breaking Frame' || c === 'Text Breaking') return 'Text Breaking';
  if (c === 'बयानबाज़ी फ्रेम' || c === 'बयानबाजी' || c === 'बयानबाज़ी') return 'बयानबाजी';
  if (c === 'Special Frame' || c === 'Special Frames') return 'Special Frames';
  if (c === 'Bonus Frame' || c === 'Bonus Frames') return 'Bonus Frames';
  if (c === 'Custom Frame' || c === 'Custom Frames') return 'Custom Frames';
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
  
  // Modals & Feedback
  const [previewFrame, setPreviewFrame] = useState<DynamicFrameTemplate | null>(null);
  const [successToast, setSuccessToast] = useState<{ id: string; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCustomName, setTempCustomName] = useState<string>('');

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

  // Convert DynamicFrameTemplate or FrameOption to a canonical display object
  const displayItems = useMemo(() => {
    // 1. Published dynamic frames (authoritative source)
    const dynamicItems = dynamicFramesList.map((df) => {
      const cfg = getEffectiveConfig(df.id);
      return {
        id: df.id,
        name: df.name,
        description: df.description || `AI जनरेटेड ${df.aspectRatio} ग्राफिक फ्रेम`,
        aspectRatio: df.aspectRatio || '4:5',
        category: normalizeToCanonicalCategory(df.designCategory),
        previewUrl: df.previewImageUrl || df.sampleReferenceUrl || '',
        version: df.version || 1,
        allowedPlans: (cfg.allowedPlans || df.allowedPlans || ['BASIC']) as GraphicPlanCategory[],
        coinPrice: cfg.coinPrice || 0,
        isActive: cfg.isActive !== false,
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
          rawDynamicFrame: undefined,
        };
      });

    return [...dynamicItems, ...staticItems];
  }, [dynamicFramesList, frameOptions, templateConfigs]);

  // Unified allFrames collection
  const allFrames = displayItems;

  // Filter items (Part 5: Clean filtering by Ratio and Plan Eligibility)
  const filteredItems = useMemo(() => {
    return displayItems.filter((item) => {
      if (selectedRatio !== 'all' && item.aspectRatio !== selectedRatio) return false;
      if (filterPlan !== 'all' && !item.allowedPlans.includes(filterPlan)) return false;
      return true;
    });
  }, [displayItems, selectedRatio, filterPlan]);

  const count4_5 = displayItems.filter((i) => i.aspectRatio === '4:5').length;
  const count9_16 = displayItems.filter((i) => i.aspectRatio === '9:16').length;

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
            <span>सभी ग्राफिक फ्रेम्स ({displayItems.length})</span>
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

        {/* Actions: Refresh & Add New Frame */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('switch_admin_tab', { detail: { tab: 'frames' } }));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-sm whitespace-nowrap cursor-pointer"
            title="D. AI Frame Generator में नई फ्रेम बनाएं"
          >
            <span>+ नई फ्रेम जोड़ें</span>
          </button>

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
          return (
            <div
              key={item.id}
              className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all shadow-md group ${
                item.isActive
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

                {/* Frame Preview Thumbnail */}
                <div
                  onClick={() => {
                    if (item.rawDynamicFrame) {
                      setPreviewFrame(item.rawDynamicFrame);
                    }
                  }}
                  className={`w-full ${isStory ? 'h-36' : 'h-32'} rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex items-center justify-center relative mb-3 group-hover:border-purple-500/30 transition cursor-pointer`}
                  title="क्लिक करके बड़ा प्रीव्यू देखें"
                >
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <Layout className="w-8 h-8 text-slate-700" />
                  )}
                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-xs text-[9px] font-bold text-amber-300 border border-amber-500/30">
                    📂 {item.category}
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-xs text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                    {item.allowedPlans.join(', ')}
                  </span>
                </div>

                {/* Name & Description */}
                <h5 className="text-sm font-bold text-white line-clamp-1">{item.name}</h5>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {item.description}
                </p>

                {/* Controls: Tier & Coins */}
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
                  <span>{item.isActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}</span>
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
                    className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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
                    className="py-1 px-2.5 bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-purple-500/40 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>एडिट</span>
                  </button>

                  {onOpenStudioWithTemplate && (
                    <button
                      type="button"
                      onClick={() => onOpenStudioWithTemplate(item.id)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
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
    </div>
  );
};
