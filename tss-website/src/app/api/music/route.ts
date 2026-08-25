import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase-server";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";
import type { MusicTrack } from "@/types/games-records";

// GET - Fetch all music tracks with optional filters or single track by ID
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
    const genre = searchParams.get('genre');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    // If ID is provided, fetch single track
    if (id) {
      const trackId = parseInt(id);
      if (isNaN(trackId)) {
        return NextResponse.json(
          { error: "Nieprawidłowe ID utworu" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("music_tracks")
        .select("*")
        .eq('id', trackId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: "Utwór nie został znaleziony" },
            { status: 404 }
          );
        }
        console.error("[API] Music GET error:", error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data as MusicTrack,
      });
    }

    // Otherwise fetch all tracks with filters
    let query = supabase
      .from("music_tracks")
      .select("*");

    // Apply filters
    if (visibility) {
      query = query.eq('visibility', visibility);
    }
    if (genre) {
      query = query.eq('genre', genre);
    }
    if (featured === 'true') {
      query = query.eq('featured', true);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%,album.ilike.%${search}%`);
    }

    // Order by created_at descending by default
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[API] Music GET error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as MusicTrack[],
    });
  } catch (error) {
    console.error("[API] Music GET unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// POST - Create new music track
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

  // SECURITY: Only admins may publish music
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;
  const serviceClient = createServiceClient();

  try {
    const body: Partial<MusicTrack> = await request.json();

    // Validate required fields
    if (!body.title || !body.artist) {
      return NextResponse.json(
        { error: "Tytuł i wykonawca są wymagane" },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from("music_tracks")
      .insert({
        title: body.title,
        artist: body.artist,
        album: body.album,
        genre: body.genre || 'indie',
        release_date: body.release_date,
        duration_seconds: body.duration_seconds,
        cover_image_url: body.cover_image_url,
        audio_file_url: body.audio_file_url,
        description: body.description,
        lyrics: body.lyrics,
        spotify_url: body.spotify_url,
        youtube_url: body.youtube_url,
        soundcloud_url: body.soundcloud_url,
        tags: body.tags,
        visibility: body.visibility || 'private',
        featured: body.featured || false,
      })
      .select()
      .single();

    if (error) {
      console.error("[API] Music POST error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as MusicTrack,
      message: "Utwór został utworzony",
    });
  } catch (error) {
    console.error("[API] Music POST unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// PUT - Update music track
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

  // SECURITY: Only admins may edit music
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;
  const serviceClient = createServiceClient();

  try {
    const body: Partial<MusicTrack> & { id: number } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID utworu jest wymagane" },
        { status: 400 }
      );
    }

    const { data, error } = await serviceClient
      .from("music_tracks")
      .update({
        title: body.title,
        artist: body.artist,
        album: body.album,
        genre: body.genre,
        release_date: body.release_date,
        duration_seconds: body.duration_seconds,
        cover_image_url: body.cover_image_url,
        audio_file_url: body.audio_file_url,
        description: body.description,
        lyrics: body.lyrics,
        spotify_url: body.spotify_url,
        youtube_url: body.youtube_url,
        soundcloud_url: body.soundcloud_url,
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
          { error: "Utwór nie został znaleziony" },
          { status: 404 }
        );
      }
      console.error("[API] Music PUT error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as MusicTrack,
      message: "Utwór został zaktualizowany",
    });
  } catch (error) {
    console.error("[API] Music PUT unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// DELETE - Delete music track
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

  // SECURITY: Only admins may delete music
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
        { error: "ID utworu jest wymagane" },
        { status: 400 }
      );
    }

    const { error } = await serviceClient
      .from("music_tracks")
      .delete()
      .eq('id', id);

    if (error) {
      console.error("[API] Music DELETE error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Utwór został usunięty",
    });
  } catch (error) {
    console.error("[API] Music DELETE unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}
