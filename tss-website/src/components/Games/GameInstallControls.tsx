"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Play, RefreshCw, Trash2, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { useIsElectron, useGameDownload } from "@/hooks/useElectron";
import { useLanguage } from "@/hooks/use-translation";

interface GameInstallControlsProps {
  gameId: number;
  title: string;
  /** Compact mode: one status-driven button + a thin progress bar, for use in list cards. */
  compact?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function GameInstallControls({ gameId, title, compact = false }: GameInstallControlsProps) {
  const { t } = useLanguage();
  const isElectron = useIsElectron();
  const { status, progress, error, currentVersion, install, update, repair, cancel, launch, uninstall } = useGameDownload(gameId);

  const isBusy = status === "downloading" || status === "updating" || status === "repairing" || status === "verifying";

  if (!isElectron) {
    return (
      <Link href="/download" className={compact ? "flex-1" : undefined}>
        <Button className={compact
          ? "w-full rounded-xl bg-[var(--color-games)] text-white hover:bg-[var(--color-games)]/80"
          : "w-full bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors"}>
          <Download size={compact ? 16 : 18} className="mr-2" />
          {compact ? t.compGameInstall.download : t.compGameInstall.downloadDesktopApp}
        </Button>
      </Link>
    );
  }

  if (compact) {
    const label = isBusy
      ? `${Math.round(progress?.bytesTotal ? (progress.bytesDone / progress.bytesTotal) * 100 : 0)}%`
      : status === "running" ? t.compGameInstall.running
      : status === "update-available" ? t.compGameInstall.update
      : status === "installed" ? t.compGameInstall.play
      : t.compGameInstall.download;
    const onClick = isBusy || status === "running" ? undefined
      : status === "update-available" ? update
      : status === "installed" ? launch
      : () => install(title);

    return (
      <div className="flex-1 space-y-1">
        <Button
          onClick={onClick}
          disabled={isBusy || status === "running"}
          className="w-full rounded-xl bg-[var(--color-games)] text-white hover:bg-[var(--color-games)]/80"
        >
          {isBusy && <Loader2 size={14} className="mr-2 animate-spin" />}
          {status === "installed" && <Play size={14} className="mr-2" />}
          {label}
        </Button>
        {isBusy && <Progress value={progress?.bytesTotal ? (progress.bytesDone / progress.bytesTotal) * 100 : 0} className="h-1" />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isBusy && progress && (
        <div className="space-y-2">
          <div className="text-zinc-400 text-xs truncate">
            {progress.currentFile} ({progress.fileIndex}/{progress.fileCount})
          </div>
          <Progress value={progress.bytesTotal ? (progress.bytesDone / progress.bytesTotal) * 100 : 0} />
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{formatBytes(progress.bytesDone)} / {formatBytes(progress.bytesTotal)}</span>
            <button onClick={cancel} className="text-red-400 hover:text-red-300">{t.compGameInstall.cancel}</button>
          </div>
        </div>
      )}

      {error && status === "error" && (
        <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/40 border border-red-500/30 rounded-xl p-3">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {status === "not-installed" || status === "error" ? (
        <Button
          onClick={() => install(title)}
          className="w-full bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors"
        >
          <Download size={18} className="mr-2" />
          {t.compGameInstall.downloadAndInstall}
        </Button>
      ) : isBusy ? (
        <Button disabled className="w-full rounded-full font-medium">
          <Loader2 size={18} className="mr-2 animate-spin" />
          {status === "updating" ? t.compGameInstall.updating : status === "repairing" ? t.compGameInstall.repairing : status === "verifying" ? t.compGameInstall.verifying : t.compGameInstall.downloading}
        </Button>
      ) : status === "running" ? (
        <Button disabled className="w-full rounded-full font-medium">
          {t.compGameInstall.gameRunning}
        </Button>
      ) : (
        <>
          {status === "update-available" && (
            <Button
              onClick={update}
              className="w-full bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium transition-colors"
            >
              <RefreshCw size={18} className="mr-2" />
              {t.compGameInstall.updateTo} {currentVersion}
            </Button>
          )}
          <Button
            onClick={launch}
            variant={status === "update-available" ? "outline" : "default"}
            className={status === "update-available"
              ? "w-full border-[var(--color-games)]/30 text-[var(--color-games)] hover:bg-[var(--color-games)]/10 rounded-full font-medium"
              : "w-full bg-[var(--color-games)] hover:bg-[var(--color-games)]/90 text-white rounded-full font-medium"}
          >
            <Play size={18} className="mr-2" />
            {t.compGameInstall.play}
          </Button>
          <div className="flex gap-2">
            <Button onClick={repair} variant="outline" size="sm" className="flex-1 rounded-full text-xs">
              <ShieldCheck size={14} className="mr-1" /> {t.compGameInstall.verify}
            </Button>
            <Button onClick={uninstall} variant="outline" size="sm" className="flex-1 rounded-full text-xs text-red-400 hover:text-red-300 border-red-500/30">
              <Trash2 size={14} className="mr-1" /> {t.compGameInstall.uninstall}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
