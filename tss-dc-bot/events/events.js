// events/events.js – obsługa eventów e-sportowych
const { EmbedBuilder } = require('discord.js');

const ADMIN_ROLE = 'Admin'; // zmień na nazwę swojej roli admina

// Discord embedy odrzucają pole (addFields value) dłuższe niż 1024 znaki i
// nazwę pola dłuższą niż 256 - event.description i event.name nie miały
// żadnego limitu (ani przy tworzeniu, ani w bazie), więc wystarczająco
// długi tekst rzucał RangeError przy budowaniu embeda. Najgorszy przypadek:
// /event_list iteruje po WSZYSTKICH eventach, więc jeden taki rekord psuł
// tę komendę dla całego serwera. Obcinamy przy renderze, żeby ochronić też
// rekordy sprzed tej poprawki.
function truncateText(text, maxLen = 900) {
    if (!text) return text;
    return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

// ── Kolejka per-event dla /event_join ───────────────────────────
// Bez tego dwóch graczy mogło jednocześnie przejść sprawdzenie limitu
// miejsc (odczyt aktualnej liczby uczestników) i oba trafić do insertu,
// przekraczając max_participants - klasyczny check-then-act race. To ten
// sam typ zabezpieczenia co synchroniczna rezerwacja w fishing.js
// (cooldowns) i afk_fishing.js (activeSessions), tylko że tu kolejkujemy
// zamiast rezerwować z góry, bo limit zależy od aktualnego COUNT w bazie,
// a nie jednego sprawdzenia per-user.
const eventJoinQueues = new Map();

function queueEventJoin(eventId, task) {
    const prev = eventJoinQueues.get(eventId) || Promise.resolve();
    const next = prev.then(task, task);
    eventJoinQueues.set(eventId, next.catch(() => {}));
    return next;
}

// ── /event_create ─────────────────────────────────────────────

async function handleEventCreate(interaction, supabase) {
    // index.js już wywołuje deferReply() przed tą funkcją dla każdej komendy,
    // więc tutaj używamy tylko editReply() - patrz fishing.js.
    const isAdmin = interaction.member?.roles.cache.some(r => r.name === ADMIN_ROLE);
    if (!isAdmin) {
        return interaction.editReply({
            content: '❌ Nie masz uprawnień do tworzenia eventów!',
        });
    }

    const name            = interaction.options.getString('nazwa');
    const description     = interaction.options.getString('opis') || null;
    const dateStr         = interaction.options.getString('data');
    const maxParticipants = interaction.options.getInteger('max_uczestnikow') || null;

    const parts = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
    if (!parts) {
        return interaction.editReply({
            content: '❌ Zły format daty! Użyj: `DD.MM.YYYY HH:MM` np. `25.12.2025 18:00`',
        });
    }

    const [, day, month, year, hour, minute] = parts;
    const eventDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);

    if (isNaN(eventDate.getTime()) || eventDate < new Date()) {
        return interaction.editReply({
            content: '❌ Podana data jest nieprawidłowa lub jest w przeszłości!',
        });
    }

    const { data, error } = await supabase.from('e_sport_events').insert({
        name,
        description,
        event_date:       eventDate.toISOString(),
        max_participants: maxParticipants,
    }).select().single();

    if (error) {
        console.error('[EVENT] Create error:', error.message);
        return interaction.editReply('❌ Błąd podczas tworzenia eventu. Spróbuj ponownie.');
    }

    const embed = new EmbedBuilder()
        .setColor(0x1bbdbd)
        .setTitle('✅ Event utworzony!')
        .addFields(
            { name: '🏷️ Nazwa',     value: truncateText(data.name),                                     inline: false },
            { name: '📅 Data',      value: eventDate.toLocaleString('pl-PL'),                           inline: true  },
            { name: '👥 Limit',     value: maxParticipants ? `${maxParticipants} osób` : 'Brak limitu', inline: true  },
            { name: '🆔 ID eventu', value: `#${data.id}`,                                               inline: true  },
        );

    if (description) embed.addFields({ name: '📝 Opis', value: truncateText(description), inline: false });
    embed.setFooter({ text: 'Użyj /event_list żeby zobaczyć wszystkie eventy' });

    await interaction.editReply({ embeds: [embed] });
}

// ── /event_list ───────────────────────────────────────────────

async function handleEventList(interaction, supabase) {
    const { data: events, error } = await supabase
        .from('e_sport_events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(10);

    if (error) {
        console.error('[EVENT] List error:', error.message);
        return interaction.editReply('❌ Błąd podczas pobierania eventów.');
    }

    if (!events || events.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x888888)
                    .setTitle('📅 Nadchodzące eventy')
                    .setDescription('Brak zaplanowanych eventów. Użyj `/event_create` żeby dodać nowy!'),
            ],
        });
    }

    // Pobierz uczestników dla wszystkich eventów naraz
    const eventIds = events.map(e => e.id);
    const { data: allParticipants } = await supabase
        .from('event_participants')
        .select('event_id, user_id, username')
        .in('event_id', eventIds);

    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('📅 Nadchodzące eventy e-sportowe')
        .setDescription(`Znaleziono **${events.length}** event${events.length === 1 ? '' : 'ów'}:`);

    for (const event of events) {
        const date         = new Date(event.event_date);
        const participants = allParticipants?.filter(p => p.event_id === event.id) || [];
        const count        = participants.length;
        const limit        = event.max_participants ? `${count}/${event.max_participants}` : `${count}`;
        const desc         = event.description ? `\n📝 ${truncateText(event.description, 500)}` : '';

        // Lista uczestników (max 5 w podglądzie)
        let participantsList = '';
        if (count > 0) {
            const preview = participants.slice(0, 5).map(p => `<@${p.user_id}>`).join(', ');
            participantsList = `\n👤 ${preview}${count > 5 ? ` i ${count - 5} innych...` : ''}`;
        } else {
            participantsList = '\n👤 Brak zapisanych uczestników';
        }

        embed.addFields({
            // Pole "name" (nie value!) ma twardy limit 256 znaków w Discordzie
            // - ciaśniejszy niż standardowe 1024 dla value, stąd osobny,
            // mniejszy maxLen tutaj.
            name:   `#${event.id} – ${truncateText(event.name, 200)}`,
            value:  `📅 ${date.toLocaleString('pl-PL')} | 👥 Zapisani: **${limit}**${desc}${participantsList}`,
            inline: false,
        });
    }

    embed.setFooter({ text: 'Użyj /event_join <id> żeby się zapisać • /event_delete <id> żeby usunąć event' });

    await interaction.editReply({ embeds: [embed] });
}

// ── /event_join ───────────────────────────────────────────────

async function handleEventJoin(interaction, supabase) {
    const eventId = interaction.options.getInteger('id');

    // Pobierz event
    const { data: event, error: eventError } = await supabase
        .from('e_sport_events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (eventError || !event) {
        return interaction.editReply(`❌ Nie znaleziono eventu o ID **#${eventId}**. Użyj \`/event_list\` żeby sprawdzić dostępne eventy.`);
    }

    const eventDate = new Date(event.event_date);
    if (eventDate < new Date()) {
        return interaction.editReply('❌ Ten event już się odbył!');
    }

    // Sprawdzenie limitu i zapis uczestnika muszą przejść jako jedna
    // sekwencja per event - patrz komentarz przy queueEventJoin.
    return queueEventJoin(eventId, async () => {
        // Pobierz aktualnych uczestników
        const { data: participants } = await supabase
            .from('event_participants')
            .select('user_id, username')
            .eq('event_id', eventId);

        const count = participants?.length || 0;

        // Sprawdź czy już zapisany
        const alreadyJoined = participants?.some(p => p.user_id === interaction.user.id);
        if (alreadyJoined) {
            return interaction.editReply(`✅ Już jesteś zapisany na event **${truncateText(event.name)}**!`);
        }

        // Sprawdź limit
        if (event.max_participants && count >= event.max_participants) {
            return interaction.editReply(`❌ Event **${truncateText(event.name)}** jest już pełny! (${count}/${event.max_participants} uczestników)`);
        }

        // Zapisz uczestnika
        const { error: joinError } = await supabase
            .from('event_participants')
            .insert({
                event_id: eventId,
                user_id:  interaction.user.id,
                username: interaction.user.username,
            });

        if (joinError) {
            console.error('[EVENT] Join error:', joinError.message);
            return interaction.editReply('❌ Błąd podczas zapisywania. Spróbuj ponownie.');
        }

        const newCount     = count + 1;
        const limit        = event.max_participants ? `${newCount}/${event.max_participants}` : `${newCount}`;
        const allAfterJoin = [...(participants || []), { user_id: interaction.user.id }];
        const preview      = allAfterJoin.slice(0, 10).map(p => `<@${p.user_id}>`).join(', ');
        const extra        = allAfterJoin.length > 10 ? ` i ${allAfterJoin.length - 10} innych` : '';

        const embed = new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('✅ Zapisano na event!')
            .addFields(
                { name: '🏷️ Event',            value: truncateText(event.name),          inline: true  },
                { name: '📅 Data',              value: eventDate.toLocaleString('pl-PL'), inline: true  },
                { name: '👥 Zapisani',          value: limit,                             inline: true  },
                { name: '📋 Lista uczestników', value: `${preview}${extra}`,              inline: false },
            )
            .setFooter({ text: 'Do zobaczenia na evencie! 🎮' });

        if (event.description) embed.addFields({ name: '📝 Opis', value: truncateText(event.description), inline: false });

        return interaction.editReply({ embeds: [embed] });
    });
}

// ── /event_delete ─────────────────────────────────────────────

async function handleEventDelete(interaction, supabase) {
    const isAdmin = interaction.member?.roles.cache.some(r => r.name === ADMIN_ROLE);
    if (!isAdmin) {
        return interaction.editReply({
            content: '❌ Nie masz uprawnień do usuwania eventów!',
        });
    }

    const eventId = interaction.options.getInteger('id');

    const { data: event, error: fetchError } = await supabase
        .from('e_sport_events')
        .select('*')
        .eq('id', eventId)
        .single();

    if (fetchError || !event) {
        return interaction.editReply(`❌ Nie znaleziono eventu o ID **#${eventId}**.`);
    }

    // Pobierz liczbę uczestników przed usunięciem
    const { data: participants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId);

    const count = participants?.length || 0;

    // Usuń event (uczestnicy usuną się automatycznie przez ON DELETE CASCADE)
    const { error: deleteError } = await supabase
        .from('e_sport_events')
        .delete()
        .eq('id', eventId);

    if (deleteError) {
        console.error('[EVENT] Delete error:', deleteError.message);
        return interaction.editReply('❌ Błąd podczas usuwania eventu.');
    }

    const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🗑️ Event usunięty')
        .addFields(
            { name: '🏷️ Nazwa',          value: truncateText(event.name),                           inline: true  },
            { name: '🆔 ID',              value: `#${event.id}`,                                     inline: true  },
            { name: '👥 Było zapisanych', value: `${count} uczestników`,                             inline: true  },
            { name: '📅 Była data',       value: new Date(event.event_date).toLocaleString('pl-PL'), inline: false },
        );

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleEventCreate, handleEventList, handleEventJoin, handleEventDelete };