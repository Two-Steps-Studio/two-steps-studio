'use client';

import { useState, useEffect } from 'react';
import { Download, Monitor, Package, CheckCircle2, Clock, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ReleaseInfo {
  version: string;
  releaseDate: string;
  size: string;
  downloadUrl: string;
  portableUrl: string;
  changelog: string[];
}

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

    setTimeout(() => {
      setReleaseInfo(mockRelease);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
            <Monitor className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Pobierz aplikację desktopową
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Ciesz się pełnym doświadczeniem Two Steps Studio bezpośrednio na swoim komputerze.
            Szybko, wygodnie, z pełnym wsparciem offline.
          </p>
        </div>

        {/* Main Download Card */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl text-white mb-2">
                    Two Steps Studio Desktop
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Wersja {releaseInfo?.version} • Windows 10/11
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Najnowsza wersja
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Download Buttons */}
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="w-full h-16 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  onClick={() => window.open(releaseInfo?.downloadUrl, '_blank')}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Pobierz instalator
                  <Badge variant="secondary" className="ml-2 bg-white/20">
                    {releaseInfo?.size}
                  </Badge>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-16 text-lg border-gray-600 hover:bg-gray-700/50"
                  onClick={() => window.open(releaseInfo?.portableUrl, '_blank')}
                >
                  <Package className="w-5 h-5 mr-2" />
                  Wersja portable
                  <Badge variant="secondary" className="ml-2 bg-white/20">
                    {releaseInfo?.size}
                  </Badge>
                </Button>
              </div>

              {/* System Requirements */}
              <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  Wymagania systemowe
                </h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• System operacyjny: Windows 10 lub nowszy (64-bit)</li>
                  <li>• Procesor: Intel Core i3 lub równoważny</li>
                  <li>• Pamięć RAM: 4 GB minimum (8 GB zalecane)</li>
                  <li>• Miejsce na dysku: 500 MB na instalację</li>
                  <li>• Połączenie internetowe: wymagane do synchronizacji</li>
                </ul>
              </div>

              {/* Features */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Funkcje aplikacji</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Pełna funkcjonalność offline
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Automatyczne aktualizacje
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Powiadomienia systemowe
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Szybki start aplikacji
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-white">Integracja</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Synchronizacja z kontem TSS
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Udostępnianie plików
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Powiadomienia o projektach
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Wsparcie dla ciemnego motywu
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Changelog */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Lista zmian - wersja {releaseInfo?.version}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {releaseInfo?.changelog.map((change, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-300">
                    <span className="text-blue-400 mt-1">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Installation Instructions */}
        <div className="max-w-4xl mx-auto mt-8">
          <Card className="bg-gray-800/50 border-gray-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl text-white">Instrukcja instalacji</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Instalator (.exe)</h3>
                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Pobierz plik instalatora</li>
                  <li>Uruchom pobrany plik (kliknij dwukrotnie)</li>
                  <li>Postępuj zgodnie z instrukcjami kreatora instalacji</li>
                  <li>Wybierz lokalizację instalacji lub użyj domyślnej</li>
                  <li>Zaznacz opcje tworzenia skrótów (pulpit, Menu Start)</li>
                  <li>Zakończ instalację i uruchom aplikację</li>
                </ol>
              </div>
              <Separator className="bg-gray-700" />
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Wersja portable</h3>
                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Pobierz plik portable (.exe)</li>
                  <li>Rozpakuj archiwum do wybranego folderu</li>
                  <li>Uruchom aplikację bezpośrednio z folderu</li>
                  <li>Brak konieczności instalacji - działa z USB</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="max-w-4xl mx-auto mt-8 text-center text-sm text-gray-500">
          <p>
            Aplikacja jest regularnie aktualizowana. Włącz automatyczne aktualizacje w ustawieniach,
            aby zawsze korzystać z najnowszej wersji.
          </p>
          <p className="mt-2">
            W razie problemów z instalacją, skontaktuj się z nami:{' '}
            <a href="mailto:support@twostepsstudio.com" className="text-blue-400 hover:underline">
              support@twostepsstudio.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
