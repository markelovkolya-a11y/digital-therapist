// core/database/repositories/facilities.repo.ts
// v1.0.0 — Репозиторий справочника мест

import { getDb } from '../connection';
import { Facility, CreateFacilityInput } from '@core/types/facilities';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

export const facilitiesRepo = {
  async findAll(): Promise<Facility[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM facilities ORDER BY category, name'
    );
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      createdAt: r.created_at,
    }));
  },

  async create(input: CreateFacilityInput): Promise<Facility> {
    const db = getDb();
    const facility: Facility = {
      ...input,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.execute(
      'INSERT INTO facilities (id, name, category, created_at) VALUES (?, ?, ?, ?)',
      [facility.id, facility.name, facility.category, facility.createdAt]
    );
    return facility;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM facilities WHERE id = ?', [id]);
  },
};