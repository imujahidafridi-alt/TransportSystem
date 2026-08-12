import React, { useState } from 'react';
import { NavTab } from '../../App';
import {
  Menu,
  LayoutDashboard,
  Table,
  Truck,
  Users,
  MapPin,
  Receipt,
  Fuel,
  BadgeDollarSign,
  BarChart3,
  HardDrive,
  Keyboard,
} from 'lucide-react';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenShortcuts }) => {
  // Collapsed by default as requested by user
  const [isCollapsed, setIsCollapsed] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transports', label: 'Transports', icon: Table },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'fuel', label: 'Fuel', icon: Fuel },
    { id: 'salaries', label: 'Salaries', icon: BadgeDollarSign },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'backups', label: 'Backups', icon: HardDrive },
  ] as const;

  return (
    <aside
      className={`my-3 ml-3 flex flex-col bg-white border border-slate-200/80 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] shrink-0 z-40 relative transition-all duration-300 ease-out select-none ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Header: Hamburger Toggle + "Menu" Label */}
      <div className="h-14 px-2.5 border-b border-slate-100 flex items-center">
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors duration-200 shrink-0"
          title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <span
          className={`font-extrabold text-slate-800 text-xs tracking-wide ml-2 whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
            isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}
        >
          Menu
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-2 space-y-2 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`group relative w-full h-12 flex items-center px-1.5 rounded-2xl text-xs font-bold transition-all duration-200 ease-out ${
                isActive
                  ? 'bg-gradient-to-r from-violet-50 via-violet-50/80 to-indigo-50/40 text-violet-950 border border-violet-100/70 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              {/* Prominent Icon Container (36px x 36px) with 20px Icon */}
              <div
                className={`w-9 h-9 flex items-center justify-center shrink-0 rounded-2xl transition-all duration-200 ease-out ${
                  isActive
                    ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/35'
                    : 'bg-slate-100/70 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-800'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                />
              </div>

              {/* Label inside sidebar when expanded */}
              <span
                className={`ml-3 truncate whitespace-nowrap transition-all duration-300 ease-out ${
                  isCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'
                }`}
              >
                {item.label}
              </span>

              {/* Fixed Floating Hover Tooltip Popover Badge when Collapsed */}
              {isCollapsed && (
                <div className="fixed left-20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[9999] flex items-center">
                  <div className="w-2 h-2 bg-slate-900 rotate-45 -mr-1 rounded-xs shadow-sm" />
                  <div className="bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xl whitespace-nowrap tracking-wide border border-slate-700/60">
                    {item.label}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Shortcut Trigger */}
      <div className="p-2 border-t border-slate-100">
        <button
          onClick={onOpenShortcuts}
          className="group relative w-full h-12 flex items-center px-1.5 rounded-2xl bg-slate-50 hover:bg-violet-50 text-violet-700 font-bold text-xs transition-colors duration-200 border border-transparent hover:border-violet-100"
        >
          <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-2xl bg-violet-100/80 text-violet-600">
            <Keyboard className="w-5 h-5 text-violet-600" />
          </div>
          <span
            className={`ml-3 truncate whitespace-nowrap transition-all duration-300 ease-out ${
              isCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'
            }`}
          >
            Shortcuts (?)
          </span>

          {/* Fixed Floating Hover Tooltip Popover Badge when Collapsed */}
          {isCollapsed && (
            <div className="fixed left-20 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[9999] flex items-center">
              <div className="w-2 h-2 bg-slate-900 rotate-45 -mr-1 rounded-xs shadow-sm" />
              <div className="bg-slate-900 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-2xl whitespace-nowrap tracking-wide border border-slate-700/60">
                Shortcuts (?)
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
