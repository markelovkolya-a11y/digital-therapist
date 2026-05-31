// features/visit-protocol/components/BiopsychosocialModal.tsx
// v2.9.0 — Шкала Морзе + индекс Чарлсон

import { useState, useEffect } from 'react';
import { useAppStore } from '@core/store';
import { biopsychosocialService } from '@core/services/biopsychosocial.service';
import { BiopsychosocialProfile } from '@core/types/biopsychosocial';
import { todayString } from '@core/utils/date';
import { X, Save, Activity, Brain, Users } from 'lucide-react';

const PHQ2_QUESTIONS = [
  'Чувство подавленности, безнадёжности?',
  'Потеря интереса к делам, которые обычно приносили удовольствие?',
];

const GAD2_QUESTIONS = [
  'Чувство нервозности, тревоги или напряжения?',
  'Невозможность контролировать или остановить беспокойство?',
];

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

const MORSE_ITEMS = [
  { name: 'Падения в анамнезе', scores: [25, 0], labels: ['Да', 'Нет'] },
  { name: 'Вторичный диагноз (≥2)', scores: [15, 0], labels: ['Да', 'Нет'] },
  { name: 'Использование вспомогательных средств', scores: [15, 0], labels: ['Да', 'Нет'] },
  { name: 'Внутривенная терапия', scores: [20, 0], labels: ['Да', 'Нет'] },
  { name: 'Нарушение походки', scores: [10, 0], labels: ['Да', 'Нет'] },
  { name: 'Психический статус (ориентация)', scores: [15, 0], labels: ['Нарушена', 'Норма'] },
];

const CHARLSON_ITEMS = [
  { name: 'Инфаркт миокарда', score: 1 },
  { name: 'ХСН', score: 1 },
  { name: 'Заболевания периферических артерий', score: 1 },
  { name: 'Цереброваскулярное заболевание', score: 1 },
  { name: 'Деменция', score: 1 },
  { name: 'ХОБЛ', score: 1 },
  { name: 'Заболевания соединительной ткани', score: 1 },
  { name: 'Язвенная болезнь', score: 1 },
  { name: 'Заболевания печени (лёгкие)', score: 1 },
  { name: 'СД без поражения органов', score: 1 },
  { name: 'Заболевания почек (умеренные)', score: 2 },
  { name: 'Гемиплегия', score: 2 },
  { name: 'СД с поражением органов', score: 2 },
  { name: 'Опухоль без метастазов', score: 2 },
  { name: 'Лейкоз', score: 2 },
  { name: 'Лимфома', score: 2 },
  { name: 'Заболевания печени (тяжёлые)', score: 3 },
  { name: 'Метастатическая опухоль', score: 6 },
  { name: 'СПИД', score: 6 },
];

export function BiopsychosocialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const currentVisit = useAppStore(s => s.currentVisit);
  const patients = useAppStore(s => s.patients);
  const selectedPatient = patients.find(p => p.id === currentVisit?.patientId);

  const [phq2Answers, setPhq2Answers] = useState<boolean[]>([false, false]);
  const [gad2Answers, setGad2Answers] = useState<boolean[]>([false, false]);
  const [barthelAnswers, setBarthelAnswers] = useState<number[]>(BARTHEL_ITEMS.map(() => 0));
  const [morseAnswers, setMorseAnswers] = useState<number[]>(MORSE_ITEMS.map(() => 0));
  const [charlsonAnswers, setCharlsonAnswers] = useState<boolean[]>(CHARLSON_ITEMS.map(() => false));
  const [housing, setHousing] = useState('adequate');
  const [income, setIncome] = useState('sufficient');
  const [maritalStatus, setMaritalStatus] = useState('married');
  const [careAccess, setCareAccess] = useState('none_needed');
  const [socialIsolation, setSocialIsolation] = useState('none');
  const [summary, setSummary] = useState('');

  const phq2Score = phq2Answers.filter(Boolean).length;
  const gad2Score = gad2Answers.filter(Boolean).length;
  const barthelScore = barthelAnswers.reduce((sum, val) => sum + val, 0);
  const morseScore = morseAnswers.reduce((sum, val) => sum + val, 0);
  const charlsonScore = CHARLSON_ITEMS.reduce((sum, item, i) => sum + (charlsonAnswers[i] ? item.score : 0), 0);
  const age = selectedPatient ? (new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()) : 0;
  const charlsonTotal = charlsonScore + Math.floor((age - 50) / 10 > 0 ? (age - 50) / 10 : 0);

  useEffect(() => {
    if (isOpen && currentVisit?.patientId) {
      biopsychosocialService.getLatest(currentVisit.patientId).then(saved => {
        if (saved) {
          setHousing(saved.housing); setIncome(saved.income);
          setMaritalStatus(saved.maritalStatus); setCareAccess(saved.careAccess);
          setSocialIsolation(saved.socialIsolation); setSummary(saved.summary);
        }
      });
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!currentVisit?.patientId) return;
    await biopsychosocialService.save({
      patientId: currentVisit.patientId,
      date: todayString(),
      barthelScore, morseScore, charlsonScore: charlsonTotal,
      mobility: barthelScore >= 60 ? 'independent' : barthelScore >= 30 ? 'assisted' : 'bedridden',
      phq2Score, gad2Score,
      housing: housing as any, income: income as any,
      maritalStatus: maritalStatus as any, careAccess: careAccess as any,
      socialIsolation: socialIsolation as any, summary,
    });
    onClose();
  };

  if (!isOpen) return null;

  const selectStyle = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' };

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
          {/* Шкала Бартел */}
          <div className="p-3 rounded-lg border" style={{ borderColor: '#3b82f6' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: '#3b82f6' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Шкала Бартел</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                backgroundColor: barthelScore >= 80 ? '#dcfce7' : barthelScore >= 50 ? '#fef3c7' : '#fee2e2',
                color: barthelScore >= 80 ? '#166534' : barthelScore >= 50 ? '#92400e' : '#991b1b',
              }}>{barthelScore}/100</span>
            </div>
            {BARTHEL_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-40" style={{ color: 'var(--color-foreground)' }}>{item.name}</span>
                <div className="flex gap-1">
                  {item.scores.map((score, j) => (
                    <button key={j} onClick={() => {
                      const a = [...barthelAnswers]; a[i] = score; setBarthelAnswers(a);
                    }} className="px-2 py-0.5 rounded text-xs border"
                    style={{
                      borderColor: barthelAnswers[i] === score ? '#3b82f6' : 'var(--color-border)',
                      backgroundColor: barthelAnswers[i] === score ? '#3b82f6' : 'transparent',
                      color: barthelAnswers[i] === score ? 'white' : 'var(--color-foreground)',
                    }}>{item.labels[j]}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Шкала Морзе */}
          <div className="p-3 rounded-lg border" style={{ borderColor: '#f59e0b' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: '#f59e0b' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Шкала Морзе (риск падений)</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                backgroundColor: morseScore < 25 ? '#dcfce7' : morseScore < 45 ? '#fef3c7' : '#fee2e2',
                color: morseScore < 25 ? '#166534' : morseScore < 45 ? '#92400e' : '#991b1b',
              }}>{morseScore}/125</span>
            </div>
            {morseScore >= 45 && (
              <div className="text-xs mb-2 p-1.5 rounded" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                ⚠️ Высокий риск падений. Рекомендовано: оценка среды, упражнения на баланс, витамин D.
              </div>
            )}
            {MORSE_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="flex-1" style={{ color: 'var(--color-foreground)' }}>{item.name}</span>
                {item.scores.map((score, j) => (
                  <button key={j} onClick={() => { const a = [...morseAnswers]; a[i] = score; setMorseAnswers(a); }}
                    className="px-2 py-0.5 rounded text-xs border"
                    style={{
                      borderColor: morseAnswers[i] === score ? '#f59e0b' : 'var(--color-border)',
                      backgroundColor: morseAnswers[i] === score ? '#f59e0b' : 'transparent',
                      color: morseAnswers[i] === score ? 'white' : 'var(--color-foreground)',
                    }}>{item.labels[j]}</button>
                ))}
              </div>
            ))}
          </div>

          {/* Индекс Чарлсон */}
          <div className="p-3 rounded-lg border" style={{ borderColor: '#ef4444' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: '#ef4444' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Индекс Чарлсон (коморбидность)</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{
                backgroundColor: charlsonTotal <= 2 ? '#dcfce7' : charlsonTotal <= 4 ? '#fef3c7' : '#fee2e2',
                color: charlsonTotal <= 2 ? '#166534' : charlsonTotal <= 4 ? '#92400e' : '#991b1b',
              }}>{charlsonTotal} баллов</span>
            </div>
            <div className="text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
              10-летняя выживаемость: {charlsonTotal === 0 ? '~98%' : charlsonTotal <= 2 ? '~90%' : charlsonTotal <= 4 ? '~53%' : charlsonTotal <= 6 ? '~21%' : '~0%'}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {CHARLSON_ITEMS.map((item, i) => (
                <label key={i} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                  <input type="checkbox" checked={charlsonAnswers[i]}
                    onChange={e => { const a = [...charlsonAnswers]; a[i] = e.target.checked; setCharlsonAnswers(a); }} />
                  {item.name} ({item.score})
                </label>
              ))}
            </div>
          </div>

          {/* PHQ-2 + GAD-2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border" style={{ borderColor: '#8b5cf6' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain size={14} style={{ color: '#8b5cf6' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>PHQ-2</span>
                </div>
                <span className="text-xs font-bold">{phq2Score}/2</span>
              </div>
              {PHQ2_QUESTIONS.map((q, i) => (
                <label key={i} className="flex items-center gap-2 text-xs mb-1 cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                  <input type="checkbox" checked={phq2Answers[i]} onChange={e => { const a = [...phq2Answers]; a[i] = e.target.checked; setPhq2Answers(a); }} />{q}
                </label>
              ))}
            </div>
            <div className="p-3 rounded-lg border" style={{ borderColor: '#8b5cf6' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain size={14} style={{ color: '#8b5cf6' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>GAD-2</span>
                </div>
                <span className="text-xs font-bold">{gad2Score}/2</span>
              </div>
              {GAD2_QUESTIONS.map((q, i) => (
                <label key={i} className="flex items-center gap-2 text-xs mb-1 cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                  <input type="checkbox" checked={gad2Answers[i]} onChange={e => { const a = [...gad2Answers]; a[i] = e.target.checked; setGad2Answers(a); }} />{q}
                </label>
              ))}
            </div>
          </div>

          {/* Социо */}
          <div className="p-3 rounded-lg border" style={{ borderColor: '#10b981' }}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} style={{ color: '#10b981' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Социальный контекст</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">Жильё</label>
                <select value={housing} onChange={e => setHousing(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="adequate">Удовлетворительное</option>
                  <option value="crowded">Стеснённое</option>
                  <option value="unsafe">Аварийное</option>
                  <option value="homeless">Без жилья</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Доход</label>
                <select value={income} onChange={e => setIncome(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="sufficient">Достаточный</option>
                  <option value="limited">Ограниченный</option>
                  <option value="below_poverty">За чертой бедности</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Семейное положение</label>
                <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="married">Женат/замужем</option>
                  <option value="single">Одинок(а)</option>
                  <option value="widowed">Вдовец/вдова</option>
                  <option value="divorced">Разведён(а)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Уход</label>
                <select value={careAccess} onChange={e => setCareAccess(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                  <option value="none_needed">Не нуждается</option>
                  <option value="partial_help">Частичная помощь</option>
                  <option value="full_dependency">Полная зависимость</option>
                </select>
              </div>
            </div>
            <div className="mt-2">
              <label className="block text-xs mb-1">Социальная изоляция</label>
              <select value={socialIsolation} onChange={e => setSocialIsolation(e.target.value)} className="w-full px-3 py-1.5 rounded-lg border text-xs" style={selectStyle}>
                <option value="none">Нет</option>
                <option value="moderate">Умеренная</option>
                <option value="severe">Выраженная</option>
              </select>
            </div>
          </div>

          {/* Резюме */}
          <div>
            <label className="block text-xs mb-1">Резюме</label>
            <textarea value={summary} onChange={e => setSummary(e.target.value)}
              placeholder="Краткое резюме профиля..." rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none" style={selectStyle} />
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
            <Save size={14} /> Сохранить
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}