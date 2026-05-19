// core/store/slices/patientSlice.ts
// v1.0.0 — Слайс пациентов с проверкой готовности БД

import { StateCreator } from 'zustand';
import { AppStore, PatientSlice } from '../types';
import { patientRepo } from '@core/database/repositories';
import { Patient, CreatePatientInput } from '@core/types/patient';
import { isDbReady } from '@core/database';

export const createPatientSlice: StateCreator<AppStore, [], [], PatientSlice> = (set, get) => ({
  patients: [],
  selectedPatientId: null,
  isLoading: false,

  loadPatients: async () => {
    if (!isDbReady()) {
      console.error('❌ БД не готова, loadPatients отменён');
      return;
    }
    set({ isLoading: true });
    try {
      const patients = await patientRepo.findAll();
      set({ patients, isLoading: false });
    } catch (error) {
      console.error('❌ Ошибка загрузки пациентов:', error);
      set({ isLoading: false });
    }
  },

  selectPatient: (id) => {
    set({ selectedPatientId: id });
  },

  createPatient: async (input) => {
    if (!isDbReady()) {
      console.error('❌ БД не готова, createPatient отменён');
      throw new Error('База данных не инициализирована');
    }
    console.log('📝 Создание пациента:', input.emiasCode);
    const patient = await patientRepo.create(input);
    console.log('✅ Пациент создан:', patient.id);
    set(state => ({
      patients: [patient, ...state.patients],
    }));
    return patient;
  },

  updatePatient: async (id, updates) => {
    if (!isDbReady()) return;
    const updated = await patientRepo.update(id, updates);
    if (updated) {
      set(state => ({
        patients: state.patients.map(p => (p.id === id ? updated : p)),
      }));
    }
  },

  archivePatient: async (id) => {
    if (!isDbReady()) return;
    await patientRepo.archive(id);
    set(state => ({
      patients: state.patients.map(p =>
        p.id === id ? { ...p, isArchived: true } : p
      ),
      selectedPatientId: state.selectedPatientId === id ? null : state.selectedPatientId,
    }));
  },

  restorePatient: async (id) => {
    if (!isDbReady()) return;
    await patientRepo.restore(id);
    set(state => ({
      patients: state.patients.map(p =>
        p.id === id ? { ...p, isArchived: false } : p
      ),
    }));
  },

  deletePatient: async (id) => {
    if (!isDbReady()) return;
    await patientRepo.delete(id);
    set(state => ({
      patients: state.patients.filter(p => p.id !== id),
      selectedPatientId: state.selectedPatientId === id ? null : state.selectedPatientId,
    }));
  },
});