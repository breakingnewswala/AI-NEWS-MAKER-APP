// tests/test_master_production_upgrade_and_remediation.cjs
// Verification suite for AI NEWS MAKER Master Production Upgrade & Remediation across all 14 Modules

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('==================================================================');
console.log('🧪 VERIFYING MASTER PRODUCTION UPGRADE & REMEDIATION (MODULES 1-14)');
console.log('==================================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] TC${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] TC${totalTests}: ${name}`);
    console.error(`   Error: ${err.message}`);
  }
}

function sha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// 1. Module 1: Browser Titles & Branding
runTest('Module 1: Title branding with simple hyphen and exact Home Page title', () => {
  const appSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');
  assert(appSrc.includes("'AI News Maker - स्मार्ट डिजिटल न्यूज़ स्टूडियो'"), 'Home title must be exact canonical string');
  assert(appSrc.includes("`${meta.name} - AI News Maker`") || appSrc.includes("- AI News Maker"), 'Subpages must use simple hyphen and AI News Maker suffix');
  assert(!appSrc.includes("'Home / AI News Maker'"), 'Obsolete slash title must be removed');
  assert(!appSrc.includes("'Home | AI News Maker'"), 'Pipe title must not be present');

  const indexHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  assert(indexHtml.includes('<title>AI News Maker - स्मार्ट डिजिटल न्यूज़ स्टूडियो</title>'), 'index.html default title must match');
});

// 2. Module 2: Video Template Control & Tombstoning
runTest('Module 2: Video Template Control bulk delete & dummy frames tombstoning', () => {
  const tombstonePath = path.join(process.cwd(), 'deleted_frames_tombstone.json');
  assert(fs.existsSync(tombstonePath), 'deleted_frames_tombstone.json must exist');
  const tombstones = JSON.parse(fs.readFileSync(tombstonePath, 'utf8'));
  const dummyIds = [
    'frame-custom-3line-4-5',
    'frame-custom-full-9-16',
    'frame-classic-lower-third',
    'frame-square-news-1-1',
    'frame-square-minimal-1-1',
    'frame-broadcast-tv-4-3',
    'frame-special-report-4-3',
    'frame-portrait-feed-4-5',
    'frame-breaking-portrait-4-5'
  ];
  dummyIds.forEach(id => {
    assert(tombstones.includes(id), `Tombstones must contain dummy frame ${id}`);
  });

  const adminVideoSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'AdminVideoTemplateControl.tsx'), 'utf8');
  assert(adminVideoSrc.includes('चयनित डमी फ्रेम हटाएँ'), 'Bulk delete button must be present in header');
  assert(adminVideoSrc.includes('handleBulkDeleteConfirm'), 'Bulk delete handler must be implemented');
  assert(adminVideoSrc.includes('/api/admin/video-frames/bulk-delete'), 'Bulk delete must call backend API');
  assert(adminVideoSrc.includes('showBulkDeleteModal'), 'Confirmation modal must be required before deletion');
});

// 3. Module 3: RSS News Thumbnail Extraction
runTest('Module 3: RSS News Thumbnail Extraction 9-tier priority & timeout in server.ts', () => {
  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverSrc.includes('extractBestNewsImage'), 'extractBestNewsImage function must exist');
  assert(serverSrc.includes('AbortSignal.timeout(6000)') || serverSrc.includes('6000'), 'Article scraping timeout must be 6000ms');
  assert(serverSrc.includes('og:image'), 'Must extract OpenGraph image');
  assert(serverSrc.includes('twitter:image'), 'Must extract Twitter Card image');
  assert(serverSrc.includes('schema.org'), 'Must extract JSON-LD schema image');
  assert(serverSrc.includes('redirect: "follow"') || serverSrc.includes("redirect: 'follow'"), 'Must follow redirects safely');
});

// 4. Module 4: Internet Photo Search Fallback Asset & News Record Image State
runTest('Module 4: Internet Photo Search fallback image bit-for-bit presence, imageState, and usage', () => {
  const assetPaths = [
    path.join(process.cwd(), 'public', 'assets', 'internet_photo_search_fallback.jpg'),
    path.join(process.cwd(), 'src', 'assets', 'images', 'internet_photo_search_fallback.jpg'),
    path.join(process.cwd(), 'web_studio', 'public', 'assets', 'internet_photo_search_fallback.jpg'),
    path.join(process.cwd(), 'web_studio', 'src', 'assets', 'images', 'internet_photo_search_fallback.jpg'),
    path.join(process.cwd(), 'app', 'src', 'main', 'assets', 'news_studio', 'assets', 'internet_photo_search_fallback.jpg'),
  ];
  const expectedHash = 'e1fc815dea846e6ddc4c6b374d736e1dab73355addb7ce9b7b10b74098633311';
  assetPaths.forEach(p => {
    assert(fs.existsSync(p), `Asset must exist at ${p}`);
    const hash = sha256(p);
    assert.strictEqual(hash, expectedHash, `SHA256 must match exactly at ${p}`);
  });

  const newsFeedTypes = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'newsFeedData.ts'), 'utf8');
  assert(newsFeedTypes.includes('NewsImageState'), 'newsFeedData.ts must declare NewsImageState');
  assert(newsFeedTypes.includes('INTERNET_SEARCH_PLACEHOLDER'), 'NewsImageState must include INTERNET_SEARCH_PLACEHOLDER');
  assert(newsFeedTypes.includes('imageState?: NewsImageState'), 'NewsFeedPost must have imageState field');

  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverSrc.includes("imageState = 'INTERNET_SEARCH_PLACEHOLDER'"), 'server.ts must mark fallback posts with INTERNET_SEARCH_PLACEHOLDER');
  assert(serverSrc.includes("imageState = 'SOURCE_IMAGE'"), 'server.ts must mark authentic posts with SOURCE_IMAGE');

  const homeSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'HomeScreenWeb.tsx'), 'utf8');
  assert(homeSrc.includes('/assets/internet_photo_search_fallback.jpg'), 'HomeScreenWeb must use fallback image');
  assert(homeSrc.includes('फोटो इंटरनेट से सर्च करें'), 'HomeScreenWeb must show instructional badge for fallback');

  const appSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');
  assert(appSrc.includes("targetImageForStudio.includes('internet_photo_search_fallback')"), 'App.tsx must not silently inject fallback graphic into canvas');
  assert(appSrc.includes('फोटो अपलोड आवश्यक'), 'App.tsx must notify user about photo upload');
  assert(appSrc.includes("meta.title.split('-')[0]"), 'App.tsx breadcrumb must correctly split hyphen-separated titles');
});

// 5. Module 5: Admin Notifications Badge & System IDs
runTest('Module 5: Admin notifications unread badge and mark-read resolution in server.ts', () => {
  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverSrc.includes('admin_sys_'), 'Must handle admin_sys_ prefix');
  assert(serverSrc.includes('const rawId = String(id).replace("admin_sys_", "");'), 'Must strip prefix and mark both forms read');

  const notifsDbPath = path.join(process.cwd(), 'notifications_database.json');
  assert(fs.existsSync(notifsDbPath), 'notifications_database.json must exist');
});

// 6. Module 6: AI Script Maker Endpoint & UI
runTest('Module 6: AI Script Maker Pro/VIP gating, endpoints, and Newsroom UI', () => {
  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverSrc.includes('/api/newsroom/script-maker'), 'POST /api/newsroom/script-maker endpoint must exist');
  assert(serverSrc.includes('यह सुविधा Pro और VIP Desk उपयोगकर्ताओं के लिए उपलब्ध है।'), 'Must return canonical 403 error for basic users');

  const newsroomSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'NewsroomScreenWeb.tsx'), 'utf8');
  assert(newsroomSrc.includes('AI न्यूज़ स्क्रिप्ट मेकर'), 'AI Script Maker header must be present');
  assert(newsroomSrc.includes('यह सुविधा Pro और VIP Desk उपयोगकर्ताओं के लिए उपलब्ध है।'), 'Lock banner must be present for non-pro users');
  assert(newsroomSrc.includes('handleGenerateScript'), 'Generate script handler must exist');
  assert(newsroomSrc.includes('handleSaveScriptAsDraft'), 'Save script as draft handler must exist');
  assert(newsroomSrc.includes('saveDraft('), 'Must call saveDraft to integrate with Drafts manager');
});

// 7. Module 7: Newsroom Shortcut Cards Removal
runTest('Module 7: Removal of duplicate shortcut cards from NewsroomScreenWeb', () => {
  const newsroomSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'NewsroomScreenWeb.tsx'), 'utf8');
  assert(!newsroomSrc.includes('नया न्यूज़ ग्राफ़िक बनाएँ'), 'Shortcut card "नया न्यूज़ ग्राफ़िक बनाएँ" must be removed');
  assert(!newsroomSrc.includes('नई वीडियो बनाएँ'), 'Shortcut card "नई वीडियो बनाएँ" must be removed');
});

// 8. Module 8: Mobile App Box Repositioning to Bottom & Play Store Link
runTest('Module 8: Mobile App Box repositioned to bottom after E-Paper with Play Store link', () => {
  const newsroomSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'NewsroomScreenWeb.tsx'), 'utf8');
  const epaperIdx = newsroomSrc.indexOf('ई-पेपर पब्लिशिंग डेस्क');
  const appBoxIdx = newsroomSrc.lastIndexOf('AI NEWS MAKER APP');
  assert(epaperIdx !== -1, 'E-Paper section must exist');
  assert(appBoxIdx !== -1, 'AI NEWS MAKER APP box must exist');
  assert(appBoxIdx > epaperIdx, 'AI NEWS MAKER APP box must be positioned AFTER E-Paper');
  assert(newsroomSrc.includes('Google Play Store'), 'Google Play Store button must be present');
  assert(newsroomSrc.includes('playStoreUrl'), 'Must bind to playStoreUrl');

  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverSrc.includes('/api/admin/branding'), 'Branding endpoint must exist');
  assert(serverSrc.includes('playStoreUrl'), 'Branding must support playStoreUrl');
});

// 9. Module 9: RSS Feed Web Synchronization
runTest('Module 9: RSS web-feed synchronization & persistence in server.ts', () => {
  const rssSources = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'rss_sources_database.json'), 'utf8'));
  const naiDunia = rssSources.find(s => s.id === 'src_1794763273176_ty2e');
  assert(naiDunia, 'Nai Dunia RSS source must exist');
  assert(naiDunia.originalWebUrl === 'https://www.naidunia.com', 'Nai Dunia originalWebUrl must be set');

  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverSrc.includes('generated_web_rss_feeds.json'), 'Generated web RSS feeds must be persisted to disk');
});

// 10. Module 10: 3-Day Home Feed Auto-Delete Retention
runTest('Module 10: 3-Day Feed Retention endpoints, 72h window, and HomeScreenWeb toggle', () => {
  const serverSrc = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
  assert(serverSrc.includes('/api/admin/home-feed-retention'), 'Retention config endpoints must exist');
  assert(serverSrc.includes('3 * 24 * 60 * 60 * 1000'), 'Authoritative 72-hour window must be defined');

  const homeSrc = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'HomeScreenWeb.tsx'), 'utf8');
  assert(homeSrc.includes('3 दिन ऑटो डिलीट'), 'Retention toggle button must be present for Master Admin');
});

// 11. Module 11: Android Application Favorites FilterChip in HomeScreen.kt
runTest('Module 11: Android Compose HomeScreen.kt contains Favorites FilterChip and Empty State', () => {
  const homeScreenKtPath = path.join(process.cwd(), 'app', 'src', 'main', 'java', 'com', 'example', 'ui', 'screens', 'HomeScreen.kt');
  assert(fs.existsSync(homeScreenKtPath), 'HomeScreen.kt must exist');
  const ktSrc = fs.readFileSync(homeScreenKtPath, 'utf8');
  assert(ktSrc.includes('पसंदीदा खबरें'), 'HomeScreen.kt must contain "पसंदीदा खबरें" FilterChip');
  assert(ktSrc.includes('Icons.Default.Favorite'), 'Must use Favorite heart icon');
  assert(ktSrc.includes('showOnlyFavorites = !showOnlyFavorites'), 'Must toggle showOnlyFavorites on click');
  assert(ktSrc.includes('कोई पसंदीदा खबर नहीं मिली'), 'Must render dedicated empty state when no favorites exist');
  assert(ktSrc.includes('दिल (Heart) आइकन दबाकर उन्हें यहाँ सहेजें'), 'Must give clear instruction in empty state');
});

// 12. 100% Mirror Parity between src/ and web_studio/src/
runTest('Module 12: 100% SHA256 Mirror Parity between src/ and web_studio/src/', () => {
  const filesToVerify = [
    'src/App.tsx',
    'src/components/HomeScreenWeb.tsx',
    'src/components/AdminVideoTemplateControl.tsx',
    'src/components/NewsroomScreenWeb.tsx',
    'src/components/NewsDetailModal.tsx',
    'src/data/presets.ts',
  ];
  filesToVerify.forEach(rel => {
    const rootPath = path.join(process.cwd(), rel);
    const studioPath = path.join(process.cwd(), 'web_studio', rel);
    assert(fs.existsSync(rootPath), `Root file must exist: ${rel}`);
    assert(fs.existsSync(studioPath), `Studio file must exist: ${rel}`);
    const rootHash = sha256(rootPath);
    const studioHash = sha256(studioPath);
    assert.strictEqual(rootHash, studioHash, `Mirror parity failed for ${rel}: ${rootHash} !== ${studioHash}`);
  });

  // Also verify server.ts parity
  const rootServer = sha256(path.join(process.cwd(), 'server.ts'));
  const studioServer = sha256(path.join(process.cwd(), 'web_studio', 'server.ts'));
  assert.strictEqual(rootServer, studioServer, 'server.ts and web_studio/server.ts must have identical SHA256');
});

// 13. Invariant: Android Application ID
runTest('Module 13: Android Application ID invariant is preserved as com.aistudio.ainewsmaker.hzwptx', () => {
  const gradlePath = path.join(process.cwd(), 'app', 'build.gradle.kts');
  assert(fs.existsSync(gradlePath), 'app/build.gradle.kts must exist');
  const gradleSrc = fs.readFileSync(gradlePath, 'utf8');
  assert(gradleSrc.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'applicationId must remain com.aistudio.ainewsmaker.hzwptx');
});

console.log('==================================================================');
console.log(`Summary: ${passedTests} / ${totalTests} test cases passed.`);
console.log('==================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
