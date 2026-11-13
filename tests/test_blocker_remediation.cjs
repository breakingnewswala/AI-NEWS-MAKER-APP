const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

const PROJECT_DIR = process.env.PROJECT_DIR || path.resolve(__dirname, '..');
const PORT = 5065;
const REDIRECT_PORT = 5066;
// Cryptographically random ephemeral secret strictly generated per test run (isolated, never inherits process.env.SESSION_SECRET)
const TEST_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body, json: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body, json: null });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function createJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    ...payload,
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TEST_SESSION_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function runRemediationTests() {
  console.log('====================================================');
  console.log('🛡️ RUNNING SECURITY BLOCKER REMEDIATION VERIFICATION');
  console.log('====================================================');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Setup local redirect test server
  const redirectServer = http.createServer((req, res) => {
    if (req.url === '/redirect-to-metadata') {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    } else if (req.url === '/redirect-to-loopback') {
      res.writeHead(302, { Location: 'http://127.0.0.1:22/' });
      res.end();
    } else if (req.url === '/redirect-chain-1') {
      res.writeHead(302, { Location: `http://127.0.0.1:${REDIRECT_PORT}/redirect-chain-2` });
      res.end();
    } else if (req.url === '/redirect-chain-2') {
      res.writeHead(302, { Location: `http://127.0.0.1:${REDIRECT_PORT}/redirect-chain-3` });
      res.end();
    } else if (req.url === '/redirect-chain-3') {
      res.writeHead(302, { Location: `http://127.0.0.1:${REDIRECT_PORT}/redirect-chain-4` });
      res.end();
    } else if (req.url === '/redirect-chain-4') {
      res.writeHead(302, { Location: `http://127.0.0.1:${REDIRECT_PORT}/redirect-chain-5` });
      res.end();
    } else if (req.url === '/safe-image.png') {
      const pngBuf = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(pngBuf);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(r => redirectServer.listen(REDIRECT_PORT, r));
  console.log(`📡 Redirect Test Server running on port ${REDIRECT_PORT}`);

  // 2. Start Application Server
  console.log(`🚀 Starting AI News Maker server on port ${PORT}...`);
  const serverProcess = spawn('node', ['dist/server.cjs'], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      SESSION_SECRET: TEST_SESSION_SECRET,
      DYNAMIC_FRAMES_DB_FILE: path.join(__dirname, 'fixtures', 'test_dynamic_frames.json'),
      ASSET_LIBRARIES_DB_FILE: path.join(__dirname, 'fixtures', 'test_asset_libraries.json'),
      DELETED_FRAMES_TOMBSTONE_FILE: path.join(__dirname, 'fixtures', 'test_deleted_frames_tombstone.json'),
      DELETED_ASSETS_TOMBSTONE_FILE: path.join(__dirname, 'fixtures', 'test_deleted_assets_tombstone.json')
    },
    stdio: 'pipe',
  });

  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const res = await httpRequest({ host: '127.0.0.1', port: PORT, path: '/', method: 'GET' });
      if (res.status >= 200 && res.status < 500) {
        serverReady = true;
        break;
      }
    } catch {}
  }
  assert(serverReady, 'Server started and responsive on port ' + PORT);

  try {
    // =========================================================================
    // SUITE A: MANDATORY DNS REBINDING & SOCKET PINNING VERIFICATION
    // =========================================================================
    console.log('\n--- SUITE A: DNS Rebinding & Socket IP Pinning ---');

    // A.1: Direct loopback rejected
    const resLoopback = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://127.0.0.1:8080/secret'),
      method: 'GET',
    });
    assert(resLoopback.status === 403, 'A.1: Direct loopback IP (127.0.0.1) rejected with 403');

    // A.2: Direct cloud metadata rejected
    const resMetadata = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://169.254.169.254/computeMetadata/v1/'),
      method: 'GET',
    });
    assert(resMetadata.status === 403, 'A.2: Cloud Metadata IP (169.254.169.254) rejected with 403');

    // A.3: Hostname "localhost" rejected
    const resLocalhost = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://localhost:3000/api/keys'),
      method: 'GET',
    });
    assert(resLocalhost.status === 403, 'A.3: Hostname localhost rejected with 403');

    // A.4: IPv4-mapped IPv6 loopback rejected
    const resIpv4Mapped = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://[::ffff:127.0.0.1]:8080/flag'),
      method: 'GET',
    });
    assert(resIpv4Mapped.status === 403, 'A.4: IPv4-mapped IPv6 [::ffff:127.0.0.1] rejected with 403');

    // A.5: IPv4-mapped IPv6 metadata rejected
    const resIpv4MappedMeta = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://[::ffff:169.254.169.254]:8080/flag'),
      method: 'GET',
    });
    assert(resIpv4MappedMeta.status === 403, 'A.5: IPv4-mapped IPv6 [::ffff:169.254.169.254] rejected with 403');

    // A.6: IPv6 loopback rejected
    const resIpv6Loopback = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://[::1]:8080/flag'),
      method: 'GET',
    });
    assert(resIpv6Loopback.status === 403, 'A.6: IPv6 loopback [::1] rejected with 403');

    // A.7: IPv6 link-local rejected
    const resIpv6LinkLocal = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://[fe80::1]:8080/flag'),
      method: 'GET',
    });
    assert(resIpv6LinkLocal.status === 403, 'A.7: IPv6 link-local [fe80::1] rejected with 403');

    // A.8: Redirect to Cloud Metadata blocked
    const resRedirectMetadata = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent(`http://127.0.0.1:${REDIRECT_PORT}/redirect-to-metadata`),
      method: 'GET',
    });
    assert(resRedirectMetadata.status === 403, 'A.8: Redirect to Cloud Metadata rejected with 403');

    // A.9: Redirect to Loopback blocked
    const resRedirectLoopback = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent(`http://127.0.0.1:${REDIRECT_PORT}/redirect-to-loopback`),
      method: 'GET',
    });
    assert(resRedirectLoopback.status === 403, 'A.9: Redirect to Loopback rejected with 403');

    // A.10: Too many redirects (> 3 hops) rejected
    const resRedirectLoop = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent(`http://127.0.0.1:${REDIRECT_PORT}/redirect-chain-1`),
      method: 'GET',
    });
    assert(resRedirectLoop.status === 400 || resRedirectLoop.status === 403, 'A.10: Redirect chain exceeding limit rejected (status ' + resRedirectLoop.status + ')');

    // A.11: DNS resolution failure rejected safely
    const resDnsFail = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://non-existent-domain-test-xyz-99999.invalid/image.png'),
      method: 'GET',
    });
    assert(resDnsFail.status === 403 || resDnsFail.status === 500, 'A.11: Non-existent domain safely rejected (status ' + resDnsFail.status + ')');

    // A.12: Pinned Socket verification on real HTTPS request
    const resRealHttps = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('https://www.google.com/favicon.ico'),
      method: 'GET',
    });
    console.log('A.12 Debug: status =', resRealHttps.status, 'body =', resRealHttps.body);
    assert(resRealHttps.status === 200, 'A.12: Legitimate HTTPS image successfully proxied via pinned socket');
    assert(resRealHttps.headers['content-type']?.includes('image'), 'A.12: Content-Type is valid image');

    // =========================================================================
    // SUITE B: MASTER ADMIN CUSTOM FOOTER ASSET LIBRARY RBAC
    // =========================================================================
    console.log('\n--- SUITE B: Master Admin Custom Footer Asset Library RBAC ---');

    const tokenMasterAdmin = createJwt({ userId: 'usr_test_synthetic_master', email: 'test_master_admin@test.local', role: 'superadmin' });
    const tokenSubAdmin = createJwt({ userId: 'usr_test_synthetic_subadmin', email: 'test_subadmin@test.local', role: 'admin' });
    const tokenVip = createJwt({ userId: 'usr_test_synthetic_vip', email: 'test_vip@test.local', role: 'user', plan: 'VIP DESK' });
    const tokenPro = createJwt({ userId: 'usr_test_synthetic_pro', email: 'test_pro@test.local', role: 'user', plan: 'PRO' });
    const tokenBasic = createJwt({ userId: 'usr_test_synthetic_basic', email: 'test_basic@test.local', role: 'user', plan: 'BASIC' });

    // B.1: Anonymous user cannot create Custom Footer asset (401)
    const resAnonCreate = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/admin/asset-libraries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, { name: 'Anon Footer', type: 'custom_footer', category: 'custom_footer', url: 'https://test/f.png' });
    assert(resAnonCreate.status === 401, 'B.1: Anonymous user cannot create custom_footer (401)');

    // B.2: Basic user cannot create Custom Footer asset (403)
    const resBasicCreate = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/admin/asset-libraries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenBasic}` },
    }, { name: 'Basic Footer', type: 'custom_footer', category: 'custom_footer', url: 'https://test/f.png' });
    assert(resBasicCreate.status === 403, 'B.2: Basic user cannot create custom_footer (403)');

    // B.3: Pro user cannot create Custom Footer asset (403)
    const resProCreate = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/admin/asset-libraries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenPro}` },
    }, { name: 'Pro Footer', type: 'custom_footer', category: 'custom_footer', url: 'https://test/f.png' });
    assert(resProCreate.status === 403, 'B.3: Pro user cannot create custom_footer (403)');

    // B.4: VIP Desk user cannot create Custom Footer asset (403)
    const resVipCreate = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/admin/asset-libraries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenVip}` },
    }, { name: 'VIP Footer', type: 'custom_footer', category: 'custom_footer', url: 'https://test/f.png' });
    assert(resVipCreate.status === 403, 'B.4: VIP Desk user cannot create custom_footer (403)');

    // B.5: Sub Admin CANNOT create Custom Footer asset (403)
    const resSubAdminCreate = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/admin/asset-libraries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSubAdmin}` },
    }, { name: 'Sub Admin Footer', type: 'custom_footer', category: 'custom_footer', url: 'https://test/f.png' });
    assert(resSubAdminCreate.status === 403, 'B.5: Sub Admin (role: admin) CANNOT create custom_footer (403 Forbidden)');
    assert(
      resSubAdminCreate.json?.error?.includes('मास्टर एडमिन') ||
      resSubAdminCreate.json?.error?.includes('breakingnewswala.com@gmail.com') ||
      resSubAdminCreate.json?.error?.includes('à¤®à¤¾à¤¸à¥ à¤Ÿà¤°'),
      'B.5: Sub Admin error message identifies Master Admin requirement'
    );

    // B.6: Sub Admin CAN still create unrelated asset (e.g. location_badge)
    const resSubAdminBadge = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/admin/asset-libraries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSubAdmin}` },
    }, { name: 'Sub Admin Test Badge', type: 'location_badge', category: 'location_badge', url: 'https://test/badge.png' });
    assert(resSubAdminBadge.status === 200, 'B.6: Sub Admin CAN still create regular location_badge asset (200 OK)');
    const testBadgeId = resSubAdminBadge.json?.item?.id;

    // B.7: Sub Admin CANNOT convert regular asset to custom_footer (403)
    const resSubAdminConvert = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: `/api/admin/asset-libraries/${testBadgeId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSubAdmin}` },
    }, { type: 'custom_footer', category: 'custom_footer' });
    assert(resSubAdminConvert.status === 403, 'B.7: Sub Admin CANNOT convert existing asset to custom_footer (403 Forbidden)');

    // B.8: Master Admin CAN create Custom Footer asset (200)
    const resMasterCreateFooter = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: '/api/admin/asset-libraries',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenMasterAdmin}` },
    }, { name: 'Master Admin Custom Footer', type: 'custom_footer', category: 'custom_footer', url: 'https://test/master-footer.png' });
    assert(resMasterCreateFooter.status === 200, 'B.8: Master Admin CAN create custom_footer asset (200 OK)');
    const testFooterId = resMasterCreateFooter.json?.item?.id;

    // B.9: Sub Admin CANNOT edit Custom Footer asset (403)
    const resSubAdminEditFooter = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: `/api/admin/asset-libraries/${testFooterId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSubAdmin}` },
    }, { name: 'Sub Admin Hacked Footer' });
    assert(resSubAdminEditFooter.status === 403, 'B.9: Sub Admin CANNOT edit existing custom_footer asset (403 Forbidden)');

    // B.10: Sub Admin CANNOT delete Custom Footer asset (403)
    const resSubAdminDeleteFooter = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: `/api/admin/asset-libraries/${testFooterId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenSubAdmin}` },
    });
    assert(resSubAdminDeleteFooter.status === 403, 'B.10: Sub Admin CANNOT delete custom_footer asset (403 Forbidden)');

    // B.11: Master Admin CAN edit Custom Footer asset (200)
    const resMasterEditFooter = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: `/api/admin/asset-libraries/${testFooterId}`,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenMasterAdmin}` },
    }, { name: 'Master Admin Renamed Footer' });
    assert(resMasterEditFooter.status === 200, 'B.11: Master Admin CAN edit custom_footer asset (200 OK)');

    // B.12: Master Admin CAN delete Custom Footer asset (200)
    const resMasterDeleteFooter = await httpRequest({
      host: '127.0.0.1', port: PORT,
      path: `/api/admin/asset-libraries/${testFooterId}`,
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenMasterAdmin}` },
    });
    assert(resMasterDeleteFooter.status === 200, 'B.12: Master Admin CAN delete custom_footer asset (200 OK)');

    // Clean up temporary test badge
    if (testBadgeId) {
      await httpRequest({
        host: '127.0.0.1', port: PORT,
        path: `/api/admin/asset-libraries/${testBadgeId}`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenSubAdmin}` },
      });
    }

    // =========================================================================
    // SUITE C: PRODUCTION DATA & SPECIAL FRAMES INTEGRITY VERIFICATION
    // =========================================================================
    console.log('\n--- SUITE C: Production Data & Approved Frame Integrity ---');

    // Query server endpoint to trigger durable Firestore load and cache population
    const framesRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/dynamic-frames',
      method: 'GET'
    });
    const publicFrames = framesRes.json;
    let targetDf = Array.isArray(publicFrames) ? publicFrames.find(f => f.id === 'df_1794406067554_albmw') : undefined;
    
    if (!targetDf && fs.existsSync(path.join(PROJECT_DIR, 'dynamic_frames_db.json'))) {
      const framesDb = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'dynamic_frames_db.json'), 'utf8'));
      targetDf = framesDb.find(f => f.id === 'df_1794406067554_albmw');
    }

    assert(targetDf !== undefined, 'C.1: Target document df_1794406067554_albmw exists');
    assert(targetDf.publicationStatus === 'published', 'C.2: publicationStatus is "published"');
    assert(targetDf.approvalStatus === 'APPROVED', 'C.3: approvalStatus is "APPROVED"');
    assert(targetDf.designCategory === 'Special Frames', 'C.4: designCategory is "Special Frames"');
    assert(targetDf.isTestFrame === false, 'C.5: isTestFrame is false');

  } finally {
    redirectServer.close();
    try { execSync(`taskkill /pid ${serverProcess.pid} /f /t`); } catch { serverProcess.kill(); }
    console.log('🛑 Servers stopped.');
  }

  console.log('\n====================================================');
  console.log(`🎉 VERIFICATION RESULT: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
  console.log('====================================================');
}

runRemediationTests().catch(err => {
  console.error('\n❌ REMEDIATION TEST FAILED:', err);
  process.exit(1);
});
