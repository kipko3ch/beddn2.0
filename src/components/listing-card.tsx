"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Listing } from "@/lib/types";

export function ListingCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[4/3] rounded-xl bg-muted" />
      <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
      <div className="mt-3 flex gap-1.5">
        <div className="h-4 w-14 rounded-full bg-muted" />
        <div className="h-4 w-14 rounded-full bg-muted" />
      </div>
      <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
    </div>
  );
}

export function ListingCard({
  listing,
  onHover,
  isSaved,
  onToggleSave,
}: {
  listing: Listing;
  onHover?: (id: string | null) => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const images = listing.listing_images?.length ? listing.listing_images : [];
  const image = images[imageIndex]?.url;
  const price =
    listing.hourly_price ??
    listing.overnight_price ??
    listing.experience_price ??
    0;
  const priceLabel = listing.hourly_price
    ? "/hr"
    : listing.overnight_price
    ? "/night"
    : "/session";
  const reviews = listing.reviews ?? [];
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  function moveImage(event: React.MouseEvent<HTMLButtonElement>, direction: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    if (images.length < 2) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
  }

  return (
    <Link
      href={`/property/${listing.slug}`}
      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2"
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {image ? (
          <img
            src={image}
            alt={listing.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}

        {images.length > 1 && (
          <>
            <button
              aria-label="Previous image"
              className="absolute left-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:flex group-hover:opacity-100 focus:flex focus:opacity-100"
              onClick={(event) => moveImage(event, -1)}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next image"
              className="absolute right-3 top-1/2 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:flex group-hover:opacity-100 focus:flex focus:opacity-100"
              onClick={(event) => moveImage(event, 1)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.slice(0, 6).map((item, index) => (
                <span
                  key={item.id}
                  className={`size-1.5 rounded-full ${
                    index === imageIndex ? "bg-white" : "bg-white/55"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {onToggleSave && (
          <button
            aria-label={isSaved ? "Remove from saved trips" : "Save listing"}
            className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave();
            }}
          >
            <Heart
              className={`h-5 w-5 ${isSaved ? "fill-[#800020] text-[#800020]" : "text-[#181113]"}`}
            />
          </button>
        )}
      </div>
      <div className="mt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-base font-bold underline-offset-2 group-hover:underline">
            {listing.title || listing.name}
          </h3>
          {reviews.length > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <span>{avgRating.toFixed(1)}</span>
              <Star className="h-4 w-4 fill-[#800020] text-[#800020]" />
              <span className="text-muted-foreground">({reviews.length})</span>
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {listing.area}, {listing.city}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {listing.categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="rounded-full px-2 py-0 text-xs">
              {cat}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-sm">
          <span className="font-semibold">
            {listing.currency || "KES"} {Number(price).toLocaleString()}
          </span>
          <span className="text-muted-foreground">{priceLabel}</span>
        </p>
      </div>
    </Link>
  );
}
