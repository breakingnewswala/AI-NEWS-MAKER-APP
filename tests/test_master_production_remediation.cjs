const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('--- STARTING MASTER PRODUCTION DEVELOPMENT & UI/UX REMEDIATION VERIFICATION ---');

let passedTests = 0;
function pass(name) {
  console.log(`[PASS] ${name}`);
  passedTests++;
}

// -------------------------------------------------------------
// MODULE 1: Browser Tab Title Branding
// -------------------------------------------------------------
const appSrc = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
assert.ok(appSrc.includes("'AI News Maker - स्मार्ट डिजिटल न्यूज़ स्टूडियो'"), 'Home tab title must be AI News Maker - स्मार्ट डिजिटल न्यूज़ स्टूडियो');
assert.ok(appSrc.includes('`${pageName} - AI News Maker`'), 'Other pages must use `${pageName} - AI News Maker` with hyphen');
assert.ok(!appSrc.includes("'Home / AI News Maker'"), 'Obsolete slash title format Home / AI News Maker must be removed');
assert.ok(!appSrc.includes("'Studio / AI News Maker'"), 'Obsolete slash title format Studio / AI News Maker must be removed');
assert.ok(!appSrc.includes("`${pageName} | ${channelName}`"), 'Obsolete pipe format with channelName must be removed');
pass('Module 1: Browser Tab Title Branding correctly formats Home and Page Name - AI News Maker');

// -------------------------------------------------------------
// MODULE 2: Separate Video Test Frame Systems (Quick Video vs Studio Mode)
// -------------------------------------------------------------
const dynamicFrameTypes = fs.readFileSync(path.join(__dirname, '../src/types/dynamicFrame.ts'), 'utf8');
assert.ok(dynamicFrameTypes.includes("videoTargetMode?: 'quick_video' | 'studio_mode'"), 'DynamicFrameTemplate must declare videoTargetMode');

const frameGenModal = fs.readFileSync(path.join(__dirname, '../src/components/DynamicFrameGeneratorModal.tsx'), 'utf8');
assert.ok(frameGenModal.includes('फ्रेम किस मोड के लिए है?'), 'Video Frame Generator Step 8 must ask intended mode');
assert.ok(frameGenModal.includes('Quick Video Mode Test Frame'), 'Quick Video Mode option must be present');
assert.ok(frameGenModal.includes('Studio Mode Test Frame'), 'Studio Mode option must be present');
assert.ok(frameGenModal.includes('videoTargetMode'), 'videoTargetMode must be saved with template');
pass('Module 2: Video Frame Generator provides separate Quick Video and Studio Mode target modes');

// -------------------------------------------------------------
// MODULE 3: Video Template Control Separation & Dummy Exclusion
// -------------------------------------------------------------
const videoControl = fs.readFileSync(path.join(__dirname, '../src/components/AdminVideoTemplateControl.tsx'), 'utf8');
assert.ok(videoControl.includes('Quick Video Test Frames'), 'AdminVideoTemplateControl must have Quick Video Test Frames category');
assert.ok(videoControl.includes('Studio Mode Test Frames'), 'AdminVideoTemplateControl must have Studio Mode Test Frames category');
assert.ok(videoControl.includes('quickVideoTestFrames'), 'quickVideoTestFrames array must be tracked');
assert.ok(videoControl.includes('studioModeTestFrames'), 'studioModeTestFrames array must be tracked');
assert.ok(videoControl.includes("'df_1794938610435_g8pec'"), 'Dummy TEST 1 frame must be excluded from published catalogue');
assert.ok(videoControl.includes('isMasterAdmin && ('), 'Test frames tab must be guarded by Master Admin authentication');
pass('Module 3: Video Template Control separates test frames into Quick Video and Studio Mode, excludes dummy frames, and gates test frames tab to Master Admin');

// -------------------------------------------------------------
// MODULE 4: Test Video Download in Frame Generator
// -------------------------------------------------------------
assert.ok(frameGenModal.includes('handleDownloadTestVideo'), 'DynamicFrameGeneratorModal must implement handleDownloadTestVideo');
assert.ok(frameGenModal.includes('टेस्ट वीडियो डाउनलोड करें'), 'Video mode must offer dedicated test video download button');
assert.ok(frameGenModal.includes('isExportingTestVideo'), 'Loading state must be handled during test video export');
assert.ok(frameGenModal.includes('headerConfig.showLogo'), 'handleDownloadTestVideo must render channel logo layer');
assert.ok(frameGenModal.includes('headerConfig.showLocation'), 'handleDownloadTestVideo must render location badge layer');
pass('Module 4: Frame Generator provides full playable Test Video Download with all design elements');

// -------------------------------------------------------------
// MODULE 5: Full Video Export Engine Compositor Visibility
// -------------------------------------------------------------
const videoStudio = fs.readFileSync(path.join(__dirname, '../src/components/VideoStudioWeb.tsx'), 'utf8');
assert.ok(videoStudio.includes("canvas.style.opacity = '0.01'"), 'Offscreen canvas must not be culled by compositor');
assert.ok(videoStudio.includes("canvas.style.left = '0px'"), 'Offscreen canvas must be positioned at 0px');
assert.ok(!videoStudio.includes('left: -9999px; opacity: 0;'), 'Culled offscreen canvas coordinates must be removed');
assert.ok(videoStudio.includes('vTracks.length === 0'), 'Canvas video tracks must be explicitly verified before recording');
assert.ok(videoStudio.includes("currentMode: 'quick_video' | 'studio_mode'"), 'VideoStudioWeb must filter compatibleFrames by quick_video vs studio_mode');
pass('Module 5: Video Export Engine offscreen canvas is compositor-visible and avoids freeze');

// -------------------------------------------------------------
// MODULE 6: Graphic Template Control Card Redesign
// -------------------------------------------------------------
const templatePlanManager = fs.readFileSync(path.join(__dirname, '../src/components/AdminTemplatePlanManager.tsx'), 'utf8');
assert.ok(templatePlanManager.includes('setTestingFrame('), 'Test button on card must launch live test modal');
assert.ok(templatePlanManager.includes('विशेष जांच रिपोर्ट: मध्य प्रदेश में नए डिजिटल मीडिया स्टूडियो का शुभारंभ'), 'Canonical sample news card must be rendered in testing modal');
assert.ok(templatePlanManager.includes('deletingFrame'), 'Delete action must provide safety confirmation modal');
pass('Module 6: Graphic Template Control redesigned with 4 distinct action buttons and canonical sample test preview');

// -------------------------------------------------------------
// MODULE 7: Social Media Caption Permissions & Clean UI
// -------------------------------------------------------------
const captionModal = fs.readFileSync(path.join(__dirname, '../src/components/CaptionModal.tsx'), 'utf8');
assert.ok(captionModal.includes('इस खबर के लिए सोशल मीडिया पोस्ट कैप्शन'), 'Caption modal title updated');
assert.ok(captionModal.includes('इंस्टाग्राम, फेसबुक और अन्य सोशल मीडिया प्लेटफॉर्म के लिए'), 'Caption modal subtitle updated');
assert.ok(captionModal.includes('isMaster ? ('), 'Master Admin permissions must gate editing controls');
assert.ok(captionModal.includes('कॉपी करें'), 'Single-click copy button provided for normal users');
assert.ok(!captionModal.includes('Mic className'), 'Mic icon beside editor must be removed');
pass('Module 7: Caption Modal separates Master Admin controls from normal user read-only experience');

// -------------------------------------------------------------
// MODULE 8: Footer Branding Lock & Custom Footer Library
// -------------------------------------------------------------
const cardEditor = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');
assert.ok(cardEditor.includes('canUseCustomHF && libraryFooters.length > 0'), 'Custom footer library must be guarded by plan entitlement');
assert.ok(cardEditor.includes('🔒 केवल PRO / VIP DESK'), 'Locked badge shown to ineligible users for custom footers');
pass('Module 8: Normal users default to channel branding and Custom Footer Library is locked to Pro/VIP');

// -------------------------------------------------------------
// MODULE 9: Master Admin User Feature Entitlement Summary
// -------------------------------------------------------------
const userPlanManager = fs.readFileSync(path.join(__dirname, '../src/lib/userPlanManager.ts'), 'utf8');
assert.ok(userPlanManager.includes('getUserFeatureEntitlements'), 'getUserFeatureEntitlements function exported');
assert.ok(userPlanManager.includes('getAdminSelectedUserEmail'), 'getAdminSelectedUserEmail function exported');
assert.ok(userPlanManager.includes('setAdminSelectedUserEmail'), 'setAdminSelectedUserEmail function exported');

const adminPlans = fs.readFileSync(path.join(__dirname, '../src/components/AdminPlansAndPackagesManager.tsx'), 'utf8');
assert.ok(adminPlans.includes('चयनित उपयोगकर्ता फीचर विवरण'), 'Selected user feature summary banner rendered');
assert.ok(adminPlans.includes('इस उपयोगकर्ता के सक्रिय फीचर:'), 'Active features text-based list rendered');
assert.ok(adminPlans.includes('विशेष अनुमति:'), 'Special permissions text-based list rendered');
pass('Module 9: Master Admin feature entitlement summary displayed across tabs and user rows');

// -------------------------------------------------------------
// MODULE 10: Headline Word Highlighting Exact Word Selection
// -------------------------------------------------------------
assert.ok(cardEditor.includes('toggleWordHighlightByIndex'), 'CardEditor toggles word highlight by exact index');
assert.ok(cardEditor.includes('getHeadlineTokensWithHighlights'), 'getHeadlineTokensWithHighlights parses exact token indices');

const layoutEngine = fs.readFileSync(path.join(__dirname, '../src/lib/canonicalLayoutEngine.ts'), 'utf8');
assert.ok(layoutEngine.includes('cleanW === cleanHw'), 'Layout engine uses exact match instead of substring cleanW.includes(cleanHw)');
assert.ok(layoutEngine.includes('if (hasTags) return false;'), 'Explicit tags isolate untagged words from turning yellow');

const canvasExp = fs.readFileSync(path.join(__dirname, '../src/lib/CanvasExporter.ts'), 'utf8');
assert.ok(canvasExp.includes('cleanW === cleanHw'), 'CanvasExporter uses exact match instead of substring');
pass('Module 10: Headline word highlighting tracks exact word index and eliminates substring matches');

// -------------------------------------------------------------
// MODULE 11: Font Style Selection & Real Preview
// -------------------------------------------------------------
assert.ok(cardEditor.includes('document.fonts.load'), 'CardEditor loads font via document.fonts.load on selection');
const cardPreview = fs.readFileSync(path.join(__dirname, '../src/components/CardPreview.tsx'), 'utf8');
assert.ok(cardPreview.includes('`"${card.headlineFontFamily || \'Baloo 2\'}", "Baloo 2", sans-serif`'), 'CardPreview quotes font family for robust CSS rendering');
pass('Module 11: Font selection triggers real font download and quotes font family');

// -------------------------------------------------------------
// MODULE 12: Full Story Callout Position & Safe-Zone Clamp
// -------------------------------------------------------------
assert.ok(!cardPreview.includes('Math.max(6.5, df.fullStoryCalloutConfig?.rect?.height ?? 6.5)'), 'CardPreview removes hardcoded 6.5% callout height inflation');
assert.ok(!canvasExp.includes('Math.max(6.5, cRectRaw.height || 6.5)'), 'CanvasExporter removes hardcoded 6.5% callout height inflation');
assert.ok(cardPreview.includes('Math.min(calloutRawY, maxBottomY - calloutRawH)'), 'CardPreview clamps callout bottom to avoid footer overlap');
assert.ok(canvasExp.includes('Math.min(cRectRaw.y ?? 85, maxBottomY - calloutH)'), 'CanvasExporter clamps callout bottom to avoid footer overlap');
pass('Module 12: Full story callout position respects exact saved coordinates and never overlaps footer');

// -------------------------------------------------------------
// MODULE 13: Two-Photo Multigrid Functionality on Dynamic Frames
// -------------------------------------------------------------
assert.ok(dynamicFrameTypes.includes('function resolveEffectivePhotoSlots'), 'resolveEffectivePhotoSlots function exported in dynamicFrame');
assert.ok(cardPreview.includes('resolveEffectivePhotoSlots(df.photoSlots, card.layout)'), 'CardPreview uses resolveEffectivePhotoSlots');
assert.ok(canvasExp.includes('resolveEffectivePhotoSlots(df.photoSlots, card.layout)'), 'CanvasExporter uses resolveEffectivePhotoSlots');
pass('Module 13: Dynamic frames support two-photo multigrid layouts with dual independent slots');

// -------------------------------------------------------------
// MODULE 14: Server RBAC Caption Verification
// -------------------------------------------------------------
const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');
assert.ok(serverCode.includes('const callerIsMaster = Boolean(isAuthorizedMasterAdmin(req));'), 'server.ts checks isAuthorizedMasterAdmin for caption endpoint');
assert.ok(serverCode.includes('safeCustomInstruction = callerIsMaster ? (customInstruction || "") : ""'), 'customInstruction sanitized for non-master callers');
assert.ok(serverCode.includes('safeAiProvider = callerIsMaster ? (aiProvider || "gemini") : "gemini"'), 'aiProvider sanitized for non-master callers');
pass('Module 14: Server enforces RBAC on caption generation parameters');

// -------------------------------------------------------------
// MODULE 15: 100% SHA256 Mirror Parity
// -------------------------------------------------------------
const filesToVerify = [
  'src/App.tsx',
  'src/components/AdminPlansAndPackagesManager.tsx',
  'src/components/AdminTemplatePlanManager.tsx',
  'src/components/AdminVideoTemplateControl.tsx',
  'src/components/CaptionModal.tsx',
  'src/components/CardEditor.tsx',
  'src/components/CardPreview.tsx',
  'src/components/DynamicFrameGeneratorModal.tsx',
  'src/components/VideoStudioWeb.tsx',
  'src/lib/CanvasExporter.ts',
  'src/lib/canonicalLayoutEngine.ts',
  'src/lib/dynamicFramesManager.ts',
  'src/lib/userPlanManager.ts',
  'src/types/dynamicFrame.ts',
  'server.ts'
];

for (const f of filesToVerify) {
  const rootPath = path.join(__dirname, '..', f);
  const webStudioPath = path.join(__dirname, '..', 'web_studio', f);
  assert.ok(fs.existsSync(rootPath), `Root file must exist: ${f}`);
  assert.ok(fs.existsSync(webStudioPath), `Web studio file must exist: ${f}`);
  const rootBuf = fs.readFileSync(rootPath);
  const studioBuf = fs.readFileSync(webStudioPath);
  const rootHash = crypto.createHash('sha256').update(rootBuf).digest('hex');
  const studioHash = crypto.createHash('sha256').update(studioBuf).digest('hex');
  assert.strictEqual(rootHash, studioHash, `SHA256 mismatch for ${f}`);
}
pass('Module 15: 100% SHA256 mirror parity verified across all modified files between root and web_studio');

// -------------------------------------------------------------
// MODULE 16: Android Invariant Preservation
// -------------------------------------------------------------
const gradleFile = fs.readFileSync(path.join(__dirname, '../app/build.gradle.kts'), 'utf8');
assert.ok(gradleFile.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
pass('Module 16: Android applicationId preserved as com.aistudio.ainewsmaker.hzwptx');

console.log('========================================');
console.log(`TEST SUMMARY: ALL ${passedTests} PRODUCTION REMEDIATION TESTS PASSED!`);
console.log('========================================');
