import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function StatusBadge({ status, size = 'md', showIcon = true, daysLeft = null }) {
  const { isDark } = useTheme();

  let config = {
    bg: isDark 
      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-glow-valid' 
      : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-extrabold shadow-sm',
    iconColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
    icon: CheckCircle2,
    label: 'Valid',
    dot: isDark ? 'bg-emerald-400' : 'bg-emerald-600'
  };

  if (status === 'Overdue') {
    config = {
      bg: isDark 
        ? 'bg-red-950/80 border-red-500/40 text-red-300 shadow-glow-overdue' 
        : 'bg-red-50 border-red-300 text-red-800 font-extrabold shadow-sm',
      iconColor: isDark ? 'text-red-400' : 'text-red-600',
      icon: XCircle,
      label: 'Overdue',
      dot: isDark ? 'bg-red-500 animate-pulse' : 'bg-red-600 animate-pulse'
    };
  } else if (status === 'Due Within 30 Days') {
    config = {
      bg: isDark 
        ? 'bg-amber-950/80 border-amber-500/40 text-amber-300 shadow-glow-warning' 
        : 'bg-amber-50 border-amber-300 text-amber-900 font-extrabold shadow-sm',
      iconColor: isDark ? 'text-amber-400' : 'text-amber-600',
      icon: AlertTriangle,
      label: 'Due in 30 Days',
      dot: isDark ? 'bg-amber-400 animate-pulse' : 'bg-amber-600 animate-pulse'
    };
  } else if (status === 'Not Recorded') {
    config = {
      bg: isDark 
        ? 'bg-slate-800/90 border-slate-700 text-slate-300' 
        : 'bg-slate-100 border-slate-300 text-slate-800 font-bold shadow-sm',
      iconColor: isDark ? 'text-slate-400' : 'text-slate-600',
      icon: HelpCircle,
      label: 'Not Recorded',
      dot: isDark ? 'bg-slate-400' : 'bg-slate-500'
    };
  }

  const Icon = config.icon;
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2.5 py-0.5 gap-1.5' 
    : size === 'lg' 
      ? 'text-sm px-4 py-1.5 gap-2' 
      : 'text-xs px-3 py-1 gap-1.5 font-bold';

  return (
    <span className={`inline-flex items-center rounded-full border transition-all duration-200 ${config.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {showIcon && <Icon className={`${size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} ${config.iconColor}`} />}
      <span>{config.label}</span>
      {daysLeft !== null && daysLeft !== undefined && (
        <span className={`font-mono text-[11px] ml-0.5 ${isDark ? 'opacity-80' : 'opacity-90 font-bold'}`}>
          ({daysLeft > 0 ? `${daysLeft}d` : `${Math.abs(daysLeft)}d ago`})
        </span>
      )}
    </span>
  );
}
