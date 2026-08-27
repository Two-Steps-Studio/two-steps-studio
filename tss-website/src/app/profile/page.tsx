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
import { Mail, Shield, Trophy, Star, Bell, Link as LinkIcon, CheckCircle2, Coins, Award, Lock, MessageSquare, Mic } from "lucide-react";
import LogoutButton from "./logout-button";
import Image from "next/image";
import Link from "next/link";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BACKGROUND_OPTIONS } from "./profile-form";
import AvatarFrame from "@/components/AvatarFrame";
import { Achievement, RARITY_COLOR, statForRequirement } from "@/lib/achievements";
import { DiscordRolesPanel, ROLE_MAP_BADGE } from "@/components/DiscordRolesPanel";

interface RankedUser {
    id: string;
    discord_id: string;
    username?: string;
    discord_name?: string;
    avatar_url?: string;
    level?: number;
    xp?: number;
    money?: number;
    rank: number;
}

const fetchRankingData = async () => {
    const { data: levelUsers } = await supabase.from("profiles").select("id, discord_id, username, avatar_url, level, xp").order("level", { ascending: false }).limit(100);
    const { data: moneyUsers } = await supabase.from("profiles").select("id, discord_id, username, avatar_url, money").order("money", { ascending: false }).limit(100);

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
    // Resolved hex value for profile?.equipped_nick_color, which stores a
    // shop_items.id reference, not the color directly.
    const [nickColorValue, setNickColorValue] = useState<string | null>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);

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

            // Backfill profiles.avatar_url from the live Discord OAuth session the
            // first time it's missing - the bot never writes this column, so
            // anyone who never manually uploaded a custom avatar has it null,
            // and the public /profile/[id] view (no access to this session) had
            // nothing to fall back to. Fire-and-forget: doesn't block rendering,
            // and it's fine if it lands a moment after this render.
            const liveDiscordAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture;
            if (initialProfile && !initialProfile.avatar_url && liveDiscordAvatar) {
                supabase.from("profiles").update({ avatar_url: liveDiscordAvatar }).eq("id", discordId).then(({ error }) => {
                    if (error) console.error("[Profile] avatar_url backfill failed:", error.message);
                });
            }

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

    useEffect(() => {
        // Frames render straight from the shop_items.id (AvatarFrame picks
        // the matching SVG design) - only nick_color still needs its raw
        // hex value resolved from shop_items.
        const nickColorId = profile?.equipped_nick_color;
        if (!nickColorId) {
            setNickColorValue(null);
            return;
        }
        supabase
            .from("shop_items")
            .select("value")
            .eq("id", nickColorId)
            .maybeSingle()
            .then(({ data }) => setNickColorValue(data?.value ?? null));
    }, [profile?.equipped_nick_color]);

    // Public catalog (RLS: "Anyone can view achievements") - fetched once,
    // "unlocked" is computed below from profile.level/total_messages/
    // total_voice_minutes rather than a separate user_achievements query.
    useEffect(() => {
        supabase
            .from("achievements")
            .select("id, name, description, icon, image_url, rarity, requirement_type, requirement_value")
            .not("requirement_type", "is", null)
            .order("requirement_type")
            .order("requirement_value")
            .then(({ data }) => setAchievements((data as Achievement[]) || []));
    }, []);

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
    // profiles.level defaults to 1 in the DB, but the bot's own
    // getLevelFromXP formula says xp<100 is level 0 - so a fresh/low-activity
    // profile can have `level` sitting ahead of what its actual `xp` supports
    // (currentLevelStartXP > xp). That used to clamp progress to a flat,
    // stuck-looking 0% while the XP numbers below the bar still showed real,
    // moving values. Fall back to xp-over-nextLevelStartXP in that case so
    // the bar fills sensibly instead of looking broken.
    const currentProgressXP = xp >= currentLevelStartXP ? xp - currentLevelStartXP : xp;
    const progressDenominator = xp >= currentLevelStartXP ? neededXP : nextLevelStartXP;
    const progress = Math.min(Math.max((currentProgressXP / progressDenominator) * 100, 0), 100);
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
            {/* Content now lives directly on the banner instead of in a separate
                near-black CardContent block below it (that block was `bg-[var(--card-bg)]`,
                #020202 in dark mode - the solid black area the user asked to remove).
                It's an absolute, centered overlay on top of the image with a soft
                scrim (not a solid block) for legibility. On mobile the banner uses a
                flexible min-height instead of the strict ratio, since the stacked
                avatar/name/level content needs more room than a squat 2:1 box would
                give it at narrow widths; from md: up there's enough space at 2:1 to
                hold the row layout, so the strict ratio kicks in there. */}
            <Card className="relative overflow-hidden rounded-[2.5rem] border-2 border-[var(--border-color)] shadow-2xl py-0 gap-0">
                <div className="relative w-full min-h-[480px] md:min-h-0 md:aspect-[2/1] overflow-hidden bg-[var(--bg)]">
                    <Image
                        src={`/assets/discord/backgrounds/${encodeURIComponent(profileBackground)}.png`}
                        alt=""
                        fill
                        priority
                        className="object-cover"
                        sizes="(max-width: 1152px) 100vw, 1152px"
                    />
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-general)]/15 via-transparent to-transparent opacity-90" />

                    <div className="absolute inset-0 flex items-center justify-center p-6 md:p-10">
                        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full max-w-4xl justify-center">
                            <div className="relative group flex-shrink-0">
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[var(--color-general)] to-transparent opacity-60 blur-md" />
                                {/* Purchased avatar frame (shop_items category 'frame') - a sibling
                                    ring behind the Avatar, not a wrapper around it, so an animated
                                    frame can spin without rotating the avatar image itself. */}
                                <AvatarFrame frameId={profile?.equipped_frame} />
                                <Avatar className="relative h-36 w-36 md:h-44 md:w-44 ring-4 ring-[var(--color-general)]/30 border-2 border-white/30">
                                    <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
                                    <AvatarFallback className="text-4xl bg-white text-black font-bold">{discordName?.[0]}</AvatarFallback>
                                </Avatar>
                                <Badge className="absolute -bottom-2 -right-2 px-3 py-1 text-white font-bold rounded-full shadow-lg" style={{ backgroundColor: roleInfo.color }}>
                                    {roleInfo.label}
                                </Badge>
                            </div>

                            <div className="text-center md:text-left space-y-3 min-w-0 md:max-w-md">
                                <div>
                                    <h1
                                        className={`text-3xl md:text-4xl font-bold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] ${nickColorValue ? "" : "text-white"}`}
                                        style={nickColorValue ? { color: nickColorValue } : undefined}
                                    >
                                        {discordName}
                                    </h1>
                                    {isDiscordLinked ? (
                                        <Badge variant="outline" className="mt-2 border-emerald-400/40 bg-emerald-500/20 backdrop-blur-sm text-emerald-300 gap-1.5">
                                            <CheckCircle2 size={12} /> {t.profile.discordVerified}
                                        </Badge>
                                    ) : (
                                        <Button variant="outline" size="sm" className="mt-2 h-7 bg-indigo-500/20 backdrop-blur-sm border-indigo-400/40 text-indigo-300 text-xs rounded-full gap-2">
                                            <LinkIcon size={12} /> {t.profile.connectDiscord}
                                        </Button>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-white">
                                    <span className="flex items-center gap-1.5 bg-black/35 backdrop-blur-sm px-3 py-1 rounded-full border border-white/15 text-sm"><Mail size={13} /> {user?.email}</span>
                                    <span className="flex items-center gap-1.5 bg-black/35 backdrop-blur-sm px-3 py-1 rounded-full border border-white/15 text-sm"><Shield size={13} /> ID: {user?.id.slice(0, 8)}</span>
                                </div>
                                <DiscordRolesPanel discordRoles={discordRoles} />
                            </div>

                            {/* --accent-color drives the level-progress icon/%/bar - the purchased
                                nick color is meant to recolor "nick + accents like lvl" (explicit
                                user request), not just the name text. Falls back to the site's
                                Ocean theme color when no nick color is equipped. */}
                            <div
                                className="w-full md:w-72 space-y-3 bg-black/35 backdrop-blur-md p-5 rounded-2xl border border-white/15"
                                style={{ "--accent-color": nickColorValue || "var(--color-general)" } as React.CSSProperties}
                            >
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="font-bold flex items-center gap-2 text-white text-base"><Trophy size={15} className="text-[var(--accent-color)]" /> {t.profile.levelProgress}</span>
                                    <span className="font-black text-[var(--accent-color)] text-base">{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} className="h-4 rounded-full bg-white/10 border-white/15" indicatorClassName="bg-[var(--accent-color)]" />
                                <div className="flex justify-between text-xs uppercase font-black opacity-60 text-white">
                                    <span>{xp} XP</span><span>{nextLevelXp} XP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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
                                // Route by u.id (profiles.id, the Discord snowflake used
                                // consistently everywhere else - proxy.ts, RLS, RPCs) rather
                                // than the separate profiles.discord_id column, which can be
                                // empty/stale and pointed the public profile lookup at nothing.
                                <Link key={u.id} href={`/profile/${u.id}`} className={cn("w-full flex items-center justify-between p-4 rounded-xl border transition-colors hover:border-[var(--color-general)]/40",
                                    u.id === discordId ? "bg-[var(--color-general)]/10 border-[var(--color-general)]/30" : "",
                                    idx === 0 ? "bg-yellow-500/10" : "",
                                    idx === 1 ? "bg-zinc-500/10" : "",
                                    idx === 2 ? "bg-orange-600/10" : "",
                                    idx > 2 ? "bg-[var(--bg)]" : ""
                                )}>
                                    <div className="flex items-center gap-4">
                                        <span className="font-black w-6 text-center">{u.rank}</span>
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarImage src={u.avatar_url} />
                                            <AvatarFallback className="text-xs bg-white text-black font-bold">
                                                {(u.username || u.discord_name || "?")[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className={cn("font-bold truncate text-sm", u.id === discordId ? "text-[var(--color-general)]" : "")}>{u.username || u.discord_name || u.email?.split("@")[0] || (u.discord_id ? u.discord_id.slice(0, 14) : t.profile.unknown)}</div>
                                            <div className="text-xs opacity-50">
                                                {topTab === "level" ? `${t.profile.levelLabel} ${u.level}` : `${(u.money / 1000).toFixed(1)}K ${t.profile.coinsShort}`}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>

            {/* ── OSIĄGNIĘCIA ── */}
            {achievements.length > 0 && (
                <div className="rounded-[2.5rem] border-2 border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl">
                    <Card className="bg-transparent border-0 shadow-none rounded-[2.5rem]">
                        <CardHeader className="border-b border-black/10 dark:border-white/5 text-[var(--text)] font-bold italic flex items-center">
                            <Award size={18} className="mr-2 text-[var(--color-general)]" /> {t.profile.achievements}
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {achievements.map((a) => {
                                    const current = statForRequirement(a.requirement_type, profile);
                                    const target = a.requirement_value || 1;
                                    const unlocked = current >= target;
                                    const color = RARITY_COLOR[a.rarity] || RARITY_COLOR.common;
                                    const icon = a.requirement_type === "messages"
                                        ? <MessageSquare size={20} />
                                        : a.requirement_type === "voice_minutes"
                                        ? <Mic size={20} />
                                        : <Trophy size={20} />;

                                    return (
                                        <div
                                            key={a.id}
                                            title={a.description}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-2xl border transition-all",
                                                unlocked ? "bg-[var(--bg)]" : "bg-[var(--bg)] opacity-40 grayscale"
                                            )}
                                            style={unlocked ? { borderColor: `${color}55`, boxShadow: `0 0 0 1px ${color}22` } : { borderColor: "var(--border-color)" }}
                                        >
                                            <div
                                                className={cn(
                                                    "h-11 w-11 rounded-full flex items-center justify-center text-lg shrink-0 overflow-hidden",
                                                    !unlocked && !a.image_url && "grayscale"
                                                )}
                                                style={a.image_url ? undefined : { backgroundColor: unlocked ? `${color}22` : "transparent", color: unlocked ? color : "var(--text)" }}
                                            >
                                                {a.image_url ? (
                                                    <Image src={a.image_url} alt="" width={44} height={44} className="h-full w-full object-cover" />
                                                ) : (
                                                    a.icon || icon
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-sm text-[var(--text)] truncate">{a.name}</span>
                                                    {!unlocked && <Lock size={11} className="text-[var(--text)] opacity-50 shrink-0" />}
                                                </div>
                                                <p className="text-xs text-[var(--text)] opacity-60 truncate">{a.description}</p>
                                                {!unlocked && (
                                                    <p className="text-[10px] font-bold opacity-50 text-[var(--text)] mt-0.5">
                                                        {Math.min(current, target).toLocaleString()} / {target.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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