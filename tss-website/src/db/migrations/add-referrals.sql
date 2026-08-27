-- Referral system: 500 coins to the referrer once the referred account is
-- confirmed to have a real, linked Discord identity - not on bare signup.
--
-- Why gated on Discord linking, not e.g. reaching level 2: the /rejestracja
-- form creates accounts keyed by the Supabase Auth UUID (not a Discord
-- snowflake) with email verification bypassed (`email_confirm: true`,
-- already flagged elsewhere in this repo as a known gap) - trivially
-- scriptable to farm fake signups. Level/XP only ever move for accounts the
-- Discord bot recognizes (id = Discord snowflake), so a level-based gate
-- would simply never pay out for this signup path. Requiring a linked
-- Discord identity is real friction against a fake-account farm and is
-- checkable entirely client-side (same isDiscordLinked check already used
-- on the profile page), no bot changes needed.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_reward_paid BOOLEAN NOT NULL DEFAULT FALSE;

-- Called by the referred user once their own session shows a linked Discord
-- identity. SECURITY DEFINER (needed to credit the referrer's money past
-- RLS) - verifies the caller matches p_user_id themselves, same pattern as
-- purchase_shop_item, so this can't be used to pay out someone else's
-- referral on their behalf.
CREATE OR REPLACE FUNCTION pay_referral_reward(p_user_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_caller_id TEXT;
    v_referred_by TEXT;
    v_already_paid BOOLEAN;
BEGIN
    v_caller_id := COALESCE((auth.jwt() -> 'user_metadata'::text) ->> 'provider_id'::text, (auth.uid())::text);
    IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT referred_by, referral_reward_paid INTO v_referred_by, v_already_paid
    FROM profiles WHERE id = p_user_id;

    IF v_referred_by IS NULL OR v_already_paid THEN
        RETURN FALSE;
    END IF;

    UPDATE profiles SET money = money + 500 WHERE id = v_referred_by;
    UPDATE profiles SET referral_reward_paid = TRUE WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
