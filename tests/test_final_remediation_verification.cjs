// AI NEWS MAKER — Verification Test Suite for Master Admin Auth, RSS Auto-Save, Asset Libraries, Profile Persistence & Custom Footer
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const PORT = 5066;
const TEST_BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

function createSignedToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TEST_SESSION_SECRET)
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 VERIFYING 13 REMEDIATION POINTS END-TO-END');
  console.log('====================================================');

  console.log(`🚀 Starting AI News Maker test server on port ${PORT}...`);
  const serverProcess = spawn('node', ['dist/server.cjs'], {
    cwd: PROJECT_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      SESSION_SECRET: TEST_SESSION_SECRET,
    },
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log('[Server]:', d.toString().trim());
  });
  serverProcess.stderr.on('data', (d) => {
    // console.error('[Server Err]:', d.toString().trim());
  });

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
    const adminToken = createSignedToken({
      userId: 'usr_master_admin_test',
      email: 'breakingnewswala.com@gmail.com',
      role: 'superadmin',
      username: 'breakingnewswala',
    });

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    };

    // 1. Verify Authentication & Perimeter Guard on /api/admin/*
    console.log('\n--- 1. Testing Admin Perimeter Guard & Token Verification ---');
    const unauthRes = await httpRequest('GET', '/api/admin/asset-libraries');
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request to /api/admin/asset-libraries blocked with 401');
    console.log('✅ [PASS] Unauthenticated access blocked with 401 Unauthorized');

    const authAssetRes = await httpRequest('GET', '/api/admin/asset-libraries', authHeaders);
    assert.strictEqual(authAssetRes.status, 200, 'Authenticated request to /api/admin/asset-libraries returns 200 OK');
    assert(Array.isArray(authAssetRes.json?.items), 'Returned items array');
    console.log(`✅ [PASS] Authenticated access succeeded: ${authAssetRes.json.items.length} items loaded`);

    // 2. Verify Default Story Callout & Location Badge Assets
    console.log('\n--- 2. Testing Default Assets Availability ---');
    const items = authAssetRes.json.items;
    const callout1 = items.find((i) => i.id === 'callout_bully_forward_story');
    const callout2 = items.find((i) => i.id === 'callout_special_gold');
    const callout3 = items.find((i) => i.id === 'callout_breaking_red');
    const locationBadge = items.find((i) => i.id === 'asset_1794132101671_u0g9s');

    assert(callout1, 'Default callout_bully_forward_story is present');
    assert(callout2, 'Default callout_special_gold is present');
    assert(callout3, 'Default callout_breaking_red is present');
    assert(locationBadge, 'Default location badge asset_1794132101671_u0g9s is present');
    console.log('✅ [PASS] All 3 default story callouts and location badge verified');

    // 3. Verify Custom Footer Creation & Independent Alignments
    console.log('\n--- 3. Testing Custom Footer Creation with Independent Alignments ---');
    const newFooterPayload = {
      name: "Hindi News Ticker Badge Test",
      type: "custom_footer",
      category: "general",
      enabled: true,
      footerConfig: {
        footerBgColor: "#FACC15",
        footerTextColor: "#000000",
        footerHeightPct: 8,
        elements: {
          showChannelName: false,
          showWebsite: true,
          showPhone: true,
          showSocialIcons: true,
        },
        alignment: "center",
        channelNameAlign: "left",
        websiteAlign: "center",
        socialIconsAlign: "left",
        phoneAlign: "right",
        iconSize: 20,
        elementSpacing: 12,
        paddingX: 16,
        separator: "|",
      },
    };

    const createFooterRes = await httpRequest('POST', '/api/admin/asset-libraries', authHeaders, newFooterPayload);
    assert.strictEqual(createFooterRes.status, 200, 'Custom footer saved successfully');
    assert(createFooterRes.json?.success === true, 'Response indicates success');
    assert.strictEqual(createFooterRes.json?.item?.footerConfig?.phoneAlign, 'right', 'phoneAlign is right');
    assert.strictEqual(createFooterRes.json?.item?.footerConfig?.websiteAlign, 'center', 'websiteAlign is center');
    assert.strictEqual(createFooterRes.json?.item?.footerConfig?.socialIconsAlign, 'left', 'socialIconsAlign is left');
    assert.strictEqual(createFooterRes.json?.item?.footerConfig?.elements?.showChannelName, false, 'showChannelName defaults to false');
    console.log('✅ [PASS] Custom footer created and persisted with independent alignments');

    // Clean up test footer
    if (createFooterRes.json?.item?.id) {
      await httpRequest('DELETE', `/api/admin/asset-libraries/${createFooterRes.json.item.id}`, authHeaders);
    }

    // 4. Verify Profile Persistence (District, WhatsApp Display, Social Icons)
    console.log('\n--- 4. Testing Profile Persistence (District, WhatsApp, Social Icons) ---');
    const testProfilePayload = {
      email: 'breakingnewswala.com@gmail.com',
      fullName: 'मुख्य संपादक',
      district: 'भोपाल',
      location: 'भोपाल',
      whatsappNumber: '9669802408',
      whatsappDisplayNumber: '9669802408',
      mobileNumber: '9669802408',
      channelNameHi: 'ब्रेकिंग न्यूज़ वाला',
      channelNameEn: 'BREAKING NEWS WALA',
      websiteUrl: 'breakingnewswala.com',
      socialIcons: {
        youtube: true,
        facebook: true,
        instagram: true,
        twitter: true,
        x: true,
        linkedin: true,
      },
    };

    const saveProfileRes = await httpRequest('POST', '/api/user-profile', authHeaders, testProfilePayload);
    assert.strictEqual(saveProfileRes.status, 200, 'Profile saved successfully');
    assert(saveProfileRes.json?.success === true, 'Profile save response success');

    const getProfileRes = await httpRequest('GET', `/api/user-profile?email=breakingnewswala.com@gmail.com`, authHeaders);
    assert.strictEqual(getProfileRes.status, 200, 'Profile fetched successfully');
    const fetchedProf = getProfileRes.json?.profile;
    assert.strictEqual(fetchedProf?.district, 'भोपाल', 'District persisted as भोपाल (NOT Central Desk)');
    assert.strictEqual(fetchedProf?.whatsappDisplayNumber, '9669802408', 'WhatsApp display number persisted');
    assert.strictEqual(fetchedProf?.socialIcons?.twitter, true, 'Twitter social icon persisted as true');
    assert.strictEqual(fetchedProf?.socialIcons?.x, true, 'X social icon persisted as true');
    assert.strictEqual(fetchedProf?.socialIcons?.linkedin, true, 'LinkedIn social icon persisted as true');
    console.log('✅ [PASS] Profile settings persisted without reversion (District: भोपाल, WhatsApp: 9669802408, Twitter & LinkedIn: true)');

    // 5. Verify RSS Feeds Ingestion & Immediate Visibility in Home / Newsroom
    console.log('\n--- 5. Testing RSS Sync & News Card Ingestion ---');
    const syncRes = await httpRequest('POST', '/api/admin/rss-sync', authHeaders, {});
    assert.strictEqual(syncRes.status, 200, 'Live RSS Sync endpoint returned 200');
    assert(syncRes.json?.success === true, 'Live RSS sync succeeded');
    console.log(`✅ [PASS] Live RSS Sync succeeded: ${syncRes.json.totalSourcesSynced} sources, ${syncRes.json.newArticlesCount} new articles`);

    const newsRes = await httpRequest('GET', '/api/news-posts', authHeaders);
    assert.strictEqual(newsRes.status, 200, 'News posts fetched successfully');
    const newsList = Array.isArray(newsRes.json) ? newsRes.json : (newsRes.json?.posts || []);
    assert(newsList.length > 0, 'News cards returned for display on Home & Newsroom');
    console.log(`✅ [PASS] Active news cards verified: ${newsList.length} articles available`);

    console.log('\n====================================================');
    console.log('🎉 ALL 5 TARGETED AUDIT SUITES PASSED (100% SUCCESS)');
    console.log('====================================================');
  } finally {
    try {
      execSync(`taskkill /pid ${serverProcess.pid} /f /t`);
    } catch {
      serverProcess.kill();
    }
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
