"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, ArrowLeft, CheckCircle, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";

export default function AddGamePage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [category, setCategory] = useState("RPG");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [games, setGames] = useState<any[]>([]);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch all games for editing
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch("/api/games/get-all");
        if (!res.ok) {
          throw new Error("Błąd pobierania gier");
        }
        const { data } = await res.json();
        setGames(data || []);
      } catch (error) {
        console.error("[GAMES] Error fetching games:", error);
        toast.error("Błąd pobierania listy gier");
      }
    };

    fetchGames();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Podaj nazwę gry!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/games/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          release_date: releaseDate || null,
          category,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Błąd dodawania gry");
      }

      toast.success("Grę dodano do launchera!");
      setSuccess(true);
      setName("");
      setDescription("");
      setReleaseDate("");

      // Refresh games list
      const refreshRes = await fetch("/api/games/get-all");
      if (refreshRes.ok) {
        const { data: refreshData } = await refreshRes.json();
        setGames(refreshData || []);
      }
    } catch (error) {
      console.error("[ADD GAME] Error:", error);
      toast.error(error instanceof Error ? error.message : "Błąd dodawania gry");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (game: any) => {
    setEditingGame(game);
    setName(game.name);
    setDescription(game.description);
    setReleaseDate(game.release_date || "");
    setCategory(game.category || "RPG");
    setIsEditing(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Podaj nazwę gry!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/games/post`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingGame.id,
          name,
          description,
          release_date: releaseDate || null,
          category,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Błąd aktualizacji gry");
      }

      toast.success("Grę zaktualizowano!");
      setIsEditing(false);
      setEditingGame(null);
      setName("");
      setDescription("");
      setReleaseDate("");

      // Refresh games list
      const refreshRes = await fetch("/api/games/get-all");
      if (refreshRes.ok) {
        const { data: refreshData } = await refreshRes.json();
        setGames(refreshData || []);
      }
    } catch (error) {
      console.error("[UPDATE GAME] Error:", error);
      toast.error(error instanceof Error ? error.message : "Błąd aktualizacji gry");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Czy na pewno chcesz usunąć tę grę?")) {
      return;
    }

    try {
      const res = await fetch(`/api/games/post`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Błąd usuwania gry");
      }

      toast.success("Grę usunięto!");

      // Refresh games list
      const refreshRes = await fetch("/api/games/get-all");
      if (refreshRes.ok) {
        const { data: refreshData } = await refreshRes.json();
        setGames(refreshData || []);
      }
    } catch (error) {
      console.error("[DELETE GAME] Error:", error);
      toast.error(error instanceof Error ? error.message : "Błąd usuwania gry");
    }
  };

  return (
    <div className="container mx-auto p-6 mt-20 max-w-6xl">
      {/* Hero Section */}
      <div className="relative mb-12 md:aspect-video p-8 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md flex flex-col items-center justify-center">
        {/* Hero Background Image - podmień src, aby dodać obraz tła */}
        {/* <img src="" alt="" className="absolute inset-0 h-full w-full object-cover" /> */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-games)]/10 via-transparent to-transparent opacity-50" />
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-games)]/10 blur-3xl" />

        <div className="relative z-10 space-y-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
            <span className="text-[var(--color-games)]">Zarządzanie grami</span>
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto font-[family-name:var(--font-outfit)] text-lg">
            Zarządzaj grami w launcherze Two Steps Studio
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {isEditing ? "Edytuj grę" : "Dodaj nową grę"}
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? "Zaktualizuj informacje o grze"
                  : "Wypełnij formularz, aby dodać grę do launchera"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={isEditing ? handleUpdate : handleSubmit} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-zinc-300 block"
                  >
                    Nazwa gry *
                  </label>
                  <Input
                    id="name"
                    placeholder="np. Informacje o Graczu"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="text-sm font-medium text-zinc-300 block"
                  >
                    Opis gry
                  </label>
                  <Textarea
                    id="description"
                    placeholder="Krótki opis gry, które zostanie wyświetlony w launchera..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 min-h-[120px] resize-none"
                  />
                  <p className="text-xs text-zinc-500">
                    Opisywana gra może zawierać: tryb gry, platformę, tryb rozgrywki
                  </p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label
                    htmlFor="category"
                    className="text-sm font-medium text-zinc-300 block"
                  >
                    Kategoria
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-games)] focus:border-transparent transition-all"
                  >
                    <option value="RPG">RPG</option>
                    <option value="Action">Action</option>
                    <option value="Strategy">Strategy</option>
                    <option value="Puzzle">Puzzle</option>
                    <option value="Adventure">Adventure</option>
                    <option value="Simulation">Simulation</option>
                    <option value="Sports">Sports</option>
                    <option value="Casual">Casual</option>
                    <option value="Horror">Horror</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Release Date */}
                <div className="space-y-2">
                  <label
                    htmlFor="releaseDate"
                    className="text-sm font-medium text-zinc-300 block"
                  >
                    Data premiery
                  </label>
                  <Input
                    id="releaseDate"
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  {isEditing && (
                    <Button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingGame(null);
                        setName("");
                        setDescription("");
                        setReleaseDate("");
                      }}
                      variant="outline"
                      className="text-zinc-400 hover:text-zinc-300"
                    >
                      Anuluj edycję
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        {isEditing ? "Aktualizowanie..." : "Dodawanie..."}
                      </>
                    ) : (
                      <>
                        <Gamepad2 size={18} className="mr-2" />
                        {isEditing ? "Aktualizuj Grę" : "Dodaj Grę"}
                      </>
                    )}
                  </Button>
                  <div>
                    <Link
                      href="/games"
                      className="text-zinc-400 hover:text-zinc-300 text-sm flex items-center gap-2 transition-colors"
                    >
                      <ArrowLeft size={16} />
                      Wróć do launchera
                    </Link>
                  </div>
                </div>
              </form>

              {/* Demo Game Info */}
              <div className="mt-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0">
                    Demo
                  </Badge>
                  <div className="space-y-1">
                    <p className="text-sm text-yellow-200">
                      <strong>Demo grę:</strong> "Informacje o Graczu" można dodać bezpośrednio w panelu
                      Supabase SQL Editor lub użyć SQL INSERT:
                    </p>
                    <code className="text-xs bg-yellow-500/20 px-3 py-2 rounded block overflow-x-auto text-yellow-100">
                      INSERT INTO games (name, description, release_date, category)
                      VALUES ('Informacje o Graczu', 'Pełna analiza profilu gracza...', '2024-01-01', 'RPG');
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Games List Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Lista gier</CardTitle>
              <CardDescription>
                Zarządzaj istniejącymi grami
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {games.length > 0 ? (
                  games.map((game) => (
                    <div key={game.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-white">{game.name}</h3>
                          <p className="text-sm text-zinc-400 mt-1">{game.category}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(game)}
                            className="border-[var(--color-games)]/30 text-[var(--color-games)] hover:bg-[var(--color-games)]/10"
                          >
                            <Edit3 size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(game.id)}
                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{game.description}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-xs text-zinc-600">ID: {game.id}</span>
                        <span className="text-xs text-zinc-600">
                          {game.release_date || "Brak daty"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    Brak zapisanych gier
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-green-500/10 border-green-500/30 max-w-md">
            <CardHeader>
              <div className="flex items-center gap-4">
                <CheckCircle className="text-green-500" size={32} />
                <CardTitle className="text-2xl text-green-400">Grę dodano!</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-400 mb-4">
                Gry "{name}" został(a) dodana do launchera.
              </p>
              <Link
                href="/games"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium transition-colors shadow-lg"
              >
                <ArrowLeft size={18} />
                Wróć do Launchera
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
