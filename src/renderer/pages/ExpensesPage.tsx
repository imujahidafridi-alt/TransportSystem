import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VehicleExpense, Vehicle } from '@shared/types';
import {
  Plus,
  Truck,
  Edit3,
  Link as LinkIcon,
  CreditCard,
  Building,
  DollarSign,
  Receipt,
  Wrench,
  Sparkles,
  Shield,
  FileCheck,
  AlertTriangle,
  PenTool,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown, SelectOption } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { ExportButton } from '../components/common/ExportButton';
import { PrintButton } from '../components/common/PrintButton';
import { Modal } from '../components/common/Modal';

const PRESET_CATEGORIES: SelectOption[] = [
  {
    value: 'Oil Change',
    label: 'Oil Change',
    icon: <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
  },
  {
    value: 'Engine Repair',
    label: 'Engine Repair',
    icon: <Wrench className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
  },
  {
    value: 'Tyre Replacement',
    label: 'Tyre Replacement',
    icon: <Wrench className="w-3.5 h-3.5 text-indigo-600 shrink-0" />,
  },
  {
    value: 'Brake Repair',
    label: 'Brake Repair',
    icon: <Wrench className="w-3.5 h-3.5 text-orange-600 shrink-0" />,
  },
  {
    value: 'General Workshop',
    label: 'General Workshop Service',
    icon: <Wrench className="w-3.5 h-3.5 text-violet-600 shrink-0" />,
  },
  {
    value: 'Salik / Tolls',
    label: 'Salik / Toll Gate',
    icon: <Receipt className="w-3.5 h-3.5 text-sky-600 shrink-0" />,
  },
  {
    value: 'Vehicle Insurance',
    label: 'Vehicle Insurance',
    icon: <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
  },
  {
    value: 'Registration Renewal',
    label: 'Registration & Inspection',
    icon: <FileCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />,
  },
  {
    value: 'Traffic Fines',
    label: 'Traffic Fines / Violation',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
  },
  {
    value: 'CUSTOM_MANUAL',
    label: 'Other (Type Custom Category)',
    icon: <PenTool className="w-3.5 h-3.5 text-slate-600 shrink-0" />,
  },
];

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isAllTime, setIsAllTime] = useState(false);
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState<'ALL' | 'DIRECT_TRIP' | 'OVERHEAD' | 'PAYROLL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState('');
  const [categoryPreset, setCategoryPreset] = useState('Oil Change');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [vendor, setVendor] = useState('');

  // Quick Add Vehicle State
  const [isQuickVehicleOpen, setIsQuickVehicleOpen] = useState(false);
  const [quickVehicleReg, setQuickVehicleReg] = useState('');
  const [quickVehicleType, setQuickVehicleType] = useState('Trailer Truck');

  const monthInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { registerAction } = useKeyboardShortcuts();

  const handleQuickAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVehicleReg.trim() || !window.electronAPI) return;
    try {
      const newVeh = await window.electronAPI.createVehicle({
        registrationNumber: quickVehicleReg.trim(),
        vehicleType: quickVehicleType,
        status: 'ACTIVE',
      });
      await loadData();
      setVehicleId(newVeh.id);
      setQuickVehicleReg('');
      setIsQuickVehicleOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add vehicle');
    }
  };

  // Keyboard Shortcuts Registration (Ctrl+N & Ctrl+F)
  useEffect(() => {
    const unregNew = registerAction(
      'NEW_RECORD',
      () => {
        setIsModalOpen(true);
      },
      'expenses'
    );
    const unregSearch = registerAction(
      'SEARCH_FOCUS',
      () => {
        searchInputRef.current?.focus();
      },
      'expenses'
    );
    return () => {
      unregNew();
      unregSearch();
    };
  }, [registerAction]);

  const loadData = async () => {
    if (window.electronAPI) {
      const [eRes, vRes] = await Promise.all([
        window.electronAPI.getExpenses(selectedVehicleId || undefined),
        window.electronAPI.getVehicles(),
      ]);
      setExpenses(eRes);
      setVehicles(vRes);
      if (!vehicleId && vRes.length > 0) setVehicleId(vRes[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedVehicleId]);

  // Month Navigation
  const navigateMonth = (direction: number) => {
    setIsAllTime(false);
    const currentPeriod = selectedMonth || new Date().toISOString().slice(0, 7);
    const [year, month] = currentPeriod.split('-').map(Number);
    const dateObj = new Date(year, month - 1 + direction, 1);
    const nextPeriod = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextPeriod);
  };

  const formattedPeriodTitle = useMemo(() => {
    if (isAllTime || !selectedMonth) return 'All Months';
    const [year, month] = selectedMonth.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return selectedMonth;
    const dateObj = new Date(year, month - 1, 1);
    return dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [selectedMonth, isAllTime]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !amount) return;

    const finalExpenseType =
      categoryPreset === 'CUSTOM_MANUAL'
        ? customCategory.trim() || 'General Expense'
        : categoryPreset;

    await window.electronAPI.createExpense({
      vehicleId,
      date,
      expenseType: finalExpenseType,
      description,
      amount: Number(amount),
      vendor,
    });
    setIsModalOpen(false);
    setCustomCategory('');
    setAmount('');
    setDescription('');
    setVendor('');
    loadData();
  };

  // Month & Category Filtered Records
  const monthFilteredExpenses = useMemo(() => {
    if (isAllTime || !selectedMonth) return expenses;
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth, isAllTime]);

  const filteredExpenses = useMemo(() => {
    return monthFilteredExpenses.filter((e) => {
      // Cost Classification Filter
      if (costFilter === 'DIRECT_TRIP' && !e.transportId) return false;
      if (costFilter === 'OVERHEAD' && (e.transportId || e.expenseType === 'Driver Payroll')) return false;
      if (costFilter === 'PAYROLL' && e.expenseType !== 'Driver Payroll') return false;

      if (!search) return true;
      const q = search.toLowerCase();
      return (
        e.vehicleRegistration?.toLowerCase().includes(q) ||
        e.expenseType.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.vendor?.toLowerCase().includes(q) ||
        e.transportNo?.toLowerCase().includes(q)
      );
    });
  }, [monthFilteredExpenses, costFilter, search]);

  // Financial Metrics Summary Computation for the Selected Month/View
  const summary = useMemo(() => {
    const totalAmount = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    const directTripExpenses = monthFilteredExpenses.filter((e) => Boolean(e.transportId));
    const directTripSum = directTripExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    const overheadExpenses = monthFilteredExpenses.filter((e) => !e.transportId && e.expenseType !== 'Driver Payroll');
    const overheadSum = overheadExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    const payrollExpenses = monthFilteredExpenses.filter((e) => e.expenseType === 'Driver Payroll');
    const payrollSum = payrollExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    return {
      totalAmount,
      directTripCount: directTripExpenses.length,
      directTripSum,
      overheadCount: overheadExpenses.length,
      overheadSum,
      payrollCount: payrollExpenses.length,
      payrollSum,
    };
  }, [monthFilteredExpenses, filteredExpenses]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Vehicle Reg',
      'Invoice #',
      'Expense Type',
      'Description',
      'Vendor',
      'Classification',
      'Amount (AED)',
    ];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.vehicleRegistration || '',
      e.transportNo || '',
      e.expenseType,
      e.description || '',
      e.vendor || '',
      e.transportId ? 'Direct Trip Expense' : e.expenseType === 'Driver Payroll' ? 'Driver Payroll' : 'Fleet Overhead',
      e.amount,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileSuffix = isAllTime ? 'All_Time' : selectedMonth || new Date().toISOString().slice(0, 7);
    link.download = `Expenses_Ledger_${fileSuffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    if (!window.electronAPI) return;
    const columnsForPdf = [
      { key: 'date', header: 'Date' },
      { key: 'vehicleRegistration', header: 'Vehicle' },
      { key: 'transportNoDisplay', header: 'Invoice #' },
      { key: 'expenseType', header: 'Expense Type' },
      { key: 'description', header: 'Description' },
      { key: 'vendor', header: 'Vendor / Payee' },
      { key: 'classificationDisplay', header: 'Classification' },
      { key: 'amountFormatted', header: 'Amount (AED)', align: 'right' as const },
    ];

    window.electronAPI.openReportPdfPreview({
      title: `Operating Expenses & Maintenance Ledger (${formattedPeriodTitle})`,
      description: `Showing ${filteredExpenses.length} expense records for ${formattedPeriodTitle}`,
      columns: columnsForPdf,
      data: filteredExpenses.map((e) => ({
        ...e,
        transportNoDisplay: e.transportNo || '-',
        classificationDisplay: e.transportId
          ? 'Direct Trip'
          : e.expenseType === 'Driver Payroll'
          ? 'Payroll'
          : 'Overhead',
        amountFormatted: e.amount.toLocaleString(),
      })),
      kpis: [
        { label: 'Total Period Expenses', value: `AED ${summary.totalAmount.toLocaleString()}` },
        { label: 'Total Records Count', value: `${filteredExpenses.length} Records` },
      ],
      orientation: 'landscape',
    });
  };

  const columns: Column<VehicleExpense>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'font-mono text-slate-700 whitespace-nowrap',
    },
    {
      key: 'vehicleRegistration',
      header: 'Vehicle Reg',
      className: 'font-mono font-bold text-amber-600',
      render: (e) => (
        <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {e.vehicleRegistration || 'Fleet'}
        </span>
      ),
    },
    {
      key: 'expenseType',
      header: 'Expense Type',
      render: (e) => {
        const isPayroll = e.expenseType === 'Driver Payroll';
        const isMaintenance = [
          'Oil Change',
          'Engine Repair',
          'Tyre Replacement',
          'Brake Repair',
          'General Service',
          'General Workshop',
        ].some((t) => e.expenseType.toLowerCase().includes(t.toLowerCase()));

        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isPayroll
                ? 'bg-emerald-100 text-emerald-800'
                : isMaintenance
                ? 'bg-violet-100 text-violet-800'
                : 'bg-sky-100 text-sky-800'
            }`}
          >
            {isPayroll ? (
              <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            ) : isMaintenance ? (
              <Wrench className="w-3.5 h-3.5 text-violet-700 shrink-0" />
            ) : (
              <Receipt className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            )}
            <span>{e.expenseType}</span>
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Description & Link',
      className: 'text-slate-700',
      render: (e) => (
        <div className="space-y-0.5">
          <span className="block font-medium text-slate-900">{e.description || '-'}</span>
          {e.transportNo && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 shadow-2xs font-mono">
              <LinkIcon className="w-3 h-3 text-violet-600" />
              Invoice #{e.transportNo}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor / Payee',
      className: 'text-slate-700 font-medium',
      render: (e) => e.vendor || '—',
    },
    {
      key: 'classification',
      header: 'Classification',
      align: 'center',
      render: (e) => {
        if (e.expenseType === 'Driver Payroll') {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
              <CreditCard className="w-3 h-3 text-emerald-600" />
              <span>DRIVER PAYROLL</span>
            </span>
          );
        }
        if (e.transportId) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-50 text-violet-700 border border-violet-200 shadow-2xs whitespace-nowrap">
              <LinkIcon className="w-3 h-3 text-violet-600" />
              <span>TRIP EXPENSE</span>
            </span>
          );
        }
        if (e.vehicleId) {
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
              <Building className="w-3 h-3 text-amber-600" />
              <span>FLEET OVERHEAD</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            <Building className="w-3 h-3 text-slate-500" />
            <span>GENERAL EXPENSE</span>
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-rose-600',
      render: (e) => `AED ${e.amount.toLocaleString()}`,
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* 1. Executive Financial KPI Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Total Filtered Expenses */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-rose-600 text-xl block">
              AED {summary.totalAmount.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {filteredExpenses.length} filtered records ({formattedPeriodTitle})
            </span>
          </div>
        </div>

        {/* Direct Trip Costs */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              <span>Trip Expenses</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-slate-900 text-xl block">
              AED {summary.directTripSum.toLocaleString()}
            </span>
            <span className="text-[11px] text-violet-600 font-medium">
              {summary.directTripCount} trip-linked costs
            </span>
          </div>
        </div>

        {/* General Fleet Overhead */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Building className="w-3 h-3" />
              <span>Fleet Overhead</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-slate-900 text-xl block">
              AED {summary.overheadSum.toLocaleString()}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">
              {summary.overheadCount} workshop & renewal costs
            </span>
          </div>
        </div>

        {/* Driver Payroll */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              <span>Driver Payroll</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-emerald-700 text-xl block">
              AED {summary.payrollSum.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">
              {summary.payrollCount} salary distributions
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Toolbar (Search, Vehicle, Month Navigator & Uniform Action Buttons) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[320px]">
          {/* Search Box */}
          <SearchBox
            ref={searchInputRef}
            value={search}
            onChange={setSearch}
            placeholder="Search expenses by type, vehicle, description, vendor... (Ctrl+F)"
            className="w-full max-w-xs"
          />

          {/* Vehicle Dropdown */}
          <div className="w-48 shrink-0">
            <SelectDropdown
              variant="pill"
              size="sm"
              options={[
                {
                  value: '',
                  label: 'All Vehicles',
                  icon: <Truck className="w-3.5 h-3.5 text-violet-600 shrink-0" />,
                },
                ...vehicles.map((v) => ({
                  value: v.id,
                  label: v.registrationNumber,
                  badge: v.vehicleType,
                  icon: <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
                })),
              ]}
              value={selectedVehicleId}
              onChange={setSelectedVehicleId}
            />
          </div>

          {/* Month Filter Navigator Capsule */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shadow-2xs text-xs">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="w-7 h-7 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              onClick={() => monthInputRef.current?.showPicker?.()}
              className={`px-3 py-1 flex items-center gap-2 cursor-pointer rounded-full transition ${
                !isAllTime ? 'bg-white text-violet-700 shadow-2xs' : 'text-slate-700 hover:bg-white/60'
              }`}
              title="Click to choose a specific month"
            >
              <Calendar className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-xs font-black tracking-tight whitespace-nowrap">
                {formattedPeriodTitle}
              </span>

              {/* Native Month Input Attached */}
              <input
                ref={monthInputRef}
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedMonth(e.target.value);
                    setIsAllTime(false);
                  }
                }}
                className="sr-only"
              />
            </div>

            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="w-7 h-7 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsAllTime((prev) => !prev)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                isAllTime
                  ? 'bg-violet-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Uniform Height Actions (h-9 Pills) */}
        <div className="flex items-center gap-2">
          <ExportButton size="sm" onClick={handleExportCSV} />
          <PrintButton size="sm" onClick={handlePrintPDF} />
          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Record Expense (Ctrl+N)
          </Button>
        </div>
      </div>

      {/* 3. Cost Classification Filter Capsules */}
      <div className="flex items-center gap-1 p-1 bg-slate-100/90 rounded-full border border-slate-200/80 w-fit text-xs shadow-2xs">
        <button
          onClick={() => setCostFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition-all duration-150 ${
            costFilter === 'ALL'
              ? 'bg-white text-violet-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Expenses ({monthFilteredExpenses.length})
        </button>
        <button
          onClick={() => setCostFilter('DIRECT_TRIP')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'DIRECT_TRIP'
              ? 'bg-white text-violet-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5 text-violet-600" />
          <span>Direct Trip Expenses ({summary.directTripCount})</span>
        </button>
        <button
          onClick={() => setCostFilter('OVERHEAD')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'OVERHEAD'
              ? 'bg-white text-amber-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-amber-600" />
          <span>Fleet General Overhead ({summary.overheadCount})</span>
        </button>
        <button
          onClick={() => setCostFilter('PAYROLL')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'PAYROLL'
              ? 'bg-white text-emerald-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
          <span>Driver Payroll ({summary.payrollCount})</span>
        </button>
      </div>

      {/* 4. Expenses Table */}
      <DataTable
        columns={columns}
        data={filteredExpenses}
        keyExtractor={(e) => e.id}
        title={`Fleet Expenses Ledger — ${formattedPeriodTitle}`}
        countBadge={filteredExpenses.length}
        emptyMessage={`No vehicle expenses or maintenance records logged for ${formattedPeriodTitle}.`}
      />

      {/* 5. Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Vehicle Expense / Maintenance"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800">
                  Target Vehicle <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickVehicleOpen(true)}
                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Quick Add</span>
                </button>
              </div>
              <SelectDropdown
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: v.registrationNumber,
                  badge: v.vehicleType,
                }))}
                value={vehicleId}
                onChange={setVehicleId}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Expense Category Preset */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Expense Category <span className="text-rose-500">*</span>
            </label>
            <SelectDropdown
              options={PRESET_CATEGORIES}
              value={categoryPreset}
              onChange={setCategoryPreset}
            />
          </div>

          {/* Custom Category Input if CUSTOM_MANUAL is selected */}
          {categoryPreset === 'CUSTOM_MANUAL' && (
            <div className="p-3.5 bg-violet-50/70 border border-violet-200 rounded-2xl space-y-1.5 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-violet-950 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-violet-600" />
                <span>Type Custom Expense Category Manually:</span>
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Battery Replacement, Parking Fee, Custom Tooling..."
                className="h-11 w-full bg-white border border-violet-300 focus:border-violet-600 rounded-2xl px-4 text-xs text-slate-900 focus:outline-none transition font-medium shadow-2xs"
                required
                autoFocus
              />
            </div>
          )}

          {/* Amount & Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Amount (AED) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Quick Amounts:</span>
            </div>

            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl pl-4 pr-16 text-sm font-bold text-rose-600 font-mono focus:outline-none transition-all duration-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
              <span className="absolute right-4 top-3 text-xs font-bold text-slate-400 font-mono">
                AED
              </span>
            </div>

            {/* Quick Amount Pills */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[50, 100, 200, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all duration-150 border ${
                    amount === preset
                      ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  AED {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Vendor / Garage / Workshop
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Dubai Auto Care, RTA Workshop"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Description / Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes or repair details"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-4 h-4" />}
            >
              Save Expense Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Vehicle Sub-Modal */}
      <Modal
        isOpen={isQuickVehicleOpen}
        onClose={() => setIsQuickVehicleOpen(false)}
        title="Quick Add Vehicle"
        maxWidth="md"
      >
        <form onSubmit={handleQuickAddVehicle} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Registration Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={quickVehicleReg}
              onChange={(e) => setQuickVehicleReg(e.target.value)}
              placeholder="e.g. DXB-19283"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition shadow-2xs"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">Vehicle Type</label>
            <SelectDropdown
              options={[
                { value: 'Trailer Truck', label: 'Trailer Truck' },
                { value: 'Tipper Truck', label: 'Tipper Truck' },
                { value: 'Flatbed Truck', label: 'Flatbed Truck' },
                { value: 'Tanker', label: 'Tanker' },
                { value: 'Pickup', label: 'Pickup' },
              ]}
              value={quickVehicleType}
              onChange={setQuickVehicleType}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsQuickVehicleOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save & Auto-Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
