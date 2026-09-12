"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Users, ScrollText, Gift, ShieldAlert, Loader2, ArrowLeft, Search, Save, Check } from "lucide-react";

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

      {tab === "users" && <UsersTab />}

      {(tab === "logs" || tab === "engagement") && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-[var(--text-muted)]">
            Ta zakładka będzie gotowa w kolejnym kroku.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface BotUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  level: number;
  money: number;
  bank: number;
  vip_status: boolean;
  svip_status: boolean;
  mvip_status: boolean;
}

function UsersTab() {
  const [users, setUsers] = useState<BotUser[]>([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(true);

  const load = (q: string) => {
    setLoadingUsers(true);
    fetch(`/api/admin/users?limit=100${q ? `&search=${encodeURIComponent(q)}` : ""}`)
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    load("");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const updateUserLocally = (id: string, patch: Partial<BotUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Userzy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj po nicku..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--color-general)]"
          />
        </div>

        {loadingUsers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-[var(--color-general)]" size={22} />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">Brak wyników.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <UserRow key={u.id} user={u} onSaved={(patch) => updateUserLocally(u.id, patch)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function UserRow({ user, onSaved }: { user: BotUser; onSaved: (patch: Partial<BotUser>) => void }) {
  const [money, setMoney] = useState(user.money ?? 0);
  const [bank, setBank] = useState(user.bank ?? 0);
  const [level, setLevel] = useState(user.level ?? 0);
  const [vip, setVip] = useState({ vip_status: user.vip_status, svip_status: user.svip_status, mvip_status: user.mvip_status });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty =
    money !== user.money || bank !== user.bank || level !== user.level ||
    vip.vip_status !== user.vip_status || vip.svip_status !== user.svip_status || vip.mvip_status !== user.mvip_status;

  const save = async () => {
    setSaving(true);
    try {
      const patch = { money, bank, level, ...vip };
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, ...patch }),
      });
      if (res.ok) {
        onSaved(patch);
        setSavedAt(Date.now());
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 min-w-[140px]">
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar_url} alt="" width={32} height={32} className="rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] border border-[var(--border)]" />
        )}
        <span className="text-sm font-medium truncate">{user.username || user.id}</span>
      </div>

      <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        Lvl
        <input
          type="number"
          value={level}
          onChange={(e) => setLevel(parseInt(e.target.value) || 0)}
          className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        Kasa
        <input
          type="number"
          value={money}
          onChange={(e) => setMoney(parseInt(e.target.value) || 0)}
          className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
        />
      </label>
      <label className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        Bank
        <input
          type="number"
          value={bank}
          onChange={(e) => setBank(parseInt(e.target.value) || 0)}
          className="w-24 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
        />
      </label>

      <div className="flex items-center gap-1">
        {(["vip_status", "svip_status", "mvip_status"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setVip((v) => ({ ...v, [key]: !v[key] }))}
            className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-colors ${
              vip[key]
                ? "bg-[var(--color-general)] text-white border-[var(--color-general)]"
                : "bg-transparent text-[var(--text-muted)] border-[var(--border)]"
            }`}
          >
            {key.replace("_status", "")}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {savedAt && Date.now() - savedAt < 3000 && <Check size={16} className="text-[var(--color-general)]" />}
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          <Save size={14} className="mr-1" /> {saving ? "..." : "Zapisz"}
        </Button>
      </div>
    </div>
  );
}
