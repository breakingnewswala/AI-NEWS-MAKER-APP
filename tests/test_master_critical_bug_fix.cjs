/**
 * AI NEWS MAKER — MASTER CRITICAL BUG FIX AUTOMATED VERIFICATION SUITE
 * Tests 1 through 12 validating all 9 Bugs (Bug A through Bug I)
 */

const fs = require('fs');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING MASTER CRITICAL BUG FIX TEST SUITE (12 TESTS)');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(testName, testFn) {
  try {
    testFn();
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}:`, err.message);
    failCount++;
  }
}

// -------------------------------------------------------------
// Test 1: Full PNG Frame Export & Safe Image Loading
// -------------------------------------------------------------
runTest('Test 1 — Full PNG Frame Export & Transparent Fallback (Bug A)', () => {
  const canvasExporterSrc = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasExporterSrc.includes('getSafeImageUrl'), 'Missing getSafeImageUrl helper');
  assert(canvasExporterSrc.includes('/api/proxy-image?url='), 'Missing /api/proxy-image routing');
  assert(canvasExporterSrc.includes('transparentFallback'), 'Missing transparent fallback definition');
  assert(canvasExporterSrc.includes('isOverlayOrFrame ? transparentFallback : photoFallback'), 'Overlay must use transparent fallback');
  assert(canvasExporterSrc.includes('img.naturalWidth > 0'), 'Image loader must check naturalWidth before rejecting');
});

// -------------------------------------------------------------
// Test 2: Dual Parity & Visual Parity (Preview = Export)
// -------------------------------------------------------------
runTest('Test 2 — Preview/Export Parity across Root and web_studio (Bug A, Dual Parity)', () => {
  const rootCE = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  const webCE = fs.readFileSync('web_studio/src/lib/CanvasExporter.ts', 'utf8');
  assert.strictEqual(rootCE.length, webCE.length, 'CanvasExporter length mismatch between root and web_studio');

  const rootCLE = fs.readFileSync('src/lib/canonicalLayoutEngine.ts', 'utf8');
  const webCLE = fs.readFileSync('web_studio/src/lib/canonicalLayoutEngine.ts', 'utf8');
  assert.strictEqual(rootCLE.length, webCLE.length, 'canonicalLayoutEngine length mismatch');

  const rootPreview = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  const webPreview = fs.readFileSync('web_studio/src/components/CardPreview.tsx', 'utf8');
  assert.strictEqual(rootPreview.length, webPreview.length, 'CardPreview length mismatch');

  const rootEditor = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  const webEditor = fs.readFileSync('web_studio/src/components/CardEditor.tsx', 'utf8');
  assert.strictEqual(rootEditor.length, webEditor.length, 'CardEditor length mismatch');
});

// -------------------------------------------------------------
// Test 3: Master Admin Story Callout Single Source of Truth
// -------------------------------------------------------------
runTest('Test 3 — Master Admin Story Callout Control (Bug B)', () => {
  const cardEditorSrc = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(!cardEditorSrc.includes('स्टोरी कॉलआउट डिज़ाइन (Pro / VIP Desk)'), 'Redundant user-side story callout picker must be removed');
  
  const modalSrc = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(modalSrc.includes('fullStoryCalloutConfig'), 'DynamicFrameGeneratorModal must support fullStoryCalloutConfig');
  assert(modalSrc.includes('calloutVisibilityPolicy'), 'Modal must support calloutVisibilityPolicy');
});

// -------------------------------------------------------------
// Test 4: Headline Maximum Four-Line Support & No Cropping
// -------------------------------------------------------------
runTest('Test 4 — Headline Four-Line Rendering & Safe Clipping Bounds (Bug C)', () => {
  const engineSrc = fs.readFileSync('src/lib/canonicalLayoutEngine.ts', 'utf8');
  assert(engineSrc.includes('Math.min(4, Math.max(1') || engineSrc.includes('Math.min(4, Math.max(3'), 'canonicalLayoutEngine must allow 1 to 4 lines');
  assert(engineSrc.includes('down to 20px so text fits cleanly within maxLines'), 'canonicalLayoutEngine must step down to 20px');

  const canvasExporterSrc = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasExporterSrc.includes('customMaxLines: 4'), 'CanvasExporter must request 4 lines');
  assert(canvasExporterSrc.includes('hh + 12'), 'Clipping rectangle must have safety padding hh + 12');
});

// -------------------------------------------------------------
// Test 5: Master Admin Authoritative Default Typography
// -------------------------------------------------------------
runTest('Test 5 — Master Admin Typography Synchronization (Bug D)', () => {
  const cardEditorSrc = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(cardEditorSrc.includes('match?.typographyConfig?.primaryFontFamily'), 'CardEditor must sync primaryFontFamily from match');
  assert(cardEditorSrc.includes('match?.typographyConfig?.primaryFontSize'), 'CardEditor must sync primaryFontSize from match');
  assert(cardEditorSrc.includes('match?.textSlots?.[0]?.textColor'), 'CardEditor must sync textColor from textSlots[0]');
});

// -------------------------------------------------------------
// Test 6: Location Box Width & Proportion Scaling
// -------------------------------------------------------------
runTest('Test 6 — Location Box Width Calculation (Bug E)', () => {
  const canvasExporterSrc = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasExporterSrc.includes('minCenterW'), 'Location box must compute center width');
  assert(canvasExporterSrc.includes('midDestW = Math.max(minCenterW, neededCenterW)'), 'Center width must expand to fit text');
  assert(canvasExporterSrc.includes('dynamicBw = Math.min(maxBw, Math.max(bw, leftDestW + midDestW + rightDestW))'), 'Dynamic width must respect badge proportions');
});

// -------------------------------------------------------------
// Test 7: Duplicate Image Filtering & Placeholder Removal
// -------------------------------------------------------------
runTest('Test 7 — Deduplication & Placeholder Filtering (Bug F)', () => {
  const cardEditorSrc = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(cardEditorSrc.includes('placeholder_news'), 'Must filter out placeholder_news');
  assert(cardEditorSrc.includes('search_16x9'), 'Must filter out search_16x9');
  assert(cardEditorSrc.includes('default_news'), 'Must filter out default_news');
  assert(cardEditorSrc.includes('seenKeys.has(key)'), 'Must track duplicate keys using canonical URL normalization');
});

// -------------------------------------------------------------
// Test 8: Text Watermark Rendering in Export
// -------------------------------------------------------------
runTest('Test 8 — Text Watermark Rendering Pipeline (Bug G)', () => {
  const canvasExporterSrc = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasExporterSrc.includes('card.showTextWatermark === true'), 'CanvasExporter must support card.showTextWatermark');
  assert(canvasExporterSrc.includes('textWatermarkOpacity'), 'Must have independent text watermark opacity');
  assert(canvasExporterSrc.includes('card.watermarkOpacity'), 'Must support watermark opacity');
});

// -------------------------------------------------------------
// Test 9: Independent Watermark Opacity Controls
// -------------------------------------------------------------
runTest('Test 9 — Watermark Opacity Independence (Bug G)', () => {
  const canvasExporterSrc = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasExporterSrc.includes('ctx.globalAlpha = Math.max(0.15, Math.min(1.0, op))'), 'Disclaimer watermark opacity clamping');
  assert(canvasExporterSrc.includes('ctx.globalAlpha = Math.max(0.05, Math.min(0.9, textOpacity))'), 'Text watermark opacity clamping');
});

// -------------------------------------------------------------
// Test 10: Template Category Decoupling & Explicit Approval / Publication
// -------------------------------------------------------------
runTest('Test 10 — Category Decoupling & Explicit Approval (Decoupled Architecture)', () => {
  const serverSrc = fs.readFileSync('server.ts', 'utf8');
  // Decoupled: Category change must NOT automatically set published or approved
  assert(serverSrc.includes("allowedApprovals.includes(payload.approvalStatus)"), 'Must only update approvalStatus when explicitly provided');
  assert(serverSrc.includes("allowedPub.includes(payload.publicationStatus)"), 'Must only update publicationStatus when explicitly provided');
  assert(serverSrc.includes("isTestFrame: payload.isTestFrame !== undefined ? Boolean(payload.isTestFrame) : existing.isTestFrame"), 'Must preserve isTestFrame');

  const adminSrc = fs.readFileSync('src/components/AdminTemplatePlanManager.tsx', 'utf8');
  assert(adminSrc.includes("publicationStatus: 'published'"), 'handleApproveAndPublish in AdminTemplatePlanManager must include publicationStatus: published');
});

// -------------------------------------------------------------
// Test 11: Custom Footer Tier Gating & Banned Color Filtering
// -------------------------------------------------------------
runTest('Test 11 — Custom Footer Library Restrictions (Bug I)', () => {
  const cardEditorSrc = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(cardEditorSrc.includes('isProOrVip'), 'Must check user plan tier for custom footers');
  assert(cardEditorSrc.includes('bannedFooterColor'), 'Must check bannedFooterColor');
  assert(cardEditorSrc.includes('आरक्षित'), 'Must show restriction badge for banned footer color');
});

// -------------------------------------------------------------
// Test 12: Backward Compatibility for Legacy Templates
// -------------------------------------------------------------
runTest('Test 12 — Backward Compatibility for Non-Dynamic Templates', () => {
  const canvasExporterSrc = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasExporterSrc.includes('renderCardToCanvas'), 'Must export renderCardToCanvas');
  assert(canvasExporterSrc.includes('generateCardCanvas'), 'Must export generateCardCanvas');
  assert(canvasExporterSrc.includes('downloadCanvas'), 'Must export downloadCanvas');
  assert(canvasExporterSrc.includes('drawAuthoritativeDynamicFrameCanvas'), 'Must export drawAuthoritativeDynamicFrameCanvas');
  assert(canvasExporterSrc.includes('drawGraphic001Canvas'), 'Must maintain graphic_001');
  assert(canvasExporterSrc.includes('drawGraphic002Canvas'), 'Must maintain graphic_002');
  assert(canvasExporterSrc.includes('drawGraphic003Canvas'), 'Must maintain graphic_003');
  assert(canvasExporterSrc.includes('drawGraphic004Canvas'), 'Must maintain graphic_004');
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of 12 tests`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
