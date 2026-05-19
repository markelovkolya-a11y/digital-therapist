// core/utils/uid.ts
// v1.0.0 — Генерация уникальных идентификаторов

/**
 * Генерирует UUID v4 через Crypto API.
 * Не требует внешних зависимостей.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Проверяет, является ли строка валидным UUID
 */
export function isValidId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}