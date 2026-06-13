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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Icon } from '@/components/icon';

const NAV_SECTIONS: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    title: 'Hosting',
    items: [
      { href: ROUTES.dashboard, label: 'Overview', icon: 'line-md:account' },
      { href: ROUTES.dashboardListings, label: 'Listings', icon: 'line-md:home' },
      { href: ROUTES.dashboardInquiries, label: 'Inquiries', icon: 'line-md:bell' },
      { href: ROUTES.dashboardCalendar, label: 'Calendar', icon: 'line-md:calendar' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { href: ROUTES.dashboardFeedback, label: 'Feedback', icon: 'line-md:star' },
      { href: ROUTES.dashboardDemand, label: 'Demand', icon: 'line-md:search' },
    ],
  },
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

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => navVisible(item.href)),
  })).filter((section) => section.items.length > 0);

  const flatItems = sections.flatMap((section) => section.items);
  const pageTitle =
    flatItems.find((item) =>
      item.href === ROUTES.dashboard ? pathname === item.href : pathname?.startsWith(item.href)
    )?.label ?? 'Dashboard';

  function isActive(href: string) {
    if (href === ROUTES.dashboard) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  }

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
          <Icon icon="line-md:account" className="mb-5 h-14 w-14 text-[#800020]" />
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

  const navList = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-[#b09aa1]">
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map(({ href, label, icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#800020] text-white shadow-sm'
                      : 'text-[#5d4f54] hover:bg-[#faf4f6] hover:text-[#2b000a]'
                  }`}
                >
                  <Icon icon={icon} className={`h-4 w-4 ${active ? '' : 'text-[#a08b92]'}`} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {isAdmin && (
        <div>
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-[#b09aa1]">
            Admin
          </p>
          <Link
            href={ROUTES.adminHome}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#800020] hover:bg-[#faf4f6]"
          >
            <Icon icon="line-md:check-all" className="h-4 w-4" /> Admin dashboard
          </Link>
        </div>
      )}
    </nav>
  );

  const navFooter = (onNavigate?: () => void) => (
    <div className="border-t p-3">
      <Link
        href={ROUTES.search}
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#5d4f54] hover:bg-[#faf4f6] hover:text-[#2b000a]"
      >
        <Icon icon="line-md:search" className="h-4 w-4 text-[#a08b92]" /> Switch to traveler
      </Link>
      <div className="mt-2 flex items-center gap-3 rounded-xl bg-[#faf4f6] px-3 py-2.5">
        <Icon icon="line-md:account" className="h-8 w-8 shrink-0 text-[#800020]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[#2b000a]">{user?.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="flex items-center gap-1 text-xs text-[#800020] hover:underline"
          >
            <Icon icon="line-md:log-out" className="h-3 w-3" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f7f3f4] font-sans text-[#181113]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <Link href={ROUTES.home} className="font-brand text-2xl leading-none text-[#2b000a]">
            Beddn
          </Link>
          <span className="rounded-full bg-[#f8eef2] px-2 py-0.5 text-[11px] font-bold text-[#800020]">
            Host
          </span>
        </div>
        {navList()}
        {navFooter()}
      </aside>

      {/* Mobile nav drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="flex w-[min(82vw,320px)] flex-col gap-0 bg-white p-0 md:hidden">
          <SheetHeader className="border-b p-5">
            <SheetTitle className="font-brand text-3xl font-normal leading-none text-[#2b000a]">
              Beddn
            </SheetTitle>
            <SheetDescription className="sr-only">Dashboard navigation</SheetDescription>
          </SheetHeader>
          {navList(() => setMenuOpen(false))}
          {navFooter(() => setMenuOpen(false))}
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Menu"
                aria-expanded={menuOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#2b000a] hover:bg-muted md:hidden"
              >
                <Icon icon="line-md:menu" className="h-5 w-5" />
              </button>
              <Link href={ROUTES.home} className="font-brand text-2xl leading-none text-[#2b000a] md:hidden">
                Beddn
              </Link>
              <h2 className="hidden truncate text-lg font-bold text-[#2b000a] md:block">{pageTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={ROUTES.newListing}
                className="hidden items-center gap-1.5 rounded-full bg-[#800020] px-4 py-2 text-sm font-semibold text-white hover:bg-[#600018] sm:inline-flex"
              >
                <Icon icon="line-md:plus" className="h-4 w-4" /> New listing
              </Link>
              {isAdmin && (
                <Link
                  href={ROUTES.adminHome}
                  className="hidden items-center gap-1.5 rounded-full bg-[#f8eef2] px-3 py-2 text-sm font-semibold text-[#800020] hover:bg-[#f1e1e7] sm:inline-flex"
                >
                  <Icon icon="line-md:check-all" className="h-4 w-4" /> Admin
                </Link>
              )}

              {/* Account button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((o) => !o)}
                  aria-label="Account"
                  aria-expanded={accountOpen}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#800020] hover:bg-muted"
                >
                  <Icon icon="line-md:account" className="h-6 w-6" />
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
                      <Link href={isHost || isAdmin ? ROUTES.dashboardListings : ROUTES.newListing} className="block px-4 py-2.5 text-sm hover:bg-muted sm:hidden">
                        {isHost || isAdmin ? 'Listings' : 'List your place'}
                      </Link>
                      <Link href={ROUTES.search} className="block px-4 py-2.5 text-sm hover:bg-muted md:hidden">
                        Traveler
                      </Link>
                      <button
                        type="button"
                        onClick={signOut}
                        className="flex w-full items-center gap-2 border-t px-4 py-2.5 text-left text-sm text-[#800020] hover:bg-muted"
                      >
                        <Icon icon="line-md:log-out" className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
