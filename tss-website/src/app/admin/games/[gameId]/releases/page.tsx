"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Plus, Archive, Star } from "lucide-react";
import type { GameRelease } from "@/types/game-distribution";

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Szkic",
  published: "Opublikowane",
  archived: "Zarchiwizowane",
};

export default function AdminGameReleasesPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const [releases, setReleases] = useState<GameRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdmin, setCheckedAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/auth");
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      } finally {
        setCheckedAdmin(true);
      }
    })();
  }, []);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/games/${gameId}/releases`);
      const data = await response.json();
      setReleases(data.data || []);
    } catch (error) {
      console.error("Failed to fetch releases:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchReleases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const archiveRelease = async (releaseId: string) => {
    if (!confirm("Zarchiwizować to wydanie? Pliki w Storage nie zostaną usunięte.")) return;
    try {
      await fetch(`/api/admin/games/releases/${releaseId}`, { method: "DELETE" });
      fetchReleases();
    } catch (error) {
      console.error("Failed to archive release:", error);
    }
  };

  if (checkedAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Access
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/games" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> Wszystkie gry
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Historia wydań</h1>
          <Link href={`/admin/games/${gameId}/releases/new`}>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nowe wydanie
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8 text-white/70">Ładowanie...</div>
            ) : releases.length === 0 ? (
              <div className="text-center py-8 text-white/50">Brak wydań — opublikuj pierwsze</div>
            ) : (
              <div className="space-y-3">
                {releases.map((release) => (
                  <div
                    key={release.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        v{release.version}
                        <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-xs">
                          {release.platform}
                        </Badge>
                        {release.is_current && (
                          <Badge className="bg-yellow-600 text-xs gap-1">
                            <Star className="w-3 h-3" /> Aktualna
                          </Badge>
                        )}
                      </div>
                      <div className="text-white/50 text-sm mt-1">
                        {STATUS_LABEL[release.status] || release.status} • {release.file_count} plików • {formatBytes(release.total_size_bytes)}
                        {release.published_at && ` • opublikowano ${new Date(release.published_at).toLocaleString("pl-PL")}`}
                      </div>
                      {release.release_notes && (
                        <div className="text-white/60 text-sm mt-1 max-w-xl">{release.release_notes}</div>
                      )}
                    </div>
                    {release.status !== "archived" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={() => archiveRelease(release.id)}
                      >
                        <Archive className="w-4 h-4" /> Archiwizuj
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
