"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Listing, ListingCategory } from "@/lib/types";

export default function ReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<ListingCategory>("overnight");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("1");
  const [guests, setGuests] = useState("1");
  const [note, setNote] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("listings")
        .select("*, listing_images(*)")
        .eq("id", id)
        .eq("is_active", true)
        .eq("is_verified", true)
        .single();
      if (data) {
        setListing(data as Listing);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!listing || submitting) return;
    setSubmitting(true);

    const total = computeTotal();
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        listing_id: listing.id,
        guest_name: name,
        guest_phone: phone,
        check_in: checkIn,
        check_out: category === "overnight" ? checkOut : null,
        start_time: category !== "overnight" ? startTime || null : null,
        duration_hours: category === "hourly" ? parseInt(duration) : null,
        guests: parseInt(guests),
        note: note || null,
        category,
        status: "pending",
        total_amount: total,
        token: "",
      })
      .select("token")
      .single();

    if (error || !data) {
      alert("Failed to create booking. Please try again.");
      setSubmitting(false);
      return;
    }

    // Create pending payment
    const bookingId = (data as any).id ?? data;
    await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: listing.deposit_amount > 0 ? Number(listing.deposit_amount) : total,
      status: "pending",
    });

    router.push(`/booking/${data.token}`);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 animate-pulse">
        <div className="h-6 w-1/2 bg-muted rounded mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Listing not found</p>
      </div>
    );
  }

  const total = computeTotal();
  const availableCategories = listing.categories;

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-1">Reserve</h1>
      <p className="text-sm text-muted-foreground mb-6">{listing.name}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Booking type</Label>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ListingCategory)}
          >
            <SelectTrigger>
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
              required
            />
          </div>
        )}

        <div>
          <Label htmlFor="guests">Guests</Label>
          <Input
            id="guests"
            type="number"
            min="1"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <div className="border rounded-lg p-4 bg-muted/50 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total</span>
            <span className="font-semibold">${total.toLocaleString()}</span>
          </div>
          {listing.deposit_amount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Deposit required</span>
              <span>${Number(listing.deposit_amount).toLocaleString()}</span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting || !name || !phone || !checkIn}
          className="w-full bg-[#800020] hover:bg-[#600018]"
          size="lg"
        >
          {submitting ? "Creating booking..." : "Confirm reservation"}
        </Button>
      </form>
    </main>
  );
}
