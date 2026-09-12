"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Shield, Users, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [discordLoading, setDiscordLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    discord: "",
    position: "",
    experience: "",
    motivation: "",
    portfolio: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/recruitment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error("Failed to submit application");

      toast.success(t.rekrutacja.submitSuccess);
      setFormData({ name: "", email: "", discord: "", position: "", experience: "", motivation: "", portfolio: "" });
    } catch (error) {
      toast.error(t.rekrutacja.submitError);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscordLogin = async () => {
    if (!supabase) {
      toast.error(t.rekrutacja.loginErrorTitle, { description: "Usługa logowania jest obecnie niedostępna." });
      return;
    }

    setDiscordLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/registration` },
      });
      if (error) {
        toast.error(t.rekrutacja.loginErrorTitle, { description: error.message });
      }
    } catch (err) {
      toast.error(t.rekrutacja.loginErrorTitle, { description: t.rekrutacja.loginErrorRetry });
      console.error(err);
    } finally {
      setDiscordLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full items-center justify-center p-4 py-12">
      <Card className="w-full max-w-2xl glass rounded-[2.5rem] shadow-2xl overflow-hidden relative border-black/10 dark:border-white/5">
        <div className={`absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/10 via-transparent to-transparent opacity-50 transition-colors ${!darkMode ? 'bg-gradient-to-br from-[var(--bg)]/10 via-transparent to-transparent' : ''}`} />
        <CardHeader className="text-center space-y-4 relative z-10">
          <Users className="w-16 h-16 mx-auto text-[var(--color-general)] opacity-80" />
          <CardTitle className="text-3xl font-bold text-center">{t.rekrutacja.title}</CardTitle>
          <CardDescription className="text-center relative z-10 transition-colors">
            {t.rekrutacja.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.rekrutacja.name}</Label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required placeholder={t.rekrutacja.namePlaceholder} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.rekrutacja.email}</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder={t.rekrutacja.emailPlaceholder} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discord">{t.rekrutacja.discord}</Label>
              <Input id="discord" name="discord" value={formData.discord} onChange={handleChange} required placeholder={t.rekrutacja.discordPlaceholder} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">{t.rekrutacja.position}</Label>
              <Input id="position" name="position" value={formData.position} onChange={handleChange} required placeholder={t.rekrutacja.positionPlaceholder} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experience">{t.rekrutacja.experience}</Label>
              <Textarea id="experience" name="experience" value={formData.experience} onChange={handleChange} required placeholder={t.rekrutacja.experiencePlaceholder} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivation">{t.rekrutacja.motivation}</Label>
              <Textarea id="motivation" name="motivation" value={formData.motivation} onChange={handleChange} required placeholder={t.rekrutacja.motivationPlaceholder} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio">{t.rekrutacja.portfolio}</Label>
              <Input id="portfolio" name="portfolio" value={formData.portfolio} onChange={handleChange} placeholder={t.rekrutacja.portfolioPlaceholder} />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-2xl font-bold gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t.rekrutacja.submitting}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> {t.rekrutacja.submit}
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className={`h-px flex-1 ${!darkMode ? 'bg-neutral-200' : 'bg-white/10'}`} />
            <span className="text-xs text-neutral-400 uppercase tracking-widest">{t.rekrutacja.or}</span>
            <div className={`h-px flex-1 ${!darkMode ? 'bg-neutral-200' : 'bg-white/10'}`} />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleDiscordLogin}
              disabled={discordLoading}
              variant="outline"
              className="w-full h-12 rounded-2xl border-[#5865F2]/40 hover:bg-[#5865F2]/10 font-bold gap-2 transition-all"
            >
              {discordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t.rekrutacja.connectingDiscord}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" /> {t.rekrutacja.connectDiscord}
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className={`w-full h-12 rounded-2xl font-bold transition-colors ${!darkMode ? 'hover:bg-neutral-100' : 'hover:bg-white/5'}`}
            >
              {t.rekrutacja.backToHome}
            </Button>
          </div>

          <div className={`text-center text-xs pt-4 border-t transition-colors ${!darkMode ? 'text-neutral-500 border-neutral-200' : 'text-neutral-400 border-white/5'}`}>
            <p>
              {t.rekrutacja.needHelp} <Link href="/contact" className="text-[var(--color-general)] hover:underline">{t.rekrutacja.contactLink}</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
