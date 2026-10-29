import React, { useState, useEffect } from 'react';
import {
  Package,
  Ticket,
  Users,
  Plus,
  Copy,
  Check,
  Trash2,
  Power,
  Search,
  Sparkles,
  ShieldCheck,
  Crown,
  Zap,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Edit2,
  Save,
  X,
  CreditCard,
  Lock,
  Unlock,
  Layers,
  Upload,
  Globe,
  Phone,
  Image,
  Sliders,
  Rss,
  Link2,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  Key,
  Send,
  Hash,
  ChevronDown,
  ChevronRight,
  FolderTree,
  PlusCircle,
  AlertTriangle,
  FileSpreadsheet,
  Ban,
  UserCheck,
  Download,
  Coins,
  Award,
  Loader2,
  Music,
  User,
  Bell,
} from 'lucide-react';
import {
  isUserMasterAdmin,
  isUserSuperAdmin,
  isEffectiveSuperAdmin,
  syncCloudUsers,
  adminUpdateCloudUser,
  adminDeleteCloudUser,
  blockUserAuthoritative,
  unblockUserAuthoritative,
  UserPlanTier,
  getUserSubscription,
  setUserPlanTier,
  PlanKeyName,
  PlanFeatureDetail,
  PromoCodeItem,
  PlanUserRecord,
  getPlansCatalog,
  savePlansCatalog,
  getPromoCodes,
  createPromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  getPlanUsers,
  assignPlanToUserManually,
  adminUpdateUserRecord,
  adminDeleteUserRecord,
  assignCustomHeaderFooterToUser,
  PLAN_KEY_MAP,
  LogoChangeRequest,
  getLogoChangeRequests,
  fetchLogoChangeRequests,
  approveLogoChangeRequest,
  rejectLogoChangeRequest,
  registerOrUpdateUser,
} from '../lib/userPlanManager';
import {
  AdminRssSource,
  getAdminRssSources,
  addAdminRssSource,
  toggleAdminRssSource,
  deleteAdminRssSource,
  syncAllSourcesLive,
  getSavedNewsChannels,
  saveNewsChannel,
  deleteSavedNewsChannel,
} from '../lib/rssSourceManager';
import { AdminTemplatePlanManager } from './AdminTemplatePlanManager';
import { UserTemplateManager } from './UserTemplateManager';
import { AdminMusicLibraryManager } from './AdminMusicLibraryManager';
import { HelpAndPoliciesView } from './HelpAndPoliciesView';
import { CashfreePaymentModal } from './CashfreePaymentModal';
import { getApiUrl } from '../lib/apiConfig';
import {
  RestrictedChannel,
  getRestrictedChannels,
  addRestrictedChannel,
  deleteRestrictedChannel,
} from '../lib/restrictedChannelsManager';
import {
  CategoryItem,
  getAllCategories,
  getActiveCategories,
  addCategory,
  updateCategoryName,
  toggleCategoryStatus,
  deleteCategoryItem,
} from '../lib/categoryManager';
import { AdminApiKeysManager } from './AdminApiKeysManager';
interface AdminPlansAndPackagesManagerProps {
  currentUser?: any;
  onPlanChanged?: () => void;
  onOpenStudio?: () => void;
  renderProfileContent?: () => React.ReactNode;
  categories?: any[];
  onAddCategory?: (category: any) => void;
  onDeleteCategory?: (id: string) => void;
}

export const AdminPlansAndPackagesManager: React.FC<AdminPlansAndPackagesManagerProps> = ({
  currentUser,
  onPlanChanged,
  onOpenStudio,
  renderProfileContent,
  categories,
  onAddCategory,
  onDeleteCategory,
}) => {
  // Sub-tabs: main accordions in exact order - initially closed per requirement
  const [subTab, setSubTab] = useState<'profile' | 'upgrade' | 'plans' | 'templates' | 'music_library' | 'promocodes' | 'users' | 'rewards' | 'rss' | 'web' | 'restricted' | 'api_keys' | 'notifications' | 'policies' | 'analytics' | ''>('');
  const [analyticsTab, setAnalyticsTab] = useState<'news' | 'video'>('news');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const res = await fetch('/api/admin/analytics/summary', {
        headers: { 'x-user-email': currentUser?.email || '' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalyticsData(data);
      }
    } catch {}
    setIsLoadingAnalytics(false);
  };

  useEffect(() => {
    if (subTab === 'analytics') {
      fetchAnalytics();
    }
  }, [subTab]);

  const [userSub, setUserSub] = useState(() => getUserSubscription());

  // Admin Notification Panel State (Phase 5)
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [adminNotifFilter, setAdminNotifFilter] = useState<'all' | 'rss' | 'support' | 'logo' | 'requests'>('all');
  const [adminNotifCounts, setAdminNotifCounts] = useState({ all: 0, rss: 0, support: 0, logo: 0, requests: 0 });
  const [isLoadingAdminNotifs, setIsLoadingAdminNotifs] = useState(false);
  const [adminNotifActionMsg, setAdminNotifActionMsg] = useState<string | null>(null);

  // Rewards & Claims Manager State (Part S)
  const [adminRewardsStats, setAdminRewardsStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    totalCoinsCredited: 0,
    totalBonusPosts: 0,
  });
  const [adminRewardsClaims, setAdminRewardsClaims] = useState<any[]>([]);
  const [isLoadingRewards, setIsLoadingRewards] = useState(false);
  const [rewardsFilter, setRewardsFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rewardsSearch, setRewardsSearch] = useState('');
  const [previewScreenshotUrl, setPreviewScreenshotUrl] = useState<string | null>(null);
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('सोशल मीडिया पोस्ट सत्यापन विफल');
  const [isProcessingRewardAction, setIsProcessingRewardAction] = useState(false);
  const [rewardActionMsg, setRewardActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const effectiveCurrentUser = currentUser || (() => {
    try {
      const sess = localStorage.getItem('reporter_auth_session') || localStorage.getItem('ai_news_user');
      if (sess) return JSON.parse(sess);
    } catch {}
    return null;
  })();

  const fetchAdminRewards = () => {
    setIsLoadingRewards(true);
    const adminEmail = effectiveCurrentUser?.email || 'admin.ainewsmaker@gmail.com';
    fetch(`/api/admin/rewards/claims?adminEmail=${encodeURIComponent(adminEmail)}`, {
      headers: {
        'x-admin-email': adminEmail,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.stats) setAdminRewardsStats(data.stats);
          if (Array.isArray(data.claims)) setAdminRewardsClaims(data.claims);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingRewards(false));
  };

  const fetchAdminNotifications = async () => {
    setIsLoadingAdminNotifs(true);
    try {
      const adminEmail = effectiveCurrentUser?.email || 'admin.ainewsmaker@gmail.com';
      const res = await fetch(`/api/admin/notifications?email=${encodeURIComponent(adminEmail)}`, {
        headers: {
          'x-admin-key': 'master-admin',
          'x-admin-email': adminEmail,
          'x-user-role': 'admin',
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.notifications)) {
          setAdminNotifications(data.notifications);
          setAdminNotifCounts(data.unreadCounts || { all: 0, rss: 0, support: 0, logo: 0, requests: 0 });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch admin notifications:', err);
    } finally {
      setIsLoadingAdminNotifs(false);
    }
  };

  const handleMarkAdminNotifRead = async (id?: string, markAll: boolean = false, category?: string) => {
    try {
      const adminEmail = effectiveCurrentUser?.email || 'admin.ainewsmaker@gmail.com';
      const res = await fetch('/api/admin/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'master-admin',
          'x-admin-email': adminEmail,
          'x-user-role': 'admin',
        },
        body: JSON.stringify({
          id,
          all: markAll,
          category,
          adminEmail,
        }),
      });
      if (res.ok) {
        if (markAll) {
          if (category && category !== 'all') {
            setAdminNotifications((prev) => prev.map((n) => (n.category === category ? { ...n, unread: false } : n)));
            setAdminNotifCounts((prev) => ({
              ...prev,
              [category]: 0,
              all: Math.max(0, prev.all - (prev[category as keyof typeof prev] || 0)),
            }));
          } else {
            setAdminNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
            setAdminNotifCounts({ all: 0, rss: 0, support: 0, logo: 0, requests: 0 });
          }
          setAdminNotifActionMsg('✅ सभी नोटिफिकेशन पढ़े गए मार्क कर दिए गए');
        } else if (id) {
          setAdminNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
          const target = adminNotifications.find((n) => n.id === id);
          if (target && target.unread) {
            setAdminNotifCounts((prev) => ({
              ...prev,
              all: Math.max(0, prev.all - 1),
              [target.category]: Math.max(0, (prev[target.category as keyof typeof prev] || 1) - 1),
            }));
          }
        }
        setTimeout(() => setAdminNotifActionMsg(null), 3000);
      }
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  useEffect(() => {
    fetchAdminRewards();
    fetchAdminNotifications();
  }, [subTab]);

  const handleApproveRewardClaim = async (claimId: string) => {
    setIsProcessingRewardAction(true);
    setRewardActionMsg(null);
    try {
      const res = await fetch(`/api/admin/rewards/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: effectiveCurrentUser?.email || 'admin.ainewsmaker@gmail.com',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRewardActionMsg({ type: 'success', text: '✅ क्लेम सफलतापूर्वक स्वीकृत किया गया और यूज़र के वॉलेट में कॉइन्स क्रेडिट हो गए!' });
        fetchAdminRewards();
      } else {
        setRewardActionMsg({ type: 'error', text: data.error || 'अप्रूवल विफल रहा' });
      }
    } catch (err: any) {
      setRewardActionMsg({ type: 'error', text: err.message || 'नेटवर्क त्रुटि' });
    } finally {
      setIsProcessingRewardAction(false);
    }
  };

  const handleRejectRewardClaim = async (claimId: string) => {
    if (!rejectReasonInput.trim()) {
      alert('कृपया अस्वीकृति का कारण दर्ज करें');
      return;
    }
    setIsProcessingRewardAction(true);
    setRewardActionMsg(null);
    try {
      const res = await fetch(`/api/admin/rewards/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: effectiveCurrentUser?.email || 'admin.ainewsmaker@gmail.com',
          reason: rejectReasonInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRewardActionMsg({ type: 'success', text: '❌ क्लेम अस्वीकृत किया गया।' });
        setRejectingClaimId(null);
        setRejectReasonInput('सोशल मीडिया पोस्ट सत्यापन विफल');
        fetchAdminRewards();
      } else {
        setRewardActionMsg({ type: 'error', text: data.error || 'अस्वीकृति विफल रही' });
      }
    } catch (err: any) {
      setRewardActionMsg({ type: 'error', text: err.message || 'नेटवर्क त्रुटि' });
    } finally {
      setIsProcessingRewardAction(false);
    }
  };

  const isSuperAdminUser = isUserMasterAdmin(effectiveCurrentUser) || isUserSuperAdmin(effectiveCurrentUser) || isEffectiveSuperAdmin(effectiveCurrentUser);

  // Module C Security: Regular admin cannot view or access the 5 restricted tabs
  useEffect(() => {
    if (!isSuperAdminUser && (subTab === 'plans' || subTab === 'templates' || subTab === 'promocodes' || subTab === 'users' || subTab === 'restricted')) {
      setSubTab('');
    }
  }, [isSuperAdminUser, subTab]);

  // Restricted Channels Management State
  const [restrictedList, setRestrictedList] = useState<RestrictedChannel[]>(() => getRestrictedChannels());
  const [restrictedSearch, setRestrictedSearch] = useState<string>('');
  const [newRestrictedName, setNewRestrictedName] = useState<string>('');
  const [newRestrictedWebsite, setNewRestrictedWebsite] = useState<string>('');
  const [newRestrictedUsername, setNewRestrictedUsername] = useState<string>('');
  const [newRestrictedLogo, setNewRestrictedLogo] = useState<string>('');
  const [newRestrictedReason, setNewRestrictedReason] = useState<string>('');
  const [restrictedMsg, setRestrictedMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Master Admin 4 Navigable Categories & Sub-Users Directory State (Section 11)
  const [userTierCategory, setUserTierCategory] = useState<'ALL' | 'BASIC' | 'ADVANCED' | 'PRO' | 'VIP'>('ALL');
  const [adminAllSubUsers, setAdminAllSubUsers] = useState<any[]>([]);

  const fetchAdminAllSubUsers = () => {
    fetch('/api/admin/sub-users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.subUsers)) {
          setAdminAllSubUsers(data.subUsers);
        }
      })
      .catch(() => {});
  };

  // Authoritative real-time user & logo requests sync on mount, subTab change, window focus & periodic interval
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = () => {
      syncCloudUsers().then((synced) => {
        if (isMounted && Array.isArray(synced)) {
          setPlanUsers(synced);
        }
      }).catch(() => {});
    };

    const fetchLogoReqs = () => {
      fetchLogoChangeRequests().then((reqs) => {
        if (isMounted && Array.isArray(reqs)) {
          setLogoRequests(reqs);
        }
      }).catch(() => {});
    };

    fetchUsers();
    fetchLogoReqs();
    fetchAdminAllSubUsers();
    const interval = setInterval(() => {
      fetchUsers();
      fetchLogoReqs();
      fetchAdminAllSubUsers();
    }, 4000);
    const handleLocalUsersSync = () => {
      if (isMounted) setPlanUsers(getPlanUsers());
    };
    const handleLocalLogoReqsSync = () => {
      if (isMounted) setLogoRequests(getLogoChangeRequests());
    };
    window.addEventListener('focus', fetchUsers);
    window.addEventListener('focus', fetchLogoReqs);
    window.addEventListener('ai_news_plan_users_changed', handleLocalUsersSync);
    window.addEventListener('ai_news_logo_requests_updated', handleLocalLogoReqsSync);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', fetchUsers);
      window.removeEventListener('focus', fetchLogoReqs);
      window.removeEventListener('ai_news_plan_users_changed', handleLocalUsersSync);
      window.removeEventListener('ai_news_logo_requests_updated', handleLocalLogoReqsSync);
    };
  }, [subTab]);

  // Edit User State
  const [editingUser, setEditingUser] = useState<PlanUserRecord | null>(null);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editFullName, setEditFullName] = useState<string>('');
  const [editMobile, setEditMobile] = useState<string>('');
  const [editChannelName, setEditChannelName] = useState<string>('');
  const [editTier, setEditTier] = useState<UserPlanTier>('basic');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editIsLocked, setEditIsLocked] = useState<boolean>(true);
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [editUserMsg, setEditUserMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleOpenEditUser = (u: PlanUserRecord) => {
    setEditingUser(u);
    setEditUsername(u.username || (u.userId && !u.userId.includes('@') ? u.userId : 'user'));
    setEditFullName(u.name || '');
    setEditMobile(u.mobile || '');
    setEditChannelName(u.channelName || '');
    setEditTier(u.tier || 'basic');
    setEditStatus((u as any).status || 'active');
    setEditIsLocked(u.isLocked !== undefined ? u.isLocked : true);
    setEditUserMsg(null);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingUser(true);
    setEditUserMsg(null);
    try {
      const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!cleanUsername) {
        setEditUserMsg({ type: 'error', text: 'कृपया वैध यूज़रनेम दर्ज करें।' });
        setIsSavingUser(false);
        return;
      }
      const res = await adminUpdateCloudUser(editingUser.userId || editingUser.email, {
        username: cleanUsername,
        name: editFullName.trim(),
        mobile: editMobile.trim(),
        channelName: editChannelName.trim(),
        tier: editTier,
        isLocked: editIsLocked,
        status: editStatus,
      } as any);

      if (!res.success && res.error) {
        setEditUserMsg({ type: 'error', text: res.error });
        setIsSavingUser(false);
        return;
      }

      const refreshed = await syncCloudUsers();
      setPlanUsers(refreshed);
      setEditUserMsg({ type: 'success', text: 'यूज़र ' + cleanUsername + ' का डेटा सफलतापूर्वक अपडेट हो गया!' });
      setTimeout(() => {
        setEditingUser(null);
      }, 1200);
    } catch (err: any) {
      setEditUserMsg({ type: 'error', text: err.message || 'यूज़र अपडेट करने में त्रुटि हुई' });
    } finally {
      setIsSavingUser(false);
    }
  };

  // Single Unified Category Manager for RSS & Web Links (Synchronized with Home Feed)
  const [feedCategories, setFeedCategories] = useState<CategoryItem[]>(() => getAllCategories());
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState<string>('');

  useEffect(() => {
    const handleCatsUpdated = () => {
      setFeedCategories(getAllCategories());
    };
    window.addEventListener('ai_news_categories_updated', handleCatsUpdated);
    return () => window.removeEventListener('ai_news_categories_updated', handleCatsUpdated);
  }, []);

  const handleAddCategoryUnified = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newCatInput.trim();
    if (!cat) return;
    try {
      addCategory(cat);
      setFeedCategories(getAllCategories());
      if (onAddCategory) onAddCategory(cat);
      setNewCatInput('');
    } catch (err: any) {
      alert(err.message || 'त्रुटि');
    }
  };

  const handleStartEditCat = (cat: CategoryItem) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleSaveEditCat = (id: string) => {
    if (!editingCatName.trim()) {
      alert('श्रेणी का नाम खाली नहीं हो सकता');
      return;
    }
    updateCategoryName(id, editingCatName.trim());
    setFeedCategories(getAllCategories());
    setEditingCatId(null);
    setEditingCatName('');
  };

  const handleToggleCatStatus = (id: string) => {
    toggleCategoryStatus(id);
    setFeedCategories(getAllCategories());
  };

  const handleDeleteCategoryUnified = (id: string) => {
    if (feedCategories.length <= 1) return;
    deleteCategoryItem(id);
    setFeedCategories(getAllCategories());
  };

  // Logo Change Requests State
  const [logoRequests, setLogoRequests] = useState<LogoChangeRequest[]>(() => getLogoChangeRequests());
  const [logoReqMsg, setLogoReqMsg] = useState<string>('');

  // RSS & Web Link Sources State
  const [rssSources, setRssSources] = useState<AdminRssSource[]>(() => getAdminRssSources());
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [savedChannels, setSavedChannels] = useState<string[]>(() => getSavedNewsChannels());
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newSourceType, setNewSourceType] = useState<'rss' | 'web'>('rss');
  const [newSourceCategory, setNewSourceCategory] = useState<string>('देश');
  const [rssMsg, setRssMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSyncingRss, setIsSyncingRss] = useState<boolean>(false);

  // RSS Two Sections State: 'dashboard' | 'converter'
  const [rssActiveSection, setRssActiveSection] = useState<'dashboard' | 'converter'>('dashboard');
  const [converterUrl, setConverterUrl] = useState<string>('');
  const [converterChannel, setConverterChannel] = useState<string>('');
  const [converterCategory, setConverterCategory] = useState<string>('देश');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [converterResult, setConverterResult] = useState<{
    feedUrl: string;
    totalArticles: number;
    feedTitle?: string;
    sampleArticles?: { title: string; link: string }[];
  } | null>(null);
  const [converterError, setConverterError] = useState<string | null>(null);
  const [converterCopied, setConverterCopied] = useState<boolean>(false);

  // Plans Catalog State
  const [plans, setPlans] = useState<PlanFeatureDetail[]>(() => getPlansCatalog());
  const [cashfreeModalPlan, setCashfreeModalPlan] = useState<PlanFeatureDetail | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<UserPlanTier | null>(null);
  const [editPriceNum, setEditPriceNum] = useState<number>(0);
  const [editDurationDays, setEditDurationDays] = useState<number>(30);
  const [editMaxGraphics, setEditMaxGraphics] = useState<number>(25);
  const [planSaveSuccess, setPlanSaveSuccess] = useState<string | null>(null);

  // Promo Codes State
  const [promoCodes, setPromoCodes] = useState<PromoCodeItem[]>(() => getPromoCodes());
  const [newPromoPlan, setNewPromoPlan] = useState<UserPlanTier>('professional');
  const [newPromoCodeStr, setNewPromoCodeStr] = useState<string>('');
  const [newPromoUsageType, setNewPromoUsageType] = useState<'one_time' | 'unlimited'>('one_time');
  const [newPromoDurationDays, setNewPromoDurationDays] = useState<number>(30);
  const [newPromoNotes, setNewPromoNotes] = useState<string>('');
  const [promoMsg, setPromoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Search & Filters for Promo Codes
  const [promoSearch, setPromoSearch] = useState<string>('');
  const [promoPlanFilter, setPromoPlanFilter] = useState<string>('all');
  const [promoStatusFilter, setPromoStatusFilter] = useState<string>('all');

  // Plan Users State
  const [planUsers, setPlanUsers] = useState<PlanUserRecord[]>(() => getPlanUsers());
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserPlan, setNewUserPlan] = useState<UserPlanTier>('basic');
  const [newUserMobile, setNewUserMobile] = useState<string>('');
  const [newUserChannel, setNewUserChannel] = useState<string>('');
  const [addUserSuccessMsg, setAddUserSuccessMsg] = useState<string>('');
  const [addUserErrorMsg, setAddUserErrorMsg] = useState<string>('');

  // Website News Portal Manager State
  const [newsPortals, setNewsPortals] = useState<Array<{ id: string; name: string; url: string; category: string }>>(() => {
    try {
      const saved = localStorage.getItem('admin_news_portals_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p: any) => p && p.name && p.url);
        }
      }
    } catch {}
    return [
      { id: 'p-1', name: 'आज तक (Aaj Tak)', url: 'https://aajtak.in', category: 'breaking' },
      { id: 'p-2', name: 'दैनिक भास्कर (Dainik Bhaskar)', url: 'https://bhaskar.com', category: 'state' },
      { id: 'p-3', name: 'एनडीटीवी (NDTV India)', url: 'https://ndtv.in', category: 'national' },
      { id: 'p-4', name: 'ज़ी न्यूज़ (Zee News)', url: 'https://zeenews.india.com', category: 'breaking' },
      { id: 'p-5', name: 'नवभारत टाइम्स (Navbharat Times)', url: 'https://navbharattimes.indiatimes.com', category: 'state' },
      { id: 'p-6', name: 'खबरिदास न्यूज़ (Khabridas News)', url: 'https://khabridasnews.com', category: 'breaking' }
    ];
  });
  const [newPortalName, setNewPortalName] = useState<string>('');
  const [newPortalUrl, setNewPortalUrl] = useState<string>('');
  const [newPortalCat, setNewPortalCat] = useState<string>('breaking');

  const handleAddNewsPortal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortalName.trim()) return;
    const item = {
      id: 'portal-' + Date.now(),
      name: newPortalName.trim(),
      url: newPortalUrl.trim() || 'https://' + newPortalName.trim().toLowerCase().replace(/[^a-z0-9]/g, '') + '.com',
      category: newPortalCat,
    };
    const updated = [item, ...newsPortals];
    setNewsPortals(updated);
    saveNewsChannel(item.name);
    setSavedChannels(getSavedNewsChannels());
    localStorage.setItem('admin_news_portals_list', JSON.stringify(updated));
    setNewPortalName('');
    setNewPortalUrl('');
  };

  const handleDeleteNewsPortal = (id: string) => {
    const updated = newsPortals.filter(p => p.id !== id);
    setNewsPortals(updated);
    localStorage.setItem('admin_news_portals_list', JSON.stringify(updated));
  };

  const handleSuperAdminAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserSuccessMsg('');
    setAddUserErrorMsg('');

    const email = newUserEmail.trim().toLowerCase();
    const password = newUserPassword.trim();
    const name = newUserName.trim();

    if (!email || !password || !name) {
      setAddUserErrorMsg('कृपया नाम, ईमेल और पासवर्ड भरें।');
      return;
    }

    try {
      // 1. Assign plan
      assignPlanToUserManually(email, newUserPlan, 365, 'SuperAdmin Direct Creation');
      
      // 2. Save credentials in local storage
      const customAccRaw = localStorage.getItem('reporter_custom_accounts');
      const customAcc = customAccRaw ? JSON.parse(customAccRaw) : {};
      customAcc[email] = {
        pass: password,
        user: {
          username: name ? name.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16) || `user_${Date.now().toString().slice(-4)}` : `user_${Date.now().toString().slice(-4)}`,
          name: name,
          role: newUserRole,
          email: email,
          mobileNumber: newUserMobile.trim() || undefined,
          channelName: newUserChannel.trim() || undefined,
          planTier: newUserPlan,
        },
      };
      localStorage.setItem('reporter_custom_accounts', JSON.stringify(customAcc));

      // 3. Register in User Plan Manager with full profile
      registerOrUpdateUser({
        name,
        fullName: name,
        email,
        role: newUserRole,
        mobile: newUserMobile.trim(),
        channelName: newUserChannel.trim(),
        tier: newUserPlan,
      });

      // 4. Authoritative backend sync with credentials
      fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          fullName: name,
          role: newUserRole,
          mobile: newUserMobile.trim(),
          channelName: newUserChannel.trim(),
          tier: newUserPlan,
        }),
      }).then(() => {
        syncCloudUsers().then((synced) => {
          if (Array.isArray(synced)) setPlanUsers(synced);
        }).catch(() => {});
      }).catch(() => {});

      // 5. Refresh user list
      setPlanUsers(getPlanUsers());
      setAddUserSuccessMsg(`उपयोगकर्ता '${name}' (${email}) सफलतापूर्वक बनाया गया!`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserMobile('');
      setNewUserChannel('');
    } catch (err: any) {
      setAddUserErrorMsg(err.message || 'यूज़र बनाने में त्रुटि हुई।');
    }
  };

  const [manualUserEmail, setManualUserEmail] = useState<string>('');
  const [manualUserTier, setManualUserTier] = useState<UserPlanTier>('professional');
  const [manualDuration, setManualDuration] = useState<number>(30);
  const [manualAssignMsg, setManualAssignMsg] = useState<string>('');

  const [userSearch, setUserSearch] = useState<string>('');
  const [isSyncingUsers, setIsSyncingUsers] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'blocked' | 'trial_active' | 'trial_expired'>('all');

  const handleSyncUsers = async () => {
    setIsSyncingUsers(true);
    try {
      const refreshed = await syncCloudUsers();
      if (Array.isArray(refreshed)) {
        setPlanUsers(refreshed);
        setLastSyncTime(new Date().toLocaleTimeString('hi-IN'));
      }
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const handleToggleBlockUser = async (u: PlanUserRecord) => {
    const isCurrentlyBlocked = Boolean(u.isBlocked);
    const actionText = isCurrentlyBlocked ? 'अनब्लॉक (Unblock)' : 'ब्लॉक (Block)';
    if (isUserSuperAdmin(u.email) || u.role === 'superadmin') {
      alert('सुरक्षित सुपर एडमिन खाते को ब्लॉक नहीं किया जा सकता!');
      return;
    }
    if (!window.confirm(`क्या आप यूजर "${u.name || u.email}" को ${actionText} करना चाहते हैं?\n${isCurrentlyBlocked ? 'अनब्लॉक करने पर उपयोगकर्ता की सेवाएं पुनः सक्रिय हो जाएंगी।' : 'ब्लॉक करने पर उपयोगकर्ता तुरंत किसी भी टूल व फीचर का उपयोग नहीं कर सकेगा।'}`)) {
      return;
    }
    try {
      setIsSyncingUsers(true);
      const res = isCurrentlyBlocked
        ? await unblockUserAuthoritative(u.userId || u.email, currentUser?.email || 'Admin')
        : await blockUserAuthoritative(u.userId || u.email, currentUser?.email || 'Admin');
      if (res.success) {
        await handleSyncUsers();
      } else {
        alert(res.error || 'ऑपरेशन विफल रहा');
      }
    } catch (err: any) {
      alert('त्रुटि: ' + err.message);
    } finally {
      setIsSyncingUsers(false);
    }
  };

  // Custom Header & Footer Assignment State (PRO & VIP DESK)
  const [assignUserEmail, setAssignUserEmail] = useState<string>('');
  const [assignHeaderUrl, setAssignHeaderUrl] = useState<string>('');
  const [assignFooterUrl, setAssignFooterUrl] = useState<string>('');
  const [assignCustomActive, setAssignCustomActive] = useState<boolean>(true);
  const [assignCustomMsg, setAssignCustomMsg] = useState<string>('');

  // Editing branding modal for a specific user
  const [editingBrandingUser, setEditingBrandingUser] = useState<PlanUserRecord | null>(null);
  const [editBrandNameHi, setEditBrandNameHi] = useState<string>('');
  const [editBrandNameEn, setEditBrandNameEn] = useState<string>('');
  const [editBrandWebsite, setEditBrandWebsite] = useState<string>('');
  const [editBrandMobile, setEditBrandMobile] = useState<string>('');
  const [editBrandLogoUrl, setEditBrandLogoUrl] = useState<string>('');
  const [editBrandSocials, setEditBrandSocials] = useState<Record<string, boolean>>({
    youtube: true,
    facebook: true,
    instagram: true,
    twitter: false,
    linkedin: false,
  });
  const [editBrandMsg, setEditBrandMsg] = useState<string>('');

  // Admin Coin Credit Dialog state
  const [coinTargetUser, setCoinTargetUser] = useState<PlanUserRecord | null>(null);
  const [coinAmountInput, setCoinAmountInput] = useState<string>('');
  const [coinNoteInput, setCoinNoteInput] = useState<string>('');
  const [isSubmittingCoins, setIsSubmittingCoins] = useState<boolean>(false);
  const [coinDialogError, setCoinDialogError] = useState<string | null>(null);
  const [coinDialogSuccess, setCoinDialogSuccess] = useState<string | null>(null);
  const [targetUserBalance, setTargetUserBalance] = useState<number | null>(null);
  const [isLoadingTargetBalance, setIsLoadingTargetBalance] = useState<boolean>(false);

  // Reload data on events
  // Reload data on events & Auto-sync users in real-time
  useEffect(() => {
    const handlePlansUpdated = () => setPlans(getPlansCatalog());
    const handlePromoUpdated = () => setPromoCodes(getPromoCodes());
    const handleUsersUpdated = () => setPlanUsers(getPlanUsers());
    window.addEventListener('ai_news_plans_updated', handlePlansUpdated);
    window.addEventListener('ai_news_promo_codes_changed', handlePromoUpdated);
    window.addEventListener('ai_news_plan_users_changed', handleUsersUpdated);

    // Initial background sync
    handleSyncUsers();

    // 10-second real-time synchronization interval
    const interval = setInterval(() => {
      handleSyncUsers();
    }, 10000);

    // Sync immediately when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSyncUsers();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('ai_news_plans_updated', handlePlansUpdated);
      window.removeEventListener('ai_news_promo_codes_changed', handlePromoUpdated);
      window.removeEventListener('ai_news_plan_users_changed', handleUsersUpdated);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (subTab === 'users') {
      handleSyncUsers();
    }
  }, [subTab]);

  // Quick Auto-Generator for unique promo code string
  const handleAutoGenerateCode = (tier: UserPlanTier) => {
    const prefixMap: Record<UserPlanTier, string> = {
      basic: 'BASIC',
      advanced: 'ADV',
      professional: 'PRO',
      ultra: 'VIP',
    };
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const year = new Date().getFullYear();
    const generated = `${prefixMap[tier]}-${year}-${randomSuffix}`;
    setNewPromoCodeStr(generated);
  };

  // Create Promo Code
  const handleCreatePromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoMsg(null);

    let codeToUse = newPromoCodeStr.trim().toUpperCase();
    if (!codeToUse) {
      handleAutoGenerateCode(newPromoPlan);
      const prefixMap: Record<UserPlanTier, string> = {
        basic: 'BASIC',
        advanced: 'ADV',
        professional: 'PRO',
        ultra: 'VIP',
      };
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      codeToUse = `${prefixMap[newPromoPlan]}-${new Date().getFullYear()}-${randomSuffix}`;
    }

    const res = createPromoCode({
      code: codeToUse,
      planId: newPromoPlan,
      usageType: newPromoUsageType,
      durationDays: newPromoDurationDays,
      notes: newPromoNotes.trim() || undefined,
    });

    if (res.success) {
      setPromoCodes(getPromoCodes());
      setNewPromoCodeStr('');
      setNewPromoNotes('');
      setPromoMsg({ type: 'success', text: res.message });
      setTimeout(() => setPromoMsg(null), 5000);
    } else {
      setPromoMsg({ type: 'error', text: res.message });
    }
  };

  // Delete Promo Code
  const handleDeleteCode = (id: string, code: string) => {
    if (confirm(`क्या आप प्रोमो कोड "${code}" को हटाना चाहते हैं?`)) {
      deletePromoCode(id);
      setPromoCodes(getPromoCodes());
    }
  };

  // Toggle Active/Disabled for Promo Code
  const handleToggleCode = (id: string) => {
    togglePromoCodeStatus(id);
    setPromoCodes(getPromoCodes());
  };

  // Copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Start editing a plan
  const handleStartEditPlan = (plan: PlanFeatureDetail) => {
    setEditingPlanId(plan.id);
    setEditPriceNum(plan.priceNum);
    setEditDurationDays(plan.durationDays);
    setEditMaxGraphics(plan.maxGraphicsPerDay);
  };

  // Save edited plan
  const handleSavePlan = (planId: UserPlanTier) => {
    const updated = plans.map((p) => {
      if (p.id === planId) {
        return {
          ...p,
          priceNum: editPriceNum,
          priceDisplay: editPriceNum === 0 ? '₹0' : `₹${editPriceNum.toLocaleString('en-IN')}`,
          durationDays: editDurationDays,
          validityLabel: `${editDurationDays} दिन`,
          maxGraphicsPerDay: editMaxGraphics,
        };
      }
      return p;
    });
    setPlans(updated);
    savePlansCatalog(updated);
    setEditingPlanId(null);
    setPlanSaveSuccess(`✅ ${PLAN_KEY_MAP[planId]} प्लान की जानकारी सफलतापूर्वक अपडेट हो गई!`);
    setTimeout(() => setPlanSaveSuccess(''), 4000);
    if (onPlanChanged) onPlanChanged();
  };

  // Toggle Plan Active / Inactive
  const handleTogglePlanActive = (planId: UserPlanTier) => {
    const updated = plans.map((p) => (p.id === planId ? { ...p, isActive: !p.isActive } : p));
    setPlans(updated);
    savePlansCatalog(updated);
    if (onPlanChanged) onPlanChanged();
  };

  // Manual User Assignment
  const handleManualUserAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUserEmail.trim()) return;
    assignPlanToUserManually(manualUserEmail.trim(), manualUserTier, manualDuration);
    setPlanUsers(getPlanUsers());
    setManualAssignMsg(`✅ ${manualUserEmail.trim()} को ${PLAN_KEY_MAP[manualUserTier]} प्लान (${manualDuration} दिन) असाइन कर दिया गया!`);
    setManualUserEmail('');
    setTimeout(() => setManualAssignMsg(''), 5000);
  };

  // Select User for Custom Header / Footer
  const handleSelectUserForCustomHF = (email: string) => {
    setAssignUserEmail(email);
    setAssignCustomMsg('');
    const user = planUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      setAssignHeaderUrl(user.assignedHeaderUrl || '');
      setAssignFooterUrl(user.assignedFooterUrl || '');
      setAssignCustomActive(user.assignedCustomActive !== undefined ? user.assignedCustomActive : true);
    } else {
      setAssignHeaderUrl('');
      setAssignFooterUrl('');
      setAssignCustomActive(true);
    }
  };

  // Custom Header/Footer assignment submit
  const handleAssignCustomHeaderFooter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserEmail.trim()) {
      setAssignCustomMsg('❌ कृपया सूची से यूज़र चुनें!');
      return;
    }
    const success = assignCustomHeaderFooterToUser(assignUserEmail.trim(), {
      headerUrl: assignHeaderUrl.trim(),
      footerUrl: assignFooterUrl.trim(),
      active: assignCustomActive,
    });
    if (success) {
      setPlanUsers(getPlanUsers());
      setAssignCustomMsg(`✅ ${assignUserEmail.trim()} के लिए Custom Header/Footer सफलतापूर्वक असाइन व अपडेट हो गया!`);
      setTimeout(() => setAssignCustomMsg(''), 5000);
    } else {
      setAssignCustomMsg('❌ यूज़र रिकॉर्ड नहीं मिला!');
    }
  };

  // Handle image upload to DataURL for header/footer
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'header' | 'footer' | 'logo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'header') setAssignHeaderUrl(dataUrl);
      else if (target === 'footer') setAssignFooterUrl(dataUrl);
      else if (target === 'logo') setEditBrandLogoUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Branding Editor Handlers
  
  const handleDeleteUser = async (email: string, name?: string, userId?: string) => {
    if (window.confirm(`क्या आप निश्चित रूप से यूज़र "${name || email}" का प्रोफाइल/अकाउंट हमेशा के लिए डिलीट करना चाहते हैं?`)) {
      adminDeleteUserRecord(email);
      await adminDeleteCloudUser(email, userId).catch(() => {});
      setPlanUsers(getPlanUsers());
    }
  };

  const handleOpenBrandingEditor = (user: PlanUserRecord) => {
    setEditingBrandingUser(user);
    setEditBrandNameHi(user.channelName || '');
    setEditBrandNameEn(user.channelName || '');
    setEditBrandWebsite(user.websiteUrl || '');
    setEditBrandMobile(user.mobile || '');
    setEditBrandLogoUrl(user.channelLogoUrl || '');
    setEditBrandSocials(
      user.socialIcons || {
        youtube: true,
        facebook: true,
        instagram: true,
        twitter: false,
        linkedin: false,
      }
    );
    setEditBrandMsg('');
  };

  const handleSaveUserBranding = async () => {
    if (!editingBrandingUser) return;
    const updates = {
      channelName: editBrandNameHi || editBrandNameEn,
      channelNameHi: editBrandNameHi || editBrandNameEn,
      channelNameEn: editBrandNameEn,
      websiteUrl: editBrandWebsite,
      mobile: editBrandMobile,
      channelLogoUrl: editBrandLogoUrl,
      socialIcons: editBrandSocials,
    };
    adminUpdateUserRecord(editingBrandingUser.email, updates);
    try {
      await adminUpdateCloudUser(editingBrandingUser.userId || editingBrandingUser.email, updates);
      await fetch(getApiUrl('/api/user-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingBrandingUser.userId || editingBrandingUser.email,
          email: editingBrandingUser.email,
          ...updates,
        }),
      });
    } catch (e) {
      console.warn('Error saving user branding to server:', e);
    }
    setPlanUsers(getPlanUsers());
    setEditBrandMsg('✅ यूज़र ब्रांडिंग विवरण सफलतापूर्वक सुरक्षित हो गया!');
    setTimeout(() => {
      setEditingBrandingUser(null);
      setEditBrandMsg('');
    }, 1500);
  };

  const handleOpenCoinCreditDialog = async (user: PlanUserRecord) => {
    setCoinTargetUser(user);
    setCoinAmountInput('');
    setCoinNoteInput('');
    setCoinDialogError(null);
    setCoinDialogSuccess(null);
    setTargetUserBalance((user as any).coinBalance ?? (user as any).coins ?? null);
    setIsLoadingTargetBalance(true);
    try {
      const email = user.email;
      const res = await fetch(`/api/user/wallet?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(user.userId || '')}`);
      if (res.ok) {
        const data = await res.json();
        setTargetUserBalance(data.coinBalance ?? 0);
      }
    } catch (e) {
      console.warn('Error fetching user coin balance:', e);
    } finally {
      setIsLoadingTargetBalance(false);
    }
  };

  const handleConfirmCreditCoins = async () => {
    if (!coinTargetUser) return;
    const amount = parseInt(coinAmountInput, 10);
    if (isNaN(amount) || amount <= 0) {
      setCoinDialogError('कृपया एक मान्य और धनात्मक संख्या (Positive Integer) दर्ज करें।');
      return;
    }
    setIsSubmittingCoins(true);
    setCoinDialogError(null);
    try {
      const adminEmail = effectiveCurrentUser?.email || 'admin.ainewsmaker@gmail.com';
      const res = await fetch('/api/admin/wallet/adjust-coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail,
          'x-user-email': adminEmail,
        },
        body: JSON.stringify({
          adminEmail,
          email: coinTargetUser.email,
          userId: coinTargetUser.userId || coinTargetUser.email,
          amount,
          note: coinNoteInput.trim() || 'एडमिन मैनुअल कॉइन क्रेडिट',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCoinDialogError(data.error || 'कॉइन क्रेडिट करने में विफल');
        setIsSubmittingCoins(false);
        return;
      }

      const newBal = data.wallet?.coinBalance ?? ((targetUserBalance || 0) + amount);
      setTargetUserBalance(newBal);
      setCoinDialogSuccess(`सफलतापूर्वक ${amount} कॉइन क्रेडिट किए गए! नया बैलेंस: ${newBal}`);

      // Update user in planUsers state
      setPlanUsers((prev) =>
        prev.map((usr) =>
          usr.email.toLowerCase() === coinTargetUser.email.toLowerCase()
            ? { ...usr, coins: newBal, coinBalance: newBal }
            : usr
        )
      );

      // Broadcast wallet balance updates
      window.dispatchEvent(
        new CustomEvent('wallet_balance_updated', {
          detail: { email: coinTargetUser.email, balance: newBal },
        })
      );
      window.dispatchEvent(
        new CustomEvent('ai_news_wallet_updated', {
          detail: { email: coinTargetUser.email, balance: newBal },
        })
      );

      setTimeout(() => {
        setCoinTargetUser(null);
        setCoinDialogSuccess(null);
      }, 1500);
    } catch (err: any) {
      setCoinDialogError(err.message || 'सर्वर से कनेक्ट करने में त्रुटि');
    } finally {
      setIsSubmittingCoins(false);
    }
  };

  // Filtered Promo Codes
  const filteredPromoCodes = promoCodes.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(promoSearch.toLowerCase()) ||
      (c.usedByEmail && c.usedByEmail.toLowerCase().includes(promoSearch.toLowerCase())) ||
      (c.notes && c.notes.toLowerCase().includes(promoSearch.toLowerCase()));
    const matchesPlan = promoPlanFilter === 'all' || c.planId === promoPlanFilter;
    const matchesStatus =
      promoStatusFilter === 'all' ||
      (promoStatusFilter === 'unused' && c.status === 'unused') ||
      (promoStatusFilter === 'used' && c.status === 'used') ||
      (promoStatusFilter === 'disabled' && (c.status === 'disabled' || !c.isActive));
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getTierBadge = (tier: UserPlanTier) => {
    switch (tier) {
      case 'basic':
        return <span className="px-2 py-0.5 bg-slate-700 text-slate-200 text-xs font-black rounded">BASIC</span>;
      case 'advanced':
        return <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-black rounded">ADVANCE</span>;
      case 'professional':
        return <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-xs font-black rounded">PRO</span>;
      case 'ultra':
        return <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-black rounded shadow-xs shadow-purple-500/50">VIP DESK</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-700 text-slate-200 text-xs font-black rounded">BASIC</span>;
    }
  };

  return (
    <div className="space-y-3.5">
        {/* ========================================================================= */}
        {/* STEP 1: प्रोफाइल व चैनल विवरण (PROFILE & BRANDING)                        */}
        {/* ========================================================================= */}
        <div id="section-profile" className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'profile' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'profile' ? '' : 'profile')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'profile' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
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
                  चैनल लोगो, नाम, प्राइमरी मोबाइल नंबर, व्हाट्सएप व ब्रांडिंग विवरण
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                चैनल प्रोफाइल
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'profile' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'profile' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              {renderProfileContent ? renderProfileContent() : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  प्रोफाइल लोड हो रही है...
                </div>
              )}
            </div>
          )}
        </div>


        {/* ========================================================================= */}
        {/* STEP 2: मेंबरशिप प्लान व अपग्रेड (MEMBERSHIP PLANS & UPGRADE)              */}
        {/* ========================================================================= */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'upgrade' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'upgrade' ? '' : 'upgrade')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'upgrade' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
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
                  वर्तमान प्लान, 4 उपलब्ध टियर्स व 1-क्लिक प्लान एक्टिवेशन
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-emerald-400 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {userSub?.planKey || userSub?.planName || 'VIP DESK'}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'upgrade' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'upgrade' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {plans.map((p) => {
                  const isCurrent = userSub.tier === p.id || (p.id === 'basic' && (!userSub.tier || (userSub.tier as string) === 'trial'));
                  return (
                    <div
                      key={`user-upgrade-${p.id}`}
                      className={`rounded-xl p-4 border flex flex-col justify-between transition-all ${
                        isCurrent 
                          ? 'border-emerald-500/80 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-lg' 
                          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-base text-white">{p.planKey}</span>
                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-300 border border-emerald-500">
                              वर्तमान प्लान
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300">
                              उपलब्ध
                            </span>
                          )}
                        </div>
                        <div className="text-xl font-black text-amber-400 font-mono">
                          {p.priceDisplay} <span className="text-xs text-slate-400 font-normal">/ {p.validityLabel}</span>
                        </div>
                        <p className="text-xs text-slate-400">{p.tagline}</p>
                        <div className="space-y-1 pt-2 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{p.hasWatermark ? 'वॉटरमार्क रहेगा' : 'नो वॉटरमार्क'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{p.hasVideoStudio ? 'वीडियो स्टूडियो अनलॉक' : 'केवल ग्राफिक स्टूडियो'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{p.graphicExportResolution}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <button
                          type="button"
                          onClick={() => setCashfreeModalPlan(p)}
                          disabled={isCurrent}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                            isCurrent
                              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-default'
                              : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 text-slate-950 shadow-amber-500/20 active:scale-98'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{isCurrent ? 'वर्तमान में सक्रिय प्लान' : `Cashfree ऑनलाइन पे (${p.priceDisplay})`}</span>
                        </button>
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              setUserPlanTier(p.id as UserPlanTier);
                              setUserSub(getUserSubscription());
                              if (onPlanChanged) onPlanChanged();
                              setPlanSaveSuccess(`🎉 ${p.planKey} प्लान सफलतापूर्वक सक्रिय हो गया है!`);
                              setTimeout(() => setPlanSaveSuccess(null), 4000);
                            }}
                            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition cursor-pointer"
                          >
                            1-क्लिक डेमो एक्टिवेशन
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>


        {/* ========================================================================= */}
        {/* STEP 3: प्लान्स मैनेजर (PLANS MANAGER) - Master Admin Only                 */}
        {/* ========================================================================= */}
        {isSuperAdminUser && (
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'plans' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'plans' ? '' : 'plans')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'plans' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  प्लान्स मैनेजर
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  एडमिन द्वारा प्लान्स की कीमत, वैधता, सुविधाएं व सक्रिय/निष्क्रिय स्थिति नियंत्रण
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                ADMIN
              </span>
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${plans.length} प्लान्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'plans' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'plans' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {planSaveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{planSaveSuccess}</span>
            </div>
          )}

          {/* Cards Grid for the 4 Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => {
              const isEditing = editingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between transition-all ${
                    plan.id === 'ultra'
                      ? 'border-purple-500/80 shadow-purple-950/40 ring-1 ring-purple-500/40'
                      : plan.id === 'professional'
                      ? 'border-amber-500/60 shadow-amber-950/30'
                      : plan.id === 'advanced'
                      ? 'border-blue-500/60'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name & Active Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {plan.id === 'ultra' ? (
                          <Crown className="w-5 h-5 text-purple-400" />
                        ) : plan.id === 'professional' ? (
                          <Zap className="w-5 h-5 text-amber-400" />
                        ) : plan.id === 'advanced' ? (
                          <Star className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="font-black text-base text-white">{plan.planKey}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTogglePlanActive(plan.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition cursor-pointer ${
                          plan.isActive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                            : 'bg-red-950 text-red-300 border border-red-600'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">{plan.tagline}</p>

                    {/* Price & Duration */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">मूल्य (₹)</label>
                            <input
                              type="number"
                              value={editPriceNum}
                              onChange={(e) => setEditPriceNum(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-amber-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">वैधता (दिन)</label>
                            <input
                              type="number"
                              value={editDurationDays}
                              onChange={(e) => setEditDurationDays(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block">ग्राफ़िक्स सीमा/दिन</label>
                            <input
                              type="number"
                              value={editMaxGraphics}
                              onChange={(e) => setEditMaxGraphics(Number(e.target.value))}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSavePlan(plan.id)}
                              className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Save className="w-3 h-3" />
                              <span>सेव</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPlanId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded hover:bg-slate-700 cursor-pointer"
                            >
                              रद्द
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs text-slate-500 line-through font-bold">
                                {plan.regularPriceDisplay || (plan.id === 'basic' ? '₹2,999' : plan.id === 'advanced' ? '₹4,999' : plan.id === 'professional' ? '₹6,999' : '₹9,999')}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-gradient-to-r from-red-600 to-amber-600 text-white">
                                Launching Offer ({plan.discountPercent || (plan.id === 'basic' ? 67 : plan.id === 'advanced' ? 50 : plan.id === 'professional' ? 40 : 35)}%)
                              </span>
                            </div>
                            <span className="text-xl font-black text-amber-400 font-mono">{plan.priceDisplay}</span>
                            <span className="text-[10px] text-slate-400 ml-1">/ {plan.validityLabel}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartEditPlan(plan)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition cursor-pointer"
                            title="एडिट करें"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-1.5 pt-1 text-xs text-slate-300">
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>वॉटरमार्क:</span>
                        <span className={plan.hasWatermark ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {plan.hasWatermark ? 'हाँ (रहेगा)' : 'नहीं (No Watermark)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>क्वालिटी:</span>
                        <span className="text-white font-bold">{plan.graphicExportResolution}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>वीडियो स्टूडियो:</span>
                        <span className={plan.hasVideoStudio ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {plan.hasVideoStudio ? 'सक्रिय (Unlocked)' : 'लॉक्ड'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800 text-slate-400">
                        <span>VIP DESK फ्रेम्स:</span>
                        <span className={plan.hasVipDeskFrames ? 'text-purple-400 font-bold' : 'text-slate-500'}>
                          {plan.hasVipDeskFrames ? 'विशेष (VIP Only)' : 'लॉक्ड'}
                        </span>
                      </div>

                      <div className="pt-2 space-y-1 text-[11px] text-slate-300">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <div key={i} className="line-clamp-1">
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Stats / Action */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      दैनिक सीमा: {plan.maxGraphicsPerDay >= 9999 ? 'असीमित' : `${plan.maxGraphicsPerDay} ग्राफिक`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEditPlan(plan)}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      कस्टमाइज़ करें
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
            </div>
          )}
        </div>
        )}


        {/* ========================================================================= */}
        {/* STEP 4: टेम्पलेट मैनेजर (TEMPLATE MANAGER) - Master Admin Only             */}
        {/* ========================================================================= */}
        {isSuperAdminUser && (
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'templates' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'templates' ? '' : 'templates')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'templates' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  टेम्पलेट मैनेजर
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  ग्राफिक्स (8 श्रेणियां) व वीडियो टेम्पलेट्स (9:16, 1:1, 4:3, 4:5) एक्सेस टियर व Custom Header/Footer Approval
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                ADMIN
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'templates' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'templates' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              <UserTemplateManager isAdmin={true} defaultTab="admin" currentUser={currentUser} onOpenStudioWithTemplate={onOpenStudio} />
            </div>
          )}
        </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: Music Library / म्यूजिक लाइब्रेरी                                 */}
        {/* ========================================================================= */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'music_library' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'music_library' ? '' : 'music_library')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'music_library' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                <Music className="w-5 h-5 text-slate-950" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  म्यूजिक लाइब्रेरी डैशबोर्ड
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  कॉपीराइट सेफ बैकग्राउंड म्यूज़िक, अपलोड, प्रीव्यू व वीडियो ऑडियो मिक्सिंग कंट्रोल
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                ADMIN
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'music_library' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'music_library' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              <AdminMusicLibraryManager currentUser={currentUser} />
            </div>
          )}
        </div>


        {/* ========================================================================= */}
        {/* STEP 6: प्रोमो कोड्स मैनेजर (PROMO CODES MANAGER) - Master Admin Only       */}
        {/* ========================================================================= */}
        {isSuperAdminUser && (
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'promocodes' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'promocodes' ? '' : 'promocodes')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'promocodes' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  प्रोमो कोड्स मैनेजर
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  सिंगल-यूज़ प्रोमो कोड जनरेशन व एक्टिवेशन
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${promoCodes.length} कोड्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'promocodes' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'promocodes' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              
            {!isSuperAdminUser ? (
              <div className="p-8 bg-slate-900/90 border border-rose-500/40 rounded-2xl text-center space-y-4 shadow-2xl my-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base sm:text-lg font-black text-white">सुपर एडमिन सुरक्षा नियंत्रण</h4>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    यह सेक्शन (<strong>5. प्रोमो कोड्स व कूपन मैनेजर</strong>) केवल प्राथमिक <strong>सुपर एडमिन (admin.ainewsmaker@gmail.com)</strong> के लिए आरक्षित है। सामान्य एडमिन इसे देख या संपादित नहीं कर सकते।
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold">
                  <Crown className="w-4 h-4 text-amber-400" /> केवल सुपर एडमिन ही यूज़र्स, प्रोमो कोड, प्लान्स व सुरक्षा सूची नियंत्रित कर सकते हैं
                </div>
              </div>
            ) : (
        <div className="space-y-6">
          {/* Manual Payment Workflow Guide */}
          <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-xs text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 block">
                  मैन्युअल पेमेंट → प्रोमो कोड → प्लान एक्टिवेशन वर्कफ़्लो:
                </span>
                <span>
                  ग्राहक से ऑफ़लाइन/UPI पेमेंट लेने के बाद, यहाँ उस प्लान का <strong>Single-Use प्रोमो कोड</strong> बनाएं और ग्राहक को दें। ग्राहक द्वारा रिडीम करते ही प्लान तुरंत एक्टिव हो जाएगा और कोड 'USED' हो जाएगा।
                </span>
              </div>
            </div>
          </div>

          {/* Form to Create New Promo Code */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">नया प्रोमो कोड बनाएं</h3>
              </div>
              <span className="text-xs text-slate-400">एक समय में केवल 1 प्लान एक्टिवेट होगा</span>
            </div>

            {promoMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                  promoMsg.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300'
                    : 'bg-red-950/80 border border-red-500 text-red-300'
                }`}
              >
                {promoMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{promoMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreatePromoCode} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* 1. Which Plan? */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    1. कौन सा प्लान एक्टिवेट होगा? *
                  </label>
                  <select
                    value={newPromoPlan}
                    onChange={(e) => {
                      const selected = e.target.value as UserPlanTier;
                      setNewPromoPlan(selected);
                      handleAutoGenerateCode(selected);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500 font-bold cursor-pointer"
                  >
                    <option value="basic">BASIC (बेसिक)</option>
                    <option value="advanced">ADVANCE (एडवांस)</option>
                    <option value="professional">PRO (प्रो)</option>
                    <option value="ultra">VIP DESK (वीआईपी डेस्क)</option>
                  </select>
                </div>

                {/* 2. Custom or Auto Promo Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      2. प्रोमो कोड (Code String) *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoGenerateCode(newPromoPlan)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>ऑटो जनरेट</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newPromoCodeStr}
                    onChange={(e) => setNewPromoCodeStr(e.target.value.toUpperCase())}
                    placeholder="उदा. PRO-RIT2026-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-amber-400 uppercase tracking-wider focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                {/* 3. Usage Type: Single-Use (One-time) vs Unlimited */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    3. उपयोग प्रकार (Usage Type) *
                  </label>
                  <select
                    value={newPromoUsageType}
                    onChange={(e) => setNewPromoUsageType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="one_time">One Time Use (एक बार उपयोग — Default)</option>
                    <option value="unlimited">Multiple / Unlimited (कई यूज़र्स हेतु)</option>
                  </select>
                </div>

                {/* 4. Validity / Duration in Days */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    4. प्लान वैधता
                  </label>
                  <select
                    value={newPromoDurationDays}
                    onChange={(e) => setNewPromoDurationDays(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value={7}>7 दिन (फ्री ट्रायल)</option>
                    <option value={30}>30 दिन (1 माह)</option>
                    <option value={90}>90 दिन (3 माह)</option>
                    <option value={180}>180 दिन (6 माह)</option>
                    <option value={365}>365 दिन (1 वर्ष)</option>
                    <option value={9999}>आजीवन (Lifetime Access)</option>
                  </select>
                </div>
              </div>

              {/* Notes / Payment Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  नोट्स / पेमेंट संदर्भ (उदा. "Customer Ramesh ₹999 PhonePe")
                </label>
                <input
                  type="text"
                  value={newPromoNotes}
                  onChange={(e) => setNewPromoNotes(e.target.value)}
                  placeholder="ऑफ़लाइन पेमेंट या ग्राहक का नाम दर्ज करें"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg flex items-center gap-2 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>प्रोमो कोड सुरक्षित करें</span>
                </button>
              </div>
            </form>
          </div>

          {/* Search, Filter & Promo Codes List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">सक्रिय प्रोमो कोड सूची ({filteredPromoCodes.length})</h3>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={promoSearch}
                    onChange={(e) => setPromoSearch(e.target.value)}
                    placeholder="खोजें..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <select
                  value={promoPlanFilter}
                  onChange={(e) => setPromoPlanFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">सभी प्लान्स</option>
                  <option value="basic">BASIC</option>
                  <option value="advanced">ADVANCE</option>
                  <option value="professional">PRO</option>
                  <option value="ultra">VIP DESK</option>
                </select>

                <select
                  value={promoStatusFilter}
                  onChange={(e) => setPromoStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">सभी स्टेटस</option>
                  <option value="unused">Unused (सक्रिय)</option>
                  <option value="used">Used (इस्तेमाल हुआ)</option>
                  <option value="disabled">Disabled (निष्क्रिय)</option>
                </select>
              </div>
            </div>

            {/* Table of Promo Codes */}
            {filteredPromoCodes.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                कोई प्रोमो कोड नहीं मिला। ऊपर दिए गए फ़ॉर्म से नया प्रोमो कोड बनाएं।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/50">
                      <th className="p-3">प्रोमो कोड</th>
                      <th className="p-3">प्लान</th>
                      <th className="p-3">उपयोग</th>
                      <th className="p-3">स्थिति</th>
                      <th className="p-3">उपयोगकर्ता</th>
                      <th className="p-3">वैधता</th>
                      <th className="p-3 text-right">कार्रवाई</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {filteredPromoCodes.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Promo Code & Copy */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-amber-300 tracking-wider">
                              {item.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition"
                              title="कोड कॉपी करें"
                            >
                              {copiedCode === item.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {item.notes && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">{item.notes}</span>
                          )}
                        </td>

                        {/* Plan */}
                        <td className="p-3">{getTierBadge(item.planId)}</td>

                        {/* Usage Type */}
                        <td className="p-3 text-slate-300">
                          {item.usageType === 'one_time' ? (
                            <span className="text-[11px] text-sky-400 font-bold">One-Time (एक बार)</span>
                          ) : (
                            <span className="text-[11px] text-purple-400 font-bold">Unlimited (असीमित)</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {item.status === 'used' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-950 border border-purple-600 text-purple-300 text-[10px] font-black rounded-md">
                              <CheckCircle2 className="w-3 h-3 text-purple-400" />
                              <span>USED / REDEEMED</span>
                            </span>
                          ) : item.isActive && item.status === 'unused' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 border border-emerald-600 text-emerald-300 text-[10px] font-black rounded-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>UNUSED (सक्रिय)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950 border border-red-600 text-red-300 text-[10px] font-black rounded-md">
                              <XCircle className="w-3 h-3 text-red-400" />
                              <span>DISABLED</span>
                            </span>
                          )}
                        </td>

                        {/* Used By */}
                        <td className="p-3">
                          {item.usedByEmail ? (
                            <div>
                              <span className="font-bold text-slate-200 block truncate max-w-[150px]">
                                {item.usedByEmail}
                              </span>
                              {item.usedAt && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(item.usedAt).toLocaleDateString('hi-IN')}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">— उपलब्ध —</span>
                          )}
                        </td>

                        {/* Validity */}
                        <td className="p-3 text-slate-300 font-bold">
                          {item.durationDays >= 9999 ? 'आजीवन' : `${item.durationDays} दिन`}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleCode(item.id)}
                              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                                item.isActive
                                  ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-950'
                                  : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                              }`}
                              title={item.isActive ? 'कोड निष्क्रिय करें' : 'कोड सक्रिय करें'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCode(item.id, item.code)}
                              className="p-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-950/60 text-xs transition cursor-pointer"
                              title="हटाएं"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
              )}
            </div>
          )}
        </div>
        )}


        {/* ========================================================================= */}
        {/* STEP 7: यूज़र्स प्रबंधन (USERS MANAGER) - Master Admin Only                */}
        {/* ========================================================================= */}
        {isSuperAdminUser && (
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'users' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'users' ? '' : 'users')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'users' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  यूज़र्स प्रबंधन
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  पंजीकृत यूज़र्स, टियर व कस्टम हेडर/फुटर (यूज़र डेटा संपादन व सुरक्षा)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${planUsers.length} यूज़र्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'users' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'users' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              
            {!isSuperAdminUser ? (
              <div className="p-8 bg-slate-900/90 border border-rose-500/40 rounded-2xl text-center space-y-4 shadow-2xl my-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base sm:text-lg font-black text-white">सुपर एडमिन सुरक्षा नियंत्रण</h4>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    यह सेक्शन (<strong>6. यूजर्स मैनेजर व रोल नियंत्रण</strong>) केवल प्राथमिक <strong>सुपर एडमिन (admin.ainewsmaker@gmail.com)</strong> के लिए आरक्षित है। सामान्य एडमिन इसे देख या संपादित नहीं कर सकते।
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold">
                  <Crown className="w-4 h-4 text-amber-400" /> केवल सुपर एडमिन ही यूज़र्स, प्रोमो कोड, प्लान्स व सुरक्षा सूची नियंत्रित कर सकते हैं
                </div>
              </div>
            ) : (
        <div className="space-y-6">
          {/* 0. LOGO CHANGE REQUESTS MANAGEMENT CARD */}
          <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 font-black">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                    <span>लोगो बदलने के अनुरोध</span>
                    {logoRequests.filter((r) => r.status === 'pending').length > 0 && (
                      <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full animate-pulse">
                        {logoRequests.filter((r) => r.status === 'pending').length} नए
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-amber-200">
                    यूज़र्स द्वारा चैनल लोगो बदलने हेतु सबमिट की गई रिक्वेस्ट। एडमिन द्वारा स्वीकृत (Approve) करने पर संबंधित यूज़र का प्रोफाइल अनलॉक हो जाएगा।
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-950/80 text-amber-300 border border-amber-500/40 text-[11px] font-black rounded-lg">
                🔐 एकबारगी सेटअप अनलॉक
              </span>
            </div>

            {logoReqMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{logoReqMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLogoReqMsg('')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {logoRequests.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                वर्तमान में कोई लोगो बदलने का अनुरोध प्राप्त नहीं हुआ है। जब कोई यूज़र प्रोफाइल से अनुरोध करेगा, वह यहाँ प्रदर्शित होगा।
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">यूज़र विवरण</th>
                      <th className="p-3">लोगो प्रिव्यू (नया / वर्तमान)</th>
                      <th className="p-3">चैनल नाम</th>
                      <th className="p-3">अनुरोध का कारण</th>
                      <th className="p-3">दिनांक</th>
                      <th className="p-3">स्थिति</th>
                      <th className="p-3 text-right">कार्रवाई</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {logoRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          {(() => {
                            const matchedUser = planUsers.find((u) => u.email.toLowerCase().trim() === req.userEmail.toLowerCase().trim());
                            const name = req.userName || matchedUser?.name || 'यूज़र';
                            const uname = req.username || matchedUser?.username;
                            const unameFormatted = uname ? (uname.startsWith('@') ? uname : `@${uname}`) : '';
                            return (
                              <div className="space-y-0.5">
                                <div className="font-bold text-white text-xs">{name}</div>
                                {unameFormatted && (
                                  <div className="text-[11px] font-mono text-amber-300 font-bold">{unameFormatted}</div>
                                )}
                                <div className="text-[10px] font-mono text-slate-400">{req.userEmail}</div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {req.newLogoUrl ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-12 h-12 rounded-lg border-2 border-emerald-500/60 bg-slate-950 p-1 flex items-center justify-center overflow-hidden shadow-md">
                                  <img src={req.newLogoUrl} alt="New Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1 rounded">नया लोगो</span>
                              </div>
                            ) : null}
                            {req.currentLogoUrl ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-950 p-1 flex items-center justify-center overflow-hidden opacity-75">
                                  <img src={req.currentLogoUrl} alt="Current Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                                <span className="text-[9px] text-slate-400">वर्तमान</span>
                              </div>
                            ) : null}
                            {!req.newLogoUrl && !req.currentLogoUrl && (
                              <span className="text-xs text-slate-500 italic">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-amber-300">
                          {req.channelName || '—'}
                        </td>
                        <td className="p-3 text-slate-300 max-w-xs">
                          {req.reason || 'लोगो बदलने की अनुमति चाहिए'}
                        </td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleDateString('hi-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-black">
                              ⏳ लंबित
                            </span>
                          ) : req.status === 'approved' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black">
                              ✓ स्वीकृत (Unlocked)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 text-[10px] font-black">
                              ✕ अस्वीकृत (Rejected)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  approveLogoChangeRequest(req.id);
                                  setLogoRequests(getLogoChangeRequests());
                                  setPlanUsers(getPlanUsers());
                                  setLogoReqMsg(`यूज़र ${req.userEmail} का लोगो परिवर्तन अनुरोध स्वीकृत! उनका प्रोफाइल अनलॉक कर दिया गया है।`);
                                  if (onPlanChanged) onPlanChanged();
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg shadow flex items-center gap-1 cursor-pointer transition active:scale-95"
                                title="स्वीकृत करें (यूज़र को अनलॉक करें)"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>स्वीकृत करें</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  rejectLogoChangeRequest(req.id);
                                  setLogoRequests(getLogoChangeRequests());
                                  setLogoReqMsg(`यूज़र ${req.userEmail} का अनुरोध अस्वीकृत कर दिया गया।`);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-200 font-bold text-[11px] rounded-lg cursor-pointer transition"
                                title="अस्वीकृत करें"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>अस्वीकृत</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">
                              {req.status === 'approved' ? 'अनलॉक पूर्ण' : 'कार्रवाई पूर्ण'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. Manual Plan Assignment Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Users className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">यूज़र को मैन्युअल प्लान असाइन करें</h3>
            </div>

            {manualAssignMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{manualAssignMsg}</span>
              </div>
            )}

            <form onSubmit={handleManualUserAssign} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">यूज़र ईमेल / मोबाइल *</label>
                <input
                  type="text"
                  value={manualUserEmail}
                  onChange={(e) => setManualUserEmail(e.target.value)}
                  placeholder="उदा. reporter@breakingnews.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">प्लान चुनें *</label>
                <select
                  value={manualUserTier}
                  onChange={(e) => setManualUserTier(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500 cursor-pointer font-bold"
                >
                  <option value="basic">BASIC</option>
                  <option value="advanced">ADVANCE</option>
                  <option value="professional">PRO</option>
                  <option value="ultra">VIP DESK</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">वैधता (दिन)</label>
                <input
                  type="number"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>प्लान लागू करें</span>
                </button>
              </div>
            </form>
          </div>

          {/* 2.5 SUPER ADMIN: ADD NEW USER / ADMIN (ईमेल व पासवर्ड के साथ नया यूज़र / एडमिन जोड़ें) */}
          <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border border-amber-500/50 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>➕ नया यूज़र या एडमिन जोड़ें</span>
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  सुपर एडमिन सीधे यहाँ से किसी भी पत्रकार/यूज़र या एडमिन का ईमेल आईडी व पासवर्ड बनाकर अकाउंट जोड़ सकते हैं।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <span>{isAddUserOpen ? '✕ फॉर्म बंद करें' : '➕ नया यूज़र जोड़ें'}</span>
              </button>
            </div>

            {isAddUserOpen && (
              <form onSubmit={handleSuperAdminAddUser} className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                {addUserSuccessMsg && (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{addUserSuccessMsg}</span>
                  </div>
                )}
                {addUserErrorMsg && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>{addUserErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">पूरा नाम *</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="उदा. राहुल शर्मा"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">ईमेल आईडी *</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">लॉगिन पासवर्ड *</label>
                    <input
                      type="text"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="कम से कम 4 अक्षर (उदा. pass123)"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">रोल चयन *</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-bold focus:border-amber-400 focus:outline-hidden cursor-pointer"
                    >
                      <option value="user">👤 सामान्य यूज़र / रिपोर्टर (User)</option>
                      <option value="admin">🛡️ एडमिन (Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">प्लान टियर *</label>
                    <select
                      value={newUserPlan}
                      onChange={(e) => setNewUserPlan(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-amber-300 font-bold focus:border-amber-400 focus:outline-hidden cursor-pointer"
                    >
                      <option value="basic">BASIC (वॉटरमार्क सहित)</option>
                      <option value="advanced">ADVANCE (फुल एचडी)</option>
                      <option value="professional">PRO (वीडियो स्टूडियो)</option>
                      <option value="ultra">VIP DESK (4K फ्रेम्स)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">मोबाइल नंबर (वैकल्पिक)</label>
                    <input
                      type="tel"
                      value={newUserMobile}
                      onChange={(e) => setNewUserMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition active:scale-95 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>अकाउंट बनाएं व डेटाबेस में जोड़ें</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 3. ADMIN USER CONTROL: ALL REGISTERED USERS DATABASE RECORDS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>पंजीकृत यूज़र्स व डेटाबेस रिकॉर्ड्स</span>
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-xs font-black rounded-full">
                    {planUsers.length}
                  </span>
                  {lastSyncTime && (
                    <span className="text-[10px] text-slate-400 font-mono font-normal">
                      (सिंक: {lastSyncTime})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  सभी पंजीकृत Google व रिपोर्टर खाते, 7-दिवसीय ट्रायल स्थिति, सक्रिय/ब्लॉक स्थिति व पूर्ण खाता नियंत्रण।
                </p>
              </div>

              {/* Controls: Filter, Search, Sync Button */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                {/* Status Filter */}
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 text-amber-300 rounded-xl px-2.5 py-1.5 text-xs font-bold cursor-pointer hover:border-amber-400 focus:outline-hidden"
                >
                  <option value="all">सभी यूज़र्स ({planUsers.length})</option>
                  <option value="active">🟢 सक्रिय यूज़र्स</option>
                  <option value="blocked">🔴 ब्लॉक किए गए</option>
                  <option value="trial_active">⏱️ ट्रायल चालू</option>
                  <option value="trial_expired">🔒 ट्रायल समाप्त</option>
                </select>

                {/* Search Box */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="यूज़र / ईमेल / चैनल खोजें..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                {/* Manual Sync Button */}
                <button
                  type="button"
                  onClick={handleSyncUsers}
                  disabled={isSyncingUsers}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
                  title="सर्वर से नवीनतम यूज़र डेटाबेस सिंक करें"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUsers ? 'animate-spin text-amber-400' : ''}`} />
                  <span>{isSyncingUsers ? 'सिंक हो रहा...' : 'रीफ्रेश'}</span>
                </button>
              </div>
            </div>

            {/* SECTION 11: 4 Navigable Categories Bar */}
            <div className="w-full flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: 'ALL', label: 'सभी श्रेणियां (All Users)', count: planUsers.length, color: 'from-slate-700 to-slate-800' },
                { id: 'BASIC', label: '1. Basic Users', count: planUsers.filter(u => (u.tier || 'basic').toLowerCase() === 'basic').length, color: 'from-amber-600 to-amber-700' },
                { id: 'ADVANCED', label: '2. Advanced Users', count: planUsers.filter(u => (u.tier || '').toLowerCase() === 'advanced').length, color: 'from-blue-600 to-blue-700' },
                { id: 'PRO', label: '3. Pro Users', count: planUsers.filter(u => ['pro', 'professional'].includes((u.tier || '').toLowerCase())).length, color: 'from-purple-600 to-purple-700' },
                { id: 'VIP', label: '4. VIP Desk Users', count: planUsers.filter(u => ['vip', 'ultra'].includes((u.tier || '').toLowerCase())).length, color: 'from-emerald-600 to-emerald-700' },
              ].map((cat) => {
                const isActive = userTierCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setUserTierCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer border ${
                      isActive
                        ? `bg-gradient-to-r ${cat.color} text-white border-white/40 shadow-md ring-2 ring-amber-400/30`
                        : 'bg-slate-900/80 hover:bg-slate-850 text-slate-300 border-slate-700/80'
                    }`}
                  >
                    <span>{cat.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${isActive ? 'bg-black/40 text-amber-300' : 'bg-slate-950 text-slate-400'}`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {planUsers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                फिलहाल कोई यूज़र रिकॉर्ड नहीं है। नए यूज़र्स के लॉगिन करने पर वे यहाँ स्वतः दिखेंगे।
              </div>
            ) : (
              <>
              {/* Mobile Registered Users Cards (Phase 6) */}
              <div className="sm:hidden space-y-3">
                {planUsers
                  .filter((u) => {
                    if (userTierCategory !== 'ALL') {
                      const normTier = (u.tier || 'basic').toLowerCase();
                      if (userTierCategory === 'BASIC' && normTier !== 'basic') return false;
                      if (userTierCategory === 'ADVANCED' && normTier !== 'advanced') return false;
                      if (userTierCategory === 'PRO' && normTier !== 'professional' && normTier !== 'pro') return false;
                      if (userTierCategory === 'VIP' && normTier !== 'ultra' && normTier !== 'vip') return false;
                    }
                    if (userStatusFilter === 'active' && u.isBlocked) return false;
                    if (userStatusFilter === 'blocked' && !u.isBlocked) return false;
                    if (userStatusFilter === 'trial_active') {
                      if (u.isBlocked || u.isTrialExpired || (u.daysRemaining !== undefined && u.daysRemaining <= 0)) return false;
                    }
                    if (userStatusFilter === 'trial_expired') {
                      if (!u.isTrialExpired && (u.daysRemaining === undefined || u.daysRemaining > 0)) return false;
                    }
                    if (!userSearch.trim()) return true;
                    const s = userSearch.toLowerCase();
                    return (
                      u.email.toLowerCase().includes(s) ||
                      (u.name && u.name.toLowerCase().includes(s)) ||
                      (u.channelName && u.channelName.toLowerCase().includes(s)) ||
                      (u.mobile && u.mobile.includes(s))
                    );
                  })
                  .map((u) => (
                    <div key={u.userId || u.email} className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-black text-slate-950 text-xs shrink-0 overflow-hidden">
                            {u.channelLogoUrl ? <img src={u.channelLogoUrl} alt={u.name} className="w-full h-full object-contain" /> : (u.name ? u.name[0].toUpperCase() : '👤')}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-black text-white truncate">{u.name || u.fullName || 'यूज़र'}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{u.email}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          u.tier === 'ultra' ? 'bg-purple-900/80 text-purple-300 border border-purple-600' :
                          u.tier === 'professional' ? 'bg-amber-900/80 text-amber-300 border border-amber-600' :
                          u.tier === 'advanced' ? 'bg-blue-900/80 text-blue-300 border border-blue-600' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {u.planName || u.tier || 'BASIC'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                        <div>
                          <span className="text-slate-500">चैनल: </span>
                          <span className="font-bold text-slate-200 truncate">{u.channelName || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">फोन: </span>
                          <span className="font-mono text-emerald-400 font-bold">{u.mobile ? `+91 ${u.mobile}` : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">स्थिति: </span>
                          <span className={u.isBlocked ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {u.isBlocked ? 'ब्लॉक' : 'सक्रिय'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">दैनिक कोटा: </span>
                          <span className="font-mono text-amber-300 font-bold">
                            {u.tier === 'ultra' ? 'असीमित' : u.tier === 'professional' ? '50/दिन' : u.tier === 'advanced' ? '25/दिन' : '10/दिन'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => {
                            const nextTier = u.tier === 'basic' ? 'advanced' : u.tier === 'advanced' ? 'professional' : u.tier === 'professional' ? 'ultra' : 'basic';
                            adminUpdateUserRecord(u.email, { tier: nextTier });
                            adminUpdateCloudUser(u.userId, { tier: nextTier });
                            setPlanUsers(getPlanUsers());
                          }}
                          className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-lg cursor-pointer hover:bg-amber-500/30 active:scale-95 transition"
                        >
                          प्लान बदलें
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextBlocked = !u.isBlocked;
                            adminUpdateUserRecord(u.email, { isBlocked: nextBlocked });
                            adminUpdateCloudUser(u.userId, { isBlocked: nextBlocked });
                            setPlanUsers(getPlanUsers());
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg cursor-pointer active:scale-95 transition border ${
                            u.isBlocked
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : 'bg-rose-950 text-rose-300 border-rose-700'
                          }`}
                        >
                          {u.isBlocked ? 'अनब्लॉक' : 'ब्लॉक'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Desktop Registered Users Table */}
              <div className="hidden sm:block w-full max-w-[calc(100vw-2rem)] sm:max-w-full overflow-x-auto touch-pan-x scrollbar-thin pb-2">
                <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                      <th className="p-3 w-[36%]">यूज़र व अकाउंट विवरण</th>
                      <th className="p-3 w-[28%]">वर्तमान प्लान व वैधता</th>
                      <th className="p-3 w-[36%] text-right">खाता स्थिति, कॉइन्स व एक्शन</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {planUsers
                      .filter((u) => {
                        // Filter by 4 Navigable Categories (Section 11)
                        if (userTierCategory !== 'ALL') {
                          const normTier = (u.tier || 'basic').toLowerCase();
                          if (userTierCategory === 'BASIC' && normTier !== 'basic') return false;
                          if (userTierCategory === 'ADVANCED' && normTier !== 'advanced') return false;
                          if (userTierCategory === 'PRO' && normTier !== 'professional' && normTier !== 'pro') return false;
                          if (userTierCategory === 'VIP' && normTier !== 'ultra' && normTier !== 'vip') return false;
                        }

                        // Filter by status
                        if (userStatusFilter === 'active' && u.isBlocked) return false;
                        if (userStatusFilter === 'blocked' && !u.isBlocked) return false;
                        if (userStatusFilter === 'trial_active') {
                          if (u.isBlocked || u.isTrialExpired || (u.daysRemaining !== undefined && u.daysRemaining <= 0)) return false;
                        }
                        if (userStatusFilter === 'trial_expired') {
                          if (!u.isTrialExpired && (u.daysRemaining === undefined || u.daysRemaining > 0)) return false;
                        }

                        // Search
                        if (!userSearch.trim()) return true;
                        const s = userSearch.toLowerCase();
                        return (
                          u.email.toLowerCase().includes(s) ||
                          (u.name && u.name.toLowerCase().includes(s)) ||
                          (u.channelName && u.channelName.toLowerCase().includes(s)) ||
                          (u.mobile && u.mobile.includes(s))
                        );
                      })
                      .map((u) => {
                        const isSuper = isUserSuperAdmin(u.email) || u.role === 'superadmin';
                        const isBlocked = Boolean(u.isBlocked);
                        const isExpired = Boolean(u.isTrialExpired || (u.tier === 'basic' && u.daysRemaining !== undefined && u.daysRemaining <= 0));
                        const trialStart = u.trialStartedAt || u.createdAt || u.activatedAt;
                        const trialEnds = u.trialEndsAt || (trialStart ? trialStart + 7 * 24 * 3600 * 1000 : 0);
                        const linkedSubs = adminAllSubUsers.filter((s) => s.primaryEmail?.toLowerCase().trim() === u.email?.toLowerCase().trim());

                        return (
                          <tr key={u.userId || u.email} className={`hover:bg-slate-800/40 transition-colors ${isBlocked ? 'bg-rose-950/15' : ''}`}>
                            {/* 1. User & Account Info + Role (Combined in Column 1) */}
                            <td className="p-3 align-top">
                              <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm">{u.name || u.fullName || u.username || 'यूज़र'}</span>
                                {isSuper ? (
                                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black rounded uppercase flex items-center gap-0.5">
                                    👑 Super Admin
                                  </span>
                                ) : u.role === 'admin' ? (
                                  <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black rounded uppercase">
                                    🛡️ Admin
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-bold rounded uppercase">
                                    👤 Reporter
                                  </span>
                                )}
                                {(u as any).profileIncomplete && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] font-semibold rounded">
                                    ⚠️ सेटअप अधूरा
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{u.email}</div>
                              {u.mobile && (
                                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">📞 {u.mobile}</div>
                              )}
                              <div className="text-[10.5px] text-slate-300 mt-1 flex items-center gap-1">
                                <span className="text-slate-500">📺</span>
                                <span className="font-bold text-slate-200 truncate">{u.channelName || 'चैनल नाम नहीं'}</span>
                                {u.websiteUrl && (
                                  <span className="text-slate-500 text-[9.5px] font-mono">({u.websiteUrl})</span>
                                )}
                              </div>

                              {/* Inline Role Selector inside Column 1 */}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-slate-400 font-semibold">रोल:</span>
                                {isSuper ? (
                                  <span className="text-[10px] font-bold text-amber-300">सुपर एडमिन (फिक्स्ड)</span>
                                ) : (
                                  <select
                                    value={u.role === 'admin' ? 'admin' : 'user'}
                                    disabled={isSuper}
                                    onChange={(e) => {
                                      const newRole = e.target.value as any;
                                      adminUpdateUserRecord(u.email, { role: newRole });
                                      adminUpdateCloudUser(u.userId, { role: newRole });
                                      setPlanUsers(getPlanUsers());
                                    }}
                                    className="bg-slate-950 border border-slate-700 text-amber-300 rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer hover:border-amber-400 focus:outline-hidden"
                                  >
                                    <option value="admin">🛡️ एडमिन</option>
                                    <option value="user">👤 रिपोर्टर / यूज़र</option>
                                  </select>
                                )}
                                <span className="text-[9px] text-slate-500 ml-auto">
                                  पंजीकृत: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('hi-IN') : 'सक्रिय'}
                                </span>
                              </div>

                              {/* Linked Sub-Users Display (Section 11) */}
                              {(['ultra', 'vip', 'professional', 'pro'].includes((u.tier || '').toLowerCase()) || isSuper || linkedSubs.length > 0) && (
                                <div className="mt-2 p-2 rounded-xl bg-slate-950/90 border border-cyan-900/50 text-[10.5px]">
                                  <div className="flex items-center justify-between font-bold text-cyan-300">
                                    <span className="flex items-center gap-1">
                                      <span>👥 सब-यूज़र:</span>
                                      <span className="font-mono">{linkedSubs.length} / {['ultra', 'vip'].includes((u.tier || '').toLowerCase()) || isSuper ? 3 : 1}</span>
                                    </span>
                                    <span className="text-[9px] text-slate-400">
                                      {linkedSubs.length === 0 ? 'कोई लिंक नहीं' : `${linkedSubs.length} सक्रिय`}
                                    </span>
                                  </div>
                                  {linkedSubs.length > 0 && (
                                    <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto">
                                      {linkedSubs.map((sub, sIdx) => (
                                        <div key={sub.id || sIdx} className="text-[9.5px] font-mono text-slate-300 truncate flex items-center gap-1">
                                          <span className="text-cyan-400">•</span>
                                          <span>{sub.subUserEmail}</span>
                                          {sub.subUserName && <span className="text-slate-400">({sub.subUserName})</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 2. Current Plan & Trial Status (Combined in Column 2) */}
                            <td className="p-3 align-top">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div>{getTierBadge(u.tier || 'basic')}</div>
                                  {!isSuper && (
                                    <select
                                      value={u.tier || 'basic'}
                                      onChange={(e) => {
                                        const newTier = e.target.value as UserPlanTier;
                                        adminUpdateUserRecord(u.email, { tier: newTier });
                                        adminUpdateCloudUser(u.userId, { tier: newTier });
                                        setPlanUsers(getPlanUsers());
                                      }}
                                      className="bg-slate-950 border border-slate-700 text-white rounded px-1.5 py-0.5 text-[10px] font-bold cursor-pointer hover:border-amber-400 focus:outline-hidden"
                                    >
                                      <option value="basic">BASIC</option>
                                      <option value="advanced">ADVANCE</option>
                                      <option value="professional">PRO</option>
                                      <option value="ultra">VIP DESK</option>
                                    </select>
                                  )}
                                </div>

                                {/* Plan / Trial Validity underneath */}
                                <div className="pt-0.5">
                                  {isSuper || (u.tier && u.tier !== 'basic') ? (
                                    <div className="space-y-0.5">
                                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-bold rounded flex items-center gap-1 w-max">
                                        ⭐ सशुल्क / पेड प्लान
                                      </span>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        वैधता: {u.expiresAt ? new Date(u.expiresAt).toLocaleDateString('hi-IN') : 'स्थायी (Lifetime)'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      {isExpired ? (
                                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9.5px] font-bold rounded flex items-center gap-1 w-max">
                                          🔒 7-दिन ट्रायल समाप्त
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9.5px] font-bold rounded flex items-center gap-1 w-max">
                                          ⏱️ {u.daysRemaining ?? 7} दिन {u.hoursRemaining ?? 0} घंटे शेष
                                        </span>
                                      )}
                                      <div className="text-[9px] text-slate-400 font-mono leading-tight">
                                        प्रारंभ: {trialStart ? new Date(trialStart).toLocaleDateString('hi-IN') : '-'}<br />
                                        समाप्ति: {trialEnds ? new Date(trialEnds).toLocaleDateString('hi-IN') : '-'}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* 3. Status, Coins & Actions (Expanded & Consolidated in Column 3) */}
                            <td className="p-3 align-top text-right">
                              {/* Row 1: Account Status & Profile Lock Badges */}
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isBlocked ? (
                                  <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-600 rounded-lg text-[9.5px] font-black flex items-center gap-1">
                                    <Ban className="w-3 h-3 text-rose-400" />
                                    <span>🔴 ब्लॉक</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-600 rounded-lg text-[9.5px] font-black flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span>🟢 सक्रिय</span>
                                  </span>
                                )}

                                {isSuper ? (
                                  <span
                                    className="px-2 py-0.5 rounded-lg text-[9.5px] font-bold border border-amber-500/60 bg-amber-950/60 text-amber-300 flex items-center gap-1 select-none"
                                    title="मास्टर / सुपर एडमिन प्रोफाइल स्थायी रूप से सुरक्षित व लॉक है"
                                  >
                                    <Lock className="w-2.5 h-2.5 text-amber-400" />
                                    <span>🔒 स्थायी लॉक</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newLockState = !u.isLocked;
                                      adminUpdateUserRecord(u.email, { isLocked: newLockState });
                                      adminUpdateCloudUser(u.userId, { isLocked: newLockState });
                                      setPlanUsers(getPlanUsers());
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                                      u.isLocked !== false
                                        ? 'bg-amber-950/60 border-amber-600/80 text-amber-300 hover:bg-amber-900/60'
                                        : 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900/60'
                                    }`}
                                    title={u.isLocked !== false ? 'क्लिक करके अनलॉक करें' : 'क्लिक करके सुरक्षित लॉक करें'}
                                  >
                                    {u.isLocked !== false ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                                    <span>{u.isLocked !== false ? 'लॉक्ड' : 'अनलॉक्ड'}</span>
                                  </button>
                                )}

                                <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                  <Coins className="w-3 h-3 text-amber-400" />
                                  <span>{(u as any).coinBalance ?? (u as any).coins ?? 0} कॉइन्स</span>
                                </div>
                              </div>

                              {/* Row 2: Action Buttons */}
                              <div className="flex items-center justify-end gap-1.5 flex-wrap mt-2">
                                {/* Coin Credit Action Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenCoinCreditDialog(u)}
                                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                                  title="यूज़र को कॉइन क्रेडिट करें"
                                >
                                  <Coins className="w-3 h-3 text-amber-400" />
                                  <span>कॉइन जोड़ें</span>
                                </button>

                                {/* Block / Unblock Toggle */}
                                {isBlocked ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlockUser(u)}
                                    className="px-2 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/80 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                                    title="खाते को अनब्लॉक करें"
                                  >
                                    <UserCheck className="w-3 h-3 text-emerald-400" />
                                    <span>अनब्लॉक</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBlockUser(u)}
                                    disabled={isSuper}
                                    className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-500/80 text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                                    title={isSuper ? "सुपर एडमिन को ब्लॉक नहीं किया जा सकता" : "खाते को तुरंत ब्लॉक करें"}
                                  >
                                    <Ban className="w-3 h-3 text-rose-400" />
                                    <span>ब्लॉक</span>
                                  </button>
                                )}

                                {/* Branding Edit Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenBrandingEditor(u)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                                  title="ब्रांडिंग व लोगो संपादित करें"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>ब्रांडिंग</span>
                                </button>

                                {/* Delete User Button */}
                                <button
                                  type="button"
                                  disabled={isSuper}
                                  onClick={async () => {
                                    if (window.confirm(`क्या आप यूजर "${u.name || u.email}" का प्रोफाइल व पूरा डेटाबेस हमेशा के लिए हटाना चाहते हैं?`)) {
                                      adminDeleteUserRecord(u.email);
                                      await adminDeleteCloudUser(u.email, u.userId).catch(() => {});
                                      setPlanUsers(getPlanUsers());
                                    }
                                  }}
                                  className="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/50 text-rose-300 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                                  title={isSuper ? "सुपर एडमिन को हटाया नहीं जा सकता" : "यूज़र प्रोफाइल व डेटाबेस हटाएं"}
                                >
                                  <Trash2 className="w-3 h-3 text-rose-400" />
                                  <span>हटाएं</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* 4. MODAL: EDIT USER BRANDING BY ADMIN */}
          {editingBrandingUser && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-amber-400" />
                      <span>यूज़र ब्रांडिंग विवरण संपादित करें</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {editingBrandingUser.name || editingBrandingUser.email} ({editingBrandingUser.email})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingBrandingUser(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editBrandMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs font-bold">
                    {editBrandMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">चैनल नाम</label>
                    <input
                      type="text"
                      value={editBrandNameHi}
                      onChange={(e) => setEditBrandNameHi(e.target.value)}
                      placeholder="उदा. ब्रेकिंग न्यूज़ 24"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">वेबसाइट लिंक</label>
                    <input
                      type="text"
                      value={editBrandWebsite}
                      onChange={(e) => setEditBrandWebsite(e.target.value)}
                      placeholder="उदा. www.breakingnews24.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">संपर्क / व्हाट्सएप नंबर</label>
                    <input
                      type="text"
                      value={editBrandMobile}
                      onChange={(e) => setEditBrandMobile(e.target.value)}
                      placeholder="उदा. 9876543210"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">चैनल लोगो (PNG/GIF URL या अपलोड)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editBrandLogoUrl}
                        onChange={(e) => setEditBrandLogoUrl(e.target.value)}
                        placeholder="Logo image URL..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                      />
                      <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>अपलोड</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                          className="hidden"
                        />
                      </label>
                      {editBrandLogoUrl && (
                        <div className="w-8 h-8 rounded border border-slate-700 overflow-hidden bg-slate-950 shrink-0">
                          <img src={editBrandLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">सोशल आइकन्स</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-slate-200">
                      {['youtube', 'facebook', 'instagram', 'twitter', 'linkedin'].map((s) => (
                        <label key={s} className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-slate-700">
                          <input
                            type="checkbox"
                            checked={!!editBrandSocials[s]}
                            onChange={(e) =>
                              setEditBrandSocials({ ...editBrandSocials, [s]: e.target.checked })
                            }
                            className="rounded text-amber-500"
                          />
                          <span className="capitalize">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingBrandingUser(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveUserBranding}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    <span>विवरण सुरक्षित करें</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* COIN CREDIT MODAL (ADMIN COIN MANAGEMENT) */}
          {coinTargetUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">यूज़र को कॉइन जोड़ें</h3>
                      <p className="text-xs text-slate-400">
                        {coinTargetUser.name || coinTargetUser.fullName || coinTargetUser.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isSubmittingCoins) {
                        setCoinTargetUser(null);
                        setCoinDialogError(null);
                        setCoinDialogSuccess(null);
                      }
                    }}
                    disabled={isSubmittingCoins}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {coinDialogError && (
                  <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/80 text-rose-300 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{coinDialogError}</span>
                  </div>
                )}

                {coinDialogSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/80 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{coinDialogSuccess}</span>
                  </div>
                )}

                {/* User info & Current balance */}
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">ईमेल आईडी:</span>
                    <span className="font-mono text-slate-200 font-bold">{coinTargetUser.email}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">वर्तमान कॉइन बैलेंस:</span>
                    <span className="text-amber-400 font-black text-sm flex items-center gap-1">
                      <Coins className="w-4 h-4" />
                      {isLoadingTargetBalance ? 'लोड हो रहा...' : `${targetUserBalance ?? 0} कॉइन्स`}
                    </span>
                  </div>
                </div>

                {/* Coin amount input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    जोड़ने हेतु कॉइन संख्या (Coins to Add) *
                  </label>
                  <div className="relative">
                    <Coins className="w-4 h-4 absolute left-3 top-3 text-amber-400 pointer-events-none" />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={coinAmountInput}
                      onChange={(e) => setCoinAmountInput(e.target.value)}
                      placeholder="उदा. 500"
                      disabled={isSubmittingCoins}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white font-bold focus:outline-hidden focus:border-amber-400 disabled:opacity-50"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">कृपया धनात्मक पूर्णांक (Positive Integer) दर्ज करें</p>
                </div>

                {/* Optional note input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    कारण / नोट (वैकल्पिक / Optional Note)
                  </label>
                  <input
                    type="text"
                    value={coinNoteInput}
                    onChange={(e) => setCoinNoteInput(e.target.value)}
                    placeholder="उदा. विशेष बोनस, कॉन्टेस्ट रिवॉर्ड, सहायता..."
                    disabled={isSubmittingCoins}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400 disabled:opacity-50"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setCoinTargetUser(null);
                      setCoinDialogError(null);
                      setCoinDialogSuccess(null);
                    }}
                    disabled={isSubmittingCoins}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition disabled:opacity-50"
                  >
                    रद्द करें
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCreditCoins}
                    disabled={isSubmittingCoins || !coinAmountInput.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition"
                  >
                    {isSubmittingCoins ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Coins className="w-4 h-4" />
                    )}
                    <span>{isSubmittingCoins ? 'क्रेडिट हो रहा है...' : 'कॉइन जोड़ें'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* EDIT USER MODAL (ADMIN POWER: CHANGE USERNAME, PLAN, PHONE, LOCK) */}
          {editingUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-400 text-slate-950 rounded-xl font-black">
                      <Edit2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">
                        यूज़र विवरण संपादित करें (Admin Edit)
                      </h3>
                      <p className="text-xs text-amber-300">
                        यूज़रनेम, नाम, मोबाइल, प्लान व प्रोफाइल लॉक स्थिति बदलें
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {editUserMsg && (
                  <div className={editUserMsg.type === 'success' ? 'p-3 rounded-xl border text-xs font-bold flex items-center gap-2 bg-emerald-950/80 border-emerald-500 text-emerald-300' : 'p-3 rounded-xl border text-xs font-bold flex items-center gap-2 bg-rose-950/80 border-rose-500 text-rose-300'}>
                    {editUserMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{editUserMsg.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveEditUser} className="space-y-3.5 text-xs">
                  {/* 1. Username - Specially Requested by User */}
                  <div>
                    <label className="block text-slate-200 font-bold mb-1 flex items-center justify-between">
                      <span>1. यूज़रनेम *</span>
                      <span className="text-[10px] text-amber-400 font-normal">⚠️ केवल अक्षर, अंक व अंडरस्कोर</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 font-bold">@</span>
                      <input
                        type="text"
                        required
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="उदा. ainewsmaker"
                        className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono font-bold focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      एडमिन के रूप में आप यूज़र का यूज़रनेम बदल सकते हैं। यह परिवर्तन तुरंत क्लाउड सर्वर पर सिंक होगा।
                    </p>
                  </div>

                  {/* 2. Full Name & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">2. पूरा नाम *</label>
                      <input
                        type="text"
                        required
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">ईमेल (Email ID - संदर्भ)</label>
                      <input
                        type="text"
                        disabled
                        value={editingUser.email}
                        className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* 3. Mobile Number & Channel Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">3. मोबाइल नंबर *</label>
                      <input
                        type="tel"
                        value={editMobile}
                        onChange={(e) => setEditMobile(e.target.value)}
                        placeholder="10 अंकों का मोबाइल"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">4. चैनल का नाम</label>
                      <input
                        type="text"
                        value={editChannelName}
                        onChange={(e) => setEditChannelName(e.target.value)}
                        placeholder="चैनल का नाम"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* 4. Plan Tier & Account Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">5. प्लान / टियर *</label>
                      <select
                        value={editTier}
                        onChange={(e) => setEditTier(e.target.value as UserPlanTier)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden font-bold"
                      >
                        <option value="basic">बेसिक (BASIC - ₹0)</option>
                        <option value="advance">एडवांस (ADVANCE - ₹499)</option>
                        <option value="professional">प्रो (PRO - ₹999)</option>
                        <option value="ultra">वीआईपी डेस्क (VIP DESK - ₹1,999)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-200 font-bold mb-1">6. प्रोफाइल लॉक *</label>
                      <select
                        value={editIsLocked ? 'locked' : 'unlocked'}
                        onChange={(e) => setEditIsLocked(e.target.value === 'locked')}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-amber-400 focus:outline-hidden"
                      >
                        <option value="locked">🔒 लॉक (Locked - नो चेंज)</option>
                        <option value="unlocked">🔓 अनलॉक (Unlocked - एडिट अनुमति)</option>
                      </select>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                    >
                      रद्द करें
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingUser}
                      className="px-5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingUser ? 'सेव हो रहा है...' : 'बदलाव सुरक्षित करें'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
              )}
            </div>
          )}
        </div>
        )}


        {/* ========================================================================= */}
        {/* STEP 8: बोनस रिवॉर्ड्स व क्लेम रिव्यू मैनेजर (BONUS REWARDS & CLAIMS)     */}
        {/* ========================================================================= */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'rewards' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'rewards' ? '' : 'rewards')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'rewards' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-sm shrink-0 shadow-md">
                <Coins className="w-5 h-5 text-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-white block truncate">
                    बोनस पुरस्कार व क्लेम रिव्यू प्रबंधन
                  </span>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black rounded uppercase">
                    पुरस्कार व क्लेम्स
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  यूज़र्स के सोशल मीडिया शेयर क्लेम्स का सत्यापन, अप्रूवल व कॉइन्स क्रेडिट
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg border flex items-center gap-1.5 ${
                adminRewardsStats.pendingClaims > 0
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 animate-pulse'
                  : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}>
                <span>⏳</span>
                <span>{adminRewardsStats.pendingClaims} पेंडिंग क्लेम</span>
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'rewards' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'rewards' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200 space-y-6">
              {/* Header Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400">कुल बोनस न्यूज़</div>
                  <div className="text-xl font-mono font-black text-white mt-0.5">{adminRewardsStats.totalBonusPosts}</div>
                </div>
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400">कुल क्लेम्स</div>
                  <div className="text-xl font-mono font-black text-white mt-0.5">{adminRewardsStats.totalClaims}</div>
                </div>
                <div className="bg-yellow-950/40 border border-yellow-700/60 p-3 rounded-xl">
                  <div className="text-[11px] text-yellow-300 font-bold">लंबित समीक्षा</div>
                  <div className="text-xl font-mono font-black text-yellow-300 mt-0.5">{adminRewardsStats.pendingClaims}</div>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-700/60 p-3 rounded-xl">
                  <div className="text-[11px] text-emerald-300 font-bold">स्वीकृत क्लेम</div>
                  <div className="text-xl font-mono font-black text-emerald-300 mt-0.5">{adminRewardsStats.approvedClaims}</div>
                </div>
                <div className="bg-red-950/40 border border-red-700/60 p-3 rounded-xl">
                  <div className="text-[11px] text-red-300 font-bold">अस्वीकृत क्लेम</div>
                  <div className="text-xl font-mono font-black text-red-300 mt-0.5">{adminRewardsStats.rejectedClaims}</div>
                </div>
                <div className="bg-amber-950/40 border border-amber-600/60 p-3 rounded-xl">
                  <div className="text-[11px] text-amber-300 font-bold">कुल क्रेडिट कॉइन्स</div>
                  <div className="text-xl font-mono font-black text-amber-300 mt-0.5 flex items-center gap-1">
                    <span>🪙</span>
                    <span>{adminRewardsStats.totalCoinsCredited}</span>
                  </div>
                </div>
              </div>

              {/* Alert Feedback */}
              {rewardActionMsg && (
                <div className={`p-3 rounded-xl text-xs font-bold border flex items-center justify-between gap-2 ${
                  rewardActionMsg.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                    : 'bg-red-950/90 border-red-500 text-red-200'
                }`}>
                  <span>{rewardActionMsg.text}</span>
                  <button type="button" onClick={() => setRewardActionMsg(null)} className="text-xs hover:opacity-75">✕</button>
                </div>
              )}

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rewardsSearch}
                    onChange={(e) => setRewardsSearch(e.target.value)}
                    placeholder="यूज़र का नाम, ईमेल, फ़ोन या न्यूज़ शीर्षक खोजें..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['all', 'pending', 'approved', 'rejected'] as const).map((filterKey) => (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setRewardsFilter(filterKey)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        rewardsFilter === filterKey
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {filterKey === 'all' && `सभी (${adminRewardsClaims.length})`}
                      {filterKey === 'pending' && `समीक्षाधीन (${adminRewardsStats.pendingClaims})`}
                      {filterKey === 'approved' && `स्वीकृत (${adminRewardsStats.approvedClaims})`}
                      {filterKey === 'rejected' && `अस्वीकृत (${adminRewardsStats.rejectedClaims})`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={fetchAdminRewards}
                    disabled={isLoadingRewards}
                    className="p-2 bg-slate-950 hover:bg-slate-850 text-slate-300 border border-slate-800 rounded-lg cursor-pointer transition ml-1"
                    title="ताज़ा करें"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRewards ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Claims List Table / Cards */}
              {isLoadingRewards && adminRewardsClaims.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <span>क्लेम्स लोड हो रहे हैं...</span>
                </div>
              ) : adminRewardsClaims.length === 0 ? (
                <div className="p-8 bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
                  अभी तक किसी भी यूज़र ने बोनस रिवॉर्ड क्लेम सबमिट नहीं किया है।
                </div>
              ) : (
                <div className="space-y-3">
                  {adminRewardsClaims
                    .filter((c) => {
                      const matchFilter = rewardsFilter === 'all' || c.status === rewardsFilter;
                      const q = rewardsSearch.toLowerCase().trim();
                      const matchSearch =
                        !q ||
                        (c.userEmail && c.userEmail.toLowerCase().includes(q)) ||
                        (c.userName && c.userName.toLowerCase().includes(q)) ||
                        (c.postTitle && c.postTitle.toLowerCase().includes(q)) ||
                        (c.userMobile && c.userMobile.includes(q));
                      return matchFilter && matchSearch;
                    })
                    .map((claim) => (
                      <div
                        key={claim.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 ${
                          claim.status === 'pending'
                            ? 'bg-slate-900/95 border-yellow-700/60 shadow-lg'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        {/* Left: Proof Screenshot Thumbnail */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {claim.screenshotUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewScreenshotUrl(claim.screenshotUrl)}
                              className="relative group shrink-0 rounded-xl overflow-hidden border-2 border-slate-700 hover:border-amber-400 transition cursor-pointer shadow-md"
                              title="बड़ा देखने के लिए क्लिक करें"
                            >
                              <img
                                src={claim.screenshotUrl}
                                alt="Claim proof"
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <ExternalLink className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ) : (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                              <span>कोई फ़ोटो नहीं</span>
                            </div>
                          )}

                          {/* Center: Claim Information */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-black text-white">{claim.userName || 'यूज़र'}</span>
                              <span className="text-xs font-mono text-slate-400">({claim.userEmail})</span>
                              {claim.userMobile && (
                                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                                  📞 +91 {claim.userMobile}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-200 flex items-center gap-2 flex-wrap">
                              <span className="text-slate-400">समाचार:</span>
                              <strong className="text-white truncate max-w-md">{claim.postTitle || claim.postId}</strong>
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-black text-xs rounded border border-amber-500/40">
                                🪙 +{claim.rewardCoins} कॉइन्स
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                              <span>सबमिट तिथि: {new Date(claim.createdAt).toLocaleString('hi-IN')}</span>
                              {claim.reviewedAt && (
                                <span>• समीक्षा: {new Date(claim.reviewedAt).toLocaleString('hi-IN')} ({claim.reviewedBy || 'Admin'})</span>
                              )}
                            </div>

                            {claim.status === 'rejected' && claim.rejectionReason && (
                              <div className="text-xs text-red-300 bg-red-950/60 border border-red-900 rounded-lg p-1.5 mt-1">
                                ❌ <strong>अस्वीकृति कारण:</strong> {claim.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions / Status */}
                        <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-2.5 shrink-0 border-t lg:border-t-0 border-slate-800 pt-2 lg:pt-0">
                          {claim.status === 'pending' ? (
                            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                              <button
                                type="button"
                                disabled={isProcessingRewardAction}
                                onClick={() => handleApproveRewardClaim(claim.id)}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>स्वीकृत करें (+{claim.rewardCoins} Coins)</span>
                              </button>
                              <button
                                type="button"
                                disabled={isProcessingRewardAction}
                                onClick={() => {
                                  setRejectingClaimId(claim.id);
                                  setRejectReasonInput('सोशल मीडिया पोस्ट सत्यापन विफल');
                                }}
                                className="px-3 py-2 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-bold rounded-xl shadow cursor-pointer transition active:scale-95 disabled:opacity-50"
                              >
                                <span>अस्वीकृत</span>
                              </button>
                            </div>
                          ) : claim.status === 'approved' ? (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold rounded-lg shadow-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>स्वीकृत (कॉइन्स क्रेडिटेड)</span>
                              </div>
                              <button
                                type="button"
                                disabled={isProcessingRewardAction}
                                onClick={async () => {
                                  if (confirm(`क्या आप "${claim.userName || claim.userEmail}" का यह क्लेम रिकॉर्ड हटाना चाहते हैं?`)) {
                                    setIsProcessingRewardAction(true);
                                    try {
                                      const res = await fetch(`/api/admin/rewards/claims/${claim.id || claim.claimId}`, {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json', 'x-user-email': currentUser?.email || '' },
                                      });
                                      if (res.ok) {
                                        fetchAdminRewardClaims();
                                        showToast('✓ बोनस क्लेम रिकॉर्ड हटा दिया गया।');
                                      } else {
                                        showToast('❌ क्लेम हटाने में समस्या आई।');
                                      }
                                    } catch (e: any) {
                                      showToast('❌ त्रुटि: ' + e.message);
                                    } finally {
                                      setIsProcessingRewardAction(false);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600 rounded-lg transition cursor-pointer shrink-0"
                                title="क्लेम डिलीट करें"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/80 border border-red-700 text-red-300 text-xs font-bold rounded-lg shadow-xs">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span>अस्वीकृत</span>
                              </div>
                              <button
                                type="button"
                                disabled={isProcessingRewardAction}
                                onClick={async () => {
                                  if (confirm(`क्या आप "${claim.userName || claim.userEmail}" का यह क्लेम रिकॉर्ड हटाना चाहते हैं?`)) {
                                    setIsProcessingRewardAction(true);
                                    try {
                                      const res = await fetch(`/api/admin/rewards/claims/${claim.id || claim.claimId}`, {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json', 'x-user-email': currentUser?.email || '' },
                                      });
                                      if (res.ok) {
                                        fetchAdminRewardClaims();
                                        showToast('✓ बोनस क्लेम रिकॉर्ड हटा दिया गया।');
                                      } else {
                                        showToast('❌ क्लेम हटाने में समस्या आई।');
                                      }
                                    } catch (e: any) {
                                      showToast('❌ त्रुटि: ' + e.message);
                                    } finally {
                                      setIsProcessingRewardAction(false);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600 rounded-lg transition cursor-pointer shrink-0"
                                title="क्लेम डिलीट करें"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* MODAL 1: Screenshot Full Preview */}
              {previewScreenshotUrl && (
                <div
                  className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
                  onClick={() => setPreviewScreenshotUrl(null)}
                >
                  <div
                    className="relative max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>सोशल मीडिया पोस्ट सत्यापन स्क्रीनशॉट</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewScreenshotUrl(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 overflow-auto flex items-center justify-center max-h-[80vh]">
                      <img
                        src={previewScreenshotUrl}
                        alt="Full proof"
                        className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL 2: Reject Claim with Reason Prompt */}
              {rejectingClaimId && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                  <div className="w-full max-w-md bg-slate-900 border-2 border-red-700/80 rounded-2xl p-5 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>रिवॉर्ड क्लेम अस्वीकृत करें</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setRejectingClaimId(null)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300">
                      कृपया अस्वीकृति का कारण लिखें। यह कारण यूज़र को उनके रिवॉर्ड्स वॉलेट हिस्ट्री में दिखाई देगा:
                    </p>

                    <input
                      type="text"
                      value={rejectReasonInput}
                      onChange={(e) => setRejectReasonInput(e.target.value)}
                      placeholder="उदा. सोशल मीडिया पोस्ट का स्क्रीनशॉट स्पष्ट नहीं है"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl p-3 text-xs text-white focus:outline-none"
                    />

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRejectingClaimId(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                      >
                        रद्द करें
                      </button>
                      <button
                        type="button"
                        disabled={isProcessingRewardAction}
                        onClick={() => handleRejectRewardClaim(rejectingClaimId)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg cursor-pointer transition active:scale-95 disabled:opacity-50"
                      >
                        {isProcessingRewardAction ? 'अस्वीकृत किया जा रहा है...' : 'अस्वीकृत करें'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* STEP 9: RSS लिंक्स डैशबोर्ड (RSS LINKS DASHBOARD)                         */}
        {/* ========================================================================= */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'rss' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'rss' ? '' : 'rss')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'rss' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <Rss className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  RSS लिंक्स डैशबोर्ड
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  लाइव प्रोडक्शन RSS XML फ़ीड लिंक्स प्रबंधन व लाइव स्टेटस
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${rssSources.filter(s => s.type === "rss").length} RSS लिंक्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'rss' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'rss' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {/* Within RSS Links Area: 2 Clearly Named Sections */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            <button
              type="button"
              onClick={() => setRssActiveSection('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                rssActiveSection === 'dashboard'
                  ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Rss className="w-4 h-4" />
              <span>RSS लिंक्स डैशबोर्ड</span>
            </button>
            <button
              type="button"
              onClick={() => setRssActiveSection('converter')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                rssActiveSection === 'converter'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Web to RSS Link Converter</span>
            </button>
          </div>

          {rssActiveSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Header Info Banner */}
              <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/40 border-2 border-red-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-red-500/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30">
                      <Rss className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white tracking-wide">
                        RSS Links Dashboard
                      </h3>
                      <p className="text-xs text-slate-300">
                        विभिन्न न्यूज़ चैनलों की लाइव RSS 2.0 XML Feeds जोड़ें। लाइव फेच सीधे प्रोडक्शन सर्वर से वास्तविक समाचार लाएगा।
                      </p>
                    </div>
                  </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSyncingRss}
                  onClick={async () => {
                    setIsSyncingRss(true);
                    try {
                      const res = await syncAllSourcesLive();
                      setRssSources(getAdminRssSources());
                      setRssMsg({
                        type: res.success ? 'success' : 'error',
                        text: res.success ? `लाइव RSS स्रोतों से ${res.totalNewItems || 0} नए समाचार अपडेट हुए।` : (res.error || 'सिंक त्रुटि'),
                      });
                    } catch (e: any) {
                      setRssMsg({ type: 'error', text: 'RSS सिंक में त्रुटि: ' + e.message });
                    } finally {
                      setIsSyncingRss(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRss ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRss ? 'लाइव सिंक जारी...' : 'लाइव RSS सिंक करें'}</span>
                </button>
              </div>
            </div>

            {/* Notification message */}
            {rssMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                  rssMsg.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                    : 'bg-rose-950/80 border-rose-500 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {rssMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{rssMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRssMsg(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Flow Banner */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="font-bold text-amber-400">लाइव RSS डेटा प्रवाह (Live RSS Flow):</span>
              <div className="flex items-center gap-1.5 font-mono text-slate-200">
                <span className="px-2 py-0.5 bg-red-950/80 border border-red-600/60 rounded text-red-300 font-bold">1. LIVE RSS SOURCE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-600/60 rounded text-amber-300 font-bold">2. PRODUCTION FETCH</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-blue-950/80 border border-blue-600/60 rounded text-blue-300 font-bold">3. XML PARSING</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-600/60 rounded text-emerald-300 font-bold">4. DATABASE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-600/60 rounded text-purple-300 font-bold">5. HOME FEED</span>
              </div>
            </div>

            {/* Single Category Manager for RSS & Web Links (Synchronized with Home Feed) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white">एकल श्रेणी प्रबंधक (Single Category Manager - RSS, Web & Home Feed)</span>
                </div>
                <span className="text-[10px] text-amber-300 font-bold">{feedCategories.filter((c) => c.isActive).length} श्रेणियां सक्रिय</span>
              </div>

              <form onSubmit={handleAddCategoryUnified} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="नई श्रेणी का नाम जोड़ें (उदा. खेती-किसानी, स्वास्थ्य, क्राइम, टेक...)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ श्रेणी जोड़ें</span>
                </button>
              </form>

              <div className="flex flex-wrap gap-2 pt-1">
                {feedCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                      cat.isActive
                        ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-500 opacity-70'
                    }`}
                  >
                    {/* Active/Inactive Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleCatStatus(cat.id)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-black cursor-pointer transition ${
                        cat.isActive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                      title={cat.isActive ? 'क्लिक करके निष्क्रिय करें' : 'क्लिक करके सक्रिय करें'}
                    >
                      {cat.isActive ? 'सक्रिय' : 'निष्क्रिय'}
                    </button>

                    {/* Category Name or Inline Edit Input */}
                    {editingCatId === cat.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="px-2 py-0.5 bg-slate-950 border border-amber-400 rounded text-xs text-white focus:outline-hidden w-28 sm:w-36"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditCat(cat.id);
                            if (e.key === 'Escape') setEditingCatId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCat(cat.id)}
                          className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded cursor-pointer"
                        >
                          सेव
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="p-0.5 text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="font-semibold">{cat.name}</span>
                    )}

                    {/* Edit Button */}
                    {editingCatId !== cat.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEditCat(cat)}
                        className="text-slate-400 hover:text-amber-400 transition cursor-pointer p-0.5"
                        title="श्रेणी का नाम संपादित करें (Edit)"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}

                    {/* Delete Button */}
                    {feedCategories.length > 1 && editingCatId !== cat.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategoryUnified(cat.id)}
                        className="text-slate-500 hover:text-red-400 transition cursor-pointer p-0.5"
                        title="श्रेणी हटाएं"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add New RSS Source Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSourceUrl.trim()) {
                  setRssMsg({ type: 'error', text: 'कृपया वैध RSS Feed XML URL दर्ज करें।' });
                  return;
                }
                const name = newSourceName.trim() || (savedChannels[0] || 'RSS Source');
                saveNewsChannel(name);
                setSavedChannels(getSavedNewsChannels());
                addAdminRssSource(name, newSourceUrl, 'rss', newSourceCategory);
                setRssSources(getAdminRssSources());
                setNewSourceUrl('');
                setRssMsg({ type: 'success', text: `नया RSS स्रोत "${name}" जोड़ा गया! वास्तविक RSS से समाचार प्राप्त किए जा रहे हैं...` });
                syncAllSourcesLive().then((res) => {
                  setRssSources(getAdminRssSources());
                  if (res.success) {
                    setRssMsg({ type: 'success', text: `🎉 RSS स्रोत "${name}" सक्रिय! ${res.totalNewItems || 0} नए समाचार होम फ़ीड में जुड़ गए।` });
                  }
                });
              }}
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4"
            >
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>नया लाइव RSS Feed स्रोत जोड़ें</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">चैनल चुनें *</label>
                  <select
                    value={newSourceName || (savedChannels[0] || '')}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {savedChannels.map((ch, idx) => (
                      <option key={`${ch}-${idx}`} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">RSS Feed XML URL *</label>
                  <input
                    type="url"
                    required
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://feed.aajtak.in/rss/topstories.xml"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">डिफ़ॉल्ट श्रेणी</label>
                  <select
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {feedCategories.filter((c) => c.isActive).map((c, idx) => (
                      <option key={`${c.id}-${idx}`} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>RSS स्रोत जोड़ें</span>
              </button>
            </form>
          </div>

          {/* RSS Sources List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Rss className="w-4 h-4 text-orange-400" />
              <span>सक्रिय RSS 2.0 फ़ीड्स सूची ({rssSources.filter(s => s.type === 'rss').length})</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">चैनल नाम</th>
                    <th className="p-3">श्रेणी</th>
                    <th className="p-3">RSS XML URL</th>
                    <th className="p-3 text-center">स्थिति</th>
                    <th className="p-3 text-right">एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {rssSources.filter(s => s.type === 'rss').map((s) => (
                    <tr key={s.id} className="hover:bg-slate-850/50">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Rss className="w-3.5 h-3.5 text-orange-400" />
                        <span>{s.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-800 text-amber-300 rounded font-bold text-[10px]">
                          {s.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {s.url}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            toggleAdminRssSource(s.id);
                            setRssSources(getAdminRssSources());
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-black cursor-pointer ${
                            s.isActive !== false ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.isActive !== false ? 'सक्रिय (Active)' : 'निष्क्रिय (Off)'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`क्या आप RSS स्रोत "${s.name}" हटाना चाहते हैं?`)) {
                              deleteAdminRssSource(s.id);
                              setRssSources(getAdminRssSources());
                            }
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          title="हटाएं"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Web to RSS Link Converter */}
      {rssActiveSection === 'converter' && (
        <div className="space-y-6">
          {/* Web to RSS Converter Header */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border-2 border-cyan-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-cyan-500/30 pb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-wide">
                  Web to RSS Link Converter
                </h3>
                <p className="text-xs text-slate-300">
                  वेबसाइट होमपेज, श्रेणी या लिस्टिंग URL को सर्वर-साइड RSS 2.0 XML फ़ीड में बदलें।
                </p>
              </div>
            </div>

            {/* Info / Restriction Warning */}
            <div className="p-3 bg-slate-950/80 border border-cyan-500/30 rounded-xl text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>महत्वपूर्ण इनपुट नियम (Input Rules):</span>
              </div>
              <p className="text-[11px] text-slate-400">
                ✅ <strong>स्वीकृत इनपुट्स:</strong> न्यूज़ चैनल का होमपेज (उदा. <code className="text-cyan-300">https://ndtv.in</code>), केटेगरी पेज (उदा. <code className="text-cyan-300">https://aajtak.in/national</code>), या आर्काइव/लिस्टिंग पेज।
              </p>
              <p className="text-[11px] text-rose-400">
                ❌ <strong>अस्वीकृत इनपुट्स:</strong> किसी व्यक्तिगत एकल आर्टिकल या स्टोरी का सीधा लिंक मान्य नहीं है और अस्वीकार कर दिया जाएगा।
              </p>
            </div>

            {/* Error Banner */}
            {converterError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500 rounded-xl text-xs font-bold text-rose-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{converterError}</span>
                </div>
                <button type="button" onClick={() => setConverterError(null)} className="text-rose-400 hover:text-white cursor-pointer">✕</button>
              </div>
            )}

            {/* Conversion Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setConverterError(null);
                setConverterResult(null);
                setConverterCopied(false);
                const rawUrl = converterUrl.trim();
                if (!rawUrl) {
                  setConverterError('कृपया वैध वेबसाइट URL दर्ज करें।');
                  return;
                }
                setIsConverting(true);
                try {
                  const res = await fetch('/api/convert-web-to-rss', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      url: rawUrl,
                      channelName: converterChannel.trim() || (savedChannels[0] || 'Web Feed'),
                      category: converterCategory || 'देश',
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.success) {
                    setConverterError(data.error || 'वेबसाइट को RSS में बदलने में त्रुटि हुई।');
                  } else {
                    setConverterResult(data);
                  }
                } catch (err: any) {
                  setConverterError(err.message || 'नेटवर्क त्रुटि हुई।');
                } finally {
                  setIsConverting(false);
                }
              }}
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">चैनल / स्रोत नाम *</label>
                  <div className="space-y-1.5">
                    <select
                      value={converterChannel}
                      onChange={(e) => setConverterChannel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">-- पंजीकृत चैनल चुनें --</option>
                      {savedChannels.map((ch, idx) => (
                        <option key={`${ch}-${idx}`} value={ch}>{ch}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      value={converterChannel}
                      onChange={(e) => setConverterChannel(e.target.value)}
                      placeholder="या नया चैनल नाम लिखें (उदा. NDTV India)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs focus:border-cyan-400 focus:outline-hidden placeholder-slate-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">होमपेज / केटेगरी URL *</label>
                  <input
                    type="url"
                    required
                    value={converterUrl}
                    onChange={(e) => setConverterUrl(e.target.value)}
                    placeholder="https://ndtv.in या https://aajtak.in/national"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">डिफ़ॉल्ट श्रेणी</label>
                  <select
                    value={converterCategory}
                    onChange={(e) => setConverterCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-hidden cursor-pointer"
                  >
                    {feedCategories.filter((c) => c.isActive).map((c, idx) => (
                      <option key={`conv-${c.id}-${idx}`} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isConverting}
                className="py-2.5 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>वेबसाइट पार्स व RSS 2.0 जनरेट हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>RSS 2.0 Feed में कन्वर्ट करें</span>
                  </>
                )}
              </button>
            </form>

            {/* Generated Feed Result Card */}
            {converterResult && (
              <div className="bg-emerald-950/40 border-2 border-emerald-500/60 rounded-xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>🎉 वैध RSS 2.0 XML फ़ीड सफलतापूर्वक तैयार! ({converterResult.totalArticles} लेख प्राप्त)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-mono">
                    RSS 2.0 XML
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-300 font-bold block">
                    जनरेटेड RSS XML फ़ीड URL:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={converterResult.feedUrl}
                      className="flex-1 bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono select-all focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(converterResult.feedUrl);
                        setConverterCopied(true);
                        setTimeout(() => setConverterCopied(false), 2500);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition"
                    >
                      {converterCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{converterCopied ? 'कॉपी हुआ!' : 'URL कॉपी करें'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Add to RSS Links Dashboard */}
                <div className="pt-2 border-t border-emerald-500/30 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] text-slate-300">
                    इस फ़ीड को तुरंत अपने RSS Links Dashboard में पंजीकृत करें:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const name = converterChannel.trim() || (savedChannels[0] || 'Web Feed');
                      setNewSourceName(name);
                      setNewSourceUrl(converterResult.feedUrl);
                      setNewSourceCategory(converterCategory);
                      setRssActiveSection('dashboard');
                      setRssMsg({
                        type: 'success',
                        text: `फ़ीड लोड हो गई है! नीचे "RSS स्रोत जोड़ें" बटन दबाकर इसे तुरंत सक्रिय करें।`,
                      });
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>RSS Links Dashboard में जोड़ें</span>
                  </button>
                </div>

                {/* Sample Articles Preview */}
                {converterResult.sampleArticles && converterResult.sampleArticles.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      फ़ीड में खोजे गए नमूना समाचार (Sample Headlines):
                    </span>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {converterResult.sampleArticles.map((art, idx) => (
                        <div key={idx} className="p-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs flex items-center justify-between gap-2">
                          <span className="truncate text-slate-200">{art.title}</span>
                          <a href={art.link} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline shrink-0 text-[10px] flex items-center gap-1">
                            <span>स्रोत</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)}
  </div>


        {/* ========================================================================= */}
        {/* STEP 10: वेब लिंक्स मैनेजर (WEB LINKS DASHBOARD)                           */}
        {/* ========================================================================= */}
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'web' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'web' ? '' : 'web')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'web' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  वेब लिंक्स मैनेजर
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  वेबसाइट एवं आर्टिकल वेब लिंक्स प्रबंधन व लाइव वेब स्क्रैपिंग
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-cyan-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${rssSources.filter(s => s.type === "web").length} वेब लिंक्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'web' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'web' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-blue-950/40 border-2 border-cyan-500/50 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-wide">
                    Web Links Dashboard
                  </h3>
                  <p className="text-xs text-slate-300">
                    वेबसाइट एवं आर्टिकल वेब लिंक्स जोड़ें। बैकएंड प्रोडक्शन स्क्रैपर लाइव आर्टिकल टेक्स्ट व फोटो एक्सट्रैक्ट करके डेटाबेस में सुरक्षित करता है।
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isSyncingRss}
                  onClick={async () => {
                    setIsSyncingRss(true);
                    try {
                      const res = await syncAllSourcesLive();
                      setRssSources(getAdminRssSources());
                      setRssMsg({
                        type: res.success ? 'success' : 'error',
                        text: res.success ? `लाइव वेब स्रोतों से ${res.totalNewItems || 0} नए समाचार स्क्रैप हुए।` : (res.error || 'स्क्रैप त्रुटि'),
                      });
                    } catch (e: any) {
                      setRssMsg({ type: 'error', text: 'वेब स्क्रैप में त्रुटि: ' + e.message });
                    } finally {
                      setIsSyncingRss(false);
                    }
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 border border-cyan-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRss ? 'animate-spin' : ''}`} />
                  <span>{isSyncingRss ? 'लाइव स्क्रैप जारी...' : 'लाइव वेब स्क्रैप करें'}</span>
                </button>
              </div>
            </div>

            {/* Flow Banner */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span className="font-bold text-cyan-400">लाइव वेब स्क्रैपिंग डेटा प्रवाह (Live Web Scraping Flow):</span>
              <div className="flex items-center gap-1.5 font-mono text-slate-200">
                <span className="px-2 py-0.5 bg-cyan-950/80 border border-cyan-600/60 rounded text-cyan-300 font-bold">1. LIVE WEB SOURCE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-blue-950/80 border border-blue-600/60 rounded text-blue-300 font-bold">2. SCRAPE & PARSE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-600/60 rounded text-emerald-300 font-bold">3. DATABASE</span>
                <span>→</span>
                <span className="px-2 py-0.5 bg-purple-950/80 border border-purple-600/60 rounded text-purple-300 font-bold">4. HOME FEED</span>
              </div>
            </div>

            {/* Unified Website News Portal Manager */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">🌐 वेबसाइट न्यूज़ पोर्टल प्रबंधक (Website News Portal Manager - RSS & Web Links)</span>
                </div>
                <span className="text-[10px] text-cyan-300 font-bold">{newsPortals.length} न्यूज़ पोर्टल्स सक्रिय</span>
              </div>

              <form onSubmit={handleAddNewsPortal} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={newPortalName}
                  onChange={(e) => setNewPortalName(e.target.value)}
                  placeholder="न्यूज़ चैनल / पोर्टल का नाम (उदा. नवभारत टाइम्स)"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-hidden"
                />
                <input
                  type="url"
                  value={newPortalUrl}
                  onChange={(e) => setNewPortalUrl(e.target.value)}
                  placeholder="वेबसाइट URL (उदा. https://navbharattimes.indiatimes.com)"
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-hidden font-mono"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ न्यूज़ पोर्टल जोड़ें</span>
                </button>
              </form>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {newsPortals.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-1.5"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-200 truncate">{p.name}</div>
                      <div className="text-[9px] font-mono text-cyan-400/80 truncate">{p.url}</div>
                    </div>
                    {newsPortals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNewsPortal(p.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="पोर्टल हटाएं"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Web Source Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSourceUrl.trim()) {
                  setRssMsg({ type: 'error', text: 'कृपया वैध वेब आर्टिकल लिंक दर्ज करें।' });
                  return;
                }
                const name = newSourceName.trim() || 'Web Source';
                saveNewsChannel(name);
                  setSavedChannels(getSavedNewsChannels());
                  addAdminRssSource(name, newSourceUrl, 'web', newSourceCategory);
                setRssSources(getAdminRssSources());
                setNewSourceName('');
                setNewSourceUrl('');
                setRssMsg({ type: 'success', text: `नया वेब लिंक "${name}" जोड़ा गया! वास्तविक वेब पेज से आर्टिकल व इमेज निष्कर्षण किया जा रहा है...` });
                syncAllSourcesLive().then((res) => {
                  setRssSources(getAdminRssSources());
                  if (res.success) {
                    setRssMsg({ type: 'success', text: `🎉 वेब आर्टिकल "${name}" प्रोसेस होकर होम फ़ीड में जुड़ गया!` });
                  }
                });
              }}
              className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-4"
            >
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>नया लाइव वेब लिंक स्रोत जोड़ें</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">चैनल / न्यूज़ पोर्टल चुनें *</label>
                  <select
                    value={newSourceName || (savedChannels[0] || '')}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-hidden cursor-pointer"
                  >
                    {savedChannels.map((ch, idx) => (
                      <option key={`${ch}-${idx}`} value={ch}>{ch}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">वेबसाइट / आर्टिकल URL *</label>
                  <input
                    type="url"
                    required
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    placeholder="https://pib.gov.in/PressReleasePage.aspx?PRID=..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-cyan-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">श्रेणी</label>
                  <select
                    value={newSourceCategory}
                    onChange={(e) => setNewSourceCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:border-cyan-400 focus:outline-hidden cursor-pointer"
                  >
                    {feedCategories.filter((c) => c.isActive).map((c, idx) => (
                      <option key={`${c.id}-${idx}`} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="py-2.5 px-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>वेब लिंक जोड़ें</span>
              </button>
            </form>
          </div>

          {/* Web Sources List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>सक्रिय वेब स्क्रैपिंग लिंक्स सूची ({rssSources.filter(s => s.type === 'web').length})</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3">पोर्टल / आर्टिकल नाम</th>
                    <th className="p-3">श्रेणी</th>
                    <th className="p-3">वेब URL</th>
                    <th className="p-3 text-center">स्थिति</th>
                    <th className="p-3 text-right">एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {rssSources.filter(s => s.type === 'web').map((s) => (
                    <tr key={s.id} className="hover:bg-slate-850/50">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{s.name}</span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-slate-800 text-cyan-300 rounded font-bold text-[10px]">
                          {s.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {s.url}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            toggleAdminRssSource(s.id);
                            setRssSources(getAdminRssSources());
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-black cursor-pointer ${
                            s.isActive !== false ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.isActive !== false ? 'सक्रिय (Active)' : 'निष्क्रिय (Off)'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`क्या आप वेब लिंक "${s.name}" हटाना चाहते हैं?`)) {
                              deleteAdminRssSource(s.id);
                              setRssSources(getAdminRssSources());
                            }
                          }}
                          className="px-2 py-1 text-red-400 hover:bg-red-950/50 rounded cursor-pointer"
                        >
                          हटाएँ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
            </div>
          )}
        </div>


        {/* ========================================================================= */}
        {/* STEP 11: प्रतिबंधित चैनल सुरक्षा सूची (RESTRICTED CHANNELS) - Master Admin Only */}
        {/* ========================================================================= */}
        {isSuperAdminUser && (
        <div className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'restricted' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'restricted' ? '' : 'restricted')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'restricted' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-black text-white block truncate">
                  प्रतिबंधित चैनल सुरक्षा सूची
                </span>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  राष्ट्रीय न्यूज़ ब्रांड्स सुरक्षा सूची व लोगो अनुमति
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800">
                {`${restrictedList.length} चैनल्स`}
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'restricted' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'restricted' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              
            {!isSuperAdminUser ? (
              <div className="p-8 bg-slate-900/90 border border-rose-500/40 rounded-2xl text-center space-y-4 shadow-2xl my-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base sm:text-lg font-black text-white">सुपर एडमिन सुरक्षा नियंत्रण</h4>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    यह सेक्शन (<strong>9. प्रतिबंधित चैनल सुरक्षा सूची</strong>) केवल प्राथमिक <strong>सुपर एडमिन (admin.ainewsmaker@gmail.com)</strong> के लिए आरक्षित है। सामान्य एडमिन इसे देख या संपादित नहीं कर सकते।
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold">
                  <Crown className="w-4 h-4 text-amber-400" /> केवल सुपर एडमिन ही यूज़र्स, प्रोमो कोड, प्लान्स व सुरक्षा सूची नियंत्रित कर सकते हैं
                </div>
              </div>
            ) : (
        <div className="space-y-6">
          {/* Top Explanation Banner */}
          <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/80 border-2 border-red-500/60 rounded-2xl p-4 sm:p-5 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center text-white font-black shadow-lg shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      प्रतिबंधित चैनल सुरक्षा सूची
                    </h3>
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase">
                      ब्रांड सुरक्षा
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    बड़े राष्ट्रीय मीडिया नेटवर्क्स (आज तक, एबीपी न्यूज़, एनडीटीवी, ज़ी न्यूज़ आदि) के नाम, वेबसाइट व लोगो अनधिकृत उपयोग से सुरक्षित हैं। कोई भी यूज़र इन चैनलों के नाम, वेबसाइट या यूज़रनेम से खाता नहीं बना सकता।
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-red-300 bg-red-950/60 px-3 py-1.5 rounded-xl border border-red-500/40">
                <span>सुरक्षित चैनल्स: {restrictedList.length}</span>
              </div>
            </div>
          </div>

          {/* Feedback Message */}
          {restrictedMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in ${
                restrictedMsg.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-500/80 text-emerald-300'
                  : 'bg-red-950/80 border border-red-500/80 text-red-300'
              }`}
            >
              {restrictedMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{restrictedMsg.text}</span>
            </div>
          )}

          {/* Add New Restricted Channel Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-amber-300 border-b border-slate-800 pb-2.5">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>नया चैनल प्रतिबंधित सूची में जोड़ें</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newRestrictedName.trim()) {
                  setRestrictedMsg({ type: 'error', text: 'कृपया चैनल का नाम दर्ज करें' });
                  return;
                }
                if (!newRestrictedWebsite.trim() && !newRestrictedUsername.trim()) {
                  setRestrictedMsg({ type: 'error', text: 'कृपया वेबसाइट या यूज़रनेम दर्ज करें' });
                  return;
                }
                const added = addRestrictedChannel({
                  channelName: newRestrictedName.trim(),
                  websiteUrl: newRestrictedWebsite.trim(),
                  username: newRestrictedUsername.trim() || newRestrictedName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16),
                  logoUrl: newRestrictedLogo.trim() || undefined,
                  reason: newRestrictedReason.trim() || 'राष्ट्रीय/आधिकारिक समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित',
                });
                setRestrictedList(getRestrictedChannels());
                setNewRestrictedName('');
                setNewRestrictedWebsite('');
                setNewRestrictedUsername('');
                setNewRestrictedLogo('');
                setNewRestrictedReason('');
                setRestrictedMsg({
                  type: 'success',
                  text: `✅ चैनल "${added.channelName}" सफलतापूर्वक प्रतिबंधित सूची में जोड़ दिया गया।`,
                });
                setTimeout(() => setRestrictedMsg(null), 5000);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  1. चैनल का नाम *
                </label>
                <input
                  type="text"
                  required
                  value={newRestrictedName}
                  onChange={(e) => setNewRestrictedName(e.target.value)}
                  placeholder="उदा. आज तक (Aaj Tak)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  2. वेबसाइट का पता (डोमेन) *
                </label>
                <input
                  type="text"
                  value={newRestrictedWebsite}
                  onChange={(e) => setNewRestrictedWebsite(e.target.value)}
                  placeholder="उदा. aajtak.in (बिना https:// के)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  3. यूज़रनेम
                </label>
                <input
                  type="text"
                  value={newRestrictedUsername}
                  onChange={(e) => setNewRestrictedUsername(e.target.value)}
                  placeholder="उदा. aajtak"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  4. चैनल लोगो (फोटो चुनें या URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="restricted-logo-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === 'string') {
                            setNewRestrictedLogo(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="restricted-logo-file"
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition active:scale-95 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>📁 फोटो चुनें</span>
                  </label>
                  <input
                    type="text"
                    value={newRestrictedLogo}
                    onChange={(e) => setNewRestrictedLogo(e.target.value)}
                    placeholder="या लोगो इमेज लिंक पेस्ट करें..."
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-amber-400 focus:outline-hidden"
                  />
                  {newRestrictedLogo && (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-400/50 bg-black shrink-0 flex items-center justify-center">
                      <img src={newRestrictedLogo} alt="Logo" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  5. प्रतिबंध का कारण
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRestrictedReason}
                    onChange={(e) => setNewRestrictedReason(e.target.value)}
                    placeholder="उदा. राष्ट्रीय समाचार चैनल - अनधिकृत उपयोग प्रतिबंधित"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>सूची में जोड़ें</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Search & Channels Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-3 p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={restrictedSearch}
                  onChange={(e) => setRestrictedSearch(e.target.value)}
                  placeholder="चैनल नाम, वेबसाइट या यूज़रनेम खोजें..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <span className="text-xs text-slate-400 font-semibold self-center">
                कुल प्रतिबंधित ब्रांड्स: {restrictedList.length}
              </span>
            </div>

            {/* Mobile Restricted Channels Cards (Phase 8) */}
            <div className="sm:hidden space-y-2.5">
              {restrictedList
                .filter((c) => {
                  if (!restrictedSearch) return true;
                  const q = restrictedSearch.toLowerCase();
                  return (
                    c.channelName.toLowerCase().includes(q) ||
                    c.websiteUrl.toLowerCase().includes(q) ||
                    c.username.toLowerCase().includes(q) ||
                    (c.reason && c.reason.toLowerCase().includes(q))
                  );
                })
                .map((item) => (
                  <div key={item.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.logoUrl ? (
                          <img src={item.logoUrl} alt={item.channelName} className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-0.5 border border-slate-800 shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs font-black flex items-center justify-center shrink-0">
                            🛡️
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-white text-xs block truncate">{item.channelName}</span>
                          <span className="font-mono text-[10px] text-amber-300 truncate">@{item.username}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`क्या आप चैनल "${item.channelName}" को प्रतिबंधित सूची से हटाना चाहते हैं?`)) {
                            deleteRestrictedChannel(item.id);
                            setRestrictedList(getRestrictedChannels());
                            setRestrictedMsg({ type: 'success', text: `चैनल "${item.channelName}" को प्रतिबंधित सूची से हटा दिया गया।` });
                          }
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600 rounded-lg transition cursor-pointer shrink-0"
                        title="प्रतिबंध हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] pt-1 border-t border-slate-800/60">
                      <span className="text-blue-300 font-mono truncate">{item.websiteUrl}</span>
                      <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30 font-bold shrink-0">
                        {item.reason || 'प्रतिबंधित'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Desktop Restricted Channels Table */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-black border-b border-slate-800">
                  <tr>
                    <th className="p-3">लोगो</th>
                    <th className="p-3">चैनल का नाम</th>
                    <th className="p-3">वेबसाइट</th>
                    <th className="p-3">यूज़रनेम</th>
                    <th className="p-3">कारण / सुरक्षा</th>
                    <th className="p-3 text-right">कार्रवाई</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-medium">
                  {restrictedList
                    .filter((c) => {
                      if (!restrictedSearch) return true;
                      const q = restrictedSearch.toLowerCase();
                      return (
                        c.channelName.toLowerCase().includes(q) ||
                        c.websiteUrl.toLowerCase().includes(q) ||
                        c.username.toLowerCase().includes(q) ||
                        (c.reason && c.reason.toLowerCase().includes(q))
                      );
                    })
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition">
                        <td className="p-3 whitespace-nowrap">
                          {item.logoUrl ? (
                            <img
                              src={item.logoUrl}
                              alt={item.channelName}
                              className="w-8 h-8 rounded-lg object-contain bg-slate-950 p-0.5 border border-slate-800"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-[10px] font-black flex items-center justify-center">
                              🛡️
                            </div>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-bold text-white text-xs">{item.channelName}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-blue-300">
                          {item.websiteUrl}
                        </td>
                        <td className="p-3 whitespace-nowrap font-mono text-[11px] text-amber-300">
                          @{item.username}
                        </td>
                        <td className="p-3 text-[11px] text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-500/30 text-[10px] font-bold">
                            {item.reason || 'प्रतिबंधित चैनल'}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`क्या आप चैनल "${item.channelName}" को प्रतिबंधित सूची से हटाना चाहते हैं?`)) {
                                deleteRestrictedChannel(item.id);
                                setRestrictedList(getRestrictedChannels());
                                setRestrictedMsg({
                                  type: 'success',
                                  text: `चैनल "${item.channelName}" को प्रतिबंधित सूची से हटा दिया गया।`,
                                });
                              }
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-600 rounded-lg transition cursor-pointer"
                            title="प्रतिबंध हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 11B: एपीआई की मैनेजर (API KEY MANAGER - MASTER ADMIN ONLY)             */}
        {/* ========================================================================= */}
        {isSuperAdminUser && (
        <div id="section-api-keys" className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'api_keys' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'api_keys' ? '' : 'api_keys')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'api_keys' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <Key className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-white block truncate">
                    एपीआई की मैनेजर (API Key Manager)
                  </span>
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[10px] font-black rounded uppercase">
                    Free & Paid Pools
                  </span>
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  मल्टीपल फ्री जेमिनी कीज़ (ऑटो-रोटेशन व फेलओवर) एवं वीआईपी पेड की प्रबंधन
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-indigo-300 text-xs font-mono font-bold rounded-lg border border-slate-800 hidden sm:inline">
                मास्टर एडमिन
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'api_keys' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'api_keys' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              <AdminApiKeysManager currentUser={currentUser} />
            </div>
          )}
        </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 11C: एडमिन नोटिफिकेशन पैनल (ADMIN NOTIFICATION PANEL - PHASE 5)         */}
        {/* ========================================================================= */}
        {isSuperAdminUser && (
        <div id="section-notifications" className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'notifications' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'notifications' ? '' : 'notifications')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'notifications' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
                <Bell className="w-5 h-5 text-white" />
                {adminNotifCounts.all > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 border-2 border-slate-900 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-pulse">
                    {adminNotifCounts.all > 99 ? '99+' : adminNotifCounts.all}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-white block truncate">
                    एडमिन नोटिफिकेशन पैनल (Admin Notifications)
                  </span>
                  {adminNotifCounts.all > 0 && (
                    <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full uppercase animate-pulse">
                      {adminNotifCounts.all} नए अलर्ट
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  नई RSS खबरें, सपोर्ट इनबॉक्स, लोगो चेंज रिक्वेस्ट व यूज़र अनुरोध अलर्ट्स
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="px-2.5 py-1 bg-slate-950 text-amber-300 text-xs font-mono font-bold rounded-lg border border-slate-800 hidden sm:inline">
                {adminNotifications.length} कुल अलर्ट
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'notifications' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'notifications' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              {/* Status Action Banner */}
              {adminNotifActionMsg && (
                <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{adminNotifActionMsg}</span>
                </div>
              )}

              {/* Controls & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { key: 'all', label: 'सभी', count: adminNotifCounts.all },
                      { key: 'rss', label: 'RSS खबरें', count: adminNotifCounts.rss },
                      { key: 'support', label: 'सपोर्ट इनबॉक्स', count: adminNotifCounts.support },
                      { key: 'logo', label: 'लोगो चेंज', count: adminNotifCounts.logo },
                      { key: 'requests', label: 'अन्य अनुरोध', count: adminNotifCounts.requests },
                    ] as const
                  ).map((tab) => {
                    const isActive = adminNotifFilter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setAdminNotifFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                              isActive ? 'bg-slate-950 text-amber-300' : 'bg-red-500 text-white'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => handleMarkAdminNotifRead(undefined, true, adminNotifFilter)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                    title="सभी को पढ़ा हुआ मार्क करें"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>सभी पढ़े मार्क करें</span>
                  </button>
                  <button
                    type="button"
                    onClick={fetchAdminNotifications}
                    disabled={isLoadingAdminNotifs}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer disabled:opacity-50"
                    title="रिफ्रेश करें"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdminNotifs ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Notification List */}
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {(() => {
                  const filtered = adminNotifications.filter((n) => {
                    if (adminNotifFilter === 'all') return true;
                    return n.category === adminNotifFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
                        <div className="text-3xl">🔔</div>
                        <p className="text-xs font-bold">इस श्रेणी में कोई नोटिफिकेशन नहीं है</p>
                        <p className="text-[11px] text-slate-500">
                          नए RSS समाचार या यूज़र रिक्वेस्ट आने पर वे यहाँ तुरंत दिखाई देंगे।
                        </p>
                      </div>
                    );
                  }

                  return filtered.map((n) => {
                    const badgeStyles: Record<string, string> = {
                      rss: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
                      support: 'bg-blue-950/80 text-blue-300 border-blue-600/50',
                      logo: 'bg-purple-950/80 text-purple-300 border-purple-600/50',
                      requests: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50',
                    };
                    const badgeLabels: Record<string, string> = {
                      rss: '📰 RSS समाचार',
                      support: '🎫 सपोर्ट केस',
                      logo: '🎨 लोगो चेंज',
                      requests: '📝 यूज़र रिक्वेस्ट',
                    };

                    return (
                      <div
                        key={n.id}
                        className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                          n.unread
                            ? 'bg-slate-900/95 border-amber-500/40 shadow-md ring-1 ring-amber-500/20'
                            : 'bg-slate-900/50 border-slate-800/80 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {n.unread ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 shrink-0 animate-pulse ring-2 ring-red-400/30" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                                  badgeStyles[n.category] || badgeStyles.requests
                                }`}
                              >
                                {badgeLabels[n.category] || 'अलर्ट'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {n.timestamp ? new Date(n.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                              {n.title}
                            </h4>
                            {n.message && (
                              <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                                {n.message}
                              </p>
                            )}
                            {n.meta && (
                              <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                                {n.meta.email && <span>ईमेल: {n.meta.email}</span>}
                                {n.meta.source && <span>स्रोत: {n.meta.source}</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {n.unread && (
                            <button
                              type="button"
                              onClick={() => handleMarkAdminNotifRead(n.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition cursor-pointer"
                            >
                              पढ़ा गया
                            </button>
                          )}
                          {n.targetTab && (
                            <button
                              type="button"
                              onClick={() => {
                                handleMarkAdminNotifRead(n.id);
                                if (n.targetTab === 'rss') {
                                  setSubTab('rss');
                                } else if (n.targetTab === 'support' || n.targetTab === 'requests') {
                                  setSubTab('users');
                                } else if (n.targetTab === 'logo') {
                                  setSubTab('users');
                                }
                              }}
                              className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-[10px] font-black rounded-lg border border-amber-400/40 transition cursor-pointer flex items-center gap-1"
                            >
                              <span>देखें</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                })()}
              </div>
            </div>
          )}
        </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 12: सहायता एवं नीतियाँ (HELP & POLICIES)                               */}
        {/* ========================================================================= */}
        <div id="section-policies" className={`rounded-2xl border transition-all overflow-hidden shadow-lg ${subTab === 'policies' ? 'border-amber-400 bg-slate-900/95 ring-2 ring-amber-400/20' : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'}`}>
          <button
            type="button"
            onClick={() => setSubTab(subTab === 'policies' ? '' : 'policies')}
            className={`w-full p-4 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${subTab === 'policies' ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800/80' : 'hover:bg-slate-850'}`}
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
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${subTab === 'policies' ? 'rotate-180 text-amber-400' : ''}`} />
            </div>
          </button>
          {subTab === 'policies' && (
            <div className="p-3 sm:p-5 border-t border-slate-800/80 bg-slate-950/70 animate-in fade-in slide-in-from-top-2 duration-200">
              <HelpAndPoliciesView />
            </div>
          )}
        </div>

      {/* Cashfree Payment Gateway Checkout Modal */}
      <CashfreePaymentModal
        isOpen={Boolean(cashfreeModalPlan)}
        plan={cashfreeModalPlan}
        currentUser={currentUser}
        onClose={() => setCashfreeModalPlan(null)}
        onSuccess={(planId) => {
          setCashfreeModalPlan(null);
          setUserPlanTier(planId as any);
          setUserSub(getUserSubscription());
          if (onPlanChanged) onPlanChanged();
          setPlanSaveSuccess(`🎉 ${planId.toUpperCase()} प्लान सफलतापूर्वक सक्रिय हो गया है!`);
          setTimeout(() => setPlanSaveSuccess(null), 4000);
        }}
      />
    </div>
  );
};
