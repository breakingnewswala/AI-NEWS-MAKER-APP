const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'web_studio', 'src', 'App.tsx'),
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'src', 'App.tsx')
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // 1. Update imports to include getAdminSystemMode, getAdminTestPlanTier, addNotification
  const oldImportPlanManager = `import {
  isUserAdmin,
  setAdminSystemMode,
  getUserSubscription,
  fetchAuthoritativeSubscription,
  isUserActionAllowed,
  fetchUserDailyDownloadStatus,
} from './lib/userPlanManager';`;

  const newImportPlanManager = `import {
  isUserAdmin,
  setAdminSystemMode,
  getAdminSystemMode,
  getAdminTestPlanTier,
  getUserSubscription,
  fetchAuthoritativeSubscription,
  isUserActionAllowed,
  fetchUserDailyDownloadStatus,
} from './lib/userPlanManager';`;

  if (code.includes(oldImportPlanManager)) {
    code = code.replace(oldImportPlanManager, newImportPlanManager);
    console.log(`[OK] Updated userPlanManager imports in: ${file}`);
  }

  const oldImportNotif = `import { triggerBreakingNewsAlert } from './lib/notificationManager';`;
  const newImportNotif = `import { triggerBreakingNewsAlert, addNotification } from './lib/notificationManager';`;

  if (code.includes(oldImportNotif)) {
    code = code.replace(oldImportNotif, newImportNotif);
    console.log(`[OK] Updated notificationManager imports in: ${file}`);
  }

  // 2. Test Mode and isExpiredUser logic in App.tsx
  const oldAdminAndExpired = `  const isAdminUser = isUserAdmin(currentUser);
  const actionAllowance = isUserActionAllowed(currentUser, userSubscription);
  const isActionLocked = !isAdminUser && !actionAllowance.allowed;
  const isCurrentCardBonus = Boolean(card?.isBonus);
  const isExpiredUser = !isAdminUser && !userSubscription?.isBlocked && Boolean(
    userSubscription?.isPlanExpired ||
    userSubscription?.isTrialExpired ||
    (userSubscription?.daysRemaining !== undefined && userSubscription.daysRemaining <= 0)
  );`;

  const newAdminAndExpired = `  const isTestModeActive = isUserAdmin(currentUser) && getAdminSystemMode() === 'test';
  const isAdminUser = isUserAdmin(currentUser) && !isTestModeActive;
  const actionAllowance = isUserActionAllowed(currentUser, userSubscription);
  const isActionLocked = !isAdminUser && !actionAllowance.allowed;
  const isCurrentCardBonus = Boolean(card?.isBonus);
  const isExpiredUser = !isAdminUser && !userSubscription?.isBlocked && !userSubscription?.isTrialActive && !userSubscription?.hasActivePaidPlan && Boolean(
    userSubscription?.isPlanExpired ||
    userSubscription?.isTrialExpired ||
    (typeof userSubscription?.daysRemaining === 'number' && userSubscription.daysRemaining <= 0)
  );`;

  if (code.includes(oldAdminAndExpired)) {
    code = code.replace(oldAdminAndExpired, newAdminAndExpired);
    console.log(`[OK] Updated isTestModeActive and isExpiredUser in: ${file}`);
  }

  // 3. Persistent Admin Test Mode Banner
  const topBarContainerSearch = `{/* Top Bar Navigation - Always visible in Home, Video, Newsroom, Control Room. In Studio: visible ONLY on Desktop (hidden md:block), preserving mobile & APK layout unchanged */}`;
  const testModeBanner = `{/* Persistent Admin Test Mode Banner (Part 6) */}
      {isTestModeActive && (
        <div className="w-full bg-gradient-to-r from-purple-950 via-slate-900 to-purple-950 text-white border-b-2 border-purple-500 px-3 sm:px-6 py-2 shadow-2xl sticky top-0 z-50 flex items-center justify-between gap-2.5 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
            <span className="text-xs sm:text-sm font-black text-purple-200 truncate">
              🧪 टेस्ट मोड सक्रिय: [{(getAdminTestPlanTier() || 'BASIC').toUpperCase()}] का वास्तविक अनुभव
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAdminSystemMode('admin');
                window.dispatchEvent(new Event('ai_news_admin_view_mode_changed'));
                window.location.reload();
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
            >
              <span>⚡</span>
              <span>एडमिन मोड में लौटें</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Navigation - Always visible in Home, Video, Newsroom, Control Room. In Studio: visible ONLY on Desktop (hidden md:block), preserving mobile & APK layout unchanged */}`;

  if (code.includes(topBarContainerSearch) && !code.includes('Persistent Admin Test Mode Banner')) {
    code = code.replace(topBarContainerSearch, testModeBanner);
    console.log(`[OK] Added Persistent Admin Test Mode Banner in: ${file}`);
  }

  // 4. Trial expired warning banner button handler -> dispatch open_plans_packages & navigateToTab('profile')
  const oldTrialBanner = `{/* Plan / Trial Expired Warning Banner (Part 7: Centered & Constrained to max-w-5xl) */}
      {!userSubscription?.isBlocked && (userSubscription?.isPlanExpired || userSubscription?.isTrialExpired || (userSubscription?.daysRemaining !== undefined && userSubscription.daysRemaining <= 0)) && (
        <div className="w-full px-3 sm:px-4 py-2 flex justify-center z-40">
          <div className="w-full max-w-5xl bg-slate-900/95 text-white border border-red-500/50 rounded-xl py-2 px-3 sm:px-4 shadow-xl flex items-center justify-between gap-2 text-xs font-bold animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🔒</span>
              <div className="truncate">
                <span className="font-black text-amber-300">
                  {userSubscription?.tier === 'basic' ? 'ट्रायल समाप्त: ' : 'प्लान समाप्त (Expired): '}
                </span>
                <span className="text-slate-300 text-[11px] sm:text-xs">
                  डाउनलोड व वीडियो टूल्स लॉक हैं। जारी रखने के लिए प्लान सक्रिय करें।
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigateToTab('profile');
              }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs shrink-0 cursor-pointer shadow-md transition animate-pulse flex items-center gap-1"
            >
              <span>⚡</span>
              <span>प्लान सक्रिय करें</span>
            </button>
          </div>
        </div>
      )}`;

  const newTrialBanner = `{/* Plan / Trial Expired Warning Banner (Part 2: Suppressed for Active Plans, Direct Membership Activation) */}
      {isExpiredUser && !userSubscription?.isBlocked && (
        <div className="w-full px-3 sm:px-4 py-2 flex justify-center z-40">
          <div className="w-full max-w-5xl bg-slate-900/95 text-white border border-red-500/50 rounded-xl py-2 px-3 sm:px-4 shadow-xl flex items-center justify-between gap-2 text-xs font-bold animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">🔒</span>
              <div className="truncate">
                <span className="font-black text-amber-300">
                  {userSubscription?.tier === 'basic' ? 'ट्रायल समाप्त: ' : 'प्लान समाप्त (Expired): '}
                </span>
                <span className="text-slate-300 text-[11px] sm:text-xs">
                  डाउनलोड व वीडियो टूल्स लॉक हैं। जारी रखने के लिए प्लान सक्रिय करें।
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigateToTab('profile');
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open_plans_packages'));
                  window.location.hash = '#membership';
                }
              }}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs shrink-0 cursor-pointer shadow-md transition animate-pulse flex items-center gap-1"
            >
              <span>⚡</span>
              <span>प्लान सक्रिय करें</span>
            </button>
          </div>
        </div>
      )}`;

  if (code.includes(oldTrialBanner)) {
    code = code.replace(oldTrialBanner, newTrialBanner);
    console.log(`[OK] Updated Trial Expired Banner in: ${file}`);
  }

  // 5. Expired modal button click -> open_plans_packages
  const oldModalBtn = `onClick={() => {
                  setIsExpiredModalDismissed(true);
                  try { sessionStorage.setItem('expired_plan_modal_dismissed', 'true'); } catch {}
                  navigateToTab('profile');
                }}`;

  const newModalBtn = `onClick={() => {
                  setIsExpiredModalDismissed(true);
                  try { sessionStorage.setItem('expired_plan_modal_dismissed', 'true'); } catch {}
                  navigateToTab('profile');
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('open_plans_packages'));
                    window.location.hash = '#membership';
                  }
                }}`;

  if (code.includes(oldModalBtn)) {
    code = code.replace(oldModalBtn, newModalBtn);
    console.log(`[OK] Updated Expired Modal button in: ${file}`);
  }

  // 6. Broadcast notification when new news is published in handleAddPost
  const oldAddPost = `    syncPostsToServer(updated);
    setToastMessage('खबर सफलतापूर्वक पब्लिश हुई!');`;

  const newAddPost = `    syncPostsToServer(updated);
    addNotification({
      id: \`published_\${newPost.id}\`,
      title: \`📰 नई खबर प्रकाशित: \${newPost.title}\`,
      message: (newPost.summary || newPost.content || '').slice(0, 100) || 'मुख्य होम फ़ीड में नई खबर प्रकाशित हो गई है।',
      time: 'अभी',
      type: 'news',
      linkTab: 'home',
      unread: true,
    });
    setToastMessage('खबर सफलतापूर्वक पब्लिश हुई!');`;

  if (code.includes(oldAddPost)) {
    code = code.replace(oldAddPost, newAddPost);
    console.log(`[OK] Added notification trigger on news publish in: ${file}`);
  }

  fs.writeFileSync(file, code, 'utf8');
});
