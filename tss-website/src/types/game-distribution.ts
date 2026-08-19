// TypeScript types for the game distribution system (game_releases table,
// manifests, signed URLs). Separate from games-records.ts (the marketing/CMS
// `games` table) since this is a distinct subsystem tied to it only via FK.

export type GameReleaseStatus = 'draft' | 'published' | 'archived';

export interface GameRelease {
  id: string;
  game_id: number;
  version: string;
  platform: string;
  channel: string;
  status: GameReleaseStatus;
  executable_path: string;
  manifest_path: string;
  manifest_sha256: string | null;
  total_size_bytes: number;
  file_count: number;
  release_notes: string | null;
  is_current: boolean;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManifestFileEntry {
  path: string; // relative path within the extracted build, forward slashes
  size: number;
  sha256: string;
}

export interface GameManifest {
  version: string;
  files: ManifestFileEntry[];
}

export interface SignedDownloadEntry {
  path: string;
  signedUrl: string;
}
