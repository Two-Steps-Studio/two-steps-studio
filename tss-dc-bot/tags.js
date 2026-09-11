// tags.js – admin-defined trigger -> auto-response text
// Kept in memory (loaded once, updated on add/remove) so checking every
// message against the tag list doesn't cost a DB round-trip per message.
const tagCache = new Map(); // trigger (lowercase, trimmed) -> response

async function loadTags(supabase) {
    const { data, error } = await supabase.from('tags').select('trigger, response');
    if (error) {
        console.error('[TAGS] Load error:', error.message);
        return;
    }
    tagCache.clear();
    for (const t of data || []) tagCache.set(t.trigger, t.response);
}

async function handleTagAdd(interaction, supabase) {
    const trigger = interaction.options.getString('trigger').toLowerCase().trim();
    const response = interaction.options.getString('odpowiedz');

    const { error } = await supabase.from('tags').upsert({
        guild_id: interaction.guild.id,
        trigger,
        response,
        created_by: interaction.user.id,
    }, { onConflict: 'guild_id,trigger' });

    if (error) {
        console.error('[TAGS] Add error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas zapisywania tagu.');
    }

    tagCache.set(trigger, response);
    await interaction.editReply(`✅ Dodano tag **${trigger}** - bot odpowie gdy ktoś napisze dokładnie to słowo.`);
}

async function handleTagRemove(interaction, supabase) {
    const trigger = interaction.options.getString('trigger').toLowerCase().trim();

    const { error } = await supabase.from('tags').delete().eq('trigger', trigger);
    if (error) {
        console.error('[TAGS] Remove error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas usuwania tagu.');
    }

    tagCache.delete(trigger);
    await interaction.editReply(`✅ Usunięto tag **${trigger}**.`);
}

async function handleTagList(interaction) {
    if (tagCache.size === 0) {
        return interaction.editReply('Brak zdefiniowanych tagów. Dodaj jeden przez `/tag add`.');
    }
    const list = [...tagCache.keys()].map(t => `\`${t}\``).join(', ');
    await interaction.editReply(`📋 Tagi (${tagCache.size}): ${list}`);
}

// Called from messageCreate - exact match only (trimmed message content),
// not a substring search, so a tag word used mid-sentence doesn't
// accidentally trigger a reply.
function checkTag(message) {
    const content = message.content.trim().toLowerCase();
    const response = tagCache.get(content);
    if (!response) return false;
    message.reply(response).catch(() => {});
    return true;
}

module.exports = { loadTags, handleTagAdd, handleTagRemove, handleTagList, checkTag };
