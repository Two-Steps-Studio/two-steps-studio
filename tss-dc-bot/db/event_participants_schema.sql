-- event_participants had no unique constraint on (event_id, user_id) -
-- handleEventJoin (events/events.js) checks "already joined" and the
-- participant-count capacity limit, then inserts, as separate steps with
-- no lock between them. Two concurrent /event_join calls for the same
-- user (a double-click) could both pass the "already joined" check before
-- either insert landed, producing a duplicate row that inflates the
-- participant count and lists the same person twice.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS - guard it manually so this
-- file stays safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_participants_event_user_unique'
  ) THEN
    ALTER TABLE event_participants
      ADD CONSTRAINT event_participants_event_user_unique UNIQUE (event_id, user_id);
  END IF;
END $$;
