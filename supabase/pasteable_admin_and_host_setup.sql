-- Beddn admin + legacy test host setup
-- Run this in Supabase SQL Editor after the user has signed in at least once.
-- Replace the emails below before running.

-- 1) Make an existing signed-in user an admin.
update public.profiles
set is_admin = true
where lower(email) = lower('admin@example.com');

-- Optional check:
select id, email, is_admin
from public.profiles
where lower(email) = lower('admin@example.com');

-- 2) If you created a test host/listing before host approvals,
-- link that host to the signed-in user's profile and approve it.
-- Replace the email and host/listing title filters.
with target_profile as (
  select id
  from public.profiles
  where lower(email) = lower('host@example.com')
  limit 1
),
target_host as (
  select h.id
  from public.hosts h
  left join public.listings l on l.host_id = h.id
  where l.title ilike '%Test Nairobi Suite%'
     or l.name ilike '%Test Nairobi Suite%'
     or h.name ilike '%Test%'
  limit 1
)
update public.hosts h
set
  user_id = (select id from target_profile),
  is_verified = true
where h.id = (select id from target_host)
  and exists (select 1 from target_profile);

-- 3) Approve that host's existing listings for testing.
update public.listings l
set
  is_verified = true,
  is_active = true,
  verification_status = 'verified',
  listing_status = 'active'
where l.host_id in (
  select h.id
  from public.hosts h
  join public.profiles p on p.id = h.user_id
  where lower(p.email) = lower('host@example.com')
);

-- Optional check:
select
  p.email,
  h.id as host_id,
  h.name as host_name,
  h.is_verified as host_verified,
  l.id as listing_id,
  coalesce(l.title, l.name) as listing_name,
  l.is_active,
  l.is_verified,
  l.listing_status,
  l.verification_status
from public.hosts h
join public.profiles p on p.id = h.user_id
left join public.listings l on l.host_id = h.id
where lower(p.email) in (lower('admin@example.com'), lower('host@example.com'));
