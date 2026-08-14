import React, { useEffect, useState } from 'react';
import { Vehicle, Driver } from '@shared/types';
import { Plus, Truck, Edit, UserCheck, AlertCircle } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [makeModel, setMakeModel] = useState('');
  const [modelYear, setModelYear] = useState<number | ''>(2023);
  const [currentDriverId, setCurrentDriverId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick Add Driver State
  const [isQuickDriverOpen, setIsQuickDriverOpen] = useState(false);
  const [quickDriverName, setQuickDriverName] = useState('');
  const [quickDriverPhone, setQuickDriverPhone] = useState('');
  const [quickDriverSalary, setQuickDriverSalary] = useState<number | ''>(1500);

  const handleQuickAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDriverName.trim() || !window.electronAPI) return;
    try {
      const newDriver = await window.electronAPI.createDriver({
        name: quickDriverName.trim(),
        phone: quickDriverPhone.trim() || undefined,
        basicSalary: Number(quickDriverSalary || 1500),
        status: 'ACTIVE',
      });
      await loadData();
      setCurrentDriverId(newDriver.id);
      setQuickDriverName('');
      setQuickDriverPhone('');
      setIsQuickDriverOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to add driver');
    }
  };

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const { registerAction } = useKeyboardShortcuts();

  const loadData = async () => {
    if (window.electronAPI) {
      const [vRes, dRes] = await Promise.all([
        window.electronAPI.getVehicles(search),
        window.electronAPI.getDrivers(),
      ]);
      setVehicles(vRes);
      setDrivers(dRes);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  useEffect(() => {
    const unregisterNew = registerAction('NEW_RECORD', () => {
      setEditingVehicle(null);
      setRegistrationNumber('');
      setVehicleType('Truck');
      setMakeModel('');
      setModelYear(2023);
      setCurrentDriverId('');
      setStatus('ACTIVE');
      setNotes('');
      setErrorMsg(null);
      setIsModalOpen(true);
    }, 'vehicles');
    const unregisterSearch = registerAction('SEARCH_FOCUS', () => {
      searchInputRef.current?.focus();
    }, 'vehicles');
    return () => {
      unregisterNew();
      unregisterSearch();
    };
  }, [registerAction]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!registrationNumber.trim()) return;

    try {
      if (editingVehicle) {
        await window.electronAPI.updateVehicle(editingVehicle.id, {
          registrationNumber: registrationNumber.trim().toUpperCase(),
          vehicleType,
          makeModel,
          modelYear: modelYear ? Number(modelYear) : undefined,
          currentDriverId: currentDriverId || undefined,
          status,
          notes,
        });
      } else {
        await window.electronAPI.createVehicle({
          registrationNumber: registrationNumber.trim().toUpperCase(),
          vehicleType,
          makeModel,
          modelYear: modelYear ? Number(modelYear) : undefined,
          currentDriverId: currentDriverId || undefined,
          status,
          notes,
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    }
  };

  const columns: Column<Vehicle>[] = [
    {
      key: 'registrationNumber',
      header: 'Registration No',
      className: 'font-mono font-bold text-amber-600',
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <span>{v.registrationNumber}</span>
        </div>
      ),
    },
    {
      key: 'vehicleType',
      header: 'Type',
      className: 'font-semibold text-slate-700',
    },
    {
      key: 'makeModel',
      header: 'Make / Model',
      className: 'text-slate-700',
      render: (v) => v.makeModel || '-',
    },
    {
      key: 'modelYear',
      header: 'Model Year',
      className: 'font-mono text-slate-600',
      render: (v) => v.modelYear || '-',
    },
    {
      key: 'currentDriverName',
      header: 'Assigned Driver',
      className: 'text-slate-800',
      render: (v) =>
        v.currentDriverName ? (
          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            {v.currentDriverName}
          </span>
        ) : (
          <span className="text-slate-400 italic">Unassigned</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (v) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            v.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {v.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (v) => (
        <button
          onClick={() => {
            setEditingVehicle(v);
            setRegistrationNumber(v.registrationNumber);
            setVehicleType(v.vehicleType);
            setMakeModel(v.makeModel || '');
            setModelYear(v.modelYear || '');
            setCurrentDriverId(v.currentDriverId || '');
            setStatus(v.status);
            setNotes(v.notes || '');
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
        >
          <Edit className="w-4 h-4" />
        </button>
      ),
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
          placeholder="Search vehicles by registration, type, or driver... (Ctrl+F)"
          className="max-w-md"
        />

        <Button
          onClick={() => {
            setEditingVehicle(null);
            setRegistrationNumber('');
            setVehicleType('Truck');
            setMakeModel('');
            setModelYear(2023);
            setCurrentDriverId('');
            setStatus('ACTIVE');
            setNotes('');
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Register New Vehicle (Ctrl+N)
        </Button>
      </div>

      {/* Vehicles Table using DataTable */}
      <DataTable
        columns={columns}
        data={vehicles}
        keyExtractor={(v) => v.id}
        emptyMessage="No vehicles registered yet. Click 'Register New Vehicle' to create one."
      />

      {/* Vehicle Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVehicle ? 'Edit Vehicle Profile' : 'Register New Vehicle'}
        maxWidth="lg"
      >
        {errorMsg && (
          <div className="mb-3.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Registration Number (UNIQUE)</label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. DXB-10293"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-mono font-extrabold text-amber-600 focus:outline-none uppercase transition-all duration-200 shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vehicle Type</label>
              <SelectDropdown
                options={[
                  { value: 'Truck', label: 'Truck' },
                  { value: 'Trailer', label: 'Trailer' },
                  { value: 'Container', label: 'Container' },
                  { value: 'Dumper', label: 'Dumper' },
                ]}
                value={vehicleType}
                onChange={setVehicleType}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Model Year</label>
              <input
                type="number"
                value={modelYear}
                onChange={(e) => setModelYear(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2023"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none font-mono transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Make / Model</label>
            <input
              type="text"
              value={makeModel}
              onChange={(e) => setMakeModel(e.target.value)}
              placeholder="e.g. Mercedes-Benz Actros"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Current Assigned Driver</label>
              <button
                type="button"
                onClick={() => setIsQuickDriverOpen(true)}
                className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Quick Add</span>
              </button>
            </div>
            <SelectDropdown
              options={[
                { value: '', label: 'No driver assigned' },
                ...drivers.map((d) => ({
                  value: d.id,
                  label: d.name,
                  badge: d.status,
                })),
              ]}
              value={currentDriverId}
              onChange={setCurrentDriverId}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <SelectDropdown
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
              value={status}
              onChange={(val) => setStatus(val as 'ACTIVE' | 'INACTIVE')}
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
              Save Vehicle Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Driver Sub-Modal */}
      <Modal
        isOpen={isQuickDriverOpen}
        onClose={() => setIsQuickDriverOpen(false)}
        title="Quick Add Driver"
        maxWidth="md"
      >
        <form onSubmit={handleQuickAddDriver} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Driver Name</label>
            <input
              type="text"
              value={quickDriverName}
              onChange={(e) => setQuickDriverName(e.target.value)}
              placeholder="e.g. Imran Shah"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="text"
                value={quickDriverPhone}
                onChange={(e) => setQuickDriverPhone(e.target.value)}
                placeholder="+971 50 1234567"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Basic Salary (AED)</label>
              <input
                type="number"
                value={quickDriverSalary}
                onChange={(e) => setQuickDriverSalary(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1500"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold font-mono text-slate-900 focus:outline-none transition"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsQuickDriverOpen(false)}>
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
