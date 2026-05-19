// core/database/importCsv.ts
// v1.0.0 — Импорт CSV-файлов в БД

import { getDb } from './connection';

/**
 * Импортирует МКБ-10 из CSV-строки
 */
export async function importICD10FromCSV(csvContent: string): Promise<number> {
  const db = getDb();

  // Проверяем, есть ли уже данные
  const existing = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM icd10'
  );
  if (existing[0].count > 0) {
    console.log('📋 МКБ-10 уже импортирован, пропускаем');
    return existing[0].count;
  }

  const lines = csvContent.trim().split('\n');
  // Пропускаем заголовок (первые 2 строки — название колонок и описание)
  const dataLines = lines.slice(2);

  let imported = 0;
  const batch: any[][] = [];

  for (const line of dataLines) {
    const cols = line.split(',');
    if (cols.length < 8) continue;

    const [
      id, recCode, mkbCode, mkbName, idParent, addlCode, actual, date
    ] = cols.map(c => c.replace(/^"|"$/g, '').trim());

    batch.push([
      parseInt(id), recCode, mkbCode, mkbName,
      idParent ? parseInt(idParent) : null,
      addlCode || null,
      actual === '1' ? 1 : 0,
      date || null,
    ]);

    // Вставляем пачками по 500
    if (batch.length >= 500) {
      await insertBatch(db, batch);
      imported += batch.length;
      batch.length = 0;
      console.log(`📋 Импортировано МКБ-10: ${imported} записей`);
    }
  }

  // Оставшиеся
  if (batch.length > 0) {
    await insertBatch(db, batch);
    imported += batch.length;
  }

  console.log(`✅ Импорт МКБ-10 завершён: ${imported} записей`);
  return imported;
}

async function insertBatch(db: any, batch: any[][]): Promise<void> {
  const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = batch.flat();
  await db.execute(
    `INSERT OR IGNORE INTO icd10 (id, rec_code, mkb_code, mkb_name, id_parent, addl_code, actual, date)
     VALUES ${placeholders}`,
    values
  );
}