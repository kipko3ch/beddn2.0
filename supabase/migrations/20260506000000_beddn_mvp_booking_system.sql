-- Beddn MVP booking, Paystack, availability, notifications, balances, withdrawals, and feedback.
-- Supabase CLI is not installed in this workspace, so this migration file was created manually.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

do $$ begin
  create type booking_status as enum (
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
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type payment_status as enum (
    'initialized',
    'success',
    'failed',
    'abandoned',
    'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type booking_mode as enum ('manual_accept', 'auto_accept');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type verification_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type listing_status as enum ('draft', 'active', 'paused');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type balance_status as enum ('held', 'withdrawable', 'withdrawn', 'reversed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type withdrawal_status as enum ('requested', 'approved', 'paid', 'rejected');
exception when duplicate_object then null;
end $$;

alter table listings
  add column if not exists title text,
  add column if not exists category text[] not null default '{}',
  add column if not exists approximate_location_public boolean not null default true,
  add column if not exists check_in_instructions text,
  add column if not exists currency text not null default 'KES',
  add column if not exists total_units integer not null default 1 check (total_units > 0),
  add column if not exists available_units integer not null default 1 check (available_units >= 0),
  add column if not exists booking_mode booking_mode not null default 'manual_accept',
  add column if not exists verification_status verification_status not null default 'pending',
  add column if not exists listing_status listing_status not null default 'draft',
  add column if not exists platform_fee_type text not null default 'fixed' check (platform_fee_type in ('fixed', 'percentage')),
  add column if not exists platform_fee_value numeric(10,2) not null default 0,
  add column if not exists check_in_time time,
  add column if not exists check_out_time time,
  add column if not exists minimum_hours integer not null default 1 check (minimum_hours > 0),
  add column if not exists available_days integer[] not null default '{0,1,2,3,4,5,6}';

update listings
set
  title = coalesce(title, name),
  category = case when category = '{}' then categories else category end,
  verification_status = case when is_verified then 'verified'::verification_status else verification_status end,
  listing_status = case when is_active then 'active'::listing_status else listing_status end,
  available_units = greatest(available_units, 1)
where true;

create table if not exists amenities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists listing_amenities (
  listing_id uuid not null references listings(id) on delete cascade,
  amenity_id uuid not null references amenities(id) on delete cascade,
  primary key (listing_id, amenity_id)
);

alter table bookings
  add column if not exists host_id uuid references hosts(id),
  add column if not exists guest_email text,
  add column if not exists start_datetime timestamptz,
  add column if not exists end_datetime timestamptz,
  add column if not exists guests_count integer not null default 1,
  add column if not exists units_reserved integer not null default 1,
  add column if not exists deposit_amount numeric(10,2) not null default 0,
  add column if not exists platform_fee_amount numeric(10,2) not null default 0,
  add column if not exists host_payout_amount numeric(10,2) not null default 0,
  add column if not exists currency text not null default 'KES',
  add column if not exists payment_id uuid,
  add column if not exists booking_token text,
  add column if not exists host_accepted_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table bookings
  alter column status type text using status::text;

alter table bookings
  drop constraint if exists bookings_status_check;

alter table bookings
  add constraint bookings_status_check check (
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

update bookings
set
  host_id = coalesce(host_id, l.host_id),
  booking_token = coalesce(booking_token, token),
  guests_count = coalesce(guests_count, guests),
  start_datetime = coalesce(
    start_datetime,
    (check_in::text || ' ' || coalesce(start_time::text, '14:00'))::timestamptz
  ),
  end_datetime = coalesce(
    end_datetime,
    case
      when check_out is not null then (check_out::text || ' 10:00')::timestamptz
      when duration_hours is not null then ((check_in::text || ' ' || coalesce(start_time::text, '14:00'))::timestamptz + make_interval(hours => duration_hours))
      else ((check_in::text || ' ' || coalesce(start_time::text, '14:00'))::timestamptz + interval '2 hours')
    end
  ),
  currency = coalesce(nullif(bookings.currency, ''), l.currency, 'KES'),
  deposit_amount = case when deposit_amount = 0 then coalesce(l.deposit_amount, total_amount, 0) else deposit_amount end,
  status = case
    when status = 'pending' then 'pending_payment'
    when status = 'paid' then 'confirmed'
    else status
  end
from listings l
where bookings.listing_id = l.id;

create unique index if not exists idx_bookings_booking_token on bookings (booking_token);
create index if not exists idx_bookings_host_status on bookings (host_id, status);
create index if not exists idx_bookings_time_range on bookings (listing_id, start_datetime, end_datetime);

alter table payments
  add column if not exists provider text not null default 'paystack',
  add column if not exists provider_reference text,
  add column if not exists currency text not null default 'KES',
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists raw_response jsonb,
  add column if not exists verified_at timestamptz;

alter table payments
  alter column status type text using status::text;

alter table payments
  drop constraint if exists payments_status_check;

alter table payments
  add constraint payments_status_check check (
    status in ('initialized', 'success', 'failed', 'abandoned', 'refunded')
  );

update payments
set
  provider_reference = coalesce(provider_reference, reference),
  status = case
    when status = 'pending' then 'initialized'
    when status = 'paid' then 'success'
    else status
  end
where true;

create unique index if not exists idx_payments_provider_reference on payments (provider, provider_reference);
create index if not exists idx_payments_booking on payments (booking_id);

create table if not exists availability_slots (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid not null references listings(id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  total_units integer not null default 1 check (total_units > 0),
  booked_units integer not null default 0 check (booked_units >= 0),
  available_units integer not null default 1 check (available_units >= 0),
  status text not null default 'available' check (status in ('available', 'full', 'blocked')),
  created_at timestamptz not null default now(),
  unique (listing_id, start_datetime, end_datetime)
);

create index if not exists idx_availability_slots_listing_time
  on availability_slots (listing_id, start_datetime, end_datetime);

create table if not exists host_balances (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references hosts(id) on delete cascade,
  booking_id uuid not null references bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'KES',
  status balance_status not null default 'held',
  available_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists idx_host_balances_host_status on host_balances (host_id, status);

create table if not exists withdrawals (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid not null references hosts(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'KES',
  payout_method text not null,
  payout_details text not null,
  status withdrawal_status not null default 'requested',
  admin_note text,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id) on delete cascade,
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

create table if not exists sms_logs (
  id uuid primary key default uuid_generate_v4(),
  recipient_phone text not null,
  message text not null,
  provider text not null,
  status text not null default 'queued',
  booking_id uuid references bookings(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists notification_logs (
  id uuid primary key default uuid_generate_v4(),
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  event_type text not null,
  recipient text not null,
  message text not null,
  provider text,
  status text not null default 'queued',
  booking_id uuid references bookings(id) on delete set null,
  error_message text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

alter table amenities enable row level security;
alter table listing_amenities enable row level security;
alter table availability_slots enable row level security;
alter table host_balances enable row level security;
alter table withdrawals enable row level security;
alter table feedback enable row level security;
alter table sms_logs enable row level security;
alter table notification_logs enable row level security;

drop policy if exists "Amenities are public" on amenities;
create policy "Amenities are public" on amenities for select using (true);

drop policy if exists "Listing amenities are public" on listing_amenities;
create policy "Listing amenities are public" on listing_amenities for select using (true);

drop policy if exists "Public availability slots are viewable" on availability_slots;
create policy "Public availability slots are viewable" on availability_slots
  for select using (true);

drop policy if exists "Hosts can view own balances" on host_balances;
create policy "Hosts can view own balances" on host_balances
  for select using (host_id in (select id from hosts where user_id = auth.uid()));

drop policy if exists "Hosts can view own withdrawals" on withdrawals;
create policy "Hosts can view own withdrawals" on withdrawals
  for select using (host_id in (select id from hosts where user_id = auth.uid()));

drop policy if exists "Hosts can request own withdrawals" on withdrawals;
create policy "Hosts can request own withdrawals" on withdrawals
  for insert with check (host_id in (select id from hosts where user_id = auth.uid()));

drop policy if exists "Completed booking feedback is public when marked public" on feedback;
create policy "Completed booking feedback is public when marked public" on feedback
  for select using (is_public_review = true);

drop policy if exists "Admins can view all feedback" on feedback;
create policy "Admins can view all feedback" on feedback
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "Admins can view SMS logs" on sms_logs;
create policy "Admins can view SMS logs" on sms_logs
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

drop policy if exists "Admins can view notification logs" on notification_logs;
create policy "Admins can view notification logs" on notification_logs
  for select using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

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

create or replace function set_booking_token()
returns trigger as $$
begin
  if new.booking_token is null or new.booking_token = '' then
    new.booking_token := generate_booking_token();
  end if;
  if new.token is null or new.token = '' then
    new.token := new.booking_token;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists before_booking_insert on bookings;
create trigger before_booking_insert
  before insert on bookings
  for each row execute function set_booking_token();

create or replace function reserve_booking_slot(p_booking_id uuid)
returns boolean as $$
declare
  b bookings%rowtype;
  l listings%rowtype;
  updated_count integer;
begin
  select * into b from bookings where id = p_booking_id for update;
  if not found then
    return false;
  end if;

  select * into l from listings where id = b.listing_id;
  if not found then
    return false;
  end if;

  if b.start_datetime is null or b.end_datetime is null or b.end_datetime <= b.start_datetime then
    return false;
  end if;

  insert into availability_slots (
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

  update availability_slots
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
$$ language plpgsql security definer set search_path = public;

create or replace function get_booking_by_token(booking_token text)
returns json as $$
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
        select coalesce(json_agg(json_build_object('url', li.url, 'position', li.position) order by li.position), '[]')
        from listing_images li where li.listing_id = l.id
      )
    ),
    'host_phone', case when b.status in ('confirmed', 'completed') then h.phone else null end,
    'host_name', h.name
  ) into result
  from bookings b
  join listings l on b.listing_id = l.id
  join hosts h on coalesce(b.host_id, l.host_id) = h.id
  where coalesce(b.booking_token, b.token) = booking_token;

  return result;
end;
$$ language plpgsql security definer set search_path = public;
