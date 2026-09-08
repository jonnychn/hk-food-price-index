import type { Localized } from "./types";

export type CategoryMeta = {
  key: string;
  slug: string;
  short: Localized;
  food: boolean;
};

export const CATEGORY_META: CategoryMeta[] = [
  {
    key: "Rice / Oil / Canned food / Fruits / Vegetables / Meat",
    slug: "fresh-staples",
    short: { en: "Fresh & staples", zh: "米油蔬果肉" },
    food: true,
  },
  {
    key: "Noodles / Cooking needs / Processed food (cold)",
    slug: "cooking",
    short: { en: "Cooking & noodles", zh: "麵食乾貨" },
    food: true,
  },
  {
    key: "Dairy / Soy products / Eggs",
    slug: "dairy",
    short: { en: "Dairy & eggs", zh: "奶類蛋品" },
    food: true,
  },
  {
    key: "Bakery / Cereals / Spreads",
    slug: "bakery",
    short: { en: "Bakery", zh: "麵包早餐" },
    food: true,
  },
  {
    key: "Candies / Biscuits / Snacks",
    slug: "snacks",
    short: { en: "Snacks", zh: "零食餅乾" },
    food: true,
  },
  {
    key: "Drinks",
    slug: "drinks",
    short: { en: "Drinks", zh: "飲品" },
    food: true,
  },
  {
    key: "Beer / Wines / Spirits",
    slug: "alcohol",
    short: { en: "Alcohol", zh: "酒類" },
    food: true,
  },
  {
    key: "Milk powder / Baby care",
    slug: "baby",
    short: { en: "Baby", zh: "奶粉嬰兒" },
    food: true,
  },
  {
    key: "Personal care",
    slug: "personal-care",
    short: { en: "Personal care", zh: "個人護理" },
    food: false,
  },
  {
    key: "Household / Pet food and care",
    slug: "household",
    short: { en: "Household", zh: "家居寵物" },
    food: false,
  },
];

export const CATEGORY_BY_KEY = new Map(CATEGORY_META.map((c) => [c.key, c]));
export const CATEGORY_BY_SLUG = new Map(CATEGORY_META.map((c) => [c.slug, c]));

export function isFoodCategory(key: string) {
  return CATEGORY_BY_KEY.get(key)?.food ?? true;
}

export function slugForCategory(key: string) {
  return (
    CATEGORY_BY_KEY.get(key)?.slug ??
    key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  );
}
