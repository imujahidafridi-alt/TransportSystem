import React, { useState } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { ShortcutModal } from './components/common/ShortcutModal';
import { KeyboardShortcutProvider } from './context/KeyboardShortcutContext';
import { SecurityProvider } from './context/SecurityContext';
import { LockScreen } from './components/security/LockScreen';
import { SecuritySettingsModal } from './components/security/SecuritySettingsModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TransportsPage } from './pages/TransportsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { DriversPage } from './pages/DriversPage';
import { LocationsPage } from './pages/LocationsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { FuelPage } from './pages/FuelPage';
import { MaintenancePage } from './pages/MaintenancePage';
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
    <SecurityProvider>
      <KeyboardShortcutProvider activeTab={activeTab}>
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

            <main className="flex-1 smooth-scroll relative overscroll-contain">
              {/* Keep-Alive Persistent Module Containers: Zero layout shifts, instant tab switching, 100% filter/scroll preservation */}
              <div className={activeTab === 'dashboard' ? 'h-full flex flex-col' : 'hidden'}>
                <DashboardPage onNavigate={(tab) => setActiveTab(tab)} />
              </div>

              <div className={activeTab === 'transports' ? 'h-full flex flex-col' : 'hidden'}>
                <TransportsPage />
              </div>

              <div className={activeTab === 'vehicles' ? 'h-full flex flex-col' : 'hidden'}>
                <VehiclesPage />
              </div>

              <div className={activeTab === 'drivers' ? 'h-full flex flex-col' : 'hidden'}>
                <DriversPage />
              </div>

              <div className={activeTab === 'locations' ? 'h-full flex flex-col' : 'hidden'}>
                <LocationsPage />
              </div>

              <div className={activeTab === 'expenses' ? 'h-full flex flex-col' : 'hidden'}>
                <ExpensesPage />
              </div>

              <div className={activeTab === 'fuel' ? 'h-full flex flex-col' : 'hidden'}>
                <FuelPage />
              </div>

              <div className={activeTab === 'maintenance' ? 'h-full flex flex-col' : 'hidden'}>
                <MaintenancePage />
              </div>

              <div className={activeTab === 'salaries' ? 'h-full flex flex-col' : 'hidden'}>
                <DriverSalariesPage />
              </div>

              <div className={activeTab === 'reports' ? 'h-full flex flex-col' : 'hidden'}>
                <ReportsPage />
              </div>

              <div className={activeTab === 'backups' ? 'h-full flex flex-col' : 'hidden'}>
                <BackupsPage />
              </div>
            </main>
          </div>

          {/* Global Keyboard Shortcut Modal */}
          <ShortcutModal
            isOpen={isShortcutModalOpen}
            onClose={() => setIsShortcutModalOpen(false)}
          />

          {/* Enterprise Security Settings Dialog */}
          <SecuritySettingsModal />

          {/* Enterprise Lockscreen Fullscreen Overlay */}
          <LockScreen />
        </div>
      </KeyboardShortcutProvider>
    </SecurityProvider>
  );
};

export default App;
