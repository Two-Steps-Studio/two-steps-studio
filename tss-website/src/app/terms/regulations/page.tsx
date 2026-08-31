"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, User, Shield, FileText, CheckCircle2, Square, Ban } from "lucide-react";

export default function RegulaminPage() {
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
            <h1 className="text-2xl font-bold text-center mb-6">{t.regulaminBody.heading}</h1>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">{t.regulaminBody.s1Title}</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>{t.regulaminBody.s1Item1}</li>
                <li>{t.regulaminBody.s1Item2}</li>
                <li>{t.regulaminBody.s1Item3}</li>
                <li>{t.regulaminBody.s1Item4}</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">{t.regulaminBody.s2Title}</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>{t.regulaminBody.s2Item1}</li>
                <li>{t.regulaminBody.s2Item2}</li>
                <li>{t.regulaminBody.s2Item3}</li>
                <li>{t.regulaminBody.s2Item4}</li>
                <li>{t.regulaminBody.s2Item5}</li>
                <li>{t.regulaminBody.s2Item6}</li>
                <li>{t.regulaminBody.s2Item7Intro}
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>{t.regulaminBody.s2Item7a}</li>
                    <li>{t.regulaminBody.s2Item7b}</li>
                    <li>{t.regulaminBody.s2Item7c}</li>
                    <li>{t.regulaminBody.s2Item7d}</li>
                    <li>{t.regulaminBody.s2Item7e}</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">{t.regulaminBody.s3Title}</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>{t.regulaminBody.s3Item1}</li>
                <li>{t.regulaminBody.s3Item2}</li>
                <li>{t.regulaminBody.s3Item3}</li>
                <li>{t.regulaminBody.s3Item4}</li>
                <li>{t.regulaminBody.s3Item5}</li>
                <li>{t.regulaminBody.s3Item6}</li>
                <li>{t.regulaminBody.s3Item7}</li>
                <li>{t.regulaminBody.s3Item8}</li>
                <li>{t.regulaminBody.s3Item9}</li>
                <li>{t.regulaminBody.s3Item10}</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">{t.regulaminBody.s4Title}</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>{t.regulaminBody.s4Item1}</li>
                <li>{t.regulaminBody.s4Item2}</li>
                <li>{t.regulaminBody.s4Item3}</li>
                <li>{t.regulaminBody.s4Item4}</li>
                <li>{t.regulaminBody.s4Item5}</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">{t.regulaminBody.s5Title}</h2>
              <p className="text-sm mb-3">{t.regulaminBody.s5Intro}</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><Square size={14} className="shrink-0 text-zinc-300 dark:text-zinc-600" fill="currentColor" /> {t.regulaminBody.s5P1}</li>
                <li className="flex items-center gap-2"><Square size={14} className="shrink-0 text-yellow-400" fill="currentColor" /> {t.regulaminBody.s5P2}</li>
                <li className="flex items-center gap-2"><Square size={14} className="shrink-0 text-orange-400" fill="currentColor" /> {t.regulaminBody.s5P3}</li>
                <li className="flex items-center gap-2"><Square size={14} className="shrink-0 text-orange-400" fill="currentColor" /> {t.regulaminBody.s5P4}</li>
                <li className="flex items-center gap-2"><Square size={14} className="shrink-0 text-orange-400" fill="currentColor" /> {t.regulaminBody.s5P5}</li>
                <li className="flex items-center gap-2"><Square size={14} className="shrink-0 text-red-500" fill="currentColor" /> {t.regulaminBody.s5P6}</li>
                <li className="flex items-center gap-2"><Ban size={14} className="shrink-0 text-red-600" /> {t.regulaminBody.s5P7}</li>
              </ul>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">{t.regulaminBody.s6Title}</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>{t.regulaminBody.s6Item1}</li>
                <li>{t.regulaminBody.s6Item2}</li>
                <li>{t.regulaminBody.s6Item3}</li>
              </ol>
            </section>

            <section className="scroll-mt-16">
              <h2 className="text-xl font-bold text-[var(--text)] mb-4">{t.regulaminBody.s7Title}</h2>
              <p className="text-sm">{t.regulaminBody.s7P1}</p>
            </section>
          </div>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center pt-4 border-t ${!darkMode ? 'border-neutral-200' : 'border-white/10'}`}>
            <Button
              onClick={handleAccept}
              className="gap-2 bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold h-12 rounded-2xl"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t.regulaminBody.acceptButton}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/registration")}
              className={`h-12 rounded-2xl font-bold transition-colors ${!darkMode ? 'border-neutral-300 hover:border-neutral-400' : 'border-white/10 hover:border-white/20'}`}
            >
              {t.regulaminBody.backButton}
            </Button>
          </div>
        </CardContent>
        <div className="text-center text-xs px-4 pb-4 font-mono transition-colors ${!darkMode ? 'text-neutral-500' : 'text-neutral-400'}">
          {t.regulaminBody.lastUpdatedFooter}
        </div>
      </Card>
    </div>
  );
}
