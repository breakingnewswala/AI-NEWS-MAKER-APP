import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  Eye,
  Crown,
  Layers,
  Image as ImageIcon,
  RotateCcw,
  AlertTriangle,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Coins,
  CheckCircle2,
  X,
  Smartphone,
  MapPin,
  Type,
  Layout,
  Share2,
} from 'lucide-react';
import { DynamicFrameTemplate, GraphicPlanCategory } from '../types/dynamicFrame';
import {
  fetchDynamicFramesFromApi,
  deleteDynamicFrameFromApi,
  getLocalDynamicFrames,
} from '../lib/dynamicFramesManager';
import { getAuthToken, getApiBaseUrl } from '../lib/apiConfig';
import { CardPreview } from './CardPreview';

export interface AdminStoryTemplateControlProps {
  onOpenStudioWithStory?: (storyId: string) => void;
  onEditFrame?: (frame: DynamicFrameTemplate) => void;
  onNewStoryFrame?: () => void;
}

// 3 Default Starter 9:16 Dummy Story Templates according to User Layout Spec:
// 1. Top Header: Channel Logo + Location badge
// 2. 50% Screen Space: Related news photo
// 3. 30-45% Screen Space: Big bold headline + Subheadline / Brief details
// 4. Bottom Footer: Permanent fixed channel footer
export const STARTER_DUMMY_STORY_TEMPLATES: DynamicFrameTemplate[] = [
  {
    id: 'df_story_starter_classic',
    name: 'क्लासिक 9:16 न्यूज़ स्टोरी (Classic Story)',
    description: 'शीर्ष हेडर (लोगो व लोकेशन), 50% फोटो, 35% बड़ी हेडलाइन व सब-हेडलाइन, नीचे फिक्स फुटर',
    aspectRatio: '9:16',
    frameMode: 'photo',
    designCategory: 'Story Frames',
    publicationStatus: 'published',
    approvalStatus: 'APPROVED',
    allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
    coinPrice: 0,
    backgroundColor: '#090D16',
    headerConfig: {
      showLogo: true,
      logoRect: { x: 4, y: 2.5, width: 22, height: 4 },
      logoScalePct: 100,
      showLocation: true,
      locationRect: { x: 64, y: 2.5, width: 32, height: 3.5 },
      locationBgColor: '#DC2626',
      locationTextColor: '#FFFFFF',
      showDate: true,
      dateRect: { x: 4, y: 0.8, width: 92, height: 1.5 },
      dateTextColor: '#94A3B8',
    },
    photoSlots: [
      {
        id: 'slot_photo_main',
        slotType: 'normal',
        rect: { x: 0, y: 7.5, width: 100, height: 48 },
        aspectRatio: '16:9',
      },
    ],
    textSlots: [
      {
        id: 'slot_headline',
        role: 'headline',
        rect: { x: 5, y: 57.5, width: 90, height: 18 },
        maxLines: 3,
        fontSize: 62,
        lineHeight: 1.25,
        textColor: '#FFFFFF',
        alignment: 'left',
      },
      {
        id: 'slot_subheadline',
        role: 'subheadline',
        rect: { x: 5, y: 77, width: 90, height: 13 },
        maxLines: 3,
        fontSize: 32,
        lineHeight: 1.35,
        textColor: '#CBD5E1',
        alignment: 'left',
      },
    ],
    footerConfig: {
      footerHeightRatio: 0.07,
      footerWidthPct: 100,
      footerAlignment: 'center',
      footerBgColor: '#0F172A',
      footerTextColor: '#FFFFFF',
      enforcePermanentFooter: true,
    },
    version: 1,
  },
  {
    id: 'df_story_starter_breaking',
    name: 'सुपर ब्रेकिंग 9:16 न्यूज़ स्टोरी (Breaking Story)',
    description: 'टॉप ब्रेकिंग रिबन, हेडर लोगो + लोकेशन पिल, 48% फोटो, हाई-इम्पैक्ट रेड हेडलाइन और बॉटम फुटर',
    aspectRatio: '9:16',
    frameMode: 'photo',
    designCategory: 'Story Frames',
    publicationStatus: 'published',
    approvalStatus: 'APPROVED',
    allowedPlans: ['ADVANCED', 'PRO', 'VIP DESK'],
    coinPrice: 5,
    backgroundColor: '#0F0305',
    ribbonConfig: {
      enabled: true,
      rect: { x: 4, y: 1.8, width: 92, height: 3.8 },
      customRibbonText: '🔥 बड़ी खबर • सुपर ब्रेकिंग',
    },
    headerConfig: {
      showLogo: true,
      logoRect: { x: 4, y: 6.2, width: 22, height: 3.8 },
      logoScalePct: 100,
      showLocation: true,
      locationRect: { x: 64, y: 6.2, width: 32, height: 3.5 },
      locationBgColor: '#B91C1C',
      locationTextColor: '#FFFFFF',
    },
    photoSlots: [
      {
        id: 'slot_photo_main',
        slotType: 'normal',
        rect: { x: 0, y: 11, width: 100, height: 46 },
        aspectRatio: '16:9',
      },
    ],
    textSlots: [
      {
        id: 'slot_headline',
        role: 'headline',
        rect: { x: 5, y: 59, width: 90, height: 17 },
        maxLines: 3,
        fontSize: 60,
        lineHeight: 1.25,
        textColor: '#FFE4E6',
        backgroundColor: 'rgba(185, 28, 28, 0.25)',
        alignment: 'left',
      },
      {
        id: 'slot_subheadline',
        role: 'subheadline',
        rect: { x: 5, y: 77.5, width: 90, height: 13 },
        maxLines: 3,
        fontSize: 32,
        lineHeight: 1.35,
        textColor: '#E2E8F0',
        alignment: 'left',
      },
    ],
    footerConfig: {
      footerHeightRatio: 0.075,
      footerWidthPct: 100,
      footerAlignment: 'center',
      footerBgColor: '#1A060A',
      footerTextColor: '#FFFFFF',
      enforcePermanentFooter: true,
    },
    version: 1,
  },
  {
    id: 'df_story_starter_spotlight',
    name: 'प्रीमियम मैगज़ीन 9:16 स्टोरी (Magazine Story)',
    description: 'गोल्डन/येलो एक्सेंट, सेंटर हेडर लोगो, 50% फोटो, विस्तृत सब-हेडलाइन व कॉर्पोरेट फुटर',
    aspectRatio: '9:16',
    frameMode: 'photo',
    designCategory: 'Story Frames',
    publicationStatus: 'published',
    approvalStatus: 'APPROVED',
    allowedPlans: ['PRO', 'VIP DESK'],
    coinPrice: 10,
    backgroundColor: '#030712',
    headerConfig: {
      showLogo: true,
      logoRect: { x: 38, y: 2, width: 24, height: 4.2 },
      logoScalePct: 100,
      showLocation: true,
      locationRect: { x: 4, y: 2.2, width: 28, height: 3.5 },
      locationBgColor: '#EAB308',
      locationTextColor: '#000000',
    },
    photoSlots: [
      {
        id: 'slot_photo_main',
        slotType: 'normal',
        rect: { x: 0, y: 7.2, width: 100, height: 49 },
        aspectRatio: '16:9',
      },
    ],
    textSlots: [
      {
        id: 'slot_headline',
        role: 'headline',
        rect: { x: 5, y: 58, width: 90, height: 18 },
        maxLines: 3,
        fontSize: 64,
        lineHeight: 1.25,
        textColor: '#FDE047',
        alignment: 'left',
      },
      {
        id: 'slot_subheadline',
        role: 'subheadline',
        rect: { x: 5, y: 77.5, width: 90, height: 13.5 },
        maxLines: 3,
        fontSize: 34,
        lineHeight: 1.35,
        textColor: '#F1F5F9',
        alignment: 'left',
      },
    ],
    footerConfig: {
      footerHeightRatio: 0.07,
      footerWidthPct: 100,
      footerAlignment: 'center',
      footerBgColor: '#090D16',
      footerTextColor: '#FDE047',
      enforcePermanentFooter: true,
    },
    version: 1,
  },
];

export const AdminStoryTemplateControl: React.FC<AdminStoryTemplateControlProps> = ({
  onOpenStudioWithStory,
  onEditFrame,
  onNewStoryFrame,
}) => {
  const [dynamicFramesList, setDynamicFramesList] = useState<DynamicFrameTemplate[]>([]);
  const [templateConfigs, setTemplateConfigs] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<'all' | GraphicPlanCategory>('all');
  const [testingFrame, setTestingFrame] = useState<DynamicFrameTemplate | null>(null);
  const [successToast, setSuccessToast] = useState<{ id: string; msg: string } | null>(null);
  const [deletingFrameId, setDeletingFrameId] = useState<string | null>(null);

  const testCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const showToast = (id: string, msg: string) => {
    setSuccessToast({ id, msg });
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      // Fetch 9:16 Dynamic Frames
      const frames = await fetchDynamicFramesFromApi('9:16');
      setDynamicFramesList(frames || []);

      // Fetch template configs
      try {
        const res = await fetch(`${baseUrl}/api/admin/template-configs`);
        if (res.ok) {
          const cfg = await res.json();
          setTemplateConfigs(cfg || {});
        }
      } catch {}
    } catch {
      setDynamicFramesList(getLocalDynamicFrames().filter((f) => f.aspectRatio === '9:16'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('ai_news_dynamic_frames_updated', handleUpdate);
    return () => window.removeEventListener('ai_news_dynamic_frames_updated', handleUpdate);
  }, []);

  // Merge starter dummy templates with dynamic frames
  const displayItems = useMemo(() => {
    const existingIds = new Set(dynamicFramesList.map((f) => f.id));
    const items = [...dynamicFramesList];

    // Seed dummy templates if not already present
    for (const starter of STARTER_DUMMY_STORY_TEMPLATES) {
      if (!existingIds.has(starter.id)) {
        items.push(starter);
      }
    }

    return items.map((f) => {
      const cfg = templateConfigs[f.id] || {};
      return {
        ...f,
        name: cfg.customName || f.name,
        allowedPlans: (cfg.allowedPlans || f.allowedPlans || ['BASIC']) as GraphicPlanCategory[],
        coinPrice: cfg.coinPrice !== undefined ? cfg.coinPrice : f.coinPrice || 0,
        isActive: cfg.isActive !== undefined ? cfg.isActive : true,
      };
    });
  }, [dynamicFramesList, templateConfigs]);

  const filteredItems = useMemo(() => {
    return displayItems.filter((item) => {
      if (filterPlan !== 'all' && !item.allowedPlans.includes(filterPlan)) return false;
      if (
        searchQuery &&
        !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.id.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [displayItems, filterPlan, searchQuery]);

  // Handle plan tier toggle
  const handleTogglePlan = async (frameId: string, plan: GraphicPlanCategory) => {
    const currentCfg = templateConfigs[frameId] || {};
    const currentPlans: GraphicPlanCategory[] = currentCfg.allowedPlans || ['BASIC'];
    let nextPlans: GraphicPlanCategory[];

    if (currentPlans.includes(plan)) {
      if (currentPlans.length === 1) {
        showToast(frameId, '⚠️ कम से कम एक प्लान टियर आवश्यक है');
        return;
      }
      nextPlans = currentPlans.filter((p) => p !== plan);
    } else {
      nextPlans = [...currentPlans, plan];
    }

    const updatedCfg = { ...currentCfg, allowedPlans: nextPlans };
    setTemplateConfigs((prev) => ({ ...prev, [frameId]: updatedCfg }));

    try {
      const token = getAuthToken();
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/admin/template-configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [frameId]: updatedCfg }),
      });
      showToast(frameId, '✓ प्लान एक्सेस अपडेट किया गया');
    } catch {
      showToast(frameId, '⚠️ लोकल में सेव (सर्वर कनेक्शन त्रुटि)');
    }
  };

  // Handle active status toggle
  const handleToggleActive = async (frameId: string, currentActive: boolean) => {
    const currentCfg = templateConfigs[frameId] || {};
    const updatedCfg = { ...currentCfg, isActive: !currentActive };
    setTemplateConfigs((prev) => ({ ...prev, [frameId]: updatedCfg }));

    try {
      const token = getAuthToken();
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/admin/template-configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [frameId]: updatedCfg }),
      });
      showToast(frameId, !currentActive ? '✓ टेम्पलेट सक्रिय किया गया' : '⚠️ टेम्पलेट निष्क्रिय किया गया');
    } catch {
      showToast(frameId, '⚠️ लोकल में सेव');
    }
  };

  // Handle coin price change
  const handleCoinPriceChange = async (frameId: string, coins: number) => {
    const currentCfg = templateConfigs[frameId] || {};
    const updatedCfg = { ...currentCfg, coinPrice: Math.max(0, coins) };
    setTemplateConfigs((prev) => ({ ...prev, [frameId]: updatedCfg }));

    try {
      const token = getAuthToken();
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/admin/template-configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [frameId]: updatedCfg }),
      });
      showToast(frameId, '✓ कॉइन मूल्य अपडेट हुआ');
    } catch {
      showToast(frameId, '⚠️ लोकल में सेव');
    }
  };

  // Delete Frame Handler
  const handleDeleteFrame = async (frameId: string) => {
    if (frameId.startsWith('df_story_starter_')) {
      alert('डिफ़ॉल्ट स्टार्टर स्टोरी टेम्पलेट्स सुरक्षित हैं।');
      return;
    }
    if (!window.confirm('क्या आप इस 9:16 स्टोरी टेम्पलेट को हटाना चाहते हैं?')) return;
    try {
      const token = getAuthToken();
      const success = await deleteDynamicFrameFromApi(frameId, token || undefined);
      if (success) {
        setDynamicFramesList((prev) => prev.filter((f) => f.id !== frameId));
        showToast(frameId, '🗑️ स्टोरी टेम्पलेट हटाया गया');
      } else {
        showToast(frameId, '❌ हटाने में विफल');
      }
    } catch {
      showToast(frameId, '❌ सर्वर त्रुटि');
    } finally {
      setDeletingFrameId(null);
    }
  };

  // Test Canvas Drawing
  useEffect(() => {
    if (!testingFrame || !testCanvasRef.current) return;
    const canvas = testCanvasRef.current;
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw Background
    ctx.fillStyle = testingFrame.backgroundColor || '#090D16';
    ctx.fillRect(0, 0, 1080, 1920);

    // Header Logo Box & Location
    const h = testingFrame.headerConfig;
    if (h?.showLogo !== false && h?.logoRect) {
      const lx = (h.logoRect.x / 100) * 1080;
      const ly = (h.logoRect.y / 100) * 1920;
      const lw = (h.logoRect.width / 100) * 1080;
      const lh = (h.logoRect.height / 100) * 1920;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
      ctx.beginPath();
      ctx.roundRect(lx, ly, lw, lh, 8);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BREAKING', lx + lw / 2, ly + lh / 2 + 10);
    }

    if (h?.showLocation !== false && h?.locationRect) {
      const rx = (h.locationRect.x / 100) * 1080;
      const ry = (h.locationRect.y / 100) * 1920;
      const rw = (h.locationRect.width / 100) * 1080;
      const rh = (h.locationRect.height / 100) * 1920;
      ctx.fillStyle = h.locationBgColor || '#DC2626';
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, rh / 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📍 मध्य प्रदेश', rx + rw / 2, ry + rh / 2 + 8);
    }

    // Photo Area (~50% Space)
    const slot = testingFrame.photoSlots[0];
    const px = slot ? (slot.rect.x / 100) * 1080 : 0;
    const py = slot ? (slot.rect.y / 100) * 1920 : 150;
    const pw = slot ? (slot.rect.width / 100) * 1080 : 1080;
    const ph = slot ? (slot.rect.height / 100) * 1920 : 920;

    const grad = ctx.createLinearGradient(px, py, px, py + ph);
    grad.addColorStop(0, '#1E293B');
    grad.addColorStop(1, '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, pw, ph);

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📸 समाचार फ़ोटो क्षेत्र (50% स्क्रीन स्पेस)', px + pw / 2, py + ph / 2);

    // Headline Area (~30-45% Space)
    const hlSlot = testingFrame.textSlots.find((s) => s.role === 'headline');
    const hlx = hlSlot ? (hlSlot.rect.x / 100) * 1080 : 54;
    const hly = hlSlot ? (hlSlot.rect.y / 100) * 1920 : 1100;
    const hlw = hlSlot ? (hlSlot.rect.width / 100) * 1080 : 972;

    ctx.fillStyle = hlSlot?.textColor || '#FFFFFF';
    ctx.font = `bold ${hlSlot?.fontSize || 60}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('ग्वालियर सबसे प्रदूषित शहर बना,', hlx + 10, hly + 70);
    ctx.fillText('देवउठनी एकादशी की आतिशबाजी', hlx + 10, hly + 145);
    ctx.fillText('के बाद कई शहरों में एयर इंडेक्स 300 पार', hlx + 10, hly + 220);

    // Sub-headline / Details
    const subSlot = testingFrame.textSlots.find((s) => s.role === 'subheadline');
    const subx = subSlot ? (subSlot.rect.x / 100) * 1080 : 54;
    const suby = subSlot ? (subSlot.rect.y / 100) * 1920 : 1480;
    ctx.fillStyle = subSlot?.textColor || '#CBD5E1';
    ctx.font = `500 ${subSlot?.fontSize || 32}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('• वायु प्रदूषण नियंत्रण बोर्ड ने जारी की ताजा एयर क्वालिटी एडवाइजरी।', subx + 10, suby + 40);
    ctx.fillText('• नागरिकों को सुबह व शाम मास्क पहनने और अनावश्यक बाहर न निकलने की सलाह दी गई।', subx + 10, suby + 90);

    // Fixed Footer
    const footerH = (testingFrame.footerConfig.footerHeightRatio || 0.07) * 1920;
    const footerY = 1920 - footerH;
    ctx.fillStyle = testingFrame.footerConfig.footerBgColor || '#0B0F19';
    ctx.fillRect(0, footerY, 1080, footerH);

    ctx.fillStyle = '#DC2626';
    ctx.fillRect(0, footerY, 1080, 5);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔴 AI NEWS MAKER | 🌐 ainewsmaker.online', 40, footerY + footerH / 2 + 8);
    ctx.textAlign = 'right';
    ctx.fillText('📱 WhatsApp: +91 96698 02408', 1040, footerY + footerH / 2 + 8);
  }, [testingFrame]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-xs font-bold text-emerald-200 flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast.msg}</span>
        </div>
      )}

      {/* Header Banner & Specs */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-black text-white">📱 स्टोरी टेम्पलेट कंट्रोल</h3>
            <span className="px-2.5 py-0.5 text-[11px] bg-purple-500/20 text-purple-300 font-bold rounded-full border border-purple-500/40">
              मास्टर एडमिन
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            इंस्टाग्राम, फेसबुक व व्हाट्सएप हेतु 9:16 वर्टिकल स्टोरी टेम्पलेट्स व लेआउट नियंत्रण।
          </p>
        </div>

        {/* CTA: Create New 9:16 Story Frame */}
        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          {onNewStoryFrame && (
            <button
              type="button"
              onClick={onNewStoryFrame}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition active:scale-95 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 text-white shrink-0" />
              <span className="whitespace-nowrap">+ नई 9:16 स्टोरी</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title="रिफ्रेश करें"
          >
            <RefreshCw className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 shrink-0">प्लान फ़िल्टर:</span>
          {(['all', 'BASIC', 'ADVANCED', 'PRO', 'VIP DESK'] as const).map((plan) => (
            <button
              key={plan}
              type="button"
              onClick={() => setFilterPlan(plan)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                filterPlan === plan
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {plan === 'all' ? 'सभी प्लान्स' : plan}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="स्टोरी टेम्पलेट खोजें..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-400"
          />
        </div>
      </div>

      {/* Story Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const isStarter = item.id.startsWith('df_story_starter_');
          return (
            <div
              key={item.id}
              className={`border rounded-2xl p-4 flex flex-col justify-between transition-all bg-slate-900/90 shadow-md ${
                item.isActive ? 'border-purple-500/40 hover:border-purple-400' : 'border-slate-800 opacity-70'
              }`}
            >
              {/* Card Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-black bg-purple-500/20 text-purple-300 rounded border border-purple-500/40">
                        9:16 STORY
                      </span>
                      {isStarter && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">
                          STARTER SPEC
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{item.id}</span>
                    </div>
                    <h4 className="text-sm font-black text-white truncate" title={item.name}>
                      {item.name}
                    </h4>
                  </div>

                  {/* Active Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item.id, Boolean(item.isActive))}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1 shrink-0 ${
                      item.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>{item.isActive ? 'सक्रिय' : 'निष्क्रिय'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">{item.description}</p>

                {/* 9:16 Mini Preview Placeholder */}
                <div className="relative aspect-[9/16] max-h-[220px] mx-auto w-auto bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between p-2 shadow-inner">
                  {/* Top Header Simulation */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[9px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/30">
                      LOGO
                    </span>
                    <span className="text-[9px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>स्थान</span>
                    </span>
                  </div>

                  {/* 50% Photo Simulation */}
                  <div className="w-full h-[48%] bg-slate-800/80 rounded-lg flex items-center justify-center border border-slate-700/60 text-slate-400 text-[10px] font-bold">
                    📸 50% फोटो क्षेत्र
                  </div>

                  {/* Headline Simulation */}
                  <div className="space-y-1 w-full bg-slate-900/60 p-1.5 rounded-lg border border-slate-800">
                    <div className="h-2 bg-slate-300 rounded-sm w-5/6" />
                    <div className="h-2 bg-slate-300 rounded-sm w-4/6" />
                    <div className="h-1.5 bg-slate-500 rounded-sm w-full mt-1" />
                  </div>

                  {/* Footer Simulation */}
                  <div className="w-full bg-slate-900 text-[8px] text-slate-400 py-0.5 px-1 rounded flex justify-between border-t border-red-500">
                    <span>AI NEWS MAKER</span>
                    <span>व्हाट्सएप: 9669802408</span>
                  </div>
                </div>

                {/* Plan Tier Selector */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span>प्लान एक्सेस (Plan Access):</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'] as const).map((plan) => {
                      const isAllowed = item.allowedPlans.includes(plan);
                      return (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => handleTogglePlan(item.id, plan)}
                          className={`py-1 rounded-md text-[9.5px] font-black transition cursor-pointer text-center ${
                            isAllowed
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {plan === 'VIP DESK' ? 'VIP' : plan.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Coin Price */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <span className="font-bold text-slate-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>कॉइन मूल्य:</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={item.coinPrice}
                      onChange={(e) => handleCoinPriceChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-right font-mono font-bold text-amber-400 text-xs focus:outline-hidden focus:border-amber-400"
                    />
                    <span className="text-[10px] text-slate-400">कॉइन्स</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTestingFrame(item)}
                  className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>टेस्ट प्रीव्यू</span>
                </button>

                {onEditFrame && (
                  <button
                    type="button"
                    onClick={() => onEditFrame(item)}
                    className="flex-1 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <span>संपादित करें</span>
                  </button>
                )}

                {!isStarter && (
                  <button
                    type="button"
                    onClick={() => handleDeleteFrame(item.id)}
                    className="p-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 transition cursor-pointer"
                    title="हटाएं"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 9:16 Canonical Test Modal */}
      {testingFrame && (
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-400" />
                <h4 className="text-base font-black text-white">🧪 9:16 स्टोरी टेस्ट प्रीव्यू</h4>
                <span className="text-xs text-slate-400">({testingFrame.name})</span>
              </div>
              <button
                type="button"
                onClick={() => setTestingFrame(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Canvas Preview Container */}
            <div className="flex flex-col items-center justify-center bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="relative w-[240px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500/50">
                <canvas ref={testCanvasRef} className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="text-purple-300 font-bold">✓ लेआउट विनिर्देशन जांच:</div>
              <div>• शीर्ष हेडर: लोगो व स्थान पिल (100% संरेखित)</div>
              <div>• 50% स्क्रीन स्पेस: समाचार फ़ोटो क्षेत्र</div>
              <div>• 35% स्क्रीन स्पेस: बड़ी हेडलाइन + संक्षिप्त विवरण</div>
              <div>• बॉटम: स्थायी निश्चित चैनल फुटर</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setTestingFrame(null)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer transition shadow"
              >
                प्रीव्यू बंद करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
