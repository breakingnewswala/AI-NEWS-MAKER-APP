import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  Upload,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Volume2,
  ShieldCheck,
  Loader2,
  Tag,
} from 'lucide-react';
import { getApiUrl } from '../lib/apiConfig';

export interface MusicTrackItem {
  id: string;
  name: string;
  category: string;
  url: string;
  duration?: number;
  uploadedAt: number;
  uploadedBy?: string;
  isCopyrightSafe: boolean;
  targetModes?: 'quick' | 'studio' | 'both';
  allowedTiers?: ('basic' | 'advance' | 'pro' | 'vip')[];
}

interface AdminMusicLibraryManagerProps {
  currentUser?: any;
}

export const AdminMusicLibraryManager: React.FC<AdminMusicLibraryManagerProps> = ({ currentUser }) => {
  const [tracks, setTracks] = useState<MusicTrackItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Playback state
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Upload modal / form state
  const [isAddingTrack, setIsAddingTrack] = useState<boolean>(false);
  const [trackName, setTrackName] = useState<string>('');
  const [trackCategory, setTrackCategory] = useState<string>('Breaking');
  const [trackUrl, setTrackUrl] = useState<string>('');
  const [isCopyrightSafe, setIsCopyrightSafe] = useState<boolean>(true);
  const [targetModes, setTargetModes] = useState<'quick' | 'studio' | 'both'>('both');
  const [allowedTiers, setAllowedTiers] = useState<('basic' | 'advance' | 'pro' | 'vip')[]>(['basic', 'advance', 'pro', 'vip']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal / inline permissions state
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTargetModes, setEditTargetModes] = useState<'quick' | 'studio' | 'both'>('both');
  const [editAllowedTiers, setEditAllowedTiers] = useState<('basic' | 'advance' | 'pro' | 'vip')[]>(['basic', 'advance', 'pro', 'vip']);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const fetchTracks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/music-library'), {
        headers: {
          'x-user-email': currentUser?.email || '',
          'x-admin-email': currentUser?.email || '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.tracks)) {
        setTracks(data.tracks);
      } else {
        setError(data.error || 'म्यूज़िक लाइब्रेरी लोड करने में असमर्थ');
      }
    } catch {
      setError('नेटवर्क त्रुटि: म्यूज़िक लाइब्रेरी लोड नहीं हो सकी');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [currentUser?.email]);

  const handlePlayToggle = (track: MusicTrackItem) => {
    if (playingTrackId === track.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingTrackId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(track.url);
      audio.volume = 0.7;
      audio.onended = () => setPlayingTrackId(null);
      audio.onerror = () => {
        setPlayingTrackId(null);
        alert('ऑडियो चलाने में समस्या आई');
      };
      audio.play().then(() => {
        audioPlayerRef.current = audio;
        setPlayingTrackId(track.id);
      }).catch(() => {
        setPlayingTrackId(null);
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('audio') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav')) {
      alert('कृपया केवल MP3 या WAV ऑडियो फाइल चुनें।');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('ऑडियो फाइल 15MB से कम होनी चाहिए।');
      return;
    }

    if (!trackName) {
      setTrackName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTrackUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackName.trim() || !trackUrl.trim()) {
      alert('कृपया ट्रैक का नाम और ऑडियो फाइल दोनों प्रदान करें।');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl('/api/admin/music-library/upload'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || '',
          'x-admin-email': currentUser?.email || '',
        },
        body: JSON.stringify({
          name: trackName.trim(),
          category: trackCategory,
          url: trackUrl.trim(),
          isCopyrightSafe,
          targetModes,
          allowedTiers,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✅ संगीत ट्रैक "${trackName}" सफलतापूर्वक जोड़ा गया!`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setTrackName('');
        setTrackUrl('');
        setTargetModes('both');
        setAllowedTiers(['basic', 'advance', 'pro', 'vip']);
        setIsAddingTrack(false);
        fetchTracks();
      } else {
        alert(data.error || 'ट्रैक जोड़ने में विफल');
      }
    } catch {
      alert('नेटवर्क त्रुटि: ट्रैक अपलोड नहीं हो सका');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePermissions = async (trackId: string) => {
    setIsSavingEdit(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/music-library/${encodeURIComponent(trackId)}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || '',
          'x-admin-email': currentUser?.email || '',
        },
        body: JSON.stringify({
          targetModes: editTargetModes,
          allowedTiers: editAllowedTiers,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('✅ संगीत अनुमतियाँ सफलतापूर्वक अपडेट हो गईं!');
        setTimeout(() => setSuccessMsg(null), 3500);
        setEditingTrackId(null);
        fetchTracks();
      } else {
        alert(data.error || 'अपडेट विफल');
      }
    } catch {
      alert('नेटवर्क त्रुटि: ट्रैक अनुमतियाँ अपडेट नहीं हो सकीं');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTrack = async (trackId: string, name: string) => {
    const confirmDel = window.confirm(`क्या आप संगीत ट्रैक "${name}" को स्थायी रूप से हटाना चाहते हैं?`);
    if (!confirmDel) return;

    if (playingTrackId === trackId && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingTrackId(null);
    }

    try {
      const res = await fetch(getApiUrl(`/api/admin/music-library/${encodeURIComponent(trackId)}`), {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser?.email || '',
          'x-admin-email': currentUser?.email || '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`✅ संगीत ट्रैक "${name}" हटाया गया`);
        setTimeout(() => setSuccessMsg(null), 3000);
        setTracks((prev) => prev.filter((t) => t.id !== trackId));
      } else {
        alert(data.error || 'ट्रैक हटाने में विफल');
      }
    } catch {
      alert('नेटवर्क त्रुटि: ट्रैक नहीं हटाया जा सका');
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-4 rounded-xl border border-amber-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>म्यूजिक लाइब्रेरी डैशबोर्ड</span>
              <span className="px-2 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black rounded-md uppercase">
                कॉपीराइट सेफ
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              वीडियो फीड व स्टूडियो हेतु बैकग्राउंड न्यूज़ म्यूज़िक अपलोड व प्रबंधित करें
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingTrack(!isAddingTrack)}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition hover:opacity-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ नया म्यूज़िक जोड़ें</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-500 text-red-300 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Track Drawer */}
      {isAddingTrack && (
        <form onSubmit={handleAddTrack} className="p-4 bg-slate-900/90 border border-amber-500/40 rounded-xl space-y-3 animate-in fade-in">
          <h5 className="text-xs font-black text-amber-300 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Upload className="w-3.5 h-3.5" />
            <span>नया ऑडियो ट्रैक जोड़ें (MP3 / WAV)</span>
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                ट्रैक का नाम:*
              </label>
              <input
                type="text"
                required
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder="उदा. 🔴 सुपर ब्रेकिंग बीट (Urgent Beat)"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                कैटेगरी:*
              </label>
              <select
                value={trackCategory}
                onChange={(e) => setTrackCategory(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:border-amber-400 focus:outline-hidden cursor-pointer"
              >
                <option value="Breaking">Breaking (ब्रेकिंग बीट)</option>
                <option value="Headlines">Headlines (हेडलाइंस पल्स)</option>
                <option value="Ambient">Ambient (शांत संपादकीय)</option>
                <option value="Tension">Tension (सस्पेंस पड़ताल)</option>
                <option value="Fanfare">Fanfare (विशेष बुलेटिन)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                डिवाइस से MP3/WAV फाइल चुनें:
              </label>
              <input
                type="file"
                ref={fileInputRef}
                accept="audio/mp3,audio/wav,audio/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>{trackUrl.startsWith('data:') ? '✅ ऑडियो फाइल लोड हो चुकी है' : 'फाइल चुनें (Max 15MB)'}</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                या ऑडियो वेब URL (MP3 Link):
              </label>
              <input
                type="text"
                value={trackUrl.startsWith('data:') ? '' : trackUrl}
                onChange={(e) => setTrackUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Target Mode Selector (Section 6.3) */}
          <div className="space-y-1.5 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
            <label className="text-[11px] font-bold text-amber-300 block">
              उपलब्धता मोड (Mode Availability):*
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'both', label: '🌐 दोनों मोड (Both)', desc: 'क्विक व स्टूडियो दोनों में' },
                { id: 'quick', label: '⚡ क्विक वीडियो (Quick)', desc: 'केवल क्विक वीडियो मोड' },
                { id: 'studio', label: '🎬 स्टूडियो मोड (Studio)', desc: 'केवल फुल स्टूडियो मोड' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTargetModes(m.id as any)}
                  className={`p-2 rounded-lg text-left border transition cursor-pointer ${
                    targetModes === m.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[9.5px] opacity-80 truncate">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* User Category Permissions (Section 6.4) */}
          <div className="space-y-1.5 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
            <label className="text-[11px] font-bold text-amber-300 block">
              उपयोगकर्ता श्रेणी अनुमतियाँ (User Categories Allowed):*
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'basic', label: 'Basic (बेसिक)' },
                { id: 'advance', label: 'Advanced (एडवांस)' },
                { id: 'pro', label: 'Pro (प्रो)' },
                { id: 'vip', label: 'VIP-Dash (वीआईपी)' },
              ].map((cat) => {
                const isChecked = allowedTiers.includes(cat.id as any);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition ${
                      isChecked
                        ? 'bg-amber-950/40 border-amber-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAllowedTiers((prev) => [...prev, cat.id as any]);
                        } else {
                          if (allowedTiers.length > 1) {
                            setAllowedTiers((prev) => prev.filter((t) => t !== cat.id));
                          }
                        }
                      }}
                      className="w-3.5 h-3.5 accent-amber-400 rounded"
                    />
                    <span>{cat.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-bold">
              <input
                type="checkbox"
                checked={isCopyrightSafe}
                onChange={(e) => setIsCopyrightSafe(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded"
              />
              <span>यह ऑडियो रॉयल्टी-फ्री और कॉपीराइट-सुरक्षित (Copyright Safe) है</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTrack(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !trackName.trim() || !trackUrl.trim()}
                className="px-4 py-1.5 bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow"
              >
                {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>सहेजें व प्रकाशित करें</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Track List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>संगीत लाइब्रेरी लोड हो रही है...</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
            कोई संगीत ट्रैक उपलब्ध नहीं है। ऊपर दिए गए बटन से नया ट्रैक जोड़ें।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tracks.map((track) => {
              const isPlaying = playingTrackId === track.id;
              const isEditing = editingTrackId === track.id;
              const currentModes = track.targetModes || 'both';
              const currentTiers = track.allowedTiers || ['basic', 'advance', 'pro', 'vip'];

              return (
                <div
                  key={track.id}
                  className={`p-3 rounded-xl border transition flex flex-col gap-2.5 ${
                    isPlaying
                      ? 'bg-amber-950/30 border-amber-500/70 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handlePlayToggle(track)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition cursor-pointer ${
                          isPlaying
                            ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                            : 'bg-slate-800 text-amber-400 hover:bg-slate-750'
                        }`}
                        title={isPlaying ? 'रोकें' : 'सुनें (Play Preview)'}
                      >
                        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>

                      <div className="min-w-0">
                        <h5 className="text-xs font-black text-white truncate">
                          {track.name}
                        </h5>
                        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] flex-wrap">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center gap-0.5">
                            <Tag className="w-2.5 h-2.5 text-amber-400" />
                            {track.category}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 font-bold border border-indigo-700/50">
                            {currentModes === 'quick' ? '⚡ केवल क्विक' : currentModes === 'studio' ? '🎬 केवल स्टूडियो' : '🌐 दोनों मोड'}
                          </span>
                          {track.isCopyrightSafe && (
                            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3" />
                              सेफ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            setEditingTrackId(null);
                          } else {
                            setEditingTrackId(track.id);
                            setEditTargetModes(track.targetModes || 'both');
                            setEditAllowedTiers(track.allowedTiers || ['basic', 'advance', 'pro', 'vip']);
                          }
                        }}
                        className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isEditing ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                        }`}
                        title="अनुमतियाँ बदलें (Change Permissions)"
                      >
                        ⚙️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTrack(track.id, track.name)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition cursor-pointer"
                        title="ट्रैक हटाएं"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Allowed Tiers Badges */}
                  <div className="flex items-center gap-1 flex-wrap text-[10px]">
                    <span className="text-slate-400 font-bold">अनुमत श्रेणियां:</span>
                    {currentTiers.map((t) => (
                      <span key={t} className="px-1.5 py-0.2 bg-slate-800 text-amber-300 font-bold rounded border border-slate-700 uppercase">
                        {t === 'advance' ? 'Adv' : t}
                      </span>
                    ))}
                  </div>

                  {/* Inline Permissions Editor */}
                  {isEditing && (
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-amber-500/40 space-y-2 mt-1 animate-in fade-in">
                      <div className="text-[11px] font-black text-amber-300">
                        अनुमतियाँ संपादित करें (Mode & Tiers):
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'both', label: '🌐 दोनों' },
                          { id: 'quick', label: '⚡ क्विक' },
                          { id: 'studio', label: '🎬 स्टूडियो' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setEditTargetModes(m.id as any)}
                            className={`p-1 text-[10.5px] rounded border font-bold ${
                              editTargetModes === m.id
                                ? 'bg-amber-400 text-slate-950 border-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[10.5px]">
                        {[
                          { id: 'basic', label: 'Basic' },
                          { id: 'advance', label: 'Advanced' },
                          { id: 'pro', label: 'Pro' },
                          { id: 'vip', label: 'VIP-Dash' },
                        ].map((cat) => {
                          const isChk = editAllowedTiers.includes(cat.id as any);
                          return (
                            <label key={cat.id} className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChk}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditAllowedTiers((prev) => [...prev, cat.id as any]);
                                  } else if (editAllowedTiers.length > 1) {
                                    setEditAllowedTiers((prev) => prev.filter((t) => t !== cat.id));
                                  }
                                }}
                                className="w-3 h-3 accent-amber-400"
                              />
                              <span>{cat.label}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingTrackId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-400 text-[10.5px] font-bold rounded"
                        >
                          रद्द करें
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSavePermissions(track.id)}
                          className="px-3 py-1 bg-amber-400 text-slate-950 text-[10.5px] font-black rounded disabled:opacity-50 shadow"
                        >
                          {isSavingEdit ? 'सेविंग...' : 'सेव करें'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
