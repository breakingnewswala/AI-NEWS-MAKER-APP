import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('theme') || localStorage.getItem('ai_news_theme');
    if (saved) return saved === 'dark';
    return true; // Default dark theme for news studio
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark'); localStorage.setItem('ai_news_theme', 'dark'); localStorage.setItem('ai_news_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light'); localStorage.setItem('ai_news_theme', 'light'); localStorage.setItem('ai_news_theme', 'light');
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app_theme_changed', { detail: { isDark } }));
    }
  }, [isDark]);

  useEffect(() => {
    const handleThemeSync = (e: any) => {
      if (e?.detail && typeof e.detail.isDark === 'boolean') {
        setIsDark(e.detail.isDark);
      }
    };
    window.addEventListener('app_theme_changed', handleThemeSync);
    return () => window.removeEventListener('app_theme_changed', handleThemeSync);
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDark((prev) => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 sm:px-2.5 sm:py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-bold shrink-0 shadow-xs"
      title={isDark ? 'लाइट मोड चालू करें' : 'डार्क मोड चालू करें'}
      aria-label="Toggle Theme"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500 hover:rotate-45 transition-transform" />
          <span className="hidden xl:inline text-[11px]">लाइट</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-500 hover:-rotate-12 transition-transform" />
          <span className="hidden xl:inline text-[11px]">डार्क</span>
        </>
      )}
    </button>
  );
};
