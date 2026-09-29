"use client";

import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { PLATFORM_TARGETS, type LoudnessResult } from "./loudness";

const fmt = (v: number, digits = 1) => (Number.isFinite(v) ? v.toFixed(digits).replace("-", "−") : "−∞");
const signed = (v: number) => `${v > 0 ? "+" : ""}${fmt(v)}`;

function Stat({ label, value, unit, warn }: { label: string; value: string; unit: string; warn?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-[var(--text-muted)]">{label}</p>
      <p className={cn("font-mono text-lg font-bold tabular-nums text-[var(--text)]", warn && "text-red-600 dark:text-red-400")}>
        {value} <span className="text-xs font-normal text-[var(--text-muted)]">{unit}</span>
      </p>
    </div>
  );
}

export function LoudnessCard({ result }: { result: LoudnessResult }) {
  const { t } = useLanguage();
  const silent = !Number.isFinite(result.integrated);
  const hotPeak = result.truePeak > -1;

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
      <p className="text-xs text-[var(--text-muted)]">{t.devTools.loudnessTitle}</p>
      {silent ? (
        <p className="text-sm text-[var(--text-muted)]">{t.devTools.loudnessSilent}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-[auto_1fr] md:gap-8">
          <div className="space-y-3">
            <div>
              <p className="font-mono text-4xl font-bold tabular-nums text-[var(--text)]">
                {fmt(result.integrated)} <span className="text-base font-normal text-[var(--text-muted)]">LUFS</span>
              </p>
              <p className="text-xs text-[var(--text-muted)]">{t.devTools.loudnessIntegrated}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <Stat label={t.devTools.loudnessTruePeak} value={fmt(result.truePeak)} unit="dBTP" warn={hotPeak} />
              <Stat label={t.devTools.loudnessRange} value={fmt(result.range)} unit="LU" />
              <Stat label={t.devTools.loudnessShortTerm} value={fmt(result.maxShortTerm)} unit="LUFS" />
              <Stat label="Sample peak" value={fmt(result.samplePeak)} unit="dBFS" />
            </div>
            {hotPeak && (
              <p className="flex gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="size-4 shrink-0" aria-hidden /> {t.devTools.loudnessPeakWarn}
              </p>
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs text-[var(--text-muted)]">{t.devTools.loudnessPlatforms}</p>
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr>
                  <th>{t.devTools.loudnessPlatforms}</th>
                  <th>{t.devTools.loudnessTarget}</th>
                  <th>{t.devTools.loudnessChange}</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORM_TARGETS.map((p) => {
                  const change = p.lufs - result.integrated;
                  return (
                    <tr key={p.name} className="border-b border-[var(--border-color)] last:border-0">
                      <td className="py-1.5 text-[var(--text)]">{p.name}</td>
                      <td className="py-1.5 text-right font-mono text-xs text-[var(--text-muted)] tabular-nums">{fmt(p.lufs, 0)} LUFS</td>
                      <td
                        className={cn(
                          "py-1.5 text-right font-mono font-bold tabular-nums",
                          Math.abs(change) < 1 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text)]"
                        )}
                      >
                        {signed(change)} dB
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-[var(--text-muted)]">{t.devTools.loudnessNote}</p>
    </div>
  );
}
