// features/settings/ComplaintEditor.tsx
// v1.0.0 — Редактор справочника жалоб

import { useState, useEffect } from 'react';
import { complaintsRepo } from '@core/database/repositories/complaints.repo';
import { ComplaintTemplate } from '@core/types/complaints';
import { Plus, X, Search, Trash2, Save } from 'lucide-react';

export function ComplaintEditor() {
  const [complaints, setComplaints] = useState<ComplaintTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { loadComplaints(); }, []);

  const loadComplaints = async () => {
    setLoading(true);
    setComplaints(await complaintsRepo.findAll());
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await complaintsRepo.create({ name: newName.trim() });
    setNewName('');
    setShowAdd(false);
    await loadComplaints();
  };

  const handleDelete = async (id: string) => {
    await complaintsRepo.delete(id);
    await loadComplaints();
  };

  const filtered = complaints.filter(c =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>Справочник жалоб</h3>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={14} /> Добавить
        </button>
      </div>

      {showAdd && (
        <div className="p-4 mb-4 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <div className="flex gap-2">
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Название жалобы" className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
            <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
              <Save size={14} /> Сохранить
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
        <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Нет жалоб</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {filtered.map(c => (
              <span key={c.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                {c.name}
                <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--color-muted-foreground)' }}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}