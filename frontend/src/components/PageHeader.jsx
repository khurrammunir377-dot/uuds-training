import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Standardized 2-Line Frozen Page Header Component.
 * - Line 1: Left Icon + Main Heading
 * - Line 2: Subheading
 * - Fixed/Standardized height across all pages
 * - Freezes at the top of the content area
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, className = '' }) {
  const { isDark } = useTheme();

  return (
    <div className={`shrink-0 min-h-[76px] sm:h-[84px] px-4 sm:px-6 py-3 rounded-2xl border shadow-md flex items-center justify-between gap-4 backdrop-blur-md transition-colors ${
      isDark 
        ? 'bg-slate-900/90 border-slate-800 text-slate-100' 
        : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'
    } ${className}`}>
      {/* 2-line Heading Area */}
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0 flex items-center justify-center shadow-inner">
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
