// features/settings/SymptomGuideEditor.tsx
// v1.0.0 — Редактор симптом-помощника

import { useState, useEffect } from 'react';
import { symptomGuidesRepo } from '@core/database/repositories/symptomGuides.repo';
import { SymptomGuide } from '@core/types/symptomGuides';
import { Plus, X, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react';

export function SymptomGuideEditor() {
  const [guides, setGuides] = useState<SymptomGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Новая запись
  const [newName, setNewName] = useState('');
  const [newNonDrug, setNewNonDrug] = useState('');
  const [newNonDrugList, setNewNonDrugList] = useState<string[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDose, setNewMedDose] = useState('');
  const [newMedFreq, setNewMedFreq] = useState('');
  const [newMedList, setNewMedList] = useState<{ name: string; dose: string; frequency: string }[]>([]);

  useEffect(() => { loadGuides(); }, []);

  const loadGuides = async () => {
    setLoading(true);
    setGuides(await symptomGuidesRepo.findAll());
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await symptomGuidesRepo.create({
      name: newName.trim(),
      nonDrug: newNonDrugList,
      medications: newMedList,
    });
    setNewName(''); setNewNonDrugList([]); setNewMedList([]);
    setShowAdd(false);
    await loadGuides();
  };

  const addNonDrug = () => {
    if (newNonDrug.trim() && !newNonDrugList.includes(newNonDrug.trim())) {
      setNewNonDrugList([...newNonDrugList, newNonDrug.trim()]);
      setNewNonDrug('');
    }
  };

  const addMed = () => {
    if (newMedName.trim() && newMedDose.trim() && newMedFreq.trim()) {
      setNewMedList([...newMedList, { name: newMedName.trim(), dose: newMedDose.trim(), frequency: newMedFreq.trim() }]);
      setNewMedName(''); setNewMedDose(''); setNewMedFreq('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить синдром?')) return;
    await symptomGuidesRepo.delete(id);
    await loadGuides();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>Симптом-помощник</h3>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>+ Добавить синдром</button>
      </div>

      {showAdd && (
        <div className="p-4 mb-4 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <div>
            <label className="block text-xs mb-1">Название синдрома</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Боль в горле" className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
          </div>

          {/* Немедикаментозное */}
          <div>
            <label className="block text-xs mb-1">Немедикаментозные рекомендации</label>
            <div className="flex gap-2 mb-1.5">
              <input type="text" value={newNonDrug} onChange={e => setNewNonDrug(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNonDrug(); } }}
                placeholder="Полоскание горла" className="flex-1 px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
              <button onClick={addNonDrug} className="px-3 py-2 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>+</button>
            </div>
            {newNonDrugList.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {newNonDrugList.map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: '#10b981', color: 'white' }}>
                    {item}
                    <button onClick={() => setNewNonDrugList(newNonDrugList.filter((_, j) => j !== i))}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Медикаментозное */}
          <div>
            <label className="block text-xs mb-1">Препараты</label>
            <div className="grid grid-cols-3 gap-2 mb-1.5">
              <input type="text" value={newMedName} onChange={e => setNewMedName(e.target.value)}
                placeholder="Препарат" className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
              <input type="text" value={newMedDose} onChange={e => setNewMedDose(e.target.value)}
                placeholder="Доза" className="px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
              <div className="flex gap-2">
                <input type="text" value={newMedFreq} onChange={e => setNewMedFreq(e.target.value)}
                  placeholder="Кратность" className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
                <button onClick={addMed} className="px-3 py-2 rounded-lg text-xs"
                  style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>+</button>
              </div>
            </div>
            {newMedList.length > 0 && (
              <div className="space-y-1">
                {newMedList.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-foreground)' }}>
                    <span className="font-medium">{m.name}</span>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{m.dose}</span>
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{m.frequency}</span>
                    <button onClick={() => setNewMedList(newMedList.filter((_, j) => j !== i))} style={{ color: 'var(--color-muted-foreground)' }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Сохранить</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        </div>
      )}

      {/* Список */}
      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
        ) : guides.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Нет синдромов</div>
        ) : (
          guides.map(g => (
            <div key={g.id} className="rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <div onClick={() => setExpanded(expanded === g.id ? null : g.id)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/30 cursor-pointer"
                style={{ color: 'var(--color-foreground)' }}>
                {expanded === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="font-medium flex-1">{g.name}</span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                  className="p-1 rounded hover:bg-muted shrink-0" style={{ color: 'var(--color-muted-foreground)' }}><Trash2 size={14} /></button>
              </div>
              {expanded === g.id && (
                <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {g.nonDrug.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Немедикаментозное:</div>
                      <div className="flex flex-wrap gap-1">
                        {g.nonDrug.map((nd, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: '#dcfce7', color: '#166534' }}>{nd}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.medications.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Препараты:</div>
                      <div className="space-y-1">
                        {g.medications.map((m, i) => (
                          <div key={i} className="text-xs flex items-center gap-2">
                            <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{m.name}</span>
                            <span style={{ color: 'var(--color-muted-foreground)' }}>{m.dose} {m.frequency}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}