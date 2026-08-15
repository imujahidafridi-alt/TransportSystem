export interface PdfReportColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
}

/**
 * Centralized A4 Executive HTML/CSS PDF Document Generator
 * Supports Portrait and Landscape orientations, optimized for razor-sharp Black & White laser printing.
 */
export function buildBaseA4HtmlDocument(
  title: string,
  bodyHtml: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): string {
  const isLandscape = orientation === 'landscape';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
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
      background-color: #1e293b;
      color: #000000;
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
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      border-bottom: 1px solid #334155;
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
      background: #334155;
      color: #e2e8f0;
      font-size: 10px;
      padding: 2px 9px;
      border-radius: 12px;
      font-weight: 700;
      letter-spacing: 0.3px;
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

    /* Screen Canvas Document Wrapper */
    .document-wrapper {
      padding: 24px 0;
      display: flex;
      justify-content: center;
      background-color: #1e293b;
    }
    .a4-page {
      width: ${isLandscape ? '297mm' : '210mm'};
      min-height: ${isLandscape ? '210mm' : '297mm'};
      padding: ${isLandscape ? '8mm 10mm 16mm 10mm' : '10mm 12mm 18mm 12mm'};
      background: #ffffff !important;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      border-radius: 2px;
      position: relative;
      box-sizing: border-box;
    }

    /* Footer - Absolute Sticky Bottom Anchor */
    .doc-footer {
      position: absolute;
      bottom: ${isLandscape ? '6mm' : '8mm'};
      left: ${isLandscape ? '10mm' : '12mm'};
      right: ${isLandscape ? '10mm' : '12mm'};
      padding-top: 6px;
      border-top: 1.5px solid #000000 !important;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      color: #334155 !important;
      font-weight: 700;
      background-color: #ffffff !important;
    }

    /* Header Branding - Razor-sharp B&W Print Layout */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #000000 !important;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .company-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      background: #000000 !important;
      color: #ffffff !important;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 900;
    }
    .company-name {
      font-size: 16px;
      font-weight: 900;
      color: #000000 !important;
      letter-spacing: -0.3px;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .company-tagline {
      font-size: 8.5px;
      color: #334155 !important;
      font-weight: 700;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-type-badge {
      display: inline-block;
      padding: 2px 8px;
      background: #ffffff !important;
      color: #000000 !important;
      font-size: 8.5px;
      font-weight: 800;
      border-radius: 4px;
      border: 1.5px solid #000000 !important;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .doc-date {
      font-size: 8.5px;
      color: #334155 !important;
      margin-top: 3px;
      font-weight: 600;
    }

    /* Content Typography */
    h1.report-title {
      font-size: 14px;
      font-weight: 900;
      color: #000000 !important;
      letter-spacing: -0.3px;
      margin-bottom: 2px;
    }
    p.subtitle {
      font-size: 9px;
      color: #475569 !important;
      font-weight: 600;
      margin-bottom: 10px;
    }

    /* KPI Cards - High-Contrast Black & White Boxed Styling */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-box {
      padding: 6px 10px;
      background: #ffffff !important;
      border: 1.5px solid #000000 !important;
      border-radius: 4px;
    }
    .kpi-label {
      font-size: 7.5px;
      font-weight: 800;
      color: #334155 !important;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .kpi-val {
      font-size: 12.5px;
      font-weight: 900;
      color: #000000 !important;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin-top: 1px;
    }

    /* Data Table - Black & White Crisp High Density Grid */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 8px;
      border-top: 1.5px solid #000000 !important;
      border-bottom: 1.5px solid #000000 !important;
    }
    table.data-table th {
      background-color: #f1f5f9 !important;
      color: #000000 !important;
      font-weight: 800;
      text-align: left;
      padding: 5px 6px;
      text-transform: uppercase;
      font-size: 7.5px;
      letter-spacing: 0.3px;
      border-top: 1.5px solid #000000 !important;
      border-bottom: 1.5px solid #000000 !important;
      border-left: 1px solid #cbd5e1 !important;
      border-right: 1px solid #cbd5e1 !important;
      white-space: nowrap;
    }
    table.data-table th:first-child { border-left: none !important; }
    table.data-table th:last-child { border-right: none !important; }

    table.data-table td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0 !important;
      color: #000000 !important;
      font-size: 8px;
      line-height: 1.25;
      vertical-align: middle;
    }
    table.data-table td:first-child { border-left: none !important; }
    table.data-table td:last-child { border-right: none !important; }

    table.data-table tr:nth-child(even) td {
      background-color: #f8fafc !important;
    }

    /* Alignment & Typography Utilities */
    .text-left { text-align: left !important; }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .nowrap { white-space: nowrap !important; }
    .font-mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
    .font-bold { font-weight: 700 !important; }
    .font-extrabold { font-weight: 900 !important; }

    /* Crisp B&W Status Badges */
    .status-badge {
      display: inline-block;
      padding: 1px 4px;
      font-size: 7px;
      font-weight: 800;
      border: 1px solid #000000 !important;
      border-radius: 2px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: #000000 !important;
      background: #ffffff !important;
    }
    .status-badge.cancelled {
      border: 1.5px solid #000000 !important;
      background: #f1f5f9 !important;
    }

    /* REAL-WORLD PRINT OVERRIDES */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      body { background-color: #ffffff !important; color: #000000 !important; }
      .sticky-toolbar { display: none !important; }
      .document-wrapper { padding: 0 !important; background: transparent !important; }
      .a4-page {
        width: 100% !important;
        min-height: auto !important;
        box-shadow: none !important;
        padding: 0 0 12mm 0 !important;
        margin: 0 !important;
        position: relative !important;
      }
      .doc-footer {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        background: #ffffff !important;
        padding-top: 4px !important;
        border-top: 1.5px solid #000000 !important;
      }
      @page {
        size: A4 ${orientation};
        margin: 5mm 6mm;
      }
    }
  </style>
</head>
<body>
  <!-- Sticky Top Action Bar -->
  <div class="sticky-toolbar">
    <div class="toolbar-title">
      <span>📄 ${title}</span>
      <span class="badge">A4 ${isLandscape ? 'Landscape' : 'Portrait'} • B&W Optimized</span>
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
              <span class="company-name">TripLedger</span>
              <div class="company-tagline">Transport & Fleet ERP</div>
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
        <span>Confidential • TripLedger — Transport & Fleet ERP</span>
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
  kpis?: { label: string; value: string; color?: string }[],
  orientation: 'portrait' | 'landscape' = 'landscape'
): string {
  let kpiHtml = '';
  if (kpis && kpis.length) {
    kpiHtml = `<div class="kpi-grid">
      ${kpis
        .map(
          (k) => `<div class="kpi-box">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-val">${k.value}</div>
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
          const rawVal = row[c.key] !== undefined && row[c.key] !== null ? row[c.key] : '-';
          const alignClass = `text-${c.align || 'left'}`;

          // Format special columns for clean B&W presentation
          if (c.key === 'status') {
            const isCancelled = String(rawVal).toUpperCase().includes('CANCEL');
            return `<td class="${alignClass} nowrap"><span class="status-badge ${isCancelled ? 'cancelled' : ''}">${rawVal}</span></td>`;
          }

          const isMonospace =
            c.align === 'right' ||
            c.key === 'date' ||
            c.key === 'transportNo' ||
            c.key === 'vehicleRegistration' ||
            c.key === 'marginStr' ||
            c.key === 'phone' ||
            c.key === 'registrationNumber';

          const monoClass = isMonospace ? 'font-mono' : '';
          const nowrapClass = c.key !== 'route' && c.key !== 'fromTo' ? 'nowrap' : '';
          const boldClass =
            c.key === 'transportNo' ||
            c.key === 'directTripProfit' ||
            c.key === 'totalDirectCosts' ||
            c.key === 'revenue' ||
            c.key === 'totalAmount' ||
            c.key === 'totalVehicleExpense'
              ? 'font-bold'
              : '';

          return `<td class="${alignClass} ${monoClass} ${nowrapClass} ${boldClass}">${rawVal}</td>`;
        })
        .join('')}
    </tr>`
    )
    .join('');

  if (!data.length) {
    tableRows = `<tr><td colspan="${columns.length}" class="text-center" style="padding: 20px; color: #64748b;">No matching records found for the selected timeframe.</td></tr>`;
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

  return buildBaseA4HtmlDocument(reportTitle, bodyHtml, orientation);
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
    { label: 'Basic Monthly Salary', value: `AED ${basicSalary.toLocaleString()}` },
    { label: `Completed Trips (${completedTripsCount})`, value: `AED ${totalTripCommission.toLocaleString()}` },
    { label: 'Allowances / Advance', value: `+${allowances} / -${advance}` },
    { label: 'Net Payable Salary', value: `AED ${netSalary.toLocaleString()}` },
  ];

  let kpiHtml = `<div class="kpi-grid">
    ${kpis
      .map(
        (k) => `<div class="kpi-box">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-val">${k.value}</div>
    </div>`
      )
      .join('')}
  </div>`;

  let tripRows = trips
    .map(
      (t) => `<tr>
    <td class="font-mono nowrap">${t.date}</td>
    <td class="font-mono font-bold nowrap">${t.transportNo}</td>
    <td>${t.fromTo}</td>
    <td class="text-right font-mono font-bold nowrap">+AED ${t.commission.toLocaleString()}</td>
  </tr>`
    )
    .join('');

  if (!trips.length) {
    tripRows = `<tr><td colspan="4" class="text-center" style="padding: 20px; color: #64748b;">No transport trip records logged for this period.</td></tr>`;
  }

  const bodyHtml = `
    <h1 class="report-title">Driver Monthly Ledger & Payslip Statement</h1>
    <p class="subtitle">Driver: <strong>${driverName}</strong> &nbsp;|&nbsp; Period: <strong>${period}</strong> &nbsp;|&nbsp; Payment Status: <span class="status-badge">${paymentStatus}</span></p>
    
    ${kpiHtml}

    <h2 style="font-size: 10.5px; font-weight: 800; color: #000000 !important; margin-top: 14px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">Detailed Trip Commission Ledger (${trips.length} Trips)</h2>
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Invoice #</th>
          <th>Route (From → To)</th>
          <th class="text-right">Trip Commission (AED)</th>
        </tr>
      </thead>
      <tbody>
        ${tripRows}
      </tbody>
    </table>
  `;

  return buildBaseA4HtmlDocument(`Driver Ledger - ${driverName} (${period})`, bodyHtml, 'portrait');
}

export function buildPnlPdfHtml(pnl: {
  periodLabel: string;
  totalTripsCount: number;
  tripRevenue: number;
  tonRevenue: number;
  totalGrossRevenue: number;
  driverCommissionsCost?: number;
  driverSalaries?: number;
  fuelCost: number;
  maintenanceCost: number;
  otherExpenses: number;
  totalOperatingCosts: number;
  netProfit: number;
  profitMarginPercentage: number;
}): string {
  const isProfitable = pnl.netProfit >= 0;
  const driverSalariesCost = pnl.driverSalaries !== undefined ? pnl.driverSalaries : (pnl.driverCommissionsCost || 0);

  const bodyHtml = `
    <h1 class="report-title">Profit & Loss Income Statement (P&L)</h1>
    <p class="subtitle">Timeframe Period: <strong>${pnl.periodLabel}</strong> &nbsp;|&nbsp; Total Completed Transport Trips: <strong>${pnl.totalTripsCount}</strong></p>

    <div class="kpi-grid">
      <div class="kpi-box">
        <div class="kpi-label">Gross Revenue</div>
        <div class="kpi-val">AED ${pnl.totalGrossRevenue.toLocaleString()}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Total Operating Costs</div>
        <div class="kpi-val">AED ${pnl.totalOperatingCosts.toLocaleString()}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Net ${isProfitable ? 'Profit' : 'Loss'}</div>
        <div class="kpi-val font-extrabold">AED ${pnl.netProfit.toLocaleString()}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-label">Profit Margin Ratio</div>
        <div class="kpi-val">${pnl.profitMarginPercentage}%</div>
      </div>
    </div>

    <h2 style="font-size: 10px; font-weight: 800; color: #000000 !important; margin-top: 14px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">1. Operational Income & Revenue Streams</h2>
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
        <tr style="background: #f1f5f9 !important; font-weight: bold; border-top: 1.5px solid #000000 !important;">
          <td style="font-weight: 900; color: #000000 !important">TOTAL GROSS REVENUE</td>
          <td class="text-right font-mono font-extrabold" style="font-size: 9.5px">AED ${pnl.totalGrossRevenue.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <h2 style="font-size: 10px; font-weight: 800; color: #000000 !important; margin-top: 14px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">2. Direct Fleet Operating Costs & Expenses</h2>
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
          <td class="text-right font-mono">AED ${pnl.fuelCost.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Vehicle Maintenance, Service & Repairs</td>
          <td class="text-right font-mono">AED ${pnl.maintenanceCost.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Auxiliary Vehicle Operational Expenses (Salik, Fines, Tolls)</td>
          <td class="text-right font-mono">AED ${pnl.otherExpenses.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Driver Salaries & Payroll Commissions</td>
          <td class="text-right font-mono">AED ${driverSalariesCost.toLocaleString()}</td>
        </tr>
        <tr style="background: #f1f5f9 !important; font-weight: bold; border-top: 1.5px solid #000000 !important;">
          <td style="font-weight: 900; color: #000000 !important">TOTAL OPERATING EXPENSES</td>
          <td class="text-right font-mono font-extrabold" style="font-size: 9.5px">AED ${pnl.totalOperatingCosts.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 14px; padding: 10px 14px; background: #ffffff !important; border: 2px solid #000000 !important; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 11px; font-weight: 900; color: #000000 !important; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Net Operating ${isProfitable ? 'Profit' : 'Loss'}</span>
        <span style="font-size: 8.5px; color: #475569 !important; font-weight: 600;">Net operational result after all expenses & driver payroll</span>
      </div>
      <span style="font-size: 16px; font-weight: 900; font-family: 'JetBrains Mono', ui-monospace, monospace; color: #000000 !important;">AED ${pnl.netProfit.toLocaleString()}</span>
    </div>
  `;

  return buildBaseA4HtmlDocument(`Profit & Loss Statement - ${pnl.periodLabel}`, bodyHtml, 'portrait');
}
