"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, TicketCheck } from "lucide-react";
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
  const supabase = useMemo(() => createClient(), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingId, setListingId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const selectedListing = listings.find((listing) => listing.id === listingId);
  const isExperience = Boolean(selectedListing?.categories?.includes("experience"));

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
  }, [supabase]);

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
      alert(isExperience ? "Could not block this session." : "Could not block this slot.");
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Block rooms, hourly slots, or experience sessions and review upcoming bookings.
        </p>
      </div>

      <form onSubmit={blockSlot} className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          {isExperience ? (
            <TicketCheck className="h-5 w-5 text-[#800020]" />
          ) : (
            <CalendarDays className="h-5 w-5 text-[#800020]" />
          )}
          <h2 className="font-bold">
            {isExperience ? "Block an experience session" : "Block a stay slot"}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5 md:items-end">
          <div>
            <Label>Listing</Label>
            <select
              className="h-10 w-full rounded-md border px-3"
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
            <Label>{isExperience ? "Session date" : "Date"}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <Label>{isExperience ? "Session start" : "Start"}</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div>
            <Label>{isExperience ? "Session end" : "End"}</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
          <Button type="submit" className="bg-[#800020] hover:bg-[#600018]">
            {isExperience ? "Block session" : "Block slot"}
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Bookings</h2>
          <div className="divide-y rounded-lg border">
            {bookings.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No upcoming bookings.</p>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="p-4 text-sm">
                  <p className="font-medium">{booking.guest_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{booking.start_datetime?.replace("T", " ").slice(0, 16)}</span>
                    <Badge variant="secondary" className="rounded-full capitalize">
                      {booking.category}
                    </Badge>
                    <Badge className="rounded-full bg-[#f8eef2] text-[#800020] hover:bg-[#f8eef2]">
                      {booking.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Blocked/unavailable slots</h2>
          <div className="divide-y rounded-lg border">
            {slots.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No blocked slots.</p>
            ) : (
              slots.map((slot) => (
                <div key={slot.id} className="p-4 text-sm">
                  <p className="font-medium">{slot.listing?.title || slot.listing?.name}</p>
                  <p className="text-muted-foreground">
                    {slot.start_datetime.replace("T", " ").slice(0, 16)} - {slot.status} -{" "}
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
