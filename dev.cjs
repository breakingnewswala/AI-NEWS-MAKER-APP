const fs = require('fs');
const path = require('path');
const Module = require('module');
process.env.PORT = process.env.PORT || process.env.DEFAULT_APP_PORT || (process.env.NGINX_PORT && process.env.PORT === process.env.NGINX_PORT ? '3000' : '3000');
process.env.NODE_ENV = 'production';

const pidFile = path.join(__dirname, '.dev.pid');
try {
  if (process.env.PORT === '3000') {
    if (fs.existsSync(pidFile)) {
      const existingPid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
      if (existingPid && existingPid !== process.pid) {
        try {
          process.kill(existingPid, 0);
          console.log(`[dev.cjs] Process ${existingPid} is already running. Exiting.`);
          process.exit(0);
        } catch (_) {}
      }
    }
    fs.writeFileSync(pidFile, String(process.pid), 'utf8');
  }
} catch (_) {}

// Ensure module resolution searches both root and web_studio node_modules
const extraPaths = [
  path.join(__dirname, 'node_modules'),
  path.join(__dirname, 'web_studio', 'node_modules')
];
process.env.NODE_PATH = extraPaths.join(path.delimiter);
if (Module._initPaths) {
  Module._initPaths();
}

if (Array.isArray(module.paths)) {
  module.paths.push(...extraPaths);
}

try {
  require.resolve('express');
} catch (e) {
  try {
    const { execSync } = require('child_process');
    console.log('[dev.cjs] Installing missing dependencies...');
    execSync('npm install --prefer-offline --no-audit', { cwd: __dirname, stdio: 'inherit' });
  } catch (installErr) {
    console.error('[dev.cjs] Failed to auto-install dependencies:', installErr.message);
  }
}

require('./server.cjs');