"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
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
    initialized: "bg-yellow-100 text-yellow-800",
    success: "bg-rose-100 text-crimson",
    failed: "bg-red-100 text-red-800",
    abandoned: "bg-muted text-muted-foreground",
    refunded: "bg-blue-100 text-blue-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payments</h1>
      {loading ? null : payments.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029374/empty-payments_g2drbi.png"
          title="No payments yet"
          subtitle="Payment activity will show up here once guests pay."
          size="sm"
        />
      ) : (
        <div className="border rounded-lg divide-y">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">
                  {payment.booking?.guest_name ?? "Unknown"}
                </p>
                <code className="text-xs text-muted-foreground">
                  {payment.booking?.booking_token || payment.booking?.token}
                </code>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {payment.currency || "$"} {Number(payment.amount).toLocaleString()}
                </span>
                <Badge className={statusColor[payment.status] ?? ""}>
                  {payment.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
