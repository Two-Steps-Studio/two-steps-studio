// promo.js – promo code creation (admin) and redemption (everyone).
// See db/promo_codes_schema.sql for the schema and the atomic
// redeem_promo_code() RPC (locks the code row so two simultaneous
// redemptions of a limited-use code can't both slip through, and relies
// on a UNIQUE constraint to make double-redemption by the same user
// race-proof too).
const { EmbedBuilder } = require('discord.js');

// ── /promo create (admin) ──────────────────────────────────────
async function handlePromoCreate(interaction, supabase) {
    const code = interaction.options.getString('kod').trim().toUpperCase();
    const money = interaction.options.getInteger('coiny') ?? 0;
    const xp = interaction.options.getInteger('xp') ?? 0;
    const maxUses = interaction.options.getInteger('limit') ?? null;
    const days = interaction.options.getInteger('wygasa_za_dni') ?? null;

    if (money <= 0 && xp <= 0) {
        return interaction.editReply('❌ Kod musi dawać coiny, XP, albo oba.');
    }

    const expiresAt = days ? new Date(Date.now() + days * 86400000).toISOString() : null;

    const { error } = await supabase.from('promo_codes').insert({
        code,
        reward_money: money,
        reward_xp: xp,
        max_uses: maxUses,
        expires_at: expiresAt,
        created_by: interaction.user.id,
    });

    if (error) {
        if (error.code === '23505') { // unique_violation
            return interaction.editReply(`❌ Kod **${code}** już istnieje.`);
        }
        console.error('[PROMO] Create error:', error.message);
        return interaction.editReply('❌ Błąd tworzenia kodu.');
    }

    const parts = [];
    if (money > 0) parts.push(`${money} coinów`);
    if (xp > 0) parts.push(`${xp} XP`);
    await interaction.editReply(
        `✅ Kod **${code}** utworzony: ${parts.join(' + ')}` +
        (maxUses ? `, limit ${maxUses} użyć` : ', bez limitu użyć') +
        (expiresAt ? `, wygasa ${new Date(expiresAt).toLocaleDateString('pl-PL')}` : ', bez wygaśnięcia') +
        '.'
    );
}

// ── /kod (everyone) ─────────────────────────────────────────────
async function handleRedeemCode(interaction, supabase, profile) {
    const code = interaction.options.getString('kod');

    const { data, error } = await supabase.rpc('redeem_promo_code', {
        p_user_id: profile.id,
        p_code: code,
    });

    if (error) {
        console.error('[PROMO] Redeem RPC error:', error.message);
        return interaction.editReply('❌ Wystąpił błąd. Spróbuj ponownie.');
    }

    const result = data?.[0];
    if (!result?.success) {
        return interaction.editReply(`❌ ${result?.message || 'Nieprawidłowy kod.'}`);
    }

    const parts = [];
    if (result.reward_money > 0) parts.push(`**${result.reward_money}** coinów`);
    if (result.reward_xp > 0) parts.push(`**${result.reward_xp}** XP`);

    const embed = new EmbedBuilder()
        .setColor('#1bbdbd')
        .setTitle('🎁 Kod odebrany!')
        .setDescription(`Otrzymujesz: ${parts.join(' + ')}`);
    await interaction.editReply({ embeds: [embed] });
}

module.exports = { handlePromoCreate, handleRedeemCode };
