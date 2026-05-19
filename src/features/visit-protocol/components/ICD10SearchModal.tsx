// features/visit-protocol/components/ICD10SearchModal.tsx
// v1.0.0 — Модальное окно поиска по МКБ-10

import { useState, useEffect, useRef } from 'react';
import { icd10Repo } from '@core/database/repositories/icd10.repo';
import { ICD10SearchResult } from '@core/types/icd10';
import { Search, X, Check } from 'lucide-react';

interface ICD10SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: string, name: string) => void;
  title?: string;
}

export function ICD10SearchModal({ isOpen, onClose, onSelect, title = 'Поиск по МКБ-10' }: ICD10SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ICD10SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await icd10Repo.searchCodes(query.trim(), 15);
        setResults(res);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Ошибка поиска МКБ-10:', error);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex].code, results[selectedIndex].name);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Прокрутка к выбранному элементу
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted" style={{ color: 'var(--color-muted-foreground)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Поле поиска */}
        <div className="relative px-4 pt-3 pb-2">
          <Search size={16} className="absolute left-7 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted-foreground)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Введите код или название диагноза..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-primary"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}
          />
        </div>

        {/* Результаты */}
        <div className="max-h-80 overflow-y-auto" ref={listRef}>
          {loading && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Поиск...
            </div>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Ничего не найдено
            </div>
          )}
          {!loading && results.map((item, index) => (
            <button
              key={item.code}
              onClick={() => {
                onSelect(item.code, item.name);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors"
              style={{
                backgroundColor: index === selectedIndex ? 'var(--color-accent)' : 'transparent',
              }}
            >
              <span className="font-mono text-xs font-semibold w-16 shrink-0" style={{ color: 'var(--color-primary)' }}>
                {item.code}
              </span>
              <span className="text-sm flex-1 truncate" style={{ color: 'var(--color-foreground)' }}>
                {item.name}
              </span>
              {index === selectedIndex && (
                <Check size={16} style={{ color: 'var(--color-primary)' }} />
              )}
            </button>
          ))}
          {!query.trim() && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              Начните вводить код МКБ или название
            </div>
          )}
        </div>

        {/* Подсказка */}
        <div className="px-4 py-2 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
          ↑↓ навигация • Enter выбрать • Esc закрыть
        </div>
      </div>
    </div>
  );
}