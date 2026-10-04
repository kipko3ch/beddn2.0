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
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ROUTES } from "@/lib/routes";
import { Heart, MapPin, Star, Trash2 } from "lucide-react";
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
  return `${listing.currency || "KES"} ${Number(price).toLocaleString()} ${suffix}`;
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
  const locationLabel = [listing.area, listing.city].filter(Boolean).join(", ");
  const isExp = isExperience(listing);
  const detailHref = isExp ? `/experience/${listing.slug}` : `/property/${listing.slug}`;

  return (
    <article className="group relative flex flex-col rounded-3xl border border-stone-200/90 bg-white p-3 shadow-xs transition-all duration-300 hover:shadow-md hover:border-[#800020]/30">
      <Link
        href={detailHref}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2 rounded-2xl"
      >
        {/* Photo Container */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-stone-100">
          {image ? (
            <Image
              src={image}
              alt={listing.title || listing.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
              quality={75}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs font-medium text-stone-400">
              No image yet
            </div>
          )}

          {/* Verified Badge Overlay */}
          {(listing.is_verified || listing.host?.is_verified) && (
            <div className="absolute left-2.5 top-2.5 z-10">
              <VerifiedBadge text="Verified" size="xs" className="bg-white/95 backdrop-blur-xs shadow-xs" />
            </div>
          )}

          {/* Category Chip (Normal Case) */}
          <div className="absolute right-2.5 bottom-2.5 z-10">
            <span className="rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-medium text-white shadow-xs capitalize">
              {isExp ? "Experience" : listing.category || "Stay"}
            </span>
          </div>
        </div>

        {/* Details (No Capslock) */}
        <div className="mt-3 px-1 pb-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-brand font-bold text-sm sm:text-base text-stone-900 truncate leading-snug group-hover:text-[#800020] transition-colors">
              {listing.title || listing.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 text-xs text-stone-500 truncate">
            <MapPin className="size-3.5 shrink-0 text-[#800020]" />
            <span className="truncate">{locationLabel || listing.country || "East Africa"}</span>
          </div>

          <div className="pt-1.5 flex items-baseline justify-between border-t border-stone-100">
            <p className="font-brand font-extrabold text-sm text-[#2b000a]">
              {priceLabel(listing)}
            </p>
          </div>
        </div>
      </Link>

      {/* Remove / Edit Button */}
      {editMode && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="absolute -top-2 -right-2 z-20 flex size-8 items-center justify-center rounded-full bg-white text-rose-600 border border-rose-200 shadow-md hover:bg-rose-50 transition"
          aria-label={`Remove ${listing.title || listing.name} from saved`}
          title="Remove from saved"
        >
          <Trash2 className="size-4" />
        </button>
      )}
    </article>
  );
}

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-3xl border border-stone-200/80 bg-white p-3 space-y-3">
          <div className="aspect-[4/3] rounded-2xl bg-stone-100" />
          <div className="space-y-2 px-1">
            <div className="h-4 w-3/4 rounded-md bg-stone-200/80" />
            <div className="h-3 w-1/2 rounded-md bg-stone-200/60" />
            <div className="h-4 w-1/3 rounded-md bg-stone-200/70 pt-2" />
          </div>
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

      <main className="min-h-screen bg-[#faf8f9] text-[#181113] pb-24 pt-6 md:pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Row */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-stone-200/80 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#800020] mb-1.5">
                <Heart className="size-3.5 fill-[#800020]" />
                <span>Your Saved Collection</span>
              </div>
              <h1 className="font-brand text-3xl sm:text-4xl font-extrabold text-[#2b000a] tracking-tight">
                Wishlist
              </h1>
              {!loggedOut && !loading && (
                <p className="mt-1 text-xs sm:text-sm text-stone-500 font-medium">
                  {listings.length} {listings.length === 1 ? "saved stay" : "saved stays & experiences"}
                </p>
              )}
            </div>

            {!loggedOut && listings.length > 0 && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setEditMode((value) => !value)}
                  className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-bold text-stone-700 hover:border-[#800020] hover:text-[#800020] shadow-2xs transition"
                >
                  {editMode ? "Done Editing" : "Manage List"}
                </button>
              </div>
            )}
          </div>

          {/* Filter Tabs & Sort Controls */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="inline-flex rounded-full border border-stone-200/80 bg-white p-1 shadow-2xs self-start">
              {[
                ["all", "All Stays"],
                ["places", "Places"],
                ["experiences", "Experiences"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as SavedFilter)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    filter === value
                      ? "bg-[#800020] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {!loggedOut && listings.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-stone-500 self-start sm:self-auto">
                <span className="font-medium">Sort by:</span>
                <select
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-800 shadow-2xs focus:border-[#800020] outline-none"
                  aria-label="Sort saved trips"
                >
                  <option value="recent">Recently saved</option>
                  <option value="city">City name</option>
                  <option value="price">Price (lowest first)</option>
                </select>
              </div>
            )}
          </div>

          {/* Content Area */}
          {loggedOut ? (
            <section className="rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
              <div className="size-14 rounded-2xl bg-[#fdf2f4] text-[#800020] flex items-center justify-center mx-auto">
                <Heart className="size-7 fill-[#800020]" />
              </div>
              <h2 className="font-brand text-2xl font-extrabold text-[#2b000a]">Sign in to see your wishlist</h2>
              <p className="text-xs sm:text-sm text-stone-500 leading-relaxed max-w-sm mx-auto">
                Save places, apartments, and unique experiences you love across East Africa, then easily come back to them anytime.
              </p>
              <div className="pt-2">
                <AuthDialog>
                  <Button className="rounded-full bg-[#800020] px-8 font-bold text-white hover:bg-[#68001a] shadow-xs">
                    Sign in to Beddn
                  </Button>
                </AuthDialog>
              </div>
            </section>
          ) : loading ? (
            <WishlistSkeleton />
          ) : visibleListings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
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
            <div className="rounded-3xl border border-stone-200/90 bg-white p-8 text-center text-sm text-stone-500 max-w-md mx-auto shadow-xs">
              No items in this category yet. Select &quot;All Stays&quot; to view everything in your wishlist.
            </div>
          ) : (
            <EmptyState
              image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029376/empty-saved_clsjni.png"
              title="No saved places yet"
              subtitle="Browse listings across Kenya, Uganda, Rwanda, and Tanzania. Tap the heart to bookmark spaces you love."
              size="sm"
            />
          )}
        </div>
      </main>

      <SavedBottomNav loggedOut={loggedOut} />
    </>
  );
}
