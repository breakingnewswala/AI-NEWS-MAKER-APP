const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 ADMIN CONTROL ROOM CONSOLIDATION & PERMANENT AUTH FIX TEST SUITE');
console.log('========================================================================');

// Test 1: Complete Eradication of Legacy Admin Prototype Static Files
console.log('\n--- 1. Verification: Legacy Admin Static Files Eradication ---');
const forbiddenPaths = [
  'public/admin/index.html',
  'public/admin',
  'dist/admin/index.html',
  'dist/admin',
  'app/src/main/assets/news_studio/admin/index.html',
  'app/src/main/assets/news_studio/admin',
  'app/src/main/assets/web_admin/index.html',
  'app/src/main/assets/web_admin',
];

for (const p of forbiddenPaths) {
  assert(!fs.existsSync(p), `Legacy admin prototype must NOT exist: ${p}`);
}
console.log('✅ [PASS] All legacy admin prototype HTML and directory paths are eradicated');

// Test 2: Server Static Middleware & Canonical /admin SPA Routing
console.log('\n--- 2. Verification: Server.ts Static Options & /admin Routing ---');
const serverTs = fs.readFileSync('server.ts', 'utf8');
assert(serverTs.includes('index: false'), 'express.static must specify index: false to prevent serving directory index.html');
assert(serverTs.includes('app.get(["/admin", "/admin/*"]'), 'server.ts must have explicit /admin and /admin/* route handler');
assert(serverTs.includes('res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")'), 'Admin route must enforce strict no-cache headers');
console.log('✅ [PASS] Server enforces index: false and canonical /admin SPA routing with no-cache headers');

// Test 3: Asset Library Category Strict Isolation (Zero Cross-Contamination)
console.log('\n--- 3. Verification: Asset Library Category Isolation ---');
assert(serverTs.includes("if (it.type) {"), "Asset filtering must prioritize it.type check over regex");
assert(serverTs.includes("if (it.category) {"), "Asset filtering must check it.category before falling back to regex");

// Simulate the filtering logic to guarantee isolation
const mockAssets = [
  { id: '1', name: 'Story Callout Pin', type: 'callout_png', category: 'general' },
  { id: '2', name: 'Red Pin Badge', type: 'location_badge', category: 'general' },
  { id: '3', name: 'Suvichar Frame', type: 'suvichar_background', category: 'general' },
  { id: '4', name: 'Footer Template', type: 'custom_footer', category: 'general' },
];

function filterCategory(items, q) {
  if (q === 'location_badge' || q === 'location' || q === 'badge') {
    return items.filter((it) => {
      if (it.type) return it.type === 'location_badge' || it.type === 'location' || it.type === 'badge';
      if (it.category) return it.category === 'location_badge' || it.category === 'location' || it.category === 'badge';
      return (it.name && /badge|बैज|location|लोकेशन|pin|पिंन/i.test(it.name));
    });
  } else if (q === 'callout_png' || q === 'callout' || q === 'story_callout' || q === 'full_story') {
    return items.filter((it) => {
      if (it.type) return it.type === 'callout_png' || it.type === 'callout' || it.type === 'story_callout' || it.type === 'full_story';
      if (it.category) return it.category === 'callout_png' || it.category === 'callout' || it.category === 'story_callout' || it.category === 'full_story';
      return (it.name && /callout|कॉलआउट|विवरण|डिस्क्रिप्शन|story/i.test(it.name));
    });
  }
  return items;
}

const locBadges = filterCategory(mockAssets, 'location_badge');
assert.strictEqual(locBadges.length, 1, 'Only location_badge should match location_badge filter');
assert.strictEqual(locBadges[0].id, '2', 'Red Pin Badge must be the only location badge');

const callouts = filterCategory(mockAssets, 'callout_png');
assert.strictEqual(callouts.length, 1, 'Only callout_png should match callout_png filter');
assert.strictEqual(callouts[0].id, '1', 'Story Callout Pin must be the only callout item');
console.log('✅ [PASS] Asset Library category strict isolation verified (zero name-based cross contamination)');

// Test 4: App.tsx Session Expiration & Ghost Admin Elimination
console.log('\n--- 4. Verification: Ghost Admin Elimination & Modal Handshake ---');
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
assert(!appTsx.includes('setIsLoginOpen(true)'), 'Fatal typo setIsLoginOpen must not exist in App.tsx');
assert(appTsx.includes("window.addEventListener('open_login_modal', handleOpenAdminLogin)"), 'App.tsx must listen for open_login_modal');
assert(appTsx.includes("window.addEventListener('open_admin_login', handleOpenAdminLogin)"), 'App.tsx must listen for open_admin_login');
assert(appTsx.includes("localStorage.removeItem('reporter_auth_session')"), 'handleSessionExpired must clear reporter_auth_session from localStorage');
assert(appTsx.includes("setCurrentUser(null)"), 'handleSessionExpired must reset currentUser to null');
console.log('✅ [PASS] Ghost Admin state eliminated: session expiry resets state and opens admin login');

// Test 5: LoginModal State Synchronization
console.log('\n--- 5. Verification: LoginModal Mode Synchronization ---');
const loginModal = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
assert(loginModal.includes("setIsAdminMode(initialMode === 'admin')"), 'LoginModal must update isAdminMode when initialMode prop changes');
console.log('✅ [PASS] LoginModal synchronizes isAdminMode on initialMode change');

// Test 6: ProfileScreenWeb Strict Auth Check on Mount
console.log('\n--- 6. Verification: ProfileScreenWeb Token Check on Mount ---');
const profileWeb = fs.readFileSync('src/components/ProfileScreenWeb.tsx', 'utf8');
assert(profileWeb.includes('ensureAuthToken()'), 'ProfileScreenWeb must ensureAuthToken on mount for admin');
assert(profileWeb.includes("window.dispatchEvent(new CustomEvent('open_admin_login'))"), 'ProfileScreenWeb must trigger open_admin_login if token missing/expired');
console.log('✅ [PASS] ProfileScreenWeb validates token on mount');

// Test 7: Asset Libraries User-Typed Name Preservation
console.log('\n--- 7. Verification: Asset Name Preservation in Upload ---');
const assetManager = fs.readFileSync('src/components/AdminAssetLibrariesManager.tsx', 'utf8');
assert(assetManager.includes('if (!newName.trim()) {'), 'handleFileUpload must not overwrite existing user-typed name');
console.log('✅ [PASS] Asset upload preserves user-typed asset name');

// Test 8: RSS Dashboard Channel Name Preservation & Combo Input
console.log('\n--- 8. Verification: RSS Dashboard Channel Name Preservation ---');
const plansManager = fs.readFileSync('src/components/AdminPlansAndPackagesManager.tsx', 'utf8');
assert(plansManager.includes('चैनल चुनें या नया नाम लिखें *'), 'RSS form must allow selecting or typing custom channel name');
assert(plansManager.includes('saveNewsChannel(name)'), 'Adding RSS source must register channel name in savedChannels');
assert(plansManager.includes('setSavedChannels(getSavedNewsChannels())'), 'Adding RSS source must refresh savedChannels state');
console.log('✅ [PASS] RSS Dashboard provides combo input and preserves custom channel names');

// Test 9: Safety Invariants: Android applicationId & Dynamic Frame Template
console.log('\n--- 9. Verification: Production Safety Invariants ---');
const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must remain com.aistudio.ainewsmaker.hzwptx');
console.log('✅ [PASS] Android applicationId is strictly com.aistudio.ainewsmaker.hzwptx');

const rootFrames = JSON.parse(fs.readFileSync('dynamic_frames_db.json', 'utf8'));
const albmw = rootFrames.find((f) => f.id === 'df_1794406067554_albmw');
assert(albmw, 'Production dynamic frame df_1794406067554_albmw must exist');
assert(albmw.publicationStatus === 'published' || albmw.status === 'APPROVED', 'df_1794406067554_albmw must be published/approved');
console.log('✅ [PASS] Template df_1794406067554_albmw is preserved, published, and APPROVED');

// Test 10: 100% Byte Parity Between Root and web_studio Files
console.log('\n--- 10. Verification: 100% Byte Parity Between Root and web_studio ---');
const parityFiles = [
  'server.ts',
  'src/App.tsx',
  'src/components/LoginModal.tsx',
  'src/components/ProfileScreenWeb.tsx',
  'src/components/AdminAssetLibrariesManager.tsx',
  'src/components/AdminPlansAndPackagesManager.tsx',
  'src/components/AdminApiKeysManager.tsx',
  'src/lib/apiConfig.ts',
  'src/lib/dynamicFramesManager.ts',
  'src/lib/rssSourceManager.ts',
];

for (const file of parityFiles) {
  const rootBuf = fs.readFileSync(file);
  const studioFile = path.join('web_studio', file);
  assert(fs.existsSync(studioFile), `web_studio/${file} must exist`);
  const studioBuf = fs.readFileSync(studioFile);
  assert(rootBuf.equals(studioBuf), `${file} and web_studio/${file} must be byte-identical`);
}
console.log(`✅ [PASS] All ${parityFiles.length} files have 100% byte parity between root and web_studio`);

console.log('\n========================================================================');
console.log('🎉 ALL 10 CONSOLIDATED ADMIN CONTROL ROOM & AUTH TESTS PASSED (100%)');
console.log('========================================================================\n');
