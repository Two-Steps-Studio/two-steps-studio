-- Missing indexes on foreign-key columns across the live (kept) tables.
-- Postgres does NOT auto-index FK columns (only the referenced side gets
-- one from its PK) - every one of these is queried by its FK in the app
-- (e.g. "all tasks/files/members for project X", "all requirements/
-- screenshots for game X"), so each lookup was doing a full table scan.
--
-- Purely additive - CREATE INDEX IF NOT EXISTS, no data touched, safe to
-- run anytime, safe to re-run. CONCURRENTLY is skipped on purpose: it can't
-- run inside a transaction block, which is how the SQL Editor executes a
-- multi-statement paste - run individually with CONCURRENTLY instead if
-- these tables are large enough that a brief write-lock during a normal
-- CREATE INDEX would actually be felt in production.

-- e_sport_events / event_participants
CREATE INDEX IF NOT EXISTS event_participants_event_id_idx ON event_participants(event_id);

-- dev_projects children not already indexed (dev_tasks, dev_project_members
-- already have indexes - see schema.sql)
CREATE INDEX IF NOT EXISTS dev_roadmap_phases_project_id_idx ON dev_roadmap_phases(project_id);
CREATE INDEX IF NOT EXISTS dev_project_files_project_id_idx ON dev_project_files(project_id);
CREATE INDEX IF NOT EXISTS dev_technologies_project_id_idx ON dev_technologies(project_id);
CREATE INDEX IF NOT EXISTS dev_project_invites_project_id_idx ON dev_project_invites(project_id);
CREATE INDEX IF NOT EXISTS dev_project_invites_invited_by_idx ON dev_project_invites(invited_by);
CREATE INDEX IF NOT EXISTS dev_activity_logs_project_id_idx ON dev_activity_logs(project_id);
CREATE INDEX IF NOT EXISTS dev_activity_logs_user_id_idx ON dev_activity_logs(user_id);

-- games children
CREATE INDEX IF NOT EXISTS game_screenshots_game_id_idx ON game_screenshots(game_id);
CREATE INDEX IF NOT EXISTS game_requirements_game_id_idx ON game_requirements(game_id);
CREATE INDEX IF NOT EXISTS game_releases_game_id_idx ON game_releases(game_id);
CREATE INDEX IF NOT EXISTS game_releases_created_by_idx ON game_releases(created_by);

-- records module
CREATE INDEX IF NOT EXISTS podcasts_series_id_idx ON podcasts(series_id);
CREATE INDEX IF NOT EXISTS beat_packages_beat_id_idx ON beat_packages(beat_id);
CREATE INDEX IF NOT EXISTS beat_sales_beat_id_idx ON beat_sales(beat_id);
CREATE INDEX IF NOT EXISTS beat_sales_package_id_idx ON beat_sales(package_id);

-- API module
CREATE INDEX IF NOT EXISTS api_keys_owner_id_idx ON api_keys(owner_id);
CREATE INDEX IF NOT EXISTS api_request_logs_api_key_id_idx ON api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS api_request_logs_user_id_idx ON api_request_logs(user_id);

-- Profile shop (this session's own additions)
CREATE INDEX IF NOT EXISTS user_inventory_item_id_idx ON user_inventory(item_id);
CREATE INDEX IF NOT EXISTS profiles_equipped_frame_idx ON profiles(equipped_frame);
CREATE INDEX IF NOT EXISTS profiles_equipped_nick_color_idx ON profiles(equipped_nick_color);
