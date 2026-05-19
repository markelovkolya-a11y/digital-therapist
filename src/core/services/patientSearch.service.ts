// core/services/patientSearch.service.ts
// v1.0.0 — Поиск пациентов по кодам МКБ через события

import { getDb } from '@core/database/connection';
import { Patient } from '@core/types/patient';

export interface ChronicFilter {
  label: string;
  codes: string[];
}

export const CHRONIC_FILTERS: ChronicFilter[] = [
  { label: 'Гипертоническая болезнь', codes: ['I10', 'I11'] },
  { label: 'ИБС', codes: ['I20', 'I25'] },
  { label: 'Фибрилляция предсердий', codes: ['I48'] },
  { label: 'Сахарный диабет', codes: ['E10', 'E11'] },
  { label: 'ОНМК/инсульт', codes: ['I63', 'I64'] },
  { label: 'Бронхиальная астма', codes: ['J45'] },
  { label: 'ХОБЛ', codes: ['J44'] },
  { label: 'Онкология', codes: ['C'] },
];

export const patientSearchService = {
  /**
   * Поиск пациентов с определёнными кодами МКБ
   */
  async findByDiagnosis(codes: string[]): Promise<Patient[]> {
    if (codes.length === 0) return [];
    
    const db = getDb();
    
    // Строим условия для каждого кода
    const conditions = codes.map(() => 
      `EXISTS (SELECT 1 FROM events e WHERE e.patient_id = p.id AND e.type = 'diagnosis_established' AND e.parameters_json LIKE ?)`
    );
    
    const params = codes.map(code => `%"key":"diagnosis_code","value":"${code}%`);
    
    const sql = `
      SELECT p.* FROM patients p
      WHERE p.is_archived = 0 AND p.is_deceased = 0
      AND (${conditions.join(' OR ')})
      ORDER BY p.last_name, p.first_name
    `;
    
    const rows = await db.select<any[]>(sql, params);
    
    return rows.map(r => ({
      id: r.id,
      emiasCode: r.emias_code,
      lastName: r.last_name,
      firstName: r.first_name,
      middleName: r.middle_name || undefined,
      birthDate: r.birth_date,
      gender: r.gender,
      bloodGroup: r.blood_group || undefined,
      rhFactor: r.rh_factor || undefined,
      isArchived: Boolean(r.is_archived),
      isDeceased: Boolean(r.is_deceased),
      lastVisitDate: r.last_visit_date || null,
      createdAt: r.created_at,
    }));
  },

  /**
   * Возвращает коды МКБ для выбранного фильтра ХНИЗ
   */
  getCodesForFilter(filterLabel: string): string[] {
    const filter = CHRONIC_FILTERS.find(f => f.label === filterLabel);
    return filter?.codes || [];
  },
};