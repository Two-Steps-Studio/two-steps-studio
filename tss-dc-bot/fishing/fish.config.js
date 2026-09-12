// ============================================================
//   KONFIGURACJA RYB – ROZSZERZONA + LEPSZY BALANS
// ============================================================

const FISH = {
    // ── POSPOLITE (common) ───────────────────────────────────
    karp: { name: "Karp", emoji: "🐟", rarity: "common", chance: 12, minWeight: 0.5, maxWeight: 8.0, baseValue: 10, xp: 5 },
    ploc: { name: "Płoć", emoji: "🐠", rarity: "common", chance: 10, minWeight: 0.1, maxWeight: 1.5, baseValue: 8, xp: 4 },
    leszcz: { name: "Leszcz", emoji: "🐡", rarity: "common", chance: 9, minWeight: 0.3, maxWeight: 4.0, baseValue: 12, xp: 5 },
    karas: { name: "Karaś", emoji: "🐟", rarity: "common", chance: 9, minWeight: 0.1, maxWeight: 1.2, baseValue: 6, xp: 3 },
    ukleja: { name: "Ukleja", emoji: "🐟", rarity: "common", chance: 7, minWeight: 0.01, maxWeight: 0.15, baseValue: 3, xp: 2 },
    lin: { name: "Lin", emoji: "🐟", rarity: "common", chance: 5, minWeight: 0.3, maxWeight: 3.5, baseValue: 11, xp: 5 },
    jaz: { name: "Jaź", emoji: "🐟", rarity: "common", chance: 5, minWeight: 0.5, maxWeight: 5.0, baseValue: 13, xp: 6 },

    // ── NIEPOSPOLITE (uncommon) ─────────────────────────────
    szczupak: { name: "Szczupak", emoji: "🦈", rarity: "uncommon", chance: 7, minWeight: 1.0, maxWeight: 15.0, baseValue: 40, xp: 15 },
    okon: { name: "Okoń", emoji: "🐟", rarity: "uncommon", chance: 6, minWeight: 0.2, maxWeight: 3.0, baseValue: 30, xp: 12 },
    sandacz: { name: "Sandacz", emoji: "🐡", rarity: "uncommon", chance: 5, minWeight: 1.0, maxWeight: 12.0, baseValue: 55, xp: 25 },
    amur: { name: "Amur", emoji: "🐟", rarity: "uncommon", chance: 4, minWeight: 2.0, maxWeight: 25.0, baseValue: 45, xp: 20 },
    boleń: { name: "Boleń", emoji: "🐟", rarity: "uncommon", chance: 4, minWeight: 1.0, maxWeight: 8.0, baseValue: 50, xp: 22 },
    troc: { name: "Troć", emoji: "🐟", rarity: "uncommon", chance: 3, minWeight: 2.0, maxWeight: 10.0, baseValue: 60, xp: 28 },

    // ── RZADKIE (rare) ──────────────────────────────────────
    sum: { name: "Sum", emoji: "🐬", rarity: "rare", chance: 4, minWeight: 5.0, maxWeight: 60.0, baseValue: 100, xp: 40 },
    pstrag: { name: "Pstrąg", emoji: "🐟", rarity: "rare", chance: 3.5, minWeight: 0.5, maxWeight: 5.0, baseValue: 120, xp: 45 },
    wegorz: { name: "Węgorz", emoji: "🐍", rarity: "rare", chance: 2, minWeight: 0.5, maxWeight: 4.5, baseValue: 180, xp: 70 },
    belona: { name: "Belona", emoji: "🗡️", rarity: "rare", chance: 2, minWeight: 0.4, maxWeight: 2.0, baseValue: 150, xp: 65 },
    dorsz: { name: "Dorsz", emoji: "🐟", rarity: "rare", chance: 1.5, minWeight: 2.0, maxWeight: 20.0, baseValue: 200, xp: 80 },
    halibut: { name: "Halibut", emoji: "🐟", rarity: "rare", chance: 1, minWeight: 10.0, maxWeight: 200.0, baseValue: 350, xp: 120 },

    // ── EPICKIE (epic) ──────────────────────────────────────
    losos: { name: "Łosoś", emoji: "🐡", rarity: "epic", chance: 2.5, minWeight: 3.0, maxWeight: 20.0, baseValue: 350, xp: 100 },
    jesiotr: { name: "Jesiotr", emoji: "🐋", rarity: "epic", chance: 1.2, minWeight: 10.0, maxWeight: 100.0, baseValue: 800, xp: 200 },
    marlin: { name: "Marlin Niebieski", emoji: "🗡️", rarity: "epic", chance: 0.5, minWeight: 50.0, maxWeight: 450.0, baseValue: 1400, xp: 350 },
    tunczyk: { name: "Tuńczyk", emoji: "🐟", rarity: "epic", chance: 0.4, minWeight: 30.0, maxWeight: 650.0, baseValue: 1800, xp: 450 },
    rekin: { name: "Rekin", emoji: "🦈", rarity: "epic", chance: 0.3, minWeight: 100.0, maxWeight: 1000.0, baseValue: 2500, xp: 600 },
    miecznik: { name: "Miecznik", emoji: "⚔️", rarity: "epic", chance: 0.2, minWeight: 80.0, maxWeight: 500.0, baseValue: 2200, xp: 550 },

    // ── LEGENDARNE (legendary) ─────────────────────────────
    // baseValue cut ~90% across this tier (was 5000-250000) - live data
    // showed a single Starożytny Rekin catch paying out 265,281 coins with
    // maxed gear, more than 400x a /weekly reward (300-600) and dwarfing
    // every other income source combined for most players. XP left as-is
    // (leveling wasn't the reported problem, payouts were).
    zlota_rybka: { name: "Złota Rybka", emoji: "✨🐠", rarity: "legendary", chance: 0.6, minWeight: 0.01, maxWeight: 0.1, baseValue: 500, xp: 500 },
    smok_wodny: { name: "Smok Wodny", emoji: "🐉", rarity: "legendary", chance: 0.2, minWeight: 100.0, maxWeight: 500.0, baseValue: 2000, xp: 1500 },
    kraken: { name: "Młody Kraken", emoji: "🦑", rarity: "legendary", chance: 0.1, minWeight: 500.0, maxWeight: 2500.0, baseValue: 6000, xp: 5000 },
    lewiatan: { name: "Lewiatan", emoji: "🌊", rarity: "legendary", chance: 0.05, minWeight: 5000.0, maxWeight: 20000.0, baseValue: 25000, xp: 20000 },
    duch_ryby: { name: "Duch Rzeki", emoji: "👻🐟", rarity: "legendary", chance: 0.03, minWeight: 1.0, maxWeight: 5.0, baseValue: 8000, xp: 7000 },
    starozytny_rekin: { name: "Starożytny Rekin", emoji: "🦈👁️", rarity: "legendary", chance: 0.02, minWeight: 2000.0, maxWeight: 8000.0, baseValue: 15000, xp: 12000 },

    // ── ŚMIECI ─────────────────────────────────────────────
    but: { name: "Stary But", emoji: "👟", rarity: "trash", chance: 0, minWeight: 0.1, maxWeight: 0.5, baseValue: 0, xp: 1 },
    opona: { name: "Opona", emoji: "⭕", rarity: "trash", chance: 0, minWeight: 2.0, maxWeight: 8.0, baseValue: 0, xp: 1 },
    puszka: { name: "Puszka", emoji: "🥫", rarity: "trash", chance: 0, minWeight: 0.05, maxWeight: 0.1, baseValue: 0, xp: 1 },
    kotwica: { name: "Kotwica", emoji: "⚓", rarity: "trash", chance: 0, minWeight: 15.0, maxWeight: 40.0, baseValue: 15, xp: 10 },
};

const RARITY_STYLES = {
    trash:     { label: "Śmieci",       color: 0x808080, emoji: "🗑️" },
    common:    { label: "Pospolita",    color: 0x95a5a6, emoji: "⚪" },
    uncommon:  { label: "Niepospolita", color: 0x2ecc71, emoji: "🟢" },
    rare:      { label: "Rzadka",       color: 0x3498db, emoji: "🔵" },
    epic:      { label: "Epicka",       color: 0x9b59b6, emoji: "🟣" },
    legendary: { label: "Legendarna",   color: 0xf1c40f, emoji: "🌟" },
};

const FISHING_COOLDOWN = 30;
const TRASH_CHANCE = 10; // lekko więcej śmieci dla balansu

// Real function for the "łódź" gear - its own shop description already
// promised "access to more distant and richer fishing grounds" but nothing
// gated anything on it: everyone could always roll the biggest legendary
// fish straight from level 0 gear. locationSlots (0-4, see gear.config.js)
// now gates which rarity tiers are even reachable: rare needs a raft,
// epic needs a proper boat, legendary needs a real motorboat (level 5,
// 10000 coins) or better. At max locationSlots (4, the 55000-coin Jacht),
// legendary odds get a further boost on top of unlocking them - a reason
// to go past the boat that already unlocked everything.
const LOCATION_TIER_UNLOCK = { common: 0, uncommon: 0, rare: 1, epic: 2, legendary: 3 };
const MAX_LOCATION_LEGENDARY_BOOST = 0.5; // +50% legendary chance at locationSlots 4

function getUnlockedFish(locationSlots = 0) {
    return Object.values(FISH).filter(
        (f) => f.chance > 0 && (LOCATION_TIER_UNLOCK[f.rarity] ?? 0) <= locationSlots
    );
}

module.exports = {
    FISH,
    RARITY_STYLES,
    FISHING_COOLDOWN,
    TRASH_CHANCE,
    LOCATION_TIER_UNLOCK,
    MAX_LOCATION_LEGENDARY_BOOST,
    getUnlockedFish,
};