// features/visit-protocol/components/ClinicalMinimumModal.tsx
// v1.0.0 — Модалка клинического минимума

import { useState } from 'react';
import { findClinicalMinimum, ClinicalMinimum } from '@core/data/clinicalMinimums';
import { X, Check, Plus } from 'lucide-react';

interface ClinicalMinimumModalProps {
  isOpen: boolean;
  onClose: () => void;
  icdCode: string;
  onAddToPlan: (category: 'lab' | 'instrumental' | 'consultation', items: string[]) => void;
}

export function ClinicalMinimumModal({ isOpen, onClose, icdCode, onAddToPlan }: ClinicalMinimumModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  
  const minimum = findClinicalMinimum(icdCode);

  if (!isOpen || !minimum) return null;

  const allItems = [
    ...minimum.lab.map(i => ({ item: i, category: 'lab' as const })),
    ...minimum.instrumental.map(i => ({ item: i, category: 'instrumental' as const })),
    ...minimum.consultations.map(i => ({ item: i, category: 'consultation' as const })),
  ];

  const toggle = (item: string) => {
    const next = new Set(selected);
    if (next.has(item)) next.delete(item); else next.add(item);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(allItems.map(i => i.item)));
  const deselectAll = () => setSelected(new Set());

  const handleAdd = () => {
    const lab: string[] = [], instr: string[] = [], cons: string[] = [];
    for (const { item, category } of allItems) {
      if (selected.has(item)) {
        if (category === 'lab') lab.push(item);
        else if (category === 'instrumental') instr.push(item);
        else cons.push(item);
      }
    }
    if (lab.length) onAddToPlan('lab', lab);
    if (instr.length) onAddToPlan('instrumental', instr);
    if (cons.length) onAddToPlan('consultation', cons);
    setSelected(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            📋 Клинический минимум: {icdCode}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2 text-xs">
            <button onClick={selectAll} className="px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Выбрать все</button>
            <button onClick={deselectAll} className="px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>Снять все</button>
          </div>

          {minimum.lab.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Лабораторные</div>
              {minimum.lab.map(item => (
                <button key={item} onClick={() => toggle(item)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-left border mb-1 transition-colors"
                  style={{
                    borderColor: selected.has(item) ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: selected.has(item) ? 'var(--color-primary)' : 'transparent',
                    color: selected.has(item) ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                  }}>
                  {selected.has(item) ? <Check size={14} /> : <Plus size={14} />}{item}
                </button>
              ))}
            </div>
          )}

          {minimum.instrumental.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Инструментальные</div>
              {minimum.instrumental.map(item => (
                <button key={item} onClick={() => toggle(item)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-left border mb-1 transition-colors"
                  style={{
                    borderColor: selected.has(item) ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: selected.has(item) ? 'var(--color-primary)' : 'transparent',
                    color: selected.has(item) ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                  }}>
                  {selected.has(item) ? <Check size={14} /> : <Plus size={14} />}{item}
                </button>
              ))}
            </div>
          )}

          {minimum.consultations.length > 0 && (
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Консультации</div>
              {minimum.consultations.map(item => (
                <button key={item} onClick={() => toggle(item)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-left border mb-1 transition-colors"
                  style={{
                    borderColor: selected.has(item) ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: selected.has(item) ? 'var(--color-primary)' : 'transparent',
                    color: selected.has(item) ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                  }}>
                  {selected.has(item) ? <Check size={14} /> : <Plus size={14} />}{item}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={handleAdd}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
            Добавить выбранное ({selected.size})
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}