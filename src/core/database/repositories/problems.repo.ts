// core/database/repositories/problems.repo.ts
// v1.0.0 — Репозиторий проблем

import { getDb } from '../connection';
import { Problem, CreateProblemInput } from '@core/types/problems';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

function rowToProblem(row: any): Problem {
  return {
    id: row.id,
    patientId: row.patient_id,
    title: row.title,
    icdCode: row.icd_code || undefined,
    status: row.status,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at || null,
    createdAt: row.created_at,
  };
}

export const problemsRepo = {
  async findByPatient(patientId: string): Promise<Problem[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM problems WHERE patient_id = ? ORDER BY started_at DESC',
      [patientId]
    );
    return rows.map(rowToProblem);
  },

  async findActive(patientId: string): Promise<Problem[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM problems WHERE patient_id = ? AND status != ? ORDER BY started_at DESC',
      [patientId, 'resolved']
    );
    return rows.map(rowToProblem);
  },

  async create(input: CreateProblemInput): Promise<Problem> {
    const db = getDb();
    const problem: Problem = {
      ...input,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.execute(
      'INSERT INTO problems (id, patient_id, title, icd_code, status, started_at, resolved_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [problem.id, problem.patientId, problem.title, problem.icdCode || null, problem.status, problem.startedAt, problem.resolvedAt, problem.createdAt]
    );
    return problem;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    const db = getDb();
    const resolvedAt = status === 'resolved' ? nowISO() : null;
    await db.execute(
      'UPDATE problems SET status = ?, resolved_at = ? WHERE id = ?',
      [status, resolvedAt, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM problems WHERE id = ?', [id]);
  },
};