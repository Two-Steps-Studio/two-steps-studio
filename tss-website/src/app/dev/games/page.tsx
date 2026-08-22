"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Gamepad2,
  Eye,
  Download,
  Calendar,
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";
import type { Game, GameCategory, GameStatus } from "@/types/games-records";

const CATEGORIES: GameCategory[] = ['action', 'adventure', 'rpg', 'strategy', 'simulation', 'sports', 'racing', 'puzzle', 'horror', 'indie', 'other'];

const CATEGORY_LABELS: Record<GameCategory, string> = {
  action: 'Akcja',
  adventure: 'Przygodowa',
  rpg: 'RPG',
  strategy: 'Strategia',
  simulation: 'Symulacja',
  sports: 'Sportowa',
  racing: 'Wyścigi',
  puzzle: 'Logiczna',
  horror: 'Horror',
  indie: 'Indie',
  other: 'Inne',
};

const STATUS_LABELS: Record<GameStatus, string> = {
  draft: 'Szkic',
  published: 'Opublikowana',
  archived: 'Zarchiwizowana',
  coming_soon: 'Wkrótce',
};

const STATUS_COLORS: Record<GameStatus, string> = {
  draft: 'bg-gray-500/20 text-gray-400',
  published: 'bg-green-500/20 text-green-400',
  archived: 'bg-red-500/20 text-red-400',
  coming_soon: 'bg-yellow-500/20 text-yellow-400',
};

export default function GamesAdminPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<GameStatus | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      const res = await fetch("/api/games");
      const data = await res.json();
      setGames(data.data || []);
    } catch (error) {
      console.error("Błąd pobierania gier:", error);
      toast.error("Nie udało się załadować gier");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Czy na pewno chcesz usunąć tę grę?")) return;

    try {
      const res = await fetch(`/api/games?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Gra została usunięta");
        fetchGames();
      } else {
        toast.error(data.error || "Błąd podczas usuwania");
      }
    } catch (error) {
      console.error("Błąd usuwania gry:", error);
      toast.error("Wystąpił błąd podczas usuwania");
    }
  };

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      searchQuery === "" ||
      game.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.developer?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || game.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "all" || game.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-[family-name:var(--font-space)]">
            Zarządzanie Grami
          </h1>
          <p className="text-muted-foreground mt-1">
            Dodawaj, edytuj i usuwaj gry z bazy danych
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[var(--color-games)] text-white hover:bg-[var(--color-games)]/80"
        >
          <Plus size={16} className="mr-2" />
          Dodaj grę
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-3xl border-[var(--border-color)]">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Szukaj gier, deweloperów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter size={16} />
                <span>Kategoria:</span>
              </div>
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                onClick={() => setSelectedCategory("all")}
                size="sm"
              >
                Wszystkie
              </Button>
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  size="sm"
                >
                  {CATEGORY_LABELS[category]}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter size={16} />
                <span>Status:</span>
              </div>
              <Button
                variant={selectedStatus === "all" ? "default" : "outline"}
                onClick={() => setSelectedStatus("all")}
                size="sm"
              >
                Wszystkie
              </Button>
              {(Object.keys(STATUS_LABELS) as GameStatus[]).map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  onClick={() => setSelectedStatus(status)}
                  size="sm"
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-2xl animate-pulse h-48" />
          ))}
        </div>
      ) : filteredGames.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="p-12 text-center">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Brak gier</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                ? "Nie znaleziono gier pasujących do filtrów."
                : "Brak gier w bazie danych. Dodaj pierwszą grę!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGames.map((game) => (
            <Card key={game.id} className="rounded-2xl border-[var(--border-color)] hover:border-[var(--color-games)]/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold line-clamp-1">
                    {game.title}
                  </CardTitle>
                  {game.status && (
                    <Badge className={`text-xs ${STATUS_COLORS[game.status]}`}>
                      {STATUS_LABELS[game.status]}
                    </Badge>
                  )}
                </div>
                {game.developer && (
                  <p className="text-sm text-muted-foreground">{game.developer}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {game.short_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {game.short_description}
                  </p>
                )}

                {game.category && (
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[game.category]}
                  </Badge>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Eye size={12} />
                    <span>{game.views || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download size={12} />
                    <span>{game.downloads || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingGame(game)}
                  >
                    <Edit size={14} className="mr-1" />
                    Edytuj
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(game.id!)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Usuń
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingGame) && (
        <GameFormModal
          game={editingGame}
          onClose={() => {
            setShowCreateModal(false);
            setEditingGame(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingGame(null);
            fetchGames();
          }}
        />
      )}
    </div>
  );
}

// Game Form Modal Component
function GameFormModal({ game, onClose, onSave }: { game: Game | null; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    title: game?.title || "",
    short_description: game?.short_description || "",
    full_description: game?.full_description || "",
    version: game?.version || "",
    developer: game?.developer || "",
    publisher: game?.publisher || "",
    release_date: game?.release_date || "",
    category: game?.category || "indie" as GameCategory,
    genres: game?.genres?.join(", ") || "",
    tags: game?.tags?.join(", ") || "",
    thumbnail_url: game?.thumbnail_url || "",
    banner_url: game?.banner_url || "",
    download_url: game?.download_url || "",
    changelog: game?.changelog || "",
    status: game?.status || "published" as GameStatus,
    visibility: game?.visibility || "public" as "public" | "private" | "unlisted",
    featured: game?.featured || false,
  });

  const [uploading, setUploading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleImageUpload = async (file: File, type: 'thumbnail' | 'banner') => {
    if (!file) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', type);
      uploadFormData.append('gameId', game?.id?.toString() || 'temp');

      const res = await fetch('/api/upload/games', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();

      if (data.success) {
        if (type === 'thumbnail') {
          setFormData({ ...formData, thumbnail_url: data.data.publicUrl });
        } else {
          setFormData({ ...formData, banner_url: data.data.publicUrl });
        }
        toast.success('Zdjęcie zostało przesłane');
      } else {
        toast.error(data.error || 'Błąd podczas przesyłania');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Wystąpił błąd podczas przesyłania');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error("Tytuł jest wymagany");
      return;
    }

    const payload: any = {
      ...formData,
      genres: formData.genres.split(",").map(g => g.trim()).filter(Boolean),
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    try {
      const url = "/api/games";
      const method = game ? "PUT" : "POST";
      
      if (game) {
        payload.id = game.id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || `Błąd HTTP: ${res.status}`);
        return;
      }

      if (data.success) {
        toast.success(game ? "Gra zaktualizowana" : "Gra utworzona");
        onSave();
      } else {
        toast.error(data.error || "Błąd podczas zapisu");
      }
    } catch (error) {
      console.error("Błąd zapisu:", error);
      toast.error("Wystąpił błąd podczas zapisu");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <CardHeader>
          <CardTitle>{game ? "Edytuj grę" : "Dodaj nową grę"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tytuł *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Krótki opis</label>
              <Input
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Pełny opis</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-input bg-background"
                value={formData.full_description}
                onChange={(e) => setFormData({ ...formData, full_description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Wersja</label>
                <Input
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data wydania</label>
                <Input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Deweloper</label>
                <Input
                  value={formData.developer}
                  onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Wydawca</label>
                <Input
                  value={formData.publisher}
                  onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Kategoria</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as GameCategory })}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Gatunki (przecinkami)</label>
              <Input
                placeholder="np. akcja, sci-fi, przygodowa"
                value={formData.genres}
                onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tagi (przecinkami)</label>
              <Input
                placeholder="np. single-player, multiplayer, coop"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Link do pobrania</label>
              <Input
                type="url"
                value={formData.download_url}
                onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Obrazy</label>
              
              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">
                  Miniatura — okładka w proporcji 2:3 (szer:wys), np. 400×600px. Większe obrazy zostaną przeskalowane i przycięte do tej proporcji.
                </label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setThumbnailFile(file);
                    }}
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => thumbnailFile && handleImageUpload(thumbnailFile, 'thumbnail')}
                    disabled={!thumbnailFile || uploading}
                  >
                    <Upload size={16} className="mr-1" />
                    {uploading ? 'Przesyłanie...' : 'Prześlij'}
                  </Button>
                </div>
                {formData.thumbnail_url && (
                  <div className="relative w-20 aspect-[2/3] rounded-lg overflow-hidden border border-white/10">
                    <img src={formData.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => setFormData({ ...formData, thumbnail_url: '' })}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Banner Upload */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Baner</label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setBannerFile(file);
                    }}
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => bannerFile && handleImageUpload(bannerFile, 'banner')}
                    disabled={!bannerFile || uploading}
                  >
                    <Upload size={16} className="mr-1" />
                    {uploading ? 'Przesyłanie...' : 'Prześlij'}
                  </Button>
                </div>
                {formData.banner_url && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                    <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => setFormData({ ...formData, banner_url: '' })}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Changelog</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 rounded-lg border border-input bg-background"
                value={formData.changelog}
                onChange={(e) => setFormData({ ...formData, changelog: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as GameStatus })}
                >
                  {(Object.keys(STATUS_LABELS) as GameStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Widoczność</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                >
                  <option value="private">Prywatna</option>
                  <option value="public">Publiczna</option>
                  <option value="unlisted">Niewidoczna</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded"
                  />
                  Wyróżniona
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-[var(--color-games)] text-white hover:bg-[var(--color-games)]/80">
                {game ? "Zapisz zmiany" : "Utwórz grę"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
