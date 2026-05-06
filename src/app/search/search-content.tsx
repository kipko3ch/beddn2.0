"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { Map } from "@/components/map";
import { Search, MapPin, X } from "lucide-react";
import type { Listing } from "@/lib/types";

export function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const q = searchParams.get("q") ?? "";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const category = searchParams.get("category") ?? "all";

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(q);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const fetchResults = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("listings")
      .select("*, listing_images(*), host:hosts(*)")
      .eq("is_active", true)
      .eq("is_verified", true);

    if (category !== "all") {
      query = query.contains("categories", [category]);
    }

    if (q) {
      query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,area.ilike.%${q}%,country.ilike.%${q}%`);
    }

    const { data } = await query.order("created_at", { ascending: false }).limit(50);
    const results = (data as Listing[]) ?? [];
    setListings(results);
    setLoading(false);

    await supabase.from("search_demand").insert({
      query: q || null,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      category: category !== "all" ? category : null,
      results_count: results.length,
    });
  }, [q, lat, lng, category]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (category !== "all") params.set("category", category);
    router.push(`/search?${params.toString()}`);
  }

  function handlePinClick(listing: Listing) {
    setHighlightedId(listing.id);
    const el = document.getElementById(`listing-${listing.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const mapCenter: [number, number] | undefined =
    lat && lng ? [parseFloat(lng), parseFloat(lat)] : undefined;

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b bg-white px-4 py-3">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-10"
            />
          </div>
          <Button type="submit" className="bg-[#800020] hover:bg-[#600018]">
            Search
          </Button>
        </form>
      </div>

      <div className="flex-1 flex relative">
        <div className={`w-full lg:w-1/2 overflow-y-auto p-4 ${showMap ? "hidden lg:block" : ""}`}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-xl bg-muted" />
                  <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  id={`listing-${listing.id}`}
                  className={`rounded-xl transition-shadow ${
                    highlightedId === listing.id ? "ring-2 ring-[#800020]" : ""
                  }`}
                >
                  <ListingCard listing={listing} onHover={setHighlightedId} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg mb-2">
                No verified places here yet
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                Be the first verified host in this area and get early visibility as demand grows.
              </p>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => router.push("/dashboard/listings/new")}
                  className="bg-[#800020] hover:bg-[#600018]"
                >
                  List your place
                </Button>
                <Button variant="outline">Notify me when available</Button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`lg:w-1/2 lg:block lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] ${
            showMap ? "fixed inset-0 top-16 z-30" : "hidden"
          }`}
        >
          {showMap && (
            <button
              onClick={() => setShowMap(false)}
              className="lg:hidden absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-md"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <Map
            listings={listings}
            center={mapCenter}
            highlightedId={highlightedId}
            onPinClick={handlePinClick}
            approximate
          />
        </div>

        {!showMap && (
          <button
            onClick={() => setShowMap(true)}
            className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-[#800020] text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
          >
            <MapPin className="h-4 w-4" /> View map
          </button>
        )}
      </div>
    </div>
  );
}
