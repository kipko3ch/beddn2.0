"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
import { ListingCard } from "@/components/listing-card";
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="font-brand text-3xl mb-6 text-[#2b000a]">Saved trips</h1>
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
        ) : loading ? null : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved
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
