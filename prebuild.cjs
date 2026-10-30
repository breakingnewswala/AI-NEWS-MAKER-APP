const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const webStudioDir = path.join(__dirname, 'web_studio');
const targetNodeModules = path.join(webStudioDir, 'node_modules');

if (!fs.existsSync(targetNodeModules)) {
  try {
    console.log('📦 prebuild: Installing web_studio dependencies...');
    execSync('npm --prefix web_studio install --legacy-peer-deps --include=dev', { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ prebuild warning:', err.message);
  }
}
