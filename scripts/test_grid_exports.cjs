const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 5068;
const CDP_PORT = 9231;
const OUTPUT_DIR = path.join(process.cwd(), '.tmp_test_grid_exports');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('🚀 Starting server on port ' + PORT + '...');
  const server = spawn('node', ['dist/server.cjs'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: 'pipe'
  });

  try {
    await sleep(2000);
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

    const userDataDir = path.join(process.cwd(), '.tmp_chrome_grid');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    console.log('🌐 Launching Chrome at:', chromePath);
    const chromeArgs = [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars'
    ];
    if (process.platform !== 'win32') {
      chromeArgs.push('--disable-dev-shm-usage', '--disable-setuid-sandbox');
    }
    chromeArgs.push(`http://127.0.0.1:${PORT}/`);
    const chrome = spawn(chromePath, chromeArgs);

    let wsUrl = '';
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      try {
        const json = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => resolve(JSON.parse(body)));
          }).on('error', reject);
        });
        if (json && json.length > 0) {
          wsUrl = json[0].webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    const WebSocket = require('ws');
    const ws = new WebSocket(wsUrl);
    await new Promise(r => ws.on('open', r));

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
    
    // Wait for window.__CANVAS_EXPORTER__
    let exporterReady = false;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const chk = await sendCdp('Runtime.evaluate', {
        expression: 'typeof window.__CANVAS_EXPORTER__ !== "undefined" && typeof window.__CANVAS_EXPORTER__.renderCardToCanvas === "function"'
      });
      if (chk.result?.value === true) {
        exporterReady = true;
        break;
      }
    }
    console.log('Is CanvasExporter ready?', exporterReady ? '✅ YES' : '❌ NO');
    if (!exporterReady) throw new Error('CanvasExporter did not load on window');

    // High-contrast, visually distinct photos
    const bluePhotoSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="%232563eb"/><rect x="20" y="20" width="560" height="560" fill="none" stroke="white" stroke-width="12"/><text x="50%" y="45%" fill="white" font-size="52" font-weight="900" font-family="sans-serif" text-anchor="middle">SLOT 1</text><text x="50%" y="62%" fill="%23bfdbfe" font-size="36" font-family="sans-serif" text-anchor="middle">BLUE PHOTO</text></svg>';
    const greenPhotoSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="%23059669"/><rect x="20" y="20" width="560" height="560" fill="none" stroke="white" stroke-width="12"/><text x="50%" y="45%" fill="white" font-size="52" font-weight="900" font-family="sans-serif" text-anchor="middle">SLOT 2</text><text x="50%" y="62%" fill="%23a7f3d0" font-size="36" font-family="sans-serif" text-anchor="middle">GREEN PHOTO</text></svg>';

    const redPhotoSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23dc2626"/><rect x="15" y="15" width="570" height="370" fill="none" stroke="white" stroke-width="10"/><text x="50%" y="55%" fill="white" font-size="44" font-weight="900" font-family="sans-serif" text-anchor="middle">SLOT 1 (RED)</text></svg>';
    const amberPhotoSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23d97706"/><rect x="15" y="15" width="570" height="370" fill="none" stroke="white" stroke-width="10"/><text x="50%" y="55%" fill="white" font-size="44" font-weight="900" font-family="sans-serif" text-anchor="middle">SLOT 2 (AMBER)</text></svg>';
    const emeraldPhotoSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%2316a34a"/><rect x="15" y="15" width="570" height="370" fill="none" stroke="white" stroke-width="10"/><text x="50%" y="55%" fill="white" font-size="44" font-weight="900" font-family="sans-serif" text-anchor="middle">SLOT 3 (GREEN)</text></svg>';
    const purplePhotoSvg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%239333ea"/><rect x="15" y="15" width="570" height="370" fill="none" stroke="white" stroke-width="10"/><text x="50%" y="55%" fill="white" font-size="44" font-weight="900" font-family="sans-serif" text-anchor="middle">SLOT 4 (PURPLE)</text></svg>';

    // Test 1: Two-Photo Grid Export (standard template double-h or dynamic frame with transparent background)
    console.log('Rendering Two-Photo Grid...');
    const twoGridEval = await sendCdp('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          try {
            const exp = window.__CANVAS_EXPORTER__;
            const card = {
              id: 'test_grid_2',
              frameDesign: 'graphic_001',
              layout: 'double-h',
              headline: 'दोहरी फोटो ग्रिड परीक्षण — दोनों फोटो स्लॉट स्पष्ट रूप से दृश्यमान',
              category: 'विशेष कवरेज',
              location: 'भोपाल',
              showDate: true,
              showLocation: true,
              images: {
                main: '${bluePhotoSvg}',
                second: '${greenPhotoSvg}'
              },
              footerBgColor: '#FACC15',
              footerTextColor: '#000000'
            };
            const canvas = await exp.renderCardToCanvas(card);
            return {
              success: true,
              width: canvas.width,
              height: canvas.height,
              pngBase64: canvas.toDataURL('image/png').split(',')[1]
            };
          } catch (e) {
            return { success: false, error: e.message, stack: e.stack };
          }
        })()
      `,
      returnByValue: true
    });

    const twoRes = twoGridEval.result?.value;
    console.log('Two Grid Result:', twoRes?.success, twoRes?.width, twoRes?.height, twoRes?.error);
    if (!twoRes?.success) throw new Error('Two-Photo Grid Export failed: ' + twoRes?.error);
    if (twoRes?.success && twoRes.pngBase64) {
      const buf = Buffer.from(twoRes.pngBase64, 'base64');
      fs.writeFileSync(path.join(OUTPUT_DIR, '09_two_photo_grid_render.png'), buf);
      console.log('✅ Saved test 09_two_photo_grid_render.png (' + buf.length + ' bytes)');
    }

    // Test 2: Four-Photo Grid Export (standard template grid-4)
    console.log('Rendering Four-Photo Grid...');
    const fourGridEval = await sendCdp('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          try {
            const exp = window.__CANVAS_EXPORTER__;
            const card = {
              id: 'test_grid_4',
              frameDesign: 'graphic_001',
              layout: 'grid-4',
              headline: 'चार-फोटो मल्टी ग्रिड परीक्षण — चारों स्लॉट (S1, S2, S3, S4) पूर्णतया स्वतंत्र',
              category: 'मल्टी-ग्रिड समाचार',
              location: 'इंदौर',
              showDate: true,
              showLocation: true,
              images: {
                main: '${redPhotoSvg}',
                second: '${amberPhotoSvg}',
                third: '${emeraldPhotoSvg}',
                fourth: '${purplePhotoSvg}'
              },
              footerBgColor: '#FACC15',
              footerTextColor: '#000000'
            };
            const canvas = await exp.renderCardToCanvas(card);
            return {
              success: true,
              width: canvas.width,
              height: canvas.height,
              pngBase64: canvas.toDataURL('image/png').split(',')[1]
            };
          } catch (e) {
            return { success: false, error: e.message, stack: e.stack };
          }
        })()
      `,
      returnByValue: true
    });

    const fourRes = fourGridEval.result?.value;
    console.log('Four Grid Result:', fourRes?.success, fourRes?.width, fourRes?.height, fourRes?.error);
    if (!fourRes?.success) throw new Error('Four-Photo Grid Export failed: ' + fourRes?.error);
    if (fourRes?.success && fourRes.pngBase64) {
      const buf = Buffer.from(fourRes.pngBase64, 'base64');
      fs.writeFileSync(path.join(OUTPUT_DIR, '10_four_photo_grid_render.png'), buf);
      console.log('✅ Saved test 10_four_photo_grid_render.png (' + buf.length + ' bytes)');
    }

    ws.close();
    chrome.kill();
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${server.pid} /f /t`);
      } else {
        server.kill('SIGKILL');
      }
    } catch { server.kill(); }
    console.log('🎉 Canvas Multi-Grid exports passed successfully!');
  } catch (err) {
    console.error('Fatal:', err);
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /pid ${server.pid} /f /t`);
      } else {
        server.kill('SIGKILL');
      }
    } catch { server.kill(); }
    process.exit(1);
  }
}

main();
