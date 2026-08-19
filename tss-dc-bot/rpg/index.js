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
const COIN = 'đź’°';

// â”€â”€ NAMA Gry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GAME_NAME = 'Two Steps Valley';

// â”€â”€ PROFIL RAG (getProfile) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // SprawdĹş czy kolumna rpg istnieje
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

// â”€â”€ Dynamiczne statystyki (equip + level + base) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // Sumuj ze sprzÄ™tu
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

// â”€â”€ EKWIPUNEK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleEquipment(interaction, supabase, profile) {
    const stats = calculateStats(profile);
    if (!stats) return interaction.reply({ content: 'âťŚ BĹ‚Ä…d pobierania statystyk.', ephemeral: true });

    const { rpg } = profile;
    const equipment = rpg.equipment || {};

    const embed = new EmbedBuilder()
        .setTitle(`đź›ˇď¸Ź Ekwipunek: ${profile.username} (Lvl ${profile.level})`)
        .setColor('#1bbdbd')
        .setDescription(
            `đź“Š **MOC POSTACI:** ${stats.power}\n\n` +
            `đź©¸ HP: **${stats.hp}**\n` +
            `âš”ď¸Ź ATK: **${stats.atk}**\n` +
            `đź›ˇď¸Ź DEF: **${stats.def}**\n` +
            `đźŽŻ CRIT: **${stats.crit}%**\n` +
            `đźŤ€ LUCK: **${stats.luck}**\n` +
            `đź’§ MANA: **${stats.mana}**`
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
                name: `${slot.label}: đźź°`,
                value: 'Pusto',
            });
        }
    }

    await interaction.reply({ embeds: [embed] });
}

// â”€â”€ INWENTARZ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            content: `đźŽ’ **Inwentarz pusty**.\n\nPojemnoĹ›Ä‡: ${INVENTORY_SIZE} slotĂłw\nZajÄ™te: 0/${INVENTORY_SIZE}`,
            ephemeral: true,
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`đźŽ’ Inwentarz: ${profile.username}`)
        .setColor('#1bbdbd')
        .setDescription(
            `**ZajÄ™te: ${items.length}/${INVENTORY_SIZE} slotĂłw**\n\n` +
            items.slice(0, 10).map(i => `${i.emoji || 'â€˘'} **${i.name}**`).join('\n') +
            (items.length > 10 ? `\n...i jeszcze ${items.length - 10} przedmiotĂłw` : '')
        );

    await interaction.reply({ embeds: [embed] });
}

// â”€â”€ KOPALNIA (Mining) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleMine(interaction, supabase, profile) {
    const userId = interaction.user.id;
    const { rpg } = profile;
    const stats = calculateStats(profile);

    // 7 klikĂłw mechanika
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

    // Zapisz surowiec
    await supabase.from('profiles').update({
        ore: (profile.ore || []).concat([{ id: `ore_${Date.now()}_${i}`, ...resource }]),
    }).eq('id', profile.id);

    const xpGain = Math.floor((resource.baseValue || 10) / 2);
    const newMoney = (profile.money || 0) + (resource.baseValue || 10);
    const newXp = (profile.xp || 0) + xpGain;
    const newLevel = getLevelFromXp(newXp);

    await supabase.from('profiles').update({
        money: newMoney,
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
    }).eq('id', profile.id);

    return interaction.editReply({
        content: `đź”¨ **Kopalnia** - ${i}/7 klikĂłw wykonanych!\n\nđź“¦ Drop: **${resource.name}** ${resource.emoji}\nđź’° WartoĹ›Ä‡: +${resource.baseValue} ${COIN}\nâś¨ XP: +${xpGain}\nđź“ Level: ${profile.level} â†’ ${newLevel}`,
    });
}

// â”€â”€ STAW (Fishing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleStaw(interaction, supabase, profile) {
    // Prosty fishing mechanic
    const fishNames = [
        { name: 'ZwykĹ‚a ryba', emoji: 'đźź', value: 10 },
        { name: 'Srebrna ryba', emoji: 'đźĄ', value: 30 },
        { name: 'ZĹ‚ota ryba', emoji: 'đźź', value: 100 },
        { name: 'Ryba magika', emoji: 'đź”®', value: 200 },
    ];

    const fish = fishNames[Math.floor(Math.random() * fishNames.length)];
    const fishName = fish.name === 'ZwykĹ‚a ryba' ? `${fish.name} ${Math.floor(Math.random() * 10) + 1}cm` : fish.name;

    const xpGain = Math.floor(fish.value / 5);
    const newMoney = (profile.money || 0) + fish.value;
    const newXp = (profile.xp || 0) + xpGain;
    const newLevel = getLevelFromXp(newXp);

    await supabase.from('profiles').update({
        fish: (profile.fish || []).concat([{ id: `fish_${Date.now()}`, name: fishName, value: fish.value, type: 'fish' }]),
        money: newMoney,
        xp: newXp,
        level: newLevel,
        updated_at: new Date().toISOString(),
    }).eq('id', profile.id);

    return interaction.reply({
        content: `đźŽŁ **Staw**\n\nđźź ZĹ‚owiĹ‚eĹ›: **${fishName}**\nđź’° SprzedaĹĽ: +${fish.value} ${COIN}\nâś¨ XP: +${xpGain}\nđź“ Level: ${profile.level} â†’ ${newLevel}`,
    });
}

// â”€â”€ DUNGEON (WybĂłr poziomu) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleDungeon(interaction, supabase, profile) {
    const { rpg, level } = profile;
    const stats = calculateStats(profile);

    const difficulty = ['Ĺ‚atwy', 'Ĺ›redni', 'trudny', 'niemoĹĽliwy'];
    const enemyList = [];

    for (const [key, enemy] of Object.entries(ENEMIES)) {
        if (enemy.tier === 'easy' || enemy.tier === 'medium' || enemy.tier === 'hard') {
            enemyList.push({ id: key, ...enemy });
        }
    }

    const embed = new EmbedBuilder()
        .setTitle('đźŹ° Wybierz poziom Dungeon')
        .setColor('#dc3545')
        .setDescription(
            '**DostÄ™pne poziomy:**\n\n' +
            `đźź˘ **Ĺatwy** - ${difficulty[0].toUpperCase()} (Wilki, PajÄ…ki)\n` +
            `đźźˇ **Ĺšredni** - ${difficulty[1].toUpperCase()} (Zombi, Szkielety)\n` +
            `đź”´ **Trudny** - ${difficulty[2].toUpperCase()} (Orkowie, Golemy)\n` +
            `âš« **NiemoĹĽliwy** - ${difficulty[3].toUpperCase()} (Cieniostwory, Nekromanci)`
        );

    const btns = [
        new ButtonBuilder().setCustomId('dungeon_easy').setLabel('đźź˘ Ĺatwy').setStyle(ButtonStyle.Primary).setEmoji('đźź˘'),
        new ButtonBuilder().setCustomId('dungeon_medium').setLabel('đźźˇ Ĺšredni').setStyle(ButtonStyle.Success).setEmoji('đźźˇ'),
        new ButtonBuilder().setCustomId('dungeon_hard').setLabel('đź”´ Trudny').setStyle(ButtonStyle.Danger).setEmoji('đź”´'),
        new ButtonBuilder().setCustomId('dungeon_impossible').setLabel('âš« NiemoĹĽliwy').setStyle(ButtonStyle.Secondary).setEmoji('âš«'),
    ];

    const components = [
        new ActionRowBuilder().addComponents(btns[0], btns[1]),
        new ActionRowBuilder().addComponents(btns[2], btns[3]),
    ];

    await interaction.reply({ embeds: [embed], components });
}

// â”€â”€ OBSĹUGA DUNGEON BUTTONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleDungeonButton(interaction, supabase, profile, difficulty) {
    const difficultyMap = {
        'dungeon_easy': 'easy',
        'dungeon_medium': 'medium',
        'dungeon_hard': 'hard',
        'dungeon_impossible': 'rare',
    };

    const tier = difficultyMap[interaction.customId] || 'easy';
    const stats = calculateStats(profile);

    // WybĂłr bosy dla trudnego poziomu
    if (tier === 'hard' || tier === 'rare') {
        // Scoped to this branch only — used below for its .coins as the
        // boss-fight loot roll (was previously colliding with the `enemy`
        // declared further down for the normal-fight branch).
        const enemyList = Object.values(ENEMIES).filter(e => e.tier === tier);
        const enemy = enemyList[Math.floor(Math.random() * enemyList.length)];

        const bossList = Object.values(BOSSES);
        const boss = bossList[Math.floor(Math.random() * bossList.length)];

        // JeĹ›li gracz ma za maĹ‚o poziomu
        if (profile.level < boss.level) {
            return interaction.reply({
                content: `âťŚ Ten boss wymaga poziomu **${boss.level}**! Masz tylko poziom **${profile.level}**.\n\nSprĂłbuj innego poziomu!`,
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
            const newMoney = (profile.money || 0) - lostMoney;

            await supabase.from('profiles').update({ money: newMoney }).eq('id', profile.id);

            return interaction.editReply({
                content: `đź’€ **PRZEGRANA z ${boss.name}!**\n\nđź‘ą ${boss.name} (${boss.emoji}) zabiĹ‚ CiÄ™!\nâš”ď¸Ź OtrzymaĹ‚eĹ›: ${combatReceived} HP\nđź’¸ StraciĹ‚eĹ›: ${lostMoney} ${COIN}`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle('đź’€ Pokonany przez ' + boss.name)
                        .setDescription(`âš”ď¸Ź ObraĹĽenia: ${combatReceived} HP`)
                        .setColor('#dc3545'),
                ],
            });
        }

        // Wygrana
        const coins = Math.floor(Math.random() * enemy.coins * (1 + (stats.luck || 10) / 100));
        const xp = enemy.xp;
        const newLevel = getLevelFromXp((profile.xp || 0) + xp);

        return interaction.editReply({
            content: `đźŽ‰ **WYGRANA z ${boss.name}!**\n\nđź‘ą PokonaĹ‚eĹ›: **${boss.name}** (${boss.emoji})\nđź’° Zdobycz: ${coins} ${COIN}\nâś¨ XP: +${xp}\nđź“ Level: ${profile.level} â†’ ${newLevel}`,
            embeds: [
                new EmbedBuilder()
                    .setTitle('đźŽ‰ Wygrana walka!')
                    .setDescription(`đź’° ${coins} ${COIN} | âś¨ ${xp} XP`)
                    .setColor('#22FF00'),
            ],
        });
    }

    // Normalna walka dla zwykĹ‚ych przeciwnikĂłw
    const enemy = ENEMIES[interaction.customId.replace('dungeon_', '')];

    if (!enemy) {
        return interaction.reply({
            content: 'âťŚ Nieznany poziom dungeonu.',
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
        const newMoney = (profile.money || 0) - lostMoney;

        await supabase.from('profiles').update({ money: newMoney }).eq('id', profile.id);

        return interaction.editReply({
            content: `đź’€ **PRZEGRANA!**\n\nđź‘ą ${enemy.name} CiÄ™ zabiĹ‚!\nâš”ď¸Ź OtrzymaĹ‚eĹ›: ${combatReceived} HP\nđź’¸ StraciĹ‚eĹ›: ${lostMoney} ${COIN}`,
            embeds: [
                new EmbedBuilder()
                    .setTitle('đź’€ Pokonany przez ' + enemy.name)
                    .setDescription(`âš”ď¸Ź ObraĹĽenia: ${combatReceived} HP`)
                    .setColor('#dc3545'),
            ],
        });
    }

    // Wygrana
    const coins = Math.floor(Math.random() * enemy.coins * (1 + (stats.luck || 10) / 100));
    const xp = enemy.xp;
    const newLevel = getLevelFromXp((profile.xp || 0) + xp);

    return interaction.editReply({
        content: `đźŽ‰ **WYGRANA!**\n\nđź‘ą PokonaĹ‚eĹ›: **${enemy.name}** (${enemy.emoji})\nđź’° Zdobycz: ${coins} ${COIN}\nâś¨ XP: +${xp}\nđź“ Level: ${profile.level} â†’ ${newLevel}`,
        embeds: [
            new EmbedBuilder()
                .setTitle('đźŽ‰ Wygrana walka!')
                .setDescription(`đź’° ${coins} ${COIN} | âś¨ ${xp} XP`)
                .setColor('#22FF00'),
        ],
    });
}

// â”€â”€ MIASTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleCity(interaction, supabase, profile) {
    const embed = new EmbedBuilder()
        .setTitle('đźŹ™ď¸Ź Miasto')
        .setColor('#1bbdbd')
        .setDescription(
            '**DostÄ™pne miejsca:**\n\n' +
            'đź›’ **Sklep** - Mikstury, Jedzenie, SprzÄ™t\n' +
            'đźŹĄ **Szpital** - Leczenie za 50 coins\n' +
            'đź”¨ **KuĹşnia** - Ulepszaj przedmioty\n' +
            'đźŚ± **Farma** - Uprawiaj roĹ›liny'
        );

    const btnShop = new ButtonBuilder().setCustomId('city_shop').setLabel('đź›’ Sklep').setStyle(ButtonStyle.Primary).setEmoji('đź›’');
    const btnHeal = new ButtonBuilder().setCustomId('city_heal').setLabel('đźŹĄ Szpital').setStyle(ButtonStyle.Success).setEmoji('đźŹĄ');
    const btnForge = new ButtonBuilder().setCustomId('city_forge').setLabel('đź”¨ KuĹşnia').setStyle(ButtonStyle.Secondary).setEmoji('đź”¨');
    const btnFarm = new ButtonBuilder().setCustomId('city_farm').setLabel('đźŚ± Farma').setStyle(ButtonStyle.Secondary).setEmoji('đźŚ±');

    const components = [
        new ActionRowBuilder().addComponents(btnShop, btnHeal),
        new ActionRowBuilder().addComponents(btnForge, btnFarm),
    ];

    await interaction.reply({ embeds: [embed], components });
}

// â”€â”€ SKLEP (Shop) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleCityShop(interaction, supabase, profile) {
    const money = profile.money || 0;

    const shopItems = [
        ...Object.values(SHOP_ITEMS).filter(i => i.type === 'potion'),
        ...Object.values(SHOP_ITEMS).filter(i => i.type === 'food'),
        ...Object.values(SHOP_ITEMS).filter(i => i.type === 'helmet' || i.type === 'chest' || i.type === 'pants' || i.type === 'boots' || i.type === 'shield'),
    ];

    const embed = new EmbedBuilder()
        .setTitle('đź›’ Sklep w MieĹ›cie')
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
            btn.setEmoji('âťŚ');
        }

        return btn;
    });

    const rows = [];
    for (let i = 0; i < btns.length; i += 2) {
        rows.push(new ActionRowBuilder().addComponents(btns[i], btns[i + 1]));
    }

    await interaction.reply({ embeds: [embed], components: rows });
}

// â”€â”€ SZPITAL (Heal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleCityHeal(interaction, supabase, profile) {
    const stats = calculateStats(profile);
    const healCost = 50;

    if (stats.hp >= 100) {
        return interaction.reply({
            content: 'đź©ş Twoja postaÄ‡ jest juĹĽ w peĹ‚ni wyleczona!',
            ephemeral: true,
        });
    }

    const money = profile.money || 0;

    if (money < healCost) {
        return interaction.reply({
            content: `âťŚ Nie masz wystarczajÄ…co monet! Potrzebujesz **${healCost} ${COIN}**.\n`,
            ephemeral: true,
        });
    }

    const newMoney = money - healCost;
    await supabase.from('profiles').update({ money: newMoney }).eq('id', profile.id);

    return interaction.reply({
        content: `đźŹĄ **Szpital**\n\nâś… Wyleczono! HP: ${stats.hp} â†’ 100\nđź’° Koszt: ${healCost} ${COIN}\nđź’µ PozostaĹ‚o: ${newMoney} ${COIN}`,
        ephemeral: true,
    });
}

// â”€â”€ KUĹąNIA (Forge) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleCityForge(interaction, supabase, profile) {
    const stats = calculateStats(profile);
    const money = profile.money || 0;

    const upgrades = [
        { name: 'Ulepsz broĹ„', price: 100, desc: '+5 ATK' },
        { name: 'Ulepsz heĹ‚m', price: 100, desc: '+3 DEF' },
        { name: 'Ulepsz zbrojÄ™', price: 200, desc: '+10 DEF' },
        { name: 'Ulepsz spodenie', price: 150, desc: '+7 DEF' },
        { name: 'Ulepsz buty', price: 150, desc: '+7 DEF' },
        { name: 'Ulepsz tarczÄ™', price: 150, desc: '+10 DEF' },
        { name: 'Ulepsz pierĹ›cionek', price: 100, desc: '+5 stat' },
    ];

    const embed = new EmbedBuilder()
        .setTitle('đź”¨ KuĹşnia')
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
            btn.setEmoji('âťŚ');
        }

        return btn;
    });

    const rows = [];
    for (let i = 0; i < btns.length; i += 2) {
        rows.push(new ActionRowBuilder().addComponents(btns[i], btns[i + 1]));
    }

    await interaction.reply({ embeds: [embed], components: rows });
}

// â”€â”€ FARMA (Future - Placeholder) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleCityFarm(interaction, supabase, profile) {
    return interaction.reply({
        content: 'đźŚ± **Farma** - Funkcja w Ń€Đ°Đ·Ń€Đ°Đ±ĐľŃ‚ĐşĐµ. WrĂłÄ‡ pĂłĹşniej!',
        ephemeral: true,
    });
}

// â”€â”€ OBSĹUGA MIÄSTO BUTTONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ EXPORTY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

