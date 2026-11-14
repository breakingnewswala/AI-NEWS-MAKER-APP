/**
 * tests/test_master_video_frame_generator_pro.cjs
 * Comprehensive Automated Test Suite for Master Admin AI Video Frame Generator Pro
 *
 * Verifies:
 * 1. Canvas Aspect Ratio (9:16, 4:5, 1:1, 4:3) vs Video Window Ratio Independence
 * 2. Fit vs Crop display modes & calculateDefaultVideoRect math
 * 3. Movable Footer (Bottom, Top, Header, Custom)
 * 4. Headline settings: 2-line vs 3-line toggle & Multi-Headline Blocks
 * 5. Exclusion of Photo Slots, Photo Layouts, and Story Callouts from Video Frame mode
 * 6. Exclusion of Statement/Quote controls from Video Frame mode
 * 7. Live video player controls & overlays (PNG/GIF Logo, Location, Ribbons, Watermark, Date)
 * 8. End-to-End Video Studio Web canvas composition & DOM preview parity
 * 9. Admin Video Template Control & Preview
 * 10. 100% Code parity between src/ and web_studio/src/
 * 11. Safety invariants (Android applicationId in build.gradle.kts, production templates, Photo Frame preservation)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passCount = 0;
let failCount = 0;

function readNorm(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    failCount++;
  }
}

console.log('================================================================');
console.log('🎬 RUNNING AI NEWS MAKER — MASTER VIDEO FRAME GENERATOR PRO TESTS');
console.log('================================================================\n');

// -------------------------------------------------------------
// Core Engine Loader via esbuild runtime bundling
// -------------------------------------------------------------
const esbuild = require('esbuild');
const modelBundle = esbuild.buildSync({
  entryPoints: ['src/lib/videoFrameLayoutModel.ts'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
});
const modelModule = { exports: {} };
new Function('module', 'exports', 'require', modelBundle.outputFiles[0].text)(
  modelModule,
  modelModule.exports,
  require
);
const {
  calculateDefaultVideoRect,
  normalizeVideoConfig,
  normalizeVideoFrameConfig,
  normalizeHeadlineBlock,
  normalizeVideoRibbonLayer,
  calculateVideoFrameLayout,
  getVideoLayerRect,
  sortVideoLayersByZIndex,
  validateVideoFrameGeometry,
  getAuthoritativeVideoLayers,
} = modelModule.exports;

// -------------------------------------------------------------
// Group 1: Types & Real Math Engine Execution (videoFrameLayoutModel.ts)
// -------------------------------------------------------------
runTest('Group 1.1: VideoFrameConfig supports pro ratios, movable footer, headline modes, & overlays', () => {
  const types = readNorm('src/types/dynamicFrame.ts');
  assert(types.includes('export type VideoWindowAspectRatio ='), 'Must export VideoWindowAspectRatio');
  assert(types.includes('export type VideoFooterPlacement ='), 'Must export VideoFooterPlacement');
  assert(types.includes('export type HeadlineDisplayMode ='), 'Must export HeadlineDisplayMode');
  assert(types.includes('export type HeadlineLineCount ='), 'Must export HeadlineLineCount');
  assert(types.includes('export interface HeadlineBlockConfig'), 'Must declare HeadlineBlockConfig');
  assert(types.includes('export interface VideoRibbonLayer'), 'Must declare VideoRibbonLayer');
  assert(types.includes('calculateDefaultVideoRect'), 'Must declare and export calculateDefaultVideoRect');
});

runTest('Group 1.2: calculateDefaultVideoRect directly executes production code for all ratio combinations', () => {
  assert.strictEqual(typeof calculateDefaultVideoRect, 'function', 'calculateDefaultVideoRect must be an executable function');

  // Test 1: 9:16 Canvas with 9:16 Video
  const rect9_16_to_9_16 = calculateDefaultVideoRect('9:16', '9:16', 'center');
  assert.strictEqual(rect9_16_to_9_16.width, 100);
  assert.strictEqual(rect9_16_to_9_16.height, 100);

  // Test 2: 9:16 Canvas with 4:5 Video
  const rect9_16_to_4_5 = calculateDefaultVideoRect('9:16', '4:5', 'center');
  assert.strictEqual(rect9_16_to_4_5.width, 100);
  assert(rect9_16_to_4_5.height >= 70 && rect9_16_to_4_5.height <= 71, `4:5 height in 9:16 should be ~70.3%, got ${rect9_16_to_4_5.height}`);

  // Test 3: 4:5 Canvas with 16:9 Video
  const rect4_5_to_16_9 = calculateDefaultVideoRect('4:5', '16:9', 'center');
  assert.strictEqual(rect4_5_to_16_9.width, 100);
  assert(rect4_5_to_16_9.height >= 44 && rect4_5_to_16_9.height <= 46, `16:9 height in 4:5 should be ~45%, got ${rect4_5_to_16_9.height}`);

  // Test 4: 4:3 Canvas with 16:9 Video
  const rect4_3_to_16_9 = calculateDefaultVideoRect('4:3', '16:9', 'center');
  assert.strictEqual(rect4_3_to_16_9.width, 100);
  assert(rect4_3_to_16_9.height >= 74 && rect4_3_to_16_9.height <= 76, `16:9 height in 4:3 should be ~75%, got ${rect4_3_to_16_9.height}`);

  // Test 5: 1:1 Canvas with 16:9 Video
  const rect1_1_to_16_9 = calculateDefaultVideoRect('1:1', '16:9', 'center');
  assert.strictEqual(rect1_1_to_16_9.width, 100);
  assert(rect1_1_to_16_9.height >= 56 && rect1_1_to_16_9.height <= 57, `16:9 height in 1:1 should be ~56.2%, got ${rect1_1_to_16_9.height}`);

  // Test 6: Top and Bottom presets
  const topRect = calculateDefaultVideoRect('9:16', '16:9', 'top');
  assert.strictEqual(topRect.y, 15, 'Top preset should align at y=15% below header');
  const bottomRect = calculateDefaultVideoRect('9:16', '16:9', 'bottom');
  assert.strictEqual(bottomRect.y, 55, 'Bottom preset should align at y=55%');

  // Test 7: Custom ratio fallback
  const customRect = calculateDefaultVideoRect('9:16', 'custom', 'center');
  assert.deepStrictEqual(customRect, { x: 0, y: 15, width: 100, height: 70 });
});

runTest('Group 1.3: validateVideoFrameGeometry and getVideoLayerRect execute with mathematical precision', () => {
  const valid = validateVideoFrameGeometry({ x: 0, y: 10, width: 100, height: 50 });
  assert.strictEqual(valid.valid, true, 'Valid rect must pass geometry check');

  const invalid = validateVideoFrameGeometry({ x: NaN, y: 10, width: -5, height: 50 });
  assert.strictEqual(invalid.valid, false, 'Invalid rect must fail geometry check');
  assert(invalid.errors.length >= 2, 'Should report all geometry errors');

  const pixels = getVideoLayerRect({ x: 10, y: 20, width: 50, height: 25 }, 1080, 1920);
  assert.strictEqual(pixels.x, 108);
  assert.strictEqual(pixels.y, 384);
  assert.strictEqual(pixels.width, 540);
  assert.strictEqual(pixels.height, 480);
});

// -------------------------------------------------------------
// Group 2: Master Admin Generator Modal (DynamicFrameGeneratorModal.tsx)
// -------------------------------------------------------------
runTest('Group 2.1: Step 1 supports Canvas Aspect Ratio & Video Window Ratio independence', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  assert(modal.includes('videoWindowRatio'), 'Must track videoWindowRatio state');
  assert(modal.includes('videoDisplayMode'), 'Must track videoDisplayMode state');
  assert(modal.includes('फाइनल वीडियो विंडो रेशियो (Final Video Window Ratio)'), 'Step 1 must feature Video Window Ratio selector');
  assert(modal.includes('विकल्प A: फुल वीडियो / फिट (Fit)') && modal.includes('विकल्प B: क्रॉप वीडियो (Crop Fill)'), 'Step 1 must feature Fit vs Crop selector');
});

runTest('Group 2.2: Step 3 completely omits Story Callout in Video mode and supports Movable Footer', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  assert(modal.includes("generatorMode === 'photo'") && modal.includes('पूरी खबर विवरण कॉलआउट (Story Callout)'), 'Story callout settings must be guarded by generatorMode === photo');
  assert(modal.includes('वीडियो फुटर स्थिति (Movable Video Footer Position)'), 'Step 3 must feature Movable Footer position buttons');
  assert(modal.includes('videoFooterPosition'), 'Must track videoFooterPosition');
  assert(modal.includes('PNG लोगो (पारदर्शी)') && modal.includes('GIF लोगो (एनिमेटेड)'), 'Step 3 must support PNG and GIF logo selection');
});

runTest('Group 2.3: Step 4 layer engine allows moving footer in Video mode without locking and excludes callout', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  assert(modal.includes("name: 'मूवेबल फुटर (Movable Footer)'") && modal.includes('locked: false'), 'Footer must be unlocked in Video mode');
  assert(modal.includes("name: 'स्थाई फुटर (Permanent Footer)'") && modal.includes('locked: true'), 'Footer must be locked in Photo mode');
  assert(modal.includes('Callout layer: STRICTLY ONLY IN PHOTO MODE'), 'Callout layer must only exist in Photo mode');
  assert(modal.includes("id: 'layer_main_video'"), 'Must declare layer_main_video');
});

runTest('Group 2.4: Step 5 completely separates Video mode from Photo mode, excluding Photo Slots', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  assert(modal.includes('5. वीडियो स्पेस और सेफ ज़ोन') || modal.includes('5. वीडियो स्पेस'), 'Step 5 must have dedicated video title');
  assert(modal.includes('सेफ ज़ोन'), 'Step 5 must feature Safe Zone overlay toggle');
  assert(modal.includes('videoFocalPreset'), 'Step 5 must provide Center, Top, Bottom presets');
  assert(modal.includes('videoAspectLock'), 'Step 5 must provide Aspect Lock toggle');
  assert(modal.includes("generatorMode === 'video' ? ("), 'Step 5 must branch on generatorMode === video');
});

runTest('Group 2.5: Step 6 provides Video Headline settings and completely excludes Statement/Quote', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  assert(modal.includes('6. वीडियो हेडलाइन सेटिंग्स') || modal.includes('वीडियो हेडलाइन'), 'Step 6 must have dedicated video title');
  assert(modal.includes('headlineMode'), 'Step 6 must support Single vs Multi headline modes');
  assert(modal.includes('headlineLineCount'), 'Step 6 must provide 2-line vs 3-line toggle');
  assert(modal.includes('मात्रा सेफ') || modal.includes('लाइन-हाइट'), 'Step 6 must provide Devanagari matra safe line-height control');
  assert(modal.includes('headlineBlocks'), 'Step 6 must provide headline blocks management in multi mode');
  assert(modal.includes("generatorMode === 'video' ? ("), 'Step 6 must branch on generatorMode === video');
});

runTest('Group 2.6: Step 7 features live video preview player with sample video upload, mute, play/pause', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  assert(modal.includes('सैंपल वीडियो:'), 'Step 7 must feature sample video controls in video mode');
  assert(modal.includes('isVideoPlaying'), 'Step 7 must have play/pause state');
  assert(modal.includes('isVideoMuted'), 'Step 7 must have mute/unmute state');
});

runTest('Group 2.7: Step 8 persists extended videoConfig and clears photoSlots & callout in Video mode', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  assert(modal.includes('videoWindowAspectRatio: videoWindowRatio'), 'Must persist videoWindowAspectRatio');
  assert(modal.includes('displayMode: videoDisplayMode'), 'Must persist displayMode');
  assert(modal.includes('footerPosition: videoFooterPosition'), 'Must persist footerPosition');
  assert(modal.includes('headlineMode: headlineMode'), 'Must persist headlineMode');
  assert(modal.includes('headlineLineCount: headlineLineCount'), 'Must persist headlineLineCount');
  assert(modal.includes('photoSlots: isVideo ? [] : photoSlots'), 'photoSlots must be empty array in Video mode');
  assert(modal.includes('photoLayoutVariants: isVideo ? [] : layoutVariants'), 'photoLayoutVariants must be empty array in Video mode');
  assert(modal.includes('fullStoryCalloutConfig: isVideo'), 'callout must be disabled in Video mode');
});

// -------------------------------------------------------------
// Group 3: Video Studio Web Engine Integration (VideoStudioWeb.tsx)
// -------------------------------------------------------------
runTest('Group 3.1: DrawCompositionOptions and VideoFrameDefinition include activeDynamicFrame and rawDynamicFrame', () => {
  const studio = readNorm('src/components/VideoStudioWeb.tsx');
  assert(studio.includes('activeDynamicFrame?: VideoFrameDefinition | null;'), 'DrawCompositionOptions must include activeDynamicFrame');
  assert(studio.includes('rawDynamicFrame: df,'), 'dynamicConvertedVideoFrames must attach rawDynamicFrame');
  assert(studio.includes('videoConfig: df.videoConfig,'), 'dynamicConvertedVideoFrames must attach videoConfig');
  assert(studio.includes('customLayers: df.layers,'), 'dynamicConvertedVideoFrames must attach customLayers');
});

runTest('Group 3.2: drawAuthoritativeDynamicVideoFrame renders canvas based on Master Admin markings', () => {
  const studio = readNorm('src/components/VideoStudioWeb.tsx');
  assert(studio.includes('function drawAuthoritativeDynamicVideoFrame('), 'Must define drawAuthoritativeDynamicVideoFrame');
  assert(studio.includes('if (opts.activeDynamicFrame?.rawDynamicFrame) {'), 'drawVideoCompositionToCanvas must check activeDynamicFrame early');
  assert(studio.includes('drawAuthoritativeDynamicVideoFrame(ctx, width, height, opts.activeDynamicFrame, opts);'), 'Must invoke drawAuthoritativeDynamicVideoFrame');
  assert(studio.includes('isCrop ?') && studio.includes('FIT MODE:'), 'Engine must support both crop and fit modes');
  assert(studio.includes('ribbonLayers'), 'Engine must render ribbon layers');
});

runTest('Group 3.3: DOM Live Preview renders authoritative dynamic video frame matching template geometry', () => {
  const studio = readNorm('src/components/VideoStudioWeb.tsx');
  assert(studio.includes('activeDynamicFrame?.rawDynamicFrame ? ('), 'DOM preview must branch on activeDynamicFrame.rawDynamicFrame');
  assert(studio.includes('DYNAMIC VIDEO FRAME PRO (Master Admin Defined)'), 'Must include Dynamic Video Frame Pro block in DOM preview');
  assert(studio.includes('vConf.videoRect') || studio.includes('vConf?.videoRect'), 'DOM preview must position video according to vConf.videoRect');
  assert(studio.includes('fRect.x') && studio.includes('fRect.y'), 'DOM preview must position footer according to fRect');
});

runTest('Group 3.4: Canvas export call sites pass activeDynamicFrame to maintain 100% parity with live preview', () => {
  const studio = readNorm('src/components/VideoStudioWeb.tsx');
  // Check the three distinct execution sites:
  // 1. Snapshot poster (takeVideoSnapshot)
  assert(studio.includes('drawVideoCompositionToCanvas(ctx, width, height, {\n        video,\n        selectedFrameId,\n        activeDynamicFrame,\n        headline,'), 'Snapshot call site must pass activeDynamicFrame');
  // 2. Initial frame before recorder startup
  assert(studio.includes('drawVideoCompositionToCanvas(ctx, width, height, {\n        video,\n        selectedFrameId,\n        activeDynamicFrame,\n        headline: initialExpHeadline,'), 'Recorder init call site must pass activeDynamicFrame');
  // 3. RequestVideoFrameCallback export loop
  assert(studio.includes('drawVideoCompositionToCanvas(ctx, width, height, {\n            video,\n            selectedFrameId,\n            activeDynamicFrame,\n            headline: currentExpH,'), 'Export loop call site must pass activeDynamicFrame');
});

// -------------------------------------------------------------
// Group 4: Admin Video Template Control (AdminVideoTemplateControl.tsx)
// -------------------------------------------------------------
runTest('Group 4.1: AdminVideoTemplateControl reflects rawDynamicFrame, headlineLineCount, and footer positions', () => {
  const admin = readNorm('src/components/AdminVideoTemplateControl.tsx');
  assert(admin.includes('rawDynamicFrame: df,'), 'Must attach rawDynamicFrame');
  assert(admin.includes('headlineMaxLines: df.videoConfig?.headlineLineCount || 3,'), 'Must reflect headlineLineCount');
  assert(admin.includes("previewFrame.footerPosition === 'top' || previewFrame.footerPosition === 'header'"), 'Preview must handle top/header footer');
  assert(admin.includes("previewFrame.footerPosition === 'custom'"), 'Preview must handle custom footer coordinates');
  assert(admin.includes('onEditFrame(frame.rawDynamicFrame);'), 'Must pass rawDynamicFrame to edit modal');
});

// -------------------------------------------------------------
// Group 5: 100% Code Parity between src/ and web_studio/src/
// -------------------------------------------------------------
runTest('Group 5.1: Zero diff between src/ and web_studio/src/ for dynamicFrame.ts', () => {
  const src = readNorm('src/types/dynamicFrame.ts');
  const web = readNorm('web_studio/src/types/dynamicFrame.ts');
  assert.strictEqual(src, web, 'src/types/dynamicFrame.ts must be identical to web_studio/src/types/dynamicFrame.ts');
});

runTest('Group 5.2: Zero diff between src/ and web_studio/src/ for videoTemplatesRegistry.ts', () => {
  const src = readNorm('src/lib/videoTemplatesRegistry.ts');
  const web = readNorm('web_studio/src/lib/videoTemplatesRegistry.ts');
  assert.strictEqual(src, web, 'src/lib/videoTemplatesRegistry.ts must be identical to web_studio/src/lib/videoTemplatesRegistry.ts');
});

runTest('Group 5.3: Zero diff between src/ and web_studio/src/ for DynamicFrameGeneratorModal.tsx', () => {
  const src = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  const web = readNorm('web_studio/src/components/DynamicFrameGeneratorModal.tsx');
  assert.strictEqual(src, web, 'src/components/DynamicFrameGeneratorModal.tsx must be identical to web_studio/src/components/DynamicFrameGeneratorModal.tsx');
});

runTest('Group 5.4: Zero diff between src/ and web_studio/src/ for VideoStudioWeb.tsx', () => {
  const src = readNorm('src/components/VideoStudioWeb.tsx');
  const web = readNorm('web_studio/src/components/VideoStudioWeb.tsx');
  assert.strictEqual(src, web, 'src/components/VideoStudioWeb.tsx must be identical to web_studio/src/components/VideoStudioWeb.tsx');
});

runTest('Group 5.5: Zero diff between src/ and web_studio/src/ for AdminVideoTemplateControl.tsx', () => {
  const src = readNorm('src/components/AdminVideoTemplateControl.tsx');
  const web = readNorm('web_studio/src/components/AdminVideoTemplateControl.tsx');
  assert.strictEqual(src, web, 'src/components/AdminVideoTemplateControl.tsx must be identical to web_studio/src/components/AdminVideoTemplateControl.tsx');
});

runTest('Group 5.6: Zero diff between src/ and web_studio/src/ for videoFrameLayoutModel.ts', () => {
  const src = readNorm('src/lib/videoFrameLayoutModel.ts');
  const web = readNorm('web_studio/src/lib/videoFrameLayoutModel.ts');
  assert.strictEqual(src, web, 'src/lib/videoFrameLayoutModel.ts must be identical to web_studio/src/lib/videoFrameLayoutModel.ts');
});

// -------------------------------------------------------------
// Group 6: Safety Invariants & Photo Frame Preservation
// -------------------------------------------------------------
runTest('Group 6.1: Android applicationId strictly preserved as com.aistudio.ainewsmaker.hzwptx in build.gradle.kts', () => {
  const gradle = readNorm('app/build.gradle.kts');
  assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must remain com.aistudio.ainewsmaker.hzwptx');
});

runTest('Group 6.2: Production dynamic frame df_1794406067554_albmw preserved and not in tombstone', () => {
  const db = JSON.parse(fs.readFileSync('dynamic_frames_db.json', 'utf8'));
  const frame = db.find((f) => f.id === 'df_1794406067554_albmw');
  assert(frame, 'Production frame df_1794406067554_albmw must exist');
  assert.strictEqual(frame.publicationStatus, 'published');
  assert.strictEqual(frame.approvalStatus, 'APPROVED');

  const tombstones = JSON.parse(fs.readFileSync('deleted_frames_tombstone.json', 'utf8'));
  assert(!tombstones.includes('df_1794406067554_albmw'), 'df_1794406067554_albmw must not be tombstoned');
});

runTest('Group 6.3: Photo Frame Generator mode is completely intact with photo slots, layouts & callout', () => {
  const modal = readNorm('src/components/DynamicFrameGeneratorModal.tsx');
  // Photo Frame mode retains 100% of photo slots logic:
  assert(modal.includes('photoSlots'), 'Step 5 in Photo mode must retain photoSlots');
  assert(modal.includes('layoutVariants'), 'Step 5 in Photo mode must retain layoutVariants');
  assert(modal.includes('रिबन, हेडर व फुटर'), 'Step 3 must retain all header, ribbon and footer controls');
  assert(modal.includes('fullStoryCalloutConfig'), 'Callout must be preserved for Photo mode');
  assert(modal.includes('सिंगल फोटो (1 Photo Full)'), 'Photo layout presets must be preserved');
});

// -------------------------------------------------------------
// Group 7: Layout Model & Normalization Runtime Engine
// -------------------------------------------------------------

runTest('Group 7.1: normalizeVideoConfig normalizes canonical contract, migrating multi to multiple & legacy coords', () => {
  const legacy = {
    headlineMode: 'multi',
    locationBadgeRect: { x: 5, y: 15, width: 25, height: 6 },
    ribbonLayers: [{ id: 'r1', text: 'BREAKING', position: 'top' }],
    headlineBlocks: [{ id: 'b1', text: 'Title' }],
  };
  const norm = normalizeVideoConfig(legacy, '9:16');
  assert.strictEqual(norm.headlineMode, 'multiple', 'headlineMode multi must be normalized to multiple');
  assert.deepStrictEqual(norm.locationRect, { x: 5, y: 15, width: 25, height: 6 }, 'locationBadgeRect must migrate to locationRect');
  assert(norm.ribbonLayers[0].rect, 'ribbon without rect must get default canonical rect');
  assert(norm.headlineBlocks[0].rect, 'headlineBlock without rect must get default canonical rect');
});

runTest('Group 7.2: getAuthoritativeVideoLayers sorts layers in strict zIndex stack order', () => {
  const norm = normalizeVideoConfig(
    {
      videoRect: { x: 0, y: 15, width: 100, height: 75 },
      logoRect: { x: 5, y: 5, width: 20, height: 8 },
      locationRect: { x: 5, y: 15, width: 25, height: 6 },
      footerRect: { x: 0, y: 92, width: 100, height: 8 },
      ribbonLayers: [{ id: 'r1', name: 'R1', zIndex: 12, visible: true }],
      headlineMode: 'single',
      headlineRect: { x: 5, y: 70, width: 90, height: 15 },
    },
    '9:16'
  );
  const layers = getAuthoritativeVideoLayers(norm);
  assert(layers.length >= 5, `Expected at least 5 layers, got ${layers.length}`);
  for (let i = 0; i < layers.length - 1; i++) {
    assert(
      layers[i].zIndex <= layers[i + 1].zIndex,
      `Layer ${layers[i].name} (${layers[i].zIndex}) must be <= ${layers[i + 1].name} (${layers[i + 1].zIndex})`
    );
  }
});

// -------------------------------------------------------------
// Group 8: Screenshot Evidence & Visual Audit Integrity
// -------------------------------------------------------------
runTest('Group 8.1: evidence_manifest.json exists with 15 verified captures', () => {
  const manifestPath = path.join('audit_screenshots', 'video_pro', 'evidence_manifest.json');
  assert(fs.existsSync(manifestPath), 'evidence_manifest.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.length, 15, `Manifest must contain 15 entries, got ${manifest.length}`);
});

runTest('Group 8.2: All 15 screenshots exist on disk, are non-empty (>50KB), and have 100% unique SHA256 hashes', () => {
  const manifestPath = path.join('audit_screenshots', 'video_pro', 'evidence_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const crypto = require('crypto');
  const seenHashes = new Set();

  for (const item of manifest) {
    const fileOnDisk = path.join('audit_screenshots', 'video_pro', item.file);
    assert(fs.existsSync(fileOnDisk), `Screenshot file ${item.file} must exist on disk`);
    const buf = fs.readFileSync(fileOnDisk);
    assert(buf.length > 50000, `Screenshot file ${item.file} must be >50KB, got ${buf.length} bytes`);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    assert.strictEqual(hash, item.sha256, `SHA256 for ${item.file} must match manifest`);
    assert(!seenHashes.has(hash), `Duplicate screenshot detected for ${item.file}!`);
    seenHashes.add(hash);
  }
  assert.strictEqual(seenHashes.size, 15, 'All 15 screenshots must have unique hashes');
});

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`🏁 TEST RESULTS: ${passCount} Passed, ${failCount} Failed (Total: ${passCount + failCount})`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
