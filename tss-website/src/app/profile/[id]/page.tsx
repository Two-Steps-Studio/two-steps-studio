"use client";

// Public, read-only view of someone else's profile (banner/avatar/frame/
// nick color/roles/level/achievements) - no settings form, no email/ID.
// Mirrors ../page.tsx's own-profile display but without any editing.
// Still behind auth (proxy.ts protects everything under /profile/*), so
// "public" here means "any logged-in member", not the open internet.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/hooks/use-translation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Trophy, Star, Award, Lock, MessageSquare, Mic } from "lucide-react";
import Image from "next/image";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BACKGROUND_OPTIONS } from "../profile-form";
import AvatarFrame from "@/components/AvatarFrame";
import { Achievement, RARITY_COLOR, statForRequirement } from "@/lib/achievements";
import { DiscordRolesPanel, ROLE_MAP_BADGE } from "@/components/DiscordRolesPanel";

export default function PublicProfilePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [viewerDiscordId, setViewerDiscordId] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [notFound, setNotFound] = useState(false);
    const [nickColorValue, setNickColorValue] = useState<string | null>(null);
    const [achievements, setAchievements] = useState<Achievement[]>([]);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const myId = user?.user_metadata?.provider_id || user?.id || null;
            setViewerDiscordId(myId);

            // Viewing yourself here would show a stripped-down (no settings)
            // version of your own profile - just send them to the real one.
            if (myId && myId === params.id) {
                router.replace("/profile");
                return;
            }

            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", params.id)
                .maybeSingle();

            if (!data) {
                setNotFound(true);
            } else {
                setProfile(data);
            }
            setLoading(false);
        })();
    }, [params.id, router]);

    useEffect(() => {
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

    useEffect(() => {
        supabase
            .from("achievements")
            .select("id, name, description, icon, image_url, rarity, requirement_type, requirement_value")
            .not("requirement_type", "is", null)
            .order("requirement_type")
            .order("requirement_value")
            .then(({ data }) => setAchievements((data as Achievement[]) || []));
    }, []);

    if (loading) {
        return <div className="p-20 text-center italic">{t.profile.loading}</div>;
    }

    if (notFound) {
        return (
            <div className="container mx-auto p-6 mt-20 max-w-2xl text-center space-y-4">
                <h1 className="text-2xl font-bold text-[var(--text)]">{t.profile.userNotFound}</h1>
                <BottomNavigation />
            </div>
        );
    }

    const roleInfo = ROLE_MAP_BADGE[profile?.rank] || { color: "var(--color-general)", label: `LEVEL ${profile?.level || 1}` };
    const displayName = profile?.username || t.profile.unknown;
    const xp = profile?.xp || 0;
    const level = profile?.level || 1;
    const currentLevelStartXP = Math.pow(level / 0.1, 2);
    const nextLevelStartXP = Math.pow((level + 1) / 0.1, 2);
    const neededXP = nextLevelStartXP - currentLevelStartXP;
    // See ../page.tsx for why this isn't a plain xp - currentLevelStartXP:
    // profiles.level defaults to 1 even when actual xp doesn't support it yet
    // under the bot's own getLevelFromXP formula, which used to clamp this to
    // a stuck-looking flat 0%.
    const currentProgressXP = xp >= currentLevelStartXP ? xp - currentLevelStartXP : xp;
    const progressDenominator = xp >= currentLevelStartXP ? neededXP : nextLevelStartXP;
    const progress = Math.min(Math.max((currentProgressXP / progressDenominator) * 100, 0), 100);
    const nextLevelXp = Math.round(nextLevelStartXP);
    const discordRoles = Array.isArray(profile?.discord_roles) ? profile.discord_roles : [];
    const profileBackground = profile?.background && BACKGROUND_OPTIONS.includes(profile.background)
        ? profile.background
        : "Two Steps Studio";

    return (
        <div className="container mx-auto p-6 space-y-8 mt-20 max-w-6xl pb-16" suppressHydrationWarning>

            {/* ── PROFIL (read-only) ── */}
            <Card className="relative overflow-hidden rounded-[2.5rem] border-2 border-[var(--border-color)] shadow-2xl py-0 gap-0">
                <div className="relative w-full min-h-[420px] md:min-h-0 md:aspect-[2/1] overflow-hidden bg-[var(--bg)]">
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
                                <AvatarFrame frameId={profile?.equipped_frame} />
                                <Avatar className="relative h-36 w-36 md:h-44 md:w-44 ring-4 ring-[var(--color-general)]/30 border-2 border-white/30">
                                    <AvatarImage src={profile?.avatar_url} />
                                    <AvatarFallback className="text-4xl bg-white text-black font-bold">{displayName?.[0]}</AvatarFallback>
                                </Avatar>
                                <Badge className="absolute -bottom-2 -right-2 px-3 py-1 text-white font-bold rounded-full shadow-lg" style={{ backgroundColor: roleInfo.color }}>
                                    {roleInfo.label}
                                </Badge>
                            </div>

                            <div className="text-center md:text-left space-y-3 min-w-0 md:max-w-md">
                                <h1
                                    className={`text-3xl md:text-4xl font-bold tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] ${nickColorValue ? "" : "text-white"}`}
                                    style={nickColorValue ? { color: nickColorValue } : undefined}
                                >
                                    {displayName}
                                </h1>
                                <DiscordRolesPanel discordRoles={discordRoles} />
                            </div>

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

            {/* ── STATYSTYKI (public subset - no PLN balance) ── */}
            <div className="rounded-[2.5rem] border-2 border-[var(--border-color)] bg-[var(--card-bg)] backdrop-blur-xl">
                <Card className="bg-transparent border-0 shadow-none rounded-[2.5rem]">
                    <CardHeader className="border-b border-black/10 dark:border-white/5 text-[var(--text)] font-bold italic flex items-center">
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
                    </CardContent>
                </Card>
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
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <BottomNavigation />
        </div>
    );
}
