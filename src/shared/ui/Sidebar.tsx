// shared/ui/Sidebar.tsx
// v1.0.0 — Боковая панель навигации

import { useAppStore, type Screen } from '@core/store';
import {
  LayoutDashboard,
  Users,
  FileText,
  Clock,
  Settings,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Дашборд', icon: <LayoutDashboard size={20} /> },
  { id: 'patient-registry', label: 'Картотека', icon: <Users size={20} /> },
  { id: 'visit', label: 'Протокол осмотра', icon: <FileText size={20} /> },
  { id: 'waiting-list', label: 'Лист ожидания', icon: <Clock size={20} /> },
  { id: 'settings', label: 'Настройки', icon: <Settings size={20} /> },
];

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function Sidebar({ currentScreen, onNavigate }: SidebarProps) {
  const darkMode = useAppStore(s => s.darkMode);
  const toggleDarkMode = useAppStore(s => s.toggleDarkMode);
  const sidebarOpen = useAppStore(s => s.sidebarOpen);
  const toggleSidebar = useAppStore(s => s.toggleSidebar);

  return (
    <aside
      className="flex flex-col border-r transition-all duration-200"
      style={{
        width: sidebarOpen ? '240px' : '56px',
        backgroundColor: 'var(--color-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Заголовок */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {sidebarOpen && (
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Ассистент
            </div>
            <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              v1.0.0
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-muted flex-shrink-0"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Навигация */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: currentScreen === item.id ? 'var(--color-primary)' : 'transparent',
              color: currentScreen === item.id ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
            }}
            title={!sidebarOpen ? item.label : undefined}
          >
            {item.icon}
            {sidebarOpen && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Переключатель темы */}
      <div className="px-2 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={toggleDarkMode}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors"
          style={{ color: 'var(--color-muted-foreground)' }}
          title={!sidebarOpen ? (darkMode ? 'Светлая тема' : 'Тёмная тема') : undefined}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          {sidebarOpen && <span>{darkMode ? 'Светлая тема' : 'Тёмная тема'}</span>}
        </button>
      </div>
    </aside>
  );
}