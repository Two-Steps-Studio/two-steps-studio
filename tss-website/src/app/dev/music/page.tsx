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
  Music,
  Play,
  Clock,
  Upload,
  X,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import type { MusicTrack, MusicGenre } from "@/types/games-records";

const GENRES: MusicGenre[] = ['pop', 'rock', 'hip_hop', 'electronic', 'classical', 'jazz', 'blues', 'country', 'reggae', 'metal', 'indie', 'other'];

const GENRE_LABELS: Record<MusicGenre, string> = {
  pop: 'Pop',
  rock: 'Rock',
  hip_hop: 'Hip-Hop',
  electronic: 'Electronic',
  classical: 'Classical',
  jazz: 'Jazz',
  blues: 'Blues',
  country: 'Country',
  reggae: 'Reggae',
  metal: 'Metal',
  indie: 'Indie',
  other: 'Inne',
};

export default function MusicAdminPage() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<MusicGenre | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdmin, setCheckedAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/auth");
        const data = await res.json();
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
    fetchTracks();
  }, [isAdmin]);

  const fetchTracks = async () => {
    try {
      const res = await fetch("/api/music");
      const data = await res.json();
      setTracks(data.data || []);
    } catch (error) {
      console.error("Błąd pobierania utworów:", error);
      toast.error("Nie udało się załadować utworów");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Czy na pewno chcesz usunąć ten utwór?")) return;

    try {
      const res = await fetch(`/api/music?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Utwór został usunięty");
        fetchTracks();
      } else {
        toast.error(data.error || "Błąd podczas usuwania");
      }
    } catch (error) {
      console.error("Błąd usuwania utworu:", error);
      toast.error("Wystąpił błąd podczas usuwania");
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredTracks = tracks.filter((track) => {
    const matchesSearch =
      searchQuery === "" ||
      track.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      track.album?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre =
      selectedGenre === "all" || track.genre === selectedGenre;

    return matchesSearch && matchesGenre;
  });

  if (checkedAdmin && !isAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Brak dostępu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Nie masz uprawnień administratora. Skontaktuj się z administracją.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white font-[family-name:var(--font-space)]">
            Zarządzanie Muzyką
          </h1>
          <p className="text-muted-foreground mt-1">
            Dodawaj, edytuj i usuwaj utwory muzyczne
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[var(--color-records)] text-white hover:bg-[var(--color-records)]/80"
        >
          <Plus size={16} className="mr-2" />
          Dodaj utwór
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-3xl border-[var(--border-color)]">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Szukaj utworów, artystów, albumów..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter size={16} />
                <span>Gatunek:</span>
              </div>
              <Button
                variant={selectedGenre === "all" ? "default" : "outline"}
                onClick={() => setSelectedGenre("all")}
                size="sm"
              >
                Wszystkie
              </Button>
              {GENRES.map((genre) => (
                <Button
                  key={genre}
                  variant={selectedGenre === genre ? "default" : "outline"}
                  onClick={() => setSelectedGenre(genre)}
                  size="sm"
                >
                  {GENRE_LABELS[genre]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracks List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-2xl animate-pulse h-48" />
          ))}
        </div>
      ) : filteredTracks.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="p-12 text-center">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Brak utworów</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedGenre !== "all"
                ? "Nie znaleziono utworów pasujących do filtrów."
                : "Brak utworów w bazie danych. Dodaj pierwszy utwór!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTracks.map((track) => (
            <Card key={track.id} className="rounded-2xl border-[var(--border-color)] hover:border-[var(--color-records)]/50 transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold line-clamp-1">
                  {track.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{track.artist}</p>
                {track.album && (
                  <p className="text-xs text-muted-foreground">{track.album}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {track.genre && (
                  <Badge variant="outline" className="text-xs">
                    {GENRE_LABELS[track.genre]}
                  </Badge>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatDuration(track.duration_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Play size={12} />
                    <span>{track.plays || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingTrack(track)}
                  >
                    <Edit size={14} className="mr-1" />
                    Edytuj
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(track.id!)}
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
      {(showCreateModal || editingTrack) && (
        <MusicFormModal
          track={editingTrack}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTrack(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingTrack(null);
            fetchTracks();
          }}
        />
      )}
    </div>
  );
}

// Music Form Modal Component
function MusicFormModal({ track, onClose, onSave }: { track: MusicTrack | null; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    title: track?.title || "",
    artist: track?.artist || "",
    album: track?.album || "",
    genre: track?.genre || "indie" as MusicGenre,
    release_date: track?.release_date || "",
    duration_seconds: track?.duration_seconds ? track.duration_seconds.toString() : "",
    description: track?.description || "",
    lyrics: track?.lyrics || "",
    spotify_url: track?.spotify_url || "",
    youtube_url: track?.youtube_url || "",
    soundcloud_url: track?.soundcloud_url || "",
    tags: track?.tags?.join(", ") || "",
    visibility: track?.visibility || "public" as "public" | "private" | "unlisted",
    featured: track?.featured || false,
    cover_image_url: track?.cover_image_url || "",
    audio_file_url: track?.audio_file_url || "",
  });

  const [uploading, setUploading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  // For a brand-new track there's no DB row yet when a file is picked --
  // uploads used to go under a literal "temp" storage path that no track
  // row ever pointed back to. Create a minimal draft row on first upload and
  // reuse its id for every subsequent upload/save in this modal session.
  const [draftId, setDraftId] = useState<number | null>(track?.id ?? null);

  const handleFileUpload = async (file: File, type: 'audio' | 'cover') => {
    if (!file) return;

    setUploading(true);
    try {
      let musicId = draftId;
      if (!musicId) {
        if (!formData.title.trim() || !formData.artist.trim()) {
          toast.error("Podaj tytuł i wykonawcę przed przesłaniem pliku");
          setUploading(false);
          return;
        }
        const draftRes = await fetch('/api/music', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formData.title.trim(), artist: formData.artist.trim(), visibility: 'private' }),
        });
        const draftData = await draftRes.json();
        if (!draftRes.ok || !draftData.success) {
          toast.error(draftData.error || 'Nie udało się utworzyć wpisu utworu');
          setUploading(false);
          return;
        }
        musicId = draftData.data.id;
        setDraftId(musicId);
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', type);
      uploadFormData.append('musicId', String(musicId));

      const res = await fetch('/api/upload/music', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();

      if (data.success) {
        if (type === 'audio') {
          setFormData({ ...formData, audio_file_url: data.data.publicUrl });
        } else {
          setFormData({ ...formData, cover_image_url: data.data.publicUrl });
        }
        toast.success('Plik został przesłany');
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
    if (!formData.artist.trim()) {
      toast.error("Wykonawca jest wymagany");
      return;
    }

    const payload: any = {
      ...formData,
      duration_seconds: formData.duration_seconds ? parseInt(formData.duration_seconds) : null,
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    try {
      const url = "/api/music";
      const method = draftId ? "PUT" : "POST";

      if (draftId) {
        payload.id = draftId;
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
        toast.success(track ? "Utwór zaktualizowany" : "Utwór utworzony");
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
          <CardTitle>{track ? "Edytuj utwór" : "Dodaj nowy utwór"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tytuł *</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Wykonawca *</label>
                <Input
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Album</label>
                <Input
                  value={formData.album}
                  onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gatunek</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value as MusicGenre })}
                >
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre}>
                      {GENRE_LABELS[genre]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data wydania</label>
                <Input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Czas trwania (sekundy)</label>
                <Input
                  type="number"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Pliki</label>
              
              {/* Cover Image Upload */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Okładka</label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setCoverFile(file);
                    }}
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => coverFile && handleFileUpload(coverFile, 'cover')}
                    disabled={!coverFile || uploading}
                  >
                    <Upload size={16} className="mr-1" />
                    {uploading ? 'Przesyłanie...' : 'Prześlij'}
                  </Button>
                </div>
                {formData.cover_image_url && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                    <img src={formData.cover_image_url} alt="Cover" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => setFormData({ ...formData, cover_image_url: '' })}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Audio File Upload */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Plik audio</label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setAudioFile(file);
                    }}
                    className="flex-1"
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => audioFile && handleFileUpload(audioFile, 'audio')}
                    disabled={!audioFile || uploading}
                  >
                    <Upload size={16} className="mr-1" />
                    {uploading ? 'Przesyłanie...' : 'Prześlij'}
                  </Button>
                </div>
                {formData.audio_file_url && (
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <Music size={16} className="text-[var(--color-records)]" />
                    <span className="text-sm text-zinc-300 truncate flex-1">Plik audio załadowany</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, audio_file_url: '' })}
                    >
                      <X size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Opis</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tekst utworu</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-input bg-background"
                value={formData.lyrics}
                onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Linki zewnętrzne</label>
              <Input
                placeholder="Spotify URL"
                value={formData.spotify_url}
                onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })}
              />
              <Input
                placeholder="YouTube URL"
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              />
              <Input
                placeholder="SoundCloud URL"
                value={formData.soundcloud_url}
                onChange={(e) => setFormData({ ...formData, soundcloud_url: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Tagi (przecinkami)</label>
              <Input
                placeholder="np. chill, lo-fi, instrumental"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
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
              <div className="col-span-2 flex items-end">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded"
                  />
                  Wyróżniony
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" className="bg-[var(--color-records)] text-white hover:bg-[var(--color-records)]/80">
                {track ? "Zapisz zmiany" : "Utwórz utwór"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
