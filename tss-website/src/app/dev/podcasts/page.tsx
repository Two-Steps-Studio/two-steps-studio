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
  Mic2,
  Play,
  Clock,
  Calendar,
  Upload,
  X,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/use-translation";
import type { Podcast } from "@/types/games-records";

export default function PodcastsAdminPage() {
  const { t } = useLanguage();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState<number | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
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
    fetchPodcasts();
  }, [isAdmin]);

  const fetchPodcasts = async () => {
    try {
      const res = await fetch("/api/podcasts");
      const data = await res.json();
      setPodcasts(data.data || []);
    } catch (error) {
      console.error("Błąd pobierania podcastów:", error);
      toast.error(t.devPodcastsAdmin.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.devPodcastsAdmin.confirmDelete)) return;

    try {
      const res = await fetch(`/api/podcasts?id=${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success(t.devPodcastsAdmin.podcastDeleted);
        fetchPodcasts();
      } else {
        toast.error(data.error || t.devCrudCommon.errorDeleting);
      }
    } catch (error) {
      console.error("Błąd usuwania podcastu:", error);
      toast.error(t.devCrudCommon.errorDeletingGeneric);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const seasons = Array.from(new Set(podcasts.map((p) => p.season).filter((s): s is number => s !== undefined))).sort((a, b) => a - b);

  const filteredPodcasts = podcasts.filter((podcast) => {
    const matchesSearch =
      searchQuery === "" ||
      podcast.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.host?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeason =
      selectedSeason === "all" || podcast.season === selectedSeason;

    return matchesSearch && matchesSeason;
  });

  if (checkedAdmin && !isAdmin) {
    return (
      <Card className="max-w-md mx-auto mt-20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t.devCrudCommon.noAccess}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t.devCrudCommon.noAccessDescription}
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
            {t.devPodcastsAdmin.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.devPodcastsAdmin.subtitle}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[var(--color-records)] text-white hover:bg-[var(--color-records)]/80"
        >
          <Plus size={16} className="mr-2" />
          {t.devPodcastsAdmin.addPodcast}
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-3xl border-[var(--border-color)]">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder={t.devPodcastsAdmin.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12"
              />
            </div>

            {seasons.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter size={16} />
                  <span>{t.devPodcastsAdmin.seasonLabel}</span>
                </div>
                <Button
                  variant={selectedSeason === "all" ? "default" : "outline"}
                  onClick={() => setSelectedSeason("all")}
                  size="sm"
                >
                  {t.devCrudCommon.all}
                </Button>
                {seasons.map((season) => (
                  <Button
                    key={season}
                    variant={selectedSeason === season ? "default" : "outline"}
                    onClick={() => setSelectedSeason(season)}
                    size="sm"
                  >
                    {t.devPodcastsAdmin.seasonN.replace("{n}", String(season))}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Podcasts List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-2xl animate-pulse h-48" />
          ))}
        </div>
      ) : filteredPodcasts.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="p-12 text-center">
            <Mic2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">{t.devPodcastsAdmin.noPodcasts}</h3>
            <p className="text-muted-foreground">
              {searchQuery || selectedSeason !== "all"
                ? t.devCrudCommon.noResultsFiltered
                : t.devPodcastsAdmin.noPodcastsInDb}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPodcasts.map((podcast) => (
            <Card key={podcast.id} className="rounded-2xl border-[var(--border-color)] hover:border-[var(--color-records)]/50 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold line-clamp-1">
                    {podcast.title}
                  </CardTitle>
                  {podcast.episode_number && (
                    <Badge variant="outline" className="text-xs">
                      {t.devPodcastsAdmin.epPrefix}{podcast.episode_number}
                    </Badge>
                  )}
                </div>
                {podcast.host && (
                  <p className="text-sm text-muted-foreground">{podcast.host}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {podcast.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {podcast.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>{formatDuration(podcast.duration_seconds)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Play size={12} />
                    <span>{podcast.plays || 0}</span>
                  </div>
                </div>

                {podcast.published_date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    <span>{new Date(podcast.published_date).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingPodcast(podcast)}
                  >
                    <Edit size={14} className="mr-1" />
                    {t.devCrudCommon.edit}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(podcast.id!)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    {t.devCrudCommon.delete}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPodcast) && (
        <PodcastFormModal
          podcast={editingPodcast}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPodcast(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPodcast(null);
            fetchPodcasts();
          }}
        />
      )}
    </div>
  );
}

// Podcast Form Modal Component
function PodcastFormModal({ podcast, onClose, onSave }: { podcast: Podcast | null; onClose: () => void; onSave: () => void }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    series_id: podcast?.series_id || "",
    title: podcast?.title || "",
    description: podcast?.description || "",
    episode_number: podcast?.episode_number ? podcast.episode_number.toString() : "",
    season: podcast?.season ? podcast.season.toString() : "1",
    host: podcast?.host || "",
    guests: podcast?.guests?.join(", ") || "",
    published_date: podcast?.published_date || "",
    duration_seconds: podcast?.duration_seconds ? podcast.duration_seconds.toString() : "",
    tags: podcast?.tags?.join(", ") || "",
    visibility: podcast?.visibility || "public" as "public" | "private" | "unlisted",
    featured: podcast?.featured || false,
    thumbnail_url: podcast?.thumbnail_url || "",
    audio_file_url: podcast?.audio_file_url || "",
  });

  const [uploading, setUploading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  // For a brand-new podcast there's no DB row yet when a file is picked --
  // uploads used to go under a literal "temp" storage path that no podcast
  // row ever pointed back to. Create a minimal draft row on first upload and
  // reuse its id for every subsequent upload/save in this modal session.
  const [draftId, setDraftId] = useState<number | null>(podcast?.id ?? null);

  const handleFileUpload = async (file: File, type: 'audio' | 'thumbnail') => {
    if (!file) return;

    setUploading(true);
    try {
      let podcastId = draftId;
      if (!podcastId) {
        if (!formData.title.trim()) {
          toast.error(t.devPodcastsAdmin.errors.titleRequiredForUpload);
          setUploading(false);
          return;
        }
        const draftRes = await fetch('/api/podcasts', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formData.title.trim(), visibility: 'private' }),
        });
        const draftData = await draftRes.json();
        if (!draftRes.ok || !draftData.success) {
          toast.error(draftData.error || t.devPodcastsAdmin.errors.createDraftFailed);
          setUploading(false);
          return;
        }
        podcastId = draftData.data.id;
        setDraftId(podcastId);
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', type);
      uploadFormData.append('podcastId', String(podcastId));

      const res = await fetch('/api/upload/podcasts', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await res.json();

      if (data.success) {
        if (type === 'audio') {
          setFormData({ ...formData, audio_file_url: data.data.publicUrl });
        } else {
          setFormData({ ...formData, thumbnail_url: data.data.publicUrl });
        }
        toast.success(t.devCrudCommon.fileUploaded);
      } else {
        toast.error(data.error || t.devCrudCommon.errorUploading);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t.devCrudCommon.errorUploadingGeneric);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error(t.devPodcastsAdmin.errors.titleRequired);
      return;
    }

    const payload = {
      ...formData,
      series_id: formData.series_id ? parseInt(String(formData.series_id)) : null,
      episode_number: formData.episode_number ? parseInt(String(formData.episode_number)) : null,
      season: parseInt(String(formData.season)),
      duration_seconds: formData.duration_seconds ? parseInt(String(formData.duration_seconds)) : null,
      guests: formData.guests.split(",").map(g => g.trim()).filter(Boolean),
      tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
    };

    try {
      const url = "/api/podcasts";
      const method = draftId ? "PUT" : "POST";

      if (draftId) {
        (payload as any).id = draftId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || `${t.devCrudCommon.httpError}: ${res.status}`);
        return;
      }

      if (data.success) {
        toast.success(podcast ? t.devPodcastsAdmin.podcastUpdated : t.devPodcastsAdmin.podcastCreated);
        onSave();
      } else {
        toast.error(data.error || t.devCrudCommon.errorSaving);
      }
    } catch (error) {
      console.error("Błąd zapisu:", error);
      toast.error(t.devCrudCommon.errorSavingGeneric);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <CardHeader>
          <CardTitle>{podcast ? t.devPodcastsAdmin.editPodcast : t.devPodcastsAdmin.addNewPodcast}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.devGamesAdmin.fields.title} *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t.devCrudCommon.description}</label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">{t.devPodcastsAdmin.episodeNumberLabel}</label>
                <Input
                  type="number"
                  value={formData.episode_number}
                  onChange={(e) => setFormData({ ...formData, episode_number: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.devPodcastsAdmin.seasonFieldLabel}</label>
                <Input
                  type="number"
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.devPodcastsAdmin.seriesIdLabel}</label>
                <Input
                  type="number"
                  value={formData.series_id}
                  onChange={(e) => setFormData({ ...formData, series_id: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">{t.devPodcastsAdmin.hostFieldLabel}</label>
              <Input
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">{t.devPodcastsAdmin.guestsLabel}</label>
              <Input
                placeholder={t.devPodcastsAdmin.guestsPlaceholder}
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{t.devPodcastsAdmin.publishDateLabel}</label>
                <Input
                  type="date"
                  value={formData.published_date}
                  onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.devMusicAdmin.fields.durationSeconds}</label>
                <Input
                  type="number"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">{t.devCrudCommon.filesLabel}</label>

              {/* Thumbnail Upload */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">{t.devPodcastsAdmin.thumbnailLabel}</label>
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
                    onClick={() => thumbnailFile && handleFileUpload(thumbnailFile, 'thumbnail')}
                    disabled={!thumbnailFile || uploading}
                  >
                    <Upload size={16} className="mr-1" />
                    {uploading ? t.devCrudCommon.uploading : t.devCrudCommon.upload}
                  </Button>
                </div>
                {formData.thumbnail_url && (
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
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

              {/* Audio File Upload */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">{t.devMusicAdmin.fields.audioFile}</label>
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
                    {uploading ? t.devCrudCommon.uploading : t.devCrudCommon.upload}
                  </Button>
                </div>
                {formData.audio_file_url && (
                  <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                    <Mic2 size={16} className="text-[var(--color-records)]" />
                    <span className="text-sm text-zinc-300 truncate flex-1">{t.devCrudCommon.audioFileLoaded}</span>
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
              <label className="text-sm font-medium">{t.devCrudCommon.tagsCommaSeparated}</label>
              <Input
                placeholder={t.devPodcastsAdmin.tagsPlaceholder}
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">{t.devCrudCommon.visibility}</label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                >
                  <option value="private">{t.devCrudCommon.visibilityPrivate}</option>
                  <option value="public">{t.devCrudCommon.visibilityPublic}</option>
                  <option value="unlisted">{t.devCrudCommon.visibilityUnlisted}</option>
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
                  {t.devCrudCommon.featured}
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t.devCrudCommon.cancel}
              </Button>
              <Button type="submit" className="bg-[var(--color-records)] text-white hover:bg-[var(--color-records)]/80">
                {podcast ? t.devCrudCommon.saveChanges : t.devPodcastsAdmin.createPodcast}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
