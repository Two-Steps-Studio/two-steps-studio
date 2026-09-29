"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";
import { TextTool, TimeZoneTool } from "./CommunityTools";
import { CopyButton, ErrorText, ToolCard, monoField, useMounted } from "./shared";

// Discord's own epoch (2015-01-01T00:00:00Z) - snowflake IDs store
// milliseconds since this, not since 1970. BigInt() calls rather than
// 22n-style literals because tsconfig targets ES2017.
const DISCORD_EPOCH = BigInt(1420070400000);

// The same seven styles Discord accepts in <t:unix:style>, previewed with
// Intl in the viewer's language - Discord itself renders them per reader.
const FORMATS: { style: string; opts: Intl.DateTimeFormatOptions | null }[] = [
  { style: "t", opts: { hour: "2-digit", minute: "2-digit" } },
  { style: "T", opts: { hour: "2-digit", minute: "2-digit", second: "2-digit" } },
  { style: "d", opts: { day: "2-digit", month: "2-digit", year: "numeric" } },
  { style: "D", opts: { day: "numeric", month: "long", year: "numeric" } },
  { style: "f", opts: { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" } },
  { style: "F", opts: { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" } },
  { style: "R", opts: null },
];

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000],
  ["month", 2592000],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

function formatRelative(date: Date, locale: string) {
  const diff = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const [unit, seconds] = RELATIVE_UNITS.find(([, s]) => Math.abs(diff) >= s) ?? ["second", 1];
  return rtf.format(Math.round(diff / seconds), unit);
}

// <input type="datetime-local"> takes local wall-clock time with no zone.
function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function TimestampTool() {
  const { t, locale } = useLanguage();
  const mounted = useMounted();
  const [value, setValue] = useState<string | null>(null);

  // Until the user picks something, follow "now" - computed only after
  // mount so the server-rendered HTML doesn't carry the server's clock and
  // timezone into the hydration pass.
  const inputValue = value ?? (mounted ? toLocalInputValue(new Date()) : "");
  const date = inputValue ? new Date(inputValue) : null;
  const unix = date && !Number.isNaN(date.getTime()) ? Math.floor(date.getTime() / 1000) : null;

  return (
    <ToolCard title={t.devTools.timestampTitle} description={t.devTools.timestampDesc}>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="dt-timestamp">{t.devTools.timestampDate}</Label>
          <Input id="dt-timestamp" type="datetime-local" value={inputValue} onChange={(e) => setValue(e.target.value)} />
        </div>
        <Button type="button" variant="outline" className="rounded-xl border-[var(--border-color)]" onClick={() => setValue(null)}>
          {t.devTools.timestampNow}
        </Button>
      </div>

      {date && unix !== null && (
        <ul className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
          {FORMATS.map(({ style, opts }) => {
            const code = `<t:${unix}:${style}>`;
            const preview = opts ? new Intl.DateTimeFormat(locale, opts).format(date) : formatRelative(date, locale);
            return (
              <li key={style} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-4">
                  <code className="block w-fit max-w-full break-all rounded-md bg-[var(--color-dev)]/15 px-1.5 py-0.5 font-mono text-xs text-[var(--text)] sm:w-44 sm:shrink-0 sm:text-sm">
                    {code}
                  </code>
                  <span className="mt-1 block truncate text-sm text-[var(--text)] sm:mt-0">{preview}</span>
                </div>
                <CopyButton value={code} />
              </li>
            );
          })}
        </ul>
      )}
    </ToolCard>
  );
}

type SnowflakeResult =
  | { valid: false }
  | { valid: true; date: Date; ms: number; worker: number; process: number; increment: number };

function decodeSnowflake(raw: string): SnowflakeResult | null {
  const id = raw.trim();
  if (!id) return null;
  if (!/^\d{17,20}$/.test(id)) return { valid: false };
  const n = BigInt(id);
  const ms = Number((n >> BigInt(22)) + DISCORD_EPOCH);
  return {
    valid: true,
    ms,
    date: new Date(ms),
    worker: Number((n & BigInt(0x3e0000)) >> BigInt(17)),
    process: Number((n & BigInt(0x1f000)) >> BigInt(12)),
    increment: Number(n & BigInt(0xfff)),
  };
}

function SnowflakeTool() {
  const { t, locale } = useLanguage();
  const [id, setId] = useState("");
  const result = useMemo(() => decodeSnowflake(id), [id]);

  return (
    <ToolCard title={t.devTools.snowflakeTitle} description={t.devTools.snowflakeDesc}>
      <div className="space-y-2">
        <Label htmlFor="dt-snowflake">ID</Label>
        <Input
          id="dt-snowflake"
          inputMode="numeric"
          autoComplete="off"
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder={t.devTools.snowflakePlaceholder}
          className={monoField}
        />
      </div>

      {result && !result.valid && <ErrorText>{t.devTools.snowflakeInvalid}</ErrorText>}

      {result?.valid && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl border border-[var(--border-color)] p-4 text-sm">
          <dt className="text-[var(--text-muted)]">{t.devTools.snowflakeCreated}</dt>
          <dd className="text-[var(--text)]">
            {new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "medium" }).format(result.date)}
            <span className="text-[var(--text-muted)]"> · {formatRelative(result.date, locale)}</span>
          </dd>
          <dt className="text-[var(--text-muted)]">Unix</dt>
          <dd className={`${monoField} text-[var(--text)]`}>{Math.floor(result.ms / 1000)}</dd>
          <dt className="text-[var(--text-muted)]">{t.devTools.snowflakeWorker}</dt>
          <dd className={`${monoField} text-[var(--text)]`}>{result.worker}</dd>
          <dt className="text-[var(--text-muted)]">{t.devTools.snowflakeProcess}</dt>
          <dd className={`${monoField} text-[var(--text)]`}>{result.process}</dd>
          <dt className="text-[var(--text-muted)]">{t.devTools.snowflakeIncrement}</dt>
          <dd className={`${monoField} text-[var(--text)]`}>{result.increment}</dd>
        </dl>
      )}
    </ToolCard>
  );
}

export function DiscordTools() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TimestampTool />
      <SnowflakeTool />
      <TimeZoneTool />
      <TextTool />
    </div>
  );
}
