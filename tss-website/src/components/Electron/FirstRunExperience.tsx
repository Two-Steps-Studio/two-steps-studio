'use client';

import { useEffect, useState } from 'react';
import { useIsElectron, useAppInfo, useAutoUpdater } from '@/hooks/useElectron';
import { Settings, Check, X, RotateCcw } from "lucide-react";

export default function FirstRunExperience() {
  const isElectron = useIsElectron();
  const appInfo = useAppInfo();
  const { checkForUpdates, updateAvailable, isChecking } = useAutoUpdater();
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState({
    autoStart: false,
    minimizeToTray: true,
    notifications: true,
    autoUpdate: true,
  });

  useEffect(() => {
    // Check if this is first run
    const hasRun = localStorage.getItem('tss-first-run');
    if (hasRun) {
      setStep(0); // Skip if not first run
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem('tss-first-run', 'true');
    localStorage.setItem('tss-settings', JSON.stringify(settings));
    setStep(0);
  };

  const handleCheckUpdates = async () => {
    await checkForUpdates();
  };

  if (!isElectron || step === 0) return null;

  return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 border-2 border-[var(--border-color)]">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-black mb-2">
              Witaj w <a className="text-[var(--color-general)]"> Two Steps Studio! </a>
            </h1>
            <p className="text-gray-400">
              Wersja {appInfo?.version || '0.0.1'}
            </p>
          </div>

          {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center border-2 border-[var(--color-general)]/30">
                    <Settings className="w-17 h-17 text-[var(--color-general)]" />
                  </div>
                  <h2 className="text-2xl font-semibold text-black mb-2">
                    Pierwsze uruchomienie
                  </h2>
                  <p className="text-gray-400">
                    Skonfiguruj aplikację według swoich preferencji
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:bg-gray-750 transition border border-[var(--border-color)]">
                    <div>
                      <span className="text-black font-medium">Uruchamiaj przy starcie Windows</span>
                      <p className="text-gray-400 text-sm">Aplikacja będzie uruchamiana automatycznie</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.autoStart}
                        onChange={(e) => setSettings({ ...settings, autoStart: e.target.checked })}
                        className="w-5 h-5 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:bg-gray-750 transition border border-[var(--border-color)]">
                    <div>
                      <span className="text-black font-medium">Minimalizuj do tray</span>
                      <p className="text-gray-400 text-sm">Aplikacja będzie działać w tle po zamknięciu</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.minimizeToTray}
                        onChange={(e) => setSettings({ ...settings, minimizeToTray: e.target.checked })}
                        className="w-5 h-5 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:bg-gray-750 transition border border-[var(--border-color)]">
                    <div>
                      <span className="text-black font-medium">Powiadomienia systemowe</span>
                      <p className="text-gray-400 text-sm">Otrzymuj powiadomienia o aktualizacjach</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                        className="w-5 h-5 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-white rounded-xl cursor-pointer hover:bg-gray-750 transition border border-[var(--border-color)]">
                    <div>
                      <span className="text-black font-medium">Automatyczne aktualizacje</span>
                      <p className="text-gray-400 text-sm">Pobieraj i instaluj aktualizacje automatycznie</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.autoUpdate}
                        onChange={(e) => setSettings({ ...settings, autoUpdate: e.target.checked })}
                        className="w-5 h-5 rounded"
                    />
                  </label>
                </div>

                <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 bg-black text-white font-semibold rounded-xl hover:opacity-90 transition"
                >
                  Dalej
                </button>
              </div>
          )}

          {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-full flex items-center justify-center border-2 border-[var(--color-general)]/30">
                    <RotateCcw className="w-17 h-17 text-[var(--color-general)]" />
                  </div>
                  <h2 className="text-2xl font-semibold text-black mb-2">
                    Sprawdź aktualizacje
                  </h2>
                  <p className="text-gray-400">
                    Upewnij się, że masz najnowszą wersję
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 text-center border border-[var(--border-color)]">
                  {isChecking ? (
                      <div className="space-y-4">
                        <div className="animate-spin w-12 h-12 border-4 border-[var(--color-general)] border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-400">Sprawdzanie aktualizacji...</p>
                      </div>
                  ) : updateAvailable ? (
                      <div className="space-y-4">
                        <X className="w-10 h-10 text-red-600 mx-auto" />
                        <p className="text-green-400 font-medium">Dostępna aktualizacja!</p>
                        <p className="text-gray-400 text-sm">
                          Zainstaluj aktualizację przed kontynuacją
                        </p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                        <Check className="w-10 h-10 text-green-600 mx-auto" />
                        <p className="text-white font-medium">Masz najnowszą wersję</p>
                        <p className="text-gray-400 text-sm">
                          Aplikacja jest aktualna
                        </p>
                      </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                      onClick={handleCheckUpdates}
                      disabled={isChecking}
                      className="flex-1 py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-300 transition disabled:opacity-50 border border-[var(--border-color)]"
                  >
                    {isChecking ? 'Sprawdzanie...' : 'Sprawdź ponownie'}
                  </button>
                  <button
                      onClick={handleComplete}
                      className="flex-1 py-3 bg-[var(--color-general)] text-white font-semibold rounded-xl hover:opacity-70 transition"
                  >
                    Rozpocznij
                  </button>
                </div>
              </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              Możesz zmienić te ustawienia później w menu Ustawienia
            </p>
          </div>
        </div>
      </div>
  );
}