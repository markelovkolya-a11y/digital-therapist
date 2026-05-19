// features/waiting-list/WaitingList.tsx
// v2.1.0 — Кнопка "+ Новое направление" (исправлены типы)

import { useEffect, useState } from 'react';
import { useAppStore } from '@core/store';
import { waitingService, WaitingItemFull } from '@core/services/waiting.service';
import { WaitingType, WaitingPriority, WaitingStatus } from '@core/types';
import { formatDateRu, isOverdue } from '@core/utils/date';
import { Search, X, Filter, ArrowRight, Check, Clock, AlertTriangle, Plus } from 'lucide-react';
import { ResultEntryModal } from '@/features/shared/ResultEntryModal';

type StatusFilter = 'all' | 'ожидает' | 'записан' | 'выполнен';
type PriorityFilter = 'all' | 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
type TypeFilter = 'all' | 'консультация' | 'обследование' | 'ДС';

export function WaitingList() {
  const patients = useAppStore(s => s.patients);
  const selectPatient = useAppStore(s => s.selectPatient);
  const navigateTo = useAppStore(s => s.navigateTo);

  const [items, setItems] = useState<WaitingItemFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [resultModal, setResultModal] = useState<{
    isOpen: boolean;
    patientId?: string;
    prefilled?: {
      waitingItemId?: string;
      type?: 'imaging' | 'consultation' | 'screening';
      name?: string;
    };
  }>({ isOpen: false });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    patientId: '',
    description: '',
    type: 'обследование' as WaitingType,
    priority: 'P2' as WaitingPriority,
    deadlineDays: 14,
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await waitingService.getAll();
      setItems(all);
    } catch (e) {
      console.error('Ошибка загрузки листа ожидания:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenVisit = (patientId: string) => {
    selectPatient(patientId);
    navigateTo('visit');
  };

  const handleMarkCompleted = async (id: string) => {
    await waitingService.updateStatus(id, 'выполнен');
    await loadData();
  };

  const handleAddResult = (item: WaitingItemFull) => {
    const type = item.type === 'обследование' ? 'imaging' as const : 'consultation' as const;
    setResultModal({
      isOpen: true,
      patientId: item.patientId,
      prefilled: {
        waitingItemId: item.id,
        type,
        name: item.description,
      },
    });
  };

  const handleAddNew = async () => {
    if (!newItem.patientId || !newItem.description.trim()) return;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + newItem.deadlineDays);
    
    const patient = patients.find(p => p.id === newItem.patientId);
    
    await waitingService.create({
      patientId: newItem.patientId,
      patientCode: patient?.emiasCode || '',
      type: newItem.type,
      description: newItem.description.trim(),
      priority: newItem.priority,
      deadline: deadline.toISOString().split('T')[0],
      status: 'ожидает' as WaitingStatus,
    });
    
    setNewItem({ patientId: '', description: '', type: 'обследование', priority: 'P2', deadlineDays: 14 });
    setShowAddForm(false);
    await loadData();
  };

  const filtered = items.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (item.patientName || '').toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.patientCode.toLowerCase().includes(q);
    }
    return true;
  });

  const statusStyle = (status: string) => {
    switch (status) {
      case 'ожидает': return { bg: '#fef3c7', color: '#92400e', icon: <Clock size={12} /> };
      case 'записан': return { bg: '#dbeafe', color: '#1e40af', icon: <Clock size={12} /> };
      case 'выполнен': return { bg: '#dcfce7', color: '#166534', icon: <Check size={12} /> };
      default: return { bg: '#f3f4f6', color: '#6b7280', icon: <Clock size={12} /> };
    }
  };

  const priorityStyle = (priority: string) => {
    switch (priority) {
      case 'P0': return { bg: '#fee2e2', color: '#991b1b' };
      case 'P1': return { bg: '#fef3c7', color: '#92400e' };
      case 'P2': return { bg: '#dbeafe', color: '#1e40af' };
      default: return { bg: '#f3f4f6', color: '#6b7280' };
    }
  };

  const overdueCount = items.filter(w => w.deadline && isOverdue(w.deadline) && w.status !== 'выполнен').length;
  const waitingCount = items.filter(w => w.status === 'ожидает').length;

  const FilterChip = ({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) => (
    <button onClick={onClick}
      className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border"
      style={{
        backgroundColor: active ? (color || 'var(--color-primary)') : 'transparent',
        color: active ? 'white' : 'var(--color-foreground)',
        borderColor: active ? (color || 'var(--color-primary)') : 'var(--color-border)',
      }}>{label}</button>
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Лист ожидания</h1>
          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            <span>Всего: {items.length}</span>
            <span>•</span>
            <span style={{ color: '#f59e0b' }}>Ожидают: {waitingCount}</span>
            <span>•</span>
            <span style={{ color: overdueCount > 0 ? '#ef4444' : 'var(--color-muted-foreground)' }}>Просрочено: {overdueCount}</span>
          </div>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={16} /> Новое направление
        </button>
      </div>

      {/* Форма нового направления */}
      {showAddForm && (
        <div className="rounded-xl border p-4 mb-6 space-y-3" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>Новое направление</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Пациент</label>
              <select value={newItem.patientId} onChange={e => setNewItem({ ...newItem, patientId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                <option value="">Выберите пациента</option>
                {patients.filter(p => !p.isArchived).map(p => (
                  <option key={p.id} value={p.id}>{p.lastName} {p.firstName} ({p.emiasCode})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Тип</label>
              <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value as WaitingType })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                <option value="обследование">Обследование</option>
                <option value="консультация">Консультация</option>
                <option value="ДС">Диспансерное</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Описание</label>
              <input type="text" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="ЭхоКГ, ОАК, консультация кардиолога..."
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Приоритет</label>
              <select value={newItem.priority} onChange={e => setNewItem({ ...newItem, priority: e.target.value as WaitingPriority })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                <option value="P0">P0 — жизненно важно</option>
                <option value="P1">P1 — срочно</option>
                <option value="P2">P2 — планово</option>
                <option value="P3">P3 — рутинно</option>
                <option value="P4">P4 — факультативно</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Дедлайн (дней)</label>
              <select value={newItem.deadlineDays} onChange={e => setNewItem({ ...newItem, deadlineDays: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                <option value={3}>3 дня</option>
                <option value={7}>7 дней</option>
                <option value={14}>14 дней</option>
                <option value={30}>30 дней</option>
                <option value={60}>60 дней</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddNew}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Создать</button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="rounded-xl border p-4 mb-6 space-y-3" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
          <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Статус</div>
            <div className="flex gap-1.5">
              {(['all', 'ожидает', 'записан', 'выполнен'] as StatusFilter[]).map(s => (
                <FilterChip key={s} label={s === 'all' ? 'Все' : s} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Приоритет</div>
            <div className="flex gap-1.5">
              {(['all', 'P0', 'P1', 'P2', 'P3', 'P4'] as PriorityFilter[]).map(p => (
                <FilterChip key={p} label={p === 'all' ? 'Все' : p} active={priorityFilter === p} onClick={() => setPriorityFilter(p)}
                  color={p === 'P0' ? '#ef4444' : p === 'P1' ? '#f59e0b' : undefined} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--color-muted-foreground)' }}>Тип</div>
            <div className="flex gap-1.5">
              {(['all', 'обследование', 'консультация', 'ДС'] as TypeFilter[]).map(t => (
                <FilterChip key={t} label={t === 'all' ? 'Все' : t} active={typeFilter === t} onClick={() => setTypeFilter(t)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            <Filter size={32} className="mx-auto mb-3 opacity-30" />
            {items.length === 0 ? 'Лист ожидания пуст' : 'Ничего не найдено'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-muted)' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Приоритет</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Пациент</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Тип</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Описание</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Срок</th>
                  <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const status = statusStyle(item.status);
                  const priority = priorityStyle(item.priority);
                  const isDeadlineOverdue = item.deadline && isOverdue(item.deadline) && item.status !== 'выполнен';

                  return (
                    <tr key={item.id} className="border-t hover:bg-muted/20 transition-colors" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: priority.bg, color: priority.color }}>{item.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleOpenVisit(item.patientId)}
                          className="text-left hover:underline" style={{ color: 'var(--color-foreground)' }}>
                          <div className="font-medium">{item.patientName || item.patientCode}</div>
                          <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{item.patientCode}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-muted-foreground)' }}>{item.type}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-foreground)' }}>{item.description}</td>
                      <td className="px-4 py-3">
                        {item.deadline ? (
                          <span style={{ color: isDeadlineOverdue ? '#ef4444' : 'var(--color-muted-foreground)' }}>
                            {isDeadlineOverdue && <AlertTriangle size={12} className="inline mr-1" />}
                            {formatDateRu(item.deadline)}
                          </span>
                        ) : <span style={{ color: 'var(--color-muted-foreground)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                          style={{ backgroundColor: status.bg, color: status.color }}>{status.icon}{item.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status !== 'выполнен' && (
                            <>
                              <button onClick={() => handleAddResult(item)}
                                className="px-2.5 py-1 rounded text-xs font-medium"
                                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Внести результат</button>
                              <button onClick={() => handleMarkCompleted(item.id)}
                                className="px-2.5 py-1 rounded text-xs font-medium border"
                                style={{ borderColor: '#10b981', color: '#10b981' }}><Check size={12} /></button>
                            </>
                          )}
                          <button onClick={() => handleOpenVisit(item.patientId)}
                            className="px-2 py-1 rounded text-xs border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}><ArrowRight size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ResultEntryModal
        isOpen={resultModal.isOpen}
        onClose={() => { setResultModal({ isOpen: false }); loadData(); }}
        patientId={resultModal.patientId}
        prefilled={resultModal.prefilled}
      />
    </div>
  );
}