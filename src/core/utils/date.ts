// core/utils/date.ts
// v1.0.0 — Утилиты для работы с датами и временем

/**
 * Возвращает текущую дату-время в ISO 8601
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Возвращает текущую дату в формате YYYY-MM-DD
 */
export function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Форматирует дату в российский формат (ДД.ММ.ГГГГ)
 */
export function formatDateRu(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU');
  } catch {
    return '—';
  }
}

/**
 * Форматирует дату-время в российский формат (ДД.ММ.ГГГГ ЧЧ:ММ)
 */
export function formatDateTimeRu(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

/**
 * Конвертирует Date в строку YYYY-MM-DD для input[type="date"]
 */
export function toDateInputValue(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Добавляет N дней к дате
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

/**
 * Вычисляет возраст по дате рождения
 */
export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Проверяет, просрочена ли дата относительно сегодня
 */
export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr < todayString();
}

/**
 * Проверяет, находится ли дата в пределах N дней от сегодня
 */
export function isWithinDays(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.abs(target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= days;
}

/**
 * Возвращает правильное склонение для слова "год"
 */
export function getAgeSuffix(age: number): string {
  const lastDigit = age % 10;
  const lastTwo = age % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'лет';
  if (lastDigit === 1) return 'год';
  if (lastDigit >= 2 && lastDigit <= 4) return 'года';
  return 'лет';
}