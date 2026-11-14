import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Sparkles,
  Lock,
  Crown,
  Search,
  Check,
  Eye,
  ToggleLeft,
  ToggleRight,
  Coins,
  Plus,
  Layers,
  Save,
  Tv,
  Smartphone,
  Square,
  RectangleHorizontal,
  Edit2,
  X,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Play,
} from 'lucide-react';
import {
  VideoFrameDefinition,
  VIDEO_FRAME_DEFINITIONS,
} from '../lib/videoTemplatesRegistry';
import { DynamicFrameTemplate } from '../types/dynamicFrame';
import { fetchDynamicFramesFromApi, getLocalDynamicFrames } from '../lib/dynamicFramesManager';
import { getApiUrl } from '../lib/apiConfig';

interface AdminVideoTemplateControlProps {
  onOpenStudioWithVideoFrame?: (frameId: string) => void;
  onEditFrame?: (frame: DynamicFrameTemplate) => void;
}

export const AdminVideoTemplateControl: React.FC<AdminVideoTemplateControlProps> = ({
  onOpenStudioWithVideoFrame,
  onEditFrame,
}) => {
  const [selectedRatio, setSelectedRatio] = useState<'all' | '9:16' | '1:1' | '4:5' | '4:3'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicVideoFrames, setDynamicVideoFrames] = useState<DynamicFrameTemplate[]>([]);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [successToast, setSuccessToast] = useState<{ id: string; msg: string } | null>(null);
  
  // Full Preview Modal State
  const [previewFrame, setPreviewFrame] = useState<{
    id: string;
    name: string;
    aspectRatio: string;
    videoRect: { x: number; y: number; width: number; height: number };
    footerPosition: 'bottom' | 'top';
    locationBadgeUrl?: string;
    watermarkText?: string;
    watermarkLogoUrl?: string;
    headlineMaxLines: number;
    category: string;
    allowedPlans: string[];
    coinPrice: number;
    isActive: boolean;
    version: number;
    rawDynamicFrame?: DynamicFrameTemplate;
  } | null>(null);

  const refreshFrames = () => {
    // 1. Fetch configs
    fetch(getApiUrl('/api/template-configs'))
      .then((res) => res.json())
      .then((data) => {
        if (data && data.configs) {
          setConfigs(data.configs);
        }
      })
      .catch(() => {});

    // 2. Fetch published video frames
    fetchDynamicFramesFromApi({ frameType: 'video' })
      .then((frames) => {
        const videoOnly = (frames || []).filter(
          (f) => f.frameMode === 'video' || f.frameType === 'video'
        );
        setDynamicVideoFrames(videoOnly);
      })
      .catch(() => {
        const locals = getLocalDynamicFrames().filter(
          (f) => f.frameMode === 'video' || f.frameType === 'video'
        );
        setDynamicVideoFrames(locals);
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

  const handleSaveFrameConfig = async (frameId: string, updates: Partial<any>) => {
    const currentCfg = configs[frameId] || {};
    const newCfg = {
      ...currentCfg,
      templateId: frameId,
      selectedTier: updates.tierEligibility || currentCfg.selectedTier || 'BASIC',
      coinPrice: updates.coinPrice !== undefined ? updates.coinPrice : currentCfg.coinPrice || 0,
      isActive: updates.isActive !== undefined ? updates.isActive : currentCfg.isActive !== false,
      customName: updates.nameHi || currentCfg.customName,
    };

    setConfigs((prev) => ({ ...prev, [frameId]: newCfg }));

    try {
      const res = await fetch(getApiUrl('/api/admin/save-template-config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg),
      });
      if (res.ok) {
        showToast(frameId, '✅ वीडियो फ्रेम कॉन्फ़िगरेशन सुरक्षित!');
      } else {
        showToast(frameId, '⚠️ स्थानीय रूप से सुरक्षित');
      }
    } catch {
      showToast(frameId, '⚠️ ऑफ़लाइन सुरक्षित');
    }
  };

  // Canonical Video Frames List: Published Dynamic Video Frames + Video Frame Definitions
  const allVideoItems = useMemo(() => {
    // 1. Dynamic published video frames
    const dynamicItems = dynamicVideoFrames.map((df) => {
      const cfg = configs[df.id] || {};
      const ratio = df.aspectRatio || '9:16';
      const vRect = df.videoConfig?.videoRect || {
        x: 0,
        y: df.videoConfig?.footerPosition === 'top' ? 20 : 12,
        width: 100,
        height: ratio === '4:5' ? 76 : 76,
      };

      return {
        id: df.id,
        name: df.name,
        nameHi: df.name,
        description: df.description || `AI जनरेटेड ${ratio} वीडियो फ्रेम`,
        aspectRatio: ratio as '9:16' | '1:1' | '4:5' | '4:3',
        category: df.designCategory || 'Video Frames',
        previewUrl: df.previewImageUrl || df.sampleReferenceUrl || '',
        version: df.version || 1,
        allowedPlans: (cfg.selectedTier ? [cfg.selectedTier] : df.allowedPlans || ['BASIC']) as string[],
        coinPrice: cfg.coinPrice !== undefined ? cfg.coinPrice : 0,
        isActive: cfg.isActive !== undefined ? cfg.isActive : df.publicationStatus === 'published',
        videoRect: vRect,
        footerPosition: df.videoConfig?.footerPosition || 'bottom',
        locationBadgeUrl: df.videoConfig?.locationBadgeUrl,
        watermarkText: df.videoConfig?.watermarkTextEnabled ? df.videoConfig.watermarkText : undefined,
        watermarkLogoUrl: df.videoConfig?.watermarkLogoEnabled ? df.videoConfig.watermarkLogoUrl : undefined,
        headlineMaxLines: df.videoConfig?.headlineLineCount || 3,
        rawDynamicFrame: df,
      };
    });

    // 2. Built-in video frame definitions (if not overridden)
    const dynamicIds = new Set(dynamicItems.map((d) => d.id));
    const staticItems = VIDEO_FRAME_DEFINITIONS
      .filter((def) => !dynamicIds.has(def.id))
      .map((def) => {
        const cfg = configs[def.id] || {};
        const vWin = def.videoWindow || { top: 0.15, bottom: 0.9, left: 0, right: 1 };
        return {
          id: def.id,
          name: def.name,
          nameHi: cfg.customName || def.nameHi,
          description: def.description,
          aspectRatio: def.canvasRatio as '9:16' | '1:1' | '4:5' | '4:3',
          category: `Video Frame (${def.canvasRatio})`,
          previewUrl: '',
          version: 1,
          allowedPlans: cfg.selectedTier ? [cfg.selectedTier] : [def.tierEligibility || 'BASIC'],
          coinPrice: cfg.coinPrice !== undefined ? cfg.coinPrice : def.coinPrice || 0,
          isActive: cfg.isActive !== undefined ? cfg.isActive : def.isActive,
          videoRect: {
            x: vWin.left * 100,
            y: vWin.top * 100,
            width: (vWin.right - vWin.left) * 100,
            height: (vWin.bottom - vWin.top) * 100,
          },
          footerPosition: (def.footer?.style === 'none' ? 'bottom' : 'bottom') as 'bottom' | 'top',
          locationBadgeUrl: undefined,
          watermarkText: 'AI NEWS MAKER',
          watermarkLogoUrl: undefined,
          headlineMaxLines: def.headline?.maxLines || 2,
          rawDynamicFrame: undefined,
        };
      });

    return [...dynamicItems, ...staticItems];
  }, [dynamicVideoFrames, configs]);

  // Filter video frames strictly by aspect ratio and search query
  const filteredFrames = useMemo(() => {
    return allVideoItems.filter((f) => {
      if (selectedRatio !== 'all' && f.aspectRatio !== selectedRatio) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          f.name.toLowerCase().includes(q) ||
          f.nameHi.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allVideoItems, selectedRatio, searchQuery]);

  const count9_16 = allVideoItems.filter((f) => f.aspectRatio === '9:16').length;
  const count1_1 = allVideoItems.filter((f) => f.aspectRatio === '1:1').length;
  const count4_5 = allVideoItems.filter((f) => f.aspectRatio === '4:5').length;
  const count4_3 = allVideoItems.filter((f) => f.aspectRatio === '4:3').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast.msg}</span>
        </div>
      )}

      {/* Aspect Ratio Filter Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedRatio('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === 'all'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>सभी वीडियो फ्रेम्स ({allVideoItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRatio('9:16')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === '9:16'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            <span>9:16 रील्स ({count9_16})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRatio('1:1')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === '1:1'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-amber-300" />
            <span>1:1 स्क्वायर ({count1_1})</span>
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
            <RectangleHorizontal className="w-3.5 h-3.5 text-purple-300" />
            <span>4:5 पोर्ट्रेट ({count4_5})</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRatio('4:3')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === '4:3'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-blue-300" />
            <span>4:3 टीवी ({count4_3})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="वीडियो फ्रेम खोजें..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Video Frames Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFrames.map((frame) => {
          return (
            <div
              key={frame.id}
              className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all shadow-md group ${
                frame.isActive
                  ? 'border-slate-800 hover:border-amber-500/50'
                  : 'border-slate-800/40 opacity-70'
              }`}
            >
              <div>
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 truncate max-w-[150px]">
                    {frame.id}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 text-[9.5px] font-black rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      {frame.aspectRatio} वीडियो
                    </span>
                    <span className="px-2 py-0.5 text-[9.5px] font-bold bg-slate-800 text-slate-300 rounded">
                      v{frame.version}
                    </span>
                  </div>
                </div>

                {/* Video Window Preview Box */}
                <div
                  onClick={() => setPreviewFrame(frame)}
                  className="w-full h-36 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden flex flex-col items-center justify-center relative mb-3 group-hover:border-amber-500/30 transition cursor-pointer p-2"
                  title="क्लिक करके वीडियो फ्रेम प्रीव्यू देखें"
                >
                  {/* Visual Video Slot Representation */}
                  <div
                    className="border-2 border-dashed border-amber-500/60 rounded bg-slate-900/80 flex items-center justify-center relative"
                    style={{
                      width: `${frame.videoRect.width * 0.85}%`,
                      height: `${frame.videoRect.height * 0.85}%`,
                    }}
                  >
                    <Play className="w-5 h-5 text-amber-400/80" />
                    <span className="absolute bottom-1 text-[8px] font-bold text-slate-400">मुख्य वीडियो क्षेत्र</span>
                  </div>

                  <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-xs text-[9px] font-bold text-amber-300 border border-amber-500/30">
                    🎥 {frame.aspectRatio}
                  </span>
                  <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-xs text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                    {frame.allowedPlans.join(', ')}
                  </span>
                </div>

                {/* Name & Description */}
                <h5 className="text-sm font-bold text-white line-clamp-1">{frame.nameHi || frame.name}</h5>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {frame.description}
                </p>

                {/* Controls: Tier & Coins */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">टियर एक्सेस:</label>
                    <select
                      value={frame.allowedPlans[0] || 'BASIC'}
                      onChange={(e) => handleSaveFrameConfig(frame.id, { tierEligibility: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white font-bold"
                    >
                      <option value="BASIC">BASIC (All)</option>
                      <option value="ADVANCE">ADVANCE+</option>
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
                      value={frame.coinPrice}
                      onChange={(e) => handleSaveFrameConfig(frame.id, { coinPrice: Number(e.target.value) })}
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
                  onClick={() => handleSaveFrameConfig(frame.id, { isActive: !frame.isActive })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    frame.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {frame.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
                  <span>{frame.isActive ? 'सक्रिय' : 'बंद'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewFrame(frame)}
                    className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>प्रीव्यू</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onEditFrame && frame.rawDynamicFrame) {
                        onEditFrame(frame.rawDynamicFrame);
                      } else if (onEditFrame) {
                        // Virtual dynamic frame in video mode
                        onEditFrame({
                          id: frame.id,
                          name: frame.nameHi || frame.name,
                          aspectRatio: frame.aspectRatio,
                          frameMode: 'video',
                          frameType: 'video',
                          canvasWidth: frame.aspectRatio === '4:3' ? 1440 : 1080,
                          canvasHeight: frame.aspectRatio === '4:5' ? 1350 : frame.aspectRatio === '9:16' ? 1920 : 1080,
                          designCategory: 'Special Frames',
                          allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
                          publicationStatus: 'published',
                          createdBy: 'breakingnewswala.com@gmail.com',
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                          version: frame.version,
                          headerConfig: { showLogo: true, logoPosition: 'top_left', logoRect: { x: 5, y: 3.5, width: 22, height: 9 }, showLocation: true, locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 } },
                          footerConfig: { footerHeightRatio: 0.08, enforcePermanentFooter: true, footerBgColor: '#FFFFFF', footerTextColor: '#000000' },
                          photoSlots: [],
                          textSlots: [{ id: '1', name: 'हेडलाइन', role: 'headline', rect: { x: 7, y: 64, width: 86, height: 26 }, fontFamily: 'Noto Sans Devanagari', fontSize: 70, textColor: '#FFFFFF', alignment: 'center', maxLines: frame.headlineMaxLines, backgroundColor: 'transparent' }],
                          videoConfig: { displayMode: 'fit', videoRect: frame.videoRect, footerPosition: frame.footerPosition },
                          layers: [],
                        });
                      }
                    }}
                    className="py-1 px-2.5 bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-amber-500/40 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>एडिट</span>
                  </button>

                  {onOpenStudioWithVideoFrame && (
                    <button
                      type="button"
                      onClick={() => onOpenStudioWithVideoFrame(frame.id)}
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                      title="वीडियो स्टूडियो में टेस्ट करें"
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

      {filteredFrames.length === 0 && (
        <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-2">
          <Film className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="font-bold text-slate-300">कोई वीडियो फ्रेम नहीं मिला</p>
          <p className="text-[11px] text-slate-500">D. AI Frame Generator से नया वीडियो फ्रेम तैयार करें।</p>
        </div>
      )}

      {/* FULL-SIZE VIDEO FRAME PREVIEW MODAL */}
      {previewFrame && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 border-b border-amber-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-600 text-white shadow-md">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">{previewFrame.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="font-mono text-amber-300">{previewFrame.id}</span>
                    <span>•</span>
                    <span className="font-bold text-red-400">{previewFrame.aspectRatio} वीडियो</span>
                    <span>•</span>
                    <span className="text-emerald-400">संस्करण v{previewFrame.version}</span>
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

            {/* Modal Body: Two Columns */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Visual Video Canvas Rendering */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className="relative rounded-2xl overflow-hidden border-4 border-amber-500/50 shadow-2xl bg-slate-950"
                  style={{
                    width: previewFrame.aspectRatio === '4:5' ? '280px' : previewFrame.aspectRatio === '9:16' ? '240px' : previewFrame.aspectRatio === '1:1' ? '260px' : '300px',
                    height: previewFrame.aspectRatio === '4:5' ? '350px' : previewFrame.aspectRatio === '9:16' ? '426px' : previewFrame.aspectRatio === '1:1' ? '260px' : '225px',
                  }}
                >
                  {/* Top Bar or Top Footer if configured */}
                  {(previewFrame.footerPosition === 'top' || previewFrame.footerPosition === 'header') && (
                    <div className="absolute top-0 inset-x-0 h-6 bg-amber-400 text-slate-950 px-2 flex items-center justify-between text-[7px] font-bold z-30">
                      <span>@breakingnewswala</span>
                      <span>वीडियो न्यूज़ नेटवर्क</span>
                    </div>
                  )}

                  {/* Custom Positioned Footer if configured */}
                  {previewFrame.footerPosition === 'custom' && previewFrame.rawDynamicFrame?.videoConfig?.footerRect && (
                    <div
                      className="absolute bg-slate-900 border border-slate-700 text-amber-300 px-2 flex items-center justify-between text-[7px] font-bold z-30"
                      style={{
                        left: `${previewFrame.rawDynamicFrame.videoConfig.footerRect.x}%`,
                        top: `${previewFrame.rawDynamicFrame.videoConfig.footerRect.y}%`,
                        width: `${previewFrame.rawDynamicFrame.videoConfig.footerRect.width}%`,
                        height: `${previewFrame.rawDynamicFrame.videoConfig.footerRect.height}%`,
                      }}
                    >
                      <span>@breakingnewswala</span>
                      <span>कस्टम फुटर</span>
                    </div>
                  )}

                  {/* Channel Logo */}
                  <div className="absolute top-2 left-2 bg-slate-900/90 border border-white/20 rounded px-1.5 py-0.5 text-[8px] font-black text-white z-20">
                    चैनल लोगो
                  </div>

                  {/* Location Badge */}
                  <div className="absolute top-7 left-2 bg-red-600 rounded-full px-2 py-0.5 text-[8px] font-bold text-white z-20 flex items-center gap-0.5 shadow">
                    <MapPin className="w-2.5 h-2.5" />
                    <span>नई दिल्ली</span>
                  </div>

                  {/* Actual Video Visibility Area */}
                  <div
                    className="absolute bg-slate-900 border border-amber-500/40 overflow-hidden flex items-center justify-center"
                    style={{
                      left: `${previewFrame.videoRect.x}%`,
                      top: `${previewFrame.videoRect.y}%`,
                      width: `${previewFrame.videoRect.width}%`,
                      height: `${previewFrame.videoRect.height}%`,
                    }}
                  >
                    <div className="text-center p-2">
                      <Play className="w-8 h-8 text-amber-400/60 mx-auto mb-1 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 block">मुख्य वीडियो विज़िबिलिटी क्षेत्र</span>
                      <span className="text-[8px] text-slate-500">({previewFrame.aspectRatio} विज़िबल विंडो)</span>
                    </div>

                    {/* Centered Watermark in Video Region */}
                    {previewFrame.watermarkText && (
                      <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                        <span className="text-[8px] font-black text-white/40 tracking-widest uppercase bg-black/30 px-2 py-0.5 rounded">
                          {previewFrame.watermarkText}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Headline Area */}
                  <div className="absolute inset-x-2 bottom-8 z-25 text-center">
                    <div className="bg-red-700 text-white font-bold text-[10px] px-2 py-1 rounded shadow-lg leading-tight">
                      देश भर में मानसून का असर: कई राज्यों में भारी बारिश का अलर्ट जारी
                    </div>
                  </div>

                  {/* Bottom Footer if configured */}
                  {previewFrame.footerPosition === 'bottom' && (
                    <div className="absolute bottom-0 inset-x-0 h-6 bg-slate-900 border-t border-slate-800 text-slate-300 px-2 flex items-center justify-between text-[7px] font-bold z-30">
                      <span>@breakingnewswala</span>
                      <span>डिजिटल वीडियो बुलेटिन</span>
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-2 font-bold">वास्तविक वीडियो फ्रेम लेआउट</span>
              </div>

              {/* Specifications & Edit Actions */}
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2.5">
                  <h5 className="font-bold text-sm text-amber-300">वीडियो फ्रेम विनिर्देश (Video Manifest)</h5>
                  <div className="space-y-1.5 text-slate-300 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">अनुपात (Aspect Ratio):</span>
                      <strong className="text-white">{previewFrame.aspectRatio}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">फुटर स्थिति (Footer Position):</span>
                      <strong className="text-amber-300">{previewFrame.footerPosition === 'top' ? 'शीर्ष (Top / Header)' : 'नीचे (Bottom)'}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">हेडलाइन अधिकतम पंक्तियाँ:</span>
                      <strong className="text-white">{previewFrame.headlineMaxLines} पंक्तियाँ</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">अनुमत प्लान्स:</span>
                      <strong className="text-emerald-300">{previewFrame.allowedPlans.join(', ')}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800">
                      <span className="text-slate-400">वॉटरमार्क स्थिति:</span>
                      <strong className="text-white">
                        {previewFrame.watermarkText ? `सक्रिय ("${previewFrame.watermarkText}")` : 'अक्षम'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-200">
                  ℹ️ यह वीडियो फ्रेम पब्लिश हो चुका है। एडिट करने पर सुरक्षित वर्शनिंग के साथ नया वर्शन तैयार होगा।
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewFrame;
                      setPreviewFrame(null);
                      if (onEditFrame && target.rawDynamicFrame) {
                        onEditFrame(target.rawDynamicFrame);
                      } else if (onEditFrame) {
                        onEditFrame({
                          id: target.id,
                          name: target.name,
                          aspectRatio: target.aspectRatio as any,
                          frameMode: 'video',
                          frameType: 'video',
                          canvasWidth: target.aspectRatio === '4:3' ? 1440 : 1080,
                          canvasHeight: target.aspectRatio === '4:5' ? 1350 : target.aspectRatio === '9:16' ? 1920 : 1080,
                          designCategory: 'Special Frames',
                          allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
                          publicationStatus: 'published',
                          createdBy: 'breakingnewswala.com@gmail.com',
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                          version: target.version,
                          headerConfig: { showLogo: true, logoPosition: 'top_left', logoRect: { x: 5, y: 3.5, width: 22, height: 9 }, showLocation: true, locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 } },
                          footerConfig: { footerHeightRatio: 0.08, enforcePermanentFooter: true, footerBgColor: '#FFFFFF', footerTextColor: '#000000' },
                          photoSlots: [],
                          textSlots: [{ id: '1', name: 'हेडलाइन', role: 'headline', rect: { x: 7, y: 64, width: 86, height: 26 }, fontFamily: 'Noto Sans Devanagari', fontSize: 70, textColor: '#FFFFFF', alignment: 'center', maxLines: target.headlineMaxLines, backgroundColor: 'transparent' }],
                          videoConfig: { displayMode: 'fit', videoRect: target.videoRect, footerPosition: target.footerPosition },
                          layers: [],
                        });
                      }
                    }}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>✏️ इस वीडियो फ्रेम को एडिट करें (Edit & New Version)</span>
                  </button>

                  {onOpenStudioWithVideoFrame && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenStudioWithVideoFrame(previewFrame.id);
                        setPreviewFrame(null);
                      }}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-400" />
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
