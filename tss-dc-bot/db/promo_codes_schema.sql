-- Promo codes: admin-created codes redeemable once per user for a fixed
-- money/XP reward, from either the bot (/kod) or the website (/profile).
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times.
--
-- RLS enabled with no policies -- deny-by-default, same as every other
-- bot-owned table. Both the bot and the website's redeem API only ever
-- touch these through their service-role clients.

CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    reward_money INTEGER NOT NULL DEFAULT 0,
    reward_xp INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER, -- NULL = unlimited
    uses_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ, -- NULL = never expires
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_code_redemptions (
    id SERIAL PRIMARY KEY,
    code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code_id, user_id) -- one redemption per user per code, enforced
                              -- by the DB, not just application logic
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Atomic redeem: locks the code row (FOR UPDATE) so two simultaneous
-- redemptions of a limited-use code can't both slip past the max_uses
-- check, and relies on the UNIQUE constraint above (caught as
-- unique_violation) to make "already redeemed by this user" race-proof
-- too, rather than a plain SELECT-then-INSERT check-then-act.
CREATE OR REPLACE FUNCTION redeem_promo_code(p_user_id TEXT, p_code TEXT)
RETURNS TABLE (success BOOLEAN, message TEXT, reward_money INTEGER, reward_xp INTEGER, new_money INTEGER)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
    v_code RECORD;
    v_new_money INTEGER;
BEGIN
    SELECT * INTO v_code FROM promo_codes WHERE code = UPPER(TRIM(p_code)) FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Nieprawidłowy kod.'::TEXT, 0, 0, 0;
        RETURN;
    END IF;

    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
        RETURN QUERY SELECT FALSE, 'Ten kod już wygasł.'::TEXT, 0, 0, 0;
        RETURN;
    END IF;

    IF v_code.max_uses IS NOT NULL AND v_code.uses_count >= v_code.max_uses THEN
        RETURN QUERY SELECT FALSE, 'Ten kod został już w pełni wykorzystany.'::TEXT, 0, 0, 0;
        RETURN;
    END IF;

    BEGIN
        INSERT INTO promo_code_redemptions (code_id, user_id) VALUES (v_code.id, p_user_id);
    EXCEPTION WHEN unique_violation THEN
        RETURN QUERY SELECT FALSE, 'Już wykorzystałeś ten kod.'::TEXT, 0, 0, 0;
        RETURN;
    END;

    UPDATE promo_codes SET uses_count = uses_count + 1 WHERE id = v_code.id;

    UPDATE profiles
    SET money = COALESCE(money, 0) + v_code.reward_money,
        xp = COALESCE(xp, 0) + v_code.reward_xp,
        level = FLOOR(0.1 * SQRT(COALESCE(xp, 0) + v_code.reward_xp))::INTEGER,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING money INTO v_new_money;

    RETURN QUERY SELECT TRUE, 'Kod odebrany!'::TEXT, v_code.reward_money, v_code.reward_xp, v_new_money;
END;
$$;
