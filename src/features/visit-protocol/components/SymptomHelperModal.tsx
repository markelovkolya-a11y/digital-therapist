// features/visit-protocol/components/SymptomHelperModal.tsx
// v1.0.0 — Модалка симптом-помощника

import { useState, useEffect } from 'react';
import { symptomGuidesRepo } from '@core/database/repositories/symptomGuides.repo';
import { SymptomGuide } from '@core/types/symptomGuides';
import { X, Plus, Check, Search } from 'lucide-react';

interface SymptomHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMedication: (name: string, dose: string, frequency: string) => void;
  onAddNonDrug: (text: string) => void;
}

export function SymptomHelperModal({ isOpen, onClose, onAddMedication, onAddNonDrug }: SymptomHelperModalProps) {
  const [guides, setGuides] = useState<SymptomGuide[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SymptomGuide | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      symptomGuidesRepo.findAll().then(setGuides);
      setSelected(null);
      setSearch('');
      setAdded(new Set());
    }
  }, [isOpen]);

  const filtered = guides.filter(g =>
    !search.trim() || g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddMed = (name: string, dose: string, frequency: string) => {
    onAddMedication(name, dose, frequency);
    setAdded(prev => new Set([...prev, `${name}_${dose}`]));
  };

  const handleAddNonDrug = (text: string) => {
    onAddNonDrug(text);
    setAdded(prev => new Set([...prev, text]));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>💡 Симптом-помощник</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>

        {!selected ? (
          <>
            <div className="relative px-4 pt-3 pb-2">
              <Search size={14} className="absolute left-7 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
              <input type="text" placeholder="Поиск синдрома..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.map(g => (
                <button key={g.id} onClick={() => setSelected(g)}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm border-b hover:bg-muted/30 transition-colors"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                  {g.name}
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {g.medications.length + g.nonDrug.length} рек.
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="max-h-65vh overflow-y-auto">
            <button onClick={() => setSelected(null)}
              className="w-full px-4 py-2 text-xs text-left border-b"
              style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}>← Назад к списку</button>
            <div className="p-4 space-y-3">
              <h4 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{selected.name}</h4>

              {selected.nonDrug.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Немедикаментозное:</div>
                  <div className="space-y-1">
                    {selected.nonDrug.map((nd, i) => (
                      <button key={i} onClick={() => handleAddNonDrug(nd)}
                        disabled={added.has(nd)}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-left border transition-colors"
                        style={{
                          borderColor: added.has(nd) ? '#10b981' : 'var(--color-border)',
                          backgroundColor: added.has(nd) ? '#dcfce7' : 'transparent',
                          color: added.has(nd) ? '#166534' : 'var(--color-foreground)',
                        }}>
                        {added.has(nd) ? <Check size={14} /> : <Plus size={14} />}
                        {nd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected.medications.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Препараты:</div>
                  <div className="space-y-1">
                    {selected.medications.map((m, i) => {
                      const key = `${m.name}_${m.dose}`;
                      return (
                        <button key={i} onClick={() => handleAddMed(m.name, m.dose, m.frequency)}
                          disabled={added.has(key)}
                          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-left border transition-colors"
                          style={{
                            borderColor: added.has(key) ? '#10b981' : 'var(--color-border)',
                            backgroundColor: added.has(key) ? '#dcfce7' : 'transparent',
                            color: added.has(key) ? '#166534' : 'var(--color-foreground)',
                          }}>
                          {added.has(key) ? <Check size={14} /> : <Plus size={14} />}
                          <span className="font-medium">{m.name}</span>
                          <span style={{ color: 'var(--color-muted-foreground)' }}>{m.dose} — {m.frequency}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}