const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('================================================================');
console.log('🧪 VERIFYING MASTER BUG FIXES — FIVE PRODUCTION ISSUES');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// Issue 1: Ctrl + Shift + R Infinite Reload Loop & Favicon Consistency
// -----------------------------------------------------------------------------
runTest('Issue 1.1: index.html has no #loading-troubleshoot or reload loop handler', () => {
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert(!indexHtml.includes('loading-troubleshoot'), 'index.html must not contain loading-troubleshoot');
  assert(!indexHtml.includes('__chunk_recovery_attempted'), 'index.html must not contain chunk error reload loop');
  assert(!indexHtml.includes('Reload & Clear Cache'), 'index.html must not contain custom Reload & Clear Cache button');
});

runTest('Issue 1.2: public/delete-account/index.html has circular favicons', () => {
  const html = fs.readFileSync('public/delete-account/index.html', 'utf8');
  assert(html.includes('href="/favicon-32x32.png"'), 'Must include /favicon-32x32.png');
  assert(html.includes('href="/favicon.ico"'), 'Must include /favicon.ico');
  assert(!html.includes('href="/logo.svg"'), 'Must not link logo.svg as favicon');
});

runTest('Issue 1.3: server.ts guards /studio and /admin routes against non-HTML asset requests and replaces ./assets/', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8').replace(/\r\n/g, '\n');
  assert(serverTs.includes('app.use(["/studio/assets", "/admin/assets"], express.static('), 'Must mount static assets for /studio and /admin');
  assert(serverTs.includes('html.replace(/(src|href)=["\']\\.\\/assets\\//g, \'$1="/assets/\')'), 'renderSpaIndexHtml must rewrite ./assets/ to /assets/');
  assert(serverTs.includes('app.get(["/admin", "/admin/*"], (req, res) => {\n        const ext = path.extname(req.path);'), '/admin must check path.extname');
  assert(serverTs.includes('app.get(["/studio", "/studio/*"], (req, res) => {\n        const ext = path.extname(req.path);'), '/studio must check path.extname');
});

// -----------------------------------------------------------------------------
// Issue 2: Special Frame Deletion Persistence (df_1794406067554_albmw / TEST 2)
// -----------------------------------------------------------------------------
runTest('Issue 2.1: df_1794406067554_albmw is removed from PROTECTED_PRODUCTION_FRAME_IDS', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  const match = serverTs.match(/const PROTECTED_PRODUCTION_FRAME_IDS = new Set\(\[([\s\S]*?)\]\);/);
  assert(match, 'Must find PROTECTED_PRODUCTION_FRAME_IDS definition');
  assert(!match[1].includes('df_1794406067554_albmw'), 'df_1794406067554_albmw must not be protected from deletion');
});

runTest('Issue 2.2: loadDynamicFramesDatabaseAsync does not re-insert tombstoned df_1794406067554_albmw', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert(serverTs.includes("!hasAlbmw && !tombstones.has('df_1794406067554_albmw')"), 'Must check tombstones before restoring df_1794406067554_albmw');
  assert(serverTs.includes("!hasProdFrame && !tombstones.has('df_1794406067554_albmw')"), 'Must check tombstones before unshifting df_1794406067554_albmw');
});

// -----------------------------------------------------------------------------
// Issue 3: User Profile State, City & Social Branding Persistence
// -----------------------------------------------------------------------------
runTest('Issue 3.1: src/App.tsx getSavedChannelProfile preserves socialIcons without forcing true', () => {
  const appTsx = fs.readFileSync('src/App.tsx', 'utf8');
  assert(!appTsx.includes('facebook: true,\n                instagram: true,'), 'App.tsx must not hardcode facebook/instagram to true');
  assert(appTsx.includes('facebook: parsed.socialIcons?.facebook ?? true'), 'Must read parsed.socialIcons?.facebook');
  assert(appTsx.includes('instagram: parsed.socialIcons?.instagram ?? true'), 'Must read parsed.socialIcons?.instagram');
});

runTest('Issue 3.2: ProfileScreenWeb hydrates reporterState and reporterDistrict on mount and external sync', () => {
  const profileTsx = fs.readFileSync('src/components/ProfileScreenWeb.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert(profileTsx.includes('if (cloudP.state) {\n            setReporterState(cloudP.state);'), 'Must setReporterState from cloud profile state');
  assert(profileTsx.includes('if (parsed.state) setReporterState(parsed.state);'), 'Must setReporterState in handleProfileSync');
  assert(profileTsx.includes('if (parsed.district || parsed.location)'), 'Must setReporterDistrict in handleProfileSync');
});

// -----------------------------------------------------------------------------
// Issue 4: RSS Approval Persistence After Page Refresh
// -----------------------------------------------------------------------------
runTest('Issue 4.1: server.ts /api/admin/approve-news/:id sets full approval and publication flags', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8').replace(/\r\n/g, '\n');
  assert(serverTs.includes('approvalStatus: "APPROVED",\n        publicationStatus: "PUBLISHED",\n        isApproved: true,\n        isPublished: true,\n        isPrePublished: true,\n        editorialApproved: true,'), 'Must set full approval & publication flags on newly inserted approved post');
});

runTest('Issue 4.2: server.ts /api/approved-news-ids includes both posts and editorialDb', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert(serverTs.includes('approvedFromEditorial'), 'approved-news-ids must include approvedFromEditorial');
});

runTest('Issue 4.3: HomeScreenWeb merges posts serverIds instead of overwriting approvedRssIds', () => {
  const homeTsx = fs.readFileSync('src/components/HomeScreenWeb.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert(homeTsx.includes('setApprovedRssIds((prev) => {\n          const next = new Set(prev);'), 'HomeScreenWeb must merge approved IDs with prev Set');
});

// -----------------------------------------------------------------------------
// Issue 5: AI Headlines & Location Normalization
// -----------------------------------------------------------------------------
runTest('Issue 5.1: InlineAiNewsTools avoids initializing 5 tiers of instructional placeholder text', () => {
  const toolsTsx = fs.readFileSync('src/components/InlineAiNewsTools.tsx', 'utf8');
  assert(toolsTsx.includes("!base.includes('कृपया स्टेप 3') && !base.includes('अपनी मुख्य खबर का शीर्षक')"), 'Must reject placeholder headline text in initial state');
});

runTest('Issue 5.2: InlineAiNewsTools catch block generates real fallback headlines on timeout', () => {
  const toolsTsx = fs.readFileSync('src/components/InlineAiNewsTools.tsx', 'utf8');
  assert(toolsTsx.includes('candidateTitle'), 'Catch block must extract candidateTitle');
  assert(toolsTsx.includes('fitHeadlinesTo5TierRanges([candidateTitle]'), 'Catch block must generate real 5-tier headlines on timeout');
});

runTest('Issue 5.3: server.ts /api/process-news-command bypasses slow external scrape when home card content is present', () => {
  const serverTs = fs.readFileSync('server.ts', 'utf8');
  assert(serverTs.includes('isCardProvided'), 'Must check isCardProvided in /api/process-news-command');
  assert(serverTs.includes('effectiveArticleTitle = cleanHeadlineText(explicitCardTitle);'), 'Must use card title and summary directly when isCardProvided');
});

runTest('Issue 5.4: speakerUtils.ts preserves standard canonical space for Madhya Pradesh & Uttar Pradesh', () => {
  const speakerTs = fs.readFileSync('src/lib/speakerUtils.ts', 'utf8');
  assert(speakerTs.includes(".replace(/मध्यप्रदेश/g, 'मध्य प्रदेश')"), 'Must normalize मध्यप्रदेश to मध्य प्रदेश with space');
  assert(speakerTs.includes(".replace(/उत्तरप्रदेश/g, 'उत्तर प्रदेश')"), 'Must normalize उत्तरप्रदेश to उत्तर प्रदेश with space');
  assert(!speakerTs.includes(".replace(/मध्य\\s+प्रदेश/g, 'मध्यप्रदेश')"), 'Must not strip space from मध्य प्रदेश');
});

// -----------------------------------------------------------------------------
// Mirror Parity & Android Invariant
// -----------------------------------------------------------------------------
runTest('Parity: All modified files have 100% SHA256 parity between root and web_studio/', () => {
  const filesToVerify = [
    'index.html',
    'public/delete-account/index.html',
    'server.ts',
    'src/App.tsx',
    'src/components/HomeScreenWeb.tsx',
    'src/components/InlineAiNewsTools.tsx',
    'src/components/ProfileScreenWeb.tsx',
    'src/lib/rssSourceManager.ts',
    'src/lib/speakerUtils.ts',
  ];
  for (const rel of filesToVerify) {
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(rel)).digest('hex');
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(path.join('web_studio', rel))).digest('hex');
    assert.strictEqual(h1, h2, `Parity mismatch for ${rel}`);
  }
});

runTest('Android Application ID invariant preserved', () => {
  const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
  assert(gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
});

console.log('================================================================');
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('================================================================');
if (passedTests !== totalTests) {
  process.exit(1);
}
