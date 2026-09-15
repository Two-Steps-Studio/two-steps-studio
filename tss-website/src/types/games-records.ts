// TypeScript types for Games & Records module

// ============================================
// GAMES TYPES
// ============================================

export type GameStatus = 'draft' | 'published' | 'archived' | 'coming_soon';
export type GameCategory = 'action' | 'adventure' | 'rpg' | 'strategy' | 'simulation' | 'sports' | 'racing' | 'puzzle' | 'horror' | 'indie' | 'other';
export type Visibility = 'public' | 'private' | 'unlisted';

export interface Game {
  id?: number;
  title: string;
  short_description?: string;
  full_description?: string;
  version?: string;
  developer?: string;
  publisher?: string;
  release_date?: string;
  category: GameCategory;
  genres?: string[];
  tags?: string[];
  thumbnail_url?: string;
  banner_url?: string;
  download_url?: string;
  steam_url?: string;
  itch_url?: string;
  epic_url?: string;
  changelog?: string;
  status: GameStatus;
  visibility: Visibility;
  featured?: boolean;
  views?: number;
  downloads?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GameScreenshot {
  id?: number;
  game_id?: number;
  url: string;
  caption?: string;
  position?: number;
  created_at?: string;
}

export interface GameRequirement {
  id?: number;
  game_id?: number;
  requirement_type: 'minimum' | 'recommended';
  os?: string;
  processor?: string;
  memory?: string;
  graphics?: string;
  storage?: string;
  created_at?: string;
}

export interface GameWithDetails extends Game {
  game_screenshots?: GameScreenshot[];
  game_requirements?: GameRequirement[];
}

// ============================================
// MUSIC TYPES
// ============================================

export type MusicGenre = 'pop' | 'rock' | 'hip_hop' | 'electronic' | 'classical' | 'jazz' | 'blues' | 'country' | 'reggae' | 'metal' | 'indie' | 'other';

export interface MusicTrack {
  id?: number;
  title: string;
  artist: string;
  album?: string;
  genre: MusicGenre;
  release_date?: string;
  duration_seconds?: number;
  cover_image_url?: string;
  audio_file_url?: string;
  description?: string;
  lyrics?: string;
  spotify_url?: string;
  youtube_url?: string;
  soundcloud_url?: string;
  tags?: string[];
  visibility: Visibility;
  featured?: boolean;
  plays?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// PODCASTS TYPES
// ============================================

export interface PodcastSeries {
  id?: number;
  title: string;
  description?: string;
  cover_image_url?: string;
  host?: string;
  visibility: Visibility;
  created_at?: string;
  updated_at?: string;
}

export interface Podcast {
  id?: number;
  series_id?: number;
  title: string;
  description?: string;
  episode_number?: number;
  season?: number;
  host?: string;
  guests?: string[];
  thumbnail_url?: string;
  audio_file_url?: string;
  published_date?: string;
  duration_seconds?: number;
  tags?: string[];
  visibility: Visibility;
  featured?: boolean;
  plays?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PodcastWithSeries extends Podcast {
  podcast_series?: PodcastSeries;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
