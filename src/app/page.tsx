'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Search,
  MapPin,
  Home,
  Heart,
  UserCircle,
  Bus,
  Waves,
  Dumbbell
} from 'lucide-react';
import styles from './landing.module.css';
import { createClient } from '@/lib/supabase/client';
import { useSavedListings } from '@/lib/hooks';
import { ListingCard } from '@/components/listing-card';
import { AuthDialog } from '@/components/auth-dialog';
import { ROUTES } from '@/lib/routes';
import { LOGO_SRC } from '@/lib/assets';
import type { User } from '@supabase/supabase-js';
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

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [experienceDemandCount, setExperienceDemandCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { savedIds, toggle } = useSavedListings();

  const currentData = TAB_DATA[activeTab];

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }, [supabase]);

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
    checkUser();
  }, [checkUser, fetchListings]);

  useEffect(() => {
    async function loadExperienceDemand() {
      const { count } = await supabase
        .from('search_demand')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'experience');
      setExperienceDemandCount(count ?? 0);
    }
    loadExperienceDemand();
  }, [supabase]);

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
    setUser(null);
  }

  const tabs: { name: TabType }[] = [
    { name: 'All' },
    { name: 'Hourly' },
    { name: 'Overnight' },
    { name: 'Experiences' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <Image
            src={LOGO_SRC}
            alt="Beddn Logo"
            width={28}
            height={42}
            priority
            unoptimized
            className={styles.logoMark}
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
            <span className={styles.comingSoonDot} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${styles.comingSoonNavItem}`}
            aria-label="Rewards coming soon"
            title="Coming soon"
          >
            Rewards
            <span className={styles.comingSoonDot} aria-hidden="true" />
          </button>
          <a href={ROUTES.search} className={styles.navItem}>Discover</a>
          <a href={ROUTES.review} className={styles.navItem}>Review</a>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image
                src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                alt="Profile"
                width={32}
                height={32}
                style={{ borderRadius: '50%', cursor: 'pointer' }}
                onClick={() => router.push('/dashboard')}
              />
              <button 
                className={styles.signInBtn} 
                onClick={handleSignOut}
                style={{ padding: '8px 16px', fontSize: 14 }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <AuthDialog>
              <button className={styles.signInBtn}>Sign in</button>
            </AuthDialog>
          )}
        </nav>
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
              <div key={i} className={styles.listingSkeleton}>
                <div className={styles.skeletonImage} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonMeta} />
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className={styles.listingsGrid}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSaved={savedIds.has(listing.id)}
                onToggleSave={() => toggle(listing.id)}
              />
            ))}
          </div>
        ) : activeTab === 'Experiences' ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Trips and classes are forming</p>
            <p className={styles.emptySubtitle}>
              Road trips, yoga sessions, swimming classes, hikes, and food tours will show here as verified organizers join.
            </p>
            <div className={styles.demandPill}>
              {Math.max(experienceDemandCount, 1)} people have asked for experiences
            </div>
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
          <Image src={LOGO_SRC} alt="Beddn" width={22} height={32} unoptimized className={styles.footerLogoMark} />
          <span>Beddn</span>
        </div>
        <p>Built for flexible stays, local hosts, and real demand across Africa.</p>
        <div className={styles.footerLinks}>
          <a href={ROUTES.terms}>Terms</a>
          <a href={ROUTES.privacy}>Privacy</a>
          <a href={ROUTES.review}>Review a stay</a>
        </div>
      </footer>
      <nav className={styles.mobileBottomNav}>
        <button onClick={() => setActiveTab('All')}>
          <Home size={20} />
          <span>Home</span>
        </button>
        <button onClick={() => router.push('/search')}>
          <Search size={20} />
          <span>Search</span>
        </button>
        <button onClick={() => router.push('/saved')}>
          <Heart size={20} />
          <span>Saved</span>
        </button>
        {user ? (
          <button onClick={() => router.push('/dashboard')}>
            <UserCircle size={20} />
            <span>Account</span>
          </button>
        ) : (
          <AuthDialog>
            <button>
              <UserCircle size={20} />
              <span>Sign in</span>
            </button>
          </AuthDialog>
        )}
      </nav>
    </div>
  );
}
