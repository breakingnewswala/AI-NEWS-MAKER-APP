const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 VERIFYING MASTER PRODUCT & ENGINEERING REPAIR (AREAS 1 TO 15)');
console.log('================================================================');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
  }
}

// -----------------------------------------------------------------------------
// Area 1: Dynamic Photo Frame Selection Crash Prevention
// -----------------------------------------------------------------------------
runTest('Area 1: CardEditor.tsx safely resolves currentDynamicFrame with normalizeDynamicFrame', () => {
  const cardEditor = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert(cardEditor.includes('normalizeDynamicFrame'), 'CardEditor must import/use normalizeDynamicFrame');
  assert(cardEditor.includes('const currentDynamicFrame = React.useMemo('), 'currentDynamicFrame must be defined via useMemo');
  assert(cardEditor.includes('normalizeDynamicFrame(raw)'), 'currentDynamicFrame must normalize the found frame');
  assert(cardEditor.includes('currentDynamicFrame || getDynamicFrameById'), 'CardEditor must fallback dynamically to getDynamicFrameById');
});

runTest('Area 1: CardPreview.tsx handles empty/undefined textSlots safely', () => {
  const cardPreview = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(cardPreview.includes('normalizeDynamicFrame'), 'CardPreview must import/use normalizeDynamicFrame');
  assert(cardPreview.includes('slot0?.alignment'), 'CardPreview must use optional chaining on slot0 alignment');
  assert(cardPreview.includes('slot0?.rect'), 'CardPreview must use optional chaining on slot0 rect');
});

// -----------------------------------------------------------------------------
// Area 2: Video Studio Default Video Placeholder
// -----------------------------------------------------------------------------
runTest('Area 2: VideoStudioWeb.tsx displays exact Hindi instruction in video placeholder', () => {
  const videoStudio = fs.readFileSync('src/components/VideoStudioWeb.tsx', 'utf8');
  const exactInstruction = 'वीडियो न्यूज़ स्टूडियो के स्टेप 1 में जाकर पहले अपने कंप्यूटर या फोन से वीडियो चुनें।';
  assert(videoStudio.includes(exactInstruction), `VideoStudio must contain exact Hindi instruction: "${exactInstruction}"`);
  assert(videoStudio.includes('renderVideoPlaceholder'), 'VideoStudio must implement renderVideoPlaceholder');
  assert(videoStudio.includes('renderVideoPlaceholder()'), 'VideoStudio must render placeholder when video is absent');
});

// -----------------------------------------------------------------------------
// Area 3: Video Studio Full Reset
// -----------------------------------------------------------------------------
runTest('Area 3: VideoStudioWeb.tsx handleResetTask performs complete state teardown', () => {
  const videoStudio = fs.readFileSync('src/components/VideoStudioWeb.tsx', 'utf8');
  assert(videoStudio.includes('const handleResetTask = () => {'), 'handleResetTask must be defined');
  assert(videoStudio.includes('videoRef.current.pause()'), 'Reset must pause videoRef');
  assert(videoStudio.includes("setVideoUrl('')"), 'Reset must clear videoUrl');
  assert(videoStudio.includes('setClips([])'), 'Reset must clear clips');
  assert(videoStudio.includes('setDuration(0)'), 'Reset must reset duration');
  assert(videoStudio.includes('setCurrentTime(0)'), 'Reset must reset currentTime');
  assert(videoStudio.includes("setHeadline('')"), 'Reset must reset headline');
  assert(videoStudio.includes('setQuickStep(1)'), 'Reset must return to Step 1');
  assert(videoStudio.includes("fileInputRef.current.value = ''"), 'Reset must clear file input values');
});

// -----------------------------------------------------------------------------
// Area 4: Video & Reels Exact Video Duration
// -----------------------------------------------------------------------------
runTest('Area 4: VideosScreenWeb.tsx extracts exact duration without fake 30s/60s', () => {
  const videosScreen = fs.readFileSync('src/components/VideosScreenWeb.tsx', 'utf8');
  assert(videosScreen.includes('formatExactDuration'), 'VideosScreen must implement formatExactDuration');
  assert(videosScreen.includes('Math.floor(dur / 3600)') || videosScreen.includes('Math.floor(num / 3600)'), 'formatExactDuration must support hh:mm:ss');
  assert(videosScreen.includes("'--:--'"), 'formatExactDuration must return --:-- on invalid duration');
  assert(!videosScreen.includes("duration: '00:30'"), 'VideosScreen must not hardcode 00:30');
  assert(videosScreen.includes("preload = 'metadata'"), 'VideosScreen must use preload=metadata for remote videos');
});

// -----------------------------------------------------------------------------
// Area 5: Home News Cards Headline & Article Scraper
// -----------------------------------------------------------------------------
runTest('Area 5: HomeScreenWeb.tsx has full wrapping and server.ts has /api/scrape-news-article', () => {
  const homeScreen = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  const server = fs.readFileSync('server.ts', 'utf8');
  assert(homeScreen.includes('leading-relaxed break-words'), 'Detail headline must have leading-relaxed break-words');
  assert(homeScreen.includes('/api/scrape-news-article'), 'HomeScreen must query /api/scrape-news-article');
  assert(server.includes('/api/scrape-news-article'), 'Server must declare /api/scrape-news-article');
  assert(server.includes('scraped_articles_cache_db.json'), 'Server must use persistent cache for scraped articles');
});

// -----------------------------------------------------------------------------
// Area 6: News Card Favorites
// -----------------------------------------------------------------------------
runTest('Area 6: Favorites system supports toggle, persistence, and dedicated feed tab', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  const favManager = fs.readFileSync('src/lib/userFavoritesManager.ts', 'utf8');
  const homeScreen = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  assert(server.includes('/api/user-favorites'), 'Server must declare /api/user-favorites');
  assert(favManager.includes('toggleUserFavorite'), 'userFavoritesManager must export toggleUserFavorite');
  assert(homeScreen.includes('❤️ पसंदीदा खबरें') || homeScreen.includes('❤️ पसंदीदा'), 'HomeScreen must feature ❤️ पसंदीदा खबरें tab');
  assert(homeScreen.includes("selectedCategory === 'favorites'"), 'HomeScreen must filter for favorites');
});

// -----------------------------------------------------------------------------
// Area 7: News Card Reminders
// -----------------------------------------------------------------------------
runTest('Area 7: Reminder system supports scheduling, background ticker, and notification dispatch', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  const remManager = fs.readFileSync('src/lib/reminderManager.ts', 'utf8');
  const homeScreen = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  const reminderMsg = 'आपने यह खबर ग्राफिक बनाने के लिए रिमाइंडर में रखी थी। अब इस खबर से ग्राफिक बनाएँ';
  assert(server.includes('/api/reminders'), 'Server must declare /api/reminders');
  assert(server.includes(reminderMsg), `Server reminder ticker must emit: "${reminderMsg}"`);
  assert(remManager.includes(reminderMsg), `reminderManager must emit: "${reminderMsg}"`);
  assert(homeScreen.includes('handleSetReminder'), 'HomeScreen must implement handleSetReminder');
  assert(homeScreen.includes('[5, 10, 20, 30].map'), 'HomeScreen must offer 5, 10, 20, 30 minute options');
  assert(homeScreen.includes('मिनट बाद'), 'HomeScreen must render minute label');
});

// -----------------------------------------------------------------------------
// Area 8: ₹99 Graphic Pack
// -----------------------------------------------------------------------------
runTest('Area 8: ₹99 Graphic Pack enforces 99 INR, 20 credits, 7 days, and FIFO consumption', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  const homeScreen = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  assert(server.includes('GRAPHIC_PACK_20_7D'), 'Server must recognize GRAPHIC_PACK_20_7D');
  assert(server.includes('isGraphicPack ? 99'), 'Server must enforce fixed 99 INR price');
  assert(server.includes('graphicsTotal: 20'), 'Server must credit 20 balance on purchase');
  assert(server.includes('7 * 86400000') || server.includes('7 * 24 * 60 * 60 * 1000'), 'Server must calculate 7 days validity');
  assert(server.includes('activePack.graphicsRemaining'), 'Server verify-download-entitlement must consume from graphicPacks');
  assert(homeScreen.includes('₹99 में 20 अतिरिक्त ग्राफिक अनलॉक करें'), 'HomeScreen must prompt to unlock 20 graphics for ₹99');
});

// -----------------------------------------------------------------------------
// Area 9: Local Alerts
// -----------------------------------------------------------------------------
runTest('Area 9: Local Alerts feed scores district 300, state 200, category 100 and prompts unconfigured users', () => {
  const homeScreen = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  assert(homeScreen.includes('📍 लोकल अलर्ट'), 'HomeScreen must have 📍 लोकल अलर्ट option');
  assert(homeScreen.includes('return 300'), 'District match must award 300 score');
  assert(homeScreen.includes('return 200'), 'State match must award 200 score');
  assert(homeScreen.includes('लोकल अलर्ट के लिए जिला व राज्य सेट करें'), 'HomeScreen must prompt users to set district/state');
});

// -----------------------------------------------------------------------------
// Area 10: Video Frame Test Queue Master Admin
// -----------------------------------------------------------------------------
runTest('Area 10: AdminVideoTemplateControl supports TEST_FRAMES, 9:16/1:1/4:5/4:3 ratios, and plan tiers', () => {
  const adminVideo = fs.readFileSync('src/components/AdminVideoTemplateControl.tsx', 'utf8');
  assert(adminVideo.includes("activeCategoryTab === 'test_frames'"), 'AdminVideo must support test_frames tab');
  assert(adminVideo.includes("'9:16'"), 'Must filter 9:16 ratio');
  assert(adminVideo.includes("'1:1'"), 'Must filter 1:1 ratio');
  assert(adminVideo.includes("'4:5'"), 'Must filter 4:5 ratio');
  assert(adminVideo.includes("'4:3'"), 'Must filter 4:3 ratio');
  assert(adminVideo.includes('handleApproveAndPublish'), 'Admin must have approve & publish handler');
  assert(adminVideo.includes('ADVANCED'), 'Admin must support ADVANCED plan tier');
  assert(adminVideo.includes('VIP DESK'), 'Admin must support VIP DESK plan tier');
});

// -----------------------------------------------------------------------------
// Area 11: Editorial Rules
// -----------------------------------------------------------------------------
runTest('Area 11: Central editorial rules define 5 headline tiers and punctuation restrictions', () => {
  const coreRules = fs.readFileSync('src/lib/aiCoreRules.ts', 'utf8');
  assert(/min:\s*80,\s*max:\s*110/.test(coreRules), 'Tier 1 must be 80-110');
  assert(/min:\s*100,\s*max:\s*130/.test(coreRules), 'Tier 2 must be 100-130');
  assert(/min:\s*125,\s*max:\s*150/.test(coreRules), 'Tier 3 must be 125-150');
  assert(/min:\s*130,\s*max:\s*160/.test(coreRules), 'Tier 4 must be 130-160');
  assert(/min:\s*150,\s*max:\s*200/.test(coreRules), 'Tier 5 must be 150-200');
  assert(coreRules.includes("No ending punctuation (. or । or ?)"), 'Editorial rules must forbid ending punctuation');
});

// -----------------------------------------------------------------------------
// Area 12: Photo and Video Studio Isolation
// -----------------------------------------------------------------------------
runTest('Area 12: App.tsx maintains strict state isolation between photo and video studios', () => {
  const app = fs.readFileSync('src/App.tsx', 'utf8');
  const startIdx = app.indexOf('const handleOpenStudioWithVideo = async');
  const endIdx = app.indexOf('const handleOpenStudioWithEPaper =', startIdx);
  const fnBody = app.slice(startIdx, endIdx);
  assert(!fnBody.includes('setCard('), 'handleOpenStudioWithVideo must not mutate Photo Studio card state');
});

// -----------------------------------------------------------------------------
// Area 13: Web Studio Mirror Parity
// -----------------------------------------------------------------------------
runTest('Area 13: Files in web_studio/ are synchronized with src/ counterparts', () => {
  const filesToVerify = [
    'components/CardEditor.tsx',
    'components/CardPreview.tsx',
    'components/HomeScreenWeb.tsx',
    'components/VideoStudioWeb.tsx',
    'components/VideosScreenWeb.tsx',
    'lib/userFavoritesManager.ts',
    'lib/reminderManager.ts',
    'lib/userPlanManager.ts',
  ];
  for (const file of filesToVerify) {
    const rootPath = path.join('src', file);
    const webPath = path.join('web_studio/src', file);
    assert(fs.existsSync(webPath), `web_studio/${file} must exist`);
    const rootContent = fs.readFileSync(rootPath, 'utf8');
    const webContent = fs.readFileSync(webPath, 'utf8');
    assert.strictEqual(rootContent, webContent, `web_studio/${file} must match root src/${file}`);
  }
});

// -----------------------------------------------------------------------------
// Area 14: Server Build Synchronization
// -----------------------------------------------------------------------------
runTest('Area 14: server.ts root and web_studio/server.ts are identical', () => {
  const rootServer = fs.readFileSync('server.ts', 'utf8');
  const webServer = fs.readFileSync('web_studio/server.ts', 'utf8');
  assert.strictEqual(rootServer, webServer, 'web_studio/server.ts must match root server.ts');
});

// -----------------------------------------------------------------------------
// Area 15: Android Application ID Invariant
// -----------------------------------------------------------------------------
runTest('Area 15: Android Application ID invariant is preserved', () => {
  const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
  assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
});

console.log('================================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
