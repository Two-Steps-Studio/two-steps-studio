-- Backgrounds join frames/nick colors as a purchasable shop_items category,
-- and purchase_shop_item() becomes callable from the Discord bot too (not
-- just the website), so cosmetics can be bought from either place against
-- the same catalog/inventory.

-- ── Add 'background' to the allowed categories ──
ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_category_check;
ALTER TABLE shop_items ADD CONSTRAINT shop_items_category_check CHECK (category IN ('frame', 'nick_color', 'background'));

-- ── Seed: the 18 non-default Discord-card backgrounds (see
--    tss-dc-bot/assets/discord/backgrounds and BACKGROUND_OPTIONS in
--    tss-website/src/app/profile/profile-form.tsx). "Two Steps Studio"
--    stays out of this catalog on purpose - it's the free default both the
--    bot and website already fall back to, not something to gate. `value`
--    holds the exact background name (matches the PNG filename and what
--    profiles.background stores directly - unlike frame/nick_color, this
--    column was never switched to an id reference, so it stays a name here
--    too). Placeholder pricing - just data, change freely. ──
INSERT INTO shop_items (id, category, name, description, price, value) VALUES
    ('bg-dev',      'background', 'Tło Two Steps DEV',     'Motyw DEV na baner profilu',        800, 'Two Steps DEV'),
    ('bg-games',    'background', 'Tło Two Steps Games',   'Motyw Games na baner profilu',      800, 'Two Steps Games'),
    ('bg-records',  'background', 'Tło Two Steps Records', 'Motyw Records na baner profilu',    800, 'Two Steps Records'),
    ('bg-esport',   'background', 'Tło Two Steps E-Sport', 'Motyw E-Sport na baner profilu',    800, 'Two Steps E-Sport'),
    ('bg-blue',        'background', 'Tło Niebieskie',   'Niebieskie tło na baner profilu',   300, 'Blue'),
    ('bg-lightblue',   'background', 'Tło Jasnoniebieskie', 'Jasnoniebieskie tło na baner profilu', 300, 'Light Blue'),
    ('bg-green',       'background', 'Tło Zielone',      'Zielone tło na baner profilu',      300, 'Green'),
    ('bg-lightgreen',  'background', 'Tło Jasnozielone', 'Jasnozielone tło na baner profilu', 300, 'Light Green'),
    ('bg-yellow',      'background', 'Tło Żółte',        'Żółte tło na baner profilu',        300, 'Yellow'),
    ('bg-orange',      'background', 'Tło Pomarańczowe', 'Pomarańczowe tło na baner profilu', 300, 'Orange'),
    ('bg-red',         'background', 'Tło Czerwone',     'Czerwone tło na baner profilu',     300, 'Red'),
    ('bg-pink',        'background', 'Tło Różowe',       'Różowe tło na baner profilu',       300, 'Pink'),
    ('bg-purple',      'background', 'Tło Fioletowe',    'Fioletowe tło na baner profilu',    300, 'Purple'),
    ('bg-brown',       'background', 'Tło Brązowe',      'Brązowe tło na baner profilu',      300, 'Brown'),
    ('bg-triangles',   'background', 'Tło Trójkąty',     'Wzór trójkątów na baner profilu',   300, 'Triangles'),
    ('bg-flowers',     'background', 'Tło Kwiaty',       'Wzór kwiatów na baner profilu',     300, 'Flowers'),
    ('bg-zebra',       'background', 'Tło Zebra',        'Wzór zebry na baner profilu',       300, 'Zebra'),
    ('bg-cow',         'background', 'Tło Krowa',        'Wzór krowy na baner profilu',       300, 'Cow'),
    ('bg-panther',     'background', 'Tło Pantera',      'Wzór pantery na baner profilu',     300, 'Panther')
ON CONFLICT (id) DO NOTHING;

-- ── Let the bot call purchase_shop_item() on a member's behalf ──
-- The bot connects with the service-role key (no end-user JWT attached, so
-- auth.uid()/auth.jwt() are null there) - the existing identity check would
-- reject every bot-originated call. Skipping the check specifically for
-- auth.role() = 'service_role' keeps the same protection for normal
-- website end-users (who must still match p_user_id to their own session)
-- while trusting the bot's own connection, the same trust boundary
-- apply_xp_money_reward and increment_profile_money already rely on.
DROP FUNCTION IF EXISTS purchase_shop_item(text, text);

CREATE OR REPLACE FUNCTION purchase_shop_item(p_user_id TEXT, p_item_id TEXT)
RETURNS TABLE(new_money INTEGER) AS $$
DECLARE
    v_price INTEGER;
    v_current_money INTEGER;
    v_caller_id TEXT;
BEGIN
    IF auth.role() != 'service_role' THEN
        v_caller_id := COALESCE((auth.jwt() -> 'user_metadata'::text) ->> 'provider_id'::text, (auth.uid())::text);
        IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;
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
