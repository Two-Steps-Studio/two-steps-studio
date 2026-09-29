"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { AudioLines, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ANALYSIS_RATE, detectBpm, detectKey, middleSegment, type BpmResult, type KeyGuess, type KeyResult } from "./audio-analysis";
import { ErrorText, ToolCard } from "./shared";

type Stage = "idle" | "decoding" | "bpm" | "key" | "done";
// Seconds from the middle of the track used for analysis: enough for a
// stable tempo/key, short enough to stay quick on a 10-minute mix.
const SEGMENT_SECONDS = 90;

// Decode + downmix to mono + resample in one pass. OfflineAudioContext
// needs no user gesture and never plays anything.
async function decodeToAnalysisRate(file: File) {
  const data = await file.arrayBuffer();
  const decoded = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(data);
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * ANALYSIS_RATE), ANALYSIS_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  return { samples: rendered.getChannelData(0), duration: decoded.duration };
}

const CHROMA_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function AudioAnalyzerTool({ onUseBpm }: { onUseBpm: (bpm: number) => void }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const [file, setFile] = useState<{ name: string; url: string; duration: number } | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [bpm, setBpm] = useState<BpmResult | null>(null);
  const [key, setKey] = useState<KeyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (file) URL.revokeObjectURL(file.url); }, [file]);

  const analyze = async (picked: File | undefined) => {
    if (!picked) return;
    // A newer file wins: results from an older, slower run are dropped.
    const run = ++runRef.current;
    const current = () => runRef.current === run;
    setError(null);
    setBpm(null);
    setKey(null);
    setProgress(0);
    if (!picked.type.startsWith("audio/") && !/\.(mp3|wav|ogg|oga|flac|m4a|aac|opus|webm)$/i.test(picked.name)) {
      setStage("idle");
      setError(t.devTools.analyzerError);
      return;
    }
    setStage("decoding");
    try {
      const { samples, duration } = await decodeToAnalysisRate(picked);
      if (!current()) return;
      setFile({ name: picked.name, url: URL.createObjectURL(picked), duration });
      const segment = middleSegment(samples, ANALYSIS_RATE, SEGMENT_SECONDS);

      setStage("bpm");
      const bpmResult = await detectBpm(segment, ANALYSIS_RATE, (p) => current() && setProgress(p * 50));
      if (!current()) return;
      setBpm(bpmResult);

      setStage("key");
      const keyResult = await detectKey(segment, ANALYSIS_RATE, (p) => current() && setProgress(50 + p * 50));
      if (!current()) return;
      setKey(keyResult);

      setStage("done");
      if (!bpmResult && !keyResult) setError(t.devTools.analyzerTooShort);
    } catch {
      if (!current()) return;
      setStage("idle");
      setError(t.devTools.analyzerError);
    }
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    void analyze(e.dataTransfer.files[0]);
  };

  const busy = stage === "decoding" || stage === "bpm" || stage === "key";
  const keyLabel = (g: KeyGuess) => `${g.name} ${g.mode === "major" ? t.devTools.keyMajor : t.devTools.keyMinor}`;
  const rounded = bpm ? Math.round(bpm.bpm) : 0;
  const statusText = stage === "decoding" ? t.devTools.analyzerDecoding : stage === "bpm" ? "BPM…" : stage === "key" ? `${t.devTools.analyzerKey}…` : "";

  return (
    <ToolCard title={t.devTools.analyzerTitle} description={t.devTools.analyzerDesc} className="lg:col-span-2">
      <input ref={inputRef} type="file" accept="audio/*" className="sr-only" tabIndex={-1} onChange={(e) => void analyze(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-color)] p-6 text-sm text-[var(--text-muted)] transition-colors disabled:opacity-60",
          dragging && "border-[var(--color-dev)] bg-[var(--color-dev)]/10"
        )}
      >
        <AudioLines className="size-8" />
        <span>{file ? `${file.name} · ${Math.floor(file.duration / 60)}:${String(Math.round(file.duration % 60)).padStart(2, "0")}` : t.devTools.analyzerDrop}</span>
      </button>

      {busy && (
        <div className="space-y-1" aria-live="polite">
          <p className="text-sm text-[var(--text-muted)]">{statusText}</p>
          <Progress value={stage === "decoding" ? 0 : progress} className="h-1.5" />
        </div>
      )}
      {error && <ErrorText>{error}</ErrorText>}

      {(bpm || key) && (
        <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--text-muted)]">BPM</p>
            {bpm ? (
              <>
                <p className="font-mono text-4xl font-bold tabular-nums text-[var(--text)]">{rounded}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {bpm.bpm.toFixed(1)} · {t.devTools.analyzerAlt}: {Math.round(bpm.bpm / 2)} / {Math.round(bpm.bpm * 2)}
                </p>
                <Button type="button" variant="outline" size="sm" className="mt-3 rounded-xl border-[var(--border-color)]" onClick={() => onUseBpm(rounded)}>
                  <Timer /> {t.devTools.analyzerUseBpm}
                </Button>
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">—</p>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--text-muted)]">{t.devTools.analyzerKey}</p>
            {key ? (
              <>
                <p className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-[var(--text)]">{keyLabel(key.best)}</span>
                  <span className="rounded-md bg-[var(--color-dev)]/15 px-1.5 py-0.5 font-mono text-sm font-bold text-[var(--text)]">{key.best.camelot}</span>
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {t.devTools.analyzerAlt}: {keyLabel(key.alternative)} ({key.alternative.camelot})
                </p>
                <div className="mt-3 space-y-1">
                  <p className="text-xs text-[var(--text-muted)]">{t.devTools.analyzerConfidence}: {Math.round(key.confidence * 100)}%</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[var(--text)]/10">
                    <div className="h-full rounded-full bg-[var(--color-dev)]" style={{ width: `${Math.round(key.confidence * 100)}%` }} />
                  </div>
                </div>
                {/* Pitch-class energy - lets a musician sanity-check the guess. */}
                <div className="mt-3 flex h-12 items-end gap-0.5" aria-hidden>
                  {key.chroma.map((v, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                      <div
                        className={cn("w-full rounded-sm", i === key.best.tonic ? "bg-[var(--color-dev)]" : "bg-[var(--text)]/25")}
                        style={{ height: `${Math.max(4, (v / Math.max(...key.chroma)) * 36)}px` }}
                      />
                      <span className="text-[0.5rem] leading-none text-[var(--text-muted)]">{CHROMA_NAMES[i]}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">—</p>
            )}
          </div>
        </div>
      )}

      {file && <audio controls src={file.url} className="w-full" />}
      <p className="text-xs text-[var(--text-muted)]">{t.devTools.analyzerNote}</p>
    </ToolCard>
  );
}
