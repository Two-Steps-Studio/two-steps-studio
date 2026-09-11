-- Lightweight activity feed for the website dashboard (/dashboard) - joins,
-- level-ups, shop purchases, messages. Not a full audit log, just the last
-- ~10-20 events for a "what's happening" feed.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default. Bot writes and the
-- website reads both go through the service-role client.

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('join', 'level_up', 'purchase', 'message')),
    username TEXT NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- REVISION 2 -- adds 'message' to the type check. join/level_up/purchase
-- are all rare on a quiet server, so the feed looked permanently empty
-- even while working correctly; messages are by far the most frequent
-- event, so including them keeps the feed actually showing something.
-- ALTER...ADD CONSTRAINT has no IF NOT EXISTS, and a plain CREATE TABLE IF
-- NOT EXISTS above never touches an already-existing table's constraint,
-- so this needs its own idempotent drop-and-recreate.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_log_type_check'
  ) THEN
    ALTER TABLE activity_log DROP CONSTRAINT activity_log_type_check;
  END IF;
  ALTER TABLE activity_log ADD CONSTRAINT activity_log_type_check
    CHECK (type IN ('join', 'level_up', 'purchase', 'message'));
END $$;
