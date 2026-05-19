// core/database/repositories/complaints.repo.ts
// v1.0.0 — Репозиторий справочника жалоб

import { getDb } from '../connection';
import { ComplaintTemplate, CreateComplaintInput } from '@core/types/complaints';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

export const complaintsRepo = {
  async findAll(): Promise<ComplaintTemplate[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM complaint_templates ORDER BY name'
    );
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
    }));
  },

  async create(input: CreateComplaintInput): Promise<ComplaintTemplate> {
    const db = getDb();
    const complaint: ComplaintTemplate = {
      ...input,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.execute(
      'INSERT INTO complaint_templates (id, name, created_at) VALUES (?, ?, ?)',
      [complaint.id, complaint.name, complaint.createdAt]
    );
    return complaint;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM complaint_templates WHERE id = ?', [id]);
  },
};