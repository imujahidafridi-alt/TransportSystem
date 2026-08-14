import React, { useEffect, useState } from 'react';
import { Driver, DriverStatus } from '@shared/types';
import { Plus, Users, Edit, Phone } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnicOrLicense, setCnicOrLicense] = useState('');
  const [salaryType, setSalaryType] = useState('MONTHLY');
  const [basicSalary, setBasicSalary] = useState<number | ''>(1500);
  const [status, setStatus] = useState<DriverStatus>('ACTIVE');
  const [notes, setNotes] = useState('');

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const { registerAction } = useKeyboardShortcuts();

  const loadDrivers = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.getDrivers(search);
      setDrivers(res);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [search]);

  useEffect(() => {
    const unregisterNew = registerAction('NEW_RECORD', () => {
      setEditingDriver(null);
      setName('');
      setPhone('');
      setCnicOrLicense('');
      setSalaryType('MONTHLY');
      setBasicSalary(1500);
      setStatus('ACTIVE');
      setNotes('');
      setIsModalOpen(true);
    }, 'drivers');
    const unregisterSearch = registerAction('SEARCH_FOCUS', () => {
      searchInputRef.current?.focus();
    }, 'drivers');
    return () => {
      unregisterNew();
      unregisterSearch();
    };
  }, [registerAction]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingDriver) {
      await window.electronAPI.updateDriver(editingDriver.id, {
        name,
        phone,
        cnicOrLicense,
        salaryType,
        basicSalary: Number(basicSalary || 0),
        status,
        notes,
      });
    } else {
      await window.electronAPI.createDriver({
        name,
        phone,
        cnicOrLicense,
        salaryType,
        basicSalary: Number(basicSalary || 0),
        status,
        notes,
      });
    }
    setIsModalOpen(false);
    loadDrivers();
  };

  const columns: Column<Driver>[] = [
    {
      key: 'name',
      header: 'Driver Name',
      className: 'font-semibold text-slate-900',
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span>{d.name}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      className: 'font-mono text-slate-700',
      render: (d) => (
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
          <span>{d.phone || '-'}</span>
        </div>
      ),
    },
    {
      key: 'cnicOrLicense',
      header: 'CNIC / License',
      className: 'font-mono text-slate-700',
      render: (d) => d.cnicOrLicense || '-',
    },
    {
      key: 'basicSalary',
      header: 'Basic Salary (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600',
      render: (d) => d.basicSalary.toLocaleString(),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (d) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            d.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-700'
              : d.status === 'ON_LEAVE'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {d.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <button
          onClick={() => {
            setEditingDriver(d);
            setName(d.name);
            setPhone(d.phone || '');
            setCnicOrLicense(d.cnicOrLicense || '');
            setSalaryType(d.salaryType);
            setBasicSalary(d.basicSalary);
            setStatus(d.status);
            setNotes(d.notes || '');
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
          placeholder="Search drivers by name, phone, or CNIC... (Ctrl+F)"
          className="max-w-md"
        />

        <Button
          onClick={() => {
            setEditingDriver(null);
            setName('');
            setPhone('');
            setCnicOrLicense('');
            setSalaryType('MONTHLY');
            setBasicSalary(1500);
            setStatus('ACTIVE');
            setNotes('');
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Onboard New Driver (Ctrl+N)
        </Button>
      </div>

      {/* Drivers Table using Reusable DataTable */}
      <DataTable
        columns={columns}
        data={drivers}
        keyExtractor={(d) => d.id}
        emptyMessage="No drivers recorded. Click 'Onboard New Driver' to register one."
      />

      {/* Driver Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDriver ? 'Edit Driver Profile' : 'Onboard New Driver'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Driver Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rashid Al-Maktoum"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 50 1234567"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">CNIC / License No.</label>
              <input
                type="text"
                value={cnicOrLicense}
                onChange={(e) => setCnicOrLicense(e.target.value)}
                placeholder="784-1988-1234567-1"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Basic Salary (AED)</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1500"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <SelectDropdown
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE' },
                  { value: 'ON_LEAVE', label: 'ON LEAVE' },
                  { value: 'INACTIVE', label: 'INACTIVE' },
                ]}
                value={status}
                onChange={(val) => setStatus(val as DriverStatus)}
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
              Save Driver Profile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
