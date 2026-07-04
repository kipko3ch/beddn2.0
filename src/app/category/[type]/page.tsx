"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, notFound, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { FeaturedRail } from "@/components/home-sections";
import { EmptyState } from "@/components/empty-state";
import { SearchPill, type SearchPillValues } from "@/components/search-pill";
import { ChipSelect } from "@/components/chip-select";
import { useSavedListings } from "@/lib/hooks";
import { PROPERTY_TYPES } from "@/lib/property-types";
import { ROUTES } from "@/lib/routes";
import type { Listing, ListingCategory } from "@/lib/types";

const CATEGORY_META: Record<
  string,
  { title: string; blurb: string; eyebrow: string; priceMode: "hourly" | "overnight" }
> = {
  hourly: {
    title: "Hourly stays",
    blurb: "Book a verified space for a few hours — meetings, shoots, or downtime.",
    eyebrow: "Flexible, by the hour",
    priceMode: "hourly",
  },
  overnight: {
    title: "Overnight stays",
    blurb: "Verified places to stay the night across Africa.",
    eyebrow: "Sleep somewhere great",
    priceMode: "overnight",
  },
  experience: {
    title: "Experiences",
    blurb: "Hosted trips, classes, and activities you can book with confidence.",
    eyebrow: "Trips, classes & tours",
    priceMode: "hourly",
  },
};



export default function CategoryPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type;
  const meta = CATEGORY_META[type];
  const isExperience = type === "experience";

  const [propertyType, setPropertyType] = useState("all");
  const [priceMode, setPriceMode] = useState<"hourly" | "overnight">(meta?.priceMode ?? "hourly");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { savedIds, toggle } = useSavedListings();

  const fetchListings = useCallback(async () => {
    if (!meta) return;
    setLoading(true);
    const search = new URLSearchParams({ category: type, limit: "50" });
    if (!isExperience) search.set("type", propertyType);
    try {
      const res = await fetch(`/api/public/listings?${search.toString()}`);
      const json: { listings?: Listing[] } = res.ok ? await res.json() : {};
      setListings(json.listings ?? []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [type, meta, isExperience, propertyType]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  if (!meta) {
    notFound();
  }

  // Full search (dates, time, guests) lives on /search — the pill here
  // carries everything across so the guest lands with filters applied.
  function handlePillSearch(values: SearchPillValues) {
    const query = new URLSearchParams();
    if (values.q) query.set("q", values.q);
    query.set("category", type);
    if (!isExperience && propertyType !== "all") query.set("type", propertyType);
    if (values.checkIn) query.set("checkin", values.checkIn);
    if (values.checkOut && type === "overnight") query.set("checkout", values.checkOut);
    if (values.startTime && (type === "hourly" || type === "experience")) {
      query.set("startTime", values.startTime);
    }
    if (values.guests) query.set("guests", String(values.guests));
    router.push(`/search?${query.toString()}`);
  }

  function handleNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        router.push(
          `/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&category=${type}`
        );
      },
      () => alert("Could not get your location. Please allow location access.")
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen w-full max-w-[1920px] px-4 pb-24 pt-4 sm:px-6 lg:px-8">
        {/* Hero: warm brand band with the same search pill as /search, so
            filtering (dates, time, guests) works the same everywhere. */}
        <section className="rounded-3xl border border-cream bg-[linear-gradient(135deg,#fdf8f2_0%,#f9edf0_50%,#fdf6ef_100%)] px-4 py-7 sm:px-8 sm:py-10 lg:px-12">
          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-merlot hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All categories
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-cranberry">
            {meta.eyebrow}
          </p>
          <h1 className="mt-1.5 font-brand text-4xl tracking-tight text-[#2b000a] sm:text-5xl">
            {meta.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{meta.blurb}</p>
          <div className="mt-6 max-w-3xl">
            <SearchPill
              mode={isExperience ? "experience" : type === "hourly" ? "hourly" : "overnight"}
              onSearch={handlePillSearch}
              onNearby={handleNearby}
            />
          </div>
        </section>

        <FeaturedRail
          placement="category_featured"
          category={type as ListingCategory}
          heading={`Featured ${meta.title.toLowerCase()}`}
          savedIds={savedIds}
          onToggleSave={toggle}
          priceMode={meta.priceMode}
        />

        {/* Browse section: heading + the same filter chips as /search. */}
        <div className="mb-5 mt-10 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-cranberry">Browse</p>
            <h2 className="mt-1 font-brand text-2xl tracking-tight text-[#2b000a] sm:text-3xl">
              {loading
                ? `Finding ${meta.title.toLowerCase()}`
                : listings.length > 0
                ? `${listings.length} verified ${
                    isExperience
                      ? `experience${listings.length === 1 ? "" : "s"}`
                      : `listing${listings.length === 1 ? "" : "s"}`
                  }`
                : `No ${meta.title.toLowerCase()} yet`}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isExperience && (
              <ChipSelect
                label="Type of place"
                value={propertyType}
                options={[{ value: "all", label: "Any type of place" }, ...PROPERTY_TYPES]}
                onChange={setPropertyType}
              />
            )}
            {!isExperience && listings.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show prices</span>
                <div className="inline-flex rounded-full bg-[#f5eef1] p-0.5" role="group">
                  {(["hourly", "overnight"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPriceMode(mode)}
                      aria-pressed={priceMode === mode}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        priceMode === mode ? "bg-crimson text-white" : "text-muted-foreground"
                      }`}
                    >
                      {mode === "hourly" ? "Hourly" : "Nightly"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {!isExperience && propertyType !== "all" && (
              <button
                type="button"
                onClick={() => setPropertyType("all")}
                className="text-xs font-semibold text-crimson hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mx-auto max-w-[1400px]">
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ListingCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029376/empty-saved_clsjni.png"
            title={`No ${meta.title.toLowerCase()} yet`}
            subtitle="Check back soon — new verified listings are added regularly."
            size="sm"
          />
        ) : (
          <div className="mx-auto max-w-[1400px]">
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isSaved={savedIds.has(listing.id)}
                  onToggleSave={() => toggle(listing.id)}
                  priceMode={priceMode}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
