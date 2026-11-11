const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const webStudioDir = path.join(rootDir, 'web_studio');
const targetNodeModules = path.join(webStudioDir, 'node_modules');
const rootNodeModules = path.join(rootDir, 'node_modules');

// 1. Synchronize root source files to web_studio so Cloud Build always compiles the latest code
try {
  const rootSrc = path.join(rootDir, 'src');
  const studioSrc = path.join(webStudioDir, 'src');
  if (fs.existsSync(rootSrc)) {
    fs.cpSync(rootSrc, studioSrc, { recursive: true, force: true });
  }
  const filesToSync = ['server.ts', 'whatsapp_integration.ts', 'index.html', 'asset_libraries_db.json', 'dynamic_frames_db.json', 'deleted_frames_tombstone.json'];
  for (const file of filesToSync) {
    const srcFile = path.join(rootDir, file);
    const destFile = path.join(webStudioDir, file);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  }
  console.log('🔄 prebuild: Synchronized root src/, server.ts, and whatsapp_integration.ts into web_studio/');
} catch (syncErr) {
  console.warn('⚠️ prebuild source sync warning:', syncErr.message);
}

// 2. Link or install web_studio/node_modules
if (!fs.existsSync(targetNodeModules) && fs.existsSync(rootNodeModules)) {
  try {
    const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(rootNodeModules, targetNodeModules, symlinkType);
    console.log('📦 prebuild: Linked web_studio/node_modules to root node_modules.');
  } catch (linkErr) {
    // Fallback to npm install below
  }
}

if (!fs.existsSync(targetNodeModules)) {
  try {
    console.log('📦 prebuild: Installing web_studio dependencies...');
    execSync('npm --prefix web_studio install --legacy-peer-deps --include=dev', { stdio: 'inherit' });
  } catch (err) {
    console.warn('⚠️ prebuild warning:', err.message);
  }
}

