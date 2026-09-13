"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-translation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Two ways to land here with a usable session:
  // 1. ?token_hash=...&type=recovery straight from the email link - verified
  //    directly via verifyOtp(), no cookie/PKCE code_verifier needed, so this
  //    works even if the link is opened on a different device/browser than
  //    the one that requested the reset (the common case - people open mail
  //    on their phone, not wherever they clicked "forgot password").
  // 2. A session already established by /auth/callback's exchangeCodeForSession
  //    (kept as a fallback for any link still using the old ConfirmationURL
  //    format), confirmed here via onAuthStateChange/getSession.
  useEffect(() => {
    if (!supabase) {
      setStatus("invalid");
      return;
    }

    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        setStatus(error ? "invalid" : "valid");
      });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setStatus("valid");
    });
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "valid" : "invalid");
    });
    return () => subscription.unsubscribe();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (newPassword.length < 8) {
      toast.error(t.resetPassword.tooShortError);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t.resetPassword.mismatchError);
      return;
    }
    if (!supabase) {
      toast.error(t.loginExtra.connectionErrorTitle, {
        description: t.loginExtra.supabaseNotConfigured,
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(t.resetPassword.errorTitle, { description: error.message });
      } else {
        setDone(true);
        toast.success(t.resetPassword.successTitle);
        setTimeout(() => {
          router.push("/profile");
          router.refresh();
        }, 1500);
      }
    } catch (err) {
      toast.error(t.resetPassword.errorTitle);
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
            {t.resetPassword.title}
          </CardTitle>
          {status === "valid" && !done && (
            <CardDescription className="text-zinc-400 font-[family-name:var(--font-outfit)]">
              {t.resetPassword.subtitle}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="relative z-10">
          {status === "checking" && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-general)]" />
            </div>
          )}

          {status === "invalid" && (
            <div className="text-center space-y-4 py-4">
              <p className="text-[var(--text)] font-bold">{t.resetPassword.invalidSessionTitle}</p>
              <p className="text-sm text-zinc-400">{t.resetPassword.invalidSessionDesc}</p>
              <Link href="/forgot-password" className="inline-block text-[var(--color-general)] hover:underline font-medium text-sm">
                {t.resetPassword.requestNewLink}
              </Link>
            </div>
          )}

          {status === "valid" && done && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-[var(--color-general)]" />
              <p className="text-[var(--text)] font-bold">{t.resetPassword.successTitle}</p>
              <p className="text-sm text-zinc-400">{t.resetPassword.successDesc}</p>
            </div>
          )}

          {status === "valid" && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-zinc-600 dark:text-zinc-300 ml-1 font-[family-name:var(--font-outfit)]">
                  {t.resetPassword.newPasswordLabel}
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder={t.resetPassword.passwordPlaceholder}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--text)] placeholder:text-zinc-500 focus:border-[var(--color-general)] focus:ring-[var(--color-general)]/20 transition-all duration-300 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-zinc-600 dark:text-zinc-300 ml-1 font-[family-name:var(--font-outfit)]">
                  {t.resetPassword.confirmPasswordLabel}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t.resetPassword.passwordPlaceholder}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                    {t.resetPassword.submitting}
                  </>
                ) : (
                  t.resetPassword.submitButton
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
