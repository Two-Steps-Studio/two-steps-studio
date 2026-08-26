-- Add UI language preference to profiles, set at registration and used to
-- sync the client's active locale on login (see use-translation.tsx).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_language_check'
    ) THEN
        ALTER TABLE profiles
        ADD CONSTRAINT profiles_language_check CHECK (language IN ('pl', 'en', 'de'));
    END IF;
END $$;
