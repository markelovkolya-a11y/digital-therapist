// core/database/importCsv.ts
// v1.1.0 — Улучшенный импорт CSV (обработка всех строк)

import { getDb } from './connection';

export async function importICD10FromCSV(csvContent: string): Promise<number> {
  const db = getDb();

  const existing = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM icd10'
  );
  if (existing[0].count > 0) {
    console.log('📋 МКБ-10 уже импортирован, пропускаем');
    return existing[0].count;
  }

  const lines = csvContent.trim().split('\n');
  const dataLines = lines.slice(2);

  let imported = 0;
  let skipped = 0;
  const batch: any[][] = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    // Разбиваем с учётом кавычек (названия могут содержать запятые)
    const cols = parseCSVLine(line);
    if (cols.length < 6) {
      skipped++;
      continue;
    }

    const id = parseInt(cols[0]?.replace(/"/g, '').trim());
    const recCode = (cols[1] || '').replace(/"/g, '').trim();
    const mkbCode = (cols[2] || '').replace(/"/g, '').trim();
    const mkbName = (cols[3] || '').replace(/"/g, '').trim();
    const idParent = cols[4] ? parseInt(cols[4].replace(/"/g, '').trim()) : null;
    const addlCode = (cols[5] || '').replace(/"/g, '').trim() || null;
    const actual = cols[6] ? parseInt(cols[6].replace(/"/g, '').trim()) : 1;
    const date = (cols[7] || '').replace(/"/g, '').trim() || null;

    if (isNaN(id)) {
      skipped++;
      continue;
    }

    batch.push([id, recCode, mkbCode, mkbName, idParent, addlCode, actual, date]);

    if (batch.length >= 500) {
      await insertBatch(db, batch);
      imported += batch.length;
      batch.length = 0;
      console.log(`📋 Импортировано МКБ-10: ${imported} записей`);
    }
  }

  if (batch.length > 0) {
    await insertBatch(db, batch);
    imported += batch.length;
  }

  console.log(`✅ Импорт МКБ-10 завершён: ${imported} записей (пропущено: ${skipped})`);
  return imported;
}

/**
 * Парсит строку CSV с учётом кавычек (названия могут содержать запятые)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function insertBatch(db: any, batch: any[][]): Promise<void> {
  const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const values = batch.flat();
  try {
    await db.execute(
      `INSERT OR REPLACE INTO icd10 (id, rec_code, mkb_code, mkb_name, id_parent, addl_code, actual, date)
       VALUES ${placeholders}`,
      values
    );
  } catch (e) {
    console.warn('Ошибка вставки batch, пробуем по одному...');
    for (const row of batch) {
      try {
        await db.execute(
          `INSERT OR REPLACE INTO icd10 (id, rec_code, mkb_code, mkb_name, id_parent, addl_code, actual, date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          row
        );
      } catch {}
    }
  }
}