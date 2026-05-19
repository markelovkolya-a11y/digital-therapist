// features/visit-protocol/components/ContextColumn.tsx
// v2.5.0 — Дневник проблем + шкалы CHA₂DS₂-VASc/HAS-BLED

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@core/store';
import { eventRepo } from '@core/database/repositories';
import { waitingService, WaitingItemFull } from '@core/services/waiting.service';
import { getScreeningStatus, ScreeningItem } from '@core/services/screening.service';
import { problemsRepo } from '@core/database/repositories/problems.repo';
import { ClinicalEvent } from '@core/types/events';
import { Problem } from '@core/types/problems';
import { calculateAge, formatDateRu, isOverdue, todayString } from '@core/utils/date';
import { calculateBMI, calculateEGFR, getTargetBP, calculateCHA2DS2VASc, calculateHASBLED } from '@core/utils/medicalUtils';
import { Calendar, Activity, Pill, AlertTriangle, ChevronRight, FlaskConical, Stethoscope, Calculator, Heart } from 'lucide-react';
import { ResultEntryModal } from '@/features/shared/ResultEntryModal';
import { LabResultEntryModal } from '@/features/shared/LabResultEntryModal';

export function ContextColumn() {
  const currentVisit = useAppStore(s => s.currentVisit);
  const patients = useAppStore(s => s.patients);
  const updateExaminationPlan = useAppStore(s => s.updateExaminationPlan);
  
  const [events, setEvents] = useState<ClinicalEvent[]>([]);
  const [screeningItems, setScreeningItems] = useState<ScreeningItem[]>([]);
  const [waitingItems, setWaitingItems] = useState<WaitingItemFull[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [labModal, setLabModal] = useState(false);
  const [instrumentalModal, setInstrumentalModal] = useState<{ isOpen: boolean; waitingItem?: WaitingItemFull }>({ isOpen: false });
  const [toast, setToast] = useState<string | null>(null);
  const [addedToPlan, setAddedToPlan] = useState<Set<string>>(new Set());
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [newProblemTitle, setNewProblemTitle] = useState('');
  
  const needsReload = useRef(false);
  const selectedPatient = patients.find(p => p.id === currentVisit?.patientId);

  const loadData = useCallback(async () => {
    if (!currentVisit?.patientId) return;
    setLoading(true);
    try {
      const [allEvents, waiting, problemsData] = await Promise.all([
        eventRepo.findByPatient(currentVisit.patientId, 100),
        waitingService.getByPatient(currentVisit.patientId),
        problemsRepo.findActive(currentVisit.patientId),
      ]);
      setEvents(allEvents);
      setWaitingItems(waiting);
      setProblems(problemsData);

      if (selectedPatient) {
        setScreeningItems(getScreeningStatus(selectedPatient, allEvents));
      }
      needsReload.current = false;
    } catch (e) {
      console.error('Ошибка загрузки контекста:', e);
    } finally {
      setLoading(false);
    }
  }, [currentVisit?.patientId, selectedPatient]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handleFocus = () => { if (needsReload.current) loadData(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  useEffect(() => {
    if (currentVisit?.status === 'completed') {
      needsReload.current = true;
      loadData();
    }
  }, [currentVisit?.status]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const handleAddToPlan = (item: ScreeningItem) => {
    if (!currentVisit) return;
    const category: 'instrumental' | 'labTests' = 
      ['mammography', 'fluorography', 'colonoscopy'].includes(item.type) ? 'instrumental' : 'labTests';
    const current = currentVisit.examinationPlan[category];
    if (!current.includes(item.name)) {
      updateExaminationPlan({ [category]: [...current, item.name] });
      setAddedToPlan(prev => new Set([...prev, item.id]));
      showToast(`✅ ${item.name} добавлен в план`);
      setTimeout(() => {
        setAddedToPlan(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      }, 2000);
    }
  };

  const handleAddResult = (item: WaitingItemFull) => {
    const desc = item.description.toLowerCase();
    if (item.type === 'обследование' && (
      desc.includes('анализ') || desc.includes('оак') || desc.includes('оам') ||
      desc.includes('биохимия') || desc.includes('липид') || desc.includes('глюкоза') ||
      desc.includes('hba1c') || desc.includes('холестерин')
    )) {
      setLabModal(true);
    } else {
      setInstrumentalModal({ isOpen: true, waitingItem: item });
    }
  };

  const handleModalClose = () => {
    setLabModal(false);
    setInstrumentalModal({ isOpen: false });
    needsReload.current = true;
    setTimeout(() => loadData(), 300);
  };

  const handleAddProblem = async () => {
    if (!newProblemTitle.trim() || !currentVisit) return;
    await problemsRepo.create({
      patientId: currentVisit.patientId,
      title: newProblemTitle.trim(),
      status: 'active',
      startedAt: todayString(),
      resolvedAt: null,
    });
    setNewProblemTitle('');
    setShowAddProblem(false);
    const updated = await problemsRepo.findActive(currentVisit.patientId);
    setProblems(updated);
  };

  const handleResolveProblem = async (id: string) => {
    await problemsRepo.updateStatus(id, 'resolved');
    if (currentVisit) {
      const updated = await problemsRepo.findActive(currentVisit.patientId);
      setProblems(updated);
    }
  };

  if (!currentVisit || !selectedPatient) return null;

  const groupedEvents = events.reduce((acc, event) => {
    const date = event.timestamp;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, ClinicalEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));
  const activeDiagnoses = events.filter(e => e.type === 'diagnosis_established').slice(0, 5);
  const lastVitals = events.filter(e => e.type === 'vital_signs').slice(0, 1);
  const lastPrescriptions = events.filter(e => e.type === 'prescription').slice(0, 5);
  const lastResults = events
    .filter(e => ['lab_result', 'imaging_result', 'screening_performed'].includes(e.type))
    .slice(0, 5);

  // Предиктивные шкалы
  const bmi = (() => {
    const height = currentVisit.vitals.height;
    const weight = currentVisit.vitals.weight;
    if (height > 0 && weight > 0) return calculateBMI(height, weight);
    const anthroEvent = events.find(e => e.type === 'anthropometry');
    if (anthroEvent) {
      const h = Number(anthroEvent.parameters.find(p => p.key === 'height')?.value);
      const w = Number(anthroEvent.parameters.find(p => p.key === 'weight')?.value);
      if (h > 0 && w > 0) return calculateBMI(h, w);
    }
    return null;
  })();

  const egfr = (() => {
    const creatinine = currentVisit.vitals.creatinine;
    if (creatinine && creatinine > 0) {
      return calculateEGFR(creatinine, calculateAge(selectedPatient.birthDate), selectedPatient.gender === 'female');
    }
    const lastCreatinine = events
      .filter(e => e.type === 'lab_result')
      .flatMap(e => e.parameters)
      .find(p => p.key === 'creatinine' && p.value);
    if (lastCreatinine) {
      return calculateEGFR(Number(lastCreatinine.value), calculateAge(selectedPatient.birthDate), selectedPatient.gender === 'female');
    }
    return null;
  })();

  const icdCodes = activeDiagnoses
    .map(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || ''))
    .filter(Boolean);
  const targetBP = getTargetBP(icdCodes);

  // Шкалы при ФП
  const hasAtrialFibrillation = activeDiagnoses.some(d => {
    const code = String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '');
    return code.startsWith('I48');
  });

  const cha2ds2vasc = hasAtrialFibrillation ? calculateCHA2DS2VASc(
    calculateAge(selectedPatient.birthDate),
    selectedPatient.gender === 'female',
    activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I50')),
    activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I10') || String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I11')),
    activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('E11')),
    activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I63')),
    activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I25') || String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I20'))
  ) : null;

  const hasbled = hasAtrialFibrillation ? calculateHASBLED(
    false, 0,
    activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I63')),
    false, false,
    calculateAge(selectedPatient.birthDate) > 65,
    false, false
  ) : null;

  const statusIcon = (status: string) => {
    switch (status) { case 'red': return '🔴'; case 'yellow': return '🟡'; case 'green': return '🟢'; default: return '⬜'; }
  };

  return (
    <div className="p-3 space-y-4 h-full overflow-y-auto text-xs" style={{ backgroundColor: 'var(--color-card)' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg shadow text-xs font-medium"
          style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{toast}</div>
      )}

      {/* Пациент */}
      <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          {selectedPatient.lastName} {selectedPatient.firstName}
        </div>
        <div style={{ color: 'var(--color-muted-foreground)' }}>
          {calculateAge(selectedPatient.birthDate)} лет • {selectedPatient.gender === 'male' ? 'М' : 'Ж'}
        </div>
        <div className="font-mono" style={{ color: 'var(--color-primary)', fontSize: '10px' }}>
          {selectedPatient.emiasCode}
        </div>
      </div>

      {/* Расчётные показатели */}
      {(bmi || egfr || icdCodes.length > 0) && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Calculator size={13} style={{ color: '#8b5cf6' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Расчётные показатели</span>
          </div>
          <div className="space-y-1">
            {bmi && (
              <div className="flex items-center gap-1">
                <span style={{ color: bmi.color, fontSize: '8px' }}>●</span>
                <span style={{ color: 'var(--color-foreground)' }}>ИМТ: {bmi.value} — {bmi.label}</span>
              </div>
            )}
            {egfr && (
              <div className="flex items-center gap-1">
                <span style={{ color: egfr.color, fontSize: '8px' }}>●</span>
                <span style={{ color: 'var(--color-foreground)' }}>СКФ: {egfr.value} мл/мин</span>
                <div style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>{egfr.stage}</div>
              </div>
            )}
            {icdCodes.length > 0 && (
              <div className="flex items-center gap-1">
                <span style={{ color: '#3b82f6', fontSize: '8px' }}>●</span>
                <span style={{ color: 'var(--color-foreground)' }}>{targetBP.label}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Шкалы при ФП */}
      {hasAtrialFibrillation && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Heart size={13} style={{ color: '#ef4444' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Риски при ФП</span>
          </div>
          <div className="space-y-1">
            {cha2ds2vasc && (
              <div>
                <div className="flex items-center gap-1">
                  <span style={{ color: cha2ds2vasc.color, fontSize: '8px' }}>●</span>
                  <span style={{ color: 'var(--color-foreground)' }}>
                    CHA₂DS₂-VASc: {cha2ds2vasc.score} б. — {cha2ds2vasc.risk} риск
                  </span>
                </div>
                <div style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>{cha2ds2vasc.recommendation}</div>
              </div>
            )}
            {hasbled && (
              <div className="flex items-center gap-1">
                <span style={{ color: hasbled.color, fontSize: '8px' }}>●</span>
                <span style={{ color: 'var(--color-foreground)' }}>
                  HAS-BLED: {hasbled.score} б. — {hasbled.risk}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Диспансерный компас */}
      {screeningItems.length > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Stethoscope size={13} style={{ color: '#3b82f6' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Диспансерный компас</span>
          </div>
          <div className="space-y-1">
            {screeningItems.map(item => (
              <div key={item.id} className="flex items-start gap-1.5">
                <span>{statusIcon(item.status)}</span>
                <div className="flex-1 min-w-0">
                  <div style={{ color: 'var(--color-foreground)' }}>{item.name}</div>
                  {item.lastPerformed && (
                    <div style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>{formatDateRu(item.lastPerformed)}</div>
                  )}
                  {item.action !== 'none' && (
                    <button onClick={() => handleAddToPlan(item)}
                      className="mt-0.5 px-1.5 py-0.5 rounded text-xs"
                      style={{ backgroundColor: addedToPlan.has(item.id) ? '#10b981' : 'var(--color-primary)', color: 'white' }}>
                      {addedToPlan.has(item.id) ? '✓ Добавлено' : 'Назначить'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Активные направления */}
      {waitingItems.length > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FlaskConical size={13} style={{ color: '#f59e0b' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Активные направления</span>
            <span className="ml-auto px-1.5 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--color-muted)' }}>{waitingItems.length}</span>
          </div>
          <div className="space-y-1">
            {waitingItems.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-start gap-1.5">
                <span style={{ color: item.priority === 'P0' ? '#ef4444' : item.priority === 'P1' ? '#f59e0b' : 'var(--color-muted-foreground)' }}>{item.priority}</span>
                <div className="flex-1 min-w-0">
                  <div style={{ color: 'var(--color-foreground)' }}>{item.description}</div>
                  {item.deadline && (
                    <div style={{ color: isOverdue(item.deadline) ? '#ef4444' : 'var(--color-muted-foreground)', fontSize: '10px' }}>До: {formatDateRu(item.deadline)}</div>
                  )}
                  <button onClick={() => handleAddResult(item)}
                    className="mt-0.5 px-1.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: '#10b981', color: 'white' }}>Внести результат</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Дневник проблем */}
      <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <AlertTriangle size={13} style={{ color: '#ef4444' }} />
          <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Дневник проблем</span>
          <button onClick={() => setShowAddProblem(!showAddProblem)}
            className="ml-auto text-xs px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>+</button>
        </div>
        {showAddProblem && (
          <div className="flex gap-1 mb-2">
            <input type="text" value={newProblemTitle} onChange={e => setNewProblemTitle(e.target.value)}
              placeholder="Название проблемы" onKeyDown={e => { if (e.key === 'Enter') handleAddProblem(); }}
              className="flex-1 px-2 py-1 rounded border text-xs"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            <button onClick={handleAddProblem}
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>OK</button>
          </div>
        )}
        {problems.length === 0 ? (
          <div style={{ color: 'var(--color-muted-foreground)' }}>Нет активных проблем</div>
        ) : (
          <div className="space-y-1">
            {problems.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-start gap-1.5">
                <span style={{ color: p.status === 'active' ? '#ef4444' : '#f59e0b', fontSize: '8px' }}>●</span>
                <div className="flex-1 min-w-0">
                  <div style={{ color: 'var(--color-foreground)' }}>{p.title}</div>
                  <div style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>
                    {formatDateRu(p.startedAt)}
                    {p.icdCode && <span className="ml-1 font-mono">({p.icdCode})</span>}
                  </div>
                  <button onClick={() => handleResolveProblem(p.id)}
                    className="mt-0.5 text-xs" style={{ color: '#10b981' }}>✓ Решено</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Последние результаты */}
      {lastResults.length > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Activity size={13} style={{ color: '#10b981' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Последние результаты</span>
          </div>
          <div className="space-y-1">
            {lastResults.map(r => (
              <div key={r.id}>
                <div style={{ color: 'var(--color-foreground)' }}>
                  {r.parameters.find(p => p.key === 'report_name')?.value || r.title}
                </div>
                <div style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>{formatDateRu(r.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Диагнозы */}
      {activeDiagnoses.length > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Activity size={13} style={{ color: 'var(--color-primary)' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Диагнозы</span>
          </div>
          {activeDiagnoses.map(d => (
            <div key={d.id}>
              <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
                {d.parameters.find(p => p.key === 'diagnosis_code')?.value}
              </span>
              <span className="ml-1" style={{ color: 'var(--color-muted-foreground)' }}>{d.title?.substring(0, 35)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Витальные */}
      {lastVitals.length > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>Показатели</div>
          {lastVitals.map(v => {
            const sbp = v.parameters.find(p => p.key === 'systolic_bp')?.value;
            const dbp = v.parameters.find(p => p.key === 'diastolic_bp')?.value;
            const hr = v.parameters.find(p => p.key === 'heart_rate')?.value;
            return (
              <div key={v.id}>
                {sbp && dbp && <div>АД: {sbp}/{dbp}</div>}
                {hr && <div>ЧСС: {hr}</div>}
                <div style={{ fontSize: '10px', color: 'var(--color-muted-foreground)' }}>{formatDateRu(v.timestamp)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Назначения */}
      {lastPrescriptions.length > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Pill size={13} style={{ color: '#f59e0b' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Назначения</span>
          </div>
          {lastPrescriptions.map(p => {
            const name = p.parameters.find(pr => pr.key === 'drug_name')?.value;
            const dose = p.parameters.find(pr => pr.key === 'drug_dose')?.value;
            return (
              <div key={p.id}>
                {name} {dose}
                <div style={{ fontSize: '10px', color: 'var(--color-muted-foreground)' }}>{formatDateRu(p.timestamp)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* История */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Calendar size={13} style={{ color: 'var(--color-muted-foreground)' }} />
          <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>История визитов</span>
        </div>
        {loading ? (
          <div style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
        ) : sortedDates.length === 0 ? (
          <div style={{ color: 'var(--color-muted-foreground)' }}>Нет данных</div>
        ) : (
          <div className="space-y-1.5">
            {sortedDates.slice(0, 8).map(date => (
              <div key={date}>
                <div className="font-medium" style={{ color: 'var(--color-foreground)' }}>{formatDateRu(date)}</div>
                {groupedEvents[date].slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-start gap-1 ml-1 mt-0.5">
                    <ChevronRight size={9} className="mt-0.5 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
                    <span style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>{event.title?.substring(0, 40)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модалки */}
      <LabResultEntryModal isOpen={labModal} onClose={handleModalClose} />
      <ResultEntryModal
        isOpen={instrumentalModal.isOpen}
        onClose={handleModalClose}
        patientId={currentVisit.patientId}
        prefilled={instrumentalModal.waitingItem ? {
          waitingItemId: instrumentalModal.waitingItem.id,
          type: instrumentalModal.waitingItem.type === 'обследование' ? 'imaging' : 'consultation',
          name: instrumentalModal.waitingItem.description,
        } : undefined}
      />
    </div>
  );
}