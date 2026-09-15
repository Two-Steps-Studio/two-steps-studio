-- Adds external store links to games, mirroring music_tracks' spotify_url/
-- youtube_url/soundcloud_url pattern - so a TSS game page can link out to
-- Steam/itch.io/Epic instead of only the single generic download_url.
-- Run once in the Supabase SQL Editor.

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS steam_url TEXT,
  ADD COLUMN IF NOT EXISTS itch_url TEXT,
  ADD COLUMN IF NOT EXISTS epic_url TEXT;
