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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Flag,
  Heart,
  Keyboard,
  MapPin,
  Moon,
  Navigation,
  PenLine,
  Share,
  ShowerHead,
  ShieldCheck,
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
import { AuthDialog } from "@/components/auth-dialog";
import { ReportListingDialog } from "@/components/report-listing-dialog";
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

// Reserving requires a signed-in account. Logged-out guests get the signup
// modal right where they clicked — no bounce through a dead-end "sign in"
// page — and land on /reserve once they're actually authenticated.
function RequestToBookButton({
  user,
  href,
  className,
  children,
}: {
  user: User | null;
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (user) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <AuthDialog>
      <button type="button" className={className}>
        {children}
      </button>
    </AuthDialog>
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
  const categories = ((listing.categories || listing.category || []) as ListingCategory[]).filter(
    (c) => c !== "experience"
  );
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory>(() => {
    return categories.includes("overnight") ? "overnight" : categories[0] || "overnight";
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => defaultDateRange());
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(defaultDateRange().from!));
  const [startTime, setStartTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState("2");
  const [guests, setGuests] = useState("1");
  const [reportOpen, setReportOpen] = useState(false);
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
    listing.total_units && listing.total_units > 1
      ? `${listing.total_units} separate bookable spaces`
      : null,
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
  const hasHourly = Boolean(listing.hourly_price && Number(listing.hourly_price) > 0);
  const hasOvernight = Boolean(listing.overnight_price && Number(listing.overnight_price) > 0);
  const priceOptions = [
    hasHourly
      ? { label: "Hourly", suffix: "/hr", value: Number(listing.hourly_price) }
      : null,
    hasOvernight
      ? { label: "Overnight", suffix: "/night", value: Number(listing.overnight_price) }
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

  const hourlyEstimate = useMemo(() => {
    if (selectedCategory !== "hourly" || !dateRange?.from) return null;
    const base = Number(listing.hourly_price || 0);
    if (!base) return null;
    const hours = Math.max(1, Number(durationHours) || 1);
    return {
      total: base * hours,
      hours,
    };
  }, [selectedCategory, dateRange, listing.hourly_price, durationHours]);

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

  const cancellationDateText = useMemo(() => {
    if (!dateRange?.from) return "before check-in";
    const cancelDate = new Date(dateRange.from);
    cancelDate.setDate(cancelDate.getDate() - 1);
    return cancelDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }, [dateRange?.from]);

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${listing.latitude},${listing.longitude}`;

  return (
    <main className="bg-white pb-24 text-[#181113] lg:pb-0">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Action Bar: Back Link + Share, Save, Review */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-crimson hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to stays</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isOwnListing && hasAvailability && (
              <button
                type="button"
                onClick={() =>
                  document.getElementById("deals")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="hidden h-9 items-center justify-center rounded-full bg-[#800020] px-4 text-xs sm:text-sm font-bold text-white hover:bg-merlot md:inline-flex"
              >
                Request to book
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 rounded-full px-2.5 sm:px-3 text-xs"
              onClick={shareProperty}
              aria-label="Share this listing"
            >
              {shared ? <Check className="h-3.5 w-3.5 text-[#1a7f46]" /> : <Share className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline ml-1">{shared ? "Link copied" : "Share"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 rounded-full px-2.5 sm:px-3 text-xs"
              onClick={() => toggle(listing.id)}
              aria-label={isSaved ? "Remove from saved trips" : "Save listing"}
            >
              <Heart className={`h-3.5 w-3.5 ${isSaved ? "fill-crimson text-crimson" : ""}`} />
              <span className="hidden sm:inline ml-1">{isSaved ? "Saved" : "Save"}</span>
            </Button>
            <Link
              href={`/property/${listing.slug}/review`}
              aria-label="Write a review for this listing"
              className="inline-flex h-8 sm:h-9 items-center gap-1.5 rounded-full border border-[#f3cfd9] bg-[#fbf0f3] px-3 sm:px-3.5 text-xs font-bold text-[#800020] hover:bg-[#f3d9e2] transition-colors shadow-2xs"
            >
              <PenLine className="h-3.5 w-3.5 text-[#800020]" />
              <span>Review</span>
            </Link>
          </div>
        </div>

        {/* Title and Metadata: Full width */}
        <div className="mb-5">
          <h1 className="font-brand text-2xl sm:text-4xl font-extrabold tracking-tight text-[#2b000a] leading-tight">
            {listing.title || listing.name}
          </h1>
          {/* One compact meta line: location · type · rating, then small chips */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {listing.area ? `${listing.area}, ` : ""}{listing.city}, {listing.country}
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
                <span className="inline-flex items-center gap-1 text-[#2b000a] font-semibold">
                  <Star className="h-3.5 w-3.5 fill-crimson text-crimson" />
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
                  className="inline-flex items-center gap-1 rounded-full bg-[#fbf0f3] border border-[#f3cfd9] px-2.5 py-1 text-xs font-semibold capitalize text-[#800020]"
                >
                  <Icon className="h-3.5 w-3.5" /> {cat}
                </span>
              );
            })}
            {(listing.is_verified || listing.host?.is_verified) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" />
                {listing.is_verified ? "Beddn verified" : "Verified host"}
              </span>
            )}
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

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:px-8">
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
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream text-crimson">
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
                  <Badge className="w-fit gap-1 rounded-full bg-crimson/15 px-3 py-1 text-crimson hover:bg-crimson/15">
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

          <Separator />

          {/* Clean 2-Month Calendar (Airbnb style matching user reference) */}
          <section id="calendar" className="scroll-mt-24">
            <div className="mb-4">
              {categories.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
                        selectedCategory === cat
                          ? "border-[#800020] bg-[#800020] text-white"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-bold text-[#181113]">
                {dateSummary.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {dateSummary.subtitle}
              </p>
            </div>

            {selectedCategory === "hourly" && (
              <div className="mb-6 grid gap-3 sm:grid-cols-2 max-w-sm rounded-2xl border bg-neutral-50/70 p-3">
                <label className="text-xs font-semibold text-neutral-600">
                  Start time
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs"
                  />
                </label>
                <label className="text-xs font-semibold text-neutral-600">
                  Duration (hours)
                  <input
                    type="number"
                    min="1"
                    value={durationHours}
                    onChange={(event) => setDurationHours(event.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs"
                  />
                </label>
              </div>
            )}

            {/* Desktop: 2-month side-by-side calendar */}
            <div className="hidden sm:block">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleSelectRange}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                numberOfMonths={2}
                showOutsideDays={false}
                disabled={disabledCalendarDays}
                className="w-full bg-transparent p-0"
              />
            </div>

            {/* Mobile: single-month calendar */}
            <div className="sm:hidden w-full">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleSelectRange}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                numberOfMonths={1}
                showOutsideDays={false}
                disabled={disabledCalendarDays}
                className="w-full bg-transparent p-0"
              />
            </div>

            {/* Bottom bar of calendar */}
            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2 text-neutral-400" title="Keyboard shortcuts enabled">
                <Keyboard className="h-4 w-4" />
                <span className="text-xs hidden sm:inline">Select dates on the calendar</span>
              </div>
              <button
                type="button"
                onClick={() => setDateRange(undefined)}
                className="text-xs font-bold text-neutral-900 underline hover:text-crimson"
              >
                Clear dates
              </button>
            </div>
          </section>

          <Separator />

          {/* Where you'll be: Helpful and beautiful Map section */}
          <section id="location" className="scroll-mt-24">
            <h2 className="mb-2 text-xl font-bold text-[#181113]">Where you&apos;ll be</h2>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-crimson" />
                <span className="font-semibold text-[#181113]">
                  {listing.area ? `${listing.area}, ` : ""}{listing.city}, {listing.country}
                </span>
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-bold text-neutral-700 hover:border-neutral-400 hover:text-crimson transition shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5 text-crimson" />
                Open in Google Maps
              </a>
            </div>

            <div className="h-80 overflow-hidden rounded-2xl border sm:h-96 shadow-xs">
              <Map
                listings={[listing]}
                center={[listing.longitude, listing.latitude]}
                zoom={15}
                approximate
                interactive
              />
            </div>

            {/* 3 Context Cards providing real neighbourhood help */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-neutral-200/80 bg-[#fdfbfa] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#800020]">
                  The neighborhood
                </p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  {listing.area
                    ? `Located in ${listing.area}, ${listing.city}. A vibrant and sought-after area with popular dining, cafes, and local amenities.`
                    : `Located in ${listing.city}. Safe, welcoming area close to local markets, dining, and transit.`}
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200/80 bg-[#fdfbfa] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#800020]">
                  Getting around
                </p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  Taxis, Uber, and Bolt operate conveniently in this area. Easy road access and private parking on-premises.
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200/80 bg-[#fdfbfa] p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#800020]">
                  Privacy &amp; directions
                </p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  The exact building name, door number, and host contact are provided automatically in your booking confirmation.
                </p>
              </div>
            </div>
          </section>

          <Separator />

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

          <section id="reviews" className="scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#181113]">Reviews</h2>
              <Link
                href={`/property/${listing.slug}/review`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3.5 text-xs font-semibold text-neutral-800 shadow-2xs hover:border-[#800020] hover:bg-[#fbf0f3]/70 hover:text-[#800020] transition-colors"
              >
                <PenLine className="h-3.5 w-3.5 text-[#800020]" />
                <span>Write a review</span>
              </Link>
            </div>
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
                              ? "fill-crimson text-crimson"
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
                                  ? "fill-crimson text-crimson"
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

        {/* Right Column: Airbnb-style Sticky Booking Card + Report button */}
        <aside className="lg:pt-1">
          <div className="sticky top-28 rounded-3xl border border-neutral-200 bg-white p-6 shadow-lg shadow-neutral-100/70">
            {/* Category Toggle: Hourly vs Overnight */}
            {hasHourly && hasOvernight && (
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("hourly")}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    selectedCategory === "hourly"
                      ? "bg-white text-[#800020] shadow-xs"
                      : "text-neutral-600 hover:text-black"
                  }`}
                >
                  Hourly
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory("overnight")}
                  className={`rounded-xl py-2 text-xs font-bold transition ${
                    selectedCategory === "overnight"
                      ? "bg-white text-[#800020] shadow-xs"
                      : "text-neutral-600 hover:text-black"
                  }`}
                >
                  Overnight
                </button>
              </div>
            )}

            {/* Price display matching active category */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-[#181113]">
                  {selectedCategory === "hourly" && listing.hourly_price
                    ? formatPrice(Number(listing.hourly_price), priceCurrency(listing))
                    : listing.overnight_price
                    ? formatPrice(Number(listing.overnight_price), priceCurrency(listing))
                    : primaryPrice
                    ? formatPrice(primaryPrice.value, priceCurrency(listing))
                    : ""}
                </span>
                <span className="text-sm font-medium text-neutral-500">
                  {selectedCategory === "hourly" ? "/hr" : "/night"}
                </span>
              </div>
            </div>

            {/* Date and inputs box */}
            <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-300 divide-y divide-neutral-300">
              {selectedCategory === "hourly" ? (
                <>
                  <div className="grid grid-cols-2 divide-x divide-neutral-300">
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("calendar");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="p-2.5 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Date
                      </span>
                      <span className="block text-xs font-semibold text-neutral-900 truncate mt-0.5">
                        {compactDate(dateRange?.from) || "Select date"}
                      </span>
                    </button>

                    <div className="p-2.5">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Start time
                      </span>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="mt-0.5 block w-full text-xs font-semibold text-neutral-900 bg-transparent outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-neutral-300">
                    <div className="p-2.5">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Duration
                      </span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={Number(durationHours) <= 1}
                          onClick={() => setDurationHours(String(Math.max(1, Number(durationHours) - 1)))}
                          className="size-6 rounded-full border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold text-neutral-900">
                          {durationHours} {Number(durationHours) === 1 ? "hr" : "hrs"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDurationHours(String(Number(durationHours) + 1))}
                          className="size-6 rounded-full border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Guests
                      </span>
                      <div className="mt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={Number(guests) <= 1}
                          onClick={() => setGuests(String(Math.max(1, Number(guests) - 1)))}
                          className="size-6 rounded-full border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-30"
                        >
                          -
                        </button>
                        <span className="text-xs font-semibold text-neutral-900">
                          {guests}
                        </span>
                        <button
                          type="button"
                          onClick={() => setGuests(String(Number(guests) + 1))}
                          className="size-6 rounded-full border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 divide-x divide-neutral-300">
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("calendar");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="p-2.5 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Check-in
                      </span>
                      <span className="block text-xs font-semibold text-neutral-900 truncate mt-0.5">
                        {compactDate(dateRange?.from) || "Add date"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("calendar");
                        el?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="p-2.5 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Checkout
                      </span>
                      <span className="block text-xs font-semibold text-neutral-900 truncate mt-0.5">
                        {compactDate(dateRange?.to) || "Add date"}
                      </span>
                    </button>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                        Guests
                      </span>
                      <span className="block text-xs font-semibold text-neutral-900 mt-0.5">
                        {guests} {Number(guests) === 1 ? "guest" : "guests"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={Number(guests) <= 1}
                        onClick={() => setGuests(String(Math.max(1, Number(guests) - 1)))}
                        className="size-7 rounded-full border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-30"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setGuests(String(Number(guests) + 1))}
                        className="size-7 rounded-full border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Primary Action Button */}
            {isOwnListing ? (
              <Link
                href={`/host/listings/${listing.id}/edit`}
                className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#800020] text-sm font-bold text-white hover:bg-merlot transition"
              >
                Manage listing
              </Link>
            ) : hasAvailability ? (
              <div className="mt-4 space-y-2">
                <RequestToBookButton
                  user={user}
                  href={reserveHref}
                  className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#800020] text-base font-bold text-white hover:bg-merlot shadow-sm transition"
                >
                  Reserve
                </RequestToBookButton>
                <Button
                  onClick={openInquiry}
                  variant="outline"
                  className="w-full h-11 rounded-2xl font-bold border-neutral-300"
                >
                  Message host
                </Button>
              </div>
            ) : (
              <Button
                onClick={openInquiry}
                className="mt-4 w-full h-12 rounded-2xl bg-[#800020] text-base font-bold hover:bg-merlot"
              >
                Ask host anyway
              </Button>
            )}

            {/* Clean Estimate without unneeded payments or cancellation clauses */}
            {selectedCategory === "overnight" && overnightEstimate && (
              <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-xs font-medium text-neutral-600">
                <div className="flex justify-between">
                  <span>
                    {formatPrice(Number(listing.overnight_price || 0), priceCurrency(listing))} × {overnightEstimate.nights} nights
                  </span>
                  <span className="font-bold text-[#181113]">
                    {formatPrice(overnightEstimate.total, priceCurrency(listing))}
                  </span>
                </div>
              </div>
            )}

            {selectedCategory === "hourly" && hourlyEstimate && (
              <div className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3 text-xs font-medium text-neutral-600">
                <div className="flex justify-between">
                  <span>
                    {formatPrice(Number(listing.hourly_price || 0), priceCurrency(listing))} × {hourlyEstimate.hours} hours
                  </span>
                  <span className="font-bold text-[#181113]">
                    {formatPrice(hourlyEstimate.total, priceCurrency(listing))}
                  </span>
                </div>
              </div>
            )}

            {/* ⚑ Report this listing link */}
            <div className="mt-5 flex justify-center border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-black underline transition-colors"
              >
                <Flag className="h-3.5 w-3.5" />
                Report this listing
              </button>
            </div>
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
                <Star className="h-3 w-3 fill-crimson text-crimson" />
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
            <RequestToBookButton
              user={user}
              href={reserveHref}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-merlot"
            >
              Request to book
            </RequestToBookButton>
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

      <ReportListingDialog
        listingId={listing.id}
        listingTitle={listing.title || listing.name}
        open={reportOpen}
        onOpenChange={setReportOpen}
        user={user}
      />
    </main>
  );
}
