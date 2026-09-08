import type { Localized } from "./types";
import type { MeasureKind, UnitCode } from "./units";
import { UNIT_LABEL } from "./units";

export type StapleGroup = "produce" | "protein" | "dairy";

export type StapleItem = {
  id: string;
  name: Localized;
  unit: Localized;
  group: StapleGroup;
  measure: MeasureKind;
  defaultUnit: UnitCode;
};

function u(unit: UnitCode): Localized {
  return UNIT_LABEL[unit];
}

export const STAPLE_GROUPS: { id: StapleGroup; name: Localized }[] = [
  { id: "produce", name: { en: "Vegetables & fruit", zh: "蔬果" } },
  { id: "protein", name: { en: "Meat & fish", zh: "肉類海鮮" } },
  { id: "dairy", name: { en: "Dairy & eggs", zh: "奶蛋" } },
];

export const STAPLES: StapleItem[] = [
  { id: "avocado", name: { en: "Avocado", zh: "牛油果" }, unit: u("each"), group: "produce", measure: "count", defaultUnit: "each" },
  { id: "bok-choy", name: { en: "Bok choy", zh: "白菜 / 白菜仔" }, unit: u("catty"), group: "produce", measure: "weight", defaultUnit: "catty" },
  { id: "yellow-chives", name: { en: "Yellow chives", zh: "黃韭" }, unit: u("catty"), group: "produce", measure: "weight", defaultUnit: "catty" },
  { id: "choy-sum", name: { en: "Choy sum", zh: "菜心" }, unit: u("catty"), group: "produce", measure: "weight", defaultUnit: "catty" },
  { id: "gai-lan", name: { en: "Gai lan", zh: "芥蘭" }, unit: u("catty"), group: "produce", measure: "weight", defaultUnit: "catty" },
  { id: "broccoli", name: { en: "Broccoli", zh: "西蘭花" }, unit: u("each"), group: "produce", measure: "count", defaultUnit: "each" },
  { id: "carrots", name: { en: "Carrots", zh: "甘筍" }, unit: u("catty"), group: "produce", measure: "weight", defaultUnit: "catty" },
  { id: "bananas", name: { en: "Bananas", zh: "香蕉" }, unit: u("catty"), group: "produce", measure: "weight", defaultUnit: "catty" },
  { id: "snow-pea-leaves", name: { en: "Snow pea leaves", zh: "豆苗" }, unit: u("catty"), group: "produce", measure: "weight", defaultUnit: "catty" },
  { id: "chicken-breast", name: { en: "Chicken breast", zh: "雞胸" }, unit: u("catty"), group: "protein", measure: "weight", defaultUnit: "catty" },
  {
    id: "chicken-thighs",
    name: { en: "Chicken thighs (boneless / skinless)", zh: "去骨／去皮雞脾" },
    unit: u("catty"),
    group: "protein",
    measure: "weight",
    defaultUnit: "catty",
  },
  {
    id: "beef-flap",
    name: { en: "Beef flap meat (stir-fry)", zh: "牛腩／炒牛肉" },
    unit: u("catty"),
    group: "protein",
    measure: "weight",
    defaultUnit: "catty",
  },
  { id: "wild-salmon", name: { en: "Wild salmon", zh: "野生三文魚" }, unit: u("catty"), group: "protein", measure: "weight", defaultUnit: "catty" },
  { id: "farmed-salmon", name: { en: "Farmed salmon", zh: "養殖三文魚" }, unit: u("catty"), group: "protein", measure: "weight", defaultUnit: "catty" },
  {
    id: "lactose-free-milk",
    name: { en: "Lactose-free milk", zh: "無乳糖牛奶" },
    unit: u("ml"),
    group: "dairy",
    measure: "volume",
    defaultUnit: "ml",
  },
  { id: "eggs-dozen", name: { en: "Eggs (1 dozen)", zh: "雞蛋（一打）" }, unit: u("dozen"), group: "dairy", measure: "count", defaultUnit: "dozen" },
];

export const LOG_PLACES: { id: string; name: Localized }[] = [
  { id: "JASONS", name: { en: "Market Place", zh: "Market Place" } },
  { id: "WETMARKET", name: { en: "Wet market", zh: "街市" } },
  { id: "WELLCOME", name: { en: "Wellcome", zh: "惠康" } },
  { id: "PARKNSHOP", name: { en: "PARKnSHOP", zh: "百佳" } },
  { id: "OTHER", name: { en: "Other", zh: "其他" } },
];

export const PLACE_COLORS: Record<string, string> = {
  JASONS: "#1d4ed8",
  WETMARKET: "#3f6212",
  WELLCOME: "#c2410c",
  PARKNSHOP: "#0f766e",
  OTHER: "#57534e",
};
