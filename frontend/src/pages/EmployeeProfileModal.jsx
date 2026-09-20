import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  Phone, 
  Briefcase, 
  Layers, 
  MessageCircle, 
  Edit3, 
  Check, 
  History, 
  Printer, 
  Shield, 
  RefreshCw,
  Save
} from 'lucide-react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Feb' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Apr' },
  { value: '05', label: 'May' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Aug' },
  { value: '09', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

function calculateExpiry(compDateStr, validityMonths) {
  if (!compDateStr) return '';
  const months = Number(validityMonths) || 24;
  const parts = compDateStr.split('-');
  if (parts.length < 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  dt.setMonth(dt.getMonth() + months);
  const expY = dt.getFullYear();
  const expM = String(dt.getMonth() + 1).padStart(2, '0');
  const expD = String(dt.getDate()).padStart(2, '0');
  return `${expY}-${expM}-${expD}`;
}

export default function EmployeeProfileModal({ employeeId, onClose, onRefresh }) {
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' or 'history'

  // Inline course editing state
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editDay, setEditDay] = useState('20');
  const [editMonth, setEditMonth] = useState('09');
  const [editYear, setEditYear] = useState('2026');
  const [isManualExpiryOverride, setIsManualExpiryOverride] = useState(false);
  const [editFormData, setEditFormData] = useState({
    completion_date: '',
    expiry_date: '',
    notes: ''
  });
  const [savingRecord, setSavingRecord] = useState(false);

  // Edit employee details state
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [empFormData, setEmpFormData] = useState({});

  useEffect(() => {
    if (employeeId) {
      loadProfile();
    }
  }, [employeeId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployeeProfile(employeeId);
      setProfile(data);
      setEmpFormData({
        uuds_no: data.uuds_no,
        contingent_id: data.contingent_id || '',
        full_name: data.full_name,
        position: data.position || '',
        team: data.team || '',
        mobile_no: data.mobile_no || '',
        dxb_start_date: data.dxb_start_date || '',
        employment_status: data.employment_status || 'Active',
        notes: data.notes || ''
      });
    } catch (err) {
      toast.error(`Failed to load staff profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditCourse = (course) => {
    setEditingCourseId(course.course_id);
    setIsManualExpiryOverride(false);

    const now = new Date();
    const currentYear = String(now.getFullYear()); // 2026
    let initDay = String(now.getDate()).padStart(2, '0');
    let initMonth = String(now.getMonth() + 1).padStart(2, '0');
    let initYear = currentYear; // Year is auto-filled to current year

    if (course.completion_date && /^\d{4}-\d{2}-\d{2}/.test(String(course.completion_date))) {
      const parts = String(course.completion_date).slice(0, 10).split('-');
      initDay = parts[2];
      initMonth = parts[1];
    }

    setEditDay(initDay);
    setEditMonth(initMonth);
    setEditYear(initYear);

    const compDate = `${initYear}-${initMonth}-${initDay}`;
    const autoExpiry = calculateExpiry(compDate, course.validity_months || 24);

    setEditFormData({
      completion_date: compDate,
      expiry_date: autoExpiry,
      notes: course.notes || ''
    });
  };

  const handleDateChange = (newDay, newMonth, newYear, validityMonths) => {
    setEditDay(newDay);
    setEditMonth(newMonth);
    setEditYear(newYear);
    const compDate = `${newYear}-${newMonth}-${newDay}`;
    const autoExpiry = calculateExpiry(compDate, validityMonths || 24);
    setEditFormData(prev => ({
      ...prev,
      completion_date: compDate,
      expiry_date: isManualExpiryOverride ? prev.expiry_date : autoExpiry
    }));
  };

  const handleSaveCourseRecord = async (courseId, recordId) => {
    setSavingRecord(true);
    try {
      if (recordId) {
        await api.updateRecord(recordId, editFormData);
      } else {
        await api.updateEmployeeCourse(employeeId, courseId, editFormData);
      }
      toast.success('Training record and compliance status updated!');
      setEditingCourseId(null);
      await loadProfile();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setSavingRecord(false);
    }
  };

  const handleSaveEmployeeInfo = async (e) => {
    e.preventDefault();
    try {
      await api.updateEmployee(employeeId, empFormData);
      toast.success('Employee profile updated successfully!');
      setIsEditingEmployee(false);
      await loadProfile();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(`Failed to update profile: ${err.message}`);
    }
  };

  const openWhatsApp = () => {
    const rawMobile = profile?.mobile_no || '';
    if (!rawMobile) {
      toast.warning('No mobile number registered. Please click Edit Info to add one.');
      return;
    }
    let clean = rawMobile.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '971' + clean.slice(1);
    } else if (clean.length === 9) {
      clean = '971' + clean;
    }

    const pendingCourses = (profile.courses || [])
      .filter(c => c.status === 'Overdue' || c.status === 'Due Within 30 Days')
      .map(c => `- ${c.course_code}: ${c.course_name} (Expiry: ${formatDate(c.expiry_date)} - ${c.status})`)
      .join('\n');

    let text = `Dear ${profile.full_name},\n\nThis is an official compliance notification regarding your aviation training records.\n`;
    if (pendingCourses) {
      text += `The following certifications require immediate renewal:\n${pendingCourses}\n\n`;
    } else {
      text += `All your current aviation safety certifications are valid and compliant. Thank you.\n\n`;
    }
    text += `Best regards,\nManager Training, UUDS Aero (DXB)`;

    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const printRecord = () => {
    window.print();
  };

  if (!employeeId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-hidden">
      {/* Expanded Modal Box for maximum space and visibility */}
      <div className={`border rounded-3xl max-w-7xl w-[96vw] h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in my-auto transition-colors ${
        isDark 
          ? 'bg-slate-900 border-slate-700 text-slate-100' 
          : 'bg-white border-slate-300 text-slate-900'
      }`}>
        
        {/* Frozen Modal Top Header */}
        <div className={`px-6 py-3.5 border-b flex items-center justify-between no-print shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-blue-500 uppercase tracking-wider">
              Staff Training Profile
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={printRecord}
              title="Print Employee Training Record"
              className={`p-2 rounded-xl transition ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading || !profile ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Loading staff profile...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* FROZEN TOP HEADING & BIO AREA - STRICTLY FROZEN, NEVER MOVES */}
            <div className={`shrink-0 px-6 pt-4 pb-3 border-b space-y-3 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}>
              {/* Employee Bio Card */}
              <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-colors ${
                isDark 
                  ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 border-slate-800' 
                  : 'bg-white border-slate-200'
              }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-glow-blue border border-blue-400/30 shrink-0">
                    {profile.full_name ? profile.full_name.slice(0, 2).toUpperCase() : 'ST'}
                  </div>

                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-extrabold tracking-tight">
                        {profile.full_name}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {profile.uuds_no}
                      </span>
                      {profile.contingent_id && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}>
                          Staff #{profile.contingent_id}
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        profile.employment_status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {profile.employment_status}
                      </span>
                    </div>

                    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                        <span>Role: <strong>{profile.position || 'N/A'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-500" />
                        <span>Team: <strong>{profile.team || 'Unassigned'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-mono font-bold">{profile.mobile_no || 'No Mobile Registered'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>Start: <strong>{formatDate(profile.dxb_start_date)}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 no-print">
                  <button
                    onClick={openWhatsApp}
                    title="Send personal WhatsApp reminder message"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/30 transition hover:scale-105"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp Alert</span>
                  </button>

                  <button
                    onClick={() => setIsEditingEmployee(!isEditingEmployee)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                      isDark 
                        ? 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700' 
                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 text-blue-500" />
                    <span>{isEditingEmployee ? 'Cancel Edit' : 'Edit Info'}</span>
                  </button>
                </div>
              </div>

              {/* Metric Chips */}
              <div className={`mt-4 pt-3.5 border-t grid grid-cols-2 sm:grid-cols-5 gap-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Compliance Rate</span>
                  <span className="text-base font-extrabold font-mono">{profile.stats.compliance_rate}%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-500 block">Valid Courses</span>
                  <span className="text-base font-extrabold text-emerald-500 font-mono">{profile.stats.valid}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-500 block">Due in 30 Days</span>
                  <span className="text-base font-extrabold text-amber-500 font-mono">{profile.stats.due_soon}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-red-500 block">Overdue</span>
                  <span className="text-base font-extrabold text-red-500 font-mono">{profile.stats.overdue}</span>
                </div>
                <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Not Recorded</span>
                  <span className="text-base font-extrabold font-mono">{profile.stats.not_recorded}</span>
                </div>
              </div>
            </div>

            {/* Edit Profile Form (if toggled) */}
            {isEditingEmployee && (
              <form onSubmit={handleSaveEmployeeInfo} className={`p-5 rounded-3xl border shadow-xl space-y-4 animate-scale-in no-print ${
                isDark ? 'bg-slate-950 border-blue-500/30' : 'bg-slate-50 border-blue-300'
              }`}>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-500" />
                  <span>Edit Personal Details & Contact</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">UUDS No *</label>
                    <input
                      type="text"
                      required
                      value={empFormData.uuds_no}
                      onChange={(e) => setEmpFormData({ ...empFormData, uuds_no: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">EK Staff No</label>
                    <input
                      type="text"
                      value={empFormData.contingent_id}
                      onChange={(e) => setEmpFormData({ ...empFormData, contingent_id: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={empFormData.full_name}
                      onChange={(e) => setEmpFormData({ ...empFormData, full_name: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">Mobile No (WhatsApp)</label>
                    <input
                      type="text"
                      value={empFormData.mobile_no}
                      placeholder="050-9525084"
                      onChange={(e) => setEmpFormData({ ...empFormData, mobile_no: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border font-mono ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">Team / Department</label>
                    <input
                      type="text"
                      value={empFormData.team}
                      placeholder="Team A, Team B, Leather..."
                      onChange={(e) => setEmpFormData({ ...empFormData, team: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">Position / Designation</label>
                    <input
                      type="text"
                      value={empFormData.position}
                      onChange={(e) => setEmpFormData({ ...empFormData, position: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">DXB Start Date</label>
                    <input
                      type="date"
                      value={empFormData.dxb_start_date || ''}
                      onChange={(e) => setEmpFormData({ ...empFormData, dxb_start_date: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1 text-slate-400">Employment Status</label>
                    <select
                      value={empFormData.employment_status}
                      onChange={(e) => setEmpFormData({ ...empFormData, employment_status: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="Active">Active</option>
                      <option value="UN Paid Leave">UN Paid Leave</option>
                      <option value="DWC TX">DWC TX</option>
                      <option value="Non Tec.">Non Tec.</option>
                      <option value="RESIGN">RESIGN</option>
                      <option value="Redundancy">Redundancy</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingEmployee(false)}
                    className="px-4 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Profile Navigation Tabs */}
            <div className={`flex items-center gap-3 border-b pb-2 no-print ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'matrix'
                    ? isDark 
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>All Assigned Courses ({profile.courses?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'history'
                    ? isDark 
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Trail & Change History ({profile.audit_logs?.length || 0})</span>
              </button>
            </div>

            </div>

            {/* SCROLLABLE TABLE CONTENT AREA - ONLY ROWS MOVE, HEADINGS FROZEN */}
            <div className="flex-1 overflow-hidden flex flex-col px-6 py-3">
              {/* TAB 1: Complete Training Matrix with FROZEN HEADER */}
              {activeTab === 'matrix' && (
                <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                    <div />

                  {/* Table Container with Frozen Header */}
                  <div className={`border rounded-2xl overflow-hidden flex-1 flex flex-col shadow-lg ${
                    isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-300 bg-white'
                  }`}>
                    <div className="overflow-x-auto flex-1 overflow-y-auto">
                      <table className={`w-full text-left border-collapse text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        {/* Frozen Sticky Header */}
                        <thead className={`sticky top-0 z-20 shadow-sm ${
                          isDark ? 'bg-slate-900 border-b border-slate-800 text-slate-300' : 'bg-slate-100 border-b border-slate-300 text-slate-900 font-extrabold'
                        }`}>
                          <tr className="text-[11px] font-bold uppercase tracking-wider">
                            <th className="py-3.5 px-4">Code</th>
                            <th className="py-3.5 px-4">Course Title</th>
                            <th className="py-3.5 px-3">Validity</th>
                            <th className="py-3.5 px-3">Completion Date</th>
                            <th className="py-3.5 px-3">Expiry Date</th>
                            <th className="py-3.5 px-3">Status</th>
                            <th className="py-3.5 px-4">Notes / Cert #</th>
                            <th className="py-3.5 px-4 text-right no-print">Action</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                          {profile.courses.map((course) => {
                            const isEditing = editingCourseId === course.course_id;

                            return (
                              <tr 
                                key={course.course_code}
                                className={`transition ${
                                  isEditing 
                                    ? isDark ? 'bg-blue-950/40 border-l-4 border-blue-500' : 'bg-blue-50 border-l-4 border-blue-500'
                                    : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                                }`}
                              >
                                <td className="py-3 px-4 font-mono font-bold text-blue-500">
                                  {course.course_code}
                                </td>

                                <td className="py-3 px-4">
                                  <span className={`font-semibold block ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{course.course_name}</span>
                                  <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                                    {course.course_category}
                                  </span>
                                </td>

                                <td className={`py-3 px-3 font-mono ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                                  {course.validity_months ? `${course.validity_months}m` : '-'}
                                </td>

                                {/* Completion Date in DD-Mon-YYYY */}
                                <td className={`py-3 px-3 font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                  {isEditing ? (
                                    <div className="flex items-center gap-1 flex-nowrap">
                                      {/* Day Selector */}
                                      <select
                                        value={editDay}
                                        onChange={(e) => handleDateChange(e.target.value, editMonth, editYear, course.validity_months)}
                                        className={`px-1.5 py-1 rounded-lg border text-xs font-mono font-bold focus:ring-1 focus:ring-blue-500 ${
                                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                        }`}
                                        title="Select Day (01-31)"
                                      >
                                        {DAYS.map(d => (
                                          <option key={d} value={d}>{d}</option>
                                        ))}
                                      </select>

                                      {/* Month Selector */}
                                      <select
                                        value={editMonth}
                                        onChange={(e) => handleDateChange(editDay, e.target.value, editYear, course.validity_months)}
                                        className={`px-2 py-1 rounded-lg border text-xs font-semibold focus:ring-1 focus:ring-blue-500 ${
                                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                        }`}
                                        title="Select Month"
                                      >
                                        {MONTHS.map(m => (
                                          <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                      </select>

                                      {/* Year: Auto-filled */}
                                      <span 
                                        className="px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold"
                                        title="Year is Auto-Filled"
                                      >
                                        {editYear}
                                      </span>
                                    </div>
                                  ) : (
                                    <span>{formatDate(course.completion_date)}</span>
                                  )}
                                </td>

                                {/* Expiry Date (Next Due Date) in DD-Mon-YYYY: Auto-Filled */}
                                <td className="py-3 px-3 font-mono font-bold">
                                  {isEditing ? (
                                    <div className="flex flex-col gap-0.5">
                                      {!isManualExpiryOverride ? (
                                        <div className="flex items-center gap-1.5 flex-nowrap">
                                          <span className="font-mono text-xs font-bold text-emerald-400">
                                            {formatDate(editFormData.expiry_date)}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                            Auto (+{course.validity_months || 24}m)
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setIsManualExpiryOverride(true)}
                                            className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                                            title="Click to manually adjust next due date if needed"
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="date"
                                            value={editFormData.expiry_date}
                                            onChange={(e) => setEditFormData({ ...editFormData, expiry_date: e.target.value })}
                                            className={`px-2 py-1 rounded-lg border text-xs font-mono ring-1 ring-blue-500 ${
                                              isDark ? 'bg-slate-900 border-blue-500 text-white' : 'bg-white border-blue-500 text-slate-900'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setIsManualExpiryOverride(false);
                                              const autoExpiry = calculateExpiry(editFormData.completion_date, course.validity_months || 24);
                                              setEditFormData({ ...editFormData, expiry_date: autoExpiry });
                                            }}
                                            className="text-[10px] text-blue-400 hover:underline font-semibold"
                                            title="Revert to auto-calculated due date"
                                          >
                                            Auto
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className={
                                      course.status === 'Overdue' ? 'text-red-500' : 
                                      course.status === 'Due Within 30 Days' ? 'text-amber-500' : 
                                      course.status === 'Valid' ? 'text-emerald-500' : isDark ? 'text-slate-400' : 'text-slate-600'
                                    }>
                                      {formatDate(course.expiry_date)}
                                    </span>
                                  )}
                                </td>

                                {/* Status Badge */}
                                <td className="py-3 px-3">
                                  <StatusBadge 
                                    status={course.status} 
                                    size="sm" 
                                    daysLeft={course.days_remaining} 
                                  />
                                </td>

                                {/* Notes */}
                                <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      placeholder="Cert # or notes..."
                                      value={editFormData.notes}
                                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                      className={`px-2 py-1 rounded-lg border text-xs w-full ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                      }`}
                                    />
                                  ) : (
                                    <span className="truncate max-w-[150px] block">{course.notes || '-'}</span>
                                  )}
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right no-print">
                                  {isEditing ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveCourseRecord(course.course_id, course.record_id)}
                                        disabled={savingRecord}
                                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center gap-1"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Save</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingCourseId(null)}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleStartEditCourse(course)}
                                      className={`px-3 py-1.5 rounded-lg border font-semibold text-xs transition ${
                                        isDark 
                                          ? 'bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 border-slate-700 text-slate-300' 
                                          : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border-slate-300 text-slate-700'
                                      }`}
                                    >
                                      Update Date
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: History & Audit Log */}
              {activeTab === 'history' && (
                <div className="flex-1 overflow-hidden flex flex-col space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 shrink-0">
                    <History className="w-4 h-4 text-blue-500" />
                    <span>Audit Trail for {profile.full_name}</span>
                  </h3>

                  {profile.audit_logs?.length === 0 ? (
                    <p className={`p-8 text-center text-xs rounded-2xl border ${
                      isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      No manual changes logged yet.
                    </p>
                  ) : (
                    <div className={`border rounded-2xl overflow-hidden flex-1 flex flex-col shadow-lg ${
                      isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-300 bg-white'
                    }`}>
                      <div className="overflow-x-auto flex-1 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className={`sticky top-0 z-20 shadow-sm ${isDark ? 'bg-slate-900 border-b border-slate-800 text-slate-300' : 'bg-slate-100 border-b border-slate-300 text-slate-900 font-extrabold'}`}>
                            <tr className="border-b uppercase font-bold text-[11px]">
                              <th className="py-2.5 px-4">Date & Time</th>
                              <th className="py-2.5 px-4">User</th>
                              <th className="py-2.5 px-4">Action</th>
                              <th className="py-2.5 px-4">Details</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                            {profile.audit_logs.map((log) => (
                              <tr key={log.id}>
                                <td className={`py-2.5 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{formatDateTime(log.created_at)}</td>
                                <td className="py-2.5 px-4 font-bold text-blue-500">{log.username}</td>
                                <td className="py-2.5 px-4">{log.action}</td>
                                <td className={`py-2.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{log.details || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Frozen Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs no-print shrink-0 ${
          isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <span>UUDS Compliance Engine • Real-time status recalculation</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow"
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
}
