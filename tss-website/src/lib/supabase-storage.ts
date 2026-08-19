import { createClient, createServiceClient } from "@/lib/supabase-server";
import {
  STORAGE_BUCKETS,
  ALLOWED_DEV_FILE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_VIDEO_TYPES,
  FILE_SIZE_LIMITS,
} from "./storage-constants";

// Re-export for convenience
export { ALLOWED_DEV_FILE_EXTENSIONS, FILE_SIZE_LIMITS };

/**
 * Check if a bucket exists and is accessible
 */
export async function checkBucketExists(bucket: string): Promise<boolean> {
  try {
    const client = createServiceClient();
    const { data, error } = await client.storage.getBucket(bucket);
    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Ensure a storage bucket exists, creating it if necessary
 */
export async function ensureBucketExists(bucket: string, options?: { public?: boolean; fileSizeLimit?: number }): Promise<{ created: boolean; error?: string }> {
  try {
    const client = createServiceClient();
    
    // Check if bucket already exists
    const { data: existingBucket, error: getError } = await client.storage.getBucket(bucket);
    if (!getError && existingBucket) {
      return { created: false };
    }

    // Create the bucket
    const { error: createError } = await client.storage.createBucket(bucket, {
      public: options?.public ?? true,
      fileSizeLimit: options?.fileSizeLimit ?? 10 * 1024 * 1024, // 10MB default
    });

    if (createError) {
      console.error(`[Storage] Failed to create bucket '${bucket}':`, createError);
      return { created: false, error: createError.message };
    }

    console.log(`[Storage] Created bucket '${bucket}'`);
    return { created: true };
  } catch (error: any) {
    console.error(`[Storage] Error ensuring bucket '${bucket}':`, error);
    return { created: false, error: error.message };
  }
}

/**
 * Upload a file to Supabase storage
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  file: File,
  options?: {
    upsert?: boolean;
    contentType?: string;
  }
) {
  const client = createServiceClient();

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: options?.upsert ?? false,
      contentType: options?.contentType ?? file.type,
    });

  if (error) {
    console.error('[Storage] Upload error:', error);
    if (error.message.includes('Bucket not found') || error.message.includes('NoSuchBucket')) {
      throw new Error(`Storage bucket '${bucket}' does not exist or is not accessible. Check Supabase Storage configuration and RLS policies.`);
    }
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = client.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return {
    path: data.path,
    publicUrl,
  };
}

/**
 * Upload a game image (thumbnail, banner, or screenshot)
 */
export async function uploadGameImage(
  type: 'thumbnail' | 'banner' | 'screenshot',
  gameId: string,
  file: File
) {
  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Nieobsługiwany typ pliku obrazu. Dozwolone: JPEG, PNG, WebP, GIF');
  }

  // Validate file size
  if (file.size > FILE_SIZE_LIMITS.IMAGE) {
    throw new Error('Plik obrazu jest za duży. Maksymalny rozmiar: 10MB');
  }

  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filePath = `games/${gameId}/${type}-${timestamp}.${extension}`;

  return uploadFile(STORAGE_BUCKETS.GAMES_IMAGES, filePath, file);
}

/**
 * Upload a music file
 */
export async function uploadMusicFile(
  musicId: string,
  file: File,
  type: 'audio' | 'cover'
) {
  if (type === 'audio') {
    // Validate audio file
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      throw new Error('Nieobsługiwany typ pliku audio. Dozwolone: MP3, WAV, OGG, FLAC, M4A');
    }

    if (file.size > FILE_SIZE_LIMITS.AUDIO) {
      throw new Error('Plik audio jest za duży. Maksymalny rozmiar: 50MB');
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filePath = `music/${musicId}/audio-${timestamp}.${extension}`;

    return uploadFile(STORAGE_BUCKETS.MUSIC_FILES, filePath, file);
  } else {
    // Validate cover image
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Nieobsługiwany typ pliku obrazu. Dozwolone: JPEG, PNG, WebP, GIF');
    }

    if (file.size > FILE_SIZE_LIMITS.IMAGE) {
      throw new Error('Plik obrazu jest za duży. Maksymalny rozmiar: 10MB');
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filePath = `music/${musicId}/cover-${timestamp}.${extension}`;

    return uploadFile(STORAGE_BUCKETS.MUSIC_FILES, filePath, file);
  }
}

/**
 * Upload a podcast file
 */
export async function uploadPodcastFile(
  podcastId: string,
  file: File,
  type: 'audio' | 'thumbnail'
) {
  if (type === 'audio') {
    // Validate audio file
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      throw new Error('Nieobsługiwany typ pliku audio. Dozwolone: MP3, WAV, OGG, FLAC, M4A');
    }

    if (file.size > FILE_SIZE_LIMITS.AUDIO) {
      throw new Error('Plik audio jest za duży. Maksymalny rozmiar: 50MB');
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filePath = `podcasts/${podcastId}/audio-${timestamp}.${extension}`;

    return uploadFile(STORAGE_BUCKETS.PODCAST_FILES, filePath, file);
  } else {
    // Validate thumbnail image
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error('Nieobsługiwany typ pliku obrazu. Dozwolone: JPEG, PNG, WebP, GIF');
    }

    if (file.size > FILE_SIZE_LIMITS.IMAGE) {
      throw new Error('Plik obrazu jest za duży. Maksymalny rozmiar: 10MB');
    }

    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filePath = `podcasts/${podcastId}/thumbnail-${timestamp}.${extension}`;

    return uploadFile(STORAGE_BUCKETS.PODCAST_FILES, filePath, file);
  }
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteFile(bucket: string, filePath: string) {
  const supabase = createServiceClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('[Storage] Delete error:', error);
    throw new Error(`Delete failed: ${error.message}`);
  }

  return true;
}

/**
 * Get a public URL for a file
 */
export async function getPublicUrl(bucket: string, filePath: string) {
  const supabase = createServiceClient();

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, type: 'image' | 'audio' | 'video') {
  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES :
                      type === 'audio' ? ALLOWED_AUDIO_TYPES :
                      ALLOWED_VIDEO_TYPES;

  const sizeLimit = type === 'image' ? FILE_SIZE_LIMITS.IMAGE :
                   type === 'audio' ? FILE_SIZE_LIMITS.AUDIO :
                   FILE_SIZE_LIMITS.VIDEO;

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Nieobsługiwany typ pliku. Dozwolone: ${allowedTypes.join(', ')}`);
  }

  if (file.size > sizeLimit) {
    const sizeMB = (sizeLimit / (1024 * 1024)).toFixed(0);
    throw new Error(`Plik jest za duży. Maksymalny rozmiar: ${sizeMB}MB`);
  }

  return true;
}

/**
 * Validate dev file extension
 */
export function validateDevFileExtension(fileName: string): boolean {
  const extension = '.' + fileName.split('.').pop()?.toLowerCase();
  return ALLOWED_DEV_FILE_EXTENSIONS.includes(extension);
}

/**
 * Upload a dev project file
 */
export async function uploadDevFile(
  projectId: number,
  file: File,
  userId: string
) {
  // Validate file extension
  if (!validateDevFileExtension(file.name)) {
    throw new Error(`Nieobsługiwane rozszerzenie pliku. Dozwolone: ${ALLOWED_DEV_FILE_EXTENSIONS.join(', ')}`);
  }

  // Validate file size
  if (file.size > FILE_SIZE_LIMITS.DEV_FILE) {
    throw new Error(`Plik jest za duży. Maksymalny rozmiar: 10MB`);
  }

  // Ensure the dev-files bucket exists
  const bucketResult = await ensureBucketExists(STORAGE_BUCKETS.DEV_FILES, { public: true });
  if (bucketResult.error) {
    throw new Error(`Storage bucket '${STORAGE_BUCKETS.DEV_FILES}' could not be created: ${bucketResult.error}`);
  }

  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filePath = `projects/${projectId}/${userId}/${timestamp}.${extension}`;

  try {
    return await uploadFile(STORAGE_BUCKETS.DEV_FILES, filePath, file);
  } catch (error: any) {
    if (error.message?.includes('Bucket not found') || error.message?.includes('NoSuchBucket')) {
      throw new Error(`Storage bucket '${STORAGE_BUCKETS.DEV_FILES}' does not exist or is not accessible. Please check Supabase Storage configuration.`);
    }
    throw error;
  }
}

/**
 * Game build storage path layout — single source of truth, reused by both
 * the player-facing signed-URL routes and the admin publish routes.
 * Layout: {gameId}/{platform}/{version}/manifest.json
 *         {gameId}/{platform}/{version}/files/{relativePath}
 */
export function getReleasePrefix(gameId: number | string, platform: string, version: string): string {
  return `${gameId}/${platform}/${version}`;
}

export function getManifestPath(gameId: number | string, platform: string, version: string): string {
  return `${getReleasePrefix(gameId, platform, version)}/manifest.json`;
}

export function getReleaseFilesPrefix(gameId: number | string, platform: string, version: string): string {
  return `${getReleasePrefix(gameId, platform, version)}/files/`;
}

export function getReleaseFilePath(gameId: number | string, platform: string, version: string, relativePath: string): string {
  return `${getReleaseFilesPrefix(gameId, platform, version)}${relativePath}`;
}

/**
 * Ensure the private game-builds bucket exists (large binaries, signed URLs only)
 */
export async function ensureGameBuildsBucket(): Promise<{ created: boolean; error?: string }> {
  return ensureBucketExists(STORAGE_BUCKETS.GAME_BUILDS, {
    public: false,
    fileSizeLimit: FILE_SIZE_LIMITS.GAME_BUILD_FILE,
  });
}

/**
 * Create a signed upload URL for one game build file (admin publish flow).
 * Client PUTs the file bytes directly to Storage — the Next.js server never
 * touches the binary content.
 */
export async function createGameFileUploadUrl(storagePath: string) {
  const client = createServiceClient();

  const { data, error } = await client.storage
    .from(STORAGE_BUCKETS.GAME_BUILDS)
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error('[Storage] createGameFileUploadUrl error:', error);
    throw new Error(`Nie udało się utworzyć adresu do przesłania pliku: ${error.message}`);
  }

  return data; // { signedUrl, token, path }
}

/**
 * Create signed download URLs for a batch of game build files (player download/update/repair).
 * One round trip regardless of file count. 60 min expiry: generating a URL
 * costs nothing (no bytes moved), so it's fine to over-fetch for files that
 * end up unchanged in an update/repair diff.
 */
export async function createGameFileDownloadUrls(storagePaths: string[], expiresInSeconds = 3600) {
  if (storagePaths.length === 0) return [];

  const client = createServiceClient();

  const { data, error } = await client.storage
    .from(STORAGE_BUCKETS.GAME_BUILDS)
    .createSignedUrls(storagePaths, expiresInSeconds);

  if (error) {
    console.error('[Storage] createGameFileDownloadUrls error:', error);
    throw new Error(`Nie udało się utworzyć adresów pobierania: ${error.message}`);
  }

  return data; // [{ path, signedUrl, error }]
}

/**
 * List all object paths (+ sizes) currently stored under a release's files/
 * prefix — keyed by relative path, matching manifest.json's `path` field.
 * Used by admin finalize to verify completeness (path + size), and to
 * resume an interrupted upload without re-uploading files already present.
 */
export async function listReleaseFiles(gameId: number | string, platform: string, version: string): Promise<Map<string, number>> {
  const client = createServiceClient();
  const prefix = getReleaseFilesPrefix(gameId, platform, version);
  const found = new Map<string, number>();

  // Supabase Storage list() is not recursive and paginates at 100 by default;
  // walk it explicitly so nested subfolders in a build are all counted.
  async function walk(subPath: string) {
    let offset = 0;
    const limit = 1000;
    for (;;) {
      const { data, error } = await client.storage
        .from(STORAGE_BUCKETS.GAME_BUILDS)
        .list(subPath, { limit, offset });

      if (error) {
        console.error('[Storage] listReleaseFiles error:', error);
        throw new Error(`Nie udało się odczytać zawartości Storage: ${error.message}`);
      }
      if (!data || data.length === 0) break;

      for (const entry of data) {
        const entryPath = subPath ? `${subPath}/${entry.name}` : entry.name;
        if (entry.id === null) {
          // folder (no id) — recurse
          await walk(entryPath);
        } else {
          found.set(entryPath.slice(prefix.length), entry.metadata?.size ?? 0);
        }
      }

      if (data.length < limit) break;
      offset += limit;
    }
  }

  await walk(prefix.replace(/\/$/, ''));
  return found;
}

/**
 * Get project storage usage
 */
export async function getProjectStorageUsage(projectId: number): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dev_project_files')
    .select('size_bytes')
    .eq('project_id', projectId);

  if (error) {
    console.error('[Storage] Error fetching project storage:', error);
    return 0;
  }

  const totalBytes = data?.reduce((sum, file) => sum + (file.size_bytes || 0), 0) || 0;
  return totalBytes;
}
