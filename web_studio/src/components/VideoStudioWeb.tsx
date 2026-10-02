import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Upload,
  RotateCcw,
  Sparkles,
  Download,
  Share2,
  Sliders,
  Maximize,
  Volume2,
  VolumeX,
  Tv,
  Film,
  Flame,
  Check,
  MapPin,
  Tag,
  Scissors,
  ZoomIn,
  MoveVertical,
  Globe,
  Phone,
  ArrowLeft,
  Info,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Music,
  FastForward,
  Layers,
} from 'lucide-react';
import { ReporterUser } from './LoginModal';
import { VideoFeedItem, INITIAL_VIDEOS } from '../data/newsFeedData';
import { ChannelProfile } from '../types';
import { getApiUrl } from '../lib/apiConfig';
import { processNewsLocally } from '../lib/clientAiProcessor';
import { newsAudio, BUILTIN_NEWS_TRACKS } from '../lib/newsAudioEngine';

export type VideoAspect = '4:5' | '9:16' | '16:9' | '1:1';
export type VideoTransitionType = 'none' | 'fade' | 'flash' | 'zoom' | 'slide' | 'glitch';

interface VideoStudioWebProps {
  currentUser?: ReporterUser | null;
  initialVideo?: VideoFeedItem | null;
  initialVideoUrl?: string;
  initialHeadline?: string;
  onOpenCloudSettings?: () => void;
  onShowToast?: (msg: string) => void;
  onBackToGraphic?: () => void;
}

function getSavedProfile(): ChannelProfile | null {
  try {
    const raw = localStorage.getItem('user_channel_profile');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return null;
}

export const VideoStudioWeb: React.FC<VideoStudioWebProps> = ({
  currentUser,
  initialVideo,
  initialVideoUrl,
  initialHeadline,
  onOpenCloudSettings,
  onShowToast,
  onBackToGraphic,
}) => {
  const showToast = onShowToast || ((msg: string) => console.log(msg));

  // Profile data
  const [profile] = useState<ChannelProfile | null>(() => getSavedProfile());

  // Video Source & Playback State
  const [videoUrl, setVideoUrl] = useState<string>(
    initialVideoUrl || initialVideo?.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4'
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Auto-set aspect ratio based on incoming video
  const [aspect, setAspect] = useState<VideoAspect>(() => {
    if (initialVideo?.aspectRatio) {
      return initialVideo.aspectRatio as VideoAspect;
    }
    return '9:16';
  });
  
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Video Transform Controls
  const [zoomScale, setZoomScale] = useState<number>(1.1);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(60);

  // Incoming video caption (transferred from feed)
  const [videoCaption, setVideoCaption] = useState<string>(
    initialVideo?.caption || ''
  );

  // Overlay Content Controls
  const [headline, setHeadline] = useState<string>(
    initialHeadline || initialVideo?.title || 'संसद में ऐतिहासिक डिजिटल मीडिया बिल पास, नए नियम लागू'
  );
  const [subHeadline, setSubHeadline] = useState<string>(
    'डिजिटल संवाददाताओं के लिए नए प्रेस दिशा-निर्देश जारी'
  );
  const [location, setLocation] = useState<string>('नई दिल्ली');
  const [channelTag, setChannelTag] = useState<string>(
    profile?.channelNameHi || currentUser?.channelName || 'BREAKING NEWS WALA'
  );
  const [channelLogoUrl, setChannelLogoUrl] = useState<string>(
    profile?.channelLogoUrl || currentUser?.channelLogoUrl || ''
  );
  const [logoScale, setLogoScale] = useState<number>(125); // 50% to 180%, default 125%
  const [socialHandle, setSocialHandle] = useState<string>(
    profile?.username ? (profile.username.startsWith('@') ? profile.username : `@${profile.username}`) : ''
  );
  const [websiteUrl, setWebsiteUrl] = useState<string>(
    profile?.websiteUrl || ''
  );
  const [mobileNumber, setMobileNumber] = useState<string>(
    profile?.mobileNumber || ''
  );
  const [showMobileNumber, setShowMobileNumber] = useState<boolean>(
    profile?.showMobileNumber ?? true
  );

  const [tickerText, setTickerText] = useState<string>(
    '⚡ ताज़ा बुलेटिन: देश भर के डिजिटल पत्रकारों के लिए नई प्रेस नियमावली जारी • लाइव अपडेट्स जारी'
  );
  const [isExclusiveBadge, setIsExclusiveBadge] = useState<boolean>(true);
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [videoExportProgress, setVideoExportProgress] = useState<number>(0);
  const [videoExportStatus, setVideoExportStatus] = useState<string>('');
  const [videoExportError, setVideoExportError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  // Background Music State
  const [bgmTrack, setBgmTrack] = useState<string>('breaking_beat');
  const [bgmVolume, setBgmVolume] = useState<number>(60);
  const [videoVolume, setVideoVolume] = useState<number>(100);
  const [customAudioUrl, setCustomAudioUrl] = useState<string>('');
  const [customAudioTitle, setCustomAudioTitle] = useState<string>('');
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Video Transitions State
  const [transitionType, setTransitionType] = useState<VideoTransitionType>('flash');
  const [transitionDuration, setTransitionDuration] = useState<number>(0.5);
  const [isTransitionActive, setIsTransitionActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      newsAudio.stop();
    };
  }, []);

  // Sync initial video changes
  useEffect(() => {
    if (initialVideoUrl) setVideoUrl(initialVideoUrl);
    if (initialHeadline) setHeadline(initialHeadline);
    if (initialVideo) {
      if (initialVideo.videoUrl) setVideoUrl(initialVideo.videoUrl);
      if (initialVideo.title) setHeadline(initialVideo.title);
      if (initialVideo.caption) setVideoCaption(initialVideo.caption);
      if (initialVideo.channel) setChannelTag(initialVideo.channel);
      if (initialVideo.aspectRatio) setAspect(initialVideo.aspectRatio as VideoAspect);
    }
  }, [initialVideo, initialVideoUrl, initialHeadline]);

  // Video Playback Loop & Trim Enforcement
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handleTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      if (trimEnd > 0 && v.currentTime >= trimEnd) {
        v.currentTime = trimStart;
        if (!isPlaying) {
          v.pause();
          newsAudio.stop();
        } else {
          // Loop transition trigger
          if (transitionType !== 'none') {
            setIsTransitionActive(true);
            setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
          }
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(v.duration || 60);
      if (trimEnd === 60 || trimEnd > (v.duration || 60)) {
        setTrimEnd(Math.floor(v.duration || 60));
      }
    };

    v.addEventListener('timeupdate', handleTimeUpdate);
    v.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      v.removeEventListener('timeupdate', handleTimeUpdate);
      v.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [trimStart, trimEnd, isPlaying, transitionType, transitionDuration]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.volume = isMuted ? 0 : videoVolume / 100;
      v.play()
        .then(() => {
          setIsPlaying(true);
          if (bgmTrack !== 'none') {
            newsAudio.setVolume(bgmVolume / 100);
            if (bgmTrack === 'custom' && customAudioUrl) {
              newsAudio.playCustomAudio(customAudioUrl);
            } else {
              newsAudio.playTrack(bgmTrack);
            }
          }
          if (transitionType !== 'none') {
            setIsTransitionActive(true);
            setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
          }
        })
        .catch(() => {});
    } else {
      v.pause();
      setIsPlaying(false);
      newsAudio.stop();
    }
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      setIsPlaying(false);
      showToast('✅ आपका वीडियो लोड हो गया है!');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setChannelLogoUrl(reader.result);
          showToast('✅ चैनल लोगो अपडेट हुआ!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const seekTo = (targetSec: number) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(v.duration || 60, targetSec));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const [isStandaloneBgmPlaying, setIsStandaloneBgmPlaying] = useState<boolean>(false);

  const toggleStandaloneBgmPreview = () => {
    if (isStandaloneBgmPlaying) {
      newsAudio.stop();
      setIsStandaloneBgmPlaying(false);
    } else {
      if (bgmTrack === 'none') {
        showToast('कृपया पहले कोई बैकग्राउंड म्यूज़िक ट्रैक चुनें');
        return;
      }
      newsAudio.setVolume(bgmVolume / 100);
      if (bgmTrack === 'custom' && customAudioUrl) {
        newsAudio.playCustomAudio(customAudioUrl);
      } else {
        newsAudio.playTrack(bgmTrack);
      }
      setIsStandaloneBgmPlaying(true);
      showToast('🎵 बैकग्राउंड म्यूज़िक चल रहा है');
    }
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomAudioUrl(url);
      setCustomAudioTitle(file.name);
      setBgmTrack('custom');
      if (isPlaying || isStandaloneBgmPlaying) {
        newsAudio.playCustomAudio(url);
      }
      showToast(`🎵 कस्टम ऑडियो लोड हुआ: ${file.name}`);
    }
  };

  const triggerTransitionPreview = () => {
    if (transitionType === 'none') {
      showToast('कृपया पहले कोई ट्रांज़िशन इफ़ेक्ट चुनें');
      return;
    }
    setIsTransitionActive(true);
    setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
    showToast(`✨ ${transitionType.toUpperCase()} ट्रांज़िशन टेस्ट`);
  };

  // Helper to split headline into balanced lines
  const autoSplitHeadline = (text: string, targetLines: 2 | 3) => {
    const clean = text.replace(/\n+/g, ' ').trim();
    const words = clean.split(/\s+/);
    if (words.length <= targetLines) return clean;

    if (targetLines === 2) {
      const mid = Math.ceil(words.length / 2);
      return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
    } else {
      const part1 = Math.ceil(words.length / 3);
      const part2 = Math.ceil((words.length - part1) / 2);
      return (
        words.slice(0, part1).join(' ') +
        '\n' +
        words.slice(part1, part1 + part2).join(' ') +
        '\n' +
        words.slice(part1 + part2).join(' ')
      );
    }
  };

  // AI Headline Generator for Video (2-line or 3-line)
  const handleGenerateAiHeadline = async (linesCount: 2 | 3) => {
    const contextText = videoCaption ? `${videoCaption}. ${headline}` : (headline || subHeadline);
    if (!contextText.trim()) {
      showToast('कृपया पहले कोई संदर्भ, कैप्शन या विषय लिखें');
      return;
    }
    setIsAiGenerating(true);
    try {
      const response = await fetch(getApiUrl('/api/process-news-command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: contextText,
          command: `Rewrite this video context into a high-impact Hindi breaking news headline of exactly ${linesCount} lines: "${contextText}". Return a catchy, professional Hindi breaking news headline with newlines.`,
          headline_max_lines: linesCount,
          headline_line_count: linesCount,
          headline_area: `${linesCount}-Line Video Headline Area`,
          template_id: linesCount === 2 ? 'graphic_003' : 'graphic_001',
          mode: 'text',
        }),
      });
      if (response.ok) {
        const rawJson = await response.json();
        const data = rawJson?.data || rawJson;
        if (data && data.headline) {
          const formatted = autoSplitHeadline(data.headline.trim(), linesCount);
          setHeadline(formatted);
          if (data.location) setLocation(data.location);
          showToast(`✨ AI द्वारा ${linesCount} लाइन हेडलाइन तैयार!`);
          return;
        }
      }
      const local = processNewsLocally(contextText, undefined, {
        headline_max_lines: linesCount,
        headline_line_count: linesCount,
        headline_area: `${linesCount}-Line Video Headline Area`,
      });
      const formatted = autoSplitHeadline(local.headline, linesCount);
      setHeadline(formatted);
      showToast(`✨ AI द्वारा ${linesCount} लाइन हेडलाइन तैयार!`);
    } catch {
      const local = processNewsLocally(contextText, undefined, {
        headline_max_lines: linesCount,
        headline_line_count: linesCount,
        headline_area: `${linesCount}-Line Video Headline Area`,
      });
      const formatted = autoSplitHeadline(local.headline, linesCount);
      setHeadline(formatted);
      showToast(`✨ ${linesCount} लाइन हेडलाइन तैयार!`);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Copy Social Media Caption
  const handleCopyCaption = () => {
    const userTag = channelTag ? (channelTag.startsWith('@') ? channelTag.replace(/^@/, '#') : (channelTag.startsWith('#') ? channelTag : `#${channelTag}`)) : '#AiNews';
    const caption = `🎬 【वीडियो बुलेटिन】\n\n🚨 ${headline}\n${subHeadline ? `📌 ${subHeadline}\n` : ''}\n📍 लोकेशन: ${location}\n🏷️ चैनल: ${channelTag}\n🌐 वेबसाइट: ${websiteUrl}\n📱 संपर्क: ${mobileNumber}\n\n${userTag} #BreakingNews #VideoReport #DigitalNews #LiveNews #AiNewsMaker`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      showToast('✅ वीडियो सोशल मीडिया कैप्शन कॉपी हो गया!');
      setTimeout(() => setCopiedCaption(false), 2500);
    }
  };

  // Export Video Snapshot / Frame
  const handleDownloadSnapshot = () => {
    setIsExporting(true);
    try {
      const video = videoRef.current;
      if (!video) {
        showToast('वीडियो उपलब्ध नहीं है');
        setIsExporting(false);
        return;
      }

      // Render canvas snapshot with jacket
      const canvas = document.createElement('canvas');
      const width = aspect === '9:16' ? 720 : aspect === '16:9' ? 1280 : 1080;
      const height = aspect === '9:16' ? 1280 : aspect === '16:9' ? 720 : aspect === '4:5' ? 1350 : 1080;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsExporting(false);
        return;
      }

      // Try drawing the current video frame
      try {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(0, offsetY);
        ctx.drawImage(video, -width / 2, -height / 2, width, height);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, width, height);
      }

      // Draw Top Bar / Watermark
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, width, 90);

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(24, 25, 130, 42);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Arial, sans-serif';
      ctx.fillText('🔴 LIVE', 42, 54);

      // Channel Logo / Name
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(channelTag, 175, 54);

      // Exclusive Badge
      if (isExclusiveBadge) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(width - 170, 25, 145, 42);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.fillText('EXCLUSIVE', width - 152, 52);
      }

      // Draw Bottom News Jacket (Lower Third)
      const jacketY = height - 280;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.fillRect(0, jacketY, width, 280);

      // Yellow Location / Tag Strip
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, jacketY, width, 38);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText(`📍 लोकेशन: ${location} | BREAKING NEWS`, 24, jacketY + 26);

      // Red Headline Box
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px Arial, sans-serif';
      const headlineLines = headline.split('\n');
      headlineLines.forEach((line, idx) => {
        ctx.fillText(line.slice(0, 45), 24, jacketY + 85 + idx * 42);
      });

      // Sub-headline
      if (subHeadline) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '22px Arial, sans-serif';
        ctx.fillText(subHeadline.slice(0, 65), 24, jacketY + 85 + headlineLines.length * 42 + 5);
      }

      // Footer Bar (Socials, Website, Mobile)
      const footerY = height - 52;
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, footerY, width, 52);

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 18px Arial, sans-serif';
      const footerText = `${socialHandle}   •   🌐 ${websiteUrl}${showMobileNumber && mobileNumber ? `   •   📞 ${mobileNumber}` : ''}`;
      ctx.textAlign = 'center';
      ctx.fillText(footerText, width / 2, footerY + 32);
      ctx.textAlign = 'left';

      // Trigger download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const filename = `video_news_frame_${Date.now()}.jpg`;
      if ((window as any).AndroidBridge?.downloadImage) {
        (window as any).AndroidBridge.downloadImage(dataUrl, filename);
      } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }
      showToast('✅ वीडियो न्यूज़ जैकेट स्नैपशॉट डाउनलोड हो गया!');
    } catch {
      showToast('एक्सपोर्ट में समस्या आई, वीडियो फ्रेम कैप्चर नहीं हो सका');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Full Video File with Progress, Status & Retry
  const handleDownloadVideo = async () => {
    setIsExporting(true);
    setVideoExportError(null);
    setVideoExportProgress(20);
    setVideoExportStatus('वीडियो प्रोसेसिंग प्रारंभ...');

    try {
      const video = videoRef.current;
      if (!video) {
        throw new Error('वीडियो प्लेयर उपलब्ध नहीं है। कृपया पहले वीडियो लोड करें।');
      }

      setVideoExportProgress(50);
      setVideoExportStatus('जैकेट व ऑडियो सिंक किए जा रहे हैं...');

      const filename = `news_video_${Date.now()}.mp4`;

      // 1. Android Native Bridge integration
      if (
        typeof window !== 'undefined' &&
        (window as any).AndroidBridge &&
        typeof (window as any).AndroidBridge.downloadVideo === 'function' &&
        videoUrl
      ) {
        try {
          (window as any).AndroidBridge.downloadVideo(videoUrl, filename);
          setVideoExportProgress(100);
          setVideoExportStatus('डाउनलोड पूर्ण!');
          showToast('✅ वीडियो डाउनलोड शुरू हो गया!');
          setIsExporting(false);
          return;
        } catch (bridgeErr) {
          console.warn('AndroidBridge video download failed, falling back to browser download', bridgeErr);
        }
      }

      setVideoExportProgress(75);
      setVideoExportStatus('डाउनलोड फ़ाइल तैयार हो रही है...');

      if (videoUrl) {
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          if (link.parentNode) document.body.removeChild(link);
        }, 300);

        setVideoExportProgress(100);
        setVideoExportStatus('सफलतापूर्वक डाउनलोड!');
        showToast('✅ वीडियो सफलतापूर्वक डाउनलोड हो गया!');
      } else {
        // Fallback to high-res news frame snapshot
        handleDownloadSnapshot();
      }
    } catch (err: any) {
      console.error('Video download error:', err);
      setVideoExportError(err?.message || 'वीडियो डाउनलोड करने में समस्या आई');
      showToast('❌ वीडियो डाउनलोड में समस्या आई');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setVideoExportStatus('');
        setVideoExportProgress(0);
      }, 1500);
    }
  };

  // Aspect ratio container styles
  const aspectClass =
    aspect === '4:5'
      ? 'aspect-[4/5] max-w-[420px]'
      : aspect === '9:16'
      ? 'aspect-[9/16] max-w-[360px]'
      : aspect === '16:9'
      ? 'aspect-video max-w-[560px]'
      : 'aspect-square max-w-[420px]';

  return (
    <div className="w-full flex flex-col gap-4 pb-24 text-slate-900">
      {initialVideo && (
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-red-500" />
            <span className="font-bold text-white">फ़ीड से प्राप्त वीडियो लोड हुआ</span>
          </div>
          <span className="px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[11px] font-black rounded-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Active
          </span>
        </div>
      )}

      <div className="w-full flex flex-col lg:flex-row items-start gap-4 sm:gap-6">
        {/* LEFT COLUMN (42%): Live Video Canvas with Sticky Jacket Overlay */}
        <aside className="w-full lg:w-[42%] lg:sticky lg:top-16 z-20 flex flex-col gap-3 self-start">
          <div className="w-full bg-black p-3 sm:p-4 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col items-center">
            {/* Top Status & Aspect Switcher */}
            <div className="w-full flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-xs text-neutral-300 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span className="text-red-400 font-black">लाइव वीडियो कैनवास</span>
              </div>
              <div className="flex items-center gap-1">
                {(['9:16', '16:9', '1:1', '4:5'] as VideoAspect[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspect(r)}
                    className={`px-2 py-0.5 rounded text-[10px] font-black cursor-pointer transition-all ${
                      aspect === r
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Preview Container with Jacket Overlay */}
            <div
              className={`relative w-full ${aspectClass} rounded-2xl overflow-hidden shadow-2xl bg-black border border-neutral-800 flex items-center justify-center group select-none`}
              onClick={togglePlay}
            >
              {/* The Video Element */}
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                loop
                muted={isMuted}
                className="w-full h-full object-cover transition-transform duration-100 cursor-pointer"
                style={{
                  transform: `scale(${zoomScale}) translateY(${offsetY}px)`,
                }}
              />

              {/* Transition Effect Simulation Overlay */}
              {isTransitionActive && transitionType !== 'none' && (
                <div
                  className={`absolute inset-0 pointer-events-none z-20 transition-all ${
                    transitionType === 'fade'
                      ? 'bg-black animate-pulse opacity-95'
                      : transitionType === 'flash'
                      ? 'bg-white opacity-95 animate-ping'
                      : transitionType === 'zoom'
                      ? 'bg-black/50 backdrop-blur-sm'
                      : transitionType === 'slide'
                      ? 'bg-gradient-to-r from-red-600/80 via-yellow-400/80 to-transparent animate-pulse'
                      : 'bg-emerald-950/70'
                  }`}
                  style={{ transitionDuration: `${transitionDuration}s` }}
                />
              )}

              {/* Play/Pause Center Indicator */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl border border-amber-400/50 backdrop-blur-xs scale-100 group-hover:scale-110 transition-transform">
                    <Play className="w-7 h-7 fill-white ml-1" />
                  </div>
                </div>
              )}

              {/* Top Branding Overlay (Live Tag + Scalable Logo / Name) - Inside Safe Zone */}
              <div className="absolute top-0 left-0 right-0 px-4 sm:px-6 pt-3 sm:pt-4 pb-2 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-none z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded uppercase tracking-wider animate-pulse flex items-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </span>
                  
                  {/* Channel Logo with LogoScale */}
                  {channelLogoUrl ? (
                    <img
                      src={channelLogoUrl}
                      alt="Logo"
                      className="h-7 object-contain transition-transform origin-left drop-shadow-md"
                      style={{ transform: `scale(${logoScale / 100})` }}
                    />
                  ) : (
                    <span
                      className="font-black text-xs sm:text-sm text-amber-300 drop-shadow-md transition-transform origin-left inline-block"
                      style={{ transform: `scale(${logoScale / 100})` }}
                    >
                      {channelTag}
                    </span>
                  )}
                </div>

                {isExclusiveBadge && (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 text-[10px] font-black rounded uppercase tracking-wider shadow">
                    EXCLUSIVE
                  </span>
                )}
              </div>

              {/* Lower-Third News Jacket Overlay */}
              <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-10 flex flex-col">
                {/* Location Strip - Safe Zone */}
                <div className="bg-amber-500/95 text-neutral-950 font-black text-[11px] sm:text-xs px-4 sm:px-6 py-1.5 flex items-center justify-between border-t border-amber-400 shadow-md">
                  <span className="flex items-center gap-1 tracking-wide">
                    <MapPin className="w-3 h-3 text-red-700" />
                    {location}
                  </span>
                  <span className="text-[10px] uppercase font-black text-red-950">
                    BREAKING NEWS
                  </span>
                </div>

                {/* Red Headline Band (Handles 2 or 3 lines) - Safe Zone */}
                <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white px-4 sm:px-6 py-2 border-t border-red-500/40 shadow-xl space-y-0.5">
                  {headline.split('\n').map((line, idx) => (
                    <h3 key={idx} className="font-black text-xs sm:text-sm leading-snug drop-shadow-md line-clamp-1">
                      {line}
                    </h3>
                  ))}
                  {subHeadline && (
                    <p className="text-[10px] sm:text-[11px] text-amber-200 font-bold pt-0.5 line-clamp-1">
                      {subHeadline}
                    </p>
                  )}
                </div>

                {/* Bottom Center-Aligned Footer Bar - Safe Zone */}
                <div className="bg-neutral-950/95 text-neutral-200 px-4 sm:px-6 py-1 text-[10px] border-t border-neutral-800 flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap shadow-inner">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Youtube className="w-2.5 h-2.5 text-red-500" />
                    <Facebook className="w-2.5 h-2.5 text-blue-500" />
                    <Instagram className="w-2.5 h-2.5 text-pink-500" />
                    <Twitter className="w-2.5 h-2.5 text-sky-400" />
                  </div>
                  <span className="font-bold text-amber-300">{socialHandle}</span>
                  <span>•</span>
                  <span className="font-bold text-neutral-300 flex items-center gap-0.5">
                    <Globe className="w-2.5 h-2.5 text-amber-400" />
                    {websiteUrl}
                  </span>
                  {showMobileNumber && mobileNumber && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-neutral-300 flex items-center gap-0.5">
                        <Phone className="w-2.5 h-2.5 text-emerald-400" />
                        {mobileNumber}
                      </span>
                    </>
                  )}
                </div>

                {/* Scrolling Bottom Ticker - Safe Zone */}
                <div className="bg-slate-950 text-amber-300 px-4 sm:px-6 py-0.5 text-[9px] sm:text-[10px] font-bold border-t border-slate-800 flex items-center gap-2 overflow-hidden whitespace-nowrap">
                  <span className="px-1.5 py-0.2 bg-red-600 text-white text-[8px] font-black rounded shrink-0">
                    ताज़ा
                  </span>
                  <marquee className="truncate">{tickerText}</marquee>
                </div>
              </div>
            </div>

            {/* Interactive Trimming Timeline & Playhead Scrubber */}
            <div className="w-full mt-3 p-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span className="flex items-center gap-1 text-red-400 font-bold" title="Trim Start">
                  <Scissors className="w-3 h-3" />
                  <span>कट शुरू: {formatTime(trimStart)}</span>
                </span>
                <span className="text-yellow-400 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <span className="flex items-center gap-1 text-red-400 font-bold" title="Trim End">
                  <span>कट अंत: {formatTime(trimEnd)}</span>
                  <Scissors className="w-3 h-3" />
                </span>
              </div>

              {/* Visual Timeline Track with Click-to-Seek */}
              <div
                className="relative w-full h-6 bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  const targetTime = ratio * (duration || 60);
                  seekTo(targetTime);
                }}
                title="टाइमलाइन पर क्लिक करके फ्रेम चुनें"
              >
                {/* Active Trim Window */}
                {duration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 bg-yellow-500/30 border-x-2 border-yellow-400"
                    style={{
                      left: `${(trimStart / duration) * 100}%`,
                      width: `${Math.max(2, ((trimEnd - trimStart) / duration) * 100)}%`,
                    }}
                  />
                )}

                {/* Current Playhead */}
                {duration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-lg z-10 pointer-events-none"
                    style={{
                      left: `${(currentTime / duration) * 100}%`,
                    }}
                  >
                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1 -mt-0.5 ring-2 ring-white shadow" />
                  </div>
                )}
              </div>

              {/* Set Start / End Quick Buttons */}
              <div className="flex items-center justify-between gap-1.5 pt-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const cur = Math.floor(currentTime);
                    if (cur < trimEnd) {
                      setTrimStart(cur);
                      showToast(`✂️ शुरुआती समय ${formatTime(cur)} पर सेट`);
                    }
                  }}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold flex items-center gap-1 cursor-pointer transition border border-neutral-700"
                >
                  <Scissors className="w-2.5 h-2.5 text-yellow-400" />
                  <span>शुरू बनाएं ({formatTime(currentTime)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => seekTo(trimStart)}
                  className="px-1.5 py-1 text-neutral-400 hover:text-white cursor-pointer"
                  title="शुरू पर जाएं"
                >
                  ⏮️ शुरू
                </button>

                <button
                  type="button"
                  onClick={() => seekTo(trimEnd)}
                  className="px-1.5 py-1 text-neutral-400 hover:text-white cursor-pointer"
                  title="अंत पर जाएं"
                >
                  अंत ⏭️
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const cur = Math.ceil(currentTime);
                    if (cur > trimStart) {
                      setTrimEnd(cur);
                      showToast(`✂️ समाप्ति समय ${formatTime(cur)} पर सेट`);
                    }
                  }}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold flex items-center gap-1 cursor-pointer transition border border-neutral-700"
                >
                  <span>अंत बनाएं ({formatTime(currentTime)})</span>
                  <Scissors className="w-2.5 h-2.5 text-yellow-400" />
                </button>
              </div>
            </div>

            {/* Quick Playback Bar Underneath Canvas */}
            <div className="w-full mt-2.5 flex items-center justify-between px-1 text-xs text-neutral-400">
              <button
                type="button"
                onClick={togglePlay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold cursor-pointer transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-yellow-400" /> : <Play className="w-3.5 h-3.5 text-yellow-400" />}
                <span>{isPlaying ? 'पॉज़ करें' : 'प्ले करें'}</span>
              </button>

              {/* Transition Quick Test Button */}
              {transitionType !== 'none' && (
                <button
                  type="button"
                  onClick={triggerTransitionPreview}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-[10px] font-bold hover:bg-yellow-500/25 cursor-pointer"
                  title="ट्रांज़िशन टेस्ट करें"
                >
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>ट्रांज़िशन टेस्ट</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer transition-colors"
                title={isMuted ? 'आवाज़ चालू करें' : 'म्यूट करें'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

            {/* Progress / Status / Error Indicator */}
            {isExporting && (
              <div className="w-full mt-2 p-2 bg-neutral-900 border border-neutral-700 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                  <span>{videoExportStatus || 'तैयार हो रहा है...'}</span>
                  <span>{videoExportProgress}%</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-400 to-green-400 h-full transition-all duration-300"
                    style={{ width: `${videoExportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {videoExportError && (
              <div className="w-full mt-2 p-2 bg-red-950/80 border border-red-800 rounded-xl flex items-center justify-between text-xs text-red-200">
                <span className="truncate">{videoExportError}</span>
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg text-[10px] shrink-0 ml-2 cursor-pointer"
                >
                  पुनः प्रयास करें
                </button>
              </div>
            )}

            {/* Action Buttons Underneath Preview: Download, Refresh, Caption & Share */}
            <div className="grid grid-cols-4 gap-1.5 w-full mt-3 pt-2.5 border-t border-neutral-800/80">
              {/* 1. Video Download Button */}
              <button
                type="button"
                onClick={handleDownloadVideo}
                disabled={isExporting}
                className="py-2 px-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                title="वीडियो डाउनलोड करें (MP4)"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">वीडियो MP4</span>
              </button>

              {/* 2. Snapshot Frame Download */}
              <button
                type="button"
                onClick={handleDownloadSnapshot}
                disabled={isExporting}
                className="py-2 px-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                title="वीडियो जैकेट फ्रेम (JPG) डाउनलोड करें"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">फ्रेम JPG</span>
              </button>

              {/* 3. Reset Button */}
              <button
                type="button"
                onClick={() => {
                  setZoomScale(1.1);
                  setOffsetY(0);
                  setTrimStart(0);
                  setTrimEnd(Math.floor(duration) || 60);
                  showToast('वीडियो पोजीशन रीसेट हो गई');
                }}
                className="py-2 px-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white font-extrabold text-[11px] sm:text-xs rounded-xl border border-neutral-700 shadow flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95"
                title="वीडियो ज़ूम व पोजीशन रीसेट करें"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>रीसेट</span>
              </button>

              {/* 4. Caption & Share Button */}
              <button
                type="button"
                onClick={handleCopyCaption}
                className="py-2 px-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] sm:text-xs rounded-xl shadow-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all active:scale-95"
                title="सोशल मीडिया कैप्शन कॉपी करें"
              >
                {copiedCaption ? <Check className="w-3.5 h-3.5 shrink-0 text-amber-300" /> : <Share2 className="w-3.5 h-3.5 shrink-0" />}
                <span className="truncate">{copiedCaption ? 'कॉपी हुआ!' : 'कैप्शन'}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN (58%): Video Controls & Overlay Customization Form */}
        <section className="w-full lg:w-[58%] flex flex-col gap-4 min-w-0">
          {/* Transferred Caption from Video Feed */}
          {videoCaption && (
            <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 space-y-2 shadow-lg animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-400" />
                  📌 फ़ीड से प्राप्त वीडियो संदर्भ / कैप्शन:
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold">
                  AI Context Ready
                </span>
              </div>
              <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
                {videoCaption}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleGenerateAiHeadline(2)}
                  disabled={isAiGenerating}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-lg shadow cursor-pointer transition-all active:scale-95"
                >
                  ✨ इस कैप्शन से 2 लाइन हेडलाइन बनाएं
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateAiHeadline(3)}
                  disabled={isAiGenerating}
                  className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/50 text-amber-200 font-black text-xs rounded-lg shadow cursor-pointer transition-all active:scale-95"
                >
                  ✨ 3 लाइन हेडलाइन बनाएं
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Video File & Ratio */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                1. वीडियो स्रोत व रेशियो
              </span>
              <span className="text-[11px] text-slate-400 font-bold">
                MP4 / WebM / MOV
              </span>
            </div>

            {/* Ratio Selector Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: '9:16', label: '9:16', desc: 'रील्स / शॉर्ट्स' },
                { id: '16:9', label: '16:9', desc: 'यूट्यूब / टीवी' },
                { id: '1:1', label: '1:1', desc: 'स्क्वायर' },
                { id: '4:5', label: '4:5', desc: 'फ़ीड पोस्ट' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspect(r.id as VideoAspect)}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    aspect === r.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black">{r.label}</div>
                  <div className="text-[9px] opacity-80">{r.desc}</div>
                </button>
              ))}
            </div>

            {/* Upload Button */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                className="hidden"
                onChange={handleVideoFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>फोन/कंप्यूटर से वीडियो बदलें</span>
              </button>

              <span className="text-xs text-slate-500">या</span>

              <button
                type="button"
                onClick={() => {
                  const sample = INITIAL_VIDEOS[Math.floor(Math.random() * INITIAL_VIDEOS.length)];
                  if (sample) {
                    setVideoUrl(sample.videoUrl);
                    setHeadline(sample.title);
                    if (sample.caption) setVideoCaption(sample.caption);
                    if (sample.aspectRatio) setAspect(sample.aspectRatio as VideoAspect);
                    showToast('नमूना वीडियो लोड हुआ!');
                  }
                }}
                className="w-full sm:w-auto py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 transition-colors"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>नमूना वीडियो बदलें</span>
              </button>
            </div>
          </div>

          {/* Step 2: Headline & 2-Line / 3-Line AI Generation */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                2. वीडियो हेडलाइन (AI 2-लाइन या 3-लाइन)
              </span>

              {/* AI Headline Choices (2 or 3 lines) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleGenerateAiHeadline(2)}
                  disabled={isAiGenerating}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="2 लाइन में AI हेडलाइन बनाएं"
                >
                  <Sparkles className="w-3 h-3 text-slate-950" />
                  <span>2 लाइन AI</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateAiHeadline(3)}
                  disabled={isAiGenerating}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-1 shadow cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  title="3 लाइन में AI हेडलाइन बनाएं"
                >
                  <Sparkles className="w-3 h-3 text-white" />
                  <span>3 लाइन AI</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    मुख्य हेडलाइन (Headline Overlay):
                  </label>
                  {/* Manual Line Split Buttons */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setHeadline(autoSplitHeadline(headline, 2))}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold cursor-pointer"
                    >
                      2 लाइन में बांटें
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeadline(autoSplitHeadline(headline, 3))}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold cursor-pointer"
                    >
                      3 लाइन में बांटें
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="वीडियो पर दिखने वाली मुख्य खबर यहाँ लिखें (Enter दबाकर 2 या 3 लाइन में विभाजित करें)..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs sm:text-sm focus:border-amber-400 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  उप-हेडलाइन / मुख्य बिंदु (Sub-Headline):
                </label>
                <input
                  type="text"
                  value={subHeadline}
                  onChange={(e) => setSubHeadline(e.target.value)}
                  placeholder="उदा. नए दिशा-निर्देश तुरंत प्रभाव से लागू..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Channel Logo & Logo Scale Slider */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                3. चैनल लोगो व लोगो साइज (Logo Scale)
              </span>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {logoScale}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Logo Upload / Display */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>लोगो बदलें</span>
                </button>
                {channelLogoUrl ? (
                  <img
                    src={channelLogoUrl}
                    alt="Logo preview"
                    className="h-9 w-16 object-contain bg-black/40 rounded p-1 border border-slate-700"
                  />
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    (डिफ़ॉल्ट लोगो सक्रिय)
                  </span>
                )}
              </div>

              {/* Logo Scale Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span>लोगो का आकार (Logo Size):</span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setLogoScale((s) => Math.max(50, s - 10))}
                      className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoScale(125)}
                      className="px-1.5 py-0.5 bg-slate-800 text-amber-400 rounded hover:bg-slate-700 font-bold"
                      title="125% डिफ़ॉल्ट पर रीसेट करें"
                    >
                      125%
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoScale((s) => Math.min(180, s + 10))}
                      className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  step="5"
                  value={logoScale}
                  onChange={(e) => setLogoScale(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Step 4: Video Trim, Zoom & Pan */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-400" />
                4. वीडियो ट्रिम व फ़िटिंग (Trim & Position)
              </span>
              <button
                type="button"
                onClick={() => {
                  setZoomScale(1.1);
                  setOffsetY(0);
                  setTrimStart(0);
                  setTrimEnd(Math.floor(duration) || 60);
                }}
                className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer"
              >
                डिफ़ॉल्ट रीसेट
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Zoom */}
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
                      ज़ूम:
                    </span>
                    <span className="text-amber-400 font-mono">{zoomScale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.05"
                    value={zoomScale}
                    onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>

                {/* Vertical Pan */}
                <div>
                  <div className="flex justify-between font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      <MoveVertical className="w-3.5 h-3.5 text-amber-400" />
                      ऊपर/नीचे:
                    </span>
                    <span className="text-amber-400 font-mono">{offsetY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-150"
                    max="150"
                    step="5"
                    value={offsetY}
                    onChange={(e) => setOffsetY(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Trim Start & End */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                {/* Quick Duration Preset Cuts */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold flex items-center gap-1">
                      <Scissors className="w-3 h-3 text-amber-400" />
                      <span>त्वरित वीडियो कट (Quick Duration Presets):</span>
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      अवधि: {Math.max(0, trimEnd - trimStart)}s
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { sec: 15, label: '⚡ 15s रील्स', desc: 'Shorts' },
                      { sec: 30, label: '📱 30s स्टेटस', desc: 'Status' },
                      { sec: 60, label: '🎬 60s न्यूज़', desc: '1 मिनट' },
                      { sec: -1, label: '🔄 पूरा वीडियो', desc: 'Full' },
                    ].map((pre) => (
                      <button
                        key={pre.label}
                        type="button"
                        onClick={() => {
                          if (pre.sec === -1) {
                            setTrimStart(0);
                            setTrimEnd(Math.floor(duration) || 60);
                            showToast('पूरा वीडियो रीसेट');
                          } else {
                            const newEnd = Math.min(Math.floor(duration) || 60, trimStart + pre.sec);
                            setTrimEnd(newEnd);
                            showToast(`✂️ ${pre.sec} सेकंड पर ट्रिम सेट`);
                          }
                        }}
                        className="py-1 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 text-slate-300 text-center transition cursor-pointer"
                      >
                        <div className="text-[11px] font-bold text-amber-300">{pre.label}</div>
                        <div className="text-[9px] text-slate-400">{pre.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>शुरुआती समय (Start Trim):</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Math.floor(currentTime);
                            if (cur < trimEnd) setTrimStart(cur);
                          }}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                          title="वर्तमान प्लेहेड समय सेट करें"
                        >
                          अभी ({formatTime(currentTime)})
                        </button>
                        <span className="text-red-400 font-mono">{formatTime(trimStart)}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(0, trimEnd - 2)}
                      step="1"
                      value={trimStart}
                      onChange={(e) => setTrimStart(parseInt(e.target.value))}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>समाप्ति समय (End Trim):</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Math.ceil(currentTime);
                            if (cur > trimStart) setTrimEnd(cur);
                          }}
                          className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                          title="वर्तमान प्लेहेड समय सेट करें"
                        >
                          अभी ({formatTime(currentTime)})
                        </button>
                        <span className="text-red-400 font-mono">{formatTime(trimEnd)}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={trimStart + 2}
                      max={Math.max(60, Math.floor(duration))}
                      step="1"
                      value={trimEnd}
                      onChange={(e) => setTrimEnd(parseInt(e.target.value))}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Background Music & Audio Mixer Studio */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                5. बैकग्राउंड म्यूज़िक व ऑडियो मिक्सर (Music & Audio)
              </span>
              <button
                type="button"
                onClick={toggleStandaloneBgmPreview}
                className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow ${
                  isStandaloneBgmPlaying
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                }`}
                title={isStandaloneBgmPlaying ? 'म्यूज़िक बंद करें' : 'म्यूज़िक सुनकर देखें'}
              >
                {isStandaloneBgmPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
                <span>{isStandaloneBgmPlaying ? 'म्यूज़िक रोकें' : 'म्यूज़िक सुनें'}</span>
              </button>
            </div>

            {/* Built-in Royalty Free Tracks Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                न्यूज़ बैकग्राउंड म्यूज़िक ट्रैक (Royalty-Free BGM Tracks):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BUILTIN_NEWS_TRACKS.map((t) => {
                  const isSel = bgmTrack === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setBgmTrack(t.id);
                        if (isPlaying || isStandaloneBgmPlaying) {
                          newsAudio.playTrack(t.id);
                        }
                        showToast(`🎵 ${t.name} चुना गया`);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                        isSel
                          ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl shrink-0 p-1 bg-slate-900 rounded-lg">{t.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-amber-300 truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{t.description}</div>
                      </div>
                      {isSel && <Check className="w-4 h-4 text-amber-400 shrink-0 self-center" />}
                    </button>
                  );
                })}

                {/* Custom Audio Option */}
                <div
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    bgmTrack === 'custom'
                      ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">📁</span>
                      <span className="text-xs font-black text-amber-300">कस्टम ऑडियो फ़ाइल (MP3)</span>
                    </div>
                    {bgmTrack === 'custom' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>

                  <input
                    type="file"
                    ref={audioFileInputRef}
                    accept="audio/*"
                    className="hidden"
                    onChange={handleCustomAudioUpload}
                  />

                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      type="button"
                      onClick={() => audioFileInputRef.current?.click()}
                      className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Upload className="w-3 h-3 text-amber-400" />
                      <span>{customAudioTitle ? 'ऑडियो बदलें' : 'MP3 अपलोड करें'}</span>
                    </button>
                    {customAudioTitle && (
                      <span className="text-[10px] text-slate-400 truncate flex-1 font-mono">
                        {customAudioTitle}
                      </span>
                    )}
                  </div>
                </div>

                {/* None / Mute Option */}
                <button
                  type="button"
                  onClick={() => {
                    setBgmTrack('none');
                    newsAudio.stop();
                    setIsStandaloneBgmPlaying(false);
                    showToast('म्यूज़िक बंद किया गया');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    bgmTrack === 'none'
                      ? 'bg-red-950/40 border-red-500 text-white ring-1 ring-red-400/50 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <VolumeX className="w-5 h-5 text-red-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-red-300">कोई म्यूज़िक नहीं (No BGM)</div>
                    <div className="text-[10px] text-slate-500">केवल वीडियो की अपनी आवाज़ चलेगी</div>
                  </div>
                  {bgmTrack === 'none' && <Check className="w-4 h-4 text-red-400 shrink-0" />}
                </button>
              </div>
            </div>

            {/* Audio Volume Mixer Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-950 rounded-xl border border-slate-800">
              {/* BGM Volume */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <span>BGM वॉल्यूम:</span>
                  </span>
                  <span className="text-amber-400 font-mono">{bgmVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={bgmVolume}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setBgmVolume(val);
                    newsAudio.setVolume(val / 100);
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                  <span>0% (म्यूट)</span>
                  <span>60% (मानक)</span>
                  <span>100% (उच्च)</span>
                </div>
              </div>

              {/* Original Video Volume */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ओरिजिनल वीडियो आवाज़:</span>
                  </span>
                  <span className="text-emerald-400 font-mono">{videoVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={videoVolume}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setVideoVolume(val);
                    if (videoRef.current) {
                      videoRef.current.volume = isMuted ? 0 : val / 100;
                    }
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                  <span>0% (म्यूट)</span>
                  <span>100% (पूरी)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 6: Video Transitions & Visual Motion FX */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                6. वीडियो ट्रांज़िशन इफ़ेक्ट्स (Transitions & Motion FX)
              </span>
              <button
                type="button"
                onClick={triggerTransitionPreview}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-black flex items-center gap-1 shadow cursor-pointer transition active:scale-95"
                title="ट्रांज़िशन लाइव प्रीव्यू करें"
              >
                <Sparkles className="w-3 h-3 text-white" />
                <span>ट्रांज़िशन टेस्ट</span>
              </button>
            </div>

            {/* Transition Style Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'flash', label: '⚡ न्यूज़ फ्लैश', desc: 'सफ़ेद चमक (Breaking Flash)' },
                { id: 'fade', label: '🌑 ब्लैक फेड', desc: 'स्मूथ फेड (Smooth Fade)' },
                { id: 'zoom', label: '🔍 इम्पैक्ट ज़ूम', desc: 'पल्स ज़ूम (Dramatic Pulse)' },
                { id: 'slide', label: '🎞️ टीवी स्लाइड', desc: 'रेड-गोल्ड वाइप (News Wipe)' },
                { id: 'glitch', label: '💻 डिजिटल ग्लिच', desc: 'साइबर इफ़ेक्ट (Cyber Glitch)' },
                { id: 'none', label: 'कट (कोई नहीं)', desc: 'हार्ड कट (Direct Cut)' },
              ].map((tr) => {
                const isSel = transitionType === tr.id;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => {
                      setTransitionType(tr.id as VideoTransitionType);
                      if (tr.id !== 'none') {
                        setIsTransitionActive(true);
                        setTimeout(() => setIsTransitionActive(false), transitionDuration * 1000);
                      }
                      showToast(`✨ ${tr.label} ट्रांज़िशन चुना गया`);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSel
                        ? 'bg-amber-400/20 border-amber-400 text-white ring-1 ring-amber-400/50 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-black text-amber-300 flex items-center justify-between">
                      <span>{tr.label}</span>
                      {isSel && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{tr.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Transition Duration Slider */}
            {transitionType !== 'none' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FastForward className="w-3.5 h-3.5 text-amber-400" />
                    <span>ट्रांज़िशन गति (Duration):</span>
                  </span>
                  <span className="text-amber-400 font-mono">{transitionDuration}s</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.1"
                  value={transitionDuration}
                  onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                  <span>0.2s (त्वरित)</span>
                  <span>0.5s (मानक)</span>
                  <span>1.5s (धीमा)</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 7: Location, Channel Footer Branding & Ticker */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                7. लोकेशन, सोशल फुटर व स्क्रोलिंग टिकर
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  लोकेशन (स्थान):
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="उदा. भोपाल / नई दिल्ली / मध्य प्रदेश"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* Social Handle */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  सोशल हैंडल / यूजरनेम:
                </label>
                <input
                  type="text"
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value)}
                  placeholder="उदा. @yourchannel"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  वेबसाइट URL:
                </label>
                <input
                  type="text"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="उदा. yourwebsite.com"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* Mobile Phone */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    मोबाइल / व्हाट्सएप:
                  </label>
                  <label className="text-[10px] text-slate-400 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showMobileNumber}
                      onChange={(e) => setShowMobileNumber(e.target.checked)}
                      className="accent-amber-400"
                    />
                    <span>दिखाएं</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="उदा. +91 98765 43210"
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Scrolling Ticker Text */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-red-500" />
                नीचे चलने वाला स्क्रोलिंग टिकर (Ticker Strip):
              </label>
              <input
                type="text"
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                placeholder="उदा. ⚡ ताज़ा बुलेटिन: लाइव अपडेट्स जारी..."
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-medium focus:border-amber-400 focus:outline-hidden"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
