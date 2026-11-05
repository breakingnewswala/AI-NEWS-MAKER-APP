// AI NEWS MAKER — Dynamic Frames Manager
// Manages 4:5 and 9:16 Reusable Dynamic Frame Templates, AI Frame Analysis, and User Story Preferences

import {
  DynamicFrameTemplate,
  DynamicAspectRatio,
  DynamicDesignCategory,
  DynamicPlanTier,
  UserStoryPreference,
} from '../types/dynamicFrame';
import { getApiBaseUrl } from './apiConfig';

const STORAGE_KEY_FRAMES = 'ai_news_dynamic_frames_v1';
const STORAGE_KEY_STORY_PREF = 'ai_news_user_story_pref_v1';

/**
 * Plan weight hierarchy:
 * BASIC = 1
 * ADVANCED = 2
 * PRO = 3
 * VIP DESK = 4
 */
export const DYNAMIC_PLAN_WEIGHTS: Record<DynamicPlanTier, number> = {
  BASIC: 1,
  ADVANCED: 2,
  PRO: 3,
  'VIP DESK': 4,
};

export function normalizeDynamicPlanTier(tier?: string | null): DynamicPlanTier {
  if (!tier) return 'BASIC';
  const t = tier.trim().toLowerCase();
  if (t === 'ultra' || t === 'vip' || t === 'vip desk' || t === 'vip_desk' || t === 'vip-dash' || t === 'vip_dash') return 'VIP DESK';
  if (t === 'professional' || t === 'pro') return 'PRO';
  if (t === 'advanced' || t === 'advance') return 'ADVANCED';
  return 'BASIC';
}

export function isPlanEligibleForFrame(userTier: string | undefined | null, allowedPlans: DynamicPlanTier[]): boolean {
  if (!allowedPlans || allowedPlans.length === 0) return true;
  const currentTier = normalizeDynamicPlanTier(userTier);
  const currentWeight = DYNAMIC_PLAN_WEIGHTS[currentTier] || 1;
  const minAllowedWeight = Math.min(...allowedPlans.map((p) => DYNAMIC_PLAN_WEIGHTS[p] || 1));
  return currentWeight >= minAllowedWeight;
}

// -------------------------------------------------------------
// DEFAULT SEED DYNAMIC FRAMES (Production-grade 4:5 and 9:16)
// -------------------------------------------------------------

export const DEFAULT_DYNAMIC_FRAMES: DynamicFrameTemplate[] = [
  // 1. Regular 4:5 Frame (Basic)
  {
    id: 'df_reg_4_5_clean',
    name: 'रेगुलर क्लासिक 4:5 फ्रेम (Regular Classic)',
    description: 'दैनिक समाचारों के लिए मानक 4:5 पोर्ट्रेट फोटो फ्रेम।',
    aspectRatio: '4:5',
    canvasWidth: 1080,
    canvasHeight: 1350,
    previewImageUrl: '/assets/sample_graphic_preview.png',
    designCategory: 'Regular Frames',
    allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 28, height: 4.5 },
      locationStyle: 'pill',
    },
    footerConfig: {
      footerHeightRatio: 0.08,
      enforcePermanentFooter: true,
      footerBgColor: '#FFFFFF',
      footerTextColor: '#000000',
    },
    photoSlots: [
      {
        id: 'slot_main_photo',
        name: 'मुख्य समाचार फोटो (Main Photo)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 61.33 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_main_headline',
        name: 'मुख्य हेडलाइन (3 पंक्तियाँ)',
        role: 'headline',
        rect: { x: 7.7, y: 64, width: 84.6, height: 26 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 70,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 3,
        lineHeight: 1.25,
        backgroundColor: '#B91C1C',
      },
    ],
    layers: [
      { id: 'l_photo', name: 'मुख्य फोटो', type: 'photo', rect: { x: 0, y: 0, width: 100, height: 61.33 }, visible: true, locked: true, zIndex: 1 },
      { id: 'l_headline', name: 'हेडलाइन प्लेट', type: 'text', rect: { x: 0, y: 61.33, width: 100, height: 30.67 }, visible: true, locked: true, zIndex: 5 },
      { id: 'l_header', name: 'चैनल लोगो व लोकेशन', type: 'header', rect: { x: 5, y: 3.5, width: 90, height: 15 }, visible: true, locked: false, zIndex: 10 },
      { id: 'l_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 92, width: 100, height: 8 }, visible: true, locked: true, zIndex: 20 },
    ],
  },

  // 2. Statement / Bayaanbaazi 4:5 Frame (Advanced)
  {
    id: 'df_bayaan_4_5_red',
    name: 'बयानबाज़ी रेड कटआउट फ्रेम (Statement Red Cutout)',
    description: 'वक्ता का बैकग्राउंड रिमूव्ड कटआउट व मुख्य बयान/कोटेशन फ्रेम।',
    aspectRatio: '4:5',
    canvasWidth: 1080,
    canvasHeight: 1350,
    previewImageUrl: '/assets/sample_statement_preview.png',
    designCategory: 'बयानबाजी',
    allowedPlans: ['ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    isStatementFrame: true,
    statementOptions: {
      solidBackgroundHex: '#C81E1E',
    },
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 26, height: 4.5 },
      locationStyle: 'pill',
    },
    footerConfig: {
      footerHeightRatio: 0.08,
      enforcePermanentFooter: true,
      footerBgColor: '#FFFFFF',
      footerTextColor: '#000000',
    },
    photoSlots: [
      {
        id: 'slot_speaker_cutout',
        name: 'वक्ता का फोटो (पारदर्शी कटआउट / Transparent Cutout)',
        slotType: 'cutout',
        rect: { x: 50, y: 44, width: 48, height: 48 },
        required: true,
        bgRemoval: true,
        cropMode: 'contain',
      },
    ],
    textSlots: [
      {
        id: 'slot_statement_quote',
        name: 'वक्ता का मुख्य बयान (Statement Quote)',
        role: 'quote',
        rect: { x: 8, y: 22, width: 84, height: 26 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 66,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 4,
        lineHeight: 1.3,
      },
      {
        id: 'slot_speaker_name',
        name: 'वक्ता का नाम (Speaker Name)',
        role: 'speaker_name',
        rect: { x: 8, y: 72, width: 42, height: 7 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 42,
        fontWeight: 'bold',
        textColor: '#FFE600',
        alignment: 'left',
        maxLines: 1,
      },
      {
        id: 'slot_speaker_desig',
        name: 'पद / विवरण (Designation)',
        role: 'speaker_designation',
        rect: { x: 8, y: 79.5, width: 42, height: 6 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 28,
        fontWeight: 'normal',
        textColor: '#F8FAFC',
        alignment: 'left',
        maxLines: 2,
      },
    ],
    layers: [
      { id: 'l_bg', name: 'रेड सॉलिड बैकग्राउंड', type: 'background', rect: { x: 0, y: 0, width: 100, height: 92 }, visible: true, locked: true, zIndex: 1 },
      { id: 'l_quote', name: 'बयान कोट टेक्स्ट', type: 'text', rect: { x: 8, y: 22, width: 84, height: 26 }, visible: true, locked: false, zIndex: 4 },
      { id: 'l_cutout', name: 'वक्ता कटआउट', type: 'photo', rect: { x: 50, y: 44, width: 48, height: 48 }, visible: true, locked: false, zIndex: 5 },
      { id: 'l_name', name: 'वक्ता नाम व पद', type: 'text', rect: { x: 8, y: 72, width: 42, height: 14 }, visible: true, locked: false, zIndex: 6 },
      { id: 'l_header', name: 'लोगो व लोकेशन', type: 'header', rect: { x: 5, y: 3.5, width: 90, height: 15 }, visible: true, locked: false, zIndex: 10 },
      { id: 'l_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 92, width: 100, height: 8 }, visible: true, locked: true, zIndex: 20 },
    ],
  },

  // 3. Super Breaking 4:5 Frame (Pro)
  {
    id: 'df_super_breaking_4_5',
    name: 'सुपर ब्रेकिंग 3D रिबन फ्रेम (Super Breaking)',
    description: '3D रेड ग्लॉसी ब्रेकिंग रिबन, व्हाइट हेडलाइन बॉक्स और विस्तृत फोटो।',
    aspectRatio: '4:5',
    canvasWidth: 1080,
    canvasHeight: 1350,
    previewImageUrl: '/assets/sample_super_breaking_preview.png',
    designCategory: 'Super Breaking',
    allowedPlans: ['PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 5, y: 3.5, width: 22, height: 9 },
      showLocation: true,
      locationRect: { x: 5, y: 13.5, width: 26, height: 4.5 },
      locationStyle: 'pill',
    },
    footerConfig: {
      footerHeightRatio: 0.08,
      enforcePermanentFooter: true,
      footerBgColor: '#FFE600',
      footerTextColor: '#000000',
    },
    ribbonConfig: {
      enabled: true,
      ribbonId: 'speed-blue-red',
      customRibbonUrl: '/assets/breaking_news_ribbon.svg',
      rect: { x: 15, y: 64, width: 70, height: 9 },
      scalePct: 70,
    },
    photoSlots: [
      {
        id: 'slot_main_photo',
        name: 'समाचार फोटो (Main Photo)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 68 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_main_headline',
        name: 'ब्रेकिंग हेडलाइन (2-3 पंक्तियाँ)',
        role: 'headline',
        rect: { x: 6, y: 74, width: 88, height: 16.5 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 68,
        fontWeight: 'bold',
        textColor: '#0A0A0A',
        alignment: 'center',
        maxLines: 2,
        lineHeight: 1.25,
        backgroundColor: '#FFFFFF',
      },
    ],
    layers: [
      { id: 'l_photo', name: 'फोटो बैकग्राउंड', type: 'photo', rect: { x: 0, y: 0, width: 100, height: 68 }, visible: true, locked: true, zIndex: 1 },
      { id: 'l_white_box', name: 'व्हाइट हेडलाइन प्लेट', type: 'graphic', rect: { x: 0, y: 70, width: 100, height: 22 }, visible: true, locked: true, zIndex: 3 },
      { id: 'l_ribbon', name: 'ब्रेकिंग रिबन', type: 'ribbon', rect: { x: 15, y: 64, width: 70, height: 9 }, visible: true, locked: false, zIndex: 5 },
      { id: 'l_headline', name: 'हेडलाइन टेक्स्ट', type: 'text', rect: { x: 6, y: 74, width: 88, height: 16.5 }, visible: true, locked: false, zIndex: 6 },
      { id: 'l_header', name: 'लोगो व लोकेशन', type: 'header', rect: { x: 5, y: 3.5, width: 90, height: 15 }, visible: true, locked: false, zIndex: 10 },
      { id: 'l_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 92, width: 100, height: 8 }, visible: true, locked: true, zIndex: 20 },
    ],
  },

  // -------------------------------------------------------------
  // DEDICATED 9:16 SOCIAL MEDIA STORY FRAMES (1080 x 1920 px)
  // -------------------------------------------------------------

  // 4. Social Media Story Frame 1: Full-Impact Portrait Story (Basic)
  {
    id: 'df_story_9_16_standard',
    name: 'स्टैंडर्ड न्यूज़ स्टोरी 9:16 (Standard Story)',
    description: 'सोशल मीडिया इंस्टाग्राम व फेसबुक स्टोरी के लिए 9:16 वर्टिकल न्यूज़ लेआउट।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_standard.png',
    designCategory: 'Story Frames',
    allowedPlans: ['BASIC', 'ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
    },
    footerConfig: {
      footerHeightRatio: 0.065, // ~125px on 1920 height
      enforcePermanentFooter: true,
      footerBgColor: '#0F172A',
      footerTextColor: '#F8FAFC',
    },
    photoSlots: [
      {
        id: 'slot_story_photo',
        name: 'स्टोरी मुख्य फोटो (Story Photo)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 62 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_story_headline',
        name: 'स्टोरी हेडलाइन (3-4 पंक्तियाँ)',
        role: 'headline',
        rect: { x: 7, y: 66, width: 86, height: 25 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 72,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'left',
        maxLines: 4,
        lineHeight: 1.3,
        backgroundColor: '#0F172A',
      },
    ],
    layers: [
      { id: 'l_photo', name: 'स्टोरी फोटो', type: 'photo', rect: { x: 0, y: 0, width: 100, height: 62 }, visible: true, locked: true, zIndex: 1 },
      { id: 'l_scrim', name: 'डार्क ग्रेडिएंट बेस', type: 'graphic', rect: { x: 0, y: 55, width: 100, height: 38.5 }, visible: true, locked: true, zIndex: 3 },
      { id: 'l_headline', name: 'स्टोरी हेडलाइन', type: 'text', rect: { x: 7, y: 66, width: 86, height: 25 }, visible: true, locked: false, zIndex: 5 },
      { id: 'l_header', name: 'लोगो व लोकेशन', type: 'header', rect: { x: 6, y: 3, width: 88, height: 12 }, visible: true, locked: false, zIndex: 10 },
      { id: 'l_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 93.5, width: 100, height: 6.5 }, visible: true, locked: true, zIndex: 20 },
    ],
  },

  // 5. Social Media Story Frame 2: Super Breaking 9:16 Story (Advanced)
  {
    id: 'df_story_9_16_breaking',
    name: 'सुपर ब्रेकिंग स्टोरी 9:16 (Super Breaking Story)',
    description: '3D रिबन, बड़ी ब्रेकिंग हेडलाइन और उच्च प्रभाव वाली 9:16 सोशल स्टोरी।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_breaking.png',
    designCategory: 'Story Frames',
    allowedPlans: ['ADVANCED', 'PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
    },
    footerConfig: {
      footerHeightRatio: 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#FFE600',
      footerTextColor: '#000000',
    },
    ribbonConfig: {
      enabled: true,
      ribbonId: 'speed-blue-red',
      customRibbonUrl: '/assets/breaking_news_ribbon.svg',
      rect: { x: 12, y: 60, width: 76, height: 6.8 },
      scalePct: 76,
    },
    photoSlots: [
      {
        id: 'slot_story_photo',
        name: 'स्टोरी फोटो',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 64 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_story_headline',
        name: 'ब्रेकिंग स्टोरी हेडलाइन',
        role: 'headline',
        rect: { x: 6, y: 68, width: 88, height: 23 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 74,
        fontWeight: 'bold',
        textColor: '#0A0A0A',
        alignment: 'center',
        maxLines: 3,
        lineHeight: 1.25,
        backgroundColor: '#FFFFFF',
      },
    ],
    layers: [
      { id: 'l_photo', name: 'स्टोरी फोटो', type: 'photo', rect: { x: 0, y: 0, width: 100, height: 64 }, visible: true, locked: true, zIndex: 1 },
      { id: 'l_plate', name: 'व्हाइट हेडलाइन प्लेट', type: 'graphic', rect: { x: 0, y: 64, width: 100, height: 29.5 }, visible: true, locked: true, zIndex: 3 },
      { id: 'l_ribbon', name: 'ब्रेकिंग रिबन', type: 'ribbon', rect: { x: 12, y: 60, width: 76, height: 6.8 }, visible: true, locked: false, zIndex: 5 },
      { id: 'l_headline', name: 'हेडलाइन टेक्स्ट', type: 'text', rect: { x: 6, y: 68, width: 88, height: 23 }, visible: true, locked: false, zIndex: 6 },
      { id: 'l_header', name: 'लोगो व लोकेशन', type: 'header', rect: { x: 6, y: 3, width: 88, height: 12 }, visible: true, locked: false, zIndex: 10 },
      { id: 'l_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 93.5, width: 100, height: 6.5 }, visible: true, locked: true, zIndex: 20 },
    ],
  },

  // 6. Social Media Story Frame 3: Statement / Bayaanbaazi 9:16 Story (Pro / VIP)
  {
    id: 'df_story_9_16_statement',
    name: 'बयानबाज़ी स्टोरी 9:16 (Statement Story)',
    description: 'वक्ता का 9:16 कटआउट, मुख्य कोटेशन और रॉयल गोल्ड/रेड थीम स्टोरी।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_statement.png',
    designCategory: 'Story Frames',
    allowedPlans: ['PRO', 'VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    isStatementFrame: true,
    statementOptions: {
      solidBackgroundHex: '#991B1B',
    },
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
    },
    footerConfig: {
      footerHeightRatio: 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#000000',
      footerTextColor: '#FFE600',
    },
    photoSlots: [
      {
        id: 'slot_speaker_cutout',
        name: 'वक्ता का कटआउट (Speaker Cutout)',
        slotType: 'cutout',
        rect: { x: 42, y: 48, width: 56, height: 45.5 },
        required: true,
        bgRemoval: true,
        cropMode: 'contain',
      },
    ],
    textSlots: [
      {
        id: 'slot_statement_quote',
        name: 'मुख्य बयान (Statement Quote)',
        role: 'quote',
        rect: { x: 8, y: 16, width: 84, height: 32 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 70,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 5,
        lineHeight: 1.35,
      },
      {
        id: 'slot_speaker_name',
        name: 'वक्ता का नाम (Speaker Name)',
        role: 'speaker_name',
        rect: { x: 8, y: 76, width: 44, height: 7 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 44,
        fontWeight: 'bold',
        textColor: '#FFE600',
        alignment: 'left',
        maxLines: 1,
      },
      {
        id: 'slot_speaker_desig',
        name: 'पद / विवरण (Designation)',
        role: 'speaker_designation',
        rect: { x: 8, y: 84, width: 44, height: 7 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 28,
        fontWeight: 'normal',
        textColor: '#F8FAFC',
        alignment: 'left',
        maxLines: 2,
      },
    ],
    layers: [
      { id: 'l_bg', name: 'रेड सॉलिड बैकग्राउंड', type: 'background', rect: { x: 0, y: 0, width: 100, height: 93.5 }, visible: true, locked: true, zIndex: 1 },
      { id: 'l_quote', name: 'बयान कोट', type: 'text', rect: { x: 8, y: 16, width: 84, height: 32 }, visible: true, locked: false, zIndex: 4 },
      { id: 'l_cutout', name: 'वक्ता कटआउट', type: 'photo', rect: { x: 42, y: 48, width: 56, height: 45.5 }, visible: true, locked: false, zIndex: 5 },
      { id: 'l_name', name: 'वक्ता नाम व पद', type: 'text', rect: { x: 8, y: 76, width: 44, height: 15 }, visible: true, locked: false, zIndex: 6 },
      { id: 'l_header', name: 'लोगो व लोकेशन', type: 'header', rect: { x: 6, y: 3, width: 88, height: 12 }, visible: true, locked: false, zIndex: 10 },
      { id: 'l_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 93.5, width: 100, height: 6.5 }, visible: true, locked: true, zIndex: 20 },
    ],
  },

  // 7. Social Media Story Frame 4: Dual Photo Collage 9:16 Story (VIP Desk)
  {
    id: 'df_story_9_16_collage',
    name: 'डबल फोटो कोलाज स्टोरी 9:16 (Collage Story VIP)',
    description: 'दो समाचार फोटोग्राफ्स का सुंदर कोलाज और आकर्षक हेडलाइन स्टोरी।',
    aspectRatio: '9:16',
    canvasWidth: 1080,
    canvasHeight: 1920,
    previewImageUrl: '/assets/sample_story_collage.png',
    designCategory: 'Story Frames',
    allowedPlans: ['VIP DESK'],
    publicationStatus: 'published',
    createdBy: 'breakingnewswala.com@gmail.com',
    createdAt: 1793880000000,
    updatedAt: 1793880000000,
    version: 1,
    headerConfig: {
      showLogo: true,
      logoPosition: 'top_left',
      logoRect: { x: 6, y: 3, width: 24, height: 6.5 },
      showLocation: true,
      locationRect: { x: 6, y: 10.5, width: 30, height: 3.2 },
      locationStyle: 'pill',
    },
    footerConfig: {
      footerHeightRatio: 0.065,
      enforcePermanentFooter: true,
      footerBgColor: '#000000',
      footerTextColor: '#FFE600',
    },
    photoSlots: [
      {
        id: 'slot_photo_top',
        name: 'पहली फोटो (ऊपरी फ़्रेम)',
        slotType: 'normal',
        rect: { x: 0, y: 0, width: 100, height: 32 },
        required: true,
        cropMode: 'cover',
      },
      {
        id: 'slot_photo_mid',
        name: 'दूसरी फोटो (मध्य फ़्रेम)',
        slotType: 'supporting',
        rect: { x: 0, y: 33, width: 100, height: 32 },
        required: true,
        cropMode: 'cover',
      },
    ],
    textSlots: [
      {
        id: 'slot_story_headline',
        name: 'स्टोरी मुख्य हेडलाइन',
        role: 'headline',
        rect: { x: 6, y: 68, width: 88, height: 23 },
        fontFamily: 'Noto Sans Devanagari',
        fontSize: 70,
        fontWeight: 'bold',
        textColor: '#FFFFFF',
        alignment: 'center',
        maxLines: 3,
        lineHeight: 1.3,
        backgroundColor: '#1E293B',
      },
    ],
    layers: [
      { id: 'l_photo1', name: 'पहली फोटो', type: 'photo', rect: { x: 0, y: 0, width: 100, height: 32 }, visible: true, locked: true, zIndex: 1 },
      { id: 'l_photo2', name: 'दूसरी फोटो', type: 'photo', rect: { x: 0, y: 33, width: 100, height: 32 }, visible: true, locked: true, zIndex: 2 },
      { id: 'l_headline', name: 'हेडलाइन प्लेट', type: 'text', rect: { x: 0, y: 65, width: 100, height: 28.5 }, visible: true, locked: false, zIndex: 5 },
      { id: 'l_header', name: 'लोगो व लोकेशन', type: 'header', rect: { x: 6, y: 3, width: 88, height: 12 }, visible: true, locked: false, zIndex: 10 },
      { id: 'l_footer', name: 'स्थाई फुटर (Protected)', type: 'footer', rect: { x: 0, y: 93.5, width: 100, height: 6.5 }, visible: true, locked: true, zIndex: 20 },
    ],
  },
];

// -------------------------------------------------------------
// LOCALSTORAGE & SERVER SYNC IMPLEMENTATION
// -------------------------------------------------------------

export function getLocalDynamicFrames(): DynamicFrameTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_DYNAMIC_FRAMES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FRAMES);
    if (!raw) return DEFAULT_DYNAMIC_FRAMES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_DYNAMIC_FRAMES;

    // Merge default seeds if missing
    const existingIds = new Set(parsed.map((f: DynamicFrameTemplate) => f.id));
    const merged = [...parsed];
    for (const def of DEFAULT_DYNAMIC_FRAMES) {
      if (!existingIds.has(def.id)) {
        merged.push(def);
      }
    }
    return merged;
  } catch {
    return DEFAULT_DYNAMIC_FRAMES;
  }
}

export function saveLocalDynamicFrames(frames: DynamicFrameTemplate[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(frames));
    window.dispatchEvent(new CustomEvent('ai_news_dynamic_frames_updated', { detail: frames }));
  } catch (e) {
    console.warn('Failed to save dynamic frames locally:', e);
  }
}

export async function fetchDynamicFramesFromApi(filterAspectRatio?: DynamicAspectRatio): Promise<DynamicFrameTemplate[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const q = filterAspectRatio ? `?aspectRatio=${encodeURIComponent(filterAspectRatio)}` : '';
    const res = await fetch(`${baseUrl}/api/dynamic-frames${q}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.frames)) {
        saveLocalDynamicFrames(data.frames);
        return data.frames;
      }
    }
  } catch (err) {
    console.warn('Network error fetching dynamic frames from API, falling back to local storage:', err);
  }
  const local = getLocalDynamicFrames();
  return filterAspectRatio ? local.filter((f) => f.aspectRatio === filterAspectRatio) : local;
}

export async function saveDynamicFrameToApi(
  frame: Partial<DynamicFrameTemplate>,
  authToken?: string
): Promise<{ success: boolean; frame?: DynamicFrameTemplate; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const isNew = !frame.id || frame.id.startsWith('temp_');
    const method = isNew ? 'POST' : 'PUT';
    const endpoint = isNew ? `${baseUrl}/api/dynamic-frames` : `${baseUrl}/api/dynamic-frames/${frame.id}`;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(endpoint, {
      method,
      headers,
      body: JSON.stringify(frame),
    });

    const data = await res.json();
    if (res.ok && data.success && data.frame) {
      const local = getLocalDynamicFrames();
      const updated = [data.frame, ...local.filter((f) => f.id !== data.frame.id)];
      saveLocalDynamicFrames(updated);
      return { success: true, frame: data.frame };
    }
    return { success: false, error: data.error || 'फ़्रेम सहेजने में विफल' };
  } catch (e: any) {
    return { success: false, error: e.message || 'नेटवर्क त्रुटि' };
  }
}

export async function deleteDynamicFrameFromApi(frameId: string, authToken?: string): Promise<boolean> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/dynamic-frames/${frameId}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      const local = getLocalDynamicFrames();
      saveLocalDynamicFrames(local.filter((f) => f.id !== frameId));
      return true;
    }
  } catch (e) {
    console.warn('Failed to delete frame:', e);
  }
  return false;
}

// -------------------------------------------------------------
// PRIMARY STORY PREFERENCE ("मेरी प्राथमिक स्टोरी")
// -------------------------------------------------------------

export function getLocalPrimaryStoryFrameId(userId?: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_STORY_PREF}_${userId || 'default'}`);
    return raw || 'df_story_9_16_standard';
  } catch {
    return 'df_story_9_16_standard';
  }
}

export function saveLocalPrimaryStoryFrameId(frameId: string, userId?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_STORY_PREF}_${userId || 'default'}`, frameId);
    window.dispatchEvent(new CustomEvent('ai_news_primary_story_updated', { detail: { frameId, userId } }));
  } catch (e) {
    console.warn('Failed to save primary story preference:', e);
  }
}

export async function savePrimaryStoryPreferenceApi(frameId: string, userId: string, authToken?: string): Promise<boolean> {
  saveLocalPrimaryStoryFrameId(frameId, userId);
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/user/story-preference`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, primaryStoryFrameId: frameId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------
// AI SAMPLE FRAME ANALYSIS
// -------------------------------------------------------------

export interface AiFrameAnalysisResult {
  detectedRatio: DynamicAspectRatio;
  headerRect: { x: number; y: number; width: number; height: number };
  logoRect: { x: number; y: number; width: number; height: number };
  locationRect: { x: number; y: number; width: number; height: number };
  headlineRect: { x: number; y: number; width: number; height: number };
  recommendedPhotoSlots: Array<{
    name: string;
    slotType: 'normal' | 'cutout' | 'supporting';
    rect: { x: number; y: number; width: number; height: number };
  }>;
  statementDetected?: boolean;
  quoteRect?: { x: number; y: number; width: number; height: number };
  speakerNameRect?: { x: number; y: number; width: number; height: number };
  speakerDesigRect?: { x: number; y: number; width: number; height: number };
  ribbonDetected?: boolean;
  ribbonRect?: { x: number; y: number; width: number; height: number };
  footerRect: { x: number; y: number; width: number; height: number };
}

export async function requestAiFrameAnalysis(
  sampleBase64: string,
  selectedRatio: DynamicAspectRatio,
  authToken?: string
): Promise<{ success: boolean; result?: AiFrameAnalysisResult; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${baseUrl}/api/dynamic-frames/ai-analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sampleBase64, selectedRatio }),
    });

    const data = await res.json();
    if (res.ok && data.success && data.result) {
      return { success: true, result: data.result };
    }
    return { success: false, error: data.error || 'AI विश्लेषण में असमर्थ' };
  } catch (err: any) {
    return { success: false, error: err.message || 'AI विश्लेषण सर्वर से कनेक्ट नहीं हो सका' };
  }
}
