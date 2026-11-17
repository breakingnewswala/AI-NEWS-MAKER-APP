/**
 * AI NEWS MAKER — Master Production Bug Fix & Frame Rendering Audit Verification Suite
 * 
 * Verifies:
 * - Priority 1: Favorites Data Integrity & Reconciliation
 * - Priority 2: News Thumbnail Fallback & Container Rendering (No Pitch Black Box)
 * - Priority 3: PWA Install Prompt (Dismissible, Hidden on Installed/Standalone/APK)
 * - Priority 4: News-to-Graphic Action (Watchdog, No Quota Consumption on Navigation, Loader Sync)
 * - Priority 5: Admin Authentication Warning Guard (Ignored for Anonymous/Non-Admin Users)
 * - Priority 6: Default Story Callout ("callout_story_live_update" Ruby Live Pulse SVG)
 * - Priority 7: Default Location Badge ("loc_style_vintage_stamp" Target SVG)
 * - Priority 8: Text Watermark Layer 1.5 Strict Clipping & Mutual Exclusion
 * - Priority 9: No Artificial 95% White Headline Box in CanvasExporter
 * - Priority 10: Centered Footer Bar with Proportional Width (90-92%) & Formatted Phone Spacing
 * - Parity: 100% SHA256 / content consistency between root and web_studio/
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- STARTING MASTER PRODUCTION BUG FIX & FRAME RENDERING AUDIT VERIFICATION ---');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// 1. Verify Dynamic Frames Database
runTest('Dynamic Frames DB: Frame df_1794406067554_albmw default callout & location badge', () => {
  const dbPath = path.join(process.cwd(), 'dynamic_frames_db.json');
  assert(fs.existsSync(dbPath), 'dynamic_frames_db.json must exist');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const frames = Array.isArray(db) ? db : db.frames;
  const targetFrame = frames.find(f => f.id === 'df_1794406067554_albmw');
  assert(targetFrame, 'Target frame df_1794406067554_albmw must exist');

  // Priority 6: Story Callout
  assert.strictEqual(targetFrame.calloutAssetId, 'callout_story_live_update', 'Frame calloutAssetId must be callout_story_live_update');
  assert(targetFrame.calloutAssetUrl && targetFrame.calloutAssetUrl.startsWith('data:image/svg+xml;'), 'calloutAssetUrl must be valid SVG data URI');
  assert.strictEqual(targetFrame.fullStoryCalloutConfig?.calloutAssetId, 'callout_story_live_update', 'fullStoryCalloutConfig.calloutAssetId must match');
  assert(targetFrame.fullStoryCalloutConfig?.text.includes('ताजा अपडेट'), 'Callout text must be fresh update Hindi copy');

  // Priority 7: Location Badge
  assert.strictEqual(targetFrame.locationBadgeAssetId, 'loc_style_vintage_stamp', 'Frame locationBadgeAssetId must be loc_style_vintage_stamp');
  assert(targetFrame.headerConfig?.manualLocationAsset && targetFrame.headerConfig.manualLocationAsset.startsWith('data:image/svg+xml;'), 'manualLocationAsset must be valid SVG data URI');
  assert.strictEqual(targetFrame.headerConfig?.locationBadgeAssetId, 'loc_style_vintage_stamp', 'headerConfig.locationBadgeAssetId must match');

  // Priority 10: Footer Width
  assert.strictEqual(targetFrame.footerConfig?.footerWidthPct, 92, 'footerWidthPct must be 92');
});

// 2. Verify Backend Route /api/asset-libraries in server.ts
runTest('Backend: /api/asset-libraries public GET route exists in server.ts', () => {
  const serverPath = path.join(process.cwd(), 'server.ts');
  const code = fs.readFileSync(serverPath, 'utf8');
  assert(code.includes('app.get(["/api/asset-libraries", "/api/admin/asset-libraries"]'), 'server.ts must expose public /api/asset-libraries GET');
});

// 3. Verify CanvasExporter Frame Audit (Priorities 6, 7, 8, 9, 10)
runTest('CanvasExporter: Audit of Layers 1.5, 2, Callout, Location Badge, Headline Box & Footer', () => {
  const exporterPath = path.join(process.cwd(), 'src', 'lib', 'CanvasExporter.ts');
  const code = fs.readFileSync(exporterPath, 'utf8');

  // Priority 8: Text Watermark in Layer 1.5 with ctx.clip()
  assert(code.includes('LAYER 1.5: DEDICATED TEXT WATERMARK'), 'CanvasExporter must have Layer 1.5 Text Watermark');
  assert(code.includes('ctx.clip()'), 'Text watermark must be clipped to photo slots');
  assert(code.includes('!isImageWatermarkActive'), 'Text watermark must be mutually exclusive with image watermark');
  assert(!code.includes('roundRect(hx, hy, hw, hh, 8);'), 'Priority 9: Artificial white rounded rect must NOT be drawn behind headline');

  // Priority 6 & 7: Asset lookups by ID
  assert(code.includes('getAssetLibraryItemById(badgeId)'), 'Location badge must resolve from library by ID');
  assert(code.includes('getAssetLibraryItemById(calloutId)'), 'Callout must resolve from library by ID');

  // Priority 10: Footer centered & phone formatted
  assert(code.includes('borderW = Math.round((footerWidthPct / 100) * width)'), 'Footer top border must be centered with proportional width');
  assert(code.includes('displayPhone = rawDisplayPhone.replace(/^(\\+91\\s*)(\\d{5})(\\d{5})$/, \'$1$2 $3\')'), 'Phone number must have 5-digit spacing');
});

// 4. Verify CardPreview & CardEditor Live Preview Parity
runTest('CardPreview & CardEditor: Live preview engine audit', () => {
  const previewPath = path.join(process.cwd(), 'src', 'components', 'CardPreview.tsx');
  const previewCode = fs.readFileSync(previewPath, 'utf8');

  // Watermark clipped to photo slots
  assert(previewCode.includes('df.photoSlots?.[0]?.rect?.height'), 'CardPreview must clip text watermark to photo slot bounds');
  assert(previewCode.includes('getAssetLibraryItemById(badgeId)'), 'CardPreview must resolve location badge by ID');
  assert(previewCode.includes('getAssetLibraryItemById(calloutId)'), 'CardPreview must resolve callout by ID');
  assert(previewCode.includes('width: `${card.footerWidthPct || df.footerConfig?.footerWidthPct || 92}%`'), 'CardPreview footer must support card.footerWidthPct or 92% default');

  const editorPath = path.join(process.cwd(), 'src', 'components', 'CardEditor.tsx');
  const editorCode = fs.readFileSync(editorPath, 'utf8');
  assert(editorCode.includes('/api/asset-libraries?type=custom_footer'), 'CardEditor must fetch from public /api/asset-libraries');
  assert(editorCode.includes('callout_story_live_update'), 'CardEditor must auto-populate default callout_story_live_update');
  assert(editorCode.includes('loc_style_vintage_stamp'), 'CardEditor must auto-populate default loc_style_vintage_stamp');
});

// 5. Verify HomeScreenWeb (Priorities 1, 2, 3)
runTest('HomeScreenWeb: Favorites integrity, News thumbnail fallback, PWA install prompt', () => {
  const homePath = path.join(process.cwd(), 'src', 'components', 'HomeScreenWeb.tsx');
  const homeCode = fs.readFileSync(homePath, 'utf8');

  // Priority 1: Favorites Count & TDZ Safety
  assert(homeCode.includes('const favoriteCount = validFavoritePosts.length;'), 'favoriteCount must be derived from validFavoritePosts.length');
  assert(homeCode.includes('{favoriteCount > 0 && ('), 'Favorites pill & button must render favoriteCount');
  assert(homeCode.includes('localStorage.setItem(key, JSON.stringify(validIds))'), 'HomeScreenWeb must reconcile orphaned favorite IDs');

  const combinedPostsIdx = homeCode.indexOf('const combinedPosts = useMemo(');
  const favoriteReconcileIdx = homeCode.indexOf('// Priority 1: Reconcile orphaned/stale favorite IDs');
  assert(combinedPostsIdx !== -1, 'combinedPosts declaration must exist');
  assert(favoriteReconcileIdx !== -1, 'Favorite reconciliation effect must exist');
  assert(combinedPostsIdx < favoriteReconcileIdx, 'TDZ PREVENTION: combinedPosts must be declared before Favorite Reconciliation effect');
  assert(homeCode.includes('[combinedPosts, userFavorites, currentUser?.email]'), 'Favorite reconciliation effect must include [combinedPosts, userFavorites, currentUser?.email] in dependency array');

  // Priority 2: News Thumbnail Fallback
  assert(homeCode.includes('/assets/sample_news_bus.svg'), 'Thumbnail onError must fall back to /assets/sample_news_bus.svg');
  assert(homeCode.includes('from-slate-800 to-slate-900'), 'Thumbnail container must have neutral gradient placeholder to avoid pitch black box');

  // Priority 3: PWA Install Prompt
  assert(homeCode.includes('!isAppInstalled && !isPwaDismissed'), 'PWA banner must be gated on !isAppInstalled && !isPwaDismissed');
  assert(homeCode.includes('localStorage.setItem(\'ai_news_pwa_install_dismissed\', \'true\')'), 'Close button must persist dismissal');
});

// 6. Verify App.tsx (Priorities 4 & 5)
runTest('App.tsx: Admin auth toast guard & Graphic action watchdog / quota protection', () => {
  const appPath = path.join(process.cwd(), 'src', 'App.tsx');
  const appCode = fs.readFileSync(appPath, 'utf8');

  // Priority 5: Admin Auth toast guard
  assert(appCode.includes('if (!currentUser) return;') && appCode.includes('if (currentUser && !isUserAdmin(currentUser)) return;'), 'handleAdminAuthRequired must guard against null currentUser and non-admins');

  // Priority 4: Graphic Action
  assert(!appCode.includes('/api/user/consume-graphic-creation-quota'), 'Simple navigation in handleOpenStudioWithNews must NOT consume daily quota');
  assert(appCode.includes('ai_news_hide_branded_loader'), 'App.tsx must listen to ai_news_hide_branded_loader to prevent stuck infinite loading');
  assert(appCode.includes('durationSeconds: 2.5'), 'handleOpenStudioWithNews must set smooth durationSeconds on brandedLoader');
});

// 7. Verify NewsDetailModal (Priority 2)
runTest('NewsDetailModal: Thumbnail container fallback', () => {
  const modalPath = path.join(process.cwd(), 'src', 'components', 'NewsDetailModal.tsx');
  const modalCode = fs.readFileSync(modalPath, 'utf8');
  assert(!modalCode.includes('(e.target as HTMLElement).style.display = \'none\''), 'NewsDetailModal must NOT hide img and leave empty black box');
  assert(modalCode.includes('(e.target as HTMLImageElement).src = \'/assets/sample_news_bus.svg\''), 'NewsDetailModal must fall back to sample_news_bus.svg');
});

// 8. Verify 100% Mirroring with web_studio/
runTest('web_studio Parity: All modified files must be 100% identical to src/', () => {
  const filesToVerify = [
    'src/App.tsx',
    'src/components/CardEditor.tsx',
    'src/components/CardPreview.tsx',
    'src/components/FooterGraphic.tsx',
    'src/components/HomeScreenWeb.tsx',
    'src/components/NewsDetailModal.tsx',
    'src/lib/CanvasExporter.ts',
    'src/lib/dynamicFramesManager.ts',
    'server.ts',
    'dynamic_frames_db.json'
  ];

  filesToVerify.forEach(f => {
    const rootPath = path.join(process.cwd(), f);
    const webPath = path.join(process.cwd(), 'web_studio', f);
    assert(fs.existsSync(rootPath), `Root file ${rootPath} must exist`);
    assert(fs.existsSync(webPath), `Web studio file ${webPath} must exist`);
    const rootContent = fs.readFileSync(rootPath, 'utf8');
    const webContent = fs.readFileSync(webPath, 'utf8');
    assert.strictEqual(rootContent, webContent, `File ${f} must have 100% identical content in web_studio`);
  });
});

// 9. Full Temporal Dead Zone (TDZ) AST Audit across all critical components
runTest('Temporal Dead Zone (TDZ) AST Audit: Zero hook dependency ordering violations', () => {
  const { execSync } = require('child_process');
  const result = execSync('node tests/ast_tdz_checker.cjs', { encoding: 'utf8' });
  assert(result.includes('Total issues found: 0'), 'ast_tdz_checker must report 0 issues');
});

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
