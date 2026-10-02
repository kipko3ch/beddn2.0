"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MapPin,
  Star,
} from "lucide-react";
import { LOGO_SRC } from "@/lib/assets";
import { ReserveSkeleton } from "@/components/reserve-skeleton";
import type { User } from "@supabase/supabase-js";
import type { Listing, ListingCategory, Review } from "@/lib/types";

type ReserveListing = Listing & { reviews?: Pick<Review, "rating">[] };

function CheckoutHeader({ backHref }: { backHref?: string }) {
  return (
    <header className="border-b border-[#f3cfd9]/60 bg-white/95 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-brand text-2xl font-bold tracking-tight text-[#2b000a]">Beddn</span>
        </Link>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf0f3] px-3.5 py-1.5 text-xs sm:text-sm font-bold text-[#800020] hover:bg-[#f3d9e2] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to listing</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default function ReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [listing, setListing] = useState<ReserveListing | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOwnListing, setIsOwnListing] = useState(false);

  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  // Guest Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsUpdates, setSmsUpdates] = useState(true);

  // Stay Preferences
  const [category, setCategory] = useState<ListingCategory>(
    (searchParams.get("category") as ListingCategory) || "overnight"
  );
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") || "");
  const [startTime, setStartTime] = useState(searchParams.get("startTime") || "10:00");
  const [duration, setDuration] = useState(searchParams.get("duration") || "2");
  const [guests, setGuests] = useState(searchParams.get("guests") || "1");
  const [units, setUnits] = useState("1");
  const [note, setNote] = useState("");

  useEffect(() => {
    async function load() {
      const [listingRes, userRes] = await Promise.all([
        fetch(`/api/public/listings?id=${id}`),
        supabase.auth.getUser(),
      ]);

      const json: { listing?: ReserveListing } = listingRes.ok
        ? await listingRes.json()
        : {};
      const data = json.listing ?? null;
      const authUser = userRes.data.user;
      setUser(authUser);

      if (authUser) {
        const fullName = (authUser.user_metadata?.full_name as string | undefined) ?? "";
        const [first, ...rest] = fullName.split(" ");
        setFirstName((prev) => prev || first || "");
        setLastName((prev) => prev || rest.join(" ") || "");
        setEmail((prev) => prev || authUser.email || "");
      }

      if (data) {
        setListing(data);
        if (authUser) {
          const { data: host } = await supabase
            .from("hosts")
            .select("id")
            .eq("user_id", authUser.id)
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
  }, [id, searchParams, supabase]);

  function computeTotal(): number {
    if (!listing) return 0;
    if (category === "hourly" && listing.hourly_price) {
      return Number(listing.hourly_price) * parseInt(duration || "1", 10);
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
    if (listing.overnight_price) {
      return Number(listing.overnight_price);
    }
    if (listing.hourly_price) {
      return Number(listing.hourly_price);
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
    if (!checkIn) return "Dates chosen upon booking";
    if (category === "overnight" && checkOut) {
      return `${new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `${new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${startTime ? ` · ${startTime}` : ""}`;
  }

  function bookingTypeLabel() {
    if (category === "hourly") return `${duration || 1} hr hourly session`;
    return "Overnight stay";
  }

  const isFormValid = Boolean(
    firstName.trim().length >= 2 &&
    phone.trim().length >= 8
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listing || submitting) return;
    if (isOwnListing) {
      alert("Hosts cannot reserve their own listing.");
      return;
    }
    if (!firstName.trim() || !phone.trim()) {
      alert("Please provide your name and phone number so the host can confirm your stay.");
      return;
    }
    setSubmitting(true);

    try {
      const response = await fetch("/api/bookings/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          guestName: `${firstName} ${lastName}`.trim(),
          guestPhone: phone,
          guestEmail: email || null,
          category,
          checkIn: checkIn || new Date().toISOString().slice(0, 10),
          checkOut: category === "overnight" ? (checkOut || null) : null,
          startTime: category === "hourly" ? startTime || null : null,
          durationHours: category === "hourly" ? parseInt(duration || "1", 10) : null,
          guestsCount: parseInt(guests || "1", 10),
          unitsReserved: parseInt(units || "1", 10),
          note: note.trim() || null,
        }),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        bookingToken?: string;
        whatsappUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        alert(result.error || "Could not complete your request. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmittedCode(result.bookingToken || "sent");
      setWhatsappUrl(result.whatsappUrl || null);
    } catch {
      alert("An unexpected network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <ReserveSkeleton />;
  }

  const detailHref = `/property/${listing?.slug || id}`;

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

  // Not signed in prompt
  if (!user) {
    return (
      <>
        <CheckoutHeader backHref={detailHref} />
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020]">
            <Icon icon="solar:user-circle-bold-duotone" className="h-8 w-8" />
          </div>
          <h1 className="font-brand text-2xl sm:text-3xl font-bold text-[#181113]">Sign in to reserve</h1>
          <p className="mt-2 text-sm text-stone-500 leading-relaxed">
            Create an account or sign in to confirm your booking and coordinate directly with your host.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <AuthDialog>
              <Button className="h-11 rounded-full bg-[#800020] hover:bg-[#600018] px-8 text-sm font-bold text-white shadow-md">
                Sign in
              </Button>
            </AuthDialog>
            <AuthDialog>
              <Button variant="outline" className="h-11 rounded-full border-[#f3cfd9] px-6 text-sm font-semibold text-[#800020] hover:bg-[#fbf0f3]">
                Create an account
              </Button>
            </AuthDialog>
          </div>
        </main>
      </>
    );
  }

  // Booking confirmed view
  if (submittedCode) {
    return (
      <>
        <CheckoutHeader backHref={detailHref} />
        <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-[#f3cfd9] bg-white p-8 sm:p-10 text-center shadow-lg">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020]">
              <CheckCircle2 className="h-9 w-9 text-[#800020]" />
            </div>

            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#fbf0f3] border border-[#f3cfd9] px-3.5 py-1 text-xs font-bold text-[#800020]">
              <Icon icon="solar:verified-check-bold" className="h-3.5 w-3.5" />
              Reservation Request Sent
            </span>

            <h1 className="mt-3 font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a] tracking-tight">
              Request Sent to Host!
            </h1>
            <p className="mx-auto mt-2 text-sm leading-relaxed text-stone-600">
              Your booking request for <strong className="text-stone-900 font-semibold">{listing.title || listing.name}</strong> has been submitted. Connect on WhatsApp to finalize details and check-in times.
            </p>
            {submittedCode !== "sent" && (
              <p className="mt-4 inline-block rounded-full bg-[#fbf0f3] border border-[#f3cfd9] px-4 py-1.5 text-xs font-bold text-[#800020]">
                Reference ID: {submittedCode}
              </p>
            )}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#25D366] px-7 text-sm font-bold text-white hover:bg-[#128C7E] shadow-sm transition"
                >
                  <Icon icon="solar:chat-round-dots-bold-duotone" className="h-4 w-4" />
                  Continue on WhatsApp
                </a>
              )}
              <Link
                href={detailHref}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-full border border-stone-200 px-6 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Back to listing
              </Link>
            </div>

            {/* Support Hotline Info */}
            <div className="mt-8 border-t border-[#f3cfd9]/60 pt-5 text-center">
              <p className="text-xs font-semibold text-stone-500">Need help with your reservation?</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
                <a
                  href="tel:+254727993661"
                  className="inline-flex items-center gap-1 font-bold text-[#800020] hover:underline"
                >
                  <span>🇰🇪 Kenya: +254 727 993 661</span>
                </a>
                <span className="text-stone-300">·</span>
                <a
                  href="tel:+255743607361"
                  className="inline-flex items-center gap-1 font-bold text-[#800020] hover:underline"
                >
                  <span>🇹🇿 Tanzania: +255 743 607 361</span>
                </a>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const total = computeTotal();
  const reviews = listing.reviews ?? [];
  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 4.9;

  return (
    <div className="min-h-screen bg-[#faf8f7] text-[#241f21] pb-24 sm:pb-16">
      <CheckoutHeader backHref={detailHref} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* ================= LEFT COLUMN: STREAMLINED RESERVATION FORM ================= */}
          <div className="lg:col-span-7 space-y-6">
            {isOwnListing && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                You are the host of this listing. Hosts cannot book their own property.
              </div>
            )}

            {/* Header Badge */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf0f3] border border-[#f3cfd9] px-3.5 py-1 text-xs font-bold text-[#800020]">
                <Icon icon="solar:shield-check-bold-duotone" className="h-4 w-4" />
                Direct Host Reservation
              </span>
              <h1 className="mt-2 font-brand text-2xl sm:text-3xl font-extrabold tracking-tight text-[#2b000a]">
                Request your stay
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-500">
                Provide your details below to reserve with the host. Pay upon arrival.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Card 1: Contact Details */}
              <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3cfd9]/40 pb-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-[#fbf0f3] text-xs font-bold text-[#800020]">
                    1
                  </div>
                  <h2 className="text-base font-bold text-[#181113]">Your contact information</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-xs font-bold text-stone-700">
                      First Name <span className="text-[#800020]">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Your first name"
                        required
                        className="h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                      />
                      {firstName.trim().length >= 2 && (
                        <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#128c4b]" />
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lastName" className="text-xs font-bold text-stone-700">
                      Last Name
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Your last name"
                        className="h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                      />
                      {lastName.trim().length >= 1 && (
                        <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#128c4b]" />
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="phone" className="text-xs font-bold text-stone-700">
                      Phone Number (WhatsApp) <span className="text-[#800020]">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254 700 000 000 or +255..."
                        required
                        className="h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                      />
                      {phone.trim().length >= 8 && (
                        <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#128c4b]" />
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-[#800020]/80">
                      Your host will connect with you on WhatsApp for location pin and keys.
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="email" className="text-xs font-bold text-stone-700">
                      Email Address <span className="font-normal text-stone-400">(optional)</span>
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <input
                    id="sms-opt"
                    type="checkbox"
                    checked={smsUpdates}
                    onChange={(e) => setSmsUpdates(e.target.checked)}
                    className="h-4 w-4 rounded border-stone-300 text-[#800020] focus:ring-[#800020]"
                  />
                  <label htmlFor="sms-opt" className="text-xs text-stone-600 cursor-pointer">
                    Receive reservation confirmation via WhatsApp or SMS
                  </label>
                </div>
              </div>

              {/* Card 2: Stay Details */}
              <div className="rounded-3xl border border-[#f3cfd9]/80 bg-white p-6 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3cfd9]/40 pb-3">
                  <div className="flex size-7 items-center justify-center rounded-full bg-[#fbf0f3] text-xs font-bold text-[#800020]">
                    2
                  </div>
                  <h2 className="text-base font-bold text-[#181113]">Stay details &amp; preferences</h2>
                </div>

                {/* Category Selector Pills */}
                {listing.categories && listing.categories.length > 1 && (
                  <div>
                    <Label className="text-xs font-bold text-stone-700 mb-1.5 block">Booking Type</Label>
                    <div className="inline-flex gap-2 p-1 rounded-2xl bg-[#fbf0f3] border border-[#f3cfd9]">
                      {listing.categories.map((cat) => {
                        const active = category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat as ListingCategory)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                              active
                                ? "bg-[#800020] text-white shadow-xs"
                                : "text-stone-600 hover:text-[#800020]"
                            }`}
                          >
                            <Icon
                              icon={cat === "hourly" ? "solar:clock-circle-bold-duotone" : "solar:bed-bold-duotone"}
                              className="h-3.5 w-3.5"
                            />
                            <span className="capitalize">{cat}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dates & Time Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {category === "overnight" ? (
                    <>
                      <div>
                        <Label htmlFor="checkIn" className="text-xs font-bold text-stone-700">Check-in Date</Label>
                        <Input
                          id="checkIn"
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="mt-1 h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="checkOut" className="text-xs font-bold text-stone-700">Check-out Date</Label>
                        <Input
                          id="checkOut"
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="mt-1 h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label htmlFor="stayDate" className="text-xs font-bold text-stone-700">Date of Use</Label>
                        <Input
                          id="stayDate"
                          type="date"
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                          className="mt-1 h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="startTime" className="text-xs font-bold text-stone-700">Arrival Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="mt-1 h-11 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="duration" className="text-xs font-bold text-stone-700">Duration (Hours)</Label>
                        <select
                          id="duration"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="mt-1 h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-sm focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                        >
                          <option value="1">1 hour</option>
                          <option value="2">2 hours</option>
                          <option value="3">3 hours</option>
                          <option value="4">4 hours</option>
                          <option value="6">6 hours</option>
                          <option value="8">Full daytime (8 hours)</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="guests" className="text-xs font-bold text-stone-700">Number of Guests</Label>
                    <select
                      id="guests"
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="mt-1 h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-sm focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "guest" : "guests"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="units" className="text-xs font-bold text-stone-700">Rooms / Spaces</Label>
                    <select
                      id="units"
                      value={units}
                      onChange={(e) => setUnits(e.target.value)}
                      className="mt-1 h-11 w-full rounded-2xl border border-stone-200 bg-white px-3 text-sm focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                    >
                      <option value="1">1 room / unit</option>
                      <option value="2">2 rooms / units</option>
                      <option value="3">3 rooms / units</option>
                    </select>
                  </div>
                </div>

                {/* Note for Host */}
                <div>
                  <Label htmlFor="note" className="text-xs font-bold text-stone-700">
                    Message or special request for host <span className="font-normal text-stone-400">(optional)</span>
                  </Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="E.g. Estimated arrival time, parking needed, quiet work space..."
                    className="mt-1 rounded-2xl border-stone-200 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]/20"
                  />
                </div>
              </div>

              {/* Card 3: Summary Banner & Submit Button */}
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-[#fbf0f3] border border-[#f3cfd9] p-4 text-xs text-[#2b000a]">
                  <Icon icon="solar:info-circle-bold-duotone" className="h-5 w-5 text-[#800020] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Direct booking:</strong> Your request is sent directly to the host. You pay upon arrival and coordinate check-in instructions directly on WhatsApp.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || isOwnListing || !isFormValid}
                  className="h-13 w-full rounded-full bg-[#800020] hover:bg-[#600018] text-white text-base font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {submitting ? "Sending Request to Host..." : "Confirm & Request Stay"}
                </Button>

                <p className="text-center text-[11px] text-stone-500">
                  By requesting, you agree to Beddn&apos;s Terms of Service and host house rules.
                </p>
              </div>
            </form>
          </div>

          {/* ================= RIGHT COLUMN: CLEAN MODERN STICKY SUMMARY ================= */}
          <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24 self-start">
            {/* Property Summary Card */}
            <div className="overflow-hidden rounded-3xl border border-[#f3cfd9]/90 bg-white shadow-xs">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Modern Brand Font - NO SERIF */}
                    <h3 className="font-brand text-base sm:text-lg font-bold text-[#181113] leading-snug line-clamp-2">
                      {listing.title || listing.name}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-600">
                      <div className="flex items-center text-[#800020]">
                        <Star className="h-3.5 w-3.5 fill-[#800020]" />
                        <span className="ml-1 font-bold">{avgRating.toFixed(1)}</span>
                      </div>
                      <span>({reviews.length || 1} {reviews.length === 1 ? "review" : "reviews"})</span>
                    </div>
                    {listing.area && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-stone-500 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                        <span>{listing.area}, {listing.city}</span>
                      </p>
                    )}
                  </div>

                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200">
                    <Image
                      src={listingImage()}
                      alt={listing.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>

                <hr className="border-[#f3cfd9]/50" />

                {/* Reservation Summary */}
                <div className="space-y-2.5 text-xs text-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Booking mode</span>
                    <span className="font-bold capitalize text-[#800020] bg-[#fbf0f3] px-2.5 py-0.5 rounded-full border border-[#f3cfd9]">
                      {bookingTypeLabel()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Dates</span>
                    <span className="font-semibold text-right max-w-[65%] truncate text-stone-800">
                      {bookingDateLabel()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Guests</span>
                    <span className="font-semibold text-stone-800">{guests} guest{guests === "1" ? "" : "s"}</span>
                  </div>
                </div>

                <hr className="border-[#f3cfd9]/50" />

                {/* Price Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-lg font-extrabold text-[#181113]">
                    <span>Total</span>
                    <span className="text-[#800020]">{money(total)}</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Pay upon arrival · No advance card charge
                  </p>
                </div>
              </div>
            </div>

            {/* 24/7 Support Card with clean Iconify icons & pink palette touches */}
            <div className="rounded-3xl border border-[#f3cfd9] bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#800020]">
                <Icon icon="solar:headphones-round-sound-bold-duotone" className="h-4 w-4 text-[#800020]" />
                <span>24/7 Beddn Support</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Need assistance with your booking? Our dedicated support team is ready to assist you.
              </p>

              <div className="space-y-2 pt-1">
                {/* Kenya & General Support */}
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#fbf0f3]/70 border border-[#f3cfd9] p-2.5">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#800020]">
                      Kenya &amp; General
                    </span>
                    <a
                      href="tel:+254727993661"
                      className="text-xs font-bold text-stone-900 hover:text-[#800020] transition"
                    >
                      +254 727 993 661
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href="tel:+254727993661"
                      title="Call Kenya support"
                      className="flex size-7 items-center justify-center rounded-full bg-white text-[#800020] border border-[#f3cfd9] hover:bg-[#fbf0f3] transition shadow-2xs"
                    >
                      <Icon icon="solar:phone-calling-bold-duotone" className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="https://wa.me/254727993661"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp Kenya support"
                      className="flex size-7 items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition shadow-2xs"
                    >
                      <Icon icon="solar:chat-round-dots-bold-duotone" className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>

                {/* Tanzania Support */}
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#fbf0f3]/70 border border-[#f3cfd9] p-2.5">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#800020]">
                      Tanzania
                    </span>
                    <a
                      href="tel:+255743607361"
                      className="text-xs font-bold text-stone-900 hover:text-[#800020] transition"
                    >
                      +255 743 607 361
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href="tel:+255743607361"
                      title="Call Tanzania support"
                      className="flex size-7 items-center justify-center rounded-full bg-white text-[#800020] border border-[#f3cfd9] hover:bg-[#fbf0f3] transition shadow-2xs"
                    >
                      <Icon icon="solar:phone-calling-bold-duotone" className="h-3.5 w-3.5" />
                    </a>
                    <a
                      href="https://wa.me/255743607361"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp Tanzania support"
                      className="flex size-7 items-center justify-center rounded-full bg-[#25D366] text-white hover:bg-[#128C7E] transition shadow-2xs"
                    >
                      <Icon icon="solar:chat-round-dots-bold-duotone" className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
