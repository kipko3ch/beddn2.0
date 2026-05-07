"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { Map } from "@/components/map";
import { useSavedListings } from "@/lib/hooks";
import { Bus, Dumbbell, MapPin, Search, Waves, X } from "lucide-react";
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
  const [demandCount, setDemandCount] = useState(0);
  const { savedIds, toggle } = useSavedListings();
  const isExperienceSearch = category === "experience";

  const fetchResults = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("listings")
      .select("*, listing_images(*), host:hosts(id, name, is_verified), reviews(rating)")
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

    await supabase.from("search_demand").insert({
      query: q || null,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
      category: category !== "all" ? category : null,
      results_count: results.length,
    });

    let demandQuery = supabase
      .from("search_demand")
      .select("id", { count: "exact", head: true });
    if (category !== "all") {
      demandQuery = demandQuery.eq("category", category);
    }
    if (q) {
      demandQuery = demandQuery.ilike("query", `%${q}%`);
    }
    const { count } = await demandQuery;
    setDemandCount(count ?? 0);
    setLoading(false);
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

  function changeCategory(nextCategory: string) {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (nextCategory !== "all") params.set("category", nextCategory);
    router.push(`/search?${params.toString()}`);
  }

  function handlePinClick(listing: Listing) {
    setHighlightedId(listing.id);
    const el = document.getElementById(`listing-${listing.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const mapCenter: [number, number] | undefined =
    lat && lng ? [parseFloat(lng), parseFloat(lat)] : undefined;

  const categoryOptions = [
    { value: "all", label: "All" },
    { value: "hourly", label: "Hourly" },
    { value: "overnight", label: "Overnight" },
    { value: "experience", label: "Experiences" },
  ];

  return (
    <main className="bg-white text-[#181113]">
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 rounded-[28px] border bg-white p-2 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Where are you going?"
                className="h-12 border-0 bg-transparent pl-12 text-base focus-visible:ring-0"
              />
            </div>
            <Button
              type="submit"
              className="h-12 rounded-full bg-[#800020] px-8 font-bold hover:bg-[#600018]"
            >
              Search
            </Button>
          </form>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {categoryOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => changeCategory(option.value)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  category === option.value
                    ? "border-[#800020] bg-[#800020] text-white"
                    : "border-neutral-200 bg-white hover:border-[#800020] hover:text-[#800020]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,42%)] lg:px-8">
        <div className={showMap ? "hidden lg:block" : ""}>
          <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#800020]">
                  {isExperienceSearch
                    ? q
                      ? `Experience ideas for ${q}`
                      : "Explore trips and classes"
                    : q
                    ? `Search results for ${q}`
                    : "Explore verified stays"}
                </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {loading
                ? isExperienceSearch
                  ? "Finding experiences"
                  : "Finding places"
                : listings.length > 0
                ? isExperienceSearch
                  ? `${listings.length} verified experience${listings.length === 1 ? "" : "s"}`
                  : `${listings.length} verified place${listings.length === 1 ? "" : "s"}`
                : isExperienceSearch
                ? "No hosted trips here yet"
                : "No verified places here yet"}
            </h1>
          </div>
          <p className="mb-5 rounded-2xl bg-[#fbf7f8] px-4 py-3 text-sm text-muted-foreground">
            {isExperienceSearch
              ? "Tip: search simple words like road trip, swimming, yoga, hiking, food tour, or kids class."
              : "Tip: choose a result, check the photos and availability, then reserve with your phone number."}
          </p>

          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/3] rounded-xl bg-muted" />
                  <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <div
                  key={listing.id}
                  id={`listing-${listing.id}`}
                  className={`rounded-xl transition-shadow ${
                    highlightedId === listing.id ? "ring-2 ring-[#800020] ring-offset-2" : ""
                  }`}
                >
                  <ListingCard
                    listing={listing}
                    onHover={setHighlightedId}
                    isSaved={savedIds.has(listing.id)}
                    onToggleSave={() => toggle(listing.id)}
                  />
                </div>
              ))}
            </div>
          ) : isExperienceSearch ? (
            <div className="rounded-2xl border bg-[#fbf7f8] px-5 py-10 sm:px-8">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#800020]">
                  Experiences are coming
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Road trips, yoga days, swimming classes, hikes, food tours.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
                  We are collecting demand first so local organizers know where groups are already forming.
                </p>
                <div className="mx-auto mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
                  {Math.max(demandCount, 1)} people have asked for this
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Bus, title: "Road trips", text: "Naivasha, Nanyuki, coast weekends, group vans." },
                  { icon: Waves, title: "Swimming classes", text: "Beginner lessons, kids sessions, private pools." },
                  { icon: Dumbbell, title: "Wellness & sport", text: "Yoga, hikes, cycling, dance, and fitness groups." },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-2xl bg-white p-4 text-left shadow-sm">
                    <Icon className="mb-3 h-5 w-5 text-[#800020]" />
                    <p className="font-bold">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  onClick={() => {
                    setSearchQuery("road trip");
                    router.push("/search?q=road%20trip&category=experience");
                  }}
                  className="rounded-full bg-[#800020] hover:bg-[#600018]"
                >
                  Find road trips
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => router.push("/search?q=swimming%20classes&category=experience")}
                >
                  Try swimming classes
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-[#fbf7f8] px-5 py-12 text-center sm:px-8">
              <p className="text-2xl font-bold">No verified places here yet.</p>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Be the first verified host in this area and get early visibility as demand grows.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  onClick={() => router.push("/dashboard/listings/new")}
                  className="rounded-full bg-[#800020] hover:bg-[#600018]"
                >
                  List your place
                </Button>
                <Button variant="outline" className="rounded-full">
                  Notify me when available
                </Button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`overflow-hidden rounded-2xl border bg-muted lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)] ${
            showMap ? "fixed inset-0 top-14 z-30 rounded-none border-0" : "hidden"
          }`}
        >
          {showMap && (
            <button
              onClick={() => setShowMap(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 shadow-md lg:hidden"
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
            className="fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#800020] px-6 py-3 text-sm font-medium text-white shadow-lg lg:hidden"
          >
            <MapPin className="h-4 w-4" /> View map
          </button>
        )}
      </section>
    </main>
  );
}
