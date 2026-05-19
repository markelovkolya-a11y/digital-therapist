// core/types/medications.ts
// v1.0.0 — Типы для справочника лекарств

export interface Medication {
  id: string;
  inn: string;
  category: string;
  tradeNames: MedicationTradeName[];
  dosages: MedicationDosage[];
  createdAt: string;
}

export interface MedicationTradeName {
  id: string;
  medicationId: string;
  name: string;
  createdAt: string;
}

export interface MedicationDosage {
  id: string;
  medicationId: string;
  value: string;
  isDefault: boolean;
  createdAt: string;
}

export interface MedicationSearchResult {
  medication: Medication;
  matchedTradeName?: string;
  matchedINN: string;
}

export type CreateMedicationInput = {
  inn: string;
  category: string;
  tradeNames: string[];
  dosages: string[];
};