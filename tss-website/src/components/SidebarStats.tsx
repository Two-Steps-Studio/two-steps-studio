"use client";

import { BarChart3, Users, Clock } from "lucide-react";

interface SidebarStatsProps {
  translations: any;
  stats: {
    online_users: number;
    total_members: number;
    total_voice_minutes: number;
  };
}

// Same combined Discord+website stat the homepage widget shows (see
// discord-stats-live.tsx) - duplicated rather than imported since it's a
// trivial pure formatter.
function formatVoiceTime(minutes: number): string {
  const hours = minutes / 60;
  if (hours < 24) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function SidebarStats({ translations, stats }: SidebarStatsProps) {
  return (
    <div className="px-4 mb-6">
      <div className="glass rounded-[2rem] p-5 overflow-hidden relative group border border-[var(--border-color)]">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--color-general)] opacity-5 blur-2xl group-hover:opacity-10 transition-opacity" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 flex items-center gap-2 text-[var(--text)]">
            <BarChart3 size={12} className="text-[var(--color-general)] shrink-0" /> {translations.nav.stats}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg glass flex items-center justify-center border border-[var(--border-color)]">
                <Users size={14} className="opacity-70 text-[var(--text)]" />
              </div>
              <span className="text-xs font-bold opacity-60 text-[var(--text)] truncate">{translations.nav.online}</span>
            </div>
            <span className="text-xs font-black text-[var(--text)] whitespace-nowrap shrink-0">{(stats.online_users || 0).toString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg glass flex items-center justify-center border border-[var(--border-color)]">
                <Users size={14} className="opacity-70 text-[var(--text)]" />
              </div>
              <span className="text-xs font-bold opacity-60 text-[var(--text)] truncate">{translations.home.totalMembers}</span>
            </div>
            <span className="text-xs font-black text-[var(--text)] whitespace-nowrap shrink-0">{(stats.total_members || 0).toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg glass flex items-center justify-center border border-[var(--border-color)]">
                <Clock size={14} className="opacity-70 text-[var(--text)]" />
              </div>
              <span className="text-xs font-bold opacity-60 text-[var(--text)] truncate">{translations.home.voiceTime}</span>
            </div>
            <span className="text-xs font-black text-[var(--text)] whitespace-nowrap shrink-0">{formatVoiceTime(stats.total_voice_minutes || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
