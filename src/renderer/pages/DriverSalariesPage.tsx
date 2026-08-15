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
  Unlock,
  RotateCcw,
  CreditCard,
  AlertCircle,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Wallet,
  Calculator,
  DollarSign,
  Calendar,
  Sliders,
  Users,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ActionDropdown } from '../components/common/ActionDropdown';

export const DriverSalariesPage: React.FC = () => {
  const [salaries, setSalaries] = useState<DriverSalaryRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED' | 'PAID' | 'PENDING'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [masterSummary, setMasterSummary] = useState<MasterPayrollSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom UI Confirmation Modal State
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
    variant: 'danger',
    action: async () => {},
  });

  // Month-End Decided Rate per Trip State
  const [isDraftRateModalOpen, setIsDraftRateModalOpen] = useState(false);
  const [monthTripRate, setMonthTripRate] = useState<number | ''>(60);

  // Modals state
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedSalaryForPay, setSelectedSalaryForPay] = useState<DriverSalaryRecord | null>(null);

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedSalaryForAdj, setSelectedSalaryForAdj] = useState<DriverSalaryRecord | null>(null);

  // Single Driver Rate Edit State
  const [isDriverRateModalOpen, setIsDriverRateModalOpen] = useState(false);
  const [selectedSalaryForRate, setSelectedSalaryForRate] = useState<DriverSalaryRecord | null>(null);
  const [individualTripRate, setIndividualTripRate] = useState<number | ''>(60);

  // Payment Form State
  const [isPaying, setIsPaying] = useState(false);
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
  const [singleRatePerTrip, setSingleRatePerTrip] = useState<number | ''>(60);
  const [tripEarnings, setTripEarnings] = useState<number | ''>('');
  const [allowances, setAllowances] = useState<number | ''>('');
  const [deductions, setDeductions] = useState<number | ''>('');
  const [advance, setAdvance] = useState<number | ''>('');
  const [paymentStatus] = useState<SalaryPaymentStatus>('DRAFT');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const monthInputRef = useRef<HTMLInputElement>(null);
  const { registerAction } = useKeyboardShortcuts();

  useEffect(() => {
    const unregNew = registerAction(
      'NEW_RECORD',
      () => {
        handleOpenManualEntry();
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

  // Quick 1-Click Month Navigation
  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = salaryPeriod.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const nextPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSalaryPeriod(nextPeriod);
  };

  // Formatted Period Title (e.g. "August 2026")
  const formattedPeriodTitle = useMemo(() => {
    try {
      const [year, month] = salaryPeriod.split('-').map(Number);
      const date = new Date(year, month - 1, 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    } catch {
      return salaryPeriod;
    }
  }, [salaryPeriod]);

  // Recalculate and auto-populate all existing data when driver or period changes
  const fetchDriverPayrollDetails = async (selectedDriverId: string, period: string) => {
    if (!selectedDriverId || !window.electronAPI) return;
    try {
      const existing = salaries.find(
        (s) => s.driverId === selectedDriverId && s.salaryPeriod === period
      );

      const d = drivers.find((drv) => drv.id === selectedDriverId);
      const res = await window.electronAPI.calculateDriverPayroll(selectedDriverId, period);

      if (existing) {
        setBasicSalary(existing.basicSalary !== 0 ? existing.basicSalary : (d?.basicSalary || ''));
        const trips = existing.totalTrips !== undefined ? existing.totalTrips : (res.completedTrips || 0);
        setTotalTrips(trips);
        const rate = existing.ratePerTrip !== undefined && existing.ratePerTrip > 0
          ? existing.ratePerTrip
          : (existing.perTripRate || res.ratePerTrip || d?.perTripRate || 60);
        setSingleRatePerTrip(rate);
        setTripEarnings(existing.tripEarnings !== undefined && existing.tripEarnings > 0 ? existing.tripEarnings : trips * rate);
        setAllowances(existing.allowances > 0 ? existing.allowances : '');
        setDeductions(existing.deductions > 0 ? existing.deductions : '');
        setAdvance(existing.advance > 0 ? existing.advance : '');
      } else {
        setBasicSalary(res.basicSalary !== 0 ? res.basicSalary : (d?.basicSalary || ''));
        setTotalTrips(res.completedTrips || 0);
        const rate = res.ratePerTrip !== undefined && res.ratePerTrip > 0 ? res.ratePerTrip : (d?.perTripRate || 60);
        setSingleRatePerTrip(rate);
        setTripEarnings((res.completedTrips || 0) * rate);
        setAllowances('');
        setDeductions('');
        setAdvance('');
      }
    } catch (err) {
      console.error('Failed to calculate driver payroll:', err);
    }
  };

  useEffect(() => {
    if (driverId && isSingleModalOpen) {
      fetchDriverPayrollDetails(driverId, salaryPeriod);
    }
  }, [driverId, salaryPeriod, isSingleModalOpen]);

  const handleOpenManualEntry = (selectedDId?: string) => {
    const targetDriverId = selectedDId || driverId || (drivers.length > 0 ? drivers[0].id : '');
    if (targetDriverId) {
      setDriverId(targetDriverId);
      fetchDriverPayrollDetails(targetDriverId, salaryPeriod);
    }
    setIsSingleModalOpen(true);
  };

  const handleDriverChange = (dId: string) => {
    setDriverId(dId);
    fetchDriverPayrollDetails(dId, salaryPeriod);
  };

  // Update trip earnings in manual modal when singleRatePerTrip changes
  const handleSingleRateChange = (rateVal: number | '') => {
    setSingleRatePerTrip(rateVal);
    const rate = Number(rateVal) || 0;
    setTripEarnings(totalTrips * rate);
  };

  // 1. Batch Generate / Update Payroll Draft With Decided Rate per Trip
  const handleApplyMonthTripRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;
    setIsGenerating(true);
    try {
      if (salaries.length === 0) {
        await window.electronAPI.generatePayrollDraft(salaryPeriod, Number(monthTripRate || 0), 'Admin');
      } else {
        await window.electronAPI.batchUpdateTripRate(salaryPeriod, Number(monthTripRate || 0));
      }
      setIsDraftRateModalOpen(false);
      await loadData();
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Individual Driver Trip Rate Update
  const handleOpenDriverRateModal = (s: DriverSalaryRecord) => {
    setSelectedSalaryForRate(s);
    const impliedRate = s.ratePerTrip !== undefined && s.ratePerTrip > 0
      ? s.ratePerTrip
      : (s.totalTrips && s.totalTrips > 0 && s.tripEarnings ? Math.round(s.tripEarnings / s.totalTrips) : 60);
    setIndividualTripRate(impliedRate);
    setIsDriverRateModalOpen(true);
  };

  const handleSaveDriverRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalaryForRate || !window.electronAPI) return;

    await window.electronAPI.updateSalaryTripRate(selectedSalaryForRate.id, Number(individualTripRate || 0));
    setIsDriverRateModalOpen(false);
    await loadData();
  };

  // 3. Batch Finalize Payroll
  const handleFinalizeConfirm = async () => {
    if (!window.electronAPI) return;
    const idsToFinalize = selectedIds.length > 0 ? selectedIds : undefined;
    await window.electronAPI.finalizePayroll(salaryPeriod, idsToFinalize, 'Admin');
    setIsFinalizeModalOpen(false);
    await loadData();
  };

  // 4. Individual & Batch Payment Handlers
  const handleOpenIndividualPay = (s: DriverSalaryRecord) => {
    setSelectedSalaryForPay(s);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Bank Transfer / WPS');
    setPaymentReference('');
    setPaidBy('Admin');
    setIsPayModalOpen(true);
  };

  const handleOpenBatchPay = () => {
    setSelectedSalaryForPay(null);
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Bank Transfer / WPS');
    setPaymentReference('');
    setPaidBy('Admin');
    setIsPayModalOpen(true);
  };

  const handlePayConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.electronAPI) return;

    let idsToPay: string[] = [];
    if (selectedSalaryForPay) {
      idsToPay = [selectedSalaryForPay.id];
    } else if (selectedIds.length > 0) {
      idsToPay = selectedIds;
    } else {
      idsToPay = filteredSalaries.filter((s) => s.paymentStatus !== 'PAID').map((s) => s.id);
    }

    if (idsToPay.length === 0) return;

    setIsPaying(true);
    try {
      await window.electronAPI.markSalariesPaid({
        salaryRecordIds: idsToPay,
        paymentDate,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        paidBy,
      });

      setIsPayModalOpen(false);
      setSelectedSalaryForPay(null);
      setPaymentReference('');
      await loadData();
    } catch (err: any) {
      console.error('Payment disbursement failed:', err);
      alert(err?.message || 'Payment disbursement failed.');
    } finally {
      setIsPaying(false);
    }
  };

  // 5. Revert Status (Unlock / Revert Payment) & Delete Handlers via Modal Component
  const handleRevertStatus = (s: DriverSalaryRecord, targetStatus: 'DRAFT' | 'FINALIZED') => {
    const isUnlock = targetStatus === 'DRAFT';
    setConfirmConfig({
      isOpen: true,
      title: isUnlock ? 'Unlock Payroll Record' : 'Revert Payment Status',
      message: isUnlock
        ? `Are you sure you want to unlock the payroll record for ${s.driverName}? This will return it to Draft and allow you to freely edit trip rates, transports, and adjustments.`
        : `Are you sure you want to revert the payment for ${s.driverName}? This will reset the payment status to Draft so corrections can be made.`,
      confirmText: isUnlock ? 'Unlock to Draft' : 'Revert Payment',
      variant: 'warning',
      action: async () => {
        if (!window.electronAPI) return;
        await window.electronAPI.revertSalaryStatus(s.id, targetStatus);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        await loadData();
      },
    });
  };

  const handleDeleteRecord = (s: DriverSalaryRecord) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Salary Record',
      message: `Are you sure you want to permanently delete the payroll record for ${s.driverName} in ${formattedPeriodTitle}? Any manual adjustments attached will also be removed.`,
      confirmText: 'Delete Record',
      variant: 'danger',
      action: async () => {
        if (!window.electronAPI) return;
        await window.electronAPI.deleteSalaryRecord(s.id);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        await loadData();
      },
    });
  };

  const handleReopenMonthPeriod = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Reopen Entire Month Payroll',
      message: `Are you sure you want to reopen all finalized payroll records for ${formattedPeriodTitle}? This will unlock all driver records back to Draft so you can adjust rates or re-draft.`,
      confirmText: 'Reopen All Drafts',
      variant: 'warning',
      action: async () => {
        if (!window.electronAPI) return;
        await window.electronAPI.reopenPayrollPeriod(salaryPeriod);
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        await loadData();
      },
    });
  };

  // 6. Audited Adjustment Handlers
  const handleOpenAdjustment = async (s: DriverSalaryRecord) => {
    setSelectedSalaryForAdj(s);
    setAdjType('ADVANCE');
    setAdjAmount('');
    setAdjReason('');
    setIsAdjustmentModalOpen(true);

    if (window.electronAPI?.getSalaryAdjustments) {
      try {
        const adjs = await window.electronAPI.getSalaryAdjustments(s.id);
        setSelectedSalaryForAdj((prev) => (prev && prev.id === s.id ? { ...prev, adjustments: adjs } : prev));
      } catch (err) {
        console.error('Failed to load adjustments for modal:', err);
      }
    }
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
      const freshAdjs = await window.electronAPI.getSalaryAdjustments(selectedSalaryForAdj.id);
      setSelectedSalaryForAdj({ ...updated, adjustments: freshAdjs });
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
      const freshAdjs = await window.electronAPI.getSalaryAdjustments(selectedSalaryForAdj.id);
      const freshSalary = await window.electronAPI.getSalaryById(selectedSalaryForAdj.id);
      if (freshSalary) {
        setSelectedSalaryForAdj({ ...freshSalary, adjustments: freshAdjs });
      }
      await loadData();
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
      ratePerTrip: Number(singleRatePerTrip || 0),
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

      const rate = s.ratePerTrip !== undefined && s.ratePerTrip > 0
        ? s.ratePerTrip
        : ((s.totalTrips && s.totalTrips > 0 && s.tripEarnings) ? Math.round(s.tripEarnings / s.totalTrips) : 60);

      const formattedTrips = (tRes || []).map((t: any) => ({
        date: t.date,
        transportNo: t.transportNo,
        fromTo: `${t.fromLocationName || 'Origin'} → ${t.toLocationName || 'Destination'}`,
        commission: rate,
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

  const hasDrafts = (masterSummary?.draftCount || 0) > 0;
  const hasRecords = salaries.length > 0;
  const hasFinalizedOnly = hasRecords && !hasDrafts && (masterSummary?.finalizedCount || 0) > 0;

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
      header: 'Basic Salary (AED)',
      align: 'right',
      className: 'font-mono text-slate-700 font-semibold',
      render: (s) => `AED ${s.basicSalary.toLocaleString()}`,
    },
    {
      key: 'tripEarnings',
      header: 'Completed Trips & Rate',
      align: 'right',
      className: 'font-mono',
      render: (s) => {
        const rate = s.ratePerTrip !== undefined && s.ratePerTrip > 0
          ? s.ratePerTrip
          : (s.totalTrips && s.totalTrips > 0 && s.tripEarnings ? Math.round(s.tripEarnings / s.totalTrips) : 0);
        const isDraft = s.paymentStatus === 'DRAFT';
        const hasTrips = (s.totalTrips || 0) > 0;

        return (
          <div className="text-right space-y-0.5">
            <span className={`block text-xs font-black font-mono ${hasTrips ? 'text-sky-800' : 'text-slate-400'}`}>
              {hasTrips && (s.tripEarnings || 0) > 0 ? `+AED ${(s.tripEarnings || 0).toLocaleString()}` : '+AED 0'}
            </span>
            <div className="flex items-center justify-end gap-1.5 text-[10px] text-slate-500 font-sans">
              <span className="font-bold">{s.totalTrips || 0} trips</span>
              {isDraft ? (
                <button
                  type="button"
                  onClick={() => handleOpenDriverRateModal(s)}
                  className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-black hover:bg-sky-100 transition border border-sky-200 shadow-2xs cursor-pointer text-[10px]"
                  title="Click to decide/change rate"
                >
                  {rate > 0 ? `@AED ${rate}/trip` : 'Set Rate'}
                </button>
              ) : (
                rate > 0 && <span className="text-slate-400 font-mono">(@AED ${rate})</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'adjustments',
      header: 'Audited Adjustments',
      align: 'right',
      className: 'font-mono',
      render: (s) => {
        const hasBonus = (s.allowances || 0) > 0;
        const hasAdv = (s.advance || 0) > 0;
        const hasDed = (s.deductions || 0) > 0;

        if (!hasBonus && !hasAdv && !hasDed) {
          return <span className="text-slate-300 font-mono">-</span>;
        }

        return (
          <div className="text-right space-y-0.5">
            {hasBonus && (
              <span className="block text-xs font-bold text-emerald-600">
                +AED {s.allowances.toLocaleString()} (Bonus)
              </span>
            )}
            {hasAdv && (
              <span className="block text-xs font-bold text-amber-600">
                -AED {s.advance.toLocaleString()} (Adv)
              </span>
            )}
            {hasDed && (
              <span className="block text-[11px] font-bold text-rose-600">
                -AED {s.deductions.toLocaleString()} (Ded)
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'netSalary',
      header: 'Net Salary (AED)',
      align: 'right',
      className: 'font-mono text-sm whitespace-nowrap',
      render: (s) => {
        const isPaid = s.paymentStatus === 'PAID';
        return (
          <div className="text-right space-y-0.5">
            <span
              className={`font-mono font-black text-sm ${
                isPaid ? 'text-emerald-700' : 'text-slate-900'
              }`}
            >
              AED {s.netSalary.toLocaleString()}
            </span>
            {isPaid ? (
              <span className="block text-[10px] font-bold text-emerald-600">
                ✓ Disbursed
              </span>
            ) : (
              <span className="block text-[10px] font-medium text-amber-600">
                ● Pending Payout
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      align: 'center',
      render: (s) => (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-tight shadow-2xs ${
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
        const isPaid = s.paymentStatus === 'PAID';
        const isFinalized = s.paymentStatus === 'FINALIZED';

        return (
          <div className="flex items-center justify-end gap-2 whitespace-nowrap relative">
            {/* 1. Primary Action: Pay (Full rounded-full pill) */}
            {!isPaid && (
              <Button
                onClick={() => handleOpenIndividualPay(s)}
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-3.5 text-[11px] shadow-2xs"
                icon={<CreditCard className="w-3.5 h-3.5" />}
                title={`Disburse payment to ${s.driverName}`}
              >
                Pay
              </Button>
            )}

            {/* 2. Audited Adjustments Action: Full rounded-full outline button */}
            <Button
              onClick={() => handleOpenAdjustment(s)}
              variant="outline"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold border-violet-200 text-violet-700 hover:bg-violet-50 shadow-2xs"
              icon={<Sliders className="w-3.5 h-3.5 text-violet-600" />}
              title={isPaid ? 'View Adjustments (Paid)' : 'Add / View Audited Adjustments'}
            >
              Adjust
            </Button>

            {/* 3. Document Action: Payslip (Full rounded-full outline button) */}
            <Button
              onClick={() => handlePrintDriverLedger(s)}
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-[11px] font-bold shadow-2xs"
              icon={<Printer className="w-3.5 h-3.5 text-slate-600" />}
              title="Print A4 Driver Payslip & Ledger"
            >
              Payslip
            </Button>

            {/* 4. Action Dropdown matching SelectDropdown architecture */}
            <ActionDropdown
              align="right"
              direction="auto"
              items={[
                {
                  id: 'edit',
                  label: 'Edit Record Details',
                  icon: <Edit className="w-3.5 h-3.5 text-slate-400" />,
                  onClick: () => handleOpenManualEntry(s.driverId),
                },
                {
                  id: 'unlock',
                  label: 'Unlock to Draft',
                  icon: <Unlock className="w-3.5 h-3.5 text-amber-500" />,
                  variant: 'warning',
                  disabled: !isFinalized,
                  onClick: () => handleRevertStatus(s, 'DRAFT'),
                },
                {
                  id: 'revert-pay',
                  label: 'Revert Payment',
                  icon: <RotateCcw className="w-3.5 h-3.5 text-amber-500" />,
                  variant: 'warning',
                  disabled: !isPaid,
                  onClick: () => handleRevertStatus(s, 'DRAFT'),
                },
                {
                  id: 'delete',
                  label: 'Delete Record',
                  icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
                  variant: 'danger',
                  onClick: () => handleDeleteRecord(s),
                },
              ]}
            />
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-4">
      {/* 1. Unified Master Header & Action Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3.5">
          {/* Unified Enterprise Month Navigator (Fully rounded pills) */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="w-7 h-7 rounded-full bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Central Interactive Month Badge */}
              <div
                onClick={() => monthInputRef.current?.showPicker?.()}
                className="px-3.5 py-1 flex items-center gap-2 cursor-pointer hover:bg-white/80 rounded-full transition"
                title="Click to select specific month"
              >
                <Calendar className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-xs font-black text-slate-900 tracking-tight">
                  {formattedPeriodTitle}
                </span>

                {/* Hidden Native Picker Attached for Direct Clicking */}
                <input
                  ref={monthInputRef}
                  type="month"
                  value={salaryPeriod}
                  onChange={(e) => setSalaryPeriod(e.target.value)}
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
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-800">{masterSummary?.workingDrivers || 0}</span> active drivers
              <span className="text-slate-300">·</span>
              <span className="font-bold text-slate-800">{masterSummary?.completedTrips || 0}</span> trips completed
            </div>
          </div>

          {/* Standardized Cohesive Top Action Bar (All buttons full rounded) */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!hasRecords ? (
              <Button
                onClick={() => setIsDraftRateModalOpen(true)}
                isLoading={isGenerating}
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-4 h-4 text-white" />}
                className="btn-primary-gradient shadow-xs"
              >
                Prepare {formattedPeriodTitle} Draft
              </Button>
            ) : hasDrafts ? (
              <>
                <Button
                  onClick={() => setIsFinalizeModalOpen(true)}
                  variant="primary"
                  size="sm"
                  icon={<Lock className="w-4 h-4 text-white" />}
                  className="btn-primary-gradient shadow-xs"
                  title="Lock drafted payroll into immutable historical snapshot"
                >
                  Finalize Payroll ({masterSummary?.draftCount} Drafts)
                </Button>

                <Button
                  onClick={() => setIsDraftRateModalOpen(true)}
                  isLoading={isGenerating}
                  variant="outline"
                  size="sm"
                  className="border-violet-200 text-violet-700 hover:bg-violet-50"
                  icon={<DollarSign className="w-4 h-4 text-violet-600" />}
                  title="Decide baseline trip rate for all draft drivers in this month"
                >
                  Decide Month Trip Rate
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleOpenBatchPay}
                  variant="primary"
                  size="sm"
                  icon={<CreditCard className="w-4 h-4 text-white" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  title="Disburse payments and record WPS / Bank Transfer audit metadata"
                >
                  {selectedIds.length > 0
                    ? `Mark ${selectedIds.length} Selected Paid`
                    : `Mark ${masterSummary?.finalizedCount || 0} Finalized as Paid`}
                </Button>

                {hasFinalizedOnly && (
                  <Button
                    onClick={handleReopenMonthPeriod}
                    variant="outline"
                    size="sm"
                    className="border-amber-200 text-amber-700 hover:bg-amber-50"
                    icon={<Unlock className="w-4 h-4 text-amber-600" />}
                    title="Unlock and reopen all finalized drafts for this month to correct mistakes"
                  >
                    Reopen Drafts
                  </Button>
                )}
              </>
            )}

            {/* Manual Entry Secondary Option */}
            <Button
              onClick={() => handleOpenManualEntry()}
              variant="secondary"
              size="sm"
              icon={<Plus className="w-4 h-4 text-slate-600" />}
              title="Single Driver Payroll Entry (Ctrl+N)"
            >
              Manual Entry
            </Button>
          </div>
        </div>

        {/* 2. Refined Financial KPI Hero Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Base Salaries */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/90 rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Base Salaries
              </span>
              <div className="w-6 h-6 rounded-lg bg-slate-200/70 text-slate-600 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="font-mono font-black text-slate-900 text-base block">
                AED {(masterSummary?.totalBasicSalary || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Contracted base pay</span>
            </div>
          </div>

          {/* + Trip Earnings */}
          <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
                <span>+</span> Trip Earnings
              </span>
              <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="font-mono font-black text-sky-950 text-base block">
                +AED {(masterSummary?.totalTripEarnings || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-sky-600 font-medium">
                {masterSummary?.completedTrips || 0} completed trips
              </span>
            </div>
          </div>

          {/* + Audited Bonuses */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <span>+</span> Audited Bonuses
              </span>
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="font-mono font-black text-emerald-950 text-base block">
                +AED {(masterSummary?.totalAllowances || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">Rewards & incentives</span>
            </div>
          </div>

          {/* - Deductions / Advances */}
          <div className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <span>-</span> Advances & Deductions
              </span>
              <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 rotate-180" />
              </div>
            </div>
            <div>
              <span className="font-mono font-black text-rose-950 text-base block">
                -AED {((masterSummary?.totalDeductions || 0) + (masterSummary?.totalAdvances || 0)).toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-600 font-medium">Cash advances & fines</span>
            </div>
          </div>

          {/* = Dynamic Total Disbursed / Payroll Hero Card */}
          {(() => {
            const isAllPaid = salaries.length > 0 && (masterSummary?.paidCount || 0) === salaries.length;
            const pendingCount = (masterSummary?.draftCount || 0) + (masterSummary?.finalizedCount || 0);
            const totalPaid = masterSummary?.totalPaid || 0;
            const totalPending = masterSummary?.totalPending || 0;

            return (
              <div
                className={`p-3.5 text-white rounded-2xl flex flex-col justify-between col-span-2 lg:col-span-1 shadow-md ${
                  isAllPaid
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-700'
                    : 'bg-gradient-to-br from-violet-600 to-indigo-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                    {isAllPaid ? 'Total Disbursed (Paid)' : 'Total Payroll'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/20 text-white backdrop-blur-xs">
                    {isAllPaid
                      ? `✓ All ${salaries.length} Paid`
                      : `${masterSummary?.paidCount || 0} Paid · ${pendingCount} Pending`}
                  </span>
                </div>
                <div>
                  <span className="font-mono font-black text-white text-base block">
                    AED {(isAllPaid ? totalPaid : (masterSummary?.totalNetPayable || 0)).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-white/80 font-medium">
                    {isAllPaid
                      ? `${salaries.length} drivers fully disbursed`
                      : `AED ${totalPaid.toLocaleString()} Paid · AED ${totalPending.toLocaleString()} Pending`}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 3. Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Filter Tabs (Fully rounded pills) */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-full border border-slate-200/80 text-xs shadow-2xs">
          {[
            { id: 'ALL', label: 'All', count: salaries.length },
            { id: 'DRAFT', label: 'Draft', count: masterSummary?.draftCount || 0 },
            { id: 'FINALIZED', label: 'Finalized', count: masterSummary?.finalizedCount || 0 },
            { id: 'PAID', label: 'Paid', count: masterSummary?.paidCount || 0 },
            { id: 'PENDING', label: 'Pending Payout', count: (masterSummary?.draftCount || 0) + (masterSummary?.finalizedCount || 0) },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-white text-violet-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  statusFilter === tab.id
                    ? 'bg-violet-100 text-violet-800'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
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

      {/* 4. Main Data Table with Rich Guided Empty State */}
      <DataTable
        columns={columns}
        data={filteredSalaries}
        keyExtractor={(s) => s.id}
        emptyState={
          <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3.5 max-w-md mx-auto select-none animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-3xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-sm">
              <Calculator className="w-8 h-8 text-violet-600" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                No Payroll Draft for {formattedPeriodTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Count all completed transports in {formattedPeriodTitle}, decide month-end trip rates per driver, and generate the draft in 1 click.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <Button
                onClick={() => setIsDraftRateModalOpen(true)}
                isLoading={isGenerating}
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-4 h-4 text-white" />}
                className="btn-primary-gradient shadow-xs"
              >
                Prepare {formattedPeriodTitle} Payroll Draft
              </Button>
              <Button
                onClick={() => handleOpenManualEntry()}
                variant="secondary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
              >
                Manual Entry
              </Button>
            </div>
          </div>
        }
      />

      {/* MODAL 0: Month-End Baseline Rate Decider */}
      <Modal
        isOpen={isDraftRateModalOpen}
        onClose={() => setIsDraftRateModalOpen(false)}
        title={`Set Trip Rate: ${formattedPeriodTitle}`}
        maxWidth="md"
      >
        <form onSubmit={handleApplyMonthTripRate} className="space-y-4 text-xs">
          {/* Activity Overview 2-Card Metric Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-medium block truncate">Active Drivers</span>
                <span className="text-base font-black text-slate-900 font-mono">
                  {masterSummary?.workingDrivers || 0}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-violet-50/70 border border-violet-200/70 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-violet-700 font-medium block truncate">Completed Trips</span>
                <span className="text-base font-black text-violet-950 font-mono">
                  {masterSummary?.completedTrips || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Rate Input Card with Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Trip Rate for {formattedPeriodTitle} (AED)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
            </div>

            <div className="relative">
              <input
                type="number"
                value={monthTripRate}
                onChange={(e) => setMonthTripRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-12 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl pl-4 pr-28 text-base font-mono font-black text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-extrabold text-violet-700 font-mono shadow-2xs pointer-events-none">
                AED / Trip
              </div>
            </div>

            {/* Quick Rate Preset Buttons */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[50, 60, 75, 80, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMonthTripRate(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all duration-150 border ${
                    monthTripRate === preset
                      ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  AED {preset}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              Applies to all draft drivers for this month. You can also customize individual driver rates after.
            </p>
          </div>

          {/* Real-Time Total Calculated Earnings Banner */}
          <div className="p-3.5 bg-gradient-to-r from-violet-50/80 via-indigo-50/60 to-purple-50/80 border border-violet-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">Total Calculated Trip Payout</span>
              <span className="text-[11px] text-slate-500 font-medium font-mono">
                {masterSummary?.completedTrips || 0} trips × AED {monthTripRate || 0}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-emerald-600">
                +AED {((masterSummary?.completedTrips || 0) * (Number(monthTripRate) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setIsDraftRateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isGenerating}
              icon={<Zap className="w-4 h-4" />}
            >
              Apply Rate (AED {monthTripRate || 0} / Trip)
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 0.5: Single Driver Month-End Rate Customizer */}
      <Modal
        isOpen={isDriverRateModalOpen}
        onClose={() => setIsDriverRateModalOpen(false)}
        title={`Set Trip Rate: ${selectedSalaryForRate?.driverName || ''} (${formattedPeriodTitle})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveDriverRate} className="space-y-4 text-xs">
          {/* Driver Context Info Card */}
          <div className="p-3.5 bg-sky-50/70 border border-sky-200/70 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Completed in {formattedPeriodTitle}</span>
                <span className="text-base font-black text-sky-950 font-mono">
                  {selectedSalaryForRate?.totalTrips || 0} Trips
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200 font-mono">
              {selectedSalaryForRate?.driverName}
            </span>
          </div>

          {/* Rate Input Card with Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                Rate per Trip for {selectedSalaryForRate?.driverName} (AED)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
            </div>

            <div className="relative">
              <input
                type="number"
                value={individualTripRate}
                onChange={(e) => setIndividualTripRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-12 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl pl-4 pr-28 text-base font-mono font-black text-slate-900 focus:outline-none transition-all duration-200 shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-extrabold text-violet-700 font-mono shadow-2xs pointer-events-none">
                AED / Trip
              </div>
            </div>

            {/* Quick Rate Preset Buttons */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[50, 60, 75, 85, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setIndividualTripRate(preset)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold transition-all duration-150 border ${
                    individualTripRate === preset
                      ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  AED {preset}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 font-medium">
              This rate applies specifically to {selectedSalaryForRate?.driverName} for {formattedPeriodTitle}.
            </p>
          </div>

          {/* Real-Time Total Calculated Earnings Banner */}
          <div className="p-3.5 bg-gradient-to-r from-sky-50/80 via-indigo-50/60 to-violet-50/80 border border-sky-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">Calculated Driver Trip Payout</span>
              <span className="text-[11px] text-slate-500 font-medium font-mono">
                {selectedSalaryForRate?.totalTrips || 0} trips × AED {individualTripRate || 0}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-emerald-600">
                +AED {((selectedSalaryForRate?.totalTrips || 0) * (Number(individualTripRate) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setIsDriverRateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              icon={<CheckCircle2 className="w-4 h-4" />}
            >
              Save Driver Rate
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 1: Batch Finalize Confirmation Modal */}
      <Modal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        title="Finalize Monthly Payroll"
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
                Finalizing will lock all draft records for <strong>{formattedPeriodTitle}</strong>. Once finalized, rates and individual salary totals become immutable historical records.
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

      {/* MODAL 2: Payment Disbursement Modal (Individual or Batch) */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setSelectedSalaryForPay(null);
        }}
        title={`Record Payment Disbursement: ${selectedSalaryForPay ? selectedSalaryForPay.driverName : formattedPeriodTitle}`}
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
                {selectedSalaryForPay
                  ? `${selectedSalaryForPay.driverName} (${selectedSalaryForPay.salaryPeriod})`
                  : selectedIds.length > 0
                  ? `${selectedIds.length} Selected Drivers`
                  : `${masterSummary?.eligibleDrivers || 0} Drivers (${formattedPeriodTitle})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-600">Total Net Amount:</span>
              <span className="font-black text-emerald-700 text-sm">
                AED {selectedSalaryForPay ? selectedSalaryForPay.netSalary.toLocaleString() : (masterSummary?.totalPending || 0).toLocaleString()}
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
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={isPaying}
              onClick={() => {
                setIsPayModalOpen(false);
                setSelectedSalaryForPay(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isPaying}>
              Confirm & Mark as Paid
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Audited Adjustments Dialog */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={`Audited Adjustments: ${selectedSalaryForAdj?.driverName || ''} (${formattedPeriodTitle})`}
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Header Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between font-mono">
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
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
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

                  {selectedSalaryForAdj.paymentStatus !== 'PAID' && (
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

          {/* Form to Add New Audited Adjustment */}
          {selectedSalaryForAdj?.paymentStatus !== 'PAID' ? (
            <form onSubmit={handleAddAdjustment} className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
              <span className="font-bold text-slate-800 block text-xs">
                + Add Audited Adjustment
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
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

                <div className="sm:col-span-3">
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

                <div className="sm:col-span-5">
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
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                This salary record is <strong>PAID</strong>. Revert payment status if you need to modify adjustments.
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

      {/* MODAL 4: Single Driver Custom Process / Edit Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Driver Payroll Entry & Editor"
        maxWidth="xl"
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

          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between text-xs font-medium text-sky-950">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-sky-900 block text-xs">
                  Monthly Completed Transports
                </span>
                <span className="text-[11px] text-sky-700">
                  {totalTrips} Completed trips in {formattedPeriodTitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-sky-800 uppercase font-sans">
                Decided Rate / Trip:
              </label>
              <input
                type="number"
                value={singleRatePerTrip}
                onChange={(e) => handleSingleRateChange(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="60"
                className="h-8 w-20 bg-white border border-sky-300 rounded-lg px-2 text-xs font-mono font-black text-sky-900 text-right focus:outline-none focus:border-sky-600"
              />
              <span className="font-mono text-xs text-sky-800 font-bold">AED</span>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Trip Earnings ({totalTrips} × AED {singleRatePerTrip || 0})</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-sans">Bonus / Reward (+)</label>
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
                Basic ({basicSalary || 0}) + Trips ({tripEarnings || 0}) + Bonus ({allowances || 0}) - Deductions ({deductions || 0}) - Advance ({advance || 0})
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

      {/* Reusable UI Confirmation Modal */}
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
