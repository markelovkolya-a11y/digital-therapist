// core/database/repositories/medications.repo.ts
// v1.1.0 — Дозировки как строки, поддержка старого формата

import { getDb } from '../connection';
import { Medication, MedicationTradeName, MedicationDosage, CreateMedicationInput, MedicationSearchResult } from '@core/types/medications';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

function rowToMedication(row: any): Medication {
  return {
    id: row.id,
    inn: row.inn,
    category: row.category,
    tradeNames: [],
    dosages: [],
    createdAt: row.created_at,
  };
}

/**
 * Парсит значение дозировки из БД.
 * Поддерживает старый формат (JSON-объект) и новый (строка).
 */
function parseDosageValue(raw: string): string {
  if (!raw) return '';
  // Пробуем распарсить как JSON (старый формат: {"value":"10 мг","frequencies":[...]})
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === 'object' && obj.value) {
      return obj.value;
    }
    return raw;
  } catch {
    // Не JSON — значит уже строка (новый формат)
    return raw;
  }
}

export const medicationsRepo = {
  async search(query: string, limit = 10): Promise<MedicationSearchResult[]> {
    const db = getDb();
    const q = query.toLowerCase();
    
    const allMeds = await db.select<any[]>('SELECT * FROM medications');
    const results: MedicationSearchResult[] = [];
    const seenIds = new Set<string>();

    for (const row of allMeds) {
      if (row.inn.toLowerCase().includes(q)) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          const med = await this.findById(row.id);
          if (med) results.push({ medication: med, matchedINN: med.inn });
        }
      }
    }

    const allTrades = await db.select<any[]>(
      `SELECT m.*, t.name as trade_name
       FROM medications m
       JOIN medication_trade_names t ON m.id = t.medication_id`
    );
    
    for (const row of allTrades) {
      if (row.trade_name.toLowerCase().includes(q)) {
        if (!seenIds.has(row.id) && results.length < limit) {
          seenIds.add(row.id);
          const med = await this.findById(row.id);
          if (med) {
            results.push({ medication: med, matchedTradeName: row.trade_name, matchedINN: med.inn });
          }
        }
      }
    }

    return results.slice(0, limit);
  },

  async findById(id: string): Promise<Medication | null> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM medications WHERE id = ?', [id]
    );
    if (rows.length === 0) return null;

    const med = rowToMedication(rows[0]);

    const dosages = await db.select<any[]>(
      'SELECT * FROM medication_dosages WHERE medication_id = ? ORDER BY is_default DESC',
      [id]
    );
    med.dosages = dosages.map(d => ({
      id: d.id,
      medicationId: d.medication_id,
      value: parseDosageValue(d.value),
      isDefault: Boolean(d.is_default),
      createdAt: d.created_at,
    }));

    const trades = await db.select<any[]>(
      'SELECT * FROM medication_trade_names WHERE medication_id = ?',
      [id]
    );
    med.tradeNames = trades.map(t => ({
      id: t.id,
      medicationId: t.medication_id,
      name: t.name,
      createdAt: t.created_at,
    }));

    return med;
  },

  async findAll(): Promise<Medication[]> {
    const db = getDb();
    const rows = await db.select<any[]>('SELECT * FROM medications ORDER BY inn');
    const meds: Medication[] = [];
    for (const row of rows) {
      const med = rowToMedication(row);
      
      const dosages = await db.select<any[]>(
        'SELECT * FROM medication_dosages WHERE medication_id = ? ORDER BY is_default DESC',
        [row.id]
      );
      med.dosages = dosages.map(d => ({
        id: d.id,
        medicationId: d.medication_id,
        value: parseDosageValue(d.value),
        isDefault: Boolean(d.is_default),
        createdAt: d.created_at,
      }));

      const trades = await db.select<any[]>(
        'SELECT * FROM medication_trade_names WHERE medication_id = ?',
        [row.id]
      );
      med.tradeNames = trades.map(t => ({
        id: t.id,
        medicationId: t.medication_id,
        name: t.name,
        createdAt: t.created_at,
      }));

      meds.push(med);
    }
    return meds;
  },

  async create(input: CreateMedicationInput): Promise<Medication> {
    const db = getDb();
    const medId = generateId();
    const now = nowISO();

    await db.execute(
      'INSERT OR IGNORE INTO medications (id, inn, category, created_at) VALUES (?, ?, ?, ?)',
      [medId, input.inn, input.category, now]
    );

    for (let i = 0; i < input.dosages.length; i++) {
      await db.execute(
        'INSERT INTO medication_dosages (id, medication_id, value, frequencies, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [generateId(), medId, input.dosages[i], '[]', i === 0 ? 1 : 0, now]
      );
    }

    for (const name of input.tradeNames) {
      await db.execute(
        'INSERT OR IGNORE INTO medication_trade_names (id, medication_id, name, created_at) VALUES (?, ?, ?, ?)',
        [generateId(), medId, name, now]
      );
    }

    return (await this.findById(medId))!;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM medications WHERE id = ?', [id]);
  },
};