import { CATEGORY_BY_KEY, isFoodCategory, slugForCategory } from "./categories";
import type { Catalog, CategoryStat, Localized, Product, TrendPoint, Trends } from "./types";

export const PRICEWATCH_JSON =
  "https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json";
export const PRICEWATCH_CSV_EN =
  "https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch_en.csv";
export const PACKAGE_SHOW =
  "https://data.gov.hk/en-data/api/3/action/package_show?id=cc-pricewatch-pricewatch";
export const HISTORICAL_LIST =
  "https://api.data.gov.hk/v1/historical-archive/list-file-versions";
export const HISTORICAL_GET =
  "https://api.data.gov.hk/v1/historical-archive/get-file";

type RawLocalized = {
  en?: string;
  "zh-Hant"?: string;
  "zh-Hans"?: string;
};

type RawProduct = {
  code: string;
  brand?: RawLocalized;
  name?: RawLocalized;
  cat1Name?: RawLocalized;
  cat2Name?: RawLocalized;
  cat3Name?: RawLocalized;
  prices?: { supermarketCode?: string; price?: string }[];
  offers?: { supermarketCode?: string; en?: string; "zh-Hant"?: string }[];
};

function toLocalized(raw?: RawLocalized): Localized {
  return {
    en: raw?.en?.trim() || "",
    zh: raw?.["zh-Hant"]?.trim() || raw?.en?.trim() || "",
  };
}

function parsePrice(value: string | number | undefined) {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function transformCatalog(
  raw: RawProduct[],
  sourceModified: string | null = null,
): Catalog {
  const supermarketCounts: Record<string, number> = {};
  const cheapestWins: Record<string, number> = {};
  const categoryBuckets = new Map<
    string,
    { mins: number[]; offerCount: number; name: Localized }
  >();

  const products: Product[] = [];

  for (const item of raw) {
    if (!item?.code) continue;
    const prices: Record<string, number> = {};
    for (const row of item.prices ?? []) {
      const code = row.supermarketCode;
      const price = parsePrice(row.price);
      if (!code || price == null) continue;
      prices[code] = price;
      supermarketCounts[code] = (supermarketCounts[code] ?? 0) + 1;
    }
    const values = Object.values(prices);
    if (values.length === 0) continue;

    const offers: Record<string, string> = {};
    for (const row of item.offers ?? []) {
      const code = row.supermarketCode;
      const text = (row["zh-Hant"] || row.en || "").trim();
      if (!code || !text) continue;
      offers[code] = text;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const cat1 = toLocalized(item.cat1Name);
    const cat1Key = cat1.en || "Other";
    const offerCount = Object.keys(offers).length;

    products.push({
      code: item.code,
      brand: toLocalized(item.brand),
      name: toLocalized(item.name),
      cat1,
      cat2: toLocalized(item.cat2Name),
      cat3: toLocalized(item.cat3Name),
      cat1Key,
      prices,
      offers,
      min,
      max,
      avg: average(values),
      spread: max - min,
      offerCount,
    });

    const bucket = categoryBuckets.get(cat1Key) ?? {
      mins: [],
      offerCount: 0,
      name: cat1,
    };
    bucket.mins.push(min);
    bucket.offerCount += offerCount;
    categoryBuckets.set(cat1Key, bucket);

    const cheapest = values.filter((v) => v === min);
    if (cheapest.length === 1) {
      const winner = Object.entries(prices).find(([, v]) => v === min)?.[0];
      if (winner) cheapestWins[winner] = (cheapestWins[winner] ?? 0) + 1;
    }
  }

  const categories: CategoryStat[] = [...categoryBuckets.entries()]
    .map(([key, bucket]) => {
      const meta = CATEGORY_BY_KEY.get(key);
      return {
        key,
        slug: slugForCategory(key),
        name: bucket.name,
        short: meta?.short ?? bucket.name,
        food: meta?.food ?? true,
        productCount: bucket.mins.length,
        avgMin: average(bucket.mins),
        offerCount: bucket.offerCount,
      };
    })
    .sort((a, b) => b.productCount - a.productCount);

  const foodMins = products.filter((p) => isFoodCategory(p.cat1Key)).map((p) => p.min);
  const allMins = products.map((p) => p.min);

  return {
    fetchedAt: new Date().toISOString(),
    sourceModified,
    products,
    categories,
    supermarketCounts,
    cheapestWins,
    stats: {
      productCount: products.length,
      offerCount: products.reduce((sum, p) => sum + p.offerCount, 0),
      foodBasketAvg: average(foodMins),
      allBasketAvg: average(allMins),
    },
  };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

type SnapshotAgg = {
  date: string;
  foodAvg: number;
  allAvg: number;
  categories: Record<string, number>;
};

export function aggregateCsvSnapshot(csv: string, date: string): SnapshotAgg | null {
  const rows = parseCsv(csv);
  if (rows.length < 2) return null;
  const header = rows[0].map((h) => h.trim());
  const catIdx = header.findIndex((h) => /category 1/i.test(h));
  const codeIdx = header.findIndex((h) => /product code/i.test(h));
  const priceIdx = header.findIndex((h) => /^price$/i.test(h));
  if (catIdx < 0 || codeIdx < 0 || priceIdx < 0) return null;

  const mins = new Map<string, { cat: string; min: number }>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = row[codeIdx]?.trim();
    const cat = row[catIdx]?.trim();
    const price = parsePrice(row[priceIdx]);
    if (!code || !cat || price == null) continue;
    const prev = mins.get(code);
    if (!prev || price < prev.min) mins.set(code, { cat, min: price });
  }

  const food: number[] = [];
  const all: number[] = [];
  const catMins: Record<string, number[]> = {};
  for (const { cat, min } of mins.values()) {
    all.push(min);
    if (isFoodCategory(cat)) food.push(min);
    (catMins[cat] ??= []).push(min);
  }
  if (all.length === 0) return null;

  const categories: Record<string, number> = {};
  for (const [key, values] of Object.entries(catMins)) {
    categories[key] = average(values);
  }

  return {
    date,
    foodAvg: average(food),
    allAvg: average(all),
    categories,
  };
}

export function buildTrends(snapshots: SnapshotAgg[]): Trends {
  const pointsReady = snapshots.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
  if (pointsReady.length === 0) {
    return { baseDate: "", points: [] };
  }
  const base = pointsReady[0];
  const points: TrendPoint[] = pointsReady.map((snap) => ({
    date: snap.date,
    foodAvg: snap.foodAvg,
    allAvg: snap.allAvg,
    foodIndex: base.foodAvg ? (snap.foodAvg / base.foodAvg) * 100 : 100,
    allIndex: base.allAvg ? (snap.allAvg / base.allAvg) * 100 : 100,
    categories: snap.categories,
  }));
  return { baseDate: base.date, points };
}

export function pickWeeklyTimestamps(timestamps: string[], count = 8) {
  const byWeek = new Map<string, string>();
  for (const stamp of timestamps) {
    const ymd = stamp.slice(0, 8);
    if (ymd.length !== 8) continue;
    const year = Number(ymd.slice(0, 4));
    const month = Number(ymd.slice(4, 6)) - 1;
    const day = Number(ymd.slice(6, 8));
    const date = new Date(Date.UTC(year, month, day));
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
    const key = weekStart.toISOString().slice(0, 10);
    byWeek.set(key, stamp);
  }
  return [...byWeek.values()].slice(-count);
}

export function stampToDate(stamp: string) {
  const ymd = stamp.slice(0, 8);
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}
