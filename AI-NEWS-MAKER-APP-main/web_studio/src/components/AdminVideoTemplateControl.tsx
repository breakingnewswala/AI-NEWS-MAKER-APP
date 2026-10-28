import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  VideoFrameDefinition,
  VIDEO_FRAME_DEFINITIONS,
  getAllVideoFrames,
} from '../lib/videoTemplatesRegistry';
import { getApiUrl } from '../lib/apiConfig';

interface AdminVideoTemplateControlProps {
  onOpenStudioWithVideoFrame?: (frameId: string) => void;
}

export const AdminVideoTemplateControl: React.FC<AdminVideoTemplateControlProps> = ({
  onOpenStudioWithVideoFrame,
}) => {
  const [selectedRatio, setSelectedRatio] = useState<'all' | '9:16' | '1:1' | '4:3' | '4:5'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [frames, setFrames] = useState<VideoFrameDefinition[]>(() => VIDEO_FRAME_DEFINITIONS);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [successToast, setSuccessToast] = useState<{ id: string; msg: string } | null>(null);
  const [isAddingFrame, setIsAddingFrame] = useState(false);

  // New Frame Drawer State
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameRatio, setNewFrameRatio] = useState<'9:16' | '1:1' | '4:3' | '4:5'>('9:16');
  const [newFrameTier, setNewFrameTier] = useState<string>('BASIC');
  const [newFrameCoinPrice, setNewFrameCoinPrice] = useState<number>(0);
  const [newFrameLines, setNewFrameLines] = useState<number>(2);

  // Fetch persisted configs on mount
  useEffect(() => {
    fetch(getApiUrl('/api/template-configs'))
      .then((res) => res.json())
      .then((data) => {
        if (data && data.configs) {
          setConfigs(data.configs);
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (id: string, msg: string) => {
    setSuccessToast({ id, msg });
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSaveFrameConfig = async (frame: VideoFrameDefinition, updates: Partial<any>) => {
    const currentCfg = configs[frame.id] || {};
    const newCfg = {
      ...currentCfg,
      templateId: frame.id,
      selectedTier: updates.tierEligibility || currentCfg.selectedTier || frame.tierEligibility || 'BASIC',
      coinPrice: updates.coinPrice !== undefined ? updates.coinPrice : (currentCfg.coinPrice !== undefined ? currentCfg.coinPrice : frame.coinPrice || 0),
      isActive: updates.isActive !== undefined ? updates.isActive : (currentCfg.isActive !== undefined ? currentCfg.isActive : frame.isActive),
      customName: updates.nameHi || currentCfg.customName || frame.nameHi,
      category: `Video Frame (${frame.canvasRatio})`,
      canvasRatio: frame.canvasRatio,
    };

    setConfigs((prev) => ({ ...prev, [frame.id]: newCfg }));

    try {
      const res = await fetch(getApiUrl('/api/admin/save-template-config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCfg),
      });
      if (res.ok) {
        showToast(frame.id, '✅ वीडियो फ्रेम कॉन्फ़िगरेशन सुरक्षित!');
      } else {
        showToast(frame.id, '⚠️ स्थानीय रूप से सुरक्षित');
      }
    } catch {
      showToast(frame.id, '⚠️ ऑफ़लाइन सुरक्षित');
    }
  };

  const handleCreateCustomVideoFrame = () => {
    if (!newFrameName.trim()) {
      alert('कृपया फ्रेम का नाम दर्ज करें');
      return;
    }
    const newId = `frame-custom-${Date.now()}`;
    const newDef: VideoFrameDefinition = {
      id: newId,
      name: newFrameName,
      nameHi: newFrameName,
      description: `कस्टम एडमिन वीडियो फ्रेम (${newFrameRatio})`,
      badge: 'कस्टम वीडियो',
      canvasRatio: newFrameRatio,
      supportedModes: newFrameRatio === '9:16' ? ['full_9_16', 'core_4_5'] : ['standard'],
      headline: {
        maxLines: newFrameLines,
        area: 'bottom',
        fontSizeDefault: 28,
        color: '#ffffff',
        backgroundStyle: 'lower_third_dark',
      },
      logo: {
        position: 'top-left',
        boxStyle: 'transparent',
      },
      location: {
        position: 'top-left',
        badgeStyle: 'white_blue_pin',
      },
      videoWindow: {
        aspectRatio: newFrameRatio,
        mode: 'full',
        top: 0,
        bottom: 1,
        left: 0,
        right: 1,
      },
      footer: {
        visible: true,
        style: 'dark_pill_strip',
      },
      tierEligibility: newFrameTier as any,
      coinPrice: newFrameCoinPrice,
      isActive: true,
      isCustom: true,
    };

    setFrames((prev) => [newDef, ...prev]);
    handleSaveFrameConfig(newDef, {
      tierEligibility: newFrameTier,
      coinPrice: newFrameCoinPrice,
      isActive: true,
      nameHi: newFrameName,
    });

    setNewFrameName('');
    setIsAddingFrame(false);
  };

  const filteredFrames = frames.filter((f) => {
    if (selectedRatio !== 'all' && f.canvasRatio !== selectedRatio) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        f.name.toLowerCase().includes(q) ||
        f.nameHi.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Ratio Tabs & Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-xl">
        {/* Ratio selector pills */}
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
            सभी अनुपात ({frames.length})
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
            9:16 रील्स ({frames.filter((f) => f.canvasRatio === '9:16').length})
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
            <Square className="w-3.5 h-3.5 text-yellow-400" />
            1:1 स्क्वायर ({frames.filter((f) => f.canvasRatio === '1:1').length})
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
            <Tv className="w-3.5 h-3.5 text-sky-400" />
            4:3 टीवी ({frames.filter((f) => f.canvasRatio === '4:3').length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedRatio('4:5')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition flex items-center gap-1.5 whitespace-nowrap ${
              selectedRatio === '4:5'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:text-white'
            }`}
          >
            <RectangleHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            4:5 पोर्ट्रेट ({frames.filter((f) => f.canvasRatio === '4:5').length})
          </button>
        </div>

        {/* Search & Add New Frame button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="फ्रेम खोजें..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAddingFrame(!isAddingFrame)}
            className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition shadow-md shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            + नई वीडियो फ्रेम
          </button>
        </div>
      </div>

      {/* Add New Frame Drawer */}
      {isAddingFrame && (
        <div className="p-4 bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-950 border border-red-500/40 rounded-2xl space-y-4 animate-in fade-in duration-200 shadow-2xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-red-400" />
              नई कस्टम वीडियो फ्रेम जोड़ें
            </h4>
            <span className="text-xs text-slate-400">अनुपात: 9:16, 1:1, 4:3, 4:5</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">फ्रेम का नाम:</label>
              <input
                type="text"
                placeholder="उदा. स्पेशल ब्रेकिंग न्यूज़ फ्रेम"
                value={newFrameName}
                onChange={(e) => setNewFrameName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">प्रोजेक्ट अनुपात:</label>
              <select
                value={newFrameRatio}
                onChange={(e) => setNewFrameRatio(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="9:16">9:16 (रील्स / वर्टिकल)</option>
                <option value="1:1">1:1 (स्क्वायर)</option>
                <option value="4:3">4:3 (क्लासिक टीवी)</option>
                <option value="4:5">4:5 (सोशल पोर्ट्रेट)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">पात्रता टियर (Cascading):</label>
              <select
                value={newFrameTier}
                onChange={(e) => setNewFrameTier(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              >
                <option value="BASIC">BASIC (सभी यूज़र्स)</option>
                <option value="ADVANCED">ADVANCE (Advance, Pro, VIP)</option>
                <option value="PRO">PRO (Pro, VIP)</option>
                <option value="VIP DESK">VIP DESK (केवल VIP)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">कॉइन अनलॉक कीमत:</label>
              <input
                type="number"
                min="0"
                step="5"
                value={newFrameCoinPrice}
                onChange={(e) => setNewFrameCoinPrice(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingFrame(false)}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
            >
              रद्द करें
            </button>
            <button
              type="button"
              onClick={handleCreateCustomVideoFrame}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg"
            >
              फ्रेम सुरक्षित करें
            </button>
          </div>
        </div>
      )}

      {/* Video Frames Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFrames.map((frame) => {
          const cfg = configs[frame.id] || {};
          const effectiveTier = cfg.selectedTier || frame.tierEligibility || 'BASIC';
          const effectiveCoinPrice = cfg.coinPrice !== undefined ? cfg.coinPrice : (frame.coinPrice || 0);
          const effectiveIsActive = cfg.isActive !== undefined ? cfg.isActive : frame.isActive;

          return (
            <div
              key={frame.id}
              className={`p-4 bg-slate-900/90 border rounded-2xl flex flex-col justify-between space-y-4 shadow-xl transition-all ${
                effectiveIsActive
                  ? 'border-slate-800 hover:border-red-500/50'
                  : 'border-slate-800/40 opacity-70'
              }`}
            >
              {/* Header: Ratio & Badge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-neutral-950 border border-neutral-700 text-amber-400 flex items-center gap-1">
                    {frame.canvasRatio === '9:16' && <Smartphone className="w-3 h-3 text-red-400" />}
                    {frame.canvasRatio === '1:1' && <Square className="w-3 h-3 text-yellow-400" />}
                    {frame.canvasRatio === '4:3' && <Tv className="w-3 h-3 text-sky-400" />}
                    {frame.canvasRatio === '4:5' && <RectangleHorizontal className="w-3 h-3 text-emerald-400" />}
                    {frame.canvasRatio}
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-950/80 text-red-300 border border-red-500/40">
                    {frame.badge}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-black text-white">{frame.nameHi}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{frame.description}</p>
                  <span className="text-[9px] font-mono text-slate-500 block mt-1">ID: {frame.id}</span>
                </div>

                {/* Specs Pill List */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 bg-slate-800/80 text-slate-300 text-[10px] font-bold rounded">
                    हेडलाइन: {frame.headline.maxLines} पंक्तियाँ ({frame.headline.area})
                  </span>
                  <span className="px-2 py-0.5 bg-slate-800/80 text-slate-300 text-[10px] font-bold rounded">
                    {frame.supportedModes.includes('core_4_5') ? '4:5 Core Crop' : 'Full Visibility'}
                  </span>
                  {frame.footer.visible && (
                    <span className="px-2 py-0.5 bg-slate-800/80 text-slate-300 text-[10px] font-bold rounded">
                      सोशल फुटर
                    </span>
                  )}
                </div>
              </div>

              {/* Controls: Tier, Coin Price, Active Toggle */}
              <div className="pt-3 border-t border-slate-800/80 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {/* Tier Eligibility Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">पात्रता टियर:</label>
                    <select
                      value={effectiveTier}
                      onChange={(e) =>
                        handleSaveFrameConfig(frame, { tierEligibility: e.target.value })
                      }
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="BASIC">BASIC</option>
                      <option value="ADVANCED">ADVANCE</option>
                      <option value="PRO">PRO</option>
                      <option value="VIP DESK">VIP DESK</option>
                    </select>
                  </div>

                  {/* Coin Price */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">कॉइन अनलॉक:</label>
                    <div className="relative flex items-center">
                      <Coins className="w-3 h-3 text-amber-400 absolute left-2 pointer-events-none" />
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={effectiveCoinPrice}
                        onChange={(e) =>
                          handleSaveFrameConfig(frame, {
                            coinPrice: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-full pl-6 pr-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-amber-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action: Active Toggle & Open In Studio */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveFrameConfig(frame, { isActive: !effectiveIsActive })
                    }
                    className="flex items-center gap-1.5 text-xs font-bold cursor-pointer transition text-slate-300 hover:text-white"
                  >
                    {effectiveIsActive ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold text-[11px]">सक्रिय (Active)</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                        <span className="text-slate-500 font-bold text-[11px]">निष्क्रिय (Disabled)</span>
                      </>
                    )}
                  </button>

                  {successToast?.id === frame.id ? (
                    <span className="text-[11px] font-black text-emerald-400 animate-in fade-in">
                      {successToast.msg}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenStudioWithVideoFrame?.(frame.id)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition"
                    >
                      <Eye className="w-3 h-3" />
                      स्टूडियो प्रीव्यू
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
