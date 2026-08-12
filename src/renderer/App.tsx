import React, { useState } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ShortcutModal } from './components/common/ShortcutModal';
import { KeyboardShortcutProvider } from './context/KeyboardShortcutContext';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TransportsPage } from './pages/TransportsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { DriversPage } from './pages/DriversPage';
import { LocationsPage } from './pages/LocationsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FuelPage } from './pages/FuelPage';
import { DriverSalariesPage } from './pages/DriverSalariesPage';
import { ReportsPage } from './pages/ReportsPage';
import { BackupsPage } from './pages/BackupsPage';

export type NavTab =
  | 'dashboard'
  | 'transports'
  | 'vehicles'
  | 'drivers'
  | 'locations'
  | 'expenses'
  | 'fuel'
  | 'maintenance'
  | 'salaries'
  | 'reports'
  | 'backups';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);

  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'transports': return 'Transports';
      case 'vehicles': return 'Vehicles';
      case 'drivers': return 'Drivers';
      case 'locations': return 'Locations';
      case 'expenses': return 'Expenses';
      case 'fuel': return 'Fuel';
      case 'maintenance': return 'Maintenance';
      case 'salaries': return 'Salaries';
      case 'reports': return 'Reports';
      case 'backups': return 'Backups';
    }
  };

  return (
    <KeyboardShortcutProvider>
      <div className="flex h-screen bg-[#F4F5FA] text-[#1E1B4B] font-sans antialiased overflow-hidden select-none">
        {/* Floating Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenShortcuts={() => setIsShortcutModalOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <Header activeTabTitle={getTabTitle(activeTab)} />

          <main className="flex-1 overflow-y-auto">
            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'transports' && <TransportsPage />}
            {activeTab === 'vehicles' && <VehiclesPage />}
            {activeTab === 'drivers' && <DriversPage />}
            {activeTab === 'locations' && <LocationsPage />}
            {activeTab === 'expenses' && <ExpensesPage />}
            {activeTab === 'fuel' && <FuelPage />}
            {activeTab === 'maintenance' && <ExpensesPage />}
            {activeTab === 'salaries' && <DriverSalariesPage />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'backups' && <BackupsPage />}
          </main>
        </div>

        {/* Global Keyboard Shortcut Modal */}
        <ShortcutModal
          isOpen={isShortcutModalOpen}
          onClose={() => setIsShortcutModalOpen(false)}
        />
      </div>
    </KeyboardShortcutProvider>
  );
};

export default App;
