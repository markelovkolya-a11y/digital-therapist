// features/settings/SettingsScreen.tsx
// v1.2.0 — Полные настройки с местами проведения

import { useState, useEffect } from 'react';
import { BookOpen, Pill, FileText, User, Download, Upload, Stethoscope, MapPin } from 'lucide-react';
import { settingsRepo } from '@core/database/repositories/settings.repo';
import { DoctorProfile, TextSnippet } from '@core/types/settings';
import { FormulationEditor } from './FormulationEditor';
import { MedicationEditor } from './MedicationEditor';
import { ComplaintEditor } from './ComplaintEditor';
import { facilitiesRepo } from '@core/database/repositories/facilities.repo';
import { Facility } from '@core/types/facilities';

type SettingsTab = 'profile' | 'complaints' | 'formulations' | 'medications' | 'snippets' | 'facilities' | 'export';

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Профиль врача', icon: <User size={16} /> },
    { id: 'complaints', label: 'Жалобы', icon: <Stethoscope size={16} /> },
    { id: 'formulations', label: 'Клинические формулировки', icon: <FileText size={16} /> },
    { id: 'medications', label: 'Лекарственные препараты', icon: <Pill size={16} /> },
    { id: 'snippets', label: 'Шаблоны текста', icon: <BookOpen size={16} /> },
    { id: 'facilities', label: 'Места проведения', icon: <MapPin size={16} /> },
    { id: 'export', label: 'Импорт / Экспорт', icon: <Download size={16} /> },
  ];

  return (
    <div className="flex h-full">
      <div className="w-56 border-r p-4 space-y-1 shrink-0" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
        <h2 className="text-sm font-semibold mb-3 px-2" style={{ color: 'var(--color-foreground)' }}>Настройки</h2>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
            }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'profile' && <ProfileSection />}
        {activeTab === 'complaints' && <ComplaintEditor />}
        {activeTab === 'formulations' && <FormulationEditor />}
        {activeTab === 'medications' && <MedicationEditor />}
        {activeTab === 'snippets' && <SnippetEditor />}
        {activeTab === 'facilities' && <FacilityEditor />}
        {activeTab === 'export' && <ExportSection />}
      </div>
    </div>
  );
}

// ========== ПРОФИЛЬ ВРАЧА ==========
function ProfileSection() {
  const [profile, setProfile] = useState<DoctorProfile>({ fullName: '', specialty: 'терапевт', institution: '', district: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    settingsRepo.getDoctorProfile().then(setProfile);
  }, []);

  const handleSave = async () => {
    await settingsRepo.saveDoctorProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>Профиль врача</h3>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>ФИО</label>
          <input type="text" value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })}
            placeholder="Иванов Иван Иванович" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Специальность</label>
          <input type="text" value={profile.specialty} onChange={e => setProfile({ ...profile, specialty: e.target.value })}
            placeholder="терапевт" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Учреждение</label>
          <input type="text" value={profile.institution} onChange={e => setProfile({ ...profile, institution: e.target.value })}
            placeholder="ГБУЗ ГП №..." className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Участок</label>
          <input type="text" value={profile.district} onChange={e => setProfile({ ...profile, district: e.target.value })}
            placeholder="№" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        </div>
        <button onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ backgroundColor: saved ? '#10b981' : 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          {saved ? '✅ Сохранено' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}

// ========== РЕДАКТОР СНИППЕТОВ ==========
function SnippetEditor() {
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newShortcut, setNewShortcut] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newText, setNewText] = useState('');

  useEffect(() => { loadSnippets(); }, []);

  const loadSnippets = async () => {
    setLoading(true);
    setSnippets(await settingsRepo.getAllSnippets());
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newShortcut.trim() || !newText.trim()) return;
    await settingsRepo.createSnippet({ shortcut: newShortcut.trim(), label: newLabel.trim(), text: newText.trim() });
    setNewShortcut(''); setNewLabel(''); setNewText('');
    setShowAdd(false);
    await loadSnippets();
  };

  const handleDelete = async (id: string) => {
    await settingsRepo.deleteSnippet(id);
    await loadSnippets();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>Шаблоны текста</h3>
          <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            Введите <code style={{ backgroundColor: 'var(--color-muted)', padding: '1px 4px', borderRadius: 3 }}>//код</code> в текстовом поле — развернётся в полный текст
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          + Добавить
        </button>
      </div>

      {showAdd && (
        <div className="p-4 mb-4 rounded-lg border space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Код (без //)</label>
              <input type="text" value={newShortcut} onChange={e => setNewShortcut(e.target.value)}
                placeholder="кожаN" className="w-full px-3 py-2 rounded-lg border text-sm font-mono outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Описание</label>
              <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="Норма кожи" className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Текст</label>
            <textarea value={newText} onChange={e => setNewText(e.target.value)}
              placeholder="Кожные покровы чистые..." rows={2}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Сохранить</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg text-xs border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Загрузка...</div>
      ) : snippets.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Нет шаблонов</div>
      ) : (
        <div className="space-y-2">
          {snippets.map(s => (
            <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <code className="px-2 py-0.5 rounded text-xs font-mono shrink-0" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                //{s.shortcut}
              </code>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{s.label}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>{s.text.substring(0, 120)}{s.text.length > 120 ? '...' : ''}</div>
              </div>
              <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-muted shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========== ЭКСПОРТ / ИМПОРТ ==========
function ExportSection() {
  const [message, setMessage] = useState('');

  const handleExport = async (table: string, filename: string) => {
    try {
      const data = await settingsRepo.exportTable(table);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(`✅ Экспортировано: ${filename}`);
    } catch (e) {
      setMessage(`❌ Ошибка экспорта: ${e}`);
    }
  };

  const handleImport = async (table: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const count = await settingsRepo.importTable(table, text);
        setMessage(`✅ Импортировано записей: ${count}`);
      } catch (e) {
        setMessage(`❌ Ошибка импорта: ${e}`);
      }
    };
    input.click();
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-foreground)' }}>Импорт / Экспорт</h3>
      <p className="text-sm mb-6" style={{ color: 'var(--color-muted-foreground)' }}>
        Обменивайтесь справочниками с коллегами.
      </p>

      <div className="space-y-4 max-w-lg">
        {[
          { table: 'clinical_formulations', label: 'Клинические формулировки', file: 'formulations.json' },
          { table: 'medications', label: 'Лекарственные препараты', file: 'medications.json', note: 'medications + dosages + trade_names' },
          { table: 'text_snippets', label: 'Шаблоны текста', file: 'snippets.json' },
          { table: 'complaint_templates', label: 'Справочник жалоб', file: 'complaints.json' },
          { table: 'facilities', label: 'Места проведения', file: 'facilities.json' },
        ].map(item => (
          <div key={item.table} className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>{item.label}</h4>
            {item.note && <p className="text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>{item.note}</p>}
            <div className="flex gap-2">
              <button onClick={() => handleExport(item.table, item.file)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                <Download size={14} /> Экспорт
              </button>
              <button onClick={() => handleImport(item.table)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                <Upload size={14} /> Импорт
              </button>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div className="p-3 rounded-lg text-sm mt-4"
          style={{ backgroundColor: message.startsWith('✅') ? '#dcfce7' : '#fce4e4', color: message.startsWith('✅') ? '#166534' : '#991b1b' }}>
          {message}
        </div>
      )}
    </div>
  );
}

// ========== РЕДАКТОР МЕСТ ==========
function FacilityEditor() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'lab' | 'clinic' | 'hospital' | 'other'>('lab');

  useEffect(() => { facilitiesRepo.findAll().then(f => { setFacilities(f); setLoading(false); }); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await facilitiesRepo.create({ name: newName.trim(), category: newCategory });
    setNewName('');
    setShowAdd(false);
    setFacilities(await facilitiesRepo.findAll());
  };

  const handleDelete = async (id: string) => {
    await facilitiesRepo.delete(id);
    setFacilities(await facilitiesRepo.findAll());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>Места проведения</h3>
        <button onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          + Добавить
        </button>
      </div>

      {showAdd && (
        <div className="flex gap-2 mb-4">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Название" className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value as any)}
            className="px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
            <option value="lab">Лаборатория</option>
            <option value="clinic">Поликлиника</option>
            <option value="hospital">Больница</option>
            <option value="other">Другое</option>
          </select>
          <button onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Сохранить</button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {facilities.map(f => (
          <span key={f.id} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
            <span className="text-xs">
              {f.category === 'lab' ? '🧪' : f.category === 'clinic' ? '🏥' : f.category === 'hospital' ? '🚑' : '📍'}
            </span>
            {f.name}
            <button onClick={() => handleDelete(f.id)} style={{ color: 'var(--color-muted-foreground)' }}>✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}