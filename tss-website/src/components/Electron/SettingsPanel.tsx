'use client';

import { useState } from 'react';
import { useIsElectron, useAppInfo, useAppLogs, useAppControls, useWindowControls, useAppSettings } from '@/hooks/useElectron';

// Mirrors DEFAULT_SETTINGS in electron/main.js, which is what enforces them.
const DEFAULT_SETTINGS = {
  autoStart: false,
  minimizeToTray: true,
  notifications: true,
  autoUpdate: true,
  hardwareAcceleration: true,
};

export default function SettingsPanel() {
  const isElectron = useIsElectron();
  const appInfo = useAppInfo();
  const { logs, getLogs, clearLogs } = useAppLogs();
  const { restartApp } = useAppControls();
  const { minimizeWindow, maximizeWindow, closeWindow } = useWindowControls();
  
  // Persisted in userData/settings.json through IPC; the main process applies
  // them (login item, tray behaviour, notifications, updater).
  const { settings, saveSettings, isLoading, requiresRestart } = useAppSettings(DEFAULT_SETTINGS);

  const [activeTab, setActiveTab] = useState('general');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const updateSetting = async (patch: Partial<typeof DEFAULT_SETTINGS>) => {
    setSaveState('saving');
    const result = await saveSettings(patch);
    setSaveState(result && result.success === false ? 'error' : 'saved');
  };

  const handleSaveSettings = () => {
    void updateSetting(settings);
  };

  const handleClearCache = async () => {
    if (isElectron && window.electron) {
      await window.electron.clearSession();
      alert('Cache został wyczyszczony');
    }
  };

  const handleExportLogs = async () => {
    await getLogs();
    if (logs) {
      const blob = new Blob([logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tss-logs-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!isElectron) return null;

  return (
    <div className="bg-[var(--bg)] rounded-xl p-6 border border-[var(--bg)]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[var(--text)]">Ustawienia</h2>
        <div className="text-sm text-[var(--text)]">
          Wersja {appInfo?.version || '1.0.0'}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'general'
              ? 'bg-[var(--bg)] text-[var(--text)]'
              : 'bg-[var(--bg)] text-[var(--text)]'
          }`}
        >
          Ogólne
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'advanced'
              ? 'bg-[var(--bg)] text-[var(--text)]'
              : 'bg-[var(--bg)] text-[var(--text)] hover:bg-gray-700'
          }`}
        >
          Zaawansowane
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'diagnostics'
              ? 'bg-[var(--bg)] text-[var(--text)]'
              : 'bg-[var(--bg)] text-[var(--text)] hover:bg-gray-700'
          }`}
        >
          Diagnostyka
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-gray-750 transition">
            <div>
              <span className="text-[var(--text)] font-medium">Uruchamiaj przy starcie Windows</span>
              <p className="text-[var(--text)] text-sm">Aplikacja będzie uruchamiana automatycznie</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoStart}
              disabled={isLoading}
              onChange={(e) => void updateSetting({ autoStart: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-gray-750 transition">
            <div>
              <span className="text-[var(--text)] font-medium">Minimalizuj do tray</span>
              <p className="text-[var(--text)] text-sm">Aplikacja będzie działać w tle po zamknięciu</p>
            </div>
            <input
              type="checkbox"
              checked={settings.minimizeToTray}
              disabled={isLoading}
              onChange={(e) => void updateSetting({ minimizeToTray: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-gray-750 transition">
            <div>
              <span className="text-[var(--text)] font-medium">Powiadomienia systemowe</span>
              <p className="text-[var(--text)] text-sm">Otrzymuj powiadomienia o aktualizacjach</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notifications}
              disabled={isLoading}
              onChange={(e) => void updateSetting({ notifications: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-gray-750 transition">
            <div>
              <span className="text-[var(--text)] font-medium">Automatyczne aktualizacje</span>
              <p className="text-[var(--text)] text-sm">Pobieraj i instaluj aktualizacje automatycznie</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoUpdate}
              disabled={isLoading}
              onChange={(e) => void updateSetting({ autoUpdate: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          <button
            onClick={handleSaveSettings}
            disabled={saveState === 'saving'}
            className="w-full py-3bg-[var(--bg)] text-[var(--text)] font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {saveState === 'saving' ? 'Zapisywanie...' : 'Zapisz ustawienia'}
          </button>

          <p aria-live="polite" className="text-sm text-center min-h-5">
            {saveState === 'saved' && <span className="text-green-400">Ustawienia zapisane</span>}
            {saveState === 'error' && <span className="text-red-400">Nie udało się zapisać ustawień</span>}
          </p>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition">
            <div>
              <span className="text-[var(--text)] font-medium">Przyspieszenie sprzętowe</span>
              <p className="text-[var(--text)] text-sm">Użyj GPU dla lepszej wydajności</p>
            </div>
            <input
              type="checkbox"
              checked={settings.hardwareAcceleration}
              disabled={isLoading}
              onChange={(e) => void updateSetting({ hardwareAcceleration: e.target.checked })}
              className="w-5 h-5 rounded"
            />
          </label>

          {requiresRestart && (
            <p role="status" className="p-3 rounded-lg bg-[var(--bg)] text-amber-300 text-sm">
              Zmiana przyspieszenia sprzętowego zadziała po ponownym uruchomieniu aplikacji.
            </p>
          )}

          <div className="p-4 bg-[var(--bg)] rounded-lg">
            <h3 className="text-[var(--text)] font-medium mb-2">Informacje o systemie</h3>
            <div className="space-y-1 text-sm text-[var(--text)]">
              <p>Platforma: {appInfo?.platform}</p>
              <p>Architektura: {appInfo?.arch}</p>
              <p>Electron: {appInfo?.electronVersion}</p>
              <p>Node: {appInfo?.nodeVersion}</p>
              <p>Chrome: {appInfo?.chromeVersion}</p>
            </div>
          </div>

          <button
            onClick={handleClearCache}
            className="w-full py-3 bg-red-500 text-[var(--text)] font-semibold rounded-lg hover:bg-red-600 transition"
          >
            Wyczyść cache
          </button>

          <button
            onClick={restartApp}
            className="w-full py-3 bg-[var(--bg)] text-[var(--text)] font-semibold rounded-lg hover:bg-gray-600 transition"
          >
            Uruchom ponownie aplikację
          </button>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <div className="p-4 bg-[var(--bg)] rounded-lg">
            <h3 className="text-[var(--text)] font-medium mb-2">Logi aplikacji</h3>
            <div className="bg-[var(--bg)] text-[var(--text)] rounded p-4 h-64 overflow-y-auto text-xs font-mono">
              {logs || 'Brak logów. Kliknij "Pobierz logi" aby wyświetlić.'}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleExportLogs}
              className="flex-1 py-3 bg-blue-500 text-[var(--text)] font-semibold rounded-lg hover:bg-blue-600 transition"
            >
              Pobierz logi
            </button>
            <button
              onClick={clearLogs}
              className="flex-1 py-3 bg-red-500 text-[var(--text)] font-semibold rounded-lg hover:bg-red-600 transition"
            >
              Wyczyść logi
            </button>
          </div>

          <div className="p-4 bg-[var(--bg)] rounded-lg">
            <h3 className="text-[var(--text)] font-medium mb-2">Testy okna</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={minimizeWindow}
                className="py-2 bg-[var(--bg)] text-[var(--text)] rounded hover:bg-gray-600 transition"
              >
                Minimalizuj
              </button>
              <button
                onClick={maximizeWindow}
                className="py-2 bg-[var(--bg)] text-[var(--text)] rounded hover:bg-gray-600 transition"
              >
                Maksymalizuj
              </button>
              <button
                onClick={closeWindow}
                className="py-2 bg-red-500 text-[var(--text)] rounded hover:bg-red-600 transition"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
