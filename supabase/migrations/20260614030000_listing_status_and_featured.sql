-- Listing lifecycle overhaul + featured listings system.
--
-- Make listing_status the single source of truth for a listing's lifecycle
-- (draft, pending_review, active, paused, rejected, archived) and derive public
-- visibility (is_active) from it via a trigger so the existing public queries
-- that filter is_active = true stay correct. Adds a rejection_reason and a full
-- featured_listings table for manual/paid placements.

-- 0. Postgres won't alter a column's type while a policy references it, so drop
--    the visibility policies first; they're recreated against listing_status
--    further down.
drop policy if exists "Active verified listings are public" on public.listings;
drop policy if exists "Active listings are public" on public.listings;

-- 1. listing_status: enum -> text + CHECK so all six states can be backfilled
--    in this same script (extending a Postgres enum can't be used in the same
--    transaction it's added in). Comparisons like listing_status = 'active'
--    keep working unchanged.
alter table public.listings alter column listing_status drop default;
alter table public.listings alter column listing_status type text using listing_status::text;
alter table public.listings alter column listing_status set default 'draft';

alter table public.listings drop constraint if exists listings_listing_status_check;
alter table public.listings
  add constraint listings_listing_status_check
  check (listing_status in ('draft', 'pending_review', 'active', 'paused', 'rejected', 'archived'));

-- 2. Rejection reason shown to the host/admin and editable later.
alter table public.listings add column if not exists rejection_reason text;

-- 3. Backfill from the old overlapping fields.
update public.listings
set listing_status = case
  when listing_status = 'active' or is_active = true then 'active'
  when verification_status = 'rejected' then 'rejected'
  when listing_status = 'draft' then 'draft'
  else 'pending_review'
end
where true;

-- 4. is_active becomes a derived mirror of listing_status. Keeping it in sync via
--    a trigger means every existing "is_active = true" public query is correct
--    with no churn, and visibility can never drift from the lifecycle state.
create or replace function public.sync_listing_is_active()
returns trigger
language plpgsql
as $$
begin
  new.is_active := (new.listing_status = 'active');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_listing_is_active on public.listings;
create trigger sync_listing_is_active
  before insert or update on public.listings
  for each row execute function public.sync_listing_is_active();

-- Re-assert the derived flag for existing rows.
update public.listings set is_active = (listing_status = 'active') where true;

-- 5. Recreate public visibility — strictly "active" now (dropped in step 0).
create policy "Active listings are public" on public.listings
  for select using (listing_status = 'active');

-- 6. Featured listings (manual or paid placements).
create table if not exists public.featured_listings (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  placement_type text not null
    check (placement_type in ('homepage_featured', 'city_featured', 'category_featured', 'search_boost')),
  city text,
  category text,
  start_date timestamptz not null,
  end_date timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('active', 'scheduled', 'expired', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'complimentary', 'refunded')),
  amount numeric(10,2) not null default 0,
  currency text not null default 'KES',
  priority integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_featured_placement_window
  on public.featured_listings (placement_type, status, start_date, end_date);
create index if not exists idx_featured_listing on public.featured_listings (listing_id);

-- 7. Keep updated_at fresh on every change.
create or replace function public.touch_featured_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_featured_updated_at on public.featured_listings;
create trigger touch_featured_updated_at
  before update on public.featured_listings
  for each row execute function public.touch_featured_updated_at();

alter table public.featured_listings enable row level security;

drop policy if exists "Featured placements are publicly readable" on public.featured_listings;
create policy "Featured placements are publicly readable" on public.featured_listings
  for select using (status in ('active', 'scheduled'));

drop policy if exists "Admins can manage featured placements" on public.featured_listings;
create policy "Admins can manage featured placements" on public.featured_listings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
