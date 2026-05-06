"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Booking, Listing } from "@/lib/types";

interface AvailabilitySlot {
  id: string;
  listing_id: string;
  start_datetime: string;
  end_datetime: string;
  booked_units: number;
  available_units: number;
  status: string;
  listing?: Pick<Listing, "name" | "title">;
}

export default function CalendarPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingId, setListingId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  async function load() {
    const [bookingsRes, slotsRes, listingsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, listing:listings(name, title)")
        .in("status", ["paid_pending_host", "confirmed", "completed"])
        .order("start_datetime", { ascending: true }),
      supabase
        .from("availability_slots")
        .select("*, listing:listings(name, title)")
        .order("start_datetime", { ascending: true })
        .limit(100),
      supabase.from("listings").select("*").order("created_at", { ascending: false }),
    ]);

    setBookings((bookingsRes.data as Booking[]) ?? []);
    setSlots((slotsRes.data as AvailabilitySlot[]) ?? []);
    setListings((listingsRes.data as Listing[]) ?? []);
    setListingId((listingsRes.data?.[0]?.id as string | undefined) ?? "");
  }

  useEffect(() => {
    load();
  }, []);

  async function blockSlot(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/availability/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        startDatetime: `${date}T${startTime}:00`,
        endDatetime: `${date}T${endTime}:00`,
      }),
    });

    if (!response.ok) {
      alert("Could not block this slot.");
      return;
    }
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Calendar</h1>

      <form onSubmit={blockSlot} className="border rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <Label>Listing</Label>
          <select
            className="w-full border rounded-md h-10 px-3"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
          >
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title || listing.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <Label>Start</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
        </div>
        <div>
          <Label>End</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
        </div>
        <Button type="submit" className="bg-[#800020] hover:bg-[#600018]">
          Block slot
        </Button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="font-semibold mb-3">Bookings</h2>
          <div className="border rounded-lg divide-y">
            {bookings.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No upcoming bookings.</p>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="p-4 text-sm">
                  <p className="font-medium">{booking.guest_name}</p>
                  <p className="text-muted-foreground">
                    {booking.start_datetime?.replace("T", " ").slice(0, 16)} · {booking.status}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3">Blocked/unavailable slots</h2>
          <div className="border rounded-lg divide-y">
            {slots.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No blocked slots.</p>
            ) : (
              slots.map((slot) => (
                <div key={slot.id} className="p-4 text-sm">
                  <p className="font-medium">{slot.listing?.title || slot.listing?.name}</p>
                  <p className="text-muted-foreground">
                    {slot.start_datetime.replace("T", " ").slice(0, 16)} · {slot.status} ·{" "}
                    {slot.available_units} available
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
