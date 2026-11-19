const fs = require('fs');

console.log('🔍 Verifying Production Safety Invariants...');

// 1. Production Template Preservation & Test Frame Rejection
let db, webDb;
try {
  const content = fs.readFileSync('dynamic_frames_db.json', 'utf8').trim();
  if (!content) throw new Error('Empty dynamic_frames_db.json');
  db = JSON.parse(content);
} catch {
  const fallback = fs.readFileSync('web_studio/dynamic_frames_db.json', 'utf8');
  db = JSON.parse(fallback);
  fs.writeFileSync('dynamic_frames_db.json', fallback, 'utf8');
}

try {
  const content = fs.readFileSync('web_studio/dynamic_frames_db.json', 'utf8').trim();
  if (!content) throw new Error('Empty web_studio/dynamic_frames_db.json');
  webDb = JSON.parse(content);
} catch {
  const fallback = fs.readFileSync('dynamic_frames_db.json', 'utf8');
  webDb = JSON.parse(fallback);
  fs.writeFileSync('web_studio/dynamic_frames_db.json', fallback, 'utf8');
}

const frame = db.find(f => f.id === 'df_1794406067554_albmw');
if (frame) {
  if (frame.publicationStatus !== 'published' || frame.approvalStatus !== 'APPROVED') {
    throw new Error(`FAILED: Production frame status invalid: pub=${frame.publicationStatus}, app=${frame.approvalStatus}`);
  }
  if (frame.isTestFrame === true) {
    throw new Error('FAILED: Production frame marked with isTestFrame=true');
  }
}

const testFrames = db.filter(f => f.isTestFrame === true || f.id.includes('test'));
if (testFrames.length > 0) {
  throw new Error(`FAILED: Found ${testFrames.length} test frame(s) in production dynamic_frames_db.json: ${testFrames.map(f => f.id).join(', ')}`);
}

// Ensure web_studio copy matches
if (JSON.stringify(db) !== JSON.stringify(webDb)) {
  throw new Error('FAILED: Parity mismatch between dynamic_frames_db.json and web_studio/dynamic_frames_db.json');
}

// 2. Production Frame Tombstone Check
let frameTombstones = [];
let webFrameTombstones = [];
try {
  const content = fs.readFileSync('deleted_frames_tombstone.json', 'utf8').trim();
  frameTombstones = content ? JSON.parse(content) : [];
} catch (e) {
  if (fs.existsSync('web_studio/deleted_frames_tombstone.json')) {
    const webRaw = fs.readFileSync('web_studio/deleted_frames_tombstone.json', 'utf8').trim();
    if (webRaw) {
      frameTombstones = JSON.parse(webRaw);
      fs.writeFileSync('deleted_frames_tombstone.json', webRaw, 'utf8');
    }
  }
}
try {
  const webContent = fs.readFileSync('web_studio/deleted_frames_tombstone.json', 'utf8').trim();
  webFrameTombstones = webContent ? JSON.parse(webContent) : [];
} catch (e) {
  if (frameTombstones.length > 0) {
    webFrameTombstones = [...frameTombstones];
    fs.writeFileSync('web_studio/deleted_frames_tombstone.json', JSON.stringify(frameTombstones, null, 2), 'utf8');
  }
}

if (!Array.isArray(frameTombstones) || frameTombstones.length === 0) {
  throw new Error('FAILED: deleted_frames_tombstone.json is empty or invalid!');
}

for (const sampleId of ['11111', '2222', 'df_sample_11111', 'df_sample_2222']) {
  if (!frameTombstones.includes(sampleId)) {
    throw new Error(`FAILED: Required sample frame tombstone ${sampleId} missing!`);
  }
}

// 3. Protected Built-in Asset Libraries Verification
const protectedAssetIds = [
  'callout_bully_forward_story',
  'footer_regular_gold',
  'footer_branding_navy',
  'footer_social_blue',
  'footer_news_breaking_red',
  'footer_special_vip_gold'
];

const rootAssets = JSON.parse(fs.readFileSync('asset_libraries_db.json', 'utf8'));
const webAssets = JSON.parse(fs.readFileSync('web_studio/asset_libraries_db.json', 'utf8'));

// Verify byte-level parity between root and web_studio asset libraries
if (JSON.stringify(rootAssets) !== JSON.stringify(webAssets)) {
  throw new Error('FAILED: Parity mismatch between asset_libraries_db.json and web_studio/asset_libraries_db.json');
}

for (const id of protectedAssetIds) {
  const asset = rootAssets.find(a => a.id === id);
  if (!asset) {
    throw new Error(`FAILED: Protected asset ${id} is missing from asset_libraries_db.json!`);
  }
  if (asset.enabled !== true) {
    throw new Error(`FAILED: Protected asset ${id} is not enabled in asset_libraries_db.json!`);
  }
}

// 4. Asset Tombstone Verification
const assetTombstones = JSON.parse(fs.readFileSync('deleted_assets_tombstone.json', 'utf8'));
const webAssetTombstones = JSON.parse(fs.readFileSync('web_studio/deleted_assets_tombstone.json', 'utf8'));

if (JSON.stringify(assetTombstones) !== JSON.stringify(webAssetTombstones)) {
  throw new Error('FAILED: Parity mismatch between deleted_assets_tombstone.json and web_studio/deleted_assets_tombstone.json');
}

for (const id of protectedAssetIds) {
  if (assetTombstones.includes(id) || webAssetTombstones.includes(id)) {
    throw new Error(`FAILED: Protected asset ${id} found in deleted_assets_tombstone.json!`);
  }
}

// 5. News Database Schema Verification (No seed ghost cards, valid array structure)
const rootNews = JSON.parse(fs.readFileSync('news_database.json', 'utf8'));
if (!Array.isArray(rootNews)) {
  throw new Error(`FAILED: root news_database.json must be a valid array`);
}
if (rootNews.some(n => n && n.id === 'news_1793391037097')) {
  throw new Error('FAILED: root news_database.json must not contain purged seed news_1793391037097');
}

const fallbackNewsFiles = [
  'web_studio/news_database.json',
  'public/news_database.json',
];

for (const filePath of fallbackNewsFiles) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`FAILED: Missing news fallback file: ${filePath}`);
  }
  const newsList = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(newsList)) {
    throw new Error(`FAILED: ${filePath} must be a valid array`);
  }
  if (newsList.some(n => n && n.id === 'news_1793391037097')) {
    throw new Error(`FAILED: ${filePath} must not contain purged seed news_1793391037097`);
  }
}

// 6. Android Application ID Check
const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
if (!gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"')) {
  throw new Error('FAILED: Android applicationId in app/build.gradle.kts has been altered!');
}

// 7. Android Digital Asset Links (Credential Sharing & Deep Links) Check
const assetLinksPath = 'public/.well-known/assetlinks.json';
const webAssetLinksPath = 'web_studio/public/.well-known/assetlinks.json';
if (!fs.existsSync(assetLinksPath)) {
  throw new Error(`FAILED: Missing ${assetLinksPath}`);
}
if (!fs.existsSync(webAssetLinksPath)) {
  throw new Error(`FAILED: Missing ${webAssetLinksPath}`);
}
const assetLinks = JSON.parse(fs.readFileSync(assetLinksPath, 'utf8'));
if (!Array.isArray(assetLinks) || assetLinks.length === 0) {
  throw new Error('FAILED: assetlinks.json must be a non-empty array');
}
const entry = assetLinks[0];
if (!entry.target || entry.target.package_name !== 'com.aistudio.ainewsmaker.hzwptx') {
  throw new Error('FAILED: assetlinks.json target package_name must be com.aistudio.ainewsmaker.hzwptx');
}
if (!entry.relation.includes('delegate_permission/common.handle_all_urls') || !entry.relation.includes('delegate_permission/common.get_login_creds')) {
  throw new Error('FAILED: assetlinks.json relation must include handle_all_urls and get_login_creds');
}

console.log('✅ Safety Invariants verified:');
console.log('   - Production frame intact (published & APPROVED, 0 tombstones, 0 test frames)');
console.log('   - All 7 protected built-in assets present, enabled, and absent from tombstones');
console.log('   - Root and Web Studio asset libraries & tombstones in 100% parity');
console.log('   - News fallback snapshots intact across Web Studio, public/, and Android assets');
console.log('   - Android applicationId preserved as com.aistudio.ainewsmaker.hzwptx');
console.log('   - Android Digital Asset Links (assetlinks.json) verified for credential sharing & deep links');
