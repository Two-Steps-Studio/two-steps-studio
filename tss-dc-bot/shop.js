const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { logActivity } = require('./activityLog');

// Reserved synchronously (before any await) for the duration of a purchase -
// closes the window where two quick clicks on the same shop button could
// both pass the "already owns this role" / balance checks before either
// finished writing the result, double-charging for a role granted once.
const purchaseLocks = new Set();

// ── Definicja przedmiotów sklepu ─────────────────────────────
const SHOP_ITEMS = [
    {
        name: 'VIP',
        label: '〔 🐨 ︱ VIP 〕',
        price: 1500,
        description: 'VIP — +10% z wiadomości, voice, /work, /daily, /weekly',
        type: 'role',
        // Discord snowflakes exceed Number.MAX_SAFE_INTEGER — as bare number
        // literals these silently lost precision, so every role grant below
        // was attempted with a corrupted, non-existent id. Must stay strings.
        roleId: '1448013683526467756',
        effect: { type: 'vip_status', column: 'vip_status' },
    },
    {
        name: 'SVIP',
        label: '〔 🐄 ︱ SVIP 〕',
        price: 3000,
        description: 'SVIP — +20% z wiadomości, voice, /work, /daily, /weekly',
        type: 'role',
        roleId: '1448017195790635099',
        effect: { type: 'vip_status', column: 'svip_status' },
    },
    {
        name: 'MVIP',
        label: '〔 🦣 ︱ MVIP 〕',
        price: 6000,
        description: 'MVIP — +35% z wiadomości, voice, /work, /daily, /weekly',
        type: 'role',
        roleId: '1448017207501000908',
        effect: { type: 'vip_status', column: 'mvip_status' },
    },
    {
        name: 'X2',
        label: '〔 ✖️ ︱ X2 〕',
        price: 6000,
        description: 'X2 — podwaja zarobki z wiadomości/voice/pracy na 3 dni',
        type: 'role',
        roleId: '1362307366372114582',
        effect: { type: 'multiplier', value: 2, days: 3 },
    },
    {
        name: 'X3',
        label: '〔 ✖️ ︱ X3 〕',
        price: 10000,
        description: 'X3 — potraja zarobki z wiadomości/voice/pracy na 5 dni',
        type: 'role',
        roleId: '1362307473804886168',
        effect: { type: 'multiplier', value: 3, days: 5 },
    },
];

const ITEMS_PER_PAGE = 10;
// Matches the coin emoji used everywhere else in the bot (index.js,
// fishing/*, wedka.js) — this file was the only one on a different id.
const COIN = '<:CoinTSS:1548220404693213195>';

// ── Kosmetyki z tej samej tabeli co sklep na stronie (frame/nick_color/
//    background w shop_items) — pobierane na żywo, żeby oba miejsca
//    zawsze sprzedawały to samo, bez duplikowania katalogu w kodzie bota. ──
async function fetchCosmeticItems(supabase) {
    const { data, error } = await supabase
        .from('shop_items')
        .select('id, category, name, description, price')
        .eq('active', true)
        .order('category')
        .order('price');

    if (error) {
        console.error('[SHOP] Błąd pobierania kosmetyków:', error.message);
        return [];
    }

    return (data || []).map(row => ({
        name: row.id,
        label: row.name,
        price: row.price,
        description: row.description || row.name,
        type: 'cosmetic',
        dbId: row.id,
        category: row.category,
    }));
}

async function getAllShopItems(supabase) {
    const cosmetics = await fetchCosmeticItems(supabase);
    return [...SHOP_ITEMS.map(i => ({ ...i, type: 'role' })), ...cosmetics];
}

// ── Budowanie embed sklepu ───────────────────────────────────
function buildShopEmbed(allItems, page, money) {
    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const pageItems = allItems.slice(start, start + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle('🛒 Sklep serwera')
        .setColor('#1bbdbd')
        .setDescription(
            `Masz **${money} ${COIN}** w swoim portfelu.\nKup przedmiot za pomocą komendy \`/shop\`.\n\u200b`
        )
        .setFooter({ text: `Strona ${page + 1}/${totalPages}` });

    for (const item of pageItems) {
        embed.addFields({
            name: `${item.price.toLocaleString('pl-PL')}$ - ${item.label}`,
            value: item.description,
        });
    }

    return embed;
}

// ── Budowanie komponentów (przyciski + dropdown) ─────────────
function buildShopComponents(allItems, page, money) {
    const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const pageItems = allItems.slice(start, start + ITEMS_PER_PAGE);

    const select = new StringSelectMenuBuilder()
        .setCustomId(`shop_buy_${page}`)
        .setPlaceholder('Kup przedmiot')
        .addOptions(
            pageItems.map(item => ({
                label: `${item.label} — ${item.price.toLocaleString('pl-PL')}$`,
                value: item.name,
                description: item.description.slice(0, 100),
                emoji: money >= item.price ? '✅' : '❌',
            }))
        );

    const prevBtn = new ButtonBuilder()
        .setCustomId(`shop_page_${page - 1}`)
        .setLabel('◀ Poprzednia Strona')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);

    const nextBtn = new ButtonBuilder()
        .setCustomId(`shop_page_${page + 1}`)
        .setLabel('▶ Następna Strona')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages - 1);

    return [
        new ActionRowBuilder().addComponents(prevBtn, nextBtn),
        new ActionRowBuilder().addComponents(select),
    ];
}

// ── Handler komendy /shop ─────────────────────────────────────
// UWAGA: index.js już wywołuje deferReply() przed tą funkcją,
// więc tutaj używamy tylko editReply()
async function handleShop(interaction, supabase, profile) {
    const money = profile?.money || 0;
    const allItems = await getAllShopItems(supabase);
    const embed = buildShopEmbed(allItems, 0, money);
    const components = buildShopComponents(allItems, 0, money);

    // interaction jest już zdeferowane przez index.js
    await interaction.editReply({ embeds: [embed], components });
}

// ── Handler interakcji sklepu (przyciski + dropdown) ─────────

// Discord snowflakes are always numeric, but userId still ends up
// interpolated straight into a raw PostgREST filter string below (the JS
// client's .or() has no parameterized form) -- validating the format first
// means a malformed id can never break out of the filter, rather than
// relying solely on Discord's guarantee.
async function findProfileByDiscordId(supabase, userId) {
    if (!/^\d+$/.test(userId)) return null;
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq."${userId}",discord_id.eq."${userId}"`)
        .maybeSingle();
    return data;
}

async function handleShopInteraction(interaction, supabase) {
    const id = interaction.customId;

    // Paginacja
    if (id.startsWith('shop_page_')) {
        const page = parseInt(id.split('_')[2]);
        const userId = interaction.user.id;

        const profile = await findProfileByDiscordId(supabase, userId);

        const money = profile?.money || 0;
        const allItems = await getAllShopItems(supabase);
        const embed = buildShopEmbed(allItems, page, money);
        const components = buildShopComponents(allItems, page, money);

        return interaction.update({ embeds: [embed], components });
    }

    // Zakup
    if (id.startsWith('shop_buy_')) {
        const userId = interaction.user.id;
        if (purchaseLocks.has(userId)) {
            return interaction.reply({ content: '⏳ Poprzedni zakup jeszcze się przetwarza, poczekaj chwilę.', flags: 1 << 6 });
        }
        purchaseLocks.add(userId);
        try {
            return await processShopPurchase(interaction, supabase, userId);
        } finally {
            purchaseLocks.delete(userId);
        }
    }
}

async function processShopPurchase(interaction, supabase, userId) {
        const itemName = interaction.values?.[0];
        if (!itemName) return;

        const allItems = await getAllShopItems(supabase);
        const item = allItems.find(i => i.name === itemName);
        if (!item) return interaction.reply({ content: '❌ Nie znaleziono przedmiotu.', flags: 1 << 6 });

        const profile = await findProfileByDiscordId(supabase, userId);

        if (!profile) return interaction.reply({ content: '❌ Nie masz profilu.', flags: 1 << 6 });

        const money = profile.money || 0;
        if (money < item.price) {
            return interaction.reply({
                content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${item.price.toLocaleString('pl-PL')} ${COIN}**, masz **${money} ${COIN}**.`,
                flags: 1 << 6,
            });
        }

        // Kosmetyki (ramka/kolor nicku/tło) - te same przedmioty co na stronie
        // (shop_items), kupione przez purchase_shop_item() zamiast osobnej
        // logiki tutaj. RPC dopuszcza wywołania bota (service_role) od
        // migracji add-background-shop-items.sql.
        if (item.type === 'cosmetic') {
            const { data: purchaseData, error: purchaseError } = await supabase.rpc('purchase_shop_item', {
                p_user_id: profile.id,
                p_item_id: item.dbId,
            });

            if (purchaseError) {
                const msg = purchaseError.message || '';
                if (msg.includes('already owned')) {
                    return interaction.reply({ content: `❌ Masz już **${item.label}**.`, flags: 1 << 6 });
                }
                if (msg.includes('Insufficient balance')) {
                    return interaction.reply({
                        content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${item.price.toLocaleString('pl-PL')} ${COIN}**, masz **${money} ${COIN}**.`,
                        flags: 1 << 6,
                    });
                }
                console.error('[SHOP] Błąd zakupu kosmetyku:', purchaseError.message);
                return interaction.reply({ content: '❌ Błąd zakupu. Spróbuj ponownie.', flags: 1 << 6 });
            }

            const newMoney = purchaseData?.[0]?.new_money ?? (money - item.price);
            logActivity(supabase, 'purchase', interaction.user.username, item.label);
            return interaction.reply({
                content: `✅ Kupiłeś **${item.label}** za **${item.price.toLocaleString('pl-PL')} ${COIN}**! Ustaw to na stronie w Profilu → Ustawienia. Pozostało: **${newMoney} ${COIN}**.`,
                flags: 1 << 6,
            });
        }

        // Unlike the cosmetic branch above (which rejects an already-owned
        // item before charging), role items had no repurchase guard at all -
        // member.roles.add() on a role the member already has is a silent
        // Discord no-op, so re-buying VIP/SVIP/MVIP/etc. charged the full
        // price again for literally nothing.
        //
        // X2/X3 are excluded from this guard: they're temporary multiplier
        // boosts meant to be re-bought to extend/upgrade (see the stacking
        // logic below), but nothing ever removes the Discord role when
        // multiplier_expires_at passes - the role guard alone would
        // permanently block repurchase after the very first X2/X3 buy, even
        // once the boost had long since expired.
        let member = null;
        if (item.type === 'role' && item.roleId) {
            member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) {
                return interaction.reply({ content: '❌ Nie udało się pobrać Twoich danych na serwerze. Spróbuj ponownie.', flags: 1 << 6 });
            }
            if (item.effect?.type !== 'multiplier' && member.roles.cache.has(item.roleId)) {
                return interaction.reply({ content: `❌ Masz już **${item.label}**.`, flags: 1 << 6 });
            }
        }

        const { data: purchaseData, error: purchaseError } = await supabase.rpc('increment_profile_money', {
            p_user_id: profile.id,
            p_delta: -item.price,
        });
        if (purchaseError || !purchaseData?.length) {
            return interaction.reply({
                content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${item.price.toLocaleString('pl-PL')} ${COIN}**, masz **${money} ${COIN}**.`,
                flags: 1 << 6,
            });
        }
        const newMoney = purchaseData[0].money;

        let roleGranted = true;
        if (item.type === 'role' && item.roleId) {
            try {
                await member.roles.add(item.roleId);
            } catch (e) {
                roleGranted = false;
                console.error('[SHOP] Błąd nadawania roli:', e);
            }
        }

        if (!roleGranted) {
            return interaction.reply({
                content: `⚠️ Pobrano **${item.price.toLocaleString('pl-PL')} ${COIN}**, ale nie udało się nadać roli **${item.label}**. Napisz do administracji, żeby to poprawić.`,
                flags: 1 << 6,
            });
        }

        // Real gameplay effect behind the role - see economyBonus.js. Before
        // this, VIP/SVIP/MVIP/X2/X3 only ever granted a cosmetic Discord
        // role; profiles.multiplier/vip_status etc. existed but nothing
        // wrote to them, so people paid coins for a boost that did nothing.
        if (item.effect?.type === 'vip_status') {
            const { error: effectError } = await supabase
                .from('profiles')
                .update({ [item.effect.column]: true })
                .eq('id', profile.id);
            if (effectError) console.error('[SHOP] Błąd nadawania statusu VIP:', effectError.message);
        } else if (item.effect?.type === 'multiplier') {
            // Stacks fairly: a repeat purchase while one is still active
            // extends the remaining time rather than resetting it, and the
            // multiplier only ever goes up (buying X2 after X3 doesn't
            // downgrade an already-active X3).
            const { data: current } = await supabase
                .from('profiles')
                .select('multiplier, multiplier_expires_at')
                .eq('id', profile.id)
                .maybeSingle();
            const stillActive = current?.multiplier_expires_at && new Date(current.multiplier_expires_at) > new Date();
            const newMultiplier = stillActive ? Math.max(current.multiplier, item.effect.value) : item.effect.value;
            const base = stillActive ? new Date(current.multiplier_expires_at) : new Date();
            const newExpiry = new Date(base.getTime() + item.effect.days * 24 * 60 * 60 * 1000).toISOString();
            const { error: effectError } = await supabase
                .from('profiles')
                .update({ multiplier: newMultiplier, multiplier_expires_at: newExpiry })
                .eq('id', profile.id);
            if (effectError) console.error('[SHOP] Błąd nadawania mnożnika:', effectError.message);
        }

        logActivity(supabase, 'purchase', interaction.user.username, item.label);
        return interaction.reply({
            content: `✅ Kupiłeś **${item.label}** za **${item.price.toLocaleString('pl-PL')} ${COIN}**! Pozostało: **${newMoney} ${COIN}**.`,
            flags: 1 << 6,
        });
}

module.exports = { handleShop, handleShopInteraction, SHOP_ITEMS };