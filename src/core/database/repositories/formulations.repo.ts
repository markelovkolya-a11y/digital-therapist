// core/database/repositories/formulations.repo.ts
// v1.0.0 — Репозиторий клинических формулировок

import { getDb } from '../connection';
import { ClinicalFormulation, CreateFormulationInput } from '@core/types/formulations';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

function rowToFormulation(row: any): ClinicalFormulation {
  return {
    id: row.id,
    icd10Code: row.icd10_code,
    text: row.text,
    createdAt: row.created_at,
  };
}

export const formulationsRepo = {
  /**
   * Найти формулировки по коду МКБ
   */
  async findByIcd10Code(code: string): Promise<ClinicalFormulation[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM clinical_formulations WHERE icd10_code = ? ORDER BY created_at DESC',
      [code]
    );
    return rows.map(rowToFormulation);
  },

  /**
   * Получить все формулировки
   */
  async findAll(): Promise<ClinicalFormulation[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM clinical_formulations ORDER BY icd10_code, created_at DESC'
    );
    return rows.map(rowToFormulation);
  },

  /**
   * Создать формулировку
   */
  async create(input: CreateFormulationInput): Promise<ClinicalFormulation> {
    const db = getDb();
    const formulation: ClinicalFormulation = {
      ...input,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.execute(
      'INSERT INTO clinical_formulations (id, icd10_code, text, created_at) VALUES (?, ?, ?, ?)',
      [formulation.id, formulation.icd10Code, formulation.text, formulation.createdAt]
    );
    return formulation;
  },

  /**
   * Удалить формулировку
   */
  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM clinical_formulations WHERE id = ?', [id]);
  },

  /**
   * Автосохранение: если формулировка новая — сохранить
   */
  async saveIfNew(icd10Code: string, text: string): Promise<void> {
    if (!text.trim()) return;
    const existing = await this.findByIcd10Code(icd10Code);
    const exists = existing.some(f => f.text.toLowerCase() === text.toLowerCase());
    if (!exists) {
      await this.create({ icd10Code, text });
      console.log(`📝 Сохранена новая формулировка для ${icd10Code}`);
    }
  },
};