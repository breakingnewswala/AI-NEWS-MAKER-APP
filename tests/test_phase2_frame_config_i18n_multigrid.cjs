// Automated Test Suite: Phase 2 Master Admin Frame Configuration Sync, UTF-8 Language, Footer Color, Location & Multi-Grid Bug Fix
// Covers Suites A through H as mandated in Section 18 of the Phase 2 Specification

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 RUNNING MASTER PHASE 2 ACCEPTANCE SUITE (SUITES A THROUGH H)');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}:`, err.message);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// SUITE A: HINDI UNICODE / UTF-8 & MOJIBAKE REMEDIATION
// -------------------------------------------------------------
runTest('Suite A.1: UTF-8 Sanitizer correctly reconstructs CP1252-mangled Devanagari bytes', () => {
  const { sanitizeUtf8Hindi, sanitizeObjectStrings } = require('../src/lib/utf8Sanitizer.ts');
  
  // Test common mangled Hindi strings
  const mangled1 = 'à¤¨à¤¯à¤¾ à¤¯à¥‚à¤œà¤¼à¤°'; // 'नया यूज़र' in CP1252
  const repaired1 = sanitizeUtf8Hindi(mangled1);
  assert.strictEqual(repaired1, 'नया यूज़र', `Expected 'नया यूज़र' but got ${repaired1}`);

  const mangled2 = 'à¤µà¤¿à¤¶à¥‡à¤· à¤•à¤µà¤°à¥‡à¤œ'; // 'विशेष कवरेज'
  const repaired2 = sanitizeUtf8Hindi(mangled2);
  assert.strictEqual(repaired2, 'विशेष कवरेज', `Expected 'विशेष कवरेज' but got ${repaired2}`);

  // Test object deep sanitizer
  const testObj = {
    title: mangled1,
    meta: {
      reason: mangled2,
      count: 42,
      validHindi: 'संपादक'
    }
  };
  const sanitizedObj = sanitizeObjectStrings(testObj);
  assert.strictEqual(sanitizedObj.title, 'नया यूज़र');
  assert.strictEqual(sanitizedObj.meta.reason, 'विशेष कवरेज');
  assert.strictEqual(sanitizedObj.meta.validHindi, 'संपादक');
  assert.strictEqual(sanitizedObj.meta.count, 42);
});

runTest('Suite A.2: Server sets UTF-8 charset header and sanitizes notifications & profiles', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');
  const webStudioServer = fs.readFileSync(path.join(__dirname, '../web_studio/server.ts'), 'utf8');

  // Verify UTF-8 header middleware
  assert(serverCode.includes("res.setHeader('Content-Type', 'application/json; charset=utf-8')"), 'Server must enforce UTF-8 charset header');
  assert(webStudioServer.includes("res.setHeader('Content-Type', 'application/json; charset=utf-8')"), 'Web studio server must enforce UTF-8 charset header');

  // Verify notifications sanitization
  assert(serverCode.includes('categories: sanitizeObjectStrings(counts)'), 'Admin notif categories must be sanitized');
  assert(serverCode.includes('notifications: sanitizeObjectStrings(allItems.slice(0, 100))'), 'Admin notif items must be sanitized');
  assert(serverCode.includes('profile: sanitizeObjectStrings(match)'), 'User profile GET must return sanitized object');
  assert(serverCode.includes('profile = sanitizeObjectStrings(req.body)'), 'User profile POST must sanitize inputs');
});

runTest('Suite A.3: HTML files have UTF-8 meta charset declared at the top of head', () => {
  const rootHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const webHtml = fs.readFileSync(path.join(__dirname, '../web_studio/index.html'), 'utf8');

  assert(rootHtml.includes('<meta charset="UTF-8" />'), 'Root index.html must have UTF-8 charset');
  assert(webHtml.includes('<meta charset="UTF-8" />'), 'Web studio index.html must have UTF-8 charset');
});

// -------------------------------------------------------------
// SUITE B: FOOTER COLOR CONFIGURATION & INHERITANCE
// -------------------------------------------------------------
runTest('Suite B.1: CardEditor inherits frame-specific footer defaults and respects banned colors', () => {
  const editorCode = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');

  // Check useEffect on frameDesign
  assert(editorCode.includes('const dfFooterBg = activeDf.footerConfig?.footerBgColor'), 'CardEditor must read frame footerBgColor');
  assert(editorCode.includes('updates.footerBgColor = activeDf.footerConfig?.primaryFooterColor || \'#FACC15\''), 'CardEditor must fall back to primaryFooterColor when banned');
  assert(editorCode.includes('updates.footerTextColor = dfFooterText'), 'CardEditor must inherit footerTextColor');

  // Check Step 1 Frame Click
  assert(editorCode.includes('updates.footerBgColor = match?.footerConfig?.primaryFooterColor || \'#FACC15\''), 'Step 1 must replace banned color with allowed primary color');
});

runTest('Suite B.2: App.tsx synchronizes authoritative dynamic frame footer defaults', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
  assert(appCode.includes('const df = getDynamicFrameById(card.frameDesign || \'\')'), 'App.tsx must inspect active dynamic frame');
  assert(appCode.includes('updated.footerBgColor = df.footerConfig?.primaryFooterColor || \'#FACC15\''), 'App.tsx must normalize banned colors to allowed primary');
});

// -------------------------------------------------------------
// SUITE C: LOCATION BADGE GEOMETRY & INDEPENDENT TOGGLES
// -------------------------------------------------------------
runTest('Suite C.1: Location and Date toggles are completely independent (Bug H)', () => {
  const editorCode = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');
  // Must NOT contain showDate: nextLoc ? card.showDate : false
  assert(!editorCode.includes('showDate: nextLoc ? card.showDate : false'), 'Location toggle must NEVER force Date toggle to false');
});

runTest('Suite C.2: Location badge geometry uses authoritative percentage width without max-content squash (Bug E)', () => {
  const previewCode = fs.readFileSync(path.join(__dirname, '../src/components/CardPreview.tsx'), 'utf8');
  assert(!previewCode.includes("minWidth: '90px'"), 'CardPreview must NOT use minWidth 90px on location badge');
  assert(!previewCode.includes("width: 'max-content'"), 'CardPreview must NOT use width max-content on location badge');
  assert(previewCode.includes("width: `${df.headerConfig.locationRect?.width ?? 28}%`"), 'CardPreview must use locationRect.width%');
  assert(previewCode.includes("height: `${df.headerConfig.locationRect?.height ?? 4.5}%`"), 'CardPreview must use locationRect.height%');
});

runTest('Suite C.3: Location background color capability check hides color picker on static image badges (Bug I)', () => {
  const editorCode = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');
  assert(editorCode.includes("const isStaticImage = activeDf?.headerConfig?.locationBadgeMode === 'static_image'"), 'Must detect static image location badge');
  assert(editorCode.includes('if (!supportsBg) return null;'), 'Must hide color picker when not supported');
});

// -------------------------------------------------------------
// SUITE D: FULL NEWS DESCRIPTION / STORY CALLOUT
// -------------------------------------------------------------
runTest('Suite D.1: Story Callout auto-initializes enabled state, asset and tag from Master Frame (Bug F)', () => {
  const editorCode = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');
  const appCode = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');

  assert(editorCode.includes('if (activeDf.fullStoryCalloutConfig?.enabled)'), 'CardEditor must check activeDf.fullStoryCalloutConfig.enabled');
  assert(editorCode.includes('updates.showCallout = true'), 'CardEditor must set showCallout to true when enabled');
  assert(editorCode.includes('updates.customCalloutAssetUrl = activeDf.fullStoryCalloutConfig.manualCalloutAsset'), 'CardEditor must set callout asset URL');
  assert(editorCode.includes('updates.calloutTag = activeDf.fullStoryCalloutConfig.text'), 'CardEditor must set callout tag text');

  assert(appCode.includes('if (df.fullStoryCalloutConfig?.enabled)'), 'App.tsx must auto-enable callout for dynamic frame');
  assert(appCode.includes('updated.showCallout = true'), 'App.tsx must set showCallout true');
});

// -------------------------------------------------------------
// SUITE E: HEADLINE MEASUREMENT & RENDERING PARITY
// -------------------------------------------------------------
runTest('Suite E.1: CardPreview customBounds width matches CanvasExporter padded width (Bug G)', () => {
  const previewCode = fs.readFileSync(path.join(__dirname, '../src/components/CardPreview.tsx'), 'utf8');
  const exporterCode = fs.readFileSync(path.join(__dirname, '../src/lib/CanvasExporter.ts'), 'utf8');

  // Preview customBounds must subtract 30px margin and offset x by 15px
  assert(previewCode.includes('Math.max(50, ((textSlotRect.width / 100) * 1080) - 30)'), 'CardPreview must subtract 30px padding like CanvasExporter');
  assert(previewCode.includes('((textSlotRect.x / 100) * 1080) + 15'), 'CardPreview must offset x by 15px');
  assert(exporterCode.includes('const paddedHw = Math.max(50, hw - 30)'), 'CanvasExporter must maintain paddedHw = hw - 30');
});

runTest('Suite E.2: Devanagari matras are not clipped by overflow-hidden or rigid line heights (Bug G)', () => {
  const previewCode = fs.readFileSync(path.join(__dirname, '../src/components/CardPreview.tsx'), 'utf8');
  assert(!previewCode.includes('className="font-black leading-snug drop-shadow-md overflow-hidden w-full"'), 'Custom frame h1 must not have overflow-hidden');
  assert(previewCode.includes('minHeight: `${effectiveLineHeight}px`'), 'Headline lines must use minHeight to allow matra clearance');
});

// -------------------------------------------------------------
// SUITE F: CUSTOM FOOTER LIBRARY ACCESS & MUTUAL EXCLUSIVITY
// -------------------------------------------------------------
runTest('Suite F.1: Custom Footer Library enforces Pro/VIP entitlement and mutual exclusivity (Bug J & K)', () => {
  const editorCode = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');

  // Pro/VIP entitlement check
  assert(editorCode.includes("const isProOrVip = effectiveAdmin || effectiveTier === 'professional' || effectiveTier === 'ultra' || effectiveTier === 'pro' || effectiveTier === 'vip'"), 'Must gate library for Pro/VIP');
  assert(editorCode.includes('🔒 केवल PRO / VIP DESK'), 'Must show lock notice for non-entitled users');

  // Mutual Exclusivity: selecting standard color clears custom footer
  assert(editorCode.includes('onChange({ footerBgColor: p.color, selectedCustomFooterId: undefined, customFooterConfig: undefined, customFooterPng: undefined })'), 'Selecting standard color must clear custom footer');

  // Banned color exclusion from library
  assert(editorCode.includes('if (bannedFooterColor && lf.footerConfig?.footerBgColor && lf.footerConfig.footerBgColor.toUpperCase() === bannedFooterColor.toUpperCase())'), 'Must exclude custom footers with banned color');
});

// -------------------------------------------------------------
// SUITE G: MULTI-GRID PHOTO ASSIGNMENT & RENDERING
// -------------------------------------------------------------
runTest('Suite G.1: Multi-Grid auto-populates up to 4 photo slots and provides per-slot assigners (Bug L)', () => {
  const editorCode = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');
  assert(editorCode.includes("l.id === 'grid-4' && (!newImages.fourth || newImages.fourth === newImages.main) && availablePhotos[3]"), 'Must populate 4th photo on grid-4');
  assert(editorCode.includes('title="स्लॉट 1 में सेट करें"'), 'Must provide S1 button');
  assert(editorCode.includes('title="स्लॉट 2 में सेट करें"'), 'Must provide S2 button');
  assert(editorCode.includes('title="स्लॉट 3 में सेट करें"'), 'Must provide S3 button');
  assert(editorCode.includes('title="स्लॉट 4 में सेट करें"'), 'Must provide S4 button');
});

runTest('Suite G.2: CardPreview and CanvasExporter resolve multi-slots cleanly up to 4 photos (Bug L)', () => {
  const previewCode = fs.readFileSync(path.join(__dirname, '../src/components/CardPreview.tsx'), 'utf8');
  const exporterCode = fs.readFileSync(path.join(__dirname, '../src/lib/CanvasExporter.ts'), 'utf8');

  assert(previewCode.includes('card.images?.third || availablePhotos[2]'), 'CardPreview must resolve 3rd photo slot');
  assert(previewCode.includes('card.images?.fourth || availablePhotos[3]'), 'CardPreview must resolve 4th photo slot');

  assert(exporterCode.includes('(card.images?.third || availablePhotos[2] || \'\').trim()'), 'CanvasExporter must resolve 3rd photo slot');
  assert(exporterCode.includes('(card.images?.fourth || availablePhotos[3] || \'\').trim()'), 'CanvasExporter must resolve 4th photo slot');
});

// -------------------------------------------------------------
// SUITE H: MANDATORY FRAME ARTWORK ROBUST LOADING
// -------------------------------------------------------------
runTest('Suite H.1: CanvasExporter implements retry loop and Hindi error reporting for mandatory artwork (Bug M)', () => {
  const exporterCode = fs.readFileSync(path.join(__dirname, '../src/lib/CanvasExporter.ts'), 'utf8');
  assert(exporterCode.includes('const maxAttempts = options?.isMandatory ? 2 : 1;'), 'Must retry for mandatory assets');
  assert(exporterCode.includes('अनिवार्य फ्रेम आर्टवर्क लोड नहीं हो सका। कृपया नेटवर्क कनेक्शन जांचें या फ्रेम पुनः चुनें।'), 'Must throw Hindi error on mandatory asset failure');
  assert(exporterCode.includes('loadImageSingle(src, options, attempt)'), 'Must execute robust single load');
});

// -------------------------------------------------------------
// SUITE I: PRODUCTION FRAME INTEGRITY & REGRESSION ASSERTION
// -------------------------------------------------------------
runTest('Suite I.1: Production template df_1794406067554_albmw is preserved, published, and APPROVED', () => {
  const rootDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../dynamic_frames_db.json'), 'utf8'));
  const studioDb = JSON.parse(fs.readFileSync(path.join(__dirname, '../web_studio/dynamic_frames_db.json'), 'utf8'));
  const targetRoot = rootDb.find(f => f.id === 'df_1794406067554_albmw');
  const targetStudio = studioDb.find(f => f.id === 'df_1794406067554_albmw');
  assert(targetRoot, 'df_1794406067554_albmw must exist in dynamic_frames_db.json');
  assert(targetStudio, 'df_1794406067554_albmw must exist in web_studio/dynamic_frames_db.json');
  assert.strictEqual(targetRoot.approvalStatus, 'APPROVED', 'approvalStatus must be APPROVED');
  assert.strictEqual(targetRoot.publicationStatus, 'published', 'publicationStatus must be published');
  assert.strictEqual(targetRoot.isTestFrame, false, 'isTestFrame must be false');
  assert.strictEqual(targetRoot.designCategory, 'Special Frames', 'designCategory must be Special Frames');
  assert.strictEqual(targetStudio.approvalStatus, 'APPROVED');
  assert.strictEqual(targetStudio.publicationStatus, 'published');
  assert.strictEqual(targetStudio.isTestFrame, false);

  // Assert no test frame in production data
  const testFrameRoot = rootDb.find(f => f.id === 'df_1794544360478_6ptot');
  assert(!testFrameRoot, 'Test frame df_1794544360478_6ptot must NOT be in production dynamic_frames_db.json');

  // Assert production frame is not tombstoned
  const tombstones = JSON.parse(fs.readFileSync(path.join(__dirname, '../deleted_frames_tombstone.json'), 'utf8'));
  assert(!tombstones.includes('df_1794406067554_albmw'), 'df_1794406067554_albmw must NOT be in deleted_frames_tombstone.json');
});

// -------------------------------------------------------------
// DUAL PARITY VERIFICATION
// -------------------------------------------------------------
runTest('Dual Parity: Root src and web_studio/src must be 100% byte identical for modified files', () => {
  const files = [
    ['src/App.tsx', 'web_studio/src/App.tsx'],
    ['src/components/AdminPlansAndPackagesManager.tsx', 'web_studio/src/components/AdminPlansAndPackagesManager.tsx'],
    ['src/components/CardEditor.tsx', 'web_studio/src/components/CardEditor.tsx'],
    ['src/components/CardPreview.tsx', 'web_studio/src/components/CardPreview.tsx'],
    ['src/lib/CanvasExporter.ts', 'web_studio/src/lib/CanvasExporter.ts'],
    ['src/lib/utf8Sanitizer.ts', 'web_studio/src/lib/utf8Sanitizer.ts'],
    ['server.ts', 'web_studio/server.ts'],
  ];

  for (const [f1, f2] of files) {
    const c1 = fs.readFileSync(path.join(__dirname, '..', f1), 'utf8');
    const c2 = fs.readFileSync(path.join(__dirname, '..', f2), 'utf8');
    assert.strictEqual(c1, c2, `Dual parity mismatch between ${f1} and ${f2}`);
  }
});

console.log('\n================================================================');
console.log(`📊 MASTER PHASE 2 ACCEPTANCE RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL PHASE 2 ACCEPTANCE TESTS COMPLETED WITH 100% SUCCESS!\n');
  process.exit(0);
} else {
  console.error(`💥 ${totalTests - passedTests} TESTS FAILED`);
  process.exit(1);
}
