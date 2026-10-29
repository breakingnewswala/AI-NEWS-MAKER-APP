const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'web_studio', 'src', 'components', 'HomeScreenWeb.tsx'),
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'src', 'components', 'HomeScreenWeb.tsx')
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // 1. Add walletCoins state and sync listener inside HomeScreenWeb
  const quotaStateSearch = `  const [dailyQuotaStatus, setDailyQuotaStatus] = useState<UserDailyDownloadStatus | null>(() => getCachedUserDailyDownloadStatus());`;
  const walletCoinsState = `  const [dailyQuotaStatus, setDailyQuotaStatus] = useState<UserDailyDownloadStatus | null>(() => getCachedUserDailyDownloadStatus());

  // Wallet Coin Balance for Authenticated Users (Real-time sync)
  const [walletCoins, setWalletCoins] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('ai_news_user_wallet_coins');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const email = (currentUser?.email || '').toLowerCase().trim();
    const userId = (currentUser?.userId || (currentUser as any)?.uid || email).trim();
    if (!email && !userId) return;

    const fetchBalance = () => {
      fetch(getApiUrl(\`/api/user/wallet?email=\${encodeURIComponent(email)}&userId=\${encodeURIComponent(userId)}\`))
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.wallet) {
            setWalletCoins(data.wallet.balance);
            try {
              localStorage.setItem('ai_news_user_wallet_coins', String(data.wallet.balance));
            } catch {}
          }
        })
        .catch(() => {});
    };

    fetchBalance();
    const handleWalletUpdated = (e: any) => {
      if (typeof e?.detail?.balance === 'number') {
        setWalletCoins(e.detail.balance);
      } else {
        fetchBalance();
      }
    };
    window.addEventListener('ai_news_wallet_updated', handleWalletUpdated);
    window.addEventListener('storage', fetchBalance);
    return () => {
      window.removeEventListener('ai_news_wallet_updated', handleWalletUpdated);
      window.removeEventListener('storage', fetchBalance);
    };
  }, [currentUser?.email]);`;

  if (code.includes(quotaStateSearch) && !code.includes('walletCoins')) {
    code = code.replace(quotaStateSearch, walletCoinsState);
    console.log(`[OK] Added walletCoins state & effect in: ${file}`);
  }

  // 2. Add 3-Card Summary Row on Mobile immediately below header
  const mainContainerSearch = `<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-6">`;
  const mobileSummaryRow = `<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-6">

        {/* Mobile 3-Card Summary Row (Part 1.2: Coins, Remaining Graphics, Refresh) */}
        <div className="grid grid-cols-3 gap-2 md:hidden w-full">
          {/* Card 1: Coins */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateToTab) onNavigateToTab('profile');
              window.dispatchEvent(new CustomEvent('open_rewards_wallet'));
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-xs hover:border-amber-500/60 transition cursor-pointer text-center"
            title="रिवॉर्ड्स वॉलेट व कॉइन बैलेंस"
          >
            <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-black text-sm">
              <Coins className="w-4 h-4 shrink-0 text-amber-500" />
              <span>{walletCoins !== null ? walletCoins : '0'}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">कॉइन बैलेंस</span>
          </button>

          {/* Card 2: Remaining Graphics */}
          <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center">
            <div className="flex items-center gap-1 text-red-500 dark:text-red-400 font-black text-sm">
              <Palette className="w-4 h-4 shrink-0 text-red-500" />
              <span>{canModerate || dailyQuotaStatus?.unlimited ? 'असीमित' : (dailyQuotaStatus?.remainingToday ?? 10)}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">शेष ग्राफ़िक्स</span>
          </div>

          {/* Card 3: Refresh Button */}
          <button
            type="button"
            disabled={isSyncingNews}
            onClick={() => {
              if (onRefreshLiveNews && !isSyncingNews) {
                onRefreshLiveNews();
              }
            }}
            className={\`flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-center cursor-pointer \${isSyncingNews ? 'opacity-70 cursor-not-allowed' : ''}\`}
            title="लाइव फ़ीड रीफ्रेश करें"
          >
            <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400 font-black text-sm">
              <RefreshCw className={\`w-4 h-4 shrink-0 \${isSyncingNews ? 'animate-spin text-amber-500' : ''}\`} />
              <span>{isSyncingNews ? 'रिफ्रेश...' : 'रिफ्रेश'}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">लाइव फ़ीड</span>
          </button>
        </div>`;

  if (code.includes(mainContainerSearch) && !code.includes('Mobile 3-Card Summary Row')) {
    code = code.replace(mainContainerSearch, mobileSummaryRow);
    console.log(`[OK] Added 3-Card Summary Row in: ${file}`);
  }

  // 3. Ensure edit modal scroll and sticky footer
  const oldModalFooter = `<button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>बदलाव सुरक्षित करें</span>
                </button>
              </div>
            </form>`;

  const newModalFooter = `<button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>बदलाव सुरक्षित करें</span>
                </button>
              </div>
            </form>`;

  fs.writeFileSync(file, code, 'utf8');
});
