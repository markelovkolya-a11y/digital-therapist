// core/data/defaultFacilities.ts
// v1.0.0 — Стартовый справочник мест

import { CreateFacilityInput } from '@core/types/facilities';

export const DEFAULT_FACILITIES: CreateFacilityInput[] = [
  { name: 'ГБУЗ СО Самарская городская поликлиника № 10 Советского района', category: 'clinic' },
  { name: 'ГБУЗ СО САМАРСКАЯ ОБЛАСТНАЯ КЛИНИЧЕСКАЯ БОЛЬНИЦА ИМ. В.Д. СЕРЕДАВИНА', category: 'hospital' },
  { name: 'ГБУЗ СО Самарский областной клинический онкологический диспансер', category: 'hospital' },
  { name: 'ГБУЗ СО Самарский областной клинический кардиологический диспансер', category: 'hospital' },
  { name: 'ФГБОУ ВО СамГМУ Минздрава России', category: 'hospital' },
  { name: 'ГБУЗ Самарский областной клинический центр профилактики и борьбы со СПИД', category: 'hospital' },
  { name: 'ГБУЗ СО Самарский областной клинический противотуберкулёзный диспансер', category: 'hospital' },
  { name: 'ГБУЗ СО Самарская городская клиническая больница №1 им. Н.И. Пирогова', category: 'hospital' },
  { name: 'ГБУЗ СО Самарская городская больница № 4', category: 'hospital' },
  { name: 'ГБУЗ СО Самарская городская больница № 6', category: 'hospital' },
  { name: 'ГБУЗ СО Самарская городская больница № 8', category: 'hospital' },
  { name: 'АО Самарский диагностический центр СДЦ', category: 'other' },
  { name: 'ООО Медицинский лучевой центр МЛЦ', category: 'other' },
  { name: 'ООО ЛДЦ МИБС-САМАРА', category: 'other' },
  { name: 'Инвитро', category: 'lab' },
  { name: 'Гемотест', category: 'lab' },
];