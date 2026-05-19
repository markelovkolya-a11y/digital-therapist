// features/shared/ResultEntryModal.tsx
// v2.4.0 — Правильный screening_type для скринингов + создание waitingItem

import { useState, useEffect } from 'react';
import { useAppStore } from '@core/store';
import { eventRepo } from '@core/database/repositories';
import { waitingService } from '@core/services/waiting.service';
import { CreateEventInput, EventParameter } from '@core/types/events';
import { todayString } from '@core/utils/date';
import { X, Save, Search, User, FileText, Stethoscope, Scan } from 'lucide-react';
import { facilitiesRepo } from '@core/database/repositories/facilities.repo';
import { Facility } from '@core/types/facilities';

// Маппинг названий скринингов в коды
const SCREENING_NAME_TO_TYPE: Record<string, string> = {
  'флюорография': 'fluorography',
  'флюор': 'fluorography',
  'маммография': 'mammography',
  'маммо': 'mammography',
  'колоноскопия': 'colonoscopy',
  'колоно': 'colonoscopy',
  'пап-тест': 'pap_test',
  'пап тест': 'pap_test',
  'липидограмма': 'lipids',
  'липид': 'lipids',
  'hba1c': 'hba1c',
};

function getScreeningType(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(SCREENING_NAME_TO_TYPE)) {
    if (lower.includes(key)) return value;
  }
  return lower.replace(/\s+/g, '_');
}

interface ResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  prefilled?: {
    waitingItemId?: string;
    type?: 'lab' | 'imaging' | 'consultation' | 'screening';
    name?: string;
    problemId?: string;
  };
}

export function ResultEntryModal({ isOpen, onClose, patientId: prefilledPatientId, prefilled }: ResultEntryModalProps) {
  const patients = useAppStore(s => s.patients);
  
  const [step, setStep] = useState<'selectPatient' | 'fillForm'>('selectPatient');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [date, setDate] = useState(todayString());
  const [type, setType] = useState<'imaging' | 'consultation' | 'screening'>('imaging');
  const [name, setName] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDate(todayString());
      setConclusion('');
      setRecommendations('');
      setPerformedBy('');
      setSaving(false);
      
      if (prefilledPatientId) {
        setSelectedPatientId(prefilledPatientId);
        setStep('fillForm');
      } else {
        setSelectedPatientId(null);
        setStep('selectPatient');
        setPatientSearch('');
      }

      if (prefilled?.type && prefilled.type !== 'lab') {
        setType(prefilled.type as any);
      } else {
        setType('imaging');
      }
      
      setName(prefilled?.name || '');
      facilitiesRepo.findAll().then(setFacilities);
    }
  }, [isOpen]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const filteredPatients = patients
    .filter(p => !p.isArchived && !p.isDeceased)
    .filter(p => {
      if (!patientSearch.trim()) return true;
      const q = patientSearch.toLowerCase();
      return p.lastName.toLowerCase().includes(q) || p.firstName.toLowerCase().includes(q) || p.emiasCode.toLowerCase().includes(q);
    })
    .slice(0, 10);

  const handleSelectPatient = (patientId: string) => { setSelectedPatientId(patientId); setStep('fillForm'); };

  const handleSave = async () => {
    if (!name.trim() || !selectedPatientId) return;
    setSaving(true);

    try {
      const eventType = type === 'imaging' ? 'imaging_result' : type === 'screening' ? 'screening_performed' : 'lab_result';

      const eventParams: EventParameter[] = [
        { key: 'report_name', value: name.trim(), unit: '' },
        { key: 'conclusion', value: conclusion, unit: '' },
      ];

      if (type === 'consultation') {
        eventParams.push({ key: 'consultation_specialist', value: performedBy || name, unit: '' });
        if (recommendations) eventParams.push({ key: 'recommendations', value: recommendations, unit: '' });
      }

      if (type === 'screening') {
        const screeningType = getScreeningType(name.trim());
        eventParams.push({ key: 'screening_type', value: screeningType, unit: '' });
        console.log('🔍 Скрининг сохранён:', name, '→ тип:', screeningType);
      }

      if (performedBy && type !== 'consultation') {
        eventParams.push({ key: 'performed_by', value: performedBy, unit: '' });
      }

      const event: CreateEventInput = {
        patientId: selectedPatientId,
        type: eventType as any,
        source: 'doctor_measured',
        timestamp: date,
        title: `${type === 'imaging' ? 'Исследование' : type === 'screening' ? 'Скрининг' : 'Консультация'}: ${name}`,
        parameters: eventParams,
      };

      await eventRepo.create(event);

      // Обновляем waitingItem если есть
      if (prefilled?.waitingItemId) {
        await waitingService.updateStatus(prefilled.waitingItemId, 'выполнен');
        console.log('✅ waitingItem выполнен:', prefilled.waitingItemId);
      } else if (type === 'screening') {
        // Создаём запись о выполненном скрининге
        try {
          const patient = patients.find(p => p.id === selectedPatientId);
          await waitingService.create({
            patientId: selectedPatientId,
            patientCode: patient?.emiasCode || '',
            type: 'ДС',
            description: name.trim(),
            priority: 'P2',
            deadline: null,
            status: 'выполнен',
          });
          console.log('✅ waitingItem создан для скрининга:', name);
        } catch (e) {
          console.warn('Не удалось создать waiting_item:', e);
        }
      }

      onClose();
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep('selectPatient');
    setSelectedPatientId(null);
    setPatientSearch('');
    setName('');
    setConclusion('');
    setRecommendations('');
    setPerformedBy('');
  };

  if (!isOpen) return null;

  const typeOptions = [
    { value: 'imaging', label: 'Инструментальное', icon: <Scan size={16} /> },
    { value: 'consultation', label: 'Консультация', icon: <Stethoscope size={16} /> },
    { value: 'screening', label: 'Скрининг', icon: <FileText size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {step === 'selectPatient' ? 'Выберите пациента' : 'Внести результат'}
          </h3>
          <button onClick={() => { handleReset(); onClose(); }} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>

        {step === 'selectPatient' ? (
          <div className="p-4">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
              <input type="text" placeholder="Поиск по фамилии или коду..." value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredPatients.map(p => (
                <button key={p.id} onClick={() => handleSelectPatient(p.id)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-sm hover:bg-muted/30 transition-colors"
                  style={{ color: 'var(--color-foreground)' }}>
                  <User size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                  <span className="font-medium">{p.lastName} {p.firstName}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{p.emiasCode}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-sm pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <User size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-foreground)' }}>{selectedPatient?.lastName} {selectedPatient?.firstName}</span>
              <button onClick={handleReset} className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Сменить</button>
            </div>

            <div>
              <label className="block text-xs mb-1.5">Тип результата</label>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map(opt => (
                  <button key={opt.value} onClick={() => setType(opt.value as any)}
                    className="flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors"
                    style={{
                      borderColor: type === opt.value ? 'var(--color-primary)' : 'var(--color-border)',
                      backgroundColor: type === opt.value ? 'var(--color-primary)' : 'var(--color-background)',
                      color: type === opt.value ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                    }}>
                    <span style={{ color: type === opt.value ? 'var(--color-primary-foreground)' : 'var(--color-primary)' }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1">{type === 'consultation' ? 'Специалист' : 'Название'}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={type === 'consultation' ? 'Кардиолог' : 'ЭхоКГ, МРТ...'}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
              <div>
                <label className="block text-xs mb-1">Дата выполнения</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
            </div>

            {type !== 'consultation' && (
              <div>
                <label className="block text-xs mb-1">Где выполнено</label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {facilities.slice(0, 8).map(f => (
                    <button key={f.id} onClick={() => setPerformedBy(f.name)}
                      className="px-2 py-1 rounded-lg text-xs border transition-colors"
                      style={{
                        borderColor: performedBy === f.name ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: performedBy === f.name ? 'var(--color-primary)' : 'transparent',
                        color: performedBy === f.name ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                      }}>{f.name}</button>
                  ))}
                </div>
                <input type="text" value={performedBy} onChange={e => setPerformedBy(e.target.value)}
                  placeholder="Или впишите вручную..."
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
            )}

            <div>
              <label className="block text-xs mb-1">Заключение</label>
              <textarea value={conclusion} onChange={e => setConclusion(e.target.value)}
                placeholder={type === 'consultation' ? 'Заключение специалиста...' : 'Опишите результат...'}
                rows={3} className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </div>

            {type === 'consultation' && (
              <div>
                <label className="block text-xs mb-1">Рекомендации</label>
                <textarea value={recommendations} onChange={e => setRecommendations(e.target.value)}
                  placeholder="Рекомендации специалиста..." rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
            )}
          </div>
        )}

        {step === 'fillForm' && (
          <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', opacity: saving ? 0.6 : 1 }}>
              <Save size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={() => { handleReset(); onClose(); }}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        )}
      </div>
    </div>
  );
}