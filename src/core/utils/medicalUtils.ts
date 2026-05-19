// core/utils/medicalUtils.ts
// v1.0.0 — Предиктивные шкалы: SCORE2, CKD-EPI, CHA₂DS₂-VASc, HAS-BLED

import { calculateAge } from './date';

/**
 * Рассчитывает СКФ по формуле CKD-EPI (2021)
 */
export function calculateEGFR(
  creatinine: number,    // мкмоль/л
  age: number,
  isFemale: boolean
): { value: number; stage: string; color: string } | null {
  if (!creatinine || creatinine <= 0 || !age || age <= 0) return null;

  const cr = creatinine / 88.4; // перевод в мг/дл

  let egfr: number;
  if (isFemale) {
    if (cr <= 0.7) {
      egfr = 144 * Math.pow(cr / 0.7, -0.329) * Math.pow(0.993, age);
    } else {
      egfr = 144 * Math.pow(cr / 0.7, -1.209) * Math.pow(0.993, age);
    }
  } else {
    if (cr <= 0.9) {
      egfr = 141 * Math.pow(cr / 0.9, -0.411) * Math.pow(0.993, age);
    } else {
      egfr = 141 * Math.pow(cr / 0.9, -1.209) * Math.pow(0.993, age);
    }
  }

  // Округляем
  const value = egfr >= 90 ? Math.round(egfr) : Math.round(egfr * 10) / 10;

  let stage: string;
  let color: string;

  if (value >= 90) {
    stage = 'C1 — норма или высокая';
    color = '#10b981';
  } else if (value >= 60) {
    stage = 'C2 — незначительное снижение';
    color = '#10b981';
  } else if (value >= 45) {
    stage = 'C3a — умеренное снижение';
    color = '#f59e0b';
  } else if (value >= 30) {
    stage = 'C3b — существенное снижение';
    color = '#f59e0b';
  } else if (value >= 15) {
    stage = 'C4 — тяжёлое снижение';
    color = '#ef4444';
  } else {
    stage = 'C5 — терминальная ХБП';
    color = '#ef4444';
  }

  return { value, stage, color };
}

/**
 * Рассчитывает шкалу CHA₂DS₂-VASc (риск инсульта при ФП)
 * Возвращает: количество баллов + категория риска
 */
export function calculateCHA2DS2VASc(
  age: number,
  isFemale: boolean,
  hasHF: boolean,        // сердечная недостаточность
  hasHTN: boolean,       // гипертония
  hasDM: boolean,        // сахарный диабет
  hasStroke: boolean,    // инсульт/ТИА в анамнезе
  hasVascular: boolean   // сосудистое заболевание (ИБС, атеросклероз)
): { score: number; risk: string; recommendation: string; color: string } {
  let score = 0;
  const components: string[] = [];

  if (hasHF) { score += 1; components.push('СН'); }
  if (hasHTN) { score += 1; components.push('АГ'); }
  if (age >= 75) {
    score += 2;
    components.push('Возраст ≥75');
  } else if (age >= 65) {
    score += 1;
    components.push('Возраст 65-74');
  }
  if (hasDM) { score += 1; components.push('СД'); }
  if (hasStroke) { score += 2; components.push('Инсульт/ТИА'); }
  if (hasVascular) { score += 1; components.push('Сосудистое заб.'); }
  if (isFemale) { score += 1; components.push('Женский пол'); }

  let risk: string;
  let recommendation: string;
  let color: string;

  if (score === 0) {
    risk = 'Низкий';
    recommendation = 'Антикоагулянты не показаны';
    color = '#10b981';
  } else if (score === 1) {
    risk = 'Умеренный';
    recommendation = 'Рассмотреть антикоагулянты (предпочтительно ПОАК)';
    color = '#f59e0b';
  } else {
    risk = 'Высокий';
    recommendation = 'Показаны антикоагулянты (ПОАК предпочтительнее варфарина)';
    color = '#ef4444';
  }

  return { score, risk, recommendation, color };
}

/**
 * Рассчитывает шкалу HAS-BLED (риск кровотечения)
 */
export function calculateHASBLED(
  hasHTN: boolean,           // неконтролируемая АГ (САД >160)
  renalLiverDisease: number, // 1 — ХБП/цирроз, 0 — нет
  hasStroke: boolean,
  hasBleeding: boolean,      // кровотечение в анамнезе
  labileINR: boolean,        // лабильное МНО
  ageOver65: boolean,
  hasDrugs: boolean,         // НПВС/антиагреганты
  hasAlcohol: boolean        // алкоголь >8 доз/нед
): { score: number; risk: string; color: string } {
  let score = 0;
  if (hasHTN) score += 1;
  score += renalLiverDisease;
  if (hasStroke) score += 1;
  if (hasBleeding) score += 1;
  if (labileINR) score += 1;
  if (ageOver65) score += 1;
  if (hasDrugs) score += 1;
  if (hasAlcohol) score += 1;

  let risk: string;
  let color: string;

  if (score <= 1) {
    risk = 'Низкий риск';
    color = '#10b981';
  } else if (score === 2) {
    risk = 'Умеренный риск';
    color = '#f59e0b';
  } else {
    risk = 'Высокий риск кровотечения';
    color = '#ef4444';
  }

  return { score, risk, color };
}

/**
 * Предупреждение: точный расчёт SCORE2 требует таблиц.
 * Возвращает заглушку с рекомендацией использовать калькулятор.
 */
export function calculateSCORE2Note(): string {
  return '⚠️ Точный расчёт SCORE2 требует специальных таблиц. Рекомендуется использовать онлайн-калькулятор ESC.';
}

/**
 * Рассчитывает ИМТ
 */
export function calculateBMI(height: number, weight: number): { value: number; label: string; color: string } | null {
  if (!height || height <= 0 || !weight || weight <= 0) return null;

  const h = height / 100;
  const bmi = Math.round((weight / (h * h)) * 10) / 10;

  let label: string;
  let color: string;

  if (bmi < 16) { label = 'Выраженный дефицит'; color = '#ef4444'; }
  else if (bmi < 18.5) { label = 'Дефицит массы'; color = '#f59e0b'; }
  else if (bmi < 25) { label = 'Норма'; color = '#10b981'; }
  else if (bmi < 30) { label = 'Избыточная масса'; color = '#f59e0b'; }
  else if (bmi < 35) { label = 'Ожирение I ст.'; color = '#ef4444'; }
  else if (bmi < 40) { label = 'Ожирение II ст.'; color = '#ef4444'; }
  else { label = 'Ожирение III ст.'; color = '#dc2626'; }

  return { value: bmi, label, color };
}

/**
 * Определяет целевое АД в зависимости от диагнозов
 */
export function getTargetBP(icdCodes: string[]): { systolicMax: number; diastolicMax: number; label: string } {
  const hasDM = icdCodes.some(c => c.startsWith('E10') || c.startsWith('E11'));
  const hasCKD = icdCodes.some(c => c.startsWith('N18'));
  const hasCHD = icdCodes.some(c => c.startsWith('I20') || c.startsWith('I25'));
  const hasStroke = icdCodes.some(c => c.startsWith('I63') || c.startsWith('I64'));

  if (hasDM || hasCKD || hasCHD || hasStroke) {
    return { systolicMax: 130, diastolicMax: 80, label: 'Целевое АД < 130/80 (высокий риск)' };
  }

  return { systolicMax: 140, diastolicMax: 90, label: 'Целевое АД < 140/90' };
}