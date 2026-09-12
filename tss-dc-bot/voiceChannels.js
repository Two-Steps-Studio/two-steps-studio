// voiceChannels.js – "join to create" temporary voice channels
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getSetting } = require('./settings');

// In-memory only: a bot restart forgets which channels this feature made,
// so a temp channel emptied out during a restart won't get auto-deleted
// (same tradeoff already accepted for AFK fishing sessions elsewhere in
// this bot - an orphaned empty voice channel is just clutter, not worth
// the complexity of persisting this to the DB).
const tempChannels = new Set();

async function handleVoiceStateUpdate(oldState, newState) {
    const triggerChannelId = getSetting('JOIN_TO_CREATE_CHANNEL_ID');
    if (!triggerChannelId) return; // feature disabled unless configured

    // Joined the trigger channel -> spin up a personal channel and move them in.
    if (newState.channelId === triggerChannelId && oldState.channelId !== triggerChannelId) {
        try {
            const guild = newState.guild;
            const triggerChannel = newState.channel;
            const newChannel = await guild.channels.create({
                name: `Kanał ${newState.member.displayName}`.slice(0, 90),
                type: ChannelType.GuildVoice,
                parent: triggerChannel?.parentId ?? null,
                permissionOverwrites: [
                    {
                        id: newState.member.id,
                        allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers],
                    },
                ],
            });
            tempChannels.add(newChannel.id);
            await newState.member.voice.setChannel(newChannel).catch(() => {});
        } catch (e) {
            console.error('[VOICE] Błąd tworzenia kanału:', e.message);
        }
    }

    // Left a channel this feature created, and it's now empty -> clean up.
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
        const channel = oldState.channel;
        if (channel && channel.members.size === 0) {
            tempChannels.delete(oldState.channelId);
            await channel.delete().catch(e => console.error('[VOICE] Błąd usuwania kanału:', e.message));
        }
    }
}

module.exports = { handleVoiceStateUpdate };
