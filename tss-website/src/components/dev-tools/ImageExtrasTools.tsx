"use client";

import { useEffect, useState } from "react";
import { Download, ImageUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-translation";
import { luminance, parseColor, toHex } from "./color";
import { buildIco, extractPalette, type Swatch } from "./image-math";
import { CopyButton, ErrorText, FileDrop, ToolCard, downloadBlob, loadImage, monoField } from "./shared";

/* ----------------------------- Palette from image ----------------------------- */

// Longest side the image is scaled to before sampling: plenty for a palette
// and keeps median cut fast on a 4K photo.
const SAMPLE_SIZE = 160;

export function ImagePaletteTool() {
  const { t } = useLanguage();
  const [pixels, setPixels] = useState<{ data: Uint8ClampedArray; preview: string } | null>(null);
  const [count, setCount] = useState(6);
  const [error, setError] = useState(false);

  const load = async (file: File) => {
    setError(false);
    try {
      const img = await loadImage(file);
      const scale = Math.min(1, SAMPLE_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setPixels({ data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, preview: canvas.toDataURL("image/png") });
    } catch {
      setPixels(null);
      setError(true);
    }
  };

  const palette: Swatch[] = pixels ? extractPalette(pixels.data, count) : [];
  const cssVars = palette.map((c, i) => `--color-${i + 1}: ${toHex(c)};`).join("\n");

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(`${hex} ${t.devTools.copied.toLowerCase()}`);
    } catch {
      toast.error(t.devTools.copyFailed);
    }
  };

  return (
    <ToolCard title={t.devTools.imgPaletteTitle} description={t.devTools.imgPaletteDesc}>
      <FileDrop accept="image/*" onFile={load}>
        {pixels ? (
          <img src={pixels.preview} alt="" className="max-h-28 rounded-lg object-contain" />
        ) : (
          <ImageUp className="size-8" />
        )}
        <span>{t.devTools.imageDrop}</span>
      </FileDrop>
      {error && <ErrorText>{t.devTools.invalid}</ErrorText>}
      {pixels && (
        <>
          <div className="space-y-2">
            <Label>
              {t.devTools.imgPaletteCount}: {count}
            </Label>
            <Slider value={[count]} onValueChange={([v]) => setCount(v)} min={2} max={10} step={1} aria-label={t.devTools.imgPaletteCount} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {palette.map((c) => {
              const hex = toHex(c);
              const dark = luminance(c) < 0.35;
              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => copy(hex)}
                  aria-label={`${t.devTools.copy} ${hex}`}
                  className="flex h-20 flex-col justify-end rounded-xl border border-[var(--border-color)] p-2 text-left transition-transform active:scale-95"
                  // The swatch fill is the data being shown.
                  style={{ backgroundColor: hex, color: dark ? "#fff" : "#000" }}
                >
                  <span className="font-mono text-sm font-bold">{hex}</span>
                  <span className="text-xs opacity-80">{Math.round(c.share * 100)}%</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-auto rounded-xl bg-[var(--surface)] p-3 font-mono text-xs text-[var(--text)]">{cssVars}</pre>
            <CopyButton value={cssVars} />
          </div>
        </>
      )}
    </ToolCard>
  );
}

/* --------------------------------- Favicon ---------------------------------- */

const ICO_SIZES = [16, 32, 48];
const PNG_OUTPUTS = [
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
];

type Rendered = { ico: Blob; pngs: { name: string; size: number; blob: Blob; url: string }[]; tiny: { size: number; url: string }[] };

// Square render with center-crop ("cover") for non-square sources, optional
// padding and background (transparent by default).
function render(img: HTMLImageElement, size: number, padding: number, background: string | null): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const inset = Math.round((size * padding) / 100);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, inset, inset, size - inset * 2, size - inset * 2);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/png"));
}

const HTML_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">`;

export function FaviconTool() {
  const { t } = useLanguage();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [padding, setPadding] = useState(0);
  const [useBackground, setUseBackground] = useState(false);
  const [bgText, setBgText] = useState("#ffffff");
  const [out, setOut] = useState<Rendered | null>(null);
  const [error, setError] = useState(false);
  const bg = useBackground ? parseColor(bgText) : null;

  // Object URLs pin the PNGs in memory until revoked.
  useEffect(() => () => [...(out?.pngs ?? []), ...(out?.tiny ?? [])].forEach((p) => URL.revokeObjectURL(p.url)), [out]);

  const load = async (file: File) => {
    setError(false);
    setOut(null);
    try {
      setImg(await loadImage(file));
    } catch {
      setImg(null);
      setError(true);
    }
  };

  const generate = async () => {
    if (!img) return;
    const background = bg ? toHex(bg) : null;
    const icoBlobs = await Promise.all(ICO_SIZES.map(async (size) => ({ size, blob: await render(img, size, padding, background) })));
    const icoParts = await Promise.all(icoBlobs.map(async ({ size, blob }) => ({ size, png: new Uint8Array(await blob.arrayBuffer()) })));
    const pngs = await Promise.all(
      PNG_OUTPUTS.map(async ({ size, name }) => {
        const blob = await render(img, size, padding, background);
        return { name, size, blob, url: URL.createObjectURL(blob) };
      })
    );
    const ico = buildIco(icoParts);
    const tiny = icoBlobs.filter((b) => b.size <= 32).map(({ size, blob }) => ({ size, url: URL.createObjectURL(blob) }));
    setOut({ ico: new Blob([ico.buffer as ArrayBuffer], { type: "image/x-icon" }), pngs, tiny });
  };

  const notSquare = img && Math.abs(img.naturalWidth - img.naturalHeight) > 1;

  return (
    <ToolCard title={t.devTools.faviconTitle} description={t.devTools.faviconDesc}>
      <FileDrop accept="image/*" onFile={load}>
        <ImageUp className="size-8" />
        <span>{img ? `${img.naturalWidth}×${img.naturalHeight}` : t.devTools.imageDrop}</span>
      </FileDrop>
      {error && <ErrorText>{t.devTools.invalid}</ErrorText>}
      {notSquare && <p className="text-xs text-[var(--text-muted)]">{t.devTools.faviconCrop}</p>}
      {img && (
        <>
          <div className="space-y-2">
            <Label>
              {t.devTools.faviconPadding}: {padding}%
            </Label>
            <Slider value={[padding]} onValueChange={([v]) => setPadding(v)} min={0} max={25} step={1} aria-label={t.devTools.faviconPadding} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Switch id="dt-fav-bg" checked={useBackground} onCheckedChange={setUseBackground} />
            <Label htmlFor="dt-fav-bg" className="font-normal">
              {t.devTools.faviconBackground}
            </Label>
            {useBackground && <Input aria-label={t.devTools.faviconBackground} value={bgText} onChange={(e) => setBgText(e.target.value)} className={`${monoField} w-28`} aria-invalid={!bg} />}
          </div>
          <Button type="button" variant="outline" className="rounded-xl border-[var(--border-color)]" onClick={() => void generate()} disabled={useBackground && !bg}>
            {t.devTools.faviconGenerate}
          </Button>
        </>
      )}
      {out && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-[var(--surface)] p-4">
            {out.pngs.map((p) => (
              <img key={p.name} src={p.url} alt={p.name} className="rounded-md" style={{ width: Math.min(96, p.size / 2), height: Math.min(96, p.size / 2) }} />
            ))}
            {/* The real 16 and 32 px renders at 1:1, as they'll look in a browser tab. */}
            {out.tiny.map((p) => (
              <img key={p.size} src={p.url} alt={`${p.size}×${p.size}`} width={p.size} height={p.size} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={() => downloadBlob(out.ico, "favicon.ico")}>
              <Download /> favicon.ico
            </Button>
            {out.pngs.map((p) => (
              <Button key={p.name} type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={() => downloadBlob(p.blob, p.name)}>
                <Download /> {p.name}
              </Button>
            ))}
          </div>
          <div className="flex items-start gap-2">
            <pre className="min-w-0 flex-1 overflow-auto rounded-xl bg-[var(--surface)] p-3 font-mono text-xs text-[var(--text)]">{HTML_SNIPPET}</pre>
            <CopyButton value={HTML_SNIPPET} />
          </div>
        </div>
      )}
    </ToolCard>
  );
}
