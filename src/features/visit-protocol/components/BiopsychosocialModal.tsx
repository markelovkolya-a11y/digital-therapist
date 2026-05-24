// features/visit-protocol/components/BiopsychosocialModal.tsx
// v2.0.0 — Чек-листы вместо цифр, автоматический подсчёт баллов

import { useState, useEffect } from 'react';
import { useAppStore } from '@core/store';
import { biopsychosocialService } from '@core/services/biopsychosocial.service';
import { BiopsychosocialProfile } from '@core/types/biopsychosocial';
import { todayString } from '@core/utils/date';
import { X, Save, Activity, Brain, Users, AlertTriangle } from 'lucide-react';

interface BiopsychosocialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Вопросы PHQ-2
const PHQ2_QUESTIONS = [
  'Чувство подавленности, безнадёжности?',
  'Потеря интереса к делам, которые обычно приносили удовольствие?',
];

// Вопросы GAD-2
const GAD2_QUESTIONS = [
  'Чувство нервозности, тревоги или напряжения?',
  'Невозможность контролировать или остановить беспокойство?',
];

// Шкала Бартел
const BARTHEL_ITEMS = [
  { name: 'Приём пищи', scores: [10, 5, 0], labels: ['Самостоятельно', 'Нужна помощь', 'Не может'] },
  { name: 'Одевание', scores: [10, 5, 0], labels: ['Самостоятельно', 'Нужна помощь', 'Не может'] },
  { name: 'Туалет', scores: [10, 5, 0], labels: ['Самостоятельно', 'Нужна помощь', 'Не может'] },
  { name: 'Купание', scores: [5, 0], labels: ['Самостоятельно', 'Нужна помощь'] },
  { name: 'Контроль мочеиспускания', scores: [10, 5, 0], labels: ['Полный', 'Частичный', 'Нет'] },
  { name: 'Контроль дефекации', scores: [10, 5, 0], labels: ['Полный', 'Частичный', 'Нет'] },
  { name: 'Перемещение с кровати', scores: [15, 10, 5, 0], labels: ['Сам', 'Мин. помощь', 'Садится', 'Не может'] },
  { name: 'Передвижение', scores: [15, 10, 5, 0], labels: ['Сам >50м', 'С палкой', 'С ходунками', 'Не может'] },
  { name: 'Подъём по лестнице', scores: [10, 5, 0], labels: ['Сам', 'С помощью', 'Не может'] },
];

export function BiopsychosocialModal({ isOpen, onClose }: BiopsychosocialModalProps) {
  const currentVisit = useAppStore(s => s.currentVisit);
  const patients = useAppStore(s => s.patients);
  const selectedPatient = patients.find(p => p.id === currentVisit?.patientId);

  // Состояния чек-листов
  const [phq2Answers, setPhq2Answers] = useState<boolean[]>([false, false]);
  const [gad2Answers, setGad2Answers] = useState<boolean[]>([false, false]);
  const [barthelAnswers, setBarthelAnswers] = useState<number[]>(BARTHEL_ITEMS.map(() => 0));
  
  const [housing, setHousing] = useState<string>('adequate');
  const [income, setIncome] = useState<string>('sufficient');
  const [maritalStatus, setMaritalStatus] = useState<string>('married');
  const [careAccess, setCareAccess] = useState<string>('none_needed');
  const [socialIsolation, setSocialIsolation] = useState<string>('none');
  const [summary, setSummary] = useState('');

  // Автоподсчёт баллов
  const phq2Score = phq2Answers.filter(Boolean).length;
  const gad2Score = gad2Answers.filter(Boolean).length;
  const barthelScore = barthelAnswers.reduce((sum, val) => sum + val, 0);

  // Загрузка предыдущего профиля
  useEffect(() => {
    if (isOpen && currentVisit?.patientId) {
      biopsychosocialService.getLatest(currentVisit.patientId).then(saved => {
        if (saved) {
          setPhq2Answers(saved.phq2Score >= 1 ? [saved.phq2Score >= 1, saved.phq2Score >= 2] : [false, false]);
          setGad2Answers(saved.gad2Score >= 1 ? [saved.gad2Score >= 1, saved.gad2Score >= 2] : [false, false]);
          setHousing(saved.housing);
          setIncome(saved.income);
          setMaritalStatus(saved.maritalStatus);
          setCareAccess(saved.careAccess);
          setSocialIsolation(saved.socialIsolation);
          setSummary(saved.summary);
        }
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!currentVisit?.patientId) return;
    
    const profile: BiopsychosocialProfile = {
      patientId: currentVisit.patientId,
      date: todayString(),
      barthelScore,
      mobility: barthelScore >= 60 ? 'independent' : barthelScore >= 30 ? 'assisted' : 'bedridden',
      phq2Score,
      gad2Score,
      housing: housing as any,
      income: income as any,
      maritalStatus: maritalStatus as any,
      careAccess: careAccess as any,
      socialIsolation: socialIsolation as any,
      summary,
      createdAt: '',
    };
    
    await biopsychosocialService.save(profile);
    onClose();
  };

  if (!isOpen) return null;

  const selectStyle = {
    borderColor: 'var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-foreground)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Биопсихосоциальный профиль
            {selectedPatient && <span className="ml-2 font-normal opacity-70">— {selectedPatient.lastName}</span>}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* 🔵 Био — Шкала Бартел */}
          <div className="p-3 rounded-lg border" style={{ borderColor: '#3b82f6' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: '#3b82f6' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Шкала Бартел</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ 
                backgroundColor: barthelScore >= 80 ? '#dcfce7' : barthelScore >= 50 ? '#fef3c7' : '#fee2e2',
                color: barthelScore >= 80 ? '#166534' : barthelScore >= 50 ? '#92400e' : '#991b1b',
              }}>
                {barthelScore}/100
              </span>
            </div>
            {barthelScore < 60 && (
              <div className="text-xs mb-2 p-2 rounded" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                ⚠️ Нуждается в посторонней помощи. Рекомендовано: социальный работник, патронаж.
              </div>
            )}
            <div className="space-y-1">
              {BARTHEL_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-40" style={{ color: 'var(--color-foreground)' }}>{item.name}</span>
                  <div className="flex gap-1">
                    {item.scores.map((score, j) => (
                      <button key={j} onClick={() => {
                        const newAnswers = [...barthelAnswers];
                        newAnswers[i] = score;
                        setBarthelAnswers(newAnswers);
                      }}
                        className="px-2 py-0.5 rounded text-xs border transition-colors"
                        style={{
                          borderColor: barthelAnswers[i] === score ? '#3b82f6' : 'var(--color-border)',
                          backgroundColor: barthelAnswers[i] === score ? '#3b82f6' : 'transparent',
                          color: barthelAnswers[i] === score ? 'white' : 'var(--color-foreground)',
                        }}>
                        {item.labels[j]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 🟣 Психо — PHQ-2 + GAD-2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* PHQ-2 */}
            <div className="p-3 rounded-lg border" style={{ borderColor: '#8b5cf6' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain size={14} style={{ color: '#8b5cf6' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>PHQ-2 (депрессия)</span>
                </div>
                <span className="text-xs font-bold">{phq2Score}/2</span>
              </div>
              {phq2Score >= 2 && (
                <div className="text-xs mb-2 p-1.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                  Высокий риск. Рекомендована консультация психиатра.
                </div>
              )}
              {PHQ2_QUESTIONS.map((q, i) => (
                <label key={i} className="flex items-center gap-2 text-xs mb-1 cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                  <input type="checkbox" checked={phq2Answers[i]}
                    onChange={e => {
                      const newAnswers = [...phq2Answers];
                      newAnswers[i] = e.target.checked;
                      setPhq2Answers(newAnswers);
                    }} />
                  {q}
                </label>
              ))}
            </div>

            {/* GAD-2 */}
            <div className="p-3 rounded-lg border" style={{ borderColor: '#8b5cf6' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain size={14} style={{ color: '#8b5cf6' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>GAD-2 (тревога)</span>
                </div>
                <span className="text-xs font-bold">{gad2Score}/2</span>
              </div>
              {gad2Score >= 2 && (
                <div className="text-xs mb-2 p-1.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                  Высокий риск. Рекомендована консультация.
                </div>
              )}
              {GAD2_QUESTIONS.map((q, i) => (
                <label key={i} className="flex items-center gap-2 text-xs mb-1 cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                  <input type="checkbox" checked={gad2Answers[i]}
                    onChange={e => {
                      const newAnswers = [...gad2Answers];
                      newAnswers[i] = e.target.checked;
                      setGad2Answers(newAnswers);
                    }} />
                  {q}
                </label>
              ))}
            </div>
          </div>

          {/* 🟢 Социо */}
          <div className="p-3 rounded-lg border" style={{ borderColor: '#10b981' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: '#10b981' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Социальный контекст</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">Жильё</label>
                <select value={housing} onChange={e => setHousing(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="adequate">Удовлетворительное</option>
                  <option value="crowded">Стеснённое</option>
                  <option value="unsafe">Аварийное</option>
                  <option value="homeless">Без жилья</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Доход</label>
                <select value={income} onChange={e => setIncome(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="sufficient">Достаточный</option>
                  <option value="limited">Ограниченный</option>
                  <option value="below_poverty">За чертой бедности</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Семейное положение</label>
                <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="married">Женат/замужем</option>
                  <option value="single">Одинок(а)</option>
                  <option value="widowed">Вдовец/вдова</option>
                  <option value="divorced">Разведён(а)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Уход</label>
                <select value={careAccess} onChange={e => setCareAccess(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="none_needed">Не нуждается</option>
                  <option value="partial_help">Частичная помощь</option>
                  <option value="full_dependency">Полная зависимость</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs mb-1">Социальная изоляция</label>
              <select value={socialIsolation} onChange={e => setSocialIsolation(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                <option value="none">Нет</option>
                <option value="moderate">Умеренная</option>
                <option value="severe">Выраженная</option>
              </select>
            </div>
          </div>

          {/* Рекомендации на основе профиля */}
          {(phq2Score >= 2 || gad2Score >= 2 || barthelScore < 60 || housing === 'homeless' || socialIsolation === 'severe') && (
            <div className="p-3 rounded-lg border text-xs" style={{ borderColor: '#f59e0b', backgroundColor: '#fef3c7', color: '#92400e' }}>
              <div className="font-medium mb-1">Рекомендации на основе профиля:</div>
              {phq2Score >= 2 && <div>• Консультация психиатра (PHQ-2: {phq2Score}/2)</div>}
              {gad2Score >= 2 && <div>• Оценка тревожного расстройства (GAD-2: {gad2Score}/2)</div>}
              {barthelScore < 60 && <div>• Нуждается в уходе (Бартел: {barthelScore}/100). Рекомендован социальный работник.</div>}
              {housing === 'homeless' && <div>• Критическая ситуация с жильём. Рекомендована соцподдержка.</div>}
              {socialIsolation === 'severe' && <div>• Выраженная социальная изоляция. Риск несоблюдения терапии.</div>}
            </div>
          )}

          {/* Резюме */}
          <div>
            <label className="block text-xs mb-1">Резюме врача</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="Краткое резюме профиля..."
              rows={2} className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              style={selectStyle} />
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
            <Save size={14} /> Сохранить
          </button>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}