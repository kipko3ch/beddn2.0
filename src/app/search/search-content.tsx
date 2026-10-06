"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { FeaturedRail } from "@/components/home-sections";
import { Map } from "@/components/map";
import { SearchPill, type SearchPillValues } from "@/components/search-pill";
import { ChipSelect } from "@/components/chip-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSavedListings } from "@/lib/hooks";
import { ArrowLeft, Check, ChevronDown, LayoutGrid, MapPin, SlidersHorizontal, X } from "lucide-react";
import { Icon } from "@iconify/react";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { ROUTES } from "@/lib/routes";
import type { Listing } from "@/lib/types";

const CATEGORY_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "overnight", label: "Overnight" },
];

/** Pill chip that opens a clean dropdown of options (mobile filter row). */
function MobileChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  // The first option is the neutral default; anything else marks the chip active.
  const active = selected && selected.value !== options[0].value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors ${
              active
                ? "border-[#2b000a] bg-[#2b000a] text-white"
                : "border-[#e3d3d9] bg-white text-[#2b000a]"
            }`}
          />
        }
      >
        {active ? selected.label : label}
        <ChevronDown className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-60 overflow-y-auto rounded-2xl p-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted ${
              option.value === value ? "font-bold" : ""
            }`}
          >
            {option.label}
            {option.value === value && <Check className="h-4 w-4 text-crimson" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const q = searchParams.get("q") ?? "";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const category = searchParams.get("category") ?? "hourly";
  const propertyType = searchParams.get("type") ?? "all";
  const checkIn = searchParams.get("checkin");
  const checkOut = searchParams.get("checkout");
  const startTime = searchParams.get("startTime");
  const guests = Number(searchParams.get("guests")) || 0;

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const priceMode: "hourly" | "overnight" = category === "hourly" ? "hourly" : "overnight";
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [geocodedCenter, setGeocodedCenter] = useState<[number, number] | undefined>();
  const [isBroadLocation, setIsBroadLocation] = useState(true);
  const [mapLabel, setMapLabel] = useState("");
  const { savedIds, toggle } = useSavedListings();
  const asksForTime = category === "hourly";

  const fetchResults = useCallback(async () => {
    setLoading(true);

    // Server route uses the service role so results show for everyone,
    // signed in or not, regardless of database policy state.
    const params = new URLSearchParams({ category, type: propertyType, limit: "50" });
    if (q) params.set("q", q);
    let results: Listing[] = [];
    try {
      const res = await fetch(`/api/public/listings?${params.toString()}`);
      const json: { listings?: Listing[] } = res.ok ? await res.json() : {};
      results = json.listings ?? [];
    } catch {
      results = [];
    }
    setListings(results);
    setLoading(false);

    // Log demand in the background — captures supply gaps and guest requirements
    void supabase.from("search_demand").insert({
      query: q || null,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      category: category || null,
      check_in: checkIn || null,
      check_out: checkOut || null,
      guests: guests > 0 ? guests : null,
      property_type: propertyType || null,
      status: results.length === 0 ? "unmatched" : "matched",
      results_count: results.length,
    });
  }, [q, lat, lng, category, propertyType, checkIn, checkOut, startTime, guests]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    let active = true;
    const localCenter = lookupQueryCenter(q);

    setMapLabel(q);
    setGeocodedCenter(undefined);
    setIsBroadLocation(true); // default to true for predefined queries or coordinates

    if (!q || (lat && lng) || localCenter) return;

    fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { center?: [number, number]; label?: string; isBroad?: boolean } | null) => {
        if (!active || !data?.center) return;
        setGeocodedCenter(data.center);
        setMapLabel(data.label || q);
        setIsBroadLocation(data.isBroad ?? true);
      })
      .catch(() => {
        if (active) setMapLabel(q);
      });

    return () => {
      active = false;
    };
  }, [q, lat, lng]);

  // Lock body scroll while the mobile map overlay is open. Always restore to
  // "" so a stale captured value can never leave the page unscrollable.
  useEffect(() => {
    if (!showMap) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showMap]);

  function pushSearch(next: {
    q?: string;
    category?: string;
    type?: string;
    checkIn?: string | null;
    checkOut?: string | null;
    startTime?: string | null;
    guests?: number | null;
  }) {
    const params = new URLSearchParams();
    const nextQ = next.q !== undefined ? next.q : q;
    const cat = next.category ?? category;
    const type = next.type ?? propertyType;
    const nextCheckIn = next.checkIn !== undefined ? next.checkIn : checkIn;
    const nextCheckOut = next.checkOut !== undefined ? next.checkOut : checkOut;
    const nextStartTime = next.startTime !== undefined ? next.startTime : startTime;
    const nextGuests = next.guests !== undefined ? next.guests : guests;
    if (nextQ) params.set("q", nextQ);
    if (cat !== "all") params.set("category", cat);
    if (type !== "all") params.set("type", type);
    if (nextCheckIn) params.set("checkin", nextCheckIn);
    if (nextCheckOut && cat !== "hourly") params.set("checkout", nextCheckOut);
    if (nextStartTime && cat === "hourly") params.set("startTime", nextStartTime);
    if (nextGuests) params.set("guests", String(nextGuests));
    router.push(`/search?${params.toString()}`);
  }

  function handlePillSearch(values: SearchPillValues) {
    pushSearch({
      q: values.q,
      checkIn: values.checkIn ?? null,
      checkOut: values.checkOut ?? null,
      startTime: values.startTime ?? null,
      guests: values.guests ?? null,
    });
  }

  function handleNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        router.push(`/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&category=${category}`);
      },
      () => alert("Could not get your location. Please allow location access.")
    );
  }

  // Clicking a pin now opens a card overlay directly on the map (handled
  // inside <Map>) instead of jumping away — this only fires when the guest
  // clicks into that card to actually open the listing.
  function handlePinHighlight(listing: Listing) {
    setHighlightedId(listing.id);
    const card = document.getElementById(`listing-${listing.id}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    const carouselCard = document.getElementById(`carousel-card-${listing.id}`);
    if (carouselCard) {
      carouselCard.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function handlePinSelect(listing: Listing) {
    router.push(`/property/${listing.slug}`);
  }

  function lookupQueryCenter(value: string): [number, number] | undefined {
    const normalized = value.toLowerCase();
    if (normalized.includes("nairobi")) return [36.8219, -1.2921];
    if (normalized.includes("mombasa")) return [39.6682, -4.0435];
    if (normalized.includes("kisumu")) return [34.7617, -0.0917];
    if (normalized.includes("nakuru")) return [36.0800, -0.3031];
    if (normalized.includes("arusha")) return [36.68299, -3.38693];
    if (normalized.includes("dar")) return [39.2083, -6.7924];
    if (normalized.includes("zanzibar")) return [39.1979, -6.1659];
    return undefined;
  }

  const mapCenter: [number, number] | undefined =
    lat && lng ? [parseFloat(lng), parseFloat(lat)] : lookupQueryCenter(q) || geocodedCenter;

  const activeFilterCount =
    1 + (propertyType !== "all" ? 1 : 0);

  const headerTitle = q
    ? `Stays in ${q}`
    : "Where to?";
  const dateSummary = (() => {
    if (!checkIn) return "Anytime";
    try {
      const from = format(parseISO(checkIn), "MMM d");
      return checkOut ? `${from} – ${format(parseISO(checkOut), "MMM d")}` : from;
    } catch {
      return "Anytime";
    }
  })();
  const timeSummary = asksForTime && startTime ? ` at ${startTime}` : "";
  const guestSummary =
    guests > 0
      ? `${guests} ${guests === 1 ? "guest" : "guests"}`
      : "Add guests";

  const mapView = (
    <div className="relative h-full w-full">
      {mapCenter && listings.length === 0 && (
        <div className="hidden lg:block absolute left-4 top-4 z-10 max-w-sm rounded-2xl bg-white/95 px-4 py-3 text-sm shadow-md border border-neutral-200">
          <p className="font-bold text-[#181113]">Showing searched area</p>
          <p className="truncate text-xs text-muted-foreground">{mapLabel || q}</p>
        </div>
      )}
      <Map
        listings={listings}
        center={mapCenter}
        highlightedId={highlightedId}
        onPinClick={handlePinHighlight}
        onPinSelect={handlePinSelect}
        priceMode={priceMode}
        isBroad={isBroadLocation}
        className="h-full w-full"
      />
    </div>
  );

  const resultsContent = (
    <>
      {/* Browse all categories link */}
      <Link
        href={ROUTES.home}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-merlot hover:underline"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Browse all categories
      </Link>
      {q && (
        <FeaturedRail
          placement="city_featured"
          city={q}
          heading={`Featured in ${q}`}
          savedIds={savedIds}
          onToggleSave={toggle}
          priceMode={priceMode}
        />
      )}
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-cranberry">
          {q ? `Search results for ${q}` : "Explore verified stays"}
        </p>
        <h1 className="mt-1 font-brand text-2xl tracking-tight text-[#2b000a] sm:text-4xl">
          {loading
            ? "Finding places"
            : listings.length > 0
            ? `${listings.length} verified place${listings.length === 1 ? "" : "s"} to stay`
            : `No places to stay found in "${q || "this area"}"`}
        </h1>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Tip: pick a place, then reserve with your phone number.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 sm:gap-6">
          {listings.map((listing) => (
            <div
              key={listing.id}
              id={`listing-${listing.id}`}
              className="rounded-xl"
            >
              <ListingCard
                listing={listing}
                onHover={setHighlightedId}
                isSaved={savedIds.has(listing.id)}
                onToggleSave={() => toggle(listing.id)}
                priceMode={priceMode}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border bg-[#fbf7f8] px-5 py-12 text-center sm:px-8">
          <Image
            src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029373/empty-no-places_tcbzxs.png"
            alt=""
            width={220}
            height={170}
            className="mx-auto mb-4 h-auto w-[200px]"
            aria-hidden
          />
          <p className="text-2xl font-bold">No verified listings here yet.</p>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Be the first verified host in this area and get early visibility as demand grows.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              onClick={() => router.push("/host/listings/new")}
              className="h-11 w-full rounded-full bg-[#800020] px-6 font-semibold hover:bg-merlot sm:w-auto"
            >
              Be the first to list your place
            </Button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <main className="bg-white text-[#181113]">
      {/* Mobile: compact pill header + filter chips (Airbnb style) */}
      <div className="sticky top-0 z-40 border-b bg-white px-3 pb-2.5 pt-3 md:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Back to home"
            onClick={() => router.push("/")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setSearchOverlayOpen(true)}
            className="flex min-w-0 flex-1 flex-col items-center rounded-full border border-black/10 bg-white px-4 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          >
            <span className="max-w-full truncate text-sm font-semibold">{headerTitle}</span>
            <span className="max-w-full truncate text-xs text-muted-foreground">
              {dateSummary}{timeSummary} · {guestSummary}
            </span>
          </button>
          <button
            type="button"
            aria-label="Open filters"
            onClick={() => setFiltersOpen(true)}
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-[#e3d3d9] bg-white shadow-sm"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4.5 items-center justify-center rounded-full bg-crimson text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
        <div className="mt-2.5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ChipSelect
            label="Booking type"
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={(value) => pushSearch({ category: value })}
            variant="compact"
          />
          <ChipSelect
            label="Type of place"
            value={propertyType}
            options={[{ value: "all", label: "Any type of place" }, ...PROPERTY_TYPES]}
            onChange={(value) => pushSearch({ type: value })}
            variant="compact"
          />

        </div>
      </div>

      {/* One SearchPill for all sizes: it renders the desktop pill on md+ and
          only the (header-controlled) full-screen overlay on mobile. Keeping a
          single instance also keeps a single body-scroll lock. */}
      <section className="bg-white md:border-b">
        <div className="mx-auto max-w-7xl md:px-6 md:py-5 lg:px-8">
          <div className="mx-auto md:max-w-3xl">
            <SearchPill
              key={`${q}|${category}|${checkIn}|${checkOut}|${startTime}|${guests}`}
              initialQuery={q}
              initialCheckIn={checkIn}
              initialCheckOut={checkOut}
              initialStartTime={startTime}
              initialGuests={guests}
              mode={category === "hourly" ? "hourly" : "overnight"}
              onSearch={handlePillSearch}
              onNearby={handleNearby}
              showMobileTrigger={false}
              open={searchOverlayOpen}
              onOpenChange={setSearchOverlayOpen}
            />
          </div>
          <div className="mt-4 hidden flex-wrap items-center gap-3 md:flex">
            <div className="inline-flex gap-1 rounded-full bg-[#f5eef1] p-1">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => pushSearch({ category: option.value })}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    category === option.value
                      ? "bg-[#800020] text-white"
                      : "text-[#6f6568] hover:text-[#2b000a]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <ChipSelect
              label="Property type"
              value={propertyType}
              options={[{ value: "all", label: "All property types" }, ...PROPERTY_TYPES]}
              onChange={(value) => pushSearch({ type: value })}
            />
          </div>
        </div>
      </section>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-0">
          <SheetHeader className="border-b p-5">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow down places to stay</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 p-5 pb-8">
            <div>
              <p className="mb-3 text-sm font-bold text-[#2b000a]">Booking type</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      pushSearch({ category: option.value });
                      setFiltersOpen(false);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      category === option.value
                        ? "border-crimson bg-crimson text-white"
                        : "border-[#e3d3d9] bg-white text-[#2b000a]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-[#2b000a]">Property type</p>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: "all", label: "All property types" }, ...PROPERTY_TYPES].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      pushSearch({ type: p.value });
                      setFiltersOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold ${
                      propertyType === p.value
                        ? "border-crimson bg-crimson text-white"
                        : "border-[#e3d3d9] bg-white text-[#2b000a]"
                    }`}
                  >
                    <span className="truncate">{p.label}</span>
                    {propertyType === p.value && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>



      {/* Interactive map view when showMap is true (Mobile & Large screens) */}
      {showMap && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="absolute inset-0">{!loading && mapView}</div>

          {/* Top Floating Control Bar */}
          <div className="absolute top-3 inset-x-3 sm:top-5 sm:inset-x-6 z-30 flex items-center gap-2 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => setShowMap(false)}
              aria-label="Back to list"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md border border-neutral-200 text-[#181113] hover:bg-neutral-50 active:scale-95 transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-between rounded-2xl bg-white/95 px-3.5 py-2 shadow-md border border-neutral-200 backdrop-blur-sm">
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#181113]">
                    {listings.length} {listings.length === 1 ? "place" : "places"} found
                  </span>
                  {listings.length === 0 && (
                    <span className="rounded-full bg-[#fbf0f3] border border-[#f3cfd9] px-2 py-0.5 text-[10px] font-bold text-[#800020]">
                      Searched area
                    </span>
                  )}
                </div>
                {(mapLabel || q) && (
                  <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                    {mapLabel || q}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMap(false)}
                aria-label="Close map"
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-[#181113] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bottom Swipeable Listings Carousel */}
          {listings.length > 0 && (
            <div className="absolute bottom-20 sm:bottom-24 inset-x-0 z-30 px-3 sm:px-6 max-w-5xl mx-auto">
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {listings.map((item) => {
                  const isSelected = highlightedId === item.id;
                  const img = item.listing_images?.[0]?.url;
                  const price =
                    priceMode === "overnight" && item.overnight_price
                      ? item.overnight_price
                      : priceMode === "hourly" && item.hourly_price
                      ? item.hourly_price
                      : item.hourly_price ?? item.overnight_price ?? 0;
                  const unit = priceMode === "overnight" ? "night" : "hr";

                  return (
                    <div
                      key={item.id}
                      id={`carousel-card-${item.id}`}
                      onClick={() => handlePinSelect(item)}
                      className={`flex w-[290px] sm:w-[320px] shrink-0 snap-center cursor-pointer items-center gap-3 rounded-2xl bg-white p-2.5 shadow-xl transition-all border ${
                        isSelected ? "border-[#800020] ring-2 ring-[#800020]/25" : "border-neutral-200/90"
                      }`}
                    >
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                        {img ? (
                          <Image src={img} alt="" fill className="object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-[10px] text-neutral-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#181113]">{item.title || item.name}</p>
                        <p className="truncate text-[11px] text-neutral-500">
                          {item.area ? `${item.area}, ` : ""}{item.city}
                        </p>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-xs font-extrabold text-[#800020]">
                            ${price} <span className="text-[10px] font-normal text-neutral-500">/{unit}</span>
                          </span>
                          <span className="rounded-full bg-[#fbf0f3] px-2 py-0.5 text-[10px] font-bold text-[#800020]">
                            View →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Floating toggle button: Show list */}
          <button
            type="button"
            onClick={() => setShowMap(false)}
            className="fixed bottom-6 sm:bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#181113] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xl hover:bg-black transition-all border border-white/20 active:scale-95"
          >
            <Icon icon="solar:list-bold-duotone" className="h-4 w-4 text-[#800020] bg-white rounded-full p-0.5" />
            <span>Show list</span>
          </button>
        </div>
      )}

      {/* Results list when not in map mode (All screen sizes) */}
      {!showMap && (
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-32 sm:pb-36">
          {resultsContent}
        </section>
      )}

      {/* Floating View Toggle Button when in list view */}
      {!showMap && (
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="fixed bottom-8 sm:bottom-10 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#181113] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xl hover:bg-black transition-all border border-white/20 active:scale-95"
        >
          <Icon icon="solar:map-bold-duotone" className="h-4 w-4 text-[#800020] bg-white rounded-full p-0.5" />
          <span>Show map</span>
        </button>
      )}
    </main>
  );
}
