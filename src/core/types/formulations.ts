// core/types/formulations.ts
// v1.0.0 — Типы для клинических формулировок

export interface ClinicalFormulation {
  id: string;
  icd10Code: string;
  text: string;
  createdAt: string;
}

export type CreateFormulationInput = Omit<ClinicalFormulation, 'id' | 'createdAt'>;