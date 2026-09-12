"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Wifi, Clock, MessageSquare, Trophy, Coins, UserPlus, TrendingUp, ShoppingBag, Bot, Paperclip } from "lucide-react";

interface Stats {
  online_users: number;
  total_members: number;
  total_voice_minutes: number;
  messages_today: number;
  bot_online?: boolean;
}
interface ActivityEvent {
  type: "join" | "level_up" | "purchase" | "message";
  username: string;
  detail?: string | null;
  created_at: string;
}
interface Bucket {
  t: string;
  total: number;
  logged_in: number;
  anonymous: number;
  discord_online?: number;
}
interface LeaderUser {
  id: string;
  username?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  money?: number;
  online?: boolean;
}

// Same combined Discord+website stat shown elsewhere on the site (see
// discord-stats-live.tsx) - duplicated rather than imported since it's a
// trivial pure formatter.
function formatVoiceTime(minutes: number): string {
  const hours = minutes / 60;
  if (hours < 24) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
  return `${Math.floor(hours / 24)} d`;
}

const PAGE_COUNT = 3;
const PAGE_ROTATE_MS = 15000;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<Bucket[]>([]);
  const [byLevel, setByLevel] = useState<LeaderUser[]>([]);
  const [byMoney, setByMoney] = useState<LeaderUser[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [page, setPage] = useState(0);

  // Rotates the main content area between chart / leaderboards / activity
  // feed - keeps each view big and readable from across a room instead of
  // cramming everything onto one screen.
  useEffect(() => {
    const rotate = setInterval(() => setPage((p) => (p + 1) % PAGE_COUNT), PAGE_ROTATE_MS);
    return () => clearInterval(rotate);
  }, []);

  // Clock ticks client-side only - starting from null and setting on mount
  // avoids a server/client render mismatch (the server has no "current
  // time" that would match the client's).
  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [statsRes, historyRes, leaderRes, activityRes] = await Promise.all([
          fetch("/api/stats").then((r) => r.json()),
          fetch("/api/site-stats-history").then((r) => r.json()),
          fetch("/api/dashboard-leaderboard").then((r) => r.json()),
          fetch("/api/dashboard-activity").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setStats(statsRes);
        setHistory(Array.isArray(historyRes?.buckets) ? historyRes.buckets : []);
        setByLevel(Array.isArray(leaderRes?.byLevel) ? leaderRes.byLevel : []);
        setByMoney(Array.isArray(leaderRes?.byMoney) ? leaderRes.byMoney : []);
        setActivity(Array.isArray(activityRes?.events) ? activityRes.events : []);
      } catch (e) {
        console.error("[Dashboard] load failed:", e);
      }
    };
    load();
    // 60s, not 30s: this page is meant to be left open on a TV 24/7, so its
    // poll runs forever - halving the rate meaningfully cuts sustained load
    // on the DB (4 endpoints x every poll) without hurting a TV display,
    // which doesn't need 30s data freshness.
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // site-stats-history's `total` is website sessions only (its other
  // consumer, the homepage's online-chart.tsx, needs that exact meaning
  // kept intact) - add discord_online here so this chart's "Online" line
  // matches the same Discord + website definition the top stat tile uses,
  // instead of only ever showing website traffic and looking disconnected
  // from a much higher number above it.
  const chartData = history.map((b) => ({
    time: new Date(b.t).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
    Online: b.total + (b.discord_online || 0),
  }));

  return (
    <div className="fixed inset-0 z-[100] bg-[#05080a] text-white overflow-y-auto">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-15%] left-[-5%] w-[60%] h-[60%] bg-[#1bbdbd] blur-[160px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[60%] h-[60%] bg-[#ad83f8] blur-[160px] rounded-full" />
      </div>

      <div className="max-w-[1800px] mx-auto p-10 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/assets/Logo/Glowne/Two Steps Studio Bez Tła.png"
              alt="TSS"
              className="h-16 w-16 object-contain"
            />
            <div>
              <h1 className="text-4xl font-black tracking-tight italic">TWO STEPS STUDIO</h1>
              <div className="flex items-center gap-3">
                <p className="text-white/40 text-lg font-medium uppercase tracking-[0.3em]">Live Dashboard</p>
                {stats && (
                  <span
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border"
                    style={
                      stats.bot_online
                        ? { color: "#06e402", borderColor: "#06e40244", background: "#06e40211" }
                        : { color: "#e74c3c", borderColor: "#e74c3c44", background: "#e74c3c11" }
                    }
                  >
                    <Bot size={12} />
                    {stats.bot_online ? "Bot online" : "Bot offline"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-black tabular-nums">
              {now ? now.toLocaleTimeString("pl-PL") : "--:--:--"}
            </div>
            <div className="text-white/40 text-lg">
              {now ? now.toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" }) : ""}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatTile icon={Users} label="Członkowie" value={stats?.total_members ?? "—"} color="#1bbdbd" />
          <StatTile icon={Wifi} label="Online" value={stats?.online_users ?? "—"} color="#06e402" />
          <StatTile
            icon={Clock}
            label="Czas głosowy"
            value={stats ? formatVoiceTime(stats.total_voice_minutes) : "—"}
            color="#ad83f8"
          />
          <StatTile icon={MessageSquare} label="Wiadomości dziś" value={stats?.messages_today ?? "—"} color="#ffcb2f" />
        </div>

        <div key={page} className="animate-[fadein_0.6s_ease]">
          {page === 0 && (
            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8">
              <h2 className="text-2xl font-black uppercase tracking-wide mb-6 text-white/70">Aktywność (24h)</h2>
              <ResponsiveContainer width="100%" height={420}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="onlineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1bbdbd" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#1bbdbd" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={14} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={14} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
                  <Area type="monotone" dataKey="Online" stroke="#1bbdbd" strokeWidth={3} fill="url(#onlineGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {page === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Leaderboard title="Top poziom" icon={Trophy} color="#ffcb2f" users={byLevel} valueKey="level" valueSuffix=" lvl" />
              <Leaderboard title="Top zarobki" icon={Coins} color="#1bbdbd" users={byMoney} valueKey="money" valueSuffix="" />
            </div>
          )}

          {page === 2 && <ActivityFeed events={activity} messagesToday={stats?.messages_today} />}
        </div>

        <div className="flex justify-center gap-2">
          {Array.from({ length: PAGE_COUNT }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === page ? 28 : 10,
                background: i === page ? "#1bbdbd" : "rgba(255,255,255,0.15)",
              }}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8 flex flex-col gap-3">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${color}22` }}>
        <Icon size={28} style={{ color }} />
      </div>
      <div className="text-6xl font-black tabular-nums">{value}</div>
      <div className="text-white/40 text-lg uppercase tracking-widest font-bold">{label}</div>
    </div>
  );
}

// `text` is just the action line (username + this) - message content used to
// be crammed into the same single-line, single-`truncate` span as the
// action verb ('napisał(a): "..."'), so anything past a few words got cut
// off mid-sentence with no visual separation from the "who did what" line.
// Message previews now render as their own quoted line below (see
// ActivityFeed), so `text` for 'message' stays a plain action verb.
const ACTIVITY_META: Record<ActivityEvent["type"], { icon: React.ElementType; color: string; text: (e: ActivityEvent) => string }> = {
  join: { icon: UserPlus, color: "#06e402", text: () => "dołączył(a) do serwera" },
  level_up: { icon: TrendingUp, color: "#ffcb2f", text: (e) => `awansował(a) na ${e.detail || "nowy poziom"}` },
  purchase: { icon: ShoppingBag, color: "#1bbdbd", text: (e) => `kupił(a) ${e.detail || "przedmiot"}` },
  message: { icon: MessageSquare, color: "#9aa5b1", text: () => "napisał(a) na czacie" },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "teraz";
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h temu`;
  return `${Math.floor(hours / 24)} d temu`;
}

function ActivityFeed({ events, messagesToday }: { events: ActivityEvent[]; messagesToday?: number }) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black uppercase tracking-wide text-white/70">Aktywność na żywo</h2>
        {typeof messagesToday === "number" && (
          <span className="flex items-center gap-2 text-lg font-black tabular-nums text-white/50">
            <MessageSquare size={18} className="text-[#ffcb2f]" />
            {messagesToday}
            <span className="text-sm font-bold uppercase tracking-widest text-white/30">dzisiaj</span>
          </span>
        )}
      </div>
      <div className="space-y-3">
        {events.length === 0 && <p className="text-white/30 text-lg">Brak ostatniej aktywności</p>}
        {events.map((e, i) => {
          const meta = ACTIVITY_META[e.type] ?? ACTIVITY_META.join;
          const Icon = meta.icon;
          const isAttachmentNote = e.detail === "[załącznik]";
          const showQuote = e.type === "message" && !!e.detail;
          return (
            <div key={i} className="flex items-start gap-4 rounded-2xl bg-white/[0.03] px-5 py-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${meta.color}22` }}>
                <Icon size={20} style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xl truncate block">
                  <span className="font-bold">{e.username}</span>{" "}
                  <span className="text-white/50">{meta.text(e)}</span>
                </span>
                {showQuote && (
                  isAttachmentNote ? (
                    <span className="mt-1 inline-flex items-center gap-1.5 text-white/40 text-base">
                      <Paperclip size={14} /> wysłał(a) załącznik
                    </span>
                  ) : (
                    <p className="mt-1 text-white/40 text-lg italic leading-snug line-clamp-2 break-words">
                      „{e.detail}”
                    </p>
                  )
                )}
              </div>
              <span className="text-white/30 text-sm tabular-nums shrink-0 mt-1">{formatRelativeTime(e.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Leaderboard({
  title,
  icon: Icon,
  color,
  users,
  valueKey,
  valueSuffix,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  users: LeaderUser[];
  valueKey: "level" | "money";
  valueSuffix: string;
}) {
  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-8">
      <div className="flex items-center gap-3 mb-6">
        <Icon size={24} style={{ color }} />
        <h2 className="text-2xl font-black uppercase tracking-wide text-white/70">{title}</h2>
      </div>
      <div className="space-y-3">
        {users.length === 0 && <p className="text-white/30 text-lg">Brak danych</p>}
        {users.map((u, i) => (
          <div key={u.id} className="flex items-center gap-4 rounded-2xl bg-white/[0.03] px-5 py-3">
            <span className="text-2xl font-black w-8 text-white/40">#{i + 1}</span>
            <LeaderAvatar avatarUrl={u.avatar_url} online={u.online} />
            <span className="flex-1 text-xl font-bold truncate">{u.username || "Nieznany"}</span>
            <span className="text-xl font-black tabular-nums" style={{ color }}>
              {(u[valueKey] ?? 0).toLocaleString("pl-PL")}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderAvatar({ avatarUrl, online }: { avatarUrl?: string; online?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative w-10 h-10 shrink-0">
      {avatarUrl && !broken ? (
        <img
          // Routed through our own origin - direct <img src> to
          // cdn.discordapp.com failed to load on this site specifically
          // (verified: same URL loads fine navigated to directly or from
          // discordapp.com itself), see api/avatar-proxy/route.ts.
          src={`/api/avatar-proxy?url=${encodeURIComponent(avatarUrl)}`}
          alt=""
          className="w-10 h-10 rounded-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-white/10" />
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#06e402] border-2 border-[#05080a]" />
      )}
    </div>
  );
}
