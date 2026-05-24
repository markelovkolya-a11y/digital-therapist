// core/database/repositories/symptomGuides.repo.ts
// v1.0.0 — Репозиторий симптом-помощника

import { getDb } from '../connection';
import { SymptomGuide, CreateSymptomGuideInput } from '@core/types/symptomGuides';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

function rowToGuide(row: any): SymptomGuide {
  return {
    id: row.id,
    name: row.name,
    nonDrug: JSON.parse(row.non_drug || '[]'),
    medications: JSON.parse(row.medications || '[]'),
    createdAt: row.created_at,
  };
}

export const symptomGuidesRepo = {
  async findAll(): Promise<SymptomGuide[]> {
    const db = getDb();
    const rows: any[] = await db.select(
      'SELECT * FROM symptom_guides ORDER BY name'
    );
    return rows.map(rowToGuide);
  },

  async create(input: CreateSymptomGuideInput): Promise<SymptomGuide> {
    const db = getDb();
    const guide: SymptomGuide = {
      ...input,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.execute(
      'INSERT INTO symptom_guides (id, name, non_drug, medications, created_at) VALUES (?, ?, ?, ?, ?)',
      [guide.id, guide.name, JSON.stringify(guide.nonDrug), JSON.stringify(guide.medications), guide.createdAt]
    );
    return guide;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM symptom_guides WHERE id = ?', [id]);
  },
};