import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeProfileModal from './pages/EmployeeProfileModal';
import Reminders from './pages/Reminders';
import Notifications from './pages/Notifications';
import Courses from './pages/Courses';
import TrainingMatrix from './pages/TrainingMatrix';
import Settings from './pages/Settings';
import History from './pages/History';
import Login from './pages/Login';
import Footer from './components/Footer';
import { api } from './api';

export default function App() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [counts, setCounts] = useState({ employees: '249', urgent: '146', courses: '15' });
  const [visitedTabs, setVisitedTabs] = useState(new Set(['dashboard']));

  useEffect(() => {
    setVisitedTabs(prev => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  useEffect(() => {
    if (user) {
      loadCounts();
    }
  }, [user]);

  const loadCounts = async () => {
    try {
      const stats = await api.getDashboardStats();
      let historyCount = 'Live';
      try {
        const hRes = await api.getAuditLogs({ limit: 1 });
        if (hRes && hRes.total_count !== undefined) {
          historyCount = String(hRes.total_count);
        }
      } catch (e) {}

      setCounts({
        employees: String(stats.active_employees_count || '249'),
        urgent: String((stats.records?.overdue_count || 0) + (stats.records?.due_soon_count || 0)),
        courses: String(stats.total_courses || '15'),
        history: historyCount
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin shadow-glow-blue" />
          <p className="text-xs font-semibold tracking-wider uppercase opacity-70">Initializing UUDS Aviation Engine...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden selection:bg-blue-600 selection:text-white transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Top Navbar */}
      <Navbar onOpenReminders={() => setActiveTab('reminders')} />

      {/* Main App Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Extends all the way to full bottom */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          counts={counts}
        />

        {/* Right Section: Content Area + Fixed Bottom Footer */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Dynamic Page Content Area with Keep-Alive for Instant 0ms Tab Switching */}
          <main className="flex-1 w-full min-h-0 relative overflow-hidden flex flex-col">
            {visitedTabs.has('dashboard') && (
              <div className={`h-full w-full overflow-y-auto p-3 sm:p-6 ${activeTab === 'dashboard' ? '' : 'hidden'}`}>
                <Dashboard 
                  onNavigate={(tab) => setActiveTab(tab)}
                  onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                />
              </div>
            )}

            {visitedTabs.has('employees') && (
              <div className={`h-full w-full p-2 sm:p-3 flex flex-col min-h-0 overflow-hidden ${activeTab === 'employees' ? '' : 'hidden'}`}>
                <Employees 
                  onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                />
              </div>
            )}

            {visitedTabs.has('matrix') && (
              <div className={`h-full w-full p-2 sm:p-3 flex flex-col min-h-0 overflow-hidden ${activeTab === 'matrix' ? '' : 'hidden'}`}>
                <TrainingMatrix 
                  onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                />
              </div>
            )}

            {visitedTabs.has('reminders') && (
              <div className={`h-full w-full p-2 sm:p-3 flex flex-col min-h-0 overflow-hidden ${activeTab === 'reminders' ? '' : 'hidden'}`}>
                <Reminders 
                  onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                />
              </div>
            )}

            {visitedTabs.has('courses') && (
              <div className={`h-full w-full p-2 sm:p-3 flex flex-col min-h-0 overflow-hidden ${activeTab === 'courses' ? '' : 'hidden'}`}>
                <Courses />
              </div>
            )}

            {visitedTabs.has('history') && (
              <div className={`h-full w-full p-2 sm:p-3 flex flex-col min-h-0 overflow-hidden ${activeTab === 'history' ? '' : 'hidden'}`}>
                <History 
                  onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                />
              </div>
            )}

            {visitedTabs.has('notifications') && (
              <div className={`h-full w-full p-3 sm:p-6 overflow-y-auto ${activeTab === 'notifications' ? '' : 'hidden'}`}>
                <Notifications 
                  onSelectEmployee={(id) => setSelectedEmployeeId(id)}
                />
              </div>
            )}

            {visitedTabs.has('settings') && (
              <div className={`h-full w-full p-2 sm:p-3 flex flex-col min-h-0 overflow-hidden ${activeTab === 'settings' ? '' : 'hidden'}`}>
                <Settings onNavigate={(tab) => setActiveTab(tab)} />
              </div>
            )}
          </main>

          {/* Global Fixed Bottom Footer (Starts after sidebar, user profile sits to its left at full bottom) */}
          <Footer />
        </div>
      </div>

      {/* Staff Profile Modal */}
      {selectedEmployeeId && (
        <EmployeeProfileModal
          employeeId={selectedEmployeeId}
          onClose={() => setSelectedEmployeeId(null)}
          onRefresh={() => loadCounts()}
        />
      )}
    </div>
  );
}
