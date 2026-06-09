"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bath,
  CalendarDays,
  Car,
  Check,
  BadgeCheck,
  ChevronDown,
  Clock,
  Compass,
  Heart,
  MapPin,
  Moon,
  ShowerHead,
  Star,
  Utensils,
  Wifi,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { Calendar } from "@/components/ui/calendar";
import { Map } from "@/components/map";
import { useSavedListings } from "@/lib/hooks";
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

function primaryImage(listing: Listing) {
  return listing.listing_images?.[0]?.url || LOGO_SRC;
}

function AmenityItem({ label }: { label: string }) {
  // `label` is the stored amenity string: a catalog slug for new listings, or a
  // human label for legacy ones.
  const mdiIcon = AMENITY_ICON_MAP[label];
  const display = AMENITY_LABEL[label] ?? label;
  if (mdiIcon) {
    return (
      <div className="flex items-center gap-3 text-sm text-[#241f21]">
        <AmenityIcon icon={mdiIcon} width={18} height={18} className="text-[#800020]" />
        <span>{display}</span>
      </div>
    );
  }
  const Icon = AMENITY_ICON[label.toLowerCase()] || Check;
  return (
    <div className="flex items-center gap-3 text-sm text-[#241f21]">
      <Icon className="h-4 w-4 text-[#800020]" />
      <span>{display}</span>
    </div>
  );
}

export function PropertyContent({
  listing,
  reviews,
  blockedDateStrings,
}: {
  listing: Listing;
  reviews: Review[];
  blockedDateStrings: string[];
}) {
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const categories = (listing.categories || listing.category || []) as ListingCategory[];
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory>(
    categories[0] || "overnight"
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2026, 4, 17),
    to: new Date(2026, 4, 18),
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 4, 1));
  const [startTime, setStartTime] = useState("10:00");
  const [durationHours, setDurationHours] = useState("2");
  const [guests, setGuests] = useState("1");
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const { savedIds, toggle } = useSavedListings();
  const isSaved = savedIds.has(listing.id);

  const images = listing.listing_images?.length ? listing.listing_images : [
    { id: "fallback", listing_id: listing.id, url: primaryImage(listing), position: 0 },
  ];

  const blockedDates = useMemo(
    () => blockedDateStrings.map((date) => new Date(date)),
    [blockedDateStrings]
  );

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  const visibleAmenities = showAllAmenities
    ? listing.amenities
    : listing.amenities.slice(0, 8);

  const selectedDate = dateRange?.from;
  const blockedSet = useMemo(
    () => new Set(blockedDateStrings.map((item) => item.slice(0, 10))),
    [blockedDateStrings]
  );
  const selectedDateKey = selectedDate?.toISOString().slice(0, 10);
  const isSelectedBlocked = selectedDateKey ? blockedSet.has(selectedDateKey) : false;
  const availableUnits = Math.max(0, Number(listing.available_units || listing.total_units || 1));
  const hasAvailability = Boolean(selectedDate && !isSelectedBlocked && availableUnits > 0);
  const unitLabel =
    selectedCategory === "experience"
      ? `${availableUnits} seat${availableUnits === 1 ? "" : "s"} available`
      : selectedCategory === "hourly"
      ? `${availableUnits} hourly slot${availableUnits === 1 ? "" : "s"} available`
      : `${availableUnits} room/unit${availableUnits === 1 ? "" : "s"} available`;

  const formatDate = (date?: Date) =>
    date
      ? date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "long",
          day: "numeric",
        })
      : "Select date";

  function inputDate(date?: Date) {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function reserveUrl() {
    const params = new URLSearchParams({
      category: selectedCategory,
      checkIn: inputDate(dateRange?.from),
      guests,
    });
    if (selectedCategory === "overnight") {
      params.set("checkOut", inputDate(dateRange?.to));
    } else {
      params.set("startTime", startTime);
    }
    if (selectedCategory === "hourly") {
      params.set("duration", durationHours);
    }
    return `/reserve/${listing.id}?${params.toString()}`;
  }

  function checkAvailability() {
    setAvailabilityChecked(true);
  }

  return (
    <main className="bg-white text-[#181113]">
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
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {listing.title || listing.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{listing.area}, {listing.city}, {listing.country}</span>
              {listing.property_type && PROPERTY_TYPE_LABEL[listing.property_type] && (
                <>
                  <span>·</span>
                  <span>{PROPERTY_TYPE_LABEL[listing.property_type]}</span>
                </>
              )}
              {reviews.length > 0 && (
                <>
                  <span>·</span>
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span>{avgRating.toFixed(1)} ({reviews.length})</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full"
              onClick={() => toggle(listing.id)}
              aria-label={isSaved ? "Remove from saved trips" : "Save listing"}
            >
              <Heart className={`h-4 w-4 ${isSaved ? "fill-[#800020] text-[#800020]" : ""}`} />
              {isSaved ? "Saved" : "Save"}
            </Button>
            {categories.map((cat) => {
              const Icon = cat === "hourly" ? Clock : cat === "overnight" ? Moon : Compass;
              return (
                <Badge key={cat} variant="secondary" className="gap-1 rounded-full px-3 py-1">
                  <Icon className="h-3.5 w-3.5" /> {cat}
                </Badge>
              );
            })}
            {listing.host?.is_verified && (
              <Badge variant="outline" className="gap-1 rounded-full px-3 py-1">
                <BadgeCheck className="h-3.5 w-3.5 text-[#800020]" /> Verified host
              </Badge>
            )}
            {listing.is_verified && (
              <Badge className="gap-1 rounded-full bg-[#f8eef2] px-3 py-1 text-[#800020] hover:bg-[#f8eef2]">
                <BadgeCheck className="h-3.5 w-3.5" /> Beddn verified listing
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted sm:aspect-[16/8]">
            <Image
              src={images[selectedImage]?.url || LOGO_SRC}
              alt={listing.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
          <div className="grid grid-cols-3 gap-3 overflow-x-auto lg:grid-cols-1 lg:overflow-visible">
            {images.slice(0, 4).map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(index)}
                className={`relative aspect-[4/3] min-w-28 overflow-hidden rounded-xl border-2 bg-muted ${
                  index === selectedImage ? "border-[#800020]" : "border-transparent"
                }`}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </button>
            ))}
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
            <h2 className="mb-4 text-xl font-bold">Property amenities</h2>
            {listing.amenities.length > 0 ? (
              <>
                <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
                  {visibleAmenities.map((amenity) => (
                    <AmenityItem key={amenity} label={amenity} />
                  ))}
                </div>
                {listing.amenities.length > 8 && (
                  <button
                    onClick={() => setShowAllAmenities((value) => !value)}
                    className="mt-4 flex items-center gap-1 text-sm font-bold underline"
                  >
                    {showAllAmenities ? "Show less" : "Show more"}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Amenities will be added soon.</p>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold">Room features</h2>
            <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
              <AmenityItem label="Private booking code" />
              <AmenityItem label="Host confirmation by SMS" />
              <AmenityItem label="Exact address after confirmation" />
              <AmenityItem label="Secure reserve fee" />
              {listing.minimum_hours && <AmenityItem label={`${listing.minimum_hours}+ hour minimum`} />}
              {listing.total_units && <AmenityItem label={`${listing.total_units} rooms / units`} />}
            </div>
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

          <section id="deals" className="max-w-4xl">
            <div className="mb-4 rounded-2xl border bg-[#fbf7f8] p-4">
              <h2 className="text-lg font-bold">Check availability</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a booking type and date first. If there is availability, continue to reserve.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setAvailabilityChecked(false);
                    }}
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
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-full border border-neutral-300 bg-white px-4 py-3 sm:px-5">
                <CalendarDays className="h-5 w-5 text-[#800020]" />
                <div>
                  <p className="text-sm">
                    {selectedCategory === "experience" ? "Session date" : "Check In"}
                  </p>
                  <p className="font-bold">{formatDate(dateRange?.from)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-full border-2 border-[#800020] bg-white px-4 py-3 sm:px-5">
                <CalendarDays className="h-5 w-5 text-[#800020]" />
                <div>
                  <p className="text-sm">
                    {selectedCategory === "overnight" ? "Check Out" : "Time"}
                  </p>
                  <p className="font-bold">
                    {selectedCategory === "overnight" ? formatDate(dateRange?.to) : startTime}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b p-5">
                <CalendarDays className="h-5 w-5 text-[#800020]" />
                <h2 className="text-lg font-bold">
                  Select dates to find the best prices for your trip
                </h2>
              </div>
              <div className="p-3 sm:p-5">
                <div className="mx-auto grid max-w-[760px] gap-6 lg:grid-cols-2 lg:items-start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    numberOfMonths={1}
                    disabled={blockedDates}
                    className="mx-auto w-full [--cell-radius:0.5rem] [--cell-size:2.25rem] sm:[--cell-size:2.45rem]"
                    classNames={{
                      root: "w-full max-w-[330px] sm:max-w-[340px]",
                      months: "flex flex-col gap-4",
                      month: "w-full",
                      caption_label: "text-base sm:text-lg font-bold text-[#2b000a]",
                      weekday: "flex h-(--cell-size) items-center justify-center text-center text-neutral-800 font-medium",
                      button_previous: "text-[#800020] hover:bg-[#f8eef2]",
                      button_next: "text-[#800020] hover:bg-[#f8eef2]",
                      day_button:
                        "data-[range-start=true]:bg-[#800020] data-[range-start=true]:text-white data-[range-end=true]:bg-[#800020] data-[range-end=true]:text-white data-[selected-single=true]:bg-[#800020] data-[selected-single=true]:text-white data-[range-middle=true]:bg-[#f7e8ee] data-[range-middle=true]:text-[#2b000a]",
                      range_start: "bg-transparent after:bg-[#f7e8ee]",
                      range_middle: "bg-[#f7e8ee]",
                      range_end: "bg-transparent after:bg-[#f7e8ee]",
                    }}
                  />
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    month={new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)}
                    onMonthChange={(month) =>
                      setCalendarMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                    }
                    numberOfMonths={1}
                    disabled={blockedDates}
                    className="mx-auto hidden w-full [--cell-radius:0.5rem] [--cell-size:2.45rem] lg:block"
                    classNames={{
                      root: "w-full max-w-[340px]",
                      months: "flex flex-col gap-4",
                      month: "w-full",
                      caption_label: "text-lg font-bold text-[#2b000a]",
                      weekday: "flex h-(--cell-size) items-center justify-center text-center text-neutral-800 font-medium",
                      button_previous: "hidden",
                      button_next: "hidden",
                      day_button:
                        "data-[range-start=true]:bg-[#800020] data-[range-start=true]:text-white data-[range-end=true]:bg-[#800020] data-[range-end=true]:text-white data-[selected-single=true]:bg-[#800020] data-[selected-single=true]:text-white data-[range-middle=true]:bg-[#f7e8ee] data-[range-middle=true]:text-[#2b000a]",
                      range_start: "bg-transparent after:bg-[#f7e8ee]",
                      range_middle: "bg-[#f7e8ee]",
                      range_end: "bg-transparent after:bg-[#f7e8ee]",
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end border-t p-4">
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    {availabilityChecked ? (
                      <p className={`text-sm font-bold ${hasAvailability ? "text-[#800020]" : "text-red-700"}`}>
                        {hasAvailability
                          ? `Available: ${unitLabel}`
                          : "Not available for this date. Try another day or time."}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Check availability before reserving.
                      </p>
                    )}
                  </div>
                  {availabilityChecked && hasAvailability ? (
                    <Button
                      onClick={() => router.push(reserveUrl())}
                      className="rounded-full bg-[#800020] px-7 hover:bg-[#600018]"
                    >
                      Continue to reserve
                    </Button>
                  ) : (
                    <Button
                      onClick={checkAvailability}
                      className="rounded-full bg-[#800020] px-7 hover:bg-[#600018]"
                    >
                      Show availability
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section id="reviews">
            <h2 className="mb-4 text-xl font-bold">
              Reviews{" "}
              {reviews.length > 0 && (
                <span className="font-normal text-muted-foreground">
                  · {avgRating.toFixed(1)} avg ({reviews.length})
                </span>
              )}
            </h2>
            {reviews.length > 0 ? (
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
                                ? "fill-yellow-500 text-yellow-500"
                                : "text-muted"
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
            ) : (
              <EmptyState
                image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029375/empty-reviews_t8xgis.png"
                title="No reviews yet"
                subtitle="Be the first to review this place after your stay."
                size="sm"
              />
            )}
          </section>

          <section id="location">
            <h2 className="mb-2 text-xl font-bold">Approximate location</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Exact address is shared after your booking is confirmed by the host.
            </p>
            <div className="h-72 overflow-hidden rounded-2xl border">
              <Map
                listings={[listing]}
                center={[listing.longitude, listing.latitude]}
                zoom={13}
                approximate
              />
            </div>
          </section>
        </div>

        <aside className="lg:pt-1">
          <div className="sticky top-32 rounded-2xl border bg-white p-5 shadow-sm">
            <div className="space-y-3">
              {listing.hourly_price && (
                <div className="flex justify-between text-sm">
                  <span>Hourly</span>
                  <span className="font-semibold">
                    {priceCurrency(listing)} {Number(listing.hourly_price).toLocaleString()}/hr
                  </span>
                </div>
              )}
              {listing.overnight_price && (
                <div className="flex justify-between text-sm">
                  <span>Overnight</span>
                  <span className="font-semibold">
                    {priceCurrency(listing)} {Number(listing.overnight_price).toLocaleString()}/night
                  </span>
                </div>
              )}
              {listing.experience_price && (
                <div className="flex justify-between text-sm">
                  <span>Experience</span>
                  <span className="font-semibold">
                    {priceCurrency(listing)} {Number(listing.experience_price).toLocaleString()}/session
                  </span>
                </div>
              )}
              {listing.deposit_amount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Reserve fee</span>
                  <span>{priceCurrency(listing)} {Number(listing.deposit_amount).toLocaleString()}</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                document.getElementById("deals")?.scrollIntoView({ behavior: "smooth", block: "start" });
                checkAvailability();
              }}
              className="mt-5 w-full rounded-full bg-[#800020] hover:bg-[#600018]"
              size="lg"
            >
              Check availability
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              You pay the reserve fee first. Host details unlock after confirmation.
            </p>
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t bg-white p-3 shadow-lg lg:hidden">
        <Button
          onClick={() => {
            document.getElementById("deals")?.scrollIntoView({ behavior: "smooth", block: "start" });
            checkAvailability();
          }}
          className="w-full rounded-full bg-[#800020] hover:bg-[#600018]"
          size="lg"
        >
          Check availability
        </Button>
      </div>
    </main>
  );
}
