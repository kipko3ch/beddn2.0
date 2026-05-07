"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/header";
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
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  TicketCheck,
  Users,
} from "lucide-react";
import type { Listing, ListingCategory, Review } from "@/lib/types";

type ReserveListing = Listing & { reviews?: Pick<Review, "rating">[] };

export default function ReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();

  const [listing, setListing] = useState<ReserveListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<ListingCategory>("overnight");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("1");
  const [guests, setGuests] = useState("1");
  const [units, setUnits] = useState("1");
  const [note, setNote] = useState("");

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
        if (data.categories?.length === 1) {
          setCategory(data.categories[0] as ListingCategory);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

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
    return listing?.listing_images?.[0]?.url || "/logo.png";
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
    setSubmitting(true);

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
        note: note || null,
      }),
    });

    const result = (await response.json()) as {
      authorizationUrl?: string;
      error?: string;
    };

    if (!response.ok || !result.authorizationUrl) {
      alert(result.error || "Failed to initialize payment. Please try again.");
      setSubmitting(false);
      return;
    }

    window.location.href = result.authorizationUrl;
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
            <div className="h-96 animate-pulse rounded-2xl bg-muted" />
          </div>
        </div>
      </>
    );
  }

  if (!listing) {
    return (
      <>
        <Header />
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

  return (
    <>
      <Header />
      <main className="bg-white px-4 py-6 text-[#181113] sm:px-6 lg:px-8">
        <form
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div className="space-y-5">
            <section className="rounded-2xl border border-[#800020] bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#800020] text-sm font-bold text-white">
                  1
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Contact details</h1>
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

            <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Booking details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose your stay type, date, guests, and units before paying the reserve fee.
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
                  <Label htmlFor="checkIn">
                    {category === "experience" ? "Session date" : "Check-in date"}
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
                  <Label htmlFor="guests">Guests</Label>
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
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold">
                  3
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Payment details</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pay the reserve fee through Paystack. We verify the payment on the backend.
                  </p>
                </div>
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
                      event.currentTarget.src = "/logo.png";
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
                        {guests} guest{guests === "1" ? "" : "s"}
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
                  disabled={submitting || !firstName || !lastName || !phone || !checkIn}
                  className="mt-2 h-11 w-full rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
                >
                  <CreditCard className="h-4 w-4" />
                  {submitting ? "Opening Paystack..." : "Pay reserve fee"}
                </Button>
                <p className="flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Paystack is verified on our backend before the host is alerted.
                </p>
              </div>
            </div>
          </aside>
        </form>
      </main>
    </>
  );
}
