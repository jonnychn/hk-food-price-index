"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loc } from "@/lib/format";
import type { Catalog, Lang, Trends } from "@/lib/types";

export function IndexTrendChart({
  trends,
  lang,
}: {
  trends: Trends;
  lang: Lang;
}) {
  if (trends.points.length < 2) {
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        {lang === "zh"
          ? "歷史趨勢正在載入，或目前沒有足夠的週資料。"
          : "Trend history is loading, or there is not enough weekly data yet."}
      </p>
    );
  }

  const data = trends.points.map((p) => ({
    date: p.date.slice(5),
    index: Number(p.foodIndex.toFixed(2)),
    avg: Number(p.foodAvg.toFixed(2)),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={false}
            width={42}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              if (name === "index") return [`${n.toFixed(1)}`, lang === "zh" ? "食品指數" : "Food index"];
              return [`$${n.toFixed(2)}`, lang === "zh" ? "平均最低價" : "Avg min price"];
            }}
          />
          <Line
            type="monotone"
            dataKey="index"
            stroke="var(--primary)"
            strokeWidth={2.25}
            dot={{ r: 3, fill: "var(--primary)" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBars({ catalog, lang }: { catalog: Catalog; lang: Lang }) {
  const max = Math.max(...catalog.categories.map((c) => c.avgMin), 1);
  return (
    <div className="space-y-2.5">
      {catalog.categories.map((cat) => (
        <div key={cat.key} className="grid grid-cols-[7.5rem_1fr_3.5rem] items-center gap-2 sm:grid-cols-[9rem_1fr_4rem]">
          <div className="truncate text-xs font-medium text-foreground/80">
            {loc(lang, cat.short)}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary/80"
              style={{ width: `${(cat.avgMin / max) * 100}%` }}
            />
          </div>
          <div className="text-right font-mono text-xs tabular-nums text-muted-foreground">
            ${cat.avgMin.toFixed(1)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CheapestWins({ catalog, labels }: { catalog: Catalog; labels: Record<string, string> }) {
  const entries = Object.entries(catalog.cheapestWins).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, n]) => n), 1);
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {entries.map(([code, wins]) => (
        <div key={code} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-2">
          <div className="truncate text-xs font-medium">{labels[code] ?? code}</div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-chart-2"
              style={{ width: `${(wins / max) * 100}%` }}
            />
          </div>
          <div className="text-right font-mono text-xs tabular-nums text-muted-foreground">{wins}</div>
        </div>
      ))}
    </div>
  );
}
