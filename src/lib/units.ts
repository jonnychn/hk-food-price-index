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
    const per100g = (total / grams) * 100;
    return {
      kind,
      per100g,
      perCatty: (total / grams) * G_PER.catty,
      perLb: (total / grams) * G_PER.lb,
      label: lang === "zh" ? "/100克" : "/100g",
      value: per100g,
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

export function formatUnitPrice(up: UnitPrice) {
  return `$${up.value.toFixed(2)}${up.label}`;
}
