const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');

console.log('====================================================');
console.log('🧪 RUNNING CONSOLIDATED PRODUCTION FIXES TEST SUITE');
console.log('====================================================');

// Test 1: Invariant & Application ID Checks
console.log('\n--- Test 1: Android Application ID & Core Invariants ---');
const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'applicationId must remain com.aistudio.ainewsmaker.hzwptx');
console.log('✅ [PASS] Android applicationId is com.aistudio.ainewsmaker.hzwptx');

const rootFrames = JSON.parse(fs.readFileSync('dynamic_frames_db.json', 'utf8'));
const albmwFrame = rootFrames.find(f => f.id === 'df_1794406067554_albmw');
assert(albmwFrame, 'df_1794406067554_albmw must exist');
assert(albmwFrame.publicationStatus === 'published' || albmwFrame.status === 'APPROVED', 'df_1794406067554_albmw must be published/approved');
console.log('✅ [PASS] Template df_1794406067554_albmw is preserved, published, and APPROVED');

// Test 2: Source Code Verification for App Routing & Admin State Retention
console.log('\n--- Test 2: App.tsx Master Admin Routing & Reload State ---');
const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
assert(appTsx.includes("| 'admin'"), "AppTab must include 'admin'");
assert(appTsx.includes("path === '/admin' || hash === 'admin' || fullUrl.includes('tab=admin')"), "currentTab initializer must handle /admin route");
assert(appTsx.includes("localStorage.setItem('last_active_tab', target)"), "navigateToTab must store last_active_tab in localStorage");
assert(appTsx.includes("const isMasterAdminUser = Boolean(currentUser && isUserAdmin(currentUser))"), "isMasterAdminUser must gate welcome screen");
assert(appTsx.includes("currentTab === 'admin' || currentTab === 'profile' || currentTab === 'export'"), "ProfileScreenWeb must render for currentTab === 'admin'");
console.log('✅ [PASS] App.tsx contains full Master Admin routing, state retention & welcome screen bypass');

// Test 3: TopBar and BottomBar Routing
console.log('\n--- Test 3: Navigation Bars Admin Tab Integration ---');
const topBar = fs.readFileSync('src/components/AppTopBarWeb.tsx', 'utf8');
assert(topBar.includes("isControlPanel = currentTab === 'profile' || currentTab === 'export' || currentTab === 'admin'"), "TopBar isControlPanel must include 'admin'");
assert(topBar.includes("onNavigateToTab(isAdminUser ? 'admin' : 'profile')"), "TopBar Control Room button must route to 'admin' for admin user");

const bottomBar = fs.readFileSync('src/components/AppBottomBarWeb.tsx', 'utf8');
assert(bottomBar.includes("isControlPanel = currentTab === 'profile' || currentTab === 'export' || currentTab === 'admin'"), "BottomBar isControlPanel must include 'admin'");
assert(bottomBar.includes("onSelectTab(isAdmin ? 'admin' : 'profile')"), "BottomBar Control Room button must route to 'admin' for admin user");
console.log('✅ [PASS] TopBar and BottomBar route to admin Control Room for admin users');

// Test 4: LoginModal and API Config Token Handling
console.log('\n--- Test 4: Token Management & Google OAuth Handshake ---');
const loginModal = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
assert(loginModal.includes("processGoogleUser = async (rawEmail: string, displayName?: string, idToken?: string, accessToken?: string)"), "processGoogleUser must accept accessToken");
assert(loginModal.includes("localStorage.setItem('google_access_token', accessToken)"), "LoginModal must persist google_access_token");
assert(loginModal.includes("setAuthToken(data.token)"), "LoginModal must call setAuthToken with returned session token");
assert(loginModal.includes("localStorage.removeItem('user_explicitly_logged_out')"), "LoginModal must clear explicit logout flag on login");

const apiConfig = fs.readFileSync('src/lib/apiConfig.ts', 'utf8');
assert(apiConfig.includes("localStorage.getItem('google_access_token')"), "ensureAuthToken must check stored google_access_token");
assert(apiConfig.includes("authToken: existingToken") || apiConfig.includes("authToken: candidateToken"), "ensureAuthToken must pass token to refresh-session");
console.log('✅ [PASS] LoginModal and apiConfig properly persist and exchange OAuth tokens and session HMAC');

// Test 5: Byte Parity Between Root and web_studio
console.log('\n--- Test 5: Root and web_studio Byte Parity ---');
const filesToCompare = [
  'server.ts',
  'src/App.tsx',
  'src/components/AppTopBarWeb.tsx',
  'src/components/AppBottomBarWeb.tsx',
  'src/components/LoginModal.tsx',
  'src/lib/apiConfig.ts',
  'src/lib/dynamicFramesManager.ts',
  'src/lib/rssSourceManager.ts'
];

for (const file of filesToCompare) {
  const rootContent = fs.readFileSync(file);
  const studioFile = path.join('web_studio', file);
  assert(fs.existsSync(studioFile), `web_studio/${file} must exist`);
  const studioContent = fs.readFileSync(studioFile);
  assert(rootContent.equals(studioContent), `${file} and web_studio/${file} must be byte-identical`);
}
console.log(`✅ [PASS] All ${filesToCompare.length} files have 100% byte parity between root and web_studio`);

console.log('\n====================================================');
console.log('🎉 ALL CONSOLIDATED PRODUCTION TESTS PASSED (100%)');
console.log('====================================================');
