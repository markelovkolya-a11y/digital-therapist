// core/database/migrations.ts
// v1.1.0 — Добавлена таблица waiting_items

import { getDb } from './connection';
import { ALL_CORE_PARAMS } from '@core/types/params';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

const LATEST_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    )
  `);

  const versionResult = await db.select<{ version: number }[]>(
    'SELECT version FROM schema_version'
  );
  const currentVersion = versionResult.length > 0 ? versionResult[0].version : 0;

  if (currentVersion < 1) {
    console.log('🔄 Миграция: v1 — Создание всех таблиц');
    await migrateV1(db);
  }

  await db.execute('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [LATEST_VERSION]);
  console.log('✅ Миграции завершены. Версия схемы:', LATEST_VERSION);
}

async function migrateV1(db: any): Promise<void> {
  // Текстовые сниппеты
  await db.execute(`
    CREATE TABLE IF NOT EXISTS text_snippets (
      id TEXT PRIMARY KEY,
      shortcut TEXT NOT NULL UNIQUE,
      text TEXT NOT NULL,
      label TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);

  // Справочник жалоб
  await db.execute(`
    CREATE TABLE IF NOT EXISTS complaint_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    )
  `);

    // Справочник мест
  await db.execute(`
    CREATE TABLE IF NOT EXISTS facilities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'other',
      created_at TEXT NOT NULL
    )
  `);

    await db.execute(`
    CREATE TABLE IF NOT EXISTS symptom_guides (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      non_drug TEXT NOT NULL DEFAULT '[]',
      medications TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    )
  `);

  // Пациенты
  await db.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      emias_code TEXT NOT NULL,
      last_name TEXT NOT NULL DEFAULT '',
      first_name TEXT NOT NULL DEFAULT '',
      middle_name TEXT DEFAULT '',
      birth_date TEXT NOT NULL,
      gender TEXT NOT NULL CHECK(gender IN ('male', 'female')),
      blood_group TEXT,
      rh_factor TEXT,
      is_archived INTEGER NOT NULL DEFAULT 0,
      is_deceased INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_patients_emias ON patients(emias_code)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name)');

  // Семейные связи
  await db.execute(`
    CREATE TABLE IF NOT EXISTS family_links (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      relative_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_family_patient ON family_links(patient_id)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_family_relative ON family_links(relative_id)');

  // События
  await db.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      parameters_json TEXT NOT NULL DEFAULT '[]',
      context TEXT,
      visit_id TEXT,
      problem_id TEXT
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_events_patient ON events(patient_id, timestamp DESC)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_events_type ON events(patient_id, type, timestamp DESC)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_events_visit ON events(visit_id)');

  // Онтологический словарь параметров
  await db.execute(`
    CREATE TABLE IF NOT EXISTS param_catalog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      short_name TEXT,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT '',
      meta_tags TEXT NOT NULL DEFAULT '[]',
      source TEXT NOT NULL CHECK(source IN ('core', 'user', 'system')),
      ref_range_json TEXT,
      default_value REAL,
      display_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_param_category ON param_catalog(category)');

  // МКБ-10
  await db.execute(`
    CREATE TABLE IF NOT EXISTS icd10 (
      id INTEGER PRIMARY KEY,
      rec_code TEXT NOT NULL,
      mkb_code TEXT NOT NULL,
      mkb_name TEXT NOT NULL,
      id_parent INTEGER,
      addl_code TEXT,
      actual INTEGER NOT NULL DEFAULT 1,
      date TEXT
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_icd10_code ON icd10(mkb_code)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_icd10_name ON icd10(mkb_name)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_icd10_parent ON icd10(id_parent)');

  // Клинические формулировки
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clinical_formulations (
      id TEXT PRIMARY KEY,
      icd10_code TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_formulations_code ON clinical_formulations(icd10_code)');

  // Лекарственные препараты
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      inn TEXT NOT NULL UNIQUE,
      category TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_medications_inn ON medications(inn)');

  // Дозировки препаратов
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medication_dosages (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      value TEXT NOT NULL,
      frequencies TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_dosages_med ON medication_dosages(medication_id)');

  // Торговые названия
  await db.execute(`
    CREATE TABLE IF NOT EXISTS medication_trade_names (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_trade_med ON medication_trade_names(medication_id)');

  // Заполняем встроенные параметры
  await seedCoreParams(db);

  // Визиты
  await db.execute(`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'treatment',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'completed', 'signed', 'corrected')),
      protocol_text TEXT,
      data_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id, date DESC)');

  // Проблемы
  await db.execute(`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      icd_code TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'monitoring', 'resolved')),
      started_at TEXT NOT NULL,
      resolved_at TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_problems_patient ON problems(patient_id, status)');

  // Лист ожидания
  await db.execute(`
    CREATE TABLE IF NOT EXISTS waiting_items (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      patient_code TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('консультация', 'обследование', 'ДС')),
      description TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'P2' CHECK(priority IN ('P0', 'P1', 'P2', 'P3', 'P4')),
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'ожидает' CHECK(status IN ('ожидает', 'записан', 'выполнен')),
      problem_id TEXT,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_waiting_patient ON waiting_items(patient_id, status)');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_waiting_priority ON waiting_items(priority, deadline)');

  // Настройки приложения
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Кэш прогнозов
  await db.execute(`
    CREATE TABLE IF NOT EXISTS prediction_cache (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      module_name TEXT NOT NULL,
      parameters_hash TEXT NOT NULL,
      result_json TEXT NOT NULL,
      calculated_at TEXT NOT NULL,
      valid_until TEXT,
      UNIQUE(patient_id, module_name)
    )
  `);
  await db.execute('CREATE INDEX IF NOT EXISTS idx_prediction_patient ON prediction_cache(patient_id)');
}

async function seedCoreParams(db: any): Promise<void> {
  const now = nowISO();
  for (const param of ALL_CORE_PARAMS) {
    await db.execute(
      `INSERT OR IGNORE INTO param_catalog 
       (id, name, short_name, category, unit, meta_tags, source, ref_range_json, default_value, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        param.id, param.name, param.shortName || null, param.category, param.unit,
        JSON.stringify(param.metaTags), param.source,
        param.refRange ? JSON.stringify(param.refRange) : null,
        param.defaultValue || null, param.order || 0, now,
      ]
    );
  }
}