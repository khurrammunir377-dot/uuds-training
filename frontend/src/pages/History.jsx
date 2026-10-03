import React, { useState, useEffect, useMemo } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  RefreshCw, 
  Filter, 
  Download, 
  Printer, 
  Trash2, 
  User, 
  ShieldCheck, 
  Clock, 
  Table, 
  Users, 
  BookOpen, 
  Mail, 
  Settings as SettingsIcon,
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Calendar,
  X
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';
import PageHeader from '../components/PageHeader';
import ConfirmationModal from '../components/ConfirmationModal';
import { exportToCSV, printTableAsPDF } from '../utils/exportUtils';
import { formatDate } from '../utils/dateUtils';

export default function History({ onSelectEmployee }) {
  const { user, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    training: 0,
    employees: 0,
    courses: 0,
    users: 0,
    emails: 0
  });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [timeframe, setTimeframe] = useState('all');
  const [limit, setLimit] = useState(150);

  // Modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    loadAuditLogs();
  }, [category, userFilter, timeframe]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuditLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadAuditLogs = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = {
        limit,
        offset: 0
      };
      if (search.trim()) params.search = search.trim();
      if (category !== 'all') params.category = category;
      if (userFilter !== 'all') params.user_filter = userFilter;
      if (timeframe !== 'all') params.timeframe = timeframe;

      const res = await api.getAuditLogs(params);
      setLogs(res.logs || []);
      setTotalCount(res.total_count || 0);
      if (res.stats) setStats(res.stats);
      if (res.users) setAvailableUsers(res.users);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      toast.error('Failed to load activity logs: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      setClearing(true);
      await api.clearAuditLogs();
      toast.success('Audit history cleared successfully');
      setShowClearConfirm(false);
      loadAuditLogs();
    } catch (err) {
      toast.error('Failed to clear history: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!logs.length) {
      toast.info('No activity logs available to export');
      return;
    }
    const headers = [
      { label: 'Log ID', key: 'id' },
      { label: 'Date & Time', key: 'created_at' },
      { label: 'User / Operator', key: 'username' },
      { label: 'Category', key: 'entity_type' },
      { label: 'Action Summary', key: 'action' },
      { label: 'Technical Details', key: 'details' }
    ];
    exportToCSV(logs, headers, `UUDS_Change_History_${new Date().toISOString().split('T')[0]}`);
    toast.success('Exported activity history to CSV');
  };

  // Print as PDF
  const handlePrintPDF = () => {
    if (!logs.length) {
      toast.info('No activity logs available to print');
      return;
    }
    const headers = ['Time', 'User', 'Category', 'Action / Event Summary'];
    const rows = logs.map(l => [
      l.created_at || '-',
      l.username || 'System',
      (l.entity_type || 'General').toUpperCase(),
      l.action || '-'
    ]);
    printTableAsPDF({
      title: 'UUDS Aviation Training Compliance - Change History Log',
      subtitle: `Exported on ${new Date().toLocaleString('en-GB')} | Total Records: ${logs.length}`,
      headers,
      rows
    });
  };

  // Helper to parse details JSON safely
  const parseDetails = (detailsStr) => {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return null;
    }
  };

  // Helper for Category configuration
  const getCategoryConfig = (item) => {
    const rawType = (item.entity_type || '').toLowerCase();
    const action = (item.action || '').toLowerCase();

    if (rawType === 'training_record' || action.includes('course') || action.includes('training')) {
      return {
        label: 'Training',
        icon: Table,
        colorClass: isDark ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
      };
    }
    if (rawType === 'employee' || action.includes('employee') || action.includes('staff')) {
      return {
        label: 'Staff Roster',
        icon: Users,
        colorClass: isDark ? 'bg-purple-500/15 text-purple-400 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'
      };
    }
    if (rawType === 'course') {
      return {
        label: 'Catalogue',
        icon: BookOpen,
        colorClass: isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    }
    if (rawType === 'user' || action.includes('user') || action.includes('password') || action.includes('login')) {
      return {
        label: 'Security',
        icon: ShieldCheck,
        colorClass: isDark ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
      };
    }
    if (rawType === 'email' || action.includes('email') || action.includes('notice') || action.includes('whatsapp')) {
      return {
        label: 'Alerts',
        icon: Mail,
        colorClass: isDark ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200'
      };
    }
    return {
      label: 'System',
      icon: SettingsIcon,
      colorClass: isDark ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-slate-100 text-slate-700 border-slate-300'
    };
  };

  // Helper for friendly timestamp formatting
  const formatFriendlyTime = (dateStr) => {
    if (!dateStr) return { primary: '-', secondary: '' };
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      const now = new Date();
      const diffSec = Math.floor((now - date) / 1000);

      let relative = '';
      if (diffSec < 60) relative = 'Just now';
      else if (diffSec < 3600) relative = `${Math.floor(diffSec / 60)}m ago`;
      else if (diffSec < 86400) relative = `${Math.floor(diffSec / 3600)}h ago`;
      else relative = formatDate(date);

      const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      return {
        relative,
        exact: `${formatDate(date)} ${timeStr}`
      };
    } catch {
      return { relative: dateStr, exact: dateStr };
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 min-h-0">
      {/* Standardized 2-Line Header */}
      <PageHeader
        icon={HistoryIcon}
        title="Training Records & Activity Change History"
        subtitle="Real-time audit trail to monitor training changes, employee updates, course renewals, and system activity"
        theme="sky"
        actions={
          <>
            <button
              onClick={() => loadAuditLogs(true)}
              disabled={refreshing}
              title="Refresh change history"
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700 hover:text-sky-300' 
                  : 'bg-white border-slate-300 text-sky-700 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              title="Export history logs to CSV"
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300' 
                  : 'bg-white border-slate-300 text-emerald-700 hover:bg-slate-50'
              }`}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={handlePrintPDF}
              title="Print / Save history log as PDF"
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowClearConfirm(true)}
                title="Clear all audit logs"
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm ${
                  isDark
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-400 hover:bg-rose-900/60'
                    : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </>
        }
      />

      {/* Control Strip: All Filters in One Line */}
      <div className={`p-2 sm:px-3 rounded-xl border flex items-center gap-2.5 shrink-0 overflow-x-auto ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Search Input */}
        <div className="relative min-w-[190px] sm:w-64 shrink-0">
          <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff, course, user..."
            className={`w-full pl-8 pr-7 py-1.5 rounded-lg text-xs font-medium border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-sky-500' 
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
            }`}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className={`h-5 w-px shrink-0 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* Category Filter Pills in one line */}
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'training', label: 'Training Records', count: stats.training },
            { id: 'employee', label: 'Staff Roster', count: stats.employees },
            { id: 'course', label: 'Catalogue', count: stats.courses },
            { id: 'user', label: 'Users & Security', count: stats.users },
            { id: 'email', label: 'Alerts', count: stats.emails },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 shrink-0 ${
                category === tab.id
                  ? isDark 
                    ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_10px_rgba(14,165,233,0.3)]' 
                    : 'bg-sky-500 border-sky-500 text-white shadow-sm'
                  : isDark 
                    ? 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200' 
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                category === tab.id
                  ? isDark ? 'bg-sky-500/30 text-sky-200' : 'bg-white/20 text-white'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className={`h-5 w-px shrink-0 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

        {/* User Filter Dropdown */}
        <select
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none shrink-0 ${
            isDark 
              ? 'bg-slate-950 border-slate-700 text-slate-200' 
              : 'bg-slate-50 border-slate-300 text-slate-700'
          }`}
        >
          <option value="all">All Operators</option>
          {availableUsers.map(u => (
            <option key={u} value={u}>User: {u}</option>
          ))}
        </select>

        {/* Timeframe Filter Dropdown */}
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border outline-none shrink-0 ${
            isDark 
              ? 'bg-slate-950 border-slate-700 text-slate-200' 
              : 'bg-slate-50 border-slate-300 text-slate-700'
          }`}
        >
          <option value="all">All Time</option>
          <option value="today">Today Only</option>
          <option value="week">Past 7 Days</option>
          <option value="month">Past 30 Days</option>
        </select>
      </div>

      {/* Main Audit History Table */}
      <div className={`flex-1 min-h-0 rounded-2xl border overflow-hidden flex flex-col shadow-md ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
              <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Loading Activity & Change History...
              </p>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 gap-2">
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                <HistoryIcon className="w-8 h-8" />
              </div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                No Activity Records Found
              </h3>
              <p className={`text-xs max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {search || category !== 'all' || userFilter !== 'all' || timeframe !== 'all'
                  ? 'No records match your selected filters. Try clearing your search or filters.'
                  : 'All recorded training updates and system activities will appear here in real-time.'}
              </p>
              {(search || category !== 'all' || userFilter !== 'all' || timeframe !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCategory('all');
                    setUserFilter('all');
                    setTimeframe('all');
                  }}
                  className="mt-2 text-xs font-bold text-sky-500 hover:underline"
                >
                  Reset all filters
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className={`sticky top-0 z-10 text-[11px] font-black uppercase tracking-wider border-b backdrop-blur-md ${
                isDark 
                  ? 'bg-sky-950/90 text-sky-200 border-sky-500/40' 
                  : 'bg-sky-100 text-sky-950 border-sky-300'
              }`}>
                <tr>
                  <th className={`py-3 px-4 w-40 ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>Date & Time</th>
                  <th className={`py-3 px-4 w-32 ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>User</th>
                  <th className={`py-3 px-4 w-36 ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>Category</th>
                  <th className={`py-3 px-4 ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>Action / Event Details</th>
                  <th className={`py-3 px-4 w-48 text-right ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>Reference</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'
              }`}>
                {logs.map((log) => {
                  const cat = getCategoryConfig(log);
                  const CatIcon = cat.icon;
                  const timeInfo = formatFriendlyTime(log.created_at);
                  const details = parseDetails(log.details);

                  return (
                    <tr 
                      key={log.id} 
                      className={`transition-colors hover:bg-sky-500/5 group`}
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold flex items-center gap-1.5">
                          <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-blue-600'}`} />
                          <span className="font-mono">{timeInfo.relative}</span>
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {timeInfo.exact}
                        </div>
                      </td>

                      {/* Operator / User Badge */}
                      <td className="py-3 px-4 align-top">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-500/10 border border-slate-500/20 font-medium">
                          {log.username === 'admin' || log.username === 'nsilva' ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          <span className="font-bold tracking-tight">{log.username || 'system'}</span>
                        </div>
                      </td>

                      {/* Category Pill */}
                      <td className="py-3 px-4 align-top">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${cat.colorClass}`}>
                          <CatIcon className="w-3 h-3" />
                          {cat.label}
                        </span>
                      </td>

                      {/* Action & Changes Summary */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-slate-100 dark:text-slate-100 font-sans leading-relaxed">
                          <span className={`${isDark ? 'text-slate-200' : 'text-slate-900'} font-semibold`}>
                            {log.action}
                          </span>
                        </div>

                        {/* Rich Change Visualizer (old vs new expiry or status) */}
                        {details && (details.new_expiry || details.new_status || details.notes) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                            {details.new_expiry && (
                              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono ${
                                isDark ? 'bg-slate-950 border-slate-800 text-sky-300' : 'bg-slate-100 border-slate-200 text-blue-900'
                              }`}>
                                <Calendar className="w-3 h-3 text-sky-400" />
                                <span>Expiry: {details.previous_expiry ? `${details.previous_expiry} ➔ ` : ''}{details.new_expiry}</span>
                              </div>
                            )}

                            {details.new_status && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                details.new_status === 'Valid'
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : details.new_status === 'Due Within 30 Days'
                                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                  : details.new_status === 'Overdue'
                                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                  : 'bg-slate-500/15 border-slate-500/30 text-slate-400'
                              }`}>
                                {details.new_status}
                              </span>
                            )}

                            {details.notes && (
                              <span className={`italic text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                "{details.notes}"
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Quick Reference / Profile Opener */}
                      <td className="py-3 px-4 align-top text-right">
                        {(log.entity_id && (log.entity_type === 'employee' || log.entity_type === 'training_record')) && onSelectEmployee && (
                          <button
                            onClick={() => onSelectEmployee(log.entity_id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              isDark 
                                ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700 hover:text-sky-300' 
                                : 'bg-slate-100 border-slate-200 text-blue-700 hover:bg-slate-200'
                            }`}
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className={`text-[10px] font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          #LOG-{log.id}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer: Status & Counts */}
        <div className={`px-4 py-2.5 border-t flex items-center justify-between text-xs shrink-0 ${
          isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div>
            Showing <span className="font-bold text-sky-500">{logs.length}</span> of <span className="font-bold text-sky-500">{totalCount}</span> activity records
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[11px]">Audit Engine Active</span>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
        title="Clear Activity & Change History?"
        message="Are you sure you want to permanently clear all audit history records? This action cannot be undone."
        confirmText={clearing ? 'Clearing...' : 'Clear All Records'}
        type="danger"
      />
    </div>
  );
}
