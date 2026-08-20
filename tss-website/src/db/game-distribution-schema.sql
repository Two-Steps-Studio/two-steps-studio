-- ============================================================================
-- tss-website — Game distribution schema (releases/manifests for in-app
-- download, install, update, verify, uninstall)
--
-- HOW TO APPLY: paste this entire file into the Supabase SQL Editor for the
-- shared tss-website/tss-dc-bot project and run it once. Uses
-- CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS
-- throughout, so re-running after an edit is safe/idempotent. There is no
-- migration runner in this repo — this file IS the migration (same
-- convention as tss-website/src/db/games-records-schema.sql and
-- tss-dc-bot/db/atomic_mutations.sql).
--
-- VERIFIED against live code (not assumed):
--   - games.id is SERIAL/INTEGER (tss-website/src/db/games-records-schema.sql
--     line 42, tss-website/src/types/games-records.ts Game.id?: number) —
--     game_id below is INTEGER, not uuid.
--   - profiles.id is TEXT (stores the Supabase auth user id as text, not a
--     native uuid column — confirmed by the live "incompatible types: uuid
--     and text" error when this file first tried a UUID FK) — created_by
--     below is TEXT to match.
--   - RLS pattern mirrors games-records-schema.sql section 7 exactly:
--     authenticated SELECT gated on published status, all writes via
--     service_role.
--   - No storage.objects RLS policies are added here: both the signed
--     download-URL route and the admin signed-upload-URL route call
--     createServiceClient() (service role) after their own requireAuth()/
--     requireAdmin() check, same pattern as uploadFile() in
--     src/lib/supabase-storage.ts — service role bypasses RLS, so no
--     storage.objects policy mediates anything here. The bucket itself is
--     created with public:false via code (ensureBucketExists), not SQL.
--
-- MANUAL STEP NOT COVERED BY THIS FILE: the Supabase project's global
-- Storage upload size limit (Dashboard → Storage → Settings) must be raised
-- above the default (varies by plan, commonly capped low) to allow
-- multi-GB game build files. This cannot be set via SQL or app code.
-- ============================================================================

CREATE TABLE IF NOT EXISTS game_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'windows', -- plain text, not an enum: keep it open for 'mac'/'linux' later
    channel TEXT NOT NULL DEFAULT 'stable',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    executable_path TEXT NOT NULL, -- relative path within the extracted build; validated server-side at finalize
    manifest_path TEXT NOT NULL,   -- storage path to this release's manifest.json
    manifest_sha256 TEXT,          -- hash of manifest.json itself, set at finalize
    total_size_bytes BIGINT NOT NULL DEFAULT 0,
    file_count INTEGER NOT NULL DEFAULT 0,
    release_notes TEXT,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (game_id, platform, version)
);

-- Only one is_current=true row per (game_id, platform)
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_releases_one_current
    ON game_releases (game_id, platform)
    WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_game_releases_game_id ON game_releases(game_id);
CREATE INDEX IF NOT EXISTS idx_game_releases_status ON game_releases(status);
CREATE INDEX IF NOT EXISTS idx_game_releases_game_platform_status
    ON game_releases(game_id, platform, status);

CREATE OR REPLACE FUNCTION update_game_releases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_game_releases_updated_at ON game_releases;
CREATE TRIGGER trigger_update_game_releases_updated_at
    BEFORE UPDATE ON game_releases
    FOR EACH ROW
    EXECUTE FUNCTION update_game_releases_updated_at();

-- RLS: mirrors the games table's own pattern (games-records-schema.sql) —
-- authenticated users can read published releases; everything else
-- (including draft visibility, all writes) goes through requireAdmin()
-- at the app layer + service-role client, matching existing convention.
ALTER TABLE game_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read published releases" ON game_releases;
CREATE POLICY "Authenticated users can read published releases" ON game_releases
    FOR SELECT USING (status = 'published' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role can manage releases" ON game_releases;
CREATE POLICY "Service role can manage releases" ON game_releases
    FOR ALL USING (auth.role() = 'service_role');
