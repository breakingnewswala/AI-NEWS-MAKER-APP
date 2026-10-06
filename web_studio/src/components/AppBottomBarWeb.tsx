import React from 'react';
import { Home, Film, Sparkles, Newspaper, Sliders, User } from 'lucide-react';
import { isUserAdmin } from '../lib/userPlanManager';
import { ReporterUser } from './LoginModal';

export type StandardAppTab = 'home' | 'videos' | 'studio' | 'newsroom' | 'profile';

interface AppBottomBarWebProps {
  currentTab: string;
  currentUser?: ReporterUser | null;
  onSelectTab: (tab: StandardAppTab) => void;
}

export const AppBottomBarWeb: React.FC<AppBottomBarWebProps> = ({
  currentTab,
  currentUser,
  onSelectTab,
}) => {
  const isHome = currentTab === 'home';
  const isVideos = currentTab === 'videos';
  const isStudio = currentTab === 'studio' || currentTab === 'generator';
  const isNewsroom = currentTab === 'newsroom' || currentTab === 'drafts';
  const isControlPanel = currentTab === 'profile' || currentTab === 'export';
  const isAdmin = isUserAdmin(currentUser);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 shadow-2xl md:hidden">
      <div className="max-w-md mx-auto px-2 sm:px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Home (होम) */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isHome ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${isHome ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">होम</span>
        </button>

        {/* Tab 2: Videos (वीडियो) */}
        <button
          onClick={() => onSelectTab('videos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isVideos ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Film className={`w-5 h-5 ${isVideos ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">वीडियो</span>
        </button>

        {/* Tab 3: Studio (स्टूडियो - Center Elevated Action Button) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => onSelectTab('studio')}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-transform active:scale-95 cursor-pointer ${
              isStudio
                ? 'bg-gradient-to-tr from-red-600 via-amber-500 to-red-600 text-white ring-4 ring-amber-400/40 shadow-red-600/50 scale-110'
                : 'bg-gradient-to-tr from-red-700 to-amber-600 text-white hover:scale-105 shadow-red-700/40'
            }`}
          >
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
            <span className="text-[8.5px] font-black uppercase tracking-tight text-amber-100">
              स्टूडियो
            </span>
          </button>
        </div>

        {/* Tab 4: News Room (न्यूज़ रूम) */}
        <button
          onClick={() => onSelectTab('newsroom')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isNewsroom ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Newspaper className={`w-5 h-5 ${isNewsroom ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">न्यूज़ रूम</span>
        </button>

        {/* Tab 5: Profile vs Control Room (Role-based: यूज़र -> प्रोफाइल | एडमिन -> कंट्रोल रूम) */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all cursor-pointer ${
            isControlPanel ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {isAdmin ? (
            <Sliders className={`w-5 h-5 ${isControlPanel ? 'stroke-[2.5]' : 'stroke-2'}`} />
          ) : (
            <User className={`w-5 h-5 ${isControlPanel ? 'stroke-[2.5]' : 'stroke-2'}`} />
          )}
          <span className="text-[10px] font-bold mt-1">{isAdmin ? 'कंट्रोल रूम' : 'प्रोफाइल'}</span>
        </button>
      </div>
    </div>
  );
};
