'use client';

import type { SimulationMode } from '../../types/simulation';

interface ModeToggleProps {
  mode: SimulationMode;
  onChange: (mode: SimulationMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="시뮬레이션 모드 선택"
      className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'heat'}
        onClick={() => onChange('heat')}
        className={`
          flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors
          ${mode === 'heat'
            ? 'bg-white text-orange-600 shadow dark:bg-gray-600 dark:text-orange-400'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }
        `}
      >
        <span className="mr-1" aria-hidden="true">🌡️</span>
        폭염
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'flood'}
        onClick={() => onChange('flood')}
        className={`
          flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors
          ${mode === 'flood'
            ? 'bg-white text-blue-600 shadow dark:bg-gray-600 dark:text-blue-400'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
          }
        `}
      >
        <span className="mr-1" aria-hidden="true">🌊</span>
        침수
      </button>
    </div>
  );
}
