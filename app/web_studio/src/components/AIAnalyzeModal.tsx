import React, { useState } from 'react';
import { Sparkles, X, Upload, Check, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { AIAnalysisResult, NewsCardData } from '../types';

interface AIAnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string;
  onApplyResult: (result: AIAnalysisResult, photoData?: string) => void;
}

export const AIAnalyzeModal: React.FC<AIAnalyzeModalProps> = ({
  isOpen,
  onClose,
  currentImage,
  onApplyResult,
}) => {
  const [selectedImage, setSelectedImage] = useState<string>(currentImage);
  const [userContext, setUserContext] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImage(e.target.result as string);
        setAnalysisResult(null);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('कृपया पहले एक फोटो चुनें या अपलोड करें');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          userContext: userContext.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gemini 3.1 Pro से फोटो का विश्लेषण असफल रहा');
      }

      setAnalysisResult(data.data);
    } catch (err: any) {
      console.error('Image analysis error:', err);
      setError(err.message || 'विश्लेषण के दौरान त्रुटि हुई');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (analysisResult) {
      onApplyResult(analysisResult, selectedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                फोटो एनालिसिस (Gemini 3.1 Pro Preview)
              </h2>
              <p className="text-xs text-neutral-400">
                फोटो देखकर स्वतः ब्रेकिंग न्यूज़ हेडलाइन, हाइलाइट व लोकेशन तैयार करें
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Image preview & upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 flex items-center justify-center">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt="Selected preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-neutral-500 text-xs flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <span>कोई फोटो चयनित नहीं</span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  नई फोटो अपलोड करें:
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 hover:border-yellow-400 rounded-xl p-4 cursor-pointer text-center bg-neutral-950/50 transition-all">
                  <Upload className="w-6 h-6 text-yellow-400 mb-1" />
                  <span className="text-xs font-medium text-neutral-200">
                    कंप्यूटर या फोन से फोटो चुनें
                  </span>
                  <span className="text-[10px] text-neutral-500 mt-0.5">
                    PNG, JPG, WEBP समर्थित
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f);
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  अतिरिक्त निर्देश / संदर्भ (वैकल्पिक):
                </label>
                <textarea
                  rows={2}
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  placeholder="उदा: यह रीवा-सीधी रोड पर हुए बस हादसे की तस्वीर है, सीएम ने मुआवजे का ऐलान किया"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-2.5 text-xs text-white focus:border-yellow-400 focus:outline-none"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || !selectedImage}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                    <span>Gemini 3.1 Pro फोटो का विश्लेषण कर रहा है...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span>AI से हेडलाइन तैयार करें</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Analysis Result Box */}
          {analysisResult && (
            <div className="p-4 rounded-xl bg-neutral-950 border border-yellow-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  Gemini 3.1 Pro द्वारा जनरेटेड परिणाम:
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                  {analysisResult.location || 'मध्य प्रदेश'}
                </span>
              </div>

              {/* Generated Headline */}
              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
                <div className="text-[10px] text-neutral-400 mb-1">सुझाई गई हेडलाइन:</div>
                <div className="font-extrabold text-white text-base font-['Noto_Sans_Devanagari'] leading-relaxed">
                  {analysisResult.headline}
                </div>
              </div>

              {/* Highlights */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-neutral-400 text-[11px]">पीले हाइलाइट शब्द:</span>
                {analysisResult.highlightWords?.map((hw, idx) => (
                  <span
                    key={idx}
                    className="bg-yellow-400 text-neutral-950 font-extrabold px-2 py-0.5 rounded text-[11px]"
                  >
                    {hw}
                  </span>
                ))}
              </div>

              {/* Summary */}
              <div className="text-xs text-neutral-300 bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80">
                <span className="text-neutral-400 font-medium">न्यूज़ विवरण: </span>
                {analysisResult.summary}
              </div>

              {/* AI Generated Photo Toggle Option */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-900/90 rounded-lg border border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-neutral-200">
                    AI जेनरेटेड फोटो (AI GENERATED):
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setAnalysisResult({
                      ...analysisResult,
                      isAiGeneratedPhoto: !analysisResult.isAiGeneratedPhoto,
                    })
                  }
                  className={`px-3 py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                    analysisResult.isAiGeneratedPhoto
                      ? 'bg-yellow-400 text-neutral-950 border-yellow-400 font-black'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  {analysisResult.isAiGeneratedPhoto ? 'सक्रिय (ON)' : 'बंद (OFF)'}
                </button>
              </div>

              {/* Apply Button */}
              <button
                onClick={handleApply}
                className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-neutral-950 font-black text-sm flex items-center justify-center gap-2 shadow cursor-pointer mt-2"
              >
                <Check className="w-4 h-4" />
                <span>इस हेडलाइन को न्यूज़ कार्ड पर लागू करें</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
