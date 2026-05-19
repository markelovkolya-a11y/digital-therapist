// features/visit-protocol/hooks/useSnippets.ts
// v1.0.0 — Хук для обработки сниппетов в текстовых полях

import { useState, useEffect } from 'react';
import { settingsRepo } from '@core/database/repositories/settings.repo';
import { TextSnippet } from '@core/types/settings';

export function useSnippets() {
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);

  useEffect(() => {
    settingsRepo.getAllSnippets().then(setSnippets);
  }, []);

  /**
   * Обрабатывает текст и заменяет //код на полный текст
   */
  const expandSnippet = (text: string): string => {
    let result = text;
    for (const snippet of snippets) {
      const pattern = `//${snippet.shortcut}`;
      if (result.includes(pattern)) {
        result = result.replace(pattern, snippet.text);
      }
    }
    return result;
  };

  /**
   * Проверяет, есть ли в тексте сниппеты
   */
  const hasSnippets = (text: string): boolean => {
    return snippets.some(s => text.includes(`//${s.shortcut}`));
  };

  return { snippets, expandSnippet, hasSnippets };
}