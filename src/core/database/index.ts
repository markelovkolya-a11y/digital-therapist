// core/database/index.ts
// v1.0.0 — Экспорт слоя базы данных

export { initDb, getDb, isDbReady, closeDb, isTauri } from './connection';
export { runMigrations } from './migrations';
export { patientRepo, eventRepo } from './repositories';