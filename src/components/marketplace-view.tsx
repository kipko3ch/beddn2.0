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
  Dumbbell,
  Star,
  MapPin,
} from 'lucide-react';
import { Icon } from '@/components/icon';
import styles from '../app/landing.module.css';
import { createClient } from '@/lib/supabase/client';
import { useSavedListings, useUserRole } from '@/lib/hooks';
import { ListingCard, ListingCardSkeleton } from '@/components/listing-card';
import { PopularDestinations, CityRails, FeaturedRail, Rail } from '@/components/home-sections';
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

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}

export function MarketplaceView({ initialCategory = 'all' }: { initialCategory?: 'all' | 'hourly' | 'overnight' | 'experience' }) {
  // Map the URL category back to our internal TabType
  const initialTab = Object.keys(TAB_DATA).find(
    (key) => TAB_DATA[key as TabType].category === initialCategory
  ) as TabType || 'All';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [priceMode, setPriceMode] = useState<'hourly' | 'overnight'>('hourly');
  // Active in-page search (no redirect): results replace the listings grid.
  const [search, setSearch] = useState<SearchPillValues | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Personalized location and permissions states
  const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | null>(null);
  const [locationData, setLocationData] = useState<{ lat: number; lng: number; city: string; region: string } | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [nearStays, setNearStays] = useState<Listing[]>([]);
  const [trendingNearby, setTrendingNearby] = useState<Listing[]>([]);
  const [popularInCity, setPopularInCity] = useState<Listing[]>([]);
  const [weekendGetaways, setWeekendGetaways] = useState<Listing[]>([]);
  const [topExperiences, setTopExperiences] = useState<Listing[]>([]);

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { user, isHost, isAdmin } = useUserRole();
  const canHost = isHost || isAdmin;
  const { savedIds, toggle } = useSavedListings();

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        localStorage.setItem("beddn_location_decision", "granted");
        setPermissionState("granted");
        setShowBanner(false);

        try {
          const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || "";
            const region = data.address?.region || "";
            setLocationData({ lat: latitude, lng: longitude, city, region });
          } else {
            setLocationData({ lat: latitude, lng: longitude, city: "Nearby", region: "" });
          }
        } catch {
          setLocationData({ lat: latitude, lng: longitude, city: "Nearby", region: "" });
        }
      },
      () => {
        localStorage.setItem("beddn_location_decision", "denied");
        setPermissionState("denied");
        setShowBanner(false);
      }
    );
  }, []);

  useEffect(() => {
    const decision = localStorage.getItem("beddn_location_decision");
    if (decision === "denied") {
      setPermissionState("denied");
      setShowBanner(false);
    } else if (decision === "granted") {
      setPermissionState("granted");
      requestGeolocation();
    } else {
      if (!("permissions" in navigator)) {
        setShowBanner(true);
        return;
      }
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          setPermissionState(status.state);
          if (status.state === "prompt" || status.state === "denied") {
            setShowBanner(status.state === "prompt");
          } else if (status.state === "granted") {
            requestGeolocation();
          }
        })
        .catch(() => {
          setShowBanner(true);
        });
    }
  }, [requestGeolocation]);

  useEffect(() => {
    // Fetch experiences for fallback / curated experiences rail
    fetch("/api/public/listings?category=experience&limit=15")
      .then((res) => (res.ok ? res.json() : { listings: [] }))
      .then((json) => setTopExperiences(json.listings ?? []))
      .catch(() => {});

    if (!locationData) return;

    fetch("/api/public/listings?limit=50")
      .then((res) => (res.ok ? res.json() : { listings: [] }))
      .then((json: { listings?: Listing[] }) => {
        const list = json.listings ?? [];
        const lat1 = locationData.lat;
        const lon1 = locationData.lng;

        const mapped = list.map((item) => {
          const d = getDistance(lat1, lon1, item.latitude, item.longitude);
          return { ...item, distance: d };
        });

        // Near You (within 80km)
        const near = mapped
          .filter((item) => item.distance < 80)
          .sort((a, b) => a.distance - b.distance);
        setNearStays(near.slice(0, 8));

        // Trending Nearby (within 150km, sorted by rating/reviews count)
        const trending = mapped
          .filter((item) => item.distance < 150)
          .sort((a, b) => {
            const aRev = a.reviews?.length ?? 0;
            const bRev = b.reviews?.length ?? 0;
            return bRev - aRev;
          });
        setTrendingNearby(trending.slice(0, 8));

        // Popular in City
        if (locationData.city) {
          const inCity = list.filter((item) =>
            item.city?.toLowerCase().includes(locationData.city.toLowerCase()) ||
            locationData.city.toLowerCase().includes(item.city?.toLowerCase() ?? "")
          );
          setPopularInCity(inCity.slice(0, 8));
        }

        // Weekend Getaways Near You (Overnight stays within 150km)
        const getaways = mapped
          .filter((item) => item.distance < 150 && (item.categories?.includes("overnight") || (item.category as any)?.includes("overnight")))
          .sort((a, b) => a.distance - b.distance);
        setWeekendGetaways(getaways.slice(0, 8));
      })
      .catch(() => {});
  }, [locationData]);

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
    const params = new URLSearchParams();
    if (values.q) params.set("q", values.q.trim());
    if (currentData.category && currentData.category !== "all") {
      params.set("category", currentData.category);
    }
    if (values.checkIn) params.set("checkin", values.checkIn);
    if (values.checkOut && currentData.category !== "hourly" && currentData.category !== "experience") {
      params.set("checkout", values.checkOut);
    }
    if (values.startTime && (currentData.category === "hourly" || currentData.category === "experience")) {
      params.set("startTime", values.startTime);
    }
    if (values.guests && values.guests > 0) {
      params.set("guests", String(values.guests));
    }
    router.push(`/search?${params.toString()}`);
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

  // Each pill acts as a filter on the global marketplace view.
  // We push the route so the URL updates (e.g. for sharing), but since the category
  // page renders this exact same component, the transition is completely seamless.
  function goToCategory(tab: TabType) {
    const category = TAB_DATA[tab].category;
    if (category === 'all') {
      router.push('/');
    } else {
      router.push(`/category/${category}`);
    }
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

      {/* Localized Search Recommendations */}
      {!search && locationData && (nearStays.length > 0 || popularInCity.length > 0) ? (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-2">
          {nearStays.length > 0 && (
            <section className="pt-10">
              <Rail
                heading={
                  <h2 className="text-xl font-brand text-[#2b000a] sm:text-2xl font-bold">
                    Near You
                  </h2>
                }
              >
                {nearStays.map((listing) => (
                  <div key={listing.id} className="w-[170px] shrink-0 snap-start sm:w-[210px]">
                    <ListingCard
                      listing={listing}
                      isSaved={savedIds.has(listing.id)}
                      onToggleSave={() => toggle(listing.id)}
                      priceMode={priceMode}
                    />
                  </div>
                ))}
              </Rail>
            </section>
          )}

          {trendingNearby.length > 0 && (
            <section className="pt-10">
              <Rail
                heading={
                  <h2 className="text-xl font-brand text-[#2b000a] sm:text-2xl font-bold">
                    Trending Nearby
                  </h2>
                }
              >
                {trendingNearby.map((listing) => (
                  <div key={listing.id} className="w-[170px] shrink-0 snap-start sm:w-[210px]">
                    <ListingCard
                      listing={listing}
                      isSaved={savedIds.has(listing.id)}
                      onToggleSave={() => toggle(listing.id)}
                      priceMode={priceMode}
                    />
                  </div>
                ))}
              </Rail>
            </section>
          )}

          {popularInCity.length > 0 && (
            <section className="pt-10">
              <Rail
                heading={
                  <h2 className="text-xl font-brand text-[#2b000a] sm:text-2xl font-bold">
                    Popular in {locationData.city}
                  </h2>
                }
              >
                {popularInCity.map((listing) => (
                  <div key={listing.id} className="w-[170px] shrink-0 snap-start sm:w-[210px]">
                    <ListingCard
                      listing={listing}
                      isSaved={savedIds.has(listing.id)}
                      onToggleSave={() => toggle(listing.id)}
                      priceMode={priceMode}
                    />
                  </div>
                ))}
              </Rail>
            </section>
          )}

          {weekendGetaways.length > 0 && (
            <section className="pt-10">
              <Rail
                heading={
                  <h2 className="text-xl font-brand text-[#2b000a] sm:text-2xl font-bold">
                    Weekend Getaways Near You
                  </h2>
                }
              >
                {weekendGetaways.map((listing) => (
                  <div key={listing.id} className="w-[170px] shrink-0 snap-start sm:w-[210px]">
                    <ListingCard
                      listing={listing}
                      isSaved={savedIds.has(listing.id)}
                      onToggleSave={() => toggle(listing.id)}
                      priceMode={priceMode}
                    />
                  </div>
                ))}
              </Rail>
            </section>
          )}
        </div>
      ) : (
        /* Fallback sections when geolocation is denied or loading */
        !search && (
          <>
            <PopularDestinations />
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <FeaturedRail
                placement="homepage_featured"
                heading="Featured stays"
                savedIds={savedIds}
                onToggleSave={toggle}
                priceMode={priceMode}
              />
            </div>
            {topExperiences.length > 0 && (
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
                <Rail
                  heading={
                    <h2 className="text-xl font-brand text-[#2b000a] sm:text-2xl font-bold">
                      Top Rated Experiences
                    </h2>
                  }
                >
                  {topExperiences.map((listing) => (
                    <div key={listing.id} className="w-[170px] shrink-0 snap-start sm:w-[210px]">
                      <ListingCard
                        listing={listing}
                        isSaved={savedIds.has(listing.id)}
                        onToggleSave={() => toggle(listing.id)}
                        priceMode={priceMode}
                      />
                    </div>
                  ))}
                </Rail>
              </div>
            )}
          </>
        )
      )}

      {/* Become a host CTA banner */}
      {!search && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#f7f2f4] p-8 md:p-12 lg:p-14 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-md space-y-4 text-center md:text-left z-10">
              <h2 className="font-brand text-3xl font-bold text-[#2b000a] tracking-tight sm:text-4xl">
                Become a host
              </h2>
              <p className="text-sm md:text-base text-muted-foreground font-medium">
                Share your space and earn extra income.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => router.push(ROUTES.newListing)}
                  className="rounded-full bg-[#800020] px-6 py-3 text-sm font-bold text-white hover:bg-merlot transition-colors shadow-md"
                >
                  Get started
                </button>
              </div>
            </div>
            
            {/* Right decoration photo */}
            <div className="relative w-full md:w-1/2 aspect-[16/9] md:aspect-[4/3] rounded-2xl overflow-hidden shadow-sm">
              <Image
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80"
                alt="Become a host room design"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
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

      {/* Geolocation Request Floating Banner */}
      {showBanner && (
        <div className="fixed bottom-6 left-6 right-6 z-50 mx-auto max-w-md rounded-3xl border border-[#e3d3d9] bg-white/95 p-5 shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-crimson">
              <MapPin className="h-5 w-5 fill-crimson text-white" />
            </span>
            <div className="flex-1 space-y-1">
              <h3 className="font-brand text-base font-bold text-[#2b000a]">Find stays near you</h3>
              <p className="text-xs text-muted-foreground leading-normal">
                Allow location access to discover nearby stays, experiences, and personalized recommendations.
              </p>
              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={requestGeolocation}
                  className="rounded-full bg-[#800020] px-4 py-2 text-xs font-bold text-white hover:bg-merlot transition-colors"
                >
                  Allow Location
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem("beddn_location_decision", "denied");
                    setPermissionState("denied");
                    setShowBanner(false);
                  }}
                  className="rounded-full border border-black/10 px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
