"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  HandCoins,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  TicketCheck,
  Users,
} from "lucide-react";
import { LOGO_SRC } from "@/lib/assets";
import type { Listing, ListingCategory, Review } from "@/lib/types";

type ReserveListing = Listing & { reviews?: Pick<Review, "rating">[] };

function CheckoutHeader({ backHref }: { backHref?: string }) {
  return (
    <header className="border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Image src={LOGO_SRC} alt="Beddn" width={20} height={28} unoptimized className="h-7 w-auto object-contain" />
          <span className="text-lg">Beddn</span>
        </Link>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#800020] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to listing
          </Link>
        )}
      </div>
    </header>
  );
}

function ReserveLoading() {
  return (
    <>
      <CheckoutHeader />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-3">
          <div className="h-4 w-28 animate-pulse rounded-full bg-[#f1e6ea]" />
          <div className="h-8 w-64 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            {[0, 1].map((item) => (
              <div key={item} className="rounded-3xl border bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <div className="size-9 animate-pulse rounded-full bg-[#f1e6ea]" />
                  <div className="space-y-2">
                    <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-64 max-w-full animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: item === 0 ? 4 : 6 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                      <div className="h-11 animate-pulse rounded-xl bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-3xl border bg-white p-5 shadow-sm">
            <div className="mb-5 flex gap-4">
              <div className="size-20 animate-pulse rounded-2xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-4 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [listing, setListing] = useState<ReserveListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOwnListing, setIsOwnListing] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<ListingCategory>(
    (searchParams.get("category") as ListingCategory) || "overnight"
  );
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [startTime, setStartTime] = useState(searchParams.get("startTime") || "");
  const [duration, setDuration] = useState(searchParams.get("duration") || "1");
  const [guests, setGuests] = useState(searchParams.get("guests") || "1");
  const [units, setUnits] = useState("1");
  const [note, setNote] = useState("");
  const [wantsNegotiation, setWantsNegotiation] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [negotiationMessage, setNegotiationMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("*, listing_images(*), reviews(rating)")
        .eq("id", id)
        .eq("is_active", true)
        .eq("is_verified", true)
        .single();
      if (data) {
        setListing(data as ReserveListing);
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: host } = await supabase
            .from("hosts")
            .select("id")
            .eq("user_id", userData.user.id)
            .maybeSingle();
          setIsOwnListing(host?.id === data.host_id);
        }
        const queryCategory = searchParams.get("category") as ListingCategory | null;
        if (queryCategory && data.categories?.includes(queryCategory)) {
          setCategory(queryCategory);
        } else if (data.categories?.length === 1) {
          setCategory(data.categories[0] as ListingCategory);
        }
      }
      setLoading(false);
    }
    load();
  }, [id, searchParams]);

  function computeTotal(): number {
    if (!listing) return 0;
    if (category === "hourly" && listing.hourly_price) {
      return Number(listing.hourly_price) * parseInt(duration || "1");
    }
    if (category === "overnight" && listing.overnight_price && checkIn && checkOut) {
      const nights = Math.max(
        1,
        Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      return Number(listing.overnight_price) * nights;
    }
    if (category === "experience" && listing.experience_price) {
      return Number(listing.experience_price);
    }
    return 0;
  }

  function money(value: number) {
    return `${listing?.currency || "KES"} ${Number(value || 0).toLocaleString()}`;
  }

  function listingImage() {
    return listing?.listing_images?.[0]?.url || LOGO_SRC;
  }

  function bookingDateLabel() {
    if (!checkIn) return "Select your date";
    if (category === "overnight" && checkOut) {
      return `${new Date(checkIn).toLocaleDateString()} - ${new Date(checkOut).toLocaleDateString()}`;
    }
    return `${new Date(checkIn).toLocaleDateString()}${startTime ? ` at ${startTime}` : ""}`;
  }

  function bookingTypeLabel() {
    if (category === "hourly") return `${duration || 1} hour stay`;
    if (category === "experience") return "Experience session";
    return "Overnight stay";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listing || submitting) return;
    if (isOwnListing) {
      alert("Hosts cannot reserve their own listing.");
      return;
    }
    setSubmitting(true);

    const negotiationNote = wantsNegotiation
      ? [
          "Guest would like to negotiate.",
          offerAmount ? `Offer: ${listing.currency || "KES"} ${offerAmount}` : null,
          negotiationMessage ? `Reason/message: ${negotiationMessage}` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : "";
    const hostNote = [note, negotiationNote].filter(Boolean).join("\n\n") || null;

    const response = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listing.id,
        guestName: `${firstName} ${lastName}`.trim(),
        guestPhone: phone,
        guestEmail: email || null,
        category,
        checkIn,
        checkOut: category === "overnight" ? checkOut : null,
        startTime: category !== "overnight" ? startTime || null : null,
        durationHours: category === "hourly" ? parseInt(duration) : null,
        guestsCount: parseInt(guests),
        unitsReserved: parseInt(units),
        note: hostNote,
      }),
    });

    const result = (await response.json()) as {
      authorizationUrl?: string;
      error?: string;
    };

    if (!response.ok || !result.authorizationUrl) {
      alert(result.error || "Could not start checkout. Please try again.");
      setSubmitting(false);
      return;
    }

    window.location.href = result.authorizationUrl;
  }

  if (loading) {
    return <ReserveLoading />;
  }

  if (!listing) {
    return (
      <>
        <CheckoutHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <p className="text-muted-foreground">Listing not found</p>
        </div>
      </>
    );
  }

  const total = computeTotal();
  const availableCategories = listing.categories;
  const reviews = listing.reviews ?? [];
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;
  const isExperience = category === "experience";

  return (
    <>
      <CheckoutHeader backHref={`/property/${listing.slug}`} />
      <main className="bg-[#fffdfd] px-4 pb-28 pt-6 text-[#181113] sm:px-6 lg:px-8 lg:pb-10">
        <div className="mx-auto mb-6 max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[#800020]">Reserve your spot</p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {listing.title || listing.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Confirm your details, review the reserve fee, and the host will receive your request by SMS.
              </p>
            </div>
            <div className="flex rounded-full border bg-white p-1 text-xs font-bold text-muted-foreground">
              {["Details", "Stay", "Pay"].map((step, index) => (
                <span
                  key={step}
                  className={`rounded-full px-3 py-1.5 ${index === 0 ? "bg-[#800020] text-white" : ""}`}
                >
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
        <form
          id="reserve-form"
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          <div className="space-y-5">
            {isOwnListing && (
              <div className="rounded-2xl border border-[#800020] bg-[#fbf7f8] p-5 text-sm text-muted-foreground">
                <p className="font-bold text-[#181113]">You are the host for this listing</p>
                <p className="mt-1">
                  Hosts cannot reserve their own homes or experiences. Use the dashboard to manage availability and test bookings from a guest account.
                </p>
              </div>
            )}
            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#800020] text-sm font-bold text-white shadow-sm">
                  1
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Contact details</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We use this to send SMS updates and your booking confirmation.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Optional, for your payment receipt"
                      className="h-11 border-neutral-400 pl-10 focus-visible:border-[#800020]"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="phone">Phone number *</Label>
                  <div className="mt-1 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="flex h-11 items-center rounded-lg border border-neutral-400 px-3 text-sm">
                      Kenya (+254)
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-11 border-neutral-400 pl-10 focus-visible:border-[#800020]"
                        required
                      />
                    </div>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" className="size-4 accent-[#800020]" defaultChecked />
                    Receive SMS updates about this booking.
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fbf7f8] text-sm font-bold text-[#800020]">
                  2
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Booking details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirm the date you chose, add guests or seats, and send any note to the host.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Booking type</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as ListingCategory)}
                  >
                    <SelectTrigger className="mt-1 h-11 border-neutral-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.includes("hourly") && (
                        <SelectItem value="hourly">Hourly</SelectItem>
                      )}
                      {availableCategories.includes("overnight") && (
                        <SelectItem value="overnight">Overnight</SelectItem>
                      )}
                      {availableCategories.includes("experience") && (
                        <SelectItem value="experience">Experience</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="checkIn">{isExperience ? "Session date" : "Check-in date"}</Label>
                  <Input
                    id="checkIn"
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                    required
                  />
                </div>
                {category === "overnight" && (
                  <div>
                    <Label htmlFor="checkOut">Check-out date</Label>
                    <Input
                      id="checkOut"
                      type="date"
                      value={checkOut}
                      onChange={(e) => setCheckOut(e.target.value)}
                      className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                      required
                    />
                  </div>
                )}
                {(category === "hourly" || category === "experience") && (
                  <div>
                    <Label htmlFor="startTime">Start time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                      required
                    />
                  </div>
                )}
                {category === "hourly" && (
                  <div>
                    <Label htmlFor="duration">Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="24"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                      required
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="guests">{isExperience ? "Seats" : "Guests"}</Label>
                  <div className="relative mt-1">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="guests"
                      type="number"
                      min="1"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="h-11 border-neutral-400 pl-10 focus-visible:border-[#800020]"
                      required
                    />
                  </div>
                </div>
                {(listing.total_units ?? 1) > 1 && (
                  <div>
                    <Label htmlFor="units">Rooms/units</Label>
                    <Input
                      id="units"
                      type="number"
                      min="1"
                      max={listing.total_units ?? 1}
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                      required
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Label htmlFor="note">Note to host</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Arrival notes, special requests, or anything the host should know."
                    className="mt-1 border-neutral-400 focus-visible:border-[#800020]"
                  />
                </div>
                <div className="sm:col-span-2 rounded-2xl border bg-[#fbf7f8] p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-[#800020]"
                      checked={wantsNegotiation}
                      onChange={(event) => setWantsNegotiation(event.target.checked)}
                    />
                    <span>
                      <span className="flex items-center gap-2 font-bold">
                        <HandCoins className="h-4 w-4 text-[#800020]" />
                        Ask host for a better price
                      </span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        Useful for longer stays, repeat visits, weekdays, or group bookings.
                      </span>
                    </span>
                  </label>
                  {wantsNegotiation && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                      <div>
                        <Label htmlFor="offerAmount">Your offer</Label>
                        <Input
                          id="offerAmount"
                          inputMode="numeric"
                          value={offerAmount}
                          onChange={(event) => setOfferAmount(event.target.value)}
                          placeholder={`${listing.currency || "KES"} amount`}
                          className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                        />
                      </div>
                      <div>
                        <Label htmlFor="negotiationMessage">Message</Label>
                        <Input
                          id="negotiationMessage"
                          value={negotiationMessage}
                          onChange={(event) => setNegotiationMessage(event.target.value)}
                          placeholder="Example: staying 5 nights, can we agree a better rate?"
                          className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#fbf7f8] text-sm font-bold text-[#800020]">
                  3
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Before you pay</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your reserve fee starts the booking request. Host contact and exact address stay private until confirmation.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                {[
                  "SMS updates are sent to your phone.",
                  "Hosts confirm or reject paid requests.",
                  "Rejected requests are reviewed for resolution.",
                ].map((item) => (
                  <div key={item} className="rounded-2xl bg-[#fbf7f8] p-4 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="p-5">
                <div className="flex gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-3 font-bold leading-snug">
                      {listing.title || listing.name}
                    </h2>
                    <div className="mt-2 flex items-center gap-1 text-sm">
                      {reviews.length > 0 ? (
                        <>
                          <span>{avgRating.toFixed(1)}</span>
                          <Star className="h-4 w-4 fill-[#800020] text-[#800020]" />
                          <span className="text-muted-foreground">({reviews.length})</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">New verified place</span>
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {listing.area}, {listing.city}
                    </p>
                  </div>
                  <img
                    src={listingImage()}
                    alt={listing.name}
                    className="size-24 rounded-lg object-cover"
                    onError={(event) => {
                      event.currentTarget.src = LOGO_SRC;
                    }}
                  />
                </div>

                <Separator className="my-5" />

                <div className="space-y-4 text-sm">
                  <div className="flex gap-3">
                    <TicketCheck className="mt-0.5 h-4 w-4 text-[#800020]" />
                    <div>
                      <p className="font-medium">{bookingTypeLabel()}</p>
                      <p className="capitalize text-muted-foreground">{category}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-[#800020]" />
                    <div>
                      <p className="font-medium">{bookingDateLabel()}</p>
                      <p className="text-muted-foreground">
                      {guests} {isExperience ? "seat" : "guest"}{guests === "1" ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-[#800020]" />
                    <p className="text-muted-foreground">
                      Host contact and exact address unlock only after confirmation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-y bg-[#fbf7f8] p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-[#800020]" />
                  SMS-first booking updates
                </div>
                <p className="text-sm text-muted-foreground">
                  Fast booking alerts before your stay. Message rates may apply.
                </p>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex justify-between text-sm">
                  <span>Estimated stay total</span>
                  <span className="font-semibold">{money(total)}</span>
                </div>
                {listing.deposit_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Reserve fee due now</span>
                    <span className="font-semibold">{money(Number(listing.deposit_amount))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Pay now</span>
                  <span>{money(Number(listing.deposit_amount || total))}</span>
                </div>
                <Button
                  type="submit"
                  disabled={submitting || isOwnListing || !firstName || !lastName || !phone || !checkIn}
                  className="mt-2 h-11 w-full rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
                >
                  <CreditCard className="h-4 w-4" />
                  {submitting ? "Opening secure checkout..." : "Pay reserve fee"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Your host details unlock only after the booking is confirmed.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link
            href={`/property/${listing.slug}`}
            className="flex h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold"
          >
            Back
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Pay now</p>
            <p className="truncate font-bold">{money(Number(listing.deposit_amount || total))}</p>
          </div>
          <Button
            type="submit"
            form="reserve-form"
            disabled={submitting || isOwnListing || !firstName || !lastName || !phone || !checkIn}
            className="h-11 rounded-full bg-[#800020] px-5 font-bold hover:bg-[#600018]"
          >
            {submitting ? "Opening..." : "Reserve"}
          </Button>
        </div>
      </div>
    </>
  );
}
