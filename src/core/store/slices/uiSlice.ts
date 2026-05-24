// core/store/slices/uiSlice.ts
// v1.3.0 — Добавлен импорт жалоб при первом запуске

import { StateCreator } from 'zustand';
import { AppStore, UISlice, Screen } from '../types';
import { initDb, runMigrations, isDbReady } from '@core/database';
import { patientRepo } from '@core/database/repositories';
import { settingsRepo } from '@core/database/repositories/settings.repo';
import { DEFAULT_SNIPPETS } from '@core/data/defaultSnippets';
import { icd10Repo } from '@core/database/repositories/icd10.repo';
import { importICD10FromCSV } from '@core/database/importCsv';
import { medicationsRepo } from '@core/database/repositories/medications.repo';
import { DEFAULT_MEDICATIONS } from '@core/data/defaultMedications';
import { complaintsRepo } from '@core/database/repositories/complaints.repo';
import { DEFAULT_COMPLAINTS } from '@core/data/defaultComplaints';
import { facilitiesRepo } from '@core/database/repositories/facilities.repo';
import { DEFAULT_FACILITIES } from '@core/data/defaultFacilities';
import { symptomGuidesRepo } from '@core/database/repositories/symptomGuides.repo';
import { DEFAULT_SYMPTOM_GUIDES } from '@core/data/defaultSymptomGuides';

export const createUISlice: StateCreator<AppStore, [], [], UISlice> = (set, get) => ({
  initialized: false,
  darkMode: false,
  sidebarOpen: true,
  activeScreen: 'dashboard',

  initialize: async () => {
    try {
      console.log('🔄 Инициализация БД...');
      await initDb();
      console.log('✅ БД подключена, статус:', isDbReady());

      console.log('🔄 Запуск миграций...');
      await runMigrations();
      console.log('✅ Миграции выполнены');

      // Импорт МКБ-10
      try {
        const icd10Count = await icd10Repo.count();
        if (icd10Count === 0) {
          console.log('📋 Первый запуск — импорт МКБ-10...');
          const response = await fetch('/mkb10.csv');
          const csvText = await response.text();
          const imported = await importICD10FromCSV(csvText);
          console.log(`✅ МКБ-10 импортирован: ${imported} записей`);
        } else {
          console.log(`📋 МКБ-10 уже загружен: ${icd10Count} записей`);
        }
      } catch (csvError) {
        console.warn('⚠️ Не удалось импортировать МКБ-10:', csvError);
      }

      // Импорт лекарств
      try {
        const meds = await medicationsRepo.findAll();
        console.log(`💊 Препаратов в БД: ${meds.length}`);
        if (meds.length === 0) {
          console.log('💊 Первый запуск — импорт лекарств...');
          for (const med of DEFAULT_MEDICATIONS) {
            try { await medicationsRepo.create(med); } catch (e) {}
          }
          console.log(`✅ Лекарств загружено: ${(await medicationsRepo.findAll()).length}`);
        }
      } catch (e) {
        console.warn('⚠️ Не удалось импортировать лекарства:', e);
      }

      // Импорт сниппетов
      try {
        const snippets = await settingsRepo.getAllSnippets();
        if (snippets.length === 0) {
          console.log('📝 Первый запуск — импорт сниппетов...');
          for (const s of DEFAULT_SNIPPETS) {
            try { await settingsRepo.createSnippet(s); } catch (e) {}
          }
          console.log(`✅ Сниппетов загружено: ${(await settingsRepo.getAllSnippets()).length}`);
        }
      } catch (e) {
        console.warn('⚠️ Не удалось импортировать сниппеты:', e);
      }

      // Импорт жалоб
      try {
        const complaints = await complaintsRepo.findAll();
        if (complaints.length === 0) {
          console.log('📝 Первый запуск — импорт жалоб...');
          for (const c of DEFAULT_COMPLAINTS) {
            try { await complaintsRepo.create(c); } catch (e) {}
          }
          console.log(`✅ Жалоб загружено: ${(await complaintsRepo.findAll()).length}`);
        }
      } catch (e) {
        console.warn('⚠️ Не удалось импортировать жалобы:', e);
      }

      try {
  const facilities = await facilitiesRepo.findAll();
  if (facilities.length === 0) {
    for (const f of DEFAULT_FACILITIES) {
      await facilitiesRepo.create(f);
    }
  }
} catch (e) {
  console.warn('⚠️ Не удалось импортировать места:', e);
}

try {
  const guides = await symptomGuidesRepo.findAll();
  if (guides.length === 0) {
    for (const g of DEFAULT_SYMPTOM_GUIDES) {
      await symptomGuidesRepo.create(g);
    }
  }
} catch (e) {
  console.warn('⚠️ Не удалось импортировать симптом-помощник:', e);
}

      set({ initialized: true });
      console.log('✅ UI инициализирован');

      console.log('🔄 Загрузка пациентов...');
      const patients = await patientRepo.findAll();
      console.log(`✅ Загружено пациентов: ${patients.length}`);

      set((state: any) => ({ ...state, patients, isLoading: false }));
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      set({ initialized: true });
    }
  },

  toggleDarkMode: () => {
    set(state => {
      const newDark = !state.darkMode;
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newDark ? 'dark' : 'light');
      }
      return { darkMode: newDark };
    });
  },

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  navigateTo: (screen) => set({ activeScreen: screen }),
});