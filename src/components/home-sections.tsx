"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import type { Listing } from "@/lib/types";

interface Destination {
  id: string;
  name: string;
  search_query: string;
  image_url: string;
}

interface CitySection {
  city: string;
  listings: Listing[];
}

/**
 * Horizontal scroller. The scroll controls live together at the top-right of
 * the section (next to the heading) rather than overlapping the first/last
 * card. Pass the section heading via `heading`.
 */
function Rail({ heading, children }: { heading: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        {heading}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <button
            type="button"
            aria-label="Scroll back"
            onClick={() => scroll(-1)}
            className="flex size-9 items-center justify-center rounded-full border bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Scroll forward"
            onClick={() => scroll(1)}
            className="flex size-9 items-center justify-center rounded-full border bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * A horizontal rail of featured listings for one placement surface
 * (homepage / city / category). Fetches live placements and renders nothing
 * when there are none, so it can be dropped anywhere safely.
 */
export function FeaturedRail({
  placement,
  city,
  category,
  heading,
  savedIds,
  onToggleSave,
  priceMode = "hourly",
}: {
  placement: "homepage_featured" | "city_featured" | "category_featured";
  city?: string;
  category?: string;
  heading: string;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  priceMode?: "hourly" | "overnight";
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ placement });
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    fetch(`/api/public/featured?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : { listings: [] }))
      .then((json: { listings?: Listing[] }) => setListings(json.listings ?? []))
      .catch(() => setListings([]))
      .finally(() => setLoaded(true));
  }, [placement, city, category]);

  if (!loaded || listings.length === 0) return null;

  return (
    <section className="pt-10">
      <Rail
        heading={
          <h2 className="flex items-center gap-2 text-xl font-bold text-[#2b000a] sm:text-2xl">
            <Star className="h-5 w-5 fill-[#800020] text-[#800020]" /> {heading}
          </h2>
        }
      >
        {listings.map((listing) => (
          <div key={listing.id} className="w-[170px] shrink-0 snap-start sm:w-[210px]">
            <ListingCard
              listing={listing}
              isSaved={savedIds.has(listing.id)}
              onToggleSave={() => onToggleSave(listing.id)}
              priceMode={priceMode}
            />
          </div>
        ))}
      </Rail>
    </section>
  );
}

/** Admin-curated destination tiles (home page, under the search bar). */
export function PopularDestinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/public/destinations")
      .then((res) => (res.ok ? res.json() : { destinations: [] }))
      .then((json: { destinations?: Destination[] }) => setDestinations(json.destinations ?? []))
      .catch(() => setDestinations([]))
      .finally(() => setLoaded(true));
  }, []);

  if (loaded && destinations.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <Rail
        heading={
          <Link href="/search" className="group flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#2b000a] sm:text-2xl">Popular destinations</h2>
            <span className="flex size-7 items-center justify-center rounded-full bg-[#f5eef1] transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4 text-[#2b000a]" />
            </span>
          </Link>
        }
      >
        {!loaded
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square w-[150px] shrink-0 animate-pulse rounded-3xl bg-muted sm:w-[180px]"
              />
            ))
          : destinations.map((destination) => (
              <Link
                key={destination.id}
                href={`/search?q=${encodeURIComponent(destination.search_query)}`}
                className="group relative aspect-square w-[150px] shrink-0 snap-start overflow-hidden rounded-3xl bg-muted sm:w-[180px]"
              >
                <Image
                  src={destination.image_url}
                  alt={destination.name}
                  fill
                  sizes="180px"
                  quality={70}
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-3 left-3 right-3 truncate text-lg font-bold text-white drop-shadow">
                  {destination.name}
                </span>
              </Link>
            ))}
      </Rail>
    </section>
  );
}

/**
 * Dynamic, location-aware rails ("Stay in Nairobi"). If the visitor has
 * already granted geolocation we put their city first; otherwise the busiest
 * cities lead. Never prompts for permission itself.
 */
export function CityRails({
  savedIds,
  onToggleSave,
  priceMode = "hourly",
}: {
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
  priceMode?: "hourly" | "overnight";
}) {
  const [sections, setSections] = useState<CitySection[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchSections = useCallback(async (city?: string) => {
    try {
      const res = await fetch(`/api/public/home-sections${city ? `?city=${encodeURIComponent(city)}` : ""}`);
      const json: { sections?: CitySection[] } = res.ok ? await res.json() : {};
      setSections(json.sections ?? []);
    } catch {
      setSections([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSections();

    // Re-order by the visitor's city only when permission was already granted —
    // we never trigger the browser prompt from a passive home page section.
    if (!("permissions" in navigator) || !navigator.geolocation) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            fetch(`/api/geocode?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data: { address?: { city?: string } } | null) => {
                if (data?.address?.city) fetchSections(data.address.city);
              })
              .catch(() => {});
          },
          () => {},
          { maximumAge: 600000, timeout: 8000 }
        );
      })
      .catch(() => {});
  }, [fetchSections]);

  if (loaded && sections.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      {!loaded ? (
        <section className="pt-10">
          <div className="mb-4 h-7 w-56 animate-pulse rounded-full bg-muted" />
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[170px] shrink-0 sm:w-[210px]">
                <ListingCardSkeleton />
              </div>
            ))}
          </div>
        </section>
      ) : (
        sections.map((section) => (
          <section key={section.city} className="pt-10">
            <Rail
              heading={
                <Link
                  href={`/search?q=${encodeURIComponent(section.city)}`}
                  className="group flex items-center gap-2"
                >
                  <h2 className="text-xl font-bold text-[#2b000a] sm:text-2xl">
                    Stay in {section.city}
                  </h2>
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#f5eef1] transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4 text-[#2b000a]" />
                  </span>
                </Link>
              }
            >
              {section.listings.map((listing) => (
                <div key={listing.id} className="w-[170px] shrink-0 snap-start sm:w-[210px]">
                  <ListingCard
                    listing={listing}
                    isSaved={savedIds.has(listing.id)}
                    onToggleSave={() => onToggleSave(listing.id)}
                    priceMode={priceMode}
                  />
                </div>
              ))}
            </Rail>
          </section>
        ))
      )}
    </div>
  );
}
