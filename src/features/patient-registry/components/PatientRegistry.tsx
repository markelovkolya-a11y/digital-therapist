// features/patient-registry/components/PatientRegistry.tsx
// v2.0.0 — Фильтрация по ХНИЗ

import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@core/store';
import { calculateAge, formatDateRu } from '@core/utils/date';
import { Search, Plus, User, X } from 'lucide-react';
import { CreatePatientInput } from '@core/types/patient';
import { patientSearchService, CHRONIC_FILTERS } from '@core/services/patientSearch.service';

export function PatientRegistry() {
  const patients = useAppStore(s => s.patients);
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  const selectPatient = useAppStore(s => s.selectPatient);
  const createPatient = useAppStore(s => s.createPatient);
  const deletePatient = useAppStore(s => s.deletePatient);
  const loadPatients = useAppStore(s => s.loadPatients);

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [diagnosisFilter, setDiagnosisFilter] = useState('');
  const [filteredPatients, setFilteredPatients] = useState<typeof patients>([]);

  // Форма нового пациента
  const [newEmiasCode, setNewEmiasCode] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female'>('male');

  // При изменении фильтра ХНИЗ — загружаем отфильтрованных пациентов
  useEffect(() => {
    if (diagnosisFilter) {
      const codes = patientSearchService.getCodesForFilter(diagnosisFilter);
      patientSearchService.findByDiagnosis(codes).then(setFilteredPatients);
    } else {
      setFilteredPatients([]);
    }
  }, [diagnosisFilter]);

  // Применяем поиск к текущему списку
  const displayedPatients = useMemo(() => {
    const source = diagnosisFilter ? filteredPatients : patients;
    
    if (!search.trim()) return source;
    
    const q = search.toLowerCase();
    return source.filter(
      p => p.emiasCode.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q)
    );
  }, [patients, filteredPatients, search, diagnosisFilter]);

  const handleAddPatient = async () => {
    if (!newEmiasCode || !newLastName || !newFirstName || !newBirthDate) return;

    const input: CreatePatientInput = {
      emiasCode: newEmiasCode,
      lastName: newLastName,
      firstName: newFirstName,
      birthDate: newBirthDate,
      gender: newGender,
    };

    await createPatient(input);
    setNewEmiasCode('');
    setNewLastName('');
    setNewFirstName('');
    setNewBirthDate('');
    setShowAddForm(false);
  };

  const handleDiagnosisFilter = (filterLabel: string) => {
    if (diagnosisFilter === filterLabel) {
      setDiagnosisFilter('');
    } else {
      setDiagnosisFilter(filterLabel);
    }
  };

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Картотека</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
          <Plus size={16} /> Новый пациент
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="mb-6 p-6 rounded-xl border space-y-4"
          style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--color-foreground)' }}>Новый пациент</h3>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Код ЕМИАС" value={newEmiasCode}
              onChange={e => setNewEmiasCode(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            <input type="text" placeholder="Фамилия" value={newLastName}
              onChange={e => setNewLastName(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            <input type="text" placeholder="Имя" value={newFirstName}
              onChange={e => setNewFirstName(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            <input type="date" value={newBirthDate} onChange={e => setNewBirthDate(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            <select value={newGender} onChange={e => setNewGender(e.target.value as 'male' | 'female')}
              className="px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddPatient}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Сохранить</button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        </div>
      )}

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
        <input type="text" placeholder="Поиск по коду или фамилии..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Фильтры ХНИЗ */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-xs font-medium mr-2" style={{ color: 'var(--color-muted-foreground)', paddingTop: '6px' }}>ХНИЗ:</span>
        {CHRONIC_FILTERS.map(f => (
          <button key={f.label} onClick={() => handleDiagnosisFilter(f.label)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border"
            style={{
              backgroundColor: diagnosisFilter === f.label ? 'var(--color-primary)' : 'transparent',
              color: diagnosisFilter === f.label ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
              borderColor: diagnosisFilter === f.label ? 'var(--color-primary)' : 'var(--color-border)',
            }}>
            {f.label}
          </button>
        ))}
        {diagnosisFilter && (
          <button onClick={() => setDiagnosisFilter('')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border"
            style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            ✕ Сбросить
          </button>
        )}
      </div>

      {/* Таблица */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--color-muted)' }}>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Код</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Фамилия Имя</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Возраст</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Пол</th>
            </tr>
          </thead>
          <tbody>
            {displayedPatients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                  {patients.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <User size={32} />
                      <span>Нет пациентов. Добавьте первого пациента.</span>
                    </div>
                  ) : diagnosisFilter ? (
                    'Нет пациентов с выбранным ХНИЗ'
                  ) : (
                    'Ничего не найдено'
                  )}
                </td>
              </tr>
            ) : (
              displayedPatients.map(p => (
                <tr key={p.id}
                  onClick={() => selectPatient(p.id === selectedPatientId ? null : p.id)}
                  className="border-b cursor-pointer transition-colors hover:bg-muted"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: p.id === selectedPatientId ? 'var(--color-accent)' : 'transparent',
                  }}>
                  <td className="px-4 py-3 font-mono text-xs">{p.emiasCode}</td>
                  <td className="px-4 py-3">{p.lastName} {p.firstName}</td>
                  <td className="px-4 py-3">{calculateAge(p.birthDate)}</td>
                  <td className="px-4 py-3">{p.gender === 'male' ? 'М' : 'Ж'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
        Всего: {displayedPatients.length}
        {diagnosisFilter && ` (фильтр: ${diagnosisFilter})`}
      </div>
    </div>
  );
}