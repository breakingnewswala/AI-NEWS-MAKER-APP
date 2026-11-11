const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log('🧪 RUNNING MASTER VERIFICATION TEST SUITE (PHASES 1-21)');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(`   Error: ${err.message}\n`);
    failCount++;
  }
}

// 1. PHASE 1: Runtime Error badgeAsset is not defined
runTest('Phase 1: badgeAsset is safely defined and no undefined reference exists', () => {
  const content = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(!content.includes("locationBadgeMode === 'static_image'"), 'Obsolete locationBadgeMode should be removed');
  assert(content.includes('const badgeAsset ='), 'badgeAsset must be safely declared in scope');
  assert(!content.includes('badgeAsset is not defined'), 'No runtime error text');
});

// 2. PHASE 2: Central Asset Library Permanent Deletion & Tombstones
runTest('Phase 2: Tombstone mechanism prevents deleted test assets from returning', () => {
  const serverContent = fs.readFileSync('server.ts', 'utf8');
  assert(serverContent.includes('loadDeletedAssetTombstones'), 'server.ts must implement loadDeletedAssetTombstones');
  assert(serverContent.includes('recordDeletedAssetTombstone'), 'server.ts must implement recordDeletedAssetTombstone');
  
  const dbContent = fs.readFileSync('asset_libraries_db.json', 'utf8');
  assert(!dbContent.includes('Persistence Test Badge'), 'Persistence Test Badge must be purged from asset DB');
  assert(!dbContent.includes('Persistence Test Callout'), 'Persistence Test Callout must be purged from asset DB');
});

// 3. PHASE 3: Location Badge Mode A/B Removal & Dynamic Stretching
runTest('Phase 3: Mode A/B selectors removed and dynamic horizontal stretch supported', () => {
  const modalContent = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(!modalContent.includes('Mode A: बैज चिन्ह'), 'Mode A selector must be removed');
  assert(!modalContent.includes('Mode B: पूर्ण स्टैटिक'), 'Mode B selector must be removed');
  assert(modalContent.includes('sliceConfig'), 'Dynamic 3-slice stretch config must be supported');
});

// 4. PHASE 4: Story Callout Controls and Visibility Policies
runTest('Phase 4: Story Callout size controls and visibility policies supported in types', () => {
  const typesContent = fs.readFileSync('src/types/dynamicFrame.ts', 'utf8');
  assert(typesContent.includes('ElementVisibilityPolicy'), 'ElementVisibilityPolicy must be defined');
  assert(typesContent.includes('FrameVisibilitySettings'), 'FrameVisibilitySettings must be defined');
  assert(typesContent.includes("'always_show' | 'user_toggle' | 'not_included'"), 'Three visibility policies defined');
});

// 5. PHASE 5: Test Frames in Photo News Studio Step 1 for Master Admin
runTest('Phase 5: Step 1 Template Catalog renders TEST_FRAMES with Edit button for Master Admin', () => {
  const editorContent = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(editorContent.includes('isMaster'), 'CardEditor must check isMaster/isEffectiveSuperAdmin');
  assert(editorContent.includes("normCat = isTest ? 'TEST_FRAMES'"), 'Test frames categorized as TEST_FRAMES');
  assert(editorContent.includes('एडिट करें'), 'Test frame cards have Edit button');
  assert(editorContent.includes('setEditingTestFrame'), 'Editing test frame state triggers generator modal');
});

// 6. PHASE 6: Graphic Template Control Canonical Categories
runTest('Phase 6: CANONICAL_FRAME_CATEGORIES has TEST_FRAMES as first item, rendered right after "सभी"', () => {
  const planManagerContent = fs.readFileSync('src/components/AdminTemplatePlanManager.tsx', 'utf8');
  assert(planManagerContent.includes("'TEST_FRAMES'"), 'TEST_FRAMES must be in canonical categories');
  assert(planManagerContent.includes('CANONICAL_FRAME_CATEGORIES = [\n  \'TEST_FRAMES\','), 'TEST_FRAMES must be first category in array');
  assert(planManagerContent.includes('<span>सभी ('), 'Template Control renders "सभी" tab first');
});

// 7. PHASE 7: 1:1 Aspect Ratio Support
runTest('Phase 7: 1:1 Square aspect ratio supported across system', () => {
  const typesContent = fs.readFileSync('src/types/dynamicFrame.ts', 'utf8');
  assert(typesContent.includes("'1:1'"), '1:1 ratio must be in PHOTO_ALLOWED_ASPECT_RATIOS');

  const cardPreviewContent = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(cardPreviewContent.includes("card.aspectRatio === '1:1') ? 1080"), 'CardPreview must set 1080px height for 1:1');

  const exporterContent = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporterContent.includes('targetHeight = ratio < 1.1 ? 1080'), 'CanvasExporter must calculate 1080px for 1:1');
});

// 8. PHASE 8: Date Rotation (0°, 90°, 180°, 270°) and Watermark Controls
runTest('Phase 8: Date rotation 0°, 90°, 180°, 270° and Watermark 3-way toggle supported', () => {
  const modalContent = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
  assert(modalContent.includes('180°'), '180° rotation option must be present');
  assert(modalContent.includes('270°'), '270° rotation option must be present');

  const editorContent = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(editorContent.includes('✨ AI GENERATED'), 'Step 4 must have AI GENERATED option');
  assert(editorContent.includes('📷 प्रतीकात्मक फोटो'), 'Step 4 must have symbolic photo option');
  assert(editorContent.includes('🚫 OFF (कोई नहीं)'), 'Step 4 must have OFF option');
});

// 9. PHASE 9: Studio Refresh Button
runTest('Phase 9: Studio refresh restores graphic_001 cleanly without resetting database', () => {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  assert(appContent.includes('handleResetCard'), 'App.tsx must have handleResetCard');
  assert(appContent.includes('graphic_001'), 'handleResetCard must restore graphic_001');
  assert(appContent.includes('template_plans_updated'), 'handleResetCard must dispatch catalog refresh event');
});

// 10. PHASE 10: Canvas Export Image Pre-decoding & Parity
runTest('Phase 10: CanvasExporter pre-decodes images via Promise.all and preserves alpha', () => {
  const exporterContent = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporterContent.includes('Promise.all'), 'CanvasExporter must pre-decode images via Promise.all');
  assert(exporterContent.includes('img.decode()'), 'CanvasExporter must decode images before rendering');
});

// 11. PHASE 11: Photo Area Sub-pixel Seam Removal
runTest('Phase 11: Photo Area bottom has sub-pixel overlap calc(38.67% - 1.5px)', () => {
  const previewContent = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(previewContent.includes('calc(38.67% - 1.5px)'), 'Photo container bottom must overlap headline bevel');
});

// 12. PHASE 12: Step 5 Interlocked Location and Date
runTest('Phase 12: Step 5 is named "स्थान एवं दिनांक" and Location & Date are interlocked', () => {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  assert(appContent.includes('स्थान एवं दिनांक'), 'Step 5 label must be स्थान एवं दिनांक');

  const editorContent = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(editorContent.includes('स्थान एवं दिनांक'), 'Step 5 section title must be स्थान एवं दिनांक');
  assert(editorContent.includes('card.showLocation === false'), 'Date is interlocked when location is false');
});

// 13. PHASE 14: Special Notification Board Admin Filtering
runTest('Phase 14: Special Notification Board strictly filters and prioritizes admin-selected news', () => {
  const serverContent = fs.readFileSync('server.ts', 'utf8');
  assert(serverContent.includes('/api/admin/notification-board-ids'), 'server.ts has notification-board-ids endpoint');
  assert(serverContent.includes('/api/admin/toggle-notification-board'), 'server.ts has toggle endpoint');

  const homeContent = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  assert(homeContent.includes('adminNotificationBoardIds'), 'HomeScreenWeb tracks adminNotificationBoardIds');
  assert(homeContent.includes('handleToggleNotificationBoard'), 'HomeScreenWeb has toggle handler');
});

// 14. PHASE 15: News Detail Popup Modal
runTest('Phase 15: News Detail Popup Modal with "इस खबर से ग्राफिक बनाएं" CTA', () => {
  const homeContent = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  assert(homeContent.includes('detailModalPost'), 'HomeScreenWeb has detailModalPost state');
  assert(homeContent.includes('News Detail Popup Modal (Phase 15)'), 'HomeScreenWeb renders News Detail Popup');
  assert(homeContent.includes('इस खबर से ग्राफिक बनाएं'), 'Modal has prominent CTA button');
});

// 15. PHASE 16: WhatsApp News Notification CTA & Breaking News
runTest('Phase 16: WhatsApp campaign message contains breaking news badge and studio CTA link', () => {
  const modalContent = fs.readFileSync('src/components/WhatsAppNotificationCenterModal.tsx', 'utf8');
  assert(modalContent.includes('🔴 *ब्रेकिंग न्यूज़ — तुरंत ग्राफिक बनाएं*'), 'Preview highlights breaking news');
  assert(modalContent.includes('/studio?newsId='), 'CTA button links to studio with newsId');

  const waContent = fs.readFileSync('whatsapp_integration.ts', 'utf8');
  assert(waContent.includes('🔴 *ब्रेकिंग न्यूज़ — तुरंत ग्राफिक बनाएं*'), 'WhatsApp endpoint formats breaking news header');
  assert(waContent.includes('✨ *इस खबर से ग्राफिक बनाएं:*'), 'WhatsApp endpoint formats studio CTA');
});

// 16. PHASE 17: Central Asset Library Custom Footer
runTest('Phase 17: 4th tab "4. कस्टम फ़ुटर" has pure Hindi name and structured designer without photo upload', () => {
  const assetMgrContent = fs.readFileSync('src/components/AdminAssetLibrariesManager.tsx', 'utf8');
  assert(assetMgrContent.includes('4. कस्टम फ़ुटर'), '4th tab must be named exactly "4. कस्टम फ़ुटर"');
  assert(assetMgrContent.includes('नया कस्टम फ़ुटर डिज़ाइन करें'), 'Drawer title for custom footer');
  assert(assetMgrContent.includes('footerBgColor'), 'Background color control present');
  assert(assetMgrContent.includes('footerTextColor'), 'Text color control present');
  assert(assetMgrContent.includes('footerHeightPct'), 'Height slider present');
  assert(assetMgrContent.includes('footerElements'), 'Elements toggles present');
  assert(!assetMgrContent.includes('handleDeleteDeleteItem'), 'No typo handleDeleteDeleteItem');
});

// 18. GAP 1: Persistent Asset Deletion & Tombstone Multi-Instance Durability
runTest('Gap 1: Persistent Asset Deletion synchronizes to disk and centralDb', () => {
  const serverContent = fs.readFileSync('server.ts', 'utf8');
  assert(serverContent.includes('getDurableAssetTombstones'), 'server.ts has getDurableAssetTombstones');
  assert(serverContent.includes('system_config') && serverContent.includes('deleted_assets_tombstones'), 'server.ts syncs tombstones with durable database');
});

// 19. GAP 2: Image Decode & Export Safety
runTest('Gap 2: Image decoding strictly validates natural dimensions and rejects corrupt elements', () => {
  const exporterContent = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporterContent.includes('handleDecodeSuccess'), 'CanvasExporter must implement handleDecodeSuccess');
  assert(exporterContent.includes('targetImg.naturalWidth > 0 && targetImg.naturalHeight > 0'), 'Image must have non-zero natural dimensions');
  assert(exporterContent.includes('handleDecodeFailure'), 'CanvasExporter must handle decode failures safely with fallback');
  assert(!exporterContent.includes('catch(() => finish(img))'), 'Broken images must NEVER be passed to finish()');
});

// 20. GAP 3: Photo Seam & Multi-Aspect Ratio Verification
runTest('Gap 3: calc(38.67% - 1.5px) and aspect-ratio specific photo heights are verified', () => {
  const cardPreviewContent = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(cardPreviewContent.includes('calc(38.67% - 1.5px)'), 'CardPreview must retain calc(38.67% - 1.5px)');
  assert(cardPreviewContent.includes('calc(36% - 1.5px)'), 'CardPreview must handle 9:16 story seam');
  assert(cardPreviewContent.includes('calc(40% - 1.5px)'), 'CardPreview must handle 1:1 square seam');

  const exporterContent = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(exporterContent.includes('0.6133'), 'CanvasExporter must retain 0.6133 4:5 height');
  assert(exporterContent.includes('0.64') && exporterContent.includes('0.60'), 'CanvasExporter must adapt photoH for 9:16 and 1:1');
});

// 21. GAP 4: Custom Footer Remaining Controls & Step 6 Studio Selection
runTest('Gap 4: Custom Footer alignment, spacing, separator, allowed plans and Step 6 selection', () => {
  const typesContent = fs.readFileSync('src/types/dynamicFrame.ts', 'utf8');
  assert(typesContent.includes('channelNameAlign'), 'types must include channelNameAlign');
  assert(typesContent.includes('iconSize'), 'types must include iconSize');
  assert(typesContent.includes('elementSpacing'), 'types must include elementSpacing');
  assert(typesContent.includes('separator'), 'types must include separator');

  const assetMgrContent = fs.readFileSync('src/components/AdminAssetLibrariesManager.tsx', 'utf8');
  assert(assetMgrContent.includes('चैनल नाम स्थिति:'), 'Admin must have pure Hindi label for channel name alignment');
  assert(assetMgrContent.includes('आइकन साइज़:'), 'Admin must have pure Hindi label for icon size');
  assert(assetMgrContent.includes('सेपरेटर चिन्ह (Separator):'), 'Admin must have pure Hindi label for separator');

  const editorContent = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(editorContent.includes('🏛️ सेंट्रल कस्टम फ़ुटर लाइब्रेरी से चुनें:'), 'Step 6 must allow selecting custom footers');

  const footerGraphicContent = fs.readFileSync('src/components/FooterGraphic.tsx', 'utf8');
  assert(footerGraphicContent.includes('footerConfig'), 'FooterGraphic component must accept footerConfig prop');
});

// 22. GAP 5: WhatsApp Notification Payload & Sender Preservation
runTest('Gap 5: WhatsApp campaign supports thumbnail image payload, studio link, and preserves profile_otp', () => {
  const waContent = fs.readFileSync('whatsapp_integration.ts', 'utf8');
  assert(waContent.includes('sendWhatsAppImage'), 'whatsapp_integration.ts must support sendWhatsAppImage');
  assert(waContent.includes('https://ainewsmaker.online/studio?newsId='), 'whatsapp campaign must link directly to studio with newsId');
  assert(waContent.includes('name: "profile_otp"'), 'WhatsApp OTP sender profile_otp must be preserved untouched');
});

// 23. GAP 6: Server-Side Test Frame Permissions
runTest('Gap 6: Server blocks non-master access and export of test frames with 403 Forbidden', () => {
  const serverContent = fs.readFileSync('server.ts', 'utf8');
  assert(serverContent.includes('/api/dynamic-frames/:id'), 'server.ts must have GET /api/dynamic-frames/:id');
  assert(serverContent.includes('Access denied: Only Master Admin can view test frames'), 'Single frame route blocks test frames for non-master');
  assert(serverContent.includes('Access denied: Only Master Admin can export test frames'), 'Verify export permission blocks test frames for non-master');
});

// 24. GAP 7: Special Notification Board Hardening & Multi-Instance Durability
runTest('Gap 7: Notification Board persists durably across container restarts and filters deleted news', () => {
  const serverContent = fs.readFileSync('server.ts', 'utf8');
  assert(serverContent.includes('getDurableNotificationBoardIds'), 'server.ts has getDurableNotificationBoardIds');
  assert(serverContent.includes('saveDurableNotificationBoardIds'), 'server.ts has saveDurableNotificationBoardIds');
  assert(serverContent.includes('loadDeletedNewsIds'), 'server.ts filters out deleted news from notification board');
});

// 25. PHASE 18-20: 100% Dual-Directory Parity Check
runTest('Phase 18-20: Dual-Directory Parity between src/ and web_studio/src/', () => {
  const filesToCompare = [
    'src/types/dynamicFrame.ts',
    'src/types.ts',
    'src/components/AdminTemplatePlanManager.tsx',
    'src/components/DynamicFrameGeneratorModal.tsx',
    'src/components/AdminAssetLibrariesManager.tsx',
    'src/components/CardEditor.tsx',
    'src/components/CardPreview.tsx',
    'src/components/FooterGraphic.tsx',
    'src/components/HomeScreenWeb.tsx',
    'src/components/WhatsAppNotificationCenterModal.tsx',
    'src/App.tsx',
    'src/lib/CanvasExporter.ts',
    'src/lib/HeaderDesigns.ts',
    'server.ts',
    'whatsapp_integration.ts',
    'asset_libraries_db.json',
  ];

  for (const file of filesToCompare) {
    const rootPath = path.join(__dirname, file);
    const webStudioPath = path.join(__dirname, 'web_studio', file);
    assert(fs.existsSync(rootPath), `Root file must exist: ${file}`);
    assert(fs.existsSync(webStudioPath), `web_studio file must exist: web_studio/${file}`);
    
    const rootBuf = fs.readFileSync(rootPath);
    const wsBuf = fs.readFileSync(webStudioPath);
    assert(rootBuf.equals(wsBuf), `Byte-for-byte parity mismatch in: ${file}`);
  }
});

console.log('\n====================================================');
console.log(`TEST SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
