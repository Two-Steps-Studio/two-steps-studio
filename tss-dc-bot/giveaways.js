// giveaways.js – /giveaway start/end, ending checked on a DB-backed
// interval (not setTimeout) so a bot restart doesn't lose track of an
// in-progress giveaway - same lesson as the AFK fishing session limitation
// flagged earlier this session, applied here from the start.
const { EmbedBuilder } = require('discord.js');

const GIVEAWAY_EMOJI = '🎉';

function buildGiveawayEmbed({ prize, winnerCount, endsAt, hostTag, ended = false }) {
    return new EmbedBuilder()
        .setColor(ended ? '#95a5a6' : '#f1c40f')
        .setTitle(`🎉 Rozdanie: ${prize}`)
        .setDescription(
            ended
                ? 'Rozdanie zakończone.'
                : `Zareaguj ${GIVEAWAY_EMOJI} żeby wziąć udział!\nZwycięzcy: **${winnerCount}**\nKoniec: <t:${Math.floor(endsAt.getTime() / 1000)}:R>`
        )
        .setFooter({ text: `Organizator: ${hostTag}` });
}

// ── /giveaway start ────────────────────────────────────────────
async function handleGiveawayStart(interaction, supabase) {
    const prize = interaction.options.getString('nagroda');
    const minutes = interaction.options.getInteger('minuty');
    const winnerCount = interaction.options.getInteger('zwyciezcy') ?? 1;
    const endsAt = new Date(Date.now() + minutes * 60000);

    const embed = buildGiveawayEmbed({ prize, winnerCount, endsAt, hostTag: interaction.user.tag });
    // editReply() already returns the Message in discord.js v14 (no
    // fetchReply option needed, unlike the older v13 reply() pattern).
    const message = await interaction.editReply({ embeds: [embed] });
    await message.react(GIVEAWAY_EMOJI).catch(() => {});

    const { error } = await supabase.from('giveaways').insert({
        guild_id: interaction.guild.id,
        channel_id: interaction.channel.id,
        message_id: message.id,
        prize,
        winner_count: winnerCount,
        ends_at: endsAt.toISOString(),
        created_by: interaction.user.id,
    });
    if (error) {
        console.error('[GIVEAWAY] Create error:', error.message);
        // The message/reaction are already live at this point - not worth
        // deleting over a logging-table failure, but flag it so it doesn't
        // silently never get picked up by the scheduler below.
        await interaction.followUp({ content: '⚠️ Rozdanie wystartowało, ale nie udało się go zapisać do bazy - nie zakończy się automatycznie.', ephemeral: true }).catch(() => {});
    }
}

// ── Start from the website's admin panel command queue (index.js's
//    processBotCommands) - no Discord interaction to reply to/reuse here,
//    so this posts straight to the channel instead of going through
//    handleGiveawayStart's interaction.editReply() flow. Kept as its own
//    function rather than refactoring that one, to not risk changing the
//    behavior of the already-working slash command. ─────────────────────
async function createGiveawayFromQueue(client, supabase, { channel_id, prize, winner_count, minutes, requested_by }) {
    const guild = client.guilds.cache.first();
    if (!guild) throw new Error('Bot nie jest na żadnym serwerze.');

    const channel = await client.channels.fetch(channel_id).catch(() => null);
    if (!channel || !channel.isTextBased?.()) {
        throw new Error(`Nie znaleziono kanału tekstowego o ID ${channel_id}.`);
    }

    const winnerCount = winner_count || 1;
    const endsAt = new Date(Date.now() + minutes * 60000);
    const hostTag = requested_by ? `<@${requested_by}>` : 'Panel admina';

    const embed = buildGiveawayEmbed({ prize, winnerCount, endsAt, hostTag });
    const message = await channel.send({ embeds: [embed] });
    await message.react(GIVEAWAY_EMOJI).catch(() => {});

    const { error } = await supabase.from('giveaways').insert({
        guild_id: guild.id,
        channel_id,
        message_id: message.id,
        prize,
        winner_count: winnerCount,
        ends_at: endsAt.toISOString(),
        created_by: requested_by || guild.ownerId,
    });
    if (error) throw new Error(`Rozdanie wystartowało, ale nie zapisało się do bazy: ${error.message}`);
}

// ── /giveaway end (manual, before the timer) ──────────────────
async function handleGiveawayEnd(interaction, supabase, client) {
    const messageId = interaction.options.getString('message_id');

    const { data: giveaway, error } = await supabase
        .from('giveaways')
        .select('*')
        .eq('message_id', messageId)
        .eq('ended', false)
        .maybeSingle();

    if (error || !giveaway) {
        return interaction.editReply('❌ Nie znaleziono aktywnego rozdania o tym ID wiadomości.');
    }

    await endGiveaway(giveaway, client, supabase);
    await interaction.editReply('✅ Rozdanie zakończone.');
}

// ── Shared ending logic (manual /giveaway end or the scheduler) ────────
async function endGiveaway(giveaway, client, supabase) {
    try {
        const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
        const message = channel ? await channel.messages.fetch(giveaway.message_id).catch(() => null) : null;

        if (channel && message) {
            const reaction = message.reactions.cache.get(GIVEAWAY_EMOJI);
            const users = reaction ? await reaction.users.fetch().catch(() => new Map()) : new Map();
            const entrants = [...users.values()].filter(u => !u.bot);

            const winners = entrants.length > 0
                ? entrants.sort(() => Math.random() - 0.5).slice(0, giveaway.winner_count)
                : [];

            const resultText = winners.length > 0
                ? `🎉 Gratulacje ${winners.map(w => `<@${w.id}>`).join(', ')}! Wygrywacie **${giveaway.prize}**!`
                : `😢 Nikt nie wziął udziału w rozdaniu **${giveaway.prize}**.`;

            await channel.send(resultText).catch(() => {});
            await message.edit({
                embeds: [buildGiveawayEmbed({ prize: giveaway.prize, winnerCount: giveaway.winner_count, endsAt: new Date(giveaway.ends_at), hostTag: '—', ended: true })],
            }).catch(() => {});
        }
    } catch (e) {
        console.error('[GIVEAWAY] End error:', e.message);
    } finally {
        await supabase.from('giveaways').update({ ended: true }).eq('id', giveaway.id);
    }
}

// ── Scheduler: call once at startup ────────────────────────────
function startGiveawayScheduler(client, supabase) {
    setInterval(async () => {
        const { data: due, error } = await supabase
            .from('giveaways')
            .select('*')
            .eq('ended', false)
            .lte('ends_at', new Date().toISOString());
        if (error) {
            console.error('[GIVEAWAY] Scheduler fetch error:', error.message);
            return;
        }
        for (const giveaway of due || []) {
            await endGiveaway(giveaway, client, supabase);
        }
    }, 30000);
}

module.exports = { handleGiveawayStart, handleGiveawayEnd, startGiveawayScheduler, createGiveawayFromQueue };
