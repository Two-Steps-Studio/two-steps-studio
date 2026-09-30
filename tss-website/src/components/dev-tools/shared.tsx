"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export { useMounted } from "@/hooks/use-mounted";

export const monoField = "font-mono text-sm";

// Native <select>, not the Radix one: the time-zone list has ~400 entries
// and phones get their own scroll-wheel picker for free. Background is set
// explicitly so Chromium's option list follows the dark theme too.
export const nativeSelect =
  "h-9 w-full min-w-0 rounded-md border border-[var(--border-color)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text)]";

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
          <h3 className="text-xl font-bold text-[var(--text)] font-[family-name:var(--font-space)]">{title}</h3>
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

// Click-or-drop file picker styled like the other drop zones on the page.
export function FileDrop({
  accept,
  onFile,
  children,
  disabled,
}: {
  accept: string;
  onFile: (file: File) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-muted)] transition-colors focus-within:ring-2 focus-within:ring-[var(--color-dev)]",
        dragging && "border-[var(--color-dev)] bg-[var(--color-dev)]/10",
        disabled && "pointer-events-none opacity-60"
      )}
    >
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = ""; // allow picking the same file again
        }}
      />
      {children}
    </label>
  );
}

// Decodes an image file into an <img> ready for drawing on a canvas.
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("not an image"));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
