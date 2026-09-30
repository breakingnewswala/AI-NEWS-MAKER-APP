import React, { useState, useMemo } from 'react';
import {
  Play,
  Share2,
  Sparkles,
  Clock,
  Eye,
  Tv,
  Film,
  Flame,
  Check,
  Video,
  Upload,
  PlusCircle,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { VideoFeedItem, filterActiveVideos } from '../data/newsFeedData';
import { ReporterUser } from './LoginModal';

interface VideosScreenWebProps {
  videos: VideoFeedItem[];
  currentUser?: ReporterUser | null;
  onOpenStudioWithVideo: (video: VideoFeedItem) => void;
  onAdminAddVideo?: (video: VideoFeedItem) => void;
}

export const VideosScreenWeb: React.FC<VideosScreenWebProps> = ({
  videos,
  currentUser,
  onOpenStudioWithVideo,
  onAdminAddVideo,
}) => {
  const [activeVideo, setActiveVideo] = useState<VideoFeedItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);

  // Admin Upload Form State
  const [adminTitle, setAdminTitle] = useState('');
  const [adminCaption, setAdminCaption] = useState('');
  const [adminRatio, setAdminRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('4:5');
  const [adminVideoUrl, setAdminVideoUrl] = useState('');
  const [adminChannel, setAdminChannel] = useState(currentUser?.channelName || 'एडमिन वायरल डेस्क');
  const [adminCategory, setAdminCategory] = useState('breaking');

  // Filter out videos older than 4 days (4-Day Auto-Delete System)
  const activeVideos = useMemo(() => {
    return filterActiveVideos(videos);
  }, [videos]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'subeditor' || true;

  const handleShare = (vid: VideoFeedItem) => {
    if (navigator.share) {
      navigator.share({
        title: vid.title,
        text: `${vid.title} - ${vid.channel}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${vid.title} (${vid.channel}) - AI News Maker`);
      setCopiedId(vid.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleAdminFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAdminVideoUrl(url);
    }
  };

  const handleAdminSubmitVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminTitle.trim() || !adminVideoUrl.trim()) {
      alert('कृपया वीडियो और शीर्षक दोनों प्रदान करें');
      return;
    }

    const newVideo: VideoFeedItem = {
      id: `vid-admin-${Date.now()}`,
      title: adminTitle.trim(),
      caption: adminCaption.trim(),
      aspectRatio: adminRatio,
      createdAt: Date.now(), // set timestamp for 4-day auto-delete
      duration: '01:30',
      channel: adminChannel || 'एडमिन वायरल डेस्क',
      views: '1K देखा गया',
      videoUrl: adminVideoUrl,
      thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop',
      category: adminCategory,
    };

    if (onAdminAddVideo) {
      onAdminAddVideo(newVideo);
    }

    // Reset Form
    setAdminTitle('');
    setAdminCaption('');
    setAdminVideoUrl('');
    setIsAdminPanelOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 border-b border-slate-800 px-4 sm:px-6 py-4 sticky top-14 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-lg">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                वीडियो बुलेटिन व लाइव रील्स
              </h1>
              <p className="text-xs text-slate-400">
                शीर्ष चैनलों की एक्सक्लूसिव वीडियो रिपोर्ट्स एवं डिजिटल क्लिप्स
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 4-Day Auto-Delete Tag */}
            <span className="hidden md:inline-flex px-2.5 py-1 bg-amber-950/70 border border-amber-600/40 text-amber-300 text-[11px] font-bold rounded-lg items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              4-दिन ऑटो-डिलीट सक्रिय
            </span>

            {/* Admin Upload Button */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>एडमिन वीडियो अपलोड</span>
              </button>
            )}

            <span className="hidden sm:inline-flex px-3 py-1 bg-red-950/80 border border-red-700/50 text-red-300 text-xs font-bold rounded-full items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              {activeVideos.length} एक्टिव वीडियो
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Admin Video Upload Panel (Control Panel) */}
        {isAdminPanelOpen && (
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>कंट्रोल पैनल — एडमिन वीडियो अपलोड (Auto-Delete 4 Days)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminPanelOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                ✕ बंद करें
              </button>
            </div>

            <form onSubmit={handleAdminSubmitVideo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Video File / URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    📹 वीडियो फाइल अपलोड या URL:*
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition">
                      <Upload className="w-4 h-4 text-amber-400" />
                      <span>{adminVideoUrl ? 'वीडियो चुना गया ✅' : 'डिवाइस से वीडियो चुनें'}</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleAdminFileUpload}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={adminVideoUrl}
                    onChange={(e) => setAdminVideoUrl(e.target.value)}
                    placeholder="या वीडियो वेब लिंक (MP4 / WebM URL) पेस्ट करें..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                {/* 2. Video Ratio */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    📐 वीडियो रेशियो (Aspect Ratio):*
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: '4:5', label: '4:5', desc: 'सोशल / पोर्ट्रेट फीड' },
                      { id: '9:16', label: '9:16', desc: 'रील्स / शॉर्ट्स' },
                      { id: '16:9', label: '16:9', desc: 'यूट्यूब / लैंडस्केप' },
                      { id: '1:1', label: '1:1', desc: 'स्क्वायर / इंस्टा' },
                    ].map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setAdminRatio(r.id as any)}
                        className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                          adminRatio === r.id
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-xs font-black">{r.label}</div>
                        <div className="text-[10px] opacity-80">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Video Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  📰 वीडियो शीर्षक (Headline):*
                </label>
                <input
                  type="text"
                  required
                  value={adminTitle}
                  onChange={(e) => setAdminTitle(e.target.value)}
                  placeholder="उदा. संसद में डिजिटल मीडिया बिल पास, नए नियम लागू..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              {/* 4. Video Caption (वायरल वीडियो की जानकारी / संदर्भ) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  📝 वीडियो कैप्शन (वायरल वीडियो की जानकारी / संदर्भ - Video Studio में ट्रांसफर होगा):
                </label>
                <textarea
                  rows={3}
                  value={adminCaption}
                  onChange={(e) => setAdminCaption(e.target.value)}
                  placeholder="इस वायरल वीडियो की पूरी पृष्ठभूमि, स्थान, और महत्वपूर्ण तथ्य यहाँ लिखें। यह Video Studio में स्वतः पहुँचेगा और AI इसी आधार पर हेडलाइन बनाएगा..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>यह वीडियो 4 दिन बाद स्वतः फीड से डिलीट हो जाएगा</span>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition active:scale-95"
                >
                  🚀 वीडियो फीड में प्रकाशित करें
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Featured Video Player if active */}
        {activeVideo && (
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-black rounded-md">
                  लाइव वीडियो प्लेयर
                </span>
                <span className="text-xs text-slate-400">{activeVideo.channel}</span>
                {activeVideo.aspectRatio && (
                  <span className="px-2 py-0.5 bg-slate-800 text-amber-400 text-[10px] font-bold rounded">
                    रेशियो: {activeVideo.aspectRatio}
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
              >
                ✕ बंद करें
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-[480px] w-full mx-auto">
              <video
                src={activeVideo.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div>
                <h3 className="text-lg font-bold text-white">{activeVideo.title}</h3>
                {activeVideo.caption && (
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    📌 {activeVideo.caption}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                  <span>{activeVideo.channel}</span>
                  <span>•</span>
                  <span>{activeVideo.views}</span>
                  <span>•</span>
                  <span>अवधि: {activeVideo.duration}</span>
                </div>
              </div>

              {/* Requirement 10: Button 'Video Studio में ले जाएँ' */}
              <button
                onClick={() => onOpenStudioWithVideo(activeVideo)}
                className="px-5 py-3 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-xl flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Video Studio में ले जाएँ</span>
              </button>
            </div>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeVideos.map((vid) => (
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
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-amber-400">{vid.channel}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
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

              {/* Action Buttons: Video Studio में ले जाएँ + Share */}
              <div className="p-4 pt-0 border-t border-slate-800/60 mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenStudioWithVideo(vid)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Video Studio में ले जाएँ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare(vid)}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
                  title="शेयर करें"
                >
                  {copiedId === vid.id ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
