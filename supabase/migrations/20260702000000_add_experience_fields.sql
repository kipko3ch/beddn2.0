-- Add experience-specific columns to listings table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS experience_duration text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS experience_meeting_point text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS experience_group_size integer;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS experience_requirements text;
