"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, FileJson, Download, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { importTranslations } from "@/hooks/use-language";

export default function TranslationManagementPage() {
  const { t, availableLanguages, language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [imported, setImported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, data: string) => {
    e.preventDefault();
    setDragActive(false);

    try {
      setUploading(true);
      setError(null);
      await importTranslations(data);
      setImported(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const text = await file.text();
      await importTranslations(text);
      setImported(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black/5 dark:bg-white/5 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black mb-2">
              Zarządzanie Tłumaczeniami
            </h1>
            <p className="text-muted-foreground">
              Dodaj własne tłumaczenia lub importuj pliki JSON
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle>Import Tłumaczeń</CardTitle>
            <CardDescription>
              Przeciągnij plik JSON lub wybierz go z komputera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center transition-all",
                dragActive
                  ? "border-[var(--color-general)] bg-[var(--color-general)]/10"
                  : "border-white/20 hover:border-white/40",
              )}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, e.dataTransfer.getData("text/plain"))}
            >
              <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-bold mb-2">Przeciągnij plik JSON tutaj</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Format: JSON z strukturą BaseTranslations
              </p>

              <label
                className={cn(
                  "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold cursor-pointer transition-all",
                  "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
                  "text-white/80 hover:text-white",
                )}
              >
                <FileJson size={18} />
                Wybierz plik
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileUpload(e.target.files?.[0] || undefined)}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {imported && (
              <Alert className="mt-4 bg-[var(--color-general)]/10 border-[var(--color-general)]/30">
                <CheckCircle className="h-4 w-4 text-[var(--color-general)]" />
                <AlertDescription className="text-[var(--color-general)]">
                  Tłumaczenie pomyślnie zaimportowane! Strona zostanie przeładowana.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Example Translation Template */}
        <Card>
          <CardHeader>
            <CardTitle>Template Tłumaczenia</CardTitle>
            <CardDescription>
              Przykład struktury tłumaczenia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black/30 dark:bg-white/5 rounded-xl p-4 overflow-auto">
              <pre className="text-xs font-mono text-muted-foreground">
{`{
  "settings": {
    "title": "Moja tytuł",
    "subtitle": "Moje podtytuł",
    "appearance": "Wygląd",
    "light": "Jasny",
    "dark": "Ciemny",
    "system": "System",
    "colorTheme": "Motyw Koloru",
    "language": "Język",
    "notifications": "Powiadomienia",
    "news": "Nowości",
    "newsDesc": "Opis nowości",
    "esport": "E-sport",
    "esportDesc": "Opis e-sport",
    "dev": "DEV",
    "devDesc": "Opis DEV",
    "themes": {
      "default": "Domyślny",
      "cyberpunk": "Cyberpunk",
      "midnight": "Midnight",
      "nature": "Nature",
      "gold": "Gold",
      "sunset": "Sunset"
    }
  },
  "nav": {
    "home": "Strona główna",
    "profile": "Profil",
    "games": "Games",
    "esport": "E-sport",
    "studio": "Studio",
    "dev": "Dev",
    "notifications": "Powiadomienia",
    "settings": "Ustawienia",
    "login": "Zaloguj się",
    "stats": "Statystyki",
    "online": "Online",
    "channels": "Kanały",
    "mainMenu": "Menu Główne",
    "searchPlaceholder": "Szukaj...",
    "newProject": "Wiadomości",
    "management": "Management"
  },
  "sections": {
    "games": {
      "subtitle": "Subtitle",
      "preview": "Preview",
      "title": "Title",
      "desc": "Desc"
    },
    "esport": {
      "subtitle": "Subtitle",
      "upcoming": "Upcoming",
      "today": "Today",
      "vs": "vs"
    },
    "records": {
      "subtitle": "Subtitle",
      "newRelease": "New Release",
      "listenNow": "Listen Now"
    },
    "dev": {
      "subtitle": "Subtitle",
      "projects": "Projects",
      "status": "Status"
    }
  },
  "home": {
    "newsTitle": "Title",
    "newsSubtitle": "Subtitle",
    "readMore": "Read More",
    "viewAll": "View All",
    "newsletterTitle": "Newsletter Title",
    "newsletterSubtitle": "Subtitle",
    "emailPlaceholder": "Placeholder",
    "subscribe": "Subscribe",
    "subscribeSuccess": "Success",
    "communityTitle": "Title",
    "messagesToday": "Messages",
    "onlineNow": "Online",
    "installApp": "Install",
    "installAppDesc": "Desc",
    "prototypeBadge": "PROTOTYPE",
    "prototypeVersion": "VERSION"
  },
  "auth": {
    "registerTitle": "Title",
    "registerSubtitle": "Subtitle",
    "fullName": "Full Name",
    "fullNamePlaceholder": "Placeholder",
    "email": "Email",
    "emailPlaceholder": "Placeholder",
    "password": "Password",
    "passwordPlaceholder": "Placeholder",
    "registerButton": "Button",
    "orContinueWith": "OR",
    "alreadyHaveAccount": "Question",
    "loginLink": "Link",
    "registerSuccess": "Success",
    "registerError": "Error",
    "loginTitle": "Title",
    "loginSubtitle": "Subtitle",
    "loginButton": "Button",
    "forgotPassword": "Question",
    "noAccount": "Question",
    "registerLink": "Link",
    "loginSuccess": "Success",
    "loginError": "Error",
    "oauthError": "Error"
  },
  "profile": {
    "level": "Level",
    "rank": "Rank",
    "nextLevel": "Next Level",
    "memberSince": "Member Since",
    "personalInfo": "Personal Info",
    "username": "Username",
    "saveChanges": "Save Changes",
    "recentActivity": "Activity",
    "management": "Management",
    "dangerZone": "Danger Zone",
    "logout": "Logout",
    "logoutDesc": "Desc"
  },
  "regulamin": {
    "title": "Title",
    "subtitle": "Subtitle",
    "accepted": "Accepted",
    "acceptError": "Error"
  },
  "rekrutacja": {
    "title": "Title",
    "subtitle": "Subtitle",
    "email": "Email",
    "name": "Name",
    "emailPlaceholder": "Placeholder",
    "namePlaceholder": "Placeholder",
    "discordRoles": "Roles",
    "backToHome": "Back"
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Available Languages Info */}
        <Card>
          <CardHeader>
            <CardTitle>Dostępne Języki</CardTitle>
            <CardDescription>
              Obecnie wspierane języki
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableLanguages.map((lang) => (
                <span
                  key={lang}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border",
                    language === lang
                      ? "bg-[var(--color-general)] text-white border-[var(--color-general)]"
                      : "bg-white/5 text-white/70 border-white/20 hover:border-white/40",
                  )}
                >
                  {lang.toUpperCase()}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-[var(--color-general)]/5 border-[var(--color-general)]/20">
          <CardHeader>
            <CardTitle>Instrukcja</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-general)] text-white flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <div>
                  <strong>Pobierz szablon:</strong> Przygotuj plik JSON z tłumaczeniami
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-general)] text-white flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <div>
                  <strong>Uzupełnij tłumaczenia:</strong> Nadaj wartości dla każdego pola
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-general)] text-white flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <div>
                  <strong>Importuj:</strong> Przeciągnij plik JSON do obszaru importu
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-general)] text-white flex items-center justify-center font-bold text-xs">
                  4
                </span>
                <div>
                  <strong>Użyj:</strong> Język zostanie dostępny w menu selektora
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
