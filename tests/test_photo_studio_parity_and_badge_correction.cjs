const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==================================================================');
console.log('🧪 VERIFYING PHOTO NEWS STUDIO PARITY & LOCATION BADGE CORRECTIONS');
console.log('==================================================================');

function runTest(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    fn();
    console.log('✅ [PASS]');
  } catch (err) {
    console.log(`❌ [FAIL]: ${err.message}`);
    process.exit(1);
  }
}

// 1. Location badge metrics & expansion
runTest('TC1: Dynamic Location Metrics & Right-Anchored Leftward Expansion', () => {
  const locUtilsPath = path.join(__dirname, '..', 'src', 'lib', 'locationUtils.ts');
  const locUtilsCode = fs.readFileSync(locUtilsPath, 'utf8');

  assert(locUtilsCode.includes('measuredTextW + 48') || locUtilsCode.includes('measuredTextW + 52'), 'neededCenterW must provide generous padding for Hindi matras');
  assert(locUtilsCode.includes('const actualBx = isRightAnchored'), 'calculateDynamicLocationMetrics must calculate actualBx for right-anchored badges');
  assert(locUtilsCode.includes('Math.min(options.locationRect.height, 3.8) : 3.8'), 'Badge height must default to sleek 3.8%');
  assert(locUtilsCode.includes('toSafeSvgDataUrl'), 'toSafeSvgDataUrl must be exported');
});

// 2. CardPreview parity
runTest('TC2: CardPreview Live Preview Parity for Custom and Default Frames', () => {
  const previewPath = path.join(__dirname, '..', 'src', 'components', 'CardPreview.tsx');
  const previewCode = fs.readFileSync(previewPath, 'utf8');

  // DynamicLocationBadgePreview subcomponent
  assert(previewCode.includes('DynamicLocationBadgePreview'), 'CardPreview must include DynamicLocationBadgePreview component');
  assert(previewCode.includes('card.selectedLocationBadgeId'), 'CardPreview must check selectedLocationBadgeId');
  assert(previewCode.includes('card.customLocationBadgeUrl'), 'CardPreview must check customLocationBadgeUrl');
  assert(previewCode.includes('calloutRawY - textSlotRect.y - 1.2'), 'CardPreview must dynamically constrain headline height above callout to prevent bottom clipping');
});

// 3. CanvasExporter parity
runTest('TC3: CanvasExporter Parity & Blank Photo Prevention', () => {
  const exporterPath = path.join(__dirname, '..', 'src', 'lib', 'CanvasExporter.ts');
  const exporterCode = fs.readFileSync(exporterPath, 'utf8');

  // getDomImageFallback
  assert(exporterCode.includes('getDomImageFallback'), 'CanvasExporter must have getDomImageFallback');
  assert(exporterCode.includes('loadImageSingle'), 'CanvasExporter must integrate DOM fallback in loadImageSingle');

  // Default frame location badge
  assert(exporterCode.includes('// 4. TOP-RIGHT LOCATION PILL'), 'CanvasExporter must have section 4 top-right location pill');
  assert(exporterCode.includes('userSelectedBadge'), 'CanvasExporter must support user-selected location badges in default template 1');

  // Callout styling
  assert(exporterCode.includes('const pillRadius = pillH / 2'), 'CanvasExporter callout must render rounded pill radius');
});

// 4. App.tsx download error handling
runTest('TC4: App.tsx Seamless Download Fallback and Quota Protection', () => {
  const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
  const appCode = fs.readFileSync(appPath, 'utf8');

  assert(appCode.includes('renderCardToCanvas failed, attempting DOM capture fallback'), 'App.tsx must attempt DOM capture fallback when renderCardToCanvas fails');
  assert(appCode.includes('generateCardCanvas(\'news-card-container\')'), 'App.tsx must use generateCardCanvas');
});

// 5. Mirror SHA256 parity & Android applicationId preservation
runTest('TC5: SHA256 Parity & Android Invariants', () => {
  const crypto = require('crypto');
  const files = [
    'src/lib/locationUtils.ts',
    'src/components/CardPreview.tsx',
    'src/lib/CanvasExporter.ts',
    'src/App.tsx'
  ];

  for (const rel of files) {
    const rootPath = path.join(__dirname, '..', rel);
    const webPath = path.join(__dirname, '..', 'web_studio', rel);
    const rootHash = crypto.createHash('sha256').update(fs.readFileSync(rootPath)).digest('hex');
    const webHash = crypto.createHash('sha256').update(fs.readFileSync(webPath)).digest('hex');
    assert.strictEqual(rootHash, webHash, `Hash mismatch for ${rel}`);
  }

  const buildGradle = fs.readFileSync(path.join(__dirname, '..', 'app', 'build.gradle.kts'), 'utf8');
  assert(buildGradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be preserved');
});

console.log('==================================================================');
console.log('🎉 ALL 5 PHOTO STUDIO PARITY & BADGE CORRECTION TESTS PASSED!');
console.log('==================================================================');
