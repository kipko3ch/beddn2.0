-- Beddn clean pasteable schema for Supabase SQL Editor.
-- Safe for a fresh Supabase project and tolerant of a partially-created Beddn schema.
-- Run this whole file once, then run: npm run seed:test

begin;

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

do $$ begin
  create type public.booking_mode as enum ('manual_accept', 'auto_accept');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.verification_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'active', 'paused');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.balance_status as enum ('held', 'withdrawable', 'withdrawn', 'reversed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.withdrawal_status as enum ('requested', 'approved', 'paid', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  is_admin boolean not null default false,
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.hosts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  slug text unique not null,
  name text not null,
  title text,
  description text,
  country text not null,
  city text not null,
  area text not null,
  property_type text,
  experience_types text[] default '{}',
  private_address text not null,
  check_in_instructions text,
  latitude double precision not null,
  longitude double precision not null,
  approximate_location_public boolean not null default true,
  categories text[] not null default '{}',
  category text[] not null default '{}',
  hourly_price numeric(10,2),
  overnight_price numeric(10,2),
  experience_price numeric(10,2),
  deposit_amount numeric(10,2) not null default 0,
  currency text not null default 'KES',
  total_units integer not null default 1 check (total_units > 0),
  available_units integer not null default 1 check (available_units >= 0),
  booking_mode public.booking_mode not null default 'manual_accept',
  verification_status public.verification_status not null default 'pending',
  listing_status text not null default 'draft'
    check (listing_status in ('draft', 'pending_review', 'active', 'paused', 'rejected', 'archived')),
  rejection_reason text,
  platform_fee_type text not null default 'fixed' check (platform_fee_type in ('fixed', 'percentage')),
  platform_fee_value numeric(10,2) not null default 0,
  check_in_time time,
  check_out_time time,
  minimum_hours integer not null default 1 check (minimum_hours > 0),
  available_days integer[] not null default '{0,1,2,3,4,5,6}',
  amenities text[] not null default '{}',
  house_rules text,
  is_active boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add final MVP columns if an older partial schema already created listings.
alter table public.listings add column if not exists title text;
alter table public.listings add column if not exists check_in_instructions text;
alter table public.listings add column if not exists approximate_location_public boolean not null default true;
alter table public.listings add column if not exists category text[] not null default '{}';
alter table public.listings add column if not exists currency text not null default 'KES';
alter table public.listings add column if not exists total_units integer not null default 1 check (total_units > 0);
alter table public.listings add column if not exists available_units integer not null default 1 check (available_units >= 0);
alter table public.listings add column if not exists booking_mode public.booking_mode not null default 'manual_accept';
alter table public.listings add column if not exists verification_status public.verification_status not null default 'pending';
alter table public.listings add column if not exists listing_status text not null default 'draft';
alter table public.listings add column if not exists rejection_reason text;
-- Drop policies that reference listing_status before changing its type
-- (Postgres blocks the ALTER otherwise); they're recreated in the RLS section.
drop policy if exists "Active verified listings are public" on public.listings;
drop policy if exists "Active listings are public" on public.listings;
do $$ begin
  alter table public.listings alter column listing_status drop default;
  alter table public.listings alter column listing_status type text using listing_status::text;
  alter table public.listings alter column listing_status set default 'draft';
exception when others then null;
end $$;
alter table public.listings drop constraint if exists listings_listing_status_check;
alter table public.listings
  add constraint listings_listing_status_check
  check (listing_status in ('draft', 'pending_review', 'active', 'paused', 'rejected', 'archived'));
alter table public.listings add column if not exists platform_fee_type text not null default 'fixed' check (platform_fee_type in ('fixed', 'percentage'));
alter table public.listings add column if not exists platform_fee_value numeric(10,2) not null default 0;
alter table public.listings add column if not exists check_in_time time;
alter table public.listings add column if not exists check_out_time time;
alter table public.listings add column if not exists minimum_hours integer not null default 1 check (minimum_hours > 0);
alter table public.listings add column if not exists available_days integer[] not null default '{0,1,2,3,4,5,6}';

create table if not exists public.listing_images (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  position integer not null default 0
);

create table if not exists public.amenities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_amenities (
  listing_id uuid not null references public.listings(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (listing_id, amenity_id)
);

create table if not exists public.availability_rules (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  is_available boolean not null default true
);

create table if not exists public.blocked_dates (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  date date not null,
  reason text
);

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id),
  host_id uuid references public.hosts(id),
  user_id uuid references public.profiles(id),
  token text unique,
  booking_token text unique,
  guest_name text not null,
  guest_phone text not null,
  guest_email text,
  check_in date not null,
  check_out date,
  start_time time,
  duration_hours integer,
  start_datetime timestamptz,
  end_datetime timestamptz,
  guests integer not null default 1,
  guests_count integer not null default 1,
  units_reserved integer not null default 1,
  note text,
  category text not null,
  status text not null default 'pending_payment',
  total_amount numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  platform_fee_amount numeric(10,2) not null default 0,
  host_payout_amount numeric(10,2) not null default 0,
  currency text not null default 'KES',
  payment_id uuid,
  host_accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.bookings add column if not exists host_id uuid references public.hosts(id);
alter table public.bookings add column if not exists guest_email text;
alter table public.bookings add column if not exists start_datetime timestamptz;
alter table public.bookings add column if not exists end_datetime timestamptz;
alter table public.bookings add column if not exists guests_count integer not null default 1;
alter table public.bookings add column if not exists units_reserved integer not null default 1;
alter table public.bookings add column if not exists deposit_amount numeric(10,2) not null default 0;
alter table public.bookings add column if not exists platform_fee_amount numeric(10,2) not null default 0;
alter table public.bookings add column if not exists host_payout_amount numeric(10,2) not null default 0;
alter table public.bookings add column if not exists currency text not null default 'KES';
alter table public.bookings add column if not exists payment_id uuid;
alter table public.bookings add column if not exists booking_token text;
alter table public.bookings add column if not exists host_accepted_at timestamptz;
alter table public.bookings add column if not exists completed_at timestamptz;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (
  status in (
    'draft',
    'pending_payment',
    'payment_failed',
    'paid_pending_host',
    'confirmed',
    'rejected',
    'cancelled',
    'completed',
    'disputed',
    'refunded'
  )
);

alter table public.bookings alter column token drop not null;

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null default 'paystack',
  provider_reference text,
  amount numeric(10,2) not null,
  currency text not null default 'KES',
  status text not null default 'initialized',
  method text,
  reference text,
  customer_phone text,
  customer_email text,
  raw_response jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments add column if not exists provider text not null default 'paystack';
alter table public.payments add column if not exists provider_reference text;
alter table public.payments add column if not exists currency text not null default 'KES';
alter table public.payments add column if not exists customer_phone text;
alter table public.payments add column if not exists customer_email text;
alter table public.payments add column if not exists raw_response jsonb;
alter table public.payments add column if not exists verified_at timestamptz;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (
  status in ('initialized', 'success', 'failed', 'abandoned', 'refunded')
);

create table if not exists public.availability_slots (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  total_units integer not null default 1 check (total_units > 0),
  booked_units integer not null default 0 check (booked_units >= 0),
  available_units integer not null default 1 check (available_units >= 0),
  status text not null default 'available' check (status in ('available', 'full', 'blocked')),
  created_at timestamptz not null default now(),
  unique (listing_id, start_datetime, end_datetime)
);

create table if not exists public.host_balances (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'KES',
  status public.balance_status not null default 'held',
  available_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create table if not exists public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'KES',
  payout_method text not null,
  payout_details text not null,
  status public.withdrawal_status not null default 'requested',
  admin_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  booking_id uuid not null references public.bookings(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  cleanliness integer check (cleanliness between 1 and 5),
  accuracy integer check (accuracy between 1 and 5),
  safety integer check (safety between 1 and 5),
  communication integer check (communication between 1 and 5),
  comment text,
  would_book_again boolean,
  issue_reported boolean not null default false,
  issue_type text,
  is_public_review boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create table if not exists public.sms_logs (
  id uuid primary key default uuid_generate_v4(),
  recipient_phone text not null,
  message text not null,
  provider text not null,
  status text not null default 'queued',
  booking_id uuid references public.bookings(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_logs (
  id uuid primary key default uuid_generate_v4(),
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  event_type text not null,
  recipient text not null,
  message text not null,
  provider text,
  status text not null default 'queued',
  booking_id uuid references public.bookings(id) on delete set null,
  error_message text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.search_demand (
  id uuid primary key default uuid_generate_v4(),
  query text,
  latitude double precision,
  longitude double precision,
  category text,
  results_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

-- Normalize old/partial rows.
update public.listings
set
  title = coalesce(title, name),
  category = case when category = '{}' then categories else category end,
  verification_status = case when is_verified then 'verified'::public.verification_status else verification_status end,
  listing_status = case
    when listing_status = 'active' or is_active = true then 'active'
    when verification_status = 'rejected' then 'rejected'
    when listing_status = 'draft' then 'draft'
    else 'pending_review'
  end,
  available_units = greatest(available_units, 1)
where true;

update public.bookings b
set
  host_id = coalesce(b.host_id, l.host_id),
  booking_token = coalesce(b.booking_token, b.token),
  guests_count = coalesce(b.guests_count, b.guests),
  start_datetime = coalesce(
    b.start_datetime,
    (b.check_in::text || ' ' || coalesce(b.start_time::text, '14:00'))::timestamptz
  ),
  end_datetime = coalesce(
    b.end_datetime,
    case
      when b.check_out is not null then (b.check_out::text || ' 10:00')::timestamptz
      when b.duration_hours is not null then ((b.check_in::text || ' ' || coalesce(b.start_time::text, '14:00'))::timestamptz + make_interval(hours => b.duration_hours))
      else ((b.check_in::text || ' ' || coalesce(b.start_time::text, '14:00'))::timestamptz + interval '2 hours')
    end
  ),
  currency = coalesce(nullif(b.currency, ''), l.currency, 'KES'),
  deposit_amount = case when b.deposit_amount = 0 then coalesce(l.deposit_amount, b.total_amount, 0) else b.deposit_amount end,
  status = case
    when b.status = 'pending' then 'pending_payment'
    when b.status = 'paid' then 'confirmed'
    else b.status
  end
from public.listings l
where b.listing_id = l.id;

update public.payments
set
  provider_reference = coalesce(provider_reference, reference),
  status = case
    when status = 'pending' then 'initialized'
    when status = 'paid' then 'success'
    else status
  end
where true;

create index if not exists idx_listings_location on public.listings (latitude, longitude);
create index if not exists idx_listings_categories on public.listings using gin (categories);
create index if not exists idx_listings_slug on public.listings (slug);
create index if not exists idx_bookings_listing on public.bookings (listing_id);
create index if not exists idx_bookings_host_status on public.bookings (host_id, status);
create index if not exists idx_bookings_time_range on public.bookings (listing_id, start_datetime, end_datetime);
create index if not exists idx_availability_slots_listing_time on public.availability_slots (listing_id, start_datetime, end_datetime);
create index if not exists idx_host_balances_host_status on public.host_balances (host_id, status);
create index if not exists idx_payments_booking on public.payments (booking_id);

create unique index if not exists idx_bookings_booking_token on public.bookings (booking_token);
create unique index if not exists idx_payments_provider_reference on public.payments (provider, provider_reference);

alter table public.profiles enable row level security;
alter table public.hosts enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.amenities enable row level security;
alter table public.listing_amenities enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.availability_slots enable row level security;
alter table public.host_balances enable row level security;
alter table public.withdrawals enable row level security;
alter table public.reviews enable row level security;
alter table public.feedback enable row level security;
alter table public.sms_logs enable row level security;
alter table public.notification_logs enable row level security;
alter table public.search_demand enable row level security;
alter table public.saved_trips enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Hosts viewable by everyone" on public.hosts;
create policy "Hosts viewable by everyone" on public.hosts
  for select using (true);

drop policy if exists "Users can manage own host profile" on public.hosts;
drop policy if exists "Users can create host applications" on public.hosts;
create policy "Users can create host applications" on public.hosts
  for insert with check (auth.uid() = user_id and is_verified = false);

drop policy if exists "Users can update pending own host profile" on public.hosts;
create policy "Users can update pending own host profile" on public.hosts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_verified = false);

drop policy if exists "Admins can manage hosts" on public.hosts;
create policy "Admins can manage hosts" on public.hosts
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Active verified listings are public" on public.listings;
drop policy if exists "Active listings are public" on public.listings;
create policy "Active listings are public" on public.listings
  for select using (listing_status = 'active');

drop policy if exists "Hosts can view own listings" on public.listings;
create policy "Hosts can view own listings" on public.listings
  for select using (
    host_id in (select id from public.hosts where user_id = auth.uid())
  );

drop policy if exists "Hosts can manage own listings" on public.listings;
create policy "Hosts can manage own listings" on public.listings
  for all using (
    host_id in (
      select id from public.hosts where user_id = auth.uid()
    )
  ) with check (
    host_id in (
      select id from public.hosts where user_id = auth.uid()
    )
  );

drop policy if exists "Admins can manage all listings" on public.listings;
create policy "Admins can manage all listings" on public.listings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Listing images are public" on public.listing_images;
create policy "Listing images are public" on public.listing_images
  for select using (true);

drop policy if exists "Hosts can manage own listing images" on public.listing_images;
create policy "Hosts can manage own listing images" on public.listing_images
  for all using (
    listing_id in (
      select l.id from public.listings l
      join public.hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  ) with check (
    listing_id in (
      select l.id from public.listings l
      join public.hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

drop policy if exists "Amenities are public" on public.amenities;
create policy "Amenities are public" on public.amenities
  for select using (true);

drop policy if exists "Listing amenities are public" on public.listing_amenities;
create policy "Listing amenities are public" on public.listing_amenities
  for select using (true);

drop policy if exists "Availability rules are public" on public.availability_rules;
create policy "Availability rules are public" on public.availability_rules
  for select using (true);

drop policy if exists "Hosts can manage own availability" on public.availability_rules;
create policy "Hosts can manage own availability" on public.availability_rules
  for all using (
    listing_id in (
      select l.id from public.listings l
      join public.hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  ) with check (
    listing_id in (
      select l.id from public.listings l
      join public.hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

drop policy if exists "Blocked dates are public" on public.blocked_dates;
create policy "Blocked dates are public" on public.blocked_dates
  for select using (true);

drop policy if exists "Hosts can manage own blocked dates" on public.blocked_dates;
create policy "Hosts can manage own blocked dates" on public.blocked_dates
  for all using (
    listing_id in (
      select l.id from public.listings l
      join public.hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  ) with check (
    listing_id in (
      select l.id from public.listings l
      join public.hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

drop policy if exists "Users can view own bookings" on public.bookings;
create policy "Users can view own bookings" on public.bookings
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Hosts can view bookings for their listings" on public.bookings;
create policy "Hosts can view bookings for their listings" on public.bookings
  for select using (
    host_id in (select id from public.hosts where user_id = auth.uid())
    or listing_id in (
      select l.id from public.listings l
      join public.hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

drop policy if exists "Anyone can create bookings" on public.bookings;
create policy "Anyone can create bookings" on public.bookings
  for insert with check (true);

drop policy if exists "Admins can manage all bookings" on public.bookings;
create policy "Admins can manage all bookings" on public.bookings
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can manage payments" on public.payments;
create policy "Admins can manage payments" on public.payments
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments" on public.payments
  for select using (
    booking_id in (select id from public.bookings where user_id = auth.uid())
  );

drop policy if exists "Public availability slots are viewable" on public.availability_slots;
create policy "Public availability slots are viewable" on public.availability_slots
  for select using (true);

drop policy if exists "Hosts can view own balances" on public.host_balances;
create policy "Hosts can view own balances" on public.host_balances
  for select using (
    host_id in (select id from public.hosts where user_id = auth.uid())
  );

drop policy if exists "Hosts can view own withdrawals" on public.withdrawals;
create policy "Hosts can view own withdrawals" on public.withdrawals
  for select using (
    host_id in (select id from public.hosts where user_id = auth.uid())
  );

drop policy if exists "Hosts can request own withdrawals" on public.withdrawals;
create policy "Hosts can request own withdrawals" on public.withdrawals
  for insert with check (
    host_id in (select id from public.hosts where user_id = auth.uid())
  );

drop policy if exists "Reviews are public" on public.reviews;
create policy "Reviews are public" on public.reviews
  for select using (true);

drop policy if exists "Users can create reviews for completed bookings" on public.reviews;
create policy "Users can create reviews for completed bookings" on public.reviews
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.bookings
      where id = booking_id
        and user_id = auth.uid()
        and status = 'completed'
    )
  );

drop policy if exists "Completed booking feedback is public when marked public" on public.feedback;
create policy "Completed booking feedback is public when marked public" on public.feedback
  for select using (is_public_review = true);

drop policy if exists "Admins can view all feedback" on public.feedback;
create policy "Admins can view all feedback" on public.feedback
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can view SMS logs" on public.sms_logs;
create policy "Admins can view SMS logs" on public.sms_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Admins can view notification logs" on public.notification_logs;
create policy "Admins can view notification logs" on public.notification_logs
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Anyone can insert search demand" on public.search_demand;
create policy "Anyone can insert search demand" on public.search_demand
  for insert with check (true);

drop policy if exists "Admins can view search demand" on public.search_demand;
create policy "Admins can view search demand" on public.search_demand
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

drop policy if exists "Users can manage own saved trips" on public.saved_trips;
create policy "Users can manage own saved trips" on public.saved_trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.generate_booking_token()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'BEDDN-';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.set_booking_token()
returns trigger
language plpgsql
as $$
begin
  if new.booking_token is null or new.booking_token = '' then
    new.booking_token := public.generate_booking_token();
  end if;

  if new.token is null or new.token = '' then
    new.token := new.booking_token;
  end if;

  return new;
end;
$$;

drop trigger if exists before_booking_insert on public.bookings;
create trigger before_booking_insert
  before insert on public.bookings
  for each row execute function public.set_booking_token();

create or replace function public.reserve_booking_slot(p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings%rowtype;
  l public.listings%rowtype;
  updated_count integer;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    return false;
  end if;

  select * into l from public.listings where id = b.listing_id;
  if not found then
    return false;
  end if;

  if b.start_datetime is null or b.end_datetime is null or b.end_datetime <= b.start_datetime then
    return false;
  end if;

  insert into public.availability_slots (
    listing_id,
    start_datetime,
    end_datetime,
    total_units,
    booked_units,
    available_units,
    status
  )
  values (
    b.listing_id,
    b.start_datetime,
    b.end_datetime,
    greatest(l.total_units, 1),
    0,
    greatest(l.total_units, 1),
    'available'
  )
  on conflict (listing_id, start_datetime, end_datetime) do nothing;

  update public.availability_slots
  set
    booked_units = booked_units + greatest(b.units_reserved, 1),
    available_units = available_units - greatest(b.units_reserved, 1),
    status = case
      when available_units - greatest(b.units_reserved, 1) <= 0 then 'full'
      else 'available'
    end
  where listing_id = b.listing_id
    and start_datetime = b.start_datetime
    and end_datetime = b.end_datetime
    and status <> 'blocked'
    and available_units >= greatest(b.units_reserved, 1);

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

create or replace function public.get_booking_by_token(booking_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  select json_build_object(
    'id', b.id,
    'token', coalesce(b.booking_token, b.token),
    'booking_token', coalesce(b.booking_token, b.token),
    'guest_name', b.guest_name,
    'guest_phone', b.guest_phone,
    'guest_email', b.guest_email,
    'check_in', coalesce(b.check_in::text, b.start_datetime::date::text),
    'check_out', coalesce(b.check_out::text, b.end_datetime::date::text),
    'start_time', coalesce(b.start_time::text, b.start_datetime::time::text),
    'duration_hours', b.duration_hours,
    'guests', coalesce(b.guests_count, b.guests),
    'guests_count', coalesce(b.guests_count, b.guests),
    'note', b.note,
    'category', b.category,
    'status', b.status,
    'total_amount', b.total_amount,
    'deposit_amount', b.deposit_amount,
    'currency', b.currency,
    'created_at', b.created_at,
    'listing', json_build_object(
      'id', l.id,
      'name', coalesce(l.title, l.name),
      'title', coalesce(l.title, l.name),
      'slug', l.slug,
      'city', l.city,
      'area', l.area,
      'country', l.country,
      'latitude', l.latitude,
      'longitude', l.longitude,
      'private_address', case when b.status in ('confirmed', 'completed') then l.private_address else null end,
      'check_in_instructions', case when b.status in ('confirmed', 'completed') then l.check_in_instructions else null end,
      'listing_images', (
        select coalesce(
          json_agg(json_build_object('url', li.url, 'position', li.position) order by li.position),
          '[]'::json
        )
        from public.listing_images li
        where li.listing_id = l.id
      )
    ),
    'host_phone', case when b.status in ('confirmed', 'completed') then h.phone else null end,
    'host_name', h.name
  )
  into result
  from public.bookings b
  join public.listings l on b.listing_id = l.id
  join public.hosts h on coalesce(b.host_id, l.host_id) = h.id
  where coalesce(b.booking_token, b.token) = booking_token;

  return result;
end;
$$;

-- Listing visibility is derived from the lifecycle status.
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

update public.listings set is_active = (listing_status = 'active') where true;

-- Featured listings (manual or paid placements).
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

commit;
