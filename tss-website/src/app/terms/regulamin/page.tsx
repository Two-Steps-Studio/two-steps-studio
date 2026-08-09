"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, User, Shield, FileText, CheckCircle2 } from "lucide-react";

export default function RegulaminPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(JSON.parse(saved));
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setDarkMode(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => setDarkMode(e.matches);
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const { t } = useLanguage();
  const router = useRouter();

  const handleAccept = async () => {
    try {
      localStorage.setItem("termsAccepted", "true");
      localStorage.setItem("termsAcceptedDate", new Date().toISOString());
      toast.success(t.regulamin.accepted);
    } catch (err) {
      toast.error(t.regulamin.acceptError);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full items-center justify-center p-4">
      <Card className="w-full max-w-4xl glass rounded-[2.5rem] shadow-2xl overflow-hidden relative border-black/10 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/10 via-transparent to-transparent opacity-50" />
        <CardHeader className="text-center space-y-4 relative z-10">
          <FileText className="w-16 h-16 mx-auto text-[var(--color-general)] opacity-80" />
          <CardTitle className="text-3xl font-bold text-center">{t.regulamin.title}</CardTitle>
          <CardDescription className="text-center max-w-2xl mx-auto">
            {t.regulamin.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-8">
          <div className="prose prose-zinc max-w-none text-zinc-600 dark:text-zinc-400 font-[family-name:var(--font-outfit)] leading-relaxed">
            <h1 className="text-2xl font-bold text-center mb-6">REGULAMIN TWO STEPS STUDIO</h1>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">§ 1 — Postanowienia ogólne</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Regulamin określa zasady korzystania ze strony internetowej oraz oficjalnego serwera Discord Two Steps Studio.</li>
                <li>Korzystając ze strony lub serwera Discord, akceptujesz poniższe zasady.</li>
                <li>Administracja ma prawo do aktualizacji regulaminu w dowolnym momencie.</li>
                <li>Nieznajomość regulaminu nie zwalnia z jego przestrzegania.</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">§ 2 — Zasady ogólne</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Zakaz działań niezgodnych z prawem.</li>
                <li>Zakaz prób uzyskania nieautoryzowanego dostępu do kont, panelu administracyjnego, baz danych lub innych zasobów Two Steps Studio.</li>
                <li>Zakaz spamowania formularzy, komentarzy, wiadomości i systemów Two Steps Studio.</li>
                <li>Użytkownik odpowiada za bezpieczeństwo swojego konta i danych logowania.</li>
                <li>Zakaz podszywania się pod administrację, twórców lub innych użytkowników.</li>
                <li>Błędy techniczne należy zgłaszać administracji - nie wolno wykorzystywać ich dla własnych korzyści.</li>
                <li>Zakaz publikowania treści zawierających:
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>mowę nienawiści</li>
                    <li>treści obraźliwe lub NSFW</li>
                    <li>reklamy bez zgody administracji</li>
                    <li>linki phishingowe</li>
                    <li>wirusy lub szkodliwe oprogramowanie</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">§ 3 — Zasady społeczności Discord</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Szanuj wszystkich członków społeczności.</li>
                <li>Zakaz wyzywania, obrażania, nękania i prowokowania.</li>
                <li>Zakaz spamu, floodu, nadmiernego pingowania i nadużywania emoji.</li>
                <li>Zakaz reklamowania innych serwerów, stron i projektów bez zgody administracji.</li>
                <li>Zakaz treści NSFW, brutalnych lub nieodpowiednich.</li>
                <li>Zakaz udostępniania danych prywatnych swoich lub innych osób.</li>
                <li>Zakaz używania cheatów, exploitów i botów do nieuczciwego zdobywania nagród, poziomów lub waluty serwerowej.</li>
                <li>Zakaz obchodzenia kar poprzez multikonta.</li>
                <li>Na kanałach głosowych obowiązuje kultura — bez głośnych dźwięków, trollowania i przeszkadzania innym.</li>
                <li>Administracja ma prawo usuwać wiadomości, wyciszać lub banować użytkowników łamiących regulamin.</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">§ 4 — System kont, poziomów i ekonomii</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Punkty, poziomy, osiągnięcia i waluta Two Steps Studio są elementem rozrywki.</li>
                <li>Zakaz wykorzystywania bugów systemu do zdobywania przewagi.</li>
                <li>Administracja może resetować poziomy, saldo lub osiągnięcia w przypadku nadużyć.</li>
                <li>Zakupione przedmioty cyfrowe, rangi i dodatki są przypisane do konta użytkownika.</li>
                <li>Próby oszustwa przy płatnościach skutkują permanentną blokadą.</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">§ 5 — Kary</h2>
              <p className="text-sm mb-3">Rodzaj kary zależy od skali naruszenia:</p>
              <ul className="space-y-2 text-sm">
                <li>⬜ - Upomnienie</li>
                <li>🟨 - Ostrzeżenie</li>
                <li>🟧 - Mute / Timeout</li>
                <li>🟧 - Blokada funkcji</li>
                <li>🟧 - Reset postępów</li>
                <li>🟥 - Ban czasowy</li>
                <li>⛔ - Ban permanentny</li>
              </ul>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">§ 6 — Prawa administracji</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Administracja ma ostateczne zdanie w sprawach spornych.</li>
                <li>Administracja może usuwać treści szkodliwe dla społeczności lub projektu.</li>
                <li>W wyjątkowych sytuacjach administracja może podjąć decyzję poza regulaminem dla dobra Two Steps Studio.</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">§ 7 — Kontakt</h2>
              <p className="text-sm">W sprawach odwołań, zgłoszeń błędów lub pytań skontaktuj się z administracją Two Steps Studio przez dostępne kanały kontaktowe na serwerze.</p>
            </section>
          </div>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t ${!darkMode ? 'border-neutral-200' : 'border-white/10'}`}>
            <Button
              onClick={handleAccept}
              className="gap-2 bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold h-12 rounded-2xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              Akceptuję regulamin
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/registration")}
              className={`h-12 rounded-2xl font-bold transition-colors ${!darkMode ? 'border-neutral-300 hover:border-neutral-400' : 'border-white/10 hover:border-white/20'}`}
            >
              Powrót do rejestracji
            </Button>
          </div>
        </CardContent>
        <div className="text-center text-xs px-4 pb-4 font-mono transition-colors ${!darkMode ? 'text-neutral-500' : 'text-neutral-400'}">
          Last updated: 2026-04-02
        </div>
      </Card>
    </div>
  );
}
