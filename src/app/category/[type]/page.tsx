"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { Header } from "@/components/header";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { FeaturedRail } from "@/components/home-sections";
import { EmptyState } from "@/components/empty-state";
import { useSavedListings } from "@/lib/hooks";
import type { Listing, ListingCategory } from "@/lib/types";

const CATEGORY_META: Record<string, { title: string; blurb: string; priceMode: "hourly" | "overnight" }> = {
  hourly: {
    title: "Hourly stays",
    blurb: "Book a verified space for a few hours — meetings, shoots, or downtime.",
    priceMode: "hourly",
  },
  overnight: {
    title: "Overnight stays",
    blurb: "Verified places to stay the night across Africa.",
    priceMode: "overnight",
  },
  experience: {
    title: "Experiences",
    blurb: "Hosted trips, classes, and activities you can book with confidence.",
    priceMode: "hourly",
  },
};

export default function CategoryPage() {
  const params = useParams<{ type: string }>();
  const type = params.type;
  const meta = CATEGORY_META[type];

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { savedIds, toggle } = useSavedListings();

  useEffect(() => {
    if (!meta) return;
    setLoading(true);
    fetch(`/api/public/listings?category=${type}&limit=50`)
      .then((res) => (res.ok ? res.json() : { listings: [] }))
      .then((json: { listings?: Listing[] }) => setListings(json.listings ?? []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [type, meta]);

  if (!meta) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <FeaturedRail
          placement="category_featured"
          category={type as ListingCategory}
          heading={`Featured ${meta.title.toLowerCase()}`}
          savedIds={savedIds}
          onToggleSave={toggle}
          priceMode={meta.priceMode}
        />

        <div className="mb-6 mt-10">
          <h1 className="font-brand text-3xl tracking-tight text-[#2b000a] sm:text-4xl">{meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029376/empty-saved_clsjni.png"
            title={`No ${meta.title.toLowerCase()} yet`}
            subtitle="Check back soon — new verified listings are added regularly."
            size="sm"
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedIds.has(listing.id)}
                onToggleSave={() => toggle(listing.id)}
                priceMode={meta.priceMode}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
