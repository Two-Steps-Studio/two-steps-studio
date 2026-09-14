-- Lock down public.profiles: currently readable in full by the anon key
-- (verified live - a plain PostgREST SELECT with the public anon key
-- returned pln_balance, money, bank, settings, etc. for every user, with
-- no auth required). profiles.id is `uuid`-typed live (confirmed by a
-- "text = uuid" error on the first version of this migration), but this
-- repo's own code/history repeatedly treats it as sometimes holding the
-- Discord snowflake (user_metadata.provider_id) instead of auth.uid() -
-- so the owner predicate below checks both, comparing as text so it can't
-- error regardless of which one actually matches for a given row.
--
-- Run this whole file once in the Supabase SQL Editor.

-- 1) Drop every existing policy on profiles, whatever it's named, so no
--    forgotten permissive policy (e.g. a blanket "USING (true)") survives.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- profiles.id turned out to be `uuid`-typed live (not text), so the
-- comparison is normalized to text on both sides here - id::text works
-- whether id is uuid or text, avoiding a hardcoded assumption either way.
CREATE POLICY "Own profile - select"
ON public.profiles FOR SELECT
USING (
  id::text = auth.uid()::text
  OR id::text = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
);

CREATE POLICY "Own profile - update"
ON public.profiles FOR UPDATE
USING (
  id::text = auth.uid()::text
  OR id::text = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
)
WITH CHECK (
  id::text = auth.uid()::text
  OR id::text = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
);

CREATE POLICY "Own profile - insert"
ON public.profiles FOR INSERT
WITH CHECK (
  id::text = auth.uid()::text
  OR id::text = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
);

-- No DELETE policy: nothing in the app deletes a profile client-side, and
-- the service role (used by registration/admin routes) bypasses RLS anyway.

-- 2) Public-safe view for leaderboard + other-user profile pages. Postgres
--    has no column-level RLS, so this is the standard workaround: a view
--    created here (owned by the migration-running role, not the querying
--    user) exposes only these columns and is NOT restricted by the
--    owner-only policies above, while still hiding every column not
--    listed - no pln_balance, vip/svip/mvip flags, settings, inventory,
--    multiplier, referral data, etc.
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id, discord_id, username, avatar_url, level, xp, weekly_xp,
  money, bank, rank, equipped_frame, equipped_nick_color, background,
  discord_roles, total_messages, total_voice_minutes, joined_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 3) fishing_gear: same open-anon-SELECT exposure (currently empty, but
--    open). Nothing in the website queries this table directly (gear
--    lives on profiles.fishing_gear as JSON); only the bot's service-role
--    client writes to it. RLS with zero policies = deny anon/authenticated
--    entirely; the bot's service role still bypasses RLS as normal.
ALTER TABLE public.fishing_gear ENABLE ROW LEVEL SECURITY;

-- 4) get_site_stats() runs SELECT COUNT(*) FROM profiles for the public
--    homepage stat. Without SECURITY DEFINER it runs as the calling role
--    (anon/authenticated), so after the lockdown above it would only ever
--    see rows that role owns - total_profiles would read ~0/1 instead of
--    the real count. SECURITY DEFINER makes it run as its owner instead,
--    which still sees every row via table ownership rather than the
--    caller's RLS-restricted policies. search_path is pinned per Postgres's
--    own recommendation for SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS TABLE (
  online_site BIGINT,
  online_logged_in BIGINT,
  online_anonymous BIGINT,
  total_profiles BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  threshold := NOW() - INTERVAL '5 minutes';

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM site_sessions WHERE last_seen >= threshold) AS online_site,
    (SELECT COUNT(*) FROM site_sessions WHERE last_seen >= threshold AND user_id IS NOT NULL) AS online_logged_in,
    (SELECT COUNT(*) FROM site_sessions WHERE last_seen >= threshold AND user_id IS NULL) AS online_anonymous,
    (SELECT COUNT(*) FROM profiles) AS total_profiles;
END;
$$;

-- Sanity check - run after the above and confirm the row for 'profiles'
-- shows exactly the three "Own profile - *" policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('profiles', 'fishing_gear');
