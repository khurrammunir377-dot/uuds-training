import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Users, 
  MessageCircle, 
  Search, 
  CheckCircle2, 
  RefreshCw, 
  Filter,
  ShieldAlert,
  ArrowUpRight,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/dateUtils';
import { exportToCSV, printTableAsPDF } from '../utils/exportUtils';

export default function Reminders({ onSelectEmployee }) {
  const { isDark } = useTheme();
  const toast = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, [filterType, teamFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = { filter_type: filterType };
      if (teamFilter !== 'All') params.team = teamFilter;
      if (search.trim()) params.search = search.trim();

      const reminderData = await api.getReminders(params);
      setReminders(reminderData || []);
    } catch (err) {
      toast.error(`Failed to load urgent reminders: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = (item) => {
    const rawMobile = item.mobile_no || '';
    if (!rawMobile) {
      toast.warning(`No mobile number on file for ${item.full_name}. Please update in profile.`);
      return;
    }
    let clean = rawMobile.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '971' + clean.slice(1);
    } else if (clean.length === 9) {
      clean = '971' + clean;
    }

    const isOverdue = item.status === 'Overdue';
    const urgency = isOverdue ? 'OVERDUE' : 'due for renewal';
    const formattedDate = formatDate(item.expiry_date);
    const daysNotice = isOverdue 
      ? `expired on ${formattedDate} (+${Math.abs(item.days_diff || 0)} days overdue)` 
      : `expires on ${formattedDate} (${item.days_diff || 0} days remaining)`;

    const msg = encodeURIComponent(
      `Dear ${item.full_name},\n\n` +
      `This is an urgent training compliance notification from UUDS Aero (DXB).\n` +
      `Your mandatory certification for "${item.course_code} - ${item.course_name}" is ${urgency} (${daysNotice}).\n\n` +
      `Please coordinate immediately with the Training Department to schedule your recurrent training.\n\n` +
      `Best regards,\nManager Training, UUDS Aero (DXB)`
    );
    const waWin = window.open(`https://wa.me/${clean}?text=${msg}`, 'uuds_whatsapp_window');
    if (waWin) waWin.focus();
  };

  const overdueCount = reminders.filter(r => r.status === 'Overdue').length;
  const dueSoonCount = reminders.filter(r => r.status === 'Due Within 30 Days').length;
  const uniquePersonnel = new Set(reminders.map(r => r.employee_id)).size;
  const teams = ['All', ...new Set(reminders.map(r => r.team).filter(Boolean))];

  const filteredItems = reminders.filter(item => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      item.uuds_no?.toLowerCase().includes(s) ||
      item.full_name?.toLowerCase().includes(s) ||
      item.course_code?.toLowerCase().includes(s) ||
      item.course_name?.toLowerCase().includes(s) ||
      item.mobile_no?.includes(s)
    );
  });

  const handleExportExcel = () => {
    const headers = [
      { label: 'Status', key: 'status' },
      { label: 'UUDS No', key: 'uuds_no' },
      { label: 'Staff No', key: 'contingent_id' },
      { label: 'Full Name', key: 'full_name' },
      { label: 'Position', key: 'position' },
      { label: 'Team', key: 'team' },
      { label: 'Mobile No', key: 'mobile_no' },
      { label: 'Course Code', key: 'course_code' },
      { label: 'Course Name', key: 'course_name' },
      { label: 'Expiry Date', key: 'expiry_date' },
      { label: 'Days Remaining/Overdue', key: 'days_diff' }
    ];
    exportToCSV(filteredItems, headers, `UUDS_Urgent_Training_Matrix_${filterType}_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${filteredItems.length} urgent records to Excel CSV!`);
  };

  const handleExportPDF = () => {
    const headers = ['Status', 'UUDS No', 'Full Name', 'Team', 'Mobile', 'Course Code & Name', 'Expiry Date', 'Notice'];
    const rows = filteredItems.map(item => [
      item.status,
      item.uuds_no,
      item.full_name,
      item.team || '-',
      item.mobile_no || '-',
      `${item.course_code}: ${item.course_name}`,
      formatDate(item.expiry_date),
      item.days_diff !== null && item.days_diff !== undefined
        ? item.days_diff < 0 ? `+${Math.abs(item.days_diff)}d overdue` : `${item.days_diff}d remaining`
        : '-'
    ]);
    printTableAsPDF({
      title: 'Urgent Compliance Training Matrix',
      subtitle: `Filter: ${filterType} • Total: ${filteredItems.length} items requiring immediate action`,
      headers,
      rows
    });
  };

  return (
    <div className="space-y-5 animate-fade-in flex flex-col h-[calc(100vh-100px)]">
      {/* Header Banner */}
      <div className={`shrink-0 p-5 rounded-3xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isDark 
          ? 'bg-gradient-to-r from-red-950/40 via-slate-900 to-amber-950/30 border-slate-800' 
          : 'bg-gradient-to-r from-red-50 via-white to-amber-50 border-slate-200 shadow-sm'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              GCAA & EASA Mandatory Expiry Radar
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Urgent Compliance Actions
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Prioritized tracking of technical staff with certifications that are overdue or due within 30 days.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            title="Export Urgent Records to Excel"
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition shadow-sm ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            title="Print or Save as PDF"
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition shadow-sm ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-blue-500" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Summary KPI Cards */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Urgent */}
        <div className={`p-4 rounded-2xl border shadow-sm ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Total Urgent Actions
            </span>
            <AlertTriangle className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {reminders.length}
            </span>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>records</span>
          </div>
        </div>

        {/* Critical Overdue */}
        <div 
          onClick={() => setFilterType('Overdue')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-sm ${
            filterType === 'Overdue'
              ? 'border-red-500 ring-2 ring-red-500/20'
              : isDark ? 'bg-slate-900/80 border-red-500/30' : 'bg-white border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-500">
              Critical Overdue
            </span>
            <XCircle className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-red-500">
              {overdueCount}
            </span>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>expired</span>
          </div>
        </div>

        {/* Due in 30 Days */}
        <div 
          onClick={() => setFilterType('Due Soon')}
          className={`cursor-pointer p-4 rounded-2xl border transition shadow-sm ${
            filterType === 'Due Soon'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : isDark ? 'bg-slate-900/80 border-amber-500/30' : 'bg-white border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Due Within 30 Days
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold font-mono text-amber-500">
              {dueSoonCount}
            </span>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>approaching</span>
          </div>
        </div>

        {/* Affected Personnel */}
        <div className={`p-4 rounded-2xl border shadow-sm ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Affected Staff
            </span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {uniquePersonnel}
            </span>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>technicians</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar - Frozen */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className={`flex items-center gap-1.5 border p-1 rounded-xl text-xs font-bold ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}>
            <button
              onClick={() => setFilterType('All')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === 'All' ? 'bg-blue-600 text-white shadow' : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Urgent ({reminders.length})
            </button>
            <button
              onClick={() => setFilterType('Overdue')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === 'Overdue' ? 'bg-red-600 text-white shadow' : 'text-red-500 hover:text-red-400'
              }`}
            >
              🚨 Overdue ({overdueCount})
            </button>
            <button
              onClick={() => setFilterType('Due Soon')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterType === 'Due Soon' ? 'bg-amber-600 text-white shadow' : 'text-amber-500 hover:text-amber-400'
              }`}
            >
              ⚠️ Due in 30 Days ({dueSoonCount})
            </button>
          </div>

          {teams.length > 2 && (
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border font-medium ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {teams.map((t) => (
                <option key={t} value={t}>{t === 'All' ? 'All Departments' : t}</option>
              ))}
            </select>
          )}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by staff, UUDS, course, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* Scrollable Reminders Table with Frozen Header and Clean Light Mode Colors */}
      <div className={`border rounded-2xl overflow-hidden flex-1 flex flex-col shadow-xl ${
        isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-300 bg-white'
      }`}>
        <div className="overflow-x-auto flex-1 overflow-y-auto">
          <table className={`w-full text-left text-xs border-collapse ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            {/* Frozen Sticky Header */}
            <thead className={`sticky top-0 z-20 shadow-sm ${
              isDark ? 'bg-slate-950 border-b border-slate-800 text-slate-300' : 'bg-slate-100 border-b border-slate-300 text-slate-900 font-extrabold'
            }`}>
              <tr className="text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Department & Position</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-3.5">Expiry Date</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th className="py-3.5 px-4 text-right">Direct Messaging</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading expiry records...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-emerald-500 font-bold">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <span>No training records matching current urgent filters!</span>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.record_id} className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/50'}`}>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => onSelectEmployee(item.employee_id)}
                        className="text-left font-bold hover:text-blue-500 transition"
                      >
                        <div className={isDark ? 'text-slate-100' : 'text-slate-900'}>{item.full_name}</div>
                        <span className="block text-[11px] font-mono text-blue-500 font-bold">
                          {item.uuds_no}
                        </span>
                      </button>
                    </td>

                    <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                      <div>{item.team || 'Unassigned'}</div>
                      <div className="text-[11px] opacity-80">{item.position}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold">{item.course_code}</span>
                      <span className={`block truncate max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.course_name}</span>
                    </td>

                    <td className={`py-3.5 px-3.5 font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                      {formatDate(item.expiry_date)}
                    </td>

                    <td className="py-3.5 px-3.5">
                      <StatusBadge 
                        status={item.status} 
                        size="sm" 
                        daysLeft={item.days_diff} 
                      />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openWhatsApp(item)}
                          title="Open WhatsApp chat with formatted alert"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => onSelectEmployee(item.employee_id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                            isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                          }`}
                        >
                          Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
