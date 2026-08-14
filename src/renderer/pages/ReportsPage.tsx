import React, { useEffect, useState } from 'react';
import { ReportFilter, Driver, Vehicle, TripProfitabilityItem } from '@shared/types';
import {
  Printer,
  Download,
  Filter,
  TrendingUp,
  DollarSign,
  Wrench,
  Users,
  FileText,
  PieChart,
} from 'lucide-react';
import {
  TransactionReportItem,
  DriverReportItem,
  VehicleExpenseReportItem,
  ProfitAndLossStatement,
} from 'src/main/services/reportService';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';

type ActiveReportTab = 'TRANSACTIONS' | 'TRIP_PROFITABILITY' | 'DRIVERS' | 'VEHICLE_EXPENSES' | 'PNL';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveReportTab>('TRIP_PROFITABILITY');
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
  const [tripProfitabilityData, setTripProfitabilityData] = useState<TripProfitabilityItem[]>([]);
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

      if (activeTab === 'TRIP_PROFITABILITY') {
        const res = await window.electronAPI.getTripProfitabilityReport(filter);
        setTripProfitabilityData(res || []);
      } else if (activeTab === 'TRANSACTIONS') {
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

    if (activeTab === 'TRIP_PROFITABILITY') {
      const columns = [
        { key: 'date', header: 'Date' },
        { key: 'transportNo', header: 'Transport #' },
        { key: 'vehicleRegistration', header: 'Vehicle' },
        { key: 'driverName', header: 'Driver' },
        { key: 'route', header: 'Route' },
        { key: 'revenue', header: 'Revenue (AED)', align: 'right' as const },
        { key: 'fuelCost', header: 'Fuel (AED)', align: 'right' as const },
        { key: 'tollCost', header: 'Toll (AED)', align: 'right' as const },
        { key: 'fineCost', header: 'Fine (AED)', align: 'right' as const },
        { key: 'maintenanceCost', header: 'Maint. (AED)', align: 'right' as const },
        { key: 'totalDirectCosts', header: 'Direct Costs', align: 'right' as const },
        { key: 'directTripProfit', header: 'Direct Profit', align: 'right' as const },
        { key: 'marginStr', header: 'Margin %', align: 'center' as const },
        { key: 'status', header: 'Status', align: 'center' as const },
      ];

      const activeTrips = tripProfitabilityData.filter((t) => t.status !== 'CANCELLED');
      const totalRev = activeTrips.reduce((acc, t) => acc + t.revenue, 0);
      const totalCosts = activeTrips.reduce((acc, t) => acc + t.totalDirectCosts, 0);
      const totalProfit = totalRev - totalCosts;
      const avgMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0.0';

      window.electronAPI.openReportPdfPreview({
        title: 'Per-Trip Direct Profitability & Cost Breakdown',
        description: filterDesc,
        columns,
        data: tripProfitabilityData.map((t) => ({
          ...t,
          marginStr: `${t.contributionMarginPercentage}%`,
          status: t.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
        })),
        kpis: [
          { label: 'Active Trips Revenue', value: `AED ${totalRev.toLocaleString()}` },
          { label: 'Total Direct Trip Costs', value: `AED ${totalCosts.toLocaleString()}` },
          { label: 'Total Direct Profit', value: `AED ${totalProfit.toLocaleString()}` },
          { label: 'Overall Contribution Margin', value: `${avgMargin}%` },
        ],
      });
    } else if (activeTab === 'TRANSACTIONS') {
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
        { key: 'phone', header: 'Contact' },
        { key: 'cnicOrLicense', header: 'License / CNIC' },
        { key: 'basicSalary', header: 'Base Pay (AED)', align: 'right' as const },
        { key: 'totalTrips', header: 'Completed Trips', align: 'center' as const },
        { key: 'latestTransactionDate', header: 'Last Trip Date', align: 'center' as const },
      ];
      const totalTrips = driversData.reduce((acc, d) => acc + d.totalTrips, 0);

      window.electronAPI.openReportPdfPreview({
        title: 'Driver Operations & Trip Performance',
        description: filterDesc,
        columns,
        data: driversData,
        kpis: [
          { label: 'Total Completed Trips', value: `${totalTrips}` },
          { label: 'Active Drivers Count', value: `${driversData.length}` },
        ],
      });
    } else if (activeTab === 'VEHICLE_EXPENSES') {
      const columns = [
        { key: 'registrationNumber', header: 'Vehicle Plate' },
        { key: 'vehicleType', header: 'Type' },
        { key: 'totalTrips', header: 'Trips', align: 'center' as const },
        { key: 'fuelCost', header: 'Fuel (AED)', align: 'right' as const },
        { key: 'maintenanceCost', header: 'Maintenance (AED)', align: 'right' as const },
        { key: 'otherExpenses', header: 'Other Exp (AED)', align: 'right' as const },
        { key: 'totalVehicleExpense', header: 'Total Overhead (AED)', align: 'right' as const },
      ];
      const totalExpense = vehicleExpensesData.reduce((acc, v) => acc + v.totalVehicleExpense, 0);

      window.electronAPI.openReportPdfPreview({
        title: 'Vehicle Expense Ledger Report',
        description: filterDesc,
        columns,
        data: vehicleExpensesData,
        kpis: [
          { label: 'Total Fleet Operating Costs', value: `AED ${totalExpense.toLocaleString()}` },
          { label: 'Active Fleet Count', value: `${vehicleExpensesData.length} Units` },
        ],
      });
    } else if (activeTab === 'PNL' && pnlData) {
      window.electronAPI.openPnlPdfPreview(pnlData);
    }
  };

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = 'report.csv';

    if (activeTab === 'TRIP_PROFITABILITY') {
      filename = `Trip_Profitability_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Transport #',
        'Date',
        'Vehicle Reg',
        'Driver Name',
        'Route',
        'Status',
        'Gross Revenue (AED)',
        'Fuel Cost (AED)',
        'Toll Cost (AED)',
        'Fine Cost (AED)',
        'Maintenance Cost (AED)',
        'Other Cost (AED)',
        'Total Direct Costs (AED)',
        'Direct Trip Profit (AED)',
        'Contribution Margin %',
      ];
      rows = tripProfitabilityData.map((t) => [
        t.transportNo,
        t.date,
        t.vehicleRegistration,
        t.driverName,
        t.route,
        t.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
        t.revenue.toString(),
        t.fuelCost.toString(),
        t.tollCost.toString(),
        t.fineCost.toString(),
        t.maintenanceCost.toString(),
        t.otherCost.toString(),
        t.totalDirectCosts.toString(),
        t.directTripProfit.toString(),
        `${t.contributionMarginPercentage}%`,
      ]);
    } else if (activeTab === 'TRANSACTIONS') {
      filename = `Transaction_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Transport #',
        'Date',
        'Type',
        'From Location',
        'To Location',
        'Vehicle Reg',
        'Driver Name',
        'Tons',
        'Rate / Ton',
        'Fixed Price',
        'Total Amount (AED)',
        'Status',
      ];
      rows = transactionsData.map((t) => [
        t.transportNo,
        t.date,
        t.transportType,
        t.fromLocationName || '',
        t.toLocationName || '',
        t.vehicleRegistration || '',
        t.driverName || '',
        (t.tons || '').toString(),
        (t.ratePerTon || '').toString(),
        (t.fixedPrice || '').toString(),
        t.totalAmount.toString(),
        t.status === 'CANCELLED' ? 'Cancelled' : 'Completed',
      ]);
    } else if (activeTab === 'DRIVERS') {
      filename = `Driver_Trips_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Driver Name',
        'Phone',
        'CNIC / License',
        'Basic Salary (AED)',
        'Completed Trips Count',
        'Last Trip Date',
      ];
      rows = driversData.map((d) => [
        d.driverName,
        d.phone || '',
        d.cnicOrLicense || '',
        d.basicSalary.toString(),
        d.totalTrips.toString(),
        d.latestTransactionDate || '-',
      ]);
    } else if (activeTab === 'VEHICLE_EXPENSES') {
      filename = `Vehicle_Expenses_Report_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = [
        'Vehicle Plate',
        'Vehicle Type',
        'Completed Trips',
        'Fuel Expense (AED)',
        'Maintenance (AED)',
        'Other Expenses (AED)',
        'Total Vehicle Cost (AED)',
      ];
      rows = vehicleExpensesData.map((v) => [
        v.registrationNumber,
        v.vehicleType,
        v.totalTrips.toString(),
        v.fuelCost.toString(),
        v.maintenanceCost.toString(),
        v.otherExpenses.toString(),
        v.totalVehicleExpense.toString(),
      ]);
    } else if (activeTab === 'PNL' && pnlData) {
      filename = `PnL_Statement_${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ['Category', 'Description', 'Amount (AED)'];
      rows = [
        ['Revenue', 'Trip Fixed Freight Revenue', pnlData.tripRevenue.toString()],
        ['Revenue', 'Tonnage Freight Revenue', pnlData.tonRevenue.toString()],
        ['Revenue', 'Total Gross Revenue', pnlData.totalGrossRevenue.toString()],
        ['Direct Expenses', 'Diesel / Fuel Expenses', pnlData.fuelCost.toString()],
        ['Direct Expenses', 'Vehicle Maintenance & Repairs', pnlData.maintenanceCost.toString()],
        ['Direct Expenses', 'Other Direct Vehicle Expenses', pnlData.otherExpenses.toString()],
        ['Direct Expenses', 'Total Fleet Operating Costs', pnlData.totalOperatingCosts.toString()],
        ['Net Performance', 'Net Operating Profit', pnlData.netProfit.toString()],
        ['Net Performance', 'Operating Profit Margin %', `${pnlData.profitMarginPercentage}%`],
      ];
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Column Definitions: Trip Profitability Report
  const tripProfitabilityColumns: Column<TripProfitabilityItem>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'font-mono text-slate-600 whitespace-nowrap',
    },
    {
      key: 'transportNo',
      header: 'Transport #',
      className: 'font-mono font-bold text-violet-700 whitespace-nowrap',
    },
    {
      key: 'vehicleRegistration',
      header: 'Vehicle Reg',
      className: 'font-mono font-bold text-amber-600',
    },
    {
      key: 'driverName',
      header: 'Driver Name',
      className: 'font-medium text-slate-800',
    },
    {
      key: 'route',
      header: 'Route',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'revenue',
      header: 'Gross Revenue',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600',
      render: (t) => `AED ${t.revenue.toLocaleString()}`,
    },
    {
      key: 'fuelCost',
      header: 'Fuel (AED)',
      align: 'right',
      className: 'font-mono text-sky-700',
      render: (t) => (t.fuelCost > 0 ? t.fuelCost.toLocaleString() : '-'),
    },
    {
      key: 'tollCost',
      header: 'Toll (AED)',
      align: 'right',
      className: 'font-mono text-amber-700',
      render: (t) => (t.tollCost > 0 ? t.tollCost.toLocaleString() : '-'),
    },
    {
      key: 'fineCost',
      header: 'Fine (AED)',
      align: 'right',
      className: 'font-mono text-rose-700',
      render: (t) => (t.fineCost > 0 ? t.fineCost.toLocaleString() : '-'),
    },
    {
      key: 'maintenanceCost',
      header: 'Maint. (AED)',
      align: 'right',
      className: 'font-mono text-orange-700',
      render: (t) => (t.maintenanceCost > 0 ? t.maintenanceCost.toLocaleString() : '-'),
    },
    {
      key: 'totalDirectCosts',
      header: 'Direct Costs',
      align: 'right',
      className: 'font-mono font-bold text-rose-600',
      render: (t) => `AED ${t.totalDirectCosts.toLocaleString()}`,
    },
    {
      key: 'directTripProfit',
      header: 'Direct Profit',
      align: 'right',
      className: 'font-mono font-extrabold',
      render: (t) => (
        <span className={t.directTripProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
          AED {t.directTripProfit.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'contributionMarginPercentage',
      header: 'Margin %',
      align: 'center',
      render: (t) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
            t.contributionMarginPercentage >= 50
              ? 'bg-emerald-100 text-emerald-800'
              : t.contributionMarginPercentage > 0
              ? 'bg-amber-100 text-amber-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {t.contributionMarginPercentage}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (t) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
            t.status === 'CANCELLED'
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
        >
          {t.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
        </span>
      ),
    },
  ];

  // 2. Column Definitions: Transactions
  const transactionColumns: Column<TransactionReportItem>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'font-mono text-slate-600',
    },
    {
      key: 'transportNo',
      header: 'Transport #',
      className: 'font-mono font-bold text-violet-700',
    },
    {
      key: 'transportType',
      header: 'Type',
      align: 'center',
      render: (t) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            t.transportType === 'TRIP'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          {t.transportType}
        </span>
      ),
    },
    {
      key: 'fromLocationName',
      header: 'From Location',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'toLocationName',
      header: 'To Location',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'vehicleRegistration',
      header: 'Vehicle Reg',
      className: 'font-mono font-bold text-amber-600',
    },
    {
      key: 'driverName',
      header: 'Driver Name',
      className: 'font-medium text-slate-800',
    },
    {
      key: 'totalAmount',
      header: 'Revenue (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600',
      render: (t) => t.totalAmount.toLocaleString(),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (t) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${
            t.status === 'CANCELLED'
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
        >
          {t.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
        </span>
      ),
    },
  ];

  // 3. Column Definitions: Drivers
  const driverColumns: Column<DriverReportItem>[] = [
    {
      key: 'driverName',
      header: 'Driver Name',
      className: 'font-bold text-slate-900',
    },
    {
      key: 'phone',
      header: 'Contact',
      className: 'font-mono text-slate-600',
      render: (d) => d.phone || '-',
    },
    {
      key: 'cnicOrLicense',
      header: 'License / CNIC',
      className: 'font-mono text-slate-600',
      render: (d) => d.cnicOrLicense || '-',
    },
    {
      key: 'basicSalary',
      header: 'Base Salary (AED)',
      align: 'right',
      className: 'font-mono text-slate-700',
      render: (d) => d.basicSalary.toLocaleString(),
    },
    {
      key: 'totalTrips',
      header: 'Completed Trips',
      align: 'center',
      className: 'font-mono font-bold text-violet-700',
      render: (d) => d.totalTrips.toLocaleString(),
    },
    {
      key: 'latestTransactionDate',
      header: 'Last Trip Date',
      align: 'center',
      className: 'font-mono text-slate-600',
      render: (d) => d.latestTransactionDate || '-',
    },
  ];

  // 4. Column Definitions: Vehicle Expenses
  const vehicleExpenseColumns: Column<VehicleExpenseReportItem>[] = [
    {
      key: 'registrationNumber',
      header: 'Vehicle Reg',
      className: 'font-mono font-bold text-amber-600',
    },
    {
      key: 'vehicleType',
      header: 'Vehicle Type',
      className: 'font-medium text-slate-700',
    },
    {
      key: 'totalTrips',
      header: 'Trips Count',
      align: 'center',
      className: 'font-mono font-bold text-slate-800',
    },
    {
      key: 'fuelCost',
      header: 'Fuel Expense',
      align: 'right',
      className: 'font-mono text-sky-700',
      render: (v) => v.fuelCost.toLocaleString(),
    },
    {
      key: 'maintenanceCost',
      header: 'Maintenance',
      align: 'right',
      className: 'font-mono text-rose-600',
      render: (v) => v.maintenanceCost.toLocaleString(),
    },
    {
      key: 'otherExpenses',
      header: 'Other Exp.',
      align: 'right',
      className: 'font-mono text-amber-700',
      render: (v) => v.otherExpenses.toLocaleString(),
    },
    {
      key: 'totalVehicleExpense',
      header: 'Total Vehicle Cost (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-rose-700',
      render: (v) => v.totalVehicleExpense.toLocaleString(),
    },
  ];

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col space-y-4">
      {/* Navigation Tabs Bar */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-2xl border border-slate-300/40">
          <button
            onClick={() => setActiveTab('TRIP_PROFITABILITY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeTab === 'TRIP_PROFITABILITY'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Trip Profitability Report</span>
          </button>

          <button
            onClick={() => setActiveTab('TRANSACTIONS')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
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
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
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

        {(activeTab === 'TRANSACTIONS' || activeTab === 'TRIP_PROFITABILITY') && (
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

        {(activeTab === 'TRANSACTIONS' || activeTab === 'TRIP_PROFITABILITY' || activeTab === 'VEHICLE_EXPENSES') && (
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

        {(activeTab === 'TRANSACTIONS' || activeTab === 'TRIP_PROFITABILITY' || activeTab === 'DRIVERS') && (
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

      {/* Main Report Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'TRIP_PROFITABILITY' && (
          <DataTable
            columns={tripProfitabilityColumns}
            data={tripProfitabilityData}
            keyExtractor={(t) => t.transportId}
            title="Trip-Level Direct Profitability & Cost Breakdown"
            countBadge={tripProfitabilityData.length}
            rowClassName={(t) => (t.status === 'CANCELLED' ? 'opacity-60 bg-slate-50/80 line-through' : '')}
            emptyMessage="No trip records found for the selected timeframe and filter criteria."
          />
        )}

        {activeTab === 'TRANSACTIONS' && (
          <DataTable
            columns={transactionColumns}
            data={transactionsData}
            keyExtractor={(t) => t.id}
            title="Transaction Audit Records"
            countBadge={transactionsData.length}
            rowClassName={(t) => (t.status === 'CANCELLED' ? 'opacity-60 bg-slate-50/80 line-through' : '')}
            emptyMessage="No transaction audit records found for the selected timeframe."
          />
        )}

        {activeTab === 'DRIVERS' && (
          <DataTable
            columns={driverColumns}
            data={driversData}
            keyExtractor={(d) => d.driverId}
            title="Driver Trip Performance & Generated Revenue"
            countBadge={driversData.length}
            emptyMessage="No driver records found."
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
          <div className="space-y-6 pb-6">
            {/* P&L Header KPI Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Revenue
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black font-mono text-emerald-600 mt-2">
                  AED {pnlData.totalGrossRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {pnlData.totalTripsCount} Completed Transports
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Operating Costs
                  </span>
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black font-mono text-rose-600 mt-2">
                  AED {pnlData.totalOperatingCosts.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Fuel, Repairs & Direct Overheads</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Net Operating Profit
                  </span>
                  <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div
                  className={`text-xl font-black font-mono mt-2 ${
                    pnlData.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  AED {pnlData.netProfit.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Revenue - Operating Costs</div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Profit Margin
                  </span>
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                    <PieChart className="w-4 h-4" />
                  </div>
                </div>
                <div
                  className={`text-xl font-black font-mono mt-2 ${
                    pnlData.profitMarginPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {pnlData.profitMarginPercentage}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Margin on Gross Revenue</div>
              </div>
            </div>

            {/* Income & Expense Breakdown Statement */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Income Statement Breakdown — {pnlData.periodLabel}
                </h3>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* 1. Gross Revenue Section */}
                <div className="p-4 bg-emerald-50/30">
                  <div className="font-bold text-emerald-900 mb-2">1. REVENUE STREAMS</div>
                  <div className="space-y-1.5 pl-4">
                    <div className="flex justify-between text-slate-700">
                      <span>Fixed Price Trip Revenue</span>
                      <span className="font-mono font-semibold">AED {pnlData.tripRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Per-Ton Freight Revenue</span>
                      <span className="font-mono font-semibold">AED {pnlData.tonRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-emerald-200/60">
                      <span>TOTAL GROSS REVENUE</span>
                      <span className="font-mono">AED {pnlData.totalGrossRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Direct Operating Costs */}
                <div className="p-4 bg-rose-50/30">
                  <div className="font-bold text-rose-900 mb-2">2. FLEET OPERATING EXPENSES</div>
                  <div className="space-y-1.5 pl-4">
                    <div className="flex justify-between text-slate-700">
                      <span>Fuel & Diesel Records</span>
                      <span className="font-mono font-semibold">AED {pnlData.fuelCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Vehicle Maintenance & Workshop Repairs</span>
                      <span className="font-mono font-semibold">AED {pnlData.maintenanceCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Auxiliary Vehicle Expenses (Salik, Fines, Tolls)</span>
                      <span className="font-mono font-semibold">AED {pnlData.otherExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-rose-700 pt-1 border-t border-rose-200/60">
                      <span>TOTAL OPERATING COSTS</span>
                      <span className="font-mono">AED {pnlData.totalOperatingCosts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Net Result */}
                <div className="p-4 bg-violet-50/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-black text-slate-900 text-sm">NET OPERATING PROFIT / (LOSS)</div>
                      <div className="text-[11px] text-slate-500">Gross Revenue minus Total Operating Costs</div>
                    </div>
                    <div
                      className={`text-lg font-black font-mono ${
                        pnlData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      AED {pnlData.netProfit.toLocaleString()} ({pnlData.profitMarginPercentage}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
