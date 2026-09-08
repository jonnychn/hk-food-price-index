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
import { formatDay, hkd, loc } from "@/lib/format";
import { SUPERMARKET_COLORS, SUPERMARKET_ORDER, supermarketLabel } from "@/lib/supermarkets";
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
}: {
  product: Product | null;
  lang: Lang;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarkState: BookmarkState;
  history: HistoryPoint[];
  onSave: (folderId: string) => void;
  onUnsave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const bookmark = product
    ? bookmarkState.bookmarks.find((b) => b.code === product.code)
    : undefined;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {product ? (
            <div className="flex flex-col gap-5">
              <SheetHeader className="pr-8 text-left">
                <SheetTitle className="text-balance text-lg">
                  {loc(lang, product.brand)} {loc(lang, product.name)}
                </SheetTitle>
                <SheetDescription>
                  {loc(lang, product.cat1)} · {loc(lang, product.cat2)} · {loc(lang, product.cat3)}
                </SheetDescription>
              </SheetHeader>

              <div className="grid grid-cols-3 gap-2">
                <Stat label={lang === "zh" ? "最低" : "Lowest"} value={hkd(product.min)} />
                <Stat label={lang === "zh" ? "平均" : "Average"} value={hkd(product.avg)} />
                <Stat label={lang === "zh" ? "最高" : "Highest"} value={hkd(product.max)} />
              </div>

              <section>
                <h3 className="mb-3 text-sm font-medium">
                  {lang === "zh" ? "超市格價" : "Supermarket prices"}
                </h3>
                <SupermarketBars product={product} lang={lang} />
              </section>

              {product.offerCount > 0 ? (
                <section>
                  <h3 className="mb-3 text-sm font-medium">
                    {lang === "zh" ? "優惠" : "Offers"}
                  </h3>
                  <ul className="space-y-2">
                    {Object.entries(product.offers).map(([code, text]) => (
                      <li
                        key={code}
                        className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                      >
                        <div className="text-xs font-medium text-muted-foreground">
                          {supermarketLabel(code, lang)}
                        </div>
                        {text}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <h3 className="mb-3 text-sm font-medium">
                  {lang === "zh" ? "你的價格紀錄" : "Your tracked prices"}
                </h3>
                <PersonalTrend history={history} lang={lang} current={product} />
              </section>

              <div className="flex gap-2 pb-6">
                {bookmark ? (
                  <Button variant="outline" className="flex-1" onClick={onUnsave}>
                    <BookmarkCheck data-icon="inline-start" />
                    {lang === "zh" ? "已收藏 · 移除" : "Saved · Remove"}
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={() => setSaving(true)}>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2">
      <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-base font-medium tabular-nums">{value}</div>
    </div>
  );
}

function SupermarketBars({ product, lang }: { product: Product; lang: Lang }) {
  const max = product.max || 1;
  const known = SUPERMARKET_ORDER.filter((code) => product.prices[code] != null);
  const extra = Object.keys(product.prices).filter(
    (code) => !SUPERMARKET_ORDER.includes(code as (typeof SUPERMARKET_ORDER)[number]),
  );
  const rows = [...known, ...extra];

  return (
    <div className="space-y-3">
      {rows.map((code) => {
        const price = product.prices[code];
        const cheapest = price === product.min;
        return (
          <div key={code}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{supermarketLabel(code, lang)}</span>
              <span className="font-mono text-sm tabular-nums">
                {hkd(price)}
                {cheapest ? (
                  <span className="ml-2 text-[11px] font-sans font-medium text-emerald-700">
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
              <p className="mt-1 text-xs text-muted-foreground">{product.offers[code]}</p>
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
