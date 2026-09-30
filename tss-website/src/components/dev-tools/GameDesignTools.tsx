"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-translation";
import { chanceAtLeastOnce, parseChance, triesFor } from "./progression";
import { ErrorText, ToolCard, monoField } from "./shared";

const clampInt = (v: string, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function DropChanceTool() {
  const { t, locale } = useLanguage();
  const [chanceText, setChanceText] = useState("1/100");
  const [tries, setTries] = useState(100);
  const p = parseChance(chanceText);
  const pct = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 });
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const atLeastOnce = p === null ? 0 : chanceAtLeastOnce(p, tries);

  return (
    <ToolCard title={t.devTools.dropTitle} description={t.devTools.dropDesc}>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-drop-chance">{t.devTools.dropChance}</Label>
          <Input id="dt-drop-chance" value={chanceText} onChange={(e) => setChanceText(e.target.value)} placeholder="1/500, 0.2%" className={monoField} aria-invalid={p === null} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-drop-tries">{t.devTools.dropTries}</Label>
          <Input id="dt-drop-tries" type="number" min={1} max={1000000} value={tries} onChange={(e) => setTries(clampInt(e.target.value, 1, 1000000, 1))} className={monoField} />
        </div>
      </div>
      {p === null ? (
        <ErrorText>{t.devTools.dropInvalid}</ErrorText>
      ) : (
        <>
          <div className="rounded-2xl bg-[var(--surface)] p-4">
            <p className="text-xs text-[var(--text-muted)]">{t.devTools.dropAtLeastOnce}</p>
            <p className="font-mono text-3xl font-bold tabular-nums text-[var(--text)]">{pct.format(atLeastOnce)}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {t.devTools.dropNone}: {pct.format(1 - atLeastOnce)} · {t.devTools.dropExpected}: {nf.format(1 / p)}
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {[0.5, 0.9, 0.99].map((c) => (
                <tr key={c} className="border-b border-[var(--border-color)] last:border-0">
                  <td className="py-1.5 text-[var(--text)]">
                    {t.devTools.dropForConfidence} {pct.format(c)}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums font-bold text-[var(--text)]">{new Intl.NumberFormat(locale).format(triesFor(p, c))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-[var(--text-muted)]">{t.devTools.dropNote}</p>
        </>
      )}
    </ToolCard>
  );
}
