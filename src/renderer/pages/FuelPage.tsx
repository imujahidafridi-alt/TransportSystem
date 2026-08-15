import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FuelRecord, Vehicle, Transport } from '@shared/types';
import {
  Plus,
  Link as LinkIcon,
  Truck,
  Fuel,
  DollarSign,
  Gauge,
  Sparkles,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
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
  const [transports, setTransports] = useState<Transport[]>([]);
  const [transportId, setTransportId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [isAllTime, setIsAllTime] = useState(false);
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
      'fuel'
    );
    const unregSearch = registerAction(
      'SEARCH_FOCUS',
      () => {
        searchInputRef.current?.focus();
      },
      'fuel'
    );
    return () => {
      unregNew();
      unregSearch();
    };
  }, [registerAction]);

  const loadData = async () => {
    if (window.electronAPI) {
      try {
        const [fRes, vRes, tRes] = await Promise.all([
          window.electronAPI.getFuelRecords(),
          window.electronAPI.getVehicles(),
          window.electronAPI.getTransports({ limit: 100 }),
        ]);
        setFuelRecords(Array.isArray(fRes) ? fRes : []);
        setVehicles(Array.isArray(vRes) ? vRes : []);
        setTransports(tRes?.items ? tRes.items : Array.isArray(tRes) ? tRes : []);
        if (!vehicleId && vRes?.length > 0) setVehicleId(vRes[0].id);
      } catch (err) {
        console.error('Failed to load fuel records:', err);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const totalCost = Number(quantity || 0) * Number(rate || 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !quantity || !rate) return;

    await window.electronAPI.createFuelRecord({
      transportId: transportId || undefined,
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
    setTransportId('');
    setQuantity('');
    setRate('');
    setVendor('');
    setOdometer('');
    loadData();
  };

  // Month Filtered Records
  const monthFilteredRecords = useMemo(() => {
    // When a search term is active, search across all fuel records so users never miss a record
    if (search.trim()) return fuelRecords;
    if (isAllTime || !selectedMonth) return fuelRecords;
    return fuelRecords.filter((f) => f.date && f.date.startsWith(selectedMonth));
  }, [fuelRecords, selectedMonth, isAllTime, search]);

  const filteredRecords = useMemo(() => {
    return monthFilteredRecords.filter((f) => {
      if (costFilter === 'DIRECT_TRIP' && !f.transportId) return false;
      if (costFilter === 'OVERHEAD' && f.transportId) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        f.vehicleRegistration?.toLowerCase().includes(q) ||
        f.fuelType?.toLowerCase().includes(q) ||
        f.vendor?.toLowerCase().includes(q) ||
        f.transportNo?.toLowerCase().includes(q) ||
        f.odometer?.toString().includes(q) ||
        f.quantity?.toString().includes(q) ||
        f.rate?.toString().includes(q) ||
        f.totalAmount?.toString().includes(q) ||
        f.date?.toLowerCase().includes(q) ||
        f.notes?.toLowerCase().includes(q)
      );
    });
  }, [monthFilteredRecords, costFilter, search]);

  // Financial Metrics Summary Computation
  const summary = useMemo(() => {
    const totalAmount = filteredRecords.reduce((acc, f) => acc + (f.totalAmount || 0), 0);
    const totalLiters = filteredRecords.reduce((acc, f) => acc + (f.quantity || 0), 0);

    const directTripRecords = monthFilteredRecords.filter((f) => Boolean(f.transportId));
    const directTripSum = directTripRecords.reduce((acc, f) => acc + (f.totalAmount || 0), 0);

    const overheadRecords = monthFilteredRecords.filter((f) => !f.transportId);
    const overheadSum = overheadRecords.reduce((acc, f) => acc + (f.totalAmount || 0), 0);

    return {
      totalAmount,
      totalLiters,
      directTripCount: directTripRecords.length,
      directTripSum,
      overheadCount: overheadRecords.length,
      overheadSum,
    };
  }, [monthFilteredRecords, filteredRecords]);

  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Vehicle Reg',
      'Invoice #',
      'Fuel Type',
      'Quantity (L)',
      'Rate / L',
      'Total Cost (AED)',
      'Vendor',
      'Odometer',
    ];
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
    const fileSuffix = isAllTime ? 'All_Time' : selectedMonth || new Date().toISOString().slice(0, 7);
    link.download = `Fuel_Records_${fileSuffix}.csv`;
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

    window.electronAPI.openReportPdfPreview({
      title: `Fleet Diesel Fuel Consumption & Expenses Ledger (${formattedPeriodTitle})`,
      description: `Showing ${filteredRecords.length} fuel fill records for ${formattedPeriodTitle}`,
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
        { label: 'Total Diesel Cost', value: `AED ${summary.totalAmount.toLocaleString()}` },
        { label: 'Total Fuel Volume', value: `${summary.totalLiters.toLocaleString()} Liters` },
      ],
      orientation: 'landscape',
    });
  };

  const columns: Column<FuelRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'font-mono text-slate-700 whitespace-nowrap',
    },
    {
      key: 'vehicleRegistration',
      header: 'Vehicle Reg',
      className: 'font-mono font-bold text-amber-600',
      render: (f) => (
        <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          {f.vehicleRegistration || 'Fleet'}
        </span>
      ),
    },
    {
      key: 'fuelType',
      header: 'Fuel Type',
      className: 'font-semibold text-slate-900',
      render: (f) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
          <Fuel className="w-3 h-3 text-sky-700" />
          {f.fuelType}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty (Liters)',
      align: 'right',
      className: 'font-mono text-slate-800 font-bold',
      render: (f) => `${f.quantity.toLocaleString()} L`,
    },
    {
      key: 'rate',
      header: 'Rate / Liter',
      align: 'right',
      className: 'font-mono text-slate-500',
      render: (f) => `AED ${f.rate.toFixed(2)}`,
    },
    {
      key: 'totalAmount',
      header: 'Total Cost (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-rose-600',
      render: (f) => `AED ${f.totalAmount.toLocaleString()}`,
    },
    {
      key: 'vendor',
      header: 'Station / Vendor',
      className: 'text-slate-700 font-medium',
      render: (f) => (
        <div className="space-y-0.5">
          <span className="block">{f.vendor || '—'}</span>
          {f.transportNo && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 shadow-2xs font-mono">
              <LinkIcon className="w-3 h-3 text-violet-600" />
              Invoice #{f.transportNo}
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
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-2xs whitespace-nowrap ${
            f.transportId
              ? 'bg-violet-50 text-violet-700 border border-violet-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {f.transportId ? (
            <LinkIcon className="w-3 h-3 text-violet-600" />
          ) : (
            <Truck className="w-3 h-3 text-amber-600" />
          )}
          <span>{f.transportId ? 'TRIP FUEL' : 'FLEET OVERHEAD'}</span>
        </span>
      ),
    },
    {
      key: 'odometer',
      header: 'Odometer (KM)',
      align: 'right',
      className: 'font-mono text-slate-500',
      render: (f) => (f.odometer ? `${f.odometer.toLocaleString()} km` : '—'),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* 1. Executive Financial KPI Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Total Fuel Cost */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Fuel Cost
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
              {filteredRecords.length} records ({formattedPeriodTitle})
            </span>
          </div>
        </div>

        {/* Total Volume Liters */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
              <Fuel className="w-3 h-3" />
              <span>Total Volume</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-slate-900 text-xl block">
              {summary.totalLiters.toLocaleString()} L
            </span>
            <span className="text-[11px] text-sky-600 font-medium">Total diesel pumped</span>
          </div>
        </div>

        {/* Direct Trip Fuel */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              <span>Trip Fuel</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-slate-900 text-xl block">
              AED {summary.directTripSum.toLocaleString()}
            </span>
            <span className="text-[11px] text-violet-600 font-medium">
              {summary.directTripCount} trip-linked fills
            </span>
          </div>
        </div>

        {/* General Fleet Overhead Fuel */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              <span>Fleet Overhead</span>
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-slate-900 text-xl block">
              AED {summary.overheadSum.toLocaleString()}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">
              {summary.overheadCount} standard fleet fills
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Toolbar (Search, Month Navigator & Uniform Action Buttons) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[320px]">
          <SearchBox
            ref={searchInputRef}
            value={search}
            onChange={setSearch}
            placeholder="Search fuel log by vehicle reg, station, invoice # or fuel type... (Ctrl+F)"
            className="w-full max-w-sm"
          />

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
            Log Fuel Filling (Ctrl+N)
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
          All Fuel Logs ({monthFilteredRecords.length})
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
          <span>Direct Trip Fuel ({summary.directTripCount})</span>
        </button>
        <button
          onClick={() => setCostFilter('OVERHEAD')}
          className={`px-3.5 py-1.5 rounded-full font-bold transition-all duration-150 flex items-center gap-1.5 ${
            costFilter === 'OVERHEAD'
              ? 'bg-white text-amber-700 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-amber-600" />
          <span>Fleet General Fuel ({summary.overheadCount})</span>
        </button>
      </div>

      {/* 4. Fuel Data Table */}
      <DataTable
        columns={columns}
        data={filteredRecords}
        keyExtractor={(f) => f.id}
        title={search.trim() ? `Fuel Search Results for "${search}"` : `Fleet Fuel Consumption Ledger — ${formattedPeriodTitle}`}
        countBadge={filteredRecords.length}
        emptyMessage={
          search.trim()
            ? `No fuel records found matching "${search}".`
            : `No fuel logs recorded for ${formattedPeriodTitle}.`
        }
      />

      {/* 5. Log Fuel Filling Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Fuel Filling Entry"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
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
              onChange={(val) => {
                setVehicleId(val);
                setTransportId('');
              }}
            />
          </div>

          {/* Optional Trip Linkage for Full 2-Way Sync */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>Link to Transport Trip / Invoice (Optional)</span>
              <span className="text-[10px] text-sky-600 font-bold">2-way synced with Direct Trip Costs</span>
            </label>
            <SelectDropdown
              options={[
                {
                  value: '',
                  label: 'None (Fleet General Overhead Fuel)',
                  icon: <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />,
                },
                ...(Array.isArray(transports) ? transports : [])
                  .filter((t) => !vehicleId || t.vehicleId === vehicleId)
                  .slice(0, 30)
                  .map((t) => ({
                    value: t.id,
                    label: `${t.transportNo} • ${t.vehicleRegistration || 'Fleet'} (${t.fromLocationName || 'Origin'} ➔ ${t.toLocationName || 'Dest'})`,
                    badge: `AED ${t.totalAmount.toLocaleString()}`,
                    icon: <LinkIcon className="w-3.5 h-3.5 text-violet-600 shrink-0" />,
                  })),
              ]}
              value={transportId}
              onChange={setTransportId}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Filling Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Fuel Type</label>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Quantity (Liters) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 250"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Rate / Liter (AED) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 2.95"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
            </div>
          </div>

          {/* Real-time Calculation Total Banner */}
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs font-mono shadow-2xs">
            <span className="text-rose-900 font-bold font-sans">Total Calculated Cost:</span>
            <span className="font-black text-rose-600 text-base">
              AED {totalCost.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Fuel Station / Vendor
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. ENOC, ADNOC, Emarat"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Odometer Reading (KM)
              </label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 145000"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
