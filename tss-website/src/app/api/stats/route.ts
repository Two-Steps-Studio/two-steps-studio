import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { online_users: 0, member_count: 0, site_accounts: 0 },
      { status: 503 }
    );
  }

  try {
    // Pobierz najnowsze statystyki Discorda z bazy danych
    let discordStats = null;
    try {
      const { data, error } = await supabase
        .from('discord_stats')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      if (!error) {
        discordStats = data;
      }
    } catch (e) {
      // Table doesn't exist or other error, continue with defaults
      console.log('discord_stats table not available, using defaults');
    }

    // Pobierz całkowitą liczbę użytkowników z bazy profiles (nie z Discorda)
    let siteAccounts = 0;
    try {
      // 'estimated' reads Postgres's own row-count statistics instead of doing
      // a full COUNT(*) scan on every request - this widget only needs a
      // rough number, not an exact one.
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'estimated', head: true });
      siteAccounts = count || 0;
    } catch (e) {
      console.log('profiles table not available');
    }

    // Zwróć dane w nowym formacie
    const response: any = {
      online_users: discordStats?.online_users || 0,
      total_members: discordStats?.member_count || siteAccounts || 0,
      messages_today: discordStats?.messages_today || 0,
      member_count: discordStats?.member_count || siteAccounts || 0,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('Unexpected stats error:', err);
    return NextResponse.json({
      online_users: 0,
      total_members: 0,
      messages_today: 0,
      member_count: 0,
    });
  }
}

