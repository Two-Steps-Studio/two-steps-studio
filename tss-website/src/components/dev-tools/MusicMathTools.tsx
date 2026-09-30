"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-translation";
import { createAudioContext, midiToFreq, playTone } from "./audio";
import { SPEED_OF_SOUND, barsToSeconds, formatDuration, noteToMidi, parseDuration, secondsToBars } from "./music-math";
import { toReading } from "./pitch";
import { ErrorText, Segmented, ToolCard, monoField } from "./shared";

const METERS = [2, 3, 4, 5, 6, 7] as const;

// Loop/section lengths for producers and video editors: how long N bars
// last at the shared tempo, and how many bars fit a given duration.
export function BarsTool({ bpm }: { bpm: number }) {
  const { t, locale } = useLanguage();
  const [beats, setBeats] = useState<(typeof METERS)[number]>(4);
  const [durationText, setDurationText] = useState("0:30");
  const seconds = parseDuration(durationText);
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return (
    <ToolCard title={t.devTools.barsTitle} description={`${t.devTools.barsDesc} (${bpm} BPM)`}>
      <div className="space-y-2">
        <Label>{t.devTools.barsMeter}</Label>
        <Segmented options={METERS.map((m) => ({ value: String(m) as `${typeof m}`, label: `${m}/4` }))} value={String(beats) as `${typeof beats}`} onChange={(v) => setBeats(Number(v) as (typeof METERS)[number])} label={t.devTools.barsMeter} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)]">
            <th className="py-1 font-normal">{t.devTools.barsBars}</th>
            <th className="py-1 text-right font-normal">{t.devTools.barsTime}</th>
          </tr>
        </thead>
        <tbody>
          {[1, 4, 8, 16, 32, 64].map((bars) => (
            <tr key={bars} className="border-t border-[var(--border-color)]">
              <td className="py-1.5 font-mono text-[var(--text)]">{bars}</td>
              <td className="py-1.5 text-right font-mono tabular-nums text-[var(--text)]">{formatDuration(barsToSeconds(bars, bpm, beats))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-2">
        <Label htmlFor="dt-bars-duration">{t.devTools.barsFit}</Label>
        <Input id="dt-bars-duration" value={durationText} onChange={(e) => setDurationText(e.target.value)} placeholder="1:30" className={monoField} aria-invalid={seconds === null} />
      </div>
      {seconds === null ? (
        <ErrorText>{t.devTools.invalid}</ErrorText>
      ) : (
        <p className="text-sm text-[var(--text)]">
          = <b className="font-mono tabular-nums">{nf.format(secondsToBars(seconds, bpm, beats))}</b> {t.devTools.barsBarsLower} ·{" "}
          <b className="font-mono tabular-nums">{nf.format((seconds * bpm) / 60)}</b> {t.devTools.barsBeats}
        </p>
      )}
    </ToolCard>
  );
}

// Note name <-> frequency, with the numbers a mixing/acoustics question
// needs: MIDI number, period and wavelength in air.
export function NoteFrequencyTool() {
  const { t, locale } = useLanguage();
  const [input, setInput] = useState("A4");
  const [a4, setA4] = useState(440);
  const ctxRef = useRef<AudioContext | null>(null);
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  useEffect(() => () => void ctxRef.current?.close(), []);

  const trimmed = input.trim().replace(",", ".");
  const asNumber = /^\d+(?:\.\d+)?\s*(?:hz)?$/i.test(trimmed) ? parseFloat(trimmed) : null;
  const midi = asNumber === null ? noteToMidi(trimmed) : null;
  const freq = asNumber ?? (midi !== null ? midiToFreq(midi, a4) : null);
  const valid = freq !== null && freq >= 8 && freq <= 20000;
  const reading = valid ? toReading(freq, a4) : null;
  const nearestMidi = reading ? (reading.octave + 1) * 12 + ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].indexOf(reading.note) : null;

  const play = () => {
    if (!valid) return;
    ctxRef.current ??= createAudioContext();
    const ctx = ctxRef.current;
    void ctx.resume();
    playTone(ctx, freq, ctx.currentTime + 0.02, 1.2, 0.2);
  };

  return (
    <ToolCard title={t.devTools.noteTitle} description={t.devTools.noteDesc}>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="dt-note-input">{t.devTools.noteInput}</Label>
          <Input id="dt-note-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="A4, C#3, 261.63" className={monoField} aria-invalid={!valid} />
        </div>
        <div className="w-24 space-y-2">
          <Label htmlFor="dt-note-a4">A4 (Hz)</Label>
          <Input id="dt-note-a4" type="number" min={400} max={480} value={a4} onChange={(e) => setA4(Math.min(480, Math.max(400, Number(e.target.value) || 440)))} className={monoField} />
        </div>
        <Button type="button" variant="outline" size="icon" className="shrink-0 rounded-xl border-[var(--border-color)]" onClick={play} disabled={!valid} aria-label={t.devTools.notePlay}>
          <Volume2 />
        </Button>
      </div>
      {!valid || !reading ? (
        <ErrorText>{t.devTools.noteInvalid}</ErrorText>
      ) : (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-2xl bg-[var(--surface)] p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-[var(--text-muted)]">{t.devTools.noteNote}</dt>
            <dd className="font-mono text-lg font-bold text-[var(--text)]">
              {reading.note}
              {reading.octave}
              {reading.cents !== 0 && <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">{reading.cents > 0 ? "+" : ""}{reading.cents} ct</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">{t.devTools.noteFrequency}</dt>
            <dd className="font-mono text-lg font-bold tabular-nums text-[var(--text)]">{nf.format(freq)} Hz</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">MIDI</dt>
            <dd className="font-mono text-lg font-bold tabular-nums text-[var(--text)]">{nearestMidi}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">{t.devTools.notePeriod}</dt>
            <dd className="font-mono tabular-nums text-[var(--text)]">{nf.format(1000 / freq)} ms</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">{t.devTools.noteWavelength}</dt>
            <dd className="font-mono tabular-nums text-[var(--text)]">{nf.format(SPEED_OF_SOUND / freq)} m</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">{t.devTools.noteOctaves}</dt>
            <dd className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
              {nf.format(freq / 2)} · {nf.format(freq * 2)} Hz
            </dd>
          </div>
        </dl>
      )}
    </ToolCard>
  );
}
