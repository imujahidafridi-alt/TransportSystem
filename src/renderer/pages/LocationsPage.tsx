import React, { useEffect, useState } from 'react';
import { Location, EntityStatus } from '@shared/types';
import { Plus, MapPin, Edit, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useKeyboardShortcuts } from '../context/KeyboardShortcutContext';
import { SearchBox } from '../components/common/SearchBox';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const LocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<EntityStatus>('ACTIVE');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { registerAction } = useKeyboardShortcuts();

  const loadLocations = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.getLocations(search);
      setLocations(res);
    }
  };

  useEffect(() => {
    loadLocations();
  }, [search]);

  useEffect(() => {
    const unregisterNew = registerAction('NEW_RECORD', () => {
      setEditingLoc(null);
      setName('');
      setCode('');
      setStatus('ACTIVE');
      setNotes('');
      setErrorMsg(null);
      setIsModalOpen(true);
    });
    const unregisterSearch = registerAction('SEARCH_FOCUS', () => {
      document.getElementById('location-search-input')?.focus();
    });
    return () => {
      unregisterNew();
      unregisterSearch();
    };
  }, [registerAction]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) return;

    try {
      if (editingLoc) {
        await window.electronAPI.updateLocation(editingLoc.id, {
          name: name.trim(),
          code: code.trim() || undefined,
          status,
          notes,
        });
      } else {
        await window.electronAPI.createLocation({
          name: name.trim(),
          code: code.trim() || undefined,
          status,
          notes,
        });
      }
      setIsModalOpen(false);
      loadLocations();
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    }
  };

  const columns: Column<Location>[] = [
    {
      key: 'name',
      header: 'Location Name',
      className: 'font-semibold text-slate-900',
      render: (loc) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <span>{loc.name}</span>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'Short Code',
      className: 'font-mono font-bold text-violet-700',
      render: (loc) => loc.code || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (loc) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            loc.status === 'ACTIVE'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {loc.status === 'ACTIVE' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {loc.status}
        </span>
      ),
    },
    {
      key: 'notes',
      header: 'Notes',
      className: 'text-slate-500',
      render: (loc) => loc.notes || '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (loc) => (
        <button
          onClick={() => {
            setEditingLoc(loc);
            setName(loc.name);
            setCode(loc.code || '');
            setStatus(loc.status);
            setNotes(loc.notes || '');
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
          id="location-search-input"
          value={search}
          onChange={setSearch}
          placeholder="Search locations by name or short code... (Ctrl+F)"
          className="max-w-md"
        />

        <Button
          onClick={() => {
            setEditingLoc(null);
            setName('');
            setCode('');
            setStatus('ACTIVE');
            setNotes('');
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Logistics Hub (Ctrl+N)
        </Button>
      </div>

      {/* Locations Table using DataTable */}
      <DataTable
        columns={columns}
        data={locations}
        keyExtractor={(loc) => loc.id}
        emptyMessage="No locations found. Click 'Add Logistics Hub' to create one."
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLoc ? 'Edit Logistics Hub' : 'Add Logistics Hub'}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dubai"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Short Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. DXB"
              className="h-11 w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl px-4 text-xs font-semibold font-mono text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
            <SelectDropdown
              options={[
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'INACTIVE', label: 'INACTIVE' },
              ]}
              value={status}
              onChange={(val) => setStatus(val as EntityStatus)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full bg-[#F0F2F9] hover:bg-[#E4E7F4] border border-transparent focus:border-violet-600 focus:bg-white rounded-2xl p-4 text-xs font-semibold text-slate-900 focus:outline-none transition-all duration-200 shadow-sm"
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
              Save Logistics Hub
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
