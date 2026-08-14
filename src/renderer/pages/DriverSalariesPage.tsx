import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  DriverSalaryRecord,
  Driver,
  SalaryPaymentStatus,
  MasterPayrollSummary,
} from '@shared/types';
import {
  Plus,
  CheckCircle,
  Clock,
  Truck,
  Printer,
  Sparkles,
  Lock,
  CreditCard,
  AlertCircle,
  Edit3,
  Trash2,
  Calendar,
  CheckSquare,
  Square,
} from 'lucide-react';
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
  const [salaryPeriod, setSalaryPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED' | 'PAID' | 'PENDING'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [masterSummary, setMasterSummary] = useState<MasterPayrollSummary | null>(null);

  // Modals state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedSalaryForAdj, setSelectedSalaryForAdj] = useState<DriverSalaryRecord | null>(null);

  // Payment Form State
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer / WPS');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidBy, setPaidBy] = useState('Admin');

  // Adjustment Form State
  const [adjType, setAdjType] = useState<'BONUS' | 'DEDUCTION' | 'ADVANCE'>('ADVANCE');
  const [adjAmount, setAdjAmount] = useState<number | ''>('');
  const [adjReason, setAdjReason] = useState('');

  // Single Driver Modal State
  const [driverId, setDriverId] = useState('');
  const [basicSalary, setBasicSalary] = useState<number | ''>('');
  const [totalTrips, setTotalTrips] = useState<number>(0);
  const [tripEarnings, setTripEarnings] = useState<number | ''>('');
  const [allowances, setAllowances] = useState<number | ''>('');
  const [deductions, setDeductions] = useState<number | ''>('');
  const [advance, setAdvance] = useState<number | ''>('');
  const [paymentStatus] = useState<SalaryPaymentStatus>('DRAFT');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { registerAction } = useKeyboardShortcuts();

  useEffect(() => {
    const unregNew = registerAction(
      'NEW_RECORD',
      () => {
        setIsSingleModalOpen(true);
      },
      'salaries'
    );
    const unregSearch = registerAction(
      'SEARCH_FOCUS',
      () => {
        searchInputRef.current?.focus();
      },
      'salaries'
    );
    return () => {
      unregNew();
      unregSearch();
    };
  }, [registerAction]);

  const loadData = async () => {
    if (window.electronAPI) {
      const [sRes, dRes, sumRes] = await Promise.all([
        window.electronAPI.getSalaries({ period: salaryPeriod }),
        window.electronAPI.getDrivers(),
        window.electronAPI.getMasterPayrollSummary(salaryPeriod),
      ]);
      setSalaries(sRes);
      setDrivers(dRes);
      setMasterSummary(sumRes);
      setSelectedIds([]);
      if (!driverId && dRes.length > 0) {
        setDriverId(dRes[0].id);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [salaryPeriod]);

  // Recalculate trip allowance when single driver or period changes
  const fetchDriverPayrollDetails = async (selectedDriverId: string, period: string) => {
    if (!selectedDriverId || !window.electronAPI) return;
    try {
      const res = await window.electronAPI.calculateDriverPayroll(selectedDriverId, period);
      setBasicSalary(res.basicSalary !== 0 ? res.basicSalary : '');
      setTotalTrips(res.completedTrips || 0);
      setTripEarnings(res.tripEarnings !== 0 ? res.tripEarnings : '');
      setAllowances(res.allowances !== 0 ? res.allowances : '');
    } catch (err) {
      console.error('Failed to calculate driver payroll:', err);
    }
  };

  useEffect(() => {
    if (driverId && isSingleModalOpen) {
      fetchDriverPayrollDetails(driverId, salaryPeriod);
    }
  }, [driverId, salaryPeriod, isSingleModalOpen]);

  const handleDriverChange = (dId: string) => {
    setDriverId(dId);
    fetchDriverPayrollDetails(dId, salaryPeriod);
  };

  // 1. Batch Generate Payroll Draft
  const handleGenerateDraft = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.generatePayrollDraft(salaryPeriod, 'Admin');
    await loadData();
  };

  // 2. Batch Finalize Payroll
  const handleFinalizeConfirm = async () => {
    if (!window.electronAPI) return;
    const idsToFinalize = selectedIds.length > 0 ? selectedIds : undefined;
    await window.electronAPI.finalizePayroll(salaryPeriod, idsToFinalize, 'Admin');
    setIsFinalizeModalOpen(false);
    await loadData();
  };

  // 3. Batch Mark as Paid
  const handlePayConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    const idsToPay =
      selectedIds.length > 0
        ? selectedIds
        : filteredSalaries.filter((s) => s.paymentStatus !== 'PAID').map((s) => s.id);

    if (idsToPay.length === 0) return;

    await window.electronAPI.markSalariesPaid({
      salaryRecordIds: idsToPay,
      paymentDate,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      paidBy,
    });

    setIsPayModalOpen(false);
    setPaymentReference('');
    await loadData();
  };

  // 4. Audited Adjustment Handlers
  const handleOpenAdjustment = (s: DriverSalaryRecord) => {
    setSelectedSalaryForAdj(s);
    setAdjType('ADVANCE');
    setAdjAmount('');
    setAdjReason('');
    setIsAdjustmentModalOpen(true);
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalaryForAdj || !adjAmount || !adjReason.trim() || !window.electronAPI) return;

    try {
      const updated = await window.electronAPI.addSalaryAdjustment({
        salaryRecordId: selectedSalaryForAdj.id,
        adjustmentType: adjType,
        amount: Number(adjAmount),
        reason: adjReason.trim(),
        createdBy: 'Admin',
      });
      setSelectedSalaryForAdj(updated);
      setAdjAmount('');
      setAdjReason('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to add adjustment.');
    }
  };

  const handleDeleteAdjustment = async (adjId: string) => {
    if (!selectedSalaryForAdj || !window.electronAPI) return;
    try {
      await window.electronAPI.deleteSalaryAdjustment(adjId);
      const updatedSalaries = await window.electronAPI.getSalaries({ period: salaryPeriod });
      const current = updatedSalaries.find((s: DriverSalaryRecord) => s.id === selectedSalaryForAdj.id);
      if (current) setSelectedSalaryForAdj(current);
      setSalaries(updatedSalaries);
      const sumRes = await window.electronAPI.getMasterPayrollSummary(salaryPeriod);
      setMasterSummary(sumRes);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete adjustment.');
    }
  };

  const calculatedNet =
    Number(basicSalary || 0) +
    Number(tripEarnings || 0) +
    Number(allowances || 0) -
    Number(deductions || 0) -
    Number(advance || 0);

  const handleSingleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId) return;

    await window.electronAPI.createSalaryRecord({
      driverId,
      salaryPeriod,
      basicSalary: Number(basicSalary || 0),
      totalTrips,
      tripEarnings: Number(tripEarnings || 0),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      advance: Number(advance || 0),
      paymentStatus,
    });
    setIsSingleModalOpen(false);
    loadData();
  };

  const handlePrintDriverLedger = async (s: DriverSalaryRecord) => {
    if (window.electronAPI) {
      const tRes = await window.electronAPI.getTransactionReports({
        driverId: s.driverId,
        startDate: `${s.salaryPeriod}-01`,
        endDate: `${s.salaryPeriod}-31`,
      });

      const formattedTrips = (tRes || []).map((t: any) => ({
        date: t.date,
        transportNo: t.transportNo,
        fromTo: `${t.fromLocationName || 'Origin'} → ${t.toLocationName || 'Destination'}`,
        commission: t.driverAllowance || 0,
      }));

      window.electronAPI.openDriverLedgerPdfPreview({
        driverName: s.driverName || 'Driver',
        period: s.salaryPeriod,
        basicSalary: s.basicSalary,
        completedTripsCount: s.totalTrips || formattedTrips.length,
        totalTripCommission: s.tripEarnings || 0,
        allowances: s.allowances,
        deductions: s.deductions,
        advance: s.advance,
        netSalary: s.netSalary,
        paymentStatus: s.paymentStatus,
        trips: formattedTrips,
      });
    }
  };

  // Multi-select toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSalaries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSalaries.map((s) => s.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Filtered Salaries
  const filteredSalaries = useMemo(() => {
    return salaries.filter((s) => {
      // Status filter
      if (statusFilter === 'DRAFT' && s.paymentStatus !== 'DRAFT') return false;
      if (statusFilter === 'FINALIZED' && s.paymentStatus !== 'FINALIZED') return false;
      if (statusFilter === 'PAID' && s.paymentStatus !== 'PAID') return false;
      if (statusFilter === 'PENDING' && s.paymentStatus === 'PAID') return false;

      // Text search
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.driverName?.toLowerCase().includes(q) ||
        s.paymentStatus.toLowerCase().includes(q) ||
        s.paymentMethod?.toLowerCase().includes(q) ||
        s.paymentReference?.toLowerCase().includes(q)
      );
    });
  }, [salaries, statusFilter, search]);

  const columns: Column<DriverSalaryRecord>[] = [
    {
      key: 'id',
      header: (
        <button
          type="button"
          onClick={toggleSelectAll}
          className="p-1 text-slate-400 hover:text-slate-700 transition"
        >
          {selectedIds.length > 0 && selectedIds.length === filteredSalaries.length ? (
            <CheckSquare className="w-4 h-4 text-violet-600" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
        </button>
      ),
      className: 'w-10 text-center',
      render: (s) => (
        <button
          type="button"
          onClick={() => toggleSelectRow(s.id)}
          className="p-1 text-slate-400 hover:text-slate-700 transition"
        >
          {selectedIds.includes(s.id) ? (
            <CheckSquare className="w-4 h-4 text-violet-600" />
          ) : (
            <Square className="w-4 h-4 text-slate-300" />
          )}
        </button>
      ),
    },
    {
      key: 'driverName',
      header: 'Driver & Contract',
      className: 'font-semibold text-slate-900',
      render: (s) => (
        <div>
          <span className="font-bold text-slate-900 block text-xs">{s.driverName}</span>
          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
            {s.salaryType || 'MONTHLY'}
          </span>
        </div>
      ),
    },
    {
      key: 'basicSalary',
      header: 'Basic Salary',
      align: 'right',
      className: 'font-mono text-slate-700 font-semibold',
      render: (s) => `AED ${s.basicSalary.toLocaleString()}`,
    },
    {
      key: 'tripEarnings',
      header: 'Completed Trips & Earnings',
      align: 'right',
      className: 'font-mono text-sky-700 font-bold',
      render: (s) => (
        <div className="text-right">
          <span className="block text-xs font-bold text-sky-800">
            +AED {(s.tripEarnings || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-normal">
            {s.totalTrips || 0} completed trips
          </span>
        </div>
      ),
    },
    {
      key: 'allowances',
      header: 'Allowances / Bonus',
      align: 'right',
      className: 'font-mono text-emerald-600',
      render: (s) => `+AED ${s.allowances.toLocaleString()}`,
    },
    {
      key: 'deductions',
      header: 'Deductions & Advance',
      align: 'right',
      className: 'font-mono text-rose-600',
      render: (s) => (
        <div className="text-right">
          {s.advance > 0 && <span className="block text-xs font-bold text-amber-600">-AED {s.advance.toLocaleString()} (Adv)</span>}
          {s.deductions > 0 && <span className="block text-[11px] text-rose-600">-AED {s.deductions.toLocaleString()} (Ded)</span>}
          {s.advance === 0 && s.deductions === 0 && <span className="text-slate-400">-</span>}
        </div>
      ),
    },
    {
      key: 'netSalary',
      header: 'Net Payable (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600 text-sm whitespace-nowrap',
      render: (s) => `AED ${s.netSalary.toLocaleString()}`,
    },
    {
      key: 'paymentStatus',
      header: 'Lifecycle Status',
      align: 'center',
      render: (s) => (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              s.paymentStatus === 'PAID'
                ? 'bg-emerald-100 text-emerald-800'
                : s.paymentStatus === 'FINALIZED'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {s.paymentStatus === 'PAID' ? (
              <CheckCircle className="w-3 h-3 text-emerald-600" />
            ) : s.paymentStatus === 'FINALIZED' ? (
              <Lock className="w-3 h-3 text-indigo-600" />
            ) : (
              <Clock className="w-3 h-3 text-slate-500" />
            )}
            {s.paymentStatus}
          </span>
          {s.paymentStatus === 'PAID' && s.paymentMethod && (
            <span className="text-[9px] text-slate-500 font-mono">
              {s.paymentMethod} {s.paymentReference ? `(${s.paymentReference})` : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => {
        const isLocked = s.paymentStatus === 'FINALIZED' || s.paymentStatus === 'PAID';
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <button
              onClick={() => handleOpenAdjustment(s)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-violet-700 hover:bg-violet-50 transition border border-slate-200 shadow-2xs"
              title={isLocked ? 'View Adjustments (Locked)' : 'Add / View Audited Adjustments'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <Button
              onClick={() => handlePrintDriverLedger(s)}
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5 text-violet-600" />}
              title="Print A4 Driver Payslip & Ledger"
            >
              Payslip
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* 1. Master Monthly Summary KPI Dashboard Strip */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center border border-violet-200 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Payroll Period
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={salaryPeriod}
                  onChange={(e) => setSalaryPeriod(e.target.value)}
                  className="h-8.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 focus:border-violet-600 focus:bg-white rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none transition"
                />
                <span className="text-xs font-semibold text-slate-600">
                  {masterSummary?.workingDrivers || 0} active drivers worked ({masterSummary?.completedTrips || 0} completed trips)
                </span>
              </div>
            </div>
          </div>

          {/* Top Primary Batch Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleGenerateDraft}
              variant="outline"
              icon={<Sparkles className="w-4 h-4 text-violet-600" />}
              title="Auto-scan completed trips & allowances and prepare draft payroll"
            >
              Prepare Payroll Draft
            </Button>

            <Button
              onClick={() => setIsFinalizeModalOpen(true)}
              variant="secondary"
              icon={<Lock className="w-4 h-4 text-indigo-600" />}
              title="Lock drafted payroll into immutable historical snapshot"
            >
              Finalize Payroll
            </Button>

            <Button
              onClick={() => setIsPayModalOpen(true)}
              variant="primary"
              icon={<CreditCard className="w-4 h-4 text-white" />}
              title="Disburse payments and record WPS / Bank Transfer audit metadata"
            >
              {selectedIds.length > 0 ? `Mark ${selectedIds.length} Selected Paid` : 'Mark Eligible as Paid'}
            </Button>

            <Button
              onClick={() => setIsSingleModalOpen(true)}
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              title="Single Driver Payroll Entry (Ctrl+N)"
            >
              Manual Entry
            </Button>
          </div>
        </div>

        {/* Financial KPI Numbers Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-0.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Base Salaries
            </span>
            <span className="font-mono font-bold text-slate-800 text-sm">
              AED {(masterSummary?.totalBasicSalary || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-sky-50/70 border border-sky-200/70 rounded-xl">
            <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
              Trip Earnings
            </span>
            <span className="font-mono font-bold text-sky-900 text-sm">
              +AED {(masterSummary?.totalTripEarnings || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              Trip Allowances
            </span>
            <span className="font-mono font-bold text-emerald-900 text-sm">
              +AED {(masterSummary?.totalAllowances || 0).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-200/70 rounded-xl">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
              Deductions / Advances
            </span>
            <span className="font-mono font-bold text-rose-900 text-sm">
              -AED {((masterSummary?.totalDeductions || 0) + (masterSummary?.totalAdvances || 0)).toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-violet-50/80 border border-violet-200/80 rounded-xl col-span-2 md:col-span-1">
            <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">
              Total Net Payable
            </span>
            <span className="font-mono font-black text-violet-950 text-base">
              AED {(masterSummary?.totalNetPayable || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-xs">
          {[
            { id: 'ALL', label: `All (${salaries.length})` },
            { id: 'DRAFT', label: `Draft (${masterSummary?.draftCount || 0})` },
            { id: 'FINALIZED', label: `Finalized (${masterSummary?.finalizedCount || 0})` },
            { id: 'PAID', label: `Paid (${masterSummary?.paidCount || 0})` },
            { id: 'PENDING', label: `Pending Payout (${(masterSummary?.draftCount || 0) + (masterSummary?.finalizedCount || 0)})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-white text-violet-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SearchBox
          ref={searchInputRef}
          value={search}
          onChange={setSearch}
          placeholder="Search roster by driver, payment ref or method... (Ctrl+F)"
          className="max-w-md"
        />
      </div>

      {/* 3. Main Data Table */}
      <DataTable
        columns={columns}
        data={filteredSalaries}
        keyExtractor={(s) => s.id}
        emptyMessage={`No payroll records found for ${salaryPeriod}. Click "Prepare Payroll Draft" to generate.`}
      />

      {/* MODAL 1: Batch Finalize Confirmation Modal */}
      <Modal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        title="🔒 Finalize Monthly Payroll"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-950">
                Locking Historical Snapshot
              </span>
              <span>
                Finalizing will lock all draft records for <strong>{salaryPeriod}</strong>. Once finalized, individual salary totals become immutable historical records and will not be silently recalculated by subsequent trip changes.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Eligible Draft Records:</span>
              <span className="font-bold text-slate-800">{masterSummary?.draftCount || 0} Drivers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Total Net Amount:</span>
              <span className="font-extrabold text-violet-700 text-sm">
                AED {(masterSummary?.totalNetPayable || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsFinalizeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleFinalizeConfirm}>
              Confirm Finalization (Lock)
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Batch Payment Confirmation Modal */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title="💳 Record Payroll Disbursement"
        maxWidth="md"
      >
        <form onSubmit={handlePayConfirm} className="space-y-4 text-xs">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1 font-mono">
            <span className="font-bold block font-sans text-emerald-900">
              Payment Summary
            </span>
            <div className="flex justify-between">
              <span className="font-sans text-slate-600">Disbursing To:</span>
              <span className="font-bold">
                {selectedIds.length > 0
                  ? `${selectedIds.length} Selected Drivers`
                  : `${masterSummary?.eligibleDrivers || 0} Drivers (${salaryPeriod})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-600">Total Net Amount:</span>
              <span className="font-black text-emerald-700 text-sm">
                AED {(masterSummary?.totalPending || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Disbursement Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 font-mono font-bold text-slate-900 focus:outline-none transition shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Method
              </label>
              <SelectDropdown
                options={[
                  { value: 'Bank Transfer / WPS', label: 'Bank Transfer / WPS' },
                  { value: 'Cash', label: 'Cash' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Company Card', label: 'Company Card' },
                ]}
                value={paymentMethod}
                onChange={setPaymentMethod}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Payment Ref / Batch #
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. WPS-839201"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 font-mono text-slate-900 focus:outline-none transition shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Paid By / Authorized
              </label>
              <input
                type="text"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 text-slate-900 focus:outline-none transition shadow-2xs"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsPayModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm & Mark as Paid
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Audited Adjustments Dialog */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={`Audited Adjustments: ${selectedSalaryForAdj?.driverName || ''} (${salaryPeriod})`}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Header Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono">
            <div>
              <span className="font-sans font-bold text-slate-800 block text-xs">
                {selectedSalaryForAdj?.driverName}
              </span>
              <span className="text-[10px] text-slate-500 font-sans">
                Basic: AED {selectedSalaryForAdj?.basicSalary.toLocaleString()} | Trips: +AED {(selectedSalaryForAdj?.tripEarnings || 0).toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-sans uppercase">Net Payable</span>
              <span className="font-black text-emerald-700 text-sm block">
                AED {(selectedSalaryForAdj?.netSalary || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* List of Existing Adjustments */}
          <div className="space-y-2">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
              Existing Adjustments ({selectedSalaryForAdj?.adjustments?.length || 0})
            </span>

            {(!selectedSalaryForAdj?.adjustments || selectedSalaryForAdj.adjustments.length === 0) && (
              <div className="p-3 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
                No manual adjustments recorded for this driver yet.
              </div>
            )}

            {selectedSalaryForAdj?.adjustments?.map((adj) => (
              <div
                key={adj.id}
                className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      adj.adjustmentType === 'BONUS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : adj.adjustmentType === 'ADVANCE'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {adj.adjustmentType}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-800 block">{adj.reason}</span>
                    <span className="text-[10px] text-slate-400">
                      Added by {adj.createdBy || 'Admin'} on {adj.createdAt.slice(0, 10)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold ${
                      adj.adjustmentType === 'BONUS' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {adj.adjustmentType === 'BONUS' ? '+' : '-'}AED {adj.amount.toLocaleString()}
                  </span>

                  {selectedSalaryForAdj.paymentStatus === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAdjustment(adj.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Delete Adjustment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form to Add New Audited Adjustment (Only if DRAFT) */}
          {selectedSalaryForAdj?.paymentStatus === 'DRAFT' ? (
            <form onSubmit={handleAddAdjustment} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                + Add Audited Adjustment
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">
                    Adjustment Type
                  </label>
                  <SelectDropdown
                    options={[
                      { value: 'ADVANCE', label: 'Cash Advance (-)' },
                      { value: 'DEDUCTION', label: 'Deduction / Fine (-)' },
                      { value: 'BONUS', label: 'Bonus / Reward (+)' },
                    ]}
                    value={adjType}
                    onChange={(val) => setAdjType(val as any)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">
                    Amount (AED)
                  </label>
                  <input
                    type="number"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 500"
                    className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 rounded-xl px-3 font-mono font-bold text-slate-900 focus:outline-none transition shadow-2xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase">
                    Audit Reason (Required)
                  </label>
                  <input
                    type="text"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    placeholder="e.g. Cash advance on 12th"
                    className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 rounded-xl px-3 text-slate-900 focus:outline-none transition shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="primary" size="sm" type="submit">
                  Record Adjustment
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                This salary record is <strong>{selectedSalaryForAdj?.paymentStatus}</strong>. Adjustments are locked and cannot be modified.
              </span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsAdjustmentModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Single Driver Custom Process Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Manual Driver Payroll Entry"
        maxWidth="lg"
      >
        <form onSubmit={handleSingleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Driver</label>
              <SelectDropdown
                options={drivers.map((d) => ({
                  value: d.id,
                  label: d.name,
                  badge: `Basic: AED ${d.basicSalary.toLocaleString()}`,
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
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 text-xs font-semibold text-slate-900 font-mono focus:outline-none transition shadow-2xs"
                required
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-between text-xs font-medium text-sky-950">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sky-900 block text-xs">
                  Monthly Completed Trips
                </span>
                <span className="text-[11px] text-sky-700">
                  {totalTrips} Completed trips in {salaryPeriod}
                </span>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-[10px] text-sky-600 uppercase tracking-wider block font-sans">Trip Earnings</span>
              <span className="font-extrabold text-sky-800 text-sm">
                +AED {(Number(tripEarnings) || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Basic Salary (AED)</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none transition shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Trip Earnings (AED)</label>
              <input
                type="number"
                value={tripEarnings}
                onChange={(e) => setTripEarnings(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 text-xs font-bold text-sky-700 focus:outline-none transition shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Allowances (+)</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 text-xs font-bold text-emerald-600 focus:outline-none transition shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Deductions (-)</label>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 text-xs font-bold text-rose-600 focus:outline-none transition shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Advance (-)</label>
              <input
                type="number"
                value={advance}
                onChange={(e) => setAdvance(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-10 w-full bg-white border border-slate-300 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/20 rounded-xl px-3 text-xs font-bold text-amber-600 focus:outline-none transition shadow-2xs"
              />
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-emerald-900 font-bold block font-sans">Net Payable Monthly Salary:</span>
              <span className="text-[11px] text-emerald-700 font-sans">
                Basic ({basicSalary || 0}) + Trips ({tripEarnings || 0}) + Allowances ({allowances || 0}) - Deductions ({deductions || 0}) - Advance ({advance || 0})
              </span>
            </div>
            <span className="font-extrabold text-emerald-700 text-lg">AED {calculatedNet.toLocaleString()}</span>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsSingleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Payroll Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
