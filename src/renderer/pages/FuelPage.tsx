import React, { useEffect, useRef, useState } from 'react';
import { FuelRecord, Vehicle } from '@shared/types';
import { Plus } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const FuelPage: React.FC = () => {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState('');
  const [fuelType, setFuelType] = useState('DIESEL');
  const [quantity, setQuantity] = useState<number | ''>(250);
  const [rate, setRate] = useState<number | ''>(3.5);
  const [vendor, setVendor] = useState('ENOC Station');
  const [odometer, setOdometer] = useState<number | ''>(142500);

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
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.vehicleRegistration?.toLowerCase().includes(q) ||
      f.fuelType.toLowerCase().includes(q) ||
      f.vendor?.toLowerCase().includes(q) ||
      f.odometer?.toString().includes(q)
    );
  });

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
      render: (f) => f.vendor || '-',
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
      <div className="flex items-center justify-between gap-4">
        <SearchBox
          ref={searchInputRef}
          value={search}
          onChange={setSearch}
          placeholder="Search fuel log by vehicle reg, station or fuel type... (Ctrl+F)"
          className="max-w-md"
        />

        <Button
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Log Fuel Filling (Ctrl+N)
        </Button>
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
