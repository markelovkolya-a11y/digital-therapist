// features/visit-protocol/components/FormulationSelectModal.tsx
// v1.0.0 — Модальное окно выбора клинической формулировки

import { useState, useEffect, useRef } from 'react';
import { formulationsRepo } from '@core/database/repositories/formulations.repo';
import { ClinicalFormulation } from '@core/types/formulations';
import { X, Check, Plus } from 'lucide-react';

interface FormulationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
  icd10Code: string;
}

export function FormulationSelectModal({ isOpen, onClose, onSelect, icd10Code }: FormulationSelectModalProps) {
  const [formulations, setFormulations] = useState<ClinicalFormulation[]>([]);
  const [newText, setNewText] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && icd10Code) {
      formulationsRepo.findByIcd10Code(icd10Code).then(setFormulations);
      setSelectedIndex(0);
      setNewText('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, icd10Code]);

  const handleSelect = (text: string) => {
    onSelect(text);
    onClose();
  };

  const handleAddNew = async () => {
    if (!newText.trim()) return;
    await formulationsRepo.create({ icd10Code, text: newText.trim() });
    handleSelect(newText.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Формулировки для {icd10Code}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {formulations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Нет сохранённых формулировок для этого кода
            </div>
          ) : (
            formulations.map((f, i) => (
              <button
                key={f.id}
                onClick={() => handleSelect(f.text)}
                onMouseEnter={() => setSelectedIndex(i)}
                className="flex items-center gap-2 w-full px-4 py-3 text-left text-sm transition-colors border-b"
                style={{
                  backgroundColor: i === selectedIndex ? 'var(--color-accent)' : 'transparent',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-foreground)',
                }}
              >
                <span className="flex-1">{f.text}</span>
                {i === selectedIndex && <Check size={16} style={{ color: 'var(--color-primary)' }} />}
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t space-y-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Новая формулировка..."
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNew(); }}
              className="flex-1 px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}
            />
            <button
              onClick={handleAddNew}
              className="px-3 py-2 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}