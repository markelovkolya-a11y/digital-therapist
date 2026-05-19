// features/visit-protocol/components/VisitProtocol.tsx
// v2.3.0 — Сброс протокола при смене пациента, toast, базовая терапия вверх

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@core/store';
import { calculateAge, formatDateRu } from '@core/utils/date';
import {
  User, Save, ChevronDown, ChevronRight, Plus, X, Check,
  TrendingUp, TrendingDown, Minus, Search, FileText, PanelLeftClose, PanelLeftOpen, Edit3,
} from 'lucide-react';
import {
  SYSTEM_EXAM_TEMPLATES,
  COMMON_LAB_TESTS,
  COMMON_INSTRUMENTAL,
  COMMON_CONSULTATIONS,
  COMMON_NON_DRUG_RECOMMENDATIONS,
  LIFE_HISTORY_SNIPPETS,
} from '@core/data/examTemplates';
import { findInteractions, DrugInteractionRule } from '@core/data/drugInteractions';
import { ComplaintItem } from '@core/types/visit';
import { ICD10SearchModal } from './ICD10SearchModal';
import { FormulationSelectModal } from './FormulationSelectModal';
import { MedicationSearchModal } from './MedicationSearchModal';
import { ProtocolGenerator } from './ProtocolGenerator';
import { ContextColumn } from './ContextColumn';
import { DrugSafetyAlert } from './DrugSafetyAlert';
import { PreVisitSummary } from './PreVisitSummary';
import { useSnippets } from '../hooks/useSnippets';
import { useAutoSave } from '../hooks/useAutoSave';
import { complaintsRepo } from '@core/database/repositories/complaints.repo';

// ========== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ==========

function Section({ id, title, icon, expanded, onToggle, badge, children }: {
  id: string; title: string; icon?: string;
  expanded: boolean; onToggle: () => void;
  badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <button onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/30 transition-colors"
        style={{ color: 'var(--color-foreground)' }}>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {icon && <span>{icon}</span>}
        <span className="flex-1">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
            {badge}
          </span>
        )}
      </button>
      {expanded && (
        <div style={{ borderTop: '1px solid var(--color-border)' }}>
          <div className="p-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder, suffix, onBlur }: {
  label?: string; value: string | number; onChange: (v: string) => void;
  type?: string; placeholder?: string; suffix?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      {label && <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>{label}</label>}
      <div className="relative">
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} onBlur={onBlur}
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick, color }: {
  label: string; active: boolean; onClick: () => void; color?: string;
}) {
  return (
    <button onClick={onClick}
      className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border"
      style={{
        backgroundColor: active ? (color || 'var(--color-primary)') : 'transparent',
        color: active ? 'white' : 'var(--color-foreground)',
        borderColor: active ? (color || 'var(--color-primary)') : 'var(--color-border)',
      }}>
      {label}
    </button>
  );
}

function ComplaintRow({ complaint, onUpdate, onRemove }: {
  complaint: ComplaintItem;
  onUpdate: (upd: Partial<ComplaintItem>) => void;
  onRemove: () => void;
}) {
  const statuses = [
    { value: 'new', label: 'Новая', icon: <Plus size={12} />, color: '#3b82f6' },
    { value: 'persists', label: 'Сохраняется', icon: <Minus size={12} />, color: '#6b7280' },
    { value: 'worsened', label: 'Усилилась', icon: <TrendingUp size={12} />, color: '#ef4444' },
    { value: 'improved', label: 'Уменьшилась', icon: <TrendingDown size={12} />, color: '#10b981' },
    { value: 'resolved', label: 'Купирована', icon: <Check size={12} />, color: '#10b981' },
  ];

  return (
    <div className="p-2 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>{complaint.name}</span>
        <button onClick={onRemove} className="ml-auto" style={{ color: 'var(--color-muted-foreground)' }}><X size={14} /></button>
      </div>
      <div className="flex gap-1.5 flex-wrap mb-1">
        {statuses.map(s => (
          <button key={s.value} onClick={() => onUpdate({ status: s.value as any })}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs border"
            style={{
              backgroundColor: complaint.status === s.value ? s.color : 'transparent',
              color: complaint.status === s.value ? 'white' : 'var(--color-foreground)',
              borderColor: s.color,
            }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>
      <input type="text" placeholder="Детали жалобы..." value={complaint.details}
        onChange={e => onUpdate({ details: e.target.value })}
        className="w-full px-2 py-1 rounded border text-xs"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
    </div>
  );
}

function SystemExamRow({ system, index, onUpdate }: {
  system: import('@core/types/visit').SystemExamState;
  index: number;
  onUpdate: (upd: Partial<import('@core/types/visit').SystemExamState>) => void;
}) {
  const statusConfig = {
    normal: { label: 'Норма', color: '#10b981' },
    pathology: { label: 'Патология', color: '#ef4444' },
    not_examined: { label: 'Не осмотрен', color: '#6b7280' },
  };

  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-dashed" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-sm mt-0.5">{system.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--color-foreground)' }}>{system.shortName}</span>
          <div className="flex gap-1">
            {(['normal', 'pathology', 'not_examined'] as const).map(status => (
              <button key={status} onClick={() => onUpdate({ status })}
                className="px-1.5 py-0.5 rounded text-xs border"
                style={{
                  backgroundColor: system.status === status ? statusConfig[status].color : 'transparent',
                  color: system.status === status ? 'white' : 'var(--color-foreground)',
                  borderColor: statusConfig[status].color,
                  fontSize: '10px',
                }}>
                {statusConfig[status].label}
              </button>
            ))}
          </div>
        </div>
        {system.status === 'pathology' && (
          <input type="text" value={system.text}
            onChange={e => onUpdate({ text: e.target.value })}
            placeholder="Опишите патологию..."
            className="w-full mt-1 px-2 py-1 rounded border text-xs"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        )}
        {system.status === 'normal' && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted-foreground)' }}>
            {system.text.substring(0, 80)}{system.text.length > 80 ? '...' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function DiagnosisBadge({ item, onRemove, onChangeName, onSelectFormulation }: {
  item: { code: string; name: string };
  onRemove: () => void;
  onChangeName: (name: string) => void;
  onSelectFormulation?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const handleSave = () => { onChangeName(editName); setEditing(false); };

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
      <span className="font-mono text-xs font-medium shrink-0" style={{ color: 'var(--color-primary)' }}>{item.code}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            className="flex-1 px-2 py-0.5 rounded border text-xs" autoFocus
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
          <button onClick={handleSave} className="p-0.5 rounded" style={{ color: '#10b981' }}><Check size={14} /></button>
          <button onClick={() => setEditing(false)} className="p-0.5 rounded" style={{ color: 'var(--color-muted-foreground)' }}><X size={14} /></button>
        </div>
      ) : (
        <span className="flex-1 cursor-pointer hover:underline truncate"
          style={{ color: item.name ? 'var(--color-foreground)' : 'var(--color-muted-foreground)' }}
          onClick={() => { setEditName(item.name); setEditing(true); }}>
          {item.name || '⚡ Вписать формулировку'}
        </span>
      )}
      {onSelectFormulation && (
        <button onClick={onSelectFormulation} className="shrink-0 p-0.5 rounded hover:bg-muted"
          style={{ color: 'var(--color-muted-foreground)' }} title="Выбрать формулировку"><FileText size={14} /></button>
      )}
      <button onClick={onRemove} className="shrink-0" style={{ color: 'var(--color-muted-foreground)' }}><X size={14} /></button>
    </div>
  );
}

function MedicationRow({ med, onRemove, onEdit }: {
  med: import('@core/types/visit').MedicationState;
  onRemove: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
      <span className="font-medium" style={{ color: 'var(--color-foreground)' }}>{med.name}</span>
      <span style={{ color: 'var(--color-muted-foreground)' }}>{med.dose}</span>
      <span style={{ color: 'var(--color-muted-foreground)' }}>{med.frequency}</span>
      <span style={{ color: 'var(--color-muted-foreground)' }}>{med.duration}</span>
      {med.isBasic && (
        <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>базисная</span>
      )}
      {med.isContinued && (
        <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>продолжает</span>
      )}
      <button onClick={onEdit} className="ml-auto p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }} title="Редактировать">
        <Edit3 size={12} />
      </button>
      <button onClick={onRemove} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ========== ГЛАВНЫЙ КОМПОНЕНТ ==========

export function VisitProtocol() {
  const patients = useAppStore(s => s.patients);
  const selectedPatientId = useAppStore(s => s.selectedPatientId);
  const currentVisit = useAppStore(s => s.currentVisit);
  const initVisit = useAppStore(s => s.initVisit);
  const updateVisitDate = useAppStore(s => s.updateVisitDate);
  const updateVitals = useAppStore(s => s.updateVitals);
  const updateLifeHistory = useAppStore(s => s.updateLifeHistory);
  const addComplaint = useAppStore(s => s.addComplaint);
  const removeComplaint = useAppStore(s => s.removeComplaint);
  const updateComplaint = useAppStore(s => s.updateComplaint);
  const updateAnamnesis = useAppStore(s => s.updateAnamnesis);
  const updateSystemExam = useAppStore(s => s.updateSystemExam);
  const setAllSystemsNormal = useAppStore(s => s.setAllSystemsNormal);
  const markAllSystemsUnchanged = useAppStore(s => s.markAllSystemsUnchanged);
  const loadPreviousSystems = useAppStore(s => s.loadPreviousSystems);
  const loadPreviousBasicTherapy = useAppStore(s => s.loadPreviousBasicTherapy);
  const updatePrimaryDiagnosis = useAppStore(s => s.updatePrimaryDiagnosis);
  const addDiagnosisItem = useAppStore(s => s.addDiagnosisItem);
  const removeDiagnosisItem = useAppStore(s => s.removeDiagnosisItem);
  const updateDiagnosisItemName = useAppStore(s => s.updateDiagnosisItemName);
  const toggleExaminationItem = useAppStore(s => s.toggleExaminationItem);
  const updateExaminationPlan = useAppStore(s => s.updateExaminationPlan);
  const toggleNonDrugChip = useAppStore(s => s.toggleNonDrugChip);
  const updateTreatment = useAppStore(s => s.updateTreatment);
  const addMedication = useAppStore(s => s.addMedication);
  const removeMedication = useAppStore(s => s.removeMedication);
  const updateFollowUp = useAppStore(s => s.updateFollowUp);
  const saveVisit = useAppStore(s => s.saveVisit);

  const { expandSnippet, hasSnippets } = useSnippets();
  const { clearDraft } = useAutoSave();

  const [showPreVisit, setShowPreVisit] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'vitals', 'life', 'complaints', 'anamnesis', 'exam', 'diagnosis', 'plan', 'treatment', 'followup',
  ]);
  const [showContext, setShowContext] = useState(true);
  const [showAddMed, setShowAddMed] = useState(false);
  const [editingMed, setEditingMed] = useState<{ id: string; name: string; dose: string; frequency: string; duration: string; isBasic: boolean } | null>(null);
  const [showICD10Search, setShowICD10Search] = useState(false);
  const [icd10Target, setIcd10Target] = useState<'primary' | 'complications' | 'concomitant' | 'background'>('primary');
  const [showFormulationModal, setShowFormulationModal] = useState(false);
  const [formulationTarget, setFormulationTarget] = useState<{ type: 'primary' | 'complications' | 'concomitant' | 'background'; code?: string }>({ type: 'primary' });
  const [showMedicationSearch, setShowMedicationSearch] = useState(false);
  const [showProtocolGenerator, setShowProtocolGenerator] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dose: '', frequency: '', duration: '30 дней', isBasic: false });
  const [labCustomInput, setLabCustomInput] = useState('');
  const [instrCustomInput, setInstrCustomInput] = useState('');
  const [consCustomInput, setConsCustomInput] = useState('');
  const [complaintTemplates, setComplaintTemplates] = useState<{ id: string; name: string }[]>([]);
  const [newComplaintInput, setNewComplaintInput] = useState('');
  const [drugInteractions, setDrugInteractions] = useState<DrugInteractionRule[]>([]);
  const [showDrugAlerts, setShowDrugAlerts] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Сброс протокола при смене пациента
  useEffect(() => {
    if (selectedPatientId) {
      initVisit(selectedPatientId);
      setShowPreVisit(true);
    }
  }, [selectedPatientId]);

  useEffect(() => { complaintsRepo.findAll().then(setComplaintTemplates); }, []);

  useEffect(() => {
    if (!currentVisit) return;
    const medNames = currentVisit.treatment.medications.map(m => m.name);
    if (medNames.length === 0) { setDrugInteractions([]); return; }
    setDrugInteractions(findInteractions(medNames));
  }, [currentVisit?.treatment.medications]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveVisit(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); setShowProtocolGenerator(true); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveVisit]);

  // Индикатор автосохранения
useEffect(() => {
  const interval = setInterval(() => {
    if (currentVisit && currentVisit.status === 'draft') {
      localStorage.setItem(`visit_draft_${currentVisit.patientId}`, JSON.stringify(currentVisit));
      setAutoSaveStatus('💾 Черновик сохранён');
      setTimeout(() => setAutoSaveStatus(null), 2000);
    }
  }, 30000);
  return () => clearInterval(interval);
}, [currentVisit]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleAddCustomComplaint = () => {
    if (newComplaintInput.trim()) { addComplaint(newComplaintInput.trim()); setNewComplaintInput(''); }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = useCallback(async () => {
  if (!currentVisit) return;
  
  // Мягкая проверка
  const warnings: string[] = [];
  if (!currentVisit.diagnosis.primary.code) {
    warnings.push('Не указан основной диагноз');
  }
  if (currentVisit.complaints.length === 0 && !currentVisit.anamnesis.text) {
    warnings.push('Не указаны жалобы и анамнез');
  }
  if (currentVisit.treatment.medications.length === 0 && 
      currentVisit.examinationPlan.labTests.length === 0 &&
      currentVisit.examinationPlan.instrumental.length === 0 &&
      currentVisit.examinationPlan.consultations.length === 0) {
    warnings.push('Не назначено лечение или обследование');
  }
  
  if (warnings.length > 0) {
    const confirmed = confirm(
      `Предупреждение:\n${warnings.join('\n')}\n\nВсё равно сохранить протокол?`
    );
    if (!confirmed) return;
  }
  
  await saveVisit();
  if (currentVisit) clearDraft(currentVisit.patientId);
  showToast('✅ Протокол сохранён');
}, [saveVisit, currentVisit, clearDraft]);

  const handleEditMed = (med: import('@core/types/visit').MedicationState) => {
    setEditingMed({
      id: med.id,
      name: med.name,
      dose: med.dose,
      frequency: med.frequency,
      duration: med.duration,
      isBasic: med.isBasic,
    });
    setShowAddMed(true);
  };

  const handleSaveMed = () => {
    if (editingMed) {
      removeMedication(editingMed.id);
      addMedication({
        name: editingMed.name,
        dose: editingMed.dose,
        frequency: editingMed.frequency,
        duration: editingMed.duration,
        isBasic: editingMed.isBasic,
      });
      setEditingMed(null);
    } else if (newMed.name) {
      addMedication(newMed);
    }
    setNewMed({ name: '', dose: '', frequency: '', duration: '30 дней', isBasic: false });
    setShowAddMed(false);
    setEditingMed(null);
  };

  const setPriority = (item: string, priority: string, deadlineDays: number) => {
    if (!currentVisit) return;
    const priorities = { ...currentVisit.examinationPlan.priorities };
    priorities[item] = { ...priorities[item], priority, deadlineDays: deadlineDays || priorities[item]?.deadlineDays || 7 };
    updateExaminationPlan({ priorities });
  };

  const setDeadline = (item: string, deadlineDays: number, defaultPriority: string) => {
    if (!currentVisit) return;
    const priorities = { ...currentVisit.examinationPlan.priorities };
    priorities[item] = { ...priorities[item], deadlineDays, priority: priorities[item]?.priority || defaultPriority };
    updateExaminationPlan({ priorities });
  };

  const getPriority = (item: string) => currentVisit?.examinationPlan.priorities[item];

  if (!selectedPatient) {
    return (
      <div className="p-8 text-center">
        <User size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--color-muted-foreground)' }} />
        <p style={{ color: 'var(--color-muted-foreground)' }}>Выберите пациента в Картотеке</p>
      </div>
    );
  }

  if (!currentVisit) {
    return <div className="p-8 text-center"><p style={{ color: 'var(--color-muted-foreground)' }}>Загрузка протокола...</p></div>;
  }

  const getFormulationCode = () => {
    switch (formulationTarget.type) {
      case 'primary': return currentVisit.diagnosis.primary.code;
      case 'complications': return formulationTarget.code || '';
      case 'concomitant': return formulationTarget.code || '';
      case 'background': return formulationTarget.code || '';
    }
  };

  return (
    <div className="flex h-full">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-fade-in"
          style={{ backgroundColor: '#dcfce7', color: '#166534' }}>
          {toast}
        </div>
      )}

      {showContext && !showPreVisit && (
        <div className="w-64 shrink-0 border-r overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
          <ContextColumn />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto space-y-3 pb-32">
          {!showPreVisit && (
            <button onClick={() => setShowContext(!showContext)}
              className="flex items-center gap-1 text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
              {showContext ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
              {showContext ? 'Скрыть контекст' : 'Показать контекст'}
            </button>
          )}

          {showPreVisit ? (
            <PreVisitSummary
              onStartVisit={() => setShowPreVisit(false)}
              onLoadPrevious={() => {
                loadPreviousSystems();
                loadPreviousBasicTherapy();
                setShowPreVisit(false);
              }}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: 'var(--color-foreground)' }}>Протокол осмотра</h1>
                  <p style={{ color: 'var(--color-muted-foreground)' }}>
                    {selectedPatient.lastName} {selectedPatient.firstName}, {calculateAge(selectedPatient.birthDate)} лет
                  </p>
                  <div className="flex items-center gap-2 mt-1">
  <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Дата осмотра:</span>
  <input type="date" value={currentVisit.date} onChange={(e) => updateVisitDate(e.target.value)}
    className="px-2 py-1 rounded border text-xs"
    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
  {autoSaveStatus && (
    <span className="text-xs" style={{ color: '#10b981' }}>{autoSaveStatus}</span>
  )}
</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPreVisit(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                    ← Повестка
                  </button>
                  <button onClick={() => setShowProtocolGenerator(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors"
                    style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                    <FileText size={16} /> Протокол ЕМИАС
                  </button>
                  <button onClick={handleSave}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                    <Save size={16} /> Сохранить (Ctrl+S)
                  </button>
                </div>
              </div>

              {/* 1-4 секции без изменений */}
              {/* Витальные */}
              <Section id="vitals" title="Витальные показатели" icon="📊"
                expanded={expandedSections.includes('vitals')} onToggle={() => toggleSection('vitals')}>
                <div className="grid grid-cols-4 gap-3">
                  <Input label="САД" value={currentVisit.vitals.systolic || ''} onChange={v => updateVitals({ systolic: Number(v) })} suffix="mmHg" type="number" />
                  <Input label="ДАД" value={currentVisit.vitals.diastolic || ''} onChange={v => updateVitals({ diastolic: Number(v) })} suffix="mmHg" type="number" />
                  <Input label="ЧСС" value={currentVisit.vitals.heartRate || ''} onChange={v => updateVitals({ heartRate: Number(v) })} suffix="уд/мин" type="number" />
                  <Input label="ЧДД" value={currentVisit.vitals.respiratoryRate || ''} onChange={v => updateVitals({ respiratoryRate: Number(v) })} suffix="/мин" type="number" />
                  <Input label="SpO₂" value={currentVisit.vitals.spo2 || ''} onChange={v => updateVitals({ spo2: Number(v) })} suffix="%" type="number" />
                  <Input label="t°" value={currentVisit.vitals.temperature || ''} onChange={v => updateVitals({ temperature: Number(v) })} suffix="°C" type="number" />
                  <Input label="Рост" value={currentVisit.vitals.height || ''} onChange={v => updateVitals({ height: Number(v) })} suffix="см" type="number" />
                  <Input label="Вес" value={currentVisit.vitals.weight || ''} onChange={v => updateVitals({ weight: Number(v) })} suffix="кг" type="number" />
                </div>
              </Section>

              {/* Анамнез жизни */}
              <Section id="life" title="Анамнез жизни" icon="📋"
                expanded={expandedSections.includes('life')} onToggle={() => toggleSection('life')}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted-foreground)' }}>Курение</label>
                    <div className="flex gap-2">
                      {LIFE_HISTORY_SNIPPETS.smoking.map(s => (
                        <Chip key={s.label} label={s.label}
                          active={currentVisit.lifeHistory.smoking === (s.label === 'Не курит' ? 'never' : s.label === 'Курит' ? 'current' : 'quit')}
                          onClick={() => {
                            const val = s.label === 'Не курит' ? 'never' : s.label === 'Курит' ? 'current' : 'quit';
                            updateLifeHistory({ smoking: val as any, smokingDetails: s.text });
                          }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted-foreground)' }}>Алкоголь</label>
                    <div className="flex gap-2">
                      {LIFE_HISTORY_SNIPPETS.alcohol.map(s => (
                        <Chip key={s.label} label={s.label}
                          active={currentVisit.lifeHistory.alcohol === (s.label === 'Не употребляет' ? 'never' : s.label === 'Умеренно' ? 'moderate' : 'abuse')}
                          onClick={() => {
                            const val = s.label === 'Не употребляет' ? 'never' : s.label === 'Умеренно' ? 'moderate' : 'abuse';
                            updateLifeHistory({ alcohol: val as any, alcoholDetails: s.text });
                          }} />
                      ))}
                    </div>
                  </div>
                  <Input label="Аллергия" value={currentVisit.lifeHistory.allergy} onChange={v => updateLifeHistory({ allergy: v })} placeholder="Аллергоанамнез не отягощён" />
                  <Input label="Наследственность" value={currentVisit.lifeHistory.heredity} onChange={v => updateLifeHistory({ heredity: v })} placeholder="Не отягощена" />
                  <Input label="Профессия" value={currentVisit.lifeHistory.profession} onChange={v => updateLifeHistory({ profession: v })} />
                </div>
              </Section>

              {/* Жалобы */}
              <Section id="complaints" title="Жалобы" icon="🩺"
                expanded={expandedSections.includes('complaints')} onToggle={() => toggleSection('complaints')}
                badge={currentVisit.complaints.length > 0 ? String(currentVisit.complaints.length) : undefined}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-muted-foreground)' }}>Выбрать из справочника</label>
                    <div className="flex flex-wrap gap-1.5">
                      {complaintTemplates.map(c => (
                        <Chip key={c.id} label={c.name}
                          active={currentVisit.complaints.some(co => co.name === c.name)}
                          onClick={() => {
                            if (currentVisit.complaints.some(co => co.name === c.name)) {
                              const found = currentVisit.complaints.find(co => co.name === c.name);
                              if (found) removeComplaint(found.id);
                            } else { addComplaint(c.name); }
                          }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-muted-foreground)' }}>Или вписать свою</label>
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Введите жалобу и нажмите +" value={newComplaintInput}
                        onChange={e => setNewComplaintInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomComplaint(); } }}
                        className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                      <button onClick={handleAddCustomComplaint}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}><Plus size={14} /></button>
                    </div>
                  </div>
                  {currentVisit.complaints.length > 0 && (
                    <div className="space-y-2">
                      {currentVisit.complaints.map(c => (
                        <ComplaintRow key={c.id} complaint={c}
                          onUpdate={(upd) => updateComplaint(c.id, upd)} onRemove={() => removeComplaint(c.id)} />
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              {/* Анамнез заболевания */}
              <Section id="anamnesis" title="Анамнез заболевания" icon="📅"
                expanded={expandedSections.includes('anamnesis')} onToggle={() => toggleSection('anamnesis')}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--color-muted-foreground)' }}>Динамика</label>
                    <div className="flex gap-2">
                      <Chip label="📉 Ухудшение" active={currentVisit.anamnesis.dynamic === 'worsening'} onClick={() => updateAnamnesis({ dynamic: 'worsening' })} color="#ef4444" />
                      <Chip label="➖ Без динамики" active={currentVisit.anamnesis.dynamic === 'stable'} onClick={() => updateAnamnesis({ dynamic: 'stable' })} color="#6b7280" />
                      <Chip label="📈 Улучшение" active={currentVisit.anamnesis.dynamic === 'improving'} onClick={() => updateAnamnesis({ dynamic: 'improving' })} color="#10b981" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted-foreground)' }}>
                      Текст анамнеза <span className="ml-2 opacity-60">используйте //код для сниппетов</span>
                    </label>
                    <textarea value={currentVisit.anamnesis.text}
                      onChange={e => updateAnamnesis({ text: e.target.value })}
                      onBlur={e => { if (hasSnippets(e.target.value)) updateAnamnesis({ text: expandSnippet(e.target.value) }); }}
                      placeholder="Опишите историю развития заболевания..." rows={3}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                    {hasSnippets(currentVisit.anamnesis.text) && (
                      <button onClick={() => updateAnamnesis({ text: expandSnippet(currentVisit.anamnesis.text) })}
                        className="mt-1 px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Развернуть сниппеты</button>
                    )}
                  </div>
                </div>
              </Section>

                            {/* 5. Объективный статус */}
              <Section id="exam" title="Объективный статус" icon="🔍"
                expanded={expandedSections.includes('exam')} onToggle={() => toggleSection('exam')}
                badge={`${currentVisit.physicalExam.filter(s => s.status === 'pathology').length} пат.`}>
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={setAllSystemsNormal}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                      ✅ Все системы — норма
                    </button>
                    <button onClick={markAllSystemsUnchanged}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                      ✓ Без изменений
                    </button>
                    {currentVisit.previousExamSystems.length > 0 && (
                      <button onClick={() => loadPreviousSystems()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                        📋 Перенести из прошлого визита
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {currentVisit.physicalExam.map((system, i) => (
                      <SystemExamRow key={system.system} system={system} index={i}
                        onUpdate={(upd) => updateSystemExam(i, upd)} />
                    ))}
                  </div>
                </div>
              </Section>

              {/* 6. Диагноз */}
              <Section id="diagnosis" title="Диагноз" icon="🏥"
                expanded={expandedSections.includes('diagnosis')} onToggle={() => toggleSection('diagnosis')}>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                    <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>а) Основное заболевание</h4>
                    <div className="grid grid-cols-[1fr,2fr] gap-3 mb-2">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Код МКБ-10</label>
                        <div className="relative">
                          <button type="button" onClick={() => { setIcd10Target('primary'); setShowICD10Search(true); }}
                            className="w-full px-3 py-2 rounded-lg border text-sm text-left transition-colors hover:bg-muted/50 font-mono"
                            style={{
                              borderColor: currentVisit.diagnosis.primary.code ? 'var(--color-primary)' : 'var(--color-border)',
                              backgroundColor: 'var(--color-card)',
                              color: currentVisit.diagnosis.primary.code ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                            }}>
                            {currentVisit.diagnosis.primary.code || '🔍 Выбрать код...'}
                          </button>
                          {currentVisit.diagnosis.primary.code && (
                            <button type="button" onClick={() => { setFormulationTarget({ type: 'primary' }); setShowFormulationModal(true); }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                              style={{ color: 'var(--color-muted-foreground)' }} title="Выбрать формулировку">
                              <FileText size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <Input label="Клиническая формулировка" value={currentVisit.diagnosis.primary.name}
                        onChange={v => updatePrimaryDiagnosis({ name: v })}
                        placeholder="Гипертоническая болезнь II стадии, 2 степени, риск 3" />
                    </div>
                    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-foreground)' }}>
                      <input type="checkbox" checked={currentVisit.diagnosis.primary.isFirstTime}
                        onChange={e => updatePrimaryDiagnosis({ isFirstTime: e.target.checked })} />
                      Диагноз установлен впервые
                    </label>
                  </div>

                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                    <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>б) Осложнения основного заболевания</h4>
                    {currentVisit.diagnosis.complications.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {currentVisit.diagnosis.complications.map(d => (
                          <DiagnosisBadge key={d.code} item={d}
                            onRemove={() => removeDiagnosisItem('complications', d.code)}
                            onChangeName={(name) => updateDiagnosisItemName('complications', d.code, name)}
                            onSelectFormulation={() => { setFormulationTarget({ type: 'complications', code: d.code }); setShowFormulationModal(true); }} />
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => { setIcd10Target('complications'); setShowICD10Search(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-muted/50"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                      <Plus size={14} /> Добавить осложнение
                    </button>
                  </div>

                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                    <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>в) Сопутствующие заболевания</h4>
                    {currentVisit.diagnosis.concomitant.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {currentVisit.diagnosis.concomitant.map(d => (
                          <DiagnosisBadge key={d.code} item={d}
                            onRemove={() => removeDiagnosisItem('concomitant', d.code)}
                            onChangeName={(name) => updateDiagnosisItemName('concomitant', d.code, name)}
                            onSelectFormulation={() => { setFormulationTarget({ type: 'concomitant', code: d.code }); setShowFormulationModal(true); }} />
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => { setIcd10Target('concomitant'); setShowICD10Search(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-muted/50"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                      <Plus size={14} /> Добавить сопутствующее
                    </button>
                  </div>

                  <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                    <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>г) Фоновые заболевания</h4>
                    {currentVisit.diagnosis.background.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {currentVisit.diagnosis.background.map(d => (
                          <DiagnosisBadge key={d.code} item={d}
                            onRemove={() => removeDiagnosisItem('background', d.code)}
                            onChangeName={(name) => updateDiagnosisItemName('background', d.code, name)}
                            onSelectFormulation={() => { setFormulationTarget({ type: 'background', code: d.code }); setShowFormulationModal(true); }} />
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => { setIcd10Target('background'); setShowICD10Search(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors hover:bg-muted/50"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                      <Plus size={14} /> Добавить фоновое
                    </button>
                  </div>
                </div>
              </Section>

              {/* 7. План обследования */}
              <Section id="plan" title="План обследования" icon="🔬"
                expanded={expandedSections.includes('plan')} onToggle={() => toggleSection('plan')}>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>а) Лабораторные исследования</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_LAB_TESTS.map(test => (
                        <Chip key={test} label={test}
                          active={currentVisit.examinationPlan.labTests.includes(test)}
                          onClick={() => toggleExaminationItem('labTests', test)} />
                      ))}
                    </div>
                    {currentVisit.examinationPlan.labTests.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {currentVisit.examinationPlan.labTests.map(test => {
                          const prio = getPriority(test);
                          return (
                            <div key={test} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                              <span className="flex-1 font-medium" style={{ color: 'var(--color-foreground)' }}>{test}</span>
                              <select value={prio?.priority || 'P3'}
                                onChange={e => setPriority(test, e.target.value, prio?.deadlineDays || 7)}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value="P0">P0</option>
                                <option value="P1">P1</option>
                                <option value="P2">P2</option>
                                <option value="P3">P3</option>
                                <option value="P4">P4</option>
                              </select>
                              <select value={prio?.deadlineDays || 7}
                                onChange={e => setDeadline(test, Number(e.target.value), 'P3')}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value={3}>3 дн</option>
                                <option value={7}>7 дн</option>
                                <option value={14}>14 дн</option>
                                <option value={30}>30 дн</option>
                              </select>
                              <button onClick={() => toggleExaminationItem('labTests', test)}
                                className="p-0.5 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Добавить своё (Enter ↵)" value={labCustomInput}
                        onChange={e => setLabCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && labCustomInput.trim()) { toggleExaminationItem('labTests', labCustomInput.trim()); setLabCustomInput(''); } }}
                        className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                      <button onClick={() => { if (labCustomInput.trim()) { toggleExaminationItem('labTests', labCustomInput.trim()); setLabCustomInput(''); } }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}><Plus size={14} /></button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>б) Инструментальные</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_INSTRUMENTAL.map(test => (
                        <Chip key={test} label={test}
                          active={currentVisit.examinationPlan.instrumental.includes(test)}
                          onClick={() => toggleExaminationItem('instrumental', test)} />
                      ))}
                    </div>
                    {currentVisit.examinationPlan.instrumental.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {currentVisit.examinationPlan.instrumental.map(test => {
                          const prio = getPriority(test);
                          return (
                            <div key={test} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                              <span className="flex-1 font-medium" style={{ color: 'var(--color-foreground)' }}>{test}</span>
                              <select value={prio?.priority || 'P2'}
                                onChange={e => setPriority(test, e.target.value, prio?.deadlineDays || 14)}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value="P0">P0</option>
                                <option value="P1">P1</option>
                                <option value="P2">P2</option>
                                <option value="P3">P3</option>
                                <option value="P4">P4</option>
                              </select>
                              <select value={prio?.deadlineDays || 14}
                                onChange={e => setDeadline(test, Number(e.target.value), 'P2')}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value={7}>7 дн</option>
                                <option value={14}>14 дн</option>
                                <option value={30}>30 дн</option>
                                <option value={60}>60 дн</option>
                              </select>
                              <button onClick={() => toggleExaminationItem('instrumental', test)}
                                className="p-0.5 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Добавить своё (Enter ↵)" value={instrCustomInput}
                        onChange={e => setInstrCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && instrCustomInput.trim()) { toggleExaminationItem('instrumental', instrCustomInput.trim()); setInstrCustomInput(''); } }}
                        className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                      <button onClick={() => { if (instrCustomInput.trim()) { toggleExaminationItem('instrumental', instrCustomInput.trim()); setInstrCustomInput(''); } }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}><Plus size={14} /></button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>в) Консультации</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_CONSULTATIONS.map(cons => (
                        <Chip key={cons} label={cons}
                          active={currentVisit.examinationPlan.consultations.includes(cons)}
                          onClick={() => toggleExaminationItem('consultations', cons)} />
                      ))}
                    </div>
                    {currentVisit.examinationPlan.consultations.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {currentVisit.examinationPlan.consultations.map(cons => {
                          const prio = getPriority(cons);
                          return (
                            <div key={cons} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                              <span className="flex-1 font-medium" style={{ color: 'var(--color-foreground)' }}>{cons}</span>
                              <select value={prio?.priority || 'P2'}
                                onChange={e => setPriority(cons, e.target.value, prio?.deadlineDays || 30)}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value="P0">P0</option>
                                <option value="P1">P1</option>
                                <option value="P2">P2</option>
                                <option value="P3">P3</option>
                                <option value="P4">P4</option>
                              </select>
                              <select value={prio?.deadlineDays || 30}
                                onChange={e => setDeadline(cons, Number(e.target.value), 'P2')}
                                className="px-2 py-1 rounded border text-xs"
                                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value={14}>14 дн</option>
                                <option value={30}>30 дн</option>
                                <option value={60}>60 дн</option>
                                <option value={90}>90 дн</option>
                              </select>
                              <button onClick={() => toggleExaminationItem('consultations', cons)}
                                className="p-0.5 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
                                <X size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Добавить специалиста (Enter ↵)" value={consCustomInput}
                        onChange={e => setConsCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && consCustomInput.trim()) { toggleExaminationItem('consultations', consCustomInput.trim()); setConsCustomInput(''); } }}
                        className="flex-1 px-3 py-1.5 rounded-lg border text-xs"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                      <button onClick={() => { if (consCustomInput.trim()) { toggleExaminationItem('consultations', consCustomInput.trim()); setConsCustomInput(''); } }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              </Section>

              {/* 8. Лечение */}
              <Section id="treatment" title="Лечение" icon="💊"
                expanded={expandedSections.includes('treatment')} onToggle={() => toggleSection('treatment')}>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>а) Немедикаментозное лечение</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_NON_DRUG_RECOMMENDATIONS.map(rec => (
                        <Chip key={rec.label} label={rec.label} active={currentVisit.treatment.nonDrug.includes(rec.label)}
                          onClick={() => toggleNonDrugChip(rec.label)} />
                      ))}
                    </div>
                    {currentVisit.treatment.nonDrug.length > 0 && (
                      <div className="text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>Выбрано: {currentVisit.treatment.nonDrug.join(', ')}</div>
                    )}
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted-foreground)' }}>
                        Текст рекомендаций <span className="ml-2 opacity-60">//код</span>
                      </label>
                      <textarea value={currentVisit.treatment.nonDrugText}
                        onChange={e => updateTreatment({ nonDrugText: e.target.value })}
                        onBlur={e => { if (hasSnippets(e.target.value)) updateTreatment({ nonDrugText: expandSnippet(e.target.value) }); }}
                        placeholder="Диета с ограничением соли, дозированная ходьба..." rows={2}
                        className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>б) Медикаментозное лечение</h4>
                    {drugInteractions.length > 0 && showDrugAlerts && (
                      <div className="mb-3">
                        <DrugSafetyAlert interactions={drugInteractions} onDismiss={() => setShowDrugAlerts(false)} />
                      </div>
                    )}
                    {currentVisit.treatment.medications.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {currentVisit.treatment.medications.map(med => (
                          <MedicationRow key={med.id} med={med}
                            onRemove={() => removeMedication(med.id)}
                            onEdit={() => handleEditMed(med)} />
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <button onClick={() => setShowMedicationSearch(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                        <Search size={14} /> Найти препарат
                      </button>
                      <button onClick={() => { setEditingMed(null); setNewMed({ name: '', dose: '', frequency: '', duration: '30 дней', isBasic: false }); setShowAddMed(true); }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                        <Plus size={14} /> Ввести вручную
                      </button>
                      {currentVisit.treatment.basicTherapy.length > 0 && (
                        <button onClick={() => loadPreviousBasicTherapy()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border"
                          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                          💊 Базисная терапия ({currentVisit.treatment.basicTherapy.length})
                        </button>
                      )}
                    </div>
                    {showAddMed && (
                      <div className="p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-foreground)' }}>
                          <input type="checkbox"
                            checked={editingMed ? editingMed.isBasic : newMed.isBasic}
                            onChange={e => editingMed
                              ? setEditingMed({ ...editingMed, isBasic: e.target.checked })
                              : setNewMed(p => ({ ...p, isBasic: e.target.checked }))} />
                          Базисная терапия
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input label="Препарат"
                            value={editingMed ? editingMed.name : newMed.name}
                            onChange={v => editingMed
                              ? setEditingMed({ ...editingMed, name: v })
                              : setNewMed(p => ({ ...p, name: v }))}
                            placeholder="Лизиноприл" />
                          <Input label="Доза"
                            value={editingMed ? editingMed.dose : newMed.dose}
                            onChange={v => editingMed
                              ? setEditingMed({ ...editingMed, dose: v })
                              : setNewMed(p => ({ ...p, dose: v }))}
                            placeholder="10 мг" />
                          <Input label="Кратность"
                            value={editingMed ? editingMed.frequency : newMed.frequency}
                            onChange={v => editingMed
                              ? setEditingMed({ ...editingMed, frequency: v })
                              : setNewMed(p => ({ ...p, frequency: v }))}
                            placeholder="1 раз в день" />
                          <Input label="Длительность"
                            value={editingMed ? editingMed.duration : newMed.duration}
                            onChange={v => editingMed
                              ? setEditingMed({ ...editingMed, duration: v })
                              : setNewMed(p => ({ ...p, duration: v }))}
                            placeholder="30 дней" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveMed}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                            ✓ {editingMed ? 'Сохранить' : 'Добавить'}
                          </button>
                          <button onClick={() => { setShowAddMed(false); setEditingMed(null); }}
                            className="px-3 py-1.5 rounded-lg text-xs border"
                            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              {/* 9. Контрольная явка */}
              <Section id="followup" title="Контрольная явка" icon="📅"
                expanded={expandedSections.includes('followup')} onToggle={() => toggleSection('followup')}>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {[
                      { label: 'Через 1 месяц', days: 30 },
                      { label: 'Через 3 месяца', days: 90 },
                      { label: 'Через 6 месяцев', days: 180 },
                      { label: 'Через 1 год', days: 365 },
                    ].map(opt => (
                      <Chip key={opt.label} label={opt.label} active={false}
                        onClick={() => {
                          const d = new Date(currentVisit.date);
                          d.setDate(d.getDate() + opt.days);
                          updateFollowUp({ date: d.toISOString().split('T')[0] });
                        }} />
                    ))}
                  </div>
                  <Input label="Дата явки" value={currentVisit.followUp.date}
                    onChange={v => updateFollowUp({ date: v })} type="date" />
                  <Input label="Причина явки" value={currentVisit.followUp.reason}
                    onChange={v => updateFollowUp({ reason: v })} placeholder="Контроль АД, оценка терапии" />
                </div>
              </Section>

              {/* Модальные окна */}
              <ICD10SearchModal
                isOpen={showICD10Search}
                onClose={() => setShowICD10Search(false)}
                onSelect={(code, name) => {
                  switch (icd10Target) {
                    case 'primary': updatePrimaryDiagnosis({ code, name }); break;
                    case 'complications': addDiagnosisItem('complications', { code, name }); break;
                    case 'concomitant': addDiagnosisItem('concomitant', { code, name }); break;
                    case 'background': addDiagnosisItem('background', { code, name }); break;
                  }
                  setShowICD10Search(false);
                }}
                title={
                  icd10Target === 'primary' ? 'Поиск основного диагноза' :
                  icd10Target === 'complications' ? 'Поиск осложнения' :
                  icd10Target === 'concomitant' ? 'Поиск сопутствующего' : 'Поиск фонового'
                }
              />

              <FormulationSelectModal
                isOpen={showFormulationModal}
                onClose={() => setShowFormulationModal(false)}
                onSelect={(text) => {
                  switch (formulationTarget.type) {
                    case 'primary': updatePrimaryDiagnosis({ name: text }); break;
                    case 'complications': if (formulationTarget.code) updateDiagnosisItemName('complications', formulationTarget.code, text); break;
                    case 'concomitant': if (formulationTarget.code) updateDiagnosisItemName('concomitant', formulationTarget.code, text); break;
                    case 'background': if (formulationTarget.code) updateDiagnosisItemName('background', formulationTarget.code, text); break;
                  }
                  setShowFormulationModal(false);
                }}
                icd10Code={getFormulationCode()}
              />

              <MedicationSearchModal
                isOpen={showMedicationSearch}
                onClose={() => setShowMedicationSearch(false)}
                onSelect={(inn, dosage, frequency, isBasic) => {
                  addMedication({ name: inn, dose: dosage, frequency: frequency, duration: '30 дней', isBasic: isBasic });
                  setShowMedicationSearch(false);
                }}
              />

              <ProtocolGenerator
                isOpen={showProtocolGenerator}
                onClose={() => setShowProtocolGenerator(false)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}