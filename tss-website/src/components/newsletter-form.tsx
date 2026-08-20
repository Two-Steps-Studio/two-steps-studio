"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useLanguage } from "@/hooks/use-translation";

export function NewsletterForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Coś poszło nie tak.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Błąd połączenia.");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.home.emailPlaceholder}
          required
          disabled={status === "success"}
          className="w-full h-16 md:h-20 pl-8 pr-40 rounded-3xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--color-general)] focus:ring-4 focus:ring-[var(--color-general)]/10 transition-all text-lg font-medium backdrop-blur-md"
        />
        <div className="absolute right-2 top-2 bottom-2">
          <Button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="h-full px-8 rounded-2xl bg-white text-black hover:bg-[var(--color-general)] hover:text-white font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
          >
            {status === "loading" ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Send size={20} />
              </motion.div>
            ) : status === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              t.home.subscribe
            )}
          </Button>
        </div>
      </form>

      <AnimatePresence>
        {status === "success" && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-[var(--color-general)] font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={16} />
            {t.home.subscribeSuccess}
          </motion.p>
        )}
        {status === "error" && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-red-400 font-bold flex items-center justify-center gap-2"
          >
            <AlertCircle size={16} />
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
