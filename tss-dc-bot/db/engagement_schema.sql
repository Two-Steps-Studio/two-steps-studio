-- Engagement: reaction roles + giveaways.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default for anon/authenticated,
-- same reasoning as moderation_schema.sql. The bot only ever touches these
-- through its service-role client, which bypasses RLS entirely.

CREATE TABLE IF NOT EXISTS reaction_roles (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, emoji)
);

ALTER TABLE reaction_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS giveaways (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    prize TEXT NOT NULL,
    winner_count INTEGER NOT NULL DEFAULT 1,
    ends_at TIMESTAMPTZ NOT NULL,
    ended BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_giveaways_pending ON giveaways(ends_at) WHERE ended = FALSE;

ALTER TABLE giveaways ENABLE ROW LEVEL SECURITY;
