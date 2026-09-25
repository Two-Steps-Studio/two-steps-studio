import { createServiceClient } from "@/lib/supabase-server";

// Shared between api/beaty/route.ts (client-side purchase flow needs a
// JSON endpoint) and records/beats/page.tsx (server-rendered initial
// list) - extracted so the real-table/records-fallback/sample-fallback
// logic isn't duplicated between the two.

export type BeatTier = "free" | "basic" | "premium" | "unlimited" | "exclusive";

export interface BeatPackage {
  tier: BeatTier;
  price: number;
  description: string;
  features: string[];
  stripe_price_id?: string;
}

export interface Beat {
  id: string;
  title: string;
  description?: string;
  bpm?: number;
  key?: string;
  duration?: number;
  audio_url?: string;
  preview_url?: string;
  cover_image?: string;
  packages: BeatPackage[];
  status: "available" | "sold" | "reserved";
  upload_date?: string;
}

const DEFAULT_PACKAGES: Record<BeatTier, { features: string[] }> = {
  free: { features: ["Użycie niekomercyjne", "Tylko streaming", "Bez dystrybucji"] },
  basic: { features: ["Użycie komercyjne", "Do 100k streamów", "1 projekt"] },
  premium: { features: ["Użycie komercyjne", "Do 500k streamów", "3 projekty", "Wersja WAV"] },
  unlimited: { features: ["Użycie komercyjne", "Nielimitowane streamy", "Nielimitowane projekty", "Wersja WAV + stems"] },
  exclusive: { features: ["Pełne prawa autorskie", "Beat usuwany ze sklepu", "Wszystkie formaty", "Priorytetowe wsparcie"] },
};

function defaultPackagesFor(prices: { basic: number; premium: number; unlimited: number; exclusive: number }): BeatPackage[] {
  return [
    { tier: "free", price: 0, description: "Darmowy beat", features: DEFAULT_PACKAGES.free.features },
    { tier: "basic", price: prices.basic, description: "Podstawowa licencja", features: DEFAULT_PACKAGES.basic.features },
    { tier: "premium", price: prices.premium, description: "Rozszerzona licencja", features: DEFAULT_PACKAGES.premium.features },
    { tier: "unlimited", price: prices.unlimited, description: "Nieograniczona licencja", features: DEFAULT_PACKAGES.unlimited.features },
    { tier: "exclusive", price: prices.exclusive, description: "Ekskluzywne prawa", features: DEFAULT_PACKAGES.exclusive.features },
  ];
}

// Public read-only beat catalog, no auth check by design. Uses the
// service client - verified live that beats/records have RLS with no
// anon-read policy, so an anon-key client silently returned zero rows.
export async function getBeats(): Promise<Beat[]> {
  const supabase = createServiceClient();

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
    throw error;
  }

  if (!beats || beats.length === 0) {
    // Spróbuj z records (stara struktura)
    const { data: records } = await supabase
      .from("records")
      .select("*")
      .eq("type", "beat")
      .order("upload_date", { ascending: false });

    if (records && records.length > 0) {
      return records.map((record) => ({
        id: record.id,
        title: record.title,
        description: record.description,
        upload_date: record.upload_date,
        bpm: record.bpm,
        key: record.key,
        status: "available" as const,
        packages: defaultPackagesFor({ basic: 29.99, premium: 59.99, unlimited: 99.99, exclusive: 199.99 }),
      }));
    }

    // Brak danych - zwróć przykładowe beaty
    return [
      {
        id: "sample-1",
        title: "Night Drive",
        description: "Mroczny beat w stylu trap",
        bpm: 140,
        key: "Cm",
        status: "available" as const,
        upload_date: new Date().toISOString(),
        packages: defaultPackagesFor({ basic: 29.99, premium: 59.99, unlimited: 99.99, exclusive: 199.99 }),
      },
      {
        id: "sample-2",
        title: "Summer Vibes",
        description: "Letni beat popowy",
        bpm: 120,
        key: "Gm",
        status: "available" as const,
        upload_date: new Date().toISOString(),
        packages: defaultPackagesFor({ basic: 39.99, premium: 69.99, unlimited: 119.99, exclusive: 249.99 }),
      },
    ];
  }

  // Formatuj beaty z pakietami
  return beats.map((beat) => ({
    ...beat,
    packages: beat.packages?.map((p: any) => ({
      tier: p.tier,
      price: parseFloat(p.price),
      description: p.description || `${p.tier} license`,
      features: Array.isArray(p.features) ? p.features : DEFAULT_PACKAGES[p.tier as BeatTier]?.features || [],
      stripe_price_id: p.stripe_price_id,
    })) || defaultPackagesFor({ basic: 29.99, premium: 59.99, unlimited: 99.99, exclusive: 199.99 }),
  }));
}
