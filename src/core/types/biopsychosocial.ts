// core/types/biopsychosocial.ts
// v1.1.0 — Добавлены шкала Морзе и индекс Чарлсон

export interface BiopsychosocialProfile {
  patientId: string;
  date: string;
  
  // Био
  barthelScore: number;
  morseScore: number;           // 0-125, шкала Морзе (риск падений)
  charlsonScore: number;        // 0-37, индекс коморбидности Чарлсон
  mobility: 'independent' | 'assisted' | 'bedridden';
  
  // Психо
  phq2Score: number;
  gad2Score: number;
  
  // Социо
  housing: 'adequate' | 'crowded' | 'unsafe' | 'homeless';
  income: 'sufficient' | 'limited' | 'below_poverty';
  maritalStatus: 'married' | 'single' | 'widowed' | 'divorced';
  careAccess: 'none_needed' | 'partial_help' | 'full_dependency';
  socialIsolation: 'none' | 'moderate' | 'severe';
  
  summary: string;
  createdAt: string;
}

export type CreateProfileInput = Omit<BiopsychosocialProfile, 'createdAt'>;