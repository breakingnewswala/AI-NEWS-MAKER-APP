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
} from 'lucide-react';
import { VideoFeedItem, filterActiveVideos } from '../data/newsFeedData';
import { ReporterUser } from './LoginModal';
import { isEffectiveAdmin, isUserSuperAdmin } from '../lib/userPlanManager';
import { getApiBaseUrl, getApiUrl } from '../lib/apiConfig';

interface VideosScreenWebProps {
  videos: VideoFeedItem[];
  currentUser?: ReporterUser | null;
  onOpenStudioWithVideo: (video: VideoFeedItem) => void;
  onAdminAddVideo?: (video: VideoFeedItem) => void;
  onAdminUpdateVideo?: (video: VideoFeedItem) => void;
  onAdminDeleteVideo?: (videoId: string) => void;
}

export const VideosScreenWeb: React.FC<VideosScreenWebProps> = ({
  videos,
  currentUser,
  onOpenStudioWithVideo,
  onAdminAddVideo,
  onAdminUpdateVideo,
  onAdminDeleteVideo,
}) => {
  // State for Editing Video Dialog
  const [editingVideo, setEditingVideo] = useState<VideoFeedItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editRatio, setEditRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5' | '4:3'>('9:16');

  // State for Delete Confirmation Dialog
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  // Active playing video & error state
  const [activeVideo, setActiveVideo] = useState<VideoFeedItem | null>(null);
  const [videoPlaybackError, setVideoPlaybackError] = useState<boolean>(false);
  const activeVideoPlayerRef = useRef<HTMLDivElement | null>(null);

  // User Video Report Modal State (Part N)
  const [reportingVideo, setReportingVideo] = useState<VideoFeedItem | null>(null);
  const [videoReportReason, setVideoReportReason] = useState<string>('गलत / भ्रामक वीडियो (Fake / Misleading Video)');
  const [videoReportDetails, setVideoReportDetails] = useState<string>('');
  const [isSubmittingVideoReport, setIsSubmittingVideoReport] = useState<boolean>(false);
  const [videoReportFeedback, setVideoReportFeedback] = useState<string>('');

  const handleSubmitVideoReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingVideo || isSubmittingVideoReport) return;
    setIsSubmittingVideoReport(true);
    try {
      const payload = {
        reportType: 'video',
        targetId: reportingVideo.id,
        targetTitle: reportingVideo.title,
        reportReason: videoReportReason,
        message: videoReportDetails ? `${videoReportReason}: ${videoReportDetails}` : videoReportReason,
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
  };

  const handleSaveVideoEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;
    const updated: VideoFeedItem = {
      ...editingVideo,
      title: editTitle.trim() || editingVideo.title,
      caption: editCaption.trim(),
      aspectRatio: editRatio as any,
    };
    if (onAdminUpdateVideo) {
      onAdminUpdateVideo(updated);
    }
    if (activeVideo && activeVideo.id === updated.id) {
      setActiveVideo(updated);
    }
    setEditingVideo(null);
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

  const [adminRatio, setAdminRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  const [adminTitle, setAdminTitle] = useState('');
  const [adminCaption, setAdminCaption] = useState('');
  const [adminThumbnailUrl, setAdminThumbnailUrl] = useState('');
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);

  const [adminChannel] = useState(currentUser?.channelName || 'एडमिन वायरल डेस्क');
  const [adminCategory] = useState('breaking');

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoData: base64Data,
            filename: file.name,
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: base64,
            filename: file.name,
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
    };

    if (onAdminAddVideo) {
      onAdminAddVideo(newVideo);
    }

    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/admin/videos/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVideo),
      });
    } catch {}

    setPublishSuccess(true);
    setIsPublishing(false);

    setTimeout(() => {
      setAdminTitle('');
      setAdminCaption('');
      setAdminVideoUrl('');
      setAdminThumbnailUrl('');
      setAdminVideoFile(null);
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

  const [selectedRatioFilter, setSelectedRatioFilter] = useState<'all' | '9:16' | '16:9' | '4:3' | '1:1' | '4:5'>('all');

  const filteredVideos = useMemo(() => {
    return activeVideos.filter((v) => {
      if (selectedRatioFilter !== 'all' && v.aspectRatio !== selectedRatioFilter) {
        return false;
      }
      return true;
    });
  }, [activeVideos, selectedRatioFilter]);

  // Role-based Admin check: Super Admin and Admin have access to video upload controls
  const isAdmin =
    isEffectiveAdmin(currentUser) ||
    isUserSuperAdmin(currentUser) ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'superadmin';

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border-b border-slate-800 px-3 sm:px-6 py-4 relative z-10 backdrop-blur-md">
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* Admin Video Upload Button - Available directly for Super Admin & Admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>वीडियो अपलोड</span>
              </button>
            )}

            {/* 4-Day Auto-Delete Tag - ADMIN ONLY */}
            {isAdmin && (
              <span className="hidden md:inline-flex px-2.5 py-1 bg-amber-950/70 border border-amber-600/40 text-amber-300 text-[11px] font-bold rounded-lg items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                4-दिन ऑटो-डिलीट सक्रिय
              </span>
            )}

            <span className="px-3 py-1.5 bg-red-950/80 border border-red-700/50 text-red-300 text-xs font-bold rounded-full flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              {filteredVideos.length} वीडियो
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 space-y-5">
        {/* Frame Filter Buttons Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'सभी' },
            { id: '9:16', label: '9:16' },
            { id: '16:9', label: '16:9' },
            { id: '1:1', label: '1:1' },
            { id: '4:5', label: '4:5' },
          ].map((f) => {
            const isSelected = selectedRatioFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedRatioFilter(f.id as any)}
                className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 text-slate-950 border-amber-300 shadow-lg font-black scale-105 ring-2 ring-amber-400/50'
                    : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{f.label}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
              </button>
            );
          })}
        </div>

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
                    <span>वीडियो फाइल चयन एवं अपलोड (MP4 / WebM / MOV):*</span>
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
                  <span>वीडियो आस्पेक्ट रेशियो (Aspect Ratio):*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {[
                    { id: '9:16', label: '9:16', desc: 'रील्स / शॉर्ट्स (Vertical)' },
                    { id: '16:9', label: '16:9', desc: 'यूट्यूब / टीवी (Landscape)' },
                    { id: '1:1', label: '1:1', desc: 'इंस्टा / स्क्वायर (Square)' },
                    { id: '4:5', label: '4:5', desc: 'सोशल / पोर्ट्रेट (Portrait)' },
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
                    <span>वीडियो शीर्षक / मुख्य हेडलाइन (Title):*</span>
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
                    <span>वीडियो कैप्शन एवं संदर्भ (Video Studio ट्रांसफर हेतु):*</span>
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

              {/* Step 5: Thumbnail Selection */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-400 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                      5
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

              {/* Step 6: Active Publish Button & Live Validation Checklist */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="text-xs font-black text-amber-400 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[11px] font-black">
                    6
                  </span>
                  <span>सत्यापन चेकलिस्ट (Live Validation):</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
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

              {/* Requirement 10: Button 'वीडियो स्टूडियो में ले जाएँ' */}
              <button
                type="button"
                onClick={() => onOpenStudioWithVideo(activeVideo)}
                className="px-5 py-3 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>वीडियो स्टूडियो में ले जाएँ</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((vid) => (
              <div
                key={vid.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all hover:shadow-xl flex flex-col justify-between group"
              >
                <div>
                  {/* Thumbnail with Play Overlay */}
                  <div
                    onClick={() => setActiveVideo(vid)}
                    className="relative h-48 w-full bg-slate-950 cursor-pointer overflow-hidden group"
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

                    <div className="absolute top-3 left-3 px-2.5 py-0.5 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-black rounded uppercase">
                      {vid.aspectRatio ? `${vid.aspectRatio}` : 'वीडियो'}
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center text-xs text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium text-amber-400">
                        <Eye className="w-3.5 h-3.5" />
                        {vid.views}
                      </span>
                    </div>

                    <h3
                      onClick={() => setActiveVideo(vid)}
                      className="text-base font-bold text-white group-hover:text-amber-300 transition-colors cursor-pointer line-clamp-2 leading-snug"
                    >
                      {vid.title}
                    </h3>

                    {vid.caption && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {vid.caption}
                      </p>
                    )}
                  </div>
                </div>

                {/* Admin Editing Controls (Edit Info, Caption, Ratio & Delete) */}
                {isAdmin && (
                  <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditingVideo(vid)}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer transition active:scale-95"
                        title="वीडियो, कैप्शन व आस्पेक्ट रेशियो संपादित करें"
                      >
                        <Edit3 className="w-3 h-3 text-amber-400" />
                        <span>एडिट (Edit)</span>
                      </button>
                      <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                        {vid.aspectRatio || '4:5'}
                      </span>
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

                {/* Action Buttons: वीडियो स्टूडियो में ले जाएँ + वीडियो देखें */}
                <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenStudioWithVideo(vid)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>वीडियो स्टूडियो में ले जाएँ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveVideo(vid)}
                    className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer active:scale-95 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span>वीडियो देखें</span>
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
            ))}
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
                <span>वीडियो विवरण व रेशियो एडिट करें (Admin Edit)</span>
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
                <label className="text-xs font-bold text-slate-300 block">वीडियो शीर्षक (Title):</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">वीडियो कैप्शन (Caption):</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 resize-none"
                  placeholder="कैप्शन या विवरण लिखें..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">आस्पेक्ट रेशियो बदलें (Aspect Ratio):</label>
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
                    'गलत / भ्रामक वीडियो (Fake / Misleading Video)',
                    'आपत्तिजनक दृश्य / भाषा (Offensive Visuals / Language)',
                    'कॉपीराइट उल्लंघन (Copyright Infringement)',
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

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  अतिरिक्त विवरण (वैकल्पिक):
                </label>
                <textarea
                  value={videoReportDetails}
                  onChange={(e) => setVideoReportDetails(e.target.value)}
                  placeholder="कृपया समस्या का संक्षेप में विवरण दें..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

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
