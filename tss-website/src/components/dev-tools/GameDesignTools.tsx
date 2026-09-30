"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-translation";
import { TSS_BOT, chanceAtLeastOnce, levelFromXp, parseChance, totalXp, triesFor, tssEffort, type Curve } from "./progression";
import { ErrorText, Segmented, ToolCard, monoField } from "./shared";

const clampInt = (v: string, min: number, max: number, fallback: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export function XpCurveTool() {
  const { t, locale } = useLanguage();
  const [curve, setCurve] = useState<Curve>("tss");
  const [base, setBase] = useState(100);
  const [growth, setGrowth] = useState(1.15);
  const [target, setTarget] = useState(10);
  const [currentXp, setCurrentXp] = useState("");
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const params = { base, growth };
  const isTss = curve === "tss";

  const need = totalXp(curve, target, params);
  const nextStep = totalXp(curve, target + 1, params) - need;
  const effort = tssEffort(need);
  const xpNow = currentXp.trim() === "" ? null : Math.max(0, Number(currentXp) || 0);
  const levelNow = xpNow === null ? null : levelFromXp(curve, xpNow, params);
  const progress =
    levelNow === null || xpNow === null
      ? 0
      : (xpNow - totalXp(curve, levelNow, params)) / (totalXp(curve, levelNow + 1, params) - totalXp(curve, levelNow, params));

  // Chart: total XP per level up to max(10, target); fixed-size SVG scaled
  // by viewBox, so it's resolution independent.
  const maxLevel = Math.max(10, target);
  const points = Array.from({ length: maxLevel + 1 }, (_, l) => [l, totalXp(curve, l, params)] as const);
  const maxXp = points[points.length - 1][1] || 1;
  const path = points.map(([l, xp], i) => `${i ? "L" : "M"}${((l / maxLevel) * 300).toFixed(1)},${(100 - (xp / maxXp) * 100).toFixed(1)}`).join(" ");
  const tx = (target / maxLevel) * 300;
  const ty = 100 - (need / maxXp) * 100;

  const rows = Array.from(new Set([1, 2, 5, 10, 20, 30, 50, 75, 100, target].filter((l) => l <= Math.max(target, isTss ? TSS_BOT.maxLevel : target)))).sort((a, b) => a - b);

  return (
    <ToolCard title={t.devTools.xpTitle} description={t.devTools.xpDesc}>
      <Segmented
        options={[
          { value: "tss", label: t.devTools.xpCurveTss },
          { value: "linear", label: t.devTools.xpCurveLinear },
          { value: "quadratic", label: t.devTools.xpCurveQuadratic },
          { value: "exponential", label: t.devTools.xpCurveExponential },
        ]}
        value={curve}
        onChange={setCurve}
        label={t.devTools.xpTitle}
      />
      {isTss ? (
        <p className="text-xs text-[var(--text-muted)]">{t.devTools.xpTssNote}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="dt-xp-base">{t.devTools.xpBase}</Label>
            <Input id="dt-xp-base" type="number" min={1} value={base} onChange={(e) => setBase(Math.max(1, Number(e.target.value) || 1))} className={monoField} />
          </div>
          {curve === "exponential" && (
            <div className="min-w-0 space-y-2">
              <Label htmlFor="dt-xp-growth">{t.devTools.xpGrowth}</Label>
              <Input id="dt-xp-growth" type="number" min={1} max={3} step={0.01} value={growth} onChange={(e) => setGrowth(Math.min(3, Math.max(1, Number(e.target.value) || 1)))} className={monoField} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-xp-target">{t.devTools.xpTarget}</Label>
          <Input id="dt-xp-target" type="number" min={1} max={500} value={target} onChange={(e) => setTarget(clampInt(e.target.value, 1, 500, 10))} className={monoField} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-xp-now">{t.devTools.xpCurrent}</Label>
          <Input id="dt-xp-now" type="number" min={0} placeholder="0" value={currentXp} onChange={(e) => setCurrentXp(e.target.value)} className={monoField} />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl bg-[var(--surface)] p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-[var(--text-muted)]">
            {t.devTools.xpNeeded} {target}
          </p>
          <p className="font-mono text-2xl font-bold tabular-nums text-[var(--text)]">{nf.format(need)} XP</p>
          <p className="text-xs text-[var(--text-muted)]">
            {t.devTools.xpNextStep}: {nf.format(nextStep)} XP
          </p>
        </div>
        {isTss && (
          <div className="text-sm text-[var(--text)]">
            <p>
              ≈ <b className="font-mono tabular-nums">{nf.format(effort.messages)}</b> {t.devTools.xpMessages}
            </p>
            <p>
              {t.devTools.xpOr} ≈ <b className="font-mono tabular-nums">{nf.format(Math.ceil(effort.voiceMinutes / 60))}</b> {t.devTools.xpVoiceHours}
            </p>
          </div>
        )}
        {levelNow !== null && (
          <div className="sm:col-span-2">
            <p className="text-sm text-[var(--text)]">
              {t.devTools.xpYourLevel}: <b className="font-mono">{levelNow}</b> · {Math.floor(progress * 100)}% → {levelNow + 1}
            </p>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--text)]/10">
              <div className="h-full rounded-full bg-[var(--color-dev)]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <svg viewBox="-4 -4 308 108" className="h-32 w-full" role="img" aria-label={t.devTools.xpTitle}>
        <path d={path} fill="none" className="stroke-[var(--text)]" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <circle cx={tx} cy={ty} r={3.5} className="fill-[var(--color-dev)]" />
      </svg>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--text-muted)]">
            <th className="py-1 font-normal">{t.devTools.xpLevel}</th>
            <th className="py-1 text-right font-normal">XP</th>
            {isTss && <th className="py-1 text-right font-normal">{t.devTools.xpVoiceHours}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l} className="border-t border-[var(--border-color)]">
              <td className="py-1.5 font-mono text-[var(--text)]">{l}</td>
              <td className="py-1.5 text-right font-mono tabular-nums text-[var(--text)]">{nf.format(totalXp(curve, l, params))}</td>
              {isTss && <td className="py-1.5 text-right font-mono tabular-nums text-[var(--text-muted)]">{nf.format(Math.ceil(tssEffort(totalXp(curve, l, params)).voiceMinutes / 60))}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </ToolCard>
  );
}

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
