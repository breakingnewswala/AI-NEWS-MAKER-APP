const fs = require('fs');
const assert = require('assert');
const path = require('path');
const crypto = require('crypto');

console.log('================================================================');
console.log('🧪 RUNNING MASTER ENGINEERING FIXES VERIFICATION SUITE');
console.log('================================================================');

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Section 1: AI Photo Frame Generator & Server Vision API
// -------------------------------------------------------------
runTest('Section 1.1: server.ts /api/dynamic-frames/ai-analyze uses executeGeminiWithKeyPool and modern vision models', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert(server.includes('executeGeminiWithKeyPool'), 'server.ts must use executeGeminiWithKeyPool');
  assert(server.includes('gemini-3.8-flash'), 'server.ts must include gemini-3.8-flash');
  assert(server.includes('gemini-3.5-flash-lite'), 'server.ts must include gemini-3.5-flash-lite');
  assert(!server.includes('gemini-2.0-flash'), 'server.ts must not include deprecated gemini-2.0-flash');
  assert(!server.includes('gemini-1.5-flash'), 'server.ts must not include deprecated gemini-1.5-flash');
  assert(server.includes('generateWithFallbackAndRetry'), 'server.ts must use fallback and retry');
  assert(server.includes('canRetry: true'), 'server.ts must indicate retryable errors on failure');
});

runTest('Section 1.2: DynamicFrameGeneratorModal includes Gemini Vision label, retry button, auto-applies layout and duplicate click guard', () => {
  const modal = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(modal.includes('Gemini विज़न AI से सैंपल लेआउट का विश्लेषण हो रहा है'), 'Modal must show Hindi Gemini Vision status');
  assert(modal.includes('applyAiAnalysisLayout'), 'Modal must auto-apply AI analysis layout for immediate live preview');
  assert(modal.includes('पुनः प्रयास करें') || modal.includes('handleRetry'), 'Modal must offer explicit retry button');
  assert(modal.includes('isAnalyzing'), 'Modal must have duplicate click prevention');
});

// -------------------------------------------------------------
// Section 2: URL to News Command Robustness & Error Mapping
// -------------------------------------------------------------
runTest('Section 2.1: InlineAiNewsTools and NewsCommandModal use 60s timeout with clear Hindi error mapping', () => {
  const inline = fs.readFileSync('src/components/InlineAiNewsTools.tsx', 'utf8');
  const command = fs.readFileSync('src/components/NewsCommandModal.tsx', 'utf8');
  assert(inline.includes('60000'), 'InlineAiNewsTools must use 60s timeout');
  assert(inline.includes('signal is aborted') || inline.includes('timed out'), 'InlineAiNewsTools must map aborted signals');
  assert(command.includes('60000'), 'NewsCommandModal must use 60s timeout');
  assert(command.includes('समय सीमा') || command.includes('टाइमआउट') || command.includes('60'), 'NewsCommandModal must show user-friendly timeout message');
});

// -------------------------------------------------------------
// Section 3: Canvas Exporter Parity, Font Sizing & Spacing
// -------------------------------------------------------------
runTest('Section 3.1: CanvasExporter eliminates double-proxy recursion in loadImageSingle', () => {
  const exporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporter.includes("effectiveSrc.includes('/api/proxy-image?url=')"), 'CanvasExporter must unwrap nested proxy calls');
  assert(exporter.includes('decodeURIComponent'), 'CanvasExporter must decode unnested URL');
});

runTest('Section 3.2: CanvasExporter exact font sizing (no 2.15 multiplier for explicit font size)', () => {
  const exporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporter.includes('isExplicitFontSize'), 'CanvasExporter must check for explicit font size');
  assert(exporter.includes('targetFontSize = isExplicitFontSize'), 'CanvasExporter must respect explicit font size');
});

runTest('Section 3.3: canonicalLayoutEngine normalizes user font size directly without multiplying by 2.15', () => {
  const engine = fs.readFileSync('src/lib/canonicalLayoutEngine.ts', 'utf8');
  assert(engine.includes('normalizedUserFontSize = options.userFontSize ? options.userFontSize : undefined'), 'canonicalLayoutEngine must preserve exact user font size');
});

runTest('Section 3.4: CanvasExporter watermark spacing and rotation', () => {
  const exporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporter.includes('Math.max(340, Math.round(measuredW + 120))'), 'CanvasExporter must prevent watermark repetition overlap');
  assert(exporter.includes('card.watermarkRotation'), 'CanvasExporter must respect watermark rotation');
});

runTest('Section 3.5: CanvasExporter location badge dynamic width and white text', () => {
  const exporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporter.includes('neededCenterW = Math.max(10, measuredTextW + 24)'), 'CanvasExporter must compute dynamic badge width');
  assert(exporter.includes("finalBgColor = bgColor || '#1D4ED8'"), 'CanvasExporter must default to news blue instead of red');
});

runTest('Section 3.6: CardPreview location badge uses white text and dynamic width', () => {
  const preview = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(!preview.includes("df.headerConfig.locationTextColor.toUpperCase() !== '#FFFFFF' ? df.headerConfig.locationTextColor : '#000000'"), 'CardPreview must not coerce white to black');
  assert(preview.includes("backgroundColor: df.headerConfig.locationBgColor || '#1D4ED8'"), 'CardPreview must default to blue instead of red');
  assert(preview.includes("maxWidth: `${df.headerConfig.locationRect?.width ?? 38}%`"), 'CardPreview must allow dynamic width');
});

// -------------------------------------------------------------
// Section 4: CardEditor Highlight Colors, Callouts, My Frames & Favorites
// -------------------------------------------------------------
runTest('Section 4.1: CardEditor displays all HIGHLIGHT_COLOR_PRESETS and removes custom color picker', () => {
  const editor = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(editor.includes('HIGHLIGHT_COLOR_PRESETS.map'), 'CardEditor must map all presets');
  assert(!editor.includes('title="कस्टम रंग चुनें"'), 'CardEditor must not have custom color picker in highlight control');
  assert(!editor.includes('>कस्टम</span>'), 'CardEditor must not have custom color label in highlight control');
});

runTest('Section 4.2: CardEditor auto-synchronizes highlight color and sample photo on frame selection', () => {
  const editor = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(editor.includes('updates.highlightColor = adminHighlight'), 'CardEditor must set frame highlight color');
  assert(editor.includes('frameSamplePhoto'), 'CardEditor must check frame sample photo');
  assert(editor.includes('main: frameSamplePhoto'), 'CardEditor must load sample photo when main is empty');
});

runTest('Section 4.3: CardEditor removes legacy default callout fallback and synchronizes admin callout', () => {
  const editor = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(!editor.includes("🔴 पूरी खबर विवरण नीचे डिस्क्रिप्शन में पढ़ें"), 'CardEditor must not show hardcoded default callout text');
  assert(editor.includes("currentDynamicFrame?.fullStoryCalloutConfig?.text || 'फ़्रेम डिफ़ॉल्ट (कोई कस्टम कॉलआउट नहीं)'"), 'CardEditor must use frame default callout text');
});

runTest('Section 4.4: CardEditor places My Frames first, renames tab to Hindi माई फ्रेम्स, and adds Favorites', () => {
  const editor = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(editor.includes("'Custom Frame'") && editor.includes("...FRAME_CATEGORIES.filter"), 'My Frames must be the first category');
  assert(editor.includes("'My Frames': 'माई फ्रेम्स'"), 'My Frames Hindi label must be माई फ्रेम्स');
  assert(editor.includes('favoriteFrameIds'), 'CardEditor must track favoriteFrameIds');
  assert(editor.includes('toggleFavoriteFrame'), 'CardEditor must provide toggleFavoriteFrame');
  assert(editor.includes('ai_news_user_favorites_'), 'Favorites must persist in localStorage per user');
  assert(editor.includes('List of Favorited Templates from any category'), 'My Frames must display favorited templates');
});

// -------------------------------------------------------------
// Section 5: Global Shortcut Ctrl + Alt + F & Callout Fallback Elimination
// -------------------------------------------------------------
runTest('Section 5.1: App.tsx implements global Ctrl + Alt + F shortcut for safe failsafe recovery without wiping workspace', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  assert(app.includes("e.ctrlKey || e.metaKey") && app.includes("e.altKey") && app.includes("KeyF"), 'App.tsx must register Ctrl + Alt + F shortcut');
  assert(!app.includes("Ctrl + Alt + F (Studio Safe Reset & Failsafe Loader Dismiss)"), 'Shortcut should not do full destructive reset');
  assert(app.includes("setIsAIAnalyzeOpen(false)"), 'Shortcut must dismiss stuck AI modal');
  assert(app.includes("ai_news_studio_refresh_preview"), 'Shortcut must refresh preview');
  assert(app.includes("स्टूडियो रिकवर हो गया"), 'Shortcut must reassure user that data is safe');
});

runTest('Section 5.2: CanvasExporter eliminates hardcoded fallback callout and respects admin/user configuration', () => {
  const exporter = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(!exporter.includes("'पूरी खबर नीचे विवरण में पढ़ें'"), 'CanvasExporter must not force hardcoded fallback callout');
  assert(exporter.includes('card.calloutTag') && exporter.includes('fullStoryCalloutConfig.text'), 'CanvasExporter must support admin and user callouts');
});

// -------------------------------------------------------------
// Section 6: Parity & Production Invariants
// -------------------------------------------------------------
runTest('Section 6.1: 100% SHA256 mirror parity between root and web_studio/', () => {
  const files = [
    'src/App.tsx',
    'src/components/CardEditor.tsx',
    'src/components/CardPreview.tsx',
    'src/components/DynamicFrameGeneratorModal.tsx',
    'src/components/InlineAiNewsTools.tsx',
    'src/components/NewsCommandModal.tsx',
    'src/data/presets.ts',
    'src/lib/CanvasExporter.ts',
    'src/lib/canonicalLayoutEngine.ts',
    'src/lib/clientScraper.ts',
    'server.ts'
  ];

  for (const f of files) {
    const rootPath = f;
    const studioPath = path.join('web_studio', f);
    assert(fs.existsSync(rootPath), `Root file ${rootPath} must exist`);
    assert(fs.existsSync(studioPath), `Studio file ${studioPath} must exist`);
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(rootPath)).digest('hex');
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(studioPath)).digest('hex');
    assert.strictEqual(h1, h2, `SHA256 mismatch for ${f}`);
  }
});

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
console.log('================================================================');

if (passed !== total) {
  process.exit(1);
}
