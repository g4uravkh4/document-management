'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast-context';
import {
  Button,
  Card,
  ErrorBanner,
  Label,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui';
import type { Language, ThemePreference, UserSetting } from '@/lib/types';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'SYSTEM', label: 'System' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'DARK', label: 'Dark' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ne', label: 'नेपाली (Nepali)' },
];

function ThemeIcon({ theme }: { theme: ThemePreference }) {
  if (theme === 'DARK') return <Moon className="h-4 w-4" />;
  if (theme === 'LIGHT') return <Sun className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export default function SettingsPage() {
  const [setting, setSetting] = useState<UserSetting | null>(null);
  const [originalSetting, setOriginalSetting] = useState<UserSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api
      .get<UserSetting>('/settings/me')
      .then((s) => {
        setSetting(s);
        setOriginalSetting(s);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load settings'),
      )
      .finally(() => setLoading(false));
  }, []);

  const isDirty =
    setting !== null &&
    originalSetting !== null &&
    (setting.theme !== originalSetting.theme || setting.language !== originalSetting.language);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setting) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.patch<UserSetting>('/settings/me', {
        theme: setting.theme,
        language: setting.language,
      });
      setSetting(updated);
      setOriginalSetting(updated);
      setSuccess(true);
      toast.success('Settings saved successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save settings';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your preferences" />

      {error && <ErrorBanner message={error} />}

      {setting && (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900">Appearance</h2>
            </div>
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select
                id="theme"
                value={setting.theme}
                onChange={(e) =>
                  setSetting({
                    ...setting,
                    theme: e.target.value as ThemePreference,
                  })
                }
              >
                {THEME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                <ThemeIcon theme={setting.theme} />
                {setting.theme === 'SYSTEM'
                  ? 'Follows your device setting'
                  : `${setting.theme.toLowerCase()} mode selected`}
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-gray-900">Preferences</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="language">Language</Label>
                <Select
                  id="language"
                  value={setting.language}
                  onChange={(e) =>
                    setSetting({
                      ...setting,
                      language: e.target.value as Language,
                    })
                  }
                >
                  {LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {success && (
            <p className="text-sm text-green-600">Settings saved successfully.</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={saving} disabled={!isDirty}>
              Save settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
