"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

import { hsvToRgb, type HSV } from "./color";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function ColorPicker({
  value,
  onChange,
  areaLabel,
  hueLabel,
}: {
  value: HSV;
  onChange: (next: HSV) => void;
  areaLabel: string;
  hueLabel: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const current = hsvToRgb(value);

  const trackPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    onChange({
      ...value,
      s: clamp01((e.clientX - rect.left) / rect.width),
      v: 1 - clamp01((e.clientY - rect.top) / rect.height),
    });
  };

  const onAreaKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.01;
    const delta: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    onChange({ ...value, s: clamp01(value.s + d[0]), v: clamp01(value.v + d[1]) });
  };

  return (
    <div className="space-y-3">
      {/* Inline styles below are unavoidable: hue, handle position and
          handle fill all come from the live picker state. */}
      <div
        ref={areaRef}
        role="slider"
        tabIndex={0}
        aria-label={areaLabel}
        aria-valuetext={`${Math.round(value.s * 100)}%, ${Math.round(value.v * 100)}%`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          trackPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) trackPointer(e);
        }}
        onKeyDown={onAreaKey}
        className="relative h-44 w-full cursor-crosshair touch-none overflow-hidden rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dev)] focus-visible:ring-offset-2"
        style={{ backgroundColor: `hsl(${value.h}, 100%, 50%)` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.35)]"
          style={{
            left: `${value.s * 100}%`,
            top: `${(1 - value.v) * 100}%`,
            backgroundColor: `rgb(${current.r}, ${current.g}, ${current.b})`,
          }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={359}
        value={Math.round(value.h)}
        onChange={(e) => onChange({ ...value, h: Number(e.target.value) })}
        aria-label={hueLabel}
        className="h-3 w-full cursor-pointer appearance-none rounded-full bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dev)] focus-visible:ring-offset-2 [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35)] [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.35)]"
      />
    </div>
  );
}
