"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { toastManager } from "@/components/ui/toast";
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

      query = query.eq("host_id", hostId);

      const { data } = await query;
      const items = (data as BookingWithListing[]) ?? [];
      setBookings(items);
      setLoading(false);

      const actionCount = items.filter((b) => needsAction(b.status)).length;
      if (actionCount > 0) {
        toastManager.add({
          title: "Confirmation Required",
          description: `You have ${actionCount} booking request${actionCount > 1 ? "s" : ""} waiting for your response.`,
          type: "warning",
          timeout: 7000,
        });
      }
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
      toastManager.add({
        title: "Action Failed",
        description: "Could not update booking status.",
        type: "error",
      });
      setWorkingId(null);
      return;
    }

    const result = (await response.json()) as { status: Booking["status"] };
    setBookings((prev) =>
      prev.map((booking) =>
        booking.id === id ? { ...booking, status: result.status } : booking
      )
    );
    toastManager.add({
      title: action === "accept" ? "Booking Confirmed" : action === "reject" ? "Booking Rejected" : "Booking Completed",
      description: action === "accept" ? "The guest has been notified and dates are reserved." : undefined,
      type: action === "reject" ? "info" : "success",
    });
    setWorkingId(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a]">Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your incoming guest reservations, arrival dates, and payment states.
          </p>
        </div>
        {bookings.length > 0 && (
          <span className="text-xs font-bold text-[#800020] bg-[#fbf0f3] border border-[#f3cfd9] px-3 py-1 rounded-full w-fit">
            {bookings.length} total booking{bookings.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <DashboardListSkeleton rows={4} />
      ) : bookings.length === 0 ? (
        <EmptyState
          image="/images/empty-bookings.png"
          title="No bookings yet"
          subtitle="Paid booking requests from guests will appear here."
          size="sm"
        />
      ) : (
        <div className="space-y-3.5">
          {bookings.map((booking) => {
            const token = booking.booking_token || booking.token;
            const dates = booking.check_in
              ? `${booking.check_in}${booking.check_out ? ` → ${booking.check_out}` : ""}`
              : booking.start_datetime?.slice(0, 10) || "Flexible";

            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-stone-200/90 bg-white p-4.5 sm:p-5 shadow-xs hover:border-[#f3cfd9] hover:shadow-sm transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9] font-bold text-sm">
                      {(booking.guest_name || "G")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/booking/${token}`}
                          className="font-bold text-base text-[#2b000a] hover:text-[#800020] hover:underline transition truncate"
                        >
                          {booking.guest_name || "Guest"}
                        </Link>
                        <Badge className={`text-xs capitalize font-bold ${statusColor[booking.status] ?? "bg-stone-100"}`}>
                          {booking.status.replaceAll("_", " ")}
                        </Badge>
                      </div>

                      <p className="mt-1 text-sm font-medium text-stone-700 truncate">
                        {booking.listing?.title || booking.listing?.name || "Listing space"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          📅 {dates}
                        </span>
                        <span>·</span>
                        <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-600">
                          {token}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end justify-between gap-3 pt-3 sm:pt-0 border-t border-stone-100 sm:border-0">
                    <div className="text-left sm:text-right">
                      <span className="text-xs uppercase font-bold tracking-wider text-stone-400 block">Total</span>
                      <span className="text-base font-extrabold text-[#2b000a]">
                        {booking.currency || "KES"}{" "}
                        {Number(booking.deposit_amount || booking.total_amount || 0).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/booking/${token}`}
                        className="inline-flex h-8 items-center rounded-full border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition"
                      >
                        Details
                      </Link>

                      {needsAction(booking.status) && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 rounded-full bg-[#128c4b] hover:bg-[#0f7a41] text-xs font-bold"
                            onClick={() => bookingAction(booking.id, "accept")}
                            disabled={workingId === booking.id}
                          >
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full text-xs font-bold"
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
                          className="h-8 rounded-full text-xs font-bold border-[#800020]/30 text-[#800020] hover:bg-[#fbf0f3]"
                          onClick={() => bookingAction(booking.id, "complete")}
                          disabled={workingId === booking.id}
                        >
                          Mark completed
                        </Button>
                      )}
                    </div>
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
