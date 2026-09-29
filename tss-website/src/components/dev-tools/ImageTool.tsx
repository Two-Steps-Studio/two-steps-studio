"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Download, ImageUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { ErrorText, Segmented, ToolCard, monoField } from "./shared";

const FORMATS = [
  { value: "image/webp", label: "WebP", ext: "webp" },
  { value: "image/jpeg", label: "JPEG", ext: "jpg" },
  { value: "image/png", label: "PNG", ext: "png" },
] as const;
type Format = (typeof FORMATS)[number]["value"];

type Source = { url: string; name: string; size: number; width: number; height: number };
type Result = { url: string; size: number; width: number; height: number };

// Pixel-art upscales: whole multiples only, so every source pixel becomes
// an exact k×k block. Capped below the browsers' canvas size limits.
const PIXEL_SCALES = [2, 3, 4, 6, 8] as const;
const MAX_SIDE = 8192;

const formatBytes = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(2)} MB`;

// Converts and resizes entirely on a <canvas> in the page - the file never
// leaves the browser, which is the whole point of doing it client-side.
export function ImageTool() {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [format, setFormat] = useState<Format>("image/webp");
  const [quality, setQuality] = useState(85);
  const [width, setWidth] = useState(0);
  const [pixelArt, setPixelArt] = useState(false);
  const [error, setError] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Object URLs pin the decoded file in memory until revoked.
  useEffect(() => () => { if (source) URL.revokeObjectURL(source.url); }, [source]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const load = (file: File | undefined) => {
    if (!file) return;
    setError(false);
    setResult(null);
    if (!file.type.startsWith("image/")) {
      setError(true);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSource({ url, name: file.name, size: file.size, width: img.naturalWidth, height: img.naturalHeight });
      setWidth(pixelArt ? Math.min(img.naturalWidth * 4, MAX_SIDE) : img.naturalWidth);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError(true);
    };
    img.src = url;
  };

  const convert = () => {
    if (!source || width <= 0) return;
    const img = new Image();
    img.onload = () => {
      const w = Math.round(width);
      const h = Math.max(1, Math.round((source.height * w) / source.width));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return setError(true);
      // JPEG has no alpha channel - transparent pixels would turn black.
      if (format === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      // Nearest-neighbor for pixel art: smoothing would blur every edge.
      ctx.imageSmoothingEnabled = !pixelArt;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) return setError(true);
          setResult({ url: URL.createObjectURL(blob), size: blob.size, width: w, height: h });
        },
        format,
        quality / 100
      );
    };
    img.src = source.url;
  };

  const onDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragging(false);
    load(e.dataTransfer.files[0]);
  };

  const ext = FORMATS.find((f) => f.value === format)!.ext;
  const baseName = source?.name.replace(/\.[^.]+$/, "") ?? "image";
  const saved = source && result ? Math.round((1 - result.size / source.size) * 100) : 0;

  return (
    <ToolCard title={t.devTools.imageTitle} description={t.devTools.imageDesc}>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => load(e.target.files?.[0])} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-color)] p-6 text-sm text-[var(--text-muted)] transition-colors",
          dragging && "border-[var(--color-dev)] bg-[var(--color-dev)]/10"
        )}
      >
        {source ? (
          // Plain <img>: a local object URL preview, nothing for next/image to optimize.
          <img src={source.url} alt="" className={cn("max-h-32 rounded-lg object-contain", pixelArt && "min-h-16 [image-rendering:pixelated]")} />
        ) : (
          <ImageUp className="size-8" />
        )}
        <span>{source ? `${source.name} · ${source.width}×${source.height} · ${formatBytes(source.size)}` : t.devTools.imageDrop}</span>
      </button>
      {error && <ErrorText>{t.devTools.invalid}</ErrorText>}

      {source && (
        <>
          <div className="flex items-start gap-3">
            <Switch
              id="dt-img-pixel"
              checked={pixelArt}
              onCheckedChange={(on) => {
                setPixelArt(on);
                setResult(null);
                if (on) {
                  // Lossy WebP/JPEG smear the hard pixel edges this mode is for.
                  setFormat("image/png");
                  setWidth(Math.min(source.width * 4, MAX_SIDE));
                } else {
                  setWidth(source.width);
                }
              }}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <Label htmlFor="dt-img-pixel">{t.devTools.imagePixelArt}</Label>
              <p className="text-xs text-[var(--text-muted)]">{t.devTools.imagePixelArtHint}</p>
            </div>
          </div>
          {pixelArt && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t.devTools.imagePixelArt}>
              {PIXEL_SCALES.map((k) => {
                const w = source.width * k;
                const fits = w <= MAX_SIDE && source.height * k <= MAX_SIDE;
                return (
                  <Button
                    key={k}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!fits}
                    aria-pressed={width === w}
                    onClick={() => setWidth(w)}
                    className={cn("rounded-xl border-[var(--border-color)] font-mono", width === w && "border-[var(--color-dev)] bg-[var(--color-dev)]/15")}
                  >
                    ×{k}
                  </Button>
                );
              })}
            </div>
          )}
          <Segmented options={FORMATS} value={format} onChange={setFormat} label={t.devTools.imageFormat} />
          {format !== "image/png" && (
            <div className="space-y-2">
              <Label>{t.devTools.imageQuality}: {quality}%</Label>
              <Slider value={[quality]} onValueChange={([v]) => setQuality(v)} min={10} max={100} step={5} aria-label={t.devTools.imageQuality} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="dt-img-w">
              {t.devTools.aspectWidth} (px) → {width > 0 ? `${Math.round(width)}×${Math.max(1, Math.round((source.height * width) / source.width))}` : "—"}
            </Label>
            <Input id="dt-img-w" type="number" min={1} max={Math.min(source.width * (pixelArt ? 8 : 4), MAX_SIDE)} value={width || ""} onChange={(e) => setWidth(Math.max(0, Math.floor(Number(e.target.value))))} className={monoField} />
          </div>
          <Button type="button" variant="outline" className="rounded-xl border-[var(--border-color)]" onClick={convert} disabled={width <= 0}>
            {t.devTools.imageConvert}
          </Button>
        </>
      )}

      {result && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] p-4">
          <p className="text-sm text-[var(--text)]">
            {result.width}×{result.height} · <span className="font-mono font-bold">{formatBytes(result.size)}</span>
            {source && (
              <span className={cn("ml-2 font-medium", saved >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {saved >= 0 ? `−${saved}%` : `+${-saved}%`}
              </span>
            )}
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]">
            <a href={result.url} download={`${baseName}.${ext}`}>
              <Download /> {t.devTools.imageDownload}
            </a>
          </Button>
        </div>
      )}
    </ToolCard>
  );
}
