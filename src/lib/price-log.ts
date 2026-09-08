import { uid } from "./bookmarks";
import { STAPLES } from "./staples";
import type { Localized } from "./types";

const KEY = "hkfpi.pricelog.v1";

export type TrackedItem = {
  id: string;
  name: Localized;
  unit: Localized;
  group: string;
  custom?: boolean;
};

export type PriceEntry = {
  id: string;
  itemId: string;
  placeId: string;
  date: string;
  price: number;
  note?: string;
};

export type CustomPlace = {
  id: string;
  name: string;
};

export type PriceLogState = {
  extras: TrackedItem[];
  places: CustomPlace[];
  entries: PriceEntry[];
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function emptyLog(): PriceLogState {
  return { extras: [], places: [], entries: [] };
}

export function loadPriceLog(): PriceLogState {
  if (!canUseStorage()) return emptyLog();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyLog();
    const parsed = JSON.parse(raw) as PriceLogState;
    return {
      extras: Array.isArray(parsed.extras) ? parsed.extras : [],
      places: Array.isArray(parsed.places) ? parsed.places : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return emptyLog();
  }
}

export function savePriceLog(state: PriceLogState) {
  if (!canUseStorage()) return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function allTrackedItems(state: PriceLogState): TrackedItem[] {
  const extras = state.extras.filter((item) => !STAPLES.some((s) => s.id === item.id));
  return [...STAPLES, ...extras];
}

export function addCustomItem(
  state: PriceLogState,
  name: string,
  unit: string,
  group = "produce",
): PriceLogState {
  const item: TrackedItem = {
    id: `custom-${uid()}`,
    name: { en: name, zh: name },
    unit: { en: unit || "each", zh: unit || "件" },
    group,
    custom: true,
  };
  return { ...state, extras: [...state.extras, item] };
}

export function removeCustomItem(state: PriceLogState, itemId: string): PriceLogState {
  return {
    ...state,
    extras: state.extras.filter((item) => item.id !== itemId),
    entries: state.entries.filter((entry) => entry.itemId !== itemId),
  };
}

export function addCustomPlace(state: PriceLogState, name: string): { state: PriceLogState; id: string } {
  const id = `place-${uid()}`;
  return {
    id,
    state: { ...state, places: [...state.places, { id, name }] },
  };
}

export function logTrip(
  state: PriceLogState,
  placeId: string,
  date: string,
  prices: Record<string, number>,
  note?: string,
): PriceLogState {
  const entries = [...state.entries];
  for (const [itemId, price] of Object.entries(prices)) {
    if (!Number.isFinite(price) || price <= 0) continue;
    entries.push({
      id: uid(),
      itemId,
      placeId,
      date,
      price,
      note: note || undefined,
    });
  }
  return { ...state, entries };
}

export function deleteEntry(state: PriceLogState, entryId: string): PriceLogState {
  return { ...state, entries: state.entries.filter((entry) => entry.id !== entryId) };
}

export function latestByPlace(entries: PriceEntry[], itemId: string) {
  const map: Record<string, PriceEntry> = {};
  for (const entry of entries) {
    if (entry.itemId !== itemId) continue;
    const prev = map[entry.placeId];
    if (!prev || entry.date > prev.date || (entry.date === prev.date && entry.id > prev.id)) {
      map[entry.placeId] = entry;
    }
  }
  return map;
}

export function entriesForItem(entries: PriceEntry[], itemId: string) {
  return entries
    .filter((entry) => entry.itemId === itemId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
