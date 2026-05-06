"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Payment } from "@/lib/types";

export default function PaymentsPage() {
  const supabase = createClient();
  const [payments, setPayments] = useState<(Payment & { booking?: any })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("payments")
        .select("*, booking:bookings(token, guest_name, status, listing_id)")
        .order("created_at", { ascending: false });
      setPayments(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function markPaid(paymentId: string, bookingId: string) {
    await supabase.from("payments").update({ status: "paid" }).eq("id", paymentId);
    await supabase.from("bookings").update({ status: "paid" }).eq("id", bookingId);
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? { ...p, status: "paid" as const, booking: { ...p.booking, status: "paid" } }
          : p
      )
    );
  }

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
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
                  {payment.booking?.token}
                </code>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  ${Number(payment.amount).toLocaleString()}
                </span>
                <Badge className={statusColor[payment.status] ?? ""}>
                  {payment.status}
                </Badge>
                {payment.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markPaid(payment.id, payment.booking_id)}
                  >
                    Mark paid
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
