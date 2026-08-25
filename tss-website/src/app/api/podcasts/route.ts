import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import type { Podcast, PodcastWithSeries } from "@/types/games-records";

// GET - Fetch all podcasts with optional filters
export async function GET(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Baza danych niedostępna" },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const visibility = searchParams.get('visibility');
    const season = searchParams.get('season');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    // If ID is provided, fetch single podcast
    if (id) {
      const podcastId = parseInt(id);
      if (isNaN(podcastId)) {
        return NextResponse.json(
          { error: "Nieprawidłowe ID podcastu" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("podcasts")
        .select(`
          *,
          podcast_series(*)
        `)
        .eq('id', podcastId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: "Podcast nie został znaleziony" },
            { status: 404 }
          );
        }
        console.error("[API] Podcasts GET error:", error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data as PodcastWithSeries,
      });
    }

    // Otherwise fetch all podcasts with filters
    let query = supabase
      .from("podcasts")
      .select(`
        *,
        podcast_series(*)
      `);

    // Apply filters
    if (visibility) {
      query = query.eq('visibility', visibility);
    }
    if (season) {
      const seasonNum = parseInt(season);
      if (!isNaN(seasonNum)) {
        query = query.eq('season', seasonNum);
      }
    }
    if (featured === 'true') {
      query = query.eq('featured', true);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,host.ilike.%${search}%`);
    }

    // Order by created_at descending by default
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[API] Podcasts GET error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as PodcastWithSeries[],
    });
  } catch (error) {
    console.error("[API] Podcasts GET unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// POST - Create new podcast
export async function POST(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Baza danych niedostępna" },
      { status: 503 }
    );
  }

  // SECURITY: Only admins may publish podcasts
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;
  const serviceClient = createServiceClient();

  try {
    const body: Partial<Podcast> = await request.json();

    // Validate required fields
    if (!body.title) {
      return NextResponse.json(
        { error: "Tytuł jest wymagany" },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from("podcasts")
      .insert({
        series_id: body.series_id,
        title: body.title,
        description: body.description,
        episode_number: body.episode_number,
        season: body.season || 1,
        host: body.host,
        guests: body.guests,
        thumbnail_url: body.thumbnail_url,
        audio_file_url: body.audio_file_url,
        published_date: body.published_date,
        duration_seconds: body.duration_seconds,
        tags: body.tags,
        visibility: body.visibility || 'private',
        featured: body.featured || false,
      })
      .select()
      .single();

    if (error) {
      console.error("[API] Podcasts POST error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as Podcast,
      message: "Podcast został utworzony",
    });
  } catch (error) {
    console.error("[API] Podcasts POST unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// PUT - Update podcast
export async function PUT(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Baza danych niedostępna" },
      { status: 503 }
    );
  }

  // SECURITY: Only admins may edit podcasts
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;
  const serviceClient = createServiceClient();

  try {
    const body: Partial<Podcast> & { id: number } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID podcastu jest wymagane" },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from("podcasts")
      .update({
        series_id: body.series_id,
        title: body.title,
        description: body.description,
        episode_number: body.episode_number,
        season: body.season,
        host: body.host,
        guests: body.guests,
        thumbnail_url: body.thumbnail_url,
        audio_file_url: body.audio_file_url,
        published_date: body.published_date,
        duration_seconds: body.duration_seconds,
        tags: body.tags,
        visibility: body.visibility,
        featured: body.featured,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Podcast nie został znaleziony" },
          { status: 404 }
        );
      }
      console.error("[API] Podcasts PUT error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as Podcast,
      message: "Podcast został zaktualizowany",
    });
  } catch (error) {
    console.error("[API] Podcasts PUT unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// DELETE - Delete podcast
export async function DELETE(request: Request) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return NextResponse.json(
      { error: "Baza danych niedostępna" },
      { status: 503 }
    );
  }

  // SECURITY: Only admins may delete podcasts
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;
  const serviceClient = createServiceClient();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID podcastu jest wymagane" },
        { status: 400 }
      );
    }

    const { error } = await serviceClient
      .from("podcasts")
      .delete()
      .eq('id', id);

    if (error) {
      console.error("[API] Podcasts DELETE error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Podcast został usunięty",
    });
  } catch (error) {
    console.error("[API] Podcasts DELETE unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}
