import React from 'react';
import { Home, Sparkles, FolderOpen, LayoutGrid, Download } from 'lucide-react';

export type StandardAppTab = 'home' | 'generator' | 'drafts' | 'categories' | 'export';

interface AppBottomBarWebProps {
  currentTab: string;
  onSelectTab: (tab: StandardAppTab) => void;
}

export const AppBottomBarWeb: React.FC<AppBottomBarWebProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const isHome = currentTab === 'home';
  const isGenerator = currentTab === 'generator' || currentTab === 'studio';
  const isDrafts = currentTab === 'drafts';
  const isCategories = currentTab === 'categories' || currentTab === 'videos' || currentTab === 'epaper';
  const isExport = currentTab === 'export' || currentTab === 'profile';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 shadow-2xl md:hidden">
      <div className="max-w-md mx-auto px-2 sm:px-4 h-16 flex items-center justify-between relative">
        {/* Tab 1: Home */}
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isHome ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className={`w-5 h-5 ${isHome ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">होम</span>
        </button>

        {/* Tab 2: Drafts */}
        <button
          onClick={() => onSelectTab('drafts')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isDrafts ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderOpen className={`w-5 h-5 ${isDrafts ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">ड्राफ्ट्स</span>
        </button>

        {/* Tab 3: News Generator (Center Elevated Glowing Action Button) */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            onClick={() => onSelectTab('generator')}
            className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl transition-transform active:scale-95 ${
              isGenerator
                ? 'bg-gradient-to-tr from-red-600 via-amber-500 to-red-600 text-white ring-4 ring-amber-400/40 shadow-red-600/50 scale-110'
                : 'bg-gradient-to-tr from-red-700 to-amber-600 text-white hover:scale-105 shadow-red-700/40'
            }`}
          >
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
            <span className="text-[8.5px] font-black uppercase tracking-tight text-amber-100">
              जनरेटर
            </span>
          </button>
        </div>

        {/* Tab 4: Categories */}
        <button
          onClick={() => onSelectTab('categories')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isCategories ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className={`w-5 h-5 ${isCategories ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">कैटेगरीज़</span>
        </button>

        {/* Tab 5: Export */}
        <button
          onClick={() => onSelectTab('export')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            isExport ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className={`w-5 h-5 ${isExport ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] font-bold mt-1">एक्सपोर्ट</span>
        </button>
      </div>
    </div>
  );
};
