import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/themeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center gap-2 p-2 rounded-xl transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-slate-700/80 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 shadow-xs'
      } ${className}`}
      aria-label={isDark ? 'लाइट मोड चालू करें' : 'डार्क मोड चालू करें'}
      title={isDark ? 'लाइट मोड चालू करें (Switch to Light Mode)' : 'डार्क मोड चालू करें (Switch to Dark Mode)'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 rotate-0 hover:-rotate-12" />
        )}
      </div>

      {showLabel && (
        <span className="text-xs font-bold font-sans">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};
