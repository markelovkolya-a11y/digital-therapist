// core/data/defaultSymptomGuides.ts
// v1.0.0 — Стартовый набор симптом-помощника

import { CreateSymptomGuideInput } from '@core/types/symptomGuides';

export const DEFAULT_SYMPTOM_GUIDES: CreateSymptomGuideInput[] = [
  {
    name: 'Боль в горле',
    nonDrug: ['Полоскание горла (фурацилин 1:5000)', 'Обильное тёплое питьё', 'Щадящая диета'],
    medications: [
      { name: 'Фарингосепт', dose: '1 таб', frequency: '3-4 раза в день' },
      { name: 'Тантум Верде', dose: '2 впрыскивания', frequency: '3 раза в день' },
      { name: 'Стрепсилс', dose: '1 таб', frequency: 'каждые 2-3 часа' },
    ],
  },
  {
    name: 'Насморк',
    nonDrug: ['Промывание носа (Аквамарис)', 'Увлажнение воздуха'],
    medications: [
      { name: 'Називин', dose: '1-2 капли', frequency: '2-3 раза в день (не >5 дней)' },
      { name: 'Назонекс', dose: '2 впрыскивания', frequency: '1 раз в день' },
      { name: 'Ринофлуимуцил', dose: '2 впрыскивания', frequency: '3-4 раза в день' },
    ],
  },
  {
    name: 'Кашель сухой',
    nonDrug: ['Обильное тёплое питьё', 'Ингаляции с физраствором'],
    medications: [
      { name: 'Синекод', dose: '15 мл', frequency: '3 раза в день' },
      { name: 'Либексин', dose: '100 мг', frequency: '3 раза в день' },
    ],
  },
  {
    name: 'Кашель влажный',
    nonDrug: ['Обильное тёплое питьё', 'Дренажный массаж'],
    medications: [
      { name: 'АЦЦ', dose: '200 мг', frequency: '3 раза в день' },
      { name: 'Лазолван', dose: '30 мг', frequency: '3 раза в день' },
      { name: 'Амброксол', dose: '30 мг', frequency: '3 раза в день' },
    ],
  },
  {
    name: 'Изжога / ГЭРБ',
    nonDrug: ['Диета (исключить острое, жирное, кофе)', 'Не ложиться после еды 2 часа'],
    medications: [
      { name: 'Омепразол', dose: '20 мг', frequency: '1-2 раза в день' },
      { name: 'Фосфалюгель', dose: '1 пакетик', frequency: '3 раза в день' },
    ],
  },
  {
    name: 'Боль в суставах',
    nonDrug: ['Покой', 'Холод на сустав (первые 24ч)'],
    medications: [
      { name: 'Диклофенак', dose: '50 мг', frequency: '2 раза в день' },
      { name: 'Мелоксикам', dose: '15 мг', frequency: '1 раз в день' },
    ],
  },
  {
    name: 'Головная боль',
    nonDrug: ['Отдых в тёмной комнате', 'Исключить кофеин'],
    medications: [
      { name: 'Парацетамол', dose: '500 мг', frequency: 'до 4 раз в день' },
      { name: 'Ибупрофен', dose: '400 мг', frequency: 'до 3 раз в день' },
    ],
  },
  {
    name: 'Запор',
    nonDrug: ['Увеличение клетчатки', 'Водный режим 1.5-2 л/сут', 'Физическая активность'],
    medications: [
      { name: 'Дюфалак', dose: '30 мл', frequency: '1 раз в день' },
      { name: 'Мукофальк', dose: '1 пакетик', frequency: '2-3 раза в день' },
    ],
  },
  {
    name: 'Диарея',
    nonDrug: ['Регидратация (Регидрон)', 'Диета BRAT (бананы, рис, яблоки, тосты)'],
    medications: [
      { name: 'Смекта', dose: '1 пакетик', frequency: '3 раза в день' },
      { name: 'Лоперамид', dose: '2 мг', frequency: 'после каждого стула (max 16 мг/сут)' },
    ],
  },
  {
    name: 'Аллергическая реакция',
    nonDrug: ['Исключить контакт с аллергеном'],
    medications: [
      { name: 'Цетиризин', dose: '10 мг', frequency: '1 раз в день' },
      { name: 'Лоратадин', dose: '10 мг', frequency: '1 раз в день' },
    ],
  },
];