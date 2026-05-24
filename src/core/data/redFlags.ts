// core/data/redFlags.ts
// v1.0.0 — Красные флаги при симптомах

export interface RedFlag {
  id: string;
  symptomPattern: string;    // паттерн для поиска в жалобах (lowercase)
  flag: string;              // что проверяем
  message: string;           // предупреждение
  severity: 'critical' | 'warning';  // критичность
}

export const RED_FLAGS: RedFlag[] = [
  {
    id: 'rf_headache_thunder',
    symptomPattern: 'головная боль',
    flag: 'Внезапное начало (громоподобная боль)',
    message: 'Исключить субарахноидальное кровоизлияние (САК). КТ головы без контраста.',
    severity: 'critical',
  },
  {
    id: 'rf_headache_morning',
    symptomPattern: 'головная боль',
    flag: 'Усиливается по утрам, сопровождается тошнотой/рвотой',
    message: 'Исключить объёмное образование головного мозга. МРТ с контрастом.',
    severity: 'critical',
  },
  {
    id: 'rf_headache_age50',
    symptomPattern: 'головная боль',
    flag: 'Впервые возникшая после 50 лет',
    message: 'Исключить височный артериит (СОЭ, СРБ). Риск потери зрения.',
    severity: 'warning',
  },
  {
    id: 'rf_chest_pain_acute',
    symptomPattern: 'боль в груди',
    flag: 'Острая боль за грудиной, давящая, >20 минут',
    message: 'Исключить ОКС. ЭКГ, тропонины, госпитализация.',
    severity: 'critical',
  },
  {
    id: 'rf_back_pain_cauda',
    symptomPattern: 'боль в спине|боль в пояснице',
    flag: 'С иррадиацией в ногу, онемение, нарушение мочеиспускания',
    message: 'Исключить синдром конского хвоста. Срочная МРТ, нейрохирург.',
    severity: 'critical',
  },
  {
    id: 'rf_back_pain_fracture',
    symptomPattern: 'боль в спине|боль в пояснице',
    flag: 'Возраст >70 лет, травма в анамнезе, остеопороз',
    message: 'Исключить компрессионный перелом позвонка. Рентген/КТ.',
    severity: 'warning',
  },
  {
    id: 'rf_cough_hemoptysis',
    symptomPattern: 'кашель',
    flag: 'Кровохарканье',
    message: 'Исключить ТЭЛА, рак лёгкого, туберкулёз. Рентген ОГК, КТ.',
    severity: 'critical',
  },
  {
    id: 'rf_cough_smoker',
    symptomPattern: 'кашель',
    flag: 'Стаж курения >30 пачка/лет, изменение характера кашля',
    message: 'Исключить рак лёгкого. Низкодозовая КТ ОГК.',
    severity: 'warning',
  },
  {
    id: 'rf_fever_neutropenia',
    symptomPattern: 'температура|лихорадка',
    flag: 'На фоне иммуносупрессии (химиотерапия, преднизолон)',
    message: 'Фебрильная нейтропения? Немедленная госпитализация.',
    severity: 'critical',
  },
  {
    id: 'rf_dizziness_stroke',
    symptomPattern: 'головокружение',
    flag: 'Внезапное, с нарушением речи, слабостью в конечностях',
    message: 'Исключить ОНМК. Шкала FAST, госпитализация.',
    severity: 'critical',
  },
  {
    id: 'rf_weight_loss',
    symptomPattern: 'снижение веса|похудение',
    flag: 'Непреднамеренное, >5% за 6 месяцев',
    message: 'Исключить онкопатологию, туберкулёз, гипертиреоз. Онкопоиск.',
    severity: 'warning',
  },
  {
    id: 'rf_edema_unilateral',
    symptomPattern: 'отёк|отёки',
    flag: 'Односторонний отёк ноги, боль, покраснение',
    message: 'Исключить ТГВ. УЗИ вен нижних конечностей.',
    severity: 'critical',
  },
];

/**
 * Проверяет жалобы на красные флаги
 */
export function checkRedFlags(complaints: string[]): RedFlag[] {
  const triggered: RedFlag[] = [];
  const lowerComplaints = complaints.map(c => c.toLowerCase());
  
  for (const flag of RED_FLAGS) {
    const patterns = flag.symptomPattern.split('|');
    if (patterns.some(p => lowerComplaints.some(c => c.includes(p)))) {
      if (!triggered.find(t => t.id === flag.id)) {
        triggered.push(flag);
      }
    }
  }
  
  return triggered;
}