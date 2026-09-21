// services.js – /uslugi: public price list of studio services (studio_services table).
// Ordering itself happens on the website (Stripe checkout needs a logged-in account).
const { EmbedBuilder } = require('discord.js');

const SITE_URL = (process.env.SITE_URL || 'https://twostepsstudio.gg').replace(/\/$/, '');
const CATEGORY_ICON = { graphics: '🎨', coding: '💻', discord: '🚀', music: '🎵' };

async function handleServices(interaction, supabase) {
    await interaction.deferReply();

    const { data: services, error } = await supabase
        .from('studio_services')
        .select('name, description, price, category')
        .eq('is_active', true)
        .order('price', { ascending: true })
        .limit(25); // Discord embed field cap

    if (error) {
        console.error('[SERVICES] Fetch error:', error.message);
        return interaction.editReply('❌ Nie udało się pobrać listy usług. Spróbuj ponownie później.');
    }

    const embed = new EmbedBuilder()
        .setColor(0x1bbdbd)
        .setTitle('🛠️ Usługi Two Steps Studio')
        .setURL(`${SITE_URL}/services`);

    if (!services || services.length === 0) {
        embed.setDescription('Aktualnie nie mamy dostępnych usług. Zajrzyj tu później!');
        return interaction.editReply({ embeds: [embed] });
    }

    embed.setDescription(`Zamów bezpośrednio na stronie: **${SITE_URL}/services**`);
    for (const s of services) {
        const icon = CATEGORY_ICON[s.category] || '✨';
        embed.addFields({
            name: `${icon} ${s.name}`.slice(0, 256),
            value: `${s.description || 'Brak opisu'}\n**${Number(s.price).toFixed(2)} PLN**`.slice(0, 1024),
            inline: false,
        });
    }
    embed.setFooter({ text: 'Płatność kartą lub BLIK przez Stripe' });

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { handleServices };
