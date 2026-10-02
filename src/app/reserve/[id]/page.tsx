"use client";

import { useEffect, useState, use, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthDialog } from "@/components/auth-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Edit2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  TicketCheck,
  UserCircle,
  Users,
} from "lucide-react";
import { LOGO_SRC } from "@/lib/assets";
import { ReserveSkeleton } from "@/components/reserve-skeleton";
import type { User } from "@supabase/supabase-js";
import type { Listing, ListingCategory, Review } from "@/lib/types";

type ReserveListing = Listing & { reviews?: Pick<Review, "rating">[] };

function CheckoutHeader({ backHref }: { backHref?: string }) {
  return (
    <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-brand text-2xl font-bold tracking-tight text-[#2b000a]">Beddn</span>
        </Link>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-stone-600 hover:text-[#800020] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to listing
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

  // Active accordion step (1 = Contact details, 2 = Stay details, 3 = Payment & Confirmation)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  // Step 1: Contact Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [smsUpdates, setSmsUpdates] = useState(true);

  // Step 2: Stay Details
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

  // Promo Code
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  // Timer: 10 minutes countdown
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

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
    if (!checkIn) return "Dates chosen at confirmation";
    if (category === "overnight" && checkOut) {
      return `${new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${new Date(checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return `${new Date(checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}${startTime ? ` · ${startTime}` : ""}`;
  }

  function bookingTypeLabel() {
    if (category === "hourly") return `${duration || 1} hr session`;
    return "Overnight stay";
  }

  const isContactValid = Boolean(
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 1 &&
    email.trim().includes("@") &&
    phone.trim().length >= 8
  );

  const isStayValid = Boolean(
    checkIn || category === "hourly" || category === "overnight"
  );

  const handleNextFromContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isContactValid) return;
    setCompletedSteps((prev) => new Set([...prev, 1]));
    setActiveStep(2);
  };

  const handleNextFromStay = (e: React.FormEvent) => {
    e.preventDefault();
    setCompletedSteps((prev) => new Set([...prev, 1, 2]));
    setActiveStep(3);
  };

  async function handleCompleteReservation() {
    if (!listing || submitting) return;
    if (isOwnListing) {
      alert("Hosts cannot reserve their own listing.");
      return;
    }
    setSubmitting(true);

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
        durationHours: category === "hourly" ? parseInt(duration || "1") : null,
        guestsCount: parseInt(guests || "1"),
        unitsReserved: parseInt(units || "1"),
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
    setSubmitting(false);
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

  // Not signed in
  if (!user) {
    return (
      <>
        <CheckoutHeader backHref={detailHref} />
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fbf0f3] text-[#800020]">
            <UserCircle className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#2b000a]">Sign in to reserve</h1>
          <p className="mt-3 text-sm text-stone-600 leading-relaxed">
            Please log in or create an account to reserve{" "}
            <strong className="text-stone-900 font-semibold">{listing.title || listing.name}</strong>. It takes less than a minute.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <AuthDialog defaultOpen>
              <Button className="h-11 rounded-full bg-[#800020] px-7 font-bold text-white hover:bg-[#600018]">
                Login or sign up
              </Button>
            </AuthDialog>
            <Link
              href={detailHref}
              className="inline-flex h-11 items-center rounded-full border border-stone-300 px-6 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            >
              Back to listing
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Success view
  if (submittedCode) {
    return (
      <>
        <CheckoutHeader backHref={detailHref} />
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="rounded-3xl border border-stone-200 bg-white p-8 sm:p-12 shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#fbf0f3] text-[#800020]">
              <TicketCheck className="h-10 w-10 text-[#800020]" />
            </div>
            <h1 className="mt-6 font-serif text-3xl font-extrabold text-[#2b000a]">
              Reservation Created!
            </h1>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              Your booking request for <strong className="text-stone-900 font-semibold">{listing.title || listing.name}</strong> is reserved. Continue to WhatsApp to connect directly with the host.
            </p>
            {submittedCode !== "sent" && (
              <p className="mt-4 inline-block rounded-full bg-[#fbf0f3] px-4 py-1.5 text-xs font-bold text-[#800020]">
                Reference: {submittedCode}
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
                  <MessageCircle className="h-4 w-4" />
                  Continue on WhatsApp
                </a>
              )}
              <Link
                href={detailHref}
                className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-full border border-stone-300 px-6 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                Back to listing
              </Link>
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
    <div className="min-h-screen bg-[#faf8f7] text-[#241f21]">
      <CheckoutHeader backHref={detailHref} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ================= LEFT COLUMN: CLEAN MULTI-STEP ACCORDION ================= */}
          <div className="lg:col-span-7 space-y-6">
            {isOwnListing && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                You are the host of this listing. Hosts cannot book their own property.
              </div>
            )}

            {/* STEP 1: Contact Details */}
            <div
              className={`rounded-3xl border bg-white transition-all shadow-xs ${
                activeStep === 1
                  ? "border-stone-300 ring-1 ring-stone-200"
                  : "border-stone-200/90"
              }`}
            >
              {activeStep === 1 ? (
                <form onSubmit={handleNextFromContact} className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181113] text-sm font-bold text-white">
                      1
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-[#181113]">Contact details</h2>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500">
                    We&apos;ll use this information to send you confirmation and updates about your booking.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
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
                          className="h-11 rounded-xl border-stone-300 pr-9 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]"
                        />
                        {firstName.trim().length >= 2 && (
                          <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#1a7f46]" />
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="lastName" className="text-xs font-bold text-stone-700">
                        Last Name <span className="text-[#800020]">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Your last name"
                          required
                          className="h-11 rounded-xl border-stone-300 pr-9 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]"
                        />
                        {lastName.trim().length >= 1 && (
                          <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#1a7f46]" />
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="email" className="text-xs font-bold text-stone-700">
                        Email Address <span className="text-[#800020]">*</span>
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          required
                          className="h-11 rounded-xl border-stone-300 pr-9 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]"
                        />
                        {email.includes("@") && email.includes(".") && (
                          <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#1a7f46]" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-stone-400">
                        Your booking confirmation and stay details will be sent here.
                      </p>
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
                          placeholder="+254 700 000 000"
                          required
                          className="h-11 rounded-xl border-stone-300 pr-9 text-sm focus-visible:border-[#800020] focus-visible:ring-[#800020]"
                        />
                        {phone.trim().length >= 8 && (
                          <Check className="absolute right-3 top-3.5 h-4 w-4 text-[#1a7f46]" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <input
                      id="sms-opt"
                      type="checkbox"
                      checked={smsUpdates}
                      onChange={(e) => setSmsUpdates(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-[#800020] focus:ring-[#800020]"
                    />
                    <label htmlFor="sms-opt" className="text-xs text-stone-600 cursor-pointer">
                      Receive WhatsApp / SMS updates about your booking.
                    </label>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Button
                      type="submit"
                      disabled={!isContactValid}
                      className="rounded-full bg-[#181113] hover:bg-[#2b000a] text-white px-7 py-2.5 font-bold text-sm shadow-xs disabled:opacity-40 transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </form>
              ) : (
                /* Collapsed Step 1 */
                <div className="p-5 sm:p-6 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a7f46] text-white text-xs font-bold">
                      <Check className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#181113]">Contact details</h3>
                      <p className="mt-1 text-xs font-semibold text-stone-800">
                        {firstName} {lastName}
                      </p>
                      <p className="text-xs text-stone-500">
                        {email} · {phone}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#800020] hover:underline"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* STEP 2: Stay Details */}
            <div
              className={`rounded-3xl border bg-white transition-all shadow-xs ${
                activeStep === 2
                  ? "border-stone-300 ring-1 ring-stone-200"
                  : "border-stone-200/90"
              }`}
            >
              {activeStep === 2 ? (
                <form onSubmit={handleNextFromStay} className="p-6 sm:p-8 space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181113] text-sm font-bold text-white">
                      2
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-[#181113]">Stay details</h2>
                    </div>
                  </div>

                  {/* Summary preview of listing */}
                  <div className="flex items-center gap-4 rounded-2xl border border-stone-200/80 bg-stone-50/60 p-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-200">
                      <Image
                        src={listingImage()}
                        alt={listing.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1a7f46]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Free cancellation before check-in
                      </div>
                      <h4 className="mt-0.5 truncate text-sm font-bold text-[#181113]">
                        {listing.title || listing.name}
                      </h4>
                      <p className="text-xs text-stone-500">
                        {bookingTypeLabel()} · {bookingDateLabel()} · {guests} guest{guests === "1" ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {/* Stay inputs if guest wants to adjust */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <Label htmlFor="step-checkin" className="text-xs font-bold text-stone-700">
                        Check-in Date
                      </Label>
                      <Input
                        id="step-checkin"
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="mt-1 h-11 rounded-xl border-stone-300 text-sm focus-visible:border-[#800020]"
                      />
                    </div>

                    {category === "overnight" ? (
                      <div>
                        <Label htmlFor="step-checkout" className="text-xs font-bold text-stone-700">
                          Check-out Date
                        </Label>
                        <Input
                          id="step-checkout"
                          type="date"
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                          className="mt-1 h-11 rounded-xl border-stone-300 text-sm focus-visible:border-[#800020]"
                        />
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="step-duration" className="text-xs font-bold text-stone-700">
                          Hours ({duration} hrs)
                        </Label>
                        <Input
                          id="step-duration"
                          type="number"
                          min="1"
                          max="24"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="mt-1 h-11 rounded-xl border-stone-300 text-sm focus-visible:border-[#800020]"
                        />
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <Label htmlFor="step-guests" className="text-xs font-bold text-stone-700">
                        Number of Guests
                      </Label>
                      <div className="relative mt-1">
                        <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <Input
                          id="step-guests"
                          type="number"
                          min="1"
                          max="20"
                          value={guests}
                          onChange={(e) => setGuests(e.target.value)}
                          className="h-11 rounded-xl border-stone-300 pl-10 text-sm focus-visible:border-[#800020]"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="step-note" className="text-xs font-bold text-stone-700">
                        Special Requests or Note to Host (Optional)
                      </Label>
                      <Textarea
                        id="step-note"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Estimated arrival time, early luggage drop, or any questions for the host..."
                        className="mt-1 rounded-xl border-stone-300 text-xs text-stone-800 placeholder:text-stone-400 focus-visible:border-[#800020]"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveStep(1)}
                      className="text-xs font-bold text-stone-500 hover:text-stone-800"
                    >
                      ← Back
                    </button>
                    <Button
                      type="submit"
                      className="rounded-full bg-[#181113] hover:bg-[#2b000a] text-white px-7 py-2.5 font-bold text-sm shadow-xs transition-all"
                    >
                      Next
                    </Button>
                  </div>
                </form>
              ) : (
                /* Collapsed Step 2 */
                <div className="p-5 sm:p-6 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        completedSteps.has(2)
                          ? "bg-[#1a7f46] text-white"
                          : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {completedSteps.has(2) ? <Check className="h-4 w-4" /> : "2"}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#181113]">Stay details</h3>
                      <p className="mt-1 text-xs text-stone-600">
                        {bookingTypeLabel()} · {bookingDateLabel()} · {guests} guest{guests === "1" ? "" : "s"}
                      </p>
                    </div>
                  </div>
                  {completedSteps.has(1) && (
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#800020] hover:underline"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* STEP 3: Payment & Confirmation */}
            <div
              className={`rounded-3xl border bg-white transition-all shadow-xs ${
                activeStep === 3
                  ? "border-stone-300 ring-1 ring-stone-200"
                  : "border-stone-200/90"
              }`}
            >
              {activeStep === 3 ? (
                <div className="p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181113] text-sm font-bold text-white">
                      3
                    </span>
                    <div>
                      <h2 className="text-xl font-bold text-[#181113]">Payment & Confirmation</h2>
                    </div>
                  </div>

                  {/* Payment Mode Note */}
                  <div className="rounded-2xl border border-stone-200/90 bg-[#fbf7f8] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#800020]" />
                      <span className="text-xs font-bold text-stone-800">
                        No immediate card charge
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      You will pay directly upon arrival or via M-Pesa once the host accepts and confirms your reservation. Exact host phone, WhatsApp, and check-in door instructions will be unlocked.
                    </p>
                  </div>

                  {/* Booking Agreement & Rules */}
                  <div className="space-y-2 pt-1 text-xs text-stone-500">
                    <p>
                      By selecting <strong>Complete reservation</strong>, you agree to the host house rules and Beddn Terms of Service.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="text-xs font-bold text-stone-500 hover:text-stone-800"
                    >
                      ← Back
                    </button>
                    <Button
                      type="button"
                      onClick={handleCompleteReservation}
                      disabled={submitting || isOwnListing}
                      className="rounded-full bg-[#800020] hover:bg-[#600018] text-white px-8 py-3.5 text-base font-bold shadow-md transition-all disabled:opacity-50"
                    >
                      {submitting ? "Sending Request..." : "Complete reservation"}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Collapsed Step 3 */
                <div className="p-5 sm:p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-xs font-bold text-stone-600">
                      3
                    </span>
                    <h3 className="text-sm font-bold text-stone-500">Payment & Confirmation</h3>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ================= RIGHT COLUMN: STICKY TRIPADVISOR-STYLE SUMMARY ================= */}
          <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-24 self-start">
            {/* Spot hold alert (TripAdvisor style) */}
            <div className="rounded-2xl border border-red-100 bg-[#fef2f2] px-4 py-2.5 text-xs text-red-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-600 shrink-0" />
              <span>
                We&apos;ll hold your spot for <strong className="font-bold text-red-700">{formatTimer(timeLeft)}</strong> minutes
              </span>
            </div>

            {/* Property Summary Card */}
            <div className="overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-sm">
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base font-bold text-[#181113] leading-snug line-clamp-2">
                      {listing.title || listing.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                      <div className="flex items-center text-[#800020]">
                        <Star className="h-3.5 w-3.5 fill-[#800020]" />
                        <span className="ml-1 font-bold">{avgRating.toFixed(1)}</span>
                      </div>
                      <span>({reviews.length || 1} {reviews.length === 1 ? "review" : "reviews"})</span>
                    </div>
                    {listing.area && (
                      <p className="mt-1 text-xs text-stone-500 truncate">
                        {listing.area}, {listing.city}
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

                <hr className="border-stone-100" />

                {/* Booking Facts */}
                <div className="space-y-2 text-xs text-stone-700">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Stay mode</span>
                    <span className="font-bold capitalize">{bookingTypeLabel()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Dates</span>
                    <span className="font-semibold text-right max-w-[65%] truncate">
                      {bookingDateLabel()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Guests</span>
                    <span className="font-semibold">{guests} guest{guests === "1" ? "" : "s"}</span>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="text-xs font-bold text-[#800020] hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <hr className="border-stone-100" />

                {/* Guarantees */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-[#1a7f46]">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Free cancellation before check-in time</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-600">
                    <Sparkles className="h-4 w-4 text-[#800020] shrink-0 mt-0.5" />
                    <span>Beddn verified host &amp; authentic stay guarantee</span>
                  </div>
                </div>

                <hr className="border-stone-100" />

                {/* Promo Code Box */}
                <div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter promo code"
                      className="h-9 rounded-xl border-stone-300 text-xs"
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (promoCode.trim()) setPromoApplied(true);
                      }}
                      variant="outline"
                      className="h-9 rounded-xl border-stone-300 px-4 text-xs font-bold text-stone-700 hover:border-stone-400"
                    >
                      Apply
                    </Button>
                  </div>
                  {promoApplied && (
                    <p className="mt-1.5 text-[11px] font-semibold text-[#1a7f46]">
                      ✓ Promo code applied
                    </p>
                  )}
                </div>

                <hr className="border-stone-100" />

                {/* Price Breakdown */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-base font-extrabold text-[#181113]">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Taxes and local fees included · Pay upon arrival
                  </p>
                </div>
              </div>
            </div>

            {/* 24/7 Global Support (TripAdvisor style) */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 text-xs text-stone-600 space-y-2">
              <h4 className="font-bold text-[#181113]">24/7 Beddn Support</h4>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-stone-700">
                <a
                  href="tel:+254700000000"
                  className="inline-flex items-center gap-1.5 hover:text-[#800020] transition"
                >
                  <Phone className="h-3.5 w-3.5 text-[#800020]" />
                  +254 700 000 000
                </a>
                <a
                  href="https://wa.me/254700000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[#1a7f46] transition"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
                  Chat now
                </a>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
