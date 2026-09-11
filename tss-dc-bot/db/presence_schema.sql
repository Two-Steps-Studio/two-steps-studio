-- Per-user Discord presence, refreshed every 60s by updateDiscordStats()
-- alongside the aggregate discord_stats row. Lets the website show a
-- "who's online" indicator per user (e.g. /dashboard leaderboards)
-- instead of only ever having a single guild-wide count.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default for anon/authenticated.
-- The bot writes via its service-role client; the website reads it the
-- same way (dashboard-leaderboard/route.ts uses createServiceClient()).

CREATE TABLE IF NOT EXISTS discord_presence (
    user_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'offline',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE discord_presence ENABLE ROW LEVEL SECURITY;
