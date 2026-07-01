-- ============================================================================
-- Beddn — schema for Phases 2–7 (host approval, booking pipeline, room/rate
-- calendar, host feature requests). Idempotent: safe to run more than once.
-- Paste into the Supabase SQL editor and run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Phase 2 — Host approval gate.
-- Admin verifies a host ONCE at signup. `status` governs whether the host can
-- operate; `is_verified` (existing) stays as the separate trust badge.
-- Default 'approved' so every EXISTING host keeps working; new applications
-- are inserted as 'pending' by the app.
-- ---------------------------------------------------------------------------
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS applied_at timestamptz;

-- Allowed values: pending | approved | rejected | suspended
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hosts_status_check') THEN
    ALTER TABLE hosts ADD CONSTRAINT hosts_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_hosts_status ON hosts (status);

-- ---------------------------------------------------------------------------
-- Phase 3 — Booking pipeline (host-owned) + reminders.
-- `status` already exists as text; the app adds the value 'requested' (a free
-- request before the host confirms). No enum change needed.
-- ---------------------------------------------------------------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS host_confirmed_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text DEFAULT 'web_request';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS request_note text;

CREATE INDEX IF NOT EXISTS idx_bookings_status_start
  ON bookings (status, start_datetime);

-- ---------------------------------------------------------------------------
-- Phase 4 — Room / rate management (Booking.com-style, per listing per date).
-- One row per listing per day: how many units are open, an optional price
-- override, a minimum-nights rule, and a hard block. `availability_slots`
-- (existing) still handles hourly / experience time-slots.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_calendar_days (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date         date NOT NULL,
  units_open   integer,
  price_override numeric,
  min_nights   integer,
  is_blocked   boolean NOT NULL DEFAULT false,
  note         text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (listing_id, date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_days_listing_date
  ON listing_calendar_days (listing_id, date);

-- ---------------------------------------------------------------------------
-- Phase 6/host portal — Host feature requests ("Suggest a feature").
-- Distinct from guest `feedback`: this is host -> Beddn product requests.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id     uuid REFERENCES hosts(id) ON DELETE SET NULL,
  user_id     uuid,
  title       text NOT NULL,
  detail      text,
  status      text NOT NULL DEFAULT 'new',   -- new | planned | shipped | declined
  upvotes     integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status
  ON feature_requests (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Phase 7 — Reviews from real stays (trust engine).
-- `reviews.booking_id` already exists. Add a light moderation flag so admins
-- can hide abusive reviews without deleting the record.
-- ---------------------------------------------------------------------------
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Done.
