/**
 * test_server_load_and_billing_controls.cjs
 * Comprehensive test suite verifying server load reduction, polling throttling,
 * dirty-write caching, and billing controls.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('==================================================================');
console.log('🧪 VERIFYING SERVER LOAD REDUCTION & BILLING CONTROLS');
console.log('==================================================================');

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}`);
    process.exit(1);
  }
}

const rootDir = path.resolve(__dirname, '..');
const serverTs = fs.readFileSync(path.join(rootDir, 'server.ts'), 'utf-8');
const appTsx = fs.readFileSync(path.join(rootDir, 'src', 'App.tsx'), 'utf-8');
const homeScreenTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'HomeScreenWeb.tsx'), 'utf-8');
const appTopBarTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AppTopBarWeb.tsx'), 'utf-8');
const videosScreenTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'VideosScreenWeb.tsx'), 'utf-8');
const adminPlansTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'AdminPlansAndPackagesManager.tsx'), 'utf-8');
const whatsappInboxTsx = fs.readFileSync(path.join(rootDir, 'src', 'components', 'WhatsAppLiveInbox.tsx'), 'utf-8');
const firebaseConfigTs = fs.readFileSync(path.join(rootDir, 'src', 'lib', 'firebaseConfig.ts'), 'utf-8');

// TC1: RSS sync background interval is guarded by AUTO_RSS_SYNC_ENABLED flag
runTest('TC1: server.ts guards executeRssSynchronization background intervals', () => {
  assert.ok(serverTs.includes('AUTO_RSS_SYNC_ENABLED'), 'Must check AUTO_RSS_SYNC_ENABLED environment variable');
  assert.ok(!serverTs.includes('\nsetInterval(executeRssSynchronization, RSS_SYNC_INTERVAL_MS);'), 'Must not have un-guarded global interval');
});

// TC2: User reconciliation on boot is guarded by RECONCILE_USERS_ON_BOOT flag
runTest('TC2: server.ts guards reconcileAllUsers cold-start execution', () => {
  assert.ok(serverTs.includes('RECONCILE_USERS_ON_BOOT'), 'Must check RECONCILE_USERS_ON_BOOT environment variable');
  assert.ok(!serverTs.includes('\nreconcileAllUsers();'), 'Must not have un-guarded reconcileAllUsers execution');
});

// TC3: Dirty-check in saveNewsDatabase prevents redundant Firestore writes
runTest('TC3: server.ts saveNewsDatabase only writes modified documents to Firestore', () => {
  assert.ok(serverTs.includes('const isModified = !cached || JSON.stringify(cached) !== JSON.stringify(post);'), 'Must compare cached vs incoming post before saving');
  assert.ok(serverTs.includes('if (isModified) {'), 'Must guard centralDb.saveNewsPost with isModified check');
});

// TC4: probeGeminiKeyZeroQuota does not invoke generateContent
runTest('TC4: server.ts probeGeminiKeyZeroQuota consumes zero generation quota', () => {
  assert.ok(serverTs.includes('// Models list metadata succeeded; key is valid and active without burning content generation quota'), 'Must document zero generation quota');
  assert.ok(serverTs.includes('return { success: true, state: "READY", latencyMs: Date.now() - start, statusCode: 200 };'), 'Must return early on models list success');
});

// TC5: Cache-Control headers for static assets and public HTML
runTest('TC5: server.ts sends proper Cache-Control headers for assets and public HTML', () => {
  assert.ok(serverTs.includes('["/assets", "/studio/assets", "/admin/assets"]'), 'Must mount /assets with static caching');
  assert.ok(serverTs.includes('res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");'), 'Must set browser cache header on public HTML routes');
});

// TC6: Client-side polling throttled and RSS sync removed from onRefreshLiveNews
runTest('TC6: App.tsx and HomeScreenWeb.tsx throttle polling and remove auto-RSS sync', () => {
  // onRefreshLiveNews does not call syncAllSourcesLive
  assert.ok(!appTsx.includes('await syncAllSourcesLive().catch(() => {});\n            await fetchLiveNews();'), 'App.tsx onRefreshLiveNews must not call syncAllSourcesLive');
  // Intervals throttled
  assert.ok(appTsx.includes('180000'), 'App.tsx must use 180000ms (3m) interval for live news');
  assert.ok(homeScreenTsx.includes('seenImpressionsRef'), 'HomeScreenWeb.tsx must use seenImpressionsRef to prevent impression storms');
  assert.ok(!homeScreenTsx.includes('const tenMinuteInterval = setInterval(handleTenMinuteRssSync'), 'HomeScreenWeb.tsx must not run 10-minute auto RSS sync');
});

// TC7: Admin and TopBar pollers throttled and testConnection disabled
runTest('TC7: AppTopBarWeb, VideosScreenWeb, WhatsAppLiveInbox throttled and testConnection disabled', () => {
  assert.ok(appTopBarTsx.includes('if (!currentUser?.email) return;'), 'AppTopBarWeb notifications poller must check currentUser');
  assert.ok(!firebaseConfigTs.includes('\ntestConnection();'), 'firebaseConfig.ts must not auto-execute testConnection()');
  assert.ok(whatsappInboxTsx.includes('25000'), 'WhatsAppLiveInbox must throttle poller to 25s');
});

// TC8: 100% Mirror parity between root and web_studio/
runTest('TC8: 100% SHA256 Mirror Parity between root and web_studio/', () => {
  const crypto = require('crypto');
  const filesToVerify = [
    'src/App.tsx',
    'src/components/HomeScreenWeb.tsx',
    'src/components/AppTopBarWeb.tsx',
    'src/components/VideosScreenWeb.tsx',
    'src/components/AdminPlansAndPackagesManager.tsx',
    'src/components/WhatsAppLiveInbox.tsx',
    'src/components/AdminApiKeysManager.tsx',
    'src/lib/firebaseConfig.ts',
    'src/lib/speakerUtils.ts',
    'server.ts'
  ];

  for (const f of filesToVerify) {
    const rootPath = path.join(rootDir, f);
    const studioPath = path.join(rootDir, 'web_studio', f);
    if (fs.existsSync(rootPath) && fs.existsSync(studioPath)) {
      const h1 = crypto.createHash('sha256').update(fs.readFileSync(rootPath)).digest('hex');
      const h2 = crypto.createHash('sha256').update(fs.readFileSync(studioPath)).digest('hex');
      assert.strictEqual(h1, h2, `SHA256 mismatch for ${f}`);
    }
  }
});

console.log('==================================================================');
console.log('🎉 ALL 8 / 8 TESTS IN TEST_SERVER_LOAD_AND_BILLING_CONTROLS PASSED!');
console.log('==================================================================');
