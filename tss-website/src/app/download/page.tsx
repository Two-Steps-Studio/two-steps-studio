'use client';

import { useState, useEffect } from 'react';
import {
  Download, Monitor, Package, CheckCircle2, Clock, HardDrive, Cpu,
  MemoryStick, Wifi, WifiOff, RefreshCw, Bell, Zap, Moon, FolderSync,
  Share2, ShieldCheck, LifeBuoy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ReleaseInfo {
  version: string;
  releaseDate: string;
  size: string;
  downloadUrl: string;
  portableUrl: string;
  changelog: string[];
}

/* Theme tokens (globals.css) are used instead of Tailwind's `dark:` variant:
   `dark:` is media-based in this project and therefore follows the OS, while
   --bg/--text follow the .dark/.light class the user actually picked. Driving
   colours from the tokens keeps this page correct in both themes. */
const PANEL =
  'rounded-[2.5rem] border border-[var(--border-color)] bg-[var(--surface)] backdrop-blur-md';
const TEXT = 'text-[var(--text)]';
const MUTED = 'text-[var(--text-muted)]';
const ACCENT = 'text-[var(--color-general-accessible)]';
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-general)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]';

const FEATURES = [
  { icon: WifiOff, title: 'Tryb offline', desc: 'Pełna funkcjonalność bez połączenia z siecią.' },
  { icon: RefreshCw, title: 'Auto-aktualizacje', desc: 'Nowe wersje instalują się w tle.' },
  { icon: Bell, title: 'Powiadomienia', desc: 'Natywne powiadomienia systemu Windows.' },
  { icon: Zap, title: 'Szybki start', desc: 'Uruchamia się szybciej niż przeglądarka.' },
  { icon: FolderSync, title: 'Synchronizacja', desc: 'Sesja i dane wspólne z wersją webową.' },
  { icon: Share2, title: 'Udostępnianie', desc: 'Przesyłaj pliki prosto z pulpitu.' },
  { icon: Monitor, title: 'Projekty', desc: 'Powiadomienia o zmianach w projektach.' },
  { icon: Moon, title: 'Ciemny motyw', desc: 'Zgodny z motywem systemowym.' },
];

const REQUIREMENTS = [
  { icon: Monitor, label: 'System', value: 'Windows 10 lub nowszy (64-bit)' },
  { icon: Cpu, label: 'Procesor', value: 'Intel Core i3 lub równoważny' },
  { icon: MemoryStick, label: 'Pamięć RAM', value: '4 GB minimum, 8 GB zalecane' },
  { icon: HardDrive, label: 'Dysk', value: '500 MB wolnego miejsca' },
  { icon: Wifi, label: 'Sieć', value: 'Wymagana do synchronizacji' },
];

const INSTALL_GUIDES = [
  {
    label: 'Instalator (.exe)',
    steps: [
      'Pobierz plik instalatora',
      'Uruchom pobrany plik (kliknij dwukrotnie)',
      'Postępuj zgodnie z instrukcjami kreatora',
      'Wybierz lokalizację instalacji lub użyj domyślnej',
      'Zaznacz opcje skrótów (pulpit, Menu Start)',
      'Zakończ instalację i uruchom aplikację',
    ],
  },
  {
    label: 'Wersja portable',
    steps: [
      'Pobierz plik portable (.exe)',
      'Rozpakuj archiwum do wybranego folderu',
      'Uruchom aplikację bezpośrednio z folderu',
      'Gotowe — działa również z pendrive’a',
    ],
  },
];

export default function DownloadPage() {
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In production, this would fetch from your API
    // For now, using mock data
    const mockRelease: ReleaseInfo = {
      version: '1.0.0',
      releaseDate: '2024-08-02',
      size: '145 MB',
      downloadUrl: 'https://releases.twostepsstudio.com/desktop/Two-Steps-Studio-1.0.0-x64.exe',
      portableUrl: 'https://releases.twostepsstudio.com/desktop/Two-Steps-Studio-1.0.0-portable.exe',
      changelog: [
        'Pierwsza oficjalna wersja aplikacji desktopowej',
        'Pełna integracja z systemem powiadomień Windows',
        'Wsparcie dla trybu offline',
        'Automatyczne aktualizacje',
        'Synchronizacja sesji z wersją webową',
        'Optymalizacja wydajności',
      ],
    };

    const timer = setTimeout(() => {
      setReleaseInfo(mockRelease);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Skeleton mirrors the real layout so nothing shifts when data lands (CLS).
  if (isLoading || !releaseInfo) {
    return (
      <div className="container mx-auto p-6 mt-20 max-w-6xl" aria-busy="true" aria-live="polite">
        <span className="sr-only">Ładowanie informacji o wydaniu…</span>
        <div className={`${PANEL} h-[26rem] motion-safe:animate-pulse mb-8`} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${PANEL} h-36 motion-safe:animate-pulse`} />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className={`${PANEL} h-80 motion-safe:animate-pulse`} />
          <div className={`${PANEL} h-80 motion-safe:animate-pulse`} />
        </div>
      </div>
    );
  }

  const releaseDate = new Date(releaseInfo.releaseDate).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="container mx-auto p-6 mt-20 max-w-6xl">
      {/* ---------- Hero ---------- */}
      <section className={`relative overflow-hidden ${PANEL} p-8 md:p-12 mb-8 shadow-2xl`}>
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[var(--color-general)]/20 blur-3xl motion-safe:animate-pulse"
        />

        <div className="relative z-10 grid lg:grid-cols-[1.25fr_1fr] gap-10 items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`rounded-full border-0 bg-[var(--color-general)]/15 px-4 py-1.5 text-sm font-medium ${ACCENT} backdrop-blur-sm`}>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Najnowsza wersja
              </Badge>
              <Badge
                variant="outline"
                className={`rounded-full border-[var(--border-color)] px-4 py-1.5 text-sm ${MUTED}`}
              >
                Windows 10/11 · 64-bit
              </Badge>
            </div>

            <div className="space-y-4">
              <h1 className={`font-[family-name:var(--font-space)] text-4xl md:text-6xl font-bold tracking-tight ${TEXT}`}>
                Aplikacja <span className={ACCENT}>desktopowa</span>
              </h1>
              <p className={`max-w-xl font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed ${MUTED}`}>
                Pełne doświadczenie Two Steps Studio bezpośrednio na Twoim komputerze — szybciej,
                wygodniej i z pełnym wsparciem trybu offline.
              </p>
            </div>

            {/* Primary CTAs — real anchors, not buttons: keyboard/AT recognise them as
                downloads and no popup blocker sits between the user and the file.
                Dark ink on the bright teal reaches 7.3:1; white would only reach 2.3:1. */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={releaseInfo.downloadUrl}
                className={`group inline-flex h-16 flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl bg-[var(--color-general)] px-6 text-base font-semibold text-[#052121] transition-all duration-300 hover:shadow-[0_0_40px_-8px_rgba(var(--color-general-rgb),0.7)] motion-safe:hover:-translate-y-0.5 ${FOCUS}`}
              >
                <Download className="h-5 w-5 transition-transform duration-300 motion-safe:group-hover:translate-y-0.5" />
                Pobierz instalator
                <span className="rounded-full bg-black/15 px-2.5 py-0.5 text-xs font-medium">
                  {releaseInfo.size}
                </span>
              </a>
              <a
                href={releaseInfo.portableUrl}
                className={`inline-flex h-16 flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-6 text-base font-semibold ${TEXT} transition-all duration-300 hover:border-[var(--color-general)]/50 hover:bg-[var(--surface-hover)] ${FOCUS}`}
              >
                <Package className="h-5 w-5" />
                Wersja portable
              </a>
            </div>

            <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2 text-sm">
              {[
                { label: 'Wersja', value: releaseInfo.version },
                { label: 'Rozmiar', value: releaseInfo.size },
                { label: 'Data wydania', value: releaseDate },
              ].map((item) => (
                <div key={item.label}>
                  <dt className={MUTED}>{item.label}</dt>
                  <dd className={`font-medium ${TEXT}`}>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Decorative app-window mockup — pure CSS, no asset to load, hidden from AT. */}
          <div aria-hidden className="hidden lg:block">
            <div className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--card-bg)] p-3 shadow-2xl">
              <div className="mb-3 flex items-center gap-1.5 px-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
              </div>
              <div className="space-y-3 rounded-[1.25rem] bg-gradient-to-br from-[var(--color-general)]/20 via-transparent to-[var(--color-records)]/10 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-general)]">
                    <Monitor className="h-5 w-5 text-[#052121]" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-28 rounded-full bg-[var(--text-muted)] opacity-40" />
                    <div className="h-2 w-20 rounded-full bg-[var(--text-muted)] opacity-20" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-[var(--surface-hover)]" />
                  ))}
                </div>
                <div className="h-2 w-3/4 rounded-full bg-[var(--text-muted)] opacity-20" />
                <div className="h-2 w-1/2 rounded-full bg-[var(--text-muted)] opacity-20" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="mb-8">
        <h2 className={`mb-5 font-[family-name:var(--font-space)] text-2xl font-bold ${TEXT}`}>
          Co zyskujesz
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className={`${PANEL} group p-5 transition-all duration-300 hover:border-[var(--color-general)]/50 motion-safe:hover:-translate-y-1`}
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-general)]/15 ${ACCENT} transition-transform duration-300 motion-safe:group-hover:scale-110`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className={`mb-1 font-semibold ${TEXT}`}>{title}</h3>
              <p className={`text-sm leading-relaxed ${MUTED}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Requirements + Installation ---------- */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className={`${PANEL} gap-0`}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2.5 font-[family-name:var(--font-space)] text-xl ${TEXT}`}>
              <ShieldCheck className={`h-5 w-5 ${ACCENT}`} />
              Wymagania systemowe
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="space-y-1">
              {REQUIREMENTS.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl px-3 py-3 transition-colors duration-200 hover:bg-[var(--surface-hover)]"
                >
                  <Icon className={`h-5 w-5 shrink-0 ${MUTED}`} />
                  <div className="min-w-0">
                    <dt className={`text-xs uppercase tracking-wide ${MUTED}`}>{label}</dt>
                    <dd className={`text-sm ${TEXT}`}>{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className={`${PANEL} gap-0`}>
          <CardHeader className="pb-2">
            <CardTitle className={`flex items-center gap-2.5 font-[family-name:var(--font-space)] text-xl ${TEXT}`}>
              <Download className={`h-5 w-5 ${ACCENT}`} />
              Instrukcja instalacji
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {INSTALL_GUIDES.map(({ label, steps }) => (
              <div key={label}>
                <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${ACCENT}`}>
                  {label}
                </h3>
                <ol className="space-y-2.5">
                  {steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-general)]/15 text-xs font-semibold ${ACCENT}`}>
                        {i + 1}
                      </span>
                      <span className={`text-sm leading-relaxed ${MUTED}`}>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ---------- Changelog ---------- */}
      <Card className={`${PANEL} gap-0 mb-8`}>
        <CardHeader className="pb-2">
          <CardTitle className={`flex flex-wrap items-center gap-2.5 font-[family-name:var(--font-space)] text-xl ${TEXT}`}>
            <Clock className={`h-5 w-5 ${ACCENT}`} />
            Lista zmian
            <Badge
              variant="outline"
              className={`rounded-full border-[var(--border-color)] font-mono text-xs ${MUTED}`}
            >
              v{releaseInfo.version}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-3">
            {releaseInfo.changelog.map((change) => (
              <li key={change} className="flex items-start gap-3">
                <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${ACCENT}`} />
                <span className={`text-sm leading-relaxed ${TEXT}`}>{change}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ---------- Support ---------- */}
      <section className={`${PANEL} flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6`}>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-general)]/15 ${ACCENT}`}>
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className={`font-medium ${TEXT}`}>Masz problem z instalacją?</p>
          <p className={`text-sm ${MUTED}`}>
            Aplikacja aktualizuje się automatycznie — w razie kłopotów napisz do nas.
          </p>
        </div>
        <a
          href="mailto:support@twostepsstudio.com"
          className={`inline-flex h-12 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-color)] px-5 text-sm font-medium ${TEXT} transition-colors duration-200 hover:border-[var(--color-general)]/50 hover:text-[var(--color-general-accessible)] ${FOCUS}`}
        >
          support@twostepsstudio.com
        </a>
      </section>
    </div>
  );
}
