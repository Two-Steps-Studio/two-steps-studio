-- ============================================================================
-- tss-dc-bot — Atomic profile mutation RPCs
--
-- HOW TO APPLY: paste this entire file into the Supabase SQL Editor for the
-- tss-dc-bot / tss-website shared project and run it once. All functions use
-- CREATE OR REPLACE, so re-running this file after an edit is safe/idempotent.
-- There is no migration runner in this repo (tss-website/src/db uses the same
-- loose-.sql-file convention, applied by hand) — this file IS the migration.
--
-- VERIFY BEFORE APPLYING:
--   1. Confirm live column types of `ore` and `fish` on `profiles`. This file
--      assumes JSONB holding a JSON array:
--        SELECT pg_typeof(ore), pg_typeof(fish) FROM profiles LIMIT 1;
--      If they are a native Postgres array type instead, the
--      `COALESCE(ore, '[]'::jsonb) || jsonb_build_array(...)` lines in
--      apply_mine_reward / apply_staw_reward must become `array_append(...)`.
--   2. Confirm `profiles.id` (TEXT) is the only identity column bot writes
--      should target — shop.js has a `.or('id.eq...,discord_id.eq...')`
--      clause referencing a `discord_id` column not present in
--      tss-website/src/db/schema.sql. These RPCs target `id` only, matching
--      every other call site in the bot; if `discord_id` turns out to be a
--      real, separately-populated column, that's a distinct problem to
--      report, not something silently patched here.
--   3. Confirm `fishing_gear.user_id` and its 8 level columns
--      (zylka, kolowrotek, haczyk, przynet, wedka, zaneta, lodz, skrzynka)
--      match purchase_gear_upgrade's branches below — verified against
--      tss-dc-bot/fishing/gear.config.js's GEAR object keys.
--
-- Called via: supabase.rpc('function_name', { p_param: value })
-- The bot always calls through its service-role client, so RLS is already
-- bypassed; SECURITY DEFINER is intentionally omitted. If these functions
-- are ever exposed to a non-service-role key (e.g. from tss-website), they
-- would need real caller-identity checks first — none of them verify that
-- the caller is authorized to act as p_user_id today.
-- ============================================================================

-- ── Shape 1: guarded single-field money increment/decrement ────────────────
-- delta may be positive or negative. Guard makes decrements atomic against
-- concurrent spends: if the balance would go negative, 0 rows are returned
-- instead of applying a partial/incorrect write.
CREATE OR REPLACE FUNCTION increment_profile_money(
    p_user_id TEXT,
    p_delta INTEGER
)
RETURNS TABLE (money INTEGER) AS $$
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET money = money + p_delta,
        updated_at = NOW()
    WHERE id = p_user_id
      AND (money + p_delta) >= 0
    RETURNING profiles.money;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 1b: /praca — money increment + last_work stamp in one write ──────
CREATE OR REPLACE FUNCTION apply_work_reward(
    p_user_id TEXT,
    p_earnings INTEGER
)
RETURNS TABLE (money INTEGER, last_work TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET money = COALESCE(money, 0) + p_earnings,
        last_work = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING profiles.money, profiles.last_work;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 2: wallet <-> bank transfer, same row ─────────────────────────────
CREATE OR REPLACE FUNCTION deposit_to_bank(
    p_user_id TEXT,
    p_amount INTEGER
)
RETURNS TABLE (money INTEGER, bank INTEGER) AS $$
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET money = money - p_amount,
        bank  = COALESCE(bank, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
      AND p_amount > 0
      AND money >= p_amount
    RETURNING profiles.money, profiles.bank;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION withdraw_from_bank(
    p_user_id TEXT,
    p_amount INTEGER
)
RETURNS TABLE (money INTEGER, bank INTEGER) AS $$
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET bank  = bank - p_amount,
        money = COALESCE(money, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_user_id
      AND p_amount > 0
      AND bank >= p_amount
    RETURNING profiles.money, profiles.bank;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 3: two-row transfer, deadlock-safe locking ────────────────────────
-- Locks both rows in a deterministic order (lexicographic on id) so two
-- concurrent /pay calls between the same two users (in either direction)
-- can never deadlock waiting on each other's row lock.
CREATE OR REPLACE FUNCTION pay_transfer(
    p_sender_id TEXT,
    p_recipient_id TEXT,
    p_amount INTEGER
)
RETURNS TABLE (sender_money INTEGER, recipient_money INTEGER) AS $$
DECLARE
    v_first  TEXT;
    v_second TEXT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT';
    END IF;
    IF p_sender_id = p_recipient_id THEN
        RAISE EXCEPTION 'SAME_USER';
    END IF;

    IF p_sender_id < p_recipient_id THEN
        v_first := p_sender_id; v_second := p_recipient_id;
    ELSE
        v_first := p_recipient_id; v_second := p_sender_id;
    END IF;

    PERFORM 1 FROM profiles WHERE id IN (v_first, v_second) FOR UPDATE;

    UPDATE profiles SET money = money - p_amount, updated_at = NOW()
        WHERE id = p_sender_id AND money >= p_amount;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
    END IF;

    UPDATE profiles SET money = COALESCE(money, 0) + p_amount, updated_at = NOW()
        WHERE id = p_recipient_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'RECIPIENT_NOT_FOUND';
    END IF;

    RETURN QUERY
    SELECT p1.money, p2.money
    FROM profiles p1, profiles p2
    WHERE p1.id = p_sender_id AND p2.id = p_recipient_id;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 4: xp + money combo, level set explicitly (caller computes level) ─
-- p_new_level is an explicit input, NOT computed here — index.js/fishing/*.js
-- use a sqrt curve (getLevelFromXP), rpg/index.js uses a lookup-table curve
-- (getLevelFromXp from level_stats.js); this function stays curve-agnostic.
-- money is clamped at 0 via GREATEST to match existing JS semantics
-- (Math.max(0, ...)) in fishing.js / afk_fishing.js.
CREATE OR REPLACE FUNCTION apply_xp_money_reward(
    p_user_id TEXT,
    p_xp_delta INTEGER,
    p_money_delta INTEGER,
    p_new_level INTEGER
)
RETURNS TABLE (xp INTEGER, money INTEGER, level INTEGER) AS $$
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET xp    = COALESCE(xp, 0) + p_xp_delta,
        money = GREATEST(0, COALESCE(money, 0) + p_money_delta),
        level = p_new_level,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING profiles.xp, profiles.money, profiles.level;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 5: mining — xp/money/level combo + ore array append ──────────────
-- Assumes `ore` is JSONB holding a JSON array — see verification note at top
-- of file.
CREATE OR REPLACE FUNCTION apply_mine_reward(
    p_user_id TEXT,
    p_money_delta INTEGER,
    p_xp_delta INTEGER,
    p_new_level INTEGER,
    p_ore_item JSONB
)
RETURNS TABLE (money INTEGER, xp INTEGER, level INTEGER, ore JSONB) AS $$
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET money = GREATEST(0, COALESCE(money, 0) + p_money_delta),
        xp    = COALESCE(xp, 0) + p_xp_delta,
        level = p_new_level,
        ore   = COALESCE(ore, '[]'::jsonb) || jsonb_build_array(p_ore_item),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING profiles.money, profiles.xp, profiles.level, profiles.ore;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 5b: pond fishing — xp/money/level combo + fish array append ──────
CREATE OR REPLACE FUNCTION apply_staw_reward(
    p_user_id TEXT,
    p_money_delta INTEGER,
    p_xp_delta INTEGER,
    p_new_level INTEGER,
    p_fish_item JSONB
)
RETURNS TABLE (money INTEGER, xp INTEGER, level INTEGER, fish JSONB) AS $$
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET money = GREATEST(0, COALESCE(money, 0) + p_money_delta),
        xp    = COALESCE(xp, 0) + p_xp_delta,
        level = p_new_level,
        fish  = COALESCE(fish, '[]'::jsonb) || jsonb_build_array(p_fish_item),
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING profiles.money, profiles.xp, profiles.level, profiles.fish;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 6: cross-table paired write — wedka gear upgrade ──────────────────
-- Deducts money (guarded) and upgrades exactly one fishing_gear column in
-- the same function transaction — if the gear write fails, the whole
-- transaction rolls back, including the money deduction (fixes the
-- "money lost, gear not upgraded" bug from the old Promise.all([...]) code).
-- Deliberately no dynamic SQL: 8 explicit branches over the known gear keys
-- (verified against fishing/gear.config.js), each one a plain, inspectable
-- UPDATE — for a function that moves money, that's worth the verbosity.
CREATE OR REPLACE FUNCTION purchase_gear_upgrade(
    p_user_id TEXT,
    p_gear_key TEXT,
    p_price INTEGER,
    p_new_level INTEGER
)
RETURNS TABLE (money INTEGER, gear_level INTEGER) AS $$
DECLARE
    v_money INTEGER;
BEGIN
    UPDATE profiles
    SET money = money - p_price, updated_at = NOW()
    WHERE id = p_user_id AND money >= p_price
    RETURNING profiles.money INTO v_money;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INSUFFICIENT_FUNDS';
    END IF;

    INSERT INTO fishing_gear (user_id, updated_at) VALUES (p_user_id, NOW())
    ON CONFLICT (user_id) DO NOTHING;

    IF p_gear_key = 'zylka' THEN
        UPDATE fishing_gear SET zylka = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSIF p_gear_key = 'kolowrotek' THEN
        UPDATE fishing_gear SET kolowrotek = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSIF p_gear_key = 'haczyk' THEN
        UPDATE fishing_gear SET haczyk = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSIF p_gear_key = 'przynet' THEN
        UPDATE fishing_gear SET przynet = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSIF p_gear_key = 'wedka' THEN
        UPDATE fishing_gear SET wedka = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSIF p_gear_key = 'zaneta' THEN
        UPDATE fishing_gear SET zaneta = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSIF p_gear_key = 'lodz' THEN
        UPDATE fishing_gear SET lodz = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSIF p_gear_key = 'skrzynka' THEN
        UPDATE fishing_gear SET skrzynka = p_new_level, updated_at = NOW() WHERE user_id = p_user_id;
    ELSE
        RAISE EXCEPTION 'INVALID_GEAR_KEY: %', p_gear_key;
    END IF;

    RETURN QUERY SELECT v_money, p_new_level;
END;
$$ LANGUAGE plpgsql;
