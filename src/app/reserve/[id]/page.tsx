"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthDialog } from "@/components/auth-dialog";
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
  ChevronLeft,
  HandCoins,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
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
    <header className="border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="font-brand text-2xl leading-none text-[#2b000a]">Beddn</span>
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

export default function ReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [listing, setListing] = useState<ReserveListing | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOwnListing, setIsOwnListing] = useState(false);
  const [step, setStep] = useState(0);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

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
      // Public route (service role) so the listing always loads; booking
      // itself still requires a signed-in user below.
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

  async function pay() {
    if (!listing || submitting) return;
    if (isOwnListing) {
      alert("Hosts cannot reserve their own listing.");
      return;
    }
    setSubmitting(true);

    // Better-price requests go to the admin dashboard, not the host note alone.
    if (wantsNegotiation) {
      await fetch("/api/negotiations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          offerAmount,
          message: negotiationMessage,
          guestName: `${firstName} ${lastName}`.trim(),
          guestPhone: phone,
        }),
      }).catch(() => undefined);
    }

    const negotiationNote = wantsNegotiation
      ? [
          "Guest asked for a better price.",
          offerAmount ? `Offer: ${listing.currency || "KES"} ${offerAmount}` : null,
          negotiationMessage ? `Message: ${negotiationMessage}` : null,
        ]
          .filter(Boolean)
          .join(" ")
      : "";
    const hostNote = [note, negotiationNote].filter(Boolean).join("\n\n") || null;

    const response = await fetch("/api/bookings/request", {
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
      ok?: boolean;
      bookingToken?: string;
      error?: string;
    };

    if (!response.ok || !result.ok) {
      alert(result.error || "Could not send your request. Please try again.");
      setSubmitting(false);
      return;
    }

    setSubmittedCode(result.bookingToken || "sent");
    setSubmitting(false);
  }

  if (loading) {
    return <ReserveSkeleton />;
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

  // Booking is for registered users only — browsing stays open to everyone.
  if (!user) {
    return (
      <>
        <CheckoutHeader backHref={`/property/${listing.slug}`} />
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
          <UserCircle className="mb-5 h-14 w-14 text-[#800020]" />
          <h1 className="text-2xl font-bold">Sign in to reserve</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Create a free account or log in to book{" "}
            <span className="font-semibold text-[#181113]">
              {listing.title || listing.name}
            </span>
            . It takes less than a minute.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <AuthDialog>
              <Button className="h-11 rounded-full bg-[#800020] px-6 font-bold hover:bg-[#600018]">
                Login or sign up
              </Button>
            </AuthDialog>
            <Link
              href={`/property/${listing.slug}`}
              className="inline-flex h-11 items-center rounded-full border px-6 text-sm font-semibold hover:bg-muted"
            >
              Back to listing
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (submittedCode) {
    return (
      <>
        <CheckoutHeader backHref={`/property/${listing.slug}`} />
        <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
          <TicketCheck className="mb-5 h-14 w-14 text-[#128c4b]" />
          <h1 className="font-brand text-3xl text-[#2b000a]">Request sent to the host</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your booking request for{" "}
            <span className="font-semibold text-[#181113]">{listing.title || listing.name}</span> is
            with the host. You&apos;ll get a message once they confirm — then the exact address and
            contact unlock.
          </p>
          {submittedCode !== "sent" && (
            <p className="mt-4 rounded-full bg-[#fbf7f8] px-4 py-2 text-sm font-semibold text-[#800020]">
              Ref: {submittedCode}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/property/${listing.slug}`}
              className="inline-flex h-11 items-center rounded-full border px-6 text-sm font-semibold hover:bg-muted"
            >
              Back to listing
            </Link>
            <Link
              href="/search"
              className="inline-flex h-11 items-center rounded-full bg-[#800020] px-6 text-sm font-bold text-white hover:bg-[#600018]"
            >
              Explore more stays
            </Link>
          </div>
        </main>
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

  const stepOneValid = Boolean(
    checkIn &&
      (category !== "overnight" || checkOut) &&
      (category === "overnight" || startTime)
  );
  const stepTwoValid = Boolean(firstName.trim() && lastName.trim() && phone.trim().length >= 7);

  const steps = [
    { title: "Booking details", valid: stepOneValid },
    { title: "Your details", valid: stepTwoValid },
    { title: "Review & pay", valid: true },
  ];
  const lastStep = steps.length - 1;

  function next() {
    if (!steps[step].valid) return;
    setStep((s) => Math.min(s + 1, lastStep));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <>
      <CheckoutHeader backHref={`/property/${listing.slug}`} />
      <main className="bg-[#fffdfd] px-4 pb-32 pt-6 text-[#181113] sm:px-6 lg:px-8 lg:pb-12">
        <div className="mx-auto mb-6 max-w-6xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[#800020]">
            Reserve your spot
          </p>
          <h1 className="mt-1 font-brand text-3xl tracking-tight text-[#2b000a] sm:text-4xl">
            {listing.title || listing.name}
          </h1>

          {/* Stepper */}
          <div className="mt-4 flex items-center gap-2">
            {steps.map((s, i) => (
              <button
                key={s.title}
                type="button"
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                className="flex flex-1 flex-col gap-1.5 text-left"
              >
                <span
                  className={`h-1.5 w-full rounded-full ${
                    i <= step ? "bg-[#800020]" : "bg-[#f1e6ea]"
                  }`}
                />
                <span
                  className={`text-xs font-semibold ${
                    i === step ? "text-[#800020]" : "text-muted-foreground"
                  }`}
                >
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {isOwnListing && (
              <div className="rounded-2xl border border-[#800020] bg-[#fbf7f8] p-5 text-sm text-muted-foreground">
                <p className="font-bold text-[#181113]">You are the host for this listing</p>
                <p className="mt-1">
                  Hosts cannot reserve their own homes or experiences. Use the dashboard to
                  manage availability instead.
                </p>
              </div>
            )}

            {step === 0 && (
              <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold tracking-tight">When are you coming?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm the dates, guests, and anything the host should know.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                    <Label htmlFor="checkIn">
                      {isExperience ? "Session date" : "Check-in date"}
                    </Label>
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
                        min={listing.minimum_hours || 1}
                        max="24"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="mt-1 h-11 border-neutral-400 focus-visible:border-[#800020]"
                        required
                      />
                      {(listing.minimum_hours ?? 1) > 1 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Minimum {listing.minimum_hours} hours.
                        </p>
                      )}
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
                    <Label htmlFor="note">Note to host (optional)</Label>
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
                          Ask for a better price
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          Your request goes to the Beddn team, who negotiate with the host.
                          Useful for longer stays, repeat visits, or group bookings.
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
            )}

            {step === 1 && (
              <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold tracking-tight">Who&apos;s booking?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  The host sees your first name. Your phone is shared only after the booking is
                  confirmed.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                    <Label htmlFor="phone">Phone number *</Label>
                    <div className="relative mt-1">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+254..."
                        className="h-11 border-neutral-400 pl-10 focus-visible:border-[#800020]"
                        required
                      />
                    </div>
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
                        placeholder="For your payment receipt"
                        className="h-11 border-neutral-400 pl-10 focus-visible:border-[#800020]"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="rounded-3xl border bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold tracking-tight">Review your request</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Send your request to the host. Track everything from your Beddn account — the host
                  contact and exact address unlock after the host confirms.
                </p>

                <dl className="mt-5 divide-y rounded-xl border text-sm">
                  {[
                    ["Booking", bookingTypeLabel()],
                    ["Dates", bookingDateLabel()],
                    [
                      isExperience ? "Seats" : "Guests",
                      `${guests}${(listing.total_units ?? 1) > 1 ? ` · ${units} unit${units === "1" ? "" : "s"}` : ""}`,
                    ],
                    ["Guest", `${firstName} ${lastName}`.trim()],
                    ["Phone", phone],
                    ...(wantsNegotiation
                      ? [["Better price", offerAmount ? money(Number(offerAmount)) : "Requested"] as [string, string]]
                      : []),
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 p-3">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="max-w-[60%] truncate text-right font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                  {[
                    "Booking updates appear in your Beddn account.",
                    "Hosts confirm or reject paid requests.",
                    "Rejected requests are refunded after review.",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl bg-[#fbf7f8] p-4 text-muted-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Order summary */}
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
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
                        <span className="text-muted-foreground">New place</span>
                      )}
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {listing.area}, {listing.city}
                    </p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
                        {guests} {isExperience ? "seat" : "guest"}
                        {guests === "1" ? "" : "s"}
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

              <div className="space-y-3 border-t bg-[#fbf7f8] p-5">
                <div className="flex justify-between text-sm">
                  <span>Estimated stay total</span>
                  <span className="font-semibold">{money(total)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Pay the host on arrival</span>
                  <span>{money(total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  No payment now — you arrange payment with the host after they confirm your request.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={back}
              className="h-11 shrink-0 rounded-full px-5"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          ) : (
            <Link
              href={`/property/${listing.slug}`}
              className="flex h-11 shrink-0 items-center justify-center rounded-full border px-4 text-sm font-semibold"
            >
              Back
            </Link>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Pay on arrival</p>
            <p className="truncate font-bold">{money(total)}</p>
          </div>
          {step < lastStep ? (
            <Button
              type="button"
              onClick={next}
              disabled={!steps[step].valid}
              className="h-11 rounded-full bg-[#800020] px-6 font-bold hover:bg-[#600018]"
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={pay}
              disabled={submitting || isOwnListing || !stepOneValid || !stepTwoValid}
              className="h-11 rounded-full bg-[#800020] px-6 font-bold hover:bg-[#600018]"
            >
              <TicketCheck className="mr-1 h-4 w-4" />
              {submitting ? "Sending…" : "Send booking request"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
