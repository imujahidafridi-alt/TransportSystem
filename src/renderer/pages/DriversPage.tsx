import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Driver, DriverStatus } from '@shared/types';
import {
  Plus,
  Users,
  UserCheck,
  Clock,
  Wallet,
  Phone,
  Edit,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ActionDropdown } from '../components/common/ActionDropdown';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DriverStatus>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnicOrLicense, setCnicOrLicense] = useState('');
  const [basicSalary, setBasicSalary] = useState<number | ''>('');
  const [status, setStatus] = useState<DriverStatus>('ACTIVE');
  const [notes, setNotes] = useState('');

  // UI Confirmation State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: 'danger' | 'warning' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'primary',
    action: async () => {},
  });

  // Action Feedback Toast / Alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { registerAction } = useKeyboardShortcuts();

  const loadDrivers = async () => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.getDrivers(search);
        setDrivers(res);
      } catch (err) {
        console.error('Failed to fetch drivers:', err);
      }
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [search]);

  // Keyboard Shortcuts
  useEffect(() => {
    const unregisterNew = registerAction(
      'NEW_RECORD',
      () => {
        handleOpenOnboardModal();
      },
      'drivers'
    );
    const unregisterSearch = registerAction(
      'SEARCH_FOCUS',
      () => {
        searchInputRef.current?.focus();
      },
      'drivers'
    );
    return () => {
      unregisterNew();
      unregisterSearch();
    };
  }, [registerAction]);

  // Filtered Drivers Data
  const filteredDrivers = useMemo(() => {
    if (statusFilter === 'ALL') return drivers;
    return drivers.filter((d) => d.status === statusFilter);
  }, [drivers, statusFilter]);

  // Summary Metrics Computation
  const summary = useMemo(() => {
    const total = drivers.length;
    const active = drivers.filter((d) => d.status === 'ACTIVE').length;
    const onLeave = drivers.filter((d) => d.status === 'ON_LEAVE').length;
    const inactive = drivers.filter((d) => d.status === 'INACTIVE').length;
    const totalBasePayroll = drivers
      .filter((d) => d.status === 'ACTIVE')
      .reduce((acc, d) => acc + (d.basicSalary || 0), 0);

    return { total, active, onLeave, inactive, totalBasePayroll };
  }, [drivers]);

  const handleOpenOnboardModal = () => {
    setEditingDriver(null);
    setName('');
    setPhone('');
    setCnicOrLicense('');
    setBasicSalary(1500);
    setStatus('ACTIVE');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (d: Driver) => {
    setEditingDriver(d);
    setName(d.name);
    setPhone(d.phone || '');
    setCnicOrLicense(d.cnicOrLicense || '');
    setBasicSalary(d.basicSalary || 0);
    setStatus(d.status);
    setNotes(d.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingDriver) {
        await window.electronAPI.updateDriver(editingDriver.id, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          cnicOrLicense: cnicOrLicense.trim() || undefined,
          basicSalary: Number(basicSalary || 0),
          status,
          notes: notes.trim() || undefined,
        });
        showFeedback('success', `Driver profile for "${name}" updated successfully.`);
      } else {
        await window.electronAPI.createDriver({
          name: name.trim(),
          phone: phone.trim() || undefined,
          cnicOrLicense: cnicOrLicense.trim() || undefined,
          basicSalary: Number(basicSalary || 0),
          status,
          notes: notes.trim() || undefined,
        });
        showFeedback('success', `Driver "${name}" onboarded successfully.`);
      }
      setIsModalOpen(false);
      await loadDrivers();
    } catch (err: any) {
      showFeedback('error', err?.message || 'Failed to save driver profile.');
    }
  };

  const handleDeleteDriver = (d: Driver) => {
    setConfirmConfig({
      isOpen: true,
      title: `Delete Driver: ${d.name}`,
      message: `Are you sure you want to delete driver record for "${d.name}"? If this driver has completed transports or historical payrolls, consider setting their status to INACTIVE instead.`,
      confirmText: 'Delete Driver',
      variant: 'danger',
      action: async () => {
        try {
          await window.electronAPI.deleteDriver(d.id);
          showFeedback('success', `Driver "${d.name}" was removed.`);
          await loadDrivers();
        } catch (err: any) {
          showFeedback('error', err?.message || 'Failed to delete driver.');
        }
      },
    });
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const getInitials = (driverName: string) => {
    return driverName
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const columns: Column<Driver>[] = [
    {
      key: 'name',
      header: 'Driver Name',
      className: 'font-semibold text-slate-900',
      render: (d) => {
        const initials = getInitials(d.name) || 'DR';
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs font-mono">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="block font-bold text-slate-900 truncate">{d.name}</span>
              {d.notes && (
                <span className="text-[11px] text-slate-400 truncate block max-w-xs font-normal">
                  {d.notes}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Contact & Phone',
      className: 'font-mono text-slate-700',
      render: (d) => (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
            <Phone className="w-3 h-3" />
          </div>
          <span className="font-semibold text-slate-800">{d.phone || '—'}</span>
        </div>
      ),
    },
    {
      key: 'cnicOrLicense',
      header: 'License / CNIC',
      className: 'font-mono text-slate-700',
      render: (d) =>
        d.cnicOrLicense ? (
          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-mono text-[11px] font-semibold text-slate-700">
            {d.cnicOrLicense}
          </span>
        ) : (
          <span className="text-slate-400 font-sans">—</span>
        ),
    },
    {
      key: 'basicSalary',
      header: 'Monthly Base Salary',
      align: 'right',
      className: 'font-mono font-black text-slate-900',
      render: (d) => (
        <span className="text-emerald-700 font-extrabold">
          AED {(d.basicSalary || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (d) => (
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase border ${
            d.status === 'ACTIVE'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : d.status === 'ON_LEAVE'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {d.status === 'ON_LEAVE' ? 'ON LEAVE' : d.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (d) => (
        <ActionDropdown
          align="right"
          direction="auto"
          items={[
            {
              id: 'edit',
              label: 'Edit Driver Profile',
              icon: <Edit className="w-3.5 h-3.5 text-violet-600" />,
              onClick: () => handleOpenEditModal(d),
            },
            {
              id: 'delete',
              label: 'Delete Driver',
              icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
              variant: 'danger',
              onClick: () => handleDeleteDriver(d),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Toast Feedback Notification Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Fleet Drivers KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Total Drivers */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Drivers
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-slate-900 text-xl block">
              {summary.total}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Registered fleet staff</span>
          </div>
        </div>

        {/* Active Drivers */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Active On Duty
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-emerald-700 text-xl block">
              {summary.active}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Ready for dispatch</span>
          </div>
        </div>

        {/* On Leave */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              On Leave / Inactive
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-amber-700 text-xl block">
              {summary.onLeave + summary.inactive}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">
              {summary.onLeave} leave • {summary.inactive} inactive
            </span>
          </div>
        </div>

        {/* Monthly Base Payroll Commitment */}
        <div className="p-4 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Monthly Base Payroll
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="font-mono font-black text-slate-900 text-xl block">
              AED {summary.totalBasePayroll.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Active driver base salaries</span>
          </div>
        </div>
      </div>

      {/* 2. Top Toolbar (Search, Filter Capsules & Onboard Action) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <SearchBox
            ref={searchInputRef}
            value={search}
            onChange={setSearch}
            placeholder="Search drivers by name, phone, or CNIC... (Ctrl+F)"
            className="w-full max-w-sm"
          />

          {/* Status Filter Capsules */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shadow-2xs text-xs">
            {(['ALL', 'ACTIVE', 'ON_LEAVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 ${
                  statusFilter === st
                    ? 'bg-white text-violet-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Drivers' : st === 'ON_LEAVE' ? 'On Leave' : st}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleOpenOnboardModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Onboard New Driver (Ctrl+N)
        </Button>
      </div>

      {/* 3. Drivers Data Table */}
      <DataTable
        columns={columns}
        data={filteredDrivers}
        keyExtractor={(d) => d.id}
        title="Fleet Drivers Roster"
        countBadge={filteredDrivers.length}
        emptyMessage="No drivers matching your filter criteria. Click 'Onboard New Driver' to register one."
      />

      {/* 4. Onboard / Edit Driver Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Onboard New Driver'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Driver Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Full Driver Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Haroon Wazir"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
              required
              autoFocus
            />
          </div>

          {/* Contact & License */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +971 50 1234567"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Emirates ID / Driving License No.
              </label>
              <input
                type="text"
                value={cnicOrLicense}
                onChange={(e) => setCnicOrLicense(e.target.value)}
                placeholder="e.g. 784-1988-1234567-1"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs"
              />
            </div>
          </div>

          {/* Salary & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Monthly Base Salary (AED) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) =>
                  setBasicSalary(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                }
                placeholder="1500"
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Guaranteed monthly base salary before trip earnings.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Driver Operational Status
              </label>
              <SelectDropdown
                options={[
                  { value: 'ACTIVE', label: 'ACTIVE — Ready for Trips' },
                  { value: 'ON_LEAVE', label: 'ON LEAVE — Temporarily Away' },
                  { value: 'INACTIVE', label: 'INACTIVE — Former Staff' },
                ]}
                value={status}
                onChange={(val) => setStatus(val as DriverStatus)}
              />
            </div>
          </div>

          {/* Notes / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5">
              Notes & Special Instructions (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Assigned to heavy trailer fleet DXB-10152; visa renewal due next year."
              rows={3}
              className="w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl p-3.5 text-xs font-medium text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {editingDriver ? 'Update Driver Profile' : 'Complete Onboarding'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.action}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
      />
    </div>
  );
};

