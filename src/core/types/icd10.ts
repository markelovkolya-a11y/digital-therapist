// core/types/icd10.ts
// v1.0.0 — Типы для справочника МКБ-10

/**
 * Запись справочника МКБ-10
 */
export interface ICD10Record {
  id: number;
  recCode: string;           // REC_CODE — поле сортировки
  code: string;               // MKB_CODE — код МКБ (I11.0)
  name: string;               // MKB_NAME — название
  parentId: number | null;    // ID_PARENT — родительская запись
  addlCode: string | null;    // ADDL_CODE — дополнительный код
  actual: boolean;            // ACTUAL — признак актуальности
  date: string | null;        // DATE — дата изменения
}

/**
 * Результат поиска по МКБ-10
 */
export interface ICD10SearchResult {
  code: string;
  name: string;
  isCategory: boolean;        // Это группа (I10-I15) или конечный код (I11.0)
}