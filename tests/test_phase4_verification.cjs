/**
 * AI NEWS MAKER — Phase 4 Final Hardening & Acceptance Automated Verification Suite
 * Verifies all 10 core safety invariants and architectural requirements.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('================================================================');
console.log('🧪 Starting Phase 4 Final Hardening & Acceptance Verification');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] Test ${totalTests}: ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// Test 1: Zero-news and Stale Cache Elimination in src/App.tsx
// ----------------------------------------------------------------------------
runTest('src/App.tsx: Initial news state starts empty and uses FeedStatus loading state', () => {
  const appTsx = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');

  // Verify FeedStatus definition
  assert(
    appTsx.includes("export type FeedStatus = 'loading' | 'verified' | 'empty' | 'error';"),
    'FeedStatus type union must be exported in App.tsx'
  );

  // Verify posts state initialized to [] (no stale localStorage.getItem on mount)
  assert(
    appTsx.includes("const [posts, setPosts] = useState<NewsFeedPost[]>([]);"),
    'posts state must initialize to empty array [] without reading stale localStorage cache'
  );

  // Verify feedStatus initialized to 'loading'
  assert(
    appTsx.includes("const [feedStatus, setFeedStatus] = useState<FeedStatus>('loading');"),
    "feedStatus state must initialize to 'loading'"
  );

  // Verify fetchLiveNews handles verified, empty, and error states
  assert(
    appTsx.includes("setFeedStatus('verified');"),
    "fetchLiveNews must set feedStatus to 'verified' when news is loaded"
  );
  assert(
    appTsx.includes("setFeedStatus('empty');"),
    "fetchLiveNews must set feedStatus to 'empty' when zero news returned"
  );
  assert(
    appTsx.includes("setFeedStatus('error');"),
    "fetchLiveNews must set feedStatus to 'error' on network/API failure"
  );

  // Verify stale localStorage cache purged on empty feed
  assert(
    appTsx.includes("localStorage.removeItem('app_news_posts_v2');"),
    'localStorage cache must be removed when verified server feed is empty'
  );
});

// ----------------------------------------------------------------------------
// Test 2: HomeScreenWeb FeedStatus UI & Retry Support
// ----------------------------------------------------------------------------
runTest('src/components/HomeScreenWeb.tsx: Explicit loading skeleton and error state with retry', () => {
  const homeScreen = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'HomeScreenWeb.tsx'), 'utf8');

  // Verify props interface accepts feedStatus and onRetryNews
  assert(
    homeScreen.includes("feedStatus?: FeedStatus;"),
    'HomeScreenWebProps must accept feedStatus?: FeedStatus'
  );
  assert(
    homeScreen.includes("onRetryNews?: () => void;"),
    'HomeScreenWebProps must accept onRetryNews?: () => void'
  );

  // Verify loading skeleton UI rendered when feedStatus === 'loading'
  assert(
    homeScreen.includes("feedStatus === 'loading'"),
    "HomeScreenWeb must render loading skeleton when feedStatus === 'loading'"
  );

  // Verify error UI and retry button rendered when feedStatus === 'error'
  assert(
    homeScreen.includes("feedStatus === 'error'"),
    "HomeScreenWeb must render error banner when feedStatus === 'error'"
  );
  assert(
    homeScreen.includes("onRetryNews"),
    'HomeScreenWeb must provide retry button wired to onRetryNews'
  );
});

// ----------------------------------------------------------------------------
// Test 3: Server-Authoritative Approval Lifecycle in rssSourceManager.ts
// ----------------------------------------------------------------------------
runTest('src/lib/rssSourceManager.ts: LocalStorage forgery prevention & server-authoritative approval', () => {
  const rssMgr = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'rssSourceManager.ts'), 'utf8');

  // Verify isRssPostApproved is exported
  assert(
    rssMgr.includes("export function isRssPostApproved("),
    'isRssPostApproved must be exported'
  );
  assert(
    rssMgr.includes("status === 'APPROVED'") && rssMgr.includes("approvalStatus === 'APPROVED'"),
    'isRssPostApproved must check server-side approval flags on the post'
  );
  assert(
    rssMgr.includes("if (!status && !approvalStatus) {") && rssMgr.includes("return false;"),
    'Posts with missing approval status must strictly return false'
  );

  // Verify syncAndMigrateLocalApprovals returns empty set on server failure (never falls back to stale local cache)
  assert(
    rssMgr.includes("return new Set<string>();"),
    'syncAndMigrateLocalApprovals must return empty Set on network error, never trusting forged local cache'
  );
});

// ----------------------------------------------------------------------------
// Test 4: Special Notification Board strictly requires server-verified APPROVED + PUBLISHED
// ----------------------------------------------------------------------------
runTest('src/components/HomeScreenWeb.tsx: isStrictlyApproved requires server confirmation', () => {
  const homeScreen = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'HomeScreenWeb.tsx'), 'utf8');

  assert(
    homeScreen.includes("const isStrictlyApproved = (p: any): boolean =>"),
    'isStrictlyApproved helper must exist in HomeScreenWeb'
  );
  assert(
    homeScreen.includes("const isApproved = status === 'APPROVED' || approvalStatus === 'APPROVED' || p.isApproved === true;"),
    'isStrictlyApproved must check server-verified approval status'
  );
  assert(
    homeScreen.includes("return Boolean(isApproved && isPublished);"),
    'isStrictlyApproved must return Boolean(isApproved && isPublished) without trusting localStorage alone'
  );
});

// ----------------------------------------------------------------------------
// Test 5: Multi-Page RSS Pagination & Capping in server.ts
// ----------------------------------------------------------------------------
runTest('server.ts: Multi-page RSS pagination up to 200 items per source with loop prevention', () => {
  const serverTs = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');

  // Configurable limits
  assert(
    serverTs.includes("const MAX_RSS_ITEMS_PER_SOURCE = parseInt(process.env.MAX_RSS_ITEMS_PER_SOURCE || \"200\", 10);"),
    'MAX_RSS_ITEMS_PER_SOURCE must default to 200 and be configurable via env'
  );
  assert(
    serverTs.includes("const MAX_PAGES_PER_SOURCE = parseInt(process.env.MAX_PAGES_PER_SOURCE || \"10\", 10);"),
    'MAX_PAGES_PER_SOURCE must default to 10 and be configurable via env'
  );

  // ParsedRssResult interface
  assert(
    serverTs.includes("interface ParsedRssResult extends Array<StoredNewsPost>"),
    'ParsedRssResult interface must extend Array<StoredNewsPost>'
  );

  // Visited URL tracking
  assert(
    serverTs.includes("const visitedPageUrls = new Set<string>();"),
    'visitedPageUrls Set must track fetched pages to prevent loops'
  );

  // While loop pagination
  assert(
    serverTs.includes("while (") && serverTs.includes("pageIndex < MAX_PAGES_PER_SOURCE") && serverTs.includes("sourceItems.length < MAX_RSS_ITEMS_PER_SOURCE"),
    'executeRssSynchronization must paginate with while loop checking pageIndex and MAX_RSS_ITEMS_PER_SOURCE'
  );

  // rel="next" detection
  assert(
    serverTs.includes("rel=[\"']next[\"']"),
    'Pagination must detect rel="next" links'
  );

  // Truncated & moreAvailable reporting in RssSyncResult
  assert(
    serverTs.includes("truncated?: boolean;") && serverTs.includes("moreAvailable?: boolean;"),
    'RssSyncResult interface must include truncated and moreAvailable'
  );
  assert(
    serverTs.includes("truncated: anySourceTruncated") && serverTs.includes("moreAvailable: anySourceTruncated"),
    'executeRssSynchronization must report truncated and moreAvailable in result'
  );
});

// ----------------------------------------------------------------------------
// Test 6: RSS 12-Hour Freshness Cutoff in server.ts
// ----------------------------------------------------------------------------
runTest('server.ts: 12-hour freshness window and early pagination termination', () => {
  const serverTs = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');

  // Freshness check in parseRssItemsFromXml
  assert(
    serverTs.includes("const twelveHoursAgo = Date.now() - 12 * 3600 * 1000;"),
    '12-hour cutoff timestamp calculation must exist'
  );
  assert(
    serverTs.includes("encounteredOlderThanCutoff = true;"),
    'encounteredOlderThanCutoff flag must be set when article is older than 12 hours'
  );

  // Pagination loop breaks on cutoff
  assert(
    serverTs.includes("if (parseResult.encounteredOlderThanCutoff) {") &&
    serverTs.includes("12-hour freshness cutoff reached"),
    'Pagination while loop must break immediately when encounteredOlderThanCutoff is true'
  );
});

// ----------------------------------------------------------------------------
// Test 7: Gemini Vision Dual-Asset Integration in server.ts
// ----------------------------------------------------------------------------
runTest('server.ts: POST /api/dynamic-frames/ai-analyze dual-asset support & safe logging', () => {
  const serverTs = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');

  // Both assets extracted
  assert(
    serverTs.includes("sampleBase64") && serverTs.includes("pngFrameBase64"),
    'ai-analyze must extract both sampleBase64 and pngFrameBase64'
  );

  // Distinct prompt roles
  assert(
    serverTs.includes("1. Primary Sample Graphic: Reference news graphic") &&
    serverTs.includes("2. Clean PNG Frame Asset: Overlay asset showing transparent cutouts"),
    'ai-analyze prompt must clearly define distinct roles for sample graphic and transparent frame asset'
  );

  // Safe logging: no base64 or API keys in console.log
  assert(
    !serverTs.includes("console.log(sampleBase64)") && !serverTs.includes("console.log(cleanBase64)"),
    'ai-analyze must never log base64 data to console'
  );

  // Fallback and warning metadata
  assert(
    serverTs.includes("isFallback:") && serverTs.includes("warning:"),
    'ai-analyze must return isFallback and warning metadata'
  );
});

// ----------------------------------------------------------------------------
// Test 8: Node.js 22 Runtime Compatibility
// ----------------------------------------------------------------------------
runTest('Dockerfile and package.json: Node 22 LTS runtime alignment', () => {
  const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
  assert(
    dockerfile.startsWith('FROM node:22-alpine'),
    'Dockerfile must use FROM node:22-alpine'
  );

  const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  assert(
    rootPkg.engines && rootPkg.engines.node === '>=22.0.0 <=24.x',
    'Root package.json engines.node must be >=22.0.0 <=24.x'
  );

  const studioPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'web_studio', 'package.json'), 'utf8'));
  assert(
    studioPkg.engines && studioPkg.engines.node === '>=22.0.0 <=24.x',
    'web_studio package.json engines.node must be >=22.0.0 <=24.x'
  );
});

// ----------------------------------------------------------------------------
// Test 9: Firebase Dual-Write Elimination in src/App.tsx
// ----------------------------------------------------------------------------
runTest('src/App.tsx: Direct unauthenticated CLOUD_STORAGE_UPLOAD_URL eliminated', () => {
  const appTsx = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.tsx'), 'utf8');

  // Verify CLOUD_STORAGE_UPLOAD_URL direct client write is removed from syncPostsToServer
  const syncPostsIdx = appTsx.indexOf('const syncPostsToServer =');
  const syncPostsBlock = appTsx.slice(syncPostsIdx, syncPostsIdx + 600);
  assert(
    !syncPostsBlock.includes('CLOUD_STORAGE_UPLOAD_URL'),
    'syncPostsToServer must not write directly to CLOUD_STORAGE_UPLOAD_URL'
  );
  assert(
    syncPostsBlock.includes('/api/news-posts'),
    'syncPostsToServer must write to authoritative /api/news-posts backend endpoint'
  );
});

// ----------------------------------------------------------------------------
// Test 10: 100% Mirror Parity between root and web_studio/
// ----------------------------------------------------------------------------
runTest('100% SHA256 Mirror Parity between root and web_studio/', () => {
  const filePairs = [
    ['src/App.tsx', 'web_studio/src/App.tsx'],
    ['src/components/HomeScreenWeb.tsx', 'web_studio/src/components/HomeScreenWeb.tsx'],
    ['src/lib/rssSourceManager.ts', 'web_studio/src/lib/rssSourceManager.ts'],
    ['server.ts', 'web_studio/server.ts'],
  ];

  for (const [f1, f2] of filePairs) {
    const p1 = path.join(__dirname, '..', f1);
    const p2 = path.join(__dirname, '..', f2);
    const h1 = crypto.createHash('sha256').update(fs.readFileSync(p1)).digest('hex');
    const h2 = crypto.createHash('sha256').update(fs.readFileSync(p2)).digest('hex');
    assert.strictEqual(h1, h2, `Parity check failed for ${f1} vs ${f2}`);
  }
});

// ----------------------------------------------------------------------------
// Test 11: Invariant Checks: Android applicationId & Default Frame Template
// ----------------------------------------------------------------------------
runTest('Android applicationId and Default Frame df_1794406067554_albmw preserved', () => {
  const gradlePath = path.join(__dirname, '..', 'app', 'build.gradle.kts');
  const gradleContent = fs.readFileSync(gradlePath, 'utf8');
  assert(
    gradleContent.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'),
    'Android applicationId must remain com.aistudio.ainewsmaker.hzwptx'
  );

  const framesDb = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'dynamic_frames_db.json'), 'utf8'));
  const targetFrame = framesDb.find((f) => f.id === 'df_1794406067554_albmw');
  assert(targetFrame, 'Frame df_1794406067554_albmw must exist in dynamic_frames_db.json');
  assert.strictEqual(targetFrame.status.toUpperCase(), 'APPROVED', 'Frame must be approved');
  assert.strictEqual(targetFrame.isPublished, true, 'Frame must be published');
});

console.log('\n================================================================');
console.log(`🎉 Phase 4 Verification Finished: ${passedTests}/${totalTests} Tests Passed`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
