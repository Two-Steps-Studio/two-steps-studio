-- /top_fish (fishing/fishing.js handleFishTop) used to pull EVERY row of
-- fishing_catches (`select('user_id, value')`, no limit) and group/sort it
-- in JavaScript. fishing_catches is append-only (fed by both /fish and
-- every AFK catch, ticking once a minute per active AFK session) with no
-- pruning anywhere in the codebase - same unbounded-growth shape as
-- discord_online_history/activity_log/site_presence, which already needed
-- cleanup jobs for this exact reason. As the table grows this degrades
-- from a cheap indexed lookup into an ever-larger full-table transfer +
-- in-process scan on every single /top_fish call.
--
-- Does the grouping in Postgres instead - O(1) response size regardless
-- of table size.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION fishing_top_anglers(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (user_id TEXT, total_value BIGINT, catch_count BIGINT) AS $$
    SELECT user_id, SUM(value)::BIGINT AS total_value, COUNT(*)::BIGINT AS catch_count
    FROM fishing_catches
    GROUP BY user_id
    ORDER BY total_value DESC
    LIMIT p_limit;
$$ LANGUAGE sql STABLE;

CREATE INDEX IF NOT EXISTS idx_fishing_catches_user_id ON fishing_catches(user_id);
