import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { uploadGameImage, validateFile } from "@/lib/supabase-storage";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  // SECURITY: Only admins may upload game images
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'thumbnail' | 'banner' | 'screenshot';
    const gameId = formData.get('gameId') as string;

    if (!file || !type || !gameId) {
      return NextResponse.json(
        { error: "Brakujące wymagane pola: file, type, gameId" },
        { status: 400 }
      );
    }

    // SECURITY: gameId must be either a positive integer (existing game) or
    // the literal 'temp' sentinel the create-game form sends before the game
    // has a real id yet (see dev/games/page.tsx's handleImageUpload) - it's
    // only ever used to namespace the storage path, not looked up in the DB,
    // so 'temp' is safe to allow. Without this, uploading a thumbnail/banner
    // while CREATING a game always failed with this same 400, which is why
    // every game ended up with no cover image at all.
    const gameIdNum = parseInt(gameId, 10);
    const isValidId = gameId === 'temp' || (!isNaN(gameIdNum) && gameIdNum > 0);
    if (!isValidId) {
      return NextResponse.json(
        { error: "Nieprawidłowe ID gry" },
        { status: 400 }
      );
    }

    // SECURITY: Validate type parameter
    const validTypes = ['thumbnail', 'banner', 'screenshot'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Nieprawidłowy typ pliku" },
        { status: 400 }
      );
    }

    // Validate file
    validateFile(file, 'image');

    // Upload file
    const result = await uploadGameImage(type, gameId, file);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Plik został przesłany pomyślnie",
    });
  } catch (error: any) {
    console.error("[API] Upload games error:", error);
    return NextResponse.json(
      { error: error.message || "Wystąpił błąd podczas przesyłania pliku" },
      { status: 500 }
    );
  }
}
