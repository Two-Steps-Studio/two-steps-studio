"use client";

// Client-only: reads a game build .zip picked by an admin, hashes each entry,
// and uploads it — all in one sequential pass so every entry is decompressed
// exactly once. Runs entirely in the browser — the zip's bytes never touch
// the Next.js server.
//
// Memory safety: JSZip.loadAsync() must hold the whole archive's compressed
// bytes (needs random access to the central directory) — real risk for a
// multi-GB zip in a browser tab. Mitigated two ways: (1) every entry's
// uncompressed size is read from the central directory BEFORE decompressing
// it, and the whole upload is rejected up front if any single file or the
// running total exceeds the caps below; (2) entries are decompressed,
// hashed, and uploaded strictly sequentially (never Promise.all) so at most
// one decompressed buffer is held in memory at a time.
import JSZip from "jszip";
import type { ManifestFileEntry } from "@/types/game-distribution";

export const MAX_SINGLE_FILE_BYTES = 4 * 1024 * 1024 * 1024; // 4GB
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024 * 1024; // 20GB

export interface BuildManifestProgress {
  phase: "hashing" | "uploading";
  fileIndex: number;
  fileCount: number;
  currentFile: string;
}

export interface BuildManifestResult {
  files: ManifestFileEntry[];
  totalSizeBytes: number;
}

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Reads every entry of `zipFile` exactly once: validates its size, hashes
 * it, then hands the decompressed bytes to `uploadEntry` (awaited before
 * moving to the next entry). Returns the completed manifest.
 */
export async function buildAndUploadManifest(
  zipFile: File,
  uploadEntry: (entry: ManifestFileEntry, blob: Blob) => Promise<void>,
  onProgress?: (progress: BuildManifestProgress) => void
): Promise<BuildManifestResult> {
  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);

  if (entries.length === 0) {
    throw new Error("Archiwum ZIP jest puste");
  }

  // Validate sizes from the central directory before decompressing anything.
  let totalSizeBytes = 0;
  for (const entry of entries) {
    // _data.uncompressedSize is JSZip-internal (no public API for this pre-
    // decompression), reliably present for entries read from a loaded zip.
    // If it's ever absent, fail closed rather than defaulting to 0 — a
    // silent 0 would let an unbounded entry skip the cap entirely.
    const uncompressedSize: number | undefined = (entry as any)._data?.uncompressedSize;
    if (typeof uncompressedSize !== "number") {
      throw new Error(`Nie udało się odczytać rozmiaru pliku "${entry.name}" z archiwum — odrzucono ze względów bezpieczeństwa`);
    }
    if (uncompressedSize > MAX_SINGLE_FILE_BYTES) {
      throw new Error(
        `Plik "${entry.name}" jest za duży (${(uncompressedSize / 1024 / 1024 / 1024).toFixed(2)}GB). Maksymalny rozmiar pojedynczego pliku: ${MAX_SINGLE_FILE_BYTES / 1024 / 1024 / 1024}GB`
      );
    }
    totalSizeBytes += uncompressedSize;
    if (totalSizeBytes > MAX_TOTAL_BYTES) {
      throw new Error(`Łączny rozmiar buildu przekracza limit ${MAX_TOTAL_BYTES / 1024 / 1024 / 1024}GB`);
    }
  }

  // Decompress + hash + upload strictly sequentially — never Promise.all —
  // so each entry is inflated exactly once and at most one buffer is held
  // in memory at a time.
  const files: ManifestFileEntry[] = [];
  let index = 0;
  for (const entry of entries) {
    index += 1;

    onProgress?.({ phase: "hashing", fileIndex: index, fileCount: entries.length, currentFile: entry.name });
    const buffer = await entry.async("arraybuffer");
    const sha256 = await sha256Hex(buffer);
    const manifestEntry: ManifestFileEntry = { path: entry.name, size: buffer.byteLength, sha256 };

    onProgress?.({ phase: "uploading", fileIndex: index, fileCount: entries.length, currentFile: entry.name });
    await uploadEntry(manifestEntry, new Blob([buffer]));

    files.push(manifestEntry);
  }

  return { files, totalSizeBytes };
}
