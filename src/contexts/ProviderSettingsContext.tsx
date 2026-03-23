'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { mergeProviderKeyHeaders } from '@/lib/fancut/provider-keys';

type ProviderSettings = {
  geminiApiKey: string;
  deapiApiKey: string;
};

type ProviderSettingsContextValue = ProviderSettings & {
  saveSettings: (next: Partial<ProviderSettings>) => void;
  clearSettings: () => void;
  providerHeaders: (params: {
    headers?: HeadersInit;
    includeGemini?: boolean;
    includeDeapi?: boolean;
  }) => Headers;
};

const STORAGE_KEY = 'fancut_provider_settings_v1';

const ProviderSettingsContext = createContext<ProviderSettingsContextValue | null>(null);

function readStoredSettings(): ProviderSettings {
  if (typeof window === 'undefined') {
    return { geminiApiKey: '', deapiApiKey: '' };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { geminiApiKey: '', deapiApiKey: '' };
    }

    const parsed = JSON.parse(stored) as Partial<ProviderSettings>;
    return {
      geminiApiKey: typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey : '',
      deapiApiKey: typeof parsed.deapiApiKey === 'string' ? parsed.deapiApiKey : '',
    };
  } catch {
    return { geminiApiKey: '', deapiApiKey: '' };
  }
}

export function ProviderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProviderSettings>(readStoredSettings);

  const value = useMemo<ProviderSettingsContextValue>(() => {
    const saveSettings = (next: Partial<ProviderSettings>) => {
      setSettings((current) => {
        const updated = {
          geminiApiKey: next.geminiApiKey ?? current.geminiApiKey,
          deapiApiKey: next.deapiApiKey ?? current.deapiApiKey,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    };

    const clearSettings = () => {
      const cleared = { geminiApiKey: '', deapiApiKey: '' };
      localStorage.removeItem(STORAGE_KEY);
      setSettings(cleared);
    };

    const providerHeaders: ProviderSettingsContextValue['providerHeaders'] = ({
      headers,
      includeGemini,
      includeDeapi,
    }) =>
      mergeProviderKeyHeaders({
        headers,
        includeGemini,
        includeDeapi,
        geminiApiKey: settings.geminiApiKey,
        deapiApiKey: settings.deapiApiKey,
      });

    return {
      geminiApiKey: settings.geminiApiKey,
      deapiApiKey: settings.deapiApiKey,
      saveSettings,
      clearSettings,
      providerHeaders,
    };
  }, [settings.deapiApiKey, settings.geminiApiKey]);

  return <ProviderSettingsContext.Provider value={value}>{children}</ProviderSettingsContext.Provider>;
}

export function useProviderSettings() {
  const context = useContext(ProviderSettingsContext);
  if (!context) {
    throw new Error('useProviderSettings must be used within a ProviderSettingsProvider');
  }
  return context;
}
