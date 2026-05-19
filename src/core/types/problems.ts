// core/types/problems.ts
// v1.0.0 — Типы для дневника проблем

export type ProblemStatus = 'active' | 'monitoring' | 'resolved';

export interface Problem {
  id: string;
  patientId: string;
  title: string;
  icdCode?: string;
  status: ProblemStatus;
  startedAt: string;
  resolvedAt: string | null;
  createdAt: string;
}

export type CreateProblemInput = Omit<Problem, 'id' | 'createdAt'>;