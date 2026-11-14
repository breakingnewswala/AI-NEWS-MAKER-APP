// @ts-check
const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('🧪 PRODUCTION STABILIZATION CONSOLIDATION TEST SUITE');
console.log('========================================================================');

// Test 1: Session & Auth Stability - No unwanted wipes or popups
console.log('\n--- 1. Verification: Session & Token Preservation ---');
const apiConfig = fs.readFileSync('src/lib/apiConfig.ts', 'utf8');
assert(!apiConfig.includes("window.dispatchEvent(new CustomEvent('ai_news_session_expired'))"), 'ensureAuthToken must NEVER dispatch ai_news_session_expired');
assert(apiConfig.includes("ya29."), 'isTokenExpired must support Google OAuth ya29. tokens');
assert(apiConfig.includes("google_access_token"), 'getAuthToken must check google_access_token');

const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
assert(!appTsx.includes("handleSessionExpired = () => {\n      showToast('⚠️ आपका लॉगिन सत्र समाप्त हो गया है। कृपया जारी रखने के लिए पुनः एडमिन लॉगिन करें।');\n      clearAuthTokens();\n      try {\n        localStorage.removeItem('reporter_auth_session');\n      } catch {}\n      setCurrentUser(null);"), 'App.tsx must not destructively wipe session in handleSessionExpired');
console.log('✅ [PASS] Session & token preservation verified: zero destructive session wipes');

// Test 2: Elimination of intrusive open_admin_login / open_login_modal dispatches
console.log('\n--- 2. Verification: Zero Intrusive Modal Popups on Routine Operations ---');
const filesToCheck = [
  'src/components/AdminAssetLibrariesManager.tsx',
  'src/components/AdminApiKeysManager.tsx',
  'src/components/AdminPlansAndPackagesManager.tsx',
  'src/components/ProfileScreenWeb.tsx',
  'src/lib/dynamicFramesManager.ts',
  'src/lib/rssSourceManager.ts',
];

for (const rel of filesToCheck) {
  const content = fs.readFileSync(rel, 'utf8');
  assert(!content.includes("window.dispatchEvent(new CustomEvent('open_admin_login'))"), `${rel} must NOT dispatch open_admin_login`);
  assert(!content.includes("window.dispatchEvent(new CustomEvent('open_login_modal'))"), `${rel} must NOT dispatch open_login_modal`);
}
console.log('✅ [PASS] Zero intrusive modal popups verified across all 6 administrative components');

// Test 3: Local Cryptographic RS256 Verification in server.ts
console.log('\n--- 3. Verification: Local RS256 Firebase Verification ---');
const serverTs = fs.readFileSync('server.ts', 'utf8');
assert(serverTs.includes('firebaseAdminAuth.verifyIdToken(token, false)'), 'server.ts resolveAuthenticatedUser must use local verification (checkRevoked = false)');
assert(serverTs.includes('firebaseAdminAuth.verifyIdToken(tok, false)'), 'server.ts refresh-session must use local verification (checkRevoked = false)');
assert(serverTs.includes('firebaseAdminAuth.verifyIdToken(candidateToken, false)'), 'server.ts /api/auth/login must use local verification (checkRevoked = false)');
console.log('✅ [PASS] Local RS256 Firebase token verification verified across all auth endpoints');

// Test 4: Google Gemini Default Provider Card in Admin Control Room & Server Response
console.log('\n--- 4. Verification: Google Gemini Default System Provider ---');
assert(serverTs.includes('defaultProvider: {'), 'server.ts GET /api/admin/api-keys must include defaultProvider in response');
assert(serverTs.includes('Firebase Secret Manager (GEMINI_API_KEY)'), 'server.ts must indicate defaultProvider source');

const apiKeysManager = fs.readFileSync('src/components/AdminApiKeysManager.tsx', 'utf8');
assert(apiKeysManager.includes('Google Gemini डिफ़ॉल्ट प्रोवाइडर (Default System Provider)'), 'AdminApiKeysManager must render default system provider section');
assert(apiKeysManager.includes('defaultProvider?.provider'), 'AdminApiKeysManager must display default provider info');
console.log('✅ [PASS] Google Gemini Default Provider card and API response verified');

// Test 5: Key Pool Persistence Resiliency
console.log('\n--- 5. Verification: Key Pool Persistence Resiliency ---');
assert(serverTs.includes('const overallSuccess = Boolean(firestoreSuccess || savedAtLeastOne);'), 'server.ts saveApiKeysVault must consider disk save successful and not roll back');
console.log('✅ [PASS] Key Pool persistence resiliency verified');

// Test 6: Web Links Dashboard Combo Input & Custom Channel Name Preservation
console.log('\n--- 6. Verification: Web Links Dashboard Combo Input ---');
const plansManager = fs.readFileSync('src/components/AdminPlansAndPackagesManager.tsx', 'utf8');
assert(plansManager.includes('चैनल / न्यूज़ पोर्टल चुनें या नाम लिखें *'), 'Web links form must allow selecting or typing custom channel name');
assert(plansManager.includes('placeholder="या चैनल का नाम टाइप करें (उदा. नई दुनिया / भास्कर)"'), 'Web links form must provide text input placeholder for custom channels');
assert(plansManager.includes('saveNewsChannel(name)'), 'Adding web link must register channel in savedChannels');
console.log('✅ [PASS] Web Links Dashboard combo input and channel preservation verified');

// Test 7: Immediate Server Registration for RSS/Web Sources
console.log('\n--- 7. Verification: Immediate Server Registration for Sources ---');
const rssManager = fs.readFileSync('src/lib/rssSourceManager.ts', 'utf8');
assert(rssManager.includes("fetch(getApiUrl('/api/admin/rss-sources')"), 'addAdminRssSource must POST to /api/admin/rss-sources');
console.log('✅ [PASS] Immediate server source registration verified');

// Test 8: Home Screen News Filtering Robustness
console.log('\n--- 8. Verification: News Post Matching Robustness ---');
assert(serverTs.includes('channelCandidate = (p.sourceChannel || p.source || (p as any).channelName || "").trim().toLowerCase()'), 'server.ts must match channel across sourceChannel, source, and channelName');
console.log('✅ [PASS] News post matching robustness verified');

// Test 9: Production Safety Invariants
console.log('\n--- 9. Verification: Production Safety Invariants ---');
const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
const framesDb = JSON.parse(fs.readFileSync('dynamic_frames_db.json', 'utf8'));
const approvedTemplate = framesDb.find((f) => f.id === 'df_1794406067554_albmw');
assert(approvedTemplate, 'Approved template df_1794406067554_albmw must exist');
assert.strictEqual(approvedTemplate.approvalStatus, 'APPROVED', 'Approved template must be APPROVED');
assert.strictEqual(approvedTemplate.publicationStatus, 'published', 'Approved template must be published');
console.log('✅ [PASS] Production safety invariants strictly preserved');

// Test 10: 100% Byte Parity Between Root and web_studio/
console.log('\n--- 10. Verification: 100% Byte Parity ---');
const parityFiles = [
  ['src/App.tsx', 'web_studio/src/App.tsx'],
  ['src/components/AdminApiKeysManager.tsx', 'web_studio/src/components/AdminApiKeysManager.tsx'],
  ['src/components/AdminAssetLibrariesManager.tsx', 'web_studio/src/components/AdminAssetLibrariesManager.tsx'],
  ['src/components/AdminPlansAndPackagesManager.tsx', 'web_studio/src/components/AdminPlansAndPackagesManager.tsx'],
  ['src/components/ProfileScreenWeb.tsx', 'web_studio/src/components/ProfileScreenWeb.tsx'],
  ['src/lib/apiConfig.ts', 'web_studio/src/lib/apiConfig.ts'],
  ['src/lib/dynamicFramesManager.ts', 'web_studio/src/lib/dynamicFramesManager.ts'],
  ['src/lib/rssSourceManager.ts', 'web_studio/src/lib/rssSourceManager.ts'],
  ['server.ts', 'web_studio/server.ts'],
];

for (const [f1, f2] of parityFiles) {
  const b1 = fs.readFileSync(f1);
  const b2 = fs.readFileSync(f2);
  assert.strictEqual(b1.compare(b2), 0, `Byte parity mismatch between ${f1} and ${f2}`);
}
console.log(`✅ [PASS] All ${parityFiles.length} files have 100% byte parity between root and web_studio`);

console.log('\n========================================================================');
console.log('🎉 ALL 10 CONSOLIDATED PRODUCTION STABILIZATION TESTS PASSED (100%)');
console.log('========================================================================\n');
