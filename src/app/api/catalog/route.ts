import {
  PACKAGE_SHOW,
  PRICEWATCH_JSON,
  transformCatalog,
} from "@/lib/pricewatch";

export const revalidate = 21600;

type PackageShow = {
  success?: boolean;
  result?: {
    metadata_modified?: string;
    resources?: { format?: string; created?: string; last_modified?: string }[];
  };
};

type RawProduct = {
  code: string;
  brand?: { en?: string; "zh-Hant"?: string; "zh-Hans"?: string };
  name?: { en?: string; "zh-Hant"?: string; "zh-Hans"?: string };
  cat1Name?: { en?: string; "zh-Hant"?: string; "zh-Hans"?: string };
  cat2Name?: { en?: string; "zh-Hant"?: string; "zh-Hans"?: string };
  cat3Name?: { en?: string; "zh-Hant"?: string; "zh-Hans"?: string };
  prices?: { supermarketCode?: string; price?: string }[];
  offers?: { supermarketCode?: string; en?: string; "zh-Hant"?: string }[];
};

async function fetchJson<T>(url: string, cache: RequestCache = "no-store"): Promise<T> {
  const res = await fetch(url, {
    cache,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function GET() {
  try {
    const [raw, pkg] = await Promise.all([
      fetchJson<RawProduct[]>(PRICEWATCH_JSON),
      fetchJson<PackageShow>(PACKAGE_SHOW, "force-cache").catch(() => null),
    ]);

    if (!Array.isArray(raw)) {
      return Response.json({ error: "Unexpected pricewatch payload" }, { status: 502 });
    }

    const sourceModified =
      pkg?.result?.metadata_modified ??
      pkg?.result?.resources?.[0]?.created ??
      null;

    const catalog = transformCatalog(raw, sourceModified);
    return Response.json(catalog);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
