'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './api';
import { useAuth } from './auth-context';
import type { UserSetting, ThemePreference } from './types';

interface SettingsContextValue {
  settings: UserSetting | null;
  refresh: () => Promise<void>;
  apply: (settings: UserSetting) => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function applyTheme(theme: ThemePreference) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolved = theme === 'SYSTEM' ? (systemDark ? 'dark' : 'light') : theme.toLowerCase();
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    localStorage.setItem('theme', theme);
  } catch {}
}

function applyLanguage(lang: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem('language', lang);
  } catch {}
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [settings, setSettings] = useState<UserSetting | null>(null);

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const s = await api.get<UserSetting>('/settings/me');
      setSettings(s);
      applyTheme(s.theme);
      applyLanguage(s.language);
    } catch {
      // ignore - will retry on next auth change
    }
  }, [status]);

  const apply = useCallback((s: UserSetting) => {
    setSettings(s);
    applyTheme(s.theme);
    applyLanguage(s.language);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Listen for system theme changes when theme is SYSTEM
  useEffect(() => {
    if (!settings || settings.theme !== 'SYSTEM') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('SYSTEM');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);

  // Also apply from localStorage on mount for instant theme before fetch
  useEffect(() => {
    try {
      const cached = localStorage.getItem('theme') as ThemePreference | null;
      if (cached && !settings) {
        applyTheme(cached);
      }
      const cachedLang = localStorage.getItem('language');
      if (cachedLang && !settings) {
        applyLanguage(cachedLang);
      }
    } catch {}
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, refresh, apply }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
