"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Mic, Plus, Search, Trash2 } from "lucide-react";
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
  type LogLine,
  type PriceEntry,
  type PriceLogState,
  type TrackedItem,
} from "@/lib/price-log";
import { useSpeech } from "@/hooks/use-speech";
import { LOG_PLACES, PLACE_COLORS, STAPLE_GROUPS } from "@/lib/staples";
import type { Lang } from "@/lib/types";
import {
  UNITS_BY_KIND,
  formatUnitPrice,
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
      />
      <AddItemDialog open={adding} onOpenChange={setAdding} lang={lang} state={state} onChange={onChange} />
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
}: {
  item: TrackedItem;
  lang: Lang;
  state: PriceLogState;
  last: boolean;
  onOpen: () => void;
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
        <div className="truncate text-sm font-medium">{loc(lang, item.name)}</div>
        <div className="text-[11px] text-muted-foreground">{loc(lang, item.unit)}</div>
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
    <div className={`min-w-[4.8rem] rounded-lg px-2 py-1.5 text-right ${emphasize ? "bg-primary/10" : "bg-muted/70"}`}>
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-sm tabular-nums">{entry ? hkd(entry.price) : "—"}</div>
      <div className="text-[10px] text-muted-foreground">
        {up ? formatUnitPrice(up) : entry ? formatDay(entry.date, lang) : lang === "zh" ? "未記" : "none"}
      </div>
    </div>
  );
}

function placeLabel(placeId: string, lang: Lang, state: PriceLogState) {
  const built = LOG_PLACES.find((p) => p.id === placeId);
  if (built) return loc(lang, built.name);
  return state.places.find((p) => p.id === placeId)?.name ?? placeId;
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
  const [lines, setLines] = useState<Record<string, { price: string; qty: string; unit: UnitCode; note: string }>>({});
  const [tripNote, setTripNote] = useState("");
  const [newPlace, setNewPlace] = useState("");
  const [filter, setFilter] = useState("");

  const places = [
    ...LOG_PLACES.map((p) => ({ id: p.id, label: loc(lang, p.name) })),
    ...state.places.map((p) => ({ id: p.id, label: p.name })),
  ];

  function lineFor(item: TrackedItem) {
    return lines[item.id] ?? { price: "", qty: "", unit: item.defaultUnit, note: "" };
  }

  function patchLine(
    id: string,
    item: TrackedItem,
    patch: Partial<{ price: string; qty: string; unit: UnitCode; note: string }>,
  ) {
    setLines((prev) => {
      const base = prev[id] ?? { price: "", qty: "", unit: item.defaultUnit, note: "" };
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
                  ? "總價必填。數量＋單位可選，用來算每100克／100毫升／每件單價，方便街市斤數對超市包裝。"
                  : "Total paid is enough. Add qty + unit to get a unit price (per 100g, 100ml, or piece) so a catty at the wet market compares with a supermarket pack."}
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
                  const up =
                    Number.isFinite(priceN) && Number.isFinite(qtyN)
                      ? unitPrice(priceN, qtyN, row.unit, lang)
                      : null;
                  return (
                    <div key={item.id} className="rounded-xl border border-border px-3 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="min-w-0 text-sm font-medium">{loc(lang, item.name)}</div>
                        {up ? (
                          <div className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {formatUnitPrice(up)}
                          </div>
                        ) : null}
                      </div>
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
                          placeholder={lang === "zh" ? "數量" : "Qty"}
                          value={row.qty}
                          onChange={(e) => patchLine(item.id, item, { qty: e.target.value })}
                          className="font-mono"
                        />
                        <select
                          value={row.unit}
                          onChange={(e) => patchLine(item.id, item, { unit: e.target.value as UnitCode })}
                          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                        >
                          {UNITS_BY_KIND[item.measure].map((code) => (
                            <option key={code} value={code}>
                              {unitLabel(code, lang)}
                            </option>
                          ))}
                        </select>
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
                  const qty = Number.parseFloat(row.qty.replace(/[^0-9.]/g, ""));
                  payload[item.id] = {
                    price,
                    qty: Number.isFinite(qty) && qty > 0 ? qty : undefined,
                    unit: row.unit,
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
}: {
  item: TrackedItem | null;
  lang: Lang;
  state: PriceLogState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (next: PriceLogState) => void;
}) {
  const history = item ? entriesForItem(state.entries, item.id) : [];
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState<UnitCode>(item?.defaultUnit ?? "catty");
  const [note, setNote] = useState("");
  const [placeId, setPlaceId] = useState("JASONS");
  const [date, setDate] = useState(todayStamp);

  useEffect(() => {
    if (item) {
      setUnit(item.defaultUnit);
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
        row[entry.placeId] = entry.price;
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg">
        {item ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pt-5 pb-4 pl-5 pr-14 sm:pl-6 sm:pr-14">
              <SheetHeader className="gap-1 p-0 text-left">
                <SheetTitle>{loc(lang, item.name)}</SheetTitle>
                <SheetDescription>{loc(lang, item.unit)}</SheetDescription>
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
                      placeholder={lang === "zh" ? "數量" : "Qty"}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="font-mono"
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as UnitCode)}
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                    >
                      {UNITS_BY_KIND[item.measure].map((code) => (
                        <option key={code} value={code}>
                          {unitLabel(code, lang)}
                        </option>
                      ))}
                    </select>
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
                    const qn = Number.parseFloat(qty.replace(/[^0-9.]/g, ""));
                    onChange(
                      logTrip(state, placeId, date || todayStamp(), {
                        [item.id]: {
                          price: n,
                          qty: Number.isFinite(qn) && qn > 0 ? qn : undefined,
                          unit,
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
                              {entry.qty && entry.unit
                                ? ` · ${entry.qty} ${unitLabel(entry.unit, lang)}`
                                : ""}
                              {up ? ` · ${formatUnitPrice(up)}` : ""}
                            </div>
                            {entry.note ? (
                              <div className="mt-1 text-xs text-pretty text-foreground/80">{entry.note}</div>
                            ) : null}
                            {entry.tripNote ? (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">{entry.tripNote}</div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="font-mono text-sm tabular-nums">{hkd(entry.price)}</span>
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
  );
}

function AddItemDialog({
  open,
  onOpenChange,
  lang,
  state,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  state: PriceLogState;
  onChange: (next: PriceLogState) => void;
}) {
  const [name, setName] = useState("");
  const [measure, setMeasure] = useState<"weight" | "volume" | "count">("weight");
  const [unit, setUnit] = useState<UnitCode>("catty");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lang === "zh" ? "加入貨品" : "Add an item"}</DialogTitle>
          <DialogDescription>
            {lang === "zh"
              ? "重量用斤／克／磅；容量用毫升；件數用每個或一打。"
              : "Weight: catty / g / lb. Volume: ml. Count: each or dozen."}
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
            <Label>{lang === "zh" ? "計量" : "Measure"}</Label>
            <select
              value={measure}
              onChange={(e) => {
                const next = e.target.value as "weight" | "volume" | "count";
                setMeasure(next);
                setUnit(UNITS_BY_KIND[next][0]);
              }}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="weight">{lang === "zh" ? "重量" : "Weight"}</option>
              <option value="volume">{lang === "zh" ? "容量（毫升）" : "Volume (ml)"}</option>
              <option value="count">{lang === "zh" ? "件數" : "Count"}</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label>{lang === "zh" ? "預設單位" : "Default unit"}</Label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as UnitCode)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              {UNITS_BY_KIND[measure].map((code) => (
                <option key={code} value={code}>
                  {unitLabel(code, lang)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              const trimmed = name.trim();
              if (!trimmed) return;
              onChange(addCustomItem(state, trimmed, measure, unit));
              setName("");
              onOpenChange(false);
            }}
          >
            {lang === "zh" ? "加入" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
