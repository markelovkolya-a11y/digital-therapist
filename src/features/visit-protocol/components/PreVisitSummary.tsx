// features/visit-protocol/components/PreVisitSummary.tsx
// v1.1.0 — Обновление при возврате, проверка уже добавленных в план

import { useEffect, useState } from 'react';
import { useAppStore } from '@core/store';
import { eventRepo } from '@core/database/repositories';
import { getScreeningStatus, ScreeningItem } from '@core/services/screening.service';
import { waitingService, WaitingItemFull } from '@core/services/waiting.service';
import { ClinicalEvent } from '@core/types/events';
import { calculateAge, formatDateRu } from '@core/utils/date';
import { AlertTriangle, Activity, Pill, FlaskConical, ArrowRight, ClipboardList } from 'lucide-react';

interface PreVisitSummaryProps {
  onStartVisit: () => void;
  onLoadPrevious: () => void;
}

export function PreVisitSummary({ onStartVisit, onLoadPrevious }: PreVisitSummaryProps) {
  const currentVisit = useAppStore(s => s.currentVisit);
  const patients = useAppStore(s => s.patients);
  const updateExaminationPlan = useAppStore(s => s.updateExaminationPlan);

  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [screenings, setScreenings] = useState<ScreeningItem[]>([]);
  const [waitingItems, setWaitingItems] = useState<WaitingItemFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const selectedPatient = patients.find(p => p.id === currentVisit?.patientId);

  // Сброс при смене пациента
  useEffect(() => {
    setAddedItems(new Set());
  }, [currentVisit?.patientId]);

  useEffect(() => {
    if (!currentVisit?.patientId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [allEvents, waiting] = await Promise.all([
          eventRepo.findByPatient(currentVisit.patientId, 50),
          waitingService.getByPatient(currentVisit.patientId),
        ]);
        setEvents(allEvents);
        setWaitingItems(waiting);

        if (selectedPatient) {
          setScreenings(getScreeningStatus(selectedPatient, allEvents));
        }
      } catch (e) {
        console.error('Ошибка загрузки повестки:', e);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentVisit?.patientId]);

  if (!currentVisit || !selectedPatient) return null;

  const lastVisit = events
    .filter(e => e.type === 'visit_note')
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  const lastDiagnoses = events
    .filter(e => e.type === 'diagnosis_established')
    .slice(0, 3);

  const basicTherapy = events
    .filter(e => e.type === 'prescription')
    .filter(e => e.parameters.find(p => p.key === 'drug_is_basic')?.value === '1')
    .slice(0, 5);

  const lastResults = events
    .filter(e => ['lab_result', 'imaging_result'].includes(e.type))
    .slice(0, 3);

  const overdueScreenings = screenings.filter(s => s.action !== 'none');
  const activeWaiting = waitingItems.filter(w => w.status !== 'выполнен');

  const uniqueMeds = new Map<string, string>();
  basicTherapy.forEach(p => {
    const name = p.parameters.find(pr => pr.key === 'drug_name')?.value;
    const dose = p.parameters.find(pr => pr.key === 'drug_dose')?.value;
    if (name && !uniqueMeds.has(String(name))) {
      uniqueMeds.set(String(name), String(dose || ''));
    }
  });

  // Проверка, добавлен ли скрининг в план
  const isInPlan = (item: ScreeningItem): boolean => {
    if (!currentVisit) return false;
    const category: 'instrumental' | 'labTests' = 
      ['mammography', 'fluorography', 'colonoscopy'].includes(item.type) 
        ? 'instrumental' : 'labTests';
    return currentVisit.examinationPlan[category].includes(item.name);
  };

  const handleAddScreeningToPlan = (item: ScreeningItem) => {
    const category: 'instrumental' | 'labTests' = 
      ['mammography', 'fluorography', 'colonoscopy'].includes(item.type) 
        ? 'instrumental' : 'labTests';
    const current = currentVisit.examinationPlan[category];
    if (!current.includes(item.name)) {
      updateExaminationPlan({ [category]: [...current, item.name] });
      setAddedItems(prev => new Set([...prev, item.id]));
      setTimeout(() => {
        setAddedItems(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: 'var(--color-muted-foreground)' }}>Загрузка данных пациента...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="text-center pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--color-foreground)' }}>Перед приёмом</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
          {selectedPatient.lastName} {selectedPatient.firstName}, {calculateAge(selectedPatient.birthDate)} лет
          {lastVisit && <> • Последний приём: {formatDateRu(lastVisit.timestamp)}</>}
        </p>
      </div>

      {lastDiagnoses.length > 0 && (
        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} style={{ color: 'var(--color-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Диагнозы</span>
          </div>
          <div className="space-y-1">
            {lastDiagnoses.map(d => (
              <div key={d.id} className="text-sm">
                <span className="font-mono text-xs" style={{ color: 'var(--color-primary)' }}>
                  {d.parameters.find(p => p.key === 'diagnosis_code')?.value}
                </span>
                <span className="ml-2" style={{ color: 'var(--color-foreground)' }}>
                  {d.parameters.find(p => p.key === 'diagnosis_name')?.value || d.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {uniqueMeds.size > 0 && (
        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Pill size={14} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Базисная терапия</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(uniqueMeds.entries()).map(([name, dose]) => (
              <span key={name} className="px-2.5 py-1.5 rounded-lg text-xs border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                {name} {dose}
              </span>
            ))}
          </div>
        </div>
      )}

      {(overdueScreenings.length > 0 || activeWaiting.length > 0) && (
        <div className="p-4 rounded-xl border" style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
            <span className="text-sm font-semibold" style={{ color: '#991b1b' }}>Требует внимания</span>
          </div>
          <div className="space-y-2">
            {overdueScreenings.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span style={{ color: '#991b1b' }}>
                  {s.name} — {s.status === 'red' ? 'просрочен' : 'рекомендован'}
                </span>
                {isInPlan(s) ? (
                  <span className="px-2.5 py-1 rounded text-xs font-medium shrink-0"
                    style={{ backgroundColor: '#10b981', color: 'white' }}>
                    ✓ В плане
                  </span>
                ) : (
                  <button onClick={() => handleAddScreeningToPlan(s)}
                    className="px-2.5 py-1 rounded text-xs font-medium shrink-0 transition-colors"
                    style={{
                      backgroundColor: addedItems.has(s.id) ? '#10b981' : '#ef4444',
                      color: 'white',
                    }}>
                    {addedItems.has(s.id) ? '✓ Добавлено' : 'Назначить сейчас'}
                  </button>
                )}
              </div>
            ))}
            {activeWaiting.slice(0, 3).map(w => (
              <div key={w.id} className="text-sm" style={{ color: '#991b1b' }}>
                {w.description} — ожидает ({w.priority})
              </div>
            ))}
          </div>
        </div>
      )}

      {lastResults.length > 0 && (
        <div className="p-4 rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical size={14} style={{ color: '#10b981' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Последние результаты</span>
          </div>
          <div className="space-y-1.5">
            {lastResults.map(r => (
              <div key={r.id} className="text-sm">
                <span style={{ color: 'var(--color-foreground)' }}>
                  {r.parameters.find(p => p.key === 'report_name')?.value || r.title}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {formatDateRu(r.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={onStartVisit}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <ClipboardList size={16} />
          Начать приём
        </button>
        {lastVisit && (
          <button onClick={onLoadPrevious}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
            <ArrowRight size={16} />
            Из прошлого визита
          </button>
        )}
      </div>
    </div>
  );
}