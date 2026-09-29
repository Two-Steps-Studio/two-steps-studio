"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CopyButton, ErrorText, ToolCard, monoField } from "./shared";

type RGB = { r: number; g: number; b: number };

function hslToRgb(h: number, s: number, l: number): RGB {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

function rgbToHsl({ r, g, b }: RGB) {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  h = Math.round(h * 60);
  return { h: h < 0 ? h + 360 : h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

const toHex = ({ r, g, b }: RGB) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

// Accepts #rgb, #rrggbb, rgb()/rgba() and hsl()/hsla(), comma or space separated.
function parseColor(raw: string): RGB | null {
  const s = raw.trim().toLowerCase();
  const hex = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const full = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join("") : hex[1];
    return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
  }
  const rgb = s.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/);
  if (rgb) {
    const [r, g, b] = rgb.slice(1, 4).map(Number);
    return [r, g, b].every((v) => v <= 255) ? { r, g, b } : null;
  }
  const hsl = s.match(/^hsla?\(\s*(\d{1,3}(?:\.\d+)?)(?:deg)?\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%\s*[, ]\s*(\d{1,3}(?:\.\d+)?)%/);
  if (hsl) {
    const [h, sat, l] = hsl.slice(1, 4).map(Number);
    return sat <= 100 && l <= 100 ? hslToRgb(h % 360, sat, l) : null;
  }
  return null;
}

// WCAG 2.x relative luminance and contrast ratio.
function luminance({ r, g, b }: RGB) {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

function ColorTool() {
  const { t } = useLanguage();
  const [input, setInput] = useState("#ffcb2f");
  const color = parseColor(input);

  const rating = (ratio: number) =>
    ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? t.devTools.colorLarge : t.devTools.colorFail;

  const hsl = color && rgbToHsl(color);
  const formats = color && hsl
    ? [
        { label: "HEX", value: toHex(color) },
        { label: "RGB", value: `rgb(${color.r}, ${color.g}, ${color.b})` },
        { label: "HSL", value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
      ]
    : [];
  const lum = color ? luminance(color) : 0;
  const samples = [
    { text: "#ffffff", label: t.devTools.colorOnWhite, ratio: contrastRatio(lum, 1) },
    { text: "#000000", label: t.devTools.colorOnBlack, ratio: contrastRatio(lum, 0) },
  ];

  return (
    <ToolCard title={t.devTools.colorTitle} description={t.devTools.colorDesc}>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="dt-color">{t.devTools.input}</Label>
          <Input id="dt-color" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} className={monoField} placeholder="#ffcb2f / rgb(…) / hsl(…)" />
        </div>
        <input
          type="color"
          aria-label={t.devTools.colorTitle}
          value={color ? toHex(color) : "#000000"}
          onChange={(e) => setInput(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-[var(--border-color)] bg-transparent"
        />
      </div>

      {!color && input.trim() && <ErrorText>{t.devTools.invalid}</ErrorText>}

      {color && (
        <>
          <ul className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
            {formats.map((f) => (
              <li key={f.label} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-10 shrink-0 text-xs font-bold text-[var(--text-muted)]">{f.label}</span>
                <code className={cn(monoField, "min-w-0 flex-1 truncate text-[var(--text)]")}>{f.value}</code>
                <CopyButton value={f.value} />
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--text)]">{t.devTools.colorContrast}</p>
            <div className="grid grid-cols-2 gap-3">
              {samples.map((s) => (
                // Inline style is unavoidable here: the swatch color is user
                // input, not something a Tailwind class can express.
                <div key={s.text} className="rounded-2xl p-4" style={{ backgroundColor: toHex(color), color: s.text }}>
                  <div className="text-2xl font-bold">Aa</div>
                  <div className="text-xs">{s.label}</div>
                  <div className={cn(monoField, "mt-1 font-bold")}>{s.ratio.toFixed(2)}:1 · {rating(s.ratio)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </ToolCard>
  );
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const PRESETS = [
  [16, 9],
  [4, 3],
  [21, 9],
  [3, 2],
  [1, 1],
  [9, 16],
] as const;

function AspectRatioTool() {
  const { t } = useLanguage();
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [locked, setLocked] = useState(false);

  const valid = width > 0 && height > 0;
  const divisor = valid ? gcd(width, height) : 1;

  const changeWidth = (w: number) => {
    if (locked && width > 0 && w > 0) setHeight(Math.round((w * height) / width));
    setWidth(w);
  };
  const changeHeight = (h: number) => {
    if (locked && height > 0 && h > 0) setWidth(Math.round((h * width) / height));
    setHeight(h);
  };
  const applyPreset = (rw: number, rh: number) => setHeight(Math.round((width * rh) / rw));

  return (
    <ToolCard title={t.devTools.aspectTitle} description={t.devTools.aspectDesc}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="dt-ar-w">{t.devTools.aspectWidth}</Label>
          <Input id="dt-ar-w" type="number" min={1} value={width || ""} onChange={(e) => changeWidth(Math.max(0, Math.floor(Number(e.target.value))))} className={monoField} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dt-ar-h">{t.devTools.aspectHeight}</Label>
          <Input id="dt-ar-h" type="number" min={1} value={height || ""} onChange={(e) => changeHeight(Math.max(0, Math.floor(Number(e.target.value))))} className={monoField} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="dt-ar-lock" checked={locked} onCheckedChange={(c) => setLocked(c === true)} />
        <Label htmlFor="dt-ar-lock">{t.devTools.aspectLock}</Label>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-[var(--text-muted)]">{t.devTools.aspectPresets}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(([rw, rh]) => (
            <Button key={`${rw}:${rh}`} type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={() => applyPreset(rw, rh)} disabled={!width}>
              {rw}:{rh}
            </Button>
          ))}
        </div>
      </div>
      {valid && (
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] p-4">
          <div className="flex-1">
            <p className="text-sm text-[var(--text-muted)]">{t.devTools.aspectRatio}</p>
            <p className={cn(monoField, "text-lg font-bold text-[var(--text)]")}>
              {width / divisor}:{height / divisor} <span className="font-normal text-[var(--text-muted)]">({(width / height).toFixed(3)})</span>
            </p>
          </div>
          <CopyButton value={`${width}x${height}`} />
        </div>
      )}
    </ToolCard>
  );
}

export function DesignTools() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ColorTool />
      <AspectRatioTool />
    </div>
  );
}
