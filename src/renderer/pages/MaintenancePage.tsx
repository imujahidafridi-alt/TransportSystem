import React, { useEffect, useRef, useState } from 'react';
import { MaintenanceRecord, Vehicle } from '@shared/types';
import { Plus } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const MaintenancePage: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vehicleId, setVehicleId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('Engine Repair');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>(4500);
  const [vendor, setVendor] = useState('Al-Futtaim Auto');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { registerAction } = useKeyboardShortcuts();

  // Keyboard Shortcuts Registration (Ctrl+N & Ctrl+F)
  useEffect(() => {
    const unregNew = registerAction('NEW_RECORD', () => {
      setIsModalOpen(true);
    });
    const unregSearch = registerAction('SEARCH_FOCUS', () => {
      searchInputRef.current?.focus();
    });
    return () => {
      unregNew();
      unregSearch();
    };
  }, [registerAction]);

  const loadData = async () => {
    if (window.electronAPI) {
      const [mRes, vRes] = await Promise.all([
        window.electronAPI.getMaintenanceRecords(),
        window.electronAPI.getVehicles(),
      ]);
      setRecords(mRes);
      setVehicles(vRes);
      if (!vehicleId && vRes.length > 0) setVehicleId(vRes[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !amount) return;

    await window.electronAPI.createMaintenanceRecord({
      vehicleId,
      date,
      maintenanceType,
      description,
      amount: Number(amount),
      vendor,
    });
    setIsModalOpen(false);
    loadData();
  };

  const filteredRecords = records.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.vehicleRegistration?.toLowerCase().includes(q) ||
      m.maintenanceType.toLowerCase().includes(q) ||
      m.description?.toLowerCase().includes(q) ||
      m.vendor?.toLowerCase().includes(q)
    );
  });

  const columns: Column<MaintenanceRecord>[] = [
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
      key: 'maintenanceType',
      header: 'Maintenance Type',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'description',
      header: 'Description',
      className: 'text-slate-700',
      render: (m) => m.description || '-',
    },
    {
      key: 'vendor',
      header: 'Workshop / Vendor',
      className: 'text-slate-500',
      render: (m) => m.vendor || '-',
    },
    {
      key: 'amount',
      header: 'Amount (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-rose-600',
      render: (m) => m.amount.toLocaleString(),
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
          placeholder="Search maintenance by vehicle reg, type, parts or workshop... (Ctrl+F)"
          className="max-w-md"
        />

        <Button
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Schedule Maintenance (Ctrl+N)
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredRecords}
        keyExtractor={(m) => m.id}
        emptyMessage="No maintenance records logged yet."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Maintenance Log Entry"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle</label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F0F2F9] border border-transparent focus:border-violet-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Maintenance Type</label>
              <SelectDropdown
                options={[
                  { value: 'Oil Change', label: 'Oil Change' },
                  { value: 'Engine Repair', label: 'Engine Repair' },
                  { value: 'Tyre Replacement', label: 'Tyre Replacement' },
                  { value: 'Brake Repair', label: 'Brake Repair' },
                  { value: 'Electrical Repair', label: 'Electrical Repair' },
                  { value: 'General Service', label: 'General Service' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={maintenanceType}
                onChange={setMaintenanceType}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (AED)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-[#F0F2F9] border border-transparent focus:border-violet-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs font-bold text-rose-600 font-mono focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Workshop / Vendor</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Al-Futtaim Auto"
              className="w-full bg-[#F0F2F9] border border-transparent focus:border-violet-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Parts Replaced</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Details of repair..."
              className="w-full bg-[#F0F2F9] border border-transparent focus:border-violet-600 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none transition"
            />
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
              Save Maintenance Log
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
