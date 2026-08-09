"use client";

import { useLanguage } from "@/hooks/use-language";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Newspaper, Trophy, Code2, Check } from "lucide-react";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<{ news: boolean; esport: boolean; dev: boolean }>({ news: true, esport: true, dev: true });
  const [readIds, setReadIds] = useState<string[]>([]);

  useEffect(() => {
    const p = localStorage.getItem("notif_prefs");
    const r = localStorage.getItem("notif_read_ids");
    if (p) {
      try {
        setPrefs(JSON.parse(p));
      } catch {}
    }
    if (r) {
      try {
        setReadIds(JSON.parse(r));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const news = await supabase.from("news").select("*").order("published_at", { ascending: false }).limit(10);
      const esports = await supabase.from("e_sport_events").select("*").order("event_date", { ascending: true }).limit(10);
      const dev = await supabase.from("dev_tasks").select("*").order("created_at", { ascending: false }).limit(10);
      const data: any[] = [];
      (news.data || []).forEach((n: any) => {
        data.push({
          id: `news:${n.id}`,
          type: "news",
          title: n.title,
          description: n.content,
          date: n.published_at,
          read: readIds.includes(`news:${n.id}`),
        });
      });
      (dev.data || []).forEach((d: any) => {
        data.push({
          id: `dev:${d.id}`,
          type: "dev",
          title: d.title,
          description: d.description,
          date: d.created_at,
          read: readIds.includes(`dev:${d.id}`),
        });
      });
      setItems(data);
      setLoading(false);
    };
    load();
  }, [readIds]);

  const unreadCount = useMemo(() => {
    return items.filter((i) => !i.read && (prefs as any)[i.type]).length;
  }, [items, prefs]);

  useEffect(() => {
    localStorage.setItem("notif_unread_count", String(unreadCount));
    window.dispatchEvent(new CustomEvent("notifications:count", { detail: { count: unreadCount } }));
  }, [unreadCount]);

  const togglePref = (key: "news" | "esport" | "dev") => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem("notif_prefs", JSON.stringify(next));
  };

  const markRead = (id: string, read: boolean) => {
    const nextIds = read ? Array.from(new Set([...readIds, id])) : readIds.filter((x) => x !== id);
    setReadIds(nextIds);
    localStorage.setItem("notif_read_ids", JSON.stringify(nextIds));
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read } : i)));
  };

  const markAllRead = () => {
    const ids = items.map((i) => i.id);
    setReadIds(ids);
    localStorage.setItem("notif_read_ids", JSON.stringify(ids));
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const addTest = () => {
    const now = new Date().toISOString();
    const newItem = {
      id: `news:test-${Date.now()}`,
      type: "news",
      title: "Nowa aktualizacja",
      description: "Testowe powiadomienie",
      date: now,
      read: false,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  return (
    <div className="container mx-auto p-6 mt-20 max-w-6xl">
      <Card className="relative overflow-hidden rounded-[2.5rem] bg-black/40 border border-[var(--border-color)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[var(--card-bg)]" />
        <CardHeader className="relative z-10 p-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--text)] font-[family-name:var(--font-space)]">
                {t.settings.notifications}
              </h1>
              <p className="text-zinc-400 mt-2 font-[family-name:var(--font-outfit)]">
                {t.settings.newsDesc}
              </p>
            </div>
            <Badge className="bg-[var(--color-general)]/20 text-[var(--color-general)] border-white/10">
              <Bell size={14} className="mr-2" /> {unreadCount}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 p-8 pt-0 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)]5 border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Newspaper size={16} className="text-[var(--color-records)]" /> News
              </div>
              <Switch checked={prefs.news} onCheckedChange={() => togglePref("news")} />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg)]5 border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Code2 size={16} className="text-[var(--color-dev)]" /> DEV
              </div>
              <Switch checked={prefs.dev} onCheckedChange={() => togglePref("dev")} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={markAllRead} className="rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/90 text-white font-bold">
              <Check size={16} className="mr-2" /> Oznacz wszystko jako przeczytane
            </Button>
            <Button variant="outline" onClick={addTest} className="rounded-2xl border-white/10 hover:bg-white/5 font-bold">
              Dodaj testowe
            </Button>
          </div>

          <div className="space-y-4">
            {loading && (
              <Card className="rounded-2xl bg-white/5 border border-white/10">
                <CardContent className="p-6">Ładowanie...</CardContent>
              </Card>
            )}
            {!loading && items.filter((i) => (prefs as any)[i.type]).length === 0 && (
              <Card className="rounded-2xl bg-white/5 border border-white/10">
                <CardContent className="p-6 text-zinc-300">Brak powiadomień</CardContent>
              </Card>
            )}
            {!loading &&
              items
                .filter((i) => (prefs as any)[i.type])
                .map((i) => (
                  <Card
                    key={i.id}
                    className={`rounded-2xl border ${i.read ? "bg-white/5 border-white/10" : "bg-white/10 border-[var(--color-general)]/20"}`}
                  >
                    <CardContent className="p-6 flex items-start justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {i.type === "news" && <Newspaper size={18} className="text-[var(--color-records)]" />}
                          {i.type === "esport" && <Trophy size={18} className="text-[var(--color-e-sport)]" />}
                          {i.type === "dev" && <Code2 size={18} className="text-[var(--color-dev)]" />}
                          <span className="text-white font-[family-name:var(--font-space)] font-bold">{i.title}</span>
                        </div>
                        <p className="text-zinc-400 font-[family-name:var(--font-outfit)]">{i.description}</p>
                        <p className="text-xs text-zinc-500">{new Date(i.date).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {i.read ? (
                          <Button variant="outline" className="rounded-2xl border-white/10" onClick={() => markRead(i.id, false)}>
                            Przywróć
                          </Button>
                        ) : (
                          <Button className="rounded-2xl bg-[var(--color-general)] text-white" onClick={() => markRead(i.id, true)}>
                            Przeczytane
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
