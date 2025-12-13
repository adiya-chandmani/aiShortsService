'use client';

import { useId } from 'react';

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}

export function Switch({
  label,
  checked,
  onChange,
  description,
  disabled = false,
}: SwitchProps) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label
          id={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
        {description && (
          <p
            id={descriptionId}
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        aria-describedby={descriptionId}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}
        `}
      >
        <span
          aria-hidden="true"
          className={`
            pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
            transition duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  );
}
