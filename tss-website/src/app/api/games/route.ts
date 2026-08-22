import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { requireAuth, requireOwnership, isAuthError } from "@/lib/auth-helpers";
import type { Game, GameWithDetails } from "@/types/games-records";

// GET - Fetch all games with optional filters or single game by ID
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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    // If ID is provided, fetch single game
    if (id) {
      const gameId = parseInt(id);
      if (isNaN(gameId)) {
        return NextResponse.json(
          { error: "Nieprawidłowe ID gry" },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from("games")
        .select(`
          *,
          game_screenshots(*),
          game_requirements(*)
        `)
        .eq('id', gameId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: "Gra nie została znaleziona" },
            { status: 404 }
          );
        }
        console.error("[API] Games GET error:", error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      // A published, public game is visible to anyone (the /games/[id]
      // detail page has no login wall). Anything else -- draft, private,
      // unlisted, archived -- still requires a session.
      const isPubliclyVisible = data.visibility === 'public' && data.status === 'published';
      if (!isPubliclyVisible) {
        const auth = await requireAuth();
        if (isAuthError(auth)) return auth;
      }

      return NextResponse.json({
        success: true,
        data: data as GameWithDetails,
      });
    }

    // The public catalog (/games, /games/shop) fetches with
    // visibility=public, which the query below already scopes to public
    // rows -- no session needed to read those. Any other listing (e.g. the
    // unfiltered /dev/games admin panel, which also returns drafts/private
    // games) still requires one.
    if (visibility !== 'public') {
      const auth = await requireAuth();
      if (isAuthError(auth)) return auth;
    }

    // Otherwise fetch all games with filters
    let query = supabase
      .from("games")
      .select(`
        *,
        game_screenshots(*),
        game_requirements(*)
      `);

    // Apply filters with input sanitization
    if (visibility) {
      const validVisibilities = ['public', 'private', 'unlisted'];
      if (validVisibilities.includes(visibility)) {
        query = query.eq('visibility', visibility);
      }
    }
    if (status) {
      const validStatuses = ['draft', 'published', 'archived'];
      if (validStatuses.includes(status)) {
        query = query.eq('status', status);
      }
    }
    if (category) {
      const validCategories = ['indie', 'aaa', 'mobile', 'vr', 'arcade'];
      if (validCategories.includes(category)) {
        query = query.eq('category', category);
      }
    }
    if (featured === 'true') {
      query = query.eq('featured', true);
    }
    if (search) {
      // Sanitize search input to prevent SQL injection
      const sanitizedSearch = search.replace(/[^\w\s-]/g, '').slice(0, 100);
      if (sanitizedSearch) {
        query = query.or(`title.ilike.%${sanitizedSearch}%,short_description.ilike.%${sanitizedSearch}%,developer.ilike.%${sanitizedSearch}%`);
      }
    }

    // Order by created_at descending by default
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[API] Games GET error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as GameWithDetails[],
    });
  } catch (error) {
    console.error("[API] Games GET unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// POST - Create new game
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

  // SECURITY: Require authentication
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body: Partial<Game> = await request.json();

    // Validate required fields with sanitization
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: "Tytuł jest wymagany" },
        { status: 400 }
      );
    }

    // Sanitize title
    body.title = body.title.trim().slice(0, 200);

    // Validate and sanitize other string fields
    if (body.short_description) {
      body.short_description = body.short_description.trim().slice(0, 500);
    }
    if (body.developer) {
      body.developer = body.developer.trim().slice(0, 100);
    }
    if (body.publisher) {
      body.publisher = body.publisher.trim().slice(0, 100);
    }

    // Validate category
    const validCategories = ['indie', 'aaa', 'mobile', 'vr', 'arcade'];
    if (body.category && !validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: "Nieprawidłowa kategoria" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['draft', 'published', 'archived'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Nieprawidłowy status" },
        { status: 400 }
      );
    }

    // Validate visibility
    const validVisibilities = ['public', 'private', 'unlisted'];
    if (body.visibility && !validVisibilities.includes(body.visibility)) {
      return NextResponse.json(
        { error: "Nieprawidłowa widoczność" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("games")
      .insert({
        title: body.title,
        short_description: body.short_description,
        full_description: body.full_description,
        version: body.version,
        developer: body.developer,
        publisher: body.publisher,
        release_date: body.release_date,
        category: body.category || 'indie',
        genres: body.genres,
        tags: body.tags,
        thumbnail_url: body.thumbnail_url,
        banner_url: body.banner_url,
        download_url: body.download_url,
        changelog: body.changelog,
        status: body.status || 'draft',
        visibility: body.visibility || 'private',
        featured: body.featured || false,
      })
      .select()
      .single();

    if (error) {
      console.error("[API] Games POST error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as Game,
      message: "Gra została utworzona",
    });
  } catch (error) {
    console.error("[API] Games POST unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// PUT - Update game
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

  // SECURITY: Require authentication
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const body: Partial<Game> & { id: number } = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "ID gry jest wymagane" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("games")
      .update({
        title: body.title,
        short_description: body.short_description,
        full_description: body.full_description,
        version: body.version,
        developer: body.developer,
        publisher: body.publisher,
        release_date: body.release_date,
        category: body.category,
        genres: body.genres,
        tags: body.tags,
        thumbnail_url: body.thumbnail_url,
        banner_url: body.banner_url,
        download_url: body.download_url,
        changelog: body.changelog,
        status: body.status,
        visibility: body.visibility,
        featured: body.featured,
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: "Gra nie została znaleziona" },
          { status: 404 }
        );
      }
      console.error("[API] Games PUT error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as Game,
      message: "Gra została zaktualizowana",
    });
  } catch (error) {
    console.error("[API] Games PUT unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}

// DELETE - Delete game
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

  // SECURITY: Require authentication
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "ID gry jest wymagane" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("games")
      .delete()
      .eq('id', id);

    if (error) {
      console.error("[API] Games DELETE error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Gra została usunięta",
    });
  } catch (error) {
    console.error("[API] Games DELETE unexpected error:", error);
    return NextResponse.json(
      { error: "Wewnętrzny błąd serwera" },
      { status: 500 }
    );
  }
}
