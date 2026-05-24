// core/types/biopsychosocial.ts
// v1.0.0 — Типы для биопсихосоциального профиля

export interface BiopsychosocialProfile {
  patientId: string;
  date: string;
  
  // Био
  barthelScore: number;           // 0-100, шкала Бартел
  mobility: 'independent' | 'assisted' | 'bedridden';
  
  // Психо
  phq2Score: number;              // 0-6, скрининг депрессии
  gad2Score: number;              // 0-6, скрининг тревоги
  
  // Социо
  housing: 'adequate' | 'crowded' | 'unsafe' | 'homeless';
  income: 'sufficient' | 'limited' | 'below_poverty';
  maritalStatus: 'married' | 'single' | 'widowed' | 'divorced';
  careAccess: 'none_needed' | 'partial_help' | 'full_dependency';
  socialIsolation: 'none' | 'moderate' | 'severe';
  
  // Итоговая оценка
  summary: string;
  createdAt: string;
}

export type CreateProfileInput = Omit<BiopsychosocialProfile, 'createdAt'>;