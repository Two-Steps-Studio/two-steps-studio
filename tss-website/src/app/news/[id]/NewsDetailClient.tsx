"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-translation";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  published_at: string;
  author?: string;
}

export default function NewsDetailClient({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLanguage();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = use(params);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await fetch(`/api/news?id=${id}`);
        if (!res.ok) {
          throw new Error("Nie znaleziono newsa");
        }
        setItem(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nieznany błąd");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-4xl">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-general)]"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-4xl">
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 mb-8">
          <strong>Błąd:</strong> {error || "Nie znaleziono newsa"}
        </div>
        <Link href="/news" className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-general)] hover:bg-[var(--color-general)]/90 text-white rounded-full font-medium transition-colors shadow-lg">
          <ArrowLeft size={18} />
          {t.news.title}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 mt-20 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/news"
          className="inline-flex items-center gap-2 text-[var(--color-general)] hover:text-[var(--color-general)]/80 transition-colors"
        >
          <ArrowLeft size={18} />
          <span>{t.news.title}</span>
        </Link>
      </div>

      <Card className="glass rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 bg-white/5">
        <CardHeader className="p-8 pb-4">
          <div className="mb-4">
            <Badge className="bg-[var(--color-general)]/20 text-[var(--color-general)] border-[var(--border-color)]">
              <Clock size={14} className="mr-1" />
              {new Date(item.published_at).toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Badge>
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold text-white">
            {item.title}
          </CardTitle>
          {item.author && (
            <CardDescription className="flex items-center gap-2 text-sm mt-3">
              <User size={14} className="text-[var(--text-muted)]" />
              {item.author}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <p className="text-[var(--text-muted)] leading-relaxed whitespace-pre-line font-[family-name:var(--font-outfit)]">
            {item.content}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
