"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Listing } from "@/lib/types";

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
  const image = listing.listing_images?.[0]?.url;
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

  return (
    <Link
      href={`/property/${listing.slug}`}
      className="group block"
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={listing.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        {onToggleSave && (
          <button
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors"
            onClick={(e) => {
              e.preventDefault();
              onToggleSave();
            }}
          >
            <Heart
              className={`h-4 w-4 ${isSaved ? "fill-[#800020] text-[#800020]" : ""}`}
            />
          </button>
        )}
      </div>
      <div className="mt-2">
        <h3 className="font-medium text-sm truncate">{listing.name}</h3>
        <p className="text-muted-foreground text-xs">
          {listing.area}, {listing.city}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {listing.categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs px-1.5 py-0">
              {cat}
            </Badge>
          ))}
        </div>
        <p className="mt-1 text-sm">
          <span className="font-semibold">
            ${Number(price).toLocaleString()}
          </span>
          <span className="text-muted-foreground">{priceLabel}</span>
        </p>
      </div>
    </Link>
  );
}
