"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CopyButton, ToolCard, monoField, nativeSelect } from "./shared";

// Degrees of rotation per mouse count at sensitivity 1 ("yaw"). Only games
// with well-established, linear values - converters that guess at
// FOV-scaled or non-linear games (Siege, Fortnite) give wrong answers.
const GAMES = [
  { id: "cs2", name: "Counter-Strike 2", yaw: 0.022 },
  { id: "apex", name: "Apex Legends", yaw: 0.022 },
  { id: "tf2", name: "Team Fortress 2", yaw: 0.022 },
  { id: "quake", name: "Quake Champions", yaw: 0.022 },
  { id: "valorant", name: "Valorant", yaw: 0.07 },
  { id: "ow2", name: "Overwatch 2", yaw: 0.0066 },
  { id: "cod", name: "Call of Duty (MW / Warzone)", yaw: 0.0066 },
] as const;
type GameId = (typeof GAMES)[number]["id"];
const yawOf = (id: GameId) => GAMES.find((g) => g.id === id)!.yaw;

function SensitivityTool() {
  const { t, locale } = useLanguage();
  const [from, setFrom] = useState<GameId>("cs2");
  const [to, setTo] = useState<GameId>("valorant");
  const [sens, setSens] = useState("1.5");
  const [dpi, setDpi] = useState("800");

  const s = Number(sens.replace(",", "."));
  const d = Number(dpi);
  const valid = s > 0 && d > 0;
  // Same physical distance per 360° in both games = same muscle memory.
  const converted = valid ? (s * yawOf(from)) / yawOf(to) : 0;
  const cm360 = valid ? (360 / (yawOf(from) * s * d)) * 2.54 : 0;
  const fmt = (n: number, digits: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);
  const convertedText = fmt(converted, 4);

  return (
    <ToolCard title={t.devTools.sensTitle} description={t.devTools.sensDesc}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-sens-from">{t.devTools.sensFrom}</Label>
          <select id="dt-sens-from" className={nativeSelect} value={from} onChange={(e) => setFrom(e.target.value as GameId)}>
            {GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-sens-to">{t.devTools.sensTo}</Label>
          <select id="dt-sens-to" className={nativeSelect} value={to} onChange={(e) => setTo(e.target.value as GameId)}>
            {GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-sens-value">{t.devTools.sensValue}</Label>
          <Input id="dt-sens-value" inputMode="decimal" value={sens} onChange={(e) => setSens(e.target.value)} className={monoField} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-sens-dpi">DPI</Label>
          <Input id="dt-sens-dpi" type="number" min={50} value={dpi} onChange={(e) => setDpi(e.target.value)} className={monoField} />
        </div>
      </div>
      {valid && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-dev)]/40 bg-[var(--color-dev)]/10 p-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">{GAMES.find((g) => g.id === to)!.name}</p>
              <p className="font-mono text-3xl font-bold text-[var(--text)]">{convertedText}</p>
            </div>
            <CopyButton value={convertedText} />
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs text-[var(--text-muted)]">cm/360°</dt>
              <dd className="font-mono text-lg font-bold text-[var(--text)]">{fmt(cm360, 2)}</dd>
            </div>
            <div className="rounded-xl bg-[var(--surface)] px-3 py-2">
              <dt className="text-xs text-[var(--text-muted)]">eDPI ({GAMES.find((g) => g.id === from)!.name.split(" ")[0]})</dt>
              <dd className="font-mono text-lg font-bold text-[var(--text)]">{fmt(s * d, 1)}</dd>
            </div>
          </dl>
          <p className="text-xs text-[var(--text-muted)]">{t.devTools.sensNote}</p>
        </>
      )}
    </ToolCard>
  );
}

const REFRESH_RATES = [30, 60, 75, 120, 144, 165, 240, 360, 500];

function FpsTool() {
  const { t } = useLanguage();
  const [fps, setFps] = useState("144");
  const [ms, setMs] = useState(String(Math.round((1000 / 144) * 1000) / 1000));

  const setFromFps = (v: string) => {
    setFps(v);
    const n = Number(v);
    if (n > 0) setMs(String(Math.round((1000 / n) * 1000) / 1000));
  };
  const setFromMs = (v: string) => {
    setMs(v);
    const n = Number(v.replace(",", "."));
    if (n > 0) setFps(String(Math.round((1000 / n) * 100) / 100));
  };

  return (
    <ToolCard title={t.devTools.fpsTitle} description={t.devTools.fpsDesc}>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-fps">FPS / Hz</Label>
          <Input id="dt-fps" inputMode="decimal" value={fps} onChange={(e) => setFromFps(e.target.value)} className={monoField} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-frametime">{t.devTools.fpsFrameTime} (ms)</Label>
          <Input id="dt-frametime" inputMode="decimal" value={ms} onChange={(e) => setFromMs(e.target.value)} className={monoField} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {REFRESH_RATES.map((hz) => (
          <button
            key={hz}
            type="button"
            onClick={() => setFromFps(String(hz))}
            className={cn(
              "rounded-xl border px-2 py-1.5 text-left transition-colors active:scale-[0.97]",
              Number(fps) === hz ? "border-[var(--color-dev)] bg-[var(--color-dev)]/15" : "border-[var(--border-color)] hover:bg-[var(--surface)]"
            )}
          >
            <span className="block font-mono text-sm font-bold text-[var(--text)]">{hz} Hz</span>
            <span className="block font-mono text-xs text-[var(--text-muted)]">{(1000 / hz).toFixed(2)} ms</span>
          </button>
        ))}
      </div>
    </ToolCard>
  );
}

export function EsportTools() {
  return (
    <>
      <SensitivityTool />
      <FpsTool />
    </>
  );
}
