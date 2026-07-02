"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/header";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import type { User } from "@supabase/supabase-js";
import {
  Camera,
  Check,
  KeyRound,
  MapPin,
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

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

  // Reached /review without a listing (e.g. the header "Review" link)? Offer the
  // guest the stays they can review — the listings they've inquired about.
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
          // Skip the guest's own listings — hosts can't review their own place.
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-5">
        <h1 className="font-brand text-4xl text-[#2b000a]">How was your stay?</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your review helps other guests choose trusted places on Beddn.
          {listingName ? <> You&apos;re reviewing <span className="font-semibold text-[#2b000a]">{listingName}</span>.</> : null}
        </p>
      </div>

      {status?.type === "success" ? (
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-[#e9f9f0] text-[#128c4b]">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h2 className="font-brand text-2xl text-[#2b000a]">Review submitted</h2>
          <p className="mt-2 text-sm text-muted-foreground">{status.message}</p>
          <Link
            href={ROUTES.home}
            className="mt-6 inline-flex h-11 items-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#600018]"
          >
            Back to Beddn
          </Link>
        </div>
      ) : !user ? (
        <div className="rounded-3xl border bg-white shadow-sm">
          <EmptyState
            image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029375/empty-reviews_t8xgis.png"
            title="Log in to review"
            subtitle="Reviews are tied to your Beddn account so hosts and guests can trust them."
          >
            <AuthDialog>
              <button className="inline-flex h-11 items-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#600018]">
                Log in to continue
              </button>
            </AuthDialog>
          </EmptyState>
        </div>
      ) : !activeListing ? (
        <div className="rounded-3xl border bg-white shadow-sm">
          {myStays.length === 0 ? (
            <EmptyState
              image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029375/empty-reviews_t8xgis.png"
              title="Which stay are you reviewing?"
              subtitle="You don't have any stays to review yet. After you inquire about a place on Beddn, it'll show up here so you can leave a review."
            />
          ) : (
            <div className="p-8">
              <h2 className="font-brand text-2xl text-[#2b000a]">Which stay are you reviewing?</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Pick the place you stayed at to leave your review.
              </p>
              <div className="mt-4 space-y-2">
                {myStays.map((stay) => (
                  <button
                    key={stay.slug}
                    type="button"
                    onClick={() => setChosenSlug(stay.slug)}
                    className="flex w-full items-center justify-between rounded-2xl border border-[#e3d3d9] bg-white px-4 py-3 text-left text-sm font-semibold text-[#2b000a] hover:border-[#800020] hover:bg-[#fbf0f3]"
                  >
                    {stay.name}
                    <Star className="h-4 w-4 text-[#800020]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-6">
          {/* Stars */}
          <div className="flex justify-center rounded-3xl border bg-white py-6 shadow-sm">
            <div className="flex gap-2">
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
                    className="transition-transform hover:scale-110"
                  >
                    <Star className={`h-9 w-9 ${active ? "fill-[#800020] text-[#800020]" : "text-[#e3d3d9]"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="mb-3 text-sm font-bold text-[#2b000a]">What stood out?</p>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(({ value, label, icon: Icon }) => {
                const on = tags.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleTag(value)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      on ? "border-[#800020] bg-[#fbf0f3] text-[#800020]" : "border-[#e3d3d9] bg-white text-[#2b000a]"
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
          <div>
            <label htmlFor="comment" className="text-sm font-bold text-[#2b000a]">Write your review</label>
            <div className="relative mt-2">
              <Textarea
                id="comment"
                value={comment}
                maxLength={MAX}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Share details about your stay—what you loved, what could be better, and any tips for future guests."
                className="rounded-2xl"
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">
                {comment.length}/{MAX}
              </span>
            </div>
          </div>

          {/* Private feedback */}
          <div>
            <label htmlFor="private" className="text-sm font-bold text-[#2b000a]">
              Private feedback to Beddn <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <div className="relative mt-2">
              <Textarea
                id="private"
                value={privateNote}
                maxLength={MAX}
                onChange={(e) => setPrivateNote(e.target.value)}
                rows={3}
                placeholder="Share any private feedback with Beddn. This will not be visible to the host."
                className="rounded-2xl"
              />
              <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">
                {privateNote.length}/{MAX}
              </span>
            </div>
          </div>

          {/* Recommend */}
          <div>
            <p className="mb-3 text-sm font-bold text-[#2b000a]">Would you recommend this place?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRecommend(true)}
                className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold ${
                  recommend === true ? "border-[#800020] bg-[#800020] text-white" : "border-[#e3d3d9] bg-white text-[#2b000a]"
                }`}
              >
                <ThumbsUp className="h-4 w-4" /> Yes
              </button>
              <button
                type="button"
                onClick={() => setRecommend(false)}
                className={`flex h-12 items-center justify-center gap-2 rounded-full border text-sm font-semibold ${
                  recommend === false ? "border-[#800020] bg-[#800020] text-white" : "border-[#e3d3d9] bg-white text-[#2b000a]"
                }`}
              >
                <ThumbsDown className="h-4 w-4" /> No
              </button>
            </div>
          </div>

          {status?.type === "error" && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{status.message}</p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="h-13 w-full rounded-full bg-[#800020] py-3.5 text-base font-bold hover:bg-[#600018]"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Only guests who connected with the host through Beddn can review. Reviews may appear after moderation.
          </p>
        </form>
      )}
    </main>
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
