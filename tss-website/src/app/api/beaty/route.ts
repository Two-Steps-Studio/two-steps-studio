import { NextResponse } from "next/server";
import { getBeats } from "@/lib/beats";

// Public read-only beat catalog, no auth check by design. Real
// table-fetch/records-fallback/sample-fallback logic lives in
// lib/beats.ts, shared with records/beats/page.tsx's server-side initial
// fetch.
export async function GET() {
  try {
    const beats = await getBeats();
    return NextResponse.json(beats);
  } catch {
    return NextResponse.json(
      { error: "Sklep z beatami niedostepny - kontakt z administratorem" },
      { status: 503 }
    );
  }
}
