-- Beddn pivot: lead/inquiry model (no payments).
-- Guests send structured inquiries; hosts get organized leads; Beddn tracks
-- demand. Payments/negotiation happen directly on WhatsApp.

-- 1. Inquiries (leads) ------------------------------------------------------
create table if not exists public.inquiries (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  host_id uuid references public.hosts(id) on delete set null,
  guest_user_id uuid references public.profiles(id) on delete set null,
  guest_name text not null,
  guest_whatsapp text not null,
  category text,
  check_in date,
  check_out date,
  hourly_slot text,
  guests_count integer not null default 1,
  message text,
  availability_status text not null default 'NEEDS_CONFIRMATION'
    check (availability_status in ('AVAILABLE', 'UNAVAILABLE', 'NEEDS_CONFIRMATION')),
  source text not null default 'BEDDN',
  status text not null default 'NEW'
    check (status in ('NEW', 'CONTACTED', 'BOOKED', 'NOT_BOOKED', 'SPAM')),
  session_id text,
  ip_hash text,
  user_agent text,
  utm_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_listing_idx on public.inquiries (listing_id);
create index if not exists inquiries_host_idx on public.inquiries (host_id);
create index if not exists inquiries_guest_idx on public.inquiries (guest_user_id);
create index if not exists inquiries_created_idx on public.inquiries (created_at desc);

alter table public.inquiries enable row level security;

drop policy if exists "Guests manage own inquiries" on public.inquiries;
create policy "Guests manage own inquiries"
  on public.inquiries for select
  using (guest_user_id = auth.uid());

drop policy if exists "Hosts read inquiries for their listings" on public.inquiries;
create policy "Hosts read inquiries for their listings"
  on public.inquiries for select
  using (
    host_id in (select id from public.hosts where user_id = auth.uid())
  );

-- 2. Listing instructions (structured experience / stay info) ---------------
create table if not exists public.listing_instructions (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'OTHER'
    check (type in ('CHECK_IN','HOUSE_RULE','ARRIVAL','PARKING','WIFI','SECURITY',
                    'LOCAL_TIP','GROUP_LINK','WEBSITE_LINK','ACTIVITY','NOTE','OTHER')),
  url text,
  visibility text not null default 'PUBLIC'
    check (visibility in ('PUBLIC','AFTER_LOGIN','AFTER_INQUIRY','PRIVATE_TO_CONFIRMED')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listing_instructions_listing_idx
  on public.listing_instructions (listing_id, sort_order);

alter table public.listing_instructions enable row level security;

-- Public select is allowed at the row level; the API decides which fields to
-- return per visibility (locked items ship title/type only).
drop policy if exists "Public can view active instructions" on public.listing_instructions;
create policy "Public can view active instructions"
  on public.listing_instructions for select
  using (is_active = true);

-- 3. Listing events (analytics) ---------------------------------------------
create table if not exists public.listing_events (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid references public.listings(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  session_id text,
  ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists listing_events_lookup_idx
  on public.listing_events (listing_id, event_type, created_at desc);

alter table public.listing_events enable row level security;
-- No public policies: writes go through the service-role API, reads are admin.

-- 4. Manual image flagging (no OCR) -----------------------------------------
alter table public.listing_images add column if not exists flagged boolean not null default false;
alter table public.listing_images add column if not exists flag_reason text;
