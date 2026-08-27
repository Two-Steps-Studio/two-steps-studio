-- Database schema for Two Steps Studio website (PostgreSQL/Supabase version)
--
-- Pruned 2026-08-27: removed CREATE TABLE blocks for tables dropped by
-- migrations/drop-unused-tables.sql (users, level_thresholds, badges,
-- user_badges, daily_quests/user_daily_progress, weekly_quests/
-- user_weekly_progress, seasons + its child tables, monthly_challenges/
-- user_monthly_progress, user_achievements, daily_logins, weekly_activity,
-- monthly_activity, user_preferences, notifications, dev_project_columns) -
-- all had 0 rows and 0 references anywhere in tss-website/tss-dc-bot.

-- Gamification profiles (core table with PLN balance)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    avatar_url TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    money INTEGER DEFAULT 0,              -- Discord bot coins
    pln_balance DECIMAL(10,2) DEFAULT 0.00, -- Polity walutowy balans w PLN
    bank INTEGER DEFAULT 0,
    is_bot_active BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}',
    project_limit INTEGER DEFAULT 1,      -- DEV module: max own projects user can create
    joined_projects_limit INTEGER DEFAULT 3, -- DEV module: max joined projects (from invites)
    subscription_plan TEXT DEFAULT 'free', -- DEV module: subscription tier (free, pro, enterprise)
    games_visible BOOLEAN DEFAULT TRUE,   -- Category visibility settings
    records_visible BOOLEAN DEFAULT TRUE,
    dev_visible BOOLEAN DEFAULT TRUE,
    language TEXT DEFAULT 'en',           -- UI language preference (pl/en/de), set at registration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Special achievements (milestones, rare accomplishments). Unlock state is
-- computed live from profiles.level/total_messages/total_voice_minutes vs.
-- requirement_type/requirement_value - there's no user_achievements table,
-- it was dropped unused (see migrations/add-achievement-tracking.sql).
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'common',
    xp_reward INTEGER DEFAULT 0,
    pln_reward DECIMAL(10,2) DEFAULT 0.00,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    requirement_type TEXT CHECK (requirement_type IN ('level', 'messages', 'voice_minutes')),
    requirement_value INTEGER,
    UNIQUE (name)
);

-- Developer tasks (DEV board) - MULTI-PROJECT SUPPORT
-- Typ statusów (jeśli nie istnieje w bazie)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'testing', 'completed');
    END IF;
END $$;

-- Projects table (nowe podejście - każdy użytkownik może mieć własny projekt)
CREATE TABLE IF NOT EXISTS dev_projects (
    id SERIAL PRIMARY KEY,
    owner_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#ffcb2f',
    status VARCHAR(20) DEFAULT 'active',
    columns JSONB DEFAULT '[]',  -- Kolumny: [{id, name, color, position, icon}] - dev_project_columns table was dropped unused, this jsonb column is the real source
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (z rozszerzonymi polami)
-- NOTE: assigned_to has no FK constraint on the live table (verified against
-- an actual `supabase db dump` from the user, 2026-08-27) - keeping it that
-- way here rather than the old `REFERENCES users(id)`, since the `users`
-- table (a pre-Supabase-Auth relic) was dropped.
CREATE TABLE IF NOT EXISTS dev_tasks (
    id SERIAL PRIMARY KEY,
    project_id INT DEFAULT 1 REFERENCES dev_projects(id) ON DELETE SET DEFAULT,
    title VARCHAR(200),
    description TEXT,
    assigned_to INT,
    status task_status DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    tags TEXT[] DEFAULT '{}',  -- Tagi: feature, bug, chore, design, etc.
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    completed_at TIMESTAMP WITH TIME ZONE,
    custom_fields JSONB DEFAULT '{}',
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    assignee_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS dev_tasks_project_status_idx ON dev_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS dev_tasks_priority_idx ON dev_tasks(priority);
CREATE INDEX IF NOT EXISTS dev_tasks_assigned_idx ON dev_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS dev_tasks_due_date_idx ON dev_tasks(due_date);

-- Additional performance indices for DEV module
CREATE INDEX IF NOT EXISTS dev_projects_owner_id_idx ON dev_projects(owner_id);
CREATE INDEX IF NOT EXISTS dev_projects_status_idx ON dev_projects(status);
CREATE INDEX IF NOT EXISTS dev_project_members_user_id_idx ON dev_project_members(user_id);
CREATE INDEX IF NOT EXISTS dev_project_members_project_id_idx ON dev_project_members(project_id);
CREATE INDEX IF NOT EXISTS dev_project_members_role_idx ON dev_project_members(role);

-- Add constraints for data integrity
ALTER TABLE dev_projects ADD CONSTRAINT IF NOT EXISTS dev_projects_name_not_empty CHECK (LENGTH(TRIM(name)) > 0);
ALTER TABLE dev_projects ADD CONSTRAINT IF NOT EXISTS dev_projects_color_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE dev_tasks ADD CONSTRAINT IF NOT EXISTS dev_tasks_title_not_empty CHECK (LENGTH(TRIM(title)) > 0);
ALTER TABLE dev_tasks ADD CONSTRAINT IF NOT EXISTS dev_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical'));

-- Profile customization shop: purchasable avatar frames + nick colors,
-- paid for with the existing profiles.money coin balance
-- (see migrations/add-shop-inventory-achievements.sql for the full
-- migration incl. the purchase_shop_item() RPC and RLS policies).
CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('frame', 'nick_color')),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),
    value TEXT NOT NULL,          -- frame: CSS ring/gradient spec; nick_color: hex
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_inventory (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);

-- profiles.equipped_frame / equipped_nick_color reference shop_items(id),
-- nullable (null = default look). Added via ALTER TABLE in the migration
-- file rather than here, to match how pln_balance/vip_status etc. were
-- added to the live profiles table.

-- profiles.total_messages / total_voice_minutes (added via ALTER TABLE in
-- migrations/add-achievement-tracking.sql) - per-user counters the bot
-- increments alongside its existing XP awards, used to compute the level/
-- messages/voice-time achievement tiers. achievements.requirement_type/
-- requirement_value (added the same way) encode what unlocks each one.

-- NOTE: this file does not document every live table (e.g. voice_sessions,
-- fishing_gear, fishing_catches, games, music_tracks, podcasts, beats,
-- api_keys, site_sessions...) - it was already a partial/stale copy before
-- this prune, not the actual source of truth for the full live schema.
