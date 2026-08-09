"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Mail, Phone, MapPin, CheckCircle } from "lucide-react";

interface Message {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: "sent" | "failed";
  timestamp: string;
}

export default function ContactPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("Wiadomość");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Symulacja wysyłania wiadomości
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSent(true);
      toast.success("Wiadomość wysłana!", {
        description: "Odpowiemy w ciągu 24h.",
      });

      // Czyść formularz po sukcesie
      setMessage("");
      setSubject("Wiadomość");

      // Wróć po 3 sekundach
      setTimeout(() => {
        router.push("/");
      }, 3000);
    } catch (err) {
      toast.error("Błąd wysyłania", {
        description: "Spróbuj ponownie później",
      });
      setSent(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 mt-20 max-w-6xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white font-[family-name:var(--font-space)] mb-4">
              Kontakt
            </h1>
            <p className="text-xl text-zinc-400 font-[family-name:var(--font-outfit)]">
              Masz pytania? Chcesz zaproponować coś nowego? Napisz do nas!
            </p>
          </div>

          <Card className="glass rounded-[2rem] p-6 border border-white/5">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-[var(--color-general)] flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-[var(--text)] mb-1">Email</h3>
                  <p className="text-zinc-400 font-[family-name:var(--font-outfit)]">
                    two.steps.studio.contact@gmail.com
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="glass rounded-[2rem] p-6 border border-[var(--color-general)]/20">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text)]">Czas odpowiedzi:</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  24h
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="glass rounded-[2rem] p-8 h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Wyślij Wiadomość</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {sent && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-2" />
                <p className="text-green-400 font-bold">Wiadomość wysłana!</p>
                <p className="text-green-300 text-sm">Odpowiemy w ciągu 24h.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Temat</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Temat wiadomości"
                  className="bg-white/5 border-white/10"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Treść</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Napisz swoją wiadomość..."
                  className="bg-white/5 border-white/10 min-h-[150px] resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || sent}
                className="w-full bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold h-12 rounded-2xl flex items-center justify-center gap-2"
              >
                {loading ? "Wysyłanie..." : sent ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Wysłano
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Wyślij
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
