// core/data/drugInteractions.ts
// v2.0.0 — 34 правила: критические + синергические + дублирование + ХБП

export interface DrugInteractionRule {
  id: string;
  drugs: string[];
  type: 'interaction' | 'duplicate_class' | 'renal_dose' | 'synergy';
  severity: 'warning' | 'critical';
  message: string;
  recommendation: string;
}

export function normalizeDrugName(name: string): string {
  return name.toLowerCase().trim();
}

export function findInteractions(
  currentMeds: string[],
  renalFunction?: { egfr: number }
): DrugInteractionRule[] {
  const triggered: DrugInteractionRule[] = [];
  const normalized = currentMeds.map(normalizeDrugName);

  for (const rule of INTERACTION_RULES) {
    if (rule.type === 'renal_dose') {
      if (renalFunction && renalFunction.egfr < 60) {
        const hasDrug = rule.drugs.some(d => normalized.includes(normalizeDrugName(d)));
        if (hasDrug) triggered.push(rule);
      }
      continue;
    }

    if (rule.type === 'duplicate_class') {
      const found = rule.drugs.filter(d => normalized.includes(normalizeDrugName(d)));
      if (found.length >= 2) triggered.push(rule);
      continue;
    }

    const allFound = rule.drugs.every(d => normalized.includes(normalizeDrugName(d)));
    if (allFound) triggered.push(rule);
  }

  return triggered;
}

export const INTERACTION_RULES: DrugInteractionRule[] = [
  // ===== КРИТИЧЕСКИЕ ВЗАИМОДЕЙСТВИЯ =====
  {
    id: 'int_ace_spiro',
    drugs: ['Лизиноприл', 'Спиронолактон'],
    type: 'interaction', severity: 'critical',
    message: 'иАПФ + Спиронолактон: риск гиперкалиемии',
    recommendation: 'Контроль калия через 3-5 дней. При K⁺ > 5.5 ммоль/л — отменить спиронолактон.',
  },
  {
    id: 'int_ace_arb',
    drugs: ['Лизиноприл', 'Лозартан'],
    type: 'interaction', severity: 'critical',
    message: 'иАПФ + БРА: двойная блокада РААС',
    recommendation: 'Оставить один препарат.',
  },
  {
    id: 'int_nsaid_anticoag',
    drugs: ['Диклофенак', 'Ривароксабан'],
    type: 'interaction', severity: 'critical',
    message: 'НПВС + антикоагулянт: риск кровотечения',
    recommendation: 'Избегать комбинации. При необходимости — ИПП.',
  },
  {
    id: 'int_nsaid_aspirin',
    drugs: ['Диклофенак', 'Ацетилсалициловая кислота'],
    type: 'interaction', severity: 'critical',
    message: 'НПВС + Аспирин: повышенный риск ЖКТ-кровотечения',
    recommendation: 'Добавить ИПП.',
  },
  {
    id: 'int_statin_macrolide',
    drugs: ['Аторвастатин', 'Азитромицин'],
    type: 'interaction', severity: 'critical',
    message: 'Статин + макролид: риск рабдомиолиза',
    recommendation: 'Временно отменить статин на курс антибиотика.',
  },
  {
    id: 'int_bb_verapamil',
    drugs: ['Бисопролол', 'Верапамил'],
    type: 'interaction', severity: 'critical',
    message: 'β-блокатор + Верапамил: риск брадикардии',
    recommendation: 'Не комбинировать.',
  },
  {
    id: 'int_clopidogrel_omeprazole',
    drugs: ['Клопидогрел', 'Омепразол'],
    type: 'interaction', severity: 'warning',
    message: 'Клопидогрел + Омепразол: снижение антиагрегантного эффекта',
    recommendation: 'Заменить на пантопразол.',
  },

  // ===== СИНЕРГИЧЕСКИЕ (усиление эффекта) =====
  {
    id: 'syn_ace_diuretic_hypotension',
    drugs: ['Лизиноприл', 'Гидрохлоротиазид'],
    type: 'synergy', severity: 'warning',
    message: 'иАПФ + диуретик: риск гипотонии первой дозы',
    recommendation: 'Начинать с минимальных доз, контроль АД.',
  },
  {
    id: 'syn_aspirin_clopidogrel_bleeding',
    drugs: ['Ацетилсалициловая кислота', 'Клопидогрел'],
    type: 'synergy', severity: 'warning',
    message: 'Двойная антитромботическая терапия: усиление антиагрегантного эффекта',
    recommendation: 'Оценка риска кровотечения (HAS-BLED).',
  },
  {
    id: 'syn_metformin_sglt2_ketoacidosis',
    drugs: ['Метформин', 'Эмпаглифлозин'],
    type: 'synergy', severity: 'warning',
    message: 'Метформин + SGLT2: риск эугликемического кетоацидоза',
    recommendation: 'Предупредить пациента о симптомах. Избегать голодания.',
  },
  {
    id: 'syn_ace_arb_hypotension_ckd',
    drugs: ['Лизиноприл', 'Лозартан'],
    type: 'synergy', severity: 'critical',
    message: 'иАПФ + БРА: риск гипотонии и ухудшения ХБП',
    recommendation: 'Двойная блокада не рекомендуется.',
  },
  {
    id: 'syn_bb_insulin_hypoglycemia',
    drugs: ['Бисопролол', 'Инсулин'],
    type: 'synergy', severity: 'warning',
    message: 'β-блокатор + Инсулин: может маскировать гипогликемию',
    recommendation: 'Предупредить пациента. Чаще контролировать глюкозу.',
  },
  {
    id: 'syn_nsaid_antihypertensive',
    drugs: ['Диклофенак', 'Лизиноприл'],
    type: 'synergy', severity: 'warning',
    message: 'НПВС снижают эффективность иАПФ',
    recommendation: 'Контроль АД. Рассмотреть замену НПВС.',
  },
  {
    id: 'syn_loop_thiazide_hypokalemia',
    drugs: ['Фуросемид', 'Гидрохлоротиазид'],
    type: 'synergy', severity: 'warning',
    message: 'Два диуретика: усиление гипокалиемии',
    recommendation: 'Контроль калия.',
  },
  {
    id: 'syn_warfarin_nsaid_bleeding',
    drugs: ['Варфарин', 'Диклофенак'],
    type: 'synergy', severity: 'critical',
    message: 'Варфарин + НПВС: значительное усиление риска кровотечения',
    recommendation: 'Избегать комбинации.',
  },
  {
    id: 'syn_warfarin_statin',
    drugs: ['Варфарин', 'Аторвастатин'],
    type: 'synergy', severity: 'warning',
    message: 'Варфарин + статин: потенцирование антикоагуляции',
    recommendation: 'Контроль МНО при назначении.',
  },

  // ===== ДУБЛИРОВАНИЕ КЛАССОВ =====
  {
    id: 'dup_ace',
    drugs: ['Лизиноприл', 'Эналаприл', 'Периндоприл', 'Рамиприл'],
    type: 'duplicate_class', severity: 'critical',
    message: 'Два препарата группы иАПФ: дублирование',
    recommendation: 'Оставить один.',
  },
  {
    id: 'dup_statin',
    drugs: ['Аторвастатин', 'Розувастатин', 'Симвастатин'],
    type: 'duplicate_class', severity: 'critical',
    message: 'Два статина: дублирование',
    recommendation: 'Оставить один.',
  },
  {
    id: 'dup_nsaid',
    drugs: ['Диклофенак', 'Мелоксикам', 'Ибупрофен', 'Кеторолак', 'Нимесулид'],
    type: 'duplicate_class', severity: 'critical',
    message: 'Два НПВС: дублирование',
    recommendation: 'Оставить один.',
  },
  {
    id: 'dup_bb',
    drugs: ['Бисопролол', 'Метопролол', 'Карведилол', 'Небиволол'],
    type: 'duplicate_class', severity: 'critical',
    message: 'Два β-блокатора: дублирование',
    recommendation: 'Оставить один.',
  },
  {
    id: 'dup_arb',
    drugs: ['Лозартан', 'Валсартан', 'Кандесартан', 'Телмисартан'],
    type: 'duplicate_class', severity: 'critical',
    message: 'Два БРА: дублирование',
    recommendation: 'Оставить один.',
  },
  {
    id: 'dup_anticoag',
    drugs: ['Ривароксабан', 'Апиксабан', 'Дабигатран', 'Варфарин'],
    type: 'duplicate_class', severity: 'critical',
    message: 'Два антикоагулянта: критический риск',
    recommendation: 'Оставить один.',
  },

  // ===== КОНТРОЛЬ ДОЗ ПРИ ХБП =====
  {
    id: 'renal_metformin',
    drugs: ['Метформин'],
    type: 'renal_dose', severity: 'warning',
    message: 'Метформин при СКФ < 60: риск лактатацидоза',
    recommendation: 'СКФ 45-60: max 1000 мг/сут. СКФ 30-45: max 500 мг/сут. СКФ < 30: отменить.',
  },
  {
    id: 'renal_nsaid',
    drugs: ['Диклофенак', 'Мелоксикам', 'Ибупрофен'],
    type: 'renal_dose', severity: 'critical',
    message: 'НПВС при СКФ < 60: риск ухудшения ХБП',
    recommendation: 'Избегать НПВС.',
  },
  {
    id: 'renal_ace',
    drugs: ['Лизиноприл', 'Эналаприл', 'Периндоприл'],
    type: 'renal_dose', severity: 'warning',
    message: 'иАПФ при ХБП: контроль калия и СКФ',
    recommendation: 'Контроль через 1-2 недели.',
  },
];