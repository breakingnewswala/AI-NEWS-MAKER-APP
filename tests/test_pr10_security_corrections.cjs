// AI NEWS MAKER — PR #10 Focused Security Corrections Test Suite
// 1. Strict Session Expiration Enforcement
// 2. RSS Source Authorization & Substring/Host Collision Prevention

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const PORT = 5119;
const TEST_BASE_URL = `http://127.0.0.1:${PORT}`;

const EPHEMERAL_TEST_SESSION_SECRET = crypto.randomBytes(32).toString('hex');
const TEST_DATA_DIR = path.join(PROJECT_DIR, 'test_temp_data_pr10');

if (!fs.existsSync(TEST_DATA_DIR)) {
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

function createSignedToken(payload, expSec = 86400, secret = EPHEMERAL_TEST_SESSION_SECRET) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expSec,
  };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function httpRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, TEST_BASE_URL);
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
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

function killProcess(pid) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /f /t`);
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {}
  }
}

async function runPr10SecurityCorrectionsTests() {
  console.log('========================================================================');
  console.log('🔒 PR #10: STRICT SESSION EXPIRATION & RSS SOURCE AUTHORIZATION SUITE');
  console.log('========================================================================');

  console.log(`🚀 Starting AI News Maker test server on port ${PORT}...`);
  const serverProcess = spawn('node', ['dist/server.cjs'], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      IS_TEST_ENV: 'true',
      SESSION_SECRET: EPHEMERAL_TEST_SESSION_SECRET,
      TEST_DATA_DIR: TEST_DATA_DIR,
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', () => {});
  serverProcess.stderr.on('data', () => {});

  // Wait for server to become responsive
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await httpRequest('GET', '/api/health');
      if (res.status >= 200 && res.status < 500) {
        serverReady = true;
        break;
      }
    } catch {}
  }
  assert(serverReady, `Server started and responsive on port ${PORT}`);
  console.log(`✅ [PASS] Server responsive on port ${PORT}`);

  try {
    const validUserPayload = {
      userId: 'usr_master_admin_test',
      email: 'breakingnewswala.com@gmail.com',
      role: 'superadmin',
      username: 'breakingnewswala',
    };

    const validActiveToken = createSignedToken(validUserPayload, 3600);
    const expiredToken = createSignedToken(validUserPayload, -3600); // Expired 1 hour ago
    const forgedToken = `${validActiveToken.split('.').slice(0, 2).join('.')}.InVaLiDsIgNaTuReForGeD12345`;
    const forgedPayloadToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmb3JnZWQiLCJlbWFpbCI6ImF0dGFja2VyQGV2aWwuY29tIiwicm9sZSI6InN1cGVyYWRtaW4ifQ.InVaLiDsIgNaTuReForGeD12345`;

    // =========================================================================
    // SECTION 1: STRICT SESSION EXPIRATION & AUTHENTICATION ENFORCEMENT
    // =========================================================================
    console.log('\n--- Test Group 1: Strict Session Expiration & Token Tampering ---');

    // 1a. /api/auth/login with expired HMAC session token -> MUST return 401
    const loginExpiredRes = await httpRequest('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, {
      authToken: expiredToken,
    });
    assert.strictEqual(loginExpiredRes.status, 401, '/api/auth/login with expired token must return 401');
    assert.strictEqual(loginExpiredRes.json?.success, false);
    console.log('✅ [PASS] 1a: /api/auth/login strictly rejects expired HMAC session token with 401');

    // 1b. /api/auth/refresh-session with expired token & no identity proof -> MUST return 401
    const refreshExpiredRes = await httpRequest('POST', '/api/auth/refresh-session', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${expiredToken}`,
    }, {});
    assert.strictEqual(refreshExpiredRes.status, 401, '/api/auth/refresh-session with expired token must return 401');
    assert.strictEqual(refreshExpiredRes.json?.success, false);
    console.log('✅ [PASS] 1b: /api/auth/refresh-session strictly rejects expired token without identity proof with 401');

    // 1c. /api/auth/login with forged HMAC session token -> MUST return 401
    const loginForgedRes = await httpRequest('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, {
      authToken: forgedToken,
    });
    assert.strictEqual(loginForgedRes.status, 401, '/api/auth/login with forged token must return 401');
    assert.strictEqual(loginForgedRes.json?.success, false);
    console.log('✅ [PASS] 1c: /api/auth/login strictly rejects forged signature token with 401');

    // 1d. /api/auth/refresh-session with forged token -> MUST return 401
    const refreshForgedRes = await httpRequest('POST', '/api/auth/refresh-session', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${forgedPayloadToken}`,
    }, {});
    assert.strictEqual(refreshForgedRes.status, 401, '/api/auth/refresh-session with forged token must return 401');
    assert.strictEqual(refreshForgedRes.json?.success, false);
    console.log('✅ [PASS] 1d: /api/auth/refresh-session strictly rejects forged payload token with 401');

    // 1e. /api/auth/login with valid active HMAC session token -> MUST return 200
    const loginValidRes = await httpRequest('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, {
      authToken: validActiveToken,
    });
    if (loginValidRes.status !== 200) {
      console.error('1e error body:', loginValidRes.raw);
    }
    assert.strictEqual(loginValidRes.status, 200, '/api/auth/login with valid active token returns 200');
    assert.strictEqual(loginValidRes.json?.success, true);
    assert(loginValidRes.json?.token, 'Returned fresh session token');
    console.log('✅ [PASS] 1e: /api/auth/login successfully authenticates valid active session token');

    // 1f. /api/auth/refresh-session with valid active HMAC session token -> MUST return 200
    const refreshValidRes = await httpRequest('POST', '/api/auth/refresh-session', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validActiveToken}`,
    }, {});
    assert.strictEqual(refreshValidRes.status, 200, '/api/auth/refresh-session with valid active token returns 200');
    assert.strictEqual(refreshValidRes.json?.success, true);
    assert(refreshValidRes.json?.token, 'Returned refreshed session token');
    console.log('✅ [PASS] 1f: /api/auth/refresh-session successfully renews valid active session token');

    // =========================================================================
    // SECTION 2: RSS SOURCE AUTHORIZATION & COLLISION PREVENTION
    // =========================================================================
    console.log('\n--- Test Group 2: RSS Source Authorization & Collision Prevention ---');

    // 2a. Fetch public news posts as anonymous user
    const publicNewsRes = await httpRequest('GET', '/api/news-posts');
    assert.strictEqual(publicNewsRes.status, 200, '/api/news-posts returns 200');
    assert(Array.isArray(publicNewsRes.json), 'public news-posts returns array');
    console.log(`✅ [PASS] 2a: Anonymous GET /api/news-posts returned ${publicNewsRes.json.length} authorized posts`);

    // Fetch configured RSS sources
    const adminAuthHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${validActiveToken}`,
    };
    const rssSourcesRes = await httpRequest('GET', '/api/admin/rss-sources', adminAuthHeaders);
    assert.strictEqual(rssSourcesRes.status, 200, '/api/admin/rss-sources returns 200');
    const configuredSources = rssSourcesRes.json?.sources || [];
    assert(Array.isArray(configuredSources), 'sources is array');
    const activeSourceIds = new Set(configuredSources.filter(s => s.isActive).map(s => s.id));
    const activeHosts = new Set(
      configuredSources
        .filter(s => s.isActive && s.url)
        .map(s => {
          try {
            return new URL(s.url).hostname.replace(/^www\./, '').toLowerCase();
          } catch {
            return '';
          }
        })
        .filter(Boolean)
    );

    // 2b. Verify all public feed posts belong to currently active, authorized sources
    const feedPosts = publicNewsRes.json.filter(p => String(p.id).startsWith('rss-') || String(p.id).startsWith('web-'));
    console.log(`   Inspecting ${feedPosts.length} feed posts for strict source authorization...`);
    for (const post of feedPosts) {
      const parts = String(post.id).split('-');
      const postSrcId = post.sourceId || (parts.length >= 3 ? parts.slice(1, -1).join('-') : parts[1] || '');
      const cleanPostSrcId = postSrcId.replace(/^src_/, '');

      let matchesId = activeSourceIds.has(postSrcId) || activeSourceIds.has(`src_${postSrcId}`) || activeSourceIds.has(cleanPostSrcId);
      if (!matchesId) {
        matchesId = Array.from(activeSourceIds).some(sId =>
          post.id.startsWith(`rss-${sId}-`) ||
          post.id.startsWith(`web-${sId}-`) ||
          post.id.startsWith(`rss-${sId.replace(/^src_/, '')}-`) ||
          post.id.startsWith(`web-${sId.replace(/^src_/, '')}-`)
        );
      }

      let matchesHost = false;
      if (post.sourceUrl) {
        try {
          const postHost = new URL(post.sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
          matchesHost = Array.from(activeHosts).some(h => postHost === h || postHost.endsWith('.' + h));
        } catch {}
      }

      const matchesChannel = Boolean(
        post.sourceChannel &&
        configuredSources.filter(s => s.isActive).some(s => s.name && s.name.trim().toLowerCase() === post.sourceChannel.trim().toLowerCase())
      );

      assert(
        matchesId || matchesHost || matchesChannel,
        `Feed post ${post.id} must match an authorized active source (id=${postSrcId}, url=${post.sourceUrl}, channel=${post.sourceChannel})`
      );
    }
    console.log('✅ [PASS] 2b: All returned feed posts belong strictly to active authorized sources');

    // 2c. Substring Collision Prevention Unit Simulation
    console.log('\n--- Test Group 3: Substring & Hostname Collision Unit Invariants ---');
    
    // Simulate matching logic on tricky edge cases
    const testActiveSourceIds = new Set(['src_10', 'src_1794071001048_maoy']);
    const testActiveUrls = new Set(['https://www.naidunia.com/madhya-pradesh']);
    const testDeletedIds = new Set(['src_deleted_999']);

    function testSourceMatcher(post) {
      const isFeedSource = String(post.id).startsWith("rss-") || String(post.id).startsWith("web-");
      if (!isFeedSource) return { authorized: true, reason: 'manual' };

      const parts = String(post.id).split("-");
      const postSourceId = post.sourceId || (parts.length >= 3 ? parts.slice(1, -1).join("-") : parts[1] || "");
      const cleanPostSrc = postSourceId.replace(/^src_/, "");

      const isExplicitlyDeleted = Boolean(
        postSourceId && (
          testDeletedIds.has(postSourceId) ||
          testDeletedIds.has(`src_${postSourceId}`) ||
          testDeletedIds.has(cleanPostSrc)
        )
      ) || Array.from(testDeletedIds).some((dId) =>
        post.id.startsWith(`rss-${dId}-`) ||
        post.id.startsWith(`web-${dId}-`) ||
        (dId.startsWith("src_") && (post.id.startsWith(`rss-${dId.replace(/^src_/, "")}-`) || post.id.startsWith(`web-${dId.replace(/^src_/, "")}-`)))
      );

      if (isExplicitlyDeleted) return { authorized: false, reason: 'deleted' };

      const matchesSourceId = Boolean(
        postSourceId && (
          testActiveSourceIds.has(postSourceId) ||
          testActiveSourceIds.has(`src_${postSourceId}`) ||
          testActiveSourceIds.has(cleanPostSrc) ||
          Array.from(testActiveSourceIds).some((sId) =>
            post.id.startsWith(`rss-${sId}-`) ||
            post.id.startsWith(`web-${sId}-`) ||
            (sId.startsWith("src_") && (post.id.startsWith(`rss-${sId.replace(/^src_/, "")}-`) || post.id.startsWith(`web-${sId.replace(/^src_/, "")}-`)))
          )
        )
      );

      const matchesUrl = Boolean(post.sourceUrl && (
        testActiveUrls.has(post.sourceUrl.trim().toLowerCase()) ||
        Array.from(testActiveUrls).some((u) => {
          try {
            const feedHost = new URL(u).hostname.replace(/^www\./, "").toLowerCase();
            const postHost = new URL(post.sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
            return feedHost === postHost || postHost.endsWith("." + feedHost);
          } catch {
            return false;
          }
        })
      ));

      const hasActive = testActiveSourceIds.size > 0 && !isExplicitlyDeleted && Boolean(matchesSourceId || matchesUrl);
      return { authorized: hasActive, matchesSourceId, matchesUrl };
    }

    // Edge Case 1: Partial source ID collision: src_1 vs src_10
    const edgePost1 = { id: 'rss-src_1-article99', sourceId: 'src_1', sourceUrl: 'https://unrelated.com/news' };
    const res1 = testSourceMatcher(edgePost1);
    assert.strictEqual(res1.authorized, false, 'Partial source ID src_1 must NOT match src_10');
    console.log('✅ [PASS] 3a: Partial source ID src_1 does NOT match src_10 (no substring false-positive)');

    // Edge Case 2: Partial ID substring 'maoy' alone
    const edgePost2 = { id: 'rss-maoy-article99', sourceId: 'maoy', sourceUrl: 'https://unrelated.com/news' };
    const res2 = testSourceMatcher(edgePost2);
    assert.strictEqual(res2.authorized, false, 'Substring maoy alone must NOT match src_1794071001048_maoy');
    console.log('✅ [PASS] 3b: Substring "maoy" does NOT match src_1794071001048_maoy');

    // Edge Case 3: Flawed hostname substring evilnaidunia.com
    const edgePost3 = { id: 'rss-random-123', sourceId: 'random', sourceUrl: 'https://evilnaidunia.com/article' };
    const res3 = testSourceMatcher(edgePost3);
    assert.strictEqual(res3.authorized, false, 'evilnaidunia.com must NOT match naidunia.com');
    console.log('✅ [PASS] 3c: Host evilnaidunia.com does NOT match naidunia.com (no domain suffix bypass)');

    // Edge Case 4: Legitimate subdomain mp.naidunia.com
    const edgePost4 = { id: 'rss-random-123', sourceId: 'random', sourceUrl: 'https://mp.naidunia.com/article' };
    const res4 = testSourceMatcher(edgePost4);
    assert.strictEqual(res4.authorized, true, 'mp.naidunia.com MUST match naidunia.com');
    console.log('✅ [PASS] 3d: Legitimate subdomain mp.naidunia.com properly matches naidunia.com');

    // Edge Case 5: Deleted source ID
    const edgePost5 = { id: 'rss-src_deleted_999-art1', sourceId: 'src_deleted_999', sourceUrl: 'https://mp.naidunia.com/article' };
    const res5 = testSourceMatcher(edgePost5);
    assert.strictEqual(res5.authorized, false, 'Explicitly deleted source must NOT be authorized');
    console.log('✅ [PASS] 3e: Explicitly deleted source is strictly blocked');

    // Edge Case 6: Manually published news post preservation
    const edgePost6 = { id: 'manual-post-abc-123', approvalStatus: 'APPROVED' };
    const res6 = testSourceMatcher(edgePost6);
    assert.strictEqual(res6.authorized, true, 'Manual post is preserved');
    assert.strictEqual(res6.reason, 'manual', 'Manual post handled by editorial flow');
    console.log('✅ [PASS] 3f: Manually published news items are preserved and bypass RSS feed source filters');

    console.log('\n========================================================================');
    console.log('🎉 ALL PR #10 SECURITY CORRECTIONS TESTS PASSED (100%)');
    console.log('========================================================================');
  } finally {
    killProcess(serverProcess.pid);
  }
}

runPr10SecurityCorrectionsTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
