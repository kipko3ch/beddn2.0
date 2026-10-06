-- Migration: 20261006000000_admin_listings_and_claims.sql
-- Description: Admin-created listings, ownership states, and host claim flow
-- Reversible: Yes (see Down migration notes at bottom)

-- ============================================================================
-- 1. LISTINGS TABLE ENHANCEMENTS
-- ============================================================================

-- Make host_id nullable so unclaimed listings can exist without a host
alter table listings alter column host_id drop not null;

-- Add admin ownership & contact fields to listings
alter table listings add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table listings add column if not exists created_by_admin_id uuid references auth.users(id) on delete set null;
alter table listings add column if not exists ownership_state text not null default 'owned';
alter table listings add column if not exists private_owner_name text;
alter table listings add column if not exists private_owner_email text;
alter table listings add column if not exists private_notes text;
alter table listings add column if not exists contact_phone text;
alter table listings add column if not exists contact_name text default 'Beddn';

-- Backfill existing listings to 'owned' using the linked host's user_id
update listings l
set owner_id = h.user_id,
    ownership_state = 'owned'
from hosts h
where l.host_id = h.id and l.owner_id is null;

-- Ensure ownership_state values are valid
alter table listings drop constraint if exists check_listings_ownership_state;
alter table listings add constraint check_listings_ownership_state
  check (ownership_state in ('owned', 'managed_by_admin', 'unclaimed'));

-- Ensure ownership rules:
-- 'unclaimed' requires owner_id IS NULL
-- 'owned' or 'managed_by_admin' requires owner_id IS NOT NULL
alter table listings drop constraint if exists check_ownership_state_owner_id;
alter table listings add constraint check_ownership_state_owner_id
  check (
    (ownership_state = 'unclaimed' and owner_id is null) or
    (ownership_state in ('owned', 'managed_by_admin') and owner_id is not null)
  );

-- Indexes for performance
create index if not exists idx_listings_ownership_state on listings(ownership_state);
create index if not exists idx_listings_owner_id on listings(owner_id);
create index if not exists idx_listings_created_by_admin_id on listings(created_by_admin_id);

-- ============================================================================
-- 2. LISTING CLAIMS TABLE
-- ============================================================================

create table if not exists listing_claims (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  relationship text not null check (relationship in ('owner', 'manager', 'caretaker')),
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  email_verified boolean not null default false,
  email_matches_owner boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one pending claim per (listing_id, user_id)
create unique index if not exists idx_listing_claims_unique_pending
  on listing_claims (listing_id, user_id)
  where status = 'pending';

create index if not exists idx_listing_claims_listing_id on listing_claims(listing_id);
create index if not exists idx_listing_claims_user_id on listing_claims(user_id);
create index if not exists idx_listing_claims_status on listing_claims(status);

-- Enable RLS
alter table listing_claims enable row level security;

-- Policies for listing_claims
create policy "Claimants can view their own claims" on listing_claims
  for select using (auth.uid() = user_id);

create policy "Admins can view all claims" on listing_claims
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================================
-- 3. EMAIL VERIFICATION OTPS TABLE
-- ============================================================================

create table if not exists claim_email_otps (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  claim_id uuid references listing_claims(id) on delete cascade,
  otp_hash text not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  verified_at timestamptz,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_claim_email_otps_email on claim_email_otps(email);
create index if not exists idx_claim_email_otps_claim_id on claim_email_otps(claim_id);

-- Enable RLS
alter table claim_email_otps enable row level security;

-- ============================================================================
-- 4. AUDIT LOGS TABLE
-- ============================================================================

create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_action on audit_logs(action);
create index if not exists idx_audit_logs_entity on audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);

-- Enable RLS
alter table audit_logs enable row level security;

create policy "Admins can view audit logs" on audit_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================================
-- DOWN MIGRATION (for reference and reversal tests):
-- ============================================================================
-- drop table if exists audit_logs;
-- drop table if exists claim_email_otps;
-- drop table if exists listing_claims;
-- alter table listings drop constraint if exists check_ownership_state_owner_id;
-- alter table listings drop constraint if exists check_listings_ownership_state;
-- alter table listings drop column if exists contact_name;
-- alter table listings drop column if exists contact_phone;
-- alter table listings drop column if exists private_notes;
-- alter table listings drop column if exists private_owner_email;
-- alter table listings drop column if exists private_owner_name;
-- alter table listings drop column if exists ownership_state;
-- alter table listings drop column if exists created_by_admin_id;
-- alter table listings drop column if exists owner_id;
-- alter table listings alter column host_id set not null;
