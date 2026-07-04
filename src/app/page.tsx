'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  Menu,
  Bus,
  Waves,
  Dumbbell
} from 'lucide-react';
import { Icon } from '@/components/icon';
import styles from './landing.module.css';
import { createClient } from '@/lib/supabase/client';
import { useSavedListings, useUserRole } from '@/lib/hooks';
import { ListingCard, ListingCardSkeleton } from '@/components/listing-card';
import { PopularDestinations, CityRails, FeaturedRail } from '@/components/home-sections';
import { SearchPill, type SearchPillValues } from '@/components/search-pill';
import { AuthDialog } from '@/components/auth-dialog';
import { CurrencySwitcher } from '@/components/currency-switcher';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ROUTES } from '@/lib/routes';
import type { Listing } from '@/lib/types';

const TAB_DATA = {
  All: {
    title: 'Find a place',
    placeholder: 'Where are you going?',
    category: 'all' as const,
  },
  Hourly: {
    title: 'Find a place for a few hours',
    placeholder: 'Where do you need a place right now?',
    category: 'hourly' as const,
  },
  Overnight: {
    title: 'Find a place for the night',
    placeholder: 'Where are you staying tonight?',
    category: 'overnight' as const,
  },
  Experiences: {
    title: 'Find a trip or class',
    placeholder: 'Road trip, swimming class, yoga, hike...',
    category: 'experience' as const,
  }
};

type TabType = keyof typeof TAB_DATA;

const TAB_ICONS: Record<TabType, string> = {
  All: '/images/cat-all.png',
  Hourly: '/images/cat-hourly.png',
  Overnight: '/images/cat-overnight.png',
  Experiences: '/images/cat-experiences.png',
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [priceMode, setPriceMode] = useState<'hourly' | 'overnight'>('hourly');
  // Active in-page search (no redirect): results replace the listings grid.
  const [search, setSearch] = useState<SearchPillValues | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user, isHost, isAdmin } = useUserRole();
  const canHost = isHost || isAdmin;
  const { savedIds, toggle } = useSavedListings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const currentData = TAB_DATA[activeTab];
  // Cache fetched listings per category so switching tabs you've already
  // viewed is instant instead of hitting the database again.
  const listingCache = useRef<Map<string, Listing[]>>(new Map());

  const fetchListings = useCallback(async () => {
    const q = search?.q?.trim() ?? '';
    const key = `${currentData.category}|${q}`;
    const cached = listingCache.current.get(key);
    if (cached) {
      setListings(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Server route uses the service role, so listings show for everyone —
      // signed in or not — regardless of database policy state.
      const params = new URLSearchParams({ category: currentData.category, limit: '20' });
      if (q) params.set('q', q);
      const res = await fetch(`/api/public/listings?${params.toString()}`);
      const json: { listings?: Listing[] } = res.ok ? await res.json() : {};
      const rows = json.listings ?? [];
      listingCache.current.set(key, rows);
      setListings(rows);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [currentData.category, search?.q]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  function handleSearch(values: SearchPillValues) {
    // Search right here on the landing page — results swap into the grid below.
    setSearch(values.q ? values : null);
    document.getElementById('home-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleNearby() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        router.push(
          `/search?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&category=${currentData.category}`
        );
      },
      () => alert('Could not get your location. Please allow location access.')
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.refresh();
  }

  const tabs: { name: TabType }[] = [
    { name: 'All' },
    { name: 'Hourly' },
    { name: 'Overnight' },
    { name: 'Experiences' },
  ];

  // Each pill is a shortcut into its own filtered page. "All" IS this page,
  // so it just resets the view instead of bouncing to /search.
  function goToCategory(tab: TabType) {
    const category = TAB_DATA[tab].category;
    if (category === 'all') {
      setActiveTab('All');
      setSearch(null);
      return;
    }
    router.push(`/category/${category}`);
  }

  return (
    <div className={styles.container}>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger
            render={
              <button type="button" className={styles.mobileMenuButton} aria-label="Open menu" />
            }
          >
            {user ? (
              <Image
                src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                alt=""
                width={32}
                height={32}
                style={{ borderRadius: '50%' }}
              />
            ) : (
              <Menu size={20} />
            )}
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[min(82vw,320px)] flex-col gap-0 bg-white p-0">
            <SheetHeader className="border-b p-5">
              <SheetTitle className="font-brand text-3xl font-normal leading-none text-[#2b000a]">
                Beddn
              </SheetTitle>
              <SheetDescription className="sr-only">Navigate Beddn</SheetDescription>
            </SheetHeader>
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              <a className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.home}>
                Browse all
              </a>
              <a className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.review}>
                Review a stay
              </a>
              <a className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.saved}>
                Saved trips
              </a>
              {!user && (
                <AuthDialog defaultHostIntent>
                  <button className="mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-[#800020] px-4 py-3 text-sm font-bold text-white hover:bg-merlot">
                    <Home className="h-4 w-4" /> Become a host
                  </button>
                </AuthDialog>
              )}
              {user && canHost && (
                <a className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.dashboard}>
                  Host dashboard
                </a>
              )}
              {isAdmin && (
                <a className="block rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.adminListings}>
                  Admin dashboard
                </a>
              )}
            </nav>
            <div className="mt-auto space-y-1 border-t p-4">
              <a className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href={ROUTES.terms}>
                Terms
              </a>
              <a className="block rounded-2xl px-4 py-3 text-sm text-muted-foreground hover:bg-muted" href={ROUTES.privacy}>
                Privacy
              </a>
              {user && (
                <button
                  onClick={handleSignOut}
                  className="block w-full rounded-2xl px-4 py-3 text-left text-sm text-crimson hover:bg-muted"
                >
                  Sign out
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link href={ROUTES.home} className={styles.logoArea} aria-label="Beddn home">
          Beddn
        </Link>

        {/* Third grid column on mobile — otherwise this is an empty 44px gap
            and the currency switcher only exists inside .navRight, which is
            hidden entirely below the 768px breakpoint. */}
        <div className={styles.mobileProfileSlot}>
          <CurrencySwitcher />
        </div>

        <nav className={styles.navRight}>
          <a href={ROUTES.home} className={styles.navItem}>Browse</a>
          <a href={ROUTES.review} className={styles.navItem}>Review</a>
          {!user && (
            <AuthDialog>
              <button className={styles.navItem}>Login</button>
            </AuthDialog>
          )}
          {user && !canHost && (
            <a href={ROUTES.newListing} className={styles.navItem}>Become a host</a>
          )}
          {!user && (
            <AuthDialog defaultHostIntent>
              <button className={styles.signInBtn}>Become a host</button>
            </AuthDialog>
          )}
          <CurrencySwitcher />
          {/* One control: the avatar itself when signed in, a hamburger when
              signed out. Opens the same sheet as the mobile trigger above —
              no separate account dropdown. */}
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
            className="ml-1 inline-flex size-9 items-center justify-center rounded-full border text-[#181113] outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-crimson"
          >
            {user ? (
              <Image
                src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                alt=""
                width={32}
                height={32}
                style={{ borderRadius: '50%' }}
              />
            ) : (
              <Menu size={18} />
            )}
          </button>
        </nav>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{currentData.title}</h1>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`${styles.tab} ${activeTab === tab.name ? styles.active : ''}`}
              onClick={() => goToCategory(tab.name)}
            >
              <Image
                src={TAB_ICONS[tab.name]}
                alt=""
                width={68}
                height={68}
                className={styles.tabIcon}
                aria-hidden
              />
              {tab.name}
            </button>
          ))}
        </div>

        <div className={styles.searchContainer}>
          <SearchPill
            initialQuery={search?.q ?? ''}
            initialCheckIn={search?.checkIn}
            initialStartTime={search?.startTime}
            initialGuests={search?.guests}
            mode={currentData.category}
            onSearch={handleSearch}
            onNearby={handleNearby}
          />
        </div>

      </main>

      {!search && <PopularDestinations />}

      {!search && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <FeaturedRail
            placement="homepage_featured"
            heading="Featured stays"
            savedIds={savedIds}
            onToggleSave={toggle}
            priceMode={priceMode}
          />
        </div>
      )}

      {/* Listings grid */}
      <section id="home-results" className={styles.listingsSection}>
        {search && (
          <div className={styles.searchResultsBar}>
            <p>
              {loading
                ? `Searching “${search.q}”…`
                : `${listings.length} result${listings.length === 1 ? '' : 's'} for “${search.q}”`}
            </p>
            <button type="button" onClick={() => setSearch(null)}>
              Clear search
            </button>
          </div>
        )}
        {!loading && listings.length > 0 && (
          <div className={styles.priceToggleRow}>
            <span className={styles.priceToggleLabel}>Show prices</span>
            <div className={styles.priceToggle} role="group" aria-label="Price view">
              <button
                type="button"
                onClick={() => setPriceMode('hourly')}
                className={priceMode === 'hourly' ? styles.priceToggleActive : ''}
                aria-pressed={priceMode === 'hourly'}
              >
                Hourly
              </button>
              <button
                type="button"
                onClick={() => setPriceMode('overnight')}
                className={priceMode === 'overnight' ? styles.priceToggleActive : ''}
                aria-pressed={priceMode === 'overnight'}
              >
                Nightly
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className={styles.listingsGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.listingRailItem}>
                <ListingCardSkeleton />
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className={styles.listingsGrid}>
            {listings.map((listing) => (
              <div key={listing.id} className={styles.listingRailItem}>
                <ListingCard
                  listing={listing}
                  isSaved={savedIds.has(listing.id)}
                  onToggleSave={() => toggle(listing.id)}
                  priceMode={priceMode}
                />
              </div>
            ))}
          </div>
        ) : activeTab === 'Experiences' ? (
          <div className={styles.emptyState}>
            <Image
              src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029372/empty-experiences_uxhnur.png"
              alt=""
              width={200}
              height={160}
              style={{ display: 'block', width: 200, height: 'auto', margin: '0 auto 16px' }}
              aria-hidden
            />
            <p className={styles.emptyTitle}>Trips and classes are forming</p>
            <p className={styles.emptySubtitle}>
              Road trips, yoga sessions, swimming classes, hikes, and food tours will show here as verified organizers join.
            </p>
            <div className={styles.experienceIdeas}>
              {[
                { label: 'Road trips', icon: Bus, query: 'road trip' },
                { label: 'Swimming classes', icon: Waves, query: 'swimming classes' },
                { label: 'Yoga and hikes', icon: Dumbbell, query: 'yoga hikes' },
              ].map(({ label, icon: Icon, query }) => (
                <button
                  key={label}
                  className={styles.ideaBtn}
                  onClick={() => router.push(`/search?q=${encodeURIComponent(query)}&category=experience`)}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Image
              src="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029373/empty-no-places_tcbzxs.png"
              alt=""
              width={220}
              height={170}
              style={{ display: 'block', width: 220, height: 'auto', margin: '0 auto 16px' }}
              aria-hidden
            />
            <p className={styles.emptyTitle}>No verified places here yet</p>
            <p className={styles.emptySubtitle}>
              Be the first verified host in this area and get early visibility as demand grows.
            </p>
            <div className={styles.emptyActions}>
              <button
                onClick={() => router.push('/host/listings/new')}
                className={styles.searchBtn}
              >
                Be the first to list your place
              </button>
            </div>
          </div>
        )}
      </section>

      {!search && <CityRails savedIds={savedIds} onToggleSave={toggle} priceMode={priceMode} />}

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <span>Beddn</span>
        </div>
        <p>Built for flexible stays, local hosts, and real demand across Africa.</p>
        <div className={styles.footerLinks}>
          <a href={ROUTES.terms}>Terms</a>
          <a href={ROUTES.privacy}>Privacy</a>
          <a href={ROUTES.review}>Review a stay</a>
        </div>
      </footer>
      <nav className={`${styles.mobileBottomNav} ${styles.mobileBottomNavVisible}`}>
        <button className={activeTab === 'All' ? styles.mobileBottomNavActive : ''} onClick={() => setActiveTab('All')}>
          <Icon icon="line-md:home" />
          <span>Home</span>
        </button>
        <button onClick={() => router.push('/search')}>
          <Icon icon="line-md:search" />
          <span>Search</span>
        </button>
        <button onClick={() => router.push('/saved')}>
          <Icon icon="line-md:heart" />
          <span>Saved</span>
        </button>
        {user && canHost ? (
          <button onClick={() => router.push(ROUTES.dashboard)}>
            <Icon icon="line-md:account" />
            <span>Dashboard</span>
          </button>
        ) : user ? (
          <button onClick={() => router.push(ROUTES.newListing)}>
            <Icon icon="line-md:briefcase" />
            <span>Host</span>
          </button>
        ) : (
          <AuthDialog defaultHostIntent>
            <button>
              <Icon icon="line-md:briefcase" />
              <span>Host</span>
            </button>
          </AuthDialog>
        )}
      </nav>
    </div>
  );
}
