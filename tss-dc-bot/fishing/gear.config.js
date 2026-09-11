// ═══════════════════════════════════════════════════════════════
//  gear.config.js – Konfiguracja sprzętu wędkarskiego
//
//  Krzywa cen: wykładnicza (~×2.2 każdy poziom)
//  Krzywa statystyk: degresywna
//
//  Stat caps (suma wszystkich upgradów max):
//    valueBonus        → +115%
//    cooldownReduction → 31s   (z 45s → min. 5s cooldown)
//    rarityBonus       → +85%
//    baitDiscount      → 13 monet
//    catchChance       → +39%
//    xpBonus           → +78%
//    locationSlots     → +4
//    gearSlots         → +7
// ═══════════════════════════════════════════════════════════════

const GEAR = {

    // ── ŻYŁKA – zwiększa wartość złowionych ryb ─────────────────
    zylka: {
        name: 'Żyłka',
        emoji: '🪢',
        description: 'Mocniejsza żyłka → wyższe ceny sprzedawanych ryb.',
        stat: 'valueBonus',
        levels: [
            { level: 0, label: 'Brak',             price: 0,     stat: 0.00 },
            { level: 1, label: 'Nylonowa',         price: 120,   stat: 0.08 },
            { level: 2, label: 'Fluorocarbon',     price: 280,   stat: 0.18 },
            { level: 3, label: 'Plecionka',        price: 650,   stat: 0.32 },
            { level: 4, label: 'Kevlarowa',        price: 1500,  stat: 0.50 },
            { level: 5, label: 'Spectra',          price: 3500,  stat: 0.70 },
            { level: 6, label: 'Dyneema Pro',      price: 8000,  stat: 0.92 },
            { level: 7, label: 'Monomolekuł. 🌟', price: 18000, stat: 1.15 },
        ],
    },

    // ── KOŁOWROTEK – skraca cooldown wędkowania ─────────────────
    kolowrotek: {
        name: 'Kołowrotek',
        emoji: '🎡',
        description: 'Szybszy kołowrotek → krótszy czas oczekiwania.',
        stat: 'cooldownReduction',
        levels: [
            { level: 0, label: 'Brak',           price: 0,     stat: 0  },
            { level: 1, label: 'Spinningowy',    price: 150,   stat: 3  },
            { level: 2, label: 'Bezinercyjny',   price: 380,   stat: 7  },
            { level: 3, label: 'Karpowy',        price: 900,   stat: 12 },
            { level: 4, label: 'Morski',         price: 2100,  stat: 17 },
            { level: 5, label: 'Baitrunner',     price: 5000,  stat: 22 },
            { level: 6, label: 'Elektryczny',    price: 11000, stat: 27 },
            { level: 7, label: 'Turbo Pro 🌟',   price: 25000, stat: 31 },
        ],
    },

    // ── HACZYK – zwiększa szansę na rzadkie ryby ─────────────────
    haczyk: {
        name: 'Haczyk',
        emoji: '🪝',
        description: 'Lepszy haczyk → wyższa szansa na rzadkie i epickie ryby.',
        stat: 'rarityBonus',
        levels: [
            { level: 0, label: 'Brak',                 price: 0,     stat: 0.00 },
            { level: 1, label: 'Okrągły',              price: 100,   stat: 0.08 },
            { level: 2, label: 'Semi-circular',        price: 260,   stat: 0.18 },
            { level: 3, label: 'Jig',                  price: 620,   stat: 0.30 },
            { level: 4, label: 'Treble Hook',          price: 1450,  stat: 0.44 },
            { level: 5, label: 'Chemicznie ostrzony',  price: 3400,  stat: 0.58 },
            { level: 6, label: 'Tytanowy',             price: 7800,  stat: 0.72 },
            { level: 7, label: 'Złoty Haczyk 🌟',      price: 17500, stat: 0.85 },
        ],
    },

    // ── PRZYNĘTA – zmniejsza koszt zarzucenia ────────────────────
    przynet: {
        name: 'Przynęta',
        emoji: '🪱',
        description: 'Lepsza przynęta → mniejszy koszt za każde zarzucenie.',
        stat: 'baitDiscount',
        levels: [
            { level: 0, label: 'Brak',             price: 0,     stat: 0  },
            { level: 1, label: 'Dżdżownica',       price: 80,    stat: 1  },
            { level: 2, label: 'Kukurydza',        price: 220,   stat: 3  },
            { level: 3, label: 'Sztuczna mucha',   price: 540,   stat: 5  },
            { level: 4, label: 'Wobler',           price: 1280,  stat: 7  },
            { level: 5, label: 'Błystka obrotowa', price: 3000,  stat: 9  },
            { level: 6, label: 'Żywa rybka',       price: 7000,  stat: 11 },
            { level: 7, label: 'Mega Błystka 🌟',  price: 16000, stat: 13 },
        ],
    },

    // ── WĘDKA – zwiększa szansę na złowienie ─────────────────────
    wedka: {
        name: 'Wędka',
        emoji: '🎣',
        description: 'Lepsza wędka → wyższa szansa na złowienie czegokolwiek.',
        stat: 'catchChance',
        levels: [
            { level: 0, label: 'Brak',          price: 0,     stat: 0.00 },
            { level: 1, label: 'Bambusowa',     price: 130,   stat: 0.04 },
            { level: 2, label: 'Szklana',       price: 330,   stat: 0.09 },
            { level: 3, label: 'Karbonowa',     price: 780,   stat: 0.15 },
            { level: 4, label: 'Kompozytowa',   price: 1800,  stat: 0.22 },
            { level: 5, label: 'Graphite X',    price: 4200,  stat: 0.28 },
            { level: 6, label: 'Boron Elite',   price: 9500,  stat: 0.34 },
            { level: 7, label: 'Legendarna 🌟', price: 21000, stat: 0.39 },
        ],
    },

    // ── ZANĘTA – bonus do XP ──────────────────────────────────────
    zaneta: {
        name: 'Zanęta',
        emoji: '🫙',
        description: 'Lepsza zanęta → więcej XP za każde złowienie.',
        stat: 'xpBonus',
        levels: [
            { level: 0, label: 'Brak',            price: 0,     stat: 0.00 },
            { level: 1, label: 'Chleb',           price: 90,    stat: 0.06 },
            { level: 2, label: 'Pellet',          price: 240,   stat: 0.14 },
            { level: 3, label: 'Boilies',         price: 580,   stat: 0.24 },
            { level: 4, label: 'PVA Bag',         price: 1350,  stat: 0.36 },
            { level: 5, label: 'Method Feeder',   price: 3200,  stat: 0.49 },
            { level: 6, label: 'Fermentowana',    price: 7400,  stat: 0.63 },
            { level: 7, label: 'Zanęta Pro 🌟',   price: 17000, stat: 0.78 },
        ],
    },

    // ── ŁÓDŹ – odblokowuje dodatkowe łowiska ─────────────────────
    lodz: {
        name: 'Łódź',
        emoji: '🚤',
        description: 'Lepsza łódź → dostęp do odleglejszych i bogatszych łowisk.',
        stat: 'locationSlots',
        levels: [
            { level: 0, label: 'Brak',           price: 0,      stat: 0 },
            { level: 1, label: 'Tratwa',         price: 200,    stat: 1 },
            // Kajak gives the same +1 locationSlots as Tratwa (the
            // documented +4 total cap can't be spread strictly-increasing
            // across 8 levels as a small integer stat) - was priced at the
            // normal ~x2.2 curve anyway (600), charging 3x for zero
            // functional gain. Repriced as a smaller lateral/flavor step
            // instead of a full price tier.
            { level: 2, label: 'Kajak',          price: 350,    stat: 1 },
            { level: 3, label: 'Ponton',         price: 1600,   stat: 2 },
            { level: 4, label: 'Łódź wiosłowa',  price: 4000,   stat: 2 },
            { level: 5, label: 'Motorówka',      price: 10000,  stat: 3 },
            { level: 6, label: 'Kuter rybacki',  price: 24000,  stat: 3 },
            { level: 7, label: 'Jacht 🌟',       price: 55000,  stat: 4 },
        ],
    },

    // ── SKRZYNKA – dodatkowe sloty ekwipunku ─────────────────────
    skrzynka: {
        name: 'Skrzynka na sprzęt',
        emoji: '🧰',
        description: 'Większa skrzynka → więcej miejsca na złowione ryby przed sprzedażą.',
        stat: 'gearSlots',
        levels: [
            { level: 0, label: 'Brak',           price: 0,      stat: 0 },
            { level: 1, label: 'Torebka',        price: 110,    stat: 1 },
            { level: 2, label: 'Plecak',         price: 290,    stat: 2 },
            { level: 3, label: 'Walizka',        price: 700,    stat: 3 },
            { level: 4, label: 'Skrzynia',       price: 1700,   stat: 4 },
            { level: 5, label: 'Kontener',       price: 4200,   stat: 5 },
            { level: 6, label: 'Lodówka turyst.',price: 10000,  stat: 6 },
            { level: 7, label: 'Magazyn Pro 🌟', price: 23000,  stat: 7 },
            // Każdy poziom pokazuje ŁĄCZNĄ liczbę slotów (nie przyrost)
        ],
    },
};

const ALL_GEAR_KEYS = Object.keys(GEAR);

// ── Pobiera poziom danej części z obiektu gracza ──────────────
function getGearLevel(gearObj, part) {
    return gearObj?.[part] ?? 0;
}

// ── Zbiera wszystkie statystyki gracza ────────────────────────
function getGearStats(gearObj = {}) {
    const stats = {
        valueBonus:        0,
        cooldownReduction: 0,
        rarityBonus:       0,
        baitDiscount:      0,
        catchChance:       0,
        xpBonus:           0,
        locationSlots:     0,
        gearSlots:         0,
    };

    for (const [partKey, partDef] of Object.entries(GEAR)) {
        const lvl = getGearLevel(gearObj, partKey);
        if (lvl === 0) continue;
        const levelDef = partDef.levels[lvl];
        if (!levelDef) continue;
        stats[partDef.stat] += levelDef.stat;
    }

    return stats;
}

// ── Następny poziom do zakupu (null = już max) ────────────────
function getNextUpgrade(gearObj, part) {
    const currentLvl = getGearLevel(gearObj, part);
    const partDef = GEAR[part];
    if (!partDef) return null;
    const nextLvl = currentLvl + 1;
    if (nextLvl >= partDef.levels.length) return null;
    return partDef.levels[nextLvl];
}

// ── Łączny koszt pełnego ulepszenia wszystkiego ───────────────
function getTotalMaxCost() {
    return Object.values(GEAR).reduce((sum, part) => {
        return sum + part.levels[part.levels.length - 1].price;
    }, 0);
}

// ── Pusty obiekt sprzętu (wszystko na poziomie 0) ─────────────
function emptyGearObj() {
    return ALL_GEAR_KEYS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {});
}

module.exports = {
    GEAR,
    ALL_GEAR_KEYS,
    getGearLevel,
    getGearStats,
    getNextUpgrade,
    getTotalMaxCost,
    emptyGearObj,
};