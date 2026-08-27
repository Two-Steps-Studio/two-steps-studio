-- Achievements for level / messages / voice time.
--
-- The existing `achievements` table (schema.sql) only describes rewards
-- (xp_reward, pln_reward) for an unlocked achievement - it has no column
-- for WHAT unlocks it. Adding requirement_type/requirement_value so the
-- website can compute "is this unlocked?" straight from profiles.level /
-- total_messages / total_voice_minutes, with no extra write path needed
-- for these three types (user_achievements stays available for other,
-- manually-awarded achievements later).
--
-- profiles.total_messages / total_voice_minutes are NEW counters - the bot
-- doesn't track these per-user today (only XP, which mixes both sources
-- together). They start at 0, so these achievements only count activity
-- from when the bot starts writing to them onward, not retroactively.
--
-- Idempotent: safe to run multiple times.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_messages INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_voice_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS requirement_type TEXT CHECK (requirement_type IN ('level', 'messages', 'voice_minutes')),
ADD COLUMN IF NOT EXISTS requirement_value INTEGER;

-- ── Atomic counters, called by the bot (service role, bypasses RLS)
--    alongside its existing apply_xp_money_reward calls ──
CREATE OR REPLACE FUNCTION increment_message_count(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles SET total_messages = total_messages + 1 WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION increment_voice_minutes(p_user_id TEXT, p_minutes INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles SET total_voice_minutes = total_voice_minutes + p_minutes WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── Catalog: level / message / voice-time tiers ──
INSERT INTO achievements (name, description, icon, rarity, requirement_type, requirement_value) VALUES
    ('Poziom 5',    'Osiągnij poziom 5',                         '🎖️', 'common',    'level', 5),
    ('Poziom 10',   'Osiągnij poziom 10',                        '🎖️', 'common',    'level', 10),
    ('Poziom 25',   'Osiągnij poziom 25',                        '🏅', 'rare',      'level', 25),
    ('Poziom 50',   'Osiągnij poziom 50',                        '🏅', 'epic',      'level', 50),
    ('Poziom 75',   'Osiągnij poziom 75',                        '👑', 'epic',      'level', 75),
    ('Poziom 100',  'Osiągnij poziom 100',                       '👑', 'legendary', 'level', 100),

    ('Gaduła',          'Wyślij 100 wiadomości',                 '💬', 'common',    'messages', 100),
    ('Aktywny Członek', 'Wyślij 500 wiadomości',                 '💬', 'common',    'messages', 500),
    ('Wygadany',        'Wyślij 1 000 wiadomości',                '📢', 'rare',      'messages', 1000),
    ('Legenda Czatu',   'Wyślij 5 000 wiadomości',                '📢', 'epic',      'messages', 5000),
    ('Nie Do Zatrzymania', 'Wyślij 10 000 wiadomości',            '🔥', 'legendary', 'messages', 10000),

    ('Pierwsza Rozmowa', 'Spędź 1 godzinę na kanałach głosowych',  '🎙️', 'common',    'voice_minutes', 60),
    ('Stały Bywalec',    'Spędź 5 godzin na kanałach głosowych',   '🎧', 'rare',      'voice_minutes', 300),
    ('Głos Społeczności','Spędź 25 godzin na kanałach głosowych',  '🎧', 'epic',      'voice_minutes', 1500),
    ('Mieszkaniec Voice','Spędź 100 godzin na kanałach głosowych', '🌟', 'legendary', 'voice_minutes', 6000)
ON CONFLICT (name) DO NOTHING;
