import {
  HISTORICAL_GET,
  HISTORICAL_LIST,
  PRICEWATCH_CSV_EN,
  aggregateCsvSnapshot,
  buildTrends,
  pickWeeklyTimestamps,
  stampToDate,
} from "@/lib/pricewatch";

export const revalidate = 86400;
export const maxDuration = 60;

type VersionList = {
  timestamps?: string[];
};

function yesterdayYmd() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function monthsAgoYmd(months: number) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function GET() {
  try {
    const start = monthsAgoYmd(4);
    const end = yesterdayYmd();
    const listUrl = `${HISTORICAL_LIST}?url=${encodeURIComponent(PRICEWATCH_CSV_EN)}&start=${start}&end=${end}`;
    const listRes = await fetch(listUrl, { next: { revalidate: 86400 } });
    if (!listRes.ok) {
      throw new Error(`Historical list failed: ${listRes.status}`);
    }
    const list = (await listRes.json()) as VersionList;
    const stamps = pickWeeklyTimestamps(list.timestamps ?? [], 8);
    if (stamps.length === 0) {
      return Response.json({ baseDate: "", points: [] });
    }

    const snapshots = await Promise.all(
      stamps.map(async (stamp) => {
        const fileUrl = `${HISTORICAL_GET}?url=${encodeURIComponent(PRICEWATCH_CSV_EN)}&time=${stamp}`;
        const res = await fetch(fileUrl, { next: { revalidate: 86400 } });
        if (!res.ok) return null;
        const csv = await res.text();
        return aggregateCsvSnapshot(csv, stampToDate(stamp));
      }),
    );

    const trends = buildTrends(snapshots.filter((s) => s !== null));
    return Response.json(trends);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message, baseDate: "", points: [] }, { status: 200 });
  }
}
