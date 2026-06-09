-- Beddn MVP Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  is_admin boolean default false,
  suspended boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Hosts
create table hosts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  is_verified boolean default false,
  created_at timestamptz default now()
);

alter table hosts enable row level security;

create policy "Hosts viewable by everyone" on hosts
  for select using (true);

create policy "Users can manage own host profile" on hosts
  for all using (auth.uid() = user_id);

-- Listings
create table listings (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references hosts(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  country text not null,
  city text not null,
  area text not null,
  private_address text not null,
  latitude double precision not null,
  longitude double precision not null,
  categories text[] not null default '{}',
  hourly_price numeric(10,2),
  overnight_price numeric(10,2),
  experience_price numeric(10,2),
  deposit_amount numeric(10,2) not null default 0,
  amenities text[] default '{}',
  house_rules text,
  is_active boolean default false,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table listings enable row level security;

create policy "Active listings are public" on listings
  for select using (is_active = true);

create policy "Hosts can view own listings" on listings
  for select using (
    host_id in (select id from hosts where user_id = auth.uid())
  );

create policy "Hosts can manage own listings" on listings
  for all using (
    host_id in (select id from hosts where user_id = auth.uid())
  );

create policy "Admins can manage all listings" on listings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create index idx_listings_location on listings (latitude, longitude);
create index idx_listings_categories on listings using gin (categories);
create index idx_listings_slug on listings (slug);

-- Listing images
create table listing_images (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,
  position integer default 0
);

alter table listing_images enable row level security;

create policy "Listing images are public" on listing_images
  for select using (true);

create policy "Hosts can manage own listing images" on listing_images
  for all using (
    listing_id in (
      select l.id from listings l
      join hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

-- Availability rules
create table availability_rules (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  day_of_week integer check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  is_available boolean default true
);

alter table availability_rules enable row level security;

create policy "Availability rules are public" on availability_rules
  for select using (true);

create policy "Hosts can manage own availability" on availability_rules
  for all using (
    listing_id in (
      select l.id from listings l
      join hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

-- Blocked dates
create table blocked_dates (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  date date not null,
  reason text
);

alter table blocked_dates enable row level security;

create policy "Blocked dates are public" on blocked_dates
  for select using (true);

create policy "Hosts can manage own blocked dates" on blocked_dates
  for all using (
    listing_id in (
      select l.id from listings l
      join hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

-- Bookings
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id),
  user_id uuid references profiles(id),
  token text unique not null,
  guest_name text not null,
  guest_phone text not null,
  check_in date not null,
  check_out date,
  start_time time,
  duration_hours integer,
  guests integer not null default 1,
  note text,
  category text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'completed', 'cancelled')),
  total_amount numeric(10,2) not null,
  created_at timestamptz default now()
);

alter table bookings enable row level security;

create policy "Users can view own bookings" on bookings
  for select using (
    user_id = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Hosts can view bookings for their listings" on bookings
  for select using (
    listing_id in (
      select l.id from listings l
      join hosts h on l.host_id = h.id
      where h.user_id = auth.uid()
    )
  );

create policy "Anyone can create bookings" on bookings
  for insert with check (true);

create policy "Admins can manage all bookings" on bookings
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create index idx_bookings_token on bookings (token);
create index idx_bookings_listing on bookings (listing_id);

-- Payments
create table payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  method text,
  reference text,
  created_at timestamptz default now()
);

alter table payments enable row level security;

create policy "Admins can manage payments" on payments
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Users can view own payments" on payments
  for select using (
    booking_id in (select id from bookings where user_id = auth.uid())
  );

-- Reviews
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  user_id uuid not null references profiles(id),
  booking_id uuid not null references bookings(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(booking_id)
);

alter table reviews enable row level security;

create policy "Reviews are public" on reviews
  for select using (true);

create policy "Users can create reviews for completed bookings" on reviews
  for insert with check (
    auth.uid() = user_id and
    exists (
      select 1 from bookings
      where id = booking_id and user_id = auth.uid() and status = 'completed'
    )
  );

-- Search demand
create table search_demand (
  id uuid primary key default uuid_generate_v4(),
  query text,
  latitude double precision,
  longitude double precision,
  category text,
  results_count integer default 0,
  created_at timestamptz default now()
);

alter table search_demand enable row level security;

create policy "Anyone can insert search demand" on search_demand
  for insert with check (true);

create policy "Admins can view search demand" on search_demand
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Saved trips
create table saved_trips (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

alter table saved_trips enable row level security;

create policy "Users can manage own saved trips" on saved_trips
  for all using (auth.uid() = user_id);

-- Function to generate booking tokens
create or replace function generate_booking_token()
returns text as $$
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
$$ language plpgsql;

-- Auto-generate booking token
create or replace function set_booking_token()
returns trigger as $$
begin
  if new.token is null or new.token = '' then
    new.token := generate_booking_token();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger before_booking_insert
  before insert on bookings
  for each row execute function set_booking_token();

-- Function to lookup booking by token (public, no auth required)
create or replace function get_booking_by_token(booking_token text)
returns json as $$
declare
  result json;
begin
  select json_build_object(
    'id', b.id,
    'token', b.token,
    'guest_name', b.guest_name,
    'guest_phone', b.guest_phone,
    'check_in', b.check_in,
    'check_out', b.check_out,
    'start_time', b.start_time,
    'duration_hours', b.duration_hours,
    'guests', b.guests,
    'note', b.note,
    'category', b.category,
    'status', b.status,
    'total_amount', b.total_amount,
    'created_at', b.created_at,
    'listing', json_build_object(
      'id', l.id,
      'name', l.name,
      'slug', l.slug,
      'city', l.city,
      'area', l.area,
      'country', l.country,
      'latitude', l.latitude,
      'longitude', l.longitude,
      'private_address', case when b.status = 'paid' then l.private_address else null end,
      'listing_images', (
        select coalesce(json_agg(json_build_object('url', li.url, 'position', li.position) order by li.position), '[]')
        from listing_images li where li.listing_id = l.id
      )
    ),
    'host_phone', case when b.status = 'paid' then h.phone else null end,
    'host_name', h.name
  ) into result
  from bookings b
  join listings l on b.listing_id = l.id
  join hosts h on l.host_id = h.id
  where b.token = booking_token;

  return result;
end;
$$ language plpgsql security definer;
