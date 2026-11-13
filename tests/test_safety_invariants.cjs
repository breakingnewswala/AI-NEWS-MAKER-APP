const fs = require('fs');

console.log('🔍 Verifying Production Safety Invariants...');

// 1. Production Template Preservation
const db = JSON.parse(fs.readFileSync('dynamic_frames_db.json', 'utf8'));
const frame = db.find(f => f.id === 'df_1794406067554_albmw');
if (!frame) {
  throw new Error('FAILED: Missing production frame df_1794406067554_albmw in dynamic_frames_db.json');
}
if (frame.publicationStatus !== 'published' || frame.approvalStatus !== 'APPROVED') {
  throw new Error(`FAILED: Production frame status invalid: pub=${frame.publicationStatus}, app=${frame.approvalStatus}`);
}

// 2. Tombstone Check
const tombstones = JSON.parse(fs.readFileSync('deleted_frames_tombstone.json', 'utf8'));
if (tombstones.includes('df_1794406067554_albmw')) {
  throw new Error('FAILED: Production frame df_1794406067554_albmw found in deleted_frames_tombstone.json!');
}

// 3. Android Application ID Check
const gradle = fs.readFileSync('app/build.gradle.kts', 'utf8');
if (!gradle.includes('applicationId = "com.aistudio.ainewsmaker.hzwptx"')) {
  throw new Error('FAILED: Android applicationId in app/build.gradle.kts has been altered!');
}

console.log('✅ Safety Invariants verified: production frame intact (published & APPROVED), absent from tombstones, Android applicationId preserved.');
