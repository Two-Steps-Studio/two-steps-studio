// Real effects for the shop's VIP/SVIP/MVIP/X2/X3 role purchases (shop.js).
// Before this, buying any of them granted a Discord role and nothing else -
// profiles.multiplier/multiplier_expires_at existed but nothing ever read
// or wrote them, and vip_status/svip_status/mvip_status existed but nothing
// ever set them. People were paying real earned coins for a cosmetic role
// with zero gameplay effect.
//
// Deliberately NOT applied to fishing (fishing.js/afk_fishing.js/wedka.js) -
// fishing's own payouts are being cut down separately for being wildly
// higher than every other income source, so stacking a purchasable
// multiplier on top of that would fight the rebalance instead of helping.
// This only boosts the grind loop (messages, voice, work/daily/weekly) -
// the part of the economy that needed to be more worth doing, not less.

function getActiveMultiplier(profile) {
    if (
        profile?.multiplier &&
        profile.multiplier > 1 &&
        profile?.multiplier_expires_at &&
        new Date(profile.multiplier_expires_at) > new Date()
    ) {
        return profile.multiplier;
    }
    return 1;
}

function getVipBonus(profile) {
    if (profile?.mvip_status) return 1.35;
    if (profile?.svip_status) return 1.20;
    if (profile?.vip_status) return 1.10;
    return 1;
}

// Combined multiplier for message/voice/work/daily/weekly earnings (both
// XP and money) - a temporary X2/X3 boost and a permanent VIP tier stack
// multiplicatively.
function getEarningsMultiplier(profile) {
    return getActiveMultiplier(profile) * getVipBonus(profile);
}

module.exports = { getActiveMultiplier, getVipBonus, getEarningsMultiplier };
