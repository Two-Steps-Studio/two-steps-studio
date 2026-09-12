"use client";

import { useEffect } from "react";

export function PresencePing() {
  useEffect(() => {
    let mounted = true;

    const ping = async () => {
      try {
        await fetch("/api/ping", { method: "GET", credentials: "include" });
      } catch {
        // ignore
      }
    };

    // 60s, not 30s: this runs on every single page for every visitor
    // (mounted in root layout), writing to site_sessions + site_presence
    // each time - the single biggest driver of sustained query/write volume
    // sitewide. get_unified_stats() only needs 5-minute granularity for its
    // online-count threshold, so halving this loses no real accuracy.
    ping();
    const interval = setInterval(ping, 60_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return null;
}
