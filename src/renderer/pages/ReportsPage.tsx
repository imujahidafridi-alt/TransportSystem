import React, { useEffect, useState } from 'react';
import { ReportFilter, Transport, Vehicle } from '@shared/types';
import { Printer, Download, Filter } from 'lucide-react';
import { VehicleProfitabilityReport } from 'src/main/services/reportService';
import { DataTable, Column } from '../components/common/DataTable';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Button } from '../components/common/Button';

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'TRANSPORTS' | 'PROFITABILITY'>('TRANSPORTS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transportType, setTransportType] = useState<'' | 'TRIP' | 'TON'>('');
  const [vehicleId, setVehicleId] = useState('');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transportsReport, setTransportsReport] = useState<Transport[]>([]);
  const [profitabilityReport, setProfitabilityReport] = useState<VehicleProfitabilityReport[]>([]);

  const loadReportData = async () => {
    if (window.electronAPI) {
      const vList = await window.electronAPI.getVehicles();
      setVehicles(vList);

      const filter: ReportFilter = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        transportType: transportType || undefined,
        vehicleId: vehicleId || undefined,
      };

      if (reportType === 'TRANSPORTS') {
        const res = await window.electronAPI.getTransportsReport(filter);
        setTransportsReport(res);
      } else {
        const res = await window.electronAPI.getVehicleProfitabilityReport(filter);
        setProfitabilityReport(res);
      }
    }
  };

  useEffect(() => {
    loadReportData();
  }, [reportType, startDate, endDate, transportType, vehicleId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (reportType === 'TRANSPORTS') {
      csvContent += 'Date,TransportNo,Type,From,To,Vehicle,Driver,Tons,Rate,FixedPrice,TotalAmount,Status\n';
      transportsReport.forEach((t) => {
        csvContent += `${t.date},${t.transportNo},${t.transportType},"${t.fromLocationName}","${t.toLocationName}",${t.vehicleRegistration},"${t.driverName}",${t.tons || ''},${t.ratePerTon || ''},${t.fixedPrice || ''},${t.totalAmount},${t.status}\n`;
      });
    } else {
      csvContent += 'VehicleRegistration,TotalTrips,TotalRevenue,FuelExpense,MaintenanceExpense,OtherExpense,TotalExpense,NetProfit\n';
      profitabilityReport.forEach((p) => {
        csvContent += `${p.registrationNumber},${p.totalTrips},${p.totalRevenue},${p.fuelExpense},${p.maintenanceExpense},${p.otherExpense},${p.totalExpense},${p.netProfit}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${reportType.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const transportColumns: Column<Transport>[] = [
    { key: 'date', header: 'Date', className: 'font-mono text-slate-700' },
    { key: 'transportNo', header: 'Transport #', className: 'font-mono font-bold text-violet-700' },
    { key: 'transportType', header: 'Type' },
    { key: 'fromLocationName', header: 'From', className: 'font-sans font-semibold text-slate-800' },
    { key: 'toLocationName', header: 'To', className: 'font-sans font-semibold text-slate-800' },
    { key: 'vehicleRegistration', header: 'Vehicle', className: 'font-mono font-bold text-amber-600' },
    { key: 'driverName', header: 'Driver', className: 'font-sans text-slate-700' },
    { key: 'tons', header: 'Tons', align: 'right', className: 'font-mono', render: (t) => t.tons || '-' },
    { key: 'ratePerTon', header: 'Rate', align: 'right', className: 'font-mono', render: (t) => t.ratePerTon || '-' },
    {
      key: 'totalAmount',
      header: 'Total Amount (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-emerald-600',
      render: (t) => t.totalAmount.toLocaleString(),
    },
  ];

  const profitColumns: Column<VehicleProfitabilityReport>[] = [
    { key: 'registrationNumber', header: 'Vehicle Reg', className: 'font-mono font-bold text-amber-600' },
    { key: 'totalTrips', header: 'Total Trips', align: 'right' },
    { key: 'totalRevenue', header: 'Revenue (AED)', align: 'right', className: 'font-mono font-bold text-emerald-600', render: (p) => p.totalRevenue.toLocaleString() },
    { key: 'fuelExpense', header: 'Fuel Cost', align: 'right', className: 'font-mono text-sky-600', render: (p) => p.fuelExpense.toLocaleString() },
    { key: 'maintenanceExpense', header: 'Maintenance', align: 'right', className: 'font-mono text-rose-600', render: (p) => p.maintenanceExpense.toLocaleString() },
    { key: 'otherExpense', header: 'Other Exp', align: 'right', className: 'font-mono text-amber-600', render: (p) => p.otherExpense.toLocaleString() },
    { key: 'totalExpense', header: 'Total Costs', align: 'right', className: 'font-mono font-bold text-rose-600', render: (p) => p.totalExpense.toLocaleString() },
    {
      key: 'netProfit',
      header: 'Net Profit (AED)',
      align: 'right',
      className: 'font-mono font-extrabold text-sm',
      render: (p) => (
        <span className={p.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
          {p.netProfit.toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4 print:p-0">
      {/* Report Type Selector & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant={reportType === 'TRANSPORTS' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setReportType('TRANSPORTS')}
          >
            Transport Operational History
          </Button>
          <Button
            variant={reportType === 'PROFITABILITY' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setReportType('PROFITABILITY')}
          >
            Vehicle Profitability Analysis
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            icon={<Download className="w-4 h-4" />}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
          >
            Export CSV
          </Button>
          <Button
            onClick={handlePrint}
            variant="secondary"
            icon={<Printer className="w-4 h-4 text-slate-500" />}
            size="sm"
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs print:hidden shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div className="flex items-center gap-2 text-slate-700 font-bold">
          <Filter className="w-4 h-4 text-violet-600" />
          <span>Filters:</span>
        </div>

        <div>
          <span className="text-slate-500 mr-1.5 font-medium">Start Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#F0F2F9] border border-transparent rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-violet-600 transition"
          />
        </div>

        <div>
          <span className="text-slate-500 mr-1.5 font-medium">End Date:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#F0F2F9] border border-transparent rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-violet-600 transition"
          />
        </div>

        {reportType === 'TRANSPORTS' && (
          <div className="flex items-center gap-1.5 w-44">
            <span className="text-slate-500 font-medium shrink-0">Type:</span>
            <SelectDropdown
              options={[
                { value: '', label: 'All Types' },
                { value: 'TRIP', label: 'TRIP (Fixed)' },
                { value: 'TON', label: 'TON (Rate)' },
              ]}
              value={transportType}
              onChange={(val) => setTransportType(val as any)}
              size="sm"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 w-48">
          <span className="text-slate-500 font-medium shrink-0">Vehicle:</span>
          <SelectDropdown
            options={[
              { value: '', label: 'All Vehicles' },
              ...vehicles.map((v) => ({
                value: v.id,
                label: v.registrationNumber,
              })),
            ]}
            value={vehicleId}
            onChange={setVehicleId}
            size="sm"
          />
        </div>
      </div>

      {/* Reports Data Table */}
      {reportType === 'TRANSPORTS' ? (
        <DataTable
          columns={transportColumns}
          data={transportsReport}
          keyExtractor={(t) => t.id}
          emptyMessage="No transport records found for selected filters."
        />
      ) : (
        <DataTable
          columns={profitColumns}
          data={profitabilityReport}
          keyExtractor={(p) => p.vehicleId}
          emptyMessage="No vehicle profitability data available for selected filters."
        />
      )}
    </div>
  );
};
