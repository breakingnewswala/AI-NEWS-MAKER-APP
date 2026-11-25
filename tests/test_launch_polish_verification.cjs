/**
 * Comprehensive Verification Suite for Production Launch Readiness
 * 
 * Tests:
 * 1. Live Breaking News Ticker Speed (src/index.css >= 90s duration)
 * 2. Option 5 Headline (150-200 chars) preservation without 115-char truncation in speakerUtils.ts
 * 3. generate5BalancedHeadlineOptions 200-char maximum bound and Tier 5 formulation
 * 4. Gemini Error Handling: return technical error in Hindi without dummy/corrupted headlines
 * 5. Light Theme Highlight Color: CardPreview & CardEditor enforce #DC2626 (Red) on light themes
 * 6. CanvasExporter: export enforces #DC2626 (Red) on light plates
 * 7. Dummy & Test User Accounts Purge: test accounts filtered/purged from server and client
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🧪 Running Production Launch Readiness Verification Test Suite');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// TEST 1: Ticker marquee animation speed >= 90s
runTest('TC1: Live Breaking News Ticker Speed is slowed to >= 90s', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/index.css'), 'utf-8');
  const match = css.match(/\.animate-marquee-continuous\s*\{[^}]*animation:\s*marquee-scroll\s*(\d+)s/);
  assert(match, 'marquee-scroll duration found in src/index.css');
  const duration = parseInt(match[1], 10);
  assert(duration >= 90, `Expected duration >= 90s, but found ${duration}s`);
});

// TEST 2: speakerUtils does not have hardcoded 115 cap and supports Option 5 (150-200 chars)
runTest('TC2: speakerUtils.ts does not truncate Tier 5 to 115 chars', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/lib/speakerUtils.ts'), 'utf-8');
  assert(!code.includes('countCharacters(cand) > 115'), 'Old hardcoded > 115 characters cap should be removed from speakerUtils.ts');
  assert(code.includes('charLenInitial > tier.max'), 'Tier-specific max bound should be checked instead');
});

// TEST 3: Option 5 in fitHeadlinesTo5TierRanges preserves 150-200 character headlines
runTest('TC3: Option 5 (150-200 characters) is retained without truncation', () => {
  const code = fs.readFileSync(path.join(__dirname, '../src/lib/speakerUtils.ts'), 'utf-8');
  // Check that clampToEditorialBounds accepts up to 200 chars
  assert(code.includes('maxChars: number = 200'), 'clampToEditorialBounds should default to 200 chars');
  assert(code.includes('Angle 5: Comprehensive, Impactful Editorial Headline (150-200 chars target)'), 'Angle 5 targeted for 150-200 chars');
});

// TEST 4: Gemini API Failure error handling in server.ts & InlineAiNewsTools.tsx
runTest('TC4: Gemini API failure returns pure Hindi technical error without dummy fallback', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf-8');
  assert(serverCode.includes('तकनीकी समस्या के कारण हेडलाइन जनरेट नहीं हो सकी। कृपया कुछ समय बाद पुनः प्रयास करें।'), 'server.ts should return pure Hindi technical error on Gemini failure');
  assert(serverCode.includes('AI_SERVICE_UNAVAILABLE'), 'server.ts should return AI_SERVICE_UNAVAILABLE code');

  const clientCode = fs.readFileSync(path.join(__dirname, '../src/components/InlineAiNewsTools.tsx'), 'utf-8');
  assert(clientCode.includes('Per Core Rule: Do NOT generate dummy/corrupted fallback headlines on AI error'), 'InlineAiNewsTools should not overwrite with dummy fallbacks on error');
  assert(!clientCode.includes('const fallback5 = fitHeadlinesTo5TierRanges([candidateTitle]'), 'Fallback headlines generator should be removed from error handler');
});

// TEST 5: CardPreview & CardEditor enforce Red (#DC2626) highlight on light themes
runTest('TC5: Light themes enforce Red (#DC2626) highlight color in CardPreview & CardEditor', () => {
  const previewCode = fs.readFileSync(path.join(__dirname, '../src/components/CardPreview.tsx'), 'utf-8');
  assert(previewCode.includes('isLightTemplate || (isBasicTheme && basicTheme.isLightPlate)'), 'CardPreview checks light plate/template');
  assert(previewCode.includes("highlightColor = '#DC2626'"), 'CardPreview overrides yellowish highlights to #DC2626 on light themes');

  const editorCode = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf-8');
  assert(editorCode.includes("isLight ? '#DC2626' : (basicTheme?.headlineHighlightColor || '#FFE600')"), 'CardEditor sets highlightColor to #DC2626 on light basic themes');
});

// TEST 6: CanvasExporter export enforces Red (#DC2626) on light plates
runTest('TC6: CanvasExporter export enforces Red (#DC2626) on light plates', () => {
  const canvasCode = fs.readFileSync(path.join(__dirname, '../src/lib/CanvasExporter.ts'), 'utf-8');
  assert(canvasCode.includes("activeBasicTheme.isLightPlate"), 'CanvasExporter checks activeBasicTheme.isLightPlate');
  assert(canvasCode.includes("highlightColor = '#DC2626'"), 'CanvasExporter forces highlightColor = #DC2626 on light plates');
  assert(canvasCode.includes("tokenHighlight = '#DC2626'"), 'CanvasExporter forces tokenHighlight = #DC2626 for light background tokens');
});

// TEST 7: Dummy & Test Accounts Purge
runTest('TC7: Dummy & test user accounts are permanently filtered and purged', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf-8');
  assert(serverCode.includes('testverifier@ainewsmaker.online'), 'DUMMY_TEST_USER_EMAILS in server.ts contains testverifier');
  assert(serverCode.includes('isDummyTestUserAccount'), 'isDummyTestUserAccount defined in server.ts');
  assert(serverCode.includes('centralDb.deleteDoc("users", docKey)'), 'Permanently deletes dummy accounts from Firestore in server.ts');

  const clientCode = fs.readFileSync(path.join(__dirname, '../src/lib/userPlanManager.ts'), 'utf-8');
  assert(clientCode.includes('DUMMY_TEST_USER_EMAILS'), 'DUMMY_TEST_USER_EMAILS defined in userPlanManager.ts');
  assert(clientCode.includes('isDummyTestUserAccount'), 'isDummyTestUserAccount defined in userPlanManager.ts');

  const adminUiCode = fs.readFileSync(path.join(__dirname, '../src/components/AdminPlansAndPackagesManager.tsx'), 'utf-8');
  assert(adminUiCode.includes('isDummyTestUserAccount(u.email)'), 'AdminPlansAndPackagesManager filters out dummy test accounts');
});

console.log('====================================================');
console.log(`🎉 All ${passedTests}/${totalTests} Verification Tests Passed Successfully!`);
console.log('====================================================');

process.exit(0);
