import React, { useEffect, useState } from 'react';
import { ReportFilter, Driver, Vehicle } from '@shared/types';
import { Printer, Download, Filter, TrendingUp, DollarSign, Wrench, Users, FileText, PieChart } from 'lucide-react';
import {
  TransactionReportItem,
  DriverReportItem,
  VehicleExpenseReportItem,
  ProfitAndLossStatement,
} from 'src/main/services/reportService';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';

type ActiveReportTab = 'TRANSACTIONS' | 'DRIVERS' | 'VEHICLE_EXPENSES' | 'PNL';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveReportTab>('TRANSACTIONS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [transportType, setTransportType] = useState<'' | 'TRIP' | 'TON'>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'COMPLETED' | 'CANCELLED'>('');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // Report States
  const [transactionsData, setTransactionsData] = useState<TransactionReportItem[]>([]);
  const [driversData, setDriversData] = useState<DriverReportItem[]>([]);
  const [vehicleExpensesData, setVehicleExpensesData] = useState<VehicleExpenseReportItem[]>([]);
  const [pnlData, setPnlData] = useState<ProfitAndLossStatement | null>(null);

  const loadReportData = async () => {
    if (window.electronAPI) {
      const [vList, dList] = await Promise.all([
        window.electronAPI.getVehicles(),
        window.electronAPI.getDrivers(),
      ]);
      setVehicles(vList);
      setDrivers(dList);

      const filter: ReportFilter = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
        transportType: transportType || undefined,
        status: statusFilter || undefined,
      };

      if (activeTab === 'TRANSACTIONS') {
        const res = await window.electronAPI.getTransactionReports(filter);
        setTransactionsData(res || []);
      } else if (activeTab === 'DRIVERS') {
        const res = await window.electronAPI.getDriverReports(filter);
        setDriversData(res || []);
      } else if (activeTab === 'VEHICLE_EXPENSES') {
        const res = await window.electronAPI.getVehicleExpenseReports(filter);
        setVehicleExpensesData(res || []);
      } else if (activeTab === 'PNL') {
        const res = await window.electronAPI.getProfitAndLossStatement(filter);
        setPnlData(res || null);
      }
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab, startDate, endDate, vehicleId, driverId, transportType, statusFilter]);

  const handleOpenPdfPreview = () => {
    if (!window.electronAPI) return;

    const filterDesc = `Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`;

    if (activeTab === 'TRANSACTIONS') {
      const columns = [
        { key: 'date', header: 'Date' },
        { key: 'transportNo', header: 'Transport #' },
        { key: 'fromLocationName', header: 'From' },
        { key: 'toLocationName', header: 'To' },
        { key: 'vehicleRegistration', header: 'Vehicle' },
        { key: 'driverName', header: 'Driver' },
        { key: 'totalAmount', header: 'Revenue (AED)', align: 'right' as const },
        { key: 'status', header: 'Status', align: 'center' as const },
      ];
      const totalRev = transactionsData.reduce((acc, t) => acc + (t.status !== 'CANCELLED' ? t.totalAmount : 0), 0);

      window.electronAPI.openReportPdfPreview({
        title: 'Transaction Audit Report',
        description: filterDesc,
        columns,
        data: transactionsData.map((t) => ({
          ...t,
          status: t.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
        })),
        kpis: [
          { label: 'Total Transactions Revenue', value: `AED ${totalRev.toLocaleString()}` },
          { label: 'Total Transactions Count', value: `${transactionsData.length}` },
        ],
      });
    } else if (activeTab === 'DRIVERS') {
      const columns = [
        { key: 'driverName', header: 'Driver Name' },
        { key: 'phone', header: 'Phone' },
        { key: 'totalTrips', header: 'Completed Trips', align: 'right' as const },
        { key: 'basicSalary', header: 'Basic Salary (AED)', align: 'right' as const },
        { key: 'latestTransactionDate', header: 'Last Trip Date', align: 'right' as const },
      ];

      window.electronAPI.openReportPdfPreview({
        title: 'Driver Transaction & Activity Report',
        description: `${filterDesc} (For Manual Month-End Commission Calculation)`,
        columns,
        data: driversData,
        kpis: [
          { label: 'Total Active Drivers Listed', value: `${driversData.length}` },
        ],
      });
    } else if (activeTab === 'VEHICLE_EXPENSES') {
      const columns = [
        { key: 'registrationNumber', header: 'Vehicle Reg' },
        { key: 'vehicleType', header: 'Type' },
        { key: 'totalTrips', header: 'Completed Trips', align: 'right' as const },
        { key: 'fuelCost', header: 'Fuel Expense', align: 'right' as const },
        { key: 'maintenanceCost', header: 'Maintenance', align: 'right' as const },
        { key: 'otherExpenses', header: 'Other Exp.', align: 'right' as const },
        { key: 'totalVehicleExpense', header: 'Total Expense (AED)', align: 'right' as const },
      ];
      const totalExp = vehicleExpensesData.reduce((acc, v) => acc + v.totalVehicleExpense, 0);

      window.electronAPI.openReportPdfPreview({
        title: 'Vehicle Expense Report (Linked with Transactions)',
        description: filterDesc,
        columns,
        data: vehicleExpensesData,
        kpis: [
          { label: 'Total Vehicles Analyzed', value: `${vehicleExpensesData.length}` },
          { label: 'Total Fleet Operating Cost', value: `AED ${totalExp.toLocaleString()}`, color: '#e11d48' },
        ],
      });
    } else if (activeTab === 'PNL' && pnlData) {
      window.electronAPI.openPnlPdfPreview(pnlData);
    }
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'TRANSACTIONS') {
      csvContent += 'Date,TransportNo,Type,From,To,Vehicle,Driver,TotalRevenue,Status\n';
      transactionsData.forEach((t) => {
        csvContent += `${t.date},${t.transportNo},${t.transportType},"${t.fromLocationName}","${t.toLocationName}",${t.vehicleRegistration},"${t.driverName}",${t.totalAmount},${t.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}\n`;
      });
    } else if (activeTab === 'DRIVERS') {
      csvContent += 'DriverName,Phone,CNIC_License,CompletedTrips,BasicSalary,LastTripDate\n';
      driversData.forEach((d) => {
        csvContent += `"${d.driverName}",${d.phone},${d.cnicOrLicense},${d.totalTrips},${d.basicSalary},${d.latestTransactionDate}\n`;
      });
    } else if (activeTab === 'VEHICLE_EXPENSES') {
      csvContent += 'VehicleRegistration,VehicleType,TotalTrips,FuelCost,MaintenanceCost,OtherExpenses,TotalVehicleExpense\n';
      vehicleExpensesData.forEach((v) => {
        csvContent += `${v.registrationNumber},${v.vehicleType},${v.totalTrips},${v.fuelCost},${v.maintenanceCost},${v.otherExpenses},${v.totalVehicleExpense}\n`;
      });
    } else if (activeTab === 'PNL' && pnlData) {
      csvContent += 'Category,Amount_AED\n';
      csvContent += `Trip Revenue,${pnlData.tripRevenue}\n`;
      csvContent += `Ton Revenue,${pnlData.tonRevenue}\n`;
      csvContent += `Total Gross Revenue,${pnlData.totalGrossRevenue}\n`;
      csvContent += `Fuel Cost,${pnlData.fuelCost}\n`;
      csvContent += `Maintenance Cost,${pnlData.maintenanceCost}\n`;
      csvContent += `Other Expenses,${pnlData.otherExpenses}\n`;
      csvContent += `Total Operating Costs,${pnlData.totalOperatingCosts}\n`;
      csvContent += `Net Profit,${pnlData.netProfit}\n`;
      csvContent += `Profit Margin %,${pnlData.profitMarginPercentage}%\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTab.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Columns for 1. Transaction Reports
  const transactionColumns: Column<TransactionReportItem>[] = [
    { key: 'date', header: 'Date', className: 'font-mono text-slate-700' },
    { key: 'transportNo', header: 'Transport #', className: 'font-mono font-bold text-violet-700' },
    { key: 'transportType', header: 'Type' },
    { key: 'fromLocationName', header: 'From', className: 'font-semibold text-slate-800' },
    { key: 'toLocationName', header: 'To', className: 'font-semibold text-slate-800' },
    { key: 'vehicleRegistration', header: 'Vehicle', className: 'font-mono font-bold text-amber-600' },
    { key: 'driverName', header: 'Driver', className: 'font-sans text-slate-700' },
    {
      key: 'totalAmount',
      header: 'Trip Revenue (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600',
      render: (t) => t.totalAmount.toLocaleString(),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (t) => {
        const isCancelled = t.status === 'CANCELLED';
        return (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              isCancelled
                ? 'bg-rose-100 text-rose-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isCancelled ? 'Cancelled' : 'Completed'}
          </span>
        );
      },
    },
  ];

  // Columns for 2. Driver Reports Linked With Each Transaction (For Manual Month-End Calculation)
  const driverColumns: Column<DriverReportItem>[] = [
    { key: 'driverName', header: 'Driver Name', className: 'font-bold text-slate-900' },
    { key: 'phone', header: 'Phone', className: 'font-mono text-slate-600' },
    { key: 'cnicOrLicense', header: 'License / CNIC', className: 'font-mono text-slate-600' },
    { key: 'totalTrips', header: 'Completed Trips Count', align: 'right', className: 'font-mono font-extrabold text-violet-700 text-sm' },
    {
      key: 'basicSalary',
      header: 'Basic Salary (AED)',
      align: 'right',
      className: 'font-mono font-semibold text-slate-800',
      render: (d) => d.basicSalary.toLocaleString(),
    },
    {
      key: 'latestTransactionDate',
      header: 'Last Transport Date',
      align: 'right',
      className: 'font-mono text-slate-600',
    },
  ];

  // Columns for 3. Expense Report Linked With Vehicle
  const vehicleExpenseColumns: Column<VehicleExpenseReportItem>[] = [
    { key: 'registrationNumber', header: 'Vehicle Reg', className: 'font-mono font-bold text-amber-600' },
    { key: 'vehicleType', header: 'Vehicle Type', className: 'font-semibold text-slate-700' },
    { key: 'totalTrips', header: 'Trips Count', align: 'right', className: 'font-mono font-bold text-slate-900' },
    {
      key: 'fuelCost',
      header: 'Fuel Expense',
      align: 'right',
      className: 'font-mono text-indigo-600 font-semibold',
      render: (v) => v.fuelCost.toLocaleString(),
    },
    {
      key: 'maintenanceCost',
      header: 'Maintenance',
      align: 'right',
      className: 'font-mono text-rose-600 font-semibold',
      render: (v) => v.maintenanceCost.toLocaleString(),
    },
    {
      key: 'otherExpenses',
      header: 'Other Exp.',
      align: 'right',
      className: 'font-mono text-amber-600 font-semibold',
      render: (v) => v.otherExpenses.toLocaleString(),
    },
    {
      key: 'totalVehicleExpense',
      header: 'Total Vehicle Cost (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-rose-700 text-sm',
      render: (v) => v.totalVehicleExpense.toLocaleString(),
    },
  ];

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* Tab Switcher & Export Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300/50">
          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Transaction Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('DRIVERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'DRIVERS'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Driver Reports (Linked Trips)</span>
          </button>

          <button
            onClick={() => setActiveTab('VEHICLE_EXPENSES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'VEHICLE_EXPENSES'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Vehicle Expense Report</span>
          </button>

          <button
            onClick={() => setActiveTab('PNL')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'PNL'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Profit & Loss Statement (P&L)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
          >
            Export CSV
          </Button>
          <Button
            onClick={handleOpenPdfPreview}
            icon={<Printer className="w-4 h-4 text-white" />}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/20 font-bold"
          >
            Print A4 PDF Preview
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs print:hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <Filter className="w-4 h-4 text-violet-600" />
          <span>Report Filter Timeframe:</span>
        </div>

        <div>
          <span className="text-slate-500 mr-1.5 font-medium">Start Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#F0F2F9] border border-transparent rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-violet-600 transition"
          />
        </div>

        <div>
          <span className="text-slate-500 mr-1.5 font-medium">End Date:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#F0F2F9] border border-transparent rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-violet-600 transition"
          />
        </div>

        {activeTab === 'TRANSACTIONS' && (
          <>
            <div className="flex items-center gap-1.5 w-44">
              <span className="text-slate-500 font-medium shrink-0">Type:</span>
              <SelectDropdown
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'TRIP', label: 'TRIP (Fixed)' },
                  { value: 'TON', label: 'TON (Rate)' },
                ]}
                value={transportType}
                onChange={(val) => setTransportType(val as any)}
                size="sm"
              />
            </div>

            <div className="flex items-center gap-1.5 w-44">
              <span className="text-slate-500 font-medium shrink-0">Status:</span>
              <SelectDropdown
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                ]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                size="sm"
              />
            </div>
          </>
        )}

        {(activeTab === 'TRANSACTIONS' || activeTab === 'VEHICLE_EXPENSES') && (
          <div className="flex items-center gap-1.5 w-48">
            <span className="text-slate-500 font-medium shrink-0">Vehicle:</span>
            <SelectDropdown
              options={[
                { value: '', label: 'All Vehicles' },
                ...vehicles.map((v) => ({
                  value: v.id,
                  label: v.registrationNumber,
                })),
              ]}
              value={vehicleId}
              onChange={setVehicleId}
              size="sm"
            />
          </div>
        )}

        {(activeTab === 'TRANSACTIONS' || activeTab === 'DRIVERS') && (
          <div className="flex items-center gap-1.5 w-48">
            <span className="text-slate-500 font-medium shrink-0">Driver:</span>
            <SelectDropdown
              options={[
                { value: '', label: 'All Drivers' },
                ...drivers.map((d) => ({
                  value: d.id,
                  label: d.name,
                })),
              ]}
              value={driverId}
              onChange={setDriverId}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Tab Content Display */}
      {activeTab === 'TRANSACTIONS' && (
        <DataTable
          columns={transactionColumns}
          data={transactionsData}
          keyExtractor={(t) => t.id}
          title="All Transport Transactions"
          countBadge={transactionsData.length}
          emptyMessage="No transaction records match the specified filters."
        />
      )}

      {activeTab === 'DRIVERS' && (
        <DataTable
          columns={driverColumns}
          data={driversData}
          keyExtractor={(d) => d.driverId}
          title="Driver Linked Transactions Audit (Operator Month-End Payout Reference)"
          countBadge={driversData.length}
          emptyMessage="No driver transaction records found."
        />
      )}

      {activeTab === 'VEHICLE_EXPENSES' && (
        <DataTable
          columns={vehicleExpenseColumns}
          data={vehicleExpensesData}
          keyExtractor={(v) => v.vehicleId}
          title="Vehicle Expense Report (Linked with Transport Transactions)"
          countBadge={vehicleExpensesData.length}
          emptyMessage="No vehicle expense records found."
        />
      )}

      {activeTab === 'PNL' && pnlData && (
        <div className="space-y-6">
          {/* P&L Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Gross Revenue</span>
                <div className="text-base font-extrabold text-emerald-700 font-mono">
                  AED {pnlData.totalGrossRevenue.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Operating Costs</span>
                <div className="text-base font-extrabold text-rose-700 font-mono">
                  AED {pnlData.totalOperatingCosts.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Net Operating Profit</span>
                <div className={`text-base font-extrabold font-mono ${pnlData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  AED {pnlData.netProfit.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Profit Margin Ratio</span>
                <div className={`text-base font-extrabold font-mono ${pnlData.profitMarginPercentage >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {pnlData.profitMarginPercentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Income Statement Detailed Breakdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenues Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>1. Transport Revenue Streams</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Fixed Price Transport Revenue</span>
                  <span className="font-mono font-bold text-slate-900">AED {pnlData.tripRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Ton Rate Transport Revenue</span>
                  <span className="font-mono font-bold text-slate-900">AED {pnlData.tonRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-emerald-50/50 px-3 rounded-xl">
                  <span className="font-bold text-slate-900">Total Gross Operating Revenue</span>
                  <span className="font-mono font-extrabold text-emerald-700 text-sm">AED {pnlData.totalGrossRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses Box */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold border-b border-slate-100 pb-3">
                <Wrench className="w-5 h-5 text-rose-600" />
                <span>2. Operating Costs & Expenses</span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Fleet Diesel Fuel Costs</span>
                  <span className="font-mono font-semibold text-indigo-600">AED {pnlData.fuelCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Vehicle Maintenance & Repairs</span>
                  <span className="font-mono font-semibold text-rose-600">AED {pnlData.maintenanceCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Other Operating Expenses</span>
                  <span className="font-mono font-semibold text-amber-600">AED {pnlData.otherExpenses.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 bg-rose-50/50 px-3 rounded-xl">
                  <span className="font-bold text-slate-900">Total Operating Expenses</span>
                  <span className="font-mono font-extrabold text-rose-700 text-sm">AED {pnlData.totalOperatingCosts.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
