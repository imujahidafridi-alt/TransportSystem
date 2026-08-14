import React, { useEffect, useState } from 'react';
import { Transport, Location, Driver, Vehicle, TransportType } from '@shared/types';
import { AlertCircle, Plus } from 'lucide-react';
import { SelectDropdown } from '../common/SelectDropdown';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface TransportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initialData?: Transport | null;
  locations: Location[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onRefreshMasterData?: () => Promise<void>;
}

export const TransportFormModal: React.FC<TransportFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  locations,
  drivers,
  vehicles,
  onRefreshMasterData,
}) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [transportType, setTransportType] = useState<TransportType>('TRIP');
  const [materialName, setMaterialName] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [tons, setTons] = useState<number | ''>('');
  const [ratePerTon, setRatePerTon] = useState<number | ''>('');
  const [fixedPrice, setFixedPrice] = useState<number | ''>('');
  const [driverAllowance, setDriverAllowance] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick-Add Sub-Modal States
  const [quickLocationTarget, setQuickLocationTarget] = useState<'from' | 'to' | null>(null);
  const [quickLocationName, setQuickLocationName] = useState('');
  const [quickLocationCode, setQuickLocationCode] = useState('');

  const [isQuickVehicleOpen, setIsQuickVehicleOpen] = useState(false);
  const [quickVehicleReg, setQuickVehicleReg] = useState('');
  const [quickVehicleType, setQuickVehicleType] = useState('Trailer Truck');

  const [isQuickDriverOpen, setIsQuickDriverOpen] = useState(false);
  const [quickDriverName, setQuickDriverName] = useState('');
  const [quickDriverPhone, setQuickDriverPhone] = useState('');
  const [quickDriverSalary, setQuickDriverSalary] = useState<number | ''>('');

  const prevOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      if (initialData) {
        setDate(initialData.date);
        setTransportType(initialData.transportType);
        setMaterialName(initialData.materialName || '');
        setFromLocationId(initialData.fromLocationId);
        setToLocationId(initialData.toLocationId);
        setVehicleId(initialData.vehicleId);
        setDriverId(initialData.driverId);
        setTons(initialData.tons || '');
        setRatePerTon(initialData.ratePerTon || '');
        setFixedPrice(initialData.fixedPrice || '');
        setDriverAllowance(initialData.driverAllowance || '');
        setNotes(initialData.notes || '');
      } else {
        setDate(new Date().toISOString().slice(0, 10));
        setTransportType('TRIP');
        setMaterialName('');
        setFromLocationId(locations[0]?.id || '');
        setToLocationId(locations[1]?.id || locations[0]?.id || '');
        setVehicleId(vehicles[0]?.id || '');
        setDriverId(drivers[0]?.id || '');
        setTons('');
        setRatePerTon('');
        setFixedPrice('');
        setDriverAllowance('');
        setNotes('');
      }
      setErrorMsg(null);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialData]);

  // Handle vehicle selection: auto-bind current assigned driver
  const handleVehicleChange = (selectedVehicleId: string) => {
    setVehicleId(selectedVehicleId);
    const v = vehicles.find((item) => item.id === selectedVehicleId);
    if (v && v.currentDriverId) {
      setDriverId(v.currentDriverId);
    }
  };

  const calculatedTotal =
    transportType === 'TRIP'
      ? Number(fixedPrice || 0)
      : Number(tons || 0) * Number(ratePerTon || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fromLocationId || !toLocationId || !vehicleId || !driverId) {
      setErrorMsg('Please select a valid From Location, To Location, Vehicle, and Driver.');
      return;
    }

    if (fromLocationId === toLocationId) {
      setErrorMsg('Origin and Destination locations MUST be different.');
      return;
    }

    try {
      await onSave({
        date,
        transportType,
        materialName,
        fromLocationId,
        toLocationId,
        vehicleId,
        driverId,
        tons: transportType === 'TON' ? Number(tons) : undefined,
        ratePerTon: transportType === 'TON' ? Number(ratePerTon) : undefined,
        fixedPrice: transportType === 'TRIP' ? Number(fixedPrice) : undefined,
        driverAllowance: Number(driverAllowance || 0),
        notes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    }
  };

  // Quick-Add Handlers: Creates entity & auto-selects without losing form progress
  const handleQuickAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLocationName.trim() || !window.electronAPI) return;

    try {
      const newLoc = await window.electronAPI.createLocation({
        name: quickLocationName.trim(),
        code: quickLocationCode.trim() || undefined,
        status: 'ACTIVE',
      });
      if (onRefreshMasterData) await onRefreshMasterData();

      if (quickLocationTarget === 'from') {
        setFromLocationId(newLoc.id);
      } else if (quickLocationTarget === 'to') {
        setToLocationId(newLoc.id);
      }
      setQuickLocationName('');
      setQuickLocationCode('');
      setQuickLocationTarget(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to quick-add location');
    }
  };

  const handleQuickAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVehicleReg.trim() || !window.electronAPI) return;

    try {
      const newVeh = await window.electronAPI.createVehicle({
        registrationNumber: quickVehicleReg.trim(),
        vehicleType: quickVehicleType,
        status: 'ACTIVE',
      });
      if (onRefreshMasterData) await onRefreshMasterData();
      setVehicleId(newVeh.id);
      setQuickVehicleReg('');
      setIsQuickVehicleOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to quick-add vehicle');
    }
  };

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
      if (onRefreshMasterData) await onRefreshMasterData();
      setDriverId(newDriver.id);
      setQuickDriverName('');
      setQuickDriverPhone('');
      setIsQuickDriverOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to quick-add driver');
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialData ? 'Edit Transport Record' : 'New Transport Record (Form)'}
        maxWidth="2xl"
      >
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pricing Model</label>
              <SelectDropdown
                options={[
                  { value: 'TRIP', label: 'TRIP (Fixed Price)' },
                  { value: 'TON', label: 'TON (Weight Rate)' },
                ]}
                value={transportType}
                onChange={(val) => setTransportType(val as TransportType)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Material Name</label>
            <input
              type="text"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              placeholder="e.g. Sand, Aggregates, Steel Coils, Cement Bags..."
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">From Location</label>
                <button
                  type="button"
                  onClick={() => setQuickLocationTarget('from')}
                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Quick Add</span>
                </button>
              </div>
              <SelectDropdown
                options={locations.map((loc) => ({
                  value: loc.id,
                  label: loc.name,
                  badge: loc.code,
                }))}
                value={fromLocationId}
                onChange={setFromLocationId}
                placeholder="Select origin..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">To Location</label>
                <button
                  type="button"
                  onClick={() => setQuickLocationTarget('to')}
                  className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Quick Add</span>
                </button>
              </div>
              <SelectDropdown
                options={locations.map((loc) => ({
                  value: loc.id,
                  label: loc.name,
                  badge: loc.code,
                }))}
                value={toLocationId}
                onChange={setToLocationId}
                placeholder="Select destination..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Vehicle</label>
                <button
                  type="button"
                  onClick={() => setIsQuickVehicleOpen(true)}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 transition"
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
                onChange={handleVehicleChange}
                placeholder="Select vehicle..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Assigned Driver</label>
                <button
                  type="button"
                  onClick={() => setIsQuickDriverOpen(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Quick Add</span>
                </button>
              </div>
              <SelectDropdown
                options={drivers.map((d) => ({
                  value: d.id,
                  label: d.name,
                  badge: d.status,
                }))}
                value={driverId}
                onChange={setDriverId}
                placeholder="Select driver..."
              />
            </div>
          </div>

          {/* Pricing Model Conditional Inputs */}
          {transportType === 'TRIP' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fixed Trip Price (AED)
              </label>
              <input
                type="number"
                value={fixedPrice}
                onChange={(e) => setFixedPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Enter trip revenue in AED..."
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-slate-900 font-mono focus:outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Weight (Tons)</label>
                <input
                  type="number"
                  value={tons}
                  onChange={(e) => setTons(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter tonnage..."
                  className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-slate-900 font-mono focus:outline-none transition-all duration-200 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rate per Ton (AED)</label>
                <input
                  type="number"
                  value={ratePerTon}
                  onChange={(e) => setRatePerTon(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Enter rate per ton..."
                  className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-slate-900 font-mono focus:outline-none transition-all duration-200 shadow-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Live Total Display */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-emerald-900 font-semibold">Calculated Total Amount:</span>
            <span className="text-xl font-extrabold text-emerald-600 font-mono">
              AED {calculatedTotal.toLocaleString()}
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Save Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Add Location Sub-Modal */}
      <Modal
        isOpen={quickLocationTarget !== null}
        onClose={() => setQuickLocationTarget(null)}
        title={`Quick Add Location (${quickLocationTarget === 'from' ? 'Origin' : 'Destination'})`}
        maxWidth="md"
      >
        <form onSubmit={handleQuickAddLocation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location Name</label>
            <input
              type="text"
              value={quickLocationName}
              onChange={(e) => setQuickLocationName(e.target.value)}
              placeholder="e.g. Fujairah Quarry 3"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code / Short Reference (Optional)</label>
            <input
              type="text"
              value={quickLocationCode}
              onChange={(e) => setQuickLocationCode(e.target.value)}
              placeholder="e.g. FUJ-Q3"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition"
            />
          </div>
          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setQuickLocationTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save & Auto-Select
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
    </>
  );
};
