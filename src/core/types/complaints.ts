// core/types/complaints.ts
// v1.0.0 — Типы для справочника жалоб

export interface ComplaintTemplate {
  id: string;
  name: string;
  createdAt: string;
}

export type CreateComplaintInput = Omit<ComplaintTemplate, 'id' | 'createdAt'>;