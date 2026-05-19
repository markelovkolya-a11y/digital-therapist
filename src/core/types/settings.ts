// core/types/settings.ts
// v1.0.0 — Типы для настроек приложения

export interface DoctorProfile {
  fullName: string;
  specialty: string;
  institution: string;
  district: string;
}

export interface TextSnippet {
  id: string;
  shortcut: string;       // код: "кожаN", "сердцеN"
  text: string;           // полный текст
  label: string;          // описание: "Норма кожи"
  createdAt: string;
}

export type CreateSnippetInput = Omit<TextSnippet, 'id' | 'createdAt'>;