"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/lib/types";

export default function SavedTripsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        router.push("/");
        return;
      }

      const { data } = await supabase
        .from("saved_trips")
        .select("listing:listings(*, listing_images(*))")
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

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Saved trips</h1>
      {loading ? (
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
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No saved trips yet. Browse listings and save the ones you like.</p>
      )}
    </main>
  );
}
