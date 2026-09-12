-- site_presence is append-only (one INSERT per visitor per 30s ping - see
-- api/ping/route.ts and presence-ping.tsx, mounted site-wide including on
-- /dashboard, which is meant to be left open on a TV 24/7) and had NO
-- index at all - every phase2-performance.sql / add-performance-indexes.sql
-- pass indexed site_sessions but missed this table entirely.
--
-- api/site-stats-history/route.ts (the 24h chart, polled every 30s by every
-- open dashboard) filters this table by seen_at on every call. Without an
-- index that's a full sequential scan over an ever-growing, never-pruned
-- table - exactly the kind of query that gets slower every day and shows
-- up as "exhausting resources" in the Supabase dashboard.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.

CREATE INDEX IF NOT EXISTS idx_site_presence_seen_at ON site_presence(seen_at);

-- Table has no primary key, so Postgres has no default replica identity to
-- publish DELETEs with (it's presumably in the supabase_realtime
-- publication like every table by default) - without this, both this
-- DELETE and the bot's hourly cleanup fail with "cannot delete from table
-- ... because it does not have a replica identity and publishes deletes".
-- FULL just means "use the whole row as identity", fine for a table this
-- size/shape - no schema/column change needed.
ALTER TABLE site_presence REPLICA IDENTITY FULL;

-- One-time catch-up: nothing ever reads site_presence past the 24h window
-- (see site-stats-history/route.ts), so everything older than that is
-- pure dead weight inflating table size and scan cost. Ongoing pruning is
-- now handled by the bot every ~hour (see tss-dc-bot/index.js,
-- cleanupSitePresence) so this table stays small going forward instead of
-- needing this run again.
DELETE FROM site_presence WHERE seen_at < NOW() - INTERVAL '48 hours';
