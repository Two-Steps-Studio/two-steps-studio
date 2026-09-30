"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { CopyButton, ToolCard, monoField } from "./shared";
import { randomInt } from "./random";

const actionButton = "rounded-xl border-[var(--border-color)]";

export function UuidTool() {
  const { t } = useLanguage();
  const [count, setCount] = useState(5);
  // Starts empty rather than pre-filled: random values generated during
  // SSR would never match the ones generated during hydration.
  const [uuids, setUuids] = useState<string[]>([]);
  const generate = () => setUuids(Array.from({ length: count }, () => crypto.randomUUID()));

  return (
    <ToolCard title={t.devTools.uuidTitle} description={t.devTools.uuidDesc}>
      <div className="space-y-2">
        <Label>{t.devTools.uuidCount}: {count}</Label>
        <Slider value={[count]} onValueChange={([v]) => setCount(v)} min={1} max={50} step={1} aria-label={t.devTools.uuidCount} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={actionButton} onClick={generate}>
          <RefreshCw /> {t.devTools.generate}
        </Button>
        {uuids.length > 0 && <CopyButton value={uuids.join("\n")} />}
      </div>
      {uuids.length > 0 && <Textarea readOnly value={uuids.join("\n")} rows={Math.min(uuids.length, 8)} className={monoField} aria-label={t.devTools.output} />}
    </ToolCard>
  );
}

const CHARSETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?/~",
} as const;
type Charset = keyof typeof CHARSETS;

function randomString(length: number, pool: string) {
  return Array.from({ length }, () => pool[randomInt(pool.length)]).join("");
}

function generatePassword(length: number, sets: Charset[]) {
  const pool = sets.map((s) => CHARSETS[s]).join("");
  // Regenerate (rarely more than once) until every selected set shows up,
  // since people reasonably expect "digits on" to mean at least one digit.
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = randomString(length, pool);
    if (sets.every((s) => [...CHARSETS[s]].some((c) => candidate.includes(c)))) return candidate;
  }
  return randomString(length, pool);
}

export function PasswordTool() {
  const { t } = useLanguage();
  const [length, setLength] = useState(20);
  const [sets, setSets] = useState<Charset[]>(["upper", "lower", "digits", "symbols"]);
  const [password, setPassword] = useState("");

  const poolSize = sets.reduce((sum, s) => sum + CHARSETS[s].length, 0);
  const entropy = Math.round(length * Math.log2(poolSize));
  const labels: Record<Charset, string> = {
    upper: t.devTools.passwordUpper,
    lower: t.devTools.passwordLower,
    digits: t.devTools.passwordDigits,
    symbols: t.devTools.passwordSymbols,
  };

  const toggle = (set: Charset, checked: boolean) => {
    const next = checked ? [...sets, set] : sets.filter((s) => s !== set);
    if (next.length > 0) setSets(next);
  };

  return (
    <ToolCard title={t.devTools.passwordTitle} description={t.devTools.passwordDesc}>
      <div className="space-y-2">
        <Label>{t.devTools.passwordLength}: {length}</Label>
        <Slider value={[length]} onValueChange={([v]) => setLength(v)} min={8} max={64} step={1} aria-label={t.devTools.passwordLength} />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {(Object.keys(CHARSETS) as Charset[]).map((set) => (
          <div key={set} className="flex items-center gap-2">
            <Checkbox id={`dt-pw-${set}`} checked={sets.includes(set)} onCheckedChange={(c) => toggle(set, c === true)} />
            <Label htmlFor={`dt-pw-${set}`} className={monoField}>{labels[set]}</Label>
          </div>
        ))}
      </div>
      <p className="text-sm text-[var(--text-muted)]">
        {t.devTools.passwordEntropy}: <span className={cn(monoField, "text-[var(--text)]")}>~{entropy} bit</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={actionButton} onClick={() => setPassword(generatePassword(length, sets))}>
          <RefreshCw /> {t.devTools.generate}
        </Button>
      </div>
      {password && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] p-3">
          <code className={cn(monoField, "min-w-0 flex-1 break-all text-[var(--text)]")}>{password}</code>
          <CopyButton value={password} />
        </div>
      )}
    </ToolCard>
  );
}

const LOREM = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
  "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.",
];

export function LoremTool() {
  const { t } = useLanguage();
  const [paragraphs, setParagraphs] = useState(3);
  const text = Array.from({ length: paragraphs }, (_, i) => LOREM[i % LOREM.length]).join("\n\n");

  return (
    <ToolCard title={t.devTools.loremTitle} description={t.devTools.loremDesc}>
      <div className="space-y-2">
        <Label>{t.devTools.loremParagraphs}: {paragraphs}</Label>
        <Slider value={[paragraphs]} onValueChange={([v]) => setParagraphs(v)} min={1} max={10} step={1} aria-label={t.devTools.loremParagraphs} />
      </div>
      <div className="flex justify-end">
        <CopyButton value={text} />
      </div>
      <Textarea readOnly value={text} rows={8} aria-label={t.devTools.output} />
    </ToolCard>
  );
}
