// core/data/labReference.ts
// v1.0.0 — Справочник лабораторных показателей с референсными интервалами

export interface LabParameter {
  id: string;
  name: string;
  shortName: string;
  unit: string;
  refMin: number;
  refMax: number;
  genderDependent?: boolean;
}

export interface LabProfile {
  id: string;
  name: string;
  parameters: LabParameter[];
}

/**
 * Базовые лабораторные профили.
 * Параметры, которые есть в любой лаборатории — обязательные.
 * Врач может добавлять дополнительные параметры.
 */
export const LAB_PROFILES: LabProfile[] = [
  {
    id: 'cbc',
    name: 'Общий анализ крови (ОАК)',
    parameters: [
      { id: 'hemoglobin', name: 'Гемоглобин', shortName: 'Hb', unit: 'г/л', refMin: 120, refMax: 160, genderDependent: true },
      { id: 'erythrocytes', name: 'Эритроциты', shortName: 'RBC', unit: '×10¹²/л', refMin: 3.8, refMax: 5.5, genderDependent: true },
      { id: 'leukocytes', name: 'Лейкоциты', shortName: 'WBC', unit: '×10⁹/л', refMin: 4.0, refMax: 9.0 },
      { id: 'platelets', name: 'Тромбоциты', shortName: 'PLT', unit: '×10⁹/л', refMin: 180, refMax: 320 },
      { id: 'esr', name: 'СОЭ', shortName: 'ESR', unit: 'мм/ч', refMin: 2, refMax: 20, genderDependent: true },
      { id: 'hematocrit', name: 'Гематокрит', shortName: 'HCT', unit: '%', refMin: 36, refMax: 48, genderDependent: true },
      { id: 'mcv', name: 'MCV (средний объём эритроцита)', shortName: 'MCV', unit: 'фл', refMin: 80, refMax: 100 },
      { id: 'mch', name: 'MCH (среднее содержание Hb)', shortName: 'MCH', unit: 'пг', refMin: 27, refMax: 34 },
      { id: 'neutrophils', name: 'Нейтрофилы', shortName: 'NEUT', unit: '%', refMin: 47, refMax: 72 },
      { id: 'lymphocytes', name: 'Лимфоциты', shortName: 'LYMPH', unit: '%', refMin: 19, refMax: 37 },
      { id: 'monocytes', name: 'Моноциты', shortName: 'MONO', unit: '%', refMin: 3, refMax: 11 },
      { id: 'eosinophils', name: 'Эозинофилы', shortName: 'EOS', unit: '%', refMin: 0.5, refMax: 5 },
      { id: 'basophils', name: 'Базофилы', shortName: 'BASO', unit: '%', refMin: 0, refMax: 1 },
    ],
  },
  {
    id: 'urinalysis',
    name: 'Общий анализ мочи (ОАМ)',
    parameters: [
      { id: 'urine_color', name: 'Цвет', shortName: 'Цвет', unit: '', refMin: 0, refMax: 0 },
      { id: 'urine_sg', name: 'Удельный вес', shortName: 'SG', unit: '', refMin: 1010, refMax: 1025 },
      { id: 'urine_ph', name: 'pH', shortName: 'pH', unit: '', refMin: 5.0, refMax: 7.0 },
      { id: 'urine_protein', name: 'Белок', shortName: 'PRO', unit: 'г/л', refMin: 0, refMax: 0.033 },
      { id: 'urine_glucose', name: 'Глюкоза', shortName: 'GLU', unit: 'ммоль/л', refMin: 0, refMax: 0 },
      { id: 'urine_ketones', name: 'Кетоновые тела', shortName: 'KET', unit: '', refMin: 0, refMax: 0 },
      { id: 'urine_bilirubin', name: 'Билирубин', shortName: 'BIL', unit: '', refMin: 0, refMax: 0 },
      { id: 'urine_wbc', name: 'Лейкоциты', shortName: 'WBC', unit: 'в п/зр', refMin: 0, refMax: 5 },
      { id: 'urine_rbc', name: 'Эритроциты', shortName: 'RBC', unit: 'в п/зр', refMin: 0, refMax: 2 },
      { id: 'urine_epithelium', name: 'Эпителий', shortName: 'EPI', unit: 'в п/зр', refMin: 0, refMax: 5 },
    ],
  },
  {
    id: 'biochemistry',
    name: 'Биохимический анализ крови',
    parameters: [
      { id: 'creatinine', name: 'Креатинин', shortName: 'Креатинин', unit: 'мкмоль/л', refMin: 62, refMax: 115, genderDependent: true },
      { id: 'urea', name: 'Мочевина', shortName: 'Мочевина', unit: 'ммоль/л', refMin: 2.5, refMax: 8.3 },
      { id: 'alt', name: 'АЛТ', shortName: 'АЛТ', unit: 'Ед/л', refMin: 0, refMax: 40 },
      { id: 'ast', name: 'АСТ', shortName: 'АСТ', unit: 'Ед/л', refMin: 0, refMax: 40 },
      { id: 'total_bilirubin', name: 'Общий билирубин', shortName: 'Билирубин', unit: 'мкмоль/л', refMin: 3.4, refMax: 20.5 },
      { id: 'total_protein', name: 'Общий белок', shortName: 'Белок', unit: 'г/л', refMin: 65, refMax: 85 },
      { id: 'glucose', name: 'Глюкоза', shortName: 'Глюкоза', unit: 'ммоль/л', refMin: 3.3, refMax: 6.1 },
      { id: 'cholesterol', name: 'Общий холестерин', shortName: 'Холестерин', unit: 'ммоль/л', refMin: 3.0, refMax: 5.2 },
      { id: 'uric_acid', name: 'Мочевая кислота', shortName: 'Мочевая кислота', unit: 'мкмоль/л', refMin: 140, refMax: 420, genderDependent: true },
      { id: 'potassium', name: 'Калий', shortName: 'K⁺', unit: 'ммоль/л', refMin: 3.5, refMax: 5.1 },
      { id: 'sodium', name: 'Натрий', shortName: 'Na⁺', unit: 'ммоль/л', refMin: 136, refMax: 145 },
      { id: 'chloride', name: 'Хлор', shortName: 'Cl⁻', unit: 'ммоль/л', refMin: 98, refMax: 107 },
    ],
  },
  {
    id: 'lipidogram',
    name: 'Липидограмма',
    parameters: [
      { id: 'total_cholesterol', name: 'Общий холестерин', shortName: 'ОХС', unit: 'ммоль/л', refMin: 3.0, refMax: 5.2 },
      { id: 'ldl', name: 'ЛПНП', shortName: 'ЛПНП', unit: 'ммоль/л', refMin: 0, refMax: 3.0 },
      { id: 'hdl', name: 'ЛПВП', shortName: 'ЛПВП', unit: 'ммоль/л', refMin: 1.0, refMax: 2.0 },
      { id: 'triglycerides', name: 'Триглицериды', shortName: 'ТГ', unit: 'ммоль/л', refMin: 0, refMax: 1.7 },
      { id: 'vldl', name: 'ЛПОНП', shortName: 'ЛПОНП', unit: 'ммоль/л', refMin: 0.2, refMax: 1.0 },
    ],
  },
  {
    id: 'coagulogram',
    name: 'Коагулограмма',
    parameters: [
      { id: 'pt', name: 'Протромбиновое время', shortName: 'ПВ', unit: 'сек', refMin: 9.4, refMax: 12.5 },
      { id: 'inr', name: 'МНО', shortName: 'МНО', unit: '', refMin: 0.8, refMax: 1.2 },
      { id: 'aptt', name: 'АЧТВ', shortName: 'АЧТВ', unit: 'сек', refMin: 25, refMax: 37 },
      { id: 'fibrinogen', name: 'Фибриноген', shortName: 'Фибриноген', unit: 'г/л', refMin: 2.0, refMax: 4.0 },
      { id: 'd_dimer', name: 'D-димер', shortName: 'D-димер', unit: 'нг/мл', refMin: 0, refMax: 500 },
    ],
  },
];

/**
 * Референсные значения с учётом пола
 */
export function getRefRange(param: LabParameter, gender: 'male' | 'female'): { min: number; max: number } {
  if (!param.genderDependent) return { min: param.refMin, max: param.refMax };

  switch (param.id) {
    case 'hemoglobin': return gender === 'male' ? { min: 130, max: 160 } : { min: 120, max: 140 };
    case 'erythrocytes': return gender === 'male' ? { min: 4.0, max: 5.5 } : { min: 3.8, max: 4.8 };
    case 'esr': return gender === 'male' ? { min: 2, max: 15 } : { min: 2, max: 20 };
    case 'hematocrit': return gender === 'male' ? { min: 40, max: 48 } : { min: 36, max: 42 };
    case 'creatinine': return gender === 'male' ? { min: 62, max: 115 } : { min: 53, max: 97 };
    case 'uric_acid': return gender === 'male' ? { min: 200, max: 420 } : { min: 140, max: 340 };
    default: return { min: param.refMin, max: param.refMax };
  }
}