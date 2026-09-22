import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Color theme mapping for matching thick colored borders, glow shadows, and icon badges.
 */
const THEME_STYLES = {
  sky: {
    border: 'border-[3px] border-sky-500 shadow-[0_0_22px_rgba(14,165,233,0.25)]',
    iconBadge: 'bg-sky-500/15 text-sky-500 dark:text-sky-400 border-2 border-sky-500/50'
  },
  blue: {
    border: 'border-[3px] border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.25)]',
    iconBadge: 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border-2 border-blue-500/50'
  },
  emerald: {
    border: 'border-[3px] border-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.25)]',
    iconBadge: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-2 border-emerald-500/50'
  },
  amber: {
    border: 'border-[3px] border-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.25)]',
    iconBadge: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-2 border-amber-500/50'
  },
  purple: {
    border: 'border-[3px] border-purple-500 shadow-[0_0_22px_rgba(168,85,247,0.25)]',
    iconBadge: 'bg-purple-500/15 text-purple-500 dark:text-purple-400 border-2 border-purple-500/50'
  },
  cyan: {
    border: 'border-[3px] border-cyan-500 shadow-[0_0_22px_rgba(6,182,212,0.25)]',
    iconBadge: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-2 border-cyan-500/50'
  },
  indigo: {
    border: 'border-[3px] border-indigo-500 shadow-[0_0_22px_rgba(99,102,241,0.25)]',
    iconBadge: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border-2 border-indigo-500/50'
  }
};

/**
 * Standardized 2-Line Frozen Page Header Component.
 * - Line 1: Left Icon + Main Heading
 * - Line 2: Subheading
 * - Fixed/Standardized height across all pages
 * - Freezes at the top of the content area
 * - Page-specific thick matching color border and badge styling
 */
export default function PageHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actions, 
  theme = 'blue', 
  className = '' 
}) {
  const { isDark } = useTheme();
  const themeStyle = THEME_STYLES[theme] || THEME_STYLES.blue;

  return (
    <div className={`shrink-0 min-h-[76px] sm:h-[84px] px-4 sm:px-6 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-4 backdrop-blur-md transition-all ${
      isDark 
        ? `bg-slate-900/95 text-slate-100 ${themeStyle.border}` 
        : `bg-white/95 text-slate-900 ${themeStyle.border}`
    } ${className}`}>
      {/* 2-line Heading Area */}
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center shadow-inner ${themeStyle.iconBadge}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black tracking-tight truncate leading-tight flex items-center gap-2">
            {title}
          </h1>
          <p className={`text-xs sm:text-sm truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Action Buttons */}
      {actions && (
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
