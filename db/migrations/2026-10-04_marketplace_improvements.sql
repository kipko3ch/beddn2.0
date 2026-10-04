-- ============================================================================
-- Beddn — Marketplace Improvements, Host Notifications, Pro Tiers & Demand
-- Idempotent: safe to run multiple times in Supabase SQL editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Host In-App Notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS host_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  user_id uuid,
  type text NOT NULL, -- 'listing_verified' | 'listing_rejected' | 'booking_requested' | 'booking_confirmed' | 'inquiry_new' | 'pro_activated' | 'pro_expiring' | 'announcement' | 'action_required'
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_host_notifications_host_read
  ON host_notifications (host_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Enhanced Search Demand (Supply-gap intelligence)
-- ---------------------------------------------------------------------------
ALTER TABLE search_demand ADD COLUMN IF NOT EXISTS check_in date;
ALTER TABLE search_demand ADD COLUMN IF NOT EXISTS check_out date;
ALTER TABLE search_demand ADD COLUMN IF NOT EXISTS guests integer;
ALTER TABLE search_demand ADD COLUMN IF NOT EXISTS budget numeric;
ALTER TABLE search_demand ADD COLUMN IF NOT EXISTS property_type text;
ALTER TABLE search_demand ADD COLUMN IF NOT EXISTS status text DEFAULT 'unmatched'; -- 'matched' | 'unmatched' | 'fulfilled'
ALTER TABLE search_demand ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_search_demand_query_status
  ON search_demand (query, results_count, created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. Pro / Featured Listing Tiers
-- ---------------------------------------------------------------------------
ALTER TABLE featured_listings ADD COLUMN IF NOT EXISTS tier_name text DEFAULT 'Pro'; -- 'Pro' | 'Pro Plus' | 'Featured'
ALTER TABLE featured_listings ADD COLUMN IF NOT EXISTS host_id uuid REFERENCES hosts(id) ON DELETE CASCADE;
ALTER TABLE featured_listings ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_featured_listings_active
  ON featured_listings (status, start_date, end_date);

-- ---------------------------------------------------------------------------
-- 4. Listing Events tracking
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listing_events_type_listing
  ON listing_events (event_type, listing_id, created_at DESC);
