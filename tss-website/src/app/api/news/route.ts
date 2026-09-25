import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface NewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
  author?: string;
}

export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    const errorMessage = process.env.NODE_ENV === 'development'
      ? 'Supabase service unavailable - check configuration'
      : 'Service temporarily unavailable';
    return NextResponse.json({ error: errorMessage }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // news/page.tsx and news-feed.tsx both treat a null published_at as an
    // unpublished/"moderated" draft (they render a red "Moderated" badge
    // for it) - but this route had no filter at all, so every visitor,
    // not just staff, got the full title/content of drafts nobody had
    // approved yet, the moment they were created. Publish date can also be
    // in the future (scheduled posts), so gate on that too.
    let query = supabase
      .from('news')
      .select('*')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString());

    if (id) {
      const { data: item, error } = await query.eq('id', id).single();
      if (error || !item) {
        return NextResponse.json({ error: 'Nie znaleziono newsa' }, { status: 404 });
      }
      return NextResponse.json(item);
    }

    const { data: news, error } = await query
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Supabase error:', error);
      const errorMessage = process.env.NODE_ENV === 'development'
        ? `Database error: ${error.message}`
        : 'Failed to load news';
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    return NextResponse.json(news || []);
  } catch (err: any) {
    console.error('Unexpected news error:', err);
    const errorMessage = process.env.NODE_ENV === 'development'
      ? `Unexpected error: ${err.message}`
      : 'Failed to load news';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
