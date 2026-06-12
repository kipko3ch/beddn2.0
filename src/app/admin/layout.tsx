"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import {
  LayoutDashboard,
  Users,
  Home,
  UserCircle,
  CalendarCheck,
  CreditCard,
  Wallet,
  ShieldCheck,
  MessageSquare,
  TrendingUp,
  Search,
  Loader2,
  Bell,
  MapPin,
} from "lucide-react";

const ADMIN_NAV = [
  { href: ROUTES.adminHome, label: "Overview", icon: LayoutDashboard },
  { href: ROUTES.adminUsers, label: "Users", icon: Users },
  { href: ROUTES.adminListings, label: "Listings", icon: Home },
  { href: ROUTES.adminHosts, label: "Hosts", icon: UserCircle },
  { href: ROUTES.adminBookings, label: "Bookings", icon: CalendarCheck },
  { href: ROUTES.adminPayments, label: "Payments", icon: CreditCard },
  { href: ROUTES.adminWithdrawals, label: "Withdrawals", icon: Wallet },
  { href: ROUTES.adminDisputes, label: "Disputes", icon: ShieldCheck },
  { href: ROUTES.adminFeedback, label: "Feedback", icon: MessageSquare },
  { href: ROUTES.adminDemand, label: "Demand", icon: TrendingUp },
  { href: ROUTES.adminNotifications, label: "Notifications", icon: Bell },
  { href: ROUTES.adminDestinations, label: "Destinations", icon: MapPin },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setStatus("denied");
        router.replace(ROUTES.home);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.is_admin) {
        setStatus("ok");
      } else {
        setStatus("denied");
        router.replace(ROUTES.dashboard);
      }
    });
  }, []);

  function isActive(href: string) {
    if (href === ROUTES.adminHome) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  }

  if (status !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffdfd] text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {status === "denied" ? "Redirecting…" : "Checking admin access…"}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#fffdfd] font-sans">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="flex h-14 items-center justify-between gap-3 pl-4 pr-4 sm:pr-6">
          <div className="flex items-center gap-3">
            <Link href={ROUTES.home} className="flex items-center font-brand text-2xl leading-none text-[#2b000a]">
              Beddn
            </Link>
            <span className="hidden items-center gap-1 rounded-full bg-[#800020] px-2.5 py-1 text-xs font-semibold text-white sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </span>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href={ROUTES.search} className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-muted">
              <Search className="h-4 w-4" /> Traveler
            </Link>
            <Link href={ROUTES.dashboard} className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-muted">
              <LayoutDashboard className="h-4 w-4" /> Host
            </Link>
          </nav>
        </div>
        <div className="md:hidden overflow-x-auto border-t">
          <nav className="flex gap-2 px-3 py-2 min-w-max">
            {ADMIN_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  isActive(href) ? "bg-[#800020] text-white" : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="flex-1 flex min-h-0">
        <aside className="w-60 border-r bg-white hidden md:block">
          <nav className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-4 space-y-1">
            <div className="mb-2 flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#800020]">
              <ShieldCheck className="h-4 w-4" /> Admin dashboard
            </div>
            {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  isActive(href)
                    ? "bg-[#800020] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-[#fbf7f8] hover:text-[#2b000a]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t">
              <Link
                href={ROUTES.dashboard}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-[#fbf7f8] hover:text-[#2b000a]"
              >
                <Home className="h-4 w-4" /> Host dashboard
              </Link>
            </div>
          </nav>
        </aside>
        <main className="flex-1 min-w-0 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
