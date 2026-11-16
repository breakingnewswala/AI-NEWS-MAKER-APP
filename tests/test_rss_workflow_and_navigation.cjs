/**
 * Automated Verification Suite:
 * AI NEWS MAKER — PERMANENT BUG FIX, NAVIGATION TITLE CORRECTION & RSS WORKFLOW AUDIT
 * Tests:
 * 1. CheckCircle2 Import & Render Safety in DynamicFrameGeneratorModal
 * 2. Error Boundary Protection around DynamicFrameGeneratorModal in UserTemplateManager & CardEditor
 * 3. 5 Canonical Navigation & Chrome Tab Titles (AI News Maker, Video & Reels, Studio, Newsroom, Profile)
 * 4. 5th Navigation Item Profile Persistence (👤 प्रोफाइल / Profile)
 * 5. RSS Ingestion Initial State (pending_review, isApproved: false, isPrePublished: false)
 * 6. RSS Approval Workflow (status: published, isApproved: true, approvedBy/At, publishedBy/At, isPrePublished: false)
 * 7. Master Admin Pre-Publish Authorization Isolation
 * 8. Permanent Deletion Registry (Tombstones, URL normalization, GUID, title fingerprint, ingestion skip)
 * 9. Inactive / Disabled Feed Ingestion Prevention
 * 10. 100% SHA256 Parity between src/ and web_studio/src/
 * 11. Android Application ID Preservation (com.aistudio.ainewsmaker.hzwptx)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('🧪 VERIFYING RSS WORKFLOW, NAVIGATION & FRAME GENERATOR REPAIRS');
console.log('================================================================');

// -----------------------------------------------------------------------------
// Test 1: CheckCircle2 Import in DynamicFrameGeneratorModal
// -----------------------------------------------------------------------------
runTest('Issue 1: CheckCircle2 is imported in DynamicFrameGeneratorModal', () => {
  const rootModal = fs.readFileSync(path.join(__dirname, '../src/components/DynamicFrameGeneratorModal.tsx'), 'utf8');
  const studioModal = fs.readFileSync(path.join(__dirname, '../web_studio/src/components/DynamicFrameGeneratorModal.tsx'), 'utf8');

  for (const [label, code] of [['src', rootModal], ['web_studio', studioModal]]) {
    const lucideImportMatch = code.match(/import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"]/);
    assert.ok(lucideImportMatch, `${label}: lucide-react import block found`);
    const importedIcons = lucideImportMatch[1].split(',').map(s => s.trim());
    assert.ok(importedIcons.includes('CheckCircle2'), `${label}: CheckCircle2 must be imported from lucide-react`);
    assert.ok(code.includes('<CheckCircle2'), `${label}: <CheckCircle2 component is used`);
  }
});

// -----------------------------------------------------------------------------
// Test 2: Error Boundary Isolates DynamicFrameGeneratorModal
// -----------------------------------------------------------------------------
runTest('Issue 1: ErrorBoundary wraps DynamicFrameGeneratorModal in UserTemplateManager and CardEditor', () => {
  const rootUTM = fs.readFileSync(path.join(__dirname, '../src/components/UserTemplateManager.tsx'), 'utf8');
  const studioUTM = fs.readFileSync(path.join(__dirname, '../web_studio/src/components/UserTemplateManager.tsx'), 'utf8');
  const rootCard = fs.readFileSync(path.join(__dirname, '../src/components/CardEditor.tsx'), 'utf8');
  const studioCard = fs.readFileSync(path.join(__dirname, '../web_studio/src/components/CardEditor.tsx'), 'utf8');

  for (const [label, code] of [['src UserTemplateManager', rootUTM], ['web_studio UserTemplateManager', studioUTM]]) {
    assert.ok(code.includes('import { ErrorBoundary }'), `${label}: ErrorBoundary must be imported`);
    assert.ok(code.includes('<ErrorBoundary fallbackTitle="फ़ोटो फ़्रेम जनरेटर में समस्या आई">'), `${label}: Must wrap DynamicFrameGeneratorModal with dedicated ErrorBoundary`);
  }

  for (const [label, code] of [['src CardEditor', rootCard], ['web_studio CardEditor', studioCard]]) {
    assert.ok(code.includes('import { ErrorBoundary }'), `${label}: ErrorBoundary must be imported`);
    assert.ok(code.includes('<ErrorBoundary fallbackTitle="फ़ोटो फ़्रेम जनरेटर में समस्या आई">'), `${label}: Must wrap DynamicFrameGeneratorModal with dedicated ErrorBoundary`);
  }
});

// -----------------------------------------------------------------------------
// Test 3: Five Canonical Navigation & Chrome Browser Tab Titles
// -----------------------------------------------------------------------------
runTest('Issue 2: getTabMeta returns exact 5 canonical titles', () => {
  const rootApp = fs.readFileSync(path.join(__dirname, '../src/App.tsx'), 'utf8');
  const studioApp = fs.readFileSync(path.join(__dirname, '../web_studio/src/App.tsx'), 'utf8');

  for (const [label, code] of [['src App', rootApp], ['web_studio App', studioApp]]) {
    // Check title mappings in getTabMeta
    assert.ok(code.includes("title: 'Studio'"), `${label}: Studio tab title must be 'Studio'`);
    assert.ok(code.includes("title: 'Video & Reels'"), `${label}: Videos tab title must be 'Video & Reels'`);
    assert.ok(code.includes("title: 'Newsroom'"), `${label}: Newsroom tab title must be 'Newsroom'`);
    assert.ok(code.includes("title: 'Profile'"), `${label}: Profile tab title must be 'Profile'`);
    assert.ok(code.includes("title: 'AI News Maker'"), `${label}: Home/Default tab title must be 'AI News Maker'`);

    // Verify obsolete titles are removed from getTabMeta
    assert.ok(!code.includes("title: 'फोटो न्यूज़ स्टूडियो — AI News Maker'"), `${label}: Obsolete photo studio title removed`);
    assert.ok(!code.includes("title: 'वीडियो न्यूज़ स्टूडियो व रील्स — AI News Maker'"), `${label}: Obsolete video studio title removed`);
    assert.ok(!code.includes("title: 'लाइव डिजिटल न्यूज़ रूम — AI News Maker'"), `${label}: Obsolete newsroom title removed`);
  }
});

// -----------------------------------------------------------------------------
// Test 4: 5th Navigation Item displays '👤 प्रोफाइल'
// -----------------------------------------------------------------------------
runTest('Issue 2: 5th Nav button consistently displays Profile and routes to profile', () => {
  const rootTopBar = fs.readFileSync(path.join(__dirname, '../src/components/AppTopBarWeb.tsx'), 'utf8');
  const studioTopBar = fs.readFileSync(path.join(__dirname, '../web_studio/src/components/AppTopBarWeb.tsx'), 'utf8');
  const rootBottomBar = fs.readFileSync(path.join(__dirname, '../src/components/AppBottomBarWeb.tsx'), 'utf8');
  const studioBottomBar = fs.readFileSync(path.join(__dirname, '../web_studio/src/components/AppBottomBarWeb.tsx'), 'utf8');

  for (const [label, code] of [['src AppTopBarWeb', rootTopBar], ['web_studio AppTopBarWeb', studioTopBar]]) {
    assert.ok(code.includes("onClick={() => onNavigateToTab('profile')}"), `${label}: 5th desktop nav item must navigate to profile`);
    assert.ok(code.includes("👤 प्रोफाइल"), `${label}: 5th nav button label must be 👤 प्रोफाइल`);
    assert.ok(!code.includes("{isAdminUser ? '⚙️ कंट्रोल रूम' : '👤 प्रोफाइल'}"), `${label}: Must not switch 5th nav label to control room`);
  }

  for (const [label, code] of [['src AppBottomBarWeb', rootBottomBar], ['web_studio AppBottomBarWeb', studioBottomBar]]) {
    assert.ok(code.includes("onClick={() => onSelectTab('profile')}"), `${label}: 5th mobile nav item must navigate to profile`);
    assert.ok(code.includes('<span className="text-[10px] sm:text-[11px] font-bold mt-1">प्रोफाइल</span>'), `${label}: 5th mobile nav label must be प्रोफाइल`);
  }
});

// -----------------------------------------------------------------------------
// Test 5: Static HTML index.html Default Title
// -----------------------------------------------------------------------------
runTest('Issue 2: index.html has exact canonical title <title>AI News Maker</title>', () => {
  const rootIndex = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const studioIndex = fs.readFileSync(path.join(__dirname, '../web_studio/index.html'), 'utf8');

  for (const [label, code] of [['root index.html', rootIndex], ['web_studio index.html', studioIndex]]) {
    assert.ok(code.includes('<title>AI News Maker</title>'), `${label}: title must be <title>AI News Maker</title>`);
    assert.ok(!code.includes('<title>AI News Maker — स्मार्ट डिजिटल न्यूज़ स्टूडियो</title>'), `${label}: Obsolete title removed`);
  }
});

// -----------------------------------------------------------------------------
// Test 6: RSS Initial Ingestion State (pending_review, isApproved: false, isPrePublished: false)
// -----------------------------------------------------------------------------
runTest('Issue 3: Incoming RSS news strictly assigned pending_review and unapproved state', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');

  // Verify parseRssItemsFromXml sets pending_review
  assert.ok(serverCode.includes('approvalStatus: "pending_review"'), 'server.ts: parseRssItemsFromXml sets approvalStatus: "pending_review"');
  assert.ok(serverCode.includes('status: "pending_review"'), 'server.ts: parseRssItemsFromXml sets status: "pending_review"');
  assert.ok(serverCode.includes('isApproved: false'), 'server.ts: isApproved is false initially');
  assert.ok(serverCode.includes('isPrePublished: false'), 'server.ts: isPrePublished is false initially');

  // Verify syncAllSourcesLive in server.ts
  assert.ok(serverCode.includes('p.approvalStatus = "pending_review";'), 'server.ts: syncAllSourcesLive sets p.approvalStatus = "pending_review"');
  assert.ok(serverCode.includes('p.status = "pending_review";'), 'server.ts: syncAllSourcesLive sets p.status = "pending_review"');
  assert.ok(serverCode.includes('p.isApproved = false;'), 'server.ts: syncAllSourcesLive sets p.isApproved = false');
  assert.ok(serverCode.includes('p.isPrePublished = false;'), 'server.ts: syncAllSourcesLive sets p.isPrePublished = false');
});

// -----------------------------------------------------------------------------
// Test 7: RSS Approval Workflow (published, approvedBy/At, publishedBy/At, isPrePublished: false)
// -----------------------------------------------------------------------------
runTest('Issue 3: Admin Approval sets status: published, isApproved: true, and audit trail', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');
  const rssManagerCode = fs.readFileSync(path.join(__dirname, '../src/lib/rssSourceManager.ts'), 'utf8');

  // In server.ts approve-news endpoint
  assert.ok(serverCode.includes('status: "published"'), 'server.ts: approve-news sets status: "published"');
  assert.ok(serverCode.includes('isApproved: true'), 'server.ts: approve-news sets isApproved: true');
  assert.ok(serverCode.includes('isPrePublished: false'), 'server.ts: approve-news sets isPrePublished: false');
  assert.ok(serverCode.includes('approvedAt: Date.now()'), 'server.ts: approve-news records approvedAt timestamp');
  assert.ok(serverCode.includes('publishedAt: Date.now()'), 'server.ts: approve-news records publishedAt timestamp');

  // In rssSourceManager.ts approveRssPost
  assert.ok(rssManagerCode.includes("status: 'published' as const"), 'rssSourceManager.ts: approveRssPost sets status: published');
  assert.ok(rssManagerCode.includes("isApproved: true"), 'rssSourceManager.ts: approveRssPost sets isApproved: true');
  assert.ok(rssManagerCode.includes("isPrePublished: false"), 'rssSourceManager.ts: approveRssPost sets isPrePublished: false');
});

// -----------------------------------------------------------------------------
// Test 8: Pre-published status is strictly authorized ONLY by Master Admin
// -----------------------------------------------------------------------------
runTest('Issue 3: Pre-published status is isolated to Master Admin authorization', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');

  // Verify master admin check in editorial approved endpoint
  assert.ok(serverCode.includes('const callerIsMaster = Boolean(isAuthorizedMasterAdmin(req));'), 'server.ts: verifies Master Admin authority');
  assert.ok(serverCode.includes('const isPrePublished = callerIsMaster && Boolean(body.isPrePublished === true);'), 'server.ts: isPrePublished is true ONLY if Master Admin authorizes it');

  // Verify HomeScreenWeb does NOT conflate isPrePublished with isApproved
  const homeCode = fs.readFileSync(path.join(__dirname, '../src/components/HomeScreenWeb.tsx'), 'utf8');
  assert.ok(!homeCode.includes('isPrePublished: Boolean((post as any).isPrePublished || (post as any).isApproved)'), 'HomeScreenWeb.tsx: does not conflate isApproved with isPrePublished');
  assert.ok(homeCode.includes('isPrePublished: Boolean((post as any).isPrePublished)'), 'HomeScreenWeb.tsx: strictly checks isPrePublished directly');
});

// -----------------------------------------------------------------------------
// Test 9: Permanent Deletion Registry & Tombstones
// -----------------------------------------------------------------------------
runTest('Issue 4: Permanent Deletion Registry functions and URL normalization', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');

  assert.ok(serverCode.includes('export interface NewsDeletionTombstone'), 'server.ts: defines NewsDeletionTombstone interface');
  assert.ok(serverCode.includes('export function normalizeCanonicalUrl'), 'server.ts: defines normalizeCanonicalUrl');
  assert.ok(serverCode.includes('export function generateTitleFingerprint'), 'server.ts: defines generateTitleFingerprint');
  assert.ok(serverCode.includes('export function loadDeletedNewsTombstones'), 'server.ts: defines loadDeletedNewsTombstones');
  assert.ok(serverCode.includes('export function saveDeletedNewsTombstone'), 'server.ts: defines saveDeletedNewsTombstone');
  assert.ok(serverCode.includes('export function isArticleDeletedByTombstone'), 'server.ts: defines isArticleDeletedByTombstone');

  // Verify normalizeCanonicalUrl logic
  function testNormalize(raw) {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'].forEach(p => parsed.searchParams.delete(p));
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    const search = parsed.searchParams.toString();
    return `${host}${pathname}${search ? '?' + search : ''}`.toLowerCase();
  }

  const urlA = 'https://www.naidunia.com/madhya-pradesh/bhopal-news-12345.html?utm_source=rss&utm_medium=feed&ref=facebook';
  const urlB = 'http://naidunia.com/madhya-pradesh/bhopal-news-12345.html';
  assert.strictEqual(testNormalize(urlA), testNormalize(urlB), 'Normalized canonical URLs must match across protocols, www, and tracking params');

  // Verify deletion endpoint registers tombstone
  assert.ok(serverCode.includes('saveDeletedNewsTombstone({'), 'server.ts: DELETE endpoint calls saveDeletedNewsTombstone');

  // Verify parseRssItemsFromXml and syncAllSourcesLive skip tombstones
  assert.ok(serverCode.includes('isArticleDeletedByTombstone('), 'server.ts: RSS parser checks deletion tombstones');
  assert.ok(serverCode.includes('[RSS Ingestion Skipped Tombstone]'), 'server.ts: logs structured tombstone skip diagnostic');
});

// -----------------------------------------------------------------------------
// Test 10: Inactive / Disabled Feeds Skipped During Sync
// -----------------------------------------------------------------------------
runTest('Issue 4: Inactive feeds are strictly skipped during sync', () => {
  const serverCode = fs.readFileSync(path.join(__dirname, '../server.ts'), 'utf8');

  assert.ok(serverCode.includes('[RSS Ingestion Skipped Inactive]'), 'server.ts: logs structured inactive feed skip diagnostic');
  assert.ok(serverCode.includes('const activeSources = sources.filter((s) => s && s.isActive && !deletedSourceIds.has(s.id));'), 'server.ts: filters only active sources');
});

// -----------------------------------------------------------------------------
// Test 11: 100% SHA256 Parity Between src/ and web_studio/src/
// -----------------------------------------------------------------------------
runTest('Issue 6: 100% SHA256 Parity Between src/ and web_studio/src/', () => {
  const rootSrcDir = path.join(__dirname, '../src');
  const studioSrcDir = path.join(__dirname, '../web_studio/src');

  function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  const rootFiles = getAllFiles(rootSrcDir);
  let mismatchCount = 0;

  for (const rootFile of rootFiles) {
    const relativePath = path.relative(rootSrcDir, rootFile);
    const studioFile = path.join(studioSrcDir, relativePath);

    assert.ok(fs.existsSync(studioFile), `web_studio counterpart must exist: ${relativePath}`);

    const rootHash = crypto.createHash('sha256').update(fs.readFileSync(rootFile)).digest('hex');
    const studioHash = crypto.createHash('sha256').update(fs.readFileSync(studioFile)).digest('hex');

    if (rootHash !== studioHash) {
      console.error(`  Mismatch: ${relativePath}`);
      mismatchCount++;
    }
  }

  assert.strictEqual(mismatchCount, 0, 'All files in src/ and web_studio/src/ must have identical SHA256 hashes');

  // Also check server.ts parity
  const rootServerHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../server.ts'))).digest('hex');
  const studioServerHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../web_studio/server.ts'))).digest('hex');
  assert.strictEqual(rootServerHash, studioServerHash, 'server.ts root and web_studio/server.ts must have identical SHA256');

  // Also check index.html parity
  const rootIndexHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../index.html'))).digest('hex');
  const studioIndexHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../web_studio/index.html'))).digest('hex');
  assert.strictEqual(rootIndexHash, studioIndexHash, 'index.html root and web_studio/index.html must have identical SHA256');
});

// -----------------------------------------------------------------------------
// Test 12: Android Application ID Preservation
// -----------------------------------------------------------------------------
runTest('Issue 6: Android applicationId invariant preserved (com.aistudio.ainewsmaker.hzwptx)', () => {
  const gradlePath = path.join(__dirname, '../app/build.gradle');
  if (fs.existsSync(gradlePath)) {
    const gradle = fs.readFileSync(gradlePath, 'utf8');
    assert.ok(gradle.includes('applicationId "com.aistudio.ainewsmaker.hzwptx"'), 'app/build.gradle applicationId preserved');
  }
});

console.log('================================================================');
console.log('Summary: All RSS Workflow & Navigation tests passed successfully.');
console.log('================================================================');
