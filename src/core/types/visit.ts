// core/types/visit.ts
// v1.0.0 — Типы для протокола осмотра (полная версия)

import { EventParameter } from './events';

export type VisitType = 'treatment' | 'prophylactic' | 'dispensary' | 'active' | 'palliative';

export interface VisitState {
  patientId: string;
  date: string;
  type: VisitType;
  status: 'draft' | 'completed' | 'signed';

  // Данные прошлого визита для сравнения
  previousVitals: EventParameter[];
  previousComplaints: string[];
  previousExamSystems: SystemExamState[];
  previousDiagnosis: DiagnosisState | null;

  // Текущий осмотр
  vitals: VitalSignsState;
  lifeHistory: LifeHistoryState;
  complaints: ComplaintItem[];
  anamnesis: AnamnesisState;
  physicalExam: SystemExamState[];
  diagnosis: DiagnosisState;
  examinationPlan: ExaminationPlanState;
  treatment: TreatmentState;
  followUp: FollowUpState;
}

// ========== ВИТАЛЬНЫЕ ПОКАЗАТЕЛИ ==========
export interface VitalSignsState {
  systolic: number;
  diastolic: number;
  heartRate: number;
  respiratoryRate: number;
  spo2: number;
  temperature: number;
  height: number;
  weight: number;
  glucose?: number;
  creatinine?: number;
}

// ========== АНАМНЕЗ ЖИЗНИ ==========
export interface LifeHistoryState {
  smoking: 'never' | 'current' | 'quit';
  smokingDetails: string;
  alcohol: 'never' | 'moderate' | 'abuse';
  alcoholDetails: string;
  allergy: string;               // 'Аллергоанамнез не отягощён' или детали
  heredity: string;
  profession: string;
  additional: string;
}

// ========== ЖАЛОБЫ ==========
export interface ComplaintItem {
  id: string;
  name: string;
  status: 'new' | 'persists' | 'worsened' | 'improved' | 'resolved';
  details: string;
  character?: string;            // Характер боли, кашля и т.д.
}

// ========== АНАМНЕЗ ЗАБОЛЕВАНИЯ ==========
export interface AnamnesisState {
  dynamic: 'worsening' | 'stable' | 'improving';
  chronology: string[];          // Ключевые даты и события
  text: string;
}

// ========== ОБЪЕКТИВНЫЙ СТАТУС ==========
export interface SystemExamState {
  system: string;
  shortName: string;
  icon: string;
  status: 'normal' | 'pathology' | 'not_examined';
  text: string;                  // Текст статуса
  isChanged: boolean;            // Изменилось ли с прошлого визита
  previousText?: string;         // Текст из прошлого визита
}

// ========== ДИАГНОЗ ==========
export interface DiagnosisState {
  primary: {
    code: string;
    name: string;
    isFirstTime: boolean;
    stage?: string;
    degree?: string;
    phase?: string;
  };
  complications: DiagnosisItem[];
  concomitant: DiagnosisItem[];
  background: DiagnosisItem[];
}

export interface DiagnosisItem {
  code: string;
  name: string;
}

// ========== ПЛАН ОБСЛЕДОВАНИЯ ==========
export interface ExaminationPlanState {
  labTests: string[];
  instrumental: string[];
  consultations: string[];
  priorities: Record<string, { priority: string; deadlineDays: number }>;
}

// ========== ЛЕЧЕНИЕ ==========
export interface TreatmentState {
  nonDrug: string[];             // Выбранные чипсы
  nonDrugText: string;           // Полный текст
  medications: MedicationState[];
  basicTherapy: MedicationState[]; // Подтянуто из прошлого
}

export interface MedicationState {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  isBasic: boolean;
  isContinued: boolean;          // Продолжается из прошлого
}

// ========== КОНТРОЛЬНАЯ ЯВКА ==========
export interface FollowUpState {
  date: string;
  reason: string;
}