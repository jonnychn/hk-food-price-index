import type { Lang, Localized } from "./types";

export function loc(lang: Lang, value: Localized) {
  return lang === "zh" ? value.zh || value.en : value.en;
}

export function hkd(value: number) {
  return `$${value.toFixed(2)}`;
}

export function pct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDate(iso: string, lang: Lang) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(lang === "zh" ? "zh-HK" : "en-HK", {
    timeZone: "Asia/Hong_Kong",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatFetchedAt(iso: string, lang: Lang) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const stamp = date.toLocaleString(lang === "zh" ? "zh-HK" : "en-GB", {
    timeZone: "Asia/Hong_Kong",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${stamp} HKT`;
}

export function formatDay(isoDate: string, lang: Lang) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(lang === "zh" ? "zh-HK" : "en-HK", {
    month: "short",
    day: "numeric",
  });
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
