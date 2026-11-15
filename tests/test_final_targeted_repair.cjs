/**
 * Test Suite: Final Targeted Repair Verification
 * Tests the 3 specific fixes:
 * 1. Gemini AI Frame Generator Vision Models (gemini-3.8-flash, gemini-3.5-flash-lite, no legacy models, live preview auto-apply)
 * 2. Ctrl + Alt + F non-destructive recovery (preserves headline, photos, URL, drafts, settings)
 * 3. Callout rendering (Master Admin Callout, User Callout, and No Callout without hardcoded fallback)
 */

const fs = require('fs');
const assert = require('assert');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 RUNNING FINAL TARGETED REPAIR VERIFICATION SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// Test 1: Gemini AI Frame Generator Vision Models & Auto-Apply
// -------------------------------------------------------------
runTest('Issue 1.1: server.ts uses official modern Gemini Vision models (gemini-3.8-flash, gemini-3.5-flash-lite)', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert(server.includes('gemini-3.8-flash'), 'server.ts must contain gemini-3.8-flash');
  assert(server.includes('gemini-3.5-flash-lite'), 'server.ts must contain gemini-3.5-flash-lite');
  assert(!server.includes('gemini-2.0-flash'), 'server.ts must not contain deprecated gemini-2.0-flash');
  assert(!server.includes('gemini-1.5-flash'), 'server.ts must not contain deprecated gemini-1.5-flash');
  assert(!server.includes('gemini-2.5-flash'), 'server.ts must not contain legacy gemini-2.5-flash');
  assert(server.includes('executeGeminiWithKeyPool'), 'server.ts must preserve API key pool');
  assert(server.includes('generateWithFallbackAndRetry'), 'server.ts must preserve retry mechanism');
});

runTest('Issue 1.2: DynamicFrameGeneratorModal auto-applies layout for immediate live preview upon successful analysis', () => {
  const modal = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(modal.includes('applyAiAnalysisLayout(res.result)'), 'Modal must call applyAiAnalysisLayout immediately on success');
  assert(modal.includes('setAnalysisStatusText'), 'Modal must report real error/status');
  assert(modal.includes('isAnalyzing'), 'Modal must guard against duplicate submissions');
});

// -------------------------------------------------------------
// Test 2: Ctrl + Alt + F Safe Workspace Recovery (Non-Destructive)
// -------------------------------------------------------------
runTest('Issue 2.1: Ctrl + Alt + F safely recovers stuck studio without wiping headline, photos, or drafts', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert(app.includes('e.altKey && (e.key === \'f\' || e.key === \'F\' || e.code === \'KeyF\')'), 'Shortcut registered in App.tsx');
  assert(!app.includes('resetPhotoNewsStudioWorkspace({ skipConfirm: true })'), 'Shortcut must NOT call resetPhotoNewsStudioWorkspace');
  assert(app.includes('setIsAIAnalyzeOpen(false)'), 'Shortcut dismisses stuck AI modal');
  assert(app.includes('setDownloading(false)'), 'Shortcut resets downloading state');
  assert(app.includes('ai_news_studio_refresh_preview'), 'Shortcut refreshes canvas preview');
  assert(app.includes('आपका डेटा व सेटिंग्स सुरक्षित हैं'), 'Toast reassures user that content is safe');
});

runTest('Issue 2.2: Preview Refresh button (handleRefreshPreview) does not wipe card workspace', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert(!app.includes('const handleRefreshPreview = () => resetPhotoNewsStudioWorkspace'), 'handleRefreshPreview must not call resetPhotoNewsStudioWorkspace');
  assert(app.includes('const handleRefreshPreview = () => {'), 'handleRefreshPreview safely defined');
});

// -------------------------------------------------------------
// Test 3: Elimination of Hardcoded Callout ('पूरी खबर नीचे विवरण में पढ़ें')
// -------------------------------------------------------------
runTest('Issue 3.1: CanvasExporter has no hardcoded default callout fallback', () => {
  const exporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(!exporter.includes('पूरी खबर नीचे विवरण में पढ़ें'), 'CanvasExporter must not contain पूरी खबर नीचे विवरण में पढ़ें');
  assert(!exporter.includes('const cleanText = text.replace(\'🔴\', \'\').trim() || \'पूरी खबर डिस्क्रिप्शन में\';'), 'drawCalloutTag must not force default callout');
});

runTest('Issue 3.2: CanvasExporter correctly evaluates Master Admin, User, and No Callout', () => {
  const exporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporter.includes('const calloutText = (card.calloutTag && card.calloutTag.trim()) || (df.fullStoryCalloutConfig.text && df.fullStoryCalloutConfig.text.trim()) || \'\';'), 'Evaluates user tag first, then admin template text, then empty string');
  assert(exporter.includes('if (calloutAsset || calloutText)'), 'Only renders callout container if asset or text is explicitly configured');
});

runTest('Issue 3.3: CardPreview correctly evaluates Master Admin, User, and No Callout', () => {
  const preview = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(preview.includes('const effectiveCalloutText = (card.calloutTag && card.calloutTag.trim()) || (df.fullStoryCalloutConfig.text && df.fullStoryCalloutConfig.text.trim()) || \'\';'), 'CardPreview checks user and admin callout text');
  assert(preview.includes('if (!calloutUrl && !effectiveCalloutText) return null;'), 'CardPreview returns null if no callout configured');
});

// -------------------------------------------------------------
// Test 4: Mirror Parity and Build Invariants
// -------------------------------------------------------------
runTest('Issue 4.1: Root and web_studio/ core files are identical', () => {
  const crypto = require('crypto');
  const files = [
    'server.ts',
    'src/App.tsx',
    'src/components/DynamicFrameGeneratorModal.tsx',
    'src/components/CardPreview.tsx',
    'src/lib/CanvasExporter.ts',
    'src/lib/dynamicFramesManager.ts',
    'src/components/SocialMediaStoryModal.tsx',
  ];
  for (const f of files) {
    const rootBuf = fs.readFileSync(f);
    const webBuf = fs.readFileSync(`web_studio/${f}`);
    const rootHash = crypto.createHash('sha256').update(rootBuf).digest('hex');
    const webHash = crypto.createHash('sha256').update(webBuf).digest('hex');
    assert.strictEqual(rootHash, webHash, `SHA256 mismatch for ${f}`);
  }
});

console.log(`\n================================================================`);
console.log(`RESULTS: ${passed} / ${passed + failed} TESTS PASSED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
