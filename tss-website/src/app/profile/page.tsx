"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/hooks/use-translation";
import ProfileForm from "./profile-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Mail, Shield, Trophy, Star, Bell, Link as LinkIcon, CheckCircle2, Coins } from "lucide-react";
import LogoutButton from "./logout-button";
import Image from "next/image";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BACKGROUND_OPTIONS } from "./profile-form";

const ROLE_PRIORITY: Array<{ key: string; color: string; label: string }> = [
    { key: "〔 👑︱Owner 〕", color: "#dc3545", label: "OWNER" },
    { key: "〔 👑︱Owner Records 〕", color: "#9b59b6", label: "OWNER RECORDS" },
    { key: "〔 👑︱ Co-Owner Games 〕", color: "#3cd5d3", label: "CO-OWNER GAMES" },
    { key: "〔 🛡️︱Administrator 〕", color: "#f6db6f", label: "ADMIN" },
    { key: "〔 🌐︱Moderator 〕", color: "#2da4f3", label: "MOD" },
    { key: "〔 💜︱Server Booster 〕", color: "#a61cb3", label: "BOOSTER" },
    { key: "〔 🦣 ︱ MVIP〕", color: "#ee1616", label: "MVIP" },
    { key: "〔 🐄 ︱ SVIP〕", color: "#cea009", label: "SVIP" },
    { key: "〔 🐨 ︱ VIP〕", color: "#a7b11a", label: "VIP" },
    { key: "〔 🎙️︱Wykonawca 〕", color: "#c8a800", label: "EXEC" },
    { key: "〔 💽︱Producent 〕", color: "#e09000", label: "PROD" },
    { key: "〔 📢︱Główny Marketingowiec 〕", color: "#e81313", label: "HEAD MKT" },
    { key: "〔 📢︱Marketingowiec 〕", color: "#e81313", label: "MKT" },
    { key: "〔 💻︱Główny Programista 〕", color: "#00bcd4", label: "HEAD DEV" },
    { key: "〔 💻︱Programista 〕", color: "#2979ff", label: "DEV" },
    { key: "〔 🗺️︱Główny Projektantant Poziomów 〕", color: "#43a047", label: "HEAD LD" },
    { key: "〔 🎨︱Główny Artysta 2D 〕", color: "#8d4e1a", label: "HEAD 2D" },
    { key: "〔 🧱︱ Główny Artysta 3D 〕", color: "#8d4e1a", label: "HEAD 3D" },
    { key: "〔✨︱Główny Artysta Efektów 〕", color: "#d4c400", label: "HEAD VFX" },
    { key: "〔 🎧︱Główny Dzwiękowiec 〕", color: "#9e9e9e", label: "HEAD SFX" },
    { key: "〔 🕺︱Główny Animator  〕", color: "#1565c0", label: "HEAD ANIM" },
    { key: "〔 🎮︱ Główny Tester  〕", color: "#9c27b0", label: "HEAD QA" },
    { key: "〔 💀︱ Call Of Duty 〕", color: "#607d8b", label: "COD" },
];

const ROLE_MAP = new Map(ROLE_PRIORITY.map((r, i) => [r.key.trim(), { priority: i, color: r.color, label: r.label }]));

function findRole(raw: string): { priority: number; color: string; label: string } | null {
    const t = raw.trim();

    if (ROLE_MAP.has(t)) return ROLE_MAP.get(t)!;

    const match = raw.match(/︱\s*(.+?)\s*〕/);
    if (!match) return null;

    const inner = match[1]?.trim().toLowerCase();
    if (!inner) return null;

    for (const [key, val] of ROLE_MAP) {
        const keyMatch = key.match(/︱\s*(.+?)\s*〕/);
        if (keyMatch) {
            const ki = keyMatch[1]?.trim().toLowerCase();
            if (ki === inner) return val;
        }
    }
    return null;
}

function DiscordRolesPanel({ discordRoles }: { discordRoles: string[] }) {
    const { t } = useLanguage();
    const matched = discordRoles
        .map((raw) => ({ raw, info: findRole(raw) }))
        .filter((x): x is { raw: string; info: { priority: number; color: string; label: string } } => x.info !== null)
        .sort((a, b) => a.info.priority - b.info.priority);

    if (matched.length === 0) return null;

    return (
        <div className="space-y-2 pt-1">
            <p className="text-[10px] uppercase tracking-[0.14em] font-black text-white/35 select-none">{t.profile.roles} - {matched.length}</p>
            <div className="flex flex-wrap gap-1.5">
                {matched.map(({ raw, info }) => (
                    <span key={raw} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[12px] font-semibold border cursor-default select-none transition-all hover:brightness-125"
                          style={{ color: info.color, borderColor: `${info.color}55`, backgroundColor: `${info.color}1a` }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
                        {info.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

const ROLE_MAP_BADGE: Record<string, { color: string; label: string }> = Object.fromEntries(
    ROLE_PRIORITY.map((r) => [r.key, { color: r.color, label: r.label }])
);

interface RankedUser {
    id: string;
    discord_id: string;
    username?: string;
    discord_name?: string;
    level?: number;
    xp?: number;
    money?: number;
    rank: number;
}

const fetchRankingData = async () => {
    const { data: levelUsers } = await supabase.from("profiles").select("id, discord_id, username, level, xp").order("level", { ascending: false }).limit(100);
    const { data: moneyUsers } = await supabase.from("profiles").select("id, discord_id, username, money").order("money", { ascending: false }).limit(100);

    const usersByLevel: RankedUser[] = (levelUsers || []).map((u, idx: number) => ({
        ...u,
        rank: idx + 1,
        discord_id: u.discord_id || u.id
    }));
    const usersByMoney: RankedUser[] = (moneyUsers || []).map((u, idx: number) => ({
        ...u,
        rank: idx + 1,
        discord_id: u.discord_id || u.id
    }));

    console.log('[PROFILE] Ranking data:', { level: usersByLevel.length, money: usersByMoney.length });
    console.log('[PROFILE] Level users:', JSON.stringify(usersByLevel.slice(0, 3)));

    return { usersByLevel, usersByMoney };
};

export default function ProfilePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [rankingData, setRankingData] = useState<{ usersByLevel: any[]; usersByMoney: any[] }>({ usersByLevel: [], usersByMoney: [] });
    const [topTab, setTopTab] = useState<"level" | "money">("level");

    useEffect(() => {
        let channel: any = null;
        // onAuthStateChange (INITIAL_SESSION) and the getSession() fallback
        // below can both observe an active session on mount and call
        // fetchData concurrently — without this guard, the second call
        // would create a second realtime channel for the same topic while
        // the first is still subscribing, and Supabase rejects adding a
        // postgres_changes listener to a channel that's already past
        // subscribe(). No await happens between the check and the set, so
        // this is safe even though both callers are async.
        let fetchStarted = false;

        const fetchData = async (currentUser: any) => {
            if (fetchStarted) return;
            fetchStarted = true;
            const discordId = currentUser.user_metadata?.provider_id || currentUser.id;

            // Fetch ranking data FIRST (outside realtime callback)
            const rankingData = await fetchRankingData();
            setRankingData(rankingData);

            // Get profile with fallback
            const { data: initialProfile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", discordId)
                .maybeSingle();

            const profileData = initialProfile || { xp: 0, money: 0, bank: 0, level: 1, rank: "", discord_roles: [], pln_balance: 0 };

            // Set profile (but don't call setProfile twice for same event)
            setProfile(profileData);

            // Subscribe AFTER setting initial state.
            //
            // The channel topic includes a random suffix so it can never
            // collide with a previous mount's channel. This matters because
            // supabase.channel(topic) dedupes by topic string across the
            // whole app (shared client singleton) — if a channel for that
            // exact topic already exists, .channel() hands back that SAME
            // object instead of making a new one, and .on() throws on a
            // channel that already had .subscribe() called.
            //
            // A same-named channel from a previous mount can still be
            // *registered* when this runs: supabase.removeChannel() is
            // async (it awaits a real unsubscribe round-trip to the
            // server before deregistering the topic), so a fixed topic
            // like `profile-${discordId}` was never actually safe — even
            // assigning `channel` the instant it's created (a prior fix
            // here) only closes the window where cleanup skips calling
            // removeChannel at all; it can't make that async call finish
            // before React Strict Mode's synchronous remount tries to
            // reuse the same topic a moment later. A unique-per-mount
            // topic sidesteps the whole race: there is never a second
            // subscriber for the same topic to collide with.
            const freshChannel = supabase.channel(`profile-${discordId}-${Math.random().toString(36).slice(2)}`);
            channel = freshChannel;
            freshChannel.on("postgres_changes", {
                event: "UPDATE",  // Only UPDATE, not INSERT/DELETE for profile
                schema: "public",
                table: "profiles",
                filter: `id=eq.${discordId}`
            }, (payload) => {
                // Update only if new profile has different data
                setProfile(prev => {
                    if (!prev) return payload.new;
                    return { ...prev, ...payload.new };
                });
            }).subscribe();

            setLoading(false);
        };

        // Set up realtime subscription FIRST, then check current session.
        // This handles BOTH cases: refresh (where onAuthStateChange may not
        // emit if session state hasn't changed) and initial load.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') { router.push('/login'); return; }
            if (session?.user) {
                setUser(session.user);
                setAuthChecked(true);
                await fetchData(session.user);
            } else if (event === 'INITIAL_SESSION' && !session) {
                // Do NOT redirect here. /profile is already protected by
                // proxy.ts, which verifies the session server-side (via
                // supabase.auth.getUser()) before this page is ever sent to
                // the browser — reaching this code at all proves a valid
                // session exists. But the browser client's own session
                // hydration from storage is async, and onAuthStateChange
                // can fire this exact "no session yet" INITIAL_SESSION event
                // before that hydration finishes, well before the real
                // session arrives a moment later. Redirecting here raced
                // that hydration: it sent an authenticated user to /login,
                // whose middleware immediately bounced them back to
                // /profile since they *are* signed in, which remounted this
                // effect and repeated the race — an infinite reload loop
                // that ended only when the rate limiter kicked in. The
                // getSession() fallback below and the SIGNED_OUT branch
                // above are sufficient without this.
                setAuthChecked(true);
            }
        });

        // Synchronous fallback: check current session immediately.
        // This is the primary path for page refresh where no event is emitted.
        (async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (currentSession?.user) {
                    setUser(currentSession.user);
                    setAuthChecked(true);
                    await fetchData(currentSession.user);
                }
            } catch (err) {
                console.error("[Profile] getSession fallback failed:", err);
            }
        })();

        return () => {
            subscription.unsubscribe();
            if (channel) supabase.removeChannel(channel);
        };
    }, [router]);

    if (!authChecked || (loading && !user)) {
        return <div className="p-20 text-center italic">{t.profile.loading}</div>;
    }

    const discordId = user?.user_metadata?.provider_id || user?.id;
    const isDiscordLinked = user?.app_metadata?.provider === 'discord' || user?.identities?.some((id: any) => id.provider === 'discord');
    const roleInfo = ROLE_MAP_BADGE[profile?.rank] || { color: "var(--color-general)", label: `LEVEL ${profile?.level || 1}` };
    const discordName = user?.user_metadata?.global_name || user?.user_metadata?.full_name || user?.email?.split("@")[0];
    const xp = profile?.xp || 0;
    const level = profile?.level || 1;
    const currentLevelStartXP = Math.pow(level / 0.1, 2);
    const nextLevelStartXP = Math.pow((level + 1) / 0.1, 2);
    const neededXP = nextLevelStartXP - currentLevelStartXP;
    const currentProgressXP = xp - currentLevelStartXP;
    const progress = Math.min(Math.max((currentProgressXP / neededXP) * 100, 0), 100);
    const nextLevelXp = Math.round(nextLevelStartXP);
    const discordRoles = Array.isArray(profile?.discord_roles) ? profile.discord_roles : [];
    const topList = topTab === "level" ? rankingData.usersByLevel : rankingData.usersByMoney;
    // Same 19 backgrounds the Discord bot's profile card draws onto its
    // 1000x500 canvas (tss-dc-bot/assets/discord/backgrounds) - copied into
    // public/ under the same filenames so a profile.background value maps
    // 1:1 to an asset here. "Two Steps Studio" mirrors the bot's own
    // fallback for an unset/unrecognized background value. Validated
    // against BACKGROUND_OPTIONS (same check the bot does with
    // availableBackgrounds.includes(...)) because some existing profiles
    // carry a stale value that isn't one of these filenames (seen live:
    // a full Supabase signed URL from an older/unrelated feature) - passing
    // that straight into the asset path 404s instead of falling back.
    const profileBackground = profile?.background && BACKGROUND_OPTIONS.includes(profile.background)
        ? profile.background
        : "Two Steps Studio";

    return (
        <div className="container mx-auto p-6 space-y-8 mt-20 max-w-6xl pb-16" suppressHydrationWarning>

            {/* ── PROFIL ── */}
            {/* py-0 gap-0 override Card's own default `py-6 flex flex-col gap-6` -
                without them the banner sat inset from the rounded top corners
                with a 24px gap before the content below, instead of being a
                flush, edge-to-edge 2:1 banner. */}
            <Card className="relative overflow-hidden rounded-[2.5rem] border-2 border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-2xl shadow-2xl py-0 gap-0">
                {/* Discord profile-card background - the same 1000x500 asset the bot
                    draws onto its canvas. A real aspect-[2/1] banner (not just an
                    inset-0 layer cropped to whatever height the content needs), so
                    it always scales to the card's full width at a strict 2:1
                    width:height ratio. */}
                <div className="relative w-full aspect-[2/1] overflow-hidden bg-[var(--bg)]">
                    <Image
                        src={`/assets/discord/backgrounds/${encodeURIComponent(profileBackground)}.png`}
                        alt=""
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 1152px) 100vw, 1152px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-transparent to-transparent" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-general)]/15 via-transparent to-transparent opacity-90" />
                <CardContent className="relative z-10 p-8 md:p-12">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group flex-shrink-0">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[var(--color-general)] to-transparent opacity-60 blur-md" />
                            <Avatar className="h-48 w-48 ring-4 ring-[var(--color-general)]/20 border-2 border-[var(--color-general)]/30">
                                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
                                <AvatarFallback className="text-4xl bg-white text-[var(--text)] font-bold">{discordName?.[0]}</AvatarFallback>
                            </Avatar>
                            <Badge className="absolute -bottom-2 -right-2 px-3 py-1 text-[var(--text)] font-bold rounded-full" style={{ backgroundColor: roleInfo.color }}>
                                {roleInfo.label}
                            </Badge>
                        </div>

                        <div className="text-center md:text-left space-y-3 flex-1 min-w-0">
                            <div>
                                <h1 className="text-4xl font-bold text-[var(--text)] tracking-tight">{discordName}</h1>
                                {isDiscordLinked ? (
                                    <Badge variant="outline" className="mt-2 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 gap-1.5">
                                        <CheckCircle2 size={12} /> {t.profile.discordVerified}
                                    </Badge>
                                ) : (
                                    <Button variant="outline" size="sm" className="mt-2 h-7 bg-indigo-500/10 border-indigo-500/30 text-indigo-400 text-xs rounded-full gap-2">
                                        <LinkIcon size={12} /> {t.profile.connectDiscord}
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[var(--text)]">
                                <span className="flex items-center gap-1.5 bg-[var(--bg)] px-3 py-1 rounded-full border border-[var(--border-color)] text-sm"><Mail size={13} /> {user?.email}</span>
                                <span className="flex items-center gap-1.5 bg-[var(--bg)] px-3 py-1 rounded-full border border-[var(--border-color)] text-sm"><Shield size={13} /> ID: {user?.id.slice(0, 8)}</span>
                            </div>
                            <DiscordRolesPanel discordRoles={discordRoles} />
                        </div>

                        <div className="w-full md:w-72 space-y-3 bg-[var(--bg)] p-5 rounded-2xl border border-[var(--border-color)] backdrop-blur-sm">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-bold flex items-center gap-2 text-[var(--text)] text-base"><Trophy size={15} className="text-[var(--color-general)]" /> {t.profile.levelProgress}</span>
                                <span className="font-black text-[var(--color-general)] text-base">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-4 rounded-full bg-white/10 border-[var(--border-color)]"  />
                            <div className="flex justify-between text-xs uppercase font-black opacity-40 text-[var(--text)]">
                                <span>{xp} XP</span><span>{nextLevelXp} XP</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── STATYSTYKI + TOPKA ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Statystyki */}
                <div className="rounded-[2.5rem] border-2 border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl">
                    <Card className="bg-transparent border-0 shadow-none rounded-[2.5rem]">
                        <CardHeader className="border-b border-black/10 dark:border-white/5 text-[var(--text)]  font-bold italic flex items-center">
                            <Star size={18} className="mr-2 text-[var(--color-general)]" /> {t.profile.statistics}
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border-color)]">
                                <span className="text-sm font-bold opacity-60 text-[var(--text)]">{t.profile.wallet}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-[var(--color-general)]">{(profile?.money ?? 0).toLocaleString()}</span>
                                    <Image src="/assets/discord/coin/Coin_TSS.png" alt="C" width={24} height={24} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border-color)]">
                                <span className="text-sm font-bold opacity-60 text-[var(--text)]">{t.profile.bank}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-[var(--color-general)]">{profile?.bank || 0}</span>
                                    <Image src="/assets/discord/coin/Coin_TSS.png" alt="C" width={24} height={24} className="opacity-80" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border-color)]">
                                <span className="text-sm font-bold opacity-60 text-[var(--text)]">{t.profile.plnBalance}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-black text-[var(--color-general)]">{profile?.pln_balance?.toFixed(2) || "0.00"} zł</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Topka */}
                <div className="rounded-[2.5rem] border-2 border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl flex flex-col h-[520px] overflow-hidden">
                    <Card className="bg-transparent border-0 shadow-none rounded-[2.5rem] flex-1 flex flex-col min-h-0">
                        <CardHeader className="border-b border-black/10 dark:border-white/5 flex flex-col gap-3 pb-4 flex-shrink-0">
                            <div className="flex items-center text-[var(--text)] font-bold italic">
                                <Trophy size={18} className="mr-2 text-[var(--color-general)]" /> {t.profile.leaderboard}
                            </div>
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={() => setTopTab("level")}
                                    className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${topTab === "level" ? "bg-[var(--color-general)] text-[var(--text)]" : "bg-[var(--bg)] text-[var(--text)] opacity-60 border-[var(--border-color)] hover:opacity-100 "}`}
                                >
                                    <Trophy size={14} className="inline mr-1.5 -mt-0.5" /> {t.profile.levels}
                                </button>
                                <button
                                    onClick={() => setTopTab("money")}
                                    className={`flex-1 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${topTab === "money" ? "bg-[var(--color-general)] text-[var(--text)] " : "bg-[var(--bg)] text-[var(--text)] opacity-60 border-[var(--border-color)] hover:opacity-100"}`}
                                >
                                    <Coins size={14} className="inline mr-1.5 -mt-0.5" /> {t.profile.money}
                                </button>
                            </div>
                        </CardHeader>
                        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2 no-scrollbar">
                            {topList.length === 0 && (
                                <div className="text-center opacity-40 text-sm pt-8">{t.profile.loading}</div>
                            )}
                            {topList.map((u, idx) => (
                                <div key={u.id} className={cn("w-full flex items-center justify-between p-4 rounded-xl border transition-colors",
                                    u.id === discordId ? "bg-[var(--color-general)]/10 border-[var(--color-general)]/30" : "",
                                    idx === 0 ? "bg-yellow-500/10" : "",
                                    idx === 1 ? "bg-zinc-500/10" : "",
                                    idx === 2 ? "bg-orange-600/10" : "",
                                    idx > 2 ? "bg-[var(--bg)]" : ""
                                )}>
                                    <div className="flex items-center gap-4">
                                        <span className="font-black w-6 text-center">{u.rank}</span>
                                        <div className="w-6"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className={cn("font-bold truncate text-sm", u.discord_id === discordId ? "text-[var(--color-general)]" : "")}>{u.username || u.discord_name || u.email?.split("@")[0] || (u.discord_id ? u.discord_id.slice(0, 14) : t.profile.unknown)}</div>
                                            <div className="text-xs opacity-50">
                                                {topTab === "level" ? `${t.profile.levelLabel} ${u.level}` : `${(u.money / 1000).toFixed(1)}K ${t.profile.coinsShort}`}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* ── USTAWIENIA ── */}
            <div className="rounded-[2.5rem] border-2 border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl">
                <Card className="bg-transparent border-0 shadow-none rounded-[2.5rem]">
                    <CardHeader className="border-b border-black/10 dark:border-white/5 text-[var(--text)] font-bold italic flex items-center">
                        <Bell size={18} className="mr-2 text-[var(--color-general)]" /> {t.settings.title}
                    </CardHeader>
                    <CardContent className="p-8">
                        <ProfileForm
                            user={user}
                            discordId={discordId}
                            profile={profile}
                            onUpdated={(p) => setProfile({ ...profile, ...p })}
                        />
                    </CardContent>
                </Card>
            </div>

            <LogoutButton />
            <BottomNavigation />
        </div>
    );
}