"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
import { EmptyState } from "@/components/empty-state";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { useSavedListings } from "@/lib/hooks";
import type { Listing } from "@/lib/types";

export default function SavedTripsPage() {
  const supabase = createClient();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const { savedIds, toggle } = useSavedListings();

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setLoggedOut(true);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("saved_trips")
        .select("listing:listings(*, listing_images(*), reviews(rating))")
        .eq("user_id", user.user.id)
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as unknown as { listing: Listing | null }[];
      const results = rows
        .map((item: { listing: Listing | null }) => item.listing)
        .filter(Boolean) as Listing[];
      setListings(results);
      setLoading(false);
    }
    load();
  }, []);

  async function removeSaved(listingId: string) {
    const result = await toggle(listingId);
    if (result.ok) {
      setListings((prev) => prev.filter((listing) => listing.id !== listingId));
    }
  }

  return (
    <>
    <Header />
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Saved trips</h1>
      {loggedOut ? (
        <EmptyState
          image="/images/empty-saved.png"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] rounded-xl bg-muted" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isSaved={savedIds.has(listing.id)}
              onToggleSave={() => removeSaved(listing.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          image="/images/empty-saved.png"
          title="No saved trips yet"
          subtitle="Browse listings and save the ones you like."
        />
      )}
    </main>
    </>
  );
}
