// features/dashboard/Dashboard.tsx
// v2.4.0 — Правильные типы для скринингов, инструментальных и консультаций

import { useEffect, useState } from 'react';
import { useAppStore } from '@core/store';
import { waitingService, WaitingItemFull } from '@core/services/waiting.service';
import { getScreeningGaps } from '@core/services/screening.service';
import { eventRepo } from '@core/database/repositories';
import { Users, Clock, AlertTriangle, ArrowRight, FlaskConical, Stethoscope } from 'lucide-react';
import { ResultEntryModal } from '@/features/shared/ResultEntryModal';
import { LabResultEntryModal } from '@/features/shared/LabResultEntryModal';

interface CombinedAlert {
  patientId: string;
  patientName: string;
  patientCode: string;
  description: string;
  name: string;
  priority: string;
  isScreening: boolean;
  waitingItemId?: string;
}

export function Dashboard() {
  const patients = useAppStore(s => s.patients);
  const navigateTo = useAppStore(s => s.navigateTo);
  const selectPatient = useAppStore(s => s.selectPatient);

  const [alerts, setAlerts] = useState<CombinedAlert[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<typeof patients>([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    patientId?: string;
    prefilled?: {
      type?: 'imaging' | 'consultation' | 'screening';
      name?: string;
      waitingItemId?: string;
    };
  }>({ isOpen: false });
  const [showLabModal, setShowLabModal] = useState(false);
  const [showInstrumentalModal, setShowInstrumentalModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [urgent] = await Promise.all([waitingService.getUrgent()]);

      const allPatientEvents: any[] = [];
      for (const p of patients.slice(0, 50)) {
        try {
          const events = await eventRepo.findByPatient(p.id, 50);
          allPatientEvents.push(...events);
        } catch {}
      }

      const screeningGaps = getScreeningGaps(patients, allPatientEvents);

      const combined: CombinedAlert[] = [];

      for (const item of urgent) {
        combined.push({
          patientId: item.patientId,
          patientName: item.patientName || item.patientCode,
          patientCode: item.patientCode,
          description: item.description,
          name: item.description,
          priority: item.priority,
          isScreening: false,
          waitingItemId: item.id,
        });
      }

      for (const gap of screeningGaps) {
        if (!combined.some(c => c.patientId === gap.patientId && c.name === gap.name)) {
          combined.push({
            patientId: gap.patientId,
            patientName: gap.patientName,
            patientCode: gap.patientCode,
            description: gap.description,
            name: gap.name,
            priority: gap.priority,
            isScreening: true,
          });
        }
      }

      const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
      combined.sort((a, b) => (priorityOrder[a.priority] ?? 5) - (priorityOrder[b.priority] ?? 5));
      setAlerts(combined.slice(0, 10));

      const today = new Date().toISOString().split('T')[0];
      setTodayAppointments(patients.filter(p => p.lastVisitDate === today));
    } catch (e) {
      console.error('Ошибка загрузки дашборда:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVisit = (patientId: string) => {
    selectPatient(patientId);
    navigateTo('visit');
  };

  const handleAddResult = (item: CombinedAlert) => {
    const desc = item.description.toLowerCase();
    
    // Лабораторные
    if (desc.includes('анализ') || desc.includes('оак') || desc.includes('оам') ||
        desc.includes('биохимия') || desc.includes('липид') || desc.includes('глюкоза') ||
        desc.includes('hba1c') || desc.includes('холестерин')) {
      setShowLabModal(true);
      return;
    }
    
    // Инструментальные — есть waitingItemId
    if (item.waitingItemId) {
      setResultModal({
        isOpen: true,
        patientId: item.patientId,
        prefilled: {
          waitingItemId: item.waitingItemId,
          type: 'imaging',
          name: item.name || item.description,
        },
      });
      return;
    }
    
    // Скрининг — нет waitingItemId
    setResultModal({
      isOpen: true,
      patientId: item.patientId,
      prefilled: {
        type: 'screening',
        name: item.name || item.description,
      },
    });
  };

  const activePatients = patients.filter(p => !p.isArchived && !p.isDeceased).length;
  const criticalCount = alerts.filter(a => a.priority === 'P0' || a.priority === 'P1').length;

  const priorityColor = (p: string) => {
    switch (p) {
      case 'P0': return { bg: '#fee2e2', text: '#991b1b' };
      case 'P1': return { bg: '#fef3c7', text: '#92400e' };
      case 'P2': return { bg: '#dbeafe', text: '#1e40af' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-foreground)' }}>Дашборд</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Пациентов', value: activePatients, icon: <Users size={20} />, color: '#3b82f6' },
          { label: 'На сегодня', value: todayAppointments.length, icon: <Clock size={20} />, color: '#10b981' },
          { label: 'Требуют внимания', value: alerts.length, icon: <AlertTriangle size={20} />, color: alerts.length > 0 ? '#ef4444' : '#6b7280' },
          { label: 'Критических', value: criticalCount, icon: <AlertTriangle size={20} />, color: criticalCount > 0 ? '#dc2626' : '#6b7280' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="p-2 rounded-lg" style={{ backgroundColor: s.color + '20', color: s.color }}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border overflow-hidden mb-6" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <AlertTriangle size={16} style={{ color: criticalCount > 0 ? '#ef4444' : '#6b7280' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Требуют внимания</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>{alerts.length}</span>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {loading ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
          ) : alerts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              <span className="text-2xl">✅</span><p className="mt-1">Всё под контролем</p>
            </div>
          ) : (
            alerts.map((item, i) => {
              const pc = priorityColor(item.priority);
              return (
                <div key={i} className="px-4 py-2.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: pc.bg, color: pc.text }}>{item.priority}</span>
                    <button onClick={() => handleOpenVisit(item.patientId)}
                      className="text-sm font-medium hover:underline text-left flex-1 truncate" style={{ color: 'var(--color-foreground)' }}>
                      {item.patientName}
                    </button>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: item.isScreening ? '#fef3c7' : '#dbeafe', color: item.isScreening ? '#92400e' : '#1e40af' }}>
                      {item.isScreening ? 'ДС' : 'Лист'}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5 ml-8" style={{ color: 'var(--color-muted-foreground)' }}>{item.description}</div>
                  <div className="flex gap-1.5 mt-1 ml-8">
                    {item.isScreening ? (
                      <>
                        <button onClick={() => handleAddResult(item)}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: '#10b981', color: 'white' }}>Внести результат</button>
                        <button onClick={() => handleOpenVisit(item.patientId)}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Открыть приём</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleAddResult(item)}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: '#10b981', color: 'white' }}>Внести результат</button>
                        <button onClick={() => handleOpenVisit(item.patientId)}
                          className="px-2 py-0.5 rounded text-xs border"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}><ArrowRight size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={() => navigateTo('patient-registry')}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Картотека</button>
        <button onClick={() => navigateTo('visit')}
          className="px-4 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Новый протокол</button>
        <button onClick={() => navigateTo('waiting-list')}
          className="px-4 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Лист ожидания</button>
        <button onClick={() => setShowLabModal(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
          <FlaskConical size={14} className="inline mr-1" />Внести анализ</button>
        <button onClick={() => setShowInstrumentalModal(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
          <Stethoscope size={14} className="inline mr-1" />Внести исследование</button>
      </div>

      <ResultEntryModal
        isOpen={resultModal.isOpen}
        onClose={() => { setResultModal({ isOpen: false }); loadData(); }}
        patientId={resultModal.patientId}
        prefilled={resultModal.prefilled}
      />

      <LabResultEntryModal isOpen={showLabModal} onClose={() => { setShowLabModal(false); loadData(); }} />
      <ResultEntryModal isOpen={showInstrumentalModal} onClose={() => { setShowInstrumentalModal(false); loadData(); }} />
    </div>
  );
}