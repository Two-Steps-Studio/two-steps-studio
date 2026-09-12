-- Removes the "dev projects" project-management feature area: confirmed
-- dead by a full-repo audit before this was written - no page anywhere on
-- the site ever linked to /dev/projects, the React context that would
-- have driven it (dev-project-context.tsx) had zero consumers, and the
-- middleware access-check for /dev/projects/[id] was unreachable (no page
-- produces that URL). The API-key system (api_keys table, /api/v1/*) only
-- ever existed to authenticate against this same dead project/task API,
-- so it's included here too - dropping the tables it authenticates
-- against would have left it as a pointless orphan otherwise.
--
-- All application code that touched these tables/columns has already been
-- deleted from the repo in the same change that added this file - this
-- migration is the database-side half of that cleanup.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times (IF EXISTS everywhere).
--
-- This is destructive - it drops real tables and columns. Back up first
-- if you want to keep any project/task data that might exist in them.

-- Dependent tables first (CASCADE also cleans up their own indexes,
-- policies, and triggers automatically).
DROP TABLE IF EXISTS dev_project_files CASCADE;
DROP TABLE IF EXISTS dev_technologies CASCADE;
DROP TABLE IF EXISTS dev_roadmap_phases CASCADE;
DROP TABLE IF EXISTS dev_task_comments CASCADE;
DROP TABLE IF EXISTS dev_activity_logs CASCADE;
DROP TABLE IF EXISTS dev_project_invites CASCADE;
DROP TABLE IF EXISTS dev_tasks CASCADE;
DROP TABLE IF EXISTS dev_project_members CASCADE;
DROP TABLE IF EXISTS dev_projects CASCADE;

-- API keys existed solely to authenticate against /api/v1/projects and
-- /api/v1/tasks (verified: zero other call sites referenced them).
DROP TABLE IF EXISTS api_request_logs CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TYPE IF EXISTS api_key_type CASCADE;
DROP TYPE IF EXISTS api_key_status CASCADE;

-- Drop the columns before their enum types, since the columns reference
-- them.
ALTER TABLE profiles
    DROP COLUMN IF EXISTS project_limit,
    DROP COLUMN IF EXISTS joined_projects_limit,
    DROP COLUMN IF EXISTS subscription_plan,
    DROP COLUMN IF EXISTS subscription_status,
    DROP COLUMN IF EXISTS subscription_expires_at;

DROP TYPE IF EXISTS dev_project_role CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS dev_project_status CASCADE;
DROP TYPE IF EXISTS dev_invite_status CASCADE;
DROP TYPE IF EXISTS dev_activity_action CASCADE;
DROP TYPE IF EXISTS project_type CASCADE;

-- Not dropped here: the standalone helper functions this feature added
-- (get_user_project_limit, get_user_project_count, can_user_create_project,
-- get_user_project_role, is_project_owner, has_project_permission,
-- generate_invite_token, log_dev_activity, can_manage_project,
-- get_default_permissions, soft_delete_project, restore_project). Their
-- exact signatures weren't confirmed before writing this, and they're
-- harmless orphaned routines now that nothing calls them (the tables/
-- triggers that used them are already gone via CASCADE above) - drop them
-- manually later if you want full cleanup, e.g. via:
--   SELECT proname, oidvectortypes(proargtypes) FROM pg_proc WHERE proname IN
--   ('get_user_project_limit','get_user_project_count','can_user_create_project',
--    'get_user_project_role','is_project_owner','has_project_permission',
--    'generate_invite_token','log_dev_activity','can_manage_project',
--    'get_default_permissions','soft_delete_project','restore_project');
