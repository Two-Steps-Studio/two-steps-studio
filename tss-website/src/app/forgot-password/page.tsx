"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-translation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!supabase) {
      toast.error(t.loginExtra.connectionErrorTitle, {
        description: t.loginExtra.supabaseNotConfigured,
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      // Supabase itself doesn't reveal whether the address exists (it
      // returns success either way) - keep that property here too, so this
      // form can't be used to enumerate registered emails.
      if (error) {
        toast.error(t.forgotPassword.errorTitle, { description: error.message });
      } else {
        setSent(true);
      }
    } catch (err) {
      toast.error(t.forgotPassword.errorTitle);
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
            {t.forgotPassword.title}
          </CardTitle>
          <CardDescription className="text-[var(--text-muted)] font-[family-name:var(--font-outfit)]">
            {t.forgotPassword.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <MailCheck className="w-12 h-12 mx-auto text-[var(--color-general)]" />
              <p className="text-[var(--text)] font-bold">{t.forgotPassword.successTitle}</p>
              <p className="text-sm text-[var(--text-muted)]">{t.forgotPassword.successDesc}</p>
              <Link href="/login" className="inline-block text-[var(--color-general)] hover:underline font-medium text-sm">
                {t.forgotPassword.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-600 dark:text-zinc-300 ml-1 font-[family-name:var(--font-outfit)]">
                  {t.forgotPassword.emailLabel}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t.forgotPassword.emailPlaceholder}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--text)] placeholder:text-zinc-500 focus:border-[var(--color-general)] focus:ring-[var(--color-general)]/20 transition-all duration-300 h-12"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold h-12 transition-all duration-300 shadow-[0_0_20px_-5px_var(--color-general)] hover:shadow-[0_0_25px_-5px_var(--color-general)]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.forgotPassword.submitting}
                  </>
                ) : (
                  t.forgotPassword.submitButton
                )}
              </Button>
              <div className="text-center text-sm text-[var(--text-muted)] mt-4 font-[family-name:var(--font-outfit)]">
                <Link href="/login" className="text-[var(--color-general)] hover:underline font-medium">
                  {t.forgotPassword.backToLogin}
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
