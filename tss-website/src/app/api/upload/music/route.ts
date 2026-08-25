import { NextResponse } from "next/server";
import { uploadMusicFile, validateFile } from "@/lib/supabase-storage";
import { requireAuth, requireAdmin, isAuthError } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  // SECURITY: Only admins may upload music content
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'audio' | 'cover';
    const musicId = formData.get('musicId') as string;

    if (!file || !type || !musicId) {
      return NextResponse.json(
        { error: "Brakujące wymagane pola: file, type, musicId" },
        { status: 400 }
      );
    }

    // Validate file based on type
    validateFile(file, type === 'audio' ? 'audio' : 'image');

    // Upload file
    const result = await uploadMusicFile(musicId, file, type);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Plik został przesłany pomyślnie",
    });
  } catch (error: any) {
    console.error("[API] Upload music error:", error);
    return NextResponse.json(
      { error: error.message || "Wystąpił błąd podczas przesyłania pliku" },
      { status: 500 }
    );
  }
}
