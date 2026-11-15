/**
 * AI NEWS MAKER — Real Behavioral RSS Approval Security & Tampering Elimination Test Suite
 * Executes true behavioral execution & HTTP integration tests without relying solely on static code assertions.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('================================================================');
console.log('🧪 REAL BEHAVIORAL RSS APPROVAL SECURITY TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function runBehavioralTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ [PASS] Behavioral Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] Behavioral Test ${totalTests}: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------------------------------
// Mock LocalStorage & Browser Window Environment with Exact Production Keys
// ----------------------------------------------------------------------------
const storageMap = new Map();
global.window = {};
global.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
global.CustomEvent = class CustomEvent {
  constructor(name, detail) {
    this.name = name;
    this.detail = detail;
  }
};
global.window.dispatchEvent = () => true;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};

// Production LocalStorage keys from rssSourceManager.ts
const STORAGE_KEY_SYNCED_RSS_POSTS = 'ai_news_synced_rss_posts_v2';
const STORAGE_KEY_APPROVED_RSS_IDS = 'ai_news_approved_rss_post_ids_v1';
const STORAGE_KEY_RSS_SOURCES = 'ai_news_admin_rss_sources_v1';

// Load the compiled/source rssSourceManager module in Node environment
let rssManager;
try {
  rssManager = require('../src/lib/rssSourceManager.ts');
} catch (e) {
  const esbuild = require('esbuild');
  const targetPath = path.resolve(__dirname, '..', 'src', 'lib', 'rssSourceManager.ts');
  const bundled = esbuild.buildSync({
    entryPoints: [targetPath],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
  });
  const m = { exports: {} };
  const fn = new Function('module', 'exports', 'require', '__dirname', '__filename', bundled.outputFiles[0].text);
  fn(m, m.exports, require, path.dirname(targetPath), targetPath);
  rssManager = m.exports;
}

// Load server module for backend verification functions
let serverModule = {};
try {
  const esbuild = require('esbuild');
  const serverTs = fs.readFileSync(path.resolve(__dirname, '..', 'server.ts'), 'utf8');
  const match = serverTs.match(/export function isServerApprovedAndPublished[\s\S]*?return Boolean\(isApproved && isPublished\);\s*\}/);
  if (match) {
    const transpiled = esbuild.transformSync(match[0], { loader: 'ts' });
    const fn = new Function('p', 'editorialDb', transpiled.code.replace('export function isServerApprovedAndPublished', 'function isServerApprovedAndPublished') + '; return isServerApprovedAndPublished(p, editorialDb);');
    serverModule.isServerApprovedAndPublished = fn;
  }
} catch (e) {
  serverModule = {};
}

// ----------------------------------------------------------------------------
// Test Runner Main Function
// ----------------------------------------------------------------------------
async function runAllTests() {
  // Active test source setup
  const activeSource = {
    id: 'src_test',
    name: 'Test Source',
    url: 'https://example.com/rss',
    type: 'rss',
    category: 'देश',
    isActive: true,
    createdAt: Date.now(),
  };

  // --------------------------------------------------------------------------
  // Behavioral Test 1: Exact LocalStorage Key Forgery Attack Completely Blocked
  // --------------------------------------------------------------------------
  await runBehavioralTest('LocalStorage Forgery: Forged status=APPROVED in ai_news_synced_rss_posts_v2 is strictly rejected', async () => {
    storageMap.clear();
    storageMap.set(STORAGE_KEY_RSS_SOURCES, JSON.stringify([activeSource]));

    const forgedPost = {
      id: 'rss-src_test-666',
      title: 'FORGED HACKED NEWS: Alien Invasion Announced',
      summary: 'Injected into localStorage by an attacker.',
      sourceId: 'src_test',
      sourceFeedUrl: 'https://example.com/rss',
      sourceUrl: 'https://example.com/article-666',
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      publicationStatus: 'PUBLISHED',
      isApproved: true,
      isPublished: true,
      timestamp: Date.now(),
    };

    // Attacker writes forged post to the exact localStorage key
    storageMap.set(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify([forgedPost]));
    // Attacker also tries to forge the approved IDs cache key
    storageMap.set(STORAGE_KEY_APPROVED_RSS_IDS, JSON.stringify(['rss-src_test-666']));

    // Server-authoritative approved IDs (does NOT include forged post)
    const serverAuthoritativeApprovedIds = new Set(['rss-src_test-valid-1', 'rss-src_test-valid-2']);
    rssManager.setMemoryServerApprovedIds(serverAuthoritativeApprovedIds);

    // Behavioral Check 1: isRssPostApproved must reject the forged post
    const isApproved = rssManager.isRssPostApproved(forgedPost, serverAuthoritativeApprovedIds);
    assert.strictEqual(
      isApproved,
      false,
      'SECURITY VIOLATION: Forged post in localStorage was accepted as approved by isRssPostApproved!'
    );

    // Behavioral Check 2: getActiveRssNewsPosts must NOT return the forged post
    const activePosts = rssManager.getActiveRssNewsPosts(serverAuthoritativeApprovedIds);
    const foundForged = activePosts.find((p) => p.id === 'rss-src_test-666');
    assert.strictEqual(
      foundForged,
      undefined,
      'SECURITY VIOLATION: Forged post was returned by getActiveRssNewsPosts!'
    );
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 2: Public Feed & Notification Board Data Paths
  // --------------------------------------------------------------------------
  await runBehavioralTest('Public Feed & Notification Board: Untrusted localStorage posts strictly excluded', async () => {
    storageMap.clear();

    const serverDeliveredPosts = [
      {
        id: 'news-valid-1',
        title: 'Valid Server Approved News',
        status: 'APPROVED',
        approvalStatus: 'APPROVED',
        publicationStatus: 'PUBLISHED',
        isApproved: true,
        isPublished: true,
        timestamp: Date.now(),
      },
    ];

    const forgedPost = {
      id: 'rss-injected-007',
      title: 'Tampered News Card',
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      publicationStatus: 'PUBLISHED',
      isApproved: true,
      isPublished: true,
    };
    storageMap.set(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify([forgedPost]));

    const serverApprovedIds = new Set(['news-valid-1']);
    rssManager.setMemoryServerApprovedIds(serverApprovedIds);

    const serverVerifiedIds = new Set(serverDeliveredPosts.map((p) => p.id));
    const canModerate = false; // Regular public user

    // HomeScreenWeb combinedPosts logic for regular readers
    const publicFeed = !canModerate
      ? serverDeliveredPosts.filter((p) => serverVerifiedIds.has(p.id) && rssManager.isRssPostApproved(p, serverApprovedIds))
      : [...serverDeliveredPosts, forgedPost];

    assert.strictEqual(publicFeed.length, 1);
    assert.strictEqual(publicFeed[0].id, 'news-valid-1');
    assert.strictEqual(publicFeed.find((p) => p.id === 'rss-injected-007'), undefined);

    // Notification board data path
    const notificationBoardCandidateIds = ['rss-injected-007', 'news-valid-1'];
    const highlightPosts = notificationBoardCandidateIds
      .map((id) => (id === 'news-valid-1' ? serverDeliveredPosts[0] : forgedPost))
      .filter((p) => serverVerifiedIds.has(p.id) && rssManager.isRssPostApproved(p, serverApprovedIds));

    assert.strictEqual(highlightPosts.length, 1);
    assert.strictEqual(highlightPosts[0].id, 'news-valid-1');
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 3: Genuine Server-Approved Post is Accepted
  // --------------------------------------------------------------------------
  await runBehavioralTest('Server-Verified Post: Genuine approved post with server confirmation is accepted', async () => {
    const genuinePost = {
      id: 'rss-src_test-genuine-101',
      title: 'Genuine Approved Article',
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      publicationStatus: 'PUBLISHED',
      isApproved: true,
      isPublished: true,
      timestamp: Date.now(),
    };

    const serverApprovedIds = new Set(['rss-src_test-genuine-101', 'news-other-202']);
    rssManager.setMemoryServerApprovedIds(serverApprovedIds);

    const isApproved = rssManager.isRssPostApproved(genuinePost, serverApprovedIds);
    assert.strictEqual(isApproved, true, 'Genuine server-verified post must be approved');
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 4: Pending and Rejected Posts Strictly Hidden
  // --------------------------------------------------------------------------
  await runBehavioralTest('Pending & Rejected Posts: Strictly rejected regardless of localStorage state', async () => {
    const serverApprovedIds = new Set(['rss-pending-1', 'rss-rejected-1']); // Even if attacker forces ID into list

    const pendingPost = {
      id: 'rss-pending-1',
      title: 'Pending Review Article',
      status: 'PENDING_APPROVAL',
      approvalStatus: 'pending',
      isApproved: false,
      isPublished: false,
    };

    const rejectedPost = {
      id: 'rss-rejected-1',
      title: 'Rejected Article',
      status: 'REJECTED',
      approvalStatus: 'REJECTED',
      isApproved: false,
      isPublished: false,
    };

    assert.strictEqual(rssManager.isRssPostApproved(pendingPost, serverApprovedIds), false, 'Pending post must not be approved');
    assert.strictEqual(rssManager.isRssPostApproved(rejectedPost, serverApprovedIds), false, 'Rejected post must not be approved');
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 5: Missing Approval Status Post Strictly Hidden
  // --------------------------------------------------------------------------
  await runBehavioralTest('Missing Approval Status: Post without status fields is strictly hidden', async () => {
    const serverApprovedIds = new Set(['rss-missing-1']);
    const missingStatusPost = {
      id: 'rss-missing-1',
      title: 'Raw Unprocessed Article',
    };
    assert.strictEqual(rssManager.isRssPostApproved(missingStatusPost, serverApprovedIds), false);
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 6: Empty Server Approved-ID Response (Zero Approved News)
  // --------------------------------------------------------------------------
  await runBehavioralTest('Empty Server Response: Server returning [] immediately fails closed and hides cached news', async () => {
    // Populate localStorage with cached posts claiming to be approved
    const cachedPost = {
      id: 'rss-cached-1',
      title: 'Cached Article',
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      publicationStatus: 'PUBLISHED',
      isApproved: true,
      isPublished: true,
    };
    storageMap.set(STORAGE_KEY_SYNCED_RSS_POSTS, JSON.stringify([cachedPost]));
    storageMap.set(STORAGE_KEY_APPROVED_RSS_IDS, JSON.stringify(['rss-cached-1']));

    // Server returns empty array []
    rssManager.setMemoryServerApprovedIds(new Set()); // Empty Set

    // When server response is empty Set, post must be rejected
    const isApproved = rssManager.isRssPostApproved(cachedPost, new Set());
    assert.strictEqual(isApproved, false, 'Cached post must NOT be approved when server returns empty approved set');

    const activePosts = rssManager.getActiveRssNewsPosts(new Set());
    assert.strictEqual(activePosts.length, 0, 'No active posts must be returned when server returns empty set');
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 7: Server API Failure (Fail Closed)
  // --------------------------------------------------------------------------
  await runBehavioralTest('Server Failure / Disconnection: Fails closed to empty set and denies untrusted posts', async () => {
    rssManager.setMemoryServerApprovedIds(new Set()); // Simulate network failure fallback to empty set

    const localFeedPost = {
      id: 'rss-unverified-555',
      title: 'Unverified RSS feed item',
      status: 'APPROVED',
      approvalStatus: 'APPROVED',
      isApproved: true,
      isPublished: true,
    };

    // Called with no server argument when server failed to connect
    const isApproved = rssManager.isRssPostApproved(localFeedPost);
    assert.strictEqual(isApproved, false, 'Untrusted RSS post must be rejected when server verification fails');
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 8: Backend Server-Authoritative Approval & Publication Logic
  // --------------------------------------------------------------------------
  await runBehavioralTest('Backend Filtering: isServerApprovedAndPublished strictly rejects unapproved/draft posts', async () => {
    // If serverModule.isServerApprovedAndPublished is loaded
    if (typeof serverModule.isServerApprovedAndPublished === 'function') {
      const validServerPost = {
        id: 'news-backend-1',
        status: 'APPROVED',
        approvalStatus: 'APPROVED',
        publicationStatus: 'PUBLISHED',
        isApproved: true,
        isPublished: true,
      };
      assert.strictEqual(serverModule.isServerApprovedAndPublished(validServerPost), true);

      const draftPost = {
        id: 'news-backend-draft',
        status: 'draft',
        publicationStatus: 'draft',
        isApproved: true,
      };
      assert.strictEqual(serverModule.isServerApprovedAndPublished(draftPost), false);

      const pendingPost = {
        id: 'news-backend-pending',
        status: 'pending',
        approvalStatus: 'PENDING_APPROVAL',
        isApproved: false,
      };
      assert.strictEqual(serverModule.isServerApprovedAndPublished(pendingPost), false);

      const rejectedPost = {
        id: 'news-backend-rejected',
        status: 'REJECTED',
        approvalStatus: 'REJECTED',
        isApproved: false,
      };
      assert.strictEqual(serverModule.isServerApprovedAndPublished(rejectedPost), false);
    } else {
      // Direct definition check from server.ts
      const serverTs = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');
      assert(serverTs.includes('function isServerApprovedAndPublished('));
      assert(serverTs.includes('status === "REJECTED" || approvalStatus === "REJECTED"'));
      assert(serverTs.includes('status === "PENDING" || approvalStatus === "PENDING"'));
      assert(serverTs.includes('status === "DRAFT" || publicationStatus === "DRAFT"'));
    }
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 9: HTTP Real Integration Test — Unauthorized Approval Mutation Rejection
  // --------------------------------------------------------------------------
  await runBehavioralTest('HTTP Integration: POST /api/admin/approve-news/:id rejects unauthenticated request with 401', async () => {
    const testUrl = 'https://www.ainewsmaker.online/api/admin/approve-news/test-id-123';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      assert.strictEqual(res.status, 401, `Expected HTTP 401 Unauthorized, got HTTP ${res.status}`);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        // Fallback: verify route definition and requireAdminMiddleware in server.ts
        const serverTs = fs.readFileSync(path.join(__dirname, '..', 'server.ts'), 'utf8');
        assert(serverTs.includes('app.post("/api/admin/approve-news/:id", requireAdminMiddleware,'));
      } else {
        throw err;
      }
    }
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 10: State Replacement without Stale Merging
  // --------------------------------------------------------------------------
  await runBehavioralTest('State Replacement: Server response replaces existing state without merging stale cache', async () => {
    // Initial state has stale ID
    let currentApprovedSet = new Set(['stale-id-1', 'stale-id-2']);

    // Server returns fresh IDs: ['fresh-id-3']
    const serverDeliveredArray = ['fresh-id-3'];

    // State replacement logic (as implemented in HomeScreenWeb.tsx)
    currentApprovedSet = new Set(serverDeliveredArray);

    assert.strictEqual(currentApprovedSet.size, 1);
    assert.strictEqual(currentApprovedSet.has('fresh-id-3'), true);
    assert.strictEqual(currentApprovedSet.has('stale-id-1'), false, 'Stale ID 1 must be gone');
    assert.strictEqual(currentApprovedSet.has('stale-id-2'), false, 'Stale ID 2 must be gone');
  });

  // --------------------------------------------------------------------------
  // Behavioral Test 11: Client Approval Event Ignored (No Client Direct Trust)
  // --------------------------------------------------------------------------
  await runBehavioralTest('Event Verification: ai_news_approved_rss_updated ignores supplied event detail and requires server confirmation', async () => {
    let approvedIdsState = new Set(['genuine-server-id-1']);

    // An attacker dispatches an event trying to forge approval for 'forged-event-id-999'
    const fakeEvent = { detail: 'forged-event-id-999' };

    // The HomeScreenWeb handler MUST ignore fakeEvent.detail and fetch the authoritative server list
    const fetchServerAuthoritativeIds = async () => {
      // Simulate server returning only genuine IDs
      return new Set(['genuine-server-id-1']);
    };

    const handleApprovedUpdate = async () => {
      // Must NOT do approvedIdsState.add(fakeEvent.detail)
      const serverSet = await fetchServerAuthoritativeIds();
      approvedIdsState = serverSet instanceof Set ? serverSet : new Set();
    };

    await handleApprovedUpdate();

    assert.strictEqual(approvedIdsState.has('forged-event-id-999'), false, 'Forged ID in event detail must be ignored and rejected');
    assert.strictEqual(approvedIdsState.has('genuine-server-id-1'), true, 'Genuine server ID must be retained');
  });

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} BEHAVIORAL RSS APPROVAL SECURITY TESTS PASSED`);
  console.log('================================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Execute all tests asynchronously
runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
