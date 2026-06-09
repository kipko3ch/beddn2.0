-- Active listings can go live immediately. Verification controls badges only.

drop policy if exists "Active verified listings are public" on public.listings;
drop policy if exists "Active listings are public" on public.listings;
create policy "Active listings are public" on public.listings
  for select using (
    is_active = true
    or listing_status = 'active'
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
