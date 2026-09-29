"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

// false during SSR and hydration, true afterwards - for values that differ
// between server and browser (current time, timezone, locale formatting)
// without a setState-in-effect round trip.
export function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export const monoField = "font-mono text-sm";

export function ToolCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-0 py-0 rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)]", className)}>
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text)] font-[family-name:var(--font-space)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t.devTools.copyFailed);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      disabled={!value}
      className={cn("shrink-0 rounded-xl border-[var(--border-color)]", className)}
    >
      {copied ? <Check /> : <Copy />}
      {/* Icon-only on phones (label stays for screen readers) - the text
          label alone was wide enough to push row content under the button. */}
      <span className="max-sm:sr-only">{copied ? t.devTools.copied : t.devTools.copy}</span>
    </Button>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}

// Toggle-style button group without a new dependency - active option is
// tinted with the DEV accent, the rest stay outline.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          variant="outline"
          size="sm"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-xl border-[var(--border-color)]",
            value === option.value && "border-[var(--color-dev)] bg-[var(--color-dev)]/15"
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
