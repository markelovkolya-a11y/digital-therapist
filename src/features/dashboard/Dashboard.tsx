// features/dashboard/Dashboard.tsx
// v3.0.0 — Центр управления участком

import { useEffect, useState } from 'react';
import { useAppStore } from '@core/store';
import { waitingService, WaitingItemFull } from '@core/services/waiting.service';
import { getScreeningGaps } from '@core/services/screening.service';
import { eventRepo } from '@core/database/repositories';
import { CHRONIC_FILTERS, patientSearchService } from '@core/services/patientSearch.service';
import { formatDateRu, isOverdue } from '@core/utils/date';
import { AlertTriangle, Calendar, Users, TrendingUp } from 'lucide-react';
import { ResultEntryModal } from '@/features/shared/ResultEntryModal';
import { LabResultEntryModal } from '@/features/shared/LabResultEntryModal';

export function Dashboard() {
  const patients = useAppStore(s => s.patients);
  const navigateTo = useAppStore(s => s.navigateTo);
  const selectPatient = useAppStore(s => s.selectPatient);

  const [urgentItems, setUrgentItems] = useState<any[]>([]);
  const [todayPatients, setTodayPatients] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<{ label: string; total: number; covered: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; patientId?: string; prefilled?: any }>({ isOpen: false });
  const [showLabModal, setShowLabModal] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({ visits: 0, results: 0, problems: 0 });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Срочное
      const urgent = await waitingService.getUrgent();
      const allEvents: any[] = [];
      for (const p of patients.slice(0, 50)) {
        try { allEvents.push(...await eventRepo.findByPatient(p.id, 30)); } catch {}
      }
      const screeningGaps = getScreeningGaps(patients, allEvents);
      
      const combined = [
        ...urgent.map(w => ({ ...w, isScreening: false })),
        ...screeningGaps.filter(g => g.priority === 'P0' || g.priority === 'P1').map(g => ({
          patientId: g.patientId, patientName: g.patientName, patientCode: g.patientCode,
          description: g.description, priority: g.priority, isScreening: true,
        })),
      ];
      const priorityOrder: Record<string, number> = { P0: 0, P1: 1 };
      combined.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
      setUrgentItems(combined.slice(0, 6));

      // Сегодня
      const today = new Date().toISOString().split('T')[0];
      const todayVisits = patients.filter(p => p.lastVisitDate === today);
      setTodayPatients(todayVisits);

      // Тепловая карта
      const heatmapData: { label: string; total: number; covered: number }[] = [];
      for (const filter of CHRONIC_FILTERS.slice(0, 6)) {
        try {
          const codes = patientSearchService.getCodesForFilter(filter.label);
          const filtered = await patientSearchService.findByDiagnosis(codes);
          const total = filtered.length;
          // Охват: у скольких есть событие за последние 6 месяцев
          let covered = 0;
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          for (const p of filtered) {
            const hasRecent = allEvents.some(e =>
              e.patientId === p.id &&
              new Date(e.timestamp) > sixMonthsAgo &&
              (e.type === 'visit_note' || e.type === 'lab_result')
            );
            if (hasRecent) covered++;
          }
          heatmapData.push({ label: filter.label, total, covered });
        } catch {}
      }
      setHeatmap(heatmapData);

      // Статистика за неделю
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentEvents = allEvents.filter(e => new Date(e.timestamp) > weekAgo);
      setWeeklyStats({
        visits: recentEvents.filter(e => e.type === 'visit_note').length,
        results: recentEvents.filter(e => ['lab_result', 'imaging_result', 'screening_performed'].includes(e.type)).length,
        problems: recentEvents.filter(e => e.type === 'diagnosis_established').length,
      });
    } catch (e) {
      console.error('Ошибка дашборда:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVisit = (patientId: string) => {
    selectPatient(patientId);
    navigateTo('visit');
  };

  const handleAddResult = (item: any) => {
    if (item.isScreening) {
      setResultModal({ isOpen: true, patientId: item.patientId, prefilled: { type: 'screening', name: item.description } });
    } else if (item.description?.toLowerCase().includes('анализ') || item.description?.toLowerCase().includes('hba1c')) {
      setShowLabModal(true);
    } else {
      setResultModal({ isOpen: true, patientId: item.patientId, prefilled: { waitingItemId: item.id, type: 'imaging', name: item.description } });
    }
  };

  const activePatients = patients.filter(p => !p.isArchived && !p.isDeceased).length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-foreground)' }}>Дашборд</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 🔴 Срочно */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>🔴 Срочно</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>{urgentItems.length}</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {loading ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
            ) : urgentItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>✅ Нет срочных</div>
            ) : (
              urgentItems.map((item, i) => (
                <div key={i} className="px-4 py-2.5 hover:bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: item.priority === 'P0' ? '#fee2e2' : '#fef3c7', color: item.priority === 'P0' ? '#991b1b' : '#92400e' }}>
                      {item.priority}
                    </span>
                    <button onClick={() => handleOpenVisit(item.patientId)}
                      className="text-sm font-medium hover:underline text-left flex-1 truncate" style={{ color: 'var(--color-foreground)' }}>
                      {item.patientName}
                    </button>
                  </div>
                  <div className="text-xs mt-0.5 ml-8" style={{ color: 'var(--color-muted-foreground)' }}>{item.description}</div>
                  <div className="flex gap-1.5 mt-1 ml-8">
                    <button onClick={() => handleAddResult(item)}
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: '#10b981', color: 'white' }}>Внести</button>
                    <button onClick={() => handleOpenVisit(item.patientId)}
                      className="px-2 py-0.5 rounded text-xs border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Приём</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 🟡 Сегодня + 📊 Статистика */}
        <div className="space-y-6">
          {/* Сегодня */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <Calendar size={16} style={{ color: '#f59e0b' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>🟡 Сегодня</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>{todayPatients.length}</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {todayPatients.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Нет записей</div>
              ) : (
                todayPatients.slice(0, 5).map(p => (
                  <div key={p.id} className="px-4 py-2.5 hover:bg-muted/20 cursor-pointer" onClick={() => handleOpenVisit(p.id)}>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{p.lastName} {p.firstName}</div>
                    <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{p.emiasCode}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Статистика за неделю */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <TrendingUp size={16} style={{ color: '#3b82f6' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>📊 За неделю</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{weeklyStats.visits}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Приёмов</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{weeklyStats.results}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Результатов</div>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{weeklyStats.problems}</div>
                <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Диагнозов</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🗺️ Тепловая карта */}
      {heatmap.length > 0 && (
        <div className="mt-6 rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <Users size={16} style={{ color: '#8b5cf6' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>🗺️ Охват по ХНИЗ</h2>
            <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Всего: {activePatients} пациентов</span>
          </div>
          <div className="p-4 space-y-3">
            {heatmap.map(h => {
              const pct = h.total > 0 ? Math.round((h.covered / h.total) * 100) : 0;
              const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
              return (
                <div key={h.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--color-foreground)' }}>{h.label}</span>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{h.total} чел. • охват {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ResultEntryModal isOpen={resultModal.isOpen} onClose={() => { setResultModal({ isOpen: false }); loadData(); }}
        patientId={resultModal.patientId} prefilled={resultModal.prefilled} />
      <LabResultEntryModal isOpen={showLabModal} onClose={() => { setShowLabModal(false); loadData(); }} />
    </div>
  );
}