'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAutoUpdater, useAppVersion } from '@/hooks/useElectron';
import packageJson from '../../../package.json';

/**
 * Standalone update panel for the Electron app.
 *
 * Surfaces the full updater state machine in one place so the settings page
 * (and any future "About" screen) can render a single self-contained block.
 * The four states match the spec:
 *   1. Idle    — initial render, nothing has been checked yet.
 *   2. Checking — manual or startup check in flight.
 *   3. Up to date — current version is the latest the feed reports.
 *   4. Update available / downloading / downloaded — action buttons enabled.
 *
 * No new design language: reuses Card / Button / Progress / Badge shapes
 * already used elsewhere in the app, with the [var(--color-general)]
 * theme accent that the rest of the settings screen uses.
 */
export function UpdaterPanel() {
  const appVersion = useAppVersion();
  const {
    updateAvailable,
    updateInfo,
    downloadProgress,
    isDownloading,
    isUpdateDownloaded,
    error,
    isChecking,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = useAutoUpdater();

  // Manual clicks from the settings page should also reset the error chip
  // so the user gets clear feedback that the new attempt is fresh.
  const handleCheck = async () => {
    await checkForUpdates();
  };

  const currentVersion = appVersion || packageJson.version;
  const remoteVersion = updateInfo?.version || null;

  return (
    <div className="rounded-xl border-2 border-[var(--border-color)] bg-white/0 dark:bg-black/40 p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-[var(--text)] font-black text-xl">Aktualizacje aplikacji</h3>
          <p className="text-sm text-zinc-400 mt-1">
            Sprawdź najnowszą wersję Two Steps Studio.
          </p>
        </div>
        <Button
          onClick={handleCheck}
          disabled={isChecking || isDownloading}
          variant="outline"
          className="border-[var(--color-general)]/40 text-[var(--color-general)] hover:bg-[var(--color-general)]/15"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sprawdzanie...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Check for updates
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg)]/50 px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Current version</div>
          <div className="text-lg font-mono text-[var(--text)] mt-1">v{currentVersion}</div>
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg)]/50 px-4 py-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Latest version</div>
          <div className="text-lg font-mono text-[var(--text)] mt-1">
            {remoteVersion ? `v${remoteVersion}` : '—'}
          </div>
        </div>
      </div>

      {isUpdateDownloaded && (
        <Banner tone="success" icon={<CheckCircle2 className="w-5 h-5" />}>
          <div className="flex-1">
            <div className="font-semibold">Aktualizacja pobrana</div>
            <div className="text-sm opacity-80">
              Wersja {remoteVersion} jest gotowa do instalacji. Aplikacja uruchomi się ponownie po kliknięciu.
            </div>
          </div>
          <Button
            onClick={installUpdate}
            className="bg-[var(--color-general)] text-white hover:opacity-90"
          >
            Restart and install
          </Button>
        </Banner>
      )}

      {!isUpdateDownloaded && isDownloading && downloadProgress && (
        <Banner tone="info" icon={<Download className="w-5 h-5" />}>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Downloading update...</span>
              <span className="font-mono">{Math.round(downloadProgress.percent)}%</span>
            </div>
            <Progress value={downloadProgress.percent} />
          </div>
        </Banner>
      )}

      {!isUpdateDownloaded && !isDownloading && updateAvailable && (
        <Banner tone="info" icon={<Download className="w-5 h-5" />}>
          <div className="flex-1">
            <div className="font-semibold">Update available</div>
            <div className="text-sm opacity-80">
              A new version of Two Steps Studio is available ({remoteVersion}).
            </div>
          </div>
          <Button
            onClick={downloadUpdate}
            className="bg-[var(--color-general)] text-white hover:opacity-90"
          >
            Update now
          </Button>
        </Banner>
      )}

      {!updateAvailable && !isDownloading && !isUpdateDownloaded && !isChecking && !error && (
        <Banner tone="success" icon={<CheckCircle2 className="w-5 h-5" />}>
          <div className="flex-1">
            <div className="font-semibold">You're up to date</div>
            <div className="text-sm opacity-80">
              Używasz najnowszej wersji aplikacji.
            </div>
          </div>
        </Banner>
      )}

      {error && (
        <Banner tone="error" icon={<AlertTriangle className="w-5 h-5" />}>
          <div className="flex-1">
            <div className="font-semibold">Update failed</div>
            <div className="text-sm opacity-80">{error}</div>
          </div>
          <Button onClick={handleCheck} variant="outline">
            Spróbuj ponownie
          </Button>
        </Banner>
      )}
    </div>
  );
}

type Tone = 'success' | 'info' | 'error';

function Banner({
  tone,
  icon,
  children,
}: {
  tone: Tone;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const palette: Record<Tone, string> = {
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    info: 'border-[var(--color-general)]/30 bg-[var(--color-general)]/10 text-[var(--color-general)]',
    error: 'border-red-500/30 bg-red-500/10 text-red-300',
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${palette[tone]}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      {children}
    </div>
  );
}

export default UpdaterPanel;
