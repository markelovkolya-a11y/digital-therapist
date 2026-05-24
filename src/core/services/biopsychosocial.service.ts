// core/services/biopsychosocial.service.ts
// v1.0.0 — Сервис биопсихосоциального профиля

import { eventRepo } from '@core/database/repositories';
import { BiopsychosocialProfile, CreateProfileInput } from '@core/types/biopsychosocial';
import { todayString, nowISO } from '@core/utils/date';

export const biopsychosocialService = {
  async getLatest(patientId: string): Promise<BiopsychosocialProfile | null> {
    const events = await eventRepo.findByType(patientId, 'biopsychosocial_assessment', 1);
    if (events.length === 0) return null;
    
    try {
      const params = events[0].parameters;
      const getParam = (key: string) => params.find(p => p.key === key)?.value;
      
      return {
        patientId,
        date: events[0].timestamp,
        barthelScore: Number(getParam('barthel_score')) || 0,
        mobility: (getParam('mobility') as any) || 'independent',
        phq2Score: Number(getParam('phq2_score')) || 0,
        gad2Score: Number(getParam('gad2_score')) || 0,
        housing: (getParam('housing') as any) || 'adequate',
        income: (getParam('income') as any) || 'sufficient',
        maritalStatus: (getParam('marital_status') as any) || 'married',
        careAccess: (getParam('care_access') as any) || 'none_needed',
        socialIsolation: (getParam('social_isolation') as any) || 'none',
        summary: String(getParam('summary') || ''),
        createdAt: events[0].recordedAt,
      };
    } catch {
      return null;
    }
  },

  async save(input: CreateProfileInput): Promise<void> {
    await eventRepo.create({
      patientId: input.patientId,
      type: 'biopsychosocial_assessment',
      source: 'doctor_measured',
      timestamp: input.date,
      title: 'Биопсихосоциальный профиль',
      parameters: [
        { key: 'barthel_score', value: input.barthelScore, unit: '' },
        { key: 'mobility', value: input.mobility, unit: '' },
        { key: 'phq2_score', value: input.phq2Score, unit: '' },
        { key: 'gad2_score', value: input.gad2Score, unit: '' },
        { key: 'housing', value: input.housing, unit: '' },
        { key: 'income', value: input.income, unit: '' },
        { key: 'marital_status', value: input.maritalStatus, unit: '' },
        { key: 'care_access', value: input.careAccess, unit: '' },
        { key: 'social_isolation', value: input.socialIsolation, unit: '' },
        { key: 'summary', value: input.summary, unit: '' },
      ],
    });
  },
};