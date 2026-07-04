"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, notFound, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Header } from "@/components/header";
import { ListingCard, ListingCardSkeleton } from "@/components/listing-card";
import { FeaturedRail } from "@/components/home-sections";
import { EmptyState } from "@/components/empty-state";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSavedListings } from "@/lib/hooks";
import { PROPERTY_TYPES } from "@/lib/property-types";
import type { Listing, ListingCategory } from "@/lib/types";

const CATEGORY_META: Record<string, { title: string; blurb: string; priceMode: "hourly" | "overnight" }> = {
  hourly: {
    title: "Hourly stays",
    blurb: "Book a verified space for a few hours — meetings, shoots, or downtime.",
    priceMode: "hourly",
  },
  overnight: {
    title: "Overnight stays",
    blurb: "Verified places to stay the night across Africa.",
    priceMode: "overnight",
  },
  experience: {
    title: "Experiences",
    blurb: "Hosted trips, classes, and activities you can book with confidence.",
    priceMode: "hourly",
  },
};

/** Compact pill dropdown filter, matching the /search page's filter chips. */
function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const active = selected && selected.value !== options[0].value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold shadow-sm transition-colors ${
              active
                ? "border-[#2b000a] bg-[#2b000a] text-white"
                : "border-[#e3d3d9] bg-white text-[#2b000a]"
            }`}
          />
        }
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {active ? selected.label : label}
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-64 overflow-y-auto rounded-2xl p-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted ${
              option.value === value ? "font-bold text-crimson" : ""
            }`}
          >
            {option.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function CategoryPage() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const type = params.type;
  const meta = CATEGORY_META[type];
  const isExperience = type === "experience";

  const [q, setQ] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [priceMode, setPriceMode] = useState<"hourly" | "overnight">(meta?.priceMode ?? "hourly");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const { savedIds, toggle } = useSavedListings();

  const fetchListings = useCallback(async () => {
    if (!meta) return;
    setLoading(true);
    const search = new URLSearchParams({ category: type, limit: "50" });
    if (!isExperience) search.set("type", propertyType);
    if (q) search.set("q", q);
    try {
      const res = await fetch(`/api/public/listings?${search.toString()}`);
      const json: { listings?: Listing[] } = res.ok ? await res.json() : {};
      setListings(json.listings ?? []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [type, meta, isExperience, propertyType, q]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const activeFilterCount = (!isExperience && propertyType !== "all" ? 1 : 0) + (q ? 1 : 0);

  if (!meta) {
    notFound();
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setQ(queryInput.trim());
  }

  return (
    <>
      <Header />
      <main className="mx-auto min-h-screen w-full max-w-[1920px] px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <FeaturedRail
          placement="category_featured"
          category={type as ListingCategory}
          heading={`Featured ${meta.title.toLowerCase()}`}
          savedIds={savedIds}
          onToggleSave={toggle}
          priceMode={meta.priceMode}
        />

        <div className="mb-6 mt-10">
          <h1 className="font-brand text-3xl tracking-tight text-[#2b000a] sm:text-4xl">{meta.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.blurb}</p>
        </div>

        {/* Search + filters — a lighter version of /search's controls, scoped
            to this category so switching categories doesn't lose context. */}
        <div className="mb-6 space-y-3">
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="flex h-12 flex-1 items-center gap-2 rounded-full border border-black/10 bg-white px-4 shadow-sm focus-within:shadow-md">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={`Search ${meta.title.toLowerCase()} by city or area`}
                className="w-full border-0 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
              {queryInput && (
                <button
                  type="button"
                  onClick={() => {
                    setQueryInput("");
                    setQ("");
                  }}
                  aria-label="Clear search"
                  className="shrink-0 text-muted-foreground hover:text-[#2b000a]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="flex h-12 shrink-0 items-center justify-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-merlot"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {!isExperience && (
              <ChipSelect
                label="Type of place"
                value={propertyType}
                options={[{ value: "all", label: "Any type of place" }, ...PROPERTY_TYPES]}
                onChange={setPropertyType}
              />
            )}
            {!isExperience && listings.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show prices</span>
                <div className="inline-flex rounded-full bg-[#f5eef1] p-0.5" role="group">
                  {(["hourly", "overnight"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPriceMode(mode)}
                      aria-pressed={priceMode === mode}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        priceMode === mode ? "bg-[#800020] text-white" : "text-muted-foreground"
                      }`}
                    >
                      {mode === "hourly" ? "Hourly" : "Nightly"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPropertyType("all");
                  setQueryInput("");
                  setQ("");
                }}
                className="text-xs font-semibold text-crimson hover:underline"
              >
                Clear filters
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push(`/search?category=${type}${q ? `&q=${encodeURIComponent(q)}` : ""}`)}
              className="text-xs font-semibold text-merlot hover:underline"
            >
              Open full search with dates &amp; guests
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029376/empty-saved_clsjni.png"
            title={`No ${meta.title.toLowerCase()} yet`}
            subtitle="Check back soon — new verified listings are added regularly."
            size="sm"
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedIds.has(listing.id)}
                onToggleSave={() => toggle(listing.id)}
                priceMode={priceMode}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
