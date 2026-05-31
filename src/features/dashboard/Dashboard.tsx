// features/dashboard/Dashboard.tsx
// v3.0.0 — Две вкладки: Сегодня + Участок

import { useEffect, useState } from 'react';
import { useAppStore } from '@core/store';
import { waitingService, WaitingItemFull } from '@core/services/waiting.service';
import { getScreeningGaps } from '@core/services/screening.service';
import { eventRepo } from '@core/database/repositories';
import { CHRONIC_FILTERS, patientSearchService } from '@core/services/patientSearch.service';
import { formatDateRu, isOverdue, calculateAge } from '@core/utils/date';
import { AlertTriangle, Calendar, Users, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { ResultEntryModal } from '@/features/shared/ResultEntryModal';
import { LabResultEntryModal } from '@/features/shared/LabResultEntryModal';

type Tab = 'today' | 'district';

export function Dashboard() {
  const patients = useAppStore(s => s.patients);
  const navigateTo = useAppStore(s => s.navigateTo);
  const selectPatient = useAppStore(s => s.selectPatient);

  const [tab, setTab] = useState<Tab>('today');
  const [urgentItems, setUrgentItems] = useState<any[]>([]);
  const [todayPatients, setTodayPatients] = useState<any[]>([]);
  const [heatmap, setHeatmap] = useState<{ label: string; total: number; covered: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; patientId?: string; prefilled?: any }>({ isOpen: false });
  const [showLabModal, setShowLabModal] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState({ visits: 0, results: 0, problems: 0 });
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

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

      // Группируем по пациентам
      const patientMap = new Map<string, any>();
      
      for (const w of urgent) {
        if (!patientMap.has(w.patientId)) {
          patientMap.set(w.patientId, {
            patientId: w.patientId,
            patientName: w.patientName || w.patientCode,
            patientCode: w.patientCode,
            items: [],
            maxPriority: w.priority,
          });
        }
        const p = patientMap.get(w.patientId)!;
        p.items.push({ ...w, isScreening: false });
        if (w.priority === 'P0') p.maxPriority = 'P0';
      }

      for (const gap of screeningGaps.filter(g => g.priority === 'P0' || g.priority === 'P1')) {
        if (!patientMap.has(gap.patientId)) {
          patientMap.set(gap.patientId, {
            patientId: gap.patientId,
            patientName: gap.patientName,
            patientCode: gap.patientCode,
            items: [],
            maxPriority: gap.priority,
          });
        }
        patientMap.get(gap.patientId)!.items.push({ ...gap, isScreening: true });
      }

      const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
      const grouped = Array.from(patientMap.values())
        .sort((a, b) => (priorityOrder[a.maxPriority] ?? 3) - (priorityOrder[b.maxPriority] ?? 3));
      setUrgentItems(grouped.slice(0, 8));

      // Сегодня
      const today = new Date().toISOString().split('T')[0];
      setTodayPatients(patients.filter(p => p.lastVisitDate === today));

      // Тепловая карта (только для вкладки "Участок")
      const heatmapData: { label: string; total: number; covered: number }[] = [];
      for (const filter of CHRONIC_FILTERS.slice(0, 6)) {
        try {
          const codes = patientSearchService.getCodesForFilter(filter.label);
          const filtered = await patientSearchService.findByDiagnosis(codes);
          const total = filtered.length;
          let covered = 0;
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          for (const p of filtered) {
            const hasRecent = allEvents.some(e =>
              e.patientId === p.id && new Date(e.timestamp) > sixMonthsAgo &&
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

  const priorityColor = (p: string) => {
    switch (p) {
      case 'P0': return { bg: '#fee2e2', text: '#991b1b' };
      case 'P1': return { bg: '#fef3c7', text: '#92400e' };
      default: return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const activePatients = patients.filter(p => !p.isArchived && !p.isDeceased).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Дашборд</h1>
        <div className="flex gap-2">
          <button onClick={() => setTab('today')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'today' ? 'var(--color-primary)' : 'transparent',
              color: tab === 'today' ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
              border: tab === 'today' ? 'none' : '1px solid var(--color-border)',
            }}>📅 Сегодня</button>
          <button onClick={() => setTab('district')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: tab === 'district' ? 'var(--color-primary)' : 'transparent',
              color: tab === 'district' ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
              border: tab === 'district' ? 'none' : '1px solid var(--color-border)',
            }}>📊 Участок</button>
        </div>
      </div>

      {tab === 'today' ? (
        <div className="space-y-6">
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
                urgentItems.map(patient => {
                  const pc = priorityColor(patient.maxPriority);
                  const isExpanded = expandedPatient === patient.patientId;
                  return (
                    <div key={patient.patientId}>
                      <div
                        onClick={() => setExpandedPatient(isExpanded ? null : patient.patientId)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors"
                      >
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: pc.bg, color: pc.text }}>
                          {patient.maxPriority}
                        </span>
                        <span className="text-sm font-medium flex-1" style={{ color: 'var(--color-foreground)' }}>
                          {patient.patientName}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {patient.items.length} {patient.items.length === 1 ? 'направление' : patient.items.length <= 4 ? 'направления' : 'направлений'}
                        </span>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                      {isExpanded && (
                        <div className="px-4 pb-3 space-y-1.5">
                          {patient.items.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 ml-8 text-xs">
                              <span style={{ color: item.isScreening ? '#f59e0b' : 'var(--color-muted-foreground)' }}>
                                {item.isScreening ? '🔬' : '📋'}
                              </span>
                              <span className="flex-1 truncate" style={{ color: 'var(--color-foreground)' }}>{item.description}</span>
                              <button onClick={(e) => { e.stopPropagation(); handleAddResult(item); }}
                                className="px-2 py-0.5 rounded text-xs font-medium"
                                style={{ backgroundColor: '#10b981', color: 'white' }}>Внести</button>
                              <button onClick={(e) => { e.stopPropagation(); handleOpenVisit(item.patientId); }}
                                className="px-2 py-0.5 rounded text-xs border"
                                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Приём</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 🟡 Сегодня на приёме */}
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <Calendar size={16} style={{ color: '#f59e0b' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>🟡 Сегодня на приёме</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>{todayPatients.length}</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {todayPatients.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Нет записей</div>
              ) : (
                todayPatients.slice(0, 5).map(p => (
                  <div key={p.id} className="px-4 py-3 hover:bg-muted/20 cursor-pointer flex items-center justify-between"
                    onClick={() => handleOpenVisit(p.id)}>
                    <div>
                      <div className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{p.lastName} {p.firstName}</div>
                      <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{calculateAge(p.birthDate)} лет • {p.emiasCode}</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Начать приём</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Статистика */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{weeklyStats.visits}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Приёмов за неделю</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{weeklyStats.results}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Результатов за неделю</div>
            </div>
            <div className="p-4 rounded-xl border text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>{activePatients}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Пациентов на участке</div>
            </div>
          </div>

          {/* Тепловая карта */}
          {heatmap.length > 0 && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <Users size={16} style={{ color: '#8b5cf6' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>🗺️ Охват по ХНИЗ</h2>
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
        </div>
      )}

      <ResultEntryModal isOpen={resultModal.isOpen} onClose={() => { setResultModal({ isOpen: false }); loadData(); }}
        patientId={resultModal.patientId} prefilled={resultModal.prefilled} />
      <LabResultEntryModal isOpen={showLabModal} onClose={() => { setShowLabModal(false); loadData(); }} />
    </div>
  );
}