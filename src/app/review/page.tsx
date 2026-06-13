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
import { Star, ShieldCheck, Sparkles } from "lucide-react";

function ReviewInner() {
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const listingParam = searchParams.get("listing") ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [listingName, setListingName] = useState<string>("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, [supabase]);

  // Show which place they're reviewing (host link carries ?listing=slug).
  useEffect(() => {
    if (!listingParam) return;
    fetch(`/api/public/listings?q=${encodeURIComponent(listingParam)}&limit=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { listings?: { name?: string; title?: string; slug?: string }[] } | null) => {
        const match = j?.listings?.find((l) => l.slug === listingParam) ?? j?.listings?.[0];
        if (match) setListingName(match.title || match.name || "");
      })
      .catch(() => {});
  }, [listingParam]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) {
      setStatus({ type: "error", message: "Tap a star to rate your stay." });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing: listingParam, rating, comment }),
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
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#f8eef2] text-[#800020]">
          <Star className="h-6 w-6" />
        </span>
        <h1 className="font-brand text-4xl text-[#2b000a]">Leave a review</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {listingName
            ? <>Share how your stay at <span className="font-semibold text-[#2b000a]">{listingName}</span> went.</>
            : "Share how your stay went to help future guests."}
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
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <h2 className="font-brand text-2xl text-[#2b000a]">Log in to review</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Reviews are tied to your Beddn account so hosts and guests can trust them.
          </p>
          <AuthDialog>
            <button className="mt-5 inline-flex h-11 items-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#600018]">
              Log in to continue
            </button>
          </AuthDialog>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-[#2b000a]">Your rating</p>
            <div className="mt-3 flex justify-center gap-1.5">
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
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-9 w-9 ${active ? "fill-[#800020] text-[#800020]" : "text-[#e3d3d9]"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="comment" className="text-sm font-semibold text-[#2b000a]">
              Tell guests more (optional)
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="What stood out? Cleanliness, location, the host…"
              className="mt-2 rounded-xl"
            />
          </div>

          {status?.type === "error" && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{status.message}</p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="mt-5 h-12 w-full rounded-full bg-[#800020] text-base font-bold hover:bg-[#600018]"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[#800020]" />
            Verified guests keep Beddn reviews trustworthy.
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
