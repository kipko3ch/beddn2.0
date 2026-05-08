"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  MapPin,
  Phone,
} from "lucide-react";

interface BookingData {
  id: string;
  token: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string | null;
  start_time: string | null;
  duration_hours: number | null;
  guests: number;
  note: string | null;
  category: string;
  status: string;
  total_amount: number;
  created_at: string;
  listing: {
    id: string;
    name: string;
    slug: string;
    city: string;
    area: string;
    country: string;
    latitude: number;
    longitude: number;
    private_address: string | null;
    check_in_instructions?: string | null;
    listing_images: { url: string; position: number }[];
  };
  host_phone: string | null;
  host_name: string;
}

export default function BookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const supabase = createClient();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState("5");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("get_booking_by_token", {
        booking_token: token,
      });
      setBooking(data as BookingData);
      setLoading(false);
    }
    load();
  }, [token]);

  function copyToken() {
    navigator.clipboard.writeText(booking?.token ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openWhatsApp() {
    if (!booking?.host_phone) return;
    const msg = encodeURIComponent(
      `Hi ${booking.host_name}, I have a booking at ${booking.listing.name} (ref: ${booking.token}) on ${booking.check_in}. Confirming my reservation.`
    );
    window.open(`https://wa.me/${booking.host_phone.replace(/\D/g, "")}?text=${msg}`);
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingToken: booking.token,
        guestPhone: booking.guest_phone,
        rating: parseInt(feedbackRating),
        comment: feedbackComment || null,
        isPublicReview: false,
      }),
    });
    if (response.ok) {
      setFeedbackSent(true);
    } else {
      alert("Could not submit feedback yet.");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="size-8 animate-pulse rounded-full bg-[#f1e6ea]" />
          <div className="h-7 w-48 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="mb-6 flex items-center gap-2">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="my-5 h-px w-full bg-border" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-muted-foreground">Booking not found</p>
      </div>
    );
  }

  const isConfirmed = booking.status === "confirmed" || booking.status === "completed";
  const isPendingHost = booking.status === "paid_pending_host";
  const isRejected = booking.status === "rejected" || booking.status === "cancelled";

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="mb-6 flex items-center gap-3">
        {isConfirmed ? (
          <CheckCircle className="size-8 shrink-0 text-[#800020]" />
        ) : isRejected ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="size-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        ) : (
          <Clock className="size-8 shrink-0 text-amber-500" />
        )}
        <h1 className="text-2xl font-bold tracking-tight">
          {isConfirmed
            ? "Booking confirmed"
            : isPendingHost
            ? "Awaiting host confirmation"
            : isRejected
            ? "Booking unavailable"
            : "Booking pending payment"}
        </h1>
      </div>

      {isPendingHost && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-bold text-amber-900">What happens next?</h3>
          <p className="mt-1 text-sm text-amber-800">
            The host has been notified via SMS to confirm your reservation. We&apos;ll text you as soon as they respond. If the host declines or times out, your reserve fee is fully refundable or can be used for another place.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <h3 className="font-bold text-red-900">Reservation declined</h3>
          <p className="mt-1 text-sm text-red-800">
            Unfortunately, the host is unable to accommodate this request. Your reserve fee will be refunded back to your payment method automatically within 3-5 business days. We apologize for the inconvenience.
          </p>
        </div>
      )}

      {/* Token */}
      <div className="mb-6 flex items-center gap-2">
        <code className="rounded-lg bg-muted px-4 py-2 font-mono text-lg font-bold tracking-widest text-[#181113]">
          {booking.token}
        </code>
        <Button variant="ghost" size="sm" onClick={copyToken} className="h-10 px-3 hover:bg-muted">
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <div className="rounded-3xl border bg-white p-5 shadow-sm sm:p-7">
        <div>
          <h2 className="text-lg font-bold leading-snug">{booking.listing.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {booking.listing.area}, {booking.listing.city}, {booking.listing.country}
          </p>
        </div>

        <Separator className="my-5" />

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Guest</span>
            <p className="font-medium">{booking.guest_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type</span>
            <p>
              <Badge variant="secondary">{booking.category}</Badge>
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">
              {booking.category === "experience" ? "Date" : "Check-in"}
            </span>
            <p className="font-medium">{booking.check_in}</p>
          </div>
          {booking.check_out && (
            <div>
              <span className="text-muted-foreground">Check-out</span>
              <p className="font-medium">{booking.check_out}</p>
            </div>
          )}
          {booking.start_time && (
            <div>
              <span className="text-muted-foreground">Time</span>
              <p className="font-medium">{booking.start_time}</p>
            </div>
          )}
          {booking.duration_hours && (
            <div>
              <span className="text-muted-foreground">Duration</span>
              <p className="font-medium">{booking.duration_hours}h</p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Guests</span>
            <p className="font-medium">{booking.guests}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-semibold">
              ${Number(booking.total_amount).toLocaleString()}
            </p>
          </div>
        </div>

        {booking.note && (
          <>
            <Separator />
            <div>
              <span className="text-sm text-muted-foreground">Note</span>
              <p className="text-sm">{booking.note}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Private info — only shown if paid */}
        {isConfirmed ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-[#800020]" />
              <div>
                <span className="text-sm text-muted-foreground">Address</span>
                <p className="text-sm font-medium">
                  {booking.listing.private_address}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 mt-0.5 text-[#800020]" />
              <div>
                <span className="text-sm text-muted-foreground">
                  Host phone
                </span>
                <p className="text-sm font-medium">{booking.host_phone}</p>
              </div>
            </div>
            {booking.listing.check_in_instructions && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5 text-[#800020]" />
                <div>
                  <span className="text-sm text-muted-foreground">
                    Check-in instructions
                  </span>
                  <p className="text-sm font-medium whitespace-pre-line">
                    {booking.listing.check_in_instructions}
                  </p>
                </div>
              </div>
            )}
            <Button onClick={openWhatsApp} className="w-full gap-2" variant="outline">
              <ExternalLink className="h-4 w-4" /> Message host on WhatsApp
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Lock className="h-4 w-4" />
            <span>
              Address and host contact will be revealed after the host confirms.
            </span>
          </div>
        )}
      </div>

      {booking.status === "completed" && (
        <form onSubmit={submitFeedback} className="border rounded-xl p-5 mt-4 space-y-3">
          <h2 className="font-semibold">How was your stay?</h2>
          {feedbackSent ? (
            <p className="text-sm text-[#800020]">Thanks. Your feedback helps Beddn launch better.</p>
          ) : (
            <>
              <label className="block text-sm">
                Rating
                <select
                  className="mt-1 w-full border rounded-md px-3 py-2"
                  value={feedbackRating}
                  onChange={(e) => setFeedbackRating(e.target.value)}
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>
                      {rating}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Comment
                <textarea
                  className="mt-1 w-full border rounded-md px-3 py-2 min-h-24"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                />
              </label>
              <Button type="submit" className="bg-[#800020] hover:bg-[#600018]">
                Send feedback
              </Button>
            </>
          )}
        </form>
      )}
    </main>
  );
}
