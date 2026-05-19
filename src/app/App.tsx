// app/App.tsx
// v1.0.0 — Точка входа приложения

import { useEffect } from 'react';
import { useAppStore } from '@core/store';
import { Sidebar } from '@/shared/ui/Sidebar';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { PatientRegistry } from '@/features/patient-registry/components/PatientRegistry';
import { VisitProtocol } from '@/features/visit-protocol/components/VisitProtocol';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { WaitingList } from '@/features/waiting-list/WaitingList';

function App() {
  const initialized = useAppStore(s => s.initialized);
  const initialize = useAppStore(s => s.initialize);
  const darkMode = useAppStore(s => s.darkMode);
  const activeScreen = useAppStore(s => s.activeScreen);
  const navigateTo = useAppStore(s => s.navigateTo);

  useEffect(() => {
    if (!initialized) initialize();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Цифровой ассистент терапевта
          </div>
          <div className="mt-4 text-yellow-600">Инициализация базы данных...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      <Sidebar currentScreen={activeScreen} onNavigate={navigateTo} />
      <main className="flex-1 overflow-auto">
        {activeScreen === 'dashboard' && <Dashboard />}
        {activeScreen === 'patient-registry' && <PatientRegistry />}
        {activeScreen === 'visit' && <VisitProtocol />}
        {activeScreen === 'waiting-list' && <WaitingList />}
        {activeScreen === 'settings' && <SettingsScreen />}
      </main>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{title}</h1>
      <p className="mt-4" style={{ color: 'var(--color-muted-foreground)' }}>Раздел в разработке</p>
    </div>
  );
}

export { App };