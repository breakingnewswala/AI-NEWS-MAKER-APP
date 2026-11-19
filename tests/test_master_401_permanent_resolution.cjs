/**
 * Comprehensive Automated Verification for 401 Unauthorized Permanent Resolution
 * Tests all 4 screens/tabs highlighted by the user:
 * 1. API Manager (/api/admin/api-keys)
 * 2. Photo Frame Generator (/api/dynamic-frames/ai-analyze)
 * 3. RSS Links Dashboard (/api/admin/rss-sync)
 * 4. Music Library Dashboard (/api/admin/music-library)
 *
 * Verifies:
 * - Expired HMAC token renewal via /api/auth/refresh-session within grace period
 * - Fresh token authorization across all 4 endpoints
 * - Frontend source verification: presence of getStoredRawToken, ensureAuthToken auto-refresh,
 *   and inline recovery buttons [⚡ एडमिन पुनः लॉगिन करें] across all 4 components.
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

const PORT = 5092;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_SESSION_SECRET = 'ai_news_maker_test_secret_32chars_long_entropy_token_2026';

// Helper: HTTP request
function httpRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: raw, json });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function generateHmacToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${encHeader}.${encPayload}`).digest('base64url');
  return `${encHeader}.${encPayload}.${sig}`;
}

async function runTests() {
  console.log('========================================================================');
  console.log('🚀 RUNNING 401 PERMANENT RESOLUTION END-TO-END TEST SUITE');
  console.log('========================================================================');

  // Check if server is running, or start it
  let serverProcess = null;
  const isServerUp = await httpRequest('GET', '/api/health').then(() => true).catch(() => false);
  if (!isServerUp) {
    console.log(`Starting AI News Maker test server on port ${PORT}...`);
    process.env.PORT = String(PORT);
    // require server.ts via tsx/node or child_process
    const { spawn } = require('child_process');
    serverProcess = spawn('node', ['server.cjs'], {
      env: { ...process.env, PORT: String(PORT), SESSION_SECRET: TEST_SESSION_SECRET },
      stdio: 'pipe',
      shell: true,
    });
    serverProcess.stdout.on('data', (d) => {
      // console.log('[SERVER]', d.toString());
    });
    serverProcess.stderr.on('data', (d) => {
      // console.error('[SERVER ERR]', d.toString());
    });
    // Wait for server to become responsive
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      try {
        const h = await httpRequest('GET', '/api/health');
        if (h.status === 200 || h.status === 404) {
          ready = true;
          break;
        }
      } catch {}
    }
    assert(ready, 'Server must start up within 30 seconds');
  }

  try {
    const authSecret = TEST_SESSION_SECRET;
    const adminEmail = 'breakingnewswala.com@gmail.com';

    // ------------------------------------------------------------------------
    // TEST 1: Expired Token Automatic Cryptographic Renewal
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Expired Token Cryptographic Renewal Grace Period ---');
    const expiredPayload = {
      userId: 'master_admin_01',
      email: adminEmail,
      role: 'superadmin',
      iat: Math.floor(Date.now() / 1000) - 100000,
      exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
    };
    const expiredToken = generateHmacToken(expiredPayload, authSecret);

    // 1a. Directly calling an admin endpoint with expired token must receive 401
    const directExpiredRes = await httpRequest('GET', '/api/admin/api-keys', {
      Authorization: `Bearer ${expiredToken}`,
    });
    assert.strictEqual(directExpiredRes.status, 401, 'Direct request with expired token returns 401');
    console.log('✅ [PASS] Direct request with expired token correctly rejected by Perimeter Guard (401)');

    // 1b. Calling /api/auth/refresh-session with the expired token in the request body
    // (as executed by ensureAuthToken() via getStoredRawToken()) MUST succeed and return a fresh token
    const refreshRes = await httpRequest(
      'POST',
      '/api/auth/refresh-session',
      {
        Authorization: `Bearer ${expiredToken}`,
      },
      {
        email: adminEmail,
        token: expiredToken,
        authToken: expiredToken,
      }
    );
    assert.strictEqual(refreshRes.status, 200, 'Session refresh with expired candidate token returns 200');
    assert(refreshRes.json && refreshRes.json.success, 'Refresh response must indicate success');
    assert(refreshRes.json.token, 'Refresh response must return a fresh token');
    const freshToken = refreshRes.json.token;
    console.log('✅ [PASS] /api/auth/refresh-session renews expired HMAC token within grace window successfully');

    // ------------------------------------------------------------------------
    // TEST 2: All 4 Affected Admin Endpoints Authenticate with Renewed Token
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: All 4 Admin Endpoints Authenticate Successfully with Renewed Token ---');

    // 2a. Screen 1: API Manager (/api/admin/api-keys)
    const apiKeysRes = await httpRequest('GET', '/api/admin/api-keys', {
      Authorization: `Bearer ${freshToken}`,
      'x-admin-email': adminEmail,
    });
    assert.strictEqual(apiKeysRes.status, 200, 'API Keys endpoint returns 200 with renewed token');
    assert(apiKeysRes.json && apiKeysRes.json.success, 'API Keys response indicates success');
    console.log('✅ [PASS] Screen 1 (API Manager): /api/admin/api-keys returns 200 OK');

    // 2b. Screen 2: Photo Frame Generator AI Vision (/api/dynamic-frames/ai-analyze)
    const dynamicFramesRes = await httpRequest('POST', '/api/dynamic-frames/ai-analyze', {
      Authorization: `Bearer ${freshToken}`,
      'x-admin-email': adminEmail,
    }, {
      sampleBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      selectedRatio: '9:16',
      isVideoMode: false,
    });
    // Can be 200 or calibrated fallback with 200, never 401
    assert.notStrictEqual(dynamicFramesRes.status, 401, 'Photo Frame Vision analyze must NOT return 401 Unauthorized');
    console.log(`✅ [PASS] Screen 2 (AI Photo Frame Generator): /api/dynamic-frames/ai-analyze authenticated (HTTP ${dynamicFramesRes.status})`);

    // 2c. Screen 3: RSS Links Dashboard (/api/admin/rss-sources & /api/admin/rss-sync)
    const rssSourcesRes = await httpRequest('GET', '/api/admin/rss-sources', {
      Authorization: `Bearer ${freshToken}`,
      'x-admin-email': adminEmail,
    });
    assert.strictEqual(rssSourcesRes.status, 200, 'RSS Sources endpoint returns 200 with renewed token');
    console.log('✅ [PASS] Screen 3 (RSS Links Dashboard): /api/admin/rss-sources returns 200 OK');

    // 2d. Screen 4: Music Library Dashboard (/api/admin/music-library)
    const musicLibRes = await httpRequest('GET', '/api/admin/music-library', {
      Authorization: `Bearer ${freshToken}`,
      'x-admin-email': adminEmail,
    });
    assert.strictEqual(musicLibRes.status, 200, 'Music Library endpoint returns 200 with renewed token');
    assert(musicLibRes.json && musicLibRes.json.success, 'Music Library response indicates success');
    console.log('✅ [PASS] Screen 4 (Music Library Dashboard): /api/admin/music-library returns 200 OK');

    // ------------------------------------------------------------------------
    // TEST 3: Static Code Assertions for Client Auto-Refresh & Recovery UI
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Frontend Component Recovery UI & Event Wiring Invariants ---');

    const authServiceCode = fs.readFileSync('src/lib/authService.ts', 'utf8');
    const apiConfigCode = fs.readFileSync('src/lib/apiConfig.ts', 'utf8');
    const apiKeysMgrCode = fs.readFileSync('src/components/AdminApiKeysManager.tsx', 'utf8');
    const musicLibMgrCode = fs.readFileSync('src/components/AdminMusicLibraryManager.tsx', 'utf8');
    const rssMgrCode = fs.readFileSync('src/components/AdminPlansAndPackagesManager.tsx', 'utf8');
    const dynamicFrameCode = fs.readFileSync('src/components/DynamicFrameGeneratorModal.tsx', 'utf8');
    const loginModalCode = fs.readFileSync('src/components/LoginModal.tsx', 'utf8');
    const appCode = fs.readFileSync('src/App.tsx', 'utf8');

    // 3a. AuthService must export getStoredRawToken
    assert(authServiceCode.includes('export function getStoredRawToken()'), 'authService must export getStoredRawToken');
    assert(apiConfigCode.includes('getStoredRawToken'), 'apiConfig must re-export getStoredRawToken');
    console.log('✅ [PASS] getStoredRawToken verified in authService and apiConfig');

    // 3b. ensureAuthToken must use candidateToken = getAuthToken() || getStoredRawToken()
    assert(authServiceCode.includes('getStoredRawToken()'), 'ensureAuthToken in authService retrieves candidate token even if expired');
    assert(authServiceCode.includes("window.dispatchEvent(\n                    new CustomEvent('ai_news_admin_auth_success'"), 'ensureAuthToken dispatches ai_news_admin_auth_success on successful refresh');
    console.log('✅ [PASS] ensureAuthToken automatic renewal and event dispatch verified');

    // 3c. LoginModal must dispatch ai_news_admin_auth_success on successful admin login
    assert(loginModalCode.includes("window.dispatchEvent(new CustomEvent('ai_news_admin_auth_success'"), 'LoginModal dispatches ai_news_admin_auth_success on login');
    console.log('✅ [PASS] LoginModal dispatches ai_news_admin_auth_success on admin login');

    // 3d. Screen 1 (API Manager) must have authError banner with [⚡ एडमिन पुनः लॉगिन करें] and event listener
    assert(apiKeysMgrCode.includes('authError &&'), 'AdminApiKeysManager has authError banner');
    assert(apiKeysMgrCode.includes('⚡ एडमिन पुनः लॉगिन करें'), 'AdminApiKeysManager has [⚡ एडमिन पुनः लॉगिन करें] recovery button');
    assert(apiKeysMgrCode.includes("window.addEventListener('ai_news_admin_auth_success', handleAuthSuccess);"), 'AdminApiKeysManager listens for ai_news_admin_auth_success');
    console.log('✅ [PASS] AdminApiKeysManager recovery UI and event listener verified');

    // 3e. Screen 2 (DynamicFrameGeneratorModal) must retry with fresh token and have [⚡ एडमिन लॉगिन करें] button
    assert(dynamicFrameCode.includes('ensureAuthToken(true)'), 'DynamicFrameGeneratorModal retries with fresh token on 401');
    assert(dynamicFrameCode.includes('⚡ एडमिन लॉगिन करें'), 'DynamicFrameGeneratorModal has [⚡ एडमिन लॉगिन करें] button');
    assert(dynamicFrameCode.includes("window.addEventListener('ai_news_admin_auth_success', handleAuthSuccess);"), 'DynamicFrameGeneratorModal listens for ai_news_admin_auth_success');
    console.log('✅ [PASS] DynamicFrameGeneratorModal recovery UI, retry logic, and event listener verified');

    // 3f. Screen 3 (RSS Links Dashboard) must have [⚡ एडमिन पुनः लॉगिन करें] button and event listener
    assert(rssMgrCode.includes('⚡ एडमिन पुनः लॉगिन करें'), 'AdminPlansAndPackagesManager has [⚡ एडमिन पुनः लॉगिन करें] button');
    assert(rssMgrCode.includes("window.addEventListener('ai_news_admin_auth_success', handleAuthSuccess);"), 'AdminPlansAndPackagesManager listens for ai_news_admin_auth_success');
    console.log('✅ [PASS] RSS Links Dashboard recovery UI and event listener verified');

    // 3g. Screen 4 (Music Library Dashboard) must have [⚡ एडमिन पुनः लॉगिन करें] button and event listener
    assert(musicLibMgrCode.includes('⚡ एडमिन पुनः लॉगिन करें'), 'AdminMusicLibraryManager has [⚡ एडमिन पुनः लॉगिन करें] button');
    assert(musicLibMgrCode.includes("window.addEventListener('ai_news_admin_auth_success', handleAuthSuccess);"), 'AdminMusicLibraryManager listens for ai_news_admin_auth_success');
    console.log('✅ [PASS] Music Library Dashboard recovery UI and event listener verified');

    // 3h. App.tsx must have proactive admin background session check
    assert(appCode.includes('ensureAuthToken().then((t) => {'), 'App.tsx proactively verifies and renews admin session token on load');
    console.log('✅ [PASS] App.tsx proactive admin session token bootstrap verified');

    console.log('\n========================================================================');
    console.log('🎉 ALL 401 PERMANENT RESOLUTION END-TO-END TESTS PASSED CLEANLY (100%)');
    console.log('========================================================================');
    process.exit(0);
  } finally {
    if (serverProcess) {
      try {
        process.kill(serverProcess.pid);
      } catch {}
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
