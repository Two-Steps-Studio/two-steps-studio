-- ============================================================================
-- tss-dc-bot — Atomic profile mutation RPCs
--
-- HOW TO APPLY: paste this entire file into the Supabase SQL Editor for the
-- tss-dc-bot / tss-website shared project and run it once. All functions use
-- CREATE OR REPLACE, so re-running this file after an edit is safe/idempotent.
-- There is no migration runner in this repo (tss-website/src/db uses the same
-- loose-.sql-file convention, applied by hand) — this file IS the migration.
--
-- REVISION 2 — corrects two things found by live verification against the
-- real database after the first version was applied:
--   1. Every function below whose RETURNS TABLE column shared a name with a
--      table column it also wrote (money, bank, xp) failed at call time with
--      "column reference is ambiguous" — PL/pgSQL treats a RETURNS TABLE
--      column as a declared variable in scope for the whole function body,
--      not just the RETURNING clause, so it collides with any unqualified
--      reference to a same-named table column anywhere in SET/WHERE too.
--      Fixed with `#variable_conflict use_column` as the first line of every
--      affected function body.
--   2. `profiles.ore` and `profiles.fish` do not exist on the live table —
--      confirmed via `select('*')`. Mining/pond-fishing item persistence was
--      never real (handleMine crashed before reaching its write at all; the
--      old code's SAME single .update() call also carried money/xp/level
--      alongside the bad `fish` field, so Postgres rejected the whole write
--      and — since the original code never checked the error — pond fishing
--      has likely never actually saved money or XP either, silently, this
--      whole time). apply_mine_reward / apply_staw_reward are dropped;
--      handleMine/handleStaw now call apply_xp_money_reward directly, same
--      as every other XP+money site. This is a net improvement, not scope
--      creep — it's the same call sites the original plan already touched,
--      just discovering their target columns don't exist and adjusting to
--      what's actually there. Item/inventory persistence for mining and
--      pond fishing remains not implemented (it never was) — a separate,
--      real feature gap, not something this migration invents.
--
-- VERIFIED against live schema (read-only introspection, not assumed):
--   - profiles.id (TEXT, Discord snowflake, PK) — confirmed real
--   - profiles.money, bank, xp, level, last_work, discord_roles, background,
--     updated_at — all confirmed real and populated
--   - profiles.discord_id exists but is NULL on every sampled row — dead in
--     practice; every RPC below targets `id` only, matching the rest of the
--     bot's code
--   - fishing_gear is a real, separate table (user_id PK + zylka,
--     kolowrotek, haczyk, przynet, wedka, zaneta, lodz, skrzynka +
--     updated_at), populated with real player data — confirmed directly,
--     NOT the same thing as the unrelated `profiles.fishing_gear` jsonb
--     column (which is empty on every sampled row and unused by the bot)
--
-- Called via: supabase.rpc('function_name', { p_param: value })
-- The bot always calls through its service-role client, so RLS is already
-- bypassed; SECURITY DEFINER is intentionally omitted. If these functions
-- are ever exposed to a non-service-role key (e.g. from tss-website), they
-- would need real caller-identity checks first — none of them verify that
-- the caller is authorized to act as p_user_id today.
-- ============================================================================

DROP FUNCTION IF EXISTS apply_mine_reward(TEXT, INTEGER, INTEGER, INTEGER, JSONB);
DROP FUNCTION IF EXISTS apply_staw_reward(TEXT, INTEGER, INTEGER, INTEGER, JSONB);

-- ── Shape 1: guarded single-field money increment/decrement ────────────────
-- delta may be positive or negative. Guard makes decrements atomic against
-- concurrent spends: if the balance would go negative, 0 rows are returned
-- instead of applying a partial/incorrect write.
CREATE OR REPLACE FUNCTION increment_profile_money(
    p_user_id TEXT,
    p_delta INTEGER
)
RETURNS TABLE (money INTEGER) AS $$
#variable_conflict use_column
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
-- Guard makes the 1h cooldown atomic against concurrent /praca calls: without
-- it, two interactions could both read the same pre-cooldown last_work from
-- getProfile() (a plain SELECT, done before this RPC runs), both pass
-- index.js's client-side "diff < 3600000" check, and both call this RPC -
-- which had no server-side condition of its own to reject the second one,
-- letting a user duplicate the reward indefinitely. Same shape as
-- increment_profile_money's balance guard above.
CREATE OR REPLACE FUNCTION apply_work_reward(
    p_user_id TEXT,
    p_earnings INTEGER
)
RETURNS TABLE (money INTEGER, last_work TIMESTAMPTZ) AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    UPDATE profiles
    SET money = COALESCE(money, 0) + p_earnings,
        last_work = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id
      AND (last_work IS NULL OR last_work < NOW() - INTERVAL '1 hour')
    RETURNING profiles.money, profiles.last_work;
END;
$$ LANGUAGE plpgsql;

-- ── Shape 2: wallet <-> bank transfer, same row ─────────────────────────────
CREATE OR REPLACE FUNCTION deposit_to_bank(
    p_user_id TEXT,
    p_amount INTEGER
)
RETURNS TABLE (money INTEGER, bank INTEGER) AS $$
#variable_conflict use_column
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
#variable_conflict use_column
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
-- can never deadlock waiting on each other's row lock. RETURNS TABLE columns
-- are aliased (sender_money/recipient_money) so they never collide with the
-- real `money` column — no #variable_conflict needed here.
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
-- Also used directly by handleMine/handleStaw in rpg/index.js — the item-
-- array append that used to be bundled with those two writes targeted
-- columns that don't exist (see file header); this function is the correct,
-- already-existing shape for what those two call sites actually need.
CREATE OR REPLACE FUNCTION apply_xp_money_reward(
    p_user_id TEXT,
    p_xp_delta INTEGER,
    p_money_delta INTEGER,
    p_new_level INTEGER
)
RETURNS TABLE (xp INTEGER, money INTEGER, level INTEGER) AS $$
#variable_conflict use_column
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

-- ── Shape 6: cross-table paired write — wedka gear upgrade ──────────────────
-- Deducts money (guarded) and upgrades exactly one fishing_gear column in
-- the same function transaction — if the gear write fails, the whole
-- transaction rolls back, including the money deduction (fixes the
-- "money lost, gear not upgraded" bug from the old Promise.all([...]) code).
-- Deliberately no dynamic SQL: 8 explicit branches over the known gear keys
-- (verified against fishing/gear.config.js and directly against real rows
-- in the fishing_gear table), each one a plain, inspectable UPDATE — for a
-- function that moves money, that's worth the verbosity.
CREATE OR REPLACE FUNCTION purchase_gear_upgrade(
    p_user_id TEXT,
    p_gear_key TEXT,
    p_price INTEGER,
    p_new_level INTEGER
)
RETURNS TABLE (money INTEGER, gear_level INTEGER) AS $$
#variable_conflict use_column
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
