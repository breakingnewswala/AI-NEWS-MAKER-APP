import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { NewsComposition } from '../remotion/NewsComposition';
import { NewsCompositionProps, defaultNewsCompositionProps } from '../remotion/types';
import { ArrowLeft, Play, Sparkles, RefreshCw, Smartphone, Monitor } from 'lucide-react';

export const RemotionTestStudio: React.FC = () => {
  const [props, setProps] = useState<NewsCompositionProps>(defaultNewsCompositionProps);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const width = aspectRatio === '16:9' ? 1280 : 720;
  const height = aspectRatio === '16:9' ? 720 : 1280;
  const durationInFrames = 300; // 10 seconds @ 30fps
  const fps = 30;

  const handleReturnToMainApp = () => {
    // Remove ?poc=remotion or #remotion-poc and reload or redirect cleanly
    const url = new URL(window.location.href);
    url.searchParams.delete('poc');
    url.hash = '';
    window.location.href = url.pathname + (url.search ? url.search : '');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={handleReturnToMainApp}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-sm font-semibold cursor-pointer border border-slate-700"
            title="मुख्य ऐप पर वापस जाएँ"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>वापस मुख्य ऐप (Main App)</span>
          </button>

          <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-red-600/30">
              R
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-white tracking-wide">
                  Remotion Video Engine POC
                </h1>
                <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  v4.0.537 • React 19
                </span>
              </div>
              <p className="text-xs text-slate-400">
                फ़्रेम-एक्यूरेट रीयल-टाइम वीडियो प्लेयर टेस्टबेड
              </p>
            </div>
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setAspectRatio('16:9')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              aspectRatio === '16:9'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>16:9 (Landscape)</span>
          </button>
          <button
            onClick={() => setAspectRatio('9:16')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              aspectRatio === '9:16'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16 (Reel / Shorts)</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] w-full mx-auto">
        {/* Left: Remotion Player Stage */}
        <section className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800 p-6 shadow-2xl">
          <div className="w-full flex items-center justify-between mb-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              लाइव Remotion Player एक्टिव
            </span>
            <span>
              रिज़ॉल्यूशन: {width} × {height} ({aspectRatio}) • {fps} FPS
            </span>
          </div>

          <div
            className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-black flex items-center justify-center"
            style={{
              aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16',
              maxHeight: aspectRatio === '9:16' ? '680px' : 'auto',
            }}
          >
            <Player
              component={NewsComposition}
              inputProps={props}
              durationInFrames={durationInFrames}
              compositionWidth={width}
              compositionHeight={height}
              fps={fps}
              style={{
                width: '100%',
                height: '100%',
              }}
              controls
              loop
              autoPlay
            />
          </div>

          <div className="mt-4 w-full text-center text-xs text-slate-500">
            💡 टिप: प्लेयर में नीचे बने टाइमलाइन स्क्रबर को ड्रैग करके फ़्रेम-बाय-फ़्रेम स्क्रॉल करें।
          </div>
        </section>

        {/* Right: Live Interactive Controls */}
        <aside className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-500" />
                लाइव वीडियो इनपुट टेस्ट (Props)
              </h2>
              <button
                onClick={() => setProps(defaultNewsCompositionProps)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition"
                title="डिफ़ॉल्ट रीसेट करें"
              >
                <RefreshCw className="w-3 h-3" />
                रीसेट
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  कैटेगरी / रिबन
                </label>
                <input
                  type="text"
                  value={props.category || ''}
                  onChange={(e) => setProps({ ...props, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition"
                  placeholder="जैसे: ब्रेकिंग न्यूज़, खेल, राजनीति"
                />
              </div>

              {/* Headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  मुख्य हेडलाइन (Headline)
                </label>
                <textarea
                  rows={3}
                  value={props.headline}
                  onChange={(e) => setProps({ ...props, headline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition resize-none"
                  placeholder="यहाँ मुख्य समाचार हेडलाइन लिखें..."
                />
              </div>

              {/* Sub-headline */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  सब-हेडलाइन / विवरण
                </label>
                <input
                  type="text"
                  value={props.subHeadline || ''}
                  onChange={(e) => setProps({ ...props, subHeadline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition"
                  placeholder="अतिरिक्त विवरण..."
                />
              </div>

              {/* Ticker Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  निचला न्यूज़ टिकर (News Ticker)
                </label>
                <textarea
                  rows={2}
                  value={props.tickerText}
                  onChange={(e) => setProps({ ...props, tickerText: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition resize-none font-mono"
                  placeholder="स्क्रॉल होने वाला टिकर टेक्स्ट..."
                />
              </div>

              {/* Location & Reporter */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    स्थान (Location)
                  </label>
                  <input
                    type="text"
                    value={props.location || ''}
                    onChange={(e) => setProps({ ...props, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    रिपोर्टर का नाम
                  </label>
                  <input
                    type="text"
                    value={props.reporterName || ''}
                    onChange={(e) => setProps({ ...props, reporterName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    एक्सेन्ट रंग (Theme)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={props.accentColor || '#dc2626'}
                      onChange={(e) => setProps({ ...props, accentColor: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-slate-400">
                      {props.accentColor}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    टिकर बैकग्राउंड
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={props.tickerBgColor || '#fbbf24'}
                      onChange={(e) => setProps({ ...props, tickerBgColor: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-slate-400">
                      {props.tickerBgColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture Status Card */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Remotion POC आइसोलेशन स्थिति
            </div>
            <p>
              • मौजूदा Canvas और MediaRecorder सिस्टम पूरी तरह अछूता है।
            </p>
            <p>
              • मुख्य ऐप पर लौटने के लिए ऊपर दिए गए "वापस मुख्य ऐप" बटन पर क्लिक करें।
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
};
