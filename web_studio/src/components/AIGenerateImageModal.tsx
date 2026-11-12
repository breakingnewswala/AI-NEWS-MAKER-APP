import React, { useState } from 'react';
import { Sparkles, X, Check, AlertCircle, Loader2, Image as ImageIcon, Wand2, RefreshCw, RotateCcw } from 'lucide-react';
import { AspectRatio } from '../types';
import { VoiceInputButton } from './VoiceInputButton';
import { getApiUrl } from '../lib/apiConfig';

interface AIGenerateImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHeadline: string;
  aspectRatio: AspectRatio;
  onApplyImage: (imageUrl: string, promptUsed?: string) => void;
  onAnalyzeOldImage?: (imageFile: File, userContext?: string) => void;
}

const CURATED_QUICK_PHOTOS = [
  { label: '📢 धरना / आंदोलन', url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=85' },
  { label: '🚨 सड़क हादसा', url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format&fit=crop&q=85' },
  { label: '🏛️ राजनीति व प्रेस', url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=85' },
  { label: '⚖️ पुलिस व अदालत', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&auto=format&fit=crop&q=85' },
  { label: '🎓 छात्र व भर्ती परीक्षा', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1200&auto=format&fit=crop&q=85' },
  { label: '🏥 अस्पताल व स्वास्थ्य', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&auto=format&fit=crop&q=85' },
  { label: '🌧️ मौसम व बारिश', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1200&auto=format&fit=crop&q=85' },
];

export const AIGenerateImageModal: React.FC<AIGenerateImageModalProps> = ({
  isOpen,
  onClose,
  currentHeadline,
  aspectRatio,
  onApplyImage,
}) => {
  const [headline, setHeadline] = useState<string>(currentHeadline || '');
  const [customDetail, setCustomDetail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [promptUsed, setPromptUsed] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');

  // Sync when opening
  React.useEffect(() => {
    if (isOpen) {
      if (currentHeadline) {
        setHeadline(currentHeadline);
      }
      fetch(getApiUrl('/api/ai-providers-status'))
        .then((res) => res.json())
        .then((data) => {
          if (data?.openaiAvailable) {
            setAiProvider('openai');
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentHeadline]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!headline.trim() && !customDetail.trim()) {
      setError('कृपया हेडलाइन या फोटो का विवरण दर्ज करें');
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setGeneratedImageUrl(null);
    setFallbackUsed(false);

    try {
      const response = await fetch(getApiUrl('/api/generate-ai-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: headline.trim(),
          customPrompt: customDetail.trim() ? `${headline.trim()} - ${customDetail.trim()}` : undefined,
          aspectRatio: aspectRatio,
          aiProvider: aiProvider,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI फोटो जनरेट करने में त्रुटि हुई');
      }

      setGeneratedImageUrl(data.imageUrl);
      setPromptUsed(data.promptUsed);
      setFallbackUsed(!!data.fallbackUsed);
      setNotice(data.notice || null);
    } catch (err: any) {
      console.error('Error generating image:', err);
      setError(err.message || 'फोटो जनरेट नहीं हो सकी। कृपया दोबारा प्रयास करें या नीचे दिए गए प्रेस फोटो विकल्पों में से चुनें।');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCuratedPhoto = (photoUrl: string, label: string) => {
    const proxied = getApiUrl(`/api/proxy-image?url=${encodeURIComponent(photoUrl)}`);
    setGeneratedImageUrl(proxied);
    setPromptUsed(label);
    setFallbackUsed(true);
    setNotice(`'${label}' श्रेणी की उच्च-रिज़ॉल्यूशन प्रामाणिक प्रेस फोटो चयनित है।`);
    setError(null);
  };

  const handleApply = () => {
    if (generatedImageUrl) {
      onApplyImage(generatedImageUrl, promptUsed || undefined);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-neutral-950 flex items-center justify-center font-black shadow">
              <Wand2 className="w-4 h-4 text-neutral-950" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                हेडलाइन देखकर AI फोटो बनाएं
              </h2>
              <p className="text-xs text-neutral-400">
                AI आपकी हेडलाइन को समझकर सटीक, रियलिस्टिक न्यूज़ बैकग्राउंड फोटो तैयार करेगा
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Current Headline Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <span>समाचार हेडलाइन:</span>
                <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                  कार्ड से स्वतः ली गई
                </span>
              </label>
              <VoiceInputButton
                onTranscript={(transcript) => {
                  setHeadline((prev) => (prev ? `${prev} ${transcript}` : transcript));
                }}
                title="बोलकर हेडलाइन दर्ज करें"
              />
            </div>
            <textarea
              rows={3}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="उदा: रीवा-सीधी हाईवे पर भीषण सड़क हादसा, बस और ट्रक में जोरदार टक्कर"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:border-yellow-400 focus:outline-none font-['Noto_Sans_Devanagari']"
            />
          </div>

          {/* Optional specific scene detail */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                अतिरिक्त संदर्भ / दृश्य संकेत / प्रॉम्प्ट (ऐच्छिक):
              </label>
              <VoiceInputButton
                onTranscript={(transcript) => {
                  setCustomDetail((prev) => (prev ? `${prev} ${transcript}` : transcript));
                }}
                title="बोलकर दृश्य संकेत बताएं"
              />
            </div>
            <input
              type="text"
              value={customDetail}
              onChange={(e) => setCustomDetail(e.target.value)}
              placeholder="उदा: रात का दृश्य, एम्बुलेंस, पुलिस बल, हाईवे सड़क"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-3 text-xs sm:text-sm text-white focus:border-yellow-400 focus:outline-none font-['Noto_Sans_Devanagari']"
            />
          </div>

          {/* AI Engine Selection: Gemini vs ChatGPT DALL-E 3 */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-xs font-bold text-neutral-300">
              इमेज मॉडल चुनें:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAiProvider('gemini')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  aiProvider === 'gemini'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/60 shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                ✨ Gemini Imagen
              </button>
              <button
                type="button"
                onClick={() => setAiProvider('openai')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  aiProvider === 'openai'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/60 shadow-sm'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                🎨 ChatGPT DALL-E 3
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-50 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                <span>{aiProvider === 'openai' ? 'DALL-E 3' : 'Gemini'} द्वारा बैकग्राउंड फोटो तैयार की जा रही है...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-neutral-950" />
                <span>हेडलाइन से AI फोटो बनाएं ({aiProvider === 'openai' ? 'DALL-E 3' : 'Gemini'})</span>
              </>
            )}
          </button>

          {/* Quick Curated Press Photos Options */}
          <div className="space-y-2 pt-1 border-t border-neutral-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                <span>त्वरित प्रामाणिक प्रेस फोटो (1-क्लिक बैकग्राउंड):</span>
              </span>
              <span className="text-[10px] text-neutral-500">100% प्रामाणिक व हाई-रिज़ॉल्यूशन</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CURATED_QUICK_PHOTOS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectCuratedPhoto(item.url, item.label)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/80 text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated or Curated Image Result */}
          {generatedImageUrl && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-yellow-500/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>
                    {fallbackUsed
                      ? 'समाचार से संबंधित प्रामाणिक प्रेस फोटो तैयार है:'
                      : 'AI द्वारा जनरेट की गई फोटो तैयार है:'}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded ${
                    fallbackUsed
                      ? 'bg-amber-400 text-neutral-950'
                      : 'bg-yellow-400 text-neutral-950'
                  }`}
                >
                  {fallbackUsed ? 'PRESS PHOTO' : 'AI GENERATED'}
                </span>
              </div>

              {notice && (
                <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/60 p-2 rounded-lg">
                  ℹ️ {notice}
                </div>
              )}

              <div className="relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 aspect-[4/5] max-h-[380px] flex items-center justify-center">
                <img
                  src={generatedImageUrl}
                  alt="Background"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-neutral-700 cursor-pointer"
                  title="पसंद न आने पर दूसरी फोटो बनाएं"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>🔄 दूसरी फोटो बनाएं</span>
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-[2] py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-neutral-950 text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <Check className="w-4 h-4 text-neutral-950" />
                  <span>कार्ड के बैकग्राउंड में लगाएं</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
