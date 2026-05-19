// core/types/patient.ts
// v1.0.0 — Статические неизменяемые свойства пациента

export type Gender = 'male' | 'female';

export type BloodGroup = 'O(I)' | 'A(II)' | 'B(III)' | 'AB(IV)';
export type RhFactor = 'positive' | 'negative';

/**
 * Статические свойства пациента.
 * Эти данные практически не меняются и не зависят от времени.
 * Всё, что происходит с пациентом — в таблице Events.
 */
export interface Patient {
  id: string;
  emiasCode: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: string;
  gender: Gender;
  bloodGroup?: BloodGroup;
  rhFactor?: RhFactor;
  isArchived: boolean;
  isDeceased: boolean;
  lastVisitDate?: string | null;  // ← добавить
  createdAt: string;
}

/**
 * Минимальные данные для создания пациента
 */
export type CreatePatientInput = Omit<Patient, 'id' | 'createdAt' | 'isArchived' | 'isDeceased'>;

/**
 * Семейная связь
 */
export interface FamilyLink {
  id: string;
  patientId: string;             // Кто является родственником
  relativeId: string;            // Чей родственник
  relationType: RelationType;
  createdAt: string;
}

export type RelationType =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'grandparent'
  | 'grandchild';