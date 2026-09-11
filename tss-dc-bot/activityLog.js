// activityLog.js – tiny helper for the website dashboard's "live activity" feed
async function logActivity(supabase, type, username, detail = null) {
    try {
        const { error } = await supabase.from('activity_log').insert({ type, username, detail });
        if (error) console.error('[ACTIVITY LOG] insert error:', error.message);
    } catch (e) {
        // Never let a logging failure break the caller's actual work (a
        // join, level-up, or purchase already succeeded by the time this
        // runs) - this is purely a "nice to have" feed.
        console.error('[ACTIVITY LOG] error:', e.message);
    }
}

module.exports = { logActivity };
