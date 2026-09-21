"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Command as CommandPrimitive } from "cmdk";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AdminConsole() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [name, setName] = useState("TwoStepsStudioAdmin");
  const [password, setPassword] = useState("");
  const [cmd, setCmd] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ input: string; output: string; ok: boolean }[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        // Ultimate safeguard: always convert to string before lowercase
        const key = String(e.key || "").toLowerCase();
        
        if (e.ctrlKey && e.shiftKey && key === "y") {
          e.preventDefault();
          setOpen(true);
        }
        if (key === "escape") {
          setOpen(false);
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open, authed]);

  const handleAuth = async () => {
    if (!name || !password) {
      toast.error("Podaj nazwę i hasło");
      return;
    }
    try {
      setBusy(true);
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Błędne hasło");
        setAuthed(false);
      } else {
        setAuthed(true);
        toast.success("Zalogowano do konsoli");
      }
    } catch {
      toast.error("Błąd połączenia");
    } finally {
      setBusy(false);
    }
  };

  const runCommand = async () => {
    const input = cmd.trim();
    if (!input) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ name, password, command: input }),
      });
      const data = await res.json();
      const ok = res.ok && !!data?.ok;
      const out = ok ? data?.result || "OK" : data?.error || "Error";
      setHistory((h) => [{ input, output: out, ok }, ...h].slice(0, 30));
      if (ok) {
        toast.success("Wykonano");
      } else {
        toast.error(out);
      }
    } catch {
      toast.error("Błąd połączenia");
    } finally {
      setBusy(false);
      setCmd("");
    }
  };

  const examples = useMemo(
    () => [
      "set-level <userId> <level>",
      "add-xp <userId> <amount>",
    ],
    []
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl rounded-[2.5rem] bg-black/40 border border-[var(--border-color)] backdrop-blur-2xl">
        {!authed ? (
          <Card className="rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
            <CardHeader>
              <CardTitle className="text-[var(--text)] font-[family-name:var(--font-space)]">Konsola Admin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
             <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Użyj nazwy: TwoStepsStudioAdmin</div>
              <Input
                placeholder="Nazwa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text)]"
              />
              <Input
                placeholder="Hasło"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-2xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text)]"
              />
              <Button
                onClick={handleAuth}
                disabled={busy}
                className="rounded-2xl bg-[var(--color-general)] text-white font-bold"
              >
                Wejdź
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
              <CardHeader>
                <CardTitle className="text-[var(--text)] font-[family-name:var(--font-space)]">Polecenia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {examples.map((e) => (
                    <span key={e} className="text-[10px] uppercase tracking-[0.2em] bg-[var(--card-bg)] text-white/70 px-2 py-1 rounded-full border border-[var(--border-color)]">
                      {e}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef as any}
                    placeholder="Wpisz komendę…"
                    value={cmd}
                    onChange={(e) => setCmd(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        runCommand();
                      }
                    }}
                    className="flex-1 rounded-2xl border-[var(--border-color)] bg-[var(--surface)] text-[var(--text)]"
                  />
                  <Button onClick={runCommand} disabled={busy} className="rounded-2xl bg-[var(--color-general)] text-white font-bold">
                    Wyślij
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
              <CardHeader>
                <CardTitle className="text-[var(--text)] font-[family-name:var(--font-space)]">Historia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.length === 0 && <div className="text-[var(--text-muted)]">Brak wpisów</div>}
               {history.map((h, i) => (
                 <div key={i} className={cn("p-3 rounded-xl border", h.ok ? "border-[var(--color-general)]/20 bg-[var(--surface-hover)]" : "border-red-500/30 bg-red-500/10")}>
                   <div className="text-xs text-[var(--text-muted)]">{">"}{h.input}</div>
                   <div className="text-[var(--text)]">{h.output}</div>
                 </div>
               ))}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
