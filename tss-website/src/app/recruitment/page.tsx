"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, User, Shield, Users, TrendingUp } from "lucide-react";

export default function RekrutacjaPage() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      try {
        setDarkMode(JSON.parse(saved));
      } catch {
        // Corrupted/non-JSON value left over from a previous format --
        // ignore it and keep the useState(false) default instead of
        // crashing the page.
      }
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
  const [loading, setLoading] = useState(false);
  const [discordRoles, setDiscordRoles] = useState<string[]>([]);
  const [discordData, setDiscordData] = useState<any>(null);

  useEffect(() => {
    const fetchDiscordData = async () => {
      try {
        const response = await fetch("/api/stats");
        const data = await response.json();
        if (data.discord_roles) {
          setDiscordRoles(data.discord_roles);
        }
      } catch (error) {
        console.error("Błąd pobierania danych Discorda:", error);
      }
    };

    fetchDiscordData();
  }, []);

  const handleDiscordLogin = async () => {
    setLoading(true);
    try {
      const { error } = await window.supabase?.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: `${window.location.origin}/registration`,
        },
      });

      if (error) {
        toast.error("Błąd logowania", {
          description: error.message,
        });
      }
    } catch (err) {
      toast.error("Błąd logowania", {
        description: "Spróbuj ponownie później",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full items-center justify-center p-4">
      <Card className="w-full max-w-2xl glass rounded-[2.5rem] shadow-2xl overflow-hidden relative border-black/10 dark:border-white/5">
        <div className={`absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/10 via-transparent to-transparent opacity-50 transition-colors ${!darkMode ? 'bg-gradient-to-br from-[var(--bg)]/10 via-transparent to-transparent' : ''}`}>
        </div>
        <CardHeader className="text-center space-y-4 relative z-10">
          <Users className="w-16 h-16 mx-auto text-[var(--color-general)] opacity-80" />
          <CardTitle className="text-3xl font-bold text-center">{t.rekrutacja.title}</CardTitle>
          <CardDescription className="text-center relative z-10 transition-colors">
            {t.rekrutacja.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          <div className={`bg-gradient-to-r from-[var(--bg)] via-[var(--bg)] to-[var(--bg)] rounded-2xl p-6 border border-[var(--border-color)] transition-colors`}>
            <div className="space-y-4 font-[family-name:var(--font-outfit)]">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 mt-0.5 text-[var(--color-general)] flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-[var(--text)] mb-1">{t.rekrutacja.email}</h3>
                  <input
                    type="email"
                    placeholder={t.rekrutacja.emailPlaceholder}
                    className="w-full bg-transparent border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-neutral-400 focus:border-[var(--color-general)] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 mt-0.5 text-[var(--color-general)] flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-[var(--text)] mb-1">{t.rekrutacja.name}</h3>
                  <input
                    type="text"
                    placeholder={t.rekrutacja.namePlaceholder}
                    className="w-full bg-transparent border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text)] placeholder:text-neutral-400 focus:border-[var(--color-general)] focus:outline-none transition-colors"
                  />
                </div>
              </div>
              {discordData?.roles && discordData.roles.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-[var(--text)] text-sm">{t.rekrutacja.discordRoles}</h3>
                  <div className="flex flex-wrap gap-2">
                    {discordData.roles.map((role: string) => (
                      <Badge
                        key={role}
                        className="bg-[var(--color-general)]/10 text-[var(--color-general)] border border-[var(--color-general)]/20 text-xs px-2 py-1"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleDiscordLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Łączenie z Discordem...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Połącz z Discordem
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className={`w-full h-12 rounded-2xl font-bold transition-colors ${!darkMode ? 'border-neutral-300 hover:border-neutral-400' : 'border-white/10 hover:border-white/20'}`}
            >
              {t.rekrutacja.backToHome}
            </Button>
          </div>

          <div className={`text-center text-xs pt-4 border-t transition-colors ${!darkMode ? 'text-neutral-500 border-neutral-200' : 'text-neutral-400 border-white/5'}`}>
            <p>
              Potrzebujesz pomocy? <Link href="/contact" className="text-[var(--color-general)] hover:underline">Kontakt</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
