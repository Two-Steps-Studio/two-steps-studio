-- AFK fishing sessions (fishing/afk_fishing.js) lived only in the
-- in-memory `activeSessions` Map, unlike voice sessions which already got
-- persistence + reconciliation (see voice_sessions_schema and
-- reconcileVoiceSessions() in index.js). A bot restart/deploy mid-session
-- silently dropped the rest of the session: no more catches, no summary
-- ever delivered, and the player had no way to know it had died -
-- /afk start afterward just reported no active session.
--
-- last_catch_at tracks how far the session has actually been credited up
-- to (not just start_time), so reconcileAfkFishingSessions() on startup
-- only replays catches between last_catch_at and now instead of redoing
-- the whole session from the beginning on every restart.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once. Idempotent.

CREATE TABLE IF NOT EXISTS afk_fishing_sessions (
    user_id TEXT PRIMARY KEY REFERENCES profiles(discord_id) ON DELETE CASCADE,
    channel_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    last_catch_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
