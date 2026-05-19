// core/database/repositories/icd10.repo.ts
// v1.0.0 — Репозиторий справочника МКБ-10

import { getDb } from '../connection';
import { ICD10Record, ICD10SearchResult } from '@core/types/icd10';

function rowToRecord(row: any): ICD10Record {
  return {
    id: row.id,
    recCode: row.rec_code,
    code: row.mkb_code,
    name: row.mkb_name,
    parentId: row.id_parent || null,
    addlCode: row.addl_code || null,
    actual: row.actual === 1,
    date: row.date || null,
  };
}

export const icd10Repo = {
  /**
   * Поиск по коду или названию.
   * Возвращает только актуальные записи.
   */
  async search(query: string, limit = 20): Promise<ICD10SearchResult[]> {
    const db = getDb();
    const q = `%${query}%`;
    const rows = await db.select<any[]>(
      `SELECT mkb_code, mkb_name, id_parent
       FROM icd10
       WHERE actual = 1
         AND (mkb_code LIKE ? OR mkb_name LIKE ? COLLATE NOCASE)
       ORDER BY
         CASE WHEN mkb_code LIKE ? THEN 0 ELSE 1 END,
         length(mkb_code) ASC
       LIMIT ?`,
      [q, q, `${query}%`, limit]
    );
    return rows.map(r => ({
      code: r.mkb_code,
      name: r.mkb_name,
      isCategory: r.id_parent === null || r.id_parent === 0,
    }));
  },

  /**
   * Поиск только конечных кодов (не групп)
   */
  async searchCodes(query: string, limit = 20): Promise<ICD10SearchResult[]> {
    const db = getDb();
    const q = `%${query}%`;
    const rows = await db.select<any[]>(
      `SELECT mkb_code, mkb_name, id_parent
       FROM icd10
       WHERE actual = 1
         AND id_parent IS NOT NULL
         AND id_parent != 0
         AND (mkb_code LIKE ? OR mkb_name LIKE ? COLLATE NOCASE)
       ORDER BY length(mkb_code) ASC
       LIMIT ?`,
      [q, q, limit]
    );
    return rows.map(r => ({
      code: r.mkb_code,
      name: r.mkb_name,
      isCategory: false,
    }));
  },

  /**
   * Найти точный код
   */
  async findByCode(code: string): Promise<ICD10Record | null> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM icd10 WHERE mkb_code = ? AND actual = 1',
      [code]
    );
    return rows.length > 0 ? rowToRecord(rows[0]) : null;
  },

  /**
   * Получить количество записей (для проверки импорта)
   */
  async count(): Promise<number> {
    const db = getDb();
    const result = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM icd10 WHERE actual = 1'
    );
    return result[0]?.count || 0;
  },
};