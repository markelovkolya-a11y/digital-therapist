// core/types/symptomGuides.ts
// v1.0.0 — Типы для симптом-помощника

export interface SymptomGuide {
  id: string;
  name: string;
  nonDrug: string[];
  medications: { name: string; dose: string; frequency: string }[];
  createdAt: string;
}

export type CreateSymptomGuideInput = Omit<SymptomGuide, 'id' | 'createdAt'>;