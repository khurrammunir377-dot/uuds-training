/**
 * WhatsApp Dispatch Utility
 * Uses official https://api.whatsapp.com/send?phone=...&text=...
 * to ensure WhatsApp Web/App opens reliably without blank screens,
 * and copies the message text to the clipboard for instant manual pasting into existing chats.
 */

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format date in Day-FullMonth-Year (e.g. 18-October-2026)
 */
export function formatFullDate(val) {
  if (!val) return 'Immediate';
  const str = String(val).trim();
  if (!str || str === '-' || str === 'None' || str === 'null') return 'Immediate';

  try {
    const cleanStr = str.split('T')[0].split(' ')[0];

    // Check YYYY-MM-DD
    const isoMatch = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day}-${FULL_MONTHS[monthIdx]}-${year}`;
      }
    }

    // Check DD-Mon-YYYY (e.g. 18-Oct-2026 or 18-October-2026)
    const dMonYMatch = cleanStr.match(/^(\d{1,2})-([A-Za-z]+)-(\d{4})$/);
    if (dMonYMatch) {
      const day = parseInt(dMonYMatch[1], 10);
      const mStr = dMonYMatch[2].toLowerCase();
      const year = parseInt(dMonYMatch[3], 10);
      const monthIdx = FULL_MONTHS.findIndex(m => m.toLowerCase().startsWith(mStr.slice(0, 3)));
      if (monthIdx >= 0) {
        return `${day}-${FULL_MONTHS[monthIdx]}-${year}`;
      }
    }

    // Standard Date
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = FULL_MONTHS[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  } catch (e) {}

  return str;
}

/**
 * Formats the official compliance WhatsApp message:
 * 
 * Dear {Name},
 * 
 * This is an official compliance notification regarding your aviation training records. Please note that the following certification requires immediate renewal:
 * 
 * * {Code}: {Name} (Expiry: {Date} — {Status})
 * 
 * If you have already completed this course, kindly submit a screenshot of your Learning History so that we can update our records accordingly.
 * 
 * Best regards,
 * 
 * Manager Training
 * UUDS Aero (DXB)
 */
export function formatWhatsAppComplianceMessage({ fullName, courses = [] }) {
  const courseList = Array.isArray(courses) ? courses : [courses];

  const courseLines = courseList.map(c => {
    const code = c.code || c.course_code || 'COMPLIANCE';
    const name = c.name || c.course_name || 'Recurrent Aviation Safety Training';
    const expiry = formatFullDate(c.expiry_date || c.expiryDate);
    const status = c.status || 'Due Within 30 Days';
    return `* ${code}: ${name} (Expiry: ${expiry} — ${status})`;
  }).join('\n');

  const certText = courseList.length > 1 ? 'certifications require' : 'certification requires';
  const completedText = courseList.length > 1 ? 'these courses' : 'this course';

  return `Dear ${fullName || 'Staff Member'},\n\n` +
    `This is an official compliance notification regarding your aviation training records. Please note that the following ${certText} immediate renewal:\n\n` +
    `${courseLines}\n\n` +
    `If you have already completed ${completedText}, kindly submit a screenshot of your Learning History so that we can update our records accordingly.\n\n` +
    `Best regards,\n\n` +
    `Manager Training\n` +
    `UUDS Aero (DXB)`;
}

export const openWhatsApp = (rawMobile, messageText) => {
  if (!rawMobile) return;

  // Clean phone number: keep only digits, format UAE mobile if local
  let clean = String(rawMobile).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '971' + clean.slice(1);
  } else if (clean.length === 9) {
    clean = '971' + clean;
  }

  const encodedText = encodeURIComponent(messageText || '');

  // Copy message to clipboard so user can immediately paste (Ctrl+V) into an existing open chat
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(messageText).catch(() => {});
  }

  // Official universal WhatsApp endpoint (reliable, never shows blank screen)
  const targetUrl = `https://api.whatsapp.com/send?phone=${clean}&text=${encodedText}`;
  const targetWindowName = 'uuds_whatsapp_window';

  // Direct synchronous window.open in user event loop
  const waWin = window.open(targetUrl, targetWindowName);
  if (waWin) {
    try {
      waWin.focus();
    } catch (err) {}
  }
};
