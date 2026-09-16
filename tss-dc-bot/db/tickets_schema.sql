-- Ticket system: tracks open/closed support channels.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default for anon/authenticated.
-- The bot only ever touches this through its service-role client.

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- UNIQUE (not just indexed): handleTicketOpen checks for an existing open
-- ticket, then inserts a new one - two concurrent clicks on the "open
-- ticket" button (e.g. a double-click) can both pass that check before
-- either insert lands, creating two open ticket channels for the same
-- user. This constraint makes the second insert fail instead, which
-- tickets.js now catches to clean up the redundant channel it just made.
DROP INDEX IF EXISTS idx_tickets_open_by_user;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_open_by_user ON tickets(guild_id, user_id) WHERE status = 'open';

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
