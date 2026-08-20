"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, MessageSquare, Hash } from "lucide-react";
import { useLanguage } from "@/hooks/use-translation";

interface Stats {
  online_users: number;
  active_channels: number;
  messages_today: number;
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
          { label: t.home.onlineNow, value: (stats.online_users || 0).toLocaleString(), icon: Users, color: "var(--color-general)" },
          { label: "Kanały", value: stats.active_channels || 0, icon: Hash, color: "var(--color-dev)" },
          { label: t.home.messagesToday, value: (stats.messages_today || 0).toLocaleString(), icon: MessageSquare, color: "var(--color-records)" },
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
