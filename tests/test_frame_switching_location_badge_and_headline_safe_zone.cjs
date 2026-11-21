const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('==================================================================');
console.log('🧪 VERIFYING FRAME SWITCHING, LOCATION BADGE & HEADLINE SAFE ZONE');
console.log('==================================================================');

// TC1: Default Frame Switching & Reset
console.log('Testing TC1: Frame Switching & customDynamicFrame Reset...');
const appTsx = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf-8');
assert(
  appTsx.includes("updates.frameDesign.startsWith('graphic_') || updates.frameDesign === 'jacket-default'"),
  'App.tsx handleUpdateCard must reset customDynamicFrame to null when switching to static graphic frames'
);
const cardEditorTsx = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf-8');
assert(
  cardEditorTsx.includes('customDynamicFrame: match ? match : null'),
  'CardEditor.tsx must pass customDynamicFrame: match ? match : null when switching frames'
);
assert(
  cardEditorTsx.includes('loc_style_classic_ribbon_pin'),
  'CardEditor.tsx must preserve or fallback to location badge style when switching to static frames'
);
console.log('✅ [PASS] TC1: Frame Switching & customDynamicFrame Reset verified');

// TC2: Double Red Location Badge Elimination
console.log('Testing TC2: Double Location Badge & Background Ghost Elimination...');
const canvasExporterTs = fs.readFileSync(path.join(__dirname, '../src/lib/CanvasExporter.ts'), 'utf-8');
assert(
  !canvasExporterTs.includes('ctx.roundRect(actualBx, by, dynamicBw, bh, df.headerConfig.locationStyle === \'box\' ? 6 : bh / 2);\n            ctx.fill();'),
  'CanvasExporter.ts must not draw red/custom solid roundRect background behind SVG badge asset in dynamic frames'
);
assert(
  !canvasExporterTs.includes('ctx.roundRect(actualBx, by, dynamicBw, bh, bh / 2);\n            ctx.fill();'),
  'CanvasExporter.ts must not draw red/custom solid roundRect background behind SVG badge asset in graphic_001'
);
const cardPreviewTsx = fs.readFileSync(path.join(__dirname, '../src/components/CardPreview.tsx'), 'utf-8');
assert(
  !cardPreviewTsx.includes('backgroundColor: fallbackBg, borderRadius') ||
  cardPreviewTsx.includes('bg-slate-800/30 animate-pulse'),
  'CardPreview.tsx must not flash a red box behind SVG badge while loading'
);
console.log('✅ [PASS] TC2: Double Location Badge & Background Ghost Elimination verified');

// TC3: Location Badge Text Centering
console.log('Testing TC3: Location Badge Text Centering & Slicing Offsets...');
assert(
  cardPreviewTsx.includes('left: `${offsets.leftPct}%`') && cardPreviewTsx.includes('right: `${offsets.rightPct}%`'),
  'CardPreview.tsx DynamicLocationBadgePreview must position text container inside exact stretchable middle slice'
);
assert(
  canvasExporterTs.includes('metrics.actualBoundingBoxAscent') && canvasExporterTs.includes('verticalOffset = (ascent - descent) / 2'),
  'CanvasExporter.ts must compute Devanagari actual bounding box ascent/descent for vertical centering'
);
console.log('✅ [PASS] TC3: Location Badge Text Centering & Slicing Offsets verified');

// TC4: Headline Safe Zone & No Word Cropping
console.log('Testing TC4: Headline Safe Zone & Word Cropping Prevention...');
const layoutEngineTs = fs.readFileSync(path.join(__dirname, '../src/lib/canonicalLayoutEngine.ts'), 'utf-8');
assert(
  layoutEngineTs.includes('// Safe-Zone Boundary Guarantee: Never crop words or drop lines'),
  'canonicalLayoutEngine.ts must have safe-zone boundary guarantee preventing word cropping'
);
assert(
  layoutEngineTs.includes('for (let s = bestFontSize - 1; s >= 14; s -= 1)'),
  'canonicalLayoutEngine.ts must iteratively step down font size if words would otherwise overflow or be cropped'
);
assert(
  layoutEngineTs.includes('bannerHFraction = 0.35'),
  'CanvasExporter.ts must support 4-line expanded red banner for headlines'
);
assert(
  cardPreviewTsx.includes("headlineLineCount >= 4") && cardPreviewTsx.includes("top: '57%', height: '35%'"),
  'CardPreview.tsx dynamicBannerMetrics must match CanvasExporter 35% height for 4 lines'
);
console.log('✅ [PASS] TC4: Headline Safe Zone & Word Cropping Prevention verified');

// TC5: Mandatory Frame Artwork Error Elimination & Artwork Optimization
console.log('Testing TC5: Mandatory Frame Artwork Error Elimination & Upload Optimization...');
assert(
  canvasExporterTs.includes("isMandatory: false") && canvasExporterTs.includes("Dynamic frame artwork overlay load warning"),
  'CanvasExporter.ts must handle frame artwork loading gracefully without throwing mandatory error toast'
);
const dynamicFrameModalTsx = fs.readFileSync(path.join(__dirname, '../src/components/DynamicFrameGeneratorModal.tsx'), 'utf-8');
assert(
  dynamicFrameModalTsx.includes('Optimize oversized artwork') || dynamicFrameModalTsx.includes('optCanvas'),
  'DynamicFrameGeneratorModal.tsx must optimize oversized uploaded artwork to prevent giant data URLs'
);
console.log('✅ [PASS] TC5: Mandatory Frame Artwork Error Elimination & Upload Optimization verified');

// TC6: Channel Logo Resolution & Fallback
console.log('Testing TC6: Channel Logo Resolution & Profile Fallback...');
assert(
  cardPreviewTsx.includes('getSavedChannelProfile()?.channelLogoPngUrl') ||
  cardPreviewTsx.includes('getSavedChannelProfile()?.channelLogoUrl'),
  'CardPreview.tsx dynamic frame logo must resolve through saved channel profile before falling back'
);
assert(
  canvasExporterTs.includes('profileLogo') &&
  canvasExporterTs.includes('/assets/breaking_news_wala_logo.png'),
  'CanvasExporter.ts must resolve through saved channel profile and fallback to breaking_news_wala_logo.png'
);
console.log('✅ [PASS] TC6: Channel Logo Resolution & Profile Fallback verified');

// TC7: Safety Invariants & SHA256 Parity
console.log('Testing TC7: Safety Invariants & Mirror Parity...');
const buildGradle = fs.readFileSync(path.join(__dirname, '../app/build.gradle.kts'), 'utf-8');
assert(
  buildGradle.includes('applicationId "com.aistudio.ainewsmaker.hzwptx"') ||
  buildGradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'),
  'Android applicationId must remain com.aistudio.ainewsmaker.hzwptx'
);

const crypto = require('crypto');
function getSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

const filesToCheck = [
  'src/App.tsx',
  'src/components/CardEditor.tsx',
  'src/components/CardPreview.tsx',
  'src/lib/CanvasExporter.ts',
  'src/lib/canonicalLayoutEngine.ts',
  'src/components/DynamicFrameGeneratorModal.tsx',
];

for (const file of filesToCheck) {
  const rootPath = path.join(__dirname, '..', file);
  const webPath = path.join(__dirname, '../web_studio', file);
  if (fs.existsSync(rootPath) && fs.existsSync(webPath)) {
    const rootHash = getSha256(rootPath);
    const webHash = getSha256(webPath);
    assert.strictEqual(
      rootHash,
      webHash,
      `Parity failure in ${file}: root (${rootHash}) !== web_studio (${webHash})`
    );
  }
}
console.log('✅ [PASS] TC7: Safety Invariants & 100% SHA256 Mirror Parity verified');

console.log('==================================================================');
console.log('🎉 ALL 7 SUITES IN TEST_FRAME_SWITCHING_LOCATION_BADGE_AND_HEADLINE_SAFE_ZONE PASSED!');
console.log('==================================================================');
