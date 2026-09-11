-- Historical Discord online-count snapshots, appended every 60s by
-- updateDiscordStats() alongside the existing discord_stats upsert (which
-- only ever keeps the single latest row - no history). Lets the website's
-- 24h activity chart include Discord online numbers instead of only ever
-- showing website session activity, which made the chart's numbers look
-- disconnected from the "Online" tile above it (that tile already combines
-- Discord + website).
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default. Bot writes and the
-- website reads both go through the service-role client.

CREATE TABLE IF NOT EXISTS discord_online_history (
    id SERIAL PRIMARY KEY,
    online_count INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discord_online_history_recorded_at ON discord_online_history(recorded_at);

ALTER TABLE discord_online_history ENABLE ROW LEVEL SECURITY;
