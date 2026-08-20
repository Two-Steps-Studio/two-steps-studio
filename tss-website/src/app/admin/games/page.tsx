"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Gamepad2, ChevronRight } from "lucide-react";
import type { Game } from "@/types/games-records";

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdmin, setCheckedAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/auth");
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error("Failed to check admin status:", error);
      } finally {
        setCheckedAdmin(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/games");
        const data = await response.json();
        setGames(data.data || []);
      } catch (error) {
        console.error("Failed to fetch games:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  if (checkedAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Access
            </CardTitle>
            <CardDescription>
              You don't have admin privileges. Contact the system administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Gamepad2 className="w-8 h-8" />
            Zarządzanie grami
          </h1>
          <p className="text-white/70">Publikacja i wersje buildów gier</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gry</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-white/70">Ładowanie...</div>
            ) : games.length === 0 ? (
              <div className="text-center py-8 text-white/50">Brak gier</div>
            ) : (
              <div className="space-y-3">
                {games.map((game) => (
                  <Link
                    key={game.id}
                    href={`/admin/games/${game.id}/releases`}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {game.thumbnail_url ? (
                        <img src={game.thumbnail_url} alt={game.title} className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {game.title[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{game.title}</div>
                        <div className="text-white/50 text-sm">{game.developer || "—"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="bg-white/10 border-white/20 text-white">
                        {game.status}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-white/50" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
