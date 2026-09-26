import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Users, 
  MessageCircle, 
  ArrowUpRight, 
  Layers, 
  Sparkles, 
  TrendingUp 
} from 'lucide-react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/dateUtils';
import { openWhatsApp, formatWhatsAppComplianceMessage } from '../utils/whatsapp';
import PageHeader from '../components/PageHeader';

export default function Dashboard({ onNavigate, onSelectEmployee }) {
  const { isDark } = useTheme();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      toast.error(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsAppReminder = (emp, courseName, expiryDate) => {
    const rawMobile = emp.mobile_no || '';
    if (!rawMobile) {
      toast.warning(`No mobile number recorded for ${emp.full_name}. Please update in profile.`);
      return;
    }
    const message = formatWhatsAppComplianceMessage({
      fullName: emp.full_name,
      courses: [{
        code: emp.course_code || 'TRAIN',
        name: courseName || emp.course_name,
        expiry_date: expiryDate || emp.expiry_date,
        status: emp.status || 'Due Within 30 Days'
      }]
    });
    openWhatsApp(rawMobile, message);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Loading compliance dashboard...</p>
        </div>
      </div>
    );
  }

  const { records, active_employees_count, compliance_rate, teams, top_overdue_courses, urgent_records } = stats;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Top Standardized Frozen 2-Line Header */}
      <PageHeader
        icon={Sparkles}
        theme="sky"
        title="Technical Manpower Compliance Overview"
        subtitle={`Tracking ${active_employees_count} active staff across 21 mandatory aviation safety, GCAA, and EASA Part 145 courses.`}
        actions={
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('employees')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
              }`}
            >
              <Users className="w-4 h-4 text-blue-500" />
              <span>Staff Roster</span>
            </button>
            <button
              onClick={() => onNavigate('reminders')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg transition"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Urgent Matrix ({((records?.overdue_count || 0) + (records?.due_soon_count || 0)).toLocaleString()})</span>
            </button>
          </div>
        }
      />

      {/* 4 Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Valid / Compliant */}
        <div className={`card-hover-3d p-6 rounded-3xl border shadow-lg ${
          isDark ? 'bg-slate-900/80 border-emerald-500/30' : 'bg-white border-emerald-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              Valid & Compliant
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-emerald-500 font-mono">
              {(records?.valid_count ?? 0).toLocaleString()}
            </span>
            <span className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>records</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${compliance_rate}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-500 font-mono">{compliance_rate}%</span>
          </div>
        </div>

        {/* Due Within 30 Days */}
        <div 
          onClick={() => onNavigate('reminders')}
          className={`card-hover-3d cursor-pointer p-6 rounded-3xl border shadow-lg ${
            isDark ? 'bg-slate-900/80 border-amber-500/30' : 'bg-white border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Due Within 30 Days
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-amber-500 font-mono">
              {(records?.due_soon_count ?? 0).toLocaleString()}
            </span>
            <span className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>courses expiring</span>
          </div>
          <p className="mt-3 text-xs text-amber-500 font-semibold flex items-center gap-1">
            <span>Requires recurrent booking</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* Overdue */}
        <div 
          onClick={() => onNavigate('reminders')}
          className={`card-hover-3d cursor-pointer p-6 rounded-3xl border shadow-lg ${
            isDark ? 'bg-slate-900/80 border-red-500/40' : 'bg-white border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">
              Overdue Training
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
              <XCircle className="w-5 h-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-red-500 font-mono">
              {(records?.overdue_count ?? 0).toLocaleString()}
            </span>
            <span className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>courses expired</span>
          </div>
          <p className="mt-3 text-xs text-red-500 font-bold flex items-center gap-1">
            <span>High priority audit risk</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* Not Recorded */}
        <div className={`card-hover-3d p-6 rounded-3xl border shadow-lg ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Not Recorded / Pending
            </span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
              <HelpCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className={`text-3xl font-extrabold font-mono ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {(records?.not_recorded_count ?? 0).toLocaleString()}
            </span>
            <span className={`text-xs ml-2 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>pending record</span>
          </div>
          <p className={`mt-3 text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Newly assigned staff
          </p>
        </div>
      </div>

      {/* 2-Column Section: Team Breakdown & Top Overdue Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Compliance Progress */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-xl space-y-4 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-500" />
              <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Compliance Rate by Department & Team</h2>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Active Personnel</span>
          </div>

          <div className="space-y-3 mt-2">
            {teams.slice(0, 8).map((team) => (
              <div key={team.team_name} className={`p-3 rounded-2xl border ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{team.team_name}</span>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>({team.employee_count} staff)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {team.overdue > 0 && (
                      <span className="text-xs font-semibold text-red-500 font-mono">
                        {team.overdue} overdue
                      </span>
                    )}
                    <span className={`text-xs font-mono font-bold ${
                      team.compliance_rate >= 75 ? 'text-emerald-500' : team.compliance_rate >= 50 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {team.compliance_rate}%
                    </span>
                  </div>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div 
                    title={`Valid: ${team.valid}`}
                    className="bg-emerald-500 h-full"
                    style={{ width: `${team.total > 0 ? (team.valid / team.total) * 100 : 0}%` }}
                  />
                  <div 
                    title={`Due in 30 Days: ${team.due_soon}`}
                    className="bg-amber-400 h-full"
                    style={{ width: `${team.total > 0 ? (team.due_soon / team.total) * 100 : 0}%` }}
                  />
                  <div 
                    title={`Overdue: ${team.overdue}`}
                    className="bg-red-500 h-full"
                    style={{ width: `${team.total > 0 ? (team.overdue / team.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Overdue Courses */}
        <div className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold">Top Overdue Courses</h2>
            </div>
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Certifications with the highest number of expired personnel:
            </p>

            <div className="space-y-3">
              {top_overdue_courses.map((course) => (
                <div key={course.code} className={`p-3 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-950/60 border-red-500/20' : 'bg-red-50/50 border-red-200'
                }`}>
                  <div className="flex-1 pr-2">
                    <span className="text-xs font-mono font-bold text-red-500">{course.code}</span>
                    <p className="text-xs font-semibold truncate">{course.name}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-red-500/20 text-red-500 border border-red-500/30 shrink-0">
                    {course.overdue_count} overdue
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`mt-5 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              onClick={() => onNavigate('courses')}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-blue-500 hover:text-blue-600 text-center transition"
            >
              Open Training Catalogue →
            </button>
          </div>
        </div>
      </div>

      {/* Urgent Training Action Table with Frozen Header and DD-Mon-YYYY Dates */}
      <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>⚠️ Immediate Action Matrix: Expiring & Overdue Staff</span>
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Send WhatsApp notification or click to view individual profile.
            </p>
          </div>

          <button
            onClick={() => onNavigate('reminders')}
            className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition"
          >
            <span>View all {records.overdue_count + records.due_soon_count} urgent items</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className={`border rounded-2xl overflow-hidden max-h-96 overflow-y-auto shadow-inner ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-300 bg-white'
        }`}>
          <table className={`w-full text-left border-collapse ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            <thead className={`sticky top-0 z-10 shadow-sm ${isDark ? 'bg-slate-900 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-900 font-extrabold border-b border-slate-300'}`}>
              <tr className="text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-3.5">Employee</th>
                <th className="py-3.5 px-3.5">Team</th>
                <th className="py-3.5 px-3.5">Course</th>
                <th className="py-3.5 px-3.5">Expiry Date</th>
                <th className="py-3.5 px-3.5">Status</th>
                <th className="py-3.5 px-3.5 text-right">Quick Contact</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {urgent_records.map((item, idx) => (
                <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/50'}>
                  <td className="py-3.5 px-3.5">
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
                  <td className={`py-3.5 px-3.5 ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                    <div>{item.team || 'Unassigned'}</div>
                    <div className="text-[11px]">{item.position}</div>
                  </td>
                  <td className="py-3.5 px-3.5">
                    <span className="font-mono font-bold">{item.course_code}</span>
                    <span className={`block truncate max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{item.course_name}</span>
                  </td>
                  <td className={`py-3.5 px-3.5 font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                    {formatDate(item.expiry_date)}
                  </td>
                  <td className="py-3.5 px-3.5">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openWhatsAppReminder(item, item.course_name, item.expiry_date)}
                        title="Send personalized WhatsApp reminder"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 transition flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-semibold hidden sm:inline">WhatsApp</span>
                      </button>
                      <button
                        onClick={() => onSelectEmployee(item.employee_id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        Profile
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
