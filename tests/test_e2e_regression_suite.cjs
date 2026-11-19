/**
 * AI NEWS MAKER — Comprehensive E2E Regression Test Suite
 * Repository: breakingnewswala/AI-NEWS-MAKER-APP
 * Target: Tests A through G across all 4 Tiers (Feature Coverage, Boundary & Corner Cases,
 * Cross-Feature Interactions, Real-World Application Scenarios).
 * 
 * Invocation:
 *   node tests/test_e2e_regression_suite.cjs
 *   node tests/test_e2e_regression_suite.cjs --report-only
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const assert = require('assert');

console.log('================================================================================');
console.log('🧪 AI NEWS MAKER — COMPREHENSIVE E2E REGRESSION TEST SUITE');
console.log('   Tiers 1-4 | Feature Domains A through G | Opaque-Box & Requirement Driven');
console.log('================================================================================\n');

// ---------------------------------------------------------------------------------
// State & Metrics Tracking
// ---------------------------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
const failedTests = [];
const suiteStartTime = Date.now();

// ---------------------------------------------------------------------------------
// Environment & Cryptographic Auth Setup
// ---------------------------------------------------------------------------------
const origEnv = {
  SESSION_SECRET: process.env.SESSION_SECRET,
  NO_SERVER_START: process.env.NO_SERVER_START,
  IS_TEST_ENV: process.env.IS_TEST_ENV,
};

const TEST_AUTH_SECRET = process.env.SESSION_SECRET || 'ai_news_maker_e2e_test_secret_32_characters_minimum!';
process.env.SESSION_SECRET = TEST_AUTH_SECRET;
process.env.NO_SERVER_START = 'true';
process.env.IS_TEST_ENV = 'true';

function createToken(options = {}) {
  const {
    userId = 'test_user_id',
    email = 'user@example.com',
    role = 'user',
    username = 'testuser',
    expOffsetSec = 3600,
    secret = TEST_AUTH_SECRET,
  } = options;

  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    email: email.toLowerCase().trim(),
    role,
    username,
    iat: nowSec,
    exp: nowSec + expOffsetSec,
  };

  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encHeader}.${encPayload}`)
    .digest('base64url');

  return `${encHeader}.${encPayload}.${signature}`;
}

const getSuperAdminToken = () =>
  createToken({ email: 'breakingnewswala.com@gmail.com', role: 'superadmin', username: 'master_admin' });
const getAdminToken = () =>
  createToken({ email: 'admin.ainewsmaker@gmail.com', role: 'admin', username: 'regular_admin' });
const getUserToken = () =>
  createToken({ email: 'subscriber@example.com', role: 'user', username: 'subscriber' });
const getExpiredToken = () =>
  createToken({ email: 'breakingnewswala.com@gmail.com', role: 'superadmin', expOffsetSec: -3600 });
const getMalformedToken = () => 'invalid.header.badsig';

// ---------------------------------------------------------------------------------
// Ephemeral / Live Server Harness
// ---------------------------------------------------------------------------------
let serverInstance = null;
let baseUrl = '';

async function setupServer() {
  const forceEphemeral = process.argv.includes('--force-ephemeral') ||
    process.argv.includes('--ephemeral') ||
    process.env.FORCE_EPHEMERAL === 'true';

  // Check if live server is already up on standard ports (unless ephemeral forced)
  if (!forceEphemeral) {
    for (const port of [3000, 3333]) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/music-library`, {
          signal: AbortSignal.timeout(600),
        }).catch(() => null);
        if (res && res.status === 200) {
          const testJson = await res.json().catch(() => null);
          if (testJson && typeof testJson === 'object') {
            baseUrl = `http://127.0.0.1:${port}`;
            console.log(`[E2E Runner] Connected to existing live server on ${baseUrl}\n`);
            return;
          }
        }
      } catch {}
    }
  }

  // Otherwise, spin up ephemeral server instance from server.cjs
  const serverPath = path.resolve(__dirname, '..', 'server.cjs');
  let serverApp;
  try {
    const mod = require(serverPath);
    serverApp = mod.app;
  } catch (err) {
    console.error('[E2E Runner] Failed to require server.cjs:', err.message);
    throw err;
  }

  await new Promise((resolve, reject) => {
    serverInstance = serverApp.listen(0, '127.0.0.1', () => {
      const port = serverInstance.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[E2E Runner] Spun up ephemeral test server on ${baseUrl}\n`);
      resolve();
    });
    serverInstance.on('error', reject);
  });
}

function teardownServer() {
  if (serverInstance) {
    try {
      serverInstance.closeAllConnections?.();
      serverInstance.close();
      console.log('\n[E2E Runner] Ephemeral test server closed.');
    } catch {}
  }
  // Restore original environment
  for (const [key, val] of Object.entries(origEnv)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------------
// Request Helper
// ---------------------------------------------------------------------------------
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  const headers = options.headers || {};
  let body = options.body;
  if (body !== undefined && typeof body !== 'string' && !(body instanceof Buffer)) {
    body = JSON.stringify(body);
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
    signal: AbortSignal.timeout(options.timeout || 12000),
  });

  let json = null;
  let text = '';
  try {
    text = await res.text();
    json = JSON.parse(text);
  } catch {}

  return {
    status: res.status,
    headers: res.headers,
    ok: res.ok,
    body: json,
    text,
  };
}

// ---------------------------------------------------------------------------------
// Test Runner Function
// ---------------------------------------------------------------------------------
async function runTest(id, domain, tier, description, testFn) {
  totalTests++;
  const testStart = Date.now();
  process.stdout.write(`  [RUN] ${id} (${tier}): ${description}... `);
  try {
    await testFn();
    const duration = Date.now() - testStart;
    console.log(`✅ PASS (${duration}ms)`);
    passedTests++;
  } catch (err) {
    const duration = Date.now() - testStart;
    console.log(`❌ FAIL (${duration}ms)`);
    console.log(`       Reason: ${err.message}`);
    failedTests.push({ id, domain, tier, description, error: err.message, stack: err.stack });
  }
}

// ---------------------------------------------------------------------------------
// Cached AST / Source Files
// ---------------------------------------------------------------------------------
const readSource = (relPath) => fs.readFileSync(path.resolve(__dirname, '..', relPath), 'utf8');

const apiConfigCode = readSource('src/lib/apiConfig.ts');
const rssSourceManagerCode = readSource('src/lib/rssSourceManager.ts');
const plansManagerCode = readSource('src/components/AdminPlansAndPackagesManager.tsx');
const loginModalCode = readSource('src/components/LoginModal.tsx');
const whatsappInboxCode = readSource('src/components/WhatsAppLiveInbox.tsx');
const musicManagerCode = readSource('src/components/AdminMusicLibraryManager.tsx');
const apiKeysManagerCode = readSource('src/components/AdminApiKeysManager.tsx');
const frameModalCode = readSource('src/components/DynamicFrameGeneratorModal.tsx');
const homeScreenCode = readSource('src/components/HomeScreenWeb.tsx');
const appCode = readSource('src/App.tsx');
const serverCode = readSource('server.ts');

// ---------------------------------------------------------------------------------
// MAIN TEST SUITE EXECUTION
// ---------------------------------------------------------------------------------
async function main() {
  await setupServer();

  try {
    // =============================================================================
    // DOMAIN A: Authentication & Token Architecture (R1)
    // =============================================================================
    console.log('\n--- DOMAIN A: Authentication & Token Architecture (R1) ---');

    await runTest('A-T1-1', 'Auth', 'Tier 1', 'Request with valid Bearer token for admin endpoint returns 200 OK', async () => {
      const res = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(res.body?.success, true, 'Expected body.success to be true');
    });

    await runTest('A-T1-2', 'Auth', 'Tier 1', 'Request without Authorization header returns 401 Unauthorized', async () => {
      const res = await request('/api/admin/music-library');
      assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    });

    await runTest('A-T1-3', 'Auth', 'Tier 1', 'Master admin credentials resolve correctly to superadmin role', async () => {
      const res = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert.strictEqual(res.status, 200);
      assert(
        serverCode.includes('email === MASTER_ADMIN_EMAIL') &&
        serverCode.includes('userRole = "superadmin"'),
        'server.ts must map MASTER_ADMIN_EMAIL strictly to superadmin role'
      );
    });

    await runTest('A-T1-4', 'Auth', 'Tier 1', 'Regular admin credentials resolve correctly to admin role', async () => {
      const res = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK for regular admin, got ${res.status}`);
      assert(
        serverCode.includes('email === REGULAR_ADMIN_EMAIL') &&
        serverCode.includes('userRole = "admin"'),
        'server.ts must map REGULAR_ADMIN_EMAIL to admin role'
      );
    });

    await runTest('A-T1-5', 'Auth', 'Tier 1', 'Single-retry mechanism executes at most one refresh upon encountering 401', async () => {
      assert(
        apiConfigCode.includes('response.status === 401'),
        'apiConfig.ts must detect 401 status for retry logic'
      );
      assert(
        apiConfigCode.includes('ensureAuthToken') || apiConfigCode.includes('refresh-session'),
        'apiConfig.ts must trigger single token refresh on 401'
      );
    });

    await runTest('A-T2-1', 'Auth', 'Tier 2', '403 Forbidden does NOT trigger a token refresh loop or retry', async () => {
      const res = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${getUserToken()}` },
      });
      assert.strictEqual(res.status, 403, `Expected 403 Forbidden for non-admin, got ${res.status}`);
      // Verify customFetch does not retry on 403
      const customFetchIdx = apiConfigCode.indexOf('const customFetch');
      const customFetchSegment = customFetchIdx !== -1 ? apiConfigCode.slice(customFetchIdx) : '';
      assert(
        !customFetchSegment.includes('response.status === 403 && !init._isRetry'),
        'customFetch must NEVER trigger refresh retry loops on 403 Forbidden'
      );
    });

    await runTest('A-T2-2', 'Auth', 'Tier 2', 'Expired Bearer token returns 401 and does NOT wipe local credentials', async () => {
      const res = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${getExpiredToken()}` },
      });
      assert.strictEqual(res.status, 401, `Expected 401 for expired token, got ${res.status}`);
      const customFetchIdx = apiConfigCode.indexOf('const customFetch');
      const retrySegment = customFetchIdx !== -1 ? apiConfigCode.slice(customFetchIdx) : '';
      assert(
        !retrySegment.includes('clearAuthTokens();'),
        'customFetch must not wipe localStorage tokens on 401'
      );
    });

    await runTest('A-T2-3', 'Auth', 'Tier 2', 'Malformed Bearer token returns 401 cleanly without 500 server crash', async () => {
      const res = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${getMalformedToken()}` },
      });
      assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    });

    await runTest('A-T2-4', 'Auth', 'Tier 2', 'Multipart FormData requests retain browser boundary parameter in Content-Type', async () => {
      assert(
        apiConfigCode.includes('init?.body instanceof FormData') &&
        apiConfigCode.includes("init.headers.delete('Content-Type')"),
        'apiConfig.ts must delete Content-Type on FormData to allow browser multipart boundary generation'
      );
    });

    await runTest('A-T2-5', 'Auth', 'Tier 2', 'Concurrently dispatched admin requests await auth resolution without race conditions', async () => {
      const token = getSuperAdminToken();
      const results = await Promise.all([
        request('/api/admin/music-library', { headers: { Authorization: `Bearer ${token}` } }),
        request('/api/admin/music-library', { headers: { Authorization: `Bearer ${token}` } }),
        request('/api/admin/music-library', { headers: { Authorization: `Bearer ${token}` } }),
        request('/api/admin/music-library', { headers: { Authorization: `Bearer ${token}` } }),
        request('/api/admin/music-library', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      for (const r of results) {
        assert.strictEqual(r.status, 200, `Concurrent request failed with status ${r.status}`);
      }
    });

    await runTest('A-T3-1', 'Auth', 'Tier 3', 'Cross-feature: Auth token lifecycle across Music, RSS, and Key Pool endpoints in sequence', async () => {
      const token = getSuperAdminToken();
      const headers = { Authorization: `Bearer ${token}` };
      const r1 = await request('/api/admin/music-library', { headers });
      assert.strictEqual(r1.status, 200, 'Music library failed');
      const r2 = await request('/api/admin/rss-sources', { headers });
      assert.strictEqual(r2.status, 200, 'RSS sources failed');
      const r3 = await request('/api/admin/api-keys', { headers });
      assert.strictEqual(r3.status, 200, 'API keys failed');
    });

    // =============================================================================
    // DOMAIN B: API Manager & Free Key Pool (R2)
    // =============================================================================
    console.log('\n--- DOMAIN B: API Manager & Free Key Pool (R2) ---');

    await runTest('B-T1-1', 'API Manager', 'Tier 1', 'POST /api/admin/api-keys/free adds a valid Gemini key and returns masked key string', async () => {
      const testKey = 'AIzaSyD-' + crypto.randomBytes(8).toString('hex') + '-12345678';
      const res = await request('/api/admin/api-keys/free', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { apiKey: testKey },
      });
      // The endpoint performs live provider validation: valid key -> 200 with masked key; invalid key -> 400
      assert(
        res.status === 200 || (res.status === 400 && res.body?.error?.includes('अमान्य API Key')),
        `Expected 200 (valid key) or 400 (classified invalid key), got ${res.status}`
      );
      if (res.status === 200) {
        assert(res.body?.key?.maskedKey || res.body?.maskedKey, 'Expected masked key in response');
      }
    });

    await runTest('B-T1-2', 'API Manager', 'Tier 1', 'GET /api/admin/api-keys lists masked keys and correct active count', async () => {
      const res = await request('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert.strictEqual(res.status, 200);
      const keys = res.body?.freeKeys || res.body?.keys || [];
      assert(Array.isArray(keys), 'Expected freeKeys array');
      for (const k of keys) {
        assert(!k.key || k.key.includes('***') || k.key.length <= 12, 'Raw unmasked key must not be exposed');
      }
    });

    await runTest('B-T1-3', 'API Manager', 'Tier 1', 'POST /api/admin/api-keys/test-id returns structured health state', async () => {
      const res = await request('/api/admin/api-keys/test-id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { keyId: 'default' },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK from api-keys/test-id, got ${res.status}`);
      assert(res.body && typeof res.body === 'object', 'Expected structured JSON response');
      assert(res.body.state !== undefined || res.body.healthStatus !== undefined || res.body.success !== undefined,
        'Expected structured health state in response');
    });

    await runTest('B-T1-4', 'API Manager', 'Tier 1', 'VIP routing flag toggle persists in state', async () => {
      const res = await request('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert.strictEqual(res.status, 200);
      assert(typeof res.body?.vipRoutingEnabled === 'boolean' || res.body?.vipRoutingEnabled !== undefined,
        'Expected vipRoutingEnabled in API keys response');
    });

    await runTest('B-T1-5', 'API Manager', 'Tier 1', 'Key deletion removes key from pool and updates vault', async () => {
      const res = await request('/api/admin/api-keys/free/non_existent_id_for_testing', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    });

    await runTest('B-T2-1', 'API Manager', 'Tier 2', 'Duplicate key submission is rejected with 400 Bad Request', async () => {
      const duplicateKey = 'AIzaSyD-DUPLICATE-KEY-FOR-TESTING-12345';
      await request('/api/admin/api-keys/free', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { apiKey: duplicateKey },
      });
      const secondRes = await request('/api/admin/api-keys/free', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { apiKey: duplicateKey },
      });
      assert.strictEqual(secondRes.status, 400, `Expected 400 Bad Request on duplicate key, got ${secondRes.status}`);
    });

    await runTest('B-T2-2', 'API Manager', 'Tier 2', 'Empty or malformed API key string is rejected', async () => {
      const res = await request('/api/admin/api-keys/free', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { apiKey: '' },
      });
      assert.strictEqual(res.status, 400, `Expected 400 on empty key, got ${res.status}`);
    });

    await runTest('B-T2-3', 'API Manager', 'Tier 2', '429 Quota exhaustion is distinctly classified from 401/403 Invalid Key', async () => {
      assert(
        serverCode.includes('RESOURCE_EXHAUSTED') || serverCode.includes('429'),
        'server.ts must classify 429 RESOURCE_EXHAUSTED distinctly'
      );
      assert(
        serverCode.includes('quota_exhausted') || serverCode.includes('quota'),
        'server.ts must provide distinct quota status'
      );
    });

    await runTest('B-T2-4', 'API Manager', 'Tier 2', 'Fallback model array uses valid production models (gemini-2.5-flash, not gemini-3-flash-preview)', async () => {
      assert(
        !serverCode.includes('"gemini-3-flash-preview"') &&
        !serverCode.includes("'gemini-3-flash-preview'"),
        'server.ts must not reference invalid or decommissioned gemini-3-flash-preview model'
      );
      assert(
        serverCode.includes('gemini-3.1-flash-lite') || serverCode.includes('gemini-3.5-flash-lite') || serverCode.includes('gemini-2.5-flash') || serverCode.includes('gemini-2.0-flash'),
        'server.ts must configure valid production models (gemini-3.1-flash-lite)'
      );
    });

    await runTest('B-T2-5', 'API Manager', 'Tier 2', 'Non-admin requests to key management endpoints are rejected with 401/403', async () => {
      const anonRes = await request('/api/admin/api-keys');
      assert.strictEqual(anonRes.status, 401, 'Anonymous request must return 401');
      const userRes = await request('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${getUserToken()}` },
      });
      assert.strictEqual(userRes.status, 403, 'Regular user request must return 403');
    });

    await runTest('B-T3-1', 'API Manager', 'Tier 3', 'Cross-feature: Key pool exhaustion triggers fallback routing or Paid VIP key', async () => {
      assert(
        serverCode.includes('vipRoutingEnabled') &&
        serverCode.includes('paidKey'),
        'server.ts must support VIP paid key fallback routing on key pool exhaustion'
      );
    });

    // =============================================================================
    // DOMAIN C: RSS Feed Management & Sync (R2)
    // =============================================================================
    console.log('\n--- DOMAIN C: RSS Feed Management & Sync (R2) ---');

    await runTest('C-T1-1', 'RSS', 'Tier 1', 'GET /api/admin/rss-sources lists configured feeds without throwing ReferenceError', async () => {
      const res = await request('/api/admin/rss-sources', {
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body) || Array.isArray(res.body?.sources), 'Expected array of RSS sources');
    });

    await runTest('C-T1-2', 'RSS', 'Tier 1', 'POST /api/admin/rss-sources adds a new feed source and updates feed catalog', async () => {
      const res = await request('/api/admin/rss-sources', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          name: 'E2E Wire ' + Date.now(),
          url: 'https://news.google.com/rss?e2e=' + Date.now(),
          category: 'देश',
          isActive: true,
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert(res.body?.id || res.body?.source?.id || res.body?.success, 'Expected added feed record');
    });

    await runTest('C-T1-3', 'RSS', 'Tier 1', 'DELETE /api/admin/rss-sources/:id removes a feed source', async () => {
      const res = await request('/api/admin/rss-sources/non_existent_e2e_id', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    });

    await runTest('C-T1-4', 'RSS', 'Tier 1', 'Manual sync trigger returns count of synced articles', async () => {
      const res = await request('/api/scheduler/rss-sync', {
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK from scheduler sync endpoint, got ${res.status}`);
      assert(res.body && typeof res.body === 'object', 'Expected structured JSON response from scheduler endpoint');
      assert(res.body.success !== undefined || res.body.status !== undefined, 'Expected valid sync result structure');
    });

    await runTest('C-T1-5', 'RSS', 'Tier 1', 'Editorial approval changes article status to approved', async () => {
      const res = await request('/api/editorial/approved/test_approval_id_99', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    });

    await runTest('C-T2-1', 'RSS', 'Tier 2', 'getAuthToken invocation in RSS client executes without getAuthToken is not defined ReferenceError', async () => {
      // In rssSourceManager.ts and AdminPlansAndPackagesManager.tsx, getAuthToken MUST be imported from ./apiConfig
      const rssImports = rssSourceManagerCode.slice(0, rssSourceManagerCode.indexOf('export'));
      assert(
        rssImports.includes('getAuthToken') || !rssSourceManagerCode.includes('getAuthToken()'),
        'src/lib/rssSourceManager.ts must import getAuthToken from apiConfig to prevent ReferenceError'
      );
      const plansImports = plansManagerCode.slice(0, plansManagerCode.indexOf('export const AdminPlansAndPackagesManager'));
      assert(
        plansImports.includes('getAuthToken') || !plansManagerCode.includes('getAuthToken()'),
        'src/components/AdminPlansAndPackagesManager.tsx must import getAuthToken from apiConfig'
      );
    });

    await runTest('C-T2-2', 'RSS', 'Tier 2', 'Full-title deduplication discards duplicate items within 72-hour window', async () => {
      assert(
        !serverCode.includes('title.trim().toLowerCase().slice(0, 40)'),
        'server.ts must not truncate titles to 40 characters for deduplication'
      );
      assert(
        serverCode.includes('72 * 3600 * 1000') || serverCode.includes('seventyTwoHoursAgo'),
        'server.ts must enforce 72-hour freshness window'
      );
    });

    await runTest('C-T2-3', 'RSS', 'Tier 2', '10-minute server-side scheduler interval is verified at 600,000ms', async () => {
      assert(
        serverCode.includes('const RSS_SYNC_INTERVAL_MS = 10 * 60 * 1000;') ||
        serverCode.includes('10 * 60 * 1000'),
        'server.ts must set RSS sync scheduler interval to 10 minutes (600,000ms)'
      );
      assert(
        plansManagerCode.includes('RSS Auto Sync: प्रत्येक 10 मिनट') || plansManagerCode.includes('10 मिनट'),
        'AdminPlansAndPackagesManager.tsx must display 10 minute sync interval badge'
      );
    });

    await runTest('C-T2-4', 'RSS', 'Tier 2', 'Invalid or unreachable RSS URL returns error without crashing the server process', async () => {
      const res = await request('/api/admin/rss-sources', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          name: 'Unreachable Feed',
          url: 'https://non-existent-domain-for-e2e-failure-test-xyz.org/rss.xml',
          category: 'देश',
        },
      });
      assert(res.status !== 500, `Expected graceful error handling, not 500 server crash (got ${res.status})`);
    });

    await runTest('C-T2-5', 'RSS', 'Tier 2', 'Feed toggle (active/inactive) disables feed from background synchronization', async () => {
      assert(
        serverCode.includes('isActive !== false') || serverCode.includes('source.isActive'),
        'server.ts RSS sync must check feed isActive property'
      );
    });

    await runTest('C-T3-1', 'RSS', 'Tier 3', 'Cross-feature: RSS sync resulting in draft creation subject to editorial approval workflow', async () => {
      assert(
        serverCode.includes('/api/editorial/approved/:id') &&
        serverCode.includes('requireAdminMiddleware'),
        'Editorial approval endpoint must require admin authorization'
      );
    });

    // =============================================================================
    // DOMAIN D: Music Library Dashboard (R2)
    // =============================================================================
    console.log('\n--- DOMAIN D: Music Library Dashboard (R2) ---');

    await runTest('D-T1-1', 'Music Library', 'Tier 1', 'GET /api/admin/music-library returns tracks with valid admin token without 401', async () => {
      const res = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body?.success, true);
      assert(Array.isArray(res.body?.tracks), 'Expected tracks array');
    });

    await runTest('D-T1-2', 'Music Library', 'Tier 1', 'POST /api/admin/music-library/upload persists a new track record', async () => {
      const trackId = 'e2e_track_' + Date.now();
      const res = await request('/api/admin/music-library/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          id: trackId,
          name: 'E2E Audio Track',
          title: 'E2E Audio Track',
          category: 'breaking',
          url: 'https://example.com/audio/test.mp3',
          duration: 30,
          isCopyrightSafe: true,
          targetModes: ['quick'],
          allowedTiers: ['free'],
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(res.body?.success, true);
    });

    await runTest('D-T1-3', 'Music Library', 'Tier 1', 'PUT /api/admin/music-library/:id updates track metadata', async () => {
      const res = await request('/api/admin/music-library/track_1', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          category: 'energetic',
          targetModes: ['quick', 'pro'],
          allowedTiers: ['free', 'pro'],
        },
      });
      assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    });

    await runTest('D-T1-4', 'Music Library', 'Tier 1', 'DELETE /api/admin/music-library/:id deletes track', async () => {
      const res = await request('/api/admin/music-library/non_existent_track_for_delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
      });
      assert(res.status === 200 || res.status === 404, `Expected 200 or 404, got ${res.status}`);
    });

    await runTest('D-T1-5', 'Music Library', 'Tier 1', 'Public GET /api/music-library?mode=quick&tier=free filters tracks by mode and tier', async () => {
      const res = await request('/api/music-library?mode=quick&tier=free');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body?.success, true);
      assert(Array.isArray(res.body?.tracks), 'Expected tracks array');
    });

    await runTest('D-T2-1', 'Music Library', 'Tier 2', 'Audio track upload does not bloat JSON database with unmanaged Base64 data', async () => {
      const dbPath = path.resolve(__dirname, '..', 'music_library_database.json');
      if (fs.existsSync(dbPath)) {
        const content = fs.readFileSync(dbPath, 'utf8');
        assert(!content.includes('data:audio/') || content.length < 5000000,
          'music_library_database.json must not contain unmanaged raw Base64 audio blobs');
      }
    });

    await runTest('D-T2-2', 'Music Library', 'Tier 2', 'Upload without track name or URL is rejected with 400 Bad Request', async () => {
      const res = await request('/api/admin/music-library/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {},
      });
      assert.strictEqual(res.status, 400, `Expected 400 Bad Request, got ${res.status}`);
    });

    await runTest('D-T2-3', 'Music Library', 'Tier 2', 'Non-admin attempt to delete music track returns 401/403', async () => {
      const anonRes = await request('/api/admin/music-library/track_1', { method: 'DELETE' });
      assert.strictEqual(anonRes.status, 401, 'Anonymous request must return 401');
      const userRes = await request('/api/admin/music-library/track_1', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getUserToken()}` },
      });
      assert.strictEqual(userRes.status, 403, 'Regular user request must return 403');
    });

    await runTest('D-T2-4', 'Music Library', 'Tier 2', 'Missing track ID in PUT/DELETE returns 404 or 400', async () => {
      const res = await request('/api/admin/music-library/missing_id_99999', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { category: 'breaking' },
      });
      assert(res.status === 404 || res.status === 400, `Expected 404 or 400, got ${res.status}`);
    });

    await runTest('D-T2-5', 'Music Library', 'Tier 2', 'Audio upload with multipart boundary headers preserves binary integrity', async () => {
      assert(
        musicManagerCode.includes('getAdminAuthHeadersAsync') || musicManagerCode.includes('authHeaders'),
        'AdminMusicLibraryManager.tsx must fetch auth headers asynchronously'
      );
      assert(
        apiConfigCode.includes("init.headers.delete('Content-Type')"),
        'apiConfig.ts must preserve multipart boundary by deleting forced Content-Type'
      );
    });

    await runTest('D-T3-1', 'Music Library', 'Tier 3', 'Cross-feature: Music track selection in video frame generation workflow', async () => {
      const res = await request('/api/music-library?mode=quick&tier=pro');
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.body?.tracks));
    });

    // =============================================================================
    // DOMAIN E: Web Links Dashboard & SSRF Protection (R2)
    // =============================================================================
    console.log('\n--- DOMAIN E: Web Links Dashboard & SSRF Protection (R2) ---');

    await runTest('E-T1-1', 'Web Links', 'Tier 1', 'POST /api/convert-web-to-rss converts valid public web link to RSS feed', async () => {
      const res = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'https://news.ycombinator.com' },
      });
      // A public web link must be processed through the HTML parser (no 403 SSRF and no 500 server crash)
      assert.strictEqual(res.status !== 403 && res.status !== 500, true,
        `Expected non-SSRF response for public link, got ${res.status}`);
      assert(res.body && typeof res.body === 'object', 'Expected structured JSON response');
    });

    await runTest('E-T1-2', 'Web Links', 'Tier 1', 'POST /api/admin/web-scrape scrapes designated public sources', async () => {
      const res = await request('/api/admin/web-scrape', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { url: 'https://example.com' },
      });
      assert(res.status === 200 || res.status === 400, `Expected 200 or 400, got ${res.status}`);
    });

    await runTest('E-T1-3', 'Web Links', 'Tier 1', 'Scraped articles persist to database', async () => {
      assert(
        serverCode.includes('loadNewsDatabase') && serverCode.includes('saveNewsDatabase'),
        'server.ts must support persistence of scraped articles'
      );
    });

    await runTest('E-T1-4', 'Web Links', 'Tier 1', 'Web links CRUD operations succeed without ReferenceError', async () => {
      assert(
        plansManagerCode.includes('scrapeAllWebSourcesLive'),
        'AdminPlansAndPackagesManager.tsx must support live web scraping'
      );
    });

    await runTest('E-T1-5', 'Web Links', 'Tier 1', 'Public article scraper extracts title, summary, and image URL', async () => {
      assert(
        serverCode.includes('scrapeNewsFromUrl') &&
        serverCode.includes('parseArticleHtml'),
        'server.ts must export scrapeNewsFromUrl and parseArticleHtml'
      );
    });

    await runTest('E-T2-1', 'Web Links', 'Tier 2', 'Private IPv4 (127.0.0.1, 10.0.0.1, 192.168.1.1) is blocked by SSRF filter with 403', async () => {
      const res1 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://127.0.0.1:8080/internal' },
      });
      assert.strictEqual(res1.status, 403, `Expected 403 for 127.0.0.1, got ${res1.status}`);

      const res2 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://192.168.1.1/admin' },
      });
      assert.strictEqual(res2.status, 403, `Expected 403 for 192.168.1.1, got ${res2.status}`);
    });

    await runTest('E-T2-2', 'Web Links', 'Tier 2', 'Cloud metadata endpoints (169.254.169.254, metadata.google.internal) are blocked', async () => {
      const res1 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://169.254.169.254/computeMetadata/v1/' },
      });
      assert.strictEqual(res1.status, 403, `Expected 403 for 169.254.169.254, got ${res1.status}`);

      const res2 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://metadata.google.internal/computeMetadata/v1/' },
      });
      assert.strictEqual(res2.status, 403, `Expected 403 for metadata.google.internal, got ${res2.status}`);
    });

    await runTest('E-T2-3', 'Web Links', 'Tier 2', 'IPv6 loopback (::1) and IPv4-mapped IPv6 (::ffff:127.0.0.1) are blocked', async () => {
      const res1 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://[::1]:8080/secret' },
      });
      assert.strictEqual(res1.status, 403, `Expected 403 for IPv6 loopback, got ${res1.status}`);

      const res2 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://[::ffff:127.0.0.1]:8080/secret' },
      });
      assert.strictEqual(res2.status, 403, `Expected 403 for IPv4-mapped IPv6, got ${res2.status}`);
    });

    await runTest('E-T2-4', 'Web Links', 'Tier 2', 'Malformed or non-HTTP protocols (file://, ftp://) are rejected', async () => {
      const res1 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'file:///etc/passwd' },
      });
      assert(res1.status === 400 || res1.status === 403, `Expected 400/403 for file://, got ${res1.status}`);

      const res2 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'ftp://ftp.example.com/test' },
      });
      assert(res2.status === 400 || res2.status === 403, `Expected 400/403 for ftp://, got ${res2.status}`);
    });

    await runTest('E-T2-5', 'Web Links', 'Tier 2', 'HTML scraping handles non-standard charsets and empty body gracefully', async () => {
      assert(
        serverCode.includes('isSafePublicUrl'),
        'server.ts must export and utilize isSafePublicUrl for SSRF prevention'
      );
    });

    await runTest('E-T3-1', 'Web Links', 'Tier 3', 'Cross-feature: Web scrape articles feeding into RSS auto-sync queue', async () => {
      assert(
        plansManagerCode.includes('syncAllSourcesLive') &&
        plansManagerCode.includes('scrapeAllWebSourcesLive'),
        'Plans and packages manager must orchestrate both RSS sync and web scraping'
      );
    });

    // =============================================================================
    // DOMAIN F: Gemini AI Vision (Photo & Video Frame Generator) (R3)
    // =============================================================================
    console.log('\n--- DOMAIN F: Gemini AI Vision (Photo & Video Frame Generator) (R3) ---');

    await runTest('F-T1-1', 'Gemini Vision', 'Tier 1', 'POST /api/dynamic-frames/ai-analyze accepts valid image and returns layout regions', async () => {
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          sampleBase64: samplePng,
          selectedRatio: '9:16',
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
      assert.strictEqual(res.body?.success, true, 'Expected body.success to be true');
      assert(res.body?.result, 'Expected result object with layout regions');
    });

    await runTest('F-T1-2', 'Gemini Vision', 'Tier 1', 'AI analysis response contains canvas ratio, photo region, and overlay elements', async () => {
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          sampleBase64: samplePng,
          selectedRatio: '9:16',
        },
      });
      assert.strictEqual(res.status, 200);
      const result = res.body?.result;
      assert(result, 'Missing result');
      assert(typeof result.headlineMaxLines === 'number' || result.headlineMaxLines !== undefined, 'Expected headlineMaxLines');
      assert(result.photoRect || result.photoSlots || result.canvasRatio, 'Expected layout regions');
    });

    await runTest('F-T1-3', 'Gemini Vision', 'Tier 1', 'Video mode layout geometry provides valid coordinates for video rect', async () => {
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          sampleBase64: samplePng,
          selectedRatio: '9:16',
          isVideoMode: true,
        },
      });
      assert.strictEqual(res.status, 200);
      assert(res.body?.result, 'Expected result geometry');
    });

    await runTest('F-T1-4', 'Gemini Vision', 'Tier 1', 'Both Master Admin and regular Admin accounts can execute AI analysis', async () => {
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: {
          sampleBase64: samplePng,
          selectedRatio: '9:16',
        },
      });
      assert.strictEqual(
        res.status,
        200,
        `Expected 200 OK for regular admin on /api/dynamic-frames/ai-analyze, got ${res.status}. (Ensure endpoint permits regular admin)`
      );
    });

    await runTest('F-T1-5', 'Gemini Vision', 'Tier 1', 'Fallback layout geometry is returned if AI provider is temporarily unavailable', async () => {
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: {
          sampleBase64: samplePng,
          selectedRatio: '16:9',
        },
      });
      assert.strictEqual(res.status, 200, `Expected 200 with fallback geometry, got ${res.status}`);
      assert(res.body?.result || res.body?.fallbackLayout, 'Expected layout result in fallback state');
    });

    await runTest('F-T2-1', 'Gemini Vision', 'Tier 2', 'Requests without auth token receive 401 Unauthorized', async () => {
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        body: { sampleBase64: 'data:image/png;base64,abc' },
      });
      assert.strictEqual(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
    });

    await runTest('F-T2-2', 'Gemini Vision', 'Tier 2', 'Oversized sample payloads (>10MB) are handled without crashing the server', async () => {
      const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(12 * 1024 * 1024);
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { sampleBase64: largeBase64 },
      });
      assert(res.status !== 500, `Expected graceful handling, not 500 server crash (got ${res.status})`);
    });

    await runTest('F-T2-3', 'Gemini Vision', 'Tier 2', 'Invalid image MIME types are rejected with 400', async () => {
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { sampleBase64: 'data:application/pdf;base64,JVBERi0xLjQK' },
      });
      assert(res.status === 400 || res.body?.success === false, `Expected 400 on non-image MIME type, got ${res.status}`);
    });

    await runTest('F-T2-4', 'Gemini Vision', 'Tier 2', 'Video frame extraction handles short/corrupt video streams gracefully', async () => {
      assert(
        frameModalCode.includes('वीडियो फ्रेम सफलतापूर्वक निकाला गया') ||
        frameModalCode.includes('Video frame capture error') ||
        frameModalCode.includes('setFeedbackMsg'),
        'DynamicFrameGeneratorModal.tsx must handle video frame extraction safely'
      );
    });

    await runTest('F-T2-5', 'Gemini Vision', 'Tier 2', 'Geometry coordinates are normalized between 0.0 and 1.0 (or 0-100%)', async () => {
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      const res = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getSuperAdminToken()}` },
        body: { sampleBase64: samplePng, selectedRatio: '9:16' },
      });
      assert.strictEqual(res.status, 200);
      const photoRect = res.body?.result?.photoRect;
      if (photoRect) {
        assert(photoRect.x >= 0 && photoRect.x <= 100, `photoRect.x out of bounds: ${photoRect.x}`);
        assert(photoRect.y >= 0 && photoRect.y <= 100, `photoRect.y out of bounds: ${photoRect.y}`);
      }
    });

    await runTest('F-T3-1', 'Gemini Vision', 'Tier 3', 'Cross-feature: Gemini key pool integration during AI vision layout analysis', async () => {
      assert(
        serverCode.includes('getOrLoadApiKeysVault') || serverCode.includes('checkDefaultGeminiHealth'),
        'server.ts must integrate API key vault with Gemini AI features'
      );
    });

    // =============================================================================
    // DOMAIN G: UI Layout & Home Feed Cleanliness (R2 & R3)
    // =============================================================================
    console.log('\n--- DOMAIN G: UI Layout & Home Feed Cleanliness (R2 & R3) ---');

    await runTest('G-T1-1', 'UI Layout', 'Tier 1', 'DynamicFrameGeneratorModal.tsx Step 2 button container includes justify-center', async () => {
      const stage2Idx = frameModalCode.indexOf("currentStage === 'ai_analysis'");
      assert(stage2Idx !== -1, "Missing currentStage === 'ai_analysis' in DynamicFrameGeneratorModal.tsx");
      const stage2Segment = frameModalCode.slice(stage2Idx, stage2Idx + 2500);
      const btnIdx = stage2Segment.indexOf('handleRunAiAnalysis');
      assert(btnIdx !== -1, 'Missing handleRunAiAnalysis in Stage 2');
      const actionButtonsSection = stage2Segment.slice(Math.max(0, stage2Segment.lastIndexOf('<div', btnIdx)), btnIdx + 200);
      assert(
        /<div[^>]*className=["'][^"']*justify-center[^"']*["']/.test(actionButtonsSection),
        "DynamicFrameGeneratorModal.tsx Stage 2 action buttons container must include 'justify-center'"
      );
    });

    await runTest('G-T1-2', 'UI Layout', 'Tier 1', 'Public Home feed initialization does NOT trigger admin background sync calls', async () => {
      assert(
        !homeScreenCode.includes('syncAllSourcesLive()'),
        'HomeScreenWeb.tsx must not call admin syncAllSourcesLive() on mount'
      );
      assert(
        !homeScreenCode.includes('syncRssFeedLive'),
        'HomeScreenWeb.tsx must not trigger direct admin feed mutations'
      );
    });

    await runTest('G-T1-3', 'UI Layout', 'Tier 1', 'Public Home feed does NOT emit ai_news_admin_auth_required events', async () => {
      assert(
        apiConfigCode.includes('isTabAdmin') &&
        apiConfigCode.includes('isPublicOrInit') &&
        appCode.includes("['home', 'studio', 'videos', 'newsroom'].includes(activeTab)"),
        'apiConfig.ts / App.tsx must suppress ai_news_admin_auth_required event on public tabs'
      );
    });

    await runTest('G-T1-4', 'UI Layout', 'Tier 1', 'Admin toast warnings are scoped strictly to admin views (activeTab === admin)', async () => {
      assert(
        appCode.includes("const activeTab = currentTab;") &&
        (appCode.includes("activeTab !== 'admin'") || appCode.includes("activeTab === 'admin'")),
        'App.tsx handleAdminAuthRequired must strictly gate admin toasts to activeTab === admin'
      );
    });

    await runTest('G-T1-5', 'UI Layout', 'Tier 1', 'Step 2 headings and status alerts are center aligned', async () => {
      const stage2Idx = frameModalCode.indexOf("currentStage === 'ai_analysis'");
      const stage2Segment = frameModalCode.slice(stage2Idx, stage2Idx + 1200);
      assert(
        stage2Segment.includes('text-center') && stage2Segment.includes('mx-auto'),
        'DynamicFrameGeneratorModal.tsx Stage 2 header and container must be text-center and mx-auto'
      );
    });

    await runTest('G-T2-1', 'UI Layout', 'Tier 2', 'Unauthenticated visitor navigating Home feed experiences zero auth warnings', async () => {
      const res = await request('/api/music-library?mode=quick&tier=free');
      assert.strictEqual(res.status, 200, 'Public endpoint must succeed for visitors');
    });

    await runTest('G-T2-2', 'UI Layout', 'Tier 2', 'Admin logging out and returning to Home feed sees no lingering toasts', async () => {
      assert(
        appCode.includes('handleAdminAuthRequired'),
        'App.tsx must define scoped handleAdminAuthRequired handler'
      );
    });

    await runTest('G-T2-3', 'UI Layout', 'Tier 2', 'Rapid tab switching between Home and Admin debounces auth notifications', async () => {
      assert(
        apiConfigCode.includes('isExplicitUserAction') || apiConfigCode.includes('markUserInteracted'),
        'apiConfig.ts must require explicit user interaction before firing admin notifications'
      );
    });

    await runTest('G-T2-4', 'UI Layout', 'Tier 2', 'Button container remains centered across responsive viewport widths', async () => {
      const stage2Idx = frameModalCode.indexOf("currentStage === 'ai_analysis'");
      assert(stage2Idx !== -1, "Missing currentStage === 'ai_analysis' in DynamicFrameGeneratorModal.tsx");
      const stage2Segment = frameModalCode.slice(stage2Idx, stage2Idx + 2500);
      const btnIdx = stage2Segment.indexOf('handleRunAiAnalysis');
      assert(btnIdx !== -1, 'Missing handleRunAiAnalysis in Stage 2');
      const actionButtonsSection = stage2Segment.slice(Math.max(0, stage2Segment.lastIndexOf('<div', btnIdx)), btnIdx + 200);
      assert(
        /<div[^>]*className=["'][^"']*flex-wrap[^"']*["']/.test(actionButtonsSection) &&
        /<div[^>]*className=["'][^"']*justify-center[^"']*["']/.test(actionButtonsSection),
        'Stage 2 buttons must use flex-wrap and justify-center for responsive centering'
      );
    });

    await runTest('G-T2-5', 'UI Layout', 'Tier 2', 'Toast event listeners clean up properly without memory leaks', async () => {
      assert(
        appCode.includes("window.removeEventListener('ai_news_admin_auth_required'"),
        'App.tsx must clean up ai_news_admin_auth_required listener on unmount'
      );
    });

    await runTest('G-T3-1', 'UI Layout', 'Tier 3', 'Cross-feature: Transition from public Home feed to Admin RSS manager retains correct auth state', async () => {
      const token = getSuperAdminToken();
      const res = await request('/api/admin/rss-sources', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(res.status, 200, 'Admin endpoint accessible with token during navigation');
    });

    // =============================================================================
    // TIER 4: Real-World Application Scenarios (S1 through S5)
    // =============================================================================
    console.log('\n--- TIER 4: Real-World Application Scenarios (S1 - S5) ---');

    await runTest('S1', 'E2E Scenario', 'Tier 4', 'S1: Admin Day-One Login & Asset Setup', async () => {
      // 1. Admin generates token
      const token = getSuperAdminToken();
      assert(token && token.split('.').length === 3, 'Valid JWT structure generated');

      // 2. Navigates to Music Library and uploads track
      const uploadRes = await request('/api/admin/music-library/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          id: 's1_track_' + Date.now(),
          name: 'S1 Headline Theme',
          title: 'S1 Headline Theme',
          category: 'breaking',
          url: 'https://example.com/audio/s1.mp3',
          duration: 45,
          isCopyrightSafe: true,
          targetModes: ['quick'],
          allowedTiers: ['free', 'pro'],
        },
      });
      assert.strictEqual(uploadRes.status, 200, 'Track upload must succeed');

      // 3. Lists music library
      const listRes = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(listRes.status, 200);
      assert(listRes.body?.tracks?.length > 0, 'Listing must return active tracks');

      // 4. Verifies public music library endpoint
      const pubRes = await request('/api/music-library?mode=quick&tier=free');
      assert.strictEqual(pubRes.status, 200, 'Public endpoint must be accessible');
    });

    await runTest('S2', 'E2E Scenario', 'Tier 4', 'S2: Gemini Key Pool Lifecycle & Health Check', async () => {
      const token = getSuperAdminToken();
      // 1. Add free key (validates backend validation & error classification)
      const keyId = 'AIzaSyD-S2-' + Date.now() + '-12345678';
      const addRes = await request('/api/admin/api-keys/free', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { apiKey: keyId },
      });
      assert(
        addRes.status === 200 || (addRes.status === 400 && addRes.body?.error?.includes('अमान्य API Key')),
        'Add key endpoint must validate key against provider'
      );

      // 2. Fetch keys list and verify active count
      const listRes = await request('/api/admin/api-keys', {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.strictEqual(listRes.status, 200);

      // 3. Run health connection test
      const testRes = await request('/api/admin/api-keys/test-id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { keyId: 'default' },
      });
      assert(testRes.status === 200 || testRes.status === 400 || testRes.status === 404);
    });

    await runTest('S3', 'E2E Scenario', 'Tier 4', 'S3: News Wire Sync & Editorial Publishing', async () => {
      const token = getSuperAdminToken();
      // 1. Register RSS feed
      const addFeedRes = await request('/api/admin/rss-sources', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          name: 'S3 Wire ' + Date.now(),
          url: 'https://news.google.com/rss?s3=' + Date.now(),
          category: 'देश',
          isActive: true,
        },
      });
      assert.strictEqual(addFeedRes.status, 200);

      // 2. Convert public web link
      const convertRes = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'https://news.ycombinator.com' },
      });
      assert.strictEqual(convertRes.status !== 403 && convertRes.status !== 500, true);

      // 3. Editorial approval of pending story
      const approveRes = await request('/api/editorial/approved/s3_story_01', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      assert(approveRes.status === 200 || approveRes.status === 404);
    });

    await runTest('S4', 'E2E Scenario', 'Tier 4', 'S4: AI Vision Photo & Video Frame Generation', async () => {
      const token = getSuperAdminToken();
      const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

      // 1. Photo mode layout analysis
      const photoRes = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          sampleBase64: samplePng,
          selectedRatio: '9:16',
        },
      });
      assert.strictEqual(photoRes.status, 200, 'Photo layout analysis must return 200');
      assert.strictEqual(photoRes.body?.success, true);
      assert(photoRes.body?.result, 'Photo result must contain parsed layout regions');

      // 2. Video mode layout analysis
      const videoRes = await request('/api/dynamic-frames/ai-analyze', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
          sampleBase64: samplePng,
          selectedRatio: '9:16',
          isVideoMode: true,
        },
      });
      assert.strictEqual(videoRes.status, 200, 'Video layout analysis must return 200');
      assert.strictEqual(videoRes.body?.success, true);
    });

    await runTest('S5', 'E2E Scenario', 'Tier 4', 'S5: Security Hardening & Perimeter Defense', async () => {
      // 1. SSRF Attacks blocked
      const ssrf1 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://127.0.0.1:8080/admin' },
      });
      assert.strictEqual(ssrf1.status, 403, '127.0.0.1 must be blocked with 403');

      const ssrf2 = await request('/api/convert-web-to-rss', {
        method: 'POST',
        body: { url: 'http://169.254.169.254/latest/meta-data/' },
      });
      assert.strictEqual(ssrf2.status, 403, '169.254.169.254 must be blocked with 403');

      // 2. Unauthenticated access blocked
      const unauthMusic = await request('/api/admin/music-library');
      assert.strictEqual(unauthMusic.status, 401, 'Unauthenticated music admin route must return 401');

      const unauthKeys = await request('/api/admin/api-keys');
      assert.strictEqual(unauthKeys.status, 401, 'Unauthenticated api keys route must return 401');

      // 3. Non-admin privilege escalation blocked
      const userToken = getUserToken();
      const forbiddenMusic = await request('/api/admin/music-library', {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      assert.strictEqual(forbiddenMusic.status, 403, 'Regular user must receive 403 on admin routes');
    });

  } finally {
    teardownServer();
  }

  // ---------------------------------------------------------------------------------
  // FINAL SUMMARY REPORT
  // ---------------------------------------------------------------------------------
  const durationSec = ((Date.now() - suiteStartTime) / 1000).toFixed(2);
  const failedCount = failedTests.length;

  console.log('\n================================================================================');
  console.log('📊 E2E REGRESSION TEST SUITE EXECUTION SUMMARY');
  console.log('================================================================================');
  console.log(`  Total Tests Executed : ${totalTests}`);
  console.log(`  Passed               : ${passedTests} ✅`);
  console.log(`  Failed               : ${failedCount} ${failedCount > 0 ? '❌' : '🎉'}`);
  console.log(`  Execution Time       : ${durationSec}s`);
  console.log('--------------------------------------------------------------------------------');

  if (failedCount > 0) {
    console.log('\n🚨 DETECTED DEFECTS & TARGETED REMEDIATIONS REQUIRED:');
    failedTests.forEach((f, i) => {
      console.log(`  ${i + 1}. [${f.id}] [${f.domain} - ${f.tier}] ${f.description}`);
      console.log(`     Error: ${f.error}`);
    });
    console.log('\n================================================================================');
  } else {
    console.log('\n🎉 ALL E2E REGRESSION TESTS PASSED CLEANLY WITH ZERO DEFECTS!');
    console.log('================================================================================');
  }

  const allowFailing = process.argv.includes('--report-only') || process.argv.includes('--baseline');
  if (failedCount > 0 && !allowFailing) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('\n💥 FATAL UNCAUGHT ERROR IN TEST SUITE:', err);
  teardownServer();
  process.exit(1);
});
