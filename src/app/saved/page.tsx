"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
import { EmptyState } from "@/components/empty-state";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { ROUTES } from "@/lib/routes";
import type { Listing, ListingCategory } from "@/lib/types";

type SavedFilter = "all" | "places" | "experiences";
type SortMode = "recent" | "city" | "price";

function listingImage(listing: Listing) {
  return listing.listing_images?.[0]?.url || null;
}

function listingCategories(listing: Listing) {
  return (listing.categories || listing.category || []) as ListingCategory[];
}

function isExperience(listing: Listing) {
  return listingCategories(listing).includes("experience");
}

function priceLabel(listing: Listing) {
  const price =
    listing.overnight_price ?? listing.hourly_price ?? listing.experience_price ?? 0;
  const suffix = listing.overnight_price
    ? "/night"
    : listing.hourly_price
    ? "/hr"
    : "/session";
  return `${listing.currency || "KES"} ${Number(price).toLocaleString()}${suffix}`;
}

function SavedBottomNav({ loggedOut }: { loggedOut: boolean }) {
  const item = "flex flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] font-medium";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid w-full grid-cols-4 border-t border-black/10 bg-white px-1.5 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] text-center text-[11px] shadow-[0_-4px_16px_rgba(24,17,19,0.05)] md:hidden">
      <Link href={ROUTES.search} className={`${item} text-[#6f6568]`}>
        <Icon icon="line-md:search" className="h-6 w-6" />
        Explore
      </Link>
      <Link href={ROUTES.saved} className={`${item} text-[#800020]`}>
        <Icon icon="line-md:heart-filled" className="h-6 w-6" />
        Wishlist
      </Link>
      <Link href={ROUTES.home} className={`${item} text-[#6f6568]`}>
        <Icon icon="line-md:home" className="h-6 w-6" />
        Trips
      </Link>
      {loggedOut ? (
        <AuthDialog>
          <button className={`${item} w-full text-[#6f6568]`}>
            <Icon icon="line-md:account" className="h-6 w-6" />
            Profile
          </button>
        </AuthDialog>
      ) : (
        <Link href={ROUTES.dashboard} className={`${item} text-[#6f6568]`}>
          <Icon icon="line-md:account" className="h-6 w-6" />
          Profile
        </Link>
      )}
    </nav>
  );
}

function SavedTile({
  listing,
  editMode,
  onRemove,
}: {
  listing: Listing;
  editMode: boolean;
  onRemove: () => void;
}) {
  const image = listingImage(listing);
  const place = listing.city || listing.area || "Saved";
  const locationLabel = [listing.area, listing.city].filter(Boolean).join(", ");

  return (
    <article className="min-w-0">
      <Link
        href={`/property/${listing.slug}`}
        className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[1.28/1] overflow-hidden rounded-lg bg-[#eee6e9] shadow-sm">
          {image ? (
            <Image
              src={image}
              alt={listing.title || listing.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              quality={72}
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-semibold text-muted-foreground">
              No image yet
            </div>
          )}
          <div className="absolute inset-x-2 bottom-2 flex justify-center">
            <span className="max-w-[90%] truncate rounded-md bg-white/92 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#202124] shadow-sm">
              {place}
            </span>
          </div>
          {editMode && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onRemove();
              }}
              className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-white text-[#800020] shadow-sm"
              aria-label={`Remove ${listing.title || listing.name} from saved`}
            >
              <Icon icon="line-md:close" className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-2 min-w-0">
          <p className="truncate text-[11px] font-black uppercase tracking-wide text-[#202124] sm:text-xs">
            {isExperience(listing) ? "Experience saved" : "1 location saved"}
          </p>
          <h2 className="mt-0.5 truncate text-sm font-bold text-[#202124] sm:text-base">
            {listing.title || listing.name}
          </h2>
          <p className="mt-0.5 truncate text-[11px] font-medium text-[#777] sm:text-xs">
            {locationLabel || listing.country}
          </p>
          <p className="mt-1 text-[11px] font-bold text-[#202124] sm:text-xs">
            {priceLabel(listing)}
          </p>
        </div>
      </Link>
    </article>
  );
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="aspect-[1.28/1] rounded-lg bg-[#eee6e9]" />
          <div className="mt-2 h-3 w-24 rounded bg-[#eee6e9]" />
          <div className="mt-2 h-4 w-full rounded bg-[#eee6e9]" />
          <div className="mt-2 h-3 w-2/3 rounded bg-[#eee6e9]" />
        </div>
      ))}
    </div>
  );
}

export default function SavedTripsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SavedFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        setLoggedOut(true);
        setLoading(false);
        return;
      }
      setUserId(uid);

      const { data } = await supabase
        .from("saved_trips")
        .select("listing:listings(*, listing_images(*), reviews(rating))")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as { listing: Listing | null }[];
      setListings(rows.map((row) => row.listing).filter(Boolean) as Listing[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const visibleListings = useMemo(() => {
    const filtered = listings.filter((listing) => {
      if (filter === "places") return !isExperience(listing);
      if (filter === "experiences") return isExperience(listing);
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === "city") {
        return (a.city || a.area || "").localeCompare(b.city || b.area || "");
      }
      if (sortMode === "price") {
        const aPrice = Number(a.overnight_price ?? a.hourly_price ?? a.experience_price ?? 0);
        const bPrice = Number(b.overnight_price ?? b.hourly_price ?? b.experience_price ?? 0);
        return aPrice - bPrice;
      }
      return 0;
    });
  }, [filter, listings, sortMode]);

  async function removeSaved(listingId: string) {
    if (!userId) return;
    setListings((prev) => prev.filter((listing) => listing.id !== listingId));
    await supabase
      .from("saved_trips")
      .delete()
      .eq("user_id", userId)
      .eq("listing_id", listingId);
  }

  return (
    <>
      <div className="hidden md:block">
        <Header />
      </div>
      <main className="min-h-screen bg-white px-4 pb-24 pt-5 text-[#202124] sm:px-6 md:mx-auto md:max-w-7xl md:pb-12 md:pt-8">
        <div className="mb-5 flex items-start justify-between gap-4 md:mb-7">
          <div>
            <p className="hidden text-sm font-semibold text-muted-foreground md:block">Saved</p>
            <h1 className="text-3xl font-black tracking-tight md:font-brand md:text-4xl md:text-[#2b000a]">
              Wishlist
            </h1>
            {!loggedOut && !loading && (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {listings.length} saved {listings.length === 1 ? "item" : "items"}
              </p>
            )}
          </div>
          {!loggedOut && listings.length > 0 && (
            <button
              type="button"
              onClick={() => setEditMode((value) => !value)}
              className="mt-1 rounded-full px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline"
            >
              {editMode ? "Done" : "Edit"}
            </button>
          )}
        </div>

        <div className="mb-5 flex items-center justify-center md:justify-start">
          <div className="grid w-full max-w-[340px] grid-cols-3 rounded-full border bg-white p-1 text-center text-xs font-bold shadow-sm md:max-w-sm">
            {[
              ["all", "All"],
              ["places", "Places"],
              ["experiences", "Experiences"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value as SavedFilter)}
                className={`rounded-full px-3 py-2 transition-colors ${
                  filter === value
                    ? "bg-[#ff5a66] text-white"
                    : "text-[#202124] hover:bg-[#f5f1f2]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loggedOut && (
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[#555]">
            <span>Order by:</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-full border bg-white px-2 py-1 text-xs font-bold text-[#202124]"
              aria-label="Sort saved trips"
            >
              <option value="recent">Recently saved</option>
              <option value="city">City</option>
              <option value="price">Price</option>
            </select>
          </div>
        )}

        {loggedOut ? (
          <section className="rounded-lg border bg-[#fbf7f8] p-5 text-left shadow-sm sm:p-8 md:max-w-xl">
            <h2 className="text-2xl font-black text-[#202124]">Sign in to see your wishlist</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Save places and experiences you like, then come back to them from this page.
            </p>
            <AuthDialog>
              <Button className="mt-5 rounded-full bg-[#800020] px-6 hover:bg-[#600018]">
                Sign in
              </Button>
            </AuthDialog>
          </section>
        ) : loading ? (
          <WishlistSkeleton />
        ) : visibleListings.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {visibleListings.map((listing) => (
              <SavedTile
                key={listing.id}
                listing={listing}
                editMode={editMode}
                onRemove={() => removeSaved(listing.id)}
              />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="rounded-lg border bg-[#fbf7f8] p-5 text-sm text-muted-foreground">
            Nothing in this filter yet. Try All or save more from search.
          </div>
        ) : (
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029376/empty-saved_clsjni.png"
            title="No saved places yet"
            subtitle="Browse listings and tap the heart on anything worth coming back to."
            size="sm"
          />
        )}
      </main>
      <SavedBottomNav loggedOut={loggedOut} />
    </>
  );
}
