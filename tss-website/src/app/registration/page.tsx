"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-translation";
import registerUser from "./actions";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSelect } from "@/components/LanguageSelect";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    termsAccepted: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!formData.termsAccepted) {
      toast.error(t.registrationExtra.termsRequiredTitle, {
        description: t.registrationExtra.termsRequiredDesc,
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Register user via server action
      const result = await registerUser({ ...formData, language });

      if (result.error) {
        toast.error(t.auth.registerError, {
          description: result.error,
        });
        setLoading(false);
        return;
      }

      // 2. If successful, sign in the user immediately client-side
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        toast.error(t.registrationExtra.autoSignInFailed, {
          description: signInError.message,
        });
        // Redirect to login anyway
        router.push("/login");
      } else {
        toast.success(t.auth.registerSuccess || "Registration successful!");
        router.push("/profile");
        router.refresh();
      }
    } catch (err) {
      toast.error(t.registrationExtra.unexpectedError);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full items-center justify-center p-4">
      <Card className="w-full max-w-md border-black/10 dark:border-white/10 glass backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/10 via-transparent to-transparent opacity-50" />
        <CardHeader className="space-y-1 relative z-10 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-[var(--text)] font-[family-name:var(--font-space)]">
            {t.auth.registerTitle}
          </CardTitle>
          <CardDescription className="text-zinc-400 font-[family-name:var(--font-outfit)]">
            {t.auth.registerSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-zinc-600 dark:text-zinc-300 ml-1 font-[family-name:var(--font-outfit)]">{t.auth.fullName}</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder={t.auth.fullNamePlaceholder}
                required
                value={formData.fullName}
                onChange={handleChange}
                className="rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--text)] placeholder:text-zinc-500 focus:border-[var(--color-general)] focus:ring-[var(--color-general)]/20 transition-all duration-300 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-600 dark:text-zinc-300 ml-1 font-[family-name:var(--font-outfit)]">{t.auth.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t.auth.emailPlaceholder}
                required
                value={formData.email}
                onChange={handleChange}
                className="rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--text)] placeholder:text-zinc-500 focus:border-[var(--color-general)] focus:ring-[var(--color-general)]/20 transition-all duration-300 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-600 dark:text-zinc-300 ml-1 font-[family-name:var(--font-outfit)]">{t.auth.password}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={t.auth.passwordPlaceholder}
                required
                value={formData.password}
                onChange={handleChange}
                className="rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--text)] placeholder:text-zinc-500 focus:border-[var(--color-general)] focus:ring-[var(--color-general)]/20 transition-all duration-300 h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-600 dark:text-zinc-300 ml-1 font-[family-name:var(--font-outfit)]">{t.settings.language}</Label>
              <LanguageSelect />
            </div>
            <div className="flex items-start gap-2 py-2">
              <input
                id="terms"
                type="checkbox"
                checked={formData.termsAccepted}
                onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-zinc-400 text-[var(--color-general)] focus:ring-[var(--color-general)]"
              />
              <Label htmlFor="terms" className="text-xs text-zinc-400 font-[family-name:var(--font-outfit)] leading-tight cursor-pointer">
                {t.registrationExtra.acceptPrefix}<a href="/terms" target="_blank" className="text-[var(--color-general)] hover:underline">{t.registrationExtra.termsLinkText}</a>{t.registrationExtra.acceptSuffix}
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold h-12 transition-all duration-300 shadow-[0_0_20px_-5px_var(--color-general)] hover:shadow-[0_0_25px_-5px_var(--color-general)]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.auth.registerButton}
                </>
              ) : (
                t.auth.registerButton
              )}
            </Button>
            <div className="text-center text-sm text-zinc-400 mt-4 font-[family-name:var(--font-outfit)]">
              {t.auth.alreadyHaveAccount}{" "}
              <Link href="/login" className="text-[var(--color-general)] hover:underline font-medium">
                {t.auth.loginLink}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
