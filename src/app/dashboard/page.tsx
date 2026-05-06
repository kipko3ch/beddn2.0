"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, CreditCard, Home, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    listings: 0,
    bookings: 0,
    pendingPayments: 0,
    paidBookings: 0,
  });

  useEffect(() => {
    async function load() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.user.id)
        .single();

      const isAdmin = profile?.is_admin ?? false;

      if (isAdmin) {
        const [listings, bookings, pendingPayments, paidBookings] =
          await Promise.all([
            supabase.from("listings").select("id", { count: "exact", head: true }),
            supabase.from("bookings").select("id", { count: "exact", head: true }),
            supabase
              .from("payments")
              .select("id", { count: "exact", head: true })
              .eq("status", "pending"),
            supabase
              .from("bookings")
              .select("id", { count: "exact", head: true })
              .eq("status", "paid"),
          ]);

        setStats({
          listings: listings.count ?? 0,
          bookings: bookings.count ?? 0,
          pendingPayments: pendingPayments.count ?? 0,
          paidBookings: paidBookings.count ?? 0,
        });
      } else {
        const { data: host } = await supabase
          .from("hosts")
          .select("id")
          .eq("user_id", user.user.id)
          .single();

        if (host) {
          const [listings, bookings] = await Promise.all([
            supabase
              .from("listings")
              .select("id", { count: "exact", head: true })
              .eq("host_id", host.id),
            supabase
              .from("bookings")
              .select("id", { count: "exact", head: true })
              .in(
                "listing_id",
                (
                  await supabase
                    .from("listings")
                    .select("id")
                    .eq("host_id", host.id)
                ).data?.map((l: any) => l.id) ?? []
              ),
          ]);

          setStats({
            listings: listings.count ?? 0,
            bookings: bookings.count ?? 0,
            pendingPayments: 0,
            paidBookings: 0,
          });
        }
      }
    }
    load();
  }, []);

  const cards = [
    { label: "Listings", value: stats.listings, icon: Home },
    { label: "Bookings", value: stats.bookings, icon: CalendarCheck },
    { label: "Pending payments", value: stats.pendingPayments, icon: CreditCard },
    { label: "Paid bookings", value: stats.paidBookings, icon: TrendingUp },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
