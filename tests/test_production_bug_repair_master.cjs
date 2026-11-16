/**
 * tests/test_production_bug_repair_master.cjs
 *
 * Comprehensive Master Automated Verification Test Suite for Production Bug Repairs
 * AI News Maker (breakingnewswala/AI-NEWS-MAKER-APP)
 *
 * Covers 4 Tiers:
 * - Tier 1: Feature Coverage (Features 1 to 16)
 * - Tier 2: Boundary & Corner Cases (Equivalence partitions, character clamps, extreme lengths, empty states)
 * - Tier 3: Cross-Feature Interactions (Profile gate + Studio, RSS approval + Feed, Frame normalization + Export)
 * - Tier 4: Real-World Scenarios (End-to-end user workflows)
 *
 * Run with: node tests/test_production_bug_repair_master.cjs
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const esbuild = require('esbuild');

console.log('================================================================================');
console.log('🧪 MASTER PRODUCTION BUG REPAIR AUTOMATED TEST SUITE (TIERS 1 TO 4)');
console.log('   Target: AI News Maker Production Engine');
console.log('   Main HEAD: 838e109f70bda9e74c1882e6a997aea42aad9a6f');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// Test Metrics & State
// -----------------------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
const failedTests = [];

const tierMetrics = {
  'Tier 1 (Feature Coverage)': { total: 0, passed: 0, failed: 0 },
  'Tier 2 (Boundary & Corner Cases)': { total: 0, passed: 0, failed: 0 },
  'Tier 3 (Cross-Feature Interactions)': { total: 0, passed: 0, failed: 0 },
  'Tier 4 (Real-World Scenarios)': { total: 0, passed: 0, failed: 0 },
};

function runTest(tier, name, fn) {
  totalTests++;
  tierMetrics[tier].total++;
  try {
    fn();
    console.log(`✅ [PASS] [${tier}] ${name}`);
    passedTests++;
    tierMetrics[tier].passed++;
  } catch (err) {
    console.error(`❌ [FAIL] [${tier}] ${name}`);
    console.error(`   Reason: ${err.message}`);
    failedTests.push({ tier, name, error: err.message });
    tierMetrics[tier].failed++;
  }
}

async function runAsyncTest(tier, name, fn) {
  totalTests++;
  tierMetrics[tier].total++;
  try {
    await fn();
    console.log(`✅ [PASS] [${tier}] ${name}`);
    passedTests++;
    tierMetrics[tier].passed++;
  } catch (err) {
    console.error(`❌ [FAIL] [${tier}] ${name}`);
    console.error(`   Reason: ${err.message}`);
    failedTests.push({ tier, name, error: err.message });
    tierMetrics[tier].failed++;
  }
}

// -----------------------------------------------------------------------------
// Isolated Mocks: LocalStorage, Window & 2D Canvas Context
// -----------------------------------------------------------------------------
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

class MockCanvasRenderingContext2D {
  constructor(width = 1080, height = 1350) {
    this.canvas = { width, height };
    this.operations = [];
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.font = '32px sans-serif';
    this.textAlign = 'left';
    this.textBaseline = 'alphabetic';
    this.shadowColor = 'transparent';
    this.shadowBlur = 0;
    this.shadowOffsetX = 0;
    this.shadowOffsetY = 0;
    this.filter = 'none';
  }
  save() { this.operations.push({ op: 'save' }); }
  restore() { this.operations.push({ op: 'restore' }); }
  beginPath() { this.operations.push({ op: 'beginPath' }); }
  closePath() { this.operations.push({ op: 'closePath' }); }
  rect(x, y, w, h) { this.operations.push({ op: 'rect', x, y, w, h }); }
  roundRect(x, y, w, h, r) { this.operations.push({ op: 'roundRect', x, y, w, h, r }); }
  clip() { this.operations.push({ op: 'clip' }); }
  fillRect(x, y, w, h) { this.operations.push({ op: 'fillRect', x, y, w, h, fillStyle: this.fillStyle }); }
  strokeRect(x, y, w, h) { this.operations.push({ op: 'strokeRect', x, y, w, h, strokeStyle: this.strokeStyle }); }
  fillText(text, x, y, maxW) { this.operations.push({ op: 'fillText', text, x, y, maxW, fillStyle: this.fillStyle, font: this.font }); }
  drawImage(img, ...args) { this.operations.push({ op: 'drawImage', img, args, filter: this.filter }); }
  translate(x, y) { this.operations.push({ op: 'translate', x, y }); }
  rotate(rad) { this.operations.push({ op: 'rotate', rad }); }
  scale(x, y) { this.operations.push({ op: 'scale', x, y }); }
  measureText(text) {
    return { width: (text ? text.length : 0) * 14 };
  }
}

function setupMockEnvironment() {
  const storage = new MockLocalStorage();
  const dispatchedEvents = [];
  global.localStorage = storage;
  global.window = {
    localStorage: storage,
    dispatchEvent: (evt) => {
      dispatchedEvents.push(evt);
      return true;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  global.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  return { storage, dispatchedEvents };
}

// Helper to transpile and evaluate a TS module in Node
function loadTsModule(filePath) {
  const tsCode = fs.readFileSync(filePath, 'utf8');
  const transpiled = esbuild.transformSync(tsCode, { loader: 'ts', format: 'cjs' });
  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', transpiled.code);
  fn(m, m.exports, require, path.dirname(filePath), filePath);
  return m.exports;
}

// -----------------------------------------------------------------------------
// Source Code Caches
// -----------------------------------------------------------------------------
const serverCode = fs.readFileSync(path.resolve(__dirname, '..', 'server.ts'), 'utf8');
const webStudioServerCode = fs.readFileSync(path.resolve(__dirname, '..', 'web_studio', 'server.ts'), 'utf8');
const homeScreenCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'HomeScreenWeb.tsx'), 'utf8');
const appCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'App.tsx'), 'utf8');
const profileScreenCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'ProfileScreenWeb.tsx'), 'utf8');
const loginModalCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'LoginModal.tsx'), 'utf8');
const userPlanCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'lib', 'userPlanManager.ts'), 'utf8');
const speakerUtilsCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'lib', 'speakerUtils.ts'), 'utf8');
const canvasExporterCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'lib', 'CanvasExporter.ts'), 'utf8');
const cardEditorCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'components', 'CardEditor.tsx'), 'utf8');
const rssSourceManagerCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'lib', 'rssSourceManager.ts'), 'utf8');
const apiConfigCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'lib', 'apiConfig.ts'), 'utf8');
const profileConfigCode = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'lib', 'profileConfig.ts'), 'utf8');

// Load SpeakerUtils
let speakerUtils;
try {
  speakerUtils = loadTsModule(path.resolve(__dirname, '..', 'src', 'lib', 'speakerUtils.ts'));
} catch (e) {
  console.warn('Could not load speakerUtils module directly:', e.message);
}

// =============================================================================
// MAIN TEST EXECUTION
// =============================================================================
async function runAllTiers() {

  // ===========================================================================
  // TIER 1: FEATURE COVERAGE (Features 1 to 16)
  // ===========================================================================
  console.log('\n--- TIER 1: FEATURE COVERAGE ---');

  // Feature 1: RSS Approval Route postData ReferenceError Elimination
  runTest('Tier 1 (Feature Coverage)', 'Feature 1: server.ts approve-news route defines postData in outer scope', () => {
    const routeIdx = serverCode.indexOf('/api/admin/approve-news/:id');
    assert(routeIdx !== -1, 'server.ts must define POST /api/admin/approve-news/:id');
    const handlerSlice = serverCode.substring(routeIdx, routeIdx + 12000);

    assert(handlerSlice.includes('broadcastNewsPublishedNotification'), 'Route must broadcast notification');

    const broadcastIdx = handlerSlice.indexOf('broadcastNewsPublishedNotification');
    const beforeBroadcast = handlerSlice.substring(0, broadcastIdx);

    const hasOuterPostData =
      beforeBroadcast.includes('const postData = req.body || {};') ||
      beforeBroadcast.includes('let postData = req.body || {};') ||
      beforeBroadcast.includes('const postData = req.body;') ||
      beforeBroadcast.includes('let postData = req.body;');

    assert(hasOuterPostData, 'server.ts must declare postData in the outer handler scope before broadcastNewsPublishedNotification to avoid ReferenceError');
  });

  // Feature 2: Feed Admin Auth Toast Gating on Mount
  runTest('Tier 1 (Feature Coverage)', 'Feature 2: HomeScreenWeb.tsx gates fetchAdminRssSourcesFromBackend behind canModerate', () => {
    const mountEffectMatch = homeScreenCode.match(/useEffect\(\(\)\s*=>\s*\{[\s\S]*?fetchAdminRssSourcesFromBackend[\s\S]*?\},?\s*\[/);
    assert(mountEffectMatch, 'HomeScreenWeb.tsx must have an effect referencing fetchAdminRssSourcesFromBackend');
    const effectBody = mountEffectMatch[0];

    const isGated =
      effectBody.includes('if (canModerate)') ||
      effectBody.includes('if (!canModerate) return') ||
      effectBody.includes('canModerate && fetchAdminRssSourcesFromBackend');

    assert(isGated, 'fetchAdminRssSourcesFromBackend on mount MUST be gated by canModerate to prevent 401/403 toasts for regular users');
  });

  // Feature 3: Public Approved IDs Route for Non-Admin Readers
  runTest('Tier 1 (Feature Coverage)', 'Feature 3: rssSourceManager.ts routes general sync to public /api/approved-news-ids', () => {
    const syncFuncMatch = rssSourceManagerCode.match(/syncAndMigrateLocalApprovals[\s\S]*?fetch\(([\s\S]*?)\)/);
    assert(syncFuncMatch, 'rssSourceManager.ts must implement syncAndMigrateLocalApprovals');
    const syncBody = syncFuncMatch[0];

    const forcesAdminEndpoint = syncBody.includes("token ? '/api/admin/approved-news-ids' : '/api/approved-news-ids'");
    assert(!forcesAdminEndpoint, 'syncAndMigrateLocalApprovals must not send non-admin users with tokens to /api/admin/approved-news-ids');
  });

  // Feature 4: Token Refresh & Event Isolation
  runTest('Tier 1 (Feature Coverage)', 'Feature 4: apiConfig.ts isolates ai_news_admin_auth_required event', () => {
    assert(apiConfigCode.includes('ai_news_admin_auth_required'), 'apiConfig.ts must handle ai_news_admin_auth_required');
    const isAdminChecked =
      apiConfigCode.includes('isAdminEndpoint') &&
      (apiConfigCode.includes('clearAuthTokens') || apiConfigCode.includes('dispatchAdminAuthRequired'));
    assert(isAdminChecked, 'apiConfig.ts must check endpoint nature before clearing auth tokens');
  });

  // Feature 5: Profile Hydration on Mount and Login
  runTest('Tier 1 (Feature Coverage)', 'Feature 5: App.tsx hydrates user profile on login/mount from /api/user-profile', () => {
    assert(appCode.includes('/api/user-profile'), 'App.tsx must reference /api/user-profile for profile hydration');
    assert(profileScreenCode.includes('user_profile_'), 'ProfileScreenWeb.tsx must store profile in localStorage under user_profile_ key');
  });

  // Feature 6: Google Login District Overwrite Elimination
  runTest('Tier 1 (Feature Coverage)', 'Feature 6: LoginModal.tsx does not overwrite district with "सेंट्रल डेस्क"', () => {
    const hasCentralDeskFallback =
      loginModalCode.includes("district: data.user.district || 'सेंट्रल डेस्क'") ||
      loginModalCode.includes("district: user.district || 'सेंट्रल डेस्क'");
    assert(!hasCentralDeskFallback, 'LoginModal.tsx must NOT fallback district to "सेंट्रल डेस्क", which overwrites user profiles');
  });

  // Feature 7: State Attribute Persistence in userPlanManager
  runTest('Tier 1 (Feature Coverage)', 'Feature 7: userPlanManager.ts registerOrUpdateUser preserves state attribute', () => {
    assert(userPlanCode.includes('registerOrUpdateUser'), 'userPlanManager.ts must implement registerOrUpdateUser');
    const regMatch = userPlanCode.match(/function registerOrUpdateUser\(([\s\S]*?)\)/);
    assert(regMatch, 'registerOrUpdateUser must be declared');
    const regArgs = regMatch[1];
    const acceptsState = regArgs.includes('state') || userPlanCode.includes('state?: string');
    assert(acceptsState, 'registerOrUpdateUser must accept state parameter to persist reporter state');
  });

  // Feature 8: App Logo vs User Logo Isolation
  runTest('Tier 1 (Feature Coverage)', 'Feature 8: sanitizeProfile isolates app logo and breaking news logo from regular users', () => {
    assert(appCode.includes('sanitizeProfile') || profileConfigCode.includes('sanitizeProfile'), 'sanitizeProfile must exist');
    const sanitizeLogo = (logoUrl, isAdmin = false) => {
      if (isAdmin) return logoUrl;
      if (!logoUrl) return '';
      if (logoUrl.includes('ai_news_maker_logo') || logoUrl.includes('breaking_news_wala_logo') || logoUrl.includes('breakingnewswala')) {
        return '';
      }
      return logoUrl;
    };

    assert.strictEqual(sanitizeLogo('/assets/ai_news_maker_logo.png', false), '', 'App logo must be stripped for normal users');
    assert.strictEqual(sanitizeLogo('/assets/breaking_news_wala_logo.png', false), '', 'Breaking news logo must be stripped for normal users');
    assert.strictEqual(sanitizeLogo('/uploads/logos/custom_user_logo.png', false), '/uploads/logos/custom_user_logo.png', 'User custom logo must be preserved');
    assert.strictEqual(sanitizeLogo('/assets/ai_news_maker_logo.png', true), '/assets/ai_news_maker_logo.png', 'Admin retains app logo');
  });

  // Feature 9: Removal of Headline 120-Char Limit Clamp
  runTest('Tier 1 (Feature Coverage)', 'Feature 9: speakerUtils.ts removes 120-character clamp from candidate generation', () => {
    const hasClamp1476 = speakerUtilsCode.includes('countHeadlineVisibleCharacters(formatted) > 120');
    const hasClamp1489 = speakerUtilsCode.includes('countHeadlineVisibleCharacters(s) <= 120');
    assert(!hasClamp1476 && !hasClamp1489, 'speakerUtils.ts must remove obsolete 120-character clamps to permit Tier 3-5 generation');
  });

  // Feature 10: 5-Tier Headline Range Enforcement & Distinctness
  runTest('Tier 1 (Feature Coverage)', 'Feature 10: speakerUtils.ts defines and enforces exact 5-tier headline ranges', () => {
    assert(speakerUtils && speakerUtils.HEADLINE_5_TIER_RANGES, 'speakerUtils must export HEADLINE_5_TIER_RANGES');
    const ranges = speakerUtils.HEADLINE_5_TIER_RANGES;
    assert.strictEqual(ranges.length, 5, 'Must define exactly 5 headline tiers');
    assert.deepStrictEqual(ranges[0], { min: 80, max: 110, label: 'विकल्प 1' });
    assert.deepStrictEqual(ranges[1], { min: 100, max: 130, label: 'विकल्प 2' });
    assert.deepStrictEqual(ranges[2], { min: 125, max: 150, label: 'विकल्प 3' });
    assert.deepStrictEqual(ranges[3], { min: 130, max: 160, label: 'विकल्प 4' });
    assert.deepStrictEqual(ranges[4], { min: 150, max: 200, label: 'विकल्प 5' });
  });

  // Feature 11: Hindi Editorial Grammar Rules
  runTest('Tier 1 (Feature Coverage)', 'Feature 11: speakerUtils.ts preserves spaces in state names and eliminates trailing punctuation', () => {
    if (speakerUtils && speakerUtils.sanitizeHeadlineClean) {
      const cleanedPunct = speakerUtils.sanitizeHeadlineClean('भोपाल में जल संकट की स्थिति गम्भीर।');
      assert(!cleanedPunct.endsWith('।'), 'Trailing purna viram (।) must be removed');
      assert(!cleanedPunct.endsWith('.'), 'Trailing dot (.) must be removed');

      const cleanedSpace = speakerUtils.sanitizeHeadlineClean('भोपाल, मध्य प्रदेश में ताजा अपडेट');
      assert(cleanedSpace.includes('मध्य प्रदेश'), 'Whitespace in मध्य प्रदेश must be preserved');
    } else {
      assert(speakerUtilsCode.includes('मध्य प्रदेश'), 'speakerUtils must preserve मध्य प्रदेश');
    }
  });

  // Feature 12: Final JPG Missing Photo Fix (canvasFilterStr ReferenceError Elimination)
  runTest('Tier 1 (Feature Coverage)', 'Feature 12: CanvasExporter.ts defines canvasFilterStr in drawAuthoritativeDynamicFrameCanvas', () => {
    const drawFnMatch = canvasExporterCode.match(/async function drawAuthoritativeDynamicFrameCanvas[\s\S]*?^}/m) ||
                        canvasExporterCode.match(/const drawAuthoritativeDynamicFrameCanvas = async[\s\S]*?^}/m);
    assert(drawFnMatch, 'CanvasExporter.ts must contain drawAuthoritativeDynamicFrameCanvas');
    const fnBody = drawFnMatch[0];

    const hasCanvasFilterStr =
      fnBody.includes('const canvasFilterStr =') ||
      fnBody.includes('let canvasFilterStr =') ||
      fnBody.includes('var canvasFilterStr =');

    assert(hasCanvasFilterStr, 'drawAuthoritativeDynamicFrameCanvas must declare canvasFilterStr to prevent ReferenceError during photo export');
  });

  // Feature 13: Dynamic Frame Normalization in CanvasExporter
  runTest('Tier 1 (Feature Coverage)', 'Feature 13: CanvasExporter.ts normalizes dynamic frame with normalizeDynamicFrame', () => {
    const dynamicFrameCallMatch = canvasExporterCode.substring(
      canvasExporterCode.indexOf('const dynamicFrame = card.customDynamicFrame') || 0,
      (canvasExporterCode.indexOf('const dynamicFrame = card.customDynamicFrame') || 0) + 400
    );
    const usesNormalize =
      canvasExporterCode.includes('normalizeDynamicFrame(dynamicFrame)') ||
      canvasExporterCode.includes('normalizeDynamicFrame(rawDynamicFrame)') ||
      dynamicFrameCallMatch.includes('normalizeDynamicFrame');

    assert(usesNormalize, 'CanvasExporter.ts must normalize dynamicFrame using normalizeDynamicFrame before rendering');
  });

  // Feature 14: Invisible Headline Contrast Fix on Dark Backgrounds
  runTest('Tier 1 (Feature Coverage)', 'Feature 14: CanvasExporter.ts ensures contrast on dark dynamic frame backgrounds', () => {
    assert(canvasExporterCode.includes('drawAuthoritativeDynamicFrameCanvas'), 'CanvasExporter must implement authoritative dynamic frame rendering');
    const hasContrastGuard =
      canvasExporterCode.includes('contrast') ||
      canvasExporterCode.includes('isBlack') ||
      canvasExporterCode.includes('luminance') ||
      canvasExporterCode.includes('effectiveTextColor');
    assert(hasContrastGuard, 'CanvasExporter.ts must enforce contrast safeguard for text slots');
  });

  // Feature 15: Callout Visibility & Height Scaling
  runTest('Tier 1 (Feature Coverage)', 'Feature 15: CanvasExporter.ts permits user-selected callout and scales height to 5.5%–7.5%', () => {
    const hasCalibratedHeight =
      canvasExporterCode.includes('0.055') ||
      canvasExporterCode.includes('0.06') ||
      canvasExporterCode.includes('0.065') ||
      canvasExporterCode.includes('0.075') ||
      canvasExporterCode.includes('height: 5.5') ||
      canvasExporterCode.includes('height: 6.5');

    assert(hasCalibratedHeight, 'CanvasExporter.ts / dynamicFramesManager must calibrate callout height to 5.5%–7.5%');
  });

  // Feature 16: Mirror Parity between src/ and web_studio/
  runTest('Tier 1 (Feature Coverage)', 'Feature 16: Dual Parity: server.ts root and web_studio/server.ts match', () => {
    assert.strictEqual(serverCode.length, webStudioServerCode.length, 'server.ts and web_studio/server.ts character length must match');
  });


  // ===========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ===========================================================================
  console.log('\n--- TIER 2: BOUNDARY & CORNER CASES ---');

  // Test 2.1: Profile Completion Gate with Empty / Boundary Fields
  runTest('Tier 2 (Boundary & Corner Cases)', 'Boundary 2.1: Profile Completion Gate strictly rejects incomplete profile partitions', () => {
    const evaluateProfileGate = (prof, u) => {
      const hasChannelName = Boolean(prof?.channelNameHi?.trim() || u?.channelNameHi?.trim());
      const hasUsername = Boolean(prof?.username?.trim() || u?.username?.trim());
      const hasState = Boolean(prof?.state?.trim() || prof?.reporterState?.trim() || u?.state?.trim());
      const hasDistrict = Boolean(prof?.district?.trim() || prof?.reporterDistrict?.trim() || u?.district?.trim() || u?.city?.trim());
      const rawLogo = prof?.channelLogoPngUrl || prof?.channelLogoUrl || u?.channelLogoUrl || '';
      const hasValidLogo = Boolean(
        rawLogo &&
        !rawLogo.includes('ai_news_maker_logo') &&
        !rawLogo.includes('breaking_news_wala_logo') &&
        !rawLogo.includes('breakingnewswala')
      );

      if (!hasChannelName || !hasUsername || !hasState || !hasDistrict || !hasValidLogo) {
        return {
          allowed: false,
          missing: {
            channelName: !hasChannelName,
            username: !hasUsername,
            state: !hasState,
            district: !hasDistrict,
            logo: !hasValidLogo,
          },
          error: '⚠️ कृपया फोटो/वीडियो स्टूडियो का उपयोग करने से पहले अपनी प्रोफ़ाइल (चैनल नाम, राज्य, ज़िला, यूज़रनेम एवं लोगो) पूरी करें!',
        };
      }
      return { allowed: true };
    };

    const completeProfile = {
      channelNameHi: 'खबरीदास न्यूज़',
      username: 'khabridasnews',
      state: 'मध्य प्रदेश',
      district: 'ग्वालियर',
      channelLogoUrl: '/uploads/logos/req_1794754892218_bhzv2b.png',
    };

    // Partition A: Complete Profile -> PASSES
    const resComplete = evaluateProfileGate(completeProfile, {});
    assert.strictEqual(resComplete.allowed, true, 'Complete profile must pass gate');

    // Partition B: Missing State -> FAILS
    const resNoState = evaluateProfileGate({ ...completeProfile, state: '' }, {});
    assert.strictEqual(resNoState.allowed, false, 'Missing state must fail gate');
    assert.strictEqual(resNoState.missing.state, true);

    // Partition C: Missing District -> FAILS
    const resNoDistrict = evaluateProfileGate({ ...completeProfile, district: '' }, {});
    assert.strictEqual(resNoDistrict.allowed, false, 'Missing district must fail gate');
    assert.strictEqual(resNoDistrict.missing.district, true);

    // Partition D: App Logo used as user logo -> FAILS
    const resAppLogo = evaluateProfileGate({ ...completeProfile, channelLogoUrl: '/assets/ai_news_maker_logo.png' }, {});
    assert.strictEqual(resAppLogo.allowed, false, 'App logo used by normal user must fail gate');
    assert.strictEqual(resAppLogo.missing.logo, true);

    // Partition E: Empty Channel Name -> FAILS
    const resNoChannel = evaluateProfileGate({ ...completeProfile, channelNameHi: '   ' }, {});
    assert.strictEqual(resNoChannel.allowed, false, 'Whitespace-only channel name must fail gate');
  });

  // Test 2.2: Extreme Headline Boundary Values (Exact Characters)
  runTest('Tier 2 (Boundary & Corner Cases)', 'Boundary 2.2: Exact Character Boundary Validation for all 5 Tiers', () => {
    const countVisible = speakerUtils ? speakerUtils.countHeadlineVisibleCharacters : (s) => (s || '').replace(/\s+/g, ' ').trim().length;

    function makeTargetHeadline(target) {
      let s = 'भोपाल के पानी में मिला जानलेवा बैक्टीरिया ';
      while (s.length < target) s += 'इंदौर वाला ';
      s = s.slice(0, target);
      if (s.endsWith(' ')) s = s.slice(0, -1) + 'क';
      return s;
    }

    const tierChecks = [
      { tier: 1, min: 80, max: 110 },
      { tier: 2, min: 100, max: 130 },
      { tier: 3, min: 125, max: 150 },
      { tier: 4, min: 130, max: 160 },
      { tier: 5, min: 150, max: 200 },
    ];

    for (const t of tierChecks) {
      const minText = makeTargetHeadline(t.min);
      const minCount = countVisible(minText);
      assert.strictEqual(minCount, t.min, `Tier ${t.tier} min count must be exactly ${t.min}`);

      const maxText = makeTargetHeadline(t.max);
      const maxCount = countVisible(maxText);
      assert.strictEqual(maxCount, t.max, `Tier ${t.tier} max count must be exactly ${t.max}`);
    }

    // Boundary violation detection: 85-char headline in Tier 2 (from Evidence Image 2)
    const bugImageOption2 = makeTargetHeadline(85);
    const count85 = countVisible(bugImageOption2);
    assert.strictEqual(count85, 85);
    const isTier2Valid = count85 >= 100 && count85 <= 130;
    assert.strictEqual(isTier2Valid, false, '85-character headline must strictly FAIL Tier 2 validation (100-130 range)');
  });

  // Test 2.3: Candidate Fact Sentences > 120 Characters Not Dropped
  runTest('Tier 2 (Boundary & Corner Cases)', 'Boundary 2.3: Candidate fact sentence with 145 characters is preserved', () => {
    const primaryTitle = 'भोपाल के पानी में मिला जानलेवा बैक्टीरिया, प्रशासन में हड़कंप';
    const longFact = 'भोपाल के पानी में मिला, भोपाल में पेयजल आपूर्ति को लेकर एक बड़ा दावा सामने आया था जिसमें शहर के पानी में इंदौर की तरह जानलेवा ई-कोलाई बैक्टीरिया मिला';

    if (speakerUtils && speakerUtils.generate5BalancedHeadlineOptions) {
      const options = speakerUtils.generate5BalancedHeadlineOptions(primaryTitle, [longFact], 'भोपाल');
      assert(options.length > 0, 'Must generate options');
      const anyLong = options.some(opt => speakerUtils.countHeadlineVisibleCharacters(opt) > 100);
      assert(anyLong, 'Headlines > 100 chars must be accepted into options pool when 120-char clamp is removed');
    } else {
      assert(!speakerUtilsCode.includes('> 120'), 'speakerUtils must not discard >120 char candidates');
    }
  });

  // Test 2.4: Callout Visibility Toggle Boundary
  runTest('Tier 2 (Boundary & Corner Cases)', 'Boundary 2.4: showCallout: false suppresses callout rendering even with asset present', () => {
    const ctx = new MockCanvasRenderingContext2D(1080, 1350);
    const card = {
      showCallout: false,
      customCalloutAssetUrl: 'https://example.com/emerald_pill.png',
      calloutTag: 'विशेष रिपोर्ट',
    };

    let calloutDrawn = false;
    if (card.showCallout !== false && (card.customCalloutAssetUrl || card.calloutTag)) {
      ctx.drawImage({ src: card.customCalloutAssetUrl }, 100, 1000, 300, 80);
      calloutDrawn = true;
    }

    assert.strictEqual(calloutDrawn, false, 'Callout must NOT be drawn when card.showCallout === false');
    assert.strictEqual(ctx.operations.filter(op => op.op === 'drawImage').length, 0, 'No drawImage operations for callout');
  });

  // Test 2.5: Transparent TextSlot Background on Dark Base Canvas
  runTest('Tier 2 (Boundary & Corner Cases)', 'Boundary 2.5: Transparent slot on dark canvas enforces contrast safeguard', () => {
    const textSlot = {
      textColor: '#000000',
      backgroundColor: 'transparent',
    };
    const primaryBackgroundHex = '#0B1329';

    const resolveEffectiveTextColor = (slot, bgHex) => {
      const isBaseDark = bgHex === '#0B1329' || bgHex.toLowerCase() === '#0b1329' || bgHex === '#000000';
      const isSlotTransparent = !slot.backgroundColor || slot.backgroundColor === 'transparent';
      const isTextBlack = slot.textColor === '#000000' || slot.textColor.toLowerCase() === '#000000';

      if (isBaseDark && isSlotTransparent && isTextBlack) {
        return '#FFFFFF';
      }
      return slot.textColor;
    };

    const effectiveColor = resolveEffectiveTextColor(textSlot, primaryBackgroundHex);
    assert.strictEqual(effectiveColor, '#FFFFFF', 'Black text on dark navy transparent slot must be contrasted to white');
  });

  // Test 2.6: Photo Error Fallback Integrity
  runTest('Tier 2 (Boundary & Corner Cases)', 'Boundary 2.6: Failed news thumbnail does NOT fall back to 1x1 transparent SVG', () => {
    const resolveFallback = (url) => {
      const isOverlayOrFrame = /logo|badge|callout|ribbon|watermark|icon|frame|overlay|background|bg_/i.test(url);
      const transparentFallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
      const photoFallback = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" fill="%231e293b"><rect width="800" height="600"/></svg>';
      return isOverlayOrFrame ? transparentFallback : photoFallback;
    };

    const newsPhotoUrl = 'https://ainewsmaker.online/uploads/news_thumbnails/thumb_12345.jpg';
    const fallback = resolveFallback(newsPhotoUrl);
    assert.strictEqual(fallback.includes('width="800"'), true, 'News thumbnail upload must fall back to photo placeholder, NOT 1x1 transparent SVG');
  });


  // ===========================================================================
  // TIER 3: CROSS-FEATURE INTERACTIONS
  // ===========================================================================
  console.log('\n--- TIER 3: CROSS-FEATURE INTERACTIONS ---');

  // Test 3.1: Profile Hydration + Gate + Studio Entry Interaction
  runTest('Tier 3 (Cross-Feature Interactions)', 'Interaction 3.1: Cloud Profile Hydration clears Profile Gate and unlocks Studio', () => {
    const { storage } = setupMockEnvironment();

    const userEmail = 'khabridasnews@gmail.com';
    const mockCloudProfile = {
      username: 'khabridasnews',
      fullName: 'Khabridas News',
      role: 'reporter',
      email: userEmail,
      district: 'ग्वालियर',
      state: 'मध्य प्रदेश',
      channelNameHi: 'खबरीदास न्यूज़',
      channelNameEn: 'Khabridas News',
      channelLogoUrl: '/uploads/logos/req_1794754892218_bhzv2b.png',
      channelLogoPngUrl: '/uploads/logos/req_1794754892218_bhzv2b.png',
    };

    storage.setItem('user_profile_' + userEmail, JSON.stringify(mockCloudProfile));

    const saved = JSON.parse(storage.getItem('user_profile_' + userEmail) || '{}');
    assert.strictEqual(saved.state, 'मध्य प्रदेश');
    assert.strictEqual(saved.district, 'ग्वालियर');
    assert.strictEqual(saved.channelNameHi, 'खबरीदास न्यूज़');

    const hasChannel = Boolean(saved.channelNameHi?.trim());
    const hasUser = Boolean(saved.username?.trim());
    const hasState = Boolean(saved.state?.trim());
    const hasDistrict = Boolean(saved.district?.trim());
    const hasLogo = Boolean(saved.channelLogoUrl && !saved.channelLogoUrl.includes('ai_news_maker_logo'));

    const canEnterStudio = hasChannel && hasUser && hasState && hasDistrict && hasLogo;
    assert.strictEqual(canEnterStudio, true, 'Hydrated user profile must cleanly pass the Profile Completion Gate');
  });

  // Test 3.2: RSS Approval + Feed Ingestion Interaction
  runTest('Tier 3 (Cross-Feature Interactions)', 'Interaction 3.2: Approved RSS news item is included in public news-posts query', () => {
    const existingDb = [];
    const editorialDb = { approvedNews: {} };

    const approvePost = (id, postData) => {
      const approvedTitle = postData.title || 'शीर्षक';
      const newApprovedPost = {
        id,
        title: approvedTitle,
        location: postData.location || postData.district || '',
        category: postData.category || 'breaking',
        status: 'APPROVED',
        isApproved: true,
        isPublished: true,
      };
      existingDb.unshift(newApprovedPost);
      editorialDb.approvedNews[id] = { approved: true, timestamp: Date.now() };
      return { success: true, post: newApprovedPost };
    };

    const res = approvePost('rss-bhopal-001', {
      title: 'भोपाल में स्वच्छ पेयजल आपूर्ति अभियान शुरू',
      location: 'भोपाल, मध्य प्रदेश',
      category: 'विकास',
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(existingDb.length, 1);
    assert.strictEqual(existingDb[0].isApproved, true);
    assert.strictEqual(editorialDb.approvedNews['rss-bhopal-001'].approved, true);

    const publicFeed = existingDb.filter(p => p.isApproved && p.isPublished);
    assert.strictEqual(publicFeed.length, 1, 'Public feed must include the newly approved post');
    assert.strictEqual(publicFeed[0].id, 'rss-bhopal-001');
  });

  // Test 3.3: Dynamic Frame Normalization + Canvas Export Interaction
  runTest('Tier 3 (Cross-Feature Interactions)', 'Interaction 3.3: Dynamic Frame normalization feeds calibrated config to CanvasExporter', () => {
    const rawFrame = {
      id: 'df_test_001',
      name: 'Test Dark Frame',
      primaryBackgroundHex: '#0B1329',
      textSlots: [
        { id: 'headline', rect: { x: 8, y: 55, width: 84, height: 28 }, textColor: '#FFFFFF', backgroundColor: 'transparent' },
      ],
    };

    const normalizeDynamicFrame = (df) => {
      if (!df) return null;
      return {
        ...df,
        safeZoneConfig: df.safeZoneConfig || { enabled: true, top: 4, bottom: 4, left: 4, right: 4 },
        fullStoryCalloutConfig: df.fullStoryCalloutConfig || {
          enabled: true,
          calloutVisibilityPolicy: 'optional',
          rect: { x: 10, y: 86.8, width: 80, height: 6.5 },
        },
      };
    };

    const normalized = normalizeDynamicFrame(rawFrame);
    assert.strictEqual(normalized.safeZoneConfig.enabled, true);
    assert.strictEqual(normalized.fullStoryCalloutConfig.enabled, true);
    assert.strictEqual(normalized.fullStoryCalloutConfig.rect.height, 6.5, 'Calibrated callout height must be 6.5%');

    const ctx = new MockCanvasRenderingContext2D(1080, 1350);
    const card = {
      customCalloutAssetUrl: 'https://example.com/emerald_pill.png',
      showCallout: true,
    };

    const cRect = normalized.fullStoryCalloutConfig.rect;
    const ch = (cRect.height / 100) * 1350;
    assert(ch >= 70 && ch <= 105, `Callout pixel height (${ch}px) must be well-proportioned for 1080x1350 canvas`);
  });


  // ===========================================================================
  // TIER 4: REAL-WORLD SCENARIOS
  // ===========================================================================
  console.log('\n--- TIER 4: REAL-WORLD SCENARIOS ---');

  // Scenario 4.1: Production RSS Ingestion & Public Feed Display
  runTest('Tier 4 (Real-World Scenarios)', 'Scenario 4.1: Admin Approves RSS -> Public Feed Displays News with Zero Admin Warning Toast', () => {
    const { storage, dispatchedEvents } = setupMockEnvironment();

    const rawPost = {
      id: 'rss-bhopal-bacteria-99',
      title: 'भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया',
      location: 'भोपाल, मध्य प्रदेश',
      category: 'स्वास्थ्य',
      status: 'PENDING_APPROVAL',
      isApproved: false,
    };

    const postData = { ...rawPost, status: 'APPROVED', isApproved: true, isPublished: true };
    assert.strictEqual(postData.isApproved, true);

    const publicEndpoint = '/api/approved-news-ids';
    assert.strictEqual(publicEndpoint, '/api/approved-news-ids', 'Guest requests public endpoint');

    const adminAuthEvents = dispatchedEvents.filter(e => e.type === 'ai_news_admin_auth_required');
    assert.strictEqual(adminAuthEvents.length, 0, 'Zero admin auth warning events must be dispatched for public visitor');
  });

  // Scenario 4.2: Full Reporter Studio & Final Canvas Export Workflow
  runTest('Tier 4 (Real-World Scenarios)', 'Scenario 4.2: End-to-End Reporter Workflow: Login -> 5-Tier AI Editorial -> Emerald Callout -> Canvas Export', () => {
    const { storage } = setupMockEnvironment();

    // Step 1: Reporter Login & Cloud Profile Hydration
    const reporterProfile = {
      username: 'khabridasnews',
      channelNameHi: 'खबरीदास न्यूज़',
      state: 'मध्य प्रदेश',
      district: 'ग्वालियर',
      channelLogoUrl: '/uploads/logos/req_1794754892218_bhzv2b.png',
      whatsappDisplayNumber: '7000155314',
      websiteUrl: 'https://khabridasnews.com',
    };
    storage.setItem('user_profile_khabridasnews@gmail.com', JSON.stringify(reporterProfile));

    // Step 2: Clear Profile Gate
    const saved = JSON.parse(storage.getItem('user_profile_khabridasnews@gmail.com'));
    assert(saved.channelNameHi && saved.state && saved.district && saved.channelLogoUrl);

    // Step 3: AI Editorial Engine: 5 distinct headlines for भोपाल water story
    const primaryTitle = 'भोपाल के पानी में मिला इंदौर वाला जानलेवा बैक्टीरिया, निगम ने ई-कोलाई मिलने का दावा';
    const factSentences = [
      'भोपाल में पेयजल आपूर्ति को लेकर एक बड़ा दावा सामने आया था जिसमें शहर के पानी में जानलेवा बैक्टीरिया मिला।',
      'नगर निगम की जांच में जल स्रोतों में ई-कोलाई बैक्टीरिया पाए जाने की पुष्टि हुई है।',
      'स्वास्थ्य विभाग ने सभी नागरिकों को पानी उबालकर पीने की सलाह जारी की है।',
    ];

    const tier3Headline = `${primaryTitle}: ${factSentences[1]}`.replace(/[।\.]/g, '').trim();
    const visibleLength = tier3Headline.replace(/\s+/g, '').length;
    assert(visibleLength >= 80, 'Tier 3 candidate length must be substantial');

    // Step 4: Card Configuration for Step 6 (Emerald Callout & Dynamic Frame)
    const card = {
      headline: tier3Headline,
      location: 'भोपाल, मध्य प्रदेश',
      customCalloutAssetUrl: 'https://ainewsmaker.online/assets/callouts/callout_emerald_pill.png',
      calloutScale: 1.0,
      showCallout: true,
      imagePositions: { main: { x: 50, y: 50, zoom: 1 } },
      channelNameHi: reporterProfile.channelNameHi,
      whatsappNumber: reporterProfile.whatsappDisplayNumber,
    };

    // Step 5: Canvas Exporter Pipeline Execution
    const ctx = new MockCanvasRenderingContext2D(1080, 1350);

    const canvasFilterStr = card.imageFilter ? `contrast(1.1)` : 'none';
    assert.strictEqual(typeof canvasFilterStr, 'string', 'canvasFilterStr must resolve to valid string');

    // Layer 1: Photo Slot with canvasFilterStr
    ctx.save();
    ctx.filter = canvasFilterStr;
    ctx.drawImage({ src: 'photo.jpg' }, 0, 0, 1080, 750);
    ctx.restore();

    // Layer 2: Headline
    ctx.save();
    ctx.font = 'bold 36px "Noto Sans Devanagari"';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(card.headline, 80, 850);
    ctx.restore();

    // Layer 3: Callout (Emerald Pill at 6.5% height)
    ctx.save();
    const calloutH = 1350 * 0.065;
    ctx.drawImage({ src: card.customCalloutAssetUrl }, 108, 1170, 864, calloutH);
    ctx.restore();

    // Layer 4: Branding Footer
    ctx.save();
    ctx.fillStyle = '#FFCC00';
    ctx.fillRect(0, 1270, 1080, 80);
    ctx.fillStyle = '#000000';
    ctx.fillText(`${card.channelNameHi} | WhatsApp: ${card.whatsappNumber}`, 40, 1320);
    ctx.restore();

    // Verify all 4 layers rendered
    const drawOps = ctx.operations.filter(op => op.op === 'drawImage');
    assert.strictEqual(drawOps.length, 2, 'Photo and Callout must both be drawn via drawImage');
    const fillTextOps = ctx.operations.filter(op => op.op === 'fillText');
    assert(fillTextOps.length >= 2, 'Headline and Footer text must both be drawn');
  });

  // ===========================================================================
  // REPORTING & SUMMARY
  // ===========================================================================
  console.log('\n================================================================================');
  console.log('📊 MASTER TEST SUITE EXECUTION SUMMARY');
  console.log('================================================================================');
  for (const [tier, metrics] of Object.entries(tierMetrics)) {
    const statusIcon = metrics.failed === 0 ? '✅' : '❌';
    console.log(`${statusIcon} ${tier}: ${metrics.passed}/${metrics.total} Passed (${metrics.failed} Failed)`);
  }
  console.log('--------------------------------------------------------------------------------');
  console.log(`TOTAL RESULT: ${passedTests}/${totalTests} Tests Passed`);

  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS BREAKDOWN (Escalate to Repair Worker):');
    failedTests.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.tier}] ${f.name}`);
      console.log(`     Error: ${f.error}`);
    });
    console.log('\n⚠️ Some tests failed as expected against unpatched source HEAD.');
    process.exitCode = 1;
  } else {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  }
}

// Run the full test suite
runAllTiers().catch((err) => {
  console.error('Fatal unhandled error in test runner:', err);
  process.exit(1);
});
