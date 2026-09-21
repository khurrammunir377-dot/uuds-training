import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  MessageCircle, 
  Phone, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  List, 
  Trash2,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { formatDate } from '../utils/dateUtils';
import { exportToCSV, printTableAsPDF } from '../utils/exportUtils';

export default function Employees({ onSelectEmployee }) {
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [employees, setEmployees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusTab, setStatusTab] = useState('Active');
  const [teamFilter, setTeamFilter] = useState('All');
  const [complianceFilter, setComplianceFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table');

  // Add employee modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpData, setNewEmpData] = useState({
    uuds_no: '',
    contingent_id: '',
    full_name: '',
    position: '',
    team: '',
    mobile_no: '',
    dxb_start_date: '',
    employment_status: 'Active',
    notes: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, [statusTab, teamFilter, complianceFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadEmployees();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const params = {
        status: statusTab,
        page,
        page_size: 20
      };
      if (teamFilter !== 'All') params.team = teamFilter;
      if (complianceFilter !== 'All') params.compliance_filter = complianceFilter;
      if (search.trim()) params.search = search.trim();

      const data = await api.getEmployees(params);
      setEmployees(data.items || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.total_pages || 1);
      if (data.status_counts) {
        setStatusCounts(data.status_counts);
      }
    } catch (err) {
      toast.error(`Failed to load staff list: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await api.createEmployee(newEmpData);
      toast.success(`Employee ${newEmpData.uuds_no} registered and all courses assigned!`);
      setShowAddModal(false);
      setNewEmpData({
        uuds_no: '',
        contingent_id: '',
        full_name: '',
        position: '',
        team: '',
        mobile_no: '',
        dxb_start_date: '',
        employment_status: 'Active',
        notes: ''
      });
      loadEmployees();
    } catch (err) {
      toast.error(`Failed to create employee: ${err.message}`);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteEmployee(deleteTarget.id);
      toast.success(`Employee ${deleteTarget.uuds_no} deleted successfully.`);
      setDeleteTarget(null);
      loadEmployees();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const openWhatsApp = (emp) => {
    const rawMobile = emp.mobile_no || '';
    if (!rawMobile) {
      toast.warning(`No mobile number saved for ${emp.full_name}.`);
      return;
    }
    let clean = rawMobile.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '971' + clean.slice(1);
    } else if (clean.length === 9) {
      clean = '971' + clean;
    }

    const msg = encodeURIComponent(
      `Hello ${emp.full_name},\n\nThis is an official notification regarding your aviation training compliance status.\n` +
      `Please contact training coordinator to check your certification timeline.\n\nThank you,\nManager Training, UUDS Aero (DXB)`
    );
    const waWin = window.open(`https://wa.me/${clean}?text=${msg}`, 'uuds_whatsapp_window');
    if (waWin) waWin.focus();
  };

  const teamsList = [
    'All', 'Team A', 'Team B', 'Team C', 'Leather', 'P/Booth', 
    'Work Shop', 'Office', 'Planner', 'Line A', 'Line B', 'A Check', 'Stores'
  ];

  // Tabs with dynamic exact counts
  const tabs = [
    { id: 'Active', label: 'Active Roster', count: statusCounts['Active'] ?? 244 },
    { id: 'UN Paid Leave', label: 'Unpaid Leave', count: statusCounts['UN Paid Leave'] ?? 32 },
    { id: 'DWC TX', label: 'DWC TX', count: statusCounts['DWC TX'] ?? 18 },
    { id: 'RESIGN', label: 'Resigned', count: statusCounts['RESIGN'] ?? 151 },
    { id: 'Redundancy', label: 'Redundancy', count: statusCounts['Redundancy'] ?? 35 },
    { id: 'Non Tec.', label: 'Non Technical', count: statusCounts['Non Tec.'] ?? 1 },
    { id: 'All', label: 'All Database', count: statusCounts['All'] ?? 481 },
  ];

  const fetchAllFilteredEmployees = async () => {
    const params = {
      status: statusTab,
      page: 1,
      page_size: 2000
    };
    if (teamFilter !== 'All') params.team = teamFilter;
    if (complianceFilter !== 'All') params.compliance_filter = complianceFilter;
    if (search.trim()) params.search = search.trim();
    const res = await api.getEmployees(params);
    return res.items || [];
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Preparing complete dataset for Excel export...');
      const allData = await fetchAllFilteredEmployees();
      const headers = [
        { label: 'UUDS No', key: 'uuds_no' },
        { label: 'Staff No', key: 'contingent_id' },
        { label: 'Full Name', key: 'full_name' },
        { label: 'Position', key: 'position' },
        { label: 'Team', key: 'team' },
        { label: 'Mobile No', key: 'mobile_no' },
        { label: 'Join Date', key: 'dxb_start_date' },
        { label: 'Status', key: 'employment_status' },
        { label: 'Valid Courses', key: 'valid_count' },
        { label: 'Due Soon Courses', key: 'due_soon_count' },
        { label: 'Overdue Courses', key: 'overdue_count' },
        { label: 'Total Courses', key: 'total_courses' }
      ];
      exportToCSV(allData, headers, `UUDS_Staff_Roster_${statusTab}_${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success(`Exported all ${allData.length} records to Excel CSV!`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Preparing complete report for PDF print...');
      const allData = await fetchAllFilteredEmployees();
      const headers = ['UUDS No', 'Staff No', 'Full Name', 'Position', 'Team', 'Mobile No', 'Join Date', 'Compliance'];
      const rows = allData.map(e => [
        e.uuds_no,
        e.contingent_id || '-',
        e.full_name,
        e.position || '-',
        e.team || '-',
        e.mobile_no || '-',
        formatDate(e.dxb_start_date),
        `${e.valid_count || 0} Valid / ${e.overdue_count || 0} Overdue`
      ]);
      printTableAsPDF({
        title: `Technical Staff Roster (${statusTab})`,
        subtitle: `Total: ${allData.length} technical employees`,
        headers,
        rows
      });
    } catch (err) {
      toast.error(`PDF generation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in flex flex-col h-[calc(100vh-100px)]">
      {/* Top Header - Frozen */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-500" />
            <span>Technical Staff Database</span>
          </h1>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Managing <strong>{totalCount} technical employees</strong> with individual course records.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Export Buttons */}
          <button
            onClick={handleExportExcel}
            title="Export Current Roster to Excel / CSV"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            title="Print Roster or Save as PDF"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>

          <div className={`flex items-center border rounded-xl p-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition ${viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Employment Status Tabs with live counts - Frozen */}
      <div className={`shrink-0 flex items-center gap-2 overflow-x-auto pb-1 border-b text-xs font-bold ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setStatusTab(tab.id); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
              statusTab === tab.id
                ? isDark 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm font-extrabold' 
                  : 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm font-extrabold'
                : isDark 
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              statusTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter Bar - Frozen */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by UUDS No, Name, Staff No, Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
              isDark ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
        </div>

        <div className="relative">
          <select
            value={teamFilter}
            onChange={(e) => { setTeamFilter(e.target.value); setPage(1); }}
            className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
              isDark ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="All">All Departments / Teams</option>
            {teamsList.filter(t => t !== 'All').map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <select
            value={complianceFilter}
            onChange={(e) => { setComplianceFilter(e.target.value); setPage(1); }}
            className={`w-full px-3.5 py-2 rounded-xl text-xs border focus:outline-none focus:border-blue-500 ${
              isDark ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="All">All Compliance States</option>
            <option value="Overdue">Has Overdue Courses</option>
            <option value="Due Soon">Due Within 30 Days</option>
            <option value="Valid">100% Fully Compliant</option>
            <option value="Not Recorded">Has Unrecorded Training</option>
          </select>
        </div>
      </div>

      {/* Main Staff Area with FROZEN TABLE HEADER and ONLY DATA SCROLLS */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3 my-auto">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading staff records...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className={`p-12 text-center rounded-3xl border my-auto ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-bold">No employees match your search criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table Container with Sticky Frozen Header */
          <div className={`border rounded-2xl overflow-hidden flex-1 flex flex-col shadow-xl ${
            isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-300 bg-white'
          }`}>
            <div className="overflow-x-auto flex-1 overflow-y-auto">
              <table className={`w-full text-left text-xs border-collapse ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                {/* Frozen Sticky Header */}
                <thead className={`sticky top-0 z-20 shadow-sm ${
                  isDark ? 'bg-slate-950 border-b border-slate-800 text-slate-300' : 'bg-slate-100 border-b border-slate-300 text-slate-900 font-extrabold'
                }`}>
                  <tr className="text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Employee</th>
                    <th className="py-3.5 px-4">Staff No</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Position</th>
                    <th className="py-3.5 px-4">Mobile (WhatsApp)</th>
                    <th className="py-3.5 px-4">Compliance Status</th>
                    <th className="py-3.5 px-4">Rate</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {employees.map((emp) => (
                    <tr 
                      key={emp.id}
                      className={`transition group ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/50'}`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => onSelectEmployee(emp.id)}
                          className="text-left font-bold group-hover:text-blue-500 transition"
                        >
                          <div className={isDark ? 'text-slate-100' : 'text-slate-900'}>{emp.full_name}</div>
                          <span className="block text-[11px] font-mono text-blue-500 font-semibold">
                            {emp.uuds_no}
                          </span>
                        </button>
                      </td>

                      <td className={`py-3.5 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                        {emp.contingent_id || '-'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-900 border border-slate-200 font-semibold'}`}>
                          {emp.team || 'Unassigned'}
                        </span>
                      </td>

                      <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                        {emp.position || '-'}
                      </td>

                      <td className="py-3.5 px-4">
                        {emp.mobile_no ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <button
                              onClick={() => openWhatsApp(emp)}
                              title="Open WhatsApp reminder chat"
                              className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{emp.mobile_no}</span>
                          </div>
                        ) : (
                          <span className={`italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>None</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={emp.badge_status} size="sm" />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          <span className={emp.compliance_rate >= 75 ? 'text-emerald-500' : emp.compliance_rate >= 50 ? 'text-amber-500' : 'text-red-500'}>
                            {emp.compliance_rate}%
                          </span>
                          <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            ({emp.valid_count}/{emp.total_courses})
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectEmployee(emp.id)}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-sm"
                          >
                            Profile
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteTarget(emp)}
                              title="Delete Employee"
                              className={`p-1.5 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-600 hover:text-red-600 hover:bg-red-50'}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View - Scrollable */
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-1">
            {employees.map((emp) => (
              <div 
                key={emp.id}
                className={`card-hover-3d p-5 rounded-2xl border flex flex-col justify-between ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 
                        onClick={() => onSelectEmployee(emp.id)}
                        className="font-bold hover:text-blue-500 cursor-pointer transition"
                      >
                        <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>{emp.full_name}</span>
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-blue-500">{emp.uuds_no}</span>
                        {emp.contingent_id && (
                          <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>#{emp.contingent_id}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={emp.badge_status} size="sm" />
                  </div>

                  <div className="mt-3.5 space-y-1 text-xs">
                    <div>Department: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{emp.team || 'Unassigned'}</strong></div>
                    <div>Position: <span className={isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}>{emp.position || 'N/A'}</span></div>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                      <span className={`font-mono text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>{emp.mobile_no || 'No Mobile'}</span>
                    </div>
                  </div>
                </div>

                <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="text-xs font-mono">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Valid: </span>
                    <span className="font-bold text-emerald-500">{emp.valid_count}</span>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}> / {emp.total_courses}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {emp.mobile_no && (
                      <button
                        onClick={() => openWhatsApp(emp)}
                        title="Send WhatsApp Reminder"
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectEmployee(emp.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                    >
                      Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Frozen Pagination Footer */}
      <div className={`shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs border-t ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
      }`}>
        <div>
          Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} staff records)
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border disabled:opacity-40 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>
          <span className="px-2 font-mono">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border disabled:opacity-40 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-scale-in ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              <span>Register New Technical Staff</span>
            </h2>

            <form onSubmit={handleAddEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">UUDS No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UUDS-1500"
                    value={newEmpData.uuds_no}
                    onChange={(e) => setNewEmpData({ ...newEmpData, uuds_no: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">EK Staff / Contingent No</label>
                  <input
                    type="text"
                    placeholder="e.g. 985123"
                    value={newEmpData.contingent_id}
                    onChange={(e) => setNewEmpData({ ...newEmpData, contingent_id: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full name as per passport"
                  value={newEmpData.full_name}
                  onChange={(e) => setNewEmpData({ ...newEmpData, full_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Mobile Contact (WhatsApp)</label>
                  <input
                    type="text"
                    placeholder="050-1234567"
                    value={newEmpData.mobile_no}
                    onChange={(e) => setNewEmpData({ ...newEmpData, mobile_no: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">DXB Start Date</label>
                  <input
                    type="date"
                    value={newEmpData.dxb_start_date}
                    onChange={(e) => setNewEmpData({ ...newEmpData, dxb_start_date: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Department / Team</label>
                  <input
                    type="text"
                    placeholder="Team A, Team B, Leather..."
                    value={newEmpData.team}
                    onChange={(e) => setNewEmpData({ ...newEmpData, team: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Position / Designation</label>
                  <input
                    type="text"
                    placeholder="Aircraft Cabin Technician"
                    value={newEmpData.position}
                    onChange={(e) => setNewEmpData({ ...newEmpData, position: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow"
                >
                  Register & Assign Courses
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEmployee}
        title="Delete Employee Record"
        message={`Are you sure you want to delete employee ${deleteTarget?.uuds_no} (${deleteTarget?.full_name}) and all associated records?`}
        confirmText="Delete"
        isDanger={true}
      />
    </div>
  );
}
