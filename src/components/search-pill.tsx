"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  Clock,
  Minus,
  Navigation,
  Plus,
  Search,
  Users,
  X,
  MapPin,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchPillValues {
  q: string;
  checkIn?: string; // yyyy-MM-dd
  checkOut?: string;
  startTime?: string;
  guests?: number;
}

export type SearchPillMode = "all" | "hourly" | "overnight" | "experience";

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

function rangeLabel(range: DateRange | undefined, singleDate = false): string {
  if (!range?.from) return "Add dates";
  if (singleDate) return format(range.from, "MMM d");
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
  initialStartTime,
  initialGuests,
  mode = "all",
  onSearch,
  onNearby,
  open,
  onOpenChange,
  showMobileTrigger = true,
}: {
  initialQuery?: string;
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  initialStartTime?: string | null;
  initialGuests?: number | null;
  mode?: SearchPillMode;
  onSearch: (values: SearchPillValues) => void;
  onNearby?: () => void;
  /** Controlled mode for the mobile overlay (e.g. opened from a page header). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in mobile summary pill when the page provides its own. */
  showMobileTrigger?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [range, setRange] = useState<DateRange | undefined>(() => {
    const from = fromIso(initialCheckIn);
    if (!from) return undefined;
    return { from, to: fromIso(initialCheckOut) };
  });
  const [startTime, setStartTime] = useState(initialStartTime ?? "");
  const [guests, setGuests] = useState(initialGuests && initialGuests > 0 ? initialGuests : 0);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [whereOpen, setWhereOpen] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = open ?? internalMobileOpen;
  const [mobileSection, setMobileSection] = useState<"where" | "when" | "time" | "who">("where");
  const whereRef = useRef<HTMLDivElement>(null);
  const asksForTime = mode === "hourly" || mode === "experience";
  const singleDate = asksForTime;
  const isExperience = mode === "experience";
  const copy = isExperience
    ? {
        whereLabel: "What",
        whereTitle: "What are you looking for?",
        wherePlaceholder: "Road trip, yoga, swimming class...",
        suggestionTitle: "Experience ideas",
        nearbyBody: "Find activities near you",
        whenLabel: "Date",
        whenTitle: "Pick a session date",
        whenEmpty: "Add date",
        timeLabel: "Time",
        timeEmpty: "Add time",
        whoLabel: "Seats",
        whoTitle: "Seats",
        whoBody: "How many seats do you need?",
        whoEmpty: "Add seats",
        flexible: "Any experience",
      }
    : {
        whereLabel: "Where",
        whereTitle: "Where?",
        wherePlaceholder: "Search destinations",
        suggestionTitle: "Suggested destinations",
        nearbyBody: "Find what's around you",
        whenLabel: asksForTime ? "Date" : "When",
        whenTitle: asksForTime ? "Pick a date" : "When?",
        whenEmpty: asksForTime ? "Add date" : "Add dates",
        timeLabel: "Time",
        timeEmpty: "Add time",
        whoLabel: "Who",
        whoTitle: "Who?",
        whoBody: "How many are coming?",
        whoEmpty: "Add guests",
        flexible: "I'm flexible",
      };

  function setMobileOpen(next: boolean) {
    onOpenChange?.(next);
    if (open === undefined) setInternalMobileOpen(next);
  }

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const from = fromIso(initialCheckIn);
    if (!from) {
      setRange(undefined);
      return;
    }
    setRange({ from, to: singleDate ? undefined : fromIso(initialCheckOut) });
  }, [initialCheckIn, initialCheckOut, singleDate]);

  useEffect(() => {
    setStartTime(initialStartTime ?? "");
  }, [initialStartTime]);

  useEffect(() => {
    fetch("/api/public/destinations")
      .then((res) => (res.ok ? res.json() : { destinations: [] }))
      .then((json: { destinations?: Destination[] }) => setDestinations(json.destinations ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const delayDebounce = setTimeout(() => {
      fetch(`/api/public/autocomplete?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { suggestions: [] }))
        .then((json) => setSuggestions(json.suggestions ?? []))
        .catch(() => {});
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(delayDebounce);
    };
  }, [query]);

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
      checkOut: singleDate ? undefined : toIso(range?.to),
      startTime: asksForTime && startTime ? startTime : undefined,
      guests: guests > 0 ? guests : undefined,
    });
  }

  function clearAll() {
    setQuery("");
    setRange(undefined);
    setStartTime("");
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

  const dateText = rangeLabel(range, singleDate);
  const guestsLabel =
    guests > 0
      ? `${guests} ${isExperience ? "seat" : "guest"}${guests === 1 ? "" : "s"}`
      : copy.whoEmpty;
  const timeLabel = startTime || copy.timeEmpty;
  const afterWhenSection = asksForTime ? "time" : "who";

  const suggestionsDropdown = (
    <ul className="max-h-72 overflow-y-auto divide-y divide-zinc-50">
      <li>
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) {
              alert("Geolocation is not supported by your browser.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                try {
                  const res = await fetch(`/api/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                  const data = await res.json();
                  const cityName = data?.address?.city || data?.address?.area || "Nearby";
                  setQuery(cityName);
                  setWhereOpen(false);
                  setMobileOpen(false);
                  router.push(`/search?q=${encodeURIComponent(cityName)}&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
                } catch {
                  setQuery("Nearby");
                  setWhereOpen(false);
                  setMobileOpen(false);
                  router.push(`/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
                }
              },
              () => {
                alert("Location access denied. Please enable location permissions in your browser.");
              }
            );
          }}
          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors text-crimson font-bold text-sm"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-crimson">
            <MapPin className="h-4.5 w-4.5 fill-crimson text-white" />
          </span>
          <div>
            <span className="block text-sm font-bold">Use my current location</span>
            <span className="block text-xs text-muted-foreground font-normal">Search properties near you</span>
          </div>
        </button>
      </li>
      {onNearby && !query.trim() && (
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
              <span className="block text-xs text-muted-foreground">{copy.nearbyBody}</span>
            </span>
          </button>
        </li>
      )}
      {query.trim() && suggestions.length === 0 ? (
        <li className="px-4 py-3 text-sm text-muted-foreground text-center">
          No matches found
        </li>
      ) : query.trim() ? (
        suggestions.map((s, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => {
                setQuery(s.search_query);
                setWhereOpen(false);
                if (mobileOpen) {
                  setMobileSection("when");
                } else {
                  submit(s.search_query);
                }
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted transition-colors"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                {s.type === "destination" ? (
                  <Search className="h-4.5 w-4.5" />
                ) : (
                  <MapPin className="h-4.5 w-4.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#2b000a] truncate">{s.name}</span>
                {s.subtitle && (
                  <span className="block text-xs text-muted-foreground truncate">{s.subtitle}</span>
                )}
              </div>
            </button>
          </li>
        ))
      ) : (
        destinations.map((destination) => (
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
        ))
      )}
    </ul>
  );

  const guestStepper = (
    <div className="flex items-center justify-between px-1 py-2">
      <div>
        <p className="text-sm font-semibold">{copy.whoTitle}</p>
        <p className="text-xs text-muted-foreground">{copy.whoBody}</p>
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

  function calendarPicker(numberOfMonths: number, className?: string) {
    if (singleDate) {
      return (
        <Calendar
          mode="single"
          numberOfMonths={numberOfMonths}
          selected={range?.from}
          onSelect={(date) => setRange(date ? { from: date } : undefined)}
          disabled={{ before: new Date() }}
          className={className}
        />
      );
    }

    return (
      <Calendar
        mode="range"
        numberOfMonths={numberOfMonths}
        selected={range}
        onSelect={setRange}
        disabled={{ before: new Date() }}
        className={className}
      />
    );
  }

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
            <span className="block text-xs font-bold">{copy.whereLabel}</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setWhereOpen(true)}
              placeholder={copy.wherePlaceholder}
              className="w-full border-0 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </label>
          {whereOpen && (destinations.length > 0 || suggestions.length > 0 || onNearby || query.trim()) && (
            <div className="absolute left-0 top-[calc(100%+12px)] z-40 w-[380px] rounded-3xl bg-white p-3 shadow-xl ring-1 ring-black/10">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
                {query.trim() ? "Location matches" : copy.suggestionTitle}
              </p>
              {suggestionsDropdown}
            </div>
          )}
        </div>

        <span className="my-3 w-px bg-black/10" />

        <Popover>
          <PopoverTrigger
            render={<button type="button" className="min-w-0 flex-1 cursor-pointer rounded-full px-6 py-2.5 text-left hover:bg-black/4" />}
          >
            <span className="block text-xs font-bold">{copy.whenLabel}</span>
            <span
              className={`block truncate text-sm ${range?.from ? "" : "text-muted-foreground"}`}
            >
              {range?.from ? dateText : copy.whenEmpty}
            </span>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="bottom"
            sideOffset={14}
            collisionPadding={12}
            collisionAvoidance={{ side: "none", align: "shift" }}
            className="max-h-[min(72vh,560px)] w-auto overflow-y-auto rounded-3xl p-4"
          >
            {calendarPicker(2)}
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

        {asksForTime && (
          <>
            <label className="min-w-0 flex-[0.8] cursor-pointer rounded-full px-6 py-2.5 hover:bg-black/4">
              <span className="block text-xs font-bold">{copy.timeLabel}</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className={`w-full border-0 bg-transparent text-base outline-none md:text-sm ${
                  startTime ? "" : "text-muted-foreground"
                }`}
              />
            </label>

            <span className="my-3 w-px bg-black/10" />
          </>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full pr-2 hover:bg-black/4">
          <Popover>
            <PopoverTrigger
              render={<button type="button" className="min-w-0 flex-1 cursor-pointer rounded-full px-6 py-2.5 text-left" />}
            >
              <span className="block text-xs font-bold">{copy.whoLabel}</span>
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
            className="my-1.5 flex size-12 shrink-0 items-center justify-center rounded-full bg-[#800020] text-white transition-colors hover:bg-merlot"
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
            {query || (isExperience ? "Find an experience" : "Where to?")}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {dateText === "Add dates" ? "Anytime" : dateText}
            {asksForTime && startTime ? ` at ${startTime}` : ""} ·{" "}
            {guests > 0 ? guestsLabel : copy.whoEmpty}
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
                  <p className="mb-3 text-xl font-bold text-[#2b000a]">{copy.whereTitle}</p>
                  <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={copy.wherePlaceholder}
                      className="w-full border-0 bg-transparent text-base outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submit();
                      }}
                    />
                  </div>
                  <p className="px-1 pb-1 pt-4 text-xs font-semibold text-muted-foreground">
                    {query.trim() ? "Location matches" : copy.suggestionTitle}
                  </p>
                  {suggestionsDropdown}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileSection("where")}
                  className="flex w-full items-center justify-between"
                >
                  <span className="text-sm font-semibold text-muted-foreground">{copy.whereLabel}</span>
                  <span className="text-sm font-semibold">{query || copy.flexible}</span>
                </button>
              )}
            </div>

            {/* When */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              {mobileSection === "when" ? (
                <>
                  <p className="mb-1 text-xl font-bold text-[#2b000a]">{copy.whenTitle}</p>
                  {calendarPicker(1, "mx-auto")}
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
                      onClick={() => setMobileSection(afterWhenSection)}
                      className="rounded-full bg-[#f5eef1] px-4 py-2 text-sm font-semibold text-[#2b000a]"
                    >
                      {range?.from ? "Next" : `Skip ${asksForTime ? "date" : "dates"}`}
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
                    <CalendarDays className="h-4 w-4" /> {copy.whenLabel}
                  </span>
                  <span className="text-sm font-semibold">{range?.from ? dateText : copy.whenEmpty}</span>
                </button>
              )}
            </div>

            {asksForTime && (
              <div className="rounded-3xl bg-white p-4 shadow-sm">
                {mobileSection === "time" ? (
                  <>
                    <p className="mb-3 text-xl font-bold text-[#2b000a]">What time?</p>
                    <label className="flex items-center gap-3 rounded-xl border px-3 py-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                        className="w-full border-0 bg-transparent text-base outline-none"
                      />
                    </label>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMobileSection("who")}
                        className="rounded-full bg-[#f5eef1] px-4 py-2 text-sm font-semibold text-[#2b000a]"
                      >
                        {startTime ? "Next" : "Skip time"}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMobileSection("time")}
                    className="flex w-full items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Clock className="h-4 w-4" /> {copy.timeLabel}
                    </span>
                    <span className="text-sm font-semibold">{timeLabel}</span>
                  </button>
                )}
              </div>
            )}

            {/* Who */}
            <div className="rounded-3xl bg-white p-4 shadow-sm">
              {mobileSection === "who" ? (
                <>
                  <p className="mb-1 text-xl font-bold text-[#2b000a]">{copy.whoTitle}</p>
                  {guestStepper}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setMobileSection("who")}
                  className="flex w-full items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Users className="h-4 w-4" /> {copy.whoLabel}
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
