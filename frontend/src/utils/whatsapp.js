/**
 * WhatsApp Single-Tab Dispatch Utility
 * Ensures all WhatsApp triggers reuse the same dedicated tab ('uuds_whatsapp_window')
 * and use the proper WhatsApp Web deep link route (https://web.whatsapp.com/send/?phone=...&text=...).
 */

export const openWhatsApp = (rawMobile, messageText) => {
  if (!rawMobile) return;

  // Clean phone number: strip non-digits, format UAE mobile if local
  let clean = String(rawMobile).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '971' + clean.slice(1);
  } else if (clean.length === 9) {
    clean = '971' + clean;
  }

  const encodedText = encodeURIComponent(messageText || '');
  // WhatsApp Web deep-link requires the trailing slash before query parameters
  const targetUrl = `https://web.whatsapp.com/send/?phone=${clean}&text=${encodedText}`;
  const targetWindowName = 'uuds_whatsapp_window';

  // Synchronous window.open within user-gesture stack to guarantee popup blocker doesn't block it
  const waWin = window.open(targetUrl, targetWindowName);
  if (waWin) {
    try {
      waWin.focus();
    } catch (err) {}
  }

  // Also copy to clipboard for convenience in case user wants to paste directly
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(messageText).catch(() => {});
  }
};
