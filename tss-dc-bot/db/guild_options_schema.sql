-- Cached snapshot of the guild's text channels and roles, so the website's
-- admin panel (bot settings, giveaway/ticket-panel channel pickers) can
-- offer a dropdown of real names instead of making admins copy-paste raw
-- Discord IDs. The bot is the only thing that can see the actual channel/
-- role list, so it syncs a snapshot here on its existing 60s loop
-- (throttled - see syncGuildOptions in index.js) instead of the website
-- needing any direct Discord API access.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default, same as every other
-- bot-owned table. Both the bot and the website's admin API only ever
-- touch these through their service-role clients.

CREATE TABLE IF NOT EXISTS guild_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'voice')),
    position INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE guild_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_roles ENABLE ROW LEVEL SECURITY;
