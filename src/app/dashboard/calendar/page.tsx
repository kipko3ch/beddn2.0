"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { CalendarDays, Clock, TicketCheck, RefreshCw, TrendingUp } from "lucide-react";
import type { Booking, Inquiry, Listing } from "@/lib/types";

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
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingId, setListingId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const [importUrl, setImportUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedListing = listings.find((listing) => listing.id === listingId);
  const isExperience = Boolean(selectedListing?.categories?.includes("experience"));
  const exportUrl =
    typeof window !== "undefined" && listingId
      ? `${window.location.origin}/api/ical/${listingId}`
      : "";

  async function runImport() {
    if (!listingId || !importUrl.trim()) return;
    setSyncing(true);
    setSyncResult("");
    const res = await fetch("/api/ical/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, url: importUrl.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setSyncResult(`Synced — ${json.imported ?? 0} date${json.imported === 1 ? "" : "s"} blocked.`);
      await load();
    } else {
      setSyncResult(json.error ?? "Sync failed. Check the URL and try again.");
    }
    setSyncing(false);
  }

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

    // Demand layer: guest inquiries (the lead/inquiry pivot replaces paid
    // bookings as the primary signal). Service-role API scopes to this host.
    try {
      const res = await fetch("/api/inquiries");
      const json: { inquiries?: Inquiry[] } = res.ok ? await res.json() : {};
      setInquiries(json.inquiries ?? []);
    } catch {
      setInquiries([]);
    }
  }

  // Aggregate demand by requested check-in date (most-requested first).
  const demandByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const inq of inquiries) {
      if (inq.check_in) map.set(inq.check_in, (map.get(inq.check_in) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.count - a.count);
  }, [inquiries]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcomingRequests = useMemo(
    () =>
      inquiries
        .filter((inq) => inq.check_in && inq.check_in >= todayKey)
        .sort((a, b) => (a.check_in ?? "").localeCompare(b.check_in ?? ""))
        .slice(0, 12),
    [inquiries, todayKey]
  );

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
        <h1 className="font-brand text-3xl text-[#2b000a]">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Block rooms, hourly slots, or experience sessions and review upcoming bookings.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border bg-[#fff8fa] p-4 shadow-sm">
        <h2 className="text-base font-bold text-[#181113]">Keep your availability easy to book</h2>
        <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <div className="rounded-xl bg-white p-3">
            <p className="font-semibold text-[#181113]">Daily rhythm</p>
            <p className="mt-1">
              Review your calendar every morning and after each accepted or rejected booking.
            </p>
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="font-semibold text-[#181113]">Stay listings</p>
            <p className="mt-1">
              Keep at least the next 30 days open, and block exact hourly or overnight slots when rooms are unavailable.
            </p>
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="font-semibold text-[#181113]">Check-in details</p>
            <p className="mt-1">
              Keep check-in and check-out times current so guests see accurate availability before reserving.
            </p>
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="font-semibold text-[#181113]">Experiences</p>
            <p className="mt-1">
              Update seats and session times weekly, especially for trips, classes, and group activities.
            </p>
          </div>
        </div>
      </section>

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

      {/* iCal sync with other platforms */}
      <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-[#800020]" />
          <h2 className="font-bold">Sync with Airbnb, Booking.com & others (iCal)</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Keep calendars in sync across platforms so you never get double-booked.
          {selectedListing ? ` Applies to “${selectedListing.title || selectedListing.name}” (selected above).` : ""}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-[#181113]">Export — Beddn → other platforms</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste this link into the other platform&apos;s &quot;Import calendar&quot; option. Your
              Beddn bookings and blocked dates will block there automatically.
            </p>
            <div className="mt-3 flex gap-2">
              <Input readOnly value={listingId ? exportUrl : ""} className="flex-1 text-xs" />
              <Button
                type="button"
                variant="outline"
                disabled={!listingId}
                onClick={async () => {
                  await navigator.clipboard.writeText(exportUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold text-[#181113]">Import — other platforms → Beddn</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste the iCal/ics export link from Airbnb or Booking.com. Those dates get blocked
              here. Re-run the sync anytime to refresh.
            </p>
            <div className="mt-3 flex gap-2">
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.airbnb.com/calendar/ical/…ics"
                className="flex-1 text-xs"
              />
              <Button
                type="button"
                disabled={!listingId || !importUrl.trim() || syncing}
                onClick={runImport}
                className="bg-[#800020] hover:bg-[#600018]"
              >
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            </div>
            {syncResult && <p className="mt-2 text-xs font-medium text-[#800020]">{syncResult}</p>}
          </div>
        </div>
      </section>

      {/* Demand calendar — organized inquiry demand, not random messages. */}
      <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#800020]" />
          <h2 className="font-bold">Demand calendar</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Dates guests have asked about through Beddn. Use this to see where demand is forming.
        </p>
        {inquiries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No inquiry demand yet. As guests check availability and send inquiries, requested dates
            appear here.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#a08b92]">
                Most requested dates
              </p>
              <div className="flex flex-wrap gap-2">
                {demandByDate.slice(0, 10).map(({ date, count }) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                    style={{
                      borderColor: "#e3d3d9",
                      background: count > 1 ? "#f8eef2" : "#fff",
                    }}
                  >
                    <span className="font-semibold text-[#2b000a]">{date}</span>
                    <span className="rounded-full bg-[#800020] px-1.5 text-xs font-bold text-white">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#a08b92]">
                Upcoming requested stays
              </p>
              <div className="divide-y rounded-xl border">
                {upcomingRequests.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No upcoming requested dates.</p>
                ) : (
                  upcomingRequests.map((inq) => (
                    <div key={inq.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-[#2b000a]">{inq.guest_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {inq.check_in}
                          {inq.check_out ? ` → ${inq.check_out}` : ""} · {inq.guests_count} guest
                          {inq.guests_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <Badge
                        className="shrink-0 rounded-full bg-[#f5f1f2] text-[11px] text-[#6f6568] hover:bg-[#f5f1f2]"
                      >
                        {inq.availability_status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Bookings</h2>
          <div className="divide-y rounded-lg border">
            {bookings.length === 0 ? (
              <EmptyState
                image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029365/empty-calendar_b4iry4.png"
                title="No upcoming bookings"
                subtitle="Confirmed bookings will appear on your calendar."
                size="sm"
              />
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
