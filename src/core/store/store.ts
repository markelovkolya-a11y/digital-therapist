// core/store/store.ts
// v1.1.0 — Корневое хранилище

import { create } from 'zustand';
import { AppStore } from './types';
import { createPatientSlice } from './slices/patientSlice';
import { createUISlice } from './slices/uiSlice';
import { createVisitSlice } from './slices/visitSlice';

export const useAppStore = create<AppStore>()((...args) => ({
  ...createUISlice(...args),
  ...createPatientSlice(...args),
  ...createVisitSlice(...args),

  // Заглушки для нереализованных слайсов
  events: [],
  patientTimeline: [],
  loadPatientTimeline: async () => {},
  addEvent: async () => { throw new Error('Not implemented'); },
  addEventsBatch: async () => { throw new Error('Not implemented'); },

  paramCatalog: [],
  loadParamCatalog: async () => {},
  addCustomParam: async () => { throw new Error('Not implemented'); },

  currentReport: null,
  warnings: [],
  isLoadingReport: false,
  generateReport: async () => {},
  dismissWarning: () => {},
  clearReport: () => {},
}));