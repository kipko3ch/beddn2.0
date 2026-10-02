"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { Icon } from "@iconify/react";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Camera,
  Check,
  Clock,
  HeartHandshake,
  KeyRound,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TAGS = [
  { value: "clean", label: "Clean", icon: "solar:magic-stick-3-bold-duotone" },
  { value: "safe", label: "Safe", icon: "solar:shield-check-bold-duotone" },
  { value: "good_host", label: "Good host", icon: "solar:user-hand-up-bold-duotone" },
  { value: "accurate_photos", label: "Accurate photos", icon: "solar:camera-bold-duotone" },
  { value: "easy_check_in", label: "Easy check-in", icon: "solar:key-square-bold-duotone" },
  { value: "good_value", label: "Good value", icon: "solar:tag-price-bold-duotone" },
  { value: "good_location", label: "Good location", icon: "solar:map-point-wave-bold-duotone" },
] as const;

const MAX = 1000;

interface ListingResult {
  id: string;
  slug: string;
  title?: string;
  name?: string;
  city?: string;
  area?: string;
  listing_images?: { url?: string }[];
}

interface PublicReview {
  id: string;
  rating: number;
  comment?: string | null;
  tags?: string[];
  would_recommend?: boolean | null;
  created_at?: string;
  listing?: {
    id?: string;
    slug?: string;
    title?: string;
    name?: string;
    city?: string;
    area?: string;
    listing_images?: { url?: string }[];
  } | null;
  profile?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}


function ReviewInner() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const listingParam = searchParams.get("listing") ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [listingName, setListingName] = useState("");
  const [listingImage, setListingImage] = useState<string | null>(null);
  const [listingLocation, setListingLocation] = useState("");
  const [myStays, setMyStays] = useState<{ slug: string; name: string }[]>([]);
  const [chosenSlug, setChosenSlug] = useState("");
  const activeListing = listingParam || chosenSlug;

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ListingResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Form states
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [communityReviews, setCommunityReviews] = useState<PublicReview[]>([]);
  const [impactOpen, setImpactOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  // Fetch community reviews for showcase
  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { reviews?: PublicReview[] } | null) => {
        setCommunityReviews(data?.reviews || []);
      })
      .catch(() => setCommunityReviews([]));
  }, []);

  // Fetch active listing details when chosen
  useEffect(() => {
    if (!activeListing) return;
    fetch(`/api/public/listings?q=${encodeURIComponent(activeListing)}&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { listings?: ListingResult[] } | null) => {
        const match = j?.listings?.find((l) => l.slug === activeListing) ?? j?.listings?.[0];
        if (match) {
          setListingName(match.title || match.name || "");
          setListingImage(match.listing_images?.[0]?.url ?? null);
          setListingLocation(match.area ? `${match.area}, ${match.city}` : match.city || "");
        }
      })
      .catch(() => {});
  }, [activeListing]);

  // Fetch user's previous inquiries/stays
  useEffect(() => {
    if (!user || listingParam) return;
    supabase
      .from("inquiries")
      .select("listing:listings(slug, title, name, host:hosts(user_id))")
      .eq("guest_user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const seen = new Set<string>();
        const stays: { slug: string; name: string }[] = [];
        for (const row of (data ?? []) as {
          listing?: { slug?: string; title?: string; name?: string; host?: { user_id?: string } | null } | null;
        }[]) {
          const l = row.listing;
          if (!l?.slug || seen.has(l.slug) || l.host?.user_id === user.id) continue;
          seen.add(l.slug);
          stays.push({ slug: l.slug, name: l.title || l.name || "Your stay" });
        }
        setMyStays(stays);
      });
  }, [user, listingParam, supabase]);

  // Live search query for properties
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timeout = setTimeout(() => {
      fetch(`/api/public/listings?q=${encodeURIComponent(q)}&limit=6`)
        .then((res) => (res.ok ? res.json() : { listings: [] }))
        .then((data: { listings?: ListingResult[] }) => {
          setSearchResults(data.listings || []);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleTag(value: string) {
    setTags((cur) => (cur.includes(value) ? cur.filter((t) => t !== value) : [...cur, value]));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!activeListing) {
      setStatus({ type: "error", message: "Pick which stay you're reviewing first." });
      return;
    }
    if (!rating) {
      setStatus({ type: "error", message: "Tap a star to rate your stay." });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing: activeListing,
        rating,
        tags,
        comment,
        privateNote,
        wouldRecommend: recommend,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setSubmitting(false);
    if (!res.ok) {
      setStatus({ type: "error", message: json.error || "Could not submit your review." });
      return;
    }
    setStatus({ type: "success", message: "Thanks! Your review helps other guests and keeps Beddn trusted." });
  }

  // ACTIVE REVIEW COMPOSER VIEW: User has picked a place to review
  if (activeListing) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12 pb-36 sm:pb-28">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setChosenSlug("");
              setStatus(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#800020] hover:text-black transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to review search
          </button>
        </div>

        {/* Selected stay card banner */}
        <div className="mb-8 flex items-center gap-4 rounded-3xl border border-[#f3cfd9] bg-gradient-to-r from-[#fbf0f3]/60 via-white to-white p-4 shadow-xs">
          {listingImage ? (
            <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-100">
              <Image src={listingImage} alt="" fill className="object-cover" />
            </div>
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]">
              <Building2 className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="inline-block rounded-full bg-[#fbf0f3] border border-[#f3cfd9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#800020]">
              Reviewing stay
            </span>
            <h2 className="mt-1 truncate text-base sm:text-lg font-bold text-[#181113]">
              {listingName || "Beddn Property"}
            </h2>
            {listingLocation && (
              <p className="flex items-center gap-1 text-xs text-neutral-500">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                {listingLocation}
              </p>
            )}
          </div>
        </div>

        {status?.type === "success" ? (
          <div className="rounded-3xl border border-[#f3cfd9] bg-white p-8 text-center shadow-xs">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#e9f9f0] text-[#128c4b]">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <h2 className="font-[family-name:var(--font-kualine)] font-extrabold text-2xl sm:text-3xl text-[#2b000a]">Review published</h2>
            <p className="mt-2 text-sm text-neutral-600">{status.message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setChosenSlug("");
                  setStatus(null);
                }}
                className="rounded-full"
              >
                Write another review
              </Button>
              <Link
                href={ROUTES.home}
                className="inline-flex h-10 items-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-neutral-800 transition"
              >
                Back to Beddn
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-6">
            {/* Stars rating */}
            <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-8 shadow-xs text-center">
              <p className="mb-1 font-[family-name:var(--font-kualine)] font-extrabold text-lg sm:text-xl text-[#2b000a]">
                How would you rate your experience?
              </p>
              <p className="mb-4 text-xs text-neutral-500">Tap a star to rate</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = (hover || rating) >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHover(value)}
                      onMouseLeave={() => setHover(0)}
                      aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      className="p-1 transition-transform hover:scale-115"
                    >
                      <Star
                        className={`h-10 w-10 transition-colors ${
                          active ? "fill-[#800020] text-[#800020]" : "text-neutral-200 hover:text-[#f3cfd9]"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs font-semibold text-neutral-600">
                {rating === 5
                  ? "5 of 5 stars — Excellent"
                  : rating === 4
                  ? "4 of 5 stars — Very good"
                  : rating === 3
                  ? "3 of 5 stars — Average"
                  : rating === 2
                  ? "2 of 5 stars — Poor"
                  : rating === 1
                  ? "1 of 5 stars — Terrible"
                  : ""}
              </p>
            </div>

            {/* Standout tags */}
            <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-xs">
              <p className="mb-1 font-[family-name:var(--font-kualine)] font-extrabold text-base sm:text-lg text-[#2b000a]">
                What stood out?
              </p>
              <p className="mb-3 text-xs text-neutral-500">Select all that apply to your stay</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(({ value, label, icon: tagIcon }) => {
                  const on = tags.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleTag(value)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        on
                          ? "border-[#800020] bg-[#fbf0f3] text-[#800020] ring-1 ring-[#f3cfd9]"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-[#f3cfd9] hover:bg-[#fbf0f3]/30"
                      }`}
                    >
                      <Icon icon={tagIcon} className="h-4 w-4" />
                      {label}
                      {on && (
                        <span className="flex size-4 items-center justify-center rounded-full bg-[#800020] text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Public review text */}
            <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-xs">
              <label htmlFor="comment" className="font-[family-name:var(--font-kualine)] font-extrabold text-base sm:text-lg text-[#2b000a] block">
                Write your review
              </label>
              <p className="mt-0.5 text-xs text-neutral-500">
                Tell future travelers about the check-in, cleanliness, amenities, and neighborhood.
              </p>
              <div className="relative mt-3">
                <Textarea
                  id="comment"
                  value={comment}
                  maxLength={MAX}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="The property was in a great location, very clean, and the host was welcoming..."
                  className="rounded-2xl border-neutral-200 focus:border-[#800020] focus:ring-[#f3cfd9]"
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-neutral-400">
                  {comment.length}/{MAX}
                </span>
              </div>
            </div>

            {/* Private feedback */}
            <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-xs">
              <label htmlFor="private" className="font-[family-name:var(--font-kualine)] font-extrabold text-base sm:text-lg text-[#2b000a] block">
                Private feedback to Beddn <span className="font-normal font-sans text-xs sm:text-sm text-neutral-500">(optional)</span>
              </label>
              <p className="mt-0.5 text-xs text-neutral-500">
                Any private notes about your host or stay that won&apos;t appear publicly.
              </p>
              <div className="relative mt-3">
                <Textarea
                  id="private"
                  value={privateNote}
                  maxLength={MAX}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  rows={2}
                  placeholder="Share any direct feedback with Beddn admins..."
                  className="rounded-2xl border-neutral-200 focus:border-[#800020] focus:ring-[#f3cfd9]"
                />
              </div>
            </div>

            {/* Would you recommend */}
            <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-xs">
              <p className="mb-3 font-[family-name:var(--font-kualine)] font-extrabold text-base sm:text-lg text-[#2b000a]">
                Would you recommend this place?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecommend(true)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-bold transition ${
                    recommend === true
                      ? "border-[#800020] bg-[#800020] text-white shadow-xs"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-[#f3cfd9] hover:bg-[#fbf0f3]/40"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" /> Yes, recommend
                </button>
                <button
                  type="button"
                  onClick={() => setRecommend(false)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-bold transition ${
                    recommend === false
                      ? "border-[#800020] bg-[#800020] text-white shadow-xs"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-[#f3cfd9] hover:bg-[#fbf0f3]/40"
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" /> No
                </button>
              </div>
            </div>

            {status?.type === "error" && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 font-medium">{status.message}</p>
            )}

            <div className="pt-2 pb-12 sm:pb-4">
              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-full bg-[#800020] py-3 text-base font-bold text-white shadow-md hover:bg-neutral-900 focus-visible:ring-2 focus-visible:ring-[#f3cfd9] transition"
              >
                {submitting ? "Submitting review…" : "Submit Review"}
              </Button>
            </div>
          </form>
        )}
      </main>
    );
  }

  // TRIPADVISOR-INSPIRED REVIEW HUB LANDING PAGE
  return (
    <div className="min-h-screen bg-[#faf8f7] pb-36 sm:pb-28">
      {/* Hero: "Write a review, make someone's trip" */}
      <section className="border-b border-[#f3cfd9]/80 bg-gradient-to-b from-[#fbf0f3]/70 via-[#fdf5f7]/50 to-[#faf8f7] py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h1 className="font-[family-name:var(--font-kualine)] font-extrabold text-3xl sm:text-5xl lg:text-6xl text-[#2b000a] tracking-tight">
            Write a review, make someone&apos;s stay
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-neutral-600 leading-relaxed">
            Stories like yours are what helps travelers have better trips. Share your experience and help out a fellow
            traveler!
          </p>

          {/* Search Pill: "What would you like to review?" */}
          <div className="relative mx-auto mt-8 max-w-2xl">
            <div className="flex h-14 w-full items-center gap-3 rounded-full border border-[#f3cfd9] bg-white px-5 shadow-md shadow-[#800020]/5 transition focus-within:border-[#800020] focus-within:ring-2 focus-within:ring-[#f3cfd9]">
              <Search className="h-5 w-5 text-neutral-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What would you like to review?"
                className="w-full bg-transparent text-sm sm:text-base font-medium text-neutral-900 placeholder:text-neutral-500 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="rounded-full p-1 text-neutral-400 hover:text-black"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Dropdown Results */}
            {searchFocused && (
              <div
                ref={searchDropdownRef}
                className="absolute inset-x-0 top-16 z-50 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-xl text-left"
              >
                {searchLoading ? (
                  <div className="p-6 text-center text-xs font-semibold text-neutral-500">Searching places…</div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
                    {searchResults.map((listing) => (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => {
                          setChosenSlug(listing.slug);
                          setSearchFocused(false);
                        }}
                        className="flex w-full items-center gap-3 p-3.5 hover:bg-[#fbf0f3] transition text-left"
                      >
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 overflow-hidden">
                          {listing.listing_images?.[0]?.url ? (
                            <Image
                              src={listing.listing_images[0].url}
                              alt=""
                              width={44}
                              height={44}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#181113]">{listing.title || listing.name}</p>
                          <p className="text-xs text-neutral-500">
                            {listing.area ? `${listing.area}, ` : ""}
                            {listing.city || "East Africa"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-[#800020]">Review →</span>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="p-6 text-center text-xs text-neutral-500">
                    No matching listings found. Try searching by city name (e.g., Nairobi, Arusha, Diani).
                  </div>
                ) : myStays.length > 0 ? (
                  <div className="p-3">
                    <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Your Recent Stays
                    </p>
                    <div className="divide-y divide-neutral-100">
                      {myStays.map((stay) => (
                        <button
                          key={stay.slug}
                          type="button"
                          onClick={() => {
                            setChosenSlug(stay.slug);
                            setSearchFocused(false);
                          }}
                          className="flex w-full items-center justify-between p-3 rounded-2xl hover:bg-[#fbf0f3] transition text-left"
                        >
                          <span className="text-sm font-semibold text-[#181113] truncate">{stay.name}</span>
                          <span className="text-xs font-bold text-[#800020]">Write review →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-5 text-center text-xs text-neutral-500">
                    Type a listing name or city to select a place to review.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Review Category Cards */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => {
                setSearchQuery("Nairobi");
                searchInputRef.current?.focus();
              }}
              className="group flex flex-col items-center justify-center rounded-3xl border border-[#f3cfd9]/80 bg-white p-5 sm:p-6 shadow-xs hover:border-[#800020] hover:shadow-md transition text-center"
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]/50 group-hover:scale-105 transition-transform">
                <Icon icon="solar:bed-bold-duotone" className="h-6 w-6" />
              </div>
              <p className="text-sm sm:text-base font-bold text-[#181113]">Overnight Stays</p>
              <p className="mt-1 text-xs text-neutral-500">Apartments, villas, and boutique homes</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("Hourly");
                searchInputRef.current?.focus();
              }}
              className="group flex flex-col items-center justify-center rounded-3xl border border-[#f3cfd9]/80 bg-white p-5 sm:p-6 shadow-xs hover:border-[#800020] hover:shadow-md transition text-center"
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]/50 group-hover:scale-105 transition-transform">
                <Icon icon="solar:clock-circle-bold-duotone" className="h-6 w-6" />
              </div>
              <p className="text-sm sm:text-base font-bold text-[#181113]">Hourly Spaces</p>
              <p className="mt-1 text-xs text-neutral-500">Workspaces, day use, and short stays</p>
            </button>
          </div>
        </div>
      </section>

      {/* Main Body: TripAdvisor Two-Column Split */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pb-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Left Column: Your Reviews & Trust standard */}
          <div>
            <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="font-[family-name:var(--font-kualine)] font-extrabold text-2xl sm:text-3xl text-[#2b000a]">
                Your reviews
              </h2>

              {!user ? (
                <div className="mt-4 rounded-2xl border border-neutral-100 bg-[#fcfbfa] p-6 text-center">
                  <p className="text-sm text-neutral-600">
                    Sign in to see your past stays and manage your reviews.
                  </p>
                  <div className="mt-4">
                    <AuthDialog>
                      <Button className="h-10 rounded-full bg-[#800020] px-6 text-xs font-bold text-white hover:bg-neutral-900 focus-visible:ring-2 focus-visible:ring-[#f3cfd9] transition">
                        Sign in
                      </Button>
                    </AuthDialog>
                  </div>
                </div>
              ) : myStays.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-xs font-semibold text-neutral-500">
                    You have recent stays ready for your review:
                  </p>
                  <div className="divide-y divide-neutral-100">
                    {myStays.map((stay) => (
                      <div key={stay.slug} className="flex items-center justify-between py-3.5">
                        <div>
                          <p className="text-sm font-bold text-[#181113]">{stay.name}</p>
                          <p className="text-xs text-neutral-500">Verified booking on Beddn</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setChosenSlug(stay.slug)}
                          className="h-8 rounded-full bg-[#800020] text-xs font-bold text-white hover:bg-neutral-900 focus-visible:ring-2 focus-visible:ring-[#f3cfd9]"
                        >
                          Write review
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-neutral-100 bg-[#fcfbfa] p-6 text-neutral-500 text-sm">
                  You have no reviews yet. After you write some reviews, they will appear here.
                </div>
              )}
            </div>

            {/* Why Beddn Reviews Matter (Trust cards) with clean Iconify icons */}
            <div className="mt-8 rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-8 shadow-xs">
              <h3 className="font-[family-name:var(--font-kualine)] font-extrabold text-xl sm:text-2xl text-[#2b000a]">
                How Beddn reviews work
              </h3>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                <div className="flex flex-col items-start">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]/50">
                    <Icon icon="solar:shield-check-bold-duotone" className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-[#181113]">100% Verified</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Reviews come exclusively from travelers who stayed through Beddn.
                  </p>
                </div>

                <div className="flex flex-col items-start">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]/50">
                    <Icon icon="solar:chat-round-line-bold-duotone" className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-[#181113]">Unedited Feedback</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Hosts cannot edit or delete ratings. Honest experiences help all guests.
                  </p>
                </div>

                <div className="flex flex-col items-start">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]/50">
                    <Icon icon="solar:heart-handshake-bold-duotone" className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-[#181113]">Community Support</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Your tips support local hosts and guide future travelers across East Africa.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: TripAdvisor Promo & Missing Place Cards */}
          <div className="space-y-6">
            {/* Interactive Impact Promo Card */}
            <div
              onClick={() => setImpactOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setImpactOpen(true)}
              className="group cursor-pointer overflow-hidden rounded-3xl border border-[#f3cfd9]/80 bg-white shadow-xs hover:border-[#800020]/60 hover:shadow-md transition text-left"
            >
              <div className="relative h-44 w-full bg-neutral-800">
                <Image
                  src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=800&auto=format&fit=crop"
                  alt="Beddn travel community"
                  fill
                  className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-300">
                    <Icon icon="solar:stars-line-bold-duotone" className="h-3.5 w-3.5" />
                    Community Impact
                  </span>
                  <p className="text-base font-bold leading-snug mt-0.5">
                    See how your reviews help travelers and business owners
                  </p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs leading-relaxed text-neutral-600">
                  Every candid review gives hosts actionable feedback to elevate their stays and gives fellow guests the
                  confidence to book.
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#800020] group-hover:underline">
                    View community impact & story →
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-full bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]/50">
                    <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </div>

            {/* Is Beddn missing a place? Card */}
            <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-xs text-center">
              <h4 className="font-bold text-sm text-[#181113]">Are you a host?</h4>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                List your space or hourly stay on Beddn and start welcoming verified guests today.
              </p>
              <Link
                href={ROUTES.newListing}
                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full border border-[#f3cfd9] bg-[#fbf0f3] text-xs font-bold text-[#800020] hover:bg-[#f3d9e2] transition"
              >
                Add your place
              </Link>
            </div>
          </div>
        </div>

        {/* Community Testimonials Wall - Only shown when real reviews exist */}
        {communityReviews.length > 0 && (
          <section className="mt-16 border-t border-[#f3cfd9]/80 pt-12">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <span className="inline-block rounded-full bg-[#fbf0f3] border border-[#f3cfd9] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#800020]">
                  Community Stories
                </span>
                <h2 className="mt-2 font-[family-name:var(--font-kualine)] font-extrabold text-2xl sm:text-3xl text-[#2b000a]">
                  Recent reviews from travelers
                </h2>
              </div>
              <p className="text-xs text-neutral-500">Unfiltered ratings from verified stays</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {communityReviews.map((rev) => {
                const reviewerName = rev.profile?.full_name || "Verified Traveler";
                const initials = reviewerName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const stayTitle = rev.listing?.title || rev.listing?.name || "Beddn Stay";
                const stayLocation = rev.listing?.area
                  ? `${rev.listing.area}, ${rev.listing.city || ""}`
                  : rev.listing?.city || "East Africa";

                return (
                  <div
                    key={rev.id}
                    className="flex flex-col justify-between rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 shadow-2xs hover:border-[#800020]/40 hover:shadow-sm transition"
                  >
                    <div>
                      {/* Review Header: User & Rating */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-[#fbf0f3] text-xs font-bold text-[#800020] border border-[#f3cfd9]/50">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#181113]">{reviewerName}</p>
                            <div className="flex items-center gap-1 text-[10px] text-[#128c4b] font-semibold">
                              <ShieldCheck className="h-3 w-3" />
                              Verified Stay
                            </div>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < (rev.rating || 5) ? "fill-[#800020] text-[#800020]" : "text-neutral-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Review Quote */}
                      <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-neutral-700 italic">
                        &ldquo;{rev.comment || "Great experience, very clean and friendly host. Highly recommended!"}&rdquo;
                      </p>

                      {/* Tags */}
                      {rev.tags && rev.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {rev.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600"
                            >
                              <Sparkles className="h-2.5 w-2.5 text-[#800020]" />
                              {t.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stay Link */}
                    {rev.listing?.slug && (
                      <div className="mt-5 border-t border-neutral-100 pt-3">
                        <Link
                          href={`/property/${rev.listing.slug}`}
                          className="group flex items-center justify-between gap-2 text-xs font-semibold text-neutral-600 hover:text-[#800020] transition"
                        >
                          <div className="truncate">
                            <p className="truncate font-bold text-[#181113] group-hover:text-[#800020] transition">
                              {stayTitle}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate">{stayLocation}</p>
                          </div>
                          <span className="shrink-0 text-xs font-bold text-[#800020]">View stay →</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Community Impact Modal Dialog */}
      <Dialog open={impactOpen} onOpenChange={setImpactOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 bg-white text-left">
          <DialogHeader>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] mb-2">
              <Icon icon="solar:users-group-rounded-bold-duotone" className="h-6 w-6" />
            </div>
            <DialogTitle className="font-brand text-2xl text-[#181113]">
              Community Impact at Beddn
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              How authentic reviews elevate hospitality across East Africa
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3.5">
            <div className="flex gap-3.5 rounded-2xl border border-neutral-100 bg-[#fcfbfa] p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Icon icon="solar:star-bold-duotone" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#181113]">100% Genuine, Verified Stays</p>
                <p className="mt-0.5 text-[11px] text-neutral-500 leading-relaxed">
                  Only travelers with confirmed bookings can post reviews. No paid endorsements or manipulated boosts.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 rounded-2xl border border-neutral-100 bg-[#fcfbfa] p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icon icon="solar:growth-bold-duotone" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#181113]">Supporting Local Entrepreneurs</p>
                <p className="mt-0.5 text-[11px] text-neutral-500 leading-relaxed">
                  High ratings directly boost host earnings and help local operators build sustainable hospitality businesses.
                </p>
              </div>
            </div>

            <div className="flex gap-3.5 rounded-2xl border border-neutral-100 bg-[#fcfbfa] p-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-[#800020]">
                <Icon icon="solar:chat-round-check-bold-duotone" className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#181113]">Actionable Feedback Loop</p>
                <p className="mt-0.5 text-[11px] text-neutral-500 leading-relaxed">
                  Your feedback helps hosts quickly upgrade amenities, Wi-Fi, and check-in smoothness for the next traveler.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                setImpactOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => searchInputRef.current?.focus(), 300);
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#800020] text-xs font-bold text-white hover:bg-neutral-800 transition"
            >
              Write a review now
            </button>
            <button
              type="button"
              onClick={() => setImpactOpen(false)}
              className="inline-flex h-9 w-full items-center justify-center rounded-full border border-neutral-200 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <ReviewInner />
      </Suspense>
    </>
  );
}
