// core/types/params.ts
// v1.0.0 — Онтологический словарь всех измеряемых параметров

/**
 * Категория параметра.
 * Определяет, как параметр отображается и используется в предиктивных модулях.
 */
export type ParamCategory =
  | 'vital_sign'          // Жизненно важные показатели (АД, ЧСС, ЧДД, SpO2, t°)
  | 'anthropometry'       // Антропометрия (рост, вес, ИМТ, окружность талии)
  | 'lab_common'          // Общие лабораторные (ОАК, ОАМ)
  | 'lab_biochemistry'    // Биохимия (креатинин, глюкоза, липиды)
  | 'lab_coagulation'     // Коагулограмма (МНО, АЧТВ)
  | 'lab_hormones'        // Гормоны (ТТГ, кортизол)
  | 'lab_tumor_markers'   // Онкомаркеры
  | 'imaging'             // Инструментальные (КТ, МРТ, УЗИ, рентген)
  | 'ecg'                 // ЭКГ-параметры
  | 'screening'           // Скрининговые показатели
  | 'risk_factor'         // Факторы риска
  | 'medication'          // Лекарственные параметры
  | 'diagnosis_code'      // Код диагноза
  | 'custom';             // Пользовательские параметры

/**
 * Мета-теги для предиктивных модулей.
 * Один параметр может иметь несколько тегов.
 */
export type ParamMetaTag =
  | 'cv_risk'             // Сердечно-сосудистый риск
  | 'renal_function'      // Почечная функция
  | 'drug_dosing'         // Используется для расчёта доз
  | 'glycemic_control'    // Гликемический контроль
  | 'lipid_profile'       // Липидный профиль
  | 'coagulation'         // Свёртываемость
  | 'inflammation'        // Воспаление
  | 'anemia'              // Анемия
  | 'liver_function'      // Печёночная функция
  | 'oncologic_marker'    // Онкологический маркер
  | 'infection_marker'    // Инфекционный маркер
  | 'nutrition'           // Нутритивный статус
  | 'bone_metabolism';    // Костный метаболизм

/**
 * Источник определения параметра.
 * core   — зашит в коде, не может быть изменён/удалён
 * user   — создан врачом через UI
 * system — создан системой автоматически
 */
export type ParamSource = 'core' | 'user' | 'system';

/**
 * Определение параметра в онтологическом словаре
 */
export interface ParamDefinition {
  id: string;                    // Уникальный ключ: 'systolic_bp', 'creatinine', 'hba1c'
  name: string;                  // Человекочитаемое: 'Систолическое АД'
  shortName?: string;            // Короткое: 'САД'
  category: ParamCategory;
  unit: string;                  // 'mmHg', 'mkmol/l', '%', 'kg'
  metaTags: ParamMetaTag[];      // Для предиктивных модулей
  source: ParamSource;           // Откуда загружен
  refRange?: {                   // Референсные значения
    min: number;
    max: number;
    genderDependent?: boolean;
    ageDependent?: boolean;
  };
  defaultValue?: number;         // Значение по умолчанию
  order?: number;                // Порядок отображения в UI
  createdAt: string;
}

/**
 * Создание пользовательского параметра
 */
export type CreateParamInput = Omit<ParamDefinition, 'id' | 'source' | 'createdAt'>;

// ============================================================
// БАЗОВЫЕ ПАРАМЕТРЫ ЯДРА (встроенные, не удаляются)
// ============================================================

export const CORE_VITAL_SIGNS: Omit<ParamDefinition, 'createdAt'>[] = [
  {
    id: 'systolic_bp', name: 'Систолическое АД', shortName: 'САД',
    category: 'vital_sign', unit: 'mmHg',
    metaTags: ['cv_risk', 'drug_dosing'],
    source: 'core', refRange: { min: 90, max: 140 },
    order: 1,
  },
  {
    id: 'diastolic_bp', name: 'Диастолическое АД', shortName: 'ДАД',
    category: 'vital_sign', unit: 'mmHg',
    metaTags: ['cv_risk', 'drug_dosing'],
    source: 'core', refRange: { min: 60, max: 90 },
    order: 2,
  },
  {
    id: 'heart_rate', name: 'ЧСС', shortName: 'ЧСС',
    category: 'vital_sign', unit: 'bpm',
    metaTags: ['cv_risk'],
    source: 'core', refRange: { min: 60, max: 90 },
    order: 3,
  },
  {
    id: 'respiratory_rate', name: 'ЧДД', shortName: 'ЧДД',
    category: 'vital_sign', unit: 'breaths/min',
    metaTags: [],
    source: 'core', refRange: { min: 12, max: 20 },
    order: 4,
  },
  {
    id: 'spo2', name: 'SpO₂', shortName: 'SpO₂',
    category: 'vital_sign', unit: '%',
    metaTags: [],
    source: 'core', refRange: { min: 95, max: 100 },
    order: 5,
  },
  {
    id: 'temperature', name: 'Температура тела', shortName: 't°',
    category: 'vital_sign', unit: '°C',
    metaTags: ['inflammation', 'infection_marker'],
    source: 'core', refRange: { min: 36.0, max: 37.0 },
    order: 6,
  },
];

export const CORE_ANTHROPOMETRY: Omit<ParamDefinition, 'createdAt'>[] = [
  {
    id: 'height', name: 'Рост', shortName: 'Рост',
    category: 'anthropometry', unit: 'cm',
    metaTags: ['drug_dosing', 'nutrition'],
    source: 'core', order: 10,
  },
  {
    id: 'weight', name: 'Вес', shortName: 'Вес',
    category: 'anthropometry', unit: 'kg',
    metaTags: ['drug_dosing', 'nutrition', 'cv_risk'],
    source: 'core', order: 11,
  },
  {
    id: 'bmi', name: 'ИМТ', shortName: 'ИМТ',
    category: 'anthropometry', unit: 'kg/m²',
    metaTags: ['cv_risk', 'nutrition'],
    source: 'system', refRange: { min: 18.5, max: 25 },
    order: 12,
  },
  {
    id: 'waist_circumference', name: 'Окружность талии', shortName: 'ОТ',
    category: 'anthropometry', unit: 'cm',
    metaTags: ['cv_risk'],
    source: 'core', order: 13,
  },
];

export const CORE_LAB_PARAMS: Omit<ParamDefinition, 'createdAt'>[] = [
  {
    id: 'creatinine', name: 'Креатинин', shortName: 'Креатинин',
    category: 'lab_biochemistry', unit: 'мкмоль/л',
    metaTags: ['renal_function', 'drug_dosing'],
    source: 'core', refRange: { min: 62, max: 115, genderDependent: true },
    order: 20,
  },
  {
    id: 'egfr', name: 'СКФ (CKD-EPI)', shortName: 'СКФ',
    category: 'lab_biochemistry', unit: 'мл/мин/1.73м²',
    metaTags: ['renal_function', 'drug_dosing'],
    source: 'system', refRange: { min: 90, max: 200 },
    order: 21,
  },
  {
    id: 'glucose_fasting', name: 'Глюкоза (натощак)', shortName: 'Глюкоза',
    category: 'lab_biochemistry', unit: 'ммоль/л',
    metaTags: ['glycemic_control', 'cv_risk'],
    source: 'core', refRange: { min: 3.3, max: 6.1 },
    order: 22,
  },
  {
    id: 'hba1c', name: 'HbA1c', shortName: 'HbA1c',
    category: 'lab_biochemistry', unit: '%',
    metaTags: ['glycemic_control', 'cv_risk'],
    source: 'core', refRange: { min: 4.0, max: 6.0 },
    order: 23,
  },
  {
    id: 'total_cholesterol', name: 'Общий холестерин', shortName: 'Холестерин',
    category: 'lab_biochemistry', unit: 'ммоль/л',
    metaTags: ['lipid_profile', 'cv_risk'],
    source: 'core', refRange: { min: 3.0, max: 5.2 },
    order: 24,
  },
  {
    id: 'ldl', name: 'ЛПНП', shortName: 'ЛПНП',
    category: 'lab_biochemistry', unit: 'ммоль/л',
    metaTags: ['lipid_profile', 'cv_risk'],
    source: 'core', refRange: { min: 0, max: 3.0 },
    order: 25,
  },
  {
    id: 'hdl', name: 'ЛПВП', shortName: 'ЛПВП',
    category: 'lab_biochemistry', unit: 'ммоль/л',
    metaTags: ['lipid_profile', 'cv_risk'],
    source: 'core', refRange: { min: 1.0, max: 2.0 },
    order: 26,
  },
  {
    id: 'triglycerides', name: 'Триглицериды', shortName: 'ТГ',
    category: 'lab_biochemistry', unit: 'ммоль/л',
    metaTags: ['lipid_profile', 'cv_risk'],
    source: 'core', refRange: { min: 0, max: 1.7 },
    order: 27,
  },
  {
    id: 'alt', name: 'АЛТ', shortName: 'АЛТ',
    category: 'lab_biochemistry', unit: 'Ед/л',
    metaTags: ['liver_function'],
    source: 'core', refRange: { min: 0, max: 40 },
    order: 28,
  },
  {
    id: 'ast', name: 'АСТ', shortName: 'АСТ',
    category: 'lab_biochemistry', unit: 'Ед/л',
    metaTags: ['liver_function'],
    source: 'core', refRange: { min: 0, max: 40 },
    order: 29,
  },
  {
    id: 'hemoglobin', name: 'Гемоглобин', shortName: 'Hb',
    category: 'lab_common', unit: 'г/л',
    metaTags: ['anemia'],
    source: 'core', refRange: { min: 120, max: 160, genderDependent: true },
    order: 30,
  },
  {
    id: 'inr', name: 'МНО', shortName: 'МНО',
    category: 'lab_coagulation', unit: '',
    metaTags: ['coagulation', 'drug_dosing'],
    source: 'core', refRange: { min: 0.8, max: 1.2 },
    order: 31,
  },
];

/**
 * Все встроенные параметры ядра
 */
export const ALL_CORE_PARAMS: Omit<ParamDefinition, 'createdAt'>[] = [
  ...CORE_VITAL_SIGNS,
  ...CORE_ANTHROPOMETRY,
  ...CORE_LAB_PARAMS,
];