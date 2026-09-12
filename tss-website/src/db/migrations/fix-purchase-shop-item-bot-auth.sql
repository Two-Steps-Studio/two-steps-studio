-- purchase_shop_item() rejected every purchase made from the Discord bot
-- with "Unauthorized" - the caller-identity check required
-- auth.jwt()/auth.uid() to match p_user_id, which correctly validates a
-- browser call (anon key + real user session, where a malicious client
-- could otherwise pass someone else's p_user_id) but always evaluates to
-- NULL for a service-role call (the bot's client, and the website's own
-- server-side service client) - there is no end-user JWT in that context
-- at all. NULL != p_user_id is never true, so the check unconditionally
-- raised, and shop.js's error handling doesn't special-case "Unauthorized"
-- (only "already owned"/"Insufficient balance"), so every cosmetic
-- purchase from Discord just failed with a generic "Błąd zakupu."
--
-- Fix: only enforce the identity check when a JWT/uid actually exists
-- (i.e. a real browser session). A service-role caller has no JWT at
-- all - holding the service-role key IS the trust boundary there, same
-- as every other bot-called RPC (apply_work_reward, increment_profile_money,
-- etc.), none of which ever had a caller-identity check to begin with.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION purchase_shop_item(p_user_id TEXT, p_item_id TEXT)
RETURNS TABLE(new_money INTEGER) AS $$
DECLARE
    v_price INTEGER;
    v_current_money INTEGER;
    v_caller_id TEXT;
BEGIN
    v_caller_id := COALESCE((auth.jwt() -> 'user_metadata'::text) ->> 'provider_id'::text, (auth.uid())::text);
    IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT price INTO v_price FROM shop_items WHERE id = p_item_id AND active = TRUE;
    IF v_price IS NULL THEN
        RAISE EXCEPTION 'Item not found or inactive';
    END IF;

    IF EXISTS (SELECT 1 FROM user_inventory WHERE user_id = p_user_id AND item_id = p_item_id) THEN
        RAISE EXCEPTION 'Item already owned';
    END IF;

    SELECT money INTO v_current_money FROM profiles WHERE id = p_user_id FOR UPDATE;
    IF v_current_money IS NULL THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
    IF v_current_money < v_price THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE profiles SET money = money - v_price WHERE id = p_user_id;
    INSERT INTO user_inventory (user_id, item_id) VALUES (p_user_id, p_item_id);

    RETURN QUERY SELECT money FROM profiles WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
