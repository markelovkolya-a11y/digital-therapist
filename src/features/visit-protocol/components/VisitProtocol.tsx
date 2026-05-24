// features/visit-protocol/components/VisitProtocol.tsx
// v2.7.0 — Обязательные поля + подсветка + депрескрайбинг + STOPP + тактика + профиль

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@core/store';
import { calculateAge, formatDateRu } from '@core/utils/date';
import {
  User, Save, ChevronDown, ChevronRight, Plus, X, Check,
  TrendingUp, TrendingDown, Minus, Search, FileText, PanelLeftClose, PanelLeftOpen, Edit3, Activity,
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
import { checkStoppCriteria } from '@core/data/stoppCriteria';
import { ComplaintItem } from '@core/types/visit';
import { ICD10SearchModal } from './ICD10SearchModal';
import { FormulationSelectModal } from './FormulationSelectModal';
import { MedicationSearchModal } from './MedicationSearchModal';
import { ProtocolGenerator } from './ProtocolGenerator';
import { ContextColumn } from './ContextColumn';
import { DrugSafetyAlert } from './DrugSafetyAlert';
import { PreVisitSummary } from './PreVisitSummary';
import { BiopsychosocialModal } from './BiopsychosocialModal';
import { useSnippets } from '../hooks/useSnippets';
import { useAutoSave } from '../hooks/useAutoSave';
import { complaintsRepo } from '@core/database/repositories/complaints.repo';
import { SymptomHelperModal } from './SymptomHelperModal';
import { checkRedFlags } from '@core/data/redFlags';

// ========== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ==========

function Section({ id, title, icon, expanded, onToggle, badge, highlight, children }: {
  id: string; title: string; icon?: string;
  expanded: boolean; onToggle: () => void;
  badge?: string; highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{
      backgroundColor: 'var(--color-card)',
      borderColor: highlight ? '#ef4444' : 'var(--color-border)',
      boxShadow: highlight ? '0 0 0 1px #ef4444' : 'none',
    }}>
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
  const [expanded, setExpanded] = useState(system.status === 'pathology' || system.status === 'not_examined');

  useEffect(() => {
    if (system.status === 'pathology' || system.status === 'not_examined') {
      setExpanded(true);
    }
  }, [system.status]);

  const statusConfig = {
    normal: { label: 'Норма', color: '#10b981', bg: '#dcfce7' },
    pathology: { label: 'Патология', color: '#ef4444', bg: '#fef2f2' },
    not_examined: { label: 'Не осмотрен', color: '#6b7280', bg: '#f3f4f6' },
  };

  const config = statusConfig[system.status];

  return (
    <div className="py-1.5 border-b border-dashed" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <span className="text-sm">{system.icon}</span>
        <span className="text-sm font-medium flex-1 truncate" style={{ color: 'var(--color-foreground)' }}>{system.shortName}</span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: config.bg, color: config.color }}>
          {config.label}
        </span>
        <span style={{ color: 'var(--color-muted-foreground)' }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>
      {expanded && (
        <div className="mt-1.5 pl-6">
          {system.status === 'pathology' ? (
            <input type="text" value={system.text}
              onChange={e => onUpdate({ text: e.target.value })}
              placeholder="Опишите патологию..."
              className="w-full px-2 py-1.5 rounded border text-xs"
              style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2', color: 'var(--color-foreground)' }} />
          ) : system.status === 'normal' ? (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {system.text}
              <button onClick={(e) => { e.stopPropagation(); onUpdate({ status: 'pathology' }); }}
                className="ml-2 text-xs" style={{ color: 'var(--color-primary)' }}>изменить</button>
            </p>
          ) : (
            <div className="flex gap-1">
              {(['normal', 'pathology'] as const).map(status => (
                <button key={status} onClick={() => onUpdate({ status })}
                  className="px-2 py-0.5 rounded text-xs border"
                  style={{ borderColor: statusConfig[status].color, color: statusConfig[status].color }}>
                  {statusConfig[status].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
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

function MedicationRow({ med, onRemove, onEdit, onDeprescribe }: {
  med: import('@core/types/visit').MedicationState;
  onRemove: () => void;
  onEdit: () => void;
  onDeprescribe: () => void;
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
      <button onClick={onDeprescribe} className="ml-auto p-1 rounded hover:bg-muted text-xs"
        style={{ color: '#ef4444' }} title="Депрескрайбинг (отмена с причиной)">🗑️</button>
      <button onClick={onEdit} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }} title="Редактировать">
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
  const [showBiopsychosocial, setShowBiopsychosocial] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', dose: '', frequency: '', duration: '30 дней', isBasic: false });
  const [labCustomInput, setLabCustomInput] = useState('');
  const [instrCustomInput, setInstrCustomInput] = useState('');
  const [consCustomInput, setConsCustomInput] = useState('');
  const [complaintTemplates, setComplaintTemplates] = useState<{ id: string; name: string }[]>([]);
  const [newComplaintInput, setNewComplaintInput] = useState('');
  const [drugInteractions, setDrugInteractions] = useState<DrugInteractionRule[]>([]);
  const [showDrugAlerts, setShowDrugAlerts] = useState(true);
  const [stoppAlerts, setStoppAlerts] = useState<any[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [deprescribeTarget, setDeprescribeTarget] = useState<{ id: string; name: string } | null>(null);
  const [deprescribeReason, setDeprescribeReason] = useState('');
  const [showSymptomHelper, setShowSymptomHelper] = useState(false);
  const [redFlags, setRedFlags] = useState<any[]>([]);
  const [showRotateDiagnosis, setShowRotateDiagnosis] = useState(false);
const [rotateTarget, setRotateTarget] = useState<'complications' | 'concomitant' | 'background'>('concomitant');
const [rotateNewCode, setRotateNewCode] = useState('');
const [rotateNewName, setRotateNewName] = useState('');

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Сброс протокола при смене пациента
  useEffect(() => {
    if (selectedPatientId) {
      initVisit(selectedPatientId);
      setShowPreVisit(true);
    }
  }, [selectedPatientId]);

  useEffect(() => { complaintsRepo.findAll().then(setComplaintTemplates); }, []);

  // Лекарственные взаимодействия
  useEffect(() => {
    if (!currentVisit) return;
    const medNames = currentVisit.treatment.medications.map(m => m.name);
    if (medNames.length === 0) { setDrugInteractions([]); return; }
    setDrugInteractions(findInteractions(medNames));
  }, [currentVisit?.treatment.medications]);

  // STOPP-проверка
  useEffect(() => {
    if (!currentVisit || !selectedPatient) return;
    const age = calculateAge(selectedPatient.birthDate);
    if (age < 65) { setStoppAlerts([]); return; }
    const meds = currentVisit.treatment.medications.map(m => m.name);
    const diag = [currentVisit.diagnosis.primary.code].filter(Boolean);
    setStoppAlerts(checkStoppCriteria(meds, diag, age));
  }, [currentVisit?.treatment.medications]);

  // Быстрые клавиши
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

  // Сброс ошибок валидации при изменении данных
  useEffect(() => {
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  }, [currentVisit?.diagnosis.primary.code, currentVisit?.complaints, currentVisit?.treatment.medications]);

  // Красные флаги
useEffect(() => {
  if (!currentVisit) return;
  const complaintNames = currentVisit.complaints.map(c => c.name);
  if (complaintNames.length === 0) { setRedFlags([]); return; }
  setRedFlags(checkRedFlags(complaintNames));
}, [currentVisit?.complaints]);

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
    
    const errors: string[] = [];
    
    if (!currentVisit.diagnosis.primary.code) {
      errors.push('diagnosis');
    }
    if (currentVisit.complaints.length === 0 && !currentVisit.anamnesis.text) {
      errors.push('complaints');
    }
    if (currentVisit.treatment.medications.length === 0 && 
        currentVisit.examinationPlan.labTests.length === 0 &&
        currentVisit.examinationPlan.instrumental.length === 0 &&
        currentVisit.examinationPlan.consultations.length === 0) {
      errors.push('treatment');
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      showToast('⚠️ Заполните обязательные поля (подсвечены красным)');
      const sectionsToOpen = new Set(expandedSections);
      if (errors.includes('diagnosis')) sectionsToOpen.add('diagnosis');
      if (errors.includes('complaints')) sectionsToOpen.add('complaints');
      if (errors.includes('treatment')) sectionsToOpen.add('treatment');
      setExpandedSections([...sectionsToOpen]);
      setTimeout(() => setValidationErrors([]), 5000);
      return;
    }
    
    await saveVisit();
    if (currentVisit) clearDraft(currentVisit.patientId);
    showToast('✅ Протокол сохранён');
  }, [saveVisit, currentVisit, clearDraft, expandedSections]);

  const handleEditMed = (med: import('@core/types/visit').MedicationState) => {
    setEditingMed({
      id: med.id, name: med.name, dose: med.dose,
      frequency: med.frequency, duration: med.duration, isBasic: med.isBasic,
    });
    setShowAddMed(true);
  };

  const handleSaveMed = () => {
    if (editingMed) {
      removeMedication(editingMed.id);
      addMedication({
        name: editingMed.name, dose: editingMed.dose,
        frequency: editingMed.frequency, duration: editingMed.duration,
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

  const handleDeprescribe = (med: import('@core/types/visit').MedicationState) => {
    setDeprescribeTarget({ id: med.id, name: med.name });
    setDeprescribeReason('');
  };

  const confirmDeprescribe = async () => {
    if (!deprescribeTarget || !currentVisit) return;
    const { eventRepo } = await import('@core/database/repositories');
    await eventRepo.create({
      patientId: currentVisit.patientId,
      type: 'prescription_stop',
      source: 'doctor_measured',
      timestamp: currentVisit.date,
      title: `Отменено: ${deprescribeTarget.name}`,
      parameters: [
        { key: 'drug_name', value: deprescribeTarget.name, unit: '' },
        { key: 'stop_reason', value: deprescribeReason, unit: '' },
      ],
    });
    removeMedication(deprescribeTarget.id);
    setDeprescribeTarget(null);
    showToast(`✅ ${deprescribeTarget.name} отменён`);
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
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
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

              {/* 1. Витальные показатели */}
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

              {/* 2. Анамнез жизни */}
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

              {/* 3. Жалобы */}
              <Section id="complaints" title="Жалобы" icon="🩺"
                expanded={expandedSections.includes('complaints')} onToggle={() => toggleSection('complaints')}
                badge={currentVisit.complaints.length > 0 ? String(currentVisit.complaints.length) : undefined}
                highlight={validationErrors.includes('complaints')}>
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
                  {/* Красные флаги */}
{redFlags.length > 0 && (
  <div className="p-3 rounded-lg border" style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-semibold" style={{ color: '#991b1b' }}>🚨 Красные флаги</span>
    </div>
    {redFlags.map(flag => (
      <div key={flag.id} className="text-xs mb-1" style={{ color: '#991b1b' }}>
        <span className="font-medium">{flag.flag}</span>
        <div className="opacity-80">{flag.message}</div>
      </div>
    ))}
  </div>
)}
                </div>
              </Section>

              {/* 4. Анамнез заболевания */}
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
                badge={`${currentVisit.physicalExam.filter(s => s.status === 'pathology').length} пат. / ${currentVisit.physicalExam.filter(s => s.status === 'not_examined').length} не осм.`}>
                <div className="space-y-1">
                  <div className="flex gap-2 flex-wrap mb-3">
                    <button onClick={setAllSystemsNormal}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>✅ Все — норма</button>
                    <button onClick={markAllSystemsUnchanged}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>✓ Без изменений</button>
                    {currentVisit.previousExamSystems.length > 0 && (
                      <button onClick={() => loadPreviousSystems()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                        style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>📋 Из прошлого</button>
                    )}
                  </div>
                  {currentVisit.physicalExam.map((system, i) => (
                    <SystemExamRow key={system.system} system={system} index={i}
                      onUpdate={(upd) => updateSystemExam(i, upd)} />
                  ))}
                </div>
              </Section>

                             {/* 6. Диагноз */}
              <Section id="diagnosis" title="Диагноз" icon="🏥"
                expanded={expandedSections.includes('diagnosis')} onToggle={() => toggleSection('diagnosis')}>
                <div className="space-y-3">
                  
                  {/* Основной */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Основной</span>
                      {currentVisit.diagnosis.primary.code && (
                        <button onClick={() => setShowRotateDiagnosis(true)}
                          className="text-xs px-2 py-0.5 rounded border"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                          🔄 Сменить основной
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <button type="button" onClick={() => { setIcd10Target('primary'); setShowICD10Search(true); }}
                        className="px-3 py-2 rounded-lg border text-sm text-left font-mono shrink-0"
                        style={{
                          borderColor: validationErrors.includes('diagnosis') ? '#ef4444' : currentVisit.diagnosis.primary.code ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: validationErrors.includes('diagnosis') ? '#fef2f2' : 'var(--color-card)',
                          color: currentVisit.diagnosis.primary.code ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                        }}>
                        {currentVisit.diagnosis.primary.code || '🔍 Код...'}
                      </button>
                      <input type="text" value={currentVisit.diagnosis.primary.name}
                        onChange={e => updatePrimaryDiagnosis({ name: e.target.value })}
                        placeholder="Клиническая формулировка"
                        className="flex-1 px-3 py-2 rounded-lg border text-sm"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                      {currentVisit.diagnosis.primary.code && (
                        <button onClick={() => { setFormulationTarget({ type: 'primary' }); setShowFormulationModal(true); }}
                          className="p-2 rounded-lg border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                          <FileText size={14} />
                        </button>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-foreground)' }}>
                      <input type="checkbox" checked={currentVisit.diagnosis.primary.isFirstTime}
                        onChange={e => updatePrimaryDiagnosis({ isFirstTime: e.target.checked })} />
                      Впервые
                    </label>
                  </div>

                  <div className="border-t" style={{ borderColor: 'var(--color-border)' }} />

                  {/* Осложнения */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Осложнения основного</span>
                      <button onClick={() => { setIcd10Target('complications'); setShowICD10Search(true); }}
                        className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>+ Добавить</button>
                    </div>
                    {currentVisit.diagnosis.complications.length > 0 ? (
                      <div className="space-y-1">
                        {currentVisit.diagnosis.complications.map(d => (
                          <DiagnosisBadge key={d.code} item={d}
                            onRemove={() => removeDiagnosisItem('complications', d.code)}
                            onChangeName={(name) => updateDiagnosisItemName('complications', d.code, name)}
                            onSelectFormulation={() => { setFormulationTarget({ type: 'complications', code: d.code }); setShowFormulationModal(true); }} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>(нет)</div>
                    )}
                  </div>

                  {/* Сопутствующие */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>Сопутствующие</span>
                      <button onClick={() => { setIcd10Target('concomitant'); setShowICD10Search(true); }}
                        className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>+ Добавить</button>
                    </div>
                    {currentVisit.diagnosis.concomitant.length > 0 ? (
                      <div className="space-y-1">
                        {currentVisit.diagnosis.concomitant.map(d => (
                          <DiagnosisBadge key={d.code} item={d}
                            onRemove={() => removeDiagnosisItem('concomitant', d.code)}
                            onChangeName={(name) => updateDiagnosisItemName('concomitant', d.code, name)}
                            onSelectFormulation={() => { setFormulationTarget({ type: 'concomitant', code: d.code }); setShowFormulationModal(true); }} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>(нет)</div>
                    )}
                  </div>
                </div>
              </Section>

              {/* 7. План обследования */}
              <Section id="plan" title="План обследования" icon="🔬"
                expanded={expandedSections.includes('plan')} onToggle={() => toggleSection('plan')}>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>Лабораторные</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_LAB_TESTS.map(test => (
                        <Chip key={test} label={test} active={currentVisit.examinationPlan.labTests.includes(test)}
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
                              <select value={prio?.priority || 'P3'} onChange={e => setPriority(test, e.target.value, prio?.deadlineDays || 7)}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option>
                              </select>
                              <select value={prio?.deadlineDays || 7} onChange={e => setDeadline(test, Number(e.target.value), 'P3')}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value={3}>3 дн</option><option value={7}>7 дн</option><option value={14}>14 дн</option><option value={30}>30 дн</option>
                              </select>
                              <button onClick={() => toggleExaminationItem('labTests', test)} className="p-0.5 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}><X size={12} /></button>
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
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>Инструментальные</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_INSTRUMENTAL.map(test => (
                        <Chip key={test} label={test} active={currentVisit.examinationPlan.instrumental.includes(test)}
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
                              <select value={prio?.priority || 'P2'} onChange={e => setPriority(test, e.target.value, prio?.deadlineDays || 14)}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option>
                              </select>
                              <select value={prio?.deadlineDays || 14} onChange={e => setDeadline(test, Number(e.target.value), 'P2')}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value={7}>7 дн</option><option value={14}>14 дн</option><option value={30}>30 дн</option><option value={60}>60 дн</option>
                              </select>
                              <button onClick={() => toggleExaminationItem('instrumental', test)} className="p-0.5 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}><X size={12} /></button>
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
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>Консультации</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_CONSULTATIONS.map(cons => (
                        <Chip key={cons} label={cons} active={currentVisit.examinationPlan.consultations.includes(cons)}
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
                              <select value={prio?.priority || 'P2'} onChange={e => setPriority(cons, e.target.value, prio?.deadlineDays || 30)}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option><option value="P4">P4</option>
                              </select>
                              <select value={prio?.deadlineDays || 30} onChange={e => setDeadline(cons, Number(e.target.value), 'P2')}
                                className="px-2 py-1 rounded border text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}>
                                <option value={14}>14 дн</option><option value={30}>30 дн</option><option value={60}>60 дн</option><option value={90}>90 дн</option>
                              </select>
                              <button onClick={() => toggleExaminationItem('consultations', cons)} className="p-0.5 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}><X size={12} /></button>
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
                expanded={expandedSections.includes('treatment')} onToggle={() => toggleSection('treatment')}
                highlight={validationErrors.includes('treatment')}>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>а) Немедикаментозное</h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {COMMON_NON_DRUG_RECOMMENDATIONS.map(rec => (
                        <Chip key={rec.label} label={rec.label} active={currentVisit.treatment.nonDrug.includes(rec.label)}
                          onClick={() => toggleNonDrugChip(rec.label)} />
                      ))}
                    </div>
                    {currentVisit.treatment.nonDrug.length > 0 && (
                      <div className="text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>Выбрано: {currentVisit.treatment.nonDrug.join(', ')}</div>
                    )}
                    <textarea value={currentVisit.treatment.nonDrugText}
                      onChange={e => updateTreatment({ nonDrugText: e.target.value })}
                      onBlur={e => { if (hasSnippets(e.target.value)) updateTreatment({ nonDrugText: expandSnippet(e.target.value) }); }}
                      placeholder="Диета, режим, рекомендации..." rows={2}
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>б) Медикаментозное</h4>

                    {/* ⚙️ Настройки лечения */}
                    <details className="mb-3">
                      <summary className="text-xs cursor-pointer" style={{ color: 'var(--color-muted-foreground)' }}>
                        ⚙️ Настройки лечения (тактика, профиль)
                      </summary>
                      <div className="mt-2 p-3 rounded-lg border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>Тактика</span>
                          <span className="text-xs px-2 py-0.5 rounded" style={{
                            backgroundColor: currentVisit.treatment.tactic === 'aggressive' ? '#fee2e2' : currentVisit.treatment.tactic === 'safe' ? '#dcfce7' : '#f3f4f6',
                            color: currentVisit.treatment.tactic === 'aggressive' ? '#991b1b' : currentVisit.treatment.tactic === 'safe' ? '#166534' : '#6b7280',
                          }}>
                            {currentVisit.treatment.tactic === 'aggressive' ? '⚠️ Агрессивная' : currentVisit.treatment.tactic === 'safe' ? '🛡️ Безопасная' : '⚖️ Умеренная'}
                          </span>
                        </div>
                        <div className="flex gap-2 mb-2">
                          {(['aggressive', 'moderate', 'safe'] as const).map(t => (
                            <button key={t} onClick={() => updateTreatment({ tactic: t })}
                              className="px-3 py-1 rounded-lg text-xs font-medium border transition-colors"
                              style={{
                                borderColor: currentVisit.treatment.tactic === t ? 'var(--color-primary)' : 'var(--color-border)',
                                backgroundColor: currentVisit.treatment.tactic === t ? 'var(--color-primary)' : 'transparent',
                                color: currentVisit.treatment.tactic === t ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
                              }}>{t === 'aggressive' ? 'Агрессивная' : t === 'moderate' ? 'Умеренная' : 'Безопасная'}</button>
                          ))}
                        </div>
                        <textarea value={currentVisit.treatment.tacticRationale || ''}
                          onChange={e => updateTreatment({ tacticRationale: e.target.value })}
                          placeholder="Обоснование тактики..."
                          rows={2} className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none resize-none"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }} />
                        <button onClick={() => setShowBiopsychosocial(true)}
                          className="mt-2 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border w-full"
                          style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                          <Activity size={14} /> Биопсихосоциальный профиль
                        </button>
                      </div>
                    </details>

                    {/* Список препаратов */}
                    {currentVisit.treatment.medications.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {currentVisit.treatment.medications.map(med => (
                          <MedicationRow key={med.id} med={med}
                            onRemove={() => removeMedication(med.id)}
                            onEdit={() => handleEditMed(med)}
                            onDeprescribe={() => handleDeprescribe(med)} />
                        ))}
                      </div>
                    )}

                    {/* Кнопки */}
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
                      <button onClick={() => setShowSymptomHelper(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border"
                        style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                        💡 Симптом-помощник
                      </button>
                      {currentVisit.treatment.basicTherapy.length > 0 && (
                        <button onClick={() => loadPreviousBasicTherapy()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border"
                          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                          💊 Базисная терапия ({currentVisit.treatment.basicTherapy.length})
                        </button>
                      )}
                    </div>

                    {/* Предупреждения (компактно внизу) */}
                    <div className="space-y-1.5">
                      {currentVisit.treatment.medications.length >= 5 && (
                        <div className="p-2 rounded text-xs" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                          ⚠️ Полипрагмазия: {currentVisit.treatment.medications.length} препаратов
                        </div>
                      )}
                      {stoppAlerts.length > 0 && (
                        <div className="p-2 rounded text-xs" style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}>
                          ⚠️ STOPP: {stoppAlerts.map((r: any) => r.description).join(', ')}
                        </div>
                      )}
                      {drugInteractions.length > 0 && showDrugAlerts && (
                        <DrugSafetyAlert interactions={drugInteractions} onDismiss={() => setShowDrugAlerts(false)} />
                      )}
                    </div>

                    {/* Форма добавления */}
                                        {showAddMed && (
                      <div className="mt-3 p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="flex items-center gap-2">
                          <input type="text" value={editingMed ? editingMed.name : newMed.name}
                            onChange={e => editingMed ? setEditingMed({ ...editingMed, name: e.target.value }) : setNewMed(p => ({ ...p, name: e.target.value }))}
                            placeholder="Препарат" className="flex-1 px-2 py-1.5 rounded border text-xs"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                          <input type="text" value={editingMed ? editingMed.dose : newMed.dose}
                            onChange={e => editingMed ? setEditingMed({ ...editingMed, dose: e.target.value }) : setNewMed(p => ({ ...p, dose: e.target.value }))}
                            placeholder="Доза" className="w-20 px-2 py-1.5 rounded border text-xs"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                          <input type="text" value={editingMed ? editingMed.frequency : newMed.frequency}
                            onChange={e => editingMed ? setEditingMed({ ...editingMed, frequency: e.target.value }) : setNewMed(p => ({ ...p, frequency: e.target.value }))}
                            placeholder="Кратность" className="w-24 px-2 py-1.5 rounded border text-xs"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                          <select value={editingMed ? editingMed.duration : newMed.duration}
                            onChange={e => editingMed ? setEditingMed({ ...editingMed, duration: e.target.value }) : setNewMed(p => ({ ...p, duration: e.target.value }))}
                            className="w-24 px-2 py-1.5 rounded border text-xs"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                            <option value="7 дней">7 дн</option>
                            <option value="14 дней">14 дн</option>
                            <option value="30 дней">30 дн</option>
                            <option value="3 месяца">3 мес</option>
                            <option value="постоянно">Постоянно</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-foreground)' }}>
                          <input type="checkbox" checked={editingMed ? editingMed.isBasic : newMed.isBasic}
                            onChange={e => {
                              const basic = e.target.checked;
                              if (editingMed) {
                                setEditingMed({ ...editingMed, isBasic: basic, duration: basic ? 'постоянно' : editingMed.duration });
                              } else {
                                setNewMed(p => ({ ...p, isBasic: basic, duration: basic ? 'постоянно' : p.duration }));
                              }
                            }} />
                          Базисная
                        </label>
                        <div className="flex gap-2">
                          <button onClick={handleSaveMed}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>✓ {editingMed ? 'Сохранить' : 'Добавить'}</button>
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
                      { label: 'Через 1 месяц', days: 30 }, { label: 'Через 3 месяца', days: 90 },
                      { label: 'Через 6 месяцев', days: 180 }, { label: 'Через 1 год', days: 365 },
                    ].map(opt => (
                      <Chip key={opt.label} label={opt.label} active={false}
                        onClick={() => { const d = new Date(currentVisit.date); d.setDate(d.getDate() + opt.days); updateFollowUp({ date: d.toISOString().split('T')[0] }); }} />
                    ))}
                  </div>
                  <Input label="Дата явки" value={currentVisit.followUp.date} onChange={v => updateFollowUp({ date: v })} type="date" />
                  <Input label="Причина явки" value={currentVisit.followUp.reason} onChange={v => updateFollowUp({ reason: v })} placeholder="Контроль АД" />
                </div>
              </Section>

              {/* Модальные окна */}
              <ICD10SearchModal isOpen={showICD10Search} onClose={() => setShowICD10Search(false)}
  onSelect={(code, name) => {
    if (showRotateDiagnosis && icd10Target === 'primary') {
      // Если открыта ротация — сохраняем код в неё
      setRotateNewCode(code);
      setRotateNewName(name);
    } else {
      switch (icd10Target) {
        case 'primary': updatePrimaryDiagnosis({ code, name }); break;
        case 'complications': addDiagnosisItem('complications', { code, name }); break;
        case 'concomitant': addDiagnosisItem('concomitant', { code, name }); break;
      }
    }
    setShowICD10Search(false);
  }}
                title={icd10Target === 'primary' ? 'Поиск основного диагноза' : icd10Target === 'complications' ? 'Поиск осложнения' : icd10Target === 'concomitant' ? 'Поиск сопутствующего' : 'Поиск фонового'} />

              <FormulationSelectModal isOpen={showFormulationModal} onClose={() => setShowFormulationModal(false)}
                onSelect={(text) => {
                  switch (formulationTarget.type) {
                    case 'primary': updatePrimaryDiagnosis({ name: text }); break;
                    case 'complications': if (formulationTarget.code) updateDiagnosisItemName('complications', formulationTarget.code, text); break;
                    case 'concomitant': if (formulationTarget.code) updateDiagnosisItemName('concomitant', formulationTarget.code, text); break;
                    case 'background': if (formulationTarget.code) updateDiagnosisItemName('background', formulationTarget.code, text); break;
                  }
                  setShowFormulationModal(false);
                }}
                icd10Code={getFormulationCode()} />

              <MedicationSearchModal isOpen={showMedicationSearch} onClose={() => setShowMedicationSearch(false)}
  onSelect={(inn, dosage, frequency, isBasic) => {
    addMedication({ name: inn, dose: dosage, frequency, duration: isBasic ? 'постоянно' : '30 дней', isBasic });
    setShowMedicationSearch(false);
  }} />

              <BiopsychosocialModal isOpen={showBiopsychosocial} onClose={() => setShowBiopsychosocial(false)} />

                <SymptomHelperModal
  isOpen={showSymptomHelper}
  onClose={() => setShowSymptomHelper(false)}
  onAddMedication={(name, dose, frequency) => {
    addMedication({ name, dose, frequency, duration: '7 дней', isBasic: false });
  }}
  onAddNonDrug={(text) => {
    const current = currentVisit.treatment.nonDrugText;
    updateTreatment({ nonDrugText: current ? current + '\n' + text : text });
  }}
/>

{/* Модалка ротации диагноза */}
{showRotateDiagnosis && (
  <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50" onClick={() => setShowRotateDiagnosis(false)}>
    <div className="w-96 rounded-xl shadow-2xl p-4" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-foreground)' }}>🔄 Смена основного диагноза</h3>
      
      <div className="text-xs mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
        Текущий основной: <span className="font-mono" style={{ color: 'var(--color-primary)' }}>{currentVisit.diagnosis.primary.code}</span> {currentVisit.diagnosis.primary.name}
      </div>

      <div className="space-y-2 mb-3">
        <label className="block text-xs">Новый основной диагноз</label>
        <div className="flex gap-2">
          <button onClick={() => { setIcd10Target('primary'); setShowICD10Search(true); }}
  className="px-3 py-2 rounded-lg border text-sm font-mono"
  style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}>
  {rotateNewCode || '🔍 Выбрать код'}
</button>
          <input type="text" value={rotateNewName} onChange={e => setRotateNewName(e.target.value)}
            placeholder="Название нового основного"
            className="flex-1 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs mb-1">Куда перенести старый основной?</label>
        <select value={rotateTarget} onChange={e => setRotateTarget(e.target.value as any)}
  className="w-full px-3 py-2 rounded-lg border text-sm"
  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
  <option value="concomitant">В сопутствующие</option>
  <option value="complications">В осложнения</option>
</select>
      </div>

      <div className="flex gap-2">
        <button onClick={() => {
  if (!currentVisit) return;
  const oldPrimary = { ...currentVisit.diagnosis.primary };
  const oldComplications = [...currentVisit.diagnosis.complications];
  
  // Переносим старый основной
  if (oldPrimary.code) {
    addDiagnosisItem(rotateTarget, { code: oldPrimary.code, name: oldPrimary.name });
  }
  
  // Переносим осложнения в ту же категорию
  for (const c of oldComplications) {
    addDiagnosisItem(rotateTarget, { code: c.code, name: c.name });
    removeDiagnosisItem('complications', c.code);
  }
  
  // Ставим новый основной
  updatePrimaryDiagnosis({ 
    code: rotateNewCode || currentVisit.diagnosis.primary.code, 
    name: rotateNewName || currentVisit.diagnosis.primary.name 
  });
  
  setShowRotateDiagnosis(false);
  setRotateNewCode('');
  setRotateNewName('');
}}
  className="px-4 py-2 rounded-lg text-sm font-medium"
  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
  Сменить
</button>
        <button onClick={() => setShowRotateDiagnosis(false)}
          className="px-4 py-2 rounded-lg text-sm border"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
      </div>
    </div>
  </div>
)}

              <ProtocolGenerator isOpen={showProtocolGenerator} onClose={() => setShowProtocolGenerator(false)} />

              {/* Модалка депрескрайбинга */}
              {deprescribeTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeprescribeTarget(null)}>
                  <div className="w-96 rounded-xl shadow-2xl p-4" style={{ backgroundColor: 'var(--color-card)' }} onClick={e => e.stopPropagation()}>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-foreground)' }}>Депрескрайбинг: {deprescribeTarget.name}</h3>
                    <label className="block text-xs mb-1" style={{ color: 'var(--color-muted-foreground)' }}>Причина отмены</label>
                    <select value={deprescribeReason} onChange={e => setDeprescribeReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
                      <option value="">Выберите причину</option>
                      <option value="Побочные эффекты">Побочные эффекты</option>
                      <option value="Неэффективность">Неэффективность</option>
                      <option value="Дублирование терапии">Дублирование терапии</option>
                      <option value="Противопоказание (СТОПП)">Противопоказание (СТОПП)</option>
                      <option value="Решение пациента">Решение пациента</option>
                      <option value="Замена на другой препарат">Замена на другой препарат</option>
                    </select>
                    <input type="text" value={deprescribeReason} onChange={e => setDeprescribeReason(e.target.value)}
                      placeholder="Или впишите свою причину..."
                      className="w-full px-3 py-2 rounded-lg border text-sm mb-3"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }} />
                    <div className="flex gap-2">
                      <button onClick={confirmDeprescribe} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#ef4444', color: 'white' }}>Отменить препарат</button>
                      <button onClick={() => setDeprescribeTarget(null)} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>Отмена</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}