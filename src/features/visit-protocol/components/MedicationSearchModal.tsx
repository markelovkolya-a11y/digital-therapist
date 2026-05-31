// features/visit-protocol/components/MedicationSearchModal.tsx
// v2.0.0 — Всё в одном окне: препарат + дозировка + кратность + длительность + базисная

import { useState, useEffect, useRef } from 'react';
import { medicationsRepo } from '@core/database/repositories/medications.repo';
import { MedicationSearchResult } from '@core/types/medications';
import { Search, X, Check, Package } from 'lucide-react';

interface MedicationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (inn: string, dosage: string, frequency: string, duration: string, isBasic: boolean) => void;
}

const FREQUENCIES = ['1 раз в день', '2 раза в день', '3 раза в день', 'на ночь', 'по требованию', 'за 30 мин до еды', 'во время еды'];
const DURATIONS = ['7 дней', '14 дней', '30 дней', '3 месяца', 'постоянно'];

export function MedicationSearchModal({ isOpen, onClose, onSelect }: MedicationSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedicationSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationSearchResult | null>(null);
  const [selectedDosage, setSelectedDosage] = useState('');
  const [selectedFreq, setSelectedFreq] = useState('1 раз в день');
  const [selectedDuration, setSelectedDuration] = useState('30 дней');
  const [isBasic, setIsBasic] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery(''); setResults([]); setSelectedMed(null);
      setSelectedDosage(''); setSelectedFreq('1 раз в день');
      setSelectedDuration('30 дней'); setIsBasic(false);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 1) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await medicationsRepo.search(query.trim(), 8);
        setResults(res);
        setSelectedIndex(0);
        setSelectedMed(null);
        setSelectedDosage('');
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const med = results[selectedIndex];
      setSelectedMed(med);
      if (med.medication.dosages.length > 0) setSelectedDosage(med.medication.dosages.find(d => d.isDefault)?.value || med.medication.dosages[0].value);
    } else if (e.key === 'Escape') { onClose(); }
  };

  const handleSelectMed = (med: MedicationSearchResult) => {
    setSelectedMed(med);
    if (med.medication.dosages.length > 0) {
      const def = med.medication.dosages.find(d => d.isDefault);
      setSelectedDosage(def?.value || med.medication.dosages[0].value);
    } else {
      setSelectedDosage('');
    }
  };

  const handleConfirm = () => {
    if (selectedMed && selectedDosage) {
      onSelect(selectedMed.matchedINN, selectedDosage, selectedFreq, selectedDuration, isBasic);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {selectedMed ? selectedMed.matchedINN : 'Поиск препарата'}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>

        {/* Поиск */}
        <div className="relative px-4 pt-3 pb-2">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
          <input ref={inputRef} type="text" placeholder="МНН или торговое название..." value={query}
            onChange={e => { setQuery(e.target.value); setSelectedMed(null); }}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        </div>

        <div className="max-h-60 overflow-y-auto">
          {loading && <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Поиск...</div>}
          {!loading && query && results.length === 0 && !selectedMed && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Ничего не найдено</div>
          )}
          {!selectedMed && results.map((item, i) => (
            <button key={item.medication.id} onClick={() => handleSelectMed(item)}
              onMouseEnter={() => setSelectedIndex(i)}
              className="flex items-center gap-3 w-full px-4 py-3 text-left border-b transition-colors"
              style={{ backgroundColor: i === selectedIndex ? 'var(--color-accent)' : 'transparent', borderColor: 'var(--color-border)' }}>
              <Package size={16} style={{ color: 'var(--color-primary)' }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{item.matchedINN}</div>
                {item.matchedTradeName && <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{item.matchedTradeName}</div>}
              </div>
              {i === selectedIndex && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
            </button>
          ))}
        </div>

        {/* Параметры (видны сразу при выборе препарата) */}
        {selectedMed && (
          <div className="px-4 py-3 space-y-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {/* Дозировка */}
            {selectedMed.medication.dosages.length > 0 && (
              <div>
                <label className="block text-xs mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Дозировка</label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMed.medication.dosages.map(d => (
                    <button key={d.id} onClick={() => setSelectedDosage(d.value)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                      style={{
                        borderColor: selectedDosage === d.value ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: selectedDosage === d.value ? 'var(--color-primary)' : 'transparent',
                        color: selectedDosage === d.value ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                      }}>{d.value}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Кратность */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Кратность</label>
                <select value={selectedFreq} onChange={e => setSelectedFreq(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* Длительность */}
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Длительность</label>
                <select value={selectedDuration} onChange={e => setSelectedDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                  {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Базисная */}
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
              <input type="checkbox" checked={isBasic} onChange={e => setIsBasic(e.target.checked)} />
              Базисная терапия
            </label>

            {/* Кнопка Добавить */}
            <button onClick={handleConfirm} disabled={!selectedDosage}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: selectedDosage ? 'var(--color-primary)' : 'var(--color-muted)', color: selectedDosage ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)' }}>
              Добавить {selectedMed.matchedINN} {selectedDosage}
            </button>
          </div>
        )}

        <div className="px-4 py-2 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
          ↑↓ навигация • Enter выбрать • Esc закрыть
        </div>
      </div>
    </div>
  );
}