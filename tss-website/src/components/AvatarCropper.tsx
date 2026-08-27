"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn } from "lucide-react";
import { useLanguage } from "@/hooks/use-translation";

// Square capture, circular preview mask (avatars render as circles
// everywhere in the app anyway) - drag to pan, slider to zoom, no external
// cropping library needed.
const VIEWPORT = 280; // CSS px, square
const OUTPUT = 512; // exported image size, px

interface AvatarCropperProps {
  file: File | null;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

export default function AvatarCropper({ file, onCancel, onCropped }: AvatarCropperProps) {
  const { t } = useLanguage();
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setImgUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = natural.w && natural.h ? Math.max(VIEWPORT / natural.w, VIEWPORT / natural.h) : 1;
  const displayScale = baseScale * zoom;
  const displayedW = natural.w * displayScale;
  const displayedH = natural.h * displayScale;
  const maxPanX = Math.max(0, (displayedW - VIEWPORT) / 2);
  const maxPanY = Math.max(0, (displayedH - VIEWPORT) / 2);

  const clampPan = (p: { x: number; y: number }) => ({
    x: Math.min(maxPanX, Math.max(-maxPanX, p.x)),
    y: Math.min(maxPanY, Math.max(-maxPanY, p.y)),
  });

  // Re-clamp whenever zoom shrinks the allowed pan range (e.g. zooming back
  // out toward 1x after having dragged near an edge at higher zoom).
  useEffect(() => {
    setPan((p) => clampPan(p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, natural.w, natural.h]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan({ x: dragRef.current.startPanX + dx, y: dragRef.current.startPanY + dy }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !natural.w) return;

    const imgTopLeftX = VIEWPORT / 2 + pan.x - displayedW / 2;
    const imgTopLeftY = VIEWPORT / 2 + pan.y - displayedH / 2;
    const sx = -imgTopLeftX / displayScale;
    const sy = -imgTopLeftY / displayScale;
    const sSize = VIEWPORT / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
    canvas.toBlob((blob) => {
      if (blob) onCropped(blob);
    }, "image/jpeg", 0.92);
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{t.profileForm.cropTitle}</DialogTitle>
        </DialogHeader>

        {imgUrl && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative rounded-full overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing bg-black/20"
              style={{ width: VIEWPORT, height: VIEWPORT }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- cropped
                  via canvas from the raw element, next/image's optimizer would
                  just get in the way here */}
              <img
                ref={imgRef}
                src={imgUrl}
                alt=""
                draggable={false}
                onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: displayedW || undefined,
                  height: displayedH || undefined,
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
                  maxWidth: "none",
                }}
              />
            </div>

            <div className="flex items-center gap-3 w-full px-2">
              <ZoomIn size={16} className="text-[var(--text)] opacity-60 shrink-0" />
              <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={1} max={3} step={0.01} />
            </div>
            <p className="text-xs text-[var(--text)] opacity-60 text-center">{t.profileForm.cropHint}</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} className="rounded-2xl">
            {t.profileForm.cropCancel}
          </Button>
          <Button type="button" onClick={handleConfirm} className="rounded-2xl bg-[var(--color-general)] hover:bg-[var(--color-general)]/80 text-white">
            {t.profileForm.cropConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
