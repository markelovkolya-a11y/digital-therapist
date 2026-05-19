// features/settings/MedicationEditor.tsx
// v1.1.0 — Редактор лекарств без кратности в дозировках

import { useState, useEffect } from 'react';
import { medicationsRepo } from '@core/database/repositories/medications.repo';
import { Medication } from '@core/types/medications';
import { Plus, X, Search, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react';

export function MedicationEditor() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Форма добавления
  const [newINN, setNewINN] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTradeName, setNewTradeName] = useState('');
  const [newTradeNames, setNewTradeNames] = useState<string[]>([]);
  const [newDosageValue, setNewDosageValue] = useState('');
  const [newDosages, setNewDosages] = useState<string[]>([]);

  useEffect(() => { loadMedications(); }, []);

  const loadMedications = async () => {
    setLoading(true);
    const data = await medicationsRepo.findAll();
    setMedications(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newINN.trim()) return;
    await medicationsRepo.create({
      inn: newINN.trim(),
      category: newCategory.trim(),
      tradeNames: newTradeNames,
      dosages: newDosages.length > 0 ? newDosages : ['стандартная'],
    });
    setNewINN(''); setNewCategory(''); setNewTradeNames([]); setNewDosages([]);
    setShowAdd(false);
    await loadMedications();
  };

  const addTradeName = () => {
    if (newTradeName.trim() && !newTradeNames.includes(newTradeName.trim())) {
      setNewTradeNames([...newTradeNames, newTradeName.trim()]);
      setNewTradeName('');
    }
  };

  const addDosage = () => {
    if (newDosageValue.trim() && !newDosages.includes(newDosageValue.trim())) {
      setNewDosages([...newDosages, newDosageValue.trim()]);
      setNewDosageValue('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить препарат?')) return;
    await medicationsRepo.delete(id);
    await loadMedications();
  };

  const filtered = medications.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return m.inn.toLowerCase().includes(q) ||
      m.tradeNames.some(t => t.name.toLowerCase().includes(q)) ||
      m.category.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Лекарственные препараты
        </h3>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={14} /> Добавить препарат
        </button>
      </div>

      {/* Форма добавления */}
      {showAdd && (
        <div className="p-4 mb-4 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>МНН</label>
              <input type="text" value={newINN} onChange={e => setNewINN(e.target.value)}
                placeholder="Лизиноприл" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Категория</label>
              <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                placeholder="иАПФ" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
            </div>
          </div>

          {/* Торговые названия */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Торговые названия</label>
            <div className="flex gap-2 mb-1.5">
              <input type="text" value={newTradeName} onChange={e => setNewTradeName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTradeName(); } }}
                placeholder="Диротон" className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
              <button onClick={addTradeName} className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>+</button>
            </div>
            {newTradeNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {newTradeNames.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                    {name}
                    <button onClick={() => setNewTradeNames(newTradeNames.filter(n => n !== name))}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Дозировки */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Дозировки (только значение)</label>
            <div className="flex gap-2 mb-1.5">
              <input type="text" value={newDosageValue} onChange={e => setNewDosageValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDosage(); } }}
                placeholder="10 мг или 5/1.25/5 мг" className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
              <button onClick={addDosage} className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>+</button>
            </div>
            {newDosages.length > 0 && (
              <div className="space-y-1">
                {newDosages.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-foreground)' }}>
                    <span className="font-medium">{d}</span>
                    <button onClick={() => setNewDosages(newDosages.filter((_, j) => j !== i))}
                      style={{ color: 'var(--color-muted-foreground)' }}><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
              <Save size={14} /> Сохранить
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        </div>
      )}

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
        <input type="text" placeholder="Поиск по МНН, торговому названию, категории..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Список */}
      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {search ? 'Ничего не найдено' : 'Нет препаратов'}
          </div>
        ) : (
          filtered.map(med => (
            <div key={med.id} className="rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <div
                onClick={() => setExpanded(expanded === med.id ? null : med.id)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/30 cursor-pointer"
                style={{ color: 'var(--color-foreground)' }}
              >
                {expanded === med.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="font-medium flex-1">{med.inn}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  {med.category || '—'}
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(med.id); }}
                  className="p-1 rounded hover:bg-muted shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
              {expanded === med.id && (
                <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  {med.tradeNames.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Торговые названия:</div>
                      <div className="flex flex-wrap gap-1">
                        {med.tradeNames.map(t => (
                          <span key={t.id} className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-foreground)' }}>{t.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {med.dosages.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Дозировки:</div>
                      <div className="space-y-1">
                        {med.dosages.map((d, i) => (
                          <div key={d.id} className="text-xs flex items-center gap-2">
                            <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{d.value}</span>
                            {d.isDefault && <span className="text-green-600 text-xs">• основная</span>}
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

      <div className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Всего: {medications.length}</div>
    </div>
  );
}