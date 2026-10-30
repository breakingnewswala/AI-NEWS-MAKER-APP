import React, { useState, useEffect } from 'react';
import { Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark] = useState<boolean>(true);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    try {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('ai_news_theme', 'dark');
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: { isDark: true } }));
    }
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const root = document.documentElement;
    root.classList.add('dark');
    try {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('ai_news_theme', 'dark');
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 sm:px-2.5 sm:py-1.5 text-amber-400 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-bold shrink-0 shadow-xs"
      title="स्टूडियो डार्क मोड (सक्रिय)"
      aria-label="Studio Dark Theme"
    >
      <Moon className="w-3.5 h-3.5 text-amber-400 hover:-rotate-12 transition-transform" />
      <span className="hidden xl:inline text-[11px] text-amber-300">डार्क स्टूडियो</span>
    </button>
  );
};
