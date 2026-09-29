"use client";

import { useState } from "react";
import { Pipette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ColorPicker } from "./ColorPicker";
import { BRAND_SWATCHES, contrastRatio, hsvToRgb, luminance, parseColor, rgbToHsl, rgbToHsv, toHex, type HSV } from "./color";
import { CopyButton, ErrorText, ToolCard, monoField, useMounted } from "./shared";

// Chromium-only EyeDropper API - not in TS's DOM lib yet.
type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

const INITIAL_COLOR = "#ffcb2f";

export function ColorTool() {
  const { t } = useLanguage();
  const mounted = useMounted();
  const [input, setInput] = useState(INITIAL_COLOR);
  const [hsv, setHsv] = useState<HSV>(() => rgbToHsv(parseColor(INITIAL_COLOR)!));
  const color = parseColor(input);

  // Text -> picker keeps the previous hue for greys; picker -> text always
  // writes HEX. Both stay in sync without either one owning the other.
  const setFromText = (text: string) => {
    setInput(text);
    const rgb = parseColor(text);
    if (rgb) setHsv((prev) => rgbToHsv(rgb, prev.h));
  };
  const setFromPicker = (next: HSV) => {
    setHsv(next);
    setInput(toHex(hsvToRgb(next)));
  };

  const EyeDropper = mounted ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper : undefined;
  const pickFromScreen = async () => {
    if (!EyeDropper) return;
    try {
      const { sRGBHex } = await new EyeDropper().open();
      setFromText(sRGBHex);
    } catch {
      // Escape / cancel rejects with AbortError - nothing to do.
    }
  };

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
      <ColorPicker value={hsv} onChange={setFromPicker} areaLabel={t.devTools.colorArea} hueLabel={t.devTools.colorHue} />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t.devTools.colorSwatches}>
        {BRAND_SWATCHES.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            title={swatch.name}
            aria-label={`${swatch.name} ${swatch.hex}`}
            onClick={() => setFromText(swatch.hex)}
            className={cn(
              "size-8 rounded-full border border-[var(--border-color)] transition-transform active:scale-90",
              color && toHex(color) === swatch.hex && "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--card-bg)]"
            )}
            // Swatch fill is data, not styling - see the contrast samples below.
            style={{ backgroundColor: swatch.hex }}
          />
        ))}
        {EyeDropper && (
          <Button type="button" variant="outline" size="sm" className="ml-auto rounded-xl border-[var(--border-color)]" onClick={pickFromScreen}>
            <Pipette /> {t.devTools.colorEyedropper}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dt-color">{t.devTools.input}</Label>
        <Input id="dt-color" value={input} onChange={(e) => setFromText(e.target.value)} spellCheck={false} className={monoField} placeholder="#ffcb2f / rgb(…) / hsl(…)" />
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

// Recommended upload sizes, px. Steam uses its 2024 doubled capsule sizes.
const PLATFORM_SIZES = [
  { name: "YouTube thumbnail", w: 1280, h: 720 },
  { name: "YouTube banner", w: 2560, h: 1440 },
  { name: "Twitch banner", w: 1200, h: 480 },
  { name: "Twitch offline", w: 1920, h: 1080 },
  { name: "Discord banner", w: 960, h: 540 },
  { name: "Instagram post", w: 1080, h: 1350 },
  { name: "Story / TikTok / Reels", w: 1080, h: 1920 },
  { name: "X header", w: 1500, h: 500 },
  { name: "Steam header capsule", w: 920, h: 430 },
  { name: "Steam library capsule", w: 600, h: 900 },
  { name: "Steam library hero", w: 3840, h: 1240 },
] as const;

export function AspectRatioTool() {
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
      <div className="space-y-2">
        <p className="text-sm text-[var(--text-muted)]">{t.devTools.aspectPlatforms}</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_SIZES.map((p) => (
            <Button
              key={p.name}
              type="button"
              variant="outline"
              size="sm"
              className={cn("rounded-xl border-[var(--border-color)]", width === p.w && height === p.h && "border-[var(--color-dev)] bg-[var(--color-dev)]/15")}
              onClick={() => {
                setWidth(p.w);
                setHeight(p.h);
              }}
            >
              {p.name} <span className="font-mono text-[var(--text-muted)]">{p.w}×{p.h}</span>
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
