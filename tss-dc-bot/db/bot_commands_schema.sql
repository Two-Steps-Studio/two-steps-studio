-- Command queue: lets the website's /admin/bot panel trigger real Discord
-- actions (starting with giveaways) that only the bot process can actually
-- perform (posting an embed, reacting, etc.) - the website can't do that
-- through Supabase directly. Same idea as the bot's existing 60s stats
-- loop: the website writes a pending row here, the bot polls and executes
-- it, then marks the result.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default. The website's admin API
-- writes through the service-role client (already admin-gated at the
-- application layer via requireRole), and the bot reads/writes through its
-- own service-role client - same pattern as every other bot-owned table.

CREATE TABLE IF NOT EXISTS bot_commands (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('giveaway_start')),
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
    error TEXT,
    requested_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bot_commands_pending ON bot_commands(created_at) WHERE status = 'pending';

ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;
