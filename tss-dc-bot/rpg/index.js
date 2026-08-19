require('dotenv').config();
const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

// Importuj pliki konfiguracyjne
const WORKER_JOBS = require('./workers');
const LEVEL_STATS = require('./level_stats');
const BASE_STATS = require('./base_stats');
// Slot list for the equipment display (index.js:178) — there was never a
// './slots' module; the 7 slot ids below are the same set already used
// throughout equipment.js's `type` field and base_stats.js's
// `starterEquipment` keys.
const EQUIPMENT_SLOTS = [
    { id: 'weapon', label: 'Broń' },
    { id: 'helmet', label: 'Hełm' },
    { id: 'chest', label: 'Zbroja' },
    { id: 'pants', label: 'Spodnie' },
    { id: 'boots', label: 'Buty' },
    { id: 'shield', label: 'Tarcza' },
    { id: 'ring', label: 'Pierścień' },
];
// There was never a './items' module either; equipment.js's `starter` tier
// has the matching starter-item shape (see also base_stats.js's
// `starterEquipment`, which duplicates the same 7 items without ids).
const STARTER_ITEMS = require('./equipment').starter;
const SHOP_ITEMS = require('./shop');
const RESOURCES = require('./resources');
const ENEMIES = require('./enemies');
const BOSSES = require('./bosses');
const INVENTORY_SIZE = require('./inventory_size').getSize;
const getLevelFromXp = require('./level_stats').getLevelFromXp;
const getXpForLevel = require('./level_stats').getXpForLevel;
const COIN = '💰';

// ── NAMA Gry ────────────────────────────────────────────────────────────
const GAME_NAME = 'Two Steps Valley';

// ── PROFIL RAG (getProfile) ────────────────────────────────────────────
async function getRpgProfile(userId, supabase) {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (!profile) {
        // Nowy gracz - inicjalizacja
        return {
            id: userId,
            username: 'Nowy Bohater',
            level: 1,
            xp: 0,
            money: 100,
            bank: 0,
            rpg: {
                hp: BASE_STATS.hp,
                atk: BASE_STATS.atk,
                def: BASE_STATS.def,
                crit: BASE_STATS.crit,
                luck: BASE_STATS.luck,
                mana: BASE_STATS.mana,
                equipment: {
                    weapon:   STARTER_ITEMS.weapon,
                    helmet:   STARTER_ITEMS.helmet,
                    chest:    STARTER_ITEMS.chest,
                    pants:    STARTER_ITEMS.pants,
                    boots:    STARTER_ITEMS.boots,
                    shield:   STARTER_ITEMS.shield,
                    ring:     STARTER_ITEMS.ring,
                },
                inventory: [],
                ore: [],
                fish: [],
                keys: [],
                potions: [],
                food: [],
                location: 'Miasto',
            }
        };
    }

    // Sprawdź czy kolumna rpg istnieje
    if (!profile.rpg) {
        const rpg = {
            hp: BASE_STATS.hp,
            atk: BASE_STATS.atk,
            def: BASE_STATS.def,
            crit: BASE_STATS.crit,
            luck: BASE_STATS.luck,
            mana: BASE_STATS.mana,
            equipment: {
                weapon:   STARTER_ITEMS.weapon,
                helmet:   STARTER_ITEMS.helmet,
                chest:    STARTER_ITEMS.chest,
                pants:    STARTER_ITEMS.pants,
                boots:    STARTER_ITEMS.boots,
                shield:   STARTER_ITEMS.shield,
                ring:     STARTER_ITEMS.ring,
            },
            inventory: profile.inventory || [],
            ore: profile.ore || [],
            fish: profile.fish || [],
            keys: profile.keys || [],
            potions: profile.potions || [],
            food: profile.food || [],
            location: profile.location || 'Miasto',
        };

        await supabase.from('profiles').update({ rpg }).eq('id', profile.id);
        profile.rpg = rpg;
    }

    return profile;
}

// ── Dynamiczne statystyki (equip + level + base) ───────────────────────
function calculateStats(rpgProfile) {
    if (!rpgProfile.rpg) return null;

    const { rpg, level } = rpgProfile;

    // Oblicz statystyki z tabeli LEVEL_STATS
    const levelStats = LEVEL_STATS.stats[level] || LEVEL_STATS.stats[1];

    // Base stats from character level
    let hp = BASE_STATS.hp + levelStats.hp;
    let atk = BASE_STATS.atk + levelStats.atk;
    let def = BASE_STATS.def + levelStats.def;
    let crit = BASE_STATS.crit; // CRIT doesn't scale with level in the new structure
    let luck = BASE_STATS.luck; // LUCK doesn't scale with level
    let mana = BASE_STATS.mana + levelStats.mana;

    // Sumuj ze sprzętu
    // Weapon adds ATK
    if (rpg.equipment?.weapon && rpg.equipment.weapon.atk) {
        atk += rpg.equipment.weapon.atk;
    }

    // Armor adds DEF and HP
    if (rpg.equipment?.helmet && rpg.equipment.helmet.def) {
        hp += rpg.equipment.helmet.def;
        def += rpg.equipment.helmet.def;
    }
    if (rpg.equipment?.chest && rpg.equipment.chest.def) {
        def += rpg.equipment.chest.def;
    }
    if (rpg.equipment?.pants && rpg.equipment.pants.def) {
        def += rpg.equipment.pants.def;
    }
    if (rpg.equipment?.boots && rpg.equipment.boots.def) {
        def += rpg.equipment.boots.def;
    }
    if (rpg.equipment?.shield && rpg.equipment.shield.def) {
        def += rpg.equipment.shield.def;
    }
    if (rpg.equipment?.ring && rpg.equipment.ring.hp) {
        hp += rpg.equipment.ring.hp;
    }

    return {
        ...rpg,
        stats: { hp, atk, def, crit, luck, mana },
        power: Math.round((atk - def) * 10), // Moc = atk - def * 10
    };
}

// ── EKWIPUNEK ──────────────────────────────────────────────────────────
async function handleEquipment(interaction, supabase, profile) {
    const stats = calculateStats(profile);
    if (!stats) return interaction.reply({ content: '❌ Błąd pobierania statystyk.', ephemeral: true });

    const { rpg } = profile;
    const equipment = rpg.equipment || {};

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ Ekwipunek: ${profile.username} (Lvl ${profile.level})`)
        .setColor('#1bbdbd')
        .setDescription(
            `📊 **MOC POSTACI:** ${stats.power}\n\n` +
            `🩸 HP: **${stats.hp}**\n` +
            `⚔️ ATK: **${stats.atk}**\n` +
            `🛡️ DEF: **${stats.def}**\n` +
            `🎯 CRIT: **${stats.crit}%**\n` +
            `🍀 LUCK: **${stats.luck}**\n` +
            `💧 MANA: **${stats.mana}**`
        );

    for (const slot of EQUIPMENT_SLOTS) {
        const item = equipment[slot.id];
        if (item) {
            // STARTER_ITEMS[slot.id] is a single item object (see comment at
            // the top of this file), not an array to search — fall back to
            // the raw stored value the same way a failed lookup already did.
            const itemData = STARTER_ITEMS[slot.id] || item;
            embed.addFields({
                name: `${slot.label}: ${itemData.emoji} ${itemData.name}`,
                value: itemData.atk ? `${itemData.atk} ATK` : itemData.def ? `${itemData.def} DEF` : itemData.hp ? `${itemData.hp} HP` : itemData.name,
            });
        } else {
            embed.addFields({
                name: `${slot.label}: 🟰`,
                value: 'Pusto',
            });
        }
    }

    await interaction.reply({ embeds: [embed] });
}

// ── INWENTARZ ──────────────────────────────────────────────────────────
async function handleInventory(interaction, supabase, profile) {
    const { rpg } = profile;
    const stats = calculateStats(profile);

    const items = [];
    const inventory = rpg?.inventory || [];
    const ore = rpg?.ore || [];
    const fish = rpg?.fish || [];
    const keys = rpg?.keys || [];
    const potions = rpg?.potions || [];
    const food = rpg?.food || [];

    items.push(...inventory, ...ore, ...fish, ...keys, ...potions, ...food);

    if (items.length === 0) {
        return interaction.reply({
            content: `🎒 **Inwentarz pusty**.\n\nPojemność: ${INVENTORY_SIZE} slotów\nZajęte: 0/${INVENTORY_SIZE}`,
            ephemeral: true,
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🎒 Inwentarz: ${profile.username}`)
        .setColor('#1bbdbd')
        .setDescription(
            `**Zajęte: ${items.length}/${INVENTORY_SIZE} slotów**\n\n` +
            items.slice(0, 10).map(i => `${i.emoji || '•'} **${i.name}**`).join('\n') +
            (items.length > 10 ? `\n...i jeszcze ${items.length - 10} przedmiotów` : '')
        );

    await interaction.reply({ embeds: [embed] });
}

// ── KOPALNIA (Mining) ──────────────────────────────────────────────────
async function handleMine(interaction, supabase, profile) {
    const userId = interaction.user.id;
    const { rpg } = profile;
    const stats = calculateStats(profile);

    // 7 klików mechanika
    for (let i = 1; i <= 7; i++) {
        await new Promise(r => setTimeout(r, 300));
    }

    // Drop mechanika (szansa na lepsze surowce)
    const luck = rpg?.stats?.luck || 10;
    const rand = Math.random() * 100;

    let dropType = 'stone';
    if (rand < 10) dropType = 'diamond';
    else if (rand < 25) dropType = 'gold';
    else if (rand < 45) dropType = 'iron';
    else if (rand < 60) dropType = 'coal';
    else if (rand < 75) dropType = 'wood';
    else if (rand < 85) dropType = 'ruby';
    else if (rand < 92) dropType = 'sapphire';

    const resource = RESOURCES[dropType];

    const xpGain = Math.floor((resource.baseValue || 10) / 2);
    const moneyGain = resource.baseValue || 10;
    const newLevel = getLevelFromXp((profile.xp || 0) + xpGain);

    // apply_mine_reward (which also appended to a profiles.ore column) was
    // dropped — that column never existed on the live table, so this write
    // never actually persisted anything before either. apply_xp_money_reward
    // is the correct, already-existing shape for what's actually there.
    await supabase.rpc('apply_xp_money_reward', {
        p_user_id: profile.id,
        p_xp_delta: xpGain,
        p_money_delta: moneyGain,
        p_new_level: newLevel,
    });

    return interaction.editReply({
        content: `🔨 **Kopalnia** - 7/7 klików wykonanych!\n\n📦 Drop: **${resource.name}** ${resource.emoji}\n💰 Wartość: +${resource.baseValue} ${COIN}\n✨ XP: +${xpGain}\n📈 Level: ${profile.level} → ${newLevel}`,
    });
}

// ── STAW (Fishing) ─────────────────────────────────────────────────────
async function handleStaw(interaction, supabase, profile) {
    // Prosty fishing mechanic
    const fishNames = [
        { name: 'Zwykła ryba', emoji: '🐟', value: 10 },
        { name: 'Srebrna ryba', emoji: '🥈', value: 30 },
        { name: 'Złota ryba', emoji: '🐟', value: 100 },
        { name: 'Ryba magika', emoji: '🔮', value: 200 },
    ];

    const fish = fishNames[Math.floor(Math.random() * fishNames.length)];
    const fishName = fish.name === 'Zwykła ryba' ? `${fish.name} ${Math.floor(Math.random() * 10) + 1}cm` : fish.name;

    const xpGain = Math.floor(fish.value / 5);
    const newLevel = getLevelFromXp((profile.xp || 0) + xpGain);

    // apply_staw_reward (which also appended to a profiles.fish column) was
    // dropped — that column never existed on the live table, so the old
    // single .update() call always failed as a whole, silently, and this
    // reward has likely never actually persisted before. apply_xp_money_reward
    // is the correct, already-existing shape for what's actually there.
    await supabase.rpc('apply_xp_money_reward', {
        p_user_id: profile.id,
        p_xp_delta: xpGain,
        p_money_delta: fish.value,
        p_new_level: newLevel,
    });

    return interaction.reply({
        content: `🎣 **Staw**\n\n🐟 Złowiłeś: **${fishName}**\n💰 Sprzedaż: +${fish.value} ${COIN}\n✨ XP: +${xpGain}\n📈 Level: ${profile.level} → ${newLevel}`,
    });
}

// ── DUNGEON (Wybór poziomu) ────────────────────────────────────────────
async function handleDungeon(interaction, supabase, profile) {
    const { rpg, level } = profile;
    const stats = calculateStats(profile);

    const difficulty = ['łatwy', 'średni', 'trudny', 'niemożliwy'];
    const enemyList = [];

    for (const [key, enemy] of Object.entries(ENEMIES)) {
        if (enemy.tier === 'easy' || enemy.tier === 'medium' || enemy.tier === 'hard') {
            enemyList.push({ id: key, ...enemy });
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('🏰 Wybierz poziom Dungeon')
        .setColor('#dc3545')
        .setDescription(
            '**Dostępne poziomy:**\n\n' +
            `🟢 **Łatwy** - ${difficulty[0].toUpperCase()} (Wilki, Pająki)\n` +
            `🟡 **Średni** - ${difficulty[1].toUpperCase()} (Zombi, Szkielety)\n` +
            `🔴 **Trudny** - ${difficulty[2].toUpperCase()} (Orkowie, Golemy)\n` +
            `⚫ **Niemożliwy** - ${difficulty[3].toUpperCase()} (Cieniostwory, Nekromanci)`
        );

    const btns = [
        new ButtonBuilder().setCustomId('dungeon_easy').setLabel('🟢 Łatwy').setStyle(ButtonStyle.Primary).setEmoji('🟢'),
        new ButtonBuilder().setCustomId('dungeon_medium').setLabel('🟡 Średni').setStyle(ButtonStyle.Success).setEmoji('🟡'),
        new ButtonBuilder().setCustomId('dungeon_hard').setLabel('🔴 Trudny').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
        new ButtonBuilder().setCustomId('dungeon_impossible').setLabel('⚫ Niemożliwy').setStyle(ButtonStyle.Secondary).setEmoji('⚫'),
    ];

    const components = [
        new ActionRowBuilder().addComponents(btns[0], btns[1]),
        new ActionRowBuilder().addComponents(btns[2], btns[3]),
    ];

    await interaction.reply({ embeds: [embed], components });
}

// ── OBSŁUGA DUNGEON BUTTONS ───────────────────────────────────────────
async function handleDungeonButton(interaction, supabase, profile, difficulty) {
    const difficultyMap = {
        'dungeon_easy': 'easy',
        'dungeon_medium': 'medium',
        'dungeon_hard': 'hard',
        'dungeon_impossible': 'rare',
    };

    const tier = difficultyMap[interaction.customId] || 'easy';
    const stats = calculateStats(profile);

    // Wybór bosy dla trudnego poziomu
    if (tier === 'hard' || tier === 'rare') {
        // Scoped to this branch only — used below for its .coins as the
        // boss-fight loot roll (was previously colliding with the `enemy`
        // declared further down for the normal-fight branch).
        const enemyList = Object.values(ENEMIES).filter(e => e.tier === tier);
        const enemy = enemyList[Math.floor(Math.random() * enemyList.length)];

        const bossList = Object.values(BOSSES);
        const boss = bossList[Math.floor(Math.random() * bossList.length)];

        // Jeśli gracz ma za mało poziomu
        if (profile.level < boss.level) {
            return interaction.reply({
                content: `❌ Ten boss wymaga poziomu **${boss.level}**! Masz tylko poziom **${profile.level}**.\n\nSpróbuj innego poziomu!`,
                ephemeral: true,
            });
        }

        // Walka z bossem (uproszczona)
        let combatRounds = 1;
        let combatDmg = 0;
        let combatReceived = 0;

        for (let round = 1; round <= 3; round++) {
            // Gracz atakuje
            const critRoll = Math.random() * 100 < (stats.crit || 5);
            const baseDmg = stats.atk - boss.def;
            const finalDmg = critRoll ? Math.floor(baseDmg * 1.5) : baseDmg;
            combatDmg += finalDmg;

            // Boss atakuje
            const bossDmg = Math.max(0, Math.floor((boss.atk - stats.def) * (0.9 + Math.random() * 0.2)));
            combatReceived += bossDmg;
        }

        const newHp = Math.max(0, (stats.hp || 100) - combatReceived);

        if (newHp <= 0) {
            const lostMoney = Math.floor(Math.random() * 50 + 20);

            await supabase.rpc('increment_profile_money', { p_user_id: profile.id, p_delta: -lostMoney });

            return interaction.editReply({
                content: `💀 **PRZEGRANA z ${boss.name}!**\n\n👹 ${boss.name} (${boss.emoji}) zabił Cię!\n⚔️ Otrzymałeś: ${combatReceived} HP\n💸 Straciłeś: ${lostMoney} ${COIN}`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle('💀 Pokonany przez ' + boss.name)
                        .setDescription(`⚔️ Obrażenia: ${combatReceived} HP`)
                        .setColor('#dc3545'),
                ],
            });
        }

        // Wygrana
        const coins = Math.floor(Math.random() * enemy.coins * (1 + (stats.luck || 10) / 100));
        const xp = enemy.xp;
        const newLevel = getLevelFromXp((profile.xp || 0) + xp);

        return interaction.editReply({
            content: `🎉 **WYGRANA z ${boss.name}!**\n\n👹 Pokonałeś: **${boss.name}** (${boss.emoji})\n💰 Zdobycz: ${coins} ${COIN}\n✨ XP: +${xp}\n📈 Level: ${profile.level} → ${newLevel}`,
            embeds: [
                new EmbedBuilder()
                    .setTitle('🎉 Wygrana walka!')
                    .setDescription(`💰 ${coins} ${COIN} | ✨ ${xp} XP`)
                    .setColor('#22FF00'),
            ],
        });
    }

    // Normalna walka dla zwykłych przeciwników
    const enemy = ENEMIES[interaction.customId.replace('dungeon_', '')];

    if (!enemy) {
        return interaction.reply({
            content: '❌ Nieznany poziom dungeonu.',
            ephemeral: true,
        });
    }

    // Walka
    let combatRounds = Math.max(1, Math.floor(Math.random() * 3 + 1));
    let combatDmg = 0;
    let combatReceived = 0;

    for (let round = 1; round <= combatRounds; round++) {
        const critRoll = Math.random() * 100 < (stats.crit || 5);
        const baseDmg = stats.atk - enemy.def;
        const finalDmg = critRoll ? Math.floor(baseDmg * 1.5) : baseDmg;
        combatDmg += finalDmg;

        const enemyDmg = Math.max(0, Math.floor((enemy.atk - stats.def) * (0.9 + Math.random() * 0.2)));
        combatReceived += enemyDmg;
    }

    const newHp = Math.max(0, (stats.hp || 100) - combatReceived);

    if (newHp <= 0) {
        const lostMoney = Math.floor(Math.random() * 30 + 10);

        await supabase.rpc('increment_profile_money', { p_user_id: profile.id, p_delta: -lostMoney });

        return interaction.editReply({
            content: `💀 **PRZEGRANA!**\n\n👹 ${enemy.name} Cię zabił!\n⚔️ Otrzymałeś: ${combatReceived} HP\n💸 Straciłeś: ${lostMoney} ${COIN}`,
            embeds: [
                new EmbedBuilder()
                    .setTitle('💀 Pokonany przez ' + enemy.name)
                    .setDescription(`⚔️ Obrażenia: ${combatReceived} HP`)
                    .setColor('#dc3545'),
            ],
        });
    }

    // Wygrana
    const coins = Math.floor(Math.random() * enemy.coins * (1 + (stats.luck || 10) / 100));
    const xp = enemy.xp;
    const newLevel = getLevelFromXp((profile.xp || 0) + xp);

    return interaction.editReply({
        content: `🎉 **WYGRANA!**\n\n👹 Pokonałeś: **${enemy.name}** (${enemy.emoji})\n💰 Zdobycz: ${coins} ${COIN}\n✨ XP: +${xp}\n📈 Level: ${profile.level} → ${newLevel}`,
        embeds: [
            new EmbedBuilder()
                .setTitle('🎉 Wygrana walka!')
                .setDescription(`💰 ${coins} ${COIN} | ✨ ${xp} XP`)
                .setColor('#22FF00'),
        ],
    });
}

// ── MIASTO ─────────────────────────────────────────────────────────────
async function handleCity(interaction, supabase, profile) {
    const embed = new EmbedBuilder()
        .setTitle('🏙️ Miasto')
        .setColor('#1bbdbd')
        .setDescription(
            '**Dostępne miejsca:**\n\n' +
            '🛒 **Sklep** - Mikstury, Jedzenie, Sprzęt\n' +
            '🏥 **Szpital** - Leczenie za 50 coins\n' +
            '🔨 **Kuźnia** - Ulepszaj przedmioty\n' +
            '🌱 **Farma** - Uprawiaj rośliny'
        );

    const btnShop = new ButtonBuilder().setCustomId('city_shop').setLabel('🛒 Sklep').setStyle(ButtonStyle.Primary).setEmoji('🛒');
    const btnHeal = new ButtonBuilder().setCustomId('city_heal').setLabel('🏥 Szpital').setStyle(ButtonStyle.Success).setEmoji('🏥');
    const btnForge = new ButtonBuilder().setCustomId('city_forge').setLabel('🔨 Kuźnia').setStyle(ButtonStyle.Secondary).setEmoji('🔨');
    const btnFarm = new ButtonBuilder().setCustomId('city_farm').setLabel('🌱 Farma').setStyle(ButtonStyle.Secondary).setEmoji('🌱');

    const components = [
        new ActionRowBuilder().addComponents(btnShop, btnHeal),
        new ActionRowBuilder().addComponents(btnForge, btnFarm),
    ];

    await interaction.reply({ embeds: [embed], components });
}

// ── SKLEP (Shop) ───────────────────────────────────────────────────────
async function handleCityShop(interaction, supabase, profile) {
    const money = profile.money || 0;

    const shopItems = [
        ...Object.values(SHOP_ITEMS).filter(i => i.type === 'potion'),
        ...Object.values(SHOP_ITEMS).filter(i => i.type === 'food'),
        ...Object.values(SHOP_ITEMS).filter(i => i.type === 'helmet' || i.type === 'chest' || i.type === 'pants' || i.type === 'boots' || i.type === 'shield'),
    ];

    const embed = new EmbedBuilder()
        .setTitle('🛒 Sklep w Mieście')
        .setColor('#1bbdbd')
        .setDescription(
            `Portfel: **${money.toLocaleString('pl-PL')} ${COIN}**\n\n` +
            shopItems.map((item, i) => `${i + 1}. ${item.emoji} **${item.name}** - ${item.price} ${COIN}`).join('\n')
        );

    const btns = shopItems.map((item, i) => {
        const btn = new ButtonBuilder()
            .setCustomId(`shop_${i}`)
            .setLabel(`${item.name}`)
            .setEmoji(item.emoji)
            .setStyle(ButtonStyle.Success);

        if (money < item.price) {
            btn.setDisabled(true);
            btn.setEmoji('❌');
        }

        return btn;
    });

    const rows = [];
    for (let i = 0; i < btns.length; i += 2) {
        rows.push(new ActionRowBuilder().addComponents(btns[i], btns[i + 1]));
    }

    await interaction.reply({ embeds: [embed], components: rows });
}

// ── SZPITAL (Heal) ─────────────────────────────────────────────────────
async function handleCityHeal(interaction, supabase, profile) {
    const stats = calculateStats(profile);
    const healCost = 50;

    if (stats.hp >= 100) {
        return interaction.reply({
            content: '🩺 Twoja postać jest już w pełni wyleczona!',
            ephemeral: true,
        });
    }

    const money = profile.money || 0;

    if (money < healCost) {
        return interaction.reply({
            content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${healCost} ${COIN}**.\n`,
            ephemeral: true,
        });
    }

    const { data: cityHealData, error: cityHealError } = await supabase.rpc('increment_profile_money', {
        p_user_id: profile.id,
        p_delta: -healCost,
    });
    if (cityHealError || !cityHealData?.length) {
        return interaction.reply({
            content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${healCost} ${COIN}**.\n`,
            ephemeral: true,
        });
    }
    const newMoney = cityHealData[0].money;

    return interaction.reply({
        content: `🏥 **Szpital**\n\n✅ Wyleczono! HP: ${stats.hp} → 100\n💰 Koszt: ${healCost} ${COIN}\n💵 Pozostało: ${newMoney} ${COIN}`,
        ephemeral: true,
    });
}

// ── KUŹNIA (Forge) ──────────────────────────────────────────────────────
async function handleCityForge(interaction, supabase, profile) {
    const stats = calculateStats(profile);
    const money = profile.money || 0;

    const upgrades = [
        { name: 'Ulepsz broń', price: 100, desc: '+5 ATK' },
        { name: 'Ulepsz hełm', price: 100, desc: '+3 DEF' },
        { name: 'Ulepsz zbroję', price: 200, desc: '+10 DEF' },
        { name: 'Ulepsz spodenie', price: 150, desc: '+7 DEF' },
        { name: 'Ulepsz buty', price: 150, desc: '+7 DEF' },
        { name: 'Ulepsz tarczę', price: 150, desc: '+10 DEF' },
        { name: 'Ulepsz pierścionek', price: 100, desc: '+5 stat' },
    ];

    const embed = new EmbedBuilder()
        .setTitle('🔨 Kuźnia')
        .setColor('#f6b41e')
        .setDescription(`Portfel: **${money.toLocaleString('pl-PL')} ${COIN}**\n\n${upgrades.map((u, i) => `${i + 1}. ${u.emoji} **${u.name}** - ${u.price} ${COIN} | ${u.desc}`).join('\n')}`);

    const btns = upgrades.map((upgrade, i) => {
        const btn = new ButtonBuilder()
            .setCustomId(`forge_${i}`)
            .setLabel(upgrade.name)
            .setEmoji(upgrade.emoji)
            .setStyle(ButtonStyle.Success);

        if (money < upgrade.price) {
            btn.setDisabled(true);
            btn.setEmoji('❌');
        }

        return btn;
    });

    const rows = [];
    for (let i = 0; i < btns.length; i += 2) {
        rows.push(new ActionRowBuilder().addComponents(btns[i], btns[i + 1]));
    }

    await interaction.reply({ embeds: [embed], components: rows });
}

// ── FARMA (Future - Placeholder) ───────────────────────────────────────
async function handleCityFarm(interaction, supabase, profile) {
    return interaction.reply({
        content: '🌱 **Farma** - Funkcja w разработке. Wróć później!',
        ephemeral: true,
    });
}

// ── OBSŁUGA MIĘSTO BUTTONS ────────────────────────────────────────────
async function handleCityButton(interaction, supabase, profile) {
    if (interaction.customId.startsWith('shop_')) {
        await handleCityShop(interaction, supabase, profile);
        return;
    }

    if (interaction.customId === 'city_heal') {
        await handleCityHeal(interaction, supabase, profile);
        return;
    }

    if (interaction.customId === 'city_forge') {
        await handleCityForge(interaction, supabase, profile);
        return;
    }

    if (interaction.customId === 'city_farm') {
        await handleCityFarm(interaction, supabase, profile);
        return;
    }
}

// ── EXPORTY ────────────────────────────────────────────────────────────
module.exports = {
    getRpgProfile,
    calculateStats,
    handleEquipment,
    handleInventory,
    handleMine,
    handleStaw,
    handleDungeon,
    handleDungeonButton,
    handleCity,
    handleCityShop,
    handleCityHeal,
    handleCityForge,
    handleCityFarm,
    handleCityButton,
    RESOURCES,
    ENEMIES,
    BOSSES,
    STARTER_ITEMS,
    SHOP_ITEMS,
    INVENTORY_SIZE,
    getXpForLevel,
    getLevelFromXp,
};

