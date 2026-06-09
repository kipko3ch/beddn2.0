-- Admin user management: track suspended accounts for the /admin panel.
alter table public.profiles add column if not exists suspended boolean default false;
