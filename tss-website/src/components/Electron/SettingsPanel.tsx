'use client';

import { useState } from 'react';
import { useIsElectron, useAppInfo, useAppLogs, useAppControls, useWindowControls, useAppSettings } from '@/hooks/useElectron';
import { useLanguage } from '@/hooks/use-translation';

// Mirrors DEFAULT_SETTINGS in electron/main.js, which is what enforces them.
const DEFAULT_SETTINGS = {
  autoStart: false,
  minimizeToTray: true,
  notifications: true,
  autoUpdate: true,
  hardwareAcceleration: true,
};

export default function SettingsPanel() {
  const { t } = useLanguage();
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
      alert(t.compElectronSettings.cacheCleared);
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
        <h2 className="text-2xl font-bold text-[var(--text)]">{t.compElectronSettings.title}</h2>
        <div className="text-sm text-[var(--text)]">
          {t.compElectronSettings.versionLabel} {appInfo?.version || '1.0.0'}
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
          {t.compElectronSettings.tabGeneral}
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'advanced'
              ? 'bg-[var(--bg)] text-[var(--text)]'
              : 'bg-[var(--bg)] text-[var(--text)] hover:bg-gray-700'
          }`}
        >
          {t.compElectronSettings.tabAdvanced}
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 rounded-lg transition ${
            activeTab === 'diagnostics'
              ? 'bg-[var(--bg)] text-[var(--text)]'
              : 'bg-[var(--bg)] text-[var(--text)] hover:bg-gray-700'
          }`}
        >
          {t.compElectronSettings.tabDiagnostics}
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-[var(--bg)] rounded-lg cursor-pointer hover:bg-gray-750 transition">
            <div>
              <span className="text-[var(--text)] font-medium">{t.compElectronSettings.autoStartLabel}</span>
              <p className="text-[var(--text)] text-sm">{t.compElectronSettings.autoStartDesc}</p>
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
              <span className="text-[var(--text)] font-medium">{t.compElectronSettings.minimizeToTrayLabel}</span>
              <p className="text-[var(--text)] text-sm">{t.compElectronSettings.minimizeToTrayDesc}</p>
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
              <span className="text-[var(--text)] font-medium">{t.compElectronSettings.notificationsLabel}</span>
              <p className="text-[var(--text)] text-sm">{t.compElectronSettings.notificationsDesc}</p>
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
              <span className="text-[var(--text)] font-medium">{t.compElectronSettings.autoUpdateLabel}</span>
              <p className="text-[var(--text)] text-sm">{t.compElectronSettings.autoUpdateDesc}</p>
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
            {saveState === 'saving' ? t.compElectronSettings.saving : t.compElectronSettings.saveSettings}
          </button>

          <p aria-live="polite" className="text-sm text-center min-h-5">
            {saveState === 'saved' && <span className="text-green-400">{t.compElectronSettings.settingsSaved}</span>}
            {saveState === 'error' && <span className="text-red-400">{t.compElectronSettings.saveFailed}</span>}
          </p>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition">
            <div>
              <span className="text-[var(--text)] font-medium">{t.compElectronSettings.hardwareAccelerationLabel}</span>
              <p className="text-[var(--text)] text-sm">{t.compElectronSettings.hardwareAccelerationDesc}</p>
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
              {t.compElectronSettings.hardwareAccelerationRestartNotice}
            </p>
          )}

          <div className="p-4 bg-[var(--bg)] rounded-lg">
            <h3 className="text-[var(--text)] font-medium mb-2">{t.compElectronSettings.systemInfoTitle}</h3>
            <div className="space-y-1 text-sm text-[var(--text)]">
              <p>{t.compElectronSettings.platform}: {appInfo?.platform}</p>
              <p>{t.compElectronSettings.architecture}: {appInfo?.arch}</p>
              <p>Electron: {appInfo?.electronVersion}</p>
              <p>Node: {appInfo?.nodeVersion}</p>
              <p>Chrome: {appInfo?.chromeVersion}</p>
            </div>
          </div>

          <button
            onClick={handleClearCache}
            className="w-full py-3 bg-red-500 text-[var(--text)] font-semibold rounded-lg hover:bg-red-600 transition"
          >
            {t.compElectronSettings.clearCache}
          </button>

          <button
            onClick={restartApp}
            className="w-full py-3 bg-[var(--bg)] text-[var(--text)] font-semibold rounded-lg hover:bg-gray-600 transition"
          >
            {t.compElectronSettings.restartApp}
          </button>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <div className="p-4 bg-[var(--bg)] rounded-lg">
            <h3 className="text-[var(--text)] font-medium mb-2">{t.compElectronSettings.appLogsTitle}</h3>
            <div className="bg-[var(--bg)] text-[var(--text)] rounded p-4 h-64 overflow-y-auto text-xs font-mono">
              {logs || t.compElectronSettings.noLogs}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleExportLogs}
              className="flex-1 py-3 bg-blue-500 text-[var(--text)] font-semibold rounded-lg hover:bg-blue-600 transition"
            >
              {t.compElectronSettings.exportLogs}
            </button>
            <button
              onClick={clearLogs}
              className="flex-1 py-3 bg-red-500 text-[var(--text)] font-semibold rounded-lg hover:bg-red-600 transition"
            >
              {t.compElectronSettings.clearLogs}
            </button>
          </div>

          <div className="p-4 bg-[var(--bg)] rounded-lg">
            <h3 className="text-[var(--text)] font-medium mb-2">{t.compElectronSettings.windowTestsTitle}</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={minimizeWindow}
                className="py-2 bg-[var(--bg)] text-[var(--text)] rounded hover:bg-gray-600 transition"
              >
                {t.compElectronSettings.minimize}
              </button>
              <button
                onClick={maximizeWindow}
                className="py-2 bg-[var(--bg)] text-[var(--text)] rounded hover:bg-gray-600 transition"
              >
                {t.compElectronSettings.maximize}
              </button>
              <button
                onClick={closeWindow}
                className="py-2 bg-red-500 text-[var(--text)] rounded hover:bg-red-600 transition"
              >
                {t.compElectronSettings.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
