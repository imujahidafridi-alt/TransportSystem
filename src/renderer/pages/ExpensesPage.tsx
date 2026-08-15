import React, { useEffect, useRef, useState } from 'react';
import { VehicleExpense, Vehicle } from '@shared/types';
import { Plus, Truck, Edit3, Link as LinkIcon, CreditCard, Building } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { ExportButton } from '../components/common/ExportButton';
import { PrintButton } from '../components/common/PrintButton';
import { Modal } from '../components/common/Modal';

const PRESET_CATEGORIES = [
  { value: 'Oil Change', label: '🔧 Oil Change' },
  { value: 'Engine Repair', label: '🔧 Engine Repair' },
  { value: 'Tyre Replacement', label: '🔧 Tyre Replacement' },
  { value: 'Brake Repair', label: '🔧 Brake Repair' },
  { value: 'General Workshop', label: '🔧 General Workshop Service' },
  { value: 'Salik / Tolls', label: '🧾 Salik / Toll Gate' },
  { value: 'Vehicle Insurance', label: '🧾 Vehicle Insurance' },
  { value: 'Registration Renewal', label: '🧾 Registration & Inspection' },
  { value: 'Traffic Fines', label: '🧾 Traffic Fines / Violation' },
  { value: 'CUSTOM_MANUAL', label: '✍️ Other (Type Custom Expense Category)' },
];

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
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

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { registerAction } = useKeyboardShortcuts();

  // Keyboard Shortcuts Registration (Ctrl+N & Ctrl+F)
  useEffect(() => {
    const unregNew = registerAction('NEW_RECORD', () => {
      setIsModalOpen(true);
    }, 'expenses');
    const unregSearch = registerAction('SEARCH_FOCUS', () => {
      searchInputRef.current?.focus();
    }, 'expenses');
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !amount) return;

    // Resolve expense type: preset or manual custom entry
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
    loadData();
  };

  const filteredExpenses = expenses.filter((e) => {
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

  const directTripCount = expenses.filter((e) => Boolean(e.transportId)).length;
  const overheadCount = expenses.filter((e) => !e.transportId && e.expenseType !== 'Driver Payroll').length;
  const payrollCount = expenses.filter((e) => e.expenseType === 'Driver Payroll').length;

  const handleExportCSV = () => {
    const headers = ['Date', 'Vehicle Reg', 'Invoice #', 'Expense Type', 'Description', 'Vendor', 'Classification', 'Amount (AED)'];
    const rows = filteredExpenses.map((e) => [
      e.date,
      e.vehicleRegistration || '',
      e.transportNo || '',
      e.expenseType,
      e.description || '',
      e.vendor || '',
      e.transportId ? 'Direct Trip Cost' : e.expenseType === 'Driver Payroll' ? 'Driver Payroll' : 'Fleet Overhead',
      e.amount,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Expenses_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
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
    const totalAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

    window.electronAPI.openReportPdfPreview({
      title: 'Operating Expenses & Maintenance Ledger',
      description: `Showing ${filteredExpenses.length} expense records`,
      columns: columnsForPdf,
      data: filteredExpenses.map((e) => ({
        ...e,
        transportNoDisplay: e.transportNo || '-',
        classificationDisplay: e.transportId ? 'Direct Trip' : e.expenseType === 'Driver Payroll' ? 'Payroll' : 'Overhead',
        amountFormatted: e.amount.toLocaleString(),
      })),
      kpis: [
        { label: 'Total Expense Sum', value: `AED ${totalAmount.toLocaleString()}` },
        { label: 'Total Records Count', value: `${filteredExpenses.length} Records` },
      ],
      orientation: 'landscape',
    });
  };

  const columns: Column<VehicleExpense>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'font-mono text-slate-700',
    },
    {
      key: 'vehicleRegistration',
      header: 'Vehicle Reg',
      className: 'font-mono font-bold text-amber-600',
    },
    {
      key: 'expenseType',
      header: 'Expense / Maintenance Type',
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
            {isPayroll ? '💳' : isMaintenance ? '🔧' : '🧾'} {e.expenseType}
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      className: 'text-slate-700',
      render: (e) => (
        <div className="space-y-0.5">
          <span className="block">{e.description || '-'}</span>
          {e.transportNo && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
              <LinkIcon className="w-3 h-3" />
              Invoice # {e.transportNo}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'vendor',
      header: 'Vendor / Payee',
      className: 'text-slate-700 font-medium',
      render: (e) => e.vendor || '-',
    },
    {
      key: 'classification',
      header: 'Classification',
      align: 'center',
      render: (e) => {
        if (e.expenseType === 'Driver Payroll') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
              PAYROLL
            </span>
          );
        }
        if (e.transportId) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-100 text-violet-800 border border-violet-300 shadow-2xs whitespace-nowrap">
              🔗 DIRECT TRIP (COGS)
            </span>
          );
        }
        if (e.vehicleId) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs whitespace-nowrap">
              FLEET OVERHEAD
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            GENERAL EXPENSE
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-rose-600',
      render: (e) => e.amount.toLocaleString(),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Top Bar with Search, Filter & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[320px]">
          <SearchBox
            ref={searchInputRef}
            value={search}
            onChange={setSearch}
            placeholder="Search expenses by type, vehicle reg, description, vendor or invoice #... (Ctrl+F)"
            className="max-w-md"
          />
          <div className="w-60 shrink-0">
            <SelectDropdown
              variant="pill"
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
        </div>

        <div className="flex items-center gap-2">
          <ExportButton onClick={handleExportCSV} />
          <PrintButton onClick={handlePrintPDF} />
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Record Expense (Ctrl+N)
          </Button>
        </div>
      </div>

      {/* Enterprise Cost Classification Filter Capsules */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-full border border-slate-200/80 w-fit text-xs">
        <button
          onClick={() => setCostFilter('ALL')}
          className={`px-3.5 py-1 rounded-full font-bold transition-all duration-150 ${
            costFilter === 'ALL'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setCostFilter('DIRECT_TRIP')}
          className={`px-3.5 py-1 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'DIRECT_TRIP'
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/25'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Direct Trip Costs (COGS) ({directTripCount})</span>
        </button>
        <button
          onClick={() => setCostFilter('OVERHEAD')}
          className={`px-3.5 py-1 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'OVERHEAD'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/25'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Fleet General Overhead ({overheadCount})</span>
        </button>
        <button
          onClick={() => setCostFilter('PAYROLL')}
          className={`px-3.5 py-1 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'PAYROLL'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/25'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Driver Payroll ({payrollCount})</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredExpenses}
        keyExtractor={(e) => e.id}
        emptyMessage="No vehicle expenses or maintenance records logged yet."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Vehicle Expense / Maintenance"
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Vehicle</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>
          </div>

          {/* DEDICATED SINGLE ROW: Expense Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expense Category</label>
            <SelectDropdown
              options={PRESET_CATEGORIES}
              value={categoryPreset}
              onChange={setCategoryPreset}
            />
          </div>

          {/* Manual Custom Entry Input if CUSTOM_MANUAL is selected */}
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
                className="h-11 w-full bg-white border border-violet-300 focus:border-violet-600 rounded-2xl px-4 text-xs text-slate-900 focus:outline-none transition font-medium shadow-sm"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Amount (AED)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-rose-600 font-mono focus:outline-none transition-all duration-200 shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vendor / Garage / Workshop</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Dubai Garage, RTA Garage"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description / Notes</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional notes or repair details"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
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
        <form onSubmit={handleQuickAddVehicle} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registration Number</label>
            <input
              type="text"
              value={quickVehicleReg}
              onChange={(e) => setQuickVehicleReg(e.target.value)}
              placeholder="e.g. DXB-19283"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vehicle Type</label>
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
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsQuickVehicleOpen(false)}>
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
