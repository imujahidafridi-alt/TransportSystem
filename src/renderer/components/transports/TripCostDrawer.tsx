import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Transport, TripCostSummary } from '@shared/types';
import {
  X,
  Fuel,
  Receipt,
  AlertTriangle,
  Wrench,
  Package,
  TrendingUp,
  Truck,
  Save,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../common/Button';

interface TripCostDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transport: Transport | null;
  onCostsSaved?: () => void;
}

export const TripCostDrawer: React.FC<TripCostDrawerProps> = ({
  isOpen,
  onClose,
  transport,
  onCostsSaved,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Focus ref for fastest data entry
  const fuelQtyInputRef = useRef<HTMLInputElement>(null);

  // Accordion toggle states for secondary costs
  const [showFines, setShowFines] = useState(false);
  const [showMaint, setShowMaint] = useState(false);
  const [showOther, setShowOther] = useState(false);

  // Fuel State
  const [fuelQuantity, setFuelQuantity] = useState<number | ''>('');
  const [fuelRate, setFuelRate] = useState<number | ''>('');
  const [fuelTotal, setFuelTotal] = useState<number | ''>('');
  const [fuelVendor, setFuelVendor] = useState('');
  const [fuelOdometer, setFuelOdometer] = useState<number | ''>('');

  // Toll / Salik State
  const [tollAmount, setTollAmount] = useState<number | ''>('');
  const [tollDescription, setTollDescription] = useState('');

  // Traffic Fine State
  const [fineAmount, setFineAmount] = useState<number | ''>('');
  const [fineDescription, setFineDescription] = useState('');
  const [fineReference, setFineReference] = useState('');

  // Trip Maintenance State
  const [maintAmount, setMaintAmount] = useState<number | ''>('');
  const [maintDescription, setMaintDescription] = useState('');
  const [maintVendor, setMaintVendor] = useState('');

  // Other Direct Cost State
  const [otherAmount, setOtherAmount] = useState<number | ''>('');
  const [otherDescription, setOtherDescription] = useState('');

  // Fetch linked costs whenever drawer opens for a transport
  useEffect(() => {
    if (!isOpen || !transport || !window.electronAPI) return;

    setSaveSuccess(false);
    setIsLoading(true);

    window.electronAPI
      .getTripCosts(transport.id)
      .then((res: TripCostSummary) => {
        if (res.fuel) {
          setFuelQuantity(res.fuel.quantity || '');
          setFuelRate(res.fuel.rate || '');
          setFuelTotal(res.fuel.totalAmount || '');
          setFuelVendor(res.fuel.vendor || '');
          setFuelOdometer(res.fuel.odometer ?? '');
        } else {
          setFuelQuantity('');
          setFuelRate('');
          setFuelTotal('');
          setFuelVendor('');
          setFuelOdometer('');
        }

        if (res.toll) {
          setTollAmount(res.toll.amount || '');
          setTollDescription(res.toll.description || '');
        } else {
          setTollAmount('');
          setTollDescription('');
        }

        if (res.fine && res.fine.amount > 0) {
          setFineAmount(res.fine.amount);
          setFineDescription(res.fine.description || '');
          setFineReference(res.fine.reference || '');
          setShowFines(true);
        } else {
          setFineAmount('');
          setFineDescription('');
          setFineReference('');
          setShowFines(false);
        }

        if (res.maintenance && res.maintenance.amount > 0) {
          setMaintAmount(res.maintenance.amount);
          setMaintDescription(res.maintenance.description || '');
          setMaintVendor(res.maintenance.vendor || '');
          setShowMaint(true);
        } else {
          setMaintAmount('');
          setMaintDescription('');
          setMaintVendor('');
          setShowMaint(false);
        }

        if (res.other && res.other.amount > 0) {
          setOtherAmount(res.other.amount);
          setOtherDescription(res.other.description || '');
          setShowOther(true);
        } else {
          setOtherAmount('');
          setOtherDescription('');
          setShowOther(false);
        }
      })
      .catch((err: any) => {
        console.error('Failed to load trip costs:', err);
      })
      .finally(() => {
        setIsLoading(false);
        setTimeout(() => {
          fuelQtyInputRef.current?.focus();
        }, 100);
      });
  }, [isOpen, transport]);

  // Live Auto-Calculation of Fuel Total
  const handleFuelQtyChange = useCallback((val: number | '') => {
    setFuelQuantity(val);
    if (val !== '' && fuelRate !== '') {
      setFuelTotal(parseFloat((Number(val) * Number(fuelRate)).toFixed(2)));
    } else if (val === '') {
      setFuelTotal('');
    }
  }, [fuelRate]);

  const handleFuelRateChange = useCallback((val: number | '') => {
    setFuelRate(val);
    if (val !== '' && fuelQuantity !== '') {
      setFuelTotal(parseFloat((Number(fuelQuantity) * Number(val)).toFixed(2)));
    }
  }, [fuelQuantity]);

  const handleQuickSalikAdd = useCallback((add: number) => {
    setTollAmount((prev) => Number(prev || 0) + add);
  }, []);

  // Performance-optimized memoized financial calculations
  const numFuel = Number(fuelTotal || 0);
  const numToll = Number(tollAmount || 0);
  const numFine = Number(fineAmount || 0);
  const numMaint = Number(maintAmount || 0);
  const numOther = Number(otherAmount || 0);

  const { totalDirectCosts, tripRevenue, directTripProfit, contributionMarginPercent } =
    useMemo(() => {
      const total = numFuel + numToll + numFine + numMaint + numOther;
      const rev = transport?.totalAmount || 0;
      const profit = rev - total;
      const margin = rev > 0 ? parseFloat(((profit / rev) * 100).toFixed(1)) : 0;
      return {
        totalDirectCosts: total,
        tripRevenue: rev,
        directTripProfit: profit,
        contributionMarginPercent: margin,
      };
    }, [numFuel, numToll, numFine, numMaint, numOther, transport?.totalAmount]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!transport || !window.electronAPI) return;

    setIsSaving(true);
    try {
      await window.electronAPI.saveTripCosts({
        transportId: transport.id,
        fuel:
          numFuel > 0
            ? {
                quantity: Number(fuelQuantity || 0),
                rate: Number(fuelRate || (numFuel && fuelQuantity ? numFuel / Number(fuelQuantity) : 0)),
                totalAmount: numFuel,
                vendor: fuelVendor.trim() || undefined,
                odometer: fuelOdometer !== '' ? Number(fuelOdometer) : undefined,
              }
            : null,
        toll:
          numToll > 0
            ? {
                amount: numToll,
                description: tollDescription.trim() || 'Salik / Toll Gate',
              }
            : null,
        fine:
          numFine > 0
            ? {
                amount: numFine,
                description: fineDescription.trim() || 'Traffic Fine',
                reference: fineReference.trim() || undefined,
              }
            : null,
        maintenance:
          numMaint > 0
            ? {
                amount: numMaint,
                description: maintDescription.trim() || 'Emergency Repair',
                vendor: maintVendor.trim() || undefined,
              }
            : null,
        other:
          numOther > 0
            ? {
                amount: numOther,
                description: otherDescription.trim() || 'Other Direct Cost',
              }
            : null,
      });

      setSaveSuccess(true);
      if (onCostsSaved) onCostsSaved();
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (err: any) {
      alert(err.message || 'Failed to save trip costs');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut listener inside drawer
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !transport) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999] overflow-hidden flex justify-end select-none animate-in fade-in duration-150"
      onKeyDown={handleKeyDown}
    >
      {/* Full-Window Modern Backdrop covering Header + Sidebar + Main */}
      <div
        className="fixed inset-0 bg-slate-900/35 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Sliding Sheet Panel */}
      <aside className="relative w-full max-w-xl bg-[#F8FAFC] h-full shadow-2xl z-10 flex flex-col overflow-hidden border-l border-slate-200/90 animate-in slide-in-from-right duration-200">
        
        {/* Modern Compact Header */}
        <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded text-xs">
                  {transport.transportNo}
                </span>
                <h2 className="text-sm font-extrabold text-slate-900 truncate">
                  Direct Trip Costs
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span>{transport.fromLocationName || 'Origin'}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{transport.toLocationName || 'Destination'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transport Context Key Metrics Strip */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200/80 text-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              <Truck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-mono font-bold text-slate-900">
                {transport.vehicleRegistration || 'Vehicle'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate max-w-[120px] font-medium">{transport.driverName || 'Driver'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Revenue:</span>
            <span className="font-mono font-extrabold text-emerald-600 text-sm">
              AED {tripRevenue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Hardware-Accelerated Smooth-Scroll Form Body */}
        <form onSubmit={handleSave} className="flex-1 smooth-scroll px-4 py-3 space-y-2.5">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-semibold flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading trip ledger...</span>
            </div>
          ) : (
            <>
              {/* 1. Primary Section: Trip Fuel */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3 space-y-2 hover:border-sky-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center border border-sky-200">
                      <Fuel className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Trip Fuel Expense
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    AED {numFuel.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Liters
                    </label>
                    <input
                      ref={fuelQtyInputRef}
                      type="number"
                      value={fuelQuantity}
                      onChange={(e) =>
                        handleFuelQtyChange(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="e.g. 250"
                      className="h-10 w-full bg-white border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Rate / L (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fuelRate}
                      onChange={(e) =>
                        handleFuelRateChange(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="3.40"
                      className="h-10 w-full bg-white border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Total Fuel (AED)
                    </label>
                    <input
                      type="number"
                      value={fuelTotal}
                      onChange={(e) =>
                        setFuelTotal(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="0"
                      className="h-10 w-full bg-sky-50/70 border border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3 text-xs font-mono font-black text-sky-900 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Fuel Station / Vendor
                    </label>
                    <input
                      type="text"
                      value={fuelVendor}
                      onChange={(e) => setFuelVendor(e.target.value)}
                      placeholder="e.g. ENOC JAFZA, ADNOC Oasis"
                      className="h-10 w-full bg-white border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl px-3 text-xs text-slate-800 font-medium focus:outline-none transition shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Odometer (KM)</span>
                      <span className="text-[9px] text-sky-600 font-bold lowercase">2-way linked</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={fuelOdometer}
                        onChange={(e) =>
                          setFuelOdometer(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        placeholder="e.g. 145000"
                        className="h-10 w-full bg-white border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl pl-3 pr-10 text-xs font-mono font-bold text-slate-900 focus:outline-none transition shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-mono pointer-events-none">
                        KM
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Primary Section: Salik & Tolls */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 hover:border-amber-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
                      <Receipt className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Salik / Toll Gates
                    </span>
                  </div>
                  <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    AED {numToll.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Toll Amount (AED)
                    </label>
                    <input
                      type="number"
                      value={tollAmount}
                      onChange={(e) =>
                        setTollAmount(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder="0"
                      className="h-10 w-full bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Quick Add Salik
                    </label>
                    <div className="flex items-center gap-1.5 h-10">
                      {[4, 8, 16, 20].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleQuickSalikAdd(val)}
                          className="flex-1 h-full rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-mono font-bold transition active:scale-95 shadow-2xs"
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Secondary Section: Collapsible Exceptions */}
              <div className="space-y-2 pt-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Additional Direct Expenses (Optional)
                </span>

                {/* Traffic Fine Accordion */}
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowFines(!showFines)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5.5 h-5.5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200">
                        <AlertTriangle className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        Traffic Fine
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {numFine > 0 && (
                        <span className="font-mono font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          AED {numFine.toLocaleString()}
                        </span>
                      )}
                      {showFines ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {showFines && (
                    <div className="p-3.5 pt-1 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Fine Amount (AED)
                        </label>
                        <input
                          type="number"
                          value={fineAmount}
                          onChange={(e) =>
                            setFineAmount(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          placeholder="0"
                          className="h-10 w-full bg-white border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Ticket # / Reference
                        </label>
                        <input
                          type="text"
                          value={fineReference}
                          onChange={(e) => setFineReference(e.target.value)}
                          placeholder="Violation Ref"
                          className="h-10 w-full bg-white border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 rounded-xl px-3 text-xs text-slate-800 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Emergency Trip Maintenance Accordion */}
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowMaint(!showMaint)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5.5 h-5.5 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center border border-orange-200">
                        <Wrench className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        Trip Maintenance / Tyre Patch
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {numMaint > 0 && (
                        <span className="font-mono font-bold text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          AED {numMaint.toLocaleString()}
                        </span>
                      )}
                      {showMaint ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {showMaint && (
                    <div className="p-3.5 pt-1 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Repair Cost (AED)
                        </label>
                        <input
                          type="number"
                          value={maintAmount}
                          onChange={(e) =>
                            setMaintAmount(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          placeholder="0"
                          className="h-10 w-full bg-white border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Repair Details
                        </label>
                        <input
                          type="text"
                          value={maintDescription}
                          onChange={(e) => setMaintDescription(e.target.value)}
                          placeholder="Tyre puncture patch"
                          className="h-10 w-full bg-white border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 rounded-xl px-3 text-xs text-slate-800 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Other Direct Costs Accordion */}
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowOther(!showOther)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5.5 h-5.5 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center border border-purple-200">
                        <Package className="w-3 h-3" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        Other Direct Costs (Port/Gate)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {numOther > 0 && (
                        <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          AED {numOther.toLocaleString()}
                        </span>
                      )}
                      {showOther ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {showOther && (
                    <div className="p-3.5 pt-1 border-t border-slate-100 grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Amount (AED)
                        </label>
                        <input
                          type="number"
                          value={otherAmount}
                          onChange={(e) =>
                            setOtherAmount(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          placeholder="0"
                          className="h-10 w-full bg-white border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={otherDescription}
                          onChange={(e) => setOtherDescription(e.target.value)}
                          placeholder="Weighbridge / Gate Pass"
                          className="h-10 w-full bg-white border border-slate-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-3 text-xs text-slate-800 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Real-time Contribution & Direct Profitability Card */}
              <div className="bg-white border-2 border-violet-200/80 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
                    <span>Direct Trip Profit & Margin</span>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                      directTripProfit >= 0
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {contributionMarginPercent}% Margin
                  </span>
                </div>

                {/* Profitability Metric Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-slate-50 border border-slate-200/80 rounded-xl">
                    <span className="text-[10px] text-slate-500 block font-semibold">Gross Revenue</span>
                    <span className="font-mono font-bold text-xs text-slate-900">
                      AED {tripRevenue.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2 bg-rose-50/60 border border-rose-200/80 rounded-xl">
                    <span className="text-[10px] text-rose-600 block font-semibold">Direct Costs</span>
                    <span className="font-mono font-bold text-xs text-rose-700">
                      AED {totalDirectCosts.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2 bg-emerald-50/80 border border-emerald-200/80 rounded-xl">
                    <span className="text-[10px] text-emerald-700 block font-semibold">Trip Profit</span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        directTripProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      AED {directTripProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer Actions with Keyboard Hint */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel (Esc)
          </Button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved!</span>
              </span>
            )}
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleSave()}
              disabled={isSaving}
              icon={<Save className="w-4 h-4" />}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save Trip Costs (Ctrl+S)'}
            </Button>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
};
