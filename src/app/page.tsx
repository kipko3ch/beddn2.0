'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Home,
  Heart,
  UserCircle,
  Menu,
  Bus,
  Waves,
  Dumbbell
} from 'lucide-react';
import { Icon } from '@/components/icon';
import styles from './landing.module.css';
import { createClient } from '@/lib/supabase/client';
import { useSavedListings, useUserRole } from '@/lib/hooks';
import { ListingCard } from '@/components/listing-card';
import { AuthDialog } from '@/components/auth-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/lib/routes';
import { useScrollUpVisibility } from '@/lib/use-scroll-up-visibility';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user, isHost, isAdmin } = useUserRole();
  const canHost = isHost || isAdmin;
  const { savedIds, toggle } = useSavedListings();
  const bottomNavVisible = useScrollUpVisibility();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const currentData = TAB_DATA[activeTab];

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('listings')
      .select('*, listing_images(*), host:hosts(id, name, is_verified), reviews(rating)')
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (currentData.category !== 'all') {
      query = query.filter('categories', 'cs', `{${currentData.category}}`);
    }

    const { data } = await query;
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  }, [currentData.category, supabase]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}&category=${currentData.category}`);
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

  return (
    <div className={styles.container}>
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <Sheet>
          <SheetTrigger
            render={
              <button type="button" className={styles.mobileMenuButton} aria-label="Open navigation" />
            }
          >
            <Menu size={20} />
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(82vw,320px)] gap-0 bg-white p-0">
            <SheetHeader className="border-b p-5">
              <SheetTitle className="font-brand text-3xl font-normal leading-none text-[#2b000a]">
                Beddn
              </SheetTitle>
              <SheetDescription>Navigate Beddn</SheetDescription>
            </SheetHeader>
            <nav className="grid gap-2 p-4">
              <a className="rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.search}>
                Discover
              </a>
              <a className="rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.review}>
                Review a stay
              </a>
              <a className="rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.saved}>
                Saved trips
              </a>
              <a className="rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.terms}>
                Terms
              </a>
              <a className="rounded-2xl px-4 py-3 text-sm hover:bg-muted" href={ROUTES.privacy}>
                Privacy
              </a>
            </nav>
          </SheetContent>
        </Sheet>

        <Link href={ROUTES.home} className={styles.logoArea} aria-label="Beddn home">
          Beddn
        </Link>

        <nav className={styles.navRight}>
          <a href={ROUTES.search} className={styles.navItem}>Discover</a>
          <a href={ROUTES.review} className={styles.navItem}>Review</a>
          {user ? (
            <div className={styles.desktopAccount}>
              {!canHost && (
                <a href={ROUTES.newListing} className={styles.navItem}>Become a host</a>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button type="button" aria-label="Open account" style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} />
                  }
                >
                  <Image
                    src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                    alt="Profile"
                    width={32}
                    height={32}
                    style={{ borderRadius: '50%' }}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <a href={ROUTES.saved} className="flex w-full items-center gap-2">
                      <Heart className="h-4 w-4" /> Saved trips
                    </a>
                  </DropdownMenuItem>
                  {canHost ? (
                    <DropdownMenuItem>
                      <a href={ROUTES.dashboard} className="flex w-full items-center gap-2">
                        <Home className="h-4 w-4" /> Dashboard
                      </a>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem>
                      <a href={ROUTES.newListing} className="flex w-full items-center gap-2">
                        <Home className="h-4 w-4" /> Become a host
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <span className="flex items-center gap-2">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <AuthDialog defaultHostIntent>
              <button className={styles.signInBtn}>Become a host</button>
            </AuthDialog>
          )}
        </nav>

        <div className={styles.mobileProfileSlot}>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button type="button" className={styles.mobileProfileButton} aria-label="Open account" />
                }
              >
                <Image
                  src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                  alt=""
                  width={32}
                  height={32}
                  style={{ borderRadius: '50%' }}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <a href={ROUTES.saved} className="flex w-full items-center gap-2">
                    <Heart className="h-4 w-4" /> Saved trips
                  </a>
                </DropdownMenuItem>
                {canHost ? (
                  <DropdownMenuItem>
                    <a href={ROUTES.dashboard} className="flex w-full items-center gap-2">
                      <Home className="h-4 w-4" /> Dashboard
                    </a>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem>
                    <a href={ROUTES.newListing} className="flex w-full items-center gap-2">
                      <Home className="h-4 w-4" /> Become a host
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <span className="flex items-center gap-2">Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <AuthDialog defaultHostIntent>
              <button type="button" className={styles.mobileProfileButton} aria-label="Become a host">
                <UserCircle size={21} />
              </button>
            </AuthDialog>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>{currentData.title}</h1>

        <div className={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.name}
              className={`${styles.tab} ${activeTab === tab.name ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.name)}
            >
              <Image
                src={TAB_ICONS[tab.name]}
                alt=""
                width={22}
                height={22}
                style={{ width: 22, height: 22, marginRight: 8, verticalAlign: 'middle', display: 'inline-block' }}
                aria-hidden
              />
              {tab.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className={styles.searchContainer}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder={currentData.placeholder}
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              onClick={handleNearby}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#666',
              }}
              title="Use my current location"
            >
              <MapPin size={20} />
            </button>
            <button type="submit" className={styles.searchBtn}>Search</button>
          </div>
        </form>

      </main>

      {/* Listings grid */}
      <section className={styles.listingsSection}>
        {loading ? (
          <div className={styles.listingsGrid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`${styles.listingRailItem} ${styles.listingSkeleton}`}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonMeta} />
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
                />
              </div>
            ))}
          </div>
        ) : activeTab === 'Experiences' ? (
          <div className={styles.emptyState}>
            <Image
              src="/images/empty-experiences.png"
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
              src="/images/empty-no-places.png"
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
                onClick={() => router.push('/dashboard/listings/new')}
                className={styles.searchBtn}
              >
                List your place
              </button>
              <button className={styles.secondaryBtn}>
                Notify me when available
              </button>
            </div>
          </div>
        )}
      </section>
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
      <nav
        className={`${styles.mobileBottomNav} ${
          bottomNavVisible ? styles.mobileBottomNavVisible : styles.mobileBottomNavHidden
        }`}
      >
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
