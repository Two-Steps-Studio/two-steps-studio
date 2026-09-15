// utility.js – /serverinfo, /userinfo, /lock, /unlock, /slowmode
const { EmbedBuilder } = require('discord.js');

async function handleServerInfo(interaction, supabase) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    // Same "Członkowie" total the website shows (Discord members + site
    // accounts, see tss-website's get_unified_stats()) - not Discord alone.
    let totalMembers = guild.memberCount;
    if (supabase) {
        const { count: siteAccounts } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        totalMembers = guild.memberCount + (siteAccounts || 0);
    }

    const embed = new EmbedBuilder()
        .setColor('#1bbdbd')
        .setTitle(`📊 ${guild.name}`)
        .setThumbnail(guild.iconURL())
        .addFields(
            { name: '👥 Członkowie', value: `${totalMembers}`, inline: true },
            { name: '📁 Kanały', value: `${guild.channels.cache.size}`, inline: true },
            { name: '🎭 Role', value: `${guild.roles.cache.size}`, inline: true },
            { name: '👑 Właściciel', value: owner ? `${owner.user.tag}` : 'Nieznany', inline: true },
            { name: '📅 Utworzony', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
            { name: '🚀 Boost', value: `Poziom ${guild.premiumTier} (${guild.premiumSubscriptionCount || 0})`, inline: true },
        )
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleUserInfo(interaction) {
    const target = interaction.options.getUser('uzytkownik') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const embed = new EmbedBuilder()
        .setColor('#1bbdbd')
        .setTitle(`👤 ${target.tag}`)
        .setThumbnail(target.displayAvatarURL())
        .addFields(
            { name: '🆔 ID', value: target.id, inline: true },
            { name: '📅 Konto założone', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`, inline: true },
        );

    if (member) {
        const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.toString());
        embed.addFields(
            { name: '📥 Dołączył na serwer', value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : 'Nieznane', inline: true },
            { name: '🎭 Role', value: roles.length ? roles.join(', ') : 'Brak', inline: false },
        );
    } else {
        embed.setFooter({ text: 'Użytkownik nie jest już członkiem tego serwera' });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleLock(interaction) {
    try {
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
    } catch (e) {
        console.error('[LOCK] Błąd:', e.message);
        return interaction.editReply('❌ Nie udało się zablokować kanału (sprawdź uprawnienia bota).');
    }
    await interaction.editReply('🔒 Kanał zablokowany - @everyone nie może teraz pisać.');
}

async function handleUnlock(interaction) {
    try {
        // null resets the overwrite for SendMessages back to "inherit",
        // rather than explicitly allowing it - respects any other role's
        // own explicit deny.
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
    } catch (e) {
        console.error('[UNLOCK] Błąd:', e.message);
        return interaction.editReply('❌ Nie udało się odblokować kanału (sprawdź uprawnienia bota).');
    }
    await interaction.editReply('🔓 Kanał odblokowany.');
}

async function handleSlowmode(interaction) {
    const seconds = interaction.options.getInteger('sekundy');
    try {
        await interaction.channel.setRateLimitPerUser(seconds);
    } catch (e) {
        console.error('[SLOWMODE] Błąd:', e.message);
        return interaction.editReply('❌ Nie udało się ustawić spowolnienia.');
    }
    await interaction.editReply(seconds > 0 ? `🐌 Ustawiono spowolnienie: **${seconds}s**.` : '✅ Wyłączono spowolnienie na tym kanale.');
}

module.exports = { handleServerInfo, handleUserInfo, handleLock, handleUnlock, handleSlowmode };
