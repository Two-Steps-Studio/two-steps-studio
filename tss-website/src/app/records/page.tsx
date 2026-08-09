import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Beatmapy i Muzyka — Two Steps Studio',
  description: 'Beattmapy, podcasty i oryginalna muzyka. Odkryj najnowsze wydania ze Studia Two Steps. Łącz się z fanami i twórcami.',
  openGraph: {
    title: 'Beatmapy i Muzyka — Two Steps Studio',
    description: 'Beaty, podcasty i oryginalna muzyka. Odkryj najnowsze wydania ze Studia Two Steps.',
    url: 'https://twostepsstudio.vercel.app/records',
  },
};

import { createClient } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Mic2, Calendar } from "lucide-react";

// Mark this as server component with ISR
export const revalidate = 3600; // Revalidate every hour

export default async function RecordsPage() {
  console.log('[BUILD] RecordsPage starting at', new Date().toISOString());
  let supabase: any = null;
  let createClientError: Error | null = null;

  try {
    supabase = await createClient();
    console.log('[BUILD] Supabase client created at', new Date().toISOString());
  } catch (err) {
    createClientError = err as Error;
    console.error('[RECORDS] Failed to create Supabase client:', createClientError.message);
    return <div className="p-20 text-center">Błąd konfiguracji Supabase</div>;
  }

  if (!supabase) {
    return <div className="p-20 text-center">Błąd konfiguracji Supabase</div>;
  }

  const { data: records, error } = await supabase.from("records").select("*").order("upload_date", { ascending: false });
  console.log('[BUILD] Records fetched:', records?.length || 0, 'records at', new Date().toISOString());

  if (error) {
    console.error('[RECORDS] Error fetching data:', error.message);
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
       {/* Hero Section */}
       <div className="relative mb-16 p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-records)]/20 via-transparent to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-records)]/20 blur-3xl animate-pulse" />
          
          <div className="relative z-10 space-y-4">
             <Badge className="bg-[var(--color-records)]/20 text-[var(--color-records)] hover:bg-[var(--color-records)]/30 border-0 px-4 py-1.5 text-sm font-medium rounded-full backdrop-blur-sm">
                Two Steps Studio
             </Badge>
             <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
                <span className="text-[var(--color-records)]">Records</span>
             </h1>
             <p className="text-zinc-400 max-w-2xl font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
                Podcasty, beaty i muzyka. Posłuchaj tego, co tworzymy w naszym studio.
             </p>
          </div>
       </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
                { name: "Beaty", href: "/records/beats" },
                { name: "Podscasty", href: "/records/podcasts" },
                { name: "Muzyka", href: "/records/music" },
            ].map((item, i) => (
                <a
                    key={i}
                    href={item.href}
                    className="rounded-3xl border border-[var(--color-records)]/20 bg-[var(--color-records)]/5 hover:bg-[var(--color-records)]/10 transition-all p-5 shadow-sm group"
                >
                    <div className="text-lg font-bold text-black dark:text-white group-hover:text-[var(--color-records)] transition-colors">
                        {item.name}
                    </div>
                </a>
            ))}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {records?.map((record) => (
          <Card key={record.id} className="group relative flex flex-col overflow-hidden rounded-[2.5rem] bg-white dark:bg-black/40 border-2 border-black dark:border-white/10 hover:border-[var(--color-records)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-records)]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-700">
               {record.type === 'podcast' ? <Mic2 size={120} className="text-[var(--color-records)]" /> : <Music size={120} className="text-[var(--color-records)]" />}
            </div>

            <CardHeader className="relative z-10 pb-4">
              <div className="flex justify-between items-start gap-4">
                <CardTitle className="text-2xl font-bold font-[family-name:var(--font-space)] text-white group-hover:text-[var(--color-records)] transition-colors line-clamp-1">
                   {record.title}
                </CardTitle>
                <Badge variant="secondary" className="bg-[var(--color-records)]/10 text-[var(--color-records)] border border-[var(--color-records)]/20 shrink-0 uppercase">
                   {record.type}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2 text-zinc-500 font-[family-name:var(--font-outfit)] text-sm">
                 <Calendar size={14} />
                 Dodano: <span className="text-zinc-300">{record.upload_date ? new Date(record.upload_date).toLocaleDateString() : "Niedawno"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 pt-0 flex-1 flex flex-col justify-between">
              <p className="text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed line-clamp-3">
                 {record.description}
              </p>
              
              <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                 <span className="text-xs text-zinc-600 font-mono uppercase tracking-wider">ID: {record.id}</span>
                 <div className="h-8 w-8 rounded-full bg-[var(--color-records)]/10 flex items-center justify-center text-[var(--color-records)] opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                    {record.type === 'podcast' ? <Mic2 size={16} /> : <Music size={16} />}
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
