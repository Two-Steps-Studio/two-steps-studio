-- Extends the website's existing role system (src/lib/auth-helpers.ts) so
-- ADMIN/MODERATOR can be granted from a table instead of only the two
-- hardcoded paths that already exist there (the "Owner" Discord role, and
-- the manual profiles.settings.isAdmin flag). This is literally the TODO
-- already left in that file: "fetch from user_roles table instead of
-- settings.isAdmin". Also adds bot_settings for the /admin/bot panel.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times, EXCEPT the seed INSERT at the
-- bottom - fill in your own Discord ID there before running, or you'll
-- have no way into /admin/bot (the games/users tabs already work via the
-- existing settings.isAdmin flag, this only affects the new bot panel).
--
-- RLS enabled with no policies -- deny-by-default, same as every other
-- bot-owned table. requireAuth() reads this through the service-role
-- client (see auth-helpers.ts), which bypasses RLS entirely.

-- A row grants `role` either to everyone holding a given Discord role
-- (discord_role_name matched the same way the existing "Owner" check
-- already does - the label between "︱" and "〕", lowercased, so
-- decorative emoji prefixes/suffixes don't break the match - enter it in
-- lowercase here, e.g. 'moderator' for a role literally named
-- "〔 🛡️︱Moderator 〕"), or to one specific user (user_id = profiles.id,
-- the Discord snowflake). Exactly one of the two must be set.
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MODERATOR')),
    discord_role_name TEXT,
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (discord_role_name IS NOT NULL AND user_id IS NULL) OR
        (discord_role_name IS NULL AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(discord_role_name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Partial unique indexes (not a table-level UNIQUE, since only one of the
-- two columns is ever set) so the seed INSERT's ON CONFLICT DO NOTHING
-- below has something to conflict on, and re-running this file doesn't
-- pile up duplicate grants.
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_user ON user_roles(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_role_name ON user_roles(discord_role_name, role) WHERE discord_role_name IS NOT NULL;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Key/value bot config editable from /admin/bot. The bot reads these with
-- a fallback to the matching .env var when a key isn't set here, so
-- nothing breaks for anyone who hasn't touched the panel yet.
CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bot_settings ENABLE ROW LEVEL SECURITY;

-- Seed yourself as ADMIN so /admin/bot isn't a locked door with no key.
-- Replace <TWOJE_DISCORD_ID> with your real Discord user ID (right-click
-- your name in Discord with Developer Mode on -> "Copy User ID"). Use
-- 'OWNER' instead of 'ADMIN' if you want the top tier explicitly, though
-- your real Discord Owner role already grants that automatically.
INSERT INTO user_roles (role, user_id)
VALUES ('ADMIN', '<TWOJE_DISCORD_ID>')
ON CONFLICT DO NOTHING;
