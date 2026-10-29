const fs = require('fs');
const path = require('path');

const targetLogo = '/uploads/logos/logo-1792879072755-7dc6c7c5.png';
const email = 'khabridasnews@gmail.com';

// 1. user_profiles_db.json
const profilesPath = path.join(__dirname, '../AI-NEWS-MAKER-APP-main/user_profiles_db.json');
if (fs.existsSync(profilesPath)) {
  const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
  if (profiles[email]) {
    profiles[email].channelLogoUrl = targetLogo;
    profiles[email].channelLogoPngUrl = targetLogo;
    profiles[email].channelLogoType = 'png';
    profiles[email].updatedAt = Date.now();
    fs.writeFileSync(profilesPath, JSON.stringify(profiles, null, 2), 'utf8');
    console.log('Updated user_profiles_db.json');
  }
}

// 2. users_accounts_db.json
const accountsPath = path.join(__dirname, '../AI-NEWS-MAKER-APP-main/users_accounts_db.json');
if (fs.existsSync(accountsPath)) {
  const accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
  const acc = accounts.find((a) => a.email && a.email.toLowerCase() === email);
  if (acc) {
    acc.channelLogoUrl = targetLogo;
    acc.channelLogoPngUrl = targetLogo;
    acc.channelLogoType = 'png';
    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2), 'utf8');
    console.log('Updated users_accounts_db.json');
  }
}

// 3. users_master_database.json
const masterPath = path.join(__dirname, '../AI-NEWS-MAKER-APP-main/users_master_database.json');
if (fs.existsSync(masterPath)) {
  const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));
  const m = master.find((a) => a.email && a.email.toLowerCase() === email);
  if (m) {
    m.channelLogoUrl = targetLogo;
    m.channelLogoPngUrl = targetLogo;
    m.channelLogoType = 'png';
    fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf8');
    console.log('Updated users_master_database.json');
  }
}
