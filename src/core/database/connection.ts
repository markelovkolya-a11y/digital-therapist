// core/database/connection.ts
// v1.0.1 — БД рядом с exe (для флешки)

import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;
let dbInitialized = false;
let isTauriEnvironment = false;

function checkTauri(): boolean {
  try {
    return !!(window as any).__TAURI_INTERNALS__;
  } catch {
    return false;
  }
}

export function getDb(): Database {
  if (!db || !dbInitialized) {
    throw new Error('База данных не инициализирована. Вызовите initDb() перед использованием.');
  }
  return db;
}

export function isDbReady(): boolean {
  return dbInitialized && db !== null;
}

export function isTauri(): boolean {
  return isTauriEnvironment;
}

export async function initDb(): Promise<Database> {
  if (db && dbInitialized) return db;

  isTauriEnvironment = checkTauri();

  if (!isTauriEnvironment) {
    console.warn('⚠️ Запущено вне Tauri. БД будет в памяти.');
    db = await Database.load('sqlite::memory:');
    await db.execute('PRAGMA foreign_keys = ON');
    dbInitialized = true;
    console.log('✅ БД in-memory готова');
    return db;
  }

  try {
    // БД в папке с exe (на флешке — будет на флешке)
    console.log('📂 БД: digital_therapist.db (рядом с программой)');
    db = await Database.load('sqlite:digital_therapist.db');
    await db.execute('PRAGMA foreign_keys = ON');
    await db.execute('PRAGMA journal_mode = WAL');
    await db.execute('PRAGMA synchronous = NORMAL');

    dbInitialized = true;
    console.log('✅ БД подключена: digital_therapist.db');
    return db;
  } catch (error) {
    console.error('❌ Ошибка подключения к БД:', error);

    // Фоллбэк
    try {
      console.log('🔄 Пробую фоллбэк...');
      db = await Database.load('sqlite:digital_therapist.db');
      await db.execute('PRAGMA foreign_keys = ON');
      dbInitialized = true;
      console.log('✅ БД подключена (фоллбэк)');
      return db;
    } catch (fallbackError) {
      console.error('❌ Фатальная ошибка БД:', fallbackError);
      throw fallbackError;
    }
  }
}

export async function closeDb(): Promise<void> {
  if (db) {
    try {
      await db.close();
    } catch (error) {
      console.error('Ошибка при закрытии БД:', error);
    }
    db = null;
    dbInitialized = false;
  }
}