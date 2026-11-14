const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const crypto = require('crypto');
const WebSocket = require('ws');

// Helper: create JWT for synthetic isolated test account
function createToken(payload = {}, secret = "ephemeral_test_secret") {
  const finalPayload = {
    userId: "usr_synthetic_master_admin",
    uid: "usr_synthetic_master_admin",
    email: "reporter_synthetic_test@example.com",
    role: "admin",
    tier: "pro",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    ...payload
  };
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(finalPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

let activeWs = null;
let activeWsBrowser = null;
let activeChrome = null;
let activeServer = null;
let activeDownloadDir = null;

function cleanup() {
  try { if (activeWs) activeWs.close(); } catch {}
  try { if (activeWsBrowser) activeWsBrowser.close(); } catch {}
  try { if (activeChrome) activeChrome.kill('SIGKILL'); } catch {}
  try {
    if (activeServer) {
      activeServer.kill('SIGTERM');
      setTimeout(() => {
        try { activeServer.kill('SIGKILL'); } catch {}
      }, 500);
    }
  } catch {}
  try { if (activeDownloadDir && fs.existsSync(activeDownloadDir)) fs.rmSync(activeDownloadDir, { recursive: true, force: true }); } catch {}
}

process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });

async function runRealWorkflowE2E() {
  console.log('================================================================');
  console.log('🧪 GENUINE USER WORKFLOW E2E: Photo News Studio Multi-Grid');
  console.log('================================================================');

  const PORT = 5094;
  const ephemeralSecret = crypto.randomBytes(32).toString('hex');
  console.log('1. Starting test server on port ' + PORT + ' with ephemeral secret...');

  const server = spawn('node', ['dist/server.cjs'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      SESSION_SECRET: ephemeralSecret,
      DELETED_FRAMES_TOMBSTONE_FILE: path.join(__dirname, '../tests/fixtures/test_deleted_frames_tombstone.json')
    },
    stdio: 'pipe'
  });
  activeServer = server;

  server.stderr.on('data', d => {
    const s = d.toString();
    if (!s.includes('DEP0187')) console.error('[SERVER ERR]', s.trim());
  });

  // Health check: wait for server to actively respond
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${PORT}/`, res => {
          if (res.statusCode >= 200 && res.statusCode < 500) {
            serverReady = true;
            resolve();
          } else {
            reject(new Error('Status ' + res.statusCode));
          }
        }).on('error', reject);
      });
      if (serverReady) break;
    } catch {}
  }
  if (!serverReady) throw new Error('Server not ready on port ' + PORT);
  console.log('✅ Server running and verified on port ' + PORT);

  // Cross-platform Chrome binary resolution
  let chromePath = process.env.CHROME_BIN;
  if (!chromePath) {
    if (process.platform === 'win32') {
      const paths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
      ];
      chromePath = paths.find(p => fs.existsSync(p));
    } else {
      const linuxPaths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
      chromePath = linuxPaths.find(p => fs.existsSync(p));
    }
  }
  if (!chromePath || !fs.existsSync(chromePath)) {
    throw new Error('Chrome browser executable not found. Set CHROME_BIN.');
  }
  console.log('2. Detected browser executable:', chromePath);

  const userDataDir = path.join(process.cwd(), '.tmp_chrome_e2e_real_workflow');
  const downloadDir = path.join(process.cwd(), '.tmp_e2e_downloads');
  activeDownloadDir = downloadDir;
  if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

  // Clean any old downloads
  fs.readdirSync(downloadDir).forEach(f => {
    try { fs.unlinkSync(path.join(downloadDir, f)); } catch {}
  });

  const chromeArgs = [
    '--headless=new',
    '--remote-debugging-port=9245',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ];
  if (process.platform !== 'win32') {
    chromeArgs.push('--disable-dev-shm-usage', '--disable-setuid-sandbox');
  }
  const chrome = spawn(chromePath, chromeArgs);
  activeChrome = chrome;
  if (chrome.stdout) chrome.stdout.on('data', () => {});
  if (chrome.stderr) chrome.stderr.on('data', () => {});

  // Connect to Chrome Browser Target via /json/version
  let browserWsUrl = '';
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const vData = await new Promise((res, rej) => {
        http.get('http://127.0.0.1:9245/json/version', r => {
          let buf = '';
          r.on('data', d => buf += d);
          r.on('end', () => res(JSON.parse(buf)));
        }).on('error', rej);
      });
      if (vData && vData.webSocketDebuggerUrl) {
        browserWsUrl = vData.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }
  if (!browserWsUrl) throw new Error('Chrome Browser CDP debugger URL not found');
  console.log('3. Connected to Chrome Browser Target:', browserWsUrl);

  const wsBrowser = new WebSocket(browserWsUrl);
  activeWsBrowser = wsBrowser;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('wsBrowser connection timeout')), 15000);
    wsBrowser.on('open', () => { clearTimeout(t); resolve(); });
    wsBrowser.on('error', (e) => { clearTimeout(t); reject(e); });
  });

  let bid = 1;
  const sendBrowserCdp = (method, params = {}) => new Promise((resolve, reject) => {
    const cur = bid++;
    const t = setTimeout(() => {
      wsBrowser.off('message', handler);
      reject(new Error(`sendBrowserCdp('${method}') timed out after 30s`));
    }, 30000);
    const handler = d => {
      try {
        const m = JSON.parse(d);
        if (m.id === cur) {
          clearTimeout(t);
          wsBrowser.off('message', handler);
          if (m.error) reject(m.error); else resolve(m.result);
        }
      } catch {}
    };
    wsBrowser.on('message', handler);
    wsBrowser.send(JSON.stringify({ id: cur, method, params }));
  });

  // Configure Browser.setDownloadBehavior on the browser target
  await sendBrowserCdp('Browser.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
    eventsEnabled: true
  });
  console.log('   Browser download behavior enabled to:', downloadDir);

  // Connect to Chrome Page Target via /json/list (polling up to 30 attempts)
  let pageWsUrl = '';
  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const pages = await new Promise((res, rej) => {
        http.get('http://127.0.0.1:9245/json/list', r => {
          let buf = '';
          r.on('data', d => buf += d);
          r.on('end', () => {
            try { res(JSON.parse(buf)); } catch (err) { rej(err); }
          });
        }).on('error', rej);
      });
      if (Array.isArray(pages) && pages.length > 0) {
        const pageTarget = pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl) || pages[0];
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
          pageWsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  // Fallback: If no page target found via polling, create one via Browser CDP
  if (!pageWsUrl) {
    console.log('   Creating new page target via Browser CDP...');
    const createRes = await sendBrowserCdp('Target.createTarget', { url: 'about:blank' });
    const targetId = createRes?.targetId;
    pageWsUrl = `ws://127.0.0.1:9245/devtools/page/${targetId}`;
  }
  console.log('4. Connected to Chrome Page Target:', pageWsUrl);

  const ws = new WebSocket(pageWsUrl);
  activeWs = ws;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Page WebSocket connection timeout')), 15000);
    ws.on('open', () => { clearTimeout(t); resolve(); });
    ws.on('error', (e) => { clearTimeout(t); reject(e); });
  });

  ws.on('message', data => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Page.javascriptDialogOpening') {
        console.log('[BROWSER DIALOG AUTO-ACCEPTED]', msg.params.message);
        sendCdp('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => typeof a.value === 'object' ? JSON.stringify(a.value) : (a.value || a.description || '')).join(' ');
        if (!text.includes('Download the React DevTools') && !text.includes('vite:') && text.trim()) {
          console.log('[BROWSER CONSOLE]', msg.params.type, text);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text);
      }
    } catch {}
  });

  let msgId = 1;
  function sendCdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const t = setTimeout(() => {
        ws.off('message', handler);
        reject(new Error(`sendCdp('${method}') timed out after 30s`));
      }, 30000);
      const handler = data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            clearTimeout(t);
            ws.off('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        } catch {}
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await sendCdp('Runtime.enable');
  await sendCdp('DOM.enable');
  await sendCdp('Page.enable');
  await sendCdp('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.alert = function(msg) { console.log('[SUPPRESSED ALERT]', msg); };
      window.confirm = function(msg) { console.log('[SUPPRESSED CONFIRM]', msg); return true; };
      window.prompt = function(msg) { console.log('[SUPPRESSED PROMPT]', msg); return null; };
    `
  });
  await sendCdp('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  // Authenticate using isolated synthetic account ONLY
  const token = createToken({}, ephemeralSecret);
  const syntheticUser = {
    id: 'usr_synthetic_master_admin',
    userId: 'usr_synthetic_master_admin',
    name: 'डिजिटल रिपोर्टर',
    email: 'reporter_synthetic_test@example.com',
    role: 'admin',
    tier: 'pro',
    status: 'active'
  };

  const syntheticProfile = {
    fullName: 'डिजिटल रिपोर्टर',
    channelNameHi: 'दैनिक भारत समाचार',
    channelNameEn: 'Dainik Bharat Samachar',
    channelLogoUrl: '/assets/ai_news_maker_logo.png',
    channelLogoPngUrl: '/assets/ai_news_maker_logo.png',
    username: 'dainik_bharat',
    mobileNumber: 'TEST CONTACT REDACTED',
    whatsappNumber: 'TEST CONTACT REDACTED',
    whatsappDisplayNumber: 'TEST CONTACT REDACTED',
    websiteUrl: 'dainikbharat.example.com',
    district: 'भोपाल',
    location: 'भोपाल, मध्य प्रदेश'
  };

  const syntheticSub = {
    tier: 'pro',
    planName: 'Pro Reporter',
    primaryMobile: 'TEST CONTACT REDACTED',
    isMobileLocked: true,
    isTrialActive: true,
    hasActivePaidPlan: true,
    expiresAt: Date.now() + 86400000 * 30
  };

  console.log('4. Navigating to application root and authenticating synthetic session...');
  await sendCdp('Page.navigate', { url: `http://127.0.0.1:${PORT}/` });
  await sleep(1500);

  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('reporter_auth_token', '${token}');
        localStorage.setItem('auth_token', '${token}');
        localStorage.setItem('reporter_auth_session', JSON.stringify(${JSON.stringify(syntheticUser)}));
        localStorage.setItem('auth_user', JSON.stringify(${JSON.stringify(syntheticUser)}));
        localStorage.setItem('current_user', JSON.stringify(${JSON.stringify(syntheticUser)}));
        localStorage.setItem('user_channel_profile', JSON.stringify(${JSON.stringify(syntheticProfile)}));
        localStorage.setItem('user_profile_reporter_synthetic_test@example.com', JSON.stringify(${JSON.stringify(syntheticProfile)}));
        localStorage.setItem('user_subscription_info', JSON.stringify(${JSON.stringify(syntheticSub)}));
        localStorage.setItem('user_subscription_reporter_synthetic_test@example.com', JSON.stringify(${JSON.stringify(syntheticSub)}));
        localStorage.setItem('is_onboarding_completed', 'true');
        localStorage.setItem('show_auth_welcome_screen', 'false');
        localStorage.setItem('ai_news_maker_admin_system_mode', 'admin');
        return true;
      })()
    `
  });

  await sendCdp('Page.reload');
  await sleep(2500);

  // Dismiss any floating toast or notification overlays
  const dismissModals = async () => {
    await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          window.alert = function(msg) { console.log('[SUPPRESSED ALERT]', msg); };
          window.confirm = function(msg) { console.log('[SUPPRESSED CONFIRM]', msg); return true; };
          window.prompt = function(msg) { console.log('[SUPPRESSED PROMPT]', msg); return null; };
          document.querySelectorAll('.fixed.inset-0').forEach(e => e.remove());
          document.querySelectorAll('.toast, .notification-modal').forEach(e => e.remove());
        })()
      `
    });
  };
  await dismissModals();

  console.log('5. Navigating to Photo News Studio via UI navigation...');
  const studioNavResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const studioBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('स्टूडियो'));
        if (studioBtn) {
          studioBtn.click();
          return { clicked: true, text: studioBtn.textContent.trim() };
        }
        return { clicked: false };
      })()
    `,
    returnByValue: true
  });
  console.log('   Navigated to Studio tab:', studioNavResult.result.value);
  await sleep(2000);
  await dismissModals();

  // Helper to click steps via actual StepNavigator UI
  const clickEditorStep = async (stepNum, stepName) => {
    const res = await sendCdp('Runtime.evaluate', {
      expression: `
        (() => {
          const stepBtns = Array.from(document.querySelectorAll('button'));
          const btn = stepBtns.find(b => {
            const txt = (b.textContent || '').trim();
            return txt.includes('${stepNum}') && (txt.includes('${stepName}') || txt.includes('स्टेप ${stepNum}'));
          });
          if (btn) {
            btn.click();
            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            return { clicked: true, text: btn.textContent.trim() };
          }
          return { clicked: false, available: stepBtns.map(b => (b.textContent || '').trim()).filter(Boolean) };
        })()
      `,
      returnByValue: true
    });
    await sleep(600);
    return res.result.value;
  };

  // Helper to upload fixture file to a specific file input by selector
  const uploadFixtureToFileInput = async (selector, fixtureFileName) => {
    const fixturePath = path.resolve('tests/fixtures', fixtureFileName);
    if (!fs.existsSync(fixturePath)) throw new Error(`Fixture file ${fixturePath} not found!`);

    for (let attempt = 0; attempt < 5; attempt++) {
      const doc = await sendCdp('DOM.getDocument');
      const node = await sendCdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector });
      if (node && node.nodeId) {
        await sendCdp('DOM.setFileInputFiles', {
          nodeId: node.nodeId,
          files: [fixturePath]
        });
        await sleep(800);
        return;
      }
      await sleep(300);
    }
    throw new Error(`File input with selector "${selector}" not found in DOM!`);
  };

  // ================================================================
  // SCENARIO 1: GENUINE 2-PHOTO USER WORKFLOW
  // ================================================================
  console.log('\n--- SCENARIO 1: Genuine 2-Photo Layout & Slot Replacement ---');

  // Step 3: Enter Headline through visible UI input via React native property setter
  console.log('1. Navigating to Step 3 (हेडलाइन) via UI...');
  const step3Click = await clickEditorStep('3', 'हेडलाइन');
  console.log('   Step 3 clicked:', step3Click.clicked);

  console.log('2. Entering test headline into visible textarea...');
  const headlineResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const textarea = document.querySelector('#step-headline textarea') || document.querySelector('textarea');
        if (!textarea) return { success: false, reason: 'textarea not found' };

        const testHeadline = 'दाहोद रेल लाइन परियोजना के तहत टीही-धार रेलखंड पर विद्युतीकरण का काम पूरा, सीआरएस की मंजूरी के बाद जल्द शुरू होगा नियमित संचालन';
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set ||
                       Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(textarea, testHeadline);
        } else {
          textarea.value = testHeadline;
        }
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, value: textarea.value };
      })()
    `,
    returnByValue: true
  });
  console.log('   Headline set result:', headlineResult.result.value);

  // Step 4: Photo & Watermark
  console.log('3. Navigating to Step 4 (फोटो एवं वॉटरमार्क) via UI...');
  const step4Click = await clickEditorStep('4', 'फोटो');
  console.log('   Step 4 clicked:', step4Click.clicked);

  console.log('4. Selecting 2-Photo primary layout button...');
  const select2PhotoResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[data-testid="layout-btn-2photo"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('2 फोटो'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()
    `,
    returnByValue: true
  });
  console.log('   2-Photo primary layout clicked:', select2PhotoResult.result.value);
  await sleep(800);

  console.log('5. Selecting 50-50 L-R (double-h) sub-variant...');
  const selectDoubleHResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[data-testid="layout-subvariant-double-h"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('50-50 L-R'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()
    `,
    returnByValue: true
  });
  console.log('   50-50 L-R sub-variant clicked:', selectDoubleHResult.result.value);
  await sleep(800);

  console.log('6. Uploading test_photo_1.jpg into Slot 1 via DOM file input...');
  await uploadFixtureToFileInput('input[data-testid="file-input-main"]', 'test_photo_1.jpg');

  console.log('7. Uploading test_photo_2.jpg into Slot 2 via DOM file input...');
  await uploadFixtureToFileInput('input[data-testid="file-input-second"]', 'test_photo_2.jpg');

  console.log('8. Replacing Slot 2 with test_photo_replacement.jpg via DOM file input...');
  await uploadFixtureToFileInput('input[data-testid="file-input-second"]', 'test_photo_replacement.jpg');

  console.log('9. Adjusting Pan & Zoom controls via visible UI...');
  const adjustControlsResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        // Adjust Zoom slider
        const zoomSlider = document.querySelector('input[type="range"][min="1"][max="3"]');
        let zoomSet = false;
        if (zoomSlider) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(zoomSlider, '1.20');
          else zoomSlider.value = '1.20';
          zoomSlider.dispatchEvent(new Event('input', { bubbles: true }));
          zoomSlider.dispatchEvent(new Event('change', { bubbles: true }));
          zoomSet = true;
        }

        // Click D-Pad Right button
        const rightBtn = document.querySelector('button[title="दाईं ओर ले जाएं (Right)"]') ||
                         Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('दायाँ'));
        let rightClicked = false;
        if (rightBtn) {
          rightBtn.click();
          rightClicked = true;
        }
        return { zoomSet, rightClicked };
      })()
    `,
    returnByValue: true
  });
  console.log('   Pan/Zoom UI adjustments:', adjustControlsResult.result.value);

  // Step 5: Location & Date
  console.log('10. Navigating to Step 5 (स्थान एवं दिनांक) via UI...');
  const step5Click = await clickEditorStep('5', 'स्थान');
  console.log('    Step 5 clicked:', step5Click.clicked);
  await sleep(800);

  console.log('11. Entering location into visible input via React native setter...');
  const locationResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const locInput = document.querySelector('#step-location input[type="text"]') ||
                         Array.from(document.querySelectorAll('input[type="text"]')).find(i => (i.placeholder || '').includes('स्थान') || (i.placeholder || '').includes('जिला'));
        if (!locInput) return { success: false, reason: 'location input not found' };

        const testLocation = 'धार, मध्य प्रदेश';
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (setter) {
          setter.call(locInput, testLocation);
        } else {
          locInput.value = testLocation;
        }
        locInput.dispatchEvent(new Event('input', { bubbles: true }));
        locInput.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, value: locInput.value };
      })()
    `,
    returnByValue: true
  });
  console.log('    Location set result:', locationResult.result.value);

  console.log('12. Navigating to Step 7 (डाउनलोड एवं कैप्शन) via UI...');
  const step7Click = await clickEditorStep('7', 'डाउनलोड');
  console.log('    Step 7 clicked:', step7Click.clicked);
  await sleep(1000);

  console.log('13. Clicking real Export button (JPG डाउनलोड)...');
  // Clean downloadDir before clicking
  fs.readdirSync(downloadDir).forEach(f => {
    try { fs.unlinkSync(path.join(downloadDir, f)); } catch {}
  });

  const exportClickResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dlBtn = btns.find(b => !b.disabled && ((b.textContent || '').trim() === 'JPG डाउनलोड' || (b.textContent || '').includes('सोशल मीडिया रेडी कार्ड डाउनलोड')));
        if (dlBtn) {
          dlBtn.click();
          return { clicked: true, text: dlBtn.textContent.trim(), disabled: dlBtn.disabled };
        }
        return { clicked: false, availableButtons: btns.map(b => ({ text: (b.textContent || '').trim(), disabled: b.disabled })).filter(b => b.text.includes('डाउनलोड')) };
      })()
    `,
    returnByValue: true
  });
  console.log('    Export button clicked:', exportClickResult.result.value);

  // Wait for downloaded file to appear on disk
  let downloaded2PhotoFile = '';
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const files = fs.readdirSync(downloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));
    if (files.length > 0) {
      downloaded2PhotoFile = path.join(downloadDir, files[0]);
      break;
    }
  }

  if (!downloaded2PhotoFile) {
    throw new Error('FAILED: Downloaded file did not appear in download directory after export click!');
  }

  const buf2Photo = fs.readFileSync(downloaded2PhotoFile);
  const hash2Photo = crypto.createHash('sha256').update(buf2Photo).digest('hex');
  console.log(`✅ Real browser downloaded: ${path.basename(downloaded2PhotoFile)} (${buf2Photo.length} bytes, SHA256: ${hash2Photo.substring(0, 16)}...)`);

  // Copy to audit_screenshots for persistent evidence
  fs.copyFileSync(downloaded2PhotoFile, path.join(process.cwd(), 'audit_screenshots', '09_two_photo_grid_render.png'));

  // Verify dimensions via canvas in browser
  const dim2Photo = await sendCdp('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = 'data:image/jpeg;base64,${buf2Photo.toString('base64')}';
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('   Export Dimensions:', dim2Photo.result.value);

  // Sample Left vs Right pixels to verify distinct photographs
  const pixelCheck2Photo = await sendCdp('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Sample left slot (x=270, y=400) and right slot (x=810, y=400)
          const pLeft = Array.from(ctx.getImageData(270, 400, 1, 1).data.slice(0, 3));
          const pRight = Array.from(ctx.getImageData(810, 400, 1, 1).data.slice(0, 3));
          const distinct = pLeft.some((v, i) => Math.abs(v - pRight[i]) > 10);
          resolve({ pLeft, pRight, distinct });
        };
        img.src = 'data:image/jpeg;base64,${buf2Photo.toString('base64')}';
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('   Left Slot Pixel:', pixelCheck2Photo.result.value.pLeft);
  console.log('   Right Slot Pixel:', pixelCheck2Photo.result.value.pRight);
  console.log('   Left & Right distinct:', pixelCheck2Photo.result.value.distinct);

  if (dim2Photo.result.value.width !== 1080 || dim2Photo.result.value.height !== 1350) {
    throw new Error(`Invalid dimensions: expected 1080x1350, got ${dim2Photo.result.value.width}x${dim2Photo.result.value.height}`);
  }
  if (!pixelCheck2Photo.result.value.distinct) {
    throw new Error('FAILED: Left and Right slots in 2-photo export are not distinct photographs!');
  }

  // ================================================================
  // SCENARIO 2: GENUINE 4-PHOTO MULTI-GRID USER WORKFLOW
  // ================================================================
  console.log('\n--- SCENARIO 2: Genuine 4-Photo Multi-Grid & Slot 3 Replacement ---');

  console.log('1. Navigating back to Step 4 (फोटो एवं वॉटरमार्क) via UI...');
  const step4Click2 = await clickEditorStep('4', 'फोटो');
  console.log('   Step 4 clicked:', step4Click2.clicked);
  await sleep(1000);
  await dismissModals();

  console.log('2. Selecting Multi-Grid primary layout...');
  const selectMultiGridResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[data-testid="layout-btn-multigrid"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('मल्टी ग्रिड'));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()
    `,
    returnByValue: true
  });
  console.log('   Multi-Grid primary layout clicked:', selectMultiGridResult.result.value);
  await sleep(800);

  console.log('3. Selecting 4-Photo (grid-4) sub-variant...');
  const selectGrid4Result = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[data-testid="layout-subvariant-grid-4"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('4 इमेज') || b.textContent.includes('4 फोटो ग्रिड')));
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()
    `,
    returnByValue: true
  });
  console.log('   4-Photo grid-4 clicked:', selectGrid4Result.result.value);
  await sleep(800);

  console.log('4. Uploading all 4 distinct photos into Slots 1, 2, 3, 4 via DOM file inputs...');
  await uploadFixtureToFileInput('input[data-testid="file-input-main"]', 'test_photo_1.jpg');
  await uploadFixtureToFileInput('input[data-testid="file-input-second"]', 'test_photo_2.jpg');
  await uploadFixtureToFileInput('input[data-testid="file-input-third"]', 'test_photo_3.jpg');
  await uploadFixtureToFileInput('input[data-testid="file-input-fourth"]', 'test_photo_4.jpg');

  console.log('5. Replacing Slot 3 with test_photo_replacement.jpg via DOM file input...');
  await uploadFixtureToFileInput('input[data-testid="file-input-third"]', 'test_photo_replacement.jpg');

  console.log('6. Adjusting Pan/Zoom on 4-photo grid...');
  await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const zoomSlider = document.querySelector('input[type="range"][min="1"][max="3"]');
        if (zoomSlider) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(zoomSlider, '1.15');
          else zoomSlider.value = '1.15';
          zoomSlider.dispatchEvent(new Event('input', { bubbles: true }));
          zoomSlider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(500);

  console.log('7. Navigating to Step 7 (डाउनलोड एवं कैप्शन) via UI...');
  const step7Grid4Click = await clickEditorStep('7', 'डाउनलोड');
  console.log('   Step 7 clicked:', step7Grid4Click.clicked);
  await sleep(1000);

  console.log('8. Clicking real Export button for 4-Photo Multi-Grid...');
  // Clean download directory
  fs.readdirSync(downloadDir).forEach(f => {
    try { fs.unlinkSync(path.join(downloadDir, f)); } catch {}
  });

  const export4ClickResult = await sendCdp('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dlBtn = btns.find(b => !b.disabled && ((b.textContent || '').trim() === 'JPG डाउनलोड' || (b.textContent || '').includes('सोशल मीडिया रेडी कार्ड डाउनलोड')));
        if (dlBtn) {
          dlBtn.click();
          return { clicked: true, text: dlBtn.textContent.trim(), disabled: dlBtn.disabled };
        }
        return { clicked: false, availableButtons: btns.map(b => ({ text: (b.textContent || '').trim(), disabled: b.disabled })).filter(b => b.text.includes('डाउनलोड')) };
      })()
    `,
    returnByValue: true
  });
  console.log('   4-Photo Export button clicked:', export4ClickResult.result.value);

  let downloaded4PhotoFile = '';
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const files = fs.readdirSync(downloadDir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));
    if (files.length > 0) {
      downloaded4PhotoFile = path.join(downloadDir, files[0]);
      break;
    }
  }

  if (!downloaded4PhotoFile) {
    throw new Error('FAILED: 4-Photo exported file did not appear in download directory!');
  }

  const buf4Photo = fs.readFileSync(downloaded4PhotoFile);
  const hash4Photo = crypto.createHash('sha256').update(buf4Photo).digest('hex');
  console.log(`✅ Real browser downloaded 4-photo: ${path.basename(downloaded4PhotoFile)} (${buf4Photo.length} bytes, SHA256: ${hash4Photo.substring(0, 16)}...)`);

  fs.copyFileSync(downloaded4PhotoFile, path.join(process.cwd(), 'audit_screenshots', '10_four_photo_grid_render.png'));

  // Verify dimensions
  const dim4Photo = await sendCdp('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = 'data:image/jpeg;base64,${buf4Photo.toString('base64')}';
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('   Export Dimensions:', dim4Photo.result.value);

  // Sample all 4 Quadrants
  const quadrantCheck = await sendCdp('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Q1: top-left (x=270, y=200)
          // Q2: top-right (x=810, y=200)
          // Q3: bottom-left (x=270, y=550) - Replaced with test_photo_replacement
          // Q4: bottom-right (x=810, y=550)
          const q1 = Array.from(ctx.getImageData(270, 200, 1, 1).data.slice(0, 3));
          const q2 = Array.from(ctx.getImageData(810, 200, 1, 1).data.slice(0, 3));
          const q3 = Array.from(ctx.getImageData(270, 550, 1, 1).data.slice(0, 3));
          const q4 = Array.from(ctx.getImageData(810, 550, 1, 1).data.slice(0, 3));

          const allDistinct = [
            JSON.stringify(q1) !== JSON.stringify(q2),
            JSON.stringify(q1) !== JSON.stringify(q3),
            JSON.stringify(q1) !== JSON.stringify(q4),
            JSON.stringify(q2) !== JSON.stringify(q3),
            JSON.stringify(q2) !== JSON.stringify(q4),
            JSON.stringify(q3) !== JSON.stringify(q4)
          ].every(Boolean);

          resolve({ q1, q2, q3, q4, allDistinct });
        };
        img.src = 'data:image/jpeg;base64,${buf4Photo.toString('base64')}';
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('   Q1 (Top-Left):', quadrantCheck.result.value.q1);
  console.log('   Q2 (Top-Right):', quadrantCheck.result.value.q2);
  console.log('   Q3 (Bottom-Left, Replaced):', quadrantCheck.result.value.q3);
  console.log('   Q4 (Bottom-Right):', quadrantCheck.result.value.q4);
  console.log('   All 4 Quadrants Distinct:', quadrantCheck.result.value.allDistinct);

  if (dim4Photo.result.value.width !== 1080 || dim4Photo.result.value.height !== 1350) {
    throw new Error(`Invalid dimensions: expected 1080x1350, got ${dim4Photo.result.value.width}x${dim4Photo.result.value.height}`);
  }
  if (!quadrantCheck.result.value.allDistinct) {
    throw new Error('FAILED: All 4 quadrants in 4-photo multi-grid are not distinct!');
  }

  console.log('\n================================================================');
  console.log('🎉 GENUINE USER WORKFLOW E2E: ALL ASSERTIONS PASSED (100%)');
  console.log('================================================================\n');

  cleanup();
  await sleep(600);

  return {
    success: true,
    scenario1: {
      file: '09_two_photo_grid_render.png',
      size: buf2Photo.length,
      hash: hash2Photo,
      dimensions: dim2Photo.result.value
    },
    scenario2: {
      file: '10_four_photo_grid_render.png',
      size: buf4Photo.length,
      hash: hash4Photo,
      dimensions: dim4Photo.result.value
    }
  };
}

runRealWorkflowE2E().catch(e => {
  console.error('[E2E ERROR]', e);
  cleanup();
  process.exit(1);
});
