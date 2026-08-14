export interface PdfReportColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Centralized Narrow-Margin A4 Portrait Executive HTML/CSS PDF Document Generator
 * Optimized for real-world document printing with 100% color/font preservation on saved PDFs.
 */
export function buildBaseA4HtmlDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    /* Force 100% Color & Background Preservation in PDF Export */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #334155;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* Sticky Top Action Bar */
    .sticky-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      border-bottom: 1px solid #1e293b;
    }
    .toolbar-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-title span.badge {
      background: #475569;
      color: #cbd5e1;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 18px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .btn-print {
      background: #4f46e5;
      color: #ffffff;
    }
    .btn-print:hover {
      background: #4338ca;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
    }
    .btn-close {
      background: #334155;
      color: #cbd5e1;
    }
    .btn-close:hover {
      background: #475569;
      color: #ffffff;
    }

    /* Real-World Narrow Margin A4 Canvas */
    .document-wrapper {
      padding: 24px 0;
      display: flex;
      justify-content: center;
      background-color: #334155;
    }
    .a4-page {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm 12mm 18mm 12mm;
      background: #ffffff !important;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      border-radius: 2px;
      position: relative;
      box-sizing: border-box;
    }

    /* Content Wrapper */
    .doc-content {
      width: 100%;
    }

    /* Footer - Absolute Sticky Bottom Anchor */
    .doc-footer {
      position: absolute;
      bottom: 8mm;
      left: 12mm;
      right: 12mm;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1 !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #64748b !important;
      font-weight: 600;
      background-color: #ffffff !important;
    }

    /* NARROW MARGIN REAL-WORLD PRINT STYLES */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { background-color: #ffffff !important; }
      .sticky-toolbar { display: none !important; }
      .document-wrapper { padding: 0 !important; background: transparent !important; }
      .a4-page {
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        padding: 0 0 16mm 0 !important;
        margin: 0 !important;
        position: relative !important;
      }
      .doc-footer {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background: #ffffff !important;
        padding-top: 6px !important;
        border-top: 1px solid #cbd5e1 !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
    }

    /* Header Branding */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .company-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #4f46e5 0%, #1e1b4b 100%) !important;
      color: #ffffff !important;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);
    }
    .company-name {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a !important;
      letter-spacing: -0.4px;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .company-tagline {
      font-size: 9.5px;
      color: #64748b !important;
      font-weight: 600;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-type-badge {
      display: inline-block;
      padding: 3px 10px;
      background: #f1f5f9 !important;
      color: #1e293b !important;
      font-size: 9.5px;
      font-weight: 800;
      border-radius: 20px;
      border: 1px solid #cbd5e1 !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-date {
      font-size: 9.5px;
      color: #64748b !important;
      margin-top: 4px;
      font-weight: 600;
    }

    /* Content Typography */
    h1.report-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a !important;
      letter-spacing: -0.3px;
      margin-bottom: 3px;
    }
    p.subtitle {
      font-size: 10.5px;
      color: #64748b !important;
      font-weight: 500;
      margin-bottom: 14px;
    }

    /* KPI Summary Grid - Preserved Card Styling */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .kpi-box {
      padding: 10px 12px;
      background: #f8fafc !important;
      border: 1px solid #e2e8f0 !important;
      border-left: 4px solid #4f46e5 !important;
      border-radius: 8px;
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #64748b !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .kpi-val {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a !important;
      font-variant-numeric: tabular-nums;
      margin-top: 3px;
    }

    /* Tables Optimized for High Density Narrow Margin Printing */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10px;
    }
    table.data-table th {
      background-color: #0f172a !important;
      color: #ffffff !important;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
      border: none;
    }
    table.data-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0 !important;
      color: #1e293b !important;
      font-variant-numeric: tabular-nums;
    }
    table.data-table tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }

    /* Alignment & Color Utilities */
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .text-emerald { color: #047857 !important; }
    .text-rose { color: #be123c !important; }


    /* NARROW MARGIN REAL-WORLD PRINT STYLES */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { background-color: #ffffff !important; }
      .sticky-toolbar { display: none !important; }
      .document-wrapper { padding: 0 !important; background: transparent !important; }
      .a4-page {
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
    }
  </style>
</head>
<body>
  <!-- Sticky Top Action Bar -->
  <div class="sticky-toolbar">
    <div class="toolbar-title">
      <span>📄 ${title}</span>
      <span class="badge">A4 Narrow Margins</span>
    </div>
    <div class="toolbar-actions">
      <button class="btn btn-print" onclick="window.print()">🖨️ Print / Export PDF</button>
      <button class="btn btn-close" onclick="window.close()">✕ Close</button>
    </div>
  </div>

  <!-- A4 Page Container -->
  <div class="document-wrapper">
    <div class="a4-page">
      <div>
        <!-- Header Branding -->
        <div class="doc-header">
          <div class="company-brand">
            <div class="brand-icon">🚚</div>
            <div>
              <span class="company-name">Fleet Management System</span>
              <div class="company-tagline">Automated Operational & Financial Statement</div>
            </div>
          </div>
          <div class="doc-meta">
            <span class="doc-type-badge">Official Report</span>
            <div class="doc-date">Generated: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <!-- Main Body Content -->
        ${bodyHtml}
      </div>

      <!-- Footer Signature -->
      <div class="doc-footer">
        <span>Confidential • Transport Fleet System</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildReportPdfHtml(
  reportTitle: string,
  filterDescription: string,
  columns: PdfReportColumn[],
  data: any[],
  kpis?: { label: string; value: string; color?: string }[]
): string {
  let kpiHtml = '';
  if (kpis && kpis.length) {
    kpiHtml = `<div class="kpi-grid">
      ${kpis
        .map(
          (k) => `<div class="kpi-box" style="border-left-color: ${k.color || '#4f46e5'} !important;">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-val" style="color: ${k.color || '#0f172a'} !important;">${k.value}</div>
      </div>`
        )
        .join('')}
    </div>`;
  }

  let tableHeader = columns
    .map((c) => `<th class="text-${c.align || 'left'}">${c.header}</th>`)
    .join('');

  let tableRows = data
    .map(
      (row) => `<tr>
      ${columns
        .map((c) => {
          const val = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '-';
          return `<td class="text-${c.align || 'left'}">${val}</td>`;
        })
        .join('')}
    </tr>`
    )
    .join('');

  if (!data.length) {
    tableRows = `<tr><td colspan="${columns.length}" class="text-center" style="padding: 20px; color: #94a3b8;">No matching records found for the selected timeframe.</td></tr>`;
  }

  const bodyHtml = `
    <h1 class="report-title">${reportTitle}</h1>
    <p class="subtitle">${filterDescription}</p>
    ${kpiHtml}
    <table class="data-table">
      <thead><tr>${tableHeader}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;

  return buildBaseA4HtmlDocument(reportTitle, bodyHtml);
}

export function buildDriverLedgerPdfHtml(
  driverName: string,
  period: string,
  basicSalary: number,
  completedTripsCount: number,
  totalTripCommission: number,
  allowances: number,
  deductions: number,
  advance: number,
  netSalary: number,
  paymentStatus: string,
  trips: { date: string; transportNo: string; fromTo: string; commission: number }[]
): string {
  const kpis = [
    { label: 'Basic Monthly Salary', value: `AED ${basicSalary.toLocaleString()}`, color: '#1e293b' },
    { label: `Completed Trips (${completedTripsCount})`, value: `AED ${totalTripCommission.toLocaleString()}`, color: '#0284c7' },
    { label: 'Allowances / Advance', value: `+${allowances} / -${advance}`, color: '#d97706' },
    { label: 'Net Payable Salary', value: `AED ${netSalary.toLocaleString()}`, color: '#047857' },
  ];

  let kpiHtml = `<div class="kpi-grid">
    ${kpis
      .map(
        (k) => `<div class="kpi-box" style="border-left-color: ${k.color} !important;">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-val" style="color: ${k.color} !important;">${k.value}</div>
    </div>`
      )
      .join('')}
  </div>`;

  let tripRows = trips
    .map(
      (t) => `<tr>
    <td class="font-mono">${t.date}</td>
    <td class="font-mono font-bold" style="color: #4f46e5 !important">${t.transportNo}</td>
    <td>${t.fromTo}</td>
    <td class="text-right font-mono font-bold text-emerald">+AED ${t.commission.toLocaleString()}</td>
  </tr>`
    )
    .join('');

  if (!trips.length) {
    tripRows = `<tr><td colspan="4" class="text-center" style="padding: 20px; color: #94a3b8;">No transport trip records logged for this period.</td></tr>`;
  }

  const bodyHtml = `
    <h1 class="report-title">Driver Monthly Ledger & Payslip Statement</h1>
    <p class="subtitle">Driver: <strong>${driverName}</strong> &nbsp;|&nbsp; Period: <strong>${period}</strong> &nbsp;|&nbsp; Payment Status: <strong style="color: ${paymentStatus === 'PAID' ? '#047857' : '#d97706'} !important;">${paymentStatus}</strong></p>
    
    ${kpiHtml}

    <h2 style="font-size: 11px; font-weight: 800; color: #0f172a !important; margin-top: 18px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">Detailed Trip Commission Ledger (${trips.length} Trips)</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Transport #</th>
          <th>Route (From → To)</th>
          <th class="text-right">Trip Commission (AED)</th>
        </tr>
      </thead>
      <tbody>
        ${tripRows}
      </tbody>
    </table>
  `;

  return buildBaseA4HtmlDocument(`Driver Ledger - ${driverName} (${period})`, bodyHtml);
}

export function buildPnlPdfHtml(pnl: {
  periodLabel: string;
  totalTripsCount: number;
  tripRevenue: number;
  tonRevenue: number;
  totalGrossRevenue: number;
  driverCommissionsCost: number;
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  totalOperatingCosts: number;
  netProfit: number;
  profitMarginPercentage: number;
}): string {
  const isProfitable = pnl.netProfit >= 0;

  const bodyHtml = `
    <h1 class="report-title">Profit & Loss Income Statement (P&L)</h1>
    <p class="subtitle">Timeframe Period: <strong>${pnl.periodLabel}</strong> &nbsp;|&nbsp; Total Completed Transport Trips: <strong>${pnl.totalTripsCount}</strong></p>

    <div class="kpi-grid">
      <div class="kpi-box" style="border-left-color: #047857 !important;">
        <div class="kpi-label">Gross Revenue</div>
        <div class="kpi-val text-emerald">AED ${pnl.totalGrossRevenue.toLocaleString()}</div>
      </div>
      <div class="kpi-box" style="border-left-color: #be123c !important;">
        <div class="kpi-label">Total Operating Expenses</div>
        <div class="kpi-val text-rose">AED ${pnl.totalOperatingCosts.toLocaleString()}</div>
      </div>
      <div class="kpi-box" style="border-left-color: ${isProfitable ? '#047857' : '#be123c'} !important;">
        <div class="kpi-label">Net Profit / (Loss)</div>
        <div class="kpi-val ${isProfitable ? 'text-emerald' : 'text-rose'}">AED ${pnl.netProfit.toLocaleString()}</div>
      </div>
      <div class="kpi-box" style="border-left-color: ${isProfitable ? '#047857' : '#be123c'} !important;">
        <div class="kpi-label">Profit Margin Ratio</div>
        <div class="kpi-val ${isProfitable ? 'text-emerald' : 'text-rose'}">${pnl.profitMarginPercentage}%</div>
      </div>
    </div>

    <h2 style="font-size: 11px; font-weight: 800; color: #0f172a !important; margin-top: 18px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">1. Operational Income & Revenue Streams</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Revenue Account Category</th>
          <th class="text-right">Amount (AED)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Fixed Price Transport Trips Revenue</td>
          <td class="text-right font-mono font-bold">AED ${pnl.tripRevenue.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Ton Rate Transport Trips Revenue</td>
          <td class="text-right font-mono font-bold">AED ${pnl.tonRevenue.toLocaleString()}</td>
        </tr>
        <tr style="background: #f1f5f9 !important; font-weight: bold;">
          <td style="font-weight: 800; color: #0f172a !important">TOTAL GROSS REVENUE</td>
          <td class="text-right font-mono text-emerald font-extrabold" style="font-size: 11.5px">AED ${pnl.totalGrossRevenue.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <h2 style="font-size: 11px; font-weight: 800; color: #0f172a !important; margin-top: 18px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px;">2. Direct Fleet Operating Costs & Expenses</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Expense Account Category</th>
          <th class="text-right">Amount (AED)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Fleet Diesel Fuel Expenses</td>
          <td class="text-right font-mono text-rose font-semibold">AED ${pnl.fuelCost.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Vehicle Maintenance, Service & Repairs</td>
          <td class="text-right font-mono text-rose font-semibold">AED ${pnl.maintenanceCost.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Other Vehicle Operational Expenses</td>
          <td class="text-right font-mono text-rose font-semibold">AED ${pnl.otherExpenses.toLocaleString()}</td>
        </tr>
        <tr style="background: #fff1f2 !important; font-weight: bold;">
          <td style="font-weight: 800; color: #9f1239 !important">TOTAL OPERATING EXPENSES</td>
          <td class="text-right font-mono text-rose font-extrabold" style="font-size: 11.5px">AED ${pnl.totalOperatingCosts.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 20px; padding: 14px 18px; background: ${isProfitable ? '#ecfdf5' : '#fff1f2'} !important; border: 2px solid ${isProfitable ? '#059669' : '#e11d48'} !important; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 12px; font-weight: 900; color: ${isProfitable ? '#065f46' : '#9f1239'} !important; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Net Operating ${isProfitable ? 'Profit' : 'Loss'}</span>
        <span style="font-size: 9.5px; color: ${isProfitable ? '#047857' : '#be123c'} !important; font-weight: 600;">Net income after all operating expenses & commissions</span>
      </div>
      <span style="font-size: 20px; font-weight: 900; font-family: ui-monospace, SFMono-Regular, monospace; color: ${isProfitable ? '#047857' : '#be123c'} !important;">AED ${pnl.netProfit.toLocaleString()}</span>
    </div>
  `;

  return buildBaseA4HtmlDocument(`Profit & Loss Statement - ${pnl.periodLabel}`, bodyHtml);
}
