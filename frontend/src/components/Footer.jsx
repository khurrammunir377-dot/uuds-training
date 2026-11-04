import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { isDark } = useTheme();

  return (
    <footer 
      className={`w-full shrink-0 z-40 select-none border-t transition-colors duration-200 py-1.5 px-3 sm:px-6 flex items-center justify-center text-center ${
        isDark 
          ? 'bg-slate-950/95 border-slate-800/80 text-slate-300' 
          : 'bg-white/95 border-slate-200/90 text-slate-700 shadow-[0_-2px_8px_rgba(0,0,0,0.03)]'
      } backdrop-blur-md`}
    >
      <p className="text-[11px] sm:text-xs font-semibold tracking-wide truncate leading-tight">
        Designed and Developed by <span className={isDark ? 'text-sky-400 font-bold' : 'text-blue-600 font-bold'}>| Khurram Munir Basra |</span> UUDS DXB Stores
      </p>
    </footer>
  );
}
