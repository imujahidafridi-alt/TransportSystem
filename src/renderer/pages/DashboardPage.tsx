import React, { useEffect, useState } from 'react';
import { DashboardSummary } from '@shared/types';
import { NavTab } from '../App';
import {
  Truck,
  Users,
  Route,
  DollarSign,
  Fuel,
  Wrench,
  Receipt,
  TrendingUp,
  Calendar,
  Activity,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate?: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL'>('THIS_MONTH');

  const loadSummary = async () => {
    if (window.electronAPI) {
      const res = await window.electronAPI.getDashboardSummary({ period });
      setSummary(res);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [period]);

  if (!summary) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-xs font-semibold text-slate-400">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-600 animate-spin" />
          <span>Loading real-time operations control dashboard...</span>
        </div>
      </div>
    );
  }

  const totalCost =
    summary.vehicleExpenses +
    summary.fuelExpenses +
    summary.maintenanceExpenses +
    summary.driverSalaries;

  const profitMarginPercent =
    summary.totalRevenue > 0
      ? Math.round((summary.netResult / summary.totalRevenue) * 100)
      : 0;

  const kpis = [
    {
      title: 'Fleet Vehicles',
      value: summary.totalVehicles,
      sub: `${summary.activeVehicles} Active • ${summary.idleVehicles} Idle`,
      icon: Truck,
      color: 'text-violet-600',
      bg: 'bg-violet-100/80 border-violet-200',
      targetTab: 'vehicles' as NavTab,
    },
    {
      title: 'Active Drivers',
      value: summary.activeDrivers,
      sub: `${summary.driversOnLeave} On Leave`,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100/80 border-indigo-200',
      targetTab: 'drivers' as NavTab,
    },
    {
      title: 'Trips (Period)',
      value: summary.tripsThisMonth.toLocaleString(),
      sub: 'Transports Completed',
      icon: Route,
      color: 'text-purple-600',
      bg: 'bg-purple-100/80 border-purple-200',
      targetTab: 'transports' as NavTab,
    },
    {
      title: 'Gross Revenue',
      value: `AED ${summary.totalRevenue.toLocaleString()}`,
      sub: 'Transport Earnings',
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100/80 border-emerald-200',
      targetTab: 'reports' as NavTab,
    },
    {
      title: 'Operating Costs',
      value: `AED ${totalCost.toLocaleString()}`,
      sub: 'Total Fleet Overhead',
      icon: Receipt,
      color: 'text-rose-600',
      bg: 'bg-rose-100/80 border-rose-200',
      targetTab: 'expenses' as NavTab,
    },
    {
      title: 'Net Profit',
      value: `AED ${summary.netResult.toLocaleString()}`,
      sub: `Margin: ${profitMarginPercent}%`,
      icon: TrendingUp,
      color: summary.netResult >= 0 ? 'text-emerald-600' : 'text-rose-600',
      bg: summary.netResult >= 0 ? 'bg-emerald-100/80 border-emerald-200' : 'bg-rose-100/80 border-rose-200',
      targetTab: 'reports' as NavTab,
    },
  ];

  const fuelPct = totalCost > 0 ? Math.round((summary.fuelExpenses / totalCost) * 100) : 0;
  const maintPct = totalCost > 0 ? Math.round((summary.maintenanceExpenses / totalCost) * 100) : 0;
  const salPct = totalCost > 0 ? Math.round((summary.driverSalaries / totalCost) * 100) : 0;
  const expPct = totalCost > 0 ? Math.round((summary.vehicleExpenses / totalCost) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Top Header & Period Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-violet-600 fill-violet-600" />
            <span>Operations Control Center</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time fleet performance, financial health & live transport activity
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-2xl p-1 text-xs shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
          {(['TODAY', 'THIS_WEEK', 'THIS_MONTH', 'ALL'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all duration-200 ${
                period === p
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-violet-50/70'
              }`}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 6 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate?.(kpi.targetTab)}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-md hover:border-violet-300 hover:scale-[1.02] cursor-pointer transition-all duration-200 group"
              title={`Click to open ${kpi.title} in ${kpi.targetTab.toUpperCase()}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 group-hover:text-violet-600 uppercase tracking-wider transition-colors">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-xl border ${kpi.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                </div>
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-900 font-mono tracking-tight group-hover:text-violet-700 transition-colors">
                  {kpi.value}
                </p>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 truncate">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cost Ratios & Quick Action Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Breakdown Ratio Visual */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Operating Cost Ratio Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Click any category to open module</p>
            </div>
            <button
              onClick={() => onNavigate?.('expenses')}
              className="font-mono font-bold text-xs text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full hover:bg-rose-100 transition cursor-pointer"
            >
              Total: AED {totalCost.toLocaleString()}
            </button>
          </div>

          {/* Visual Ratio Stacked Bar */}
          <div className="h-3.5 rounded-full bg-slate-100 flex overflow-hidden p-0.5 gap-0.5">
            {totalCost > 0 ? (
              <>
                <div style={{ width: `${fuelPct}%` }} className="bg-sky-500 rounded-l-full transition-all cursor-pointer" onClick={() => onNavigate?.('fuel')} title={`Fuel: ${fuelPct}% - Click to open Fuel`} />
                <div style={{ width: `${maintPct}%` }} className="bg-rose-500 transition-all cursor-pointer" onClick={() => onNavigate?.('maintenance')} title={`Maintenance: ${maintPct}% - Click to open Maintenance`} />
                <div style={{ width: `${salPct}%` }} className="bg-purple-500 transition-all cursor-pointer" onClick={() => onNavigate?.('salaries')} title={`Salaries: ${salPct}% - Click to open Salaries`} />
                <div style={{ width: `${expPct}%` }} className="bg-amber-500 rounded-r-full transition-all cursor-pointer" onClick={() => onNavigate?.('expenses')} title={`Expenses: ${expPct}% - Click to open Expenses`} />
              </>
            ) : (
              <div className="w-full bg-slate-200 rounded-full" />
            )}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div
              onClick={() => onNavigate?.('fuel')}
              className="p-3 bg-sky-50/70 hover:bg-sky-100/80 border border-sky-100 rounded-xl flex items-center justify-between cursor-pointer transition"
              title="Open Fuel Module"
            >
              <div className="flex items-center gap-2">
                <Fuel className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold text-slate-700">Fuel</span>
              </div>
              <span className="font-mono font-bold text-slate-900">AED {summary.fuelExpenses.toLocaleString()}</span>
            </div>

            <div
              onClick={() => onNavigate?.('maintenance')}
              className="p-3 bg-rose-50/70 hover:bg-rose-100/80 border border-rose-100 rounded-xl flex items-center justify-between cursor-pointer transition"
              title="Open Maintenance Module"
            >
              <div className="flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-semibold text-slate-700">Repairs</span>
              </div>
              <span className="font-mono font-bold text-slate-900">AED {summary.maintenanceExpenses.toLocaleString()}</span>
            </div>

            <div
              onClick={() => onNavigate?.('salaries')}
              className="p-3 bg-purple-50/70 hover:bg-purple-100/80 border border-purple-100 rounded-xl flex items-center justify-between cursor-pointer transition"
              title="Open Salaries Module"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span className="font-semibold text-slate-700">Salaries</span>
              </div>
              <span className="font-mono font-bold text-slate-900">AED {summary.driverSalaries.toLocaleString()}</span>
            </div>

            <div
              onClick={() => onNavigate?.('expenses')}
              className="p-3 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-100 rounded-xl flex items-center justify-between cursor-pointer transition"
              title="Open Expenses Module"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span className="font-semibold text-slate-700">Other Exp</span>
              </div>
              <span className="font-mono font-bold text-slate-900">AED {summary.vehicleExpenses.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Financial Summary & Net Profit Card (Clean Light Theme) */}
        <div
          onClick={() => onNavigate?.('reports')}
          className="bg-white border-2 border-violet-200/80 hover:border-violet-400 rounded-2xl p-5 flex flex-col justify-between shadow-xs cursor-pointer transition-colors duration-150"
          title="Open Profit & Loss Report"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-extrabold text-violet-700 uppercase tracking-wider block">
                Net Operating Result
              </span>
              <p className="text-xs text-slate-500 font-normal">Revenue minus all fleet operational costs</p>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-600" />
          </div>

          <div className="my-3">
            <span
              className={`text-3xl font-black font-mono tracking-tight ${
                summary.netResult >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              AED {summary.netResult.toLocaleString()}
            </span>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-700 font-medium">Revenue Earned:</span>
              <span className="font-mono font-extrabold text-emerald-700">AED {summary.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="p-2.5 bg-rose-50/80 border border-rose-200/80 rounded-xl text-xs flex items-center justify-between">
              <span className="text-slate-700 font-medium">Total Operating Costs:</span>
              <span className="font-mono font-extrabold text-rose-700">AED {totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Operations Feed & Recent Activity */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Recent Live Transport Operations
            </h3>
          </div>
          <button
            onClick={() => onNavigate?.('transports')}
            className="text-xs text-violet-600 hover:text-violet-800 font-bold flex items-center gap-1 transition"
          >
            <span>View All Transports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary.recentTransports && summary.recentTransports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Transport #</th>
                  <th className="py-2.5 px-3">From ➔ To Location</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3 text-right">Amount (AED)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {summary.recentTransports.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onNavigate?.('transports')}
                    className="hover:bg-violet-50/50 cursor-pointer transition group"
                    title="Click to open Transports module"
                  >
                    <td className="py-3 px-3 font-mono text-slate-500">{t.date}</td>
                    <td className="py-3 px-3 font-mono font-bold text-violet-700 group-hover:underline">{t.transportNo}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {t.fromLocationName || 'Origin'} ➔ {t.toLocationName || 'Destination'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-600">
                      {t.vehicleRegistration || 'Vehicle'}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">{t.driverName || 'Driver'}</td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-600">
                      AED {t.totalAmount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : t.status === 'CONFIRMED'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            No recent transport entries found.
          </div>
        )}
      </div>
    </div>
  );
};
