import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Save, 
  RefreshCw, 
  Shield, 
  Clock,
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Key,
  Eye,
  EyeOff,
  User,
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

export default function Settings() {
  const { user: currentAuthUser, isAdmin } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('system'); // 'system' | 'users'
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  // User Management State (Admin only)
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    full_name: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      loadUsers();
    }
  }, [activeTab, isAdmin]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data || {});
    } catch (err) {
      toast.error(`Failed to load system settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (err) {
      toast.error(`Failed to load users: ${err.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      toast.success('Configuration settings saved successfully!');
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      await api.updateSettings(settings);
      const res = await api.testSmtp();
      if (res.success) {
        toast.success('Outlook / Office 365 connection established successfully!');
      } else {
        toast.error(`SMTP Connection Test: ${res.message}`);
      }
    } catch (err) {
      toast.error(`Test error: ${err.message}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  // Open Add User Modal
  const handleOpenAddModal = () => {
    setUserFormData({
      username: '',
      password: '',
      role: 'user',
      full_name: '',
      email: ''
    });
    setShowPassword(false);
    setShowAddModal(true);
  };

  // Open Edit User Modal
  const handleOpenEditModal = (u) => {
    setSelectedUser(u);
    setUserFormData({
      username: u.username,
      password: '', // blank unless changing
      role: u.role,
      full_name: u.full_name || '',
      email: u.email || ''
    });
    setShowPassword(false);
    setShowEditModal(true);
  };

  // Submit Add User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userFormData.username.trim() || !userFormData.password.trim()) {
      toast.error('User ID and Password are required.');
      return;
    }
    setSubmittingUser(true);
    try {
      await api.createUser(userFormData);
      toast.success(`User '${userFormData.username}' created successfully!`);
      setShowAddModal(false);
      loadUsers();
    } catch (err) {
      toast.error(`Create user failed: ${err.message}`);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Submit Edit User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!userFormData.username.trim()) {
      toast.error('User ID cannot be empty.');
      return;
    }
    setSubmittingUser(true);
    try {
      await api.updateUser(selectedUser.id, userFormData);
      toast.success(`User '${userFormData.username}' updated successfully!`);
      setShowEditModal(false);
      loadUsers();
    } catch (err) {
      toast.error(`Update user failed: ${err.message}`);
    } finally {
      setSubmittingUser(false);
    }
  };

  // Submit Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setSubmittingUser(true);
    try {
      await api.deleteUser(selectedUser.id);
      toast.success(`User '${selectedUser.username}' deleted.`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`);
    } finally {
      setSubmittingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading settings...</p>
      </div>
    );
  }

  const adminUsersCount = users.filter(u => u.role === 'admin').length;
  const standardUsersCount = users.filter(u => u.role === 'user').length;

  return (
    <div className="h-full w-full flex flex-col min-h-0 overflow-hidden gap-2.5 animate-fade-in">
      {/* Top Standardized Frozen 2-Line Header */}
      <PageHeader
        icon={activeTab === 'users' ? Users : SettingsIcon}
        theme={activeTab === 'users' ? 'purple' : 'indigo'}
        title={activeTab === 'users' ? 'User ID & Password Management' : 'System & Notification Settings'}
        subtitle={
          activeTab === 'users'
            ? 'Add, update, or delete authorized system users, roles, and authentication credentials.'
            : 'Configure Microsoft 365 / Outlook credentials and automated weekly compliance schedules.'
        }
        actions={
          <div className="flex items-center gap-2">
            {/* User Management Button - Strictly Hidden for non-admins */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'users' ? 'system' : 'users')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-900/30'
                    : isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400 border-slate-700' 
                      : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-300'
                }`}
                title={activeTab === 'users' ? 'Switch to System Settings' : 'Manage User IDs & Passwords'}
              >
                {activeTab === 'users' ? (
                  <>
                    <SettingsIcon className="w-4 h-4" />
                    <span>System Settings</span>
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    <span>User Management</span>
                  </>
                )}
              </button>
            )}

            {activeTab === 'system' ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition disabled:opacity-50 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-900/25 border border-indigo-500/30 transition shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add User</span>
              </button>
            )}
          </div>
        }
      />

      {/* VIEW 1: SYSTEM & EMAIL SETTINGS */}
      {activeTab === 'system' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch overflow-hidden">
          {/* Left Column: Office 365 / Outlook Authentication Box (Span 7) */}
          <div className={`lg:col-span-7 p-4 sm:p-5 rounded-2xl border shadow-xl flex flex-col justify-between overflow-hidden ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="space-y-3">
              <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-600/10 text-blue-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold">
                      Microsoft 365 / Outlook SMTP Authentication
                    </h2>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Direct dispatch configuration to <strong>nsilva@uuds.ae</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">SMTP Server Host</label>
                  <input
                    type="text"
                    value={settings.smtp_host || 'smtp.office365.com'}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">SMTP Port</label>
                  <input
                    type="text"
                    value={settings.smtp_port || '587'}
                    onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">Sender Email / Username</label>
                  <input
                    type="email"
                    value={settings.smtp_user || 'nsilva@uuds.ae'}
                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">Password / App Password</label>
                  <input
                    type="password"
                    placeholder="Enter SMTP password"
                    value={settings.smtp_password || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">Default Reminder Recipient</label>
                  <input
                    type="email"
                    value={settings.reminder_recipient || 'nsilva@uuds.ae'}
                    onChange={(e) => setSettings({ ...settings, reminder_recipient: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">Sender Display Name</label>
                  <input
                    type="text"
                    value={settings.smtp_from_name || 'Manager Training, UUDS Aero (DXB)'}
                    onChange={(e) => setSettings({ ...settings, smtp_from_name: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`flex items-center justify-between pt-3 border-t mt-4 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.smtp_tls === 'true' || settings.smtp_tls === true}
                  onChange={(e) => setSettings({ ...settings, smtp_tls: e.target.checked ? 'true' : 'false' })}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>Enable STARTTLS (Required for Office 365)</span>
              </label>

              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={testingSmtp}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-blue-400' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-blue-600'
                }`}
              >
                {testingSmtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Right Column: Weekly Reminder Schedule Card (Span 5) */}
          <div className={`lg:col-span-5 p-4 sm:p-5 rounded-2xl border shadow-xl flex flex-col justify-between overflow-hidden ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="space-y-3">
              <div className={`flex items-center gap-2.5 border-b pb-2.5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">Automated Weekly Schedule</h2>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Automated background cron dispatch settings.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">Frequency</label>
                  <select
                    value={settings.reminder_frequency || 'Weekly'}
                    onChange={(e) => setSettings({ ...settings, reminder_frequency: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">Dispatch Day</label>
                  <select
                    value={settings.reminder_day || 'Monday'}
                    onChange={(e) => setSettings({ ...settings, reminder_day: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Monday">Every Monday</option>
                    <option value="Tuesday">Every Tuesday</option>
                    <option value="Wednesday">Every Wednesday</option>
                    <option value="Thursday">Every Thursday</option>
                    <option value="Friday">Every Friday</option>
                    <option value="Sunday">Every Sunday</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400 text-[11px]">Dispatch Time</label>
                  <input
                    type="time"
                    value={settings.reminder_time || '08:00'}
                    onChange={(e) => setSettings({ ...settings, reminder_time: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-[11px] leading-relaxed mt-4 ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span className="font-bold text-blue-500">Compliance Audit:</span> Automated reports are generated every Monday with the latest roster data and delivered to designated management personnel.
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: USER MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'users' && isAdmin && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-3">
          {/* Summary Metric Cards */}
          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Total Accounts
                </span>
                <div className="text-xl font-black font-mono mt-0.5">{users.length}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Administrators
                </span>
                <div className="text-xl font-black font-mono text-blue-500 mt-0.5">{adminUsersCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className={`p-3 rounded-2xl border shadow-sm flex items-center justify-between ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Compliance Viewers
                </span>
                <div className="text-xl font-black font-mono text-emerald-500 mt-0.5">{standardUsersCount}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* User Table with Sticky Frozen Header */}
          <div className={`border rounded-2xl overflow-hidden flex-1 flex flex-col shadow-xl ${
            isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-300 bg-white'
          }`}>
            <div className="overflow-x-auto flex-1 overflow-y-auto matrix-scroll-glow">
              <table className={`w-full text-left text-xs border-collapse ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                <thead className={`sticky top-0 z-20 shadow-sm ${
                  isDark ? 'bg-slate-950 border-b border-slate-800 text-slate-300' : 'bg-slate-100 border-b border-slate-300 text-slate-900 font-extrabold'
                }`}>
                  <tr className="text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">User ID / Username</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Password</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                        <span>Loading authorized users...</span>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <span>No users found.</span>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isCurrent = u.username === currentAuthUser?.username;
                      return (
                        <tr 
                          key={u.id}
                          className={`transition ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-xs whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                <User className="w-3.5 h-3.5" />
                              </span>
                              <span className={isDark ? 'text-white' : 'text-slate-900'}>{u.username}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  You
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-semibold whitespace-nowrap">
                            {u.full_name || '-'}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            {u.role === 'admin' ? (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1">
                                <Shield className="w-3 h-3 text-blue-400" />
                                <span>Administrator</span>
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border inline-flex items-center gap-1 ${
                                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                              }`}>
                                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                <span>Viewer</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {u.email || '-'}
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-500 text-xs whitespace-nowrap">
                            ••••••••
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(u)}
                                title="Edit User or Change Password"
                                className={`p-1.5 rounded-lg border transition ${
                                  isDark 
                                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-blue-400' 
                                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-blue-600'
                                }`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowDeleteModal(true);
                                }}
                                disabled={isCurrent}
                                title={isCurrent ? 'Cannot delete currently active account' : 'Delete User Account'}
                                className={`p-1.5 rounded-lg border transition ${
                                  isCurrent
                                    ? 'opacity-30 cursor-not-allowed border-slate-700 text-slate-500'
                                    : isDark 
                                      ? 'bg-slate-800 hover:bg-rose-950 border-slate-700 text-rose-400 hover:border-rose-800' 
                                      : 'bg-slate-100 hover:bg-rose-50 border-slate-300 text-rose-600 hover:border-rose-300'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW USER */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 animate-scale-in ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Add New System User</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                  User ID / Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. jsmith or tech_admin"
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono text-xs ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter user password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className={`w-full pl-3 pr-10 py-2.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Smith"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                    System Role
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="user">Viewer (Read Only)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="user@uuds.ae"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition disabled:opacity-50"
                >
                  {submittingUser ? 'Saving User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER & CHANGE PASSWORD */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 animate-scale-in ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Edit User Account</h3>
                  <p className="text-[11px] text-slate-400 font-mono">User ID: {selectedUser.username}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                  User ID / Username *
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border font-mono text-xs ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                    System Role
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="user">Viewer (Read Only)</option>
                    <option value="admin">Administrator (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 uppercase tracking-wider text-[11px] text-slate-400">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl border font-mono text-xs ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-xl border space-y-1.5 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[11px]">
                  <Key className="w-3.5 h-3.5" />
                  <span>Update Password (Optional)</span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Leave blank to keep existing password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    className={`w-full pl-3 pr-10 py-2 rounded-lg border font-mono text-xs ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">Only type here if you wish to reset or change this user's password.</p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                    isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition disabled:opacity-50"
                >
                  {submittingUser ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-sm p-6 rounded-2xl border shadow-2xl space-y-4 animate-scale-in ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-500">Delete User Account</h3>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete user account <strong className="text-white font-mono">{selectedUser.username}</strong> ({selectedUser.full_name || selectedUser.role})?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
                  isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingUser}
                onClick={handleDeleteUser}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md transition disabled:opacity-50"
              >
                {submittingUser ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
