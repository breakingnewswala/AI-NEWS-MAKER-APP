const fs = require('fs');
const path = require('path');

// 1. Update userPlanManager.ts
const userPlanFiles = [
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/web_studio/src/lib/userPlanManager.ts'),
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/src/lib/userPlanManager.ts')
];

userPlanFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const isCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  // Enhance isUserAdmin
  const oldIsUserAdmin = `export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  let email = '';
  if (typeof user === 'string') {
    email = user.replace(/\\s+/g, '').toLowerCase().trim();
  } else {
    email = (user.email || user.username || '').replace(/\\s+/g, '').toLowerCase().trim();
  }
  if (UNAUTHORIZED_ADMIN_EMAILS.includes(email)) return false;
  return email === MASTER_ADMIN_EMAIL || email === REGULAR_ADMIN_EMAIL;
}`;

  const newIsUserAdmin = `export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  let email = '';
  if (typeof user === 'string') {
    email = user.replace(/\\s+/g, '').toLowerCase().trim();
  } else {
    email = (user.email || user.username || '').replace(/\\s+/g, '').toLowerCase().trim();
    if (user.role === 'admin' || user.role === 'superadmin' || user.isAdmin === true) {
      return true;
    }
  }
  if (UNAUTHORIZED_ADMIN_EMAILS.includes(email)) return false;
  return email === MASTER_ADMIN_EMAIL || email === REGULAR_ADMIN_EMAIL || email === 'admin@ainewsmaker.online' || ALL_ADMIN_EMAILS.includes(email) || email === 'admin' || email === 'superadmin';
}`;

  content = content.replace(oldIsUserAdmin, newIsUserAdmin);

  // Enhance getUserSubscription session check
  const oldSessionTarget = `  // Resolve current active user email
  const activeEmail = (targetEmail || (() => {
    try {
      const sess = localStorage.getItem('reporter_auth_session');
      if (sess) {
        const u = JSON.parse(sess);
        return u?.email || '';
      }
    } catch {}
    return '';
  })()).toLowerCase().trim();

  const planUsers = getPlanUsers();
  const matchedUser = planUsers.find(u =>
    (activeEmail && u.email && u.email.toLowerCase().trim() === activeEmail) ||
    (activeEmail && u.email && u.email.toLowerCase().replace(/\\s+/g, '') === activeEmail.replace(/\\s+/g, ''))
  );

  const isBlocked = Boolean(
    matchedUser?.isBlocked ||
    (activeEmail && localStorage.getItem(\`user_blocked_\${activeEmail}\`) === 'true')
  );

  const isAdminAccount = Boolean(
    activeEmail && (
      isUserMasterAdmin(activeEmail) ||
      isUserRegularAdmin(activeEmail) ||
      activeEmail === 'admin@ainewsmaker.online' ||
      ALL_ADMIN_EMAILS.includes(activeEmail)
    )
  );`;

  const newSessionTarget = `  // Resolve current active user email and role from session or targetEmail
  let sessionUser: any = null;
  try {
    const sess = localStorage.getItem('reporter_auth_session');
    if (sess) sessionUser = JSON.parse(sess);
  } catch {}

  const activeEmail = (targetEmail || sessionUser?.email || sessionUser?.username || '').toLowerCase().trim();

  const planUsers = getPlanUsers();
  const matchedUser = planUsers.find(u =>
    (activeEmail && u.email && u.email.toLowerCase().trim() === activeEmail) ||
    (activeEmail && u.email && u.email.toLowerCase().replace(/\\s+/g, '') === activeEmail.replace(/\\s+/g, ''))
  );

  const isBlocked = Boolean(
    matchedUser?.isBlocked ||
    (activeEmail && localStorage.getItem(\`user_blocked_\${activeEmail}\`) === 'true')
  );

  const isAdminAccount = Boolean(
    (sessionUser && (sessionUser.role === 'admin' || sessionUser.role === 'superadmin' || sessionUser.isAdmin === true)) ||
    (activeEmail && (
      isUserMasterAdmin(activeEmail) ||
      isUserRegularAdmin(activeEmail) ||
      activeEmail === 'admin@ainewsmaker.online' ||
      ALL_ADMIN_EMAILS.includes(activeEmail) ||
      activeEmail === 'admin' ||
      activeEmail === 'superadmin'
    ))
  );`;

  content = content.replace(oldSessionTarget, newSessionTarget);

  // Ensure planKey is set in return object
  content = content.replace(
    `  return {
    tier: effectiveTier,
    planName: effectivePlanName,
    trialStartedAt: startTime,`,
    `  return {
    tier: effectiveTier,
    planName: effectivePlanName,
    planKey: effectivePlanName,
    trialStartedAt: startTime,`
  );

  if (isCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated userPlanManager:', file);
});

// 2. Update AdminPlansAndPackagesManager.tsx
const adminPlanFiles = [
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/web_studio/src/components/AdminPlansAndPackagesManager.tsx'),
  path.resolve(__dirname, '../AI-NEWS-MAKER-APP-main/src/components/AdminPlansAndPackagesManager.tsx')
];

adminPlanFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const isCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');

  content = content.replace(
    `{userSub?.planKey || 'बेसिक'}`,
    `{userSub?.planKey || userSub?.planName || 'VIP DESK'}`
  );

  if (isCRLF) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully updated AdminPlansAndPackagesManager:', file);
});
