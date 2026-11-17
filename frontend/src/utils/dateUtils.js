const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format any date into standard aviation compliance format: DD-MMM-YYYY (e.g. 11-Nov-2026, 16-Jan-2028)
 */
export function formatDate(val) {
  if (!val) return '-';
  const str = String(val).trim();
  if (!str || str === 'None' || str === 'null' || str === '-') return '-';
  
  // Non-date compliance flags
  if (/^(yes|no|planned|n\/a)$/i.test(str)) {
    return str.toUpperCase();
  }

  // If already in DD-Mon-YYYY format (e.g. 11-Nov-2026 or 11-NOV-2026)
  const dmyAlphaMatch = str.match(/^(\d{1,2})[\-\/]([A-Za-z]{3})[\-\/](\d{4})$/);
  if (dmyAlphaMatch) {
    const day = dmyAlphaMatch[1].padStart(2, '0');
    const mon = dmyAlphaMatch[2].slice(0, 1).toUpperCase() + dmyAlphaMatch[2].slice(1, 3).toLowerCase();
    const yr = dmyAlphaMatch[3];
    return `${day}-${mon}-${yr}`;
  }

  try {
    // Clean string: take date part before space or T
    const cleanStr = str.split('T')[0].split(' ')[0];
    
    // Check for YYYY-MM-DD
    const isoMatch = cleanStr.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${String(day).padStart(2, '0')}-${MONTHS[monthIdx]}-${year}`;
      }
    }

    // Check for DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const monthIdx = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${String(day).padStart(2, '0')}-${MONTHS[monthIdx]}-${year}`;
      }
    }

    // Try standard JS Date constructor
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // In Dubai timezone if possible
      const day = d.toLocaleDateString('en-GB', { day: '2-digit', timeZone: 'Asia/Dubai' });
      const mon = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Asia/Dubai' });
      const year = d.toLocaleDateString('en-GB', { year: 'numeric', timeZone: 'Asia/Dubai' });
      return `${day}-${mon}-${year}`;
    }
  } catch (e) {
    // fallback
  }

  return str;
}

/**
 * Format any datetime/timestamp strictly into Dubai Time (Asia/Dubai, UTC+4):
 * e.g. 11-Nov-2026, 04:30:15 PM
 */
export function formatDubaiDateTime(val, withSeconds = true) {
  if (!val) return '-';
  try {
    let dateStr = String(val).trim();
    if (!dateStr || dateStr === 'None' || dateStr === 'null') return '-';

    // If SQLite UTC timestamp without 'Z' (e.g. '2026-11-04 12:57:18' or '2026-11-04T12:57:18')
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateStr)) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateStr)) {
      dateStr = dateStr + 'Z';
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(val);

    const day = d.toLocaleDateString('en-GB', { day: '2-digit', timeZone: 'Asia/Dubai' });
    const mon = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Asia/Dubai' });
    const year = d.toLocaleDateString('en-GB', { year: 'numeric', timeZone: 'Asia/Dubai' });
    const dateFormatted = `${day}-${mon}-${year}`;

    const timeFormatted = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: true,
      timeZone: 'Asia/Dubai'
    });

    return `${dateFormatted}, ${timeFormatted}`;
  } catch (e) {
    return String(val);
  }
}

/**
 * Format time only in Dubai timezone (e.g. 04:30:15 PM)
 */
export function formatDubaiTime(val, withSeconds = true) {
  if (!val) return '-';
  try {
    let dateStr = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateStr)) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(val);

    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: true,
      timeZone: 'Asia/Dubai'
    });
  } catch (e) {
    return String(val);
  }
}

/**
 * Format any action string that contains raw ISO dates (YYYY-MM-DD)
 * e.g. "Updated GEN-101 for UUDS-364: Expiry None -> 2029-11-04 (Valid)"
 * into: "Updated GEN-101 for UUDS-364: Expiry None -> 04-Nov-2029 (Valid)"
 */
export function formatActionText(actionStr) {
  if (!actionStr) return '';
  return String(actionStr).replace(/\b(\d{4})[\-\/](\d{2})[\-\/](\d{2})\b/g, (match, y, m, d) => {
    const mIdx = parseInt(m, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${d}-${MONTHS[mIdx]}-${y}`;
    }
    return match;
  });
}

/**
 * Backward-compatible alias
 */
export const formatDateTime = formatDubaiDateTime;
