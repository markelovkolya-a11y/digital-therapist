// core/store/types.ts
// v1.1.0 — Типы для Zustand store (добавлен VisitSlice)

import { Patient, CreatePatientInput } from '@core/types/patient';
import { ClinicalEvent, CreateEventInput, EventFilter } from '@core/types/events';
import { ParamDefinition, CreateParamInput } from '@core/types/params';
import { PredictionReport, ClinicalWarning } from '@core/types/clinical';
import {
  VisitState, VitalSignsState, LifeHistoryState,
  ComplaintItem, AnamnesisState, SystemExamState,
  DiagnosisState, ExaminationPlanState, TreatmentState,
  FollowUpState, MedicationState,
} from '@core/types/visit';

export interface PatientSlice {
  patients: Patient[];
  selectedPatientId: string | null;
  isLoading: boolean;
  loadPatients: () => Promise<void>;
  selectPatient: (id: string | null) => void;
  createPatient: (input: CreatePatientInput) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  archivePatient: (id: string) => Promise<void>;
  restorePatient: (id: string) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
}

export interface EventSlice {
  events: ClinicalEvent[];
  patientTimeline: ClinicalEvent[];
  loadPatientTimeline: (patientId: string, filter?: Partial<EventFilter>) => Promise<void>;
  addEvent: (input: CreateEventInput) => Promise<ClinicalEvent>;
  addEventsBatch: (inputs: CreateEventInput[]) => Promise<ClinicalEvent[]>;
}

export interface ParamCatalogSlice {
  paramCatalog: ParamDefinition[];
  loadParamCatalog: () => Promise<void>;
  addCustomParam: (input: CreateParamInput) => Promise<ParamDefinition>;
}

export interface PredictionSlice {
  currentReport: PredictionReport | null;
  warnings: ClinicalWarning[];
  isLoadingReport: boolean;
  generateReport: (patientId: string) => Promise<void>;
  dismissWarning: (warningId: string) => void;
  clearReport: () => void;
}

export interface UISlice {
  initialized: boolean;
  darkMode: boolean;
  sidebarOpen: boolean;
  activeScreen: Screen;
  initialize: () => Promise<void>;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  navigateTo: (screen: Screen) => void;
}

// ============================================================
// VISIT SLICE
// ============================================================
export interface VisitSlice {
  currentVisit: VisitState | null;
    updateVisitDate: (date: string) => void;
  loadPreviousBasicTherapy: () => void;
  initVisit: (patientId: string) => Promise<void>;
  updateVitals: (v: Partial<VitalSignsState>) => void;
  updateLifeHistory: (v: Partial<LifeHistoryState>) => void;
  addComplaint: (name: string) => void;
  removeComplaint: (id: string) => void;
  updateComplaint: (id: string, updates: Partial<ComplaintItem>) => void;
  updateAnamnesis: (v: Partial<AnamnesisState>) => void;
  updateSystemExam: (index: number, updates: Partial<SystemExamState>) => void;
  setAllSystemsNormal: () => void;
  loadPreviousSystems: () => void;
  updateDiagnosis: (v: Partial<DiagnosisState>) => void;
  updatePrimaryDiagnosis: (v: Partial<DiagnosisState['primary']>) => void;
  addDiagnosisItem: (type: 'complications' | 'concomitant' | 'background', item: { code: string; name: string }) => void;
  removeDiagnosisItem: (type: 'complications' | 'concomitant' | 'background', code: string) => void;
  updateDiagnosisItemName: (type: 'complications' | 'concomitant' | 'background', code: string, name: string) => void;
  updateExaminationPlan: (v: Partial<ExaminationPlanState>) => void;
  toggleExaminationItem: (category: 'labTests' | 'instrumental' | 'consultations', item: string) => void;
  updateTreatment: (v: Partial<TreatmentState>) => void;
  addMedication: (med: Omit<MedicationState, 'id' | 'isContinued'>) => void;
  removeMedication: (id: string) => void;
  toggleNonDrugChip: (chip: string) => void;
  updateFollowUp: (v: Partial<FollowUpState>) => void;
  saveVisit: () => Promise<void>;
  clearVisit: () => void;
  markAllSystemsUnchanged: () => void;
}

export type Screen =
  | 'dashboard'
  | 'patient-registry'
  | 'visit'
  | 'waiting-list'
  | 'settings';

// ============================================================
// ROOT STORE
// ============================================================
export type AppStore = PatientSlice & EventSlice & ParamCatalogSlice & PredictionSlice & UISlice & VisitSlice;