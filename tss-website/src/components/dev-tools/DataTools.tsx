"use client";

import { useEffect, useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { bytesToHex, decodeBase64, encodeBase64 } from "./codecs";
import { CopyButton, ErrorText, Segmented, ToolCard, monoField } from "./shared";

const actionButton = "rounded-xl border-[var(--border-color)]";

function OutputBlock({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <CopyButton value={value} />
      </div>
      <Textarea id={id} readOnly value={value} rows={6} className={monoField} />
    </div>
  );
}

function JsonTool() {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const run = (indent?: number) => {
    try {
      setOutput(JSON.stringify(JSON.parse(input), null, indent));
      setError(null);
    } catch (e) {
      setOutput("");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ToolCard title={t.devTools.jsonTitle} description={t.devTools.jsonDesc}>
      <div className="space-y-2">
        <Label htmlFor="dt-json-in">{t.devTools.input}</Label>
        <Textarea id="dt-json-in" value={input} onChange={(e) => setInput(e.target.value)} rows={6} spellCheck={false} className={monoField} placeholder='{"hello": "world"}' />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={actionButton} onClick={() => run(2)} disabled={!input.trim()}>{t.devTools.jsonFormat}</Button>
        <Button type="button" variant="outline" className={actionButton} onClick={() => run()} disabled={!input.trim()}>{t.devTools.jsonMinify}</Button>
      </div>
      {error && <ErrorText>{error}</ErrorText>}
      {output && !error && (
        <>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t.devTools.jsonValid}</p>
          <OutputBlock id="dt-json-out" label={t.devTools.output} value={output} />
        </>
      )}
    </ToolCard>
  );
}

function JwtTool() {
  const { t, locale } = useLanguage();
  const [token, setToken] = useState("");
  // "Now" for the expiry check, taken when the token changes - reading the
  // clock during render would make the output impure.
  const [checkedAt, setCheckedAt] = useState(0);

  const decoded = useMemo(() => {
    const trimmed = token.trim();
    if (!trimmed) return null;
    const [header, payload] = trimmed.split(".");
    if (!header || !payload) return { ok: false as const };
    try {
      return {
        ok: true as const,
        header: JSON.parse(decodeBase64(header)) as Record<string, unknown>,
        payload: JSON.parse(decodeBase64(payload)) as Record<string, unknown>,
      };
    } catch {
      return { ok: false as const };
    }
  }, [token]);

  const claimDate = (claim: unknown) =>
    typeof claim === "number" ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "medium" }).format(claim * 1000) : null;

  return (
    <ToolCard title={t.devTools.jwtTitle} description={t.devTools.jwtDesc}>
      <div className="space-y-2">
        <Label htmlFor="dt-jwt">Token</Label>
        <Textarea id="dt-jwt" value={token} onChange={(e) => {
            setToken(e.target.value);
            setCheckedAt(Date.now());
          }} rows={3} spellCheck={false} className={cn(monoField, "break-all")} placeholder="eyJhbGciOi..." />
      </div>
      {decoded && !decoded.ok && <ErrorText>{t.devTools.invalid}</ErrorText>}
      {decoded?.ok && (
        <div className="space-y-4">
          {(decoded.payload.exp !== undefined || decoded.payload.iat !== undefined) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
              {claimDate(decoded.payload.iat) && (
                <>
                  <dt className="text-[var(--text-muted)]">{t.devTools.jwtIssued}</dt>
                  <dd className="text-[var(--text)]">{claimDate(decoded.payload.iat)}</dd>
                </>
              )}
              {claimDate(decoded.payload.exp) && (
                <>
                  <dt className="text-[var(--text-muted)]">{t.devTools.jwtExpires}</dt>
                  <dd className="text-[var(--text)]">
                    {claimDate(decoded.payload.exp)}
                    {(decoded.payload.exp as number) * 1000 < checkedAt && (
                      <span className="ml-2 font-medium text-red-600 dark:text-red-400">{t.devTools.jwtExpired}</span>
                    )}
                  </dd>
                </>
              )}
            </dl>
          )}
          <OutputBlock id="dt-jwt-header" label={t.devTools.jwtHeader} value={JSON.stringify(decoded.header, null, 2)} />
          <OutputBlock id="dt-jwt-payload" label={t.devTools.jwtPayload} value={JSON.stringify(decoded.payload, null, 2)} />
        </div>
      )}
    </ToolCard>
  );
}

function EncodeDecodeTool({
  id,
  title,
  description,
  encode,
  decode,
}: {
  id: string;
  title: string;
  description: string;
  encode: (value: string) => string;
  decode: (value: string) => string;
}) {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState(false);

  const run = (fn: (value: string) => string) => {
    try {
      setOutput(fn(input));
      setError(false);
    } catch {
      setOutput("");
      setError(true);
    }
  };

  return (
    <ToolCard title={title} description={description}>
      <div className="space-y-2">
        <Label htmlFor={`${id}-in`}>{t.devTools.input}</Label>
        <Textarea id={`${id}-in`} value={input} onChange={(e) => setInput(e.target.value)} rows={4} spellCheck={false} className={monoField} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className={actionButton} onClick={() => run(encode)} disabled={!input}>{t.devTools.encode}</Button>
        <Button type="button" variant="outline" className={actionButton} onClick={() => run(decode)} disabled={!input}>{t.devTools.decode}</Button>
      </div>
      {error && <ErrorText>{t.devTools.invalid}</ErrorText>}
      {output && !error && <OutputBlock id={`${id}-out`} label={t.devTools.output} value={output} />}
    </ToolCard>
  );
}

const HASH_ALGORITHMS = [
  { value: "SHA-1", label: "SHA-1" },
  { value: "SHA-256", label: "SHA-256" },
  { value: "SHA-512", label: "SHA-512" },
] as const;
type HashAlgorithm = (typeof HASH_ALGORITHMS)[number]["value"];

function HashTool() {
  const { t } = useLanguage();
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [digest, setDigest] = useState({ key: "", hex: "" });
  const key = `${algorithm}:${input}`;

  useEffect(() => {
    // crypto.subtle only exists in secure contexts (https / localhost).
    if (!input || !globalThis.crypto?.subtle) return;
    let cancelled = false;
    crypto.subtle.digest(algorithm, new TextEncoder().encode(input)).then((buffer) => {
      if (!cancelled) setDigest({ key: `${algorithm}:${input}`, hex: bytesToHex(buffer) });
    });
    return () => {
      cancelled = true;
    };
  }, [input, algorithm]);

  // Only show a digest that belongs to the current input + algorithm, so a
  // stale hash never sits next to text it wasn't computed from.
  const hex = input && digest.key === key ? digest.hex : "";

  return (
    <ToolCard title={t.devTools.hashTitle} description={t.devTools.hashDesc}>
      <Segmented options={HASH_ALGORITHMS} value={algorithm} onChange={setAlgorithm} label={t.devTools.hashTitle} />
      <div className="space-y-2">
        <Label htmlFor="dt-hash-in">{t.devTools.input}</Label>
        <Textarea id="dt-hash-in" value={input} onChange={(e) => setInput(e.target.value)} rows={4} spellCheck={false} className={monoField} />
      </div>
      {hex && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] p-3">
          <code className={cn(monoField, "min-w-0 flex-1 break-all text-[var(--text)]")}>{hex}</code>
          <CopyButton value={hex} />
        </div>
      )}
    </ToolCard>
  );
}

export function DataTools() {
  const { t } = useLanguage();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <JsonTool />
      <JwtTool />
      <EncodeDecodeTool id="dt-b64" title={t.devTools.base64Title} description={t.devTools.base64Desc} encode={encodeBase64} decode={decodeBase64} />
      <EncodeDecodeTool id="dt-url" title={t.devTools.urlTitle} description={t.devTools.urlDesc} encode={encodeURIComponent} decode={decodeURIComponent} />
      <HashTool />
    </div>
  );
}
