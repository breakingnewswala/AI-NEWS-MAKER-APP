import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Sparkles,
  Clock,
  Eye,
  Film,
  Flame,
  Upload,
  PlusCircle,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Edit3,
  Trash2,
  Check,
  X,
  ArrowUp,
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Flag,
  ChevronDown,
  RefreshCw,
  Coins,
  Download,
  Lock,
} from 'lucide-react';
import { VideoFeedItem, filterActiveVideos } from '../data/newsFeedData';
import { ReporterUser } from './LoginModal';
import { isEffectiveAdmin, isUserSuperAdmin, getUserSubscription } from '../lib/userPlanManager';
import { getApiBaseUrl, getApiUrl } from '../lib/apiConfig';
import { FeaturePromotionCard, PromoLayoutRatio } from './FeaturePromotionCard';

interface VideosScreenWebProps {
  videos: VideoFeedItem[];
  currentUser?: ReporterUser | null;
  onOpenStudioWithVideo: (video: VideoFeedItem) => void;
  onAdminAddVideo?: (video: VideoFeedItem) => void;
  onAdminUpdateVideo?: (video: VideoFeedItem) => void;
  onAdminDeleteVideo?: (videoId: string) => void;
  onNavigateToTab?: (tab: any, meta?: any) => void;
}

export const VideosScreenWeb: React.FC<VideosScreenWebProps> = ({
  videos,
  currentUser,
  onOpenStudioWithVideo,
  onAdminAddVideo,
  onAdminUpdateVideo,
  onAdminDeleteVideo,
  onNavigateToTab,
}) => {
  // State for Editing Video Dialog
  const [editingVideo, setEditingVideo] = useState<VideoFeedItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editRatio, setEditRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5' | '4:3'>('9:16');
  const [editIsBonus, setEditIsBonus] = useState(false);
  const [editRewardCoins, setEditRewardCoins] = useState(50);

  // Unlocked video items via coins
  const [unlockedVideoIds, setUnlockedVideoIds] = useState<Set<string>>(() => {
    try {
      const email = currentUser?.email || 'guest';
      const saved = localStorage.getItem(`app_unlocked_video_ids_${email}`);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  const [isUnlockingVideoId, setIsUnlockingVideoId] = useState<string | null>(null);

  // Admin Coin Value Configuration state for video
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
      fetch(getApiUrl(`/api/user/wallet?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`))
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.wallet) {
            const bal = typeof data.wallet.coinBalance === 'number'
              ? data.wallet.coinBalance
              : (typeof data.wallet.balance === 'number' ? data.wallet.balance : 0);
            setWalletCoins(bal);
            try {
              localStorage.setItem('ai_news_user_wallet_coins', String(bal));
            } catch {}
          }
        })
        .catch(() => {});
    };

    fetchBalance();
    const handleWalletUpdated = (e: any) => {
      const b = typeof e?.detail?.coinBalance === 'number'
        ? e.detail.coinBalance
        : (typeof e?.detail?.balance === 'number' ? e.detail.balance : null);
      if (b !== null) {
        setWalletCoins(b);
      } else {
        fetchBalance();
      }
    };
    window.addEventListener('ai_news_wallet_updated', handleWalletUpdated);
    window.addEventListener('wallet_balance_updated', handleWalletUpdated);
    window.addEventListener('storage', fetchBalance);
    return () => {
      window.removeEventListener('ai_news_wallet_updated', handleWalletUpdated);
      window.removeEventListener('wallet_balance_updated', handleWalletUpdated);
      window.removeEventListener('storage', fetchBalance);
    };
  }, [currentUser?.email]);

  // Part 6: Auto-refresh video feed every 15s when active, visible and online
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine && !isSyncingVideos) {
        handleRefreshVideos();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isSyncingVideos]);

  const handleRefreshVideos = async () => {
    if (isSyncingVideos) return;
    setIsSyncingVideos(true);
    try {
      window.dispatchEvent(new CustomEvent('ai_news_feed_refresh_needed'));
    } catch {}
    setTimeout(() => {
      setIsSyncingVideos(false);
    }, 700);
  };

  useEffect(() => {
    if (!currentUser?.email) return;
    const fetchUnlocked = async () => {
      try {
        const uRes = await fetch(getApiUrl(`/api/wallet/unlocked-items?email=${encodeURIComponent(currentUser.email || '')}`));
          const uData = await uRes.json();
          const rawItems = uData.unlockedItems || uData.unlockedList || (Array.isArray(uData.items) ? uData.items.map((it: any) => typeof it === 'string' ? it : it.itemId) : []);
          if (Array.isArray(rawItems) && rawItems.length > 0) {
            const videoUnlocked = rawItems.filter((id: string) => typeof id === 'string' && (id.startsWith('vid') || id.includes('video') || !id.startsWith('news')));
            setUnlockedVideoIds((prev) => {
              const updated = new Set([...Array.from(prev), ...videoUnlocked]);
              try {
                localStorage.setItem(`app_unlocked_video_ids_${currentUser.email}`, JSON.stringify(Array.from(updated)));
              } catch {}
              return updated;
            });
          }
      } catch {}
    };
    fetchUnlocked();
  }, [currentUser?.email]);

  const isVideoRestricted = (vid: VideoFeedItem) => {
    if (isAdmin) return false;
    const cost = vid.coinCost || vid.coinValue || 0;
    if (cost <= 0) return false;
    if (!Array.isArray(vid.restrictedPlans) || vid.restrictedPlans.length === 0) return false;
    const sub = getUserSubscription(currentUser?.email);
    const userPlan = (sub?.tier || 'basic').toLowerCase();
    const userPlanName = (sub?.planName || 'BASIC').toLowerCase();
    const isRestricted = vid.restrictedPlans.some((p: string) => {
      const cleanP = p.toLowerCase();
      return cleanP === userPlan || cleanP === userPlanName ||
        (cleanP === 'basic' && userPlan === 'basic') ||
        (cleanP === 'advance' && (userPlan === 'advanced' || userPlan === 'advance')) ||
        (cleanP === 'pro' && (userPlan === 'professional' || userPlan === 'pro')) ||
        (cleanP === 'vip desk' && (userPlan === 'ultra' || userPlan === 'vip' || userPlan === 'vip desk'));
    });
    if (!isRestricted) return false;
    return !unlockedVideoIds.has(vid.id);
  };

  const handleUnlockVideo = async (vid: VideoFeedItem) => {
    if (!currentUser?.email) {
      alert('कृपया पहले लॉगिन करें।');
      return;
    }
    const cost = vid.coinCost || vid.coinValue || 0;
    if (cost <= 0) {
      setInlinePlayingId(vid.id);
      return;
    }
    const confirmUnlock = window.confirm(`क्या आप ${cost} कॉइन खर्च करके यह वीडियो अनलॉक करना चाहते हैं?`);
    if (!confirmUnlock) return;

    setIsUnlockingVideoId(vid.id);
    try {
      const res = await fetch(getApiUrl('/api/wallet/unlock-item'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          itemId: vid.id,
          itemType: 'video',
          coinCost: cost,
          coinValue: cost,
          title: vid.title,
          itemTitle: vid.title,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUnlockedVideoIds((prev) => {
          const updated = new Set(prev);
          updated.add(vid.id);
          try {
            localStorage.setItem(`app_unlocked_video_ids_${currentUser.email}`, JSON.stringify(Array.from(updated)));
          } catch {}
          return updated;
        });
        window.dispatchEvent(new CustomEvent('wallet_balance_updated'));
        alert(`🎉 बधाई! ${cost} कॉइन में वीडियो अनलॉक हो गया।`);
        setInlinePlayingId(vid.id);
      } else {
        alert(data.error || 'अनलॉक विफल रहा। कृपया पर्याप्त कॉइन बैलेंस सुनिश्चित करें।');
      }
    } catch {
      alert('नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
    } finally {
      setIsUnlockingVideoId(null);
    }
  };

  const handleSaveVideoCoinConfig = async () => {
    if (!coinConfigVideo) return;
    const cost = Math.max(0, Math.floor(Number(videoCoinCost) || 0));
    setVideoCoinSaving(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/videos/${encodeURIComponent(coinConfigVideo.id)}/coin-value`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || '',
        },
        body: JSON.stringify({
          coinCost: cost,
          coinValue: cost,
          restrictedPlans: videoCoinPlans,
        }),
      });
      if (res.ok) {
        if (onAdminUpdateVideo) {
          onAdminUpdateVideo({
            ...coinConfigVideo,
            coinCost: cost,
            coinValue: cost,
            restrictedPlans: videoCoinPlans,
          });
        }
        setCoinConfigVideo(null);
      } else {
        alert('कॉइन वैल्यू सेव करने में विफल।');
      }
    } catch {
      alert('नेटवर्क त्रुटि।');
    } finally {
      setVideoCoinSaving(false);
    }
  };

  // State for Delete Confirmation Dialog
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  // Active playing video & error state
  const [activeVideo, setActiveVideo] = useState<VideoFeedItem | null>(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState<boolean>(false);
  const activeVideoPlayerRef = useRef<HTMLDivElement | null>(null);

  // User Video Report Modal State (Part N)
  const [reportingVideo, setReportingVideo] = useState<VideoFeedItem | null>(null);
  const [videoReportReason, setVideoReportReason] = useState<string>('वीडियो में गलती है');
  const [videoReportDetails, setVideoReportDetails] = useState<string>('');
  const [isSubmittingVideoReport, setIsSubmittingVideoReport] = useState<boolean>(false);
  const [videoReportFeedback, setVideoReportFeedback] = useState<string>('');

  const handleSubmitVideoReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingVideo || isSubmittingVideoReport) return;
    if (videoReportReason === 'अन्य समस्या' && !videoReportDetails.trim()) {
      setVideoReportFeedback('⚠️ कृपया "अन्य समस्या" के लिए विवरण दर्ज करें।');
      return;
    }
    setIsSubmittingVideoReport(true);
    try {
      const payload = {
        reportType: 'video',
        targetId: reportingVideo.id,
        targetTitle: reportingVideo.title,
        reportReason: videoReportReason,
        message: videoReportReason === 'अन्य समस्या' ? videoReportDetails.trim() : (videoReportDetails.trim() ? `${videoReportReason}: ${videoReportDetails.trim()}` : videoReportReason),
        userId: currentUser?.email || 'guest',
        userName: currentUser?.name || 'न्यूज़ दर्शक',
        userEmail: currentUser?.email || '',
      };
      const res = await fetch(getApiUrl('/api/support/requests'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setVideoReportFeedback('✅ आपकी रिपोर्ट दर्ज हो गई है। धन्यवाद!');
        setTimeout(() => {
          setReportingVideo(null);
          setVideoReportFeedback('');
          setVideoReportDetails('');
        }, 1800);
      } else {
        setVideoReportFeedback('❌ रिपोर्ट सबमिट करने में विफल। पुनः प्रयास करें।');
      }
    } catch {
      setVideoReportFeedback('❌ नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।');
    } finally {
      setIsSubmittingVideoReport(false);
    }
  };

  // Reset video playback error when active video changes
  useEffect(() => {
    setVideoPlaybackError(false);
    if (activeVideo && activeVideoPlayerRef.current) {
      activeVideoPlayerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeVideo]);

  const startEditingVideo = (vid: VideoFeedItem) => {
    setEditingVideo(vid);
    setEditTitle(vid.title || '');
    setEditCaption(vid.caption || '');
    setEditRatio((vid.aspectRatio as any) || '9:16');
    setEditIsBonus(Boolean(vid.isBonus));
    setEditRewardCoins(vid.rewardCoins || 50);
  };

  const handleSaveVideoEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    const updated: VideoFeedItem = {
      ...editingVideo,
      title: editTitle.trim() || editingVideo.title,
      caption: editCaption.trim(),
      aspectRatio: editRatio as any,
      isBonus: editIsBonus,
      rewardCoins: editIsBonus ? editRewardCoins : undefined,
    };
    if (onAdminUpdateVideo) {
      onAdminUpdateVideo(updated);
    }
    if (activeVideo && activeVideo.id === updated.id) {
      setActiveVideo(updated);
    }
    setEditingVideo(null);
  };

  const handleToggleBonus = (vid: VideoFeedItem) => {
    const nextIsBonus = !vid.isBonus;
    const updated: VideoFeedItem = {
      ...vid,
      isBonus: nextIsBonus,
      rewardCoins: nextIsBonus ? (vid.rewardCoins || 50) : undefined,
    };
    if (onAdminUpdateVideo) {
      onAdminUpdateVideo(updated);
    }
    try {
      fetch(`${getApiBaseUrl()}/api/admin/videos/${vid.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBonus: nextIsBonus, rewardCoins: nextIsBonus ? (vid.rewardCoins || 50) : undefined }),
      }).catch(() => {});
    } catch {}
  };

  const handleConfirmDelete = () => {
    if (!deletingVideoId) return;
    if (onAdminDeleteVideo) {
      onAdminDeleteVideo(deletingVideoId);
    }
    if (activeVideo && activeVideo.id === deletingVideoId) {
      setActiveVideo(null);
    }
    setDeletingVideoId(null);
  };

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);

  // Floating Back to Top state
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowBackToTop(window.scrollY > 300);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 7-Step Admin Upload Form State
  const [adminVideoFile, setAdminVideoFile] = useState<File | null>(null);
  const [adminVideoUrl, setAdminVideoUrl] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [adminRatio, setAdminRatio] = useState<'9:16' | '1:1' | '4:5' | '4:3'>('9:16');
  const [adminTitle, setAdminTitle] = useState('');
  const [adminCaption, setAdminCaption] = useState('');
  const [adminThumbnailUrl, setAdminThumbnailUrl] = useState('');
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  // Master Prompt Video Studio: 4 Headline Variants, Crop Region, and 4:5 native flag
  const [adminHeadlines, setAdminHeadlines] = useState<string[]>(['', '', '', '']);
  const [isGeneratingHeadlines, setIsGeneratingHeadlines] = useState<boolean>(false);
  const [adminCropY, setAdminCropY] = useState<number>(30); // 0% to 100%
  const [adminIsOnly4_5, setAdminIsOnly4_5] = useState<boolean>(false);
  const [adminSourceDimensions, setAdminSourceDimensions] = useState<{ width: number; height: number }>({ width: 1080, height: 1920 });

  const [adminChannel] = useState(currentUser?.channelName || 'एडमिन वायरल डेस्क');
  const [adminCategory] = useState('breaking');
  const [adminIsBonus, setAdminIsBonus] = useState(false);
  const [adminRewardCoins, setAdminRewardCoins] = useState(50);

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Helper to generate a video thumbnail from the first frame
  const generateVideoThumbnail = (fileOrUrl: File | string): Promise<string> => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';

        const objectUrl = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
        video.src = objectUrl;

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1.0, video.duration > 1 ? 1.0 : 0.1);
        };

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumb = canvas.toDataURL('image/jpeg', 0.85);
              if (typeof fileOrUrl !== 'string') URL.revokeObjectURL(objectUrl);
              resolve(thumb);
              return;
            }
          } catch (e) {
            console.warn('Canvas frame capture fallback:', e);
          }
          if (typeof fileOrUrl !== 'string') URL.revokeObjectURL(objectUrl);
          resolve('');
        };

        video.onerror = () => {
          if (typeof fileOrUrl !== 'string') URL.revokeObjectURL(objectUrl);
          resolve('');
        };
      } catch {
        resolve('');
      }
    });
  };

  // Step 1: Video File Selection & Persistent Server Upload
  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v|mkv)$/i)) {
      alert('कृपया केवल मान्य वीडियो फाइल (MP4, WebM, MOV) का चयन करें।');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      alert('फाइल साइज़ 100MB से अधिक है। कृपया 100MB से छोटी वीडियो का उपयोग करें।');
      return;
    }

    setAdminVideoFile(file);
    setIsUploadingVideo(true);
    setUploadProgress(20);

    // Auto capture frame for thumbnail
    try {
      generateVideoThumbnail(file).then((frame) => {
        if (frame && !adminThumbnailUrl) {
          setAdminThumbnailUrl(frame);
        }
      });
    } catch {}

    // Read file as base64 Data URL and upload to backend
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      if (!base64Data) {
        setIsUploadingVideo(false);
        return;
      }
      setUploadProgress(60);

      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/admin/videos/upload-file`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': 'master-admin',
            'x-user-role': 'admin',
            'x-admin-email': currentUser?.email || 'breakingnewswala.com@gmail.com',
            'x-user-email': currentUser?.email || 'breakingnewswala.com@gmail.com',
          },
          body: JSON.stringify({
            videoData: base64Data,
            filename: file.name,
            adminEmail: currentUser?.email || 'breakingnewswala.com@gmail.com',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.videoUrl) {
            setAdminVideoUrl(data.videoUrl);
            setUploadProgress(100);
            setIsUploadingVideo(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Video server upload fallback to data URL:', err);
      }

      // Fallback: Store persistent data URL (NEVER ephemeral URL.createObjectURL blob)
      setAdminVideoUrl(base64Data);
      setUploadProgress(100);
      setIsUploadingVideo(false);
    };

    reader.onerror = () => {
      alert('वीडियो पढ़ने में त्रुटि हुई। कृपया पुनः प्रयास करें।');
      setIsUploadingVideo(false);
    };

    reader.readAsDataURL(file);
  };

  // Step 5: Custom Thumbnail Image Upload
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('कृपया मान्य इमेज फाइल चुनें।');
      return;
    }

    setIsUploadingThumb(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (!base64) {
        setIsUploadingThumb(false);
        return;
      }

      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/admin/videos/upload-thumbnail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': 'master-admin',
            'x-user-role': 'admin',
            'x-admin-email': currentUser?.email || 'breakingnewswala.com@gmail.com',
            'x-user-email': currentUser?.email || 'breakingnewswala.com@gmail.com',
          },
          body: JSON.stringify({
            imageData: base64,
            filename: file.name,
            adminEmail: currentUser?.email || 'breakingnewswala.com@gmail.com',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.thumbnailUrl) {
            setAdminThumbnailUrl(data.thumbnailUrl);
            setIsUploadingThumb(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Thumbnail server upload fallback to base64:', err);
      }

      setAdminThumbnailUrl(base64);
      setIsUploadingThumb(false);
    };

    reader.readAsDataURL(file);
  };

  // Master Prompt Step 5: AI Headline Generation for Video (4 Variants)
  const handleGenerateHeadlines = async () => {
    if (!adminCaption.trim() && !adminTitle.trim()) {
      alert('कृपया पहले वीडियो कैप्शन या शीर्षक लिखें ताकि AI हेडलाइन बना सके।');
      return;
    }
    setIsGeneratingHeadlines(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/generate-video-headlines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: adminCaption.trim(),
          title: adminTitle.trim(),
          ratio: adminRatio,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.headlines) && data.headlines.length >= 4) {
          setAdminHeadlines(data.headlines.slice(0, 4));
        } else if (Array.isArray(data.headlines)) {
          const filled = [...data.headlines];
          while (filled.length < 4) filled.push('');
          setAdminHeadlines(filled);
        }
      } else {
        alert('हेडलाइन जनरेट करने में समस्या आई, कृपया मैन्युअली दर्ज करें।');
      }
    } catch (err) {
      console.warn('AI headline generator fallback error:', err);
    } finally {
      setIsGeneratingHeadlines(false);
    }
  };

  // Step 6 & 7: Form Validation & Active Publishing
  const isFormValid = useMemo(() => {
    return (
      Boolean(adminVideoUrl.trim()) &&
      Boolean(adminRatio) &&
      Boolean(adminTitle.trim()) &&
      Boolean(adminCaption.trim())
    );
  }, [adminVideoUrl, adminRatio, adminTitle, adminCaption]);

  const handleAdminSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert('कृपया वीडियो, रेशियो, शीर्षक और कैप्शन सभी आवश्यक फ़ील्ड भरें।');
      return;
    }

    setIsPublishing(true);

    const compatibleFrameIds =
      adminRatio === '9:16'
        ? adminIsOnly4_5
          ? ['frame-custom-3line-4-5']
          : ['frame-custom-3line-4-5', 'frame-custom-full-9-16']
        : ['frame-custom-3line-4-5', 'frame-classic-lower-third'];

    const newVideo: VideoFeedItem = {
      id: `vid-admin-${Date.now()}`,
      title: adminTitle.trim(),
      caption: adminCaption.trim(),
      aspectRatio: adminRatio,
      createdAt: Date.now(),
      duration: '01:30',
      channel: adminChannel || currentUser?.channelName || 'एडमिन वायरल डेस्क',
      views: '1K देखा गया',
      videoUrl: adminVideoUrl.trim(),
      thumbnailUrl:
        adminThumbnailUrl.trim() ||
        'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop',
      category: adminCategory,
      isBonus: adminIsBonus,
      rewardCoins: adminIsBonus ? adminRewardCoins : undefined,
      headlineVariants: adminHeadlines.map((h) => h.trim()).filter(Boolean),
      cropRegion: {
        x: 0,
        y: adminCropY / 100,
        width: 1,
        height: 0.8,
        aspectRatio: '4:5',
      },
      isOnly4_5: adminIsOnly4_5,
      isFullVisibilityAvailable: !adminIsOnly4_5,
      compatibleFrameIds: compatibleFrameIds,
      sourceDimensions: adminSourceDimensions,
    };

    try {
      const baseUrl = getApiBaseUrl();
      const adminEmail = currentUser?.email || 'breakingnewswala.com@gmail.com';
      const res = await fetch(`${baseUrl}/api/admin/videos/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': 'master-admin',
          'x-user-role': 'admin',
          'x-admin-email': adminEmail,
          'x-user-email': adminEmail,
        },
        body: JSON.stringify(newVideo),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'वीडियो डेटाबेस में सेव करने में विफल');
      }

      const data = await res.json();
      const savedVideo = data.video || newVideo;

      if (onAdminAddVideo) {
        onAdminAddVideo(savedVideo);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai_video_uploaded', { detail: savedVideo }));
      }

      setPublishSuccess(true);
      setIsPublishing(false);
    } catch (err: any) {
      console.error('Video publish error:', err);
      alert(`वीडियो पब्लिश करने में त्रुटि: ${err.message || 'सर्वर पर वीडियो सहेजा नहीं जा सका'}`);
      setIsPublishing(false);
      return;
    }

    setTimeout(() => {
      setAdminTitle('');
      setAdminCaption('');
      setAdminHeadlines(['', '', '', '']);
      setAdminVideoUrl('');
      setAdminThumbnailUrl('');
      setAdminVideoFile(null);
      setAdminIsBonus(false);
      setAdminIsOnly4_5(false);
      setAdminCropY(30);
      setPublishSuccess(false);
      setIsAdminPanelOpen(false);
    }, 1500);
  };

  // Filter out videos older than 4 days and strictly sort newest-first
  const activeVideos = useMemo(() => {
    const list = filterActiveVideos(videos);
    return [...list].sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : ((a as any).timestamp ? new Date((a as any).timestamp).getTime() : 0);
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : ((b as any).timestamp ? new Date((b as any).timestamp).getTime() : 0);
      return timeB - timeA;
    });
  }, [videos]);

  const ratioOptions = [
    { id: 'all', label: 'सभी अनुपात' },
    { id: '9:16', label: '9:16 — वर्टिकल' },
    { id: '16:9', label: '16:9 — लैंडस्केप' },
    { id: '1:1', label: '1:1 — वर्गाकार' },
    { id: '4:5', label: '4:5 — पोर्ट्रेट' },
  ];

  const [selectedRatioFilter, setSelectedRatioFilter] = useState<'all' | '9:16' | '16:9' | '4:3' | '1:1' | '4:5'>('all');
  const [isBonusOnlyFilter, setIsBonusOnlyFilter] = useState<boolean>(false);
  const [isRatioDropdownOpen, setIsRatioDropdownOpen] = useState<boolean>(false);
  const [inlinePlayingId, setInlinePlayingId] = useState<string | null>(null);

  const bonusVideos = useMemo(() => {
    return activeVideos.filter((v) => {
      if (!v.isBonus) return false;
      if (selectedRatioFilter !== 'all' && v.aspectRatio !== selectedRatioFilter) {
        return false;
      }
      return true;
    });
  }, [activeVideos, selectedRatioFilter]);

  const filteredVideos = useMemo(() => {
    return activeVideos.filter((v) => {
      if (isBonusOnlyFilter && !v.isBonus) {
        return false;
      }
      if (selectedRatioFilter !== 'all' && v.aspectRatio !== selectedRatioFilter) {
        return false;
      }
      return true;
    });
  }, [activeVideos, selectedRatioFilter, isBonusOnlyFilter]);

  // Role-based Admin check: Super Admin and Admin have access to video upload controls
  const isAdmin =
    isEffectiveAdmin(currentUser) ||
    isUserSuperAdmin(currentUser) ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'superadmin';

  const getAspectRatioClass = (ratio?: string) => {
    switch (ratio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[520px]';
      case '16:9':
        return 'aspect-video max-h-[380px]';
      case '1:1':
        return 'aspect-square max-h-[420px]';
      case '4:5':
        return 'aspect-[4/5] max-h-[480px]';
      case '4:3':
        return 'aspect-[4/3] max-h-[400px]';
      default:
        return 'aspect-video max-h-[380px]';
    }
  };

  const renderVideoCard = (vid: VideoFeedItem, isHorizontal = false) => {
    const isPlaying = inlinePlayingId === vid.id;
    const ratioClass = getAspectRatioClass(vid.aspectRatio);

    return (
      <div
        key={vid.id}
        className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all flex flex-col justify-between group ${
          vid.isBonus
            ? 'border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm hover:shadow-xl'
        } ${isHorizontal ? 'w-64 sm:w-72 shrink-0 snap-start' : 'break-inside-avoid mb-6 w-full hover:shadow-xl'}`}
      >
        <div>
          {/* Card Media Container with exact aspect ratio */}
          <div className={`relative w-full ${ratioClass} bg-black overflow-hidden flex items-center justify-center`}>
            {isPlaying ? (
              <div className="relative w-full h-full bg-black flex items-center justify-center">
                <video
                  src={vid.videoUrl}
                  autoPlay
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => {
                    setVideoPlaybackError(true);
                    setActiveVideo(vid);
                  }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInlinePlayingId(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-black text-white rounded-full z-20 text-xs font-bold cursor-pointer"
                  title="वीडियो बंद करें"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                onClick={() => setInlinePlayingId(vid.id)}
                className="w-full h-full relative cursor-pointer group"
              >
                <img
                  src={vid.thumbnailUrl}
                  alt={vid.title}
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-1 fill-white" />
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/80 backdrop-blur-sm rounded text-[11px] font-bold text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {vid.duration}
                </div>

                <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-black rounded uppercase">
                    {vid.aspectRatio || 'वीडियो'}
                  </span>
                  {vid.isBonus && (
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded flex items-center gap-1 shadow-md">
                      <Sparkles className="w-2.5 h-2.5 fill-current" />
                      बोनस
                    </span>
                  )}
                  {((vid.coinCost && vid.coinCost > 0) || (vid.coinValue && vid.coinValue > 0)) && (
                    <span className="px-2 py-0.5 bg-amber-500/90 text-slate-950 text-[10px] font-black rounded flex items-center gap-1 shadow-md">
                      <Coins className="w-2.5 h-2.5 text-slate-950 fill-current" />
                      {vid.coinCost || vid.coinValue} कॉइन्स
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-amber-400">
                <Eye className="w-3.5 h-3.5" />
                {vid.views}
              </span>
              {vid.isBonus && (
                <span className="text-[10px] text-amber-300 font-bold bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  +{vid.rewardCoins || 50} कॉइन्स
                </span>
              )}
            </div>

            <h3
              onClick={() => setInlinePlayingId(vid.id)}
              className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-2 leading-snug"
            >
              {vid.title}
            </h3>

            {vid.caption && (
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {vid.caption}
              </p>
            )}
          </div>
        </div>

        {/* Admin Editing Controls (Edit Info, Caption, Ratio, Coin Value, Toggle Bonus & Delete) */}
        {isAdmin && (
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => startEditingVideo(vid)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition active:scale-95"
                title="वीडियो, कैप्शन व आस्पेक्ट रेशियो संपादित करें"
              >
                <Edit3 className="w-3 h-3 text-amber-400" />
                <span>एडिट</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCoinConfigVideo(vid);
                  setVideoCoinCost(vid.coinCost || vid.coinValue || 50);
                  setVideoCoinPlans(vid.restrictedPlans && vid.restrictedPlans.length > 0 ? vid.restrictedPlans : ['Basic']);
                }}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition active:scale-95"
                title="कॉइन वैल्यू व रेस्ट्रिक्टेड प्लान सेट करें"
              >
                <Coins className="w-3 h-3 text-amber-400" />
                <span>कॉइन ({vid.coinCost || vid.coinValue || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleBonus(vid)}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition active:scale-95 border ${
                  vid.isBonus
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
                title="बोनस वीडियो स्थिति बदलें"
              >
                <Sparkles className="w-3 h-3" />
                <span>{vid.isBonus ? 'बोनस: चालू' : 'बोनस: बंद'}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDeletingVideoId(vid.id)}
              className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95"
              title="वीडियो डिलीट करें"
            >
              <Trash2 className="w-3 h-3 text-red-400" />
              <span>हटाएं</span>
            </button>
          </div>
        )}

        {/* Action Buttons: वीडियो अनलॉक / वीडियो स्टूडियो + डाउनलोड + वीडियो देखें + रिपोर्ट करें */}
        <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex items-center gap-2">
          {isVideoRestricted(vid) ? (
            <button
              type="button"
              disabled={isUnlockingVideoId === vid.id}
              onClick={() => handleUnlockVideo(vid)}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isUnlockingVideoId === vid.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
              <span>{vid.coinCost || vid.coinValue} कॉइन में वीडियो अनलॉक करें</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenStudioWithVideo(vid)}
              className="flex-1 py-2.5 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span>इस वीडियो को बनाएँ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setInlinePlayingId(vid.id)}
            className={`py-2.5 px-3.5 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border transition-colors cursor-pointer active:scale-95 shrink-0 ${
              isPlaying
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>{isPlaying ? 'चल रहा है' : 'देखें'}</span>
          </button>

          <button
            type="button"
            onClick={() => setReportingVideo(vid)}
            className="py-2.5 px-3 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-400 border border-slate-700 rounded-xl transition-colors cursor-pointer active:scale-95 shrink-0"
            title="इस वीडियो की रिपोर्ट करें"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070D1E] text-slate-900 dark:text-slate-100 pb-24 transition-colors">
      {/* Top Header */}
      <div className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-4 relative z-10 backdrop-blur-md text-slate-900 dark:text-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-lg shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                वीडियो एंड रील्स
              </h1>
              <p className="text-xs text-slate-400">
                एक्सक्लूसिव वीडियो रिपोर्ट्स एवं डिजिटल क्लिप्स
              </p>
            </div>
          </div>

          {/* DESKTOP CONTROLS (Hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap">
            {/* Total Videos Count */}
            <span className="px-3 py-1.5 bg-red-950/80 border border-red-700/50 text-red-300 text-xs font-bold rounded-full flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              {activeVideos.length} वीडियो
            </span>

            {/* Ratio Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRatioDropdownOpen(!isRatioDropdownOpen)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-amber-400 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition"
                title="अनुपात फ़िल्टर"
              >
                <span>{ratioOptions.find((o) => o.id === selectedRatioFilter)?.label || 'सभी अनुपात'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform ${isRatioDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isRatioDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  {ratioOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedRatioFilter(opt.id as any);
                        setIsRatioDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        selectedRatioFilter === opt.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selectedRatioFilter === opt.id && <Check className="w-3.5 h-3.5 text-slate-950" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bonus Videos Filter Button */}
            <button
              type="button"
              onClick={() => setIsBonusOnlyFilter(!isBonusOnlyFilter)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border transition cursor-pointer active:scale-95 ${
                isBonusOnlyFilter
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 shadow-lg font-black scale-105'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
              }`}
              title="केवल बोनस वीडियो दिखाएं"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>बोनस वीडियो</span>
            </button>

            {/* Admin Video Upload Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>वीडियो अपलोड</span>
              </button>
            )}

            {/* 4-Day Auto-Delete Tag - ADMIN ONLY */}
            {isAdmin && (
              <span className="hidden lg:inline-flex px-2.5 py-1 bg-amber-950/70 border border-amber-600/40 text-amber-300 text-[11px] font-bold rounded-lg items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                4-दिन ऑटो-डिलीट
              </span>
            )}
          </div>

          {/* MOBILE CONTROLS (Row 1: 3 Centered Controls, Row 2: Full-width Admin Upload) */}
          <div className="flex sm:hidden flex-col gap-2 w-full mt-1">
            {/* Mobile 3-Card Summary Row (Part 1.2: Coins, Remaining Videos, Refresh with Part 7 tactile motion) */}
            <div className="grid grid-cols-3 gap-2 w-full mb-1">
              {/* Card 1: Coins */}
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToTab) onNavigateToTab('profile');
                  window.dispatchEvent(new CustomEvent('open_rewards_wallet'));
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/30 shadow-xs hover:border-amber-500/60 active:scale-95 transition-all duration-150 motion-reduce:transform-none cursor-pointer text-center"
                title="रिवॉर्ड्स वॉलेट व कॉइन बैलेंस"
              >
                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-black text-sm">
                  <Coins className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{typeof walletCoins === 'number' ? walletCoins : 0}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">कॉइन बैलेंस</span>
              </button>

              {/* Card 2: Remaining Videos */}
              <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-red-400/50 active:scale-95 transition-all duration-150 motion-reduce:transform-none select-none text-center">
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
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-95 transition-all duration-150 motion-reduce:transform-none text-center cursor-pointer ${isSyncingVideos ? 'opacity-70 cursor-not-allowed' : ''}`}
                title="वीडियो फ़ीड रीफ्रेश करें"
              >
                <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400 font-black text-sm">
                  <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncingVideos ? 'animate-spin text-amber-500' : ''}`} />
                  <span>{isSyncingVideos ? 'रिफ्रेश...' : 'रिफ्रेश'}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">लाइव फ़ीड</span>
              </button>
            </div>
            {/* Row 1: Three balanced, centered controls (Theme-aware for Light & Dark mode) */}
            <div className="grid grid-cols-3 gap-1.5 w-full items-center">
              {/* 1. Video Count */}
              <div className="py-2 px-1 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 text-center truncate">
                <Flame className="w-3 h-3 text-red-500 shrink-0" />
                <span className="truncate">{activeVideos.length} वीडियो</span>
              </div>

              {/* 2. All Ratios Filter */}
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setIsRatioDropdownOpen(!isRatioDropdownOpen)}
                  className="w-full py-2 px-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer truncate shadow-xs"
                  title="अनुपात फ़िल्टर"
                >
                  <span className="truncate">{ratioOptions.find((o) => o.id === selectedRatioFilter)?.label || 'सभी अनुपात'}</span>
                  <ChevronDown className={`w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 transition-transform ${isRatioDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isRatioDropdownOpen && (
                  <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-1 z-50 space-y-1">
                    {ratioOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedRatioFilter(opt.id as any);
                          setIsRatioDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-between ${
                          selectedRatioFilter === opt.id
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {selectedRatioFilter === opt.id && <Check className="w-3 h-3 text-slate-950" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Bonus Video Filter */}
              <button
                type="button"
                onClick={() => setIsBonusOnlyFilter(!isBonusOnlyFilter)}
                className={`w-full py-2 px-1 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1 border transition truncate cursor-pointer ${
                  isBonusOnlyFilter
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-amber-300 font-black shadow'
                    : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-300 border-amber-500/40'
                }`}
                title="केवल बोनस वीडियो दिखाएं"
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="truncate">बोनस वीडियो</span>
              </button>
            </div>

            {/* Row 2: Full-width Video Upload Button (ADMIN ONLY) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-400 active:from-amber-400 active:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-slate-950 shrink-0" />
                <span>＋ वीडियो अपलोड करें</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 space-y-6">
        {/* Bonus Videos Horizontal Scrolling Section (Part S) */}
        {!isBonusOnlyFilter && bonusVideos.length > 0 && (
          <div className="space-y-3 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                  <Sparkles className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                  बोनस वीडियो
                  <span className="text-[11px] px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-full font-bold">
                    {bonusVideos.length} वीडियो
                  </span>
                </h3>
              </div>
              <span className="text-xs text-slate-400 hidden sm:inline">← स्लाइड करें →</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-500/40 scrollbar-track-slate-900 snap-x">
              {bonusVideos.map((bVid) => renderVideoCard(bVid, true))}
            </div>
          </div>
        )}

        {/* 7-Step Admin Video Upload Panel */}
        {isAdmin && isAdminPanelOpen && (
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm sm:text-base">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>एडमिन वीडियो पब्लिशिंग (7-स्टेप फॉर्म)</span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Auto-Delete 4 Days
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition"
              >
                ✕ बंद करें
              </button>
            </div>

            {/* Success Notification Banner */}
            {publishSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500 text-emerald-300 text-sm font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>✅ वीडियो सफलतापूर्वक प्रकाशित हो गया! फ़ीड में सबसे ऊपर लाइव हो चुका है।</span>
              </div>
            )}

            <form onSubmit={handleAdminSubmitVideo} className="space-y-5">
              {/* Step 1: Select Video File & Upload */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                      1
                    </span>
                    <span>वीडियो फाइल चयन एवं अपलोड:*</span>
                  </label>
                  {adminVideoUrl ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      वीडियो तैयार है
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">अधिकतम 100MB</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-4 border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-xl bg-slate-900/60 hover:bg-slate-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center">
                    <Upload className="w-6 h-6 text-amber-400" />
                    <span className="text-xs font-bold text-slate-200">
                      {adminVideoFile ? adminVideoFile.name : 'डिवाइस से वीडियो फाइल चुनें'}
                    </span>
                    {adminVideoFile && (
                      <span className="text-[10px] text-slate-400">
                        ({(adminVideoFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    )}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      className="hidden"
                      onChange={handleVideoFileSelect}
                    />
                  </label>

                  <div className="flex flex-col justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-800">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 block">
                        या वीडियो वेब लिंक (MP4 URL) दर्ज करें:
                      </span>
                      <input
                        type="text"
                        value={adminVideoUrl.startsWith('data:') ? '' : adminVideoUrl}
                        onChange={(e) => setAdminVideoUrl(e.target.value)}
                        placeholder="https://example.com/video.mp4"
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                    {isUploadingVideo && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold mb-1">
                          <span className="flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> अपलोड हो रहा है...
                          </span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Step 2: Select Ratio */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-black text-amber-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                    2
                  </span>
                  <span>वीडियो आस्पेक्ट रेशियो:*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {[
                    { id: '9:16', label: '9:16', desc: 'रील्स / शॉर्ट्स (Vertical)' },
                    { id: '1:1', label: '1:1', desc: 'इंस्टा / स्क्वायर (Square)' },
                    { id: '4:5', label: '4:5', desc: 'सोशल / पोर्ट्रेट (Portrait)' },
                    { id: '4:3', label: '4:3', desc: 'स्टैंडर्ड वीडियो (Landscape)' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAdminRatio(r.id as any)}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        adminRatio === r.id
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md scale-[1.02]'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black">{r.label}</div>
                      <div className="text-[10px] opacity-80">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Video Title */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-black text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                      3
                    </span>
                    <span>वीडियो शीर्षक / मुख्य हेडलाइन:*</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {adminTitle.length}/120 अक्षर
                  </span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={adminTitle}
                  onChange={(e) => setAdminTitle(e.target.value)}
                  placeholder="उदा. संसद में डिजिटल मीडिया बिल पास, पत्रकारों के लिए नए नियम लागू..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* Step 4: Video Caption */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-black text-amber-400 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                      4
                    </span>
                    <span>वीडियो कैप्शन एवं संदर्भ:</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    AI हेडलाइन व स्क्रिप्ट तैयार करने हेतु
                  </span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminCaption}
                  onChange={(e) => setAdminCaption(e.target.value)}
                  placeholder="इस वीडियो की पूरी पृष्ठभूमि, स्थान, और महत्वपूर्ण तथ्य लिखें। यह Video Studio में स्वतः पहुंचेगा और AI इसी आधार पर हेडलाइन व स्क्रिप्ट बनाएगा..."
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden resize-none"
                />
              </div>

              {/* Step 5 (NEW): Video Headlines Section (4 Variants + AI Generator) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-2">
                  <label className="text-xs font-black text-amber-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                      5
                    </span>
                    <span>वीडियो हेडलाइन्स (4 Variants — सेफ ज़ोन हेतु):</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateHeadlines}
                    disabled={isGeneratingHeadlines || (!adminCaption.trim() && !adminTitle.trim())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                      isGeneratingHeadlines || (!adminCaption.trim() && !adminTitle.trim())
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white shadow'
                    }`}
                  >
                    {isGeneratingHeadlines ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI हेडलाइन बना रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                        <span>AI से 4 हेडलाइन्स बनाएँ</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  ये चारों हेडलाइन्स यूज़र के स्टूडियो में तुरंत उपलब्ध होंगी। यूज़र एक-क्लिक से हेडलाइन स्विच कर सकेगा या अपनी इच्छानुसार एडिट कर सकेगा:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {[
                    { idx: 0, label: 'हेडलाइन 1 (डायरेक्ट ब्रेकिंग / मुख्य)', placeholder: 'उदा. संसद में डिजिटल मीडिया बिल पास, पत्रकारों के लिए नए नियम' },
                    { idx: 1, label: 'हेडलाइन 2 (तथ्य व कार्रवाई एंगल)', placeholder: 'उदा. नए प्रेस दिशानिर्देश तत्काल प्रभाव से लागू, नियमों की समीक्षा' },
                    { idx: 2, label: 'हेडलाइन 3 (बैकग्राउंड / संक्षिप्त विवरण)', placeholder: 'उदा. डिजिटल संवाददाताओं के अधिकार सुरक्षित, बड़ा फैसला' },
                    { idx: 3, label: 'हेडलाइन 4 (बोल्ड 2-लाइन पंच अलर्ट)', placeholder: 'उदा. मीडिया कानून में ऐतिहासिक संशोधन, सख्त दिशानिर्देश' },
                  ].map((hItem) => (
                    <div key={hItem.idx} className="space-y-1 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                        <span className="text-amber-300">{hItem.label}</span>
                        <span className="text-slate-500">{(adminHeadlines[hItem.idx] || '').length}/70 अक्षर</span>
                      </div>
                      <input
                        type="text"
                        maxLength={75}
                        value={adminHeadlines[hItem.idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdminHeadlines((prev) => {
                            const updated = [...prev];
                            while (updated.length <= hItem.idx) updated.push('');
                            updated[hItem.idx] = val;
                            return updated;
                          });
                        }}
                        placeholder={hItem.placeholder}
                        className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-600 focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 6 (NEW): 4:5 Core Safe Region Selection for 9:16 Video */}
              {adminRatio === '9:16' && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <label className="text-xs font-black text-amber-400 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                        6
                      </span>
                      <span>वीडियो विजिबिलिटी क्षेत्र चुनें (4:5 Core Region Selection):</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={adminIsOnly4_5}
                        onChange={(e) => setAdminIsOnly4_5(e.target.checked)}
                        className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-200 font-bold">केवल 4:5 वीडियो उपलब्ध है</span>
                    </label>
                  </div>

                  {adminIsOnly4_5 ? (
                    <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        यह वीडियो केवल 4:5 वीडियो विंडो वाले जैकेट्स (फ्रेम 1) में खुलेगी। अनुपयुक्त फुल 9:16 रील्स टेम्पलेट्स यूज़र के लिए स्वतः बंद रहेंगे।
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-400">
                        9:16 वर्टिकल वीडियो में से वह 4:5 क्षेत्र चुनें जो 3-लाइन हेडलाइन फ्रेम (फ्रेम 1) की मुख्य वीडियो विंडो में दिखेगा:
                      </p>

                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Interactive Visual 4:5 Crop Preview */}
                        <div className="relative w-28 h-48 bg-slate-900 rounded-xl border-2 border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {adminThumbnailUrl ? (
                            <img
                              src={adminThumbnailUrl}
                              alt="Crop visual"
                              className="w-full h-full object-cover opacity-60"
                            />
                          ) : (
                            <div className="text-[10px] text-slate-600 text-center px-1">9:16 वीडियो दृश्य</div>
                          )}

                          {/* 4:5 Crop Box Overlaid */}
                          <div
                            className="absolute left-0 right-0 border-2 border-amber-400 bg-amber-400/20 shadow-lg transition-all"
                            style={{
                              height: '80%', // 4:5 ratio on 9:16 canvas is approx 80% of height
                              top: `${Math.max(0, Math.min(20, (adminCropY / 100) * 20))}%`,
                            }}
                          >
                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-amber-300 text-[9px] font-black rounded">
                              4:5 विंडो दृश्य
                            </div>
                          </div>
                        </div>

                        {/* Controls & Presets */}
                        <div className="flex-1 space-y-3 w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400">क्विक प्रीसेट:</span>
                            {[
                              { label: 'शीर्ष (Top)', val: 5 },
                              { label: 'मध्य (Center)', val: 30 },
                              { label: 'तल (Bottom)', val: 80 },
                            ].map((preset) => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => setAdminCropY(preset.val)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                  adminCropY === preset.val
                                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>वर्टिकल अलाइनमेंट:</span>
                              <span className="text-amber-400 font-mono font-bold">{adminCropY}%</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={adminCropY}
                              onChange={(e) => setAdminCropY(Number(e.target.value))}
                              className="w-full accent-amber-400 cursor-pointer"
                            />
                          </div>

                          <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>फ्रेम 1 (4:5 विंडो) व फ्रेम 2 (फुल 9:16) दोनों टेम्पलेट्स संगत हैं।</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 7: Thumbnail Selection */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                      7
                    </span>
                    <span>थंबनेल चयन (वैकल्पिक / स्वतः कैप्चर):</span>
                  </label>
                  {adminThumbnailUrl && (
                    <span className="text-[10px] text-emerald-400 font-bold">थंबनेल सक्रिय ✅</span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {adminThumbnailUrl ? (
                    <div className="w-32 h-20 rounded-xl overflow-hidden border border-slate-700 bg-black shrink-0 relative group">
                      <img
                        src={adminThumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-20 rounded-xl border border-dashed border-slate-700 bg-slate-900 flex items-center justify-center text-slate-500 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2 w-full">
                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isUploadingThumb ? 'अपलोड हो रहा है...' : 'कस्टम थंबनेल फोटो अपलोड करें'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleThumbnailUpload}
                      />
                    </label>
                    <p className="text-[11px] text-slate-400">
                      यदि आप फोटो अपलोड नहीं करेंगे, तो वीडियो के प्रथम फ्रेम को स्वतः थंबनेल बना दिया जाएगा।
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 8: Bonus Video Toggle */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="admin-is-bonus" className="text-xs font-black text-amber-400 flex items-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>बोनस वीडियो के रूप में प्रकाशित करें:</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="admin-is-bonus"
                      checked={adminIsBonus}
                      onChange={(e) => setAdminIsBonus(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                    <span className="text-xs text-slate-300">{adminIsBonus ? 'हाँ' : 'नहीं'}</span>
                  </div>
                </div>
              </div>

              {/* Step 9: Active Publish Button & Live Validation Checklist */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-black text-amber-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                    9
                  </span>
                  <span>सत्यापन चेकलिस्ट:</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                  <div
                    className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      adminVideoUrl.trim()
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/30 border-red-800/40 text-red-300'
                    }`}
                  >
                    {adminVideoUrl.trim() ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>1. वीडियो फाइल</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      adminRatio
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/30 border-red-800/40 text-red-300'
                    }`}
                  >
                    {adminRatio ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>2. आस्पेक्ट रेशियो</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      adminTitle.trim()
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/30 border-red-800/40 text-red-300'
                    }`}
                  >
                    {adminTitle.trim() ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>3. शीर्षक</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      adminCaption.trim()
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/30 border-red-800/40 text-red-300'
                    }`}
                  >
                    {adminCaption.trim() ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>4. कैप्शन</span>
                  </div>

                  <div
                    className={`p-2 rounded-lg border flex items-center gap-1.5 ${
                      adminHeadlines.some((h) => Boolean(h.trim()))
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {adminHeadlines.some((h) => Boolean(h.trim())) ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 text-slate-500 font-bold">•</span>}
                    <span>5. हेडलाइन्स ({adminHeadlines.filter((h) => Boolean(h.trim())).length}/4)</span>
                  </div>
                </div>

                {/* Step 7: Publish & Verify Trigger */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>यह वीडियो 4 दिन बाद स्वतः फीड से डिलीट हो जाएगा</span>
                  </div>

                  <button
                    type="submit"
                    disabled={!isFormValid || isPublishing}
                    className={`w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
                      isFormValid && !isPublishing
                        ? 'bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-slate-950 ring-2 ring-amber-400/50 active:scale-95'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>वीडियो प्रकाशित हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>स्टेप 7: वीडियो फीड में प्रकाशित करें</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Featured Video Player if active */}
        {activeVideo && (
          <div
            ref={activeVideoPlayerRef}
            className="bg-slate-900 border-2 border-red-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-300"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-black rounded-md flex items-center gap-1">
                  <Play className="w-3 h-3 fill-current" />
                  लाइव वीडियो प्लेयर
                </span>
                {activeVideo.aspectRatio && (
                  <span className="px-2 py-0.5 bg-slate-800 text-amber-400 text-[10px] font-bold rounded">
                    रेशियो: {activeVideo.aspectRatio}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportingVideo(activeVideo)}
                  className="px-3 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5 border border-slate-700"
                  title="इस वीडियो की रिपोर्ट करें"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  <span>रिपोर्ट करें</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVideo(null)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition"
                >
                  ✕ बंद करें
                </button>
              </div>
            </div>

            {/* Video Player or Error State */}
            {videoPlaybackError ? (
              <div className="p-8 bg-red-950/60 border border-red-500/40 rounded-xl text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                <h4 className="text-base font-bold text-white">वीडियो लोड करने में समस्या हुई</h4>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  यह वीडियो सीधे ब्राउज़र में प्ले नहीं हो पा रहा है। वीडियो लिंक या नेटवर्क कनेक्शन की जांच करें।
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <a
                    href={activeVideo.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>नए टैब में खोलें</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setVideoPlaybackError(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    पुनः प्रयास करें
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[480px] w-full mx-auto shadow-inner flex items-center justify-center">
                <video
                  src={activeVideo.videoUrl}
                  controls
                  autoPlay
                  preload="metadata"
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => setVideoPlaybackError(true)}
                  onLoadedData={() => setVideoPlaybackError(false)}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div>
                <h3 className="text-lg font-bold text-white">{activeVideo.title}</h3>
                {activeVideo.caption && (
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    📌 {activeVideo.caption}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Eye className="w-3.5 h-3.5" />
                    {activeVideo.views}
                  </span>
                  <span>•</span>
                  <span>अवधि: {activeVideo.duration}</span>
                </div>
              </div>

              {/* CTA Button: 'इस वीडियो को बनाएँ' */}
              <button
                type="button"
                onClick={() => onOpenStudioWithVideo(activeVideo)}
                className="px-5 py-3 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>इस वीडियो को बनाएँ</span>
              </button>
            </div>
          </div>
        )}

        {/* Video Grid */}
        {filteredVideos.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Film className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-300">
              {selectedRatioFilter === 'all'
                ? 'कोई वीडियो उपलब्ध नहीं है'
                : `${selectedRatioFilter} रेशियो में कोई वीडियो नहीं मिला`}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              अन्य रेशियो फ़िल्टर चुनें या "सभी (All)" पर क्लिक करके सभी उपलब्ध वीडियो देखें।
            </p>
            <button
              type="button"
              onClick={() => setSelectedRatioFilter('all')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition cursor-pointer"
            >
              सभी वीडियो देखें
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {filteredVideos.map((vid, vidIndex) => {
              const promoConfig = (() => {
                if (vidIndex === 5) return { layoutRatio: '16:9' as PromoLayoutRatio, startFeatureIndex: 0 };
                if (vidIndex === 12) return { layoutRatio: 'carousel' as PromoLayoutRatio, startFeatureIndex: 5 };
                if (vidIndex === 19) return { layoutRatio: '4:5' as PromoLayoutRatio, startFeatureIndex: 4 };
                if (vidIndex === 26) return { layoutRatio: '1:1' as PromoLayoutRatio, startFeatureIndex: 8 };
                if (vidIndex === 33) return { layoutRatio: 'carousel' as PromoLayoutRatio, startFeatureIndex: 11 };
                if ((vidIndex + 1) % 7 === 0 && vidIndex > 33) {
                  const ratios: PromoLayoutRatio[] = ['16:9', 'carousel', '4:5', '1:1'];
                  const slot = Math.floor(vidIndex / 7);
                  return {
                    layoutRatio: ratios[slot % ratios.length],
                    startFeatureIndex: (slot * 3) % 12,
                  };
                }
                return null;
              })();

              return (
                <React.Fragment key={vid.id}>
                  {renderVideoCard(vid, false)}
                  {promoConfig && (
                    <div className="break-inside-avoid mb-6">
                      <FeaturePromotionCard
                        layoutRatio={promoConfig.layoutRatio}
                        startFeatureIndex={promoConfig.startFeatureIndex}
                        onNavigateToTab={(tab, meta) => {
                          if (onNavigateToTab) onNavigateToTab(tab, meta);
                        }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin Edit Video Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <Edit3 className="w-4 h-4" />
                <span>वीडियो विवरण व रेशियो एडिट करें</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVideoEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">वीडियो शीर्षक:</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">वीडियो कैप्शन:</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 resize-none"
                  placeholder="कैप्शन या विवरण लिखें..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">आस्पेक्ट रेशियो बदलें:</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['9:16', '16:9', '1:1', '4:5'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRatio(r)}
                      className={`py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                        editRatio === r
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <label htmlFor="edit-is-bonus" className="text-xs font-bold text-amber-300 flex items-center gap-2 cursor-pointer">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>बोनस वीडियो स्थिति:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-is-bonus"
                    checked={editIsBonus}
                    onChange={(e) => setEditIsBonus(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">{editIsBonus ? 'सक्रिय' : 'अक्रिय'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>बदलाव सेव करें</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Delete Video Confirmation Dialog */}
      {deletingVideoId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-500/60 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">वीडियो डिलीट करें?</h4>
                <p className="text-xs text-slate-400">क्या आप वाकई इस वीडियो को हटाना चाहते हैं?</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingVideoId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>हाँ, डिलीट करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Video Report Modal (Part N) */}
      {reportingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-black text-white">वीडियो की रिपोर्ट करें</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportingVideo(null);
                  setVideoReportFeedback('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
              <span className="font-bold text-amber-300">वीडियो शीर्षक: </span>
              {reportingVideo.title}
            </div>

            <form onSubmit={handleSubmitVideoReport} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  रिपोर्ट का कारण चुनें:
                </label>
                <div className="space-y-1.5 text-xs">
                  {[
                    'वीडियो में गलती है',
                    'हेडलाइन में गलती है',
                    'अन्य समस्या',
                  ].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 cursor-pointer text-slate-200 border border-slate-700/60"
                    >
                      <input
                        type="radio"
                        name="videoReportReason"
                        value={option}
                        checked={videoReportReason === option}
                        onChange={(e) => setVideoReportReason(e.target.value)}
                        className="accent-rose-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {videoReportReason === 'अन्य समस्या' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    समस्या का विवरण दर्ज करें <span className="text-rose-400">*</span>:
                  </label>
                  <textarea
                    value={videoReportDetails}
                    onChange={(e) => setVideoReportDetails(e.target.value)}
                    placeholder="कृपया समस्या का विवरण दें (अनिवार्य)..."
                    rows={3}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              {videoReportFeedback && (
                <div className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                  videoReportFeedback.startsWith('✅') ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50' : 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                }`}>
                  {videoReportFeedback}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setReportingVideo(null);
                    setVideoReportFeedback('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVideoReport}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>{isSubmittingVideoReport ? 'सबमिट हो रहा है...' : 'रिपोर्ट भेजें'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Coin Value & Restricted Plans Modal for Video */}
      {coinConfigVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-white">
                  वीडियो के लिए कॉइन वैल्यू सेट करें
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCoinConfigVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">चयनित वीडियो:</span>
              <p className="text-xs font-bold text-white line-clamp-2">{coinConfigVideo.title}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  आवश्यक कॉइन्स (Coin Value):
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={videoCoinCost}
                  onChange={(e) => setVideoCoinCost(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 font-bold"
                  placeholder="जैसे: 50 या 100"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  0 दर्ज करने पर यह वीडियो सभी के लिए निःशुल्क रहेगा।
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  किन प्लान्स के यूज़र्स से कॉइन लिए जाएँ (Restricted Plans):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Basic', 'Advance', 'Pro', 'VIP Desk'] as const).map((plan) => {
                    const isChecked = videoCoinPlans.includes(plan);
                    return (
                      <label
                        key={plan}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setVideoCoinPlans((prev) => [...prev, plan]);
                            } else {
                              setVideoCoinPlans((prev) => prev.filter((p) => p !== plan));
                            }
                          }}
                          className="accent-amber-500 w-3.5 h-3.5 rounded"
                        />
                        <span>{plan}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  चयनित प्लान के यूज़र्स को वीडियो देखने/स्टूडियो में खोलने से पहले कॉइन देने होंगे।
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCoinConfigVideo(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={videoCoinSaving}
                onClick={handleSaveVideoCoinConfig}
                className="py-2 px-5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-slate-950" />
                <span>{videoCoinSaving ? 'सेव हो रहा है...' : 'सेव करें'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-20 right-4 z-40 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-400/40 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-1.5 text-xs font-black transition-all transform hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom-4"
          title="शीर्ष पर वापस जाएं"
        >
          <ArrowUp className="w-4 h-4 text-amber-400" />
          <span>ऊपर जाएँ</span>
        </button>
      )}
    </div>
  );
};
