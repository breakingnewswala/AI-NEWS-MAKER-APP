const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 MASTER PRODUCTION BUG FIX & DATA INTEGRITY TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// 1. ZERO-NEWS & SEED CARD ELIMINATION
// -----------------------------------------------------------------------------
runTest('1.1: news_database.json is empty array on root and web_studio', () => {
  const root = JSON.parse(fs.readFileSync('news_database.json', 'utf8'));
  const ws = JSON.parse(fs.readFileSync('web_studio/news_database.json', 'utf8'));
  const pub = JSON.parse(fs.readFileSync('public/news_database.json', 'utf8'));
  assert.strictEqual(Array.isArray(root), true);
  assert.strictEqual(root.length, 0, 'news_database.json must be empty array');
  assert.strictEqual(ws.length, 0, 'web_studio/news_database.json must be empty array');
  assert.strictEqual(pub.length, 0, 'public/news_database.json must be empty array');
});

runTest('1.2: Chandrayaan-4 seed card (news_1793391037097) completely eliminated', () => {
  const seedId = 'news_1793391037097';
  ['news_database.json', 'public/news_database.json', 'public/sitemap-news.xml', 'public/rss.xml'].forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      assert.strictEqual(content.includes(seedId), false, `${file} must not contain ${seedId}`);
    }
  });
});

runTest('1.3: App.tsx handles cleanApi.length === 0 as authoritative zero news', () => {
  const appCode = fs.readFileSync('src/App.tsx', 'utf8');
  assert.strictEqual(appCode.includes("setPosts([]);"), true);
  assert.strictEqual(appCode.includes("localStorage.removeItem('app_news_posts_v2');"), true);
  assert.strictEqual(appCode.includes("loaded = true;"), true);
  assert.strictEqual(appCode.includes("p.id !== 'news_1793391037097'"), true);
});

runTest('1.4: HomeScreenWeb.tsx displays correct Hindi empty state text', () => {
  const homeCode = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  const targetText = 'एडमिन द्वारा नई खबरें जोड़ने के बाद यहाँ दिखाई देंगी।';
  assert.strictEqual(homeCode.includes(targetText), true, 'HomeScreenWeb must contain target empty state text');
});

// -----------------------------------------------------------------------------
// 2. SPECIAL NOTIFICATION BOARD (STRICT APPROVAL ONLY)
// -----------------------------------------------------------------------------
runTest('2.1: server.ts contains isPostApprovedAndPublished with strict checks', () => {
  const serverCode = fs.readFileSync('server.ts', 'utf8');
  assert.strictEqual(serverCode.includes('function isPostApprovedAndPublished(p: any): boolean'), true);
  assert.strictEqual(serverCode.includes('p.approvalStatus === "REJECTED"'), true);
  assert.strictEqual(serverCode.includes('p.approvalStatus === "PENDING_APPROVAL"'), true);
});

runTest('2.2: getDurableNotificationBoardIds validates strictly against approved posts', () => {
  const serverCode = fs.readFileSync('server.ts', 'utf8');
  assert.strictEqual(serverCode.includes('if (post && isPostApprovedAndPublished(post))'), true);
});

runTest('2.3: POST /api/admin/toggle-notification-board/:id rejects unapproved posts with 400', () => {
  const serverCode = fs.readFileSync('server.ts', 'utf8');
  assert.strictEqual(serverCode.includes('Only approved and published news can be added to the Special Notification Board'), true);
});

runTest('2.4: HomeScreenWeb.tsx highlightPosts strictly filters by admin notification board and approval', () => {
  const homeCode = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8');
  assert.strictEqual(homeCode.includes('if (!adminNotificationBoardIds || adminNotificationBoardIds.size === 0) return [];'), true);
  assert.strictEqual(homeCode.includes('adminNotificationBoardIds.has(p.id) && isStrictlyApproved(p)'), true);
});

// -----------------------------------------------------------------------------
// 3. MASTER ADMIN LOCATION PERSISTENCE
// -----------------------------------------------------------------------------
runTest('3.1: user_profiles_db.json has location and district as भोपाल', () => {
  const profiles = JSON.parse(fs.readFileSync('user_profiles_db.json', 'utf8'));
  const master = profiles['breakingnewswala.com@gmail.com'] || profiles['usr_627265616b69'];
  assert(master, 'Master admin profile must exist');
  assert.strictEqual(master.district, 'भोपाल', 'District must be भोपाल');
  assert.strictEqual(master.location, 'भोपाल', 'Location must be भोपाल');
});

runTest('3.2: server.ts reconcileAllUsers sanitizes सेंट्रल डेस्क / भोपाल to भोपाल', () => {
  const serverCode = fs.readFileSync('server.ts', 'utf8');
  assert.strictEqual(serverCode.includes("raw === 'सेंट्रल डेस्क / भोपाल' || raw === 'हेडक्वार्टर सेंट्रल डेस्क'"), true);
});

runTest('3.3: ProfileScreenWeb.tsx sets and maintains reporterDistrict as भोपाल', () => {
  const profCode = fs.readFileSync('src/components/ProfileScreenWeb.tsx', 'utf8');
  assert.strictEqual(profCode.includes("rawDist === 'सेंट्रल डेस्क / भोपाल'"), true);
  assert.strictEqual(profCode.includes("(rawDist || 'भोपाल')"), true);
});

runTest('3.4: saveProfilesDatabase writes to disk files across all locations', () => {
  const serverCode = fs.readFileSync('server.ts', 'utf8');
  assert.strictEqual(serverCode.includes('resolveAllDatabaseLocations("user_profiles_db.json")'), true);
});

// -----------------------------------------------------------------------------
// 4. MASTER ADMIN SOCIAL MEDIA BRANDING (X & LINKEDIN)
// -----------------------------------------------------------------------------
runTest('4.1: DEFAULT_SOCIAL_ICONS has twitter, x, and linkedin as true', () => {
  const profCode = fs.readFileSync('src/components/ProfileScreenWeb.tsx', 'utf8');
  assert.strictEqual(/twitter:\s*true/i.test(profCode), true);
  assert.strictEqual(/x:\s*true/i.test(profCode), true);
  assert.strictEqual(/linkedin:\s*true/i.test(profCode), true);
});

runTest('4.2: admin_branding_db.json includes twitter, x, and linkedin in activeSocialIcons', () => {
  const branding = JSON.parse(fs.readFileSync('admin_branding_db.json', 'utf8'));
  assert(Array.isArray(branding.activeSocialIcons), 'activeSocialIcons must be an array');
  assert.strictEqual(branding.activeSocialIcons.includes('x'), true);
  assert.strictEqual(branding.activeSocialIcons.includes('twitter'), true);
  assert.strictEqual(branding.activeSocialIcons.includes('linkedin'), true);
});

runTest('4.3: ProfileScreenWeb.tsx branding button includes loading and disabled state', () => {
  const profCode = fs.readFileSync('src/components/ProfileScreenWeb.tsx', 'utf8');
  assert.strictEqual(profCode.includes('isSavingBranding'), true);
  assert.strictEqual(profCode.includes('disabled={isSavingBranding}'), true);
  assert.strictEqual(profCode.includes('⏳ सहेजा जा रहा है...'), true);
});

// -----------------------------------------------------------------------------
// 5. MEMBERSHIP WATERMARK REMOVAL & MASTER BRANDING ENFORCEMENT
// -----------------------------------------------------------------------------
runTest('5.1: userPlanManager.ts hasWatermark is false for all plans', () => {
  const planCode = fs.readFileSync('src/lib/userPlanManager.ts', 'utf8');
  assert.strictEqual(planCode.includes('hasWatermark: true'), false, 'hasWatermark: true must not exist');
  assert.strictEqual(planCode.includes('⚠️ ग्राफिक पर मास्टर ब्रांडिंग अनिवार्य'), true);
  assert.strictEqual(planCode.includes('shouldShowAppWatermark'), true);
});

runTest('5.2: shouldShowAppWatermark returns false', () => {
  const planCode = fs.readFileSync('src/lib/userPlanManager.ts', 'utf8');
  assert.strictEqual(/function shouldShowAppWatermark[^{]*\{\s*return false;\s*\}/m.test(planCode), true, 'shouldShowAppWatermark must return false');
});

runTest('5.3: CardEditor.tsx removed 24-repeat preview watermark overlay', () => {
  const editorCode = fs.readFileSync('src/components/CardEditor.tsx', 'utf8');
  assert.strictEqual(editorCode.includes('AI NEWS MAKER • PREVIEW ONLY'), false, 'Repeating preview watermark must be removed');
  assert.strictEqual(editorCode.includes('4. फोटो एवं लेआउट'), true);
  assert.strictEqual(editorCode.includes('स्टेप 4: फोटो एवं लेआउट'), true);
});

runTest('5.4: CanvasExporter.ts universal watermark drawing is disabled', () => {
  const exporterCode = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert.strictEqual(exporterCode.includes('Watermark overlays permanently eliminated across exports'), true);
});

runTest('5.5: CashfreePaymentModal.tsx shows Master Branding status instead of Watermark text', () => {
  const modalCode = fs.readFileSync('src/components/CashfreePaymentModal.tsx', 'utf8');
  assert.strictEqual(modalCode.includes("plan.id === 'basic' ? 'मास्टर ब्रांडिंग अनिवार्य' : 'फुल एचडी व प्रीमियम फ़ीचर्स सक्रिय'"), true);
});

// -----------------------------------------------------------------------------
// 6. 100% BYTE PARITY ACROSS ALL 17 MIRRORED FILE PAIRS
// -----------------------------------------------------------------------------
runTest('6.1: 100% Byte Parity across all 17 mirrored files between root and web_studio/', () => {
  const pairs = [
    ['server.ts', 'web_studio/server.ts'],
    ['src/App.tsx', 'web_studio/src/App.tsx'],
    ['src/lib/userPlanManager.ts', 'web_studio/src/lib/userPlanManager.ts'],
    ['src/lib/CanvasExporter.ts', 'web_studio/src/lib/CanvasExporter.ts'],
    ['src/components/HomeScreenWeb.tsx', 'web_studio/src/components/HomeScreenWeb.tsx'],
    ['src/components/ProfileScreenWeb.tsx', 'web_studio/src/components/ProfileScreenWeb.tsx'],
    ['src/components/CardEditor.tsx', 'web_studio/src/components/CardEditor.tsx'],
    ['src/components/CardPreview.tsx', 'web_studio/src/components/CardPreview.tsx'],
    ['src/components/CashfreePaymentModal.tsx', 'web_studio/src/components/CashfreePaymentModal.tsx'],
    ['src/components/AdminPlansAndPackagesManager.tsx', 'web_studio/src/components/AdminPlansAndPackagesManager.tsx'],
    ['src/components/LoginModal.tsx', 'web_studio/src/components/LoginModal.tsx'],
    ['src/components/AuthWelcomeScreen.tsx', 'web_studio/src/components/AuthWelcomeScreen.tsx'],
    ['admin_branding_db.json', 'web_studio/admin_branding_db.json'],
    ['user_profiles_db.json', 'web_studio/user_profiles_db.json'],
    ['users_master_database.json', 'web_studio/users_master_database.json'],
    ['users_accounts_db.json', 'web_studio/users_accounts_db.json'],
    ['news_database.json', 'web_studio/news_database.json']
  ];

  pairs.forEach(([f1, f2]) => {
    const b1 = fs.readFileSync(f1);
    const b2 = fs.readFileSync(f2);
    assert(b1.equals(b2), `File pair mismatch: ${f1} <=> ${f2}`);
  });
});

// -----------------------------------------------------------------------------
// 7. SAFETY INVARIANTS
// -----------------------------------------------------------------------------
runTest('7.1: Android applicationId strictly preserved as com.aistudio.ainewsmaker.hzwptx', () => {
  const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
  assert.strictEqual(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), true);
});

runTest('7.2: Production template df_1794406067554_albmw is preserved and intact', () => {
  const dynamicFrames = fs.readFileSync('web_studio/dynamic_frames_db.json', 'utf8');
  assert.strictEqual(dynamicFrames.includes('df_1794406067554_albmw'), true);
  const serverCode = fs.readFileSync('server.ts', 'utf8');
  assert.strictEqual(serverCode.includes('df_1794406067554_albmw'), true);
});

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
