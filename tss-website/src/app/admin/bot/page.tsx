"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Users, ScrollText, Gift, ShieldAlert, Loader2, ArrowLeft } from "lucide-react";

const SETTING_LABELS: Record<string, { label: string; hint: string }> = {
  MOD_LOG_CHANNEL_ID: { label: "Kanał logów moderacji", hint: "ID kanału, gdzie bot wysyła kick/ban/timeout/warn" },
  TICKET_STAFF_ROLE_ID: { label: "Rola obsługi zgłoszeń", hint: "ID roli, która widzi nowo tworzone tickety" },
  JOIN_TO_CREATE_CHANNEL_ID: { label: "Kanał głosowy \"stwórz kanał\"", hint: "ID kanału głosowego wyzwalającego auto-kanały" },
  AUTO_ROLE_ID: { label: "Auto-rola", hint: "ID roli nadawanej automatycznie nowym członkom" },
  STATS_CHANNEL_ID: { label: "Kanał live-staty", hint: "ID kanału głosowego pokazującego liczbę członków w nazwie" },
};

const TABS = [
  { id: "settings", label: "Ustawienia bota", icon: Settings },
  { id: "users", label: "Userzy", icon: Users },
  { id: "logs", label: "Logi", icon: ScrollText },
  { id: "engagement", label: "Giveaway / Tickety", icon: Gift },
] as const;

export default function AdminBotPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("settings");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setForbidden(true);
          return;
        }
        const data = await res.json();
        setValues(data.values || {});
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-[var(--color-general)]" size={28} />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <ShieldAlert size={40} className="text-[var(--color-general)]" />
        <h1 className="text-xl font-bold">Brak dostępu</h1>
        <p className="text-sm text-[var(--text-muted)]">Ten panel jest tylko dla adminów Two Steps Studio.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] mb-2">
          <ArrowLeft size={14} /> Panel admina
        </Link>
        <h1 className="text-2xl font-bold">Sterowanie botem</h1>
        <p className="text-sm text-[var(--text-muted)]">Ustawienia Discord bota bez ruszania .env czy komend.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-[var(--color-general)] text-white"
                  : "bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle>Ustawienia bota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(SETTING_LABELS).map(([key, meta]) => (
              <div key={key} className="space-y-1">
                <label className="text-sm font-medium">{meta.label}</label>
                <p className="text-xs text-[var(--text-muted)]">{meta.hint}</p>
                <input
                  type="text"
                  value={values[key] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder="puste = użyj wartości z .env bota"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-general)]"
                />
              </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={save} disabled={saving}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </Button>
              {savedAt && Date.now() - savedAt < 4000 && <Badge variant="outline">Zapisano</Badge>}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Bot odczytuje te wartości co ok. minutę — zmiana zadziała bez restartu.
            </p>
          </CardContent>
        </Card>
      )}

      {tab !== "settings" && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--text-muted)]">
            Ta zakładka będzie gotowa w kolejnym kroku.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
