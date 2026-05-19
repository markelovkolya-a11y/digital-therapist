// core/database/repositories/settings.repo.ts
// v1.0.0 — Репозиторий настроек (профиль, сниппеты)

import { getDb } from '../connection';
import { DoctorProfile, TextSnippet, CreateSnippetInput } from '@core/types/settings';
import { generateId } from '@core/utils/uid';
import { nowISO } from '@core/utils/date';

export const settingsRepo = {
  // ========== ПРОФИЛЬ ВРАЧА ==========
  async getDoctorProfile(): Promise<DoctorProfile> {
    const db = getDb();
    const rows = await db.select<{ value: string }[]>(
      "SELECT value FROM app_settings WHERE key = 'doctor_profile'"
    );
    if (rows.length > 0) {
      return JSON.parse(rows[0].value);
    }
    return { fullName: '', specialty: 'терапевт', institution: '', district: '' };
  },

  async saveDoctorProfile(profile: DoctorProfile): Promise<void> {
    const db = getDb();
    await db.execute(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('doctor_profile', ?, ?)",
      [JSON.stringify(profile), nowISO()]
    );
  },

  // ========== СНИППЕТЫ ==========
  async getAllSnippets(): Promise<TextSnippet[]> {
    const db = getDb();
    const rows = await db.select<any[]>(
      'SELECT * FROM text_snippets ORDER BY shortcut'
    );
    return rows.map(r => ({
      id: r.id,
      shortcut: r.shortcut,
      text: r.text,
      label: r.label,
      createdAt: r.created_at,
    }));
  },

  async createSnippet(input: CreateSnippetInput): Promise<TextSnippet> {
    const db = getDb();
    const snippet: TextSnippet = {
      ...input,
      id: generateId(),
      createdAt: nowISO(),
    };
    await db.execute(
      'INSERT INTO text_snippets (id, shortcut, text, label, created_at) VALUES (?, ?, ?, ?, ?)',
      [snippet.id, snippet.shortcut, snippet.text, snippet.label, snippet.createdAt]
    );
    return snippet;
  },

  async deleteSnippet(id: string): Promise<void> {
    const db = getDb();
    await db.execute('DELETE FROM text_snippets WHERE id = ?', [id]);
  },

  // ========== ЭКСПОРТ/ИМПОРТ ==========
  async exportTable(tableName: string): Promise<string> {
    const db = getDb();
    const rows = await db.select<any[]>(`SELECT * FROM ${tableName}`);
    return JSON.stringify(rows, null, 2);
  },

  async importTable(tableName: string, jsonData: string): Promise<number> {
    const db = getDb();
    const rows = JSON.parse(jsonData);
    let count = 0;
    
    for (const row of rows) {
      const columns = Object.keys(row).join(', ');
      const placeholders = Object.keys(row).map(() => '?').join(', ');
      const values = Object.values(row);
      
      try {
        await db.execute(
          `INSERT OR IGNORE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
          values
        );
        count++;
      } catch (e) {
        // Пропускаем дубликаты
      }
    }
    return count;
  },
};