import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();

  return (
    <footer 
      className={`w-full shrink-0 z-40 select-none border-t transition-colors duration-200 ${
        isDark 
          ? 'bg-slate-950/95 border-slate-800/80 text-slate-300' 
          : 'bg-white/95 border-slate-200/90 text-slate-700 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]'
      } backdrop-blur-md`}
    >
      <div className="w-full flex items-center justify-between min-h-[48px] px-2 sm:px-4">
        {/* Left Section: User Management Profile & Logout Button (Aligned with Sidebar) */}
        <div className="w-64 min-w-[16rem] max-w-[16rem] hidden md:flex items-center justify-between pr-4 border-r border-slate-700/30 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {user?.full_name || user?.username || 'Administrator'}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500 leading-none">
                {user?.role || 'Admin'} Access
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className={`p-1.5 rounded-lg border transition-all shrink-0 ${
              isDark 
                ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800/80 border-transparent hover:border-red-500/20' 
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-200'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center / Full Width Section: Developer Signature */}
        <div className="flex-1 px-3 py-1 flex items-center justify-center text-center min-w-0">
          <p className="text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide truncate">
            Designed and Developed by <span className={isDark ? 'text-sky-400 font-bold' : 'text-blue-600 font-bold'}>| Khurram Munir Basra |</span> UUDS DXB Stores
          </p>
        </div>

        {/* Right Section on Mobile / Small screens: Quick Logout if sidebar is hidden */}
        <div className="md:hidden flex items-center pl-2 shrink-0">
          <button
            onClick={logout}
            title="Sign Out"
            className={`p-1.5 rounded-lg border transition-all ${
              isDark 
                ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' 
                : 'text-slate-600 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
