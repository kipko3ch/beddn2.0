"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/lib/types";

type BookingWithListing = Booking & {
  listing?: {
    name?: string;
    title?: string;
    slug?: string;
  };
};

export default function BookingsPage() {
  const supabase = createClient();
  const [bookings, setBookings] = useState<BookingWithListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("bookings")
        .select("*, listing:listings(name, title, slug)")
        .order("created_at", { ascending: false });
      setBookings((data as BookingWithListing[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const statusColor: Record<string, string> = {
    pending_payment: "bg-yellow-100 text-yellow-800",
    paid_pending_host: "bg-amber-100 text-amber-800",
    confirmed: "bg-rose-100 text-[#800020]",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800",
    disputed: "bg-purple-100 text-purple-800",
  };

  async function bookingAction(id: string, action: "accept" | "reject" | "complete") {
    setWorkingId(id);
    const response = await fetch(`/api/bookings/${id}/${action}`, {
      method: "POST",
    });

    if (!response.ok) {
      alert("Could not update booking.");
      setWorkingId(null);
      return;
    }

    const result = (await response.json()) as { status: Booking["status"] };
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, status: result.status } : booking
      )
    );
    setWorkingId(null);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Bookings</h1>
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex animate-pulse flex-col gap-4 rounded-xl border bg-white p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
              <div className="space-y-2">
                <div className="h-5 w-32 rounded bg-muted" />
                <div className="h-4 w-48 rounded bg-muted" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-24 rounded-full bg-muted" />
                <div className="h-9 w-24 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">No bookings yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isNegotiation = booking.note?.toLowerCase().includes("negotiate") || booking.note?.toLowerCase().includes("offer");

            return (
            <div
              key={booking.id}
              className="flex flex-col justify-between gap-4 rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-bold text-lg leading-tight">{booking.guest_name}</p>
                  <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs ${statusColor[booking.status] ?? ""}`}>
                    {booking.status.replaceAll("_", " ")}
                  </Badge>
                </div>
                <Link href={`/booking/${booking.booking_token || booking.token}`} className="block group">
                  <p className="text-sm font-medium text-[#181113] group-hover:underline">
                    {booking.listing?.title || booking.listing?.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{booking.check_in || booking.start_datetime?.slice(0, 10)}</span>
                    <span>·</span>
                    <code className="text-xs">{booking.booking_token || booking.token}</code>
                  </div>
                </Link>

                {booking.note && (
                  <div className={`mt-4 rounded-lg p-3 text-sm border ${isNegotiation ? "bg-[#fbf7f8] border-[#800020]/20 text-[#181113]" : "bg-neutral-50 text-neutral-700"}`}>
                    {isNegotiation && (
                      <span className="mb-1 block font-bold text-[#800020] flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Price negotiation request
                      </span>
                    )}
                    <p className="whitespace-pre-line">{booking.note}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <div className="text-right">
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reserve Fee Paid</span>
                  <span className="text-lg font-bold text-[#181113]">
                    {booking.currency || "$"}{" "}
                    {Number(booking.deposit_amount || booking.total_amount).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {booking.status === "paid_pending_host" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => bookingAction(booking.id, "accept")}
                        disabled={workingId === booking.id}
                        className="rounded-full bg-[#800020] px-5 hover:bg-[#600018]"
                      >
                        {workingId === booking.id ? "Processing..." : "Accept request"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => bookingAction(booking.id, "reject")}
                        disabled={workingId === booking.id}
                        className="rounded-full px-5"
                      >
                        Decline
                      </Button>
                    </>
                  )}
                  {booking.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bookingAction(booking.id, "complete")}
                      disabled={workingId === booking.id}
                      className="rounded-full"
                    >
                      {workingId === booking.id ? "Processing..." : "Mark completed"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
