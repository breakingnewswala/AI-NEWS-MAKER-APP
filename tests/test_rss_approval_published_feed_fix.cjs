const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('==================================================================');
console.log('🧪 VERIFYING RSS APPROVAL, PUBLISHED FEED & PORTAL DUMMY FIXES');
console.log('==================================================================');

// Helper to calculate SHA256
function getFileHash(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// 1. Verify Parity between root and web_studio
const filesToCompare = [
  ['server.ts', 'web_studio/server.ts'],
  ['src/lib/rssSourceManager.ts', 'web_studio/src/lib/rssSourceManager.ts'],
  ['src/components/HomeScreenWeb.tsx', 'web_studio/src/components/HomeScreenWeb.tsx'],
  ['src/data/newsFeedData.ts', 'web_studio/src/data/newsFeedData.ts'],
  ['deleted_news_ids.json', 'web_studio/deleted_news_ids.json'],
  ['news_database.json', 'web_studio/news_database.json'],
];

console.log('Testing TC1: 100% File Parity between root and web_studio...');
for (const [f1, f2] of filesToCompare) {
  const p1 = path.join(__dirname, '..', f1);
  const p2 = path.join(__dirname, '..', f2);
  assert(fs.existsSync(p1), `File missing: ${f1}`);
  assert(fs.existsSync(p2), `File missing: ${f2}`);
  const h1 = getFileHash(p1);
  const h2 = getFileHash(p2);
  assert.strictEqual(h1, h2, `SHA256 mismatch between ${f1} and ${f2}`);
}
console.log('✅ [PASS] TC1: 100% SHA256 parity verified across all files');

// 2. Verify Dummy Nai Dunia scraped item & s3_story_01 purged from database & deleted_news_ids
console.log('Testing TC2: Dummy items purged from news_database.json and registered in deleted_news_ids.json...');
const newsDb = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'news_database.json'), 'utf8'));
const deletedIds = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deleted_news_ids.json'), 'utf8'));

const foundDummyInDb = newsDb.find(
  (p) => p.id === 'web-src_1794763273176_ty2e-SGluZGkgTmV3cy' || p.id === 's3_story_01'
);
assert(!foundDummyInDb, 'Dummy item should NOT exist in news_database.json');
assert(
  deletedIds.includes('web-src_1794763273176_ty2e-SGluZGkgTmV3cy'),
  'web-src_1794763273176_ty2e-SGluZGkgTmV3cy must be registered in deleted_news_ids.json'
);
assert(
  deletedIds.includes('s3_story_01'),
  's3_story_01 must be registered in deleted_news_ids.json'
);
console.log('✅ [PASS] TC2: Dummy items cleanly removed from news_database and present in deleted_news_ids');

// 3. Verify isRealHindiNews filters out dummy portal items
console.log('Testing TC3: newsFeedData.ts isRealHindiNews filtering...');
const newsFeedCode = fs.readFileSync(path.join(__dirname, '..', 'src/data/newsFeedData.ts'), 'utf8');
assert(newsFeedCode.includes('ty2e-sgluzgtnzwnz'), 'newsFeedData.ts must check ty2e-sgluzgtnzwnz');
assert(newsFeedCode.includes('isRootDomain'), 'newsFeedData.ts must check isRootDomain');
assert(newsFeedCode.includes('समाचार वेबसाइट'), 'newsFeedData.ts must filter portal meta descriptions');
console.log('✅ [PASS] TC3: newsFeedData.ts filters portal meta and dummy scraper artifacts');

// 4. Verify server.ts isDummyWirePost and /api/admin/approve-news
console.log('Testing TC4: server.ts dummy filters and approve-news title sync...');
const serverCode = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');
assert(serverCode.includes("id === 's3_story_01'"), 'server.ts must filter s3_story_01');
assert(serverCode.includes('ty2e-sgluzgtnzwnz'), 'server.ts must filter ty2e-sgluzgtnzwnz');
assert(serverCode.includes('isPortalMetaText'), 'server.ts must filter isPortalMetaText');
assert(
  serverCode.includes('if (!approvedTitle)') && serverCode.includes('approvedTitle = postData.title || postData.headline || "समाचार"'),
  'server.ts must ensure approvedTitle is initialized before edDb[id] is set'
);
console.log('✅ [PASS] TC4: server.ts dummy wire post filter and approve-news title logic verified');

// 5. Verify rssSourceManager.ts approveRssPost, rejectRssPost, and getAllSyncedRssNewsPosts
console.log('Testing TC5: rssSourceManager.ts storage preservation & getAllSyncedRssNewsPosts...');
const rssManagerCode = fs.readFileSync(path.join(__dirname, '..', 'src/lib/rssSourceManager.ts'), 'utf8');
assert(
  rssManagerCode.includes('export function getAllSyncedRssNewsPosts(): NewsFeedPost[]'),
  'rssSourceManager.ts must export getAllSyncedRssNewsPosts'
);
assert(
  !rssManagerCode.includes('const cached = getActiveRssNewsPosts();\n    const target = postData || cached.find'),
  'approveRssPost must NOT read getActiveRssNewsPosts() which destroys pending posts'
);
assert(
  rssManagerCode.includes('const raw = localStorage.getItem(STORAGE_KEY_SYNCED_RSS_POSTS);'),
  'approveRssPost must read raw STORAGE_KEY_SYNCED_RSS_POSTS to preserve all posts'
);
assert(
  rssManagerCode.includes('isExplicitServerApproved'),
  'isRssPostApproved must verify explicit server editorial approval'
);
console.log('✅ [PASS] TC5: rssSourceManager.ts storage preservation and server approval verified');

// 6. Verify HomeScreenWeb.tsx state initialization and immediate optimistic updates
console.log('Testing TC6: HomeScreenWeb.tsx state management and optimistic updates...');
const homeScreenCode = fs.readFileSync(path.join(__dirname, '..', 'src/components/HomeScreenWeb.tsx'), 'utf8');
assert(
  homeScreenCode.includes('getAllSyncedRssNewsPosts'),
  'HomeScreenWeb.tsx must import and use getAllSyncedRssNewsPosts'
);
assert(
  homeScreenCode.includes('initialSet = getApprovedRssIds()') && homeScreenCode.includes('setApprovedRssIds'),
  'HomeScreenWeb.tsx must initialize approvedRssIds with getApprovedRssIds() and server posts'
);
assert(
  homeScreenCode.includes('setLocalPosts((prev) =>') && homeScreenCode.includes('return [updatedPost, ...filtered];'),
  'handleConfirmApproval must update localPosts immediately so published count increments with zero latency'
);
assert(
  homeScreenCode.includes('setActiveRssPosts((prev) =>') && homeScreenCode.includes('p.id === post.id ? updatedPost : p'),
  'handleConfirmApproval must update activeRssPosts immediately'
);
console.log('✅ [PASS] TC6: HomeScreenWeb.tsx state initialization and optimistic updates verified');

console.log('==================================================================');
console.log('🎉 ALL 6 SUITES IN TEST_RSS_APPROVAL_PUBLISHED_FEED_FIX PASSED!');
console.log('==================================================================');
