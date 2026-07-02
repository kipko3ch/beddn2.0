"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { InquiryFlow, type InquiryDraft } from "@/components/inquiry-flow";
import { StayInstructions } from "@/components/stay-instructions";
import { track } from "@/lib/track";
import type { AvailabilityStatus } from "@/lib/types";
import {
  ArrowLeft,
  Bath,
  Car,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  MapPin,
  Moon,
  Share,
  ShowerHead,
  Star,
  Check,
  Utensils,
  UserCircle,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { Calendar } from "@/components/ui/calendar";
import { Map } from "@/components/map";
import { useSavedListings } from "@/lib/hooks";
import { useCurrency } from "@/components/currency-provider";
import { LOGO_SRC } from "@/lib/assets";
import type { Listing, Review } from "@/lib/types";
import type { ListingCategory } from "@/lib/types";
import type { DateRange } from "react-day-picker";
import { AMENITY_LABEL, AMENITY_ICON as AMENITY_ICON_MAP } from "@/lib/amenities";
import { AmenityIcon } from "@/components/amenity-icon";
import { PROPERTY_TYPE_LABEL } from "@/lib/property-types";

// Legacy fallback for older listings that stored human labels ("WiFi") rather
// than catalog slugs ("wifi").
const AMENITY_ICON: Record<string, React.ElementType> = {
  wifi: Wifi,
  parking: Car,
  kitchen: Utensils,
  "air conditioning": Wind,
  "hot water": ShowerHead,
  pool: Bath,
};

function priceCurrency(listing: Listing) {
  return listing.currency || "KES";
}

// Grid spans for the up-to-4 side tiles in the desktop mosaic, keyed by how
// many side tiles actually exist. Fewer photos means the last one stretches
// to cover what would otherwise be an empty placeholder cell.
function sideTileSpan(index: number, sideCount: number): string {
  if (sideCount === 1) return "col-span-2 row-span-2";
  if (sideCount === 2) return "col-span-2";
  if (sideCount === 3) return index === 2 ? "col-span-2" : "";
  return "";
}

function primaryImage(listing: Listing) {
  return listing.listing_images?.[0]?.url || LOGO_SRC;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function defaultDateRange(): DateRange {
  const from = addDays(startOfDay(new Date()), 6);
  return { from, to: addDays(from, 2) };
}

function compactDate(date?: Date) {
  return date
    ? date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
}

const PROPERTY_CALENDAR_CLASS_NAMES = {
  root: "mx-auto w-full",
  months: "relative flex w-full flex-col items-center gap-8 md:flex-row md:items-start md:justify-between md:gap-12",
  month: "w-[calc(var(--cell-size)*7)] max-w-full",
  month_caption: "mb-5 flex h-10 w-full items-center justify-center px-10",
  caption_label: "text-lg font-bold text-[#202124] sm:text-xl",
  nav: "absolute inset-x-0 top-0 flex w-full items-center justify-between",
  button_previous: "size-10 rounded-full text-[#202124] hover:bg-[#f5f5f5] aria-disabled:text-[#d6d6d6]",
  button_next: "size-10 rounded-full text-[#202124] hover:bg-[#f5f5f5] aria-disabled:text-[#d6d6d6]",
  weekdays: "grid grid-cols-7",
  weekday:
    "flex h-10 items-center justify-center text-center text-sm font-semibold text-[#6d6d6d]",
  week: "grid w-full grid-cols-7",
  day: "relative h-(--cell-size) w-full p-0 text-center",
  day_button:
    "mx-auto size-(--cell-size) min-w-0 rounded-full text-base font-semibold text-[#202124] hover:bg-[#f5f5f5] data-[range-start=true]:bg-[#202124] data-[range-start=true]:text-white data-[range-end=true]:bg-[#202124] data-[range-end=true]:text-white data-[selected-single=true]:bg-[#202124] data-[selected-single=true]:text-white data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-[#202124]",
  range_start:
    "rounded-l-full bg-[#f4f4f4] after:absolute after:inset-y-0 after:right-0 after:w-1/2 after:bg-[#f4f4f4]",
  range_middle: "rounded-none bg-[#f4f4f4]",
  range_end:
    "rounded-r-full bg-[#f4f4f4] after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:bg-[#f4f4f4]",
  today: "bg-transparent",
  disabled: "text-[#adadad] opacity-100 line-through",
  outside: "invisible",
  hidden: "invisible",
};

function AmenityItem({ label }: { label: string }) {
  // `label` is the stored amenity string: a catalog slug for new listings, or a
  // human label for legacy ones. Icons are neutral line icons (no check ticks).
  const mdiIcon = AMENITY_ICON_MAP[label];
  const display = AMENITY_LABEL[label] ?? label;
  if (mdiIcon) {
    return (
      <div className="flex items-center gap-3.5 py-1 text-[15px] text-[#241f21]">
        <AmenityIcon icon={mdiIcon} width={22} height={22} className="text-[#2b000a]" />
        <span>{display}</span>
      </div>
    );
  }
  const Icon = AMENITY_ICON[label.toLowerCase()];
  return (
    <div className="flex items-center gap-3.5 py-1 text-[15px] text-[#241f21]">
      {Icon ? (
        <Icon className="h-[22px] w-[22px] text-[#2b000a]" />
      ) : (
        // Neutral marker for amenities without a known icon — avoids the
        // "cheap" checkmark look.
        <span className="flex h-[22px] w-[22px] items-center justify-center">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2b000a]" />
        </span>
      )}
      <span>{display}</span>
    </div>
  );
}

export function PropertyContent({
  listing,
  reviews,
  blockedDateStrings,
  priceByDate = {},
  isOwnListing = false,
}: {
  listing: Listing;
  reviews: Review[];
  blockedDateStrings: string[];
  priceByDate?: Record<string, number>;
  isOwnListing?: boolean;
}) {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }
  const categories = (listing.categories || listing.category || []) as ListingCategory[];
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory>(
    categories[0] || "overnight"
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => defaultDateRange());
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(defaultDateRange().from!));
  const [startTime, setStartTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState("2");
  const [guests, setGuests] = useState("1");
  const { savedIds, toggle } = useSavedListings();
  const { formatPrice } = useCurrency();
  const isSaved = savedIds.has(listing.id);
  const [shared, setShared] = useState(false);

  async function shareProperty() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = listing.title || listing.name;
    // Native share sheet on mobile; clipboard copy as the desktop fallback.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: `Check out ${title} on Beddn`, url });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* ignore */
    }
  }

  // Load the signed-in user (browsing is open; contact reveal needs login).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  // Count the listing view once on mount (analytics / demand proof).
  useEffect(() => {
    track("LISTING_VIEW", { listingId: listing.id });
  }, [listing.id]);

  // Re-open the inquiry sheet after a login redirect returns to this listing.
  useEffect(() => {
    if (searchParams.get("inquiry") === "1") {
      setInquiryOpen(true);
    }
  }, [searchParams]);

  const images = listing.listing_images?.length ? listing.listing_images : [
    { id: "fallback", listing_id: listing.id, url: primaryImage(listing), position: 0 },
  ];
  const sideCount = Math.min(images.length - 1, 4);

  const blockedDates = useMemo(
    () => blockedDateStrings.map((date) => new Date(date)),
    [blockedDateStrings]
  );
  const today = useMemo(() => startOfDay(new Date()), []);
  const disabledCalendarDays = useMemo(
    () => [{ before: today }, ...blockedDates],
    [blockedDates, today]
  );

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  // A combined "what this place offers" list: real amenities first, then a few
  // useful stay facts — all rendered with neutral line icons (no ticks).
  const stayFacts = [
    listing.minimum_hours ? `${listing.minimum_hours}+ hour minimum` : null,
    listing.total_units && listing.total_units > 1 ? `${listing.total_units} rooms / units` : null,
    "Exact address after you inquire",
  ].filter(Boolean) as string[];
  const allOfferings = [...listing.amenities, ...stayFacts];
  const visibleOfferings = allOfferings.slice(0, 8);

  const selectedDate = dateRange?.from;
  const blockedSet = useMemo(
    () => new Set(blockedDateStrings.map((item) => item.slice(0, 10))),
    [blockedDateStrings]
  );
  const selectedDateKey = selectedDate?.toISOString().slice(0, 10);
  const isSelectedBlocked = selectedDateKey ? blockedSet.has(selectedDateKey) : false;
  const availableUnits = Math.max(0, Number(listing.available_units || listing.total_units || 1));
  const hasAvailability = Boolean(selectedDate && !isSelectedBlocked && availableUnits > 0);
  const priceOptions = [
    listing.hourly_price
      ? { label: "Hourly", suffix: "/hr", value: Number(listing.hourly_price) }
      : null,
    listing.overnight_price
      ? { label: "Overnight", suffix: "/night", value: Number(listing.overnight_price) }
      : null,
    listing.experience_price
      ? { label: "Experience", suffix: "/session", value: Number(listing.experience_price) }
      : null,
  ].filter(Boolean) as { label: string; suffix: string; value: number }[];
  const primaryPrice = priceOptions[0];
  const dateSummary = useMemo(() => {
    const place = listing.city || listing.area || "this stay";
    if (!dateRange?.from) {
      return {
        title: `Select dates in ${place}`,
        subtitle: "Choose your dates to check availability",
      };
    }

    if (selectedCategory === "overnight") {
      const nights = dateRange.to
        ? Math.max(
            1,
            Math.round((startOfDay(dateRange.to).getTime() - startOfDay(dateRange.from).getTime()) / 86400000)
          )
        : 1;
      return {
        title: `${nights} night${nights === 1 ? "" : "s"} in ${place}`,
        subtitle: dateRange.to
          ? `${compactDate(dateRange.from)} - ${compactDate(dateRange.to)}`
          : `${compactDate(dateRange.from)} - Select check-out`,
      };
    }

    if (selectedCategory === "hourly") {
      const hours = Math.max(1, Number(durationHours) || 1);
      return {
        title: `${hours} hour${hours === 1 ? "" : "s"} in ${place}`,
        subtitle: `${compactDate(dateRange.from)} at ${startTime}`,
      };
    }

    return {
      title: `Session in ${place}`,
      subtitle: `${compactDate(dateRange.from)} at ${startTime}`,
    };
  }, [dateRange, durationHours, listing.area, listing.city, selectedCategory, startTime]);

  function inputDate(date?: Date) {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Availability outcome saved with the inquiry and used to pick guest copy.
  const availabilityStatus: AvailabilityStatus = !selectedDate
    ? "NEEDS_CONFIRMATION"
    : isSelectedBlocked || availableUnits <= 0
    ? "UNAVAILABLE"
    : "AVAILABLE";

  const inquiryDraft: InquiryDraft = {
    category: selectedCategory,
    checkIn: inputDate(dateRange?.from),
    checkOut: inputDate(dateRange?.to),
    hourlySlot: selectedCategory === "hourly" ? `${startTime} · ${durationHours}h` : startTime,
    guests: Number(guests) || 1,
    availabilityStatus,
  };

  // Nightly total across the selected overnight range, honoring per-date price
  // overrides and falling back to the base price for unset dates.
  const overnightEstimate = useMemo(() => {
    if (selectedCategory !== "overnight" || !dateRange?.from || !dateRange?.to) return null;
    const base = Number(listing.overnight_price || 0);
    if (!base && Object.keys(priceByDate).length === 0) return null;
    let total = 0;
    let nights = 0;
    const cursor = startOfDay(dateRange.from);
    const end = startOfDay(dateRange.to);
    while (cursor < end) {
      total += priceByDate[inputDate(cursor)] ?? base;
      nights += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return nights > 0 ? { total, nights } : null;
  }, [selectedCategory, dateRange, listing.overnight_price, priceByDate]);

  // Deep link into the request-to-book flow, pre-filled with the chosen dates.
  const reserveHref =
    `/reserve/${listing.id}?category=${selectedCategory}` +
    `&checkIn=${inputDate(dateRange?.from)}` +
    (selectedCategory === "overnight" && dateRange?.to ? `&checkOut=${inputDate(dateRange.to)}` : "") +
    (selectedCategory !== "overnight" ? `&startTime=${encodeURIComponent(startTime)}` : "") +
    (selectedCategory === "hourly" ? `&duration=${durationHours}` : "") +
    `&guests=${guests}`;

  function handleSelectRange(range: DateRange | undefined) {
    setDateRange(range);
    if (range?.from) {
      track("CALENDAR_DATE_SELECTED", {
        listingId: listing.id,
        metadata: { checkIn: inputDate(range.from), category: selectedCategory },
      });
    }
  }

  function openInquiry() {
    if (isOwnListing) return;
    setInquiryOpen(true);
  }

  return (
    <main className="bg-white pb-24 text-[#181113] lg:pb-0">
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[#800020] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to stays
          </Link>
        </div>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-brand text-3xl tracking-tight text-[#2b000a] sm:text-4xl">
              {listing.title || listing.name}
            </h1>
            {/* One compact meta line: location · type · rating, then small chips */}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {listing.area}, {listing.city}, {listing.country}
              </span>
              {listing.property_type && PROPERTY_TYPE_LABEL[listing.property_type] && (
                <>
                  <span aria-hidden>·</span>
                  <span>{PROPERTY_TYPE_LABEL[listing.property_type]}</span>
                </>
              )}
              {reviews.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1 text-[#2b000a]">
                    <Star className="h-4 w-4 fill-[#800020] text-[#800020]" />
                    {avgRating.toFixed(1)} ({reviews.length})
                  </span>
                </>
              )}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => {
                const Icon = cat === "hourly" ? Clock : cat === "overnight" ? Moon : Compass;
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full bg-cream/70 px-2.5 py-1 text-xs font-medium capitalize text-merlot"
                  >
                    <Icon className="h-3.5 w-3.5" /> {cat}
                  </span>
                );
              })}
              {(listing.is_verified || listing.host?.is_verified) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-crimson/15 px-2.5 py-1 text-xs font-semibold text-[#800020]">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {listing.is_verified ? "Beddn verified" : "Verified host"}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isOwnListing && hasAvailability && (
              <Link
                href={reserveHref}
                className="hidden h-9 items-center justify-center rounded-full bg-[#800020] px-5 text-sm font-bold text-white hover:bg-merlot sm:inline-flex"
              >
                Request to book
              </Link>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={shareProperty}
              aria-label="Share this listing"
            >
              {shared ? <Check className="h-4 w-4 text-[#1a7f46]" /> : <Share className="h-4 w-4" />}
              <span className="hidden sm:inline">{shared ? "Link copied" : "Share"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => toggle(listing.id)}
              aria-label={isSaved ? "Remove from saved trips" : "Save listing"}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-[#800020] text-[#800020]" : ""}`} />
              <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
            </Button>
          </div>
        </div>

        {/* Mobile: swipeable full-width carousel with counter */}
        <div className="relative -mx-4 sm:hidden">
          <div className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => openLightbox(index)}
                className="relative aspect-[4/3] w-full shrink-0 snap-center bg-muted"
              >
                <Image
                  src={image.url}
                  alt={`${listing.name} photo ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
            {images.length} photo{images.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Desktop: Airbnb-style mosaic — one hero + up to four tiles. With
            fewer than 5 photos, the last real tile stretches to cover the
            space an empty placeholder would otherwise sit in. */}
        <div className="relative hidden overflow-hidden rounded-2xl sm:block">
          <div className="grid h-[420px] grid-cols-4 grid-rows-2 gap-2 lg:h-[480px]">
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className={`relative bg-muted ${
                sideCount === 0 ? "col-span-4 row-span-2" : "col-span-2 row-span-2"
              }`}
            >
              <Image
                src={images[0]?.url || LOGO_SRC}
                alt={listing.name}
                fill
                priority
                sizes={sideCount === 0 ? "100vw" : "50vw"}
                className="object-cover transition-opacity hover:opacity-95"
              />
            </button>
            {Array.from({ length: sideCount }).map((_, i) => {
              const image = images[i + 1];
              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => openLightbox(i + 1)}
                  className={`relative bg-muted ${sideTileSpan(i, sideCount)}`}
                >
                  <Image
                    src={image.url}
                    alt={`${listing.name} photo ${i + 2}`}
                    fill
                    sizes="25vw"
                    className="object-cover transition-opacity hover:opacity-95"
                  />
                </button>
              );
            })}
          </div>
          {images.length > 5 && (
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="absolute bottom-4 right-4 rounded-lg border border-[#181113] bg-white px-3 py-1.5 text-sm font-semibold shadow-sm hover:bg-neutral-50"
            >
              Show all {images.length} photos
            </button>
          )}
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-[90] flex flex-col bg-black/95"
            role="dialog"
            aria-label="Photo viewer"
          >
            <div className="flex items-center justify-between p-4 text-white">
              <span className="text-sm">
                {lightboxIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                aria-label="Close photos"
                className="rounded-full bg-white/10 p-2 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative flex-1">
              <Image
                src={images[lightboxIndex].url}
                alt={`${listing.name} photo ${lightboxIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length)
                    }
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % images.length)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Booking card sits right under the photos — reachable with no scroll
          on desktop and only the gallery's height on mobile. No separate
          "Check Availability" tap: dates come pre-selected, so the action is
          ready the moment this renders. */}
      <section id="deals" className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b bg-cream/40 p-4 sm:p-5">
            <h2 className="text-lg font-bold">Check availability</h2>
            {isOwnListing && (
              <p className="mt-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#800020]">
                This is your listing. Guests can check dates and send inquiries here; use your dashboard to edit availability.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold capitalize ${
                    selectedCategory === cat
                      ? "border-[#800020] bg-[#800020] text-white"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  {cat === "experience" ? "Experience / class" : cat}
                </button>
              ))}
            </div>
            {(selectedCategory === "hourly" || selectedCategory === "experience") && (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="text-sm font-medium">
                  Start time
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border px-3"
                  />
                </label>
                {selectedCategory === "hourly" && (
                  <label className="text-sm font-medium">
                    Hours
                    <input
                      type="number"
                      min="1"
                      value={durationHours}
                      onChange={(event) => setDurationHours(event.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border px-3"
                    />
                  </label>
                )}
                <label className="text-sm font-medium">
                  {selectedCategory === "experience" ? "Seats" : "Guests"}
                  <input
                    type="number"
                    min="1"
                    value={guests}
                    onChange={(event) => setGuests(event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border px-3"
                  />
                </label>
              </div>
            )}
          </div>
          <div className="px-4 py-4 sm:px-10 sm:pb-8 sm:pt-6">
            <div className="px-1 pb-2 sm:px-4">
              <h3 className="text-xl font-bold tracking-tight text-[#202124] sm:text-2xl">
                {dateSummary.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-[#6d6d6d]">{dateSummary.subtitle}</p>
            </div>
            <div className="md:hidden">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleSelectRange}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                numberOfMonths={1}
                showOutsideDays={false}
                disabled={disabledCalendarDays}
                className="mx-auto bg-transparent p-0 [--cell-radius:999px] [--cell-size:clamp(2.45rem,12vw,3rem)]"
                classNames={PROPERTY_CALENDAR_CLASS_NAMES}
              />
            </div>
            <div className="hidden md:block">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleSelectRange}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                numberOfMonths={2}
                showOutsideDays={false}
                disabled={disabledCalendarDays}
                className="mx-auto bg-transparent p-0 [--cell-radius:999px] [--cell-size:3.45rem]"
                classNames={PROPERTY_CALENDAR_CLASS_NAMES}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setDateRange(undefined)}
                className="rounded-full px-2 py-1 text-sm font-semibold text-[#202124] underline-offset-4 hover:underline"
              >
                Clear dates
              </button>
            </div>
          </div>
          <div className="border-t p-4 sm:p-5">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className={`text-sm font-bold ${hasAvailability ? "text-[#1a7f46]" : "text-amber-700"}`}>
                {!selectedDate
                  ? "Pick your dates above."
                  : hasAvailability
                  ? "Looks available — request to book or message the host."
                  : "These dates may not be available. Try another date or ask the host."}
              </p>
              {isOwnListing ? (
                <Link
                  href={`/host/listings/${listing.id}/edit`}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#800020] px-7 text-sm font-medium text-white hover:bg-merlot"
                >
                  Manage listing
                </Link>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {hasAvailability && (
                    <Link
                      href={reserveHref}
                      className="inline-flex h-10 items-center justify-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-merlot"
                    >
                      Request to book
                    </Link>
                  )}
                  <Button
                    onClick={openInquiry}
                    variant={hasAvailability ? "outline" : "default"}
                    className={
                      hasAvailability
                        ? "rounded-full px-6"
                        : "rounded-full bg-[#800020] px-7 hover:bg-merlot"
                    }
                  >
                    {hasAvailability ? "Message host" : "Ask host anyway"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="space-y-10">
          <section id="about">
            <h2 className="mb-3 text-xl font-bold">About this place</h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {listing.description || "A verified Beddn stay with reserve-fee booking and host confirmation."}
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="mb-4 text-xl font-bold">Meet your host</h2>
            <div className="flex flex-col gap-4 rounded-2xl border bg-white p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream text-[#800020]">
                    {listing.host?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.host.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle className="h-8 w-8" />
                    )}
                  </span>
                  <div>
                    <p className="font-bold text-[#181113]">
                      Hosted by {listing.host?.name || "a Beddn host"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Host details and exact directions unlock after your booking is confirmed.
                    </p>
                  </div>
                </div>
                {listing.host?.is_verified && (
                  <Badge className="w-fit gap-1 rounded-full bg-crimson/15 px-3 py-1 text-[#800020] hover:bg-crimson/15">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified host
                  </Badge>
                )}
              </div>
              {listing.host?.bio && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#181113]">
                  {listing.host.bio}
                </p>
              )}
            </div>
          </section>

          <section id="location">
            <h2 className="mb-2 text-xl font-bold">Where you&apos;ll be</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              You&apos;ll get the exact address after your booking is confirmed by the host.
            </p>
            <div className="h-64 overflow-hidden rounded-2xl border sm:h-80">
              <Map
                listings={[listing]}
                center={[listing.longitude, listing.latitude]}
                zoom={13}
                approximate
                interactive={false}
              />
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="mb-4 text-xl font-bold">What this place offers</h2>
            {allOfferings.length > 0 ? (
              <>
                <div className="grid gap-x-12 gap-y-1.5 sm:grid-cols-2">
                  {visibleOfferings.map((item, i) => (
                    <AmenityItem key={`${item}-${i}`} label={item} />
                  ))}
                </div>
                {allOfferings.length > 8 && (
                  <button
                    onClick={() => setAmenitiesOpen(true)}
                    className="mt-5 inline-flex items-center rounded-xl border border-[#181113] px-5 py-2.5 text-sm font-semibold hover:bg-neutral-50"
                  >
                    Show all {allOfferings.length} amenities
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Amenities will be added soon.</p>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold">Good to know</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold uppercase">Booking mode</h3>
                <p className="text-sm text-muted-foreground">
                  {listing.booking_mode === "auto_accept" ? "Auto accept" : "Manual host confirmation"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase">Languages spoken</h3>
                <p className="text-sm text-muted-foreground">English, Swahili</p>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase">Check-in</h3>
                <p className="text-sm text-muted-foreground">{listing.check_in_time || "After confirmation"}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase">Check-out</h3>
                <p className="text-sm text-muted-foreground">{listing.check_out_time || "Set by host"}</p>
              </div>
            </div>
          </section>

          <Separator />

          <StayInstructions listingId={listing.id} />

          <Separator />

          <section id="reviews">
            <h2 className="mb-4 text-xl font-bold">Reviews</h2>
            {reviews.length > 0 ? (
              <>
                <div className="mb-5 flex items-center gap-4 rounded-2xl border bg-cream/40 p-4">
                  <p className="font-brand text-4xl text-[#2b000a]">{avgRating.toFixed(1)}</p>
                  <div>
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${
                            index < Math.round(avgRating)
                              ? "fill-[#800020] text-[#800020]"
                              : "text-[#e3d3d9]"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {reviews.map((review) => (
                    <div key={review.id} className="rounded-xl border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              className={`h-3.5 w-3.5 ${
                                index < review.rating
                                  ? "fill-[#800020] text-[#800020]"
                                  : "text-[#e3d3d9]"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(review as Review & { profile?: { full_name?: string | null } }).profile?.full_name ?? "Guest"}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState
                image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029375/empty-reviews_t8xgis.png"
                title="No reviews yet"
                subtitle="Be the first to review this place after your stay."
                size="sm"
              />
            )}
          </section>

        </div>

        <aside className="lg:pt-1">
          <div className="sticky top-32 rounded-2xl border bg-white p-5 shadow-sm">
            <div>
              {primaryPrice && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    From
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#2b000a]">
                    {formatPrice(primaryPrice.value, priceCurrency(listing))}
                    <span className="text-sm font-medium text-muted-foreground">
                      {primaryPrice.suffix}
                    </span>
                  </p>
                </div>
              )}
              {priceOptions.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {priceOptions.map((option) => (
                    <span
                      key={option.label}
                      className="rounded-full bg-cream/70 px-3 py-1 text-xs font-semibold text-merlot"
                    >
                      {option.label}: {formatPrice(option.value, priceCurrency(listing))}
                    </span>
                  ))}
                </div>
              )}
              {listing.deposit_amount > 0 && (
                <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                  <span>Reserve fee</span>
                  <span>{formatPrice(Number(listing.deposit_amount), priceCurrency(listing))}</span>
                </div>
              )}
              {overnightEstimate && (
                <div className="mt-3 rounded-xl bg-cream/40 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {overnightEstimate.nights} night{overnightEstimate.nights === 1 ? "" : "s"}
                    </span>
                    <span className="font-bold text-[#2b000a]">
                      {formatPrice(overnightEstimate.total, priceCurrency(listing))}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Prices can vary by date · pay the host on arrival.
                  </p>
                </div>
              )}
            </div>
            {isOwnListing ? (
              <Link
                href={`/host/listings/${listing.id}/edit`}
                className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-full bg-[#800020] px-4 text-sm font-medium text-white hover:bg-merlot"
              >
                Manage listing
              </Link>
            ) : hasAvailability ? (
              <div className="mt-5 space-y-2">
                <Link
                  href={reserveHref}
                  className="flex h-11 w-full items-center justify-center rounded-full bg-[#800020] text-sm font-bold text-white hover:bg-merlot"
                >
                  Request to book
                </Link>
                <Button onClick={openInquiry} variant="outline" className="w-full rounded-full">
                  Message host
                </Button>
              </div>
            ) : (
              <Button
                onClick={openInquiry}
                className="mt-5 w-full rounded-full bg-[#800020] hover:bg-merlot"
                size="lg"
              >
                Ask host anyway
              </Button>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {selectedDate ? `${compactDate(selectedDate)} · pay the host on arrival.` : "Choose dates below, then request to book."}
            </p>
          </div>
        </aside>
      </section>

      {/* Mobile booking bar — anchored to the true bottom (this page has no
          bottom nav), price on the left, single action on the right. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold">
              {formatPrice(Number(primaryPrice?.value ?? 0), priceCurrency(listing))}
              <span className="text-sm font-normal text-muted-foreground">
                {primaryPrice?.suffix ?? ""}
              </span>
            </p>
            {reviews.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-[#800020] text-[#800020]" />
                {avgRating.toFixed(1)} ({reviews.length})
              </p>
            )}
          </div>
          {isOwnListing ? (
            <Link
              href={`/host/listings/${listing.id}/edit`}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-merlot"
            >
              Manage
            </Link>
          ) : hasAvailability ? (
            <Link
              href={reserveHref}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-merlot"
            >
              Request to book
            </Link>
          ) : (
            <Button
              onClick={openInquiry}
              className="h-11 shrink-0 rounded-full bg-[#800020] px-6 font-bold hover:bg-merlot"
            >
              Ask host
            </Button>
          )}
        </div>
      </div>

      {!isOwnListing && (
        <InquiryFlow
          listing={{
            id: listing.id,
            name: listing.name,
            title: listing.title,
            slug: listing.slug,
            image: images[0]?.url ?? null,
          }}
          user={user}
          draft={inquiryDraft}
          open={inquiryOpen}
          onOpenChange={setInquiryOpen}
        />
      )}

      {/* All amenities overlay */}
      {amenitiesOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAmenitiesOpen(false)} aria-hidden />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-brand text-2xl text-[#2b000a]">What this place offers</h2>
              <button
                type="button"
                onClick={() => setAmenitiesOpen(false)}
                aria-label="Close"
                className="flex size-9 items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="divide-y">
              {allOfferings.map((item, i) => (
                <div key={`${item}-${i}`} className="py-1.5">
                  <AmenityItem label={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
