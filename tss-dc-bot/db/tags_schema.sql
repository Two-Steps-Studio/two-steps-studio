-- Custom tags: admin-defined trigger -> auto-response text.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default, bot only touches this
-- through its service-role client.

CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (guild_id, trigger)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
