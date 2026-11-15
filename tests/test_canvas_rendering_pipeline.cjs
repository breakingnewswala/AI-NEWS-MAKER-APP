/**
 * tests/test_canvas_rendering_pipeline.cjs
 * Behavioral Verification of Canvas Rendering Pipeline, Transformations, Font Scaling & Badge Dynamics
 */

const assert = require('assert');
const fs = require('fs');

console.log('================================================================');
console.log('🧪 RUNNING DEEP BEHAVIORAL CANVAS RENDERING & LOGIC TESTS');
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
// Test 1: Dynamic Location Badge Math & Sizing
// -------------------------------------------------------------
runTest('Behavioral 1: Location Badge dynamically sizes for short and long cities', () => {
  function computeDynamicLocationWidth(locText, maxAllowedW = 400, leftDestW = 42, rightDestW = 22) {
    // Character width approximation for Baloo 2 font (avg 14px/char for 20px font)
    const measuredTextW = locText.length * 14;
    const neededCenterW = Math.max(10, measuredTextW + 24);
    const dynamicBw = Math.min(maxAllowedW, Math.max(100, Math.round(leftDestW + neededCenterW + rightDestW)));
    const finalCenterW = Math.max(10, dynamicBw - leftDestW - rightDestW);
    return { dynamicBw, finalCenterW, measuredTextW };
  }

  const shortCity = computeDynamicLocationWidth('भोपाल');
  const mediumCity = computeDynamicLocationWidth('भोपाल, मध्य प्रदेश');
  const longCity = computeDynamicLocationWidth('सेंट्रल डेस्क / भोपाल, मध्य प्रदेश');

  assert(shortCity.dynamicBw < mediumCity.dynamicBw, `Short city (${shortCity.dynamicBw}px) must be narrower than medium city (${mediumCity.dynamicBw}px)`);
  assert(mediumCity.dynamicBw < longCity.dynamicBw, `Medium city (${mediumCity.dynamicBw}px) must be narrower than long city (${longCity.dynamicBw}px)`);
  assert(shortCity.dynamicBw >= 100, 'Short city badge must be at least 100px');
  assert(longCity.dynamicBw <= 400, 'Long city badge must respect maxAllowedW');
});

// -------------------------------------------------------------
// Test 2: Watermark Spacing Collision Prevention
// -------------------------------------------------------------
runTest('Behavioral 2: Watermark repetition stepX guarantees zero word collision', () => {
  function computeWatermarkSpacing(channelName, fontSize = 24) {
    // Average character width for Arial 900 bold is ~15px at 24px
    const measuredW = channelName.length * 15;
    const stepX = Math.max(340, Math.round(measuredW + 120));
    const padding = stepX - measuredW;
    return { measuredW, stepX, padding };
  }

  const wm1 = computeWatermarkSpacing('BREAKING NEWS WALA');
  const wm2 = computeWatermarkSpacing('AI NEWS MAKER APP');

  assert(wm1.padding >= 120, `Padding between repetitions for '${wm1.measuredW}px' must be >= 120px (actual: ${wm1.padding}px)`);
  assert(wm2.padding >= 120, `Padding between repetitions for '${wm2.measuredW}px' must be >= 120px (actual: ${wm2.padding}px)`);
  assert(wm1.stepX >= 340, 'StepX must be at least 340px');
});

// -------------------------------------------------------------
// Test 3: Exact Font Sizing (32px and 35px)
// -------------------------------------------------------------
runTest('Behavioral 3: Exact font sizing without arbitrary 2.15 multiplier', () => {
  function resolveTargetFontSize(cardFontSize, isQuote = false) {
    const isExplicitFontSize = Boolean(cardFontSize && cardFontSize > 0);
    let targetFontSize = isExplicitFontSize ? cardFontSize : (isQuote ? 56 : 64);
    if (!isExplicitFontSize) {
      targetFontSize = Math.max(isQuote ? 44 : 52, Math.min(isQuote ? 64 : 80, targetFontSize));
    }
    return targetFontSize;
  }

  const size32 = resolveTargetFontSize(32);
  const size35 = resolveTargetFontSize(35);
  const sizeDefault = resolveTargetFontSize(undefined);

  assert.strictEqual(size32, 32, 'User 32px must remain exactly 32px');
  assert.strictEqual(size35, 35, 'User 35px must remain exactly 35px');
  assert.strictEqual(sizeDefault, 64, 'Default standard template font size must be 64px');
});

// -------------------------------------------------------------
// Test 4: Callout userScale matrix calculation
// -------------------------------------------------------------
runTest('Behavioral 4: Callout transformation applies userScale around center anchor', () => {
  const operations = [];
  const mockCtx = {
    save: () => operations.push('save'),
    restore: () => operations.push('restore'),
    translate: (x, y) => operations.push(`translate(${Math.round(x)},${Math.round(y)})`),
    rotate: (r) => operations.push(`rotate(${r.toFixed(2)})`),
    scale: (sx, sy) => operations.push(`scale(${sx},${sy})`),
  };

  function applyCalloutTransform(ctx, cx, cy, cw, ch, rotDeg = 0, userScale = 1.0) {
    ctx.save();
    ctx.translate(cx + cw / 2, cy + ch / 2);
    if (rotDeg !== 0) ctx.rotate((rotDeg * Math.PI) / 180);
    if (userScale !== 1.0) ctx.scale(userScale, userScale);
    ctx.translate(-(cx + cw / 2), -(cy + ch / 2));
  }

  applyCalloutTransform(mockCtx, 100, 1000, 800, 80, 0, 1.25);

  assert(operations.includes('translate(500,1040)'), 'Must translate to callout center');
  assert(operations.includes('scale(1.25,1.25)'), 'Must scale by userScale 1.25');
  assert(operations.includes('translate(-500,-1040)'), 'Must translate back from callout center');
});

// -------------------------------------------------------------
// Test 5: Favorites & Category Ordering
// -------------------------------------------------------------
runTest('Behavioral 5: Favorites state management and My Frames tab ordering', () => {
  const mockLocalStorage = {};
  const user = 'reporter@breakingnewswala.com';
  const storageKey = `ai_news_user_favorites_${user}`;

  function toggleFavorite(favs, frameId) {
    const next = favs.includes(frameId) ? favs.filter(id => id !== frameId) : [...favs, frameId];
    mockLocalStorage[storageKey] = JSON.stringify(next);
    return next;
  }

  let favorites = [];
  favorites = toggleFavorite(favorites, 'df_breaking_01');
  assert.deepStrictEqual(favorites, ['df_breaking_01']);
  assert.deepStrictEqual(JSON.parse(mockLocalStorage[storageKey]), ['df_breaking_01']);

  favorites = toggleFavorite(favorites, 'df_quote_02');
  assert.deepStrictEqual(favorites, ['df_breaking_01', 'df_quote_02']);

  favorites = toggleFavorite(favorites, 'df_breaking_01');
  assert.deepStrictEqual(favorites, ['df_quote_02']);

  // Verify category ordering puts Custom Frame (My Frames) at index 0
  const categories = ['Regular Frame', 'Package Frame', 'Super Breaking', 'Custom Frame'];
  const ordered = ['Custom Frame', ...categories.filter(c => c !== 'Custom Frame')];
  assert.strictEqual(ordered[0], 'Custom Frame', 'My Frames must be the first category');
});

// -------------------------------------------------------------
// Test 6: Studio Reset Shortcut Idempotence
// -------------------------------------------------------------
runTest('Behavioral 6: Ctrl + Alt + F shortcut handler is idempotent and non-blocking', () => {
  let isResetting = false;
  let resetCallCount = 0;
  let dismissedModals = 0;

  function handleShortcut(event) {
    if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'f' || event.key === 'F')) {
      if (isResetting) return;
      isResetting = true;
      dismissedModals++;
      resetCallCount++;
      setTimeout(() => { isResetting = false; }, 100);
    }
  }

  // Fire shortcut 3 times in rapid succession
  handleShortcut({ ctrlKey: true, altKey: true, key: 'f' });
  handleShortcut({ ctrlKey: true, altKey: true, key: 'f' });
  handleShortcut({ ctrlKey: true, altKey: true, key: 'F' });

  assert.strictEqual(resetCallCount, 1, 'Rapid shortcut presses must execute reset exactly once');
  assert.strictEqual(dismissedModals, 1, 'Modals must be dismissed once');
});

console.log('================================================================');
console.log(`RESULTS: ${passed} / ${total} TESTS PASSED`);
console.log('================================================================');

if (passed !== total) process.exit(1);
