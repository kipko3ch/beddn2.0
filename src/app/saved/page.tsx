"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { EmptyState } from "@/components/empty-state";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import type { Listing } from "@/lib/types";

export default function SavedTripsPage() {
  const supabase = createClient();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // getSession reads the local session (fast) — no network round-trip like
      // getUser. RLS still enforces access server-side on the query below.
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
      setListings(rows.map((r) => r.listing).filter(Boolean) as Listing[]);
      setLoading(false);
    }
    load();
  }, []);

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
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 md:pb-12">
        <div className="mb-6">
          <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">Saved trips</h1>
          {!loggedOut && !loading && listings.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {listings.length} saved {listings.length === 1 ? "place" : "places"}
            </p>
          )}
        </div>
        {loggedOut ? (
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029376/empty-saved_clsjni.png"
            title="Sign in to see your saved trips"
            subtitle="Log in to save places you like and find them again here."
          >
            <AuthDialog>
              <Button className="rounded-full bg-[#800020] px-6 hover:bg-[#600018]">
                Sign in
              </Button>
            </AuthDialog>
          </EmptyState>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved
                onToggleSave={() => removeSaved(listing.id)}
                priceMode={
                  (listing.categories || listing.category || []).includes("overnight")
                    ? "overnight"
                    : "hourly"
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029376/empty-saved_clsjni.png"
            title="No saved trips yet"
            subtitle="Browse listings and save the ones you like."
          />
        )}
      </main>
    </>
  );
}
