// core/services/screening.service.ts
// v1.2.0 — Исправлен getScreeningGaps (добавлено поле name)

import { Patient } from '@core/types/patient';
import { ClinicalEvent } from '@core/types/events';
import { calculateAge, isOverdue, addDays } from '@core/utils/date';

export type ScreeningStatus = 'green' | 'yellow' | 'red' | 'none';

export interface ScreeningItem {
  id: string;
  type: string;
  name: string;
  description: string;
  status: ScreeningStatus;
  lastPerformed: string | null;
  recommendedEvery: string;
  dueDate: string | null;
  action: 'none' | 'recommend' | 'overdue';
}

export interface ScreeningGapItem {
  patientId: string;
  patientName: string;
  patientCode: string;
  type: string;
  name: string;
  description: string;
  priority: string;
  screeningType: string;
}

interface ScreeningRule {
  type: string;
  name: string;
  check: (patient: Patient, events: ClinicalEvent[]) => ScreeningItem | null;
}

const SCREENING_RULES: ScreeningRule[] = [
  {
    type: 'mammography',
    name: 'Маммография',
    check: (patient, events) => {
      if (patient.gender !== 'female') return null;
      const age = calculateAge(patient.birthDate);
      if (age < 40 || age > 75) return null;
      
      const lastScreening = events
        .filter(e => e.type === 'screening_performed')
        .find(e => e.parameters.some(p => p.key === 'screening_type' && p.value === 'mammography'));
      
      const lastDate = lastScreening?.timestamp || null;
      const dueEvery = 2;
      const dueDate = lastDate ? addDays(lastDate, dueEvery * 365) : null;
      const status = !lastDate ? 'red' : isOverdue(dueDate!) ? 'red' : 'green';
      
      return {
        id: 'mammography', type: 'mammography', name: 'Маммография',
        description: 'Скрининг рака молочной железы',
        status, lastPerformed: lastDate, recommendedEvery: `${dueEvery} года`,
        dueDate, action: status === 'red' ? 'overdue' : 'none',
      };
    },
  },
  {
    type: 'colonoscopy',
    name: 'Колоноскопия',
    check: (patient, events) => {
      const age = calculateAge(patient.birthDate);
      if (age < 50 || age > 75) return null;
      
      const lastScreening = events
        .filter(e => e.type === 'screening_performed')
        .find(e => e.parameters.some(p => p.key === 'screening_type' && p.value === 'colonoscopy'));
      
      const lastDate = lastScreening?.timestamp || null;
      const dueEvery = 10;
      const dueDate = lastDate ? addDays(lastDate, dueEvery * 365) : null;
      const status = !lastDate ? 'red' : isOverdue(dueDate!) ? 'red' : 'green';
      
      return {
        id: 'colonoscopy', type: 'colonoscopy', name: 'Колоноскопия',
        description: 'Скрининг колоректального рака',
        status, lastPerformed: lastDate, recommendedEvery: `${dueEvery} лет`,
        dueDate, action: status === 'red' ? 'overdue' : 'none',
      };
    },
  },
  {
    type: 'fluorography',
    name: 'Флюорография',
    check: (patient, events) => {
      const age = calculateAge(patient.birthDate);
      if (age < 18) return null;
      
      const lastScreening = events
        .filter(e => e.type === 'screening_performed')
        .find(e => e.parameters.some(p => p.key === 'screening_type' && p.value === 'fluorography'));
      
      const lastDate = lastScreening?.timestamp || null;
      const dueEvery = 1;
      const dueDate = lastDate ? addDays(lastDate, dueEvery * 365) : null;
      const status = !lastDate ? 'red' : isOverdue(dueDate!) ? 'red' : 'green';
      
      return {
        id: 'fluorography', type: 'fluorography', name: 'Флюорография',
        description: 'Скрининг туберкулёза',
        status, lastPerformed: lastDate, recommendedEvery: '1 год',
        dueDate, action: status === 'red' ? 'overdue' : 'none',
      };
    },
  },
  {
    type: 'lipids',
    name: 'Липидограмма',
    check: (patient, events) => {
      const age = calculateAge(patient.birthDate);
      if (age < 40 || age > 75) return null;
      
      const lastLab = events
        .filter(e => e.type === 'lab_result')
        .find(e => e.parameters.some(p => p.key === 'report_name' && String(p.value).toLowerCase().includes('липид')));
      
      const lastDate = lastLab?.timestamp || null;
      const dueEvery = 5;
      const dueDate = lastDate ? addDays(lastDate, dueEvery * 365) : null;
      const status = !lastDate ? 'yellow' : isOverdue(dueDate!) ? 'red' : 'green';
      
      return {
        id: 'lipids', type: 'lipids', name: 'Липидограмма',
        description: 'ОХС, ЛПНП, ЛПВП, ТГ',
        status, lastPerformed: lastDate, recommendedEvery: `${dueEvery} лет`,
        dueDate, action: status === 'red' ? 'overdue' : status === 'yellow' ? 'recommend' : 'none',
      };
    },
  },
  {
    type: 'hba1c',
    name: 'HbA1c',
    check: (patient, events) => {
      const diabeticEvents = events.filter(
        e => e.type === 'diagnosis_established' &&
        e.parameters.some(p => p.key === 'diagnosis_code' && String(p.value).startsWith('E11'))
      );
      if (diabeticEvents.length === 0) return null;
      
      const lastLab = events
        .filter(e => e.type === 'lab_result')
        .find(e => e.parameters.some(p => p.key === 'report_name' && String(p.value).toLowerCase().includes('hba1c')));
      
      const lastDate = lastLab?.timestamp || null;
      const dueEvery = 0.25;
      const dueDate = lastDate ? addDays(lastDate, dueEvery * 365) : null;
      const status = !lastDate ? 'red' : isOverdue(dueDate!) ? 'red' : 'green';
      
      return {
        id: 'hba1c', type: 'hba1c', name: 'HbA1c',
        description: 'Контроль гликемии при СД',
        status, lastPerformed: lastDate, recommendedEvery: '3 месяца',
        dueDate, action: status === 'red' ? 'overdue' : 'none',
      };
    },
  },
  {
    type: 'pap_test',
    name: 'ПАП-тест',
    check: (patient, events) => {
      if (patient.gender !== 'female') return null;
      const age = calculateAge(patient.birthDate);
      if (age < 21 || age > 65) return null;
      
      const lastScreening = events
        .filter(e => e.type === 'screening_performed')
        .find(e => e.parameters.some(p => p.key === 'screening_type' && p.value === 'pap_test'));
      
      const lastDate = lastScreening?.timestamp || null;
      const dueEvery = 3;
      const dueDate = lastDate ? addDays(lastDate, dueEvery * 365) : null;
      const status = !lastDate ? 'yellow' : isOverdue(dueDate!) ? 'red' : 'green';
      
      return {
        id: 'pap_test', type: 'pap_test', name: 'ПАП-тест',
        description: 'Скрининг рака шейки матки',
        status, lastPerformed: lastDate, recommendedEvery: `${dueEvery} года`,
        dueDate, action: status === 'red' ? 'overdue' : status === 'yellow' ? 'recommend' : 'none',
      };
    },
  },
];

export function getScreeningStatus(patient: Patient, events: ClinicalEvent[]): ScreeningItem[] {
  return SCREENING_RULES
    .map(rule => rule.check(patient, events))
    .filter((item): item is ScreeningItem => item !== null)
    .sort((a, b) => {
      const order: Record<string, number> = { red: 0, yellow: 1, green: 2, none: 3 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });
}

export function getScreeningGaps(patients: Patient[], allEvents: ClinicalEvent[]): ScreeningGapItem[] {
  const gaps: ScreeningGapItem[] = [];
  
  for (const patient of patients) {
    if (patient.isArchived || patient.isDeceased) continue;
    
    const patientEvents = allEvents.filter(e => e.patientId === patient.id);
    const screenings = getScreeningStatus(patient, patientEvents);
    
    for (const s of screenings) {
      if (s.status === 'red' || s.status === 'yellow') {
        gaps.push({
          patientId: patient.id,
          patientName: `${patient.lastName} ${patient.firstName}`,
          patientCode: patient.emiasCode,
          type: 'ДС',
          name: s.name,
          description: `${s.name} — ${s.status === 'red' ? 'просрочен' : 'рекомендован'} (${s.recommendedEvery})`,
          priority: s.status === 'red' ? 'P1' : 'P2',
          screeningType: s.type,
        });
      }
    }
  }
  
  return gaps.sort((a, b) => {
    const order: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
    return (order[a.priority] ?? 5) - (order[b.priority] ?? 5);
  });
}