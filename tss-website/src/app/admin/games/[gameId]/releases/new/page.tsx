"use client";

import { useState, use } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { buildAndUploadManifest } from "@/lib/admin/build-manifest-from-zip";

type Stage =
  | "form"
  | "creating-draft"
  | "reading-zip"
  | "uploading-files"
  | "uploading-manifest"
  | "finalizing"
  | "done"
  | "error";

export default function NewGameReleasePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);

  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState("windows");
  const [executablePath, setExecutablePath] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [setAsCurrent, setSetAsCurrent] = useState(true);

  const [stage, setStage] = useState<Stage>("form");
  const [progressLabel, setProgressLabel] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const busy = stage !== "form" && stage !== "done" && stage !== "error";

  const handlePublish = async () => {
    if (!version.trim() || !executablePath.trim() || !zipFile) {
      setErrorMessage("Wersja, ścieżka pliku wykonywalnego i archiwum ZIP są wymagane");
      setStage("error");
      return;
    }
    if (!supabase) {
      setErrorMessage("Klient Supabase nie jest skonfigurowany");
      setStage("error");
      return;
    }

    try {
      // 1. Create the draft release row — stable id from here on, so a
      // closed tab mid-upload can be resumed by re-running this form with
      // the same version (POST is unique-constrained on game_id+platform+version).
      setStage("creating-draft");
      const draftRes = await fetch(`/api/admin/games/${gameId}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: version.trim(),
          platform,
          executable_path: executablePath.trim(),
          release_notes: releaseNotes.trim() || undefined,
        }),
      });
      const draftData = await draftRes.json();
      if (!draftRes.ok) throw new Error(draftData.error || "Nie udało się utworzyć wydania");
      const releaseId: string = draftData.data.id;

      // 2+3. Parse the zip and upload each entry — one sequential pass, each
      // file decompressed exactly once, uploaded directly to Storage via a
      // signed URL (never through the Next.js server, so payload size never
      // hits a limit).
      setStage("reading-zip");
      const { files } = await buildAndUploadManifest(
        zipFile,
        async (entry, blob) => {
          const urlRes = await fetch(`/api/admin/games/releases/${releaseId}/upload-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ relativePath: entry.path, size: entry.size }),
          });
          const urlData = await urlRes.json();
          if (!urlRes.ok) throw new Error(`${entry.path}: ${urlData.error || "nie udało się uzyskać adresu przesyłania"}`);

          const { error: uploadError } = await supabase!.storage
            .from("game-builds")
            .uploadToSignedUrl(urlData.data.path, urlData.data.token, blob);
          if (uploadError) throw new Error(`${entry.path}: ${uploadError.message}`);
        },
        (p) => {
          setStage("uploading-files");
          setProgressLabel(`${p.phase === "hashing" ? "Haszowanie" : "Przesyłanie"}: ${p.currentFile}`);
          setProgressPct(Math.round((p.fileIndex / p.fileCount) * 100));
        }
      );

      // 4. Upload manifest.json itself.
      setStage("uploading-manifest");
      setProgressPct(100);
      const manifestUrlRes = await fetch(`/api/admin/games/releases/${releaseId}/manifest-upload-url`, {
        method: "POST",
      });
      const manifestUrlData = await manifestUrlRes.json();
      if (!manifestUrlRes.ok) throw new Error(manifestUrlData.error || "Nie udało się uzyskać adresu manifestu");

      const manifestBlob = new Blob([JSON.stringify({ version: version.trim(), files })], { type: "application/json" });
      const { error: manifestUploadError } = await supabase.storage
        .from("game-builds")
        .uploadToSignedUrl(manifestUrlData.data.path, manifestUrlData.data.token, manifestBlob);
      if (manifestUploadError) throw new Error(`manifest.json: ${manifestUploadError.message}`);

      // 5. Finalize — server re-verifies everything against Storage itself.
      setStage("finalizing");
      const finalizeRes = await fetch(`/api/admin/games/releases/${releaseId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setAsCurrent }),
      });
      const finalizeData = await finalizeRes.json();
      if (!finalizeRes.ok) {
        const missing = finalizeData.missingFiles?.length
          ? ` Brakujące pliki: ${finalizeData.missingFiles.slice(0, 5).join(", ")}${finalizeData.missingFiles.length > 5 ? "…" : ""}`
          : "";
        throw new Error(`${finalizeData.error || "Nie udało się opublikować wydania"}.${missing}`);
      }

      setStage("done");
    } catch (error: any) {
      console.error("Publish failed:", error);
      setErrorMessage(error.message || "Nieznany błąd");
      setStage("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/admin/games/${gameId}/releases`}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Historia wydań
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-white">Nowe wydanie</CardTitle>
            <CardDescription>Wybierz jeden plik .zip z buildem gry — pliki zostaną przesłane bezpośrednio do Storage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stage === "done" ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-white font-medium">Wydanie zostało opublikowane</p>
                <Link href={`/admin/games/${gameId}/releases`}>
                  <Button className="mt-4">Wróć do historii wydań</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Wersja</label>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.0" disabled={busy} />
                </div>

                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Platforma</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    disabled={busy}
                    className="w-full bg-white/10 border border-white/20 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="windows">Windows</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Ścieżka pliku wykonywalnego (względna, np. bin/Game.exe)</label>
                  <Input value={executablePath} onChange={(e) => setExecutablePath(e.target.value)} placeholder="Game.exe" disabled={busy} />
                </div>

                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Notatki wydania</label>
                  <Textarea value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} disabled={busy} />
                </div>

                <div className="space-y-2">
                  <label className="text-white/70 text-sm">Build (.zip)</label>
                  <Input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                    disabled={busy}
                  />
                </div>

                <label className="flex items-center gap-2 text-white/70 text-sm">
                  <input type="checkbox" checked={setAsCurrent} onChange={(e) => setSetAsCurrent(e.target.checked)} disabled={busy} />
                  Ustaw jako aktualną wersję po publikacji
                </label>

                {busy && (
                  <div className="space-y-2 pt-2">
                    <div className="text-white/70 text-sm truncate">{progressLabel}</div>
                    <Progress value={progressPct} />
                  </div>
                )}

                {stage === "error" && (
                  <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/40 border border-red-500/30 rounded p-3">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button onClick={handlePublish} disabled={busy} className="w-full gap-2">
                  <Upload className="w-4 h-4" />
                  {busy ? "Publikowanie…" : "Publikuj"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
