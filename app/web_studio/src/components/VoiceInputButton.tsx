import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, ExternalLink, RefreshCw, X, AlertCircle } from 'lucide-react';

interface VoiceInputButtonProps {
  onTranscript: (spokenText: string) => void;
  className?: string;
  buttonText?: string;
  size?: 'sm' | 'md';
  language?: string;
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
  const [permissionBlocked, setPermissionBlocked] = useState(false);
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

  const startListening = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('आपका ब्राउज़र वॉइस टाइपिंग सपोर्ट नहीं करता (कृपया Google Chrome या Microsoft Edge का उपयोग करें)');
      setPermissionBlocked(false);
      setTimeout(() => setErrorMessage(null), 5000);
      return;
    }

    setErrorMessage(null);
    setPermissionBlocked(false);
    setIsCheckingPermission(true);

    // Step 1: Explicitly request microphone permission via getUserMedia
    // In Chrome/Edge, SpeechRecognition alone often fails with 'not-allowed' in iframes or unprompted contexts,
    // whereas getUserMedia triggers the native "Allow microphone access" browser popup.
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks so speech recognition has clean exclusive access to microphone
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        console.warn('getUserMedia audio permission check failed:', mediaErr);
        setIsCheckingPermission(false);
        setIsListening(false);

        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          setPermissionBlocked(true);
          setErrorMessage(
            isInIframe
              ? 'माइक्रोफ़ोन अनुमति ब्लॉक है। प्रीव्यू आईफ्रेम (iFrame) में ब्राउज़र सुरक्षा के कारण माइक सीधे ब्लॉक हो सकता है। कृपया नीचे दिए बटन से ऐप को नए टैब में खोलें या एड्रेस बार (🔒) में अनुमति दें।'
              : 'माइक्रोफ़ोन अनुमति ब्लॉक है। कृपया ब्राउज़र के एड्रेस बार में लॉक (🔒) आइकॉन पर क्लिक करके माइक को "Allow" (अनुमति) दें और पुनः प्रयास करें।'
          );
          return;
        } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          setErrorMessage('कोई माइक्रोफ़ोन डिवाइस नहीं मिला। कृपया माइक कनेक्ट करें।');
          setTimeout(() => setErrorMessage(null), 5000);
          return;
        }
      }
    }

    setIsCheckingPermission(false);

    // Step 2: Initialize and start SpeechRecognition
    try {
      stopListening();

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
        setPermissionBlocked(false);
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
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);

        if (event.error === 'not-allowed') {
          const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
          setPermissionBlocked(true);
          setErrorMessage(
            isInIframe
              ? 'माइक्रोफ़ोन अनुमति ब्लॉक है। प्रीव्यू आईफ्रेम (iFrame) में ब्राउज़र सुरक्षा के कारण माइक ब्लॉक हो सकता है। कृपया ऐप को नए टैब में खोलें या एड्रेस बार (🔒) में माइक की अनुमति दें।'
              : 'माइक्रोफ़ोन अनुमति ब्लॉक है। कृपया ब्राउज़र एड्रेस बार में लॉक (🔒) आइकॉन पर क्लिक करके माइक को "Allow" (अनुमति) दें।'
          );
        } else if (event.error === 'no-speech') {
          // No speech detected, keep listening or allow graceful retry
        } else if (event.error === 'audio-capture') {
          setErrorMessage('माइक्रोफ़ोन ऑडियो कैप्चर नहीं हो पा रहा है। कृपया सुनिश्चित करें कि माइक किसी अन्य ऐप में उपयोग में नहीं है।');
          setTimeout(() => setErrorMessage(null), 5000);
        } else if (event.error === 'network') {
          setErrorMessage('गूगल स्पीच नेटवर्क से संपर्क नहीं हो पाया। कृपया इंटरनेट कनेक्शन जांचें।');
          setTimeout(() => setErrorMessage(null), 5000);
        } else {
          setErrorMessage(`वॉइस इनपुट एरर: ${event.error}`);
          setTimeout(() => setErrorMessage(null), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
      setIsCheckingPermission(false);
      setErrorMessage('माइक्रोफ़ोन शुरू करने में समस्या हुई। कृपया पुनः प्रयास करें।');
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

  const openInNewTab = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch (e) {
      // fallback
    }
  };

  if (!isSupported) {
    return (
      <span
        title="वॉइस इनपुट के लिए Google Chrome या Microsoft Edge का उपयोग करें"
        className="text-[10px] text-neutral-500 inline-flex items-center gap-1 opacity-60 cursor-not-allowed"
      >
        <MicOff className="w-3.5 h-3.5" />
      </span>
    );
  }

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
            ? 'माइक अनुमति जांची जा रही है...'
            : 'माइक से बोलकर लिखें (Hindi Voice Input)'
        }
      >
        {isListening ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <Mic className="w-3.5 h-3.5" />
            <span>{buttonText || 'सुन रहा हूँ... बोलिए'}</span>
          </>
        ) : isCheckingPermission ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
            <span>माइक शुरू हो रहा है...</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-yellow-400" />
            <span>{buttonText || 'माइक से बोलें'}</span>
          </>
        )}
      </button>

      {/* Error & Guidance Popover */}
      {errorMessage && (
        <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 z-50 bg-neutral-950/95 backdrop-blur-md border border-red-500/80 text-white p-3 rounded-xl shadow-2xl min-w-[280px] max-w-sm animate-in fade-in slide-in-from-top-1 text-xs space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-red-400 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{permissionBlocked ? 'माइक्रोफ़ोन अनुमति आवश्यक' : 'वॉइस इनपुट सूचना'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setPermissionBlocked(false);
              }}
              className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-neutral-300 leading-relaxed">
            {errorMessage}
          </p>

          {permissionBlocked && (
            <div className="pt-1 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={openInNewTab}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-sm transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ऐप को नए टैब में खोलें (Open in New Tab)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setPermissionBlocked(false);
                  startListening();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-yellow-300 border border-neutral-700 text-[11px] font-medium cursor-pointer transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                <span>पुनः प्रयास करें (Try Again)</span>
              </button>

              <div className="text-[10px] text-neutral-400 bg-neutral-900/90 p-1.5 rounded-md border border-neutral-800 leading-tight">
                💡 <strong className="text-neutral-300">त्वरित समाधान:</strong> ब्राउज़र के सबसे ऊपर एड्रेस बार में 🔒 या ट्यूनिंग आइकॉन पर क्लिक करें ➔ <span className="text-emerald-300 font-bold">Microphone</span> को <strong>Allow</strong> करें।
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

