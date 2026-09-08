export type Lang = "en" | "zh";

export type Localized = {
  en: string;
  zh: string;
};

export type Product = {
  code: string;
  brand: Localized;
  name: Localized;
  cat1: Localized;
  cat2: Localized;
  cat3: Localized;
  cat1Key: string;
  prices: Record<string, number>;
  offers: Record<string, string>;
  min: number;
  max: number;
  avg: number;
  spread: number;
  offerCount: number;
};

export type CategoryStat = {
  key: string;
  slug: string;
  name: Localized;
  short: Localized;
  food: boolean;
  productCount: number;
  avgMin: number;
  offerCount: number;
};

export type Catalog = {
  fetchedAt: string;
  sourceModified: string | null;
  products: Product[];
  categories: CategoryStat[];
  supermarketCounts: Record<string, number>;
  cheapestWins: Record<string, number>;
  stats: {
    productCount: number;
    offerCount: number;
    foodBasketAvg: number;
    allBasketAvg: number;
  };
};

export type TrendPoint = {
  date: string;
  foodAvg: number;
  allAvg: number;
  foodIndex: number;
  allIndex: number;
  categories: Record<string, number>;
};

export type Trends = {
  baseDate: string;
  points: TrendPoint[];
};

export type Folder = {
  id: string;
  name: string;
  createdAt: number;
};

export type Bookmark = {
  code: string;
  folderId: string;
  savedAt: number;
  savedMin: number;
};

export type BookmarkState = {
  folders: Folder[];
  bookmarks: Bookmark[];
};
