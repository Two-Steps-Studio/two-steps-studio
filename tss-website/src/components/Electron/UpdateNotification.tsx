'use client';

import { useState } from 'react';
import { useAutoUpdater } from '@/hooks/useElectron';
import { Download, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Modal dialog shown when an update is available or downloaded.
 *
 * Kept intentionally minimal — the heavy state lives in useAutoUpdater and
 * the main process. The dialog exposes three actions:
 *   - "Update now"     : trigger downloadUpdate()
 *   - "Restart..."     : trigger installUpdate()
 *   - "Later" / "X"    : dismiss the dialog for this session
 *
 * "Later" used to be a no-op (see git history); now it actually closes the
 * dialog. The renderer keeps the updater state in memory, so the dialog
 * will reappear on next app launch when the same version is still pending.
 */
export function UpdateNotification() {
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

  const [dismissed, setDismissed] = useState(false);

  // Re-show the dialog on a new "update-available" event after the user
  // previously dismissed one — otherwise it would never come back during
  // a long session even if a fresh release appeared.
  const isOpen =
    !dismissed &&
    (updateAvailable || isUpdateDownloaded || !!error || isChecking);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) setDismissed(true); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpdateDownloaded ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {isUpdateDownloaded
              ? 'Aktualizacja gotowa'
              : isChecking
                ? 'Sprawdzanie aktualizacji...'
                : 'Dostępna aktualizacja'}
          </DialogTitle>
          <DialogDescription>
            {isUpdateDownloaded
              ? 'Nowa wersja została pobrana i zostanie zainstalowana po ponownym uruchomieniu aplikacji.'
              : `Dostępna jest nowa wersja Two Steps Studio (${updateInfo?.version || 'unknown'}).`}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
            Wystąpił błąd: {error}
          </div>
        )}

        {isDownloading && downloadProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Downloading update...</span>
              <span>{Math.round(downloadProgress.percent)}%</span>
            </div>
            <Progress value={downloadProgress.percent} />
          </div>
        )}

        {updateInfo?.releaseNotes && !isUpdateDownloaded && (
          <div className="bg-gray-50 rounded-md p-3 text-sm max-h-32 overflow-y-auto">
            <strong>Informacje o wydaniu:</strong>
            <p className="mt-1 text-gray-700">{updateInfo.releaseNotes}</p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!isDownloading && !isUpdateDownloaded && !isChecking && (
            <>
              <Button
                variant="outline"
                onClick={() => setDismissed(true)}
                className="w-full sm:w-auto"
              >
                <X className="w-4 h-4 mr-2" />
                Później
              </Button>
              <Button
                onClick={downloadUpdate}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Update now
              </Button>
            </>
          )}

          {isUpdateDownloaded && (
            <>
              <Button
                variant="outline"
                onClick={() => setDismissed(true)}
                className="w-full sm:w-auto"
              >
                <X className="w-4 h-4 mr-2" />
                Później
              </Button>
              <Button
                onClick={installUpdate}
                className="w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Restart and install
              </Button>
            </>
          )}

          {error && (
            <Button
              onClick={checkForUpdates}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Spróbuj ponownie
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
