import { NewsCardData, FrameDesign } from '../types';
import { UserPlanTier } from './userPlanManager';
import {
  GraphicPlanCategory,
  getAdminAssignedPlan,
  categoryToPlanTier,
  getTemplateConfig,
} from './graphicTemplatesRegistry';

export interface FrameOption {
  id: FrameDesign;
  name: string;
  description: string;
  badge: string;
  requiredTier: UserPlanTier;
  planCategory: GraphicPlanCategory;
  categoryLabel: string; // 'Basic' | 'Advance' | 'Pro' | 'VIP'
  graphicNumber?: number; // 1, 2, 3...
  aspectRatio: '4:5'; // Strictly 4:5
}

export const GRAPHIC_1_FRAME_OPTION: FrameOption = {
  id: 'graphic_001',
  name: 'Graphic 1 (बेसिक 4:5)',
  description: 'बेसिक प्लान: 4:5 पोर्ट्रेट, टॉप लोकेशन व लोगो बॉक्स, 270° डेट, 3-लाइन हेडलाइन, "पूरी खबर डिस्क्रिप्शन में" और फिक्स्ड येलो फुटर।',
  badge: 'BASIC',
  requiredTier: 'basic',
  planCategory: 'BASIC',
  categoryLabel: 'BASIC PACKAGE FRAMES',
  graphicNumber: 1,
  aspectRatio: '4:5',
};

export const GRAPHIC_2_FRAME_OPTION: FrameOption = {
  id: 'graphic_002',
  name: 'Graphic 2 (एडवांस 4:5)',
  description: 'एडवांस प्लान: 4:5 पोर्ट्रेट, आउटर ऑरेंज बॉर्डर, 3-लाइन हेडलाइन, कमेंट बॉक्स CTA, फिक्स्ड येलो फुटर।',
  badge: 'ADVANCE',
  requiredTier: 'advanced',
  planCategory: 'ADVANCED',
  categoryLabel: 'ADVANCE PACKAGE FRAMES',
  graphicNumber: 2,
  aspectRatio: '4:5',
};

export const GRAPHIC_3_FRAME_OPTION: FrameOption = {
  id: 'graphic_003',
  name: 'Graphic 3 (प्रो 4:5)',
  description: 'प्रो प्लान: 4:5 पोर्ट्रेट, 2-लाइन हेडलाइन एरिया, मॉडर्न मिनिमल डिज़ाइन, हाई-इम्पैक्ट विज़ुअल।',
  badge: 'PRO',
  requiredTier: 'professional',
  planCategory: 'PRO',
  categoryLabel: 'PRO PACKAGE FRAMES',
  graphicNumber: 3,
  aspectRatio: '4:5',
};

export const GRAPHIC_4_FRAME_OPTION: FrameOption = {
  id: 'graphic_004',
  name: 'Graphic 4 (वीआईपी डेस्क 4:5)',
  description: 'वीआईपी डेस्क: 4:5 पोर्ट्रेट, 2-लाइन हेडलाइन, कॉम्पैक्ट फोटो लेआउट, प्रीमियम कस्टम ब्रांडिंग।',
  badge: 'VIP DESK',
  requiredTier: 'ultra',
  planCategory: 'VIP DESK',
  categoryLabel: 'VIP DESK PACKAGE FRAMES',
  graphicNumber: 4,
  aspectRatio: '4:5',
};

export const REPORTER_ALLOWED_FRAMES: FrameDesign[] = [
  'graphic_001',
  'graphic_002',
  'graphic_003',
  'graphic_004',
];

export const FRAME_OPTIONS: FrameOption[] = [
  GRAPHIC_1_FRAME_OPTION,
  GRAPHIC_2_FRAME_OPTION,
  GRAPHIC_3_FRAME_OPTION,
  GRAPHIC_4_FRAME_OPTION,
];

export function registerFrameOption(option: FrameOption) {
  const idx = FRAME_OPTIONS.findIndex((f) => f.id === option.id);
  if (idx >= 0) {
    FRAME_OPTIONS[idx] = option;
  } else {
    FRAME_OPTIONS.push(option);
  }
}

/**
 * Returns FRAME_OPTIONS dynamically updated with any Admin-assigned Plan Categories
 */
export function getEffectiveFrameOptions(): FrameOption[] {
  return FRAME_OPTIONS.map((f) => {
    const cfg = getTemplateConfig(f.id);
    const customName = cfg?.customName?.trim();
    const effectiveCategory = (cfg?.allowedPlans && cfg.allowedPlans.length > 0) ? cfg.allowedPlans[0] : getAdminAssignedPlan(f.id, f.planCategory);
    const effectiveTier = categoryToPlanTier(effectiveCategory);
    const categoryLabel = 
      effectiveCategory === 'BASIC' ? 'Basic' :
      effectiveCategory === 'ADVANCED' ? 'Advance' :
      effectiveCategory === 'PRO' ? 'Pro' : 'VIP';

    return {
      ...f,
      name: customName || f.name,
      planCategory: effectiveCategory,
      requiredTier: effectiveTier,
      categoryLabel,
    };
  });
}


/**
 * Draws the Official "Breaking News Wala" header (matching IMAGE NEWS.png)
 * Left: Globe + Yellow badge with "ब्रेकिंग न्यूज़ वाला" + tagline
 * Right: Curved jacket swoosh (black, yellow, red)
 */
export function drawOriginalHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  card: NewsCardData,
  customLogoImg?: HTMLImageElement
) {
  if (card.showMasterBranding === false) {
    return;
  }
  // 1. Right-side curved jacket swoosh (exact match to IMAGE NEWS.png)
  ctx.save();
  const swooshStartX = width * 0.72; // starts around 72% across the top
  const swooshEndY = width * 0.28;   // curves down right edge

  // Black / Dark Crimson outer arc
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(swooshStartX - 40, 0);
  ctx.bezierCurveTo(
    width * 0.88, 30,
    width * 0.96, swooshEndY * 0.6,
    width, swooshEndY + 40
  );
  ctx.closePath();
  ctx.fill();

  // Vibrant Yellow middle arc
  ctx.fillStyle = '#FFDD00';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(swooshStartX, 0);
  ctx.bezierCurveTo(
    width * 0.90, 25,
    width * 0.97, swooshEndY * 0.55,
    width, swooshEndY + 15
  );
  ctx.closePath();
  ctx.fill();

  // Vibrant Red inner arc
  ctx.fillStyle = '#D91A2A';
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(swooshStartX + 45, 0);
  ctx.bezierCurveTo(
    width * 0.92, 20,
    width * 0.98, swooshEndY * 0.5,
    width, swooshEndY - 10
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // 2. Left-side Official Logo Badge
  const badgeX = 36;
  const badgeY = 36;
  const badgeW = 360;
  const badgeH = 100;
  const radius = 20;

  ctx.save();

  // Yellow rounded box with Red border
  ctx.beginPath();
  ctx.roundRect(badgeX + 30, badgeY, badgeW - 30, badgeH, [0, radius, radius, 0]);
  ctx.fillStyle = '#FFE600';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fill();

  // Red border
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#D91A2A';
  ctx.stroke();
  ctx.restore();

  // Dynamic Brand / Channel Name
  const isBranded = Boolean(
    card.brandName &&
    card.brandName.trim() !== '' &&
    card.brandName.trim() !== 'योर लोगो'
  );
  const brandName = isBranded ? card.brandName! : 'योर लोगो';
  const nameParts = brandName.trim().split(/\s+/);
  const firstWord = nameParts[0] || 'योर';
  const restWords = isBranded ? nameParts.slice(1).join(' ') : 'लोगो';

  ctx.save();
  ctx.fillStyle = '#D91A2A';
  ctx.font = '900 36px "Noto Sans Devanagari", "Mukta", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(firstWord, badgeX + 85, badgeY + 12);

  if (restWords) {
    ctx.font = '800 28px "Noto Sans Devanagari", "Mukta", sans-serif';
    const firstWordWidth = ctx.measureText(firstWord).width;
    ctx.fillText(restWords, badgeX + 85 + firstWordWidth + 10, badgeY + 18);
  }

  // Tagline strip at bottom: e.g. "भारत के जिलों से आपके दिलों तक" OR "(यहाँ आपका लोगो रहेगा)"
  const tagline = isBranded ? card.brandTagline : '(यहाँ आपका लोगो रहेगा)';
  if (tagline) {
    ctx.fillStyle = '#111827';
    ctx.font = '700 13px "Noto Sans Devanagari", sans-serif';
    ctx.fillText(tagline, badgeX + 85, badgeY + 62);
  }
  ctx.restore();

  // Logo Icon: Custom Logo Image OR Vector Globe Emblem
  const iconCx = badgeX + 40;
  const iconCy = badgeY + badgeH / 2;
  const iconRadius = 44;

  if (customLogoImg) {
    ctx.save();
    // Circle shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, iconRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Clip to circle and draw custom logo image
    ctx.save();
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, iconRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      customLogoImg,
      iconCx - iconRadius,
      iconCy - iconRadius,
      iconRadius * 2,
      iconRadius * 2
    );
    ctx.restore();

    // Outer border
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFE600';
    ctx.stroke();
    ctx.restore();
  } else {
    // Default globe emblem
    drawGlobeEmblem(ctx, iconCx, iconCy, iconRadius);
  }
}

/**
 * Draws the realistic globe emblem
 */
export function drawGlobeEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  ctx.save();
  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  // Blue ocean gradient
  const oceanGrad = ctx.createRadialGradient(
    cx - radius * 0.3,
    cy - radius * 0.3,
    radius * 0.1,
    cx,
    cy,
    radius
  );
  oceanGrad.addColorStop(0, '#3b82f6');
  oceanGrad.addColorStop(0.7, '#1d4ed8');
  oceanGrad.addColorStop(1, '#172554');

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = oceanGrad;
  ctx.fill();

  // Clip to globe circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Yellow/gold continents silhouette approximations
  ctx.fillStyle = '#F59E0B';
  // North / South America / Asia blobs
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.35, cy - radius * 0.2, radius * 0.35, radius * 0.45, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx + radius * 0.3, cy - radius * 0.1, radius * 0.4, radius * 0.35, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx + radius * 0.2, cy + radius * 0.4, radius * 0.3, radius * 0.25, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Longitude and Latitude grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;

  // Equator
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.stroke();

  // Latitudes
  ctx.beginPath();
  ctx.ellipse(cx, cy - radius * 0.4, radius * 0.9, radius * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.4, radius * 0.9, radius * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Prime meridian
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 0.4, radius, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore(); // unclip

  // Golden outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFE600';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.restore();
}

/**
 * Super Breaking Red & Gold Banner Header
 */
export function drawBreakingRedHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  card: NewsCardData
) {
  ctx.save();
  // Top solid red bar with gold bottom trim
  const barH = 110;
  ctx.fillStyle = '#B91C1C';
  ctx.fillRect(0, 0, width, barH);

  // Gold accent strip
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(0, barH - 8, width, 8);

  // Left side: logo globe and title
  drawGlobeEmblem(ctx, 60, barH / 2 - 4, 38);

  const redChannelTitle = (card.channelNameHi || card.brandName || 'AI NEWS MAKER').trim();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px "Noto Sans Devanagari", sans-serif';
  ctx.fillText(redChannelTitle, 120, barH / 2 + 6);

  // Right side: "SUPER BREAKING" alert badge
  const alertW = 280;
  const alertH = 46;
  const alertX = width - alertW - 36;
  const alertY = (barH - alertH) / 2 - 4;

  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.roundRect(alertX, alertY, alertW, alertH, 8);
  ctx.fill();

  ctx.fillStyle = '#991B1B';
  ctx.font = '900 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ BIG BREAKING ALERT', alertX + alertW / 2, alertY + 30);

  ctx.restore();
}

/**
 * Deep Investigation / Special Report Header
 */
export function drawInvestigationHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  card: NewsCardData
) {
  ctx.save();
  const barH = 100;
  // Sleek dark carbon gradient
  const grad = ctx.createLinearGradient(0, 0, width, 0);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(0.5, '#1e1e24');
  grad.addColorStop(1, '#0a0a0c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, barH);

  // Cyan-blue accent line
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(0, barH - 6, width, 6);

  drawGlobeEmblem(ctx, 55, barH / 2 - 3, 34);

  const invChannelTitle = (card.channelNameHi || card.brandName || 'AI NEWS MAKER').trim();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 32px "Noto Sans Devanagari", sans-serif';
  ctx.fillText(invChannelTitle, 110, barH / 2 + 5);

  // Special Report pill
  const pillW = 260;
  const pillH = 42;
  const pillX = width - pillW - 36;
  const pillY = (barH - pillH) / 2 - 3;
  ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#22D3EE';
  ctx.font = '800 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🔍 SPECIAL INVESTIGATION', pillX + pillW / 2, pillY + 27);

  ctx.restore();
}

/**
 * Quote / Statement Header
 */
export function drawQuoteHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  card: NewsCardData
) {
  // Use original logo on left
  drawOriginalHeader(ctx, width, card);

  // Add decorative quote watermark at top right
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.font = 'bold 160px Georgia, serif';
  ctx.fillText('“', width - 140, 160);
  ctx.restore();
}

