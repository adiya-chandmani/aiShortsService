'use client';

import { useId } from 'react';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  disabled = false,
}: SliderProps) {
  const id = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
        <span
          id={`${id}-value`}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400"
          aria-live="polite"
        >
          {value}{unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value}${unit}`}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700"
      />
    </div>
  );
}
