// Storage bucket names
export const STORAGE_BUCKETS = {
  GAMES_IMAGES: 'games-images',
  MUSIC_FILES: 'music-files',
  PODCAST_FILES: 'podcast-files',
  DEV_FILES: 'dev-files',
  GAME_BUILDS: 'game-builds', // private: game binaries/manifests, signed URLs only
} as const;

// Allowed file types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/m4a'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
export const ALLOWED_DEV_FILE_EXTENSIONS = ['.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.csv', '.log', '.ini', '.config'];

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE: 10 * 1024 * 1024, // 10MB
  AUDIO: 50 * 1024 * 1024, // 50MB
  VIDEO: 100 * 1024 * 1024, // 100MB
  DEV_FILE: 10 * 1024 * 1024, // 10MB per file
  DEV_PROJECT: 500 * 1024 * 1024, // 500MB per project
  GAME_BUILD_FILE: 10 * 1024 * 1024 * 1024, // 10GB per individual build file
} as const;
