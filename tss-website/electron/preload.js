const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  isElectron: true,
  
  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // External links
  openExternal: (url) => {
    // Validate URL before sending
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        ipcRenderer.send('open-external', url);
      } else {
        console.error('Invalid protocol:', parsedUrl.protocol);
      }
    } catch (error) {
      console.error('Invalid URL:', error);
    }
  },
  
  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // Update events
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (_, error) => callback(error)),
  onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (_, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_, info) => callback(info)),
  onUpdateChecking: (callback) => ipcRenderer.on('update-checking', () => callback()),
  
  // Deep link events
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (_, url) => callback(url)),
  
  // Remove listeners
  removeAllUpdateListeners: () => {
    ipcRenderer.removeAllListeners('update-available');
    ipcRenderer.removeAllListeners('update-not-available');
    ipcRenderer.removeAllListeners('update-error');
    ipcRenderer.removeAllListeners('update-download-progress');
    ipcRenderer.removeAllListeners('update-downloaded');
    ipcRenderer.removeAllListeners('update-checking');
  },
  
  // App paths
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Settings
  saveSettings: (settings) => {
    // Validate settings object
    if (typeof settings === 'object' && settings !== null) {
      // Returned so the renderer can await the write and read back the merged
      // result (including whether a restart is required).
      return ipcRenderer.invoke('save-settings', settings);
    }
    return Promise.resolve({ success: false, error: 'Invalid settings payload' });
  },
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // Session management
  saveSession: (sessionData) => {
    // Validate session data. The missing `return` here meant every caller
    // that does `await window.electron.saveSession(...)` (use-auth.tsx on
    // sign-in) resolved instantly with undefined instead of actually
    // waiting for the encrypted file write to finish, and any save failure
    // was silently swallowed instead of surfacing to the caller.
    if (typeof sessionData === 'object' && sessionData !== null) {
      return ipcRenderer.invoke('save-session', sessionData);
    }
    return Promise.resolve({ success: false, error: 'Invalid session payload' });
  },
  loadSession: () => ipcRenderer.invoke('load-session'),
  clearSession: () => ipcRenderer.invoke('clear-session'),
  
  // Notifications
  showNotification: (title, body, icon) => {
    // Validate notification parameters
    if (typeof title === 'string' && typeof body === 'string') {
      ipcRenderer.send('show-notification', { title, body, icon });
    }
  },
  
  // Network status
  isOnline: () => ipcRenderer.invoke('is-online'),
  
  // Network status events
  onOnline: (callback) => window.addEventListener('online', callback),
  onOffline: (callback) => window.addEventListener('offline', callback),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // App controls
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Logging
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  
  // Crash reporting
  getCrashReports: () => ipcRenderer.invoke('get-crash-reports'),
  clearCrashReports: () => ipcRenderer.invoke('clear-crash-reports'),

  // Game distribution
  games: {
    getLibrary: () => ipcRenderer.invoke('game-get-library'),
    chooseInstallDir: (suggestedFolderName) => ipcRenderer.invoke('game-choose-install-dir', { suggestedFolderName }),
    syncStart: (payload) => ipcRenderer.invoke('game-sync-start', payload),
    cancelSync: (gameId) => ipcRenderer.invoke('game-cancel-sync', { gameId }),
    launch: (gameId) => ipcRenderer.invoke('game-launch', { gameId }),
    uninstall: (gameId) => ipcRenderer.invoke('game-uninstall', { gameId }),
    getStatus: (gameId) => ipcRenderer.invoke('game-get-status', { gameId }),

    onSyncProgress: (callback) => ipcRenderer.on('game-sync-progress', (_, data) => callback(data)),
    onSyncComplete: (callback) => ipcRenderer.on('game-sync-complete', (_, data) => callback(data)),
    onSyncError: (callback) => ipcRenderer.on('game-sync-error', (_, data) => callback(data)),
    onSyncCancelled: (callback) => ipcRenderer.on('game-sync-cancelled', (_, data) => callback(data)),
    onProcessExit: (callback) => ipcRenderer.on('game-process-exit', (_, data) => callback(data)),
    onLibraryUpdated: (callback) => ipcRenderer.on('game-library-updated', (_, data) => callback(data)),

    removeAllGameListeners: () => {
      ipcRenderer.removeAllListeners('game-sync-progress');
      ipcRenderer.removeAllListeners('game-sync-complete');
      ipcRenderer.removeAllListeners('game-sync-error');
      ipcRenderer.removeAllListeners('game-sync-cancelled');
      ipcRenderer.removeAllListeners('game-process-exit');
      ipcRenderer.removeAllListeners('game-library-updated');
    },
  },
});
