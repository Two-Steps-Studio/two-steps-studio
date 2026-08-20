/**
 * Electron API type definitions for the renderer process
 * These types are exposed via the preload script
 */

export interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
  isElectron: true;
  
  // App version
  getAppVersion: () => Promise<string>;
  
  // App info
  getAppInfo: () => Promise<AppInfo>;
  
  // External links
  openExternal: (url: string) => void;
  
  // Auto-updater
  checkForUpdates: () => Promise<{ success: boolean; hasUpdate?: boolean; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => void;
  
  // Update events
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateNotAvailable: (callback: (info: UpdateInfo) => void) => void;
  onUpdateError: (callback: (error: Error) => void) => void;
  onUpdateDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => void;
  onUpdateChecking: (callback: () => void) => void;
  
  // Deep link events
  onDeepLink: (callback: (url: string) => void) => void;
  
  // Remove listeners
  removeAllUpdateListeners: () => void;
  
  // App paths
  getAppPath: () => Promise<string>;
  
  // Settings
  saveSettings: (settings: Record<string, any>) => Promise<{
    success: boolean;
    error?: string;
    settings?: Record<string, any>;
    /** hardwareAcceleration only takes effect on the next launch. */
    requiresRestart?: boolean;
  }>;
  loadSettings: () => Promise<Record<string, any>>;
  
  // Session management
  saveSession: (sessionData: SessionData) => Promise<{ success: boolean; error?: string }>;
  loadSession: () => Promise<SessionData | null>;
  clearSession: () => Promise<{ success: boolean; error?: string }>;
  
  // Notifications
  showNotification: (title: string, body: string, icon?: string) => void;
  
  // Network status
  isOnline: () => Promise<boolean>;
  
  // Network status events
  onOnline: (callback: () => void) => void;
  onOffline: (callback: () => void) => void;
  
  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  
  // App controls
  restartApp: () => Promise<void>;
  
  // Logging
  getLogs: () => Promise<{ success: boolean; logs?: string; error?: string }>;
  clearLogs: () => Promise<{ success: boolean; error?: string }>;
  
  // Crash reporting
  getCrashReports: () => Promise<{ success: boolean; reports?: CrashReport[]; error?: string }>;
  clearCrashReports: () => Promise<{ success: boolean; error?: string }>;
}

export interface CrashReport {
  timestamp: string;
  error: string;
  stack?: string;
  reason?: any;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  appVersion: string;
}

export interface AppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
}

export interface UpdateInfo {
  version: string;
  files: Array<{
    url: string;
    sha512: string;
    size: number;
  }>;
  path: string;
  sha512: string;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string;
}

export interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  expiresAt?: number;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
