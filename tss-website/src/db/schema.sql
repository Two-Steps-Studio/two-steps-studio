-- Database schema for Two Steps Studio website (PostgreSQL/Supabase version)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

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

-- Level thresholds (XP required for each level)
CREATE TABLE IF NOT EXISTS level_thresholds (
    level INTEGER PRIMARY KEY,
    xp_required INTEGER NOT NULL
);

-- Badges and achievements system
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    rarity VARCHAR(20) DEFAULT 'common',
    xp_reward INTEGER DEFAULT 0,
    pln_reward DECIMAL(10,2) DEFAULT 0.00,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Award badges to users
CREATE TABLE IF NOT EXISTS user_badges (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, badge_id),
    PRIMARY KEY (user_id, badge_id)
);

-- Daily quests system
CREATE TABLE IF NOT EXISTS daily_quests (
    id SERIAL PRIMARY KEY,
    quest_name VARCHAR(100) NOT NULL,
    quest_type VARCHAR(50),
    reward_xp INTEGER DEFAULT 0,
    reward_pln DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (quest_name)
);

-- User daily quest progress
CREATE TABLE IF NOT EXISTS user_daily_progress (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    quest_id INTEGER REFERENCES daily_quests(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, quest_id)
);

-- Weekly quests (7-day quests)
CREATE TABLE IF NOT EXISTS weekly_quests (
    id SERIAL PRIMARY KEY,
    quest_name VARCHAR(100) NOT NULL,
    quest_type VARCHAR(50),
    reward_xp INTEGER DEFAULT 0,
    reward_pln DECIMAL(10,2) DEFAULT 0.00,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (quest_name)
);

-- User weekly quest progress
CREATE TABLE IF NOT EXISTS user_weekly_progress (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    quest_id INTEGER REFERENCES weekly_quests(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, quest_id)
);

-- Seasonal leaderboards and tournaments
CREATE TABLE IF NOT EXISTS seasons (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    theme VARCHAR(100),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    reward_xp INTEGER,
    reward_pln DECIMAL(10,2),
    bonus_xp INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE
);

-- Seasonal quests
CREATE TABLE IF NOT EXISTS season_quests (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    quest_name VARCHAR(100),
    quest_type VARCHAR(50),
    reward_xp INTEGER,
    reward_pln DECIMAL(10,2),
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seasonal rewards and achievements
CREATE TABLE IF NOT EXISTS season_rewards (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    name VARCHAR(100),
    description TEXT,
    image_url TEXT,
    reward_xp INTEGER,
    reward_pln DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard rankings
CREATE TABLE IF NOT EXISTS season_rankings (
    id SERIAL PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    user_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    score INTEGER NOT NULL,
    xp INTEGER,
    pln DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (season_id, rank)
);

-- Monthly challenges (monthly quests)
CREATE TABLE IF NOT EXISTS monthly_challenges (
    id SERIAL PRIMARY KEY,
    challenge_name VARCHAR(100) UNIQUE NOT NULL,
    challenge_type VARCHAR(50),
    reward_xp INTEGER,
    reward_pln DECIMAL(10,2),
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User monthly challenge progress
CREATE TABLE IF NOT EXISTS user_monthly_progress (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id INTEGER REFERENCES monthly_challenges(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, challenge_id)
);

-- Special achievements (milestones, rare accomplishments)
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
    UNIQUE (name)
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, achievement_id),
    PRIMARY KEY (user_id, achievement_id)
);

-- Daily login streak tracking
CREATE TABLE IF NOT EXISTS daily_logins (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    login_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, login_date),
    PRIMARY KEY (user_id, login_date)
);

-- Weekly activity tracking
CREATE TABLE IF NOT EXISTS weekly_activity (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    activity_type VARCHAR(50),
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, week_start, activity_type),
    PRIMARY KEY (user_id, week_start)
);

-- Monthly activity tracking
CREATE TABLE IF NOT EXISTS monthly_activity (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,
    activity_type VARCHAR(50),
    count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, month_start, activity_type),
    PRIMARY KEY (user_id, month_start)
);

-- User preferences (JSONB)
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    preferences JSONB DEFAULT '{"theme":"ocean","notifications":true,"language":"pl"}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id),
    PRIMARY KEY (user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    columns JSONB DEFAULT '[]',  -- Kolumny: [{id, name, color, position, icon}]
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project columns (kanban kolumny dla każdego projektu)
CREATE TABLE IF NOT EXISTS dev_project_columns (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6',
    position INT DEFAULT 0,
    icon VARCHAR(50),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (z rozszerzonymi polami)
CREATE TABLE IF NOT EXISTS dev_tasks (
    id SERIAL PRIMARY KEY,
    project_id INT DEFAULT 1 REFERENCES dev_projects(id) ON DELETE SET DEFAULT,
    title VARCHAR(200),
    description TEXT,
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    status task_status DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',  -- low, medium, high, critical
    tags TEXT[] DEFAULT '{}',  -- Tagi: feature, bug, chore, design, etc.
    due_date TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    completed_at TIMESTAMP WITH TIME ZONE,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS dev_tasks_project_status_idx ON dev_tasks(project_id, status);
CREATE INDEX IF NOT EXISTS dev_tasks_priority_idx ON dev_tasks(priority);
CREATE INDEX IF NOT EXISTS dev_tasks_assigned_idx ON dev_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS dev_tasks_due_date_idx ON dev_tasks(due_date);
CREATE INDEX IF NOT EXISTS dev_project_columns_project_id_idx ON dev_project_columns(project_id);

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
