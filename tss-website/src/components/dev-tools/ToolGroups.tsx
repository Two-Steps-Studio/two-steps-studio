"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useLanguage } from "@/hooks/use-translation";
import { Segmented } from "./shared";

// The page's tab and subcategory live in the URL hash (#music/rhythm), so a
// link can point straight at a group of tools. replaceState keeps tab
// switches out of the back-button history.
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function useToolsRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash.slice(1), () => "");
  const [tab = "", cat = ""] = decodeURIComponent(hash).split("/");
  const setRoute = (nextTab: string, nextCat?: string) => {
    history.replaceState(null, "", `#${nextCat ? `${nextTab}/${nextCat}` : nextTab}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };
  return { tab, cat, setRoute };
}

export type ToolGroup = { id: string; title: string; content: ReactNode };

// Subcategory filter for one tab. Filtered-out groups stay mounted (just
// `hidden`), so switching subcategories doesn't stop a running metronome or
// throw away an analysis result.
export function ToolGroups({ tab, groups }: { tab: string; groups: ToolGroup[] }) {
  const { t } = useLanguage();
  const { tab: routeTab, cat, setRoute } = useToolsRoute();
  const active = routeTab === tab && groups.some((g) => g.id === cat) ? cat : "all";

  return (
    <div className="space-y-8">
      <Segmented
        options={[{ value: "all", label: t.devTools.catAll }, ...groups.map((g) => ({ value: g.id, label: g.title }))]}
        value={active}
        onChange={(value) => setRoute(tab, value === "all" ? undefined : value)}
        label={t.devTools.catLabel}
      />
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`dt-group-${tab}-${g.id}`} hidden={active !== "all" && active !== g.id} className="space-y-4">
          <h2 id={`dt-group-${tab}-${g.id}`} className="text-sm font-bold tracking-widest text-[var(--text-muted)] uppercase">
            {g.title}
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">{g.content}</div>
        </section>
      ))}
    </div>
  );
}
