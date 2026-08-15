import React from 'react';
import { Transport, Location, Driver, Vehicle } from '@shared/types';
import { Plus, Edit2, XCircle, Receipt } from 'lucide-react';
import { DataTable, Column } from '../common/DataTable';
import { Button } from '../common/Button';

interface ExcelTransportGridProps {
  transports: Transport[];
  locations: Location[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onNew: () => void;
  onEdit: (transport: Transport) => void;
  onCancel: (id: string) => void;
  onOpenCosts?: (transport: Transport) => void;
}

export const ExcelTransportGrid: React.FC<ExcelTransportGridProps> = ({
  transports,
  onNew,
  onEdit,
  onCancel,
  onOpenCosts,
}) => {
  const columns: Column<Transport>[] = [
    {
      key: 'date',
      header: 'Date',
      className: 'font-mono text-slate-500 whitespace-nowrap',
    },
    {
      key: 'transportNo',
      header: 'Invoice #',
      className: 'font-mono font-bold text-violet-700 whitespace-nowrap',
    },
    {
      key: 'transportType',
      header: 'Type',
      align: 'center',
      render: (t) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            t.transportType === 'TRIP'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-indigo-100 text-indigo-800'
          }`}
        >
          {t.transportType}
        </span>
      ),
    },
    {
      key: 'materialName',
      header: 'Material Name',
      className: 'font-medium text-slate-700',
      render: (t) => t.materialName || '-',
    },
    {
      key: 'fromLocationName',
      header: 'From Location',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'toLocationName',
      header: 'To Location',
      className: 'font-semibold text-slate-900',
    },
    {
      key: 'vehicleRegistration',
      header: 'Vehicle Reg',
      className: 'font-mono font-bold text-amber-600',
    },
    {
      key: 'driverName',
      header: 'Driver Name',
      className: 'font-medium text-slate-800',
    },
    {
      key: 'tons',
      header: 'Tons',
      align: 'right',
      className: 'font-mono',
      render: (t) => (t.tons ? t.tons.toLocaleString() : '-'),
    },
    {
      key: 'ratePerTon',
      header: 'Rate / Ton',
      align: 'right',
      className: 'font-mono',
      render: (t) => (t.ratePerTon ? t.ratePerTon.toLocaleString() : '-'),
    },
    {
      key: 'fixedPrice',
      header: 'Fixed Price',
      align: 'right',
      className: 'font-mono',
      render: (t) => (t.fixedPrice ? t.fixedPrice.toLocaleString() : '-'),
    },
    {
      key: 'totalAmount',
      header: 'Revenue (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600',
      render: (t) => t.totalAmount.toLocaleString(),
    },
    {
      key: 'totalDirectCosts',
      header: 'Trip Costs',
      align: 'center',
      className: 'whitespace-nowrap',
      headerClassName: 'whitespace-nowrap',
      render: (t) => {
        const hasCosts = (t.totalDirectCosts || 0) > 0;
        return (
          <button
            onClick={() => onOpenCosts?.(t)}
            disabled={t.status === 'CANCELLED'}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition cursor-pointer select-none ${
              hasCosts
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 shadow-2xs'
                : 'bg-slate-100/80 text-slate-500 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300 border border-slate-200/60'
            }`}
            title="Click to view or edit linked trip costs"
          >
            <Receipt className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span className="whitespace-nowrap leading-none">
              {hasCosts ? `AED ${(t.totalDirectCosts || 0).toLocaleString()}` : '+ Add Costs'}
            </span>
          </button>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (t) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            t.status === 'CONFIRMED'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-rose-100 text-rose-700'
          }`}
        >
          {t.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (t) => {
        const isCancelled = t.status === 'CANCELLED';
        if (isCancelled) return null;
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onOpenCosts?.(t)}
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
              title="Manage Trip Costs (Fuel, Tolls, Fines)"
            >
              <Receipt className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEdit(t)}
              className="p-1 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
              title="Edit Transport"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onCancel(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Cancel Transport"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={transports}
      keyExtractor={(t) => t.id}
      title="Fast Data Entries"
      countBadge={transports.length}
      emptyMessage="No transport records found. Press 'Ctrl+N' to add a record."
      rowClassName={(t) => (t.status === 'CANCELLED' ? 'opacity-50 bg-slate-50 line-through' : '')}
      actionButton={
        <Button
          onClick={onNew}
          icon={<Plus className="w-4 h-4" />}
          size="sm"
        >
          New Transport Entry (Ctrl+N)
        </Button>
      }
    />
  );
};
