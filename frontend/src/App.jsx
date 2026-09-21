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
import Login from './pages/Login';
import { api } from './api';

export default function App() {
  const { user, loading } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [counts, setCounts] = useState({ employees: '244', urgent: '167' });

  useEffect(() => {
    if (user) {
      loadCounts();
    }
  }, [user]);

  const loadCounts = async () => {
    try {
      const stats = await api.getDashboardStats();
      setCounts({
        employees: String(stats.active_employees_count || '244'),
        urgent: String((stats.records.overdue_count || 0) + (stats.records.due_soon_count || 0))
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
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          counts={counts}
        />

        {/* Dynamic Page Content Area */}
        <main className={`flex-1 w-full min-h-0 ${
          activeTab === 'matrix' 
            ? 'h-full overflow-hidden p-2 sm:p-3 flex flex-col' 
            : 'overflow-y-auto p-3 sm:p-6'
        }`}>
          {activeTab === 'dashboard' && (
            <Dashboard 
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
            />
          )}

          {activeTab === 'employees' && (
            <Employees 
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
            />
          )}

          {activeTab === 'matrix' && (
            <TrainingMatrix 
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
            />
          )}

          {activeTab === 'reminders' && (
            <Reminders 
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
            />
          )}

          {activeTab === 'notifications' && (
            <Notifications 
              onSelectEmployee={(id) => setSelectedEmployeeId(id)}
            />
          )}

          {activeTab === 'courses' && (
            <Courses />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </main>
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
