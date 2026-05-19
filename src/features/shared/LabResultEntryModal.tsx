// features/shared/LabResultEntryModal.tsx
// v1.1.0 — Предзаполнение названия, опциональное заключение

import { useState, useEffect } from 'react';
import { useAppStore } from '@core/store';
import { eventRepo } from '@core/database/repositories';
import { waitingService } from '@core/services/waiting.service';
import { CreateEventInput, EventParameter } from '@core/types/events';
import { todayString } from '@core/utils/date';
import { LAB_PROFILES, LabProfile, getRefRange, LabParameter } from '@core/data/labReference';
import { X, Plus, Save, Search, User } from 'lucide-react';

interface LabResultEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilled?: {
    name?: string;
  };
}

interface ParamValue {
  param: LabParameter;
  value: string;
}

export function LabResultEntryModal({ isOpen, onClose, prefilled }: LabResultEntryModalProps) {
  const patients = useAppStore(s => s.patients);
  const [step, setStep] = useState<'selectPatient' | 'fillForm'>('selectPatient');
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<LabProfile>(LAB_PROFILES[0]);
  const [paramValues, setParamValues] = useState<ParamValue[]>([]);
  const [customParams, setCustomParams] = useState<ParamValue[]>([]);
  const [conclusion, setConclusion] = useState('');
  const [showConclusion, setShowConclusion] = useState(false);
  const [date, setDate] = useState(todayString());
  const [saving, setSaving] = useState(false);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomValue, setNewCustomValue] = useState('');
  const [newCustomUnit, setNewCustomUnit] = useState('');

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Сброс при открытии
  useEffect(() => {
    if (isOpen) {
      setDate(todayString());
      setConclusion('');
      setShowConclusion(false);
      setSaving(false);
      setCustomParams([]);
      setNewCustomName('');
      setNewCustomValue('');
      setNewCustomUnit('');
      setPatientSearch('');
      
      // Предзаполнение профиля
      if (prefilled?.name) {
        const matchedProfile = LAB_PROFILES.find(p => 
          p.name.toLowerCase().includes(prefilled.name!.toLowerCase()) ||
          p.id.toLowerCase().includes(prefilled.name!.toLowerCase())
        );
        if (matchedProfile) {
          setSelectedProfile(matchedProfile);
          setParamValues(matchedProfile.parameters.map(p => ({ param: p, value: '' })));
        } else {
          setSelectedProfile(LAB_PROFILES[0]);
          setParamValues(LAB_PROFILES[0].parameters.map(p => ({ param: p, value: '' })));
        }
      } else {
        setSelectedProfile(LAB_PROFILES[0]);
        setParamValues(LAB_PROFILES[0].parameters.map(p => ({ param: p, value: '' })));
      }

      setStep('selectPatient');
      setSelectedPatientId(null);
    }
  }, [isOpen]);

  const filteredPatients = patients
    .filter(p => !p.isArchived && !p.isDeceased)
    .filter(p => {
      if (!patientSearch.trim()) return true;
      const q = patientSearch.toLowerCase();
      return p.lastName.toLowerCase().includes(q) || 
             p.firstName.toLowerCase().includes(q) ||
             p.emiasCode.toLowerCase().includes(q);
    })
    .slice(0, 10);

  const handleSelectProfile = (profileId: string) => {
    const profile = LAB_PROFILES.find(p => p.id === profileId) || LAB_PROFILES[0];
    setSelectedProfile(profile);
    setParamValues(profile.parameters.map(p => ({ param: p, value: '' })));
    setCustomParams([]);
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setStep('fillForm');
  };

  const handleValueChange = (paramId: string, value: string) => {
    setParamValues(prev => prev.map(p => p.param.id === paramId ? { ...p, value } : p));
  };

  const handleAddCustomParam = () => {
    if (!newCustomName.trim()) return;
    const customParam: LabParameter = {
      id: `custom_${Date.now()}`,
      name: newCustomName.trim(),
      shortName: newCustomName.trim(),
      unit: newCustomUnit,
      refMin: 0,
      refMax: 0,
    };
    setCustomParams(prev => [...prev, { param: customParam, value: newCustomValue }]);
    setNewCustomName('');
    setNewCustomValue('');
    setNewCustomUnit('');
  };

  const handleSave = async () => {
    if (!selectedPatientId) return;
    setSaving(true);

    try {
      const eventParams: EventParameter[] = [
        { key: 'report_name', value: selectedProfile.name, unit: '' },
      ];

      if (showConclusion && conclusion.trim()) {
        eventParams.push({ key: 'conclusion', value: conclusion, unit: '' });
      }

      for (const pv of [...paramValues, ...customParams]) {
        if (pv.value.trim()) {
          eventParams.push({
            key: pv.param.id,
            value: parseFloat(pv.value) || pv.value,
            unit: pv.param.unit,
          });
        }
      }

      const event: CreateEventInput = {
        patientId: selectedPatientId,
        type: 'lab_result' as any,
        source: 'doctor_measured',
        timestamp: date,
        title: selectedProfile.name,
        parameters: eventParams,
      };

      await eventRepo.create(event);
      onClose();
    } catch (e) {
      console.error('Ошибка сохранения:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep('selectPatient');
    setSelectedPatientId(null);
    setPatientSearch('');
    setParamValues([]);
    setCustomParams([]);
    setConclusion('');
    setShowConclusion(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {step === 'selectPatient' ? 'Выберите пациента' : 'Внести результат анализа'}
          </h3>
          <button onClick={() => { handleReset(); onClose(); }} className="p-1 rounded hover:bg-muted"><X size={18} /></button>
        </div>

        {step === 'selectPatient' ? (
          <div className="p-4">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
              <input type="text" placeholder="Поиск по фамилии или коду..." value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredPatients.map(p => (
                <button key={p.id} onClick={() => handleSelectPatient(p.id)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-sm hover:bg-muted/30 transition-colors"
                  style={{ color: 'var(--color-foreground)' }}>
                  <User size={14} style={{ color: 'var(--color-muted-foreground)' }} />
                  <span className="font-medium">{p.lastName} {p.firstName}</span>
                  <span className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{p.emiasCode}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-sm">
              <User size={14} style={{ color: 'var(--color-primary)' }} />
              <span style={{ color: 'var(--color-foreground)' }}>{selectedPatient?.lastName} {selectedPatient?.firstName}</span>
              <button onClick={handleReset} className="ml-auto text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Сменить</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs mb-1">Тип анализа</label>
                <select value={selectedProfile.id} onChange={e => handleSelectProfile(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                  {LAB_PROFILES.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1">Дата выполнения</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-muted)' }}>
                    <th className="px-3 py-2 text-left font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Показатель</th>
                    <th className="px-3 py-2 text-center font-medium w-20" style={{ color: 'var(--color-muted-foreground)' }}>Значение</th>
                    <th className="px-3 py-2 text-center font-medium w-28" style={{ color: 'var(--color-muted-foreground)' }}>Реф. интервал</th>
                  </tr>
                </thead>
                <tbody>
                  {paramValues.map(pv => {
                    const ref = getRefRange(pv.param, selectedPatient?.gender || 'male');
                    const val = parseFloat(pv.value);
                    const isAbnormal = pv.value && (val < ref.min || val > ref.max);
                    return (
                      <tr key={pv.param.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="px-3 py-1.5" style={{ color: 'var(--color-foreground)' }}>{pv.param.name}</td>
                        <td className="px-3 py-1.5 text-center">
                          <input type="text" value={pv.value}
                            onChange={e => handleValueChange(pv.param.id, e.target.value)}
                            className="w-full px-2 py-1 rounded border text-xs text-center"
                            style={{
                              borderColor: isAbnormal ? '#ef4444' : 'var(--color-border)',
                              backgroundColor: isAbnormal ? '#fef2f2' : 'var(--color-background)',
                              color: isAbnormal ? '#991b1b' : 'var(--color-foreground)',
                            }} />
                        </td>
                        <td className="px-3 py-1.5 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
                          {pv.param.refMax > 0 ? `${ref.min}–${ref.max} ${pv.param.unit}` : pv.param.unit}
                        </td>
                      </tr>
                    );
                  })}
                  {customParams.map((pv, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-3 py-1.5" style={{ color: 'var(--color-foreground)' }}>{pv.param.name}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span style={{ color: 'var(--color-foreground)' }}>{pv.value}</span>
                      </td>
                      <td className="px-3 py-1.5 text-center" style={{ color: 'var(--color-muted-foreground)' }}>{pv.param.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs mb-0.5">Добавить показатель</label>
                <input type="text" placeholder="Показатель" value={newCustomName}
                  onChange={e => setNewCustomName(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
              <div className="w-20">
                <input type="text" placeholder="Знач." value={newCustomValue}
                  onChange={e => setNewCustomValue(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
              <div className="w-16">
                <input type="text" placeholder="Ед." value={newCustomUnit}
                  onChange={e => setNewCustomUnit(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border text-xs"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              </div>
              <button onClick={handleAddCustomParam}
                className="px-3 py-1.5 rounded text-xs font-medium"
                style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                <Plus size={14} />
              </button>
            </div>

            {/* Заключение — опционально */}
            <div>
              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--color-muted-foreground)' }}>
                <input type="checkbox" checked={showConclusion} onChange={e => setShowConclusion(e.target.checked)} />
                Добавить заключение
              </label>
              {showConclusion && (
                <textarea value={conclusion} onChange={e => setConclusion(e.target.value)}
                  placeholder="Например: без патологии, анемия лёгкой степени..."
                  rows={2} className="mt-1 w-full px-3 py-2 rounded-lg border text-sm resize-none"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
              )}
            </div>
          </div>
        )}

        {step === 'fillForm' && (
          <div className="flex gap-2 px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)', opacity: saving ? 0.6 : 1 }}>
              <Save size={14} /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={() => { handleReset(); onClose(); }}
              className="px-4 py-2 rounded-lg text-sm border"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
          </div>
        )}
      </div>
    </div>
  );
}