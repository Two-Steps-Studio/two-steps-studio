-- Recruitment applications (/recruitment, /dev/recruitment): both forms
-- posted directly to Discord as the ONLY persistence - if that POST
-- failed (rate limit, bot down, embed rejected for exceeding Discord's
-- field-length limit), the application was gone with no way to recover
-- it, and there was no way for staff to see past applications, change
-- their status, or find one again once it scrolled off the Discord
-- channel. This table is now the source of truth; api/recruitment and
-- api/dev/recruitment insert here first and the Discord post becomes a
-- best-effort notification on top of it.
--
-- Idempotent - safe to re-run. Run manually in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS recruitment_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Which form/route it came from - /recruitment has a type selector
    -- (dev / discord_admin), /dev/recruitment doesn't (always 'dev').
    source TEXT NOT NULL DEFAULT 'recruitment', -- 'recruitment' | 'dev_recruitment'
    type TEXT NOT NULL DEFAULT 'dev', -- 'dev' | 'discord_admin'
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    discord TEXT NOT NULL,
    position TEXT NOT NULL,
    experience TEXT NOT NULL,
    motivation TEXT NOT NULL,
    portfolio TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
    reviewed_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recruitment_applications_status ON recruitment_applications(status);
CREATE INDEX IF NOT EXISTS idx_recruitment_applications_created_at ON recruitment_applications(created_at DESC);

-- RLS: all writes/reads go through the service-role key in API routes
-- (which bypasses RLS) - the public POST routes use it to insert, the
-- admin GET/PATCH routes use it after their own requireAdmin() check.
-- Without RLS the anon key could read every applicant's name/email/
-- Discord handle.
ALTER TABLE recruitment_applications ENABLE ROW LEVEL SECURITY;
