const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format any date into standard aviation compliance format: DD-Mon-YYYY (e.g. 20-Sep-2026)
 */
export function formatDate(val) {
  if (!val) return '-';
  const str = String(val).trim();
  if (!str || str === 'None' || str === 'null') return '-';
  
  // Non-date flags
  if (/^(yes|no|planned|n\/a)$/i.test(str)) {
    return str.toUpperCase();
  }

  // If already in DD-Mon-YYYY format (e.g. 20-Sep-2026)
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[0].padStart(2, '0')}-${parts[1].slice(0, 1).toUpperCase() + parts[1].slice(1, 3).toLowerCase()}-${parts[2]}`;
  }

  // Try parsing ISO or other standard formats
  try {
    // Clean string: take date part before space or T
    const cleanStr = str.split('T')[0].split(' ')[0];
    
    // Check for YYYY-MM-DD
    const isoMatch = cleanStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const monthIdx = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${String(day).padStart(2, '0')}-${MONTHS[monthIdx]}-${year}`;
      }
    }

    // Check for DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
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
      const day = String(d.getDate()).padStart(2, '0');
      const mon = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${mon}-${year}`;
    }
  } catch (e) {
    // fallback
  }

  return str;
}

/**
 * Format datetime string into: DD-Mon-YYYY HH:mm:ss
 */
export function formatDateTime(val) {
  if (!val) return '-';
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const mon = MONTHS[d.getMonth()];
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${day}-${mon}-${year} ${time}`;
    }
  } catch (e) {}
  return String(val);
}
