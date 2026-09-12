-- Backgrounds and nick colors were flat-priced within their category (15
-- generic backgrounds all at 300, 4 studio ones all at 800; 4 of 6 nick
-- colors all at 800) - every item in a tier cost the same regardless of
-- how common/plain vs. distinctive it actually looks, so picking between
-- them was pure aesthetics with zero sense of rarity. Frames already had
-- real progression (500/1500/2000/3000/6000) and are untouched here.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent: safe to run multiple times (plain UPDATEs by id).

-- ── Backgrounds: common solid colors -> less-common solids -> patterns
--    (more distinct, harder to mistake for another item) -> studio/brand
--    themes (prestige tier - represents the community itself). ──
UPDATE shop_items SET price = 200 WHERE id IN (
    'bg-blue', 'bg-lightblue', 'bg-green', 'bg-lightgreen',
    'bg-yellow', 'bg-orange', 'bg-red', 'bg-brown'
);
UPDATE shop_items SET price = 400 WHERE id IN ('bg-pink', 'bg-purple');
UPDATE shop_items SET price = 700 WHERE id IN (
    'bg-triangles', 'bg-flowers', 'bg-zebra', 'bg-cow', 'bg-panther'
);
UPDATE shop_items SET price = 1000 WHERE id IN (
    'bg-dev', 'bg-games', 'bg-records', 'bg-esport'
);

-- ── Nick colors: white (most basic) -> bright primaries -> purple
--    (slightly less common) -> Ocean (the site's own brand color, priced
--    as the prestige option same as the studio-theme backgrounds above). ──
UPDATE shop_items SET price = 400 WHERE id = 'nick-white';
UPDATE shop_items SET price = 700 WHERE id IN ('nick-red', 'nick-yellow', 'nick-green');
UPDATE shop_items SET price = 900 WHERE id = 'nick-purple';
UPDATE shop_items SET price = 1400 WHERE id = 'nick-general';
