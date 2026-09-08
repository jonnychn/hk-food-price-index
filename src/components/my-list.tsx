"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Mic, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDay, hkd, loc, todayStamp } from "@/lib/format";
import {
  addCustomItem,
  addCustomPlace,
  allTrackedItems,
  deleteEntry,
  entriesForItem,
  latestByPlace,
  logTrip,
  removeCustomItem,
  updateEntry,
  upsertItem,
  type LogLine,
  type PriceEntry,
  type PriceLogState,
  type TrackedItem,
} from "@/lib/price-log";
import { useSpeech } from "@/hooks/use-speech";
import { LOG_PLACES, PLACE_COLORS, STAPLE_GROUPS } from "@/lib/staples";
import type { Lang } from "@/lib/types";
import {
  ALL_UNITS,
  CATTY_IN_LB,
  LB_GRAMS,
  formatUnitPrice,
  looksLikeGrams,
  unitKind,
  unitLabel,
  unitPrice,
  type UnitCode,
} from "@/lib/units";

export function MyList({
  lang,
  state,
  onChange,
}: {
  lang: Lang;
  state: PriceLogState;
  onChange: (next: PriceLogState) => void;
}) {
  const items = allTrackedItems(state);
  const [logging, setLogging] = useState(false);
  const [selected, setSelected] = useState<TrackedItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<TrackedItem | null>(null);
  const [query, setQuery] = useState("");

  const tripCount = new Set(state.entries.map((e) => `${e.date}|${e.placeId}`)).size;
  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter((item) =>
        [item.name.en, item.name.zh, item.unit.en, item.unit.zh, item.group]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : items;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {lang === "zh" ? "我的購物清單" : "My grocery list"}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {lang === "zh"
              ? "每次買餸後記下街市、Market Place 或其他地方的價錢。這些是你自己的紀錄，不是消委會公開數據。"
              : "Log Market Place, wet-market, and other prices after each shop. This is your notebook — not the Council feed."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus data-icon="inline-start" />
            {lang === "zh" ? "加貨品" : "Add item"}
          </Button>
          <Button onClick={() => setLogging(true)}>
            <ClipboardList data-icon="inline-start" />
            {lang === "zh" ? "記錄今次購物" : "Log this shop"}
          </Button>
        </div>
      </div>

      <ConversionGuide lang={lang} />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={lang === "zh" ? "搜尋菜心、雞胸、街市…" : "Search choy sum, chicken, wet market…"}
          className="h-9 bg-card pl-8"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>{lang === "zh" ? "貨品" : "Items"}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{lang === "zh" ? "購物紀錄" : "Shopping trips"}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{tripCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>{lang === "zh" ? "已記入價錢" : "Price logs"}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{state.entries.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {STAPLE_GROUPS.map((group) => {
        const rows = visible.filter((item) => item.group === group.id && !item.custom);
        if (rows.length === 0) return null;
        return (
          <section key={group.id} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">{loc(lang, group.name)}</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {rows.map((item, index) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  lang={lang}
                  state={state}
                  last={index === rows.length - 1}
                  onOpen={() => setSelected(item)}
                  onEdit={() => setEditingItem(item)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {visible.some((item) => item.custom) ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {lang === "zh" ? "自訂貨品" : "Added by you"}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {visible
              .filter((item) => item.custom)
              .map((item, index, arr) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  lang={lang}
                  state={state}
                  last={index === arr.length - 1}
                  onOpen={() => setSelected(item)}
                  onEdit={() => setEditingItem(item)}
                />
              ))}
          </div>
        </section>
      ) : null}

      <LogShopSheet
        open={logging}
        onOpenChange={setLogging}
        lang={lang}
        items={visible}
        state={state}
        onChange={onChange}
        onSave={(next) => {
          onChange(next);
          setLogging(false);
        }}
      />
      <ItemHistorySheet
        item={selected}
        lang={lang}
        state={state}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onChange={onChange}
        onEditItem={() => selected && setEditingItem(selected)}
      />
      <ItemFormDialog
        open={adding || Boolean(editingItem)}
        item={editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setAdding(false);
            setEditingItem(null);
          }
        }}
        lang={lang}
        state={state}
        onChange={(next, item) => {
          onChange(next);
          if (item) setSelected(item);
          setAdding(false);
          setEditingItem(null);
        }}
      />
      {q && visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {lang === "zh" ? "清單裡沒有符合的貨品。" : "No items on your list match that search."}
        </p>
      ) : null}
    </div>
  );
}

function ItemRow({
  item,
  lang,
  state,
  last,
  onOpen,
  onEdit,
}: {
  item: TrackedItem;
  lang: Lang;
  state: PriceLogState;
  last: boolean;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const latest = latestByPlace(state.entries, item.id);
  const mp = latest.JASONS;
  const wet = latest.WETMARKET;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="truncate text-sm font-medium">{loc(lang, item.name)}</div>
          <span
            role="button"
            tabIndex={0}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onEdit();
              }
            }}
            aria-label={lang === "zh" ? "編輯貨品" : "Edit item"}
          >
            <Pencil className="size-3.5" />
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {item.defaultUnit ? loc(lang, item.unit) : lang === "zh" ? "無預設重量" : "no default weight"}
        </div>
        {mp?.note || wet?.note ? (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground/90">
            {mp?.note || wet?.note}
          </div>
        ) : null}
      </div>
      <PriceChip label={lang === "zh" ? "街市" : "Wet mkt"} entry={wet} lang={lang} />
      <PriceChip label="MKT" entry={mp} lang={lang} emphasize />
    </button>
  );
}

function PriceChip({
  label,
  entry,
  lang,
  emphasize = false,
}: {
  label: string;
  entry?: PriceEntry;
  lang: Lang;
  emphasize?: boolean;
}) {
  const up = entry ? unitPrice(entry.price, entry.qty, entry.unit, lang) : null;
  return (
    <div className={`min-w-[5.6rem] rounded-lg px-2 py-1.5 text-right ${emphasize ? "bg-primary/10" : "bg-muted/70"}`}>
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-sm tabular-nums">{entry ? hkd(entry.price) : "—"}</div>
      {up ? (
        <div className="text-[10px] leading-tight text-muted-foreground">
          {formatUnitPrice(up, "short")}
        </div>
      ) : (
        <div className="text-[10px] text-muted-foreground">
          {entry ? formatDay(entry.date, lang) : lang === "zh" ? "未記" : "none"}
        </div>
      )}
    </div>
  );
}

function placeLabel(placeId: string, lang: Lang, state: PriceLogState) {
  const built = LOG_PLACES.find((p) => p.id === placeId);
  if (built) return loc(lang, built.name);
  return state.places.find((p) => p.id === placeId)?.name ?? placeId;
}

function parseQty(raw: string) {
  const n = Number.parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function measureFromUnit(unit: UnitCode | "") {
  return unit ? unitKind(unit) : "count";
}

function LogShopSheet({
  open,
  onOpenChange,
  lang,
  items,
  state,
  onChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  items: TrackedItem[];
  state: PriceLogState;
  onChange: (next: PriceLogState) => void;
  onSave: (next: PriceLogState) => void;
}) {
  const [date, setDate] = useState(todayStamp);
  const [placeId, setPlaceId] = useState("JASONS");
  const [lines, setLines] = useState<
    Record<string, { price: string; qty: string; unit: UnitCode | ""; note: string }>
  >({});
  const [tripNote, setTripNote] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [filter, setFilter] = useState("");

  const places = [
    ...LOG_PLACES.map((p) => ({ id: p.id, label: loc(lang, p.name) })),
    ...state.places.map((p) => ({ id: p.id, label: p.name })),
  ];

  function lineFor(item: TrackedItem) {
    return lines[item.id] ?? { price: "", qty: "", unit: item.defaultUnit || "", note: "" };
  }

  function patchLine(
    id: string,
    item: TrackedItem,
    patch: Partial<{ price: string; qty: string; unit: UnitCode | ""; note: string }>,
  ) {
    setLines((prev) => {
      const base = prev[id] ?? { price: "", qty: "", unit: item.defaultUnit || "", note: "" };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  }

  function reset() {
    setDate(todayStamp());
    setPlaceId("JASONS");
    setLines({});
    setTripNote("");
    setNewPlace("");
    setFilter("");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) reset();
      }}
    >
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pt-5 pb-4 pl-5 pr-14 sm:pl-6 sm:pr-14">
            <SheetHeader className="gap-1 p-0 text-left">
              <SheetTitle>{lang === "zh" ? "記錄今次購物" : "Log this shop"}</SheetTitle>
              <SheetDescription>
                {lang === "zh"
                  ? "總價必填。數量空白當作 1。沒有重量就選「無重量」，例如三文魚 $88／兩包。"
                  : "Price is required. Blank qty counts as 1. No weight? Leave unit as “No weight” — e.g. salmon $88 for 2 packs."}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="trip-date">{lang === "zh" ? "日期" : "Date"}</Label>
                <Input id="trip-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="trip-place">{lang === "zh" ? "地點" : "Where"}</Label>
                <select
                  id="trip-place"
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Input
                value={newPlace}
                onChange={(e) => setNewPlace(e.target.value)}
                placeholder={lang === "zh" ? "新地點，例如西營盤街市" : "New place, e.g. Sai Ying Pun wet market"}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const name = newPlace.trim();
                  if (!name) return;
                  const result = addCustomPlace(state, name);
                  onChange(result.state);
                  setPlaceId(result.id);
                  setNewPlace("");
                }}
              >
                {lang === "zh" ? "加入" : "Add"}
              </Button>
            </div>

            <div className="mt-4">
              <DictationField
                lang={lang}
                value={tripNote}
                onChange={setTripNote}
                placeholder={lang === "zh" ? "今次備註，例如：街市貴、Market Place 有折扣" : "Quick trip note, e.g. wet market pricey, MP had an offer"}
              />
            </div>

            <div className="relative mt-4">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={lang === "zh" ? "篩選貨品…" : "Filter items…"}
                className="h-8 pl-8"
              />
            </div>

            <div className="mt-4 space-y-3">
              {items
                .filter((item) => {
                  const needle = filter.trim().toLowerCase();
                  if (!needle) return true;
                  return `${item.name.en} ${item.name.zh}`.toLowerCase().includes(needle);
                })
                .map((item) => {
                  const row = lineFor(item);
                  const priceN = Number.parseFloat(row.price.replace(/[^0-9.]/g, ""));
                  const qtyN = Number.parseFloat(row.qty.replace(/[^0-9.]/g, ""));
                  const qtyOrDefault = Number.isFinite(qtyN) && qtyN > 0 ? qtyN : 1;
                  const up =
                    Number.isFinite(priceN) && priceN > 0
                      ? unitPrice(priceN, qtyOrDefault, row.unit, lang)
                      : null;
                  const gramHint = Number.isFinite(qtyN) && looksLikeGrams(qtyN, row.unit);
                  return (
                    <div key={item.id} className="rounded-xl border border-border px-3 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="min-w-0 text-sm font-medium">{loc(lang, item.name)}</div>
                        {up ? (
                          <div className="shrink-0 text-right font-mono text-sm font-medium tabular-nums text-foreground">
                            {formatUnitPrice(up, "full")}
                          </div>
                        ) : null}
                      </div>
                      {gramHint ? (
                        <p className="mt-1 text-[11px] text-amber-800">
                          {lang === "zh"
                            ? `${qtyN} 看起來像克，不是斤。請把單位改成「克」。`
                            : `${qtyN} looks like grams, not catties. Switch the unit to g.`}
                        </p>
                      ) : null}
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <Input
                          inputMode="decimal"
                          placeholder={lang === "zh" ? "總價 $" : "Total $"}
                          value={row.price}
                          onChange={(e) => patchLine(item.id, item, { price: e.target.value })}
                          className="font-mono"
                        />
                        <Input
                          inputMode="decimal"
                          placeholder={lang === "zh" ? "數量 (預設1)" : "Qty (default 1)"}
                          value={row.qty}
                          onChange={(e) => patchLine(item.id, item, { qty: e.target.value })}
                          className="font-mono"
                        />
                        <UnitSelect
                          lang={lang}
                          value={row.unit}
                          onChange={(unit) => patchLine(item.id, item, { unit })}
                        />
                      </div>
                      <div className="mt-2">
                        <DictationField
                          lang={lang}
                          value={row.note}
                          onChange={(text) => patchLine(item.id, item, { note: text })}
                          placeholder={lang === "zh" ? "備註（可選）" : "Note (optional)"}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="border-t border-border px-5 py-4 sm:px-6">
            <Button
              className="w-full"
              onClick={() => {
                const payload: Record<string, LogLine> = {};
                for (const item of items) {
                  const row = lineFor(item);
                  const price = Number.parseFloat(row.price.replace(/[^0-9.]/g, ""));
                  if (!Number.isFinite(price) || price <= 0) continue;
                  payload[item.id] = {
                    price,
                    qty: parseQty(row.qty),
                    unit: row.unit || "",
                    note: row.note,
                  };
                }
                onSave(logTrip(state, placeId, date || todayStamp(), payload, tripNote));
              }}
            >
              {lang === "zh" ? "儲存這次購物" : "Save this shop"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ItemHistorySheet({
  item,
  lang,
  state,
  open,
  onOpenChange,
  onChange,
  onEditItem,
}: {
  item: TrackedItem | null;
  lang: Lang;
  state: PriceLogState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: PriceLogState) => void;
  onEditItem: () => void;
}) {
  const history = item ? entriesForItem(state.entries, item.id) : [];
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitCode | "">(item?.defaultUnit ?? "");
  const [note, setNote] = useState("");
  const [placeId, setPlaceId] = useState("JASONS");
  const [date, setDate] = useState(todayStamp);
  const [editingEntry, setEditingEntry] = useState<PriceEntry | null>(null);

  useEffect(() => {
    if (item) {
      setUnit(item.defaultUnit || "");
      setPrice("");
      setQty("");
      setNote("");
      setDate(todayStamp());
    }
  }, [item?.id]);

  const chartData = useMemo(() => {
    const dates = [...new Set(history.map((e) => e.date))].sort();
    return dates.map((d) => {
      const row: Record<string, string | number> = { date: formatDay(d, lang) };
      for (const entry of history.filter((e) => e.date === d)) {
        const up = unitPrice(entry.price, entry.qty, entry.unit, lang);
        row[entry.placeId] = up?.kind === "weight" && up.perLb != null ? up.perLb : entry.price;
      }
      return row;
    });
  }, [history, lang]);

  const series = [...new Set(history.map((e) => e.placeId))];
  const places = [
    ...LOG_PLACES.map((p) => ({ id: p.id, label: loc(lang, p.name) })),
    ...state.places.map((p) => ({ id: p.id, label: p.name })),
  ];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg">
        {item ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pt-5 pb-4 pl-5 pr-14 sm:pl-6 sm:pr-14">
              <SheetHeader className="gap-1 p-0 text-left">
                <SheetTitle>{loc(lang, item.name)}</SheetTitle>
                <SheetDescription>
                  {item.defaultUnit ? loc(lang, item.unit) : lang === "zh" ? "無預設重量" : "no default weight"}
                  {item.measure === "weight"
                    ? lang === "zh"
                      ? " · 有重量時單價用 $/lb"
                      : " · with weight, unit price is $/lb"
                    : ""}
                </SheetDescription>
                <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={onEditItem}>
                  <Pencil data-icon="inline-start" />
                  {lang === "zh" ? "編輯貨品" : "Edit item"}
                </Button>
              </SheetHeader>

              <section className="mt-5">
                <h3 className="mb-2 text-sm font-medium">
                  {lang === "zh" ? "快速記入" : "Quick log"}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  <select
                    value={placeId}
                    onChange={(e) => setPlaceId(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    {places.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    inputMode="decimal"
                    placeholder={lang === "zh" ? "總價 $" : "Total $"}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="font-mono"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      inputMode="decimal"
                      placeholder={lang === "zh" ? "數量 (預設1)" : "Qty (default 1)"}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="font-mono"
                    />
                    <UnitSelect lang={lang} value={unit} onChange={setUnit} />
                  </div>
                </div>
                <div className="mt-2">
                  <DictationField
                    lang={lang}
                    value={note}
                    onChange={setNote}
                    placeholder={lang === "zh" ? "備註" : "Note"}
                  />
                </div>
                <Button
                  className="mt-2 w-full"
                  onClick={() => {
                    const n = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
                    if (!Number.isFinite(n) || n <= 0) return;
                    onChange(
                      logTrip(state, placeId, date || todayStamp(), {
                        [item.id]: {
                          price: n,
                          qty: parseQty(qty),
                          unit: unit || "",
                          note,
                        },
                      }),
                    );
                    setPrice("");
                    setQty("");
                    setNote("");
                  }}
                >
                  {lang === "zh" ? "記入" : "Log"}
                </Button>
              </section>

              <section className="mt-6">
                <h3 className="mb-2 text-sm font-medium">
                  {lang === "zh" ? "走勢" : "Trend"}
                </h3>
                {chartData.length < 2 ? (
                  <p className="text-sm text-muted-foreground">
                    {lang === "zh"
                      ? "至少兩次購物紀錄就會出現趨勢線。"
                      : "Log at least two shops to see a trendline."}
                  </p>
                ) : (
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                        <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value, name) => {
                            const n = typeof value === "number" ? value : Number(value);
                            return [`$${n.toFixed(2)}`, placeLabel(String(name), lang, state)];
                          }}
                        />
                        {series.map((id) => (
                          <Line
                            key={id}
                            type="monotone"
                            dataKey={id}
                            stroke={PLACE_COLORS[id] ?? "#57534e"}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {series.map((id) => (
                    <Badge key={id} variant="secondary">
                      <span
                        className="mr-1.5 inline-block size-2 rounded-full"
                        style={{ background: PLACE_COLORS[id] ?? "#57534e" }}
                      />
                      {placeLabel(id, lang, state)}
                    </Badge>
                  ))}
                </div>
              </section>

              <section className="mt-6">
                <h3 className="mb-2 text-sm font-medium">
                  {lang === "zh" ? "紀錄" : "History"}
                </h3>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {lang === "zh" ? "尚未記入價錢。" : "No prices logged yet."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {[...history].reverse().map((entry) => {
                      const up = unitPrice(entry.price, entry.qty, entry.unit, lang);
                      return (
                        <li
                          key={entry.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm">{placeLabel(entry.placeId, lang, state)}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {entry.date}
                              {` · ${entry.qty && entry.qty > 0 ? entry.qty : 1} ${
                                entry.unit ? unitLabel(entry.unit, lang) : lang === "zh" ? "包" : "pack"
                              }`}
                              {up ? ` · ${formatUnitPrice(up, "full")}` : ""}
                            </div>
                            {entry.note ? (
                              <div className="mt-1 text-xs text-pretty text-foreground/80">{entry.note}</div>
                            ) : null}
                            {entry.tripNote ? (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">{entry.tripNote}</div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="font-mono text-sm tabular-nums">{hkd(entry.price)}</span>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => setEditingEntry(entry)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon-xs"
                              variant="ghost"
                              onClick={() => onChange(deleteEntry(state, entry.id))}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {item.custom ? (
                <Button
                  variant="outline"
                  className="mt-6 w-full"
                  onClick={() => {
                    onChange(removeCustomItem(state, item.id));
                    onOpenChange(false);
                  }}
                >
                  <Trash2 data-icon="inline-start" />
                  {lang === "zh" ? "刪除此貨品" : "Remove this item"}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
    <EditEntryDialog
      entry={editingEntry}
      lang={lang}
      state={state}
      onOpenChange={(open) => {
        if (!open) setEditingEntry(null);
      }}
      onChange={(next) => {
        onChange(next);
        setEditingEntry(null);
      }}
    />
    </>
  );
}

function UnitSelect({
  lang,
  value,
  onChange,
}: {
  lang: Lang;
  value: UnitCode | "";
  onChange: (value: UnitCode | "") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UnitCode | "")}
      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
    >
      <option value="">{lang === "zh" ? "無重量" : "No weight"}</option>
      {ALL_UNITS.map((code) => (
        <option key={code} value={code}>
          {unitLabel(code, lang)}
        </option>
      ))}
    </select>
  );
}

function ItemFormDialog({
  open,
  item,
  onOpenChange,
  lang,
  state,
  onChange,
}: {
  open: boolean;
  item: TrackedItem | null;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  state: PriceLogState;
  onChange: (next: PriceLogState, item?: TrackedItem) => void;
}) {
  const editing = Boolean(item);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<UnitCode | "">("");

  useEffect(() => {
    if (item) {
      setName(loc(lang, item.name));
      setUnit(item.defaultUnit || "");
    } else if (open) {
      setName("");
      setUnit("");
    }
  }, [item, open, lang]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? lang === "zh"
                ? "編輯貨品"
                : "Edit item"
              : lang === "zh"
                ? "加入貨品"
                : "Add an item"}
          </DialogTitle>
          <DialogDescription>
            {lang === "zh"
              ? "重量可留空。例如三文魚 $88／兩包，只記價錢和數量即可。"
              : "Weight can stay blank. Example: salmon $88 for 2 packs — price and qty only."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="item-name">{lang === "zh" ? "名稱" : "Name"}</Label>
            <DictationField
              lang={lang}
              value={name}
              onChange={setName}
              placeholder={lang === "zh" ? "例如：豆腐" : "e.g. tofu"}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "zh" ? "預設單位（可留空）" : "Default unit (optional)"}</Label>
            <UnitSelect lang={lang} value={unit} onChange={setUnit} />
            <p className="text-[11px] text-muted-foreground">
              {lang === "zh"
                ? "沒有克／磅／斤就選「無重量」。"
                : "Pick “No weight” when the pack has no grams, lb, or 斤."}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) return;
              if (item) {
                const nextItem: TrackedItem = {
                  ...item,
                  name: { ...item.name, [lang]: trimmed },
                  measure: measureFromUnit(unit),
                  defaultUnit: unit,
                  unit: unit ? { en: unitLabel(unit, "en"), zh: unitLabel(unit, "zh") } : { en: "pack", zh: "包" },
                };
                onChange(upsertItem(state, nextItem), nextItem);
                return;
              }
              onChange(addCustomItem(state, trimmed, measureFromUnit(unit), unit));
            }}
          >
            {editing ? (lang === "zh" ? "儲存" : "Save") : lang === "zh" ? "加入" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({
  entry,
  lang,
  state,
  onOpenChange,
  onChange,
}: {
  entry: PriceEntry | null;
  lang: Lang;
  state: PriceLogState;
  onOpenChange: (open: boolean) => void;
  onChange: (next: PriceLogState) => void;
}) {
  const [date, setDate] = useState("");
  const [placeId, setPlaceId] = useState("JASONS");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitCode | "">("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!entry) return;
    setDate(entry.date);
    setPlaceId(entry.placeId);
    setPrice(String(entry.price));
    setQty(entry.qty != null ? String(entry.qty) : "");
    setUnit(entry.unit || "");
    setNote(entry.note || "");
  }, [entry]);

  const places = [
    ...LOG_PLACES.map((p) => ({ id: p.id, label: loc(lang, p.name) })),
    ...state.places.map((p) => ({ id: p.id, label: p.name })),
  ];

  return (
    <Dialog open={Boolean(entry)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lang === "zh" ? "編輯紀錄" : "Edit log"}</DialogTitle>
          <DialogDescription>
            {lang === "zh"
              ? "數量空白當作 1。單位可留空（例如兩包三文魚，沒有重量）。"
              : "Blank qty counts as 1. Unit can stay empty (e.g. 2 salmon packs, no weight)."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Input
            inputMode="decimal"
            placeholder={lang === "zh" ? "總價 $" : "Total $"}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="font-mono"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              inputMode="decimal"
              placeholder={lang === "zh" ? "數量 (預設1)" : "Qty (default 1)"}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="font-mono"
            />
            <UnitSelect lang={lang} value={unit} onChange={setUnit} />
          </div>
          <DictationField lang={lang} value={note} onChange={setNote} placeholder={lang === "zh" ? "備註" : "Note"} />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (!entry) return;
              const n = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
              if (!Number.isFinite(n) || n <= 0) return;
              onChange(
                updateEntry(state, entry.id, {
                  date: date || entry.date,
                  placeId,
                  price: n,
                  qty: parseQty(qty),
                  unit: unit || undefined,
                  note: note.trim() || undefined,
                }),
              );
            }}
          >
            {lang === "zh" ? "儲存" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConversionGuide({ lang }: { lang: Lang }) {
  const g400 = unitPrice(40, 400, "g", lang);
  const lb15 = unitPrice(35, 1.5, "lb", lang);
  const g304 = unitPrice(12.1, 304, "g", lang);
  const packs = unitPrice(88, 2, "", lang);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">
          {lang === "zh" ? "有重量就換成每磅；沒有就按包比較" : "With weight: $/lb. No weight: $/pack"}
        </CardTitle>
        <CardDescription>
          {lang === "zh"
            ? `輸入克、斤或磅都可以。香港 1斤 = ${CATTY_IN_LB.toFixed(2)} lb。包裝寫 400g 就選「克」。沒有重量就留空單位。`
            : `Type g, 斤, or lb. Hong Kong 1 catty (斤) = ${CATTY_IN_LB.toFixed(2)} lb. If the bag says 400g, choose g. No weight? Leave the unit blank.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">400g · $40</div>
          <div className="mt-1 font-mono text-sm tabular-nums">{g400 ? formatUnitPrice(g400) : ""}</div>
          <div className="text-[11px] text-muted-foreground">
            400g = {(400 / LB_GRAMS).toFixed(2)} lb
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">1.5 lb · $35</div>
          <div className="mt-1 font-mono text-sm tabular-nums">{lb15 ? formatUnitPrice(lb15) : ""}</div>
          <div className="text-[11px] text-muted-foreground">$35 ÷ 1.5</div>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">304g · $12.10</div>
          <div className="mt-1 font-mono text-sm tabular-nums">{g304 ? formatUnitPrice(g304) : ""}</div>
          <div className="text-[11px] text-muted-foreground">
            304g = {(304 / LB_GRAMS).toFixed(2)} lb
          </div>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">
            {lang === "zh" ? "2 包 · $88 · 無重量" : "2 packs · $88 · no weight"}
          </div>
          <div className="mt-1 font-mono text-sm tabular-nums">{packs ? formatUnitPrice(packs) : ""}</div>
          <div className="text-[11px] text-muted-foreground">$88 ÷ 2</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DictationField({
  lang,
  value,
  onChange,
  placeholder,
}: {
  lang: Lang;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { supported, listening, start, stop } = useSpeech(lang, (text) => {
    onChange(value ? `${value.trim()} ${text}` : text);
  });

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      {supported ? (
        <Button
          type="button"
          variant={listening ? "default" : "outline"}
          size="icon"
          onClick={() => (listening ? stop() : start())}
          aria-label={lang === "zh" ? "語音輸入" : "Voice input"}
          title={lang === "zh" ? "語音輸入" : "Voice input"}
        >
          <Mic className={listening ? "size-4 animate-pulse" : "size-4"} />
        </Button>
      ) : null}
    </div>
  );
}
