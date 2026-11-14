// AI NEWS MAKER — Dynamic Frame Generator & Template System Types
// Strictly supports 4:5 (1080x1350) and 9:16 (1080x1920) for Photo Frames
// Video Frames support 9:16 (1080x1920), 1:1 (1080x1080), 4:5 (1080x1350), 4:3 (1440x1080)

export type FrameMode = 'photo' | 'video';
export type DynamicFrameType = 'graphic' | 'video' | 'story';

export type VideoWindowAspectRatio = '9:16' | '16:9' | '4:5' | '4:3' | '1:1' | 'custom';
export type VideoFooterPlacement = 'bottom' | 'top' | 'header' | 'custom';
export type HeadlineDisplayMode = 'single' | 'multiple';
export type HeadlineLineCount = 2 | 3;

export interface HeadlineBlockConfig {
  id: string;
  name: string;
  role?: string;
  rect: NormalizedRect;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  textColor?: string;
  highlightColor?: string;
  backgroundColor?: string;
  bgColor?: string; // legacy migration alias
  alignment?: 'left' | 'center' | 'right';
  maxLines?: HeadlineLineCount | number;
  lineHeight?: number;
  rotation?: number;
  visible?: boolean;
  zIndex?: number;
  // Backward compatibility flat coordinate aliases
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface VideoRibbonLayer {
  id: string;
  ribbonId: string;
  name: string;
  customRibbonUrl?: string;
  rect: NormalizedRect;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  visible: boolean;
  zIndex: number;
  rotation?: number;
  isAnimatedGif?: boolean;
  // Backward compatibility flat coordinate aliases
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface VideoOverlayAsset {
  id: string;
  name: string;
  url: string;
  mediaType: 'png' | 'gif';
  rect: NormalizedRect;
  visible: boolean;
  zIndex: number;
  rotation?: number;
  opacity?: number;
  // Backward compatibility flat coordinate aliases
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface VideoFrameConfig {
  displayMode: 'fit' | 'crop'; // Choice A: 'fit' (Full Video), Choice B: 'crop' (Crop Video to visible region)
  videoRect: NormalizedRect;
  footerPosition: 'bottom' | 'top' | 'header' | 'custom'; // Movable video footer
  footerRect?: NormalizedRect; // Independent custom positioning for footer
  videoWindowAspectRatio?: VideoWindowAspectRatio; // 9:16, 16:9, 4:5, 4:3, 1:1, custom
  safeZoneEnabled?: boolean;
  safeZoneConfig?: SafeZoneConfig;
  headlineMode?: HeadlineDisplayMode; // 'single' | 'multiple'
  headlineLineCount?: HeadlineLineCount; // 2 | 3
  headlineRect?: NormalizedRect; // Canonical authoritative single headline rect
  headlineBlocks?: HeadlineBlockConfig[];
  ribbonLayers?: VideoRibbonLayer[];
  overlayAssets?: VideoOverlayAsset[];
  locationBadgeUrl?: string; // from Location Badge PNG library
  locationBadgeId?: string;
  locationBadgeStyle?: 'pill' | 'box' | 'strip';
  locationRect?: NormalizedRect; // Canonical location rect
  locationBadgeRect?: NormalizedRect; // Backward compatibility alias
  logoRect?: NormalizedRect;
  logoUrl?: string;
  logoType?: 'png' | 'gif';
  logoScalePct?: number;
  logoOpacity?: number;
  logoRotation?: number;
  dateRect?: NormalizedRect;
  dateVisible?: boolean;
  dateRotation?: number;
  dateFontFamily?: string;
  dateFontSize?: number;
  dateTextColor?: string;
  dateBgColor?: string;
  watermarkTextEnabled?: boolean;
  watermarkText?: string;
  watermarkLogoEnabled?: boolean;
  watermarkLogoUrl?: string;
  watermarkUserAllowed?: boolean; // Admin decides whether text/logo watermark options are available to end-users in Studio
  watermarkRect?: NormalizedRect; // Center of actual visible video region
  cropFocalPoint?: { x: number; y: number };
}

export function calculateDefaultVideoRect(
  canvasRatio: DynamicAspectRatio,
  videoRatio: VideoWindowAspectRatio,
  preset: 'center' | 'top' | 'bottom' | 'custom' = 'center'
): NormalizedRect {
  // 9:16 Canvas (1080 x 1920)
  if (canvasRatio === '9:16') {
    if (videoRatio === '9:16') {
      return { x: 0, y: 0, width: 100, height: 100 };
    }
    if (videoRatio === '4:5') {
      // 1080x1350 in 1080x1920 -> height = (1350 / 1920) * 100 = 70.3125%
      const h = 70.3;
      if (preset === 'top') return { x: 0, y: 5, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 24.6, width: 100, height: h };
      return { x: 0, y: 14.8, width: 100, height: h }; // Center: 285px top/bottom
    }
    if (videoRatio === '16:9') {
      // 1080x607.5 in 1080x1920 -> height = (607.5 / 1920) * 100 = 31.64%
      const h = 31.6;
      if (preset === 'top') return { x: 0, y: 15, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 55, width: 100, height: h };
      return { x: 0, y: 34.2, width: 100, height: h };
    }
    if (videoRatio === '1:1') {
      // 1080x1080 in 1080x1920 -> height = (1080 / 1920) * 100 = 56.25%
      const h = 56.2;
      if (preset === 'top') return { x: 0, y: 10, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 33.7, width: 100, height: h };
      return { x: 0, y: 21.9, width: 100, height: h };
    }
    if (videoRatio === '4:3') {
      // 1080x810 in 1080x1920 -> height = (810 / 1920) * 100 = 42.18%
      const h = 42.2;
      if (preset === 'top') return { x: 0, y: 15, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 42.7, width: 100, height: h };
      return { x: 0, y: 28.9, width: 100, height: h };
    }
  }

  // 4:5 Canvas (1080 x 1350)
  if (canvasRatio === '4:5') {
    if (videoRatio === '16:9') {
      // 1080x607.5 in 1080x1350 -> height = (607.5 / 1350) * 100 = 45%
      const h = 45;
      if (preset === 'top') return { x: 0, y: 12, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 45, width: 100, height: h };
      return { x: 0, y: 27.5, width: 100, height: h };
    }
    if (videoRatio === '4:5') {
      return { x: 0, y: 0, width: 100, height: 100 };
    }
    if (videoRatio === '1:1') {
      // 1080x1080 in 1080x1350 -> height = 80%
      const h = 80;
      if (preset === 'top') return { x: 0, y: 5, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 15, width: 100, height: h };
      return { x: 0, y: 10, width: 100, height: h };
    }
  }

  // 4:3 Canvas (1440 x 1080)
  if (canvasRatio === '4:3') {
    if (videoRatio === '16:9') {
      // 1440x810 in 1440x1080 -> height = (810 / 1080) * 100 = 75%
      const h = 75;
      if (preset === 'top') return { x: 0, y: 5, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 20, width: 100, height: h };
      return { x: 0, y: 12.5, width: 100, height: h };
    }
    if (videoRatio === '4:3') {
      return { x: 0, y: 0, width: 100, height: 100 };
    }
  }

  // 1:1 Canvas (1080 x 1080)
  if (canvasRatio === '1:1') {
    if (videoRatio === '16:9') {
      // 1080x607.5 in 1080x1080 -> height = 56.25%
      const h = 56.2;
      if (preset === 'top') return { x: 0, y: 10, width: 100, height: h };
      if (preset === 'bottom') return { x: 0, y: 33.7, width: 100, height: h };
      return { x: 0, y: 21.9, width: 100, height: h };
    }
    if (videoRatio === '1:1') {
      return { x: 0, y: 0, width: 100, height: 100 };
    }
  }

  // Fallback default
  return { x: 0, y: 15, width: 100, height: 70 };
}

export interface TypographyConfig {
  primaryFontFamily: string; // e.g. "Noto Sans Devanagari", "Rozha One", "Poppins", etc.
  primaryFontSize: number;
  minFontSize?: number;
  fontWeight?: string;
}

export interface AssetLibraryItem {
  id: string;
  name: string;
  category?: string; // For suvichar backgrounds: 'morning' | 'spiritual' | 'motivation' | 'general'
  url: string;
  type: 'location_badge' | 'callout_png' | 'suvichar_background' | 'custom_footer';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  sliceConfig?: { leftWidthPct: number; rightWidthPct: number; centerMinPct?: number };
  // Normalized internal text-marking region relative to the badge image (0 to 100 percentage or 0 to 1 fraction)
  textRegion?: NormalizedRect;
  typographyConfig?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    textColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    align?: 'left' | 'center' | 'right';
    color?: string;
    weight?: string | number;
  };
  footerConfig?: CustomFooterConfig;
}

export interface CustomFooterConfig {
  footerBgColor: string;
  footerTextColor: string;
  footerIconStyle?: 'color' | 'dark' | 'neutral';
  footerHeightPct?: number; // e.g. 8%
  elements?: {
    showWebsite?: boolean;
    showPhone?: boolean;
    showSocialIcons?: boolean;
    showChannelName?: boolean;
    showTagline?: boolean;
    customText?: string;
  };
  alignment?: 'left' | 'center' | 'right';
  channelNameAlign?: 'left' | 'center' | 'right';
  websiteAlign?: 'left' | 'center' | 'right';
  socialIconsAlign?: 'left' | 'center' | 'right';
  phoneAlign?: 'left' | 'center' | 'right';
  taglineAlign?: 'left' | 'center' | 'right';
  iconSize?: number; // 14 to 36, default 20
  elementSpacing?: number; // 4 to 32, default 12
  paddingX?: number; // 8 to 48, default 16
  paddingY?: number; // 4 to 24, default 8
  separator?: string; // '|' | '•' | '—' | '/' | 'none'
  elementOrder?: string[]; // e.g. ['channelName', 'website', 'socialIcons', 'phone', 'tagline', 'customText']
  allowedPlans?: DynamicPlanTier[];
}

export type DynamicAspectRatio = '4:5' | '9:16' | '1:1' | '4:3';

export const PHOTO_ALLOWED_ASPECT_RATIOS: DynamicAspectRatio[] = ['4:5', '1:1', '9:16'];
export const VIDEO_ALLOWED_ASPECT_RATIOS: DynamicAspectRatio[] = ['9:16', '1:1', '4:5', '4:3'];

export type DynamicDesignCategory =
  | 'Regular Frames'
  | 'Package Frames'
  | 'Super Breaking'
  | 'Text Breaking'
  | 'बयानबाजी'
  | 'Special Frames'
  | 'Bonus Frames'
  | 'Custom Frames'
  | 'TEST_FRAMES';

export const DYNAMIC_FRAME_CATEGORIES: DynamicDesignCategory[] = [
  'Regular Frames',
  'Package Frames',
  'Super Breaking',
  'Text Breaking',
  'बयानबाजी',
  'Special Frames',
  'Bonus Frames',
  'Custom Frames',
  'TEST_FRAMES',
];

export type DynamicPlanTier = 'BASIC' | 'ADVANCED' | 'PRO' | 'VIP DESK';

export const DYNAMIC_PLAN_TIERS: DynamicPlanTier[] = ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'];

export type DynamicFrameStatus = 'draft' | 'preview' | 'published' | 'disabled' | 'archived';

export type PhotoSlotType = 'normal' | 'background' | 'cutout' | 'inset' | 'supporting';

export interface NormalizedRect {
  x: number; // Percentage (0 - 100)
  y: number; // Percentage (0 - 100)
  width: number; // Percentage (0 - 100)
  height: number; // Percentage (0 - 100)
  zIndex?: number;
  rotation?: number;
  opacity?: number;
}

export interface PhotoSlotConfig {
  id: string;
  name: string;
  slotType: PhotoSlotType;
  rect: NormalizedRect;
  required: boolean;
  cropMode?: 'cover' | 'contain' | 'custom';
  cornerRadius?: number;
  borderRadius?: number; // Alias for cornerRadius
  defaultAssetUrl?: string; // Fallback default image or sample photo
  border?: { color: string; width: number };
  shadow?: boolean;
  bgRemoval?: boolean; // True for foreground cutout ONLY
  aspectRatioLabel?: string; // e.g. "16:9", "1:1", "4:5", "Free"
  rotation?: number; // 0, 90, 180, 270
}

// Multi-Photo Layout Variants (Step 5)
export type PhotoLayoutMode = 'single' | 'dual_50_50' | 'dual_vertical' | 'triple' | 'quad';

export interface PhotoLayoutVariantConfig {
  id: string;
  mode: PhotoLayoutMode;
  label: string;
  slots: PhotoSlotConfig[];
  enabled: boolean;
}

export interface TextSlotConfig {
  id: string;
  name: string;
  role: 'headline' | 'secondary_headline' | 'quote' | 'speaker_name' | 'speaker_designation' | 'kicker' | 'location' | 'custom';
  rect: NormalizedRect;
  fontFamily: string;
  fontSize: number;
  fontWeight?: string;
  textColor: string;
  highlightColor?: string;
  alignment: 'left' | 'center' | 'right';
  maxLines: number;
  lineHeight?: number;
  padding?: number;
  backgroundColor?: string;
  rotation?: number; // 0, 90, 180, 270
}

export type LocationBadgeMode = 'dynamic_overlay' | 'static_image';
export type DateStampStyle = 'only_text' | 'white_on_black' | 'custom_bg_text' | 'circular_badge' | 'rounded_badge';

export interface HeaderConfig {
  // Independent Channel Logo Configuration
  showLogo: boolean;
  logoPosition: 'top_left' | 'top_right' | 'top_center' | 'custom';
  logoRect: NormalizedRect;
  logoScalePct?: number; // 10% - 100% (default 100%)
  logoPaddingPx?: number; // 0 - 30px
  logoInsetPx?: number;
  logoOpacity?: number;
  logoAlign?: 'left' | 'center' | 'right';
  logoRotation?: number; // 0, 90, 180, 270

  // Independent Location Badge Configuration
  showLocation: boolean;
  locationRect: NormalizedRect;
  locationStyle?: 'box' | 'pill' | 'strip' | 'headline_tag';
  locationBgColor?: string;
  locationTextColor?: string;
  locationFontSize?: number;
  locationPadding?: number;
  locationBorderRadius?: number;
  locationShowIcon?: boolean;
  locationAlign?: 'left' | 'center' | 'right';
  locationRotation?: number; // 0, 90, 180, 270
  locationBadgeMode?: LocationBadgeMode;
  manualLocationAsset?: string; // Uploaded manual badge skin or static badge
  locationBadgeAssetId?: string;
  maxLocationWords?: number; // Bug Group C3: Master Admin per-frame limit (2, 3, 4, default 3)
  supportsLocationBadgeBackgroundColor?: boolean; // Bug Group C4: Conditional BG color support
  sliceConfig?: { leftWidthPct: number; rightWidthPct: number; centerMinPct?: number };
  textRegion?: NormalizedRect;
  typographyConfig?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    textColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    align?: 'left' | 'center' | 'right';
    color?: string;
    weight?: string | number;
  };

  showCategory?: boolean;
  categoryRect?: NormalizedRect;

  // Independent Date Stamp Configuration
  showDate?: boolean;
  dateRect?: NormalizedRect;
  dateFormat?: 'hi_full' | 'dd_mm_yyyy' | 'en_short' | 'hi_simple';
  dateFontSize?: number;
  dateFontWeight?: string;
  dateTextColor?: string;
  dateBgColor?: string;
  dateOpacity?: number;
  dateRotation?: number; // 0, 90, 270 or arbitrary
  dateAlign?: 'left' | 'center' | 'right';
  dateLetterSpacing?: number;
  dateStampStyle?: DateStampStyle;

  customHeaderUrl?: string;
}

export type WatermarkStyle = 'badge' | 'subtle_text' | 'boxed' | 'box' | 'chip';
export type WatermarkPosition = 'right_edge' | 'left_edge' | 'top' | 'bottom' | 'center' | 'custom';
export type WatermarkType = 'text' | 'image';

export interface WatermarkConfig {
  enabled: boolean;
  type?: WatermarkType;
  label?: 'AI GENERATED' | 'प्रतीकात्मक फोटो' | string;
  customText?: string;
  imageUrl?: string;
  imageSize?: number;
  rect: NormalizedRect;
  position?: WatermarkPosition;
  fontSize?: number;
  textColor?: string;
  bgColor?: string;
  opacity?: number;
  rotation?: number; // 0, 90, 180, 270
  align?: 'left' | 'center' | 'right';
  watermarkStyle?: WatermarkStyle;
}

export type CalloutVisibilityPolicy = 'optional' | 'forced_on' | 'disabled';
export type CalloutAssetMode = 'dynamic_overlay' | 'static_image';
export type ElementVisibilityPolicy = 'always_show' | 'user_toggle' | 'not_included';

export interface FrameVisibilitySettings {
  logo?: ElementVisibilityPolicy;
  locationBadge?: ElementVisibilityPolicy;
  dateStamp?: ElementVisibilityPolicy;
  watermark?: ElementVisibilityPolicy;
  headline?: ElementVisibilityPolicy;
  callout?: ElementVisibilityPolicy;
  footer?: ElementVisibilityPolicy;
}

export interface PlanCalloutRule {
  defaultCalloutAsset?: string;
  defaultCalloutAssetId?: string;
  allowedAlternativeAssets?: { id: string; name: string; url: string }[];
}

export interface PlanBasedCalloutSettings {
  basic?: PlanCalloutRule;
  advanced?: PlanCalloutRule;
  pro?: PlanCalloutRule;
  vipDesk?: PlanCalloutRule;
}

export interface FullStoryCalloutConfig {
  enabled: boolean;
  text: string; // default "पूरी खबर डिस्क्रिप्शन में"
  rect: NormalizedRect;
  fontSize?: number;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  align?: 'left' | 'center' | 'right';
  showIcon?: boolean;
  rotation?: number;
  manualCalloutAsset?: string;
  calloutAssetId?: string;
  calloutAssetMode?: CalloutAssetMode;
  calloutVisibilityPolicy?: CalloutVisibilityPolicy;
  planCalloutSettings?: PlanBasedCalloutSettings;
  scale?: number;
  innerTextRect?: NormalizedRect;
  textPadding?: number;
  lineHeight?: number;
  isLocked?: boolean;
}

export interface PoweredByConfig {
  enabled: boolean;
  text: string; // default "POWERED BY AINEWSMAKER.ONLINE"
  rect: NormalizedRect;
  fontSize?: number; // default 16
  textColor?: string; // default '#FFFFFF'
  bgColor?: string; // default 'rgba(0,0,0,0.6)'
  borderColor?: string; // default 'rgba(255,255,255,0.2)'
  borderWidth?: number; // default 1
  opacity?: number; // default 0.8
  rotation?: number; // default 0
  alignment?: 'left' | 'center' | 'right';
}

export interface SafeZoneConfig {
  enabled: boolean;
  topMarginPct: number;
  bottomMarginPct: number;
  leftMarginPct: number;
  rightMarginPct: number;
  headerSafeAreaPct?: number;
  footerSafeAreaPct?: number;
}

export interface FooterConfig {
  footerHeightRatio: number; // typically 0.08 (~8% of canvas height)
  enforcePermanentFooter: boolean; // Always true to protect AI News Maker footer
  footerBgColor?: string;
  footerTextColor?: string;
  footerIconStyle?: 'color' | 'dark' | 'neutral';
  footerWidthPct?: number; // 70% to 100% (default 100%)
  footerAlignment?: 'center' | 'left' | 'right';
  footerInset?: number; // Inset %
  primaryFooterColor?: string; // Default footer background color for users
  bannedFooterColor?: string; // Banned footer color that users can never select
}

export interface RibbonConfig {
  enabled: boolean;
  ribbonId?: string;
  customRibbonUrl?: string;
  rect?: NormalizedRect;
  scalePct?: number;
  rotation?: number;
}

export type FrameLayerType =
  | 'header'
  | 'logo'
  | 'location'
  | 'date'
  | 'watermark'
  | 'callout'
  | 'powered_by'
  | 'footer'
  | 'photo'
  | 'text'
  | 'ribbon'
  | 'graphic'
  | 'background';

export interface FrameLayer {
  id: string;
  name: string;
  type: FrameLayerType;
  rect: NormalizedRect;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  rotation?: number;
}

export type StatementBackgroundMode = 'solid' | 'curated' | 'ai_generated';

export interface StatementOptions {
  speakerName?: string;
  speakerDesignation?: string;
  quoteText?: string;
  solidBackgroundHex?: string;
  backgroundMode?: StatementBackgroundMode;
  curatedBackgroundId?: string;
  curatedBackgroundUrl?: string;
  aiPrompt?: string;
  aiGeneratedBackgroundUrl?: string;
  cutoutPosition?: 'left' | 'right'; // Left or Right positioning for statement cutout
  cutoutScale?: number;
  cutoutOffset?: { x: number; y: number };
}

export type PrimaryBackgroundMode = 'image' | 'solid';

export interface DynamicFrameTemplate {
  id: string;
  name: string;
  description?: string;
  frameMode?: FrameMode; // 'photo' | 'video' (default: 'photo')
  frameType?: DynamicFrameType; // 'graphic' | 'video' | 'story'
  aspectRatio: DynamicAspectRatio;
  canvasWidth: number; // 1080 for 4:5, 9:16, 1:1; 1440 for 4:3
  canvasHeight: number; // 1350 for 4:5, 1920 for 9:16, 1080 for 1:1, 1080 for 4:3
  sampleReferenceUrl?: string;
  samplePhotoUrl?: string; // Preview sample background photo
  sampleVideoUrl?: string; // Preview sample video
  primaryBackgroundAsset?: string;
  primaryBackgroundMode?: PrimaryBackgroundMode;
  primaryBackgroundHex?: string;
  previewImageUrl?: string;
  designCategory: DynamicDesignCategory;
  allowedPlans: DynamicPlanTier[];
  publicationStatus: DynamicFrameStatus;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  version: number;

  // Visual component configurations
  headerConfig: HeaderConfig;
  footerConfig: FooterConfig;
  photoSlots: PhotoSlotConfig[];
  photoLayoutVariants?: PhotoLayoutVariantConfig[];
  activePhotoLayoutMode?: PhotoLayoutMode;
  textSlots: TextSlotConfig[];
  ribbonConfig?: RibbonConfig;
  watermarkConfig?: WatermarkConfig;
  fullStoryCalloutConfig?: FullStoryCalloutConfig;
  calloutAssetUrl?: string; // Pre-designed callout PNG URL
  poweredByConfig?: PoweredByConfig;
  safeZoneConfig?: SafeZoneConfig;
  layers: FrameLayer[];

  // Video-first frame configurations
  videoConfig?: VideoFrameConfig;

  // Typography configurations
  typographyConfig?: TypographyConfig;

  // Statement / Bayaanbaazi specific options
  isStatementFrame?: boolean;
  statementOptions?: StatementOptions;

  // Footer primary & banned color policy (Part 7)
  primaryFooterColor?: string;
  bannedFooterColor?: string;

  // Layout lock state (Part 8)
  isLayoutLocked?: boolean;

  // Master Test Frame & Approval Workflow (Master Architecture)
  isTestFrame?: boolean;
  approvalStatus?: 'PENDING_TEST' | 'IN_TESTING' | 'APPROVED' | 'REJECTED';
  targetCategory?: DynamicDesignCategory;
  approvedAt?: number;
  approvedBy?: string;
  sliceConfig?: { leftWidthPct: number; rightWidthPct: number; centerMinPct: number };
  visibilitySettings?: FrameVisibilitySettings;
  customFooterId?: string;
  primaryHighlightColor?: string; // Bug Group B: Master Admin Primary Highlight Color
  quoteHighlightColor?: string; // Bug Group B: Text/Quote Highlight Color
  quoteTextColor?: string; // Bug Group B: Text/Quote Text Color
  maxLocationWords?: number; // Bug Group C3: Location word limit
  supportsLocationBadgeBackgroundColor?: boolean; // Bug Group C4: Conditional BG color support
}

export interface UserStoryPreference {
  userId: string;
  primaryStoryFrameId: string | null;
  updatedAt: number;
}

export type DynamicFrame = DynamicFrameTemplate;
