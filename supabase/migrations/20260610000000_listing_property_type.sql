-- Adds a property/space type to listings (apartment, villa, hotel room, …).
-- Stored as a free-text slug; the catalog of options lives in
-- src/lib/property-types.ts. Used for richer categorisation and search filtering.

alter table listings add column if not exists property_type text;

comment on column listings.property_type is
  'Property/space type slug (see src/lib/property-types.ts), e.g. apartment, villa, hotel_room.';
