"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
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
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { data: hostData }] = await Promise.all([
        supabase.from("profiles").select("is_admin").eq("id", userData.user.id).maybeSingle(),
        supabase.from("hosts").select("id").eq("user_id", userData.user.id).maybeSingle(),
      ]);

      const isAdmin = profile?.is_admin ?? false;
      const hostId = hostData?.id;

      if (!isAdmin && !hostId) {
        setBookings([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from("bookings")
        .select("*, listing:listings(name, title, slug)")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("host_id", hostId);
      }

      const { data } = await query;
      setBookings((data as BookingWithListing[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const statusColor: Record<string, string> = {
    requested: "bg-amber-100 text-amber-800",
    pending_payment: "bg-yellow-100 text-yellow-800",
    paid_pending_host: "bg-amber-100 text-amber-800",
    confirmed: "bg-rose-100 text-crimson",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800",
    disputed: "bg-purple-100 text-purple-800",
  };

  const needsAction = (status: string) => status === "requested" || status === "paid_pending_host";

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
      <h1 className="text-2xl font-bold mb-6">Bookings</h1>
      {loading ? <DashboardListSkeleton rows={4} /> : bookings.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029373/empty-bookings_dpa4kz.png"
          title="No bookings yet"
          subtitle="Paid booking requests from guests will appear here."
          size="sm"
        />
      ) : (
        <div className="border rounded-lg divide-y">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              <Link href={`/booking/${booking.booking_token || booking.token}`} className="min-w-0">
                <p className="font-medium">{booking.guest_name}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.listing?.title || booking.listing?.name} ·{" "}
                  {booking.check_in || booking.start_datetime?.slice(0, 10)}
                </p>
                <code className="text-xs text-muted-foreground">
                  {booking.booking_token || booking.token}
                </code>
              </Link>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="text-sm font-medium">
                  {booking.currency || "$"}{" "}
                  {Number(booking.deposit_amount || booking.total_amount).toLocaleString()}
                </span>
                <Badge className={statusColor[booking.status] ?? ""}>
                  {booking.status.replaceAll("_", " ")}
                </Badge>
                {needsAction(booking.status) && (
                  <>
                    <Button
                      size="sm"
                      className="bg-[#128c4b] hover:bg-[#0f7a41]"
                      onClick={() => bookingAction(booking.id, "accept")}
                      disabled={workingId === booking.id}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bookingAction(booking.id, "reject")}
                      disabled={workingId === booking.id}
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
                  >
                    Mark completed
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
