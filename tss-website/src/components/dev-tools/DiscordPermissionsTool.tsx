"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/use-translation";
import { PERMISSIONS, fromInteger, inviteUrl, isSnowflake, toInteger, type PermissionGroup } from "./discord-permissions";
import { CopyButton, ErrorText, ToolCard, monoField } from "./shared";

// "SendMessagesInThreads" -> "Send Messages In Threads"
const humanize = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

const GROUPS: PermissionGroup[] = ["general", "text", "voice"];

// Everyday bot set: read and answer in channels, slash commands, voice.
const PRESET_BASIC = ["ViewChannel", "SendMessages", "SendMessagesInThreads", "EmbedLinks", "AttachFiles", "ReadMessageHistory", "AddReactions", "UseApplicationCommands"];

export function DiscordPermissionsTool() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(PRESET_BASIC));
  const [integerText, setIntegerText] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [slash, setSlash] = useState(true);

  const value = toInteger(selected);
  const shownInteger = integerText ?? value.toString();
  const integerValid = integerText === null || /^\d{1,20}$/.test(integerText.trim());
  const unknown = integerText !== null && integerValid ? fromInteger(BigInt(integerText.trim() || "0")).unknownBits : [];
  const url = isSnowflake(clientId) ? inviteUrl(clientId, value, slash ? ["bot", "applications.commands"] : ["bot"]) : "";

  const toggle = (name: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(name);
    else next.delete(name);
    setSelected(next);
    setIntegerText(null);
  };

  // Typing an integer re-derives the checkboxes from it.
  const onInteger = (text: string) => {
    setIntegerText(text);
    if (/^\d{1,20}$/.test(text.trim())) setSelected(new Set(fromInteger(BigInt(text.trim())).names));
  };

  const groupLabel: Record<PermissionGroup, string> = { general: t.devTools.permGeneral, text: t.devTools.permText, voice: t.devTools.permVoice };

  return (
    <ToolCard title={t.devTools.permTitle} description={t.devTools.permDesc} className="lg:col-span-2">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-2">
          <Label htmlFor="dt-perm-int">{t.devTools.permInteger}</Label>
          <Input id="dt-perm-int" inputMode="numeric" value={shownInteger} onChange={(e) => onInteger(e.target.value)} className={monoField} aria-invalid={!integerValid} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={() => onInteger(toInteger(PRESET_BASIC).toString())}>
            {t.devTools.permPresetBasic}
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-xl border-[var(--border-color)]" onClick={() => onInteger("0")}>
            {t.devTools.embedReset}
          </Button>
          <CopyButton value={value.toString()} />
        </div>
      </div>
      {!integerValid && <ErrorText>{t.devTools.invalid}</ErrorText>}
      {unknown.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {t.devTools.permUnknownBits}: {unknown.join(", ")}
        </p>
      )}
      {selected.has("Administrator") && <ErrorText>{t.devTools.permAdminWarn}</ErrorText>}

      <div className="grid gap-6 md:grid-cols-3">
        {GROUPS.map((group) => (
          <fieldset key={group} className="min-w-0 space-y-2">
            <legend className="mb-2 text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">{groupLabel[group]}</legend>
            {PERMISSIONS.filter((p) => p.group === group).map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <Checkbox id={`dt-perm-${p.name}`} checked={selected.has(p.name)} onCheckedChange={(v) => toggle(p.name, v === true)} />
                <Label htmlFor={`dt-perm-${p.name}`} className="min-w-0 text-sm font-normal break-words" title={`1 << ${p.bit}`}>
                  {humanize(p.name)}
                </Label>
              </div>
            ))}
          </fieldset>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl bg-[var(--surface)] p-4">
        <p className="text-sm font-bold text-[var(--text)]">{t.devTools.permInvite}</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="dt-perm-client">{t.devTools.permClientId}</Label>
            <Input id="dt-perm-client" inputMode="numeric" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="123456789012345678" className={monoField} aria-invalid={clientId !== "" && !isSnowflake(clientId)} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Checkbox id="dt-perm-slash" checked={slash} onCheckedChange={(v) => setSlash(v === true)} />
            <Label htmlFor="dt-perm-slash" className="font-mono text-xs font-normal">
              applications.commands
            </Label>
          </div>
        </div>
        {clientId !== "" && !isSnowflake(clientId) && <ErrorText>{t.devTools.permClientInvalid}</ErrorText>}
        {url && (
          <div className="flex items-start gap-2">
            <code className="min-w-0 flex-1 rounded-xl bg-[var(--card-bg)] p-3 font-mono text-xs break-all text-[var(--text)]">{url}</code>
            <CopyButton value={url} />
            <Button asChild variant="outline" size="sm" className="shrink-0 rounded-xl border-[var(--border-color)]">
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={t.devTools.permOpen}>
                <ExternalLink />
              </a>
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)]">{t.devTools.permNote}</p>
    </ToolCard>
  );
}
