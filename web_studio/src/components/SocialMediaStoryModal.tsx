import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Star,
  Lock,
  Crown,
  Share2,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Type,
  Check,
  AlertTriangle,
  ExternalLink,
  Film,
  ZoomIn,
  RefreshCw,
  Palette,
  CheckCircle2,
} from 'lucide-react';
import {
  DynamicFrameTemplate,
  DynamicPlanTier,
  UserStoryPreference,
} from '../types/dynamicFrame';
import {
  getLocalDynamicFrames,
  fetchDynamicFramesFromApi,
  isPlanEligibleForFrame,
  normalizeDynamicPlanTier,
  getLocalPrimaryStoryFrameId,
  savePrimaryStoryPreferenceApi,
  DEFAULT_DYNAMIC_FRAMES,
} from '../lib/dynamicFramesManager';
import { getUserSubscription } from '../lib/userPlanManager';
import { downloadCanvas } from '../lib/CanvasExporter';
import { getApiBaseUrl } from '../lib/apiConfig';
import { BUILTIN_RIBBONS } from '../lib/ribbonPresets';

export interface SocialMediaStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  newsPost: {
    id: string;
    title?: string;
    headline?: string;
    summary?: string;
    fullContent?: string;
    content?: string;
    imageUrl?: string;
    image?: string;
    images?: string[];
    location?: string;
    district?: string;
    category?: string;
    author?: string;
    sourceChannel?: string;
  } | null;
  currentUser?: any;
  onOpenStudioWithStory?: (storyConfig: any) => void;
  onNavigateToPlans?: () => void;
}

export const SocialMediaStoryModal: React.FC<SocialMediaStoryModalProps> = ({
  isOpen,
  onClose,
  newsPost,
  currentUser,
  onOpenStudioWithStory,
  onNavigateToPlans,
}) => {
  const [frames, setFrames] = useState<DynamicFrameTemplate[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<DynamicFrameTemplate | null>(null);
  const [primaryFrameId, setPrimaryFrameId] = useState<string>('df_story_9_16_standard');
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  // Story Customization State
  const [customHeadline, setCustomHeadline] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');
  const [speakerName, setSpeakerName] = useState('मुख्यमंत्री / प्रवक्ता');
  const [speakerDesignation, setSpeakerDesignation] = useState('मध्य प्रदेश शासन');
  const [photoScale, setPhotoScale] = useState(1);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);

  // Generation / Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine user's effective plan tier
  const userSub = getUserSubscription(currentUser?.email);
  const rawTier = currentUser?.plan || currentUser?.tier || userSub?.plan || 'BASIC';
  const userPlanTier: DynamicPlanTier = normalizeDynamicPlanTier(rawTier);

  // Initialize or reload frames and story preference
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      const allFrames = await fetchDynamicFramesFromApi('9:16');
      const storyFrames = allFrames.filter((f) => f.aspectRatio === '9:16' && f.publicationStatus === 'published');
      setFrames(storyFrames.length > 0 ? storyFrames : DEFAULT_DYNAMIC_FRAMES.filter((f) => f.aspectRatio === '9:16'));

      const prefId = getLocalPrimaryStoryFrameId(currentUser?.email || currentUser?.userId);
      setPrimaryFrameId(prefId || 'df_story_9_16_standard');

      // Select primary frame by default or the first 9:16 frame
      const initial = storyFrames.find((f) => f.id === prefId) || storyFrames[0] || DEFAULT_DYNAMIC_FRAMES[3];
      setSelectedFrame(initial);
    };

    loadData();
  }, [isOpen, currentUser?.email, currentUser?.userId]);

  // Sync post content into editable fields
  useEffect(() => {
    if (newsPost) {
      setCustomHeadline(newsPost.headline || newsPost.title || 'ताज़ा खबर यहाँ दिखाई देगी');
      setCustomLocation(newsPost.location || newsPost.district || 'मध्य प्रदेश');
      setCustomPhotoUrl(newsPost.imageUrl || newsPost.image || (newsPost.images && newsPost.images[0]) || '/assets/preview_placeholder.jpg');
    }
  }, [newsPost]);

  // Is current frame eligible for user?
  const isEligible = selectedFrame ? isPlanEligibleForFrame(userPlanTier, selectedFrame.allowedPlans) : false;
  const isPrimary = selectedFrame?.id === primaryFrameId;

  // Handle Mark as Primary Story
  const handleTogglePrimary = async () => {
    if (!selectedFrame) return;
    setIsSettingPrimary(true);
    try {
      const targetId = selectedFrame.id;
      setPrimaryFrameId(targetId);
      const email = currentUser?.email || currentUser?.userId || 'default';
      await savePrimaryStoryPreferenceApi(targetId, email);
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // Render high-res Canvas (1080 x 1920) for preview and export
  useEffect(() => {
    if (!isOpen || !selectedFrame || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const renderStory = async () => {
      // 1. Draw Canvas Background
      const bgColor = selectedFrame.backgroundColor || '#0F172A';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, 1080, 1920);

      // If background image exists
      if (selectedFrame.backgroundImageUrl) {
        try {
          const bgImg = await loadImage(selectedFrame.backgroundImageUrl);
          if (!isCancelled && bgImg) {
            ctx.drawImage(bgImg, 0, 0, 1080, 1920);
          }
        } catch {
          // ignore bg image load error
        }
      }

      // 2. Draw Photo Slot(s)
      const isStatement = selectedFrame.statementConfig?.isStatementFrame || selectedFrame.designCategory === 'बयानबाजी';

      for (const slot of selectedFrame.photoSlots) {
        const slotRect = {
          x: (slot.rect.x / 100) * 1080,
          y: (slot.rect.y / 100) * 1920,
          w: (slot.rect.width / 100) * 1080,
          h: (slot.rect.height / 100) * 1920,
        };

        const imgUrl = customPhotoUrl || '/assets/preview_placeholder.jpg';
        try {
          const photo = await loadImage(imgUrl);
          if (isCancelled) return;

          ctx.save();
          ctx.beginPath();
          ctx.rect(slotRect.x, slotRect.y, slotRect.w, slotRect.h);
          ctx.clip();

          // Calculate aspect ratio cover
          const pAspect = photo.width / photo.height;
          const sAspect = slotRect.w / slotRect.h;
          let drawW = slotRect.w;
          let drawH = slotRect.h;
          let offX = slotRect.x;
          let offY = slotRect.y;

          if (pAspect > sAspect) {
            drawW = slotRect.h * pAspect * photoScale;
            drawH = slotRect.h * photoScale;
            offX = slotRect.x + (slotRect.w - drawW) / 2;
            offY = slotRect.y + (slotRect.h - drawH) / 2 + photoOffsetY;
          } else {
            drawW = slotRect.w * photoScale;
            drawH = (slotRect.w / pAspect) * photoScale;
            offX = slotRect.x + (slotRect.w - drawW) / 2;
            offY = slotRect.y + (slotRect.h - drawH) / 2 + photoOffsetY;
          }

          ctx.drawImage(photo, offX, offY, drawW, drawH);

          // Subtle gradient overlay at bottom of photo for text legibility
          if (slot.slotType === 'normal') {
            const grad = ctx.createLinearGradient(slotRect.x, slotRect.y + slotRect.h * 0.5, slotRect.x, slotRect.y + slotRect.h);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.85)');
            ctx.fillStyle = grad;
            ctx.fillRect(slotRect.x, slotRect.y + slotRect.h * 0.5, slotRect.w, slotRect.h * 0.5);
          }

          ctx.restore();
        } catch {
          // Draw clean photo placeholder if failed
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(slotRect.x, slotRect.y, slotRect.w, slotRect.h);
          ctx.fillStyle = '#94A3B8';
          ctx.font = '28px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('फ़ोटो लोड हो रही है...', slotRect.x + slotRect.w / 2, slotRect.y + slotRect.h / 2);
        }
      }

      // 3. Draw Header (Logo + Location Pill)
      const headerCfg = selectedFrame.headerConfig;
      if (headerCfg?.showLogo !== false) {
        const logoRect = headerCfg?.logoRect
          ? {
              x: (headerCfg.logoRect.x / 100) * 1080,
              y: (headerCfg.logoRect.y / 100) * 1920,
              w: (headerCfg.logoRect.width / 100) * 1080,
              h: (headerCfg.logoRect.height / 100) * 1920,
            }
          : { x: 50, y: 50, w: 260, h: 100 };

        // Draw Channel Logo Badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(logoRect.x, logoRect.y, logoRect.w, logoRect.h, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 34px "Noto Sans Devanagari", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(currentUser?.channelName || 'BREAKING NEWS', logoRect.x + 20, logoRect.y + logoRect.h / 2 + 10);
      }

      if (headerCfg?.showLocation !== false && customLocation) {
        const locRect = headerCfg?.locationRect
          ? {
              x: (headerCfg.locationRect.x / 100) * 1080,
              y: (headerCfg.locationRect.y / 100) * 1920,
              w: (headerCfg.locationRect.width / 100) * 1080,
              h: (headerCfg.locationRect.height / 100) * 1920,
            }
          : { x: 50, y: 170, w: 320, h: 60 };

        ctx.fillStyle = 'rgba(220, 38, 38, 0.95)'; // Vivid red pill
        ctx.beginPath();
        ctx.roundRect(locRect.x, locRect.y, locRect.w, locRect.h, 30);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px "Noto Sans Devanagari", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`📍 ${customLocation}`, locRect.x + locRect.w / 2, locRect.y + locRect.h / 2 + 9);
      }

      // 4. Draw Ribbon (if enabled)
      if (selectedFrame.ribbonConfig && selectedFrame.ribbonConfig.ribbonType !== 'none') {
        const ribbonR = selectedFrame.ribbonConfig.rect;
        const rx = (ribbonR.x / 100) * 1080;
        const ry = (ribbonR.y / 100) * 1920;
        const rw = (ribbonR.width / 100) * 1080;
        const rh = (ribbonR.height / 100) * 1920;

        // 3D Ribbon gradient
        const ribGrad = ctx.createLinearGradient(rx, ry, rx + rw, ry);
        ribGrad.addColorStop(0, '#B91C1C');
        ribGrad.addColorStop(0.5, '#EF4444');
        ribGrad.addColorStop(1, '#991B1B');

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = ribGrad;
        ctx.beginPath();
        ctx.roundRect(rx, ry, rw, rh, 12);
        ctx.fill();
        ctx.restore();

        // Ribbon text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 42px "Noto Sans Devanagari", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(selectedFrame.ribbonConfig.customRibbonText || '🔥 बड़ी खबर', rx + rw / 2, ry + rh / 2 + 14);
      }

      // 5. Draw Headline and Text Slots
      for (const tSlot of selectedFrame.textSlots) {
        const tx = (tSlot.rect.x / 100) * 1080;
        const ty = (tSlot.rect.y / 100) * 1920;
        const tw = (tSlot.rect.width / 100) * 1080;
        const th = (tSlot.rect.height / 100) * 1920;

        // If slot has background color plate
        if (tSlot.backgroundColor && tSlot.backgroundColor !== 'transparent') {
          ctx.fillStyle = tSlot.backgroundColor;
          ctx.beginPath();
          ctx.roundRect(tx, ty, tw, th, 16);
          ctx.fill();
        }

        if (tSlot.role === 'headline') {
          ctx.fillStyle = tSlot.textColor || '#FFFFFF';
          const fontSize = Math.min(tSlot.fontSize || 64, 68);
          ctx.font = `bold ${fontSize}px "Noto Sans Devanagari", sans-serif`;
          ctx.textAlign = tSlot.alignment || 'left';

          // Wrap headline text
          const lines = wrapText(ctx, customHeadline, tw - 40, tSlot.maxLines || 3);
          const lineHeight = fontSize * (tSlot.lineHeight || 1.3);
          let startY = ty + 40 + fontSize;

          for (const line of lines) {
            const drawX = tSlot.alignment === 'center' ? tx + tw / 2 : tx + 20;
            ctx.fillText(line, drawX, startY);
            startY += lineHeight;
          }
        } else if (tSlot.role === 'quote') {
          // Statement Quote
          ctx.fillStyle = tSlot.textColor || '#F8FAFC';
          ctx.font = 'bold 54px "Noto Sans Devanagari", sans-serif';
          ctx.textAlign = 'left';

          const quoteText = `“ ${customHeadline} ”`;
          const lines = wrapText(ctx, quoteText, tw - 40, tSlot.maxLines || 4);
          let startY = ty + 60;
          for (const line of lines) {
            ctx.fillText(line, tx + 20, startY);
            startY += 70;
          }
        } else if (tSlot.role === 'speaker_name') {
          ctx.fillStyle = tSlot.textColor || '#FFE600'; // Gold accent
          ctx.font = 'bold 44px "Noto Sans Devanagari", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(speakerName, tx + 20, ty + 50);
        } else if (tSlot.role === 'speaker_designation') {
          ctx.fillStyle = tSlot.textColor || '#CBD5E1';
          ctx.font = '30px "Noto Sans Devanagari", sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(speakerDesignation, tx + 20, ty + 40);
        }
      }

      // 6. PERMANENT PREDEFINED FOOTER (Canvas Bottom Protected: 1080 x 125 px)
      // Height: ~6.5% of 1920 = 125px
      const footerH = 125;
      const footerY = 1920 - footerH;

      ctx.save();
      // Footer background
      ctx.fillStyle = selectedFrame.footerConfig.footerBgColor || '#0B0F19';
      ctx.fillRect(0, footerY, 1080, footerH);

      // Top glowing separator line
      const lineGrad = ctx.createLinearGradient(0, footerY, 1080, footerY);
      lineGrad.addColorStop(0, '#DC2626');
      lineGrad.addColorStop(0.5, '#EAB308');
      lineGrad.addColorStop(1, '#DC2626');
      ctx.fillStyle = lineGrad;
      ctx.fillRect(0, footerY, 1080, 5);

      // Footer Content: Left Channel Name & Logo
      ctx.fillStyle = selectedFrame.footerConfig.footerTextColor || '#FFFFFF';
      ctx.font = 'bold 32px "Noto Sans Devanagari", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`⚡ ${currentUser?.channelName || 'AI NEWS MAKER'}`, 40, footerY + 70);

      // Footer Content: Right Protected Platform Badge
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('POWERED BY AINEWSMAKER.ONLINE', 1040, footerY + 68);

      // Small secondary text
      ctx.fillStyle = '#94A3B8';
      ctx.font = '19px "Noto Sans Devanagari", sans-serif';
      ctx.fillText('सत्यापित डिजिटल समाचार नेटवर्क', 1040, footerY + 98);

      ctx.restore();
    };

    renderStory();

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    selectedFrame,
    customHeadline,
    customLocation,
    customPhotoUrl,
    speakerName,
    speakerDesignation,
    photoScale,
    photoOffsetY,
    currentUser,
  ]);

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = src;
    });
  };

  // Helper to wrap text
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
        if (lines.length >= maxLines - 1) {
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    return lines;
  };

  // Handle Export / Download Story
  const handleExportStory = async () => {
    if (!selectedFrame || !canvasRef.current) return;
    setExportError(null);

    // Double-check backend authorization endpoint
    setIsExporting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const authRes = await fetch(`${baseUrl}/api/dynamic-frames/verify-export-permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameId: selectedFrame.id,
          userTier: userPlanTier,
          email: currentUser?.email,
        }),
      });

      const authData = await authRes.json();
      if (!authRes.ok || !authData.allowed) {
        setExportError(authData.error || `यह फ्रेम ${selectedFrame.allowedPlans.join(', ')} प्लान के लिए आरक्षित है।`);
        return;
      }

      // Generate Download from Canvas
      const cleanTitle = (newsPost?.title || 'story').replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, '_').slice(0, 30);
      const filename = `Story_${cleanTitle}_${Date.now()}.png`;
      await downloadCanvas(canvasRef.current, filename, 'image/png', 0.98);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err: any) {
      console.error('Story export error:', err);
      setExportError(err.message || 'स्टोरी डाउनलोड करने में विफल');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Open in Graphic Studio
  const handleOpenStudio = () => {
    if (onOpenStudioWithStory && selectedFrame) {
      onOpenStudioWithStory({
        frameId: selectedFrame.id,
        aspectRatio: '9:16',
        headline: customHeadline,
        location: customLocation,
        imageUrl: customPhotoUrl,
        speakerName,
        speakerDesignation,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-600 to-indigo-600 text-white shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  सोशल मीडिया स्टोरी जनरेटर (9:16)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Instagram • Facebook • WhatsApp
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-lg">
                खबर से 1080×1920 वर्टिकल स्टोरी बनाएं और अपने दर्शकों तक तुरंत पहुँचाएं।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="बंद करें"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left 9:16 Canvas Preview + Right Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-y-auto flex-1">
          {/* LEFT: 9:16 Story Canvas Preview (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-950/90 rounded-xl p-3 border border-slate-800">
            <div className="relative w-full max-w-[340px] aspect-[9/16] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700/60 flex items-center justify-center">
              {/* Actual High-Res Canvas Scaled Responsively */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                style={{ aspectRatio: '9/16' }}
              />

              {/* Locked Badge Overlay if Frame is Not Eligible */}
              {!isEligible && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 pointer-events-none">
                  <div className="p-3 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 mb-2">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">प्रीमियम स्टोरी फ्रेम</h4>
                  <p className="text-xs text-amber-200/90 font-medium max-w-[200px]">
                    यह फ्रेम {selectedFrame?.allowedPlans.join(', ')} प्लान में उपलब्ध है।
                  </p>
                </div>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between w-full max-w-[340px] px-1 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                1080 × 1920 Ultra HD
              </span>
              <span>स्थाई फुटर सुरक्षित ✓</span>
            </div>
          </div>

          {/* RIGHT: Controls & Frame Selection (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* News Post Context Snippet */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {newsPost?.category || 'ताज़ा समाचार'}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-100 line-clamp-2">
                  {customHeadline}
                </h3>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>📍 {customLocation}</span>
                  <span>•</span>
                  <span>आईडी: #{newsPost?.id?.slice(0, 8)}</span>
                </p>
              </div>

              {selectedFrame && (
                <button
                  type="button"
                  onClick={handleTogglePrimary}
                  disabled={isSettingPrimary}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                    isPrimary
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title="इसे अपनी प्राथमिक स्टोरी फ्रेम के रूप में सेट करें"
                >
                  <Star className={`w-3.5 h-3.5 ${isPrimary ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
                  <span>{isPrimary ? 'मेरी प्राथमिक स्टोरी' : 'प्राथमिक बनाएं'}</span>
                </button>
              )}
            </div>

            {/* Frame Selector Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-pink-400" />
                  9:16 स्टोरी फ्रेम चुनें ({frames.length})
                </label>
                <span className="text-[11px] text-slate-400">
                  वर्तमान प्लान: <strong className="text-indigo-400">{userPlanTier}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[160px] overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/80">
                {frames.map((frame) => {
                  const eligible = isPlanEligibleForFrame(userPlanTier, frame.allowedPlans);
                  const isCurPrimary = frame.id === primaryFrameId;
                  const isSelected = selectedFrame?.id === frame.id;

                  return (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => setSelectedFrame(frame)}
                      className={`relative flex flex-col items-center p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30'
                          : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800'
                      }`}
                    >
                      {/* Star Badge for Primary */}
                      {isCurPrimary && (
                        <span className="absolute top-1.5 left-1.5 p-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40" title="प्राथमिक स्टोरी">
                          <Star className="w-3 h-3 fill-amber-400" />
                        </span>
                      )}

                      {/* Lock Icon if not eligible */}
                      {!eligible && (
                        <span className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-950/90 text-amber-400 border border-amber-500/30" title="प्लान अपग्रेड आवश्यक">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}

                      <div className="w-full h-16 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden mb-1.5 border border-slate-700/50">
                        {frame.previewImageUrl ? (
                          <img
                            src={frame.previewImageUrl}
                            alt={frame.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Film className="w-6 h-6 text-slate-500" />
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-slate-200 line-clamp-1 w-full text-center">
                        {frame.name}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 mt-0.5">
                        {frame.allowedPlans[0] || 'BASIC'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plan Lock Alert Banner (Strict Requirement) */}
            {!isEligible && selectedFrame && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/15 to-orange-500/10 border-2 border-amber-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300">
                      यह फ्रेम {selectedFrame.allowedPlans.join(', ')} प्लान के लिए उपलब्ध है।
                    </h4>
                    <p className="text-[11px] text-amber-200/80">
                      इस डिजाइन का उपयोग करने के लिए अपना प्लान अपग्रेड करें।
                    </p>
                  </div>
                </div>

                {onNavigateToPlans && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToPlans();
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>अपग्रेड करें</span>
                  </button>
                )}
              </div>
            )}

            {/* Story Content Customizer */}
            <div className="space-y-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-indigo-400" />
                स्टोरी विवरण संपादित करें
              </span>

              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">हेडलाइन टेक्स्ट:</label>
                  <input
                    type="text"
                    value={customHeadline}
                    onChange={(e) => setCustomHeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="स्टोरी हेडलाइन यहाँ लिखें..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">स्थान (Location):</label>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                      placeholder="भोपाल, मध्य प्रदेश"
                    />
                  </div>

                  {selectedFrame?.statementConfig?.isStatementFrame && (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">वक्ता का नाम:</label>
                      <input
                        type="text"
                        value={speakerName}
                        onChange={(e) => setSpeakerName(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="नेता / अधिकारी का नाम"
                      />
                    </div>
                  )}
                </div>

                {/* Photo Zoom and Offset adjustments */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>फ़ोटो ज़ूम:</span>
                      <span>{Math.round(photoScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="2.0"
                      step="0.05"
                      value={photoScale}
                      onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>फ़ोटो स्थिति (Y):</span>
                      <span>{photoOffsetY}px</span>
                    </div>
                    <input
                      type="range"
                      min="-200"
                      max="200"
                      step="10"
                      value={photoOffsetY}
                      onChange={(e) => setPhotoOffsetY(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error or Success Toast */}
            {exportError && (
              <div className="p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{exportError}</span>
              </div>
            )}

            {exportSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>स्टोरी सफलतापूर्वक डाउनलोड हो गई (1080×1920 HD)!</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-auto pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handleExportStory}
                disabled={!isEligible || isExporting}
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isEligible && !isExporting
                    ? 'bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-600/20 cursor-pointer active:scale-98'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-70'
                }`}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>स्टोरी तैयार हो रही है...</span>
                  </>
                ) : !isEligible ? (
                  <>
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>यह फ्रेम लॉक है (अपग्रेड आवश्यक)</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>स्टोरी डाउनलोड करें (1080×1920)</span>
                  </>
                )}
              </button>

              {onOpenStudioWithStory && (
                <button
                  type="button"
                  onClick={handleOpenStudio}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>स्टूडियो में खोलें</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
