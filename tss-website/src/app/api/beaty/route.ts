import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

const DEFAULT_PACKAGES = {
  free: { features: ["Użycie niekomercyjne", "Tylko streaming", "Bez dystrybucji"] },
  basic: { features: ["Użycie komercyjne", "Do 100k streamów", "1 projekt"] },
  premium: { features: ["Użycie komercyjne", "Do 500k streamów", "3 projekty", "Wersja WAV"] },
  unlimited: { features: ["Użycie komercyjne", "Nielimitowane streamy", "Nielimitowane projekty", "Wersja WAV + stems"] },
  exclusive: { features: ["Pełne prawa autorskie", "Beat usuwany ze sklepu", "Wszystkie formaty", "Priorytetowe wsparcie"] },
};

// Public read-only beat catalog, no auth check by design. Was using the
// anon-key session-bound client - verified live that beats/records have
// RLS with no anon-read policy (same symptom already found and fixed for
// several other tables this session), so every real beat (including one,
// "Dark Energy", not even represented by the hardcoded sample-data
// fallback below) silently returned zero rows and this route quietly
// served fake placeholder products instead of a visible error.
export async function GET() {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Sklep z beatami niedostepny - kontakt z administratorem" },
      { status: 503 }
    );
  }

  try {

    // Najpierw spróbuj pobrać z nowej tabeli beats z pakietami
    const { data: beats, error } = await supabase
      .from("beats")
      .select(`
        *,
        packages:beat_packages(*)
      `)
      .order("upload_date", { ascending: false });

    if (error) {
      console.error("Błąd pobierania beatów:", error);
      return NextResponse.json(
        { error: "Sklep z beatami niedostepny - kontakt z administratorem" },
        { status: 503 }
      );
    }

    if (!beats || beats.length === 0) {
      // Spróbuj z records (stara struktura)
      const { data: records } = await supabase
        .from("records")
        .select("*")
        .eq("type", "beat")
        .order("upload_date", { ascending: false });

      if (records && records.length > 0) {
        const convertedBeats = records.map((record) => ({
          id: record.id,
          title: record.title,
          description: record.description,
          upload_date: record.upload_date,
          bpm: record.bpm,
          key: record.key,
          status: "available" as const,
          packages: [
            { tier: "free", price: 0, description: "Darmowy beat", features: DEFAULT_PACKAGES.free.features },
            { tier: "basic", price: 29.99, description: "Podstawowa licencja", features: DEFAULT_PACKAGES.basic.features },
            { tier: "premium", price: 59.99, description: "Rozszerzona licencja", features: DEFAULT_PACKAGES.premium.features },
            { tier: "unlimited", price: 99.99, description: "Nieograniczona licencja", features: DEFAULT_PACKAGES.unlimited.features },
            { tier: "exclusive", price: 199.99, description: "Ekskluzywne prawa", features: DEFAULT_PACKAGES.exclusive.features },
          ],
        }));
        return NextResponse.json(convertedBeats);
      }

      // Brak danych - zwróć przykładowe beaty
      const sampleBeats = [
        {
          id: "sample-1",
          title: "Night Drive",
          description: "Mroczny beat w stylu trap",
          bpm: 140,
          key: "Cm",
          status: "available" as const,
          upload_date: new Date().toISOString(),
          packages: [
            { tier: "free", price: 0, description: "Darmowy beat", features: DEFAULT_PACKAGES.free.features },
            { tier: "basic", price: 29.99, description: "Podstawowa licencja", features: DEFAULT_PACKAGES.basic.features },
            { tier: "premium", price: 59.99, description: "Rozszerzona licencja", features: DEFAULT_PACKAGES.premium.features },
            { tier: "unlimited", price: 99.99, description: "Nieograniczona licencja", features: DEFAULT_PACKAGES.unlimited.features },
            { tier: "exclusive", price: 199.99, description: "Ekskluzywne prawa", features: DEFAULT_PACKAGES.exclusive.features },
          ],
        },
        {
          id: "sample-2",
          title: "Summer Vibes",
          description: "Letni beat popowy",
          bpm: 120,
          key: "Gm",
          status: "available" as const,
          upload_date: new Date().toISOString(),
          packages: [
            { tier: "free", price: 0, description: "Darmowy beat", features: DEFAULT_PACKAGES.free.features },
            { tier: "basic", price: 39.99, description: "Podstawowa licencja", features: DEFAULT_PACKAGES.basic.features },
            { tier: "premium", price: 69.99, description: "Rozszerzona licencja", features: DEFAULT_PACKAGES.premium.features },
            { tier: "unlimited", price: 119.99, description: "Nieograniczona licencja", features: DEFAULT_PACKAGES.unlimited.features },
            { tier: "exclusive", price: 249.99, description: "Ekskluzywne prawa", features: DEFAULT_PACKAGES.exclusive.features },
          ],
        },
      ];
      return NextResponse.json(sampleBeats);
    }

    // Formatuj beaty z pakietami
    const formattedBeats = beats.map((beat) => ({
      ...beat,
      packages: beat.packages?.map((p: any) => ({
        tier: p.tier,
        price: parseFloat(p.price),
        description: p.description || `${p.tier} license`,
        features: Array.isArray(p.features) ? p.features : DEFAULT_PACKAGES[p.tier as keyof typeof DEFAULT_PACKAGES]?.features || [],
        stripe_price_id: p.stripe_price_id,
      })) || [
        { tier: "free", price: 0, description: "Darmowy beat", features: DEFAULT_PACKAGES.free.features },
        { tier: "basic", price: 29.99, description: "Podstawowa licencja", features: DEFAULT_PACKAGES.basic.features },
        { tier: "premium", price: 59.99, description: "Rozszerzona licencja", features: DEFAULT_PACKAGES.premium.features },
        { tier: "unlimited", price: 99.99, description: "Nieograniczona licencja", features: DEFAULT_PACKAGES.unlimited.features },
        { tier: "exclusive", price: 199.99, description: "Ekskluzywne prawa", features: DEFAULT_PACKAGES.exclusive.features },
      ],
    }));

    return NextResponse.json(formattedBeats);
  } catch (error) {
    console.error("Błąd API beaty:", error);
    return NextResponse.json([]);
  }
}
