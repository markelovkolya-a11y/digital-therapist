// features/visit-protocol/components/ContextColumn.tsx
// v2.8.4 — Полный маппинг параметров, правильные дельты, tooltip без дублей

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@core/store';
import { eventRepo } from '@core/database/repositories';
import { waitingService, WaitingItemFull } from '@core/services/waiting.service';
import { getScreeningStatus, ScreeningItem } from '@core/services/screening.service';
import { problemsRepo } from '@core/database/repositories/problems.repo';
import { ClinicalEvent } from '@core/types/events';
import { Problem } from '@core/types/problems';
import { calculateAge, formatDateRu, todayString } from '@core/utils/date';
import { calculateBMI, calculateEGFR, getTargetBP, calculateCHA2DS2VASc, calculateHASBLED } from '@core/utils/medicalUtils';
import { Calendar, AlertTriangle, FlaskConical, Stethoscope, Calculator, Heart, Pill, Activity } from 'lucide-react';
import { ResultEntryModal } from '@/features/shared/ResultEntryModal';
import { LabResultEntryModal } from '@/features/shared/LabResultEntryModal';

// Полный маппинг технических ключей на русские названия
const PARAM_LABELS: Record<string, string> = {
  // Витальные
  systolic_bp: 'САД', diastolic_bp: 'ДАД', heart_rate: 'ЧСС',
  respiratory_rate: 'ЧДД', spo2: 'SpO₂', temperature: 't°',
  height: 'Рост', weight: 'Вес', bmi: 'ИМТ',
  // ОАК
  hemoglobin: 'Hb', erythrocytes: 'Эритроциты', leukocytes: 'Лейкоциты',
  platelets: 'Тромбоциты', esr: 'СОЭ', hematocrit: 'Гематокрит',
  mcv: 'MCV', mch: 'MCH', neutrophils: 'Нейтрофилы',
  lymphocytes: 'Лимфоциты', monocytes: 'Моноциты',
  eosinophils: 'Эозинофилы', basophils: 'Базофилы',
  // Биохимия
  glucose: 'Глюкоза', creatinine: 'Креатинин', urea: 'Мочевина',
  alt: 'АЛТ', ast: 'АСТ', total_bilirubin: 'Билирубин общ.',
  total_protein: 'Общий белок', uric_acid: 'Мочевая кислота',
  potassium: 'K⁺', sodium: 'Na⁺', chloride: 'Cl⁻',
  // Липиды
  total_cholesterol: 'ОХС', ldl: 'ЛПНП', hdl: 'ЛПВП',
  triglycerides: 'Триглицериды', vldl: 'ЛПОНП',
  // Коагулограмма
  pt: 'ПВ', inr: 'МНО', aptt: 'АЧТВ', fibrinogen: 'Фибриноген',
  d_dimer: 'D-димер',
  // Гормоны
  tsh: 'ТТГ',
  // ОАМ
  urine_protein: 'Белок', urine_glucose: 'Глюкоза',
  urine_wbc: 'Лейкоциты', urine_rbc: 'Эритроциты',
  // Специфичные
  hba1c: 'HbA1c', glucose_fasting: 'Глюкоза натощак',
  waist_circumference: 'Окружность талии',
};

function paramLabel(key: string): string {
  return PARAM_LABELS[key] || key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
}

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
  const [addedToPlan, setAddedToPlan] = useState<Set<string>>(new Set());
  const needsReload = useRef(false);

  const selectedPatient = patients.find(p => p.id === currentVisit?.patientId);

  const loadData = useCallback(async () => {
    if (!currentVisit?.patientId) return;
    setLoading(true);
    try {
      const [allEvents, waiting, problemsData] = await Promise.all([
        eventRepo.findByPatient(currentVisit.patientId, 150),
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

  const handleAddToPlan = (item: ScreeningItem) => {
    if (!currentVisit) return;
    const category: 'instrumental' | 'labTests' =
      ['mammography', 'fluorography', 'colonoscopy'].includes(item.type)
        ? 'instrumental' : 'labTests';
    const current = currentVisit.examinationPlan[category];
    if (!current.includes(item.name)) {
      updateExaminationPlan({ [category]: [...current, item.name] });
      setAddedToPlan(prev => new Set([...prev, item.id]));
      setTimeout(() => {
        setAddedToPlan(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }, 2000);
    }
  };

  const handleAddResult = (item: WaitingItemFull) => {
    const desc = item.description.toLowerCase();
    if (
      item.type === 'обследование' &&
      (desc.includes('анализ') || desc.includes('оак') || desc.includes('оам') ||
       desc.includes('биохимия') || desc.includes('липид') || desc.includes('глюкоза') ||
       desc.includes('hba1c') || desc.includes('холестерин'))
    ) {
      setLabModal(true);
    } else {
      setInstrumentalModal({ isOpen: true, waitingItem: item });
    }
  };

  const handleModalClose = () => {
    setLabModal(false);
    setInstrumentalModal({ isOpen: false });
    needsReload.current = true;
    setTimeout(() => loadData(), 500);
  };

  const handleResolveProblem = async (id: string) => {
    await problemsRepo.updateStatus(id, 'resolved');
    if (currentVisit) {
      setProblems(await problemsRepo.findActive(currentVisit.patientId));
    }
  };

  if (!currentVisit || !selectedPatient) return null;

  // ====== ДАННЫЕ ======

  // Активные диагнозы
  const activeDiagnoses = events
    .filter(e => e.type === 'diagnosis_established')
    .slice(0, 5);

  // Последние витальные (предыдущий визит, не текущий)
  const previousVitals = events
    .filter(e => e.type === 'vital_signs' && e.timestamp !== currentVisit.date)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  // Текущая терапия (уникальные препараты из последних назначений)
  const lastPrescriptions = events
    .filter(e => e.type === 'prescription')
    .slice(0, 10);

  const uniqueMeds = new Map<string, string>();
  lastPrescriptions.forEach(p => {
    const name = String(p.parameters.find(pr => pr.key === 'drug_name')?.value || '');
    const dose = String(p.parameters.find(pr => pr.key === 'drug_dose')?.value || '');
    if (name && !uniqueMeds.has(name)) {
      uniqueMeds.set(name, dose);
    }
  });

  // Последние результаты
  const lastResults = events
    .filter(e => ['lab_result', 'imaging_result', 'screening_performed'].includes(e.type))
    .slice(0, 5);

  const resultSummary = lastResults.map(r => {
    const name = String(r.parameters.find(p => p.key === 'report_name')?.value || r.title || '');
    const conclusion = r.parameters.find(p => p.key === 'conclusion')?.value;
    const allParams = r.parameters
      .filter(p => !['report_name', 'conclusion', 'screening_type', 'performed_by'].includes(p.key))
      .filter(p => p.value !== '' && p.value !== null && p.value !== undefined)
      .map(p => `${paramLabel(p.key)}: ${p.value} ${p.unit || ''}`.trim());
    const tooltip = [name, ...allParams, conclusion ? `Заключение: ${conclusion}` : '']
      .filter(Boolean).join('\n');
    return { name, date: r.timestamp, allParams: allParams.slice(0, 3), tooltip };
  });

  // ====== ПРЕДИКТИВНЫЕ ШКАЛЫ ======

  const bmi = (() => {
    const h = currentVisit.vitals.height;
    const w = currentVisit.vitals.weight;
    if (h > 0 && w > 0) return calculateBMI(h, w);
    const anthro = events.find(e => e.type === 'anthropometry');
    if (anthro) {
      const ah = Number(anthro.parameters.find(p => p.key === 'height')?.value);
      const aw = Number(anthro.parameters.find(p => p.key === 'weight')?.value);
      if (ah > 0 && aw > 0) return calculateBMI(ah, aw);
    }
    return null;
  })();

  const egfr = (() => {
    const cr = currentVisit.vitals.creatinine;
    if (cr && cr > 0) {
      return calculateEGFR(cr, calculateAge(selectedPatient.birthDate), selectedPatient.gender === 'female');
    }
    const lastCr = events
      .filter(e => e.type === 'lab_result')
      .flatMap(e => e.parameters)
      .find(p => p.key === 'creatinine' && p.value);
    if (lastCr) {
      return calculateEGFR(
        Number(lastCr.value),
        calculateAge(selectedPatient.birthDate),
        selectedPatient.gender === 'female'
      );
    }
    return null;
  })();

  const icdCodes = activeDiagnoses
    .map(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || ''))
    .filter(Boolean);
  const targetBP = getTargetBP(icdCodes);

  const hasAF = activeDiagnoses.some(d =>
    String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I48')
  );

  const cha2ds2vasc = hasAF
    ? calculateCHA2DS2VASc(
        calculateAge(selectedPatient.birthDate),
        selectedPatient.gender === 'female',
        activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I50')),
        activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I10') || String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I11')),
        activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('E11')),
        activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I63')),
        activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I25') || String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I20'))
      )
    : null;

  const hasbled = hasAF
    ? calculateHASBLED(
        false, 0,
        activeDiagnoses.some(d => String(d.parameters.find(p => p.key === 'diagnosis_code')?.value || '').startsWith('I63')),
        false, false,
        calculateAge(selectedPatient.birthDate) > 65,
        false, false
      )
    : null;

  // ====== ИСТОРИЯ ВИЗИТОВ ======

  const visitDates = [...new Set(
    events.filter(e => e.type === 'visit_note').map(e => e.timestamp)
  )]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 8);

  const getVisitTooltip = (date: string): string => {
    const diag = events.find(e => e.type === 'diagnosis_established' && e.timestamp === date);
    const complaints = events.find(e => e.type === 'symptom_reported' && e.timestamp === date);
    const presc = events.filter(e => e.type === 'prescription' && e.timestamp === date);
    const parts: string[] = [];
    if (diag) {
      const code = diag.parameters.find(p => p.key === 'diagnosis_code')?.value;
      const name = diag.parameters.find(p => p.key === 'diagnosis_name')?.value || diag.title;
      parts.push(`Диагноз: ${code} ${name}`);
    }
    if (complaints) {
      try {
        const c = JSON.parse(String(complaints.parameters.find(p => p.key === 'complaints_json')?.value || '[]'));
        if (c.length > 0) parts.push('Жалобы: ' + c.map((x: any) => x.name).join(', '));
      } catch {}
    }
    if (presc.length > 0) {
      parts.push('Назначено: ' + presc.map(p => p.parameters.find(pr => pr.key === 'drug_name')?.value).filter(Boolean).join(', '));
    }
    return parts.join('\n');
  };

  const getDiagForDate = (date: string) =>
    events.find(e => e.type === 'diagnosis_established' && e.timestamp === date);

  // ====== РЕНДЕР ======

  const statusIcon = (s: string) => {
    switch (s) {
      case 'red': return '🔴';
      case 'yellow': return '🟡';
      case 'green': return '🟢';
      default: return '⬜';
    }
  };

  return (
    <div className="p-3 space-y-3 h-full overflow-y-auto text-xs" style={{ backgroundColor: 'var(--color-card)' }}>
      {/* 1. Пациент */}
      <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
          {selectedPatient.lastName} {selectedPatient.firstName}
        </div>
        <div style={{ color: 'var(--color-muted-foreground)' }}>
          {calculateAge(selectedPatient.birthDate)} лет • {selectedPatient.gender === 'male' ? 'М' : 'Ж'}
        </div>
      </div>

      {/* 2. Ключевые показатели */}
      {(bmi || egfr || icdCodes.length > 0 || hasAF) && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Calculator size={12} style={{ color: '#8b5cf6' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Показатели</span>
          </div>
          <div className="space-y-0.5">
            {bmi && (
              <div><span style={{ color: bmi.color }}>●</span> ИМТ {bmi.value} — {bmi.label}</div>
            )}
            {egfr && (
              <div><span style={{ color: egfr.color }}>●</span> СКФ {egfr.value} мл/мин ({egfr.stage})</div>
            )}
            {icdCodes.length > 0 && (
              <div><span style={{ color: '#3b82f6' }}>●</span> {targetBP.label}</div>
            )}
            {cha2ds2vasc && (
              <div title={`CHA₂DS₂-VASc: ${cha2ds2vasc.score} баллов\n${cha2ds2vasc.recommendation}`} className="cursor-help">
                <span style={{ color: cha2ds2vasc.color }}>●</span> CHA₂DS₂-VASc {cha2ds2vasc.score} б. — {cha2ds2vasc.risk}
              </div>
            )}
            {hasbled && (
              <div><span style={{ color: hasbled.color }}>●</span> HAS-BLED {hasbled.score} б. — {hasbled.risk}</div>
            )}
          </div>
        </div>
      )}

      {/* 3. Требует внимания */}
      {(screeningItems.filter(s => s.action !== 'none').length > 0 || waitingItems.length > 0 || problems.length > 0) && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle size={12} style={{ color: '#ef4444' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Внимание</span>
            <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
              {screeningItems.filter(s => s.action !== 'none').length + waitingItems.length + problems.length}
            </span>
          </div>
          <div className="space-y-1">
            {screeningItems.filter(s => s.action !== 'none').slice(0, 2).map(item => (
              <div key={item.id} className="flex items-center gap-1">
                <span>{statusIcon(item.status)}</span>
                <span className="flex-1 truncate">{item.name}</span>
                <button onClick={() => handleAddToPlan(item)}
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: addedToPlan.has(item.id) ? '#10b981' : 'var(--color-primary)', color: 'white' }}>
                  {addedToPlan.has(item.id) ? '✓' : '+'}
                </button>
              </div>
            ))}
            {waitingItems.slice(0, 2).map(item => (
              <div key={item.id} className="flex items-center gap-1">
                <span style={{ color: item.priority === 'P0' ? '#ef4444' : '#f59e0b' }}>{item.priority}</span>
                <span className="flex-1 truncate">{item.description}</span>
                <button onClick={() => handleAddResult(item)}
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ backgroundColor: '#10b981', color: 'white' }}>✓</button>
              </div>
            ))}
            {problems.slice(0, 2).map(p => (
              <div key={p.id} className="flex items-center gap-1">
                <span style={{ color: '#ef4444' }}>●</span>
                <span className="flex-1 truncate">{p.title}</span>
                <button onClick={() => handleResolveProblem(p.id)}
                  className="text-xs" style={{ color: '#10b981' }}>✓</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Витальные с прошлого визита */}
      {previousVitals && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={12} style={{ color: '#3b82f6' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Витальные</span>
            <span style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}>
              {formatDateRu(previousVitals.timestamp)}
            </span>
          </div>
          <div className="space-y-0.5">
            {['systolic_bp', 'diastolic_bp', 'heart_rate', 'spo2', 'temperature'].map(key => {
              const param = previousVitals.parameters.find(p => p.key === key);
              if (!param) return null;
              const label = paramLabel(key);
              const value = param.value;
              const unit = param.unit || '';
              return (
                <div key={key}>
                  {label}: {value} {unit}
                </div>
              );
            })}
          </div>
        </div>
      )}

            {/* 5. Последние результаты */}
      {lastResults.length > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <FlaskConical size={12} style={{ color: '#10b981' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Результаты</span>
          </div>
          {lastResults.map((r, i) => {
            const name = String(r.parameters.find(p => p.key === 'report_name')?.value || r.title || '');
            const conclusion = String(r.parameters.find(p => p.key === 'conclusion')?.value || '');
            
            // Определяем статус: есть ли патология
            const numericParams = r.parameters.filter(p =>
              !['report_name', 'conclusion', 'screening_type', 'performed_by'].includes(p.key) &&
              typeof p.value === 'number'
            );
            
            // Проверяем, есть ли отклонения (упрощённо: значение < refMin или > refMax)
            const hasAbnormal = numericParams.some(p => {
              if (p.refMin !== undefined && Number(p.value) < p.refMin) return true;
              if (p.refMax !== undefined && Number(p.value) > p.refMax) return true;
              return false;
            });
            
            // Статус: normal / abnormal / unknown
            let status: 'normal' | 'abnormal' | 'unknown' = 'unknown';
            if (numericParams.length > 0) {
              status = hasAbnormal ? 'abnormal' : 'normal';
            } else if (conclusion) {
              const cl = conclusion.toLowerCase();
              if (cl.includes('патолог') || cl.includes('отклонен') || cl.includes('нарушен')) {
                status = 'abnormal';
              } else if (cl.includes('норм') || cl.includes('без патолог') || cl.includes('не изменен')) {
                status = 'normal';
              }
            }
            
            const statusIcon = status === 'abnormal' ? '🔴' : status === 'normal' ? '🟢' : '⬜';
            
            // Tooltip: все параметры + заключение
            const allParams = r.parameters
              .filter(p => !['report_name', 'conclusion', 'screening_type', 'performed_by'].includes(p.key))
              .filter(p => p.value !== '' && p.value !== null && p.value !== undefined)
              .map(p => {
                const label = paramLabel(p.key);
                const val = typeof p.value === 'number' ? p.value : p.value;
                const unit = p.unit || '';
                let suffix = '';
                if (typeof p.value === 'number' && p.refMin !== undefined && p.refMax !== undefined) {
                  suffix = ` (N: ${p.refMin}-${p.refMax})`;
                  if (Number(p.value) < p.refMin) suffix += ' ↓';
                  else if (Number(p.value) > p.refMax) suffix += ' ↑';
                }
                return `${label}: ${val} ${unit}${suffix}`;
              });
            
            const tooltip = [
              name,
              ...allParams,
              conclusion ? `\nЗаключение: ${conclusion}` : '',
            ].filter(Boolean).join('\n');
            
            // Краткое описание для колонки
            let summary = '';
            if (status === 'abnormal' && numericParams.length > 0) {
              const abnormal = numericParams.filter(p => {
                if (p.refMin !== undefined && Number(p.value) < p.refMin) return true;
                if (p.refMax !== undefined && Number(p.value) > p.refMax) return true;
                return false;
              });
              summary = abnormal.map(p => paramLabel(p.key)).join(', ') + ' — отклонение';
            } else if (status === 'abnormal' && conclusion) {
              summary = conclusion.substring(0, 40);
            } else if (status === 'normal') {
              summary = conclusion ? conclusion.substring(0, 40) : 'без патологии';
            } else {
              summary = conclusion ? conclusion.substring(0, 40) : 'выполнено';
            }

            return (
              <div key={i} title={tooltip} className="cursor-help">
                <div className="flex items-center gap-1">
                  <span>{statusIcon}</span>
                  <span style={{ color: 'var(--color-foreground)' }}>{name}</span>
                </div>
                <div style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }} className="ml-4">
                  {summary}
                </div>
                <div style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }} className="ml-4">
                  {formatDateRu(r.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Текущая терапия */}
      {uniqueMeds.size > 0 && (
        <div className="pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Pill size={12} style={{ color: '#f59e0b' }} />
            <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Терапия</span>
          </div>
          {Array.from(uniqueMeds.entries()).slice(0, 5).map(([name, dose]) => (
            <div key={name} style={{ color: 'var(--color-foreground)' }}>
              {name} {dose}
            </div>
          ))}
          {uniqueMeds.size > 5 && (
            <div style={{ color: 'var(--color-muted-foreground)' }}>
              + ещё {uniqueMeds.size - 5}
            </div>
          )}
        </div>
      )}

      {/* 7. История визитов */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Calendar size={12} style={{ color: 'var(--color-muted-foreground)' }} />
          <span className="font-semibold" style={{ color: 'var(--color-foreground)' }}>История</span>
        </div>
        {loading ? (
          <div style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
        ) : visitDates.length === 0 ? (
          <div style={{ color: 'var(--color-muted-foreground)' }}>Нет данных</div>
        ) : (
          visitDates.map(date => {
            const diag = getDiagForDate(date);
            const tooltip = getVisitTooltip(date);
            return (
              <div key={date} title={tooltip} className="cursor-help">
                <div className="font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {formatDateRu(date)}
                </div>
                {diag && (
                  <div className="ml-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <span className="font-mono" style={{ color: 'var(--color-primary)' }}>
                      {diag.parameters.find(p => p.key === 'diagnosis_code')?.value}
                    </span>{' '}
                    {String(diag.parameters.find(p => p.key === 'diagnosis_name')?.value || diag.title || '').substring(0, 65)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Модалки */}
      <LabResultEntryModal isOpen={labModal} onClose={handleModalClose} />
      <ResultEntryModal
        isOpen={instrumentalModal.isOpen}
        onClose={handleModalClose}
        patientId={currentVisit.patientId}
        prefilled={
          instrumentalModal.waitingItem
            ? {
                waitingItemId: instrumentalModal.waitingItem.id,
                type: instrumentalModal.waitingItem.type === 'обследование' ? 'imaging' as const : 'consultation' as const,
                name: instrumentalModal.waitingItem.description,
              }
            : undefined
        }
      />
    </div>
  );
}