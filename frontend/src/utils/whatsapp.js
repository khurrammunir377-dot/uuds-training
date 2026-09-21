/**
 * WhatsApp Web Single-Tab Dispatch Utility
 * Directly targets https://web.whatsapp.com/send to prevent wa.me from spawning new tabs,
 * and maintains a persistent tab reference to reuse the exact same WhatsApp Web tab.
 */

let waWindowRef = null;

export const openWhatsApp = (rawMobile, messageText) => {
  if (!rawMobile) return;

  // Clean phone number: strip non-digits, ensure UAE country code 971 if local
  let clean = String(rawMobile).replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '971' + clean.slice(1);
  } else if (clean.length === 9) {
    clean = '971' + clean;
  }

  const encodedText = encodeURIComponent(messageText || '');
  // Direct WhatsApp Web send URL
  const targetUrl = `https://web.whatsapp.com/send?phone=${clean}&text=${encodedText}`;
  const targetName = 'uuds_whatsapp_web_window';

  // Convenient clipboard copy of message in case user wants to paste or edit
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(messageText).catch(() => {});
  }

  // 1. Check if we already have an open reference to the WhatsApp tab
  try {
    const existingWin = waWindowRef || window.__uuds_whatsapp_tab;
    if (existingWin && !existingWin.closed) {
      existingWin.location.href = targetUrl;
      existingWin.focus();
      return;
    }
  } catch (err) {
    // Cross-origin policy might block reading some properties, fall through to window.open
  }

  // 2. Open or navigate the named tab and save the reference
  const newWin = window.open(targetUrl, targetName);
  waWindowRef = newWin;
  window.__uuds_whatsapp_tab = newWin;

  if (newWin) {
    try {
      newWin.focus();
    } catch (err) {}
  }
};
