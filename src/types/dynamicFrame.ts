// AI NEWS MAKER — Dynamic Frame Generator & Template System Types
// Strictly supports 4:5 (1080x1350) and 9:16 (1080x1920) for Photo Frames
// Video Frames support 9:16 (1080x1920), 1:1 (1080x1080), 4:5 (1080x1350), 4:3 (1440x1080)

export type FrameMode = 'photo' | 'video';
export type DynamicFrameType = 'graphic' | 'video' | 'story';

export interface VideoFrameConfig {
  displayMode: 'fit' | 'crop'; // Choice A: 'fit' (Full Video), Choice B: 'crop' (Crop Video to visible region)
  videoRect: NormalizedRect;
  footerPosition: 'bottom' | 'top'; // Movable video footer
  locationBadgeUrl?: string; // from Location Badge PNG library
  locationBadgeId?: string;
  watermarkTextEnabled?: boolean;
  watermarkText?: string;
  watermarkLogoEnabled?: boolean;
  watermarkLogoUrl?: string;
  watermarkUserAllowed?: boolean; // Admin decides whether text/logo watermark options are available to end-users in Studio
  watermarkRect?: NormalizedRect; // Center of actual visible video region
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
  type: 'location_badge' | 'callout_png' | 'suvichar_background';
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
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
}

export type DynamicAspectRatio = '4:5' | '9:16' | '1:1' | '4:3';

export const PHOTO_ALLOWED_ASPECT_RATIOS: DynamicAspectRatio[] = ['4:5', '9:16'];
export const VIDEO_ALLOWED_ASPECT_RATIOS: DynamicAspectRatio[] = ['9:16', '1:1', '4:5', '4:3'];

export type DynamicDesignCategory =
  | 'Regular Frames'
  | 'Story Frames'
  | 'Package Frames'
  | 'Super Breaking'
  | 'Text Breaking'
  | 'बयानबाजी'
  | 'Special Frames'
  | 'Bonus Frames'
  | 'Custom Frames';

export const DYNAMIC_FRAME_CATEGORIES: DynamicDesignCategory[] = [
  'Regular Frames',
  'Story Frames',
  'Package Frames',
  'Super Breaking',
  'Text Breaking',
  'बयानबाजी',
  'Special Frames',
  'Bonus Frames',
  'Custom Frames',
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
  locationBadgeMode?: LocationBadgeMode;
  manualLocationAsset?: string; // Uploaded manual badge skin or static badge
  locationBadgeAssetId?: string;
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
}

export interface UserStoryPreference {
  userId: string;
  primaryStoryFrameId: string | null;
  updatedAt: number;
}

export type DynamicFrame = DynamicFrameTemplate;
