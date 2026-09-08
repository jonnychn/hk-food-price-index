"use client";

import {
  Baby,
  Cookie,
  Croissant,
  CupSoda,
  House,
  LayoutGrid,
  Milk,
  Sparkles,
  UtensilsCrossed,
  Wheat,
  Wine,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loc } from "@/lib/format";
import type { Catalog, Lang } from "@/lib/types";

const ICONS: Record<string, typeof Wheat> = {
  "fresh-staples": Wheat,
  cooking: UtensilsCrossed,
  dairy: Milk,
  bakery: Croissant,
  snacks: Cookie,
  drinks: CupSoda,
  alcohol: Wine,
  baby: Baby,
  "personal-care": Sparkles,
  household: House,
};

export function CategoryNav({
  catalog,
  lang,
  activeSlug,
  onSelect,
  className,
}: {
  catalog: Catalog;
  lang: Lang;
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
  className?: string;
}) {
  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
          activeSlug === null
            ? "bg-primary text-primary-foreground"
            : "text-foreground/80 hover:bg-muted",
        )}
      >
        <LayoutGrid className="size-4 shrink-0" />
        <span className="flex-1 font-medium">{lang === "zh" ? "全部類別" : "All categories"}</span>
        <span className="font-mono text-xs opacity-80">{catalog.stats.productCount}</span>
      </button>
      {catalog.categories.map((cat) => {
        const Icon = ICONS[cat.slug] ?? LayoutGrid;
        const active = activeSlug === cat.slug;
        return (
          <button
            key={cat.slug}
            type="button"
            onClick={() => onSelect(cat.slug)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-muted",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium">{loc(lang, cat.short)}</span>
            <span className="font-mono text-xs opacity-80">{cat.productCount}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function CategoryChips({
  catalog,
  lang,
  activeSlug,
  onSelect,
}: {
  catalog: Catalog;
  lang: Lang;
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const chips = [
    { slug: null as string | null, label: lang === "zh" ? "全部" : "All", count: catalog.stats.productCount },
    ...catalog.categories.map((c) => ({
      slug: c.slug,
      label: loc(lang, c.short),
      count: c.productCount,
    })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((chip) => {
        const active = activeSlug === chip.slug;
        return (
          <button
            key={chip.slug ?? "all"}
            type="button"
            onClick={() => onSelect(chip.slug)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {chip.label}
            <span className="ml-1 font-mono opacity-70">{chip.count}</span>
          </button>
        );
      })}
    </div>
  );
}
