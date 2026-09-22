import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Mail, 
  Send, 
  MessageCircle, 
  RefreshCw, 
  Eye, 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Search,
  ExternalLink,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../components/Toast';
import { useTheme } from '../context/ThemeContext';
import { formatDate, formatDateTime } from '../utils/dateUtils';
import { openWhatsApp as sendWhatsApp } from '../utils/whatsapp';
import PageHeader from '../components/PageHeader';

export default function Notifications({ onSelectEmployee }) {
  const { isDark } = useTheme();
  const toast = useToast();

  const [emailLogs, setEmailLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [overrideEmail, setOverrideEmail] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  // Email Preview Modal
  const [previewLogId, setPreviewLogId] = useState(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Manager Email Modal
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [managerFormData, setManagerFormData] = useState({
    to_email: '',
    cc_email: 'nsilva@uuds.ae, qa@uuds.ae',
    subject: 'URGENT: Aviation Safety Training Expiry Notice - Department Manpower Status',
    department: 'Base Maintenance',
    include_report: true,
    message_body: `Dear Manager,\n\nThis is an official compliance notice from the UUDS Training Department regarding personnel in your department.\n\nOur records indicate that several team members have mandatory safety certifications that are currently OVERDUE or DUE FOR RENEWAL within the next 30 days under GCAA CAR 145 and EASA Part 145 regulatory standards.\n\nPlease review the attached compliance audit schedule and coordinate with the Training Department immediately to schedule recurrent sessions.\n\nNote: Staff with expired certifications must not perform aircraft certification or safety-critical maintenance tasks until recurrent training is completed.\n\nBest regards,\nManager Training, UUDS Aero (DXB)`
  });
  const [sendingManagerEmail, setSendingManagerEmail] = useState(false);

  // Urgent staff quick list for WhatsApp direct notifications
  const [urgentStaff, setUrgentStaff] = useState([]);
  const [loadingUrgent, setLoadingUrgent] = useState(true);
  const [staffSearch, setStaffSearch] = useState('');

  useEffect(() => {
    loadLogs();
    loadUrgentStaff();
  }, []);

  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await api.getEmailLogs();
      setEmailLogs(data || []);
    } catch (err) {
      toast.error(`Failed to load email logs: ${err.message}`);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadUrgentStaff = async () => {
    try {
      setLoadingUrgent(true);
      const data = await api.getReminders();
      setUrgentStaff(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUrgent(false);
    }
  };

  const handleSendWeeklyReport = async () => {
    setSendingEmail(true);
    try {
      const recipient = overrideEmail.trim() ? overrideEmail.trim() : null;
      const res = await api.sendEmailReminder(recipient);
      if (res.status === 'Sent') {
        toast.success(`Compliance report dispatched successfully to ${res.recipient}!`);
      } else if (res.status === 'Simulated') {
        toast.info(`Simulated report generated & logged for ${res.recipient}.`);
      } else {
        toast.error(`Email dispatch failed: ${res.error || 'Check SMTP configuration'}`);
      }
      loadLogs();
      if (overrideEmail) setOverrideEmail('');
    } catch (err) {
      toast.error(`Error sending email: ${err.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendManagerEmail = async (e) => {
    e.preventDefault();
    if (!managerFormData.to_email.trim()) {
      toast.warning('Please specify the recipient manager email address.');
      return;
    }
    setSendingManagerEmail(true);
    try {
      const res = await api.sendManagerEmail({
        to_email: managerFormData.to_email.trim(),
        cc_email: managerFormData.cc_email.trim(),
        subject: managerFormData.subject.trim(),
        message_body: managerFormData.message_body,
        include_report: managerFormData.include_report
      });
      if (res.status === 'Sent') {
        toast.success(`Manager notification dispatched to ${res.recipient}!`);
      } else {
        toast.info(`Simulated email logged for ${res.recipient}.`);
      }
      setShowManagerModal(false);
      loadLogs();
    } catch (err) {
      toast.error(`Failed to dispatch manager email: ${err.message}`);
    } finally {
      setSendingManagerEmail(false);
    }
  };

  const handlePreviewEmail = async (logId) => {
    setPreviewLogId(logId);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/reminders/logs/${logId}/preview`);
      const html = await res.text();
      setPreviewHtml(html);
    } catch (err) {
      toast.error('Failed to load email preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const openWhatsApp = (item) => {
    const rawMobile = item.mobile_no || '';
    if (!rawMobile) {
      toast.warning(`No mobile number on file for ${item.full_name}. Please update in profile.`);
      return;
    }
    const msg = `Dear ${item.full_name},\n\n` +
      `This is an official training compliance reminder from UUDS Aero (DXB).\n` +
      `Your mandatory qualification for "${item.course_code} - ${item.course_name}" is ${urgency} (${daysNotice}).\n\n` +
      `Please report to the Training Department to schedule your recurrent training session.\n\n` +
      `Best regards,\nManager Training, UUDS Aero (DXB)`;

    sendWhatsApp(rawMobile, msg);
  };

  const filteredStaff = urgentStaff.filter(item => {
    if (!staffSearch.trim()) return true;
    const s = staffSearch.toLowerCase();
    return (
      item.full_name?.toLowerCase().includes(s) ||
      item.uuds_no?.toLowerCase().includes(s) ||
      item.course_code?.toLowerCase().includes(s) ||
      item.mobile_no?.includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Top Standardized Frozen 2-Line Header */}
      <PageHeader
        icon={Mail}
        theme="cyan"
        title="Email & WhatsApp Dispatch Operations"
        subtitle="Trigger automated weekly audit reports, dispatch direct WhatsApp reminders, and inspect communication logs."
      />

      {/* Top 2 Action Cards: Email Dispatcher + WhatsApp Quick Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Automated Weekly Email Dispatcher */}
        <div className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between h-full min-h-[480px] ${
          isDark 
            ? 'bg-gradient-to-br from-slate-900/90 via-slate-900 to-blue-950/30 border-slate-800' 
            : 'bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-blue-500/20 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">Weekly Compliance Audit Email</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Direct dispatch to Training Management
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                Weekly Auto-Cron
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-700/40">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Default Recipient</span>
                <span className="font-mono font-bold text-blue-500">nsilva@uuds.ae</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-700/40">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Authorized Sign-Off</span>
                <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Manager Training, UUDS Aero (DXB)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-dashed border-slate-700/40">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Schedule Cadence</span>
                <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Every Monday @ 08:00</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Compliance Report Scope</span>
                <span className="font-bold text-emerald-500">All Overdue & 30-Day Expiries</span>
              </div>
            </div>

            {/* Custom Recipient Override Toggle */}
            <div className="mt-4 pt-3 border-t border-slate-700/40">
              {showOverride ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Override / Test Recipient Email
                    </label>
                    <button 
                      onClick={() => { setShowOverride(false); setOverrideEmail(''); }}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Cancel Override
                    </button>
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. auditor@airline.com"
                    value={overrideEmail}
                    onChange={(e) => setOverrideEmail(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowOverride(true)}
                  className="text-xs text-blue-500 hover:underline font-semibold"
                >
                  + Send to custom / test email address instead
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={handleSendWeeklyReport}
              disabled={sendingEmail}
              className="flex-1 py-3 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {sendingEmail ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {sendingEmail ? 'Dispatching...' : 'Send Weekly Report'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowManagerModal(true)}
              className="flex-1 py-3 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-1.5 transition"
            >
              <Mail className="w-4 h-4" />
              <span>Compose Manager Email</span>
            </button>
          </div>
        </div>

        {/* Card 2: WhatsApp Dispatch & Broadcast Assistant */}
        <div className={`p-6 rounded-3xl border shadow-xl flex flex-col justify-between h-full min-h-[480px] ${
          isDark 
            ? 'bg-gradient-to-br from-slate-900/90 via-slate-900 to-emerald-950/30 border-slate-800' 
            : 'bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-500 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold">WhatsApp Direct Reminder Hub</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    1-Click personalized WhatsApp alerts to technical staff
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Direct WhatsApp API
              </span>
            </div>

            {/* Template Message Box */}
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
              isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Standard Aviation Compliance Template:</span>
              </div>
              <p className="font-mono text-[11px] leading-relaxed italic opacity-90">
                "Dear [Staff Name], this is an official training compliance reminder from UUDS Aero (DXB). Your mandatory qualification for [Course Code & Name] is due/overdue (Expiry: [DD-Mon-YYYY]). Please report to the Training Department to schedule your recurrent training. Best regards, Manager Training, UUDS Aero (DXB)"
              </p>
            </div>

            {/* Quick Staff Search for WhatsApp */}
            <div className="mt-4 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Quick search staff to WhatsApp..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Mini List of Urgent Staff with fixed height container so typing search never resizes cards */}
              <div className="space-y-1.5 h-44 overflow-y-auto pr-1">
                {loadingUrgent ? (
                  <p className="text-xs text-slate-400 py-2 text-center">Loading urgent staff...</p>
                ) : filteredStaff.length === 0 ? (
                  <p className="text-xs text-emerald-500 py-2 text-center font-semibold">No urgent staff found.</p>
                ) : (
                  filteredStaff.slice(0, 10).map((emp) => (
                    <div 
                      key={emp.record_id}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{emp.full_name}</div>
                        <div className="text-[10px] font-mono text-blue-500">
                          {emp.uuds_no} • {emp.course_code} ({formatDate(emp.expiry_date)})
                        </div>
                      </div>

                      <button
                        onClick={() => openWhatsApp(emp)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow shrink-0 transition"
                      >
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/40 text-[11px] text-slate-400 flex items-center justify-end">
            <span className="font-semibold text-emerald-500">{urgentStaff.length} actions pending</span>
          </div>
        </div>
      </div>


      {/* Card 3: Complete Email Dispatch Audit Logs with Interactive HTML Previewer */}
      <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-700/30">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              <span>Email Dispatch & Delivery Audit Logs</span>
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              History of all automated and manual compliance reports dispatched to management.
            </p>
          </div>

          <button
            onClick={loadLogs}
            disabled={loadingLogs}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin text-blue-500' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Frozen Table of Logs */}
        <div className={`border rounded-2xl overflow-hidden max-h-80 overflow-y-auto ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-300 bg-white'
        }`}>
          <table className={`w-full text-left text-xs border-collapse ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
            <thead className={`sticky top-0 z-10 shadow-sm ${
              isDark ? 'bg-slate-900 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-900 font-extrabold border-b border-slate-300'
            }`}>
              <tr className="text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3.5">Sent Timestamp</th>
                <th className="py-3 px-3.5">Recipient</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Summary / Scope</th>
                <th className="py-3 px-3.5 text-right">Interactive Preview</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
              {loadingLogs ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading dispatch logs...</span>
                  </td>
                </tr>
              ) : emailLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No compliance emails have been sent yet. Click "Send Weekly Compliance Report Now" above.
                  </td>
                </tr>
              ) : (
                emailLogs.map((log) => (
                  <tr key={log.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                    <td className={`py-3 px-3.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                      {formatDateTime(log.created_at)}
                    </td>

                    <td className="py-3 px-3.5 font-bold font-mono">
                      {log.recipient}
                    </td>

                    <td className="py-3 px-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'Sent' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                          : log.status === 'Simulated'
                            ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {log.status}
                      </span>
                    </td>

                    <td className={`py-3 px-3.5 max-w-sm truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {log.summary}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => handlePreviewEmail(log.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-500/10 border border-blue-500/20 transition"
                        title="View rendered email HTML"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rendered Email Preview Modal */}
      {previewLogId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`border rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">Interactive Email Preview (Rendered HTML)</h3>
              </div>
              <button 
                onClick={() => setPreviewLogId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              {loadingPreview ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-xs text-slate-500">Rendering email template...</p>
                </div>
              ) : (
                <iframe
                  title="Rendered Email Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[65vh] border-0 rounded-xl bg-white shadow-inner"
                />
              )}
            </div>

            <div className={`px-6 py-3 border-t flex justify-end ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                onClick={() => setPreviewLogId(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Manager Notification Email Popup Modal with CC & Sample Text */}
      {showManagerModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          <div className={`border rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Compose Department Manager Compliance Notice</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Notify department heads regarding technical staff with due/overdue qualifications
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowManagerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendManagerEmail} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    To: Manager Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. basemaintenance.manager@uuds.ae"
                    value={managerFormData.to_email}
                    onChange={(e) => setManagerFormData({ ...managerFormData, to_email: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    CC Email(s) (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    placeholder="nsilva@uuds.ae, qa@uuds.ae"
                    value={managerFormData.cc_email}
                    onChange={(e) => setManagerFormData({ ...managerFormData, cc_email: e.target.value })}
                    className={`w-full px-3.5 py-2 rounded-xl text-xs border font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={managerFormData.subject}
                  onChange={(e) => setManagerFormData({ ...managerFormData, subject: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border font-medium ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Sample Email Message Body (Editable)
                </label>
                <textarea
                  rows={5}
                  required
                  value={managerFormData.message_body}
                  onChange={(e) => setManagerFormData({ ...managerFormData, message_body: e.target.value })}
                  className={`w-full px-3.5 py-2 rounded-xl text-xs border font-sans leading-relaxed ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Attachment Indicator */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-slate-300' : 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="text-emerald-500 font-bold text-lg">📎</span>
                  <div>
                    <span className="font-bold">Attached Report:</span>
                    <span className="ml-1.5 font-mono text-[11px] text-blue-500 font-bold">UUDS_Training_Compliance_Audit_Report.xlsx</span>
                    <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Automated full manpower & regulatory training matrix will be attached to this notice.
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold shrink-0">
                  <input
                    type="checkbox"
                    checked={managerFormData.include_report}
                    onChange={(e) => setManagerFormData({ ...managerFormData, include_report: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Attach Report</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-700/40 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManagerModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingManagerEmail}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/40 flex items-center gap-2 transition disabled:opacity-50"
                >
                  {sendingManagerEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{sendingManagerEmail ? 'Dispatching Notice...' : 'Send Notice to Manager & CC'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
