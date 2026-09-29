"use client";

import { useState, type ReactNode } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { BRAND_SWATCHES, parseColor, toHex } from "./color";
import { EMPTY_EMBED, LIMITS, embedLength, toDiscordJs, toPayload, validate, type EmbedDraft, type Problem } from "./discord-embed";
import { EmbedPreview } from "./EmbedPreview";
import { CopyButton, ErrorText, Segmented, ToolCard, monoField, useMounted } from "./shared";

type Output = "json" | "discordjs";

function Field({ id, label, count, limit, children }: { id: string; label: string; count?: number; limit?: number; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {limit !== undefined && count !== undefined && count > 0 && (
          <span className={cn("font-mono text-xs tabular-nums", count > limit ? "text-red-600 dark:text-red-400" : "text-[var(--text-muted)]")}>
            {count}/{limit}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function DiscordEmbedTool() {
  const { t, locale } = useLanguage();
  const mounted = useMounted();
  const [draft, setDraft] = useState<EmbedDraft>(() => ({ ...EMPTY_EMBED, title: "Two Steps Studio", description: t.devTools.embedSample }));
  const [colorText, setColorText] = useState(EMPTY_EMBED.color);
  const [output, setOutput] = useState<Output>("json");
  const set = <K extends keyof EmbedDraft>(key: K, value: EmbedDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setField = (index: number, patch: Partial<EmbedDraft["fields"][number]>) =>
    setDraft((d) => ({ ...d, fields: d.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)) }));

  const setColor = (text: string) => {
    setColorText(text);
    const rgb = parseColor(text);
    if (rgb) set("color", toHex(rgb));
  };

  const problems = validate(draft);
  const label: Record<string, string> = {
    content: t.devTools.embedContent,
    title: t.devTools.embedTitleField,
    description: t.devTools.embedDescription,
    footer: t.devTools.embedFooter,
    authorName: t.devTools.embedAuthor,
    url: t.devTools.embedUrl,
    authorIcon: t.devTools.embedAuthorIcon,
    image: t.devTools.embedImage,
    thumbnail: t.devTools.embedThumbnail,
    footerIcon: t.devTools.embedFooterIcon,
    fieldName: t.devTools.embedFieldName,
    fieldValue: t.devTools.embedFieldValue,
    embed: "Embed",
  };
  const describe = (p: Problem) => {
    if (p.key === "empty") return t.devTools.embedEmpty;
    if (p.key === "fieldEmpty") return `${t.devTools.embedFieldEmpty} #${p.index + 1}`;
    if (p.key === "badUrl") return `${t.devTools.embedBadUrl}: ${label[p.what]}`;
    return `${t.devTools.embedTooLong}: ${p.index !== undefined ? `#${p.index + 1} ` : ""}${label[p.what]} (max ${p.limit})`;
  };

  // "Now" only after mount - the server's clock/zone must not end up in the
  // hydrated HTML.
  const nowLabel = mounted ? new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(new Date()) : "";
  const code = output === "json" ? JSON.stringify(toPayload(draft), null, 2) : toDiscordJs(draft);
  const urlInput = (key: "url" | "authorIcon" | "image" | "thumbnail" | "footerIcon") => (
    <Input id={`dt-embed-${key}`} type="url" inputMode="url" placeholder="https://" value={draft[key]} onChange={(e) => set(key, e.target.value)} className={monoField} />
  );

  return (
    <ToolCard title={t.devTools.embedTitle} description={t.devTools.embedDesc} className="lg:col-span-2">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <Field id="dt-embed-content" label={t.devTools.embedContent} count={draft.content.length} limit={LIMITS.content}>
            <Textarea id="dt-embed-content" rows={2} value={draft.content} onChange={(e) => set("content", e.target.value)} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="dt-embed-authorName" label={t.devTools.embedAuthor} count={draft.authorName.length} limit={LIMITS.author}>
              <Input id="dt-embed-authorName" value={draft.authorName} onChange={(e) => set("authorName", e.target.value)} />
            </Field>
            <Field id="dt-embed-authorIcon" label={t.devTools.embedAuthorIcon}>
              {urlInput("authorIcon")}
            </Field>
            <Field id="dt-embed-title" label={t.devTools.embedTitleField} count={draft.title.length} limit={LIMITS.title}>
              <Input id="dt-embed-title" value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field id="dt-embed-url" label={t.devTools.embedUrl}>
              {urlInput("url")}
            </Field>
          </div>

          <Field id="dt-embed-description" label={t.devTools.embedDescription} count={draft.description.length} limit={LIMITS.description}>
            <Textarea id="dt-embed-description" rows={4} value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </Field>

          <div className="space-y-1.5">
            <Label htmlFor="dt-embed-color">{t.devTools.embedColor}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {BRAND_SWATCHES.slice(0, 5).map((s) => (
                <button
                  key={s.hex}
                  type="button"
                  title={s.name}
                  aria-label={`${s.name} ${s.hex}`}
                  aria-pressed={draft.color === s.hex}
                  onClick={() => setColor(s.hex)}
                  className={cn(
                    "size-7 rounded-full border border-[var(--border-color)] transition-transform active:scale-90",
                    draft.color === s.hex && "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--card-bg)]"
                  )}
                  style={{ backgroundColor: s.hex }}
                />
              ))}
              <Input
                id="dt-embed-color"
                value={colorText}
                onChange={(e) => setColor(e.target.value)}
                spellCheck={false}
                className={cn(monoField, "w-28", !parseColor(colorText) && "border-red-500")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t.devTools.embedFields}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-[var(--border-color)]"
                disabled={draft.fields.length >= LIMITS.fields}
                onClick={() => set("fields", [...draft.fields, { name: "", value: "", inline: true }])}
              >
                <Plus /> {t.devTools.embedAddField}
              </Button>
            </div>
            {draft.fields.map((f, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-[var(--border-color)] p-3">
                <div className="flex gap-2">
                  <Input aria-label={`${t.devTools.embedFieldName} #${i + 1}`} placeholder={t.devTools.embedFieldName} value={f.name} onChange={(e) => setField(i, { name: e.target.value })} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`${t.devTools.embedRemoveField} #${i + 1}`}
                    className="shrink-0 rounded-xl border-[var(--border-color)]"
                    onClick={() => set("fields", draft.fields.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Textarea aria-label={`${t.devTools.embedFieldValue} #${i + 1}`} placeholder={t.devTools.embedFieldValue} rows={2} value={f.value} onChange={(e) => setField(i, { value: e.target.value })} />
                <div className="flex items-center gap-2">
                  <Switch id={`dt-embed-inline-${i}`} checked={f.inline} onCheckedChange={(v) => setField(i, { inline: v })} />
                  <Label htmlFor={`dt-embed-inline-${i}`} className="font-normal">
                    {t.devTools.embedInline}
                  </Label>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="dt-embed-image" label={t.devTools.embedImage}>
              {urlInput("image")}
            </Field>
            <Field id="dt-embed-thumbnail" label={t.devTools.embedThumbnail}>
              {urlInput("thumbnail")}
            </Field>
            <Field id="dt-embed-footer" label={t.devTools.embedFooter} count={draft.footer.length} limit={LIMITS.footer}>
              <Input id="dt-embed-footer" value={draft.footer} onChange={(e) => set("footer", e.target.value)} />
            </Field>
            <Field id="dt-embed-footerIcon" label={t.devTools.embedFooterIcon}>
              {urlInput("footerIcon")}
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="dt-embed-ts" checked={draft.timestamp} onCheckedChange={(v) => set("timestamp", v)} />
              <Label htmlFor="dt-embed-ts" className="font-normal">
                {t.devTools.embedTimestamp}
              </Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-[var(--border-color)]"
              onClick={() => {
                setDraft(EMPTY_EMBED);
                setColorText(EMPTY_EMBED.color);
              }}
            >
              <RotateCcw /> {t.devTools.embedReset}
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <EmbedPreview draft={draft} now={nowLabel} />
          <p className="text-xs text-[var(--text-muted)]">
            {t.devTools.embedChars}: {embedLength(draft)}/{LIMITS.total} · {t.devTools.embedNote}
          </p>
          {problems.length > 0 && (
            <div className="space-y-1">
              {problems.map((p, i) => (
                <ErrorText key={i}>{describe(p)}</ErrorText>
              ))}
            </div>
          )}
          <Segmented
            options={[
              { value: "json", label: "JSON (webhook)" },
              { value: "discordjs", label: "discord.js" },
            ]}
            value={output}
            onChange={setOutput}
            label={t.devTools.embedOutput}
          />
          <div className="flex items-start gap-2">
            <pre className="max-h-72 min-w-0 flex-1 overflow-auto rounded-xl bg-[var(--surface)] p-3 font-mono text-xs text-[var(--text)]">{code}</pre>
            <CopyButton value={code} />
          </div>
        </div>
      </div>
    </ToolCard>
  );
}
