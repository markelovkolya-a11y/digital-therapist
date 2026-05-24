// core/data/stoppCriteria.ts
// v1.0.0 — STOPP критерии для пациентов ≥65 лет

export interface StoppRule {
  id: string;
  description: string;
  check: (medications: string[], diagnoses: string[], age: number, renalFunction?: { egfr: number }) => boolean;
  recommendation: string;
  severity: 'high' | 'medium';
}

export const STOPP_RULES: StoppRule[] = [
  {
    id: 'stopp_nsaid_long',
    description: 'НПВС более 3 месяцев',
    check: (meds) => meds.some(m =>
      ['диклофенак', 'мелоксикам', 'ибупрофен', 'кеторолак', 'найз', 'нимесулид'].includes(m.toLowerCase())
    ),
    recommendation: 'Добавить ИПП для защиты желудка или рассмотреть замену на парацетамол.',
    severity: 'high',
  },
  {
    id: 'stopp_nsaid_htn',
    description: 'НПВС при АГ или ХСН',
    check: (meds, diag) =>
      meds.some(m => ['диклофенак', 'мелоксикам', 'ибупрофен'].includes(m.toLowerCase())) &&
      diag.some(d => d.startsWith('I10') || d.startsWith('I11') || d.startsWith('I50')),
    recommendation: 'НПВС повышают АД и ухудшают ХСН. Рассмотреть отмену.',
    severity: 'high',
  },
  {
    id: 'stopp_nsaid_ckd',
    description: 'НПВС при СКФ <60',
    check: (meds, _diag, _age, renal) =>
      meds.some(m => ['диклофенак', 'мелоксикам', 'ибупрофен'].includes(m.toLowerCase())) &&
      (renal?.egfr ?? 999) < 60,
    recommendation: 'НПВС ухудшают функцию почек. Отменить или заменить на парацетамол.',
    severity: 'high',
  },
  {
    id: 'stopp_ppi_long',
    description: 'ИПП >8 недель без показаний',
    check: (meds) => meds.some(m => m.toLowerCase().includes('омепразол') || m.toLowerCase().includes('пантопразол')),
    recommendation: 'Рассмотреть снижение дозы или отмену ИПП.',
    severity: 'medium',
  },
  {
    id: 'stopp_aspirin_primary',
    description: 'Аспирин — первичная профилактика',
    check: (meds, diag) =>
      meds.some(m => m.toLowerCase().includes('аспирин') || m.toLowerCase().includes('ацетилсалициловая')) &&
      !diag.some(d => d.startsWith('I20') || d.startsWith('I25') || d.startsWith('I63')),
    recommendation: 'Риск кровотечения превышает пользу. Рассмотреть отмену.',
    severity: 'medium',
  },
  {
    id: 'stopp_duplicate_htn',
    description: 'Два препарата одной группы (иАПФ+БРА)',
    check: (meds) => {
      const ace = meds.filter(m => ['лизиноприл', 'эналаприл', 'периндоприл', 'рамиприл'].includes(m.toLowerCase()));
      const arb = meds.filter(m => ['лозартан', 'валсартан', 'кандесартан'].includes(m.toLowerCase()));
      return ace.length >= 2 || arb.length >= 2 || (ace.length >= 1 && arb.length >= 1);
    },
    recommendation: 'Оставить один препарат.',
    severity: 'high',
  },
  {
    id: 'stopp_metformin_ckd',
    description: 'Метформин при СКФ <30',
    check: (meds, _diag, _age, renal) =>
      meds.some(m => m.toLowerCase().includes('метформин')) && (renal?.egfr ?? 999) < 30,
    recommendation: 'Риск лактатацидоза. Отменить!',
    severity: 'high',
  },
];

export function checkStoppCriteria(
  medications: string[],
  diagnoses: string[],
  age: number,
  renalFunction?: { egfr: number }
): StoppRule[] {
  if (age < 65) return [];
  return STOPP_RULES.filter(rule => rule.check(medications, diagnoses, age, renalFunction));
}