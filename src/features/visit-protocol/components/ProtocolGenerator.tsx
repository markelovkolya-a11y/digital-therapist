// features/visit-protocol/components/ProtocolGenerator.tsx
// v2.0.0 — Редактируемый протокол перед копированием в ЕМИАС

import { useState, useEffect } from 'react';
import { useAppStore } from '@core/store';
import { calculateAge, formatDateRu } from '@core/utils/date';
import { Copy, Check, X, Edit3 } from 'lucide-react';

interface ProtocolGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProtocolGenerator({ isOpen, onClose }: ProtocolGeneratorProps) {
  const currentVisit = useAppStore(s => s.currentVisit);
  const patients = useAppStore(s => s.patients);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [protocolText, setProtocolText] = useState('');

  const patient = patients.find(p => p.id === currentVisit?.patientId);

  const generateProtocol = (): string => {
    if (!currentVisit || !patient) return '';
    
    const lines: string[] = [];
    const p = patient;

    // Жалобы
    if (currentVisit.complaints.length > 0) {
      lines.push('ЖАЛОБЫ:');
      currentVisit.complaints.forEach(c => {
        const statusText = c.status === 'new' ? ' (впервые)' :
          c.status === 'persists' ? ' (сохраняется)' :
          c.status === 'worsened' ? ' (усилилась)' :
          c.status === 'improved' ? ' (уменьшилась)' :
          c.status === 'resolved' ? ' (купирована)' : '';
        lines.push(`- ${c.name}${statusText}${c.details ? ': ' + c.details : ''}`);
      });
      lines.push('');
    }

    // Анамнез жизни
    const lh = currentVisit.lifeHistory;
    const hasLifeHistory = lh.smoking !== 'never' || lh.alcohol !== 'never' || 
      lh.allergy !== 'Аллергоанамнез не отягощён.' || lh.heredity !== 'Наследственность не отягощена.';
    
    if (hasLifeHistory) {
      lines.push('АНАМНЕЗ ЖИЗНИ:');
      if (lh.smoking !== 'never') lines.push(`Курение: ${lh.smokingDetails || 'есть'}`);
      if (lh.alcohol !== 'never') lines.push(`Алкоголь: ${lh.alcoholDetails || 'употребляет'}`);
      if (lh.allergy !== 'Аллергоанамнез не отягощён.') lines.push(`Аллергия: ${lh.allergy}`);
      if (lh.heredity !== 'Наследственность не отягощена.') lines.push(`Наследственность: ${lh.heredity}`);
      if (lh.profession) lines.push(`Профессия: ${lh.profession}`);
      lines.push('');
    }

    // Анамнез заболевания
    if (currentVisit.anamnesis.text) {
      lines.push('АНАМНЕЗ ЗАБОЛЕВАНИЯ:');
      const dynamicLabels: Record<string, string> = {
        worsening: 'Ухудшение',
        stable: 'Без динамики',
        improving: 'Улучшение',
      };
      lines.push(`Динамика: ${dynamicLabels[currentVisit.anamnesis.dynamic] || 'не указана'}`);
      lines.push(currentVisit.anamnesis.text);
      lines.push('');
    }

    // Объективный статус
    lines.push('ОБЪЕКТИВНЫЙ СТАТУС:');
    lines.push(`АД: ${currentVisit.vitals.systolic}/${currentVisit.vitals.diastolic} мм рт.ст., ЧСС: ${currentVisit.vitals.heartRate} уд/мин, ЧДД: ${currentVisit.vitals.respiratoryRate}/мин`);
    lines.push(`SpO₂: ${currentVisit.vitals.spo2}%, t°: ${currentVisit.vitals.temperature}°C`);
    
    if (currentVisit.vitals.height > 0 && currentVisit.vitals.weight > 0) {
      const bmi = Math.round((currentVisit.vitals.weight / Math.pow(currentVisit.vitals.height / 100, 2)) * 10) / 10;
      lines.push(`Рост: ${currentVisit.vitals.height} см, Вес: ${currentVisit.vitals.weight} кг, ИМТ: ${bmi} кг/м²`);
    }
    lines.push('');

    currentVisit.physicalExam
      .filter(s => s.status !== 'not_examined')
      .forEach(s => {
        if (s.status === 'normal') {
          lines.push(`${s.system}: ${s.text}`);
        } else {
          lines.push(`${s.system}: ${s.text || 'Патология (текст не указан)'}`);
        }
      });
    lines.push('');

    // Диагноз
    if (currentVisit.diagnosis.primary.code) {
      lines.push('ДИАГНОЗ:');
      lines.push(`Основной: ${currentVisit.diagnosis.primary.code} — ${currentVisit.diagnosis.primary.name}${currentVisit.diagnosis.primary.isFirstTime ? ' (впервые)' : ''}`);
      
      if (currentVisit.diagnosis.complications.length > 0) {
        lines.push('Осложнения: ' + currentVisit.diagnosis.complications.map(d => `${d.code} ${d.name}`).join('; '));
      }
      if (currentVisit.diagnosis.concomitant.length > 0) {
        lines.push('Сопутствующие: ' + currentVisit.diagnosis.concomitant.map(d => `${d.code} ${d.name}`).join('; '));
      }
      if (currentVisit.diagnosis.background.length > 0) {
        lines.push('Фоновые: ' + currentVisit.diagnosis.background.map(d => `${d.code} ${d.name}`).join('; '));
      }
      lines.push('');
    }

    // План обследования
    const allExams = [
      ...currentVisit.examinationPlan.labTests.map(t => `[Лаб] ${t}`),
      ...currentVisit.examinationPlan.instrumental.map(t => `[Инстр] ${t}`),
      ...currentVisit.examinationPlan.consultations.map(t => `[Конс] ${t}`),
    ];
    if (allExams.length > 0) {
      lines.push('ПЛАН ОБСЛЕДОВАНИЯ:');
      allExams.forEach(e => lines.push(`- ${e}`));
      lines.push('');
    }

    // Лечение
    if (currentVisit.treatment.nonDrugText || currentVisit.treatment.nonDrug.length > 0) {
      lines.push('НЕМЕДИКАМЕНТОЗНОЕ ЛЕЧЕНИЕ:');
      if (currentVisit.treatment.nonDrugText) lines.push(currentVisit.treatment.nonDrugText);
      if (currentVisit.treatment.nonDrug.length > 0) lines.push('Рекомендации: ' + currentVisit.treatment.nonDrug.join(', '));
      lines.push('');
    }

    if (currentVisit.treatment.medications.length > 0) {
      lines.push('МЕДИКАМЕНТОЗНОЕ ЛЕЧЕНИЕ:');
      currentVisit.treatment.medications.forEach(m => {
        const basic = m.isBasic ? ' (базисная)' : '';
        lines.push(`${m.name} ${m.dose} ${m.frequency} ${m.duration}${basic}`);
      });
      lines.push('');
    }

    // Контрольная явка
    if (currentVisit.followUp.date) {
      lines.push(`КОНТРОЛЬНАЯ ЯВКА: ${formatDateRu(currentVisit.followUp.date)}`);
      if (currentVisit.followUp.reason) lines.push(`Причина: ${currentVisit.followUp.reason}`);
      lines.push('');
    }

    return lines.join('\n');
  };

  // Обновляем текст при открытии
  useEffect(() => {
    if (isOpen) {
      setProtocolText(generateProtocol());
      setEditing(false);
      setCopied(false);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    const textToCopy = editing ? protocolText : generateProtocol();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || !currentVisit || !patient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Протокол для ЕМИАС</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(!editing)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors"
              style={{
                borderColor: editing ? 'var(--color-primary)' : 'var(--color-border)',
                color: editing ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
              }}>
              <Edit3 size={14} /> {editing ? 'Просмотр' : 'Редактировать'}
            </button>
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: copied ? '#10b981' : 'var(--color-primary)',
                color: 'var(--color-primary-foreground)',
              }}>
              {copied ? <><Check size={14} /> Скопировано</> : <><Copy size={14} /> Копировать</>}
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Текст протокола */}
        <div className="flex-1 overflow-y-auto p-4">
          {editing ? (
            <textarea
              value={protocolText}
              onChange={e => setProtocolText(e.target.value)}
              className="w-full h-full min-h-[400px] text-sm leading-relaxed resize-none outline-none p-2 rounded border"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-foreground)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            />
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed"
              style={{ color: 'var(--color-foreground)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {protocolText || generateProtocol()}
            </pre>
          )}
        </div>

        <div className="px-4 py-2 border-t text-xs shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
          <span>Нажмите «Копировать» и вставьте в форму осмотра ЕМИАС</span>
          {editing && <span style={{ color: 'var(--color-primary)' }}>Режим редактирования</span>}
        </div>
      </div>
    </div>
  );
}