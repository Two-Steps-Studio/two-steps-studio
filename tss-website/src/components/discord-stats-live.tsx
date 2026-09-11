"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, IdCard } from "lucide-react";
import { useLanguage } from "@/hooks/use-translation";

interface Stats {
  online_users: number;
  total_members: number;
  total_voice_minutes: number;
}

// Discord + website combined, see db/migrations/add-unified-stats.sql.
function formatVoiceTime(minutes: number): string {
  const hours = minutes / 60;
  if (hours < 24) return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} h`;
  return `${Math.floor(hours / 24)} d`;
}

export function DiscordStatsLive() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);

    useEffect(() => {
      fetch("/api/stats")
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setStats(data);
          }
        })
        .catch((err) => console.error("Error fetching stats:", err));
    }, []);

    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {[
          { label: t.home.totalMembers, value: (stats.total_members || 0).toLocaleString(), icon: IdCard, color: "var(--color-general)" },
          { label: t.home.onlineNow, value: (stats.online_users || 0).toLocaleString(), icon: Users, color: "var(--color-dev)" },
          { label: t.home.voiceTime, value: formatVoiceTime(stats.total_voice_minutes || 0), icon: Clock, color: "var(--color-records)" },
        ].map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="relative overflow-hidden glass rounded-[2.5rem] p-8 flex flex-col items-center md:items-start group border border-white/5 hover:border-white/10 transition-all"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-white/10 transition-colors">
              <item.icon size={24} style={{ color: item.color }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{item.label}</span>
          </div>
          <span className="text-5xl font-black tracking-tighter">{item.value}</span>
          <div className="absolute -bottom-2 -right-2 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <item.icon size={120} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
