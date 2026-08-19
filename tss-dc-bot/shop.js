const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

// ── Definicja przedmiotów sklepu ─────────────────────────────
const SHOP_ITEMS = [
    {
        name: 'VIP',
        label: '〔 🐨 ︱ VIP 〕',
        price: 1500,
        description: 'VIP',
        type: 'role',
        // Discord snowflakes exceed Number.MAX_SAFE_INTEGER — as bare number
        // literals these silently lost precision, so every role grant below
        // was attempted with a corrupted, non-existent id. Must stay strings.
        roleId: '1448013683526467756',
    },
    {
        name: 'SVIP',
        label: '〔 🐄 ︱ SVIP 〕',
        price: 3000,
        description: 'SVIP',
        type: 'role',
        roleId: '1448017195790635099',
    },
    {
        name: 'MVIP',
        label: '〔 🦣 ︱ MVIP 〕',
        price: 6000,
        description: 'MVIP',
        type: 'role',
        roleId: '1448017207501000908',
    },
    {
        name: 'X2',
        label: '〔 ✖️ ︱ X2 〕',
        price: 6000,
        description: 'X2',
        type: 'role',
        roleId: '1362307366372114582',
    },
    {
        name: 'X3',
        label: '〔 ✖️ ︱ X3 〕',
        price: 10000,
        description: 'X3',
        type: 'role',
        roleId: '1362307473804886168',
    },
];

const ITEMS_PER_PAGE = 10;
// Matches the coin emoji used everywhere else in the bot (index.js,
// fishing/*, wedka.js) — this file was the only one on a different id.
const COIN = '<:CoinTSS:1486049846132605042>';

// ── Budowanie embed sklepu ───────────────────────────────────
function buildShopEmbed(page, money) {
    const totalPages = Math.ceil(SHOP_ITEMS.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const pageItems = SHOP_ITEMS.slice(start, start + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle('🛒 Sklep serwera')
        .setColor('#1bbdbd')
        .setDescription(
            `Masz **${money} ${COIN}** w swoim portfelu.\nKup przedmiot za pomocą komendy \`/sklep\`.\n\u200b`
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
function buildShopComponents(page, money) {
    const totalPages = Math.ceil(SHOP_ITEMS.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const pageItems = SHOP_ITEMS.slice(start, start + ITEMS_PER_PAGE);

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

// ── Handler komendy /sklep ───────────────────────────────────
// UWAGA: index.js już wywołuje deferReply() przed tą funkcją,
// więc tutaj używamy tylko editReply()
async function handleShop(interaction, supabase, profile) {
    const money = profile?.money || 0;
    const embed = buildShopEmbed(0, money);
    const components = buildShopComponents(0, money);

    // interaction jest już zdeferowane przez index.js
    await interaction.editReply({ embeds: [embed], components });
}

// ── Handler interakcji sklepu (przyciski + dropdown) ─────────
async function handleShopInteraction(interaction, supabase) {
    const id = interaction.customId;

    // Paginacja
    if (id.startsWith('shop_page_')) {
        const page = parseInt(id.split('_')[2]);
        const userId = interaction.user.id;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .or(`id.eq."${userId}",discord_id.eq."${userId}"`)
            .maybeSingle();

        const money = profile?.money || 0;
        const embed = buildShopEmbed(page, money);
        const components = buildShopComponents(page, money);

        return interaction.update({ embeds: [embed], components });
    }

    // Zakup
    if (id.startsWith('shop_buy_')) {
        const itemName = interaction.values?.[0];
        if (!itemName) return;

        const item = SHOP_ITEMS.find(i => i.name === itemName);
        if (!item) return interaction.reply({ content: '❌ Nie znaleziono przedmiotu.', flags: 1 << 6 });

        const userId = interaction.user.id;
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .or(`id.eq."${userId}",discord_id.eq."${userId}"`)
            .maybeSingle();

        if (!profile) return interaction.reply({ content: '❌ Nie masz profilu.', flags: 1 << 6 });

        const money = profile.money || 0;
        if (money < item.price) {
            return interaction.reply({
                content: `❌ Nie masz wystarczająco monet! Potrzebujesz **${item.price.toLocaleString('pl-PL')} ${COIN}**, masz **${money} ${COIN}**.`,
                flags: 1 << 6,
            });
        }

        const newMoney = money - item.price;
        await supabase.from('profiles').update({ money: newMoney }).eq('id', profile.id);

        let roleGranted = true;
        if (item.type === 'role' && item.roleId) {
            try {
                const member = await interaction.guild.members.fetch(userId);
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

        return interaction.reply({
            content: `✅ Kupiłeś **${item.label}** za **${item.price.toLocaleString('pl-PL')} ${COIN}**! Pozostało: **${newMoney} ${COIN}**.`,
            flags: 1 << 6,
        });
    }
}

module.exports = { handleShop, handleShopInteraction, SHOP_ITEMS };