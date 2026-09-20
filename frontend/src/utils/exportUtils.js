// Utility for exporting tables to CSV/Excel and triggering styled print/PDF dialogs

export function exportToCSV(data, headers, filename = 'compliance_export.csv') {
  if (!data || !data.length) return;

  // headers: array of { label: string, key: string }
  const headerRow = headers.map(h => `"${(h.label || '').replace(/"/g, '""')}"`).join(',');
  const rows = data.map(row => {
    return headers.map(h => {
      const val = row[h.key] !== undefined && row[h.key] !== null ? String(row[h.key]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headerRow, ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printTableAsPDF({ title, subtitle, headers, rows }) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print/export as PDF.');
    return;
  }

  const headerHtml = headers.map(h => `<th style="border: 1px solid #cbd5e1; padding: 8px 10px; background: #f1f5f9; text-align: left; font-size: 11px; font-weight: bold; color: #1e293b;">${h}</th>`).join('');
  const rowsHtml = rows.map((row, idx) => {
    const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    const cells = row.map(cell => `<td style="border: 1px solid #e2e8f0; padding: 6px 10px; font-size: 10px; color: #334155;">${cell || '-'}</td>`).join('');
    return `<tr style="background: ${bg};">${cells}</tr>`;
  }).join('');

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page { size: landscape; margin: 12mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 15px; color: #0f172a; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 15px; }
        .title { font-size: 18px; font-weight: 800; color: #1e3a8a; margin: 0; }
        .sub { font-size: 11px; color: #64748b; margin-top: 3px; }
        .stamp { text-align: right; font-size: 10px; color: #64748b; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .footer { margin-top: 20px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 class="title">UUDS AERO (DXB)</h1>
          <div class="sub">${title} ${subtitle ? `• ${subtitle}` : ''}</div>
        </div>
        <div class="stamp">
          <div>Generated: ${dateStr} ${timeStr}</div>
          <div>Authorized: Manager Training, UUDS Aero (DXB)</div>
          <div>GCAA CAR 145 & EASA Part 145 Compliance</div>
        </div>
      </div>
      <table>
        <thead><tr>${headerHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="footer">
        Confidential Aviation Compliance Document • UUDS Aero • Dubai International Airport (DXB)
      </div>
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
