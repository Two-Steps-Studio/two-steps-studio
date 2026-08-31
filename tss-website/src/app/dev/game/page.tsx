"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Shield } from "lucide-react";

export default function DevGamePage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdmin, setCheckedAdmin] = useState(false);
  const [buildReady, setBuildReady] = useState<boolean | null>(null); // null = still checking

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/auth");
        const data = await res.json();
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error("Failed to check admin status:", error);
      } finally {
        setCheckedAdmin(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    // Unity's build output always emits an index.html at the build root --
    // its presence is what distinguishes "nothing uploaded yet" (this
    // request 404s, since public/unity-game/ is currently empty) from a
    // real build being in place.
    fetch("/unity-game/index.html", { method: "HEAD" })
      .then((res) => setBuildReady(res.ok))
      .catch(() => setBuildReady(false));
  }, [isAdmin]);

  if (checkedAdmin && !isAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Brak dostępu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Nie masz uprawnień administratora. Skontaktuj się z administracją.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-black dark:text-white font-[family-name:var(--font-space)] flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-[var(--color-dev)]" />
          Build gry (Unity WebGL)
        </h1>
        <p className="text-muted-foreground mt-1">
          Podgląd wewnętrzny — strona nie jest linkowana nigdzie w nawigacji i jest wyłączona z indeksowania.
        </p>
      </div>

      {buildReady === null ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-dev)]"></div>
        </div>
      ) : buildReady ? (
        <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-black" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            src="/unity-game/index.html"
            title="Two Steps Studio — build gry"
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; gamepad"
          />
        </div>
      ) : (
        <Card className="bg-black/40 border-white/10 rounded-[2rem]">
          <CardContent className="p-12 text-center">
            <Gamepad2 className="w-16 h-16 mx-auto mb-6 text-zinc-600" />
            <h2 className="text-2xl font-bold mb-2 text-black dark:text-white">Build jeszcze nie wgrany</h2>
            <p className="text-muted-foreground">
              Wrzuć zawartość folderu wynikowego builda WebGL do{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-sm">tss-website/public/unity-game/</code> —
              szczegóły w tamtejszym <code className="px-1.5 py-0.5 rounded bg-white/10 text-sm">README.md</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
