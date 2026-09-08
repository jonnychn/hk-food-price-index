export const SUPERMARKETS: Record<
  string,
  { en: string; zh: string; short: string }
> = {
  WELLCOME: { en: "Wellcome", zh: "惠康", short: "Wellcome" },
  PARKNSHOP: { en: "PARKnSHOP", zh: "百佳", short: "PNS" },
  JASONS: { en: "Market Place", zh: "Market Place", short: "Jasons" },
  AEON: { en: "AEON", zh: "永旺", short: "AEON" },
  WATSONS: { en: "Watsons", zh: "屈臣氏", short: "Watsons" },
  MANNINGS: { en: "Mannings", zh: "萬寧", short: "Mannings" },
  LUNGFUNG: { en: "Lung Fung", zh: "龍豐", short: "Lung Fung" },
  DCHFOOD: { en: "DCH Food", zh: "大昌食品", short: "DCH" },
  SASA: { en: "SaSa", zh: "莎莎", short: "SaSa" },
};

export const SUPERMARKET_ORDER = [
  "WELLCOME",
  "PARKNSHOP",
  "JASONS",
  "AEON",
  "WATSONS",
  "MANNINGS",
  "LUNGFUNG",
  "DCHFOOD",
  "SASA",
] as const;

export const SUPERMARKET_COLORS: Record<string, string> = {
  WELLCOME: "#c2410c",
  PARKNSHOP: "#0f766e",
  JASONS: "#1d4ed8",
  AEON: "#a16207",
  WATSONS: "#be185d",
  MANNINGS: "#15803d",
  LUNGFUNG: "#7c3aed",
  DCHFOOD: "#b45309",
  SASA: "#db2777",
};

export const DEFAULT_STORE = "JASONS";

export function supermarketLabel(code: string, lang: "en" | "zh") {
  const row = SUPERMARKETS[code];
  if (!row) return code;
  return lang === "zh" ? row.zh : row.en;
}

export function orderedStoreCodes(preferred: string, prices: Record<string, number>) {
  const known = SUPERMARKET_ORDER.filter(
    (code) => code !== preferred && prices[code] != null,
  );
  const extra = Object.keys(prices).filter(
    (code) =>
      code !== preferred &&
      !SUPERMARKET_ORDER.includes(code as (typeof SUPERMARKET_ORDER)[number]),
  );
  const first = prices[preferred] != null ? [preferred] : [];
  return [...first, ...known, ...extra];
}
