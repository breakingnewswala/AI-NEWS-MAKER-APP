const path = require('path');
process.env.PORT = process.env.PORT || '3000';

// Ensure module resolution searches both root and web_studio node_modules
if (Array.isArray(module.paths)) {
  module.paths.push(path.join(__dirname, 'node_modules'));
  module.paths.push(path.join(__dirname, 'web_studio', 'node_modules'));
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