'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { ROUTES } from '@/lib/routes';
import { AuthDialog } from '@/components/auth-dialog';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Home,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  CalendarDays,
  Wallet,
  MessageSquare,
  ShieldCheck,
  Search,
  UserCircle,
  Menu,
  X,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Overview", icon: LayoutDashboard },
  { href: ROUTES.dashboardListings, label: "Listings", icon: Home },
  { href: ROUTES.dashboardBookings, label: "Bookings", icon: CalendarCheck },
  { href: ROUTES.dashboardCalendar, label: "Calendar", icon: CalendarDays },
  { href: ROUTES.dashboardWithdrawals, label: "Withdrawals", icon: Wallet },
  { href: ROUTES.dashboardFeedback, label: "Feedback", icon: MessageSquare },
  { href: ROUTES.dashboardPayments, label: "Payments", icon: CreditCard },
  { href: ROUTES.dashboardDemand, label: "Demand", icon: TrendingUp },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const supabase = createClient();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = ROUTES.home;
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) return;
      const [{ data: profile }, { data: host }] = await Promise.all([
        supabase.from('profiles').select('is_admin').eq('id', data.user.id).maybeSingle(),
        supabase.from('hosts').select('id').eq('user_id', data.user.id).maybeSingle(),
      ]);
      setIsAdmin(profile?.is_admin ?? false);
      setIsHost(Boolean(host));
    });
  }, []);

  const adminOnly = new Set<string>([ROUTES.dashboardPayments, ROUTES.dashboardDemand]);
  const hostOnly = new Set<string>([
    ROUTES.dashboardListings,
    ROUTES.dashboardBookings,
    ROUTES.dashboardCalendar,
    ROUTES.dashboardWithdrawals,
    ROUTES.dashboardFeedback,
  ]);
  function navVisible(href: string) {
    if (adminOnly.has(href)) return isAdmin;
    if (hostOnly.has(href)) return isHost || isAdmin;
    return true; // Overview is always visible
  }

  const sidebarItems = NAV_ITEMS.filter((item) => navVisible(item.href));

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-white font-sans text-[#181113]">
        <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
            <Link href={ROUTES.home} className="font-brand text-3xl leading-none text-[#2b000a]">
            Beddn
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href={ROUTES.search} className="rounded-full px-3 py-2 hover:bg-muted">Discover</Link>
              <Link href={ROUTES.review} className="rounded-full px-3 py-2 hover:bg-muted">Review</Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
          <UserCircle className="mb-5 h-14 w-14 text-[#800020]" />
          <h1 className="font-brand text-5xl leading-none text-[#2b000a]">
            Sign in to continue
          </h1>
          <p className="mt-4 max-w-lg text-base text-muted-foreground">
            Login or sign up once to save trips, create a host profile, list a property, and manage bookings.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <AuthDialog defaultHostIntent={pathname === ROUTES.newListing}>
              <Button className="h-11 rounded-full bg-[#800020] px-6 font-bold hover:bg-[#600018]">
                Login or sign up
              </Button>
            </AuthDialog>
            <Link href={ROUTES.search} className="inline-flex h-11 items-center rounded-full border px-6 text-sm font-semibold hover:bg-muted">
              Explore first
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#fffdfd] font-sans">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="flex h-14 items-center justify-between gap-3 pl-3 pr-3 sm:pr-6">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-[#2b000a] hover:bg-muted"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/" className="flex items-center font-brand text-2xl leading-none text-[#2b000a]">
              Beddn
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <nav className="hidden md:flex items-center gap-2 text-sm">
              <Link href={ROUTES.search} className="inline-flex items-center gap-2 rounded-full px-3 py-2 hover:bg-muted">
                <Search className="h-4 w-4" /> Traveler
              </Link>
              {isAdmin && (
                <Link
                  href={ROUTES.adminHome}
                  className="inline-flex items-center gap-2 rounded-full bg-[#f8eef2] px-3 py-2 font-semibold text-[#800020] hover:bg-[#f1e1e7]"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              )}
              <Link href={ROUTES.newListing} className="rounded-full bg-[#800020] px-4 py-2 font-semibold text-white hover:bg-[#600018]">
                List your place
              </Link>
            </nav>

            {/* Account button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                aria-label="Account"
                aria-expanded={accountOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#800020] hover:bg-muted"
              >
                <UserCircle className="h-6 w-6" />
              </button>
              {accountOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setAccountOpen(false)}
                    aria-hidden
                  />
                  <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border bg-white shadow-lg">
                    <div className="border-b px-4 py-3">
                      <p className="text-xs text-muted-foreground">Signed in as</p>
                      <p className="truncate text-sm font-medium">{user?.email}</p>
                    </div>
                    <Link href={ROUTES.dashboard} className="block px-4 py-2.5 text-sm hover:bg-muted">
                      Dashboard
                    </Link>
                    <Link href={ROUTES.search} className="block px-4 py-2.5 text-sm hover:bg-muted md:hidden">
                      Traveler
                    </Link>
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-left text-sm text-[#800020] hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile drawer menu */}
        {menuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="space-y-1 p-3">
              {sidebarItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      active ? "bg-[#800020] text-white" : "text-[#2b000a] hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
              <Link
                href={ROUTES.newListing}
                className="flex items-center gap-3 rounded-lg bg-[#800020] px-3 py-2.5 text-sm font-semibold text-white"
              >
                <Home className="h-4 w-4" /> List your place
              </Link>
              {isAdmin && (
                <Link
                  href={ROUTES.adminHome}
                  className="flex items-center gap-3 rounded-lg border border-[#800020] px-3 py-2.5 text-sm font-semibold text-[#800020]"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>
      <div className="flex-1 flex min-h-0">
      <aside className="w-60 border-r bg-white hidden md:block">
        <nav className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-4 space-y-1">
          {sidebarItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  active
                    ? "bg-[#800020] text-white shadow-sm"
                    : "text-muted-foreground hover:bg-[#fbf7f8] hover:text-[#2b000a]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t">
              <Link
                href={ROUTES.adminHome}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold text-[#800020] hover:bg-[#fbf7f8]"
              >
                <ShieldCheck className="h-4 w-4" /> Admin dashboard
              </Link>
            </div>
          )}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
