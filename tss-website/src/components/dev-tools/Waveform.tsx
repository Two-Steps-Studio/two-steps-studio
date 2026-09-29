"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type Props = {
  src: string;
  peaks: Float32Array; // min/max pairs, see waveformPeaks()
  duration: number;
  // Part of the track the BPM/key estimate was based on, shaded.
  analyzed?: { start: number; end: number };
  label: string;
};

// Waveform with a playhead; click/drag or arrow keys to seek. Drawn on a
// canvas because it's thousands of bars redrawn every animation frame
// while playing.
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Waveform({ src, peaks, duration, analyzed, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  // Only for the slider's aria value; timeupdate fires ~4x a second.
  const [now, setNow] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio) return;
    let frame = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const style = getComputedStyle(canvas);
      const text = style.getPropertyValue("--text").trim() || "#000";
      const accent = style.getPropertyValue("--color-dev").trim() || "#ffcb2f";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      if (analyzed && duration > 0) {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = text;
        ctx.fillRect((analyzed.start / duration) * width, 0, ((analyzed.end - analyzed.start) / duration) * width, height);
      }

      const buckets = peaks.length / 2;
      const played = duration > 0 ? audio.currentTime / duration : 0;
      const mid = height / 2;
      const barWidth = 2;
      const gap = 1;
      for (let x = 0; x < width; x += barWidth + gap) {
        const from = Math.floor((x / width) * buckets);
        const to = Math.max(from + 1, Math.floor(((x + barWidth) / width) * buckets));
        let min = 0;
        let max = 0;
        for (let b = from; b < to && b < buckets; b++) {
          min = Math.min(min, peaks[b * 2]);
          max = Math.max(max, peaks[b * 2 + 1]);
        }
        const top = mid - Math.max(0.5, max * mid);
        const bottom = mid - Math.min(-0.5, min * mid);
        ctx.globalAlpha = x / width <= played ? 1 : 0.35;
        ctx.fillStyle = x / width <= played ? accent : text;
        ctx.fillRect(x, top, barWidth, bottom - top);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw();
      if (!audio.paused) frame = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    };
    draw();
    const onTime = () => setNow(audio.currentTime);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("seeked", draw);
    audio.addEventListener("seeked", onTime);
    audio.addEventListener("pause", draw);
    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    // Theme switch changes --text; redraw so the bars don't vanish.
    const theme = new MutationObserver(draw);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("seeked", draw);
      audio.removeEventListener("seeked", onTime);
      audio.removeEventListener("pause", draw);
      resize.disconnect();
      theme.disconnect();
    };
  }, [peaks, duration, analyzed]);

  const seekTo = (e: PointerEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const target = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)) * duration;
    audio.currentTime = target;
    // Before the media has loaded, no seeked/timeupdate event fires.
    setNow(target);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const step = e.shiftKey ? 10 : 5;
    if (e.key === "ArrowRight") audio.currentTime = Math.min(duration, audio.currentTime + step);
    else if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - step);
    else if (e.key === " " || e.key === "Enter") void (audio.paused ? audio.play() : audio.pause());
    else return;
    e.preventDefault();
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(now)}
        aria-valuetext={`${clock(now)} / ${clock(duration)}`}
        className="h-20 w-full cursor-pointer touch-none rounded-xl focus-visible:ring-2 focus-visible:ring-[var(--color-dev)] focus-visible:outline-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekTo(e);
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && seekTo(e)}
        onKeyDown={onKeyDown}
      />
      <audio ref={audioRef} controls src={src} className="w-full" />
    </div>
  );
}
