// core/services/waiting.service.ts
// v1.1.0 — Добавлен problemId в create

import { getDb } from '@core/database/connection';
import { WaitingItem, WaitingPriority, WaitingType, WaitingStatus } from '@core/types';
import { generateId } from '@core/utils/uid';
import { nowISO, todayString, isOverdue } from '@core/utils/date';
import { ScreeningGapItem } from './screening.service';

export interface WaitingItemFull extends WaitingItem {
  patientName?: string;
}

function rowToWaitingItem(row: any): WaitingItemFull {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientCode: row.patient_code,
    type: row.type as WaitingType,
    description: row.description,
    priority: row.priority as WaitingPriority,
    deadline: row.deadline || null,
    status: row.status as WaitingStatus,
    problemId: row.problem_id || undefined,
    createdAt: row.created_at,
    patientName: row.patient_name || undefined,
  };
}

export const waitingService = {
  async getAll(): Promise<WaitingItemFull[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      `SELECT w.*, p.last_name || ' ' || p.first_name as patient_name
       FROM waiting_items w
       JOIN patients p ON w.patient_id = p.id
       WHERE w.status != 'выполнен'
       ORDER BY 
         CASE w.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
         w.deadline ASC`
    );
    return rows.map(r => ({ ...rowToWaitingItem(r), patientName: r.patient_name }));
  },

  async getUrgent(): Promise<WaitingItemFull[]> {
    const db = getDb();
    const today = todayString();
    const rows = await db.select<any[]>(
      `SELECT w.*, p.last_name || ' ' || p.first_name as patient_name
       FROM waiting_items w
       JOIN patients p ON w.patient_id = p.id
       WHERE w.status = 'ожидает' 
         AND (w.priority IN ('P0', 'P1') OR (w.deadline IS NOT NULL AND w.deadline < ?))
       ORDER BY w.priority, w.deadline ASC
       LIMIT 20`,
      [today]
    );
    return rows.map(r => ({ ...rowToWaitingItem(r), patientName: r.patient_name }));
  },

  async getByPatient(patientId: string): Promise<WaitingItemFull[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      `SELECT w.*, p.last_name || ' ' || p.first_name as patient_name
       FROM waiting_items w
       JOIN patients p ON w.patient_id = p.id
       WHERE w.patient_id = ? AND w.status != 'выполнен'
       ORDER BY w.created_at DESC`,
      [patientId]
    );
    return rows.map(r => ({ ...rowToWaitingItem(r), patientName: r.patient_name }));
  },

  async getByProblem(problemId: string): Promise<WaitingItemFull[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      `SELECT w.*, p.last_name || ' ' || p.first_name as patient_name
       FROM waiting_items w
       JOIN patients p ON w.patient_id = p.id
       WHERE w.problem_id = ?
       ORDER BY w.created_at DESC`,
      [problemId]
    );
    return rows.map(r => ({ ...rowToWaitingItem(r), patientName: r.patient_name }));
  },

  async create(item: Omit<WaitingItem, 'id' | 'createdAt'>): Promise<WaitingItem> {
    const db = getDb();
    const newItem: WaitingItem = {
      ...item,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.execute(
      `INSERT INTO waiting_items (id, patient_id, patient_code, type, description, priority, deadline, status, problem_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newItem.id, newItem.patientId, newItem.patientCode, newItem.type, newItem.description,
       newItem.priority, newItem.deadline, newItem.status, newItem.problemId || null, newItem.createdAt]
    );
    return newItem;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    const db = getDb();
    await db.execute('UPDATE waiting_items SET status = ? WHERE id = ?', [status, id]);
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM waiting_items WHERE id = ?', [id]);
  },

  async getScreeningGaps(patients: any[], allEvents: any[]): Promise<ScreeningGapItem[]> {
    const { getScreeningGaps } = await import('./screening.service');
    return getScreeningGaps(patients, allEvents);
  },
};