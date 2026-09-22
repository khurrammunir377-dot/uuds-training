import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Clock, 
  Edit2, 
  Trash2,
  FileSpreadsheet,
  Printer,
  LayoutGrid,
  List
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmationModal from '../components/ConfirmationModal';
import { exportToCSV, printTableAsPDF } from '../utils/exportUtils';
import PageHeader from '../components/PageHeader';

export default function Courses() {
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');

  // Add course modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCourseData, setNewCourseData] = useState({
    code: '',
    name: '',
    category: 'Technical',
    validity_months: 24,
    description: '',
    assign_to_active: true
  });

  // Edit course modal state
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseData, setEditCourseData] = useState({});

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await api.getCourses();
      setCourses(data || []);
    } catch (err) {
      toast.error(`Failed to load courses catalogue: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.createCourse(newCourseData);
      toast.success(`Course ${newCourseData.code} created and added to catalogue!`);
      setShowAddModal(false);
      setNewCourseData({
        code: '',
        name: '',
        category: 'Technical',
        validity_months: 24,
        description: '',
        assign_to_active: true
      });
      loadCourses();
    } catch (err) {
      toast.error(`Failed to create course: ${err.message}`);
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.updateCourse(editingCourse.id, editCourseData);
      toast.success(`Course ${editCourseData.code} updated successfully!`);
      setEditingCourse(null);
      loadCourses();
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCourse(deleteTarget.id);
      toast.success(`Course ${deleteTarget.code} deleted.`);
      setDeleteTarget(null);
      loadCourses();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const categoryOptions = [
    'Technical',
    'Regulations',
    'Safety Management',
    'Human Factors',
    'Procedures',
    'Safety',
    'IT & Security',
    'Health & Safety',
    'Aircraft Specific',
    'Onboarding',
    'Assessment',
    'Other'
  ];

  const categories = ['All', ...new Set(courses.map(c => c.category).filter(Boolean))];

  const filteredCourses = courses.filter(c => {
    const matchesSearch = !search.trim() || 
      c.code.toLowerCase().includes(search.toLowerCase()) || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = categoryFilter === 'All' || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleExportExcel = () => {
    const headers = [
      { label: 'Course Code', key: 'code' },
      { label: 'Course Name', key: 'name' },
      { label: 'Category', key: 'category' },
      { label: 'Validity (Months)', key: 'validity_months' },
      { label: 'Assigned Staff', key: 'total_active_assigned' },
      { label: 'Valid Count', key: 'valid_count' },
      { label: 'Due Soon Count', key: 'due_soon_count' },
      { label: 'Overdue Count', key: 'overdue_count' },
      { label: 'Description', key: 'description' }
    ];
    exportToCSV(filteredCourses, headers, `UUDS_Training_Catalogue_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${filteredCourses.length} courses to Excel CSV!`);
  };

  const handleExportPDF = () => {
    const headers = ['Code', 'Course Title', 'Category', 'Validity', 'Assigned', 'Compliance Stats'];
    const rows = filteredCourses.map(c => [
      c.code,
      c.name,
      c.category,
      `${c.validity_months}M`,
      c.total_active_assigned || 0,
      `${c.valid_count || 0} Valid / ${c.overdue_count || 0} Overdue`
    ]);
    printTableAsPDF({
      title: 'Emirates MLZ Training Curriculum Catalogue',
      subtitle: `Total Courses: ${filteredCourses.length} • Regulatory Compliance Tracking`,
      headers,
      rows
    });
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col h-[calc(100vh-100px)]">
      {/* Top Standardized Frozen 2-Line Header */}
      <PageHeader
        icon={BookOpen}
        theme="purple"
        title={`Emirates MLZ Training Catalogue (${filteredCourses.length})`}
        subtitle="Mandatory aviation maintenance courses, validity cycles, and compliance rates."
        actions={
          <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap overflow-x-auto pb-1 xl:pb-0">
            <div className="relative w-44 sm:w-52 shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search course code or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-purple-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* View Mode Toggle Buttons (Icon-only: List / Grid) */}
            <div className={`flex items-center border rounded-xl p-0.5 shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-700/80' : 'bg-slate-100 border-slate-300'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'list'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tabular List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExportExcel}
              title="Export Course Catalogue to Excel"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-900/25 border border-emerald-500/30 transition whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              title="Print or Save as PDF"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-900/25 border border-rose-500/30 transition whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Course</span>
              </button>
            )}
          </div>
        }
      />

      {/* Frozen Category Filter Pills */}
      <div className={`shrink-0 flex items-center gap-1.5 overflow-x-auto pb-2 border-b text-xs ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white shadow font-bold'
                : isDark 
                  ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800' 
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Scrollable Course Cards Grid OR Table List View */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 matrix-scroll-glow">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading course curriculum...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-sm text-slate-400">No courses match your filter criteria.</p>
          </div>
        ) : viewMode === 'list' ? (
          /* List / Table View */
          <div className={`rounded-2xl border shadow-lg overflow-hidden ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <table className="w-full text-left border-collapse text-xs">
              <thead className={`sticky top-0 z-10 ${
                isDark ? 'bg-slate-950 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-800 border-b border-slate-300'
              }`}>
                <tr>
                  <th className="py-3 px-4 font-bold">Code</th>
                  <th className="py-3 px-4 font-bold">Course Title & Description</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold text-center">Validity Cycle</th>
                  <th className="py-3 px-4 font-bold text-center">Assigned Staff</th>
                  <th className="py-3 px-4 font-bold">Compliance Status</th>
                  {isAdmin && <th className="py-3 px-4 font-bold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                {filteredCourses.map((course) => {
                  const tot = course.total_active_assigned || 0;
                  const valid = course.valid_count || 0;
                  const rate = tot > 0 ? Math.round((valid / tot) * 100) : 0;

                  return (
                    <tr 
                      key={course.id}
                      className={`transition ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono font-bold text-xs">
                          {course.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{course.name}</div>
                        <div className={`text-[11px] truncate max-w-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {course.description || 'Standard recurrent aviation safety requirement.'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {course.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center font-semibold">
                        {course.validity_months || 24} Months
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center font-mono font-bold">
                        {tot} staff
                      </td>
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Compliance</span>
                          <span className={`font-bold ${rate >= 75 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {rate}% ({valid}/{tot})
                          </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div className="bg-emerald-500 h-full" style={{ width: `${tot > 0 ? (valid / tot) * 100 : 0}%` }} />
                          <div className="bg-amber-400 h-full" style={{ width: `${tot > 0 ? ((course.due_soon_count || 0) / tot) * 100 : 0}%` }} />
                          <div className="bg-red-500 h-full" style={{ width: `${tot > 0 ? ((course.overdue_count || 0) / tot) * 100 : 0}%` }} />
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingCourse(course);
                                setEditCourseData({ ...course });
                              }}
                              className={`p-1.5 rounded-lg transition ${
                                isDark ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                              }`}
                              title="Edit Course"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(course)}
                              className={`p-1.5 rounded-lg transition ${
                                isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-600 hover:text-red-600 hover:bg-slate-100'
                              }`}
                              title="Delete Course"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {filteredCourses.map((course) => {
              const tot = course.total_active_assigned || 0;
              const valid = course.valid_count || 0;
              const rate = tot > 0 ? Math.round((valid / tot) * 100) : 0;

              return (
                <div
                  key={course.id}
                  className={`card-hover-3d p-5 rounded-2xl border flex flex-col justify-between ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono font-bold text-xs">
                        {course.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {course.category}
                      </span>
                    </div>

                    <h3 className={`font-bold text-sm mt-3 leading-snug ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {course.name}
                    </h3>

                    <p className={`text-xs mt-2 line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {course.description || 'Standard recurrent aviation safety requirement.'}
                    </p>

                    <div className={`flex items-center gap-2 mt-4 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Validity Cycle: <strong>{course.validity_months || 24} Months</strong></span>
                    </div>
                  </div>

                  {/* Compliance progress & actions */}
                  <div className={`mt-5 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}>Compliance Rate</span>
                      <span className={`font-bold ${rate >= 75 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {rate}% ({valid}/{tot})
                      </span>
                    </div>

                    <div className={`w-full h-2 rounded-full overflow-hidden flex ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div 
                        className="bg-emerald-500 h-full"
                        style={{ width: `${tot > 0 ? (valid / tot) * 100 : 0}%` }}
                      />
                      <div 
                        className="bg-amber-400 h-full"
                        style={{ width: `${tot > 0 ? ((course.due_soon_count || 0) / tot) * 100 : 0}%` }}
                      />
                      <div 
                        className="bg-red-500 h-full"
                        style={{ width: `${tot > 0 ? ((course.overdue_count || 0) / tot) * 100 : 0}%` }}
                      />
                    </div>

                    {isAdmin && (
                      <div className={`flex items-center justify-end gap-1.5 mt-3 pt-2 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
                        <button
                          onClick={() => {
                            setEditingCourse(course);
                            setEditCourseData({ ...course });
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            isDark ? 'text-slate-400 hover:text-blue-400 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                          }`}
                          title="Edit Course"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(course)}
                          className={`p-1.5 rounded-lg transition ${
                            isDark ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800' : 'text-slate-600 hover:text-red-600 hover:bg-slate-100'
                          }`}
                          title="Delete Course"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Course Modal with Category DROPDOWN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-in ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span>Add New Training Course</span>
            </h2>

            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OL-3000"
                  value={newCourseData.code}
                  onChange={(e) => setNewCourseData({ ...newCourseData, code: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl font-mono uppercase ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Course Name / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Course title..."
                  value={newCourseData.name}
                  onChange={(e) => setNewCourseData({ ...newCourseData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-slate-400 mb-1">Category *</label>
                  <select
                    value={newCourseData.category}
                    onChange={(e) => setNewCourseData({ ...newCourseData, category: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Validity (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newCourseData.validity_months}
                    onChange={(e) => setNewCourseData({ ...newCourseData, validity_months: parseInt(e.target.value) || 24 })}
                    className={`w-full px-3 py-2 border rounded-xl font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description / Curriculum Notes</label>
                <textarea
                  rows={3}
                  value={newCourseData.description}
                  onChange={(e) => setNewCourseData({ ...newCourseData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  placeholder="Scope, regulatory notes, etc."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="assign_active"
                  checked={newCourseData.assign_to_active}
                  onChange={(e) => setNewCourseData({ ...newCourseData, assign_to_active: e.target.checked })}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="assign_active" className="text-slate-400">
                  Assign to all active personnel as "Not Recorded"
                </label>
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
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl animate-scale-in ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-500" />
              <span>Edit Course: {editingCourse.code}</span>
            </h2>

            <form onSubmit={handleUpdateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={editCourseData.code}
                  onChange={(e) => setEditCourseData({ ...editCourseData, code: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl font-mono uppercase ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Course Name *</label>
                <input
                  type="text"
                  required
                  value={editCourseData.name}
                  onChange={(e) => setEditCourseData({ ...editCourseData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Category *</label>
                  <select
                    value={editCourseData.category}
                    onChange={(e) => setEditCourseData({ ...editCourseData, category: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-xl ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Validity (Months)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editCourseData.validity_months}
                    onChange={(e) => setEditCourseData({ ...editCourseData, validity_months: parseInt(e.target.value) || 24 })}
                    className={`w-full px-3 py-2 border rounded-xl font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editCourseData.description || ''}
                  onChange={(e) => setEditCourseData({ ...editCourseData, description: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-xl ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow"
                >
                  Save Changes
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
        onConfirm={handleDeleteCourse}
        title="Delete Course Curriculum"
        message={`Are you sure you want to delete course ${deleteTarget?.code} (${deleteTarget?.name})?`}
        confirmText="Delete Course"
        isDanger={true}
      />
    </div>
  );
}
