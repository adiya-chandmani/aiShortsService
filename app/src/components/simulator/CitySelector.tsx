'use client';

import { useState } from 'react';
import { GYEONGGI_CITIES } from '../../lib/config/constants';
import type { Coordinates } from '../../types/map';

interface CitySelectorProps {
  onSelect: (coordinates: Coordinates) => void;
}

export function CitySelector({ onSelect }: CitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleSelect = (cityName: string) => {
    const coordinates = GYEONGGI_CITIES[cityName];
    setSelectedCity(cityName);
    setIsOpen(false);
    onSelect(coordinates);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="map-overlay flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {selectedCity || '도시 선택'}
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="map-overlay absolute left-0 top-full mt-2 max-h-60 w-48 overflow-y-auto py-1">
          {Object.keys(GYEONGGI_CITIES).map((cityName) => (
            <button
              key={cityName}
              type="button"
              onClick={() => handleSelect(cityName)}
              className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedCity === cityName
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              {cityName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
