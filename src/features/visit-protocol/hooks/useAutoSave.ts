// features/visit-protocol/hooks/useAutoSave.ts
// v1.0.0 — Автосохранение черновика протокола каждые 30 секунд

import { useEffect, useRef } from 'react';
import { useAppStore } from '@core/store';

const AUTOSAVE_INTERVAL = 30000; // 30 секунд

export function useAutoSave() {
  const currentVisit = useAppStore(s => s.currentVisit);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentVisit || currentVisit.status === 'completed') return;

      const data = JSON.stringify(currentVisit);
      if (data === lastSavedRef.current) return; // Не изменилось — не сохраняем

      try {
        localStorage.setItem(
          `visit_draft_${currentVisit.patientId}`,
          data
        );
        lastSavedRef.current = data;
        console.log('💾 Черновик сохранён');
      } catch (e) {
        console.warn('⚠️ Не удалось сохранить черновик');
      }
    }, AUTOSAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [currentVisit]);

  // Загрузка черновика при инициализации
  const loadDraft = (patientId: string) => {
    try {
      const saved = localStorage.getItem(`visit_draft_${patientId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  };

  const clearDraft = (patientId: string) => {
    localStorage.removeItem(`visit_draft_${patientId}`);
  };

  return { loadDraft, clearDraft };
}