-- ============================================================================
-- Beddn — Listing reports table.
-- Allows travelers to report listings to the admin team for review.
-- Paste into the Supabase SQL editor and run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS listing_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason       text NOT NULL,            -- spam | inaccurate | safety | scam | inappropriate | other
  detail       text,                      -- free-text elaboration
  status       text NOT NULL DEFAULT 'new',  -- new | reviewed | dismissed | actioned
  reviewed_by  uuid,
  reviewed_at  timestamptz,
  admin_note   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Prevent the same user reporting the same listing twice (while status is new).
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_reports_unique_pending
  ON listing_reports (listing_id, user_id)
  WHERE status = 'new';

CREATE INDEX IF NOT EXISTS idx_listing_reports_status
  ON listing_reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listing_reports_listing
  ON listing_reports (listing_id);

-- RLS: users can insert their own reports; admins can read/update all.
ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can report listings"
  ON listing_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can see own reports"
  ON listing_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Done.
