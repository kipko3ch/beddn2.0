'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import Image from 'next/image';
import styles from '../landing.module.css';
import { ROUTES } from '@/lib/routes';
import {
  LayoutDashboard,
  Home,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  Sparkles,
  CalendarDays,
  Wallet,
  MessageSquare,
  ShieldCheck,
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

const ADMIN_ITEMS = [
  { href: ROUTES.adminBookings, label: "Admin bookings" },
  { href: ROUTES.adminPayments, label: "Admin payments" },
  { href: ROUTES.adminHosts, label: "Admin hosts" },
  { href: ROUTES.adminListings, label: "Admin listings" },
  { href: ROUTES.adminWithdrawals, label: "Admin withdrawals" },
  { href: ROUTES.adminDisputes, label: "Admin disputes" },
  { href: ROUTES.adminFeedback, label: "Admin feedback" },
  { href: ROUTES.adminDemand, label: "Admin demand" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single();
      setIsAdmin(profile?.is_admin ?? false);
    });
  }, []);

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.logoArea}>
            <Image
              src="/logo.png"
              alt="Beddn Logo"
              width={32}
              height={32}
              priority
            />
            Beddn
          </div>

          <nav className={styles.navRight}>
            <button
              type="button"
              className={`${styles.navItem} ${styles.comingSoonNavItem}`}
              aria-label="Plan with AI coming soon"
              title="Coming soon"
            >
              <Sparkles size={18} />
              Plan with AI
              <span className={styles.comingSoonBadge}>Soon</span>
            </button>
            <button
              type="button"
              className={`${styles.navItem} ${styles.comingSoonNavItem}`}
              aria-label="Rewards coming soon"
              title="Coming soon"
            >
              Rewards
              <span className={styles.comingSoonBadge}>Soon</span>
            </button>
            <Link href={ROUTES.search} className={styles.navItem}>Discover</Link>
            <Link href={ROUTES.review} className={styles.navItem}>Review</Link>
          </nav>
        </header>

        <main className={styles.main} style={{ marginTop: '120px' }}>
          <h1 className={styles.title} style={{ fontSize: '48px' }}>
            Sign in to continue
          </h1>
          <p style={{ color: '#666', marginBottom: '32px', fontSize: '18px' }}>
            Access your dashboard to manage listings, bookings, and more
          </p>
          <button
            onClick={handleSignIn}
            className={styles.signInBtn}
            style={{ padding: '16px 32px', fontSize: '16px' }}
          >
            Sign in with Google
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Image src="/logo.png" alt="Beddn Logo" width={28} height={28} priority />
            Beddn
          </Link>
          <nav className="hidden md:flex items-center gap-2 text-sm">
            <Link href="/" className="px-3 py-2 rounded-md hover:bg-muted">
              Discover
            </Link>
            <Link href="/dashboard/listings/new" className="px-3 py-2 rounded-md hover:bg-muted">
              List your place
            </Link>
          </nav>
        </div>
        <div className="md:hidden overflow-x-auto border-t">
          <nav className="flex gap-2 px-3 py-2 min-w-max">
            {NAV_ITEMS.map(({ href, label }) => {
              if ((href === "/dashboard/payments" || href === "/dashboard/demand") && !isAdmin) {
                return null;
              }
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                    active ? "bg-[#800020] text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <div className="flex-1 flex min-h-0">
      <aside className="w-56 border-r bg-muted/30 hidden md:block">
        <nav className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            if ((href === "/dashboard/payments" || href === "/dashboard/demand") && !isAdmin) {
              return null;
            }
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                  active
                    ? "bg-[#800020] text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t">
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="h-4 w-4" /> Admin
              </div>
              {ADMIN_ITEMS.map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                      active
                        ? "bg-[#800020] text-white"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
