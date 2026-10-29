// Admin User Cleanup Utility
// Preserves only the two verified Super Admin accounts and their branding
// Excludes admin.ainewsmaker@gmail.com and breakingnewswala.com@gmail.com

const fs = require('fs');
const path = require('path');

const SUPER_ADMIN_EMAILS = [
  'admin.ainewsmaker@gmail.com',
  'breakingnewswala.com@gmail.com'
];

const isSuperAdminEmail = (email) => {
  if (!email) return false;
  const clean = email.toLowerCase().replace(/\s+/g, '').trim();
  return SUPER_ADMIN_EMAILS.some(sa => clean === sa.toLowerCase().replace(/\s+/g, '').trim());
};

function runAudit(dryRun = true) {
  console.log('====================================================');
  console.log('   AI NEWS MAKER - USER DATABASE AUDIT & CLEANUP    ');
  console.log('   Mode: ' + (dryRun ? 'DRY RUN (Preview Only)' : 'EXECUTE (Active Cleanup)'));
  console.log('====================================================\n');

  const dbFiles = [
    'users_master_database.json',
    'user_profiles_db.json',
    'users_accounts_db.json',
    'users_sheet_database.json',
    'public/registered_users.json',
    'web_studio/user_profiles_db.json'
  ];

  let totalRecords = 0;
  let totalSuperAdmins = 0;
  let totalOtherUsers = 0;

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  dbFiles.forEach(relPath => {
    const fullPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(fullPath)) {
      console.log('[-] Skipping (Not Found): ' + relPath);
      return;
    }

    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const data = JSON.parse(raw);
      const isArray = Array.isArray(data);

      let superAdminCount = 0;
      let otherCount = 0;
      let cleanedData;

      if (isArray) {
        const kept = [];
        data.forEach(item => {
          if (isSuperAdminEmail(item.email)) {
            superAdminCount++;
            kept.push(item);
          } else {
            otherCount++;
          }
        });
        cleanedData = kept;
      } else {
        const kept = {};
        Object.keys(data).forEach(key => {
          const item = data[key];
          const email = item.email || key;
          if (isSuperAdminEmail(email)) {
            superAdminCount++;
            kept[key] = item;
          } else {
            otherCount++;
          }
        });
        cleanedData = kept;
      }

      console.log('[*] ' + relPath + ':');
      console.log('    - Super Admin records preserved: ' + superAdminCount);
      console.log('    - Non-Super Admin records identified: ' + otherCount);

      totalRecords += (superAdminCount + otherCount);
      totalSuperAdmins += superAdminCount;
      totalOtherUsers += otherCount;

      if (!dryRun) {
        // Backup first
        const backupPath = path.join(backupDir, path.basename(relPath) + '.cleanup_bak_' + Date.now());
        fs.writeFileSync(backupPath, raw, 'utf8');
        // Write cleaned data
        fs.writeFileSync(fullPath, JSON.stringify(cleanedData, null, 2), 'utf8');
        console.log('    [✓] Cleaned & written back (Backup saved at ' + backupPath + ')');
      }
    } catch (err) {
      console.error('    [!] Error processing ' + relPath + ':', err.message);
    }
  });

  console.log('\n---------------- SUMMARY ----------------');
  console.log('Total Records Inspected:    ' + totalRecords);
  console.log('Total Super Admin Records:  ' + totalSuperAdmins);
  console.log('Total Other User Records:   ' + totalOtherUsers);
  console.log('Status: ' + (dryRun ? 'No changes written (Dry Run completed).' : 'Cleanup applied successfully.'));
  console.log('-----------------------------------------\n');
}

const args = process.argv.slice(2);
const execute = args.includes('--execute');
runAudit(!execute);
