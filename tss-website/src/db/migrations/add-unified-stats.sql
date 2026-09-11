-- Unified site-wide stats: members / online / voice time.
--
-- The homepage showed two disconnected widgets - discord-stats-live.tsx
-- (Discord-only numbers) and home-site-stats.tsx (website-only numbers) -
-- five separate figures where the site actually wants exactly 3 combined
-- ones: total members (Discord + website accounts), total online
-- (Discord + website), and total voice-channel time.
--
-- guild_id lets the bot upsert a single "current stats" row for its guild
-- instead of the old recorded_at-keyed pattern, which used a fresh
-- timestamp on every call so it never actually collided with itself -
-- either silently failing (no matching unique constraint, error never
-- checked) or inserting a new row every 60s forever
-- (see tss-dc-bot/index.js updateDiscordStats()).
--
-- Idempotent: safe to run multiple times.

ALTER TABLE discord_stats
ADD COLUMN IF NOT EXISTS guild_id TEXT;

-- Collapse any pre-existing rows down to the single most recent one
-- before adding the uniqueness constraint, so the ADD CONSTRAINT below
-- doesn't fail on duplicate/NULL guild_id rows left by the old bug.
DELETE FROM discord_stats a USING discord_stats b
WHERE a.recorded_at < b.recorded_at;

UPDATE discord_stats SET guild_id = COALESCE(guild_id, 'default') WHERE guild_id IS NULL;

ALTER TABLE discord_stats
ADD CONSTRAINT discord_stats_guild_id_key UNIQUE (guild_id);

CREATE OR REPLACE FUNCTION get_unified_stats()
RETURNS TABLE (
  total_members BIGINT,
  total_online BIGINT,
  total_voice_minutes BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  threshold TIMESTAMP WITH TIME ZONE := NOW() - INTERVAL '5 minutes';
  d RECORD;
BEGIN
  SELECT member_count, online_users INTO d
  FROM discord_stats
  ORDER BY recorded_at DESC
  LIMIT 1;

  RETURN QUERY
  SELECT
    COALESCE(d.member_count, 0) + (SELECT COUNT(*) FROM profiles) AS total_members,
    COALESCE(d.online_users, 0) + (SELECT COUNT(*) FROM site_sessions WHERE last_seen >= threshold) AS total_online,
    (SELECT COALESCE(SUM(total_voice_minutes), 0) FROM profiles) AS total_voice_minutes;
END;
$$;

-- Grant execute permission to anon/authenticated per your Supabase setup,
-- same as get_site_stats() - this is a public homepage stat, no PII.
-- GRANT EXECUTE ON FUNCTION get_unified_stats() TO anon, authenticated;
