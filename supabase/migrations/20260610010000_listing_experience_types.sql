-- Adds experience types to listings (safari, yoga, cooking class, …) for
-- listings bookable as an "experience". Stored as a text[] of slugs; the catalog
-- of options lives in src/lib/experience-types.ts. Powers richer categorisation
-- and activity-based search.

alter table listings add column if not exists experience_types text[] default '{}';

comment on column listings.experience_types is
  'Experience type slugs (see src/lib/experience-types.ts), e.g. safari, yoga, cooking_class.';
