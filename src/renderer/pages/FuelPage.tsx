import React, { useEffect, useRef, useState } from 'react';
import { FuelRecord, Vehicle } from '@shared/types';
import { Plus, Link as LinkIcon, Truck } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { ExportButton } from '../components/common/ExportButton';
import { PrintButton } from '../components/common/PrintButton';
import { Modal } from '../components/common/Modal';

export const FuelPage: React.FC = () => {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [costFilter, setCostFilter] = useState<'ALL' | 'DIRECT_TRIP' | 'OVERHEAD'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState('');
  const [fuelType, setFuelType] = useState('DIESEL');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [rate, setRate] = useState<number | ''>('');
  const [vendor, setVendor] = useState('');
  const [odometer, setOdometer] = useState<number | ''>('');

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
    }, 'fuel');
    const unregSearch = registerAction('SEARCH_FOCUS', () => {
      searchInputRef.current?.focus();
    }, 'fuel');
    return () => {
      unregNew();
      unregSearch();
    };
  }, [registerAction]);

  const loadData = async () => {
    if (window.electronAPI) {
      const [fRes, vRes] = await Promise.all([
        window.electronAPI.getFuelRecords(),
        window.electronAPI.getVehicles(),
      ]);
      setFuelRecords(fRes);
      setVehicles(vRes);
      if (!vehicleId && vRes.length > 0) setVehicleId(vRes[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalCost = Number(quantity || 0) * Number(rate || 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !quantity || !rate) return;

    await window.electronAPI.createFuelRecord({
      vehicleId,
      date,
      fuelType,
      quantity: Number(quantity),
      unit: 'LITERS',
      rate: Number(rate),
      vendor,
      odometer: odometer ? Number(odometer) : undefined,
    });
    setIsModalOpen(false);
    loadData();
  };

  const filteredRecords = fuelRecords.filter((f) => {
    if (costFilter === 'DIRECT_TRIP' && !f.transportId) return false;
    if (costFilter === 'OVERHEAD' && f.transportId) return false;

    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.vehicleRegistration?.toLowerCase().includes(q) ||
      f.fuelType.toLowerCase().includes(q) ||
      f.vendor?.toLowerCase().includes(q) ||
      f.transportNo?.toLowerCase().includes(q) ||
      f.odometer?.toString().includes(q)
    );
  });

  const directTripCount = fuelRecords.filter((f) => Boolean(f.transportId)).length;
  const overheadCount = fuelRecords.filter((f) => !f.transportId).length;

  const handleExportCSV = () => {
    const headers = ['Date', 'Vehicle Reg', 'Invoice #', 'Fuel Type', 'Quantity (L)', 'Rate / L', 'Total Cost (AED)', 'Vendor', 'Odometer'];
    const rows = filteredRecords.map((f) => [
      f.date,
      f.vehicleRegistration || '',
      f.transportNo || '',
      f.fuelType,
      f.quantity,
      f.rate,
      f.totalAmount,
      f.vendor || '',
      f.odometer || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fuel_Records_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPDF = () => {
    if (!window.electronAPI) return;
    const columnsForPdf = [
      { key: 'date', header: 'Date' },
      { key: 'vehicleRegistration', header: 'Vehicle' },
      { key: 'transportNoDisplay', header: 'Invoice #' },
      { key: 'fuelType', header: 'Type' },
      { key: 'qtyFormatted', header: 'Qty (L)', align: 'right' as const },
      { key: 'rateFormatted', header: 'Rate (AED)', align: 'right' as const },
      { key: 'totalFormatted', header: 'Total (AED)', align: 'right' as const },
      { key: 'vendor', header: 'Station / Vendor' },
      { key: 'odometerFormatted', header: 'Odometer', align: 'right' as const },
    ];
    const totalAmount = filteredRecords.reduce((acc, f) => acc + f.totalAmount, 0);
    const totalLiters = filteredRecords.reduce((acc, f) => acc + f.quantity, 0);

    window.electronAPI.openReportPdfPreview({
      title: 'Fleet Diesel Fuel Consumption & Expenses Ledger',
      description: `Showing ${filteredRecords.length} fuel fill records`,
      columns: columnsForPdf,
      data: filteredRecords.map((f) => ({
        ...f,
        transportNoDisplay: f.transportNo || '-',
        qtyFormatted: `${f.quantity} L`,
        rateFormatted: f.rate.toFixed(2),
        totalFormatted: f.totalAmount.toLocaleString(),
        odometerFormatted: f.odometer ? f.odometer.toLocaleString() : '-',
      })),
      kpis: [
        { label: 'Total Diesel Cost', value: `AED ${totalAmount.toLocaleString()}` },
        { label: 'Total Fuel Volume', value: `${totalLiters.toLocaleString()} Liters` },
      ],
      orientation: 'landscape',
    });
  };

  const columns: Column<FuelRecord>[] = [
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
      key: 'fuelType',
      header: 'Fuel Type',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'quantity',
      header: 'Qty (Liters)',
      align: 'right',
      className: 'font-mono text-slate-800',
      render: (f) => `${f.quantity} L`,
    },
    {
      key: 'rate',
      header: 'Rate / Liter',
      align: 'right',
      className: 'font-mono text-slate-500',
    },
    {
      key: 'totalAmount',
      header: 'Total Cost (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-rose-600',
      render: (f) => f.totalAmount.toLocaleString(),
    },
    {
      key: 'vendor',
      header: 'Station / Vendor',
      className: 'text-slate-700',
      render: (f) => (
        <div className="space-y-0.5">
          <span className="block">{f.vendor || '-'}</span>
          {f.transportNo && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
              <LinkIcon className="w-3 h-3" />
              Invoice # {f.transportNo}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'classification',
      header: 'Classification',
      align: 'center',
      render: (f) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-2xs whitespace-nowrap ${
            f.transportId
              ? 'bg-violet-100 text-violet-800 border border-violet-300'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {f.transportId ? '🔗 DIRECT TRIP (COGS)' : 'FLEET OVERHEAD'}
        </span>
      ),
    },
    {
      key: 'odometer',
      header: 'Odometer (KM)',
      align: 'right',
      className: 'font-mono text-slate-500',
      render: (f) => (f.odometer ? f.odometer.toLocaleString() : '-'),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox
          ref={searchInputRef}
          value={search}
          onChange={setSearch}
          placeholder="Search fuel log by vehicle reg, station, invoice # or fuel type... (Ctrl+F)"
          className="max-w-md flex-1"
        />

        <div className="flex items-center gap-2">
          <ExportButton onClick={handleExportCSV} />
          <PrintButton onClick={handlePrintPDF} />
          <Button
            onClick={() => setIsModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Log Fuel Filling (Ctrl+N)
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
          All Fuel Logs ({fuelRecords.length})
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
          <span>Direct Trip Fuel (COGS) ({directTripCount})</span>
        </button>
        <button
          onClick={() => setCostFilter('OVERHEAD')}
          className={`px-3.5 py-1 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'OVERHEAD'
              ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/25'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Fleet General Fuel ({overheadCount})</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={filteredRecords}
        keyExtractor={(f) => f.id}
        emptyMessage="No fuel logs recorded yet."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Fuel Filling Entry"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fuel Type</label>
              <SelectDropdown
                options={[
                  { value: 'DIESEL', label: 'DIESEL' },
                  { value: 'PETROL', label: 'PETROL' },
                ]}
                value={fuelType}
                onChange={setFuelType}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quantity (Liters)</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rate / Liter (AED)</label>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>
          </div>

          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex items-center justify-between text-xs font-mono">
            <span className="text-rose-900 font-semibold font-sans">Total Calculated Cost:</span>
            <span className="font-bold text-rose-600 text-base">AED {totalCost.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fuel Station / Vendor</label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. ENOC, ADNOC, Emarat"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Odometer Reading (KM)</label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 145000"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
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
              Save Fuel Entry
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
