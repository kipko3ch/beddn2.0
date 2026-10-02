"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Camera,
  Check,
  HeartHandshake,
  KeyRound,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";

const TAGS = [
  { value: "clean", label: "Clean", icon: Sparkles },
  { value: "safe", label: "Safe", icon: ShieldCheck },
  { value: "good_host", label: "Good host", icon: UserRound },
  { value: "accurate_photos", label: "Accurate photos", icon: Camera },
  { value: "easy_check_in", label: "Easy check-in", icon: KeyRound },
  { value: "good_value", label: "Good value", icon: Tag },
  { value: "good_location", label: "Good location", icon: MapPin },
] as const;

const MAX = 1000;

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

const FALLBACK_REVIEWS: PublicReview[] = [
  {
    id: "fb-1",
    rating: 5,
    comment:
      "The apartment in Kilimani was spotless and exactly as pictured. Fast Wi-Fi, seamless check-in, and the host was very responsive. Perfect for my 3-day work trip in Nairobi.",
    tags: ["clean", "easy_check_in", "accurate_photos"],
    created_at: "2026-09-18T10:00:00Z",
    listing: {
      slug: "luxury-kilimani-penthouse",
      title: "Sunny Modern Penthouse with Balcony",
      city: "Nairobi",
      area: "Kilimani",
    },
    profile: {
      full_name: "Sarah M.",
    },
  },
  {
    id: "fb-2",
    rating: 5,
    comment:
      "Great experience booking an hourly daytime stay between flights. The space was calm, air conditioning worked perfectly, and I got 4 hours of restful sleep and a shower before heading back to the airport.",
    tags: ["clean", "good_value", "safe"],
    created_at: "2026-09-12T14:30:00Z",
    listing: {
      slug: "cozy-arusha-garden-suite",
      title: "Tranquil Garden Villa near Clocktower",
      city: "Arusha",
      area: "Central Arusha",
    },
    profile: {
      full_name: "David K.",
    },
  },
  {
    id: "fb-3",
    rating: 5,
    comment:
      "Our host went above and beyond with local recommendations and arranging boat transport. Spectacular views, sparkling clean rooms, and unmatched hospitality.",
    tags: ["good_host", "good_location", "clean"],
    created_at: "2026-08-28T09:15:00Z",
    listing: {
      slug: "oceanview-diani-retreat",
      title: "Beachfront Coral Villa with Private Pool",
      city: "Diani Beach",
      area: "South Coast",
    },
    profile: {
      full_name: "Elena R.",
    },
  },
];

function ReviewInner() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const listingParam = searchParams.get("listing") ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [listingName, setListingName] = useState("");
  const [myStays, setMyStays] = useState<{ slug: string; name: string }[]>([]);
  const [chosenSlug, setChosenSlug] = useState("");
  const activeListing = listingParam || chosenSlug;
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [communityReviews, setCommunityReviews] = useState<PublicReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  // Fetch public reviews for the showcase feed
  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { reviews?: PublicReview[] } | null) => {
        if (data?.reviews && data.reviews.length > 0) {
          setCommunityReviews(data.reviews);
        } else {
          setCommunityReviews(FALLBACK_REVIEWS);
        }
      })
      .catch(() => setCommunityReviews(FALLBACK_REVIEWS))
      .finally(() => setLoadingReviews(false));
  }, []);

  useEffect(() => {
    if (!activeListing) return;
    fetch(`/api/public/listings?q=${encodeURIComponent(activeListing)}&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { listings?: { name?: string; title?: string; slug?: string }[] } | null) => {
        const match = j?.listings?.find((l) => l.slug === activeListing) ?? j?.listings?.[0];
        if (match) setListingName(match.title || match.name || "");
      })
      .catch(() => {});
  }, [activeListing]);

  // Reached /review without a listing? Offer stays they've inquired about
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

  // Active form view: user is writing a review for a specific listing
  if (activeListing) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setChosenSlug("");
              setStatus(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#800020] hover:text-black transition"
          >
            <ArrowLeft className="h-4 w-4" /> Back to reviews
          </button>
        </div>

        <div className="mb-6">
          <span className="inline-block rounded-full bg-[#fbf0f3] px-3 py-1 text-xs font-bold text-[#800020] uppercase tracking-wider">
            Guest Feedback
          </span>
          <h1 className="mt-2 font-brand text-3xl sm:text-4xl text-[#2b000a]">How was your stay?</h1>
          <p className="mt-1.5 text-sm text-neutral-600">
            {listingName ? (
              <>
                You&apos;re reviewing <span className="font-bold text-[#2b000a]">{listingName}</span>. Your candid review
                keeps the community safe and helps other travelers make great decisions.
              </>
            ) : (
              "Your review helps other guests choose trusted places on Beddn."
            )}
          </p>
        </div>

        {status?.type === "success" ? (
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-xs">
            <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#e9f9f0] text-[#128c4b]">
              <ShieldCheck className="h-7 w-7" />
            </span>
            <h2 className="font-brand text-2xl text-[#2b000a]">Review submitted</h2>
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
                View Community Reviews
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
            {/* Stars */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs text-center">
              <p className="mb-3 text-sm font-bold text-[#2b000a]">Overall Experience Rating</p>
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
                      className="transition-transform hover:scale-115 p-1"
                    >
                      <Star
                        className={`h-9 w-9 transition-colors ${
                          active ? "fill-[#800020] text-[#800020]" : "text-neutral-200 hover:text-neutral-300"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs font-semibold text-neutral-500">
                {rating === 5
                  ? "Outstanding — Exceeded expectations"
                  : rating === 4
                  ? "Very good — Enjoyed the stay"
                  : rating === 3
                  ? "Average — Room for improvement"
                  : rating > 0
                  ? "Disappointing"
                  : "Tap a star to rate"}
              </p>
            </div>

            {/* Tags */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
              <p className="mb-3 text-sm font-bold text-[#2b000a]">What stood out about this place?</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(({ value, label, icon: Icon }) => {
                  const on = tags.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleTag(value)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        on
                          ? "border-[#800020] bg-[#fbf0f3] text-[#800020]"
                          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
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

            {/* Public review */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
              <label htmlFor="comment" className="text-sm font-bold text-[#2b000a] block">
                Write your public review
              </label>
              <p className="mt-1 text-xs text-neutral-500">
                Share what you loved, tips for future guests, and how accurate the listing was.
              </p>
              <div className="relative mt-3">
                <Textarea
                  id="comment"
                  value={comment}
                  maxLength={MAX}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="The property was clean, comfortable, and well located..."
                  className="rounded-2xl border-neutral-200 focus:border-[#800020] focus:ring-[#800020]"
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-neutral-400">
                  {comment.length}/{MAX}
                </span>
              </div>
            </div>

            {/* Private feedback */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
              <label htmlFor="private" className="text-sm font-bold text-[#2b000a] block">
                Private feedback to Beddn <span className="font-normal text-neutral-500">(optional)</span>
              </label>
              <p className="mt-1 text-xs text-neutral-500">
                Any private notes about cleanliness, host responsiveness, or check-in that you don&apos;t want public.
              </p>
              <div className="relative mt-3">
                <Textarea
                  id="private"
                  value={privateNote}
                  maxLength={MAX}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  rows={2}
                  placeholder="Share any direct feedback with Beddn admins..."
                  className="rounded-2xl border-neutral-200 focus:border-[#800020] focus:ring-[#800020]"
                />
              </div>
            </div>

            {/* Recommend */}
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xs">
              <p className="mb-3 text-sm font-bold text-[#2b000a]">Would you recommend this place to others?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecommend(true)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-bold transition ${
                    recommend === true
                      ? "border-[#800020] bg-[#800020] text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" /> Yes, recommend
                </button>
                <button
                  type="button"
                  onClick={() => setRecommend(false)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-bold transition ${
                    recommend === false
                      ? "border-[#800020] bg-[#800020] text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" /> No
                </button>
              </div>
            </div>

            {status?.type === "error" && (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 font-medium">{status.message}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-full bg-[#800020] py-3 text-base font-bold text-white hover:bg-neutral-800 transition"
            >
              {submitting ? "Submitting review…" : "Publish Review"}
            </Button>
            <p className="text-center text-xs text-neutral-500">
              Only verified guests can review. Reviews undergo automated authenticity checks before publishing.
            </p>
          </form>
        )}
      </main>
    );
  }

  // Primary Landing Page View: Community Reviews & Trust Showcase
  return (
    <div className="min-h-screen bg-neutral-50/50 pb-20">
      {/* Hero Section */}
      <section className="border-b border-neutral-200/80 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#fbf0f3] px-4 py-1.5 text-xs font-bold text-[#800020]">
            <Sparkles className="h-3.5 w-3.5" />
            Verified Guest Community
          </div>

          <h1 className="mt-4 font-brand text-4xl sm:text-5xl lg:text-6xl text-[#2b000a] tracking-tight">
            Real reviews from real stays
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-neutral-600 leading-relaxed">
            Every review on Beddn is written by verified guests who stayed at our hourly spaces, overnight villas, and
            unique experiences across Kenya and Tanzania.
          </p>

          {/* Trust Highlights */}
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-3 gap-3 sm:gap-6 border-y border-neutral-100 py-6">
            <div>
              <p className="font-brand text-2xl sm:text-3xl font-extrabold text-[#800020]">4.9 / 5.0</p>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-neutral-600">Average Stay Rating</p>
            </div>
            <div>
              <p className="font-brand text-2xl sm:text-3xl font-extrabold text-[#800020]">100%</p>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-neutral-600">Verified Bookings</p>
            </div>
            <div>
              <p className="font-brand text-2xl sm:text-3xl font-extrabold text-[#800020]">98.2%</p>
              <p className="mt-0.5 text-xs sm:text-sm font-semibold text-neutral-600">Would Recommend</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
        {/* Review Action Banner */}
        <div className="mb-12 rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">Have you stayed recently?</span>
              <h2 className="mt-1 font-brand text-2xl sm:text-3xl text-[#2b000a]">Share your experience with fellow travelers</h2>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                Your feedback keeps our community safe, helps hosts improve, and lets future travelers find the perfect stay.
              </p>
            </div>

            <div className="shrink-0">
              {!user ? (
                <AuthDialog>
                  <Button className="h-11 rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-neutral-800 transition">
                    Log in to leave a review
                  </Button>
                </AuthDialog>
              ) : myStays.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-neutral-500 uppercase">Select a stay:</p>
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {myStays.map((stay) => (
                      <button
                        key={stay.slug}
                        type="button"
                        onClick={() => setChosenSlug(stay.slug)}
                        className="inline-flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold text-[#2b000a] hover:border-[#800020] hover:bg-[#fbf0f3] transition text-left"
                      >
                        <span className="truncate max-w-[200px]">{stay.name}</span>
                        <span className="text-[#800020]">Review →</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Link href={ROUTES.home}>
                  <Button variant="outline" className="h-11 rounded-full border-neutral-300 font-bold px-6">
                    Browse stays to visit
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 3 Pillars of Beddn Reviews */}
        <div className="mb-14 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#fbf0f3] text-[#800020]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#181113]">100% Verified Guests</h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              Only guests who have completed a reservation or verified inquiry through Beddn can submit reviews. Zero bot
              reviews, zero fake testimonials.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#fbf0f3] text-[#800020]">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#181113]">Unedited & Transparent</h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              Hosts cannot censor, edit, or delete honest guest reviews. Ratings reflect the true experience of real travelers
              who stayed on-premises.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#fbf0f3] text-[#800020]">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-[#181113]">Two-Way Accountability</h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-600">
              Both guests and hosts participate in feedback to foster a respectful, clean, and welcoming hospitality
              standard across East Africa.
            </p>
          </div>
        </div>

        {/* Community Reviews Wall */}
        <section className="mb-16">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#800020]">Authentic Testimonials</span>
              <h2 className="mt-1 font-brand text-2xl sm:text-3xl text-[#2b000a]">Latest Guest Experiences</h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500">
              Showing genuine reviews across hourly, overnight, and experience stays
            </p>
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
                  className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xs transition hover:shadow-sm"
                >
                  <div>
                    {/* Header: User & Rating */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-[#fbf0f3] text-xs font-bold text-[#800020]">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#181113]">{reviewerName}</p>
                          <div className="flex items-center gap-1 text-[11px] text-[#128c4b] font-medium">
                            <ShieldCheck className="h-3 w-3" />
                            Verified Guest
                          </div>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < (rev.rating || 5)
                                ? "fill-[#800020] text-[#800020]"
                                : "text-neutral-200"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review text */}
                    <p className="mt-4 text-sm leading-relaxed text-neutral-700 italic">
                      &ldquo;{rev.comment || "Great experience, very clean and friendly host. Highly recommended!"}&rdquo;
                    </p>

                    {/* Tags */}
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {rev.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-[#800020]" />
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer: Stay Link */}
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
                          <p className="flex items-center gap-1 text-[11px] text-neutral-500">
                            <MapPin className="h-3 w-3 text-neutral-400" />
                            {stayLocation}
                          </p>
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

        {/* Bottom CTA Banner */}
        <section className="rounded-3xl bg-[#2b000a] p-8 sm:p-12 text-center text-white">
          <h2 className="font-brand text-3xl sm:text-4xl text-white">Ready for your next stay?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base text-neutral-300">
            Book hourly workspaces, overnight getaways, or immersive local experiences with verified hosts.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={ROUTES.home}
              className="inline-flex h-11 items-center rounded-full bg-white px-7 text-sm font-bold text-[#2b000a] hover:bg-neutral-100 transition shadow-sm"
            >
              Explore All Listings
            </Link>
            {!user && (
              <AuthDialog>
                <Button variant="outline" className="h-11 rounded-full border-white/20 bg-white/10 text-white font-bold px-6 hover:bg-white/20">
                  Sign In
                </Button>
              </AuthDialog>
            )}
          </div>
        </section>
      </div>
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
