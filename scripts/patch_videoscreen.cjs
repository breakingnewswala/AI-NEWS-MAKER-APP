const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'web_studio', 'src', 'components', 'VideosScreenWeb.tsx'),
  path.join(__dirname, '..', 'AI-NEWS-MAKER-APP-main', 'src', 'components', 'VideosScreenWeb.tsx')
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  // 1. Add walletCoins, isSyncingVideos, handleRefreshVideos inside VideosScreenWeb
  const targetStateDecl = `  // Admin Coin Value Configuration state for video
  const [coinConfigVideo, setCoinConfigVideo] = useState<VideoFeedItem | null>(null);
  const [videoCoinCost, setVideoCoinCost] = useState<number>(50);
  const [videoCoinPlans, setVideoCoinPlans] = useState<string[]>(['Basic']);
  const [videoCoinSaving, setVideoCoinSaving] = useState<boolean>(false);`;

  const newStates = `  // Admin Coin Value Configuration state for video
  const [coinConfigVideo, setCoinConfigVideo] = useState<VideoFeedItem | null>(null);
  const [videoCoinCost, setVideoCoinCost] = useState<number>(50);
  const [videoCoinPlans, setVideoCoinPlans] = useState<string[]>(['Basic']);
  const [videoCoinSaving, setVideoCoinSaving] = useState<boolean>(false);

  // User Subscription & Creation limits
  const userSub = getUserSubscription(currentUser?.email);
  const isVipDesk = userSub?.tier === 'ultra' || userSub?.tier === 'vip';
  const hasVideoPlan = Boolean(userSub?.hasActivePaidPlan && (userSub?.tier === 'pro' || isVipDesk));

  // Wallet Coin Balance for Authenticated Users (Real-time sync)
  const [walletCoins, setWalletCoins] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem('ai_news_user_wallet_coins');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });

  const [isSyncingVideos, setIsSyncingVideos] = useState<boolean>(false);

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
  }, [currentUser?.email]);

  const handleRefreshVideos = async () => {
    if (isSyncingVideos) return;
    setIsSyncingVideos(true);
    try {
      window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
    } catch {}
    setTimeout(() => {
      setIsSyncingVideos(false);
    }, 700);
  };`;

  if (code.includes(targetStateDecl) && !code.includes('handleRefreshVideos')) {
    code = code.replace(targetStateDecl, newStates);
    console.log(`[OK] Added wallet state and refresh helper in: ${file}`);
  }

  // 2. Add 3-Card Summary Row on Mobile immediately below header
  const mobileContainerSearch = `{/* MOBILE CONTROLS (Row 1: 3 Centered Controls, Row 2: Full-width Admin Upload) */}\n          <div className="flex sm:hidden flex-col gap-2 w-full mt-1">`;
  const mobileContainerReplacement = `{/* MOBILE CONTROLS (Row 1: 3 Centered Controls, Row 2: Full-width Admin Upload) */}
          <div className="flex sm:hidden flex-col gap-2 w-full mt-1">
            {/* Mobile 3-Card Summary Row (Part 1.2: Coins, Remaining Videos, Refresh) */}
            <div className="grid grid-cols-3 gap-2 w-full mb-1">
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

              {/* Card 2: Remaining Videos */}
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                <div className="flex items-center gap-1 text-red-500 dark:text-red-400 font-black text-sm">
                  <Film className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{isAdmin || isVipDesk ? 'असीमित' : (hasVideoPlan ? 50 : 0)}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">शेष वीडियो</span>
              </div>

              {/* Card 3: Refresh Button */}
              <button
                type="button"
                disabled={isSyncingVideos}
                onClick={handleRefreshVideos}
                className={\`flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition text-center cursor-pointer \${isSyncingVideos ? 'opacity-70 cursor-not-allowed' : ''}\`}
                title="वीडियो फ़ीड रीफ्रेश करें"
              >
                <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400 font-black text-sm">
                  <RefreshCw className={\`w-4 h-4 shrink-0 \${isSyncingVideos ? 'animate-spin text-amber-500' : ''}\`} />
                  <span>{isSyncingVideos ? 'रिफ्रेश...' : 'रिफ्रेश'}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">लाइव फ़ीड</span>
              </button>
            </div>`;

  if (code.includes(mobileContainerSearch) && !code.includes('Mobile 3-Card Summary Row')) {
    code = code.replace(mobileContainerSearch, mobileContainerReplacement);
    console.log(`[OK] Added 3-Card Summary Row in: ${file}`);
  }

  fs.writeFileSync(file, code, 'utf8');
});
