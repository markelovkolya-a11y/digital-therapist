// core/types/clinical.ts
// v1.0.0 — Типы для клинических шкал и предиктивных модулей

/**
 * Результат расчёта клинической шкалы
 */
export interface ScaleResult {
  name: string;                  // 'SCORE2', 'CKD-EPI', 'CHA₂DS₂-VASc'
  value: number;
  interpretation: string;       // 'Низкий риск', 'C2 — незначительное снижение'
  color: RiskColor;             // Для градусника риска
  components: ScaleComponent[]; // Из чего сложился результат
  calculatedAt: string;
}

export type RiskColor = 'green' | 'yellow' | 'orange' | 'red';

export interface ScaleComponent {
  label: string;                 // 'Возраст ≥ 65', 'САД ≥ 140'
  contribution: number;          // Вклад в общий счёт
}

/**
 * Предиктивный отчёт по пациенту
 * Собирается из всех рассчитанных шкал и правил
 */
export interface PredictionReport {
  patientId: string;
  calculatedAt: string;
  scales: ScaleResult[];
  activeWarnings: ClinicalWarning[];
  overdueScreenings: ScreeningGap[];
  drugAlerts: DrugAlert[];
}

/**
 * Клиническое предупреждение
 */
export interface ClinicalWarning {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionRequired?: string;       // Что нужно сделать врачу
  ruleId: string;                // Какое правило сработало
  timestamp: string;
}

/**
 * Пробел в скрининге
 */
export interface ScreeningGap {
  screeningType: string;         // 'mammography', 'colonoscopy', 'ldct_lung'
  description: string;
  isOverdue: boolean;
  recommendedAction: string;
  riskBasis: string;             // На основании чего рекомендуется (возраст, стаж курения)
}

/**
 * Предупреждение лекарственной безопасности
 */
export interface DrugAlert {
  type: 'interaction' | 'duplicate' | 'overdose' | 'contraindication' | 'missing_therapy';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  drugs: string[];
}