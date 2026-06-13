-- Reviews in the lead model: a guest who inquired through Beddn can leave a
-- review via a host-shared link. No booking row exists, so booking_id becomes
-- optional and we link the review to the confirming inquiry instead.

alter table public.reviews alter column booking_id drop not null;
alter table public.reviews
  add column if not exists inquiry_id uuid references public.inquiries(id) on delete set null;

-- One review per guest per listing (for the inquiry-based path). Legacy
-- booking-based rows keep their own unique (booking_id) constraint.
create unique index if not exists reviews_listing_user_unique
  on public.reviews (listing_id, user_id)
  where booking_id is null;

-- Track when we nudged the guest to review, so the reminder only fires once.
alter table public.inquiries
  add column if not exists review_reminder_sent_at timestamptz;

-- Richer review payload: quick highlight tags, a recommend flag, and a private
-- note to Beddn (never shown publicly — the listing page only reads rating +
-- comment).
alter table public.reviews add column if not exists tags text[] not null default '{}';
alter table public.reviews add column if not exists would_recommend boolean;
alter table public.reviews add column if not exists private_note text;
