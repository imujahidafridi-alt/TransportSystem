import React, { useEffect, useRef, useState } from 'react';
import { DriverSalaryRecord, Driver, SalaryPaymentStatus } from '@shared/types';
import { Plus, CheckCircle, Clock } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const DriverSalariesPage: React.FC = () => {
  const [salaries, setSalaries] = useState<DriverSalaryRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [driverId, setDriverId] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState('2026-08');
  const [basicSalary, setBasicSalary] = useState<number | ''>(6500);
  const [allowances, setAllowances] = useState<number | ''>(500);
  const [deductions, setDeductions] = useState<number | ''>(200);
  const [advance, setAdvance] = useState<number | ''>(0);
  const [paymentStatus, setPaymentStatus] = useState<SalaryPaymentStatus>('PENDING');

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
      const [sRes, dRes] = await Promise.all([
        window.electronAPI.getSalaries(),
        window.electronAPI.getDrivers(),
      ]);
      setSalaries(sRes);
      setDrivers(dRes);
      if (!driverId && dRes.length > 0) {
        setDriverId(dRes[0].id);
        setBasicSalary(dRes[0].basicSalary);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDriverChange = (dId: string) => {
    setDriverId(dId);
    const d = drivers.find((x) => x.id === dId);
    if (d) setBasicSalary(d.basicSalary);
  };

  const calculatedNet =
    Number(basicSalary || 0) +
    Number(allowances || 0) -
    Number(deductions || 0) -
    Number(advance || 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return;

    await window.electronAPI.createSalaryRecord({
      driverId,
      salaryPeriod,
      basicSalary: Number(basicSalary || 0),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      advance: Number(advance || 0),
      paymentStatus,
    });
    setIsModalOpen(false);
    loadData();
  };

  const handleToggleStatus = async (s: DriverSalaryRecord) => {
    const nextStatus: SalaryPaymentStatus = s.paymentStatus === 'PAID' ? 'PENDING' : 'PAID';
    await window.electronAPI.updateSalaryStatus(s.id, nextStatus);
    loadData();
  };

  const filteredSalaries = salaries.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.driverName?.toLowerCase().includes(q) ||
      s.salaryPeriod.toLowerCase().includes(q) ||
      s.paymentStatus.toLowerCase().includes(q)
    );
  });

  const columns: Column<DriverSalaryRecord>[] = [
    {
      key: 'salaryPeriod',
      header: 'Period',
      className: 'font-bold text-slate-700 font-mono',
    },
    {
      key: 'driverName',
      header: 'Driver Name',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'basicSalary',
      header: 'Basic',
      align: 'right',
      className: 'font-mono text-slate-500',
      render: (s) => s.basicSalary.toLocaleString(),
    },
    {
      key: 'allowances',
      header: 'Allowances',
      align: 'right',
      className: 'font-mono text-emerald-600',
      render: (s) => `+${s.allowances.toLocaleString()}`,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      className: 'font-mono text-rose-600',
      render: (s) => `-${s.deductions.toLocaleString()}`,
    },
    {
      key: 'advance',
      header: 'Advance',
      align: 'right',
      className: 'font-mono text-amber-600',
      render: (s) => `-${s.advance.toLocaleString()}`,
    },
    {
      key: 'netSalary',
      header: 'Net Salary (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600 text-sm',
      render: (s) => s.netSalary.toLocaleString(),
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      align: 'center',
      render: (s) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            s.paymentStatus === 'PAID'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {s.paymentStatus === 'PAID' ? (
            <CheckCircle className="w-3 h-3 text-emerald-600" />
          ) : (
            <Clock className="w-3 h-3 text-amber-600" />
          )}
          {s.paymentStatus}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (s) => (
        <Button
          onClick={() => handleToggleStatus(s)}
          variant={s.paymentStatus === 'PAID' ? 'secondary' : 'primary'}
          size="sm"
        >
          {s.paymentStatus === 'PAID' ? 'Mark Pending' : 'Mark Paid'}
        </Button>
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
          placeholder="Search payroll by driver name, month period or status... (Ctrl+F)"
          className="max-w-md"
        />

        <Button
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Process Driver Payroll (Ctrl+N)
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredSalaries}
        keyExtractor={(s) => s.id}
        emptyMessage="No salary records generated yet."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Process Driver Payroll Record"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Driver</label>
            <SelectDropdown
              options={drivers.map((d) => ({
                value: d.id,
                label: d.name,
                badge: `AED ${d.basicSalary.toLocaleString()}`,
              }))}
              value={driverId}
              onChange={handleDriverChange}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Salary Month / Period</label>
            <input
              type="month"
              value={salaryPeriod}
              onChange={(e) => setSalaryPeriod(e.target.value)}
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 font-mono focus:outline-none transition-all duration-200 shadow-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Basic Salary</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Allowances (+)</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-emerald-600 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Deductions (-)</label>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-rose-600 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Advance (-)</label>
              <input
                type="number"
                value={advance}
                onChange={(e) => setAdvance(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-amber-600 focus:outline-none transition-all duration-200 shadow-sm"
              />
            </div>
          </div>

          {/* Calculated Result */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs font-mono">
            <span className="text-emerald-900 font-semibold font-sans">Net Calculated Salary:</span>
            <span className="font-extrabold text-emerald-600 text-base">AED {calculatedNet.toLocaleString()}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
            <SelectDropdown
              options={[
                { value: 'PENDING', label: 'PENDING' },
                { value: 'PAID', label: 'PAID' },
              ]}
              value={paymentStatus}
              onChange={(val) => setPaymentStatus(val as SalaryPaymentStatus)}
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
              Save Payroll Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
