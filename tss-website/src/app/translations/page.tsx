"use client";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

export default function TranslationManagementPage() {
  const { availableLocales, locale, t } = useTranslation();

  return (
    <div className="min-h-screen bg-black/5 dark:bg-white/5 p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black mb-2">
              {t.pageTranslationsAdmin.title}
            </h1>
            <p className="text-muted-foreground">
              {t.pageTranslationsAdmin.subtitle}
            </p>
          </div>
        </div>

        {/* Example Translation Template */}
        <Card>
          <CardHeader>
            <CardTitle>{t.pageTranslationsAdmin.templateTitle}</CardTitle>
            <CardDescription>
              {t.pageTranslationsAdmin.templateDesc}
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
            <CardTitle>{t.pageTranslationsAdmin.availableLanguagesTitle}</CardTitle>
            <CardDescription>
              {t.pageTranslationsAdmin.availableLanguagesDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableLocales.map((l) => (
                <span
                  key={l}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold border",
                    locale === l
                      ? "bg-[var(--color-general)] text-white border-[var(--color-general)]"
                      : "bg-white/5 text-white/70 border-white/20 hover:border-white/40",
                  )}
                >
                  {l.toUpperCase()}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-[var(--color-general)]/5 border-[var(--color-general)]/20">
          <CardHeader>
            <CardTitle>{t.pageTranslationsAdmin.howToAddTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-general)] text-white flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <div>
                  <strong>{t.pageTranslationsAdmin.step1Title}</strong> {t.pageTranslationsAdmin.step1Desc} <code>src/locales/pl.json</code>,
                  <code> src/locales/en.json</code> {t.pageTranslationsAdmin.and} <code>src/locales/de.json</code>.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-general)] text-white flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <div>
                  <strong>{t.pageTranslationsAdmin.step2Title}</strong> {t.pageTranslationsAdmin.step2Desc} <code>npm run i18n:check</code>,
                  {t.pageTranslationsAdmin.step2Desc2}
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-general)] text-white flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <div>
                  <strong>{t.pageTranslationsAdmin.step3Title}</strong> <code>const &#123; t &#125; = useTranslation(); t(&quot;nav.home&quot;)</code>
                  {" "}{t.pageTranslationsAdmin.step3Or} <code>t.nav.home</code> {t.pageTranslationsAdmin.step3BackCompat}.
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
