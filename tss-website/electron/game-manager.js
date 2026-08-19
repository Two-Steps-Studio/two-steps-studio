// Game distribution engine — Electron main process. Downloads/installs/
// updates/repairs/launches/uninstalls games. Never touches Supabase auth:
// the renderer already has the cookie session (via requireAuth() on the
// Next.js side) and hands this module a flat, pre-signed file list. This
// module is a "dumb" byte-mover + hasher + spawner.
//
// One sync engine, three modes (install/update/repair) — see syncEngine().
//
// SECURITY: path sanitization here (isSafeRelativePath / resolveSafeJoin)
// duplicates src/lib/game-manifest.ts's rules exactly, because this file
// runs in the Electron main process and cannot import from src/. If you
// change one, change the other (see Phase 8 of the game-distribution plan).

const { app, dialog, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

const LIBRARY_FILE = path.join(app.getPath('userData'), 'game-library.json');

// gameId -> AbortController, for cancel support
const activeSyncControllers = new Map();
// gameId -> { pid, child }, for launch/exit tracking
const runningProcesses = new Map();

function log(level, message, data) {
  // Reuses main.js's console output convention; kept local (no circular
  // require back into main.js) since this is a self-contained module.
  const line = `[game-manager] [${level}] ${message}`;
  if (data !== undefined) console.log(line, data);
  else console.log(line);
}

// ---------------------------------------------------------------------------
// Path safety (kept in sync with src/lib/game-manifest.ts)
// ---------------------------------------------------------------------------

function isSafeRelativePath(relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return false;
  if (relativePath.length > 1024) return false;
  if (relativePath.includes('\0')) return false;
  if (relativePath.includes('\\')) return false;
  if (relativePath.startsWith('/')) return false;
  if (/^[a-zA-Z]:/.test(relativePath)) return false;
  const segments = relativePath.split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) return false;
  return true;
}

/**
 * Resolve relativePath against baseDir and guarantee the result is still
 * inside baseDir (rejects traversal even if isSafeRelativePath somehow
 * passed something malformed — belt and suspenders).
 */
function resolveSafeJoin(baseDir, relativePath) {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error(`Nieprawidłowa ścieżka: ${relativePath}`);
  }
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, relativePath);
  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error(`Ścieżka wychodzi poza katalog instalacji: ${relativePath}`);
  }
  return resolvedTarget;
}

// ---------------------------------------------------------------------------
// Library persistence — { [userId]: { [gameId]: LibraryEntry } }
// ---------------------------------------------------------------------------

function readLibraryFile() {
  try {
    if (fs.existsSync(LIBRARY_FILE)) {
      return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf-8'));
    }
  } catch (error) {
    log('ERROR', 'Failed to read game-library.json', error.message);
  }
  return {};
}

function writeLibraryFile(data) {
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(data, null, 2));
}

function getCurrentUserId(loadSessionFn) {
  const session = loadSessionFn();
  return session?.user?.id || null;
}

function getLibraryForUser(loadSessionFn) {
  const userId = getCurrentUserId(loadSessionFn);
  if (!userId) return {};
  const all = readLibraryFile();
  return all[userId] || {};
}

function setLibraryEntry(loadSessionFn, gameId, entry) {
  const userId = getCurrentUserId(loadSessionFn);
  if (!userId) throw new Error('Musisz być zalogowany');
  const all = readLibraryFile();
  if (!all[userId]) all[userId] = {};
  if (entry === null) {
    delete all[userId][gameId];
  } else {
    all[userId][gameId] = entry;
  }
  writeLibraryFile(all);
  return entry;
}

// ---------------------------------------------------------------------------
// Hashing / download primitives
// ---------------------------------------------------------------------------

function hashFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function localFileMatches(filePath, expectedSha256) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const actual = await hashFileSha256(filePath);
    return actual === expectedSha256;
  } catch {
    return false;
  }
}

const MAX_ATTEMPTS = 4;

/** A 4xx (other than 408/429) means the URL itself is wrong — retrying won't help. */
function isRetryable(error) {
  if (error?.name === 'AbortError') return false;
  if (error?.permanent) return true; // hash mismatch: could be a truncated transfer
  if (typeof error?.status === 'number') {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true; // network-level failure (socket reset, DNS, timeout)
}

/**
 * Download one file from a signed URL to destPath, hashing as it streams
 * (single pass — no separate re-read for verification). Throws if the
 * final hash doesn't match expectedSha256 (temp file is cleaned up).
 *
 * Retries transient failures with exponential backoff so a brief network
 * drop doesn't abandon a multi-GB install. `onBytes` receives deltas and
 * is rolled back on a failed attempt, so progress can't drift upward as
 * partial reads are discarded and re-fetched.
 */
async function downloadAndVerify(signedUrl, destPath, expectedSha256, signal, onBytes) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const tempPath = destPath + '.tmp';
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let attemptBytes = 0;
    try {
      const response = await fetch(signedUrl, { signal });
      if (!response.ok || !response.body) {
        const err = new Error(`Pobieranie nie powiodło się (HTTP ${response.status})`);
        err.status = response.status;
        throw err;
      }

      const hash = crypto.createHash('sha256');
      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.on('data', (chunk) => {
        hash.update(chunk);
        attemptBytes += chunk.length;
        onBytes?.(chunk.length);
      });

      await pipeline(nodeStream, fs.createWriteStream(tempPath));

      const actualSha256 = hash.digest('hex');
      if (actualSha256 !== expectedSha256) {
        const err = new Error(`Suma kontrolna pliku się nie zgadza: ${path.basename(destPath)}`);
        err.permanent = true;
        throw err;
      }

      fs.renameSync(tempPath, destPath);
      return;
    } catch (error) {
      try { fs.unlinkSync(tempPath); } catch {}
      onBytes?.(-attemptBytes); // discard this attempt's progress
      lastError = error;

      if (signal?.aborted || !isRetryable(error) || attempt === MAX_ATTEMPTS) throw error;

      const backoffMs = 500 * 2 ** (attempt - 1); // 0.5s, 1s, 2s
      log('WARN', `Retry ${attempt}/${MAX_ATTEMPTS - 1} for ${path.basename(destPath)}`, error.message);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError;
}

/**
 * Refuse to start a sync that cannot possibly fit, rather than filling the
 * disk and failing partway through. Best-effort: fs.statfs isn't available
 * on every platform/filesystem, so an error here is not treated as fatal.
 */
async function assertEnoughDiskSpace(installDir, bytesNeeded) {
  try {
    // statfs needs an existing path — walk up to the nearest one.
    let probe = path.resolve(installDir);
    while (!fs.existsSync(probe)) {
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
    const stats = await fs.promises.statfs(probe);
    const freeBytes = stats.bavail * stats.bsize;
    const withHeadroom = bytesNeeded * 1.1; // temp file + filesystem overhead
    if (freeBytes < withHeadroom) {
      const needGb = (withHeadroom / 1024 ** 3).toFixed(2);
      const freeGb = (freeBytes / 1024 ** 3).toFixed(2);
      throw new Error(`Za mało miejsca na dysku: potrzeba ~${needGb} GB, dostępne ${freeGb} GB`);
    }
  } catch (error) {
    if (error.message?.startsWith('Za mało miejsca')) throw error;
    log('WARN', 'Disk space check unavailable, continuing', error.message);
  }
}

// ---------------------------------------------------------------------------
// Sync engine — one function, three modes
// ---------------------------------------------------------------------------

async function syncEngine(loadSessionFn, sendEvent, payload) {
  const { gameId, releaseId, version, platform, mode, installDir, executablePath, files } = payload;

  if (!isSafeRelativePath(executablePath)) {
    throw new Error(`Nieprawidłowa ścieżka pliku wykonywalnego: ${executablePath}`);
  }
  // Validate every manifest path up front, before touching disk or network.
  for (const file of files) {
    if (!isSafeRelativePath(file.path)) {
      throw new Error(`Nieprawidłowa ścieżka pliku w manifeście: ${file.path}`);
    }
  }

  const controller = new AbortController();
  activeSyncControllers.set(gameId, controller);

  const library = getLibraryForUser(loadSessionFn);
  const previousEntry = library[gameId];

  try {
    fs.mkdirSync(installDir, { recursive: true });

    const bytesTotal = files.reduce((sum, f) => sum + f.size, 0);
    let bytesDone = 0;
    let lastEmit = 0;

    // fileIndex is passed in rather than derived with files.indexOf(): this
    // runs on every chunk of every file, so a lookup here would make the
    // whole sync O(files x chunks).
    const emitProgress = (phase, currentFile, fileIndex, force = false) => {
      const now = Date.now();
      if (!force && now - lastEmit < 200) return; // throttle IPC
      lastEmit = now;
      sendEvent('game-sync-progress', {
        gameId, phase, fileIndex: fileIndex + 1, fileCount: files.length,
        currentFile: currentFile?.path, bytesDone, bytesTotal,
      });
    };

    // Only the files actually missing/changed need to fit on disk.
    let bytesToFetch = 0;
    const needsFetch = new Array(files.length);
    for (let i = 0; i < files.length; i++) {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const destPath = resolveSafeJoin(installDir, files[i].path);
      const upToDate = mode !== 'install' && (await localFileMatches(destPath, files[i].sha256));
      needsFetch[i] = !upToDate;
      if (upToDate) {
        bytesDone += files[i].size;
      } else {
        bytesToFetch += files[i].size;
      }
      emitProgress('verifying', files[i], i);
    }

    await assertEnoughDiskSpace(installDir, bytesToFetch);

    for (let i = 0; i < files.length; i++) {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!needsFetch[i]) continue;

      const file = files[i];
      const destPath = resolveSafeJoin(installDir, file.path);

      emitProgress('downloading', file, i, true);
      await downloadAndVerify(file.signedUrl, destPath, file.sha256, controller.signal, (n) => {
        bytesDone += n;
        emitProgress('downloading', file, i);
      });
    }

    // Update mode: remove files that existed in the old manifest but are
    // absent from the new one. Repair mode never deletes — it only fixes.
    if (mode === 'update' && previousEntry?.manifest) {
      const newPaths = new Set(files.map((f) => f.path));
      for (const oldFile of previousEntry.manifest) {
        if (!newPaths.has(oldFile.path)) {
          try {
            const staleePath = resolveSafeJoin(installDir, oldFile.path);
            if (fs.existsSync(staleePath)) fs.unlinkSync(staleePath);
          } catch (error) {
            log('WARN', 'Failed to remove stale file during update', { path: oldFile.path, error: error.message });
          }
        }
      }
    }

    const entry = {
      gameId, releaseId, version, platform, installDir, executablePath,
      manifest: files,
      installedAt: previousEntry?.installedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLibraryEntry(loadSessionFn, gameId, entry);

    sendEvent('game-sync-complete', { gameId, mode, installedVersion: version });
    sendEvent('game-library-updated', { gameId, entry });
  } catch (error) {
    if (error.name === 'AbortError') {
      sendEvent('game-sync-cancelled', { gameId });
    } else {
      log('ERROR', 'Sync failed', { gameId, error: error.message });
      sendEvent('game-sync-error', { gameId, error: error.message });
    }
    throw error;
  } finally {
    activeSyncControllers.delete(gameId);
  }
}

function cancelSync(gameId) {
  const controller = activeSyncControllers.get(gameId);
  if (controller) {
    controller.abort();
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Launch / uninstall
// ---------------------------------------------------------------------------

function launchGame(loadSessionFn, sendEvent, gameId) {
  const library = getLibraryForUser(loadSessionFn);
  const entry = library[gameId];
  if (!entry) {
    return { success: false, error: 'Gra nie jest zainstalowana' };
  }
  if (runningProcesses.has(gameId)) {
    return { success: false, error: 'Gra jest już uruchomiona' };
  }

  let exePath;
  try {
    // Re-validate at launch time too — defense in depth, don't trust that
    // the entry written at install time is still safe (disk could have
    // been tampered with, or installDir edited by hand).
    exePath = resolveSafeJoin(entry.installDir, entry.executablePath);
    exePath = fs.realpathSync(exePath); // resolves symlinks; throws if missing
    const resolvedInstallDir = fs.realpathSync(entry.installDir);
    if (exePath !== resolvedInstallDir && !exePath.startsWith(resolvedInstallDir + path.sep)) {
      throw new Error('Plik wykonywalny wskazuje poza katalog instalacji (symlink?)');
    }
  } catch (error) {
    return { success: false, error: `Nie znaleziono pliku wykonywalnego: ${error.message}` };
  }

  const child = spawn(exePath, [], {
    cwd: path.dirname(exePath),
    detached: false,
    windowsHide: false,
    // Never shell:true — exePath comes from a validated, sanitized path,
    // never from a shell-interpreted string, and no caller-controlled argv.
  });

  runningProcesses.set(gameId, { pid: child.pid, child });

  child.on('exit', (code, signal) => {
    runningProcesses.delete(gameId);
    sendEvent('game-process-exit', { gameId, code, signal });
  });

  child.on('error', (error) => {
    runningProcesses.delete(gameId);
    log('ERROR', 'Game process error', { gameId, error: error.message });
    sendEvent('game-process-exit', { gameId, code: null, signal: null, error: error.message });
  });

  return { success: true, pid: child.pid };
}

function uninstallGame(loadSessionFn, sendEvent, gameId) {
  const library = getLibraryForUser(loadSessionFn);
  const entry = library[gameId];
  if (!entry) {
    return { success: false, error: 'Gra nie jest zainstalowana' };
  }
  if (runningProcesses.has(gameId)) {
    return { success: false, error: 'Zamknij grę przed odinstalowaniem' };
  }

  try {
    fs.rmSync(entry.installDir, { recursive: true, force: true });
  } catch (error) {
    return { success: false, error: `Nie udało się usunąć plików: ${error.message}` };
  }

  setLibraryEntry(loadSessionFn, gameId, null);
  sendEvent('game-library-updated', { gameId, entry: null });
  return { success: true };
}

function getStatus(gameId) {
  if (runningProcesses.has(gameId)) {
    return { status: 'running', pid: runningProcesses.get(gameId).pid };
  }
  if (activeSyncControllers.has(gameId)) {
    return { status: 'syncing' };
  }
  return { status: 'idle' };
}

async function chooseInstallDir(suggestedFolderName) {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: 'Wybierz lokalizację instalacji',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }
  const safeFolderName = (suggestedFolderName || 'Game').replace(/[\\/:*?"<>|]/g, '_');
  const installDir = path.join(result.filePaths[0], safeFolderName);
  return { canceled: false, path: installDir };
}

module.exports = {
  getLibraryForUser,
  chooseInstallDir,
  syncEngine,
  cancelSync,
  launchGame,
  uninstallGame,
  getStatus,
};
