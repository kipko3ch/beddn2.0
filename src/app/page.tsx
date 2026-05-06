"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSavedListings } from "@/lib/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { Search, MapPin, Sparkles, Clock, Moon, Compass } from "lucide-react";
import type { Listing, ListingCategory } from "@/lib/types";

const CATEGORIES = [
  { key: "all" as const, label: "All", icon: Sparkles },
  { key: "hourly" as const, label: "Hourly", icon: Clock },
  { key: "overnight" as const, label: "Overnight", icon: Moon },
  { key: "experience" as const, label: "Experiences", icon: Compass },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<"all" | ListingCategory>("all");
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();
  const { savedIds, toggle } = useSavedListings();

  useEffect(() => {
    fetchListings();
  }, [activeTab]);

  async function fetchListings() {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("*, listing_images(*), host:hosts(*)")
      .eq("is_active", true)
      .eq("is_verified", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (activeTab !== "all") {
      query = query.contains("categories", [activeTab]);
    }

    const { data } = await query;
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}&category=${activeTab}`);
  }

  function handleNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        router.push(
          `/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&category=${activeTab}`
        );
      },
      () => alert("Could not get your location. Please allow location access.")
    );
  }

  return (
    <main className="flex-1">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by city, area, or place name..."
                className="pl-10"
              />
            </div>
            <Button type="submit" className="bg-[#800020] hover:bg-[#600018]">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleNearby}
              className="gap-1.5 hidden sm:flex"
            >
              <MapPin className="h-4 w-4" /> Nearby
            </Button>
          </form>
        </div>
      </section>

      <section className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto py-3">
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-col items-center gap-1 min-w-fit pb-2 border-b-2 transition-colors ${
                  activeTab === key
                    ? "border-[#800020] text-[#800020]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/3] rounded-xl bg-muted" />
                <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
                <div className="mt-1 h-3 w-1/2 rounded bg-muted" />
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
                onToggleSave={() => toggle(listing.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-6">
              No verified places here yet
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
      </section>
    </main>
  );
}
