const path = require('path');
const Module = require('module');
process.env.PORT = process.env.PORT || '3000';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

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