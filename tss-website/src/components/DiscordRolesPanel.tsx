"use client";

// Shared between the own-profile page and the public profile-viewing page.

import { useLanguage } from "@/hooks/use-translation";

export const ROLE_PRIORITY: Array<{ key: string; color: string; label: string }> = [
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

export function findRole(raw: string): { priority: number; color: string; label: string } | null {
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

export const ROLE_MAP_BADGE: Record<string, { color: string; label: string }> = Object.fromEntries(
    ROLE_PRIORITY.map((r) => [r.key, { color: r.color, label: r.label }])
);

export function DiscordRolesPanel({ discordRoles }: { discordRoles: string[] }) {
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
