"use client";

import { useMemo, useState } from "react";
import { Bookmark, BookmarkCheck, Plus } from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
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
import { DEFAULT_FOLDER_ID, uid, type HistoryPoint } from "@/lib/bookmarks";
import { formatDay, formatFetchedAt, hkd, loc } from "@/lib/format";
import {
  SUPERMARKET_COLORS,
  orderedStoreCodes,
  supermarketLabel,
} from "@/lib/supermarkets";
import type { BookmarkState, Lang, Product } from "@/lib/types";

export function ProductSheet({
  product,
  lang,
  open,
  onOpenChange,
  bookmarkState,
  history,
  onSave,
  onUnsave,
  preferredStore,
  fetchedAt,
}: {
  product: Product | null;
  lang: Lang;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarkState: BookmarkState;
  history: HistoryPoint[];
  onSave: (folderId: string) => void;
  onUnsave: () => void;
  preferredStore: string;
  fetchedAt: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const bookmark = product
    ? bookmarkState.bookmarks.find((b) => b.code === product.code)
    : undefined;
  const storePrice = product?.prices[preferredStore];
  const storeName = supermarketLabel(preferredStore, lang);
  const extra =
    storePrice != null && product ? storePrice - product.min : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          {product ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto pt-5 pb-4 pl-5 pr-14 sm:pl-6 sm:pr-14">
                <SheetHeader className="gap-1 p-0 text-left">
                  <SheetTitle className="text-balance text-lg leading-snug">
                    {loc(lang, product.brand)} {loc(lang, product.name)}
                  </SheetTitle>
                  <SheetDescription className="text-pretty">
                    {loc(lang, product.cat2)} · {loc(lang, product.cat3)}
                  </SheetDescription>
                  {fetchedAt ? (
                    <p className="pt-1 text-xs text-muted-foreground">
                      {lang === "zh" ? "價格擷取於" : "Prices fetched"}{" "}
                      {formatFetchedAt(fetchedAt, lang)}
                    </p>
                  ) : null}
                </SheetHeader>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Stat
                    label={lang === "zh" ? `在${storeName}` : `At ${storeName}`}
                    value={storePrice != null ? hkd(storePrice) : lang === "zh" ? "缺貨" : "Not stocked"}
                    emphasize
                  />
                  <Stat label={lang === "zh" ? "全港最低" : "Lowest"} value={hkd(product.min)} />
                  <Stat
                    label={lang === "zh" ? "價差" : "Vs lowest"}
                    value={
                      extra == null
                        ? "—"
                        : extra === 0
                          ? lang === "zh"
                            ? "已是最低"
                            : "Already lowest"
                          : `+${hkd(extra)}`
                    }
                  />
                </div>

                <section className="mt-6">
                  <h3 className="mb-3 text-sm font-medium">
                    {lang === "zh" ? "超市格價" : "Supermarket prices"}
                  </h3>
                  <SupermarketBars
                    product={product}
                    lang={lang}
                    preferredStore={preferredStore}
                  />
                </section>

                {product.offerCount > 0 ? (
                  <section className="mt-6">
                    <h3 className="mb-3 text-sm font-medium">
                      {lang === "zh" ? "優惠" : "Offers"}
                    </h3>
                    <ul className="space-y-2">
                      {Object.entries(product.offers).map(([code, text]) => (
                        <li
                          key={code}
                          className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm"
                        >
                          <div className="text-xs font-medium text-muted-foreground">
                            {supermarketLabel(code, lang)}
                            {code === preferredStore
                              ? lang === "zh"
                                ? " · 你的超市"
                                : " · your store"
                              : ""}
                          </div>
                          <div className="mt-0.5 break-words">{text}</div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                <section className="mt-6 mb-2">
                  <h3 className="mb-3 text-sm font-medium">
                    {lang === "zh" ? "你的價格紀錄" : "Your tracked prices"}
                  </h3>
                  <PersonalTrend history={history} lang={lang} current={product} />
                </section>
              </div>

              <div className="border-t border-border bg-popover px-5 py-4 sm:px-6">
                {bookmark ? (
                  <Button variant="outline" className="w-full" onClick={onUnsave}>
                    <BookmarkCheck data-icon="inline-start" />
                    {lang === "zh" ? "已收藏 · 移除" : "Saved · Remove"}
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => setSaving(true)}>
                    <Bookmark data-icon="inline-start" />
                    {lang === "zh" ? "收藏到資料夾" : "Save to folder"}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <SaveDialog
        open={saving}
        onOpenChange={setSaving}
        lang={lang}
        folders={bookmarkState.folders}
        onSave={(folderId) => {
          onSave(folderId);
          setSaving(false);
        }}
      />
    </>
  );
}

function Stat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${
        emphasize ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/60"
      }`}
    >
      <div className="text-[11px] leading-tight tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-medium break-words tabular-nums">{value}</div>
    </div>
  );
}

function SupermarketBars({
  product,
  lang,
  preferredStore,
}: {
  product: Product;
  lang: Lang;
  preferredStore: string;
}) {
  const max = product.max || 1;
  const rows = orderedStoreCodes(preferredStore, product.prices);

  return (
    <div className="space-y-3.5">
      {rows.map((code) => {
        const price = product.prices[code];
        const cheapest = price === product.min;
        const mine = code === preferredStore;
        return (
          <div
            key={code}
            className={mine ? "rounded-xl bg-primary/10 px-3 py-2.5 ring-1 ring-primary/20" : ""}
          >
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm font-medium">
                {supermarketLabel(code, lang)}
                {mine ? (
                  <span className="ml-1.5 text-[11px] font-normal text-primary">
                    {lang === "zh" ? "你的超市" : "your store"}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums">
                {hkd(price)}
                {cheapest ? (
                  <span className="ml-2 font-sans text-[11px] font-medium text-emerald-700">
                    {lang === "zh" ? "最平" : "lowest"}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(price / max) * 100}%`,
                  background: SUPERMARKET_COLORS[code] ?? "var(--primary)",
                }}
              />
            </div>
            {product.offers[code] ? (
              <p className="mt-1.5 text-xs leading-snug break-words text-muted-foreground">
                {product.offers[code]}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PersonalTrend({
  history,
  lang,
  current,
}: {
  history: HistoryPoint[];
  lang: Lang;
  current: Product;
}) {
  const data = useMemo(() => {
    const points = history.map((h) => ({
      date: formatDay(h.date, lang),
      min: h.min,
    }));
    const last = history[history.length - 1];
    if (!last || last.date !== new Date().toISOString().slice(0, 10)) {
      points.push({ date: lang === "zh" ? "今天" : "Today", min: current.min });
    }
    return points;
  }, [history, lang, current.min]);

  if (data.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        {lang === "zh"
          ? "收藏後每次開啟都會記下當日最低價，之後就能看到你的個人趨勢線。"
          : "Save this item and reopen the app on later days to build your personal price trendline."}
      </p>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis
            domain={["auto", "auto"]}
            tickLine={false}
            axisLine={false}
            width={40}
            tick={{ fontSize: 11 }}
          />
          <RechartsTooltip
            formatter={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              return [`$${n.toFixed(2)}`, lang === "zh" ? "最低價" : "Min price"];
            }}
          />
          <Line type="monotone" dataKey="min" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SaveDialog({
  open,
  onOpenChange,
  lang,
  folders,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  folders: BookmarkState["folders"];
  onSave: (folderId: string) => void;
}) {
  const [folderId, setFolderId] = useState(DEFAULT_FOLDER_ID);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lang === "zh" ? "儲存到資料夾" : "Save to a folder"}</DialogTitle>
          <DialogDescription>
            {lang === "zh"
              ? "用資料夾整理觀察清單，例如每週購物或嬰兒用品。"
              : "Keep watchlists organised — weekly shop, baby items, and so on."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => {
                setFolderId(folder.id);
                setCreating(false);
              }}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                folderId === folder.id && !creating
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              {folder.id === DEFAULT_FOLDER_ID
                ? lang === "zh"
                  ? "觀察清單"
                  : folder.name
                : folder.name}
            </button>
          ))}
          {creating ? (
            <div className="grid gap-2 rounded-lg border border-dashed p-3">
              <Label htmlFor="folder-name">{lang === "zh" ? "新資料夾名稱" : "New folder name"}</Label>
              <Input
                id="folder-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={lang === "zh" ? "例如：每週購物" : "e.g. Weekly shop"}
                autoFocus
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="justify-start"
              onClick={() => {
                setCreating(true);
                setFolderId("");
              }}
            >
              <Plus data-icon="inline-start" />
              {lang === "zh" ? "新增資料夾" : "New folder"}
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (creating) {
                const name = newName.trim();
                if (!name) return;
                onSave(`new:${name}`);
                setNewName("");
                setCreating(false);
                return;
              }
              onSave(folderId || DEFAULT_FOLDER_ID);
            }}
          >
            {lang === "zh" ? "儲存" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function createFolderIdFromSave(token: string) {
  if (token.startsWith("new:")) {
    return { id: uid(), name: token.slice(4) };
  }
  return null;
}
