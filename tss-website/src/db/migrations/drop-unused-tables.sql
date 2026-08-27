-- Drop dead tables: audited 2026-08-27, zero rows in every one of them,
-- zero references in application code (tss-website or tss-dc-bot) via
-- .from(), .rpc(), or embedded-relation selects (e.g. `podcast_series(*)`)
-- - checked those specifically to rule out false negatives.
--
-- Grouped by why they're dead:
--   1. Superseded by a different, actually-used system.
--   2. Quest/season gamification scaffolding that was never wired up.
--   3. Replaced by a simpler mechanism (in-memory tracking, a jsonb
--      column on the parent row, or reading from a different table).
--
-- CASCADE handles the FK ordering between these tables automatically
-- (e.g. user_badges -> badges, season_quests -> seasons). None of the
-- tables being KEPT are referenced by anything in this list, so nothing
-- outside this group is affected.
--
-- Irreversible. Row counts were verified at 0 immediately before writing
-- this file - re-check before running if time has passed.

-- 1. Superseded
DROP TABLE IF EXISTS users CASCADE;                    -- pre-Supabase-Auth login table (password_hash etc.) - replaced by profiles + Supabase Auth
DROP TABLE IF EXISTS user_badges CASCADE;               -- superseded by user_achievements/achievements
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;         -- unlock state is computed live from profiles stats, never written/read

-- 2. Unimplemented quest/season scaffolding
DROP TABLE IF EXISTS user_daily_progress CASCADE;
DROP TABLE IF EXISTS daily_quests CASCADE;
DROP TABLE IF EXISTS user_weekly_progress CASCADE;
DROP TABLE IF EXISTS weekly_quests CASCADE;
DROP TABLE IF EXISTS season_rankings CASCADE;
DROP TABLE IF EXISTS season_rewards CASCADE;
DROP TABLE IF EXISTS season_quests CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS user_monthly_progress CASCADE;
DROP TABLE IF EXISTS monthly_challenges CASCADE;
DROP TABLE IF EXISTS daily_logins CASCADE;
DROP TABLE IF EXISTS weekly_activity CASCADE;
DROP TABLE IF EXISTS monthly_activity CASCADE;
DROP TABLE IF EXISTS level_thresholds CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;          -- settings live in profiles.settings jsonb / profiles.language instead

-- 3. Replaced by a simpler mechanism
DROP TABLE IF EXISTS notifications CASCADE;             -- /notifications page reads news/e_sport_events/dev_tasks directly
DROP TABLE IF EXISTS voice_sessions CASCADE;             -- bot tracks active voice sessions in an in-memory Map instead
DROP TABLE IF EXISTS temp_roles CASCADE;
DROP TABLE IF EXISTS dev_task_attachments CASCADE;
DROP TABLE IF EXISTS dev_task_comments CASCADE;
DROP TABLE IF EXISTS dev_project_columns CASCADE;        -- dev_projects.columns jsonb holds this instead
