import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Save, 
  RefreshCw, 
  Shield, 
  Clock
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import PageHeader from '../components/PageHeader';

export default function Settings() {
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

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

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-100px)] justify-between space-y-4">
      {/* Top Standardized Frozen 2-Line Header */}
      <PageHeader
        icon={SettingsIcon}
        title="System & Notification Settings"
        subtitle="Configure Microsoft 365 / Outlook credentials and automated weekly compliance schedules."
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition disabled:opacity-50 shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        }
      />

      {/* Main Content Area - Clean 2-Column Grid that fits on screen without scrolling */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch overflow-hidden">
        
        {/* Left Column: Office 365 / Outlook Authentication Box (Span 7) */}
        <div className={`lg:col-span-7 p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-3.5">
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
        <div className={`lg:col-span-5 p-5 rounded-3xl border shadow-xl flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="space-y-3.5">
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

          <div className={`p-3 rounded-2xl border text-[11px] leading-relaxed mt-4 ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className="font-bold text-blue-500">Compliance Audit:</span> Automated reports are generated every Monday with the latest roster data and delivered to designated management personnel.
          </div>
        </div>
      </div>
    </div>
  );
}
