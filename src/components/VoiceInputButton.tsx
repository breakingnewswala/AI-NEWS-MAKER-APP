import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, X, AlertCircle } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (spokenText: string) => void;
  className?: string;
  buttonText?: string;
  size?: 'sm' | 'md';
  language?: string;
  title?: string;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  className = '',
  buttonText,
  size = 'sm',
  language = 'hi-IN',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isCheckingPermission, setIsCheckingPermission] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsCheckingPermission(false);
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('ब्राउज़र वॉइस टाइपिंग सपोर्ट नहीं करता (कृपया Chrome या Edge का उपयोग करें)');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    setErrorMessage(null);
    setIsCheckingPermission(true);

    try {
      stopListening();

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language || 'hi-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setIsCheckingPermission(false);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        const results = event.results;
        if (!results || results.length === 0) return;

        let finalTranscript = '';
        for (let i = event.resultIndex; i < results.length; i++) {
          if (results[i].isFinal) {
            finalTranscript += results[i][0].transcript + ' ';
          }
        }

        const trimmed = finalTranscript.trim();
        if (trimmed) {
          onTranscript(trimmed);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
        setIsCheckingPermission(false);

        if (event.error === 'not-allowed') {
          setErrorMessage('माइक अनुमति आवश्यक: ब्राउज़र बार में 🔒 पर क्लिक करके माइक को Allow करें।');
          setTimeout(() => setErrorMessage(null), 5000);
        } else if (event.error === 'no-speech') {
          // Normal timeout when silence; keep quiet
        } else if (event.error === 'audio-capture') {
          setErrorMessage('माइक उपलब्ध नहीं है। कृपया चेक करें कि माइक कनेक्ट है।');
          setTimeout(() => setErrorMessage(null), 4000);
        } else if (event.error === 'network') {
          setErrorMessage('नेटवर्क समस्या: कृपया इंटरनेट जांचें।');
          setTimeout(() => setErrorMessage(null), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsCheckingPermission(false);
      };

      recognition.start();
    } catch (err: any) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
      setIsCheckingPermission(false);
      setErrorMessage('माइक चालू नहीं हो सका। कृपया पुनः प्रयास करें।');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const isSmall = size === 'sm';

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        disabled={isCheckingPermission}
        className={`inline-flex items-center gap-1.5 font-bold rounded-lg transition-all cursor-pointer select-none ${
          isListening
            ? 'bg-red-600 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.7)] px-2.5 py-1 text-xs border border-red-400'
            : isCheckingPermission
            ? 'bg-neutral-800 text-yellow-300 border border-neutral-700 px-2.5 py-1 text-xs opacity-80'
            : isSmall
            ? 'bg-neutral-800 hover:bg-neutral-700 text-yellow-400 hover:text-yellow-300 border border-neutral-700 px-2 py-1 text-[11px]'
            : 'bg-neutral-800 hover:bg-neutral-700 text-yellow-400 hover:text-yellow-300 border border-neutral-700 px-3 py-1.5 text-xs'
        } ${className}`}
        title={
          isListening
            ? 'सुन रहा हूँ... बोलिए (रोकने के लिए क्लिक करें)'
            : isCheckingPermission
            ? 'माइक शुरू हो रहा है...'
            : 'माइक से बोलकर लिखें (Hindi Voice Input)'
        }
      >
        {isListening ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <Mic className="w-3.5 h-3.5" />
            <span>{buttonText || 'सुन रहा हूँ...'}</span>
          </>
        ) : isCheckingPermission ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
            <span>माइक चालू हो रहा है...</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-yellow-400" />
            <span>{buttonText || 'माइक से बोलें'}</span>
          </>
        )}
      </button>

      {/* Non-blocking Toast / Notification Banner */}
      {errorMessage && (
        <div className="absolute top-full mt-1.5 right-0 z-50 bg-neutral-900/95 backdrop-blur border border-amber-500/50 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-[11px] flex items-center gap-2 max-w-xs animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="flex-1 text-neutral-200">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-neutral-400 hover:text-white p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
