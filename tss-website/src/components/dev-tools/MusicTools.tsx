"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { createAudioContext, midiToFreq, playTone } from "./audio";
import { CopyButton, Segmented, ToolCard, monoField, nativeSelect } from "./shared";
import { AudioAnalyzerTool } from "./AudioAnalyzerTool";
import { TunerTool } from "./TunerTool";
import { BarsTool, NoteFrequencyTool } from "./MusicMathTools";
import { ToolGroups } from "./ToolGroups";

const actionButton = "rounded-xl border-[var(--border-color)]";
const MIN_BPM = 20;
const MAX_BPM = 300;
const clampBpm = (n: number) => Math.min(MAX_BPM, Math.max(MIN_BPM, n));

/* ---------------------------------- Tap tempo ---------------------------------- */

function TapTempoTool({ bpm, setBpm }: { bpm: number; setBpm: (n: number) => void }) {
  const { t } = useLanguage();
  const taps = useRef<number[]>([]);
  const [count, setCount] = useState(0);

  // Registered on press, not release: a click fires on pointer-up, which
  // would add the user's own button-hold time to every interval.
  const tap = () => {
    const now = performance.now();
    const last = taps.current[taps.current.length - 1];
    if (last !== undefined && now - last > 2000) taps.current = [];
    taps.current = [...taps.current, now].slice(-9);
    setCount(taps.current.length);
    if (taps.current.length >= 2) {
      const intervals = taps.current.slice(1).map((time, i) => time - taps.current[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(clampBpm(Math.round((60000 / avg) * 10) / 10));
    }
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) tap();
    }
  };

  return (
    <ToolCard title={t.devTools.tapTitle} description={t.devTools.tapDesc}>
      <button
        type="button"
        onPointerDown={tap}
        onKeyDown={onKey}
        className="flex h-36 w-full touch-manipulation flex-col items-center justify-center rounded-2xl border-2 border-[var(--color-dev)]/40 bg-[var(--color-dev)]/10 transition-transform select-none active:scale-[0.98]"
      >
        <span className="font-mono text-5xl font-bold tabular-nums text-[var(--text)]">{bpm}</span>
        <span className="text-sm text-[var(--text-muted)]">
          BPM · {count < 2 ? t.devTools.tapHint : `${count} ${t.devTools.tapTaps}`}
        </span>
      </button>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="dt-bpm">BPM</Label>
          <Input id="dt-bpm" type="number" min={MIN_BPM} max={MAX_BPM} value={bpm} onChange={(e) => setBpm(clampBpm(Number(e.target.value) || MIN_BPM))} className={monoField} />
        </div>
        {[0.5, 2].map((factor) => (
          <Button key={factor} type="button" variant="outline" className={actionButton} onClick={() => setBpm(clampBpm(Math.round(bpm * factor * 10) / 10))}>
            {factor === 0.5 ? "½×" : "2×"}
          </Button>
        ))}
      </div>
    </ToolCard>
  );
}

/* --------------------------------- Delay times --------------------------------- */

const NOTE_VALUES: [string, number][] = [["1/1", 4], ["1/2", 2], ["1/4", 1], ["1/8", 0.5], ["1/16", 0.25], ["1/32", 0.125]];

function DelayTool({ bpm }: { bpm: number }) {
  const { t } = useLanguage();
  const beatMs = 60000 / bpm;
  const cell = (ms: number) => (
    <td className="px-2 py-1.5 text-right">
      <span className="font-mono tabular-nums text-[var(--text)]">{ms.toFixed(1)}</span>
      <span className="block text-[0.625rem] text-[var(--text-muted)]">{(1000 / ms).toFixed(2)} Hz</span>
    </td>
  );
  return (
    <ToolCard title={t.devTools.delayTitle} description={`${t.devTools.delayDesc} (${bpm} BPM)`}>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-muted)]">
              <th className="px-2 py-2 text-left font-medium">{t.devTools.delayNote}</th>
              <th className="px-2 py-2 text-right font-medium">{t.devTools.delayStraight}</th>
              <th className="px-2 py-2 text-right font-medium">{t.devTools.delayDotted}</th>
              <th className="px-2 py-2 text-right font-medium">{t.devTools.delayTriplet}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {NOTE_VALUES.map(([label, beats]) => (
              <tr key={label}>
                <td className="px-2 py-1.5 font-mono font-bold text-[var(--text)]">{label}</td>
                {cell(beatMs * beats)}
                {cell(beatMs * beats * 1.5)}
                {cell((beatMs * beats * 2) / 3)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--text-muted)]">ms · Hz = 1000 / ms</p>
    </ToolCard>
  );
}

/* ---------------------------------- Metronome ---------------------------------- */

const BEATS = ["2", "3", "4", "5", "6", "7"] as const;
type Beats = (typeof BEATS)[number];

function MetronomeTool({ bpm, setBpm }: { bpm: number; setBpm: (n: number) => void }) {
  const { t } = useLanguage();
  const [running, setRunning] = useState(false);
  const [beats, setBeats] = useState<Beats>("4");
  const [current, setCurrent] = useState(-1);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => () => void ctxRef.current?.close(), []);

  // Web Audio lookahead scheduling: a coarse JS timer queues clicks slightly
  // ahead on the audio clock, so timing stays sample-accurate even when the
  // main thread is busy (setInterval alone drifts audibly).
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!running || !ctx) return;
    const perBar = Number(beats);
    const secondsPerBeat = 60 / bpm;
    let next = ctx.currentTime + 0.05;
    let beat = 0;
    const visual: number[] = [];
    const schedule = () => {
      while (next < ctx.currentTime + 0.12) {
        playTone(ctx, beat === 0 ? 1600 : 1000, next, 0.05, beat === 0 ? 0.35 : 0.22, "square");
        const shown = beat;
        visual.push(window.setTimeout(() => setCurrent(shown), Math.max(0, (next - ctx.currentTime) * 1000)));
        next += secondsPerBeat;
        beat = (beat + 1) % perBar;
      }
      if (visual.length > 32) visual.splice(0, visual.length - 32);
    };
    schedule();
    const id = window.setInterval(schedule, 25);
    return () => {
      window.clearInterval(id);
      visual.forEach((v) => window.clearTimeout(v));
    };
  }, [running, bpm, beats]);

  const toggle = () => {
    if (running) {
      setRunning(false);
      setCurrent(-1);
      return;
    }
    // Created/resumed inside the click so the browser's autoplay policy
    // counts it as user-initiated audio.
    ctxRef.current ??= createAudioContext();
    void ctxRef.current.resume();
    setRunning(true);
  };

  return (
    <ToolCard title={t.devTools.metronomeTitle} description={t.devTools.metronomeDesc}>
      <div className="flex justify-center gap-2" aria-hidden>
        {Array.from({ length: Number(beats) }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-5 rounded-full border-2 transition-colors duration-75",
              i === 0 ? "border-[var(--color-dev)]" : "border-[var(--border-color)]",
              current === i && (i === 0 ? "bg-[var(--color-dev)]" : "bg-[var(--text)]")
            )}
          />
        ))}
      </div>
      <div className="space-y-2">
        <Label>{bpm} BPM</Label>
        <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={MIN_BPM} max={MAX_BPM} step={1} aria-label="BPM" />
      </div>
      <div className="space-y-2">
        <Label>{t.devTools.metronomeBeats}</Label>
        <Segmented options={BEATS.map((b) => ({ value: b, label: `${b}/4` }))} value={beats} onChange={setBeats} label={t.devTools.metronomeBeats} />
      </div>
      <Button type="button" variant="outline" className={cn(actionButton, "w-full")} onClick={toggle}>
        {running ? <Pause /> : <Play />} {running ? t.devTools.timerPause : t.devTools.timerStart}
      </Button>
    </ToolCard>
  );
}

/* ------------------------------- Scales & chords ------------------------------- */

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const ROOT_LABELS = ["C", "C#/Db", "D", "D#/Eb", "E", "F", "F#/Gb", "G", "G#/Ab", "A", "A#/Bb", "B"];

const SCALES = {
  major: { steps: [0, 2, 4, 5, 7, 9, 11], minorish: false },
  naturalMinor: { steps: [0, 2, 3, 5, 7, 8, 10], minorish: true },
  harmonicMinor: { steps: [0, 2, 3, 5, 7, 8, 11], minorish: true },
  melodicMinor: { steps: [0, 2, 3, 5, 7, 9, 11], minorish: true },
  dorian: { steps: [0, 2, 3, 5, 7, 9, 10], minorish: true },
  phrygian: { steps: [0, 1, 3, 5, 7, 8, 10], minorish: true },
  lydian: { steps: [0, 2, 4, 6, 7, 9, 11], minorish: false },
  mixolydian: { steps: [0, 2, 4, 5, 7, 9, 10], minorish: false },
  locrian: { steps: [0, 1, 3, 5, 6, 8, 10], minorish: true },
  majorPentatonic: { steps: [0, 2, 4, 7, 9], minorish: false },
  minorPentatonic: { steps: [0, 3, 5, 7, 10], minorish: true },
  blues: { steps: [0, 3, 5, 6, 7, 10], minorish: true },
} as const;
type ScaleId = keyof typeof SCALES;

// Flat-side keys get flat names (F major -> Bb, not A#). Simplified: one
// accidental family per key rather than strict letter-per-degree spelling.
const FLAT_MAJOR_ROOTS = new Set([1, 3, 5, 8, 10]);
const FLAT_MINOR_ROOTS = new Set([0, 2, 3, 5, 7, 10]);

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

function ScaleTool() {
  const { t } = useLanguage();
  const [root, setRoot] = useState(0);
  const [scale, setScale] = useState<ScaleId>("major");
  const ctxRef = useRef<AudioContext | null>(null);
  useEffect(() => () => void ctxRef.current?.close(), []);

  const { steps, minorish } = SCALES[scale];
  const names = (minorish ? FLAT_MINOR_ROOTS : FLAT_MAJOR_ROOTS).has(root) ? FLATS : SHARPS;
  const notes = steps.map((s) => names[(root + s) % 12]);

  // Diatonic triads for 7-note scales: stack every other scale degree.
  const chords =
    steps.length === 7
      ? steps.map((_, i) => {
          const third = (steps[(i + 2) % 7] - steps[i] + 12) % 12;
          const fifth = (steps[(i + 4) % 7] - steps[i] + 12) % 12;
          const quality = third === 4 && fifth === 7 ? "" : third === 3 && fifth === 7 ? "m" : third === 3 && fifth === 6 ? "dim" : "aug";
          const numeral = quality === "" || quality === "aug" ? ROMAN[i] : ROMAN[i].toLowerCase();
          return { name: notes[i] + quality, roman: numeral + (quality === "dim" ? "°" : quality === "aug" ? "+" : "") };
        })
      : [];

  const relative =
    scale === "major" ? `${names[(root + 9) % 12]}m` : scale === "naturalMinor" ? names[(root + 3) % 12] : null;

  const play = () => {
    ctxRef.current ??= createAudioContext();
    const ctx = ctxRef.current;
    void ctx.resume();
    const start = ctx.currentTime + 0.05;
    [...steps, 12].forEach((s, i) => playTone(ctx, midiToFreq(60 + root + s), start + i * 0.28, 0.35, 0.18, "triangle"));
  };

  const scaleLabels: Record<ScaleId, string> = {
    major: t.devTools.scaleMajor,
    naturalMinor: t.devTools.scaleMinor,
    harmonicMinor: t.devTools.scaleHarmonic,
    melodicMinor: t.devTools.scaleMelodic,
    dorian: "Dorian",
    phrygian: "Phrygian",
    lydian: "Lydian",
    mixolydian: "Mixolydian",
    locrian: "Locrian",
    majorPentatonic: t.devTools.scaleMajorPenta,
    minorPentatonic: t.devTools.scaleMinorPenta,
    blues: "Blues",
  };

  return (
    <ToolCard title={t.devTools.scaleTitle} description={t.devTools.scaleDesc}>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-scale-root">{t.devTools.scaleRoot}</Label>
          <select id="dt-scale-root" className={nativeSelect} value={root} onChange={(e) => setRoot(Number(e.target.value))}>
            {ROOT_LABELS.map((label, i) => <option key={label} value={i}>{label}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-scale-type">{t.devTools.scaleType}</Label>
          <select id="dt-scale-type" className={nativeSelect} value={scale} onChange={(e) => setScale(e.target.value as ScaleId)}>
            {(Object.keys(SCALES) as ScaleId[]).map((id) => <option key={id} value={id}>{scaleLabels[id]}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {notes.map((n, i) => (
          <span key={i} className={cn("grid h-10 min-w-10 place-items-center rounded-xl border px-2 font-mono font-bold text-[var(--text)]", i === 0 ? "border-[var(--color-dev)] bg-[var(--color-dev)]/15" : "border-[var(--border-color)]")}>
            {n}
          </span>
        ))}
        <Button type="button" variant="outline" size="sm" className={cn(actionButton, "ml-auto")} onClick={play}>
          <Volume2 /> {t.devTools.scalePlay}
        </Button>
      </div>
      {chords.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-muted)]">{t.devTools.scaleChords}</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {chords.map((c) => (
              <div key={c.roman} className="rounded-xl bg-[var(--surface)] px-2 py-1.5 text-center">
                <p className="text-[0.625rem] text-[var(--text-muted)]">{c.roman}</p>
                <p className="font-mono text-sm font-bold text-[var(--text)]">{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-muted)]">{relative && `${t.devTools.scaleRelative}: ${relative}`}</p>
        <CopyButton value={notes.join(" ")} />
      </div>
    </ToolCard>
  );
}

export function MusicTools() {
  // Shared across the analyzer, tap tempo, delay table and metronome, so a
  // detected or tapped tempo immediately drives the others.
  const [bpm, setBpm] = useState(120);
  const { t } = useLanguage();
  return (
    <ToolGroups
      tab="music"
      groups={[
        { id: "analysis", title: t.devTools.catMusicAnalysis, content: <AudioAnalyzerTool onUseBpm={(n) => setBpm(clampBpm(n))} /> },
        {
          id: "rhythm",
          title: t.devTools.catMusicRhythm,
          content: (
            <>
              <TapTempoTool bpm={bpm} setBpm={setBpm} />
              <MetronomeTool bpm={bpm} setBpm={setBpm} />
              <DelayTool bpm={bpm} />
              <BarsTool bpm={bpm} />
            </>
          ),
        },
        { id: "pitch", title: t.devTools.catMusicPitch, content: <><TunerTool /><ScaleTool /><NoteFrequencyTool /></> },
      ]}
    />
  );
}
