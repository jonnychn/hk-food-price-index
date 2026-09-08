"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  FolderPlus,
  MapPin,
  Search,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import { CategoryBars, CheapestWins, IndexTrendChart } from "@/components/charts";
import { CategoryChips, CategoryNav } from "@/components/category-nav";
import { createFolderIdFromSave, ProductSheet } from "@/components/product-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  bookmarkFor,
  DEFAULT_FOLDER_ID,
  loadBookmarks,
  loadHistory,
  loadLang,
  loadStore,
  loadStoreOnly,
  recordHistory,
  saveBookmarks,
  saveHistory,
  saveLang,
  saveStore,
  saveStoreOnly,
  uid,
  type HistoryMap,
} from "@/lib/bookmarks";
import { formatFetchedAt, hkd, loc, pct } from "@/lib/format";
import {
  DEFAULT_STORE,
  SUPERMARKET_ORDER,
  supermarketLabel,
} from "@/lib/supermarkets";
import type { BookmarkState, Catalog, Lang, Product, Trends } from "@/lib/types";

type SortKey = "store" | "cheap" | "spread" | "offers" | "name";
type View = "browse" | "saved";

const PAGE_SIZE = 36;

export function PriceApp() {
  const [lang, setLang] = useState<Lang>("en");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [catSlug, setCatSlug] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("store");
  const [view, setView] = useState<View>("browse");
  const [selected, setSelected] = useState<Product | null>(null);
  const [bookmarks, setBookmarks] = useState<BookmarkState | null>(null);
  const [history, setHistory] = useState<HistoryMap>({});
  const [activeFolder, setActiveFolder] = useState(DEFAULT_FOLDER_ID);
  const [page, setPage] = useState(1);
  const [folderName, setFolderName] = useState("");
  const [preferredStore, setPreferredStore] = useState(DEFAULT_STORE);
  const [storeOnly, setStoreOnly] = useState(true);

  useEffect(() => {
    setLang(loadLang());
    const stored = loadBookmarks();
    setBookmarks(stored);
    setHistory(loadHistory());
    setPreferredStore(loadStore());
    setStoreOnly(loadStoreOnly());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalog")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Failed to load prices");
        return body as Catalog;
      })
      .then((data) => {
        if (cancelled) return;
        setCatalog(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load prices");
      });
    fetch("/api/trends")
      .then((res) => res.json())
      .then((data: Trends) => {
        if (!cancelled) setTrends(data);
      })
      .catch(() => {
        if (!cancelled) setTrends({ baseDate: "", points: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!catalog || !bookmarks) return;
    const tracked = catalog.products.filter((p) =>
      bookmarks.bookmarks.some((b) => b.code === p.code),
    );
    if (tracked.length === 0) return;
    const next = recordHistory(history, tracked);
    setHistory(next);
    saveHistory(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, bookmarks?.bookmarks.length]);

  const updateBookmarks = useCallback((next: BookmarkState) => {
    setBookmarks(next);
    saveBookmarks(next);
  }, []);

  const productsByCode = useMemo(() => {
    const map = new Map<string, Product>();
    catalog?.products.forEach((p) => map.set(p.code, p));
    return map;
  }, [catalog]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    let list = catalog.products;
    if (catSlug) list = list.filter((p) => p.cat1Key && slugMatch(catalog, p, catSlug));
    if (storeOnly) list = list.filter((p) => p.prices[preferredStore] != null);
    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.code,
          p.brand.en,
          p.brand.zh,
          p.name.en,
          p.name.zh,
          p.cat1.en,
          p.cat1.zh,
          p.cat2.en,
          p.cat2.zh,
          p.cat3.en,
          p.cat3.zh,
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === "store") {
        const pa = a.prices[preferredStore];
        const pb = b.prices[preferredStore];
        if (pa == null && pb == null) return a.min - b.min;
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb;
      }
      if (sort === "cheap") return a.min - b.min;
      if (sort === "spread") return b.spread - a.spread;
      if (sort === "offers") return b.offerCount - a.offerCount || a.min - b.min;
      const an = `${a.brand.en} ${a.name.en}`.toLowerCase();
      const bn = `${b.brand.en} ${b.name.en}`.toLowerCase();
      return an.localeCompare(bn);
    });
    return sorted;
  }, [catalog, query, catSlug, sort, preferredStore, storeOnly]);

  useEffect(() => {
    setPage(1);
  }, [query, catSlug, sort, view, preferredStore, storeOnly]);

  function changeStore(code: string) {
    setPreferredStore(code);
    saveStore(code);
  }

  function changeStoreOnly(on: boolean) {
    setStoreOnly(on);
    saveStoreOnly(on);
  }

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const indexDelta = useMemo(() => {
    if (!trends || trends.points.length < 2) return null;
    const first = trends.points[0];
    const last = trends.points[trends.points.length - 1];
    return {
      index: last.foodIndex,
      change: last.foodIndex - first.foodIndex,
      from: first.date,
      to: last.date,
    };
  }, [trends]);

  const supermarketLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    if (!catalog) return labels;
    for (const code of Object.keys(catalog.cheapestWins)) {
      labels[code] = supermarketLabel(code, lang);
    }
    return labels;
  }, [catalog, lang]);

  function toggleLang() {
    const next = lang === "en" ? "zh" : "en";
    setLang(next);
    saveLang(next);
  }

  function saveProduct(product: Product, folderToken: string) {
    if (!bookmarks) return;
    const created = createFolderIdFromSave(folderToken);
    const folders = created ? [...bookmarks.folders, { ...created, createdAt: Date.now() }] : bookmarks.folders;
    const folderId = created?.id ?? folderToken;
    const bookmarksNext = bookmarks.bookmarks.filter((b) => b.code !== product.code);
    bookmarksNext.push({
      code: product.code,
      folderId,
      savedAt: Date.now(),
      savedMin: product.min,
    });
    updateBookmarks({ folders, bookmarks: bookmarksNext });
    const nextHistory = recordHistory(history, [product]);
    setHistory(nextHistory);
    saveHistory(nextHistory);
  }

  function unsaveProduct(code: string) {
    if (!bookmarks) return;
    updateBookmarks({
      ...bookmarks,
      bookmarks: bookmarks.bookmarks.filter((b) => b.code !== code),
    });
  }

  const copy = {
    title: lang === "zh" ? "香港食品格價指數" : "HK Food Price Index",
    subtitle:
      lang === "zh"
        ? "消費者委員會「格價資訊通」公開數據 · 搜尋、比較、收藏"
        : "Consumer Council Online Price Watch · search, compare, bookmark",
    search: lang === "zh" ? "搜尋品牌、貨品、類別…" : "Search brand, product, category…",
    browse: lang === "zh" ? "瀏覽" : "Browse",
    saved: lang === "zh" ? "收藏" : "Saved",
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingBasket className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-tight">{copy.title}</div>
                <div className="hidden truncate text-[11px] text-muted-foreground sm:block">
                  {copy.subtitle}
                </div>
              </div>
            </div>
            <div className="ml-auto hidden min-w-0 flex-1 md:block md:max-w-md">
              <SearchBox query={query} setQuery={setQuery} placeholder={copy.search} />
            </div>
            <StorePicker
              lang={lang}
              preferredStore={preferredStore}
              onChange={changeStore}
            />
            <Button variant="outline" size="sm" onClick={toggleLang}>
              {lang === "zh" ? "EN" : "繁"}
            </Button>
            <Button
              variant={view === "saved" ? "default" : "outline"}
              size="sm"
              onClick={() => setView(view === "saved" ? "browse" : "saved")}
            >
              <Bookmark data-icon="inline-start" />
              <span className="hidden sm:inline">{copy.saved}</span>
              <span className="font-mono text-xs">{bookmarks?.bookmarks.length ?? 0}</span>
            </Button>
          </div>
          <div className="border-t border-border/60 px-4 py-2 md:hidden">
            <SearchBox query={query} setQuery={setQuery} placeholder={copy.search} />
          </div>
          {catalog ? (
            <div className="border-t border-border/60 px-4 py-1.5 text-[11px] text-muted-foreground">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  {lang === "zh" ? "價格擷取於" : "Prices fetched"}{" "}
                  <span className="font-medium text-foreground/80">
                    {formatFetchedAt(catalog.fetchedAt, lang)}
                  </span>
                </span>
                {catalog.sourceModified ? (
                  <span className="hidden sm:inline">
                    · {lang === "zh" ? "消委會資料" : "Council file"}{" "}
                    {formatFetchedAt(catalog.sourceModified, lang)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-4 pb-24 md:pb-8">
          {catalog ? (
            <aside className="hidden w-56 shrink-0 md:block">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-2">
                <CategoryNav
                  catalog={catalog}
                  lang={lang}
                  activeSlug={view === "browse" ? catSlug : null}
                  onSelect={(slug) => {
                    setView("browse");
                    setCatSlug(slug);
                  }}
                />
              </div>
            </aside>
          ) : (
            <aside className="hidden w-56 shrink-0 md:block">
              <Skeleton className="h-[28rem] rounded-xl" />
            </aside>
          )}

          <main className="min-w-0 flex-1">
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>{lang === "zh" ? "無法載入價格" : "Could not load prices"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {!catalog && !error ? <LoadingState lang={lang} /> : null}

            {catalog && view === "browse" ? (
              <BrowseView
                catalog={catalog}
                trends={trends}
                lang={lang}
                catSlug={catSlug}
                setCatSlug={setCatSlug}
                sort={sort}
                setSort={setSort}
                filteredCount={filtered.length}
                visible={visible}
                hasMore={visible.length < filtered.length}
                onMore={() => setPage((p) => p + 1)}
                onOpen={setSelected}
                bookmarks={bookmarks}
                supermarketLabels={supermarketLabels}
                indexDelta={indexDelta}
                preferredStore={preferredStore}
                storeOnly={storeOnly}
                onStoreOnly={changeStoreOnly}
              />
            ) : null}

            {catalog && view === "saved" && bookmarks ? (
              <SavedView
                lang={lang}
                catalog={catalog}
                bookmarks={bookmarks}
                productsByCode={productsByCode}
                activeFolder={activeFolder}
                setActiveFolder={setActiveFolder}
                folderName={folderName}
                setFolderName={setFolderName}
                onCreateFolder={() => {
                  const name = folderName.trim();
                  if (!name) return;
                  updateBookmarks({
                    ...bookmarks,
                    folders: [...bookmarks.folders, { id: uid(), name, createdAt: Date.now() }],
                  });
                  setFolderName("");
                }}
                onDeleteFolder={(id) => {
                  if (id === DEFAULT_FOLDER_ID) return;
                  updateBookmarks({
                    folders: bookmarks.folders.filter((f) => f.id !== id),
                    bookmarks: bookmarks.bookmarks.filter((b) => b.folderId !== id),
                  });
                  setActiveFolder(DEFAULT_FOLDER_ID);
                }}
                onOpen={setSelected}
                onUnsave={unsaveProduct}
                preferredStore={preferredStore}
              />
            ) : null}
          </main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-2 backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
            <Button variant={view === "browse" ? "default" : "ghost"} onClick={() => setView("browse")}>
              {copy.browse}
            </Button>
            <Button variant={view === "saved" ? "default" : "ghost"} onClick={() => setView("saved")}>
              {copy.saved}
              <span className="font-mono text-xs">{bookmarks?.bookmarks.length ?? 0}</span>
            </Button>
          </div>
        </nav>

        <ProductSheet
          product={selected}
          lang={lang}
          open={Boolean(selected)}
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          bookmarkState={bookmarks ?? { folders: [], bookmarks: [] }}
          history={selected ? history[selected.code] ?? [] : []}
          onSave={(folderToken) => {
            if (selected) saveProduct(selected, folderToken);
          }}
          onUnsave={() => {
            if (selected) unsaveProduct(selected.code);
          }}
          preferredStore={preferredStore}
          fetchedAt={catalog?.fetchedAt ?? null}
        />
      </div>
    </TooltipProvider>
  );
}

function slugMatch(catalog: Catalog, product: Product, slug: string) {
  const cat = catalog.categories.find((c) => c.slug === slug);
  return cat ? product.cat1Key === cat.key : false;
}

function SearchBox({
  query,
  setQuery,
  placeholder,
}: {
  query: string;
  setQuery: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="h-9 bg-card pl-8"
      />
    </div>
  );
}

function LoadingState({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <p className="text-center text-sm text-muted-foreground">
        {lang === "zh" ? "正在讀取格價資訊通…" : "Loading Online Price Watch…"}
      </p>
    </div>
  );
}

function BrowseView({
  catalog,
  trends,
  lang,
  catSlug,
  setCatSlug,
  sort,
  setSort,
  filteredCount,
  visible,
  hasMore,
  onMore,
  onOpen,
  bookmarks,
  supermarketLabels,
  indexDelta,
  preferredStore,
  storeOnly,
  onStoreOnly,
}: {
  catalog: Catalog;
  trends: Trends | null;
  lang: Lang;
  catSlug: string | null;
  setCatSlug: (slug: string | null) => void;
  sort: SortKey;
  setSort: (sort: SortKey) => void;
  filteredCount: number;
  visible: Product[];
  hasMore: boolean;
  onMore: () => void;
  onOpen: (product: Product) => void;
  bookmarks: BookmarkState | null;
  supermarketLabels: Record<string, string>;
  indexDelta: { index: number; change: number; from: string; to: string } | null;
  preferredStore: string;
  storeOnly: boolean;
  onStoreOnly: (on: boolean) => void;
}) {
  const activeCat = catalog.categories.find((c) => c.slug === catSlug);
  return (
    <div className="space-y-5">
      <div className="md:hidden">
        <CategoryChips catalog={catalog} lang={lang} activeSlug={catSlug} onSelect={setCatSlug} />
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>{lang === "zh" ? "食品籃平均最低價" : "Food basket avg min"}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {hkd(catalog.stats.foodBasketAvg)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{lang === "zh" ? "食品價格指數" : "Food price index"}</CardDescription>
            <CardTitle className="flex items-baseline gap-2 font-mono text-2xl tabular-nums">
              {indexDelta ? indexDelta.index.toFixed(1) : "—"}
              {indexDelta ? (
                <span className={indexDelta.change <= 0 ? "text-sm text-emerald-700" : "text-sm text-red-700"}>
                  {pct(indexDelta.change)}
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{lang === "zh" ? "貨品 / 優惠" : "Products / offers"}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">
              {catalog.stats.productCount}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                / {catalog.stats.offerCount}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{lang === "zh" ? "食品指數走勢" : "Food index trend"}</CardTitle>
            <CardDescription>
              {lang === "zh"
                ? "以每件貨品的超市最低價平均，基期 = 100。數據來自 data.gov.hk 歷史存檔。"
                : "Average of each item’s cheapest supermarket price, base = 100. Built from data.gov.hk historical archives."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trends ? <IndexTrendChart trends={trends} lang={lang} /> : <Skeleton className="h-56" />}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{lang === "zh" ? "類別平均最低價" : "Category avg min"}</CardTitle>
            <CardDescription>
              {lang === "zh" ? "今日各類別最平超市價的平均" : "Today’s average cheapest shelf price"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBars catalog={catalog} lang={lang} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{lang === "zh" ? "邊間最常最平" : "Who is cheapest most often"}</CardTitle>
          <CardDescription>
            {lang === "zh"
              ? "獨佔最低價的貨品數量（並列最低不計）"
              : "Unique lowest-price wins (ties excluded)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheapestWins catalog={catalog} labels={supermarketLabels} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {activeCat ? loc(lang, activeCat.short) : lang === "zh" ? "全部類別" : "All categories"}
          <span className="ml-2 font-mono">{filteredCount}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={storeOnly ? "default" : "outline"}
            size="sm"
            onClick={() => onStoreOnly(!storeOnly)}
          >
            {storeOnly
              ? lang === "zh"
                ? `只看${supermarketLabel(preferredStore, lang)}`
                : `Only ${supermarketLabel(preferredStore, lang)}`
              : lang === "zh"
                ? "所有超市"
                : "All stores"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={
                "inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
              }
            >
              {sortLabel(sort, lang, preferredStore)}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <DropdownMenuRadioItem value="store">
                  {lang === "zh"
                    ? `${supermarketLabel(preferredStore, lang)}價錢`
                    : `${supermarketLabel(preferredStore, lang)} price`}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="cheap">
                  {lang === "zh" ? "全港最低價" : "Lowest anywhere"}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="spread">
                  {lang === "zh" ? "價差最大" : "Biggest spread"}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="offers">
                  {lang === "zh" ? "最多優惠" : "Most offers"}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name">
                  {lang === "zh" ? "名稱" : "Name"}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ProductGrid
        products={visible}
        lang={lang}
        bookmarks={bookmarks}
        onOpen={onOpen}
        preferredStore={preferredStore}
      />
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onMore}>
            {lang === "zh" ? "顯示更多" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SavedView({
  lang,
  catalog,
  bookmarks,
  productsByCode,
  activeFolder,
  setActiveFolder,
  folderName,
  setFolderName,
  onCreateFolder,
  onDeleteFolder,
  onOpen,
  onUnsave,
  preferredStore,
}: {
  lang: Lang;
  catalog: Catalog;
  bookmarks: BookmarkState;
  productsByCode: Map<string, Product>;
  activeFolder: string;
  setActiveFolder: (id: string) => void;
  folderName: string;
  setFolderName: (name: string) => void;
  onCreateFolder: () => void;
  onDeleteFolder: (id: string) => void;
  onOpen: (product: Product) => void;
  onUnsave: (code: string) => void;
  preferredStore: string;
}) {
  const items = bookmarks.bookmarks.filter((b) => b.folderId === activeFolder);
  const products = items
    .map((b) => {
      const product = productsByCode.get(b.code);
      return product ? { product, bookmark: b } : null;
    })
    .filter((row): row is { product: Product; bookmark: (typeof items)[number] } => row !== null);

  const storeTotals = useMemo(() => {
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const { product } of products) {
      for (const [code, price] of Object.entries(product.prices)) {
        const row = totals[code] ?? { sum: 0, count: 0 };
        row.sum += price;
        row.count += 1;
        totals[code] = row;
      }
    }
    return Object.entries(totals).sort((a, b) => {
      if (a[0] === preferredStore) return -1;
      if (b[0] === preferredStore) return 1;
      return a[1].sum - b[1].sum;
    });
  }, [products, preferredStore]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {bookmarks.folders.map((folder) => {
          const count = bookmarks.bookmarks.filter((b) => b.folderId === folder.id).length;
          const label =
            folder.id === DEFAULT_FOLDER_ID ? (lang === "zh" ? "觀察清單" : folder.name) : folder.name;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => setActiveFolder(folder.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                activeFolder === folder.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              {label}
              <span className="ml-1 font-mono opacity-80">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          placeholder={lang === "zh" ? "新資料夾名稱" : "New folder name"}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={onCreateFolder}>
          <FolderPlus data-icon="inline-start" />
          {lang === "zh" ? "新增" : "Add"}
        </Button>
        {activeFolder !== DEFAULT_FOLDER_ID ? (
          <Button variant="ghost" size="sm" onClick={() => onDeleteFolder(activeFolder)}>
            <Trash2 data-icon="inline-start" />
            {lang === "zh" ? "刪除資料夾" : "Delete folder"}
          </Button>
        ) : null}
      </div>

      {storeTotals.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{lang === "zh" ? "此資料夾超市總額" : "Folder supermarket totals"}</CardTitle>
            <CardDescription>
              {lang === "zh"
                ? "只加總該超市有售的貨品，件數不同時勿直接比較。"
                : "Sums only items stocked by that chain — counts can differ."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {storeTotals.map(([code, row]) => (
              <Badge key={code} variant={code === preferredStore ? "default" : "secondary"}>
                {supermarketLabel(code, lang)} {hkd(row.sum)}
                <span className="ml-1 opacity-70">({row.count})</span>
                {code === preferredStore
                  ? lang === "zh"
                    ? " · 你的超市"
                    : " · yours"
                  : ""}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {lang === "zh"
              ? "這個資料夾還是空的。在瀏覽頁把貨品收藏進來。"
              : "This folder is empty. Bookmark items from Browse to start tracking."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map(({ product, bookmark }) => {
            const storePrice = product.prices[preferredStore];
            const compare = storePrice ?? product.min;
            const delta = compare - bookmark.savedMin;
            return (
              <button
                key={product.code}
                type="button"
                onClick={() => onOpen(product)}
                className="rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">{loc(lang, product.brand)}</div>
                    <div className="text-sm font-medium text-balance">
                      {loc(lang, product.name)}
                    </div>
                  </div>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnsave(product.code);
                    }}
                  >
                    <BookmarkCheck className="size-4 text-primary" />
                  </Button>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="font-mono text-lg tabular-nums">
                    {storePrice != null ? hkd(storePrice) : hkd(product.min)}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      delta < 0 ? "text-emerald-700" : delta > 0 ? "text-red-700" : "text-muted-foreground"
                    }`}
                  >
                    {delta === 0
                      ? lang === "zh"
                        ? "與收藏時相同"
                        : "Same as saved"
                      : `${delta > 0 ? "+" : ""}${hkd(delta)}`}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {storePrice != null
                    ? supermarketLabel(preferredStore, lang)
                    : lang === "zh"
                      ? `此店沒有 · 最低 ${hkd(product.min)}`
                      : `Not at your store · lowest ${hkd(product.min)}`}
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {catalog.stats.productCount} {lang === "zh" ? "件公開貨品" : "public products"} · Consumer Council
      </p>
    </div>
  );
}

function ProductGrid({
  products,
  lang,
  bookmarks,
  onOpen,
  preferredStore,
}: {
  products: Product[];
  lang: Lang;
  bookmarks: BookmarkState | null;
  onOpen: (product: Product) => void;
  preferredStore: string;
}) {
  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {lang === "zh" ? "沒有符合的貨品。" : "No products match this search."}
        </CardContent>
      </Card>
    );
  }

  const storeName = supermarketLabel(preferredStore, lang);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const saved = bookmarks ? Boolean(bookmarkFor(bookmarks, product.code)) : false;
        const storePrice = product.prices[preferredStore];
        const extra = storePrice != null ? storePrice - product.min : null;
        const cheapest = Object.entries(product.prices).find(([, v]) => v === product.min)?.[0];
        return (
          <button
            key={product.code}
            type="button"
            onClick={() => onOpen(product)}
            className="rounded-xl border border-border bg-card p-4 text-left shadow-xs transition-colors hover:bg-muted/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-xs text-muted-foreground">{loc(lang, product.brand)}</div>
                <div className="text-sm font-medium text-balance">{loc(lang, product.name)}</div>
              </div>
              {saved ? (
                <BookmarkCheck className="size-4 shrink-0 text-primary" />
              ) : (
                <Bookmark className="size-4 shrink-0 text-muted-foreground" />
              )}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {loc(lang, product.cat2)} · {loc(lang, product.cat3)}
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                {storePrice != null ? (
                  <>
                    <div className="font-mono text-lg font-medium tabular-nums">{hkd(storePrice)}</div>
                    <div className="text-[11px] text-muted-foreground">{storeName}</div>
                    {extra != null && extra > 0 && cheapest ? (
                      <div className="text-[11px] text-amber-800">
                        {lang === "zh"
                          ? `${supermarketLabel(cheapest, lang)}平 ${hkd(extra)}`
                          : `${hkd(extra)} cheaper at ${supermarketLabel(cheapest, lang)}`}
                      </div>
                    ) : extra === 0 ? (
                      <div className="text-[11px] text-emerald-700">
                        {lang === "zh" ? "已是最低" : "Lowest price"}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="text-sm font-medium text-muted-foreground">
                      {lang === "zh" ? `${storeName}沒有` : `Not at ${storeName}`}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-muted-foreground">
                      {lang === "zh" ? "最低" : "lowest"} {hkd(product.min)}
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {product.offers[preferredStore] ? (
                  <Badge variant="outline">{lang === "zh" ? "本店優惠" : "Store offer"}</Badge>
                ) : product.offerCount > 0 ? (
                  <Badge variant="outline">
                    {product.offerCount} {lang === "zh" ? "優惠" : "offers"}
                  </Badge>
                ) : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function StorePicker({
  lang,
  preferredStore,
  onChange,
}: {
  lang: Lang;
  preferredStore: string;
  onChange: (code: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 max-w-[9.5rem] items-center gap-1 truncate rounded-lg border border-border bg-background px-2 text-xs font-medium hover:bg-muted sm:max-w-none sm:px-2.5 sm:text-[0.8rem]"
      >
        <MapPin className="size-3.5 shrink-0" />
        <span className="truncate">{supermarketLabel(preferredStore, lang)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={preferredStore} onValueChange={onChange}>
          {SUPERMARKET_ORDER.map((code) => (
            <DropdownMenuRadioItem key={code} value={code}>
              {supermarketLabel(code, lang)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function sortLabel(sort: SortKey, lang: Lang, preferredStore: string) {
  if (sort === "store") {
    return lang === "zh"
      ? `排序：${supermarketLabel(preferredStore, lang)}`
      : `Sort: ${supermarketLabel(preferredStore, lang)}`;
  }
  if (sort === "cheap") return lang === "zh" ? "排序：全港最低" : "Sort: lowest anywhere";
  if (sort === "spread") return lang === "zh" ? "排序：價差" : "Sort: spread";
  if (sort === "offers") return lang === "zh" ? "排序：優惠" : "Sort: offers";
  return lang === "zh" ? "排序：名稱" : "Sort: name";
}
