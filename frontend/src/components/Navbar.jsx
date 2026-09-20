import React, { useState, useEffect } from 'react';
import { Clock, Sun, Moon, Calendar } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/dateUtils';
import A380Icon from './A380Icon';

export default function Navbar() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [currentDateTime, setCurrentDateTime] = useState({
    day: '',
    dateStr: '',
    timeStr: ''
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format day name: Sunday, Monday...
      const dayName = now.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'Asia/Dubai' });
      // Format date in DD-Mon-YYYY: e.g. 20-Sep-2026
      const dateFormatted = formatDate(now);
      // Format time in 24h: HH:MM:SS
      const timeOnly = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        timeZone: 'Asia/Dubai' 
      });

      setCurrentDateTime({
        day: dayName,
        dateStr: dateFormatted,
        timeStr: timeOnly
      });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className={`sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between border-b shadow-md transition-colors duration-200 ${
      isDark 
        ? 'bg-slate-900/95 backdrop-blur-md border-slate-800 text-slate-100' 
        : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Brand & App Title */}
      <div className="flex items-center gap-3.5">
        <div className="relative group animate-float">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 p-0.5 shadow-glow-blue animate-glow-pulse">
            <div className="w-full h-full bg-slate-900/90 rounded-[14px] flex items-center justify-center border border-blue-400/50">
              <A380Icon className="w-7 h-7 text-blue-400 transform -rotate-12 drop-shadow-[0_0_10px_rgba(56,189,248,0.95)]" />
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-extrabold tracking-wider text-base ${
              isDark 
                ? 'bg-gradient-to-r from-blue-400 via-sky-200 to-amber-300 bg-clip-text text-transparent' 
                : 'text-blue-900'
            }`}>
              UUDS AERO
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/10 border border-blue-500/20 text-blue-500">
              DXB
            </span>
          </div>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Aviation Training Compliance & Manpower Tracker
          </p>
        </div>
      </div>

      {/* Right Controls: Theme Switcher & High-Visibility Date / Time Badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
            isDark
              ? 'bg-slate-800/90 border-slate-700 text-amber-400 hover:bg-slate-700 hover:text-amber-300'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {/* High-Visibility Day, Date & Live Clock Badge */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-inner font-mono transition-colors ${
          isDark 
            ? 'bg-slate-950/80 border-slate-800 text-slate-100' 
            : 'bg-slate-100 border-slate-300 text-slate-900'
        }`}>
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline font-bold text-blue-500">{currentDateTime.day},</span>
            <span className="font-bold text-sm tracking-tight">{currentDateTime.dateStr}</span>
          </div>

          <span className={`hidden sm:inline ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>|</span>

          <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-400">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span className="text-sm tracking-wider text-amber-500">{currentDateTime.timeStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
