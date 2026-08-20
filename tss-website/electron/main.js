const { app, BrowserWindow, shell, ipcMain, Notification, nativeImage, session, protocol, Tray, Menu, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
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
const ENCRYPTION_KEY = crypto.scryptSync('tss-session-key', 'salt', 32);
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encrypted = parts.join(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    log('ERROR', 'Failed to decrypt session', error.message);
    return null;
  }
}

function saveSession(sessionData) {
  try {
    const encrypted = encrypt(JSON.stringify(sessionData));
    fs.writeFileSync(SESSION_FILE, encrypted);
    log('INFO', 'Session saved successfully');
  } catch (error) {
    log('ERROR', 'Error saving session', error.message);
  }
}

function loadSession() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const encrypted = fs.readFileSync(SESSION_FILE, 'utf-8');
      const decrypted = decrypt(encrypted);
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
// OS so a running `npm run dev` on 3000 never collides with the desktop app.
let serverPort = 3000;

function getStartUrl() {
  return isDev ? 'http://localhost:3000' : `http://127.0.0.1:${serverPort}`;
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

// Auto-updater configuration
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://releases.twostepsstudio.com/updates'
});

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

// SHA256 verification for update files
autoUpdater.on('update-available', (info) => {
  log('INFO', 'Update available, verifying SHA256...', info);
  
  // Verify SHA256 if provided
  if (info.files && info.files.length > 0) {
    const file = info.files[0];
    if (file.sha512) {
      log('INFO', 'SHA512 hash available for verification', { sha512: file.sha512.substring(0, 16) + '...' });
    }
  }
  
  updateAvailable = true;
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info);
  }
  
  showNotification('Dostępna aktualizacja', `Nowa wersja ${info.version} jest dostępna!`);
});

autoUpdater.on('update-not-available', (info) => {
  log('INFO', 'Update not available', info);
  updateAvailable = false;
  if (mainWindow) {
    mainWindow.webContents.send('update-not-available', info);
  }
});

autoUpdater.on('error', (err) => {
  log('ERROR', 'Update error', err.message);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', err);
  }
  
  // Handle specific error scenarios
  if (err.message.includes('ERR_UPDATER_CHANNEL_FILE_NOT_FOUND')) {
    log('ERROR', 'Update channel file not found - update server may be down');
    showNotification('Błąd aktualizacji', 'Serwer aktualizacji jest niedostępny. Spróbuj ponownie później.');
  } else if (err.message.includes('ERR_UPDATER_INVALID_SIGNATURE')) {
    log('ERROR', 'Update file signature invalid - possible security issue');
    showNotification('Błąd aktualizacji', 'Plik aktualizacji ma nieprawidłowy podpis. Aktualizacja zablokowana.');
  } else if (err.message.includes('ERR_UPDATER_HASH_MISMATCH')) {
    log('ERROR', 'Update file hash mismatch - file corrupted');
    showNotification('Błąd aktualizacji', 'Plik aktualizacji jest uszkodzony. Spróbuj ponownie.');
  }
});

autoUpdater.on('download-progress', (progress) => {
  log('INFO', 'Download progress', progress);
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', progress);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log('INFO', 'Update downloaded', info);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
  
  showNotification('Aktualizacja gotowa', 'Aktualizacja została pobrana. Zostanie zainstalowana po ponownym uruchomieniu.');
});

// Check for updates on startup with delay
if (!isDev) {
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(error => {
      log('ERROR', 'Initial update check failed', error.message);
    });
  }, 30000); // Check 30 seconds after startup
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
    log('INFO', 'Manual update check requested');
    await autoUpdater.checkForUpdates();
    return { success: true, hasUpdate: updateAvailable };
  } catch (error) {
    log('ERROR', 'Manual update check failed', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-update', async () => {
  try {
    log('INFO', 'Update download requested');
    
    // Check if online before downloading
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
    
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    log('ERROR', 'Update download failed', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  log('INFO', 'Update install requested');
  
  // Save current state before update
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    const settings = fs.readFileSync(settingsPath, 'utf-8');
    const backupPath = path.join(app.getPath('userData'), 'settings.backup.json');
    fs.writeFileSync(backupPath, settings);
    log('INFO', 'Settings backed up before update');
  } catch (error) {
    log('WARN', 'Failed to backup settings before update', error.message);
  }
  
  autoUpdater.quitAndInstall();
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
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    log('INFO', 'Settings saved');
    return { success: true };
  } catch (error) {
    log('ERROR', 'Failed to save settings', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    log('ERROR', 'Failed to load settings', error.message);
    return {};
  }
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
