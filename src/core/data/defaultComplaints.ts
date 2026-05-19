// core/data/defaultComplaints.ts
// v1.0.0 — Стартовый справочник жалоб

import { CreateComplaintInput } from '@core/types/complaints';

export const DEFAULT_COMPLAINTS: CreateComplaintInput[] = [
  { name: 'Слабость' },
  { name: 'Головная боль' },
  { name: 'Головокружение' },
  { name: 'Кашель' },
  { name: 'Одышка' },
  { name: 'Отёки' },
  { name: 'Тошнота' },
  { name: 'Изжога' },
  { name: 'Боль в животе' },
  { name: 'Боль в пояснице' },
  { name: 'Повышение температуры' },
  { name: 'Учащённое мочеиспускание' },
];