/**
 * WhatsApp Dispatch Utility
 * Uses official https://api.whatsapp.com/send?phone=...&text=...
 * to ensure WhatsApp Web/App opens reliably without blank screens,
 * and copies the message text to the clipboard for instant manual pasting into existing chats.
 */

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
