import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  ElectronAPI, UpdateInfo, DownloadProgress, SessionData, AppInfo,
  LibraryEntry, GameSyncProgress, GameSyncCompleteEvent, GameSyncErrorEvent,
  GameProcessExitEvent, GameLibraryUpdatedEvent, GameSyncMode, GameSyncFileEntry,
} from '@/types/electron';

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

// ============================================
// Game distribution
// ============================================

// Internal fan-out bus: the preload API only exposes "add a listener" and
// "remove ALL listeners for this channel" (see removeAllGameListeners in
// preload.js). Multiple simultaneous useGameDownload instances (one per
// game card in a library list) each need their own subscribe/unsubscribe
// without stepping on each other, so the six IPC channels are wired up
// exactly once per app lifetime here and fanned out to per-hook callback
// sets instead of letting each hook instance touch ipcRenderer directly.
type GameEventName = 'progress' | 'complete' | 'error' | 'cancelled' | 'processExit' | 'libraryUpdated';
const gameEventListeners: Record<GameEventName, Set<(data: any) => void>> = {
  progress: new Set(),
  complete: new Set(),
  error: new Set(),
  cancelled: new Set(),
  processExit: new Set(),
  libraryUpdated: new Set(),
};
let gameEventBusInitialized = false;

function ensureGameEventBus() {
  if (gameEventBusInitialized || typeof window === 'undefined' || !window.electron?.games) return;
  gameEventBusInitialized = true;
  const g = window.electron.games;
  g.onSyncProgress((data) => gameEventListeners.progress.forEach((cb) => cb(data)));
  g.onSyncComplete((data) => gameEventListeners.complete.forEach((cb) => cb(data)));
  g.onSyncError((data) => gameEventListeners.error.forEach((cb) => cb(data)));
  g.onSyncCancelled((data) => gameEventListeners.cancelled.forEach((cb) => cb(data)));
  g.onProcessExit((data) => gameEventListeners.processExit.forEach((cb) => cb(data)));
  g.onLibraryUpdated((data) => gameEventListeners.libraryUpdated.forEach((cb) => cb(data)));
}

function useGameEvent<T>(name: GameEventName, handler: (data: T) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    ensureGameEventBus();
    gameEventListeners[name].add(handler as (data: any) => void);
    return () => {
      gameEventListeners[name].delete(handler as (data: any) => void);
    };
  }, [name, handler, enabled]);
}

/**
 * Hook for the local installed-games library (Electron-only, local disk
 * state — see electron/game-manager.js's game-library.json).
 */
export function useGameLibrary() {
  const isElectron = useIsElectron();
  const [library, setLibrary] = useState<Record<string, LibraryEntry>>({});
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isElectron) {
      setIsLoading(false);
      return;
    }
    const result = await window.electron.games.getLibrary();
    if (result.success && result.library) {
      setLibrary(result.library);
    }
    setIsLoading(false);
  }, [isElectron]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onLibraryUpdated = useCallback((data: GameLibraryUpdatedEvent) => {
    setLibrary((prev) => {
      const next = { ...prev };
      if (data.entry) {
        next[data.gameId] = data.entry;
      } else {
        delete next[data.gameId];
      }
      return next;
    });
  }, []);
  useGameEvent('libraryUpdated', onLibraryUpdated, isElectron);

  return { library, isLoading, refresh };
}

export type GameDownloadStatus =
  | 'not-installed' | 'checking' | 'downloading' | 'verifying'
  | 'installed' | 'update-available' | 'updating' | 'repairing'
  | 'running' | 'error';

/**
 * Orchestrates one game's full install/update/repair/launch/uninstall
 * lifecycle: fetches the manifest + signed URLs from the Next.js API
 * (same-origin, cookie session already attached), hands a flat file list
 * to the Electron main process over one IPC call, and tracks progress —
 * same state-machine shape as useAutoUpdater() above.
 */
export function useGameDownload(gameId: number, platform: string = 'windows') {
  const isElectron = useIsElectron();
  const { library, refresh: refreshLibrary } = useGameLibrary();
  const gameIdStr = String(gameId);
  const libraryEntry = library[gameIdStr] || null;

  const [currentReleaseId, setCurrentReleaseId] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<GameDownloadStatus | null>(null);
  const [progress, setProgress] = useState<GameSyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pid, setPid] = useState<number | null>(null);
  const modeRef = useRef<GameSyncMode>('install');

  const fetchCurrentRelease = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/releases/current?platform=${encodeURIComponent(platform)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setCurrentReleaseId(data.data.id);
        setCurrentVersion(data.data.version);
      } else {
        setCurrentReleaseId(null);
        setCurrentVersion(null);
      }
    } catch (err) {
      console.error('Failed to fetch current release:', err);
    }
  }, [gameId, platform]);

  useEffect(() => {
    fetchCurrentRelease();
  }, [fetchCurrentRelease]);

  // The main process already tracks running/syncing state independently of
  // any particular component instance (electron/game-manager.js's
  // runningProcesses/activeSyncControllers, exposed over game-get-status),
  // but this hook only ever set pid/activePhase from launch()'s own return
  // value and live progress/exit events - both reset to null on mount. A
  // game already running (or mid-sync) before this page was opened, or
  // still running after navigating away and back, showed as
  // "not-installed"/"installed" here until an event happened to fire.
  useEffect(() => {
    if (!isElectron) return;
    let cancelled = false;
    window.electron.games.getStatus(gameIdStr).then((result) => {
      if (cancelled) return;
      if (result.status === 'running') {
        setPid(result.pid ?? null);
      } else if (result.status === 'syncing') {
        setActivePhase('checking');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isElectron, gameIdStr]);

  const matchesThisGame = useCallback((data: { gameId: string }) => data.gameId === gameIdStr, [gameIdStr]);

  useGameEvent<GameSyncProgress>('progress', (data) => {
    if (!matchesThisGame(data)) return;
    setProgress(data);
    setActivePhase(data.phase === 'verifying' ? 'verifying' : modeRef.current === 'update' ? 'updating' : modeRef.current === 'repair' ? 'repairing' : 'downloading');
  }, isElectron);

  useGameEvent<GameSyncCompleteEvent>('complete', (data) => {
    if (!matchesThisGame(data)) return;
    setActivePhase(null);
    setProgress(null);
    refreshLibrary();
    fetchCurrentRelease();
  }, isElectron);

  useGameEvent<GameSyncErrorEvent>('error', (data) => {
    if (!matchesThisGame(data)) return;
    setError(data.error);
    setActivePhase('error');
    setProgress(null);
  }, isElectron);

  useGameEvent<{ gameId: string }>('cancelled', (data) => {
    if (!matchesThisGame(data)) return;
    setActivePhase(null);
    setProgress(null);
  }, isElectron);

  useGameEvent<GameProcessExitEvent>('processExit', (data) => {
    if (!matchesThisGame(data)) return;
    setPid(null);
  }, isElectron);

  const runSync = useCallback(async (mode: GameSyncMode, installDirOverride?: string) => {
    if (!isElectron || !currentReleaseId) return;
    setError(null);

    const installDir = installDirOverride || libraryEntry?.installDir;
    if (!installDir) {
      setError('Nie wybrano lokalizacji instalacji');
      return;
    }

    try {
      const manifestRes = await fetch(`/api/games/${gameId}/releases/${currentReleaseId}/manifest`);
      const manifestData = await manifestRes.json();
      if (!manifestData.success) throw new Error(manifestData.error || 'Nie udało się pobrać manifestu');

      const files = manifestData.data.manifest.files as { path: string; size: number; sha256: string }[];
      const executablePath = manifestData.data.executable_path as string;
      const version = manifestData.data.version as string;

      // Repair only needs URLs for files that don't already match locally,
      // but re-signing everything is cheap (no bytes moved) and simpler —
      // the main process still skips files that already verify by hash.
      const paths = files.map((f) => f.path);
      const urlsRes = await fetch(`/api/games/${gameId}/releases/${currentReleaseId}/signed-urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      const urlsData = await urlsRes.json();
      if (!urlsData.success) throw new Error(urlsData.error || 'Nie udało się uzyskać adresów pobierania');

      const urlByPath = new Map<string, string>(urlsData.data.urls.map((u: { path: string; signedUrl: string }) => [u.path, u.signedUrl]));
      const syncFiles: GameSyncFileEntry[] = files
        .filter((f) => urlByPath.has(f.path))
        .map((f) => ({ ...f, signedUrl: urlByPath.get(f.path)! }));

      modeRef.current = mode;
      setActivePhase(mode === 'update' ? 'updating' : mode === 'repair' ? 'repairing' : 'downloading');

      const result = await window.electron.games.syncStart({
        gameId: gameIdStr,
        releaseId: currentReleaseId,
        version,
        platform,
        mode,
        installDir,
        executablePath,
        files: syncFiles,
      });
      if (!result.success) throw new Error(result.error || 'Nie udało się rozpocząć synchronizacji');
    } catch (err: any) {
      setError(err.message || 'Nieznany błąd');
      setActivePhase('error');
    }
  }, [isElectron, currentReleaseId, libraryEntry, gameId, gameIdStr, platform]);

  const install = useCallback(async (suggestedFolderName: string) => {
    if (!isElectron) return;
    const dirResult = await window.electron.games.chooseInstallDir(suggestedFolderName);
    if (dirResult.canceled || !dirResult.path) return;
    await runSync('install', dirResult.path);
  }, [isElectron, runSync]);

  const update = useCallback(() => runSync('update'), [runSync]);
  const repair = useCallback(() => runSync('repair'), [runSync]);

  const cancel = useCallback(async () => {
    if (!isElectron) return;
    await window.electron.games.cancelSync(gameIdStr);
  }, [isElectron, gameIdStr]);

  const launch = useCallback(async () => {
    if (!isElectron) return;
    setError(null);
    const result = await window.electron.games.launch(gameIdStr);
    if (!result.success) {
      setError(result.error || 'Nie udało się uruchomić gry');
      return;
    }
    setPid(result.pid || null);
  }, [isElectron, gameIdStr]);

  const uninstall = useCallback(async () => {
    if (!isElectron) return;
    const result = await window.electron.games.uninstall(gameIdStr);
    if (!result.success) {
      setError(result.error || 'Nie udało się odinstalować gry');
      return;
    }
    refreshLibrary();
  }, [isElectron, gameIdStr, refreshLibrary]);

  let status: GameDownloadStatus;
  if (activePhase) {
    status = activePhase;
  } else if (pid) {
    status = 'running';
  } else if (!libraryEntry) {
    status = 'not-installed';
  } else if (currentVersion && libraryEntry.version !== currentVersion) {
    status = 'update-available';
  } else {
    status = 'installed';
  }

  return {
    status, progress, error, libraryEntry, currentVersion,
    install, update, repair, cancel, launch, uninstall,
  };
}
