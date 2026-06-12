"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  Minus,
  Navigation,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchPillValues {
  q: string;
  checkIn?: string; // yyyy-MM-dd
  checkOut?: string;
  guests?: number;
}

interface Destination {
  id: string;
  name: string;
  search_query: string;
  image_url: string;
}

function toIso(date: Date | undefined): string | undefined {
  return date ? format(date, "yyyy-MM-dd") : undefined;
}

function fromIso(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  try {
    return parseISO(value);
  } catch {
    return undefined;
  }
}

function rangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return "Add dates";
  if (!range.to) return format(range.from, "MMM d");
  return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
}

/**
 * Airbnb-style segmented search bar: Where | When | Who + round search button.
 * Renders as a full pill on desktop and as a tappable summary pill that opens
 * a full-screen overlay on mobile.
 */
export function SearchPill({
  initialQuery = "",
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  onSearch,
  onNearby,
  open,
  onOpenChange,
  showMobileTrigger = true,
}: {
  initialQuery?: string;
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  initialGuests?: number | null;
  onSearch: (values: SearchPillValues) => void;
  onNearby?: () => void;
  /** Controlled mode for the mobile overlay (e.g. opened from a page header). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in mobile summary pill when the page provides its own. */
  showMobileTrigger?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = fromIso(initialCheckIn);
    if (!from) return undefined;
    return { from, to: fromIso(initialCheckOut) };
  });
  const [guests, setGuests] = useState(initialGuests && initialGuests > 0 ? initialGuests : 0);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [whereOpen, setWhereOpen] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = open ?? internalMobileOpen;
  const [mobileSection, setMobileSection] = useState<"where" | "when" | "who">("where");
  const whereRef = useRef<HTMLDivElement>(null);

  function setMobileOpen(next: boolean) {
    onOpenChange?.(next);
    if (open === undefined) setInternalMobileOpen(next);
  }

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    fetch("/api/public/destinations")
      .then((res) => (res.ok ? res.json() : { destinations: [] }))
      .then((json: { destinations?: Destination[] }) => setDestinations(json.destinations ?? []))
      .catch(() => {});
  }, []);

  // Close the desktop suggestions dropdown on outside click.
  useEffect(() => {
    if (!whereOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!whereRef.current?.contains(event.target as Node)) setWhereOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [whereOpen]);

  // Lock body scroll while the mobile overlay is open, starting on "Where".
  // Always restore to "" on close — never to a captured value, which can
  // re-apply a stale lock when multiple overlays open and close together.
  useEffect(() => {
    if (!mobileOpen) return;
    setMobileSection("where");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function submit(overrideQuery?: string) {
    setWhereOpen(false);
    setMobileOpen(false);
    onSearch({
      q: (overrideQuery ?? query).trim(),
      checkIn: toIso(range?.from),
      checkOut: toIso(range?.to),
      guests: guests > 0 ? guests : undefined,
    });
  }

  function clearAll() {
    setQuery("");
    setRange(undefined);
    setGuests(0);
  }

  function pickDestination(destination: Destination) {
    setQuery(destination.search_query);
    if (mobileOpen) {
      setMobileSection("when");
    } else {
      submit(destination.search_query);
    }
  }

  const guestsLabel = guests > 0 ? `${guests} guest${guests === 1 ? "" : "s"}` : "Add guests";

  const suggestions = (
    <ul className="max-h-72 overflow-y-auto">
      {onNearby && (
        <li>
          <button
            type="button"
            onClick={() => {
              setWhereOpen(false);
              setMobileOpen(false);
              onNearby();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef3fb]">
              <Navigation className="h-5 w-5 text-[#3b6fc9]" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Nearby</span>
              <span className="block text-xs text-muted-foreground">Find what’s around you</span>
            </span>
          </button>
        </li>
      )}
      {destinations.map((destination) => (
        <li key={destination.id}>
          <button
            type="button"
            onClick={() => pickDestination(destination)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
          >
            <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={destination.image_url}
                alt=""
                fill
                sizes="44px"
                className="object-cover"
              />
            </span>
            <span className="block truncate text-sm font-semibold">{destination.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const guestStepper = (
    <div className="flex items-center justify-between px-1 py-2">
      <div>
        <p className="text-sm font-semibold">Guests</p>
        <p className="text-xs text-muted-foreground">How many are coming?</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Fewer guests"
          disabled={guests <= 0}
          onClick={() => setGuests((g) => Math.max(0, g - 1))}
          className="flex size-8 items-center justify-center rounded-full border text-muted-foreground disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-5 text-center text-sm font-semibold">{guests}</span>
        <button
          type="button"
          aria-label="More guests"
          onClick={() => setGuests((g) => Math.min(30, g + 1))}
          className="flex size-8 items-center justify-center rounded-full border text-muted-foreground"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop pill */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="hidden items-stretch rounded-full border border-black/10 bg-white shadow-[0_3px_12px_rgba(0,0,0,0.08)] transition-shadow focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.14)] md:flex"
      >
        <div ref={whereRef} className="relative min-w-0 flex-[1.4]">
          <label className="block cursor-pointer rounded-full px-7 py-2.5 hover:bg-black/4">
            <span className="block text-xs font-bold">Where</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setWhereOpen(true)}
              placeholder="Search destinations"
              className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
          {whereOpen && (destinations.length > 0 || onNearby) && (
            <div className="absolute left-0 top-[calc(100%+12px)] z-40 w-[380px] rounded-3xl bg-white p-3 shadow-xl ring-1 ring-black/10">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                Suggested destinations
              </p>
              {suggestions}
            </div>
          )}
        </div>

        <span className="my-3 w-px bg-black/10" />

        <Popover>
          <PopoverTrigger
            render={<button type="button" className="min-w-0 flex-1 cursor-pointer rounded-full px-6 py-2.5 text-left hover:bg-black/4" />}
          >
            <span className="block text-xs font-bold">When</span>
            <span
              className={`block truncate text-sm ${range?.from ? "" : "text-muted-foreground"}`}
            >
              {rangeLabel(range)}
            </span>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-auto rounded-3xl p-4">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={range}
              onSelect={setRange}
              disabled={{ before: new Date() }}
            />
            {range?.from && (
              <button
                type="button"
                onClick={() => setRange(undefined)}
                className="self-end px-2 pb-1 text-xs font-semibold underline"
              >
                Clear dates
              </button>
            )}
          </PopoverContent>
        </Popover>

        <span className="my-3 w-px bg-black/10" />

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full pr-2 hover:bg-black/4">
          <Popover>
            <PopoverTrigger
              render={<button type="button" className="min-w-0 flex-1 cursor-pointer rounded-full px-6 py-2.5 text-left" />}
            >
              <span className="block text-xs font-bold">Who</span>
              <span className={`block truncate text-sm ${guests > 0 ? "" : "text-muted-foreground"}`}>
                {guestsLabel}
              </span>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 rounded-3xl p-4">
              {guestStepper}
            </PopoverContent>
          </Popover>
          <button
            type="submit"
            aria-label="Search"
            className="my-1.5 flex size-12 shrink-0 items-center justify-center rounded-full bg-[#800020] text-white transition-colors hover:bg-[#600018]"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Mobile summary pill */}
      {showMobileTrigger && (
      <button
        type="button"
        onClick={() => {
          setMobileSection("where");
          setMobileOpen(true);
        }}
        className="flex w-full items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3 text-left shadow-[0_3px_12px_rgba(0,0,0,0.08)] md:hidden"
      >
        <Search className="h-5 w-5 shrink-0 text-[#2b000a]" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {query || "Where to?"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {rangeLabel(range) === "Add dates" ? "Anytime" : rangeLabel(range)} ·{" "}
            {guests > 0 ? guestsLabel : "Add guests"}
          </span>
        </span>
      </button>
      )}

      {/* Mobile full-screen overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#f3f0f1] md:hidden">
          <div className="flex items-center justify-end px-4 pt-4">
            <button
              type="button"
              aria-label="Close search"
              onClick={() => setMobileOpen(false)}
              className="flex size-9 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-2">
            {/* Where */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              {mobileSection === "where" ? (
                <>
                  <p className="mb-3 text-xl font-bold text-[#2b000a]">Where?</p>
                  <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search destinations"
                      className="w-full border-0 bg-transparent text-sm outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                    />
                  </div>
                  <p className="px-1 pb-1 pt-4 text-xs font-semibold text-muted-foreground">
                    Suggested destinations
                  </p>
                  {suggestions}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileSection("where")}
                  className="flex w-full items-center justify-between"
                >
                  <span className="text-sm font-semibold text-muted-foreground">Where</span>
                  <span className="text-sm font-semibold">{query || "I’m flexible"}</span>
                </button>
              )}
            </div>

            {/* When */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              {mobileSection === "when" ? (
                <>
                  <p className="mb-1 text-xl font-bold text-[#2b000a]">When?</p>
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={range}
                    onSelect={setRange}
                    disabled={{ before: new Date() }}
                    className="mx-auto"
                  />
                  <div className="flex items-center justify-between">
                    {range?.from ? (
                      <button
                        type="button"
                        onClick={() => setRange(undefined)}
                        className="text-xs font-semibold underline"
                      >
                        Clear dates
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={() => setMobileSection("who")}
                      className="rounded-full bg-[#f5eef1] px-4 py-2 text-sm font-semibold text-[#2b000a]"
                    >
                      {range?.from ? "Next" : "Skip dates"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileSection("when")}
                  className="flex w-full items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <CalendarDays className="h-4 w-4" /> When
                  </span>
                  <span className="text-sm font-semibold">{rangeLabel(range)}</span>
                </button>
              )}
            </div>

            {/* Who */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              {mobileSection === "who" ? (
                <>
                  <p className="mb-1 text-xl font-bold text-[#2b000a]">Who?</p>
                  {guestStepper}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileSection("who")}
                  className="flex w-full items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Users className="h-4 w-4" /> Who
                  </span>
                  <span className="text-sm font-semibold">{guestsLabel}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t bg-white px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button type="button" onClick={clearAll} className="text-sm font-semibold underline">
              Clear all
            </button>
            <button
              type="button"
              onClick={() => submit()}
              className="flex items-center gap-2 rounded-full bg-[#800020] px-6 py-3 text-sm font-bold text-white"
            >
              <Search className="h-4 w-4" /> Search
            </button>
          </div>
        </div>
      )}
    </>
  );
}
