const { app, BrowserWindow, shell, ipcMain, Notification, nativeImage, session, protocol, Tray, Menu, globalShortcut, safeStorage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const gameManager = require('./game-manager');
const updater = require('./updater');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow;
let nextServer = null;
let updateAvailable = false;
let tray = null;

// Logging infrastructure
const logFile = path.join(app.getPath('userData'), 'app.log');
const errorLogFile = path.join(app.getPath('userData'), 'error.log');

// User settings (surfaced by the first-run wizard and the settings panel).
// Persisted in userData/settings.json and applied to the main process here —
// the renderer only ever reads and writes them, it cannot enforce them.
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const DEFAULT_SETTINGS = {
  autoStart: false,
  minimizeToTray: true,
  notifications: true,
  autoUpdate: true,
  hardwareAcceleration: true,
};
let appSettings = { ...DEFAULT_SETTINGS };
// Set while quitting so the minimize-to-tray close handler lets the app exit.
let isQuitting = false;

function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      // Strip a UTF-8 BOM: editors and PowerShell's Set-Content add one, and
      // JSON.parse rejects it, which would silently drop every saved setting.
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8').replace(/^﻿/, '');
      const stored = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...stored };
    }
  } catch (error) {
    // Cannot use log() here: it may run before the log file path is usable.
    console.error('Failed to read settings, falling back to defaults:', error.message);
  }
  return { ...DEFAULT_SETTINGS };
}

function applySettings() {
  // Start with Windows. Only meaningful for an installed build — pointing the
  // login item at a dev-mode electron.exe would launch the wrong thing.
  if (app.isPackaged) {
    try {
      app.setLoginItemSettings({ openAtLogin: appSettings.autoStart === true, path: process.execPath });
    } catch (error) {
      log('ERROR', 'Failed to apply auto-start setting', error.message);
    }
  }

  // Whether the updater pulls a new version down on its own. The manual
  // "download update" IPC call still works either way.
  updater.configure({ autoDownload: appSettings.autoUpdate === true });
}

// Must be decided before the app is ready; Electron ignores it afterwards.
appSettings = readSettings();
if (appSettings.hardwareAcceleration === false) {
  app.disableHardwareAcceleration();
}

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;
  
  try {
    fs.appendFileSync(logFile, logMessage);
    if (level === 'ERROR') {
      fs.appendFileSync(errorLogFile, logMessage);
    }
    console.log(logMessage.trim());
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Session management with encryption
const SESSION_FILE = path.join(app.getPath('userData'), 'session.enc');

// SECURITY: this used to derive its AES key from a hardcoded literal
// ('tss-session-key' + a hardcoded 'salt'), baked into source that's on a
// public GitHub repo — anyone could derive the exact same key, so the
// Supabase access/refresh tokens in session.enc were only encoded, not
// meaningfully encrypted, against anyone who could read the file (malware,
// a compromised backup/sync tool, etc). Electron's safeStorage encrypts
// through the OS's own credential store (DPAPI/Keychain/libsecret), keyed
// to this machine and user, which a copied file can't be decrypted without.
// The old scheme is kept as `legacyDecrypt` purely to migrate an
// already-saved session.enc from before this fix without forcing a
// re-login; nothing writes with it anymore.
const LEGACY_ENCRYPTION_KEY = crypto.scryptSync('tss-session-key', 'salt', 32);
const LEGACY_ALGORITHM = 'aes-256-cbc';

function legacyDecrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv(LEGACY_ALGORITHM, LEGACY_ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
}

function saveSession(sessionData) {
  try {
    const plaintext = JSON.stringify(sessionData);
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(SESSION_FILE, safeStorage.encryptString(plaintext));
    } else {
      // No OS credential store available (some headless/minimal Linux
      // setups) - fall back to the legacy scheme rather than failing
      // outright. Still logged in, just with the weaker guarantee.
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(LEGACY_ALGORITHM, LEGACY_ENCRYPTION_KEY, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      fs.writeFileSync(SESSION_FILE, iv.toString('hex') + ':' + encrypted);
      log('WARN', 'safeStorage unavailable, session saved with legacy encryption');
    }
    log('INFO', 'Session saved successfully');
  } catch (error) {
    log('ERROR', 'Error saving session', error.message);
  }
}

function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const raw = fs.readFileSync(SESSION_FILE);
      let decrypted = null;
      if (safeStorage.isEncryptionAvailable()) {
        try {
          decrypted = safeStorage.decryptString(raw);
        } catch {
          // Not safeStorage's format - most likely a session.enc from
          // before this fix. Fall through to the legacy path below.
        }
      }
      if (!decrypted) {
        decrypted = legacyDecrypt(raw.toString('utf-8'));
        if (decrypted) {
          // Migrate it to safeStorage now that we know it's readable, so
          // this fallback only ever runs once per install.
          saveSession(JSON.parse(decrypted));
        }
      }
      if (decrypted) {
        return JSON.parse(decrypted);
      }
    }
  } catch (error) {
    log('ERROR', 'Error loading session', error.message);
  }
  return null;
}

// Port the packaged Next.js server listens on. Resolved at startup from the
// OS so a running `npm run dev` on 6767 never collides with the desktop app.
let serverPort = 3000;

function getStartUrl() {
  return isDev ? 'http://localhost:6767' : `http://127.0.0.1:${serverPort}`;
}

function findFreePort() {
  const net = require('net');
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

function waitForServer(port, timeoutMs = 60000) {
  const net = require('net');
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      const retry = () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`Server did not start listening on ${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 250);
        }
      };
      socket.once('error', retry);
      socket.once('timeout', retry);
      socket.connect(port, '127.0.0.1', () => {
        socket.destroy();
        resolve();
      });
    };
    attempt();
  });
}

// The production server is Next.js' `output: 'standalone'` bundle. When
// packaged it is copied next to app.asar (extraResources), because a child
// process cannot read files from inside an asar archive. When running an
// unpackaged production build it sits in .next/standalone.
function resolveServerEntry() {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'app-server', 'server.js') : null,
    path.join(__dirname, '..', '.next', 'standalone', 'server.js'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function startNextServer() {
  if (isDev) return;

  const serverEntry = resolveServerEntry();
  if (!serverEntry) {
    log('ERROR', 'Standalone server bundle not found — run `npm run build` with ELECTRON=true');
    showNotification('Błąd serwera', 'Brak plików serwera aplikacji');
    return;
  }

  serverPort = await findFreePort();
  log('INFO', `Starting Next.js server from ${serverEntry} on port ${serverPort}`);

  // process.execPath is the app's own Electron binary; ELECTRON_RUN_AS_NODE
  // makes it behave as a plain Node runtime, so the machine does not need a
  // separate Node.js installation.
  nextServer = spawn(process.execPath, [serverEntry], {
    cwd: path.dirname(serverEntry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(serverPort),
      HOSTNAME: '127.0.0.1',
      NEXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: false,
  });

  nextServer.stdout.on('data', (data) => {
    log('INFO', 'Next.js output', data.toString().trim());
  });

  nextServer.stderr.on('data', (data) => {
    log('ERROR', 'Next.js error', data.toString().trim());
  });

  nextServer.on('error', (error) => {
    log('ERROR', 'Failed to start Next.js server', error.message);
    showNotification('Błąd serwera', 'Nie udało się uruchomić serwera aplikacji');
  });

  nextServer.on('exit', (code) => {
    log('INFO', `Next.js server exited with code ${code}`);
  });

  await waitForServer(serverPort);
  log('INFO', 'Next.js server is ready!');
}

// public/ is not packed into app.asar — it ships with the standalone server
// under resources/app-server. Resolve against whichever location exists so the
// same call works in dev, in an unpackaged production run, and when packaged.
function resolveAppAsset(relativePath) {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'app-server', 'public', relativePath) : null,
    path.join(__dirname, '..', 'public', relativePath),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[candidates.length - 1];
}

function createTray() {
  try {
    const iconPath = resolveAppAsset('assets/Logo/Glowne/Two Steps Studio Bez Tła.png');
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Pokaż Two Steps Studio',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Sprawdź aktualizacje',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.send('check-updates');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Zamknij',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('Two Steps Studio');
    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    log('INFO', 'System tray created');
  } catch (error) {
    log('ERROR', 'Failed to create system tray', error.message);
  }
}

function createWindow() {
  log('INFO', 'Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#000000',
    titleBarStyle: 'default',
    frame: true,
    show: false,
    title: 'Two Steps Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      sandbox: true,
      experimentalFeatures: false,
      allowRunningInsecureContent: false,
      plugins: false,
      webGL: true,
      autoplayPolicy: 'user-gesture-required',
      // Performance optimizations
      backgroundThrottling: false,
      offscreen: false,
      // Additional security
      safeDialogs: true,
      navigateOnDragDrop: false,
    },
  });

  const loadApp = () => {
    const startTime = Date.now();
    mainWindow.loadURL(getStartUrl()).catch((err) => {
      log('ERROR', 'Failed to load URL', err.message);
      if (!isDev) {
        setTimeout(loadApp, 2000);
      } else {
        showNotification('Błąd ładowania', 'Nie udało się załadować aplikacji');
      }
    });
    
    mainWindow.webContents.once('did-finish-load', () => {
      const loadTime = Date.now() - startTime;
      log('INFO', `Application loaded in ${loadTime}ms`);
    });
  };

  if (!isDev) {
    // Load only once the server actually accepts connections, instead of
    // guessing with a fixed delay.
    startNextServer()
      .then(loadApp)
      .catch((error) => {
        log('ERROR', 'Server startup failed', error.message);
        showNotification('Błąd serwera', 'Nie udało się uruchomić serwera aplikacji');
      });
  } else {
    loadApp();
  }

  mainWindow.once('ready-to-show', () => {
    log('INFO', 'Window ready to show');
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Minimize to tray keeps the app alive on window close; the tray menu and
  // before-quit both set isQuitting so a real exit is never blocked.
  mainWindow.on('close', (event) => {
    if (appSettings.minimizeToTray !== false && !isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      log('INFO', 'Window hidden to tray');
    }
  });

  mainWindow.on('closed', () => {
    log('INFO', 'Window closed');
    mainWindow = null;
  });

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
    if (tray) {
      tray.displayBalloon({
        title: 'Two Steps Studio',
        content: 'Aplikacja działa w tle. Kliknij ikonę, aby przywrócić.',
      });
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        shell.openExternal(url);
      }
    } catch (error) {
      log('ERROR', 'Failed to open external URL', error.message);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const startUrlParsed = new URL(getStartUrl());
      
      if (parsedUrl.origin !== startUrlParsed.origin) {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    } catch (error) {
      log('ERROR', 'Navigation error', error.message);
    }
  });

  // Security: Prevent new window creation
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Security: Handle certificate errors
  mainWindow.webContents.on('certificate-error', (event, url, error, certificate) => {
    if (isDev) {
      event.preventDefault();
    } else {
      log('ERROR', 'Certificate error', { url, error });
    }
  });

  // Security: Handle console messages in production
  if (!isDev) {
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level === 'error') {
        log('ERROR', 'Renderer console error', { message, line, sourceId });
      }
    });
  }
  
  // Performance: Monitor memory usage
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    log('INFO', 'Memory usage', {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
    });
  }, 60000); // Every minute
}

function showNotification(title, body, icon = null) {
  try {
    if (appSettings.notifications === false) {
      return;
    }
    if (Notification.isSupported()) {
      const iconPath = icon || resolveAppAsset('assets/Logo/Glowne/Two Steps Studio Bez Tła.png');
      const notification = new Notification({
        title,
        body,
        icon: nativeImage.createFromPath(iconPath),
      });
      notification.show();
      log('INFO', 'Notification shown', { title });
    }
  } catch (error) {
    log('ERROR', 'Failed to show notification', error.message);
  }
}

// Protocol registration for deep links
function registerProtocols() {
  try {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'tss',
        privileges: {
          secure: true,
          standard: true,
          supportFetchAPI: true,
        },
      },
    ]);
    log('INFO', 'Protocols registered');
  } catch (error) {
    log('ERROR', 'Failed to register protocols', error.message);
  }
}

// Handle deep links
function handleProtocol(url) {
  log('INFO', 'Deep link received', url);
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('deep-link', url);
  }
}

// Must run before the app is ready — Electron rejects
// registerSchemesAsPrivileged once the 'ready' event has already fired.
registerProtocols();

app.whenReady().then(() => {
  log('INFO', 'App starting...');
  applySettings();
  createWindow();
  createTray();

  // Register protocol handler
  protocol.handle('tss://*', (request) => {
    handleProtocol(request.url);
    return new Response('OK');
  });

  // Handle second instance (Windows)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    log('INFO', 'Second instance detected');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log('INFO', 'All windows closed');
  if (nextServer) {
    nextServer.kill();
  }
  if (tray) {
    tray.destroy();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  log('INFO', 'App quitting');
  if (nextServer) {
    nextServer.kill();
  }
  if (tray) {
    tray.destroy();
  }
});

// Global error handlers
process.on('uncaughtException', (error) => {
  log('ERROR', 'Uncaught exception', error.message);
  log('ERROR', 'Exception stack', error.stack);
  showNotification('Błąd krytyczny', 'Wystąpił nieoczekiwany błąd. Aplikacja może nie działać poprawnie.');
  
  // Save crash report
  try {
    const crashReportPath = path.join(app.getPath('userData'), 'crash-reports');
    if (!fs.existsSync(crashReportPath)) {
      fs.mkdirSync(crashReportPath, { recursive: true });
    }
    const crashReportFile = path.join(crashReportPath, `crash-${Date.now()}.json`);
    const crashReport = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      appVersion: app.getVersion(),
    };
    fs.writeFileSync(crashReportFile, JSON.stringify(crashReport, null, 2));
    log('INFO', 'Crash report saved', crashReportFile);
  } catch (reportError) {
    log('ERROR', 'Failed to save crash report', reportError.message);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', 'Unhandled rejection', reason);
  
  // Save rejection report
  try {
    const crashReportPath = path.join(app.getPath('userData'), 'crash-reports');
    if (!fs.existsSync(crashReportPath)) {
      fs.mkdirSync(crashReportPath, { recursive: true });
    }
    const rejectionReportFile = path.join(crashReportPath, `rejection-${Date.now()}.json`);
    const rejectionReport = {
      timestamp: new Date().toISOString(),
      reason: reason,
      platform: process.platform,
      arch: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      appVersion: app.getVersion(),
    };
    fs.writeFileSync(rejectionReportFile, JSON.stringify(rejectionReport, null, 2));
    log('INFO', 'Rejection report saved', rejectionReportFile);
  } catch (reportError) {
    log('ERROR', 'Failed to save rejection report', reportError.message);
  }
});

app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
  
  // Security: Prevent devtools in production
  if (!isDev) {
    contents.on('devtools-opened', () => {
      contents.closeDevTools();
    });
  }
});

// ---------------------------------------------------------------------------
// Auto-updater — driven by electron/updater.js. The module wires GitHub
// Releases as the only feed, runs the SemVer comparison, coalesces
// concurrent checks, and emits all updater events to the renderer via a
// single send() callback supplied here. The renderer never talks to
// electron-updater directly.
// ---------------------------------------------------------------------------

function sendUpdate(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function initUpdater() {
  updater.init({
    log,
    send: sendUpdate,
    getMainWindow: () => mainWindow,
    app,
    // env override so the same compiled binary can be flipped between
    // stable / beta / nightly by changing TSS_UPDATE_CHANNEL at build time.
    channel: process.env.TSS_UPDATE_CHANNEL || updater.DEFAULT_CHANNEL,
  });

  updater.configure({ autoDownload: appSettings.autoUpdate === true });
  updater.schedulePeriodicCheck({ log, send: sendUpdate, getMainWindow: () => mainWindow, app });

  // A successful "available" event flips the tray menu entry so a
  // user who already dismissed the dialog can re-trigger it from there.
  updater.bus.on('update-available', (info) => {
    updateAvailable = true;
    showNotification('Dostępna aktualizacja', `Nowa wersja ${info && info.version} jest dostępna!`);
  });
  updater.bus.on('update-not-available', () => {
    updateAvailable = false;
  });
}

if (!isDev) {
  initUpdater();

  // Initial check after the window has had a chance to attach its
  // update listeners. Doing this 30s after startup keeps the very first
  // launch feeling snappy on slow networks.
  setTimeout(() => {
    if (appSettings.autoUpdate === false) {
      log('INFO', '[Updater] Skipping startup update check (autoUpdate disabled)');
      return;
    }
    updater.checkForUpdates({ log, send: sendUpdate, getMainWindow: () => mainWindow, app }).catch((error) => {
      log('ERROR', `[Updater] Initial check crashed: ${error && error.message ? error.message : error}`);
    });
  }, 30000);
}

// IPC handlers with validation and error handling
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('is-electron', () => {
  return true;
});

ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
    arch: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
  };
});

ipcMain.handle('check-for-updates', async () => {
  try {
    log('INFO', '[Updater] Manual update check requested');
    const result = await updater.checkForUpdates({ log, send: sendUpdate, getMainWindow: () => mainWindow, app });
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, hasUpdate: !!result.updateAvailable, updateInfo: result.updateInfo };
  } catch (error) {
    log('ERROR', `[Updater] Manual update check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    log('INFO', '[Updater] Manual download requested');

    // A short offline probe prevents a confusing "downloaded 0 bytes" path
    // when the user clicked Update while disconnected. Fail fast, surface
    // the reason to the renderer.
    const net = require('net');
    const isOnline = await new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 3000);

      socket.connect(80, '8.8.8.8', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    if (!isOnline) {
      throw new Error('Brak połączenia z internetem. Nie można pobrać aktualizacji.');
    }

    const result = await updater.downloadUpdate({ log });
    return result;
  } catch (error) {
    log('ERROR', `[Updater] Manual download failed: ${error.message}`);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  updater.installUpdate({ log, app });
});

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('get-logs', async () => {
  try {
    const logs = fs.readFileSync(logFile, 'utf-8');
    return { success: true, logs };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-logs', async () => {
  try {
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    if (fs.existsSync(errorLogFile)) {
      fs.unlinkSync(errorLogFile);
    }
    log('INFO', 'Logs cleared');
    return { success: true };
  } catch (error) {
    log('ERROR', 'Failed to clear logs', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-settings', async (_, settings) => {
  try {
    if (typeof settings !== 'object' || settings === null) {
      return { success: false, error: 'Invalid settings payload' };
    }

    // Only accept known keys, and only booleans — the renderer is not trusted
    // to decide what lives in this file.
    const incoming = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      if (typeof settings[key] === 'boolean') {
        incoming[key] = settings[key];
      }
    }

    const previous = appSettings;
    appSettings = { ...appSettings, ...incoming };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(appSettings, null, 2));
    applySettings();
    log('INFO', 'Settings saved', appSettings);

    return {
      success: true,
      settings: appSettings,
      // Hardware acceleration can only be toggled before the app is ready.
      requiresRestart: appSettings.hardwareAcceleration !== previous.hardwareAcceleration,
    };
  } catch (error) {
    log('ERROR', 'Failed to save settings', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async () => {
  // appSettings is the merged view of defaults + settings.json, and is the
  // same object the main process actually enforces.
  return { ...appSettings };
});

ipcMain.on('show-notification', (_, { title, body, icon }) => {
  showNotification(title, body, icon);
});

ipcMain.on('open-external', (_, url) => {
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
      shell.openExternal(url);
      log('INFO', 'External link opened', url);
    } else {
      log('WARN', 'Blocked external link with invalid protocol', url);
    }
  } catch (error) {
    log('ERROR', 'Failed to open external link', error.message);
  }
});

ipcMain.handle('is-online', async () => {
  const net = require('net');
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 3000);
    
    socket.connect(80, '8.8.8.8', () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
});

ipcMain.handle('save-session', async (_, sessionData) => {
  try {
    saveSession(sessionData);
    return { success: true };
  } catch (error) {
    log('ERROR', 'Failed to save session', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-session', async () => {
  try {
    return loadSession();
  } catch (error) {
    log('ERROR', 'Failed to load session', error.message);
    return null;
  }
});

ipcMain.handle('clear-session', async () => {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
    }
    if (mainWindow) {
      mainWindow.webContents.session.clearStorageData();
      mainWindow.webContents.session.clearCache();
    }
    log('INFO', 'Session cleared');
    return { success: true };
  } catch (error) {
    log('ERROR', 'Failed to clear session', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('get-crash-reports', async () => {
  try {
    const crashReportPath = path.join(app.getPath('userData'), 'crash-reports');
    if (!fs.existsSync(crashReportPath)) {
      return { success: true, reports: [] };
    }
    
    const files = fs.readdirSync(crashReportPath);
    const reports = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(crashReportPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return { success: true, reports };
  } catch (error) {
    log('ERROR', 'Failed to get crash reports', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-crash-reports', async () => {
  try {
    const crashReportPath = path.join(app.getPath('userData'), 'crash-reports');
    if (fs.existsSync(crashReportPath)) {
      fs.rmSync(crashReportPath, { recursive: true, force: true });
    }
    log('INFO', 'Crash reports cleared');
    return { success: true };
  } catch (error) {
    log('ERROR', 'Failed to clear crash reports', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('restart-app', () => {
  log('INFO', 'App restart requested');
  app.relaunch();
  app.exit();
});

// ---------------------------------------------------------------------------
// Game distribution — see electron/game-manager.js for the actual engine.
// This module never touches Supabase auth: the renderer already has an
// authenticated session and hands over a flat, pre-signed file list.
// ---------------------------------------------------------------------------

function sendGameEvent(channel, payload) {
  if (mainWindow) {
    mainWindow.webContents.send(channel, payload);
  }
}

ipcMain.handle('game-get-library', async () => {
  try {
    return { success: true, library: gameManager.getLibraryForUser(loadSession) };
  } catch (error) {
    log('ERROR', 'game-get-library failed', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game-choose-install-dir', async (_, { suggestedFolderName }) => {
  try {
    return await gameManager.chooseInstallDir(suggestedFolderName);
  } catch (error) {
    log('ERROR', 'game-choose-install-dir failed', error.message);
    return { canceled: true, error: error.message };
  }
});

ipcMain.handle('game-sync-start', async (_, payload) => {
  try {
    // Runs to completion in the background; progress/result come via events
    // (game-sync-progress/complete/error/cancelled) so this ack returns fast.
    gameManager.syncEngine(loadSession, sendGameEvent, payload).catch((error) => {
      log('ERROR', 'game-sync-start background failure', error.message);
    });
    return { success: true };
  } catch (error) {
    log('ERROR', 'game-sync-start failed', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game-cancel-sync', async (_, { gameId }) => {
  return { success: gameManager.cancelSync(gameId) };
});

ipcMain.handle('game-launch', async (_, { gameId }) => {
  try {
    return gameManager.launchGame(loadSession, sendGameEvent, gameId);
  } catch (error) {
    log('ERROR', 'game-launch failed', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game-uninstall', async (_, { gameId }) => {
  try {
    return gameManager.uninstallGame(loadSession, sendGameEvent, gameId);
  } catch (error) {
    log('ERROR', 'game-uninstall failed', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('game-get-status', async (_, { gameId }) => {
  return gameManager.getStatus(gameId);
});
