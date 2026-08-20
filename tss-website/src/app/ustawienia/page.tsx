"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/hooks/use-translation";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sun, Moon, MonitorSmartphone, Languages, Check, Link2, Unlink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { setNotifStorage, setUiStorage } from "@/lib/storage";
import { getThemeSelectedClass, getThemeUnselectedClass } from "@/lib/theme-utilities";
import { useIsElectron } from "@/hooks/useElectron";
import SettingsPanel from "@/components/Electron/SettingsPanel";
import packageJson from "../../../package.json";

type Prefs = {
  animations: boolean;
  sounds: boolean;
  quality: boolean;
  notif_news: boolean;
  notif_esport: boolean;
  notif_dev: boolean;
};

type CategoryVisibility = {
  games: boolean;
  records: boolean;
  dev: boolean;
};
type ProjectLimits = {
  own_projects: { current: number; limit: number };
  joined_projects: { current: number; limit: number };
};

type Integration = {
  provider: string;
  username: string;
  avatar: string;
  connected: boolean;
  connectedAt: string;
};

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme: appearance, setTheme } = useTheme();
  const isElectron = useIsElectron();
  const [resolvedTheme, setResolvedTheme] = useState<string>("light");
  useEffect(() => {
    setResolvedTheme(typeof window !== "undefined" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : "light");
  }, []);
  const darkMode = resolvedTheme === "dark";
  const [prefs, setPrefs] = useState<Prefs>(() => ({
    animations: true,
    sounds: false,
    quality: true,
    notif_news: true,
    notif_esport: true,
    notif_dev: true,
  }));

  const [categoryVisibility, setCategoryVisibility] = useState<CategoryVisibility>({
    games: true,
    records: true,
    dev: true,
  });

  const [projectLimits, setProjectLimits] = useState<ProjectLimits>({
    own_projects: { current: 0, limit: 1 },
    joined_projects: { current: 0, limit: 3 },
  });

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [username, setUsername] = useState("");
  const [loadingUsername, setLoadingUsername] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  useEffect(() => {
    const loadLocalStorage = (): Prefs => ({
      animations: localStorage.getItem("ui-animations") !== "off",
      sounds: localStorage.getItem("ui-sounds") === "on",
      quality: localStorage.getItem("ui-quality") !== "low",
      notif_news: localStorage.getItem("notif-news") !== "off",
      notif_esport: localStorage.getItem("notif-esport") !== "off",
      notif_dev: localStorage.getItem("notif-dev") !== "off",
    });

    // Load category visibility and project limits from API
    const loadUserSettings = async () => {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const data = await response.json();
          setCategoryVisibility(data.visibility);
          setProjectLimits(data.limits);
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      }
    };

    // Load username from profile
    const loadUsername = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.username) {
            setUsername(profile.username);
          }
        }
      } catch (error) {
        console.error("Failed to load username:", error);
      }
    };

    // Load integrations
    const loadIntegrations = async () => {
      try {
        const response = await fetch("/api/integrations");
        if (response.ok) {
          const data = await response.json();
          setIntegrations(data.integrations || []);
        }
      } catch (error) {
        console.error("Failed to load integrations:", error);
      }
    };

    (async () => {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      if (!user) {
        return;
      }

      let currentPrefs = loadLocalStorage();

      const profileDataResult = await supabase
        .from("profiles")
        .select("settings")
        .eq("id", user.id)
        .single();

      const profileData = profileDataResult.data;

      if (profileData?.settings) {
        currentPrefs = {
          ...currentPrefs,
          ...profileData.settings,
        };
      }

      setPrefs(currentPrefs);
      setUiStorage("animations", profileData?.settings?.animations);
      setUiStorage("sounds", profileData?.settings?.sounds);
      setUiStorage("quality", profileData?.settings?.quality);
      setNotifStorage("notif_news", profileData?.settings?.notif_news);
      setNotifStorage("notif_esport", profileData?.settings?.notif_esport);
      setNotifStorage("notif_dev", profileData?.settings?.notif_dev);
      
      // Load category visibility and project limits
      await loadUserSettings();
      
      // Load username
      await loadUsername();
      
      // Load integrations
      await loadIntegrations();
    })();
  }, []);

  const setPref = async (key: keyof Prefs, value: string | boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setNotifStorage("notif_news", value);
    setNotifStorage("notif_esport", value);
    setNotifStorage("notif_dev", value);
    setUiStorage("animations", value);
    setUiStorage("sounds", value);
    setUiStorage("quality", value);
  };

  const setCategoryVisibilityPref = async (category: keyof CategoryVisibility, value: boolean) => {
    setLoadingSettings(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [`${category}_visible`]: value }),
      });
      if (response.ok) {
        setCategoryVisibility((prev) => ({ ...prev, [category]: value }));
        // Trigger custom event to notify Sidebar to refresh
        window.dispatchEvent(new CustomEvent('settings-updated', { detail: { category, value } }));
      } else {
        const errorData = await response.json();
        console.error("Failed to update category visibility:", errorData);
        alert(`Błąd: ${errorData.error || "Nie udało się zaktualizować ustawień"}`);
      }
    } catch (error) {
      console.error("Failed to update category visibility:", error);
      alert("Błąd połączenia. Sprawdź połączenie internetowe.");
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateUsername = async () => {
    setLoadingUsername(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (response.ok) {
        alert("Nazwa użytkownika zaktualizowana pomyślnie!");
      } else {
        const errorData = await response.json();
        console.error("Failed to update username:", errorData);
        alert(`Błąd: ${errorData.error || "Nie udało się zaktualizować nazwy użytkownika"}`);
      }
    } catch (error) {
      console.error("Failed to update username:", error);
      alert("Błąd połączenia. Sprawdź połączenie internetowe.");
    } finally {
      setLoadingUsername(false);
    }
  };

  const connectDiscord = async () => {
    setLoadingIntegrations(true);
    try {
      const response = await fetch("/api/integrations/discord/connect");
      if (response.ok) {
        const data = await response.json();
        // Store state for verification
        localStorage.setItem("discord_oauth_state", data.state);
        // Redirect to Discord OAuth
        window.location.href = data.authUrl;
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.error || "Nie udało się rozpocząć procesu łączenia"}`);
      }
    } catch (error) {
      console.error("Failed to connect Discord:", error);
      alert("Błąd połączenia. Sprawdź połączenie internetowe.");
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const disconnectDiscord = async () => {
    if (!confirm("Czy na pewno chcesz odłączyć konto Discord?")) {
      return;
    }

    setLoadingIntegrations(true);
    try {
      const response = await fetch("/api/integrations/discord/disconnect", {
        method: "POST",
      });
      if (response.ok) {
        setIntegrations((prev) => prev.filter((i) => i.provider !== "discord"));
        alert("Konto Discord odłączone pomyślnie!");
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.error || "Nie udało się odłączyć konta Discord"}`);
      }
    } catch (error) {
      console.error("Failed to disconnect Discord:", error);
      alert("Błąd połączenia. Sprawdź połączenie internetowe.");
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const syncDiscord = async () => {
    setLoadingIntegrations(true);
    try {
      const response = await fetch("/api/integrations/discord/sync", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        // Refresh integrations
        await loadIntegrations();
        alert("Dane Discord zsynchronizowane pomyślnie!");
      } else {
        const errorData = await response.json();
        alert(`Błąd: ${errorData.error || "Nie udało się zsynchronizować danych"}`);
      }
    } catch (error) {
      console.error("Failed to sync Discord:", error);
      alert("Błąd połączenia. Sprawdź połączenie internetowe.");
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const AppearanceOption = ({ value, icon: Icon, label }: { value: "light" | "dark" | "system"; icon: any; label: string }) => {
    return (
      <button
        onClick={() => setTheme(value)}
        className={`${getThemeUnselectedClass()} ${getThemeSelectedClass(darkMode)} rounded-xl border`}
      >
        <Icon className="text-[var(--color-general)] shrink-0 size-8" />
        <div className="text-center mt-1">
          <div className="text-sm font-black">{label}</div>
          {value === "light" && <div className="text-[10px] opacity-60 uppercase tracking-widest mt-1">Pełne światło</div>}
          {value === "dark" && <div className="text-[10px] opacity-60 uppercase tracking-widest mt-1">Komfort oczu</div>}
          {value === "system" && <div className="text-[10px] opacity-60 uppercase tracking-widest mt-1">Zgodnie z sys.</div>}
        </div>
      </button>
    );
  };


  return (
    <div className="container mx-auto p-6 mt-20 max-w-7xl transition-colors">
      <div className="relative overflow-hidden rounded-xl glass p-8 border-2 border-[var(--color-general)]/30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[var(--text)] font-[family-name:var(--font-space)]">USTAWIENIA</h1>
            <p className="mt-2 font-[family-name:var(--font-outfit)] text-zinc-400">{t.settings.subtitle}</p>
          </div>
          <Badge className="bg-[var(--color-general)]/15 text-[var(--color-general)] px-4 py-2 rounded-xl border-0">Twoja sesja</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="rounded-xl glass bg-white/0 dark:bg-black/40 border-2 border-[var(--border-color)] ">
          <CardHeader>
            <CardTitle className="text-[var(--text)]">{t.settings.appearance}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <AppearanceOption value="light" icon={Sun} label={t.settings.light} />
            <AppearanceOption value="dark" icon={Moon} label={t.settings.dark} />
            <AppearanceOption value="system" icon={MonitorSmartphone} label={t.settings.system} />
          </CardContent>
        </Card>

        <Card className="rounded-xl glass bg-white/0 dark:bg-black/40 border-2 border-[var(--color-general)]/30">
          <CardHeader>
            <CardTitle className="text-[var(--text)]">{t.settings.language}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setLanguage("pl")}
              className={`flex items-center gap-3 px-5 py-5 rounded-xl border transition-all ${language === "pl" ? "bg-[var(--color-general)]/15 border-[var(--color-general)]" : "bg-[var(--bg)]/50 border-[var(--border-color)]"}`}
            >
              <Languages className="text-[var(--color-general)]" />
              <div>
                <div className="text-lg font-black">PL</div>
                <div className="text-xs opacity-60">POLSKI</div>
              </div>
              {language === "pl" && <Check size={16} className="text-[var(--color-general)] ml-auto" />}
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`flex items-center gap-3 px-5 py-5 rounded-xl border transition-all ${language === "en" ? "bg-[var(--color-general)]/15 border-[var(--color-general)]" : "bg-[var(--bg)]/50 border-[var(--border-color)]"}`}
            >
              <Languages className="text-[var(--color-general)]" />
              <div>
                <div className="text-lg font-black">US</div>
                <div className="text-xs opacity-60">ENGLISH</div>
              </div>
              {language === "en" && <Check size={16} className="text-[var(--color-general)] ml-auto" />}
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="rounded-xl glass bg-white/0 dark:bg-black/40 border-2 border-[var(--color-general)]/30">
          <CardHeader>
            <CardTitle className="text-[var(--text)]">Interfejs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div className="font-medium">Animacje</div>
              <Switch checked={prefs.animations} onCheckedChange={(v) => setPref("animations", v)} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div className="font-medium">Dźwięki UI</div>
              <Switch checked={prefs.sounds} onCheckedChange={(v) => setPref("sounds", v)} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div className="font-medium">Wysoka jakość</div>
              <Switch checked={prefs.quality} onCheckedChange={(v) => setPref("quality", v)} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl glass bg-white/0 dark:bg-black/40 border-2 border-[var(--color-general)]/30">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-[var(--text)]">{t.settings.notifications}</CardTitle>
            <Badge className="bg-[var(--color-general)]/15 text-[var(--color-general)] px-3 py-1 rounded-xl border-0 text-xs">Bezpieczne dane</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div>
                <div className="font-medium text-[var(--text)]">{t.settings.news}</div>
                <div className="text-xs opacity-60 text-[var(--text)]">{t.settings.newsDesc}</div>
              </div>
              <Switch checked={prefs.notif_news} onCheckedChange={(v) => setPref("notif_news", v)} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div>
                <div className="font-medium text-[var(--text)]">{t.settings.dev}</div>
                <div className="text-xs opacity-60 text-[var(--text)]">{t.settings.devDesc}</div>
              </div>
              <Switch checked={prefs.notif_dev} onCheckedChange={(v) => setPref("notif_dev", v)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="rounded-xl glass bg-[var(--card-bg)] border-2 border-[var(--border-color)]">
          <CardHeader>
            <CardTitle className="text-[var(--text)]">Nazwa użytkownika</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Wpisz nazwę użytkownika..."
                className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg)] text-[var(--text)] placeholder:text-zinc-400/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-general)]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loadingUsername}
              />
              <Button
                onClick={updateUsername}
                disabled={loadingUsername || !username.trim()}
                variant="outline"
                className="px-4 py-3 border-[var(--border-color)] text-[var(--color-general)] hover:bg-[var(--color-general)]/20 disabled:opacity-50"
              >
                {loadingUsername ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl glass bg-[var(--card-bg)] border-2 border-[var(--color-general)]/30">
          <CardHeader>
            <CardTitle className="text-[var(--text)]">Integracje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {integrations.find((i) => i.provider === "discord") ? (
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg)]/50 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">D</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[var(--text)]">Discord</div>
                    <div className="text-sm opacity-60">{integrations.find((i) => i.provider === "discord")?.username}</div>
                  </div>
                  <Badge className="bg-green-500/15 text-green-500 px-3 py-1 rounded-xl border-0 text-xs">
                    Połączono
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={syncDiscord}
                    disabled={loadingIntegrations}
                    variant="outline"
                    className="flex-1 px-4 py-3 border-[var(--color-general)]/30 text-[var(--color-general)] hover:bg-[var(--color-general)]/20 disabled:opacity-50"
                  >
                    {loadingIntegrations ? "Synchronizowanie..." : "Zsynchronizuj dane"}
                  </Button>
                  <Button
                    onClick={disconnectDiscord}
                    disabled={loadingIntegrations}
                    variant="outline"
                    className="px-4 py-3 border-red-500/30 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-[var(--text)] font-bold text-xl">D</span>
                    </div>
                    <div>
                      <div className="font-bold text-[var(--text)]">Discord</div>
                      <div className="text-sm opacity-60">Połącz konto Discord</div>
                    </div>
                  </div>
                  <Button
                    onClick={connectDiscord}
                    disabled={loadingIntegrations}
                    variant="outline"
                    className="px-4 py-3 border-[var(--border-color)] text-[var(--color-general)] hover:bg-[var(--color-general)]/20 disabled:opacity-50"
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    {loadingIntegrations ? "Łączenie..." : "Połącz Discord"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="rounded-xl glass bg-white/0 dark:bg-black/40 border-2 border-[var(--color-general)]/30">
          <CardHeader>
            <CardTitle className="text-[var(--text)]">Widoczność kategorii</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div className="font-medium">Games</div>
              <Switch 
                checked={categoryVisibility.games} 
                onCheckedChange={(v) => setCategoryVisibilityPref("games", v)}
                disabled={loadingSettings}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div className="font-medium">Records</div>
              <Switch 
                checked={categoryVisibility.records} 
                onCheckedChange={(v) => setCategoryVisibilityPref("records", v)}
                disabled={loadingSettings}
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border-[var(--border-color)] bg-[var(--bg)]/50">
              <div className="font-medium">DEV</div>
              <Switch 
                checked={categoryVisibility.dev} 
                onCheckedChange={(v) => setCategoryVisibilityPref("dev", v)}
                disabled={loadingSettings}
              />
            </div>
          </CardContent>
        </Card>
        
      </div>

      <div className="mt-6">
        {isElectron && <SettingsPanel />}
        
        <Card className="rounded-xl glass bg-white/0 dark:bg-black/40 border-2 border-[var(--color-general)]/30">
          <CardContent className="flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Wersja aplikacji</span>
                <span className="text-2xl font-black font-mono text-[var(--text)]">
                    <span className="text-[var(--color-general)]">v{packageJson.version}</span>
          </span>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}