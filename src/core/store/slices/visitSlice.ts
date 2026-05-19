// core/store/slices/visitSlice.ts
// v2.1.0 — Приоритеты в ExaminationPlan, без (get() as any)

import { StateCreator } from 'zustand';
import { AppStore, VisitSlice } from '../types';
import {
  VisitState, VitalSignsState, LifeHistoryState,
  ComplaintItem, AnamnesisState, SystemExamState,
  DiagnosisState, ExaminationPlanState, TreatmentState,
  FollowUpState, MedicationState,
} from '@core/types/visit';
import { eventRepo } from '@core/database/repositories';
import { waitingService } from '@core/services/waiting.service';
import { CreateEventInput } from '@core/types/events';
import { SYSTEM_EXAM_TEMPLATES } from '@core/data/examTemplates';
import { todayString, nowISO } from '@core/utils/date';

const DEFAULT_VITALS: VitalSignsState = {
  systolic: 120, diastolic: 80, heartRate: 70,
  respiratoryRate: 16, spo2: 98, temperature: 36.6,
  height: 0, weight: 0, glucose: undefined, creatinine: undefined,
};

const DEFAULT_LIFE_HISTORY: LifeHistoryState = {
  smoking: 'never', smokingDetails: '',
  alcohol: 'never', alcoholDetails: '',
  allergy: 'Аллергоанамнез не отягощён.',
  heredity: 'Наследственность не отягощена.',
  profession: '',
  additional: '',
};

const DEFAULT_SYSTEMS: SystemExamState[] = SYSTEM_EXAM_TEMPLATES.map(t => ({
  system: t.system,
  shortName: t.shortName,
  icon: t.icon,
  status: 'normal' as const,
  text: t.normText,
  isChanged: false,
}));

const DEFAULT_DIAGNOSIS: DiagnosisState = {
  primary: { code: '', name: '', isFirstTime: false },
  complications: [],
  concomitant: [],
  background: [],
};

const DEFAULT_EXAM_PLAN: ExaminationPlanState = {
  labTests: [],
  instrumental: [],
  consultations: [],
  priorities: {},
};

const DEFAULT_TREATMENT: TreatmentState = {
  nonDrug: [],
  nonDrugText: '',
  medications: [],
  basicTherapy: [],
};

const DEFAULT_FOLLOW_UP: FollowUpState = { date: '', reason: '' };

export const createVisitSlice: StateCreator<AppStore, [], [], VisitSlice> = (set, get) => ({
  currentVisit: null,

  initVisit: async (patientId) => {
    const allEvents = await eventRepo.findByPatient(patientId, 200);
    
    const previousParams = await eventRepo.findLatestParameterValues(patientId, [
      'systolic_bp', 'diastolic_bp', 'heart_rate', 'respiratory_rate',
      'spo2', 'temperature', 'height', 'weight',
    ]);

    const vitals: VitalSignsState = { ...DEFAULT_VITALS };
    for (const param of previousParams) {
      const val = Number(param.value);
      if (isNaN(val)) continue;
      switch (param.key) {
        case 'systolic_bp': vitals.systolic = val; break;
        case 'diastolic_bp': vitals.diastolic = val; break;
        case 'heart_rate': vitals.heartRate = val; break;
        case 'respiratory_rate': vitals.respiratoryRate = val; break;
        case 'spo2': vitals.spo2 = val; break;
        case 'temperature': vitals.temperature = val; break;
        case 'height': vitals.height = val; break;
        case 'weight': vitals.weight = val; break;
      }
    }

    let lifeHistory: LifeHistoryState = { ...DEFAULT_LIFE_HISTORY };
    const lastLifeHistory = allEvents
      .filter(e => e.type === 'life_history')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    
    if (lastLifeHistory) {
      try {
        const saved = JSON.parse(String(lastLifeHistory.parameters.find(p => p.key === 'life_history_json')?.value || '{}'));
        lifeHistory = { ...DEFAULT_LIFE_HISTORY, ...saved };
      } catch {}
    }

    const lastExam = allEvents
      .filter(e => e.type === 'physical_exam')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    
    let previousSystems: SystemExamState[] = [];
    let physicalExam: SystemExamState[] = DEFAULT_SYSTEMS.map(s => ({ ...s }));

    if (lastExam) {
      try {
        const examJson = lastExam.parameters.find(p => p.key === 'exam_json');
        if (examJson) {
          previousSystems = JSON.parse(String(examJson.value));
          physicalExam = previousSystems.map(s => ({
            ...s,
            isChanged: false,
            previousText: s.text,
            status: s.status,
          }));
        }
      } catch {}
    }

    let diagnosis: DiagnosisState = { ...DEFAULT_DIAGNOSIS, complications: [], concomitant: [], background: [] };
    let previousDiagnosis: DiagnosisState | null = null;

    const lastDiagnosisEvent = allEvents
      .filter(e => e.type === 'diagnosis_established')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

    if (lastDiagnosisEvent) {
      try {
        const diagJson = lastDiagnosisEvent.parameters.find(p => p.key === 'diagnosis_json');
        if (diagJson) {
          const saved = JSON.parse(String(diagJson.value));
          diagnosis = {
            primary: saved.primary || { code: '', name: '', isFirstTime: false },
            complications: saved.complications || [],
            concomitant: saved.concomitant || [],
            background: saved.background || [],
          };
          previousDiagnosis = diagnosis;
        } else {
          const code = String(lastDiagnosisEvent.parameters.find(p => p.key === 'diagnosis_code')?.value || '');
          const name = String(lastDiagnosisEvent.parameters.find(p => p.key === 'diagnosis_name')?.value || '');
          diagnosis.primary = { code, name, isFirstTime: false };
          previousDiagnosis = diagnosis;
        }
      } catch {}
    }

    const lastPrescriptions = allEvents
      .filter(e => e.type === 'prescription')
      .filter(e => {
        const isBasic = e.parameters.find(p => p.key === 'drug_is_basic');
        return isBasic?.value === '1';
      });

    const basicTherapyMap = new Map<string, MedicationState>();
    for (const p of lastPrescriptions) {
      const name = String(p.parameters.find(pr => pr.key === 'drug_name')?.value || '');
      if (!name || basicTherapyMap.has(name)) continue;
      basicTherapyMap.set(name, {
        id: crypto.randomUUID(),
        name,
        dose: String(p.parameters.find(pr => pr.key === 'drug_dose')?.value || ''),
        frequency: String(p.parameters.find(pr => pr.key === 'drug_frequency')?.value || ''),
        duration: String(p.parameters.find(pr => pr.key === 'drug_duration')?.value || ''),
        isBasic: true,
        isContinued: true,
      });
    }

    let previousComplaints: string[] = [];
    const lastComplaints = allEvents
      .filter(e => e.type === 'symptom_reported')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    
    if (lastComplaints) {
      try {
        const complaintsJson = lastComplaints.parameters.find(p => p.key === 'complaints_json');
        if (complaintsJson) {
          const saved = JSON.parse(String(complaintsJson.value));
          previousComplaints = saved.map((c: any) => c.name);
        }
      } catch {}
    }

    set({
      currentVisit: {
        patientId,
        date: todayString(),
        type: 'treatment',
        status: 'draft',
        previousVitals: previousParams,
        previousComplaints,
        previousExamSystems: previousSystems,
        previousDiagnosis,
        vitals,
        lifeHistory,
        complaints: [],
        anamnesis: { dynamic: 'stable', chronology: [], text: '' },
        physicalExam,
        diagnosis,
        examinationPlan: { ...DEFAULT_EXAM_PLAN, labTests: [], instrumental: [], consultations: [], priorities: {} },
        treatment: {
          ...DEFAULT_TREATMENT,
          medications: [],
          basicTherapy: Array.from(basicTherapyMap.values()),
          nonDrug: [],
        },
        followUp: { ...DEFAULT_FOLLOW_UP },
      },
    });
  },

  updateVisitDate: (date) => set(s => ({
    currentVisit: s.currentVisit ? { ...s.currentVisit, date } : null,
  })),

  updateVitals: (v) => set(s => ({
    currentVisit: s.currentVisit ? { ...s.currentVisit, vitals: { ...s.currentVisit.vitals, ...v } } : null,
  })),

  updateLifeHistory: (v) => set(s => ({
    currentVisit: s.currentVisit ? { ...s.currentVisit, lifeHistory: { ...s.currentVisit.lifeHistory, ...v } } : null,
  })),

  addComplaint: (name) => set(s => {
    if (!s.currentVisit) return s;
    const exists = s.currentVisit.complaints.find(c => c.name === name);
    if (exists) return s;
    const complaint: ComplaintItem = {
      id: crypto.randomUUID(), name, status: 'new', details: '',
    };
    return { currentVisit: { ...s.currentVisit, complaints: [...s.currentVisit.complaints, complaint] } };
  }),

  removeComplaint: (id) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      complaints: s.currentVisit.complaints.filter(c => c.id !== id),
    } : null,
  })),

  updateComplaint: (id, updates) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      complaints: s.currentVisit.complaints.map(c => c.id === id ? { ...c, ...updates } : c),
    } : null,
  })),

  updateAnamnesis: (v) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      anamnesis: { ...s.currentVisit.anamnesis, ...v },
    } : null,
  })),

  updateSystemExam: (index, updates) => set(s => {
    if (!s.currentVisit) return s;
    const exam = [...s.currentVisit.physicalExam];
    exam[index] = { ...exam[index], ...updates, isChanged: true };
    return { currentVisit: { ...s.currentVisit, physicalExam: exam } };
  }),

  setAllSystemsNormal: () => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      physicalExam: DEFAULT_SYSTEMS.map(s => ({ ...s })),
    } : null,
  })),

  markAllSystemsUnchanged: () => set(s => {
    if (!s.currentVisit) return s;
    return {
      currentVisit: {
        ...s.currentVisit,
        physicalExam: s.currentVisit.physicalExam.map(s => ({
          ...s,
          isChanged: false,
        })),
      },
    };
  }),

  loadPreviousSystems: () => {
    const visit = get().currentVisit;
    if (!visit || visit.previousExamSystems.length === 0) return;
    set({
      currentVisit: {
        ...visit,
        physicalExam: visit.previousExamSystems.map(s => ({ ...s, isChanged: false })),
      },
    });
  },

  loadPreviousBasicTherapy: () => {
    const visit = get().currentVisit;
    if (!visit || visit.treatment.basicTherapy.length === 0) return;
    const basicMeds = visit.treatment.basicTherapy.map(m => ({
      ...m,
      id: crypto.randomUUID(),
      isContinued: true,
    }));
    set({
      currentVisit: {
        ...visit,
        treatment: {
          ...visit.treatment,
          medications: [
            ...visit.treatment.medications.filter(m => !basicMeds.some(b => b.name === m.name)),
            ...basicMeds,
          ],
        },
      },
    });
  },

  updateDiagnosis: (v) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      diagnosis: { ...s.currentVisit.diagnosis, ...v },
    } : null,
  })),

  updatePrimaryDiagnosis: (v) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      diagnosis: {
        ...s.currentVisit.diagnosis,
        primary: { ...s.currentVisit.diagnosis.primary, ...v },
      },
    } : null,
  })),

  addDiagnosisItem: (type, item) => set(s => {
    if (!s.currentVisit) return s;
    const list = s.currentVisit.diagnosis[type];
    if (list.some(i => i.code === item.code)) return s;
    return {
      currentVisit: {
        ...s.currentVisit,
        diagnosis: { ...s.currentVisit.diagnosis, [type]: [...list, item] },
      },
    };
  }),

  removeDiagnosisItem: (type, code) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      diagnosis: {
        ...s.currentVisit.diagnosis,
        [type]: s.currentVisit.diagnosis[type].filter(i => i.code !== code),
      },
    } : null,
  })),

  updateDiagnosisItemName: (type, code, name) => set(s => {
    if (!s.currentVisit) return s;
    const list = s.currentVisit.diagnosis[type].map(i =>
      i.code === code ? { ...i, name } : i
    );
    return {
      currentVisit: {
        ...s.currentVisit,
        diagnosis: { ...s.currentVisit.diagnosis, [type]: list },
      },
    };
  }),

  updateExaminationPlan: (v) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      examinationPlan: { ...s.currentVisit.examinationPlan, ...v },
    } : null,
  })),

  toggleExaminationItem: (category, item) => set(s => {
    if (!s.currentVisit) return s;
    const current = s.currentVisit.examinationPlan[category];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    return {
      currentVisit: {
        ...s.currentVisit,
        examinationPlan: { ...s.currentVisit.examinationPlan, [category]: updated },
      },
    };
  }),

  updateTreatment: (v) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      treatment: { ...s.currentVisit.treatment, ...v },
    } : null,
  })),

  addMedication: (med) => set(s => {
    if (!s.currentVisit) return s;
    const medication: MedicationState = {
      ...med, id: crypto.randomUUID(), isContinued: false,
    };
    return {
      currentVisit: {
        ...s.currentVisit,
        treatment: {
          ...s.currentVisit.treatment,
          medications: [...s.currentVisit.treatment.medications, medication],
        },
      },
    };
  }),

  removeMedication: (id) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      treatment: {
        ...s.currentVisit.treatment,
        medications: s.currentVisit.treatment.medications.filter(m => m.id !== id),
      },
    } : null,
  })),

  toggleNonDrugChip: (chip) => set(s => {
    if (!s.currentVisit) return s;
    const current = s.currentVisit.treatment.nonDrug;
    const updated = current.includes(chip)
      ? current.filter(c => c !== chip)
      : [...current, chip];
    return {
      currentVisit: {
        ...s.currentVisit,
        treatment: { ...s.currentVisit.treatment, nonDrug: updated },
      },
    };
  }),

  updateFollowUp: (v) => set(s => ({
    currentVisit: s.currentVisit ? {
      ...s.currentVisit,
      followUp: { ...s.currentVisit.followUp, ...v },
    } : null,
  })),

  saveVisit: async () => {
    const visit = get().currentVisit;
    if (!visit) return;

    const events: CreateEventInput[] = [];

    events.push({
      patientId: visit.patientId, type: 'vital_signs', source: 'doctor_measured',
      timestamp: visit.date, title: 'Витальные показатели',
      parameters: [
        { key: 'systolic_bp', value: visit.vitals.systolic, unit: 'mmHg' },
        { key: 'diastolic_bp', value: visit.vitals.diastolic, unit: 'mmHg' },
        { key: 'heart_rate', value: visit.vitals.heartRate, unit: 'bpm' },
        { key: 'respiratory_rate', value: visit.vitals.respiratoryRate, unit: 'breaths/min' },
        { key: 'spo2', value: visit.vitals.spo2, unit: '%' },
        { key: 'temperature', value: visit.vitals.temperature, unit: '°C' },
      ],
    });

    if (visit.vitals.height > 0 || visit.vitals.weight > 0) {
      events.push({
        patientId: visit.patientId, type: 'anthropometry', source: 'doctor_measured',
        timestamp: visit.date, title: 'Антропометрия',
        parameters: [
          { key: 'height', value: visit.vitals.height, unit: 'cm' },
          { key: 'weight', value: visit.vitals.weight, unit: 'kg' },
        ],
      });
    }

    events.push({
      patientId: visit.patientId, type: 'life_history', source: 'patient_reported',
      timestamp: visit.date, title: 'Анамнез жизни',
      parameters: [
        { key: 'life_history_json', value: JSON.stringify(visit.lifeHistory), unit: '' },
      ],
    });

    if (visit.complaints.length > 0) {
      events.push({
        patientId: visit.patientId, type: 'symptom_reported', source: 'patient_reported',
        timestamp: visit.date, title: 'Жалобы',
        parameters: [
          { key: 'complaints_json', value: JSON.stringify(visit.complaints), unit: '' },
        ],
      });
    }

    events.push({
      patientId: visit.patientId, type: 'physical_exam', source: 'doctor_measured',
      timestamp: visit.date, title: 'Объективный статус',
      parameters: [
        { key: 'exam_json', value: JSON.stringify(visit.physicalExam), unit: '' },
      ],
    });

    if (visit.diagnosis.primary.code) {
      events.push({
        patientId: visit.patientId, type: 'diagnosis_established', source: 'doctor_measured',
        timestamp: visit.date, title: visit.diagnosis.primary.name || visit.diagnosis.primary.code,
        parameters: [
          { key: 'diagnosis_code', value: visit.diagnosis.primary.code, unit: '' },
          { key: 'diagnosis_name', value: visit.diagnosis.primary.name, unit: '' },
          { key: 'diagnosis_json', value: JSON.stringify(visit.diagnosis), unit: '' },
        ],
      });
    }

    for (const med of visit.treatment.medications) {
      events.push({
        patientId: visit.patientId, type: 'prescription', source: 'doctor_measured',
        timestamp: visit.date, title: `Назначено: ${med.name}`,
        parameters: [
          { key: 'drug_name', value: med.name, unit: '' },
          { key: 'drug_dose', value: med.dose, unit: '' },
          { key: 'drug_frequency', value: med.frequency, unit: '' },
          { key: 'drug_duration', value: med.duration, unit: '' },
          { key: 'drug_is_basic', value: med.isBasic ? '1' : '0', unit: '' },
        ],
      });
    }

    events.push({
      patientId: visit.patientId, type: 'visit_note', source: 'doctor_measured',
      timestamp: visit.date, title: 'Визит',
      parameters: [
        { key: 'visit_json', value: JSON.stringify(visit), unit: '' },
      ],
    });

    await eventRepo.createBatch(events);

    // Создаём записи в листе ожидания
    const priorities = visit.examinationPlan.priorities || {};

    for (const test of visit.examinationPlan.labTests) {
      const prio = priorities[test] || { priority: 'P3', deadlineDays: 7 };
      const deadline = new Date(visit.date);
      deadline.setDate(deadline.getDate() + prio.deadlineDays);
      try {
        await waitingService.create({
          patientId: visit.patientId,
          patientCode: '',
          type: 'обследование',
          description: test,
          priority: prio.priority as any,
          deadline: deadline.toISOString().split('T')[0],
          status: 'ожидает',
        });
      } catch (e) { console.warn('Ошибка создания waiting_item:', e); }
    }

    for (const test of visit.examinationPlan.instrumental) {
      const prio = priorities[test] || { priority: 'P2', deadlineDays: 14 };
      const deadline = new Date(visit.date);
      deadline.setDate(deadline.getDate() + prio.deadlineDays);
      try {
        await waitingService.create({
          patientId: visit.patientId,
          patientCode: '',
          type: 'обследование',
          description: test,
          priority: prio.priority as any,
          deadline: deadline.toISOString().split('T')[0],
          status: 'ожидает',
        });
      } catch (e) { console.warn('Ошибка создания waiting_item:', e); }
    }

    for (const cons of visit.examinationPlan.consultations) {
      const prio = priorities[cons] || { priority: 'P2', deadlineDays: 30 };
      const deadline = new Date(visit.date);
      deadline.setDate(deadline.getDate() + prio.deadlineDays);
      try {
        await waitingService.create({
          patientId: visit.patientId,
          patientCode: '',
          type: 'консультация',
          description: cons,
          priority: prio.priority as any,
          deadline: deadline.toISOString().split('T')[0],
          status: 'ожидает',
        });
      } catch (e) { console.warn('Ошибка создания waiting_item:', e); }
    }

    set(s => ({
      currentVisit: s.currentVisit ? { ...s.currentVisit, status: 'completed' } : null,
    }));
  },

  clearVisit: () => set({ currentVisit: null }),
});