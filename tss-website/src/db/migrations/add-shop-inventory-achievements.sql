-- Profile customization: purchasable frames/nick colors + achievements.
-- Extends the existing coin economy (profiles.money) instead of a parallel
-- currency - same pattern the bot already uses for atomic balance changes
-- (see tss-dc-bot/shop.js's increment_profile_money RPC).
--
-- Idempotent: safe to run multiple times.

-- ── Real shop catalog (replaces the hardcoded mock array in
--    src/app/api/shop/route.ts) ──
CREATE TABLE IF NOT EXISTS shop_items (
    id TEXT PRIMARY KEY,                 -- e.g. 'frame-gold', 'nick-color-red'
    category TEXT NOT NULL CHECK (category IN ('frame', 'nick_color')),
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL CHECK (price >= 0),  -- coins (profiles.money)
    -- 'frame'      -> CSS ring/gradient spec consumed by the profile UI
    -- 'nick_color' -> hex color, e.g. '#dc3545'
    value TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── What each user owns ──
CREATE TABLE IF NOT EXISTS user_inventory (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, item_id)
);

-- ── Currently-equipped cosmetics (null = default look) ──
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS equipped_frame TEXT REFERENCES shop_items(id),
ADD COLUMN IF NOT EXISTS equipped_nick_color TEXT REFERENCES shop_items(id);

-- ── Achievements catalog + unlocked-per-user ──
-- schema.sql already documents this exact shape (SERIAL id, rarity,
-- xp_reward, pln_reward, image_url) - reusing it as-is instead of a
-- differently-typed duplicate, so this is a no-op if it's already live and
-- creates the canonical shape if it isn't. Catalog left empty here - filled
-- in once the actual achievement list/criteria are provided; the display +
-- tables are ready ahead of that.
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    rarity VARCHAR(20) DEFAULT 'common',
    xp_reward INTEGER DEFAULT 0,
    pln_reward DECIMAL(10,2) DEFAULT 0.00,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS user_achievements (
    user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, achievement_id),
    PRIMARY KEY (user_id, achievement_id)
);

-- ── Atomic purchase: check balance, deduct coins, grant item ──
-- Mirrors the bot's increment_profile_money pattern (single RPC instead of
-- separate read-then-write calls from the client, which could race or
-- leave a user charged without the item on a mid-flight failure).
CREATE OR REPLACE FUNCTION purchase_shop_item(p_user_id TEXT, p_item_id TEXT)
RETURNS TABLE(new_money BIGINT) AS $$
DECLARE
    v_price INTEGER;
    v_current_money BIGINT;
BEGIN
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

-- ── RLS ──
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Catalogs are public read (anyone signed in can see what's for sale).
DROP POLICY IF EXISTS "Anyone can view active shop items" ON shop_items;
CREATE POLICY "Anyone can view active shop items"
ON shop_items FOR SELECT
TO authenticated
USING (active = TRUE);

DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
CREATE POLICY "Anyone can view achievements"
ON achievements FOR SELECT
TO authenticated
USING (TRUE);

-- Inventory/unlocked-achievements: same identity check already used for
-- profiles (id is the Discord snowflake, not auth.uid()).
DROP POLICY IF EXISTS "Users can view own inventory" ON user_inventory;
CREATE POLICY "Users can view own inventory"
ON user_inventory FOR SELECT
TO authenticated
USING (
  (user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'provider_id'::text))
  OR (user_id = (auth.uid())::text)
);

DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
CREATE POLICY "Users can view own achievements"
ON user_achievements FOR SELECT
TO authenticated
USING (
  (user_id = ((auth.jwt() -> 'user_metadata'::text) ->> 'provider_id'::text))
  OR (user_id = (auth.uid())::text)
);

-- No direct INSERT/UPDATE/DELETE policies on user_inventory - purchases only
-- happen through purchase_shop_item(), which runs SECURITY DEFINER.

-- ── Starter frame + nick color catalog (placeholder pricing - adjust freely,
--    it's just data) ──
INSERT INTO shop_items (id, category, name, description, price, value) VALUES
    ('frame-bronze',  'frame', 'Rama Brąz',    'Brązowa ramka wokół avatara',      500,  '#a05a2c'),
    ('frame-silver',  'frame', 'Rama Srebro',  'Srebrna ramka wokół avatara',      1500, '#c0c0c0'),
    ('frame-gold',    'frame', 'Rama Złoto',   'Złota ramka wokół avatara',        3000, '#ffd700'),
    ('frame-general', 'frame', 'Rama General', 'Ramka w kolorze motywu Ocean',     2000, '#1bbdbd'),
    ('frame-rgb',     'frame', 'Rama RGB',     'Animowana, tęczowa ramka',         6000, 'rgb-animated'),
    ('nick-red',        'nick_color', 'Czerwony',   'Kolor nicku: czerwony',   800, '#dc3545'),
    ('nick-purple',     'nick_color', 'Fioletowy',  'Kolor nicku: fioletowy',  800, '#ad83f8'),
    ('nick-yellow',      'nick_color', 'Żółty',      'Kolor nicku: żółty',      800, '#ffcb2f'),
    ('nick-green',       'nick_color', 'Zielony',    'Kolor nicku: zielony',    800, '#06e402'),
    ('nick-general',     'nick_color', 'Ocean',      'Kolor nicku: motyw Ocean', 1000, '#1bbdbd'),
    ('nick-white',       'nick_color', 'Biały',      'Kolor nicku: biały',      600, '#ffffff')
ON CONFLICT (id) DO NOTHING;
