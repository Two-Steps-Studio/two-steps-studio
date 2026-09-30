"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { convertCase, diffLines, findMatches, parseInteger, toBase, type Base } from "./text-math";
import { CopyButton, ErrorText, Segmented, ToolCard, monoField } from "./shared";

// Inputs are capped: regex runs on the main thread (a worker would need a
// blob: worker-src the CSP doesn't allow), and the diff is O(n*m).
const MAX_REGEX_TEXT = 20000;
const MAX_DIFF_LINES = 2000;

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2">
      <span className="w-24 shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
      <code className="min-w-0 flex-1 break-all font-mono text-sm text-[var(--text)]">{value || "—"}</code>
      <CopyButton value={value} />
    </li>
  );
}

/* ---------------------------------- Regex ----------------------------------- */

const FLAGS = ["g", "i", "m", "s", "u"] as const;

export function RegexTool() {
  const { t } = useLanguage();
  const [pattern, setPattern] = useState("(\\w+)@(\\w+)\\.pl");
  const [flags, setFlags] = useState<string[]>(["g", "i"]);
  const [text, setText] = useState("kontakt@twostepsstudio.pl, dev@tss.pl");
  const tooLong = text.length > MAX_REGEX_TEXT;
  const result = useMemo(() => (tooLong || !pattern ? null : findMatches(pattern, flags.join(""), text)), [pattern, flags, text, tooLong]);

  // Highlighted copy of the text; zero-length matches have nothing to mark.
  const highlighted: ReactNode[] = [];
  if (result && "matches" in result) {
    let pos = 0;
    result.matches.forEach((m, i) => {
      if (!m.text) return;
      if (m.index > pos) highlighted.push(text.slice(pos, m.index));
      highlighted.push(
        <mark key={i} className="rounded bg-[var(--color-dev)]/40 text-[var(--text)]">
          {m.text}
        </mark>
      );
      pos = m.index + m.text.length;
    });
    highlighted.push(text.slice(pos));
  }

  return (
    <ToolCard title={t.devTools.regexTitle} description={t.devTools.regexDesc}>
      <div className="space-y-2">
        <Label htmlFor="dt-regex-pattern">{t.devTools.regexPattern}</Label>
        <div className="flex items-center gap-1 rounded-md border border-[var(--border-color)] px-2 font-mono text-sm">
          <span className="text-[var(--text-muted)]">/</span>
          <input id="dt-regex-pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} className="h-9 min-w-0 flex-1 bg-transparent text-[var(--text)] outline-none" />
          <span className="text-[var(--text-muted)]">/{flags.join("")}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.devTools.regexFlags}>
        {FLAGS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={flags.includes(f)}
            onClick={() => setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]))}
            className={cn(
              "size-9 rounded-xl border border-[var(--border-color)] font-mono text-sm text-[var(--text)]",
              flags.includes(f) && "border-[var(--color-dev)] bg-[var(--color-dev)]/15"
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="dt-regex-text">{t.devTools.regexText}</Label>
        <Textarea id="dt-regex-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} className={monoField} />
      </div>
      {tooLong && <ErrorText>{t.devTools.tooLong}</ErrorText>}
      {result && "error" in result && <ErrorText>{result.error}</ErrorText>}
      {result && "matches" in result && (
        <>
          <p className="text-sm text-[var(--text)]">
            {t.devTools.regexMatches}: <b>{result.matches.length}</b>
            {result.truncated && "+"}
          </p>
          <p className="max-h-40 overflow-auto rounded-xl bg-[var(--surface)] p-3 font-mono text-sm break-words whitespace-pre-wrap text-[var(--text)]">{highlighted}</p>
          {result.matches.some((m) => m.groups.length > 0) && (
            <ol className="max-h-48 space-y-1 overflow-auto text-xs">
              {result.matches.slice(0, 50).map((m, i) => (
                <li key={i} className="font-mono text-[var(--text-muted)]">
                  <span className="text-[var(--text)]">#{i + 1}</span> @{m.index}:{" "}
                  {m.groups.map((g, j) => (
                    <span key={j} className="mr-2">
                      ${j + 1}=<span className="text-[var(--text)]">{g ?? "∅"}</span>
                    </span>
                  ))}
                  {Object.entries(m.named).map(([k, v]) => (
                    <span key={k} className="mr-2">
                      {k}=<span className="text-[var(--text)]">{v ?? "∅"}</span>
                    </span>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </ToolCard>
  );
}

/* ----------------------------------- Diff ----------------------------------- */

export function DiffTool() {
  const { t } = useLanguage();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [ignoreWs, setIgnoreWs] = useState(false);
  const tooLong = left.split("\n").length > MAX_DIFF_LINES || right.split("\n").length > MAX_DIFF_LINES;
  const diff = useMemo(() => (tooLong || (!left && !right) ? [] : diffLines(left, right, ignoreWs)), [left, right, ignoreWs, tooLong]);
  const added = diff.filter((d) => d.type === "added").length;
  const removed = diff.filter((d) => d.type === "removed").length;

  return (
    <ToolCard title={t.devTools.diffTitle} description={t.devTools.diffDesc} className="lg:col-span-2">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-diff-left">{t.devTools.diffOriginal}</Label>
          <Textarea id="dt-diff-left" rows={6} value={left} onChange={(e) => setLeft(e.target.value)} spellCheck={false} className={monoField} />
        </div>
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-diff-right">{t.devTools.diffChanged}</Label>
          <Textarea id="dt-diff-right" rows={6} value={right} onChange={(e) => setRight(e.target.value)} spellCheck={false} className={monoField} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch id="dt-diff-ws" checked={ignoreWs} onCheckedChange={setIgnoreWs} />
          <Label htmlFor="dt-diff-ws" className="font-normal">
            {t.devTools.diffIgnoreWs}
          </Label>
        </div>
        {diff.length > 0 && (
          <p className="font-mono text-sm">
            <span className="text-emerald-700 dark:text-emerald-400">+{added}</span> <span className="text-red-600 dark:text-red-400">−{removed}</span>
          </p>
        )}
      </div>
      {tooLong && <ErrorText>{t.devTools.tooLong}</ErrorText>}
      {diff.length > 0 &&
        (added === 0 && removed === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{t.devTools.diffSame}</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-xl border border-[var(--border-color)] font-mono text-xs">
            {diff.map((d, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2 px-3 py-0.5 whitespace-pre-wrap break-all",
                  d.type === "added" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
                  d.type === "removed" && "bg-red-500/15 text-red-800 dark:text-red-300",
                  d.type === "same" && "text-[var(--text-muted)]"
                )}
              >
                <span aria-hidden className="w-3 shrink-0 select-none">
                  {d.type === "added" ? "+" : d.type === "removed" ? "−" : " "}
                </span>
                <span className="sr-only">{d.type === "added" ? t.devTools.diffAdded : d.type === "removed" ? t.devTools.diffRemoved : ""}</span>
                <span className="min-w-0">{d.text || " "}</span>
              </div>
            ))}
          </div>
        ))}
    </ToolCard>
  );
}

/* ------------------------------- Number base -------------------------------- */

export function NumberBaseTool() {
  const { t } = useLanguage();
  const [value, setValue] = useState("255");
  const [base, setBase] = useState<`${Base}`>("10");
  const n = value.trim() ? parseInteger(value, Number(base) as Base) : null;
  const bin = n === null ? "" : toBase(n, 2);

  return (
    <ToolCard title={t.devTools.baseTitle} description={t.devTools.baseDesc}>
      <div className="space-y-2">
        <Label htmlFor="dt-base-input">{t.devTools.baseInput}</Label>
        <Input id="dt-base-input" value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} className={monoField} aria-invalid={value.trim() !== "" && n === null} />
      </div>
      <Segmented
        options={[
          { value: "10", label: "DEC" },
          { value: "16", label: "HEX" },
          { value: "2", label: "BIN" },
          { value: "8", label: "OCT" },
        ]}
        value={base}
        onChange={setBase}
        label={t.devTools.baseFrom}
      />
      {value.trim() !== "" && n === null && <ErrorText>{t.devTools.invalid}</ErrorText>}
      {n !== null && (
        <>
          <ul className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
            <ResultRow label="DEC" value={n.toString()} />
            <ResultRow label="HEX" value={`0x${toBase(n, 16)}`} />
            <ResultRow label="BIN" value={`0b${bin}`} />
            <ResultRow label="OCT" value={`0o${toBase(n, 8)}`} />
          </ul>
          <p className="text-xs text-[var(--text-muted)]">
            {t.devTools.baseBits}: {bin === "0" ? 0 : bin.length} · {t.devTools.baseSetBits}: {[...bin].filter((c) => c === "1").length}
          </p>
        </>
      )}
    </ToolCard>
  );
}

/* ----------------------------------- Case ----------------------------------- */

export function CaseTool() {
  const { t } = useLanguage();
  const [input, setInput] = useState("player health points");
  const out = convertCase(input);
  const rows: [string, string][] = [
    ["camelCase", out.camel],
    ["PascalCase", out.pascal],
    ["snake_case", out.snake],
    ["CONSTANT", out.constant],
    ["kebab-case", out.kebab],
    ["Title Case", out.title],
    ["lower", out.lower],
    ["UPPER", out.upper],
  ];

  return (
    <ToolCard title={t.devTools.caseTitle} description={t.devTools.caseDesc}>
      <div className="space-y-2">
        <Label htmlFor="dt-case-input">{t.devTools.caseInput}</Label>
        <Input id="dt-case-input" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
      </div>
      <ul className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)]">
        {rows.map(([label, value]) => (
          <ResultRow key={label} label={label} value={input.trim() ? value : ""} />
        ))}
      </ul>
    </ToolCard>
  );
}
