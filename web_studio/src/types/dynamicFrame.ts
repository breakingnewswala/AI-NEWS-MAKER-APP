// AI NEWS MAKER — Dynamic Frame Generator & Template System Types
// Strictly supports 4:5 (1080x1350) and 9:16 (1080x1920) aspect ratios

export type DynamicAspectRatio = '4:5' | '9:16';

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
  border?: { color: string; width: number };
  shadow?: boolean;
  bgRemoval?: boolean; // True for foreground cutout
  aspectRatioLabel?: string; // e.g. "16:9", "1:1", "4:5", "Free"
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

export interface HeaderConfig {
  showLogo: boolean;
  logoPosition: 'top_left' | 'top_right' | 'top_center' | 'custom';
  logoRect: NormalizedRect;
  showLocation: boolean;
  locationRect: NormalizedRect;
  locationStyle?: 'box' | 'pill' | 'strip' | 'headline_tag';
  showCategory?: boolean;
  categoryRect?: NormalizedRect;
  showDate?: boolean;
  dateRect?: NormalizedRect;
  customHeaderUrl?: string;
}

export interface FooterConfig {
  footerHeightRatio: number; // typically 0.08 (~8% of canvas height)
  enforcePermanentFooter: boolean; // Always true to protect AI News Maker footer
  footerBgColor?: string;
  footerTextColor?: string;
  footerIconStyle?: 'color' | 'dark' | 'neutral';
}

export interface RibbonConfig {
  enabled: boolean;
  ribbonId?: string;
  customRibbonUrl?: string;
  rect?: NormalizedRect;
  scalePct?: number;
}

export interface FrameLayer {
  id: string;
  name: string;
  type: 'header' | 'footer' | 'photo' | 'text' | 'ribbon' | 'graphic' | 'background';
  rect: NormalizedRect;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface DynamicFrameTemplate {
  id: string;
  name: string;
  description?: string;
  aspectRatio: DynamicAspectRatio;
  canvasWidth: 1080;
  canvasHeight: 1350 | 1920; // 1350 for 4:5, 1920 for 9:16
  sampleReferenceUrl?: string;
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
  textSlots: TextSlotConfig[];
  ribbonConfig?: RibbonConfig;
  layers: FrameLayer[];

  // Statement / Bayaanbaazi specific options
  isStatementFrame?: boolean;
  statementOptions?: {
    speakerName?: string;
    speakerDesignation?: string;
    quoteText?: string;
    solidBackgroundHex?: string;
  };
}

export interface UserStoryPreference {
  userId: string;
  primaryStoryFrameId: string | null;
  updatedAt: number;
}
