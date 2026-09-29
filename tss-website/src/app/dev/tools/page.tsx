"use client";

import { Braces, Gamepad2, MessageSquare, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/use-translation";
import { DiscordTools } from "@/components/dev-tools/DiscordTools";
import { DataTools } from "@/components/dev-tools/DataTools";
import { GeneratorTools } from "@/components/dev-tools/GeneratorTools";
import { DesignTools } from "@/components/dev-tools/DesignTools";

// Explicit colors instead of the shadcn defaults (bg-muted / bg-background),
// which aren't defined in this theme and compile to no CSS.
// On phones the list is a 2x2 grid, so labels may wrap inside their cell.
const triggerClass =
  "min-w-0 flex-none whitespace-normal rounded-xl px-4 py-2 text-center text-[var(--text-muted)] data-[state=active]:bg-[var(--color-dev)]/15 data-[state=active]:text-[var(--text)] data-[state=active]:shadow-none sm:whitespace-nowrap";

export default function DevToolsPage() {
  const { t } = useLanguage();

  const tabs = [
    { value: "discord", label: t.devTools.tabDiscord, icon: MessageSquare, content: <DiscordTools /> },
    { value: "data", label: t.devTools.tabData, icon: Braces, content: <DataTools /> },
    { value: "generators", label: t.devTools.tabGenerators, icon: Sparkles, content: <GeneratorTools /> },
    { value: "design", label: t.devTools.tabDesign, icon: Gamepad2, content: <DesignTools /> },
  ];

  return (
    <div className="container mx-auto mt-20 max-w-6xl p-6">
      <div className="mb-10">
        <span className="mb-4 inline-block rounded-full border border-[var(--color-dev)]/40 bg-[var(--color-dev)]/15 px-3 py-1 text-xs font-bold tracking-widest text-[var(--text)]">
          DEV
        </span>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-[var(--text)] font-[family-name:var(--font-space)] md:text-5xl">
          {t.devTools.title}
        </h1>
        <p className="max-w-3xl text-lg text-[var(--text-muted)] font-[family-name:var(--font-outfit)]">{t.devTools.subtitle}</p>
      </div>

      <Tabs defaultValue="discord" className="gap-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-1 sm:inline-flex sm:w-fit">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className={triggerClass}>
              <Icon /> {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(({ value, content }) => (
          <TabsContent key={value} value={value}>
            {content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
