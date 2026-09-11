-- Lightweight activity feed for the website dashboard (/dashboard) - joins,
-- level-ups, shop purchases. Not a full audit log, just the last ~10-20
-- events for a "what's happening" feed.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default. Bot writes and the
-- website reads both go through the service-role client.

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('join', 'level_up', 'purchase')),
    username TEXT NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
