import { todayStamp } from "./format";
import { DEFAULT_STORE, SUPERMARKETS } from "./supermarkets";
import type { Bookmark, BookmarkState, Product } from "./types";

const BOOKMARK_KEY = "hkfpi.bookmarks.v1";
const HISTORY_KEY = "hkfpi.history.v1";
const LANG_KEY = "hkfpi.lang";
const STORE_KEY = "hkfpi.store";
const STORE_ONLY_KEY = "hkfpi.storeOnly";

export const DEFAULT_FOLDER_ID = "watchlist";

export type HistoryPoint = {
  date: string;
  min: number;
  prices: Record<string, number>;
};

export type HistoryMap = Record<string, HistoryPoint[]>;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function defaultBookmarkState(): BookmarkState {
  return {
    folders: [{ id: DEFAULT_FOLDER_ID, name: "Watchlist", createdAt: Date.now() }],
    bookmarks: [],
  };
}

export function loadBookmarks(): BookmarkState {
  if (!canUseStorage()) return defaultBookmarkState();
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return defaultBookmarkState();
    const parsed = JSON.parse(raw) as BookmarkState;
    if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.bookmarks)) {
      return defaultBookmarkState();
    }
    if (parsed.folders.length === 0) {
      parsed.folders = defaultBookmarkState().folders;
    }
    return parsed;
  } catch {
    return defaultBookmarkState();
  }
}

export function saveBookmarks(state: BookmarkState) {
  if (!canUseStorage()) return;
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(state));
}

export function loadHistory(): HistoryMap {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryMap) : {};
  } catch {
    return {};
  }
}

export function saveHistory(history: HistoryMap) {
  if (!canUseStorage()) return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function recordHistory(history: HistoryMap, products: Product[]): HistoryMap {
  const date = todayStamp();
  const next = { ...history };
  for (const product of products) {
    const series = next[product.code] ? [...next[product.code]] : [];
    const last = series[series.length - 1];
    if (last?.date === date) {
      series[series.length - 1] = {
        date,
        min: product.min,
        prices: product.prices,
      };
    } else {
      series.push({ date, min: product.min, prices: product.prices });
    }
    next[product.code] = series.slice(-90);
  }
  return next;
}

export function loadLang(): "en" | "zh" {
  if (!canUseStorage()) return "en";
  return localStorage.getItem(LANG_KEY) === "zh" ? "zh" : "en";
}

export function saveLang(lang: "en" | "zh") {
  if (!canUseStorage()) return;
  localStorage.setItem(LANG_KEY, lang);
}

export function loadStore() {
  if (!canUseStorage()) return DEFAULT_STORE;
  const value = localStorage.getItem(STORE_KEY);
  return value && value in SUPERMARKETS ? value : DEFAULT_STORE;
}

export function saveStore(code: string) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORE_KEY, code);
}

export function loadStoreOnly() {
  if (!canUseStorage()) return true;
  const value = localStorage.getItem(STORE_ONLY_KEY);
  if (value === null) return true;
  return value === "1";
}

export function saveStoreOnly(on: boolean) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORE_ONLY_KEY, on ? "1" : "0");
}

export function bookmarkFor(state: BookmarkState, code: string): Bookmark | undefined {
  return state.bookmarks.find((b) => b.code === code);
}

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
