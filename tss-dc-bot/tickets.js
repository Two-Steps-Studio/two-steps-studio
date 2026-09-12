// tickets.js – button-panel support ticket system
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { getSetting } = require('./settings');

// ── /ticket_panel (admin) – posts the "open a ticket" button ──
async function handleTicketPanel(interaction) {
    const embed = new EmbedBuilder()
        .setColor('#1bbdbd')
        .setTitle('🎫 Wsparcie')
        .setDescription('Kliknij przycisk poniżej, żeby otworzyć prywatne zgłoszenie do administracji.');
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open').setLabel('Otwórz zgłoszenie').setStyle(ButtonStyle.Primary).setEmoji('🎫')
    );
    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply('✅ Panel zgłoszeń utworzony na tym kanale.');
}

// ── Button: ticket_open ──────────────────────────────────────
async function handleTicketOpen(interaction, supabase) {
    await interaction.deferReply({ flags: 1 << 6 });

    const { data: existing } = await supabase
        .from('tickets')
        .select('channel_id')
        .eq('guild_id', interaction.guild.id)
        .eq('user_id', interaction.user.id)
        .eq('status', 'open')
        .maybeSingle();

    if (existing) {
        const existingChannel = interaction.guild.channels.cache.get(existing.channel_id);
        if (existingChannel) {
            return interaction.editReply(`❌ Masz już otwarte zgłoszenie: ${existingChannel}`);
        }
        // Channel is gone (deleted outside the close button) but the DB
        // row was never updated - don't let a stale row block a new ticket.
        await supabase.from('tickets').update({ status: 'closed' }).eq('channel_id', existing.channel_id);
    }

    const staffRoleId = getSetting('TICKET_STAFF_ROLE_ID');
    const overwrites = [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    ];
    if (staffRoleId) {
        overwrites.push({ id: staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
    }

    let channel;
    try {
        channel = await interaction.guild.channels.create({
            name: `zgloszenie-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90) || `zgloszenie-${interaction.user.id}`,
            type: ChannelType.GuildText,
            permissionOverwrites: overwrites,
        });
    } catch (e) {
        console.error('[TICKET] Create channel error:', e.message);
        return interaction.editReply('❌ Wystąpił błąd podczas tworzenia zgłoszenia. Sprawdź czy bot ma uprawnienie "Zarządzaj kanałami".');
    }

    const { error } = await supabase.from('tickets').insert({
        guild_id: interaction.guild.id,
        channel_id: channel.id,
        user_id: interaction.user.id,
        status: 'open',
    });
    if (error) console.error('[TICKET] DB insert error:', error.message);

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Zamknij zgłoszenie').setStyle(ButtonStyle.Danger).setEmoji('🔒')
    );
    await channel.send({
        content: `${interaction.user}${staffRoleId ? ` <@&${staffRoleId}>` : ''}`,
        embeds: [
            new EmbedBuilder()
                .setColor('#1bbdbd')
                .setTitle('🎫 Nowe zgłoszenie')
                .setDescription('Opisz swój problem - administracja wkrótce odpowie.'),
        ],
        components: [closeRow],
    });

    await interaction.editReply(`✅ Utworzono zgłoszenie: ${channel}`);
}

// ── Button: ticket_close ─────────────────────────────────────
async function handleTicketClose(interaction, supabase) {
    await interaction.reply('🔒 Zamykanie zgłoszenia za 5 sekund...');
    await supabase
        .from('tickets')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('channel_id', interaction.channel.id);

    setTimeout(() => {
        interaction.channel.delete().catch(e => console.error('[TICKET] Delete error:', e.message));
    }, 5000);
}

module.exports = { handleTicketPanel, handleTicketOpen, handleTicketClose };
