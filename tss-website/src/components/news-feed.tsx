"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Tag } from "lucide-react";
import { useLanguage } from "@/hooks/use-translation";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

interface NewsItem {
  id: number;
  title: string;
  content: string;
  image_url: string;
  category: string;
  published_at: string;
}

export function NewsFeed() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // darkMode based on next-themes
  const isDark = theme === "dark";

  useEffect(() => {
    fetch("/api/news")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setNews(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[400px] rounded-[2rem] glass animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {news.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          viewport={{ once: true }}
          className="group relative flex flex-col overflow-hidden rounded-[2.5rem] bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-[var(--color-general)] transition-all duration-500"
        >
          <div className="relative h-48 overflow-hidden">
            <Image
              src={item.image_url || "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070&auto=format&fit=crop"}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute top-4 left-4">
              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest transition-colors ${!isDark ? 'bg-neutral-800/80 text-neutral-100' : 'bg-black/60 text-white'}`}>
                <Tag size={10} className="text-[var(--color-general)]" />
                {item.category}
              </span>
            </div>
          </div>

          <div className="p-8 flex flex-col flex-grow">
            <div className={`flex items-center gap-2 text-[10px] font-bold mb-3 uppercase tracking-wider transition-colors ${!isDark ? 'text-neutral-600' : 'text-zinc-500'}`}>
              <Calendar size={12} />
              {new Date(item.published_at).toLocaleDateString()}
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-4 group-hover:text-[var(--color-general)] transition-colors leading-tight">
              {item.title}
            </h3>
            <p className={`text-sm line-clamp-3 mb-6 font-medium leading-relaxed transition-colors ${!isDark ? 'text-neutral-600' : 'text-zinc-400'}`}>
              {item.content}
            </p>
            <div className="mt-auto">
              <Link
                href={`/news/${item.id}`}
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:gap-4 transition-all text-[var(--color-general)]"
              >
                {t.home.readMore}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
