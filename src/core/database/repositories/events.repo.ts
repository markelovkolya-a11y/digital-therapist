// core/database/repositories/events.repo.ts
// v1.0.0 — Репозиторий клинических событий

import { getDb } from '../connection';
import { ClinicalEvent, CreateEventInput, EventFilter, EventParameter } from '@core/types/events';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

function rowToEvent(row: any): ClinicalEvent {
  return {
    id: row.id,
    patientId: row.patient_id,
    type: row.type,
    source: row.source,
    timestamp: row.timestamp,
    recordedAt: row.recorded_at,
    title: row.title,
    parameters: JSON.parse(row.parameters_json || '[]'),
    context: row.context || undefined,
    visitId: row.visit_id || undefined,
    problemId: row.problem_id || undefined,
  };
}

export const eventRepo = {
  /**
   * Получить события пациента с фильтрацией
   */
  async findByFilter(filter: EventFilter): Promise<ClinicalEvent[]> {
    const db = getDb();
    let sql = 'SELECT * FROM events WHERE patient_id = ?';
    const params: any[] = [filter.patientId];

    if (filter.types && filter.types.length > 0) {
      sql += ` AND type IN (${filter.types.map(() => '?').join(',')})`;
      params.push(...filter.types);
    }

    if (filter.sources && filter.sources.length > 0) {
      sql += ` AND source IN (${filter.sources.map(() => '?').join(',')})`;
      params.push(...filter.sources);
    }

    if (filter.from) {
      sql += ' AND timestamp >= ?';
      params.push(filter.from);
    }

    if (filter.to) {
      sql += ' AND timestamp <= ?';
      params.push(filter.to);
    }

    sql += ' ORDER BY timestamp DESC';

    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter.offset) {
      sql += ' OFFSET ?';
      params.push(filter.offset);
    }

    const rows = await db.select<any[]>(sql, params);
    return rows.map(rowToEvent);
  },

  /**
   * Получить все события пациента
   */
  async findByPatient(patientId: string, limit = 100): Promise<ClinicalEvent[]> {
    return this.findByFilter({ patientId, limit });
  },

  /**
   * Получить события определённого типа
   */
  async findByType(patientId: string, type: string, limit = 50): Promise<ClinicalEvent[]> {
    return this.findByFilter({ patientId, types: [type as any], limit });
  },

  /**
   * Получить последние события по типам (для контекстной колонки)
   */
  async findLatestByTypes(patientId: string, types: string[], limit = 5): Promise<ClinicalEvent[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      `SELECT * FROM events 
       WHERE patient_id = ? AND type IN (${types.map(() => '?').join(',')})
       ORDER BY timestamp DESC
       LIMIT ?`,
      [patientId, ...types, limit]
    );
    return rows.map(rowToEvent);
  },

  /**
   * Найти событие по ID
   */
  async findById(id: string): Promise<ClinicalEvent | null> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM events WHERE id = ?', [id]
    );
    return rows.length > 0 ? rowToEvent(rows[0]) : null;
  },

  /**
   * Создать новое событие
   */
  async create(input: CreateEventInput): Promise<ClinicalEvent> {
    const db = getDb();
    const event: ClinicalEvent = {
      ...input,
      id: generateId(),
      recordedAt: nowISO(),
    };

    await db.execute(
      `INSERT INTO events (id, patient_id, type, source, timestamp, recorded_at, 
       title, parameters_json, context, visit_id, problem_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.patientId,
        event.type,
        event.source,
        event.timestamp,
        event.recordedAt,
        event.title,
        JSON.stringify(event.parameters),
        event.context || null,
        event.visitId || null,
        event.problemId || null,
      ]
    );

    return event;
  },

  /**
   * Пакетное создание событий (для импорта из ЕМИАС)
   */
  async createBatch(inputs: CreateEventInput[]): Promise<ClinicalEvent[]> {
    const events: ClinicalEvent[] = inputs.map(input => ({
      ...input,
      id: generateId(),
      recordedAt: nowISO(),
    }));

    const db = getDb();
    for (const event of events) {
      await db.execute(
        `INSERT INTO events (id, patient_id, type, source, timestamp, recorded_at,
         title, parameters_json, context, visit_id, problem_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id, event.patientId, event.type, event.source,
          event.timestamp, event.recordedAt, event.title,
          JSON.stringify(event.parameters), event.context || null,
          event.visitId || null, event.problemId || null,
        ]
      );
    }

    return events;
  },

  /**
   * Получить последние параметры определённого типа (для автозаполнения)
   */
  async findLatestParameterValues(
    patientId: string,
    paramKeys: string[]
  ): Promise<EventParameter[]> {
    const db = getDb();
    // Берём последние 50 событий и ищем параметры в них
    const rows = await db.select<any[]>(
      `SELECT parameters_json, timestamp FROM events 
       WHERE patient_id = ?
       ORDER BY timestamp DESC
       LIMIT 50`,
      [patientId]
    );

    const foundParams: Map<string, EventParameter> = new Map();

    for (const row of rows) {
      const params: EventParameter[] = JSON.parse(row.parameters_json || '[]');
      for (const param of params) {
        if (paramKeys.includes(param.key) && !foundParams.has(param.key)) {
          foundParams.set(param.key, param);
        }
      }
      // Если нашли все — выходим
      if (foundParams.size === paramKeys.length) break;
    }

    return Array.from(foundParams.values());
  },
};