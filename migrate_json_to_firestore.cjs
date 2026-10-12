/**
 * Repeat-Safe, Idempotent JSON-to-Firestore Migration Script
 * Target Project: ai-news-maker-app
 * Target Database: ai-studio-ainewsmakerapp-dc75889d-179d-4f39-b479-76519c8874bd
 */
const fs = require('fs');
const path = require('path');
const adapter = require('./web_studio/server_firestore_adapter.cjs');

// Safety: Perform reliable source file backup before any operation
function backupSourceDatabases() {
  const timestamp = Date.now();
  const backupDir = path.resolve(process.cwd(), `backups_phase5/migration_pre_backup_${timestamp}`);
  
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const filesToBackup = [
      'user_profiles_db.json',
      'news_database.json',
      'rss_sources_database.json',
      'drafts_database.json',
      'account_deletion_requests.json'
    ];

    let copied = 0;
    for (const f of filesToBackup) {
      if (fs.existsSync(f)) {
        fs.copyFileSync(f, path.join(backupDir, f));
        copied++;
      }
    }
    console.log(`[Backup] Successfully created snapshot of ${copied} database files in ${backupDir}`);
    return { success: true, backupDir, copied };
  } catch (err) {
    console.error('[Backup Failed] Aborting migration:', err.message);
    return { success: false, error: err.message };
  }
}

async function migrate({ dryRun = true } = {}) {
  console.log(`=== Starting JSON-to-Firestore Migration (DRY_RUN=${dryRun}) ===`);
  console.log('Project:', adapter.PROJECT_ID);
  console.log('Database:', adapter.DATABASE_ID);

  if (!dryRun) {
    const backupRes = backupSourceDatabases();
    if (!backupRes.success) {
      throw new Error(`Migration aborted: Backup creation failed (${backupRes.error})`);
    }
  } else {
    console.log('[Dry Run Mode] No writes, modifications or destructive operations will occur.');
  }

  const stats = {
    users: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 },
    news: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 },
    rss: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 },
    deletionRequests: { total: 0, wouldCreate: 0, wouldSkip: 0, conflicts: 0 }
  };

  // 1. Process User Profiles
  if (fs.existsSync('user_profiles_db.json')) {
    const users = JSON.parse(fs.readFileSync('user_profiles_db.json', 'utf8') || '{}');
    const userKeys = Object.keys(users);
    stats.users.total = userKeys.length;

    for (const [key, profile] of Object.entries(users)) {
      // Deterministic, collision-free DocId strategy:
      // Unique user identifier priority: uid -> userId -> key
      const docId = (profile.uid || profile.userId || key).toLowerCase().trim();

      let existing = { success: false };
      try {
        existing = await adapter.firestoreReadDoc('users', docId);
      } catch (e) {
        existing = { success: false, error: e.message };
      }

      if (existing.success && existing.data) {
        stats.users.wouldSkip++;
        console.log(`  [User] Skip: Document '${docId}' already exists in Firestore`);
      } else {
        stats.users.wouldCreate++;
        if (!dryRun) {
          const res = await adapter.firestoreWriteDoc('users', docId, {
            ...profile,
            docId,
            migratedAt: Date.now()
          });
          if (!res.success) {
            console.error(`  [User Error] Failed to write docId ${docId}:`, res.error);
          }
        }
      }
    }
  }

  // 2. Process News Posts
  if (fs.existsSync('news_database.json')) {
    const posts = JSON.parse(fs.readFileSync('news_database.json', 'utf8') || '[]');
    stats.news.total = posts.length;

    for (const p of posts) {
      const docId = p.id;
      if (!docId) {
        stats.news.conflicts++;
        continue;
      }

      let existing = { success: false };
      try {
        existing = await adapter.firestoreReadDoc('news_posts', docId);
      } catch (e) {
        existing = { success: false, error: e.message };
      }

      if (existing.success && existing.data) {
        stats.news.wouldSkip++;
      } else {
        stats.news.wouldCreate++;
        if (!dryRun) {
          const res = await adapter.firestoreWriteDoc('news_posts', docId, {
            ...p,
            migratedAt: Date.now()
          });
          if (!res.success) {
            console.error(`  [News Error] Failed to write docId ${docId}:`, res.error);
          }
        }
      }
    }
  }

  // 3. Process Account Deletion Requests
  if (fs.existsSync('account_deletion_requests.json')) {
    const delReqs = JSON.parse(fs.readFileSync('account_deletion_requests.json', 'utf8') || '[]');
    stats.deletionRequests.total = delReqs.length;

    for (const r of delReqs) {
      const docId = r.id || `DEL_${Date.now()}`;
      let existing = { success: false };
      try {
        existing = await adapter.firestoreReadDoc('account_deletion_requests', docId);
      } catch (e) {
        existing = { success: false, error: e.message };
      }

      if (existing.success && existing.data) {
        stats.deletionRequests.wouldSkip++;
      } else {
        stats.deletionRequests.wouldCreate++;
        if (!dryRun) {
          await adapter.firestoreWriteDoc('account_deletion_requests', docId, {
            ...r,
            migratedAt: Date.now()
          });
        }
      }
    }
  }

  console.log('=== Migration Summary Report ===');
  console.log('Users:', stats.users);
  console.log('News Posts:', stats.news);
  console.log('Account Deletions:', stats.deletionRequests);
  console.log(`Dry Run Complete (Writes Performed: ${dryRun ? 0 : 'Yes'})`);

  return stats;
}

if (require.main === module) {
  const isLive = process.argv.includes('--live');
  migrate({ dryRun: !isLive })
    .then(stats => {
      console.log('Finished with stats:', stats);
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
} else {
  module.exports = { migrate, backupSourceDatabases };
}
