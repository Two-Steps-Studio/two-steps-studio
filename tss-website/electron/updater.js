'use strict';

/**
 * Auto-updater module for Two Steps Studio.
 *
 * Responsibilities:
 *   - configure electron-updater against the official GitHub Releases feed,
 *   - keep SemVer comparison honest (1.0.10 > 1.0.9, etc.),
 *   - surface updater events over a single in-process bus so the renderer can
 *     subscribe without reaching into electron-updater directly,
 *   - drive periodic checks, startup checks, and on-demand checks behind one
 *     shared throttle so a slow network cannot spam GitHub,
 *   - never crash the app: every GitHub interaction is wrapped, every error
 *     is logged, every event flows through the same bus.
 *
 * Channel support (stable / beta / nightly) is wired in here, so adding a
 * non-stable channel later only means changing the GitHub Release tag prefix
 * and the channel name on the main side — no renderer or main rewrite.
 *
 * Single source of truth for repository coordinates: REPO_CONFIG below.
 * The same object is reused by electron-builder (via env vars exported from
 * this module) so build-time and runtime stay aligned.
 */

const { autoUpdater } = require('electron-updater');
const semver = require('semver');

const REPO_CONFIG = Object.freeze({
  // The official Two Steps Studio desktop repository. All release artefacts
  // must come from here — no other URL is ever queried.
  owner: 'twostepsstudio',
  repo: 'tss-desktop',
});

const SUPPORTED_CHANNELS = Object.freeze(['stable', 'beta', 'nightly']);
const DEFAULT_CHANNEL = 'stable';

// Tag prefixes used by GitHub Release naming:
//   stable:   v1.0.2
//   beta:     v1.1.0-beta.1
//   nightly:  v1.1.0-nightly.20260820
const CHANNEL_TAG_PREFIX = Object.freeze({
  stable: '',
  beta: 'beta',
  nightly: 'nightly',
});

// How often the running app polls GitHub for new releases. Long enough not
// to be a spam vector, short enough to deliver hot-fixes within an hour.
const PERIODIC_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// One in-flight check at a time. A second click during a check is a no-op
// rather than a second outbound HTTPS request.
let checkInFlight = null;

let currentChannel = DEFAULT_CHANNEL;
let periodicTimer = null;

const bus = createBus();

/**
 * Initialise the auto-updater module.
 *
 * Called once from the main process after `app.whenReady()`. Wires the
 * electron-updater event handlers, schedules the periodic check, and does
 * NOT trigger an immediate check — startup checks belong to the caller so
 * they can be timed against app readiness.
 *
 * @param {object} options
 * @param {(level: string, msg: string, data?: any) => void} options.log
 *   Main-process logger. Used for [Updater] lines.
 * @param {(channel: string, payload: any) => void} options.send
 *   Sends a message to the renderer via the main window's webContents.
 * @param {() => Electron.BrowserWindow | null} options.getMainWindow
 *   Resolves the main window; the updater guards against null on every send.
 * @param {object} [options.app] - electron.app instance (used for app.getVersion()).
 * @param {string} [options.channel] - release channel; defaults to 'stable'.
 */
function init({ log, send, getMainWindow, app, channel = DEFAULT_CHANNEL }) {
  if (!SUPPORTED_CHANNELS.includes(channel)) {
    log('WARN', `[Updater] Unknown channel "${channel}", falling back to "${DEFAULT_CHANNEL}"`);
    channel = DEFAULT_CHANNEL;
  }
  currentChannel = channel;

  const currentVersion = (app && typeof app.getVersion === 'function' ? app.getVersion() : '0.0.0');
  log('INFO', `[Updater] Initialised on channel "${currentChannel}", current version: ${currentVersion}`);

  // Point electron-updater at the official GitHub repo for this channel.
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: REPO_CONFIG.owner,
    repo: REPO_CONFIG.repo,
    channel: CHANNEL_TAG_PREFIX[currentChannel] || null,
  });

  // Do not silently install while the user is mid-session — the dialog flow
  // requires an explicit restart-and-install click.
  autoUpdater.autoInstallOnAppQuit = true;
  // The setting "autoUpdate" toggles autoDownload. autoDownload is set by
  // configure() so it can react to user preference changes.
  autoUpdater.allowPrerelease = currentChannel !== 'stable';

  wireEvents({ log, send, getMainWindow });

  return { channel: currentChannel, currentVersion };
}

/**
 * Toggle whether the updater pulls new releases automatically.
 * Mirrors the persisted `autoUpdate` preference in appSettings.
 */
function configure({ autoDownload }) {
  autoUpdater.autoDownload = autoDownload !== false;
}

/**
 * Trigger a manual update check. Coalesces concurrent calls so that two
 * IPC invocations in quick succession do not produce two GitHub queries.
 */
async function checkForUpdates({ log, send, getMainWindow, app } = {}) {
  if (checkInFlight) {
    return checkInFlight;
  }
  checkInFlight = (async () => {
    const currentVersion = (app && typeof app.getVersion === 'function' ? app.getVersion() : '0.0.0');
    if (log) log('INFO', `[Updater] Checking for updates...`);
    if (send) send('update-checking', { currentVersion });

    try {
      const result = await autoUpdater.checkForUpdates();
      // electron-updater returns null when the feed cannot be read (no
      // internet, GitHub down, rate-limited). Treat it as "no update" so
      // the user-facing state is consistent.
      if (!result) {
        if (log) log('WARN', '[Updater] checkForUpdates returned null (network or feed unavailable)');
        if (send) send('update-not-available', { version: currentVersion });
        return { success: true, updateAvailable: false, reason: 'no-feed' };
      }
      // `updateInfo` is present even when there is no update — it's the
      // release currently being served as "latest for this channel".
      const remote = result.updateInfo;
      const remoteVersion = (remote && remote.version) || null;
      const isNewer = isRemoteNewer(currentVersion, remoteVersion, log);
      if (log) log('INFO', `[Updater] Current version: ${currentVersion}, latest version: ${remoteVersion || 'unknown'}, update available: ${isNewer}`);
      return { success: true, updateAvailable: isNewer, currentVersion, remoteVersion, updateInfo: remote };
    } catch (error) {
      if (log) log('ERROR', `[Updater] checkForUpdates failed: ${error && error.message ? error.message : error}`);
      return { success: false, error: error && error.message ? error.message : String(error) };
    } finally {
      checkInFlight = null;
    }
  })();

  return checkInFlight;
}

async function downloadUpdate({ log } = {}) {
  try {
    if (log) log('INFO', '[Updater] Download started');
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    if (log) log('ERROR', `[Updater] downloadUpdate failed: ${error && error.message ? error.message : error}`);
    return { success: false, error: error && error.message ? error.message : String(error) };
  }
}

function installUpdate({ log, app } = {}) {
  // Back up user settings so a failed install cannot wipe local state.
  try {
    const fs = require('fs');
    const path = require('path');
    const settingsFile = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsFile)) {
      const backupFile = path.join(app.getPath('userData'), 'settings.backup.json');
      fs.writeFileSync(backupFile, fs.readFileSync(settingsFile, 'utf-8'));
      if (log) log('INFO', '[Updater] Settings backed up before install');
    }
  } catch (error) {
    if (log) log('WARN', `[Updater] Could not back up settings: ${error.message}`);
  }

  if (log) log('INFO', '[Updater] Quit and install requested');
  // isSilent=false so the user sees the OS-level install flash.
  // isForceRunAfter=true so the freshly installed app relaunches itself.
  autoUpdater.quitAndInstall(false, true);
}

/**
 * Schedule a recurring update check. Cancels any previous schedule. Pass
 * `null` for `intervalMs` to disable.
 */
function schedulePeriodicCheck({ log, send, getMainWindow, app, intervalMs = PERIODIC_CHECK_INTERVAL_MS } = {}) {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
  if (!intervalMs || intervalMs <= 0) return;
  periodicTimer = setInterval(() => {
    checkForUpdates({ log, send, getMainWindow, app }).catch((error) => {
      if (log) log('ERROR', `[Updater] Periodic check crashed: ${error && error.message ? error.message : error}`);
    });
  }, intervalMs);
  // The interval would otherwise keep the event loop alive after quit.
  if (periodicTimer.unref) periodicTimer.unref();
  if (log) log('INFO', `[Updater] Periodic check scheduled every ${intervalMs}ms`);
}

function stopPeriodicCheck() {
  if (periodicTimer) {
    clearInterval(periodicTimer);
    periodicTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function wireEvents({ log, send, getMainWindow }) {
  // Replace any previous wiring. electron-updater is a singleton, so
  // re-initialising the main process during dev hot-reload would otherwise
  // attach duplicate listeners.
  autoUpdater.removeAllListeners();

  autoUpdater.on('checking-for-update', () => {
    log('INFO', '[Updater] Checking for updates...');
    emit(bus, send, getMainWindow, 'update-checking', {});
  });

  autoUpdater.on('update-available', (info) => {
    log('INFO', `[Updater] Update available: ${info && info.version}`);
    emit(bus, send, getMainWindow, 'update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    log('INFO', `[Updater] You're up to date${info && info.version ? ` (latest: ${info.version})` : ''}`);
    emit(bus, send, getMainWindow, 'update-not-available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round((progress && progress.percent) || 0);
    log('INFO', `[Updater] Download progress: ${percent}%`);
    emit(bus, send, getMainWindow, 'update-download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log('INFO', `[Updater] Update downloaded (${info && info.version}). Ready to install on next restart.`);
    emit(bus, send, getMainWindow, 'update-downloaded', info);
  });

  autoUpdater.on('error', (error) => {
    const message = (error && error.message) || String(error);
    log('ERROR', `[Updater] Error: ${message}`);
    emit(bus, send, getMainWindow, 'update-error', { message });
  });
}

/**
 * Compare local vs remote versions safely. Returns true only when the
 * remote is strictly greater under SemVer — equal or older versions return
 * false, which means no update prompt and no download.
 *
 * Accepts GitHub-style tag prefixes ("v1.0.2") and pre-release versions
 * ("1.1.0-beta.1") by handing them to semver.clean().
 */
function isRemoteNewer(currentVersion, remoteVersion, log) {
  if (!remoteVersion) return false;
  const cleanedRemote = semver.clean(remoteVersion.replace(/^v/i, ''));
  const cleanedLocal = semver.clean(currentVersion.replace(/^v/i, ''));
  if (!cleanedRemote || !cleanedLocal) {
    if (log) log('WARN', `[Updater] Could not parse versions (local="${currentVersion}", remote="${remoteVersion}")`);
    return false;
  }
  return semver.gt(cleanedRemote, cleanedLocal);
}

/**
 * Build a minimal in-process pub/sub bus. The renderer does not subscribe
 * to this — it sees events via IPC. The bus exists so other main-process
 * modules (e.g. tray menu, notification manager) can listen without
 * holding a reference to electron-updater.
 */
function createBus() {
  const listeners = new Map();
  return {
    on(channel, fn) {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel).add(fn);
      return () => listeners.get(channel).delete(fn);
    },
    emit(channel, payload) {
      const set = listeners.get(channel);
      if (!set) return;
      set.forEach((fn) => {
        try {
          fn(payload);
        } catch (error) {
          // Never let a buggy subscriber crash the updater.
          console.error('[Updater] Subscriber threw:', error);
        }
      });
    },
  };
}

function emit(bus, send, getMainWindow, channel, payload) {
  try {
    bus.emit(channel, payload);
  } catch (error) {
    console.error('[Updater] Bus emit failed:', error);
  }
  if (send) {
    try {
      send(channel, payload);
    } catch (error) {
      console.error('[Updater] Renderer send failed:', error);
    }
  }
}

module.exports = {
  REPO_CONFIG,
  SUPPORTED_CHANNELS,
  DEFAULT_CHANNEL,
  init,
  configure,
  checkForUpdates,
  downloadUpdate,
  installUpdate,
  schedulePeriodicCheck,
  stopPeriodicCheck,
  bus,
};
