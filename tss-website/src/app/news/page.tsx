"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight, Newspaper, Clock, User } from "lucide-react";
import { useLanguage } from "@/hooks/use-translation";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
  author?: string;
}

export default function NewsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("/api/news");
        const data = await res.json();
        setNews(data || []);
      } catch (error) {
        console.error("Błąd pobierania newsów:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-general)]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl">
      <div className="mb-12">
        <h1 className="text-5xl font-black tracking-tight text-white font-[family-name:var(--font-space)] mb-4">
          {t.news.title}
        </h1>
        <p className="text-xl font-medium text-zinc-400 font-[family-name:var(--font-outfit)]">
          {t.news.subtitle}
        </p>
      </div>

      {news.length === 0 ? (
        <Card className="w-full max-w-3xl glass rounded-[2.5rem] shadow-2xl border border-white/5">
          <CardContent className="p-12 text-center">
            <Newspaper className="w-16 h-16 mx-auto mb-6 text-zinc-400" />
            <h2 className="text-2xl font-bold mb-2 text-white">{t.news.emptyTitle}</h2>
            <p className="text-zinc-400">{t.news.emptyDesc}</p>
            <Button
              onClick={() => router.push("/")}
              className="mt-6 bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white font-bold"
            >
              {t.news.backHome}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map((item) => (
            <Card
              key={item.id}
              className={`glass rounded-[2rem] shadow-2xl overflow-hidden relative border transition-all duration-300 hover:shadow-[var(--color-general)]/10 hover:border-[var(--color-general)]/20 ${
                !item.published_at
                  ? "bg-red-500/5 border-red-500/20"
                  : item.published_at
                    ? "bg-white/5 border-white/10"
                    : "opacity-50"
              }`}
            >
              <div className="absolute top-4 right-4 z-10">
                {item.published_at ? (
                  <Badge className="bg-[var(--color-general)]/20 text-[var(--color-general)] border-white/10">
                    <Clock size={14} className="mr-1" />
                    {new Date(item.published_at).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <User size={14} className="mr-1" />
                    {t.news.moderated}
                  </Badge>
                )}
              </div>
              <CardHeader className="p-6 pb-4">
                <CardTitle
                  className={`text-2xl font-bold transition-all duration-300 ${
                    !item.published_at
                      ? "text-red-400"
                      : item.published_at
                        ? "text-white"
                        : "opacity-40"
                  }`}
                >
                  {item.title}
                </CardTitle>
                {item.author && (
                  <CardDescription className="flex items-center gap-2 text-sm mt-2">
                    <User size={14} className="text-zinc-500" />
                    {item.author}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-6 pt-0">
                <p className="text-zinc-400 leading-relaxed mb-6 font-[family-name:var(--font-outfit)]">
                  {item.content}
                </p>
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/10 hover:bg-white/5 font-bold w-full"
                  onClick={() => router.push(`/news/${item.id}`)}
                >
                  {t.news.readMore} <ArrowRight size={16} className="ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
