"use client";

import { useEffect, useState, memo } from "react";
import { motion } from "framer-motion";
import { Users, IdCard } from "lucide-react";
import { useLanguage } from "@/hooks/use-translation";

interface SiteStats {
  online_site: number;
  total_profiles: number;
  online_logged_in?: number;
  online_anonymous?: number;
}

export const HomeSiteStats = memo(function HomeSiteStats() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    fetch("/api/site-stats")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setStats(data);
        }
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    { label: "Online na stronie", value: (stats.online_site || 0).toLocaleString(), icon: Users, color: "var(--color-general)" },
    { label: "Kont utworzonych", value: (stats.total_profiles || 0).toLocaleString(), icon: IdCard, color: "var(--color-dev)" },
    ...(typeof stats.online_logged_in === "number" ? [{ label: "Online zalogowani", value: (stats.online_logged_in || 0).toLocaleString(), icon: Users, color: "var(--color-e-sport)" }] : []),
    ...(typeof stats.online_anonymous === "number" ? [{ label: "Online anonimowi", value: (stats.online_anonymous || 0).toLocaleString(), icon: Users, color: "var(--color-records)" }] : []),
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.95 }}
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
});
