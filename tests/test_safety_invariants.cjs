const fs = require('fs');

console.log('🔍 Verifying Production Safety Invariants...');

// 1. Production Template Preservation & Test Frame Rejection
const db = JSON.parse(fs.readFileSync('dynamic_frames_db.json', 'utf8'));
const webDb = JSON.parse(fs.readFileSync('web_studio/dynamic_frames_db.json', 'utf8'));

const frame = db.find(f => f.id === 'df_1794406067554_albmw');
if (!frame) {
  throw new Error('FAILED: Missing production frame df_1794406067554_albmw in dynamic_frames_db.json');
}
if (frame.publicationStatus !== 'published' || frame.approvalStatus !== 'APPROVED') {
  throw new Error(`FAILED: Production frame status invalid: pub=${frame.publicationStatus}, app=${frame.approvalStatus}`);
}
if (frame.isTestFrame === true) {
  throw new Error('FAILED: Production frame marked with isTestFrame=true');
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
const frameTombstones = JSON.parse(fs.readFileSync('deleted_frames_tombstone.json', 'utf8'));
const webFrameTombstones = JSON.parse(fs.readFileSync('web_studio/deleted_frames_tombstone.json', 'utf8'));
if (frameTombstones.includes('df_1794406067554_albmw') || webFrameTombstones.includes('df_1794406067554_albmw')) {
  throw new Error('FAILED: Production frame df_1794406067554_albmw found in deleted_frames_tombstone.json!');
}

// 3. Protected Built-in Asset Libraries Verification
const protectedAssetIds = [
  'asset_1794132101671_u0g9s',
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

// 5. News Database Fallback Snapshots Non-Empty Verification
const rootNews = JSON.parse(fs.readFileSync('news_database.json', 'utf8'));
if (!Array.isArray(rootNews) || rootNews.length < 13) {
  throw new Error(`FAILED: root news_database.json has been truncated (found ${rootNews?.length || 0} items, expected >= 13)`);
}

const fallbackNewsFiles = [
  'web_studio/news_database.json',
  'public/news_database.json',
  'app/src/main/assets/news_studio/news_database.json'
];

for (const filePath of fallbackNewsFiles) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`FAILED: Missing news fallback file: ${filePath}`);
  }
  const newsList = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(newsList) || newsList.length < 5) {
    throw new Error(`FAILED: ${filePath} is truncated (found ${newsList?.length || 0} items, expected >= 5)`);
  }
  // Ensure pending news records retain their original approval status
  const pendingCount = newsList.filter(n => n.approvalStatus === 'PENDING_APPROVAL' || n.status === 'PENDING_APPROVAL').length;
  if (pendingCount < 4) {
    throw new Error(`FAILED: ${filePath} pending approval articles were modified or approved unexpectedly`);
  }
}

// 6. Android Application ID Check
const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
if (!gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"')) {
  throw new Error('FAILED: Android applicationId in app/build.gradle.kts has been altered!');
}

console.log('✅ Safety Invariants verified:');
console.log('   - Production frame intact (published & APPROVED, 0 tombstones, 0 test frames)');
console.log('   - All 7 protected built-in assets present, enabled, and absent from tombstones');
console.log('   - Root and Web Studio asset libraries & tombstones in 100% parity');
console.log('   - News fallback snapshots intact across Web Studio, public/, and Android assets');
console.log('   - Android applicationId preserved as com.aistudio.ainewsmaker.hzwptx');
