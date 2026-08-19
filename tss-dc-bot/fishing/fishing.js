// fishing/fishing.js – logika łowienia zintegrowana z Supabase
const { EmbedBuilder } = require('discord.js');
const { FISH, RARITY_STYLES, FISHING_COOLDOWN, TRASH_CHANCE } = require('./fish.config');
const { getGearStats } = require('./gear.config');
const { fetchGearRow, rowToGearObj } = require('./wedka');

const cooldowns = new Map();

// ── Losowanie ryby z uwzględnieniem bonusu rzadkości ─────────

function rollFish(rarityBonus = 0) {
    if (Math.random() * 100 < TRASH_CHANCE) {
        const trash = Object.values(FISH).filter(f => f.rarity === 'trash');
        return trash[Math.floor(Math.random() * trash.length)];
    }

    const pool = Object.values(FISH).filter(f => f.chance > 0);

    const BOOSTED_RARITIES = new Set(['rare', 'epic', 'legendary']);
    const boostedPool = pool.map(fish => ({
        ...fish,
        chance: BOOSTED_RARITIES.has(fish.rarity)
            ? fish.chance * (1 + rarityBonus)
            : fish.chance,
    }));

    const total = boostedPool.reduce((s, f) => s + f.chance, 0);
    let roll = Math.random() * total;

    for (const fish of boostedPool) {
        roll -= fish.chance;
        if (roll <= 0) return pool.find(f => f.name === fish.name) || fish;
    }
    return pool[pool.length - 1];
}

function rollWeight(fish) {
    const w = fish.minWeight + Math.random() * (fish.maxWeight - fish.minWeight);
    return Math.round(w * 100) / 100;
}

function calcValue(fish, weight, valueBonus = 0) {
    const ratio    = (weight - fish.minWeight) / ((fish.maxWeight - fish.minWeight) || 1);
    const baseCalc = Math.round(fish.baseValue + ratio * fish.baseValue * 0.5);
    return Math.round(baseCalc * (1 + valueBonus));
}

// ── XP z bonusem zanęty ───────────────────────────────────────

function calcXp(fish, xpBonus = 0) {
    return Math.round(fish.xp * (1 + xpBonus));
}

function getLevelFromXP(xp) {
    if (xp < 100) return 0;
    return Math.floor(0.1 * Math.sqrt(xp));
}

// ── /lowienie ────────────────────────────────────────────────

async function handleFishing(interaction, supabase, profile, COIN = '<:CoinTSS:1486049846132605042>') {
    const userId = interaction.user.id;

    // 1. Cooldown z pamięci – przed defer, żeby nie blokować
    if (cooldowns.has(userId)) {
        const remaining = Math.ceil((cooldowns.get(userId) - Date.now()) / 1000);
        if (remaining > 0) {
            return interaction.reply({
                content: `⏳ Poczekaj jeszcze **${remaining}s** zanim znowu zarzucisz wędkę!`,
                flags: 1 << 6,
            });
        }
    }

    // 2. Defer – wszystkie operacje DB mogą teraz trwać ile chcą
    await interaction.deferReply();

    // 3. Pobierz sprzęt z Supabase
    const gearRow = await fetchGearRow(supabase, userId);
    const gearObj = rowToGearObj(gearRow);
    const { valueBonus, cooldownReduction, rarityBonus, baitDiscount, xpBonus } = getGearStats(gearObj);

    const effectiveCooldown = Math.max(5, FISHING_COOLDOWN - cooldownReduction);
    const BAIT_COST         = Math.max(0, 10 - baitDiscount);

    // 4. Sprawdź gotówkę
    if ((profile.money || 0) < BAIT_COST && BAIT_COST > 0) {
        return interaction.editReply({
            content: `❌ Nie stać Cię na przynętę! Potrzebujesz **${BAIT_COST} ${COIN}**.`,
        });
    }

    // 5. Ustaw cooldown i pokaż animację
    cooldowns.set(userId, Date.now() + effectiveCooldown * 1000);
    setTimeout(() => cooldowns.delete(userId), effectiveCooldown * 1000);

    await interaction.editReply({ content: '🎣 Zarzucasz wędkę...' });
    await new Promise(r => setTimeout(r, 2000));

    // 6. Losuj i oblicz
    const fish    = rollFish(rarityBonus);
    const weight  = rollWeight(fish);
    const value   = calcValue(fish, weight, valueBonus);
    const xpGain  = calcXp(fish, fish.rarity === 'trash' ? 0 : xpBonus); // śmieci bez bonusu XP
    const style   = RARITY_STYLES[fish.rarity];
    const isTrash = fish.rarity === 'trash';

    const newLevel = getLevelFromXP((profile.xp || 0) + xpGain);

    // 7. Zapisz do DB
    const { data: fishRewardData } = await supabase.rpc('apply_xp_money_reward', {
        p_user_id: profile.id,
        p_xp_delta: xpGain,
        p_money_delta: value - BAIT_COST,
        p_new_level: newLevel,
    });
    const newMoney = fishRewardData?.[0]?.money ?? Math.max(0, (profile.money || 0) - BAIT_COST + value);

    if (!isTrash) {
        try {
            await supabase.from('fishing_catches').insert({
                user_id:   userId,
                fish_name: fish.name,
                rarity:    fish.rarity,
                weight,
                value,
            });
        } catch (_) {}
    }

    // 8. Embed z wynikiem
    const netGain = value - BAIT_COST;

    const embed = new EmbedBuilder()
        .setColor(style.color)
        .setTitle(isTrash
            ? `${fish.emoji} Wyciągnąłeś... śmieci`
            : `${fish.emoji} Złapałeś ${fish.name}!`)
        .addFields(
            { name: '📦 Rzadkość', value: `${style.emoji} ${style.label}`, inline: true },
            { name: '⚖️ Waga',     value: `${weight} kg`,                  inline: true },
            {
                name:  '💰 Zysk',
                value: isTrash
                    ? `Strata przynęty (-${BAIT_COST} ${COIN})`
                    : `${netGain >= 0 ? '+' : ''}${netGain} ${COIN}`,
                inline: true,
            },
        );

    if (!isTrash) {
        embed.addFields(
            { name: '✨ XP',      value: `+${xpGain} XP`,     inline: true },
            { name: '💵 Gotówka', value: `${newMoney} ${COIN}`, inline: true },
        );
    }

    // Aktywne bonusy w footerze
    const bonusLines = [];
    if (valueBonus > 0)        bonusLines.push(`🪢 Wartość +${Math.round(valueBonus * 100)}%`);
    if (cooldownReduction > 0) bonusLines.push(`🎡 Cooldown -${cooldownReduction}s`);
    if (rarityBonus > 0)       bonusLines.push(`🪝 Rzadkość +${Math.round(rarityBonus * 100)}%`);
    if (baitDiscount > 0)      bonusLines.push(`🪱 Przynęta -${baitDiscount}$`);
    if (xpBonus > 0)           bonusLines.push(`🫙 XP +${Math.round(xpBonus * 100)}%`);

    embed.setFooter({
        text: `Cooldown: ${effectiveCooldown}s | Przynęta: ${BAIT_COST}$` +
            (bonusLines.length ? ` | ${bonusLines.join(' · ')}` : ''),
    });

    await interaction.editReply({ content: null, embeds: [embed] });
}

// ── /ryby ────────────────────────────────────────────────────

async function handleFishInventory(interaction, supabase, COIN = '<:CoinTSS:1486049846132605042>') {
    const userId = interaction.user.id;

    const { data: catches } = await supabase
        .from('fishing_catches')
        .select('*')
        .eq('user_id', userId)
        .order('caught_at', { ascending: false })
        .limit(10);

    if (!catches || catches.length === 0) {
        return interaction.reply({
            content: '🎣 Nie masz jeszcze żadnych ryb! Użyj `/lowienie` żeby zacząć.',
            flags: 1 << 6,
        });
    }

    const list = catches.map(c => {
        const s = RARITY_STYLES[c.rarity] || RARITY_STYLES.common;
        return `${s.emoji} **${c.fish_name}** – ${c.weight}kg – ${c.value} ${COIN}`;
    }).join('\n');

    const { data: stats } = await supabase
        .from('fishing_catches')
        .select('value, weight, fish_name')
        .eq('user_id', userId);

    const totalCaught = stats?.length || 0;
    const totalEarned = stats?.reduce((s, c) => s + (c.value || 0), 0) || 0;
    const biggest     = stats?.reduce((max, c) => c.weight > (max?.weight || 0) ? c : max, null);

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`🎣 Ostatnie połowy – ${interaction.user.username}`)
        .setDescription(list)
        .addFields(
            { name: '🐟 Złapano',           value: `${totalCaught}`,                                              inline: true },
            { name: '💰 Zarobiono łącznie', value: `${totalEarned} ${COIN}`,                                      inline: true },
            { name: '🏆 Rekord',            value: biggest ? `${biggest.fish_name} (${biggest.weight}kg)` : '—',  inline: true },
        );

    return interaction.reply({ embeds: [embed] });
}

// ── /fishtop ─────────────────────────────────────────────────

async function handleFishTop(interaction, supabase, COIN = '<:CoinTSS:1486049846132605042>') {
    const { data: rows } = await supabase
        .from('fishing_catches')
        .select('user_id, value');

    if (!rows || rows.length === 0) {
        return interaction.reply({ content: 'Brak danych.', flags: 1 << 6 });
    }

    const grouped = {};
    for (const row of rows) {
        if (!grouped[row.user_id]) grouped[row.user_id] = { total: 0, count: 0 };
        grouped[row.user_id].total += row.value || 0;
        grouped[row.user_id].count += 1;
    }

    const list = Object.entries(grouped)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10)
        .map(([uid, d], i) => `**${i + 1}.** <@${uid}> – ${d.count} ryb, ${d.total} ${COIN}`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏆 Top Wędkarze')
        .setDescription(list);

    return interaction.reply({ embeds: [embed] });
}

module.exports = { handleFishing, handleFishInventory, handleFishTop };