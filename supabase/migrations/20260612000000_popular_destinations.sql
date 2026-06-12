-- Admin-curated "Popular destinations" tiles shown on the home page.
-- Admins manage rows through the service-role API; the public only ever
-- reads active rows.
create table if not exists public.popular_destinations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  search_query text not null,
  image_url text not null,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.popular_destinations enable row level security;

drop policy if exists "Public can view active destinations" on public.popular_destinations;
create policy "Public can view active destinations"
  on public.popular_destinations for select
  using (is_active = true);
