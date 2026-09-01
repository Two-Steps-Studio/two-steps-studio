// wedka.js – UI sprzętu wędkarskiego + helpery DB
const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

const {
    GEAR,
    ALL_GEAR_KEYS,
    getGearLevel,
    getGearStats,
    getNextUpgrade,
    emptyGearObj,
} = require('./gear.config');

const COIN = '<:CoinTSS:1486049846132605042>';

// ── Helpery DB ────────────────────────────────────────────────

async function fetchGearRow(supabase, userId) {
    const { data } = await supabase
        .from('fishing_gear')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    return data || {};
}

function rowToGearObj(row) {
    // Uzupełnia brakujące klucze zerem
    const base = emptyGearObj();
    return { ...base, ...row };
}

// ── Embed z aktualnym sprzętem gracza ────────────────────────

function buildGearEmbed(gearObj, money) {
    const stats = getGearStats(gearObj);

    const embed = new EmbedBuilder()
        .setTitle('🎣 Twój Sprzęt Wędkarski')
        .setColor('#1bbdbd')
        .setDescription(
            `Portfel: **${money.toLocaleString('pl-PL')} ${COIN}**\n` +
            `Wybierz część sprzętu z menu poniżej, żeby ją ulepszyć.\n\u200b`
        );

    for (const key of ALL_GEAR_KEYS) {
        const part    = GEAR[key];
        const lvl     = getGearLevel(gearObj, key);
        const maxLvl  = part.levels.length - 1;
        const current = part.levels[lvl];
        const next    = getNextUpgrade(gearObj, key);

        embed.addFields({
            name: `${part.emoji} ${part.name}`,
            value:
                `**${current.label}** (poz. ${lvl}/${maxLvl})\n` +
                (next
                    ? `Następny: **${next.label}** za **${next.price.toLocaleString('pl-PL')} ${COIN}**`
                    : '✅ Maksymalny poziom!'),
            inline: false,
        });
    }

    embed.addFields({
        name: '\u200b',
        value:
            `📊 **Aktywne bonusy:**\n` +
            `🪢 Wartość ryb: **+${Math.round(stats.valueBonus * 100)}%**\n` +
            `🎡 Cooldown: **-${stats.cooldownReduction}s**\n` +
            `🪝 Rzadkość: **+${Math.round(stats.rarityBonus * 100)}%**\n` +
            `🪱 Przynęta: **-${stats.baitDiscount} ${COIN}**\n` +
            `🎣 Szansa: **+${Math.round(stats.catchChance * 100)}%** | ✨ XP: **+${Math.round(stats.xpBonus * 100)}%**\n` +
            `🚤 Lokacje: **+${stats.locationSlots}** | 🧰 Sloty: **+${stats.gearSlots}**`,
    });

    return embed;
}

// ── Komponenty (select + przycisk odświeżenia) ────────────────

function buildGearComponents(gearObj, money) {
    const options = ALL_GEAR_KEYS.map(key => {
        const part = GEAR[key];
        const lvl  = getGearLevel(gearObj, key);
        const next = getNextUpgrade(gearObj, key);
        return {
            label: `${part.name} (poz. ${lvl}/${part.levels.length - 1})`,
            value: key,
            emoji: next ? (money >= next.price ? '💰' : '❌') : '✅',
        };
    });

    return [
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('gear_upgrade_select')
                .setPlaceholder('Wybierz sprzęt do ulepszenia...')
                .addOptions(options)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('gear_refresh')
                .setLabel('Odśwież')
                .setStyle(ButtonStyle.Secondary)
        ),
    ];
}

// ── /wedka – pokazuje panel sprzętu ──────────────────────────

async function handleWedka(interaction, supabase, profile) {
    const gearRow = await fetchGearRow(supabase, interaction.user.id);
    const gearObj = rowToGearObj(gearRow);
    const money   = profile?.money ?? 0;

    // index.js już wywołuje deferReply() przed tą funkcją, więc tutaj
    // używamy tylko editReply() (patrz fishing.js dla tego samego wzorca).
    await interaction.editReply({
        embeds:     [buildGearEmbed(gearObj, money)],
        components: buildGearComponents(gearObj, money),
    });
}

// ── Obsługa kliknięć (select + odśwież) ──────────────────────

async function handleGearInteraction(interaction, supabase) {
    const userId = interaction.user.id;

    const [{ data: profileRow }, gearRow] = await Promise.all([
        supabase.from('profiles').select('money').eq('id', userId).maybeSingle(),
        fetchGearRow(supabase, userId),
    ]);

    const gearObj = rowToGearObj(gearRow);
    const money   = profileRow?.money ?? 0;

    // ── Odśwież ──────────────────────────────────────────────
    if (interaction.customId === 'gear_refresh') {
        return interaction.update({
            embeds:     [buildGearEmbed(gearObj, money)],
            components: buildGearComponents(gearObj, money),
        });
    }

    // ── Kup ulepszenie ────────────────────────────────────────
    if (interaction.customId === 'gear_upgrade_select') {
        const key  = interaction.values[0];
        const next = getNextUpgrade(gearObj, key);

        if (!next) {
            return await interaction.reply({ content: '✅ Ten sprzęt jest już na maksymalnym poziomie!', ephemeral: true });
        }
        if (money < next.price) {
            const brakuje = (next.price - money).toLocaleString('pl-PL');
            return await interaction.reply({ content: `❌ Brakuje Ci **${brakuje} ${COIN}**!`, ephemeral: true });
        }

        const newLevel  = next.level;
        const newGearObj = { ...gearObj, [key]: newLevel };

        const { data: upgradeData, error: upgradeError } = await supabase.rpc('purchase_gear_upgrade', {
            p_user_id: userId,
            p_gear_key: key,
            p_price: next.price,
            p_new_level: newLevel,
        });
        if (upgradeError) {
            // GEAR_LEVEL_MISMATCH: the RPC's own guard rejected the write
            // because this gear is no longer at the level `next` was
            // computed from - most likely a second, faster upgrade click
            // already applied it. Refreshing shows the real current state.
            const msg = upgradeError.message?.includes('INSUFFICIENT_FUNDS')
                ? `❌ Brakuje Ci **${(next.price - money).toLocaleString('pl-PL')} ${COIN}**!`
                : upgradeError.message?.includes('GEAR_LEVEL_MISMATCH')
                ? '⚠️ Ten sprzęt już się zmienił - odśwież i spróbuj ponownie.'
                : '❌ Wystąpił błąd podczas ulepszania sprzętu.';
            return await interaction.reply({ content: msg, ephemeral: true });
        }
        const newMoney = upgradeData[0].money;

        return interaction.update({
            embeds:     [buildGearEmbed(newGearObj, newMoney)],
            components: buildGearComponents(newGearObj, newMoney),
        });
    }
}

module.exports = {
    handleWedka,
    handleGearInteraction,
    fetchGearRow,
    rowToGearObj,
};