'use client';

import { useEffect, useState } from 'react';
import { useIsElectron, useAppInfo, useAutoUpdater, useAppSettings } from '@/hooks/useElectron';
import { Settings, Check, X, RotateCcw, Download } from 'lucide-react';

const FIRST_RUN_KEY = 'tss-first-run';

// Mirrors DEFAULT_SETTINGS in electron/main.js, which is what actually
// enforces them; these are only the values shown before the file is read.
const DEFAULT_SETTINGS = {
  autoStart: false,
  minimizeToTray: true,
  notifications: true,
  autoUpdate: true,
};

type SettingKey = keyof typeof DEFAULT_SETTINGS;

const SETTING_LABELS: { key: SettingKey; title: string; description: string }[] = [
  {
    key: 'autoStart',
    title: 'Uruchamiaj przy starcie Windows',
    description: 'Aplikacja będzie uruchamiana automatycznie po zalogowaniu',
  },
  {
    key: 'minimizeToTray',
    title: 'Minimalizuj do zasobnika',
    description: 'Zamknięcie okna schowa aplikację do zasobnika zamiast ją wyłączyć',
  },
  {
    key: 'notifications',
    title: 'Powiadomienia systemowe',
    description: 'Otrzymuj powiadomienia o aktualizacjach i zdarzeniach',
  },
  {
    key: 'autoUpdate',
    title: 'Automatyczne aktualizacje',
    description: 'Pobieraj nowe wersje w tle, gdy tylko się pojawią',
  },
];

export default function FirstRunExperience() {
  const isElectron = useIsElectron();
  const appInfo = useAppInfo();
  const { checkForUpdates, downloadUpdate, updateAvailable, isChecking } = useAutoUpdater();
  const { settings, saveSettings, isLoading } = useAppSettings(DEFAULT_SETTINGS);

  const [step, setStep] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // null keeps the wizard from flashing before we know whether it already ran.
    setStep(localStorage.getItem(FIRST_RUN_KEY) ? 0 : 1);
  }, []);

  const toggle = (key: SettingKey) => {
    setSaveError(null);
    // Persist immediately: each switch is applied by the main process on save,
    // so there is nothing to "apply" at the end of the wizard.
    void saveSettings({ [key]: !settings[key] } as Partial<typeof DEFAULT_SETTINGS>);
  };

  const handleComplete = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await saveSettings(settings);
      if (result && result.success === false && result.error) {
        setSaveError(result.error);
        return;
      }
      localStorage.setItem(FIRST_RUN_KEY, 'true');
      setStep(0);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Nie udało się zapisać ustawień');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isElectron || step === null || step === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-[var(--text)]">
            Witaj w <span className="text-[var(--color-general)]">Two Steps Studio!</span>
          </h1>
          <p className="text-[var(--text)]/60">Wersja {appInfo?.version ?? '—'}</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--color-general)]/30">
                <Settings className="h-10 w-10 text-[var(--color-general)]" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-[var(--text)]">Pierwsze uruchomienie</h2>
              <p className="text-[var(--text)]/60">Skonfiguruj aplikację według swoich preferencji</p>
            </div>

            <div className="space-y-3">
              {SETTING_LABELS.map(({ key, title, description }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--border-color)] p-4 transition hover:border-[var(--color-general)]/50"
                >
                  <div>
                    <span className="font-medium text-[var(--text)]">{title}</span>
                    <p className="text-sm text-[var(--text)]/60">{description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    disabled={isLoading}
                    onChange={() => toggle(key)}
                    className="h-5 w-5 shrink-0 accent-[var(--color-general)]"
                  />
                </label>
              ))}
            </div>

            {saveError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {saveError}
              </p>
            )}

            <button
              onClick={() => setStep(2)}
              className="w-full rounded-xl bg-[var(--color-general)] py-3 font-semibold text-black transition hover:opacity-90"
            >
              Dalej
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[var(--color-general)]/30">
                <RotateCcw className="h-10 w-10 text-[var(--color-general)]" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-[var(--text)]">Sprawdź aktualizacje</h2>
              <p className="text-[var(--text)]/60">Upewnij się, że masz najnowszą wersję</p>
            </div>

            <div
              aria-live="polite"
              className="rounded-xl border border-[var(--border-color)] p-6 text-center"
            >
              {isChecking ? (
                <div className="space-y-4">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-general)] border-t-transparent" />
                  <p className="text-[var(--text)]/60">Sprawdzanie aktualizacji...</p>
                </div>
              ) : updateAvailable ? (
                <div className="space-y-4">
                  <Download className="mx-auto h-10 w-10 text-[var(--color-general)]" />
                  <p className="font-medium text-[var(--text)]">Dostępna jest nowa wersja</p>
                  <button
                    onClick={() => void downloadUpdate()}
                    className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--color-general)]"
                  >
                    Pobierz teraz
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Check className="mx-auto h-10 w-10 text-green-600 dark:text-green-400" />
                  <p className="font-medium text-[var(--text)]">Masz najnowszą wersję</p>
                  <p className="text-sm text-[var(--text)]/60">Aplikacja jest aktualna</p>
                </div>
              )}
            </div>

            {saveError && (
              <p role="alert" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <X className="h-4 w-4" />
                {saveError}
              </p>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => void checkForUpdates()}
                disabled={isChecking}
                className="flex-1 rounded-xl border border-[var(--border-color)] py-3 font-semibold text-[var(--text)] transition hover:border-[var(--color-general)] disabled:opacity-50"
              >
                {isChecking ? 'Sprawdzanie...' : 'Sprawdź ponownie'}
              </button>
              <button
                onClick={() => void handleComplete()}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-[var(--color-general)] py-3 font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? 'Zapisywanie...' : 'Rozpocznij'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text)]/50">
            Możesz zmienić te ustawienia później w menu Ustawienia
          </p>
        </div>
      </div>
    </div>
  );
}
