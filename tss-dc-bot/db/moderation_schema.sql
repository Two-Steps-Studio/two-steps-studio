-- Moderation: /warn history.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS is enabled with no policies attached, so this is deny-by-default for
-- anon/authenticated (matches the lesson from get_unified_stats() this
-- session - a table with no explicit public-read policy should actually
-- deny reads, not silently return nothing while looking like it works).
-- The bot only ever writes/reads this through its service-role client,
-- which bypasses RLS entirely.

CREATE TABLE IF NOT EXISTS mod_warnings (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_warnings_user_id ON mod_warnings(user_id);

ALTER TABLE mod_warnings ENABLE ROW LEVEL SECURITY;
