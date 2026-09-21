import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  Edit3, 
  Calendar, 
  Clock, 
  Sparkles, 
  ChevronDown, 
  X, 
  Check, 
  Layers, 
  ShieldCheck, 
  CheckSquare, 
  Square,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { exportToCSV, printTableAsPDF } from '../utils/exportUtils';

export default function TrainingMatrix({ onSelectEmployee }) {
  const { isDark } = useTheme();
  const toast = useToast();

  // Data states
  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState({}); // key: `${empId}_${courseId}` -> record
  const [stats, setStats] = useState({ valid: 0, due_soon: 0, overdue: 0, not_recorded: 0, total_cells: 0 });
  const [filterOptions, setFilterOptions] = useState({ teams: [], statuses: [], categories: [] });
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('Active');
  const [selectedTeam, setSelectedTeam] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [complianceHighlight, setComplianceHighlight] = useState('All'); // 'All', 'Valid', 'Due Soon', 'Overdue', 'Not Recorded'

  // Selection for Batch Update
  const [selectedEmpIds, setSelectedEmpIds] = useState(new Set());

  // Quick Inline Edit Modal state
  const [editModal, setEditModal] = useState({
    isOpen: false,
    employee: null,
    course: null,
    record: null,
    completionDate: '',
    expiryDate: '',
    notes: '',
    day: '01',
    month: '01',
    year: '2026',
    expDay: '01',
    expMonth: '01',
    expYear: '2028',
    isManualExpiry: false
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Batch Update Modal state
  const [batchModal, setBatchModal] = useState({
    isOpen: false,
    courseId: '',
    completionDate: '',
    expiryDate: '',
    notes: '',
    day: '01',
    month: '01',
    year: '2026',
    expDay: '01',
    expMonth: '01',
    expYear: '2028'
  });
  const [savingBatch, setSavingBatch] = useState(false);

  const currentYear = new Date().getFullYear();
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = [
    { num: '01', name: 'Jan' },
    { num: '02', name: 'Feb' },
    { num: '03', name: 'Mar' },
    { num: '04', name: 'Apr' },
    { num: '05', name: 'May' },
    { num: '06', name: 'Jun' },
    { num: '07', name: 'Jul' },
    { num: '08', name: 'Aug' },
    { num: '09', name: 'Sep' },
    { num: '10', name: 'Oct' },
    { num: '11', name: 'Nov' },
    { num: '12', name: 'Dec' },
  ];
  const years = Array.from({ length: 15 }, (_, i) => String(currentYear - 3 + i));

  // Load Matrix Data
  useEffect(() => {
    loadMatrix();
  }, [statusTab, selectedTeam, selectedCategory]);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const data = await api.getMatrixData({
        status: statusTab,
        team: selectedTeam !== 'All' ? selectedTeam : '',
        course_category: selectedCategory !== 'All' ? selectedCategory : '',
        search: searchQuery
      });
      setCourses(data.courses || []);
      setEmployees(data.employees || []);
      setRecords(data.records || {});
      setStats(data.stats || { valid: 0, due_soon: 0, overdue: 0, not_recorded: 0, total_cells: 0 });
      setFilterOptions(data.filter_options || { teams: [], statuses: [], categories: [] });
      setSelectedEmpIds(new Set()); // clear selection on reload
    } catch (err) {
      console.error(err);
      toast.error('Failed to load training matrix data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter employees locally by search query for instant responsiveness
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase().trim();
    return employees.filter(emp => 
      (emp.full_name || '').toLowerCase().includes(q) ||
      (emp.uuds_no || '').toLowerCase().includes(q) ||
      (emp.contingent_id || '').toLowerCase().includes(q) ||
      (emp.position || '').toLowerCase().includes(q) ||
      (emp.team || '').toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  // Date Calculation helper
  const calculateExpiry = (completionDateStr, validityMonths = 24) => {
    if (!completionDateStr) return '';
    try {
      const d = new Date(completionDateStr);
      if (isNaN(d.getTime())) return '';
      d.setMonth(d.getMonth() + parseInt(validityMonths || 24));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      return '';
    }
  };

  const formatDateDisplay = (dateStr, notes) => {
    if (notes && String(notes).trim().toUpperCase() === 'YES') {
      return 'YES';
    }
    if (!dateStr) return 'Not Set';
    try {
      const [y, m, d] = dateStr.slice(0, 10).split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${parseInt(d, 10)} ${monthNames[parseInt(m, 10) - 1]} ${y}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Open Quick Edit Modal for a single cell
  const handleCellClick = (emp, course) => {
    const key = `${emp.id}_${course.id}`;
    const rec = records[key] || {};
    const now = new Date();
    
    let initDay = String(now.getDate()).padStart(2, '0');
    let initMonth = String(now.getMonth() + 1).padStart(2, '0');
    let initYear = String(now.getFullYear());

    if (rec.completion_date && /^\d{4}-\d{2}-\d{2}/.test(rec.completion_date)) {
      const parts = rec.completion_date.slice(0, 10).split('-');
      initYear = parts[0];
      initMonth = parts[1];
      initDay = parts[2];
    }

    let expDay = '01';
    let expMonth = '01';
    let expYear = String(parseInt(initYear) + Math.round((course.validity_months || 24) / 12));

    if (rec.expiry_date && /^\d{4}-\d{2}-\d{2}/.test(rec.expiry_date)) {
      const expParts = rec.expiry_date.slice(0, 10).split('-');
      expYear = expParts[0];
      expMonth = expParts[1];
      expDay = expParts[2];
    } else {
      const autoExp = calculateExpiry(`${initYear}-${initMonth}-${initDay}`, course.validity_months || 24);
      if (autoExp) {
        const p = autoExp.split('-');
        expYear = p[0];
        expMonth = p[1];
        expDay = p[2];
      }
    }

    setEditModal({
      isOpen: true,
      employee: emp,
      course: course,
      record: rec,
      completionDate: `${initYear}-${initMonth}-${initDay}`,
      expiryDate: `${expYear}-${expMonth}-${expDay}`,
      notes: rec.notes || '',
      day: initDay,
      month: initMonth,
      year: initYear,
      expDay: expDay,
      expMonth: expMonth,
      expYear: expYear,
      isManualExpiry: false
    });
  };

  // Save Single Cell Record
  const handleSaveCellRecord = async () => {
    if (!editModal.employee || !editModal.course) return;
    setSavingEdit(true);
    try {
      const empId = editModal.employee.id;
      const courseId = editModal.course.id;
      const payload = {
        completion_date: editModal.completionDate,
        expiry_date: editModal.expiryDate,
        notes: editModal.notes
      };

      await api.updateEmployeeCourse(empId, courseId, payload);
      toast.success(`Updated ${editModal.course.code} for ${editModal.employee.full_name}`);

      // Optimistically update matrix state immediately
      const key = `${empId}_${courseId}`;
      const updatedStatus = calculateStatusLocal(payload.expiry_date, payload.notes);
      
      setRecords(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          ...payload,
          status: updatedStatus
        }
      }));

      // Update counters locally
      recalculateStatsLocally(key, updatedStatus);

      setEditModal(prev => ({ ...prev, isOpen: false }));
    } catch (err) {
      toast.error('Failed to update record: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const calculateStatusLocal = (expiryDateStr, notes) => {
    if (notes && String(notes).trim().toUpperCase() === 'YES') return 'Valid';
    if (!expiryDateStr) return 'Not Recorded';
    try {
      const exp = new Date(expiryDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return 'Overdue';
      if (diffDays <= 30) return 'Due Within 30 Days';
      return 'Valid';
    } catch (e) {
      return 'Valid';
    }
  };

  const recalculateStatsLocally = (key, newStatus) => {
    const oldStatus = records[key]?.status || 'Not Recorded';
    if (oldStatus === newStatus) return;

    setStats(prev => {
      const next = { ...prev };
      if (oldStatus === 'Valid') next.valid = Math.max(0, next.valid - 1);
      else if (oldStatus === 'Due Within 30 Days') next.due_soon = Math.max(0, next.due_soon - 1);
      else if (oldStatus === 'Overdue') next.overdue = Math.max(0, next.overdue - 1);
      else next.not_recorded = Math.max(0, next.not_recorded - 1);

      if (newStatus === 'Valid') next.valid += 1;
      else if (newStatus === 'Due Within 30 Days') next.due_soon += 1;
      else if (newStatus === 'Overdue') next.overdue += 1;
      else next.not_recorded += 1;

      return next;
    });
  };

  // Quick Preset Presets for Single Cell Modal
  const applyPreset = (type) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (type === '2years') {
      const expStr = calculateExpiry(todayStr, 24);
      const [ey, em, ed] = expStr.split('-');
      setEditModal(prev => ({
        ...prev,
        completionDate: todayStr,
        expiryDate: expStr,
        day: String(now.getDate()).padStart(2, '0'),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        year: String(now.getFullYear()),
        expDay: ed,
        expMonth: em,
        expYear: ey,
        notes: ''
      }));
    } else if (type === '1year') {
      const expStr = calculateExpiry(todayStr, 12);
      const [ey, em, ed] = expStr.split('-');
      setEditModal(prev => ({
        ...prev,
        completionDate: todayStr,
        expiryDate: expStr,
        day: String(now.getDate()).padStart(2, '0'),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        year: String(now.getFullYear()),
        expDay: ed,
        expMonth: em,
        expYear: ey,
        notes: ''
      }));
    } else if (type === 'permanent') {
      setEditModal(prev => ({
        ...prev,
        completionDate: todayStr,
        expiryDate: '',
        notes: 'YES'
      }));
    } else if (type === 'clear') {
      setEditModal(prev => ({
        ...prev,
        completionDate: '',
        expiryDate: '',
        notes: ''
      }));
    }
  };

  // Selection Checkbox handling
  const toggleSelectAll = () => {
    if (selectedEmpIds.size === filteredEmployees.length) {
      setSelectedEmpIds(new Set());
    } else {
      setSelectedEmpIds(new Set(filteredEmployees.map(e => e.id)));
    }
  };

  const toggleSelectEmp = (id) => {
    setSelectedEmpIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Batch Update Execution
  const handleOpenBatchModal = (preselectedCourseId = '') => {
    if (selectedEmpIds.size === 0) {
      toast.warning('Please select one or more staff members using the row checkboxes.');
      return;
    }
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const expStr = calculateExpiry(todayStr, 24);
    const [ey, em, ed] = expStr.split('-');

    setBatchModal({
      isOpen: true,
      courseId: preselectedCourseId || (courses[0]?.id || ''),
      completionDate: todayStr,
      expiryDate: expStr,
      notes: '',
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
      expDay: ed,
      expMonth: em,
      expYear: ey
    });
  };

  const handleExecuteBatchUpdate = async () => {
    if (!batchModal.courseId) {
      toast.error('Please select a course to update.');
      return;
    }
    setSavingBatch(true);
    try {
      const empIdsArray = Array.from(selectedEmpIds);
      const res = await api.batchUpdateMatrix({
        employee_ids: empIdsArray,
        course_id: parseInt(batchModal.courseId, 10),
        completion_date: batchModal.completionDate,
        expiry_date: batchModal.expiryDate,
        notes: batchModal.notes
      });

      toast.success(res.message || `Updated records for ${empIdsArray.length} employees`);
      setBatchModal(prev => ({ ...prev, isOpen: false }));
      setSelectedEmpIds(new Set());
      await loadMatrix();
    } catch (err) {
      toast.error('Batch update failed: ' + err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredEmployees.length) {
      toast.warning('No data to export.');
      return;
    }

    const headers = [
      { label: 'UUDS No', key: 'uuds_no' },
      { label: 'Staff Name', key: 'full_name' },
      { label: 'Team', key: 'team' },
      { label: 'Role', key: 'position' },
      { label: 'Status', key: 'employment_status' },
      ...courses.map(c => ({ label: `${c.code} (${c.name})`, key: `course_${c.id}` }))
    ];

    const data = filteredEmployees.map(emp => {
      const row = {
        uuds_no: emp.uuds_no,
        full_name: emp.full_name,
        team: emp.team || 'Unassigned',
        position: emp.position || '',
        employment_status: emp.employment_status || 'Active'
      };
      courses.forEach(c => {
        const rec = records[`${emp.id}_${c.id}`];
        if (rec) {
          row[`course_${c.id}`] = rec.notes === 'YES' ? 'YES' : (rec.expiry_date || 'Not Recorded');
        } else {
          row[`course_${c.id}`] = 'Not Recorded';
        }
      });
      return row;
    });

    const filename = `UUDS_Training_Matrix_${statusTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportToCSV(data, headers, filename);
    toast.success('Training matrix exported to CSV successfully!');
  };

  // Print as PDF
  const handlePrint = () => {
    const tableHeaders = ['UUDS No', 'Employee Name', 'Team', ...courses.slice(0, 10).map(c => c.code)];
    const tableRows = filteredEmployees.slice(0, 40).map(emp => [
      emp.uuds_no,
      emp.full_name,
      emp.team || 'N/A',
      ...courses.slice(0, 10).map(c => {
        const rec = records[`${emp.id}_${c.id}`];
        return rec ? (rec.notes === 'YES' ? 'YES' : (rec.expiry_date || '-')) : '-';
      })
    ]);

    printTableAsPDF({
      title: 'Training Compliance Matrix',
      subtitle: `Status: ${statusTab} • Team: ${selectedTeam} • Active Staff: ${filteredEmployees.length}`,
      headers: tableHeaders,
      rows: tableRows
    });
  };

  // Cell styling helper
  const getCellBadgeClass = (status) => {
    if (status === 'Valid') {
      return isDark
        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/90'
        : 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold hover:bg-emerald-200';
    }
    if (status === 'Due Within 30 Days') {
      return isDark
        ? 'bg-amber-950/70 border-amber-500/40 text-amber-300 hover:bg-amber-900/90 animate-pulse'
        : 'bg-amber-100 border-amber-300 text-amber-900 font-bold hover:bg-amber-200';
    }
    if (status === 'Overdue') {
      return isDark
        ? 'bg-rose-950/80 border-rose-500/40 text-rose-300 hover:bg-rose-900/90'
        : 'bg-rose-100 border-rose-300 text-rose-900 font-bold hover:bg-rose-200';
    }
    return isDark
      ? 'bg-slate-900/70 border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800/80'
      : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200';
  };

  const getCellDotColor = (status) => {
    if (status === 'Valid') return 'bg-emerald-500';
    if (status === 'Due Within 30 Days') return 'bg-amber-500 animate-pulse';
    if (status === 'Overdue') return 'bg-rose-500';
    return 'bg-slate-600';
  };

  const totalCompliancePct = stats.total_cells > 0 
    ? Math.round((stats.valid / stats.total_cells) * 100) 
    : 0;

  return (
    <div className="space-y-4 animate-fade-in pb-12">
      {/* Top Banner & Control Area */}
      <div className={`p-4 sm:p-6 rounded-2xl border transition-all duration-200 ${
        isDark 
          ? 'bg-slate-900/80 border-slate-800 backdrop-blur-md text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30">
                <Table className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
                  Training Compliance Matrix
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Fast Date Editor
                  </span>
                </h1>
                <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                  Interactive certification matrix to inspect and quickly update course expiry dates across all staff
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedEmpIds.size > 0 && (
              <button
                onClick={() => handleOpenBatchModal()}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 transition active:scale-95 animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                <span>Batch Update ({selectedEmpIds.size} Selected)</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>

            <button
              onClick={loadMatrix}
              title="Reload matrix data"
              className={`p-2 rounded-xl border transition ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-black'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-5 pt-4 border-t border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['Active', 'All', 'Unpaid Leave', 'DWC TX', 'Non-Technical', 'RESIGN'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusTab === tab
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : isDark
                      ? 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {tab === 'RESIGN' ? 'Resigned' : tab}
              </button>
            ))}
          </div>

          {/* Search & Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff, UUDS No..."
                className={`w-full pl-8 pr-7 py-1.5 rounded-xl text-xs border outline-none transition ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 shadow-sm'
                }`}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Team Dropdown */}
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-medium transition ${
                isDark
                  ? 'bg-slate-950/70 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 shadow-sm'
              }`}
            >
              <option value="All">All Teams</option>
              {filterOptions.teams?.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Course Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-medium transition ${
                isDark
                  ? 'bg-slate-950/70 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-600 shadow-sm'
              }`}
            >
              <option value="All">All Categories</option>
              {filterOptions.categories?.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Legend Bar */}
        <div className={`mt-4 pt-3 border-t border-slate-700/40 flex flex-wrap items-center justify-between text-xs gap-3 ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
              Status Legend:
            </span>

            <button 
              onClick={() => setComplianceHighlight(complianceHighlight === 'Valid' ? 'All' : 'Valid')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition ${
                complianceHighlight === 'Valid' ? 'ring-2 ring-emerald-500 font-bold' : ''
              } ${isDark ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Valid ({stats.valid})</span>
            </button>

            <button 
              onClick={() => setComplianceHighlight(complianceHighlight === 'Due Soon' ? 'All' : 'Due Soon')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition ${
                complianceHighlight === 'Due Soon' ? 'ring-2 ring-amber-500 font-bold' : ''
              } ${isDark ? 'border-amber-500/20 bg-amber-500/10 text-amber-400' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Due Soon ({stats.due_soon})</span>
            </button>

            <button 
              onClick={() => setComplianceHighlight(complianceHighlight === 'Overdue' ? 'All' : 'Overdue')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition ${
                complianceHighlight === 'Overdue' ? 'ring-2 ring-rose-500 font-bold' : ''
              } ${isDark ? 'border-rose-500/20 bg-rose-500/10 text-rose-400' : 'border-rose-300 bg-rose-50 text-rose-900'}`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Overdue ({stats.overdue})</span>
            </button>

            <button 
              onClick={() => setComplianceHighlight(complianceHighlight === 'Not Recorded' ? 'All' : 'Not Recorded')}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition ${
                complianceHighlight === 'Not Recorded' ? 'ring-2 ring-slate-500 font-bold' : ''
              } ${isDark ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-300 bg-slate-100 text-slate-700'}`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Not Recorded ({stats.not_recorded})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>Staff Count: <strong className="text-blue-500">{filteredEmployees.length}</strong></span>
            <span>•</span>
            <span>Compliance: <strong className="text-emerald-500">{totalCompliancePct}%</strong></span>
          </div>
        </div>
      </div>

      {/* Interactive Matrix Grid */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Loading Training Matrix Data...
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-16 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
            <h3 className="text-base font-bold">No Staff Members Found</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
              Try adjusting your search query, status tabs, or team filters.
            </p>
          </div>
        ) : (
          <div className="relative overflow-x-auto max-h-[72vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-xs">
              {/* Sticky Table Header */}
              <thead className={`sticky top-0 z-20 ${
                isDark ? 'bg-slate-950 text-slate-200 border-b border-slate-800' : 'bg-slate-100 text-slate-800 border-b border-slate-300'
              }`}>
                <tr>
                  {/* Select All Checkbox */}
                  <th className={`p-3 sticky left-0 z-30 w-10 text-center ${
                    isDark ? 'bg-slate-950' : 'bg-slate-100'
                  }`}>
                    <button 
                      onClick={toggleSelectAll}
                      title="Select all staff in view"
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      {selectedEmpIds.size > 0 && selectedEmpIds.size === filteredEmployees.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>

                  {/* Frozen Employee Column */}
                  <th className={`p-3 sticky left-10 z-30 min-w-[210px] max-w-[210px] font-black uppercase tracking-wider text-[11px] ${
                    isDark ? 'bg-slate-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : 'bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                  }`}>
                    Staff Member
                  </th>

                  {/* Frozen UUDS No Column */}
                  <th className={`p-3 sticky left-[250px] z-30 min-w-[110px] max-w-[110px] font-black uppercase tracking-wider text-[11px] ${
                    isDark ? 'bg-slate-950 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.7)]' : 'bg-slate-100 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]'
                  }`}>
                    UUDS ID
                  </th>

                  {/* Course Columns */}
                  {courses.map(course => (
                    <th 
                      key={course.id}
                      className="p-3 min-w-[140px] max-w-[150px] font-bold text-center border-l border-slate-700/30 group"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-blue-400 font-extrabold text-[11px]">
                          {course.code}
                        </span>
                        <span className="truncate w-full text-center text-[11px] font-semibold" title={course.name}>
                          {course.name}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                            isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {course.validity_months || 24}m
                          </span>
                          <button
                            onClick={() => handleOpenBatchModal(String(course.id))}
                            title={`Batch set date for ${course.code}`}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-blue-400 transition"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body Rows */}
              <tbody className="divide-y divide-slate-800/40">
                {filteredEmployees.map((emp, idx) => {
                  const isSelected = selectedEmpIds.has(emp.id);
                  return (
                    <tr 
                      key={emp.id}
                      className={`transition-colors group ${
                        isSelected 
                          ? isDark ? 'bg-blue-950/30' : 'bg-blue-50/70' 
                          : idx % 2 === 0 
                            ? isDark ? 'bg-slate-900/40' : 'bg-white' 
                            : isDark ? 'bg-slate-900/80' : 'bg-slate-50'
                      } ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-blue-50/50'}`}
                    >
                      {/* Checkbox */}
                      <td className={`p-3 sticky left-0 z-10 text-center ${
                        isDark ? 'bg-slate-950' : 'bg-white'
                      }`}>
                        <button
                          onClick={() => toggleSelectEmp(emp.id)}
                          className="p-1 rounded text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Frozen Staff Name Column */}
                      <td className={`p-3 sticky left-10 z-10 min-w-[210px] max-w-[210px] ${
                        isDark ? 'bg-slate-950 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]' : 'bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                      }`}>
                        <div className="flex flex-col">
                          <button
                            onClick={() => onSelectEmployee && onSelectEmployee(emp.id)}
                            className="font-bold text-left hover:text-blue-400 transition truncate text-xs"
                            title={emp.full_name}
                          >
                            {emp.full_name}
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {emp.team || 'No Team'}
                            </span>
                            {emp.position && (
                              <span className={`text-[10px] truncate max-w-[90px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                • {emp.position}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Frozen UUDS ID Column */}
                      <td className={`p-3 sticky left-[250px] z-10 min-w-[110px] max-w-[110px] ${
                        isDark ? 'bg-slate-950 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.7)]' : 'bg-white shadow-[4px_0_8px_-2px_rgba(0,0,0,0.15)]'
                      }`}>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {emp.uuds_no}
                        </span>
                      </td>

                      {/* Matrix Course Cells */}
                      {courses.map(course => {
                        const key = `${emp.id}_${course.id}`;
                        const record = records[key];
                        const status = record?.status || 'Not Recorded';
                        const isMatchFilter = complianceHighlight === 'All' || 
                          (complianceHighlight === 'Valid' && status === 'Valid') ||
                          (complianceHighlight === 'Due Soon' && status === 'Due Within 30 Days') ||
                          (complianceHighlight === 'Overdue' && status === 'Overdue') ||
                          (complianceHighlight === 'Not Recorded' && status === 'Not Recorded');

                        return (
                          <td 
                            key={course.id}
                            className={`p-2 text-center border-l border-slate-800/30 transition-opacity ${
                              isMatchFilter ? 'opacity-100' : 'opacity-25'
                            }`}
                          >
                            <button
                              onClick={() => handleCellClick(emp, course)}
                              title={`Click to edit: ${emp.full_name} • ${course.code}\nStatus: ${status}\nExpiry: ${record?.expiry_date || 'None'}\nNotes: ${record?.notes || 'None'}`}
                              className={`w-full py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition-all duration-150 flex items-center justify-between gap-1 group/cell hover:scale-[1.03] hover:shadow-md cursor-pointer ${getCellBadgeClass(status)}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getCellDotColor(status)}`} />
                              <span className="truncate font-mono font-bold text-center flex-1">
                                {formatDateDisplay(record?.expiry_date, record?.notes)}
                              </span>
                              <Edit3 className="w-3 h-3 opacity-0 group-hover/cell:opacity-100 transition shrink-0 text-blue-400" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Single-Cell Inline Date Editor Modal */}
      {editModal.isOpen && editModal.employee && editModal.course && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 overflow-hidden animate-scale-in transition-colors ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    Update Training Date
                    <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {editModal.course.code}
                    </span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5 font-medium`}>
                    {editModal.employee.full_name} • <span className="font-mono text-blue-400">{editModal.employee.uuds_no}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Course Information Banner */}
            <div className={`my-4 p-3 rounded-xl border flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="font-semibold text-slate-400">Course Name: </span>
                <span className="font-bold text-slate-200">{editModal.course.name}</span>
              </div>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Validity: {editModal.course.validity_months || 24} Months
              </span>
            </div>

            {/* 1-Click Quick Renewal Presets */}
            <div className="mb-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Quick 1-Click Presets:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('2years')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
                    isDark 
                      ? 'bg-emerald-950/50 hover:bg-emerald-900 border-emerald-500/30 text-emerald-400' 
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                  }`}
                >
                  +2 Years ({currentYear + 2})
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('1year')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
                    isDark 
                      ? 'bg-blue-950/50 hover:bg-blue-900 border-blue-500/30 text-blue-400' 
                      : 'bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-800'
                  }`}
                >
                  +1 Year ({currentYear + 1})
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('permanent')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
                    isDark 
                      ? 'bg-purple-950/50 hover:bg-purple-900 border-purple-500/30 text-purple-400' 
                      : 'bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-800'
                  }`}
                >
                  Permanent (YES)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('clear')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition text-center ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                  }`}
                >
                  Clear Date
                </button>
              </div>
            </div>

            {/* Completion Date Picker with Auto-Filled Year */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold flex items-center justify-between mb-1.5">
                  <span>Training Completion Date:</span>
                  <span className="text-[11px] text-blue-400 font-normal">Year auto-filled</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day */}
                  <select
                    value={editModal.day}
                    onChange={(e) => {
                      const newDay = e.target.value;
                      const newComp = `${editModal.year}-${editModal.month}-${newDay}`;
                      const autoExp = calculateExpiry(newComp, editModal.course.validity_months || 24);
                      const [ey, em, ed] = autoExp ? autoExp.split('-') : [editModal.expYear, editModal.expMonth, editModal.expDay];
                      setEditModal(prev => ({
                        ...prev,
                        day: newDay,
                        completionDate: newComp,
                        expiryDate: prev.isManualExpiry ? prev.expiryDate : autoExp,
                        expDay: prev.isManualExpiry ? prev.expDay : ed,
                        expMonth: prev.isManualExpiry ? prev.expMonth : em,
                        expYear: prev.isManualExpiry ? prev.expYear : ey
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {days.map(d => <option key={d} value={d}>Day: {d}</option>)}
                  </select>

                  {/* Month */}
                  <select
                    value={editModal.month}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      const newComp = `${editModal.year}-${newMonth}-${editModal.day}`;
                      const autoExp = calculateExpiry(newComp, editModal.course.validity_months || 24);
                      const [ey, em, ed] = autoExp ? autoExp.split('-') : [editModal.expYear, editModal.expMonth, editModal.expDay];
                      setEditModal(prev => ({
                        ...prev,
                        month: newMonth,
                        completionDate: newComp,
                        expiryDate: prev.isManualExpiry ? prev.expiryDate : autoExp,
                        expDay: prev.isManualExpiry ? prev.expDay : ed,
                        expMonth: prev.isManualExpiry ? prev.expMonth : em,
                        expYear: prev.isManualExpiry ? prev.expYear : ey
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {months.map(m => <option key={m.num} value={m.num}>{m.name}</option>)}
                  </select>

                  {/* Year */}
                  <select
                    value={editModal.year}
                    onChange={(e) => {
                      const newYear = e.target.value;
                      const newComp = `${newYear}-${editModal.month}-${editModal.day}`;
                      const autoExp = calculateExpiry(newComp, editModal.course.validity_months || 24);
                      const [ey, em, ed] = autoExp ? autoExp.split('-') : [editModal.expYear, editModal.expMonth, editModal.expDay];
                      setEditModal(prev => ({
                        ...prev,
                        year: newYear,
                        completionDate: newComp,
                        expiryDate: prev.isManualExpiry ? prev.expiryDate : autoExp,
                        expDay: prev.isManualExpiry ? prev.expDay : ed,
                        expMonth: prev.isManualExpiry ? prev.expMonth : em,
                        expYear: prev.isManualExpiry ? prev.expYear : ey
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Next Due / Expiry Date */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold">
                    Next Due / Expiry Date:
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={editModal.isManualExpiry}
                      onChange={(e) => setEditModal(prev => ({ ...prev, isManualExpiry: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-0"
                    />
                    <span>Manual Expiry Override</span>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select
                    disabled={!editModal.isManualExpiry}
                    value={editModal.expDay}
                    onChange={(e) => {
                      const newD = e.target.value;
                      setEditModal(prev => ({
                        ...prev,
                        expDay: newD,
                        expiryDate: `${prev.expYear}-${prev.expMonth}-${newD}`
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      !editModal.isManualExpiry 
                        ? 'opacity-70 cursor-not-allowed bg-slate-950/40 border-slate-800' 
                        : isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {days.map(d => <option key={d} value={d}>Day: {d}</option>)}
                  </select>

                  <select
                    disabled={!editModal.isManualExpiry}
                    value={editModal.expMonth}
                    onChange={(e) => {
                      const newM = e.target.value;
                      setEditModal(prev => ({
                        ...prev,
                        expMonth: newM,
                        expiryDate: `${prev.expYear}-${newM}-${prev.expDay}`
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      !editModal.isManualExpiry 
                        ? 'opacity-70 cursor-not-allowed bg-slate-950/40 border-slate-800' 
                        : isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {months.map(m => <option key={m.num} value={m.num}>{m.name}</option>)}
                  </select>

                  <select
                    disabled={!editModal.isManualExpiry}
                    value={editModal.expYear}
                    onChange={(e) => {
                      const newY = e.target.value;
                      setEditModal(prev => ({
                        ...prev,
                        expYear: newY,
                        expiryDate: `${newY}-${prev.expMonth}-${prev.expDay}`
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      !editModal.isManualExpiry 
                        ? 'opacity-70 cursor-not-allowed bg-slate-950/40 border-slate-800' 
                        : isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Notes (Optional):
                </label>
                <input
                  type="text"
                  value={editModal.notes}
                  onChange={(e) => setEditModal(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. YES for induction, certified external, waiver..."
                  className={`w-full p-2 rounded-xl text-xs border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditModal(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCellRecord}
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Date</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Date Updater Modal */}
      {batchModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 overflow-hidden animate-scale-in transition-colors ${
            isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-start justify-between pb-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Batch Update Training Dates</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                    Updating <strong className="text-blue-400">{selectedEmpIds.size}</strong> selected staff members simultaneously
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setBatchModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Select Target Course */}
              <div>
                <label className="text-xs font-bold block mb-1.5">Select Course to Update:</label>
                <select
                  value={batchModal.courseId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    const cObj = courses.find(c => String(c.id) === String(cId));
                    const autoExp = calculateExpiry(batchModal.completionDate, cObj?.validity_months || 24);
                    const [ey, em, ed] = autoExp ? autoExp.split('-') : [batchModal.expYear, batchModal.expMonth, batchModal.expDay];
                    setBatchModal(prev => ({
                      ...prev,
                      courseId: cId,
                      expiryDate: autoExp,
                      expDay: ed,
                      expMonth: em,
                      expYear: ey
                    }));
                  }}
                  className={`w-full p-2 rounded-xl text-xs border outline-none font-bold ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} ({c.validity_months || 24}m)
                    </option>
                  ))}
                </select>
              </div>

              {/* Completion Date */}
              <div>
                <label className="text-xs font-bold flex items-center justify-between mb-1.5">
                  <span>Completion Date (Auto-calculates expiry):</span>
                  <span className="text-[11px] text-blue-400 font-normal">Year auto-filled</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={batchModal.day}
                    onChange={(e) => {
                      const newD = e.target.value;
                      const newComp = `${batchModal.year}-${batchModal.month}-${newD}`;
                      const cObj = courses.find(c => String(c.id) === String(batchModal.courseId));
                      const autoExp = calculateExpiry(newComp, cObj?.validity_months || 24);
                      const [ey, em, ed] = autoExp ? autoExp.split('-') : [batchModal.expYear, batchModal.expMonth, batchModal.expDay];
                      setBatchModal(prev => ({
                        ...prev,
                        day: newD,
                        completionDate: newComp,
                        expiryDate: autoExp,
                        expDay: ed,
                        expMonth: em,
                        expYear: ey
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {days.map(d => <option key={d} value={d}>Day: {d}</option>)}
                  </select>

                  <select
                    value={batchModal.month}
                    onChange={(e) => {
                      const newM = e.target.value;
                      const newComp = `${batchModal.year}-${newM}-${batchModal.day}`;
                      const cObj = courses.find(c => String(c.id) === String(batchModal.courseId));
                      const autoExp = calculateExpiry(newComp, cObj?.validity_months || 24);
                      const [ey, em, ed] = autoExp ? autoExp.split('-') : [batchModal.expYear, batchModal.expMonth, batchModal.expDay];
                      setBatchModal(prev => ({
                        ...prev,
                        month: newM,
                        completionDate: newComp,
                        expiryDate: autoExp,
                        expDay: ed,
                        expMonth: em,
                        expYear: ey
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {months.map(m => <option key={m.num} value={m.num}>{m.name}</option>)}
                  </select>

                  <select
                    value={batchModal.year}
                    onChange={(e) => {
                      const newY = e.target.value;
                      const newComp = `${newY}-${batchModal.month}-${batchModal.day}`;
                      const cObj = courses.find(c => String(c.id) === String(batchModal.courseId));
                      const autoExp = calculateExpiry(newComp, cObj?.validity_months || 24);
                      const [ey, em, ed] = autoExp ? autoExp.split('-') : [batchModal.expYear, batchModal.expMonth, batchModal.expDay];
                      setBatchModal(prev => ({
                        ...prev,
                        year: newY,
                        completionDate: newComp,
                        expiryDate: autoExp,
                        expDay: ed,
                        expMonth: em,
                        expYear: ey
                      }));
                    }}
                    className={`p-2 rounded-xl text-xs border outline-none font-bold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Calculated Expiry Info */}
              <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="font-semibold text-slate-400">Target Expiry Date:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {batchModal.expiryDate || 'N/A'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBatchModal(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchUpdate}
                disabled={savingBatch}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingBatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply to All {selectedEmpIds.size} Staff</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
