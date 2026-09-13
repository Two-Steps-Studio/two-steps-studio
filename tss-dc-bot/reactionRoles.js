// reactionRoles.js – react on a message to self-assign a role
const { EmbedBuilder } = require('discord.js');

// Custom emoji come back as <:name:id> (static) or <a:name:id> (animated) -
// dropping the `a:` here for animated ones meant this key never matched what
// /reactionrole add stored (it saves the admin's pasted code verbatim,
// `a:` included for animated emoji), so animated-emoji reaction roles
// silently never granted anything.
function emojiKey(emoji) {
    return emoji.id ? `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>` : emoji.name;
}

// ── /reactionrole add ─────────────────────────────────────────
async function handleReactionRoleAdd(interaction, supabase) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('rola');

    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
        return interaction.editReply('❌ Nie znaleziono wiadomości o tym ID na tym kanale.');
    }

    try {
        await message.react(emoji);
    } catch (e) {
        return interaction.editReply(`❌ Nie mogę zareagować tym emoji (${e.message}). Dla emoji z innego serwera wklej pełny kod (np. \`<:nazwa:id>\` — uzyskasz go wpisując \`\\:nazwa:\` na czacie).`);
    }

    const { error } = await supabase.from('reaction_roles').upsert({
        guild_id: interaction.guild.id,
        message_id: messageId,
        emoji,
        role_id: role.id,
    }, { onConflict: 'message_id,emoji' });

    if (error) {
        console.error('[REACTION ROLE] add error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas zapisywania powiązania.');
    }

    await interaction.editReply(`✅ Reakcja ${emoji} na [tej wiadomości](${message.url}) będzie teraz nadawać rolę **${role.name}**.`);
}

// ── /reactionrole remove ──────────────────────────────────────
async function handleReactionRoleRemove(interaction, supabase) {
    const messageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');

    const { error } = await supabase
        .from('reaction_roles')
        .delete()
        .eq('message_id', messageId)
        .eq('emoji', emoji);

    if (error) {
        console.error('[REACTION ROLE] remove error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas usuwania powiązania.');
    }

    await interaction.editReply(`✅ Usunięto powiązanie ${emoji} → rola dla tej wiadomości.`);
}

// ── Listeners ──────────────────────────────────────────────────
async function handleReactionAdd(reaction, user, supabase) {
    if (user.bot) return;
    try {
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();
    } catch {
        return;
    }
    if (!reaction.message.guild) return;

    const { data } = await supabase
        .from('reaction_roles')
        .select('role_id')
        .eq('message_id', reaction.message.id)
        .eq('emoji', emojiKey(reaction.emoji))
        .maybeSingle();
    if (!data) return;

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    await member.roles.add(data.role_id).catch(e => console.error('[REACTION ROLE] grant error:', e.message));
}

async function handleReactionRemove(reaction, user, supabase) {
    if (user.bot) return;
    try {
        if (reaction.partial) await reaction.fetch();
        if (reaction.message.partial) await reaction.message.fetch();
    } catch {
        return;
    }
    if (!reaction.message.guild) return;

    const { data } = await supabase
        .from('reaction_roles')
        .select('role_id')
        .eq('message_id', reaction.message.id)
        .eq('emoji', emojiKey(reaction.emoji))
        .maybeSingle();
    if (!data) return;

    const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
    if (!member) return;
    await member.roles.remove(data.role_id).catch(e => console.error('[REACTION ROLE] revoke error:', e.message));
}

module.exports = { handleReactionRoleAdd, handleReactionRoleRemove, handleReactionAdd, handleReactionRemove };
