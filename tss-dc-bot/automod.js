// automod.js – spam / invite-link / mass-mention / blocked-word filtering
const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getSetting } = require('./settings');

const SPAM_WINDOW_MS = 5000;
const SPAM_THRESHOLD = 5;   // messages within the window
const MENTION_LIMIT = 5;    // combined user+role mentions in one message
const INVITE_REGEX = /(discord\.gg\/|discord(app)?\.com\/invite\/)/i;

// userId -> recent message timestamps, for the spam-rate check
const messageTimestamps = new Map();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// BLOCKED_WORDS is admin-editable from /admin/bot (comma-separated), same
// bot_settings key/value store as every other runtime-configurable knob -
// no new table needed. Rebuilt from the raw setting string on every message
// rather than cached separately, since settings.js already caches the
// underlying value for 60s.
function getBlockedWordPatterns() {
    const raw = getSetting('BLOCKED_WORDS');
    if (!raw) return [];
    return raw.split(',').map((w) => w.trim()).filter(Boolean)
        .map((w) => new RegExp(`\\b${escapeRegex(w)}\\b`, 'i'));
}

async function notifyAndMaybeCleanup(message, reason) {
    try {
        const warning = await message.channel.send({ content: `⚠️ ${message.author}, ${reason}` });
        setTimeout(() => warning.delete().catch(() => {}), 6000);
    } catch { /* channel perms hiccup, not worth crashing over */ }
}

/**
 * Returns true if the message was acted on (deleted) and the caller should
 * stop processing it further (no XP, doesn't count toward messagesToday).
 */
async function checkAutoMod(message, sendModLog) {
    // Mods/admins are exempt - ManageMessages is the natural "trusted to
    // post links/pings freely" bar, same permission Discord itself uses
    // to gate message-deletion.
    if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    let violation = null;

    if (getBlockedWordPatterns().some((re) => re.test(message.content))) {
        violation = 'zablokowane słowo';
    } else if (INVITE_REGEX.test(message.content)) {
        violation = 'link z zaproszeniem na inny serwer';
    } else if (message.mentions.users.size + message.mentions.roles.size > MENTION_LIMIT) {
        violation = 'zbyt wiele wzmianek w jednej wiadomości';
    } else {
        const now = Date.now();
        const recent = (messageTimestamps.get(message.author.id) || []).filter(t => now - t < SPAM_WINDOW_MS);
        recent.push(now);
        messageTimestamps.set(message.author.id, recent);
        if (recent.length > SPAM_THRESHOLD) {
            violation = 'zbyt szybkie wysyłanie wiadomości (spam)';
        }
    }

    if (!violation) return false;

    await message.delete().catch(() => {});
    await notifyAndMaybeCleanup(message, `wiadomość usunięta - ${violation}.`);

    if (sendModLog && message.guild) {
        const embed = new EmbedBuilder()
            .setColor('#c0392b')
            .setTitle('🛡️ Auto-moderacja')
            .addFields(
                { name: 'Użytkownik', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Kanał', value: `${message.channel}`, inline: true },
                { name: 'Powód', value: violation, inline: false },
                { name: 'Treść', value: (message.content || '*brak*').slice(0, 512), inline: false },
            )
            .setTimestamp();
        await sendModLog(message.guild, embed);
    }

    return true;
}

module.exports = { checkAutoMod };
