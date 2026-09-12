// Bot config editable from the website's /admin panel (bot_settings table),
// with a .env fallback so nothing breaks for anyone who hasn't touched the
// panel. Cached in memory and refreshed periodically instead of hitting the
// DB on every call - these are read in hot paths (every message/join).

const CACHE_TTL_MS = 60_000;
let cache = {};
let lastFetch = 0;

async function refresh(supabase) {
    try {
        const { data, error } = await supabase.from('bot_settings').select('key, value');
        if (error) {
            console.error('[SETTINGS] fetch error:', error.message);
            return;
        }
        cache = Object.fromEntries((data || []).map((row) => [row.key, row.value]));
        lastFetch = Date.now();
    } catch (e) {
        console.error('[SETTINGS] fetch error:', e.message);
    }
}

// Synchronous read from cache with an env fallback. Call ensureFresh()
// periodically (e.g. alongside the existing 60s stats loop) to keep the
// cache from ever going too stale.
function getSetting(key) {
    const value = cache[key];
    return value && value.trim() !== '' ? value : (process.env[key] || null);
}

async function ensureFresh(supabase) {
    if (Date.now() - lastFetch > CACHE_TTL_MS) {
        await refresh(supabase);
    }
}

module.exports = { getSetting, ensureFresh };
