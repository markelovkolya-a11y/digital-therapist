// core/types/facilities.ts
// v1.0.0 — Типы для справочника мест проведения исследований

export interface Facility {
  id: string;
  name: string;
  category: 'lab' | 'clinic' | 'hospital' | 'other';
  createdAt: string;
}

export type CreateFacilityInput = Omit<Facility, 'id' | 'createdAt'>;