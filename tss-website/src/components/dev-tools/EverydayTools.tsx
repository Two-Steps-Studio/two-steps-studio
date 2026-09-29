"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CopyButton, Segmented, ToolCard, monoField, nativeSelect, useMounted } from "./shared";

const actionButton = "rounded-xl border-[var(--border-color)]";

/* ---------------------------------- Time zones ---------------------------------- */

const DEFAULT_TARGETS = ["Europe/Warsaw", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo"];

function allZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [...DEFAULT_TARGETS, "UTC"];
  }
}

// Wall-clock parts of `instant` as seen in `zone`.
function zoneParts(instant: number, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

function zoneOffsetMs(instant: number, zone: string) {
  const p = zoneParts(instant, zone);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - (instant - (instant % 1000));
}

// "2026-09-29T18:00" in `zone` -> epoch ms. Two passes so a time on the
// far side of a DST switch uses that side's offset, not today's.
function wallClockToInstant(value: string, zone: string) {
  const [date, time] = value.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = guess - zoneOffsetMs(guess, zone);
  return guess - zoneOffsetMs(first, zone);
}

function nowInZone(zone: string) {
  const p = zoneParts(Date.now(), zone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

const zoneLabel = (zone: string) => zone.split("/").pop()!.replace(/_/g, " ");

function TimeZoneTool() {
  const { t, locale } = useLanguage();
  const mounted = useMounted();
  const zones = useMemo(() => (mounted ? allZones() : []), [mounted]);
  const localZone = mounted ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";

  const [source, setSource] = useState<string | null>(null);
  const [value, setValue] = useState<string | null>(null);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [adding, setAdding] = useState("");

  const sourceZone = source ?? localZone;
  const wallClock = value ?? (mounted ? nowInZone(sourceZone) : "");
  const instant = wallClock ? wallClockToInstant(wallClock, sourceZone) : null;

  const addZone = () => {
    if (adding && !targets.includes(adding)) setTargets([...targets, adding]);
    setAdding("");
  };

  return (
    <ToolCard title={t.devTools.tzTitle} description={t.devTools.tzDesc}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-tz-time">{t.devTools.timestampDate}</Label>
          <Input id="dt-tz-time" type="datetime-local" value={wallClock} onChange={(e) => setValue(e.target.value)} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-tz-source">{t.devTools.tzFrom}</Label>
          <select id="dt-tz-source" className={nativeSelect} value={sourceZone} onChange={(e) => setSource(e.target.value)}>
            {(zones.length ? zones : [sourceZone]).map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {instant !== null && !Number.isNaN(instant) && (
        <>
          <ul className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
            {targets.map((zone) => (
              <li key={zone} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">{zoneLabel(zone)}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {new Intl.DateTimeFormat(locale, { timeZone: zone, weekday: "short", day: "numeric", month: "short" }).format(instant)}
                    {" · "}
                    {new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: "shortOffset" }).formatToParts(instant).find((p) => p.type === "timeZoneName")?.value}
                  </p>
                </div>
                <span className={cn(monoField, "text-lg font-bold tabular-nums text-[var(--text)]")}>
                  {new Intl.DateTimeFormat(locale, { timeZone: zone, hour: "2-digit", minute: "2-digit" }).format(instant)}
                </span>
                <Button type="button" variant="ghost" size="icon" aria-label={`${t.devTools.tzRemove} ${zoneLabel(zone)}`} onClick={() => setTargets(targets.filter((z) => z !== zone))}>
                  <X />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label={t.devTools.tzAdd} className={cn(nativeSelect, "flex-1 basis-48")} value={adding} onChange={(e) => setAdding(e.target.value)}>
              <option value="">{t.devTools.tzAdd}…</option>
              {zones.filter((z) => !targets.includes(z)).map((z) => (
                <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" className={actionButton} onClick={addZone} disabled={!adding}>
              <Plus /> {t.devTools.tzAdd}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-dev)]/10 px-4 py-3">
            <p className="text-sm text-[var(--text)]">
              {t.devTools.tzDiscord} <code className={monoField}>{`<t:${Math.floor(instant / 1000)}:F>`}</code>
            </p>
            <CopyButton value={`<t:${Math.floor(instant / 1000)}:F>`} />
          </div>
        </>
      )}
    </ToolCard>
  );
}

/* ------------------------------------- Text ------------------------------------- */

const DISCORD_LIMIT = 2000;
// Built at runtime: \p{…} needs the `u` flag, which TS rejects as a regex
// literal under the ES2017 target even though every supported browser has it.
const WORD = new RegExp("[\\p{L}\\p{N}]+", "gu");

function TextTool() {
  const { t, locale } = useLanguage();
  const [text, setText] = useState("");

  const words = text.match(WORD) ?? [];
  const stats = [
    { label: t.devTools.textChars, value: text.length },
    { label: t.devTools.textNoSpaces, value: text.replace(/\s/g, "").length },
    { label: t.devTools.textWords, value: words.length },
    { label: t.devTools.textLines, value: text ? text.split("\n").length : 0 },
    { label: t.devTools.textReading, value: `${Math.max(words.length ? 1 : 0, Math.round(words.length / 200))} min` },
  ];

  const lower = (s: string) => s.toLocaleLowerCase(locale);
  const upper = (s: string) => s.toLocaleUpperCase(locale);
  const cap = (w: string) => upper(w.charAt(0)) + lower(w.slice(1));
  const transforms: { label: string; fn: (s: string) => string }[] = [
    { label: "UPPER", fn: upper },
    { label: "lower", fn: lower },
    { label: "Title Case", fn: (s) => s.replace(/\S+/g, cap) },
    { label: "Sentence case", fn: (s) => lower(s).replace(/(^\s*|[.!?]\s+)(\S)/g, (_, pre, ch) => pre + upper(ch)) },
    { label: "camelCase", fn: (s) => (s.match(WORD) ?? []).map((w, i) => (i ? cap(w) : lower(w))).join("") },
    { label: "snake_case", fn: (s) => (s.match(WORD) ?? []).map(lower).join("_") },
    { label: "kebab-case", fn: (s) => (s.match(WORD) ?? []).map(lower).join("-") },
    { label: t.devTools.textTrim, fn: (s) => s.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim() },
  ];

  const over = text.length > DISCORD_LIMIT;

  return (
    <ToolCard title={t.devTools.textTitle} description={t.devTools.textDesc}>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} aria-label={t.devTools.input} placeholder={t.devTools.textPlaceholder} />
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-[var(--surface)] px-3 py-2">
            <dt className="text-xs text-[var(--text-muted)]">{s.label}</dt>
            <dd className="font-mono text-lg font-bold tabular-nums text-[var(--text)]">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--text-muted)]">{t.devTools.textDiscordLimit}</span>
          <span className={cn("font-mono tabular-nums", over ? "font-bold text-red-600 dark:text-red-400" : "text-[var(--text-muted)]")}>
            {text.length}/{DISCORD_LIMIT}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface)]">
          <div
            className={cn("h-full rounded-full transition-[width] duration-200", over ? "bg-red-500" : "bg-[var(--color-dev)]")}
            style={{ width: `${Math.min(100, (text.length / DISCORD_LIMIT) * 100)}%` }}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {transforms.map((tr) => (
          <Button key={tr.label} type="button" variant="outline" size="sm" className={actionButton} onClick={() => setText(tr.fn(text))} disabled={!text}>
            {tr.label}
          </Button>
        ))}
        <CopyButton value={text} className="ml-auto" />
      </div>
    </ToolCard>
  );
}

/* ------------------------------------- Units ------------------------------------ */

type UnitDef = { id: string; factor: number };
const LINEAR_UNITS: Record<string, UnitDef[]> = {
  length: [
    { id: "mm", factor: 0.001 }, { id: "cm", factor: 0.01 }, { id: "m", factor: 1 }, { id: "km", factor: 1000 },
    { id: "in", factor: 0.0254 }, { id: "ft", factor: 0.3048 }, { id: "yd", factor: 0.9144 }, { id: "mi", factor: 1609.344 },
  ],
  mass: [
    { id: "g", factor: 0.001 }, { id: "kg", factor: 1 }, { id: "t", factor: 1000 }, { id: "oz", factor: 0.028349523125 }, { id: "lb", factor: 0.45359237 },
  ],
  data: [
    { id: "B", factor: 1 }, { id: "KB", factor: 1e3 }, { id: "MB", factor: 1e6 }, { id: "GB", factor: 1e9 }, { id: "TB", factor: 1e12 },
    { id: "KiB", factor: 1024 }, { id: "MiB", factor: 1024 ** 2 }, { id: "GiB", factor: 1024 ** 3 }, { id: "TiB", factor: 1024 ** 4 },
  ],
  speed: [
    { id: "km/h", factor: 1 / 3.6 }, { id: "m/s", factor: 1 }, { id: "mph", factor: 0.44704 }, { id: "kn", factor: 0.514444 },
  ],
};
const TEMPERATURE = ["°C", "°F", "K"];
const toCelsius: Record<string, (v: number) => number> = { "°C": (v) => v, "°F": (v) => ((v - 32) * 5) / 9, K: (v) => v - 273.15 };
const fromCelsius: Record<string, (v: number) => number> = { "°C": (v) => v, "°F": (v) => (v * 9) / 5 + 32, K: (v) => v + 273.15 };

type Category = "length" | "mass" | "temperature" | "data" | "speed";
const unitsOf = (c: Category) => (c === "temperature" ? TEMPERATURE : LINEAR_UNITS[c].map((u) => u.id));

function convert(category: Category, value: number, from: string, to: string) {
  if (category === "temperature") return fromCelsius[to](toCelsius[from](value));
  const f = (id: string) => LINEAR_UNITS[category].find((u) => u.id === id)!.factor;
  return (value * f(from)) / f(to);
}

function UnitTool() {
  const { t, locale } = useLanguage();
  const [category, setCategory] = useState<Category>("length");
  const [from, setFrom] = useState("cm");
  const [to, setTo] = useState("in");
  const [value, setValue] = useState("100");

  const categories: { value: Category; label: string }[] = [
    { value: "length", label: t.devTools.unitLength },
    { value: "mass", label: t.devTools.unitMass },
    { value: "temperature", label: t.devTools.unitTemperature },
    { value: "data", label: t.devTools.unitData },
    { value: "speed", label: t.devTools.unitSpeed },
  ];

  const changeCategory = (c: Category) => {
    const units = unitsOf(c);
    setCategory(c);
    setFrom(units[0]);
    setTo(units[1]);
  };

  const num = Number(value.replace(",", "."));
  const result = value.trim() !== "" && Number.isFinite(num) ? convert(category, num, from, to) : null;
  const formatted = result === null ? "" : new Intl.NumberFormat(locale, { maximumFractionDigits: 6 }).format(result);
  const units = unitsOf(category);

  return (
    <ToolCard title={t.devTools.unitTitle} description={t.devTools.unitDesc}>
      <Segmented options={categories} value={category} onChange={changeCategory} label={t.devTools.unitTitle} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-unit-value">{t.devTools.input}</Label>
          <Input id="dt-unit-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={monoField} />
          <select aria-label={t.devTools.unitFrom} className={nativeSelect} value={from} onChange={(e) => setFrom(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <Button type="button" variant="outline" size="icon" className={cn(actionButton, "mb-0.5")} aria-label={t.devTools.unitSwap} onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowLeftRight />
        </Button>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-unit-result">{t.devTools.output}</Label>
          <Input id="dt-unit-result" readOnly value={formatted} className={cn(monoField, "font-bold")} />
          <select aria-label={t.devTools.unitTo} className={nativeSelect} value={to} onChange={(e) => setTo(e.target.value)}>
            {units.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      {formatted && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] px-4 py-3">
          <p className={cn(monoField, "min-w-0 truncate text-[var(--text)]")}>{value} {from} = {formatted} {to}</p>
          <CopyButton value={`${formatted} ${to}`} />
        </div>
      )}
    </ToolCard>
  );
}

export function EverydayTools() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TimeZoneTool />
      <TextTool />
      <UnitTool />
    </div>
  );
}
