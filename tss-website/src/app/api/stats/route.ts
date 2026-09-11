import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { online_users: 0, member_count: 0, total_members: 0, messages_today: 0, total_voice_minutes: 0, bot_online: false },
      { status: 503 }
    );
  }

  try {
    // messages_today stays Discord-only (bot-tracked counter, no website
    // equivalent) regardless of which stats source below ends up used.
    // Was read via the anon-key session-bound client before - discord_stats
    // has RLS with no anon-read policy (verified live this session, same
    // as several other tables), so messages_today (and bot_online below)
    // silently always came back empty/false for every visitor.
    let discordStats: { member_count?: number; online_users?: number; messages_today?: number; recorded_at?: string } | null = null;
    try {
      const { data } = await supabase
        .from('discord_stats')
        .select('member_count, online_users, messages_today, recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      discordStats = data;
    } catch {
      // Table/row not available yet - defaults below cover it.
    }

    // The bot upserts this row every 60s - if the last write is more than
    // ~2.5x that interval old, it's a reasonable bet the bot is down
    // (crashed, container stopped, etc.) rather than just running slightly
    // behind schedule.
    const botOnline = discordStats?.recorded_at
      ? Date.now() - new Date(discordStats.recorded_at).getTime() < 150_000
      : false;

    // Unified members/online, combining Discord (written by the bot into
    // discord_stats) with the website's own accounts/sessions - see
    // db/migrations/add-unified-stats.sql. Falls back to Discord-only
    // numbers (the old behavior) if that migration isn't deployed yet.
    const { data: unified, error: unifiedError } = await supabase.rpc('get_unified_stats').single();

    const totalMembers = unifiedError ? (discordStats?.member_count || 0) : (unified?.total_members ?? 0);
    const totalOnline = unifiedError ? (discordStats?.online_users || 0) : (unified?.total_online ?? 0);
    const totalVoiceMinutes = unifiedError ? 0 : (unified?.total_voice_minutes ?? 0);
    if (unifiedError) console.error('get_unified_stats RPC error:', unifiedError.message);

    return NextResponse.json({
      online_users: totalOnline,
      total_members: totalMembers,
      member_count: totalMembers,
      messages_today: discordStats?.messages_today || 0,
      total_voice_minutes: totalVoiceMinutes,
      bot_online: botOnline,
    });
  } catch (err: any) {
    console.error('Unexpected stats error:', err);
    return NextResponse.json({
      online_users: 0,
      total_members: 0,
      member_count: 0,
      bot_online: false,
      messages_today: 0,
      total_voice_minutes: 0,
    });
  }
}
