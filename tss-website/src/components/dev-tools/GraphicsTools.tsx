"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { contrastRatio, hslToRgb, luminance, mix, parseColor, rgbToHsl, toHex, type RGB } from "./color";
import { AspectRatioTool, ColorTool } from "./DesignTools";
import { ImageTool } from "./ImageTool";
import { QrTool } from "./QrTool";
import { FaviconTool, ImagePaletteTool } from "./ImageExtrasTools";
import { ToolGroups } from "./ToolGroups";
import { CopyButton, Segmented, ToolCard, monoField } from "./shared";

const actionButton = "rounded-xl border-[var(--border-color)]";
const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };
const readableOn = (c: RGB) => (luminance(c) > 0.4 ? "#000000" : "#ffffff");

// Hex text field with a live dot. Inline style only for the user's color.
function HexField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const parsed = parseColor(value);
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span
          aria-hidden
          className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 rounded-full border border-[var(--border-color)]"
          style={{ backgroundColor: parsed ? toHex(parsed) : "transparent" }}
        />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} className={cn(monoField, "pl-9", !parsed && value && "border-red-500")} />
      </div>
    </div>
  );
}

async function copyHex(hex: string, copiedLabel: string) {
  try {
    await navigator.clipboard.writeText(hex);
    toast.success(`${copiedLabel}: ${hex}`);
  } catch {
    // Clipboard blocked - the value is still visible on the swatch.
  }
}

/* ----------------------------------- Palette ----------------------------------- */

const HARMONIES = {
  complementary: [0, 180],
  analogous: [-30, 0, 30],
  triadic: [0, 120, 240],
  split: [0, 150, 210],
  tetradic: [0, 90, 180, 270],
} as const;
type Harmony = keyof typeof HARMONIES;

// 50-950 scale like Tailwind's: tints mix toward white, shades toward black.
const SCALE: [string, RGB, number][] = [
  ["50", WHITE, 0.92], ["100", WHITE, 0.8], ["200", WHITE, 0.6], ["300", WHITE, 0.4], ["400", WHITE, 0.2],
  ["500", WHITE, 0],
  ["600", BLACK, 0.15], ["700", BLACK, 0.3], ["800", BLACK, 0.45], ["900", BLACK, 0.6], ["950", BLACK, 0.75],
];

function PaletteTool() {
  const { t } = useLanguage();
  const [base, setBase] = useState("#1bbdbd");
  const [harmony, setHarmony] = useState<Harmony>("analogous");
  const rgb = parseColor(base);

  const hsl = rgb && rgbToHsl(rgb);
  // Offset 0 is the exact input, not a round trip through integer HSL
  // (which turns #1bbdbd into #1bbbbb).
  const harmonyColors =
    rgb && hsl ? HARMONIES[harmony].map((o) => (o === 0 ? toHex(rgb) : toHex(hslToRgb((hsl.h + o + 360) % 360, hsl.s, hsl.l)))) : [];
  const scale = rgb ? SCALE.map(([step, target, amount]) => ({ step, hex: toHex(mix(rgb, target, amount)) })) : [];
  const css = scale.map((s) => `  --color-brand-${s.step}: ${s.hex};`).join("\n");

  const harmonyOptions: { value: Harmony; label: string }[] = [
    { value: "complementary", label: t.devTools.paletteComplementary },
    { value: "analogous", label: t.devTools.paletteAnalogous },
    { value: "triadic", label: t.devTools.paletteTriadic },
    { value: "split", label: t.devTools.paletteSplit },
    { value: "tetradic", label: t.devTools.paletteTetradic },
  ];

  return (
    <ToolCard title={t.devTools.paletteTitle} description={t.devTools.paletteDesc}>
      <HexField id="dt-pal-base" label={t.devTools.paletteBase} value={base} onChange={setBase} />
      <Segmented options={harmonyOptions} value={harmony} onChange={setHarmony} label={t.devTools.paletteTitle} />
      {rgb && (
        <>
          <div className="flex overflow-hidden rounded-2xl border border-[var(--border-color)]">
            {harmonyColors.map((hex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => copyHex(hex, t.devTools.copied)}
                className="flex h-20 flex-1 items-end justify-center pb-2 font-mono text-xs font-bold transition-[filter] hover:brightness-110 active:brightness-95"
                style={{ backgroundColor: hex, color: readableOn(parseColor(hex)!) }}
              >
                {hex}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm text-[var(--text-muted)]">{t.devTools.paletteScale}</p>
            <div className="grid grid-cols-6 overflow-hidden rounded-2xl border border-[var(--border-color)] sm:grid-cols-11">
              {scale.map((s) => (
                <button
                  key={s.step}
                  type="button"
                  title={s.hex}
                  onClick={() => copyHex(s.hex, t.devTools.copied)}
                  className="flex h-14 flex-col items-center justify-center font-mono text-[0.625rem] font-bold active:brightness-95"
                  style={{ backgroundColor: s.hex, color: readableOn(parseColor(s.hex)!) }}
                >
                  {s.step}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-muted)]">{t.devTools.paletteHint}</p>
            <CopyButton value={`:root {\n${css}\n}`} />
          </div>
        </>
      )}
    </ToolCard>
  );
}

/* ---------------------------------- Contrast ---------------------------------- */

function PassBadge({ pass, level }: { pass: boolean; level: string }) {
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-xs font-bold", pass ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400")}>
      {level} {pass ? "✓" : "✗"}
    </span>
  );
}

function ContrastTool() {
  const { t } = useLanguage();
  const [fg, setFg] = useState("#1bbdbd");
  const [bg, setBg] = useState("#ffffff");
  const fgRgb = parseColor(fg);
  const bgRgb = parseColor(bg);
  const ratio = fgRgb && bgRgb ? contrastRatio(luminance(fgRgb), luminance(bgRgb)) : null;

  const checks = [
    { label: t.devTools.contrastNormal, aa: 4.5, aaa: 7 },
    { label: t.devTools.contrastLarge, aa: 3, aaa: 4.5 },
    { label: t.devTools.contrastUi, aa: 3, aaa: null },
  ];

  return (
    <ToolCard title={t.devTools.contrastTitle} description={t.devTools.contrastDesc}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <HexField id="dt-con-fg" label={t.devTools.contrastText} value={fg} onChange={setFg} />
        <Button type="button" variant="outline" size="icon" className={actionButton} aria-label={t.devTools.unitSwap} onClick={() => { setFg(bg); setBg(fg); }}>
          <ArrowLeftRight />
        </Button>
        <HexField id="dt-con-bg" label={t.devTools.contrastBackground} value={bg} onChange={setBg} />
      </div>
      {ratio !== null && fgRgb && bgRgb && (
        <>
          <div className="rounded-2xl border border-[var(--border-color)] p-5" style={{ backgroundColor: toHex(bgRgb), color: toHex(fgRgb) }}>
            <p className="text-2xl font-bold">Two Steps Studio</p>
            <p className="text-sm">{t.devTools.contrastSample}</p>
          </div>
          <p className="text-center font-mono text-3xl font-bold text-[var(--text)]">{ratio.toFixed(2)}:1</p>
          <ul className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-[var(--text)]">{c.label}</span>
                <span className="flex gap-2">
                  <PassBadge pass={ratio >= c.aa} level="AA" />
                  {c.aaa !== null && <PassBadge pass={ratio >= c.aaa} level="AAA" />}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ToolCard>
  );
}

export function GraphicsTools() {
  const { t } = useLanguage();
  return (
    <ToolGroups
      tab="graphics"
      groups={[
        { id: "color", title: t.devTools.catGraphicsColor, content: <><ColorTool /><PaletteTool /><ContrastTool /><ImagePaletteTool /></> },
        { id: "image", title: t.devTools.catGraphicsImage, content: <><ImageTool /><AspectRatioTool /><FaviconTool /><QrTool /></> },
      ]}
    />
  );
}
