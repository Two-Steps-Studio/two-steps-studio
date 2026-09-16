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
            let moved = true;
            await newState.member.voice.setChannel(newChannel).catch(() => { moved = false; });
            if (!moved) {
                // Member disconnected/changed state between create and move -
                // nobody will ever be "in" this channel, so the leave-based
                // cleanup below can never fire for it. Without this it's
                // orphaned permanently, not just until the next restart.
                await newChannel.delete().catch(() => {});
                return;
            }
            tempChannels.add(newChannel.id);
        } catch (e) {
            console.error('[VOICE] Błąd tworzenia kanału:', e.message);
        }
    }

    // Left a channel this feature created, and it's now empty -> clean up.
    if (oldState.channelId && tempChannels.has(oldState.channelId)) {
        const channel = oldState.channel;
        if (channel && channel.members.size === 0) {
            // Only untrack after a confirmed delete - untracking first and
            // then failing the delete (permissions, API hiccup) left the
            // channel alive on Discord but dropped from tempChannels, so
            // nothing would ever retry cleaning it up.
            try {
                await channel.delete();
                tempChannels.delete(oldState.channelId);
            } catch (e) {
                console.error('[VOICE] Błąd usuwania kanału:', e.message);
            }
        }
    }
}

module.exports = { handleVoiceStateUpdate };
