// features/settings/FormulationEditor.tsx
// v1.0.0 — Редактор клинических формулировок

import { useState, useEffect } from 'react';
import { formulationsRepo } from '@core/database/repositories/formulations.repo';
import { ClinicalFormulation } from '@core/types/formulations';
import { Plus, X, Search, Trash2, Save } from 'lucide-react';

export function FormulationEditor() {
  const [formulations, setFormulations] = useState<ClinicalFormulation[]>([]);
  const [search, setSearch] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newText, setNewText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFormulations();
  }, []);

  const loadFormulations = async () => {
    setLoading(true);
    const data = await formulationsRepo.findAll();
    setFormulations(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newCode.trim() || !newText.trim()) return;
    await formulationsRepo.create({ icd10Code: newCode.trim(), text: newText.trim() });
    setNewCode('');
    setNewText('');
    setShowAdd(false);
    await loadFormulations();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить формулировку?')) return;
    await formulationsRepo.delete(id);
    await loadFormulations();
  };

  const filtered = formulations.filter(f => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return f.icd10Code.toLowerCase().includes(q) || f.text.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
          Клинические формулировки
        </h3>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={14} /> Добавить
        </button>
      </div>

      {/* Форма добавления */}
      {showAdd && (
        <div className="p-4 mb-4 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Код МКБ-10</label>
            <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)}
              placeholder="I11.0" className="w-full px-3 py-2 rounded-lg border text-sm font-mono outline-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Текст формулировки</label>
            <textarea value={newText} onChange={e => setNewText(e.target.value)}
              placeholder="Гипертоническая болезнь II стадии, 2 степени, риск 3"
              rows={3} className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
              <Save size={14} /> Сохранить
            </button>
            <button onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
        <input type="text" placeholder="Поиск по коду или тексту..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Таблица */}
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-muted)' }}>
              <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Код МКБ</th>
              <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Формулировка</th>
              <th className="px-4 py-2 w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                  {search ? 'Ничего не найдено' : 'Нет формулировок. Добавьте первую!'}
                </td>
              </tr>
            ) : (
              filtered.map(f => (
                <tr key={f.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-4 py-2 font-mono text-xs" style={{ color: 'var(--color-primary)' }}>{f.icd10Code}</td>
                  <td className="px-4 py-2 text-xs" style={{ color: 'var(--color-foreground)' }}>{f.text}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(f.id)} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        Всего: {formulations.length}
      </div>
    </div>
  );
}