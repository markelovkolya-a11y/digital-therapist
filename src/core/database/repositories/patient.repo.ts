// core/database/repositories/patient.repo.ts
// v1.0.0 — Репозиторий пациентов

import { getDb } from '../connection';
import { Patient, CreatePatientInput } from '@core/types/patient';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

/**
 * Преобразует строку из БД в объект Patient
 */
function rowToPatient(row: any): Patient {
  return {
    id: row.id,
    emiasCode: row.emias_code,
    lastName: row.last_name,
    firstName: row.first_name,
    middleName: row.middle_name || undefined,
    birthDate: row.birth_date,
    gender: row.gender,
    bloodGroup: row.blood_group || undefined,
    rhFactor: row.rh_factor || undefined,
    isArchived: Boolean(row.is_archived),
    isDeceased: Boolean(row.is_deceased),
    createdAt: row.created_at,
  };
}

export const patientRepo = {
  /**
   * Получить всех активных пациентов
   */
  async findAll(): Promise<Patient[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      `SELECT * FROM patients WHERE is_archived = 0 AND is_deceased = 0 
       ORDER BY created_at DESC`
    );
    return rows.map(rowToPatient);
  },

  /**
   * Получить всех пациентов, включая архивных
   */
  async findAllWithArchive(): Promise<Patient[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM patients ORDER BY created_at DESC'
    );
    return rows.map(rowToPatient);
  },

  /**
   * Найти пациента по ID
   */
  async findById(id: string): Promise<Patient | null> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM patients WHERE id = ?', [id]
    );
    return rows.length > 0 ? rowToPatient(rows[0]) : null;
  },

  /**
   * Найти пациента по коду ЕМИАС
   */
  async findByEmiasCode(code: string): Promise<Patient | null> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM patients WHERE emias_code = ?', [code]
    );
    return rows.length > 0 ? rowToPatient(rows[0]) : null;
  },

  /**
   * Поиск пациентов по подстроке (код ЕМИАС или фамилия)
   */
  async search(query: string): Promise<Patient[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      `SELECT * FROM patients 
       WHERE (emias_code LIKE ? OR last_name LIKE ? OR first_name LIKE ?)
       AND is_archived = 0 AND is_deceased = 0
       ORDER BY last_name, first_name
       LIMIT 20`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return rows.map(rowToPatient);
  },

  /**
   * Создать нового пациента
   */
  async create(input: CreatePatientInput): Promise<Patient> {
    const db = getDb();
    const patient: Patient = {
      ...input,
      id: generateId(),
      isArchived: false,
      isDeceased: false,
      createdAt: nowISO(),
    };

    await db.execute(
      `INSERT INTO patients (id, emias_code, last_name, first_name, middle_name,
       birth_date, gender, blood_group, rh_factor, is_archived, is_deceased, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.id,
        patient.emiasCode,
        patient.lastName,
        patient.firstName,
        patient.middleName || null,
        patient.birthDate,
        patient.gender,
        patient.bloodGroup || null,
        patient.rhFactor || null,
        0,
        0,
        patient.createdAt,
      ]
    );

    return patient;
  },

  /**
   * Обновить данные пациента
   */
  async update(id: string, updates: Partial<Patient>): Promise<Patient | null> {
    const db = getDb();
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };

    await db.execute(
      `UPDATE patients SET 
       emias_code = ?, last_name = ?, first_name = ?, middle_name = ?,
       birth_date = ?, gender = ?, blood_group = ?, rh_factor = ?,
       is_archived = ?, is_deceased = ?
       WHERE id = ?`,
      [
        updated.emiasCode,
        updated.lastName,
        updated.firstName,
        updated.middleName || null,
        updated.birthDate,
        updated.gender,
        updated.bloodGroup || null,
        updated.rhFactor || null,
        updated.isArchived ? 1 : 0,
        updated.isDeceased ? 1 : 0,
        id,
      ]
    );

    return updated;
  },

  /**
   * Архивировать пациента
   */
  async archive(id: string): Promise<void> {
    const db = getDb();
    await db.execute('UPDATE patients SET is_archived = 1 WHERE id = ?', [id]);
  },

  /**
   * Восстановить из архива
   */
  async restore(id: string): Promise<void> {
    const db = getDb();
    await db.execute('UPDATE patients SET is_archived = 0 WHERE id = ?', [id]);
  },

  /**
   * Удалить пациента (hard delete)
   */
  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM patients WHERE id = ?', [id]);
  },
};