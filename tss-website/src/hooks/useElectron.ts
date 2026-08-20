import { useEffect, useState, useCallback, useRef } from 'react';
import type { ElectronAPI, UpdateInfo, DownloadProgress, SessionData, AppInfo } from '@/types/electron';

/**
 * Hook to check if the app is running in Electron
 */
export function useIsElectron(): boolean {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && window.electron?.isElectron === true);
  }, []);

  return isElectron;
}

/**
 * Hook to get the app version
 */
export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);
  const isElectron = useIsElectron();

  useEffect(() => {
    if (isElectron) {
      window.electron.getAppVersion().then(setVersion);
    }
  }, [isElectron]);

  return version;
}

/**
 * Hook for auto-updater functionality
 */
export function useAutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const isElectron = useIsElectron();

  useEffect(() => {
    if (!isElectron) return;

    const electron = window.electron;

    // Set up event listeners
    electron.onUpdateAvailable((info) => {
      setUpdateAvailable(true);
      setUpdateInfo(info);
    });

    electron.onUpdateNotAvailable(() => {
      setUpdateAvailable(false);
      setUpdateInfo(null);
    });

    electron.onUpdateError((err) => {
      setError(err.message);
    });

    electron.onUpdateDownloadProgress((progress) => {
      setDownloadProgress(progress);
      setIsDownloading(true);
    });

    electron.onUpdateDownloaded((info) => {
      setIsDownloading(false);
      setIsUpdateDownloaded(true);
      setUpdateInfo(info);
    });

    electron.onUpdateChecking(() => {
      setIsChecking(true);
    });

    // Cleanup listeners on unmount
    return () => {
      electron.removeAllUpdateListeners();
    };
  }, [isElectron]);

  const checkForUpdates = useCallback(async () => {
    if (!isElectron) return;
    setIsChecking(true);
    const result = await window.electron.checkForUpdates();
    setIsChecking(false);
    if (!result.success) {
      setError(result.error || 'Failed to check for updates');
    }
  }, [isElectron]);

  const downloadUpdate = useCallback(async () => {
    if (!isElectron) return;
    setIsDownloading(true);
    const result = await window.electron.downloadUpdate();
    if (!result.success) {
      setError(result.error || 'Failed to download update');
      setIsDownloading(false);
    }
  }, [isElectron]);

  const installUpdate = useCallback(() => {
    if (!isElectron) return;
    window.electron.installUpdate();
  }, [isElectron]);

  return {
    updateAvailable,
    updateInfo,
    downloadProgress,
    isDownloading,
    isUpdateDownloaded,
    error,
    isChecking,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  };
}

/**
 * Hook for app settings persistence
 */
export function useAppSettings<T extends Record<string, any>>(defaultSettings: T) {
  const [settings, setSettings] = useState<T>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresRestart, setRequiresRestart] = useState(false);
  const isElectron = useIsElectron();

  // Held in a ref so callers can pass an inline object literal without the
  // load effect re-running on every render.
  const defaultsRef = useRef(defaultSettings);

  useEffect(() => {
    if (!isElectron) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    window.electron
      .loadSettings()
      .then((loadedSettings) => {
        if (cancelled) return;
        if (loadedSettings && Object.keys(loadedSettings).length > 0) {
          setSettings({ ...defaultsRef.current, ...loadedSettings });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isElectron]);

  const saveSettings = useCallback(
    async (newSettings: Partial<T>) => {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      if (!isElectron) return { success: false as const };

      const result = await window.electron.saveSettings(updatedSettings);
      if (result?.requiresRestart) {
        setRequiresRestart(true);
      }
      // The main process is the source of truth: it merges with its own
      // defaults and drops anything it does not recognise.
      if (result?.settings) {
        setSettings({ ...defaultsRef.current, ...result.settings } as T);
      }
      return result;
    },
    [settings, isElectron]
  );

  return { settings, saveSettings, isLoading, requiresRestart };
}

/**
 * Hook for session management
 */
export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isElectron = useIsElectron();

  useEffect(() => {
    if (!isElectron) {
      setIsLoading(false);
      return;
    }

    window.electron.loadSession().then((loadedSession) => {
      setSession(loadedSession);
      setIsLoading(false);
    });
  }, [isElectron]);

  const saveSession = useCallback(async (sessionData: SessionData) => {
    setSession(sessionData);

    if (isElectron) {
      await window.electron.saveSession(sessionData);
    }
  }, [isElectron]);

  const clearSession = useCallback(async () => {
    setSession(null);

    if (isElectron) {
      await window.electron.clearSession();
    }
  }, [isElectron]);

  return { session, saveSession, clearSession, isLoading };
}

/**
 * Hook for system notifications
 */
export function useNotification() {
  const isElectron = useIsElectron();

  const showNotification = useCallback((title: string, body: string, icon?: string) => {
    if (isElectron) {
      window.electron.showNotification(title, body, icon);
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification(title, { body, icon });
        }
      });
    }
  }, [isElectron]);

  return { showNotification };
}

/**
 * Hook for network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const isElectron = useIsElectron();

  useEffect(() => {
    if (!isElectron) {
      // Use browser's online/offline events
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      setIsOnline(navigator.onLine);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Use Electron's network check
    const checkNetwork = async () => {
      setIsChecking(true);
      const online = await window.electron.isOnline();
      setIsOnline(online);
      setIsChecking(false);
    };

    checkNetwork();

    // Set up event listeners
    const handleOnline = () => {
      setIsOnline(true);
      checkNetwork();
    };
    const handleOffline = () => setIsOnline(false);

    window.electron.onOnline(handleOnline);
    window.electron.onOffline(handleOffline);

    // Periodic check every 30 seconds
    const interval = setInterval(checkNetwork, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [isElectron]);

  const checkNetwork = useCallback(async () => {
    if (isElectron) {
      setIsChecking(true);
      const online = await window.electron.isOnline();
      setIsOnline(online);
      setIsChecking(false);
    } else {
      setIsOnline(navigator.onLine);
    }
  }, [isElectron]);

  return { isOnline, isChecking, checkNetwork };
}

/**
 * Hook to get app data path
 */
export function useAppPath(): string | null {
  const [appPath, setAppPath] = useState<string | null>(null);
  const isElectron = useIsElectron();

  useEffect(() => {
    if (isElectron) {
      window.electron.getAppPath().then(setAppPath);
    }
  }, [isElectron]);

  return appPath;
}

/**
 * Hook to get comprehensive app information
 */
export function useAppInfo(): AppInfo | null {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const isElectron = useIsElectron();

  useEffect(() => {
    if (isElectron) {
      window.electron.getAppInfo().then(setAppInfo);
    }
  }, [isElectron]);

  return appInfo;
}

/**
 * Hook for window controls
 */
export function useWindowControls() {
  const isElectron = useIsElectron();

  const minimizeWindow = useCallback(() => {
    if (isElectron) {
      window.electron.minimizeWindow();
    }
  }, [isElectron]);

  const maximizeWindow = useCallback(() => {
    if (isElectron) {
      window.electron.maximizeWindow();
    }
  }, [isElectron]);

  const closeWindow = useCallback(() => {
    if (isElectron) {
      window.electron.closeWindow();
    }
  }, [isElectron]);

  return { minimizeWindow, maximizeWindow, closeWindow };
}

/**
 * Hook for app controls
 */
export function useAppControls() {
  const isElectron = useIsElectron();

  const restartApp = useCallback(() => {
    if (isElectron) {
      window.electron.restartApp();
    }
  }, [isElectron]);

  return { restartApp };
}

/**
 * Hook for deep link handling
 */
export function useDeepLinks(callback: (url: string) => void) {
  const isElectron = useIsElectron();

  useEffect(() => {
    if (!isElectron) return;

    window.electron.onDeepLink(callback);

    return () => {
      // Note: Electron doesn't remove listeners the same way, but this is for cleanup
    };
  }, [callback, isElectron]);
}

/**
 * Hook for logging
 */
export function useAppLogs() {
  const [logs, setLogs] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isElectron = useIsElectron();

  const getLogs = useCallback(async () => {
    if (!isElectron) return;
    setIsLoading(true);
    const result = await window.electron.getLogs();
    setIsLoading(false);
    if (result.success && result.logs) {
      setLogs(result.logs);
    }
  }, [isElectron]);

  const clearLogs = useCallback(async () => {
    if (!isElectron) return;
    await window.electron.clearLogs();
    setLogs(null);
  }, [isElectron]);

  return { logs, isLoading, getLogs, clearLogs };
}

/**
 * Hook for crash reporting
 */
export function useCrashReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isElectron = useIsElectron();

  const getCrashReports = useCallback(async () => {
    if (!isElectron) return;
    setIsLoading(true);
    const result = await window.electron.getCrashReports();
    setIsLoading(false);
    if (result.success && result.reports) {
      setReports(result.reports);
    }
  }, [isElectron]);

  const clearCrashReports = useCallback(async () => {
    if (!isElectron) return;
    await window.electron.clearCrashReports();
    setReports([]);
  }, [isElectron]);

  return { reports, isLoading, getCrashReports, clearCrashReports };
}
