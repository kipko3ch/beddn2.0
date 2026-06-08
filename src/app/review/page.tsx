"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/lib/routes";

const SCORE_FIELDS = [
  ["cleanliness", "Cleanliness"],
  ["accuracy", "Accuracy"],
  ["safety", "Safety / trust"],
  ["communication", "Host communication"],
] as const;

export default function ReviewPage() {
  const [bookingToken, setBookingToken] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [rating, setRating] = useState("5");
  const [scores, setScores] = useState<Record<string, string>>({
    cleanliness: "5",
    accuracy: "5",
    safety: "5",
    communication: "5",
  });
  const [comment, setComment] = useState("");
  const [wouldBookAgain, setWouldBookAgain] = useState(true);
  const [issueReported, setIssueReported] = useState(false);
  const [issueType, setIssueType] = useState("");
  const [isPublicReview, setIsPublicReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingToken,
        guestPhone,
        rating: Number(rating),
        cleanliness: Number(scores.cleanliness),
        accuracy: Number(scores.accuracy),
        safety: Number(scores.safety),
        communication: Number(scores.communication),
        comment,
        wouldBookAgain,
        issueReported,
        issueType: issueType || null,
        isPublicReview,
      }),
    });

    const result = (await response.json()) as { error?: string };
    setSubmitting(false);

    if (!response.ok) {
      setStatus({
        type: "error",
        message: result.error || "Could not submit this review yet.",
      });
      return;
    }

    setStatus({
      type: "success",
      message: "Thanks. Your review helps guests and keeps Beddn trustworthy.",
    });
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#2b000a]">Review a stay</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your booking code and phone number. Reviews unlock only after a completed booking.
          </p>
        </div>

        <form
          onSubmit={submitReview}
          className="grid gap-6 rounded-3xl border bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_300px] lg:p-7"
        >
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="bookingToken">Booking code</Label>
                <Input
                  id="bookingToken"
                  value={bookingToken}
                  onChange={(event) => setBookingToken(event.target.value.toUpperCase())}
                  placeholder="BEDDN-8F3K2L"
                  className="mt-1 h-11"
                  required
                />
              </div>
              <div>
                <Label htmlFor="guestPhone">Phone used to book</Label>
                <Input
                  id="guestPhone"
                  type="tel"
                  value={guestPhone}
                  onChange={(event) => setGuestPhone(event.target.value)}
                  placeholder="+254..."
                  className="mt-1 h-11"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rating">Overall rating</Label>
              <select
                id="rating"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                className="mt-1 h-11 w-full rounded-md border px-3"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} out of 5
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {SCORE_FIELDS.map(([key, label]) => (
                <label key={key} className="text-sm font-medium">
                  {label}
                  <select
                    value={scores[key]}
                    onChange={(event) =>
                      setScores((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className="mt-1 h-10 w-full rounded-md border px-3"
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <div>
              <Label htmlFor="comment">Comment</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="What should future guests or Beddn know?"
                className="mt-1 min-h-28"
              />
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl bg-[#fbf7f8] p-4 text-sm">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={wouldBookAgain}
                onChange={(event) => setWouldBookAgain(event.target.checked)}
                className="mt-1 size-4 accent-[#800020]"
              />
              <span>Would book again</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isPublicReview}
                onChange={(event) => setIsPublicReview(event.target.checked)}
                className="mt-1 size-4 accent-[#800020]"
              />
              <span>Make this a public review if eligible</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={issueReported}
                onChange={(event) => setIssueReported(event.target.checked)}
                className="mt-1 size-4 accent-[#800020]"
              />
              <span>Report an issue</span>
            </label>
            {issueReported && (
              <Input
                value={issueType}
                onChange={(event) => setIssueType(event.target.value)}
                placeholder="Refund, location mismatch, safety..."
              />
            )}

            {status && (
              <div
                className={`rounded-xl p-3 ${
                  status.type === "success" ? "bg-white text-[#800020]" : "bg-red-50 text-red-700"
                }`}
              >
                {status.message}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
            >
              {submitting ? "Sending..." : "Submit review"}
            </Button>
            <Link href={ROUTES.home} className="block text-center font-semibold text-[#2b000a] underline">
              Back to Beddn
            </Link>
          </aside>
        </form>
      </main>
    </>
  );
}
