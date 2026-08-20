/**
 * Shared types and constants for the published desktop release manifest.
 *
 * The manifest is a single small JSON object in Supabase Storage. It is
 * deliberately host-agnostic: each artifact carries an absolute URL, so the
 * binaries can live in the same bucket, on GitHub Releases, or behind a CDN
 * without the website needing to know which.
 */

export const DESKTOP_RELEASES_BUCKET = "desktop-releases";
export const DESKTOP_RELEASE_MANIFEST = "latest.json";

export type DesktopArtifactKind = "installer" | "portable";

export interface DesktopArtifact {
  kind: DesktopArtifactKind;
  /** Human label shown on the download button, e.g. "Instalator". */
  label: string;
  filename: string;
  sizeBytes: number;
  /** Absolute URL the browser downloads from. */
  url: string;
  /** electron-builder's sha512, when the artifact was published from a build. */
  sha512?: string;
}

export interface DesktopRelease {
  version: string;
  /** ISO 8601. */
  releasedAt: string;
  platform: "windows" | "mac" | "linux";
  /** Free-form requirement line rendered above the system requirements list. */
  minimumOs?: string;
  notes: string[];
  artifacts: DesktopArtifact[];
}

export function isDesktopRelease(value: unknown): value is DesktopRelease {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DesktopRelease>;
  return (
    typeof candidate.version === "string" &&
    typeof candidate.releasedAt === "string" &&
    Array.isArray(candidate.artifacts) &&
    candidate.artifacts.every(
      (artifact) =>
        typeof artifact?.filename === "string" &&
        typeof artifact?.url === "string" &&
        typeof artifact?.sizeBytes === "number"
    )
  );
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 100 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
