-- Moderation action history: kick/ban/timeout only ever got sent to the
-- mod-log Discord channel, never persisted anywhere - the admin bot panel's
-- Logi tab could show /warn history (mod_warnings) but nothing for the
-- more serious actions. Same shape/spirit as mod_warnings, just covering
-- the other three action types too.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default, same as every other
-- bot-owned table. The bot writes through its service-role client, the
-- website's admin API reads through its service-role client.

CREATE TABLE IF NOT EXISTS mod_actions (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('kick', 'ban', 'timeout')),
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    duration_minutes INTEGER, -- only set for 'timeout'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_actions_user_id ON mod_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_created_at ON mod_actions(created_at DESC);

ALTER TABLE mod_actions ENABLE ROW LEVEL SECURITY;
