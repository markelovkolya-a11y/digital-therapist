// features/visit-protocol/components/DrugSafetyAlert.tsx
// v1.0.0 — Предупреждения лекарственной безопасности

import { AlertTriangle, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { DrugInteractionRule } from '@core/data/drugInteractions';

interface DrugSafetyAlertProps {
  interactions: DrugInteractionRule[];
  onDismiss: () => void;
}

export function DrugSafetyAlert({ interactions, onDismiss }: DrugSafetyAlertProps) {
  const [expanded, setExpanded] = useState(false);

  if (interactions.length === 0) return null;

  const criticalCount = interactions.filter(i => i.severity === 'critical').length;
  const warningCount = interactions.filter(i => i.severity === 'warning').length;

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: criticalCount > 0 ? '#ef4444' : '#f59e0b',
        backgroundColor: criticalCount > 0 ? '#fef2f2' : '#fffbeb',
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <AlertTriangle size={16} style={{ color: criticalCount > 0 ? '#ef4444' : '#f59e0b' }} />
        <span className="text-sm font-medium" style={{ color: criticalCount > 0 ? '#991b1b' : '#92400e' }}>
          Лекарственная безопасность: {interactions.length} предупреждений
          {criticalCount > 0 && ` (${criticalCount} критических)`}
        </span>
        <button onClick={() => setExpanded(!expanded)} className="ml-auto">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <button onClick={onDismiss} className="p-0.5">
          <X size={16} />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {interactions.map(rule => (
            <div
              key={rule.id}
              className="p-2 rounded text-xs"
              style={{
                backgroundColor: rule.severity === 'critical' ? '#fee2e2' : '#fef3c7',
                color: rule.severity === 'critical' ? '#991b1b' : '#92400e',
              }}
            >
              <div className="font-medium">{rule.message}</div>
              <div className="mt-0.5 opacity-80">{rule.recommendation}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}