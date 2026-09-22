-- /fishtop (fishing/fishing.js, handleFishTop) used to run
-- `select('user_id, value')` with no WHERE and no LIMIT - a full scan of
-- the entire fishing_catches table (every catch, every player, ever),
-- pulled into the bot process just to GROUP BY/SUM/sort/slice(10) in JS.
-- fishing_catches only ever grows (AFK fishing inserts a row every 60s per
-- active session, plus every manual /fish catch) and isn't pruned - unlike
-- activity_log/discord_online_history, its rows are real player history
-- (fishing stats, /fish stats totals), not a disposable feed, so pruning
-- it isn't safe. The fix instead is doing the aggregation in Postgres,
-- where it belongs, and only ever returning the already-limited result.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once (same as
-- every other file in this db/ folder - no automated migration runner in
-- this project). Idempotent: safe to run multiple times.

CREATE OR REPLACE FUNCTION get_fishing_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (user_id TEXT, total_value BIGINT, catch_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT fc.user_id,
           SUM(fc.value)::BIGINT AS total_value,
           COUNT(*)::BIGINT AS catch_count
    FROM fishing_catches fc
    GROUP BY fc.user_id
    ORDER BY total_value DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
