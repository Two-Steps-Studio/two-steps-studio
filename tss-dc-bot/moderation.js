// moderation.js – kick/ban/timeout/warn + mod-log helper
const { EmbedBuilder } = require('discord.js');
const { getSetting } = require('./settings');

// ── Mod-log: posts to MOD_LOG_CHANNEL_ID if set, otherwise falls back to
//    a channel matched by name (same convention as the welcome channel in
//    index.js) ───────────────────────────────────────────────────────────
async function sendModLog(guild, embed) {
    try {
        const channelId = getSetting('MOD_LOG_CHANNEL_ID');
        const ch = channelId
            ? guild.channels.cache.get(channelId)
            : guild.channels.cache.find(c =>
                c.isTextBased?.() && (c.name.includes('mod-log') || c.name.includes('modlog') || c.name.includes('logi'))
            );
        if (ch?.isTextBased?.()) {
            await ch.send({ embeds: [embed] });
        }
    } catch (e) {
        console.error('[MODLOG] Błąd wysyłania logu:', e.message);
    }
}

// ── /kick ──────────────────────────────────────────────────────────────
async function handleKick(interaction) {
    const target = interaction.options.getUser('uzytkownik');
    const reason = interaction.options.getString('powod') || 'Brak podanego powodu';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
        return interaction.editReply('❌ Nie znaleziono tego użytkownika na serwerze.');
    }
    if (!member.kickable) {
        return interaction.editReply('❌ Nie mogę wyrzucić tego użytkownika (zbyt wysoka ranga lub brak uprawnień bota).');
    }

    try {
        await member.kick(reason);
    } catch (e) {
        console.error('[MOD] Kick error:', e.message);
        return interaction.editReply('❌ Wystąpił błąd podczas wyrzucania użytkownika.');
    }

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('👢 Użytkownik wyrzucony')
        .addFields(
            { name: 'Użytkownik', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Powód', value: reason, inline: false },
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
}

// ── /ban ───────────────────────────────────────────────────────────────
async function handleBan(interaction) {
    const target = interaction.options.getUser('uzytkownik');
    const reason = interaction.options.getString('powod') || 'Brak podanego powodu';
    const deleteDays = Math.min(Math.max(interaction.options.getInteger('usun_wiadomosci_dni') ?? 0, 0), 7);

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (member && !member.bannable) {
        return interaction.editReply('❌ Nie mogę zbanować tego użytkownika (zbyt wysoka ranga lub brak uprawnień bota).');
    }

    try {
        await interaction.guild.members.ban(target.id, { reason, deleteMessageSeconds: deleteDays * 86400 });
    } catch (e) {
        console.error('[MOD] Ban error:', e.message);
        return interaction.editReply('❌ Wystąpił błąd podczas banowania użytkownika.');
    }

    const embed = new EmbedBuilder()
        .setColor('#992d22')
        .setTitle('🔨 Użytkownik zbanowany')
        .addFields(
            { name: 'Użytkownik', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Powód', value: reason, inline: false },
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
}

// ── /timeout ───────────────────────────────────────────────────────────
async function handleTimeout(interaction) {
    const target = interaction.options.getUser('uzytkownik');
    const minutes = interaction.options.getInteger('minuty');
    const reason = interaction.options.getString('powod') || 'Brak podanego powodu';

    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    if (!member) {
        return interaction.editReply('❌ Nie znaleziono tego użytkownika na serwerze.');
    }
    if (!member.moderatable) {
        return interaction.editReply('❌ Nie mogę wyciszyć tego użytkownika (zbyt wysoka ranga lub brak uprawnień bota).');
    }

    try {
        await member.timeout(minutes * 60000, reason);
    } catch (e) {
        console.error('[MOD] Timeout error:', e.message);
        return interaction.editReply('❌ Wystąpił błąd podczas wyciszania użytkownika.');
    }

    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🔇 Użytkownik wyciszony')
        .addFields(
            { name: 'Użytkownik', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Czas', value: `${minutes} min`, inline: true },
            { name: 'Powód', value: reason, inline: false },
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);
}

// ── /warn ──────────────────────────────────────────────────────────────
async function handleWarn(interaction, supabase) {
    const target = interaction.options.getUser('uzytkownik');
    const reason = interaction.options.getString('powod');

    const { error } = await supabase.from('mod_warnings').insert({
        user_id: target.id,
        moderator_id: interaction.user.id,
        reason,
    });
    if (error) {
        console.error('[MOD] Warn insert error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas zapisywania ostrzeżenia.');
    }

    const { count } = await supabase
        .from('mod_warnings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', target.id);

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('⚠️ Ostrzeżenie')
        .addFields(
            { name: 'Użytkownik', value: `${target.tag} (${target.id})`, inline: true },
            { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
            { name: 'Łącznie ostrzeżeń', value: `${count ?? '?'}`, inline: true },
            { name: 'Powód', value: reason, inline: false },
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    await sendModLog(interaction.guild, embed);

    // Best-effort DM - many users have DMs closed to non-friends, that's
    // not an error worth surfacing to the moderator.
    try {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        await member?.send(`⚠️ Otrzymałeś ostrzeżenie na **${interaction.guild.name}**.\nPowód: ${reason}`);
    } catch { /* DMs closed, ignore */ }
}

// ── /warnings ──────────────────────────────────────────────────────────
async function handleWarnings(interaction, supabase) {
    const target = interaction.options.getUser('uzytkownik') || interaction.user;

    const { data, error } = await supabase
        .from('mod_warnings')
        .select('*')
        .eq('user_id', target.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('[MOD] Warnings fetch error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas pobierania ostrzeżeń.');
    }

    if (!data || data.length === 0) {
        return interaction.editReply(`✅ **${target.tag}** nie ma żadnych ostrzeżeń.`);
    }

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle(`⚠️ Ostrzeżenia: ${target.tag}`)
        .setDescription(
            data.map((w, i) =>
                `**${i + 1}.** ${w.reason}\n*Przez <@${w.moderator_id}> • ${new Date(w.created_at).toLocaleDateString('pl-PL')}*`
            ).join('\n\n')
        );

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { sendModLog, handleKick, handleBan, handleTimeout, handleWarn, handleWarnings };
