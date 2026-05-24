// core/types/events.ts
// v1.1.0 — Событийно-ориентированная модель данных (добавлен life_history)

export type EventType =
  | 'symptom_reported'
  | 'self_measurement'
  | 'vital_signs'
  | 'physical_exam'
  | 'anthropometry'
  | 'lab_result'
  | 'ecg_result'
  | 'imaging_result'
  | 'diagnosis_established'
  | 'diagnosis_resolved'
  | 'prescription'
  | 'prescription_stop'
  | 'prescription_modify'
  | 'hospitalization'
  | 'referral'
  | 'screening_performed'
  | 'vaccination'
  | 'risk_factor_change'
  | 'smoking_status_change'
  | 'alcohol_status_change'
  | 'emias_import'
  | 'visit_note'
  | 'doctor_comment'
  | 'life_history'
  |'biopsychosocial_assessment';

export type EventSource =
  | 'patient_reported'
  | 'doctor_measured'
  | 'emias_copy'
  | 'external_report'
  | 'system_calculated';

export interface ClinicalEvent {
  id: string;
  patientId: string;
  type: EventType;
  source: EventSource;
  timestamp: string;
  recordedAt: string;
  title: string;
  parameters: EventParameter[];
  context?: string;
  visitId?: string;
  problemId?: string;
}

export interface EventParameter {
  key: string;
  value: string | number;
  unit: string;
  refMin?: number;
  refMax?: number;
  isAbnormal?: boolean;
}

export type CreateEventInput = Omit<ClinicalEvent, 'id' | 'recordedAt'>;

export interface EventFilter {
  patientId: string;
  types?: EventType[];
  sources?: EventSource[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}