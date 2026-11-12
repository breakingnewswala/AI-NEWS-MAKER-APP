import React from 'react';
import { Home, Film, Sparkles, Newspaper, Sliders, User } from 'lucide-react';
import { isUserAdmin } from '../lib/userPlanManager';
import { ReporterUser } from './LoginModal';

export type StandardAppTab = 'home' | 'videos' | 'studio' | 'newsroom' | 'profile';

interface AppBottomBarWebProps {
  currentTab: string;
  currentUser?: ReporterUser | null;
  onSelectTab: (tab: StandardAppTab) => void;
  isGraphicStudioActive?: boolean;
}

export const AppBottomBarWeb: React.FC<AppBottomBarWebProps> = ({
  currentTab,
  currentUser,
  onSelectTab,
  isGraphicStudioActive = false,
}) => {
  const isHome = currentTab === 'home';
  const isVideos = currentTab === 'videos';
  const isStudio = currentTab === 'studio' || currentTab === 'generator';
  const isNewsroom = currentTab === 'newsroom' || currentTab === 'drafts';
  const isControlPanel = currentTab === 'profile' || currentTab === 'export';
  const isAdmin = isUserAdmin(currentUser);
  const isCompactStudioBtn = isStudio && isGraphicStudioActive;

  return (
    <div
      id="app-permanent-fixed-bottom-bar"
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/98 backdrop-blur-xl border-t border-slate-800 shadow-2xl xl:hidden select-none pointer-events-auto"
      style={{
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
      }}
    >
      <div className="max-w-md sm:max-w-xl md:max-w-3xl mx-auto px-2 sm:px-6 md:px-8 h-16 md:h-18 flex items-center justify-between relative">
        {/* Tab 1: Home (होम) */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer min-h-[48px] ${
            isHome ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${isHome ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold mt-1">होम</span>
        </button>

        {/* Tab 2: Videos (वीडियो एंड रील्स) */}
        <button
          type="button"
          onClick={() => onSelectTab('videos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer min-h-[48px] ${
            isVideos ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className={`w-5 h-5 ${isVideos ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[8.5px] sm:text-[10px] font-bold mt-1 tracking-tight truncate max-w-[76px] sm:max-w-none">
            वीडियो एंड रील्स
          </span>
        </button>

        {/* Tab 3: Studio (स्टूडियो - Center Elevated Action Button) */}
        <div className={`flex-1 flex justify-center ${isCompactStudioBtn ? '-mt-2' : '-mt-6'} transition-all`}>
          <button
            type="button"
            onClick={() => onSelectTab('studio')}
            className={`${isCompactStudioBtn ? 'w-11 h-11' : 'w-14 h-14 sm:w-16 sm:h-16'} rounded-full flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${
              isStudio
                ? `bg-gradient-to-tr from-red-600 via-amber-500 to-red-600 text-white ${isCompactStudioBtn ? 'ring-2 ring-amber-400/50 scale-100' : 'ring-4 ring-amber-400/40 scale-110'} shadow-red-600/50`
                : 'bg-gradient-to-tr from-red-700 to-amber-600 text-white hover:scale-105 shadow-red-700/40'
            }`}
          >
            <Sparkles className={`${isCompactStudioBtn ? 'w-4 h-4' : 'w-6 h-6'} text-white animate-pulse`} />
            <span className={`${isCompactStudioBtn ? 'text-[7.5px]' : 'text-[8.5px] sm:text-[9.5px]'} font-black uppercase tracking-tight text-amber-100`}>
              स्टूडियो
            </span>
          </button>
        </div>

        {/* Tab 4: News Room (न्यूज़ रूम) */}
        <button
          type="button"
          onClick={() => onSelectTab('newsroom')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer min-h-[48px] ${
            isNewsroom ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Newspaper className={`w-5 h-5 ${isNewsroom ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold mt-1">न्यूज़ रूम</span>
        </button>

        {/* Tab 5: Control Room (कंट्रोल रूम - Part 9) */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer min-h-[48px] ${
            isControlPanel ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className={`w-5 h-5 ${isControlPanel ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] sm:text-[11px] font-bold mt-1">कंट्रोल रूम</span>
        </button>
      </div>
    </div>
  );
};
