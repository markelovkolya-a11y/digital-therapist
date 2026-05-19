// features/visit-protocol/components/MedicationSearchModal.tsx
// v1.1.0 — Поиск лекарств с выбором дозировки и кратности

import { useState, useEffect, useRef } from 'react';
import { medicationsRepo } from '@core/database/repositories/medications.repo';
import { MedicationSearchResult, MedicationDosage } from '@core/types/medications';
import { Search, X, Check, Package, ArrowLeft } from 'lucide-react';

interface MedicationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (inn: string, dosage: string, frequency: string, isBasic: boolean) => void;
}

const FREQUENCIES = [
  '1 раз в день',
  '2 раза в день',
  '3 раза в день',
  'на ночь',
  'по требованию',
  'за 30 мин до еды',
  'во время еды',
];

type Step = 'search' | 'dosage' | 'frequency';

export function MedicationSearchModal({ isOpen, onClose, onSelect }: MedicationSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedicationSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicationSearchResult | null>(null);
  const [selectedDosage, setSelectedDosage] = useState<MedicationDosage | null>(null);
  const [isBasic, setIsBasic] = useState(false);
  const [step, setStep] = useState<Step>('search');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedMed(null);
      setSelectedDosage(null);
      setIsBasic(false);
      setStep('search');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 1) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await medicationsRepo.search(query.trim(), 10);
        setResults(res);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Ошибка поиска лекарств:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (step === 'frequency') return;

    if (step === 'dosage' && selectedMed) {
      if (e.key === 'Escape') {
        setStep('search');
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelectMed(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelectMed = (med: MedicationSearchResult) => {
    setSelectedMed(med);
    setStep('dosage');
  };

  const handleSelectDosage = (dosage: MedicationDosage) => {
    setSelectedDosage(dosage);
    setStep('frequency');
  };

  const handleSelectFrequency = (frequency: string) => {
    if (selectedMed && selectedDosage) {
      onSelect(selectedMed.matchedINN, selectedDosage.value, frequency, isBasic);
      onClose();
    }
  };

  if (!isOpen) return null;

  const renderTitle = () => {
    switch (step) {
      case 'dosage': return `Дозировка: ${selectedMed?.matchedINN}`;
      case 'frequency': return `Кратность: ${selectedDosage?.value}`;
      default: return 'Поиск препарата';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            {step !== 'search' && (
              <button
                onClick={() => {
                  if (step === 'frequency') setStep('dosage');
                  else setStep('search');
                }}
                className="p-1 rounded hover:bg-muted"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {renderTitle()}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Шаг 1: Поиск */}
        {step === 'search' && (
          <>
            <div className="relative px-4 pt-3 pb-2">
              <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="МНН или торговое название..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}
              />
            </div>

            <div className="max-h-72 overflow-y-auto">
              {loading && (
                <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Поиск...</div>
              )}
              {!loading && query && results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  Ничего не найдено
                </div>
              )}
              {results.map((item, i) => (
                <button
                  key={item.medication.id}
                  onClick={() => handleSelectMed(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left border-b transition-colors"
                  style={{
                    backgroundColor: i === selectedIndex ? 'var(--color-accent)' : 'transparent',
                    borderColor: 'var(--color-border)',
                  }}
                >
                  <Package size={16} style={{ color: 'var(--color-primary)' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                      {item.matchedINN}
                    </div>
                    {item.matchedTradeName && (
                      <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {item.matchedTradeName}
                        {item.medication.tradeNames.length > 1 && ` + ещё ${item.medication.tradeNames.length - 1}`}
                      </div>
                    )}
                  </div>
                  {i === selectedIndex && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Шаг 2: Выбор дозировки */}
        {step === 'dosage' && selectedMed && (
          <div className="max-h-72 overflow-y-auto">
            {selectedMed.medication.dosages.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Нет дозировок
              </div>
            ) : (
              selectedMed.medication.dosages.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => handleSelectDosage(d)}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left border-b hover:bg-muted/30 transition-colors"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {d.value}
                  </span>
                  {d.isDefault && (
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
                      основная
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

                {/* Шаг 3: Выбор кратности */}
        {step === 'frequency' && selectedDosage && (
          <div className="max-h-72 overflow-y-auto">
            <div className="px-4 py-2 border-b text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
              {selectedMed?.matchedINN} • {selectedDosage.value}
            </div>
            
            {/* Базисная терапия — вверх */}
            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--color-foreground)' }}>
                <input
                  type="checkbox"
                  checked={isBasic}
                  onChange={e => setIsBasic(e.target.checked)}
                  className="rounded"
                />
                Базисная терапия
              </label>
            </div>

            {FREQUENCIES.map(freq => (
              <button
                key={freq}
                onClick={() => handleSelectFrequency(freq)}
                className="flex items-center gap-3 w-full px-4 py-3 text-left border-b hover:bg-muted/30 transition-colors"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--color-foreground)' }}>{freq}</span>
              </button>
            ))}
          </div>
        )}

        {/* Подсказка */}
        <div className="px-4 py-2 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
          {step === 'search' && '↑↓ навигация • Enter выбрать • Esc закрыть'}
          {step === 'dosage' && 'Выберите дозировку'}
          {step === 'frequency' && 'Выберите кратность приёма'}
        </div>
      </div>
    </div>
  );
}