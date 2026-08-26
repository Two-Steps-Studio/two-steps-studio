 "use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/hooks/use-translation";

type Bucket = { t: string; total: number; logged_in: number; anonymous: number };
type Resp = { buckets: Bucket[]; bucket_minutes: number; window_hours: number };

export function OnlineChart() {
  const { t } = useLanguage();
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/site-stats-history")
      .then((r) => r.json())
      .then((d: Partial<Resp>) => {
        console.log("API response:", d);
        console.log("Buckets:", d?.buckets);
        if (!d || !Array.isArray(d.buckets)) {
          console.error("Invalid API response - buckets not an array");
          setData({
            buckets: [],
            bucket_minutes: 15,
            window_hours: 24,
          });
          setLoading(false);
          return;
        }
        const validBuckets = d.buckets.filter((b: any) =>
          b != null &&
          typeof b === 'object' &&
          typeof b.total === 'number' &&
          typeof b.logged_in === 'number' &&
          typeof b.anonymous === 'number' &&
          typeof b.t === 'string' &&
          !isNaN(b.total) &&
          !isNaN(b.logged_in) &&
          !isNaN(b.anonymous)
        );
        console.log("Valid buckets:", validBuckets);
        setData({
          buckets: validBuckets as Bucket[],
          bucket_minutes: typeof d.bucket_minutes === "number" ? d.bucket_minutes : 15,
          window_hours: typeof d.window_hours === "number" ? d.window_hours : 24,
        });
        setLoading(false);
      })
      .catch((e) => {
        console.error("Fetch error:", e);
        setData({
          buckets: [],
          bucket_minutes: 15,
          window_hours: 24,
        });
        setLoading(false);
      });
  }, []);

  const width = 900;
  const height = 260;
  const padding = { left: 40, right: 20, top: 20, bottom: 30 };

  const chart = useMemo(() => {
    try {
      if (!data || typeof data !== 'object' || !Array.isArray(data.buckets)) return null;
      const buckets = data.buckets.filter((b): b is Bucket =>
          b != null &&
          typeof b === 'object' &&
          b !== null &&
          'total' in b &&
          'logged_in' in b &&
          'anonymous' in b &&
          't' in b &&
          typeof b.total === 'number' &&
          typeof b.logged_in === 'number' &&
          typeof b.anonymous === 'number' &&
          typeof b.t === 'string' &&
          !isNaN(b.total) &&
          !isNaN(b.logged_in) &&
          !isNaN(b.anonymous)
        );
      if (!buckets || buckets.length === 0) return null;

      const xs: number[] = [];
      const ys: number[] = [];
      const ysLogged: number[] = [];
      const ysAnon: number[] = [];

      for (const b of buckets) {
        if (!b || typeof b !== 'object') continue;
        const date = new Date(b.t);
        const time = isNaN(date.getTime()) ? Date.now() : date.getTime();
        xs.push(time);
        ys.push(typeof b.total === 'number' && !isNaN(b.total) ? b.total : 0);
        ysLogged.push(typeof b.logged_in === 'number' && !isNaN(b.logged_in) ? b.logged_in : 0);
        ysAnon.push(typeof b.anonymous === 'number' && !isNaN(b.anonymous) ? b.anonymous : 0);
      }

      if (xs.length === 0 || ys.length === 0) return null;
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const yMax = Math.max(...ys, ...ysLogged, ...ysAnon, 1);
      const xRange = Math.max(xMax - xMin, 1);

      const xScale = (x: number) =>
        padding.left + ((x - xMin) / xRange) * (width - padding.left - padding.right);
      const yScale = (y: number) =>
        height - padding.bottom - (y / yMax) * (height - padding.top - padding.bottom);

      const pathFor = (arr: number[]) =>
        arr
          .map((y, i) => `${i === 0 ? "M" : "L"} ${xScale(xs[i]).toFixed(2)} ${yScale(y).toFixed(2)}`)
          .join(" ");

      return {
        total: pathFor(ys),
        logged: pathFor(ysLogged),
        anon: pathFor(ysAnon),
        xMin,
        xMax,
        yMax,
      };
    } catch {
      return null;
    }
  }, [data]);

  if (loading || !data) {
    return <div className="h-60 rounded-[2.5rem] bg-white/5 animate-pulse" />;
  }

  if (!chart) {
    return <div className="h-60 rounded-[2.5rem] bg-white/5 flex items-center justify-center text-white/50">
      No data available
    </div>;
  }

  const gridColor = "rgba(255,255,255,0.06)"; // Używa globalnego CSS dla trybu jasnego

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[260px]">
        <rect x={0} y={0} width={width} height={height} fill="transparent" />
        {Array.from({ length: 5 }).map((_, i) => {
          const y = 20 + ((height - 50) * i) / 4;
          return <line key={i} x1={40} x2={width - 20} y1={y} y2={y} stroke={gridColor} strokeWidth={1} />;
        })}
        <path d={chart.total} stroke="var(--color-general)" strokeWidth={2} fill="none" />
        <path d={chart.logged} stroke="var(--color-e-sport)" strokeWidth={2} fill="none" />
        <path d={chart.anon} stroke="var(--color-records)" strokeWidth={2} fill="none" />
        <text x={width - 20} y={20} textAnchor="end" fill="white" opacity={0.6} fontSize={12}>
          24h / {data?.bucket_minutes ?? 15}m
        </text>
      </svg>
      <div className="flex gap-6 px-2 py-2 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--color-general)" }} />
          <span>{t.compOnlineChart.total}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--color-e-sport)" }} />
          <span>{t.compOnlineChart.loggedIn}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: "var(--color-records)" }} />
          <span>{t.compOnlineChart.anonymous}</span>
        </div>
      </div>
    </div>
  );
}
