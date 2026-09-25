// tags.js – admin-defined trigger -> auto-response text
// Kept in memory (loaded once, updated on add/remove) so checking every
// message against the tag list doesn't cost a DB round-trip per message.
//
// db/tags_schema.sql defines UNIQUE(guild_id, trigger) - the same trigger
// word is meant to be independently definable per guild. The cache and
// every operation on it are now scoped by guild_id (guildId -> Map(trigger
// -> response)) - previously everything used one flat, guild-unaware Map,
// so a tag with the same trigger text in two guilds stomped each other's
// response, a tag defined in one guild auto-fired in every other guild the
// bot is in too, and /tag remove deleted that trigger's row for every
// guild, not just the caller's.
const tagCache = new Map(); // guildId -> Map(trigger -> response)

function guildCache(guildId) {
    let cache = tagCache.get(guildId);
    if (!cache) {
        cache = new Map();
        tagCache.set(guildId, cache);
    }
    return cache;
}

async function loadTags(supabase) {
    const { data, error } = await supabase.from('tags').select('guild_id, trigger, response');
    if (error) {
        console.error('[TAGS] Load error:', error.message);
        return;
    }
    tagCache.clear();
    for (const t of data || []) guildCache(t.guild_id).set(t.trigger, t.response);
}

async function handleTagAdd(interaction, supabase) {
    const trigger = interaction.options.getString('trigger').toLowerCase().trim();
    const response = interaction.options.getString('odpowiedz');
    const guildId = interaction.guild.id;

    const { error } = await supabase.from('tags').upsert({
        guild_id: guildId,
        trigger,
        response,
        created_by: interaction.user.id,
    }, { onConflict: 'guild_id,trigger' });

    if (error) {
        console.error('[TAGS] Add error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas zapisywania tagu.');
    }

    guildCache(guildId).set(trigger, response);
    await interaction.editReply(`✅ Dodano tag **${trigger}** - bot odpowie gdy ktoś napisze dokładnie to słowo.`);
}

async function handleTagRemove(interaction, supabase) {
    const trigger = interaction.options.getString('trigger').toLowerCase().trim();
    const guildId = interaction.guild.id;

    const { error } = await supabase.from('tags').delete().eq('trigger', trigger).eq('guild_id', guildId);
    if (error) {
        console.error('[TAGS] Remove error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd podczas usuwania tagu.');
    }

    guildCache(guildId).delete(trigger);
    await interaction.editReply(`✅ Usunięto tag **${trigger}**.`);
}

async function handleTagList(interaction) {
    const cache = tagCache.get(interaction.guild.id);
    if (!cache || cache.size === 0) {
        return interaction.editReply('Brak zdefiniowanych tagów. Dodaj jeden przez `/tag add`.');
    }
    const list = [...cache.keys()].map(t => `\`${t}\``).join(', ');
    await interaction.editReply(`📋 Tagi (${cache.size}): ${list}`);
}

// Called from messageCreate - exact match only (trimmed message content),
// not a substring search, so a tag word used mid-sentence doesn't
// accidentally trigger a reply.
function checkTag(message) {
    const cache = tagCache.get(message.guild?.id);
    if (!cache) return false;
    const content = message.content.trim().toLowerCase();
    const response = cache.get(content);
    if (!response) return false;
    message.reply(response).catch(() => {});
    return true;
}

module.exports = { loadTags, handleTagAdd, handleTagRemove, handleTagList, checkTag };
