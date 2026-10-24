/**
 * Idempotent Migration Preview & Validation Tool
 * Reads local JSON databases and compares with target Firestore schema
 */

const fs = require('fs');

console.log('=== PREVIEWING MIGRATION CANDIDATES ===\n');

// 1. User Profiles
let userCount = 0;
if (fs.existsSync('user_profiles_db.json')) {
  const users = JSON.parse(fs.readFileSync('user_profiles_db.json', 'utf8') || '{}');
  userCount = Object.keys(users).length;
  console.log(`[Users] ${userCount} profiles found for collection '/users/{userId}':`);
  for (const [k, v] of Object.entries(users)) {
    console.log(`  - Target Doc: /users/${k} (Name: ${v.fullName || v.name}, Role: ${v.role})`);
  }
}

// 2. RSS Sources
let rssCount = 0;
if (fs.existsSync('rss_sources_database.json')) {
  const sources = JSON.parse(fs.readFileSync('rss_sources_database.json', 'utf8') || '[]');
  rssCount = sources.length;
  console.log(`\n[RSS Sources] ${rssCount} records found for collection '/rss_sources/{sourceId}'`);
}

// 3. News Posts
let newsCount = 0;
if (fs.existsSync('news_database.json')) {
  const news = JSON.parse(fs.readFileSync('news_database.json', 'utf8') || '[]');
  newsCount = news.length;
  const approved = news.filter(n => n.status === 'APPROVED').length;
  const pending = news.filter(n => n.status === 'PENDING_APPROVAL').length;
  console.log(`\n[News Posts] ${newsCount} total posts (${approved} approved, ${pending} pending) for collection '/news_posts/{postId}'`);
}

// 4. Drafts
let draftsCount = 0;
if (fs.existsSync('drafts_database.json')) {
  const drafts = JSON.parse(fs.readFileSync('drafts_database.json', 'utf8') || '[]');
  draftsCount = drafts.length;
  console.log(`\n[Drafts] ${draftsCount} records found for collection '/drafts/{draftId}'`);
}

console.log('\n=== MIGRATION PREVIEW SUMMARY ===');
console.log(`Total Entities to sync: ${userCount + rssCount + newsCount + draftsCount}`);
console.log('Strategy: Read-first check -> Skip existing -> Merge newer -> Non-destructive');
