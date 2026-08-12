import React, { useEffect, useState } from 'react';
import { Transport, Location, Driver, Vehicle, TransportType } from '@shared/types';
import { AlertCircle } from 'lucide-react';
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
}

export const TransportFormModal: React.FC<TransportFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  locations,
  drivers,
  vehicles,
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
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
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
      setNotes(initialData.notes || '');
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setTransportType('TRIP');
      setMaterialName('');
      setFromLocationId(locations[0]?.id || '');
      setToLocationId(locations[1]?.id || '');
      setVehicleId(vehicles[0]?.id || '');
      setDriverId(drivers[0]?.id || '');
      setTons('');
      setRatePerTon('');
      setFixedPrice(3500);
      setNotes('');
    }
    setErrorMsg(null);
  }, [initialData, isOpen, locations, drivers, vehicles]);

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
        notes,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    }
  };

  return (
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">From Location</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">To Location</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Vehicle</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assigned Driver</label>
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

        {transportType === 'TRIP' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fixed Trip Price (AED)</label>
            <input
              type="number"
              value={fixedPrice}
              onChange={(e) => setFixedPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-extrabold text-slate-900 font-mono focus:outline-none transition-all duration-200 shadow-sm"
              required
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Total Tons</label>
              <input
                type="number"
                step="0.01"
                value={tons}
                onChange={(e) => setTons(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-bold text-slate-900 font-mono focus:outline-none transition-all duration-200 shadow-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rate Per Ton (AED)</label>
              <input
                type="number"
                value={ratePerTon}
                onChange={(e) => setRatePerTon(e.target.value === '' ? '' : Number(e.target.value))}
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
  );
};
