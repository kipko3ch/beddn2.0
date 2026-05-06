"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
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
    success: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    abandoned: "bg-muted text-muted-foreground",
    refunded: "bg-blue-100 text-blue-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payments</h1>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <p className="text-muted-foreground">No payments yet.</p>
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
