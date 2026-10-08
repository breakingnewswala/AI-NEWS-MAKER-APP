import React, { useRef, useState, useEffect } from 'react';
import { NewsCardData } from '../types';
import { MapPin, Quote, FileText, Camera } from 'lucide-react';
import { HeaderGraphic } from './HeaderGraphic';
import { FooterGraphic } from './FooterGraphic';
import { TextBreakingBadge } from './TextBreakingBadge';
import { getActiveFooterPng } from '../lib/footerUtils';
import { getActiveHeaderPng } from '../lib/headerUtils';
import { getEffectiveSpeaker, cleanHeadlineText } from '../lib/speakerUtils';
import { getFormattedHindiDate } from '../lib/dateUtils';
import { shouldShowAppWatermark } from '../lib/userPlanManager';

interface CardPreviewProps {
  card: NewsCardData;
  scale?: number;
  className?: string;
  showSafeZone?: boolean;
  onChange?: (updates: Partial<NewsCardData>) => void;
}

const FALLBACK_NEWS_BG = '/assets/placeholder_news_search_square.jpg';

const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.currentTarget;
  target.onerror = null;
  target.src = FALLBACK_NEWS_BG;
};

export const CardPreview: React.FC<CardPreviewProps> = ({ card, scale = 1, className, showSafeZone = false, onChange }) => {
  const isSuperBreaking = card.frameDesign === 'jacket-breaking-red';
  const mainPhotoSrc = (card.images?.main && card.images.main.trim().length > 0)
    ? card.images.main
    : FALLBACK_NEWS_BG;
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomPlateRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const bodyAreaRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(480);
  const [bottomPlateHeight, setBottomPlateHeight] = useState<number>(146);

  // Interactive Movable Ad Box State
  const [isDraggingAd, setIsDraggingAd] = useState(false);
  const [isResizingAd, setIsResizingAd] = useState(false);
  const dragStartRef = useRef<{ target: 'ad1' | 'ad2'; startX: number; startY: number; initX: number; initY: number; initW: number; initH: number } | null>(null);

  const handleAdMouseDown = (e: React.MouseEvent, target: 'ad1' | 'ad2' = 'ad1') => {
    e.stopPropagation();
    if (!onChange) return;
    setIsDraggingAd(true);
    const adObj = target === 'ad2' ? card.epaperSecondAd : card.epaperAd;
    dragStartRef.current = {
      target,
      startX: e.clientX,
      startY: e.clientY,
      initX: adObj?.x ?? (target === 'ad2' ? 52 : 50),
      initY: adObj?.y ?? (target === 'ad2' ? 68 : 60),
      initW: adObj?.width ?? (target === 'ad2' ? 44 : 45),
      initH: adObj?.height ?? (target === 'ad2' ? 22 : 25),
    };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, target: 'ad1' | 'ad2' = 'ad1') => {
    e.stopPropagation();
    if (!onChange) return;
    setIsResizingAd(true);
    const adObj = target === 'ad2' ? card.epaperSecondAd : card.epaperAd;
    dragStartRef.current = {
      target,
      startX: e.clientX,
      startY: e.clientY,
      initX: adObj?.x ?? (target === 'ad2' ? 52 : 50),
      initY: adObj?.y ?? (target === 'ad2' ? 68 : 60),
      initW: adObj?.width ?? (target === 'ad2' ? 44 : 45),
      initH: adObj?.height ?? (target === 'ad2' ? 22 : 25),
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const container = bodyAreaRef.current || contentAreaRef.current;
      if (!dragStartRef.current || !container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaXPercent = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;
      const target = dragStartRef.current.target;
      const curAd = target === 'ad2' ? card.epaperSecondAd : card.epaperAd;

      if (isDraggingAd) {
        const curW = curAd?.width ?? 45;
        const curH = curAd?.height ?? 25;
        const newX = Math.max(0, Math.min(100 - curW, Math.round(dragStartRef.current.initX + deltaXPercent)));
        const newY = Math.max(0, Math.min(100 - curH, Math.round(dragStartRef.current.initY + deltaYPercent)));
        if (target === 'ad2') {
          onChange?.({
            epaperSecondAd: {
              ...(card.epaperSecondAd || ({} as any)),
              x: newX,
              y: newY,
            },
          });
        } else {
          onChange?.({
            epaperAd: {
              ...card.epaperAd!,
              x: newX,
              y: newY,
            },
          });
        }
      } else if (isResizingAd) {
        const curX = curAd?.x ?? 0;
        const curY = curAd?.y ?? 0;
        const newW = Math.max(18, Math.min(100 - curX, Math.round(dragStartRef.current.initW + deltaXPercent)));
        const newH = Math.max(10, Math.min(100 - curY, Math.round(dragStartRef.current.initH + deltaYPercent)));
        if (target === 'ad2') {
          onChange?.({
            epaperSecondAd: {
              ...(card.epaperSecondAd || ({} as any)),
              width: newW,
              height: newH,
            },
          });
        } else {
          onChange?.({
            epaperAd: {
              ...card.epaperAd!,
              width: newW,
              height: newH,
            },
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDraggingAd(false);
      setIsResizingAd(false);
      dragStartRef.current = null;
    };

    if (isDraggingAd || isResizingAd) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingAd, isResizingAd, card.epaperAd, onChange]);

  // Synchronize container width with ResizeObserver for 100% exact 1080px canvas font matching
  useEffect(() => {
    if (!containerRef.current) return;
    const updateW = () => {
      if (containerRef.current) {
        const w = Math.round(containerRef.current.offsetWidth);
        if (w > 0) {
          setContainerWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
        }
      }
    };
    updateW();
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = Math.round(entry.contentRect.width);
        if (newW > 0) {
          setContainerWidth((prev) => (Math.abs(prev - newW) > 2 ? newW : prev));
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!isSuperBreaking) return;
    const updateHeight = () => {
      if (bottomPlateRef.current) {
        const h = Math.round(bottomPlateRef.current.offsetHeight);
        if (h > 0) {
          setBottomPlateHeight((prev) => (Math.abs(prev - h) > 2 ? h : prev));
        }
      }
    };
    updateHeight();
    const timer = setTimeout(updateHeight, 100);
    return () => clearTimeout(timer);
  }, [
    isSuperBreaking,
    card.headline,
    card.formattedHeadline,
    card.headlineFontSize,
    card.showBreakingRibbon,
    card.breakingRibbonOffsetY,
    card.breakingRibbonScale,
    card.socialHandle,
    card.whatsappNumber,
  ]);

  // Exact proportional font size & padding matching CanvasExporter 1080px canvas and exact 20px default preview size
  const previewScale = containerWidth / 1080;
  const canvasTargetFontSize = Math.max(36, Math.min(84, Math.round((card.headlineFontSize || 20) * 2.3)));
  const effectivePreviewFontSize = Math.max(12, Math.min(32, Math.round((card.headlineFontSize || 20) * (containerWidth > 0 ? containerWidth / 420 : 1))));
  const effectivePaddingX = Math.max(10, Math.round(48 * previewScale));
  // Parse formatted headline with [yellow]...[/yellow] or highlightWords, preserving manual lines
  const renderFormattedHeadline = () => {
    const rawUncleaned = card.formattedHeadline || card.headline;
    if (!rawUncleaned) return null;
    const raw = cleanHeadlineText(rawUncleaned);

    const parseLineParts = (textChunk: string) => {
      const yellowRegex = /\[yellow\](.*?)\[\/yellow\]/g;
      const parts: { text: string; isYellow: boolean }[] = [];
      let lastIndex = 0;
      let match;

      while ((match = yellowRegex.exec(textChunk)) !== null) {
        if (match.index > lastIndex) {
          const plain = textChunk.substring(lastIndex, match.index);
          plain.split(/(\s+)/).forEach((word) => {
            if (word) {
              const isHl = card.highlightWords?.some(
                (hw) => hw && (word.includes(hw) || hw.includes(word))
              );
              parts.push({ text: word, isYellow: Boolean(isHl) });
            }
          });
        }
        const highlighted = match[1];
        highlighted.split(/(\s+)/).forEach((word) => {
          if (word) parts.push({ text: word, isYellow: true });
        });
        lastIndex = yellowRegex.lastIndex;
      }

      if (lastIndex < textChunk.length) {
        const tail = textChunk.substring(lastIndex);
        tail.split(/(\s+)/).forEach((word) => {
          if (word) {
            const isHl = card.highlightWords?.some(
              (hw) => hw && (word.includes(hw) || hw.includes(word))
            );
            parts.push({ text: word, isYellow: Boolean(isHl) });
          }
        });
      }

      const isGraphic1 = card.frameDesign === 'graphic_001';
      const isGraphic2 = card.frameDesign === 'graphic_002';
      const isGraphic3 = card.frameDesign === 'graphic_003';
      const isGraphic4 = card.frameDesign === 'graphic_004';
      const isDefault = card.frameDesign === 'jacket-default';
      const isSuperBreaking = card.frameDesign === 'jacket-breaking-red';
      const isTextBreaking = card.frameDesign === 'jacket-text-breaking';
      const isMorning = card.frameDesign === 'jacket-morning';
      const isIvory = isMorning && card.morningDesignStyle === 'editorial-ivory';
      const isEmerald = isMorning && card.morningDesignStyle === 'emerald-zen';
      const isLightTemplate = isGraphic1 || isGraphic2 || isGraphic4 || isDefault || isSuperBreaking || isTextBreaking || isIvory;

      // Base and highlight colors
      const baseTextColor = isGraphic3
        ? '#FFFFFF'
        : (isGraphic1 || isGraphic2 || isGraphic4 || isIvory || isDefault)
        ? '#000000'
        : (isMorning ? '#FFFFFF' : (isLightTemplate ? '#000000' : '#FFFFFF'));

      const highlightColor = isGraphic3
        ? (card.highlightColor && card.highlightColor !== '#DC2626' ? card.highlightColor : '#FFE600')
        : isGraphic4
        ? (card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#DC2626')
        : isGraphic2
        ? (card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#EA580C')
        : isGraphic1
        ? (card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#DC2626')
        : isIvory
        ? (card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#B45309')
        : isEmerald
        ? '#FACC15'
        : isMorning
        ? (card.highlightColor || '#FFE600')
        : isLightTemplate
        ? (card.highlightColor && card.highlightColor !== '#FFE600' ? card.highlightColor : '#DC2626')
        : (card.highlightColor || '#FFE600');

      if (parts.length === 0) {
        return <span style={{ color: baseTextColor }}>{textChunk}</span>;
      }

      return parts.map((part, idx) => (
        <span
          key={idx}
          style={{
            color: part.isYellow ? highlightColor : baseTextColor,
            textShadow: isIvory ? 'none' : (isLightTemplate ? 'none' : '0 2px 8px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.9)'),
          }}
          className={part.isYellow ? 'font-black' : 'font-extrabold'}
        >
          {part.text}
        </span>
      ));
    };

    const manualLines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (manualLines.length > 1) {
      return (
        <span className="block">
          {manualLines.map((mLine, lIdx) => (
            <span key={lIdx} className="block leading-[1.32]">
              {parseLineParts(mLine)}
            </span>
          ))}
        </span>
      );
    }

    return parseLineParts(raw);
  };

  // Aspect ratio class: Graphic Photo News canvas is strictly True 4:5 (1080x1350)
  const aspectClass = 'aspect-[4/5]';

  const getFilterCss = (filters?: typeof card.imageFilters): string => {
    if (!filters) return 'none';
    const { brightness, contrast, saturate, sepia, grayscale } = filters;
    const parts: string[] = [];
    if (brightness !== undefined && brightness !== 100) parts.push(`brightness(${brightness}%)`);
    if (contrast !== undefined && contrast !== 100) parts.push(`contrast(${contrast}%)`);
    if (saturate !== undefined && saturate !== 100) parts.push(`saturate(${saturate}%)`);
    if (sepia !== undefined && sepia > 0) parts.push(`sepia(${sepia}%)`);
    if (grayscale !== undefined && grayscale > 0) parts.push(`grayscale(${grayscale}%)`);
    return parts.length > 0 ? parts.join(' ') : 'none';
  };

  const filterCss = getFilterCss(card.imageFilters);

  const getImageStyle = (pos?: { x: number; y: number; zoom?: number }) => {
    const x = pos?.x ?? 50;
    const y = pos?.y ?? 50;
    const zoom = Math.max(1, pos?.zoom ?? 1);
    return {
      objectPosition: `${x}% ${y}%`,
      transform: zoom > 1 ? `scale(${zoom})` : undefined,
      transformOrigin: `${x}% ${y}%`,
      filter: filterCss !== 'none' ? filterCss : undefined,
    };
  };

  const mainStyle = getImageStyle(card.imagePositions?.main);
  const secondStyle = getImageStyle(card.imagePositions?.second);
  const thirdStyle = getImageStyle(card.imagePositions?.third);
  const fourthStyle = getImageStyle(card.imagePositions?.fourth);
  const insetCircleStyle = getImageStyle(card.imagePositions?.insetCircle);

  // E-Paper authentic newspaper font family resolution
  const getEpaperFontFamily = (family?: string) => {
    switch (family) {
      case 'serif-traditional':
        return "'Noto Serif Devanagari', Georgia, serif";
      case 'serif-martel':
        return "'Martel', Georgia, serif";
      case 'sans-modern':
        return "'Noto Sans Devanagari', sans-serif";
      case 'baloo':
        return "'Baloo 2', cursive, sans-serif";
      default:
        return "'Noto Serif Devanagari', Georgia, serif";
    }
  };

  const epaperFontFamily = getEpaperFontFamily(card.epaperFontFamily);
  const epaperPaperBg = card.epaperTheme === 'pure-white' ? '#FFFFFF' : '#FAF8F2';
  const hasDropCap = card.epaperDropCap !== false;

  return (
    <div
      ref={containerRef}
      id="news-card-container"
      className={`relative w-full mx-auto overflow-hidden rounded-2xl shadow-2xl bg-neutral-900 select-none ${aspectClass} ${card.frameDesign === 'graphic_002' ? 'border-[5px] sm:border-[8px] border-[#EA580C]' : card.frameDesign === 'graphic_004' ? 'border-[4px] sm:border-[6px] border-black bg-white' : ''} ${className || ''}`}
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        aspectRatio: '4 / 5',
      }}
    >
      {/* 1. BACKGROUND PHOTOS ACCORDING TO USER'S SELECTED LAYOUT */}
      {card.frameDesign === 'jacket-morning' ? (
        <div className="absolute inset-0 z-0 bg-neutral-950 overflow-hidden">
          {(card.morningCustomBgUrl || (card.images.main && card.images.main.trim().length > 0)) ? (
            <div className="w-full h-full relative">
              <img
                src={card.morningCustomBgUrl || card.images.main}
                alt="Morning Background"
                className="w-full h-full object-cover transform scale-105"
                crossOrigin="anonymous"
              />
              {/* Subtle top & bottom vignette to protect custom header & footer PNGs */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
              {/* Center subtle soft dark scrim for high typography contrast */}
              <div className="absolute inset-0 bg-black/25 pointer-events-none" />
            </div>
          ) : card.morningBgStyle === 'sunrise' ? (
            <div className="w-full h-full bg-gradient-to-br from-amber-600 via-orange-500 to-amber-800" />
          ) : card.morningBgStyle === 'green-nature' ? (
            <div className="w-full h-full bg-gradient-to-br from-emerald-800 via-teal-900 to-green-950" />
          ) : (
            <div className="w-full h-full relative bg-gradient-to-b from-amber-950/80 via-neutral-950 to-neutral-950 flex items-center justify-center">
              <div className="absolute -top-10 -right-10 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
            </div>
          )}
        </div>
      ) : (card.frameDesign === 'jacket-epaper' || card.frameDesign === 'jacket-default') ? (
        <div className="absolute inset-0 z-0 bg-white overflow-hidden" />
      ) : card.frameDesign === 'jacket-text-breaking' ? (
        <div className="absolute inset-0 z-0 bg-[#F6F7F9] overflow-hidden">
          {card.textBreakingBgStyle === 'custom-image' && card.textBreakingCustomBgUrl ? (
            <img
              src={card.textBreakingCustomBgUrl}
              alt="Custom Breaking Background"
              className="w-full h-full object-cover"
            />
          ) : card.textBreakingBgStyle === 'pure-white' ? (
            <div className="w-full h-full bg-white" />
          ) : card.textBreakingBgStyle === 'dark-news' ? (
            <div className="w-full h-full bg-[#090D16]" />
          ) : (
            <>
              {/* Geometric isometric hexagonal / triangular mesh matching ABP Live sample */}
              <svg className="absolute inset-0 w-full h-full opacity-35 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="text-breaking-mesh" width="60" height="103.92" patternUnits="userSpaceOnUse">
                    <path
                      d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z M30 51.96 L60 69.28 L60 103.92 L30 121.24 L0 103.92 L0 69.28 Z"
                      fill="none"
                      stroke="#CBD5E1"
                      strokeWidth="0.8"
                    />
                    <path
                      d="M30 0 L30 69.28 M0 17.32 L60 51.96 M60 17.32 L0 51.96 M30 51.96 L30 121.24 M0 69.28 L60 103.92 M60 69.28 L0 103.92"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#text-breaking-mesh)" />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-neutral-900/5 pointer-events-none" />
            </>
          )}
        </div>
      ) : (
      <div
        className="absolute inset-x-0 z-0 overflow-hidden bg-neutral-950 transition-all duration-150"
        style={{
          top: card.frameDesign === 'graphic_004' ? '33.2%' : '0px',
          bottom: card.frameDesign === 'graphic_003'
            ? '0px'
            : (card.frameDesign === 'graphic_001' || card.frameDesign === 'graphic_002')
            ? '47%'
            : card.frameDesign === 'graphic_004'
            ? '58px'
            : isSuperBreaking
            ? `${bottomPlateHeight}px`
            : card.frameDesign === 'jacket-quote'
            ? '48%'
            : '84px',
        }}
      >
        {/* Graphic 4 Special Photo Treatment: Supports Dual Photo Collage or Single Photo */}
        {card.frameDesign === 'graphic_004' ? (
          (card.secondaryPhoto || card.images?.secondary || card.images?.second) ? (
            <div className="w-full h-full flex overflow-hidden">
              <div className="w-1/2 h-full overflow-hidden relative border-r-2 border-white">
                <img
                  src={mainPhotoSrc}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-150"
                  style={mainStyle}
                  onError={handleImgError}
                />
              </div>
              <div className="w-1/2 h-full overflow-hidden relative">
                <img
                  src={card.secondaryPhoto || card.images?.secondary || card.images?.second}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-150"
                  onError={handleImgError}
                />
              </div>
            </div>
          ) : card.images?.main && card.images.main.trim().length > 0 && card.images.main !== '/assets/placeholder_news_photo.svg' ? (
            <div className="w-full h-full overflow-hidden relative">
              <img
                src={mainPhotoSrc}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={mainStyle}
                onError={handleImgError}
              />
            </div>
          ) : (
            /* Dual Photo Collage Sample/Placeholder */
            <div className="w-full h-full flex overflow-hidden">
              <div className="w-1/2 h-full bg-gradient-to-br from-slate-700 to-slate-900 border-r-2 border-white flex flex-col items-center justify-center text-center p-2">
                <span className="font-black text-sm sm:text-base text-white font-['Poppins']">PHOTO 1</span>
                <span className="font-bold text-[10px] text-slate-300 font-['Noto_Sans_Devanagari'] mt-0.5">मुख्य संबंधित तस्वीर</span>
              </div>
              <div className="w-1/2 h-full bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center text-center p-2">
                <span className="font-black text-sm sm:text-base text-white font-['Poppins']">PHOTO 2</span>
                <span className="font-bold text-[10px] text-slate-300 font-['Noto_Sans_Devanagari'] mt-0.5">संदर्भ / कार्रवाई तस्वीर</span>
              </div>
            </div>
          )
        ) : null}

        {/* Fade-out at the bottom of the photo into solid black for Quote Template */}
        {card.frameDesign === 'jacket-quote' && (
          <div className="absolute inset-x-0 bottom-0 h-36 sm:h-44 bg-gradient-to-b from-transparent via-black/75 to-black pointer-events-none z-10" />
        )}
        {/* Layout 1: Single Image (Clear, Bright, Prominent) */}
        {card.frameDesign !== 'graphic_004' && (card.layout === 'single' || !card.layout) && (
          <div className="w-full h-full overflow-hidden relative">
            <img
              src={mainPhotoSrc}
              alt="News Photo"
              className="w-full h-full object-cover transition-all duration-150"
              style={mainStyle}
              onError={handleImgError}
            />
          </div>
        )}

        {/* Layout 2: Full Image (Edge to edge with maximum picture visibility) */}
        {card.layout === 'full' && (
          <div className="w-full h-full overflow-hidden relative">
            <img
              src={mainPhotoSrc}
              alt=""
              className="w-full h-full object-cover transition-all duration-150"
              style={mainStyle}
              onError={handleImgError}
            />
          </div>
        )}

        {/* Layout 3A: Double Image (35-65 Up & Down: 35% ऊपर, 65% नीचे) */}
        {card.layout === 'split-v' && (
          <div className="w-full h-full flex flex-col">
            {/* Top Frame: 35% Height */}
            <div className="w-full h-[35%] overflow-hidden relative border-b-2 border-white/40">
              <img
                src={mainPhotoSrc}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={mainStyle}
                onError={handleImgError}
              />
            </div>
            {/* Bottom Frame: 65% Remaining Height with custom crop support */}
            <div className="w-full h-[65%] overflow-hidden relative">
              <img
                src={card.images.second || card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={secondStyle}
                onError={handleImgError}
              />
            </div>
          </div>
        )}

        {/* Layout 3B: Double Image (50-50 Up & Down: 50% आधी ऊपर, 50% आधी नीचे) */}
        {card.layout === 'double' && (
          <div className="w-full h-full flex flex-col">
            {/* Top Frame: 50% Height */}
            <div className="w-full h-[50%] overflow-hidden relative border-b-2 border-white/40">
              <img
                src={card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={mainStyle}
                onError={handleImgError}
              />
            </div>
            {/* Bottom Frame: 50% Height */}
            <div className="w-full h-[50%] overflow-hidden relative">
              <img
                src={card.images.second || card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={secondStyle}
                onError={handleImgError}
              />
            </div>
          </div>
        )}

        {/* Layout 3C: Double Image (50-50 Left & Right: साइड-बाई-साइड) */}
        {(card.layout === 'double-h' || card.layout === 'split-h') && (
          <div className="w-full h-full grid grid-cols-2 gap-0.5">
            <div className="w-full h-full overflow-hidden relative">
              <img
                src={card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={mainStyle}
                onError={handleImgError}
              />
            </div>
            <div className="w-full h-full overflow-hidden relative">
              <img
                src={card.images.second || card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={secondStyle}
                onError={handleImgError}
              />
            </div>
          </div>
        )}

        {/* Layout 4A: Three Image (2 फोटो ऊपर, 1 चौड़ी फोटो नीचे) */}
        {card.layout === 'grid-3' && (
          <div className="w-full h-full flex flex-col gap-0.5">
            <div className="w-full h-[52%] grid grid-cols-2 gap-0.5">
              <div className="w-full h-full overflow-hidden relative">
                <img
                  src={card.images.main}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-150"
                  style={mainStyle}
                  onError={handleImgError}
                />
              </div>
              <div className="w-full h-full overflow-hidden relative">
                <img
                  src={card.images.second || card.images.main}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-150"
                  style={secondStyle}
                  onError={handleImgError}
                />
              </div>
            </div>
            <div className="w-full h-[48%] overflow-hidden relative">
              <img
                src={card.images.third || card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={thirdStyle}
                onError={handleImgError}
              />
            </div>
          </div>
        )}

        {/* Layout 4B: Three Image (1 चौड़ी फोटो ऊपर, 2 फोटो नीचे) */}
        {card.layout === 'grid-3-bottom' && (
          <div className="w-full h-full flex flex-col gap-0.5">
            <div className="w-full h-[48%] overflow-hidden relative">
              <img
                src={card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={mainStyle}
                onError={handleImgError}
              />
            </div>
            <div className="w-full h-[52%] grid grid-cols-2 gap-0.5">
              <div className="w-full h-full overflow-hidden relative">
                <img
                  src={card.images.second || card.images.main}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-150"
                  style={secondStyle}
                  onError={handleImgError}
                />
              </div>
              <div className="w-full h-full overflow-hidden relative">
                <img
                  src={card.images.third || card.images.main}
                  alt=""
                  className="w-full h-full object-cover transition-all duration-150"
                  style={thirdStyle}
                  onError={handleImgError}
                />
              </div>
            </div>
          </div>
        )}

        {/* Layout 4C: Four Image (4 फोटो: 2 ऊपर, 2 नीचे - 2x2 Grid) */}
        {card.layout === 'grid-4' && (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5">
            {/* Top Left */}
            <div className="w-full h-full overflow-hidden relative">
              <img
                src={card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={mainStyle}
                onError={handleImgError}
              />
            </div>
            {/* Top Right */}
            <div className="w-full h-full overflow-hidden relative">
              <img
                src={card.images.second || card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={secondStyle}
                onError={handleImgError}
              />
            </div>
            {/* Bottom Left */}
            <div className="w-full h-full overflow-hidden relative">
              <img
                src={card.images.third || card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={thirdStyle}
                onError={handleImgError}
              />
            </div>
            {/* Bottom Right */}
            <div className="w-full h-full overflow-hidden relative">
              <img
                src={card.images.fourth || card.images.second || card.images.main}
                alt=""
                className="w-full h-full object-cover transition-all duration-150"
                style={fourthStyle}
                onError={handleImgError}
              />
            </div>
          </div>
        )}

        {/* Layout 5: Round Circle Image (Background + Inset circular portrait + Red 3D Curved Arrow) */}
        {card.layout === 'inset-circle' && (
          <div className="relative w-full h-full overflow-hidden">
            <img
              src={card.images.main}
              alt=""
              className="w-full h-full object-cover transition-all duration-150"
              style={mainStyle}
              onError={handleImgError}
            />

            {/* Inset Circle Photo with Red Curved Pointer Arrow */}
            {card.images.insetCircle && (
              <div
                className="absolute z-15 pointer-events-none"
                style={{
                  left: `${card.insetPosition.x}%`,
                  top: `${card.insetPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Circular cutout with proportional sizing matching CanvasExporter (31% width) */}
                <div
                  className="relative rounded-full border-[4px] sm:border-[5px] border-white shadow-[0_16px_40px_rgba(0,0,0,0.95)] overflow-hidden bg-neutral-800 shrink-0 ring-2 ring-black/40"
                  style={{
                    width: `${Math.round(containerWidth * 0.31)}px`,
                    height: `${Math.round(containerWidth * 0.31)}px`,
                  }}
                >
                  <img
                    src={card.images.insetCircle}
                    alt="Inset portrait"
                    className="w-full h-full object-cover transition-all duration-150"
                    style={insetCircleStyle}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optional user-controlled dark overlay */}
        {card.darkOverlayOpacity > 0 && (
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: card.darkOverlayOpacity }}
          />
        )}

        {/* Universal subtle watermark across photo area */}
        {(card.showWatermark || card.showSuperBreakingWatermark || shouldShowAppWatermark()) && (
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden flex flex-col justify-around select-none">
            <div className="w-[200%] -ml-[50%] flex flex-col gap-8 sm:gap-11 -rotate-20">
              {[...Array(6)].map((_, rIdx) => (
                <div key={rIdx} className="flex whitespace-nowrap gap-12 sm:gap-16 shrink-0 font-black tracking-widest">
                  {[...Array(8)].map((_, cIdx) => (
                    card.watermarkType === 'image' && card.watermarkImage ? (
                      <img
                        key={cIdx}
                        src={card.watermarkImage}
                        alt=""
                        className="object-contain"
                        style={{
                          width: `${Math.round((card.watermarkScale || 90) * 0.45)}px`,
                          opacity: card.watermarkOpacity ?? 0.15,
                        }}
                      />
                    ) : (
                      <span
                        key={cIdx}
                        className="flex items-center gap-1.5 shrink-0 uppercase"
                        style={{
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          fontWeight: 900,
                          color:
                            (card.watermarkColor || card.breakingWatermarkColor) === 'black'
                              ? `rgba(0, 0, 0, ${card.watermarkOpacity ?? card.breakingWatermarkOpacity ?? 0.15})`
                              : (card.watermarkColor || card.breakingWatermarkColor) === 'red'
                              ? `rgba(220, 38, 38, ${card.watermarkOpacity ?? card.breakingWatermarkOpacity ?? 0.15})`
                              : `rgba(255, 255, 255, ${card.watermarkOpacity ?? card.breakingWatermarkOpacity ?? 0.15})`,
                          textShadow:
                            (card.watermarkColor || card.breakingWatermarkColor) === 'black'
                              ? '0 1px 2px rgba(255,255,255,0.15)'
                              : '0 1px 2px rgba(0,0,0,0.45)',
                          fontSize: '15px',
                        }}
                      >
                        {card.watermarkText || card.breakingWatermarkText || (shouldShowAppWatermark() ? 'AI NEWS MAKER APP' : 'BREAKING NEWS WALA')}
                      </span>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* 2. THEME HEADER JACKET - Set to topmost layer z-40 so it stays above all borders and photo */}
      <div className="relative z-40">
        {card.frameDesign === 'jacket-investigation' ? (
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950 text-white px-4 py-2 flex items-center justify-between shadow-xl border-b-2 border-yellow-500">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-neutral-950 text-xs font-black px-2 py-0.5 rounded shadow">
                🔍 विशेष पड़ताल
              </span>
              <span className="text-xs sm:text-sm font-black tracking-wide">
                {card.investigationCaseNumber || 'INVESTIGATION REPORT'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-amber-400 font-mono tracking-wider">
              EXCLUSIVE
            </span>
          </div>
        ) : (card.frameDesign === 'graphic_001' || card.frameDesign === 'graphic_002' || card.frameDesign === 'graphic_003' || card.frameDesign === 'graphic_004' || card.frameDesign === 'jacket-default') ? (
          /* graphic_001, graphic_002, graphic_003, graphic_004 and jacket-default have their own dedicated top elements */
          null
        ) : card.showMasterBranding === false ? (
          getActiveHeaderPng(card) ? (
            <HeaderGraphic customHeaderPng={getActiveHeaderPng(card)} />
          ) : null
        ) : card.frameDesign === 'custom-png' ? (
          !card.hideDefaultHeaderInCustomFrame && (
            <HeaderGraphic
              customHeaderPng={getActiveHeaderPng(card)}
              brandTagline={card.brandTagline}
              brandName={card.brandName}
              customLogoUrl={card.customLogoUrl}
              logoScale={card.logoScale ?? 1.25}
            />
          )
        ) : (
          /* jacket-original, jacket-breaking-red, jacket-quote & jacket-text-breaking use the brand header */
          <HeaderGraphic
            customHeaderPng={getActiveHeaderPng(card)}
            brandTagline={card.brandTagline}
            brandName={card.brandName}
            customLogoUrl={card.customLogoUrl}
            logoScale={card.logoScale ?? 1.25}
          />
        )}
      </div>

      {/* Optional Full Frame Overlay PNG - active when custom-png frame is selected OR when master branding is OFF */}
      {(card.frameDesign === 'custom-png' || card.showMasterBranding === false) && card.customFrameOverlayPng && (
        <img
          src={card.customFrameOverlayPng}
          alt="Frame Overlay"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none z-25"
        />
      )}

      {/* 2B. PHOTO DISCLAIMER Watermark (AI GENERATED or प्रतीकात्मक फोटो): Vertical along Left Wall, Rotated 90° - Inside Safe Zone */}
      {(card.photoDisclaimerType === 'ai' ||
        card.photoDisclaimerType === 'representative' ||
        (card.showAiGenerated && card.photoDisclaimerType !== 'none')) && (
        <div
          className="absolute left-3 sm:left-4 top-[44%] -translate-y-1/2 pointer-events-none z-25 flex items-center justify-center select-none"
          style={{ width: '28px', height: '140px' }}
        >
          <div className="absolute -rotate-90 whitespace-nowrap bg-black/65 backdrop-blur-[2px] border border-white/25 px-3 py-0.5 sm:py-1 rounded-sm shadow-md flex items-center justify-center">
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.16em] text-white/90 px-1 inline-block font-['Baloo_2',sans-serif]">
              {card.photoDisclaimerType === 'representative'
                ? card.representativePhotoText || 'प्रतीकात्मक फोटो'
                : card.aiGeneratedText || 'AI GENERATED'}
            </span>
          </div>
        </div>
      )}

      {/* 2C. DATE STAMP: Vertical along Right Wall, Rotated 90°, Text without background box - Inside Safe Zone */}
      {card.showDate !== false && card.frameDesign !== 'graphic_001' && card.frameDesign !== 'graphic_002' && card.frameDesign !== 'graphic_003' && card.frameDesign !== 'graphic_004' && card.frameDesign !== 'jacket-default' && card.frameDesign !== 'jacket-text-breaking' && card.frameDesign !== 'jacket-morning' && card.frameDesign !== 'jacket-epaper' && (
        <div
          className="absolute right-3 sm:right-4 top-[22%] -translate-y-1/2 pointer-events-none z-25 flex items-center justify-center select-none"
          style={{ width: '24px', height: '180px' }}
        >
          <div
            className="absolute whitespace-nowrap flex items-center justify-center"
            style={{ transform: 'rotate(90deg)' }}
          >
            <span
              className="font-bold tracking-wider text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] font-['Baloo_2',sans-serif]"
              style={{
                fontSize: `${Math.max(10, Math.min(13, Math.round(20 * previewScale)))}px`,
              }}
            >
              {card.dateStr || getFormattedHindiDate()}
            </span>
          </div>
        </div>
      )}

      {/* 3. BOTTOM SECTION: GRAPHIC 1 vs DEFAULT FRAME vs MORNING JACKET vs TEXT BREAKING vs SUPER BREAKING vs QUOTE vs STANDARD ORIGINAL */}
      {card.frameDesign === 'graphic_001' ? (
        /* ================= GRAPHIC 1 (DEFAULT 4:5 PHOTO NEWS TEMPLATE — SAMPLE EXACT MATCH) ================= */
        <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none select-none bg-gradient-to-b from-[#090a0d] via-[#12151b] to-[#090a0d] overflow-hidden">
          {/* SVG Definitions for Golden Metallic Gradients */}
          <svg className="absolute w-0 h-0" aria-hidden="true">
            <defs>
              <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFE600" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#AA771C" />
              </linearGradient>
              <linearGradient id="goldGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFF275" />
                <stop offset="60%" stopColor="#E5B80B" />
                <stop offset="100%" stopColor="#553B08" />
              </linearGradient>
            </defs>
          </svg>

          {/* 4 Gold Geometric Corner Ribbons */}
          <svg className="absolute top-0 left-0 w-28 h-28 sm:w-36 sm:h-36 pointer-events-none z-10" viewBox="0 0 120 120" fill="none">
            <polygon points="0,0 65,0 0,65" fill="url(#goldGrad1)" opacity="0.85" />
            <polygon points="0,0 45,0 0,45" fill="url(#goldGrad2)" opacity="0.95" />
            <polygon points="0,0 25,0 0,25" fill="#FFE600" opacity="0.9" />
            <line x1="0" y1="75" x2="75" y2="0" stroke="#FFE600" strokeWidth="2.5" />
            <line x1="0" y1="90" x2="90" y2="0" stroke="#D4AF37" strokeWidth="1.5" />
          </svg>

          <svg className="absolute top-0 right-0 w-28 h-28 sm:w-36 sm:h-36 pointer-events-none z-10 rotate-90" viewBox="0 0 120 120" fill="none">
            <polygon points="0,0 65,0 0,65" fill="url(#goldGrad1)" opacity="0.85" />
            <polygon points="0,0 45,0 0,45" fill="url(#goldGrad2)" opacity="0.95" />
            <polygon points="0,0 25,0 0,25" fill="#FFE600" opacity="0.9" />
            <line x1="0" y1="75" x2="75" y2="0" stroke="#FFE600" strokeWidth="2.5" />
            <line x1="0" y1="90" x2="90" y2="0" stroke="#D4AF37" strokeWidth="1.5" />
          </svg>

          <svg className="absolute bottom-12 left-0 w-28 h-28 sm:w-36 sm:h-36 pointer-events-none z-10 -rotate-90" viewBox="0 0 120 120" fill="none">
            <polygon points="0,0 65,0 0,65" fill="url(#goldGrad1)" opacity="0.85" />
            <polygon points="0,0 45,0 0,45" fill="url(#goldGrad2)" opacity="0.95" />
            <polygon points="0,0 25,0 0,25" fill="#FFE600" opacity="0.9" />
            <line x1="0" y1="75" x2="75" y2="0" stroke="#FFE600" strokeWidth="2.5" />
            <line x1="0" y1="90" x2="90" y2="0" stroke="#D4AF37" strokeWidth="1.5" />
          </svg>

          <svg className="absolute bottom-12 right-0 w-28 h-28 sm:w-36 sm:h-36 pointer-events-none z-10 rotate-180" viewBox="0 0 120 120" fill="none">
            <polygon points="0,0 65,0 0,65" fill="url(#goldGrad1)" opacity="0.85" />
            <polygon points="0,0 45,0 0,45" fill="url(#goldGrad2)" opacity="0.95" />
            <polygon points="0,0 25,0 0,25" fill="#FFE600" opacity="0.9" />
            <line x1="0" y1="75" x2="75" y2="0" stroke="#FFE600" strokeWidth="2.5" />
            <line x1="0" y1="90" x2="90" y2="0" stroke="#D4AF37" strokeWidth="1.5" />
          </svg>

          {/* Top-Left Channel Logo Area */}
          <div
            className="absolute top-3 left-3 sm:top-5 sm:left-5 z-30 pointer-events-auto max-w-[45%]"
            style={{
              transform: `scale(${card.logoScale ?? 1.25})`,
              transformOrigin: 'top left',
            }}
          >
            {card.customLogoUrl ? (
              <img
                src={card.customLogoUrl}
                alt="Channel Logo"
                className="max-h-12 sm:max-h-16 w-auto object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
              />
            ) : (
              <div className="border-2 border-[#FFE600] rounded-lg px-2.5 sm:px-3 py-0.5 sm:py-1 bg-black/60 shadow-[0_0_12px_rgba(255,230,0,0.4)] flex items-center justify-center">
                <span className="font-black text-xs sm:text-sm text-[#FFE600] font-['Poppins'] tracking-wider">
                  YOUR LOGO
                </span>
              </div>
            )}
          </div>

          {/* Top Area: Photo Section (Height ~50%) */}
          <div className="relative w-full h-[50%] flex items-center justify-center overflow-hidden z-20 pt-6">
            <div className="w-full h-full relative overflow-hidden">
              <img
                src={mainPhotoSrc}
                alt="News Photo"
                onError={handleImgError}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${card.imagePositions?.main?.x ?? 50}% ${card.imagePositions?.main?.y ?? 50}%`,
                  transform: `scale(${card.imagePositions?.main?.zoom ?? 1})`,
                }}
              />
            </div>
          </div>

          {/* Middle Radiant Glowing Golden Divider */}
          <div className="relative w-full py-0.5 flex items-center justify-center z-20">
            <div className="w-[92%] h-[2.5px] bg-gradient-to-r from-transparent via-[#FFE600] to-transparent shadow-[0_0_12px_rgba(255,230,0,0.85)]" />
          </div>

          {/* Lower Area: Headline Section (Height ~36%) */}
          <div className="relative w-full flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-2 z-20 overflow-hidden">
            {card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार' && !card.headline.includes('यहाँ आपकी हेडलाइन आएगी') && !card.headline.includes('आपकी चुनी गयी खबर को यहां') ? (
              <h1
                className="font-black leading-snug tracking-tight text-white transition-all line-clamp-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
                style={{
                  fontFamily: card.headlineFontFamily || 'Baloo 2',
                  fontSize: `${effectivePreviewFontSize}px`,
                }}
              >
                {renderFormattedHeadline()}
              </h1>
            ) : (
              /* Default Headline Placeholder Layers */
              <div className="flex flex-col items-center justify-center text-center max-w-[92%]">
                <div className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-0.5 sm:py-1 rounded-full bg-[#FFE600] text-neutral-950 font-black text-[11px] sm:text-xs shadow-md mb-2">
                  <FileText className="w-3.5 h-3.5 text-neutral-950" />
                  <span>स्टेप 3 : हेडलाइन लिखें</span>
                </div>
                <p className="font-bold text-xs sm:text-base text-white font-['Baloo_2'] leading-snug">
                  स्टेप 3 में जाकर अपनी मुख्य खबर की
                </p>
                <h1 className="font-black text-lg sm:text-3xl text-[#FFE600] font-['Baloo_2'] leading-tight mt-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  हेडलाइन दर्ज करें
                </h1>
                <span className="font-medium text-[10px] sm:text-xs text-neutral-300 font-['Baloo_2'] mt-1">
                  आवश्यकता अनुसार दो या तीन लाइन में
                </span>
              </div>
            )}
          </div>

          {/* Bottom Dynamic Branding Footer */}
          <div className="relative z-30 w-full pointer-events-auto">
            <FooterGraphic
              socialHandle={card.socialHandle}
              whatsappNumber={card.whatsappNumber}
              customFooterPng={getActiveFooterPng(card)}
              websiteUrl={card.websiteUrl}
              showMobileNumber={card.showMobileNumber}
              activeSocialIcons={card.activeSocialIcons}
              footerBgColor={card.footerBgColor || '#FFFFFF'}
              footerTextColor={card.footerTextColor || '#111827'}
              footerIconStyle={card.footerIconStyle || 'color'}
              showMasterBranding={card.showMasterBranding}
            />
          </div>
        </div>) : card.frameDesign === 'graphic_002' ? (/* ================= GRAPHIC 2 (THIN ORANGE BORDER, 4:5 TOP PHOTO, LOGO & LOCATION BOXES, TEXTURED HEADLINE WITH ORANGE ACCENTS, "पूरी खबर कमेंट बॉक्स में" CTA, YELLOW FOOTER) ================= */
        <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none select-none">
          {/* Top Overlay: Location Box (Left), Logo Box (Right) */}
          <div className="relative w-full h-[53%] p-3 sm:p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between w-full pointer-events-auto">
              {/* Location Box (Top Left): White Rounded Box with Red Border */}
              {card.showLocation !== false && card.location && card.location.trim() && (
                <div className="bg-white border-[2.5px] border-[#DC2626] rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 shadow-lg max-w-[48%]">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#DC2626] flex items-center justify-center shrink-0 shadow-xs">
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white" />
                  </div>
                  <span className="font-black text-xs sm:text-sm text-neutral-950 font-['Noto_Sans_Devanagari'] tracking-wide truncate">
                    {card.location.replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '').replace(/[:\-–—]+$/, '').trim()}
                  </span>
                </div>
              )}

              {/* Logo Box (Top Right): Clean Transparent Logo or Placeholder Box */}
              <div
                className={`ml-auto flex items-center justify-end transition-transform pointer-events-auto max-w-[48%] ${
                  card.customLogoUrl ? '' : 'bg-[#FFFBEB] border-2 border-[#EA580C] rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 gap-2 shadow-lg min-w-[130px] sm:min-w-[160px]'
                }`}
                style={{
                  transform: `scale(${card.logoScale ?? 1.25})`,
                  transformOrigin: 'top right',
                }}
              >
                {card.customLogoUrl ? (
                  <img
                    src={card.customLogoUrl}
                    alt="Channel Logo"
                    className="max-h-12 sm:max-h-16 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                  />
                ) : (
                  <>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-amber-400 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-xs shrink-0">
                      🌍
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="font-black text-xs sm:text-sm text-[#DC2626] font-['Poppins'] tracking-wider">
                        YOUR LOGO
                      </span>
                      <span className="font-bold text-[9px] sm:text-[11px] text-neutral-900 font-['Noto_Sans_Devanagari']">
                        यहाँ आपका लोगो रहेगा
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Area: Off-White Subtle Textured Headline Area (47%) + Red CTA + Yellow Fixed Footer */}
          <div className="relative w-full h-[47%] bg-[#FAF8F5] border-t-2 border-[#EA580C]/40 flex flex-col justify-between overflow-hidden">
            {/* Subtle Textured / Paper Grunge Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-25">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <filter id="noise-paper">
                  <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" stitchTiles="stitch" />
                  <feColorMatrix type="saturate" values="0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#noise-paper)" fill="#000" opacity="0.15" />
              </svg>
            </div>

            {/* Headline Section: Max 3 Lines, Centered, Black with Orange Accents */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-2 text-center">
              {card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार' ? (
                <h1
                  className="font-black leading-snug tracking-tight text-neutral-950 transition-all line-clamp-3"
                  style={{
                    fontFamily: card.headlineFontFamily || 'Baloo 2',
                    fontSize: `${effectivePreviewFontSize}px`,
                  }}
                >
                  {renderFormattedHeadline()}
                </h1>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center gap-2 font-black text-2xl sm:text-4xl font-['Poppins'] tracking-tight">
                    <span className="text-neutral-950">YOUR</span>
                    <span className="text-[#EA580C]">HEADLINE</span>
                  </div>
                  <div className="font-black text-xl sm:text-3xl text-neutral-950 font-['Baloo_2'] mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                    <span>यहाँ आपकी</span>
                    <span className="text-[#EA580C]">हेडलाइन</span>
                    <span>आएगी</span>
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-neutral-500 font-['Baloo_2'] mt-0.5">
                    (अधिकतम 3 लाइन में, आपके टेक्स्ट के अनुसार)
                  </span>
                </div>
              )}
            </div>

            {/* Description CTA: Centered Red Rounded Rectangle Pill with Horizontal Accent Lines */}
            <div className="relative z-10 w-full px-4 sm:px-6 mb-2">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-[#DC2626]" />
                </div>
                <div className="relative bg-[#C90000] border border-[#990000] text-white px-5 sm:px-7 py-1.5 rounded-full shadow-md flex items-center gap-2 whitespace-nowrap">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                  <span className="font-black text-xs sm:text-sm tracking-wide font-['Baloo_2']">
                    पूरी खबर कमेंट बॉक्स में
                  </span>
                </div>
              </div>
            </div>

            {/* Fixed Footer: Yellow Bar (#FFE600) with Social Icons, Handle, Website and Fixed Footer Badge */}
            <div className="relative z-10 w-full bg-[#FFE600] border-t-2 border-[#EAB308] px-3 sm:px-5 py-2 flex items-center justify-between pointer-events-auto">
              {/* Left Social Icons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                  ▶
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-xs font-black shadow-xs">
                  f
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                  📷
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                  💬
                </div>
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-[#CA8A04]" />

              {/* Handle */}
              <span className="font-black text-xs sm:text-sm text-black font-['Poppins'] truncate">
                {card.socialHandle || '@YourChannel'}
              </span>

              {/* Divider */}
              <div className="h-5 w-px bg-[#CA8A04] hidden sm:block" />

              {/* Website */}
              <div className="hidden sm:flex items-center gap-1 text-black font-bold text-xs font-['Poppins'] truncate">
                <span className="text-sky-600 font-bold">🌐</span>
                <span>{card.websiteUrl || 'yourwebsite.com'}</span>
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-[#CA8A04]" />

              {/* Contact Number (if enabled by admin/profile) */}
              {card.showMobileNumber !== false && card.whatsappNumber && (
                <>
                  <div className="h-5 w-px bg-[#CA8A04]" />
                  <div className="flex items-center gap-1 text-black font-bold text-xs font-['Poppins'] shrink-0">
                    <span className="text-green-600 font-bold">📞</span>
                    <span>{card.whatsappNumber}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : card.frameDesign === 'graphic_003' ? (
        /* ================= GRAPHIC 3 (FULL-BLEED PHOTO, LOWER DARK GRADIENT OVERLAY, TOP-LEFT LOCATION & DATE, TOP-RIGHT LOGO, DIRECT 3-LINE HEADLINE OVERLAY WITH GOLDEN HIGHLIGHT, SLEEK DARK FOOTER) ================= */
        <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none select-none">
          {/* Top Vignette Overlay for crisp logo & location contrast */}
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none z-10" />

          {/* Top Row: Location & Date Pill (Top-Left) & Channel Logo (Top-Right) */}
          <div className="relative z-20 w-full p-3 sm:p-5 flex items-start justify-between pointer-events-auto">
            {/* Top-Left: Location & Date Pill */}
            {card.showLocation !== false && card.location && card.location.trim() && (
              <div className="bg-white/95 backdrop-blur-md border-[2.5px] border-[#DC2626] rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 shadow-xl max-w-[48%]">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#DC2626] flex items-center justify-center shrink-0 shadow-xs">
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white" />
                </div>
                <span className="font-black text-xs sm:text-sm text-neutral-950 font-['Noto_Sans_Devanagari'] tracking-wide truncate">
                  {card.location.replace(/^(स्थान\s*[:\-–—]?|location\s*[:\-–—]?|ताजा\s*समाचार\s*स्थान\s*[:\-–—]?|ताज़ा\s*समाचार\s*स्थान\s*[:\-–—]?)/i, '').replace(/[:\-–—]+$/, '').trim()}
                </span>
              </div>
            )}

            {/* Top-Right: Logo Box (Clean Transparent Logo or Placeholder Box) */}
            <div
              className={`ml-auto flex items-center justify-end transition-transform pointer-events-auto max-w-[48%] ${
                card.customLogoUrl ? '' : 'bg-white/95 backdrop-blur-md border-2 border-amber-500 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 gap-2 shadow-xl min-w-[130px] sm:min-w-[160px]'
              }`}
              style={{
                transform: `scale(${card.logoScale ?? 1.25})`,
                transformOrigin: 'top right',
              }}
            >
              {card.customLogoUrl ? (
                <img
                  src={card.customLogoUrl}
                  alt="Channel Logo"
                  className="max-h-12 sm:max-h-16 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                />
              ) : (
                <>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-amber-400 flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-xs shrink-0">
                    🌍
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="font-black text-xs sm:text-sm text-[#DC2626] font-['Poppins'] tracking-wider">
                      YOUR LOGO
                    </span>
                    <span className="font-bold text-[9px] sm:text-[11px] text-neutral-900 font-['Noto_Sans_Devanagari']">
                      यहाँ आपका लोगो रहेगा
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lower Readability Gradient & Direct Headline Overlay + Bottom Footer */}
          <div className="relative z-20 w-full flex flex-col justify-end">
            {/* Cinematic Gradient: Transparent at top -> Deep Black at bottom */}
            <div className="absolute inset-x-0 -top-44 bottom-0 bg-gradient-to-t from-black via-black/90 via-black/50 to-transparent pointer-events-none -z-10" />

            {/* Headline Section: Directly on photo/gradient, Max 3 Lines, Bold Typography */}
            <div className="w-full px-5 sm:px-8 pb-5 text-center">
              {card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार' ? (
                <h1
                  className="font-black leading-snug tracking-tight text-white transition-all line-clamp-3 drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]"
                  style={{
                    fontFamily: card.headlineFontFamily || 'Baloo 2',
                    fontSize: `${effectivePreviewFontSize}px`,
                  }}
                >
                  {renderFormattedHeadline()}
                </h1>
              ) : (
                <div className="flex flex-col items-center text-center drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]">
                  <div className="flex items-center justify-center gap-2 font-black text-2xl sm:text-4xl font-['Poppins'] tracking-tight">
                    <span className="text-white">YOUR</span>
                    <span className="text-[#FFE600]">HEADLINE</span>
                  </div>
                  <div className="font-black text-xl sm:text-3xl text-white font-['Baloo_2'] mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                    <span>यहाँ आपकी</span>
                    <span className="text-[#FFE600]">हेडलाइन</span>
                    <span>आएगी</span>
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-neutral-300 font-['Baloo_2'] mt-0.5">
                    (अधिकतम 3 लाइन में, आपके टेक्स्ट के अनुसार)
                  </span>
                </div>
              )}
            </div>

            {/* Sleek Dark Fixed Social Footer Bar */}
            <div className="w-full bg-slate-950/95 backdrop-blur-md border-t-2 border-amber-500 px-3 sm:px-5 py-2.5 flex items-center justify-between pointer-events-auto">
              {/* Left Social Icons */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                  ▶
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-xs font-black shadow-xs">
                  f
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                  📷
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[10px] font-bold shadow-xs">
                  💬
                </div>
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-white/20" />

              {/* Handle */}
              <span className="font-black text-xs sm:text-sm text-white font-['Poppins'] truncate">
                {card.socialHandle || '@YourChannel'}
              </span>

              {/* Divider */}
              <div className="h-5 w-px bg-white/20 hidden sm:block" />

              {/* Website */}
              <div className="hidden sm:flex items-center gap-1 text-slate-200 font-bold text-xs font-['Poppins'] truncate">
                <span className="text-sky-400 font-bold">🌐</span>
                <span>{card.websiteUrl || 'yourwebsite.com'}</span>
              </div>

              {/* Contact Number (if enabled by admin/profile) */}
              {card.showMobileNumber !== false && card.whatsappNumber && (
                <>
                  <div className="h-5 w-px bg-white/20" />
                  <div className="flex items-center gap-1 text-slate-200 font-bold text-xs font-['Poppins'] shrink-0">
                    <span className="text-green-400 font-bold">📞</span>
                    <span>{card.whatsappNumber}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : card.frameDesign === 'graphic_004' ? (
        /* ================= GRAPHIC 4 (WHITE CANVAS, TOP CENTER LOGO FLANKED BY RULES, BOLD BLACK & RED HEADLINE, SUB-HEADLINE, BOTTOM PHOTO/COLLAGE, RED RUBBER STAMP & GAVEL, SOLID BLACK FOOTER WITH DATE) ================= */
        <div className="absolute inset-0 z-20 flex flex-col justify-between pointer-events-none select-none">
          {/* Top White Section: 33.2% Height (Logo + Main Headline + Additional Info) */}
          <div className="relative w-full h-[33.2%] bg-white border-b-2 border-black flex flex-col justify-between px-2.5 sm:px-4 py-1.5 sm:py-2 pointer-events-auto">
            {/* Row 1: Centered Logo Container with Flanking Black Accent Lines */}
            <div className="relative flex items-center justify-center w-full my-0.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-[1.5px] sm:border-t-2 border-black" />
              </div>
              <div
                className="relative bg-[#FFFBEB] border-2 border-[#EA580C] rounded-xl px-2.5 py-0.5 sm:px-3.5 sm:py-1 flex items-center gap-1.5 shadow-xs transition-transform max-w-[65%]"
                style={{
                  transform: `scale(${card.logoScale ?? 1.25})`,
                }}
              >
                {card.customLogoUrl ? (
                  <img
                    src={card.customLogoUrl}
                    alt="Channel Logo"
                    className="max-h-6 sm:max-h-8 w-auto object-contain drop-shadow-xs"
                  />
                ) : (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-amber-400 flex items-center justify-center text-white text-[9px] sm:text-[10px] font-bold shadow-xs shrink-0">
                      🌍
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="font-black text-[10px] sm:text-[11px] text-[#DC2626] font-['Poppins'] tracking-wider">
                        YOUR LOGO
                      </span>
                      <span className="font-bold text-[7.5px] sm:text-[8.5px] text-neutral-900 font-['Noto_Sans_Devanagari']">
                        यहाँ आपका लोगो रहेगा
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Main Headline (Centered, High Impact, Line 1 Black, Line 2 Red) */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
              {card.headline && card.headline.trim().length > 0 && card.headline.trim() !== 'ताज़ा समाचार' ? (
                <h1
                  className="font-black leading-[1.18] tracking-tight text-neutral-950 transition-all line-clamp-3"
                  style={{
                    fontFamily: card.headlineFontFamily || 'Baloo 2',
                    fontSize: `${effectivePreviewFontSize}px`,
                  }}
                >
                  {renderFormattedHeadline()}
                </h1>
              ) : (
                <div className="flex flex-col items-center text-center leading-[1.15]">
                  <span className="font-black text-lg sm:text-2xl text-black font-['Baloo_2']">
                    पन्ना कलेक्टर को
                  </span>
                  <span className="font-black text-xl sm:text-3xl text-[#DC2626] font-['Baloo_2']">
                    गिरफ्तार कर पेश करो!
                  </span>
                </div>
              )}
            </div>

            {/* Row 3: Additional Information / Sub-Headline (Centered, Black + Red) */}
            <div className="text-center pb-0.5">
              {card.additionalInfo && card.additionalInfo.trim().length > 0 ? (
                <p className="font-black text-[10px] sm:text-[12px] text-neutral-900 font-['Baloo_2'] leading-snug line-clamp-2">
                  {card.additionalInfo}
                </p>
              ) : (
                <div className="flex flex-col items-center leading-tight text-center font-['Baloo_2']">
                  <span className="font-black text-[10px] sm:text-[12px] text-black">
                    एमपी हाईकोर्ट का सख्त आदेश,
                  </span>
                  <span className="font-black text-[10.5px] sm:text-[12.5px] text-[#DC2626]">
                    प्रशासनिक महकमे में मचा हड़कंप!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Middle Over-Photo Elements: Red Rubber Stamp & 3D Gavel */}
          <div className="relative flex-1 pointer-events-none">
            {card.showGraphic004Stamp !== false && (
              <div className="absolute right-3 sm:right-6 bottom-4 sm:bottom-6 flex items-center gap-1 sm:gap-2 z-25 pointer-events-auto select-none">
                {/* Tilted Distressed Red Rubber Stamp */}
                <div
                  className="relative bg-[#C90000] border-2 sm:border-[3px] border-white px-3 sm:px-5 py-1 sm:py-1.5 rounded-xl shadow-2xl flex items-center justify-center transform -rotate-11 transition-transform hover:scale-105"
                  style={{
                    boxShadow: '0 10px 25px -5px rgba(201, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div className="absolute inset-0.5 border border-white/60 rounded-lg pointer-events-none" />
                  <span className="font-black text-xl sm:text-3xl text-white font-['Baloo_2'] tracking-wide drop-shadow-sm">
                    {card.graphic004StampText || 'गिरफ्तार'}
                  </span>
                </div>

                {/* Gavel Emoji / Graphic */}
                <div className="relative text-2xl sm:text-4xl drop-shadow-md select-none">
                  🔨
                </div>
              </div>
            )}
          </div>

          {/* Bottom Fixed Black Footer with Yellow Details & Date Badge */}
          <div className="relative z-20 w-full bg-black border-t-2 border-white px-2 sm:px-3 py-1.5 flex items-center justify-between pointer-events-auto">
            {/* Left Social Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[8px] font-bold shadow-xs">
                ▶
              </div>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px] font-black shadow-xs">
                f
              </div>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-[#FD1D1D] via-[#FD1D1D] to-[#833AB4] flex items-center justify-center text-white text-[8px] font-bold shadow-xs">
                📷
              </div>
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#25D366] flex items-center justify-center text-white text-[8px] font-bold shadow-xs">
                💬
              </div>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-white/40" />

            {/* Handle in Yellow */}
            <span className="font-black text-[11px] sm:text-xs text-[#FFE600] font-['Poppins'] truncate">
              {card.socialHandle || '@YourChannel'}
            </span>

            {/* Divider */}
            <div className="h-4 w-px bg-white/40 hidden sm:block" />

            {/* Website in Yellow */}
            <div className="hidden sm:flex items-center gap-1 text-[#FFE600] font-bold text-[10px] sm:text-[11px] font-['Poppins'] truncate">
              <span className="text-sky-400 font-bold">🌐</span>
              <span>{card.websiteUrl || 'yourwebsite.com'}</span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-white/40" />

            {/* Right Date Badge: DATE / यहाँ तारीख आएगी */}
            <div className="bg-black border border-white text-white px-2 py-0.5 rounded-lg flex flex-col items-center justify-center text-center shrink-0 leading-none">
              <span className="font-black text-[8px] sm:text-[9.5px] font-['Poppins'] tracking-wider">
                DATE
              </span>
              <span className="text-[6.5px] sm:text-[8px] text-neutral-300 font-['Noto_Sans_Devanagari'] mt-0.5">
                {card.date && card.date.trim().length > 0 ? card.date : 'यहाँ तारीख आएगी'}
              </span>
            </div>
          </div>
        </div>
      ) : card.frameDesign === 'jacket-default' ? (
        /* ================= DEFAULT FRAME (CLEAN WHITE, PINK LOCATION, YOUR LOGO, 3-LINE HEADLINE, SOLID GRAY FOOTER) ================= */
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none select-none">
          {/* Top Row: Left = Location Pill with Pink/Magenta border, Right = YOUR LOGO / Custom Logo */}
          <div className="flex items-start justify-between w-full pointer-events-auto">
            {/* Top Left: Location Box with Pink border & Pin */}
            {card.showLocation !== false && (
              <div className="bg-white border-2 border-[#E11D48] rounded-md px-3 py-1 flex items-center gap-1.5 shadow-xs">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E11D48] fill-[#E11D48] shrink-0" />
                <span className="font-extrabold text-xs sm:text-sm text-neutral-900 font-['Baloo_2'] tracking-wide">
                  {card.location || 'खबर की लोकेशन'}
                </span>
              </div>
            )}

            {/* Top Right: Custom Logo or Crisp Bold 'YOUR LOGO' with dynamic logo scaling */}
            <div
              className="ml-auto flex flex-col items-end pointer-events-auto transition-transform"
              style={{
                transform: `scale(${card.logoScale ?? 1.25})`,
                transformOrigin: 'top right',
              }}
            >
              {card.customLogoUrl ? (
                <img
                  src={card.customLogoUrl}
                  alt="Logo"
                  className="h-12 sm:h-16 w-auto object-contain max-w-[150px]"
                />
              ) : (
                <div className="flex flex-col text-right leading-[0.88] select-none">
                  <span className="text-xl sm:text-2xl font-black text-black tracking-wider font-['Mukta',sans-serif]">
                    YOUR
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-black tracking-wider font-['Mukta',sans-serif]">
                    LOGO
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Optional Middle Photo if user uploaded an image */}
          {card.images?.main && card.images.main.trim() !== '' && card.images.main !== FALLBACK_NEWS_BG && (
            <div className="flex-1 my-2 overflow-hidden rounded-md relative pointer-events-auto">
              <img
                src={card.images.main}
                alt=""
                className="w-full h-full object-cover"
                style={mainStyle}
              />
            </div>
          )}

          {/* Bottom Container: 3-Line Headline & Solid Gray Footer Strip */}
          <div className="w-full flex flex-col items-center gap-4 sm:gap-6 mt-auto">
            {/* Headline: 3 Lines Centered, Bold Black */}
            <div
              className="w-full px-2 sm:px-4 text-center pointer-events-auto"
              style={{
                paddingLeft: `${effectivePaddingX}px`,
                paddingRight: `${effectivePaddingX}px`,
              }}
            >
              <h1
                className="font-black text-black leading-[1.35] text-center drop-shadow-none"
                style={{
                  fontSize: `${effectivePreviewFontSize}px`,
                  fontFamily: `"${card.headlineFontFamily || 'Baloo 2'}", "Noto Sans Devanagari", sans-serif`,
                }}
              >
                {renderFormattedHeadline()}
              </h1>
            </div>

            {/* Center-Aligned Clean Footer Bar */}
            <div className="w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 pointer-events-auto">
              <FooterGraphic
                socialHandle={card.socialHandle}
                whatsappNumber={card.whatsappNumber}
                customFooterPng={getActiveFooterPng(card)}
                websiteUrl={card.websiteUrl}
                showMobileNumber={card.showMobileNumber}
                activeSocialIcons={card.activeSocialIcons}
                footerBgColor={card.footerBgColor}
                footerTextColor={card.footerTextColor}
                footerIconStyle={card.footerIconStyle}
                showMasterBranding={card.showMasterBranding}
              />
            </div>
          </div>
        </div>
      ) : card.frameDesign === 'jacket-morning' ? (
        /* ================= MORNING JACKET (THOUGHT / HEALTH / POSITIVE WITH BACKGROUND IMAGE) ================= */
        <div className="absolute inset-x-0 bottom-0 top-[52px] sm:top-[68px] z-20 flex flex-col justify-between pointer-events-none">
          {/* Middle Content: Clean, strictly inside header-to-footer safe zone */}
          <div className="flex-1 flex flex-col justify-center px-2 sm:px-4 py-1 pointer-events-auto">
            {(() => {
              const theme = card.morningDesignStyle || 'frosted-obsidian';
              const isIvory = theme === 'editorial-ivory';
              const isEmerald = theme === 'emerald-zen';
              const isRoyal = theme === 'royal-gold';
              const isDivine = theme === 'spiritual-divine';
              const isCinematic = theme === 'cinematic-text';

              const boxMaxWidth = card.morningBoxWidth === 'expanded' ? '97%' : (card.morningBoxWidth === 'wide' ? '93%' : '88%');
              const minHeightStyle = card.morningBoxHeightMode === 'fill-safe-area' ? '76%' : (card.morningBoxHeightMode === 'expanded' ? '62%' : 'auto');

              // Theme-specific styles
              let containerBg = 'bg-black/80';
              let containerBorder = 'border-white/30';
              let glowBg = 'bg-amber-400/20';
              let quoteColor = 'text-yellow-400';
              let textColor = 'text-white';
              let subTextColor = 'text-yellow-100';
              let dividerBorder = 'border-white/30';
              let badgeBg = 'linear-gradient(to right, #F59E0B, #FACC15, #F59E0B)';
              let badgeTextColor = 'text-neutral-950';

              if (isRoyal) {
                containerBg = 'bg-[#0E0A08]/92';
                containerBorder = 'border-amber-500/80';
                glowBg = 'bg-amber-500/30';
                quoteColor = 'text-amber-400';
                textColor = 'text-white';
                subTextColor = 'text-amber-200';
                dividerBorder = 'border-amber-500/40';
                badgeBg = 'linear-gradient(to right, #D97706, #FDE68A, #D97706)';
                badgeTextColor = 'text-neutral-950';
              } else if (isDivine) {
                containerBg = 'bg-[#180A04]/90';
                containerBorder = 'border-orange-500/70';
                glowBg = 'bg-orange-500/25';
                quoteColor = 'text-amber-300';
                textColor = 'text-white';
                subTextColor = 'text-amber-100';
                dividerBorder = 'border-orange-500/35';
                badgeBg = 'linear-gradient(to right, #EA580C, #FDE047, #EA580C)';
                badgeTextColor = 'text-neutral-950';
              } else if (isIvory) {
                containerBg = 'bg-[#FDFBF7]/95 shadow-2xl';
                containerBorder = 'border-amber-700/50';
                glowBg = 'bg-amber-500/10';
                quoteColor = 'text-amber-700';
                textColor = 'text-neutral-900';
                subTextColor = 'text-neutral-700';
                dividerBorder = 'border-amber-800/20';
                badgeBg = 'linear-gradient(to right, #B45309, #D97706, #B45309)';
                badgeTextColor = 'text-white';
              } else if (isEmerald) {
                containerBg = 'bg-[#041D10]/92';
                containerBorder = 'border-emerald-500/70';
                glowBg = 'bg-emerald-500/25';
                quoteColor = 'text-emerald-400';
                textColor = 'text-white';
                subTextColor = 'text-emerald-100';
                dividerBorder = 'border-emerald-500/35';
                badgeBg = 'linear-gradient(to right, #059669, #34D399, #059669)';
                badgeTextColor = 'text-neutral-950';
              } else if (isCinematic) {
                containerBg = 'bg-black/55 backdrop-blur-sm';
                containerBorder = 'border-white/15';
                glowBg = 'bg-amber-400/10';
                quoteColor = 'text-yellow-400';
                textColor = 'text-white';
                subTextColor = 'text-yellow-200';
                dividerBorder = 'border-white/20';
                badgeBg = 'linear-gradient(to right, #D97706, #FBBF24, #D97706)';
                badgeTextColor = 'text-neutral-950';
              }

              return (
                <div
                  className="w-full mx-auto relative flex flex-col items-center"
                  style={{ maxWidth: boxMaxWidth }}
                >
                  {/* Top Badge: Attached directly to the top edge of the box, overlapping by half */}
                  <div
                    className="relative z-30 shadow-xl flex items-center justify-center"
                    style={{
                      marginBottom: `-${Math.round(20 * previewScale)}px`,
                    }}
                  >
                    <div
                      className={`inline-flex items-center justify-center font-black font-['Baloo_2'] tracking-wide border shadow-2xl ${badgeTextColor} whitespace-nowrap`}
                      style={{
                        height: `${Math.max(22, Math.round(52 * previewScale))}px`,
                        padding: `0 ${Math.max(10, Math.round(24 * previewScale))}px`,
                        fontSize: `${Math.max(9, Math.round(24 * previewScale))}px`,
                        borderRadius: '9999px',
                        borderWidth: `${Math.max(1.5, Math.round(3.5 * previewScale))}px`,
                        borderColor: '#FFFFFF',
                        background: badgeBg,
                      }}
                    >
                      <span>{card.morningBadgeText || '🌅 आज का विचार'}</span>
                    </div>
                  </div>

                  {/* Center Floating Card for the Thought */}
                  <div
                    className={`w-full ${containerBg} backdrop-blur-md border ${containerBorder} shadow-2xl flex flex-col items-center justify-center text-center relative`}
                    style={{
                      borderWidth: isCinematic ? '1px' : `${Math.max(1.5, Math.round(3 * previewScale))}px`,
                      borderRadius: `${Math.max(12, Math.round(32 * previewScale))}px`,
                      paddingTop: `${Math.max(14, Math.round(46 * previewScale))}px`,
                      paddingBottom: `${Math.max(10, Math.round(36 * previewScale))}px`,
                      paddingLeft: `${Math.max(10, Math.round(36 * previewScale))}px`,
                      paddingRight: `${Math.max(10, Math.round(36 * previewScale))}px`,
                      minHeight: minHeightStyle,
                    }}
                  >
                    {/* Soft warm radial glow */}
                    <div
                      className={`absolute top-0 left-1/2 -translate-x-1/2 ${glowBg} rounded-full blur-xl pointer-events-none`}
                      style={{
                        width: `${Math.round(280 * previewScale)}px`,
                        height: `${Math.round(120 * previewScale)}px`,
                      }}
                    />

                    {/* Decorative quotation mark */}
                    {card.morningShowQuotes !== false && (
                      <span
                        className={`font-serif ${quoteColor} leading-none select-none block drop-shadow`}
                        style={{
                          fontSize: `${Math.max(16, Math.round(50 * previewScale))}px`,
                          marginBottom: `${Math.max(2, Math.round(8 * previewScale))}px`,
                        }}
                      >
                        “
                      </span>
                    )}

                    {/* Main Thought / Message */}
                    <h1
                      className={`font-black tracking-normal leading-[1.36] text-center ${textColor} overflow-visible ${isIvory ? '' : 'drop-shadow-lg'}`}
                      style={{
                        fontSize: `${Math.max(10, Math.round(Math.max(36, Math.min(84, Math.round((card.headlineFontSize || 20) * 2.15))) * previewScale))}px`,
                        fontFamily: `"${card.headlineFontFamily || 'Baloo 2'}", "Noto Sans Devanagari", sans-serif`,
                      }}
                    >
                      {renderFormattedHeadline()}
                    </h1>

                    {/* Sub-takeaway or quote elaboration if present */}
                    {(card.morningThoughtQuote || card.morningTakeaway || card.morningSubIntro) && (
                      <div
                        className={`border-t ${dividerBorder} w-full relative`}
                        style={{
                          marginTop: `${Math.max(6, Math.round(18 * previewScale))}px`,
                          paddingTop: `${Math.max(6, Math.round(14 * previewScale))}px`,
                          borderTopWidth: `${Math.max(1, Math.round(2 * previewScale))}px`,
                          maxWidth: '92%',
                        }}
                      >
                        {/* Subtle center accent on partition line */}
                        <div
                          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400/80 rounded-full"
                          style={{
                            width: `${Math.round(96 * previewScale)}px`,
                            height: `${Math.max(1.5, Math.round(2.5 * previewScale))}px`,
                          }}
                        />
                        <p
                          className={`${subTextColor} font-semibold leading-[1.35] font-['Baloo_2'] text-center whitespace-pre-line ${isIvory ? '' : 'drop-shadow'}`}
                          style={{
                            fontSize: `${Math.max(11, Math.round(Math.max(22, Math.min(38, Math.round((card.morningSubQuoteFontSize || 14) * 1.85))) * previewScale))}px`,
                          }}
                        >
                          {card.morningThoughtQuote || card.morningTakeaway || card.morningSubIntro}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Footer Bar (Manual PNG or default) */}
          <FooterGraphic
            socialHandle={card.socialHandle}
            whatsappNumber={card.whatsappNumber}
            customFooterPng={getActiveFooterPng(card)}
            websiteUrl={card.websiteUrl}
            showMobileNumber={card.showMobileNumber}
            activeSocialIcons={card.activeSocialIcons}
            footerBgColor={card.footerBgColor}
            footerTextColor={card.footerTextColor}
            footerIconStyle={card.footerIconStyle}
            showMasterBranding={card.showMasterBranding}
          />
        </div>
      ) : card.frameDesign === 'jacket-epaper' ? (
        /* ================= E-PAPER JACKET (NEWSPAPER FRONT-PAGE 2-COLUMN ARTICLE) ================= */
        <div
          className="absolute inset-x-0 bottom-0 top-[58px] sm:top-[74px] z-20 flex flex-col justify-between pointer-events-none"
          style={{ backgroundColor: epaperPaperBg }}
        >
          {/* Subtle Universal Watermark overlay in preview */}
          {(card.showWatermark || card.showSuperBreakingWatermark || shouldShowAppWatermark()) && (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex flex-col justify-around select-none">
              <div className="w-[200%] -ml-[50%] flex flex-col gap-8 -rotate-20">
                {[...Array(8)].map((_, rIdx) => (
                  <div key={rIdx} className="flex whitespace-nowrap gap-12 shrink-0">
                    {[...Array(8)].map((_, cIdx) => (
                      card.watermarkType === 'image' && card.watermarkImage ? (
                        <img
                          key={cIdx}
                          src={card.watermarkImage}
                          alt=""
                          className="object-contain"
                          style={{
                            width: `${Math.round((card.watermarkScale || 90) * 0.40)}px`,
                            opacity: card.watermarkOpacity ?? 0.12,
                          }}
                        />
                      ) : (
                        <span
                          key={cIdx}
                          className="font-black uppercase tracking-widest text-[12px]"
                          style={{
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            color:
                              card.watermarkColor === 'black'
                                ? `rgba(0, 0, 0, ${card.watermarkOpacity ?? 0.12})`
                                : card.watermarkColor === 'red'
                                ? `rgba(220, 38, 38, ${card.watermarkOpacity ?? 0.12})`
                                : `rgba(0, 0, 0, ${card.watermarkOpacity ?? 0.10})`,
                          }}
                        >
                          {card.watermarkText || card.breakingWatermarkText || (shouldShowAppWatermark() ? 'AI NEWS MAKER APP' : 'BREAKING NEWS WALA')}
                        </span>
                      )
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Middle Newspaper Article Area: strictly inside header-to-footer safe zone */}
          <div
            ref={contentAreaRef}
            className="relative flex-1 flex flex-col justify-between px-4 sm:px-6 py-2.5 pointer-events-auto overflow-hidden text-neutral-900"
            style={{ backgroundColor: epaperPaperBg, fontFamily: epaperFontFamily }}
          >
            {/* Top Newspaper Masthead / Kicker & Headline */}
            <div className="w-full flex flex-col">
              {/* Kicker Ribbon */}
              <div className="flex items-center justify-between pb-1 border-b border-neutral-300">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block bg-red-600 text-white font-black uppercase tracking-wider rounded px-1.5 py-0.5"
                    style={{
                      fontFamily: epaperFontFamily,
                      fontSize: `${Math.max(10, Math.round(18 * previewScale))}px`,
                    }}
                  >
                    {card.epaperKicker || 'विशेष रिपोर्ट'}
                  </span>
                  <span
                    className="font-bold text-neutral-600"
                    style={{
                      fontFamily: epaperFontFamily,
                      fontSize: `${Math.max(10, Math.round(18 * previewScale))}px`,
                    }}
                  >
                    • ई-पेपर विशेष संस्करण
                  </span>
                </div>
                <span
                  className="font-bold text-neutral-500"
                  style={{
                    fontFamily: epaperFontFamily,
                    fontSize: `${Math.max(10, Math.round(18 * previewScale))}px`,
                  }}
                >
                  {card.dateStr || getFormattedHindiDate()}
                </span>
              </div>

              {/* Main Newspaper Headline (Line height & top padding prevent Hindi ascender clipping) */}
              <h1
                className="font-black text-neutral-950 leading-[1.32] tracking-tight pt-1 pb-0.5 line-clamp-2"
                style={{
                  fontFamily: epaperFontFamily,
                  fontSize: `${Math.max(13, Math.round((card.headlineFontSize || 26) * 1.28 * previewScale))}px`,
                }}
              >
                {card.epaperHeadline || card.headline}
              </h1>

              {/* Sub-headline */}
              {card.epaperSubHeadline && (
                <p
                  className="text-neutral-700 font-semibold leading-tight mb-1 line-clamp-2"
                  style={{
                    fontFamily: epaperFontFamily,
                    fontSize: `${Math.max(10.5, Math.round(20 * previewScale))}px`,
                  }}
                >
                  {card.epaperSubHeadline}
                </p>
              )}

              {/* Byline Bar: Left Reporter Name, Right Promotional Call-to-Action */}
              <div
                className="flex items-center justify-between py-0.5 border-y border-neutral-300 mb-1.5 font-bold text-neutral-800"
                style={{
                  fontFamily: epaperFontFamily,
                  fontSize: `${Math.max(10, Math.round(18 * previewScale))}px`,
                }}
              >
                <div className="flex items-center gap-1 truncate max-w-[55%]">
                  <span>✍️</span>
                  <span className="truncate">{card.epaperByline || 'विशेष संवाददाता'}</span>
                </div>
                <div className="text-red-600 font-bold text-right truncate max-w-[45%]">
                  {card.epaperPromoTagline || '📢 अब आप भी भेजें अपनी खबर हम तक'}
                </div>
              </div>
            </div>

            {/* Reusable Ad Box Helper */}
            {(() => null)()}
            {/* Photos & Multi-Column Story Content */}
            {(() => {
              const renderAdBox = (ad: any, customClass: string = '') => {
                if (!ad) return null;
                const isImage = ad.type === 'image' && ad.imageUrl;
                const isWishes = ad.templateType === 'wishes';
                const isNotice = ad.templateType === 'notice';
                const isCommercial = ad.templateType === 'commercial';

                if (isImage) {
                  const cropX = ad.crop?.x ?? 50;
                  const cropY = ad.crop?.y ?? 50;
                  const cropZoom = ad.crop?.zoom ?? 1;

                  return (
                    <div className={`relative border border-red-600 rounded bg-white overflow-hidden shadow-sm flex flex-col justify-center ${customClass}`}>
                      <img
                        src={ad.imageUrl}
                        alt="Ad Banner"
                        className="w-full h-full object-cover"
                        style={{
                          objectPosition: `${cropX}% ${cropY}%`,
                          transform: `scale(${cropZoom})`,
                          transformOrigin: `${cropX}% ${cropY}%`,
                        }}
                        onError={handleImgError}
                      />
                      <div className="absolute top-0.5 right-0.5 bg-red-600 text-white font-bold text-[8px] px-1 py-0.2 rounded shadow">
                        विज्ञापन
                      </div>
                    </div>
                  );
                }

                // Template Ad Box
                const bgClass = isWishes ? 'bg-amber-50/95 border-amber-500' : isNotice ? 'bg-slate-50 border-slate-700' : 'bg-red-50/90 border-red-600';
                const pillBg = isNotice ? 'bg-slate-800' : 'bg-red-600';
                const pillText = isWishes ? '💐 हार्दिक शुभकामनाएं' : isCommercial ? '🏢 व्यावसायिक विज्ञापन' : isNotice ? '📢 सार्वजनिक सूचना' : '📢 स्थान रिक्त है • विज्ञापन';
                const titleText = ad.title || (isWishes ? 'सफलता एवं उज्ज्वल भविष्य की अनंत बधाई' : isCommercial ? 'व्यावसायिक प्रचार-प्रसार हेतु संपर्क करें' : isNotice ? 'सर्वसाधारण को सूचित किया जाता है' : 'स्थान रिक्त है — विज्ञापन हेतु संपर्क करें');
                const phoneText = ad.phone ? `📞 ${ad.phone}` : (card.whatsappNumber ? `📞 ${card.whatsappNumber}` : '📞 96698-02408');

                return (
                  <div
                    className={`border-2 border-dashed p-1.5 rounded flex flex-col justify-between items-center text-center shadow-xs overflow-hidden ${bgClass} ${customClass}`}
                    style={{ fontFamily: epaperFontFamily }}
                  >
                    <div className="w-full flex flex-col items-center">
                      <span className={`${pillBg} text-white font-black text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider mb-0.5`}>
                        {pillText}
                      </span>
                      <p className="font-black text-neutral-900 leading-tight line-clamp-2" style={{ fontSize: `${Math.max(8.5, Math.round(15 * previewScale))}px` }}>
                        {titleText}
                      </p>
                      {ad.subtitle && (
                        <p className="text-neutral-600 text-[8px] font-medium mt-0.5 line-clamp-1">
                          {ad.subtitle}
                        </p>
                      )}
                    </div>

                    <div className="w-full flex items-center justify-center gap-1 mt-0.5">
                      <span className="bg-white/95 border border-red-300 text-red-700 font-black text-[8px] px-1.5 py-0.5 rounded shadow-xs">
                        {phoneText}
                      </span>
                    </div>

                    {ad.sponsorName && (
                      <p className="text-neutral-500 text-[7.5px] font-semibold mt-0.5 truncate">
                        {ad.sponsorName}
                      </p>
                    )}
                  </div>
                );
              };

              const renderSecondaryStoryBox = (customClass: string = '') => {
                if (!card.epaperSecondaryStoryBody) return null;
                return (
                  <div
                    className={`bg-blue-50/80 border-l-3 border-l-blue-700 border border-blue-200 rounded p-1.5 shadow-sm flex flex-col justify-between overflow-hidden ${customClass}`}
                    style={{ fontFamily: epaperFontFamily }}
                  >
                    <div>
                      <div
                        className="font-black text-blue-900 flex items-center gap-1 mb-0.5 border-b border-blue-200 pb-0.5"
                        style={{ fontSize: `${Math.max(7.5, Math.round(16 * previewScale))}px` }}
                      >
                        <span>📰 {card.epaperSecondaryStoryTitle || 'संबंधित खबर / अन्य जानकारी'}</span>
                      </div>
                      <p
                        className="text-neutral-900 font-medium leading-snug line-clamp-5 whitespace-pre-line text-justify"
                        style={{ fontSize: `${Math.max(7, Math.round(14.5 * previewScale))}px` }}
                      >
                        {card.epaperSecondaryStoryBody}
                      </p>
                    </div>
                  </div>
                );
              };
              const renderLayoutContent = () => {
                const layout = card.epaperPhotoLayout || (
                  card.epaperPhotoCount === 0 ? '0_none' :
                  card.epaperPhotoCount === 2 ? '2_side' :
                  card.epaperPhotoCount === 3 ? '3_split' :
                  '1_top'
                );

              const mainCrop = card.imagePositions?.main || { x: 50, y: 50, zoom: 1 };
              const secondCrop = card.imagePositions?.second || { x: 50, y: 50, zoom: 1 };
              const thirdCrop = card.imagePositions?.third || { x: 50, y: 50, zoom: 1 };

              const getCropStyle = (crop: { x?: number; y?: number; zoom?: number }) => ({
                objectPosition: `${crop.x ?? 50}% ${crop.y ?? 50}%`,
                transform: `scale(${crop.zoom ?? 1})`,
                transformOrigin: `${crop.x ?? 50}% ${crop.y ?? 50}%`,
              });

              const heightClass =
                card.epaperPhotoHeightMode === 'compact'
                  ? 'h-20 sm:h-24'
                  : card.epaperPhotoHeightMode === 'tall'
                  ? 'h-32 sm:h-40'
                  : card.epaperPhotoHeightMode === 'extra-tall'
                  ? 'h-38 sm:h-46'
                  : 'h-26 sm:h-32';

              const renderHighlightsBox = (extraClass: string = '') => (
                <div
                  className={`bg-amber-50/80 border-l-3 border-l-red-600 border border-neutral-200 rounded p-1.5 shadow-sm flex flex-col justify-between ${extraClass}`}
                  style={{ fontFamily: epaperFontFamily }}
                >
                  <div>
                    <div
                      className="font-black text-red-700 uppercase tracking-wide flex items-center gap-1 mb-1 border-b border-red-200 pb-0.5"
                      style={{ fontSize: `${Math.max(7.5, Math.round(18 * previewScale))}px` }}
                    >
                      <span>📍</span>
                      <span className="truncate">{card.epaperHighlightsTitle || 'मुख्य बिंदु'}</span>
                    </div>
                    <ul className="space-y-1">
                      {(card.epaperHighlights && card.epaperHighlights.length > 0
                        ? card.epaperHighlights.slice(0, 4)
                        : [
                            'प्रशासनिक दल ने मौके पर पहुंचकर की त्वरित कार्रवाई',
                            'दोषियों के विरुद्ध सख्त वैधानिक धाराओं में केस दर्ज',
                          ]
                      ).map((hl, i) => (
                        <li
                          key={i}
                          className="text-neutral-900 font-bold flex items-start gap-1 leading-snug"
                          style={{ fontSize: `${Math.max(7, Math.round(16.5 * previewScale))}px` }}
                        >
                          <span className="text-red-600 font-black">•</span>
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );

              const renderQuoteBox = (extraClass: string = '') => (
                <div
                  className={`bg-red-50/90 border-l-3 border-l-red-600 border border-red-200 rounded p-1.5 shadow-sm flex flex-col justify-between ${extraClass}`}
                  style={{ fontFamily: epaperFontFamily }}
                >
                  <div>
                    <div
                      className="font-black text-red-800 flex items-center gap-1 mb-0.5 border-b border-red-200/80 pb-0.5"
                      style={{ fontSize: `${Math.max(7.5, Math.round(17 * previewScale))}px` }}
                    >
                      <span className="text-red-600 text-sm font-serif">“</span>
                      <span>बयान / प्रतिक्रिया</span>
                    </div>
                    <p
                      className="text-neutral-900 font-semibold italic leading-snug line-clamp-4"
                      style={{ fontSize: `${Math.max(7.5, Math.round(16 * previewScale))}px` }}
                    >
                      "{card.epaperQuoteText || 'जनहित और निष्पक्ष कार्रवाई के लिए प्रशासन पूरी तरह मुस्तैद है। किसी भी स्तर पर लापरवाही बर्दाश्त नहीं होगी।'}"
                    </p>
                  </div>
                  {(card.epaperQuoteSpeaker || card.epaperByline) && (
                    <p
                      className="text-red-700 font-black text-right mt-1 truncate"
                      style={{ fontSize: `${Math.max(6.5, Math.round(14.5 * previewScale))}px` }}
                    >
                      — {card.epaperQuoteSpeaker || card.epaperByline?.split('/')[0]?.trim()}
                    </p>
                  )}
                </div>
              );

              // Responsive, crisp newspaper story text size with justified margins matching CanvasExporter 100%
              const canvasFontSize = Math.max(14, Math.min(28, card.epaperFontSize || 17));
              const bodyFontSizePx = Math.max(8.5, Math.round(canvasFontSize * previewScale));
              const bodyLineHPx = Math.round(bodyFontSizePx * 1.38);
              const fullArticle = card.epaperArticleBody || 'जिले में प्रशासन और पुलिस की संयुक्त टीम ने बड़ी कार्रवाई करते हुए स्थिति को नियंत्रित किया। ग्रामीणों की शिकायतों के आधार पर वरिष्ठ अधिकारियों ने संयुक्त दल गठित कर मौके पर पहुंचकर जांच की और आवश्यक दिशा-निर्देश दिए।';

              const dropCapClass = hasDropCap
                ? 'first-letter:float-left first-letter:text-2xl sm:first-letter:text-3xl first-letter:font-black first-letter:mr-1.5 first-letter:text-red-700 first-letter:leading-none'
                : '';

              const renderStorySection = () => {
                const storyLayoutMode = card.epaperStoryLayout || '2_equal_cols';

                // 1. Option: 2 Equal Columns (Continuous story flowing directly below both photos, 100% Justified)
                if (storyLayoutMode === '2_equal_cols') {
                  const totalLen = fullArticle.length;
                  const isBalanced = card.epaperBalanceColumns !== false;
                  const splitRatio = isBalanced ? 0.50 : 0.60;
                  let splitIndex = Math.floor(totalLen * splitRatio);
                  const nextSpace = fullArticle.indexOf(' ', splitIndex);
                  if (nextSpace !== -1 && nextSpace < splitIndex + 30) {
                    splitIndex = nextSpace;
                  }
                  const col1Text = fullArticle.slice(0, splitIndex).trim();
                  const col2Text = fullArticle.slice(splitIndex).trim();
                  const showAdInCol2 = card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column');

                  return (
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden text-neutral-900" style={{ fontFamily: epaperFontFamily }}>
                        <div
                          className="flex flex-col font-semibold overflow-hidden border-r border-neutral-200 pr-2"
                          style={{
                            textAlign: 'justify',
                            textJustify: 'inter-word',
                            fontSize: `${bodyFontSizePx}px`,
                            lineHeight: `${bodyLineHPx}px`,
                          }}
                        >
                          <p className={`whitespace-pre-line ${dropCapClass}`}>
                            {col1Text}
                          </p>
                        </div>
                        <div
                          className="flex flex-col justify-between font-semibold overflow-hidden pl-0.5"
                          style={{
                            textAlign: 'justify',
                            textJustify: 'inter-word',
                            fontSize: `${bodyFontSizePx}px`,
                            lineHeight: `${bodyLineHPx}px`,
                          }}
                        >
                          <p className="whitespace-pre-line flex-1 overflow-hidden">
                            {col2Text}
                          </p>
                          {/* Optional Secondary Story or Auto-Fill Ad Box in empty Column space */}
                          {card.epaperSecondaryStoryBody ? (
                            <div className="mt-1 shrink-0">
                              {renderSecondaryStoryBox('w-full')}
                            </div>
                          ) : showAdInCol2 ? (
                            <div className="mt-1 shrink-0">
                              {renderAdBox(card.epaperAd, 'w-full min-h-[65px]')}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                }

                // 2. Option: 2 Columns with Leader Quote Call-out
                if (storyLayoutMode === '2_cols_with_quote') {
                  const totalLen = fullArticle.length;
                  const isBalanced = card.epaperBalanceColumns !== false;
                  const splitRatio = isBalanced ? 0.56 : 0.72;
                  let splitIndex = Math.floor(totalLen * splitRatio);
                  const nextSpace = fullArticle.indexOf(' ', splitIndex);
                  if (nextSpace !== -1 && nextSpace < splitIndex + 30) {
                    splitIndex = nextSpace;
                  }
                  const col1Text = fullArticle.slice(0, splitIndex).trim();
                  const col2Text = fullArticle.slice(splitIndex).trim();

                  const shouldRenderAdInCol2 = card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column');
                  const shouldRenderSecondaryStory = !!card.epaperSecondaryStoryBody;

                  return (
                    <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden text-neutral-800" style={{ fontFamily: epaperFontFamily }}>
                      <div
                        className="col-span-6 flex flex-col font-semibold text-neutral-900 overflow-hidden border-r border-neutral-200 pr-1.5"
                        style={{
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          fontSize: `${bodyFontSizePx}px`,
                          lineHeight: `${bodyLineHPx}px`,
                        }}
                      >
                        <p className={`whitespace-pre-line ${dropCapClass}`}>
                          {col1Text}
                        </p>
                      </div>
                      <div className="col-span-6 flex flex-col justify-between overflow-hidden gap-1.5">
                        {renderQuoteBox('shrink-0')}
                        
                        {col2Text && (
                          <div
                            className="flex-1 font-semibold text-neutral-900 overflow-hidden"
                            style={{
                              textAlign: 'justify',
                              textJustify: 'inter-word',
                              fontSize: `${bodyFontSizePx}px`,
                              lineHeight: `${bodyLineHPx}px`,
                            }}
                          >
                            <p className="whitespace-pre-line">
                              {col2Text}
                            </p>
                          </div>
                        )}

                        {shouldRenderSecondaryStory ? (
                          renderSecondaryStoryBox('shrink-0')
                        ) : shouldRenderAdInCol2 ? (
                          renderAdBox(card.epaperAd, 'shrink-0 min-h-[65px]')
                        ) : (!col2Text || shouldRenderAdInCol2 || card.epaperAd?.showAd !== false) ? (
                          renderAdBox(card.epaperAd || {
                            type: 'template',
                            templateType: 'classified',
                            title: 'स्थान रिक्त है - विज्ञापन हेतु संपर्क करें',
                            subtitle: 'ई-पेपर विशेष संस्करण में प्रचार प्रसार के लिए',
                            phone: card.whatsappNumber || '96698-02408',
                            sponsorName: card.channelNameHi || card.brandName || 'डिजिटल न्यूज़ नेटवर्क',
                          }, 'shrink-0 min-h-[65px]')
                        ) : null}
                      </div>
                    </div>
                  );
                }

                // 3. Option: 2 Columns with Highlights Box
                if (storyLayoutMode === '2_cols_with_highlights') {
                  const halfLen = Math.floor(fullArticle.length * 0.52);
                  const col1Text = fullArticle.slice(0, halfLen);
                  const col2Text = fullArticle.slice(halfLen);

                  return (
                    <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden text-neutral-800" style={{ fontFamily: epaperFontFamily }}>
                      <div
                        className="col-span-6 flex flex-col font-semibold text-neutral-900 overflow-hidden border-r border-neutral-200 pr-1.5"
                        style={{
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          fontSize: `${bodyFontSizePx}px`,
                          lineHeight: `${bodyLineHPx}px`,
                        }}
                      >
                        <p className={`whitespace-pre-line ${dropCapClass}`}>
                          {col1Text}
                        </p>
                      </div>
                      <div className="col-span-6 flex flex-col justify-between overflow-hidden gap-1.5">
                        <div
                          className="flex-1 font-semibold text-neutral-900 overflow-hidden"
                          style={{
                            textAlign: 'justify',
                            textJustify: 'inter-word',
                            fontSize: `${bodyFontSizePx}px`,
                            lineHeight: `${bodyLineHPx}px`,
                          }}
                        >
                          <p className="whitespace-pre-line">
                            {col2Text}
                          </p>
                        </div>
                        {renderHighlightsBox('shrink-0')}
                      </div>
                    </div>
                  );
                }

                // 4. Option: Classic (Left Main Story ~58% width, Right Highlights Box + Optional Ad)
                const showRightAd = card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column');
                return (
                  <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden text-neutral-800" style={{ fontFamily: epaperFontFamily }}>
                    <div
                      className="col-span-7 flex flex-col justify-between overflow-hidden"
                      style={{
                        textAlign: 'justify',
                        textJustify: 'inter-word',
                        fontSize: `${bodyFontSizePx}px`,
                        lineHeight: `${bodyLineHPx}px`,
                      }}
                    >
                      <p className={`text-neutral-900 font-semibold whitespace-pre-line ${dropCapClass}`}>
                        {fullArticle}
                      </p>
                    </div>
                    <div className="col-span-5 flex flex-col justify-between overflow-hidden gap-1.5">
                      <div className={showRightAd ? 'shrink-0' : 'h-full overflow-hidden'}>
                        {renderHighlightsBox(showRightAd ? 'h-auto' : 'h-full')}
                      </div>
                      {showRightAd && (
                        <div className="flex-1 min-h-[85px] overflow-hidden flex flex-col justify-end">
                          {renderAdBox(card.epaperAd, 'w-full h-full min-h-[85px]')}
                        </div>
                      )}
                      {card.epaperSecondaryStoryBody && renderSecondaryStoryBox('shrink-0')}
                    </div>
                  </div>
                );
              };

              // 1. Layout: 1_below_highlights (Left: 100% full story height; Right: Highlights on top + Photo 1 below)
              if (layout === '1_below_highlights' && card.images.main) {
                return (
                  <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden text-neutral-800" style={{ fontFamily: epaperFontFamily }}>
                    <div
                      className="col-span-7 flex flex-col justify-between leading-relaxed overflow-hidden"
                      style={{
                        textAlign: 'justify',
                        textJustify: 'inter-word',
                        fontSize: `${bodyFontSizePx}px`,
                      }}
                    >
                      <p className={`text-neutral-900 font-semibold leading-relaxed whitespace-pre-line ${dropCapClass}`}>
                        {fullArticle}
                      </p>
                    </div>
                    <div className="col-span-5 flex flex-col justify-between overflow-hidden gap-1.5">
                      <div className="flex-1 overflow-hidden">
                        {renderHighlightsBox('h-full')}
                      </div>
                      <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm shrink-0">
                        <div className="w-full h-20 sm:h-26 overflow-hidden rounded-sm bg-neutral-200">
                          <img
                            src={card.images.main}
                            alt="News Photo"
                            className="w-full h-full object-cover transition-transform"
                            style={getCropStyle(mainCrop)}
                          />
                        </div>
                        {card.epaperPhotoCaption && (
                          <p
                            className="text-neutral-600 font-medium italic mt-0.5 px-0.5 line-clamp-1"
                            style={{
                              fontFamily: epaperFontFamily,
                              fontSize: `${Math.max(6.5, Math.round(15 * previewScale))}px`,
                            }}
                          >
                            📷 {card.epaperPhotoCaption}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // 2. Layout: 1_thumb_left (Left: compact thumbnail with story below; Right: full highlights box OR highlights on top + Ad on bottom)
              if (layout === '1_thumb_left' && card.images.main) {
                const showRightAd = card.epaperAd?.showAd && (card.epaperAd.placement === 'auto_fill' || card.epaperAd.placement === 'right_column');
                return (
                  <div className="flex-1 grid grid-cols-12 gap-2 overflow-hidden text-neutral-800" style={{ fontFamily: epaperFontFamily }}>
                    <div className="col-span-7 flex flex-col overflow-hidden leading-relaxed gap-1.5">
                      <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm shrink-0">
                        <div className="w-full h-18 sm:h-22 overflow-hidden rounded-sm bg-neutral-200">
                          <img
                            src={card.images.main}
                            alt="News Photo"
                            className="w-full h-full object-cover transition-transform"
                            style={getCropStyle(mainCrop)}
                          />
                        </div>
                        {card.epaperPhotoCaption && (
                          <p
                            className="text-neutral-600 font-medium italic mt-0.5 px-0.5 line-clamp-1"
                            style={{
                              fontFamily: epaperFontFamily,
                              fontSize: `${Math.max(6.5, Math.round(15 * previewScale))}px`,
                            }}
                          >
                            📷 {card.epaperPhotoCaption}
                          </p>
                        )}
                      </div>
                      <div
                        className="flex-1 overflow-hidden"
                        style={{
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          fontSize: `${bodyFontSizePx}px`,
                          lineHeight: `${bodyLineHPx}px`,
                        }}
                      >
                        <p className={`text-neutral-900 font-semibold leading-relaxed whitespace-pre-line ${dropCapClass}`}>
                          {fullArticle}
                        </p>
                      </div>
                    </div>
                    <div className="col-span-5 flex flex-col justify-between overflow-hidden gap-1.5">
                      <div className={showRightAd ? 'shrink-0' : 'h-full overflow-hidden'}>
                        {renderHighlightsBox(showRightAd ? 'h-auto' : 'h-full')}
                      </div>
                      {showRightAd && (
                        <div className="flex-1 min-h-[85px] overflow-hidden flex flex-col justify-end">
                          {renderAdBox(card.epaperAd, 'w-full h-full min-h-[85px]')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // 3. Layout: 2_column_bottom (Story & Highlights on top; 2 Photos strictly anchored at bottom above footer)
              if (layout === '2_column_bottom') {
                return (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-hidden mb-1">
                      {renderStorySection()}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 shrink-0">
                      <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                        <div className="w-full h-14 sm:h-18 overflow-hidden rounded-sm bg-neutral-200">
                          <img
                            src={card.images.second || card.images.main}
                            alt="Photo 1"
                            className="w-full h-full object-cover transition-transform"
                            style={getCropStyle(secondCrop)}
                          />
                        </div>
                        {card.epaperPhotoCaption2 && (
                          <p
                            className="text-neutral-600 italic truncate mt-0.5 px-0.5"
                            style={{
                              fontFamily: epaperFontFamily,
                              fontSize: `${Math.max(6, Math.round(14 * previewScale))}px`,
                            }}
                          >
                            📷 {card.epaperPhotoCaption2}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                        <div className="w-full h-14 sm:h-18 overflow-hidden rounded-sm bg-neutral-200">
                          <img
                            src={card.images.third || card.images.second || card.images.main}
                            alt="Photo 2"
                            className="w-full h-full object-cover transition-transform"
                            style={getCropStyle(thirdCrop)}
                          />
                        </div>
                        {card.epaperPhotoCaption3 && (
                          <p
                            className="text-neutral-600 italic truncate mt-0.5 px-0.5"
                            style={{
                              fontFamily: epaperFontFamily,
                              fontSize: `${Math.max(6, Math.round(14 * previewScale))}px`,
                            }}
                          >
                            📷 {card.epaperPhotoCaption3}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard Top Photos Layouts (1_top, 2_side, 3_split, 1_top_2_bottom, 0_none)
              return (
                <div className="flex-1 flex flex-col justify-between overflow-hidden" style={{ fontFamily: epaperFontFamily }}>
                  {/* Top Photo Section */}
                  {card.images.main && layout !== '0_none' && (
                    <div className="w-full mb-1.5 shrink-0">
                      {layout === '1_top' && (
                        <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                          <div className={`w-full ${heightClass} overflow-hidden rounded-sm bg-neutral-200`}>
                            <img
                              src={card.images.main}
                              alt="E-Paper News"
                              className="w-full h-full object-cover transition-transform"
                              style={getCropStyle(mainCrop)}
                            />
                          </div>
                          {card.epaperPhotoCaption && (
                            <p
                              className="text-neutral-600 font-medium italic mt-0.5 px-1 line-clamp-1"
                              style={{
                                fontFamily: epaperFontFamily,
                                fontSize: `${Math.max(6.5, Math.round(16 * previewScale))}px`,
                              }}
                            >
                              📷 {card.epaperPhotoCaption}
                            </p>
                          )}
                        </div>
                      )}

                      {layout === '2_side' && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                            <div className={`w-full ${heightClass} overflow-hidden rounded-sm bg-neutral-200`}>
                              <img
                                src={card.images.main}
                                alt="Photo 1"
                                className="w-full h-full object-cover transition-transform"
                                style={getCropStyle(mainCrop)}
                              />
                            </div>
                            {card.epaperPhotoCaption && (
                              <p
                                className="text-neutral-600 font-medium italic mt-0.5 px-0.5 line-clamp-1"
                                style={{
                                  fontFamily: epaperFontFamily,
                                  fontSize: `${Math.max(6, Math.round(15 * previewScale))}px`,
                                }}
                              >
                                📷 {card.epaperPhotoCaption}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                            <div className={`w-full ${heightClass} overflow-hidden rounded-sm bg-neutral-200`}>
                              <img
                                src={card.images.second || card.images.main}
                                alt="Photo 2"
                                className="w-full h-full object-cover transition-transform"
                                style={getCropStyle(secondCrop)}
                              />
                            </div>
                            {card.epaperPhotoCaption2 && (
                              <p
                                className="text-neutral-600 font-medium italic mt-0.5 px-0.5 line-clamp-1"
                                style={{
                                  fontFamily: epaperFontFamily,
                                  fontSize: `${Math.max(6, Math.round(15 * previewScale))}px`,
                                }}
                              >
                                📷 {card.epaperPhotoCaption2}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {layout === '3_split' && (
                        <div className="grid grid-cols-12 gap-1.5">
                          <div className="col-span-7 flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                            <div className={`w-full ${heightClass} overflow-hidden rounded-sm bg-neutral-200`}>
                              <img
                                src={card.images.main}
                                alt="Photo 1"
                                className="w-full h-full object-cover transition-transform"
                                style={getCropStyle(mainCrop)}
                              />
                            </div>
                            {card.epaperPhotoCaption && (
                              <p
                                className="text-neutral-600 font-medium italic mt-0.5 px-0.5 line-clamp-1"
                                style={{
                                  fontFamily: epaperFontFamily,
                                  fontSize: `${Math.max(6, Math.round(15 * previewScale))}px`,
                                }}
                              >
                                📷 {card.epaperPhotoCaption}
                              </p>
                            )}
                          </div>
                          <div className="col-span-5 flex flex-col gap-1.5">
                            <div className="flex-1 flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                              <div className="w-full h-11 sm:h-14 overflow-hidden rounded-sm bg-neutral-200">
                                <img
                                  src={card.images.second || card.images.main}
                                  alt="Photo 2"
                                  className="w-full h-full object-cover transition-transform"
                                  style={getCropStyle(secondCrop)}
                                />
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                              <div className="w-full h-11 sm:h-14 overflow-hidden rounded-sm bg-neutral-200">
                                <img
                                  src={card.images.third || card.images.main}
                                  alt="Photo 3"
                                  className="w-full h-full object-cover transition-transform"
                                  style={getCropStyle(thirdCrop)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {layout === '1_top_2_bottom' && (
                        <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-1 shadow-sm">
                          <div className="w-full h-16 sm:h-20 overflow-hidden rounded-sm bg-neutral-200">
                            <img
                              src={card.images.main}
                              alt="Top Photo"
                              className="w-full h-full object-cover transition-transform"
                              style={getCropStyle(mainCrop)}
                            />
                          </div>
                          {card.epaperPhotoCaption && (
                            <p
                              className="text-neutral-600 font-medium italic mt-0.5 px-1 line-clamp-1 text-[6.5px]"
                              style={{ fontFamily: epaperFontFamily }}
                            >
                              📷 {card.epaperPhotoCaption}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dynamic Story & Highlights / Multi-Column Section */}
                  <div className="flex-1 min-h-0 overflow-hidden mb-1 flex flex-col">
                    {renderStorySection()}
                  </div>

                  {/* Bottom Photos for 1_top_2_bottom */}
                  {layout === '1_top_2_bottom' && (
                    <div className="grid grid-cols-2 gap-1.5 mt-1.5 shrink-0">
                      <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-0.5">
                        <div className="w-full h-11 sm:h-13 overflow-hidden rounded bg-neutral-200">
                          <img
                            src={card.images.second || card.images.main}
                            alt="Bottom Photo 1"
                            className="w-full h-full object-cover"
                            style={getCropStyle(secondCrop)}
                          />
                        </div>
                        {card.epaperPhotoCaption2 && (
                          <p className="text-neutral-600 italic text-[6px] truncate mt-0.5" style={{ fontFamily: epaperFontFamily }}>
                            📷 {card.epaperPhotoCaption2}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col bg-neutral-100 border border-neutral-300 rounded p-0.5">
                        <div className="w-full h-11 sm:h-13 overflow-hidden rounded bg-neutral-200">
                          <img
                            src={card.images.third || card.images.second || card.images.main}
                            alt="Bottom Photo 2"
                            className="w-full h-full object-cover"
                            style={getCropStyle(thirdCrop)}
                          />
                        </div>
                        {card.epaperPhotoCaption3 && (
                          <p className="text-neutral-600 italic text-[6px] truncate mt-0.5" style={{ fontFamily: epaperFontFamily }}>
                            📷 {card.epaperPhotoCaption3}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div
                ref={bodyAreaRef}
                className="flex-1 flex flex-col min-h-0 overflow-hidden relative justify-between"
              >
                {/* Photo & Story layout */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  {renderLayoutContent()}
                </div>

                {/* Bottom Strip Advertisement (Always pinned at bottom, story sits cleanly above it) */}
                {card.epaperAd?.showAd && card.epaperAd.placement === 'bottom_strip' && (
                  <div className="w-full shrink-0 pt-1.5 z-10">
                    {renderAdBox(card.epaperAd, 'w-full h-14 sm:h-18')}
                  </div>
                )}

                {/* Second Ad: Bottom Strip */}
                {card.epaperSecondAd?.showAd && card.epaperSecondAd.placement === 'bottom_strip' && (
                  <div className="w-full shrink-0 pt-1.5 z-10">
                    {renderAdBox(card.epaperSecondAd, 'w-full h-14 sm:h-18')}
                  </div>
                )}

                {/* Movable Advertisement 1 overlay inside the content area */}
                {card.epaperAd?.showAd && card.epaperAd.placement === 'movable' && (
                  <div
                    className="absolute z-30 cursor-move select-none group border-2 border-red-500/80 hover:border-red-600 rounded shadow-md bg-white transition-shadow"
                    style={{
                      left: `${card.epaperAd.x ?? 50}%`,
                      top: `${card.epaperAd.y ?? 60}%`,
                      width: `${card.epaperAd.width ?? 45}%`,
                      height: `${card.epaperAd.height ?? 25}%`,
                    }}
                    onMouseDown={(e) => handleAdMouseDown(e, 'ad1')}
                  >
                    <div className="w-full h-full relative overflow-hidden">
                      {renderAdBox(card.epaperAd, 'w-full h-full')}
                      <div className="absolute top-1 left-1 bg-neutral-950/80 text-white text-[8px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 pointer-events-none z-30">
                        <span>✥ ड्रैग करें</span>
                      </div>
                      {/* Bottom-right corner resize handle */}
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-red-600 text-white cursor-se-resize flex items-center justify-center text-[9px] font-black z-40 rounded-tl shadow"
                        title="साइज बदलने के लिए खींचें"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'ad1')}
                      >
                        ↘
                      </div>
                    </div>
                  </div>
                )}

                {/* Movable Advertisement 2 overlay inside the content area */}
                {card.epaperSecondAd?.showAd && card.epaperSecondAd.placement === 'movable' && (
                  <div
                    className="absolute z-30 cursor-move select-none group border-2 border-amber-500/90 hover:border-amber-600 rounded shadow-md bg-white transition-shadow"
                    style={{
                      left: `${card.epaperSecondAd.x ?? 52}%`,
                      top: `${card.epaperSecondAd.y ?? 68}%`,
                      width: `${card.epaperSecondAd.width ?? 44}%`,
                      height: `${card.epaperSecondAd.height ?? 22}%`,
                    }}
                    onMouseDown={(e) => handleAdMouseDown(e, 'ad2')}
                  >
                    <div className="w-full h-full relative overflow-hidden">
                      {renderAdBox(card.epaperSecondAd, 'w-full h-full')}
                      <div className="absolute top-1 left-1 bg-amber-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 pointer-events-none z-30">
                        <span>✥ विज्ञापन 2</span>
                      </div>
                      {/* Bottom-right corner resize handle */}
                      <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-amber-600 text-white cursor-se-resize flex items-center justify-center text-[9px] font-black z-40 rounded-tl shadow"
                        title="साइज बदलने के लिए खींचें"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'ad2')}
                      >
                        ↘
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          </div>

          {/* Yellow/Custom Footer Graphic at Bottom */}
          <FooterGraphic
            socialHandle={card.socialHandle}
            whatsappNumber={card.whatsappNumber}
            customFooterPng={getActiveFooterPng(card)}
            websiteUrl={card.websiteUrl}
            showMobileNumber={card.showMobileNumber}
            activeSocialIcons={card.activeSocialIcons}
            footerBgColor={card.footerBgColor}
            footerTextColor={card.footerTextColor}
            footerIconStyle={card.footerIconStyle}
            showMasterBranding={card.showMasterBranding}
          />
        </div>
      ) : card.frameDesign === 'jacket-text-breaking' ? (
        /* ================= TEXT BREAKING JACKET (EXCLUSIVE TEXT-ONLY) ================= */
        <div className="absolute inset-x-0 bottom-0 top-[66px] sm:top-[80px] z-20 flex flex-col justify-between">
          {/* Middle Main Content: 3D Breaking News Badge + Centered Partition Line + Headline */}
          <div className="flex-1 flex flex-col justify-start items-center px-4 sm:px-8 pt-2 sm:pt-3 pb-2">
            {/* 3D Breaking News Badge (Moved upwards closer to header) */}
            <div className="mb-2">
              <TextBreakingBadge
                style={card.textBreakingStyle || 'breaking-3d-en'}
                customTitle={card.textBreakingCustomTitle}
                titleSize={card.textBreakingTitleSize}
              />
            </div>

            {/* Centered Partition Line (Elegant middle divider, not full width) */}
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4 w-full max-w-[42%] mx-auto">
              <div className="h-[2px] sm:h-[2.5px] flex-1 bg-gradient-to-r from-transparent via-red-600 to-red-600 rounded-full" />
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rotate-45 bg-red-600 shrink-0 shadow-sm" />
              <div className="h-[2px] sm:h-[2.5px] flex-1 bg-gradient-to-r from-red-600 via-red-600 to-transparent rounded-full" />
            </div>

            {/* Centered Headline with highlighted words in red */}
            <div className="flex-1 flex items-center justify-center w-full max-w-[96%] mx-auto px-2">
              <h1
                className="font-black tracking-normal leading-[1.3] text-center overflow-visible text-neutral-950"
                style={{
                  fontSize: `${Math.round(effectivePreviewFontSize * 1.15)}px`,
                  fontFamily: `"${card.headlineFontFamily || 'Baloo 2'}", "Noto Sans Devanagari", sans-serif`,
                }}
              >
                {renderFormattedHeadline()}
              </h1>
            </div>
          </div>

          {/* Above Footer: Location & "पूरी खबर डिस्क्रिप्शन में" Strip */}
          <div className="flex flex-col justify-end w-full">
            <div className="flex items-center justify-between px-3 sm:px-6 mb-2">
              {/* Location Badge (Left) */}
              {card.showLocation !== false && card.location ? (
                <div
                  className="bg-red-600 border border-red-500/90 text-white rounded px-2 sm:px-2.5 flex items-center gap-1 shadow-md shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden"
                  style={{
                    height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                    fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                  }}
                >
                  <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white shrink-0" />
                  <span className="font-black font-['Baloo_2'] tracking-wide truncate">
                    {card.location}
                  </span>
                </div>
              ) : (
                <div />
              )}

              {/* Callout Tag: "🔴 पूरी खबर डिस्क्रिप्शन में" (Right) */}
              {card.showCallout && (
                <div
                  className="bg-white border-2 border-yellow-400 rounded px-2 sm:px-2.5 shadow-md flex items-center gap-1 shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden"
                  style={{
                    height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                    fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                  <span className="text-neutral-950 font-black font-['Baloo_2'] truncate">
                    {card.calloutTag.replace('🔴', '').trim() || 'पूरी खबर डिस्क्रिप्शन में'}
                  </span>
                </div>
              )}
            </div>

            {/* Yellow Footer Graphic */}
            <FooterGraphic
              socialHandle={card.socialHandle}
              whatsappNumber={card.whatsappNumber}
              customFooterPng={getActiveFooterPng(card)}
              websiteUrl={card.websiteUrl}
              showMobileNumber={card.showMobileNumber}
              activeSocialIcons={card.activeSocialIcons}
              footerBgColor={card.footerBgColor}
              footerTextColor={card.footerTextColor}
              footerIconStyle={card.footerIconStyle}
              showMasterBranding={card.showMasterBranding}
            />
          </div>
        </div>
      ) : card.frameDesign === 'jacket-breaking-red' ? (
        /* ================= SUPER BREAKING JACKET LAYOUT ================= */
        <div className="absolute bottom-0 inset-x-0 z-20 flex flex-col justify-end">
          {/* A. Location & Callout Tag floating ABOVE the Breaking News ribbon or resting above white box if ribbon is hidden */}
          <div className={`flex items-center justify-between px-3 sm:px-6 pointer-events-none ${card.showBreakingRibbon === false ? 'mb-1.5' : 'mb-2'}`}>
            {/* Location Badge (Left) */}
            {card.location ? (
              <div
                className="bg-red-600 border border-red-500/90 text-white rounded px-2 sm:px-2.5 flex items-center gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.6)] shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden pointer-events-auto"
                style={{
                  height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                  fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                }}
              >
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white shrink-0" />
                <span className="font-black font-['Baloo_2'] tracking-wide truncate">
                  {card.location}
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* Callout Tag (Right) */}
            {card.showCallout && (
              <div
                className="bg-white border-2 border-yellow-400 rounded px-2 sm:px-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.6)] flex items-center gap-1 shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden pointer-events-auto"
                style={{
                  height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                  fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                }}
              >
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                <span className="text-neutral-950 font-black font-['Baloo_2'] truncate">
                  {card.calloutTag.replace('🔴', '').trim() || 'पूरी खबर डिस्क्रिप्शन में'}
                </span>
              </div>
            )}
          </div>

          {/* B. BREAKING NEWS Ribbon (Centered, 70% width, half-in half-out of white box) - Can be hidden by editor */}
          {card.showBreakingRibbon !== false && (
            <div className="relative w-full z-25 flex justify-center items-center select-none -mb-2 px-6">
              <img
                src={card.customBreakingRibbonPng || '/assets/breaking_news_ribbon.svg'}
                alt="BREAKING NEWS"
                className="h-auto object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.30)] transition-all"
                style={{
                  width: '70%',
                  maxWidth: '440px',
                }}
              />
            </div>
          )}

          {/* Wrapper for Bottom White Headline Plate + Footer (Measured by bottomPlateRef) */}
          <div ref={bottomPlateRef} className="w-full flex flex-col z-20">
            {/* C. Solid Pure White Background with Headline positioned closer to Footer, removing unwanted space */}
            <div
              className="bg-white pb-1.5 sm:pb-2 shadow-xl flex flex-col justify-end border-t border-neutral-200"
              style={{
                paddingLeft: `${effectivePaddingX}px`,
                paddingRight: `${effectivePaddingX}px`,
                paddingTop: card.showBreakingRibbon === false ? '14px' : '36px',
              }}
            >
              <h1
                className={`font-black tracking-normal leading-[1.34] text-[#0A0A0A] ${
                  card.headlineAlign === 'center'
                    ? 'text-center'
                    : card.headlineAlign === 'left'
                    ? 'text-left'
                    : 'text-center sm:text-left'
                }`}
                style={{
                  fontSize: `${effectivePreviewFontSize}px`,
                  fontFamily: `"${card.headlineFontFamily || 'Baloo 2'}", "Noto Sans Devanagari", sans-serif`,
                }}
              >
                {renderFormattedHeadline()}
              </h1>
            </div>

            {/* D. Yellow Footer Graphic */}
            <FooterGraphic
              socialHandle={card.socialHandle}
              whatsappNumber={card.whatsappNumber}
              customFooterPng={getActiveFooterPng(card)}
              websiteUrl={card.websiteUrl}
              showMobileNumber={card.showMobileNumber}
              activeSocialIcons={card.activeSocialIcons}
              footerBgColor={card.footerBgColor}
              footerTextColor={card.footerTextColor}
              footerIconStyle={card.footerIconStyle}
              showMasterBranding={card.showMasterBranding}
            />
          </div>
        </div>
      ) : card.frameDesign === 'jacket-quote' ? (
        /* ================= QUOTE (बयान) JACKET LAYOUT (52/48 split, Centered Statement) ================= */
        (() => {
          const effectiveSpeaker = getEffectiveSpeaker(card.speakerName, card.speakerTitle, card.headline);
          const hasSpeaker = Boolean(effectiveSpeaker.name);

          return (
            <div className="absolute bottom-0 inset-x-0 top-[52%] z-20 flex flex-col justify-between bg-black">
              {/* Top Strip: Location (Left) & Callout Tag (Right) floating on photo above black plate */}
              <div className="absolute top-[-36px] sm:top-[-40px] inset-x-0 flex items-center justify-between px-3 sm:px-4 z-20 pointer-events-none">
                {card.showLocation !== false && card.location ? (
                  <div
                    className="bg-red-600 border border-red-500/90 text-white rounded px-2 sm:px-2.5 flex items-center gap-1 shadow-[0_4px_12px_rgba(0,0,0,0.6)] shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden"
                    style={{
                      height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                      fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                    }}
                  >
                    <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white shrink-0" />
                    <span className="font-black font-['Baloo_2'] tracking-wide truncate">
                      {card.location}
                    </span>
                  </div>
                ) : (
                  <div />
                )}

                {card.showCallout && card.calloutTag ? (
                  <div
                    className="bg-white border-2 border-yellow-400 rounded px-2 sm:px-2.5 shadow-[0_4px_12px_rgba(0,0,0,0.6)] flex items-center gap-1 shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden"
                    style={{
                      height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                      fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                    <span className="text-neutral-950 font-black font-['Baloo_2'] truncate">
                      {card.calloutTag.replace('🔴', '').trim() || 'पूरी खबर डिस्क्रिप्शन में'}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Main Statement Container - perfectly distributed in black area */}
              <div className="flex-1 flex flex-col justify-evenly px-3 sm:px-6 py-1.5">
                {/* A. Top Quote Line & Yellow Badge with Quote Icon */}
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="h-[2px] flex-1 bg-[#FFE600] max-w-[80px] sm:max-w-[120px]" />
                  <div className="bg-[#FFE600] text-black px-3.5 py-1 rounded-lg flex items-center justify-center shadow-md">
                    <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black fill-black" />
                  </div>
                  <div className="h-[2px] flex-1 bg-[#FFE600] max-w-[80px] sm:max-w-[120px]" />
                </div>

                {/* B. 2-3 Line Headline / Statement Quote */}
                <div className="px-2 sm:px-4 py-0.5">
                  <h1
                    className={`font-black tracking-normal leading-[1.36] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${
                      card.headlineAlign === 'justify'
                        ? 'text-justify'
                        : card.headlineAlign === 'left'
                        ? 'text-left'
                        : 'text-center'
                    }`}
                    style={{
                      fontSize: `${effectivePreviewFontSize}px`,
                      fontFamily: `"${card.headlineFontFamily || 'Baloo 2'}", "Noto Sans Devanagari", sans-serif`,
                      textAlignLast:
                        card.headlineAlign === 'justify'
                          ? 'justify'
                          : card.headlineAlign === 'left'
                          ? 'left'
                          : 'center',
                    }}
                  >
                    {renderFormattedHeadline()}
                  </h1>
                </div>

                {/* C. Bottom Quote Line & Yellow Badge with Closing Quote Icon */}
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="h-[2px] flex-1 bg-[#FFE600] max-w-[80px] sm:max-w-[120px]" />
                  <div className="bg-[#FFE600] text-black px-3.5 py-1 rounded-lg flex items-center justify-center shadow-md">
                    <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black fill-black rotate-180" />
                  </div>
                  <div className="h-[2px] flex-1 bg-[#FFE600] max-w-[80px] sm:max-w-[120px]" />
                </div>

                {/* D. Speaker Name & Designation (Open Text, No Round Box) */}
                {hasSpeaker && (
                  <div className="flex items-center justify-center pt-1 pb-0.5">
                    <div className="inline-flex items-center gap-2 text-center font-['Baloo_2'] tracking-wide max-w-[95%] overflow-hidden">
                      <span className="text-white font-black text-sm sm:text-base whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        {effectiveSpeaker.name.startsWith('—') || effectiveSpeaker.name.startsWith('-')
                          ? effectiveSpeaker.name
                          : `— ${effectiveSpeaker.name}`}
                      </span>
                      {effectiveSpeaker.title && (
                        <>
                          <span className="text-[#FFE600] font-bold text-sm shrink-0">|</span>
                          <span className="text-neutral-200 font-semibold text-xs sm:text-sm truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            {effectiveSpeaker.title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* E. Yellow Footer Graphic (Same as all other templates) */}
              <FooterGraphic
                socialHandle={card.socialHandle}
                whatsappNumber={card.whatsappNumber}
                customFooterPng={getActiveFooterPng(card)}
                websiteUrl={card.websiteUrl}
                showMobileNumber={card.showMobileNumber}
                activeSocialIcons={card.activeSocialIcons}
                footerBgColor={card.footerBgColor}
                footerTextColor={card.footerTextColor}
                footerIconStyle={card.footerIconStyle}
                showMasterBranding={card.showMasterBranding}
              />
            </div>
          );
        })()
      ) : (
        /* ================= STANDARD ORIGINAL JACKET LAYOUT ================= */
        <div className="absolute bottom-0 inset-x-0 z-20 flex flex-col justify-end pt-8 pb-0 bg-gradient-to-t from-black via-black/95 via-50% to-transparent">
          {/* Top Strip above Caption: Location & "🔴 पूरी खबर डिस्क्रिप्शन में" */}
          <div className="flex items-center justify-between px-3 sm:px-6 mb-2 sm:mb-3">
            {/* Location Badge (Placed at top space above headline) */}
            {card.location ? (
              <div
                className="bg-red-600 border border-red-500/80 text-white rounded px-2 sm:px-2.5 flex items-center gap-1 shadow-md shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden"
                style={{
                  height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                  fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                }}
              >
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white fill-white shrink-0" />
                <span className="font-black font-['Baloo_2'] tracking-wide truncate">
                  {card.location}
                </span>
              </div>
            ) : (
              <div />
            )}

            {/* Callout Tag: "🔴 पूरी खबर डिस्क्रिप्शन में" */}
            {card.showCallout && (
              <div
                className="bg-white border-2 border-yellow-400 rounded px-2 sm:px-2.5 shadow-md flex items-center gap-1 shrink-0 whitespace-nowrap max-w-[48%] overflow-hidden"
                style={{
                  height: `${Math.max(22, Math.min(32, Math.round(44 * previewScale)))}px`,
                  fontSize: `${Math.max(11, Math.min(14, Math.round(24 * previewScale)))}px`,
                }}
              >
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
                <span className="text-neutral-950 font-black font-['Baloo_2'] truncate">
                  {card.calloutTag.replace('🔴', '').trim() || 'पूरी खबर डिस्क्रिप्शन में'}
                </span>
              </div>
            )}
          </div>

          {/* 3-Line News Headline Caption in Baloo 2 font - Justified (Default) or Center or Left */}
          <div
            className="pt-1.5 pb-2.5 sm:pb-3 overflow-visible"
            style={{
              paddingLeft: `${effectivePaddingX}px`,
              paddingRight: `${effectivePaddingX}px`,
            }}
          >
            <h1
              className={`font-black tracking-normal leading-[1.38] overflow-visible drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] ${
                card.headlineAlign === 'justify'
                  ? 'text-justify'
                  : card.headlineAlign === 'left'
                  ? 'text-left'
                  : 'text-center'
              }`}
              style={{
                fontSize: `${effectivePreviewFontSize}px`,
                fontFamily: `"${card.headlineFontFamily || 'Baloo 2'}", "Noto Sans Devanagari", sans-serif`,
                textJustify: 'inter-word',
                textAlignLast:
                  card.headlineAlign === 'justify'
                    ? 'justify'
                    : card.headlineAlign === 'left'
                    ? 'left'
                    : 'center',
              }}
            >
              {renderFormattedHeadline()}
            </h1>
          </div>

          {/* 4. PERMANENT THEME FOOTER BAR (Matching Footer.png) */}
          {!(card.frameDesign === 'custom-png' && card.hideDefaultFooterInCustomFrame) && (
            <FooterGraphic
              socialHandle={card.socialHandle}
              whatsappNumber={card.whatsappNumber}
              customFooterPng={getActiveFooterPng(card)}
              websiteUrl={card.websiteUrl}
              showMobileNumber={card.showMobileNumber}
              activeSocialIcons={card.activeSocialIcons}
              footerBgColor={card.footerBgColor}
              footerTextColor={card.footerTextColor}
              footerIconStyle={card.footerIconStyle}
              showMasterBranding={card.showMasterBranding}
            />
          )}
        </div>
      )}

      {/* Floating Custom Text Overlays with custom fonts, colors and positions */}
      {card.customTextOverlays && card.customTextOverlays.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          {card.customTextOverlays.map((item) => (
            <div
              key={item.id}
              className="absolute select-none pointer-events-auto shadow-md transition-transform"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: item.fontFamily ? `"${item.fontFamily}", sans-serif` : 'inherit',
                fontSize: `${Math.max(11, Math.round(item.fontSize * previewScale * 1.6))}px`,
                color: item.color || '#FFFFFF',
                backgroundColor: item.backgroundColor && item.backgroundColor !== 'transparent' ? item.backgroundColor : 'transparent',
                fontWeight: item.isBold !== false ? 800 : 500,
                padding: item.backgroundColor && item.backgroundColor !== 'transparent' ? '4px 12px' : '2px 6px',
                borderRadius: '8px',
                border: item.backgroundColor && item.backgroundColor !== 'transparent' ? '1px solid rgba(255,255,255,0.2)' : 'none',
                textShadow: item.backgroundColor && item.backgroundColor !== 'transparent' ? 'none' : '0 2px 4px rgba(0,0,0,0.9), 0 0 3px #000',
                whiteSpace: 'pre-wrap',
                maxWidth: '85%',
              }}
            >
              {item.text}
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Safe-Zone Overlay (Title Safe 80% and Action Safe 90%) */}
      {showSafeZone && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden font-sans">
          {/* Action Safe (90% boundary: 5% inset) */}
          <div
            className="absolute inset-[5%] border-2 border-dashed border-amber-400/80 rounded-lg pointer-events-none"
            style={{ boxShadow: 'inset 0 0 0 1000px rgba(0, 0, 0, 0.25)' }}
          >
            {/* Action Safe Tag */}
            <div className="absolute -top-3 left-3 bg-amber-500 text-neutral-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow">
              🛡️ 90% ACTION SAFE (लोगो व विजुअल)
            </div>
            {/* Corner brackets */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-amber-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-amber-400" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-amber-400" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-amber-400" />
          </div>

          {/* Title Safe (80% boundary: 10% inset) */}
          <div className="absolute inset-[10%] border-2 border-dashed border-sky-400/90 rounded-md pointer-events-none">
            {/* Title Safe Tag */}
            <div className="absolute -top-3 right-3 bg-sky-500 text-neutral-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow">
              📐 80% TITLE SAFE (हेडलाइंस व टेक्स्ट)
            </div>
          </div>

          {/* Center Crosshair */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
            <div className="w-6 h-0.5 bg-white/70 absolute" />
            <div className="h-6 w-0.5 bg-white/70 absolute" />
            <div className="w-2.5 h-2.5 rounded-full border border-sky-400 absolute" />
          </div>

          {/* Bottom Live Safe Status Pill */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-neutral-900/90 border border-sky-400/60 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg backdrop-blur-sm whitespace-nowrap">
            ✓ सेफ-ज़ोन सक्रिय: एक्सपोर्ट से पूर्व सीमा जांचें
          </div>
        </div>
      )}
    </div>
  );
};
