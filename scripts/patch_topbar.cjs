const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../AI-NEWS-MAKER-APP-main/web_studio/src/components/AppTopBarWeb.tsx'),
  path.join(__dirname, '../AI-NEWS-MAKER-APP-main/src/components/AppTopBarWeb.tsx'),
];

files.forEach((file) => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');

  // 1. Hide Coin Balance on mobile for home and videos
  const coinBtnTarget = `className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 hover:from-amber-500/25 hover:to-yellow-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer shrink max-w-[85px] sm:max-w-none overflow-hidden"`;
  const coinBtnReplacement = `className={\`items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500/15 to-yellow-500/15 hover:from-amber-500/25 hover:to-yellow-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer shrink max-w-[85px] sm:max-w-none overflow-hidden \${(currentTab === 'home' || currentTab === 'videos') ? 'hidden md:flex' : 'flex'}\`}`;

  if (code.includes(coinBtnTarget)) {
    code = code.replace(coinBtnTarget, coinBtnReplacement);
    console.log(`✅ Patched coin button in ${path.basename(file)}`);
  }

  // 2. Hide Refresh on mobile for home and videos
  const refreshBtnTarget = `className="px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-bold shrink-0 shadow-xs"`;
  const refreshBtnReplacement = `className={\`px-2.5 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs transition-colors cursor-pointer items-center gap-1.5 font-bold shrink-0 shadow-xs \${(currentTab === 'home' || currentTab === 'videos') ? 'hidden md:flex' : 'flex'}\`}`;

  if (code.includes(refreshBtnTarget)) {
    code = code.replace(refreshBtnTarget, refreshBtnReplacement);
    console.log(`✅ Patched refresh button in ${path.basename(file)}`);
  }

  // 3. Make Test Mode switcher cleanly available for Admin in header
  const adminTestTarget = `{isAdminUser && isControlPanel && (
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = adminSystemMode === 'admin' ? 'test' : 'admin';
                    setAdminSystemMode(nextMode);
                    setAdminSystemModeState(nextMode);
                  }}
                  className={\`md:hidden px-2 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer shrink-0 border shadow-xs \${
                    adminSystemMode === 'test'
                      ? 'bg-purple-600/90 hover:bg-purple-500 text-white border-purple-400'
                      : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 text-amber-600 dark:text-amber-400 border-slate-300 dark:border-slate-700/80 hover:border-amber-400/50'
                  }\`}
                  title={adminSystemMode === 'test' ? 'टेस्ट मोड सक्रिय - एडमिन मोड में बदलें' : 'एडमिन मोड - टेस्ट मोड में बदलें'}
                >
                  {adminSystemMode === 'test' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span>🧪 टेस्ट</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ एडमिन</span>
                    </>
                  )}
                </button>
              )}`;

  const adminTestReplacement = `{isUserAdmin(currentUser) && (
                <button
                  type="button"
                  onClick={() => {
                    const nextMode = adminSystemMode === 'admin' ? 'test' : 'admin';
                    setAdminSystemMode(nextMode);
                    setAdminSystemModeState(nextMode);
                  }}
                  className={\`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer shrink-0 border shadow-xs \${
                    adminSystemMode === 'test'
                      ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 ring-2 ring-purple-400/30'
                      : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 text-amber-600 dark:text-amber-400 border-slate-300 dark:border-slate-700/80 hover:border-amber-400/50'
                  }\`}
                  title={adminSystemMode === 'test' ? 'टेस्ट मोड सक्रिय - एडमिन मोड में बदलें' : 'एडमिन मोड - टेस्ट मोड में बदलें'}
                >
                  {adminSystemMode === 'test' ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span>🧪 टेस्ट</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ एडमिन</span>
                    </>
                  )}
                </button>
              )}`;

  if (code.includes(adminTestTarget)) {
    code = code.replace(adminTestTarget, adminTestReplacement);
    console.log(`✅ Patched admin test button in ${path.basename(file)}`);
  }

  fs.writeFileSync(file, code, 'utf8');
});
