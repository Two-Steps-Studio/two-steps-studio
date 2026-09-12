"use client";

import { useEffect, useState, type ElementType } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Settings, Users, ScrollText, Gift, ShieldAlert, Loader2, ArrowLeft, Search, Save, Check,
  AlertTriangle, UserPlus, TrendingUp, ShoppingBag, MessageSquare, Ticket, PartyPopper,
} from "lucide-react";

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
      {tab === "logs" && <LogsTab />}
      {tab === "engagement" && <EngagementTab />}
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

interface ModWarning {
  id: number;
  username: string;
  moderator: string;
  reason: string;
  created_at: string;
}
interface ActivityLogRow {
  id: number;
  type: "join" | "level_up" | "purchase" | "message";
  username: string;
  detail: string | null;
  created_at: string;
}

const ACTIVITY_ICON: Record<ActivityLogRow["type"], { icon: ElementType; color: string }> = {
  join: { icon: UserPlus, color: "#06e402" },
  level_up: { icon: TrendingUp, color: "#ffcb2f" },
  purchase: { icon: ShoppingBag, color: "#1bbdbd" },
  message: { icon: MessageSquare, color: "#9aa5b1" },
};

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function LogsTab() {
  const [warnings, setWarnings] = useState<ModWarning[]>([]);
  const [activity, setActivity] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/bot-logs")
      .then((res) => res.json())
      .then((data) => {
        setWarnings(data.warnings || []);
        setActivity(data.activity || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-[var(--color-general)]" size={22} />
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle size={16} className="text-yellow-500" /> Ostrzeżenia ({warnings.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {warnings.length === 0 && <p className="text-sm text-[var(--text-muted)]">Brak ostrzeżeń.</p>}
          {warnings.map((w) => (
            <div key={w.id} className="rounded-lg border border-[var(--border)] p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium">{w.username}</span>
                <span className="text-xs text-[var(--text-muted)]">{formatLogTime(w.created_at)}</span>
              </div>
              <p className="text-[var(--text-muted)]">{w.reason}</p>
              <p className="text-xs text-[var(--text-muted)]">od: {w.moderator}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText size={16} /> Aktywność ({activity.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {activity.length === 0 && <p className="text-sm text-[var(--text-muted)]">Brak aktywności.</p>}
          {activity.map((a) => {
            const meta = ACTIVITY_ICON[a.type] ?? ACTIVITY_ICON.join;
            const Icon = meta.icon;
            return (
              <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-[var(--border)] p-3 text-sm">
                <Icon size={16} style={{ color: meta.color }} className="shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{a.username}</span>
                  {a.detail && <span className="text-[var(--text-muted)]"> — {a.detail}</span>}
                </div>
                <span className="text-xs text-[var(--text-muted)] shrink-0">{formatLogTime(a.created_at)}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

interface GiveawayRow {
  id: number;
  prize: string;
  winner_count: number;
  ends_at: string;
  ended: boolean;
  created_by_name: string;
  created_at: string;
}
interface TicketRow {
  id: number;
  user_name: string;
  status: "open" | "closed";
  created_at: string;
  closed_at: string | null;
}

interface BotCommand {
  id: number;
  type: string;
  status: "pending" | "done" | "failed";
  error: string | null;
  payload: { prize?: string };
  created_at: string;
}

function EngagementTab() {
  const [giveaways, setGiveaways] = useState<GiveawayRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);

  const loadEngagement = () =>
    fetch("/api/admin/bot-engagement")
      .then((res) => res.json())
      .then((data) => {
        setGiveaways(data.giveaways || []);
        setTickets(data.tickets || []);
      });
  const loadCommands = () =>
    fetch("/api/admin/bot-commands")
      .then((res) => res.json())
      .then((data) => {
        setCommands(data.commands || []);
        setMigrationMissing(!!data.migrationMissing);
      });

  useEffect(() => {
    Promise.all([loadEngagement(), loadCommands()]).finally(() => setLoading(false));
  }, []);

  // Bot picks commands up on its 60s stats loop - poll a bit faster while
  // anything is still pending so the status badge updates without a manual
  // refresh, then stop once nothing's waiting.
  useEffect(() => {
    const hasPending = commands.some((c) => c.status === "pending");
    if (!hasPending) return;
    const t = setInterval(() => {
      loadCommands();
      loadEngagement();
    }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-[var(--color-general)]" size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {migrationMissing && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">
          Tabela <code>bot_commands</code> nie istnieje jeszcze w bazie — wklej <code>tss-dc-bot/db/bot_commands_schema.sql</code> do Supabase SQL Editor, żeby tworzenie giveawayów działało.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <NewGiveawayForm onQueued={loadCommands} />
        <NewTicketPanelForm onQueued={loadCommands} />
      </div>

      {commands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ostatnie polecenia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {commands.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {c.type === "ticket_panel" ? "Panel ticketów" : c.payload?.prize || c.type}
                </span>
                <Badge variant={c.status === "done" ? "default" : c.status === "failed" ? "destructive" : "secondary"}>
                  {c.status === "pending" ? "w kolejce..." : c.status === "done" ? "wysłane" : `błąd: ${c.error}`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PartyPopper size={16} className="text-[var(--color-general)]" /> Giveaway ({giveaways.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {giveaways.length === 0 && <p className="text-sm text-[var(--text-muted)]">Brak giveawayów.</p>}
            {giveaways.map((g) => {
              const isPast = new Date(g.ends_at) < new Date();
              return (
                <div key={g.id} className="rounded-lg border border-[var(--border)] p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{g.prize}</span>
                    <Badge variant={g.ended ? "outline" : isPast ? "secondary" : "default"}>
                      {g.ended ? "zakończony" : isPast ? "do rozstrzygnięcia" : "trwa"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {g.winner_count}× zwycięzca • koniec {formatLogTime(g.ends_at)} • od {g.created_by_name}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ticket size={16} className="text-[var(--color-general)]" /> Tickety ({tickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {tickets.length === 0 && <p className="text-sm text-[var(--text-muted)]">Brak ticketów.</p>}
            {tickets.map((t) => (
              <div key={t.id} className="rounded-lg border border-[var(--border)] p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.user_name}</span>
                  <Badge variant={t.status === "open" ? "default" : "outline"}>
                    {t.status === "open" ? "otwarty" : "zamknięty"}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  otwarty {formatLogTime(t.created_at)}
                  {t.closed_at ? ` • zamknięty ${formatLogTime(t.closed_at)}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NewGiveawayForm({ onQueued }: { onQueued: () => void }) {
  const [channelId, setChannelId] = useState("");
  const [prize, setPrize] = useState("");
  const [winnerCount, setWinnerCount] = useState(1);
  const [minutes, setMinutes] = useState(60);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedAt, setQueuedAt] = useState<number | null>(null);

  const submit = async () => {
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/bot-commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "giveaway_start",
          payload: { channel_id: channelId.trim(), prize: prize.trim(), winner_count: winnerCount, minutes },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nie udało się dodać do kolejki.");
        return;
      }
      setPrize("");
      setQueuedAt(Date.now());
      onQueued();
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PartyPopper size={16} className="text-[var(--color-general)]" /> Nowy giveaway
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-[var(--text-muted)]">ID kanału (skopiuj z Discorda)</span>
            <input
              type="text"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="np. 1234567890123456"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-general)]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--text-muted)]">Nagroda</span>
            <input
              type="text"
              value={prize}
              onChange={(e) => setPrize(e.target.value)}
              placeholder="np. Discord Nitro"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-general)]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--text-muted)]">Liczba zwycięzców</span>
            <input
              type="number"
              min={1}
              max={20}
              value={winnerCount}
              onChange={(e) => setWinnerCount(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-general)]"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[var(--text-muted)]">Czas trwania (minuty)</span>
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-general)]"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={sending || !channelId.trim() || !prize.trim()}>
            {sending ? "Wysyłanie..." : "Uruchom giveaway"}
          </Button>
          {queuedAt && Date.now() - queuedAt < 4000 && (
            <span className="text-xs text-[var(--text-muted)]">Dodano do kolejki — bot odbierze w ciągu ~60s.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewTicketPanelForm({ onQueued }: { onQueued: () => void }) {
  const [channelId, setChannelId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedAt, setQueuedAt] = useState<number | null>(null);

  const submit = async () => {
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/admin/bot-commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ticket_panel", payload: { channel_id: channelId.trim() } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Nie udało się dodać do kolejki.");
        return;
      }
      setChannelId("");
      setQueuedAt(Date.now());
      onQueued();
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket size={16} className="text-[var(--color-general)]" /> Nowy panel ticketów
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="space-y-1 block">
          <span className="text-xs text-[var(--text-muted)]">ID kanału, gdzie ma pojawić się przycisk "Otwórz zgłoszenie"</span>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="np. 1234567890123456"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--color-general)]"
          />
        </label>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={sending || !channelId.trim()}>
            {sending ? "Wysyłanie..." : "Wyślij panel"}
          </Button>
          {queuedAt && Date.now() - queuedAt < 4000 && (
            <span className="text-xs text-[var(--text-muted)]">Dodano do kolejki — bot odbierze w ciągu ~60s.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
