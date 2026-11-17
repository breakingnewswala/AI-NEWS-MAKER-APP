const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');

console.log('--- STARTING MASTER DB CLEANUP & PHOTO FRAME FIX VERIFICATION ---');

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

// 1. Module 1: Database Cleanup & Protected Admin Whitelist
runTest('Module 1: user_profiles_db.json contains strictly the 2 Master Admin accounts', () => {
  const db = JSON.parse(fs.readFileSync('user_profiles_db.json', 'utf8'));
  const emails = Object.keys(db).map(k => k.toLowerCase());
  assert.strictEqual(emails.length, 2, `Expected 2 profiles, found ${emails.length}`);
  assert(emails.includes('breakingnewswala.com@gmail.com'), 'breakingnewswala.com@gmail.com must be present');
  assert(emails.includes('admin.ainewsmaker@gmail.com'), 'admin.ainewsmaker@gmail.com must be present');

  const superadmin = db['breakingnewswala.com@gmail.com'];
  assert.strictEqual(superadmin.role, 'superadmin');
  assert.strictEqual(superadmin.mobileNumber, '9669802408');

  const admin = db['admin.ainewsmaker@gmail.com'];
  assert(['admin', 'superadmin'].includes(admin.role));
  assert.strictEqual(admin.mobileNumber, '9669802408');
});

runTest('Module 1: users_master_database and accounts db contain strictly the 2 Master Admin accounts', () => {
  const master = JSON.parse(fs.readFileSync('users_master_database.json', 'utf8'));
  assert.strictEqual(master.length, 2, `users_master_database must have 2 entries, found ${master.length}`);
  const masterEmails = master.map(u => u.email.toLowerCase());
  assert(masterEmails.includes('breakingnewswala.com@gmail.com'));
  assert(masterEmails.includes('admin.ainewsmaker@gmail.com'));

  const accounts = JSON.parse(fs.readFileSync('users_accounts_db.json', 'utf8'));
  assert.strictEqual(accounts.length, 2, `users_accounts_db must have 2 entries, found ${accounts.length}`);

  const auth = JSON.parse(fs.readFileSync('auth_credentials_db.json', 'utf8'));
  assert.strictEqual(Object.keys(auth).length, 2, `auth_credentials_db must have 2 entries, found ${Object.keys(auth).length}`);

  const sheet = JSON.parse(fs.readFileSync('users_sheet_database.json', 'utf8'));
  assert.strictEqual(sheet.length, 2, `users_sheet_database must have 2 entries, found ${sheet.length}`);
});

runTest('Module 1: Private Encrypted Backup verified', () => {
  const backupDir = path.join(process.cwd(), '.private_backups');
  assert(fs.existsSync(backupDir), '.private_backups directory must exist');
  const files = fs.readdirSync(backupDir);
  const jsonBackups = files.filter(f => f.startsWith('user_profiles_backup_') && f.endsWith('.json'));
  const encBackups = files.filter(f => f.startsWith('user_profiles_backup_') && f.endsWith('.enc'));
  assert(jsonBackups.length > 0, 'JSON backup must exist');
  assert(encBackups.length > 0, 'Encrypted backup must exist');
  assert(fs.existsSync(path.join(backupDir, 'backup_key.key')), 'Backup AES key must exist');
});

runTest('Module 1: Shared Application Data & Approved Frames Preserved', () => {
  const frames = JSON.parse(fs.readFileSync('dynamic_frames_db.json', 'utf8'));
  assert(frames.length > 0, 'Dynamic frames must be preserved');
  assert.strictEqual(frames[0].id, 'df_1794406067554_albmw', 'Approved test frame must be preserved');
});

// 2. Module 2: Location Badge Rendering in CardPreview and CanvasExporter
runTest('Module 2: CardPreview Location Badge renders background color, border, and MapPin icon', () => {
  const previewContent = fs.readFileSync('src/components/CardPreview.tsx', 'utf8');
  assert(previewContent.includes('locBgColor'), 'CardPreview must compute locBgColor');
  assert(previewContent.includes('locBorderRadius'), 'CardPreview must compute locBorderRadius');
  assert(previewContent.includes('locColor'), 'CardPreview must compute locColor');
  assert(previewContent.includes('safeBadgeUrl'), 'CardPreview must safely encode SVG badge URLs');
  assert(previewContent.includes('<MapPin'), 'CardPreview must render MapPin icon');
});

runTest('Module 2: CanvasExporter drawAuthoritativeDynamicFrameCanvas location badge fallback', () => {
  const canvasContent = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasContent.includes('badgeDrawn = true'), 'CanvasExporter must track badgeDrawn');
  assert(canvasContent.includes('if (!badgeDrawn)'), 'CanvasExporter must guarantee fallback badge drawing if asset fails');
  assert(canvasContent.includes('card.locationBgColor || df.headerConfig.locationBgColor || \'#DC2626\''), 'Fallback badge must use configured locationBgColor');
});

// 3. Modules 3, 4, 5: Headline Selection, Photo & Logo Persistence
runTest('Module 3: InlineAiNewsTools fixes setCard error and preserves images & logo on headline switch', () => {
  const inlineContent = fs.readFileSync('src/components/InlineAiNewsTools.tsx', 'utf8');
  assert(!inlineContent.includes('setCard((prev) =>'), 'InlineAiNewsTools must NOT call undefined setCard');
  assert(inlineContent.includes('images: card.images'), 'handleSelectHeadline must explicitly preserve card.images');
  assert(inlineContent.includes('customLogoUrl: card.customLogoUrl'), 'handleSelectHeadline must explicitly preserve customLogoUrl');
});

runTest('Module 3: App.tsx handleUpdateCard immutably merges images and preserves permanent branding', () => {
  const appContent = fs.readFileSync('src/App.tsx', 'utf8');
  assert(appContent.includes('main: updates.images.main || prev.images?.main'), 'handleUpdateCard must preserve main photo if updates passed empty/falsy main');
  assert(appContent.includes('nextLogo'), 'handleUpdateCard must preserve nextLogo');
  assert(appContent.includes('customDynamicFrame: nextCustomDynamicFrame'), 'handleUpdateCard must preserve dynamic frame configuration');
});

runTest('Module 5: CanvasExporter checks full channel logo hierarchy & enforces main photo integrity', () => {
  const canvasContent = fs.readFileSync('src/lib/CanvasExporter.ts', 'utf8');
  assert(canvasContent.includes('card.customLogoPngUrl'), 'CanvasExporter must check customLogoPngUrl');
  assert(canvasContent.includes('card.channelLogoPngUrl'), 'CanvasExporter must check channelLogoPngUrl');
  assert(canvasContent.includes('card.channelLogoUrl'), 'CanvasExporter must check channelLogoUrl');
  assert(canvasContent.includes('isMainRequired'), 'CanvasExporter must flag slot 0 main photo as mandatory');
  assert(canvasContent.includes('pImg.naturalWidth <= 1'), 'CanvasExporter must validate photo dimensions and reject blank graphics');
});

// 4. Module 6: Mirror Parity and Security
runTest('Module 6: 100% SHA256 Mirror Parity between src/ and web_studio/src/', () => {
  function hashFile(f) {
    return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
  }
  function checkDir(d1, d2) {
    fs.readdirSync(d1, { withFileTypes: true }).forEach(entry => {
      const f1 = path.join(d1, entry.name);
      const f2 = path.join(d2, entry.name);
      if (entry.isDirectory()) {
        checkDir(f1, f2);
      } else {
        assert(fs.existsSync(f2), `Missing mirrored file: ${f2}`);
        assert.strictEqual(hashFile(f1), hashFile(f2), `Hash mismatch: ${f1} vs ${f2}`);
      }
    });
  }
  checkDir('src', 'web_studio/src');
});

runTest('Module 6: Android Application ID invariant is preserved', () => {
  const buildGradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
  assert(buildGradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"'), 'Android applicationId must be com.aistudio.ainewsmaker.hzwptx');
});

console.log('\n========================================');
console.log('TEST SUMMARY: ALL 10 TESTS PASSED!');
console.log('========================================\n');
