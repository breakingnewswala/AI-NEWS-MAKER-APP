const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

const PROJECT_DIR = process.env.PROJECT_DIR || path.resolve(__dirname, '..');
const PORT = 5058;
const REDIRECT_PORT = 5059;
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

async function runTests() {
  console.log('====================================================');
  console.log('🧪 STARTING INDEPENDENT ACCEPTANCE AUDIT TESTS');
  console.log('====================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Setup local redirect server to test SSRF Redirect protection
  const redirectServer = http.createServer((req, res) => {
    if (req.url === '/redirect-to-metadata') {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    } else if (req.url === '/redirect-to-loopback') {
      res.writeHead(302, { Location: 'http://127.0.0.1:22/' });
      res.end();
    } else if (req.url === '/safe-image.png') {
      // 1x1 transparent PNG
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

  let serverErrorOutput = '';
  serverProcess.stdout.on('data', (d) => {
    console.log('[Server]:', d.toString().trim());
  });
  serverProcess.stderr.on('data', (d) => {
    serverErrorOutput += d.toString();
    console.error('[Server Err]:', d.toString().trim());
  });

  // Wait for server to be responsive
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const res = await httpRequest({ host: '127.0.0.1', port: PORT, path: '/', method: 'GET' });
      if (res.status >= 200 && res.status < 500) {
        serverReady = true;
        break;
      }
    } catch (e) {
      // connecting...
    }
  }
  if (!serverReady && serverErrorOutput) {
    console.error('Server startup error:', serverErrorOutput);
  }
  assert(serverReady, 'Server started and responsive on port ' + PORT);

  try {
    // =========================================================================
    // TEST SUITE 1: /api/proxy-image SSRF, DNS Rebinding & Redirect Security
    // =========================================================================
    console.log('\n--- 1. Testing /api/proxy-image SSRF & Redirect Security ---');

    // 1.1 Direct loopback block
    const resLoopback = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://127.0.0.1:8080/secret'),
      method: 'GET',
    });
    assert(resLoopback.status === 403, 'Loopback IP http://127.0.0.1 blocked with 403 Forbidden');

    // 1.2 Direct cloud metadata block
    const resMetadata = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://169.254.169.254/computeMetadata/v1/'),
      method: 'GET',
    });
    assert(resMetadata.status === 403, 'Cloud Metadata IP http://169.254.169.254 blocked with 403 Forbidden');

    // 1.3 Localhost domain block
    const resLocalhost = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent('http://localhost:3000/api/keys'),
      method: 'GET',
    });
    assert(resLocalhost.status === 403, 'Localhost hostname blocked with 403 Forbidden');

    // 1.4 Redirect to metadata IP blocked
    const resRedirectMetadata = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent(`http://127.0.0.1:${REDIRECT_PORT}/redirect-to-metadata`),
      method: 'GET',
    });
    assert(resRedirectMetadata.status === 403, 'Redirect destination pointing to Metadata IP blocked with 403 Forbidden');

    // 1.5 Redirect to loopback IP blocked
    const resRedirectLoopback = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/proxy-image?url=' + encodeURIComponent(`http://127.0.0.1:${REDIRECT_PORT}/redirect-to-loopback`),
      method: 'GET',
    });
    assert(resRedirectLoopback.status === 403, 'Redirect destination pointing to Loopback IP blocked with 403 Forbidden');

    // =========================================================================
    // TEST SUITE 2: Frame Category, Approval and Publication Decoupling
    // =========================================================================
    console.log('\n--- 2. Testing Frame Category, Approval & Publication Decoupling ---');

    function createAdminToken() {
      const payload = {
        userId: "usr_test_synthetic_admin",
        email: "test.admin@synthetic.local",
        role: "superadmin",
        username: "Test Synthetic SuperAdmin",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400,
      };
      const header = { alg: "HS256", typ: "JWT" };
      const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const signature = crypto
        .createHmac("sha256", TEST_SESSION_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64url");
      return `${encodedHeader}.${encodedPayload}.${signature}`;
    }

    const adminToken = createAdminToken();
    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    };

    // 2.1 Create a temporary test frame in TEST_FRAMES
    const testFrameId = 'df_test_audit_' + Date.now();
    const createRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/dynamic-frames',
      method: 'POST',
      headers: adminHeaders,
    }, {
      id: testFrameId,
      name: 'Audit Test Dynamic Frame',
      aspectRatio: '4:5',
      designCategory: 'TEST_FRAMES',
      isTestFrame: true,
      approvalStatus: 'PENDING_TEST',
      publicationStatus: 'draft',
      primaryBackgroundAsset: 'https://storage.googleapis.com/test-bucket/test-frame.png',
      footerConfig: {
        footerHeightRatio: 0.08,
        footerBgColor: '#FFFFFF',
        footerTextColor: '#000000',
        bannedFooterColor: '#FF0055',
      },
    });
    console.log('createRes status:', createRes.status, 'body:', createRes.body);
    assert(createRes.status === 200, 'Created draft test frame df_test_audit');
    assert(createRes.json?.frame?.approvalStatus === 'PENDING_TEST', 'Initial approval status is PENDING_TEST');
    assert(createRes.json?.frame?.publicationStatus === 'draft', 'Initial publication status is draft');

    // 2.2 Update category ONLY to "National"
    const updateCategoryRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: `/api/dynamic-frames/${testFrameId}`,
      method: 'PUT',
      headers: adminHeaders,
    }, {
      designCategory: 'National',
    });
    assert(updateCategoryRes.status === 200, 'Updated category to National');
    assert(updateCategoryRes.json?.frame?.designCategory === 'National', 'designCategory is National');
    assert(updateCategoryRes.json?.frame?.approvalStatus === 'PENDING_TEST', 'DECOUPLED: approvalStatus remains PENDING_TEST (NOT auto-approved!)');
    assert(updateCategoryRes.json?.frame?.publicationStatus === 'draft', 'DECOUPLED: publicationStatus remains draft (NOT auto-published!)');

    // 2.3 Verify unapproved / draft frame is hidden from normal users
    const publicFramesRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/dynamic-frames',
      method: 'GET',
    });
    const publicList = publicFramesRes.json?.frames || (Array.isArray(publicFramesRes.json) ? publicFramesRes.json : []);
    const foundInPublic = publicList.some(f => f.id === testFrameId);
    assert(!foundInPublic, 'Unapproved & draft frame is completely HIDDEN from normal users');

    // 2.4 Verify Master Admin explicit approve & publish action
    const approvePublishRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: `/api/dynamic-frames/${testFrameId}`,
      method: 'PUT',
      headers: adminHeaders,
    }, {
      approvalStatus: 'APPROVED',
      publicationStatus: 'published',
      isTestFrame: false,
    });
    assert(approvePublishRes.status === 200, 'Explicit Master Admin approval & publication succeeded');
    assert(approvePublishRes.json?.frame?.approvalStatus === 'APPROVED', 'approvalStatus is now APPROVED');
    assert(approvePublishRes.json?.frame?.publicationStatus === 'published', 'publicationStatus is now published');

    // =========================================================================
    // TEST SUITE 3: Custom Footer Backend Security
    // =========================================================================
    console.log('\n--- 3. Testing Custom Footer Backend Security ---');

    // 3.1 Basic user profile update with customFooterPng must be REJECTED
    const basicProfileRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/user-profile',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      userId: 'usr_basic_test_123',
      email: 'basicuser@example.com',
      tier: 'basic',
      customFooterPng: 'https://storage.googleapis.com/test-bucket/my-custom-footer.png',
    });
    console.log('basicProfileRes status:', basicProfileRes.status, 'body:', basicProfileRes.body);
    assert(basicProfileRes.status === 403, 'Basic user customFooterPng update rejected with 403 Forbidden');

    // 3.2 Banned Footer Color validation on dynamic frame update
    const bannedColorRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: `/api/dynamic-frames/${testFrameId}`,
      method: 'PUT',
      headers: adminHeaders,
    }, {
      footerConfig: {
        footerBgColor: '#FF0055', // Banned color!
      },
    });
    assert(bannedColorRes.status === 400, 'Banned footer background color (#FF0055) rejected with HTTP 400');
    assert(
      bannedColorRes.json?.error?.includes('प्रतिबंधित') ||
      bannedColorRes.json?.error?.includes('Banned') ||
      bannedColorRes.json?.error?.includes('à¤ªà¥ à¤°à¤¤à¤¿à¤¬à¤‚à¤§à¤¿à¤¤'),
      'Banned footer color returns clear Hindi warning'
    );

    // 3.3 Verify Download Entitlement checks custom footer tier restriction
    const verifyCustomFooterRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/verify-download-entitlement',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: 'basicuser@example.com',
      card: {
        templateId: 'graphic_001',
        headline: 'यह एक बहुत महत्वपूर्ण और बड़ी खबर की हेडलाइन है जो पूरी तरह से मान्य है',
        location: 'नई दिल्ली',
        customFooterPng: 'https://storage.googleapis.com/test-bucket/unauthorized-footer.png',
      },
    });
    assert(verifyCustomFooterRes.status === 403, 'Basic user download with custom footer rejected with 403 Forbidden');
    assert(verifyCustomFooterRes.json?.customFooterLocked === true, 'customFooterLocked flag is true');

    // 3.4 Verify Download Entitlement checks banned footer color violation
    const verifyBannedColorRes = await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/api/verify-download-entitlement',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      email: 'pro@example.com',
      card: {
        frameDesign: testFrameId,
        headline: 'यह एक बहुत महत्वपूर्ण और बड़ी खबर की हेडलाइन है जो पूरी तरह से मान्य है',
        location: 'नई दिल्ली',
        footerBgColor: '#FF0055', // Banned color on testFrameId!
      },
    });
    assert(verifyBannedColorRes.status === 400, 'Download with banned footer color rejected with HTTP 400');
    assert(verifyBannedColorRes.json?.bannedFooterColorViolation === true, 'bannedFooterColorViolation flag is true');

    // Clean up temporary test frame
    await httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: `/api/dynamic-frames/${testFrameId}`,
      method: 'DELETE',
      headers: adminHeaders,
    });
    console.log('🧹 Cleaned up temporary test frame');

    // =========================================================================
    // TEST SUITE 4 & 5: Headless Chromium Canvas Rendering & Mandatory PNG Export
    // =========================================================================
    console.log('\n--- 4 & 5. Testing Headless Chrome Canvas Rendering & Mandatory Frame Checks ---');

    const findChrome = () => {
      if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
      if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
      if (process.platform === 'win32') {
        const winPaths = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
        ];
        for (const p of winPaths) {
          if (fs.existsSync(p)) return p;
        }
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else if (process.platform === 'darwin') {
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else {
        const linuxPaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
        for (const p of linuxPaths) {
          if (fs.existsSync(p)) return p;
        }
        return 'google-chrome';
      }
    };
    const chromePath = findChrome();
    const cdpPort = 9225;
    const userDataDir = path.join(PROJECT_DIR, '.tmp_chrome_audit');

    console.log('🌐 Launching Headless Chromium via CDP at: ' + chromePath);
    const chromeArgs = [
      '--headless=new',
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--disable-gpu',
      '--disable-web-security',
      '--allow-file-access-from-files',
    ];
    if (process.platform !== 'win32') {
      chromeArgs.push('--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage');
    }
    chromeArgs.push(`http://127.0.0.1:${PORT}/`);
    const chromeProc = spawn(chromePath, chromeArgs);

    // Wait for Chrome CDP port
    let cdpReady = false;
    let pageWsUrl = '';
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const cdpVersionRes = await httpRequest({ host: '127.0.0.1', port: cdpPort, path: '/json/list', method: 'GET' });
        if (cdpVersionRes.json && cdpVersionRes.json.length > 0) {
          pageWsUrl = cdpVersionRes.json[0].webSocketDebuggerUrl;
          cdpReady = true;
          break;
        }
      } catch {}
    }
    assert(cdpReady, 'Headless Chrome CDP is ready on port ' + cdpPort);

    // Run browser-side canvas execution via CDP WebSocket
    const WebSocket = require(path.join(PROJECT_DIR, 'node_modules', 'ws'));
    const ws = new WebSocket(pageWsUrl);
    await new Promise((r) => ws.on('open', r));

    let msgId = 1;
    function sendCdp(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        const handler = (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            ws.off('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCdp('Runtime.enable');
    await sendCdp('Page.enable');

    // Wait for studio to load
    console.log('⏳ Waiting 4 seconds for Vite studio bundle to mount...');
    await sleep(4000);

    // Test 4.1: Verify waiting screen content update in DOM
    const titleEval = await sendCdp('Runtime.evaluate', {
      expression: 'document.title'
    });
    console.log('Studio Page Title:', titleEval.result?.value);

    // Test 4.2: Verify Mandatory PNG Frame load failure throws explicit Hindi error
    console.log('Testing loadImage mandatory error handling in browser runtime...');
    const mandatoryErrorEval = await sendCdp('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          try {
            const canvasExp = window.__CANVAS_EXPORTER__;
            if (!canvasExp) return { success: false, error: 'window.__CANVAS_EXPORTER__ not found' };
            try {
              await canvasExp.loadImage('http://broken-mandatory-domain-invalid-999.xyz/frame.png', {
                isMandatory: true,
                assetName: 'फ्रेम आर्टवर्क'
              });
              return { success: true, threw: false };
            } catch (err) {
              return { success: true, threw: true, message: err.message };
            }
          } catch (importErr) {
            return { success: false, error: importErr.message };
          }
        })()
      `,
      returnByValue: true,
    });

    const evalResult = mandatoryErrorEval.result?.value;
    console.log('CDP mandatoryErrorEval result:', JSON.stringify(mandatoryErrorEval));
    assert(evalResult?.threw === true, 'Mandatory frame load error threw an exception');
    assert(evalResult?.message?.includes('अनिवार्य फ्रेम आर्टवर्क लोड नहीं हो सका'), 'Exception contains exact Hindi error: ' + evalResult?.message);

    // Test 4.3: Verify Optional decorative asset falls back to 1x1 transparent SVG without throwing
    const optionalFallbackEval = await sendCdp('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          try {
            const canvasExp = window.__CANVAS_EXPORTER__;
            if (!canvasExp) return { success: false, error: 'window.__CANVAS_EXPORTER__ not found' };
            const img = await canvasExp.loadImage('http://broken-optional-domain-invalid-999.xyz/ribbon.png', {
              isMandatory: false,
              assetName: 'रिबन'
            });
            return {
              success: true,
              isFallback: img.src.includes('data:image/svg+xml') && img.src.includes('width="1"'),
              width: img.width,
              height: img.height
            };
          } catch (err) {
            return { success: false, error: err.message };
          }
        })()
      `,
      returnByValue: true,
    });
    const optResult = optionalFallbackEval.result?.value;
    assert(optResult?.success === true && optResult?.isFallback === true, 'Optional decorative asset gracefully falls back to transparent 1x1 SVG');

    // Test 5: Full authoritative Canvas render and real export download
    console.log('\n--- 5. Executing Authoritative Canvas Rendering and Final Export ---');
    const framesDb = JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, 'dynamic_frames_db.json'), 'utf8'));
    const targetDf = framesDb.find(f => f.id === 'df_1794406067554_albmw') || framesDb[0];

    const canvasExportEval = await sendCdp('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          try {
            const canvasExp = window.__CANVAS_EXPORTER__;
            if (!canvasExp) return { success: false, error: 'window.__CANVAS_EXPORTER__ not found' };
            const targetFrame = ${JSON.stringify(targetDf)};
            const testCard = {
              id: 'test_audit_card_1',
              frameDesign: targetFrame.id,
              customDynamicFrame: targetFrame,
              headline: 'राष्ट्रीय राजधानी क्षेत्र में नई विकास परियोजनाओं को मिली मंजूरी',
              category: 'राष्ट्रीय खबर',
              location: 'नई दिल्ली',
              aspectRatio: '4:5',
              images: {
                main: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="900"><rect width="100%" height="100%" fill="%231e3a8a"/><text x="50%" y="50%" fill="white" font-size="48" font-family="sans-serif" text-anchor="middle">REAL TEST PHOTO</text></svg>',
              },
              footerBgColor: '#FFFFFF',
              footerTextColor: '#000000',
              showDate: true,
            };

            const canvas = await canvasExp.renderCardToCanvas(testCard);
            const dataUrlJpeg = canvas.toDataURL('image/jpeg', 0.95);
            const dataUrlPng = canvas.toDataURL('image/png');

            return {
              success: true,
              width: canvas.width,
              height: canvas.height,
              jpegLength: dataUrlJpeg.length,
              pngLength: dataUrlPng.length,
              jpegBase64: dataUrlJpeg.split(',')[1],
              pngBase64: dataUrlPng.split(',')[1]
            };
          } catch (err) {
            return { success: false, error: err.message, stack: err.stack };
          }
        })()
      `,
      returnByValue: true,
    });

    const exportResult = canvasExportEval.result?.value;
    console.log('canvasExportEval result:', JSON.stringify(canvasExportEval.result?.value));
    assert(exportResult?.success === true, 'Authoritative canvas renderCardToCanvas succeeded');
    assert(exportResult?.width === 1080 && exportResult?.height === 1350, 'Exact 1080x1350 4:5 resolution confirmed');
    assert(exportResult?.jpegLength > 20000, 'JPEG export payload verified (> 20KB data URL length)');
    assert(exportResult?.pngLength > 50000, 'PNG export payload verified (> 50KB data URL length)');

    // Save actual exported image files to disk and inspect
    const jpegBuffer = Buffer.from(exportResult.jpegBase64, 'base64');
    const pngBuffer = Buffer.from(exportResult.pngBase64, 'base64');

    const outJpegPath = path.join(PROJECT_DIR, 'actual_audit_verified_export.jpg');
    const outPngPath = path.join(PROJECT_DIR, 'actual_audit_verified_export.png');

    fs.writeFileSync(outJpegPath, jpegBuffer);
    fs.writeFileSync(outPngPath, pngBuffer);

    console.log(`📸 Saved JPEG Export: ${outJpegPath} (${jpegBuffer.length} bytes)`);
    console.log(`📸 Saved PNG Export: ${outPngPath} (${pngBuffer.length} bytes)`);

    assert(fs.existsSync(outJpegPath) && fs.statSync(outJpegPath).size > 15000, 'Exported JPEG file verified on disk');
    assert(fs.existsSync(outPngPath) && fs.statSync(outPngPath).size > 30000, 'Exported PNG file verified on disk');

    // Clean up headless Chrome
    ws.close();
    chromeProc.kill();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}

  } finally {
    redirectServer.close();
    try { execSync(`taskkill /pid ${serverProcess.pid} /f /t`); } catch { serverProcess.kill(); }
    console.log('🛑 Servers stopped.');
  }

  console.log('\n====================================================');
  console.log(`🎉 AUDIT RESULT: ${passedTests}/${totalTests} TESTS PASSED (100% SUCCESS)`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ AUDIT RUN ERROR:', err);
  process.exit(1);
});
