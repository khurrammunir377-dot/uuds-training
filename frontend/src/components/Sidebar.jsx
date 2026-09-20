import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  AlertTriangle, 
  BookOpen, 
  Mail, 
  Settings, 
  LogOut, 
  User, 
  ShieldCheck 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Sidebar({ activeTab, setActiveTab, counts = {} }) {
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  const navItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      iconColor: 'text-blue-500', 
      activeBg: isDark ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200',
      badge: 'Overview', 
      badgeColor: isDark ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-800 border border-blue-200 font-bold' 
    },
    { 
      id: 'employees', 
      label: 'Staff Roster', 
      icon: Users, 
      iconColor: 'text-purple-500', 
      activeBg: isDark ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200',
      badge: counts.employees || '244', 
      badgeColor: isDark ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-purple-100 text-purple-800 font-bold' 
    },
    { 
      id: 'reminders', 
      label: 'Urgent Alerts', 
      icon: AlertTriangle, 
      iconColor: 'text-rose-500', 
      activeBg: isDark ? 'bg-rose-600/20 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
      badge: counts.urgent || '167', 
      badgeColor: 'bg-rose-500/20 text-rose-500 border border-rose-500/30 font-bold' 
    },
    { 
      id: 'courses', 
      label: 'Training Catalogue', 
      icon: BookOpen, 
      iconColor: 'text-emerald-500', 
      activeBg: isDark ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: '21', 
      badgeColor: isDark ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 font-bold' 
    },
    { 
      id: 'notifications', 
      label: 'Email & WhatsApp', 
      icon: Mail, 
      iconColor: 'text-cyan-500', 
      activeBg: isDark ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200',
      badge: 'Audit', 
      badgeColor: isDark ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold' 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      iconColor: 'text-amber-500', 
      activeBg: isDark ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'Config', 
      badgeColor: isDark ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-amber-100 text-amber-800 font-bold' 
    },
  ];

  return (
    <aside className={`w-64 min-w-[16rem] max-w-[16rem] shrink-0 h-full border-r p-4 flex flex-col justify-between overflow-hidden hidden md:flex transition-colors duration-200 z-30 ${
      isDark 
        ? 'bg-slate-900/70 backdrop-blur-md border-slate-800/80 text-slate-100' 
        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Top Navigation Items */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 -mr-1">
        <div className={`px-3 py-2 text-[11px] font-bold tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500 font-extrabold'}`}>
          Navigation Menu
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full h-11 flex items-center justify-between px-3.5 rounded-xl text-sm transition-all duration-200 group shrink-0 border ${
                isActive
                  ? `${item.activeBg} font-bold shadow-sm scale-[1.02]`
                  : isDark
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border-transparent hover:translate-x-1'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-transparent font-medium hover:translate-x-1'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1 rounded-lg transition-transform duration-200 group-hover:scale-125 ${
                  isActive ? 'bg-white/10 shadow-inner' : ''
                }`}>
                  <Icon className={`w-4 h-4 transition-colors ${item.iconColor} ${item.id === 'settings' ? 'group-hover:rotate-45 transition-transform' : ''}`} />
                </div>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 transition-transform group-hover:scale-105 ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Info & Logout ALWAYS visible at Sidebar Left Bottom */}
      <div className={`shrink-0 mt-3 pt-3 border-t transition-colors ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className={`p-3 rounded-2xl border transition-colors ${
          isDark 
            ? 'bg-slate-950/80 border-slate-800 text-slate-200' 
            : 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {user?.full_name || user?.username || 'Administrator'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  {user?.role || 'Admin'} Access
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className={`p-2 rounded-xl border transition-all shrink-0 ${
                isDark 
                  ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800/80 border-transparent hover:border-red-500/20' 
                  : 'text-slate-600 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-200'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
