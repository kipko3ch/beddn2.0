-- ============================================================================
-- Beddn — currency conversion. Hosts keep pricing their own listing in their
-- own currency (already supported: listings.currency). This adds a small
-- admin-controlled rate table so guests can view prices in KES/USD/TZS
-- (or any host currency) via a "≈" conversion, without a live API call on
-- every page view. Rates come from Frankfurter (https://api.frankfurter.app)
-- refreshed by an admin, or a manual average the admin sets by hand.
-- Idempotent: safe to run more than once. Paste into the Supabase SQL editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS currency_rates (
  currency    text PRIMARY KEY,          -- e.g. 'KES', 'TZS', 'UGX', 'RWF', 'USD'
  rate_to_usd numeric NOT NULL,          -- units of `currency` per 1 USD
  source      text NOT NULL DEFAULT 'manual', -- 'frankfurter' | 'manual'
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid
);

-- Done.
