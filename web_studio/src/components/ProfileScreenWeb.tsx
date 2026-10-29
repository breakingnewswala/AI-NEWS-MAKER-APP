import { Smartphone, Download, Coins, Award, Clock } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  PlusCircle,
  Sliders,
  FolderTree,
  Upload,
  Check,
  Trash2,
  Tv,
  Key,
  Globe,
  Radio,
  Sparkles,
  LogOut,
  Save,
  Bot,
  Eye,
  EyeOff,
  Zap,
  Lock,
  Phone,
  Crown,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  Star,
  ExternalLink,
  Rss,
  Link2,
  RefreshCw,
  Ticket,
  Package,
  AlertCircle,
  ChevronDown,
  Film,
  Layers,
  Mail,
  MapPin,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import { NewsFeedPost } from '../data/newsFeedData';
import { getApiUrl } from '../lib/apiConfig';
import { APP_SUPPORT_CONFIG } from '../lib/supportConfig';
import {
  getUserSubscription,
  fetchAuthoritativeSubscription,
  setUserPlanTier,
  savePrimaryMobileNumber,
  isUserAdmin,
  isEffectiveAdmin,
  isUserSuperAdmin,
  getAdminSystemMode,
  setAdminSystemMode,
  setAdminTestMode,
  getAdminTestPlanTier,
  setAdminTestPlanTier,
  activateFreeTrial,
  redeemPromoCode,
  RedeemResult,
  PLAN_DETAILS,
  getPlansCatalog,
  PLAN_KEY_MAP,
  UserPlanTier,
  UserSubscriptionInfo,
  AdminSystemMode,
  isChannelProfileLocked,
  registerOrUpdateUser,
  getPlanUsers,
  submitLogoChangeRequest,
  getUserLogoChangeRequestStatus,
  getLogoChangeRequests,
  fetchLogoChangeRequests,
  canAccessTemplateManager,
  fetchUserDailyDownloadStatus,
  getCachedUserDailyDownloadStatus,
  UserDailyDownloadStatus,
} from '../lib/userPlanManager';
import { ChannelProfile } from '../types';
import { AdminTemplatePlanManager } from './AdminTemplatePlanManager';
import { UserTemplateManager } from './UserTemplateManager';
import { AdminPlansAndPackagesManager } from './AdminPlansAndPackagesManager';
import { HelpAndPoliciesView } from './HelpAndPoliciesView';
import {
  getCustomFrames,
  saveCustomFrame,
  deleteCustomFrame,
  setActiveCustomFrameId,
  getActiveCustomFrameId,
  CustomFrameItem,
} from '../lib/customFramesManager';
import {
  getAdminRssSources,
  addAdminRssSource,
  toggleAdminRssSource,
  deleteAdminRssSource,
  syncAllSourcesLive,
} from '../lib/rssSourceManager';

export const DEFAULT_SOCIAL_ICONS = {
  youtube: true,
  facebook: true,
  instagram: true,
  twitter: false,
  linkedin: false,
};

export const DEFAULT_PROFILE: ChannelProfile = {
  fullName: '',
  channelNameHi: '',
  channelNameEn: '',
  channelLogoUrl: '',
  channelLogoType: 'png',
  socialIcons: DEFAULT_SOCIAL_ICONS,
  username: '',
  mobileNumber: '',
  showMobileNumber: true,
  websiteUrl: '',
};

interface ProfileScreenWebProps {
  currentUser: ReporterUser | null;
  onLogout: () => void;
  onAddNewPost: (post: Omit<NewsFeedPost, 'id' | 'timestamp'>) => void;
  onOpenStudio: () => void;
  onOpenOnboarding?: () => void;
  onNavigateToGenerator?: () => void;
  categories?: { id: string; name: string }[];
  onAddCategory?: (name: string) => void;
  onDeleteCategory?: (id: string) => void;
}

export const ProfileScreenWeb: React.FC<ProfileScreenWebProps> = ({
  currentUser,
  onLogout,
  onAddNewPost,
  onOpenStudio,
  onOpenOnboarding,
  categories = [],
  onAddCategory = () => {},
  onDeleteCategory = () => {},
}) => {
  // Admin check & Channel Profile Lock check with robust fallback for Android WebView
  const effectiveUser = currentUser || (() => {
    try {
      const saved = localStorage.getItem('reporter_auth_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'यूज़र', email: '', role: 'user',
      district: 'डिजिटल डेस्क'
    };
  })();
  const isRealAdmin = isUserAdmin(effectiveUser) || isUserAdmin(currentUser);
  const isAdmin = isEffectiveAdmin(effectiveUser) || isRealAdmin;
  // Channel Profile State (Directly synced to Graphic Studio footer)
  const [channelProfile, setChannelProfile] = useState<ChannelProfile>(() => {
    try {
      const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
      const isAinewsAdmin = cleanEmail === 'admin.ainewsmaker@gmail.com';
      const isBnwAdmin = cleanEmail === 'breakingnewswala.com@gmail.com';
      const defaultAdminLogo = isAinewsAdmin ? '/assets/ai_news_maker_logo.png' : (isBnwAdmin ? '/assets/breaking_news_wala_logo.png' : '');

      if (cleanEmail) {
        const specific = localStorage.getItem(`user_profile_${cleanEmail}`);
        if (specific) {
          const parsed = JSON.parse(specific);
          return {
            ...DEFAULT_PROFILE,
            channelLogoUrl: parsed.channelLogoUrl || defaultAdminLogo,
            channelLogoPngUrl: parsed.channelLogoPngUrl || parsed.channelLogoUrl || defaultAdminLogo,
            channelNameHi: parsed.channelNameHi || (isAinewsAdmin ? 'एआई न्यूज़ मेकर' : (isBnwAdmin ? 'ब्रेकिंग न्यूज़ वाला' : '')),
            channelNameEn: parsed.channelNameEn || (isAinewsAdmin ? 'AI News Maker' : (isBnwAdmin ? 'BREAKING NEWS WALA' : '')),
            ...parsed,
            socialIcons: { ...DEFAULT_SOCIAL_ICONS, ...(parsed.socialIcons || {}) },
          };
        }
      }
      const saved = localStorage.getItem('user_channel_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PROFILE,
          channelLogoUrl: parsed.channelLogoUrl || defaultAdminLogo,
          channelLogoPngUrl: parsed.channelLogoPngUrl || parsed.channelLogoUrl || defaultAdminLogo,
          channelNameHi: parsed.channelNameHi || (isAinewsAdmin ? 'एआई न्यूज़ मेकर' : (isBnwAdmin ? 'ब्रेकिंग न्यूज़ वाला' : '')),
          channelNameEn: parsed.channelNameEn || (isAinewsAdmin ? 'AI News Maker' : (isBnwAdmin ? 'BREAKING NEWS WALA' : '')),
          ...parsed,
          socialIcons: { ...DEFAULT_SOCIAL_ICONS, ...(parsed.socialIcons || {}) },
        };
      }
    } catch {}
    const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
    const isAinewsAdmin = cleanEmail === 'admin.ainewsmaker@gmail.com';
    const isBnwAdmin = cleanEmail === 'breakingnewswala.com@gmail.com';
    const defaultAdminLogo = isAinewsAdmin ? '/assets/ai_news_maker_logo.png' : (isBnwAdmin ? '/assets/breaking_news_wala_logo.png' : '');

    return {
      ...DEFAULT_PROFILE,
      fullName: currentUser?.name || (isAinewsAdmin ? 'सुपर एडमिन (Super Admin)' : (isBnwAdmin ? 'मुख्य संपादक' : '')),
      channelNameHi: isAinewsAdmin ? 'एआई न्यूज़ मेकर' : (isBnwAdmin ? 'ब्रेकिंग न्यूज़ वाला' : (localStorage.getItem('app_channel_name') || '')),
      channelNameEn: isAinewsAdmin ? 'AI News Maker' : (isBnwAdmin ? 'BREAKING NEWS WALA' : (localStorage.getItem('app_channel_name_en') || '')),
      channelLogoUrl: defaultAdminLogo,
      channelLogoPngUrl: defaultAdminLogo,
      username: currentUser?.username || (isAinewsAdmin ? 'AI News Maker' : (isBnwAdmin ? 'breakingnewswala' : '')),
    };
  });

  // Fetch Cloud Saved User Profile on Mount or User Change
  useEffect(() => {
    const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
    if (!cleanEmail) return;
    const isAinewsAdmin = cleanEmail === 'admin.ainewsmaker@gmail.com';
    const isBnwAdmin = cleanEmail === 'breakingnewswala.com@gmail.com';
    const defaultAdminLogo = isAinewsAdmin ? '/assets/ai_news_maker_logo.png' : (isBnwAdmin ? '/assets/breaking_news_wala_logo.png' : '');

    fetch(getApiUrl(`/api/user-profile?email=${encodeURIComponent(cleanEmail)}`))
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.profile) {
          const cloudP = data.profile;
          if (cloudP.district || cloudP.location) {
            setReporterDistrict(cloudP.district || cloudP.location);
          }
          setChannelProfile((prev) => {
            const resolvedLogo = cloudP.channelLogoUrl || cloudP.channelLogoPngUrl || prev.channelLogoUrl || prev.channelLogoPngUrl || defaultAdminLogo;
            const merged = {
              ...prev,
              fullName: cloudP.fullName || cloudP.name || prev.fullName,
              channelNameHi: cloudP.channelNameHi || cloudP.channelName || prev.channelNameHi || (isAinewsAdmin ? 'एआई न्यूज़ मेकर' : (isBnwAdmin ? 'ब्रेकिंग न्यूज़ वाला' : '')),
              channelNameEn: cloudP.channelNameEn || prev.channelNameEn || (isAinewsAdmin ? 'AI News Maker' : (isBnwAdmin ? 'BREAKING NEWS WALA' : '')),
              channelLogoUrl: resolvedLogo,
              channelLogoPngUrl: resolvedLogo,
              channelLogoGifUrl: cloudP.channelLogoGifUrl || prev.channelLogoGifUrl || '',
              channelLogoType: cloudP.channelLogoType || prev.channelLogoType || 'png',
              username: cloudP.username || prev.username,
              mobileNumber: cloudP.mobileNumber || cloudP.mobile || prev.mobileNumber,
              whatsappNumber: cloudP.whatsappNumber || cloudP.mobileNumber || prev.whatsappNumber || prev.mobileNumber || '',
              websiteUrl: cloudP.websiteUrl || prev.websiteUrl,
              district: cloudP.district || cloudP.location || prev.district || '',
              location: cloudP.location || cloudP.district || prev.location || '',
              state: cloudP.state || prev.state || '',
              address: cloudP.address || prev.address || '',
              pincode: cloudP.pincode || prev.pincode || '',
              socialIcons: (cloudP.socialIcons && Object.keys(cloudP.socialIcons).length > 0) ? cloudP.socialIcons : (prev.socialIcons || DEFAULT_SOCIAL_ICONS),
              customHeaderPng: cloudP.customHeaderPng !== undefined ? cloudP.customHeaderPng : (prev.customHeaderPng || ''),
              customFooterPng: cloudP.customFooterPng !== undefined ? cloudP.customFooterPng : (prev.customFooterPng || ''),
            };
            try {
              localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(merged));
              localStorage.setItem('user_channel_profile', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});

    // Authoritative Cloud Subscription Fetch
    fetchAuthoritativeSubscription(cleanEmail).then((sub) => {
      setSubscription(sub);
    });

    const handlePlanUpdate = () => {
      setSubscription(getUserSubscription());
    };
    window.addEventListener('ai_news_user_plan_updated', handlePlanUpdate);
    return () => window.removeEventListener('ai_news_user_plan_updated', handlePlanUpdate);
  }, [currentUser?.email]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const [isLockedForUserState, setIsLockedForUserState] = useState(() => !isAdmin && isChannelProfileLocked(currentUser));
  const isLockedForUser = isLockedForUserState;
  const isLogoLocked = isLockedForUserState || (!isAdmin && Boolean(channelProfile.channelLogoUrl || channelProfile.channelLogoPngUrl));
  const isGifLocked = !isAdmin && Boolean(channelProfile.channelLogoGifUrl);
  const [isLogoReqModalOpen, setIsLogoReqModalOpen] = useState(false);
  const [logoReqType, setLogoReqType] = useState<'logo' | 'gif'>('logo');
  const [isSubmittingLogoReq, setIsSubmittingLogoReq] = useState(false);
  const [logoReqReason, setLogoReqReason] = useState("नया आधिकारिक चैनल लोगो अपडेट करना है");
  const [newRequestedLogoUrl, setNewRequestedLogoUrl] = useState<string>('');
  const [logoReqStatus, setLogoReqStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>(() =>
    getUserLogoChangeRequestStatus(currentUser?.email || '', 'logo')
  );
  const [gifReqStatus, setGifReqStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>(() =>
    getUserLogoChangeRequestStatus(currentUser?.email || '', 'gif')
  );

  // Manual Username Creation state & handler (Google Email != Username)
  const [isUsernameEditing, setIsUsernameEditing] = useState(false);
  const [manualUsernameInput, setManualUsernameInput] = useState('');
  const [usernameError, setUsernameError] = useState('');

  const handleSaveManualUsername = () => {
    const clean = manualUsernameInput.trim().replace(/^@/, '').toLowerCase();
    if (!clean) {
      setUsernameError('कृपया एक वैध यूज़रनेम दर्ज करें।');
      return;
    }
    if (clean.length < 3 || clean.length > 20) {
      setUsernameError('यूज़रनेम 3 से 20 अक्षरों के बीच होना चाहिए।');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameError('केवल अंग्रेजी अक्षर, अंक और _ (underscore) मान्य हैं।');
      return;
    }

    // Check availability against all registered users
    const users = getPlanUsers();
    const existing = users.find(u => u.username?.toLowerCase() === clean && u.email.toLowerCase() !== (currentUser?.email || '').toLowerCase());
    if (existing) {
      setUsernameError(`'${clean}' यूज़रनेम पहले से किसी अन्य यूज़र द्वारा उपयोग में है। कृपया दूसरा यूज़रनेम चुनें।`);
      return;
    }

    const formattedUsername = `@${clean}`;
    const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();

    setChannelProfile(prev => {
      const updated = { ...prev, username: formattedUsername };
      try {
        localStorage.setItem('user_channel_profile', JSON.stringify(updated));
        localStorage.setItem('user_profile_data', JSON.stringify(updated));
        if (cleanEmail) {
          localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(updated));
        }
      } catch {}

      // Immediate server persistence across page refresh
      try {
        fetch(getApiUrl('/api/user-profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updated,
            email: cleanEmail,
            username: clean,
          }),
        }).catch(() => {});

        if (cleanEmail) {
          fetch(getApiUrl('/api/admin/update-user'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: cleanEmail,
              updates: {
                username: clean,
              },
            }),
          }).catch(() => {});
        }
      } catch {}

      try {
        registerOrUpdateUser({
          email: cleanEmail || 'admin.ainewsmaker@gmail.com',
          name: updated.fullName || 'मुख्य संपादक',
          username: clean,
          isLocked: !isAdmin,
        });
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('channel_profile_updated', {
            detail: {
              ...updated,
              username: clean,
            },
          })
        );
      }
      return updated;
    });

    try {
      const sessStr = localStorage.getItem('reporter_auth_session');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        sess.username = clean;
        localStorage.setItem('reporter_auth_session', JSON.stringify(sess));
      }
    } catch {}

    setIsUsernameEditing(false);
    setUsernameError('');
    alert(`✅ आपका मनपसंद यूज़रनेम '${formattedUsername}' सफलतापूर्वक सेट हो गया!`);
  };

  const handleNewRequestedLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logoReqType === 'gif') {
      if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) {
        alert('कृपया केवल मान्य एनिमेटेड GIF फ़ाइल (.gif) चुनें।');
        return;
      }
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('फ़ाइल का आकार 15MB से अधिक नहीं होना चाहिए।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) setNewRequestedLogoUrl(res);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let isMounted = true;
    const handleLogoUpdates = () => {
      setTimeout(() => {
        if (!isMounted) return;
        setIsLockedForUserState(!isAdmin && isChannelProfileLocked(currentUser));
        setLogoReqStatus(getUserLogoChangeRequestStatus(currentUser?.email || '', 'logo'));
        setGifReqStatus(getUserLogoChangeRequestStatus(currentUser?.email || '', 'gif'));
      }, 0);
    };

    if (currentUser?.email) {
      fetchLogoChangeRequests(currentUser.email).then(() => handleLogoUpdates()).catch(() => {});
    }

    window.addEventListener('ai_news_logo_requests_updated', handleLogoUpdates);
    window.addEventListener('ai_news_channel_profile_unlocked', handleLogoUpdates);
    window.addEventListener('ai_news_plan_users_changed', handleLogoUpdates);
    return () => {
      isMounted = false;
      window.removeEventListener('ai_news_logo_requests_updated', handleLogoUpdates);
      window.removeEventListener('ai_news_channel_profile_unlocked', handleLogoUpdates);
      window.removeEventListener('ai_news_plan_users_changed', handleLogoUpdates);
    };
  }, [currentUser?.email, isAdmin]);

  // User Rewards Wallet state
  const [walletData, setWalletData] = useState<{
    coinBalance: number;
    pendingCoins: number;
    totalEarnedCoins: number;
  }>({ coinBalance: 0, pendingCoins: 0, totalEarnedCoins: 0 });
  const [walletClaims, setWalletClaims] = useState<any[]>([]);
  const [eligibleDownloads, setEligibleDownloads] = useState<any[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [selectedEligibleDownload, setSelectedEligibleDownload] = useState<any | null>(null);
  const [claimScreenshotBase64, setClaimScreenshotBase64] = useState<string>('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSubmitSuccess, setClaimSubmitSuccess] = useState<string>('');
  const [claimSubmitError, setClaimSubmitError] = useState<string>('');

  const fetchUserWallet = () => {
    const email = (currentUser?.email || channelProfile?.email || '').toLowerCase().trim();
    const uid = currentUser?.userId || currentUser?.uid || '';
    if (!email && !uid) return;
    fetch(`/api/user/wallet?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(uid)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.wallet) setWalletData(data.wallet);
          if (Array.isArray(data.claims)) setWalletClaims(data.claims);
          if (Array.isArray(data.eligibleDownloads)) setEligibleDownloads(data.eligibleDownloads);
          if (Array.isArray(data.transactions)) setWalletTransactions(data.transactions);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUserWallet();
    const handleWalletUpdated = () => {
      fetchUserWallet();
    };
    window.addEventListener('wallet_balance_updated', handleWalletUpdated);
    window.addEventListener('ai_news_wallet_updated', handleWalletUpdated);
    return () => {
      window.removeEventListener('wallet_balance_updated', handleWalletUpdated);
      window.removeEventListener('ai_news_wallet_updated', handleWalletUpdated);
    };
  }, [currentUser?.email]);

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setClaimSubmitError('स्क्रीनशॉट फ़ाइल 10MB से कम होनी चाहिए');
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setClaimScreenshotBase64((evt.target?.result as string) || '');
      setClaimSubmitError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRewardClaim = async () => {
    if (!selectedEligibleDownload) {
      setClaimSubmitError('कृपया पहले वह बोनस समाचार चुनें जिसका आपने ग्राफिक डाउनलोड किया था');
      return;
    }
    if (!claimScreenshotBase64) {
      setClaimSubmitError('कृपया अपने सोशल मीडिया पोस्ट (Instagram, Facebook या WhatsApp) का स्क्रीनशॉट अपलोड करें');
      return;
    }
    setIsSubmittingClaim(true);
    setClaimSubmitError('');
    setClaimSubmitSuccess('');
    try {
      // 1. Upload screenshot
      const upRes = await fetch('/api/rewards/upload-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: claimScreenshotBase64,
          mimeType: 'image/jpeg',
        }),
      });
      const upData = await upRes.json();
      if (!upData.success || !upData.url) {
        throw new Error(upData.error || 'स्क्रीनशॉट अपलोड विफल रहा');
      }

      // 2. Submit Claim
      const email = (currentUser?.email || channelProfile?.email || '').toLowerCase().trim();
      const uid = currentUser?.userId || currentUser?.uid || email;
      const claimRes = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          userEmail: email,
          userName: channelProfile.fullName || currentUser?.name || 'यूज़र',
          username: channelProfile.username || currentUser?.username || 'reporter',
          newsItemId: selectedEligibleDownload.newsItemId,
          newsTitle: selectedEligibleDownload.newsTitle,
          rewardCoins: selectedEligibleDownload.rewardCoins || 5,
          graphicDownloadedAt: selectedEligibleDownload.downloadedAt,
          screenshotUrl: upData.url,
        }),
      });
      const claimData = await claimRes.json();
      if (!claimData.success) {
        throw new Error(claimData.error || 'क्लेम सबमिट नहीं हो सका');
      }

      setClaimSubmitSuccess(`🎉 आपका क्लेम सफलतापूर्वक सबमिट हो गया! एडमिन सत्यापन के बाद ${selectedEligibleDownload.rewardCoins || 5} कॉइन्स आपके वॉलेट में जुड़ जाएंगे।`);
      setClaimScreenshotBase64('');
      setSelectedEligibleDownload(null);
      fetchUserWallet();
    } catch (err: any) {
      setClaimSubmitError(err.message || 'क्लेम सबमिशन में त्रुटि');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Tabs: 'profile', 'membership', 'rewards_wallet', 'sub_users', 'templates_manager', 'policies' - initially closed per requirement
  const [normalUserTab, setNormalUserTab] = useState<'profile' | 'membership' | 'rewards_wallet' | 'sub_users' | 'templates_manager' | 'policies' | ''>('');

  // Sub-Users management state (Section 10)
  const [subUsersList, setSubUsersList] = useState<any[]>([]);
  const [subUsersMaxLimit, setSubUsersMaxLimit] = useState(0);
  const [subUserParentEmail, setSubUserParentEmail] = useState<string | null>(null);
  const [subUserEmailInput, setSubUserEmailInput] = useState('');
  const [subUserNameInput, setSubUserNameInput] = useState('');
  const [isInvitingSubUser, setIsInvitingSubUser] = useState(false);
  const [subUserError, setSubUserError] = useState('');
  const [subUserSuccess, setSubUserSuccess] = useState('');

  const fetchSubUsers = () => {
    const email = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
    if (!email) return;
    fetch(getApiUrl(`/api/user/sub-users?email=${encodeURIComponent(email)}`))
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubUsersList(data.subUsers || []);
          setSubUsersMaxLimit(data.allowedLimit ?? data.maxSubUsers ?? 0);
          setSubUserParentEmail(data.parentPrimaryEmail || null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSubUsers();
  }, [currentUser?.email]);

  const handleInviteSubUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
    const subEmail = subUserEmailInput.trim().toLowerCase();
    if (!subEmail || !subEmail.includes('@')) {
      setSubUserError('कृपया एक मान्य ईमेल पता दर्ज करें।');
      return;
    }
    setIsInvitingSubUser(true);
    setSubUserError('');
    setSubUserSuccess('');
    try {
      const res = await fetch(getApiUrl('/api/user/sub-users/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryEmail,
          subUserEmail: subEmail,
          subUserName: subUserNameInput.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'सब-यूज़र जोड़ने में विफल');
      }
      setSubUserSuccess(data.message || 'सब-यूज़र सफलतापूर्वक जोड़ा गया!');
      setSubUserEmailInput('');
      setSubUserNameInput('');
      fetchSubUsers();
    } catch (err: any) {
      setSubUserError(err.message || 'त्रुटि हुई');
    } finally {
      setIsInvitingSubUser(false);
    }
  };

  const handleDeleteSubUser = async (subId: string) => {
    if (!window.confirm('क्या आप वाकई इस सब-यूज़र को हटाना चाहते हैं?')) return;
    try {
      const res = await fetch(getApiUrl(`/api/user/sub-users/${encodeURIComponent(subId)}`), {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast('सब-यूज़र हटा दिया गया');
        fetchSubUsers();
      } else {
        alert(data.error || 'सब-यूज़र हटाने में विफल');
      }
    } catch (err: any) {
      alert(err.message || 'हटाने में त्रुटि');
    }
  };

  const [activeTab, setActiveTab] = useState<'profile' | 'plans_packages' | 'templates' | 'dashboard'>(() => {
    if (isAdmin && typeof window !== 'undefined') {
      const h = window.location.hash.toLowerCase();
      if (h.includes('plan') || h.includes('package') || h.includes('promo')) {
        return 'plans_packages';
      }
      if (h.includes('template')) {
        return 'templates';
      }
      if (h.includes('dashboard') || h.includes('rss') || h.includes('feed')) {
        return 'dashboard';
      }
    }
    return 'profile';
  });

  const [dailyQuotaStatus, setDailyQuotaStatus] = useState<UserDailyDownloadStatus | null>(() => getCachedUserDailyDownloadStatus());

  useEffect(() => {
    fetchUserDailyDownloadStatus(currentUser?.email).then(setDailyQuotaStatus).catch(() => {});
    const handleQuota = (e: any) => {
      if (e?.detail) setDailyQuotaStatus(e.detail);
    };
    window.addEventListener('ai_news_download_status_updated', handleQuota);
    return () => window.removeEventListener('ai_news_download_status_updated', handleQuota);
  }, [currentUser?.email]);

  useEffect(() => {
    const handleOpenRss = () => {
      if (isAdmin) setActiveTab('dashboard');
    };
    const handleOpenTemplates = () => {
      if (isAdmin) setActiveTab('templates');
      setNormalUserTab('templates_manager');
    };
    const handleOpenPlans = () => {
      if (isAdmin) setActiveTab('plans_packages');
      setNormalUserTab('membership');
      setTimeout(() => {
        const el = document.getElementById('user-membership-accordion-section');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    };
    const handleOpenTemplateManagerCustom = () => setNormalUserTab('templates_manager');

    window.addEventListener('open_rss_dashboard', handleOpenRss);
    window.addEventListener('open_template_manager', handleOpenTemplates);
    window.addEventListener('open_plans_packages', handleOpenPlans);
    window.addEventListener('ai_news_open_template_manager', handleOpenTemplateManagerCustom);
    const handleHash = () => {
      const h = window.location.hash.toLowerCase();
      if (h.includes('plan') || h.includes('package') || h.includes('promo') || h.includes('membership')) {
        if (isAdmin) setActiveTab('plans_packages');
        setNormalUserTab('membership');
      } else if (h.includes('template')) {
        if (isAdmin) setActiveTab('templates');
        setNormalUserTab('templates_manager');
      } else if (h.includes('dashboard') || h.includes('rss') || h.includes('feed')) {
        if (isAdmin) setActiveTab('dashboard');
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => {
      window.removeEventListener('open_rss_dashboard', handleOpenRss);
      window.removeEventListener('open_template_manager', handleOpenTemplates);
      window.removeEventListener('open_plans_packages', handleOpenPlans);
      window.removeEventListener('ai_news_open_template_manager', handleOpenTemplateManagerCustom);
      window.removeEventListener('hashchange', handleHash);
    };
  }, [isAdmin]);

  // Subscription & User Tier State
  const [subscription, setSubscription] = useState<UserSubscriptionInfo>(() => getUserSubscription());
  const [mobileInput, setMobileInput] = useState<string>('');
  const [mobileError, setMobileError] = useState<string>('');
  const [planSuccessMsg, setPlanSuccessMsg] = useState<string>('');

  // User Promo Code Redemption State
  const [userPromoInput, setUserPromoInput] = useState<string>('');
  const [isRedeemingPromo, setIsRedeemingPromo] = useState<boolean>(false);
  const [promoRedeemResult, setPromoRedeemResult] = useState<RedeemResult | null>(null);

  // Admin Mode & Test Mode state
  const [adminSystemMode, setAdminSystemModeState] = useState<AdminSystemMode>(() => getAdminSystemMode());
  const [testPlanTier, setTestPlanTierState] = useState<UserPlanTier>(() => getAdminTestPlanTier());
  const [testModeMsg, setTestModeMsg] = useState<string>('');
  const testModeEnabled = adminSystemMode === 'test';
  const setTestModeEnabled = (enabled: boolean) => handleSwitchAdminMode(enabled ? 'test' : 'admin');

  // Switch Admin Mode: Admin Mode vs Test Mode
  const handleSwitchAdminMode = (newMode: AdminSystemMode) => {
    setAdminSystemMode(newMode);
    setAdminSystemModeState(newMode);
    setTestModeMsg(
      newMode === 'test'
        ? `🧪 टेस्ट मोड सक्रिय: अब आप "${PLAN_KEY_MAP[testPlanTier]}" प्लान का वास्तविक यूज़र अनुभव देख रहे हैं।`
        : '⚡ एडमिन मोड सक्रिय: सभी एडमिन कंट्रोल्स अनलॉक हैं।'
    );
    setTimeout(() => setTestModeMsg(''), 4500);
  };

  // Select which plan to preview in Test Mode
  const handleSelectTestPlan = (plan: UserPlanTier) => {
    setAdminTestPlanTier(plan);
    setTestPlanTierState(plan);
    setTestModeMsg(`🧪 अब आप "${PLAN_KEY_MAP[plan]}" प्लान का यूज़र अनुभव टेस्ट कर रहे हैं।`);
    setTimeout(() => setTestModeMsg(''), 4500);
  };

  // Handle Promo Code Redeem
  const handleRedeemPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPromoInput.trim()) return;
    setIsRedeemingPromo(true);
    setPromoRedeemResult(null);

    setTimeout(() => {
      const res = redeemPromoCode(userPromoInput, currentUser);
      setPromoRedeemResult(res);
      setIsRedeemingPromo(false);

      if (res.success) {
        setSubscription(getUserSubscription());
        setPlanSuccessMsg(`🎉 ${res.message}`);
        setUserPromoInput('');
        setTimeout(() => setPlanSuccessMsg(''), 8000);
      }
    }, 250);
  };

  // Form State for Add Feed / News (inside Dashboard tab)
  const [newTitle, setNewTitle] = useState<string>('');
  const [newSummary, setNewSummary] = useState<string>('');
  const [newChannel, setNewChannel] = useState<string>('दैनिक भास्कर (Dainik Bhaskar)');
  const [newCategory, setNewCategory] = useState<string>('breaking');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [isBreaking, setIsBreaking] = useState<boolean>(true);
  const [isExclusive, setIsExclusive] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // RSS & Web Link Feed Sources (Channel -> Category -> URL)
  interface RssFeedSource {
    id: string;
    channelName: string;
    category: string;
    categoryName: string;
    url: string;
    isActive: boolean;
    lastSync: string;
  }

  const [rssSources, setRssSources] = useState<RssFeedSource[]>(() => {
    const sources = getAdminRssSources();
    return sources.map((s) => ({
      id: s.id,
      channelName: s.name,
      category: s.category || 'breaking',
      categoryName: s.category || 'ब्रेकिंग न्यूज़',
      url: s.url,
      isActive: s.isActive,
      lastSync: s.lastFetchedAt ? `${Math.round((Date.now() - s.lastFetchedAt) / 60000)} मिनट पूर्व` : 'सक्रिय',
    }));
  });

  const [rssChannelInput, setRssChannelInput] = useState<string>('');
  const [rssCategoryInput, setRssCategoryInput] = useState<string>('breaking');
  const [rssUrlInput, setRssUrlInput] = useState<string>('');
  const [rssSuccessMsg, setRssSuccessMsg] = useState<string>('');

  const handleAddRssSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rssChannelInput.trim() || !rssUrlInput.trim()) return;

    const catObj = (categories || []).find((c) => c.id === rssCategoryInput);
    const urlLower = rssUrlInput.trim().toLowerCase();
    const isWebType = !urlLower.includes('.xml') && !urlLower.includes('rss') && !urlLower.includes('feed');

    // Add source to system manager & trigger backend live sync
    addAdminRssSource(
      rssChannelInput.trim(),
      rssUrlInput.trim(),
      isWebType ? 'web' : 'rss',
      catObj?.name || 'देश'
    );

    syncAllSourcesLive().then(() => {
      window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
    });

    setRssChannelInput('');
    setRssUrlInput('');
    setRssSuccessMsg('नया RSS / वेब लिंक स्रोत सफलतापूर्वक जोड़ा गया और होम फ़ीड में लाइव सिंक हो गया!');
    setTimeout(() => setRssSuccessMsg(''), 4000);
  };

  const handleToggleRssSource = (id: string) => {
    toggleAdminRssSource(id);
    syncAllSourcesLive();
  };

  const handleDeleteRssSource = (id: string) => {
    deleteAdminRssSource(id);
    syncAllSourcesLive();
  };

  const handleSyncRssSource = (source: any) => {
    setRssSuccessMsg(`${source.channelName || source.name || 'स्रोत'} का लाइव सिंक प्रारंभ हो रहा है...`);
    syncAllSourcesLive().then((res) => {
      window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
      setRssSuccessMsg(`✅ ${source.channelName || source.name || 'स्रोत'} का लाइव सिंक पूर्ण हो गया! (${res.totalNewItems || 0} ताज़ा समाचार फ़ीड में जुड़े)`);
      setTimeout(() => setRssSuccessMsg(''), 4000);
    });
  };

  const [reporterDistrict, setReporterDistrict] = useState<string>(() => currentUser?.district || 'भोपाल / सेंट्रल डेस्क');
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState<boolean>(false);

  // Sync profile when updated externally (e.g. from ChannelOnboardingModal)
  useEffect(() => {
    const handleProfileSync = () => {
      const saved = localStorage.getItem('user_channel_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const normalized: ChannelProfile = {
            ...DEFAULT_PROFILE,
            ...parsed,
            socialIcons: { ...DEFAULT_SOCIAL_ICONS, ...(parsed.socialIcons || {}) },
          };
          setChannelProfile(normalized);
          if (parsed.customHeaderPng !== undefined) setCustomHeaderPng(parsed.customHeaderPng);
          if (parsed.customFooterPng !== undefined) setCustomFooterPng(parsed.customFooterPng);
        } catch {}
      }
    };
    window.addEventListener('channel_profile_updated', handleProfileSync);
    window.addEventListener('storage', handleProfileSync);
    return () => {
      window.removeEventListener('channel_profile_updated', handleProfileSync);
      window.removeEventListener('storage', handleProfileSync);
    };
  }, []);

  // Sync RSS sources list in real time when updated by admin
  useEffect(() => {
    const syncRss = () => {
      const sources = getAdminRssSources();
      const mapped = sources.map((s) => ({
        id: s.id,
        channelName: s.name,
        category: s.category || 'breaking',
        categoryName: s.category || 'ब्रेकिंग न्यूज़',
        url: s.url,
        isActive: s.isActive,
        lastSync: s.lastFetchedAt ? `${Math.round((Date.now() - s.lastFetchedAt) / 60000)} मिनट पूर्व` : 'सक्रिय',
      }));
      setRssSources(mapped);
    };
    syncRss();
    window.addEventListener('ai_news_admin_rss_sources_updated', syncRss);
    return () => window.removeEventListener('ai_news_admin_rss_sources_updated', syncRss);
  }, []);

  // 4:5 Custom Frames State for PRO & VIP DESK
  const [customFramesList, setCustomFramesList] = useState<CustomFrameItem[]>(() =>
    getCustomFrames(currentUser?.email)
  );
  const [activeFrameId, setActiveFrameId] = useState<string | null>(() => getActiveCustomFrameId());
  const [newFrameName, setNewFrameName] = useState<string>('');
  const [newFrameAsset, setNewFrameAsset] = useState<string>('');
  const [frameUploadError, setFrameUploadError] = useState<string>('');

  useEffect(() => {
    const handleFramesUpdate = () => {
      setCustomFramesList(getCustomFrames(currentUser?.email));
      setActiveFrameId(getActiveCustomFrameId());
    };
    window.addEventListener('ai_news_custom_frames_updated', handleFramesUpdate);
    return () => window.removeEventListener('ai_news_custom_frames_updated', handleFramesUpdate);
  }, [currentUser?.email]);

  const handleCustomFrameFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFrameUploadError('कृपया वैध इमेज (PNG/JPG) फ़ाइल चुनें');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewFrameAsset(reader.result);
          setFrameUploadError('');
          if (!newFrameName) {
            setNewFrameName(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomFrameItem = () => {
    if (!newFrameAsset) {
      setFrameUploadError('कृपया 4:5 कस्टम फ्रेम फ़ाइल चुनें');
      return;
    }
    const saved = saveCustomFrame({
      userId: currentUser?.email || 'user',
      name: newFrameName.trim() || 'कस्टम 4:5 फ्रेम',
      assetUrl: newFrameAsset,
    });
    setCustomFramesList(getCustomFrames(currentUser?.email));
    setActiveFrameId(saved.id);
    setNewFrameName('');
    setNewFrameAsset('');
    setFrameUploadError('');
    showToast('✨ 4:5 कस्टम फ्रेम सफलतापूर्वक सहेजा गया!');
  };

  // Custom Header & Custom Footer PNG states (PRO & VIP DESK exclusive)
  const [customHeaderPng, setCustomHeaderPng] = useState<string>(() => {
    try {
      const confStr = localStorage.getItem('profile_header_footer_json');
      if (confStr) {
        const c = JSON.parse(confStr);
        return c.customHeaderPng || c.templates?.graphic_001?.customHeaderPng || '';
      }
    } catch {}
    return (channelProfile as any).customHeaderPng || '';
  });

  const [customFooterPng, setCustomFooterPng] = useState<string>(() => {
    try {
      const confStr = localStorage.getItem('profile_header_footer_json');
      if (confStr) {
        const c = JSON.parse(confStr);
        return c.customFooterPng || c.templates?.graphic_001?.customFooterPng || '';
      }
    } catch {}
    return (channelProfile as any).customFooterPng || '';
  });

  // Header PNG file upload handler
  const handleCustomHeaderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) setCustomHeaderPng(result);
    };
    reader.readAsDataURL(file);
  };

  // Footer PNG file upload handler
  const handleCustomFooterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) setCustomFooterPng(result);
    };
    reader.readAsDataURL(file);
  };

  // Modal state for JPG to Transparent PNG conversion
  const [isJpgModalOpen, setIsJpgModalOpen] = useState(false);
  const [jpgRawImage, setJpgRawImage] = useState('');
  const [jpgConvertedPng, setJpgConvertedPng] = useState('');
  const [jpgProcessing, setJpgProcessing] = useState(false);
  const [logoResetSuccess, setLogoResetSuccess] = useState('');
  const [gifUploadLoading, setGifUploadLoading] = useState(false);
  const [gifUploadError, setGifUploadError] = useState('');
  const [pngUploadLoading, setPngUploadLoading] = useState(false);

  // 1. PNG Primary Channel Logo Upload Handler
  const handlePngLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPngUploadLoading(true);
    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        let finalUrl = dataUrl;
        try {
          const res = await fetch(getApiUrl('/api/upload-logo'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl,
              logoType: 'png',
              username: channelProfile.username || currentUser?.username || 'admin',
            }),
          });
          const data = await res.json();
          if (data.success && data.logoUrl) {
            finalUrl = data.logoUrl;
          }
        } catch (err) {
          console.warn('PNG upload sync warning:', err);
        }
        const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
        setChannelProfile((prev) => {
          const updated = {
            ...prev,
            channelLogoPngUrl: finalUrl,
            channelLogoUrl: finalUrl,
            channelLogoType: 'png' as const,
          };
          try {
            localStorage.setItem('user_channel_profile', JSON.stringify(updated));
            localStorage.setItem('user_profile_data', JSON.stringify(updated));
            if (cleanEmail) {
              localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(updated));
            }
          } catch {}

          // Immediate server persistence across page refresh
          try {
            fetch(getApiUrl('/api/user-profile'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...updated,
                email: cleanEmail,
                channelLogoUrl: finalUrl,
                channelLogoPngUrl: finalUrl,
              }),
            }).catch(() => {});

            if (cleanEmail) {
              fetch(getApiUrl('/api/admin/update-user'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: cleanEmail,
                  updates: {
                    channelLogoUrl: finalUrl,
                    channelLogoPngUrl: finalUrl,
                  },
                }),
              }).catch(() => {});
            }
          } catch {}

          try {
            registerOrUpdateUser({
              email: cleanEmail || 'admin.ainewsmaker@gmail.com',
              name: updated.fullName || 'मुख्य संपादक',
              channelName: updated.channelNameHi,
              channelLogoUrl: finalUrl,
              username: updated.username,
              isLocked: !isAdmin,
            });
          } catch {}

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('channel_profile_updated', {
                detail: {
                  ...updated,
                  channelLogoUrl: finalUrl,
                  channelLogoPngUrl: finalUrl,
                },
              })
            );
          }
          return updated;
        });
        setPngUploadLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 2. GIF Channel Logo Upload Handler (Only for Video Feed! Preserves existing PNG Primary Logo)
  const handleGifLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGifUploadError('');
    if (!file.type.includes('gif') && !file.name.toLowerCase().endsWith('.gif')) {
      setGifUploadError('कृपया केवल मान्य GIF फाइल (.gif) अपलोड करें');
      return;
    }
    setGifUploadLoading(true);
    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      if (dataUrl) {
        let finalUrl = dataUrl;
        const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
        const cleanUserId = currentUser?.userId || cleanEmail;
        try {
          const res = await fetch(getApiUrl('/api/upload-logo'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl,
              logoType: 'gif',
              username: channelProfile.username || currentUser?.username || 'admin',
              email: cleanEmail,
              userId: cleanUserId,
            }),
          });
          const data = await res.json();
          if (data.success && data.logoUrl) {
            finalUrl = data.logoUrl;
          }
        } catch (err) {
          console.warn('GIF upload server sync warning:', err);
        }
        setChannelProfile((prev) => {
          const existingPng = prev.channelLogoPngUrl || (prev.channelLogoUrl?.endsWith('.gif') ? '' : prev.channelLogoUrl) || '/assets/ai_news_maker_logo.png';
          const updated = {
            ...prev,
            channelLogoGifUrl: finalUrl,
            // Crucial: Primary Logo stays PNG for all graphics!
            channelLogoUrl: existingPng,
            channelLogoPngUrl: existingPng,
          };
          try {
            localStorage.setItem('user_channel_profile', JSON.stringify(updated));
            localStorage.setItem('user_profile_data', JSON.stringify(updated));
            if (cleanEmail) {
              localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(updated));
            }
          } catch {}

          // Immediate server persistence across page refresh
          try {
            fetch(getApiUrl('/api/user-profile'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...updated,
                email: cleanEmail,
                channelLogoGifUrl: finalUrl,
              }),
            }).catch(() => {});
          } catch {}

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('channel_profile_updated', {
                detail: {
                  ...updated,
                  channelLogoGifUrl: finalUrl,
                },
              })
            );
          }
          return updated;
        });
        setGifUploadLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 2b. Remove GIF Logo (Immediately fallbacks Video Feed to PNG Primary Logo)
  const handleRemoveGifLogo = async () => {
    const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
    setChannelProfile((prev) => {
      const existingPng = prev.channelLogoPngUrl || (prev.channelLogoUrl?.endsWith('.gif') ? '' : prev.channelLogoUrl) || '/assets/ai_news_maker_logo.png';
      const updated = {
        ...prev,
        channelLogoGifUrl: undefined,
        channelLogoType: 'png' as const,
        channelLogoUrl: existingPng,
        channelLogoPngUrl: existingPng,
      };
      try {
        localStorage.setItem('user_channel_profile', JSON.stringify(updated));
        localStorage.setItem('user_profile_data', JSON.stringify(updated));
        if (cleanEmail) {
          localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(updated));
        }
      } catch {}

      try {
        fetch(getApiUrl('/api/user-profile'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...updated,
            email: cleanEmail,
            channelLogoGifUrl: '',
          }),
        }).catch(() => {});
      } catch {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('channel_profile_updated', {
            detail: {
              ...updated,
              channelLogoGifUrl: undefined,
            },
          })
        );
      }
      return updated;
    });
    try {
      await fetch(getApiUrl('/api/remove-gif-logo'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: channelProfile.username || currentUser?.username || 'admin',
        }),
      });
    } catch {}
  };

  // 3. Admin: JPG to Transparent PNG Converter
  const handleJpgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const raw = event.target?.result as string;
      if (raw) {
        setJpgRawImage(raw);
        processJpgToTransparentPng(raw);
      }
    };
    reader.readAsDataURL(file);
  };

  const processJpgToTransparentPng = (srcUrl: string) => {
    setJpgProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = srcUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 512;
      canvas.height = img.naturalHeight || 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setJpgProcessing(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;

      // Sample 4 corner pixels to detect background color
      const corners = [
        [0, 0],
        [canvas.width - 1, 0],
        [0, canvas.height - 1],
        [canvas.width - 1, canvas.height - 1],
      ];
      let bgR = 255, bgG = 255, bgB = 255;
      for (const [cx, cy] of corners) {
        const idx = (cy * canvas.width + cx) * 4;
        bgR = d[idx];
        bgG = d[idx + 1];
        bgB = d[idx + 2];
      }

      // Smooth background removal with threshold
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const dist = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
        if (dist < 40) {
          d[i + 3] = 0; // Fully transparent
        } else if (dist < 75) {
          const alpha = ((dist - 40) / 35) * 255;
          d[i + 3] = Math.round(alpha);
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const pngUrl = canvas.toDataURL('image/png', 1.0);
      setJpgConvertedPng(pngUrl);
      setJpgProcessing(false);
    };
    img.onerror = () => {
      setJpgProcessing(false);
    };
  };

  const handleConfirmSaveConvertedPng = () => {
    if (!jpgConvertedPng) return;
    setChannelProfile((prev) => ({
      ...prev,
      channelLogoPngUrl: jpgConvertedPng,
      channelLogoUrl: jpgConvertedPng,
      channelLogoType: 'png',
    }));
    setIsJpgModalOpen(false);
  };

  // 4. Admin: Per-user Logo Upload Reset
  const handleAdminResetLogo = async () => {
    const confirmed = window.confirm('क्या आप चैनल लोगो को डिफ़ॉल्ट पर रीसेट करना चाहते हैं?');
    if (!confirmed) return;
    const defaultLogo = '/assets/ai_news_maker_logo.png';
    setChannelProfile((prev) => ({
      ...prev,
      channelLogoUrl: defaultLogo,
      channelLogoPngUrl: undefined,
      channelLogoGifUrl: undefined,
      channelLogoType: 'png',
    }));
    try {
      await fetch('/api/admin/reset-user-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: channelProfile.username || currentUser?.username || 'admin' }),
      });
    } catch {}
    setLogoResetSuccess('लोगो सफलतापूर्वक रीसेट कर दिया गया!');
    setTimeout(() => setLogoResetSuccess(''), 3000);
  };

  // Legacy Logo file upload handler
  const handleLogoUpload = handlePngLogoUpload;

  // 1-Click Transparent PNG Generator (Removes solid/white background)
  const handleMakeLogoTransparent = () => {
    if (!channelProfile.channelLogoUrl) return;
    processJpgToTransparentPng(channelProfile.channelLogoUrl);
    setIsJpgModalOpen(true);
  };

  const handleSaveChannelBranding = async () => {
    // Check account uniqueness and restricted brands
    const uniqCheck = checkAccountUniqueness({
      username: channelProfile.username,
      websiteUrl: channelProfile.websiteUrl,
      channelName: channelProfile.channelNameHi,
      currentEmail: effectiveUser?.email || currentUser?.email,
    });
    if (!uniqCheck.valid) {
      alert(uniqCheck.error || 'यह यूज़रनेम, वेबसाइट या चैनल नाम उपयोग नहीं किया जा सकता!');
      return;
    }

    const isProOrVipUser = subscription.tier === 'professional' || subscription.tier === 'ultra' || isAdmin;
    const effectiveHeaderPng = isProOrVipUser ? customHeaderPng : '';
    const effectiveFooterPng = isProOrVipUser ? customFooterPng : '';

    const primaryPngLogo = channelProfile.channelLogoPngUrl || (channelProfile.channelLogoUrl?.endsWith('.gif') ? '' : channelProfile.channelLogoUrl) || '/assets/ai_news_maker_logo.png';
    const finalPhone = (channelProfile.whatsappNumber || channelProfile.mobileNumber || '').trim();

    const finalDistrict = (reporterDistrict || channelProfile.district || channelProfile.location || '').trim();

    const updatedProfile = {
      ...channelProfile,
      district: finalDistrict,
      location: finalDistrict,
      whatsappNumber: finalPhone,
      mobileNumber: finalPhone || channelProfile.mobileNumber,
      showWebsite: channelProfile.showWebsite !== false,
      showMobileNumber: channelProfile.showMobileNumber !== false,
      channelLogoUrl: primaryPngLogo,
      channelLogoPngUrl: primaryPngLogo,
      channelLogoGifUrl: channelProfile.channelLogoGifUrl || undefined,
      channelLogoType: 'png' as const,
      customHeaderPng: effectiveHeaderPng,
      customFooterPng: effectiveFooterPng,
      socialIcons: channelProfile.socialIcons || DEFAULT_SOCIAL_ICONS,
    };

    localStorage.setItem('user_channel_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('app_channel_name', channelProfile.channelNameHi);
    localStorage.setItem('app_channel_name_en', channelProfile.channelNameEn);
    localStorage.setItem('user_profile_data', JSON.stringify(updatedProfile));

    const cleanEmail = (effectiveUser?.email || currentUser?.email || '').toLowerCase().trim();
    if (cleanEmail) {
      localStorage.setItem(`user_profile_${cleanEmail}`, JSON.stringify(updatedProfile));
    }

    // Save into centralized profile_header_footer_json (Always PNG Primary Logo for Graphics)
    const headerFooterConfig = {
      applyToAll: true,
      customHeaderPng: effectiveHeaderPng,
      customFooterPng: effectiveFooterPng,
      templates: {
        graphic_001: {
          templateId: 'graphic_001',
          brandName: channelProfile.channelNameHi,
          brandTagline: channelProfile.channelNameEn,
          customLogoUrl: primaryPngLogo,
          customHeaderPng: effectiveHeaderPng,
          customFooterPng: effectiveFooterPng,
          socialHandle: channelProfile.username ? (channelProfile.username.startsWith('@') ? channelProfile.username : `@${channelProfile.username}`) : '',
          whatsappNumber: finalPhone,
          showWebsite: channelProfile.showWebsite !== false,
          showMobileNumber: channelProfile.showMobileNumber !== false,
          isConfigured: true,
        },
      },
    };
    localStorage.setItem('profile_header_footer_json', JSON.stringify(headerFooterConfig));

    // For non-admin users, lock profile status
    if (!isAdmin) {
      localStorage.setItem('is_channel_profile_locked', 'true');
    }

    // Register or sync user profile record in system database
    registerOrUpdateUser({
      name: channelProfile.fullName || currentUser?.name || 'संपादक',
      email: cleanEmail || 'user@ainewsmaker.online',
      channelName: channelProfile.channelNameHi,
      channelLogoUrl: primaryPngLogo,
      mobile: finalPhone || channelProfile.mobileNumber,
      username: channelProfile.username,
      district: finalDistrict,
      isLocked: !isAdmin,
    });

    // Sync to backend cloud server API so cloud domain retains updated branding & logo across refreshes
    try {
      const serverPayload = {
        ...updatedProfile,
        email: cleanEmail,
        fullName: channelProfile.fullName || currentUser?.name || 'संपादक',
        username: channelProfile.username,
        websiteUrl: channelProfile.websiteUrl,
        whatsappNumber: finalPhone,
        mobileNumber: finalPhone || channelProfile.mobileNumber,
        showWebsite: channelProfile.showWebsite !== false,
        showMobileNumber: channelProfile.showMobileNumber !== false,
        channelNameHi: channelProfile.channelNameHi,
        channelNameEn: channelProfile.channelNameEn,
        channelLogoUrl: primaryPngLogo,
        channelLogoPngUrl: primaryPngLogo,
        channelLogoGifUrl: channelProfile.channelLogoGifUrl || undefined,
        district: finalDistrict,
        location: finalDistrict,
        state: channelProfile.state || '',
        address: channelProfile.address || '',
        pincode: channelProfile.pincode || '',
        socialIcons: channelProfile.socialIcons || DEFAULT_SOCIAL_ICONS,
      };
      const res = await fetch(getApiUrl('/api/user-profile'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'master-admin',
          'x-user-role': isUserSuperAdmin(cleanEmail) ? 'superadmin' : (isAdmin ? 'admin' : 'reporter'),
          'x-admin-email': cleanEmail,
          'x-user-email': cleanEmail,
        },
        body: JSON.stringify(serverPayload),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'सर्वर पर प्रोफाइल सहेजने में समस्या आई');
      }
      const data = await res.json();
      if (data && data.profile) {
        const savedProf = data.profile;
        setChannelProfile((p) => ({
          ...p,
          ...savedProf,
          district: savedProf.district || savedProf.location || p.district,
          location: savedProf.location || savedProf.district || p.location,
          socialIcons: savedProf.socialIcons || p.socialIcons,
        }));
        if (savedProf.district || savedProf.location) {
          setReporterDistrict(savedProf.district || savedProf.location);
        }
      }
    } catch (err: any) {
      console.error('Cloud server sync error:', err);
      alert(`प्रोफाइल सहेजने में विफल: ${err.message || 'सर्वर पर सहेजने में समस्या आई'}`);
      return;
    }

    // Dispatch update event for active studio card
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('channel_profile_updated', {
          detail: {
            ...updatedProfile,
            channelLogoUrl: primaryPngLogo,
            channelLogoPngUrl: primaryPngLogo,
            channelLogoGifUrl: channelProfile.channelLogoGifUrl || undefined,
            customHeaderPng: effectiveHeaderPng,
            customFooterPng: effectiveFooterPng,
          },
        })
      );
    }

    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 3000);
  };

  // New Category input (inside Dashboard tab)
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Refresh subscription when tab loads
  useEffect(() => {
    setSubscription(getUserSubscription());
  }, [activeTab]);

  // Handle saving Primary Mobile Number permanently
  const handleSavePrimaryMobile = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileError('');
    const cleanNumber = mobileInput.trim().replace(/[^0-9]/g, '');
    if (cleanNumber.length !== 10) {
      setMobileError('कृपया वैध 10 अंकों का मोबाइल नंबर दर्ज करें (उदा. 9876543210)');
      return;
    }
    const success = savePrimaryMobileNumber(cleanNumber);
    if (success) {
      setSubscription(getUserSubscription());
      setMobileInput('');
      alert('✅ आपका प्राइमरी मोबाइल नंबर स्थायी रूप से सुरक्षित कर लिया गया है। अब इसे बदला नहीं जा सकेगा।');
    } else {
      setMobileError('प्राइमरी मोबाइल नंबर पहले से लॉक है अथवा अमान्य है।');
    }
  };

  // Handle Plan Upgrade
  const handleUpgradePlan = (tier: UserPlanTier) => {
    setUserPlanTier(tier);
    const updated = getUserSubscription();
    setSubscription(updated);
    const planDetail = PLAN_DETAILS.find((p) => p.id === tier);
    setPlanSuccessMsg(`🎉 बधाई! आपका "${planDetail?.nameHi}" सफलतापूर्वक सक्रिय हो गया है। ${tier !== 'basic' ? 'सभी ग्राफिक अब वॉटरमार्क रहित (No Watermark) एक्सपोर्ट होंगे।' : ''}`);
    setTimeout(() => setPlanSuccessMsg(''), 6000);
  };

  // Toggle Admin Test Mode
  const handleToggleTestMode = () => {
    const newState = !testModeEnabled;
    setTestModeEnabled(newState);
    setAdminTestMode(newState);
    setTestModeMsg(newState ? '🧪 एडमिन टेस्ट मोड सक्रिय (Test Sandbox Enabled)' : '🔴 लाइव प्रोडक्शन मोड सक्रिय');
    setTimeout(() => setTestModeMsg(''), 4000);
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddNewPost({
      title: newTitle.trim(),
      summary: newSummary.trim() || newTitle.trim(),
      sourceChannel: newChannel,
      sourceUrl: 'https://ainewsmaker.online',
      category: newCategory,
      categoryName: (categories || []).find((c) => c.id === newCategory)?.name || 'ताज़ा खबर',
      publishedTime: 'अभी-अभी',
      imageUrl: newImageUrl.trim() || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop',
      breaking: isBreaking,
      isExclusive: isExclusive,
    });

    setSubmitSuccess(true);
    setNewTitle('');
    setNewSummary('');
    setNewImageUrl('');
    setTimeout(() => setSubmitSuccess(false), 3000);
  };



  // Get active tier badge details
  const activePlanDetail = PLAN_DETAILS.find((p) => p.id === subscription.tier) || PLAN_DETAILS[0];

  const renderMembershipUpgradeSection = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* PROMO CODE REDEMPTION BOX (USER ONLY - HIDDEN IN ADMIN MODE) */}
            {!isAdmin && (
              <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/15 border-2 border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        <span>🎁 प्रोमो कोड रिडीम करें</span>
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded uppercase">
                          Instant Activation
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300">
                        यदि आपने ऑफ़लाइन/UPI पेमेंट किया है या आपके पास प्रोमो कोड है, तो यहाँ दर्ज करके तुरंत अपना प्लान एक्टिवेट करें।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input Form */}
                <form onSubmit={handleRedeemPromoCode} className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <input
                    type="text"
                    value={userPromoInput}
                    onChange={(e) => setUserPromoInput(e.target.value.toUpperCase())}
                    placeholder="उदा. PRO2026 या PRO-RIT2026-001"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono font-black text-amber-300 uppercase tracking-widest focus:outline-hidden focus:border-amber-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isRedeemingPromo || !userPromoInput.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isRedeemingPromo ? 'वेरीफाई हो रहा है...' : 'प्रोमो कोड अप्लाई करें'}</span>
                  </button>
                </form>

                {promoRedeemResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                      promoRedeemResult.success
                        ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-300'
                        : 'bg-red-950/90 border border-red-500 text-red-300'
                    }`}
                  >
                    {promoRedeemResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{promoRedeemResult.message}</span>
                  </div>
                )}
              </div>
            )}



            {/* SECTION 2: 4-TIER PLANS & UPGRADE (Basic, Advanced, Professional, Ultra) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg text-slate-950">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <span>मेंबरशिप प्लान व अपग्रेड</span>
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded">
                          4 यूज़र स्तर
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        बेसिक में 7 दिन फ्री ट्रायल व वॉटरमार्क, एडवांस/प्रो में वॉटरमार्क रहित फुल एचडी
                      </p>
                    </div>
                  </div>

                  {/* Active Plan Pill */}
                  <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">
                    <span>वर्तमान प्लान:</span>
                    <span className="text-amber-400 font-black">{activePlanDetail.nameHi}</span>
                  </div>
                </div>
              </div>

              {/* Watermark Status Alert Banner (User Only) */}
              {!isAdmin && (
                subscription.tier === 'basic' ? (
                  <div className="p-4 bg-amber-950/60 border border-amber-600/70 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-amber-300 uppercase">
                          बेसिक यूजर: 7 दिन का फ्री ट्रायल सक्रिय ({subscription.daysRemaining} दिन शेष)
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          बेसिक प्लान में आपके द्वारा बनाए गए सभी ग्राफिक पर <b>"AI News Maker App" वॉटरमार्क</b> रहेगा। वॉटरमार्क हटाने व 1080p Full HD के लिए कृपया नीचे दिए गए किसी भी प्लान में अपग्रेड करें।
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpgradePlan('advanced')}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shrink-0 shadow-lg cursor-pointer transition"
                    >
                      वॉटरमार्क हटाएं (अपग्रेड)
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-950/60 border border-emerald-600/70 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-xs font-black text-emerald-300 uppercase">
                        ✅ प्रीमियम सक्रिय ({activePlanDetail.nameHi})
                      </div>
                      <div className="text-xs text-emerald-100/90 mt-0.5">
                        आपके सभी कार्ड्स और वीडियो <b>100% वॉटरमार्क रहित (No Watermark)</b> व अल्ट्रा-शार्प क्वालिटी में रेंडर हो रहे हैं।
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* 4 Plan Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                {PLAN_DETAILS.map((plan) => {
                  const isCurrent = subscription.tier === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl p-4 border flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'bg-white dark:bg-slate-900 border-amber-500 dark:border-amber-400 shadow-xl shadow-amber-500/10 ring-2 ring-amber-400/40 text-slate-900 dark:text-white'
                          : plan.popular
                          ? 'bg-slate-950/90 border-blue-500/50 hover:border-blue-400'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isCurrent
                            ? 'bg-amber-400 text-slate-950'
                            : plan.popular
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {isCurrent ? 'सक्रिय (Active)' : plan.badge}
                        </span>

                        {plan.hasWatermark ? (
                          <span className="text-[9px] text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                            वॉटरमार्क रहेगा
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                            वॉटरमार्क रहित
                          </span>
                        )}
                      </div>

                      {/* Plan Name & Pricing */}
                      <div>
                        <h4 className="text-sm font-black text-white">{plan.nameHi}</h4>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 line-through font-bold">
                              {plan.regularPriceDisplay || (plan.id === 'basic' ? '₹2,999' : plan.id === 'advanced' ? '₹4,999' : plan.id === 'professional' ? '₹6,999' : '₹9,999')}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs">
                              Launching Offer ({plan.discountPercent || (plan.id === 'basic' ? 67 : plan.id === 'advanced' ? 50 : plan.id === 'professional' ? 40 : 35)}%)
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-amber-400">{plan.priceDisplay}</span>
                            <span className="text-[11px] text-slate-400">/{plan.period}</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 min-h-[32px] leading-tight">
                          {plan.tagline}
                        </p>

                        {/* Feature List */}
                        <div className="space-y-1.5 pt-3 border-t border-slate-800/80 my-3 text-[11px] text-slate-300">
                          {plan.features.map((feat, idx) => (
                            <div key={idx} className="leading-snug">
                              {feat}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Plan Action Button */}
                      <div className="pt-2">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab('plans_packages')}
                            className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition"
                            title="एडमिन मोड: प्लान सेटिंग्स प्रबंधित करें"
                          >
                            <Sliders className="w-3.5 h-3.5 text-amber-400" />
                            <span>⚙️ प्लान सेटिंग्स</span>
                          </button>
                        ) : isCurrent ? (
                          subscription.isPlanExpired || subscription.isTrialExpired ? (
                            <button
                              type="button"
                              onClick={() => handleUpgradePlan(plan.id)}
                              className="w-full py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>पुनः सक्रिय करें</span>
                            </button>
                          ) : (
                            <div className="w-full py-2 bg-slate-800 text-amber-300 text-center font-black text-xs rounded-xl border border-amber-400/40">
                              ✓ वर्तमान सक्रिय प्लान
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpgradePlan(plan.id)}
                            className={`w-full py-2 font-black text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              plan.id === 'basic'
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                : plan.id === 'advanced'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                                : plan.id === 'professional'
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                                : 'bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>{plan.id === 'basic' ? 'बेसिक पर स्विच करें' : 'अपग्रेड व सक्रिय करें'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
  );

  const renderProfileOnlyContent = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SECTION: CHANNEL & LOGO BRANDING */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">
                      चैनल व लोगो विवरण
                    </h3>
                    <p className="text-xs text-slate-400">
                      यह विवरण सीधे ग्राफिक डिजाइनिंग स्टूडियो के फुटर और कार्ड्स में सिंक होगा
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Preview & Dual Upload Section (PNG & GIF) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>🏷️</span>
                    <span>चैनल लोगो (PNG व GIF दोनों वास्तविक अपलोड विकल्प)</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    सक्रिय: {channelProfile.channelLogoType === 'gif' ? '🎬 GIF लोगो' : '📦 PNG लोगो'}
                  </span>
                </div>

                {logoResetSuccess && (
                  <div className="p-2 bg-emerald-950/80 border border-emerald-500/80 rounded-lg text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{logoResetSuccess}</span>
                  </div>
                )}

                {/* If user profile is locked, show locked display card. Otherwise, show upload options */}
                {/* PNG & GIF Logo Management Cards */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* CARD 1: PNG CHANNEL LOGO (प्राइमरी लोगो) */}
                    <div className="p-3.5 rounded-xl border transition-all bg-amber-500/10 border-amber-400/80 shadow-md ring-1 ring-amber-400/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                          <span>📦</span>
                          <span>PNG CHANNEL LOGO (प्राइमरी लोगो)</span>
                        </span>
                        {isLogoLocked ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-700">
                            🔒 One-Time Locked
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-400 text-black font-extrabold">
                            सभी ग्राफिक्स में
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          <img
                            src={channelProfile.channelLogoPngUrl || (channelProfile.channelLogoUrl?.endsWith('.gif') ? '' : channelProfile.channelLogoUrl) || '/assets/ai_news_maker_logo.png'}
                            alt="PNG Logo"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {isLogoLocked ? (
                            <div>
                              <p className="text-[10px] text-slate-300 font-semibold mb-1">
                                {channelProfile.channelNameHi || 'आपका चैनल'}
                              </p>
                              {logoReqStatus === 'pending' ? (
                                <div className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/60 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                  <span>अनुरोध एडमिन के पास लंबित है</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLogoReqType('logo');
                                    setLogoReqReason('नया आधिकारिक चैनल लोगो अपडेट करना है');
                                    setNewRequestedLogoUrl('');
                                    setIsLogoReqModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-[11px] rounded-lg shadow cursor-pointer transition flex items-center gap-1.5 active:scale-95"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                                  <span>लोगो बदलने हेतु अनुरोध</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold rounded-lg cursor-pointer transition">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{pngUploadLoading ? 'अपलोड हो रहा है...' : 'PNG लोगो अपलोड'}</span>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/webp"
                                  onChange={handlePngLogoUpload}
                                  className="hidden"
                                />
                              </label>
                              <p className="text-[10px] text-slate-400">
                                सामान्य ग्राफिक्स, ई-पेपर व पोस्टर्स का प्राइमरी लोगो
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: GIF CHANNEL LOGO (केवल वीडियो फीड - प्रथम बार सीधा अपलोड, बाद में अनुरोध) */}
                    <div className={`p-3.5 rounded-xl border transition-all ${
                      channelProfile.channelLogoGifUrl
                        ? 'bg-red-500/10 border-red-500/80 shadow-md ring-1 ring-red-500/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                          <span>🎬</span>
                          <span>GIF CHANNEL LOGO (केवल वीडियो फीड)</span>
                        </span>
                        {channelProfile.channelLogoGifUrl ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                            सक्रिय GIF ✓
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            PNG फॉलबैक
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-700 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {channelProfile.channelLogoGifUrl ? (
                            <img
                              src={channelProfile.channelLogoGifUrl}
                              alt="GIF Logo"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Film className="w-6 h-6 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Part B: First-time direct upload without admin request; subsequent replacements require admin change request */}
                          {!channelProfile.channelLogoGifUrl ? (
                            <>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/40 text-xs font-bold rounded-lg cursor-pointer transition">
                                <Upload className="w-3.5 h-3.5" />
                                <span>{gifUploadLoading ? 'अपलोड हो रहा है...' : 'GIF लोगो अपलोड (प्रथम बार सीधा अपलोड)'}</span>
                                <input
                                  type="file"
                                  accept="image/gif,.gif"
                                  onChange={handleGifLogoUpload}
                                  className="hidden"
                                />
                              </label>
                              <p className="text-[10px] text-slate-400">
                                नए यूज़र पहली बार सीधे एनिमेटेड GIF अपलोड कर सकते हैं
                              </p>
                            </>
                          ) : (
                            <div>
                              <p className="text-[10px] text-emerald-400 font-medium mb-1">
                                ✅ वीडियो फीड में एनिमेटेड GIF सक्रिय
                              </p>
                              {gifReqStatus === 'pending' ? (
                                <div className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/60 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                  <span>GIF बदलने का अनुरोध लंबित है</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLogoReqType('gif');
                                    setLogoReqReason('नया आधिकारिक चैनल GIF अपडेट करना है');
                                    setNewRequestedLogoUrl('');
                                    setIsLogoReqModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 text-white font-black text-[11px] rounded-lg shadow cursor-pointer transition flex items-center gap-1.5 active:scale-95"
                                >
                                  <Film className="w-3.5 h-3.5 shrink-0" />
                                  <span>GIF बदलने के लिए अनुरोध करें</span>
                                </button>
                              )}
                              <p className="text-[10px] text-slate-400 mt-1">
                                स्वीकृति तक वर्तमान GIF सक्रिय रहेगा
                              </p>
                            </div>
                          )}

                          {gifUploadError && (
                            <p className="text-[10px] text-red-400 font-bold">{gifUploadError}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Channel Branding Action Bar */}
                  {(!isLogoLocked || isAdmin) && (
                    <div className="pt-3 pb-1 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="text-xs text-slate-300 flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>
                          {channelProfile.channelLogoGifUrl
                            ? '📦 सामान्य ग्राफिक्स: PNG लोगो | 🎬 वीडियो फीड: GIF लोगो'
                            : '📦 सभी ग्राफिक्स व वीडियो फीड: PNG प्राइमरी लोगो'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSaveChannelBranding}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl flex items-center gap-2 cursor-pointer transition active:scale-95 border border-amber-300 ring-2 ring-amber-400/20"
                      >
                        <Save className="w-4 h-4 text-slate-950 shrink-0" />
                        <span>
                          {saveSettingsSuccess
                            ? '✅ लोगो सुरक्षित! स्टूडियो में लागू हो गया'
                            : '💾 चैनल लोगो सेव करें'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Admin / Utility Tools */}
                  {(!isLogoLocked || isAdmin) && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setIsJpgModalOpen(true)}
                        className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                        title="JPG लोगो से बैकग्राउंड हटाकर पारदर्शी PNG बनाएं"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>JPG को PNG में बदलें</span>
                      </button>
                    </div>
                  )}
                </div>

              {/* लोगो / GIF बदलने हेतु एडमिन से अनुरोध Modal for Normal Users */}
              {isLogoReqModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${logoReqType === 'gif' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {logoReqType === 'gif' ? <Film className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-base">
                            {logoReqType === 'gif' ? 'GIF बदलने हेतु एडमिन से अनुरोध' : 'लोगो बदलने हेतु एडमिन से अनुरोध'}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {logoReqType === 'gif'
                              ? 'नया एनिमेटेड GIF (.gif) अपलोड करें और एडमिन स्वीकृति हेतु अनुरोध सबमिट करें'
                              : 'नया लोगो अपलोड करें और एडमिन स्वीकृति हेतु अनुरोध सबमिट करें'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLogoReqModalOpen(false)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Current & New Asset Preview Side-by-Side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Current Asset */}
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                          <span className="text-[11px] font-bold text-slate-400 block">
                            {logoReqType === 'gif' ? '1. वर्तमान चैनल GIF:' : '1. वर्तमान चैनल लोगो:'}
                          </span>
                          <div className="w-full h-24 bg-slate-900 rounded-lg border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                            <img
                              src={
                                logoReqType === 'gif'
                                  ? (channelProfile.channelLogoGifUrl || '/assets/ai_news_maker_logo.png')
                                  : (channelProfile.channelLogoPngUrl || (channelProfile.channelLogoUrl?.endsWith('.gif') ? '' : channelProfile.channelLogoUrl) || '/assets/ai_news_maker_logo.png')
                              }
                              alt="Current Asset"
                              className="max-h-20 w-auto object-contain"
                            />
                          </div>
                          <div className="text-[11px] text-slate-300 font-bold truncate">
                            {channelProfile.channelNameHi || 'वर्तमान चैनल'}
                          </div>
                        </div>

                        {/* 2. New Asset Upload & Preview */}
                        <div className={`p-3 bg-slate-950 rounded-xl border space-y-2 ${logoReqType === 'gif' ? 'border-red-500/40' : 'border-amber-500/40'}`}>
                          <span className={`text-[11px] font-bold block flex items-center justify-between ${logoReqType === 'gif' ? 'text-red-300' : 'text-amber-300'}`}>
                            <span>{logoReqType === 'gif' ? '2. नया GIF फ़ाइल (max 15MB):' : '2. नया लोगो:'}</span>
                            {newRequestedLogoUrl && (
                              <button
                                type="button"
                                onClick={() => setNewRequestedLogoUrl('')}
                                className="text-[10px] text-red-400 hover:underline"
                              >
                                हटाएं
                              </button>
                            )}
                          </span>
                          <div className="w-full h-24 bg-slate-900 rounded-lg border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                            {newRequestedLogoUrl ? (
                              <img
                                src={newRequestedLogoUrl}
                                alt="New Asset Preview"
                                className="max-h-20 w-auto object-contain"
                              />
                            ) : (
                              <div className="text-center text-slate-500 space-y-1">
                                {logoReqType === 'gif' ? <Film className="w-6 h-6 mx-auto opacity-60" /> : <ImageIcon className="w-6 h-6 mx-auto opacity-60" />}
                                <span className="text-[10px] block">{logoReqType === 'gif' ? 'GIF फ़ाइल चुनें' : 'लोगो फ़ाइल चुनें'}</span>
                              </div>
                            )}
                          </div>
                          <label className={`w-full py-1.5 px-2.5 border text-xs font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition ${
                            logoReqType === 'gif'
                              ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-300'
                              : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300'
                          }`}>
                            <Upload className="w-3.5 h-3.5" />
                            <span>{newRequestedLogoUrl ? (logoReqType === 'gif' ? 'GIF बदलें' : 'लोगो बदलें') : (logoReqType === 'gif' ? '📁 नया GIF चुनें' : '📁 नया लोगो चुनें')}</span>
                            <input
                              type="file"
                              accept={logoReqType === 'gif' ? 'image/gif,.gif' : 'image/png,image/jpeg,image/webp,image/*'}
                              onChange={handleNewRequestedLogoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Request Status Info if active */}
                      {((logoReqType === 'gif' ? gifReqStatus : logoReqStatus) !== 'none') && (
                        <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                          (logoReqType === 'gif' ? gifReqStatus : logoReqStatus) === 'pending'
                            ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                            : (logoReqType === 'gif' ? gifReqStatus : logoReqStatus) === 'approved'
                            ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                        }`}>
                          <span>वर्तमान स्थिति:</span>
                          <span>
                            {(logoReqType === 'gif' ? gifReqStatus : logoReqStatus) === 'pending'
                              ? '⏳ लंबित (Admin Review Underway)'
                              : (logoReqType === 'gif' ? gifReqStatus : logoReqStatus) === 'approved'
                              ? '✅ स्वीकृत (Approved)'
                              : '❌ अस्वीकृत (Rejected)'}
                          </span>
                        </div>
                      )}

                      {/* Reason Textarea */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {logoReqType === 'gif' ? 'GIF बदलने का कारण (Reason for GIF Change) *' : 'लोगो बदलने का कारण (Reason for Logo Change) *'}
                        </label>
                        <textarea
                          rows={2}
                          value={logoReqReason}
                          onChange={(e) => setLogoReqReason(e.target.value)}
                          placeholder={logoReqType === 'gif' ? 'यहाँ GIF बदलने का आधिकारिक कारण लिखें...' : 'यहाँ लोगो बदलने का आधिकारिक कारण लिखें...'}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500"
                        />
                      </div>

                      {/* Support Email & Central Contact Number Display */}
                      <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
                        <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>आधिकारिक सहायता व सत्यापन डेस्क:</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <a
                              href={`mailto:${APP_SUPPORT_CONFIG.supportEmail}`}
                              className="text-amber-300 hover:underline font-mono"
                            >
                              {APP_SUPPORT_CONFIG.supportEmail}
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <a
                              href={`tel:${APP_SUPPORT_CONFIG.supportPhone}`}
                              className="text-emerald-300 hover:underline font-mono font-bold"
                            >
                              {APP_SUPPORT_CONFIG.supportPhone}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsLogoReqModalOpen(false)}
                        disabled={isSubmittingLogoReq}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer transition disabled:opacity-50"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingLogoReq || !newRequestedLogoUrl || !logoReqReason.trim()}
                        onClick={async () => {
                          if (!newRequestedLogoUrl) {
                            alert(logoReqType === 'gif' ? 'कृपया नया GIF अपलोड करें।' : 'कृपया नया लोगो अपलोड करें।');
                            return;
                          }
                          if (!logoReqReason.trim()) {
                            alert('कृपया कारण दर्ज करें।');
                            return;
                          }
                          try {
                            setIsSubmittingLogoReq(true);
                            const currentUrl = logoReqType === 'gif'
                              ? channelProfile.channelLogoGifUrl
                              : (channelProfile.channelLogoPngUrl || channelProfile.channelLogoUrl);
                            await submitLogoChangeRequest(
                              currentUser?.email || '',
                              channelProfile.channelNameHi || '',
                              currentUrl,
                              logoReqReason.trim(),
                              newRequestedLogoUrl,
                              currentUser?.name || channelProfile.fullName || 'यूज़र',
                              channelProfile.username || currentUser?.username || '',
                              logoReqType
                            );
                            if (logoReqType === 'gif') {
                              setGifReqStatus('pending');
                            } else {
                              setLogoReqStatus('pending');
                            }
                            setIsLogoReqModalOpen(false);
                            alert(
                              logoReqType === 'gif'
                                ? '✅ आपका GIF बदलने का अनुरोध एडमिन को सफलतापूर्वक भेज दिया गया है। एडमिन द्वारा समीक्षा के बाद स्वीकृत होते ही आपका नया GIF स्वतः सक्रिय हो जाएगा। तब तक आपका वर्तमान GIF चालू रहेगा।'
                                : '✅ आपका लोगो बदलने का अनुरोध एडमिन को सफलतापूर्वक भेज दिया गया है। एडमिन द्वारा समीक्षा के बाद स्वीकृत होते ही आपका नया लोगो स्वतः सक्रिय हो जाएगा।'
                            );
                          } catch (err: any) {
                            console.error('Logo request error:', err);
                            alert('अनुरोध सबमिट करने में त्रुटि: ' + (err?.message || 'कृपया पुनः प्रयास करें।'));
                          } finally {
                            setIsSubmittingLogoReq(false);
                          }
                        }}
                        className={`px-5 py-2.5 font-black text-xs rounded-xl shadow-lg cursor-pointer transition active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          logoReqType === 'gif'
                            ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 text-white'
                            : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950'
                        }`}
                      >
                        {isSubmittingLogoReq ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>सबमिट हो रहा है...</span>
                          </>
                        ) : (
                          <span>अनुरोध सबमिट करें</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* JPG to Transparent PNG Modal */}
              {isJpgModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <h3 className="text-white font-bold text-base font-['Baloo_2']">
                          JPG को पारदर्शी PNG में बदलें
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsJpgModalOpen(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-xs text-slate-300">
                      किसी भी JPG इमेज से सॉलिड बैकग्राउंड हटाकर वास्तविक पारदर्शी (Transparent) PNG में कनवर्ट करें:
                    </p>

                    <div>
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 cursor-pointer">
                        <Upload className="w-4 h-4 text-purple-400" />
                        <span>JPG फ़ाइल चुनें</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg"
                          onChange={handleJpgFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Side-by-Side Comparison Preview */}
                    {(jpgRawImage || jpgConvertedPng) && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400 font-bold block">1. मूल JPG इमेज:</span>
                          <div className="w-full h-36 bg-black rounded-xl border border-slate-800 p-2 flex items-center justify-center overflow-hidden">
                            {jpgRawImage && <img src={jpgRawImage} alt="Raw JPG" className="max-w-full max-h-full object-contain" />}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[11px] text-emerald-400 font-bold block">2. पारदर्शी PNG प्रिव्यू:</span>
                          <div
                            className="w-full h-36 rounded-xl border border-emerald-500/60 p-2 flex items-center justify-center overflow-hidden"
                            style={{
                              backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                              backgroundSize: '12px 12px',
                              backgroundColor: '#0F172A',
                            }}
                          >
                            {jpgProcessing ? (
                              <span className="text-xs text-purple-300 font-bold animate-pulse">कनवर्ट हो रहा है...</span>
                            ) : jpgConvertedPng ? (
                              <img src={jpgConvertedPng} alt="Transparent PNG" className="max-w-full max-h-full object-contain" />
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsJpgModalOpen(false)}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSaveConvertedPng}
                        disabled={!jpgConvertedPng || jpgProcessing}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow disabled:opacity-40"
                      >
                        ✓ सत्यापित करें व PNG सेव करें
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Channel Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>चैनल का नाम (हिन्दी में) *</span>
                    {isLockedForUser && (
                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>स्थायी लॉक</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={channelProfile.channelNameHi}
                    readOnly={isLockedForUser}
                    onChange={(e) =>
                      !isLockedForUser &&
                      setChannelProfile((p) => ({ ...p, channelNameHi: e.target.value }))
                    }
                    placeholder="AI News Maker App"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold ${
                      isLockedForUser
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-300 cursor-not-allowed select-none'
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-hidden'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>चैनल का नाम (English में) *</span>
                    {isLockedForUser && (
                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>स्थायी लॉक</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={channelProfile.channelNameEn}
                    readOnly={isLockedForUser}
                    onChange={(e) =>
                      !isLockedForUser &&
                      setChannelProfile((p) => ({ ...p, channelNameEn: e.target.value }))
                    }
                    placeholder="AI News Maker"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold ${
                      isLockedForUser
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-300 cursor-not-allowed select-none'
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-hidden'
                    }`}
                  />
                </div>
              </div>

              {/* Registered Email Address (Gmail / Login ID) */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>पंजीकृत ईमेल आईडी (जीमेल)</span>
                  <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>सत्यापित खाता</span>
                  </span>
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-amber-300 select-all">
                  <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{currentUser?.email || effectiveUser?.email || 'Google Login Email'}</span>
                </div>
              </div>

              {/* District & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    संपादक / रिपोर्टर का जिला / शहर
                  </label>
                    <input
                      type="text"
                      value={reporterDistrict}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReporterDistrict(val);
                        setChannelProfile((p) => ({
                          ...p,
                          district: val,
                          location: val,
                        }));
                      }}
                      placeholder="भोपाल / सेंट्रल डेस्क"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden"
                    />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>सोशल यूज़रनेम (@username)</span>
                    {isLockedForUser && (
                      <span className="text-amber-400 text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>स्थायी लॉक</span>
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={channelProfile.username}
                    readOnly={isLockedForUser}
                    onChange={(e) =>
                      !isLockedForUser &&
                      setChannelProfile((p) => ({
                        ...p,
                        username: e.target.value.replace(/[^a-zA-Z0-9._]/g, ''),
                      }))
                    }
                    placeholder="ainewsmaker"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono ${
                      isLockedForUser
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-300 cursor-not-allowed select-none'
                        : 'bg-slate-950 border border-slate-700 text-white focus:border-amber-400 focus:outline-hidden'
                    }`}
                  />
                </div>
              </div>

              {/* Social Details: WhatsApp Number & Website (Primary Mobile is locked exclusively at the top of the profile) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">📱 WhatsApp नंबर (Social Usernames / फुटर)</span>
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelProfile.showMobileNumber}
                        onChange={(e) =>
                          setChannelProfile((p) => ({
                            ...p,
                            showMobileNumber: e.target.checked,
                          }))
                        }
                        className="rounded accent-emerald-500"
                      />
                      <span>फुटर में दिखाएं</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={channelProfile.whatsappNumber || channelProfile.mobileNumber || subscription.primaryMobile || ''}
                    onChange={(e) =>
                      setChannelProfile((p) => ({ ...p, whatsappNumber: e.target.value }))
                    }
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-emerald-400 focus:outline-hidden font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    * साइनअप के समय लिया गया WhatsApp नंबर यहाँ स्वतः उपलब्ध है। आप इसे कभी भी एडिट कर सकते हैं।
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      🌐 वेबसाइट का पता (Website Address)
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channelProfile.showWebsite !== false}
                        onChange={(e) =>
                          setChannelProfile((p) => ({
                            ...p,
                            showWebsite: e.target.checked,
                          }))
                        }
                        className="rounded accent-sky-500"
                      />
                      <span>फुटर में दिखाएं</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={channelProfile.websiteUrl}
                    onChange={(e) =>
                      setChannelProfile((p) => ({ ...p, websiteUrl: e.target.value }))
                    }
                    placeholder="ainewsmaker.online"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Social Media Icons Toggles */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-300">
                    फुटर में प्रदर्शित सोशल मीडिया आइकन्स
                  </label>
                  <span className="text-[10px] text-amber-300/80 font-medium">
                    * Facebook व Instagram अनिवार्य हैं
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'youtube', label: 'YouTube' },
                    { id: 'facebook', label: 'Facebook (Locked)', locked: true },
                    { id: 'instagram', label: 'Instagram (Locked)', locked: true },
                    { id: 'twitter', label: 'X (Twitter)' },
                    { id: 'linkedin', label: 'LinkedIn' },
                  ].map((soc) => {
                    const isMandatory = soc.id === 'facebook' || soc.id === 'instagram';
                    const isChecked = isMandatory || Boolean(((channelProfile?.socialIcons || DEFAULT_SOCIAL_ICONS) as any)[soc.id]);
                    return (
                      <button
                        key={soc.id}
                        type="button"
                        disabled={isMandatory}
                        onClick={() => {
                          if (isMandatory) return;
                          setChannelProfile((p) => {
                            const base = p || DEFAULT_PROFILE;
                            return {
                              ...base,
                              socialIcons: {
                                ...(base?.socialIcons || DEFAULT_SOCIAL_ICONS),
                                [soc.id]: !isChecked,
                              },
                            };
                          });
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition ${
                          isMandatory
                            ? 'bg-amber-500/25 border-amber-400 text-amber-300 cursor-not-allowed opacity-90'
                            : isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 cursor-pointer'
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 cursor-pointer'
                        }`}
                        title={isMandatory ? 'यह आइकन फुटर में अनिवार्य रूप से शामिल रहेगा' : undefined}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                        <span>{soc.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={handleSaveChannelBranding}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {saveSettingsSuccess
                      ? '✅ चैनल व लोगो विवरण सुरक्षित! स्टूडियो में लागू हो गया।'
                      : 'चैनल ब्रांडिंग सेव करें व स्टूडियो में लागू करें'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070D1E] text-slate-900 dark:text-slate-100 pb-28 transition-colors">
      {/* Top Header */}
      <div className="bg-white/95 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 sm:px-6 py-3 sm:py-4 shadow-sm dark:shadow-md sticky top-0 z-40 text-slate-900 dark:text-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-amber-500 to-red-600 rounded-xl text-slate-950 font-black shadow-lg shrink-0">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="text-sm sm:text-xl font-black text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">{isAdmin ? 'एडमिन कंट्रोल रूम' : 'मेरी प्रोफाइल व सेटिंग्स'}</span>
                {testModeEnabled && isAdmin && (
                  <span className="px-1.5 py-0.5 bg-purple-900/80 border border-purple-500 text-purple-200 text-[9px] sm:text-[10px] font-black rounded-full uppercase flex items-center gap-0.5 shrink-0">
                    <FlaskConical className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-400" />
                    टेस्ट
                  </span>
                )}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden sm:block">
                {isAdmin
                  ? 'एडमिन डैशबोर्ड, प्लान्स व पैकेज मैनेजर, टेम्पलेट कंट्रोल व RSS फीड्स'
                  : 'प्रोफाइल विवरण, 7-Day Free Trial Basic व प्रोमो कोड रिडीम'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Logout button */}
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="सुरक्षित रूप से लॉगआउट करें"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>लॉगआउट</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* User Identity & Active Plan Header Card */}
        {(() => {
          const formatTrialExpiryDate = (timestamp?: number): string => {
            if (!timestamp || isNaN(timestamp)) return '7 दिन बाद';
            try {
              const d = new Date(timestamp);
              return (
                d.toLocaleDateString('hi-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }) +
                ' ' +
                d.toLocaleTimeString('hi-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              );
            } catch {
              return 'सत्यापित';
            }
          };
          const displayUserName = currentUser?.name || channelProfile.fullName || 'यूज़र';
          const rawUsername = channelProfile.username || currentUser?.username || '';
          const displayUsername = rawUsername ? (rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`) : '';
          const displayLocation = reporterDistrict || channelProfile.location || currentUser?.district || '';
          const cleanEmail = (currentUser?.email || effectiveUser?.email || '').toLowerCase().trim();
          const isAinewsAdmin = cleanEmail === 'admin.ainewsmaker@gmail.com';
          const isBnwAdmin = cleanEmail === 'breakingnewswala.com@gmail.com';
          const displayEmail = currentUser?.email || (effectiveUser?.email && !effectiveUser.email.includes('editor@ainewsmaker') ? effectiveUser.email : (cleanEmail && !cleanEmail.includes('editor@ainewsmaker') ? cleanEmail : ''));
          const effectiveAvatarLogo =
            channelProfile.channelLogoPngUrl ||
            (channelProfile.channelLogoUrl?.endsWith('.gif') ? '' : channelProfile.channelLogoUrl) ||
            (isAinewsAdmin ? '/assets/ai_news_maker_logo.png' : (isBnwAdmin ? '/assets/breaking_news_wala_logo.png' : ''));

          return (
            <div className="bg-gradient-to-r from-white dark:from-slate-900 via-slate-50 dark:via-slate-800 to-white dark:to-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-900 dark:text-white">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left w-full sm:w-auto">
                {/* User Avatar / Channel Logo */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 p-1 flex items-center justify-center text-slate-950 font-black shadow-lg overflow-hidden shrink-0">
                  {effectiveAvatarLogo ? (
                    <img
                      src={effectiveAvatarLogo}
                      alt={displayUserName}
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <span className="text-2xl">{isAdmin ? '👑' : '📰'}</span>
                  )}
                </div>

                <div className="space-y-1.5 flex flex-col items-center sm:items-start">
                  {/* User Name & Admin Identity Icon (Theme-aware for Light & Dark mode) */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{displayUserName}</h2>
                    {isAdmin && (
                      <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border border-amber-300 flex items-center justify-center text-slate-950 font-black text-sm shadow-md" title="व्यवस्थापक">
                        👑
                      </span>
                    )}
                    {/* Active Plan Tier Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border shadow-xs ${
                      subscription.tier === 'basic'
                        ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-500/60 text-amber-800 dark:text-amber-300'
                        : subscription.tier === 'advanced'
                        ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-400 dark:border-blue-500/60 text-blue-800 dark:text-blue-300'
                        : subscription.tier === 'professional'
                        ? 'bg-purple-100 dark:bg-purple-950/80 border-purple-400 dark:border-purple-500/60 text-purple-800 dark:text-purple-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 dark:border-emerald-500/60 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      <Crown className="w-3 h-3" />
                      <span>{activePlanDetail.nameHi}</span>
                    </span>
                  </div>

                  {/* Clean Email Display (Theme-aware for Light & Dark mode) */}
                  {displayEmail && (
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-slate-700 dark:text-slate-200 font-mono font-medium">{displayEmail}</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-bold ml-1">
                        सत्यापित ID
                      </span>
                    </div>
                  )}

                  {/* Primary Mobile Status (Theme-aware for Light & Dark mode) */}
                  <div className="pt-1.5 flex items-center flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-emerald-700 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>प्राइमरी नंबर: +91 {subscription.primaryMobile || channelProfile.mobileNumber || '9876543210'}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      <Lock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>स्थायी लॉक</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-DAY FREE TRIAL / ACTIVE PLAN BOX (Replaced Right Side Mobile Badge) */}
              <div className="flex items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="w-full sm:w-72 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-slate-700/80 rounded-2xl p-3.5 sm:p-4 shadow-2xl flex flex-col gap-2.5 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                  {/* Header & Status Badge */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-white">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        {subscription.hasActivePaidPlan
                          ? `${subscription.planName} प्लान`
                          : '7-Day Free Trial'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {subscription.hasActivePaidPlan ? (
                        <span className="px-2 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black rounded-full shadow-xs">
                          सक्रिय
                        </span>
                      ) : subscription.isTrialExpired ? (
                        <span className="px-2 py-0.5 bg-red-950/90 border border-red-700 text-red-400 text-[10px] font-black rounded-full flex items-center gap-1 shadow-xs">
                          <Lock className="w-2.5 h-2.5" />
                          <span>समाप्त</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-950/90 border border-emerald-700 text-emerald-400 text-[10px] font-black rounded-full flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>सक्रिय</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="text-xs flex items-center justify-between gap-2">
                    <span className="text-slate-400">समाप्ति तिथि:</span>
                    <span className="font-mono font-bold text-white text-right">
                      {formatTrialExpiryDate(subscription.trialEndsAt || subscription.expiresAt)}
                    </span>
                  </div>

                  {/* Remaining Time */}
                  <div className="text-xs flex items-center justify-between gap-2">
                    <span className="text-slate-400">बचा हुआ समय:</span>
                    <span
                      className={`font-mono font-black text-right ${
                        subscription.hasActivePaidPlan
                          ? 'text-amber-300'
                          : subscription.isTrialExpired
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {subscription.hasActivePaidPlan
                        ? `${subscription.daysRemaining} दिन शेष`
                        : subscription.isTrialExpired
                        ? 'ट्रायल समाप्त (लॉक)'
                        : `${subscription.daysRemaining} दिन ${subscription.hoursRemaining ?? 0} घंटे ${subscription.minutesRemaining ?? 0} मिनट`}
                    </span>
                  </div>

                  {/* Daily Graphic Quota & Remaining Today - Only for regular non-admin users */}
                  {!isAdmin && (
                    <div className="pt-2 mt-1 border-t border-slate-800/80 space-y-1.5">
                      <div className="text-xs flex items-center justify-between gap-2">
                        <span className="text-slate-400">दैनिक डाउनलोड सीमा:</span>
                        <span className="font-mono font-bold text-amber-300 text-right">
                          {dailyQuotaStatus?.unlimited
                            ? 'असीमित (VIP DESK)'
                            : `${dailyQuotaStatus?.dailyQuota ?? (subscription.planKey === 'VIP DESK' ? 99999 : subscription.planKey === 'PRO' ? 50 : subscription.planKey === 'ADVANCE' ? 25 : 10)} ग्राफिक / दिन`}
                        </span>
                      </div>

                      <div className="text-xs flex items-center justify-between gap-2">
                        <span className="text-slate-400">आज के शेष ग्राफिक:</span>
                        <span className="font-mono font-black text-emerald-400 text-right text-xs sm:text-sm">
                          {dailyQuotaStatus?.unlimited
                            ? 'असीमित डाउनलोड'
                            : `${dailyQuotaStatus?.remainingToday ?? 10} ग्राफिक बाकी`}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between gap-2">
                        <span>कोटा रीसेट समय:</span>
                        <span className="font-mono text-slate-400">रात 12:00 AM (IST)</span>
                      </div>
                    </div>
                  )}

                  {/* Warning if expired without paid plan */}
                  {!subscription.hasActivePaidPlan && subscription.isTrialExpired && (
                    <div className="text-[10px] text-red-400/90 bg-red-950/40 border border-red-800/60 rounded-lg px-2 py-1 leading-tight">
                      ⚠️ डाउनलोड व कैप्शन सुविधा लॉक है। जारी रखने के लिए प्लान अपग्रेड करें।
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Global Plan Success Notice */}
        {planSuccessMsg && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-500 text-emerald-200 rounded-2xl flex items-center gap-3 shadow-xl animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-sm font-bold">{planSuccessMsg}</div>
          </div>
        )}


        {/* ADMIN vs NORMAL USER RENDER */}
        {isAdmin ? (
          <AdminPlansAndPackagesManager
            currentUser={currentUser}
            onPlanChanged={() => setTimeout(() => setSubscription(getUserSubscription()), 0)}
            onOpenStudio={onOpenStudio}
            renderProfileContent={renderProfileOnlyContent}
            categories={categories}
            onAddCategory={onAddCategory}
            onDeleteCategory={onDeleteCategory}
          />
        ) : (
          <div className="space-y-3.5">
            {/* OPTION 1: प्रोफाइल व चैनल विवरण */}
            <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'profile' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => setNormalUserTab(normalUserTab === 'profile' ? '' : 'profile')}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'profile' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                    <User className="w-5 h-5 text-slate-950" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-white block truncate">
                      प्रोफाइल व चैनल विवरण
                    </span>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      चैनल लोगो, नाम, प्राइमरी नंबर, सोशल लिंक्स व ब्रांडिंग विवरण
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'profile' ? 'rotate-180 text-amber-400' : ''}`} />
              </button>
              {normalUserTab === 'profile' && (
                <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
                  {renderProfileOnlyContent()}
                </div>
              )}
            </div>

            {/* OPTION 2: मेंबरशिप प्लान व अपग्रेड */}
            <div id="user-membership-accordion-section" className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'membership' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => setNormalUserTab(normalUserTab === 'membership' ? '' : 'membership')}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'membership' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                    <Crown className="w-5 h-5 text-slate-950" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-white block truncate">
                      मेंबरशिप प्लान व अपग्रेड
                    </span>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      वर्तमान प्लान, 7-डे फ्री ट्रायल, प्रोमो कोड रिडीम व अपग्रेड
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                    {activePlanDetail.nameHi}
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'membership' ? 'rotate-180 text-amber-400' : ''}`} />
                </div>
              </button>
              {normalUserTab === 'membership' && (
                <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
                  {renderMembershipUpgradeSection()}
                </div>
              )}
            </div>

            {/* OPTION 3: रिवॉर्ड्स व पॉइंट्स वॉलेट (Rewards & Points Wallet - Non-Admin Users Only) */}
            {!isAdmin && (
            <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'rewards_wallet' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => setNormalUserTab(normalUserTab === 'rewards_wallet' ? '' : 'rewards_wallet')}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'rewards_wallet' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                    <Coins className="w-5 h-5 text-slate-950" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 truncate">
                        <Coins className="w-4 h-4 text-amber-400 shrink-0 inline" />
                        <span>रिवॉर्ड्स व पॉइंट्स वॉलेट</span>
                      </span>
                      <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black rounded uppercase">
                        Rewards Wallet
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      बोनस न्यूज़ शेयर करें, स्क्रीनशॉट अपलोड करें और कॉइन्स कमाएं
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-mono font-bold rounded-lg border border-amber-500/40 flex items-center gap-1 shadow-xs">
                    <span>🪙</span>
                    <span>{walletData?.coinBalance ?? 0} Coins</span>
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'rewards_wallet' ? 'rotate-180 text-amber-400' : ''}`} />
                </div>
              </button>
              {normalUserTab === 'rewards_wallet' && (
                <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200 space-y-6">
                  {/* 1. THREE COIN BALANCE CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Card 1: Available Coins */}
                    <div className="bg-gradient-to-br from-amber-950/80 via-slate-900 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
                      <div>
                        <div className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-amber-400" />
                          <span>उपलब्ध कॉइन बैलेंस</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300 mt-1">
                          {walletData?.coinBalance ?? 0}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">रिडीमेबल वॉलेट बैलेंस</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 text-xl">
                        🪙
                      </div>
                    </div>

                    {/* Card 2: Pending Coins */}
                    <div className="bg-gradient-to-br from-yellow-950/60 via-slate-900 to-slate-900 border border-yellow-700/60 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
                      <div>
                        <div className="text-xs text-yellow-300 font-bold flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span>समीक्षाधीन कॉइन्स</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-yellow-300 mt-1">
                          {walletData?.pendingCoins ?? 0}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">एडमिन अप्रूवल की प्रतीक्षा में</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-300 shrink-0 text-xl">
                        ⏳
                      </div>
                    </div>

                    {/* Card 3: Total Earned */}
                    <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-700/60 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
                      <div>
                        <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-emerald-400" />
                          <span>कुल अर्जित रिवॉर्ड</span>
                        </div>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 mt-1">
                          {walletData?.totalEarnedCoins ?? 0}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">अब तक कमाए गए कुल कॉइन्स</p>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 text-xl">
                        🏆
                      </div>
                    </div>
                  </div>

                  {/* 2. HOW IT WORKS GUIDE */}
                  <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-md space-y-3">
                    <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>बोनस न्यूज़ शेयर करके कॉइन्स कैसे कमाएं?</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-mono font-bold">1</span>
                          <span>बोनस न्यूज़ डाउनलोड करें</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          होम स्क्रीन पर <strong>⭐ बोनस न्यूज़</strong> टैग वाले समाचार का न्यूज़ ग्राफिक बनाएं व डाउनलोड करें।
                        </p>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-mono font-bold">2</span>
                          <span>सोशल मीडिया पर पोस्ट करें</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          डाउनलोड किए गए ग्राफिक को अपने <strong>Instagram Story/Post, Facebook या WhatsApp Status</strong> पर शेयर करें।
                        </p>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px] font-mono font-bold">3</span>
                          <span>स्क्रीनशॉट अपलोड कर क्लेम करें</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          अपने पोस्ट का स्क्रीनशॉट यहाँ अपलोड करें। एडमिन अप्रूवल के बाद तुरंत वॉलेट में कॉइन्स क्रेडिट हो जाएंगे!
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3. HOW TO CLAIM DIRECTLY */}
                  <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-lg">
                    <div className="space-y-1.5 text-left">
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span>बोनस रिवॉर्ड क्लेम करने की प्रक्रिया</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                        होम फीड पर उपलब्ध बोनस खबरों का ग्राफिक डाउनलोड करें और सीधे उसे अपने सोशल मीडिया पर शेयर करें। उसके पश्चात उस ग्राफिक कार्ड में ‘बोनस क्लेम’ पर क्लिक करके वहाँ स्क्रीनशॉट शेयर करें और अपना बोनस क्लेम करें।
                      </p>
                    </div>
                  </div>

                  {/* 4. SUBMITTED CLAIMS STATUS HISTORY */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>सबमिट किए गए क्लेम का विवरण (क्लेम इतिहास)</span>
                      </h4>
                      <button
                        type="button"
                        onClick={fetchUserWallet}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>रिफ्रेश</span>
                      </button>
                    </div>

                    {walletClaims.length === 0 ? (
                      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
                        आपने अभी तक कोई क्लेम सबमिट नहीं किया है।
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {walletClaims.map((claim) => {
                          const urls = (Array.isArray((claim as any).screenshotUrls) && (claim as any).screenshotUrls.length > 0)
                            ? (claim as any).screenshotUrls
                            : (claim.screenshotUrl ? [claim.screenshotUrl] : []);
                          return (
                            <div
                              key={claim.id}
                              className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                {urls.length > 0 ? (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {urls.map((sUrl: string, sIdx: number) => (
                                      <a
                                        key={sIdx}
                                        href={sUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative group block"
                                        title={`स्क्रीनशॉट #${sIdx + 1} देखें`}
                                      >
                                        <img
                                          src={sUrl}
                                          alt={`Proof ${sIdx + 1}`}
                                          className="w-12 h-12 object-cover rounded-lg border border-slate-700 group-hover:border-amber-400 transition"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs sm:text-sm font-bold text-white truncate max-w-xs">
                                      {claim.postTitle || 'बोनस समाचार'}
                                    </span>
                                    <span className="text-[11px] font-mono font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/80">
                                      🪙 +{claim.rewardCoins} कॉइन्स
                                    </span>
                                  </div>
                                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>सबमिट: {new Date(claim.createdAt).toLocaleDateString('hi-IN')}</span>
                                    {claim.reviewedAt && (
                                      <span>• समीक्षा: {new Date(claim.reviewedAt).toLocaleDateString('hi-IN')}</span>
                                    )}
                                  </div>
                                  {claim.status === 'rejected' && claim.rejectionReason && (
                                    <div className="text-[11px] text-red-300 bg-red-950/50 border border-red-900/60 rounded px-2 py-0.5 mt-1">
                                      कारण: {claim.rejectionReason}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0 self-end sm:self-center">
                                {claim.status === 'pending' && (
                                  <span className="px-2.5 py-1 bg-yellow-950/80 border border-yellow-700 text-yellow-300 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                                    <Clock className="w-3 h-3 text-yellow-400" />
                                    <span>समीक्षाधीन (प्रतीक्षारत)</span>
                                  </span>
                                )}
                                {claim.status === 'approved' && (
                                  <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>स्वीकृत (+{claim.rewardCoins} कॉइन्स जुड़े)</span>
                                  </span>
                                )}
                                {claim.status === 'rejected' && (
                                  <span className="px-2.5 py-1 bg-red-950/80 border border-red-700 text-red-300 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
                                    <AlertCircle className="w-3 h-3 text-red-400" />
                                    <span>अस्वीकृत</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 5. WALLET TRANSACTIONS LOG */}
                  <div className="space-y-3 border-t border-slate-800/80 pt-4">
                    <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span>वॉलेट लेन-देन विवरण</span>
                    </h4>

                    {walletTransactions.length === 0 ? (
                      <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl text-center text-xs text-slate-400">
                        वॉलेट में अभी तक कोई लेन-देन दर्ज नहीं हुआ है।
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {walletTransactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-white truncate">{tx.description}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(tx.createdAt).toLocaleString('hi-IN')}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div
                                className={`font-mono font-black ${
                                  tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {tx.type === 'credit' ? `+${tx.amount}` : `-${tx.amount}`} कॉइन्स
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                बैलेंस: {tx.balanceAfter}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* OPTION: सब-यूज़र प्रबंधन (Sub-Users Management - Section 10) */}
            <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'sub_users' ? 'border-cyan-400 bg-slate-900/95 ring-2 ring-cyan-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => {
                  const nextTab = normalUserTab === 'sub_users' ? '' : 'sub_users';
                  setNormalUserTab(nextTab);
                  if (nextTab === 'sub_users') {
                    fetchSubUsers();
                  }
                }}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'sub_users' ? 'bg-gradient-to-r from-cyan-950 via-slate-900 to-blue-950 border-b border-cyan-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                    <span>👥</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black text-white block truncate">
                        सब-यूज़र प्रबंधन (Sub-Users Management)
                      </span>
                      <span className="px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-[10px] font-black rounded uppercase">
                        PRO (1) & VIP DESK (3)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      अपने न्यूज़ चैनल / डेस्क के लिए अधिकृत सब-रिपोर्टर ईमेल जोड़ें व प्रबंधित करें
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {subUsersList.length > 0 && (
                    <span className="px-2.5 py-1 bg-slate-950 text-cyan-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                      {subUsersList.length} सक्रिय
                    </span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'sub_users' ? 'rotate-180 text-cyan-400' : ''}`} />
                </div>
              </button>
              {normalUserTab === 'sub_users' && (
                <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200 space-y-5">
                  {/* Parent account notice if current user is a linked sub-user */}
                  {subUserParentEmail && (
                    <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-xl text-xs text-blue-200 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>आप <strong>{subUserParentEmail}</strong> के अधिकृत सब-यूज़र (Sub-User) के रूप में जुड़े हुए हैं।</span>
                    </div>
                  )}

                  {/* Tier status bar */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">वर्तमान प्लान स्थिति</div>
                      <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                        <span>{subscription?.planName || 'Basic Plan'}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                          अनुमति सीमा: {subUsersMaxLimit} सब-यूज़र
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      सक्रिय सब-यूज़र: <span className="font-mono font-bold text-cyan-400">{subUsersList.length}</span> / {subUsersMaxLimit}
                    </div>
                  </div>

                  {subUsersMaxLimit <= 0 && !isAdmin ? (
                    /* Basic / Advanced locked message */
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-amber-950/20 border border-amber-600/40 space-y-3">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                        <div>
                          <h4 className="text-sm font-black text-white">सब-यूज़र सुविधा आपके प्लान में सम्मिलित नहीं है</h4>
                          <p className="text-xs text-slate-300 mt-0.5">
                            Basic और Advanced प्लान्स में सब-यूज़र जोड़ने की अनुमति नहीं है।
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5">
                        <div className="font-semibold text-amber-300">सब-यूज़र लाभ:</div>
                        <ul className="list-disc pl-5 space-y-1 text-slate-400">
                          <li><span className="text-white font-bold">Pro Plan:</span> 1 सब-यूज़र (1 अतिरिक्त रिपोर्टर लॉगिन)</li>
                          <li><span className="text-white font-bold">VIP Desk:</span> 3 सब-यूज़र (3 अतिरिक्त रिपोर्टर लॉगिन)</li>
                          <li>सब-यूज़र आपके चैनल प्रोफ़ाइल और ब्रांडिंग के साथ सीधे काम कर सकते हैं।</li>
                        </ul>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNormalUserTab('membership');
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-2"
                      >
                        <Crown className="w-4 h-4" />
                        <span>प्लान अपग्रेड करें</span>
                      </button>
                    </div>
                  ) : (
                    /* Pro / VIP / Admin management interface */
                    <div className="space-y-5">
                      {/* Add sub-user form */}
                      {subUsersList.length < subUsersMaxLimit ? (
                        <form onSubmit={handleInviteSubUser} className="p-4 rounded-xl bg-slate-900 border border-cyan-900/40 space-y-3">
                          <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-cyan-400" />
                            <span>नया सब-यूज़र जोड़ें</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                सब-यूज़र का ईमेल (Google Email) *
                              </label>
                              <input
                                type="email"
                                required
                                value={subUserEmailInput}
                                onChange={(e) => setSubUserEmailInput(e.target.value)}
                                placeholder="reporter@example.com"
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                                रिपोर्टर / सब-यूज़र का नाम (वैकल्पिक)
                              </label>
                              <input
                                type="text"
                                value={subUserNameInput}
                                onChange={(e) => setSubUserNameInput(e.target.value)}
                                placeholder="रिपोर्टर नाम"
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white outline-none"
                              />
                            </div>
                          </div>
                          {subUserError && (
                            <div className="p-2.5 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                              <span>{subUserError}</span>
                            </div>
                          )}
                          {subUserSuccess && (
                            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                              <span>{subUserSuccess}</span>
                            </div>
                          )}
                          <div className="flex justify-end pt-1">
                            <button
                              type="submit"
                              disabled={isInvitingSubUser}
                              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-2"
                            >
                              {isInvitingSubUser ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                              <span>सब-यूज़र जोड़ें</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs text-cyan-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>आपने अपनी अधिकतम सीमा ({subUsersMaxLimit} सब-यूज़र) पूरी कर ली है। नया सब-यूज़र जोड़ने के लिए पहले किसी मौजूदा सब-यूज़र को हटाएं या VIP Desk में अपग्रेड करें।</span>
                        </div>
                      )}

                      {/* Sub-users list */}
                      <div className="space-y-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-cyan-400" />
                          <span>संबद्ध सब-यूज़र सूची ({subUsersList.length})</span>
                        </h4>
                        {subUsersList.length === 0 ? (
                          <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl text-center text-xs text-slate-400">
                            अभी तक कोई सब-यूज़र नहीं जोड़ा गया है। ऊपर दिए गए फॉर्म से सब-यूज़र का ईमेल दर्ज करें।
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                            {subUsersList.map((sub, idx) => (
                              <div key={sub.id || idx} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                                <div className="min-w-0">
                                  <div className="font-bold text-white flex items-center gap-2">
                                    <span className="truncate">{sub.subUserEmail}</span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                                      सक्रिय (Active)
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                                    {sub.subUserName && <span>नाम: {sub.subUserName}</span>}
                                    <span>जोड़ा गया: {new Date(sub.createdAt).toLocaleDateString('hi-IN')}</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubUser(sub.id)}
                                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                                  title="सब-यूज़र हटाएं"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* OPTION FOR PRO / VIP / ADMIN: टेम्प्लेट व कस्टम फ्रेम्स मैनेजर */}
            {canAccessTemplateManager(currentUser) && (
              <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'templates_manager' ? 'border-purple-400 bg-slate-900/95 ring-2 ring-purple-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
                <button
                  type="button"
                  onClick={() => setNormalUserTab(normalUserTab === 'templates_manager' ? '' : 'templates_manager')}
                  className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'templates_manager' ? 'bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border-b border-purple-800/80' : 'hover:bg-slate-850'}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                      <span>🎨</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-white block truncate">
                          टेम्प्लेट व कस्टम फ्रेम्स मैनेजर
                        </span>
                        <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-amber-500 text-slate-950 text-[10px] font-black rounded uppercase">
                          PRO & VIP DESK
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        कस्टम 4:5 फ्रेम्स व टेम्प्लेट्स देखें, नए बनाएं या डिलीट करें
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'templates_manager' ? 'rotate-180 text-purple-400' : ''}`} />
                </button>
                {normalUserTab === 'templates_manager' && (
                  <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
                    <UserTemplateManager
                      currentUser={currentUser}
                      isAdmin={isAdmin}
                      onOpenStudioWithTemplate={onOpenStudio}
                    />
                  </div>
                )}
              </div>
            )}

            {/* OPTION 4: सहायता एवं नीतियाँ */}
            <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${normalUserTab === 'policies' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
              <button
                type="button"
                onClick={() => setNormalUserTab(normalUserTab === 'policies' ? '' : 'policies')}
                className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${normalUserTab === 'policies' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-white block truncate">
                      सहायता एवं नीतियाँ
                    </span>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      प्राइवेसी पॉलिसी, नियम एवं शर्तें, पेमेंट्स व प्लान्स नीतियाँ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                    3 नीतियां
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${normalUserTab === 'policies' ? 'rotate-180 text-amber-400' : ''}`} />
                </div>
              </button>
              {normalUserTab === 'policies' && (
                <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
                  <HelpAndPoliciesView />
                </div>
              )}
            </div>

            {/* OPTION 5: लॉगआउट */}
            <div className="rounded-2xl border border-red-900/60 bg-red-950/20 overflow-hidden shadow-lg">
              <button
                type="button"
                onClick={onLogout}
                className="w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 hover:bg-red-950/40"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                    <LogOut className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-black text-red-200 block truncate">
                      लॉगआउट
                    </span>
                    <p className="text-xs text-red-400/80 truncate mt-0.5">
                      सुरक्षित रूप से अपने खाते से बाहर निकलें
                    </p>
                  </div>
                </div>
                <LogOut className="w-5 h-5 text-red-400 shrink-0" />
              </button>
            </div>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border border-amber-500/50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toastMsg}
        </div>
      )}
    </div>
  );
};

