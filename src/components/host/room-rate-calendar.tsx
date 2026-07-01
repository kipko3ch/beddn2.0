"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";

type Day = {
  date: string;
  units_open: number | null;
  price_override: number | null;
  min_nights: number | null;
  is_blocked: boolean;
};

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Per-date room & rate manager for one listing. Tap a day to block it, change
 * the price, set a minimum-nights rule, or adjust how many rooms are open.
 */
export function RoomRateCalendar({
  listingId,
  totalUnits,
  basePrice,
  currency = "KES",
}: {
  listingId: string;
  totalUnits: number;
  basePrice: number | null;
  currency?: string;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [days, setDays] = useState<Record<string, Day>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor fields
  const [blocked, setBlocked] = useState(false);
  const [units, setUnits] = useState("");
  const [price, setPrice] = useState("");
  const [minNights, setMinNights] = useState("");

  const today = ymd(new Date());

  const load = useCallback(async () => {
    const from = ymd(startOfMonth(month));
    const to = ymd(endOfMonth(month));
    const res = await fetch(`/api/listings/${listingId}/calendar?from=${from}&to=${to}`);
    if (!res.ok) return;
    const json = (await res.json()) as { days?: Day[] };
    const map: Record<string, Day> = {};
    for (const d of json.days ?? []) map[d.date] = d;
    setDays(map);
  }, [listingId, month]);

  useEffect(() => {
    load();
  }, [load]);

  function openDay(date: string) {
    setSelected(date);
    const d = days[date];
    setBlocked(Boolean(d?.is_blocked));
    setUnits(d?.units_open != null ? String(d.units_open) : "");
    setPrice(d?.price_override != null ? String(d.price_override) : "");
    setMinNights(d?.min_nights != null ? String(d.min_nights) : "");
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/listings/${listingId}/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: selected,
        is_blocked: blocked,
        units_open: units === "" ? null : Math.max(0, parseInt(units, 10)),
        price_override: price === "" ? null : Number(price),
        min_nights: minNights === "" ? null : Math.max(1, parseInt(minNights, 10)),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      alert("Could not save. Please try again.");
      return;
    }
    setSelected(null);
    await load();
  }

  // Build the calendar grid (leading blanks + days of month).
  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const out: (string | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) out.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      out.push(ymd(new Date(month.getFullYear(), month.getMonth(), d)));
    }
    return out;
  }, [month]);

  function unitsOpenFor(date: string): number {
    const d = days[date];
    if (d?.is_blocked) return 0;
    if (d?.units_open != null) return d.units_open;
    return totalUnits;
  }

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="line-md:calendar" className="h-5 w-5 text-[#800020]" />
          <h2 className="font-bold">Rooms &amp; rates</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          >
            <Icon icon="line-md:chevron-left" className="h-4 w-4" />
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-[#2b000a]">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          >
            <Icon icon="line-md:chevron-right" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Tap a date to block it, change the price, set a minimum stay, or set how many rooms are open.
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#a08b92]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`b-${i}`} />;
          const d = days[date];
          const open = unitsOpenFor(date);
          const isPast = date < today;
          const dayNum = Number(date.slice(8, 10));
          const priceLabel = d?.price_override != null ? d.price_override : basePrice;
          return (
            <button
              key={date}
              type="button"
              disabled={isPast}
              onClick={() => openDay(date)}
              className={`flex min-h-[64px] flex-col items-start rounded-lg border p-1.5 text-left text-xs transition-colors ${
                isPast
                  ? "cursor-default border-transparent text-[#cbb9bf]"
                  : d?.is_blocked
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : open <= 0
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-[#eadfe3] bg-white hover:border-[#800020]"
              } ${selected === date ? "ring-2 ring-[#800020]" : ""}`}
            >
              <span className="font-bold">{dayNum}</span>
              {!isPast && (
                <>
                  {d?.is_blocked ? (
                    <span className="mt-auto text-[10px] font-semibold">Blocked</span>
                  ) : (
                    <>
                      {priceLabel != null && (
                        <span className="mt-auto text-[10px] text-[#6f6568]">
                          {currency} {Number(priceLabel).toLocaleString()}
                        </span>
                      )}
                      {totalUnits > 1 && (
                        <span className="text-[10px] font-semibold text-[#128c4b]">{open} left</span>
                      )}
                    </>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Day editor */}
      {selected && (
        <div className="mt-4 rounded-xl border bg-[#fbf7f8] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-[#2b000a]">Edit {selected}</p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-muted-foreground hover:underline"
            >
              Close
            </button>
          </div>

          <label className="mb-3 flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[#800020]"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
            />
            Block this date (no bookings)
          </label>

          {!blocked && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6f6568]">
                  Price ({currency})
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={basePrice != null ? String(basePrice) : "Base price"}
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                />
              </div>
              {totalUnits > 1 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#6f6568]">
                    Rooms open (of {totalUnits})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={totalUnits}
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder={String(totalUnits)}
                    className="h-10 w-full rounded-lg border px-3 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#6f6568]">Min nights</label>
                <input
                  type="number"
                  min={1}
                  value={minNights}
                  onChange={(e) => setMinNights(e.target.value)}
                  placeholder="1"
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <Button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-[#800020] hover:bg-[#600018]"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
