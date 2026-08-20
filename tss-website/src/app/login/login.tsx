"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/hooks/use-translation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (!supabase) {
        toast.error("Błąd połączenia z serwerem", {
          description: "Supabase nie jest skonfigurowany"
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        console.log("Login attempt result:", { data, error });

        if (error) {
          toast.error(t.auth.loginError, {
            description: error.message,
          });
        } else {
          toast.success(t.auth.loginSuccess);
          // Force hard refresh to ensure session is fully loaded
          window.location.href = "/profile";
        }
      }
    } catch (err: any) {
      const isFetchError = err.message?.includes("fetch");
      toast.error(isFetchError ? "Błąd połączenia z serwerem" : "Wystąpił nieoczekiwany błąd", {
          description: isFetchError ? "Sprawdź połączenie internetowe lub spróbuj za chwilę." : err.message
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      if (!supabase) {
        toast.error("Błąd logowania Google", {
          description: "Supabase nie jest skonfigurowany"
        });
      } else {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/profile`,
          },
        });
        console.log("Google login result:", { data, error });
      }
    } catch (err) {
      toast.error("Błąd logowania Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] w-full items-center justify-center p-4">
      <Card className="w-full max-w-lg glass rounded-[2.5rem] shadow-2xl overflow-hidden relative border-black/10 dark:border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-general)]/15 via-transparent to-[var(--color-records)]/10 opacity-60 dark:opacity-60" />
        <CardHeader className="space-y-2 relative z-10 text-center pb-8">
          <div className="w-20 h-20 bg-white/10 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-white/10 shadow-inner group">
             <Image 
               src="/assets/Logo/Glowne/Two Steps Studio Bez Tła.png" 
               alt="TSS" width={50} height={50} 
               className="group-hover:scale-110 transition-transform duration-500"
             />
          </div>
          <CardTitle className="text-4xl font-black italic tracking-tighter text-[var(--text)] font-[family-name:var(--font-space)]">
            {t.auth.loginTitle}
          </CardTitle>
          <CardDescription className="text-zinc-400 font-medium text-lg">
            {t.auth.loginSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-600 dark:text-zinc-300 ml-1 font-bold text-xs uppercase tracking-widest">{t.auth.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t.auth.emailPlaceholder}
                required
                value={formData.email}
                onChange={handleChange}
                className="h-12 rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/20 text-[var(--text)] focus:border-[var(--color-general)] focus:ring-1 focus:ring-[var(--color-general)] transition-all"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" className="text-zinc-600 dark:text-zinc-300 font-bold text-xs uppercase tracking-widest">{t.auth.password}</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[var(--color-general)] hover:underline font-bold"
                >
                  {t.auth.forgotPassword}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="h-12 rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/20 text-[var(--text)] focus:border-[var(--color-general)] focus:ring-1 focus:ring-[var(--color-general)] transition-all"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 rounded-2xl bg-black text-white dark:bg-white dark:text-black hover:bg-[var(--color-general)] dark:hover:bg-[var(--color-general)] hover:text-white font-black text-xl transition-all shadow-xl shadow-black/5 dark:shadow-white/5"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  WCHODZĘ...
                </div>
              ) : (
                t.auth.loginButton
              )}
            </Button>
          </form>
          
          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-zinc-500 font-bold tracking-[0.3em]">LUB ZALOGUJ PRZEZ</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="h-12 rounded-2xl border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-[var(--text)] hover:bg-black/10 dark:hover:bg-white/10 font-bold text-sm tracking-tight transition-all"
            >
              Google
            </Button>
            <Button
              onClick={async () => {
                if (!supabase) {
                  toast.error("Błąd logowania Discord", {
                    description: "Supabase nie jest skonfigurowany"
                  });
                } else {
                  setLoading(true);
                  await supabase.auth.signInWithOAuth({
                    provider: "discord",
                    options: { redirectTo: `${window.location.origin}/profile` }
                  });
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="h-12 rounded-2xl bg-[#5865F2] text-white hover:bg-[#4752C4] font-bold text-sm tracking-tight transition-all shadow-lg shadow-[#5865F2]/20"
            >
              Discord
            </Button>
          </div>
        </CardContent>
        <CardFooter className="relative z-10 flex flex-col gap-6 pt-6 pb-10">
          <div className="text-center text-sm">
            <p className="text-zinc-500">
              {t.auth.noAccount}{" "}
              <Link href="/registration" className="text-[var(--text)] hover:text-[var(--color-general)] font-black hover:underline transition-colors">
                {t.auth.registerLink}
              </Link>
            </p>
          </div>
          
          <div className="flex flex-col gap-2 pt-4 border-t border-white/5 w-full items-center">
             <button 
                onClick={() => {
                   localStorage.clear();
                   sessionStorage.clear();
                   window.location.reload();
                }}
                className="text-[10px] text-[var(--color-general)] hover:underline opacity-40 font-black tracking-widest uppercase"
             >
                Wyczyść pamięć sesji
             </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
