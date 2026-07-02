-- ============================================================================
-- Beddn — Host/Admin PIN step-up auth. Same Supabase login as the public site,
-- but the /host and /admin Extranet also asks for a 4-digit PIN (M-Pesa-style)
-- before it unlocks — "switch + another auth", not just a role switch.
-- Idempotent: safe to run more than once. Paste into the Supabase SQL editor.
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS host_pin_hash text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS host_pin_updated_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS host_pin_fail_count integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS host_pin_locked_until timestamptz;

-- Done.
