import type { Lang } from "./types";

export type MeasureKind = "weight" | "volume" | "count";

export type UnitCode =
  | "g"
  | "kg"
  | "lb"
  | "oz"
  | "catty"
  | "ml"
  | "l"
  | "each"
  | "dozen"
  | "pack";

export const UNIT_LABEL: Record<UnitCode, { en: string; zh: string }> = {
  g: { en: "g", zh: "克" },
  kg: { en: "kg", zh: "公斤" },
  lb: { en: "lb", zh: "磅" },
  oz: { en: "oz", zh: "安士" },
  catty: { en: "catty (斤)", zh: "斤" },
  ml: { en: "ml", zh: "毫升" },
  l: { en: "L", zh: "公升" },
  each: { en: "each", zh: "每個" },
  dozen: { en: "dozen", zh: "一打" },
  pack: { en: "pack", zh: "包" },
};

export const UNITS_BY_KIND: Record<MeasureKind, UnitCode[]> = {
  weight: ["catty", "g", "kg", "lb", "oz"],
  volume: ["ml", "l"],
  count: ["each", "dozen", "pack"],
};

const G_PER: Record<Extract<UnitCode, "g" | "kg" | "lb" | "oz" | "catty">, number> = {
  g: 1,
  kg: 1000,
  lb: 453.59237,
  oz: 28.349523125,
  catty: 604.78982,
};

const ML_PER: Record<Extract<UnitCode, "ml" | "l">, number> = {
  ml: 1,
  l: 1000,
};

const PIECES_PER: Record<Extract<UnitCode, "each" | "dozen" | "pack">, number> = {
  each: 1,
  dozen: 12,
  pack: 1,
};

export function unitKind(unit: UnitCode): MeasureKind {
  if (unit === "ml" || unit === "l") return "volume";
  if (unit === "each" || unit === "dozen" || unit === "pack") return "count";
  return "weight";
}

export function unitLabel(unit: UnitCode, lang: Lang) {
  return lang === "zh" ? UNIT_LABEL[unit].zh : UNIT_LABEL[unit].en;
}

export type UnitPrice = {
  kind: MeasureKind;
  per100g?: number;
  perCatty?: number;
  perLb?: number;
  per100ml?: number;
  perPiece?: number;
  label: string;
  value: number;
};

export function unitPrice(
  total: number,
  qty: number | undefined,
  unit: UnitCode | undefined,
  lang: Lang,
): UnitPrice | null {
  if (!qty || qty <= 0 || !unit || !Number.isFinite(total) || total <= 0) return null;
  const kind = unitKind(unit);

  if (kind === "weight" && unit in G_PER) {
    const grams = qty * G_PER[unit as keyof typeof G_PER];
    if (grams <= 0) return null;
    const perLb = (total / grams) * G_PER.lb;
    return {
      kind,
      per100g: (total / grams) * 100,
      perCatty: (total / grams) * G_PER.catty,
      perLb,
      label: lang === "zh" ? "/磅" : "/lb",
      value: perLb,
    };
  }

  if (kind === "volume" && unit in ML_PER) {
    const ml = qty * ML_PER[unit as keyof typeof ML_PER];
    if (ml <= 0) return null;
    const per100ml = (total / ml) * 100;
    return {
      kind,
      per100ml,
      label: lang === "zh" ? "/100毫升" : "/100ml",
      value: per100ml,
    };
  }

  const pieces = qty * PIECES_PER[unit as keyof typeof PIECES_PER];
  if (!pieces || pieces <= 0) return null;
  const perPiece = total / pieces;
  return {
    kind: "count",
    perPiece,
    label: lang === "zh" ? "/件" : "/pc",
    value: perPiece,
  };
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function formatUnitPrice(up: UnitPrice, _style: "short" | "full" = "short") {
  if (up.kind === "weight" && up.perLb != null) {
    return `${money(up.perLb)}/lb`;
  }
  if (up.kind === "volume" && up.per100ml != null) {
    return `${money(up.per100ml)}/100ml`;
  }
  if (up.perPiece != null) {
    return `${money(up.perPiece)}${up.label}`;
  }
  return `${money(up.value)}${up.label}`;
}

export function looksLikeGrams(qty: number, unit: UnitCode) {
  return unit === "catty" && qty >= 20;
}

export const CATTY_GRAMS = G_PER.catty;
export const LB_GRAMS = G_PER.lb;
export const CATTY_IN_LB = G_PER.catty / G_PER.lb;
export const LB_IN_CATTY = G_PER.lb / G_PER.catty;
