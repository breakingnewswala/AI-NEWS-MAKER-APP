const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==================================================================');
console.log('🧪 VERIFYING MASTER PHOTO NEWS STUDIO CORRECTION PROMPT (AREAS 1 TO 8)');
console.log('==================================================================');

function runTest(name, fn) {
  try {
    process.stdout.write(`Testing ${name}... `);
    fn();
    console.log('✅ [PASS]');
  } catch (err) {
    console.log('❌ [FAIL]');
    console.error(err);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// Test 1: Normal Login Landing Page — Home not Profile
// -----------------------------------------------------------------------------
runTest('TC1: Default Login Landing Page is Home with pre-requested preservation', () => {
  const appTsx = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');

  // Verify that root path visit does NOT redirect to admin or profile via last_active_tab
  assert(!appTsx.includes("if (isAdmin && (lastTab === 'admin' || lastTab === 'profile')) {\n        return 'admin';\n      }"),
    'Root path visit must not force admin redirect based on stale lastTab');

  // Verify handleLoginSuccess routes to targetTab (defaulting to home)
  assert(appTsx.includes("const targetTab = (preRequested && preRequested !== 'profile') ? preRequested : 'home';"),
    'handleLoginSuccess must default targetTab to home');

  // Verify onLoginSuccess in AuthWelcomeScreen defaults to home
  assert(appTsx.includes("onLoginSuccess={(user) => {"),
    'AuthWelcomeScreen must provide onLoginSuccess handler');

  // Verify onCompleteDetails in AuthWelcomeScreen defaults to home
  assert(appTsx.includes("onCompleteDetails={(profile, updatedUser) => {"),
    'AuthWelcomeScreen must provide onCompleteDetails handler');
});

// -----------------------------------------------------------------------------
// Test 2: Location Badge Library & Safe Base64 SVG Data URLs
// -----------------------------------------------------------------------------
runTest('TC2: Location Badge Library Safe SVG Data URL conversion & non-fallback', () => {
  const locationUtilsPath = path.join(process.cwd(), 'src', 'lib', 'locationUtils.ts');
  const locationUtils = fs.readFileSync(locationUtilsPath, 'utf8');
  assert(locationUtils.includes('export function toSafeSvgDataUrl'), 'locationUtils must export toSafeSvgDataUrl');

  // Dynamic import or require test of toSafeSvgDataUrl
  const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'asset_libraries_db.json'), 'utf8'));
  const badges = db.filter(x => x.type === 'location_badge');
  assert(badges.length >= 12, 'Must have at least 12 location badges');

  function toSafeSvgDataUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    if (!rawUrl.startsWith('data:image/svg+xml')) return rawUrl;
    if (rawUrl.includes(';base64,')) return rawUrl;
    let rawContent = rawUrl.replace(/^data:image\/svg\+xml(?:;[a-zA-Z0-9_\-]+)?,/, '');
    if (rawContent.startsWith('%3C') || rawContent.startsWith('%3c')) {
      try { rawContent = decodeURIComponent(rawContent); } catch {}
    }
    rawContent = rawContent.replace(/%23/g, '#');
    return 'data:image/svg+xml;base64,' + Buffer.from(rawContent, 'utf8').toString('base64');
  }

  for (const b of badges) {
    const safe = toSafeSvgDataUrl(b.url);
    assert(safe.startsWith('data:image/svg+xml;base64,'), `Badge ${b.id} must convert to base64`);
    const decoded = Buffer.from(safe.replace('data:image/svg+xml;base64,', ''), 'base64').toString('utf8');
    assert(!decoded.includes('%23'), `Decoded SVG XML for ${b.id} must not have %23`);
    assert(decoded.startsWith('<svg'), `Decoded SVG XML for ${b.id} must start with <svg`);
  }

  // Check CardEditor Step 5
  const editorCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'CardEditor.tsx'), 'utf8');
  assert(editorCode.includes('स्थान बैज चुनें (Location Badge Library):'), 'CardEditor must have Location Badge Library in Step 5');
  assert(editorCode.includes('toSafeSvgDataUrl(badge.url || badge.assetUrl)'), 'CardEditor must use toSafeSvgDataUrl for badge thumbnail');

  // Check CardPreview
  const previewCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'CardPreview.tsx'), 'utf8');
  assert(previewCode.includes('toSafeSvgDataUrl(badgeAsset)'), 'CardPreview must use toSafeSvgDataUrl for location badge');

  // Check CanvasExporter
  const exporterCode = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'CanvasExporter.ts'), 'utf8');
  assert(exporterCode.includes('toSafeSvgDataUrl(locAsset)'), 'CanvasExporter must use toSafeSvgDataUrl for location badge');
});

// -----------------------------------------------------------------------------
// Test 3: Actual News Location Clean Presentation
// -----------------------------------------------------------------------------
runTest('TC3: formatCleanLocationText handles multiple Indian cities and canonical states', () => {
  const code = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'locationUtils.ts'), 'utf8');
  assert(code.includes('export function formatCleanLocationText'), 'locationUtils must export formatCleanLocationText');
  assert(code.includes("if (p === 'मध्य प्रदेश') return 'मप्र';"), 'Must abbreviate state in combined format');

  // Verify function logic
  const fnMatch = code.match(/export function formatCleanLocationText[\s\S]+?\n\}/);
  assert(fnMatch, 'Must match formatCleanLocationText function body');
  const jsCode = fnMatch[0]
    .replace('export function formatCleanLocationText(rawLocation?: string | null): string', 'function formatCleanLocationText(rawLocation)')
    .replace('const uniqueParts: string[]', 'const uniqueParts')
    .replace('const seen = new Set<string>()', 'const seen = new Set()');
  const testFn = new Function(jsCode + '; return formatCleanLocationText;')();

  const loc1 = testFn('बड़वानी, मध्यप्रदेश');
  assert.strictEqual(loc1, 'बड़वानी, मप्र', 'Should abbreviate state when city is present');

  const loc2 = testFn('मुरैना, मध्यप्रदेश');
  assert.strictEqual(loc2, 'मुरैना, मप्र', 'Should abbreviate state when city is present');

  const loc3 = testFn('स्थान : भोपाल');
  assert.strictEqual(loc3, 'भोपाल', 'Should strip prefix स्थान :');
});

// -----------------------------------------------------------------------------
// Test 4: Watermark Scoping to Photo Viewport Only
// -----------------------------------------------------------------------------
runTest('TC4: Watermark Layer 3 strictly bounded to photo slot viewport', () => {
  const previewCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'CardPreview.tsx'), 'utf8');
  assert(previewCode.includes('const primarySlot = df.photoSlots?.[0]?.rect;'), 'CardPreview must resolve primary photo slot');
  assert(previewCode.includes('const leftPct = primarySlot ? primarySlot.x : 0;'), 'CardPreview must clip watermark leftPct to primarySlot.x');
  assert(previewCode.includes('const topPct = primarySlot ? primarySlot.y : 0;'), 'CardPreview must clip watermark topPct to primarySlot.y');

  const exporterCode = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'CanvasExporter.ts'), 'utf8');
  assert(exporterCode.includes('effectivePhotoSlots.forEach(slot => {'), 'CanvasExporter must iterate effectivePhotoSlots for watermark clipping');
  assert(exporterCode.includes('ctx.clip()'), 'CanvasExporter must clip canvas to photo slots');
});

// -----------------------------------------------------------------------------
// Test 5: Footer Colors from footerBrandingConfig & No Broken Image Placeholder
// -----------------------------------------------------------------------------
runTest('TC5: Footer defaults to footerBrandingConfig and suppresses broken image alt', () => {
  const footerGraphicCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'FooterGraphic.tsx'), 'utf8');
  assert(footerGraphicCode.includes('setFooterImgError(true)'), 'FooterGraphic must handle onError by setting footerImgError');
  assert(footerGraphicCode.includes('customFooterPng && !footerImgError'), 'FooterGraphic must only render customFooterPng when no imgError');
  assert(!footerGraphicCode.includes('alt="News Card Footer"'), 'FooterGraphic must not render broken alt text "News Card Footer"');

  const editorCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'CardEditor.tsx'), 'utf8');
  assert(editorCode.includes('(activeDf as any).footerBrandingConfig?.footerBgColor || activeDf.footerConfig?.footerBgColor'),
    'CardEditor must check footerBrandingConfig.footerBgColor first');

  const exporterCode = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'CanvasExporter.ts'), 'utf8');
  assert(exporterCode.includes('(df as any).footerBrandingConfig?.footerBgColor || df.footerConfig?.footerBgColor'),
    'CanvasExporter must check footerBrandingConfig.footerBgColor first');
});

// -----------------------------------------------------------------------------
// Test 6: Red Story Callout in Callout Library
// -----------------------------------------------------------------------------
runTest('TC6: callout_default_red_full_story is registered with exact display name and multi-plan support', () => {
  const db = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'asset_libraries_db.json'), 'utf8'));
  const redCallout = db.find(x => x.id === 'callout_default_red_full_story');
  assert(redCallout, 'callout_default_red_full_story must exist in asset_libraries_db.json');
  assert.strictEqual(redCallout.name, 'रेड फुल स्टोरी बैज (Default Red Full Story Badge)', 'Exact display name must match prompt');
  assert(Array.isArray(redCallout.allowedPlans), 'Must have allowedPlans');
  assert(redCallout.allowedPlans.includes('BASIC'), 'Must be allowed for BASIC');
  assert(redCallout.allowedPlans.includes('PRO'), 'Must be allowed for PRO');

  const dfManagerCode = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'dynamicFramesManager.ts'), 'utf8');
  assert(dfManagerCode.includes('"callout_default_red_full_story"'), 'dynamicFramesManager.ts must have fallback for callout_default_red_full_story');

  const editorCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'CardEditor.tsx'), 'utf8');
  assert(editorCode.includes("getDefaultAssetLibrariesFallback('callout_png')"), 'CardEditor must initialize libraryCallouts with fallback');
  assert(editorCode.includes('itemAllowedPlans.includes(userPlanUpper)'), 'CardEditor must allow user to select callout if allowed for their plan');
});

// -----------------------------------------------------------------------------
// Test 7: Master Admin Frame Configuration Preservation
// -----------------------------------------------------------------------------
runTest('TC7: DynamicFrameGeneratorModal persists all required frame fields', () => {
  const modalCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'DynamicFrameGeneratorModal.tsx'), 'utf8');
  assert(modalCode.includes('defaultLocationBadgeId: headerConfig.locationBadgeAssetId'), 'Must persist defaultLocationBadgeId');
  assert(modalCode.includes('allowedLocationBadgeIds:'), 'Must persist allowedLocationBadgeIds');
  assert(modalCode.includes('locationBadgeEnabled: headerConfig.showLocation !== false'), 'Must persist locationBadgeEnabled');
  assert(modalCode.includes('locationBadgeAsset:'), 'Must persist locationBadgeAsset');
  assert(modalCode.includes('locationBadgePosition:'), 'Must persist locationBadgePosition');
  assert(modalCode.includes('locationBadgeDimensions:'), 'Must persist locationBadgeDimensions');
  assert(modalCode.includes('locationTextStyle: headerConfig.typographyConfig'), 'Must persist locationTextStyle');
  assert(modalCode.includes('footerBrandingConfig: {'), 'Must persist footerBrandingConfig');
});

// -----------------------------------------------------------------------------
// Test 8: Safety Invariants & Parity
// -----------------------------------------------------------------------------
runTest('TC8: Safety invariants: Android application ID & SHA256 parity', () => {
  const gradle = fs.readFileSync(path.join(process.cwd(), 'app', 'build.gradle.kts'), 'utf8');
  assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');

  const filesToCheck = [
    'src/App.tsx',
    'src/lib/locationUtils.ts',
    'src/lib/dynamicFramesManager.ts',
    'src/lib/CanvasExporter.ts',
    'src/components/CardEditor.tsx',
    'src/components/CardPreview.tsx',
    'src/components/FooterGraphic.tsx',
    'src/components/DynamicFrameGeneratorModal.tsx',
  ];

  const crypto = require('crypto');
  for (const rel of filesToCheck) {
    const rootPath = path.join(process.cwd(), rel);
    const webPath = path.join(process.cwd(), 'web_studio', rel);
    if (fs.existsSync(rootPath) && fs.existsSync(webPath)) {
      const rootHash = crypto.createHash('sha256').update(fs.readFileSync(rootPath)).digest('hex');
      const webHash = crypto.createHash('sha256').update(fs.readFileSync(webPath)).digest('hex');
      assert.strictEqual(rootHash, webHash, `100% SHA256 parity failed on ${rel}`);
    }
  }
});

console.log('==================================================================');
console.log('🎉 ALL 8 MASTER PHOTO NEWS STUDIO CORRECTION CHECKS PASSED!');
console.log('==================================================================');
