'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Globe,
  Search,
  MapPin
} from 'lucide-react';
import styles from './landing.module.css';
import { createClient } from '@/lib/supabase/client';
import { useSavedListings } from '@/lib/hooks';
import { ListingCard } from '@/components/listing-card';
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
    title: 'Find things to do',
    placeholder: 'What do you want to do?',
    category: 'experience' as const,
  }
};

type TabType = keyof typeof TAB_DATA;

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
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
      .select('*, listing_images(*), host:hosts(*)')
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

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
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
            src="/logo.png"
            alt="Beddn Logo"
            width={32}
            height={32}
            priority
          />
          Beddn
        </div>

        <nav className={styles.navRight}>
          <a href="#" className={styles.navItem}>
            <Sparkles size={18} />
            Plan with AI
          </a>
          <a href="#" className={styles.navItem}>Rewards</a>
          <a href="#" className={styles.navItem}>Discover</a>
          <a href="#" className={styles.navItem}>Review</a>
          <a href="#" className={styles.navItem}>
            <Globe size={18} />
            USD
          </a>
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
            <button className={styles.signInBtn} onClick={handleSignIn}>Sign in</button>
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
    </div>
  );
}
