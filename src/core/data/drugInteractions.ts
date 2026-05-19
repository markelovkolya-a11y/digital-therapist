// core/data/drugInteractions.ts
// v1.0.0 — Справочник критических лекарственных взаимодействий для терапевта

export interface DrugInteractionRule {
  id: string;
  drugs: string[];
  type: 'interaction' | 'duplicate_class' | 'renal_dose';
  severity: 'warning' | 'critical';
  message: string;
  recommendation: string;
}

/**
 * Нормализация названия препарата для сравнения
 */
export function normalizeDrugName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Поиск взаимодействий среди списка препаратов
 */
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

    // interaction: все препараты из списка должны быть в назначениях
    const allFound = rule.drugs.every(d => normalized.includes(normalizeDrugName(d)));
    if (allFound) triggered.push(rule);
  }

  return triggered;
}

export const INTERACTION_RULES: DrugInteractionRule[] = [
  // Критические взаимодействия
  {
    id: 'int_ace_spiro',
    drugs: ['Лизиноприл', 'Спиронолактон'],
    type: 'interaction',
    severity: 'critical',
    message: 'иАПФ + Спиронолактон: риск гиперкалиемии',
    recommendation: 'Контроль калия через 3-5 дней. При K⁺ > 5.5 ммоль/л — отменить спиронолактон.',
  },
  {
    id: 'int_arb_spiro',
    drugs: ['Лозартан', 'Спиронолактон'],
    type: 'interaction',
    severity: 'critical',
    message: 'БРА + Спиронолактон: риск гиперкалиемии',
    recommendation: 'Контроль калия через 3-5 дней.',
  },
  {
    id: 'int_ace_arb',
    drugs: ['Лизиноприл', 'Лозартан'],
    type: 'interaction',
    severity: 'critical',
    message: 'иАПФ + БРА: двойная блокада РААС — не рекомендуется',
    recommendation: 'Оставить один препарат. Двойная блокада увеличивает риск гипотонии и ХБП.',
  },
  {
    id: 'int_nsaid_anticoag',
    drugs: ['Диклофенак', 'Ривароксабан'],
    type: 'interaction',
    severity: 'critical',
    message: 'НПВС + антикоагулянт: риск кровотечения',
    recommendation: 'Избегать комбинации. При необходимости — ИПП для защиты желудка.',
  },
  {
    id: 'int_nsaid_apixaban',
    drugs: ['Диклофенак', 'Апиксабан'],
    type: 'interaction',
    severity: 'critical',
    message: 'НПВС + антикоагулянт: риск кровотечения',
    recommendation: 'Избегать комбинации.',
  },
  {
    id: 'int_nsaid_aspirin',
    drugs: ['Диклофенак', 'Ацетилсалициловая кислота'],
    type: 'interaction',
    severity: 'critical',
    message: 'НПВС + Аспирин: повышенный риск ЖКТ-кровотечения',
    recommendation: 'Добавить ИПП. Контроль ЖКТ-симптомов.',
  },
  {
    id: 'int_aspirin_clopidogrel_nsaid',
    drugs: ['Ацетилсалициловая кислота', 'Клопидогрел', 'Диклофенак'],
    type: 'interaction',
    severity: 'critical',
    message: 'Тройная антитромботическая терапия + НПВС: высокий риск кровотечения',
    recommendation: 'Отменить НПВС. Рассмотреть парацетамол.',
  },
  {
    id: 'int_statin_macrolide',
    drugs: ['Аторвастатин', 'Азитромицин'],
    type: 'interaction',
    severity: 'critical',
    message: 'Статин + макролид: риск рабдомиолиза',
    recommendation: 'Временно отменить статин на курс антибиотика.',
  },
  {
    id: 'int_bb_verapamil',
    drugs: ['Бисопролол', 'Верапамил'],
    type: 'interaction',
    severity: 'critical',
    message: 'β-блокатор + Верапамил: риск брадикардии и AV-блокады',
    recommendation: 'Не комбинировать. Выбрать один препарат.',
  },
  {
    id: 'int_amiodarone_warfarin',
    drugs: ['Амиодарон', 'Варфарин'],
    type: 'interaction',
    severity: 'critical',
    message: 'Амиодарон + Варфарин: усиление антикоагуляции (МНО ↑)',
    recommendation: 'Снизить дозу варфарина на 30-50%. Контроль МНО через 3 дня.',
  },
  {
    id: 'int_clopidogrel_omeprazole',
    drugs: ['Клопидогрел', 'Омепразол'],
    type: 'interaction',
    severity: 'warning',
    message: 'Клопидогрел + Омепразол: снижение антиагрегантного эффекта',
    recommendation: 'Заменить на пантопразол или рабепразол.',
  },
  // Дублирование классов
  {
    id: 'dup_ace',
    drugs: ['Лизиноприл', 'Эналаприл', 'Периндоприл', 'Рамиприл', 'Фозиноприл', 'Каптоприл'],
    type: 'duplicate_class',
    severity: 'critical',
    message: 'Два препарата группы иАПФ: дублирование терапии',
    recommendation: 'Оставить один препарат группы иАПФ.',
  },
  {
    id: 'dup_statin',
    drugs: ['Аторвастатин', 'Розувастатин', 'Симвастатин', 'Питавастатин'],
    type: 'duplicate_class',
    severity: 'critical',
    message: 'Два статина: дублирование терапии',
    recommendation: 'Оставить один статин.',
  },
  {
    id: 'dup_nsaid',
    drugs: ['Диклофенак', 'Мелоксикам', 'Ибупрофен', 'Кеторолак', 'Найз', 'Нимесулид'],
    type: 'duplicate_class',
    severity: 'critical',
    message: 'Два НПВС: дублирование терапии — риск ЖКТ-кровотечения и ХБП',
    recommendation: 'Оставить один НПВС.',
  },
  {
    id: 'dup_bb',
    drugs: ['Бисопролол', 'Метопролол', 'Карведилол', 'Небиволол', 'Атенолол'],
    type: 'duplicate_class',
    severity: 'critical',
    message: 'Два β-блокатора: дублирование терапии',
    recommendation: 'Оставить один β-блокатор.',
  },
  {
    id: 'dup_arb',
    drugs: ['Лозартан', 'Валсартан', 'Кандесартан', 'Телмисартан', 'Ирбесартан'],
    type: 'duplicate_class',
    severity: 'critical',
    message: 'Два БРА: дублирование терапии',
    recommendation: 'Оставить один БРА.',
  },
  {
    id: 'dup_anticoag',
    drugs: ['Ривароксабан', 'Апиксабан', 'Дабигатран', 'Варфарин'],
    type: 'duplicate_class',
    severity: 'critical',
    message: 'Два антикоагулянта: критический риск кровотечения',
    recommendation: 'Оставить один антикоагулянт.',
  },
  // Контроль доз при ХБП
  {
    id: 'renal_metformin',
    drugs: ['Метформин'],
    type: 'renal_dose',
    severity: 'warning',
    message: 'Метформин при СКФ < 60: риск лактатацидоза',
    recommendation: 'СКФ 45-60: max 1000 мг/сут. СКФ 30-45: max 500 мг/сут. СКФ < 30: отменить.',
  },
  {
    id: 'renal_nsaid',
    drugs: ['Диклофенак', 'Мелоксикам', 'Ибупрофен'],
    type: 'renal_dose',
    severity: 'critical',
    message: 'НПВС при СКФ < 60: риск ухудшения функции почек',
    recommendation: 'Избегать НПВС. При необходимости — минимальный курс 3-5 дней.',
  },
  {
    id: 'renal_ace',
    drugs: ['Лизиноприл', 'Эналаприл', 'Периндоприл'],
    type: 'renal_dose',
    severity: 'warning',
    message: 'иАПФ при ХБП: контроль калия и СКФ',
    recommendation: 'Контроль креатинина и калия через 1-2 недели после назначения.',
  },
];