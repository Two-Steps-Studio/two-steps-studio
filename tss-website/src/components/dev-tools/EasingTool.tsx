"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { EASING_PRESETS, toCss, toGodot, toMotion, toUnity, type Bezier } from "./easing";
import { CopyButton, Segmented, ToolCard, monoField } from "./shared";

// Graph space: x 0..1 -> 0..200, y 0..1 -> 200..0, with room above and
// below for overshooting "back" curves (y from -0.6 to 1.6) - tall, like
// cubic-bezier.com, because that's where those handles live.
const SIZE = 200;
const MIN_Y = -0.6;
const MAX_Y = 1.6;
const toSvg = (x: number, y: number) => [x * SIZE, (1 - y) * SIZE] as const;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round = (v: number) => Math.round(v * 100) / 100;

type Target = "css" | "motion" | "unity" | "godot";

export function EasingTool() {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [curve, setCurve] = useState<Bezier>([0.16, 1, 0.3, 1]);
  const [duration, setDuration] = useState(600);
  const [target, setTarget] = useState<Target>("css");
  const [x1, y1, x2, y2] = curve;

  const setPoint = (index: 0 | 1, x: number, y: number) => {
    const next = [...curve] as Bezier;
    next[index * 2] = round(clamp(x, 0, 1)); // x must stay in 0..1 for a valid timing function
    next[index * 2 + 1] = round(clamp(y, MIN_Y, MAX_Y));
    setCurve(next);
  };

  const drag = (index: 0 | 1) => (e: PointerEvent<SVGCircleElement>) => {
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    else if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM()?.inverse();
    if (!svg || !matrix) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix);
    setPoint(index, p.x / SIZE, 1 - p.y / SIZE);
  };

  const nudge = (index: 0 | 1) => (e: KeyboardEvent<SVGCircleElement>) => {
    const step = e.shiftKey ? 0.1 : 0.01;
    const [x, y] = [curve[index * 2], curve[index * 2 + 1]];
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setPoint(index, x + move[0], y + move[1]);
  };

  // Web Animations API instead of a CSS transition: the site-wide
  // reduced-motion rule zeroes transition-duration, which would make this
  // preview useless - and here the motion is the thing being inspected,
  // started by an explicit click.
  const play = () => {
    const box = boxRef.current;
    const track = box?.parentElement;
    if (!box || !track) return;
    const distance = track.clientWidth - box.offsetWidth;
    box.animate([{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }], { duration, easing: toCss(curve), fill: "forwards" });
  };

  const [p0x, p0y] = toSvg(0, 0);
  const [p1x, p1y] = toSvg(x1, y1);
  const [p2x, p2y] = toSvg(x2, y2);
  const [p3x, p3y] = toSvg(1, 1);
  const code = { css: toCss(curve), motion: toMotion(curve), unity: toUnity(curve), godot: toGodot(curve) }[target];
  const handleClass =
    "cursor-grab touch-none fill-[var(--card-bg)] stroke-[var(--color-dev)] [stroke-width:3] outline-none focus-visible:[stroke-width:5] active:cursor-grabbing";

  return (
    <ToolCard title={t.devTools.easingTitle} description={t.devTools.easingDesc}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.devTools.easingPresets}>
        {EASING_PRESETS.map((p) => (
          <Button
            key={p.name}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurve(p.value)}
            className={cn("rounded-xl border-[var(--border-color)] font-mono text-xs", p.value.every((v, i) => v === curve[i]) && "border-[var(--color-dev)] bg-[var(--color-dev)]/15")}
          >
            {p.name}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,192px)_1fr]">
        <svg
          ref={svgRef}
          viewBox={`-12 ${(1 - MAX_Y) * SIZE - 12} ${SIZE + 24} ${(MAX_Y - MIN_Y) * SIZE + 24}`}
          className="mx-auto w-full max-w-48"
          aria-label={t.devTools.easingTitle}
        >
          <rect x={0} y={0} width={SIZE} height={SIZE} className="fill-[var(--surface)] stroke-[var(--border-color)]" />
          <line x1={p0x} y1={p0y} x2={p3x} y2={p3y} className="stroke-[var(--border-color)]" strokeDasharray="4 4" />
          <line x1={p0x} y1={p0y} x2={p1x} y2={p1y} className="stroke-[var(--text-muted)]" />
          <line x1={p3x} y1={p3y} x2={p2x} y2={p2y} className="stroke-[var(--text-muted)]" />
          <path d={`M${p0x},${p0y} C${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}`} fill="none" className="stroke-[var(--text)]" strokeWidth={3} />
          {([0, 1] as const).map((i) => {
            const [cx, cy] = i === 0 ? [p1x, p1y] : [p2x, p2y];
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={9}
                tabIndex={0}
                role="slider"
                aria-label={`${t.devTools.easingHandle} ${i + 1}`}
                aria-valuemin={MIN_Y}
                aria-valuemax={MAX_Y}
                aria-valuenow={curve[i * 2 + 1]}
                aria-valuetext={`x ${curve[i * 2]}, y ${curve[i * 2 + 1]}`}
                className={handleClass}
                onPointerDown={drag(i)}
                onPointerMove={drag(i)}
                onKeyDown={nudge(i)}
              />
            );
          })}
        </svg>

        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(["x1", "y1", "x2", "y2"] as const).map((name, i) => (
              <div key={name} className="min-w-0 space-y-1">
                <Label htmlFor={`dt-ease-${name}`} className="font-mono text-xs">
                  {name}
                </Label>
                <Input
                  id={`dt-ease-${name}`}
                  type="number"
                  step={0.01}
                  min={i % 2 === 0 ? 0 : MIN_Y}
                  max={i % 2 === 0 ? 1 : MAX_Y}
                  value={curve[i]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    const next = [...curve] as Bezier;
                    next[i] = round(i % 2 === 0 ? clamp(v, 0, 1) : clamp(v, MIN_Y, MAX_Y));
                    setCurve(next);
                  }}
                  // No spin buttons: in a quarter-width column they covered the value.
                  className={cn(monoField, "px-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none")}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>
              {t.devTools.easingDuration}: {duration} ms
            </Label>
            <Slider value={[duration]} onValueChange={([v]) => setDuration(v)} min={100} max={2000} step={50} aria-label={t.devTools.easingDuration} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={play}>
              <Play /> {t.devTools.easingPlay}
            </Button>
            <div className="relative h-8 min-w-0 flex-1 rounded-lg bg-[var(--surface)]">
              <div ref={boxRef} className="size-8 rounded-lg bg-[var(--color-dev)]" />
            </div>
          </div>
        </div>
      </div>

      <Segmented
        options={[
          { value: "css", label: "CSS" },
          { value: "motion", label: "Framer Motion" },
          { value: "unity", label: "Unity (C#)" },
          { value: "godot", label: "Godot" },
        ]}
        value={target}
        onChange={setTarget}
        label={t.devTools.easingExport}
      />
      <div className="flex items-start gap-2">
        <pre className="max-h-60 min-w-0 flex-1 overflow-auto rounded-xl bg-[var(--surface)] p-3 font-mono text-xs text-[var(--text)]">{code}</pre>
        <CopyButton value={code} />
      </div>
    </ToolCard>
  );
}
