// core/types/index.ts
// v1.1.0 — Экспорт всех типов

export type * from './patient';
export type * from './events';
export type * from './params';
export type * from './clinical';
export type * from './visit';
export type * from './formulations';
export type * from './medications';
export type * from './settings';
export type * from './complaints';

// Базовые типы для совместимости
export type Gender = 'male' | 'female';

export type WaitingPriority = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type WaitingType = 'консультация' | 'обследование' | 'ДС';
export type WaitingStatus = 'ожидает' | 'записан' | 'выполнен';

export interface WaitingItem {
  id: string;
  patientId: string;
  patientCode: string;
  type: WaitingType;
  description: string;
  priority: WaitingPriority;
  deadline: string | null;
  status: WaitingStatus;
  problemId?: string;
  createdAt: string;
}