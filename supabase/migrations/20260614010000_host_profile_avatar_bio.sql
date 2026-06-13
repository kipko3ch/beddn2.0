-- Host profile: let hosts add a profile picture and an "about" blurb so guests
-- can see who they're staying with.

alter table public.hosts
  add column if not exists avatar_url text,
  add column if not exists bio text;
