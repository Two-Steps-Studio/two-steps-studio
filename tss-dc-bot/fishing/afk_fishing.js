// fishing/afk_fishing.js – AFK wędkowanie przy jeziorze
// Mniej opłacalne niż ręczne (~40% mniej kasy, ~30% mniej XP)

const { EmbedBuilder } = require('discord.js');
const { FISH, RARITY_STYLES, TRASH_CHANCE } = require('./fish.config');
const { getGearStats } = require('./gear.config');
const { fetchGearRow, rowToGearObj } = require('./wedka');

// ── Stałe AFK ────────────────────────────────────────────────
const AFK_VALUE_PENALTY  = 0.60;  // gracz dostaje 60% normalnej wartości ryby
const AFK_XP_PENALTY     = 0.70;  // gracz dostaje 70% normalnego XP
const AFK_INTERVAL_MS    = 60_000; // łowi co 60 sekund
const AFK_BAIT_COST      = 10;    // bazowy koszt przynęty (przed rabatem ze sprzętu)

// Opcje czasu sesji (minuty)
const SESSION_OPTIONS = [
    { label: '15 minut',   value: '15',  minutes: 15  },
    { label: '30 minut',   value: '30',  minutes: 30  },
    { label: '1 godzina',  value: '60',  minutes: 60  },
    { label: '2 godziny',  value: '120', minutes: 120 },
    { label: '4 godziny',  value: '240', minutes: 240 },
];

// Map aktywnych sesji: userId → { interval, endTime, catches[], spent, supabase, profileId }
const activeSessions = new Map();

// ── Helpers (uproszczone wersje z fishing.js) ─────────────────
function rollFishAfk(rarityBonus = 0) {
    if (Math.random() * 100 < TRASH_CHANCE) {
        const trash = Object.values(FISH).filter(f => f.rarity === 'trash');
        return trash[Math.floor(Math.random() * trash.length)];
    }
    const pool = Object.values(FISH).filter(f => f.chance > 0);
    const BOOSTED = new Set(['rare', 'epic', 'legendary']);
    const boosted = pool.map(f => ({
        ...f,
        chance: BOOSTED.has(f.rarity) ? f.chance * (1 + rarityBonus) : f.chance,
    }));
    const total = boosted.reduce((s, f) => s + f.chance, 0);
    let roll = Math.random() * total;
    for (const fish of boosted) {
        roll -= fish.chance;
        if (roll <= 0) return pool.find(f => f.name === fish.name) || fish;
    }
    return pool[pool.length - 1];
}

function rollWeight(fish) {
    const w = fish.minWeight + Math.random() * (fish.maxWeight - fish.minWeight);
    return Math.round(w * 100) / 100;
}

function calcValueAfk(fish, weight, valueBonus = 0) {
    const ratio    = (weight - fish.minWeight) / ((fish.maxWeight - fish.minWeight) || 1);
    const base     = Math.round(fish.baseValue + ratio * fish.baseValue * 0.5);
    const withGear = Math.round(base * (1 + valueBonus));
    return Math.round(withGear * AFK_VALUE_PENALTY); // kara AFK
}

function getLevelFromXP(xp) {
    if (!xp || xp < 100) return 0;
    return Math.floor(0.1 * Math.sqrt(xp));
}

// ── Pojedyncze łowienie AFK (wywoływane przez setInterval) ────
async function afkCatch(userId, supabase, gearStats) {
    const session = activeSessions.get(userId);
    if (!session) return;

    const { valueBonus, rarityBonus, baitDiscount } = gearStats;
    const baitCost = Math.max(0, AFK_BAIT_COST - baitDiscount);

    // Pobierz aktualny profil
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, money, xp, level')
        .eq('id', userId)
        .single();

    if (!profile) return;

    // Czy stać na przynętę?
    if (baitCost > 0 && (profile.money || 0) < baitCost) {
        session.stoppedReason = 'brak_kasy';
        stopSession(userId);
        return;
    }

    const fish    = rollFishAfk(rarityBonus);
    const isTrash = fish.rarity === 'trash';
    const weight  = rollWeight(fish);
    const value   = isTrash ? 0 : calcValueAfk(fish, weight, valueBonus);
    const xpGain  = isTrash ? 1 : Math.round((fish.xp || 5) * AFK_XP_PENALTY);

    const newMoney = Math.max(0, (profile.money || 0) - baitCost + value);
    const newXp    = (profile.xp || 0) + xpGain;
    const newLevel = getLevelFromXP(newXp);
    const netGain  = value - baitCost;

    await supabase.from('profiles').update({
        money:      newMoney,
        xp:         newXp,
        level:      newLevel,
        updated_at: new Date().toISOString(),
    }).eq('id', userId);

    if (!isTrash) {
        await supabase.from('fishing_catches').insert({
            user_id:   userId,
            fish_name: fish.name,
            rarity:    fish.rarity,
            weight,
            value,
        }).catch(() => {});
    }

    // Zapisz do historii sesji
    session.catches.push({ fish, weight, value, xpGain, netGain, isTrash });
    session.totalEarned += netGain;
    session.totalXp     += xpGain;
    session.totalSpent  += baitCost;
}

// ── Zatrzymanie sesji ─────────────────────────────────────────
function stopSession(userId) {
    const session = activeSessions.get(userId);
    if (!session) return;
    clearInterval(session.interval);
    clearTimeout(session.endTimeout);
    activeSessions.delete(userId);
}

// ── /afk start – start ───────────────────────────────────
async function handleAfkFishing(interaction, supabase, profile, COIN = '<:CoinTSS:1486049846132605042>') {
    const userId = interaction.user.id;

    // Sprawdź czy już ma aktywną sesję
    if (activeSessions.has(userId)) {
        return interaction.reply({
            content: '🪑 Już siedzisz przy jeziorze! Użyj `/afk stop` żeby zakończyć sesję wcześniej.',
            flags: 1 << 6,
        });
    }

    // Pobierz sprzęt
    await interaction.deferReply();
    const gearRow  = await fetchGearRow(supabase, userId);
    const gearObj  = rowToGearObj(gearRow);
    const gearStats = getGearStats(gearObj);
    const baitCost  = Math.max(0, AFK_BAIT_COST - gearStats.baitDiscount);

    // Pobierz wybrany czas z subkomendy (domyślnie 60 minut)
    const minutesRaw = interaction.options.getInteger('czas', false) ?? 60;
    const option     = SESSION_OPTIONS.find(o => o.minutes === minutesRaw) || SESSION_OPTIONS[2];
    const durationMs = option.minutes * 60 * 1000;
    const catches    = option.minutes; // ile połowów maksymalnie (1/min)

    // Sprawdź czy stać na minimum 1 połów
    if (baitCost > 0 && (profile.money || 0) < baitCost) {
        return interaction.editReply({
            content: `❌ Nie stać Cię nawet na jedną przynętę! Potrzebujesz **${baitCost} ${COIN}**.`,
        });
    }

    const endTime = Date.now() + durationMs;

    // Embed potwierdzenia
    const bonusLines = [];
    if (gearStats.valueBonus > 0)        bonusLines.push(`🪢 Wartość +${Math.round(gearStats.valueBonus * 100)}%`);
    if (gearStats.rarityBonus > 0)       bonusLines.push(`🪝 Rzadkość +${Math.round(gearStats.rarityBonus * 100)}%`);
    if (gearStats.baitDiscount > 0)      bonusLines.push(`🪱 Przynęta -${gearStats.baitDiscount}$`);

    const startEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('🪑 Siadasz przy jeziorze...')
        .setDescription(
            `Rozkładasz sprzęt i zarzucasz wędkę. Bot będzie automatycznie łowić co minutę przez **${option.label}**.\n\n` +
            `⚠️ **AFK łowienie jest mniej opłacalne** niż ręczne:\n` +
            `• Wartość ryb: **-${Math.round((1 - AFK_VALUE_PENALTY) * 100)}%**\n` +
            `• Zdobywane XP: **-${Math.round((1 - AFK_XP_PENALTY) * 100)}%**\n\n` +
            `Użyj \`/afk_stop\` żeby zakończyć wcześniej i zobaczyć podsumowanie.`
        )
        .addFields(
            { name: '⏱️ Czas sesji',        value: option.label,                      inline: true },
            { name: '🪱 Koszt przynęty',     value: `${baitCost} ${COIN}/połów`,       inline: true },
            { name: '🎣 Max połowów',        value: `~${catches}`,                     inline: true },
        );

    if (bonusLines.length) {
        startEmbed.addFields({ name: '🎁 Bonusy ze sprzętu', value: bonusLines.join('\n'), inline: false });
    }

    startEmbed.setFooter({ text: `Sesja kończy się o ${new Date(endTime).toLocaleTimeString('pl-PL')}` });

    await interaction.editReply({ embeds: [startEmbed] });

    // ── Zarejestruj sesję i uruchom timer ────────────────────
    const sessionData = {
        catches:      [],
        totalEarned:  0,
        totalXp:      0,
        totalSpent:   0,
        stoppedReason: null,
        startTime:    Date.now(),
        endTime,
        interaction,   // zapisujemy żeby wysłać followUp po zakończeniu
        COIN,
        interval:  null,
        endTimeout: null,
    };

    // Pierwsze złowienie po 60s
    sessionData.interval = setInterval(async () => {
        try {
            await afkCatch(userId, supabase, gearStats);
        } catch (e) {
            console.error('[AFK] Błąd połowu:', e.message);
        }
    }, AFK_INTERVAL_MS);

    // Automatyczne zakończenie
    sessionData.endTimeout = setTimeout(async () => {
        stopSession(userId);
        await sendAfkSummary(userId, sessionData, interaction, COIN, 'czas');
    }, durationMs);

    activeSessions.set(userId, sessionData);
}

// ── /afk stop – wcześniejsze zakończenie ─────────────────────
async function handleAfkStop(interaction, COIN = '<:CoinTSS:1486049846132605042>') {
    const userId = interaction.user.id;
    const session = activeSessions.get(userId);

    if (!session) {
        return await interaction.reply({
            content: '❌ Nie masz aktywnej sesji AFK. Użyj `/afk start` żeby zacząć.',
            flags: 1 << 6,
        });
    }

    stopSession(userId);
    await interaction.deferReply();
    await sendAfkSummary(userId, session, interaction, COIN, 'manual');
}

// ── Podsumowanie sesji ────────────────────────────────────────
async function sendAfkSummary(userId, session, interaction, COIN, reason) {
    const duration = Math.round((Date.now() - session.startTime) / 60000);
    const catches  = session.catches.filter(c => !c.isTrash);
    const trash    = session.catches.filter(c => c.isTrash);

    // Zlicz rarities
    const rarityCount = {};
    for (const c of catches) {
        rarityCount[c.fish.rarity] = (rarityCount[c.fish.rarity] || 0) + 1;
    }

    const rarityLines = Object.entries(rarityCount)
        .map(([r, n]) => `${RARITY_STYLES[r]?.emoji || '•'} ${RARITY_STYLES[r]?.label || r}: **${n}**`)
        .join('\n') || '—';

    // Top 3 połowy wg wartości
    const top3 = [...catches]
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(c => `${c.fish.emoji} ${c.fish.name} – ${c.weight}kg – ${c.value} ${COIN}`)
        .join('\n') || '—';

    const reasonText = {
        czas:      '⏰ Sesja dobiegła końca',
        manual:    '🛑 Sesja zakończona ręcznie',
        brak_kasy: '💸 Skończyły się pieniądze na przynętę',
    }[reason] || 'Koniec sesji';

    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`🎣 Podsumowanie AFK – ${reasonText}`)
        .addFields(
            { name: '⏱️ Czas przy jeziorze',  value: `${duration} min`,                                    inline: true },
            { name: '🐟 Złapanych ryb',        value: `${catches.length}`,                                  inline: true },
            { name: '🗑️ Śmieci',              value: `${trash.length}`,                                    inline: true },
            { name: '💰 Zarobiono netto',      value: `${session.totalEarned >= 0 ? '+' : ''}${session.totalEarned} ${COIN}`, inline: true },
            { name: '✨ XP zdobyte',           value: `+${session.totalXp} XP`,                             inline: true },
            { name: '🪱 Wydano na przynęty',   value: `${session.totalSpent} ${COIN}`,                      inline: true },
            { name: '📊 Rzadkości',            value: rarityLines,                                          inline: false },
            { name: '🏆 Najlepsze połowy',     value: top3,                                                 inline: false },
        )
        .setFooter({ text: `AFK łowienie daje ~${Math.round(AFK_VALUE_PENALTY * 100)}% wartości i ~${Math.round(AFK_XP_PENALTY * 100)}% XP relative do ręcznego łowienia` });

    if (session.stoppedReason === 'brak_kasy') {
        embed.setDescription('💸 Sesja została przerwana – skończyły Ci się pieniądze na przynętę!');
    }

    try {
        // Jeśli to automatyczne zakończenie, wyślij jako followUp do oryginalnej interakcji
        if (reason === 'czas') {
            await session.interaction.followUp({ embeds: [embed] });
        } else {
            await interaction.editReply({ embeds: [embed] });
        }
    } catch (e) {
        console.error('[AFK] Błąd wysyłania podsumowania:', e.message);
    }
}

module.exports = { handleAfkFishing, handleAfkStop, activeSessions };
