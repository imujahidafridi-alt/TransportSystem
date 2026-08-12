import React, { useEffect, useState } from 'react';
import { Transport, Location, Driver, Vehicle } from '@shared/types';
import { ExcelTransportGrid } from '../components/transports/ExcelTransportGrid';
import { TransportFormModal } from '../components/transports/TransportFormModal';
import { SearchBox } from '../components/common/SearchBox';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';

export const TransportsPage: React.FC = () => {
  const [transports, setTransports] = useState<Transport[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState<Transport | null>(null);

  const { registerAction } = useKeyboardShortcuts();

  const loadData = async () => {
    if (window.electronAPI) {
      const [tRes, lRes, dRes, vRes] = await Promise.all([
        window.electronAPI.getTransports({ search }),
        window.electronAPI.getLocations(),
        window.electronAPI.getDrivers(),
        window.electronAPI.getVehicles(),
      ]);
      setTransports(tRes.items || []);
      setLocations(lRes);
      setDrivers(dRes);
      setVehicles(vRes);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  useEffect(() => {
    const unregisterNew = registerAction('NEW_RECORD', () => {
      setEditingTransport(null);
      setIsModalOpen(true);
    });
    const unregisterSearch = registerAction('SEARCH_FOCUS', () => {
      document.getElementById('transport-search-input')?.focus();
    });
    return () => {
      unregisterNew();
      unregisterSearch();
    };
  }, [registerAction]);

  const handleSave = async (data: any) => {
    if (window.electronAPI) {
      if (editingTransport) {
        await window.electronAPI.updateTransport(editingTransport.id, data);
      } else {
        await window.electronAPI.createTransport(data);
      }
      loadData();
    }
  };

  const handleCancelTransport = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this transport? Cancelled records are kept for audit trail.')) {
      if (window.electronAPI) {
        await window.electronAPI.cancelTransport(id);
        loadData();
      }
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-3.5rem)] flex flex-col space-y-4">
      {/* Search Header Bar */}
      <div className="flex items-center justify-between gap-4 shrink-0">
        <SearchBox
          id="transport-search-input"
          value={search}
          onChange={setSearch}
          placeholder="Fast search transport #, registration, driver, or location... (Ctrl+F)"
          className="max-w-md"
        />
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 min-h-0">
        <ExcelTransportGrid
          transports={transports}
          locations={locations}
          drivers={drivers}
          vehicles={vehicles}
          onNew={() => {
            setEditingTransport(null);
            setIsModalOpen(true);
          }}
          onEdit={(t) => {
            setEditingTransport(t);
            setIsModalOpen(true);
          }}
          onCancel={handleCancelTransport}
        />
      </div>

      {/* Transport Form Modal */}
      <TransportFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        initialData={editingTransport}
        locations={locations}
        drivers={drivers}
        vehicles={vehicles}
      />
    </div>
  );
};
