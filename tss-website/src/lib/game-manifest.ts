// Shared validation for game-build file paths. Used by:
// - the admin upload-url route (before issuing a signed upload URL)
// - the player signed-urls route (before issuing a signed download URL)
// The Electron main process (electron/game-manager.js) re-implements the
// same rules independently — it cannot import from src/ — and both must
// keep rejecting the same input classes (see Phase 8 security pass).

/**
 * Reject anything that isn't a clean, relative, forward-slash path:
 * no "..", no leading slash, no drive letters, no backslashes, no null bytes.
 */
export function isSafeRelativePath(relativePath: string): boolean {
  if (!relativePath || typeof relativePath !== 'string') return false;
  if (relativePath.length > 1024) return false;
  if (relativePath.includes('\0')) return false;
  if (relativePath.includes('\\')) return false; // no backslashes — paths are always forward-slash
  if (relativePath.startsWith('/')) return false; // no absolute paths
  if (/^[a-zA-Z]:/.test(relativePath)) return false; // no drive letters
  const segments = relativePath.split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) return false;
  return true;
}

export function sanitizeRelativePath(relativePath: string): string {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error(`Nieprawidłowa ścieżka pliku: ${relativePath}`);
  }
  return relativePath;
}

const SHA256_HEX = /^[a-f0-9]{64}$/i;

export function isValidSha256(hash: string): boolean {
  return typeof hash === 'string' && SHA256_HEX.test(hash);
}

export function isValidVersion(version: string): boolean {
  return typeof version === 'string' && /^[a-zA-Z0-9._-]{1,50}$/.test(version);
}

export function isValidPlatform(platform: string): boolean {
  return typeof platform === 'string' && /^[a-z0-9_-]{1,30}$/.test(platform);
}
