require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    AttachmentBuilder,
    REST,
    Routes,
    SlashCommandBuilder,
    EmbedBuilder,
    Collection,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const { createProfileCard, availableBackgrounds, refreshBackgrounds } = require('./profileGenerator');
const { handleFishing, handleFishInventory, handleFishTop } = require('./fishing/fishing');
const { handleShop, handleShopInteraction } = require('./shop');
const { handleWedka, handleGearInteraction } = require('./fishing/wedka');
const { handleAfkFishing, handleAfkStop } = require('./fishing/afk_fishing');
const { handleEventCreate, handleEventList, handleEventJoin, handleEventDelete } = require('./events/events');
const { sendModLog, handleKick, handleBan, handleTimeout, handleWarn, handleWarnings } = require('./moderation');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const COIN = '<:CoinTSS:1486049846132605042>';
const ALLOWED_CHANNEL_ID = '1360920823258550353';

// ── Rangi Levelowe ───────────────────────────────────────────
const LEVEL_ROLES = [
    { minLevel: 100, name: '〔 📊︱Level 100 〕' },
    { minLevel: 90,  name: '〔 📊︱Level 90 〕'  },
    { minLevel: 80,  name: '〔 📊︱Level 80 〕'  },
    { minLevel: 70,  name: '〔 📊︱Level 70 〕'  },
    { minLevel: 60,  name: '〔 📊︱Level 60 〕'  },
    { minLevel: 50,  name: '〔 📊︱Level 50 〕'  },
    { minLevel: 40,  name: '〔 📊︱Level 40 〕'  },
    { minLevel: 30,  name: '〔 📊︱Level 30 〕'  },
    { minLevel: 20,  name: '〔 📊︱Level 20 〕'  },
    { minLevel: 10,  name: '〔 📊︱Level 10 〕'  },
    { minLevel: 5,   name: '〔 📊︱Level 5 〕'   },
    { minLevel: 4,   name: '〔 📊︱Level 4 〕'   },
    { minLevel: 3,   name: '〔 📊︱Level 3 〕'   },
    { minLevel: 2,   name: '〔 📊︱Level 2 〕'   },
    { minLevel: 1,   name: '〔 📊︱Level 1 〕'   },
];

const ALL_LEVEL_ROLE_NAMES = new Set(LEVEL_ROLES.map(r => r.name));

function getExpectedRoleName(level) {
    for (const entry of LEVEL_ROLES) {
        if (level >= entry.minLevel) return entry.name;
    }
    return null;
}

async function syncLevelRole(member, newLevel) {
    try {
        const guild        = member.guild;
        const expectedName = getExpectedRoleName(newLevel);

        const levelRolesOnServer = guild.roles.cache.filter(r => ALL_LEVEL_ROLE_NAMES.has(r.name));
        const memberLevelRoles   = member.roles.cache.filter(r => ALL_LEVEL_ROLE_NAMES.has(r.name));
        const expectedRole       = expectedName
            ? guild.roles.cache.find(r => r.name === expectedName)
            : null;

        if (
            expectedRole &&
            memberLevelRoles.size === 1 &&
            memberLevelRoles.has(expectedRole.id)
        ) return;

        const toRemove = memberLevelRoles.map(r => r.id);
        if (toRemove.length > 0) {
            await member.roles.remove(toRemove).catch(e =>
                console.error('[LEVEL ROLE] Błąd zdejmowania rang:', e.message)
            );
        }

        if (expectedRole) {
            await member.roles.add(expectedRole).catch(e =>
                console.error('[LEVEL ROLE] Błąd nadawania rangi:', e.message)
            );
        }
    } catch (e) {
        console.error('[LEVEL ROLE] syncLevelRole error:', e.message);
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const voiceSessions = new Collection();
const cooldowns = new Map();
let messagesTodayCount = 0;
let lastDay = new Date().getDate();

function getLevelFromXP(xp) {
    if (!xp || xp < 100) return 0;
    return Math.floor(0.1 * Math.sqrt(xp));
}

// Constants
const DEFAULT_STARTING_MONEY = 50;
const MESSAGE_XP_REWARD = 2;
const MESSAGE_MONEY_REWARD = 1;
const VOICE_XP_REWARD = 3;
const VOICE_MONEY_REWARD = 2;

// ── Slash Commands Definition ────────────────────────────────
const commands = [
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Wyświetl kartę profilową Two Steps Studio')
        .addUserOption(option =>
            option
                .setName('uzytkownik')
                .setDescription('Użytkownik do wyświetlenia (opcjonalnie, domyślnie twój profil)')
                .setRequired(false)
        ),
    new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Zarządzaj ustawieniami twojego profilu')
        .addStringOption(option =>
            option.setName('tlo')
                .setDescription('Zmień tło swojej karty profilowej')
                .setRequired(false)
                .setAutocomplete(true)
        ),
    new SlashCommandBuilder()
        .setName('backgrounds')
        .setDescription('Pokaż wszystkie dostępne tła'),
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Sprawdź stan swojego konta i banku'),
    new SlashCommandBuilder()
        .setName('deposit')
        .setDescription('Wpłać monety do banku')
        .addIntegerOption(option =>
            option.setName('ilosc')
                .setDescription('Ile monet chcesz wpłacić (0 = wszystko)')
                .setRequired(true)
                .setMinValue(0)
        ),
    new SlashCommandBuilder()
        .setName('withdraw')
        .setDescription('Wypłać monety z banku')
        .addIntegerOption(option =>
            option.setName('ilosc')
                .setDescription('Ile monet chcesz wypłacić (0 = wszystko)')
                .setRequired(true)
                .setMinValue(0)
        ),
    new SlashCommandBuilder()
        .setName('top_money')
        .setDescription('Ranking najbogatszych graczy'),
    new SlashCommandBuilder()
        .setName('top_level')
        .setDescription('Ranking najwyższych poziomów'),
    new SlashCommandBuilder()
        .setName('work')
        .setDescription('Zarób trochę monet pracując dla studia'),
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Odbierz codzienną nagrodę (raz na 24h)'),
    new SlashCommandBuilder()
        .setName('weekly')
        .setDescription('Odbierz tygodniową nagrodę (raz na 7 dni)'),
    new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Kup ozdoby, rangi i dodatki'),
    new SlashCommandBuilder()
        .setName('fish')
        .setDescription('Zarzuć wędkę i złap coś cennego!'),
    new SlashCommandBuilder()
        .setName('catches')
        .setDescription('Zobacz swoje ostatnie połowy i statystyki'),
    new SlashCommandBuilder()
        .setName('top_fish')
        .setDescription('Ranking najlepszych wędkarzy'),
    new SlashCommandBuilder()
        .setName('gear')
        .setDescription('Ulepsz swój sprzęt wędkarski (żyłka, kołowrotek, haczyk, przynęta)'),
    new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Zarządzaj sesją AFK - zacznij lub zakończ wędkowanie')
        .addSubcommand(sub =>
            sub.setName('start')
                .setDescription('Rozpocznij sesję AFK przy jeziorze')
                .addIntegerOption(opt =>
                    opt.setName('czas')
                        .setDescription('Jak długo chcesz siedzieć przy jeziorze?')
                        .setRequired(false)
                        .addChoices(
                            { name: '15 minut',  value: 15  },
                            { name: '30 minut',  value: 30  },
                            { name: '1 godzina', value: 60  },
                            { name: '2 godziny', value: 120 },
                            { name: '4 godziny', value: 240 },
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('stop')
                .setDescription('Zakończ sesję AFK i odbierz podsumowanie połowów')
        ),

    // ── Eventy ───────────────────────────────────────────────
    new SlashCommandBuilder()
        .setName('event_create')
        .setDescription('Utwórz nowy event e-sportowy')
        .addStringOption(opt =>
            opt.setName('nazwa')
                .setDescription('Nazwa eventu')
                .setRequired(true)
                // Discord embed field *names* (used in /event_list as
                // "#<id> – <name>") are capped at 256 chars; without this,
                // Discord's own 6000-char default allowed a name long
                // enough to throw building that field, breaking
                // /event_list for the whole server until the offending
                // event was found and deleted directly in the DB.
                .setMaxLength(200)
        )
        .addStringOption(opt =>
            opt.setName('data')
                .setDescription('Data w formacie DD.MM.YYYY HH:MM, np. 25.12.2025 18:00')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('opis')
                .setDescription('Opis eventu (opcjonalnie)')
                .setRequired(false)
                // Embed field *values* are capped at 1024 chars, and
                // /event_list packs date+limit+description+participants
                // into one field - leave plenty of room for the rest.
                .setMaxLength(500)
        )
        .addIntegerOption(opt =>
            opt.setName('max_uczestnikow')
                .setDescription('Maksymalna liczba uczestników (opcjonalnie)')
                .setRequired(false)
                // 0 or negative broke the join check in events.js (0
                // collapsed to "no limit" via `||`; negative made the
                // event permanently report full, since count>=negative is
                // always true) - only positive limits make sense anyway.
                .setMinValue(1)
        ),
    new SlashCommandBuilder()
        .setName('event_list')
        .setDescription('Lista nadchodzących eventów e-sportowych'),
    new SlashCommandBuilder()
        .setName('event_join')
        .setDescription('Sprawdź szczegóły eventu i dołącz')
        .addIntegerOption(opt =>
            opt.setName('id')
                .setDescription('ID eventu z /event_list')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('event_delete')
        .setDescription('Usuń event (tylko admin)')
        .addIntegerOption(opt =>
            opt.setName('id')
                .setDescription('ID eventu do usunięcia')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Przelej monety innemu użytkownikowi')
        .addUserOption(option =>
            option.setName('uzytkownik')
                .setDescription('Użytkownik, który otrzyma przelew')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('ilosc')
                .setDescription('Ile monet chcesz przelać')
                .setRequired(true)
                .setMinValue(1)
        ),

    // ── Moderacja ──────────────────────────────────────────────
    // setDefaultMemberPermissions gates visibility/use at the Discord level
    // itself (server admins can further customize per-role in Integrations
    // settings) - sturdier than the hardcoded ADMIN_ROLE name string
    // events.js relies on, which can't be verified without live access.
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Wyrzuć użytkownika z serwera')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('uzytkownik').setDescription('Kogo wyrzucić').setRequired(true))
        .addStringOption(opt => opt.setName('powod').setDescription('Powód').setRequired(false)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Zbanuj użytkownika')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('uzytkownik').setDescription('Kogo zbanować').setRequired(true))
        .addStringOption(opt => opt.setName('powod').setDescription('Powód').setRequired(false))
        .addIntegerOption(opt =>
            opt.setName('usun_wiadomosci_dni')
                .setDescription('Usuń wiadomości z ostatnich X dni (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7)
        ),
    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Wycisz użytkownika na czas')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('uzytkownik').setDescription('Kogo wyciszyć').setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('minuty')
                .setDescription('Na ile minut (max 28 dni = 40320 min)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(opt => opt.setName('powod').setDescription('Powód').setRequired(false)),
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Daj ostrzeżenie użytkownikowi')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('uzytkownik').setDescription('Kogo ostrzec').setRequired(true))
        .addStringOption(opt => opt.setName('powod').setDescription('Powód ostrzeżenia').setRequired(true)),
    new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Pokaż historię ostrzeżeń użytkownika')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('uzytkownik').setDescription('Czyje ostrzeżenia (domyślnie Twoje)').setRequired(false)),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
    // CLAUDE.md documents commands as guild-specific, and CLIENT_ID/GUILD_ID
    // are already set in .env for exactly this - but this used to register
    // globally instead (Routes.applicationCommands, with the app ID
    // hardcoded rather than read from CLIENT_ID). Global commands can take
    // up to an hour to propagate after an update, and would silently become
    // available in any other guild the bot is ever added to.
    const clientId = process.env.CLIENT_ID || '1484253044421038261';
    const guildId = process.env.GUILD_ID;
    try {
        console.log('--- SYNCING SLASH COMMANDS ---');
        await rest.put(
            guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId),
            { body: commands },
        );
        if (guildId) {
            // Clear the old global registration this used to create -
            // switching to guild commands alone doesn't remove it, and a
            // leftover global copy of every command would show up
            // duplicated (global + guild) until Discord's global cache
            // catches up, or forever if it never gets cleared.
            await rest.put(Routes.applicationCommands(clientId), { body: [] }).catch(err =>
                console.error('Failed to clear old global commands:', err.message)
            );
        }
        console.log(`--- SLASH COMMANDS SYNCED (${guildId ? 'guild-specific' : 'global - GUILD_ID not set'}) ---`);
    } catch (error) {
        console.error('Failed sync:', error);
    }
}

// ── Pobieranie/Tworzenie Profilu ─────────────────────────────
async function getProfile(userId, username, roles = []) {
    try {
        let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (!profile) {
            console.log(`[DB] Tworzenie nowego profilu dla: ${username} (${userId})`);
            const { data: newProfile, error: insertError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    username: username || 'Nieznany',
                    xp: 0,
                    level: 0,
                    money: 50,
                    bank: 0,
                    discord_roles: roles,
                    background: 'default'
                }, { onConflict: 'id' })
                .select()
                .single();

            if (insertError) throw insertError;
            return newProfile;
        }

        // getProfile runs on every message and every slash command, and used
        // to unconditionally rewrite username/discord_roles every single
        // time even when nothing changed - doubling DB writes on the bot's
        // busiest paths for no reason. Only write when something did.
        const rolesChanged    = JSON.stringify(profile.discord_roles || []) !== JSON.stringify(roles);
        const usernameChanged = profile.username !== username;
        if (!rolesChanged && !usernameChanged) {
            return profile;
        }

        const { data: updatedProfile } = await supabase
            .from('profiles')
            .update({ username, discord_roles: roles })
            .eq('id', userId)
            .select()
            .single();

        return updatedProfile || profile;
    } catch (err) {
        console.error('[DB ERROR] getProfile:', err.message);
        return {
            id: userId,
            username,
            xp: 0,
            level: 0,
            money: 0,
            bank: 0,
            discord_roles: roles,
            background: 'default'
        };
    }
}

// ── Globalna obsługa błędów ───────────────────────────────────
client.on('error', (error) => {
    console.error('[CLIENT ERROR]', error.message);
});

process.on('unhandledRejection', (error) => {
    console.error('[UNHANDLED REJECTION]', error?.message || error);
});

client.once('clientReady', async () => {
    console.log(`Bot ${client.user.tag} stands ready!`);
    await registerCommands();
    updateDiscordStats();
    setInterval(updateDiscordStats, 60 * 1000);
});

async function updateDiscordStats() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) return;

        const members  = await guild.members.fetch();
        const humans   = members.filter(m => !m.user.bot).size;
        const online   = members.filter(m => m.presence?.status === 'online' || m.presence?.status === 'dnd').size;
        const channels = guild.channels.cache.size;

        // Pobierz liczbę kont na stronie z bazy profiles
        const { count: siteAccounts } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const currentDay = new Date().getDate();
        if (currentDay !== lastDay) {
            messagesTodayCount = 0;
            lastDay = currentDay;
            console.log('[STATS] Nowa data, reset zlicznika wiadomości.');
        }

        // `recorded_at` is a fresh timestamp on every call, so upserting
        // onConflict: 'recorded_at' never actually collides with itself --
        // this either silently failed (no unique constraint on that column,
        // and the error was never checked) or inserted a new row every 60s
        // forever. `guild_id` is the real stable key for "this guild's
        // current stats" (see migrations/add-unified-stats.sql).
        const { error: statsError } = await supabase.from('discord_stats').upsert({
            guild_id:        guild.id,
            online_users:    online    || 0,
            active_channels: channels  || 0,
            member_count:    humans    || 0,
            site_accounts:   siteAccounts || 0,
            messages_today:  messagesTodayCount || 0,
            recorded_at:     new Date().toISOString(),
        }, { onConflict: 'guild_id' });
        if (statsError) console.error('[STATS] Upsert error:', statsError.message);
    } catch (e) {
        console.error('[STATS] Błąd:', e.message);
    }
}

// ── Pomocnik do bezpiecznej odpowiedzi ───────────────────────
// Używa editReply jeśli już zdeferowane, reply w przeciwnym razie
async function safeReply(interaction, options) {
    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(options);
        }
        return await interaction.reply(options);
    } catch (e) {
        console.error('[SAFE REPLY] Błąd odpowiedzi:', e.message);
    }
}

// ── Interactions ─────────────────────────────────────────────
client.on('interactionCreate', async interaction => {
    // Blokada kanału
    if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
        if (interaction.isChatInputCommand() || interaction.isButton() || interaction.isStringSelectMenu()) {
            if (interaction.replied || interaction.deferred) return;
            return interaction.reply({
                content: `❌ Komend i funkcji bota można używać wyłącznie na kanale <#${ALLOWED_CHANNEL_ID}>!`,
                flags: 1 << 6,
            });
        }
        return;
    }

    // Przyciski i select menu
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('shop_page_') || interaction.customId.startsWith('shop_buy_')) {
            await handleShopInteraction(interaction, supabase);
            return;
        }
        if (interaction.customId === 'gear_upgrade_select' || interaction.customId === 'gear_refresh') {
            await handleGearInteraction(interaction, supabase);
            return;
        }
    }

    // Autocomplete
    if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'settings') {
            const focused = interaction.options.getFocused();
            const choices = availableBackgrounds
                .filter(bg => bg.toLowerCase().includes(focused.toLowerCase()))
                .slice(0, 25)
                .map(bg => ({ name: bg, value: bg }));
            return interaction.respond(choices);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    // ── NATYCHMIASTOWY DEFER ─────────────────────────────────
    // Komendy które NIE potrzebują defer (odpowiadają natychmiastowo prostym tekstem)
    const NO_DEFER_COMMANDS = [];

    if (!NO_DEFER_COMMANDS.includes(interaction.commandName)) {
        await interaction.deferReply();
    }

    const roles   = interaction.member?.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name) || [];
    const profile = await getProfile(interaction.user.id, interaction.user.username, roles);

    await handleCommandWithErrors(interaction, async () => {
    switch (interaction.commandName) {

        case 'profile': {
            // Pobierz opcjonalnego użytkownika (domyślnie autor komendy)
            const targetUser = interaction.options.getUser('uzytkownik') || interaction.user;
            const isOtherUser = targetUser.id !== interaction.user.id;

            // Jeśli sprawdzamy innego użytkownika, pobierz jego profile i role
            let targetProfile = profile;
            let targetRoles = roles;
            if (isOtherUser) {
                const member = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
                if (!member) {
                    return interaction.editReply({
                        content: `❌ Nie udało się pobrać informacji o użytkowniku: ${targetUser.username}`,
                        ephemeral: true,
                    });
                }
                targetRoles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name) || [];
                targetProfile = await getProfile(targetUser.id, targetUser.username, targetRoles);
            }

            if (!targetProfile) {
                return interaction.editReply({
                    content: `❌ Nie znaleziono profilu dla: ${targetUser.username}`,
                    ephemeral: true,
                });
            }

            try {
                const xp = targetProfile.xp ?? 0;
                // The `|| Math.floor(xp ** 0.1)` fallback used a completely
                // different formula than getLevelFromXP (0.1*sqrt(xp)) for
                // any xp 1-99, where the real formula correctly returns 0.
                // Every new member with a few messages saw the profile card
                // claim "LEVEL 1" while the DB, role sync, and /toplevel all
                // correctly had them at 0.
                const calculatedLevel = getLevelFromXP(xp);
                const buffer = await createProfileCard({
                    username:  interaction.guild?.members.cache.get(targetUser.id)?.displayName || targetUser.username,
                    level:     calculatedLevel,
                    money:     targetProfile.money ?? 0,
                    xp:        xp,
                    bank:      targetProfile.bank ?? 0,
                    background: targetProfile.background || 'default',
                    roles:     targetRoles,
                    avatarURL: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                });
                const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });
                await interaction.editReply({ files: [attachment] });
            } catch (error) {
                console.error('[CC] Error:', error);
                await interaction.editReply('❌ Wystąpił błąd podczas generowania profilu.');
            }
            break;
        }

        case 'settings': {
            const backgroundName = interaction.options.getString('tlo');

            if (!backgroundName) {
                // Jeśli nie podano żadnych ustawień, pokaż obecne
                return await interaction.editReply({
                    content: `📋 Twoje ustawienia:\n• Tło profilu: \`${profile.background || 'default'}\`\n\nUżyj \`/settings tlo:bg_nazwa\` aby zmienić tło.`,
                    ephemeral: true
                });
            }

            if (!availableBackgrounds.includes(backgroundName)) {
                return await interaction.editReply({
                    content: `❌ Tło "${backgroundName}" nie istnieje. Dostępne tła: \`${availableBackgrounds.join(', ')}\``,
                    ephemeral: true
                });
            }

            try {
                const { error: bgError } = await supabase
                    .from('profiles')
                    .update({ background: backgroundName })
                    .eq('id', interaction.user.id);
                if (bgError) throw new Error(bgError.message);

                await interaction.editReply({
                    content: `✅ Ustawiono tło profilu na: **${backgroundName}**`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('[BACKGROUND] Błąd zapisu:', err.message);
                await interaction.editReply({
                    content: '❌ Wystąpił błąd podczas ustawiania tła.',
                    ephemeral: true
                });
            }
            break;
        }

        case 'backgrounds': {
            // Odśwież listę tła przed wyświetleniem
            const backgrounds = refreshBackgrounds();

            // Formatowanie listy tła w postaci kolumn
            const itemsPerRow = 4;
            const rows = [];

            for (let i = 0; i < backgrounds.length; i += itemsPerRow) {
                const row = backgrounds.slice(i, i + itemsPerRow);
                rows.push(row.join(' | '));
            }

            const embed = new EmbedBuilder()
                .setTitle('🖼️ Dostępne tła')
                .setDescription(`Możesz zmienić tło komendą \`/settings tlo:<nazwa>\`\n\n${rows.join('\n')}`)
                .setColor('#22FF00')
                .addFields(
                    { name: '📌 Instrukcja', value: 'Aby dodać nowe tło:\n1. Skopiuj plik do folderu `C:\\tss\\tss-dc-bot\\assets\\discord\\backgrounds`\n2. Zaczekaj 30 sekund lub użyj komendy `/backgrounds` ponownie' }
                )
                .setFooter({ text: `Dostępnych tła: ${backgrounds.length}` });

            await interaction.editReply({ embeds: [embed] });
            break;
        }

        case 'balance': {
            const embed = new EmbedBuilder()
                .setTitle(`💰 Portfel: ${interaction.user.username}`)
                .setColor('#1bbdbd')
                .addFields(
                    { name: '💵 Gotówka', value: `${profile.money ?? 0} ${COIN}`, inline: true },
                    { name: '🏦 Bank',    value: `${profile.bank  ?? 0} ${COIN}`, inline: true },
                )
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
            break;
        }

        case 'deposit': {
            let amountInput = interaction.options.getInteger('ilosc');
            const currentMoney = profile.money ?? 0;
            const amount = amountInput === 0 ? currentMoney : amountInput;

            if (amount <= 0 || currentMoney <= 0) {
                return await interaction.editReply({ content: '❌ Nie masz monet do wpłaty.', ephemeral: true });
            }
            if (currentMoney < amount) {
                return await interaction.editReply({ content: `❌ Masz tylko **${currentMoney}** ${COIN} w portfelu.`, ephemeral: true });
            }

            const { data: depositData, error: depositError } = await supabase.rpc('deposit_to_bank', {
                p_user_id: profile.id,
                p_amount: amount,
            });
            if (depositError || !depositData?.length) {
                return await interaction.editReply({ content: `❌ Masz tylko **${currentMoney}** ${COIN} w portfelu.`, ephemeral: true });
            }
            const { money: newMoney, bank: newBank } = depositData[0];

            await interaction.editReply({
                content: `✅ Wpłaciłeś **${amount}** ${COIN} do banku!\n💵 Portfel: **${newMoney}** ${COIN}\n🏦 Bank: **${newBank}** ${COIN}`,
                ephemeral: true
            });
            break;
        }

        case 'withdraw': {
            let amountInput = interaction.options.getInteger('ilosc');
            const currentBank = profile.bank ?? 0;
            const amount = amountInput === 0 ? currentBank : amountInput;

            if (amount <= 0 || currentBank <= 0) {
                return await interaction.editReply({ content: '❌ Nie masz monet w banku do wypłaty.', ephemeral: true });
            }
            if (currentBank < amount) {
                return await interaction.editReply({ content: `❌ Masz tylko **${currentBank}** ${COIN} w banku.`, ephemeral: true });
            }

            const { data: withdrawData, error: withdrawError } = await supabase.rpc('withdraw_from_bank', {
                p_user_id: profile.id,
                p_amount: amount,
            });
            if (withdrawError || !withdrawData?.length) {
                return await interaction.editReply({ content: `❌ Masz tylko **${currentBank}** ${COIN} w banku.`, ephemeral: true });
            }
            const { money: newMoney, bank: newBank } = withdrawData[0];

            await interaction.editReply({
                content: `✅ Wypłaciłeś **${amount}** ${COIN} z banku!\n💵 Portfel: **${newMoney}** ${COIN}\n🏦 Bank: **${newBank}** ${COIN}`,
                ephemeral: true
            });
            break;
        }

        case 'pay': {
            const targetUser = interaction.options.getUser('uzytkownik');
            const amount = interaction.options.getInteger('ilosc');

            if (targetUser.id === interaction.user.id) {
                return await interaction.editReply({ content: '❌ Nie możesz przelać monet samemu sobie.', ephemeral: true });
            }

            const currentMoney = profile.money ?? 0;
            if (amount <= 0 || currentMoney < amount) {
                return await interaction.editReply({
                    content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${amount}** ${COIN}, a masz **${currentMoney}** ${COIN}.`,
                    ephemeral: true
                });
            }

            // Pobierz profil odbiorcy
            const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                return await interaction.editReply({ content: `❌ Nie znaleziono użytkownika: ${targetUser.username}`, ephemeral: true });
            }

            const targetRoles = targetMember.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name) || [];
            const targetProfile = await getProfile(targetUser.id, targetUser.username, targetRoles);

            if (!targetProfile) {
                return await interaction.editReply({ content: `❌ Nie znaleziono profilu dla: ${targetUser.username}`, ephemeral: true });
            }

            // Wykonaj przelew
            const { data: payData, error: payError } = await supabase.rpc('pay_transfer', {
                p_sender_id: profile.id,
                p_recipient_id: targetProfile.id,
                p_amount: amount,
            });
            if (payError) {
                if (payError.message?.includes('INSUFFICIENT_FUNDS')) {
                    return await interaction.editReply({
                        content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${amount}** ${COIN}, a masz **${currentMoney}** ${COIN}.`,
                        ephemeral: true
                    });
                }
                if (payError.message?.includes('RECIPIENT_NOT_FOUND')) {
                    return await interaction.editReply({ content: `❌ Nie znaleziono profilu dla: ${targetUser.username}`, ephemeral: true });
                }
                throw payError;
            }
            const { sender_money: newSenderMoney, recipient_money: newTargetMoney } = payData[0];

            const embed = new EmbedBuilder()
                .setTitle('💸 Przelew monet')
                .setColor('#1bbdbd')
                .addFields(
                    { name: '📤 Nadawca', value: `${interaction.user.username}`, inline: true },
                    { name: '📥 Odbiorca', value: `${targetUser.username}`, inline: true },
                    { name: '💰 Kwota', value: `**${amount}** ${COIN}`, inline: true },
                )
                .addFields(
                    { name: '💵 Portfel nadawcy', value: `**${newSenderMoney}** ${COIN}`, inline: true },
                    { name: '💵 Portfel odbiorcy', value: `**${newTargetMoney}** ${COIN}`, inline: true },
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            break;
        }

        case 'top_money': {
            const { data: top } = await supabase
                .from('profiles').select('*')
                .order('money', { ascending: false }).limit(10);
            const list = top?.map((p, i) =>
                `**#${i + 1}** ${p.username} - **${p.money || 0} ${COIN}**`
            ).join('\n') || 'Brak danych.';
            await interaction.editReply({ embeds: [
                    new EmbedBuilder().setTitle('💰 Najbogatsi w Studiu').setColor('#22FF00').setDescription(list),
                ]});
            break;
        }

        case 'top_level': {
            const { data: top } = await supabase
                .from('profiles').select('*')
                .order('xp', { ascending: false }).limit(10);
            const list = top?.map((p, i) =>
                `**#${i + 1}** ${p.username} - Lvl ${p.level || 0} (${p.xp || 0} XP) 🏆`
            ).join('\n') || 'Brak danych.';
            await interaction.editReply({ embeds: [
                    new EmbedBuilder().setTitle('🏆 Top Level w Studiu').setColor('#ffcB2f').setDescription(list),
                ]});
            break;
        }

        case 'work': {
            const lastWork = profile.last_work ? new Date(profile.last_work) : 0;
            const diff     = Date.now() - lastWork;
            if (diff < 3600000) {
                const minsLeft = Math.ceil((3600000 - diff) / 60000);
                return await interaction.editReply(`⏳ Jesteś zmęczony! Odpocznij jeszcze **${minsLeft} min**.`);
            }
            const earnings = Math.floor(Math.random() * 80) + 20;
            const { data: workData, error: workError } = await supabase.rpc('apply_work_reward', {
                p_user_id: profile.id,
                p_earnings: earnings,
            });
            if (workError) {
                console.error('[DB ERROR] apply_work_reward failed:', workError.message);
                return await interaction.editReply('❌ Wystąpił błąd podczas pracy. Spróbuj ponownie.');
            }
            // apply_work_reward re-checks the cooldown atomically in the DB
            // (see db/atomic_mutations.sql REVISION 3) -- two /work calls
            // racing past the client-side check above with the same stale
            // cached profile.last_work would otherwise both earn money on
            // one cooldown. If the guard rejected the write, 0 rows come
            // back and we must not claim the user got paid.
            if (!workData || workData.length === 0) {
                return await interaction.editReply('⏳ Jesteś zmęczony! Odpocznij chwilę i spróbuj ponownie.');
            }
            await interaction.editReply(`⛏️ Zapracowałeś ciężko w Studiu i otrzymałeś **${earnings} ${COIN}!**`);
            break;
        }

        case 'daily': {
            const lastDaily = profile.last_daily ? new Date(profile.last_daily) : 0;
            const diff      = Date.now() - lastDaily;
            if (diff < 86400000) {
                const hoursLeft = Math.ceil((86400000 - diff) / 3600000);
                return await interaction.editReply(`⏳ Codzienną nagrodę odbierzesz za **${hoursLeft} h**.`);
            }
            const earnings = Math.floor(Math.random() * 101) + 50; // 50-150
            const { data, error } = await supabase.rpc('apply_daily_reward', {
                p_user_id: profile.id,
                p_earnings: earnings,
            });
            if (error) {
                console.error('[DB ERROR] apply_daily_reward failed:', error.message);
                return await interaction.editReply('❌ Wystąpił błąd. Spróbuj ponownie.');
            }
            if (!data || data.length === 0) {
                return await interaction.editReply('⏳ Codzienną nagrodę już dziś odebrałeś.');
            }
            await interaction.editReply(`🎁 Odebrano codzienną nagrodę: **${earnings} ${COIN}!**`);
            break;
        }

        case 'weekly': {
            const lastWeekly = profile.last_weekly ? new Date(profile.last_weekly) : 0;
            const diff       = Date.now() - lastWeekly;
            if (diff < 604800000) {
                const daysLeft = Math.ceil((604800000 - diff) / 86400000);
                return await interaction.editReply(`⏳ Tygodniową nagrodę odbierzesz za **${daysLeft} dni**.`);
            }
            const earnings = Math.floor(Math.random() * 301) + 300; // 300-600
            const { data, error } = await supabase.rpc('apply_weekly_reward', {
                p_user_id: profile.id,
                p_earnings: earnings,
            });
            if (error) {
                console.error('[DB ERROR] apply_weekly_reward failed:', error.message);
                return await interaction.editReply('❌ Wystąpił błąd. Spróbuj ponownie.');
            }
            if (!data || data.length === 0) {
                return await interaction.editReply('⏳ Tygodniową nagrodę już w tym tygodniu odebrałeś.');
            }
            await interaction.editReply(`🎁 Odebrano tygodniową nagrodę: **${earnings} ${COIN}!**`);
            break;
        }

        case 'fish':
            await handleFishing(interaction, supabase, profile, COIN);
            break;

        case 'catches':
            await handleFishInventory(interaction, supabase, COIN);
            break;

        case 'top_fish':
            await handleFishTop(interaction, supabase, COIN);
            break;

        case 'shop':
            await handleShop(interaction, supabase, profile, COIN);
            break;

        case 'gear':
            await handleWedka(interaction, supabase, profile);
            break;

        case 'afk': {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'start') {
                await handleAfkFishing(interaction, supabase, profile, COIN);
            } else if (subcommand === 'stop') {
                await handleAfkStop(interaction, COIN);
            }
            break;
        }

        // ── Eventy ───────────────────────────────────────────
        case 'event_create':
            await handleEventCreate(interaction, supabase);
            break;

        case 'event_list':
            await handleEventList(interaction, supabase);
            break;

        case 'event_join':
            await handleEventJoin(interaction, supabase);
            break;

        case 'event_delete':
            await handleEventDelete(interaction, supabase);
            break;

        // ── Moderacja ──────────────────────────────────────────
        case 'kick':
            await handleKick(interaction);
            break;

        case 'ban':
            await handleBan(interaction);
            break;

        case 'timeout':
            await handleTimeout(interaction);
            break;

        case 'warn':
            await handleWarn(interaction, supabase);
            break;

        case 'warnings':
            await handleWarnings(interaction, supabase);
            break;
    }
    });
});

// Wrapper do obsługi błędów komend
async function handleCommandWithErrors(interaction, fn) {
    try {
        await fn();
    } catch (e) {
        console.error(`[COMMAND ERROR] /${interaction.commandName}:`, e.message);
        try {
            const errMsg = { content: '❌ Wystąpił błąd podczas wykonywania komendy.' };
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errMsg);
            } else {
                await interaction.reply({ ...errMsg, flags: 1 << 6 });
            }
        } catch (_) { /* ignoruj jeśli nie można odpowiedzieć */ }
    }
}

// ── Text Leveling ────────────────────────────────────────────
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    messagesTodayCount++;

    // Rate limiting per user (3 seconds)
    const userCooldownKey = `msg_${message.author.id}`;
    if (cooldowns.has(userCooldownKey)) {
        const remaining = cooldowns.get(userCooldownKey) - Date.now();
        if (remaining > 0) return;
    }
    cooldowns.set(userCooldownKey, Date.now() + 3000);

    try {
        const roles   = message.member?.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name) || [];
        const profile = await getProfile(message.author.id, message.author.username, roles);
        if (!profile) return;

        const currentLevel = profile.level ?? 0;
        const newLevel     = getLevelFromXP((profile.xp ?? 0) + MESSAGE_XP_REWARD);

        const { error: updateError } = await supabase.rpc('apply_xp_money_reward', {
            p_user_id: profile.id,
            p_xp_delta: MESSAGE_XP_REWARD,
            p_money_delta: MESSAGE_MONEY_REWARD,
            p_new_level: newLevel,
        });

        if (updateError) {
            console.error('[DB ERROR] Failed to update profile:', updateError.message);
            return;
        }

        // Per-user message counter for the "messages" achievement tier -
        // apply_xp_money_reward doesn't track this (it only moves xp/money).
        // Non-fatal: an achievement-tracking hiccup shouldn't drop XP/level
        // updates that already succeeded above.
        supabase.rpc('increment_message_count', { p_user_id: profile.id })
            .then(({ error }) => { if (error) console.error('[ACHIEVEMENTS] message count error:', error.message); });

        if (newLevel > currentLevel) {
            await message.channel.send(
                `🎉 Gratulacje <@${message.author.id}>! Awans na poziom **${newLevel}**! 🏆`
            );
            if (message.member) {
                await syncLevelRole(message.member, newLevel);
            }
        }
    } catch (e) {
        console.error('[LEVELING] Text leveling error:', e.message);
    }
});

// ── Voice Leveling ───────────────────────────────────────────
client.on('voiceStateUpdate', (oldState, newState) => {
    const userId = newState.id;
    if (!oldState.channelId && newState.channelId && !newState.member.user.bot) {
        voiceSessions.set(userId, Date.now());
    }
    if (oldState.channelId && !newState.channelId) {
        const startTime = voiceSessions.get(userId);
        if (startTime) {
            const minutes = Math.floor((Date.now() - startTime) / 60000);
            voiceSessions.delete(userId);
            if (minutes > 0) syncVoiceRewards(userId, minutes, newState.member, newState.member?.user.username || 'Unknown');
        }
    }
});

async function syncVoiceRewards(userId, minutes, member, username) {
    try {
        // getProfile()'s "profile already exists" branch unconditionally
        // overwrites discord_roles with whatever was passed in (defaulting
        // to [] when omitted) - every voice session ending here was wiping
        // the user's tracked roles until their next text message/command
        // re-synced them, breaking the website's DiscordRolesPanel and the
        // profile card's role badges in the meantime.
        const roles = member?.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name) || [];
        const profile      = await getProfile(userId, username, roles);
        const currentLevel = profile.level ?? 0;
        const newLevel     = getLevelFromXP((profile.xp || 0) + minutes * 3);

        await supabase.rpc('apply_xp_money_reward', {
            p_user_id: profile.id,
            p_xp_delta: minutes * 3,
            p_money_delta: minutes * 2,
            p_new_level: newLevel,
        });

        // Per-user voice-minutes counter for the "voice_minutes" achievement
        // tier - same non-fatal pattern as the message counter above.
        const { error: voiceCountError } = await supabase.rpc('increment_voice_minutes', {
            p_user_id: profile.id,
            p_minutes: minutes,
        });
        if (voiceCountError) console.error('[ACHIEVEMENTS] voice minutes error:', voiceCountError.message);

        if (newLevel > currentLevel && member) {
            await syncLevelRole(member, newLevel);
        }
    } catch (e) { console.error('[VC] Reward sync error:', e); }
}

// ── Welcome ──────────────────────────────────────────────────
client.on('guildMemberAdd', async member => {
    // The name-substring match can hit a category or other non-text
    // channel (e.g. a category literally named "👋 Welcome") which has no
    // .send() -- that used to throw synchronously inside this listener, a
    // spot neither client.on('error') nor process.on('unhandledRejection')
    // catches, crashing the whole bot process on every subsequent join.
    const ch = member.guild.channels.cache.find(c =>
        c.isTextBased?.() && (c.name.includes('powitania') || c.name.includes('welcome'))
    );
    if (!ch) return;
    try {
        await ch.send({ embeds: [
                new EmbedBuilder()
                    .setTitle('👋 Witaj w Two Steps Studio!')
                    .setDescription(`Witaj <@${member.id}>! Cieszymy się, że do nas dołączyłeś.`)
                    .setColor('#1bbdbd')
                    .setThumbnail(member.user.displayAvatarURL())
                    .addFields({ name: 'Twoje ID', value: member.id }),
            ]});
    } catch (e) {
        console.error('[WELCOME] Błąd wysyłania powitania:', e.message);
    }
});

// ── Mod-log: message delete/edit ──────────────────────────────
client.on('messageDelete', async message => {
    if (message.partial || message.author?.bot || !message.guild) return;
    const embed = new EmbedBuilder()
        .setColor('#e67e22')
        .setTitle('🗑️ Wiadomość usunięta')
        .addFields(
            { name: 'Autor', value: `${message.author?.tag ?? 'Nieznany'}`, inline: true },
            { name: 'Kanał', value: `${message.channel}`, inline: true },
            { name: 'Treść', value: (message.content || '*brak treści (np. załącznik)*').slice(0, 1024), inline: false },
        )
        .setTimestamp();
    await sendModLog(message.guild, embed);
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.partial || newMessage.author?.bot || !newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return; // pin/embed/reaction updates, not real edits
    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('✏️ Wiadomość edytowana')
        .addFields(
            { name: 'Autor', value: `${newMessage.author?.tag ?? 'Nieznany'}`, inline: true },
            { name: 'Kanał', value: `${newMessage.channel}`, inline: true },
            { name: 'Przed', value: (oldMessage.content || '*brak (nie w cache)*').slice(0, 512), inline: false },
            { name: 'Po', value: (newMessage.content || '*brak*').slice(0, 512), inline: false },
        )
        .setTimestamp();
    await sendModLog(newMessage.guild, embed);
});

client.login(process.env.DISCORD_TOKEN);