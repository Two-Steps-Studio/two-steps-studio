'use client';

import { useEffect, useState } from 'react';
import {
  Download,
  Monitor,
  Package,
  CheckCircle2,
  Clock,
  HardDrive,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatBytes, type DesktopRelease } from '@/lib/desktop-release';
import { useLanguage } from '@/hooks/use-translation';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' }).format(date);
}

export default function DownloadPage() {
  const { t } = useLanguage();
  const [release, setRelease] = useState<DesktopRelease | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

  const SYSTEM_REQUIREMENTS = [
    t.download.sysReq1,
    t.download.sysReq2,
    t.download.sysReq3,
    t.download.sysReq4,
    t.download.sysReq5,
  ];

  const FEATURES = [
    { heading: t.download.featuresGroup1Title, items: [t.download.feature1, t.download.feature2, t.download.feature3, t.download.feature4] },
    { heading: t.download.featuresGroup2Title, items: [t.download.feature5, t.download.feature6, t.download.feature7, t.download.feature8] },
  ];

  useEffect(() => {
    let cancelled = false;

    fetch('/api/desktop/release')
      .then((response) => response.json())
      .then((payload: { release: DesktopRelease | null }) => {
        if (cancelled) return;
        if (payload.release) {
          setRelease(payload.release);
          setStatus('ready');
        } else {
          setStatus('empty');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16">
        <header className="mb-12 text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-lg">
            <Monitor className="h-10 w-10 text-[var(--color-general)]" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-[var(--text)] sm:text-5xl">
            {t.download.title}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--text)]/70">
            {t.download.subtitle}
          </p>
        </header>

        <div className="mx-auto mb-12 max-w-4xl">
          <Card className="border-[var(--border-color)] bg-[var(--card-bg)]">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle className="mb-2 text-2xl text-[var(--text)]">
                    {t.download.cardTitle}
                  </CardTitle>
                  <CardDescription className="text-[var(--text)]/70">
                    {status === 'ready' && release
                      ? `${t.download.versionWord} ${release.version} • ${release.minimumOs ?? t.download.fallbackDesc}${t.download.releasedWord}${formatDate(release.releasedAt)}`
                      : t.download.fallbackDesc}
                  </CardDescription>
                </div>
                {status === 'ready' && (
                  <Badge
                    variant="secondary"
                    className="border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-300"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    {t.download.latestBadge}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {status === 'loading' && (
                <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
                  <div className="h-16 animate-pulse rounded-xl bg-[var(--text)]/10" />
                  <div className="h-16 animate-pulse rounded-xl bg-[var(--text)]/10" />
                </div>
              )}

              {(status === 'empty' || status === 'error') && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] p-4"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="font-medium text-[var(--text)]">
                      {status === 'empty'
                        ? t.download.noRelease
                        : t.download.fetchError}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text)]/70">
                      {status === 'empty'
                        ? t.download.emptySubtext
                        : t.download.errorSubtext}
                    </p>
                  </div>
                </div>
              )}

              {status === 'ready' && release && (
                <div className="grid gap-4 md:grid-cols-2">
                  {release.artifacts.map((artifact) => {
                    const isInstaller = artifact.kind === 'installer';
                    const Icon = isInstaller ? Download : Package;
                    return (
                      <a
                        key={artifact.kind}
                        href={artifact.url}
                        download={artifact.filename}
                        className={`flex h-16 items-center justify-center gap-2 rounded-xl px-4 text-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-general)] ${
                          isInstaller
                            ? 'bg-[var(--color-general)] text-black hover:opacity-90'
                            : 'border border-[var(--border-color)] text-[var(--text)] hover:border-[var(--color-general)]'
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{artifact.label}</span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-sm font-medium ${
                            isInstaller ? 'bg-black/15' : 'bg-[var(--text)]/10'
                          }`}
                        >
                          {formatBytes(artifact.sizeBytes)}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}

              <div className="space-y-3 rounded-lg border border-[var(--border-color)] p-4">
                <h2 className="flex items-center gap-2 font-semibold text-[var(--text)]">
                  <HardDrive className="h-4 w-4" />
                  {t.download.systemReqTitle}
                </h2>
                <ul className="space-y-1 text-sm text-[var(--text)]/75">
                  {SYSTEM_REQUIREMENTS.map((requirement) => (
                    <li key={requirement}>• {requirement}</li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {FEATURES.map(({ heading, items }) => (
                  <div key={heading} className="space-y-2">
                    <h2 className="font-semibold text-[var(--text)]">{heading}</h2>
                    <ul className="space-y-1 text-sm text-[var(--text)]/75">
                      {items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {status === 'ready' && release && release.notes.length > 0 && (
          <div className="mx-auto mb-8 max-w-4xl">
            <Card className="border-[var(--border-color)] bg-[var(--card-bg)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-[var(--text)]">
                  <Clock className="h-5 w-5" />
                  {t.download.changelogPrefix}{release.version}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {release.notes.map((note) => (
                    <li key={note} className="flex items-start gap-2 text-[var(--text)]/85">
                      <span className="mt-1 text-[var(--color-general)]">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mx-auto max-w-4xl">
          <Card className="border-[var(--border-color)] bg-[var(--card-bg)]">
            <CardHeader>
              <CardTitle className="text-xl text-[var(--text)]">{t.download.installGuideTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--text)]">{t.download.installerTitle}</h3>
                <ol className="list-inside list-decimal space-y-1 text-sm text-[var(--text)]/75">
                  <li>{t.download.installStep1}</li>
                  <li>{t.download.installStep2}</li>
                  <li>
                    {t.download.installStep3}
                  </li>
                  <li>{t.download.installStep4}</li>
                  <li>{t.download.installStep5}</li>
                </ol>
              </div>
              <Separator className="bg-[var(--border-color)]" />
              <div className="space-y-2">
                <h3 className="font-semibold text-[var(--text)]">{t.download.portableTitle}</h3>
                <ol className="list-inside list-decimal space-y-1 text-sm text-[var(--text)]/75">
                  <li>{t.download.portableStep1}</li>
                  <li>{t.download.portableStep2}</li>
                  <li>{t.download.portableStep3}</li>
                  <li>{t.download.portableStep4}</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        <footer className="mx-auto mt-8 max-w-4xl text-center text-sm text-[var(--text)]/70">
          <p>
            {t.download.footerNote}
          </p>
          <p className="mt-2">
            {t.download.footerContactPrefix}{' '}
            <a
              href="mailto:support@twostepsstudio.com"
              className="font-medium text-[var(--color-general)] underline underline-offset-4"
            >
              support@twostepsstudio.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
