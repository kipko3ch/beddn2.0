"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { Icon } from "@iconify/react";
import type { Payment } from "@/lib/types";

type PaymentWithBooking = Payment & {
  booking?: {
    token?: string;
    booking_token?: string;
    guest_name?: string;
    status?: string;
    listing_id?: string;
  };
};

export default function PaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<PaymentWithBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("payments")
        .select("*, booking:bookings(token, booking_token, guest_name, status, listing_id)")
        .order("created_at", { ascending: false });
      setPayments((data as PaymentWithBooking[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const statusColor: Record<string, string> = {
    initialized: "bg-amber-100 text-amber-800",
    success: "bg-emerald-100 text-emerald-800",
    failed: "bg-rose-100 text-rose-800",
    abandoned: "bg-stone-100 text-stone-600",
    refunded: "bg-blue-100 text-blue-800",
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="font-brand text-2xl sm:text-3xl font-extrabold text-[#2b000a]">Payments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time transaction history and settlement status for your listings.
          </p>
        </div>
        {payments.length > 0 && (
          <span className="text-xs font-bold text-[#800020] bg-[#fbf0f3] border border-[#f3cfd9] px-3 py-1 rounded-full w-fit">
            {payments.length} transaction{payments.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <DashboardListSkeleton rows={4} />
      ) : payments.length === 0 ? (
        <EmptyState
          image="/images/empty-payments.png"
          title="No payments yet"
          subtitle="Payment activity will show up here once guests pay."
          size="sm"
        />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const token = payment.booking?.booking_token || payment.booking?.token;
            return (
              <div
                key={payment.id}
                className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-[#f3cfd9] hover:shadow-sm transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]">
                      <Icon icon="solar:wallet-money-bold-duotone" className="size-6 text-[#800020]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-base text-[#2b000a]">
                          {payment.booking?.guest_name ?? "Guest"}
                        </p>
                        <Badge className={`text-xs capitalize font-bold ${statusColor[payment.status] ?? "bg-stone-100"}`}>
                          {payment.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {token && (
                          <span className="font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                            {token}
                          </span>
                        )}
                        <span>·</span>
                        <span>{new Date(payment.created_at).toLocaleString()}</span>
                        {payment.provider && (
                          <>
                            <span>·</span>
                            <span className="capitalize">{payment.provider}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t border-stone-100 sm:border-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-stone-400 block">Amount</span>
                      <span className="text-base font-extrabold text-[#2b000a]">
                        {payment.currency || "KES"} {Number(payment.amount).toLocaleString()}
                      </span>
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
