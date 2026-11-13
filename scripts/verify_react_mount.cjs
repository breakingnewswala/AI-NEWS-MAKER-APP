const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 5064;
const CDP_PORT = 9227;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('🚀 Starting server on port ' + PORT + '...');
  const server = spawn('node', ['dist/server.cjs'], {
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: 'pipe'
  });

  server.stderr.on('data', d => console.error('[Server Err]:', d.toString().trim()));

  try {
    let serverReady = false;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
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

    if (!serverReady) throw new Error('Server not ready');
    console.log('✅ Server running.');

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const userDataDir = path.join(process.cwd(), '.tmp_chrome_verify');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

    console.log('🌐 Launching Chrome...');
    const chrome = spawn(chromePath, [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      `http://127.0.0.1:${PORT}/`
    ]);

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

    if (!wsUrl) throw new Error('Could not get Chrome WS URL');

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
    await sleep(4000);

    const evalRes = await sendCdp('Runtime.evaluate', {
      expression: 'document.body.innerText'
    });

    const bodyText = evalRes.result?.value || '';
    console.log('App Body Text snippet (first 300 chars):');
    console.log(bodyText.substring(0, 300));

    const hasError = bodyText.includes('एप्लिकेशन लोड करने में त्रुटि') || bodyText.includes('getDynamicFrameById is not defined');
    console.log('\nHas ErrorBoundary error?', hasError ? '❌ YES (ERROR)' : '✅ NO (CLEAN MOUNT)');

    const hasApp = bodyText.includes('AI News Maker') || bodyText.includes('स्टूडियो') || bodyText.includes('होम');
    console.log('Has Main App UI mounted?', hasApp ? '✅ YES' : '❌ NO');

    ws.close();
    chrome.kill();
    try { execSync(`taskkill /pid ${server.pid} /f /t`); } catch { server.kill(); }
  } catch (err) {
    console.error('Fatal:', err);
    try { execSync(`taskkill /pid ${server.pid} /f /t`); } catch { server.kill(); }
    process.exit(1);
  }
}

main();
