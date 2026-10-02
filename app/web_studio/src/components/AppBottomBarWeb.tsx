import React from 'react';
import { Home, Film, Sparkles, Newspaper, SlidersHorizontal } from 'lucide-react';

interface AppBottomBarWebProps {
  currentTab: 'home' | 'videos' | 'studio' | 'epaper' | 'profile';
  onSelectTab: (tab: 'home' | 'videos' | 'studio' | 'epaper' | 'profile') => void;
}

export const AppBottomBarWeb: React.FC<AppBottomBarWebProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 shadow-2xl md:hidden">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'home' ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">होम</span>
        </button>

        {/* Tab 2: Videos */}
        <button
          onClick={() => onSelectTab('videos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'videos' ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className={`w-5 h-5 ${currentTab === 'videos' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">वीडियो</span>
        </button>

        {/* Tab 3: Studio (Center Elevated Action Button) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => onSelectTab('studio')}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-transform active:scale-95 ${
              currentTab === 'studio'
                ? 'bg-gradient-to-tr from-red-600 via-amber-500 to-red-600 text-white ring-4 ring-amber-400/40 shadow-red-600/50 scale-110'
                : 'bg-gradient-to-tr from-red-700 to-amber-600 text-white hover:scale-105 shadow-red-700/40'
            }`}
          >
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-tight text-amber-100">
              स्टूडियो
            </span>
          </button>
        </div>

        {/* Tab 4: E-Paper */}
        <button
          onClick={() => onSelectTab('epaper')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'epaper' ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Newspaper className={`w-5 h-5 ${currentTab === 'epaper' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">ई-पेपर</span>
        </button>

        {/* Tab 5: Control Panel */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'profile' ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className={`w-5 h-5 ${currentTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">कंट्रोल पैनल</span>
        </button>
      </div>
    </div>
  );
};
