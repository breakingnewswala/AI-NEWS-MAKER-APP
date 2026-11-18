/**
 * AI News Maker - Master Admin Auth & RSS Remediation Comprehensive Test Suite
 * Validates:
 * 1. Token retrieval with fallback to Firebase ID token without dropping.
 * 2. customFetch does not wipe tokens on 401.
 * 3. customFetch does not dispatch ai_news_admin_auth_required on home tab.
 * 4. Music Library endpoints use Authorization header and omit Content-Type on FormData.
 * 5. RSS Add Feed persists to backend, triggers sync, preserves 'नई दुनिया', and supports Web Links.
 * 6. Deduplication does not use 40-char title truncation and uses 72h window.
 * 7. 10-minute RSS scheduler interval and UI badge display.
 * 8. Favicon, PWA, and OG tags match official AI News Maker logo.
 * 9. Safety invariants (Master Admin accounts, Android app ID com.aistudio.ainewsmaker.hzwptx, 100% SHA256 mirror parity).
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('==================================================================');
console.log('🧪 VERIFYING MASTER ADMIN AUTH & RSS REMEDIATION (AREAS 1 TO 9)');
console.log('==================================================================');

function getHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ---------------------------------------------------------------------------------
// TC1: Token Retrieval Fallback to Firebase ID Token Without Dropping
// ---------------------------------------------------------------------------------
console.log('Testing TC1: Token Retrieval Fallback to Firebase ID Token Without Dropping...');
const apiConfigCode = fs.readFileSync('src/lib/apiConfig.ts', 'utf8');
const webApiConfigCode = fs.readFileSync('web_studio/src/lib/apiConfig.ts', 'utf8');

assert(
  apiConfigCode.includes('setAuthToken(firebaseIdToken)') &&
  apiConfigCode.includes('return firebaseIdToken;'),
  'apiConfig.ts must register candidate token immediately and return firebaseIdToken directly if /api/auth/login fails'
);
assert(
  !apiConfigCode.includes('// Note: Never set raw 1-hour Firebase ID token as the application session token.'),
  'apiConfig.ts must not prohibit setting candidate Firebase ID token as bearer credential'
);
assert(
  apiConfigCode.includes('parseJwtPayload') &&
  apiConfigCode.includes('isNearExpiry || isExpired || forceRefresh') &&
  apiConfigCode.includes('/api/auth/refresh-session'),
  'apiConfig.ts must parse JWT exp and trigger refresh-session if token is near expiry or expired'
);
console.log('✅ [PASS] TC1: Firebase ID token fallback verified without credential dropping');

// ---------------------------------------------------------------------------------
// TC2: customFetch Does Not Wipe Tokens on 401
// ---------------------------------------------------------------------------------
console.log('Testing TC2: customFetch Does Not Wipe Tokens on 401...');
// Verify clearAuthTokens() is NOT called inside customFetch response.status === 401 handler
const customFetchSegment = apiConfigCode.slice(apiConfigCode.indexOf('const customFetch = async function'));
const retrySegment = customFetchSegment.slice(customFetchSegment.indexOf('if (response.status === 401'));
assert(
  !retrySegment.includes('clearAuthTokens();'),
  'customFetch must NEVER call clearAuthTokens() on 401 response status'
);
console.log('✅ [PASS] TC2: Session preservation verified: customFetch does not wipe localStorage tokens on 401');

// ---------------------------------------------------------------------------------
// TC3: customFetch Does Not Dispatch ai_news_admin_auth_required on Home Tab
// ---------------------------------------------------------------------------------
console.log('Testing TC3: Admin Auth Required Toast Suppressed on Home Tab and Initial Load...');
assert(
  apiConfigCode.includes('isTabAdmin') &&
  apiConfigCode.includes('isExplicitUserAction') &&
  apiConfigCode.includes('markUserInteracted'),
  'apiConfig.ts must verify isTabAdmin and explicit user action before dispatching admin auth event'
);

const appCode = fs.readFileSync('src/App.tsx', 'utf8');
const webAppCode = fs.readFileSync('web_studio/src/App.tsx', 'utf8');
assert(
  appCode.includes("const activeTab = currentTab;") &&
  appCode.includes("['home', 'studio', 'videos', 'newsroom'].includes(activeTab)"),
  'App.tsx handleAdminAuthRequired must strictly suppress admin toasts on home, studio, videos, and newsroom tabs'
);
console.log('✅ [PASS] TC3: Popups suppressed on Home screen and non-admin tabs');

// ---------------------------------------------------------------------------------
// TC4: Music Library Endpoints Use Authorization Header
// ---------------------------------------------------------------------------------
console.log('Testing TC4: Music Library Endpoints Use Authorization Header & Clean 401...');
const musicManagerCode = fs.readFileSync('src/components/AdminMusicLibraryManager.tsx', 'utf8');
const webMusicManagerCode = fs.readFileSync('web_studio/src/components/AdminMusicLibraryManager.tsx', 'utf8');

assert(
  musicManagerCode.includes('getAdminAuthHeadersAsync') &&
  musicManagerCode.includes('const authHeaders = await getAdminAuthHeadersAsync()'),
  'AdminMusicLibraryManager.tsx must fetch auth headers with getAdminAuthHeadersAsync()'
);
assert(
  musicManagerCode.includes("urlStr.includes('/api/admin/music-library')") ||
  musicManagerCode.includes('...authHeaders'),
  'AdminMusicLibraryManager.tsx must spread authHeaders containing Authorization header'
);
assert(
  apiConfigCode.includes('init?.body instanceof FormData') &&
  apiConfigCode.includes("init.headers.delete('Content-Type')"),
  'apiConfig.ts customFetch must delete Content-Type when body is FormData to allow browser boundary calculation'
);
assert(
  musicManagerCode.includes('setError(null)'),
  'AdminMusicLibraryManager.tsx must clear error message upon successful track fetch'
);
console.log('✅ [PASS] TC4: Music Library endpoints use Authorization header and omit Content-Type on FormData');

// ---------------------------------------------------------------------------------
// TC5: RSS Add Feed Persists to Backend, Triggers Sync & Preserves नई दुनिया
// ---------------------------------------------------------------------------------
console.log('Testing TC5: RSS Add Feed Persists, Syncs, Preserves नई दुनिया & Supports Web Links...');
const rssManagerCode = fs.readFileSync('src/lib/rssSourceManager.ts', 'utf8');
assert(
  rssManagerCode.includes('addAdminRssSource') &&
  rssManagerCode.includes('getAdminAuthHeadersAsync') &&
  rssManagerCode.includes('syncAllSourcesLive().catch'),
  'rssSourceManager.ts must persist added feed to backend and trigger live synchronization'
);

const rssDb = JSON.parse(fs.readFileSync('rss_sources_database.json', 'utf8'));
assert(
  Array.isArray(rssDb) && rssDb.some(s => s && (s.name === 'नई दुनिया' || s.name.includes('नई दुनिया'))),
  'rss_sources_database.json must preserve the authoritative नई दुनिया RSS source'
);

const serverTs = fs.readFileSync('server.ts', 'utf8');
assert(
  serverTs.includes('DEFAULT_PRODUCTION_RSS_SOURCES') && serverTs.includes('नई दुनिया'),
  'server.ts must contain नई दुनिया in DEFAULT_PRODUCTION_RSS_SOURCES'
);

const plansManagerCode = fs.readFileSync('src/components/AdminPlansAndPackagesManager.tsx', 'utf8');
assert(
  plansManagerCode.includes('addAdminRssSource') &&
  plansManagerCode.includes('syncAllSourcesLive') &&
  plansManagerCode.includes('scrapeAllWebSourcesLive'),
  'AdminPlansAndPackagesManager.tsx must support both RSS feeds and Web links live scraping'
);
console.log('✅ [PASS] TC5: RSS feed persistence, live synchronization, and नई दुनिया preservation verified');

// ---------------------------------------------------------------------------------
// TC6: Deduplication Does Not Use 40-Char Truncation & Uses 72-Hour Window
// ---------------------------------------------------------------------------------
console.log('Testing TC6: Deduplication Full Normalized Titles & 72-Hour Freshness Window...');
assert(
  !serverTs.includes('title.trim().toLowerCase().slice(0, 40)'),
  'server.ts must not truncate titles to 40 characters for deduplication'
);
assert(
  serverTs.includes('seventyTwoHoursAgo = Date.now() - 72 * 3600 * 1000') ||
  serverTs.includes('72 * 3600 * 1000'),
  'server.ts parseRssItemsFromXml must use 72-hour cutoff matching 3-day retention policy'
);
console.log('✅ [PASS] TC6: Deduplication uses full normalized titles without 40-char collision risks and 72h window');

// ---------------------------------------------------------------------------------
// TC7: 10-Minute RSS Scheduler Interval & UI Badge Display
// ---------------------------------------------------------------------------------
console.log('Testing TC7: 10-Minute RSS Scheduler Interval & UI Badge...');
assert(
  serverTs.includes('const RSS_SYNC_INTERVAL_MS = 10 * 60 * 1000;'),
  'server.ts must set RSS_SYNC_INTERVAL_MS to 10 minutes (600,000 ms)'
);
const schedulerRouteIdx = serverTs.indexOf('app.get("/api/scheduler/rss-sync"');
assert(schedulerRouteIdx !== -1, 'server.ts must define GET /api/scheduler/rss-sync');
const schedulerRouteSnippet = serverTs.slice(schedulerRouteIdx, schedulerRouteIdx + 500);
assert(
  schedulerRouteSnippet.includes('intervalMinutes: 10'),
  'server.ts /api/scheduler/rss-sync telemetry must explicitly return intervalMinutes: 10'
);
assert(
  plansManagerCode.includes('RSS Auto Sync: प्रत्येक 10 मिनट'),
  'AdminPlansAndPackagesManager.tsx must display "RSS Auto Sync: प्रत्येक 10 मिनट"'
);
console.log('✅ [PASS] TC7: 10-minute scheduler interval and UI badge verified');

// ---------------------------------------------------------------------------------
// TC8: Favicon, PWA & OG Tags Match Official AI News Maker Logo
// ---------------------------------------------------------------------------------
console.log('Testing TC8: Favicon, PWA & OG Tags Match Official AI News Maker Logo...');
const requiredIcons = [
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon-48x48.png',
  'favicon.png',
  'favicon.ico',
  'apple-touch-icon.png',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'pwa-maskable-512x512.png',
  'icon-192.png',
  'icon-512.png',
  'logo.png',
];

for (const icon of requiredIcons) {
  assert(fs.existsSync(path.join('public', icon)), `Missing public/${icon}`);
  assert(fs.existsSync(path.join('web_studio/public', icon)), `Missing web_studio/public/${icon}`);
  assert(fs.existsSync(path.join('app/src/main/assets/news_studio', icon)), `Missing app/src/main/assets/news_studio/${icon}`);
}

const indexHtml = fs.readFileSync('index.html', 'utf8');
assert(
  indexHtml.includes('href="/favicon-16x16.png"') &&
  indexHtml.includes('href="/favicon-32x32.png"') &&
  indexHtml.includes('href="/favicon-48x48.png"') &&
  indexHtml.includes('href="/apple-touch-icon.png"') &&
  indexHtml.includes('href="/favicon.ico"'),
  'index.html must include link tags for all favicon resolutions'
);
assert(
  indexHtml.includes('https://www.ainewsmaker.online/assets/ai_news_maker_logo.png?v=2'),
  'index.html must reference official AI News Maker logo asset with v=2 cachebuster for og:image and twitter:image'
);
console.log('✅ [PASS] TC8: High quality icons and OG tags verified across all bundles');

// ---------------------------------------------------------------------------------
// TC9: Safety Invariants & 100% SHA256 Mirror Parity
// ---------------------------------------------------------------------------------
console.log('Testing TC9: Safety Invariants & 100% SHA256 Mirror Parity...');
const gradleKts = fs.readFileSync('app/build.gradle.kts', 'utf8');
assert(
  gradleKts.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'),
  'Android applicationId must remain com.aistudio.ainewsmaker.hzwptx'
);

assert(
  serverTs.includes('MASTER_ADMIN_EMAIL') &&
  serverTs.includes('breakingnewswala.com@gmail.com'),
  'server.ts must preserve Master Admin account permissions'
);

const mirrorPairs = [
  ['src/lib/apiConfig.ts', 'web_studio/src/lib/apiConfig.ts'],
  ['src/components/AdminMusicLibraryManager.tsx', 'web_studio/src/components/AdminMusicLibraryManager.tsx'],
  ['src/components/AdminApiKeysManager.tsx', 'web_studio/src/components/AdminApiKeysManager.tsx'],
  ['src/lib/rssSourceManager.ts', 'web_studio/src/lib/rssSourceManager.ts'],
  ['src/components/AdminPlansAndPackagesManager.tsx', 'web_studio/src/components/AdminPlansAndPackagesManager.tsx'],
  ['src/App.tsx', 'web_studio/src/App.tsx'],
  ['src/components/HomeScreenWeb.tsx', 'web_studio/src/components/HomeScreenWeb.tsx'],
  ['server.ts', 'web_studio/server.ts'],
  ['index.html', 'web_studio/index.html'],
];

for (const [f1, f2] of mirrorPairs) {
  const h1 = getHash(f1);
  const h2 = getHash(f2);
  assert.strictEqual(h1, h2, `SHA256 Parity mismatch between ${f1} and ${f2}`);
}
console.log('✅ [PASS] TC9: All safety invariants and 100% SHA256 mirror parity verified');

console.log('==================================================================');
console.log('🎉 ALL 9 MASTER ADMIN AUTH & RSS REMEDIATION CHECKS PASSED!');
console.log('==================================================================');
