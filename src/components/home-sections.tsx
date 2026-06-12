"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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

/** Horizontal scroller with desktop chevron buttons. */
function Rail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="group/rail relative">
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll back"
        onClick={() => scroll(-1)}
        className="absolute -left-4 top-[38%] z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-md transition-opacity hover:shadow-lg md:flex md:opacity-0 md:group-hover/rail:opacity-100"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Scroll forward"
        onClick={() => scroll(1)}
        className="absolute -right-4 top-[38%] z-10 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-md transition-opacity hover:shadow-lg md:flex md:opacity-0 md:group-hover/rail:opacity-100"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#2b000a] sm:text-2xl">Popular destinations</h2>
        <Link
          href="/search"
          className="flex items-center gap-1 text-sm font-semibold text-[#800020] hover:underline"
        >
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <Rail>
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
            <div className="mb-4 flex items-center justify-between">
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
            </div>
            <Rail>
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
