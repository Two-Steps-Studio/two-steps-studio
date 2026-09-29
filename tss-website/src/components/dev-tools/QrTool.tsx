"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { encode } from "uqr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-translation";
import { contrastRatio, luminance, parseColor, toHex } from "./color";
import { qrSvg, wifiPayload, type WifiSecurity } from "./qr";
import { CopyButton, ErrorText, Segmented, ToolCard, monoField, nativeSelect } from "./shared";

type Mode = "text" | "wifi";
type Ecc = "L" | "M" | "Q" | "H";

const PNG_SIZES = [512, 1024, 2048] as const;

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Posters, event slides, merch: QR codes rendered as SVG (sharp at any print
// size) or PNG, in the site's colors if wanted. Encoding runs locally.
export function QrTool() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("https://twostepsstudio.pl");
  const [wifi, setWifi] = useState({ ssid: "", password: "", security: "WPA" as WifiSecurity, hidden: false });
  const [ecc, setEcc] = useState<Ecc>("M");
  const [darkText, setDarkText] = useState("#000000");
  const [lightText, setLightText] = useState("#ffffff");

  const payload = mode === "text" ? text : wifi.ssid ? wifiPayload(wifi) : "";
  const dark = parseColor(darkText);
  const light = parseColor(lightText);

  const qr = useMemo(() => {
    if (!payload) return null;
    try {
      // 4-module quiet zone: the spec minimum, and what scanners need to
      // find the code on a busy poster.
      return encode(payload, { ecc, border: 4 });
    } catch {
      return "tooLong" as const;
    }
  }, [payload, ecc]);

  const svg = qr && qr !== "tooLong" && dark && light ? qrSvg(qr.data, toHex(dark), toHex(light)) : "";
  const contrast = dark && light ? contrastRatio(luminance(dark), luminance(light)) : 0;
  // Many scanners only look for dark-on-light codes.
  const inverted = dark && light ? luminance(dark) > luminance(light) : false;

  const downloadPng = (size: number) => {
    if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => blob && downloadBlob(blob, `qr-${size}.png`), "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <ToolCard title={t.devTools.qrTitle} description={t.devTools.qrDesc}>
      <Segmented
        options={[
          { value: "text", label: t.devTools.qrModeText },
          { value: "wifi", label: "Wi-Fi" },
        ]}
        value={mode}
        onChange={setMode}
        label={t.devTools.qrTitle}
      />

      {mode === "text" ? (
        <div className="space-y-2">
          <Label htmlFor="dt-qr-text">{t.devTools.qrContent}</Label>
          <Textarea id="dt-qr-text" rows={2} value={text} onChange={(e) => setText(e.target.value)} className={monoField} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="dt-qr-ssid">{t.devTools.qrSsid}</Label>
            <Input id="dt-qr-ssid" value={wifi.ssid} onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })} autoComplete="off" />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="dt-qr-sec">{t.devTools.qrSecurity}</Label>
            <select id="dt-qr-sec" value={wifi.security} onChange={(e) => setWifi({ ...wifi, security: e.target.value as WifiSecurity })} className={nativeSelect}>
              <option value="WPA">WPA / WPA2 / WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">{t.devTools.qrOpen}</option>
            </select>
          </div>
          {wifi.security !== "nopass" && (
            <div className="min-w-0 space-y-2">
              <Label htmlFor="dt-qr-pass">{t.devTools.qrPassword}</Label>
              <Input id="dt-qr-pass" value={wifi.password} onChange={(e) => setWifi({ ...wifi, password: e.target.value })} autoComplete="off" spellCheck={false} className={monoField} />
            </div>
          )}
          <div className="flex items-center gap-2 sm:self-end sm:pb-2">
            <Switch id="dt-qr-hidden" checked={wifi.hidden} onCheckedChange={(v) => setWifi({ ...wifi, hidden: v })} />
            <Label htmlFor="dt-qr-hidden" className="font-normal">
              {t.devTools.qrHidden}
            </Label>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-qr-dark">{t.devTools.qrDark}</Label>
          <Input id="dt-qr-dark" value={darkText} onChange={(e) => setDarkText(e.target.value)} spellCheck={false} className={monoField} aria-invalid={!dark} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-qr-light">{t.devTools.qrLight}</Label>
          <Input id="dt-qr-light" value={lightText} onChange={(e) => setLightText(e.target.value)} spellCheck={false} className={monoField} aria-invalid={!light} />
        </div>
        <div className="col-span-2 min-w-0 space-y-2 sm:col-span-1">
          <Label>{t.devTools.qrEcc}</Label>
          <Segmented options={(["L", "M", "Q", "H"] as const).map((v) => ({ value: v, label: v }))} value={ecc} onChange={setEcc} label={t.devTools.qrEcc} />
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)]">{t.devTools.qrEccHint}</p>

      {qr === "tooLong" && <ErrorText>{t.devTools.qrTooLong}</ErrorText>}
      {svg && (contrast < 4 || inverted) && <ErrorText>{t.devTools.qrContrastWarn}</ErrorText>}

      {svg && qr && qr !== "tooLong" && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Generated SVG from our own renderer (no user markup inside). */}
          <div
            role="img"
            aria-label={t.devTools.qrTitle}
            className="size-48 shrink-0 overflow-hidden rounded-xl border border-[var(--border-color)] [&>svg]:size-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="min-w-0 space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              {t.devTools.qrVersion} {qr.version} · {qr.size}×{qr.size} · {payload.length} {t.devTools.qrChars}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={() => downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qr.svg")}>
                <Download /> SVG
              </Button>
              {PNG_SIZES.map((size) => (
                <Button key={size} type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={() => downloadPng(size)}>
                  <Download /> PNG {size}
                </Button>
              ))}
              <CopyButton value={svg} />
            </div>
          </div>
        </div>
      )}
    </ToolCard>
  );
}
