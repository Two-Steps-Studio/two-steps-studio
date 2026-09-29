"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { createAudioContext } from "./audio";
import { detectPitch, toReading, type Reading } from "./pitch";
import { ErrorText, ToolCard, monoField } from "./shared";

type PolicyDocument = Document & {
  permissionsPolicy?: { allowsFeature: (feature: string) => boolean };
  featurePolicy?: { allowsFeature: (feature: string) => boolean };
};

// The microphone is only allowed on /dev/tools (next.config.ts). Arriving
// here via in-app navigation keeps the previous document and its
// microphone=() policy, so a reload is needed - detectable in Chromium;
// other browsers don't expose it and just try.
function micBlockedByPolicy() {
  const doc = document as PolicyDocument;
  const policy = doc.permissionsPolicy ?? doc.featurePolicy;
  return policy ? !policy.allowsFeature("microphone") : false;
}

export function TunerTool() {
  const { t } = useLanguage();
  const [listening, setListening] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [a4, setA4] = useState(440);
  const stopRef = useRef<(() => void) | null>(null);
  // The detection interval reads A4 through a ref so changing the reference
  // pitch mid-session doesn't require restarting the microphone.
  const a4Ref = useRef(a4);
  useEffect(() => {
    a4Ref.current = a4;
  }, [a4]);

  useEffect(() => () => stopRef.current?.(), []);

  const start = async () => {
    setError(null);
    if (micBlockedByPolicy()) {
      setNeedsReload(true);
      setError(t.devTools.tunerReload);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(t.devTools.tunerUnsupported);
      return;
    }
    try {
      // Browser DSP is off: echo cancellation / noise suppression / AGC all
      // distort a sustained instrument tone and wreck pitch detection.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = createAudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const id = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        const freq = detectPitch(buf, ctx.sampleRate);
        // 30-2000 Hz covers bass to piccolo; anything outside is noise.
        if (freq > 30 && freq < 2000) setReading(toReading(freq, a4Ref.current));
      }, 100);
      stopRef.current = () => {
        window.clearInterval(id);
        stream.getTracks().forEach((track) => track.stop());
        void ctx.close();
        stopRef.current = null;
      };
      setListening(true);
    } catch {
      setError(t.devTools.tunerDenied);
    }
  };

  const stop = () => {
    stopRef.current?.();
    setListening(false);
  };

  const inTune = reading !== null && Math.abs(reading.cents) <= 5;

  return (
    <ToolCard title={t.devTools.tunerTitle} description={t.devTools.tunerDesc}>
      <div className="rounded-2xl bg-[var(--surface)] p-5 text-center" aria-live="polite">
        <p className={cn("font-mono text-6xl font-bold text-[var(--text)]", inTune && "text-emerald-600 dark:text-emerald-400")}>
          {reading ? reading.note : "—"}
          {reading && <span className="text-2xl text-[var(--text-muted)]">{reading.octave}</span>}
        </p>
        <p className="mt-1 font-mono text-sm text-[var(--text-muted)]">
          {reading ? `${reading.freq.toFixed(1)} Hz · ${reading.cents > 0 ? "+" : ""}${reading.cents} ct` : listening ? t.devTools.tunerListening : " "}
        </p>
        {/* -50 ... +50 cents meter. Inline left% is live data. */}
        <div className="relative mx-auto mt-4 h-2 max-w-xs rounded-full bg-[var(--text)]/10">
          <div className="absolute top-1/2 left-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-[var(--text-muted)]" />
          {reading && (
            <div
              className={cn(
                "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left] duration-150",
                inTune ? "bg-emerald-500" : "bg-[var(--color-dev)]"
              )}
              style={{ left: `${50 + Math.max(-50, Math.min(50, reading.cents))}%` }}
            />
          )}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="dt-tuner-a4">A4 (Hz)</Label>
          <Input id="dt-tuner-a4" type="number" min={400} max={480} value={a4} onChange={(e) => setA4(Math.min(480, Math.max(400, Number(e.target.value) || 440)))} className={monoField} />
        </div>
        <Button type="button" variant="outline" className="rounded-xl border-[var(--border-color)]" onClick={listening ? stop : start}>
          {listening ? <MicOff /> : <Mic />} {listening ? t.devTools.tunerStop : t.devTools.tunerStart}
        </Button>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      {needsReload && (
        <Button type="button" variant="outline" className="rounded-xl border-[var(--border-color)]" onClick={() => window.location.reload()}>
          <RotateCw /> {t.devTools.tunerReloadButton}
        </Button>
      )}
    </ToolCard>
  );
}
